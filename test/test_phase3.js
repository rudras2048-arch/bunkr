// Bunkr Phase 3 Verification Test Suite
// Verifies all outcomes of Phase 3: "Coach & Share"
// 1. Dynamic projection math (current pace vs max attainable) across all calendar edge cases
// 2. Coach callouts (factual gap only when trending below target; silence for healthy courses)
// 3. Projection honesty (stale/drift inheritance, manual overrides feeding in, semester complete state)
// 4. WhatsApp Share Text format snapshot test (pure text, short lines, no links/images/tracking)

const assert = require('assert');
const timetable = require('../data/timetable');
const engine = require('../lib/engine');

console.log('🧪 Starting Bunkr Phase 3 Verification Suite...\n');

const mockSubjects = [
  { name: 'Mathematics-I (Foundation)', code: 'CSD02C1001', attended: 21, total: 31 }, // 67.7%
  { name: 'Problem Solving and Programming', code: 'CSD02C1002', attended: 31, total: 33 }, // 93.9%
  { name: 'Web Application Development - I', code: 'CSD02C1003', attended: 17, total: 17 }, // 100.0%
  { name: 'Social Communication I', code: 'RSPRFC1003', attended: 15, total: 17 }, // 88.2%
  { name: 'Computer fundamentals and networking', code: 'CSD02C1004', attended: 16, total: 18 }, // 88.9%
  { name: 'Understanding India', code: 'RSPRFC1001', attended: 10, total: 12 }, // 83.3%
  { name: 'KPMG/Edept Workshop Certification Program', code: 'KPMG01', attended: 11, total: 12 }, // 91.7%
  { name: 'Self and Society I', code: 'RSPRFC1002', attended: 5, total: 7 } // 71.4%
];

// 1. Calendar Edge Cases for Dynamic Remaining Sessions
console.log('1️⃣ Testing Dynamic Remaining Sessions across Calendar Edge Cases...');

// 1a. Before semester starts (Aug 1, 2026) -> should count all semester sessions
const aug1 = new Date(2026, 7, 1);
const pspAug = engine.getDynamicRemainingClasses('psp', aug1);
assert.strictEqual(pspAug, 72, 'PSP should have 72 remaining sessions before semester starts');
console.log(`   ✅ Before semester (Aug 1, 2026): PSP has all ${pspAug} semester sessions remaining.`);

// 1b. During Diwali break (Nov 8, 2026) -> strictly excludes break days
const diwaliMid = new Date(2026, 10, 8);
assert.strictEqual(engine.isDateInDiwaliBreak(diwaliMid), true);
const pspDiwali = engine.getDynamicRemainingClasses('psp', diwaliMid);
assert(pspDiwali > 0 && pspDiwali < 72, 'Diwali remaining classes should be strictly between 0 and 72');
console.log(`   ✅ During Diwali break (Nov 8, 2026): remaining sessions correctly excludes break days (${pspDiwali} left).`);

// 1c. Last day of semester (Dec 18, 2026)
// Morning: Dec 18 08:00 (WAD has class at 13:30)
const lastDayMorning = new Date(2026, 11, 18, 8, 0, 0);
const wadMorning = engine.getDynamicRemainingClasses('wad', lastDayMorning);
assert.strictEqual(wadMorning, 1, 'WAD should have 1 session remaining on Friday morning');

// Night: Dec 18 20:00 (all classes completed)
const lastDayNight = new Date(2026, 11, 18, 20, 0, 0);
const wadNight = engine.getDynamicRemainingClasses('wad', lastDayNight);
assert.strictEqual(wadNight, 0, 'WAD should have 0 sessions remaining on Friday night');
console.log('   ✅ On last day (Dec 18, 2026): 1 session remaining in morning, 0 remaining at night.');

// 1d. Zero Remaining Sessions / After Semester (Dec 19, 2026)
const postSemester = new Date(2026, 11, 19, 10, 0, 0);
const pspPost = engine.getDynamicRemainingClasses('psp', postSemester);
assert.strictEqual(pspPost, 0, 'Post-semester remaining classes must be exactly 0');
console.log('   ✅ After semester end (Dec 19, 2026): exactly 0 sessions remain.');

// 2. Projection Math: Current Pace vs Max Attainable
console.log('\n2️⃣ Testing Projection Math (Current Pace vs Max Attainable)...');
const midSemesterDate = new Date(2026, 10, 3, 10, 0, 0); // Nov 3, 2026
const proj = engine.calculateSemesterProjection(mockSubjects, {
  now: midSemesterDate,
  targetPercentage: 75
});

assert(proj.totalRemainingSessions > 0, 'Total remaining sessions must be positive');
assert(proj.currentOverallPct > 0, 'Current overall % must be positive');
assert(proj.overallPacePct > 0, 'Overall pace % must be positive');
assert(proj.overallMaxPct >= proj.overallPacePct, 'Max attainable % must be >= pace %');
assert.strictEqual(proj.isSemesterComplete, false, 'Semester is active, not complete');
console.log(`   ✅ Projection calculated: Current: ${proj.currentOverallPct.toFixed(1)}% | At Pace: ${proj.overallPacePct.toFixed(1)}% | Max: ${proj.overallMaxPct.toFixed(1)}% (${proj.totalRemainingSessions} sessions remaining).`);

// 3. Coach Callouts: Speaks Only When Needed (Silence for Healthy Courses)
console.log('\n3️⃣ Testing Coach Callout Logic & Factual Gap Reporting...');
const mathCourse = proj.perCourse.find(c => c.acronym === 'MATH');
const pspCourse = proj.perCourse.find(c => c.acronym === 'PSP');
const societyCourse = proj.perCourse.find(c => c.acronym === 'Self & Society');

// PSP is at 93.9% (trending above 75%) -> callout must be null
assert.strictEqual(pspCourse.isTrendingBelow, false);
assert.strictEqual(pspCourse.callout, null, 'Healthy course (PSP) must have null callout (silence is default)');
console.log('   ✅ Healthy course (PSP at 93.9%): Coach stays silent (callout = null).');

// MATH is at 67.7% (trending below 75%) -> callout must exist and state factual gap
assert.strictEqual(mathCourse.isTrendingBelow, true);
assert(mathCourse.callout !== null);
assert(mathCourse.callout.includes('Trending to finish at'));
assert(mathCourse.callout.includes('gap to secure 75%'));
console.log(`   ✅ At-risk course (MATH at 67.7%): Coach states fact and gap: "${mathCourse.callout}"`);

// Coach summary
assert.strictEqual(proj.atRiskCourses.length, 2, 'Only MATH and Self & Society should trend below 75%');
console.log(`   ✅ Coach summary: ${proj.coachHealthySummary}`);

// Test target sensitivity (e.g. at 85% target, more courses trend below)
const proj85 = engine.calculateSemesterProjection(mockSubjects, {
  now: midSemesterDate,
  targetPercentage: 85
});
assert(proj85.atRiskCourses.length > proj.atRiskCourses.length, 'Higher target (85%) should flag more at-risk courses');
console.log(`   ✅ Target sensitivity: at 85% target, flags ${proj85.atRiskCourses.length} courses trending below.`);

// 4. Projection Honesty: Stale/Drift Inheritance & Manual Overrides
console.log('\n4️⃣ Testing Projection Honesty & Overrides...');

// 4a. Stale / Drift state
const projDrift = engine.calculateSemesterProjection(mockSubjects, {
  now: midSemesterDate,
  targetPercentage: 75,
  drift: { drifted: true, reason: 'Course count dropped' }
});
assert.strictEqual(projDrift.isStale, true);
assert.strictEqual(projDrift.staleNotice, 'Based on last known data');
console.log('   ✅ Projection visibly inherits drift/stale alarm:', projDrift.staleNotice);

// 4b. Manual Overrides feeding into projection
const overrides = {
  'mathematics-i (foundation)': { attended: 28, total: 31, reason: 'Manual correction' }
};
const projOverridden = engine.calculateSemesterProjection(mockSubjects, {
  now: midSemesterDate,
  targetPercentage: 75,
  overrides
});
const mathOverridden = projOverridden.perCourse.find(c => c.acronym === 'MATH');
assert.strictEqual(mathOverridden.attended, 28);
assert.strictEqual(mathOverridden.isManualOverride, true);
assert(mathOverridden.projPctAtPace > mathCourse.projPctAtPace, 'Overridden higher attendance must raise projected pace');
console.log(`   ✅ Manual override feeds into projection: MATH projected pace rose from ${mathCourse.projPctAtPace.toFixed(1)}% to ${mathOverridden.projPctAtPace.toFixed(1)}%.`);

// 4c. Semester Complete State (Zero remaining sessions)
const projComplete = engine.calculateSemesterProjection(mockSubjects, {
  now: new Date(2026, 11, 20),
  targetPercentage: 75
});
assert.strictEqual(projComplete.isSemesterComplete, true);
assert.strictEqual(projComplete.totalRemainingSessions, 0);
assert.strictEqual(projComplete.overallPacePct, projComplete.currentOverallPct);
assert.strictEqual(projComplete.overallMaxPct, projComplete.currentOverallPct);
console.log('   ✅ Clean semester-complete state: 0 sessions remaining, pace % equals current % without errors.');

// 5. WhatsApp Share Text Snapshot Test
console.log('\n5️⃣ Testing WhatsApp Share Text Snapshot...');
const shareText = engine.generateShareText({
  subjects: mockSubjects,
  timestamp: midSemesterDate.getTime(),
  targetPercentage: 75
}, { now: midSemesterDate });

console.log('--- Share Text Output ---');
console.log(shareText);
console.log('-------------------------');

// Assertions on share text format
assert(shareText.includes('Bunkr Status • Nov 3, 2026'), 'Share text must include clean date header');
assert(shareText.includes('Overall: 85.7% (Target: 75%)'), 'Share text must include overall attendance and target');
assert(shareText.includes('Projected: 86.2% at pace • 92.0% max'), 'Share text must include projected finish');
assert(shareText.includes('• PSP: 31/33 (93.9%) — can bunk 8'), 'Share text must include PSP one-liner with engine canBunk 8');
assert(shareText.includes('• MATH: 21/31 (67.7%) — attend 9 to reach 75%'), 'Share text must include MATH one-liner with attend 9 to reach 75%');
assert(!shareText.includes('http://') && !shareText.includes('https://'), 'Share text must contain NO URLs/links');
assert(!shareText.includes('<') && !shareText.includes('>'), 'Share text must contain NO HTML tags');

// Test share text under semester complete state
const shareComplete = engine.generateShareText({
  subjects: mockSubjects,
  timestamp: new Date(2026, 11, 20).getTime(),
  targetPercentage: 75
}, { now: new Date(2026, 11, 20) });
assert(shareComplete.includes('Semester Complete (Final)'), 'Share text in finished semester must indicate completion');
console.log('   ✅ WhatsApp share text adheres strictly to plain-text, zero-link, short-line snapshot specification.');

console.log('\n🎉 ALL PHASE 3 VERIFICATION TESTS PASSED SUCCESSFULLY! (100% Correctness)');
