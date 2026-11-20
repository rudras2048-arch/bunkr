// Bunkr — Timetable Source of Truth
// Semester: 2026-08-10 → 2026-12-18 (Diwali Break: 2026-11-06 → 2026-11-13)
// 8 Subjects, 21 Sessions/Week with Rooms

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BunkrTimetable = root.AttendMateTimetable = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const SEMESTER = {
    institution: 'Rishihood University',
    program: 'B.Tech - CSE (Data Science)',
    semester: 'Semester I (Diwali Semester 2026-27)',
    academicSession: '2026-2027',
    startDate: '2026-08-10',
    endDate: '2026-12-18',
    diwaliBreak: {
      start: '2026-11-06',
      end: '2026-11-13'
    },
    weeklySessionsCount: 21,
    subjectsCount: 8
  };

  // Day indexing: 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat, 0 = Sun
  const SLOTS = {
    psp: {
      key: 'psp',
      name: 'Problem Solving and Programming',
      code: 'CSD02C1002',
      sessionsPerWeek: 4,
      slots: [
        { day: 1, time: '13:30', endTime: '15:00', room: 'A603' },
        { day: 2, time: '13:30', endTime: '15:00', room: 'A408' },
        { day: 3, time: '13:30', endTime: '15:00', room: 'A603' },
        { day: 4, time: '10:10', endTime: '11:40', room: 'A603' }
      ]
    },
    wad: {
      key: 'wad',
      name: 'Web Application Development - I',
      code: 'CSD02C1003',
      sessionsPerWeek: 4,
      slots: [
        { day: 1, time: '15:30', endTime: '17:00', room: 'A603' },
        { day: 2, time: '15:30', endTime: '17:00', room: 'A301' },
        { day: 3, time: '15:30', endTime: '17:00', room: 'A603' },
        { day: 5, time: '13:30', endTime: '15:00', room: 'A610' }
      ]
    },
    math: {
      key: 'math',
      name: 'Mathematics-I (Foundation)',
      code: 'CSD02C1001',
      sessionsPerWeek: 4,
      slots: [
        { day: 2, time: '09:00', endTime: '10:00', room: 'A610' },
        { day: 2, time: '11:20', endTime: '12:20', room: 'A610' },
        { day: 3, time: '09:00', endTime: '10:00', room: 'A610' },
        { day: 5, time: '10:10', endTime: '11:10', room: 'A610' }
      ]
    },
    social: {
      key: 'social',
      name: 'Social Communication I',
      code: 'RSPRFC1003',
      sessionsPerWeek: 2,
      slots: [
        { day: 1, time: '10:10', endTime: '11:40', room: 'RFP' },
        { day: 2, time: '10:10', endTime: '11:40', room: 'RFP' }
      ]
    },
    cfn: {
      key: 'cfn',
      name: 'Computer fundamentals and networking',
      code: 'CSD02C1004',
      sessionsPerWeek: 2,
      slots: [
        { day: 1, time: '11:20', endTime: '12:50', room: 'A610' },
        { day: 3, time: '11:20', endTime: '12:50', room: 'A610' }
      ]
    },
    india: {
      key: 'india',
      name: 'Understanding India',
      code: 'RSPRFC1001',
      sessionsPerWeek: 2,
      slots: [
        { day: 4, time: '09:00', endTime: '10:00', room: 'RFP' },
        { day: 5, time: '09:00', endTime: '10:00', room: 'RFP' }
      ]
    },
    kpmg: {
      key: 'kpmg',
      name: 'KPMG/Edept Workshop Certification Program',
      code: 'KPMG01',
      sessionsPerWeek: 2,
      slots: [
        { day: 4, time: '11:20', endTime: '12:50', room: 'A603' },
        { day: 5, time: '11:20', endTime: '12:50', room: 'A610' }
      ]
    },
    society: {
      key: 'society',
      name: 'Self and Society I',
      code: 'RSPRFC1002',
      sessionsPerWeek: 1,
      slots: [
        { day: 3, time: '10:10', endTime: '11:10', room: 'RFP' }
      ]
    }
  };

  function matchSubjectKey(name) {
    const l = (name || '').toLowerCase();
    if (l.includes('problem solving') || l.includes('psp')) return 'psp';
    if (l.includes('web application') || l.includes('wad')) return 'wad';
    if (l.includes('mathematics') || l.includes('math')) return 'math';
    if (l.includes('social communication') || l.includes('social')) return 'social';
    if (l.includes('networking') || l.includes('cfn') || l.includes('computer fundamentals')) return 'cfn';
    if (l.includes('understanding india') || l.includes('india')) return 'india';
    if (l.includes('kpmg') || l.includes('workshop') || l.includes('edept')) return 'kpmg';
    if (l.includes('self and society') || l.includes('society')) return 'society';
    return null;
  }

  function cloneSlots(overrides = {}) {
    const out = {};
    for (const [key, subj] of Object.entries(SLOTS)) {
      const patch = overrides[key] || {};
      out[key] = {
        ...subj,
        ...patch,
        slots: (patch.slots || subj.slots).map((s) => ({ ...s }))
      };
    }
    return out;
  }

  // Pre-configured Rishihood University section presets for 1-click onboarding
  const BATCH_PRESETS = {
    'cse-ds-sec-a': {
      id: 'cse-ds-sec-a',
      label: 'B.Tech CSE (DS) · Section A',
      section: 'Sec-A',
      program: 'B.Tech - CSE (Data Science)',
      semester: SEMESTER.semester,
      startDate: SEMESTER.startDate,
      endDate: SEMESTER.endDate,
      diwaliBreak: { ...SEMESTER.diwaliBreak },
      SLOTS: cloneSlots()
    },
    'cse-ds-sec-b': {
      id: 'cse-ds-sec-b',
      label: 'B.Tech CSE (DS) · Section B',
      section: 'Sec-B',
      program: 'B.Tech - CSE (Data Science)',
      semester: SEMESTER.semester,
      startDate: SEMESTER.startDate,
      endDate: SEMESTER.endDate,
      diwaliBreak: { ...SEMESTER.diwaliBreak },
      SLOTS: cloneSlots({
        psp: {
          slots: [
            { day: 1, time: '11:20', endTime: '12:50', room: 'A604' },
            { day: 2, time: '11:20', endTime: '12:50', room: 'A604' },
            { day: 4, time: '13:30', endTime: '15:00', room: 'A604' },
            { day: 5, time: '13:30', endTime: '15:00', room: 'A604' }
          ]
        },
        wad: {
          slots: [
            { day: 1, time: '13:30', endTime: '15:00', room: 'A604' },
            { day: 3, time: '13:30', endTime: '15:00', room: 'A604' },
            { day: 4, time: '15:30', endTime: '17:00', room: 'A302' },
            { day: 5, time: '15:30', endTime: '17:00', room: 'A604' }
          ]
        },
        kpmg: {
          code: 'CSDS-2601',
          slots: [
            { day: 2, time: '15:30', endTime: '17:00', room: 'A603' },
            { day: 5, time: '11:20', endTime: '12:50', room: 'A610' }
          ]
        }
      })
    },
    'cse-aiml-sec-a': {
      id: 'cse-aiml-sec-a',
      label: 'B.Tech CSE (AI & ML) · Section A',
      section: 'Sec-A',
      program: 'B.Tech - CSE (AI & ML)',
      semester: SEMESTER.semester,
      startDate: SEMESTER.startDate,
      endDate: SEMESTER.endDate,
      diwaliBreak: { ...SEMESTER.diwaliBreak },
      SLOTS: cloneSlots({
        math: {
          name: 'Linear Algebra & Calculus-I',
          slots: [
            { day: 1, time: '09:00', endTime: '10:00', room: 'A402' },
            { day: 2, time: '09:00', endTime: '10:00', room: 'A402' },
            { day: 4, time: '09:00', endTime: '10:00', room: 'A402' },
            { day: 5, time: '10:10', endTime: '11:10', room: 'A402' }
          ]
        },
        cfn: {
          name: 'Foundations of AI Systems',
          slots: [
            { day: 2, time: '11:20', endTime: '12:50', room: 'A405' },
            { day: 4, time: '11:20', endTime: '12:50', room: 'A405' }
          ]
        }
      })
    }
  };

  function getPreset(presetId) {
    const preset = BATCH_PRESETS[presetId];
    if (!preset) return null;
    return JSON.parse(JSON.stringify(preset));
  }

  return {
    SEMESTER,
    SLOTS,
    BATCH_PRESETS,
    getPreset,
    matchSubjectKey
  };
});

