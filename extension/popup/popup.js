// Bunkr 2.4.2 — Studio Popup Controller
// Unified Light/Dark theme, Circular Gauge, Inline Overrides (no prompt/alert), Trip Dates & Deadlines

document.addEventListener('DOMContentLoaded', () => {
  const THEME_KEY = 'bunkr_studio_theme';
  let attendanceData = null;
  let targetPercentage = 75;
  let manualOverrides = {};
  let lastSyncTimestamp = null;
  let activePortalName = 'Rishiverse';
  let freshnessInterval = null;
  let editingSubjectName = null;

  let nudgesEnabled = true;
  let nudgeLeadMinutes = 10;

  let simAttend = 0;
  let simBunk = 0;
  let simSubjectId = 'all';

  // Elements
  const connectionStatus = document.getElementById('connection-status');
  const popupDriftAlert = document.getElementById('popup-drift-alert');
  const popupDriftSub = document.getElementById('popup-drift-sub');
  const popupFreshness = document.getElementById('popup-freshness');
  const overallPct = document.getElementById('overall-pct');
  const overallRingArc = document.getElementById('overall-ring-arc');
  const overallRingLabel = document.getElementById('overall-ring-label');
  const overallStatusPill = document.getElementById('overall-status-pill');
  const overallProgressFill = document.getElementById('overall-progress-fill');
  const targetLabel = document.getElementById('target-label');
  const statAttended = document.getElementById('stat-attended');
  const statTotal = document.getElementById('stat-total');
  const statMissed = document.getElementById('stat-missed');
  const subjectList = document.getElementById('subject-list');
  const searchInput = document.getElementById('search-input');
  const openDrawerBtn = document.getElementById('open-drawer-btn');
  const syncBtn = document.getElementById('sync-btn');
  const exportBtn = document.getElementById('export-btn');
  const diagBtn = document.getElementById('diag-btn');
  const restoreBtn = document.getElementById('restore-btn');
  const restoreFileInput = document.getElementById('restore-file-input');

  // Nudges Tab Elements
  const popupNudgeToggle = document.getElementById('popup-nudge-toggle');
  const popupLeadBtns = document.querySelectorAll('.popup-lead-btn');
  const popupTestNudgeBtn = document.getElementById('popup-test-nudge-btn');
  const popupTodayClasses = document.getElementById('popup-today-classes');

  // Simulator Elements
  const simSubjectSelect = document.getElementById('sim-subject-select');
  const simValAttend = document.getElementById('sim-val-attend');
  const simValBunk = document.getElementById('sim-val-bunk');
  const simProjectedPct = document.getElementById('sim-projected-pct');
  const simDeltaBadge = document.getElementById('sim-delta-badge');
  const simAdviceText = document.getElementById('sim-advice-text');

  const STANDALONE_DEMO_ATTENDANCE = {
    timestamp: Date.now() - 180000,
    overall: { attended: 118, total: 137, percentage: 86.1 },
    subjects: [
      { id: 'kpmg', name: 'KPMG/Edept Workshop Certification Program', code: 'CSDS-2601', attended: 1, total: 3, absent: 2, percentage: 33.3, excusedPct: 0 },
      { id: 'psp', name: 'Problem Solving and Programming', code: 'CSD02C1002', attended: 34, total: 41, absent: 7, percentage: 82.9, excusedPct: 0 },
      { id: 'society', name: 'Self and Society I', code: 'RSPRFC1002', attended: 9, total: 10, absent: 1, percentage: 90.0, excusedPct: 0 },
      { id: 'wad', name: 'Web Application Development I', code: 'CSD02C1003', attended: 36, total: 40, absent: 4, percentage: 90.0, excusedPct: 0 },
      { id: 'cfn', name: 'Computer fundamentals and networking', code: 'CSD02C1004', attended: 19, total: 22, absent: 3, percentage: 86.4, excusedPct: 0 },
      { id: 'social', name: 'Social Communication I', code: 'RSPRFC1003', attended: 19, total: 21, absent: 2, percentage: 90.5, excusedPct: 10 }
    ]
  };

  const rishihoodRemaining = {
    'problem solving': 18,
    'psp': 18,
    'web application': 17,
    'wad': 17,
    'mathematics': 17,
    'math': 17,
    'social communication': 10,
    'networking': 9,
    'cfn': 9,
    'understanding india': 7,
    'kpmg': 7,
    'self and society': 4
  };

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function initTheme() {
    let saved = 'light';
    try {
      const stored = localStorage.getItem(THEME_KEY);
      if (stored === 'dark' || stored === 'light') {
        saved = stored;
      } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        saved = 'dark';
      }
    } catch (e) {}
    document.documentElement.setAttribute('data-theme', saved);

    const themeBtn = document.getElementById('popup-theme-btn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        try {
          localStorage.setItem(THEME_KEY, next);
        } catch (e) {}
      });
    }
  }

  initTheme();
  init();

  function init() {
    loadStoredOverrides();

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get([
        'cachedAttendance',
        'targetPercentage',
        'manualOverrides',
        'lastSync',
        'nudgesEnabled',
        'nudgeLeadMinutes',
        'customTimetable',
        'canvas_assignments'
      ], (res) => {
        const engine = window.BunkrEngine || window.AttendMateEngine;
        if (res.customTimetable && engine) {
          engine.setActiveTimetable(res.customTimetable);
        }
        if (res.targetPercentage) {
          targetPercentage = res.targetPercentage;
          updateTargetUI();
        }
        if (res.manualOverrides) manualOverrides = res.manualOverrides;
        if (res.lastSync) lastSyncTimestamp = res.lastSync;
        if (res.nudgesEnabled !== undefined) {
          nudgesEnabled = Boolean(res.nudgesEnabled);
          if (popupNudgeToggle) popupNudgeToggle.checked = nudgesEnabled;
        }
        if (res.nudgeLeadMinutes) {
          nudgeLeadMinutes = parseInt(res.nudgeLeadMinutes, 10) || 10;
          updateLeadUI();
        }
        if (res.cachedAttendance) {
          attendanceData = res.cachedAttendance;
          lastSyncTimestamp = res.cachedAttendance.timestamp || lastSyncTimestamp;
          renderAll();
        }
        queryActiveTab();
        updateFreshnessText();
        renderTodayClasses();
        renderPopupDeadlines(res.canvas_assignments);
      });

      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== 'local') return;
        const engine = window.BunkrEngine || window.AttendMateEngine;
        if (changes.customTimetable) {
          if (engine) engine.setActiveTimetable(changes.customTimetable.newValue || null);
          renderTodayClasses();
          if (attendanceData) renderAll();
        }
        if (changes.cachedAttendance && changes.cachedAttendance.newValue) {
          attendanceData = changes.cachedAttendance.newValue;
          renderAll();
        }
        if (changes.canvas_assignments) {
          renderPopupDeadlines(changes.canvas_assignments.newValue);
        }
        if (changes.nudgesEnabled !== undefined && popupNudgeToggle) {
          nudgesEnabled = Boolean(changes.nudgesEnabled.newValue);
          popupNudgeToggle.checked = nudgesEnabled;
        }
        if (changes.nudgeLeadMinutes && changes.nudgeLeadMinutes.newValue) {
          nudgeLeadMinutes = parseInt(changes.nudgeLeadMinutes.newValue, 10) || 10;
          updateLeadUI();
        }
      });
    } else {
      attendanceData = STANDALONE_DEMO_ATTENDANCE;
      lastSyncTimestamp = STANDALONE_DEMO_ATTENDANCE.timestamp;
      if (connectionStatus) connectionStatus.textContent = 'Rishiverse Preview';
      renderAll();
      updateFreshnessText();
      renderTodayClasses();
      renderPopupDeadlines(null);
    }

    setupTabs();
    setupTargetButtons();
    setupSimulatorControls();
    setupTripSimulatorControls();
    setupActionButtons();
    setupNudgeControls();

    if (freshnessInterval) clearInterval(freshnessInterval);
    freshnessInterval = setInterval(updateFreshnessText, 15000);
  }

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
        relativeStr = `${minutes}m ago`;
      } else {
        const hours = Math.floor(minutes / 60);
        relativeStr = hours < 24 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`;
      }
    }

    const cleanPortal = portalName ? ` · ${portalName}` : '';
    return `Synced ${relativeStr}${cleanPortal}`;
  }

  function updateFreshnessText() {
    if (popupFreshness) {
      popupFreshness.textContent = formatFreshness(lastSyncTimestamp, activePortalName);
    }
  }

  function loadStoredOverrides() {
    try {
      const raw = localStorage.getItem('bunkr_manual_overrides') || localStorage.getItem('attendmate_manual_overrides');
      if (raw) manualOverrides = JSON.parse(raw);
    } catch (e) {}
  }

  function saveManualOverride(subjName, attended, total) {
    const cleanKey = subjName.trim().toLowerCase();
    manualOverrides[cleanKey] = {
      attended: Math.max(0, parseInt(attended, 10) || 0),
      total: Math.max(1, parseInt(total, 10) || 1),
      updatedAt: Date.now()
    };

    try {
      localStorage.setItem('bunkr_manual_overrides', JSON.stringify(manualOverrides));
      localStorage.setItem('attendmate_manual_overrides', JSON.stringify(manualOverrides));
    } catch (e) {}

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ manualOverrides });
    }

    editingSubjectName = null;
    notifyTabsOfOverride();
    renderAll();
  }

  function resetManualOverride(subjName) {
    const cleanKey = subjName.trim().toLowerCase();
    delete manualOverrides[cleanKey];

    try {
      localStorage.setItem('bunkr_manual_overrides', JSON.stringify(manualOverrides));
      localStorage.setItem('attendmate_manual_overrides', JSON.stringify(manualOverrides));
    } catch (e) {}

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ manualOverrides });
    }

    editingSubjectName = null;
    notifyTabsOfOverride();
    renderAll();
  }

  function notifyTabsOfOverride() {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, { type: 'RELOAD_OVERRIDES' });
        }
      });
    }
  }

  function applyOverridesToSubjects(subjects) {
    if (!Array.isArray(subjects)) return [];
    return subjects.map((subj) => {
      const key1 = (subj.name || '').trim().toLowerCase();
      const key2 = (subj.code || '').trim().toLowerCase();
      const key3 = subj.id ? String(subj.id).toLowerCase() : null;

      const override = manualOverrides[key1] || (key2 && manualOverrides[key2]) || (key3 && manualOverrides[key3]);
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
      return { ...subj, isManualOverride: false };
    });
  }

  function queryActiveTab() {
    if (typeof chrome === 'undefined' || !chrome.tabs) return;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (!activeTab || !activeTab.id) return;
      const url = activeTab.url || '';
      if (/instructure\.com|canvas/i.test(url)) {
        activePortalName = 'Canvas';
        connectionStatus.textContent = 'Canvas LMS Connected';
      } else if (/rishiverse|rishihood/i.test(url)) {
        activePortalName = 'Rishiverse';
        connectionStatus.textContent = 'Rishiverse Connected';
      } else if (!attendanceData) {
        connectionStatus.textContent = 'Offline Mode';
      }
      updateFreshnessText();
    });
  }

  function renderAll() {
    if (!attendanceData || !attendanceData.overall) {
      subjectList.innerHTML = `<div style="text-align:center; padding:20px; font-size:12px; color:var(--ink-muted);">No attendance data yet. Open Rishiverse or Canvas and click Sync Page.</div>`;
      return;
    }

    const effectiveSubjects = applyOverridesToSubjects(attendanceData.subjects || []);
    let totalAttended = 0;
    let totalHeld = 0;
    effectiveSubjects.forEach((s) => {
      totalAttended += s.attended;
      totalHeld += s.total;
    });

    const overallPctVal = totalHeld > 0 ? (totalAttended / totalHeld) * 100 : 0;
    const math = window.BunkrMath || window.AttendMateMath;
    const status = math.getAttendanceStatus(totalAttended, totalHeld, targetPercentage);
    const toneClass = overallPctVal >= targetPercentage ? 'is-safe' : 'is-danger';

    overallPct.textContent = `${overallPctVal.toFixed(1)}%`;
    overallPct.className = `summary-pct mono ${toneClass}`;
    overallStatusPill.textContent = status.text;
    overallStatusPill.className = `summary-status-text ${toneClass}`;

    // Precision SVG Circular Ring (circumference = 2 * pi * 30 = 188.5)
    if (overallRingArc) {
      const circumference = 188.5;
      const offset = circumference - (Math.min(100, Math.max(0, overallPctVal)) / 100) * circumference;
      overallRingArc.style.strokeDashoffset = String(offset.toFixed(1));
      overallRingArc.style.stroke = overallPctVal >= targetPercentage ? 'var(--safe)' : 'var(--danger)';
    }
    if (overallRingLabel) {
      overallRingLabel.textContent = `${Math.round(overallPctVal)}%`;
    }
    if (overallProgressFill) {
      overallProgressFill.style.width = `${Math.min(100, overallPctVal)}%`;
    }

    statAttended.textContent = totalAttended;
    statTotal.textContent = totalHeld;
    statMissed.textContent = Math.max(0, totalHeld - totalAttended);

    if (attendanceData.drift && attendanceData.drift.drifted) {
      if (popupDriftAlert) {
        popupDriftAlert.style.display = 'block';
        if (popupDriftSub) {
          popupDriftSub.textContent = `${attendanceData.drift.reason || 'Page structure changed'} · Showing last known data`;
        }
      }
    } else if (popupDriftAlert) {
      popupDriftAlert.style.display = 'none';
    }

    updateFreshnessText();
    renderPopupProjection(effectiveSubjects);
    renderSubjectsList(effectiveSubjects);
    renderForecastList(effectiveSubjects);
    populateSimulatorSelect(effectiveSubjects);
    updateSimulation();
    renderPopupTripSimulation();
  }

  function renderSubjectsList(subjects) {
    const query = (searchInput.value || '').toLowerCase();
    const filtered = (subjects || []).filter((s) => s.name.toLowerCase().includes(query));

    if (filtered.length === 0) {
      subjectList.innerHTML = `<div style="text-align:center; padding:22px 14px; font-size:12px; color:var(--ink-muted);">No matching courses</div>`;
      return;
    }

    const editSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`;

    subjectList.innerHTML = filtered.map((s) => {
      const math = window.BunkrMath || window.AttendMateMath;
      const status = math.getAttendanceStatus(s.attended, s.total, targetPercentage);
      const isEditing = editingSubjectName === s.name;
      const manualTag = s.isManualOverride ? `<span class="manual-inline-tag">Manual</span>` : '';
      const pctTone = s.percentage >= targetPercentage ? 'is-safe' : 'is-danger';

      const inlineForm = isEditing ? `
        <div class="inline-override-form" data-override-form="${escapeHtml(s.name)}">
          <div class="inline-override-fields">
            <label>Attended <input type="number" class="ov-att-input" min="0" max="300" value="${s.attended}"></label>
            <label>Held total <input type="number" class="ov-tot-input" min="1" max="300" value="${s.total}"></label>
          </div>
          <div class="inline-override-error" style="display:none;"></div>
          <div class="inline-override-actions">
            ${s.isManualOverride ? `<button type="button" class="mini-action danger ov-reset-btn" data-subj="${escapeHtml(s.name)}">Reset</button>` : ''}
            <button type="button" class="mini-action ov-cancel-btn">Cancel</button>
            <button type="button" class="mini-action primary ov-save-btn" data-subj="${escapeHtml(s.name)}">Save</button>
          </div>
        </div>
      ` : '';

      return `
        <div class="subject-item">
          <div class="subj-item-header">
            <span class="subj-item-title" title="${escapeHtml(s.name)}">${escapeHtml(s.name)}${manualTag}</span>
            <div class="subj-right-group">
              <span class="subj-item-pct ${pctTone}">${s.percentage.toFixed(1)}%</span>
              <button type="button" class="edit-action-btn" data-subj="${escapeHtml(s.name)}" aria-label="Edit attendance for ${escapeHtml(s.name)}" title="Override attendance counts">${editSvg}</button>
            </div>
          </div>
          <div class="subj-item-bottom">
            <span class="mono">${s.attended}/${s.total} classes</span>
            <span class="subj-status-inline ${status.type}">${escapeHtml(status.text)}</span>
          </div>
          ${inlineForm}
        </div>
      `;
    }).join('');

    subjectList.querySelectorAll('.edit-action-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const subjName = btn.getAttribute('data-subj');
        editingSubjectName = editingSubjectName === subjName ? null : subjName;
        renderSubjectsList(subjects);
      });
    });

    subjectList.querySelectorAll('.ov-cancel-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        editingSubjectName = null;
        renderSubjectsList(subjects);
      });
    });

    subjectList.querySelectorAll('.ov-reset-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        resetManualOverride(btn.getAttribute('data-subj'));
      });
    });

    subjectList.querySelectorAll('.ov-save-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const form = btn.closest('.inline-override-form');
        const attVal = parseInt(form.querySelector('.ov-att-input').value, 10);
        const totVal = parseInt(form.querySelector('.ov-tot-input').value, 10);
        const errEl = form.querySelector('.inline-override-error');

        if (isNaN(attVal) || isNaN(totVal) || totVal <= 0 || attVal < 0) {
          errEl.textContent = 'Enter valid positive numbers.';
          errEl.style.display = 'block';
          return;
        }
        if (attVal > totVal) {
          errEl.textContent = 'Attended cannot exceed total held.';
          errEl.style.display = 'block';
          return;
        }
        saveManualOverride(btn.getAttribute('data-subj'), attVal, totVal);
      });
    });
  }

  function renderForecastList(subjects) {
    const forecastList = document.getElementById('forecast-list');
    if (!forecastList) return;

    const engine = window.BunkrEngine || window.AttendMateEngine;
    const summary = engine && typeof engine.getRemainingTeachingSummary === 'function'
      ? engine.getRemainingTeachingSummary(new Date())
      : { semesterTitle: 'Diwali Semester 2026', endDateFormatted: 'Dec 18, 2026', teachingDaysLeft: 21, totalClassesLeft: 89 };

    const semTitleEl = document.getElementById('forecast-sem-title');
    const semStatsEl = document.getElementById('forecast-sem-stats');
    if (semTitleEl) semTitleEl.textContent = `${summary.semesterTitle} · Ends ${summary.endDateFormatted}`;
    if (semStatsEl) semStatsEl.textContent = `${summary.teachingDaysLeft} teaching days · ${summary.totalClassesLeft} scheduled classes left`;

    if (!subjects || subjects.length === 0) {
      forecastList.innerHTML = `<div style="text-align:center; padding:20px; font-size:12px; color:var(--ink-muted);">No courses to forecast yet.</div>`;
      return;
    }

    forecastList.innerHTML = subjects.map((s) => {
      const match = Object.keys(rishihoodRemaining).find((k) => s.name.toLowerCase().includes(k));
      const remaining = engine && typeof engine.getDynamicRemainingClasses === 'function'
        ? engine.getDynamicRemainingClasses(s.name)
        : (match ? rishihoodRemaining[match] : 12);
      const finalTotal = s.total + remaining;
      const minRequired = Math.ceil((targetPercentage / 100) * finalTotal);
      const mustAttend = Math.max(0, minRequired - s.attended);
      const canBunk = Math.max(0, remaining - mustAttend);
      const attainable = mustAttend <= remaining;

      let toneClass = 'is-safe';
      let badgeText = '';
      if (attainable) {
        if (canBunk > 0) {
          toneClass = 'is-safe';
          badgeText = `Bunk ${canBunk} of ${remaining}`;
        } else {
          toneClass = 'is-warn';
          badgeText = `Need all ${remaining}`;
        }
      } else {
        const maxPct = ((s.attended + remaining) / finalTotal) * 100;
        toneClass = 'is-danger';
        badgeText = `Max ${maxPct.toFixed(1)}%`;
      }

      return `
        <div class="subject-item">
          <div class="subj-item-header">
            <span class="subj-item-title" title="${escapeHtml(s.name)}">${escapeHtml(s.name)}</span>
            <span class="subj-item-pct ${toneClass}" style="font-size:11.5px; white-space:nowrap; flex-shrink:0;">${badgeText}</span>
          </div>
          <div class="subj-item-bottom">
            <span class="mono">${remaining} left till ${summary.endDateFormatted}</span>
            <span class="mono">Attend ${mustAttend}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  function populateSimulatorSelect(subjects) {
    simSubjectSelect.innerHTML = `
      <option value="all">Overall (All Courses)</option>
      ${(subjects || []).map((s) => `
        <option value="${escapeHtml(s.id || s.name)}">${escapeHtml(s.name)} (${s.percentage.toFixed(1)}%)</option>
      `).join('')}
    `;
    simSubjectSelect.value = simSubjectId;
  }

  function updateSimulation() {
    if (!attendanceData) return;

    let curAttended = 0;
    let curTotal = 0;
    const effectiveSubjects = applyOverridesToSubjects(attendanceData.subjects || []);

    if (simSubjectId === 'all') {
      effectiveSubjects.forEach((s) => {
        curAttended += s.attended;
        curTotal += s.total;
      });
    } else {
      const subj = effectiveSubjects.find((s) => (s.id || s.name) === simSubjectId) || effectiveSubjects[0];
      curAttended = subj ? subj.attended : 0;
      curTotal = subj ? subj.total : 0;
    }

    const math = window.BunkrMath || window.AttendMateMath;
    const sim = math.simulateWhatIf({
      attended: curAttended,
      marked: curTotal,
      willAttend: simAttend,
      willBunk: simBunk,
      targetPercentage
    });

    simValAttend.textContent = simAttend;
    simValBunk.textContent = simBunk;

    simProjectedPct.textContent = `${sim.projectedPercentage.toFixed(1)}%`;
    simProjectedPct.className = `sim-result-value mono ${sim.isAboveTarget ? 'is-safe' : 'is-danger'}`;

    const deltaSign = sim.percentageDelta >= 0 ? '+' : '';
    simDeltaBadge.textContent = `${deltaSign}${sim.percentageDelta.toFixed(1)}%`;
    simDeltaBadge.className = `sim-result-delta mono ${sim.percentageDelta >= 0 ? 'is-safe' : 'is-danger'}`;

    if (sim.newBunkable > 0) {
      simAdviceText.innerHTML = `Safe to bunk <strong>${sim.newBunkable}</strong> more class${sim.newBunkable === 1 ? '' : 'es'}.`;
    } else if (sim.newNeeded > 0) {
      simAdviceText.innerHTML = `Attend next <strong>${sim.newNeeded}</strong> class${sim.newNeeded === 1 ? '' : 'es'} to recover ${targetPercentage}%.`;
    } else {
      simAdviceText.textContent = `Right on the ${targetPercentage}% threshold.`;
    }
  }

  function setupTabs() {
    document.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach((b) => {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        document.querySelectorAll('.tab-pane').forEach((p) => p.classList.remove('active'));
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        document.getElementById(btn.getAttribute('data-tab')).classList.add('active');
      });
    });
  }

  function updateTargetUI() {
    targetLabel.textContent = `${targetPercentage}%`;
    document.querySelectorAll('.target-btn:not(.popup-lead-btn)').forEach((b) => {
      b.classList.toggle('active', parseFloat(b.getAttribute('data-target')) === targetPercentage);
    });
  }

  function setupTargetButtons() {
    document.querySelectorAll('.target-btn:not(.popup-lead-btn)').forEach((btn) => {
      btn.addEventListener('click', () => {
        const val = parseFloat(btn.getAttribute('data-target'));
        targetPercentage = val;
        updateTargetUI();

        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({ targetPercentage });
        }
        try {
          localStorage.setItem('bunkr_target_percentage', targetPercentage);
          localStorage.setItem('attendmate_target_percentage', targetPercentage);
        } catch (e) {}

        renderAll();

        if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
              chrome.tabs.sendMessage(tabs[0].id, { type: 'SET_TARGET', targetPercentage });
            }
          });
        }
      });
    });
  }

  function setupSimulatorControls() {
    simSubjectSelect.addEventListener('change', () => {
      simSubjectId = simSubjectSelect.value;
      updateSimulation();
    });
    document.getElementById('sim-inc-attend').addEventListener('click', () => { simAttend++; updateSimulation(); });
    document.getElementById('sim-dec-attend').addEventListener('click', () => { simAttend = Math.max(0, simAttend - 1); updateSimulation(); });
    document.getElementById('sim-inc-bunk').addEventListener('click', () => { simBunk++; updateSimulation(); });
    document.getElementById('sim-dec-bunk').addEventListener('click', () => { simBunk = Math.max(0, simBunk - 1); updateSimulation(); });
  }

  function setupTripSimulatorControls() {
    const classesBtn = document.getElementById('sim-mode-classes-btn');
    const tripBtn = document.getElementById('sim-mode-trip-btn');
    const classesPane = document.getElementById('sim-classes-pane');
    const tripPane = document.getElementById('sim-trip-pane');
    const startInput = document.getElementById('popup-trip-start');
    const endInput = document.getElementById('popup-trip-end');
    const excusedCheck = document.getElementById('popup-trip-excused');

    if (startInput && endInput && !startInput.value) {
      const s = new Date();
      s.setDate(s.getDate() + 1);
      const e = new Date(s);
      e.setDate(e.getDate() + 2);
      const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      startInput.value = fmt(s);
      endInput.value = fmt(e);
    }

    const setMode = (mode) => {
      if (classesBtn) classesBtn.classList.toggle('active', mode === 'classes');
      if (tripBtn) tripBtn.classList.toggle('active', mode === 'trip');
      if (classesPane) classesPane.style.display = mode === 'classes' ? 'flex' : 'none';
      if (tripPane) tripPane.style.display = mode === 'trip' ? 'flex' : 'none';
      if (mode === 'trip') renderPopupTripSimulation();
    };

    if (classesBtn) classesBtn.addEventListener('click', () => setMode('classes'));
    if (tripBtn) tripBtn.addEventListener('click', () => setMode('trip'));
    [startInput, endInput, excusedCheck].forEach((el) => {
      if (el) el.addEventListener('change', renderPopupTripSimulation);
    });
  }

  function renderPopupTripSimulation() {
    const engine = window.BunkrEngine || window.AttendMateEngine;
    const startInput = document.getElementById('popup-trip-start');
    const endInput = document.getElementById('popup-trip-end');
    const excusedCheck = document.getElementById('popup-trip-excused');
    const verdictEl = document.getElementById('popup-trip-verdict');
    const listEl = document.getElementById('popup-trip-list');

    if (!engine || !startInput || !endInput || !verdictEl || !listEl || !attendanceData) return;

    const effectiveSubjects = applyOverridesToSubjects(attendanceData.subjects || []);
    const plan = engine.simulateLeavePlan(effectiveSubjects, startInput.value, endInput.value, {
      targetPercentage,
      excusedLeaves: excusedCheck && excusedCheck.checked ? 1 : 0
    });

    if (!plan.valid) {
      verdictEl.className = 'popup-trip-verdict danger';
      verdictEl.textContent = plan.error || 'Select a valid range';
      listEl.innerHTML = '';
      return;
    }

    verdictEl.className = `popup-trip-verdict ${plan.verdictTone}`;
    verdictEl.textContent = `${plan.verdict} (${plan.overallBeforePct.toFixed(1)}% → ${plan.overallAfterPct.toFixed(1)}%, -${plan.totalMissedSessions} cls)`;

    if (plan.affectedCourses.length === 0) {
      listEl.innerHTML = `<div class="popup-trip-row"><span>No scheduled classes in range</span><strong class="mono">0 missed</strong></div>`;
      return;
    }

    listEl.innerHTML = plan.affectedCourses.map((c) => {
      const tone = c.safeAfter ? 'is-safe' : 'is-danger';
      return `
        <div class="popup-trip-row">
          <span><strong>${escapeHtml(c.acronym)}</strong> <span class="mono">(-${c.missed})</span></span>
          <span class="mono ${tone}" style="font-weight:700;">${c.beforePct.toFixed(0)}% → ${c.afterPct.toFixed(1)}%</span>
        </div>
      `;
    }).join('');
  }

  function renderPopupDeadlines(storedAssignments) {
    const strip = document.getElementById('popup-deadlines-strip');
    const badge = document.getElementById('popup-deadlines-badge');
    const itemsEl = document.getElementById('popup-deadlines-items');
    if (!strip || !badge || !itemsEl) return;

    const nowMs = Date.now();
    const horizonMs = 48 * 3600000;
    const list = Array.isArray(storedAssignments) ? storedAssignments : [];
    let urgent = list
      .filter((a) => a && a.dueAt && !a.submitted)
      .map((a) => ({ title: a.title || a.name || 'Assignment', dueMs: new Date(a.dueAt).getTime() }))
      .filter((a) => !isNaN(a.dueMs) && a.dueMs >= nowMs && a.dueMs <= nowMs + horizonMs)
      .sort((a, b) => a.dueMs - b.dueMs)
      .slice(0, 3);

    if (urgent.length === 0 && typeof chrome === 'undefined') {
      urgent = [
        { title: 'PSP Lab 06: Recursion', dueMs: nowMs + 18 * 3600000 },
        { title: 'WAD Grid Checkpoint', dueMs: nowMs + 42 * 3600000 }
      ];
    }

    if (urgent.length === 0) {
      strip.style.display = 'none';
      return;
    }

    strip.style.display = 'block';
    badge.textContent = `${urgent.length} due`;
    itemsEl.innerHTML = urgent.map((u) => {
      const hrs = Math.max(1, Math.round((u.dueMs - nowMs) / 3600000));
      return `<div class="popup-deadline-row"><span>${escapeHtml(u.title)}</span><small>in ${hrs}h</small></div>`;
    }).join('');
  }

  function setupActionButtons() {
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        const subjects = attendanceData?.subjects ? applyOverridesToSubjects(attendanceData.subjects) : [];
        renderSubjectsList(subjects);
      });
    }

    const openCcBtn = document.getElementById('open-cc-btn');
    if (openCcBtn) {
      openCcBtn.addEventListener('click', () => {
        if (typeof chrome !== 'undefined' && chrome.tabs && chrome.runtime) {
          chrome.tabs.create({ url: chrome.runtime.getURL('newtab/newtab.html') });
        } else {
          window.location.href = '../newtab/newtab.html';
        }
      });
    }

    if (openDrawerBtn) {
      openDrawerBtn.addEventListener('click', () => {
        if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) chrome.tabs.sendMessage(tabs[0].id, { type: 'OPEN_DRAWER' });
          });
        } else {
          window.location.href = '../demo/rishiverse_cards_demo.html';
        }
      });
    }

    if (syncBtn) {
      syncBtn.addEventListener('click', () => {
        connectionStatus.textContent = 'Syncing...';
        if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
              chrome.tabs.sendMessage(tabs[0].id, { type: 'TRIGGER_SCAN' }, () => {
                setTimeout(() => {
                  chrome.storage.local.get(['cachedAttendance', 'lastSync'], (d) => {
                    if (d.cachedAttendance) {
                      attendanceData = d.cachedAttendance;
                      lastSyncTimestamp = d.lastSync || d.cachedAttendance.timestamp;
                      connectionStatus.textContent = 'Synced just now';
                      renderAll();
                    }
                  });
                }, 600);
              });
            }
          });
        } else {
          lastSyncTimestamp = Date.now();
          connectionStatus.textContent = 'Preview Synced';
          renderAll();
        }
      });
    }

    if (diagBtn) {
      diagBtn.addEventListener('click', () => {
        const now = new Date();
        const effectiveSubjects = attendanceData?.subjects ? applyOverridesToSubjects(attendanceData.subjects) : [];
        let diag = `### Bunkr Diagnostics (v2.4.2)\n`;
        diag += `- Generated: ${now.toISOString()}\n`;
        diag += `- Active Portal: ${activePortalName}\n`;
        diag += `- Freshness: ${formatFreshness(lastSyncTimestamp, activePortalName)}\n`;
        diag += `- Target: ${targetPercentage}%\n\n`;
        effectiveSubjects.forEach((s, idx) => {
          diag += `${idx + 1}. ${s.name}: ${s.attended}/${s.total} (${s.percentage.toFixed(1)}%)\n`;
        });
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(diag).then(() => {
            const orig = diagBtn.textContent;
            diagBtn.textContent = 'Copied';
            setTimeout(() => { diagBtn.textContent = orig; }, 1600);
          }).catch(() => {});
        }
      });
    }

    const copyStatusBtn = document.getElementById('popup-copy-status-btn');
    if (copyStatusBtn) {
      copyStatusBtn.addEventListener('click', () => {
        const engine = window.BunkrEngine || window.AttendMateEngine;
        if (!engine) return;
        const effectiveSubjects = applyOverridesToSubjects(attendanceData?.subjects || []);
        const shareText = engine.generateShareText({
          subjects: effectiveSubjects,
          targetPercentage,
          overrides: manualOverrides,
          timestamp: lastSyncTimestamp,
          drift: attendanceData?.drift
        });

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(shareText).then(() => {
            const orig = copyStatusBtn.textContent;
            copyStatusBtn.textContent = 'Copied Status';
            setTimeout(() => { copyStatusBtn.textContent = orig; }, 1800);
          }).catch(() => {});
        }
      });
    }

    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const backupData = {
          bunkr_backup_version: '2.4.2',
          exported_at: new Date().toISOString(),
          targetPercentage,
          manualOverrides,
          cachedAttendance: attendanceData,
          lastSync: lastSyncTimestamp,
          nudgesEnabled,
          nudgeLeadMinutes
        };
        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Bunkr_Backup_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    if (restoreBtn && restoreFileInput) {
      restoreBtn.addEventListener('click', () => restoreFileInput.click());
      restoreFileInput.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target.result);
            if (!data || typeof data !== 'object') throw new Error('Invalid JSON');
            if (data.targetPercentage) { targetPercentage = parseFloat(data.targetPercentage) || 75; updateTargetUI(); }
            if (data.manualOverrides && typeof data.manualOverrides === 'object') {
              manualOverrides = data.manualOverrides;
              localStorage.setItem('bunkr_manual_overrides', JSON.stringify(manualOverrides));
            }
            if (data.nudgesEnabled !== undefined) {
              nudgesEnabled = Boolean(data.nudgesEnabled);
              if (popupNudgeToggle) popupNudgeToggle.checked = nudgesEnabled;
            }
            if (data.nudgeLeadMinutes) { nudgeLeadMinutes = parseInt(data.nudgeLeadMinutes, 10) || 10; updateLeadUI(); }
            if (data.cachedAttendance) attendanceData = data.cachedAttendance;
            if (data.lastSync) lastSyncTimestamp = data.lastSync;

            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
              chrome.storage.local.set({ targetPercentage, manualOverrides, cachedAttendance: attendanceData, lastSync: lastSyncTimestamp, nudgesEnabled, nudgeLeadMinutes });
            }
            renderAll();
            notifyTabsOfOverride();
            const orig = restoreBtn.textContent;
            restoreBtn.textContent = 'Restored';
            setTimeout(() => { restoreBtn.textContent = orig; }, 1600);
          } catch (err) {
            if (connectionStatus) connectionStatus.textContent = 'Invalid backup file';
          }
        };
        reader.readAsText(file);
      });
    }

    const calSyncBtn = document.getElementById('cal-sync-btn');
    if (calSyncBtn) {
      calSyncBtn.addEventListener('click', () => {
        const calUrl = (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL)
          ? chrome.runtime.getURL('rishihood_classes_10min_alert.ics')
          : '../rishihood_classes_10min_alert.ics';
        const a = document.createElement('a');
        a.href = calUrl;
        a.download = 'Rishihood_Classes_10Min_Alerts.ics';
        document.body.appendChild(a);
        a.click();
        a.remove();
        const orig = calSyncBtn.textContent;
        calSyncBtn.textContent = 'Downloaded .ics';
        setTimeout(() => { calSyncBtn.textContent = orig; }, 1800);
      });
    }

    const scheduleBtn = document.getElementById('popup-schedule-btn');
    if (scheduleBtn) {
      scheduleBtn.addEventListener('click', () => {
        if (typeof chrome !== 'undefined' && chrome.tabs && chrome.runtime) {
          chrome.tabs.create({ url: chrome.runtime.getURL('newtab/newtab.html?modal=schedule') });
        } else {
          window.location.href = '../newtab/newtab.html?modal=schedule';
        }
      });
    }
  }

  function updateLeadUI() {
    popupLeadBtns.forEach((btn) => {
      btn.classList.toggle('active', parseInt(btn.getAttribute('data-lead'), 10) === nudgeLeadMinutes);
    });
  }

  function setupNudgeControls() {
    if (popupNudgeToggle) {
      popupNudgeToggle.addEventListener('change', () => {
        nudgesEnabled = popupNudgeToggle.checked;
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({ nudgesEnabled });
        }
        localStorage.setItem('bunkr_nudges_enabled', nudgesEnabled ? 'true' : 'false');
      });
    }

    popupLeadBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        nudgeLeadMinutes = parseInt(btn.getAttribute('data-lead'), 10) || 10;
        updateLeadUI();
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({ nudgeLeadMinutes });
        }
        localStorage.setItem('bunkr_nudge_lead_minutes', String(nudgeLeadMinutes));
      });
    });

    if (popupTestNudgeBtn) {
      popupTestNudgeBtn.addEventListener('click', () => {
        const showSent = () => {
          const orig = popupTestNudgeBtn.textContent;
          popupTestNudgeBtn.textContent = 'Test Nudge Sent';
          setTimeout(() => { popupTestNudgeBtn.textContent = orig; }, 1800);
        };
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({ type: 'TEST_NUDGE', course: 'PSP', time: '13:30', room: 'A603' }, showSent);
        } else {
          showSent();
        }
      });
    }
  }

  function renderTodayClasses() {
    if (!popupTodayClasses) return;
    const now = new Date();
    const engine = window.BunkrEngine || window.AttendMateEngine;
    if (!engine) return;

    if (engine.isDateInDiwaliBreak(now)) {
      popupTodayClasses.innerHTML = `<div style="text-align:center; padding:12px; color:var(--warn); font-size:11.5px;">Diwali Break · No classes</div>`;
      return;
    }

    const activeTt = engine.getActiveTimetable ? engine.getActiveTimetable() : null;
    const hasSat = activeTt && activeTt.SLOTS && Object.values(activeTt.SLOTS).some((s) => Array.isArray(s.slots) && s.slots.some((sl) => sl.day === 6));
    if (now.getDay() === 0 || (!hasSat && now.getDay() === 6)) {
      popupTodayClasses.innerHTML = `<div style="text-align:center; padding:12px; color:var(--ink-muted); font-size:11.5px;">Weekend · Zero scheduled classes</div>`;
      return;
    }

    const classesToday = engine.getTodaysClasses(now);
    if (classesToday.length === 0) {
      popupTodayClasses.innerHTML = `<div style="text-align:center; padding:12px; color:var(--ink-muted); font-size:11.5px;">No classes scheduled today.</div>`;
      return;
    }

    popupTodayClasses.innerHTML = classesToday.map((c) => `
      <div class="subject-item" style="padding:7px 10px;">
        <div class="subj-item-header" style="margin-bottom:0;">
          <span class="subj-item-title">${escapeHtml(c.subjectName || c.name || c.acronym || 'Class')}</span>
          <span class="mono" style="font-size:11px; color:var(--accent); font-weight:700; white-space:nowrap; flex-shrink:0;">${escapeHtml(c.time)} · ${escapeHtml(c.room)}</span>
        </div>
      </div>
    `).join('');
  }

  function renderPopupProjection(subjects) {
    const engine = window.BunkrEngine || window.AttendMateEngine;
    if (!engine || typeof engine.calculateSemesterProjection !== 'function' || !subjects || subjects.length === 0) return;

    const proj = engine.calculateSemesterProjection(subjects, {
      now: new Date(),
      targetPercentage,
      overrides: manualOverrides,
      drift: attendanceData?.drift,
      isStale: Boolean(attendanceData?.drift?.drifted)
    });
    const paceEl = document.getElementById('popup-proj-pace');
    const maxEl = document.getElementById('popup-proj-max');
    const remEl = document.getElementById('popup-proj-rem');
    const coachEl = document.getElementById('popup-coach-pill');
    const staleTag = document.getElementById('popup-proj-stale-tag');

    if (paceEl) paceEl.textContent = `${proj.overallPacePct.toFixed(1)}%`;
    if (maxEl) maxEl.textContent = `${proj.overallMaxPct.toFixed(1)}%`;
    if (remEl) remEl.textContent = String(proj.totalRemainingSessions);
    if (staleTag) staleTag.style.display = proj.isStale ? 'inline' : 'none';

    if (coachEl) {
      const riskCount = Array.isArray(proj.atRiskCourses) ? proj.atRiskCourses.length : 0;
      if (riskCount === 0) {
        coachEl.textContent = 'Healthy standing';
        coachEl.className = 'popup-coach-text';
      } else {
        coachEl.textContent = `${riskCount} below target`;
        coachEl.className = 'popup-coach-text warning';
      }
    }
  }
});
