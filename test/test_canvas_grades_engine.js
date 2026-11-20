// test/test_canvas_grades_engine.js
// Verification suite for Canvas Grade & Evaluation Intelligence Engine and Assignment Radar

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('🧪 Starting Canvas Academic Suite Verification Suite...\n');

const canvasGrades = require('../extension/content/canvas_grades');
const canvasAssignments = require('../extension/content/canvas_assignments');

// Load HTML fixture: Rishihood CSD02C1001 Mathematics-I
const fixturePath = path.resolve(__dirname, '../extension/demo/canvas_grades_demo.html');
const demoHtml = fs.readFileSync(fixturePath, 'utf8');

// ============================================================================
// PART 1: Canvas Grade Summary HTML Parsing
// ============================================================================
console.log('1️⃣ Testing Canvas Grade Summary HTML Parsing (Rishihood CSD02C1001 Mathematics-I)...');

// 1a. Course Header & Code Extraction
const course = canvasGrades.parseCourseHeader(demoHtml);
assert.strictEqual(course.courseCode, 'CSD02C1001', 'Course code must be CSD02C1001');
assert.strictEqual(course.courseTitle, 'Mathematics-I', 'Course title must be Mathematics-I');
assert.strictEqual(course.fullTitle, 'CSD02C1001 Mathematics-I', 'Full title must be CSD02C1001 Mathematics-I');
assert.strictEqual(course.courseId, '101', 'Course ID must be 101');
console.log(`   ✅ Course Header parsed: "${course.fullTitle}" (Code: ${course.courseCode}, Title: ${course.courseTitle}, ID: ${course.courseId})`);

// 1b. Category Weights Scraping (#right-side table.summary)
const weightData = canvasGrades.parseCategoryWeights(demoHtml);
assert.strictEqual(weightData.categories.length, 3, 'Must scrape exactly 3 categories: Assignments, Internal, External');
assert.strictEqual(weightData.weights['Assignments'], 10, 'Assignments category weight must be 10%');
assert.strictEqual(weightData.weights['Internal'], 50, 'Internal category weight must be 50%');
assert.strictEqual(weightData.weights['External'], 40, 'External category weight must be 40%');
assert.strictEqual(weightData.totalWeight, 100, 'Total weight must sum to 100%');
console.log('   ✅ Category Weights parsed: Assignments 10%, Internal 50%, External 40% (Total: 100%)');

// 1c. Assignment Rows Scraping (table#grades_summary)
const assignments = canvasGrades.parseAssignmentRows(demoHtml, weightData.categories);
assert.strictEqual(assignments.length, 5, 'Must scrape exactly 5 assignment rows');

// Row 1: Assignment 1 (Assignments: 5/5)
const a1 = assignments[0];
assert.strictEqual(a1.title, 'Assignment 1');
assert.strictEqual(a1.category, 'Assignments');
assert.strictEqual(a1.score, 5);
assert.strictEqual(a1.pointsPossible, 5);
assert.strictEqual(a1.isCompleted, true);
assert.strictEqual(a1.isSubmitted, true);
assert.strictEqual(a1.percentage, 100);

// Row 2: Assignment 2 (Assignments: 10/10)
const a2 = assignments[1];
assert.strictEqual(a2.title, 'Assignment 2');
assert.strictEqual(a2.category, 'Assignments');
assert.strictEqual(a2.score, 10);
assert.strictEqual(a2.pointsPossible, 10);
assert.strictEqual(a2.isCompleted, true);
assert.strictEqual(a2.percentage, 100);

// Row 3: Assignment 3 (Assignments: 4/5)
const a3 = assignments[2];
assert.strictEqual(a3.title, 'Assignment 3');
assert.strictEqual(a3.category, 'Assignments');
assert.strictEqual(a3.score, 4);
assert.strictEqual(a3.pointsPossible, 5);
assert.strictEqual(a3.isCompleted, true);
assert.strictEqual(a3.percentage, 80);

// Row 4: Mid Term Assessment (Internal: 85/100)
const a4 = assignments[3];
assert.strictEqual(a4.title, 'Mid Term Assessment');
assert.strictEqual(a4.category, 'Internal');
assert.strictEqual(a4.score, 85);
assert.strictEqual(a4.pointsPossible, 100);
assert.strictEqual(a4.isCompleted, true);
assert.strictEqual(a4.percentage, 85);

// Row 5: End Term Examination (External: -/200)
const a5 = assignments[4];
assert.strictEqual(a5.title, 'End Term Examination');
assert.strictEqual(a5.category, 'External');
assert.strictEqual(a5.score, null);
assert.strictEqual(a5.pointsPossible, 200);
assert.strictEqual(a5.isCompleted, false);
assert.strictEqual(a5.isSubmitted, false);

console.log('   ✅ Assignment rows parsed: 4 completed assessments (104/120 pts) and 1 uncompleted (200 pts)');

// 1d. Full Gradebook Aggregator (scrapeGradebook)
const gradebook = canvasGrades.scrapeGradebook(demoHtml);
assert.strictEqual(gradebook.course.courseCode, 'CSD02C1001');
assert.strictEqual(gradebook.categories.length, 3);
assert.strictEqual(gradebook.assignments.length, 5);
console.log('   ✅ scrapeGradebook successfully aggregated course header, weights, and assignments.\n');

// ============================================================================
// PART 2: Target Grade Forecaster & SGPA Math Verification
// ============================================================================
console.log('2️⃣ Testing Target Grade Forecaster & SGPA Mathematics...');

// 2a. Scale Conversions (Dual Scale: Percentage <-> 10-point SGPA)
assert.strictEqual(canvasGrades.percentageToSGPA(80), 8.0, '80% must equal 8.0 SGPA');
assert.strictEqual(canvasGrades.percentageToSGPA(75), 7.5, '75% must equal 7.5 SGPA');
assert.strictEqual(canvasGrades.percentageToSGPA(85), 8.5, '85% must equal 8.5 SGPA');
assert.strictEqual(canvasGrades.percentageToSGPA(90), 9.0, '90% must equal 9.0 SGPA');
assert.strictEqual(canvasGrades.percentageToSGPA(67.7), 6.77, '67.7% must equal 6.77 SGPA');

assert.strictEqual(canvasGrades.sgpaToPercentage(8.0), 80.0, '8.0 SGPA must equal 80%');
assert.strictEqual(canvasGrades.sgpaToPercentage(7.5), 75.0, '7.5 SGPA must equal 75%');
assert.strictEqual(canvasGrades.sgpaToPercentage(8.5), 85.0, '8.5 SGPA must equal 85%');
assert.strictEqual(canvasGrades.sgpaToPercentage(9.0), 90.0, '9.0 SGPA must equal 90%');
console.log('   ✅ Dual Scale conversions verified (SGPA = Percentage / 10).');

// 2b. Locked & Remaining Calculations for Mathematics-I
// - Assignments: (5 + 10 + 4) / (5 + 10 + 5) = 19 / 20 = 95% -> 10% * 0.95 = 9.50%
// - Internal: 85 / 100 = 85% -> 50% * 0.85 = 42.50%
// - Locked Percentage = 9.50% + 42.50% = 52.00%
// - Remaining Weight = 40.00% (External)
// - Remaining Assessment Points = 200 pts (End Term)
// - Max Possible Percentage = 52.00% + 40.00% = 92.00% (9.20 SGPA)
const locked = canvasGrades.calculateLockedAndRemaining(gradebook);
assert.strictEqual(locked.lockedPercentage, 52.0, 'Locked percentage must be exactly 52.0%');
assert.strictEqual(locked.lockedSGPA, 5.2, 'Locked SGPA must be exactly 5.20');
assert.strictEqual(locked.remainingWeight, 40.0, 'Remaining weight must be exactly 40.0%');
assert.strictEqual(locked.remainingPoints, 200, 'Remaining points must be exactly 200 pts');
assert.strictEqual(locked.maxPossiblePercentage, 92.0, 'Max possible percentage must be 92.0%');
assert.strictEqual(locked.maxPossibleSGPA, 9.2, 'Max possible SGPA must be 9.20');
console.log(`   ✅ Locked & Remaining verified: Locked=${locked.lockedPercentage}% (SGPA: ${locked.lockedSGPA}), Remaining Weight=${locked.remainingWeight}%, Max Achievable=${locked.maxPossiblePercentage}% (SGPA: ${locked.maxPossibleSGPA})`);

// 2c. Target Forecaster Scenarios: Exact marks required on End Term (200 pts)
// External weight = 40%, points = 200 => 0.2% per mark (or 5 marks per 1% course grade)
// Target 75%: needed = 75 - 52 = 23% => marks = 23 / 0.2 = 115 marks (57.5%)
// Target 80%: needed = 80 - 52 = 28% => marks = 28 / 0.2 = 140 marks (70.0%)
// Target 85%: needed = 85 - 52 = 33% => marks = 33 / 0.2 = 165 marks (82.5%)
// Target 90%: needed = 90 - 52 = 38% => marks = 38 / 0.2 = 190 marks (95.0%)

const targets = [
  { targetPct: 75, expectedSGPA: 7.5, expectedMarks: 115, expectedAssessmentPct: 57.5 },
  { targetPct: 80, expectedSGPA: 8.0, expectedMarks: 140, expectedAssessmentPct: 70.0 },
  { targetPct: 85, expectedSGPA: 8.5, expectedMarks: 165, expectedAssessmentPct: 82.5 },
  { targetPct: 90, expectedSGPA: 9.0, expectedMarks: 190, expectedAssessmentPct: 95.0 }
];

for (const t of targets) {
  const forecast = canvasGrades.calculateForecaster(gradebook, t.targetPct);
  assert.strictEqual(forecast.targetPercentage, t.targetPct, `Target percentage must be ${t.targetPct}%`);
  assert.strictEqual(forecast.targetSGPA, t.expectedSGPA, `Target SGPA must be ${t.expectedSGPA}`);
  assert.strictEqual(forecast.isAchievable, true, `Target ${t.targetPct}% must be achievable`);
  assert.strictEqual(forecast.requiredMarks, t.expectedMarks, `Required marks for ${t.targetPct}% must be ${t.expectedMarks}`);
  assert.strictEqual(forecast.requiredPercentageOnRemaining, t.expectedAssessmentPct, `Required % on remaining for ${t.targetPct}% must be ${t.expectedAssessmentPct}%`);

  // Verify single assessment forecast details
  assert.strictEqual(forecast.assessments.length, 1);
  assert.strictEqual(forecast.assessments[0].title, 'End Term Examination');
  assert.strictEqual(forecast.assessments[0].marksNeeded, t.expectedMarks);
  assert.strictEqual(forecast.assessments[0].pointsPossible, 200);

  // Direct function verification
  const directMarks = canvasGrades.calculateMinimumMarksRequired(gradebook, t.targetPct);
  assert.strictEqual(directMarks, t.expectedMarks, `calculateMinimumMarksRequired(${t.targetPct}) must return ${t.expectedMarks}`);

  console.log(`   ✅ Target ${t.targetPct}% (${t.expectedSGPA} SGPA): exact marks required on End Term = ${forecast.requiredMarks}/200 (${t.expectedAssessmentPct}%)`);
}

// 2d. Boundary & Unachievable Target Tests
// Target 95%: Max achievable is 92%, so 95% is unachievable
const unachievableForecast = canvasGrades.calculateForecaster(gradebook, 95);
assert.strictEqual(unachievableForecast.isAchievable, false, 'Target 95% must NOT be achievable');
assert.strictEqual(unachievableForecast.requiredMarks, null, 'Required marks for unachievable target must be null');
console.log('   ✅ Unachievable target (95% > 92% max) correctly flagged as unachievable.');

// Target 50%: Already achieved with 52% locked
const alreadyAchievedForecast = canvasGrades.calculateForecaster(gradebook, 50);
assert.strictEqual(alreadyAchievedForecast.isAlreadyAchieved, true, 'Target 50% must be already achieved');
assert.strictEqual(alreadyAchievedForecast.requiredMarks, 0, 'Required marks for already achieved target must be 0');
console.log('   ✅ Already achieved target (50% < 52% locked) correctly requires 0 marks.\n');

// ============================================================================
// PART 3: Assignment Deadline & Urgency Categorization
// ============================================================================
console.log('3️⃣ Testing Assignment Deadline & Urgency Categorization...');

const mockNow = new Date('2026-11-18T12:00:00Z');

// 3a. Red Category: Due in < 24 Hours with Countdown Ticker
const redAssignment = {
  title: 'Calculus Problem Set 7',
  dueDate: new Date(mockNow.getTime() + 6.4 * 3600 * 1000), // ~6h 24m ahead
  isSubmitted: false
};
const redClass = canvasAssignments.classifyDeadline(redAssignment, { now: mockNow });
assert.strictEqual(redClass.category, 'red', 'Category must be red');
assert.strictEqual(redClass.urgencyLevel, '<24h', 'Urgency level must be <24h');
assert.strictEqual(redClass.isDueSoon, true, 'isDueSoon must be true');
assert.strictEqual(redClass.isThisWeek, false);
assert.strictEqual(redClass.isOverdue, false);
assert.strictEqual(redClass.isSubmitted, false);
assert(redClass.countdownTicker.includes('6h'), `Countdown ticker must contain "6h", got "${redClass.countdownTicker}"`);
console.log(`   ✅ Red Category (<24h): detected with countdown ticker "${redClass.countdownTicker}"`);

// 3b. Yellow Category: Due This Week
const yellowAssignment = {
  title: 'Linear Algebra Lab 3',
  dueDate: new Date(mockNow.getTime() + 3 * 24 * 3600 * 1000), // 3 days ahead (Saturday)
  isSubmitted: false
};
const yellowClass = canvasAssignments.classifyDeadline(yellowAssignment, { now: mockNow });
assert.strictEqual(yellowClass.category, 'yellow', 'Category must be yellow');
assert.strictEqual(yellowClass.urgencyLevel, 'this_week', 'Urgency level must be this_week');
assert.strictEqual(yellowClass.isThisWeek, true, 'isThisWeek must be true');
assert.strictEqual(yellowClass.isDueSoon, false);
assert.strictEqual(yellowClass.isOverdue, false);
assert.strictEqual(yellowClass.daysLeft, 3);
console.log(`   ✅ Yellow Category (This Week): detected with label "${yellowClass.urgencyLabel}" (${yellowClass.daysLeft} days left)`);

// 3c. Green Category: Submitted & Graded
const gradedAssignment = {
  title: 'Matrix Quiz 1',
  dueDate: new Date(mockNow.getTime() - 48 * 3600 * 1000),
  isSubmitted: true,
  score: 10,
  pointsPossible: 10
};
const greenClass = canvasAssignments.classifyDeadline(gradedAssignment, { now: mockNow });
assert.strictEqual(greenClass.category, 'green', 'Category must be green');
assert.strictEqual(greenClass.urgencyLevel, 'submitted', 'Urgency level must be submitted');
assert.strictEqual(greenClass.isSubmitted, true, 'isSubmitted must be true');
assert.strictEqual(greenClass.isGraded, true, 'isGraded must be true');
assert.strictEqual(greenClass.scoreBadge, '10 / 10', 'Score badge must be "10 / 10"');
console.log(`   ✅ Green Category (Submitted & Graded): detected with score badge "${greenClass.scoreBadge}"`);

// Submitted but unread/ungraded assignment
const submittedPendingAssignment = {
  title: 'Differential Equations Essay',
  dueDate: new Date(mockNow.getTime() + 12 * 3600 * 1000),
  isSubmitted: true,
  score: null,
  pointsPossible: 50
};
const submittedClass = canvasAssignments.classifyDeadline(submittedPendingAssignment, { now: mockNow });
assert.strictEqual(submittedClass.category, 'green');
assert.strictEqual(submittedClass.isSubmitted, true);
assert.strictEqual(submittedClass.isGraded, false);
assert.strictEqual(submittedClass.status, 'submitted');
console.log('   ✅ Green Category (Submitted Pending Grading): detected correctly without overdue/urgent flags');

// 3d. Grey / Amber Category: Overdue / Missing
const overdueAssignment = {
  title: 'Vector Spaces Homework 2',
  dueDate: new Date(mockNow.getTime() - 24 * 3600 * 1000), // Due yesterday
  isSubmitted: false
};
const overdueClass = canvasAssignments.classifyDeadline(overdueAssignment, { now: mockNow });
assert(overdueClass.category === 'amber' || overdueClass.category === 'grey', 'Category must be amber or grey');
assert.strictEqual(overdueClass.urgencyLevel, 'overdue', 'Urgency level must be overdue');
assert.strictEqual(overdueClass.isOverdue, true, 'isOverdue must be true');
assert.strictEqual(overdueClass.isMissing, true, 'isMissing must be true');
console.log(`   ✅ Grey/Amber Category (Overdue/Missing): detected with label "${overdueClass.urgencyLabel}"\n`);

// ============================================================================
// PART 4: iCalendar (.ics) Generation Verification
// ============================================================================
console.log('4️⃣ Testing iCalendar (.ics) Generation with 1h & 24h Alerts...');

const sampleDeadlines = [
  {
    title: 'Assignment 4: Calculus Proofs',
    courseName: 'Mathematics-I (CSD02C1001)',
    dueDate: new Date('2026-11-20T18:30:00Z'),
    pointsPossible: 20,
    url: 'https://rishihood.instructure.com/courses/101/assignments/2001',
    isSubmitted: false
  },
  {
    title: 'Final Term Project Submission',
    courseName: 'Mathematics-I (CSD02C1001)',
    dueDate: new Date('2026-12-05T23:59:00Z'),
    pointsPossible: 200,
    url: 'https://rishihood.instructure.com/courses/101/assignments/2002',
    isSubmitted: false
  },
  {
    title: 'Already Completed Assignment 1',
    courseName: 'Mathematics-I (CSD02C1001)',
    dueDate: new Date('2026-11-10T11:59:00Z'),
    pointsPossible: 5,
    isSubmitted: true // MUST BE EXCLUDED from pending deadline .ics
  }
];

const icsOutput = canvasAssignments.generateDeadlinesIcs(sampleDeadlines, {
  calendarName: 'Rishihood Canvas Deadlines',
  now: mockNow
});

// RFC 5545 Specifications
assert(icsOutput.includes('BEGIN:VCALENDAR'), '.ics must contain BEGIN:VCALENDAR');
assert(icsOutput.includes('END:VCALENDAR'), '.ics must contain END:VCALENDAR');
assert(icsOutput.includes('VERSION:2.0'), '.ics must specify VERSION:2.0');
assert(icsOutput.includes('PRODID:-//Bunkr//Canvas Assignment Deadlines//EN'), '.ics must contain Bunkr PRODID');
assert(icsOutput.includes('X-WR-CALNAME:Rishihood Canvas Deadlines'), '.ics must set calendar name');

// Event counting: Only 2 pending assignments should have VEVENTs
const veventCount = (icsOutput.match(/BEGIN:VEVENT/g) || []).length;
assert.strictEqual(veventCount, 2, 'Only unsubmitted pending assignments must be exported to .ics (expected 2, got ' + veventCount + ')');
assert(!icsOutput.includes('Already Completed Assignment 1'), 'Submitted assignments must NEVER be included in pending deadline .ics');

// Verify 24-hour and 1-hour alarms
const trigger24hCount = (icsOutput.match(/TRIGGER:-PT24H/g) || []).length;
const trigger1hCount = (icsOutput.match(/TRIGGER:-PT1H/g) || []).length;
assert.strictEqual(trigger24hCount, 2, 'Each pending event must have a 24-hour reminder alarm (TRIGGER:-PT24H)');
assert.strictEqual(trigger1hCount, 2, 'Each pending event must have a 1-hour reminder alarm (TRIGGER:-PT1H)');

// Verify Event Fields & Formatting
assert(icsOutput.includes('SUMMARY:[Mathematics-I (CSD02C1001)] Assignment 4: Calculus Proofs (Deadline)'));
assert(icsOutput.includes('DTEND:20261120T183000Z'), 'DTEND must match due date in UTC format');
assert(icsOutput.includes('DESCRIPTION:Assignment: Assignment 4: Calculus Proofs'), 'DESCRIPTION must contain assignment title');
assert(icsOutput.includes('URL:https://rishihood.instructure.com/courses/101/assignments/2001'), 'URL must match assignment URL');

console.log('   ✅ RFC 5545 .ics generation verified with 2 VEVENTs, TRIGGER:-PT24H, and TRIGGER:-PT1H alarms.\n');

// ============================================================================
// PART 5: Full Gradebook Scraper to Deadline Radar Integration
// ============================================================================
console.log('5️⃣ Testing Full Scraper to Radar Pipeline Integration...');

const htmlAssignments = canvasAssignments.parseCanvasAssignmentsFromHtml(demoHtml, 'Mathematics-I');
assert.strictEqual(htmlAssignments.length, 5, 'parseCanvasAssignmentsFromHtml must extract 5 assignments from gradebook table');

// Classify all 5 extracted assignments
const classified = htmlAssignments.map(a => canvasAssignments.classifyDeadline(a, { now: mockNow }));
const greenCount = classified.filter(c => c.category === 'green').length;
const pendingCount = classified.filter(c => !c.isSubmitted).length;

assert.strictEqual(greenCount, 4, '4 completed assignments must be classified as green');
assert.strictEqual(pendingCount, 1, '1 assignment (End Term) must be pending');

const integratedIcs = canvasAssignments.generateDeadlinesIcs(htmlAssignments, { now: mockNow });
const integratedEvents = (integratedIcs.match(/BEGIN:VEVENT/g) || []).length;
assert.strictEqual(integratedEvents, 1, 'Integrated .ics must contain exactly 1 event for the pending End Term');
assert(integratedIcs.includes('End Term Examination'), 'Integrated .ics must include End Term Examination');

console.log('   ✅ Full pipeline verified: Scraper -> Categorization -> Radar -> iCalendar Export.\n');

// ============================================================================
// PART 6: F-01 UGC CBCS 10-Point Scale & Grade Band Mapping
// ============================================================================
console.log('6️⃣ Testing F-01: UGC CBCS 10-Point Scale & Linear Toggle Mapping...');

// 6a. 8-Tier UGC CBCS 10-Point Bracket Scale Verification
const ugcTestTiers = [
  { pct: 95, expectedPoint: 10, expectedGrade: 'O', expectedDesc: 'Outstanding', expectedBand: 'Grade O (10.0 band)' },
  { pct: 90, expectedPoint: 10, expectedGrade: 'O', expectedDesc: 'Outstanding', expectedBand: 'Grade O (10.0 band)' },
  { pct: 85, expectedPoint: 9, expectedGrade: 'A+', expectedDesc: 'Excellent', expectedBand: 'Grade A+ (9.0 band)' },
  { pct: 80, expectedPoint: 9, expectedGrade: 'A+', expectedDesc: 'Excellent', expectedBand: 'Grade A+ (9.0 band)' },
  { pct: 75, expectedPoint: 8, expectedGrade: 'A', expectedDesc: 'Very Good', expectedBand: 'Grade A (8.0 band)' },
  { pct: 70, expectedPoint: 8, expectedGrade: 'A', expectedDesc: 'Very Good', expectedBand: 'Grade A (8.0 band)' },
  { pct: 65, expectedPoint: 7, expectedGrade: 'B+', expectedDesc: 'Good', expectedBand: 'Grade B+ (7.0 band)' },
  { pct: 60, expectedPoint: 7, expectedGrade: 'B+', expectedDesc: 'Good', expectedBand: 'Grade B+ (7.0 band)' },
  { pct: 55, expectedPoint: 6, expectedGrade: 'B', expectedDesc: 'Above Average', expectedBand: 'Grade B (6.0 band)' },
  { pct: 50, expectedPoint: 6, expectedGrade: 'B', expectedDesc: 'Above Average', expectedBand: 'Grade B (6.0 band)' },
  { pct: 47, expectedPoint: 5, expectedGrade: 'C', expectedDesc: 'Average', expectedBand: 'Grade C (5.0 band)' },
  { pct: 45, expectedPoint: 5, expectedGrade: 'C', expectedDesc: 'Average', expectedBand: 'Grade C (5.0 band)' },
  { pct: 42, expectedPoint: 4, expectedGrade: 'P', expectedDesc: 'Pass', expectedBand: 'Grade P (4.0 band)' },
  { pct: 40, expectedPoint: 4, expectedGrade: 'P', expectedDesc: 'Pass', expectedBand: 'Grade P (4.0 band)' },
  { pct: 35, expectedPoint: 0, expectedGrade: 'F', expectedDesc: 'Fail', expectedBand: 'Grade F (0.0 band)' },
  { pct: 0, expectedPoint: 0, expectedGrade: 'F', expectedDesc: 'Fail', expectedBand: 'Grade F (0.0 band)' }
];

ugcTestTiers.forEach((tier) => {
  const gp = canvasGrades.percentageToGradePoint(tier.pct);
  assert.strictEqual(gp, tier.expectedPoint, `percentageToGradePoint(${tier.pct}) must equal ${tier.expectedPoint}`);

  const ugcInfo = canvasGrades.percentageToUgcGrade(tier.pct);
  assert.strictEqual(ugcInfo.point, tier.expectedPoint, `percentageToUgcGrade(${tier.pct}).point must equal ${tier.expectedPoint}`);
  assert.strictEqual(ugcInfo.grade, tier.expectedGrade, `percentageToUgcGrade(${tier.pct}).grade must equal ${tier.expectedGrade}`);
  assert.strictEqual(ugcInfo.description, tier.expectedDesc, `percentageToUgcGrade(${tier.pct}).description must equal ${tier.expectedDesc}`);
  assert.strictEqual(ugcInfo.band, tier.expectedBand, `percentageToUgcGrade(${tier.pct}).band must equal ${tier.expectedBand}`);
});
console.log('   ✅ All 8 UGC CBCS tiers verified (10 O, 9 A+, 8 A, 7 B+, 6 B, 5 C, 4 P, 0 F).');

// 6b. Boundary Precision & Clamping Tests
assert.strictEqual(canvasGrades.percentageToGradePoint(89.99), 9, '89.99% must be in A+ band (Grade Point 9)');
assert.strictEqual(canvasGrades.percentageToGradePoint(79.99), 8, '79.99% must be in A band (Grade Point 8)');
assert.strictEqual(canvasGrades.percentageToGradePoint(69.99), 7, '69.99% must be in B+ band (Grade Point 7)');
assert.strictEqual(canvasGrades.percentageToGradePoint(59.99), 6, '59.99% must be in B band (Grade Point 6)');
assert.strictEqual(canvasGrades.percentageToGradePoint(49.99), 5, '49.99% must be in C band (Grade Point 5)');
assert.strictEqual(canvasGrades.percentageToGradePoint(44.99), 4, '44.99% must be in P band (Grade Point 4)');
assert.strictEqual(canvasGrades.percentageToGradePoint(39.99), 0, '39.99% must be in F band (Grade Point 0)');
assert.strictEqual(canvasGrades.percentageToGradePoint(-5), 0, 'Negative percentage must clamp to 0 (Grade Point 0)');
assert.strictEqual(canvasGrades.percentageToGradePoint(110), 10, 'Percentage > 100 must clamp to 100 (Grade Point 10)');
console.log('   ✅ Boundary precision & edge clamping verified.');

// 6c. Linear Scale Toggle Verification
assert.strictEqual(canvasGrades.percentageToGradePoint(75, 'linear'), 7.5, 'Linear scale 75% must equal 7.5');
assert.strictEqual(canvasGrades.percentageToGradePoint(82.4, 'linear'), 8.24, 'Linear scale 82.4% must equal 8.24');
assert.strictEqual(canvasGrades.percentageToGradePoint(90, 'linear'), 9.0, 'Linear scale 90% must equal 9.0');
console.log('   ✅ Linear scale toggle verified (percentageToGradePoint with scale="linear").');

// 6d. getLetterGrade formatting
assert.strictEqual(canvasGrades.getLetterGrade(85), 'A+ (Excellent)');
assert.strictEqual(canvasGrades.getLetterGrade(42), 'P (Pass)');
assert.strictEqual(canvasGrades.getLetterGrade(35), 'F (Fail)');
console.log('   ✅ getLetterGrade adheres to UGC CBCS standard.\n');

// ============================================================================
// PART 7: F-02 Feasibility Ceiling Clamping, Theoretical Deficits & Zero-Slip Margin
// ============================================================================
console.log('7️⃣ Testing F-02: Feasibility Ceiling Clamping, Theoretical Deficits & Zero-Slip Margin...');

// In Mathematics-I demo fixture:
// Locked = 52.0%, Remaining = 40.0%, Max Achievable = 92.0%
const mathGradebook = canvasGrades.scrapeGradebook(demoHtml);

// 7a. Near-ceiling target (90% target -> 190 / 200 marks = 95.0% pace)
const forecast90 = canvasGrades.calculateForecaster(mathGradebook, 90);
assert.strictEqual(forecast90.isAchievable, true);
assert.strictEqual(forecast90.requiredMarks, 190);
assert.strictEqual(forecast90.requiredPercentageOnRemaining, 95.0);
assert.strictEqual(forecast90.isZeroSlipMargin, true, 'Target requiring 95% pace must flag isZeroSlipMargin: true');
assert(forecast90.zeroSlipWarning.includes('Zero-slip margin'), 'Must produce explicit zero-slip warning');
assert(forecast90.zeroSlipWarning.includes('190 / 200'), 'Warning must quote required marks / remaining points');
console.log(`   ✅ Target 90% (95.0% pace): Zero-slip margin warning verified: "${forecast90.zeroSlipWarning}"`);

// 7b. Impossible Target (95% target > 92% max attainable)
// Needed: 95 - 52 = 43% course grade. External weight = 40%, 200 pts.
// Theoretical marks: (43 / 40) * 200 = 215 / 200 marks (107.5%)
const forecast95 = canvasGrades.calculateForecaster(mathGradebook, 95);
assert.strictEqual(forecast95.isAchievable, false);
assert.strictEqual(forecast95.requiredMarks, null, 'Required marks must be null for unreachable target');
assert.strictEqual(forecast95.theoreticalMarksNeeded, 215, 'Theoretical marks needed must be exactly 215');
assert(forecast95.unreachableReason.includes('Unreachable (Requires 215 / 200 marks, exceeding 100%)'),
  `Must include standard diagnostic: "Unreachable (Requires 215 / 200 marks, exceeding 100%)", got "${forecast95.unreachableReason}"`);
assert.strictEqual(forecast95.assessments[0].marksNeeded, 215, 'Assessment forecast must report theoretical marks');
assert.strictEqual(forecast95.assessments[0].percentageNeeded, 107.5, 'Assessment forecast must report theoretical pace');
console.log(`   ✅ Target 95% (unreachable): Theoretical deficit verified: "${forecast95.unreachableReason}"`);

// 7c. Impossible Target (100% target > 92% max attainable)
// Needed: 100 - 52 = 48%. (48 / 40) * 200 = 240 / 200 marks (120%)
const forecast100 = canvasGrades.calculateForecaster(mathGradebook, 100);
assert.strictEqual(forecast100.isAchievable, false);
assert.strictEqual(forecast100.theoreticalMarksNeeded, 240);
assert(forecast100.unreachableReason.includes('Requires 240 / 200 marks, exceeding 100%'));
console.log(`   ✅ Target 100% (unreachable): Theoretical deficit verified: "${forecast100.unreachableReason}"`);

// 7d. Even pace distribution across multiple uncompleted assessments
const multiUncompletedCourse = {
  course: { courseCode: 'CS102', courseTitle: 'Data Structures' },
  categories: [
    { name: 'Assignments', weight: 40 },
    { name: 'Final Exam', weight: 60 }
  ],
  weights: { 'Assignments': 40, 'Final Exam': 60 },
  assignments: [
    { id: 'a1', title: 'A1', category: 'Assignments', pointsPossible: 50, score: 50, isCompleted: true },
    { id: 'a2', title: 'A2', category: 'Assignments', pointsPossible: 50, score: null, isCompleted: false }, // uncompleted
    { id: 'exam', title: 'Final', category: 'Final Exam', pointsPossible: 200, score: null, isCompleted: false } // uncompleted
  ]
};
// Locked: A1 = 50/100 of Assignments (40% weight) = 20% locked.
// Remaining weight: A2 (20%) + Final (60%) = 80%.
// Target: 80%. Needed = 80 - 20 = 60%. Required uniform pace = (60 / 80) * 100 = 75.0%.
const multiForecast = canvasGrades.calculateForecaster(multiUncompletedCourse, 80);
assert.strictEqual(multiForecast.isAchievable, true);
assert.strictEqual(multiForecast.requiredPercentageOnRemaining, 75);
assert.strictEqual(multiForecast.assessments[0].marksNeeded, 37.5, 'A2 needs 37.5/50 marks (75% pace)');
assert.strictEqual(multiForecast.assessments[1].marksNeeded, 150, 'Final needs 150/200 marks (75% pace)');
assert.strictEqual(multiForecast.assessments[0].percentageNeeded, 75);
assert.strictEqual(multiForecast.assessments[1].percentageNeeded, 75);
console.log('   ✅ Even pace distribution verified across multiple uncompleted assessments (75% uniform pace).\n');

// ============================================================================
// PART 8: F-05 Weighted-Book Normalization, Degraded Mode & Excused Assignments
// ============================================================================
console.log('8️⃣ Testing F-05: Weighted-Book Normalization, Degraded Mode & Excused Assignments...');

// 8a. Weight normalization when category weights sum to 95%
const non100WeightsHtml = `
  <table class="summary">
    <tr><th>Assignments</th><td>10%</td></tr>
    <tr><th>Internal</th><td>45%</td></tr>
    <tr><th>External</th><td>40%</td></tr>
    <tr><th>Total</th><td>95%</td></tr>
  </table>
  <table id="grades_summary">
    <tr id="a1"><th class="title">HW 1</th><td class="status">Graded</td><td class="assignment_score">10 / 10</td></tr>
    <tr id="a2"><th class="title">Mid Term</th><td class="status">Graded</td><td class="assignment_score">90 / 100</td></tr>
    <tr id="a3"><th class="title">End Term</th><td class="status">Unsubmitted</td><td class="assignment_score">- / 100</td></tr>
  </table>
`;

const parsedWeights95 = canvasGrades.parseCategoryWeights(non100WeightsHtml);
assert.strictEqual(parsedWeights95.isDegradedMode, true, 'isDegradedMode must be true when weights sum to 95%');
assert.strictEqual(parsedWeights95.rawTotalWeight, 95, 'rawTotalWeight must be 95');
assert(parsedWeights95.degradedReason.includes('Estimate only: category weights sum to 95%'),
  `degradedReason must flag non-100% sum, got "${parsedWeights95.degradedReason}"`);
// Normalized sum should equal 100%
const normalizedSum = parsedWeights95.categories.reduce((s, c) => s + c.weight, 0);
assert(Math.abs(normalizedSum - 100) < 0.05, `Normalized weights must sum to 100%, got ${normalizedSum}`);
console.log(`   ✅ Weight Normalization (95% sum): Re-based to 100%, Degraded banner: "${parsedWeights95.degradedReason}"`);

// 8b. Empty category handling without division by zero
const emptyCategoryCourse = {
  course: { courseCode: 'CAP401', courseTitle: 'Capstone Project' },
  categories: [
    { name: 'Milestones', weight: 50 },
    { name: 'Final Showcase', weight: 50 } // 0 assessments posted
  ],
  weights: { 'Milestones': 50, 'Final Showcase': 50 },
  assignments: [
    { id: 'm1', title: 'Milestone 1', category: 'Milestones', pointsPossible: 100, score: 100, isCompleted: true }
  ]
};
const emptyCatLocked = canvasGrades.calculateLockedAndRemaining(emptyCategoryCourse);
assert.strictEqual(emptyCatLocked.hasEmptyCategories, true, 'hasEmptyCategories must be true');
assert.strictEqual(emptyCatLocked.lockedPercentage, 50.0, 'Locked percentage must be 50%');
assert.strictEqual(emptyCatLocked.remainingWeight, 50.0, 'Remaining weight must be 50%');
assert(!isNaN(emptyCatLocked.lockedPercentage), 'Locked percentage must not be NaN');

// Target 80% when no uncompleted assignments exist in the book
const emptyCatForecast = canvasGrades.calculateForecaster(emptyCategoryCourse, 80);
assert.strictEqual(emptyCatForecast.isAchievable, false, 'Must not claim target is achievable with 0 assessments posted');
assert(emptyCatForecast.unreachableReason.includes('Final Showcase') || emptyCatForecast.unreachableReason.includes('no assessments posted yet'),
  `Must alert user about unposted assessments in category: "${emptyCatForecast.unreachableReason}"`);
console.log(`   ✅ Empty Category division-by-zero guard verified: "${emptyCatForecast.unreachableReason}"`);

// 8c. Excused assignments parsing & exclusion from denominator
const excusedHtml = `
  <table class="summary">
    <tr><th>Lab Work</th><td>100%</td></tr>
    <tr><th>Total</th><td>100%</td></tr>
  </table>
  <table id="grades_summary">
    <tr id="sub_1"><th class="title">Lab 1</th><td class="status">Graded</td><td class="assignment_score">10 / 10</td></tr>
    <tr id="sub_2" class="excused"><th class="title">Lab 2 (Sick Leave)</th><td class="status">Excused</td><td class="assignment_score">EX / 50</td></tr>
    <tr id="sub_3"><th class="title">Lab 3</th><td class="status">Unsubmitted</td><td class="assignment_score">- / 40</td></tr>
  </table>
`;
const excusedGradebook = canvasGrades.scrapeGradebook(excusedHtml);
const lab2 = excusedGradebook.assignments.find(a => a.id === 'sub_2');
assert(lab2, 'Must parse Lab 2');
assert.strictEqual(lab2.isExcused, true, 'Lab 2 must have isExcused: true');
assert.strictEqual(lab2.isCompleted, false, 'Excused assignment isCompleted must be false');
assert.strictEqual(lab2.score, null, 'Excused assignment score must be null');

const excusedLocked = canvasGrades.calculateLockedAndRemaining(excusedGradebook);
// Total valid points in Lab Work must be 10 (Lab 1) + 40 (Lab 3) = 50 pts (NOT 100 pts including Lab 2's 50 pts)
assert.strictEqual(excusedLocked.totalPoints, 50, `Total points must exclude excused 50 pts (expected 50, got ${excusedLocked.totalPoints})`);
assert.strictEqual(excusedLocked.remainingPoints, 40, `Remaining points must only be Lab 3 (40 pts), got ${excusedLocked.remainingPoints}`);
// Lab 1 (10/10) should contribute 10/50 of 100% = 20% locked
assert.strictEqual(excusedLocked.lockedPercentage, 20.0, `Locked percentage must be 20%, got ${excusedLocked.lockedPercentage}%`);

// Target 100%: requires 40/40 on Lab 3
const excusedForecast = canvasGrades.calculateForecaster(excusedGradebook, 100);
assert.strictEqual(excusedForecast.isAchievable, true);
assert.strictEqual(excusedForecast.requiredMarks, 40, 'Must require 40 marks on Lab 3');
assert.strictEqual(excusedForecast.assessments.length, 1, 'Only Lab 3 should be in uncompleted forecast');
assert.strictEqual(excusedForecast.assessments[0].title, 'Lab 3');
console.log('   ✅ Excused assignment detected and properly excluded from grading denominator (not inflated).');

// 8d. buildCourseGradeMetrics attaches scrapedAt and courseId
const demoForecast = canvasGrades.calculateForecaster(mathGradebook, 80);
const demoMetrics = canvasGrades.buildCourseGradeMetrics(mathGradebook, demoForecast);
assert(demoMetrics.scrapedAt, 'buildCourseGradeMetrics must attach scrapedAt');
assert(!isNaN(Date.parse(demoMetrics.scrapedAt)), 'scrapedAt must be a valid ISO date');
assert.strictEqual(demoMetrics.courseId, '101', 'buildCourseGradeMetrics must attach courseId: "101"');
assert.strictEqual(demoMetrics.lockedGradePoint, 6, 'Locked grade point for 52% must be 6 (UGC Grade B)');
assert.strictEqual(demoMetrics.ugcGrade.grade, 'B');
console.log(`   ✅ buildCourseGradeMetrics verified: scrapedAt=${demoMetrics.scrapedAt}, courseId=${demoMetrics.courseId}, UGC Grade=${demoMetrics.ugcGrade.grade} (${demoMetrics.lockedGradePoint} GP)\n`);

console.log('🎉 ALL CANVAS GRADES ENGINE & RADAR ASSERTIONS PASSED! (100% Verification Parity)');
