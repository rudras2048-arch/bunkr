// Bunkr 2.4.2 - Canvas & LMS Smart Router
// Routes between Rishiverse ERP Attendance, Canvas LMS Gradebook Forecaster, and Canvas Assignment Radar
// Strict Quiz Safe-Guard Mode for test taking, submissions, proctored exams, and SpeedGrader
// Prevents cross-system pollution (e.g. treating Canvas Gradebook #grades_summary as attendance)

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    const router = factory();
    root.CanvasRouter = root.BunkrRouter = router;
    if (typeof window !== 'undefined' && router.isExamSafeRoute()) {
      router.enterQuiescentSafeMode();
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  let isQuiescentSafeModeActive = false;
  let activeObservers = [];

  const OVERLAY_SELECTORS = [
    '#bunkr-root',
    '#attendmate-root',
    '#bunkr-page-banner',
    '#attendmate-page-banner',
    '#bunkr-drift-banner',
    '#attendmate-drift-banner',
    '#bunkr-safety-pill',
    '#attendmate-safety-pill',
    '#canvas-grades-forecaster',
    '#canvas-assignment-radar',
    '#canvas-files-modal',
    '#canvas-files-backdrop',
    '.canvas-files-pill',
    '#am-override-popover',
    '#am-popover-backdrop',
    '.canvas-grades-banner',
    '.canvas-radar-container',
    '.canvas-radar-badge',
    '.canvas-badge',
    '.bunkr-inline-badge',
    '.attendmate-inline-badge',
    '.bunkr-miss-badge',
    '.attendmate-miss-badge',
    '.attendmate-col-header',
    '.attendmate-miss-cell',
    '.attendmate-bunk-cell',
    '[data-bunkr-injected]',
    '[data-attendmate-injected]'
  ];

  /**
   * Helper to resolve current URL safely across browser and Node.js
   */
  function resolveUrl(url) {
    if (url) return String(url);
    if (typeof window !== 'undefined' && window.location && window.location.href) {
      return window.location.href;
    }
    return '';
  }

  /**
   * Helper to resolve document safely across browser and Node.js
   */
  function resolveDoc(doc) {
    if (doc) return doc;
    if (typeof document !== 'undefined') {
      return document;
    }
    return null;
  }

  /**
   * Check if URL or DOM represents an active exam, quiz taking, or proctored session
   * Matches:
   * - /quizzes/.../take
   * - /submissions/new
   * - /examinations/
   * - canvas-speedgrader / speed_grader
   */
  function isExamSafeRoute(url, doc) {
    const u = resolveUrl(url);

    if (u) {
      // 1. Active Quiz Taking: /quizzes/*/take or /quizzes/take
      if (/\/quizzes\/(?:[^\/]+\/)?take(?:_quiz)?(?:\b|\/|\?|#|$)/i.test(u)) {
        return true;
      }

      // 2. Active assignment submission: /submissions/new
      if (/\/submissions\/new(?:\b|\/|\?|#|$)/i.test(u)) {
        return true;
      }

      // 3. Proctored examination portals: /examinations/
      if (/\/examinations?(?:\/|\b|$|\?|#)/i.test(u)) {
        return true;
      }

      // 4. Canvas SpeedGrader: canvas-speedgrader, speed_grader, speedgrader
      if (/(?:canvas-speedgrader|speed_grader|speedgrader)/i.test(u)) {
        return true;
      }
    }

    // 5. DOM-based examination markers
    const d = resolveDoc(doc);
    if (d) {
      try {
        if (
          d.querySelector('form#submit_quiz_form') !== null ||
          d.querySelector('.quiz-submission') !== null ||
          d.querySelector('#speedgrader_iframe') !== null ||
          d.querySelector('[data-proctored="true"]') !== null
        ) {
          return true;
        }
      } catch (e) {}
    }

    return false;
  }

  /**
   * Register a MutationObserver to be safely disconnected upon entering safe mode
   */
  function registerObserver(obs) {
    if (obs && typeof obs.disconnect === 'function') {
      if (!activeObservers.includes(obs)) {
        activeObservers.push(obs);
      }
    }
  }

  /**
   * Disconnect all active DOM observers
   */
  function disconnectObservers() {
    // 1. Registered observers
    for (const obs of activeObservers) {
      try {
        obs.disconnect();
      } catch (e) {}
    }
    activeObservers = [];

    // 2. Global window observers if attached
    if (typeof window !== 'undefined') {
      if (window.__bunkrObserver && typeof window.__bunkrObserver.disconnect === 'function') {
        try { window.__bunkrObserver.disconnect(); } catch (e) {}
        window.__bunkrObserver = null;
      }
      if (window.__attendmateObserver && typeof window.__attendmateObserver.disconnect === 'function') {
        try { window.__attendmateObserver.disconnect(); } catch (e) {}
        window.__attendmateObserver = null;
      }
      if (Array.isArray(window.__bunkrObservers)) {
        for (const obs of window.__bunkrObservers) {
          try { obs.disconnect(); } catch (e) {}
        }
        window.__bunkrObservers = [];
      }
    }
  }

  /**
   * Suppress and remove all injected overlays from DOM
   */
  function suppressOverlays(doc) {
    const d = resolveDoc(doc);
    if (!d) return 0;
    let removedCount = 0;

    for (const selector of OVERLAY_SELECTORS) {
      try {
        const elements = d.querySelectorAll ? d.querySelectorAll(selector) : [];
        if (elements && elements.length) {
          for (let i = 0; i < elements.length; i++) {
            const el = elements[i];
            if (el) {
              if (typeof el.remove === 'function') {
                el.remove();
                removedCount++;
              } else if (el.parentNode && typeof el.parentNode.removeChild === 'function') {
                el.parentNode.removeChild(el);
                removedCount++;
              }
            }
          }
        }
      } catch (e) {}
    }

    return removedCount;
  }

  /**
   * Immediately enters Quiescent Safe Mode:
   * - Disconnects all DOM observers
   * - Suppresses all injected overlays
   * - Logs clean console badge: [Bunkr] Quiescent safe mode active for exam/quiz integrity.
   * - Guarantees 0% risk of test disruption or submission interference
   */
  function enterQuiescentSafeMode(doc) {
    isQuiescentSafeModeActive = true;
    if (typeof window !== 'undefined') {
      window.__bunkrQuiescentSafeMode = true;
      window.__attendmateQuiescentSafeMode = true;
    }

    // Clean console badge as specified
    console.log('[Bunkr] Quiescent safe mode active for exam/quiz integrity.');

    // Disconnect all DOM observers
    disconnectObservers();

    // Suppress all injected overlays
    suppressOverlays(doc);

    return true;
  }

  function isQuiescentActive() {
    return isQuiescentSafeModeActive;
  }

  function resetQuiescentSafeMode() {
    isQuiescentSafeModeActive = false;
    activeObservers = [];
    if (typeof window !== 'undefined') {
      window.__bunkrQuiescentSafeMode = false;
      window.__attendmateQuiescentSafeMode = false;
    }
  }

  /**
   * Check if current domain/URL is Canvas LMS (Instructure)
   */
  function isCanvasHost(url) {
    const u = resolveUrl(url).toLowerCase();
    return (
      u.includes('instructure.com') ||
      u.includes('canvas') ||
      u.includes('canvas_demo') ||
      u.includes('canvas_grades')
    );
  }

  /**
   * Check if current domain/URL is Rishiverse ERP
   */
  function isRishiverseHost(url) {
    const u = resolveUrl(url).toLowerCase();
    return (
      u.includes('rishiverse') ||
      u.includes('rishihood.edu.in') ||
      u.includes('rishiverse_demo')
    );
  }

  /**
   * Check if page is Canvas Grades (*://*.instructure.com/courses/[id]/grades)
   */
  function isCanvasGradesPage(url, doc) {
    const u = resolveUrl(url);
    const d = resolveDoc(doc);

    // Exam routes take strict precedence: never run grades engine on exam/quiz
    if (isExamSafeRoute(u, d)) return false;

    // 1. Strict URL matching for Canvas Grades
    const isGradesUrl =
      /\/courses\/[^\/]+\/grades(?:\b|\/|\?|#|$)/i.test(u) ||
      (isCanvasHost(u) && /\/grades(?:\b|\/|\?|#|$)/i.test(u));

    if (isGradesUrl) return true;

    // 2. DOM-based matching if URL is a local demo or generic file
    if (d) {
      const hasGradesSummary =
        d.querySelector('#grades_summary') !== null ||
        d.querySelector('table#grades_summary') !== null;
      if (hasGradesSummary) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if page is Canvas Assignments or Dashboard
   * (*://*.instructure.com/courses/[id]/assignments or dashboard)
   */
  function isCanvasAssignmentsPage(url, doc) {
    const u = resolveUrl(url);
    const d = resolveDoc(doc);

    // Exam routes take strict precedence: never run assignments engine on exam/quiz
    if (isExamSafeRoute(u, d)) return false;

    // If it's a grades page, it's NOT an assignments page
    if (isCanvasGradesPage(u, d)) return false;

    // 1. Check Course Assignments URL
    const isAssignmentsUrl =
      /\/courses\/[^\/]+\/assignments(?:\b|\/|\?|#|$)/i.test(u) ||
      (isCanvasHost(u) && /\/assignments(?:\b|\/|\?|#|$)/i.test(u));

    if (isAssignmentsUrl) return true;

    // 2. Check Canvas Dashboard URL
    if (isCanvasHost(u)) {
      try {
        const parsed = new URL(u, 'https://instructure.com');
        const pathname = parsed.pathname;
        if (
          pathname === '/' ||
          pathname === '/dashboard' ||
          pathname.startsWith('/dashboard/') ||
          pathname === '/courses' ||
          pathname === '/courses/'
        ) {
          return true;
        }
      } catch (e) {
        if (u.includes('/dashboard') || u.endsWith('.com/') || u.endsWith('.com')) {
          return true;
        }
      }
    }

    // 3. DOM-based matching
    if (d) {
      if (
        d.querySelector('.assignment-list') !== null ||
        d.querySelector('#assignments') !== null ||
        d.querySelector('#dashboard') !== null ||
        d.querySelector('.ic-DashboardCard') !== null ||
        d.querySelector('.ic-DashboardCard__header') !== null
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if page is Canvas Roll Call / Attendance (if distinct from gradebook)
   */
  function isCanvasAttendancePage(url, doc) {
    const u = resolveUrl(url);
    const d = resolveDoc(doc);

    if (isExamSafeRoute(u, d)) return false;
    if (isCanvasGradesPage(u, d)) return false;

    if (isCanvasHost(u) && /\/courses\/[^\/]+\/attendance(?:\b|\/|\?|#|$)/i.test(u)) {
      return true;
    }

    if (d && d.querySelector('#attendance_summary') && !d.querySelector('#grades_summary')) {
      return true;
    }

    return false;
  }

  /**
   * Check if page is Rishiverse ERP
   */
  function isRishiversePage(url, doc) {
    const u = resolveUrl(url);
    const d = resolveDoc(doc);

    if (isExamSafeRoute(u, d)) return false;
    if (isCanvasGradesPage(u, d) || isCanvasAssignmentsPage(u, d)) {
      return false;
    }

    if (isRishiverseHost(u)) return true;

    // If DOM has typical Rishiverse cards or attendance tables and not Canvas
    if (d) {
      const hasRishiverseTable = d.querySelector('#attendance_summary, table[data-testid="attendance-table"]');
      if (hasRishiverseTable && !d.querySelector('#grades_summary')) {
        return true;
      }
    }

    return true; // Default fallback for attendance
  }

  /**
   * Determine exact page classification
   */
  function getPageType(url, doc) {
    const u = resolveUrl(url);
    const d = resolveDoc(doc);

    // 1. Quiescent Safe Mode check has highest priority
    if (isExamSafeRoute(u, d)) return 'quiescent_safe';

    if (isCanvasGradesPage(u, d)) return 'canvas_grades';
    if (isCanvasAssignmentsPage(u, d)) return 'canvas_assignments';
    if (isCanvasAttendancePage(u, d)) return 'canvas_attendance';
    if (isRishiversePage(u, d)) return 'rishiverse';
    return 'other';
  }

  /**
   * Safely initialize Canvas Grades Suite
   */
  function initializeCanvasGrades() {
    if (typeof window === 'undefined') return false;
    if (isExamSafeRoute()) return false;

    const grades = window.CanvasGrades;
    if (grades) {
      if (typeof grades.init === 'function') {
        grades.init();
        return true;
      }
      if (typeof grades.run === 'function') {
        grades.run();
        return true;
      }
      return true;
    }

    // If script is still loading asynchronously, poll briefly
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (window.CanvasGrades) {
        clearInterval(interval);
        if (isExamSafeRoute()) return;
        if (typeof window.CanvasGrades.init === 'function') {
          window.CanvasGrades.init();
        } else if (typeof window.CanvasGrades.run === 'function') {
          window.CanvasGrades.run();
        }
      } else if (attempts >= 30) {
        clearInterval(interval);
      }
    }, 100);

    return false;
  }

  /**
   * Safely initialize Canvas Assignments & Radar Suite
   */
  function initializeCanvasAssignments() {
    if (typeof window === 'undefined') return false;
    if (isExamSafeRoute()) return false;

    const assignments = window.CanvasAssignments;
    if (assignments) {
      if (typeof assignments.init === 'function') {
        assignments.init();
        return true;
      }
      if (typeof assignments.run === 'function') {
        assignments.run();
        return true;
      }
      return true;
    }

    // If script is still loading asynchronously, poll briefly
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (window.CanvasAssignments) {
        clearInterval(interval);
        if (isExamSafeRoute()) return;
        if (typeof window.CanvasAssignments.init === 'function') {
          window.CanvasAssignments.init();
        } else if (typeof window.CanvasAssignments.run === 'function') {
          window.CanvasAssignments.run();
        }
      } else if (attempts >= 30) {
        clearInterval(interval);
      }
    }, 100);

    return false;
  }

  /**
   * Core routing dispatcher
   */
  function route(options = {}) {
    const url = options.url || resolveUrl();
    const doc = options.doc || resolveDoc();
    const pageType = getPageType(url, doc);

    const result = {
      pageType,
      routedTo: null,
      initialized: false,
      quiescentSafeMode: false
    };

    switch (pageType) {
      case 'quiescent_safe':
      case 'exam_safe':
        result.routedTo = 'quiescent_safe';
        result.quiescentSafeMode = true;
        result.initialized = enterQuiescentSafeMode(doc);
        if (typeof options.executeQuiescentSafe === 'function') {
          options.executeQuiescentSafe();
        }
        break;

      case 'canvas_grades':
        result.routedTo = 'grades';
        if (typeof options.executeGrades === 'function') {
          options.executeGrades();
          result.initialized = true;
        } else {
          result.initialized = initializeCanvasGrades();
        }
        break;

      case 'canvas_assignments':
        result.routedTo = 'assignments';
        if (typeof options.executeAssignments === 'function') {
          options.executeAssignments();
          result.initialized = true;
        } else {
          result.initialized = initializeCanvasAssignments();
        }
        break;

      case 'rishiverse':
      case 'canvas_attendance':
        result.routedTo = 'attendance';
        if (typeof options.executeAttendance === 'function') {
          options.executeAttendance();
          result.initialized = true;
        }
        break;

      default:
        result.routedTo = 'none';
        break;
    }

    return result;
  }

  /**
   * Automatically route when page is loaded
   */
  function init() {
    if (typeof document === 'undefined') return;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => route());
    } else {
      route();
    }
  }

  return {
    isCanvasHost,
    isRishiverseHost,
    isCanvasGradesPage,
    isCanvasAssignmentsPage,
    isCanvasAttendancePage,
    isRishiversePage,
    isExamSafeRoute,
    isQuiescentSafeRoute: isExamSafeRoute,
    enterQuiescentSafeMode,
    suppressOverlays,
    disconnectObservers,
    registerObserver,
    isQuiescentActive,
    resetQuiescentSafeMode,
    getPageType,
    initializeCanvasGrades,
    initializeCanvasAssignments,
    route,
    init
  };
});
