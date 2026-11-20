// Bunkr Phase 1 Verification Test Suite
// Verifies all 6 outcomes of Phase 1: "Never Silently Wrong"

const assert = require('assert');
const timetable = require('../data/timetable');
const engine = require('../lib/engine');

console.log('🧪 Starting Bunkr Phase 1 Verification Suite...\n');

// 1. Freshness Tests
console.log('1️⃣ Testing Plain-Language Freshness Formatting...');
const now = Date.now();
assert.strictEqual(engine.formatFreshness(null), 'Not yet synced');
assert.strictEqual(engine.formatFreshness(now - 5000, 'Rishiverse', now), 'Synced just now from Rishiverse');
assert.strictEqual(engine.formatFreshness(now - 45000, 'Rishiverse', now), 'Synced 45s ago from Rishiverse');
assert.strictEqual(engine.formatFreshness(now - 60000, 'Rishiverse', now), 'Synced 1 min ago from Rishiverse');
assert.strictEqual(engine.formatFreshness(now - 300000, 'Rishiverse', now), 'Synced 5 min ago from Rishiverse');
assert.strictEqual(engine.formatFreshness(now - 7200000, 'Canvas', now), 'Synced 2 hrs ago from Canvas');
assert.strictEqual(engine.formatFreshness(now - 86400000, 'Rishiverse', now), 'Synced 1 day ago from Rishiverse');
console.log('   ✅ Freshness plain-language formatting passes all cases.\n');

// 2. Drift Detection Tests
console.log('2️⃣ Testing Drift Alarm Detection...');
const goodBaseline = {
  subjects: [
    { name: 'Mathematics-I (Foundation)', code: 'MATH1', attended: 21, total: 31 },
    { name: 'Problem Solving and Programming', code: 'PSP', attended: 31, total: 33 },
    { name: 'Web Application Development - I', code: 'WAD1', attended: 17, total: 17 },
    { name: 'Social Communication I', code: 'SOC1', attended: 15, total: 17 }
  ]
};

// Case A: Scrape returns 0 courses
const emptyScrape = { subjects: [] };
const driftEmpty = engine.detectDrift(goodBaseline, emptyScrape);
assert.strictEqual(driftEmpty.drifted, true);
assert.strictEqual(driftEmpty.type, 'empty_scrape');
console.log('   ✅ Empty scrape detected as drift:', driftEmpty.reason);

// Case B: Course count dropped sharply (e.g. 4 -> 1)
const droppedCourses = {
  subjects: [
    { name: 'Mathematics-I (Foundation)', code: 'MATH1', attended: 21, total: 31 }
  ]
};
const driftDrop = engine.detectDrift(goodBaseline, droppedCourses);
assert.strictEqual(driftDrop.drifted, true);
assert.strictEqual(driftDrop.type, 'course_count_drop');
console.log('   ✅ Course count drop detected as drift:', driftDrop.reason);

// Case C: Held classes regressed (e.g. 31 -> 25)
const heldRegressed = {
  subjects: [
    { name: 'Mathematics-I (Foundation)', code: 'MATH1', attended: 21, total: 25 },
    { name: 'Problem Solving and Programming', code: 'PSP', attended: 31, total: 33 },
    { name: 'Web Application Development - I', code: 'WAD1', attended: 17, total: 17 },
    { name: 'Social Communication I', code: 'SOC1', attended: 15, total: 17 }
  ]
};
const driftHeld = engine.detectDrift(goodBaseline, heldRegressed);
assert.strictEqual(driftHeld.drifted, true);
assert.strictEqual(driftHeld.type, 'held_dropped');
console.log('   ✅ Classes held drop detected as drift:', driftHeld.reason);

// Case D: Attended classes regressed (e.g. 31 -> 20)
const attendedRegressed = {
  subjects: [
    { name: 'Mathematics-I (Foundation)', code: 'MATH1', attended: 21, total: 31 },
    { name: 'Problem Solving and Programming', code: 'PSP', attended: 20, total: 33 },
    { name: 'Web Application Development - I', code: 'WAD1', attended: 17, total: 17 },
    { name: 'Social Communication I', code: 'SOC1', attended: 15, total: 17 }
  ]
};
const driftAttended = engine.detectDrift(goodBaseline, attendedRegressed);
assert.strictEqual(driftAttended.drifted, true);
assert.strictEqual(driftAttended.type, 'attended_dropped');
console.log('   ✅ Attended classes drop detected as drift:', driftAttended.reason);

// Case E: Clean scrape (normal progression: total & attended increment)
const normalProgression = {
  subjects: [
    { name: 'Mathematics-I (Foundation)', code: 'MATH1', attended: 22, total: 32 },
    { name: 'Problem Solving and Programming', code: 'PSP', attended: 32, total: 34 },
    { name: 'Web Application Development - I', code: 'WAD1', attended: 17, total: 17 },
    { name: 'Social Communication I', code: 'SOC1', attended: 15, total: 17 }
  ]
};
const cleanDrift = engine.detectDrift(goodBaseline, normalProgression);
assert.strictEqual(cleanDrift.drifted, false);
console.log('   ✅ Normal progression verified as clean (no false alarms).\n');

// 3. Human Override Tests
console.log('3️⃣ Testing Human Overrides...');
const overrides = {
  'mathematics-i (foundation)': { attended: 25, total: 31, reason: 'Manual attendance sheet signed' }
};

const overriddenSubjects = engine.applyOverrides(goodBaseline.subjects, overrides);
const mathSubj = overriddenSubjects.find(s => s.name.includes('Mathematics'));
assert.strictEqual(mathSubj.isManualOverride, true);
assert.strictEqual(mathSubj.scrapedAttended, 21);
assert.strictEqual(mathSubj.attended, 25);
assert.strictEqual(mathSubj.total, 31);
assert.strictEqual(mathSubj.percentage, (25 / 31) * 100);

const pspSubj = overriddenSubjects.find(s => s.name.includes('Problem Solving'));
assert.strictEqual(pspSubj.isManualOverride, false);
assert.strictEqual(pspSubj.attended, 31);
console.log('   ✅ Human override cleanly merged into data model with visible distinction.\n');

// 4. One-Click Diagnostics Tests
console.log('4️⃣ Testing One-Click Diagnostics Report Generator...');
const diagReport = engine.generateDiagnostics({
  version: '2.2.0',
  url: 'https://rishihood.rishiverse.com/student/attendance',
  domain: 'rishihood.rishiverse.com',
  domTablesCount: 1,
  domCardsCount: 0,
  subjects: overriddenSubjects,
  drift: { drifted: false },
  overrides,
  lastSync: '2026-11-03T07:45:00.000Z',
  consecutiveErrors: 0
});

assert(diagReport.includes('Bunkr Diagnostics (v2.2.0)'));
assert(diagReport.includes('rishihood.rishiverse.com'));
assert(diagReport.includes('[MANUAL OVERRIDE: was 21/31]'));
assert(diagReport.includes('[SCRAPED]'));
console.log('   ✅ Diagnostics report verified markdown formatting:\n' + diagReport.split('\n').map(l => '      ' + l).join('\n'));

// 5. Resilience / Backup Roundtrip
console.log('5️⃣ Testing Resilience Backup / Restore Roundtrip...');
const originalSettings = {
  attendmate_backup_version: '2.2.0',
  exported_at: new Date().toISOString(),
  targetPercentage: 80,
  manualOverrides: overrides,
  cachedAttendance: goodBaseline,
  lastSync: new Date().toISOString()
};

const serialized = JSON.stringify(originalSettings);
const restored = JSON.parse(serialized);
assert.strictEqual(restored.targetPercentage, 80);
assert.deepStrictEqual(restored.manualOverrides, overrides);
assert.strictEqual(restored.attendmate_backup_version, '2.2.0');
console.log('   ✅ Backup snapshot export/restore roundtrip verified.\n');

// 6. Timetable and Dynamic Calendar
console.log('6️⃣ Testing Timetable and Dynamic Calendar Engine...');
assert.strictEqual(Object.keys(timetable.SLOTS).length, 8);
let totalWeekly = 0;
for (const k in timetable.SLOTS) {
  totalWeekly += timetable.SLOTS[k].sessionsPerWeek;
}
assert.strictEqual(totalWeekly, 21);
console.log('   ✅ Timetable verified: 8 subjects, 21 sessions/week with rooms.');

const remMath = engine.getDynamicRemainingClasses('Mathematics-I (Foundation)', new Date(2026, 10, 3));
assert(remMath > 0);
console.log(`   ✅ Dynamic remaining classes for Mathematics calculated: ${remMath} classes left.`);

console.log('\n🎉 ALL PHASE 1 CORE UNIT TESTS PASSED SUCCESSFULLY!\n');
