// Bunkr — Core Attendance Math & Drift Engine
// Phase 2: Proactive Nudges & Schedule Verification
// Neutral, friendly English • Pure Vanilla JS • Universal UMD Module

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const timetable = require('../data/timetable');
    module.exports = factory(timetable);
  } else {
    root.BunkrEngine = root.AttendMateEngine = factory(root.BunkrTimetable || root.AttendMateTimetable);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (timetableModule) {
  'use strict';

  const defaultTimetable = timetableModule || (typeof root !== 'undefined' ? (root.BunkrTimetable || root.AttendMateTimetable) : null);
  let activeTimetable = defaultTimetable;

  function setActiveTimetable(custom) {
    if (custom && custom.SLOTS) {
      activeTimetable = custom;
    } else {
      activeTimetable = defaultTimetable;
    }
    return activeTimetable;
  }

  function getActiveTimetable() {
    return activeTimetable;
  }

  const SUBJECT_ACRONYMS = {
    psp: 'PSP',
    wad: 'WAD',
    math: 'MATH',
    social: 'Social Comm',
    cfn: 'CFN',
    india: 'India',
    kpmg: 'KPMG',
    society: 'Self & Society'
  };

  /**
   * Plain-language relative freshness formatter
   * Examples: "Synced just now from Rishiverse", "Synced 5 min ago from Rishiverse"
   */
  function formatFreshness(timestamp, portalName = 'Rishiverse', now = Date.now()) {
    if (!timestamp) return 'Not yet synced';
    const ts = typeof timestamp === 'string' ? new Date(timestamp).getTime() : Number(timestamp);
    if (isNaN(ts) || ts <= 0) return 'Not yet synced';

    const diffSeconds = Math.max(0, Math.floor((now - ts) / 1000));

    let relativeStr = '';
    if (diffSeconds < 15) {
      relativeStr = 'just now';
    } else if (diffSeconds < 60) {
      relativeStr = `${diffSeconds}s ago`;
    } else {
      const minutes = Math.floor(diffSeconds / 60);
      if (minutes < 60) {
        relativeStr = `${minutes} min ago`;
      } else {
        const hours = Math.floor(minutes / 60);
        if (hours < 24) {
          relativeStr = `${hours} hr${hours === 1 ? '' : 's'} ago`;
        } else {
          const days = Math.floor(hours / 24);
          relativeStr = `${days} day${days === 1 ? '' : 's'} ago`;
        }
      }
    }

    const cleanPortal = portalName ? ` from ${portalName}` : '';
    return `Synced ${relativeStr}${cleanPortal}`;
  }

  function parseDateString(str, endOfDay = false) {
    if (!str) return null;
    if (str instanceof Date) {
      const d = new Date(str.getTime());
      if (endOfDay) d.setHours(23, 59, 59, 999);
      else d.setHours(0, 0, 0, 0);
      return d;
    }
    if (typeof str === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(str.trim())) {
      const [y, m, d] = str.trim().split('-').map(Number);
      if (endOfDay) return new Date(y, m - 1, d, 23, 59, 59, 999);
      return new Date(y, m - 1, d, 0, 0, 0, 0);
    }
    const d = new Date(str);
    if (isNaN(d.getTime())) return null;
    if (endOfDay) d.setHours(23, 59, 59, 999);
    else d.setHours(0, 0, 0, 0);
    return d;
  }

  /**
   * Schedule Verification & Calendar Boundary Checkers
   */
  function isDateInSemester(date, customTimetable = null) {
    const currentTimetable = customTimetable || activeTimetable || defaultTimetable;
    const d = new Date(date);
    let semStart = new Date(2026, 7, 10, 0, 0, 0); // 2026-08-10
    let semEnd = new Date(2026, 11, 18, 23, 59, 59); // 2026-12-18

    if (currentTimetable) {
      const startRaw = currentTimetable.startDate || (currentTimetable.SEMESTER && currentTimetable.SEMESTER.startDate);
      const endRaw = currentTimetable.endDate || (currentTimetable.SEMESTER && currentTimetable.SEMESTER.endDate);
      const parsedStart = parseDateString(startRaw, false);
      const parsedEnd = parseDateString(endRaw, true);
      if (parsedStart) semStart = parsedStart;
      if (parsedEnd) semEnd = parsedEnd;
    }
    return d >= semStart && d <= semEnd;
  }

  function isDateInDiwaliBreak(date, customTimetable = null) {
    const currentTimetable = customTimetable || activeTimetable || defaultTimetable;
    const d = new Date(date);
    let diwaliStart = new Date(2026, 10, 6, 0, 0, 0); // Nov 6, 2026
    let diwaliEnd = new Date(2026, 10, 13, 23, 59, 59); // Nov 13, 2026

    if (currentTimetable) {
      const db = currentTimetable.diwaliBreak || (currentTimetable.SEMESTER && currentTimetable.SEMESTER.diwaliBreak);
      if (db && db.start && db.end) {
        const parsedStart = parseDateString(db.start, false);
        const parsedEnd = parseDateString(db.end, true);
        if (parsedStart && parsedEnd) {
          return d >= parsedStart && d <= parsedEnd;
        }
      }
      if (currentTimetable.custom && !db && !currentTimetable.holidays) {
        return false;
      }
      if (Array.isArray(currentTimetable.holidays)) {
        for (const h of currentTimetable.holidays) {
          if (h && h.start && h.end) {
            const hs = parseDateString(h.start, false);
            const he = parseDateString(h.end, true);
            if (hs && he && d >= hs && d <= he) return true;
          }
        }
        return false;
      }
    }
    return d >= diwaliStart && d <= diwaliEnd;
  }

  /**
   * Retrieves today's classes sorted chronologically by start time.
   * Returns empty array if Sunday, outside semester, or during Diwali break.
   */
  function getTodaysClasses(date = new Date(), customTimetable = null) {
    const currentTimetable = customTimetable || activeTimetable || defaultTimetable;
    const d = new Date(date);
    if (!isDateInSemester(d, currentTimetable) || isDateInDiwaliBreak(d, currentTimetable)) {
      return [];
    }

    const day = d.getDay();
    // 0 = Sunday, 6 = Saturday
    const hasSaturdaySlots = currentTimetable && currentTimetable.SLOTS &&
      Object.values(currentTimetable.SLOTS).some(s => Array.isArray(s.slots) && s.slots.some(sl => sl.day === 6));

    if (day === 0 || (!hasSaturdaySlots && day === 6)) {
      return [];
    }

    const slotsMap = (currentTimetable && currentTimetable.SLOTS) ? currentTimetable.SLOTS : {};
    const classesToday = [];

    for (const key of Object.keys(slotsMap)) {
      const subj = slotsMap[key];
      const acronym = subj.acronym || SUBJECT_ACRONYMS[key] || (subj.key ? subj.key.toUpperCase() : key.toUpperCase());
      if (!subj || !Array.isArray(subj.slots)) continue;

      for (const slot of subj.slots) {
        if (slot.day === day) {
          classesToday.push({
            subjectKey: subj.key || key,
            subjectName: subj.name || key,
            code: subj.code || '',
            acronym,
            day: slot.day,
            time: slot.time,
            endTime: slot.endTime,
            room: slot.room || ''
          });
        }
      }
    }

    // Sort chronologically by start time
    classesToday.sort((a, b) => {
      const [hA, mA] = a.time.split(':').map(Number);
      const [hB, mB] = b.time.split(':').map(Number);
      return (hA * 60 + mA) - (hB * 60 + mB);
    });

    return classesToday;
  }

  /**
   * Retrieves the next upcoming class today after currentTime.
   * Stays quiet (returns null) if no more classes today.
   */
  function getNextUpcomingClass(date = new Date(), customTimetable = null) {
    const classesToday = getTodaysClasses(date, customTimetable);
    if (classesToday.length === 0) return null;

    const curMinutes = date.getHours() * 60 + date.getMinutes();

    for (const c of classesToday) {
      const [h, m] = c.time.split(':').map(Number);
      const slotMinutes = h * 60 + m;
      if (slotMinutes > curMinutes) {
        return c;
      }
    }

    return null; // All classes for today have concluded
  }

  /**
   * Friendly One-Line Nudge Message
   * Format: "Move — [Acronym] starts [Time] in [Room]"
   * Fallback if no room: "Move — [Acronym] starts [Time]"
   */
  function formatNudgeMessage(session) {
    if (!session) return '';
    const label = session.acronym || session.subjectName || session.subjectKey.toUpperCase();
    if (session.room && session.room.trim().length > 0) {
      return `Move — ${label} starts ${session.time} in ${session.room}`;
    }
    return `Move — ${label} starts ${session.time}`;
  }

  /**
   * Proactive Nudge Gatekeeper
   * Exactly one nudge per class, respects lead time, suppress missed replay mid-day.
   */
  function shouldSendNudge(session, now = new Date(), options = {}) {
    const nudgesEnabled = options.nudgesEnabled !== false;
    if (!nudgesEnabled) {
      return { send: false, reason: 'Nudges disabled by user' };
    }

    if (!session) {
      return { send: false, reason: 'No session provided' };
    }

    const currentTimetable = options.timetable || activeTimetable || defaultTimetable;
    const d = new Date(now);
    if (!isDateInSemester(d, currentTimetable)) {
      return { send: false, reason: 'Outside semester date boundary' };
    }

    if (isDateInDiwaliBreak(d, currentTimetable)) {
      return { send: false, reason: 'Diwali break; no classes scheduled' };
    }

    const hasSaturdaySlots = currentTimetable && currentTimetable.SLOTS &&
      Object.values(currentTimetable.SLOTS).some(s => Array.isArray(s.slots) && s.slots.some(sl => sl.day === 6));

    if (d.getDay() === 0 || (!hasSaturdaySlots && d.getDay() === 6)) {
      return { send: false, reason: 'Sunday; silence is default state' };
    }

    const leadMinutes = typeof options.leadMinutes === 'number' ? options.leadMinutes : 10;
    const sentNudges = Array.isArray(options.sentNudges) ? options.sentNudges : [];

    const [h, m] = session.time.split(':').map(Number);
    const sessionTimeMinutes = h * 60 + m;
    const nowMinutes = d.getHours() * 60 + d.getMinutes();
    const diffMinutes = sessionTimeMinutes - nowMinutes;

    const dateStr = d.toISOString().slice(0, 10);
    const nudgeKey = `${dateStr}_${session.subjectKey}_${session.time}`;

    // 1. If already sent, never send duplicate
    if (sentNudges.includes(nudgeKey)) {
      return { send: false, reason: 'Already sent nudge for this class instance', nudgeKey };
    }

    // 2. Mid-day browser open: do not replay missed alerts
    if (diffMinutes < 0) {
      return { send: false, reason: 'Class has already started; missed alerts are suppressed', nudgeKey };
    }

    // 3. Check lead time window
    if (diffMinutes > leadMinutes) {
      return { send: false, reason: `More than ${leadMinutes} minutes away (${diffMinutes}m remaining)`, nudgeKey };
    }

    // 4. Within lead window and not yet sent
    return {
      send: true,
      nudgeKey,
      minutesRemaining: diffMinutes,
      message: formatNudgeMessage(session),
      title: 'Bunkr Class Alert'
    };
  }

  function matchSubjectKeyInTimetable(subjectName, currentTimetable) {
    if (!subjectName || !currentTimetable || !currentTimetable.SLOTS) return null;
    if (typeof currentTimetable.matchSubjectKey === 'function') {
      const k = currentTimetable.matchSubjectKey(subjectName);
      if (k) return k;
    }
    const l = (subjectName || '').toLowerCase().trim();
    const slotsMap = currentTimetable.SLOTS;
    for (const [key, subj] of Object.entries(slotsMap)) {
      if (key.toLowerCase() === l) return key;
      const sName = (subj.name || '').toLowerCase().trim();
      const sCode = (subj.code || '').toLowerCase().trim();
      const sAcronym = (subj.acronym || '').toLowerCase().trim();
      if (sName && (l === sName || l.includes(sName) || sName.includes(l))) return key;
      if (sCode && (l === sCode || l.includes(sCode))) return key;
      if (sAcronym && (l === sAcronym || l.includes(sAcronym))) return key;
    }
    return null;
  }

  /**
   * Actionable Remaining Class Estimator
   * Dynamically counts remaining sessions from fromDate until semester end,
   * skipping official holidays/Diwali break, Sundays, and non-class Saturdays.
   */
  function getDynamicRemainingClasses(subjectName, fromDate = new Date(), options = {}) {
    const currentTimetable = options.timetable || activeTimetable || defaultTimetable;
    const slotsMap = (currentTimetable && currentTimetable.SLOTS) ? currentTimetable.SLOTS : null;
    let matchKey = matchSubjectKeyInTimetable(subjectName, currentTimetable);

    if (!matchKey) {
      const l = (subjectName || '').toLowerCase();
      if (l.includes('problem solving') || l.includes('psp')) matchKey = 'psp';
      else if (l.includes('web application') || l.includes('wad')) matchKey = 'wad';
      else if (l.includes('mathematics') || l.includes('math')) matchKey = 'math';
      else if (l.includes('social communication') || l.includes('social')) matchKey = 'social';
      else if (l.includes('networking') || l.includes('cfn') || l.includes('computer fundamentals')) matchKey = 'cfn';
      else if (l.includes('understanding india') || l.includes('india')) matchKey = 'india';
      else if (l.includes('kpmg') || l.includes('workshop') || l.includes('edept')) matchKey = 'kpmg';
      else if (l.includes('self and society') || l.includes('society')) matchKey = 'society';
    }

    let semStart = new Date(2026, 7, 10, 0, 0, 0); // 2026-08-10
    let endDate = options.endDate ? parseDateString(options.endDate, true) : new Date(2026, 11, 18, 23, 59, 59); // Dec 18, 2026 finish line

    if (currentTimetable) {
      if (!options.startDate) {
        const startRaw = currentTimetable.startDate || (currentTimetable.SEMESTER && currentTimetable.SEMESTER.startDate);
        const parsedStart = parseDateString(startRaw, false);
        if (parsedStart) semStart = parsedStart;
      }

      if (!options.endDate) {
        const endRaw = currentTimetable.endDate || (currentTimetable.SEMESTER && currentTimetable.SEMESTER.endDate);
        const parsedEnd = parseDateString(endRaw, true);
        if (parsedEnd) endDate = parsedEnd;
      }
    }

    let diwaliStart = new Date(2026, 10, 6, 0, 0, 0);
    let diwaliEnd = new Date(2026, 10, 13, 23, 59, 59);
    let hasDiwali = true;
    if (currentTimetable) {
      const db = currentTimetable.diwaliBreak || (currentTimetable.SEMESTER && currentTimetable.SEMESTER.diwaliBreak);
      if (db && db.start && db.end) {
        const parsedStart = parseDateString(db.start, false);
        const parsedEnd = parseDateString(db.end, true);
        if (parsedStart && parsedEnd) {
          diwaliStart = parsedStart;
          diwaliEnd = parsedEnd;
        }
      } else if (currentTimetable.custom && !db && !currentTimetable.holidays) {
        hasDiwali = false;
      }
    }

    const hasSaturdaySlots = currentTimetable && currentTimetable.SLOTS &&
      Object.values(currentTimetable.SLOTS).some(s => Array.isArray(s.slots) && s.slots.some(sl => sl.day === 6));

    let refDate = new Date(fromDate);
    const expectedYear = semStart.getFullYear();
    if (isNaN(refDate.getTime())) {
      refDate = new Date(expectedYear, 10, 3, 10, 0, 0);
    } else if (refDate.getFullYear() !== expectedYear && !options.preserveYear) {
      refDate = new Date(expectedYear, refDate.getMonth(), refDate.getDate(), refDate.getHours(), refDate.getMinutes());
    }

    // Edge case: After semester end date -> 0 sessions remain
    if (refDate > endDate) {
      return 0;
    }

    // Edge case: Before semester start date -> start counting from semester start
    if (refDate < semStart) {
      refDate = new Date(semStart);
    }

    const subjectSlots = slotsMap && matchKey && slotsMap[matchKey] ? slotsMap[matchKey].slots : null;

    if (!subjectSlots) {
      let count = 0;
      let d = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate() + 1);
      while (d <= endDate) {
        if (!hasDiwali || !(d >= diwaliStart && d <= diwaliEnd)) {
          const day = d.getDay();
          const isDayOff = day === 0 || (!hasSaturdaySlots && day === 6);
          if (!isDayOff && (day === 1 || day === 3 || (hasSaturdaySlots && day === 6))) count++;
        }
        d.setDate(d.getDate() + 1);
      }
      return count;
    }

    let remainingCount = 0;
    const curYear = refDate.getFullYear();
    const curMonth = refDate.getMonth();
    const curDate = refDate.getDate();
    const curDay = refDate.getDay();
    const curTimeMinutes = refDate.getHours() * 60 + refDate.getMinutes();

    const isTodayInDiwali = hasDiwali && refDate >= diwaliStart && refDate <= diwaliEnd;
    const isTodayOff = curDay === 0 || (!hasSaturdaySlots && curDay === 6);
    if (!isTodayInDiwali && !isTodayOff) {
      for (const slot of subjectSlots) {
        if (slot.day === curDay) {
          const [h, m] = slot.time.split(':').map(Number);
          const slotMinutes = h * 60 + m;
          if (slotMinutes > curTimeMinutes) {
            remainingCount++;
          }
        }
      }
    }

    let iter = new Date(curYear, curMonth, curDate + 1);
    while (iter <= endDate) {
      if (hasDiwali && iter >= diwaliStart && iter <= diwaliEnd) {
        iter.setDate(iter.getDate() + 1);
        continue;
      }

      const day = iter.getDay();
      const isDayOff = day === 0 || (!hasSaturdaySlots && day === 6);
      if (!isDayOff) {
        for (const slot of subjectSlots) {
          if (slot.day === day) {
            remainingCount++;
          }
        }
      }
      iter.setDate(iter.getDate() + 1);
    }

    return remainingCount;
  }

  /**
   * Actionable Deficit Recovery and Bunk Math
   */
  function calculateBunkWithDeficitRecovery(attended, totalHeld, remainingClasses, targetPercentage = 75) {
    const finalTotal = totalHeld + remainingClasses;
    const minRequired = Math.ceil((targetPercentage / 100) * finalTotal);
    const mustAttend = Math.max(0, minRequired - attended);
    const canBunk = Math.max(0, remainingClasses - mustAttend);
    const isAttainable = mustAttend <= remainingClasses;

    const maxAttainableAttended = attended + remainingClasses;
    const maxAttainablePct = finalTotal > 0 ? (maxAttainableAttended / finalTotal) * 100 : 0;
    const shortfall = Math.max(0, mustAttend - remainingClasses);

    let statusText = '';
    let badgeClass = '';
    let advice = '';
    let subText = '';

    if (isAttainable) {
      if (canBunk > 0) {
        statusText = `Can bunk: <span class="am-num">${canBunk}</span> class${canBunk === 1 ? '' : 'es'} (till Dec 18)`;
        badgeClass = 'safe';
        advice = `Attend ${mustAttend} of ${remainingClasses} remaining classes to finish at ${((attended + mustAttend) / finalTotal * 100).toFixed(1)}%.`;
      } else {
        statusText = `Can bunk: <span class="am-num">0</span> classes (Need all ${remainingClasses} left)`;
        badgeClass = 'warning';
        advice = `Attend all ${remainingClasses} remaining classes to reach ${targetPercentage}%.`;
      }
    } else {
      statusText = `Deficit: Need all ${remainingClasses} classes (Max: ${maxAttainablePct.toFixed(1)}%)`;
      badgeClass = 'deficit';
      subText = `Short by ${shortfall} class${shortfall === 1 ? '' : 'es'} • 1 excused/medical leave needed`;
      advice = `Short by ${shortfall} class${shortfall === 1 ? '' : 'es'}. Submitting 1 medical/duty leave or attending a compensatory class reaches ${(Math.min(100, (maxAttainableAttended + 1) / finalTotal * 100)).toFixed(1)}%.`;
    }

    return {
      remainingClasses,
      finalTotal,
      mustAttend,
      canBunk,
      isAttainable,
      maxAttainablePct,
      shortfall,
      statusText,
      badgeClass,
      advice,
      subText
    };
  }

  /**
   * Calculates how many consecutive upcoming classes can be bunked while keeping
   * attendance at or above targetPercentage.
   * canBunk = max(0, floor(attended / (target/100) - held))
   */
  function calculateBunkableClasses(attended, held, targetPercentage = 75) {
    if (held <= 0 || targetPercentage <= 0) return 0;
    const targetRatio = targetPercentage / 100.0;
    const currentRatio = attended / held;
    if (currentRatio < targetRatio) return 0;

    let bunkable = Math.floor((attended - targetRatio * held) / targetRatio + 1e-9);
    if (bunkable < 0) bunkable = 0;

    while (bunkable > 0 && (attended / (held + bunkable)) < targetRatio) {
      bunkable--;
    }
    while ((attended / (held + bunkable + 1)) >= targetRatio) {
      bunkable++;
    }
    return bunkable;
  }

  /**
   * Calculates how many consecutive upcoming classes must be attended to reach
   * targetPercentage.
   * needToAttend = ceil((target * held - attended) / (1 - target/100))
   * Returns 0 if already at or above target.
   * Returns -1 if target >= 100% and attendance < 100% (unreachable).
   */
  function calculateClassesNeeded(attended, held, targetPercentage = 75) {
    if (held <= 0) return 0;
    const targetRatio = targetPercentage / 100.0;
    const currentRatio = attended / held;
    if (currentRatio >= targetRatio) return 0;
    if (targetRatio >= 1.0) return -1; // Unreachable

    let needed = Math.ceil((targetRatio * held - attended) / (1.0 - targetRatio) - 1e-9);
    if (needed < 1) needed = 1;

    while ((attended + needed) / (held + needed) < targetRatio) {
      needed++;
    }
    while (needed > 1 && ((attended + needed - 1) / (held + needed - 1)) >= targetRatio) {
      needed--;
    }
    return needed;
  }

  /**
   * Drift Detection:
   */
  function detectDrift(previousData, newData) {
    if (!newData || !Array.isArray(newData.subjects) || newData.subjects.length === 0) {
      return {
        drifted: true,
        reason: 'The scrape returned 0 courses. The ERP portal structure may have changed.',
        type: 'empty_scrape'
      };
    }

    if (!previousData || !Array.isArray(previousData.subjects) || previousData.subjects.length === 0) {
      return { drifted: false };
    }

    const prevSubjects = previousData.subjects;
    const newSubjects = newData.subjects;

    if (prevSubjects.length >= 3 && newSubjects.length < Math.ceil(prevSubjects.length / 2)) {
      return {
        drifted: true,
        reason: `Course count dropped sharply from ${prevSubjects.length} to ${newSubjects.length}.`,
        type: 'course_count_drop'
      };
    }

    const prevMap = new Map();
    for (const s of prevSubjects) {
      const key = (s.code || s.name || '').trim().toLowerCase();
      if (key) prevMap.set(key, s);
    }

    for (const curr of newSubjects) {
      const key = (curr.code || curr.name || '').trim().toLowerCase();
      const prev = prevMap.get(key);
      if (!prev) continue;

      if (prev.total > 0 && curr.total < prev.total) {
        const heldDrop = prev.total - curr.total;
        const heldDropRatio = heldDrop / prev.total;
        if (curr.total === 0 || (heldDrop >= 3 && heldDropRatio > 0.15)) {
          return {
            drifted: true,
            reason: `Total classes held for "${curr.name}" dropped from ${prev.total} to ${curr.total}.`,
            type: 'held_dropped'
          };
        }
      }

      if (prev.attended > 0 && curr.attended < prev.attended) {
        const attendedDrop = prev.attended - curr.attended;
        const attendedDropRatio = attendedDrop / prev.attended;
        if ((prev.attended >= 3 && curr.attended === 0) || (attendedDrop >= 3 && attendedDropRatio > 0.15)) {
          return {
            drifted: true,
            reason: `Attended classes for "${curr.name}" dropped from ${prev.attended} to ${curr.attended}.`,
            type: 'attended_dropped'
          };
        }
      }

      if (prev.total >= 10 && curr.total > prev.total * 1.5) {
        return {
          drifted: true,
          reason: `Conducted classes for "${curr.name}" jumped sharply from ${prev.total} to ${curr.total}.`,
          type: 'sharp_jump'
        };
      }
    }

    return { drifted: false };
  }

  /**
   * Human Override Resolver
   */
  function applyOverrides(subjects, overrides = {}) {
    if (!Array.isArray(subjects)) return [];
    if (!overrides || typeof overrides !== 'object') return subjects;

    return subjects.map((subj) => {
      const key1 = (subj.name || '').trim().toLowerCase();
      const key2 = (subj.code || '').trim().toLowerCase();
      const key3 = subj.id ? String(subj.id).toLowerCase() : null;

      const override = overrides[key1] || (key2 && overrides[key2]) || (key3 && overrides[key3]);

      if (override && typeof override.attended === 'number' && typeof override.total === 'number') {
        const attended = Math.max(0, override.attended);
        const total = Math.max(attended, override.total);
        const pct = total > 0 ? (attended / total) * 100 : 0;

        return {
          ...subj,
          scrapedAttended: subj.attended,
          scrapedTotal: subj.total,
          attended,
          total,
          absent: Math.max(0, total - attended),
          percentage: pct,
          isManualOverride: true,
          overrideReason: override.reason || 'User corrected'
        };
      }

      return {
        ...subj,
        isManualOverride: false
      };
    });
  }

  /**
   * One-Click Diagnostics Generator
   */
  function generateDiagnostics(state = {}) {
    const now = new Date();
    const version = state.version || '2.4.1';
    const url = state.url || (typeof window !== 'undefined' ? window.location.href : 'N/A');
    const domain = state.domain || (typeof window !== 'undefined' ? window.location.hostname : 'N/A');
    const domTables = state.domTablesCount ?? (typeof document !== 'undefined' ? document.querySelectorAll('table').length : 0);
    const domCards = state.domCardsCount ?? 0;
    const subjects = state.subjects || [];
    const drift = state.drift || { drifted: false };
    const overrides = state.overrides || {};
    const lastSync = state.lastSync || state.timestamp || null;
    const errorCount = state.consecutiveErrors || 0;
    const nudgesEnabled = state.nudgesEnabled !== false;
    const nudgeLead = state.nudgeLeadMinutes || 10;

    let text = `### Bunkr Diagnostics (v${version})\n`;
    text += `- **Generated**: ${now.toISOString()} (${now.toLocaleTimeString()})\n`;
    text += `- **Host**: \`${domain}\` | URL: \`${url.slice(0, 80)}\`\n`;
    text += `- **DOM Elements**: Tables: ${domTables}, Cards: ${domCards}\n`;
    text += `- **Last Sync**: ${lastSync ? new Date(lastSync).toISOString() : 'Never'}\n`;
    text += `- **Scrape Status**: ${drift.drifted ? `⚠️ Drift Detected (${drift.reason})` : '✅ Clean Scrape'}\n`;
    text += `- **Nudge System**: ${nudgesEnabled ? `Enabled (${nudgeLead}m lead time)` : 'Disabled'}\n`;
    text += `- **Error Count / Circuit Breaker**: ${errorCount} consecutive errors (Threshold: 3)\n`;
    text += `- **Courses Parsed**: ${subjects.length}\n`;

    const overrideKeys = Object.keys(overrides);
    text += `- **Active Overrides**: ${overrideKeys.length} courses manually overridden\n\n`;

    text += `#### Courses Overview\n`;
    if (subjects.length === 0) {
      text += `*No courses found in current scrape.*\n`;
    } else {
      subjects.forEach((s, idx) => {
        const tag = s.isManualOverride ? `[MANUAL OVERRIDE: was ${s.scrapedAttended}/${s.scrapedTotal}]` : `[SCRAPED]`;
        text += `${idx + 1}. **${s.name}**: ${s.attended}/${s.total} (${s.percentage ? s.percentage.toFixed(1) : 0}%) ${tag}\n`;
      });
    }

    return text;
  }

  /**
   * Phase 3: Dynamic Semester Projection & Coach Engine
   * Derives where attendance lands by semester end (2026-12-18):
   * 1. At current pace
   * 2. If student attends every remaining session
   * Includes Coach callouts (silence for healthy courses, factual gap for courses trending below target)
   */
  function calculateSemesterProjection(subjects, options = {}) {
    const rawSubjects = Array.isArray(subjects) ? subjects : [];
    let targetPct = 75;
    let refDate = new Date();
    let overrides = {};
    let drift = null;
    let isStale = false;
    let endDate = null;
    let currentTimetable = activeTimetable || defaultTimetable;

    if (typeof options === 'number') {
      targetPct = options;
      if (arguments[2]) {
        refDate = new Date(arguments[2]);
      }
    } else if (options && typeof options === 'object') {
      if (typeof options.targetPercentage === 'number') targetPct = options.targetPercentage;
      if (options.now) refDate = new Date(options.now);
      if (options.overrides) overrides = options.overrides;
      if (options.drift) drift = options.drift;
      if (options.isStale) isStale = Boolean(options.isStale);
      if (options.endDate) endDate = new Date(options.endDate);
      if (options.timetable) currentTimetable = options.timetable;
    }

    const resolvedSubjects = applyOverrides(rawSubjects, overrides);

    if (!endDate) {
      if (currentTimetable && currentTimetable.endDate) {
        const e = new Date(currentTimetable.endDate);
        if (!isNaN(e.getTime())) {
          if (typeof currentTimetable.endDate === 'string' && currentTimetable.endDate.length <= 10) {
            e.setHours(23, 59, 59, 999);
          }
          endDate = e;
        }
      } else if (currentTimetable && currentTimetable.SEMESTER && currentTimetable.SEMESTER.endDate) {
        const e = new Date(currentTimetable.SEMESTER.endDate);
        if (!isNaN(e.getTime())) {
          if (typeof currentTimetable.SEMESTER.endDate === 'string' && currentTimetable.SEMESTER.endDate.length <= 10) {
            e.setHours(23, 59, 59, 999);
          }
          endDate = e;
        }
      } else {
        endDate = new Date(2026, 11, 18, 23, 59, 59);
      }
    }

    let totalAttended = 0;
    let totalHeld = 0;
    let totalRemainingSessions = 0;
    let totalProjectedAttendedAtPace = 0;
    let totalMaxAttainableAttended = 0;

    const perCourse = resolvedSubjects.map((s) => {
      const matchKey = matchSubjectKeyInTimetable(s.name || s.code, currentTimetable);
      const subjFromSlots = currentTimetable && currentTimetable.SLOTS && matchKey ? currentTimetable.SLOTS[matchKey] : null;
      const acronym = (subjFromSlots && subjFromSlots.acronym) || (matchKey && SUBJECT_ACRONYMS[matchKey]) || s.code || s.name;
      const remaining = getDynamicRemainingClasses(s.name, refDate, { endDate, timetable: currentTimetable });
      const attended = typeof s.attended === 'number' ? Math.max(0, s.attended) : 0;
      const total = typeof s.total === 'number' ? Math.max(attended, s.total) : 0;
      const currentPct = total > 0 ? (attended / total) * 100 : 0;

      totalAttended += attended;
      totalHeld += total;
      totalRemainingSessions += remaining;

      // Current pace calculation
      const paceRate = total > 0 ? (attended / total) : 1.0;
      const expectedFutureAttended = paceRate * remaining;
      const projAttendedAtPace = attended + expectedFutureAttended;
      const finalTotal = total + remaining;
      const projPctAtPace = finalTotal > 0 ? (projAttendedAtPace / finalTotal) * 100 : currentPct;

      totalProjectedAttendedAtPace += projAttendedAtPace;

      // Max attainable if attending 100% of remaining
      const maxAttended = attended + remaining;
      const maxPct = finalTotal > 0 ? (maxAttended / finalTotal) * 100 : currentPct;
      totalMaxAttainableAttended += maxAttended;

      // Bunk math & attendance metrics derived directly from engine functions
      const canBunk = calculateBunkableClasses(attended, total, targetPct);
      const needToAttend = calculateClassesNeeded(attended, total, targetPct);
      const bunkMath = calculateBunkWithDeficitRecovery(attended, total, remaining, targetPct);

      // Coach evaluation: speaks ONLY if trending below target
      let callout = null;
      const isTrendingBelow = projPctAtPace < targetPct;

      if (isTrendingBelow) {
        if (!bunkMath.isAttainable) {
          callout = `Trending below target: max finish is ${maxPct.toFixed(1)}% (${bunkMath.shortfall} session shortfall)`;
        } else {
          const sessionGap = needToAttend;
          callout = `Trending to finish at ${projPctAtPace.toFixed(1)}% (${sessionGap} session gap to secure ${targetPct}%)`;
        }
      }

      return {
        name: s.name,
        code: s.code || '',
        acronym,
        attended,
        total,
        currentPct,
        remaining,
        finalTotal,
        projPctAtPace,
        maxPct,
        canBunk,
        needToAttend,
        sessionGap: needToAttend,
        mustAttend: bunkMath.mustAttend,
        isAttainable: bunkMath.isAttainable,
        shortfall: bunkMath.shortfall,
        isManualOverride: Boolean(s.isManualOverride),
        isTrendingBelow,
        callout
      };
    });

    const finalSemesterTotal = totalHeld + totalRemainingSessions;
    const currentOverallPct = totalHeld > 0 ? (totalAttended / totalHeld) * 100 : 0;
    const overallPacePct = finalSemesterTotal > 0 ? (totalProjectedAttendedAtPace / finalSemesterTotal) * 100 : currentOverallPct;
    const overallMaxPct = finalSemesterTotal > 0 ? (totalMaxAttainableAttended / finalSemesterTotal) * 100 : currentOverallPct;

    const isSemesterComplete = totalRemainingSessions === 0;
    const isStaleData = Boolean(isStale || (drift && drift.drifted));
    const atRiskCourses = perCourse.filter((c) => c.callout !== null);

    return {
      totalAttended,
      totalHeld,
      currentOverallPct,
      totalRemainingSessions,
      finalSemesterTotal,
      overallPacePct,
      overallMaxPct,
      targetPercentage: targetPct,
      isSemesterComplete,
      isStale: isStaleData,
      staleNotice: isStaleData ? 'Based on last known data' : null,
      perCourse,
      atRiskCourses,
      coachHealthySummary: atRiskCourses.length === 0
        ? `All ${perCourse.length} courses are trending at or above your ${targetPct}% target.`
        : `${atRiskCourses.length} of ${perCourse.length} course${atRiskCourses.length === 1 ? '' : 's'} trending below ${targetPct}% target.`
    };
  }

  /**
   * Phase 3: Plain-Text Share Status for WhatsApp
   * Clean, short lines, text-only, no links, no images, no tracking.
   */
  function generateShareText(state, options = {}) {
    const projection = calculateSemesterProjection(state.subjects || [], {
      now: options.now || state.timestamp,
      targetPercentage: options.targetPercentage || state.targetPercentage || 75,
      overrides: state.overrides || {},
      drift: state.drift,
      isStale: state.isStale
    });

    const date = options.now ? new Date(options.now) : (state.timestamp ? new Date(state.timestamp) : new Date());
    const dateFormatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    let lines = [];
    lines.push(`Bunkr Status • ${dateFormatted}`);
    lines.push(`Overall: ${projection.currentOverallPct.toFixed(1)}% (Target: ${projection.targetPercentage}%)`);

    if (projection.isSemesterComplete) {
      lines.push(`Semester Complete (Final)`);
    } else {
      lines.push(`Projected: ${projection.overallPacePct.toFixed(1)}% at pace • ${projection.overallMaxPct.toFixed(1)}% max`);
      if (projection.isStale) {
        lines.push(`(Based on last known data)`);
      }
    }

    lines.push(``);
    lines.push(`Courses:`);

    projection.perCourse.forEach((c) => {
      let statusNote = '';
      if (projection.isSemesterComplete) {
        statusNote = '';
      } else if (c.needToAttend > 0) {
        statusNote = ` — attend ${c.needToAttend} to reach ${projection.targetPercentage}%`;
      } else {
        statusNote = ` — can bunk ${c.canBunk}`;
      }

      const overrideTag = c.isManualOverride ? ` [manual]` : '';
      lines.push(`• ${c.acronym}: ${c.attended}/${c.total} (${c.currentPct.toFixed(1)}%)${overrideTag}${statusNote}`);
    });

    return lines.join('\n');
  }

  /**
   * Dynamic Semester Remaining Teaching Summary
   * Eliminates hardcoded teaching-day and session counts in UI banners & popups.
   */
  function getRemainingTeachingSummary(fromDate = new Date(), customTimetable = null) {
    const currentTimetable = customTimetable || activeTimetable || defaultTimetable;
    const slotsMap = (currentTimetable && currentTimetable.SLOTS) ? currentTimetable.SLOTS : {};
    let semStart = new Date(2026, 7, 10, 0, 0, 0);
    let endDate = new Date(2026, 11, 18, 23, 59, 59);

    if (currentTimetable) {
      const startRaw = currentTimetable.startDate || (currentTimetable.SEMESTER && currentTimetable.SEMESTER.startDate);
      const endRaw = currentTimetable.endDate || (currentTimetable.SEMESTER && currentTimetable.SEMESTER.endDate);
      const ps = parseDateString(startRaw, false);
      const pe = parseDateString(endRaw, true);
      if (ps) semStart = ps;
      if (pe) endDate = pe;
    }

    let refDate = new Date(fromDate);
    const expectedYear = semStart.getFullYear();
    if (isNaN(refDate.getTime())) {
      refDate = new Date(expectedYear, 10, 3, 10, 0, 0);
    } else if (refDate.getFullYear() !== expectedYear) {
      refDate = new Date(expectedYear, refDate.getMonth(), refDate.getDate(), refDate.getHours(), refDate.getMinutes());
    }

    let teachingDaysLeft = 0;
    let totalClassesLeft = 0;

    if (refDate <= endDate) {
      const startCursor = refDate < semStart ? new Date(semStart) : new Date(refDate);
      const curTimeMinutes = startCursor.getHours() * 60 + startCursor.getMinutes();

      // Count remaining sessions today
      const todaySessions = getTodaysClasses(startCursor, currentTimetable).filter((c) => {
        const [h, m] = c.time.split(':').map(Number);
        return (h * 60 + m) > curTimeMinutes;
      });
      if (todaySessions.length > 0) {
        teachingDaysLeft += 1;
        totalClassesLeft += todaySessions.length;
      }

      // Count future days
      const iter = new Date(startCursor.getFullYear(), startCursor.getMonth(), startCursor.getDate() + 1, 9, 0, 0);
      while (iter <= endDate) {
        const daySessions = getTodaysClasses(iter, currentTimetable);
        if (daySessions.length > 0) {
          teachingDaysLeft += 1;
          totalClassesLeft += daySessions.length;
        }
        iter.setDate(iter.getDate() + 1);
      }
    }

    const endDateFormatted = endDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    const semesterTitle = (currentTimetable && (currentTimetable.semester || (currentTimetable.SEMESTER && currentTimetable.SEMESTER.semester))) || 'Diwali Semester 2026';
    const subjectsCount = Object.keys(slotsMap).length;

    return {
      teachingDaysLeft,
      totalClassesLeft,
      subjectsCount,
      endDateFormatted,
      semesterTitle
    };
  }

  /**
   * Excused / Medical Leave Recovery Calculator
   * Computes how many excused/duty leaves (converting absences into credited attendance
   * without increasing total conducted sessions) are needed to reach targetPercentage.
   */
  function calculateExcusedRecovery(attended, total, targetPercentage = 75) {
    if (total <= 0) return { neededExcused: 0, maxRecoverablePct: 100, alreadySafe: true };
    const currentPct = (attended / total) * 100;
    const minRequired = Math.ceil((targetPercentage / 100) * total);
    const absent = Math.max(0, total - attended);
    if (currentPct >= targetPercentage) {
      return { neededExcused: 0, maxRecoverablePct: 100, alreadySafe: true };
    }
    const rawNeeded = Math.max(0, minRequired - attended);
    return {
      neededExcused: Math.min(rawNeeded, absent),
      possible: rawNeeded <= absent,
      maxRecoverablePct: total > 0 ? ((attended + absent) / total) * 100 : 100,
      alreadySafe: false
    };
  }

  /**
   * Trip / Leave Date-Range Planner
   * Simulates missing all scheduled classes across [startDate, endDate] using the active timetable,
   * with optional medical/duty leave credit.
   */
  function simulateLeavePlan(subjects, startDateInput, endDateInput, options = {}) {
    const rawSubjects = Array.isArray(subjects) ? subjects : [];
    const targetPct = typeof options.targetPercentage === 'number' ? options.targetPercentage : 75;
    const currentTimetable = options.timetable || activeTimetable || defaultTimetable;
    const overrides = options.overrides || {};
    const excusedLeaveCount = Math.max(0, parseInt(options.excusedLeaves, 10) || 0);

    const startD = parseDateString(startDateInput, false);
    const endD = parseDateString(endDateInput, true);

    if (!startD || !endD || endD < startD) {
      return {
        valid: false,
        error: 'End date must be on or after start date.',
        days: [],
        courses: [],
        totalMissedSessions: 0
      };
    }

    // Clamp overly long ranges to 45 days for responsiveness
    const maxDays = 45;
    const resolvedSubjects = applyOverrides(rawSubjects, overrides);

    // Count scheduled sessions per subjectKey across [startD, endD]
    const missedByKey = {};
    const days = [];
    const iter = new Date(startD.getFullYear(), startD.getMonth(), startD.getDate(), 9, 0, 0);
    let dayGuard = 0;

    while (iter <= endD && dayGuard < maxDays) {
      const dayClasses = getTodaysClasses(iter, currentTimetable);
      const iso = `${iter.getFullYear()}-${String(iter.getMonth() + 1).padStart(2, '0')}-${String(iter.getDate()).padStart(2, '0')}`;
      const dayLabel = iter.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      const isBreak = isDateInDiwaliBreak(iter, currentTimetable);

      days.push({
        date: iso,
        dayLabel,
        isHoliday: isBreak || iter.getDay() === 0,
        sessions: dayClasses
      });

      for (const cls of dayClasses) {
        missedByKey[cls.subjectKey] = (missedByKey[cls.subjectKey] || 0) + 1;
      }

      iter.setDate(iter.getDate() + 1);
      dayGuard++;
    }

    let overallAttBefore = 0;
    let overallTotalBefore = 0;
    let overallAttAfter = 0;
    let overallTotalAfter = 0;
    let totalMissedSessions = 0;

    const courses = resolvedSubjects.map((s) => {
      const matchKey = matchSubjectKeyInTimetable(s.name || s.code, currentTimetable);
      const subjFromSlots = currentTimetable && currentTimetable.SLOTS && matchKey ? currentTimetable.SLOTS[matchKey] : null;
      const acronym = (subjFromSlots && subjFromSlots.acronym) || (matchKey && SUBJECT_ACRONYMS[matchKey]) || s.code || s.name;
      const attended = Math.max(0, Number(s.attended) || 0);
      const total = Math.max(attended, Number(s.total) || 0);
      const missed = matchKey ? (missedByKey[matchKey] || 0) : 0;

      // Excused leave applies up to missed count for this course
      const excusedApplied = Math.min(missed, excusedLeaveCount);
      const afterAttended = attended + excusedApplied;
      const afterTotal = total + missed;

      const beforePct = total > 0 ? (attended / total) * 100 : 100;
      const afterPct = afterTotal > 0 ? (afterAttended / afterTotal) * 100 : beforePct;
      const deltaPct = afterPct - beforePct;

      const safeBefore = beforePct >= targetPct;
      const safeAfter = afterPct >= targetPct;
      const droppedBelowTarget = safeBefore && !safeAfter;
      const recoveryClasses = calculateClassesNeeded(afterAttended, afterTotal, targetPct);
      const excusedRecovery = calculateExcusedRecovery(afterAttended, afterTotal, targetPct);

      overallAttBefore += attended;
      overallTotalBefore += total;
      overallAttAfter += afterAttended;
      overallTotalAfter += afterTotal;
      totalMissedSessions += missed;

      return {
        name: s.name,
        code: s.code || '',
        acronym,
        matchKey,
        attended,
        total,
        missed,
        excusedApplied,
        afterAttended,
        afterTotal,
        beforePct,
        afterPct,
        deltaPct,
        safeBefore,
        safeAfter,
        droppedBelowTarget,
        recoveryClasses,
        excusedLeavesToSave: excusedRecovery.neededExcused
      };
    });

    const overallBeforePct = overallTotalBefore > 0 ? (overallAttBefore / overallTotalBefore) * 100 : 0;
    const overallAfterPct = overallTotalAfter > 0 ? (overallAttAfter / overallTotalAfter) * 100 : overallBeforePct;
    const overallDeltaPct = overallAfterPct - overallBeforePct;

    const atRiskCourses = courses.filter((c) => c.missed > 0 && !c.safeAfter);
    const newlyAtRisk = courses.filter((c) => c.droppedBelowTarget);
    const affectedCourses = courses.filter((c) => c.missed > 0);

    let verdict = 'Safe to go';
    let verdictTone = 'safe';
    if (totalMissedSessions === 0) {
      verdict = 'No scheduled classes in this window';
      verdictTone = 'safe';
    } else if (newlyAtRisk.length > 0) {
      verdict = `Caution: ${newlyAtRisk.length} course${newlyAtRisk.length === 1 ? '' : 's'} drop below ${targetPct}%`;
      verdictTone = 'danger';
    } else if (atRiskCourses.length > 0) {
      verdict = `Watch: ${atRiskCourses.length} course${atRiskCourses.length === 1 ? '' : 's'} already below ${targetPct}%`;
      verdictTone = 'warning';
    }

    const startLabel = startD.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const endLabel = endD.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    return {
      valid: true,
      startLabel,
      endLabel,
      daysCount: days.length,
      teachingDaysMissed: days.filter((d) => d.sessions.length > 0).length,
      totalMissedSessions,
      targetPercentage: targetPct,
      excusedLeaveCount,
      overallBeforePct,
      overallAfterPct,
      overallDeltaPct,
      verdict,
      verdictTone,
      days,
      courses,
      affectedCourses,
      atRiskCourses,
      newlyAtRisk
    };
  }

  /**
   * Plain-text WhatsApp-ready Trip Plan summary
   */
  function generateTripShareText(plan) {
    if (!plan || !plan.valid) return '';
    const lines = [];
    lines.push(`Bunkr Trip Plan • ${plan.startLabel} to ${plan.endLabel}`);
    lines.push(`Verdict: ${plan.verdict}`);
    lines.push(`Overall: ${plan.overallBeforePct.toFixed(1)}% -> ${plan.overallAfterPct.toFixed(1)}% (${plan.totalMissedSessions} classes missed)`);
    if (plan.affectedCourses.length > 0) {
      lines.push('');
      lines.push('Course Impact:');
      plan.affectedCourses.forEach((c) => {
        const tag = c.safeAfter
          ? 'Safe'
          : (c.excusedLeavesToSave > 0 ? `Below ${plan.targetPercentage}% (needs ${c.excusedLeavesToSave} excused or ${c.recoveryClasses} attended)` : `Below ${plan.targetPercentage}%`);
        lines.push(`• ${c.acronym}: ${c.beforePct.toFixed(1)}% -> ${c.afterPct.toFixed(1)}% (-${c.missed} cls) · ${tag}`);
      });
    }
    return lines.join('\n');
  }

  /**
   * Batch Timetable Share Code Encoder / Decoder (BUNKR-TT1:...)
   * Lets one class rep configure a section timetable and drop a 1-line code in WhatsApp.
   */
  function encodeBatchCode(timetableObj) {
    const src = timetableObj || activeTimetable || defaultTimetable;
    if (!src || !src.SLOTS) return '';

    const compactSlots = {};
    for (const [key, subj] of Object.entries(src.SLOTS)) {
      if (!subj || !Array.isArray(subj.slots)) continue;
      compactSlots[key] = {
        n: subj.name || key,
        c: subj.code || '',
        a: subj.acronym || SUBJECT_ACRONYMS[key] || '',
        s: subj.slots.map((sl) => [sl.day, sl.time, sl.endTime || '', sl.room || ''])
      };
    }

    const payload = {
      v: 1,
      p: src.program || (src.SEMESTER && src.SEMESTER.program) || 'Rishihood University',
      sec: src.section || 'Custom',
      sem: src.semester || (src.SEMESTER && src.SEMESTER.semester) || 'Semester I',
      sd: src.startDate || (src.SEMESTER && src.SEMESTER.startDate) || '2026-08-10',
      ed: src.endDate || (src.SEMESTER && src.SEMESTER.endDate) || '2026-12-18',
      sl: compactSlots
    };

    const json = JSON.stringify(payload);
    let b64 = '';
    if (typeof Buffer !== 'undefined') {
      b64 = Buffer.from(json, 'utf8').toString('base64');
    } else if (typeof btoa === 'function') {
      b64 = btoa(unescape(encodeURIComponent(json)));
    }
    const urlSafe = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return `BUNKR-TT1:${urlSafe}`;
  }

  function decodeBatchCode(codeStr) {
    if (!codeStr || typeof codeStr !== 'string') {
      return { ok: false, error: 'Please paste a valid BUNKR-TT1 batch code.' };
    }
    const trimmed = codeStr.trim();
    if (!trimmed.startsWith('BUNKR-TT1:')) {
      return { ok: false, error: 'Invalid code format. Batch codes start with "BUNKR-TT1:".' };
    }

    try {
      const raw = trimmed.slice('BUNKR-TT1:'.length).replace(/-/g, '+').replace(/_/g, '/');
      const padded = raw + '='.repeat((4 - (raw.length % 4)) % 4);
      let json = '';
      if (typeof Buffer !== 'undefined') {
        json = Buffer.from(padded, 'base64').toString('utf8');
      } else if (typeof atob === 'function') {
        json = decodeURIComponent(escape(atob(padded)));
      }
      const parsed = JSON.parse(json);
      if (!parsed || parsed.v !== 1 || !parsed.sl || typeof parsed.sl !== 'object') {
        return { ok: false, error: 'Batch code payload is incomplete or corrupted.' };
      }

      const SLOTS = {};
      let totalWeekly = 0;
      for (const [key, entry] of Object.entries(parsed.sl)) {
        if (!entry || !Array.isArray(entry.s)) continue;
        const slots = entry.s
          .filter((arr) => Array.isArray(arr) && arr.length >= 2)
          .map((arr) => ({
            day: Number(arr[0]),
            time: String(arr[1]),
            endTime: arr[2] ? String(arr[2]) : '',
            room: arr[3] ? String(arr[3]) : ''
          }));
        totalWeekly += slots.length;
        SLOTS[key] = {
          key,
          name: String(entry.n || key),
          code: String(entry.c || ''),
          acronym: String(entry.a || ''),
          sessionsPerWeek: slots.length,
          slots
        };
      }

      if (Object.keys(SLOTS).length === 0) {
        return { ok: false, error: 'Batch code contains 0 subjects.' };
      }

      const timetable = {
        custom: true,
        source: 'batch_code',
        program: parsed.p || 'Rishihood University',
        section: parsed.sec || 'Shared Batch',
        semester: parsed.sem || 'Semester I',
        startDate: parsed.sd || '2026-08-10',
        endDate: parsed.ed || '2026-12-18',
        weeklySessionsCount: totalWeekly,
        subjectsCount: Object.keys(SLOTS).length,
        SLOTS
      };

      return { ok: true, timetable };
    } catch (err) {
      return { ok: false, error: 'Could not decode batch code. Make sure the full code was copied.' };
    }
  }

  return {
    formatFreshness,
    getDynamicRemainingClasses,
    getRemainingTeachingSummary,
    calculateBunkWithDeficitRecovery,
    calculateBunkableClasses,
    calculateClassesNeeded,
    calculateExcusedRecovery,
    simulateLeavePlan,
    generateTripShareText,
    encodeBatchCode,
    decodeBatchCode,
    detectDrift,
    applyOverrides,
    generateDiagnostics,
    isDateInSemester,
    isDateInDiwaliBreak,
    getTodaysClasses,
    getNextUpcomingClass,
    formatNudgeMessage,
    shouldSendNudge,
    calculateSemesterProjection,
    generateShareText,
    setActiveTimetable,
    getActiveTimetable,
    SUBJECT_ACRONYMS
  };
});
