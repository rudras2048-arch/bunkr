// Bunkr 2.4.1 - Content Script Orchestrator
// Resilience, Circuit Breaker Safety Net, Drift Detection, and Plain-English Freshness

(function () {
  'use strict';

  // Strict Quiz Safe-Guard Mode check: abort immediately on active exams/quizzes
  const earlyRouter = typeof window !== 'undefined' && (window.CanvasRouter || window.BunkrRouter);
  const isExamPage = (earlyRouter && typeof earlyRouter.isExamSafeRoute === 'function' && earlyRouter.isExamSafeRoute()) ||
    (typeof window !== 'undefined' && window.location && window.location.href && (
      /\/quizzes\/(?:[^\/]+\/)?take(?:_quiz)?(?:\b|\/|\?|#|$)/i.test(window.location.href) ||
      /\/submissions\/new(?:\b|\/|\?|#|$)/i.test(window.location.href) ||
      /\/examinations?(?:\/|\b|$|\?|#)/i.test(window.location.href) ||
      /(?:canvas-speedgrader|speed_grader|speedgrader)/i.test(window.location.href)
    ));

  if (isExamPage) {
    if (earlyRouter && typeof earlyRouter.enterQuiescentSafeMode === 'function') {
      earlyRouter.enterQuiescentSafeMode();
    } else {
      console.log('[Bunkr] Quiescent safe mode active for exam/quiz integrity.');
    }
    return;
  }

  let currentTarget = 75;
  let consecutiveErrors = 0;
  const MAX_CONSECUTIVE_ERRORS = 3;
  let isCircuitBroken = false;
  let debounceTimer = null;
  let observer = null;

  // Retrieve stored target and custom timetable
  try {
    const saved = localStorage.getItem('bunkr_target_percentage') || localStorage.getItem('attendmate_target_percentage');
    if (saved) currentTarget = parseFloat(saved) || 75;
  } catch (e) {}

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['customTimetable'], (res) => {
      const engine = window.BunkrEngine || window.AttendMateEngine;
      if (engine && typeof engine.setActiveTimetable === 'function') {
        engine.setActiveTimetable(res.customTimetable || null);
      }
      const ui = window.BunkrUI || window.AttendMateUI;
      if (ui && typeof ui.updateTimetable === 'function') {
        ui.updateTimetable(res.customTimetable || null);
      }
    });

    if (chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local' && changes.customTimetable) {
          const engine = window.BunkrEngine || window.AttendMateEngine;
          if (engine && typeof engine.setActiveTimetable === 'function') {
            engine.setActiveTimetable(changes.customTimetable.newValue || null);
          }
          const ui = window.BunkrUI || window.AttendMateUI;
          if (ui && typeof ui.updateTimetable === 'function') {
            ui.updateTimetable(changes.customTimetable.newValue || null);
          }
          const rescan = window.BunkrRescan || window.AttendMateRescan;
          if (rescan) rescan();
        }
      });
    }
  }

  // Helper to load previous good scrape
  function getLastGoodScrape() {
    try {
      const raw = localStorage.getItem('bunkr_last_good_scrape') || localStorage.getItem('attendmate_last_good_scrape');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function saveLastGoodScrape(data) {
    try {
      localStorage.setItem('bunkr_last_good_scrape', JSON.stringify(data));
      localStorage.setItem('attendmate_last_good_scrape', JSON.stringify(data));
    } catch (e) {}
  }

  /**
   * Drift Detection Algorithm
   */
  function checkScrapeDrift(prev, curr) {
    if (!curr || !Array.isArray(curr.subjects) || curr.subjects.length === 0) {
      if (prev && Array.isArray(prev.subjects) && prev.subjects.length > 0) {
        return {
          drifted: true,
          reason: 'Scrape returned 0 courses. Portal layout may have changed.',
          type: 'empty_scrape'
        };
      }
      return { drifted: false };
    }

    if (!prev || !Array.isArray(prev.subjects) || prev.subjects.length === 0) {
      return { drifted: false };
    }

    const prevSubjects = prev.subjects;
    const currSubjects = curr.subjects;

    // 1. Sharp drop in subjects count
    if (prevSubjects.length >= 3 && currSubjects.length < Math.ceil(prevSubjects.length / 2)) {
      return {
        drifted: true,
        reason: `Course count decreased from ${prevSubjects.length} to ${currSubjects.length}.`,
        type: 'course_count_drop'
      };
    }

    // 2. Value regressions or abnormal leaps
    const prevMap = new Map();
    for (const s of prevSubjects) {
      const key = (s.name || s.code || '').trim().toLowerCase();
      if (key) prevMap.set(key, s);
    }

    for (const s of currSubjects) {
      const key = (s.name || s.code || '').trim().toLowerCase();
      const p = prevMap.get(key);
      if (!p) continue;

      if (p.total > 0 && s.total < p.total) {
        return {
          drifted: true,
          reason: `Classes held for "${s.name}" dropped from ${p.total} to ${s.total}.`,
          type: 'held_dropped'
        };
      }
      if (p.attended > 0 && s.attended < p.attended) {
        return {
          drifted: true,
          reason: `Attended classes for "${s.name}" dropped from ${p.attended} to ${s.attended}.`,
          type: 'attended_dropped'
        };
      }
      if (p.total >= 10 && s.total > p.total * 1.5) {
        return {
          drifted: true,
          reason: `Conducted classes for "${s.name}" jumped sharply from ${p.total} to ${s.total}.`,
          type: 'sharp_jump'
        };
      }
    }

    return { drifted: false };
  }

  /**
   * Main Scan and Render with Circuit Breaker
   */
  function runScanAndRender() {
    if (isCircuitBroken) return;

    // Check Canvas Routing: quiescent safe mode, grades or assignments
    const router = window.CanvasRouter || window.BunkrRouter;
    if (router) {
      if (typeof router.isExamSafeRoute === 'function' && router.isExamSafeRoute()) {
        if (typeof router.enterQuiescentSafeMode === 'function') {
          router.enterQuiescentSafeMode();
        }
        if (observer) observer.disconnect();
        clearTimeout(debounceTimer);
        removeSafetyPill();
        return;
      }
      if (typeof router.getPageType === 'function') {
        const pageType = router.getPageType();
        if (pageType === 'quiescent_safe') {
          if (typeof router.enterQuiescentSafeMode === 'function') {
            router.enterQuiescentSafeMode();
          }
          if (observer) observer.disconnect();
          clearTimeout(debounceTimer);
          removeSafetyPill();
          return;
        }
        if (pageType === 'canvas_grades') {
          router.route();
          consecutiveErrors = 0;
          removeSafetyPill();
          return;
        }
        if (pageType === 'canvas_assignments') {
          router.route();
          consecutiveErrors = 0;
          removeSafetyPill();
          return;
        }
      }
    } else {
      // Direct Fallback if router not yet loaded: check exam safe route directly
      if (typeof window !== 'undefined' && window.location && window.location.href && (
        /\/quizzes\/(?:[^\/]+\/)?take(?:_quiz)?(?:\b|\/|\?|#|$)/i.test(window.location.href) ||
        /\/submissions\/new(?:\b|\/|\?|#|$)/i.test(window.location.href) ||
        /\/examinations?(?:\/|\b|$|\?|#)/i.test(window.location.href) ||
        /(?:canvas-speedgrader|speed_grader|speedgrader)/i.test(window.location.href)
      )) {
        console.log('[Bunkr] Quiescent safe mode active for exam/quiz integrity.');
        if (observer) observer.disconnect();
        clearTimeout(debounceTimer);
        removeSafetyPill();
        return;
      }
      if (typeof window !== 'undefined' && (
        /\/courses\/[^\/]+\/grades(?:\b|\/|\?|#|$)/i.test(window.location.href) ||
        Boolean(document.querySelector('table#grades_summary, #grades_summary'))
      )) {
        if (window.CanvasGrades) {
          if (typeof window.CanvasGrades.init === 'function') window.CanvasGrades.init();
          else if (typeof window.CanvasGrades.run === 'function') window.CanvasGrades.run();
        }
        consecutiveErrors = 0;
        removeSafetyPill();
        return;
      }
      if (typeof window !== 'undefined' && (
        /\/courses\/[^\/]+\/assignments(?:\b|\/|\?|#|$)/i.test(window.location.href)
      )) {
        if (window.CanvasAssignments) {
          if (typeof window.CanvasAssignments.init === 'function') window.CanvasAssignments.init();
          else if (typeof window.CanvasAssignments.run === 'function') window.CanvasAssignments.run();
        }
        consecutiveErrors = 0;
        removeSafetyPill();
        return;
      }
    }

    const parser = window.BunkrParser || window.AttendMateParser;
    const ui = window.BunkrUI || window.AttendMateUI;
    if (!parser || !ui) return;

    try {
      const scannedResult = parser.scanPage(currentTarget);
      const prevGood = getLastGoodScrape();
      const drift = checkScrapeDrift(prevGood, scannedResult);

      let resultToRender = scannedResult;

      if (drift.drifted) {
        console.warn('[Bunkr] Scrape drift detected:', drift.reason);
        // Do NOT overwrite last good scrape. Use last good data with drift metadata attached.
        if (prevGood) {
          resultToRender = {
            ...prevGood,
            drift
          };
        } else {
          resultToRender.drift = drift;
        }
      } else if (scannedResult && scannedResult.subjects && scannedResult.subjects.length > 0) {
        // Successful clean scrape
        scannedResult.drift = { drifted: false };
        saveLastGoodScrape(scannedResult);
        resultToRender = scannedResult;
      }

      if (resultToRender) {
        ui.render(resultToRender);
      }

      // Successful cycle resets error counter
      consecutiveErrors = 0;
      removeSafetyPill();

      // Notify background service worker
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage && resultToRender?.subjects?.length > 0) {
        try {
          chrome.runtime.sendMessage({
            type: 'ATTENDANCE_PARSED',
            data: {
              subjects: resultToRender.subjects.map((s) => ({
                id: s.id,
                name: s.name,
                code: s.code,
                attended: s.attended,
                total: s.total,
                absent: s.absent,
                percentage: s.percentage,
                bunkable: s.bunkable,
                needed: s.needed,
                color: s.color,
                status: s.status,
                isManualOverride: Boolean(s.isManualOverride)
              })),
              overall: resultToRender.overall,
              url: resultToRender.url,
              domain: resultToRender.domain,
              timestamp: resultToRender.timestamp,
              drift: resultToRender.drift
            }
          });
        } catch (err) {}
      }
    } catch (err) {
      consecutiveErrors++;
      window.__bunkrErrors = window.__attendmateErrors = consecutiveErrors;
      console.warn(`[Bunkr Safety Net] Non-fatal execution error (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}):`, err.message);

      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        tripCircuitBreaker(err);
      } else {
        // Exponential backoff retry
        setTimeout(runScanAndRender, consecutiveErrors * 3000);
      }
    }
  }

  /**
   * Safety Net: Graceful Degradation & Host Page Protection
   */
  function tripCircuitBreaker(lastError) {
    isCircuitBroken = true;
    console.error('[Bunkr Safety Net] Circuit breaker tripped. Bunkr paused to protect host page stability.');

    if (observer) {
      observer.disconnect();
    }
    clearTimeout(debounceTimer);

    // Show quiet, non-intrusive safety pill
    let pill = document.getElementById('bunkr-safety-pill') || document.getElementById('attendmate-safety-pill');
    if (!pill) {
      pill = document.createElement('div');
      pill.id = 'bunkr-safety-pill';
      pill.className = 'attendmate-safety-pill'; // Maintain backward compatibility
      pill.innerHTML = `
        <span>Bunkr paused to protect page stability</span>
        <button id="am-retry-circuit-btn">Retry</button>
      `;
      document.body.appendChild(pill);

      pill.querySelector('#am-retry-circuit-btn').addEventListener('click', () => {
        isCircuitBroken = false;
        consecutiveErrors = 0;
        removeSafetyPill();
        setupObserver();
        runScanAndRender();
      });
    }
  }

  function removeSafetyPill() {
    const pill = document.getElementById('bunkr-safety-pill') || document.getElementById('attendmate-safety-pill');
    if (pill) pill.remove();
  }

  function setupObserver() {
    if (observer) observer.disconnect();

    const router = window.CanvasRouter || window.BunkrRouter;
    if ((router && typeof router.isExamSafeRoute === 'function' && router.isExamSafeRoute()) ||
        (typeof window !== 'undefined' && window.__bunkrQuiescentSafeMode)) {
      return;
    }

    observer = new MutationObserver((mutations) => {
      let shouldScan = false;
      for (const mutation of mutations) {
        if (mutation.target && (
          mutation.target.id === 'bunkr-root' ||
          mutation.target.id === 'attendmate-root' ||
          mutation.target.id === 'bunkr-page-banner' ||
          mutation.target.id === 'attendmate-page-banner' ||
          mutation.target.id === 'bunkr-drift-banner' ||
          mutation.target.id === 'attendmate-drift-banner' ||
          mutation.target.id?.includes('canvas-grades') ||
          mutation.target.id?.includes('canvas-radar') ||
          mutation.target.id?.includes('canvas-forecaster') ||
          mutation.target.id === 'am-override-popover' ||
          mutation.target.id === 'am-popover-backdrop' ||
          (mutation.target.closest && (
            mutation.target.closest('#bunkr-root') ||
            mutation.target.closest('#attendmate-root') ||
            mutation.target.closest('#canvas-grades-forecaster') ||
            mutation.target.closest('#canvas-assignment-radar') ||
            mutation.target.closest('.canvas-grades-banner')
          )) ||
          (mutation.target.classList && (
            mutation.target.classList.contains('bunkr-inline-badge') ||
            mutation.target.classList.contains('attendmate-inline-badge') ||
            mutation.target.classList.contains('bunkr-miss-badge') ||
            mutation.target.classList.contains('attendmate-miss-badge') ||
            mutation.target.classList.contains('canvas-badge') ||
            mutation.target.classList.contains('canvas-radar-badge')
          ))
        )) {
          continue;
        }
        shouldScan = true;
        break;
      }

      if (shouldScan && !isCircuitBroken) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(runScanAndRender, 1000);
      }
    });

    if (typeof window !== 'undefined') {
      window.__bunkrObserver = observer;
    }
    if (router && typeof router.registerObserver === 'function') {
      router.registerObserver(observer);
    }

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // Global rescan function
  window.BunkrRescan = window.AttendMateRescan = () => {
    isCircuitBroken = false;
    consecutiveErrors = 0;
    removeSafetyPill();
    runScanAndRender();
  };

  // Initial Scan
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runScanAndRender);
  } else {
    runScanAndRender();
  }

  // Setup DOM observer
  setupObserver();

  // Staggered retries for Next.js hydration
  setTimeout(runScanAndRender, 1000);
  setTimeout(runScanAndRender, 2500);
  setTimeout(runScanAndRender, 5000);

  // Listen for messages from Extension Popup
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      const rescan = window.BunkrRescan || window.AttendMateRescan;
      const ui = window.BunkrUI || window.AttendMateUI;
      if (message.type === 'TRIGGER_SCAN') {
        if (rescan) rescan();
        const canvas = window.BunkrCanvas || window.AttendMateCanvas;
        if (canvas) canvas.run();
        sendResponse({ status: 'scanned' });
      } else if (message.type === 'SET_TARGET') {
        currentTarget = message.targetPercentage || 75;
        if (ui) {
          ui.setTargetPercentage(currentTarget);
        }
        sendResponse({ status: 'target_updated' });
      } else if (message.type === 'RELOAD_OVERRIDES') {
        if (rescan) rescan();
        sendResponse({ status: 'overrides_reloaded' });
      }
    });
  }
})();
