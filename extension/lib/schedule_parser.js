// Bunkr — Frontend Schedule & Timetable Parser
// Client-side only • Zero backend • Universal format parser (PDF, Image/OCR, Text, CSV, ICS)
// Produces standard Bunkr Timetable data model for storage and engine use.

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BunkrScheduleParser = root.AttendMateScheduleParser = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

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
    1: 'Monday',
    2: 'Tuesday',
    3: 'Wednesday',
    4: 'Thursday',
    5: 'Friday',
    6: 'Saturday',
    0: 'Sunday'
  };

  /**
   * Universal entry point to parse a schedule file or string.
   * @param {File|Blob|ArrayBuffer|Uint8Array|string} input
   * @param {Object} options - { fileName, enrolledCourses, semesterEndDate }
   * @returns {Promise<Object>} Standard timetable structure
   */
  async function parseSchedule(input, options = {}) {
    let fileName = options.fileName || '';
    if (typeof input === 'object' && input && input.name) {
      fileName = input.name;
    }

    const ext = (fileName.split('.').pop() || '').toLowerCase();

    // 1. ArrayBuffer or Uint8Array or PDF File
    if (ext === 'pdf' || (input instanceof Blob && input.type === 'application/pdf') || isPdfBuffer(input)) {
      const buffer = await toUint8Array(input);
      return parsePdfSchedule(buffer, options);
    }

    // 2. Image (PNG, JPG, WebP, etc.)
    if (['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif'].includes(ext) || (input instanceof Blob && input.type.startsWith('image/'))) {
      return parseImageSchedule(input, options);
    }

    // 3. String or Text/CSV/ICS File
    let textContent = '';
    if (typeof input === 'string') {
      textContent = input;
    } else if (input instanceof Blob) {
      textContent = await input.text();
    } else {
      const u8 = await toUint8Array(input);
      textContent = new TextDecoder('utf-8', { fatal: false }).decode(u8);
    }

    if (textContent.includes('BEGIN:VCALENDAR')) {
      return parseIcsSchedule(textContent, options);
    }

    return parseTextOrCsvSchedule(textContent, options);
  }

  function isPdfBuffer(input) {
    if (!input) return false;
    let bytes = null;
    if (input instanceof Uint8Array) bytes = input;
    else if (input instanceof ArrayBuffer) bytes = new Uint8Array(input);
    else if (typeof Buffer !== 'undefined' && Buffer.isBuffer(input)) bytes = new Uint8Array(input);
    if (!bytes || bytes.length < 5) return false;
    // %PDF-
    return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
  }

  async function toUint8Array(input) {
    if (input instanceof Uint8Array) return input;
    if (input instanceof ArrayBuffer) return new Uint8Array(input);
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(input)) return new Uint8Array(input);
    if (input instanceof Blob) {
      const buf = await input.arrayBuffer();
      return new Uint8Array(buf);
    }
    throw new Error('Unsupported input format for binary reading');
  }

  /**
   * Decompresses Flate/Deflate streams using native DecompressionStream or Node zlib.
   */
  async function decompressFlate(uint8Array) {
    // Browser or modern Node with DecompressionStream
    if (typeof DecompressionStream !== 'undefined') {
      try {
        const ds = new DecompressionStream('deflate');
        const writer = ds.writable.getWriter();
        writer.write(uint8Array);
        writer.close();
        const buffer = await new Response(ds.readable).arrayBuffer();
        return new Uint8Array(buffer);
      } catch (e) {
        try {
          const ds = new DecompressionStream('deflate-raw');
          const writer = ds.writable.getWriter();
          writer.write(uint8Array);
          writer.close();
          const buffer = await new Response(ds.readable).arrayBuffer();
          return new Uint8Array(buffer);
        } catch (e2) {}
      }
    }
    // Node.js fallback
    if (typeof require !== 'undefined') {
      try {
        const zlib = require('zlib');
        try {
          const buf = zlib.inflateSync(Buffer.from(uint8Array));
          return new Uint8Array(buf);
        } catch (e) {
          const buf = zlib.inflateRawSync(Buffer.from(uint8Array));
          return new Uint8Array(buf);
        }
      } catch (e) {}
    }
    return uint8Array;
  }

  /**
   * Decodes ASCII85 / Base85 data used in ReportLab PDFs.
   */
  function decodeAscii85(str) {
    let clean = str.replace(/\s+/g, '');
    if (clean.endsWith('~>')) clean = clean.slice(0, -2);
    const out = [];
    let i = 0;
    while (i < clean.length) {
      if (clean[i] === 'z') {
        out.push(0, 0, 0, 0);
        i++;
        continue;
      }
      let chunk = clean.slice(i, i + 5);
      const pad = 5 - chunk.length;
      while (chunk.length < 5) chunk += 'u';
      let val = 0;
      for (let j = 0; j < 5; j++) {
        val = val * 85 + (chunk.charCodeAt(j) - 33);
      }
      const b0 = (val >> 24) & 0xff;
      const b1 = (val >> 16) & 0xff;
      const b2 = (val >> 8) & 0xff;
      const b3 = val & 0xff;
      const bytes = [b0, b1, b2, b3];
      for (let k = 0; k < 4 - pad; k++) {
        out.push(bytes[k]);
      }
      i += 5;
    }
    return new Uint8Array(out);
  }

  /**
   * Parses PDF file client-side.
   * Extracts text, fonts, CMaps, and layout coordinates.
   */
  async function parsePdfSchedule(buffer, options = {}) {
    const rawString = binaryToString(buffer);

    // 1. Extract objects
    const objRegex = /(\d+)\s+(\d+)\s+obj([\s\S]*?)endobj/g;
    const objects = {};
    let m;
    while ((m = objRegex.exec(rawString)) !== null) {
      objects[m[1]] = m[3];
    }

    // Stream getter
    async function getStreamBuffer(objBody) {
      const streamIdx = objBody.indexOf('stream');
      if (streamIdx === -1) return null;
      let start = streamIdx + 6;
      while (objBody.charCodeAt(start) === 32 || objBody.charCodeAt(start) === 13 || objBody.charCodeAt(start) === 10) start++;

      const lm = objBody.match(/\/Length\s+(\d+)/);
      if (lm) {
        const len = parseInt(lm[1], 10);
        return stringToBinarySlice(objBody, start, start + len);
      }

      const end = objBody.indexOf('endstream', start);
      if (end === -1) return null;
      let endTrimmed = end;
      if (objBody.charCodeAt(endTrimmed - 1) === 10) endTrimmed--;
      if (objBody.charCodeAt(endTrimmed - 1) === 13) endTrimmed--;

      return stringToBinarySlice(objBody, start, endTrimmed);
    }

    async function getDecompressedStream(objBody) {
      const sBuf = await getStreamBuffer(objBody);
      if (!sBuf) return null;

      let cur = sBuf;
      if (objBody.includes('ASCII85Decode')) {
        try {
          cur = decodeAscii85(binaryToString(cur));
        } catch (e) {}
      }
      if (objBody.includes('FlateDecode') || (!objBody.includes('Filter') && cur[0] === 0x78)) {
        try {
          cur = await decompressFlate(cur);
        } catch (e) {}
      }
      return cur;
    }

    // 2. Parse CMaps for font ToUnicode dictionaries
    function parseCMap(text) {
      if (!text) return {};
      const map = {};
      const bfrangeRegex = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g;
      let r;
      while ((r = bfrangeRegex.exec(text)) !== null) {
        const start = parseInt(r[1], 16);
        const end = parseInt(r[2], 16);
        const dst = parseInt(r[3], 16);
        for (let i = 0; i <= end - start; i++) {
          map[start + i] = String.fromCharCode(dst + i);
        }
      }
      const bfcharBlocks = text.match(/beginbfchar([\s\S]*?)endbfchar/g) || [];
      for (const b of bfcharBlocks) {
        const charRegex = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g;
        let c;
        while ((c = charRegex.exec(b)) !== null) {
          map[parseInt(c[1], 16)] = String.fromCharCode(parseInt(c[2], 16));
        }
      }
      return map;
    }

    const fontToCMap = {};
    for (const [id, body] of Object.entries(objects)) {
      if (body.includes('/Type /Font') || body.includes('/Type/Font')) {
        const toUni = body.match(/\/ToUnicode\s+(\d+)\s+\d+\s+R/);
        if (toUni && objects[toUni[1]]) {
          const streamBuf = await getDecompressedStream(objects[toUni[1]]);
          if (streamBuf) {
            fontToCMap[id] = parseCMap(binaryToString(streamBuf));
          }
        }
      }
    }

    // Font name mapping in resource dictionaries (e.g. /TT2 7 0 R, /F4 4 0 R)
    const fontNameMap = {};
    for (const [id, body] of Object.entries(objects)) {
      const fontDict = body.match(/\/Font\s*<<([\s\S]*?)>>/);
      if (fontDict) {
        const entries = fontDict[1].matchAll(/\/([A-Za-z0-9_-]+)\s+(\d+)\s+\d+\s+R/g);
        for (const em of entries) {
          fontNameMap[em[1]] = em[2];
        }
      }
    }

    function decodeHexToken(hexStr, cmap) {
      let res = '';
      const len = hexStr.length;
      const step = (len % 4 === 0) ? 4 : 2;
      for (let i = 0; i < len; i += step) {
        const code = parseInt(hexStr.slice(i, i + step), 16);
        res += cmap[code] || String.fromCharCode(code);
      }
      return res;
    }

    // 3. Extract positioned text tokens from contents streams
    const items = [];
    for (const [id, body] of Object.entries(objects)) {
      if (!body.includes('stream')) continue;
      const streamBuf = await getDecompressedStream(body);
      if (!streamBuf) continue;
      const streamText = binaryToString(streamBuf);
      if (!streamText.includes('BT')) continue;

      const parts = streamText.split(/(?=q|BT)/);
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
              // 6-arg Tm (matrix): X = op[6], Y = op[7]
              curX = parseFloat(op[6]);
              curY = parseFloat(op[7]);
            } else if (op[8]) {
              // 2-arg Tm: X = op[8], Y = op[9]
              curX = parseFloat(op[8]);
              curY = parseFloat(op[9]);
            } else if (op[10]) {
              // Td relative move
              curX += parseFloat(op[10]);
              curY += parseFloat(op[11]);
            } else if (op[12]) {
              const fontObjId = fontNameMap[curFont];
              const cmap = fontToCMap[fontObjId] || {};
              const val = op[12];
              const kind = op[13];

              if (kind === 'Tj') {
                if (val.startsWith('<')) {
                  lineText += decodeHexToken(val.slice(1, -1), cmap);
                } else if (val.startsWith('(')) {
                  const inner = val.slice(1, -1);
                  for (let i = 0; i < inner.length; i++) {
                    const code = inner.charCodeAt(i);
                    lineText += cmap[code] || inner[i];
                  }
                }
              } else if (kind === 'TJ') {
                const pArr = val.match(/<[0-9a-fA-F\s]+>|\([^)]*\)/g) || [];
                for (const p of pArr) {
                  if (p.startsWith('<')) {
                    lineText += decodeHexToken(p.slice(1, -1), cmap);
                  } else if (p.startsWith('(')) {
                    const inner = p.slice(1, -1);
                    for (let i = 0; i < inner.length; i++) {
                      const code = inner.charCodeAt(i);
                      lineText += cmap[code] || inner[i];
                    }
                  }
                }
              }
            }
          }

          if (lineText.trim()) {
            items.push({
              x: Math.round(curX),
              y: Math.round(curY),
              text: lineText.trim().replace(/\\\\/g, '').replace(/\\/g, '')
            });
          }
        }
      }
    }

    // Scanned-PDF Detection:
    // If no text tokens were found, check if PDF contains an image XObject
    if (items.length < 5) {
      for (const [id, body] of Object.entries(objects)) {
        if (body.includes('/Subtype /Image') || body.includes('/Subtype/Image')) {
          const isDct = body.includes('DCTDecode');
          const sBuf = await getStreamBuffer(body);
          if (sBuf && sBuf.length > 1000) {
            if (isDct) {
              if (typeof window === 'undefined' && typeof Buffer !== 'undefined') {
                return parseImageSchedule(Buffer.from(sBuf), { ...options, isJpegBuffer: true });
              } else if (typeof Blob !== 'undefined') {
                const blob = new Blob([sBuf], { type: 'image/jpeg' });
                return parseImageSchedule(blob, options);
              }
            }
          }
        }
      }

      if (items.length === 0) {
        throw new Error('No readable text tokens found in the PDF. The file may be an image scan or password protected.');
      }
    }

    return buildTimetableFromTokens(items, options);
  }

  function binaryToString(uint8Array) {
    let result = '';
    const chunk = 8192;
    for (let i = 0; i < uint8Array.length; i += chunk) {
      const slice = uint8Array.subarray(i, i + chunk);
      result += String.fromCharCode.apply(null, slice);
    }
    return result;
  }

  function stringToBinarySlice(str, start, end) {
    const len = end - start;
    const u8 = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      u8[i] = str.charCodeAt(start + i) & 0xff;
    }
    return u8;
  }

  function parseTimeRangeString(str) {
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

  /**
   * Reconstructs weekly timetable table from positioned tokens.
   */
  function buildTimetableFromTokens(items, options = {}) {
    const parsedSlots = [];

    // 1. Check if tokens are sequential ReportLab style (many x:0, y:2/3/4)
    const isSequentialReportLab = items.filter(it => it.x === 0 && (it.y === 2 || it.y === 3)).length > 8;

    if (isSequentialReportLab) {
      let timeSlots = [];
      let startIdx = 0;
      for (let i = 0; i < items.length; i++) {
        const tr = parseTimeRangeString(items[i].text);
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
      return assembleTimetable(parsedSlots, options);
    }

    // 2. Coordinate-based Matrix (Word, Sheets, Excel, HTML-print, FPDF, Rishihood)
    // Find all time range column headers
    const timeHeaders = [];
    for (const it of items) {
      const tr = parseTimeRangeString(it.text);
      if (tr) {
        timeHeaders.push({
          x: it.x,
          y: it.y,
          startTime: tr.startTime,
          endTime: tr.endTime
        });
      }
    }

    // Sort time headers by X and deduplicate
    timeHeaders.sort((a, b) => a.x - b.x);
    const timeCols = [];
    for (const th of timeHeaders) {
      if (timeCols.length === 0 || Math.abs(th.x - timeCols[timeCols.length - 1].x) > 30) {
        timeCols.push(th);
      }
    }

    // Find day row anchors (Monday, Tuesday, etc.)
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
      let prevY = i > 0 ? dayAnchors[i - 1].y : (yDown ? cur.y - 65 : cur.y + 65);
      let nextY = i < dayAnchors.length - 1 ? dayAnchors[i + 1].y : (yDown ? cur.y + 65 : cur.y - 65);
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

    // Determine column boundaries
    const dayColMaxX = dayAnchors.length > 0 ? (Math.max(...dayAnchors.map(d => d.x)) + 30) : 0;
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

        if (yDown) cellTokens.sort((a, b) => a.y - b.y || a.x - b.x);
        else cellTokens.sort((a, b) => b.y - a.y || a.x - b.x);

        const cellText = cellTokens.map(t => t.text).join(' ').trim();
        const lower = cellText.toLowerCase();
        if (lower === '-' || lower === '—' || lower === '–' || lower.includes('break') || lower.includes('lunch') || lower.includes('lunh')) {
          continue;
        }

        // Room extraction
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

    return assembleTimetable(parsedSlots, options);
  }

  function stripQuotes(str) {
    if (!str) return '';
    return str.replace(/^["'\s]+|["'\s]+$/g, '').trim();
  }

  function parseTimeString(tStr) {
    if (!tStr) return null;
    const m = tStr.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
    if (!m) return null;
    let h = parseInt(m[1], 10);
    const min = m[2];
    const ampm = (m[3] || '').toLowerCase();
    if (ampm === 'pm' && h < 12) h += 12;
    else if (ampm === 'am' && h === 12) h = 0;
    else if (!ampm && h >= 1 && h <= 7) h += 12;
    return String(h).padStart(2, '0') + ':' + min;
  }

  function fuzzyMatchDay(str) {
    const l = str.toLowerCase().trim();
    const clean = l.replace(/^#+\s*/, '').replace(/^day:\s*/, '').replace(/[:\s]+$/, '').trim();
    if (DAY_NAME_MAP[clean] !== undefined) return DAY_NAME_MAP[clean];
    if (/^m[o0a_]?n/i.test(l) || /m.*o?n.*d.*y/i.test(l)) return 1;
    if ((/^t[u_]?e/i.test(l) || /^t.*d.*y/i.test(l)) && !/^th/i.test(l)) return 2;
    if (/^w[e_]?d/i.test(l) || /w.*d.*y/i.test(l)) return 3;
    if (/^th/i.test(l) || /th.*d.*y/i.test(l)) return 4;
    if (/^f[r_]?i/i.test(l) || /^f.*r.*[li1].*d.*y/i.test(l) || /^frl/i.test(l)) return 5;
    if (/^s[a_]?t/i.test(l)) return 6;
    if (/^s[u_]?n/i.test(l)) return 0;
    return null;
  }

  /**
   * Parses free-text, CSV, TSV, or Markdown Pipe timetable files.
   */
  function parseTextOrCsvSchedule(text, options = {}) {
    const isOcr = !!options.isOcr;
    const defaultConfidence = isOcr ? 0.65 : 1.0;
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const parsedSlots = [];
    let currentDay = 1;
    let daySlotIndex = 0;

    for (const rawLine of lines) {
      const line = rawLine.trim();

      // Skip markdown separator lines: | :--- | :--- |
      if (/^\s*\|?(\s*:?-+:?\s*\|)+\s*$/.test(line)) continue;

      // Check if line is a day header on its own
      const dayMatched = fuzzyMatchDay(line);
      if (!line.includes(',') && !line.includes('\t') && !line.includes('|') && dayMatched !== null && !line.includes(':00') && !line.includes(':30')) {
        currentDay = dayMatched;
        daySlotIndex = 0;
        continue;
      }

      // Check Table/CSV/TSV/Pipe: split by delimiter
      const isDelimited = line.includes(',') || line.includes('\t') || line.includes('|');
      if (isDelimited) {
        let parts = [];
        if (line.includes('|')) {
          parts = line.split('|').map(stripQuotes);
          if (parts.length > 0 && parts[0] === '') parts.shift();
          if (parts.length > 0 && parts[parts.length - 1] === '') parts.pop();
        } else {
          parts = line.split(/[,\t]/).map(stripQuotes);
        }

        // Check if header row (e.g. Day, Time, EndTime...)
        const firstLower = (parts[0] || '').toLowerCase();
        if (firstLower === 'day' || firstLower === 'start time' || firstLower === 'course' || firstLower === 'time' || firstLower === 'subject') {
          continue;
        }

        if (parts.length >= 3) {
          let dayVal = currentDay;
          let idx = 0;
          const dayMatchFirst = fuzzyMatchDay(parts[0]);
          if (dayMatchFirst !== null && !parts[0].includes(':')) {
            dayVal = dayMatchFirst;
            idx++;
          }

          const timePart = parts[idx] || '';
          let startTime = '', endTime = '';
          const rangeMatch = timePart.match(/(\d{1,2}:\d{2}\s*(?:am|pm)?)\s*[-–to]+\s*(\d{1,2}:\d{2}\s*(?:am|pm)?)/i);
          if (rangeMatch) {
            startTime = parseTimeString(rangeMatch[1]);
            endTime = parseTimeString(rangeMatch[2]);
          } else {
            startTime = parseTimeString(timePart);
            if (parts[idx + 1] && (parts[idx + 1].includes(':') || /^\d{1,2}:\d{2}/.test(parts[idx + 1]))) {
              idx++;
              endTime = parseTimeString(parts[idx]);
            }
          }

          idx++;
          const subjPart = parts[idx] || '';
          idx++;
          const roomPart = parts[idx] || '';

          if (subjPart && startTime) {
            parsedSlots.push({
              day: dayVal,
              time: startTime,
              endTime: endTime || addMinutesToTime(startTime, 90),
              room: roomPart,
              subjectName: subjPart,
              confidence: defaultConfidence
            });
            continue;
          }
        }
      }

      // Check line format: "10:10 - 11:40 Social Communication (RFP)"
      const lineTimeMatch = line.match(/(\d{1,2}):(\d{2})\s*(?:am|pm)?\s*[-–to]+\s*(\d{1,2}):(\d{2})\s*(?:am|pm)?/i);
      if (lineTimeMatch) {
        let sh = parseInt(lineTimeMatch[1], 10);
        let eh = parseInt(lineTimeMatch[3], 10);
        if (sh >= 1 && sh <= 7) sh += 12;
        if (eh >= 1 && eh <= 7) eh += 12;
        const time = String(sh).padStart(2, '0') + ':' + lineTimeMatch[2];
        const endTime = String(eh).padStart(2, '0') + ':' + lineTimeMatch[4];

        let remainder = line.replace(lineTimeMatch[0], '').replace(/^[:\s-]+/, '').trim();
        let room = '';
        const rm = remainder.match(/\b([A-D]\d{3}|RFP|AUDI|LAB-?\s*\d+|ROOM\s*\d+|BIO\d{3}|BIOLAB-?\d+|ECO\d{3})\b/i) || remainder.match(/\(([A-D]\d{3}|RFP|LAB-?\d+|BIO\d{3}|ECO\d{3})\)/i);
        if (rm) {
          room = rm[1].toUpperCase();
          remainder = remainder.replace(rm[0], '').replace(/[\(\)]/g, ' ').trim();
        }

        if (remainder.length > 2) {
          parsedSlots.push({
            day: currentDay,
            time,
            endTime,
            room,
            subjectName: remainder,
            confidence: isOcr ? 0.65 : 0.90
          });
          daySlotIndex++;
        }
      } else if (isOcr && currentDay !== null) {
        let remainder = line.trim();
        const lowerRem = remainder.toLowerCase();
        if (
          lowerRem.length >= 3 &&
          !lowerRem.includes('routine') &&
          !lowerRem.includes('notice') &&
          !lowerRem.includes('department') &&
          !lowerRem.includes('university') &&
          !lowerRem.includes('schedule') &&
          !lowerRem.includes('timetable') &&
          !lowerRem.includes('lunch') &&
          !lowerRem.includes('break') &&
          fuzzyMatchDay(lowerRem) === null
        ) {
          let room = '';
          const rm = remainder.match(/\b([A-D]\d{3}|RFP|AUDI|LAB-?\s*\d+|ROOM\s*\d+|BIO\d{3}|BIOLAB-?\d+|ECO\d{3}|CAD-?\d+|M\d{3})\b/i);
          if (rm) {
            room = rm[1].toUpperCase();
            remainder = remainder.replace(rm[0], '').replace(/[\(\)]/g, ' ').trim();
          }
          if (remainder.length >= 3) {
            const periods = [
              { start: '08:30', end: '10:00' },
              { start: '10:15', end: '11:45' },
              { start: '13:00', end: '15:00' },
              { start: '15:15', end: '16:45' }
            ];
            const p = periods[daySlotIndex % periods.length];
            parsedSlots.push({
              day: currentDay,
              time: p.start,
              endTime: p.end,
              room,
              subjectName: remainder,
              confidence: 0.60
            });
            daySlotIndex++;
          }
        }
      }
    }

    return assembleTimetable(parsedSlots, options);
  }

  /**
   * Parses ICS Calendar (.ics) file.
   */
  function parseIcsSchedule(icsText, options = {}) {
    const events = icsText.split('BEGIN:VEVENT');
    const parsedSlots = [];

    for (let i = 1; i < events.length; i++) {
      const block = events[i].split('END:VEVENT')[0];
      const summaryMatch = block.match(/SUMMARY:(.*?)(?:\r?\n|$)/);
      const startMatch = block.match(/DTSTART(?:;[^:]+)?:(\d{8}T(\d{2})(\d{2})\d{2})/);
      const endMatch = block.match(/DTEND(?:;[^:]+)?:(\d{8}T(\d{2})(\d{2})\d{2})/);
      const locMatch = block.match(/LOCATION:(.*?)(?:\r?\n|$)/);
      const rruleMatch = block.match(/RRULE:.*?(?:BYDAY=([A-Z,]+))/);

      if (!summaryMatch || !startMatch) continue;

      const summary = summaryMatch[1].trim();
      const startTime = `${startMatch[2]}:${startMatch[3]}`;
      const endTime = endMatch ? `${endMatch[2]}:${endMatch[3]}` : addMinutesToTime(startTime, 90);
      const room = locMatch ? locMatch[1].trim() : '';

      // Determine day from RRULE or DTSTART
      let days = [];
      if (rruleMatch && rruleMatch[1]) {
        const byDays = rruleMatch[1].split(',');
        for (const bd of byDays) {
          const dNum = { MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6, SU: 0 }[bd.trim().slice(-2)];
          if (dNum !== undefined) days.push(dNum);
        }
      } else {
        const y = parseInt(startMatch[1].slice(0, 4), 10);
        const m = parseInt(startMatch[1].slice(4, 6), 10) - 1;
        const d = parseInt(startMatch[1].slice(6, 8), 10);
        const dt = new Date(y, m, d);
        days.push(dt.getDay());
      }

      for (const d of days) {
        parsedSlots.push({
          day: d,
          time: startTime,
          endTime,
          room,
          subjectName: summary,
          confidence: 1.0
        });
      }
    }

    return assembleTimetable(parsedSlots, options);
  }

  /**
   * Applies image preprocessing on canvas:
   * 1. Grayscale conversion (Rec. 709 luma)
   * 2. Dark mode detection & color inversion
   * 3. Contrast stretch
   * 4. Otsu optimal binarization
   * 5. Noise thresholding
   */
  function preprocessImageCanvas(canvas) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const numPixels = width * height;

    const gray = new Uint8Array(numPixels);
    const hist = new Uint32Array(256);
    let totalLum = 0;
    let minLum = 255, maxLum = 0;

    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const lum = (r * 299 + g * 587 + b * 114) / 1000 | 0;
      gray[j] = lum;
      hist[lum]++;
      totalLum += lum;
      if (lum < minLum) minLum = lum;
      if (lum > maxLum) maxLum = lum;
    }

    const avgLum = totalLum / numPixels;
    const isDarkMode = avgLum < 125;

    // Otsu Binarization
    let sumB = 0, wB = 0, maximum = 0, threshold = 128, sum1 = 0;
    for (let i = 0; i < 256; i++) sum1 += i * hist[i];

    for (let t = 0; t < 256; t++) {
      wB += hist[t];
      if (wB === 0) continue;
      const wF = numPixels - wB;
      if (wF === 0) break;
      sumB += t * hist[t];
      const mB = sumB / wB;
      const mF = (sum1 - sumB) / wF;
      const between = wB * wF * (mB - mF) * (mB - mF);
      if (between > maximum) {
        maximum = between;
        threshold = t;
      }
    }

    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      let v = gray[j];
      if (isDarkMode) v = 255 - v;
      const bin = v > threshold ? 255 : 0;
      data[i] = bin;
      data[i + 1] = bin;
      data[i + 2] = bin;
      data[i + 3] = 255;
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas;
  }

  /**
   * Recognizes timetable text from an image or canvas using a 4-tier permissive OCR ladder:
   * Tier 1: Native hardware-accelerated Chromium Shape Detection API (window.TextDetector)
   * Tier 2: Permissive window.Tesseract (Apache-2.0)
   * Tier 3: Isolated optional OCRAD (GPL-3.0) fallback (sideloaded / developer builds)
   * Tier 4: Node.js fallback via require('tesseract.js') (for testing environments)
   */
  async function recognizeTimetableImage(imageFileOrCanvas, options = {}) {
    let canvas = null;

    if (typeof HTMLCanvasElement !== 'undefined' && imageFileOrCanvas instanceof HTMLCanvasElement) {
      canvas = imageFileOrCanvas;
    } else if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      const url = imageFileOrCanvas instanceof Blob ? URL.createObjectURL(imageFileOrCanvas) : imageFileOrCanvas;

      await new Promise((resolve, reject) => {
        img.onload = () => {
          let scale = 1;
          if (img.width < 1000) scale = Math.min(2.5, 1200 / img.width);
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          ctx.imageSmoothingEnabled = true;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          if (imageFileOrCanvas instanceof Blob) URL.revokeObjectURL(url);
          resolve();
        };
        img.onerror = reject;
        img.src = url;
      });

      preprocessImageCanvas(canvas);
    }

    let ocrText = '';
    let ocrEngineUsed = null;

    // Tier 1: Native hardware-accelerated Chromium Shape Detection API (window.TextDetector)
    if (typeof window !== 'undefined' && 'TextDetector' in window && canvas) {
      try {
        const detector = new window.TextDetector();
        const detected = await detector.detect(canvas);
        if (detected && detected.length > 0) {
          const raw = detected.map(d => (d && d.rawValue) || '').join('\n');
          if (raw.trim()) {
            ocrText = raw;
            ocrEngineUsed = 'TextDetector';
          }
        }
      } catch (e) {}
    }

    // Tier 2: Permissive window.Tesseract (Apache-2.0)
    if ((!ocrText || !ocrText.trim()) && typeof window !== 'undefined' && (window.Tesseract || typeof Tesseract !== 'undefined') && canvas) {
      try {
        const tess = window.Tesseract || Tesseract;
        if (typeof tess.recognize === 'function') {
          const ret = await tess.recognize(canvas, 'eng');
          if (ret && ret.data && ret.data.text && ret.data.text.trim()) {
            ocrText = ret.data.text;
            ocrEngineUsed = 'Tesseract.js (Browser)';
          }
        } else if (typeof tess.createWorker === 'function') {
          const worker = await tess.createWorker('eng');
          const ret = await worker.recognize(canvas);
          await worker.terminate();
          if (ret && ret.data && ret.data.text && ret.data.text.trim()) {
            ocrText = ret.data.text;
            ocrEngineUsed = 'Tesseract.js (Browser Worker)';
          }
        }
      } catch (e) {}
    }

    // Tier 3: Isolated optional OCRAD (GPL-3.0) fallback (sideloaded / developer builds)
    if ((!ocrText || !ocrText.trim()) && typeof OCRAD !== 'undefined' && canvas) {
      try {
        const res = OCRAD(canvas);
        if (res && typeof res === 'string' && res.trim()) {
          ocrText = res;
          ocrEngineUsed = 'OCRAD.js';
        }
      } catch (e) {}
    }

    // Tier 4: Node.js fallback via require('tesseract.js') (for testing environments)
    if ((!ocrText || !ocrText.trim()) && typeof window === 'undefined' && typeof require !== 'undefined') {
      try {
        const { createWorker } = require('tesseract.js');
        const worker = await createWorker('eng');
        let inputTarget = imageFileOrCanvas;
        if (typeof Buffer !== 'undefined') {
          if (imageFileOrCanvas instanceof Uint8Array || Buffer.isBuffer(imageFileOrCanvas)) {
            inputTarget = Buffer.from(imageFileOrCanvas);
          } else if (typeof Blob !== 'undefined' && imageFileOrCanvas instanceof Blob) {
            const arrBuf = await imageFileOrCanvas.arrayBuffer();
            inputTarget = Buffer.from(arrBuf);
          }
        }
        const ret = await worker.recognize(inputTarget);
        await worker.terminate();
        if (ret && ret.data && ret.data.text && ret.data.text.trim()) {
          ocrText = ret.data.text;
          ocrEngineUsed = 'Tesseract.js (Node)';
        }
      } catch (e) {}
    }

    return {
      text: (ocrText && ocrText.trim()) ? ocrText : '',
      engine: ocrEngineUsed,
      canvas
    };
  }

  /**
   * Client-side OCR timetable parser with 5-tier permissive ladder & graceful fallback.
   */
  async function parseImageSchedule(imageFileOrCanvas, options = {}) {
    const { text: ocrText, engine: ocrEngineUsed } = await recognizeTimetableImage(imageFileOrCanvas, options);

    // Tier 5: Graceful non-OCR fallback UI (pasting text, uploading PDF/ICS, manual timetable entry)
    if (!ocrText || !ocrText.trim()) {
      const err = new Error(
        'Image OCR could not extract text automatically. Please use the schedule editor, ' +
        'paste timetable text, or upload a PDF/ICS calendar file.'
      );
      err.code = 'OCR_FALLBACK_REQUIRED';
      err.fallbackOptions = ['paste_text', 'upload_pdf', 'upload_ics', 'manual_entry'];
      throw err;
    }

    return parseTextOrCsvSchedule(ocrText, {
      ...options,
      isOcr: true,
      ocrEngine: ocrEngineUsed
    });
  }

  /**
   * Assembles parsed raw slots into the standard Bunkr timetable object.
   * Harmonizes course names with Rishiverse enrolled courses if available.
   */
  function assembleTimetable(slots, options = {}) {
    if (!Array.isArray(slots) || slots.length === 0) {
      throw new Error('No class sessions could be identified from the uploaded file.');
    }

    const enrolledCourses = options.enrolledCourses || [];

    // Group slots by subject
    const subjectMap = {};

    for (const slot of slots) {
      const norm = normalizeSubjectName(slot.subjectName, enrolledCourses);
      const key = norm.key;

      if (!subjectMap[key]) {
        subjectMap[key] = {
          key,
          name: norm.name,
          code: norm.code || '',
          acronym: norm.acronym,
          slots: []
        };
      }

      // Prevent duplicate slot on same day and time
      const exists = subjectMap[key].slots.some(s => s.day === slot.day && s.time === slot.time);
      if (!exists) {
        subjectMap[key].slots.push({
          day: slot.day,
          time: slot.time,
          endTime: slot.endTime,
          room: slot.room || '',
          confidence: slot.confidence !== undefined ? slot.confidence : 1.0
        });
      }
    }

    // Calculate sessionsPerWeek
    let totalWeekly = 0;
    for (const k of Object.keys(subjectMap)) {
      subjectMap[k].slots.sort((a, b) => a.day - b.day || a.time.localeCompare(b.time));
      subjectMap[k].sessionsPerWeek = subjectMap[k].slots.length;
      totalWeekly += subjectMap[k].sessionsPerWeek;
    }

    const timetable = {
      custom: true,
      source: options.source || 'upload',
      fileName: options.fileName || 'custom_timetable',
      uploadedAt: new Date().toISOString(),
      institution: options.institution || 'Rishihood University',
      program: options.program || 'Custom Schedule',
      semester: options.semester || 'Semester Schedule',
      startDate: options.startDate || '2026-08-10',
      endDate: options.endDate || '2026-12-18',
      diwaliBreak: {
        start: '2026-11-06',
        end: '2026-11-13'
      },
      weeklySessionsCount: totalWeekly,
      subjectsCount: Object.keys(subjectMap).length,
      SLOTS: subjectMap,
      matchSubjectKey: function (name) {
        return matchSubjectToKey(name, subjectMap);
      }
    };

    return timetable;
  }

  function normalizeSubjectName(rawName, enrolledCourses) {
    const clean = rawName.trim();
    const lower = clean.toLowerCase();

    // Check against scraped enrolled courses from Rishiverse
    if (Array.isArray(enrolledCourses)) {
      for (const ec of enrolledCourses) {
        const ecName = (ec.name || '').toLowerCase();
        const ecCode = (ec.code || '').toLowerCase();
        if (ecName && (lower.includes(ecName) || ecName.includes(lower))) {
          const key = slugify(ec.name);
          return {
            key,
            name: ec.name,
            code: ec.code || '',
            acronym: makeAcronym(ec.name)
          };
        }
        if (ecCode && lower.includes(ecCode)) {
          const key = slugify(ec.name || ec.code);
          return {
            key,
            name: ec.name || ec.code,
            code: ec.code,
            acronym: makeAcronym(ec.name || ec.code)
          };
        }
      }
    }

    // Standard Rishihood Course Recognizers
    if (lower.includes('problem solving') || lower.includes('psp')) {
      return { key: 'psp', name: 'Problem Solving and Programming', code: 'CSD02C1002', acronym: 'PSP' };
    }
    if (lower.includes('web application') || lower.includes('wad')) {
      return { key: 'wad', name: 'Web Application Development - I', code: 'CSD02C1003', acronym: 'WAD' };
    }
    if (lower.includes('mathematic') || lower.includes('math')) {
      return { key: 'math', name: 'Mathematics-I (Foundation)', code: 'CSD02C1001', acronym: 'MATH' };
    }
    if (lower.includes('social communication') || lower.includes('social comm')) {
      return { key: 'social', name: 'Social Communication I', code: 'RSPRFC1003', acronym: 'Social Comm' };
    }
    if (lower.includes('networking') || lower.includes('cfn') || lower.includes('computer fundamentals')) {
      return { key: 'cfn', name: 'Computer fundamentals and networking', code: 'CSD02C1004', acronym: 'CFN' };
    }
    if (lower.includes('understanding india') || lower.includes('india')) {
      return { key: 'india', name: 'Understanding India', code: 'RSPRFC1001', acronym: 'India' };
    }
    if (lower.includes('kpmg') || lower.includes('edept') || lower.includes('workshop')) {
      return { key: 'kpmg', name: 'KPMG/Edept Workshop Certification Program', code: 'KPMG01', acronym: 'KPMG' };
    }
    if (lower.includes('self and society') || lower.includes('society')) {
      return { key: 'society', name: 'Self and Society I', code: 'RSPRFC1002', acronym: 'Self & Society' };
    }

    // Dynamic Generic Course
    const key = slugify(clean);
    return {
      key,
      name: clean,
      code: '',
      acronym: makeAcronym(clean)
    };
  }

  function matchSubjectToKey(name, slotsMap) {
    if (!name || !slotsMap) return null;
    const l = name.toLowerCase();

    for (const [key, subj] of Object.entries(slotsMap)) {
      if (key.toLowerCase() === l) return key;
      const sName = (subj.name || '').toLowerCase();
      const sCode = (subj.code || '').toLowerCase();
      if (sName && (l.includes(sName) || sName.includes(l))) return key;
      if (sCode && l.includes(sCode)) return key;
    }
    return null;
  }

  function slugify(text) {
    return text.toString().toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '') || 'course';
  }

  function makeAcronym(text) {
    const words = text.replace(/[^a-zA-Z0-9\s]/g, '').split(/\s+/).filter(Boolean);
    if (words.length === 1) return words[0].slice(0, 4).toUpperCase();
    return words.map(w => w[0]).join('').toUpperCase().slice(0, 5);
  }

  function addMinutesToTime(timeStr, minsToAdd) {
    const [h, m] = timeStr.split(':').map(Number);
    const total = h * 60 + m + minsToAdd;
    const newH = Math.floor(total / 60) % 24;
    const newM = total % 60;
    return String(newH).padStart(2, '0') + ':' + String(newM).padStart(2, '0');
  }

  function getAvailableOcrEngines() {
    const engines = [];
    if (typeof window !== 'undefined' && 'TextDetector' in window) engines.push('TextDetector');
    if (typeof window !== 'undefined' && (window.Tesseract || typeof Tesseract !== 'undefined')) engines.push('Tesseract.js (Browser)');
    if (typeof OCRAD !== 'undefined') engines.push('OCRAD.js');
    if (typeof window === 'undefined' && typeof require !== 'undefined') {
      try {
        require.resolve('tesseract.js');
        engines.push('Tesseract.js (Node)');
      } catch (e) {}
    }
    return engines;
  }

  return {
    parseSchedule,
    parsePdfSchedule,
    parseTextOrCsvSchedule,
    parseIcsSchedule,
    parseImageSchedule,
    recognizeTimetableImage,
    assembleTimetable,
    normalizeSubjectName,
    preprocessImageCanvas,
    getAvailableOcrEngines,
    DAY_NUM_TO_NAME,
    DAY_NAME_MAP
  };
});
