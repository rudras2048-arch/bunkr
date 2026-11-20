// Bunkr 2.4.2 - Canvas Assignment & Submission Radar Engine
// Real-time Deadline Radar, Urgency Categorization, iCal (.ics) Sync with 1h/24h Alerts & Native Canvas UI

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const exported = factory();
    module.exports = exported;
    // Export named properties on module.exports for convenient destructuring
    if (exported && typeof exported === 'object') {
      Object.assign(module.exports, exported);
    }
  } else {
    const exported = factory();
    root.CanvasAssignments = exported;
    root.BunkrCanvasAssignments = exported;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /**
   * Month name lookup dictionary
   */
  const MONTHS = {
    jan: 0, january: 0,
    feb: 1, february: 1,
    mar: 2, march: 2,
    apr: 3, april: 3,
    may: 4,
    jun: 5, june: 5,
    jul: 6, july: 6,
    aug: 7, august: 7,
    sep: 8, sept: 8, september: 8,
    oct: 9, october: 9,
    nov: 10, november: 10,
    dec: 11, december: 11
  };

  /**
   * Day of week lookup dictionary
   */
  const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  /**
   * Strip HTML tags and normalize extra whitespace
   */
  function cleanText(text) {
    if (!text) return '';
    return String(text)
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Parse Canvas date strings into a JavaScript Date object
   * Supports:
   *  - ISO timestamps ("2026-11-19T23:59:00Z", "2026-11-19 23:59:00")
   *  - Canvas format: "Nov 18 by 11:59pm", "Due Nov 19 at 8pm", "Nov 19, 2026 at 11:59pm"
   *  - Relative strings: "Today at 11:59pm", "Tomorrow by 5pm", "Yesterday at 8:00am"
   *  - Raw Date or numeric timestamp
   */
  function parseCanvasDate(input, referenceDate) {
    if (!input) return null;
    if (input instanceof Date) {
      return isNaN(input.getTime()) ? null : input;
    }
    if (typeof input === 'number') {
      const d = new Date(input);
      return isNaN(d.getTime()) ? null : d;
    }

    const ref = referenceDate instanceof Date ? new Date(referenceDate.getTime()) : new Date();
    let text = cleanText(String(input));

    if (!text || text === '-' || /^(no due date|none|n\/a)$/i.test(text)) {
      return null;
    }

    // 1. Direct ISO Date parsing
    if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
      const parsedIso = new Date(text);
      if (!isNaN(parsedIso.getTime())) return parsedIso;
    }

    // 2. Clean leading prefixes like "Due", "Due:", "by", "at", "|"
    text = text.replace(/^due\s*[:\-–]?\s*/i, '');
    text = text.replace(/\s*\|\s*.*$/, ''); // strip trailing points like "| 10 pts"

    // 3. Check for relative dates ("Today", "Tomorrow", "Yesterday")
    let targetYear = ref.getFullYear();
    let targetMonth = ref.getMonth();
    let targetDay = ref.getDate();

    const lower = text.toLowerCase();
    let isRelative = false;

    if (lower.includes('today') || lower.includes('tonight')) {
      isRelative = true;
      // keep ref day
    } else if (lower.includes('tomorrow')) {
      isRelative = true;
      const tomorrow = new Date(ref.getTime() + 24 * 3600 * 1000);
      targetYear = tomorrow.getFullYear();
      targetMonth = tomorrow.getMonth();
      targetDay = tomorrow.getDate();
    } else if (lower.includes('yesterday')) {
      isRelative = true;
      const yesterday = new Date(ref.getTime() - 24 * 3600 * 1000);
      targetYear = yesterday.getFullYear();
      targetMonth = yesterday.getMonth();
      targetDay = yesterday.getDate();
    }

    // 4. Extract time component (e.g. "11:59pm", "8pm", "23:59", "5:00 PM")
    let hours = 23;
    let minutes = 59;
    let seconds = 0;

    const timeMatch = text.match(/(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?\s*(am|pm)?/i);
    // Find time in string if "at" or "by" precedes it, or at end
    const specificTimeMatch = text.match(/(?:at|by|,)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i) || timeMatch;

    if (specificTimeMatch) {
      let rawH = parseInt(specificTimeMatch[1], 10);
      let rawM = specificTimeMatch[2] ? parseInt(specificTimeMatch[2], 10) : 0;
      let ampm = specificTimeMatch[3] ? specificTimeMatch[3].toLowerCase() : null;

      if (ampm === 'pm' && rawH < 12) rawH += 12;
      if (ampm === 'am' && rawH === 12) rawH = 0;

      if (!isNaN(rawH) && rawH >= 0 && rawH <= 23) hours = rawH;
      if (!isNaN(rawM) && rawM >= 0 && rawM <= 59) minutes = rawM;
    }

    if (isRelative) {
      return new Date(targetYear, targetMonth, targetDay, hours, minutes, seconds);
    }

    // 5. Standard date format: "Nov 19", "Nov 19, 2026", "19 Nov 2026", "November 19"
    const monthNameMatch = text.match(/\b([A-Za-z]{3,9})\b/);
    const dayMatch = text.match(/\b(\d{1,2})(?:st|nd|rd|th)?\b/);
    const yearMatch = text.match(/\b(20\d{2})\b/);

    if (monthNameMatch && dayMatch) {
      const monthKey = monthNameMatch[1].toLowerCase();
      if (MONTHS[monthKey] !== undefined) {
        targetMonth = MONTHS[monthKey];
        targetDay = parseInt(dayMatch[1], 10);
        if (yearMatch) {
          targetYear = parseInt(yearMatch[1], 10);
        } else {
          // If month is substantially in the past compared to ref, consider next academic year
          targetYear = ref.getFullYear();
        }
        return new Date(targetYear, targetMonth, targetDay, hours, minutes, seconds);
      }
    }

    // Fallback: Date.parse
    const fallbackParsed = new Date(text);
    if (!isNaN(fallbackParsed.getTime())) {
      return fallbackParsed;
    }

    return null;
  }

  /**
   * Format countdown ticker for assignments due in < 24 Hours
   * e.g. "Due tonight in 6h 24m", "Due tomorrow in 18h 15m", "Due in 45m"
   */
  function getCountdownTicker(dueAt, now) {
    if (!dueAt) return null;
    const dueDate = dueAt instanceof Date ? dueAt : new Date(dueAt);
    if (isNaN(dueDate.getTime())) return null;

    const nowDate = now instanceof Date ? now : (now ? new Date(now) : new Date());
    const diffMs = dueDate.getTime() - nowDate.getTime();

    if (diffMs < 0) {
      return 'Overdue / Past Due';
    }

    const totalMinutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    const isSameDayLocal =
      dueDate.getFullYear() === nowDate.getFullYear() &&
      dueDate.getMonth() === nowDate.getMonth() &&
      dueDate.getDate() === nowDate.getDate();

    const isSameDayUtc =
      dueDate.getUTCFullYear() === nowDate.getUTCFullYear() &&
      dueDate.getUTCMonth() === nowDate.getUTCMonth() &&
      dueDate.getUTCDate() === nowDate.getUTCDate();

    const isSameDay = isSameDayLocal || isSameDayUtc;

    const isNextDayLocal =
      new Date(nowDate.getTime() + 24 * 3600 * 1000).getDate() === dueDate.getDate();
    const isNextDayUtc =
      new Date(nowDate.getTime() + 24 * 3600 * 1000).getUTCDate() === dueDate.getUTCDate();
    const isNextDay = !isSameDay && (isNextDayLocal || isNextDayUtc);

    let prefix = 'Due in ';
    if (isSameDay) {
      prefix = dueDate.getHours() >= 17 || nowDate.getHours() >= 12 ? 'Due tonight in ' : 'Due today in ';
    } else if (isNextDay) {
      prefix = 'Due tomorrow in ';
    }

    if (hours > 0) {
      return `${prefix}${hours}h ${minutes}m`;
    } else {
      return `${prefix}${minutes}m`;
    }
  }

  /**
   * Human-friendly format for time remaining or elapsed
   */
  function formatTimeRemaining(diffMs) {
    if (typeof diffMs !== 'number' || isNaN(diffMs)) return '';
    const absMs = Math.abs(diffMs);
    const totalMinutes = Math.floor(absMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  /**
   * Classify assignment deadline and urgency
   * Categories:
   *  - Red: Due in < 24 Hours with countdown ticker
   *  - Yellow: Due This Week (>24h and <= 7 days)
   *  - Green: Submitted & Graded (with score badge) or Submitted
   *  - Grey / Amber: Overdue / Missing
   */
  function classifyDeadline(assignment, options = {}) {
    let opts = options;
    if (opts instanceof Date) {
      opts = { now: opts };
    } else if (typeof opts === 'number' || typeof opts === 'string') {
      opts = { now: new Date(opts) };
    } else if (!opts || typeof opts !== 'object') {
      opts = {};
    }

    const now = opts.now instanceof Date ? opts.now : (opts.now ? new Date(opts.now) : new Date());
    const overdueColor = opts.overdueColor || (opts.category === 'grey' ? 'grey' : 'amber');

    if (!assignment) {
      return {
        category: 'grey',
        color: 'grey',
        urgency: 'none',
        status: 'unknown',
        urgencyLabel: 'No assignment data',
        countdownTicker: null
      };
    }

    const rawDue = assignment.dueAt || assignment.dueDate || assignment.due_at || assignment.due || assignment.deadline;
    const dueAt = rawDue ? parseCanvasDate(rawDue, now) : null;

    const rawStatus = String(assignment.status || assignment.submissionStatus || '').toLowerCase();
    const isSubmitted = Boolean(
      assignment.isSubmitted ||
      assignment.submitted ||
      (!/unsubmitted/i.test(rawStatus) && /submitted|graded|resubmitted/i.test(rawStatus)) ||
      (assignment.score !== null && assignment.score !== undefined && assignment.score !== '-' && !isNaN(parseFloat(assignment.score)))
    );

    const hasScore =
      assignment.score !== null &&
      assignment.score !== undefined &&
      assignment.score !== '-' &&
      !isNaN(parseFloat(assignment.score));

    const isGraded = Boolean(
      assignment.isGraded ||
      assignment.graded ||
      (!/unsubmitted/i.test(rawStatus) && /graded/i.test(rawStatus)) ||
      hasScore
    );

    const rawPts = assignment.pointsPossible !== undefined
      ? assignment.pointsPossible
      : (assignment.points_possible !== undefined ? assignment.points_possible : assignment.points);

    let scoreBadge = null;
    if (hasScore) {
      const scoreNum = parseFloat(assignment.score);
      const ptsNum = rawPts !== null && rawPts !== undefined ? parseFloat(rawPts) : null;
      scoreBadge = ptsNum !== null && !isNaN(ptsNum) ? `${scoreNum} / ${ptsNum}` : `${scoreNum} pts`;
    } else if (isSubmitted) {
      scoreBadge = 'Submitted';
    }

    // 1. GREEN: Submitted & Graded or Submitted
    if (isSubmitted || isGraded) {
      return {
        category: 'green',
        color: 'green',
        urgency: 'green',
        urgencyLevel: 'submitted',
        status: isGraded ? 'graded' : 'submitted',
        urgencyLabel: isGraded
          ? (scoreBadge ? `Submitted & Graded (${scoreBadge})` : 'Submitted & Graded')
          : 'Submitted',
        countdownTicker: null,
        isDueSoon: false,
        isThisWeek: false,
        isOverdue: false,
        isMissing: false,
        isSubmitted: true,
        isGraded,
        scoreBadge,
        hoursLeft: null,
        minutesLeft: null,
        diffMs: null
      };
    }

    // Check for explicit Missing status
    const isExplicitMissing = Boolean(
      assignment.isMissing ||
      assignment.status === 'missing' ||
      assignment.submissionStatus === 'missing' ||
      assignment.missing
    );

    if (isExplicitMissing) {
      const cat = overdueColor;
      return {
        category: cat,
        aliasCategory: cat === 'amber' ? 'grey' : 'amber',
        color: cat,
        urgency: cat,
        urgencyLevel: 'overdue',
        status: 'missing',
        urgencyLabel: 'Overdue / Missing',
        countdownTicker: null,
        isDueSoon: false,
        isThisWeek: false,
        isOverdue: true,
        isMissing: true,
        isAmberOrGrey: true,
        isSubmitted: false,
        isGraded: false,
        scoreBadge: null,
        hoursLeft: null,
        minutesLeft: null,
        diffMs: null
      };
    }

    // If no due date is provided
    if (!dueAt) {
      return {
        category: 'grey',
        color: 'grey',
        urgency: 'none',
        urgencyLevel: 'no_deadline',
        status: 'no_deadline',
        urgencyLabel: 'No Due Date',
        countdownTicker: null,
        isDueSoon: false,
        isThisWeek: false,
        isOverdue: false,
        isMissing: false,
        isSubmitted: false,
        isGraded: false,
        scoreBadge: null,
        hoursLeft: null,
        minutesLeft: null,
        diffMs: null
      };
    }

    const diffMs = dueAt.getTime() - now.getTime();
    const isOverdue = diffMs < 0 || assignment.status === 'missing' || assignment.submissionStatus === 'missing';
    const isDueSoon = diffMs >= 0 && diffMs <= 24 * 3600 * 1000;
    const isThisWeek = diffMs > 24 * 3600 * 1000 && diffMs <= 7 * 24 * 3600 * 1000;

    const diffMins = Math.floor(Math.abs(diffMs) / 60000);
    const hoursLeft = Math.floor(diffMins / 60);
    const minutesLeft = diffMins % 60;

    // 2. GREY / AMBER: Overdue / Missing
    if (isOverdue) {
      const cat = overdueColor;
      return {
        category: cat,
        aliasCategory: cat === 'amber' ? 'grey' : 'amber',
        color: 'amber',
        urgency: 'amber',
        urgencyLevel: 'overdue',
        status: assignment.status === 'missing' ? 'missing' : 'overdue',
        urgencyLabel: 'Overdue / Missing',
        countdownTicker: null,
        isDueSoon: false,
        isThisWeek: false,
        isOverdue: true,
        isMissing: true,
        isAmberOrGrey: true,
        isSubmitted: false,
        isGraded: false,
        scoreBadge: null,
        hoursLeft: -hoursLeft,
        minutesLeft: -minutesLeft,
        diffMs
      };
    }

    // 3. RED: Due in < 24 Hours with countdown ticker
    if (isDueSoon) {
      const ticker = getCountdownTicker(dueAt, now);
      return {
        category: 'red',
        color: 'red',
        urgency: 'red',
        urgencyLevel: '<24h',
        status: 'due_soon',
        urgencyLabel: ticker,
        countdownTicker: ticker,
        isDueSoon: true,
        isThisWeek: false,
        isOverdue: false,
        isMissing: false,
        isSubmitted: false,
        isGraded: false,
        scoreBadge: null,
        hoursLeft,
        minutesLeft,
        diffMs
      };
    }

    // 4. YELLOW: Due This Week
    if (isThisWeek) {
      const dayName = WEEKDAYS[dueAt.getDay()];
      const daysLeft = Math.ceil(diffMs / (24 * 3600 * 1000));
      return {
        category: 'yellow',
        color: 'yellow',
        urgency: 'yellow',
        urgencyLevel: 'this_week',
        status: 'this_week',
        urgencyLabel: `Due this week (${dayName})`,
        countdownTicker: null,
        isDueSoon: false,
        isThisWeek: true,
        isOverdue: false,
        isMissing: false,
        isSubmitted: false,
        isGraded: false,
        scoreBadge: null,
        hoursLeft,
        minutesLeft,
        daysLeft,
        diffMs
      };
    }

    // 5. FUTURE: Due in > 7 days
    return {
      category: 'blue',
      color: 'blue',
      urgency: 'future',
      urgencyLevel: 'upcoming',
      status: 'upcoming',
      urgencyLabel: `Due ${MONTHS_REV(dueAt.getMonth())} ${dueAt.getDate()}`,
      countdownTicker: null,
      isDueSoon: false,
      isThisWeek: false,
      isOverdue: false,
      isMissing: false,
      isSubmitted: false,
      isGraded: false,
      scoreBadge: null,
      hoursLeft,
      minutesLeft,
      diffMs
    };
  }

  function MONTHS_REV(m) {
    const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return names[m] || '';
  }

  /**
   * Helper to construct direct submit and rubric URLs
   */
  function getSubmitUrl(url) {
    if (!url || url === '#') return '#';
    const cleanUrl = url.split('#')[0];
    return `${cleanUrl}#submit`;
  }

  function getRubricUrl(url) {
    if (!url || url === '#') return '#';
    const cleanUrl = url.split('#')[0];
    return `${cleanUrl}#rubric`;
  }

  /**
   * Format Date to standard iCalendar UTC string: YYYYMMDDTHHmmssZ
   */
  function formatIcsDate(date) {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  }

  /**
   * Escape text for RFC 5545 iCalendar values
   */
  function escapeIcs(text) {
    if (!text) return '';
    return String(text)
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\r?\n/g, '\\n');
  }

  /**
   * Generate RFC 5545 iCalendar (.ics) string with 1-hour and 24-hour alert alarms
   * Requirement:
   *  - 1-Click 'Add Deadlines to Calendar (.ics)' with 1-hour and 24-hour alert alarms for all pending assignments.
   */
  function generateDeadlinesIcs(assignments, options = {}) {
    let opts = options;
    if (opts instanceof Date) {
      opts = { now: opts };
    } else if (typeof opts === 'number' || typeof opts === 'string') {
      opts = { now: new Date(opts) };
    } else if (!opts || typeof opts !== 'object') {
      opts = {};
    }

    const list = Array.isArray(assignments) ? assignments : (assignments ? [assignments] : []);
    const now = opts.now instanceof Date ? opts.now : (opts.now ? new Date(opts.now) : new Date());
    const calendarName = opts.calendarName || 'Canvas Assignment Deadlines';

    // Filter assignments that have a valid deadline and are not yet completed
    const pending = list.filter(a => {
      if (!a) return false;
      const rawDue = a.dueAt || a.dueDate || a.due_at || a.due || a.deadline;
      const due = rawDue ? parseCanvasDate(rawDue, now) : null;
      if (!due) return false;
      if (opts.includeAll) return true;
      // Pending = not submitted and not graded
      const isDone = Boolean(
        a.isSubmitted ||
        a.submitted ||
        a.isGraded ||
        a.graded ||
        a.status === 'submitted' ||
        a.status === 'graded' ||
        a.submissionStatus === 'submitted' ||
        a.submissionStatus === 'graded' ||
        (a.score !== null && a.score !== undefined && a.score !== '-' && !isNaN(parseFloat(a.score)))
      );
      return !isDone;
    });

    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Bunkr//Canvas Assignment Deadlines//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${escapeIcs(calendarName)}`,
      'X-WR-TIMEZONE:UTC'
    ];

    const dtstamp = formatIcsDate(now);

    for (let i = 0; i < pending.length; i++) {
      const a = pending[i];
      const rawDue = a.dueAt || a.dueDate || a.due_at || a.due || a.deadline;
      const dueDate = rawDue ? parseCanvasDate(rawDue, now) : null;
      if (!dueDate) continue;

      // Deadline event spans 1 hour leading up to the due time
      const startDate = new Date(dueDate.getTime() - 60 * 60 * 1000);
      const dtstart = formatIcsDate(startDate);
      const dtend = formatIcsDate(dueDate);

      const rawId = a.id || (a.title ? a.title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase() : `item_${i}`);
      const uid = `canvas_deadline_${rawId}_${dtend}@bunkr.app`;

      const coursePrefix = a.courseName ? `[${a.courseName}] ` : (a.courseCode ? `[${a.courseCode}] ` : '');
      const summary = escapeIcs(`${coursePrefix}${a.title || 'Canvas Assignment'} (Deadline)`);

      const descLines = [
        `Assignment: ${a.title || 'Untitled'}`,
        a.courseName ? `Course: ${a.courseName}` : '',
        a.pointsPossible ? `Points Possible: ${a.pointsPossible} pts` : '',
        `Due Date: ${dueDate.toLocaleString()}`,
        a.url ? `Canvas Submission: ${a.url}` : '',
        a.rubricUrl ? `Rubric: ${a.rubricUrl}` : ''
      ].filter(Boolean);

      const description = escapeIcs(descLines.join('\n'));

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${uid}`);
      lines.push(`DTSTAMP:${dtstamp}`);
      lines.push(`DTSTART:${dtstart}`);
      lines.push(`DTEND:${dtend}`);
      lines.push(`SUMMARY:${summary}`);
      lines.push(`DESCRIPTION:${description}`);
      if (a.url) {
        lines.push(`URL:${a.url}`);
      }

      // 1. 24-Hour Alert Alarm (1 day before deadline)
      lines.push('BEGIN:VALARM');
      lines.push('ACTION:DISPLAY');
      lines.push(`DESCRIPTION:${escapeIcs(`⏰ 24-hour alert: Assignment "${a.title || 'Assignment'}" is due in 24 hours!`)}`);
      lines.push('TRIGGER:-PT24H');
      lines.push('END:VALARM');

      // 2. 1-Hour Alert Alarm (60 minutes before deadline)
      lines.push('BEGIN:VALARM');
      lines.push('ACTION:DISPLAY');
      lines.push(`DESCRIPTION:${escapeIcs(`🚨 1-hour alert: Assignment "${a.title || 'Assignment'}" is due in 1 hour!`)}`);
      lines.push('TRIGGER:-PT1H');
      lines.push('END:VALARM');

      lines.push('END:VEVENT');
    }

    lines.push('END:VCALENDAR');
    return lines.join('\r\n') + '\r\n';
  }

  /**
   * Browser 1-Click trigger to download the generated .ics file
   */
  function downloadDeadlinesIcs(assignments, filename = 'canvas_deadlines.ics') {
    const ics = generateDeadlinesIcs(assignments);
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return ics;
    }

    try {
      const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      console.warn('Bunkr: Failed to trigger direct ics download', e);
    }

    return ics;
  }

  /**
   * Parse Canvas assignments from HTML string or DOM Node
   * Works across:
   *  1. Canvas Course Assignments index (/courses/:id/assignments)
   *  2. Canvas Gradebook summary table (table#grades_summary)
   *  3. Canvas Dashboard Todo list (#right-side .to-do-list or .todo-list)
   */
  function parseCanvasAssignmentsFromHtml(input, defaultCourse = '') {
    if (!input) return [];

    // If input is a DOM Document or Element, delegate to scrapeAssignmentsFromPage
    if (typeof input === 'object' && input.querySelectorAll) {
      return scrapeAssignmentsFromPage(input, defaultCourse);
    }

    const html = String(input);
    const results = [];
    const seenTitles = new Set();

    // =========================================================================
    // Format 1: Canvas Gradebook table (#grades_summary tbody tr.student_assignment)
    // =========================================================================
    if (html.includes('grades_summary') || html.includes('student_assignment')) {
      const rowRegex = /<tr[^>]*class=["'][^"']*student_assignment[^"']*["'][^>]*>([\s\S]*?)<\/tr>/gi;
      let match;
      while ((match = rowRegex.exec(html)) !== null) {
        const rowContent = match[1];

        // Title and URL
        const titleMatch = rowContent.match(/<th[^>]*class=["'][^"']*title[^"']*["'][^>]*>([\s\S]*?)<\/th>/i);
        let title = '';
        let url = '';
        let course = defaultCourse;

        if (titleMatch) {
          const aMatch = titleMatch[1].match(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
          if (aMatch) {
            url = aMatch[1];
            title = cleanText(aMatch[2]);
          } else {
            title = cleanText(titleMatch[1]);
          }

          const ctxMatch = titleMatch[1].match(/<div[^>]*class=["'][^"']*context[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
          if (ctxMatch) {
            course = cleanText(ctxMatch[1]);
          }
        }

        if (!title) continue;

        // Due date
        const dueMatch = rowContent.match(/<td[^>]*class=["'][^"']*due[^"']*["'][^>]*>([\s\S]*?)<\/td>/i);
        const dueText = dueMatch ? cleanText(dueMatch[1]) : '';
        const dueAt = parseCanvasDate(dueText);

        // Status
        const statusMatch = rowContent.match(/<td[^>]*class=["'][^"']*status[^"']*["'][^>]*>([\s\S]*?)<\/td>/i);
        const statusText = statusMatch ? cleanText(statusMatch[1]).toLowerCase() : '';

        // Score
        const scoreCellMatch = rowContent.match(/<td[^>]*class=["'][^"']*assignment_score[^"']*["'][^>]*>([\s\S]*?)<\/td>/i);
        let score = null;
        let pointsPossible = null;

        if (scoreCellMatch) {
          const cellRaw = scoreCellMatch[1];
          const gradeMatch = cellRaw.match(/<span[^>]*class=["'][^"']*grade[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);
          if (gradeMatch) {
            const rawG = cleanText(gradeMatch[1]);
            if (rawG && rawG !== '-') {
              const numG = parseFloat(rawG);
              if (!isNaN(numG)) score = numG;
            }
          }
          const ptsMatch = cellRaw.match(/<span[^>]*class=["'][^"']*points_possible[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);
          if (ptsMatch) {
            const rawP = cleanText(ptsMatch[1]);
            const numP = parseFloat(rawP);
            if (!isNaN(numP)) pointsPossible = numP;
          }

          // Fallback: parse score and pointsPossible directly from cell text (e.g. "85 / 100", "5 / 5", "10/10")
          if (score === null || pointsPossible === null) {
            const cellClean = cleanText(cellRaw);
            const ratioMatch = cellClean.match(/(-?\d+(?:\.\d+)?|-)\s*[/／]\s*(\d+(?:\.\d+)?)/);
            if (ratioMatch) {
              if (score === null && ratioMatch[1] !== '-') {
                const s = parseFloat(ratioMatch[1]);
                if (!isNaN(s)) score = s;
              }
              if (pointsPossible === null) {
                const p = parseFloat(ratioMatch[2]);
                if (!isNaN(p)) pointsPossible = p;
              }
            } else if (score === null) {
              const singleNumMatch = cellClean.match(/^(-?\d+(?:\.\d+)?)/);
              if (singleNumMatch && singleNumMatch[1] !== '-') {
                const s = parseFloat(singleNumMatch[1]);
                if (!isNaN(s)) score = s;
              }
            }
          }
        }

        const isSubmitted = (!/unsubmitted/i.test(statusText) && /submitted|graded|resubmitted/i.test(statusText)) || score !== null;
        const isGraded = score !== null;
        const isMissing = statusText.includes('missing') || (!isSubmitted && dueAt && dueAt.getTime() < Date.now());

        const idMatch = rowContent.match(/id=["']submission_(\d+)["']/i) || (url ? url.match(/assignments\/(\d+)/i) : null);
        const id = idMatch ? idMatch[1] : `grade_${results.length}`;

        const item = {
          id,
          title,
          courseName: course || defaultCourse,
          url,
          submitUrl: getSubmitUrl(url),
          rubricUrl: getRubricUrl(url),
          dueText,
          dueAt,
          pointsPossible,
          score,
          status: isGraded ? 'graded' : (isSubmitted ? 'submitted' : (isMissing ? 'missing' : 'pending')),
          isSubmitted,
          isGraded,
          isMissing
        };

        const classification = classifyDeadline(item);
        Object.assign(item, classification);

        results.push(item);
        seenTitles.add(title.toLowerCase());
      }

      if (results.length > 0) return results;
    }

    // =========================================================================
    // Format 2: Canvas Assignments Index (.ig-row.assignment or li.assignment)
    // =========================================================================
    if (html.includes('ig-row') || html.includes('assignment-group') || html.includes('assignment_group')) {
      const itemRegex = /<(?:li|div)[^>]*class=["'][^"']*(?:ig-row|assignment)[^"']*["'][^>]*>([\s\S]*?)<\/(?:li|div)>/gi;
      let match;
      while ((match = itemRegex.exec(html)) !== null) {
        const itemHtml = match[1];

        // Title and link
        const titleMatch =
          itemHtml.match(/<a[^>]*class=["'][^"']*(?:ig-title|assignment_title)[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i) ||
          itemHtml.match(/<a[^>]*href=["']([^"']*\/assignments\/\d+[^"']*)["'][^>]*>([\s\S]*?)<\/a>/i);

        if (!titleMatch) continue;

        const url = titleMatch[1];
        const title = cleanText(titleMatch[2]);
        if (!title || seenTitles.has(title.toLowerCase())) continue;

        // Due date
        const dueMatch =
          itemHtml.match(/class=["'][^"']*(?:due-date|assignment-date-due|due_at)[^"']*["'][^>]*>([\s\S]*?)<\/(?:span|div)>/i) ||
          itemHtml.match(/(?:due|due at)\s+([^<|]+)/i);

        const dueText = dueMatch ? cleanText(dueMatch[1]) : '';
        const dueAt = parseCanvasDate(dueText);

        // Points
        const ptsMatch = itemHtml.match(/(\d+(?:\.\d+)?)\s*pts/i);
        const pointsPossible = ptsMatch ? parseFloat(ptsMatch[1]) : null;

        // Submission / Score
        const isSubmitted = (!/unsubmitted/i.test(itemHtml) && /class=["'][^"']*(?:submitted|ig-published|graded|resubmitted)[^"']*["']/i.test(itemHtml)) ||
          (!/unsubmitted/i.test(itemHtml) && /\b(?:submitted|graded|resubmitted)\b/i.test(itemHtml)) ||
          score !== null;
        const isMissing = /class=["'][^"']*(?:missing|badge-missing)[^"']*["']/i.test(itemHtml) || /\bmissing\b/i.test(itemHtml);

        const scoreMatch = itemHtml.match(/class=["'][^"']*score-display[^"']*["'][^>]*>([\s\S]*?)<\//i);
        let score = null;
        if (scoreMatch) {
          const sNum = parseFloat(cleanText(scoreMatch[1]));
          if (!isNaN(sNum)) score = sNum;
        }

        const idMatch = url.match(/assignments\/(\d+)/i);
        const id = idMatch ? idMatch[1] : `assign_${results.length}`;

        const item = {
          id,
          title,
          courseName: defaultCourse,
          url,
          submitUrl: getSubmitUrl(url),
          rubricUrl: getRubricUrl(url),
          dueText,
          dueAt,
          pointsPossible,
          score,
          status: score !== null ? 'graded' : (isSubmitted ? 'submitted' : (isMissing ? 'missing' : 'pending')),
          isSubmitted,
          isGraded: score !== null,
          isMissing
        };

        const classification = classifyDeadline(item);
        Object.assign(item, classification);

        results.push(item);
        seenTitles.add(title.toLowerCase());
      }

      if (results.length > 0) return results;
    }

    // =========================================================================
    // Format 3: Canvas Dashboard To-Do list (li.todo or .to-do-list li)
    // =========================================================================
    if (html.includes('to-do-list') || html.includes('todo-list') || html.includes('todo')) {
      const todoRegex = /<li[^>]*class=["'][^"']*todo[^"']*["'][^>]*>([\s\S]*?)<\/li>/gi;
      let match;
      while ((match = todoRegex.exec(html)) !== null) {
        const itemHtml = match[1];

        const aMatch =
          itemHtml.match(/<a[^>]*class=["'][^"']*(?:todo-title|stream-title)[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i) ||
          itemHtml.match(/<a[^>]*href=["']([^"']*\/assignments\/\d+[^"']*)["'][^>]*>([\s\S]*?)<\/a>/i);

        if (!aMatch) continue;

        const url = aMatch[1];
        const title = cleanText(aMatch[2]);
        if (!title || seenTitles.has(title.toLowerCase())) continue;

        const courseMatch = itemHtml.match(/class=["'][^"']*(?:context_name|context)[^"']*["'][^>]*>([\s\S]*?)<\//i);
        const courseName = courseMatch ? cleanText(courseMatch[1]) : defaultCourse;

        const dateMatch = itemHtml.match(/class=["'][^"']*(?:todo_date|due_date)[^"']*["'][^>]*>([\s\S]*?)<\//i) ||
          itemHtml.match(/(?:due\s+[^<]+)/i);
        const dueText = dateMatch ? cleanText(dateMatch[1] || dateMatch[0]) : '';
        const dueAt = parseCanvasDate(dueText);

        const ptsMatch = itemHtml.match(/(\d+(?:\.\d+)?)\s*pts/i);
        const pointsPossible = ptsMatch ? parseFloat(ptsMatch[1]) : null;

        const idMatch = url.match(/assignments\/(\d+)/i);
        const id = idMatch ? idMatch[1] : `todo_${results.length}`;

        const item = {
          id,
          title,
          courseName,
          url,
          submitUrl: getSubmitUrl(url),
          rubricUrl: getRubricUrl(url),
          dueText,
          dueAt,
          pointsPossible,
          score: null,
          status: 'pending',
          isSubmitted: false,
          isGraded: false,
          isMissing: false
        };

        const classification = classifyDeadline(item);
        Object.assign(item, classification);

        results.push(item);
        seenTitles.add(title.toLowerCase());
      }
    }

    return results;
  }

  /**
   * Scrapes assignments directly from the active Canvas DOM
   */
  function scrapeAssignmentsFromPage(doc, defaultCourse = '') {
    const d = doc || (typeof document !== 'undefined' ? document : null);
    if (!d || !d.querySelectorAll) {
      if (typeof d === 'string') {
        return parseCanvasAssignmentsFromHtml(d, defaultCourse);
      }
      return [];
    }

    const assignments = [];
    const seen = new Set();

    // Try detecting Course Name from breadcrumbs or header
    let pageCourseName = defaultCourse;
    const crumb = d.querySelector('#breadcrumbs ul li:nth-child(2) a, .ellipsible:not(#breadcrumbs *), .course-title');
    if (crumb) {
      pageCourseName = cleanText(crumb.textContent);
    }

    // 1. Check Course Assignments Page (.ig-row.assignment)
    const assignmentRows = d.querySelectorAll('.ig-row.assignment, div.ig-row, li.assignment');
    if (assignmentRows.length > 0) {
      assignmentRows.forEach((row, idx) => {
        const titleEl = row.querySelector('.ig-title, a.assignment_title, a[href*="/assignments/"]');
        if (!titleEl) return;

        const title = cleanText(titleEl.textContent);
        if (!title || seen.has(title.toLowerCase())) return;
        seen.add(title.toLowerCase());

        const url = titleEl.getAttribute('href') || '';
        const dueEl = row.querySelector('.assignment-date-due, .due-date, .ig-details, .due_at');
        const dueText = dueEl ? cleanText(dueEl.textContent) : '';
        const dueAt = parseCanvasDate(dueText);

        const ptsEl = row.querySelector('.points_possible, .ig-details');
        let pointsPossible = null;
        if (ptsEl) {
          const match = ptsEl.textContent.match(/(\d+(?:\.\d+)?)\s*pts/i);
          if (match) pointsPossible = parseFloat(match[1]);
        }

        const subStatusEl = row.querySelector('.submission-status, .ig-published, [aria-label*="Submitted"]');
        const subText = subStatusEl ? cleanText(subStatusEl.textContent).toLowerCase() : '';
        const isSubmitted = (!/unsubmitted/i.test(subText) && /submitted|graded|resubmitted/i.test(subText)) ||
          (!/unsubmitted/i.test(row.textContent) && row.querySelector('.ig-published') !== null) ||
          score !== null;
        const isMissing = row.querySelector('.badge-missing, .text-warning') !== null || /missing/i.test(row.textContent);

        const scoreEl = row.querySelector('.score-display, .grade');
        let score = null;
        if (scoreEl) {
          const sNum = parseFloat(cleanText(scoreEl.textContent));
          if (!isNaN(sNum)) score = sNum;
        }

        const idMatch = url.match(/assignments\/(\d+)/i);
        const id = idMatch ? idMatch[1] : `assign_${idx}`;

        const item = {
          id,
          title,
          courseName: pageCourseName,
          url,
          submitUrl: getSubmitUrl(url),
          rubricUrl: getRubricUrl(url),
          dueText,
          dueAt,
          pointsPossible,
          score,
          status: score !== null ? 'graded' : (isSubmitted ? 'submitted' : (isMissing ? 'missing' : 'pending')),
          isSubmitted,
          isGraded: score !== null,
          isMissing
        };

        const classification = classifyDeadline(item);
        Object.assign(item, classification);
        assignments.push(item);
      });

      if (assignments.length > 0) return assignments;
    }

    // 2. Check Gradebook table (#grades_summary tr.student_assignment)
    const gradeRows = d.querySelectorAll('table#grades_summary tr.student_assignment');
    if (gradeRows.length > 0) {
      gradeRows.forEach((row, idx) => {
        const titleEl = row.querySelector('th.title a, th.title');
        if (!titleEl) return;

        const title = cleanText(titleEl.textContent);
        if (!title || seen.has(title.toLowerCase())) return;
        seen.add(title.toLowerCase());

        const url = (titleEl.tagName === 'A' ? titleEl.getAttribute('href') : '') || (row.querySelector('a') ? row.querySelector('a').getAttribute('href') : '');

        const contextEl = row.querySelector('.context');
        const courseName = contextEl ? cleanText(contextEl.textContent) : pageCourseName;

        const dueEl = row.querySelector('td.due');
        const dueText = dueEl ? cleanText(dueEl.textContent) : '';
        const dueAt = parseCanvasDate(dueText);

        const scoreCell = row.querySelector('td.assignment_score');
        const scoreEl = scoreCell ? scoreCell.querySelector('.grade') : null;
        let score = null;
        if (scoreEl) {
          const rawS = cleanText(scoreEl.textContent);
          if (rawS && rawS !== '-') {
            const numS = parseFloat(rawS);
            if (!isNaN(numS)) score = numS;
          }
        }

        const ptsEl = scoreCell ? scoreCell.querySelector('.points_possible') : null;
        let pointsPossible = null;
        if (ptsEl) {
          const rawP = cleanText(ptsEl.textContent);
          const numP = parseFloat(rawP);
          if (!isNaN(numP)) pointsPossible = numP;
        }

        // Direct cell text fallback: "85 / 100", "5 / 5", "10/10"
        if (scoreCell && (score === null || pointsPossible === null)) {
          const cellClean = cleanText(scoreCell.textContent);
          const ratioMatch = cellClean.match(/(-?\d+(?:\.\d+)?|-)\s*[/／]\s*(\d+(?:\.\d+)?)/);
          if (ratioMatch) {
            if (score === null && ratioMatch[1] !== '-') {
              const s = parseFloat(ratioMatch[1]);
              if (!isNaN(s)) score = s;
            }
            if (pointsPossible === null) {
              const p = parseFloat(ratioMatch[2]);
              if (!isNaN(p)) pointsPossible = p;
            }
          } else if (score === null) {
            const singleNumMatch = cellClean.match(/^(-?\d+(?:\.\d+)?)/);
            if (singleNumMatch && singleNumMatch[1] !== '-') {
              const s = parseFloat(singleNumMatch[1]);
              if (!isNaN(s)) score = s;
            }
          }
        }

        const statusEl = row.querySelector('td.status');
        const statusText = statusEl ? cleanText(statusEl.textContent).toLowerCase() : '';
        const isSubmitted = (!/unsubmitted/i.test(statusText) && /submitted|graded|resubmitted/i.test(statusText)) || score !== null;
        const isMissing = statusText.includes('missing');

        const idMatch = url ? url.match(/assignments\/(\d+)/i) : null;
        const id = idMatch ? idMatch[1] : `grade_${idx}`;

        const item = {
          id,
          title,
          courseName,
          url,
          submitUrl: getSubmitUrl(url),
          rubricUrl: getRubricUrl(url),
          dueText,
          dueAt,
          pointsPossible,
          score,
          status: score !== null ? 'graded' : (isSubmitted ? 'submitted' : (isMissing ? 'missing' : 'pending')),
          isSubmitted,
          isGraded: score !== null,
          isMissing
        };

        const classification = classifyDeadline(item);
        Object.assign(item, classification);
        assignments.push(item);
      });

      if (assignments.length > 0) return assignments;
    }

    // 3. Check Dashboard Todo List (#right-side .to-do-list li)
    const todoRows = d.querySelectorAll('.to-do-list li, .todo-list-item, li.todo');
    if (todoRows.length > 0) {
      todoRows.forEach((row, idx) => {
        const titleEl = row.querySelector('a.todo-title, a.stream-title, a');
        if (!titleEl) return;

        const title = cleanText(titleEl.textContent);
        if (!title || seen.has(title.toLowerCase())) return;
        seen.add(title.toLowerCase());

        const url = titleEl.getAttribute('href') || '';
        const contextEl = row.querySelector('.context_name, .context');
        const courseName = contextEl ? cleanText(contextEl.textContent) : pageCourseName;

        const dateEl = row.querySelector('.todo_date, .due_date');
        const dueText = dateEl ? cleanText(dateEl.textContent) : '';
        const dueAt = parseCanvasDate(dueText);

        const ptsEl = row.querySelector('.todo_points');
        let pointsPossible = null;
        if (ptsEl) {
          const match = ptsEl.textContent.match(/(\d+(?:\.\d+)?)\s*pts/i);
          if (match) pointsPossible = parseFloat(match[1]);
        }

        const idMatch = url.match(/assignments\/(\d+)/i);
        const id = idMatch ? idMatch[1] : `todo_${idx}`;

        const item = {
          id,
          title,
          courseName,
          url,
          submitUrl: getSubmitUrl(url),
          rubricUrl: getRubricUrl(url),
          dueText,
          dueAt,
          pointsPossible,
          score: null,
          status: 'pending',
          isSubmitted: false,
          isGraded: false,
          isMissing: false
        };

        const classification = classifyDeadline(item);
        Object.assign(item, classification);
        assignments.push(item);
      });
    }

    return assignments;
  }

  /**
   * Inject Scoped Canvas UI Styles matching Instructure Design Language
   */
  function ensureStylesInjected(doc = document) {
    if (!doc || doc.getElementById('canvas-deadline-radar-styles')) return;

    const style = doc.createElement('style');
    style.id = 'canvas-deadline-radar-styles';
    style.textContent = `
      .bunkr-deadline-radar {
        background: #ffffff;
        border: 1px solid #C7CDD1;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        margin: 16px 0 24px 0;
        font-family: LatoWeb, "Helvetica Neue", Helvetica, Arial, sans-serif;
        color: #2D3B45;
        box-sizing: border-box;
        overflow: hidden;
        max-width: 100%;
        transition: all 0.2s ease-in-out;
      }
      .bunkr-radar-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 18px;
        background: #F8FAFC;
        border-bottom: 1px solid #E2E8F0;
        flex-wrap: wrap;
        gap: 12px;
      }
      .bunkr-radar-title-group {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .bunkr-radar-icon {
        font-size: 20px;
        line-height: 1;
      }
      .bunkr-radar-title {
        font-size: 15px;
        font-weight: 700;
        color: #1E293B;
        margin: 0;
      }
      .bunkr-radar-pills {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .bunkr-pill {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 3px 10px;
        border-radius: 9999px;
        font-size: 12px;
        font-weight: 600;
        line-height: 1.4;
      }
      .bunkr-pill-red {
        background: #FEE2E2;
        color: #991B1B;
        border: 1px solid #FCA5A5;
      }
      .bunkr-pill-yellow {
        background: #FEF3C7;
        color: #92400E;
        border: 1px solid #FCD34D;
      }
      .bunkr-pill-green {
        background: #D1FAE5;
        color: #065F46;
        border: 1px solid #6EE7B7;
      }
      .bunkr-pill-amber, .bunkr-pill-grey {
        background: #F3F4F6;
        color: #374151;
        border: 1px solid #D1D5DB;
      }
      .bunkr-radar-actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .bunkr-btn-ics {
        background: #008EE2;
        color: #ffffff !important;
        border: none;
        border-radius: 4px;
        padding: 6px 14px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        text-decoration: none;
        transition: background 0.15s ease-in-out;
      }
      .bunkr-btn-ics:hover {
        background: #0073A8;
        color: #ffffff !important;
      }
      .bunkr-btn-toggle {
        background: transparent;
        border: 1px solid #CBD5E1;
        color: #475569;
        border-radius: 4px;
        padding: 5px 10px;
        font-size: 12px;
        cursor: pointer;
      }
      .bunkr-btn-toggle:hover {
        background: #E2E8F0;
      }
      .bunkr-radar-body {
        padding: 12px 18px;
        display: block;
      }
      .bunkr-radar-body.bunkr-collapsed {
        display: none;
      }
      .bunkr-radar-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .bunkr-assignment-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 14px;
        border-radius: 6px;
        border: 1px solid #E2E8F0;
        background: #FFFFFF;
        flex-wrap: wrap;
        gap: 12px;
        transition: border-color 0.15s ease;
      }
      .bunkr-assignment-row:hover {
        border-color: #94A3B8;
      }
      .bunkr-row-urgent {
        border-left: 4px solid #DC2626 !important;
        background: #FFFBFB;
      }
      .bunkr-row-week {
        border-left: 4px solid #D97706 !important;
      }
      .bunkr-row-done {
        border-left: 4px solid #059669 !important;
        opacity: 0.88;
      }
      .bunkr-row-overdue {
        border-left: 4px solid #4B5563 !important;
        background: #F9FAFB;
      }
      .bunkr-assign-info {
        display: flex;
        flex-direction: column;
        gap: 3px;
        flex: 1;
        min-width: 200px;
      }
      .bunkr-assign-title-wrap {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .bunkr-assign-title {
        font-size: 14px;
        font-weight: 600;
        color: #0F172A;
        text-decoration: none;
      }
      .bunkr-assign-title:hover {
        color: #008EE2;
        text-decoration: underline;
      }
      .bunkr-course-tag {
        font-size: 11px;
        background: #EFF6FF;
        color: #1D4ED8;
        padding: 1px 6px;
        border-radius: 4px;
        font-weight: 600;
      }
      .bunkr-assign-meta {
        font-size: 12px;
        color: #64748B;
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
      }
      .bunkr-ticker-badge {
        font-weight: 700;
        font-size: 12px;
        padding: 2px 8px;
        border-radius: 4px;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .bunkr-ticker-red {
        background: #FEE2E2;
        color: #B91C1C;
        animation: bunkrPulse 2s infinite ease-in-out;
      }
      .bunkr-ticker-yellow {
        background: #FEF3C7;
        color: #B45309;
      }
      .bunkr-ticker-green {
        background: #D1FAE5;
        color: #065F46;
      }
      .bunkr-ticker-amber, .bunkr-ticker-grey {
        background: #F3F4F6;
        color: #4B5563;
      }
      .bunkr-assign-actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .bunkr-action-btn {
        padding: 4px 10px;
        font-size: 12px;
        font-weight: 600;
        border-radius: 4px;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        transition: all 0.15s ease;
      }
      .bunkr-action-submit {
        background: #EFF6FF;
        color: #008EE2;
        border: 1px solid #BFDBFE;
      }
      .bunkr-action-submit:hover {
        background: #008EE2;
        color: #ffffff;
      }
      .bunkr-action-rubric {
        background: #F8FAFC;
        color: #475569;
        border: 1px solid #CBD5E1;
      }
      .bunkr-action-rubric:hover {
        background: #E2E8F0;
        color: #1E293B;
      }
      @keyframes bunkrPulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.75; }
      }
    `;
    doc.head.appendChild(style);
  }

  /**
   * Render Non-intrusive Deadline Radar bar in Canvas LMS
   */
  function renderDeadlineRadar(container, assignments) {
    if (!container) return null;

    const list = Array.isArray(assignments) ? assignments : [];
    const doc = container.ownerDocument || document;
    ensureStylesInjected(doc);

    // Remove existing radar if already rendered
    const existing = container.querySelector('#canvas_deadline_radar, .bunkr-deadline-radar');
    if (existing) {
      existing.remove();
    }

    // Tally urgencies
    let countRed = 0;
    let countYellow = 0;
    let countGreen = 0;
    let countAmber = 0;

    for (const a of list) {
      if (a.category === 'red') countRed++;
      else if (a.category === 'yellow') countYellow++;
      else if (a.category === 'green') countGreen++;
      else if (a.category === 'amber' || a.category === 'grey') countAmber++;
    }

    const radarEl = doc.createElement('div');
    radarEl.id = 'canvas_deadline_radar';
    radarEl.className = 'bunkr-deadline-radar';

    // Header
    const headerEl = doc.createElement('div');
    headerEl.className = 'bunkr-radar-header';

    const titleGroup = doc.createElement('div');
    titleGroup.className = 'bunkr-radar-title-group';
    titleGroup.innerHTML = `
      <span class="bunkr-radar-icon">🎯</span>
      <h3 class="bunkr-radar-title">Assignment Deadline Radar</h3>
    `;
    headerEl.appendChild(titleGroup);

    // Pills
    const pillsGroup = doc.createElement('div');
    pillsGroup.className = 'bunkr-radar-pills';
    pillsGroup.innerHTML = `
      <span class="bunkr-pill bunkr-pill-red" title="Due in less than 24 hours">🔴 ${countRed} Due &lt;24h</span>
      <span class="bunkr-pill bunkr-pill-yellow" title="Due this week">🟡 ${countYellow} This Week</span>
      <span class="bunkr-pill bunkr-pill-green" title="Submitted or Graded">🟢 ${countGreen} Done</span>
      ${countAmber > 0 ? `<span class="bunkr-pill bunkr-pill-amber" title="Overdue or Missing">⚪ ${countAmber} Overdue</span>` : ''}
    `;
    headerEl.appendChild(pillsGroup);

    // Actions
    const actionsGroup = doc.createElement('div');
    actionsGroup.className = 'bunkr-radar-actions';

    const icsBtn = doc.createElement('button');
    icsBtn.type = 'button';
    icsBtn.className = 'bunkr-btn-ics';
    icsBtn.innerHTML = '📅 Add Deadlines to Calendar (.ics)';
    icsBtn.title = 'Export all pending assignment deadlines to iCal with 1h & 24h reminders';
    icsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      downloadDeadlinesIcs(list);
    });
    actionsGroup.appendChild(icsBtn);

    const toggleBtn = doc.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'bunkr-btn-toggle';
    toggleBtn.textContent = 'Hide';
    toggleBtn.addEventListener('click', () => {
      const body = radarEl.querySelector('.bunkr-radar-body');
      if (body) {
        body.classList.toggle('bunkr-collapsed');
        toggleBtn.textContent = body.classList.contains('bunkr-collapsed') ? 'Show' : 'Hide';
      }
    });
    actionsGroup.appendChild(toggleBtn);

    headerEl.appendChild(actionsGroup);
    radarEl.appendChild(headerEl);

    // Body
    const bodyEl = doc.createElement('div');
    bodyEl.className = 'bunkr-radar-body';

    if (list.length === 0) {
      bodyEl.innerHTML = '<div style="color: #64748B; font-size: 13px; text-align: center; padding: 12px;">No assignments found on this page.</div>';
    } else {
      const listEl = doc.createElement('div');
      listEl.className = 'bunkr-radar-list';

      // Sort assignments: red (<24h) first, then yellow (this week), then amber (overdue), then green (done)
      const priorityOrder = { red: 1, yellow: 2, amber: 3, grey: 3, blue: 4, green: 5 };
      const sorted = [...list].sort((a, b) => {
        const pA = priorityOrder[a.category] || 99;
        const pB = priorityOrder[b.category] || 99;
        if (pA !== pB) return pA - pB;
        if (a.dueAt && b.dueAt) return a.dueAt.getTime() - b.dueAt.getTime();
        return 0;
      });

      for (const item of sorted) {
        const rowEl = doc.createElement('div');
        rowEl.className = `bunkr-assignment-row ${
          item.category === 'red' ? 'bunkr-row-urgent' :
          item.category === 'yellow' ? 'bunkr-row-week' :
          item.category === 'green' ? 'bunkr-row-done' : 'bunkr-row-overdue'
        }`;

        // Assignment Info
        const infoEl = doc.createElement('div');
        infoEl.className = 'bunkr-assign-info';

        const titleWrap = doc.createElement('div');
        titleWrap.className = 'bunkr-assign-title-wrap';

        if (item.courseName) {
          const courseTag = doc.createElement('span');
          courseTag.className = 'bunkr-course-tag';
          courseTag.textContent = item.courseName;
          titleWrap.appendChild(courseTag);
        }

        const linkEl = doc.createElement('a');
        linkEl.className = 'bunkr-assign-title';
        linkEl.href = item.url || '#';
        linkEl.textContent = item.title;
        titleWrap.appendChild(linkEl);

        infoEl.appendChild(titleWrap);

        // Meta (Due Date + Points + Ticker)
        const metaEl = doc.createElement('div');
        metaEl.className = 'bunkr-assign-meta';

        if (item.dueText) {
          const dueSpan = doc.createElement('span');
          dueSpan.textContent = `📅 ${item.dueText}`;
          metaEl.appendChild(dueSpan);
        }

        if (item.pointsPossible !== null && item.pointsPossible !== undefined) {
          const ptsSpan = doc.createElement('span');
          ptsSpan.textContent = `⚖️ ${item.pointsPossible} pts`;
          metaEl.appendChild(ptsSpan);
        }

        // Ticker or Urgency Badge
        const tickerBadge = doc.createElement('span');
        tickerBadge.className = `bunkr-ticker-badge bunkr-ticker-${item.category}`;
        tickerBadge.textContent = item.urgencyLabel || (item.category === 'red' ? 'Due Soon' : '');
        if (item.category === 'red') {
          tickerBadge.dataset.dueAt = item.dueAt ? item.dueAt.toISOString() : '';
          tickerBadge.classList.add('bunkr-active-ticker');
        }
        metaEl.appendChild(tickerBadge);

        infoEl.appendChild(metaEl);
        rowEl.appendChild(infoEl);

        // Quick Actions
        const actionsEl = doc.createElement('div');
        actionsEl.className = 'bunkr-assign-actions';

        if (item.url && item.url !== '#') {
          const submitBtn = doc.createElement('a');
          submitBtn.className = 'bunkr-action-btn bunkr-action-submit';
          submitBtn.href = item.submitUrl || getSubmitUrl(item.url);
          submitBtn.target = '_blank';
          submitBtn.rel = 'noopener noreferrer';
          submitBtn.innerHTML = '🚀 Submit';
          actionsEl.appendChild(submitBtn);

          const rubricBtn = doc.createElement('a');
          rubricBtn.className = 'bunkr-action-btn bunkr-action-rubric';
          rubricBtn.href = item.rubricUrl || getRubricUrl(item.url);
          rubricBtn.target = '_blank';
          rubricBtn.rel = 'noopener noreferrer';
          rubricBtn.innerHTML = '📋 Rubric';
          actionsEl.appendChild(rubricBtn);
        }

        rowEl.appendChild(actionsEl);
        listEl.appendChild(rowEl);
      }

      bodyEl.appendChild(listEl);
    }

    radarEl.appendChild(bodyEl);

    // Insert into container
    container.insertBefore(radarEl, container.firstChild);

    // Start live countdown updater for Red badges
    startLiveTicker(radarEl);

    return radarEl;
  }

  let activeTickerInterval = null;

  /**
   * Live Countdown Ticker updater (runs every 30 seconds)
   */
  function startLiveTicker(radarContainer) {
    if (activeTickerInterval) {
      clearInterval(activeTickerInterval);
    }

    if (!radarContainer || typeof window === 'undefined') return;

    activeTickerInterval = setInterval(() => {
      if (!radarContainer.isConnected) {
        clearInterval(activeTickerInterval);
        return;
      }

      const activeBadges = radarContainer.querySelectorAll('.bunkr-active-ticker');
      const now = new Date();

      activeBadges.forEach(badge => {
        const iso = badge.dataset.dueAt;
        if (!iso) return;
        const dueAt = new Date(iso);
        if (isNaN(dueAt.getTime())) return;
        const ticker = getCountdownTicker(dueAt, now);
        if (ticker) {
          badge.textContent = ticker;
        }
      });
    }, 30000);
  }

  /**
   * Main Content Script Initializer for Canvas LMS
   */
  function init(options = {}) {
    if (typeof document === 'undefined') return false;

    // Check if already initialized
    if (document.getElementById('canvas_deadline_radar')) {
      return true;
    }

    // Identify target injection container
    const targetContainer =
      document.querySelector('#assignment_groups') ||
      document.querySelector('.assignment-list') ||
      document.querySelector('#assignments') ||
      document.querySelector('#content .header-bar')?.parentElement ||
      document.querySelector('#content') ||
      document.querySelector('#dashboard');

    if (!targetContainer) {
      return false;
    }

    // Scrape assignments
    const assignments = scrapeAssignmentsFromPage(document);
    if (!assignments || assignments.length === 0) {
      return false;
    }

    // Render Deadline Radar
    renderDeadlineRadar(targetContainer, assignments);
    return true;
  }

  // Exported Engine API
  return {
    classifyDeadline,
    getCountdownTicker,
    formatTimeRemaining,
    parseCanvasDate,
    formatIcsDate,
    escapeIcs,
    getSubmitUrl,
    getRubricUrl,
    generateDeadlinesIcs,
    downloadDeadlinesIcs,
    parseCanvasAssignmentsFromHtml,
    scrapeAssignmentsFromPage,
    renderDeadlineRadar,
    init,
    run: init
  };
});
