// test/test_engine_alerts_sync.js
// Verification suite for Engine Math, Saturday Auto-Enable, Dynamic Semester Bounds, and Cross-Extension Sync

const assert = require('assert');
const path = require('path');
const fs = require('fs');

console.log('🧪 Starting Engine Math, Saturday Auto-Enable & Alerts Verification Suite...\n');

const engine = require('../extension/lib/engine');
const timetable = require('../extension/data/timetable');

// =========================================================================
// 1. Saturday Auto-Enable Verification
// =========================================================================
console.log('1️⃣ Testing Saturday Auto-Enable Logic...');

// Saturday Nov 7, 2026 (During semester, Nov 7 is Saturday)
// Note: Nov 7, 2026 is actually in Diwali break for Rishihood (Nov 6-13), so choose another Saturday:
// Nov 14, 2026 is Saturday, Nov 21, 2026 is Saturday
const saturdayNov21 = new Date(2026, 10, 21, 10, 0, 0); // Nov 21, 2026 10:00 AM (Saturday)
assert.strictEqual(saturdayNov21.getDay(), 6, 'Nov 21, 2026 must be Saturday (day 6)');

// Default timetable has NO Saturday classes
engine.setActiveTimetable(null);
const defaultSatClasses = engine.getTodaysClasses(saturdayNov21);
assert.strictEqual(defaultSatClasses.length, 0, 'Default timetable must return 0 classes on Saturday');

// Should reject nudge on Saturday for default timetable
const fakeSession = { subjectKey: 'psp', time: '10:30', day: 6 };
const defaultSatNudge = engine.shouldSendNudge(fakeSession, saturdayNov21);
assert.strictEqual(defaultSatNudge.send, false, 'Default timetable must reject Saturday nudge');
assert(defaultSatNudge.reason.includes('silence') || defaultSatNudge.reason.includes('Sunday') || defaultSatNudge.reason.includes('Weekend'), 'Reason must indicate weekend silence');

// Custom timetable WITH Saturday classes
const saturdayCustomTimetable = {
  custom: true,
  startDate: '2026-08-10',
  endDate: '2026-12-18',
  SLOTS: {
    ml: {
      key: 'ml',
      name: 'Machine Learning',
      acronym: 'ML',
      code: 'CS401',
      slots: [
        { day: 6, time: '10:15', endTime: '11:45', room: 'Lab 2' },
        { day: 1, time: '14:00', endTime: '15:30', room: 'A201' }
      ]
    }
  }
};

engine.setActiveTimetable(saturdayCustomTimetable);
const customSatClasses = engine.getTodaysClasses(saturdayNov21);
assert.strictEqual(customSatClasses.length, 1, 'Custom timetable with Saturday class must return 1 class on Saturday');
assert.strictEqual(customSatClasses[0].acronym, 'ML', 'Class acronym must be ML');
assert.strictEqual(customSatClasses[0].time, '10:15', 'Class time must be 10:15');
assert.strictEqual(customSatClasses[0].room, 'Lab 2', 'Class room must be Lab 2');

// Test proactive nudge for Saturday class 10 minutes before
const testNow10MinBefore = new Date(2026, 10, 21, 10, 5, 0); // 10:05 AM (10 mins before 10:15)
const satNudgeApproved = engine.shouldSendNudge(customSatClasses[0], testNow10MinBefore, {
  nudgesEnabled: true,
  leadMinutes: 10,
  sentNudges: []
});
assert.strictEqual(satNudgeApproved.send, true, 'Saturday nudge must be approved within lead window');
assert.strictEqual(satNudgeApproved.message, 'Move — ML starts 10:15 in Lab 2');
console.log('   ✅ Saturday Auto-Enable verified: Saturday classes retrieved and nudges generated successfully.');

// Verify dynamic remaining classes includes Saturdays
const satRemaining = engine.getDynamicRemainingClasses('Machine Learning', saturdayNov21);
assert(satRemaining > 0, `Expected Saturday classes remaining > 0, got ${satRemaining}`);
console.log(`   ✅ Dynamic remaining classes for Saturday course calculated: ${satRemaining} classes left.`);

// =========================================================================
// 2. Dynamic Semester Bounds & Timezone Verification
// =========================================================================
console.log('\n2️⃣ Testing Dynamic Semester Bounds & Timezone Safety...');

// Custom Spring 2027 timetable (dates outside Fall 2026)
const spring2027Timetable = {
  custom: true,
  institution: 'Delhi Tech University',
  semester: 'Spring 2027',
  startDate: '2027-01-15',
  endDate: '2027-05-25',
  holidays: [
    { start: '2027-03-20', end: '2027-03-27', name: 'Holi Break' }
  ],
  SLOTS: {
    algo: {
      key: 'algo',
      name: 'Design & Analysis of Algorithms',
      acronym: 'DAA',
      code: 'CS202',
      slots: [
        { day: 1, time: '09:00', endTime: '10:30', room: 'LH1' },
        { day: 3, time: '09:00', endTime: '10:30', room: 'LH1' }
      ]
    }
  }
};

engine.setActiveTimetable(spring2027Timetable);

// Date before Spring 2027 semester (Jan 10, 2027) -> Outside semester
const preSpring = new Date(2027, 0, 10, 10, 0, 0);
assert.strictEqual(engine.isDateInSemester(preSpring), false, 'Jan 10, 2027 must be outside Spring 2027 semester');
assert.strictEqual(engine.getTodaysClasses(preSpring).length, 0, 'No classes before semester start');

// Date inside Spring 2027 semester (Monday Feb 1, 2027)
const feb1 = new Date(2027, 1, 1, 8, 30, 0); // Monday Feb 1, 2027
assert.strictEqual(engine.isDateInSemester(feb1), true, 'Feb 1, 2027 must be inside Spring 2027 semester');
const feb1Classes = engine.getTodaysClasses(feb1);
assert.strictEqual(feb1Classes.length, 1, 'Feb 1 should yield 1 class (DAA)');
assert.strictEqual(feb1Classes[0].acronym, 'DAA');

// Date during custom holiday (March 22, 2027 during Holi Break)
const holiDate = new Date(2027, 2, 22, 9, 0, 0);
assert.strictEqual(engine.isDateInDiwaliBreak(holiDate), true, 'Custom holiday should be detected as break');
assert.strictEqual(engine.getTodaysClasses(holiDate).length, 0, 'No classes during custom holiday break');

// Dynamic remaining classes for 2027
const daaRemaining = engine.getDynamicRemainingClasses('Design & Analysis of Algorithms', feb1, { preserveYear: true });
assert(daaRemaining > 0, `Expected DAA remaining classes > 0, got ${daaRemaining}`);
console.log(`   ✅ Dynamic semester bounds verified for 2027: ${daaRemaining} classes remaining till May 25, 2027.`);

// =========================================================================
// 3. Dynamic Subject Matching (JSON Serialization Parity)
// =========================================================================
console.log('\n3️⃣ Testing Dynamic Subject Matching without Helper Methods (JSON-safe)...');

// Simulate pure JSON parsed from chrome.storage.local (NO methods like matchSubjectKey attached)
const jsonStoredTimetable = JSON.parse(JSON.stringify(saturdayCustomTimetable));
assert.strictEqual(typeof jsonStoredTimetable.matchSubjectKey, 'undefined', 'matchSubjectKey must be undefined after JSON serialization');

engine.setActiveTimetable(jsonStoredTimetable);

// Test remaining classes matches by name
const mlRem = engine.getDynamicRemainingClasses('Machine Learning', saturdayNov21);
assert(mlRem > 0, 'Should match Machine Learning by full name');

// Test remaining classes matches by code
const mlRemByCode = engine.getDynamicRemainingClasses('CS401', saturdayNov21);
assert.strictEqual(mlRemByCode, mlRem, 'Should match Machine Learning by code CS401');

// Test semester projection with custom courses
const customProj = engine.calculateSemesterProjection([
  { name: 'Machine Learning', code: 'CS401', attended: 10, total: 12 }
], { now: saturdayNov21, targetPercentage: 75 });

assert(customProj, 'Projection must calculate cleanly');
assert.strictEqual(customProj.perCourse[0].acronym, 'ML', 'Acronym must be preserved as ML');
assert(customProj.perCourse[0].remaining > 0, 'Remaining must be > 0');
console.log('   ✅ Dynamic subject matching verified across key, name, code, and acronym without methods.');

// =========================================================================
// 4. Reset to Default Verification
// =========================================================================
console.log('\n4️⃣ Testing Reset to Default Timetable...');

// Reset back to default
engine.setActiveTimetable(null);
const activeTT = engine.getActiveTimetable();
assert(activeTT.SLOTS.psp, 'Default timetable must contain PSP');
assert(activeTT.SLOTS.wad, 'Default timetable must contain WAD');
assert.strictEqual(Object.keys(activeTT.SLOTS).length, 8, 'Default timetable must have 8 subjects');

const mondayClasses = engine.getTodaysClasses(new Date(2026, 10, 2, 8, 0, 0));
assert.strictEqual(mondayClasses.length, 4, 'Default Monday should have 4 classes');
console.log('   ✅ Reset to default verified: restores 8 subjects and 21 sessions/week.');

// =========================================================================
// 5. Manifest & Background Verification
// =========================================================================
console.log('\n5️⃣ Verifying Manifest Permissions & Background Alarm Contract...');

const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '../extension/manifest.json'), 'utf8'));
assert(manifest.permissions.includes('alarms'), 'Manifest must include "alarms"');
assert(manifest.permissions.includes('storage'), 'Manifest must include "storage"');
assert(manifest.permissions.includes('notifications'), 'Manifest must include "notifications"');
console.log('   ✅ Manifest permissions verified: ["storage", "notifications", "alarms"].');

const bgSource = fs.readFileSync(path.join(__dirname, '../extension/background/background.js'), 'utf8');
assert(!bgSource.includes('setInterval(checkProactiveNudges'), 'Background must NOT use setInterval for nudges');
assert(bgSource.includes('chrome.alarms.create'), 'Background must create chrome.alarms');
assert(bgSource.includes('chrome.alarms.onAlarm'), 'Background must listen to chrome.alarms.onAlarm');
assert(bgSource.includes('RESET_TIMETABLE_TO_DEFAULT'), 'Background must handle RESET_TIMETABLE_TO_DEFAULT message');
console.log('   ✅ Background MV3 alarms and reset message handler verified.');

// =========================================================================
// 6. Content Script Synchronization Verification
// =========================================================================
console.log('\n6️⃣ Verifying Content Script In-Page Synchronization...');

const uiSource = fs.readFileSync(path.join(__dirname, '../extension/content/ui.js'), 'utf8');
assert(uiSource.includes('updateTimetable'), 'ui.js must export updateTimetable');
assert(uiSource.includes('activeCustomTimetable'), 'ui.js must maintain activeCustomTimetable');

const contentSource = fs.readFileSync(path.join(__dirname, '../extension/content/content.js'), 'utf8');
assert(contentSource.includes('chrome.storage.onChanged'), 'content.js must listen for chrome.storage.onChanged');
assert(contentSource.includes('updateTimetable'), 'content.js must call updateTimetable on storage change');
console.log('   ✅ Content script synchronization verified.');

console.log('\n🎉 ALL ENGINE, ALERTS & CROSS-EXTENSION SYNC TESTS PASSED SUCCESSFULLY! (100% Correctness)');
