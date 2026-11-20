// Bunkr 2.0 - DOM Attendance Parser
// Intelligently scrapes attendance data from Rishiverse (rishihood.rishiverse.com) Next.js SPA and Canvas LMS

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./math'));
  } else {
    root.BunkrParser = root.AttendMateParser = factory(root.BunkrMath || root.AttendMateMath);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (math) {
  'use strict';

  const cleanText = (str) => (str || '').replace(/\s+/g, ' ').trim();

  /**
   * Parse an integer or float from text, removing extra symbols
   */
  const parseNum = (val) => {
    if (typeof val === 'number') return val;
    if (!val) return NaN;
    const match = String(val).match(/-?\d+(\.\d+)?/);
    return match ? parseFloat(match[0]) : NaN;
  };

  /**
   * Parse a ratio like "18/24" or "18 / 24"
   */
  const parseRatio = (text) => {
    if (!text) return null;
    const match = text.match(/(\d+)\s*[/／\\]\s*(\d+)/);
    if (match) {
      const a = parseInt(match[1], 10);
      const b = parseInt(match[2], 10);
      if (!isNaN(a) && !isNaN(b) && b > 0 && a <= b * 1.5) {
        return { attended: a, total: b };
      }
    }
    return null;
  };

  /**
   * Enhanced text extractor: handles ratio "28/32" OR labeled text like:
   * "Present: 28", "Attended: 28", "Total: 32", "Conducted: 32", "Absent: 4", etc.
   */
  const extractAttendedAndTotalFromText = (text) => {
    if (!text) return null;

    // 1. Try ratio "X / Y" or "X/Y"
    const ratio = parseRatio(text);
    if (ratio) return ratio;

    // 2. Try patterns like "Present: 28", "Attended: 28", "Held: 32", "Total: 32", etc.
    const attendedMatch = text.match(/(?:present|attended|pres|sessions attended|classes attended)\s*[:\-–]?\s*(\d+)/i);
    const totalMatch = text.match(/(?:total|held|conducted|delivered|sessions|classes held|total classes)\s*[:\-–]?\s*(\d+)/i);
    const absentMatch = text.match(/(?:absent|missed|leaves|bunks)\s*[:\-–]?\s*(\d+)/i);

    let attended = attendedMatch ? parseInt(attendedMatch[1], 10) : NaN;
    let total = totalMatch ? parseInt(totalMatch[1], 10) : NaN;
    let absent = absentMatch ? parseInt(absentMatch[1], 10) : NaN;

    if (isNaN(total) && !isNaN(attended) && !isNaN(absent)) {
      total = attended + absent;
    }
    if (!isNaN(total) && isNaN(attended) && !isNaN(absent)) {
      attended = Math.max(0, total - absent);
    }

    if (!isNaN(attended) && !isNaN(total) && total > 0 && attended <= total * 1.5) {
      return { attended, total };
    }

    return null;
  };

  /**
   * Find column indexes from table headers
   */
  function identifyColumns(headerRow) {
    const cells = Array.from(headerRow.querySelectorAll('th, td')).map((c) =>
      cleanText(c.innerText || c.textContent).toLowerCase()
    );

    const cols = {
      subject: -1,
      code: -1,
      attended: -1,
      total: -1,
      absent: -1,
      percentage: -1,
      ratio: -1
    };

    cells.forEach((text, idx) => {
      if (cols.subject === -1 && /(subject|course|paper|module|name|title|class)/i.test(text) && !/code|id|type/i.test(text)) {
        cols.subject = idx;
      }
      if (cols.code === -1 && /(code|course id|sub code|subject code)/i.test(text)) {
        cols.code = idx;
      }
      if (cols.attended === -1 && /(attended|present|pres|att hr|attended classes|present classes|sessions attended)/i.test(text) && !/absent|percentage|%/i.test(text)) {
        cols.attended = idx;
      }
      if (cols.total === -1 && /(total|held|conducted|delivered|sessions|max|total hours|total classes|sessions held)/i.test(text) && !/percentage|%/i.test(text)) {
        cols.total = idx;
      }
      if (cols.absent === -1 && /(absent|missed|leaves|bunk)/i.test(text) && !/percentage|%/i.test(text)) {
        cols.absent = idx;
      }
      if (cols.percentage === -1 && /(percentage|percent|%|att %|ratio)/i.test(text)) {
        cols.percentage = idx;
      }
    });

    // If subject not found, default to first column
    if (cols.subject === -1 && cells.length > 1) {
      cols.subject = 0;
    }

    return cols;
  }

  /**
   * Scrapes standard HTML tables (Rishiverse ERP & LMS tables)
   */
  function scrapeFromTables(targetPercentage = 75) {
    const tables = Array.from(document.querySelectorAll('table'));
    const parsedSubjects = [];

    for (const table of tables) {
      if (table.closest('#bunkr-root') || table.closest('#attendmate-root')) continue;
      // Do not scrape Canvas Gradebook or right sidebar summaries as attendance
      if (table.id === 'grades_summary' || table.closest('#grades_summary')) continue;
      if (table.classList.contains('summary') && (table.closest('#right-side') || table.closest('#right-side-wrapper'))) continue;
      if (table.closest('#right-side') || table.closest('#right-side-wrapper')) continue;

      const rows = Array.from(table.querySelectorAll('tr'));
      if (rows.length < 2) continue;

      // Identify header row
      let headerRow = rows.find((r) => r.querySelectorAll('th').length > 0) || rows[0];
      const cols = identifyColumns(headerRow);

      const dataRows = rows.slice(rows.indexOf(headerRow) + 1);

      for (const row of dataRows) {
        if (row.closest('#bunkr-root') || row.closest('#attendmate-root')) continue;
        const cells = Array.from(row.querySelectorAll('td, th'));
        if (cells.length < 2) continue;

        let name = '';
        let code = '';
        let attended = NaN;
        let total = NaN;
        let percentage = NaN;

        // Try extracting using identified columns
        if (cols.subject !== -1 && cells[cols.subject]) {
          name = cleanText(cells[cols.subject].innerText);
        }
        if (cols.code !== -1 && cells[cols.code]) {
          code = cleanText(cells[cols.code].innerText);
        }
        if (cols.attended !== -1 && cells[cols.attended]) {
          attended = parseNum(cells[cols.attended].innerText);
        }
        if (cols.total !== -1 && cells[cols.total]) {
          total = parseNum(cells[cols.total].innerText);
        }
        if (cols.percentage !== -1 && cells[cols.percentage]) {
          percentage = parseNum(cells[cols.percentage].innerText);
        }

        // If attended or total missing, search for ratio or labeled text in cells
        if (isNaN(attended) || isNaN(total)) {
          for (let i = 0; i < cells.length; i++) {
            if (i === cols.subject) continue;
            const res = extractAttendedAndTotalFromText(cells[i].innerText);
            if (res) {
              attended = res.attended;
              total = res.total;
              break;
            }
          }
        }

        // Check if absent column can fill missing total
        if (isNaN(total) && !isNaN(attended) && cols.absent !== -1 && cells[cols.absent]) {
          const absent = parseNum(cells[cols.absent].innerText);
          if (!isNaN(absent)) total = attended + absent;
        }

        // Skip headers or summary rows
        if (!name || /^(total|average|summary|grand total|overall)$/i.test(name.trim())) {
          continue;
        }

        // Validate values
        if (!isNaN(attended) && !isNaN(total) && total > 0) {
          const computedPct = (attended / total) * 100;
          parsedSubjects.push({
            id: `subj_${parsedSubjects.length + 1}_${name.substring(0, 10).replace(/\W/g, '')}`,
            name,
            code,
            attended: Math.round(attended),
            total: Math.round(total),
            absent: Math.max(0, Math.round(total - attended)),
            percentage: isNaN(percentage) ? computedPct : percentage,
            element: row,
            badgeTargetElement: cells[cols.percentage] || cells[cells.length - 1] || row
          });
        }
      }

      if (parsedSubjects.length > 0) break; // Found main table
    }

    return parsedSubjects;
  }

  /**
   * Scrapes Canvas LMS Attendance / Roll Call pages and course cards
   */
  function scrapeCanvasLMS(targetPercentage = 75) {
    const subjects = [];

    // 1. Canvas Attendance summary table or rows (strictly attendance, never gradebook)
    const attendanceTable = document.querySelector('#attendance_summary, .student_attendance, table.attendance-summary');
    if (attendanceTable && attendanceTable.id !== 'grades_summary' && !attendanceTable.closest('#grades_summary')) {
      const rows = Array.from(attendanceTable.querySelectorAll('tr.attendance_row, tr:not(.student_assignment)'));
      for (const row of rows) {
        if (row.classList.contains('student_assignment') || row.closest('#grades_summary')) continue;
        const titleEl = row.querySelector('.title a, .title');
        const scoreEl = row.querySelector('.score_holder, .assignment_score');
        if (!titleEl || !scoreEl) continue;

        const title = cleanText(titleEl.innerText);
        const scoreText = cleanText(scoreEl.innerText);
        const ratio = extractAttendedAndTotalFromText(scoreText);

        if (ratio) {
          subjects.push({
            id: `canvas_${subjects.length + 1}`,
            name: title,
            code: '',
            attended: ratio.attended,
            total: ratio.total,
            absent: Math.max(0, ratio.total - ratio.attended),
            percentage: (ratio.attended / ratio.total) * 100,
            element: row,
            badgeTargetElement: scoreEl
          });
        }
      }
    }

    // 2. Canvas Course Cards on Dashboard or Courses list
    const courseCards = Array.from(document.querySelectorAll('.ic-DashboardCard, .course-list-table-row'));
    for (const card of courseCards) {
      const titleEl = card.querySelector('.ic-DashboardCard__header-title, .name, h3, h4');
      if (!titleEl) continue;

      const title = cleanText(titleEl.innerText);
      const ratio = extractAttendedAndTotalFromText(card.innerText);

      if (ratio) {
        subjects.push({
          id: `canvas_card_${subjects.length + 1}`,
          name: title,
          code: '',
          attended: ratio.attended,
          total: ratio.total,
          absent: Math.max(0, ratio.total - ratio.attended),
          percentage: (ratio.attended / ratio.total) * 100,
          element: card,
          badgeTargetElement: card.querySelector('.ic-DashboardCard__header') || card
        });
      }
    }

    return subjects;
  }

  /**
   * Scrapes Card/Widget layouts (modern React/Next.js/Tailwind ERPs like Rishiverse)
   */
  function scrapeFromCards(targetPercentage = 75) {
    // Broad selector for modern Tailwind / Next.js / shadcn card containers
    const selectors = [
      '[class*="rounded-"][class*="border"]',
      '[class*="rounded-"][class*="shadow"]',
      'div[data-slot="card"]',
      '.card',
      '.attendance-card',
      '.course-card',
      '.subject-card',
      '[class*="attendance"]',
      '[class*="course-item"]',
      'div.grid > div',
      'div[class*="grid-cols"] > div'
    ];

    const elements = Array.from(document.querySelectorAll(selectors.join(', ')));
    const subjects = [];
    const seenNames = new Set();

    for (const card of elements) {
      // Don't parse Bunkr injected UI or Canvas Gradebook / Assignments UI
      if (card.closest('#bunkr-root') || card.id?.includes('bunkr') || card.closest('#attendmate-root') || card.id?.includes('attendmate')) continue;
      if (card.closest('#grades_summary') || card.closest('#right-side') || card.closest('#right-side-wrapper') || card.closest('.assignment-list')) continue;

      // Extract title from headings or bold elements
      const titleEl = card.querySelector('h1, h2, h3, h4, h5, .title, .course-name, .subject-name, strong, [class*="font-semibold"], [class*="font-bold"]');
      if (!titleEl) continue;

      const name = cleanText(titleEl.innerText);
      if (!name || seenNames.has(name) || name.length < 3 || /attendance|dashboard|overview|restoring session|academic/i.test(name)) {
        continue;
      }

      const ratio = extractAttendedAndTotalFromText(card.innerText);
      if (ratio) {
        seenNames.add(name);
        subjects.push({
          id: `card_${subjects.length + 1}`,
          name,
          code: '',
          attended: ratio.attended,
          total: ratio.total,
          absent: Math.max(0, ratio.total - ratio.attended),
          percentage: (ratio.attended / ratio.total) * 100,
          element: card,
          badgeTargetElement: titleEl.parentElement || card
        });
      }
    }

    return subjects;
  }

  /**
   * Main scan function: runs all strategies and aggregates metrics
   */
  function scanPage(targetPercentage = 75) {
    // Strict Quiz Safe-Guard Mode & Canvas Gradebook Scraper Guard
    if (typeof window !== 'undefined') {
      const router = window.CanvasRouter || window.BunkrRouter;
      const isExam = (router && typeof router.isExamSafeRoute === 'function' && router.isExamSafeRoute()) ||
        Boolean(window.__bunkrQuiescentSafeMode) ||
        Boolean(window.__attendmateQuiescentSafeMode);

      if (isExam) {
        return {
          subjects: [],
          overall: {
            attended: 0,
            total: 0,
            absent: 0,
            percentage: 0,
            status: math && typeof math.getAttendanceStatus === 'function' ? math.getAttendanceStatus(0, 0, targetPercentage) : null,
            targetPercentage
          },
          url: window.location.href,
          domain: window.location.hostname,
          timestamp: new Date().toISOString(),
          isExamSafe: true,
          quiescentSafeMode: true
        };
      }

      const isGrades = router && typeof router.isCanvasGradesPage === 'function'
        ? router.isCanvasGradesPage()
        : (/\/courses\/[^\/]+\/grades(?:\b|\/|\?|#|$)/i.test(window.location.href) || Boolean(document.querySelector('table#grades_summary, #grades_summary')));

      if (isGrades) {
        return {
          subjects: [],
          overall: {
            attended: 0,
            total: 0,
            absent: 0,
            percentage: 0,
            status: math && typeof math.getAttendanceStatus === 'function' ? math.getAttendanceStatus(0, 0, targetPercentage) : null,
            targetPercentage
          },
          url: window.location.href,
          domain: window.location.hostname,
          timestamp: new Date().toISOString(),
          isCanvasGrades: true
        };
      }
    }

    let subjects = [];

    // Try Table Scraper first (standard ERP tables)
    subjects = scrapeFromTables(targetPercentage);

    // If no tables, try Card / Grid layouts (Next.js / Tailwind)
    if (subjects.length === 0) {
      subjects = scrapeFromCards(targetPercentage);
    }

    // If still empty, try Canvas LMS specific patterns
    if (subjects.length === 0) {
      subjects = scrapeCanvasLMS(targetPercentage);
    }

    // Compute status and bunk metrics for each subject
    subjects.forEach((subj, idx) => {
      subj.color = math.getSubjectColor(subj.code || subj.name || idx);
      subj.status = math.getAttendanceStatus(subj.attended, subj.total, targetPercentage);
      subj.bunkable = subj.status.bunkable;
      subj.needed = subj.status.needed;
    });

    // Compute overall aggregated totals
    let totalAttended = 0;
    let totalMarked = 0;

    subjects.forEach((s) => {
      totalAttended += s.attended;
      totalMarked += s.total;
    });

    const overallPct = totalMarked > 0 ? (totalAttended / totalMarked) * 100 : 0;
    const overallStatus = math.getAttendanceStatus(totalAttended, totalMarked, targetPercentage);

    const overall = {
      attended: totalAttended,
      total: totalMarked,
      absent: Math.max(0, totalMarked - totalAttended),
      percentage: overallPct,
      status: overallStatus,
      targetPercentage
    };

    return {
      subjects,
      overall,
      url: window.location.href,
      domain: window.location.hostname,
      timestamp: new Date().toISOString()
    };
  }

  return {
    scanPage,
    parseRatio,
    parseNum,
    extractAttendedAndTotalFromText
  };
});
