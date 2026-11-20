// Bunkr 2.4.1 - Popup Controller
// Phase 1 (Trust Layer) & Phase 2 (Proactive Departure Nudges)

document.addEventListener('DOMContentLoaded', () => {
  let attendanceData = null;
  let targetPercentage = 75;
  let manualOverrides = {};
  let lastSyncTimestamp = null;
  let activePortalName = 'Rishiverse';
  let freshnessInterval = null;

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

  // Initialize
  init();

  function init() {
    loadStoredOverrides();

    // Load storage
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
        if (res.manualOverrides) {
          manualOverrides = res.manualOverrides;
        }
        if (res.lastSync) {
          lastSyncTimestamp = res.lastSync;
        }
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

      // Listen for reactive storage updates across extension tabs
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== 'local') return;
        const engine = window.BunkrEngine || window.AttendMateEngine;
        if (changes.customTimetable) {
          if (engine) {
            engine.setActiveTimetable(changes.customTimetable.newValue || null);
          }
          renderTodayClasses();
          if (attendanceData) {
            renderAll();
          }
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
      if (connectionStatus) {
        connectionStatus.textContent = '🟢 Rishiverse Preview Data';
      }
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

    // Start 15s ticker for freshness
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

  function updateFreshnessText() {
    const text = formatFreshness(lastSyncTimestamp, activePortalName);
    if (popupFreshness) {
      popupFreshness.textContent = `🕒 ${text}`;
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
      return {
        ...subj,
        isManualOverride: false
      };
    });
  }

  function queryActiveTab() {
    if (typeof chrome === 'undefined' || !chrome.tabs) return;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (!activeTab || !activeTab.id) return;

      const url = activeTab.url || '';
      const isCanvas = /instructure\.com|canvas/i.test(url);
      const isLms = /rishiverse|rishihood|instructure|canvas/i.test(url);

      if (isCanvas) {
        activePortalName = 'Canvas';
        connectionStatus.textContent = '🎓 Canvas Attendance Connected';
      } else if (isLms) {
        activePortalName = 'Rishiverse';
        connectionStatus.textContent = '🟢 Rishiverse Connected';
      } else {
        if (!attendanceData) {
          connectionStatus.textContent = 'Offline Demo / Portal';
        }
      }
      updateFreshnessText();
    });
  }

  function renderAll() {
    if (!attendanceData || !attendanceData.overall) {
      subjectList.innerHTML = `<div style="text-align:center; padding:20px; font-size:12px; color:#94A3B8;">No attendance data yet.<br>Open your Rishiverse or Canvas portal and click Sync.</div>`;
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

    // Summary Card
    overallPct.textContent = `${overallPctVal.toFixed(1)}%`;
    overallPct.style.color = status.color;
    overallStatusPill.textContent = status.text;
    overallStatusPill.style.background = status.bg;
    overallStatusPill.style.color = status.color;
    overallStatusPill.style.border = `1px solid ${status.borderColor}`;

    overallProgressFill.style.width = `${Math.min(100, overallPctVal)}%`;
    overallProgressFill.style.background = status.color;

    statAttended.textContent = totalAttended;
    statTotal.textContent = totalHeld;
    statMissed.textContent = Math.max(0, totalHeld - totalAttended);

    // Drift banner check
    if (attendanceData.drift && attendanceData.drift.drifted) {
      if (popupDriftAlert) {
        popupDriftAlert.style.display = 'block';
        if (popupDriftSub) {
          popupDriftSub.textContent = `${attendanceData.drift.reason || 'Page structure changed'} • Showing last known data`;
        }
      }
    } else {
      if (popupDriftAlert) popupDriftAlert.style.display = 'none';
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
      subjectList.innerHTML = `<div style="text-align:center; padding:24px 16px; font-size:12px; color:var(--am-label-tertiary);">No matching courses</div>`;
      return;
    }

    subjectList.innerHTML = filtered.map((s) => {
      const math = window.BunkrMath || window.AttendMateMath;
      const status = math.getAttendanceStatus(s.attended, s.total, targetPercentage);
      const manualTag = s.isManualOverride
        ? `<span class="manual-tag">✏️ Manual</span><button class="reset-action-btn" data-subj="${s.name}" title="Reset to scraped values">Reset</button>`
        : '';
      return `
        <div class="subject-item">
          <div class="subj-item-header">
            <span class="subj-item-title" title="${s.name}">${s.name} ${manualTag}</span>
            <div style="display:flex; align-items:center; gap:6px;">
              <span class="subj-item-pct">${s.percentage.toFixed(1)}%</span>
              <button class="edit-action-btn" data-subj="${s.name}" data-att="${s.attended}" data-tot="${s.total}" title="Override attendance counts">✏️</button>
            </div>
          </div>
          <div class="subj-item-bottom">
            <span>${s.attended} of ${s.total} classes</span>
            <span class="status-pill ${status.type}" style="background:${status.bg}; color:${status.color};">
              ${status.text}
            </span>
          </div>
        </div>
      `;
    }).join('');

    subjectList.querySelectorAll('.edit-action-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const subjName = btn.getAttribute('data-subj');
        const curAtt = btn.getAttribute('data-att');
        const curTot = btn.getAttribute('data-tot');

        const newAtt = prompt(`[Manual Override] Attended classes for:\n${subjName}`, curAtt);
        if (newAtt === null) return;
        const newTot = prompt(`[Manual Override] Total held classes for:\n${subjName}`, curTot);
        if (newTot === null) return;

        const attNum = parseInt(newAtt, 10);
        const totNum = parseInt(newTot, 10);

        if (isNaN(attNum) || isNaN(totNum) || totNum <= 0 || attNum < 0) {
          alert('Please enter valid positive numbers.');
          return;
        }
        if (attNum > totNum) {
          alert('Attended classes cannot exceed total held classes.');
          return;
        }

        saveManualOverride(subjName, attNum, totNum);
      });
    });

    subjectList.querySelectorAll('.reset-action-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const subjName = btn.getAttribute('data-subj');
        resetManualOverride(subjName);
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
    if (semTitleEl) semTitleEl.textContent = `${summary.semesterTitle} Ends: ${summary.endDateFormatted}`;
    if (semStatsEl) semStatsEl.textContent = `${summary.teachingDaysLeft} teaching days remaining • ${summary.totalClassesLeft} scheduled classes`;

    if (!subjects || subjects.length === 0) {
      forecastList.innerHTML = `<div style="text-align:center; padding:20px; font-size:12px; color:#94A3B8;">No courses to forecast yet.</div>`;
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

      let badgeBg, badgeColor, badgeText;
      if (attainable) {
        if (canBunk > 0) {
          badgeBg = 'rgba(16, 185, 129, 0.15)';
          badgeColor = '#34D399';
          badgeText = `Can bunk ${canBunk} of ${remaining}`;
        } else {
          badgeBg = 'rgba(245, 158, 11, 0.15)';
          badgeColor = '#FBBF24';
          badgeText = `Need all ${remaining} left`;
        }
      } else {
        const maxPct = ((s.attended + remaining) / finalTotal) * 100;
        badgeBg = 'rgba(239, 68, 68, 0.15)';
        badgeColor = '#F87171';
        badgeText = `Deficit (Max: ${maxPct.toFixed(1)}%)`;
      }

      return `
        <div class="subject-item">
          <div class="subj-item-header">
            <span class="subj-item-title" title="${s.name}">${s.name}</span>
            <span class="subj-item-pct" style="color:${badgeColor}; font-size:11px;">${badgeText}</span>
          </div>
          <div class="subj-item-bottom">
            <span>${remaining} classes left till ${summary.endDateFormatted}</span>
            <span style="font-size:11px; color:#94A3B8;">Must attend: ${mustAttend}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  function populateSimulatorSelect(subjects) {
    simSubjectSelect.innerHTML = `
      <option value="all">🌟 Overall (All Courses)</option>
      ${(subjects || []).map((s) => `
        <option value="${s.id || s.name}">${s.name} (${s.percentage.toFixed(1)}%)</option>
      `).join('')}
    `;
    simSubjectSelect.value = simSubjectId;
  }

  function updateSimulation() {
    if (!attendanceData) return;

    let curAttended, curTotal;
    const effectiveSubjects = applyOverridesToSubjects(attendanceData.subjects || []);

    if (simSubjectId === 'all') {
      let totAtt = 0, totHeld = 0;
      effectiveSubjects.forEach((s) => {
        totAtt += s.attended;
        totHeld += s.total;
      });
      curAttended = totAtt;
      curTotal = totHeld;
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
      targetPercentage: targetPercentage
    });

    simValAttend.textContent = simAttend;
    simValBunk.textContent = simBunk;

    simProjectedPct.textContent = `${sim.projectedPercentage.toFixed(1)}%`;
    simProjectedPct.style.color = sim.isAboveTarget ? '#10B981' : '#EF4444';

    const deltaSign = sim.percentageDelta >= 0 ? '+' : '';
    simDeltaBadge.textContent = `${deltaSign}${sim.percentageDelta.toFixed(1)}%`;
    simDeltaBadge.style.background = sim.percentageDelta >= 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)';
    simDeltaBadge.style.color = sim.percentageDelta >= 0 ? '#10B981' : '#EF4444';

    if (sim.newBunkable > 0) {
      simAdviceText.innerHTML = `🎉 Can safely bunk <strong>${sim.newBunkable}</strong> more classes!`;
    } else if (sim.newNeeded > 0) {
      simAdviceText.innerHTML = `⚠️ Must attend <strong>${sim.newNeeded}</strong> classes to recover target.`;
    } else {
      simAdviceText.innerHTML = `⚖️ Exactly on track.`;
    }
  }

  function setupTabs() {
    document.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach((p) => p.classList.remove('active'));
        btn.classList.add('active');
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

    document.getElementById('sim-inc-attend').addEventListener('click', () => {
      simAttend++;
      updateSimulation();
    });

    document.getElementById('sim-dec-attend').addEventListener('click', () => {
      simAttend = Math.max(0, simAttend - 1);
      updateSimulation();
    });

    document.getElementById('sim-inc-bunk').addEventListener('click', () => {
      simBunk++;
      updateSimulation();
    });

    document.getElementById('sim-dec-bunk').addEventListener('click', () => {
      simBunk = Math.max(0, simBunk - 1);
      updateSimulation();
    });
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
      listEl.innerHTML = `<div class="popup-trip-row"><span>No scheduled classes in range</span><strong>0 missed</strong></div>`;
      return;
    }

    listEl.innerHTML = plan.affectedCourses.map((c) => {
      const color = c.safeAfter ? '#10B981' : '#EF4444';
      return `
        <div class="popup-trip-row">
          <span><strong>${c.acronym}</strong> (-${c.missed})</span>
          <span style="color:${color}; font-weight:700;">${c.beforePct.toFixed(0)}% → ${c.afterPct.toFixed(1)}%</span>
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
    let list = Array.isArray(storedAssignments) ? storedAssignments : [];
    let urgent = list
      .filter((a) => a && a.dueAt && !a.submitted)
      .map((a) => ({
        title: a.title || a.name || 'Assignment',
        dueMs: new Date(a.dueAt).getTime()
      }))
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
    badge.textContent = String(urgent.length);
    itemsEl.innerHTML = urgent.map((u) => {
      const hrs = Math.max(1, Math.round((u.dueMs - nowMs) / 3600000));
      return `<div class="popup-deadline-row"><span>${u.title}</span><small>in ${hrs}h</small></div>`;
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
            if (tabs[0]?.id) {
              chrome.tabs.sendMessage(tabs[0].id, { type: 'OPEN_DRAWER' });
            }
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
                      connectionStatus.textContent = 'Synced Just Now';
                      renderAll();
                    }
                  });
                }, 600);
              });
            }
          });
        } else {
          lastSyncTimestamp = Date.now();
          connectionStatus.textContent = '🟢 Preview Synced';
          renderAll();
        }
      });
    }

    // One-Click Diagnostics
    if (diagBtn) {
      diagBtn.addEventListener('click', () => {
        const now = new Date();
        const effectiveSubjects = attendanceData?.subjects ? applyOverridesToSubjects(attendanceData.subjects) : [];
        const overrideKeys = Object.keys(manualOverrides);

        let diag = `### Bunkr Diagnostics (v2.4.1)\n`;
        diag += `- **Generated**: ${now.toISOString()} (${now.toLocaleTimeString()})\n`;
        diag += `- **Active Portal**: ${activePortalName}\n`;
        diag += `- **Last Sync**: ${lastSyncTimestamp ? new Date(lastSyncTimestamp).toISOString() : 'Never'}\n`;
        diag += `- **Freshness**: ${formatFreshness(lastSyncTimestamp, activePortalName)}\n`;
        diag += `- **Scrape Status**: ${attendanceData?.drift?.drifted ? `⚠️ Drift Alert (${attendanceData.drift.reason})` : '✅ Clean Scrape'}\n`;
        diag += `- **Nudge System**: ${nudgesEnabled ? `Enabled (${nudgeLeadMinutes}m lead time)` : 'Disabled'}\n`;
        diag += `- **Target Attendance**: ${targetPercentage}%\n`;
        diag += `- **Active Overrides**: ${overrideKeys.length} courses overridden\n\n`;

        diag += `#### Tracked Courses\n`;
        if (effectiveSubjects.length === 0) {
          diag += `*No courses currently tracked.*\n`;
        } else {
          effectiveSubjects.forEach((s, idx) => {
            const tag = s.isManualOverride ? `[MANUAL OVERRIDE: was ${s.scrapedAttended}/${s.scrapedTotal}]` : `[SCRAPED]`;
            diag += `${idx + 1}. **${s.name}**: ${s.attended}/${s.total} (${s.percentage.toFixed(1)}%) ${tag}\n`;
          });
        }

        navigator.clipboard.writeText(diag).then(() => {
          const orig = diagBtn.innerHTML;
          diagBtn.innerHTML = '✅ Copied!';
          diagBtn.style.color = '#10B981';
          setTimeout(() => {
            diagBtn.innerHTML = orig;
            diagBtn.style.color = '';
          }, 2000);
        }).catch(() => {
          prompt('Diagnostics (Copy below):', diag);
        });
      });
    }

    // Phase 3: Copy Status for WhatsApp
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
            const orig = copyStatusBtn.innerHTML;
            copyStatusBtn.innerHTML = '✓ Copied to Clipboard!';
            copyStatusBtn.style.background = '#047857';
            setTimeout(() => {
              copyStatusBtn.innerHTML = orig;
              copyStatusBtn.style.background = '#059669';
            }, 2000);
          }).catch(() => {
            prompt('Copy WhatsApp Attendance Status:', shareText);
          });
        } else {
          prompt('Copy WhatsApp Attendance Status:', shareText);
        }
      });
    }

    // Export Backup
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const backupData = {
          bunkr_backup_version: '2.4.1',
          attendmate_backup_version: '2.4.1',
          exported_at: new Date().toISOString(),
          targetPercentage,
          manualOverrides,
          cachedAttendance: attendanceData,
          lastSync: lastSyncTimestamp,
          nudgesEnabled,
          nudgeLeadMinutes,
          settings: {
            autoInject: true,
            theme: 'system'
          }
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

    // Restore Backup
    if (restoreBtn && restoreFileInput) {
      restoreBtn.addEventListener('click', () => {
        restoreFileInput.click();
      });

      restoreFileInput.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target.result);
            if (!data || typeof data !== 'object') throw new Error('Invalid JSON format');

            if (data.targetPercentage) {
              targetPercentage = parseFloat(data.targetPercentage) || 75;
              updateTargetUI();
            }

            if (data.manualOverrides && typeof data.manualOverrides === 'object') {
              manualOverrides = data.manualOverrides;
              localStorage.setItem('bunkr_manual_overrides', JSON.stringify(manualOverrides));
              localStorage.setItem('attendmate_manual_overrides', JSON.stringify(manualOverrides));
            }

            if (data.nudgesEnabled !== undefined) {
              nudgesEnabled = Boolean(data.nudgesEnabled);
              if (popupNudgeToggle) popupNudgeToggle.checked = nudgesEnabled;
            }

            if (data.nudgeLeadMinutes) {
              nudgeLeadMinutes = parseInt(data.nudgeLeadMinutes, 10) || 10;
              updateLeadUI();
            }

            if (data.cachedAttendance) {
              attendanceData = data.cachedAttendance;
            }

            if (data.lastSync) {
              lastSyncTimestamp = data.lastSync;
            }

            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
              chrome.storage.local.set({
                targetPercentage,
                manualOverrides,
                cachedAttendance: attendanceData,
                lastSync: lastSyncTimestamp,
                nudgesEnabled,
                nudgeLeadMinutes
              });
            }

            renderAll();
            notifyTabsOfOverride();

            const orig = restoreBtn.innerHTML;
            restoreBtn.innerHTML = '✅ Restored!';
            restoreBtn.style.color = '#10B981';
            setTimeout(() => {
              restoreBtn.innerHTML = orig;
              restoreBtn.style.color = '';
            }, 2000);
          } catch (err) {
            alert('Failed to restore backup: ' + err.message);
          }
        };
        reader.readAsText(file);
      });
    }

    // Google Calendar 10m Alert Bar
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

        const origText = calSyncBtn.innerHTML;
        calSyncBtn.innerHTML = '✅ Downloaded .ics (10m Alerts)';
        setTimeout(() => {
          calSyncBtn.innerHTML = origText;
        }, 1800);
      });
    }
  }

  function updateLeadUI() {
    popupLeadBtns.forEach((btn) => {
      const lead = parseInt(btn.getAttribute('data-lead'), 10);
      btn.classList.toggle('active', lead === nudgeLeadMinutes);
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
        localStorage.setItem('attendmate_nudges_enabled', nudgesEnabled ? 'true' : 'false');
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
        localStorage.setItem('attendmate_nudge_lead_minutes', String(nudgeLeadMinutes));
      });
    });

    if (popupTestNudgeBtn) {
      popupTestNudgeBtn.addEventListener('click', () => {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({
            type: 'TEST_NUDGE',
            course: 'PSP',
            time: '13:30',
            room: 'A603'
          }, (res) => {
            const orig = popupTestNudgeBtn.innerHTML;
            popupTestNudgeBtn.innerHTML = '✅ Nudge Sent!';
            popupTestNudgeBtn.style.color = '#10B981';
            setTimeout(() => {
              popupTestNudgeBtn.innerHTML = orig;
              popupTestNudgeBtn.style.color = '';
            }, 2000);
          });
        }
      });
    }
  }

  function renderTodayClasses() {
    if (!popupTodayClasses) return;
    const now = new Date();
    const engine = window.BunkrEngine || window.AttendMateEngine;

    if (!engine) {
      popupTodayClasses.innerHTML = `<div style="text-align:center; padding:12px; color:#94A3B8; font-size:11px;">Timetable loading...</div>`;
      return;
    }

    if (engine.isDateInDiwaliBreak(now)) {
      popupTodayClasses.innerHTML = `<div style="text-align:center; padding:12px; color:#F59E0B; font-size:11px;">🌴 Diwali Break (Nov 6–13) &bull; No classes</div>`;
      return;
    }

    const activeTt = engine.getActiveTimetable ? engine.getActiveTimetable() : null;
    const hasSat = activeTt && activeTt.SLOTS && Object.values(activeTt.SLOTS).some(s => Array.isArray(s.slots) && s.slots.some(sl => sl.day === 6));
    if (now.getDay() === 0 || (!hasSat && now.getDay() === 6)) {
      popupTodayClasses.innerHTML = `<div style="text-align:center; padding:12px; color:#94A3B8; font-size:11px;">Weekend &bull; Zero scheduled classes</div>`;
      return;
    }

    const classesToday = engine.getTodaysClasses(now);
    if (classesToday.length === 0) {
      popupTodayClasses.innerHTML = `<div style="text-align:center; padding:12px; color:#94A3B8; font-size:11px;">No classes scheduled for today.</div>`;
      return;
    }

    popupTodayClasses.innerHTML = classesToday.map((c) => {
      return `
        <div class="subject-item" style="padding: 7px 10px; margin-bottom: 5px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <strong style="color: #60A5FA; font-size: 12px; margin-right: 6px;">${c.time}</strong>
              <span style="font-weight: 600; font-size: 12px; color: #F1F5F9;">${c.acronym}</span>
            </div>
            <span style="font-size: 11px; background: rgba(255,255,255,0.08); padding: 2px 6px; border-radius: 4px; color: #94A3B8;">${c.room || 'Room TBA'}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderPopupProjection(effectiveSubjects) {
    const engine = window.BunkrEngine || window.AttendMateEngine;
    if (!engine) return;

    const isStale = Boolean(attendanceData?.drift?.drifted);
    const proj = engine.calculateSemesterProjection(effectiveSubjects, {
      now: new Date(),
      targetPercentage,
      overrides: manualOverrides,
      drift: attendanceData?.drift,
      isStale
    });

    const paceEl = document.getElementById('popup-proj-pace');
    const maxEl = document.getElementById('popup-proj-max');
    const remEl = document.getElementById('popup-proj-rem');
    const staleTag = document.getElementById('popup-proj-stale-tag');
    const coachPill = document.getElementById('popup-coach-pill');

    if (paceEl) paceEl.textContent = `${proj.overallPacePct.toFixed(1)}%`;
    if (maxEl) maxEl.textContent = `${proj.overallMaxPct.toFixed(1)}%`;
    if (remEl) remEl.textContent = `${proj.totalRemainingSessions}`;

    if (staleTag) {
      staleTag.style.display = proj.isStale ? 'inline-block' : 'none';
    }

    if (coachPill) {
      if (proj.atRiskCourses.length === 0) {
        coachPill.textContent = 'Silence (Healthy)';
        coachPill.className = 'popup-coach-pill';
        coachPill.title = proj.coachHealthySummary;
      } else {
        coachPill.textContent = `${proj.atRiskCourses.length} below target`;
        coachPill.className = 'popup-coach-pill warning';
        coachPill.title = proj.atRiskCourses.map((c) => `${c.acronym}: ${c.callout}`).join('\n');
      }
    }
  }

  // Open Command Center Schedule Customizer
  const popupScheduleBtn = document.getElementById('popup-schedule-btn');
  if (popupScheduleBtn) {
    popupScheduleBtn.addEventListener('click', () => {
      if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
        chrome.tabs.create({ url: chrome.runtime.getURL('newtab/newtab.html?modal=schedule') });
      } else {
        window.location.href = '../newtab/newtab.html?modal=schedule';
      }
    });
  }
});
