// Bunkr v2.4.1 Hotfix Verification Test Suite
// Verifies Defect 1 (blocking - math unification) and Defect 2 (contract - manifest permissions)

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const engine = require('../lib/engine');

console.log('🧪 Starting Bunkr v2.4.1 Hotfix Verification Suite...\n');

// ============================================================================
// DEFECT 1: Blocking — share-text and coach numbers are engine-derived
// ============================================================================
console.log('1️⃣ Verifying Defect 1: Engine Math Parity against Fixture Reference Table (Target: 75%)...');

const fixtureReference = [
  { name: 'Mathematics-I (Foundation)', acronym: 'MATH', attended: 21, total: 31, expectedCanBunk: 0, expectedNeedToAttend: 9, isBelow: true },
  { name: 'Problem Solving and Programming', acronym: 'PSP', attended: 31, total: 33, expectedCanBunk: 8, expectedNeedToAttend: 0, isBelow: false },
  { name: 'Web Application Development - I', acronym: 'WAD', attended: 17, total: 17, expectedCanBunk: 5, expectedNeedToAttend: 0, isBelow: false },
  { name: 'Social Communication I', acronym: 'Social Comm', attended: 15, total: 17, expectedCanBunk: 3, expectedNeedToAttend: 0, isBelow: false },
  { name: 'Computer fundamentals and networking', acronym: 'CFN', attended: 16, total: 18, expectedCanBunk: 3, expectedNeedToAttend: 0, isBelow: false },
  { name: 'Understanding India', acronym: 'India', attended: 10, total: 12, expectedCanBunk: 1, expectedNeedToAttend: 0, isBelow: false },
  { name: 'KPMG/Edept Workshop Certification Program', acronym: 'KPMG', attended: 11, total: 12, expectedCanBunk: 2, expectedNeedToAttend: 0, isBelow: false },
  { name: 'Self and Society I', acronym: 'Self & Society', attended: 5, total: 7, expectedCanBunk: 0, expectedNeedToAttend: 1, isBelow: true }
];

// Test 1a: Direct engine functions
for (const item of fixtureReference) {
  const canBunk = engine.calculateBunkableClasses(item.attended, item.total, 75);
  const needToAttend = engine.calculateClassesNeeded(item.attended, item.total, 75);

  assert.strictEqual(canBunk, item.expectedCanBunk, `${item.acronym}: canBunk must be ${item.expectedCanBunk}, got ${canBunk}`);
  assert.strictEqual(needToAttend, item.expectedNeedToAttend, `${item.acronym}: needToAttend must be ${item.expectedNeedToAttend}, got ${needToAttend}`);
  console.log(`   ✅ Engine Math verified for ${item.acronym} (${item.attended}/${item.total}): canBunk=${canBunk}, needToAttend=${needToAttend}`);
}

// Test 1b: Share-Text parsing and numeric equality
console.log('\n2️⃣ Verifying Share-Text Builder: Parsing & Asserting Every Line Equals Engine Output...');
const mockSubjects = fixtureReference.map(f => ({ name: f.name, attended: f.attended, total: f.total }));
const refDate = new Date(2026, 10, 3, 10, 0, 0);

const shareText = engine.generateShareText({
  subjects: mockSubjects,
  timestamp: refDate.getTime(),
  targetPercentage: 75
}, { now: refDate });

const lines = shareText.split('\n');
const courseLines = lines.filter(l => l.startsWith('• '));
assert.strictEqual(courseLines.length, 8, 'Share text must contain exactly 8 course bullet points');

for (const item of fixtureReference) {
  const line = courseLines.find(l => l.includes(`• ${item.acronym}:`));
  assert(line, `Share text must contain a line for ${item.acronym}`);

  if (item.isBelow) {
    // Must show "attend N to reach 75%"
    const expectedSubstr = `attend ${item.expectedNeedToAttend} to reach 75%`;
    assert(line.includes(expectedSubstr), `Line for ${item.acronym} must contain "${expectedSubstr}", got "${line}"`);
    // MUST NEVER say "can bunk"
    assert(!line.includes('can bunk'), `Below-target line for ${item.acronym} must NEVER contain "can bunk", got "${line}"`);
    console.log(`   ✅ Below-target honest labeling for ${item.acronym}: "${line}"`);
  } else {
    // Must show "can bunk K"
    const expectedSubstr = `can bunk ${item.expectedCanBunk}`;
    assert(line.includes(expectedSubstr), `Line for ${item.acronym} must contain "${expectedSubstr}", got "${line}"`);
    console.log(`   ✅ Above-target safe bunk labeling for ${item.acronym}: "${line}"`);
  }
}

// Test 1c: Attendance Coach session gap phrasing uses identical engine number
console.log('\n3️⃣ Verifying Coach "Session Gap" Phrasing Matches Engine needToAttend Exactly...');
const proj = engine.calculateSemesterProjection(mockSubjects, {
  now: refDate,
  targetPercentage: 75
});

const mathCourse = proj.perCourse.find(c => c.acronym === 'MATH');
const societyCourse = proj.perCourse.find(c => c.acronym === 'Self & Society');

assert.strictEqual(mathCourse.sessionGap, 9, 'MATH sessionGap must be exactly 9');
assert.strictEqual(mathCourse.needToAttend, 9, 'MATH needToAttend must be exactly 9');
assert(mathCourse.callout.includes('9 session gap to secure 75%'), `MATH callout must state 9 session gap, got: "${mathCourse.callout}"`);

assert.strictEqual(societyCourse.sessionGap, 1, 'Self & Society sessionGap must be exactly 1');
assert.strictEqual(societyCourse.needToAttend, 1, 'Self & Society needToAttend must be exactly 1');
assert(societyCourse.callout.includes('1 session gap to secure 75%'), `Self & Society callout must state 1 session gap, got: "${societyCourse.callout}"`);
console.log(`   ✅ Coach session gap for MATH: "${mathCourse.callout}" (engine gap = 9)`);
console.log(`   ✅ Coach session gap for Self & Society: "${societyCourse.callout}" (engine gap = 1)`);

// Test 1d: Regression tests for exact 75.0% boundary cases
console.log('\n4️⃣ Verifying Regression Tests for Exact 75.0% Cases (30/40 and 6/8)...');

// Case 1: 30/40 (MATH 21/31 + 9 classes)
const mathNeeded = engine.calculateClassesNeeded(21, 31, 75);
assert.strictEqual(mathNeeded, 9);
const finalMathAttended = 21 + mathNeeded;
const finalMathHeld = 31 + mathNeeded;
assert.strictEqual(finalMathAttended, 30);
assert.strictEqual(finalMathHeld, 40);
assert.strictEqual(finalMathAttended / finalMathHeld, 0.75, '30/40 must equal exactly 0.75 (75.0%)');

const exact30_40_bunk = engine.calculateBunkableClasses(30, 40, 75);
const exact30_40_needed = engine.calculateClassesNeeded(30, 40, 75);
assert.strictEqual(exact30_40_bunk, 0, 'At exactly 75.0% (30/40), canBunk must be 0');
assert.strictEqual(exact30_40_needed, 0, 'At exactly 75.0% (30/40), needToAttend must be 0');
console.log('   ✅ 30/40 (75.0% exact): needToAttend = 0, canBunk = 0');

// Case 2: 6/8 (Self & Society 5/7 + 1 class)
const societyNeeded = engine.calculateClassesNeeded(5, 7, 75);
assert.strictEqual(societyNeeded, 1);
const finalSocAttended = 5 + societyNeeded;
const finalSocHeld = 7 + societyNeeded;
assert.strictEqual(finalSocAttended, 6);
assert.strictEqual(finalSocHeld, 8);
assert.strictEqual(finalSocAttended / finalSocHeld, 0.75, '6/8 must equal exactly 0.75 (75.0%)');

const exact6_8_bunk = engine.calculateBunkableClasses(6, 8, 75);
const exact6_8_needed = engine.calculateClassesNeeded(6, 8, 75);
assert.strictEqual(exact6_8_bunk, 0, 'At exactly 75.0% (6/8), canBunk must be 0');
assert.strictEqual(exact6_8_needed, 0, 'At exactly 75.0% (6/8), needToAttend must be 0');
console.log('   ✅ 6/8 (75.0% exact): needToAttend = 0, canBunk = 0');

// ============================================================================
// DEFECT 2: Contract — manifest permissions strictly ("storage", "notifications")
// ============================================================================
console.log('\n5️⃣ Verifying Defect 2: Extension Manifest Permissions & Version Contract...');
const manifestPath = path.join(__dirname, '..', 'extension', 'manifest.json');
const manifestRaw = fs.readFileSync(manifestPath, 'utf8');
const manifest = JSON.parse(manifestRaw);

assert(['2.4.1', '2.4.2'].includes(manifest.version), `Manifest version must be 2.4.1 or 2.4.2, got "${manifest.version}"`);
console.log(`   ✅ Manifest version is bumped to: ${manifest.version}`);

assert(Array.isArray(manifest.permissions), 'Manifest permissions must be an array');
assert(manifest.permissions.includes('storage'), 'Permissions must include "storage"');
assert(manifest.permissions.includes('notifications'), 'Permissions must include "notifications"');
assert(manifest.permissions.includes('alarms'), 'Permissions must include "alarms" (required for MV3 service worker nudges)');
assert(!manifest.permissions.includes('activeTab'), 'Permissions must NOT include "activeTab" (removed per Phase 2 contract)');
assert.strictEqual(manifest.permissions.length, 3, `Permissions array must contain strictly 3 items, got: ${JSON.stringify(manifest.permissions)}`);
console.log(`   ✅ Manifest permissions strictly match contract: ${JSON.stringify(manifest.permissions)}`);

console.log('\n🎉 ALL v2.4.1 HOTFIX VERIFICATION TESTS PASSED SUCCESSFULLY! (100% Parity & Compliance)');
