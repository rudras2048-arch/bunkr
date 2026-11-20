// Bunkr 2.4.1 - Background Service Worker
// Phase 2: Proactive Class Departure Nudges & Schedule Verification

const DEFAULT_SEMESTER_BOUNDS = {
  startDate: new Date(2026, 7, 10, 0, 0, 0),   // 2026-08-10
  endDate: new Date(2026, 11, 18, 23, 59, 59), // 2026-12-18
  diwaliStart: new Date(2026, 10, 6, 0, 0, 0), // 2026-11-06
  diwaliEnd: new Date(2026, 10, 13, 23, 59, 59)// 2026-11-13
};

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

function getSemesterBounds(customTimetable) {
  let startDate = DEFAULT_SEMESTER_BOUNDS.startDate;
  let endDate = DEFAULT_SEMESTER_BOUNDS.endDate;
  const holidays = [];

  if (!customTimetable) {
    holidays.push({ start: DEFAULT_SEMESTER_BOUNDS.diwaliStart, end: DEFAULT_SEMESTER_BOUNDS.diwaliEnd });
    return { startDate, endDate, holidays };
  }

  const startRaw = customTimetable.startDate || (customTimetable.SEMESTER && customTimetable.SEMESTER.startDate);
  const endRaw = customTimetable.endDate || (customTimetable.SEMESTER && customTimetable.SEMESTER.endDate);
  const parsedStart = parseDateString(startRaw, false);
  const parsedEnd = parseDateString(endRaw, true);
  if (parsedStart) startDate = parsedStart;
  if (parsedEnd) endDate = parsedEnd;

  const diwali = customTimetable.diwaliBreak || (customTimetable.SEMESTER && customTimetable.SEMESTER.diwaliBreak);
  if (diwali && diwali.start && diwali.end) {
    const ds = parseDateString(diwali.start, false);
    const de = parseDateString(diwali.end, true);
    if (ds && de) {
      holidays.push({ start: ds, end: de, name: 'Diwali Break' });
    }
  } else if (!customTimetable.custom && !customTimetable.holidays) {
    holidays.push({ start: DEFAULT_SEMESTER_BOUNDS.diwaliStart, end: DEFAULT_SEMESTER_BOUNDS.diwaliEnd });
  }

  if (Array.isArray(customTimetable.holidays)) {
    for (const h of customTimetable.holidays) {
      if (h && h.start && h.end) {
        const hs = parseDateString(h.start, false);
        const he = parseDateString(h.end, true);
        if (hs && he) {
          holidays.push({ start: hs, end: he, name: h.name || 'Holiday' });
        }
      }
    }
  }

  return { startDate, endDate, holidays };
}

function isDateInBounds(date, bounds) {
  const d = new Date(date);
  if (d < bounds.startDate || d > bounds.endDate) {
    return false;
  }
  for (const h of bounds.holidays) {
    if (d >= h.start && d <= h.end) {
      return false; // Holiday
    }
  }
  return true;
}

// Single source timetable slots (21 sessions/week, 8 subjects with rooms)
const TIMETABLE_SLOTS = {
  psp: {
    acronym: 'PSP',
    name: 'Problem Solving and Programming',
    slots: [
      { day: 1, time: '13:30', room: 'A603' },
      { day: 2, time: '13:30', room: 'A408' },
      { day: 3, time: '13:30', room: 'A603' },
      { day: 4, time: '10:10', room: 'A603' }
    ]
  },
  wad: {
    acronym: 'WAD',
    name: 'Web Application Development - I',
    slots: [
      { day: 1, time: '15:30', room: 'A603' },
      { day: 2, time: '15:30', room: 'A301' },
      { day: 3, time: '15:30', room: 'A603' },
      { day: 5, time: '13:30', room: 'A610' }
    ]
  },
  math: {
    acronym: 'MATH',
    name: 'Mathematics-I (Foundation)',
    slots: [
      { day: 2, time: '09:00', room: 'A610' },
      { day: 2, time: '11:20', room: 'A610' },
      { day: 3, time: '09:00', room: 'A610' },
      { day: 5, time: '10:10', room: 'A610' }
    ]
  },
  social: {
    acronym: 'Social Comm',
    name: 'Social Communication I',
    slots: [
      { day: 1, time: '10:10', room: 'RFP' },
      { day: 2, time: '10:10', room: 'RFP' }
    ]
  },
  cfn: {
    acronym: 'CFN',
    name: 'Computer fundamentals and networking',
    slots: [
      { day: 1, time: '11:20', room: 'A610' },
      { day: 3, time: '11:20', room: 'A610' }
    ]
  },
  india: {
    acronym: 'India',
    name: 'Understanding India',
    slots: [
      { day: 4, time: '09:00', room: 'RFP' },
      { day: 5, time: '09:00', room: 'RFP' }
    ]
  },
  kpmg: {
    acronym: 'KPMG',
    name: 'KPMG/Edept Workshop Certification Program',
    slots: [
      { day: 4, time: '11:20', room: 'A603' },
      { day: 5, time: '11:20', room: 'A610' }
    ]
  },
  society: {
    acronym: 'Self & Society',
    name: 'Self and Society I',
    slots: [
      { day: 3, time: '10:10', room: 'RFP' }
    ]
  }
};

chrome.runtime.onInstalled.addListener((details) => {
  if (chrome.alarms) {
    chrome.alarms.create('checkNudges', { periodInMinutes: 1 });
  }

  // Storage schema migration & defaults
  chrome.storage.local.get(null, (items) => {
    const updates = {};
    if (!items.cachedAttendance) {
      if (items.bunkrData) updates.cachedAttendance = items.bunkrData;
      else if (items.attendmateData) updates.cachedAttendance = items.attendmateData;
    }
    if (items.targetPercentage === undefined) {
      updates.targetPercentage = 75;
    }
    if (items.theme === undefined) {
      updates.theme = 'system';
    }
    if (items.nudgesEnabled === undefined) {
      updates.nudgesEnabled = true;
    }
    if (items.nudgeLeadMinutes === undefined) {
      updates.nudgeLeadMinutes = 10;
    }
    if (!Array.isArray(items.sentNudges)) {
      updates.sentNudges = [];
    }
    if (items.lastSync === undefined) {
      updates.lastSync = null;
    }
    if (Object.keys(updates).length > 0) {
      chrome.storage.local.set(updates);
    }
  });
  console.log('[Bunkr] Extension installed/initialized successfully with proactive nudges & alarms.');
});

// Clicking a notification lands on the Command Center New Tab
if (chrome.notifications && chrome.notifications.onClicked) {
  chrome.notifications.onClicked.addListener((notificationId) => {
    chrome.tabs.create({ url: chrome.runtime.getURL('newtab/newtab.html') });
  });
}

/**
 * Checks schedule boundaries and evaluates today's classes for proactive nudges
 */
function checkProactiveNudges(forcedDate = null) {
  const now = forcedDate || new Date();

  chrome.storage.local.get(['nudgesEnabled', 'nudgeLeadMinutes', 'sentNudges', 'customTimetable'], (res) => {
    const nudgesEnabled = res.nudgesEnabled !== false;
    if (!nudgesEnabled) return;

    // 1. Dynamic Boundary & Holiday checks
    const bounds = getSemesterBounds(res.customTimetable);
    if (!isDateInBounds(now, bounds)) {
      return; // Outside semester or holiday
    }

    const activeSlots = (res.customTimetable && res.customTimetable.SLOTS) ? res.customTimetable.SLOTS : TIMETABLE_SLOTS;
    const day = now.getDay();

    // Check if weekend (auto-enables Saturday if timetable contains Saturday classes)
    const hasSaturdaySlots = Object.values(activeSlots).some(s => Array.isArray(s.slots) && s.slots.some(sl => sl.day === 6));
    if (day === 0 || (!hasSaturdaySlots && day === 6)) {
      return; // Weekend
    }

    const leadMinutes = typeof res.nudgeLeadMinutes === 'number' ? res.nudgeLeadMinutes : 10;
    const sentNudges = Array.isArray(res.sentNudges) ? res.sentNudges : [];

    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const dateStr = now.toISOString().slice(0, 10);

    for (const key of Object.keys(activeSlots)) {
      const subj = activeSlots[key];
      const acronym = subj.acronym || subj.key?.toUpperCase() || key.toUpperCase();
      if (!subj || !Array.isArray(subj.slots)) continue;

      for (const slot of subj.slots) {
        if (slot.day !== day) continue;

        const [h, m] = slot.time.split(':').map(Number);
        const slotMinutes = h * 60 + m;
        const diffMinutes = slotMinutes - nowMinutes;

        const nudgeKey = `${dateStr}_${key}_${slot.time}`;

        // Never duplicate
        if (sentNudges.includes(nudgeKey)) continue;

        // Suppress missed replay mid-day
        if (diffMinutes < 0) continue;

        // Check if within lead window (e.g. <= 10 mins and > 0)
        if (diffMinutes <= leadMinutes) {
          const roomText = slot.room ? ` in ${slot.room}` : '';
          const msg = `Move — ${acronym} starts ${slot.time}${roomText}`;

          chrome.notifications.create(nudgeKey, {
            type: 'basic',
            iconUrl: chrome.runtime.getURL('icons/icon128.png'),
            title: 'Bunkr Class Alert',
            message: msg,
            priority: 2,
            requireInteraction: true
          });

          sentNudges.push(nudgeKey);
          chrome.storage.local.set({ sentNudges });
          console.log('[Bunkr Nudge Sent]:', msg);
        }
      }
    }
  });
}

// Alarms-based periodic wakeup (MV3 service worker compliant)
if (chrome.alarms) {
  chrome.alarms.get('checkNudges', (alarm) => {
    if (!alarm) {
      chrome.alarms.create('checkNudges', { periodInMinutes: 1 });
    }
  });

  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'checkNudges') {
      checkProactiveNudges();
    }
  });
}

// Initial evaluation on service worker startup
checkProactiveNudges();

// Clear sentNudges and re-evaluate immediately when customTimetable changes
if (chrome.storage && chrome.storage.onChanged) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.customTimetable) {
      console.log('[Bunkr Background] customTimetable changed, clearing sentNudges and re-evaluating alerts.');
      chrome.storage.local.set({ sentNudges: [] }, () => {
        checkProactiveNudges();
      });
    }
  });
}

// Handle messages from content scripts, popup, or new tab
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ATTENDANCE_PARSED') {
    const { subjects, overall, drift } = message.data || {};
    if (overall && typeof overall.percentage === 'number') {
      const pct = Math.round(overall.percentage);
      if (drift && drift.drifted) {
        chrome.action.setBadgeText({ text: `${pct}%`, tabId: sender.tab?.id });
        chrome.action.setBadgeBackgroundColor({
          color: '#F59E0B',
          tabId: sender.tab?.id
        });
      } else {
        chrome.action.setBadgeText({ text: `${pct}%`, tabId: sender.tab?.id });
        chrome.action.setBadgeBackgroundColor({
          color: overall.percentage >= 75 ? '#10B981' : '#EF4444',
          tabId: sender.tab?.id
        });
      }
    }

    chrome.storage.local.set({
      cachedAttendance: message.data,
      lastSync: new Date().toISOString()
    });

    sendResponse({ status: 'ok' });
  } else if (message.type === 'GET_CACHED_ATTENDANCE') {
    chrome.storage.local.get(['cachedAttendance', 'targetPercentage', 'lastSync', 'nudgesEnabled', 'nudgeLeadMinutes'], (data) => {
      sendResponse(data);
    });
    return true;
  } else if (message.type === 'TEST_NUDGE') {
    // Demonstration on demand: fires a sample nudge immediately
    const testKey = 'test_nudge_' + Date.now();
    const course = message.course || 'PSP';
    const time = message.time || '13:30';
    const room = message.room ? ` in ${message.room}` : ' in A603';
    const msg = `Move — ${course} starts ${time}${room}`;

    chrome.notifications.create(testKey, {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon128.png'),
      title: 'Bunkr Class Alert (Test)',
      message: msg,
      priority: 2,
      requireInteraction: true
    }, (notifId) => {
      sendResponse({ status: 'nudge_sent', notificationId: notifId, message: msg });
    });
    return true;
  } else if (message.type === 'CHECK_NUDGES_NOW') {
    checkProactiveNudges();
    sendResponse({ status: 'checked' });
  } else if (message.type === 'RESET_TIMETABLE_TO_DEFAULT') {
    chrome.storage.local.remove(['customTimetable'], () => {
      chrome.storage.local.set({ sentNudges: [] }, () => {
        checkProactiveNudges();
        sendResponse({ status: 'reset_complete' });
      });
    });
    return true;
  }
});
