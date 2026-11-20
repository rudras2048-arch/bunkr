// test/test_sgpa_forecaster.js
// Verification suite for Multi-Course Semester SGPA Forecaster & Cross-course Persistence

const assert = require('assert');
const path = require('path');
const fs = require('fs');

console.log('🧪 Starting Multi-Course Semester SGPA Forecaster Verification Suite...\n');

const canvasGrades = require('../extension/content/canvas_grades');
const newtab = require('../extension/newtab/newtab');

// ============================================================================
// PART 1: Default Rishihood Credits Verification
// ============================================================================
console.log('1️⃣ Testing Rishihood Course Credits Resolution...');

const expectedCredits = {
  'CSD02C1001': { name: 'Mathematics-I', credits: 4 },
  'CSD02C1002': { name: 'Problem Solving and Programming (PSP)', credits: 4 },
  'CSD02C1003': { name: 'Web Application Development - I (WAD)', credits: 3 },
  'CSD02C1004': { name: 'Computer fundamentals and networking (CFN)', credits: 3 },
  'RSPRFC1003': { name: 'Social Communication I', credits: 2 },
  'RSPRFC1001': { name: 'Understanding India', credits: 2 },
  'KPMG01': { name: 'KPMG/Edept Workshop', credits: 2 },
  'RSPRFC1002': { name: 'Self and Society I', credits: 2 }
};

let totalCreditsCheck = 0;
for (const [code, expected] of Object.entries(expectedCredits)) {
  const creditsGrades = canvasGrades.getDefaultCredits(code, expected.name);
  const creditsNewtab = newtab.getDefaultCredits(code, expected.name);
  assert.strictEqual(creditsGrades, expected.credits, `canvasGrades: ${code} must have ${expected.credits} credits`);
  assert.strictEqual(creditsNewtab, expected.credits, `newtab: ${code} must have ${expected.credits} credits`);
  totalCreditsCheck += expected.credits;
  console.log(`   ✅ Resolved ${expected.name} (${code}): ${creditsGrades} Credits`);
}
assert.strictEqual(totalCreditsCheck, 22, 'Total semester credits for Semester 1 must be exactly 22 credits');
console.log(`   ✅ Total Semester Credits: ${totalCreditsCheck} (Expected: 22)\n`);

// Also verify keyword based resolution without code
assert.strictEqual(canvasGrades.getDefaultCredits('', 'Mathematics 1'), 4);
assert.strictEqual(canvasGrades.getDefaultCredits('', 'Problem Solving with Python'), 4);
assert.strictEqual(canvasGrades.getDefaultCredits('', 'Web Applications'), 3);
assert.strictEqual(canvasGrades.getDefaultCredits('', 'Computer Networking'), 3);
assert.strictEqual(canvasGrades.getDefaultCredits('', 'Social Communication'), 2);
assert.strictEqual(canvasGrades.getDefaultCredits('', 'Understanding India'), 2);
assert.strictEqual(canvasGrades.getDefaultCredits('', 'KPMG Workshop'), 2);
assert.strictEqual(canvasGrades.getDefaultCredits('', 'Self and Society'), 2);
console.log('   ✅ Keyword-based credit fallback verified.\n');

// ============================================================================
// PART 2: Cross-course Persistence under canvas_courses_grades
// ============================================================================
console.log('2️⃣ Testing Cross-course Persistence into chrome.storage.local (canvas_courses_grades)...');

// Load HTML fixture: Rishihood CSD02C1001 Mathematics-I
const fixturePath = path.resolve(__dirname, '../extension/demo/canvas_grades_demo.html');
const demoHtml = fs.readFileSync(fixturePath, 'utf8');

const courseData = canvasGrades.scrapeGradebook(demoHtml);
const forecast = canvasGrades.calculateForecaster(courseData, 80);

// Build course metrics
const metrics = canvasGrades.buildCourseGradeMetrics(courseData, forecast);
assert.strictEqual(metrics.code, 'CSD02C1001');
assert.strictEqual(metrics.name, 'Mathematics-I');
assert.strictEqual(metrics.credits, 4);
assert.strictEqual(metrics.lockedPercentage, 52.0);
assert.strictEqual(metrics.lockedSGPA, 5.2);
assert.strictEqual(metrics.maxPossiblePercentage, 92.0);
assert.strictEqual(metrics.maxPossibleSGPA, 9.2);
assert.strictEqual(metrics.targetPercentage, 80.0);
assert.strictEqual(metrics.targetSGPA, 8.0);
console.log(`   ✅ Built course metrics for ${metrics.name}: Locked=${metrics.lockedPercentage}%, Max=${metrics.maxPossiblePercentage}%, Target=${metrics.targetPercentage}%, Credits=${metrics.credits}`);

// Mock chrome.storage.local
const mockStorageState = {};
const mockStorage = {
  get: function (keys, callback) {
    const result = {};
    keys.forEach((k) => {
      if (mockStorageState[k] !== undefined) {
        result[k] = JSON.parse(JSON.stringify(mockStorageState[k]));
      }
    });
    callback(result);
  },
  set: function (items, callback) {
    Object.assign(mockStorageState, JSON.parse(JSON.stringify(items)));
    if (callback) callback();
  }
};

canvasGrades.saveCourseGradeMetrics(courseData, forecast, { storage: mockStorage }).then((res) => {
  assert(res.success, 'saveCourseGradeMetrics must succeed');
  assert(mockStorageState.canvas_courses_grades, 'storage must have canvas_courses_grades key');
  const savedMath = mockStorageState.canvas_courses_grades['CSD02C1001'];
  assert(savedMath, 'canvas_courses_grades must contain CSD02C1001');
  assert.strictEqual(savedMath.code, 'CSD02C1001');
  assert.strictEqual(savedMath.name, 'Mathematics-I');
  assert.strictEqual(savedMath.credits, 4);
  assert.strictEqual(savedMath.lockedPercentage, 52.0);
  assert.strictEqual(savedMath.maxPossiblePercentage, 92.0);
  assert.strictEqual(savedMath.targetPercentage, 80.0);
  console.log('   ✅ Successfully persisted course metrics to chrome.storage.local under canvas_courses_grades.\n');

  runSGPAMathTests();
}).catch((err) => {
  console.error('Persistence failed:', err);
  process.exit(1);
});

// ============================================================================
// PART 3: Credit-Weighted SGPA Formula & Simulator Mathematics
// ============================================================================
function runSGPAMathTests() {
  console.log('3️⃣ Testing Credit-Weighted SGPA Formula: SGPA = sum(Course SGPA * Credits) / sum(Credits)...');

  // Test Case A: Hand-calculated known numbers
  // Course 1: Math (4 credits, 8.0 SGPA = 32 weighted points)
  // Course 2: PSP (4 credits, 9.0 SGPA = 36 weighted points)
  // Total Credits = 8, Total Points = 68 => SGPA = 68 / 8 = 8.50
  const simpleCourses = [
    { code: 'CSD02C1001', name: 'Math', credits: 4, courseSGPA: 8.0 },
    { code: 'CSD02C1002', name: 'PSP', credits: 4, courseSGPA: 9.0 }
  ];
  const simpleRes = canvasGrades.calculateCreditWeightedSGPA(simpleCourses);
  assert.strictEqual(simpleRes.totalCredits, 8, 'Total credits must be 8');
  assert.strictEqual(simpleRes.currentSGPA, 8.5, 'Credit-weighted SGPA must be exactly 8.50');
  console.log(`   ✅ Simple 2-Course Weighted SGPA: ${simpleRes.currentSGPA} (Expected: 8.50)`);

  // Test Case B: Full Semester 1 (8 Courses, 22 Credits) with varied grades
  // 1. Math-I (4 credits): 8.0 SGPA -> 32.0
  // 2. PSP (4 credits): 8.5 SGPA -> 34.0
  // 3. WAD (3 credits): 9.0 SGPA -> 27.0
  // 4. CFN (3 credits): 7.5 SGPA -> 22.5
  // 5. Social Comm (2 credits): 8.0 SGPA -> 16.0
  // 6. India (2 credits): 9.5 SGPA -> 19.0
  // 7. KPMG (2 credits): 8.5 SGPA -> 17.0
  // 8. Self & Society (2 credits): 8.0 SGPA -> 16.0
  // Sum = 32 + 34 + 27 + 22.5 + 16 + 19 + 17 + 16 = 183.5
  // Total Credits = 22
  // Expected SGPA = 183.5 / 22 = 8.3409... -> 8.34
  const semesterCourses = [
    { code: 'CSD02C1001', credits: 4, lockedSGPA: 8.0, maxPossibleSGPA: 9.0 },
    { code: 'CSD02C1002', credits: 4, lockedSGPA: 8.5, maxPossibleSGPA: 9.5 },
    { code: 'CSD02C1003', credits: 3, lockedSGPA: 9.0, maxPossibleSGPA: 10.0 },
    { code: 'CSD02C1004', credits: 3, lockedSGPA: 7.5, maxPossibleSGPA: 8.5 },
    { code: 'RSPRFC1003', credits: 2, lockedSGPA: 8.0, maxPossibleSGPA: 9.0 },
    { code: 'RSPRFC1001', credits: 2, lockedSGPA: 9.5, maxPossibleSGPA: 10.0 },
    { code: 'KPMG01', credits: 2, lockedSGPA: 8.5, maxPossibleSGPA: 9.5 },
    { code: 'RSPRFC1002', credits: 2, lockedSGPA: 8.0, maxPossibleSGPA: 9.0 }
  ];

  const semStats = canvasGrades.calculateCreditWeightedSGPA(semesterCourses);
  assert.strictEqual(semStats.totalCredits, 22, 'Total semester credits must be 22');
  assert.strictEqual(semStats.currentSGPA, 8.34, 'Semester SGPA must be exactly 8.34');
  console.log(`   ✅ Full 8-Course Semester SGPA: ${semStats.currentSGPA} SGPA (22 credits, sum=183.5)\n`);

  // ============================================================================
  // PART 4: Interactive Target SGPA Simulator (7.5, 8.0, 8.5, 9.0)
  // ============================================================================
  console.log('4️⃣ Testing Multi-Course Target SGPA Simulator & Required Pace...');

  // Setup sample semester baseline where Math-I has Canvas live data (52% locked, 92% max)
  // and other courses have mid-semester progress
  const simCourses = [
    { code: 'CSD02C1001', name: 'Mathematics-I', credits: 4, lockedPercentage: 52.0, maxPossiblePercentage: 92.0 },
    { code: 'CSD02C1002', name: 'Problem Solving and Programming', credits: 4, lockedPercentage: 65.0, maxPossiblePercentage: 95.0 },
    { code: 'CSD02C1003', name: 'Web Application Development - I', credits: 3, lockedPercentage: 70.0, maxPossiblePercentage: 100.0 },
    { code: 'CSD02C1004', name: 'Computer fundamentals and networking', credits: 3, lockedPercentage: 60.0, maxPossiblePercentage: 90.0 },
    { code: 'RSPRFC1003', name: 'Social Communication I', credits: 2, lockedPercentage: 75.0, maxPossiblePercentage: 95.0 },
    { code: 'RSPRFC1001', name: 'Understanding India', credits: 2, lockedPercentage: 80.0, maxPossiblePercentage: 100.0 },
    { code: 'KPMG01', name: 'KPMG Workshop', credits: 2, lockedPercentage: 85.0, maxPossiblePercentage: 95.0 },
    { code: 'RSPRFC1002', name: 'Self and Society I', credits: 2, lockedPercentage: 70.0, maxPossiblePercentage: 90.0 }
  ];

  // Locked points sum:
  // Math: 5.2 * 4 = 20.8
  // PSP: 6.5 * 4 = 26.0
  // WAD: 7.0 * 3 = 21.0
  // CFN: 6.0 * 3 = 18.0
  // Social: 7.5 * 2 = 15.0
  // India: 8.0 * 2 = 16.0
  // KPMG: 8.5 * 2 = 17.0
  // Self: 7.0 * 2 = 14.0
  // Locked points = 147.8 -> Locked SGPA = 147.8 / 22 = 6.718... -> 6.72 SGPA (67.2%)
  //
  // Max points sum:
  // Math: 9.2 * 4 = 36.8
  // PSP: 9.5 * 4 = 38.0
  // WAD: 10.0 * 3 = 30.0
  // CFN: 9.0 * 3 = 27.0
  // Social: 9.5 * 2 = 19.0
  // India: 10.0 * 2 = 20.0
  // KPMG: 9.5 * 2 = 19.0
  // Self: 9.0 * 2 = 18.0
  // Max points = 207.8 -> Max SGPA = 207.8 / 22 = 9.445... -> 9.45 SGPA (94.5%)

  // Test target 8.0 SGPA
  const sim80 = canvasGrades.simulateTargetSGPA(simCourses, 8.0);
  assert.strictEqual(sim80.targetSGPA, 8.0);
  assert.strictEqual(sim80.isAchievable, true);
  assert.strictEqual(sim80.isAlreadyAchieved, false);
  assert(sim80.requiredPaceOnRemaining > 0 && sim80.requiredPaceOnRemaining < 100);
  console.log(`   ✅ Target 8.0 SGPA Simulator: Achievable=true, Required Pace across remaining=${sim80.requiredPaceOnRemaining}%`);

  // Test target 8.5 SGPA
  const sim85 = canvasGrades.simulateTargetSGPA(simCourses, 8.5);
  assert.strictEqual(sim85.targetSGPA, 8.5);
  assert.strictEqual(sim85.isAchievable, true);
  assert(sim85.requiredPaceOnRemaining > sim80.requiredPaceOnRemaining, 'Higher target must require higher pace on remaining assessments');
  console.log(`   ✅ Target 8.5 SGPA Simulator: Achievable=true, Required Pace across remaining=${sim85.requiredPaceOnRemaining}%`);

  // Test target 9.0 SGPA
  const sim90 = canvasGrades.simulateTargetSGPA(simCourses, 9.0);
  assert.strictEqual(sim90.targetSGPA, 9.0);
  assert.strictEqual(sim90.isAchievable, true);
  assert(sim90.requiredPaceOnRemaining > sim85.requiredPaceOnRemaining);
  console.log(`   ✅ Target 9.0 SGPA Simulator: Achievable=true, Required Pace across remaining=${sim90.requiredPaceOnRemaining}%`);

  // Test Unachievable Target (e.g. 9.8 SGPA > 9.45 max)
  const simImpossible = canvasGrades.simulateTargetSGPA(simCourses, 9.8);
  assert.strictEqual(simImpossible.isAchievable, false);
  assert.strictEqual(simImpossible.requiredPaceOnRemaining, null);
  console.log('   ✅ Unachievable target (9.8 SGPA > 9.45 max) correctly flagged as impossible.');

  // Test Already Achieved Target (e.g. 6.0 SGPA < 6.72 locked)
  const simAchieved = canvasGrades.simulateTargetSGPA(simCourses, 6.0);
  assert.strictEqual(simAchieved.isAlreadyAchieved, true);
  assert.strictEqual(simAchieved.requiredPaceOnRemaining, 0);
  console.log('   ✅ Already secured target (6.0 SGPA < 6.72 locked) correctly requires 0% additional pace.\n');

  // Verify parity between canvas_grades and newtab export
  const newtabSim = newtab.simulateTargetSGPA(simCourses, 8.0, { scale: 'linear' });
  assert.strictEqual(newtabSim.targetSGPA, sim80.targetSGPA);
  assert.strictEqual(newtabSim.currentSGPA, sim80.currentSGPA);
  assert.strictEqual(newtabSim.maxPossibleSGPA, sim80.maxPossibleSGPA);
  assert.strictEqual(newtabSim.requiredPaceOnRemaining, sim80.requiredPaceOnRemaining);

  const newtabUgcSim = newtab.simulateTargetSGPA(simCourses, 8.0);
  assert.strictEqual(newtabUgcSim.currentSGPA, 7.50, 'newtab.simulateTargetSGPA must default to UGC scale (7.50 SGPA)');
  console.log('   ✅ Parity verified: canvas_grades and newtab export identical simulator math.\n');

  // ============================================================================
  // PART 5: Command Center HTML Structure Verification
  // ============================================================================
  console.log('5️⃣ Testing Command Center newtab.html for SGPA Simulator UI...');
  const newtabHtmlPath = path.resolve(__dirname, '../extension/newtab/newtab.html');
  const newtabHtml = fs.readFileSync(newtabHtmlPath, 'utf8');

  assert(newtabHtml.includes('id="cc-sgpa-card"'), 'newtab.html must contain id="cc-sgpa-card"');
  assert(newtabHtml.includes('Semester Academic Standing &amp; SGPA Simulator') || newtabHtml.includes('Semester Academic Standing & SGPA Simulator'), 'newtab.html must contain card title');
  assert(newtabHtml.includes('id="sgpa-current-val"'), 'newtab.html must contain id="sgpa-current-val"');
  assert(newtabHtml.includes('id="sgpa-target-val"'), 'newtab.html must contain id="sgpa-target-val"');
  assert(newtabHtml.includes('id="sgpa-max-val"'), 'newtab.html must contain id="sgpa-max-val"');
  assert(newtabHtml.includes('id="sgpa-credits-val"'), 'newtab.html must contain id="sgpa-credits-val"');
  assert(newtabHtml.includes('id="sgpa-target-slider"'), 'newtab.html must contain id="sgpa-target-slider"');
  assert(newtabHtml.includes('id="sgpa-courses-list"'), 'newtab.html must contain id="sgpa-courses-list"');
  assert(newtabHtml.includes('canvas_grades.js'), 'newtab.html must include script tag for canvas_grades.js');
  console.log('   ✅ newtab.html structure verified with all required SGPA card elements.\n');

  // ============================================================================
  // PART 6: F-01 UGC CBCS 10-Point Scale Multi-Course SGPA & Linear Toggle
  // ============================================================================
  console.log('6️⃣ Testing F-01: UGC CBCS 10-Point Scale Multi-Course SGPA & Toggle...');

  // 6a. 2-Course Hand Calculation: UGC vs Linear Parity
  // Course 1: Math (4 credits, 75.0% score)
  //   - Under Linear: 7.5 SGPA * 4 = 30.0 grade points
  //   - Under UGC CBCS: 75% -> Grade A (Grade Point 8) * 4 = 32.0 grade points
  // Course 2: PSP (4 credits, 90.0% score)
  //   - Under Linear: 9.0 SGPA * 4 = 36.0 grade points
  //   - Under UGC CBCS: 90% -> Grade O (Grade Point 10) * 4 = 40.0 grade points
  // Total Credits: 8 credits
  // Expected Linear SGPA: (30 + 36) / 8 = 66 / 8 = 8.25 SGPA
  // Expected UGC SGPA: (32 + 40) / 8 = 72 / 8 = 9.00 SGPA
  const ugcTwoCourses = [
    { code: 'CSD02C1001', name: 'Mathematics-I', credits: 4, lockedPercentage: 75.0 },
    { code: 'CSD02C1002', name: 'PSP', credits: 4, lockedPercentage: 90.0 }
  ];

  const ugcTwoRes = canvasGrades.calculateCreditWeightedSGPA(ugcTwoCourses, { scale: 'ugc' });
  assert.strictEqual(ugcTwoRes.totalCredits, 8);
  assert.strictEqual(ugcTwoRes.currentSGPA, 9.00, 'Under UGC CBCS, (32 + 40)/8 must equal 9.00 SGPA');
  assert.strictEqual(ugcTwoRes.courses[0].lockedSGPA, 8, 'Math 75% earns Grade Point 8 (A) under UGC');
  assert.strictEqual(ugcTwoRes.courses[1].lockedSGPA, 10, 'PSP 90% earns Grade Point 10 (O) under UGC');

  const linearTwoRes = canvasGrades.calculateCreditWeightedSGPA(ugcTwoCourses, { scale: 'linear' });
  assert.strictEqual(linearTwoRes.totalCredits, 8);
  assert.strictEqual(linearTwoRes.currentSGPA, 8.25, 'Under Linear, (30 + 36)/8 must equal 8.25 SGPA');
  assert.strictEqual(linearTwoRes.courses[0].lockedSGPA, 7.5, 'Math 75% earns 7.5 under Linear');
  assert.strictEqual(linearTwoRes.courses[1].lockedSGPA, 9.0, 'PSP 90% earns 9.0 under Linear');

  // calculateOverallSGPA defaults to UGC scale
  const overallRes = canvasGrades.calculateOverallSGPA(ugcTwoCourses);
  assert.strictEqual(overallRes.currentSGPA, 9.00, 'calculateOverallSGPA must default to UGC scale (9.00 SGPA)');

  console.log(`   ✅ 2-Course Hand Calculation verified: UGC SGPA = ${ugcTwoRes.currentSGPA} (Exact: 9.00) vs Linear SGPA = ${linearTwoRes.currentSGPA} (Exact: 8.25)`);

  // 6b. Full 8-Course Semester under UGC CBCS
  // 1. Math-I (4 credits, 52% locked -> UGC Grade B, 6 GP): 4 * 6 = 24 pts
  // 2. PSP (4 credits, 65% locked -> UGC Grade B+, 7 GP): 4 * 7 = 28 pts
  // 3. WAD (3 credits, 70% locked -> UGC Grade A, 8 GP): 3 * 8 = 24 pts
  // 4. CFN (3 credits, 60% locked -> UGC Grade B+, 7 GP): 3 * 7 = 21 pts
  // 5. Social Comm (2 credits, 75% locked -> UGC Grade A, 8 GP): 2 * 8 = 16 pts
  // 6. India (2 credits, 80% locked -> UGC Grade A+, 9 GP): 2 * 9 = 18 pts
  // 7. KPMG (2 credits, 85% locked -> UGC Grade A+, 9 GP): 2 * 9 = 18 pts
  // 8. Self & Society (2 credits, 70% locked -> UGC Grade A, 8 GP): 2 * 8 = 16 pts
  // Sum = 24 + 28 + 24 + 21 + 16 + 18 + 18 + 16 = 165 pts
  // Credits = 22
  // UGC SGPA = 165 / 22 = 7.50 SGPA
  const ugcSemester = [
    { code: 'CSD02C1001', name: 'Mathematics-I', credits: 4, lockedPercentage: 52.0 },
    { code: 'CSD02C1002', name: 'PSP', credits: 4, lockedPercentage: 65.0 },
    { code: 'CSD02C1003', name: 'WAD', credits: 3, lockedPercentage: 70.0 },
    { code: 'CSD02C1004', name: 'CFN', credits: 3, lockedPercentage: 60.0 },
    { code: 'RSPRFC1003', name: 'Social Communication I', credits: 2, lockedPercentage: 75.0 },
    { code: 'RSPRFC1001', name: 'Understanding India', credits: 2, lockedPercentage: 80.0 },
    { code: 'KPMG01', name: 'KPMG Workshop', credits: 2, lockedPercentage: 85.0 },
    { code: 'RSPRFC1002', name: 'Self and Society I', credits: 2, lockedPercentage: 70.0 }
  ];

  const ugcSemCalc = canvasGrades.calculateCreditWeightedSGPA(ugcSemester, { scale: 'ugc' });
  assert.strictEqual(ugcSemCalc.totalCredits, 22);
  assert.strictEqual(ugcSemCalc.currentSGPA, 7.50, `UGC SGPA must equal 7.50, got ${ugcSemCalc.currentSGPA}`);
  console.log(`   ✅ Full 8-Course Semester under UGC CBCS: ${ugcSemCalc.currentSGPA} SGPA (22 credits, sum=165 pts)`);

  // ============================================================================
  // PART 7: F-02 Feasibility Ceiling & Zero-Slip Warning in Multi-Course Simulator
  // ============================================================================
  console.log('7️⃣ Testing F-02: Feasibility Ceiling & Zero-Slip Warning in SGPA Simulator...');

  // 7a. Near-ceiling target in multi-course simulator triggering zero-slip warning
  // Max possible SGPA is 9.45. Target 9.35 SGPA requires near 95%+ pace across remaining work
  const simNearCeiling = canvasGrades.simulateTargetSGPA(simCourses, 9.35);
  assert.strictEqual(simNearCeiling.isAchievable, true);
  assert(simNearCeiling.requiredPaceOnRemaining >= 95.0, `Pace must be >= 95%, got ${simNearCeiling.requiredPaceOnRemaining}%`);
  assert.strictEqual(simNearCeiling.isZeroSlipMargin, true, 'isZeroSlipMargin must be true for >= 95% pace');
  assert(simNearCeiling.zeroSlipWarning.includes('Zero-slip margin'), 'zeroSlipWarning must be populated');
  console.log(`   ✅ Multi-Course Near-Ceiling Target (9.35 SGPA, ${simNearCeiling.requiredPaceOnRemaining}% pace): Zero-slip warning verified.`);

  // 7b. Impossible Target exceeding maximum achievable SGPA
  const simOverMax = canvasGrades.simulateTargetSGPA(simCourses, 9.80);
  assert.strictEqual(simOverMax.isAchievable, false);
  assert.strictEqual(simOverMax.requiredPaceOnRemaining, null);
  assert(simOverMax.unreachableReason.includes('Unreachable') && simOverMax.unreachableReason.includes('exceeding 100%'),
    `Must flag unreachable with exceeding 100%: "${simOverMax.unreachableReason}"`);
  console.log(`   ✅ Multi-Course Unreachable Target (9.80 SGPA > 9.45 max): "${simOverMax.unreachableReason}"\n`);

  // ============================================================================
  // PART 8: F-01 UGC CBCS 10-Point Scale Utilities & Storage Persistence in Newtab
  // ============================================================================
  console.log('8️⃣ Testing F-01: UGC CBCS Scale Utilities & Scale Toggle Persistence in Newtab...');

  // 8a. Verify 8-tier UGC scale in newtab.percentageToGradePoint
  assert.strictEqual(newtab.percentageToGradePoint(95, 'ugc'), 10, '>=90% must yield 10 (O)');
  assert.strictEqual(newtab.percentageToGradePoint(90, 'ugc'), 10, '90% must yield 10 (O)');
  assert.strictEqual(newtab.percentageToGradePoint(89.99, 'ugc'), 9, '89.99% must yield 9 (A+)');
  assert.strictEqual(newtab.percentageToGradePoint(80, 'ugc'), 9, '80% must yield 9 (A+)');
  assert.strictEqual(newtab.percentageToGradePoint(75, 'ugc'), 8, '75% must yield 8 (A)');
  assert.strictEqual(newtab.percentageToGradePoint(65, 'ugc'), 7, '65% must yield 7 (B+)');
  assert.strictEqual(newtab.percentageToGradePoint(55, 'ugc'), 6, '55% must yield 6 (B)');
  assert.strictEqual(newtab.percentageToGradePoint(48, 'ugc'), 5, '48% must yield 5 (C)');
  assert.strictEqual(newtab.percentageToGradePoint(42, 'ugc'), 4, '42% must yield 4 (P)');
  assert.strictEqual(newtab.percentageToGradePoint(38, 'ugc'), 0, '<40% must yield 0 (F)');
  assert.strictEqual(newtab.percentageToGradePoint(75, 'linear'), 7.5, 'Linear scale must yield 7.5 for 75%');
  assert.strictEqual(newtab.percentageToGradePoint(88.4, 'linear'), 8.84, 'Linear scale must yield 8.84 for 88.4%');
  console.log('   ✅ newtab.percentageToGradePoint 8-tier UGC scale & Linear toggle verified.');

  // 8b. Verify UGC grade descriptors and letter band recommendations
  const ugcO = newtab.percentageToUgcGrade(95);
  assert.strictEqual(ugcO.letter, 'O');
  assert.strictEqual(ugcO.point, 10);
  assert.strictEqual(ugcO.band, 'Grade O (10.0 band)');

  const ugcAplus = newtab.percentageToUgcGrade(82);
  assert.strictEqual(ugcAplus.letter, 'A+');
  assert.strictEqual(ugcAplus.point, 9);
  assert.strictEqual(ugcAplus.band, 'Grade A+ (9.0 band)');

  const ugcA = newtab.percentageToUgcGrade(74);
  assert.strictEqual(ugcA.letter, 'A');
  assert.strictEqual(ugcA.point, 8);
  assert.strictEqual(ugcA.band, 'Grade A (8.0 band)');

  const ugcP = newtab.percentageToUgcGrade(41);
  assert.strictEqual(ugcP.letter, 'P');
  assert.strictEqual(ugcP.point, 4);
  assert.strictEqual(ugcP.band, 'Grade P (4.0 band)');

  const ugcF = newtab.percentageToUgcGrade(30);
  assert.strictEqual(ugcF.letter, 'F');
  assert.strictEqual(ugcF.point, 0);
  assert.strictEqual(ugcF.band, 'Grade F (0.0 band)');
  console.log('   ✅ newtab.percentageToUgcGrade descriptor mapping & recommendation bands verified.');

  // 8c. Test Scale Mode storage persistence
  mockStorage.set({ sgpa_scale_mode: 'ugc' }, () => {});
  mockStorage.get(['sgpa_scale_mode'], (res) => {
    assert.strictEqual(res.sgpa_scale_mode, 'ugc', 'sgpa_scale_mode must persist in storage');
  });
  console.log('   ✅ sgpa_scale_mode storage persistence verified.');

  // 8d. Verify newtab.html contains all M2 UI controls
  assert(newtabHtml.includes('id="sgpa-scale-toggle"'), 'newtab.html must contain sgpa-scale-toggle');
  assert(newtabHtml.includes('id="scale-ugc-btn"'), 'newtab.html must contain scale-ugc-btn');
  assert(newtabHtml.includes('id="scale-linear-btn"'), 'newtab.html must contain scale-linear-btn');
  assert(newtabHtml.includes('id="sgpa-as-of-badge"'), 'newtab.html must contain sgpa-as-of-badge');
  assert(newtabHtml.includes('id="sgpa-unmatched-banner"'), 'newtab.html must contain sgpa-unmatched-banner');
  console.log('   ✅ newtab.html scale toggle and as-of badge structure verified.\n');

  // ============================================================================
  // PART 9: F-06 Staleness Badge Tier Classification & Date Stamp Formatting
  // ============================================================================
  console.log('9️⃣ Testing F-06: Staleness Badge Tier Classification & Aggregate Date Stamp...');

  // 9a. Test getFreshnessStatus 4 tiers:
  // - Never Scraped (no timestamp)
  const freshNever = newtab.getFreshnessStatus(null);
  assert.strictEqual(freshNever.tier, 'never');
  assert.strictEqual(freshNever.label, 'Never Scraped (Baseline)');
  assert.strictEqual(freshNever.className, 'sgpa-freshness-never');
  assert.strictEqual(freshNever.days, null);

  const freshInvalid = newtab.getFreshnessStatus('not-a-valid-date');
  assert.strictEqual(freshInvalid.tier, 'never');

  // - Fresh (< 3 days)
  const now = Date.now();
  const timeHalfDayAgo = new Date(now - 12 * 60 * 60 * 1000).toISOString();
  const freshHalfDay = newtab.getFreshnessStatus(timeHalfDayAgo);
  assert.strictEqual(freshHalfDay.tier, 'fresh');
  assert(freshHalfDay.label.includes('Fresh'));
  assert.strictEqual(freshHalfDay.className, 'sgpa-freshness-fresh');

  const timeTwoDaysAgo = new Date(now - 2.2 * 24 * 60 * 60 * 1000).toISOString();
  const freshTwoDays = newtab.getFreshnessStatus(timeTwoDaysAgo);
  assert.strictEqual(freshTwoDays.tier, 'fresh');
  assert.strictEqual(freshTwoDays.className, 'sgpa-freshness-fresh');

  // - Aging (3 - 7 days)
  const timeFourDaysAgo = new Date(now - 4.1 * 24 * 60 * 60 * 1000).toISOString();
  const freshFourDays = newtab.getFreshnessStatus(timeFourDaysAgo);
  assert.strictEqual(freshFourDays.tier, 'aging');
  assert.strictEqual(freshFourDays.label, 'Aging (4d ago)');
  assert.strictEqual(freshFourDays.className, 'sgpa-freshness-aging');

  const timeSevenDaysAgo = new Date(now - 6.9 * 24 * 60 * 60 * 1000).toISOString();
  const freshSevenDays = newtab.getFreshnessStatus(timeSevenDaysAgo);
  assert.strictEqual(freshSevenDays.tier, 'aging');
  assert.strictEqual(freshSevenDays.label, 'Aging (6d ago)');
  assert.strictEqual(freshSevenDays.className, 'sgpa-freshness-aging');

  // - Stale (> 7 days)
  const timeTenDaysAgo = new Date(now - 10.5 * 24 * 60 * 60 * 1000).toISOString();
  const freshTenDays = newtab.getFreshnessStatus(timeTenDaysAgo);
  assert.strictEqual(freshTenDays.tier, 'stale');
  assert.strictEqual(freshTenDays.label, 'Stale (10d ago)');
  assert.strictEqual(freshTenDays.className, 'sgpa-freshness-stale');

  const timeThirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
  const freshThirtyDays = newtab.getFreshnessStatus(timeThirtyDaysAgo);
  assert.strictEqual(freshThirtyDays.tier, 'stale');
  assert.strictEqual(freshThirtyDays.label, 'Stale (30d ago)');
  assert.strictEqual(freshThirtyDays.className, 'sgpa-freshness-stale');
  console.log('   ✅ 4-tier freshness classification verified (Never, Fresh, Aging, Stale).');

  // 9b. Test getOverallStalenessStamp
  // Baseline (0 updated)
  const zeroUpdatedCourses = [
    { code: 'C1', name: 'Course 1' },
    { code: 'C2', name: 'Course 2' }
  ];
  const stampZero = newtab.getOverallStalenessStamp(zeroUpdatedCourses);
  assert.strictEqual(stampZero, 'Curriculum baseline (0 of 2 courses updated)');

  // Partial update: 2 of 4 courses updated
  const fixedDateNov18 = new Date('2026-11-18T10:00:00Z').toISOString();
  const fixedDateNov19 = new Date('2026-11-19T10:00:00Z').toISOString();
  const partialCourses = [
    { code: 'C1', name: 'Course 1', scrapedAt: fixedDateNov18 },
    { code: 'C2', name: 'Course 2', scrapedAt: fixedDateNov19 },
    { code: 'C3', name: 'Course 3' },
    { code: 'C4', name: 'Course 4' }
  ];
  const stampPartial = newtab.getOverallStalenessStamp(partialCourses);
  assert(stampPartial.includes('(2 of 4 courses updated)'), `Stamp must indicate 2 of 4: "${stampPartial}"`);
  assert(stampPartial.startsWith('As of Nov 19, 2026') || stampPartial.includes('Nov 19, 2026'), `Stamp must format newest date Nov 19, 2026: "${stampPartial}"`);

  // Full semester update: 8 of 8 courses updated
  const fullCourses = [
    { code: 'C1', scrapedAt: fixedDateNov18 },
    { code: 'C2', scrapedAt: fixedDateNov19 },
    { code: 'C3', scrapedAt: fixedDateNov18 },
    { code: 'C4', scrapedAt: fixedDateNov19 },
    { code: 'C5', scrapedAt: fixedDateNov18 },
    { code: 'C6', scrapedAt: fixedDateNov19 },
    { code: 'C7', scrapedAt: fixedDateNov18 },
    { code: 'C8', scrapedAt: fixedDateNov19 }
  ];
  const stampFull = newtab.getOverallStalenessStamp(fullCourses);
  assert(stampFull.includes('(8 of 8 courses updated)'), `Stamp must indicate 8 of 8: "${stampFull}"`);
  console.log(`   ✅ Aggregate date stamp formatting verified: "${stampPartial}" & "${stampZero}".\n`);

  // ============================================================================
  // PART 10: F-09 Custom User-Editable Credit Overrides via Storage & Recalculation
  // ============================================================================
  console.log('10️⃣ Testing F-09: Custom User-Editable Credits Override via Storage & Recalculation...');

  // Baseline 2 courses: Math (75%, 4 cr -> 8 GP * 4 = 32) + PSP (90%, 4 cr -> 10 GP * 4 = 40)
  // Total credits = 8, UGC SGPA = 72 / 8 = 9.00
  const baselineTwo = [
    { code: 'CSD02C1001', name: 'Mathematics-I', credits: 4, lockedPercentage: 75.0 },
    { code: 'CSD02C1002', name: 'PSP', credits: 4, lockedPercentage: 90.0 }
  ];
  const baseCalc = newtab.calculateCreditWeightedSGPA(baselineTwo, { scale: 'ugc' });
  assert.strictEqual(baseCalc.totalCredits, 8);
  assert.strictEqual(baseCalc.currentSGPA, 9.00);

  // User modifies Math from 4 credits to 3 credits:
  // Math: 8 GP * 3 cr = 24 points
  // PSP: 10 GP * 4 cr = 40 points
  // Total credits = 7, Total points = 64
  // New UGC SGPA = 64 / 7 = 9.1428... -> 9.14 SGPA
  const customOverrideCredits = { 'CSD02C1001': 3 };
  const customCalc = newtab.calculateCreditWeightedSGPA(baselineTwo, {
    scale: 'ugc',
    customCredits: customOverrideCredits
  });
  assert.strictEqual(customCalc.totalCredits, 7, 'Total credits must update to 7');
  assert.strictEqual(customCalc.currentSGPA, 9.14, 'UGC SGPA must update to exactly 9.14');
  assert.strictEqual(customCalc.courses[0].credits, 3, 'Course credits must reflect custom override');
  assert.strictEqual(customCalc.courses[1].credits, 4, 'Unmodified course must retain original credits');

  // Verify storage persistence of custom credits
  mockStorage.set({ custom_course_credits: { 'CSD02C1001': 3, 'canvas_101': 4 } }, () => {});
  mockStorage.get(['custom_course_credits'], (res) => {
    assert(res.custom_course_credits, 'custom_course_credits must persist');
    assert.strictEqual(res.custom_course_credits['CSD02C1001'], 3);
    assert.strictEqual(res.custom_course_credits['canvas_101'], 4);
  });
  console.log(`   ✅ Custom credit override recalculation verified: Math 4->3 credits changed SGPA from 9.00 to 9.14 (Total credits: 7).\n`);

  // ============================================================================
  // PART 11: F-09 Course ID Keying & Unmatched Course Detection
  // ============================================================================
  console.log('11️⃣ Testing F-09: Course ID Keying (canvas_ + courseId) & Unmatched Course Detection...');

  // 11a. Course ID Keying
  const canvasCoursesInput = [
    { courseId: '101', code: 'CSD02C1001', name: 'Mathematics-I', lockedPercentage: 75.0 },
    { code: 'CSD02C1002', name: 'PSP', lockedPercentage: 80.0 }
  ];
  const normalizedWithId = newtab.normalizeCoursesList(canvasCoursesInput, {
    customCredits: { 'canvas_101': 5 }
  });
  assert.strictEqual(normalizedWithId[0].courseId, '101');
  assert.strictEqual(normalizedWithId[0].courseKey, 'canvas_101');
  assert.strictEqual(normalizedWithId[0].credits, 5, 'Credits must be resolved using canvas_101 key');
  assert.strictEqual(normalizedWithId[1].courseKey, 'CSD02C1002');
  assert.strictEqual(normalizedWithId[1].credits, 4);

  // 11b. Unmatched Course Detection
  // Recognized course
  assert.strictEqual(normalizedWithId[0].isUnmatched, false, 'Mathematics-I is recognized curriculum course');
  assert.strictEqual(normalizedWithId[1].isUnmatched, false, 'PSP is recognized curriculum course');

  // Unrecognized course without custom credits
  const unrecognizedInput = [
    { code: 'BIO101', name: 'Introductory Biology', lockedPercentage: 70.0 }
  ];
  const normUnrecognized = newtab.normalizeCoursesList(unrecognizedInput);
  assert.strictEqual(normUnrecognized[0].isUnmatched, true, 'BIO101 must be flagged as isUnmatched: true');
  assert.strictEqual(normUnrecognized[0].credits, 3, 'Unmatched course falls back to default 3 credits');

  // Once user confirms/overrides credits, isUnmatched becomes false
  const normConfirmed = newtab.normalizeCoursesList(unrecognizedInput, {
    customCredits: { 'BIO101': 3 }
  });
  assert.strictEqual(normConfirmed[0].isUnmatched, false, 'Course with user-confirmed custom credits must not be unmatched');

  // Verify isRecognizedKeyword utility
  assert.strictEqual(newtab.isRecognizedKeyword('CSD02C1001', 'Mathematics-I'), true);
  assert.strictEqual(newtab.isRecognizedKeyword('', 'Web Applications Development'), true);
  assert.strictEqual(newtab.isRecognizedKeyword('BIO101', 'Cell Biology'), false);
  assert.strictEqual(newtab.isRecognizedKeyword('HIST202', 'World History'), false);
  console.log('   ✅ Course ID keying and unmatched course detection verified.\n');

  // ============================================================================
  // PART 12: F-02 Ceiling Clamping & Zero-Slip Margin in Newtab Simulation
  // ============================================================================
  console.log('12️⃣ Testing F-02: Target Feasibility Ceiling Clamping & Zero-Slip in Newtab Simulation...');

  // Multi-course simulation with locked percentage and ceiling
  const testSimCourses = [
    { code: 'CSD02C1001', name: 'Mathematics-I', credits: 4, lockedPercentage: 52.0, maxPossiblePercentage: 92.0, scrapedAt: timeHalfDayAgo },
    { code: 'CSD02C1002', name: 'PSP', credits: 4, lockedPercentage: 65.0, maxPossiblePercentage: 95.0, scrapedAt: timeFourDaysAgo },
    { code: 'CSD02C1003', name: 'WAD', credits: 3, lockedPercentage: 70.0, maxPossiblePercentage: 100.0, scrapedAt: timeTenDaysAgo },
    { code: 'CSD02C1004', name: 'CFN', credits: 3, lockedPercentage: 60.0, maxPossiblePercentage: 90.0 }
  ];

  // Under linear scale, maxPossibleSGPA is ~9.44
  const linearSim = newtab.simulateTargetSGPA(testSimCourses, 9.35, { scale: 'linear' });
  assert.strictEqual(linearSim.isAchievable, true);
  assert(linearSim.requiredPaceOnRemaining >= 95.0, 'Pace must be >= 95%');
  assert.strictEqual(linearSim.isZeroSlipMargin, true, 'isZeroSlipMargin must be true');
  assert(linearSim.zeroSlipWarning.includes('Zero-slip margin'));

  // Target above ceiling: 9.80 SGPA > max
  const impossibleSim = newtab.simulateTargetSGPA(testSimCourses, 9.80, { scale: 'linear' });
  assert.strictEqual(impossibleSim.isAchievable, false);
  assert.strictEqual(impossibleSim.requiredPaceOnRemaining, null);
  assert(impossibleSim.unreachableReason.includes('Unreachable') && impossibleSim.unreachableReason.includes('exceeding 100%'));

  // Verify timestamps and freshness preservation in simulation output
  assert(impossibleSim.coursesForecast[0].scrapedAt, 'scrapedAt must be preserved in coursesForecast');
  assert.strictEqual(impossibleSim.coursesForecast[0].freshness.tier, 'fresh');
  assert.strictEqual(impossibleSim.coursesForecast[1].freshness.tier, 'aging');
  assert.strictEqual(impossibleSim.coursesForecast[2].freshness.tier, 'stale');
  assert.strictEqual(impossibleSim.coursesForecast[3].freshness.tier, 'never');
  console.log('   ✅ Newtab simulation ceiling clamping, zero-slip margin & freshness preservation verified.\n');

  console.log('🎉 ALL MULTI-COURSE SEMESTER SGPA FORECASTER ASSERTIONS PASSED! (100% SUCCESS)');
}
