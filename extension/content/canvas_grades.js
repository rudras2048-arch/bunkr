/**
 * Bunkr - Canvas Grade & Evaluation Intelligence Engine
 * Target: *://*.instructure.com/courses/*\/grades*
 *
 * Capabilities:
 * 1. Gradebook Scraper:
 *    - Scrapes Course Code & Title (e.g. CSD02C1001 Mathematics-I)
 *    - Scrapes Category Weights from Canvas right sidebar (#right-side table.summary)
 *    - Scrapes Assignment rows from table#grades_summary (Title, Due, Status, Score)
 * 2. Target Grade & SGPA Forecaster:
 *    - Default target: 80% (8.0 SGPA) with dual scale (Percentage + 10-point SGPA)
 *    - Calculates locked points and remaining assessment points
 *    - Calculates minimum marks required on uncompleted assessments (e.g. End Term 200 pts)
 *    - Quick targets (75%, 80%, 85%, 90%) + interactive slider / stepper
 * 3. Non-destructive Native Canvas UI:
 *    - Clean Intelligence banner above #grades_summary with category progress bars & What-If simulator
 *    - Status badges in table rows without disturbing column alignment or spilling into #right-side
 * 4. UMD Module cleanly supporting both Browser runtime and Node.js test harness
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CanvasGrades = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // =========================================================================
  // UTILITY & HELPER FUNCTIONS
  // =========================================================================

  const cleanText = (str) => (str || '').replace(/\s+/g, ' ').trim();

  /**
   * Convert percentage (0-100) to UGC CBCS 10-point grade point or Linear SGPA.
   * Default scale: 'ugc' (UGC Choice-Based Credit System 10-point bracket scale).
   * Toggle scale: 'linear' (clamped / 10).
   */
  function percentageToGradePoint(pct, scale = 'ugc') {
    if (typeof pct !== 'number' || isNaN(pct)) return 0;
    const clamped = Math.max(0, Math.min(100, pct));
    if (scale === 'linear') {
      return Number((clamped / 10).toFixed(2));
    }
    // Official UGC CBCS 10-point bracket scale
    if (clamped >= 90) return 10; // O (Outstanding)
    if (clamped >= 80) return 9;  // A+ (Excellent)
    if (clamped >= 70) return 8;  // A (Very Good)
    if (clamped >= 60) return 7;  // B+ (Good)
    if (clamped >= 50) return 6;  // B (Above Average)
    if (clamped >= 45) return 5;  // C (Average)
    if (clamped >= 40) return 4;  // P (Pass)
    return 0;                     // F (Fail)
  }

  /**
   * Map percentage to official UGC CBCS grade info object:
   * Returns { grade, point, description, letter, label, minPct, maxPct, band }
   */
  function percentageToUgcGrade(pct) {
    if (typeof pct !== 'number' || isNaN(pct)) {
      return {
        grade: 'F',
        letter: 'F',
        point: 0,
        description: 'Fail',
        label: 'Fail',
        minPct: 0,
        maxPct: 39.99,
        band: 'Grade F (0.0 band)'
      };
    }
    const clamped = Math.max(0, Math.min(100, pct));
    if (clamped >= 90) {
      return {
        grade: 'O',
        letter: 'O',
        point: 10,
        description: 'Outstanding',
        label: 'Outstanding',
        minPct: 90,
        maxPct: 100,
        band: 'Grade O (10.0 band)'
      };
    }
    if (clamped >= 80) {
      return {
        grade: 'A+',
        letter: 'A+',
        point: 9,
        description: 'Excellent',
        label: 'Excellent',
        minPct: 80,
        maxPct: 89.99,
        band: 'Grade A+ (9.0 band)'
      };
    }
    if (clamped >= 70) {
      return {
        grade: 'A',
        letter: 'A',
        point: 8,
        description: 'Very Good',
        label: 'Very Good',
        minPct: 70,
        maxPct: 79.99,
        band: 'Grade A (8.0 band)'
      };
    }
    if (clamped >= 60) {
      return {
        grade: 'B+',
        letter: 'B+',
        point: 7,
        description: 'Good',
        label: 'Good',
        minPct: 60,
        maxPct: 69.99,
        band: 'Grade B+ (7.0 band)'
      };
    }
    if (clamped >= 50) {
      return {
        grade: 'B',
        letter: 'B',
        point: 6,
        description: 'Above Average',
        label: 'Above Average',
        minPct: 50,
        maxPct: 59.99,
        band: 'Grade B (6.0 band)'
      };
    }
    if (clamped >= 45) {
      return {
        grade: 'C',
        letter: 'C',
        point: 5,
        description: 'Average',
        label: 'Average',
        minPct: 45,
        maxPct: 49.99,
        band: 'Grade C (5.0 band)'
      };
    }
    if (clamped >= 40) {
      return {
        grade: 'P',
        letter: 'P',
        point: 4,
        description: 'Pass',
        label: 'Pass',
        minPct: 40,
        maxPct: 44.99,
        band: 'Grade P (4.0 band)'
      };
    }
    return {
      grade: 'F',
      letter: 'F',
      point: 0,
      description: 'Fail',
      label: 'Fail',
      minPct: 0,
      maxPct: 39.99,
      band: 'Grade F (0.0 band)'
    };
  }

  /**
   * Convert percentage (0-100) to 10-point SGPA scale.
   * Standard Indian/UGC academic conversion: SGPA = Percentage / 10
   */
  function percentageToSGPA(pct) {
    if (typeof pct !== 'number' || isNaN(pct)) return 0;
    const clamped = Math.max(0, Math.min(100, pct));
    return Number((clamped / 10).toFixed(2));
  }

  /**
   * Convert 10-point SGPA to percentage scale.
   */
  function sgpaToPercentage(sgpa) {
    if (typeof sgpa !== 'number' || isNaN(sgpa)) return 0;
    const clamped = Math.max(0, Math.min(10, sgpa));
    return Number((clamped * 10).toFixed(2));
  }

  /**
   * Map percentage to standard letter grade adhering to UGC CBCS standard.
   */
  function getLetterGrade(pct) {
    const info = percentageToUgcGrade(pct);
    return `${info.grade} (${info.description})`;
  }

  // =========================================================================
  // 1. CANVAS GRADEBOOK SCRAPER
  // =========================================================================

  /**
   * Scrapes Course Title & Course Code.
   * Resiliently inspects breadcrumbs, headers, title, and URL.
   */
  function parseCourseHeader(doc) {
    if (typeof doc === 'string') {
      const html = doc;
      let rawTitle = '';
      let courseId = '';

      const idMatch = html.match(/\/courses\/(\d+)/i);
      if (idMatch) {
        courseId = idMatch[1];
      }

      const crumbMatch = html.match(/<nav[^>]*id=["']breadcrumbs["'][^>]*>([\s\S]*?)<\/nav>/i) ||
                         html.match(/<ul[^>]*class=["'][^"']*ic-app-crumbs[^"']*["'][^>]*>([\s\S]*?)<\/ul>/i);
      if (crumbMatch) {
        const liMatches = [...crumbMatch[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)];
        if (liMatches.length >= 2) {
          rawTitle = cleanText(liMatches[1][1].replace(/<[^>]+>/g, ' '));
        }
      }
      if (!rawTitle) {
        const h1Match = html.match(/<h1[^>]*class=["'][^"']*course-title[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i) ||
                        html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
        if (h1Match) rawTitle = cleanText(h1Match[1].replace(/<[^>]+>/g, ' '));
      }
      if (!rawTitle) {
        const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        if (titleMatch) rawTitle = cleanText(titleMatch[1].replace(/<[^>]+>/g, ' '));
      }
      return _extractCourseCodeAndTitle(rawTitle, courseId);
    }

    const d = doc || (typeof document !== 'undefined' ? document : null);
    if (!d) {
      return {
        courseCode: 'CSD02C1001',
        courseTitle: 'Mathematics-I',
        fullTitle: 'CSD02C1001 Mathematics-I',
        code: 'CSD02C1001',
        title: 'Mathematics-I',
        name: 'Mathematics-I',
        courseId: ''
      };
    }

    let rawTitle = '';
    let courseId = '';

    // Check breadcrumbs: nav#breadcrumbs or .ic-app-crumbs
    const crumbItems = d.querySelectorAll ? d.querySelectorAll('#breadcrumbs ul li, .ic-app-crumbs li, .breadcrumbs li') : [];
    if (crumbItems && crumbItems.length >= 2) {
      // Typically 2nd item is course name, e.g. "CSD02C1001 Mathematics-I"
      const courseCrumb = crumbItems[1];
      rawTitle = cleanText(courseCrumb.textContent);
    }

    if (!rawTitle && d.querySelector) {
      const crumbLink = d.querySelector('#breadcrumbs a[href*="/courses/"], .ic-app-crumbs a[href*="/courses/"]');
      if (crumbLink) rawTitle = cleanText(crumbLink.textContent);
    }

    // Extract Course ID from links or URL
    if (d.querySelector) {
      const link = d.querySelector('#breadcrumbs a[href*="/courses/"], .ic-app-crumbs a[href*="/courses/"], a[href*="/courses/"]');
      if (link) {
        const m = (link.getAttribute('href') || '').match(/\/courses\/(\d+)/i);
        if (m) courseId = m[1];
      }
    }
    if (!courseId && typeof window !== 'undefined' && window.location) {
      const m = (window.location.pathname || '').match(/\/courses\/(\d+)/i);
      if (m) courseId = m[1];
    }
    if (!courseId && d.baseURI) {
      const m = d.baseURI.match(/\/courses\/(\d+)/i);
      if (m) courseId = m[1];
    }

    // Check header elements
    if (!rawTitle && d.querySelector) {
      const heading = d.querySelector('h1.course-title, .course-title, #content h1, h1.title, #content h2');
      if (heading) rawTitle = cleanText(heading.textContent);
    }

    // Check document title
    if (!rawTitle && d.title) {
      rawTitle = cleanText(d.title);
    }

    return _extractCourseCodeAndTitle(rawTitle, courseId);
  }

  function _extractCourseCodeAndTitle(rawTitle, courseId = '') {
    let courseCode = '';
    const codeMatch = (rawTitle || '').match(/\b([A-Z]{2,6}\d{1,4}[A-Z\d]*)\b/);
    if (codeMatch) {
      courseCode = codeMatch[1];
    }

    let courseTitle = rawTitle || '';
    if (courseCode) {
      courseTitle = courseTitle.replace(courseCode, '');
    }
    courseTitle = courseTitle
      .replace(/^(Grades for|Courses|Course|Home|Attendance)[\s:–—|-]*/i, '')
      .replace(/[:–—|-]+Grades.*$/i, '')
      .replace(/^[ :–—|-]+|[ :–—|-]+$/g, '')
      .trim();

    if (!courseTitle && courseCode) {
      courseTitle = courseCode;
    }
    if (!courseCode && !courseTitle) {
      courseCode = 'CSD02C1001';
      courseTitle = 'Mathematics-I';
    }

    const fullTitle = courseCode && courseTitle && !courseTitle.includes(courseCode)
      ? `${courseCode} ${courseTitle}`
      : (courseTitle || courseCode);

    return {
      courseCode,
      courseTitle,
      fullTitle,
      code: courseCode,
      title: courseTitle,
      name: courseTitle,
      courseId: courseId || ''
    };
  }

  /**
   * Normalizes category weights if sum != 100% (e.g. 95% or 105%).
   * Re-bases weights proportionally so they sum to 100%.
   */
  function _normalizeCategoryWeights(categories, weights, totalWeight) {
    const rawTotalWeight = categories.reduce((sum, c) => sum + c.weight, 0);
    const rawWeights = { ...weights };
    let isDegradedMode = false;
    let degradedReason = '';

    if (rawTotalWeight > 0 && Math.abs(rawTotalWeight - 100) > 0.01) {
      isDegradedMode = true;
      degradedReason = `Estimate only: category weights sum to ${Number(rawTotalWeight.toFixed(2))}% (normalized to 100%)`;
      categories.forEach((c) => {
        c.rawWeight = c.weight;
        c.weight = Number(((c.rawWeight / rawTotalWeight) * 100).toFixed(4));
        c.percentage = c.weight;
        weights[c.name] = c.weight;
      });
      totalWeight = 100;
    } else {
      categories.forEach((c) => {
        c.rawWeight = c.weight;
      });
      if (totalWeight === 0 && rawTotalWeight > 0) {
        totalWeight = rawTotalWeight;
      }
    }

    return {
      categories,
      weights,
      rawWeights,
      totalWeight: Number(totalWeight.toFixed(2)),
      rawTotalWeight: Number(rawTotalWeight.toFixed(2)),
      isDegradedMode,
      degradedReason
    };
  }

  /**
   * Scrapes Category Weights from Canvas right sidebar (#right-side table.summary).
   * Example: Assignments 10%, Internal 50%, External 40% (Total: 100%)
   * Normalizes weights if sum != 100% and flags degraded mode.
   */
  function parseCategoryWeights(doc) {
    if (typeof doc === 'string') {
      const html = doc;
      const categories = [];
      const weights = {};
      let totalWeight = 0;

      const tableMatch = html.match(/<table[^>]*class=["'][^"']*summary[^"']*["'][^>]*>([\s\S]*?)<\/table>/i);
      if (tableMatch) {
        const rowMatches = [...tableMatch[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
        rowMatches.forEach((rm) => {
          const rowHtml = rm[1];
          const headerMatch = rowHtml.match(/<th[^>]*>([\s\S]*?)<\/th>/i) ||
                              rowHtml.match(/<td[^>]*>([\s\S]*?)<\/td>/i);
          const tdMatches = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)];
          const valueMatch = tdMatches.length > 0 ? tdMatches[tdMatches.length - 1] : null;

          if (!headerMatch || !valueMatch) return;

          const name = cleanText(headerMatch[1].replace(/<[^>]+>/g, ' '));
          const valText = cleanText(valueMatch[1].replace(/<[^>]+>/g, ' '));
          const match = valText.match(/(\d+(?:\.\d+)?)\s*%/);
          if (!match) return;

          const weight = parseFloat(match[1]);
          if (isNaN(weight)) return;

          if (/^total/i.test(name)) {
            totalWeight = weight;
          } else {
            categories.push({ name, weight, percentage: weight });
            weights[name] = weight;
          }
        });
      }

      return _normalizeCategoryWeights(categories, weights, totalWeight);
    }

    const d = doc || (typeof document !== 'undefined' ? document : null);
    if (!d) return { categories: [], weights: {}, rawWeights: {}, totalWeight: 0, rawTotalWeight: 0, isDegradedMode: false, degradedReason: '' };

    const weightsTable = d.querySelector ? d.querySelector('#right-side table.summary, #right-side table, table.summary, .assignment_weights table') : null;
    const categories = [];
    const weights = {};
    let totalWeight = 0;

    if (weightsTable) {
      const rows = weightsTable.querySelectorAll('tbody tr, tr');
      rows.forEach((row) => {
        const headerCell = row.querySelector('th, td:first-child');
        const valueCell = row.querySelector('td:last-child, td:nth-child(2)');
        if (!headerCell || !valueCell) return;

        const name = cleanText(headerCell.textContent);
        const valText = cleanText(valueCell.textContent);
        const match = valText.match(/(\d+(?:\.\d+)?)\s*%/);
        if (!match) return;

        const weight = parseFloat(match[1]);
        if (isNaN(weight)) return;

        if (/^total/i.test(name)) {
          totalWeight = weight;
        } else {
          categories.push({
            name,
            weight,
            percentage: weight
          });
          weights[name] = weight;
        }
      });
    }

    return _normalizeCategoryWeights(categories, weights, totalWeight);
  }

  /**
   * Scrapes Assignment rows from table#grades_summary.
   * Extracts Title, Due Date, Status, Score, Points Possible, and Category.
   */
  function parseAssignmentRows(doc, categoriesList = []) {
    if (typeof doc === 'string') {
      const html = doc;
      const assignments = [];
      const tableMatch = html.match(/<table[^>]*id=["']grades_summary["'][^>]*>([\s\S]*?)<\/table>/i);
      if (!tableMatch) return [];

      const tbodyMatch = tableMatch[1].match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
      const contentToScan = tbodyMatch ? tbodyMatch[1] : tableMatch[1];
      const rowMatches = [...contentToScan.matchAll(/<tr([^>]*)>([\s\S]*?)<\/tr>/gi)];
      let currentCategory = '';

      rowMatches.forEach((rm, idx) => {
        const attrs = rm[1] || '';
        const rowHtml = rm[2] || '';

        if (/scope=["']col["']/i.test(rowHtml) || /<thead/i.test(attrs) || /<th[^>]*scope/i.test(rowHtml)) return;
        if (/class=["'][^"']*(?:hard_coded|final_grade|group_total)[^"']*["']/i.test(attrs) || /id=["']final_grade["']/i.test(attrs)) {
          return;
        }

        // Category header row
        if (/class=["'][^"']*(?:group_header|assignment_group)[^"']*["']/i.test(attrs)) {
          const catText = cleanText(rowHtml.replace(/<[^>]+>/g, ' '));
          if (catText) currentCategory = catText;
          return;
        }

        // Title
        const titleMatch = rowHtml.match(/<th[^>]*class=["'][^"']*title[^"']*["'][^>]*>([\s\S]*?)<\/th>/i) ||
                           rowHtml.match(/<td[^>]*class=["'][^"']*title[^"']*["'][^>]*>([\s\S]*?)<\/td>/i);
        if (!titleMatch) return;
        const rawTitleBlock = titleMatch[1];
        const linkMatch = rawTitleBlock.match(/<a[^>]*>([^<]+)<\/a>/i);
        const title = cleanText(linkMatch ? linkMatch[1] : rawTitleBlock.replace(/<[^>]+>/g, ' '));
        if (!title || /^total/i.test(title) || /^name$/i.test(title) || /^assignment name$/i.test(title)) return;

        // Category Context
        let category = currentCategory;
        const contextMatch = rawTitleBlock.match(/<div[^>]*class=["'][^"']*context[^"']*["'][^>]*>([^<]+)<\/div>/i);
        if (contextMatch) {
          category = cleanText(contextMatch[1]);
        }
        if (!category && categoriesList.length > 0) {
          const found = categoriesList.find((c) =>
            title.toLowerCase().includes(c.name.toLowerCase()) ||
            c.name.toLowerCase().includes(title.toLowerCase())
          );
          if (found) category = found.name;
          else if (/assignment/i.test(title)) category = categoriesList.find((c) => /assignment/i.test(c.name))?.name || categoriesList[0].name;
          else if (/internal|mid\s*term|quiz|test|lab/i.test(title)) category = categoriesList.find((c) => /internal/i.test(c.name))?.name || categoriesList[0].name;
          else if (/external|end\s*term|final/i.test(title)) category = categoriesList.find((c) => /external/i.test(c.name))?.name || categoriesList[categoriesList.length - 1].name;
        }

        // Due
        const dueMatch = rowHtml.match(/<td[^>]*class=["'][^"']*due[^"']*["'][^>]*>([\s\S]*?)<\/td>/i);
        const dueDate = dueMatch ? cleanText(dueMatch[1].replace(/<[^>]+>/g, ' ')) : '-';

        // Status
        const statusMatch = rowHtml.match(/<td[^>]*class=["'][^"']*status[^"']*["'][^>]*>([\s\S]*?)<\/td>/i);
        let status = statusMatch ? cleanText(statusMatch[1].replace(/<[^>]+>/g, ' ')) : '';

        // Score
        const scoreMatch = rowHtml.match(/<td[^>]*class=["'][^"']*(?:assignment_score|score)[^"']*["'][^>]*>([\s\S]*?)<\/td>/i);
        let score = null;
        let pointsPossible = 0;
        let scoreText = '';

        if (scoreMatch) {
          scoreText = cleanText(scoreMatch[1].replace(/<[^>]+>/g, ' '));
          const ratioMatch = scoreText.match(/(-?\d+(?:\.\d+)?|[-—–]|N\/A|EX)\s*[/／\\]\s*(\d+(?:\.\d+)?)/i);
          if (ratioMatch) {
            const rawScore = ratioMatch[1];
            pointsPossible = parseFloat(ratioMatch[2]) || 0;
            if (rawScore !== '-' && rawScore !== '—' && rawScore !== '–' && rawScore.toUpperCase() !== 'N/A' && rawScore.toUpperCase() !== 'EX') {
              const parsed = parseFloat(rawScore);
              if (!isNaN(parsed)) score = parsed;
            }
          }
        }

        // Detect Excused status (status, score text, class)
        let isExcused = false;
        if (/excused/i.test(status) || /excused/i.test(scoreText) || /^\s*EX\s*$/i.test(scoreText) || /\bEX\s*[/／\\]/i.test(scoreText) || /^\s*EX\b/i.test(scoreText)) {
          isExcused = true;
        }
        if (/class=["'][^"']*excused[^"']*["']/i.test(rowHtml) || /class=["'][^"']*excused[^"']*["']/i.test(attrs)) {
          isExcused = true;
        }

        if (isExcused) {
          score = null;
          status = 'Excused';
        }

        const isCompleted = !isExcused && score !== null && !isNaN(score);
        const isSubmitted = !isExcused && (isCompleted || (!/unsubmitted/i.test(status) && /submitted|graded|resubmitted/i.test(status)));
        if (!status) {
          if (isCompleted) status = 'Graded';
          else if (isSubmitted) status = 'Submitted';
          else status = 'Unsubmitted';
        }

        const idMatch = attrs.match(/id=["']([^"']+)["']/i);
        assignments.push({
          id: idMatch ? idMatch[1] : `assignment_${idx + 1}`,
          title,
          category: category || 'Default',
          dueDate,
          status,
          score,
          pointsPossible,
          isCompleted,
          isSubmitted,
          isExcused,
          percentage: !isExcused && isCompleted && pointsPossible > 0 ? (score / pointsPossible) * 100 : null,
          rowElement: null
        });
      });

      return assignments;
    }

    const d = doc || (typeof document !== 'undefined' ? document : null);
    if (!d) return [];

    const table = d.querySelector ? d.querySelector('table#grades_summary, #grades_summary') : null;
    if (!table) return [];

    const rows = table.querySelectorAll('tbody tr, tr');
    const assignments = [];
    let currentCategory = '';

    rows.forEach((row, idx) => {
      // Skip table header rows or total/summary rows
      if (row.querySelector('th[scope="col"]') || row.closest('thead')) return;
      if (row.classList.contains('hard_coded') || row.classList.contains('final_grade') ||
          row.classList.contains('group_total') || row.id === 'final_grade') {
        return;
      }

      // Check if row is a category header separator
      if (row.classList.contains('group_header') || row.classList.contains('assignment_group')) {
        const catText = cleanText(row.textContent);
        if (catText) currentCategory = catText;
        return;
      }

      // Assignment Title
      let title = '';
      const linkEl = row.querySelector('th.title a, .title a, a');
      if (linkEl) {
        title = cleanText(linkEl.textContent);
      } else {
        const titleEl = row.querySelector('th.title, .title');
        if (titleEl) {
          const clone = titleEl.cloneNode(true);
          const extra = clone.querySelectorAll('.context, .assignment_group, .bunkr-row-badge');
          extra.forEach((e) => e.remove());
          title = cleanText(clone.textContent);
        }
      }
      if (!title || /^total/i.test(title) || /^name$/i.test(title) || /^assignment name$/i.test(title)) return;

      // Category Context
      let category = currentCategory;
      const contextEl = row.querySelector('th.title .context, .context, .assignment_group');
      if (contextEl) {
        category = cleanText(contextEl.textContent);
      } else if (row.dataset && row.dataset.assignmentGroup) {
        category = cleanText(row.dataset.assignmentGroup);
      }

      // If category is still empty, match against categoriesList or heuristics
      if (!category && categoriesList.length > 0) {
        const found = categoriesList.find((c) =>
          title.toLowerCase().includes(c.name.toLowerCase()) ||
          c.name.toLowerCase().includes(title.toLowerCase())
        );
        if (found) {
          category = found.name;
        } else if (/assignment/i.test(title)) {
          category = categoriesList.find((c) => /assignment/i.test(c.name))?.name || categoriesList[0].name;
        } else if (/internal|mid\s*term|quiz|test|lab/i.test(title)) {
          category = categoriesList.find((c) => /internal/i.test(c.name))?.name || categoriesList[0].name;
        } else if (/external|end\s*term|final/i.test(title)) {
          category = categoriesList.find((c) => /external/i.test(c.name))?.name || categoriesList[categoriesList.length - 1].name;
        }
      }

      // Due Date
      const dueEl = row.querySelector('td.due, .due_date, .due');
      const dueDate = dueEl ? cleanText(dueEl.textContent) : '';

      // Status
      const statusEl = row.querySelector('td.status, .submission_status, .badge');
      let status = statusEl ? cleanText(statusEl.textContent) : '';

      // Score and Points Possible
      const scoreEl = row.querySelector('td.assignment_score, td.score, .score_holder');
      let score = null;
      let pointsPossible = 0;
      let scoreText = '';

      if (scoreEl) {
        scoreText = cleanText(scoreEl.textContent);
        // Pattern: "5 / 5", "10 / 10", "4 / 5", "- / 100", "- / 200", "— / 200", "EX / 50"
        const ratioMatch = scoreText.match(/(-?\d+(?:\.\d+)?|[-—–]|N\/A|EX)\s*[/／\\]\s*(\d+(?:\.\d+)?)/i);
        if (ratioMatch) {
          const rawScore = ratioMatch[1];
          pointsPossible = parseFloat(ratioMatch[2]) || 0;
          if (rawScore !== '-' && rawScore !== '—' && rawScore !== '–' && rawScore.toUpperCase() !== 'N/A' && rawScore.toUpperCase() !== 'EX') {
            const parsed = parseFloat(rawScore);
            if (!isNaN(parsed)) score = parsed;
          }
        } else {
          // Alternative: check span.grade and span.points_possible
          const gradeSpan = scoreEl.querySelector('.grade');
          const possibleSpan = scoreEl.querySelector('.points_possible');
          if (possibleSpan) {
            pointsPossible = parseFloat(cleanText(possibleSpan.textContent)) || 0;
          }
          if (gradeSpan) {
            const raw = cleanText(gradeSpan.textContent);
            if (raw && raw !== '-' && raw !== '—' && raw.toUpperCase() !== 'EX') {
              const parsed = parseFloat(raw);
              if (!isNaN(parsed)) score = parsed;
            }
          }
        }
      }

      // Detect Excused status (status, score text, class)
      let isExcused = false;
      if (/excused/i.test(status) || /excused/i.test(scoreText) || /^\s*EX\s*$/i.test(scoreText) || /\bEX\s*[/／\\]/i.test(scoreText) || /^\s*EX\b/i.test(scoreText)) {
        isExcused = true;
      }
      if (row.classList.contains('excused') || row.querySelector('.excused') || (scoreEl && scoreEl.classList.contains('excused'))) {
        isExcused = true;
      }

      if (isExcused) {
        score = null;
        status = 'Excused';
      }

      const isCompleted = !isExcused && score !== null && !isNaN(score);
      const isSubmitted = !isExcused && (isCompleted || (!/unsubmitted/i.test(status) && /submitted|graded|resubmitted/i.test(status)));

      if (!status) {
        if (isCompleted) status = 'Graded';
        else if (isSubmitted) status = 'Submitted';
        else status = 'Unsubmitted';
      }

      assignments.push({
        id: row.id || `assignment_${idx + 1}`,
        title,
        category: category || 'Default',
        dueDate: dueDate || '-',
        status,
        score,
        pointsPossible,
        isCompleted,
        isSubmitted,
        isExcused,
        percentage: !isExcused && isCompleted && pointsPossible > 0 ? (score / pointsPossible) * 100 : null,
        rowElement: row
      });
    });

    return assignments;
  }

  /**
   * Scrapes entire Canvas Gradebook page.
   */
  function scrapeGradebook(doc) {
    const course = parseCourseHeader(doc);
    const weightData = parseCategoryWeights(doc);
    const assignments = parseAssignmentRows(doc, weightData.categories);

    return {
      course,
      categories: weightData.categories,
      weights: weightData.weights,
      rawWeights: weightData.rawWeights || weightData.weights,
      totalWeight: weightData.totalWeight,
      rawTotalWeight: weightData.rawTotalWeight || weightData.totalWeight,
      isDegradedMode: Boolean(weightData.isDegradedMode),
      degradedReason: weightData.degradedReason || '',
      assignments
    };
  }

  // =========================================================================
  // 2. TARGET GRADE & SGPA FORECASTER MATHEMATICS
  // =========================================================================

  /**
   * Computes locked points and remaining assessment capacity per category and course-wide.
   * Handles weight normalization, empty categories, and excused assignments.
   */
  function calculateLockedAndRemaining(courseData) {
    const { categories = [], weights = {}, assignments = [] } = courseData || {};

    // Support categories passed as either Array of objects or Key-Value map
    let normalizedCategories = [];
    if (Array.isArray(categories)) {
      normalizedCategories = categories;
    } else if (categories && typeof categories === 'object') {
      normalizedCategories = Object.entries(categories).map(([name, weight]) => ({
        name,
        weight: weight <= 1.0 && weight > 0 ? weight * 100 : weight,
        rawWeight: weight <= 1.0 && weight > 0 ? weight * 100 : weight
      }));
    } else if (weights && typeof weights === 'object') {
      normalizedCategories = Object.entries(weights).map(([name, weight]) => ({
        name,
        weight: weight <= 1.0 && weight > 0 ? weight * 100 : weight,
        rawWeight: weight <= 1.0 && weight > 0 ? weight * 100 : weight
      }));
    }

    const hasWeights = normalizedCategories.length > 0;

    // Weight normalization check
    let rawSum = normalizedCategories.reduce((s, c) => s + (c.rawWeight !== undefined ? c.rawWeight : (c.weight || 0)), 0);
    let isDegradedMode = Boolean(courseData?.isDegradedMode);
    let degradedReason = courseData?.degradedReason || '';
    let rawTotalWeight = courseData?.rawTotalWeight !== undefined ? courseData.rawTotalWeight : rawSum;

    if (rawSum > 0 && Math.abs(rawSum - 100) > 0.01) {
      isDegradedMode = true;
      if (!degradedReason) {
        degradedReason = `Estimate only: category weights sum to ${Number(rawSum.toFixed(2))}% (normalized to 100%)`;
      }
    }

    // 1. Group assignments by category
    const categoryStats = {};

    normalizedCategories.forEach((cat) => {
      let effectiveWeight = cat.weight;
      if (rawSum > 0 && Math.abs(rawSum - 100) > 0.01) {
        const rawW = cat.rawWeight !== undefined ? cat.rawWeight : cat.weight;
        effectiveWeight = Number(((rawW / rawSum) * 100).toFixed(4));
      }

      categoryStats[cat.name] = {
        name: cat.name,
        weight: effectiveWeight,
        rawWeight: cat.rawWeight !== undefined ? cat.rawWeight : cat.weight,
        totalPoints: 0,
        completedPoints: 0,
        earnedPoints: 0,
        remainingPoints: 0,
        completedCount: 0,
        remainingCount: 0,
        excusedCount: 0,
        assignments: []
      };
    });

    // Also handle assignments with unknown category if any
    assignments.forEach((a) => {
      const catName = a.category || a.groupName || (normalizedCategories[0]?.name || 'Default');
      if (!categoryStats[catName]) {
        let catWeight = weights[catName] || 0;
        if (rawSum > 0 && Math.abs(rawSum - 100) > 0.01) {
          catWeight = Number(((catWeight / rawSum) * 100).toFixed(4));
        }
        categoryStats[catName] = {
          name: catName,
          weight: catWeight,
          rawWeight: weights[catName] || 0,
          totalPoints: 0,
          completedPoints: 0,
          earnedPoints: 0,
          remainingPoints: 0,
          completedCount: 0,
          remainingCount: 0,
          excusedCount: 0,
          assignments: []
        };
      }

      const st = categoryStats[catName];

      // Exclude excused assignments from points possible denominator so deficit is not inflated
      const isItemExcused = Boolean(a.isExcused || (a.status && /excused/i.test(a.status)) || (a.score && String(a.score).toLowerCase() === 'excused'));
      if (isItemExcused) {
        st.assignments.push({ ...a, isExcused: true });
        st.excusedCount++;
        return;
      }

      st.assignments.push(a);
      st.totalPoints += a.pointsPossible;

      const isDone = a.isCompleted ?? (a.score !== null && !isNaN(a.score));

      if (isDone) {
        st.completedPoints += a.pointsPossible;
        st.earnedPoints += a.score;
        st.completedCount++;
      } else {
        st.remainingPoints += a.pointsPossible;
        st.remainingCount++;
      }
    });

    // 2. Compute locked and remaining contributions per category
    let lockedPercentage = 0;
    let remainingWeight = 0;
    let totalCompletedPoints = 0;
    let totalEarnedPoints = 0;
    let totalRemainingPoints = 0;
    let totalCoursePoints = 0;
    let hasEmptyCategories = false;

    const computedCategories = Object.values(categoryStats).map((st) => {
      totalCompletedPoints += st.completedPoints;
      totalEarnedPoints += st.earnedPoints;
      totalRemainingPoints += st.remainingPoints;
      totalCoursePoints += st.totalPoints;

      let lockedContrib = 0;
      let remainingContrib = 0;
      let categoryCurrentPct = 0;

      if (hasWeights) {
        // Weighted calculation:
        // Guard against empty categories and division by zero
        if (st.totalPoints > 0) {
          lockedContrib = st.weight * (st.earnedPoints / st.totalPoints);
          remainingContrib = st.weight * (st.remainingPoints / st.totalPoints);
        } else {
          // Empty category with weight
          lockedContrib = 0;
          remainingContrib = st.weight;
          if (st.weight > 0) {
            hasEmptyCategories = true;
          }
        }
      } else {
        // Unweighted points-based fallback
        lockedContrib = st.earnedPoints;
        remainingContrib = st.remainingPoints;
      }

      if (st.completedPoints > 0) {
        categoryCurrentPct = (st.earnedPoints / st.completedPoints) * 100;
      }

      lockedPercentage += lockedContrib;
      remainingWeight += remainingContrib;

      return {
        ...st,
        categoryCurrentPct: Number(categoryCurrentPct.toFixed(2)),
        lockedContribution: Number(lockedContrib.toFixed(3)),
        remainingWeight: Number(remainingContrib.toFixed(3)),
        maxContribution: Number((lockedContrib + remainingContrib).toFixed(3))
      };
    });

    // If unweighted, normalize locked percentage by totalCoursePoints
    if (!hasWeights && totalCoursePoints > 0) {
      lockedPercentage = (totalEarnedPoints / totalCoursePoints) * 100;
      remainingWeight = (totalRemainingPoints / totalCoursePoints) * 100;
    }

    lockedPercentage = Number(lockedPercentage.toFixed(2));
    remainingWeight = Number(remainingWeight.toFixed(2));
    const maxPossiblePercentage = Number(Math.min(100, lockedPercentage + remainingWeight).toFixed(2));

    return {
      hasWeights,
      categories: computedCategories,
      lockedPercentage,
      lockedSGPA: percentageToSGPA(lockedPercentage),
      lockedGradePoint: percentageToGradePoint(lockedPercentage, 'ugc'),
      lockedPoints: totalEarnedPoints,
      completedPoints: totalCompletedPoints,
      remainingPoints: totalRemainingPoints,
      totalPoints: totalCoursePoints,
      remainingWeight,
      remainingAssessmentWeight: remainingWeight,
      maxPossiblePercentage,
      maxAttainablePercentage: maxPossiblePercentage,
      maxPossibleSGPA: percentageToSGPA(maxPossiblePercentage),
      isDegradedMode,
      degradedReason,
      rawTotalWeight: Number(rawTotalWeight.toFixed(2)),
      hasEmptyCategories
    };
  }

  /**
   * Forecasts marks required to achieve a target grade (Percentage / SGPA).
   * Supports dual scale (Percentage + 10-point SGPA) and UGC CBCS 10-point bracket scale.
   * Feasibility ceiling, zero-slip margin warnings, and theoretical required marks for unreachable targets.
   * Default target: 80% (8.0 SGPA).
   */
  function calculateForecaster(courseData, targetPercentage = 80) {
    const targetPct = typeof targetPercentage === 'number' ? targetPercentage : parseFloat(targetPercentage) || 80;
    const targetSGPA = percentageToSGPA(targetPct);
    const locked = calculateLockedAndRemaining(courseData);

    const neededPercentage = targetPct - locked.lockedPercentage;
    const isAlreadyAchieved = neededPercentage <= 0;

    // Filter out completed and excused assignments
    const uncompleted = (courseData?.assignments || []).filter((a) => {
      const isDone = Boolean(a.isCompleted || (a.isCompleted === undefined && a.score !== null && !isNaN(a.score)));
      const isExc = Boolean(a.isExcused || (a.status && /excused/i.test(a.status)) || (a.score && String(a.score).toLowerCase() === 'excused'));
      return !isDone && !isExc && a.pointsPossible > 0;
    });

    let isAchievable = neededPercentage <= locked.remainingWeight + 1e-6;
    if (uncompleted.length === 0 && neededPercentage > 0) {
      isAchievable = false;
    }

    let requiredPercentageOnRemaining = 0;
    let requiredMarks = 0;
    let assessmentsForecast = [];
    let unreachableReason = null;
    let theoreticalMarksNeeded = null;
    let isZeroSlipMargin = false;
    let zeroSlipWarning = '';

    if (isAlreadyAchieved) {
      requiredPercentageOnRemaining = 0;
      requiredMarks = 0;
      assessmentsForecast = uncompleted.map((a) => ({
        id: a.id,
        title: a.title,
        category: a.category,
        pointsPossible: a.pointsPossible,
        marksNeeded: 0,
        percentageNeeded: 0,
        weightContribution: 0
      }));
    } else if (!isAchievable || (uncompleted.length === 0 && neededPercentage > 0)) {
      requiredPercentageOnRemaining = null;
      requiredMarks = null;

      // Handle empty categories with no uncompleted assignments posted
      if (uncompleted.length === 0 && neededPercentage > 0) {
        const emptyCat = locked.categories.find((c) => c.totalPoints === 0 && c.weight > 0);
        const catName = emptyCat ? emptyCat.name : 'Unposted Category';
        const catWeight = emptyCat ? emptyCat.weight : locked.remainingWeight;
        unreachableReason = `Category "${catName}" (${catWeight}% weight) has no assessments posted yet. Target requires an average of ${Number(((neededPercentage / locked.remainingWeight) * 100).toFixed(1))}% on future assignments.`;
      } else {
        // Calculate theoretical required marks exceeding 100% capacity
        const theoreticalPace = locked.remainingWeight > 0 ? (neededPercentage / locked.remainingWeight) * 100 : 0;
        assessmentsForecast = uncompleted.map((a) => {
          const aCategory = a.category || a.groupName;
          const aTitle = a.title || a.name;
          const catStat = locked.categories.find((c) => c.name === aCategory);
          let marksNeeded = 0;
          let weightContrib = 0;

          if (locked.hasWeights && catStat && catStat.totalPoints > 0) {
            const weightPerPoint = catStat.weight / catStat.totalPoints;
            if (uncompleted.length === 1) {
              marksNeeded = weightPerPoint > 0 ? neededPercentage / weightPerPoint : 0;
            } else {
              marksNeeded = (theoreticalPace / 100) * a.pointsPossible;
            }
            weightContrib = marksNeeded * weightPerPoint;
          } else {
            marksNeeded = locked.remainingPoints > 0 ? (neededPercentage / locked.remainingPoints) * a.pointsPossible : 0;
          }

          if (Math.abs(marksNeeded - Math.round(marksNeeded)) < 1e-4) {
            marksNeeded = Math.round(marksNeeded);
          } else {
            marksNeeded = Number(marksNeeded.toFixed(2));
          }

          const pctNeeded = a.pointsPossible > 0 ? Number(((marksNeeded / a.pointsPossible) * 100).toFixed(2)) : 100;

          return {
            id: a.id,
            title: aTitle,
            category: aCategory,
            pointsPossible: a.pointsPossible,
            marksNeeded,
            theoreticalMarksNeeded: marksNeeded,
            percentageNeeded: pctNeeded,
            weightContribution: Number(weightContrib.toFixed(2))
          };
        });

        theoreticalMarksNeeded = assessmentsForecast.reduce((sum, item) => sum + item.marksNeeded, 0);
        if (Math.abs(theoreticalMarksNeeded - Math.round(theoreticalMarksNeeded)) < 1e-4) {
          theoreticalMarksNeeded = Math.round(theoreticalMarksNeeded);
        } else {
          theoreticalMarksNeeded = Number(theoreticalMarksNeeded.toFixed(2));
        }

        const pointsBasis = uncompleted.length === 1 ? uncompleted[0].pointsPossible : locked.remainingPoints;
        unreachableReason = `Unreachable (Requires ${theoreticalMarksNeeded} / ${pointsBasis} marks, exceeding 100%)`;
      }
    } else {
      // Achievable target: Calculate uniform percentage needed across remaining assessment weight
      if (locked.remainingWeight > 0) {
        requiredPercentageOnRemaining = (neededPercentage / locked.remainingWeight) * 100;
      }

      assessmentsForecast = uncompleted.map((a) => {
        const aCategory = a.category || a.groupName;
        const aTitle = a.title || a.name;
        const catStat = locked.categories.find((c) => c.name === aCategory);
        let marksNeeded = 0;
        let weightContrib = 0;

        if (locked.hasWeights && catStat && catStat.totalPoints > 0) {
          const weightPerPoint = catStat.weight / catStat.totalPoints;
          if (uncompleted.length === 1) {
            marksNeeded = neededPercentage / weightPerPoint;
          } else {
            marksNeeded = (requiredPercentageOnRemaining / 100) * a.pointsPossible;
          }
          weightContrib = marksNeeded * weightPerPoint;
        } else {
          marksNeeded = (requiredPercentageOnRemaining / 100) * a.pointsPossible;
        }

        if (Math.abs(marksNeeded - Math.round(marksNeeded)) < 1e-4) {
          marksNeeded = Math.round(marksNeeded);
        } else {
          marksNeeded = Number(marksNeeded.toFixed(2));
        }

        return {
          id: a.id,
          title: aTitle,
          category: aCategory,
          pointsPossible: a.pointsPossible,
          marksNeeded,
          percentageNeeded: Number(requiredPercentageOnRemaining.toFixed(2)),
          weightContribution: Number(weightContrib.toFixed(2))
        };
      });

      requiredMarks = assessmentsForecast.reduce((sum, item) => sum + item.marksNeeded, 0);
      if (Math.abs(requiredMarks - Math.round(requiredMarks)) < 1e-4) {
        requiredMarks = Math.round(requiredMarks);
      } else {
        requiredMarks = Number(requiredMarks.toFixed(2));
      }

      // Check Zero-Slip Margin for near-ceiling targets (required pace >= 95.0%)
      if (requiredPercentageOnRemaining >= 95.0) {
        isZeroSlipMargin = true;
        const pointsBasis = uncompleted.length === 1 ? uncompleted[0].pointsPossible : locked.remainingPoints;
        zeroSlipWarning = `⚠️ Zero-slip margin: Requires ${Number(requiredPercentageOnRemaining.toFixed(1))}% (${requiredMarks} / ${pointsBasis} marks) on remaining assessments. Even a minor penalty will prevent achieving this target.`;
      }
    }

    // Precalculate scenarios for standard targets: 75%, 80%, 85%, 90%
    const targetScenarios = {};
    [75, 80, 85, 90].forEach((t) => {
      const needed = t - locked.lockedPercentage;
      const achievable = needed <= locked.remainingWeight + 1e-6;
      const ugcGrade = percentageToUgcGrade(t);

      if (needed <= 0) {
        targetScenarios[t] = {
          targetPercentage: t,
          targetSGPA: percentageToSGPA(t),
          ugcGrade,
          requiredMarks: 0,
          requiredPercentage: 0,
          isAchievable: true,
          isZeroSlipMargin: false
        };
      } else if (!achievable || (uncompleted.length === 0 && needed > 0)) {
        let marks = 0;
        if (uncompleted.length === 1) {
          const catStat = locked.categories.find((c) => c.name === uncompleted[0].category);
          const weightPerPt = catStat ? catStat.weight / catStat.totalPoints : 1;
          marks = needed / weightPerPt;
        } else if (locked.remainingWeight > 0) {
          marks = (needed / locked.remainingWeight) * locked.remainingPoints;
        }
        if (Math.abs(marks - Math.round(marks)) < 1e-4) marks = Math.round(marks);
        else marks = Number(marks.toFixed(2));

        const pointsBasis = uncompleted.length === 1 ? uncompleted[0].pointsPossible : locked.remainingPoints;
        targetScenarios[t] = {
          targetPercentage: t,
          targetSGPA: percentageToSGPA(t),
          ugcGrade,
          requiredMarks: null,
          theoreticalMarksNeeded: marks,
          unreachableReason: `Unreachable (Requires ${marks} / ${pointsBasis} marks, exceeding 100%)`,
          requiredPercentage: null,
          isAchievable: false,
          isZeroSlipMargin: false
        };
      } else {
        let marks = 0;
        let pct = (needed / locked.remainingWeight) * 100;
        if (uncompleted.length === 1) {
          const catStat = locked.categories.find((c) => c.name === uncompleted[0].category);
          const weightPerPt = catStat ? catStat.weight / catStat.totalPoints : 1;
          marks = needed / weightPerPt;
        } else {
          marks = (pct / 100) * locked.remainingPoints;
        }
        if (Math.abs(marks - Math.round(marks)) < 1e-4) marks = Math.round(marks);
        else marks = Number(marks.toFixed(2));
        targetScenarios[t] = {
          targetPercentage: t,
          targetSGPA: percentageToSGPA(t),
          ugcGrade,
          requiredMarks: marks,
          requiredPercentage: Number(pct.toFixed(2)),
          isAchievable: true,
          isZeroSlipMargin: pct >= 95.0
        };
      }
    });

    return {
      targetPercentage: targetPct,
      targetSGPA,
      lockedPercentage: locked.lockedPercentage,
      lockedSGPA: locked.lockedSGPA,
      lockedGradePoint: locked.lockedGradePoint,
      lockedPoints: locked.lockedPoints,
      completedPoints: locked.completedPoints,
      remainingPoints: locked.remainingPoints,
      totalPoints: locked.totalPoints,
      remainingWeight: locked.remainingWeight,
      maxPossiblePercentage: locked.maxPossiblePercentage,
      maxAttainablePercentage: locked.maxPossiblePercentage,
      maxPossibleSGPA: locked.maxPossibleSGPA,
      isAchievable,
      isAttainable: isAchievable,
      isAlreadyAchieved,
      requiredPercentageOnRemaining: requiredPercentageOnRemaining !== null ? Number(requiredPercentageOnRemaining.toFixed(2)) : null,
      requiredMarks,
      theoreticalMarksNeeded,
      theoreticalRequiredMarks: theoreticalMarksNeeded,
      unreachableReason,
      isZeroSlipMargin,
      zeroSlipWarning,
      isDegradedMode: locked.isDegradedMode,
      degradedReason: locked.degradedReason,
      hasEmptyCategories: locked.hasEmptyCategories,
      targetUgcGrade: percentageToUgcGrade(targetPct),
      lockedUgcGrade: percentageToUgcGrade(locked.lockedPercentage),
      marksNeeded: requiredMarks,
      pointsNeeded: requiredMarks,
      minimumMarksRequired: requiredMarks,
      assessments: assessmentsForecast,
      uncompletedAssessments: assessmentsForecast,
      categories: locked.categories,
      targetScenarios
    };
  }

  /**
   * Helper function returning minimum marks required on uncompleted assessments.
   */
  function calculateMinimumRequiredMarks(courseData, targetPercentage = 80) {
    const forecast = calculateForecaster(courseData, targetPercentage);
    return forecast.requiredMarks;
  }

  // Alias
  const calculateMinimumMarksRequired = calculateMinimumRequiredMarks;

  // =========================================================================
  // 2B. CROSS-COURSE PERSISTENCE & SEMESTER SGPA FORECASTER
  // =========================================================================

  /**
   * Standard credits for Semester 1 courses at Rishihood University.
   */
  const DEFAULT_RISHIHOOD_CREDITS = {
    'CSD02C1001': 4, // Mathematics-I
    'CSD02C1002': 4, // Problem Solving and Programming (PSP)
    'CSD02C1003': 3, // Web Application Development - I (WAD)
    'CSD02C1004': 3, // Computer fundamentals and networking (CFN)
    'RSPRFC1003': 2, // Social Communication I
    'RSPRFC1001': 2, // Understanding India
    'KPMG01': 2,     // KPMG/Edept Workshop
    'RSPRFC1002': 2  // Self and Society I
  };

  /**
   * Default Rishihood curriculum courses for Multi-Course SGPA Forecaster baseline.
   */
  const DEFAULT_SEMESTER_COURSES = [
    { code: 'CSD02C1001', name: 'Mathematics-I', credits: 4, lockedPercentage: 52.0, maxPossiblePercentage: 92.0, targetPercentage: 80 },
    { code: 'CSD02C1002', name: 'Problem Solving and Programming (PSP)', credits: 4, lockedPercentage: 65.0, maxPossiblePercentage: 95.0, targetPercentage: 85 },
    { code: 'CSD02C1003', name: 'Web Application Development - I (WAD)', credits: 3, lockedPercentage: 70.0, maxPossiblePercentage: 100.0, targetPercentage: 85 },
    { code: 'CSD02C1004', name: 'Computer fundamentals and networking (CFN)', credits: 3, lockedPercentage: 60.0, maxPossiblePercentage: 90.0, targetPercentage: 80 },
    { code: 'RSPRFC1003', name: 'Social Communication I', credits: 2, lockedPercentage: 75.0, maxPossiblePercentage: 95.0, targetPercentage: 80 },
    { code: 'RSPRFC1001', name: 'Understanding India', credits: 2, lockedPercentage: 80.0, maxPossiblePercentage: 100.0, targetPercentage: 85 },
    { code: 'KPMG01', name: 'KPMG/Edept Workshop', credits: 2, lockedPercentage: 85.0, maxPossiblePercentage: 95.0, targetPercentage: 85 },
    { code: 'RSPRFC1002', name: 'Self and Society I', credits: 2, lockedPercentage: 70.0, maxPossiblePercentage: 90.0, targetPercentage: 80 }
  ];

  /**
   * Resolves default credits based on course code and title keywords.
   */
  function getDefaultCredits(courseCode = '', courseTitle = '') {
    const code = cleanText(courseCode).toUpperCase();
    const title = cleanText(courseTitle).toLowerCase();

    if (DEFAULT_RISHIHOOD_CREDITS[code]) {
      return DEFAULT_RISHIHOOD_CREDITS[code];
    }

    if (/math/i.test(code) || /math/i.test(title)) return 4;
    if (/psp/i.test(code) || /problem\s*solving/i.test(title) || /programming/i.test(title)) return 4;
    if (/wad/i.test(code) || /web\s*app/i.test(title)) return 3;
    if (/cfn/i.test(code) || /network/i.test(title) || /fundamental/i.test(title)) return 3;
    if (/social/i.test(code) || /communication/i.test(title)) return 2;
    if (/india/i.test(code) || /understanding\s*india/i.test(title)) return 2;
    if (/kpmg/i.test(code) || /edept/i.test(title) || /workshop/i.test(title)) return 2;
    if (/self/i.test(code) || /society/i.test(title)) return 2;

    return 3;
  }

  /**
   * Builds standardized course grade metrics object for cross-course persistence.
   * Attaches scrapedAt timestamp, courseId, and UGC grade info.
   */
  function buildCourseGradeMetrics(courseData, forecast, userCredits = null) {
    const code = courseData?.course?.courseCode || courseData?.course?.code || 'CSD02C1001';
    const name = courseData?.course?.courseTitle || courseData?.course?.name || courseData?.course?.title || 'Mathematics-I';
    const courseId = courseData?.course?.courseId || '';
    const credits = (userCredits !== null && userCredits !== undefined && !isNaN(Number(userCredits)) && Number(userCredits) > 0)
      ? Number(userCredits)
      : getDefaultCredits(code, name);

    const lockedPercentage = forecast ? forecast.lockedPercentage : 0;
    const maxPossiblePercentage = forecast ? forecast.maxPossiblePercentage : 100;
    const targetPercentage = forecast ? forecast.targetPercentage : 80;
    const isDegradedMode = Boolean(courseData?.isDegradedMode || forecast?.isDegradedMode);
    const degradedReason = courseData?.degradedReason || forecast?.degradedReason || '';
    const nowIso = new Date().toISOString();

    return {
      code,
      name,
      courseCode: code,
      courseTitle: name,
      courseId,
      lockedPercentage: Number(lockedPercentage.toFixed(2)),
      currentPercentage: Number(lockedPercentage.toFixed(2)),
      lockedWeight: Number(lockedPercentage.toFixed(2)),
      lockedSGPA: percentageToSGPA(lockedPercentage),
      lockedGradePoint: percentageToGradePoint(lockedPercentage, 'ugc'),
      ugcGrade: percentageToUgcGrade(lockedPercentage),
      maxPossiblePercentage: Number(maxPossiblePercentage.toFixed(2)),
      maxAttainable: Number(maxPossiblePercentage.toFixed(2)),
      maxPossibleSGPA: percentageToSGPA(maxPossiblePercentage),
      targetPercentage: Number(targetPercentage.toFixed(2)),
      targetSGPA: percentageToSGPA(targetPercentage),
      credits,
      remainingWeight: forecast ? forecast.remainingWeight : 0,
      requiredMarks: forecast ? forecast.requiredMarks : 0,
      isDegradedMode,
      degradedReason,
      scrapedAt: nowIso,
      updatedAt: nowIso
    };
  }

  /**
   * Persists scraped course grade metrics into chrome.storage.local under canvas_courses_grades.
   */
  function saveCourseGradeMetrics(courseData, forecast, options = {}) {
    const metrics = buildCourseGradeMetrics(courseData, forecast, options.credits);
    const storage = options.storage || (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local ? chrome.storage.local : null);

    if (!storage) {
      if (typeof localStorage !== 'undefined') {
        try {
          const raw = localStorage.getItem('bunkr_canvas_courses_grades') || '{}';
          const parsed = JSON.parse(raw);
          parsed[metrics.code] = metrics;
          localStorage.setItem('bunkr_canvas_courses_grades', JSON.stringify(parsed));
        } catch (e) {}
      }
      return Promise.resolve({ success: true, metrics, store: { [metrics.code]: metrics } });
    }

    return new Promise((resolve) => {
      storage.get(['canvas_courses_grades'], (res) => {
        let store = res && res.canvas_courses_grades ? res.canvas_courses_grades : {};
        if (Array.isArray(store)) {
          const map = {};
          store.forEach((item) => { if (item && item.code) map[item.code] = item; });
          store = map;
        } else {
          store = { ...store };
        }
        store[metrics.code] = metrics;

        storage.set({ canvas_courses_grades: store }, () => {
          resolve({ success: true, metrics, store });
        });
      });
    });
  }

  /**
   * Helper to normalize an array or dictionary of courses into standardized format.
   * Supports UGC CBCS scale vs Linear scale, custom credit overrides, and course ID keying.
   */
  function normalizeCoursesList(courses, options = {}) {
    if (!courses) return [];
    let list = [];
    if (Array.isArray(courses)) {
      list = courses;
    } else if (typeof courses === 'object') {
      list = Object.values(courses);
    }

    const scale = (typeof options === 'string' ? options : options?.scale) || 'linear';
    const customCredits = options?.customCredits || options?.custom_course_credits || {};

    return list.map((c) => {
      const code = c.code || c.courseCode || c.id || '';
      const name = c.name || c.courseTitle || c.title || code;
      const courseId = c.courseId || '';
      const courseKey = courseId ? `canvas_${courseId}` : code;

      const credits = (customCredits && (customCredits[courseKey] || customCredits[code])) ||
        (typeof c.credits === 'number' && !isNaN(c.credits) && c.credits > 0
          ? c.credits
          : getDefaultCredits(code, name));

      let lockedPct = 0;
      if (typeof c.lockedPercentage === 'number' && !isNaN(c.lockedPercentage)) {
        lockedPct = c.lockedPercentage;
      } else if (typeof c.percentage === 'number' && !isNaN(c.percentage)) {
        lockedPct = c.percentage;
      } else if (typeof c.scorePct === 'number' && !isNaN(c.scorePct)) {
        lockedPct = c.scorePct;
      } else if (typeof c.lockedSGPA === 'number' && !isNaN(c.lockedSGPA)) {
        lockedPct = c.lockedSGPA * 10;
      } else if (typeof c.courseSGPA === 'number' && !isNaN(c.courseSGPA)) {
        lockedPct = c.courseSGPA * 10;
      } else if (typeof c.sgpa === 'number' && !isNaN(c.sgpa)) {
        lockedPct = c.sgpa * 10;
      }

      let lockedSGPA = 0;
      if (scale === 'ugc') {
        if (typeof c.lockedPercentage === 'number') {
          lockedSGPA = percentageToGradePoint(c.lockedPercentage, 'ugc');
        } else if (typeof c.lockedSGPA === 'number' && !isNaN(c.lockedSGPA)) {
          lockedSGPA = percentageToGradePoint(c.lockedSGPA * 10, 'ugc');
        } else if (typeof c.courseSGPA === 'number' && !isNaN(c.courseSGPA)) {
          lockedSGPA = percentageToGradePoint(c.courseSGPA * 10, 'ugc');
        } else {
          lockedSGPA = percentageToGradePoint(lockedPct, 'ugc');
        }
      } else {
        // scale === 'linear'
        if (typeof c.lockedSGPA === 'number' && !isNaN(c.lockedSGPA)) {
          lockedSGPA = c.lockedSGPA;
        } else if (typeof c.courseSGPA === 'number' && !isNaN(c.courseSGPA)) {
          lockedSGPA = c.courseSGPA;
        } else if (typeof c.sgpa === 'number' && !isNaN(c.sgpa)) {
          lockedSGPA = c.sgpa;
        } else {
          lockedSGPA = percentageToGradePoint(lockedPct, 'linear');
        }
      }

      let maxPct = 100;
      if (typeof c.maxPossiblePercentage === 'number' && !isNaN(c.maxPossiblePercentage)) {
        maxPct = c.maxPossiblePercentage;
      } else if (typeof c.maxPossibleSGPA === 'number' && !isNaN(c.maxPossibleSGPA)) {
        maxPct = c.maxPossibleSGPA * 10;
      } else {
        maxPct = 100;
      }

      let maxSGPA = 0;
      if (scale === 'ugc') {
        maxSGPA = percentageToGradePoint(maxPct, 'ugc');
      } else {
        maxSGPA = typeof c.maxPossibleSGPA === 'number' && !isNaN(c.maxPossibleSGPA)
          ? c.maxPossibleSGPA
          : percentageToGradePoint(maxPct, 'linear');
      }

      let targetPct = 80;
      if (typeof c.targetPercentage === 'number' && !isNaN(c.targetPercentage)) {
        targetPct = c.targetPercentage;
      } else if (typeof c.targetSGPA === 'number' && !isNaN(c.targetSGPA)) {
        targetPct = c.targetSGPA * 10;
      }

      let targetSGPA = 0;
      if (scale === 'ugc') {
        targetSGPA = percentageToGradePoint(targetPct, 'ugc');
      } else {
        targetSGPA = typeof c.targetSGPA === 'number' && !isNaN(c.targetSGPA)
          ? c.targetSGPA
          : percentageToGradePoint(targetPct, 'linear');
      }

      return {
        code,
        name,
        courseCode: code,
        courseTitle: name,
        courseId,
        courseKey,
        credits,
        lockedPercentage: Number(lockedPct.toFixed(2)),
        lockedSGPA: Number(lockedSGPA.toFixed(2)),
        courseSGPA: Number(lockedSGPA.toFixed(2)),
        gradePoint: lockedSGPA,
        ugcGrade: percentageToUgcGrade(lockedPct),
        maxPossiblePercentage: Number(maxPct.toFixed(2)),
        maxPossibleSGPA: Number(maxSGPA.toFixed(2)),
        targetPercentage: Number(targetPct.toFixed(2)),
        targetSGPA: Number(targetSGPA.toFixed(2)),
        remainingWeight: Number(Math.max(0, maxPct - lockedPct).toFixed(2))
      };
    });
  }

  /**
   * Computes credit-weighted SGPA:
   * SGPA = sum(Course SGPA * Credits) / sum(Credits)
   * Supports scale option ('ugc' or 'linear').
   */
  function calculateCreditWeightedSGPA(courses, options = {}) {
    const opts = typeof options === 'string' ? { scale: options } : (options || {});
    const scale = opts.scale || 'linear';
    const list = normalizeCoursesList(courses, opts);

    if (list.length === 0) {
      return {
        totalCredits: 0,
        currentSGPA: 0,
        currentPercentage: 0,
        lockedSGPA: 0,
        lockedPercentage: 0,
        maxPossibleSGPA: 0,
        maxPossiblePercentage: 0,
        targetSGPA: 0,
        targetPercentage: 0,
        scale,
        courses: []
      };
    }

    let totalCredits = 0;
    let sumLockedWeightedSGPA = 0;
    let sumMaxWeightedSGPA = 0;
    let sumTargetWeightedSGPA = 0;

    list.forEach((c) => {
      totalCredits += c.credits;
      sumLockedWeightedSGPA += c.lockedSGPA * c.credits;
      sumMaxWeightedSGPA += c.maxPossibleSGPA * c.credits;
      sumTargetWeightedSGPA += c.targetSGPA * c.credits;
    });

    const currentSGPA = totalCredits > 0 ? Number((sumLockedWeightedSGPA / totalCredits).toFixed(2)) : 0;
    const maxPossibleSGPA = totalCredits > 0 ? Number((sumMaxWeightedSGPA / totalCredits).toFixed(2)) : 0;
    const targetSGPA = totalCredits > 0 ? Number((sumTargetWeightedSGPA / totalCredits).toFixed(2)) : 0;

    return {
      totalCredits,
      currentSGPA,
      currentPercentage: Number((currentSGPA * 10).toFixed(2)),
      lockedSGPA: currentSGPA,
      lockedPercentage: Number((currentSGPA * 10).toFixed(2)),
      maxPossibleSGPA,
      maxPossiblePercentage: Number((maxPossibleSGPA * 10).toFixed(2)),
      targetSGPA,
      targetPercentage: Number((targetSGPA * 10).toFixed(2)),
      scale,
      courses: list
    };
  }

  /**
   * Alias: calculateOverallSGPA using UGC CBCS grade points by default.
   */
  function calculateOverallSGPA(courses, options = {}) {
    const opts = typeof options === 'string' ? { scale: options } : { scale: 'ugc', ...(options || {}) };
    return calculateCreditWeightedSGPA(courses, opts);
  }

  /**
   * Interactive Target SGPA Simulator:
   * Computes required pace and scores across remaining assessments to hit desired Target SGPA.
   * Supports feasibility ceiling and zero-slip margin detection.
   */
  function simulateTargetSGPA(courses, targetSGPA = 8.0, options = {}) {
    const opts = typeof options === 'string' ? { scale: options } : (options || {});
    const scale = opts.scale || 'linear';
    const desiredSGPA = typeof targetSGPA === 'number' ? targetSGPA : (parseFloat(targetSGPA) || 8.0);
    const desiredPercentage = Number((desiredSGPA * 10).toFixed(2));

    const weighted = calculateCreditWeightedSGPA(courses, opts);
    const { totalCredits, currentSGPA, maxPossibleSGPA, courses: list } = weighted;

    if (totalCredits === 0) {
      return {
        targetSGPA: desiredSGPA,
        targetPercentage: desiredPercentage,
        totalCredits: 0,
        currentSGPA: 0,
        maxPossibleSGPA: 0,
        isAchievable: false,
        isAlreadyAchieved: false,
        requiredPaceOnRemaining: null,
        coursesForecast: [],
        courses: []
      };
    }

    const targetPoints = desiredSGPA * totalCredits;
    const lockedPoints = currentSGPA * totalCredits;
    const maxPoints = maxPossibleSGPA * totalCredits;

    const neededPoints = targetPoints - lockedPoints;
    const remainingCapacity = maxPoints - lockedPoints;

    const isAlreadyAchieved = neededPoints <= 1e-6;
    const isAchievable = neededPoints <= remainingCapacity + 1e-6;

    let requiredPaceOnRemaining = 0;
    let isZeroSlipMargin = false;
    let zeroSlipWarning = '';
    let unreachableReason = null;
    let theoreticalPaceOnRemaining = null;

    if (isAlreadyAchieved) {
      requiredPaceOnRemaining = 0;
    } else if (!isAchievable) {
      requiredPaceOnRemaining = null;
      theoreticalPaceOnRemaining = remainingCapacity > 0
        ? Number(((neededPoints / remainingCapacity) * 100).toFixed(2))
        : null;
      unreachableReason = theoreticalPaceOnRemaining !== null
        ? `Unreachable (Requires ${theoreticalPaceOnRemaining}% pace across remaining assessments, exceeding 100%)`
        : `Unreachable (Target ${desiredSGPA} SGPA exceeds maximum achievable ${maxPossibleSGPA} SGPA)`;
    } else {
      requiredPaceOnRemaining = remainingCapacity > 0
        ? Number(((neededPoints / remainingCapacity) * 100).toFixed(2))
        : 0;

      if (requiredPaceOnRemaining >= 95.0) {
        isZeroSlipMargin = true;
        zeroSlipWarning = `⚠️ Zero-slip margin: Requires ${requiredPaceOnRemaining}% pace across remaining assessments. Even a minor penalty will prevent achieving this target.`;
      }
    }

    const coursesForecast = list.map((c) => {
      const remainingPct = c.remainingWeight;

      let neededCoursePct = 0;
      let neededCourseSGPA = 0;
      let neededPctOnRemaining = 0;

      if (isAlreadyAchieved) {
        neededCoursePct = c.lockedPercentage;
        neededCourseSGPA = c.lockedSGPA;
        neededPctOnRemaining = 0;
      } else if (!isAchievable) {
        neededCoursePct = c.maxPossiblePercentage;
        neededCourseSGPA = c.maxPossibleSGPA;
        neededPctOnRemaining = theoreticalPaceOnRemaining !== null ? theoreticalPaceOnRemaining : 100;
      } else {
        neededPctOnRemaining = requiredPaceOnRemaining;
        neededCoursePct = c.lockedPercentage + (requiredPaceOnRemaining / 100) * remainingPct;
        neededCoursePct = Number(Math.min(c.maxPossiblePercentage, neededCoursePct).toFixed(2));
        neededCourseSGPA = percentageToGradePoint(neededCoursePct, scale);
      }

      return {
        code: c.code,
        name: c.name,
        courseCode: c.code,
        courseTitle: c.name,
        courseId: c.courseId,
        courseKey: c.courseKey,
        credits: c.credits,
        lockedPercentage: c.lockedPercentage,
        lockedSGPA: c.lockedSGPA,
        maxPossiblePercentage: c.maxPossiblePercentage,
        maxPossibleSGPA: c.maxPossibleSGPA,
        remainingWeight: remainingPct,
        neededCoursePercentage: neededCoursePct,
        neededCourseSGPA,
        neededPercentageOnRemaining: neededPctOnRemaining,
        isFullyLocked: remainingPct <= 1e-4,
        isAchievable: isAchievable
      };
    });

    return {
      targetSGPA: desiredSGPA,
      targetPercentage: desiredPercentage,
      totalCredits,
      currentSGPA,
      currentPercentage: weighted.currentPercentage,
      lockedSGPA: currentSGPA,
      lockedPercentage: weighted.currentPercentage,
      maxPossibleSGPA,
      maxPossiblePercentage: weighted.maxPossiblePercentage,
      maxAttainableSGPA: maxPossibleSGPA,
      isAchievable,
      isAttainable: isAchievable,
      isAlreadyAchieved,
      requiredPaceOnRemaining,
      theoreticalPaceOnRemaining,
      unreachableReason,
      isZeroSlipMargin,
      zeroSlipWarning,
      scale,
      coursesForecast,
      courses: coursesForecast
    };
  }

  // =========================================================================
  // 3. NON-DESTRUCTIVE NATIVE CANVAS UI INJECTION
  // =========================================================================

  const STYLES = `
    #bunkr-grades-forecaster-banner {
      background: #FFFFFF;
      border: 1px solid #C7CDD1;
      border-radius: 8px;
      margin: 16px 0 24px 0;
      padding: 20px;
      font-family: "LatoWeb", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #2D3B45;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
      box-sizing: border-box;
      max-width: 100%;
    }
    .bunkr-banner-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1px solid #E2E8F0;
      padding-bottom: 14px;
      margin-bottom: 16px;
      flex-wrap: wrap;
      gap: 12px;
    }
    .bunkr-title-group h2 {
      margin: 0 0 4px 0;
      font-size: 19px;
      font-weight: 700;
      color: #1E293B;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .bunkr-title-group .bunkr-subtitle {
      font-size: 13px;
      color: #64748B;
      font-weight: 500;
    }
    .bunkr-stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 12px;
      margin-bottom: 18px;
    }
    .bunkr-stat-card {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 6px;
      padding: 10px 14px;
      text-align: center;
    }
    .bunkr-stat-label {
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 700;
      color: #64748B;
      letter-spacing: 0.04em;
      margin-bottom: 4px;
    }
    .bunkr-stat-val {
      font-size: 18px;
      font-weight: 800;
      color: #0F172A;
    }
    .bunkr-stat-sub {
      font-size: 11px;
      color: #008EE2;
      font-weight: 600;
    }
    .bunkr-controls-section {
      background: #F0F9FF;
      border: 1px solid #BAE6FD;
      border-radius: 6px;
      padding: 14px 16px;
      margin-bottom: 18px;
    }
    .bunkr-controls-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      flex-wrap: wrap;
      gap: 8px;
    }
    .bunkr-controls-header span {
      font-size: 13px;
      font-weight: 700;
      color: #0369A1;
    }
    .bunkr-btn-group {
      display: flex;
      gap: 6px;
    }
    .bunkr-target-btn {
      background: #FFFFFF;
      border: 1px solid #0284C7;
      color: #0284C7;
      padding: 4px 10px;
      font-size: 12px;
      font-weight: 700;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .bunkr-target-btn:hover {
      background: #E0F2FE;
    }
    .bunkr-target-btn.active {
      background: #008EE2;
      color: #FFFFFF;
      border-color: #008EE2;
    }
    .bunkr-slider-row {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .bunkr-slider-row input[type="range"] {
      flex: 1;
      height: 6px;
      accent-color: #008EE2;
      cursor: pointer;
    }
    .bunkr-slider-badge {
      min-width: 120px;
      text-align: right;
      font-size: 13px;
      font-weight: 800;
      color: #0284C7;
    }
    .bunkr-callout-box {
      border-radius: 6px;
      padding: 12px 16px;
      font-size: 14px;
      line-height: 1.5;
      margin-bottom: 18px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .bunkr-callout-box.achieved {
      background: #ECFDF5;
      border: 1px solid #A7F3D0;
      color: #065F46;
    }
    .bunkr-callout-box.needed {
      background: #EFF6FF;
      border: 1px solid #BFDBFE;
      color: #1E40AF;
    }
    .bunkr-callout-box.impossible {
      background: #FEF2F2;
      border: 1px solid #FECACA;
      color: #991B1B;
    }
    .bunkr-categories-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 18px;
    }
    .bunkr-cat-item {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 6px;
      padding: 8px 12px;
    }
    .bunkr-cat-top {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      font-weight: 700;
      margin-bottom: 6px;
      color: #334155;
    }
    .bunkr-progress-bg {
      background: #E2E8F0;
      height: 8px;
      border-radius: 4px;
      overflow: hidden;
      display: flex;
    }
    .bunkr-progress-locked {
      background: #008EE2;
      height: 100%;
    }
    .bunkr-whatif-section {
      border-top: 1px solid #E2E8F0;
      padding-top: 14px;
    }
    .bunkr-whatif-title {
      font-size: 13px;
      font-weight: 700;
      color: #475569;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .bunkr-whatif-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 0;
      font-size: 13px;
    }
    .bunkr-whatif-input {
      width: 70px;
      padding: 4px 8px;
      border: 1px solid #CBD5E1;
      border-radius: 4px;
      text-align: center;
      font-weight: 700;
      font-size: 13px;
    }
    /* Non-breaking Row Badges */
    .bunkr-row-badge {
      display: inline-block !important;
      padding: 2px 7px !important;
      border-radius: 10px !important;
      font-size: 11px !important;
      font-weight: 700 !important;
      white-space: nowrap !important;
      line-height: 1.3 !important;
      margin-left: 6px !important;
      vertical-align: middle !important;
    }
    .bunkr-badge-graded {
      background: #ECFDF5 !important;
      color: #047857 !important;
      border: 1px solid #A7F3D0 !important;
    }
    .bunkr-badge-needed {
      background: #EFF6FF !important;
      color: #1D4ED8 !important;
      border: 1px solid #BFDBFE !important;
    }
    .bunkr-badge-excused {
      background: #F1F5F9 !important;
      color: #475569 !important;
      border: 1px solid #CBD5E1 !important;
    }
    .bunkr-degraded-banner {
      background: #FFFBEB;
      border: 1px solid #FDE68A;
      color: #92400E;
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 14px;
      font-size: 13px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .bunkr-letter-band-rec {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #EEF2FF;
      color: #3730A3;
      border: 1px solid #C7D2FE;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 700;
      margin-left: 8px;
    }
    .bunkr-target-btn.disabled,
    .bunkr-target-btn:disabled {
      opacity: 0.45 !important;
      cursor: not-allowed !important;
      background: #F1F5F9 !important;
      border-color: #CBD5E1 !important;
      color: #94A3B8 !important;
    }
    .bunkr-callout-box.warning {
      background: #FFFBEB;
      border: 1px solid #FCD34D;
      color: #92400E;
    }
    /* Table constraints to prevent right-side spillage */
    table#grades_summary {
      table-layout: auto !important;
      max-width: 100% !important;
      box-sizing: border-box !important;
    }
  `;

  function injectStyles(doc) {
    const d = doc || (typeof document !== 'undefined' ? document : null);
    if (!d || !d.head) return;
    if (d.getElementById('bunkr-canvas-grades-css')) return;

    const style = d.createElement('style');
    style.id = 'bunkr-canvas-grades-css';
    style.textContent = STYLES;
    d.head.appendChild(style);
  }

  /**
   * Renders the Target Grade Forecaster banner above table#grades_summary.
   */
  function renderGradeIntelligenceBanner(container, courseData, targetPercentage = 80, onTargetChange) {
    if (!container) return;

    const forecast = calculateForecaster(courseData, targetPercentage);
    const { course, categories } = courseData;

    let banner = container.querySelector('#bunkr-grades-forecaster-banner');
    if (!banner) {
      banner = container.ownerDocument.createElement('div');
      banner.id = 'bunkr-grades-forecaster-banner';
      container.insertBefore(banner, container.firstChild);
    }

    const maxAttainable = forecast.maxPossiblePercentage;
    const sliderMax = Math.min(100, Math.floor(maxAttainable));
    const sliderVal = Math.min(forecast.targetPercentage, sliderMax);
    const ugcTarget = percentageToUgcGrade(forecast.targetPercentage);

    // Callout box message
    let calloutClass = 'needed';
    let calloutIcon = '🎯';
    let calloutText = '';

    if (forecast.isAlreadyAchieved) {
      calloutClass = 'achieved';
      calloutIcon = '🎉';
      calloutText = `<strong>Target Already Secured!</strong> You have locked in <strong>${forecast.lockedPercentage.toFixed(1)}% (${forecast.lockedSGPA.toFixed(2)} SGPA)</strong>, which meets or exceeds your ${forecast.targetPercentage}% target.`;
    } else if (!forecast.isAchievable) {
      calloutClass = 'impossible';
      calloutIcon = '⚠️';
      calloutText = `<strong>Target Unreachable:</strong> Maximum possible grade is <strong>${forecast.maxPossiblePercentage.toFixed(1)}% (${forecast.maxPossibleSGPA.toFixed(2)} SGPA)</strong>. ${forecast.unreachableReason || ('Even 100% on remaining assessments yields less than ' + forecast.targetPercentage + '%.')}`;
    } else if (forecast.isZeroSlipMargin) {
      calloutClass = 'warning';
      calloutIcon = '⚠️';
      calloutText = `<strong>Zero-Slip Margin Warning:</strong> ${forecast.zeroSlipWarning}`;
    } else {
      calloutClass = 'needed';
      calloutIcon = '🎯';
      if (forecast.assessments.length === 1) {
        const single = forecast.assessments[0];
        calloutText = `To achieve <strong>${forecast.targetPercentage}% (${forecast.targetSGPA.toFixed(1)} SGPA)</strong>: You need minimum <strong>${single.marksNeeded} / ${single.pointsPossible} marks (${single.percentageNeeded}%)</strong> on <strong>${single.title}</strong>.`;
      } else {
        calloutText = `To achieve <strong>${forecast.targetPercentage}% (${forecast.targetSGPA.toFixed(1)} SGPA)</strong>: You need minimum <strong>${forecast.requiredMarks} / ${forecast.remainingPoints} total marks (${forecast.requiredPercentageOnRemaining}%)</strong> across remaining assessments.`;
      }
    }

    // Degraded mode banner HTML if weights != 100%
    const degradedBannerHtml = (courseData.isDegradedMode || forecast.isDegradedMode) ? `
      <div class="bunkr-degraded-banner">
        <span>⚠️ ${courseData.degradedReason || forecast.degradedReason || 'Estimate only: category weights sum to ' + (courseData.rawTotalWeight || 0) + '% (normalized to 100%)'}</span>
      </div>
    ` : '';

    // Quick target buttons with ceiling disabling
    const targetButtonsHtml = [75, 80, 85, 90].map((t) => {
      const isOverCeiling = t > maxAttainable;
      const ugc = percentageToUgcGrade(t);
      const activeCls = forecast.targetPercentage === t ? 'active' : '';
      const disabledCls = isOverCeiling ? 'disabled' : '';
      const disabledAttr = isOverCeiling ? `disabled title="Target ${t}% exceeds maximum attainable ${maxAttainable}%"` : '';
      return `<button class="bunkr-target-btn ${activeCls} ${disabledCls}" data-target="${t}" ${disabledAttr}>${t}% (${ugc.grade})</button>`;
    }).join('');

    // Category progress bars HTML
    const categoriesHtml = (forecast.categories || []).map((cat) => {
      const pct = cat.categoryCurrentPct || 0;
      const lockedVal = cat.lockedContribution || 0;
      const weightVal = cat.weight || 0;
      const barFillPct = weightVal > 0 ? Math.min(100, (lockedVal / weightVal) * 100) : 0;

      return `
        <div class="bunkr-cat-item">
          <div class="bunkr-cat-top">
            <span>${cat.name} (${Number(weightVal.toFixed(1))}% Weight)</span>
            <span>${cat.earnedPoints}/${cat.totalPoints} pts (${pct}%) &rarr; +${lockedVal}% locked</span>
          </div>
          <div class="bunkr-progress-bg">
            <div class="bunkr-progress-locked" style="width: ${barFillPct}%;"></div>
          </div>
        </div>
      `;
    }).join('');

    // What-If rows HTML
    const whatIfRows = (forecast.assessments || []).map((a) => `
      <div class="bunkr-whatif-row">
        <span><strong>${a.title}</strong> (${a.category} &bull; ${a.pointsPossible} pts max)</span>
        <div>
          <span>Target Score: </span>
          <input type="number" class="bunkr-whatif-input" data-id="${a.id}" data-max="${a.pointsPossible}" value="${a.marksNeeded <= a.pointsPossible ? a.marksNeeded : a.pointsPossible}" />
          <span> / ${a.pointsPossible}</span>
        </div>
      </div>
    `).join('');

    banner.innerHTML = `
      ${degradedBannerHtml}
      <div class="bunkr-banner-header">
        <div class="bunkr-title-group">
          <h2>🎓 Canvas Grade & SGPA Intelligence</h2>
          <div class="bunkr-subtitle">${course.courseCode ? `${course.courseCode} &bull; ` : ''}${course.courseTitle}</div>
        </div>
        <div class="bunkr-letter-band-rec">Target: ${ugcTarget.band}</div>
      </div>

      <div class="bunkr-stats-grid">
        <div class="bunkr-stat-card">
          <div class="bunkr-stat-label">Locked Grade</div>
          <div class="bunkr-stat-val">${forecast.lockedPercentage.toFixed(1)}%</div>
          <div class="bunkr-stat-sub">${forecast.lockedSGPA.toFixed(2)} SGPA &bull; Grade ${percentageToUgcGrade(forecast.lockedPercentage).grade}</div>
        </div>
        <div class="bunkr-stat-card">
          <div class="bunkr-stat-label">Target Grade</div>
          <div class="bunkr-stat-val">${forecast.targetPercentage}%</div>
          <div class="bunkr-stat-sub">${forecast.targetSGPA.toFixed(1)} SGPA &bull; Grade ${ugcTarget.grade}</div>
        </div>
        <div class="bunkr-stat-card">
          <div class="bunkr-stat-label">Max Achievable</div>
          <div class="bunkr-stat-val">${forecast.maxPossiblePercentage.toFixed(1)}%</div>
          <div class="bunkr-stat-sub">${forecast.maxPossibleSGPA.toFixed(2)} SGPA &bull; Grade ${percentageToUgcGrade(forecast.maxPossiblePercentage).grade}</div>
        </div>
      </div>

      <div class="bunkr-controls-section">
        <div class="bunkr-controls-header">
          <span>🎯 Select Target Grade & SGPA</span>
          <div class="bunkr-btn-group">
            ${targetButtonsHtml}
          </div>
        </div>
        <div class="bunkr-slider-row">
          <input type="range" id="bunkr-target-slider" min="50" max="${sliderMax}" step="1" value="${sliderVal}" />
          <div class="bunkr-slider-badge" id="bunkr-slider-display">${forecast.targetPercentage}% &bull; ${forecast.targetSGPA.toFixed(1)} SGPA &bull; Grade ${ugcTarget.grade}</div>
        </div>
      </div>

      <div class="bunkr-callout-box ${calloutClass}">
        <span style="font-size: 22px;">${calloutIcon}</span>
        <div>${calloutText}</div>
      </div>

      <div class="bunkr-categories-list">
        <div style="font-size: 12px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.03em;">Category Weights & Breakdown</div>
        ${categoriesHtml}
      </div>

      ${forecast.assessments.length > 0 ? `
        <div class="bunkr-whatif-section">
          <div class="bunkr-whatif-title">🔮 What-If Simulator (Adjust potential marks)</div>
          ${whatIfRows}
        </div>
      ` : ''}
    `;

    // Attach event listeners for buttons and slider
    const btnGroup = banner.querySelectorAll('.bunkr-target-btn:not(:disabled)');
    btnGroup.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const newTarget = parseFloat(e.currentTarget.getAttribute('data-target'));
        if (onTargetChange) onTargetChange(newTarget);
      });
    });

    const slider = banner.querySelector('#bunkr-target-slider');
    if (slider) {
      slider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        const display = banner.querySelector('#bunkr-slider-display');
        if (display) {
          const ugc = percentageToUgcGrade(val);
          display.textContent = `${val}% • ${percentageToSGPA(val).toFixed(1)} SGPA • Grade ${ugc.grade}`;
        }
      });
      slider.addEventListener('change', (e) => {
        const newTarget = parseFloat(e.target.value);
        if (onTargetChange) onTargetChange(newTarget);
      });
    }

    return banner;
  }

  /**
   * Injects non-breaking badges into table#grades_summary rows.
   * Keeps table columns intact and avoids spilling into #right-side.
   */
  function renderRowBadges(doc, courseData, targetPercentage = 80) {
    const d = doc || (typeof document !== 'undefined' ? document : null);
    if (!d) return;

    const forecast = calculateForecaster(courseData, targetPercentage);
    const assignments = courseData.assignments || [];

    assignments.forEach((a) => {
      if (!a.rowElement) return;

      // Clean existing badges
      const oldBadge = a.rowElement.querySelector('.bunkr-row-badge');
      if (oldBadge) oldBadge.remove();

      let targetCell = a.rowElement.querySelector('td.status') ||
                         a.rowElement.querySelector('th.title') ||
                         a.rowElement.querySelector('td.assignment_score');
      if (!targetCell) return;

      const badge = d.createElement('span');
      badge.className = 'bunkr-row-badge';

      if (a.isExcused) {
        badge.classList.add('bunkr-badge-excused');
        badge.textContent = '🎯 Excused (Excluded from grade)';
      } else if (a.isCompleted) {
        badge.classList.add('bunkr-badge-graded');
        const pct = a.percentage !== null ? a.percentage.toFixed(0) : 100;
        badge.textContent = `Score: ${a.score}/${a.pointsPossible} (${pct}%)`;
      } else {
        badge.classList.add('bunkr-badge-needed');
        const itemForecast = forecast.assessments.find((f) => f.id === a.id);
        const needed = itemForecast ? itemForecast.marksNeeded : '?';
        badge.textContent = `🎯 Need ${needed}/${a.pointsPossible}`;
      }

      targetCell.appendChild(badge);
    });
  }

  // =========================================================================
  // 4. MAIN ORCHESTRATOR & ENTRY POINT
  // =========================================================================

  let currentTargetPercentage = 80;

  function init(options = {}) {
    const d = options.doc || (typeof document !== 'undefined' ? document : null);
    if (!d) return null;

    if (typeof options.targetPercentage === 'number') {
      currentTargetPercentage = options.targetPercentage;
    }

    const table = d.querySelector('table#grades_summary, #grades_summary');
    if (!table) return null;

    injectStyles(d);

    const courseData = scrapeGradebook(d);

    const container = table.parentElement || table.parentNode;
    if (container) {
      renderGradeIntelligenceBanner(container, courseData, currentTargetPercentage, (newTarget) => {
        currentTargetPercentage = newTarget;
        init({ doc: d, targetPercentage: newTarget });
      });
    }

    renderRowBadges(d, courseData, currentTargetPercentage);

    const forecast = calculateForecaster(courseData, currentTargetPercentage);

    // Cross-course Persistence: Save course metrics to chrome.storage.local under canvas_courses_grades
    try {
      saveCourseGradeMetrics(courseData, forecast, options);
    } catch (e) {
      // safe fallback if storage fails
    }

    return {
      courseData,
      forecast,
      targetPercentage: currentTargetPercentage
    };
  }

  const api = {
    // Utility math & scales
    percentageToGradePoint,
    percentageToUgcGrade,
    percentageToSGPA,
    sgpaToPercentage,
    getLetterGrade,

    // Gradebook scraping
    parseCourseHeader,
    parseCategoryWeights,
    parseAssignmentRows,
    scrapeGradebook,

    // Forecaster algorithms
    calculateLockedAndRemaining,
    calculateForecaster,
    calculateMinimumRequiredMarks,
    calculateMinimumMarksRequired,

    // Multi-Course Credits & SGPA Forecaster
    DEFAULT_RISHIHOOD_CREDITS,
    DEFAULT_SEMESTER_COURSES,
    getDefaultCredits,
    buildCourseGradeMetrics,
    saveCourseGradeMetrics,
    normalizeCoursesList,
    calculateCreditWeightedSGPA,
    calculateOverallSGPA,
    simulateTargetSGPA,

    // UI rendering
    injectStyles,
    renderGradeIntelligenceBanner,
    renderRowBadges,

    // Main orchestrator
    init,
    run: init
  };

  api.CanvasGrades = api;
  return api;
});
