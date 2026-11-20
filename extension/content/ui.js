// Bunkr 2.4.1 — Seamless In-Page Integration for Rishiverse & Canvas LMS
// Phase 1: "Never Silently Wrong" — Freshness, Drift Alarm, Human Override, One-Click Diagnostics

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BunkrUI = root.AttendMateUI = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  let currentTargetPercentage = 75;
  let cachedData = null;
  let freshnessTimer = null;

  try {
    const saved = localStorage.getItem('bunkr_target_percentage') || localStorage.getItem('attendmate_target_percentage');
    if (saved) currentTargetPercentage = parseFloat(saved) || 75;
  } catch (e) {}

  let activeCustomTimetable = null;

  function isDomElement(el) {
    return Boolean(
      el &&
      typeof el === 'object' &&
      el.nodeType === 1 &&
      typeof el.closest === 'function' &&
      typeof el.querySelector === 'function'
    );
  }

  function updateTimetable(timetable) {
    activeCustomTimetable = timetable || null;
    const engine = window.BunkrEngine || window.AttendMateEngine;
    if (engine && typeof engine.setActiveTimetable === 'function') {
      engine.setActiveTimetable(activeCustomTimetable);
    }
    if (cachedData) {
      render(cachedData);
    }
  }

  // Official B.Tech CSE (DS) Sem 1 Timetable Slots (21 sessions/week, 8 subjects with rooms)
  const timetableSlots = {
    'psp': [
      { day: 1, time: '13:30', room: 'A603' },
      { day: 2, time: '13:30', room: 'A408' },
      { day: 3, time: '13:30', room: 'A603' },
      { day: 4, time: '10:10', room: 'A603' }
    ],
    'wad': [
      { day: 1, time: '15:30', room: 'A603' },
      { day: 2, time: '15:30', room: 'A301' },
      { day: 3, time: '15:30', room: 'A603' },
      { day: 5, time: '13:30', room: 'A610' }
    ],
    'math': [
      { day: 2, time: '09:00', room: 'A610' },
      { day: 2, time: '11:20', room: 'A610' },
      { day: 3, time: '09:00', room: 'A610' },
      { day: 5, time: '10:10', room: 'A610' }
    ],
    'social': [
      { day: 1, time: '10:10', room: 'RFP' },
      { day: 2, time: '10:10', room: 'RFP' }
    ],
    'cfn': [
      { day: 1, time: '11:20', room: 'A610' },
      { day: 3, time: '11:20', room: 'A610' }
    ],
    'india': [
      { day: 4, time: '09:00', room: 'RFP' },
      { day: 5, time: '09:00', room: 'RFP' }
    ],
    'kpmg': [
      { day: 4, time: '11:20', room: 'A603' },
      { day: 5, time: '11:20', room: 'A610' }
    ],
    'society': [
      { day: 3, time: '10:10', room: 'RFP' }
    ]
  };

  function matchSubjectKey(name) {
    const engine = window.BunkrEngine || window.AttendMateEngine;
    const currentTimetable = activeCustomTimetable || (engine && engine.getActiveTimetable ? engine.getActiveTimetable() : null);

    if (currentTimetable && currentTimetable.SLOTS) {
      if (typeof currentTimetable.matchSubjectKey === 'function') {
        const k = currentTimetable.matchSubjectKey(name);
        if (k) return k;
      }
      const l = (name || '').toLowerCase().trim();
      const slotsMap = currentTimetable.SLOTS;
      for (const [key, subj] of Object.entries(slotsMap)) {
        if (key.toLowerCase() === l) return key;
        const sName = (subj.name || '').toLowerCase().trim();
        const sCode = (subj.code || '').toLowerCase().trim();
        const sAcronym = (subj.acronym || '').toLowerCase().trim();
        if (sName && (l === sName || l.includes(sName) || sName.includes(l))) return key;
        if (sCode && (l === sCode || l.includes(sCode))) return key;
        if (sAcronym && (l === sAcronym || l.includes(sAcronym))) return key;
      }
    }

    const l = (name || '').toLowerCase();
    if (l.includes('problem solving') || l.includes('psp')) return 'psp';
    if (l.includes('web application') || l.includes('wad')) return 'wad';
    if (l.includes('mathematics') || l.includes('math')) return 'math';
    if (l.includes('social communication') || l.includes('social')) return 'social';
    if (l.includes('networking') || l.includes('cfn') || l.includes('computer fundamentals')) return 'cfn';
    if (l.includes('understanding india') || l.includes('india')) return 'india';
    if (l.includes('kpmg') || l.includes('workshop') || l.includes('edept')) return 'kpmg';
    if (l.includes('self and society') || l.includes('society')) return 'society';
    return null;
  }

  /**
   * Plain-language relative freshness formatter
   * e.g., "Synced just now from Rishiverse", "Synced 5 min ago from Rishiverse"
   */
  function formatFreshness(timestamp, portalName = 'Rishiverse', now = Date.now()) {
    if (!timestamp) return 'Not yet synced';
    const ts = typeof timestamp === 'string' ? new Date(timestamp).getTime() : Number(timestamp);
    if (isNaN(ts) || ts <= 0) return 'Not yet synced';

    const diffSeconds = Math.max(0, Math.floor((now - ts) / 1000));
    let relativeStr = '';
    if (diffSeconds < 15) {
      relativeStr = 'just now';
    } else if (diffSeconds < 60) {
      relativeStr = `${diffSeconds}s ago`;
    } else {
      const minutes = Math.floor(diffSeconds / 60);
      if (minutes < 60) {
        relativeStr = `${minutes} min ago`;
      } else {
        const hours = Math.floor(minutes / 60);
        if (hours < 24) {
          relativeStr = `${hours} hr${hours === 1 ? '' : 's'} ago`;
        } else {
          const days = Math.floor(hours / 24);
          relativeStr = `${days} day${days === 1 ? '' : 's'} ago`;
        }
      }
    }

    const cleanPortal = portalName ? ` from ${portalName}` : '';
    return `Synced ${relativeStr}${cleanPortal}`;
  }

  /**
   * Stored Manual Overrides Handler
   */
  function getStoredOverrides() {
    try {
      const raw = localStorage.getItem('bunkr_manual_overrides') || localStorage.getItem('attendmate_manual_overrides');
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function saveOverride(subjectKey, attended, total) {
    const overrides = getStoredOverrides();
    const cleanKey = subjectKey.trim().toLowerCase();
    overrides[cleanKey] = {
      attended: Math.max(0, parseInt(attended, 10) || 0),
      total: Math.max(1, parseInt(total, 10) || 1),
      updatedAt: Date.now()
    };

    try {
      localStorage.setItem('bunkr_manual_overrides', JSON.stringify(overrides));
      localStorage.setItem('attendmate_manual_overrides', JSON.stringify(overrides));
    } catch (e) {}

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ manualOverrides: overrides });
    }

    showToast(`Saved manual override for ${subjectKey}`);
    if (cachedData) {
      render(cachedData);
    }
  }

  function resetOverride(subjectKey) {
    const overrides = getStoredOverrides();
    const cleanKey = subjectKey.trim().toLowerCase();
    delete overrides[cleanKey];

    try {
      localStorage.setItem('bunkr_manual_overrides', JSON.stringify(overrides));
      localStorage.setItem('attendmate_manual_overrides', JSON.stringify(overrides));
    } catch (e) {}

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ manualOverrides: overrides });
    }

    showToast(`Reset ${subjectKey} to live scraped values`);
    if (cachedData) {
      render(cachedData);
    }
  }

  function applyOverrides(subjects) {
    const overrides = getStoredOverrides();
    return subjects.map((subj) => {
      const key1 = (subj.name || '').trim().toLowerCase();
      const key2 = (subj.code || '').trim().toLowerCase();
      const key3 = subj.id ? String(subj.id).toLowerCase() : null;

      const override = overrides[key1] || (key2 && overrides[key2]) || (key3 && overrides[key3]);

      if (override && typeof override.attended === 'number' && typeof override.total === 'number') {
        const attended = Math.max(0, override.attended);
        const total = Math.max(attended, override.total);
        const percentage = total > 0 ? (attended / total) * 100 : 0;

        return {
          ...subj,
          scrapedAttended: subj.scrapedAttended ?? subj.attended,
          scrapedTotal: subj.scrapedTotal ?? subj.total,
          attended,
          total,
          absent: Math.max(0, total - attended),
          percentage,
          isManualOverride: true
        };
      }

      return {
        ...subj,
        isManualOverride: false
      };
    });
  }

  /**
   * Actionable Deficit Recovery Math & Bunk Calculator
   */
  function calculateBunkWithDeficitRecovery(attended, totalHeld, remainingClasses, targetPercentage = currentTargetPercentage) {
    const finalTotal = totalHeld + remainingClasses;
    const minRequired = Math.ceil((targetPercentage / 100) * finalTotal);
    const mustAttend = Math.max(0, minRequired - attended);
    const canBunk = Math.max(0, remainingClasses - mustAttend);
    const isAttainable = mustAttend <= remainingClasses;

    const maxAttainableAttended = attended + remainingClasses;
    const maxAttainablePct = finalTotal > 0 ? (maxAttainableAttended / finalTotal) * 100 : 0;
    const shortfall = Math.max(0, mustAttend - remainingClasses);

    let statusText = '';
    let badgeClass = '';
    let advice = '';
    let subText = '';

    if (isAttainable) {
      if (canBunk > 0) {
        statusText = `Can bunk: <span class="am-num">${canBunk}</span> class${canBunk === 1 ? '' : 'es'} (till Dec 18)`;
        badgeClass = 'safe';
        advice = `Attend ${mustAttend} of ${remainingClasses} remaining classes to finish at ${((attended + mustAttend) / finalTotal * 100).toFixed(1)}%.`;
      } else {
        statusText = `Can bunk: <span class="am-num">0</span> classes (Need all ${remainingClasses} left)`;
        badgeClass = 'warning';
        advice = `Attend all ${remainingClasses} remaining classes to reach ${targetPercentage}%.`;
      }
    } else {
      statusText = `Deficit: Need all ${remainingClasses} classes (Max: ${maxAttainablePct.toFixed(1)}%)`;
      badgeClass = 'deficit';
      subText = `Short by ${shortfall} class${shortfall === 1 ? '' : 'es'} &bull; 1 excused/medical leave needed`;
      advice = `Short by ${shortfall} class${shortfall === 1 ? '' : 'es'}. Submitting 1 medical/duty leave or attending a compensatory class reaches ${(Math.min(100, (maxAttainableAttended + 1) / finalTotal * 100)).toFixed(1)}%.`;
    }

    return {
      remainingClasses,
      finalTotal,
      mustAttend,
      canBunk,
      isAttainable,
      maxAttainablePct,
      shortfall,
      statusText,
      badgeClass,
      advice,
      subText
    };
  }

  /**
   * Dynamic Calendar Engine
   */
  function getDynamicRemainingClasses(subjectName, fromDate = new Date()) {
    const engine = window.BunkrEngine || window.AttendMateEngine;
    if (engine && typeof engine.getDynamicRemainingClasses === 'function') {
      return engine.getDynamicRemainingClasses(subjectName, fromDate, { timetable: activeCustomTimetable });
    }
    const currentSlots = (activeCustomTimetable && activeCustomTimetable.SLOTS) ? activeCustomTimetable.SLOTS : timetableSlots;
    const key = matchSubjectKey(subjectName);
    const subj = key ? currentSlots[key] : null;
    const slots = subj ? (Array.isArray(subj) ? subj : subj.slots) : null;

    let endDate = new Date(2026, 11, 18, 23, 59, 59); // Dec 18, 2026
    let diwaliStart = new Date(2026, 10, 6, 0, 0, 0); // Nov 6, 2026
    let diwaliEnd = new Date(2026, 10, 13, 23, 59, 59); // Nov 13, 2026
    let hasDiwali = true;

    if (activeCustomTimetable) {
      if (activeCustomTimetable.endDate) {
        const e = new Date(activeCustomTimetable.endDate);
        if (!isNaN(e.getTime())) endDate = e;
      }
      const db = activeCustomTimetable.diwaliBreak;
      if (db && db.start && db.end) {
        const ds = new Date(db.start);
        const de = new Date(db.end);
        if (!isNaN(ds.getTime()) && !isNaN(de.getTime())) {
          diwaliStart = ds;
          diwaliEnd = de;
        }
      } else if (activeCustomTimetable.custom && !db && !activeCustomTimetable.holidays) {
        hasDiwali = false;
      }
    }

    const hasSat = activeCustomTimetable && activeCustomTimetable.SLOTS &&
      Object.values(activeCustomTimetable.SLOTS).some(s => Array.isArray(s.slots) && s.slots.some(sl => sl.day === 6));

    let refDate = new Date(fromDate);
    if (refDate.getFullYear() !== 2026 || refDate > endDate) {
      refDate = new Date(2026, 10, Math.min(fromDate.getDate() || 3, 5), fromDate.getHours() || 10, fromDate.getMinutes() || 0);
    }

    if (!slots) {
      let count = 0;
      let d = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate() + 1);
      while (d <= endDate) {
        if (!hasDiwali || !(d >= diwaliStart && d <= diwaliEnd)) {
          const day = d.getDay();
          const isDayOff = day === 0 || (!hasSat && day === 6);
          if (!isDayOff && (day === 1 || day === 3 || (hasSat && day === 6))) count++;
        }
        d.setDate(d.getDate() + 1);
      }
      return Math.max(1, count);
    }

    let remainingCount = 0;
    const curYear = refDate.getFullYear();
    const curMonth = refDate.getMonth();
    const curDate = refDate.getDate();
    const curDay = refDate.getDay();
    const curTimeMinutes = refDate.getHours() * 60 + refDate.getMinutes();

    const isTodayInDiwali = hasDiwali && refDate >= diwaliStart && refDate <= diwaliEnd;
    const isTodayOff = curDay === 0 || (!hasSat && curDay === 6);
    if (!isTodayInDiwali && !isTodayOff) {
      for (const slot of slots) {
        if (slot.day === curDay) {
          const [h, m] = slot.time.split(':').map(Number);
          const slotMinutes = h * 60 + m;
          if (slotMinutes > curTimeMinutes) {
            remainingCount++;
          }
        }
      }
    }

    let iter = new Date(curYear, curMonth, curDate + 1);
    while (iter <= endDate) {
      if (hasDiwali && iter >= diwaliStart && iter <= diwaliEnd) {
        iter.setDate(iter.getDate() + 1);
        continue;
      }

      const day = iter.getDay();
      const isDayOff = day === 0 || (!hasSat && day === 6);
      if (!isDayOff) {
        for (const slot of slots) {
          if (slot.day === day) {
            remainingCount++;
          }
        }
      }
      iter.setDate(iter.getDate() + 1);
    }

    return remainingCount;
  }

  /**
   * One-Click Diagnostics Copy
   */
  function copyDiagnostics() {
    const now = new Date();
    const portal = window.location.hostname.includes('instructure') ? 'Canvas LMS' : 'Rishiverse';
    const domTables = document.querySelectorAll('table').length;
    const domCards = document.querySelectorAll('.card, [class*="attendance"], [class*="course"]').length;
    const subjects = cachedData ? cachedData.subjects : [];
    const drift = cachedData?.drift || { drifted: false };
    const overrides = getStoredOverrides();
    const overrideKeys = Object.keys(overrides);

    let text = `### Bunkr Diagnostics (v2.4.1)\n`;
    text += `- **Generated**: ${now.toISOString()} (${now.toLocaleTimeString()})\n`;
    text += `- **Portal**: ${portal} (\`${window.location.hostname}\`)\n`;
    text += `- **Page URL**: \`${window.location.href.slice(0, 100)}\`\n`;
    text += `- **DOM Elements**: Tables: ${domTables}, Cards: ${domCards}\n`;
    text += `- **Last Sync**: ${cachedData?.timestamp ? new Date(cachedData.timestamp).toISOString() : 'Never'}\n`;
    text += `- **Freshness**: ${formatFreshness(cachedData?.timestamp, portal)}\n`;
    text += `- **Scrape Status**: ${drift.drifted ? `Drift Alert (${drift.reason})` : 'Clean Scrape'}\n`;
    text += `- **Active Overrides**: ${overrideKeys.length} courses manually set\n\n`;

    text += `#### Courses Overview\n`;
    if (subjects.length === 0) {
      text += `*No courses currently tracked.*\n`;
    } else {
      subjects.forEach((s, idx) => {
        const tag = s.isManualOverride
          ? `[MANUAL OVERRIDE: was ${s.scrapedAttended}/${s.scrapedTotal}]`
          : `[SCRAPED]`;
        text += `${idx + 1}. **${s.name}**: ${s.attended}/${s.total} (${s.percentage.toFixed(1)}%) ${tag}\n`;
      });
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast('Diagnostics copied to clipboard.');
      }).catch(() => {
        showToast('Clipboard unavailable — open Command Center to export diagnostics.');
      });
    } else {
      showToast('Clipboard unavailable in this browser context.');
    }
  }

  /**
   * Interactive Popover for Manual Override
   */
  function openOverrideModal(subj) {
    closeOverrideModal();

    const backdrop = document.createElement('div');
    backdrop.className = 'am-popover-backdrop';
    backdrop.id = 'am-popover-backdrop';

    const popover = document.createElement('div');
    popover.className = 'am-override-popover';
    popover.id = 'am-override-popover';

    const currentAttended = subj.attended;
    const currentTotal = subj.total;
    const scrapedText = subj.isManualOverride ? `Original scrape was ${subj.scrapedAttended}/${subj.scrapedTotal}` : `Current scrape: ${currentAttended}/${currentTotal}`;

    popover.innerHTML = `
      <div class="am-popover-title">Manual Attendance Override</div>
      <div class="am-popover-sub"><strong>${subj.name}</strong><br><small style="color:#64748B;">${scrapedText}</small></div>
      
      <div class="am-popover-row">
        <label for="am-input-attended">Classes Attended:</label>
        <input type="number" id="am-input-attended" class="am-popover-input" min="0" max="200" value="${currentAttended}">
      </div>

      <div class="am-popover-row">
        <label for="am-input-total">Classes Held (Total):</label>
        <input type="number" id="am-input-total" class="am-popover-input" min="1" max="200" value="${currentTotal}">
      </div>

      <div id="am-override-error" class="am-override-error" role="alert"></div>

      <div class="am-popover-actions">
        ${subj.isManualOverride ? `<button id="am-modal-reset-btn" class="am-btn-reset" title="Discard manual override and revert to page scrape">Reset to Live</button>` : ''}
        <button id="am-modal-cancel-btn" class="am-btn-ghost">Cancel</button>
        <button id="am-modal-save-btn" class="am-btn-save">Save Override</button>
      </div>
    `;

    document.body.appendChild(backdrop);
    document.body.appendChild(popover);

    const close = () => closeOverrideModal();
    backdrop.addEventListener('click', close);
    popover.querySelector('#am-modal-cancel-btn').addEventListener('click', close);

    const resetBtn = popover.querySelector('#am-modal-reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        resetOverride(subj.name);
        close();
      });
    }

    const errBox = popover.querySelector('#am-override-error');
    const showErr = (msg) => {
      if (!errBox) return;
      errBox.textContent = msg;
      errBox.classList.add('visible');
    };

    popover.querySelector('#am-modal-save-btn').addEventListener('click', () => {
      const attVal = parseInt(popover.querySelector('#am-input-attended').value, 10);
      const totVal = parseInt(popover.querySelector('#am-input-total').value, 10);

      if (isNaN(attVal) || isNaN(totVal) || totVal <= 0 || attVal < 0) {
        showErr('Enter valid non-negative numbers with at least 1 class held.');
        return;
      }
      if (attVal > totVal) {
        showErr('Attended classes cannot exceed total held classes.');
        return;
      }

      saveOverride(subj.name, attVal, totVal);
      close();
    });
  }

  function closeOverrideModal() {
    const existing = document.getElementById('am-override-popover');
    if (existing) existing.remove();
    const backdrop = document.getElementById('am-popover-backdrop');
    if (backdrop) backdrop.remove();
  }

  function showToast(msg) {
    const existing = document.getElementById('am-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'am-toast';
    toast.className = 'am-toast';
    toast.textContent = msg;
    document.body.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) toast.remove();
    }, 2800);
  }

  /**
   * Main Render Pipeline
   */
  function render(data) {
    if (!data) return;

    // Canvas Grades & Strict Quiz Safe-Guard Mode: strictly do not render overlays or columns
    if (typeof window !== 'undefined') {
      const router = window.CanvasRouter || window.BunkrRouter;
      const isExamRoute = (router && typeof router.isExamSafeRoute === 'function' && router.isExamSafeRoute()) ||
        Boolean(window.__bunkrQuiescentSafeMode) ||
        Boolean(window.__attendmateQuiescentSafeMode) ||
        Boolean(data && (data.isExamSafe || data.quiescentSafeMode));
      if (isExamRoute) {
        return;
      }

      const isGradesPage = (router && typeof router.isCanvasGradesPage === 'function' && router.isCanvasGradesPage()) ||
        /\/courses\/[^\/]+\/grades(?:\b|\/|\?|#|$)/i.test(window.location.href) ||
        Boolean(document.querySelector('table#grades_summary, #grades_summary')) ||
        Boolean(data && data.isCanvasGrades);
      if (isGradesPage) {
        return;
      }
    }

    // Apply manual overrides
    let subjects = data.subjects ? applyOverrides(data.subjects) : [];
    cachedData = { ...data, subjects };

    const portal = window.location.hostname.includes('instructure') ? 'Canvas' : 'Rishiverse';

    // 1. Render Drift Alarm Banner if drift detected or scrape returned 0
    renderDriftBanner(data.drift, portal);

    // If 0 subjects and drift occurred, banner is already shown; nothing further to inject in rows
    if (subjects.length === 0) return;

    // 2. Identify Layout: Table vs Cards
    const firstSubjectWithEl = subjects.find((s) => isDomElement(s?.element));
    const firstSubjectEl = firstSubjectWithEl ? firstSubjectWithEl.element : null;
    const table = firstSubjectEl ? firstSubjectEl.closest('table') : document.querySelector('table');

    if (table) {
      injectTableColumn(table, subjects, data);
      injectPageBanner(table, portal);
    } else {
      injectCardBadges(subjects, data);
      const firstCard = firstSubjectEl || document.querySelector('.card, [class*="attendance"], [class*="course"]');
      if (firstCard && firstCard.parentElement) {
        injectPageBanner(firstCard.parentElement, portal);
      }
    }

    startFreshnessTicker(portal);
  }

  /**
   * Injects Drift Alarm Banner when scraping anomalies occur
   */
  function renderDriftBanner(drift, portal) {
    let banner = document.getElementById('attendmate-drift-banner');

    if (!drift || !drift.drifted) {
      if (banner) banner.remove();
      return;
    }

    const referenceEl = document.querySelector('table, .card, [class*="attendance"], [class*="course"], main');
    if (!referenceEl || !referenceEl.parentNode) return;

    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'attendmate-drift-banner';
      referenceEl.parentNode.insertBefore(banner, referenceEl);
    }

    const freshnessStr = formatFreshness(cachedData?.timestamp, portal);
    const showAcceptLive = drift.canAcceptLive !== false && drift.type !== 'empty_scrape';

    banner.innerHTML = `
      <div class="am-drift-left">
        <span class="am-drift-icon" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </span>
        <div>
          <div class="am-drift-title">The ERP page may have changed — showing last known data</div>
          <div class="am-drift-sub">${drift.reason || 'Attendance structure changed'} &middot; ${freshnessStr}</div>
        </div>
      </div>
      <div class="am-drift-actions">
        ${showAcceptLive ? `<button id="am-drift-accept-btn" class="am-drift-btn accept" title="Trust the current ERP counts and update saved baseline">Use Current Data</button>` : ''}
        <button id="am-drift-diag-btn" class="am-drift-btn" title="Copy debugging summary to clipboard">Diagnostics</button>
        <button id="am-drift-retry-btn" class="am-drift-btn primary" title="Retry scraping page">Retry Scrape</button>
      </div>
    `;

    const acceptBtn = banner.querySelector('#am-drift-accept-btn');
    if (acceptBtn) {
      acceptBtn.addEventListener('click', () => {
        const acceptFn = window.BunkrAcceptCurrentScrape || window.AttendMateAcceptCurrentScrape;
        if (acceptFn) {
          acceptFn();
          showToast('Updated to current ERP attendance data.');
        } else {
          try {
            localStorage.removeItem('bunkr_last_good_scrape');
            localStorage.removeItem('attendmate_last_good_scrape');
          } catch (e) {}
          const rescan = window.BunkrRescan || window.AttendMateRescan;
          if (rescan) rescan();
          else window.location.reload();
        }
      });
    }

    banner.querySelector('#am-drift-diag-btn').addEventListener('click', copyDiagnostics);
    banner.querySelector('#am-drift-retry-btn').addEventListener('click', () => {
      const rescan = window.BunkrRescan || window.AttendMateRescan;
      if (rescan) {
        rescan();
      } else {
        window.location.reload();
      }
    });
  }

  /**
   * Freshness auto-ticker (updates text every 15s without reload)
   */
  function startFreshnessTicker(portal) {
    if (freshnessTimer) clearInterval(freshnessTimer);
    freshnessTimer = setInterval(() => {
      const tag = document.getElementById('attendmate-freshness-text');
      if (tag && cachedData && cachedData.timestamp) {
        const text = formatFreshness(cachedData.timestamp, portal);
        tag.textContent = text;
      }
    }, 15000);
  }

  /**
   * In-Page Quick Trip / Leave Planner Modal
   * Lets students simulate multi-day absences directly on Rishiverse ERP.
   */
  function closeTripPlannerModal() {
    const existing = document.getElementById('am-trip-popover');
    if (existing) existing.remove();
    const backdrop = document.getElementById('am-trip-backdrop');
    if (backdrop) backdrop.remove();
  }

  function formatIsoDate(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function openTripPlannerModal() {
    closeTripPlannerModal();
    const engine = window.BunkrEngine || window.AttendMateEngine;
    if (!engine || typeof engine.simulateLeavePlan !== 'function' || !cachedData) {
      showToast('Trip planner requires attendance data on this page.');
      return;
    }

    const subjects = applyOverrides(cachedData.subjects || []);
    const activeTT = activeCustomTimetable || (engine.getActiveTimetable ? engine.getActiveTimetable() : null);

    // Default to a sensible 3-day trip starting tomorrow (aligned to semester year)
    const now = new Date();
    const baseStart = new Date(2026, now.getMonth(), now.getDate() + 1);
    const semEnd = new Date(2026, 11, 18);
    const defaultStart = baseStart > semEnd ? new Date(2026, 10, 16) : baseStart;
    const defaultEnd = new Date(defaultStart.getFullYear(), defaultStart.getMonth(), defaultStart.getDate() + 2);

    const backdrop = document.createElement('div');
    backdrop.id = 'am-trip-backdrop';
    backdrop.className = 'am-popover-backdrop';

    const popover = document.createElement('div');
    popover.id = 'am-trip-popover';
    popover.className = 'am-trip-popover';

    popover.innerHTML = `
      <div class="am-trip-header">
        <div>
          <div class="am-trip-title">Trip &amp; Leave Planner</div>
          <div class="am-trip-sub">Simulate missing classes across dates using your active timetable</div>
        </div>
        <button id="am-trip-close-btn" class="am-trip-close" aria-label="Close">&times;</button>
      </div>
      <div class="am-trip-presets">
        <button type="button" class="am-trip-preset-btn" data-days="0">Tomorrow</button>
        <button type="button" class="am-trip-preset-btn active" data-days="2">3-Day Trip</button>
        <button type="button" class="am-trip-preset-btn" data-days="4">5-Day Home Visit</button>
      </div>
      <div class="am-trip-dates">
        <label>
          <span>From</span>
          <input type="date" id="am-trip-start" value="${formatIsoDate(defaultStart)}">
        </label>
        <label>
          <span>To</span>
          <input type="date" id="am-trip-end" value="${formatIsoDate(defaultEnd)}">
        </label>
        <label class="am-trip-excused">
          <input type="checkbox" id="am-trip-excused-toggle">
          <span>+1 Medical / Duty Leave</span>
        </label>
      </div>
      <div id="am-trip-results" class="am-trip-results"></div>
      <div class="am-trip-footer">
        <button type="button" id="am-trip-copy-btn" class="am-drift-btn accept">Copy Trip Plan (WhatsApp)</button>
        <button type="button" id="am-trip-done-btn" class="am-btn-ghost">Close</button>
      </div>
    `;

    document.body.appendChild(backdrop);
    document.body.appendChild(popover);

    const startInput = popover.querySelector('#am-trip-start');
    const endInput = popover.querySelector('#am-trip-end');
    const excusedToggle = popover.querySelector('#am-trip-excused-toggle');
    const resultsEl = popover.querySelector('#am-trip-results');
    let latestPlan = null;

    function updateTripView() {
      latestPlan = engine.simulateLeavePlan(subjects, startInput.value, endInput.value, {
        targetPercentage: currentTargetPercentage,
        timetable: activeTT,
        overrides: getStoredOverrides(),
        excusedLeaves: excusedToggle.checked ? 1 : 0
      });

      if (!latestPlan.valid) {
        resultsEl.innerHTML = `<div class="am-trip-verdict danger">${latestPlan.error}</div>`;
        return;
      }

      const courseRows = latestPlan.affectedCourses.length === 0
        ? `<div class="am-trip-empty">No scheduled lectures fall inside ${latestPlan.startLabel} – ${latestPlan.endLabel}.</div>`
        : latestPlan.affectedCourses.map((c) => {
            const stateClass = c.safeAfter ? 'safe' : (c.droppedBelowTarget ? 'danger' : 'warning');
            const note = c.safeAfter
              ? 'Safe'
              : (c.excusedLeavesToSave > 0 ? `Needs ${c.excusedLeavesToSave} excused` : `Attend ${c.recoveryClasses} after`);
            return `
              <div class="am-trip-row">
                <div class="am-trip-course">
                  <strong>${c.acronym}</strong>
                  <span>-${c.missed} cls</span>
                </div>
                <div class="am-trip-nums">
                  <span>${c.beforePct.toFixed(1)}% &rarr; <strong class="${stateClass}">${c.afterPct.toFixed(1)}%</strong></span>
                  <span class="am-trip-tag ${stateClass}">${note}</span>
                </div>
              </div>
            `;
          }).join('');

      resultsEl.innerHTML = `
        <div class="am-trip-verdict ${latestPlan.verdictTone}">
          <strong>${latestPlan.verdict}</strong>
          <span>Overall: ${latestPlan.overallBeforePct.toFixed(1)}% &rarr; ${latestPlan.overallAfterPct.toFixed(1)}% &middot; ${latestPlan.totalMissedSessions} classes missed</span>
        </div>
        <div class="am-trip-list">${courseRows}</div>
      `;
    }

    popover.querySelectorAll('.am-trip-preset-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        popover.querySelectorAll('.am-trip-preset-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const spanDays = parseInt(btn.getAttribute('data-days'), 10) || 0;
        const s = new Date(defaultStart.getTime());
        const e = new Date(s.getFullYear(), s.getMonth(), s.getDate() + spanDays);
        startInput.value = formatIsoDate(s);
        endInput.value = formatIsoDate(e);
        updateTripView();
      });
    });

    startInput.addEventListener('change', updateTripView);
    endInput.addEventListener('change', updateTripView);
    excusedToggle.addEventListener('change', updateTripView);

    backdrop.addEventListener('click', closeTripPlannerModal);
    popover.querySelector('#am-trip-close-btn').addEventListener('click', closeTripPlannerModal);
    popover.querySelector('#am-trip-done-btn').addEventListener('click', closeTripPlannerModal);

    popover.querySelector('#am-trip-copy-btn').addEventListener('click', () => {
      if (!latestPlan || !latestPlan.valid) return;
      const text = engine.generateTripShareText(latestPlan);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
          showToast('Trip plan copied for WhatsApp.');
        }).catch(() => {});
      }
    });

    updateTripView();
  }

  /**
   * In-Page Native Semester Summary Bar (Decluttered for Rishiverse ERP)
   * Keeps everyday actions front-and-center while tucking setup/debug tools into a compact menu.
   */
  function injectPageBanner(referenceEl, portal = 'Rishiverse') {
    if (referenceEl && (referenceEl.id === 'grades_summary' || (referenceEl.closest && referenceEl.closest('#grades_summary')))) {
      return;
    }

    let banner = document.getElementById('attendmate-page-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'attendmate-page-banner';
      if (referenceEl.parentNode) {
        referenceEl.parentNode.insertBefore(banner, referenceEl);
      }
    }

    const freshnessStr = formatFreshness(cachedData?.timestamp, portal);
    const isStale = cachedData?.drift?.drifted;
    const engine = window.BunkrEngine || window.AttendMateEngine;
    const activeTT = activeCustomTimetable || (engine && engine.getActiveTimetable ? engine.getActiveTimetable() : null);
    const summary = engine && typeof engine.getRemainingTeachingSummary === 'function'
      ? engine.getRemainingTeachingSummary(new Date(), activeTT)
      : { endDateFormatted: 'Dec 18, 2026', teachingDaysLeft: 21, totalClassesLeft: 89, semesterTitle: 'Semester' };

    const effectiveSubjects = applyOverrides(cachedData?.subjects || []);
    let totAtt = 0;
    let totHeld = 0;
    effectiveSubjects.forEach((s) => {
      totAtt += Number(s.attended) || 0;
      totHeld += Number(s.total) || 0;
    });
    const overallPct = totHeld > 0 ? ((totAtt / totHeld) * 100).toFixed(1) : '--';
    const overallSafe = totHeld > 0 && (totAtt / totHeld) * 100 >= currentTargetPercentage;

    banner.innerHTML = `
      <div class="am-banner-left">
        <div class="am-banner-brand">
          <span class="am-banner-overall ${overallSafe ? 'safe' : 'warn'}">${overallPct}%</span>
          <div class="am-banner-meta">
            <strong>Bunkr &middot; ${summary.teachingDaysLeft} teaching days left</strong>
            <span>Ends ${summary.endDateFormatted} &middot; <span id="attendmate-freshness-text" class="am-banner-freshness ${isStale ? 'stale' : ''}">${freshnessStr}</span></span>
          </div>
        </div>
        <div class="am-target-segment" role="group" aria-label="Target attendance percentage">
          <button type="button" class="am-target-chip ${currentTargetPercentage === 75 ? 'active' : ''}" data-target="75">75%</button>
          <button type="button" class="am-target-chip ${currentTargetPercentage === 80 ? 'active' : ''}" data-target="80">80%</button>
          <button type="button" class="am-target-chip ${currentTargetPercentage === 85 ? 'active' : ''}" data-target="85">85%</button>
        </div>
      </div>
      <div class="am-banner-actions">
        <button type="button" id="attendmate-trip-btn" class="attendmate-banner-btn am-btn-trip" title="Simulate missing upcoming dates using your timetable">
          Plan Trip
        </button>
        <button type="button" id="attendmate-copy-status-btn" class="attendmate-banner-btn am-btn-share" title="Copy plain-text attendance summary ready for WhatsApp">
          Copy Status
        </button>
        <div class="am-tools-wrap">
          <button type="button" id="attendmate-tools-toggle" class="attendmate-banner-btn am-btn-subtle" aria-haspopup="true" aria-expanded="false" title="More Bunkr tools">
            Tools &#9662;
          </button>
          <div id="am-tools-menu" class="am-tools-menu" style="display: none;">
            <button type="button" id="attendmate-open-cc-btn" class="am-tools-item">Command Center</button>
            <button type="button" id="attendmate-cal-sync-btn" class="am-tools-item">Export 10m Calendar (.ics)</button>
            <button type="button" id="attendmate-test-nudge-btn" class="am-tools-item">Send Test Nudge</button>
            <button type="button" id="attendmate-diag-btn" class="am-tools-item">Copy Diagnostics</button>
          </div>
        </div>
      </div>
    `;

    banner.querySelectorAll('.am-target-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const val = parseFloat(chip.getAttribute('data-target')) || 75;
        setTargetPercentage(val);
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({ targetPercentage: val });
        }
      });
    });

    const tripBtn = banner.querySelector('#attendmate-trip-btn');
    if (tripBtn) {
      tripBtn.addEventListener('click', openTripPlannerModal);
    }

    const toolsToggle = banner.querySelector('#attendmate-tools-toggle');
    const toolsMenu = banner.querySelector('#am-tools-menu');
    if (toolsToggle && toolsMenu) {
      toolsToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const open = toolsMenu.style.display === 'block';
        toolsMenu.style.display = open ? 'none' : 'block';
        toolsToggle.setAttribute('aria-expanded', String(!open));
      });
      document.addEventListener('click', () => {
        if (toolsMenu) toolsMenu.style.display = 'none';
      }, { once: true });
    }

    const diagBtn = banner.querySelector('#attendmate-diag-btn');
    if (diagBtn) {
      diagBtn.addEventListener('click', () => {
        if (toolsMenu) toolsMenu.style.display = 'none';
        copyDiagnostics();
      });
    }

    const ccBtn = banner.querySelector('#attendmate-open-cc-btn');
    if (ccBtn) {
      ccBtn.addEventListener('click', () => {
        if (toolsMenu) toolsMenu.style.display = 'none';
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
          window.open(chrome.runtime.getURL('newtab/newtab.html'), '_blank');
        } else {
          window.location.href = '/newtab/newtab.html';
        }
      });
    }

    const copyStatusBtn = banner.querySelector('#attendmate-copy-status-btn');
    if (copyStatusBtn) {
      copyStatusBtn.addEventListener('click', () => {
        const eng = window.BunkrEngine || window.AttendMateEngine;
        if (!eng || !cachedData) return;
        const subjects = applyOverrides(cachedData.subjects || []);
        const shareText = eng.generateShareText({
          subjects,
          targetPercentage: currentTargetPercentage,
          overrides: getStoredOverrides(),
          timestamp: cachedData.timestamp,
          drift: cachedData.drift
        });

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(shareText).then(() => {
            showToast('WhatsApp status copied to clipboard.');
          }).catch(() => {
            showToast('Copy failed — clipboard permission denied.');
          });
        }
      });
    }

    const testNudgeBtn = banner.querySelector('#attendmate-test-nudge-btn');
    if (testNudgeBtn) {
      testNudgeBtn.addEventListener('click', () => {
        if (toolsMenu) toolsMenu.style.display = 'none';
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({
            type: 'TEST_NUDGE',
            course: 'PSP',
            time: '13:30',
            room: 'A603'
          }, () => {
            showToast('Sent: Move — PSP starts 13:30 in A603');
          });
        } else {
          showToast('Move — PSP starts 13:30 in A603');
        }
      });
    }

    const calBtn = banner.querySelector('#attendmate-cal-sync-btn');
    if (calBtn) {
      calBtn.addEventListener('click', () => {
        if (toolsMenu) toolsMenu.style.display = 'none';
        const calUrl = (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL)
          ? chrome.runtime.getURL('rishihood_classes_10min_alert.ics')
          : '/rishihood_classes_10min_alert.ics';
        const a = document.createElement('a');
        a.href = calUrl;
        a.download = 'Rishihood_Classes_10Min_Alerts.ics';
        a.click();
        showToast('Downloaded 10-minute class alerts (.ics)');
      });
    }
  }

  /**
   * Injects Dedicated Column to Rishiverse Table
   */
  function injectTableColumn(table, subjects, data) {
    if (!table) return;

    // Strictly skip Canvas Gradebook and right sidebar
    if (table.id === 'grades_summary' || table.closest('#grades_summary') || table.closest('#right-side') || table.closest('#right-side-wrapper')) {
      return;
    }
    if (table.querySelector('tr.student_assignment')) {
      return;
    }
    if (typeof window !== 'undefined') {
      const router = window.CanvasRouter || window.BunkrRouter;
      if (router && typeof router.isCanvasGradesPage === 'function' && router.isCanvasGradesPage()) {
        return;
      }
      if (/\/courses\/[^\/]+\/grades(?:\b|\/|\?|#|$)/i.test(window.location.href)) {
        return;
      }
    }

    const engine = window.BunkrEngine || window.AttendMateEngine;
    const activeTT = activeCustomTimetable || (engine && engine.getActiveTimetable ? engine.getActiveTimetable() : null);
    let finishLineStr = 'Dec 18, 2026';
    if (activeTT && activeTT.endDate) {
      const ed = new Date(activeTT.endDate);
      if (!isNaN(ed.getTime())) {
        finishLineStr = ed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
    }

    const headerRow = table.querySelector('thead tr') || table.querySelector('tr');
    if (headerRow && !headerRow.querySelector('.attendmate-col-header')) {
      const th = document.createElement('th');
      th.className = 'attendmate-col-header';
      th.innerText = `Classes You Can Bunk (Till ${finishLineStr})`;
      headerRow.appendChild(th);
    }

    subjects.forEach((subj) => {
      const row = isDomElement(subj.element) ? subj.element.closest('tr') : null;
      if (!row) return;

      const remaining = getDynamicRemainingClasses(subj.name);
      const calc = calculateBunkWithDeficitRecovery(subj.attended, subj.total, remaining, currentTargetPercentage);

      let td = row.querySelector('.attendmate-miss-cell');
      if (!td) {
        td = document.createElement('td');
        row.appendChild(td);
      }

      td.className = `attendmate-miss-cell ${calc.badgeClass} ${subj.isManualOverride ? 'manual' : ''}`;
      
      let titleAdvice = calc.advice;
      if (subj.isManualOverride) {
        titleAdvice = `[Manual Override: ${subj.attended}/${subj.total} (Scraped: ${subj.scrapedAttended}/${subj.scrapedTotal})] • Click to edit`;
      } else {
        titleAdvice += ` • Click to override counts`;
      }
      td.title = titleAdvice;

      let bunkText = '';
      if (calc.isAttainable) {
        bunkText = `Can bunk: <span class="am-num">${calc.canBunk}</span> class${calc.canBunk === 1 ? '' : 'es'}`;
      } else {
        bunkText = `Deficit: <span class="am-num">0</span> (Max: ${calc.maxAttainablePct.toFixed(1)}%)`;
      }

      if (subj.isManualOverride) {
        bunkText += ` <span class="am-manual-pill">Manual (${subj.attended}/${subj.total})</span>`;
      } else if (data?.drift?.drifted) {
        bunkText += ` <small style="color:#B45309; font-weight:600; font-size:11px;">(Last known)</small>`;
      }

      bunkText += ` <span class="am-edit-trigger" title="Override attendance counts">Edit</span>`;

      td.innerHTML = bunkText;
      td.style.cursor = 'pointer';

      // Click to edit
      td.onclick = (e) => {
        e.stopPropagation();
        openOverrideModal(subj);
      };
    });
  }

  /**
   * Injects Native-Styled Bunk Strips for Modern Card/Grid Layouts (Rishiverse ERP)
   */
  function injectCardBadges(subjects, data) {
    const engine = window.BunkrEngine || window.AttendMateEngine;

    subjects.forEach((subj) => {
      const targetEl = isDomElement(subj.badgeTargetElement)
        ? subj.badgeTargetElement
        : (isDomElement(subj.element) ? subj.element : null);
      if (!targetEl) return;

      const remaining = getDynamicRemainingClasses(subj.name);
      const calc = calculateBunkWithDeficitRecovery(subj.attended, subj.total, remaining, currentTargetPercentage);
      const excusedInfo = engine && typeof engine.calculateExcusedRecovery === 'function'
        ? engine.calculateExcusedRecovery(subj.attended, subj.total, currentTargetPercentage)
        : null;

      let badge = targetEl.querySelector('.attendmate-miss-badge');
      if (!badge) {
        badge = document.createElement('div');
        targetEl.appendChild(badge);
      }

      badge.className = `attendmate-miss-badge ${calc.badgeClass} ${subj.isManualOverride ? 'manual' : ''}`;
      badge.title = subj.isManualOverride
        ? `[Manual Override: ${subj.attended}/${subj.total}] • Click to edit or reset`
        : `${calc.advice} • Click to override counts`;

      let rightMeta = '';
      if (subj.isManualOverride) {
        rightMeta = `<span class="am-manual-pill">Manual (${subj.attended}/${subj.total})</span>`;
      } else if (data?.drift?.drifted) {
        rightMeta = `<small style="color:#B45309; font-weight:600; font-size:11px;">Last known</small>`;
      } else if (subj.excusedPct > 0) {
        rightMeta = `<span class="am-excused-note">Includes ${subj.excusedPct}% excused</span>`;
      } else if (excusedInfo && !excusedInfo.alreadySafe && excusedInfo.neededExcused > 0) {
        rightMeta = `<span class="am-excused-note">${excusedInfo.neededExcused} medical/duty leave recovers ${currentTargetPercentage}%</span>`;
      }

      let html = `<div class="am-badge-row">`;
      html += `<div class="am-badge-main">${calc.statusText}</div>`;
      html += `<div class="am-badge-right">${rightMeta}<span class="am-edit-trigger" title="Edit counts">Edit</span></div>`;
      html += `</div>`;

      if (calc.subText) {
        html += `<div class="am-badge-subtext">${calc.subText}</div>`;
      }

      badge.innerHTML = html;
      badge.style.cursor = 'pointer';

      badge.onclick = (e) => {
        e.stopPropagation();
        openOverrideModal(subj);
      };
    });
  }

  function setTargetPercentage(newTarget) {
    currentTargetPercentage = parseFloat(newTarget) || 75;
    try {
      localStorage.setItem('bunkr_target_percentage', currentTargetPercentage);
      localStorage.setItem('attendmate_target_percentage', currentTargetPercentage);
    } catch (e) {}

    if (cachedData) {
      render(cachedData);
    }
  }

  return {
    render,
    setTargetPercentage,
    updateTimetable,
    getDynamicRemainingClasses,
    calculateBunkWithDeficitRecovery,
    formatFreshness,
    applyOverrides,
    copyDiagnostics,
    openOverrideModal,
    openTripPlannerModal,
    saveOverride,
    resetOverride
  };
});
