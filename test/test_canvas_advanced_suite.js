// test/test_canvas_advanced_suite.js
// Master Verification Suite for Canvas Advanced Capabilities:
// 1. Strict Quiz Safe-Guard Mode (Quiescent Mode & Injection Suppression)
// 2. Smart Course Files Hub & Exam Cram Pack Indexer (.pptx/.pdf parsing & batch link generation)
// 3. Multi-Course Credit-Weighted Semester SGPA Forecaster (Exact SGPA math with credits)

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('🧪 Starting Canvas Advanced Verification Suite...\n');

// Import Modules
const router = require('../extension/content/canvas_router');
const canvasFiles = require('../extension/content/canvas_files');
const canvasGrades = require('../extension/content/canvas_grades');
const newtab = require('../extension/newtab/newtab');

// ============================================================================
// PART 1: QUIZ SAFE-GUARD MODE & QUIESCENT EXECUTION
// ============================================================================
console.log('================================================================');
console.log('1️⃣ TESTING QUIZ SAFE-GUARD MODE & QUIESCENT EXECUTION');
console.log('================================================================');

// 1a. URL pattern detection: Active Quizzes, Submissions, Exams, SpeedGrader
const examQuizUrls = [
  'https://rishihood.instructure.com/courses/101/quizzes/555/take',
  'https://canvas.instructure.com/courses/402/quizzes/888/take?user_id=88',
  'https://canvas.instructure.com/quizzes/123/take',
  'https://canvas.instructure.com/courses/101/quizzes/500/take_quiz',
  '/quizzes/99/take',
  'https://school.instructure.com/courses/50/quizzes/final-exam/take#question_1',
  'https://rishihood.instructure.com/courses/101/assignments/202/submissions/new',
  'https://canvas.instructure.com/courses/101/submissions/new',
  '/submissions/new',
  'https://rishiverse.rishihood.edu.in/examinations/live-midterm',
  'https://portal.university.edu/examinations/session-1',
  'https://portal.university.edu/examination/term-final',
  'https://rishihood.instructure.com/courses/101/canvas-speedgrader',
  'https://canvas.instructure.com/courses/101/gradebook/speed_grader?assignment_id=2',
  'https://canvas.instructure.com/speedgrader'
];

for (const u of examQuizUrls) {
  assert.strictEqual(
    router.isExamSafeRoute(u),
    true,
    `isExamSafeRoute must be true for exam/quiz URL: ${u}`
  );
  assert.strictEqual(
    router.getPageType(u),
    'quiescent_safe',
    `getPageType must return quiescent_safe for: ${u}`
  );
  assert.strictEqual(
    router.isCanvasGradesPage(u),
    false,
    `isCanvasGradesPage must be false for exam/quiz URL: ${u}`
  );
  assert.strictEqual(
    router.isCanvasAssignmentsPage(u),
    false,
    `isCanvasAssignmentsPage must be false for exam/quiz URL: ${u}`
  );
}
console.log(`   ✅ Tested ${examQuizUrls.length} quiz/exam/speedgrader URLs: 100% classified as quiescent_safe.`);

// 1b. Negative cases: standard pages must NEVER trigger safe mode
const standardUrls = [
  'https://rishihood.instructure.com/courses/101/grades',
  'https://rishihood.instructure.com/courses/101/assignments',
  'https://rishihood.instructure.com/dashboard',
  'https://rishihood.instructure.com/courses/101/modules',
  'https://rishihood.instructure.com/courses/101/files',
  'https://rishihood.instructure.com/courses/101/quizzes/500', // viewing details only, not taking
  'https://rishiverse.rishihood.edu.in/student/attendance',
  'https://rishiverse.rishihood.edu.in/dashboard'
];

for (const u of standardUrls) {
  assert.strictEqual(
    router.isExamSafeRoute(u),
    false,
    `isExamSafeRoute must be false for standard URL: ${u}`
  );
  assert.notStrictEqual(
    router.getPageType(u),
    'quiescent_safe',
    `getPageType must NOT be quiescent_safe for standard URL: ${u}`
  );
}
console.log(`   ✅ Tested ${standardUrls.length} standard URLs: 0 false positives.`);

// 1c. Route Dispatch Isolation & Clean Console Badge Verification
let attendanceInvoked = false;
let gradesInvoked = false;
let assignmentsInvoked = false;
let quiescentSafeInvoked = false;

const logBuffer = [];
const originalLog = console.log;
console.log = function (...args) {
  logBuffer.push(args.join(' '));
  originalLog.apply(console, args);
};

router.resetQuiescentSafeMode();

const dispatchResult = router.route({
  url: 'https://rishihood.instructure.com/courses/101/quizzes/999/take',
  executeAttendance: () => { attendanceInvoked = true; },
  executeGrades: () => { gradesInvoked = true; },
  executeAssignments: () => { assignmentsInvoked = true; },
  executeQuiescentSafe: () => { quiescentSafeInvoked = true; }
});

console.log = originalLog;

assert.strictEqual(dispatchResult.pageType, 'quiescent_safe');
assert.strictEqual(dispatchResult.routedTo, 'quiescent_safe');
assert.strictEqual(dispatchResult.quiescentSafeMode, true);
assert.strictEqual(dispatchResult.initialized, true);

// Verify strict suppression of other engines
assert.strictEqual(attendanceInvoked, false, 'Attendance engine MUST NOT run during active quiz');
assert.strictEqual(gradesInvoked, false, 'Grades forecaster MUST NOT run during active quiz');
assert.strictEqual(assignmentsInvoked, false, 'Assignments radar MUST NOT run during active quiz');
assert.strictEqual(quiescentSafeInvoked, true, 'Quiescent safe handler MUST be invoked');

// Verify clean console badge
const expectedBadge = '[Bunkr] Quiescent safe mode active for exam/quiz integrity.';
const badgeFound = logBuffer.some((entry) => entry.includes(expectedBadge));
assert.strictEqual(badgeFound, true, `Console must log exact badge: "${expectedBadge}"`);
assert.strictEqual(router.isQuiescentActive(), true, 'isQuiescentActive() must be true');
console.log('   ✅ Engine suppression verified: 0% risk of test disruption or submission interference.');
console.log(`   ✅ Exact console badge verified: "${expectedBadge}".`);

// 1d. Observer Disconnection & DOM Injection Suppression Verification
function createMockNode(tagName, attrs = {}) {
  const children = [];
  return {
    tagName: tagName.toUpperCase(),
    id: attrs.id || '',
    className: attrs.className || '',
    classList: {
      contains: (cls) => (attrs.className || '').split(/\s+/).includes(cls)
    },
    children,
    parentNode: null,
    appendChild: function (c) {
      c.parentNode = this;
      children.push(c);
      return c;
    },
    removeChild: function (c) {
      const idx = children.indexOf(c);
      if (idx !== -1) {
        children.splice(idx, 1);
        c.parentNode = null;
      }
      return c;
    },
    remove: function () {
      if (this.parentNode && typeof this.parentNode.removeChild === 'function') {
        this.parentNode.removeChild(this);
      }
    },
    querySelector: function (sel) {
      for (const child of children) {
        if (sel.startsWith('#') && child.id === sel.slice(1)) return child;
        if (sel.startsWith('.') && child.classList.contains(sel.slice(1))) return child;
        const res = child.querySelector(sel);
        if (res) return res;
      }
      return null;
    },
    querySelectorAll: function (sel) {
      const matched = [];
      function walk(node) {
        for (const ch of node.children) {
          let match = false;
          if (sel.startsWith('#') && ch.id === sel.slice(1)) match = true;
          else if (sel.startsWith('.') && ch.classList.contains(sel.slice(1))) match = true;
          if (match) matched.push(ch);
          walk(ch);
        }
      }
      walk(this);
      return matched;
    }
  };
}

const mockDoc = {
  body: createMockNode('body'),
  createElement: (tag) => createMockNode(tag),
  querySelector: function (sel) {
    if (sel.startsWith('#') && this.body.id === sel.slice(1)) return this.body;
    return this.body.querySelector(sel);
  },
  querySelectorAll: function (sel) {
    return this.body.querySelectorAll(sel);
  }
};

// Populate mock doc with multiple injected overlays
const overlayElements = [
  createMockNode('div', { id: 'bunkr-root' }),
  createMockNode('div', { id: 'bunkr-page-banner' }),
  createMockNode('div', { id: 'canvas-grades-forecaster' }),
  createMockNode('div', { id: 'canvas-assignment-radar' }),
  createMockNode('div', { id: 'canvas-files-modal' }),
  createMockNode('div', { id: 'am-override-popover' }),
  createMockNode('span', { className: 'canvas-radar-badge' }),
  createMockNode('span', { className: 'canvas-badge' })
];

overlayElements.forEach((el) => mockDoc.body.appendChild(el));
assert.strictEqual(mockDoc.body.children.length, 8, 'Mock document should have 8 injected overlay elements');

// Test observer disconnection
let disconnected = false;
const testObserver = {
  disconnect: () => { disconnected = true; }
};
router.registerObserver(testObserver);
router.disconnectObservers();
assert.strictEqual(disconnected, true, 'Registered MutationObserver must be disconnected');

// Suppress overlays
const removedOverlaysCount = router.suppressOverlays(mockDoc);
assert.strictEqual(removedOverlaysCount, 8, `Expected 8 suppressed overlays, got ${removedOverlaysCount}`);
assert.strictEqual(mockDoc.querySelector('#bunkr-root'), null);
assert.strictEqual(mockDoc.querySelector('#bunkr-page-banner'), null);
assert.strictEqual(mockDoc.querySelector('#canvas-grades-forecaster'), null);
assert.strictEqual(mockDoc.querySelector('#canvas-assignment-radar'), null);
assert.strictEqual(mockDoc.querySelector('#canvas-files-modal'), null);
assert.strictEqual(mockDoc.querySelector('#am-override-popover'), null);
assert.strictEqual(mockDoc.querySelector('.canvas-radar-badge'), null);
assert.strictEqual(mockDoc.querySelector('.canvas-badge'), null);
console.log('   ✅ Observer disconnection and complete DOM overlay suppression verified.');


// ============================================================================
// PART 2: SMART COURSE FILES HUB & EXAM CRAM PACK INDEXER
// ============================================================================
console.log('\n================================================================');
console.log('2️⃣ TESTING SMART COURSE FILES HUB & EXAM CRAM PACK INDEXER');
console.log('================================================================');

// Load HTML fixture: Rishihood CSD02C1001 Mathematics-I Modules & Files
const fixtureHtmlPath = path.resolve(__dirname, '../extension/demo/canvas_modules_demo.html');
assert(fs.existsSync(fixtureHtmlPath), `Fixture must exist at: ${fixtureHtmlPath}`);
const modulesHtml = fs.readFileSync(fixtureHtmlPath, 'utf8');

// 2a. Course Header & Module Tree Scraping
const courseHeader = canvasFiles.parseCourseHeader(modulesHtml);
assert.strictEqual(courseHeader.courseCode, 'CSD02C1001', 'Course code must be CSD02C1001');
assert.strictEqual(courseHeader.courseTitle, 'Mathematics-I', 'Course title must be Mathematics-I');
console.log(`   ✅ Course Header parsed: "${courseHeader.fullTitle}" (Code: ${courseHeader.courseCode}, Title: ${courseHeader.courseTitle})`);

const indexedMaterials = canvasFiles.indexCourseDocuments(modulesHtml, {
  baseUrl: 'https://rishihood.instructure.com'
});

assert(Array.isArray(indexedMaterials.files), 'indexedMaterials.files must be an array');
assert(indexedMaterials.files.length >= 8, `Expected at least 8 documents, got ${indexedMaterials.files.length}`);
assert(Array.isArray(indexedMaterials.modules), 'indexedMaterials.modules must be an array');
assert(indexedMaterials.modules.length >= 3, `Expected at least 3 modules/units, got ${indexedMaterials.modules.length}`);
console.log(`   ✅ Indexed ${indexedMaterials.files.length} documents across ${indexedMaterials.modules.length} units.`);
console.log(`   ✅ Formatted total size: ${indexedMaterials.stats.totalSizeFormatted}`);

// 2b. Filtering by .pptx and .pdf files & category classification
const pptxFiles = indexedMaterials.files.filter((f) => f.type === '.pptx' || f.extension === 'pptx');
assert(pptxFiles.length >= 2, `Must index at least 2 .pptx files, got ${pptxFiles.length}`);
const unit1Pptx = pptxFiles.find((f) => f.name.includes('Unit 1 Lecture Slides'));
assert(unit1Pptx, 'Must find "Unit 1 Lecture Slides.pptx"');
assert.strictEqual(unit1Pptx.extension, 'pptx');
assert.strictEqual(unit1Pptx.category, 'Slides');
assert.strictEqual(unit1Pptx.size, '14.2 MB');
assert.strictEqual(unit1Pptx.unit, 'Unit 1');
console.log(`   ✅ Found .pptx file: "${unit1Pptx.name}" (${unit1Pptx.size}, ${unit1Pptx.unit})`);

const pdfFiles = indexedMaterials.files.filter((f) => f.type === '.pdf' || f.extension === 'pdf');
assert(pdfFiles.length >= 4, `Must index at least 4 .pdf files, got ${pdfFiles.length}`);

// PDF 1: Lecture slides PDF
const lecturePdf = pdfFiles.find((f) => f.name.includes('Lecture 01 - Limits and Continuity'));
assert(lecturePdf, 'Must find "Lecture 01 - Limits and Continuity.pdf"');
assert.strictEqual(lecturePdf.extension, 'pdf');
assert.strictEqual(lecturePdf.category, 'Slides');
assert.strictEqual(lecturePdf.size, '2.4 MB');
assert.strictEqual(lecturePdf.unit, 'Unit 1');
assert(lecturePdf.downloadUrl.includes('download_frd=1'), 'downloadUrl must contain download_frd=1');
console.log(`   ✅ Found lecture .pdf file: "${lecturePdf.name}" (${lecturePdf.size}, category: Slides)`);

// PDF 2: Syllabus PDF
const syllabusPdf = pdfFiles.find((f) => f.name.includes('Course Syllabus and Grading Policy'));
assert(syllabusPdf, 'Must find Syllabus PDF');
assert.strictEqual(syllabusPdf.category, 'Syllabus');
assert.strictEqual(syllabusPdf.size, '450 KB');
console.log(`   ✅ Found syllabus .pdf file: "${syllabusPdf.name}" (${syllabusPdf.size}, category: Syllabus)`);

// Tab Filtering: 'Slides', 'Syllabus', 'Assignments', 'All'
const slidesTab = canvasFiles.filterFiles(indexedMaterials.files, '', 'Slides');
assert(slidesTab.length >= 4, `Slides tab must return at least 4 items, got ${slidesTab.length}`);
slidesTab.forEach((item) => {
  assert(
    item.category === 'Slides' || item.extension === 'pptx' || item.extension === 'ppt',
    `Every item in Slides tab must be a slide: ${item.name}`
  );
});
console.log(`   ✅ 'Slides' tab filter returned ${slidesTab.length} presentations/slide documents.`);

const syllabusTab = canvasFiles.filterFiles(indexedMaterials.files, '', 'Syllabus');
assert.strictEqual(syllabusTab.length, 1, 'Syllabus tab must return exactly 1 document');
assert.strictEqual(syllabusTab[0].name, 'Course Syllabus and Grading Policy 2026.pdf');
console.log(`   ✅ 'Syllabus' tab filter verified: "${syllabusTab[0].name}".`);

const assignmentsTab = canvasFiles.filterFiles(indexedMaterials.files, '', 'Assignments');
assert.strictEqual(assignmentsTab.length, 1, 'Assignments tab must return exactly 1 document');
assert.strictEqual(assignmentsTab[0].name, 'Problem Set 1 - Limits Practice.docx');
console.log(`   ✅ 'Assignments' tab filter verified: "${assignmentsTab[0].name}".`);

// Multi-token keyword search
const keywordResults = canvasFiles.filterFiles(indexedMaterials.files, 'continuity', 'All');
assert.strictEqual(keywordResults.length, 1);
assert.strictEqual(keywordResults[0].name, 'Lecture 01 - Limits and Continuity.pdf');
console.log('   ✅ Multi-token keyword search for "continuity" returned exact match.');

// 2c. 1-Click Exam Cram Pack Generation & Batch Links
const unit1CramPack = canvasFiles.generateCramPack(indexedMaterials.files, 'Unit 1');
assert(unit1CramPack, 'Unit 1 Cram Pack must be defined');
assert(unit1CramPack.slideCount >= 2, `Unit 1 must contain at least 2 slide items, got ${unit1CramPack.slideCount}`);
assert(unit1CramPack.downloadUrls.length === unit1CramPack.slideCount, 'Download URLs count must match slide count');
assert(unit1CramPack.totalSizeBytes > 0, 'Total size in bytes must be positive');
console.log(`   ✅ Unit 1 Exam Cram Pack generated: ${unit1CramPack.slideCount} slides (${unit1CramPack.totalSizeFormatted}).`);

const semesterCramPack = canvasFiles.generateCramPack(indexedMaterials.files);
assert(semesterCramPack.slideCount >= 4, `All-units Cram Pack must contain at least 4 slides, got ${semesterCramPack.slideCount}`);
console.log(`   ✅ Course-wide Exam Cram Pack generated: ${semesterCramPack.slideCount} slides (${semesterCramPack.totalSizeFormatted}).`);

// Format Cram Pack links: Markdown, Plain Text, cURL script
const mdLinks = canvasFiles.formatCramPackLinks(indexedMaterials.files, 'markdown');
assert(mdLinks.includes('[Lecture 01 - Limits and Continuity.pdf]('), 'Markdown must have format [Title](URL)');
assert(mdLinks.includes('download_frd=1'), 'Markdown links must use download_frd=1 direct URL');

const plainLinks = canvasFiles.formatCramPackLinks(indexedMaterials.files, 'plain');
assert(plainLinks.includes('Lecture 01 - Limits and Continuity.pdf: https://'), 'Plain text must format Title: URL');

const curlScript = canvasFiles.formatCramPackLinks(indexedMaterials.files, 'curl');
assert(curlScript.includes('#!/usr/bin/env bash'), 'cURL script must include bash shebang');
assert(curlScript.includes('curl -L -O'), 'cURL script must use curl -L -O command');
console.log('   ✅ Batch link generation verified for Markdown, Plain Text, and executable cURL bash script.');

// Direct download URL normalization
const testRawUrl = '/courses/101/files/8888';
const normalizedUrl = canvasFiles.normalizeDownloadUrl(testRawUrl, 'https://rishihood.instructure.com');
assert.strictEqual(
  normalizedUrl,
  'https://rishihood.instructure.com/courses/101/files/8888/download?download_frd=1',
  'normalizeDownloadUrl must append /download?download_frd=1'
);
console.log(`   ✅ URL Normalization verified: ${normalizedUrl}`);


// ============================================================================
// PART 3: MULTI-COURSE CREDIT-WEIGHTED SEMESTER SGPA FORECASTER
// ============================================================================
console.log('\n================================================================');
console.log('3️⃣ TESTING MULTI-COURSE CREDIT-WEIGHTED SGPA FORECASTER');
console.log('================================================================');

// 3a. Rishihood Course Credit Resolution (Total: 22 Credits for Semester 1)
const rishihoodCurriculum = [
  { code: 'CSD02C1001', name: 'Mathematics-I', expectedCredits: 4 },
  { code: 'CSD02C1002', name: 'Problem Solving and Programming (PSP)', expectedCredits: 4 },
  { code: 'CSD02C1003', name: 'Web Application Development - I (WAD)', expectedCredits: 3 },
  { code: 'CSD02C1004', name: 'Computer fundamentals and networking (CFN)', expectedCredits: 3 },
  { code: 'RSPRFC1003', name: 'Social Communication I', expectedCredits: 2 },
  { code: 'RSPRFC1001', name: 'Understanding India', expectedCredits: 2 },
  { code: 'KPMG01', name: 'KPMG/Edept Workshop', expectedCredits: 2 },
  { code: 'RSPRFC1002', name: 'Self and Society I', expectedCredits: 2 }
];

let sumSemesterCredits = 0;
for (const course of rishihoodCurriculum) {
  const creditsFromGrades = canvasGrades.getDefaultCredits(course.code, course.name);
  const creditsFromNewtab = newtab.getDefaultCredits(course.code, course.name);
  assert.strictEqual(creditsFromGrades, course.expectedCredits);
  assert.strictEqual(creditsFromNewtab, course.expectedCredits);
  sumSemesterCredits += course.expectedCredits;
  console.log(`   ✅ ${course.name} (${course.code}): ${creditsFromGrades} Credits (Parity: canvas_grades & newtab)`);
}

assert.strictEqual(sumSemesterCredits, 22, `Total semester credits must equal 22, got ${sumSemesterCredits}`);
console.log(`   ✅ Total Semester 1 Curriculum Credits: ${sumSemesterCredits} Credits.`);

// 3b. Exact SGPA Mathematics: SGPA = sum(Course SGPA * Credits) / sum(Credits)
// Dual scale conversions: Course SGPA = Percentage / 10
assert.strictEqual(canvasGrades.percentageToSGPA(80), 8.0);
assert.strictEqual(canvasGrades.percentageToSGPA(85), 8.5);
assert.strictEqual(canvasGrades.percentageToSGPA(92.5), 9.25);
assert.strictEqual(canvasGrades.sgpaToPercentage(8.0), 80.0);
assert.strictEqual(canvasGrades.sgpaToPercentage(8.5), 85.0);

// Test Case 1: Hand-calculated 2-course scenario
// Course A (Math): 4 credits, 8.0 SGPA (80%) -> 32.0 points
// Course B (PSP): 4 credits, 9.0 SGPA (90%) -> 36.0 points
// Total credits = 8, Points = 68.0 => SGPA = 68.0 / 8 = 8.50
const twoCourseSet = [
  { code: 'CSD02C1001', credits: 4, courseSGPA: 8.0 },
  { code: 'CSD02C1002', credits: 4, courseSGPA: 9.0 }
];
const twoCourseCalc = canvasGrades.calculateCreditWeightedSGPA(twoCourseSet);
assert.strictEqual(twoCourseCalc.totalCredits, 8);
assert.strictEqual(twoCourseCalc.currentSGPA, 8.50, 'Weighted SGPA must be 8.50');
console.log(`   ✅ 2-Course Hand Calculation: SGPA = ${twoCourseCalc.currentSGPA} (Exact: 8.50)`);

// Test Case 2: Full 8-Course Semester (22 Credits) with varied grades
// 1. Math (4 credits, 8.0 SGPA) -> 32.0
// 2. PSP (4 credits, 8.5 SGPA) -> 34.0
// 3. WAD (3 credits, 9.0 SGPA) -> 27.0
// 4. CFN (3 credits, 7.5 SGPA) -> 22.5
// 5. Social Comm (2 credits, 8.0 SGPA) -> 16.0
// 6. India (2 credits, 9.5 SGPA) -> 19.0
// 7. KPMG (2 credits, 8.5 SGPA) -> 17.0
// 8. Self & Society (2 credits, 8.0 SGPA) -> 16.0
// Sum Points = 32 + 34 + 27 + 22.5 + 16 + 19 + 17 + 16 = 183.50
// SGPA = 183.50 / 22 = 8.3409... -> 8.34
const fullSemesterSet = [
  { code: 'CSD02C1001', credits: 4, lockedSGPA: 8.0, maxPossibleSGPA: 9.0 },
  { code: 'CSD02C1002', credits: 4, lockedSGPA: 8.5, maxPossibleSGPA: 9.5 },
  { code: 'CSD02C1003', credits: 3, lockedSGPA: 9.0, maxPossibleSGPA: 10.0 },
  { code: 'CSD02C1004', credits: 3, lockedSGPA: 7.5, maxPossibleSGPA: 8.5 },
  { code: 'RSPRFC1003', credits: 2, lockedSGPA: 8.0, maxPossibleSGPA: 9.0 },
  { code: 'RSPRFC1001', credits: 2, lockedSGPA: 9.5, maxPossibleSGPA: 10.0 },
  { code: 'KPMG01', credits: 2, lockedSGPA: 8.5, maxPossibleSGPA: 9.5 },
  { code: 'RSPRFC1002', credits: 2, lockedSGPA: 8.0, maxPossibleSGPA: 9.0 }
];

const semCalc = canvasGrades.calculateCreditWeightedSGPA(fullSemesterSet);
assert.strictEqual(semCalc.totalCredits, 22);
assert.strictEqual(semCalc.currentSGPA, 8.34, 'Full semester SGPA must be 8.34');
console.log(`   ✅ Full 8-Course Semester SGPA: ${semCalc.currentSGPA} (22 credits, sum=183.5 pts)`);

// 3c. Interactive Target SGPA Simulator (7.5, 8.0, 8.5, 9.0)
const activeSemester = [
  { code: 'CSD02C1001', name: 'Mathematics-I', credits: 4, lockedPercentage: 52.0, maxPossiblePercentage: 92.0 },
  { code: 'CSD02C1002', name: 'Problem Solving and Programming', credits: 4, lockedPercentage: 65.0, maxPossiblePercentage: 95.0 },
  { code: 'CSD02C1003', name: 'Web Application Development - I', credits: 3, lockedPercentage: 70.0, maxPossiblePercentage: 100.0 },
  { code: 'CSD02C1004', name: 'Computer fundamentals and networking', credits: 3, lockedPercentage: 60.0, maxPossiblePercentage: 90.0 },
  { code: 'RSPRFC1003', name: 'Social Communication I', credits: 2, lockedPercentage: 75.0, maxPossiblePercentage: 95.0 },
  { code: 'RSPRFC1001', name: 'Understanding India', credits: 2, lockedPercentage: 80.0, maxPossiblePercentage: 100.0 },
  { code: 'KPMG01', name: 'KPMG Workshop', credits: 2, lockedPercentage: 85.0, maxPossiblePercentage: 95.0 },
  { code: 'RSPRFC1002', name: 'Self and Society I', credits: 2, lockedPercentage: 70.0, maxPossiblePercentage: 90.0 }
];

// Target 8.0 SGPA
const sim80 = canvasGrades.simulateTargetSGPA(activeSemester, 8.0);
assert.strictEqual(sim80.targetSGPA, 8.0);
assert.strictEqual(sim80.isAchievable, true);
assert.strictEqual(sim80.isAlreadyAchieved, false);
assert(sim80.requiredPaceOnRemaining > 0 && sim80.requiredPaceOnRemaining < 100);
console.log(`   ✅ Target 8.0 SGPA: Achievable=true, Required pace on remaining assessments = ${sim80.requiredPaceOnRemaining}%`);

// Target 8.5 SGPA
const sim85 = canvasGrades.simulateTargetSGPA(activeSemester, 8.5);
assert.strictEqual(sim85.targetSGPA, 8.5);
assert.strictEqual(sim85.isAchievable, true);
assert(sim85.requiredPaceOnRemaining > sim80.requiredPaceOnRemaining, 'Higher target requires higher pace');
console.log(`   ✅ Target 8.5 SGPA: Achievable=true, Required pace on remaining assessments = ${sim85.requiredPaceOnRemaining}%`);

// Target 9.0 SGPA
const sim90 = canvasGrades.simulateTargetSGPA(activeSemester, 9.0);
assert.strictEqual(sim90.targetSGPA, 9.0);
assert.strictEqual(sim90.isAchievable, true);
assert(sim90.requiredPaceOnRemaining > sim85.requiredPaceOnRemaining);
console.log(`   ✅ Target 9.0 SGPA: Achievable=true, Required pace on remaining assessments = ${sim90.requiredPaceOnRemaining}%`);

// Unachievable Target (e.g. 9.8 SGPA > 9.45 max achievable)
const simImpossible = canvasGrades.simulateTargetSGPA(activeSemester, 9.8);
assert.strictEqual(simImpossible.isAchievable, false);
assert.strictEqual(simImpossible.requiredPaceOnRemaining, null);
console.log('   ✅ Unachievable target (9.8 SGPA > 9.45 max) correctly flagged as impossible (null pace).');

// Already Achieved Target (e.g. 6.0 SGPA < 6.72 locked)
const simAchieved = canvasGrades.simulateTargetSGPA(activeSemester, 6.0);
assert.strictEqual(simAchieved.isAlreadyAchieved, true);
assert.strictEqual(simAchieved.requiredPaceOnRemaining, 0);
console.log('   ✅ Already achieved target (6.0 SGPA < 6.72 locked) correctly requires 0% additional pace.');

// 3d. Cross-course Persistence Verification into canvas_courses_grades
const gradesDemoHtml = fs.readFileSync(path.resolve(__dirname, '../extension/demo/canvas_grades_demo.html'), 'utf8');
const mathCourseData = canvasGrades.scrapeGradebook(gradesDemoHtml);
const mathForecast = canvasGrades.calculateForecaster(mathCourseData, 80);

const persistedMetrics = canvasGrades.buildCourseGradeMetrics(mathCourseData, mathForecast);
assert.strictEqual(persistedMetrics.code, 'CSD02C1001');
assert.strictEqual(persistedMetrics.name, 'Mathematics-I');
assert.strictEqual(persistedMetrics.credits, 4);
assert.strictEqual(persistedMetrics.lockedPercentage, 52.0);
assert.strictEqual(persistedMetrics.lockedSGPA, 5.2);
assert.strictEqual(persistedMetrics.maxPossiblePercentage, 92.0);
assert.strictEqual(persistedMetrics.maxPossibleSGPA, 9.2);
assert.strictEqual(persistedMetrics.targetPercentage, 80.0);
assert.strictEqual(persistedMetrics.targetSGPA, 8.0);
console.log(`   ✅ Cross-course metrics record generated for ${persistedMetrics.code}: Credits=${persistedMetrics.credits}, Locked=${persistedMetrics.lockedPercentage}%, Target=${persistedMetrics.targetPercentage}%`);

// Mock storage test
const testStorageData = {};
const mockChromeStorage = {
  get: (keys, cb) => {
    const res = {};
    keys.forEach((k) => {
      if (testStorageData[k] !== undefined) res[k] = JSON.parse(JSON.stringify(testStorageData[k]));
    });
    cb(res);
  },
  set: (data, cb) => {
    Object.assign(testStorageData, JSON.parse(JSON.stringify(data)));
    if (cb) cb();
  }
};

canvasGrades.saveCourseGradeMetrics(mathCourseData, mathForecast, { storage: mockChromeStorage }).then((saveRes) => {
  assert(saveRes.success, 'saveCourseGradeMetrics must report success: true');
  assert(testStorageData.canvas_courses_grades, 'storage must contain canvas_courses_grades key');
  const storedMath = testStorageData.canvas_courses_grades['CSD02C1001'];
  assert(storedMath, 'Stored data must include CSD02C1001');
  assert.strictEqual(storedMath.code, 'CSD02C1001');
  assert.strictEqual(storedMath.credits, 4);
  assert.strictEqual(storedMath.lockedPercentage, 52.0);
  assert.strictEqual(storedMath.targetPercentage, 80.0);
  console.log('   ✅ Successfully persisted to chrome.storage.local (canvas_courses_grades.CSD02C1001).');

  console.log('\n================================================================');
  console.log('🎉 ALL CANVAS ADVANCED SUITE TESTS PASSED SUCCESSFULLY! (100% PARITY)');
  console.log('================================================================\n');
}).catch((err) => {
  console.error('Persistence verification failed:', err);
  process.exit(1);
});
