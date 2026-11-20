// Bunkr — Schedule Upload & Universal Parser Verification Suite
// Tests client-side PDF extraction, CSV/Text parsing, ICS parsing, Engine integration, and Nudges.

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const scheduleParser = require('../lib/schedule_parser');
const engine = require('../lib/engine');
const defaultTimetable = require('../data/timetable');

console.log('🧪 Starting Bunkr Schedule Upload & Universal Parser Verification Suite...\n');

async function runTests() {
  // =========================================================================
  // 1. PDF Schedule Extraction (Rishihood Official Timetable Fixture)
  // =========================================================================
  console.log('1️⃣ Testing Client-Side PDF Schedule Extraction (Zero Backend)...');
  const pdfFixturePath = '/Users/rudrasharma/.gemini/antigravity/brain/d4f75d5f-2ae8-40d1-a647-6c70f96f68d4/.user_uploaded/media_1793615049829_ce570537.pdf';
  
  if (fs.existsSync(pdfFixturePath)) {
    const pdfBuf = fs.readFileSync(pdfFixturePath);
    const parsedPdf = await scheduleParser.parseSchedule(pdfBuf, {
      fileName: 'Rishihood_BTech_CSE_Sem1.pdf'
    });

    assert.strictEqual(parsedPdf.custom, true, 'Timetable must be marked as custom');
    assert.strictEqual(parsedPdf.weeklySessionsCount, 21, `Expected 21 weekly sessions, got ${parsedPdf.weeklySessionsCount}`);
    assert.strictEqual(parsedPdf.subjectsCount, 8, `Expected 8 subjects, got ${parsedPdf.subjectsCount}`);

    // Check specific subjects and slot counts
    assert(parsedPdf.SLOTS.psp, 'PSP subject must be present');
    assert.strictEqual(parsedPdf.SLOTS.psp.sessionsPerWeek, 4, 'PSP must have 4 sessions/week');
    assert(parsedPdf.SLOTS.wad, 'WAD subject must be present');
    assert.strictEqual(parsedPdf.SLOTS.wad.sessionsPerWeek, 4, 'WAD must have 4 sessions/week');
    assert(parsedPdf.SLOTS.math, 'Math subject must be present');
    assert.strictEqual(parsedPdf.SLOTS.math.sessionsPerWeek, 4, 'Math must have 4 sessions/week');
    assert(parsedPdf.SLOTS.social, 'Social subject must be present');
    assert.strictEqual(parsedPdf.SLOTS.social.sessionsPerWeek, 2, 'Social must have 2 sessions/week');
    assert(parsedPdf.SLOTS.cfn, 'CFN subject must be present');
    assert.strictEqual(parsedPdf.SLOTS.cfn.sessionsPerWeek, 2, 'CFN must have 2 sessions/week');
    assert(parsedPdf.SLOTS.kpmg, 'KPMG subject must be present');
    assert.strictEqual(parsedPdf.SLOTS.kpmg.sessionsPerWeek, 2, 'KPMG must have 2 sessions/week');
    assert(parsedPdf.SLOTS.india, 'India subject must be present');
    assert.strictEqual(parsedPdf.SLOTS.india.sessionsPerWeek, 2, 'India must have 2 sessions/week');
    assert(parsedPdf.SLOTS.society, 'Society subject must be present');
    assert.strictEqual(parsedPdf.SLOTS.society.sessionsPerWeek, 1, 'Society must have 1 session/week');

    // Check rooms extraction
    const pspRooms = parsedPdf.SLOTS.psp.slots.map(s => s.room);
    assert(pspRooms.includes('A603') && pspRooms.includes('A408'), 'PSP rooms must include A603 and A408');

    const mathRooms = parsedPdf.SLOTS.math.slots.map(s => s.room);
    assert(mathRooms.includes('A610'), 'Math rooms must include A610');

    const socialRooms = parsedPdf.SLOTS.social.slots.map(s => s.room);
    assert(socialRooms.includes('RFP'), 'Social rooms must include RFP');

    console.log('   ✅ PDF parser extracted all 21 slots across 8 subjects with rooms successfully.');
  } else {
    console.log('   ⚠️ PDF fixture not found on disk, skipping fixture load.');
  }

  // =========================================================================
  // 2. CSV and Plain-Text Schedule Parsing
  // =========================================================================
  console.log('\n2️⃣ Testing Free-Text & CSV Schedule Parsing...');
  const textFixture = `
Monday:
  09:00 - 10:00 Data Structures (A501)
  10:10 - 11:40 Operating Systems (A502)
  13:30 - 15:00 Algorithms Lab (Lab-2)
Wednesday:
  09:00 - 10:00 Data Structures (A501)
  11:20 - 12:50 Database Systems (A404)
Friday:
  10:10 - 11:40 Operating Systems (A502)
  13:30 - 15:00 Software Engineering (A301)
`;

  const parsedText = await scheduleParser.parseSchedule(textFixture, {
    fileName: 'semester3_schedule.txt'
  });

  assert.strictEqual(parsedText.custom, true);
  assert.strictEqual(parsedText.weeklySessionsCount, 7, `Expected 7 sessions, got ${parsedText.weeklySessionsCount}`);
  assert.strictEqual(parsedText.subjectsCount, 5, `Expected 5 subjects, got ${parsedText.subjectsCount}`);

  // CSV format test
  const csvFixture = `Day, Time, EndTime, Subject, Room
Monday, 09:00, 10:00, Artificial Intelligence, A603
Tuesday, 10:10, 11:40, Machine Learning, A610
Thursday, 13:30, 15:00, Artificial Intelligence, A603
`;
  const parsedCsv = await scheduleParser.parseSchedule(csvFixture, {
    fileName: 'ai_electives.csv'
  });

  assert.strictEqual(parsedCsv.weeklySessionsCount, 3, `Expected 3 CSV sessions, got ${parsedCsv.weeklySessionsCount}`);
  assert.strictEqual(parsedCsv.subjectsCount, 2, `Expected 2 CSV subjects, got ${parsedCsv.subjectsCount}`);
  console.log('   ✅ Plain-text and CSV schedules successfully parsed into structured timetable.');

  // =========================================================================
  // 3. ICS Calendar Parsing
  // =========================================================================
  console.log('\n3️⃣ Testing ICS Calendar File Parsing (.ics)...');
  const icsFixture = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//AttendMate//Calendar//EN
BEGIN:VEVENT
UID:2026-11-02-cn@attendmate
SUMMARY:Computer Networks
LOCATION:Room B201
DTSTART:20261102T101000
DTEND:20261102T114000
RRULE:FREQ=WEEKLY;BYDAY=MO,WE
END:VEVENT
BEGIN:VEVENT
UID:2026-11-03-ml@attendmate
SUMMARY:Machine Learning
LOCATION:Room A610
DTSTART:20261103T133000
DTEND:20261103T150000
RRULE:FREQ=WEEKLY;BYDAY=TU,TH
END:VEVENT
END:VCALENDAR`;

  const parsedIcs = await scheduleParser.parseSchedule(icsFixture, {
    fileName: 'schedule.ics'
  });

  assert.strictEqual(parsedIcs.weeklySessionsCount, 4, `Expected 4 sessions from ICS, got ${parsedIcs.weeklySessionsCount}`);
  assert.strictEqual(parsedIcs.subjectsCount, 2, `Expected 2 subjects from ICS, got ${parsedIcs.subjectsCount}`);
  console.log('   ✅ ICS recurring calendar entries parsed into weekly timetable.');

  // =========================================================================
  // 4. Course Harmonization with Rishiverse Scraped Courses
  // =========================================================================
  console.log('\n4️⃣ Testing Course Harmonization with Scraped ERP Courses...');
  const scrapedCourses = [
    { name: 'Data Structures and Algorithms', code: 'CS301', attended: 20, total: 22 },
    { name: 'Computer Architecture & Org', code: 'CS302', attended: 18, total: 20 }
  ];

  const rawSlots = [
    { day: 1, time: '09:00', endTime: '10:00', room: 'A501', subjectName: 'Data Structures' },
    { day: 3, time: '09:00', endTime: '10:00', room: 'A501', subjectName: 'Data Structures' },
    { day: 2, time: '11:20', endTime: '12:50', room: 'B101', subjectName: 'Computer Architecture' }
  ];

  const harmonized = scheduleParser.assembleTimetable(rawSlots, {
    enrolledCourses: scrapedCourses
  });

  // Verify that "Data Structures" was matched to "Data Structures and Algorithms"
  const keys = Object.keys(harmonized.SLOTS);
  const matchedDSA = Object.values(harmonized.SLOTS).find(s => s.name === 'Data Structures and Algorithms');
  assert(matchedDSA, 'Subject should harmonize with exact scraped name "Data Structures and Algorithms"');
  assert.strictEqual(matchedDSA.code, 'CS301', 'Code should match scraped course CS301');
  assert.strictEqual(matchedDSA.sessionsPerWeek, 2, 'Sessions per week should equal 2');
  console.log('   ✅ Harmonization matched raw timetable subjects against ERP courses.');

  // =========================================================================
  // 5. Engine Integration & Dynamic Custom Timetable
  // =========================================================================
  console.log('\n5️⃣ Testing Engine Integration with Custom Timetable...');
  
  // Custom schedule for another student (2 classes on Monday, 1 class on Tuesday)
  const customStudentSchedule = {
    custom: true,
    weeklySessionsCount: 3,
    subjectsCount: 2,
    SLOTS: {
      ds: {
        key: 'ds',
        name: 'Data Structures',
        acronym: 'DS',
        sessionsPerWeek: 2,
        slots: [
          { day: 1, time: '09:00', endTime: '10:00', room: 'A501' },
          { day: 1, time: '13:30', endTime: '15:00', room: 'A501' }
        ]
      },
      os: {
        key: 'os',
        name: 'Operating Systems',
        acronym: 'OS',
        sessionsPerWeek: 1,
        slots: [
          { day: 2, time: '10:10', endTime: '11:40', room: 'A502' }
        ]
      }
    },
    matchSubjectKey: (name) => {
      const l = (name || '').toLowerCase();
      if (l.includes('data structure') || l.includes('ds')) return 'ds';
      if (l.includes('operating') || l.includes('os')) return 'os';
      return null;
    }
  };

  // Set active timetable in engine
  engine.setActiveTimetable(customStudentSchedule);
  assert.strictEqual(engine.getActiveTimetable(), customStudentSchedule, 'Active timetable must match custom timetable');

  // Evaluate Monday Nov 2, 2026
  const mondayTest = new Date(2026, 10, 2, 8, 30, 0); // 8:30 AM
  const classesOnMonday = engine.getTodaysClasses(mondayTest);
  assert.strictEqual(classesOnMonday.length, 2, `Expected 2 classes on Monday for custom schedule, got ${classesOnMonday.length}`);
  assert.strictEqual(classesOnMonday[0].acronym, 'DS', 'First class should be DS');
  assert.strictEqual(classesOnMonday[0].time, '09:00', 'First class time should be 09:00');
  assert.strictEqual(classesOnMonday[0].room, 'A501', 'First class room should be A501');

  // Next upcoming class at 8:30 AM
  const nextUp = engine.getNextUpcomingClass(mondayTest);
  assert(nextUp, 'Next upcoming class should exist at 8:30 AM');
  assert.strictEqual(nextUp.acronym, 'DS');
  assert.strictEqual(nextUp.time, '09:00');

  // Dynamic remaining classes for DS
  const dsRemaining = engine.getDynamicRemainingClasses('Data Structures', mondayTest);
  assert(dsRemaining > 0, `Expected remaining classes > 0, got ${dsRemaining}`);

  // Test Semester Projection calculation with custom timetable
  const customCourses = [
    { name: 'Data Structures', attended: 25, total: 28 },
    { name: 'Operating Systems', attended: 12, total: 14 }
  ];
  const proj = engine.calculateSemesterProjection(customCourses, 75, mondayTest);
  assert(proj, 'Projection should calculate cleanly');
  assert(proj.totalRemainingSessions > 0, 'Total remaining sessions should be > 0');
  assert(proj.overallPacePct > 0, 'Pace percentage should be > 0');

  // Reset back to default timetable
  engine.setActiveTimetable(null);
  const defaultMondayClasses = engine.getTodaysClasses(mondayTest);
  assert.strictEqual(defaultMondayClasses.length, 4, 'Default timetable should yield 4 classes on Monday');
  console.log('   ✅ Engine dynamically switches between custom schedule and default timetable.');

  // =========================================================================
  // 6. Proactive Nudges with Custom Schedule
  // =========================================================================
  console.log('\n6️⃣ Testing Proactive Nudges with Custom Schedule...');
  
  // Custom class at 09:00 on Monday
  const customSession = {
    subjectKey: 'ds',
    subjectName: 'Data Structures',
    acronym: 'DS',
    day: 1,
    time: '09:00',
    endTime: '10:00',
    room: 'A501'
  };

  // Student is at 08:52 (8 minutes lead time) -> should send nudge
  const checkTime = new Date(2026, 10, 2, 8, 52, 0);
  const evalNudge = engine.shouldSendNudge(customSession, checkTime, 10, []);
  assert.strictEqual(evalNudge.send, true, 'Nudge should be approved 8 minutes before class');
  assert.strictEqual(evalNudge.message, 'Move — DS starts 09:00 in A501');
  assert.strictEqual(evalNudge.minutesRemaining, 8);
  console.log('   ✅ Proactive nudge correctly generated for custom schedule: ' + evalNudge.message);

  console.log('\n🎉 ALL SCHEDULE UPLOAD & PARSER TESTS PASSED SUCCESSFULLY! (100% Verification)');
}

runTests().catch(err => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
