// extension/schedule/upload.js
// Dedicated Full-Tab Schedule Studio for Bunkr v2.4.1

document.addEventListener('DOMContentLoaded', () => {
  const scheduleStatusBanner = document.getElementById('schedule-status-banner');
  const scheduleStatusText = document.getElementById('schedule-status-text');
  const scheduleResetBtn = document.getElementById('schedule-reset-btn');
  const scheduleDropZone = document.getElementById('schedule-drop-zone');
  const scheduleFileInput = document.getElementById('schedule-file-input');
  const schedulePasteToggleBtn = document.getElementById('schedule-paste-toggle-btn');
  const schedulePasteBox = document.getElementById('schedule-paste-box');
  const schedulePasteInput = document.getElementById('schedule-paste-input');
  const scheduleParsePasteBtn = document.getElementById('schedule-parse-paste-btn');
  const scheduleLoading = document.getElementById('schedule-loading');
  const scheduleLoadingMsg = document.getElementById('schedule-loading-msg');
  const scheduleErrorAlert = document.getElementById('schedule-error-alert');
  const scheduleSuccessAlert = document.getElementById('schedule-success-alert');
  const schedulePreviewSection = document.getElementById('schedule-preview-section');
  const scheduleSummaryStats = document.getElementById('schedule-summary-stats');
  const weeklyPreviewGrid = document.getElementById('weekly-preview-grid');
  const scheduleSaveBtn = document.getElementById('schedule-save-btn');
  const scheduleAddSlotBtn = document.getElementById('schedule-add-slot-btn');
  const scheduleUndoBtn = document.getElementById('schedule-undo-btn');
  const scheduleNeedsReviewBanner = document.getElementById('schedule-needs-review-banner');
  const courseHarmonizationCard = document.getElementById('course-harmonization-card');
  const harmonizationList = document.getElementById('harmonization-list');
  const harmonizationSummaryBadge = document.getElementById('harmonization-summary-badge');
  const harmonizationNote = document.getElementById('harmonization-note');

  // Slot Modal Elements
  const slotModal = document.getElementById('slot-modal');
  const slotModalTitle = document.getElementById('slot-modal-title');
  const slotModalIcon = document.getElementById('slot-modal-icon');
  const slotModalClose = document.getElementById('slot-modal-close');
  const slotModalCancel = document.getElementById('slot-modal-cancel');
  const slotEditorForm = document.getElementById('slot-editor-form');
  const slotFormError = document.getElementById('slot-form-error');
  const slotFormDay = document.getElementById('slot-form-day');
  const slotFormName = document.getElementById('slot-form-name');
  const slotFormStart = document.getElementById('slot-form-start');
  const slotFormEnd = document.getElementById('slot-form-end');
  const slotFormRoom = document.getElementById('slot-form-room');
  const slotFormSubmit = document.getElementById('slot-form-submit');
  const scheduleToast = document.getElementById('schedule-toast');

  let pendingTimetable = null;
  const timetableHistory = [];
  let toastTimer = null;
  let editingSlot = null;

  function hideAlerts() {
    if (scheduleLoading) scheduleLoading.style.display = 'none';
    if (scheduleErrorAlert) scheduleErrorAlert.style.display = 'none';
    if (scheduleSuccessAlert) scheduleSuccessAlert.style.display = 'none';
  }

  function showToast(message, withUndo = false) {
    if (!scheduleToast) return;
    clearTimeout(toastTimer);
    if (withUndo) {
      scheduleToast.innerHTML = `<span>${message}</span><button id="toast-undo-action" class="action-btn secondary" style="font-size:10px; padding:2px 8px; margin-left:6px; background:rgba(255,255,255,0.15);">Undo</button>`;
      const undoAction = document.getElementById('toast-undo-action');
      if (undoAction) {
        undoAction.onclick = (e) => {
          e.stopPropagation();
          handleUndo();
          scheduleToast.style.display = 'none';
        };
      }
    } else {
      scheduleToast.innerHTML = `<span>${message}</span>`;
    }
    scheduleToast.style.display = 'flex';
    toastTimer = setTimeout(() => {
      scheduleToast.style.display = 'none';
    }, 3500);
  }

  function saveToHistory() {
    if (pendingTimetable) {
      timetableHistory.push(JSON.parse(JSON.stringify(pendingTimetable)));
      if (timetableHistory.length > 30) {
        timetableHistory.shift();
      }
      updateUndoButton();
    }
  }

  function updateUndoButton() {
    if (scheduleUndoBtn) {
      const canUndo = timetableHistory.length > 0 && pendingTimetable !== null;
      scheduleUndoBtn.style.display = canUndo ? 'inline-block' : 'none';
      if (canUndo) {
        scheduleUndoBtn.title = `Undo last change (${timetableHistory.length} in history) [Ctrl+Z]`;
      }
    }
  }

  function handleUndo() {
    if (timetableHistory.length === 0) return;
    const previous = timetableHistory.pop();
    pendingTimetable = previous;
    recalcTimetableStats(pendingTimetable);
    renderWeeklyPreview(pendingTimetable);
    if (scheduleSaveBtn) scheduleSaveBtn.style.display = 'inline-block';
    updateUndoButton();
    showToast('↩️ Undid last modification');
  }

  function openSlotModal(mode, data = {}) {
    if (!slotModal) return;
    if (slotFormError) slotFormError.style.display = 'none';
    [slotFormDay, slotFormName, slotFormStart, slotFormEnd, slotFormRoom].forEach(el => {
      if (el) el.classList.remove('invalid');
    });

    if (mode === 'edit') {
      editingSlot = data;
      if (slotModalTitle) slotModalTitle.textContent = 'Edit Class Slot';
      if (slotModalIcon) slotModalIcon.textContent = '✏️';
      if (slotFormDay) slotFormDay.value = String(data.day || 1);
      if (slotFormName) slotFormName.value = data.name || '';
      if (slotFormStart) slotFormStart.value = data.time || '';
      if (slotFormEnd) slotFormEnd.value = data.endTime || '';
      if (slotFormRoom) slotFormRoom.value = data.room || '';
      if (slotFormSubmit) slotFormSubmit.textContent = 'Save Changes';
    } else {
      editingSlot = null;
      if (slotModalTitle) slotModalTitle.textContent = 'Add Class Slot';
      if (slotModalIcon) slotModalIcon.textContent = '➕';
      if (slotFormDay) slotFormDay.value = String(data.day || 1);
      if (slotFormName) slotFormName.value = '';
      if (slotFormStart) slotFormStart.value = data.time || '';
      if (slotFormEnd) slotFormEnd.value = data.endTime || '';
      if (slotFormRoom) slotFormRoom.value = '';
      if (slotFormSubmit) slotFormSubmit.textContent = 'Add Slot';
    }

    slotModal.style.display = 'flex';
    setTimeout(() => {
      if (slotFormName) slotFormName.focus();
    }, 60);
  }

  function closeSlotModal() {
    if (slotModal) slotModal.style.display = 'none';
    editingSlot = null;
  }

  function initializeBlankCustomTimetable() {
    if (!pendingTimetable) {
      const defTt = window.BunkrTimetable || window.AttendMateTimetable;
      pendingTimetable = defTt
        ? JSON.parse(JSON.stringify(defTt))
        : { custom: true, SLOTS: {}, weeklySessionsCount: 0, subjectsCount: 0 };
      pendingTimetable.custom = true;
    }
    renderWeeklyPreview(pendingTimetable);
    if (scheduleSaveBtn) scheduleSaveBtn.style.display = 'inline-block';
  }

  function setupWorkspace(custom) {
    if (custom && custom.SLOTS) {
      pendingTimetable = JSON.parse(JSON.stringify(custom));
      scheduleStatusBanner.className = 'schedule-banner custom';
      scheduleStatusText.innerHTML = `🗓️ <strong>Custom Schedule Active</strong> &bull; ${custom.weeklySessionsCount || 0} classes/week (${custom.subjectsCount || 0} subjects)`;
      if (scheduleResetBtn) scheduleResetBtn.style.display = 'inline-block';
      renderWeeklyPreview(pendingTimetable);
      if (scheduleSaveBtn) scheduleSaveBtn.style.display = 'inline-block';
    } else {
      pendingTimetable = null;
      scheduleStatusBanner.className = 'schedule-banner';
      scheduleStatusText.innerHTML = `🏛️ <strong>Default Schedule Active</strong> &bull; B.Tech CSE (DS) Sem 1 (21 classes/week, 8 subjects)`;
      if (scheduleResetBtn) scheduleResetBtn.style.display = 'none';
      if (scheduleSaveBtn) scheduleSaveBtn.style.display = 'none';
      const defTimetable = window.BunkrTimetable || window.AttendMateTimetable;
      if (defTimetable) {
        renderWeeklyPreview(defTimetable);
      }
    }
    updateUndoButton();
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function renderWeeklyPreview(timetable) {
    if (!schedulePreviewSection || !weeklyPreviewGrid || !timetable || !timetable.SLOTS) return;
    schedulePreviewSection.style.display = 'block';

    const dayNums = [1, 2, 3, 4, 5];
    const hasSat = Object.values(timetable.SLOTS).some(s => Array.isArray(s.slots) && s.slots.some(sl => sl.day === 6));
    if (hasSat) dayNums.push(6);

    const dayNames = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' };

    let totalSlots = 0;
    let lowConfidenceCount = 0;

    const colsHtml = dayNums.map(dNum => {
      const daySlots = [];
      for (const [key, subj] of Object.entries(timetable.SLOTS)) {
        if (!Array.isArray(subj.slots)) continue;
        for (const slot of subj.slots) {
          if (slot.day === dNum) {
            const hasConf = slot.confidence !== undefined && slot.confidence !== null;
            const isLowConf = (hasConf && slot.confidence < 0.8) || Boolean(slot.needsReview);
            if (isLowConf) lowConfidenceCount++;

            daySlots.push({
              key,
              subjectName: subj.name,
              acronym: subj.acronym || key.toUpperCase(),
              time: slot.time,
              endTime: slot.endTime || '',
              room: slot.room || '',
              confidence: slot.confidence,
              isLowConf
            });
          }
        }
      }
      daySlots.sort((a, b) => a.time.localeCompare(b.time));
      totalSlots += daySlots.length;

      const itemsHtml = daySlots.length === 0
        ? `<div style="font-size: 11px; color: #64748B; text-align: center; padding: 12px 0;">No classes</div>`
        : daySlots.map((s) => {
          const reviewBadge = s.isLowConf
            ? `<div class="badge-needs-review" title="Confidence: ${s.confidence !== undefined ? Math.round(s.confidence * 100) + '%' : 'Low'}">⚠️ Needs Review</div>`
            : '';
          return `
          <div class="slot-item ${s.isLowConf ? 'needs-review' : ''}">
            ${reviewBadge}
            <div class="slot-time">
              <span>${s.time}${s.endTime ? ' - ' + s.endTime : ''}</span>
              <span class="slot-room">${s.room || 'TBA'}</span>
            </div>
            <div class="slot-name">${escapeHtml(s.subjectName)}</div>
            <div class="slot-actions">
              <button class="slot-btn edit-slot" data-day="${dNum}" data-time="${s.time}" data-endtime="${s.endTime}" data-name="${escapeHtml(s.subjectName)}" data-room="${escapeHtml(s.room)}" data-key="${s.key}" title="Edit this slot">✏️</button>
              <button class="slot-btn del-slot" data-day="${dNum}" data-time="${s.time}" data-key="${s.key}" title="Remove this slot">🗑️</button>
            </div>
          </div>
        `;
        }).join('');

      return `
        <div class="day-col">
          <div class="day-col-header">
            <span>${dayNames[dNum]}</span>
            <span style="font-size: 10px; background: rgba(255,255,255,0.06); padding: 1px 5px; border-radius: 4px;">${daySlots.length}</span>
          </div>
          ${itemsHtml}
        </div>
      `;
    }).join('');

    weeklyPreviewGrid.innerHTML = colsHtml;

    if (scheduleSummaryStats) {
      scheduleSummaryStats.textContent = `${totalSlots} sessions/week • ${Object.keys(timetable.SLOTS).length} subjects`;
    }

    // Render Needs Review Banner
    if (scheduleNeedsReviewBanner) {
      if (lowConfidenceCount > 0) {
        scheduleNeedsReviewBanner.style.display = 'flex';
        scheduleNeedsReviewBanner.innerHTML = `
          <span style="font-size: 16px;">⚠️</span>
          <div>
            <strong>${lowConfidenceCount} class slot${lowConfidenceCount === 1 ? '' : 's'} flagged for review:</strong>
            <span> Highlighted with amber border due to lower parser confidence (&lt;80%). Click ✏️ on any flagged slot to verify details before saving.</span>
          </div>
        `;
      } else {
        scheduleNeedsReviewBanner.style.display = 'none';
      }
    }

    // Bind slot actions
    weeklyPreviewGrid.querySelectorAll('.del-slot').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const d = parseInt(btn.getAttribute('data-day'), 10);
        const t = btn.getAttribute('data-time');
        const k = btn.getAttribute('data-key');
        deleteSlot(d, t, k);
      });
    });

    weeklyPreviewGrid.querySelectorAll('.edit-slot').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const d = parseInt(btn.getAttribute('data-day'), 10);
        const t = btn.getAttribute('data-time');
        const endt = btn.getAttribute('data-endtime') || '';
        const name = btn.getAttribute('data-name') || '';
        const room = btn.getAttribute('data-room') || '';
        const k = btn.getAttribute('data-key');
        openSlotModal('edit', { day: d, time: t, endTime: endt, name, room, key: k });
      });
    });

    renderCourseHarmonization(timetable);
    updateUndoButton();
  }

  async function renderCourseHarmonization(timetable) {
    if (!courseHarmonizationCard || !harmonizationList || !timetable || !timetable.SLOTS) {
      if (courseHarmonizationCard) courseHarmonizationCard.style.display = 'none';
      return;
    }

    const detectedCourses = Object.values(timetable.SLOTS);
    if (detectedCourses.length === 0) {
      courseHarmonizationCard.style.display = 'none';
      return;
    }

    let enrolledCourses = [];
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      try {
        const stored = await chrome.storage.local.get(['cachedAttendance', 'bunkrData', 'attendmateData']);
        const att = stored.cachedAttendance || stored.bunkrData || stored.attendmateData || {};
        if (Array.isArray(att.subjects)) enrolledCourses = att.subjects;
      } catch (e) {}
    }

    const defaultSyllabus = [
      { name: 'Problem Solving with Python', code: 'PSP' },
      { name: 'Web Application Development', code: 'WAD' },
      { name: 'Social & Historical Communication', code: 'COM' },
      { name: 'Linear Algebra & Calculus', code: 'MAT' },
      { name: 'Applied Physics & Semiconductor', code: 'ENG' },
      { name: 'Environmental Sciences', code: 'EVS' },
      { name: 'Computer Networks & Protocols', code: 'CN' },
      { name: 'Data Structures & Algorithms', code: 'DSA' },
      { name: 'Operating Systems', code: 'OS' },
      { name: 'Database Management Systems', code: 'DBMS' },
      { name: 'Cloud Computing', code: 'CC' }
    ];

    const referenceList = enrolledCourses.length > 0 ? enrolledCourses : defaultSyllabus;

    let matchedCount = 0;
    let unmatchedCount = 0;

    const rowsHtml = detectedCourses.map(course => {
      const cName = (course.name || '').trim();
      const cAcronym = (course.acronym || course.key || '').toUpperCase();
      const normName = cName.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();

      let matchedRef = null;
      for (const ref of referenceList) {
        const rName = (ref.name || '').trim();
        const rCode = (ref.code || ref.acronym || '').trim();
        const normRefName = rName.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();

        if (rCode && (rCode.toUpperCase() === cAcronym || rCode.toLowerCase() === course.key.toLowerCase())) {
          matchedRef = ref;
          break;
        }
        if (normName && normRefName && (normName === normRefName || normName.includes(normRefName) || normRefName.includes(normName))) {
          matchedRef = ref;
          break;
        }
      }

      const sessionsCount = Array.isArray(course.slots) ? course.slots.length : (course.sessionsPerWeek || 0);

      if (matchedRef) {
        matchedCount++;
        return `
          <div class="harmonization-row">
            <div style="display:flex; align-items:center; gap:8px;">
              <strong style="color: #F8FAFC;">${escapeHtml(cName)}</strong>
              <span style="font-size:10px; color:#94A3B8; background:rgba(255,255,255,0.06); padding:1px 5px; border-radius:4px;">${escapeHtml(cAcronym)}</span>
              <span style="font-size:11px; color:#64748B;">&bull; ${sessionsCount} session${sessionsCount === 1 ? '' : 's'}/wk</span>
            </div>
            <span class="badge-matched">✓ Matched: ${escapeHtml(matchedRef.name || matchedRef.code)}</span>
          </div>
        `;
      } else {
        unmatchedCount++;
        return `
          <div class="harmonization-row">
            <div style="display:flex; align-items:center; gap:8px;">
              <strong style="color: #F8FAFC;">${escapeHtml(cName)}</strong>
              <span style="font-size:10px; color:#94A3B8; background:rgba(255,255,255,0.06); padding:1px 5px; border-radius:4px;">${escapeHtml(cAcronym)}</span>
              <span style="font-size:11px; color:#64748B;">&bull; ${sessionsCount} session${sessionsCount === 1 ? '' : 's'}/wk</span>
            </div>
            <span class="badge-unmatched">⚠️ Unmatched (Custom Course)</span>
          </div>
        `;
      }
    }).join('');

    harmonizationList.innerHTML = rowsHtml;
    if (harmonizationSummaryBadge) {
      harmonizationSummaryBadge.textContent = `${matchedCount} matched • ${unmatchedCount} unmatched`;
      harmonizationSummaryBadge.style.color = unmatchedCount > 0 ? '#FBBF24' : '#34D399';
    }

    if (harmonizationNote) {
      if (unmatchedCount > 0) {
        harmonizationNote.style.display = 'block';
        harmonizationNote.innerHTML = `ℹ️ <strong>${unmatchedCount} course${unmatchedCount === 1 ? '' : 's'} not matched to standard curriculum:</strong> These will be tracked locally as custom courses. You can edit course names above using ✏️ if you wish to align them with ERP subject titles.`;
      } else {
        harmonizationNote.style.display = 'none';
      }
    }

    courseHarmonizationCard.style.display = 'block';
  }

  function deleteSlot(day, time, key) {
    if (!pendingTimetable || !pendingTimetable.SLOTS[key]) return;
    saveToHistory();
    const removedName = pendingTimetable.SLOTS[key].name || key;
    pendingTimetable.SLOTS[key].slots = pendingTimetable.SLOTS[key].slots.filter(s => !(s.day === day && s.time === time));
    if (pendingTimetable.SLOTS[key].slots.length === 0) {
      delete pendingTimetable.SLOTS[key];
    }
    recalcTimetableStats(pendingTimetable);
    renderWeeklyPreview(pendingTimetable);
    if (scheduleSaveBtn) scheduleSaveBtn.style.display = 'inline-block';
    showToast(`Removed slot from "${removedName}"`, true);
  }

  function recalcTimetableStats(tt) {
    if (!tt || !tt.SLOTS) return;
    let total = 0;
    for (const k of Object.keys(tt.SLOTS)) {
      tt.SLOTS[k].sessionsPerWeek = tt.SLOTS[k].slots ? tt.SLOTS[k].slots.length : 0;
      total += tt.SLOTS[k].sessionsPerWeek;
    }
    tt.weeklySessionsCount = total;
    tt.subjectsCount = Object.keys(tt.SLOTS).length;
  }

  function renderUploadErrorWithFallback(errorMessage, sourceName = '') {
    if (!scheduleErrorAlert) return;
    scheduleErrorAlert.style.display = 'block';
    scheduleErrorAlert.innerHTML = `
      <div style="font-weight: 700; margin-bottom: 4px;">❌ Could not extract schedule${sourceName ? ` from "${escapeHtml(sourceName)}"` : ''}</div>
      <div style="font-size: 11.5px; opacity: 0.95; margin-bottom: 10px;">${escapeHtml(errorMessage || 'No class sessions could be identified.')}</div>
      <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 6px;">
        <button id="fallback-paste-btn" type="button" class="action-btn secondary" style="font-size: 11px; padding: 4px 10px; background: rgba(255,255,255,0.12);">📝 Paste Schedule Text Instead</button>
        <button id="fallback-manual-btn" type="button" class="action-btn secondary" style="font-size: 11px; padding: 4px 10px; background: rgba(255,255,255,0.12);">✍️ Enter Classes Manually</button>
        <button id="fallback-browse-btn" type="button" class="action-btn secondary" style="font-size: 11px; padding: 4px 10px; background: rgba(255,255,255,0.12);">📁 Choose Another File</button>
      </div>
    `;

    const pasteBtn = document.getElementById('fallback-paste-btn');
    if (pasteBtn && schedulePasteBox) {
      pasteBtn.onclick = () => {
        schedulePasteBox.style.display = 'block';
        if (schedulePasteToggleBtn) schedulePasteToggleBtn.textContent = '✕ Hide Text Paste';
        if (schedulePasteInput) {
          schedulePasteInput.focus();
          schedulePasteBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      };
    }

    const manualBtn = document.getElementById('fallback-manual-btn');
    if (manualBtn) {
      manualBtn.onclick = () => {
        initializeBlankCustomTimetable();
        openSlotModal('add');
      };
    }

    const browseBtn = document.getElementById('fallback-browse-btn');
    if (browseBtn && scheduleFileInput) {
      browseBtn.onclick = () => {
        scheduleFileInput.click();
      };
    }
  }

  async function handleScheduleUpload(file) {
    if (!file) return;

    hideAlerts();
    if (schedulePreviewSection) schedulePreviewSection.style.display = 'none';
    if (scheduleSaveBtn) scheduleSaveBtn.style.display = 'none';
    pendingTimetable = null;

    if (scheduleLoading) {
      scheduleLoading.style.display = 'block';
      scheduleLoadingMsg.textContent = `Analyzing ${file.name}... Extracting timetable...`;
    }

    try {
      const parser = window.BunkrScheduleParser || window.AttendMateScheduleParser;
      if (!parser) throw new Error('Schedule parser module is not loaded.');

      let enrolledCourses = [];
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const stored = await chrome.storage.local.get(['cachedAttendance', 'bunkrData', 'attendmateData']);
        const att = stored.cachedAttendance || stored.bunkrData || stored.attendmateData || {};
        if (Array.isArray(att.subjects)) enrolledCourses = att.subjects;
      }

      const parsed = await parser.parseSchedule(file, {
        fileName: file.name,
        enrolledCourses
      });

      pendingTimetable = parsed;
      if (scheduleLoading) scheduleLoading.style.display = 'none';

      if (scheduleSuccessAlert) {
        scheduleSuccessAlert.style.display = 'block';
        scheduleSuccessAlert.textContent = `✅ Successfully extracted ${parsed.weeklySessionsCount} sessions across ${parsed.subjectsCount} subjects! Review the schedule below and click 'Save & Apply'.`;
      }

      renderWeeklyPreview(pendingTimetable);
      if (scheduleSaveBtn) scheduleSaveBtn.style.display = 'inline-block';

    } catch (err) {
      if (scheduleLoading) scheduleLoading.style.display = 'none';
      if (schedulePreviewSection) schedulePreviewSection.style.display = 'none';
      if (scheduleSaveBtn) scheduleSaveBtn.style.display = 'none';
      pendingTimetable = null;
      renderUploadErrorWithFallback(err.message || 'Could not parse schedule file.', file.name);
    }
  }

  // Dropzone & File Input
  if (scheduleDropZone && scheduleFileInput) {
    scheduleDropZone.addEventListener('click', () => scheduleFileInput.click());
    scheduleFileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) handleScheduleUpload(file);
    });

    scheduleDropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      scheduleDropZone.classList.add('dragover');
    });

    scheduleDropZone.addEventListener('dragleave', () => {
      scheduleDropZone.classList.remove('dragover');
    });

    scheduleDropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      scheduleDropZone.classList.remove('dragover');
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) handleScheduleUpload(file);
    });
  }

  // Text Paste
  if (schedulePasteToggleBtn && schedulePasteBox) {
    schedulePasteToggleBtn.addEventListener('click', () => {
      const isHidden = schedulePasteBox.style.display === 'none';
      schedulePasteBox.style.display = isHidden ? 'block' : 'none';
      schedulePasteToggleBtn.textContent = isHidden ? '✕ Hide Text Paste' : '📝 Paste Schedule Text';
    });
  }

  if (scheduleParsePasteBtn && schedulePasteInput) {
    scheduleParsePasteBtn.addEventListener('click', async () => {
      const text = schedulePasteInput.value.trim();
      if (!text) return;

      hideAlerts();
      if (schedulePreviewSection) schedulePreviewSection.style.display = 'none';
      if (scheduleSaveBtn) scheduleSaveBtn.style.display = 'none';
      pendingTimetable = null;

      try {
        const parser = window.BunkrScheduleParser || window.AttendMateScheduleParser;
        if (!parser) throw new Error('Schedule parser module is not loaded.');

        const parsed = await parser.parseSchedule(text, { fileName: 'pasted_schedule.txt' });
        pendingTimetable = parsed;
        if (scheduleSuccessAlert) {
          scheduleSuccessAlert.style.display = 'block';
          scheduleSuccessAlert.textContent = `✅ Parsed ${parsed.weeklySessionsCount} sessions across ${parsed.subjectsCount} subjects! Review below.`;
        }
        renderWeeklyPreview(pendingTimetable);
        if (scheduleSaveBtn) scheduleSaveBtn.style.display = 'inline-block';
      } catch (err) {
        if (schedulePreviewSection) schedulePreviewSection.style.display = 'none';
        if (scheduleSaveBtn) scheduleSaveBtn.style.display = 'none';
        pendingTimetable = null;
        renderUploadErrorWithFallback(err.message, 'pasted text');
      }
    });
  }

  // Add slot button
  if (scheduleAddSlotBtn) {
    scheduleAddSlotBtn.addEventListener('click', () => {
      if (!pendingTimetable) {
        initializeBlankCustomTimetable();
      }
      openSlotModal('add');
    });
  }

  // Undo button
  if (scheduleUndoBtn) {
    scheduleUndoBtn.addEventListener('click', handleUndo);
  }

  // Modal Form Submit
  if (slotEditorForm) {
    slotEditorForm.addEventListener('submit', (e) => {
      e.preventDefault();

      if (slotFormError) slotFormError.style.display = 'none';
      [slotFormDay, slotFormName, slotFormStart, slotFormEnd, slotFormRoom].forEach(el => {
        if (el) el.classList.remove('invalid');
      });

      const day = parseInt(slotFormDay.value, 10);
      const name = (slotFormName.value || '').trim();
      const start = (slotFormStart.value || '').trim();
      const end = (slotFormEnd.value || '').trim();
      const room = (slotFormRoom.value || '').trim().toUpperCase();

      if (isNaN(day) || day < 1 || day > 6) {
        showSlotFormError('Please select a valid day of the week (Monday–Saturday).', slotFormDay);
        return;
      }
      if (!name) {
        showSlotFormError('Course Name cannot be empty.', slotFormName);
        return;
      }
      if (!start || !/^([01]\d|2[0-3]):[0-5]\d$/.test(start)) {
        showSlotFormError('Start time must be a valid 24-hour time (HH:MM).', slotFormStart);
        return;
      }
      if (!end || !/^([01]\d|2[0-3]):[0-5]\d$/.test(end)) {
        showSlotFormError('End time must be a valid 24-hour time (HH:MM).', slotFormEnd);
        return;
      }
      if (end <= start) {
        showSlotFormError('End time must be strictly after start time.', slotFormEnd);
        return;
      }

      saveToHistory();

      if (!pendingTimetable) {
        initializeBlankCustomTimetable();
      }

      if (editingSlot && editingSlot.key && pendingTimetable.SLOTS[editingSlot.key]) {
        pendingTimetable.SLOTS[editingSlot.key].slots = pendingTimetable.SLOTS[editingSlot.key].slots.filter(
          s => !(s.day === editingSlot.day && s.time === editingSlot.time)
        );
        if (pendingTimetable.SLOTS[editingSlot.key].slots.length === 0) {
          delete pendingTimetable.SLOTS[editingSlot.key];
        }
      }

      let targetKey = null;
      for (const [k, subj] of Object.entries(pendingTimetable.SLOTS)) {
        if (subj.name && subj.name.toLowerCase() === name.toLowerCase()) {
          targetKey = k;
          break;
        }
      }
      if (!targetKey) {
        targetKey = name.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 14) || 'class';
        let baseKey = targetKey;
        let c = 1;
        while (pendingTimetable.SLOTS[targetKey] && pendingTimetable.SLOTS[targetKey].name.toLowerCase() !== name.toLowerCase()) {
          targetKey = `${baseKey}-${c++}`;
        }
      }

      if (!pendingTimetable.SLOTS[targetKey]) {
        pendingTimetable.SLOTS[targetKey] = {
          key: targetKey,
          name: name,
          acronym: name.split(/\s+/).map(w => w[0]).join('').slice(0, 6).toUpperCase() || targetKey.toUpperCase(),
          slots: []
        };
      } else {
        pendingTimetable.SLOTS[targetKey].name = name;
      }

      pendingTimetable.SLOTS[targetKey].slots.push({
        day,
        time: start,
        endTime: end,
        room: room || 'TBA',
        confidence: 1.0,
        needsReview: false
      });

      recalcTimetableStats(pendingTimetable);
      closeSlotModal();
      renderWeeklyPreview(pendingTimetable);
      if (scheduleSaveBtn) scheduleSaveBtn.style.display = 'inline-block';
      showToast(editingSlot ? `Updated ${name}` : `Added ${name}`);
    });
  }

  function showSlotFormError(msg, focusEl) {
    if (slotFormError) {
      slotFormError.textContent = `❌ ${msg}`;
      slotFormError.style.display = 'block';
    }
    if (focusEl) {
      focusEl.classList.add('invalid');
      focusEl.focus();
    }
  }

  if (slotModalClose) slotModalClose.addEventListener('click', closeSlotModal);
  if (slotModalCancel) slotModalCancel.addEventListener('click', closeSlotModal);
  if (slotModal) {
    slotModal.addEventListener('click', (e) => {
      if (e.target === slotModal) closeSlotModal();
    });
  }

  // Keyboard shortcut Ctrl+Z / Cmd+Z for Undo
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      const activeEl = document.activeElement;
      const isInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');
      const isSlotModalOpen = slotModal && slotModal.style.display !== 'none';
      if (!isSlotModalOpen && !isInput && timetableHistory.length > 0) {
        e.preventDefault();
        handleUndo();
      }
    }
    if (e.key === 'Escape') {
      if (slotModal && slotModal.style.display !== 'none') {
        closeSlotModal();
      }
    }
  });

  // Save Schedule Button
  if (scheduleSaveBtn) {
    scheduleSaveBtn.addEventListener('click', () => {
      if (!pendingTimetable) return;
      pendingTimetable.custom = true;
      pendingTimetable.savedAt = new Date().toISOString();

      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ customTimetable: pendingTimetable }, () => {
          const engine = window.BunkrEngine || window.AttendMateEngine;
          if (engine) engine.setActiveTimetable(pendingTimetable);
          setupWorkspace(pendingTimetable);
          showToast('✅ Schedule saved and applied across Bunkr!');
          alert('✅ Custom timetable successfully saved and applied! Your departure nudges, countdowns, and projections will now use your schedule.');
        });
      } else {
        const engine = window.BunkrEngine || window.AttendMateEngine;
        if (engine) engine.setActiveTimetable(pendingTimetable);
        setupWorkspace(pendingTimetable);
        showToast('✅ Schedule applied locally');
      }
    });
  }

  // Reset Schedule Button
  if (scheduleResetBtn) {
    scheduleResetBtn.addEventListener('click', () => {
      if (!confirm('Reset your schedule to the default B.Tech CSE Semester 1 timetable?')) return;
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.remove('customTimetable', () => {
          const engine = window.BunkrEngine || window.AttendMateEngine;
          if (engine) engine.setActiveTimetable(null);
          setupWorkspace(null);
          showToast('Schedule reset to default');
        });
      } else {
        const engine = window.BunkrEngine || window.AttendMateEngine;
        if (engine) engine.setActiveTimetable(null);
        setupWorkspace(null);
        showToast('Schedule reset to default');
      }
    });
  }

  // Initial Load from chrome.storage
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['customTimetable'], (res) => {
      setupWorkspace(res.customTimetable);
    });
  } else {
    setupWorkspace(null);
  }
});
