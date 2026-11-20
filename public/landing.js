// Bunkr Launch & Interactive Showcase Controller
// Powered directly by BunkrTimetable, BunkrEngine, and BunkrMath

document.addEventListener('DOMContentLoaded', () => {
  const engine = window.BunkrEngine || window.AttendMateEngine;
  const math = window.BunkrMath || window.AttendMateMath;
  const ttLib = window.BunkrTimetable || window.AttendMateTimetable;

  if (!engine || !math || !ttLib) return;

  const INITIAL_COURSES = [
    { id: 'psp', name: 'Problem Solving and Programming', code: 'CSD02C1002', section: 'Sec-A', attended: 34, total: 41, excusedPct: 0 },
    { id: 'social', name: 'Social Communication I', code: 'RSPRFC1003', section: 'Sec-A', attended: 19, total: 21, excusedPct: 10 },
    { id: 'kpmg', name: 'KPMG/Edept Workshop Certification Program', code: 'CSDS-2601', section: 'Sec-B', attended: 1, total: 3, excusedPct: 0 },
    { id: 'wad', name: 'Web Application Development I', code: 'CSD02C1003', section: 'Sec-A', attended: 36, total: 40, excusedPct: 0 },
    { id: 'cfn', name: 'Computer fundamentals and networking', code: 'CSD02C1004', section: 'Sec-A', attended: 19, total: 22, excusedPct: 0 },
    { id: 'society', name: 'Self and Society I', code: 'RSPRFC1002', section: 'Sec-A', attended: 9, total: 10, excusedPct: 0 }
  ];

  let courses = INITIAL_COURSES.map((c) => ({ ...c }));
  let targetPct = 75;
  let activePresetId = 'cse-ds-sec-a';
  let activeTimetable = ttLib.getPreset(activePresetId);
  let lastTripPlan = null;

  // Dynamic semester summary line in hero
  const semSummaryEl = document.getElementById('hero-sem-summary');
  if (semSummaryEl && typeof engine.getRemainingTeachingSummary === 'function') {
    const summary = engine.getRemainingTeachingSummary(new Date(), activeTimetable);
    semSummaryEl.textContent = `${summary.teachingDaysLeft} teaching days · ${summary.totalClassesLeft} sessions left till ${summary.endDateFormatted}`;
  }

  // =========================================================================
  // 1. Hero Interactive Rishiverse Card Preview
  // =========================================================================
  function renderHeroPreview() {
    const cardsEl = document.getElementById('hero-preview-cards');
    const overallPctEl = document.getElementById('hero-overall-pct');
    const overallCountsEl = document.getElementById('hero-overall-counts');
    if (!cardsEl) return;

    let totalAtt = 0;
    let totalHeld = 0;
    courses.forEach((c) => {
      totalAtt += c.attended;
      totalHeld += c.total;
    });

    const overallPct = totalHeld > 0 ? (totalAtt / totalHeld) * 100 : 0;
    if (overallPctEl) {
      overallPctEl.textContent = `${overallPct.toFixed(1)}%`;
      overallPctEl.style.color = overallPct >= targetPct ? '#059669' : '#C81E2B';
    }
    if (overallCountsEl) {
      overallCountsEl.textContent = `${totalAtt}/${totalHeld} attended · Target ${targetPct}%`;
    }

    // Show top 3 contrasting courses in the compact hero window (safe, excused, at-risk)
    const featured = courses.slice(0, 3);
    const radius = 19;
    const circumference = 2 * Math.PI * radius;

    cardsEl.innerHTML = featured.map((c) => {
      const pct = c.total > 0 ? (c.attended / c.total) * 100 : 0;
      const canBunk = engine.calculateBunkableClasses(c.attended, c.total, targetPct);
      const needed = engine.calculateClassesNeeded(c.attended, c.total, targetPct);
      const excusedRec = engine.calculateExcusedRecovery(c.attended, c.total, targetPct);
      const isSafe = pct >= targetPct;
      const ringColor = isSafe ? '#059669' : '#C81E2B';
      const clamped = Math.max(0, Math.min(100, pct));
      const dashOffset = circumference * (1 - clamped / 100);

      let primaryMsg = '';
      if (isSafe) {
        primaryMsg = canBunk > 0
          ? `Safe to skip ${canBunk} class${canBunk === 1 ? '' : 'es'}`
          : `On the ${targetPct}% edge — attend next`;
      } else {
        primaryMsg = `Attend next ${needed} to hit ${targetPct}%`;
      }

      let secondaryMsg = '';
      if (c.excusedPct > 0) {
        secondaryMsg = `Includes ${c.excusedPct}% excused`;
      } else if (!isSafe && excusedRec.neededExcused > 0) {
        secondaryMsg = `${excusedRec.neededExcused} medical/duty leave recovers ${targetPct}%`;
      } else {
        secondaryMsg = `${c.attended}/${c.total} held`;
      }

      return `
        <div class="sim-course-card">
          <div class="sim-course-top">
            <div class="sim-course-left">
              <div class="sim-ring-wrap" aria-label="${pct.toFixed(0)} percent attendance">
                <svg class="sim-ring-svg" viewBox="0 0 46 46">
                  <circle class="sim-ring-track" cx="23" cy="23" r="${radius}"></circle>
                  <circle class="sim-ring-arc" cx="23" cy="23" r="${radius}" stroke="${ringColor}" stroke-dasharray="${circumference.toFixed(2)}" stroke-dashoffset="${dashOffset.toFixed(2)}"></circle>
                </svg>
                <span class="sim-ring-label">${Math.round(pct)}%</span>
              </div>
              <div class="sim-course-text">
                <div class="sim-course-name">${c.name}</div>
                <div class="sim-course-meta mono">${c.section} · ${c.code} · ${c.attended}/${c.total}</div>
              </div>
            </div>
            <div class="sim-course-controls">
              <button type="button" class="mini-btn attend" data-action="attend" data-id="${c.id}" aria-label="Attend one more class of ${c.name}">+1 Attend</button>
              <button type="button" class="mini-btn bunk" data-action="bunk" data-id="${c.id}" aria-label="Bunk one class of ${c.name}">+1 Bunk</button>
            </div>
          </div>
          <div class="sim-course-strip ${isSafe ? 'safe' : 'danger'}">
            <span>${primaryMsg}</span>
            <span class="mono" style="font-size:11.5px; opacity:0.9;">${secondaryMsg}</span>
          </div>
        </div>
      `;
    }).join('');

    cardsEl.querySelectorAll('button[data-action]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const action = btn.getAttribute('data-action');
        const target = courses.find((c) => c.id === id);
        if (!target) return;
        target.total += 1;
        if (action === 'attend') target.attended += 1;
        renderHeroPreview();
        renderTripPlayground();
        renderShareCardStudio();
      });
    });
  }

  document.querySelectorAll('#hero-target-switcher button').forEach((btn) => {
    btn.addEventListener('click', () => {
      targetPct = parseInt(btn.getAttribute('data-target'), 10) || 75;
      document.querySelectorAll('#hero-target-switcher button').forEach((b) => b.classList.toggle('active', b === btn));
      renderHeroPreview();
      renderTripPlayground();
      renderShareCardStudio();
    });
  });

  const resetBtn = document.getElementById('hero-reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      courses = INITIAL_COURSES.map((c) => ({ ...c }));
      renderHeroPreview();
      renderTripPlayground();
      renderShareCardStudio();
    });
  }

  // =========================================================================
  // 2. Interactive Trip & Leave Planner Playground
  // =========================================================================
  const startInput = document.getElementById('lp-trip-start');
  const endInput = document.getElementById('lp-trip-end');
  const excusedCheck = document.getElementById('lp-trip-excused');

  function formatIso(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function setTripDays(days) {
    const start = new Date();
    start.setDate(start.getDate() + 1);
    const end = new Date(start);
    end.setDate(end.getDate() + Math.max(0, days - 1));
    if (startInput) startInput.value = formatIso(start);
    if (endInput) endInput.value = formatIso(end);
  }

  setTripDays(3);

  function renderTripPlayground() {
    const verdictBar = document.getElementById('lp-trip-verdict');
    const verdictTitle = document.getElementById('lp-verdict-title');
    const verdictSub = document.getElementById('lp-verdict-sub');
    const verdictMeta = document.getElementById('lp-verdict-meta');
    const tbody = document.getElementById('lp-trip-tbody');
    if (!verdictBar || !tbody || !startInput || !endInput) return;

    const plan = engine.simulateLeavePlan(courses, startInput.value, endInput.value, {
      targetPercentage: targetPct,
      timetable: activeTimetable,
      excusedLeaves: excusedCheck && excusedCheck.checked ? 1 : 0
    });
    lastTripPlan = plan;

    if (!plan.valid) {
      verdictBar.className = 'verdict-bar danger';
      verdictTitle.textContent = plan.error || 'Choose a valid date range';
      verdictSub.textContent = '';
      verdictMeta.textContent = '';
      tbody.innerHTML = '';
      return;
    }

    verdictBar.className = `verdict-bar ${plan.verdictTone}`;
    verdictTitle.textContent = plan.verdict;
    verdictSub.textContent = `Overall attendance shifts from ${plan.overallBeforePct.toFixed(1)}% to ${plan.overallAfterPct.toFixed(1)}% (${plan.overallDeltaPct >= 0 ? '+' : ''}${plan.overallDeltaPct.toFixed(1)}%) against ${targetPct}% target.`;
    verdictMeta.textContent = `${plan.totalMissedSessions} classes · ${plan.teachingDaysMissed} teaching day${plan.teachingDaysMissed === 1 ? '' : 's'}`;

    if (plan.affectedCourses.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="color:var(--ink-muted); text-align:center; padding:18px;">No scheduled classes fall between ${plan.startLabel} and ${plan.endLabel} (weekend or campus break).</td></tr>`;
      return;
    }

    tbody.innerHTML = plan.affectedCourses.map((c) => {
      const color = c.safeAfter ? '#059669' : '#C81E2B';
      const statusText = c.safeAfter
        ? (c.excusedApplied > 0 ? `Safe (${c.excusedApplied} excused applied)` : `Safe above ${targetPct}%`)
        : (c.excusedLeavesToSave > 0
          ? `Drops below ${targetPct}% — needs ${c.excusedLeavesToSave} excused or ${c.recoveryClasses} classes`
          : `Drops below ${targetPct}% — attend next ${c.recoveryClasses}`);
      return `
        <tr>
          <td><strong>${c.acronym}</strong> <span style="color:var(--ink-muted);">${c.name}</span></td>
          <td class="mono">-${c.missed}</td>
          <td class="mono" style="font-weight:700; color:${color};">${c.beforePct.toFixed(1)}% → ${c.afterPct.toFixed(1)}%</td>
          <td style="color:${color}; font-weight:600;">${statusText}</td>
        </tr>
      `;
    }).join('');
  }

  document.querySelectorAll('#lp-trip-presets button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const days = parseInt(btn.getAttribute('data-days'), 10) || 3;
      document.querySelectorAll('#lp-trip-presets button').forEach((b) => b.classList.toggle('active', b === btn));
      setTripDays(days);
      renderTripPlayground();
      renderShareCardStudio();
    });
  });

  [startInput, endInput, excusedCheck].forEach((el) => {
    if (el) {
      el.addEventListener('change', () => {
        if (el !== excusedCheck) {
          document.querySelectorAll('#lp-trip-presets button').forEach((b) => b.classList.remove('active'));
        }
        renderTripPlayground();
        renderShareCardStudio();
      });
    }
  });

  const copyTripBtn = document.getElementById('lp-trip-copy');
  if (copyTripBtn) {
    copyTripBtn.addEventListener('click', () => {
      if (!lastTripPlan || !lastTripPlan.valid) return;
      const shareText = engine.generateTripShareText(lastTripPlan);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareText).then(() => {
          const orig = copyTripBtn.textContent;
          copyTripBtn.textContent = 'Copied for WhatsApp!';
          setTimeout(() => { copyTripBtn.textContent = orig; }, 1800);
        }).catch(() => {});
      }
    });
  }

  // =========================================================================
  // 3. Batch Timetable Share Code Generator & Live Decoder
  // =========================================================================
  const presetTabsEl = document.getElementById('lp-preset-tabs');
  const codeDisplayEl = document.getElementById('lp-batch-code-display');
  const presetMetaEl = document.getElementById('lp-preset-meta');
  const copyCodeBtn = document.getElementById('lp-copy-code-btn');
  const decodeInput = document.getElementById('lp-decode-input');
  const decodeBtn = document.getElementById('lp-decode-btn');
  const decodeResult = document.getElementById('lp-decode-result');

  function renderBatchCodeSection() {
    if (!presetTabsEl || !codeDisplayEl) return;
    const presets = Object.values(ttLib.BATCH_PRESETS || {});

    presetTabsEl.innerHTML = presets.map((p) => (
      `<button type="button" class="section-tab ${p.id === activePresetId ? 'active' : ''}" data-preset-id="${p.id}">${p.label}</button>`
    )).join('');

    presetTabsEl.querySelectorAll('[data-preset-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        activePresetId = btn.getAttribute('data-preset-id');
        activeTimetable = ttLib.getPreset(activePresetId);
        renderBatchCodeSection();
        renderTripPlayground();
        renderShareCardStudio();
      });
    });

    const totalWeekly = Object.values(activeTimetable.SLOTS || {}).reduce((acc, s) => acc + (s.slots ? s.slots.length : 0), 0);
    const subjCount = Object.keys(activeTimetable.SLOTS || {}).length;
    if (presetMetaEl) {
      presetMetaEl.textContent = `${activeTimetable.section} · ${subjCount} subjects · ${totalWeekly} sessions/wk`;
    }
    const code = engine.encodeBatchCode(activeTimetable);
    codeDisplayEl.textContent = code;
    if (decodeInput && !decodeInput.value) {
      decodeInput.value = code;
    }
  }

  if (copyCodeBtn) {
    copyCodeBtn.addEventListener('click', () => {
      const code = engine.encodeBatchCode(activeTimetable);
      if (decodeInput) decodeInput.value = code;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(() => {
          const orig = copyCodeBtn.textContent;
          copyCodeBtn.textContent = 'Copied!';
          setTimeout(() => { copyCodeBtn.textContent = orig; }, 1600);
        }).catch(() => {});
      }
    });
  }

  if (decodeBtn && decodeInput && decodeResult) {
    decodeBtn.addEventListener('click', () => {
      const res = engine.decodeBatchCode(decodeInput.value);
      if (!res.ok) {
        decodeResult.className = 'decode-result err';
        decodeResult.textContent = res.error;
        return;
      }
      decodeResult.className = 'decode-result ok';
      decodeResult.textContent = `Verified: ${res.timetable.program} (${res.timetable.section}) · ${res.timetable.subjectsCount} subjects · ${res.timetable.weeklySessionsCount} weekly sessions ready to import.`;
    });
  }

  // =========================================================================
  // 4. Shareable Safe Bunk Card Studio
  // =========================================================================
  const shareCardLib = window.BunkrShareCard;
  const shareCanvas = document.getElementById('lp-share-canvas');
  const shareIncludeTrip = document.getElementById('lp-card-include-trip');
  const shareDownloadBtn = document.getElementById('lp-card-download');
  const shareCopyBtn = document.getElementById('lp-card-copy');
  const shareFeedback = document.getElementById('lp-card-feedback');
  let shareCardTheme = 'obsidian';

  function renderShareCardStudio() {
    if (!shareCardLib || !shareCanvas) return;
    const sectionText = activeTimetable && activeTimetable.program
      ? `${activeTimetable.program} · ${activeTimetable.section || 'Sec-A'}`
      : 'B.Tech CSE · Sec-A';
    const model = shareCardLib.buildShareCardModel({
      subjects: courses,
      targetPercentage: targetPct,
      sectionLabel: sectionText,
      semesterLabel: 'Diwali Semester 2026',
      tripPlan: lastTripPlan,
      includeTrip: Boolean(shareIncludeTrip && shareIncludeTrip.checked)
    });
    shareCardLib.renderShareCardCanvas(shareCanvas, model, shareCardTheme);
    const frame = shareCanvas.parentElement;
    if (frame) {
      frame.style.background = shareCardTheme === 'ivory' ? '#E5E7EB' : '#090B10';
    }
  }

  document.querySelectorAll('#lp-card-theme button').forEach((btn) => {
    btn.addEventListener('click', () => {
      shareCardTheme = btn.getAttribute('data-card-theme') || 'obsidian';
      document.querySelectorAll('#lp-card-theme button').forEach((b) => b.classList.toggle('active', b === btn));
      renderShareCardStudio();
    });
  });

  if (shareIncludeTrip) {
    shareIncludeTrip.addEventListener('change', renderShareCardStudio);
  }

  if (shareDownloadBtn && shareCardLib && shareCanvas) {
    shareDownloadBtn.addEventListener('click', () => {
      shareCardLib.downloadShareCardPng(shareCanvas, `Bunkr_SafeCard_${shareCardTheme}.png`);
      if (shareFeedback) {
        shareFeedback.textContent = 'Downloaded 2x Retina PNG card.';
        setTimeout(() => { shareFeedback.textContent = ''; }, 2400);
      }
    });
  }

  if (shareCopyBtn && shareCardLib && shareCanvas) {
    shareCopyBtn.addEventListener('click', async () => {
      const ok = await shareCardLib.copyShareCardImage(shareCanvas);
      if (shareFeedback) {
        shareFeedback.textContent = ok
          ? 'Card image copied to clipboard.'
          : 'Clipboard image copy unavailable — use Download PNG.';
        setTimeout(() => { shareFeedback.textContent = ''; }, 2600);
      }
    });
  }

  // Initial renders
  renderHeroPreview();
  renderTripPlayground();
  renderBatchCodeSection();
  renderShareCardStudio();
});
