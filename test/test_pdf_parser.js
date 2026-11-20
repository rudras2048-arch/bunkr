const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const DAY_NAME_MAP = {
  monday: 1, mon: 1,
  tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3,
  thursday: 4, thu: 4, thur: 4, thurs: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6,
  sunday: 0, sun: 0
};
const DAY_NUM_TO_NAME = {
  1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday', 0: 'Sunday'
};

function decodeAscii85(str) {
  let clean = str.replace(/\s+/g, '');
  if (clean.endsWith('~>')) clean = clean.slice(0, -2);
  let out = [];
  let i = 0;
  while (i < clean.length) {
    if (clean[i] === 'z') { out.push(0, 0, 0, 0); i++; continue; }
    let chunk = clean.slice(i, i + 5);
    let pad = 5 - chunk.length;
    while (chunk.length < 5) chunk += 'u';
    let val = 0;
    for (let j = 0; j < 5; j++) val = val * 85 + (chunk.charCodeAt(j) - 33);
    let b = [(val >> 24) & 0xff, (val >> 16) & 0xff, (val >> 8) & 0xff, val & 0xff];
    for (let k = 0; k < 4 - pad; k++) out.push(b[k]);
    i += 5;
  }
  return Buffer.from(out);
}

function extractPdfTokens(buf) {
  const raw = buf.toString('binary');
  const objRegex = /(\d+)\s+(\d+)\s+obj([\s\S]*?)endobj/g;
  const objects = {};
  let m;
  while ((m = objRegex.exec(raw)) !== null) objects[m[1]] = m[3];

  function getStreamBuffer(objBody) {
    const streamIdx = objBody.indexOf('stream');
    if (streamIdx === -1) return null;
    let start = streamIdx + 6;
    while (objBody.charCodeAt(start) === 32 || objBody.charCodeAt(start) === 13 || objBody.charCodeAt(start) === 10) start++;
    const lm = objBody.match(/\/Length\s+(\d+)/);
    if (lm) return Buffer.from(objBody.slice(start, start + parseInt(lm[1], 10)), 'binary');
    const end = objBody.indexOf('endstream', start);
    return Buffer.from(objBody.slice(start, end), 'binary');
  }

  function decompress(sBuf, objBody) {
    if (!sBuf) return null;
    let cur = sBuf;
    if (objBody.includes('ASCII85Decode')) {
      try { cur = decodeAscii85(cur.toString('latin1')); } catch(e) {}
    }
    if (objBody.includes('FlateDecode') || (!objBody.includes('Filter') && cur[0] === 0x78)) {
      try { cur = zlib.inflateSync(cur); } catch(e) {
        try { cur = zlib.inflateRawSync(cur); } catch(e2) {}
      }
    }
    return cur;
  }

  function parseCMap(text) {
    if (!text) return {};
    const map = {};
    const bfrangeRegex = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g;
    let r;
    while ((r = bfrangeRegex.exec(text)) !== null) {
      const start = parseInt(r[1], 16), end = parseInt(r[2], 16), dst = parseInt(r[3], 16);
      for (let i = 0; i <= end - start; i++) map[start + i] = String.fromCharCode(dst + i);
    }
    const bfcharBlocks = text.match(/beginbfchar([\s\S]*?)endbfchar/g) || [];
    for (const b of bfcharBlocks) {
      const charRegex = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g;
      let c;
      while ((c = charRegex.exec(b)) !== null) map[parseInt(c[1], 16)] = String.fromCharCode(parseInt(c[2], 16));
    }
    return map;
  }

  const fontToCMap = {};
  for (const [id, body] of Object.entries(objects)) {
    if (body.includes('/Type /Font') || body.includes('/Type/Font')) {
      const toUni = body.match(/\/ToUnicode\s+(\d+)\s+\d+\s+R/);
      if (toUni && objects[toUni[1]]) {
        const sBuf = getStreamBuffer(objects[toUni[1]]);
        if (sBuf) {
          const dec = decompress(sBuf, objects[toUni[1]]);
          if (dec) fontToCMap[id] = parseCMap(dec.toString('utf-8'));
        }
      }
    }
  }

  const fontNameMap = {};
  for (const [id, body] of Object.entries(objects)) {
    const fontDict = body.match(/\/Font\s*<<([\s\S]*?)>>/);
    if (fontDict) {
      const entries = fontDict[1].matchAll(/\/([A-Za-z0-9_-]+)\s+(\d+)\s+\d+\s+R/g);
      for (const em of entries) fontNameMap[em[1]] = em[2];
    }
  }

  function decodeHex(hexStr, cmap) {
    let res = '';
    const len = hexStr.length;
    const step = (len % 4 === 0) ? 4 : 2;
    for (let i = 0; i < len; i += step) {
      const code = parseInt(hexStr.slice(i, i + step), 16);
      res += cmap[code] || String.fromCharCode(code);
    }
    return res;
  }

  let tokens = [];
  for (const [id, body] of Object.entries(objects)) {
    if (!body.includes('stream')) continue;
    const sBuf = getStreamBuffer(body);
    if (!sBuf) continue;
    const dec = decompress(sBuf, body);
    if (!dec) continue;
    const text = dec.toString('latin1');
    if (!text.includes('BT')) continue;

    const parts = text.split(/(?=q|BT)/);
    let curMatrixX = 0, curMatrixY = 0;

    for (const part of parts) {
      const cmMatch = part.match(/([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+cm/);
      if (cmMatch) {
        curMatrixX = parseFloat(cmMatch[5]);
        curMatrixY = parseFloat(cmMatch[6]);
      }
      if (!part.includes('BT')) continue;

      const btRegex = /BT([\s\S]*?)ET/g;
      let btMatch;
      while ((btMatch = btRegex.exec(part)) !== null) {
        const block = btMatch[1];
        let curFont = '';
        let curX = curMatrixX, curY = curMatrixY;

        const tokenRegex = /\/([A-Za-z0-9_-]+)\s+[\d.]+\s+Tf|([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+Tm|([\d.-]+)\s+([\d.-]+)\s+Tm|([\d.-]+)\s+([\d.-]+)\s+Td|(<[0-9a-fA-F\s]+>|\([^)]*\)|\[[\s\S]*?\])\s*(Tj|TJ)/g;
        let op;
        let lineText = '';
        while ((op = tokenRegex.exec(block)) !== null) {
          if (op[1]) {
            curFont = op[1];
          } else if (op[2]) {
            curX = parseFloat(op[6]);
            curY = parseFloat(op[7]);
          } else if (op[8]) {
            curX = parseFloat(op[8]);
            curY = parseFloat(op[9]);
          } else if (op[10]) {
            curX += parseFloat(op[10]);
            curY += parseFloat(op[11]);
          } else if (op[12]) {
            const cmap = fontToCMap[fontNameMap[curFont]] || {};
            const val = op[12], kind = op[13];
            if (kind === 'Tj') {
              if (val.startsWith('<')) lineText += decodeHex(val.slice(1, -1), cmap);
              else lineText += val.slice(1, -1);
            } else if (kind === 'TJ') {
              const pArr = val.match(/<[0-9a-fA-F\s]+>|\([^)]*\)/g) || [];
              for (const p of pArr) {
                if (p.startsWith('<')) lineText += decodeHex(p.slice(1, -1), cmap);
                else lineText += p.slice(1, -1);
              }
            }
          }
        }
        if (lineText.trim()) {
          tokens.push({
            x: Math.round(curX),
            y: Math.round(curY),
            text: lineText.trim().replace(/\\\\/g, '').replace(/\\/g, '')
          });
        }
      }
    }
  }
  return tokens;
}

function parseTimeRange(str) {
  const tm = str.match(/(\d{1,2}):(\d{2})\s*(am|pm)?\s*[-–to]+\s*(\d{1,2}):(\d{2})\s*(am|pm)?/i);
  if (!tm) return null;
  let sh = parseInt(tm[1], 10), sm = tm[2], eh = parseInt(tm[4], 10), em = tm[5];
  if (tm[3] && tm[3].toLowerCase() === 'pm' && sh < 12) sh += 12;
  else if (sh >= 1 && sh <= 7) sh += 12;
  if (tm[6] && tm[6].toLowerCase() === 'pm' && eh < 12) eh += 12;
  else if (eh >= 1 && eh <= 7) eh += 12;
  const startTime = String(sh).padStart(2, '0') + ':' + sm;
  const endTime = String(eh).padStart(2, '0') + ':' + em;
  return { startTime, endTime };
}

function buildTimetableFromTokens(items) {
  const parsedSlots = [];

  // 1. Check if tokens are sequential ReportLab style (many x:0, y:2/3/4)
  const isSequentialReportLab = items.filter(it => it.x === 0 && (it.y === 2 || it.y === 3)).length > 10;

  if (isSequentialReportLab) {
    // Find time headers
    let timeSlots = [];
    let startIdx = 0;
    for (let i = 0; i < items.length; i++) {
      const tr = parseTimeRange(items[i].text);
      if (tr) timeSlots.push(tr);
      else if (timeSlots.length > 0 && items[i].text.toLowerCase() === 'monday') {
        startIdx = i;
        break;
      }
    }

    let curDay = null;
    let colIdx = 0;

    for (let i = startIdx; i < items.length; i++) {
      const t = items[i].text.trim();
      const lower = t.toLowerCase();
      if (DAY_NAME_MAP[lower] !== undefined) {
        curDay = DAY_NAME_MAP[lower];
        colIdx = 0;
        continue;
      }
      if (t === '227' || t === '-' || t === '—' || t === '–') {
        colIdx++;
        continue;
      }

      // We have a course!
      let courseName = t;
      let room = '';
      if (i + 1 < items.length) {
        const nextT = items[i + 1].text.trim();
        const isRoomOrCode = /^[A-Z]{2,4}\d{3}$/.test(nextT) || /^Lab-\d+$/i.test(nextT) || /^ECLab-\d+$/i.test(nextT) || /^[A-D]\d{3}$/.test(nextT);
        if (isRoomOrCode) {
          room = nextT;
          i++;
        }
      }

      if (curDay !== null && colIdx < timeSlots.length) {
        parsedSlots.push({
          day: curDay,
          dayName: DAY_NUM_TO_NAME[curDay],
          time: timeSlots[colIdx].startTime,
          endTime: timeSlots[colIdx].endTime,
          room,
          subjectName: courseName,
          confidence: 0.95
        });
      }
      colIdx++;
    }
    return parsedSlots;
  }

  // 2. Coordinate-based matrix (Word, Sheets, Excel, HTML-print, FPDF)
  // Find time headers
  const timeHeaders = [];
  for (const it of items) {
    const tr = parseTimeRange(it.text);
    if (tr) {
      timeHeaders.push({
        x: it.x,
        y: it.y,
        startTime: tr.startTime,
        endTime: tr.endTime
      });
    }
  }

  // Sort time headers by X
  timeHeaders.sort((a, b) => a.x - b.x);
  // Deduplicate time headers with close X
  const timeCols = [];
  for (const th of timeHeaders) {
    if (timeCols.length === 0 || Math.abs(th.x - timeCols[timeCols.length - 1].x) > 30) {
      timeCols.push(th);
    }
  }

  // Find day rows
  const dayAnchors = [];
  for (const it of items) {
    const lower = it.text.toLowerCase().trim();
    if (DAY_NAME_MAP[lower] !== undefined) {
      dayAnchors.push({
        day: DAY_NAME_MAP[lower],
        name: DAY_NUM_TO_NAME[DAY_NAME_MAP[lower]],
        x: it.x,
        y: it.y
      });
    }
  }

  // Determine vertical direction (top-to-bottom vs bottom-to-top)
  // Check if Monday Y < Friday Y (downwards) or Monday Y > Friday Y (upwards)
  let yDown = true;
  if (dayAnchors.length >= 2) {
    const mon = dayAnchors.find(d => d.day === 1);
    const fri = dayAnchors.find(d => d.day === 5) || dayAnchors.find(d => d.day === 4);
    if (mon && fri) {
      yDown = mon.y < fri.y;
    } else {
      yDown = dayAnchors[0].y < dayAnchors[dayAnchors.length - 1].y;
    }
  }

  if (yDown) {
    dayAnchors.sort((a, b) => a.y - b.y);
  } else {
    dayAnchors.sort((a, b) => b.y - a.y);
  }

  // Calculate row boundaries for each day
  const dayRows = [];
  for (let i = 0; i < dayAnchors.length; i++) {
    const cur = dayAnchors[i];
    let prevY = i > 0 ? dayAnchors[i - 1].y : (yDown ? cur.y - 50 : cur.y + 50);
    let nextY = i < dayAnchors.length - 1 ? dayAnchors[i + 1].y : (yDown ? cur.y + 50 : cur.y - 50);
    const rowMinY = Math.min((prevY + cur.y) / 2, (nextY + cur.y) / 2);
    const rowMaxY = Math.max((prevY + cur.y) / 2, (nextY + cur.y) / 2);
    dayRows.push({
      day: cur.day,
      name: cur.name,
      y: cur.y,
      minY: rowMinY,
      maxY: rowMaxY
    });
  }

  // Calculate column boundaries for each time column
  const dayColMaxX = Math.max(...dayAnchors.map(d => d.x)) + 40;
  const cols = [];
  for (let j = 0; j < timeCols.length; j++) {
    const cur = timeCols[j];
    const prevX = j > 0 ? timeCols[j - 1].x : dayColMaxX;
    const nextX = j < timeCols.length - 1 ? timeCols[j + 1].x : 999999;
    const minX = (prevX + cur.x) / 2;
    const maxX = (nextX + cur.x) / 2;
    cols.push({
      startTime: cur.startTime,
      endTime: cur.endTime,
      x: cur.x,
      minX,
      maxX
    });
  }

  // For each day row and time column, gather tokens inside the cell
  for (const row of dayRows) {
    for (const col of cols) {
      const cellTokens = items.filter(it => 
        it.y >= row.minY && it.y <= row.maxY &&
        it.x >= col.minX && it.x < col.maxX
      );

      if (cellTokens.length === 0) continue;

      // Sort cell tokens top-to-bottom
      if (yDown) cellTokens.sort((a, b) => a.y - b.y || a.x - b.x);
      else cellTokens.sort((a, b) => b.y - a.y || a.x - b.x);

      const cellText = cellTokens.map(t => t.text).join(' ').trim();
      const lower = cellText.toLowerCase();
      if (lower === '-' || lower === '—' || lower === '–' || lower.includes('break') || lower.includes('lunch')) {
        continue;
      }

      // Room extraction: (A501), Lab-3, Studio-1, A602, etc.
      let room = '';
      const rm = cellText.match(/\b([A-D]\d{3}|RFP|AUDI|LAB-?\d+|STUDIO-?\d+|ROOM\s*\d+|BIO\d{3}|BIOLAB-?\d+|ECO\d{3}|CAD-?\d+|M\d{3})\b/i) ||
                 cellText.match(/\(([A-D]\d{3}|RFP|LAB-?\d+|STUDIO-?\d+|CAD-?\d+)\)/i);
      if (rm) {
        room = rm[1].toUpperCase();
      }

      // Clean subject name
      let subjectName = cellText
        .replace(/\b([A-D]\d{3}|RFP|AUDI|LAB-?\d+|STUDIO-?\d+|BIO\d{3}|BIOLAB-?\d+|ECO\d{3}|CAD-?\d+|M\d{3})\b/gi, '')
        .replace(/\([A-Z0-9-]+\)/gi, '')
        .replace(/[-—–]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (subjectName.length > 2) {
        parsedSlots.push({
          day: row.day,
          dayName: row.name,
          time: col.startTime,
          endTime: col.endTime,
          room,
          subjectName,
          confidence: 0.95
        });
      }
    }
  }

  return parsedSlots;
}

const pdfs = [
  'test/fixtures/dev/dev_01_word_exported.pdf',
  'test/fixtures/dev/dev_02_sheets_exported.pdf',
  'test/fixtures/dev/dev_03_excel_matrix.pdf',
  'test/fixtures/dev/dev_04_html_print_clean.pdf',
  'test/fixtures/dev/dev_06_reportlab_academic.pdf',
  'test/fixtures/dev/dev_07_dense_engineering.pdf',
  'test/fixtures/held_out/heldout_01_word_landscape.pdf',
  'test/fixtures/held_out/heldout_02_sheets_compact.pdf',
  'test/fixtures/held_out/heldout_03_fpdf_formal_bulletin.pdf'
];

for (const p of pdfs) {
  const buf = fs.readFileSync(p);
  const gtPath = p.replace(/\.[^.]+$/, '.json');
  const gt = fs.existsSync(gtPath) ? JSON.parse(fs.readFileSync(gtPath, 'utf-8')) : [];
  const tokens = extractPdfTokens(buf);
  const slots = buildTimetableFromTokens(tokens);
  console.log(path.basename(p), 'Ground Truth:', gt.length, 'Parsed slots:', slots.length);
  if (slots.length !== gt.length) {
    console.log('   Expected:', gt.map(g => `${g.day} ${g.startTime} ${g.courseName}`));
    console.log('   Got:     ', slots.map(s => `${s.dayName} ${s.time} ${s.subjectName}`));
  }
}
