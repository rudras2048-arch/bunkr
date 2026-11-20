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

  let lastLiveScrape = null;

  function isDomElement(el) {
    return Boolean(
      el &&
      typeof el === 'object' &&
      el.nodeType === 1 &&
      typeof el.closest === 'function' &&
      typeof el.querySelector === 'function'
    );
  }

  function sanitizeScrapeForStorage(data) {
    if (!data || typeof data !== 'object') return data;
    return {
      ...data,
      subjects: Array.isArray(data.subjects)
        ? data.subjects.map(({ element, badgeTargetElement, ...serializable }) => serializable)
        : []
    };
  }

  function detectActiveSemesterKey() {
    try {
      const candidates = Array.from(document.querySelectorAll('select, button, [role="combobox"], [data-semester]'));
      for (const el of candidates) {
        if (el.closest && (el.closest('#attendmate-page-banner') || el.closest('#attendmate-drift-banner') || el.closest('#am-trip-popover'))) continue;
        let text = '';
        if (el.tagName === 'SELECT' && el.options && el.selectedIndex >= 0) {
          text = el.options[el.selectedIndex].text || el.value || '';
        } else {
          text = (el.getAttribute && el.getAttribute('data-semester')) || el.innerText || el.textContent || '';
        }
        const match = String(text).match(/\b(sem(?:ester)?\s*\d+|term\s*\d+)\b/i);
        if (match) {
          return match[1].toLowerCase().replace(/\s+/g, '_');
        }
      }
    } catch (e) {}
    return 'default';
  }

  function getScopedStorageKeys() {
    const semKey = detectActiveSemesterKey();
    if (semKey === 'default') {
      return {
        primary: 'bunkr_last_good_scrape',
        legacy: 'attendmate_last_good_scrape',
        semesterKey: semKey
      };
    }
    return {
      primary: `bunkr_last_good_scrape_${semKey}`,
      legacy: `attendmate_last_good_scrape_${semKey}`,
      fallback: 'bunkr_last_good_scrape',
      semesterKey: semKey
    };
  }

  // Helper to load previous good scrape (scoped by active semester when detected)
  function getLastGoodScrape() {
    try {
      const keys = getScopedStorageKeys();
      let raw = localStorage.getItem(keys.primary) || localStorage.getItem(keys.legacy);
      // Only fall back to legacy global key when semester is Semester 1 / default
      if (!raw && keys.fallback && (keys.semesterKey === 'semester_1' || keys.semesterKey === 'sem_1')) {
        raw = localStorage.getItem(keys.fallback) || localStorage.getItem('attendmate_last_good_scrape');
      }
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.subjects)) {
        // Guard against legacy cached snapshots containing serialized `{}` DOM stubs
        parsed.subjects = parsed.subjects.map((s) => {
          if (!s || typeof s !== 'object') return s;
          const cleaned = { ...s };
          if (!isDomElement(cleaned.element)) delete cleaned.element;
          if (!isDomElement(cleaned.badgeTargetElement)) delete cleaned.badgeTargetElement;
          return cleaned;
        });
      }
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function saveLastGoodScrape(data) {
    try {
      const keys = getScopedStorageKeys();
      const sanitized = sanitizeScrapeForStorage({ ...data, semesterKey: keys.semesterKey });
      const serialized = JSON.stringify(sanitized);
      localStorage.setItem(keys.primary, serialized);
      localStorage.setItem(keys.legacy, serialized);
      if (keys.semesterKey === 'default' || keys.semesterKey === 'semester_1' || keys.semesterKey === 'sem_1') {
        localStorage.setItem('bunkr_last_good_scrape', serialized);
        localStorage.setItem('attendmate_last_good_scrape', serialized);
      }
    } catch (e) {}
  }

  function attachLiveElements(cachedSubjects, liveSubjects) {
    if (!Array.isArray(cachedSubjects)) return [];
    const liveByName = new Map();
    const liveByCode = new Map();
    if (Array.isArray(liveSubjects)) {
      for (const ls of liveSubjects) {
        const nKey = (ls.name || '').trim().toLowerCase();
        const cKey = (ls.code || '').trim().toLowerCase();
        if (nKey) liveByName.set(nKey, ls);
        if (cKey) liveByCode.set(cKey, ls);
      }
    }

    return cachedSubjects.map((s) => {
      const nKey = (s.name || '').trim().toLowerCase();
      const cKey = (s.code || '').trim().toLowerCase();
      const liveMatch = (nKey && liveByName.get(nKey)) || (cKey && liveByCode.get(cKey)) || null;
      const next = { ...s };
      if (liveMatch && isDomElement(liveMatch.element)) {
        next.element = liveMatch.element;
      } else if (!isDomElement(next.element)) {
        delete next.element;
      }
      if (liveMatch && isDomElement(liveMatch.badgeTargetElement)) {
        next.badgeTargetElement = liveMatch.badgeTargetElement;
      } else if (!isDomElement(next.badgeTargetElement)) {
        delete next.badgeTargetElement;
      }
      return next;
    });
  }

  /**
   * Drift Detection Algorithm
   * Tolerates minor 1-2 lecture faculty corrections/cancellations while catching
   * real portal layout breakages and major data regressions.
   */
  function checkScrapeDrift(prev, curr) {
    if (!curr || !Array.isArray(curr.subjects) || curr.subjects.length === 0) {
      if (prev && Array.isArray(prev.subjects) && prev.subjects.length > 0) {
        return {
          drifted: true,
          reason: 'Scrape returned 0 courses. Portal layout may have changed.',
          type: 'empty_scrape',
          canAcceptLive: false
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
        type: 'course_count_drop',
        canAcceptLive: true
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
        const heldDrop = p.total - s.total;
        const heldDropRatio = heldDrop / p.total;
        // Tolerate minor faculty adjustments (1-2 cancelled/reclassified classes <= 15%)
        if (s.total === 0 || (heldDrop >= 3 && heldDropRatio > 0.15)) {
          return {
            drifted: true,
            reason: `Classes held for "${s.name}" dropped from ${p.total} to ${s.total}.`,
            type: 'held_dropped',
            canAcceptLive: true
          };
        }
      }
      if (p.attended > 0 && s.attended < p.attended) {
        const attendedDrop = p.attended - s.attended;
        const attendedDropRatio = attendedDrop / p.attended;
        if ((p.attended >= 3 && s.attended === 0) || (attendedDrop >= 3 && attendedDropRatio > 0.15)) {
          return {
            drifted: true,
            reason: `Attended classes for "${s.name}" dropped from ${p.attended} to ${s.attended}.`,
            type: 'attended_dropped',
            canAcceptLive: true
          };
        }
      }
      if (p.total >= 10 && s.total > p.total * 1.5) {
        return {
          drifted: true,
          reason: `Conducted classes for "${s.name}" jumped sharply from ${p.total} to ${s.total}.`,
          type: 'sharp_jump',
          canAcceptLive: true
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
      if (scannedResult && Array.isArray(scannedResult.subjects) && scannedResult.subjects.length > 0) {
        lastLiveScrape = scannedResult;
      }
      const prevGood = getLastGoodScrape();
      const drift = checkScrapeDrift(prevGood, scannedResult);

      let resultToRender = scannedResult;

      if (drift.drifted) {
        console.warn('[Bunkr] Scrape drift detected:', drift.reason);
        // Do NOT overwrite last good scrape. Use last good data with live DOM elements re-attached.
        if (prevGood) {
          resultToRender = {
            ...prevGood,
            subjects: attachLiveElements(prevGood.subjects, scannedResult?.subjects),
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
          mutation.target.id === 'bunkr-safety-pill' ||
          mutation.target.id === 'attendmate-safety-pill' ||
          mutation.target.id?.includes('canvas-grades') ||
          mutation.target.id?.includes('canvas-radar') ||
          mutation.target.id?.includes('canvas-forecaster') ||
          mutation.target.id === 'am-override-popover' ||
          mutation.target.id === 'am-popover-backdrop' ||
          mutation.target.id === 'am-trip-popover' ||
          mutation.target.id === 'am-trip-backdrop' ||
          mutation.target.id === 'am-tools-menu' ||
          (mutation.target.closest && (
            mutation.target.closest('#bunkr-root') ||
            mutation.target.closest('#attendmate-root') ||
            mutation.target.closest('#bunkr-page-banner') ||
            mutation.target.closest('#attendmate-page-banner') ||
            mutation.target.closest('#bunkr-drift-banner') ||
            mutation.target.closest('#attendmate-drift-banner') ||
            mutation.target.closest('#bunkr-safety-pill') ||
            mutation.target.closest('#attendmate-safety-pill') ||
            mutation.target.closest('#am-trip-popover') ||
            mutation.target.closest('#am-override-popover') ||
            mutation.target.closest('#am-tools-menu') ||
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

  // Allow user to explicitly accept live ERP counts as the new baseline when drift triggers
  window.BunkrAcceptCurrentScrape = window.AttendMateAcceptCurrentScrape = () => {
    const parser = window.BunkrParser || window.AttendMateParser;
    const freshScan = parser ? parser.scanPage(currentTarget) : lastLiveScrape;
    const candidate = (freshScan && Array.isArray(freshScan.subjects) && freshScan.subjects.length > 0)
      ? freshScan
      : lastLiveScrape;

    if (candidate && Array.isArray(candidate.subjects) && candidate.subjects.length > 0) {
      candidate.drift = { drifted: false };
      saveLastGoodScrape(candidate);
    }
    isCircuitBroken = false;
    consecutiveErrors = 0;
    removeSafetyPill();
    setupObserver();
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
