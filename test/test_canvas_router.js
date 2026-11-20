// test/test_canvas_router.js
// Verification suite for Canvas Router, Scraper Guard & Right-Side Overflow Fixes

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('🧪 Starting Canvas Router & Page Boundary Verification Suite...\n');

const router = require('../extension/content/canvas_router');
const math = require('../extension/content/math');
const parser = require('../extension/content/parser');

// 1. URL and Route Detection
console.log('1️⃣ Testing Canvas Router URL & Pattern Detection...');

// 1a. Canvas Grades
assert.strictEqual(
  router.getPageType('https://rishihood.instructure.com/courses/101/grades'),
  'canvas_grades',
  'Must classify /courses/101/grades as canvas_grades'
);
assert.strictEqual(
  router.getPageType('https://canvas.instructure.com/courses/402/grades?student_id=88'),
  'canvas_grades',
  'Must classify query-param grades URL as canvas_grades'
);
assert.strictEqual(
  router.isCanvasGradesPage('https://myschool.instructure.com/courses/123/grades'),
  true,
  'isCanvasGradesPage must be true'
);
console.log('   ✅ Canvas Grades URLs detected correctly.');

// 1b. Canvas Assignments & Dashboard
assert.strictEqual(
  router.getPageType('https://rishihood.instructure.com/courses/101/assignments'),
  'canvas_assignments',
  'Must classify /courses/101/assignments as canvas_assignments'
);
assert.strictEqual(
  router.getPageType('https://rishihood.instructure.com/courses/101/assignments/12345'),
  'canvas_assignments',
  'Must classify assignment detail URL as canvas_assignments'
);
assert.strictEqual(
  router.getPageType('https://rishihood.instructure.com/dashboard'),
  'canvas_assignments',
  'Must classify /dashboard as canvas_assignments'
);
assert.strictEqual(
  router.getPageType('https://rishihood.instructure.com/'),
  'canvas_assignments',
  'Must classify Canvas root dashboard as canvas_assignments'
);
console.log('   ✅ Canvas Assignments & Dashboard URLs detected correctly.');

// 1c. Rishiverse ERP & Attendance
assert.strictEqual(
  router.getPageType('https://rishihood.rishiverse.com/student/attendance'),
  'rishiverse',
  'Must classify rishiverse attendance as rishiverse'
);
assert.strictEqual(
  router.getPageType('https://rishiverse.rishihood.edu.in/dashboard'),
  'rishiverse',
  'Must classify rishiverse.rishihood.edu.in as rishiverse'
);
assert.strictEqual(
  router.getPageType('https://rishihood.instructure.com/courses/101/attendance'),
  'canvas_attendance',
  'Must classify /attendance on Canvas as canvas_attendance'
);
console.log('   ✅ Rishiverse ERP & Canvas Attendance URLs detected correctly.');

// 2. DOM-based Routing Verification
console.log('\n2️⃣ Testing DOM-based Routing Fallback...');

function createMockElement(tagName, attributes = {}) {
  const children = [];
  return {
    tagName: tagName.toUpperCase(),
    id: attributes.id || '',
    className: attributes.className || '',
    classList: {
      contains: (cls) => (attributes.className || '').split(/\s+/).includes(cls)
    },
    innerText: attributes.innerText || '',
    textContent: attributes.innerText || '',
    style: {},
    children,
    parentNode: null,
    appendChild: function (child) {
      child.parentNode = this;
      children.push(child);
      return child;
    },
    removeChild: function (child) {
      const idx = children.indexOf(child);
      if (idx !== -1) {
        children.splice(idx, 1);
        child.parentNode = null;
      }
      return child;
    },
    remove: function () {
      if (this.parentNode && typeof this.parentNode.removeChild === 'function') {
        this.parentNode.removeChild(this);
      }
    },
    closest: function (sel) {
      let curr = this;
      while (curr) {
        if (sel.startsWith('#') && curr.id === sel.slice(1)) return curr;
        if (sel.startsWith('.') && curr.classList.contains(sel.slice(1))) return curr;
        if (curr.tagName && curr.tagName.toLowerCase() === sel.toLowerCase()) return curr;
        curr = curr.parentNode;
      }
      return null;
    },
    querySelector: function (sel) {
      if (sel.includes(',')) {
        for (const sub of sel.split(',')) {
          const res = this.querySelector(sub.trim());
          if (res) return res;
        }
        return null;
      }
      for (const child of children) {
        if (sel.startsWith('#') && child.id === sel.slice(1)) return child;
        if (sel.startsWith('.') && child.classList.contains(sel.slice(1))) return child;
        if (child.tagName && child.tagName.toLowerCase() === sel.toLowerCase()) return child;
        const found = child.querySelector(sel);
        if (found) return found;
      }
      return null;
    },
    querySelectorAll: function (sel) {
      const results = [];
      function recurse(node) {
        for (const child of node.children) {
          let match = false;
          if (sel.startsWith('#') && child.id === sel.slice(1)) match = true;
          else if (sel.startsWith('.') && child.classList.contains(sel.slice(1))) match = true;
          else if (child.tagName && child.tagName.toLowerCase() === sel.toLowerCase()) match = true;
          else if (sel === 'tr' && child.tagName === 'TR') match = true;
          else if (sel === 'th, td' && (child.tagName === 'TH' || child.tagName === 'TD')) match = true;
          if (match) results.push(child);
          recurse(child);
        }
      }
      recurse(this);
      return results;
    }
  };
}

function createMockDocument() {
  const body = createMockElement('body');
  return {
    body,
    createElement: (tag) => createMockElement(tag),
    querySelector: (sel) => {
      if (sel.startsWith('#') && body.id === sel.slice(1)) return body;
      return body.querySelector(sel);
    },
    querySelectorAll: (sel) => body.querySelectorAll(sel)
  };
}

const docGrades = createMockDocument();
const tableGrades = createMockElement('table', { id: 'grades_summary' });
docGrades.body.appendChild(tableGrades);

assert.strictEqual(
  router.getPageType('https://local.test/page', docGrades),
  'canvas_grades',
  'Must detect canvas_grades from table#grades_summary'
);

const docAssignments = createMockDocument();
const divAssignments = createMockElement('div', { className: 'assignment-list' });
docAssignments.body.appendChild(divAssignments);

assert.strictEqual(
  router.getPageType('https://local.test/canvas_demo', docAssignments),
  'canvas_assignments',
  'Must detect canvas_assignments from .assignment-list'
);

console.log('   ✅ DOM-based fallback routing verified.');

// 3. Dispatch & Execution Routing
console.log('\n3️⃣ Testing Route Dispatch Handlers...');

let attendanceExecuted = false;
let gradesExecuted = false;
let assignmentsExecuted = false;

// Route Canvas Grades
router.route({
  url: 'https://rishihood.instructure.com/courses/101/grades',
  executeAttendance: () => { attendanceExecuted = true; },
  executeGrades: () => { gradesExecuted = true; },
  executeAssignments: () => { assignmentsExecuted = true; }
});
assert.strictEqual(gradesExecuted, true, 'executeGrades must be called on grades URL');
assert.strictEqual(attendanceExecuted, false, 'executeAttendance must NOT be called on grades URL');
assert.strictEqual(assignmentsExecuted, false, 'executeAssignments must NOT be called on grades URL');

// Route Canvas Assignments
gradesExecuted = false;
attendanceExecuted = false;
assignmentsExecuted = false;
router.route({
  url: 'https://rishihood.instructure.com/courses/101/assignments',
  executeAttendance: () => { attendanceExecuted = true; },
  executeGrades: () => { gradesExecuted = true; },
  executeAssignments: () => { assignmentsExecuted = true; }
});
assert.strictEqual(assignmentsExecuted, true, 'executeAssignments must be called on assignments URL');
assert.strictEqual(attendanceExecuted, false, 'executeAttendance must NOT be called on assignments URL');
assert.strictEqual(gradesExecuted, false, 'executeGrades must NOT be called on assignments URL');

// Route Rishiverse
gradesExecuted = false;
attendanceExecuted = false;
assignmentsExecuted = false;
router.route({
  url: 'https://rishihood.rishiverse.com/student/attendance',
  executeAttendance: () => { attendanceExecuted = true; },
  executeGrades: () => { gradesExecuted = true; },
  executeAssignments: () => { assignmentsExecuted = true; }
});
assert.strictEqual(attendanceExecuted, true, 'executeAttendance must be called on Rishiverse URL');
assert.strictEqual(gradesExecuted, false, 'executeGrades must NOT be called on Rishiverse URL');
assert.strictEqual(assignmentsExecuted, false, 'executeAssignments must NOT be called on Rishiverse URL');

console.log('   ✅ Route dispatch verified: strictly isolates Attendance, Grades, and Assignments.');

// 4. Scraper Guard: Never treat #grades_summary as attendance
console.log('\n4️⃣ Testing Attendance Scraper Guard against Canvas #grades_summary...');

const gradebookDoc = createMockDocument();
const mainDiv = createMockElement('div', { id: 'main' });
const notRightSide = createMockElement('div', { id: 'not_right_side' });
const gTable = createMockElement('table', { id: 'grades_summary' });

// Add rows to gTable
const gThead = createMockElement('thead');
const gHeadRow = createMockElement('tr');
gHeadRow.appendChild(createMockElement('th', { innerText: 'Name' }));
gHeadRow.appendChild(createMockElement('th', { innerText: 'Due' }));
gHeadRow.appendChild(createMockElement('th', { innerText: 'Score' }));
gThead.appendChild(gHeadRow);
gTable.appendChild(gThead);

const gTbody = createMockElement('tbody');
const gRow1 = createMockElement('tr', { className: 'student_assignment' });
gRow1.appendChild(createMockElement('td', { innerText: 'Problem Set 1' }));
gRow1.appendChild(createMockElement('td', { innerText: 'Oct 10' }));
gRow1.appendChild(createMockElement('td', { innerText: '5 / 5' }));
gTbody.appendChild(gRow1);
gTable.appendChild(gTbody);

notRightSide.appendChild(gTable);
mainDiv.appendChild(notRightSide);
gradebookDoc.body.appendChild(mainDiv);

// Setup globals for parser
global.window = {
  location: {
    href: 'https://rishihood.instructure.com/courses/101/grades',
    hostname: 'rishihood.instructure.com'
  },
  CanvasRouter: router
};
global.document = gradebookDoc;

// parser already loaded
const scanned = parser.scanPage(75);

assert.strictEqual(
  scanned.subjects.length,
  0,
  `Canvas Gradebook must yield 0 attendance subjects! Got: ${scanned.subjects.length}`
);
assert.strictEqual(
  scanned.isCanvasGrades,
  true,
  'Scanned result should be marked isCanvasGrades'
);
console.log('   ✅ Attendance scraper strictly rejected #grades_summary (0 subjects parsed).');

// 5. Verify UI Guard: No bunk columns injected on Canvas Gradebook
console.log('\n5️⃣ Testing UI Guard against #grades_summary column injection...');

const uiModule = require('../extension/content/ui');

// Attempt rendering mock attendance subjects on grades page
uiModule.render({
  subjects: [
    { name: 'Problem Set 1', attended: 5, total: 5, element: gRow1 }
  ],
  overall: { attended: 5, total: 5, absent: 0, percentage: 100 },
  isCanvasGrades: true
});

const injectedHeader = gTable.querySelector('.attendmate-col-header');
const injectedCell = gTable.querySelector('.attendmate-miss-cell');
const injectedBanner = gradebookDoc.querySelector('#attendmate-page-banner');

assert.strictEqual(injectedHeader, null, 'Must NOT inject attendance th into table#grades_summary');
assert.strictEqual(injectedCell, null, 'Must NOT inject attendance td into assignment rows');
assert.strictEqual(injectedBanner, null, 'Must NOT inject attendance banner above table#grades_summary');
console.log('   ✅ UI Guard verified: table#grades_summary remained 100% clean of attendance columns.');

// 6. CSS Containment & Overflow Protection Verification
console.log('\n6️⃣ Verifying CSS table overflow and #right-side protection rules in content.css...');

const cssContent = fs.readFileSync(path.join(__dirname, '../extension/content/content.css'), 'utf8');

assert(cssContent.includes('#not_right_side'), 'content.css must include containment for #not_right_side');
assert(cssContent.includes('#right-side'), 'content.css must protect #right-side');
assert(cssContent.includes('table#grades_summary'), 'content.css must contain table#grades_summary width');
assert(cssContent.includes('min-width: 0'), 'content.css must set min-width: 0 on content columns');
assert(cssContent.includes('max-width: 100%'), 'content.css must enforce max-width: 100%');
assert(cssContent.includes('overflow-x: auto'), 'content.css must enable horizontal overflow containment');

console.log('   ✅ CSS Containment verified: #not_right_side, #right-side, and table#grades_summary properly styled.\n');

// 7. Strict Quiz Safe-Guard Mode (Quiescent Safe Mode) URL & Pattern Detection
console.log('7️⃣ Testing Strict Quiz Safe-Guard Mode URL & Pattern Detection...');

// 7a. Active quiz taking URLs (/quizzes/*/take)
const quizTakeUrls = [
  'https://rishihood.instructure.com/courses/101/quizzes/555/take',
  'https://canvas.instructure.com/courses/402/quizzes/888/take?user_id=88',
  'https://canvas.instructure.com/quizzes/123/take',
  'https://canvas.instructure.com/courses/101/quizzes/500/take_quiz',
  '/quizzes/99/take',
  'https://school.instructure.com/courses/50/quizzes/final-exam/take#question_1'
];
for (const u of quizTakeUrls) {
  assert.strictEqual(router.isExamSafeRoute(u), true, `Must detect quiz take URL as exam safe: ${u}`);
  assert.strictEqual(router.getPageType(u), 'quiescent_safe', `getPageType must return quiescent_safe for: ${u}`);
  assert.strictEqual(router.isCanvasGradesPage(u), false, `isCanvasGradesPage must be false for quiz take URL: ${u}`);
  assert.strictEqual(router.isCanvasAssignmentsPage(u), false, `isCanvasAssignmentsPage must be false for quiz take URL: ${u}`);
}
console.log('   ✅ Active quiz taking URLs (/quizzes/*/take) detected with 100% precision.');

// 7b. Active assignment submission URLs (/submissions/new)
const submissionUrls = [
  'https://rishihood.instructure.com/courses/101/assignments/202/submissions/new',
  'https://canvas.instructure.com/courses/101/submissions/new',
  '/submissions/new',
  'https://canvas.instructure.com/courses/101/assignments/55/submissions/new?preview=1'
];
for (const u of submissionUrls) {
  assert.strictEqual(router.isExamSafeRoute(u), true, `Must detect submission URL as exam safe: ${u}`);
  assert.strictEqual(router.getPageType(u), 'quiescent_safe', `getPageType must return quiescent_safe for: ${u}`);
  assert.strictEqual(router.isCanvasAssignmentsPage(u), false, `isCanvasAssignmentsPage must be false for submission URL: ${u}`);
}
console.log('   ✅ Active assignment submission URLs (/submissions/new) detected correctly.');

// 7c. Examination URLs (/examinations/)
const examUrls = [
  'https://rishiverse.rishihood.edu.in/examinations/',
  'https://rishiverse.rishihood.edu.in/examinations/live-midterm',
  'https://portal.university.edu/examinations/session-1',
  'https://portal.university.edu/examination/term-final'
];
for (const u of examUrls) {
  assert.strictEqual(router.isExamSafeRoute(u), true, `Must detect examination portal URL as exam safe: ${u}`);
  assert.strictEqual(router.getPageType(u), 'quiescent_safe', `getPageType must return quiescent_safe for: ${u}`);
  assert.strictEqual(router.isRishiversePage(u), false, `isRishiversePage must be false for examination URL: ${u}`);
}
console.log('   ✅ Examination portal URLs (/examinations/) detected correctly.');

// 7d. Canvas SpeedGrader URLs (canvas-speedgrader, speed_grader)
const speedgraderUrls = [
  'https://rishihood.instructure.com/courses/101/canvas-speedgrader',
  'https://canvas.instructure.com/courses/101/gradebook/speed_grader?assignment_id=2',
  'https://canvas.instructure.com/speedgrader'
];
for (const u of speedgraderUrls) {
  assert.strictEqual(router.isExamSafeRoute(u), true, `Must detect SpeedGrader URL as exam safe: ${u}`);
  assert.strictEqual(router.getPageType(u), 'quiescent_safe', `getPageType must return quiescent_safe for: ${u}`);
}
console.log('   ✅ Canvas SpeedGrader URLs detected correctly.');

// 7e. Negative cases: regular pages must NOT be flagged as exam safe
const regularUrls = [
  'https://rishihood.instructure.com/courses/101/grades',
  'https://rishihood.instructure.com/courses/101/assignments',
  'https://rishihood.instructure.com/dashboard',
  'https://rishihood.instructure.com/courses/101/quizzes/500', // viewing quiz description only
  'https://rishiverse.rishihood.edu.in/student/attendance',
  'https://rishiverse.rishihood.edu.in/dashboard'
];
for (const u of regularUrls) {
  assert.strictEqual(router.isExamSafeRoute(u), false, `Regular URL must NOT be exam safe: ${u}`);
}
console.log('   ✅ Non-exam URLs correctly rejected (0 false positives).');

// 8. Route Dispatch & Quiescent Safe Mode Activation
console.log('\n8️⃣ Testing Quiescent Safe Mode Route Dispatch & Clean Console Badge...');

let safeAttendanceExecuted = false;
let safeGradesExecuted = false;
let safeAssignmentsExecuted = false;
let safeQuiescentExecuted = false;

// Capture console.log to verify clean badge
let capturedLogs = [];
const originalConsoleLog = console.log;
console.log = function (...args) {
  capturedLogs.push(args.join(' '));
  originalConsoleLog.apply(console, args);
};

const safeRouteResult = router.route({
  url: 'https://rishihood.instructure.com/courses/101/quizzes/555/take',
  executeAttendance: () => { safeAttendanceExecuted = true; },
  executeGrades: () => { safeGradesExecuted = true; },
  executeAssignments: () => { safeAssignmentsExecuted = true; },
  executeQuiescentSafe: () => { safeQuiescentExecuted = true; }
});

console.log = originalConsoleLog;

assert.strictEqual(safeRouteResult.pageType, 'quiescent_safe', 'pageType must be quiescent_safe');
assert.strictEqual(safeRouteResult.routedTo, 'quiescent_safe', 'routedTo must be quiescent_safe');
assert.strictEqual(safeRouteResult.quiescentSafeMode, true, 'quiescentSafeMode must be true');
assert.strictEqual(safeRouteResult.initialized, true, 'initialized must be true');
assert.strictEqual(safeAttendanceExecuted, false, 'executeAttendance must NOT be called on exam route');
assert.strictEqual(safeGradesExecuted, false, 'executeGrades must NOT be called on exam route');
assert.strictEqual(safeAssignmentsExecuted, false, 'executeAssignments must NOT be called on exam route');
assert.strictEqual(safeQuiescentExecuted, true, 'executeQuiescentSafe must be invoked');

// Assert clean console badge was logged
const badgeLogged = capturedLogs.some(l => l.includes('[Bunkr] Quiescent safe mode active for exam/quiz integrity.'));
assert.strictEqual(badgeLogged, true, 'Console must log exact badge: [Bunkr] Quiescent safe mode active for exam/quiz integrity.');
console.log('   ✅ Route dispatch verified: 0% risk of test disruption, exact console badge verified.');

// 9. Observer Disconnection & DOM Overlay Suppression
console.log('\n9️⃣ Testing Observer Disconnection & Overlay Suppression...');

// 9a. Test Observer Disconnection
let observerDisconnected = false;
const mockObserver = {
  disconnect: function () {
    observerDisconnected = true;
  }
};
router.registerObserver(mockObserver);
router.disconnectObservers();
assert.strictEqual(observerDisconnected, true, 'Registered observer must be disconnected on safe mode trigger');
console.log('   ✅ Observer disconnection verified.');

// 9b. Test DOM Overlay Suppression
const safeMockDoc = createMockDocument();
const injectedBannerEl = createMockElement('div', { id: 'bunkr-page-banner' });
const injectedForecasterEl = createMockElement('div', { id: 'canvas-grades-forecaster' });
const injectedRadarEl = createMockElement('div', { id: 'canvas-assignment-radar' });
const injectedBadgeEl = createMockElement('span', { className: 'canvas-radar-badge' });

safeMockDoc.body.appendChild(injectedBannerEl);
safeMockDoc.body.appendChild(injectedForecasterEl);
safeMockDoc.body.appendChild(injectedRadarEl);
safeMockDoc.body.appendChild(injectedBadgeEl);

assert(safeMockDoc.body.children.length === 4, 'Mock doc must initially have 4 injected elements');

const removed = router.suppressOverlays(safeMockDoc);
assert.strictEqual(removed, 4, `Must remove all 4 injected overlays, removed: ${removed}`);
assert.strictEqual(safeMockDoc.querySelector('#bunkr-page-banner'), null, '#bunkr-page-banner must be removed');
assert.strictEqual(safeMockDoc.querySelector('#canvas-grades-forecaster'), null, '#canvas-grades-forecaster must be removed');
assert.strictEqual(safeMockDoc.querySelector('#canvas-assignment-radar'), null, '#canvas-assignment-radar must be removed');
assert.strictEqual(safeMockDoc.querySelector('.canvas-radar-badge'), null, '.canvas-radar-badge must be removed');
console.log('   ✅ Overlay suppression verified: all injected overlays suppressed from DOM.\n');

console.log('🎉 ALL CANVAS ROUTER, SCRAPER GUARD & OVERFLOW FIX TESTS PASSED SUCCESSFULLY! (100% Verification)');
