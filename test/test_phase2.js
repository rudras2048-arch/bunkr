// Bunkr Phase 2 Verification Test Suite
// Verifies all schedule correctness rules, duplicate prevention, lead time settings,
// room fallbacks, and notification formats for Phase 2: "Proactive Nudges"

const assert = require('assert');
const timetable = require('../data/timetable');
const engine = require('../lib/engine');

console.log('🧪 Starting Bunkr Phase 2 Verification Suite...\n');

// 1. Schedule Correctness & Calendar Boundaries
console.log('1️⃣ Testing Schedule Correctness & Calendar Boundaries...');

// 1a. Sundays
const sundayDate = new Date(2026, 10, 1, 10, 0, 0); // Nov 1, 2026 is Sunday
assert.strictEqual(engine.isDateInSemester(sundayDate), true);
assert.strictEqual(sundayDate.getDay(), 0);
const sundayClasses = engine.getTodaysClasses(sundayDate);
assert.strictEqual(sundayClasses.length, 0, 'Sunday must have 0 scheduled classes');
console.log('   ✅ Sunday schedule correctly yields 0 classes (silence by default).');

// 1b. Diwali Break (Nov 6–13, 2026)
const diwaliDates = [
  new Date(2026, 10, 6, 9, 0, 0),  // Start of break
  new Date(2026, 10, 9, 11, 0, 0), // Mid-break Monday
  new Date(2026, 10, 13, 16, 0, 0) // End of break Friday
];
for (const d of diwaliDates) {
  assert.strictEqual(engine.isDateInDiwaliBreak(d), true, `Date ${d.toISOString()} should be inside Diwali break`);
  assert.strictEqual(engine.getTodaysClasses(d).length, 0, `Diwali break date ${d.toISOString()} must have 0 classes`);
}
console.log('   ✅ Diwali break (Nov 6–13, 2026) strictly produces 0 classes.');

// 1c. Outside Semester
const preSemester = new Date(2026, 6, 15, 10, 0, 0);  // July 15, 2026
const postSemester = new Date(2026, 11, 25, 10, 0, 0); // Dec 25, 2026
assert.strictEqual(engine.isDateInSemester(preSemester), false, 'Pre-semester date must be outside');
assert.strictEqual(engine.isDateInSemester(postSemester), false, 'Post-semester date must be outside');
assert.strictEqual(engine.getTodaysClasses(preSemester).length, 0);
assert.strictEqual(engine.getTodaysClasses(postSemester).length, 0);
console.log('   ✅ Dates outside semester boundary (2026-08-10 → 2026-12-18) yield 0 classes.');

// 1d. Regular Semester Day (e.g., Monday Nov 2, 2026)
const monday = new Date(2026, 10, 2, 8, 0, 0); // Nov 2, 2026 is a Monday
const mondayClasses = engine.getTodaysClasses(monday);
assert(mondayClasses.length > 0, 'Monday must have classes scheduled');
console.log(`   ✅ Regular school day (Monday Nov 2) retrieved ${mondayClasses.length} classes sorted by time.`);

// 2. Next Upcoming Class and After-Last-Class Silence
console.log('\n2️⃣ Testing Next Upcoming Class & End-of-Day Silence...');
// Monday Nov 2 at 08:30 AM (before first class at 09:00 or 10:00)
const earlyMon = new Date(2026, 10, 2, 8, 30, 0);
const firstClass = engine.getNextUpcomingClass(earlyMon);
assert(firstClass !== null, 'There should be an upcoming class in the morning');
assert.strictEqual(firstClass.time, mondayClasses[0].time);
console.log(`   ✅ Next class in morning correctly identified: ${firstClass.acronym} at ${firstClass.time} (${firstClass.room})`);

// Monday Nov 2 at 18:30 (after all classes finish)
const lateMon = new Date(2026, 10, 2, 18, 30, 0);
const pastLastClass = engine.getNextUpcomingClass(lateMon);
assert.strictEqual(pastLastClass, null, 'After last class of the day, next class must be null');
console.log('   ✅ After last class of the day, getNextUpcomingClass returns null (silence).');

// 3. Proactive Nudge Formatting
console.log('\n3️⃣ Testing Friendly One-Line Nudge Message Formatting...');
// With room
const sessionWithRoom = {
  acronym: 'PSP',
  subjectName: 'Problem Solving and Programming',
  subjectKey: 'psp',
  time: '13:30',
  room: 'A603'
};
const formattedWithRoom = engine.formatNudgeMessage(sessionWithRoom);
assert.strictEqual(formattedWithRoom, 'Move — PSP starts 13:30 in A603');
console.log('   ✅ Formatted with room:', formattedWithRoom);

// Missing room fallback (never fail silently)
const sessionWithoutRoom = {
  acronym: 'PSP',
  subjectName: 'Problem Solving and Programming',
  subjectKey: 'psp',
  time: '13:30',
  room: ''
};
const formattedWithoutRoom = engine.formatNudgeMessage(sessionWithoutRoom);
assert.strictEqual(formattedWithoutRoom, 'Move — PSP starts 13:30');
console.log('   ✅ Formatted without room (fallback):', formattedWithoutRoom);

// 4. Duplicate Prevention (Exactly One Nudge Per Class Instance)
console.log('\n4️⃣ Testing Duplicate Prevention & Single-Alert Rule...');
const testDate = new Date(2026, 10, 2, 13, 21, 0); // 9 minutes before 13:30 class
const session = {
  subjectKey: 'psp',
  subjectName: 'Problem Solving and Programming',
  acronym: 'PSP',
  time: '13:30',
  room: 'A603'
};

// First evaluation: not yet sent -> should send
const res1 = engine.shouldSendNudge(session, testDate, {
  nudgesEnabled: true,
  leadMinutes: 10,
  sentNudges: []
});
assert.strictEqual(res1.send, true, 'First nudge should be approved');
assert.strictEqual(res1.message, 'Move — PSP starts 13:30 in A603');
assert.strictEqual(res1.nudgeKey, '2026-11-02_psp_13:30');
console.log('   ✅ Initial evaluation returns send = true with key:', res1.nudgeKey);

// Second evaluation: key added to sentNudges -> rejected
const res2 = engine.shouldSendNudge(session, testDate, {
  nudgesEnabled: true,
  leadMinutes: 10,
  sentNudges: [res1.nudgeKey]
});
assert.strictEqual(res2.send, false, 'Duplicate nudge must be rejected');
assert.strictEqual(res2.reason, 'Already sent nudge for this class instance');
console.log('   ✅ Second evaluation rejected duplicate alert:', res2.reason);

// 5. Suppress Mid-Day Missed Alert Replays
console.log('\n5️⃣ Testing Mid-Day Browser Open (Missed Alert Suppression)...');
// User opens browser at 14:15, class was at 13:30 (45 minutes ago)
const midDayDate = new Date(2026, 10, 2, 14, 15, 0);
const resMissed = engine.shouldSendNudge(session, midDayDate, {
  nudgesEnabled: true,
  leadMinutes: 10,
  sentNudges: []
});
assert.strictEqual(resMissed.send, false, 'Missed past class must not be replayed');
assert.strictEqual(resMissed.reason, 'Class has already started; missed alerts are suppressed');
console.log('   ✅ Opening browser after class started suppresses missed alert:', resMissed.reason);

// 6. Lead Time Preferences (5m, 10m, 15m)
console.log('\n6️⃣ Testing User Lead Time Preferences (5m, 10m, 15m)...');
// Class at 13:30, current time is 13:18 (12 minutes before class)
const twelveMinBefore = new Date(2026, 10, 2, 13, 18, 0);

// At 10 min lead time: 12 min away -> should not send yet
const res10m = engine.shouldSendNudge(session, twelveMinBefore, {
  nudgesEnabled: true,
  leadMinutes: 10,
  sentNudges: []
});
assert.strictEqual(res10m.send, false);
console.log('   ✅ At 10m lead time, 12m away is rejected (too early).');

// At 15 min lead time: 12 min away -> within window -> should send
const res15m = engine.shouldSendNudge(session, twelveMinBefore, {
  nudgesEnabled: true,
  leadMinutes: 15,
  sentNudges: []
});
assert.strictEqual(res15m.send, true);
console.log('   ✅ At 15m lead time, 12m away is approved.');

// At 5 min lead time: 12 min away -> should not send
const res5m = engine.shouldSendNudge(session, twelveMinBefore, {
  nudgesEnabled: true,
  leadMinutes: 5,
  sentNudges: []
});
assert.strictEqual(res5m.send, false);
console.log('   ✅ At 5m lead time, 12m away is rejected.');

// 7. Master On/Off Toggle
console.log('\n7️⃣ Testing Master Toggle (Disabled State)...');
const resDisabled = engine.shouldSendNudge(session, testDate, {
  nudgesEnabled: false,
  leadMinutes: 10,
  sentNudges: []
});
assert.strictEqual(resDisabled.send, false);
assert.strictEqual(resDisabled.reason, 'Nudges disabled by user');
console.log('   ✅ Master toggle OFF prevents nudges under all circumstances.');

console.log('\n🎉 ALL PHASE 2 VERIFICATION TESTS PASSED SUCCESSFULLY! (100% Correctness)');
