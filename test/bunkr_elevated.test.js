const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const timetable = require('../extension/data/timetable.js');
const engine = require('../extension/lib/engine.js');

const SAMPLE_COURSES = [
  { name: 'KPMG/Edept Workshop Certification Program', code: 'CSDS-2601', attended: 1, total: 3, percentage: 33.3 },
  { name: 'Problem Solving and Programming', code: 'CSD02C1002', attended: 34, total: 41, percentage: 82.9 },
  { name: 'Self and Society I', code: 'RSPRFC1002', attended: 9, total: 10, percentage: 90.0 },
  { name: 'Web Application Development I', code: 'CSD02C1003', attended: 36, total: 40, percentage: 90.0 },
  { name: 'Computer fundamentals and networking', code: 'CSD02C1004', attended: 19, total: 22, percentage: 86.4 },
  { name: 'Social Communication I', code: 'RSPRFC1003', attended: 19, total: 21, percentage: 90.5 }
];

test('BATCH_PRESETS includes 3 Rishihood sections and returns deep clones', () => {
  assert.ok(timetable.BATCH_PRESETS['cse-ds-sec-a']);
  assert.ok(timetable.BATCH_PRESETS['cse-ds-sec-b']);
  assert.ok(timetable.BATCH_PRESETS['cse-aiml-sec-a']);

  const cloneA = timetable.getPreset('cse-ds-sec-b');
  cloneA.section = 'Mutated';
  assert.equal(timetable.getPreset('cse-ds-sec-b').section, 'Sec-B');
});

test('getRemainingTeachingSummary computes dynamic non-hardcoded counts', () => {
  const midSem = engine.getRemainingTeachingSummary(new Date(2026, 9, 12, 8, 0, 0));
  assert.ok(midSem.teachingDaysLeft > 0);
  assert.ok(midSem.totalClassesLeft > 0);
  assert.equal(midSem.subjectsCount, 8);
  assert.match(midSem.endDateFormatted, /Dec 18, 2026/);

  const afterSem = engine.getRemainingTeachingSummary(new Date(2026, 11, 25, 10, 0, 0));
  assert.equal(afterSem.teachingDaysLeft, 0);
  assert.equal(afterSem.totalClassesLeft, 0);
});

test('calculateExcusedRecovery computes exact excused/medical leaves needed', () => {
  // 1/3 = 33.3%, target 75% -> ceil(0.75 * 3) = 3 -> needs 2 excused leaves
  const rec = engine.calculateExcusedRecovery(1, 3, 75);
  assert.equal(rec.alreadySafe, false);
  assert.equal(rec.neededExcused, 2);
  assert.equal(rec.possible, true);

  // 19/21 = 90.5% -> already safe
  const safe = engine.calculateExcusedRecovery(19, 21, 75);
  assert.equal(safe.alreadySafe, true);
  assert.equal(safe.neededExcused, 0);
});

test('simulateLeavePlan accurately counts missed classes, skips Diwali break, and applies excused leaves', () => {
  // Mon Oct 12 to Wed Oct 14, 2026 (3 teaching days)
  const plan = engine.simulateLeavePlan(SAMPLE_COURSES, '2026-10-12', '2026-10-14', { targetPercentage: 75 });
  assert.equal(plan.valid, true);
  assert.equal(plan.teachingDaysMissed, 3);
  assert.ok(plan.totalMissedSessions > 0);
  assert.ok(plan.overallAfterPct < plan.overallBeforePct);

  const planExcused = engine.simulateLeavePlan(SAMPLE_COURSES, '2026-10-12', '2026-10-14', {
    targetPercentage: 75,
    excusedLeaves: 1
  });
  assert.ok(planExcused.overallAfterPct > plan.overallAfterPct);

  // Diwali Break (Nov 6-13, 2026) should have 0 missed classes
  const diwali = engine.simulateLeavePlan(SAMPLE_COURSES, '2026-11-06', '2026-11-13', { targetPercentage: 75 });
  assert.equal(diwali.valid, true);
  assert.equal(diwali.totalMissedSessions, 0);
  assert.equal(diwali.verdictTone, 'safe');

  // Invalid reversed range
  const invalid = engine.simulateLeavePlan(SAMPLE_COURSES, '2026-10-15', '2026-10-12');
  assert.equal(invalid.valid, false);

  // WhatsApp trip share text
  const share = engine.generateTripShareText(plan);
  assert.match(share, /Bunkr Trip Plan/);
  assert.match(share, /Course Impact:/);
});

test('encodeBatchCode and decodeBatchCode roundtrip cleanly and reject invalid codes', () => {
  const secB = timetable.getPreset('cse-ds-sec-b');
  const code = engine.encodeBatchCode(secB);
  assert.ok(code.startsWith('BUNKR-TT1:'));

  const decoded = engine.decodeBatchCode(code);
  assert.equal(decoded.ok, true);
  assert.equal(decoded.timetable.section, 'Sec-B');
  assert.equal(decoded.timetable.subjectsCount, 8);
  assert.equal(decoded.timetable.weeklySessionsCount, 21);

  assert.equal(engine.decodeBatchCode('INVALID-CODE').ok, false);
  assert.equal(engine.decodeBatchCode('BUNKR-TT1:!!!corrupted!!!').ok, false);
});

test('detectDrift tolerates minor faculty adjustment (23 -> 21) while flagging real structural drops', () => {
  const prev = {
    subjects: [
      { name: 'Social Communication I', attended: 21, total: 23 },
      { name: 'Problem Solving and Programming', attended: 34, total: 41 }
    ]
  };
  const minorEdit = {
    subjects: [
      { name: 'Social Communication I', attended: 19, total: 21 },
      { name: 'Problem Solving and Programming', attended: 34, total: 41 }
    ]
  };
  assert.equal(engine.detectDrift(prev, minorEdit).drifted, false);

  const majorDrop = {
    subjects: [
      { name: 'Social Communication I', attended: 10, total: 15 },
      { name: 'Problem Solving and Programming', attended: 34, total: 41 }
    ]
  };
  assert.equal(engine.detectDrift(prev, majorDrop).drifted, true);
  assert.equal(engine.detectDrift(prev, { subjects: [] }).drifted, true);
});

test('manifest.json preserves Chrome Web Store minimal permissions contract', () => {
  const manifestPath = path.join(__dirname, '..', 'extension', 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.ok(['2.4.1', '2.4.2'].includes(manifest.version));
  assert.deepEqual(manifest.permissions, ['storage', 'notifications', 'alarms']);
  assert.equal(manifest.chrome_url_overrides, undefined);
});
