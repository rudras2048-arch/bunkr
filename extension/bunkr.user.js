// ==UserScript==
// @name         Bunkr - Rishiverse & Canvas Attendance & Bunk Calculator
// @namespace    https://github.com/attendmate
// @version      2.4.1
// @description  Smart Bunk Calculator, Attendance Tracker & What-If Simulator for Rishihood University (rishihood.rishiverse.com) and Canvas LMS. Phase 3: Coach & Share.
// @author       Bunkr Team
// @match        *://rishihood.rishiverse.com/*
// @match        *://*.rishiverse.com/*
// @match        *://rishiverse.rishihood.edu.in/*
// @match        *://*.rishihood.edu.in/*
// @match        *://*.instructure.com/*
// @match        *://localhost/*
// @match        *://127.0.0.1/*
// @match        file:///*
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // Inject Stylesheet
  const css = `
/* ==========================================================================
   Bunkr 2.4.1 — Seamless Inline Integration (Rishiverse & Canvas)
   Phase 1: Never Silently Wrong
   ========================================================================== */

#attendmate-fab, #attendmate-overlay, #attendmate-drawer {
  display: none !important;
}

.attendmate-col-header {
  color: #000000 !important;
  background-color: transparent !important;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif !important;
  font-size: 13px !important;
  font-weight: 800 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.02em !important;
  padding: 12px 14px !important;
  white-space: nowrap !important;
  text-align: left !important;
  vertical-align: middle !important;
  border-bottom: 2px solid #CBD5E1 !important;
}

.attendmate-miss-cell {
  color: #000000 !important;
  background-color: transparent !important;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif !important;
  font-size: 15px !important;
  font-weight: 800 !important;
  letter-spacing: -0.01em !important;
  padding: 14px !important;
  vertical-align: middle !important;
  white-space: nowrap !important;
  line-height: 1.2 !important;
  border-bottom: 1px solid #E2E8F0 !important;
}

.attendmate-miss-cell .am-num {
  font-size: 17px !important;
  font-weight: 900 !important;
  color: #000000 !important;
}

.attendmate-miss-cell.safe { color: #000000 !important; }
.attendmate-miss-cell.warning { color: #B45309 !important; }
.attendmate-miss-cell.deficit { color: #B91C1C !important; }

.attendmate-miss-badge {
  display: inline-flex !important;
  flex-direction: column !important;
  align-items: flex-start !important;
  gap: 2px !important;
  margin-top: 8px !important;
  padding: 6px 12px !important;
  background-color: #F8FAFC !important;
  border: 1px solid #E2E8F0 !important;
  border-radius: 8px !important;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif !important;
  font-size: 13px !important;
  font-weight: 700 !important;
  color: #0F172A !important;
  line-height: 1.3 !important;
  user-select: none !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04) !important;
}

.attendmate-miss-badge.safe { background-color: #F0FDF4 !important; border-color: #BBF7D0 !important; color: #14532D !important; }
.attendmate-miss-badge.warning { background-color: #FFFBEB !important; border-color: #FDE68A !important; color: #78350F !important; }
.attendmate-miss-badge.deficit { background-color: #FEF2F2 !important; border-color: #FECACA !important; color: #7F1D1D !important; }

.attendmate-miss-badge .am-num { font-size: 15px !important; font-weight: 900 !important; }

.am-status-dot {
  display: inline-block !important;
  width: 7px !important;
  height: 7px !important;
  border-radius: 50% !important;
  margin-right: 6px !important;
  vertical-align: middle !important;
}

.am-status-dot.safe { background-color: #10B981 !important; }
.am-status-dot.warning { background-color: #F59E0B !important; }
.am-status-dot.deficit { background-color: #EF4444 !important; }

.am-badge-subtext {
  font-size: 11px !important;
  font-weight: 600 !important;
  opacity: 0.85 !important;
  margin-top: 1px !important;
}

#attendmate-page-banner {
  margin-bottom: 20px !important;
  padding: 12px 18px !important;
  background-color: #FFFFFF !important;
  border: 1px solid #E5E7EB !important;
  border-left: 4px solid #111827 !important;
  border-radius: 8px !important;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif !important;
  font-size: 13px !important;
  color: #000000 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03) !important;
}

.attendmate-banner-btn {
  background-color: #1D1D1F !important;
  color: #FFFFFF !important;
  border: none !important;
  border-radius: 6px !important;
  padding: 6px 14px !important;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif !important;
  font-size: 12px !important;
  font-weight: 600 !important;
  cursor: pointer !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 6px !important;
  line-height: 1.2 !important;
}

/* Freshness Tag */
.attendmate-freshness-tag {
  display: inline-flex !important;
  align-items: center !important;
  gap: 5px !important;
  font-size: 11.5px !important;
  font-weight: 500 !important;
  color: #64748B !important;
  background-color: #F1F5F9 !important;
  border: 1px solid #E2E8F0 !important;
  padding: 3px 8px !important;
  border-radius: 6px !important;
}

.attendmate-freshness-tag.stale {
  color: #B45309 !important;
  background-color: #FFFBEB !important;
  border-color: #FDE68A !important;
}

/* Drift Banner */
#attendmate-drift-banner {
  margin: 0 0 16px 0 !important;
  padding: 12px 18px !important;
  background-color: #FFFBEB !important;
  border: 1px solid #FCD34D !important;
  border-left: 5px solid #F59E0B !important;
  border-radius: 10px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 14px !important;
}

.am-drift-left { display: flex !important; align-items: center !important; gap: 12px !important; }
.am-drift-title { font-size: 13.5px !important; font-weight: 700 !important; color: #92400E !important; }
.am-drift-sub { font-size: 12px !important; color: #B45309 !important; margin-top: 2px !important; }
.am-drift-actions { display: flex !important; gap: 8px !important; }
.am-drift-btn {
  background-color: #FFFFFF !important;
  color: #78350F !important;
  border: 1px solid #FCD34D !important;
  border-radius: 6px !important;
  padding: 6px 12px !important;
  font-size: 11.5px !important;
  font-weight: 600 !important;
  cursor: pointer !important;
}
.am-drift-btn.primary { background-color: #D97706 !important; color: #FFFFFF !important; border-color: #D97706 !important; }

/* Manual Override Styling */
.am-manual-pill {
  display: inline-flex !important;
  align-items: center !important;
  font-size: 10px !important;
  font-weight: 700 !important;
  color: #4338CA !important;
  background-color: #EEF2FF !important;
  border: 1px solid #C7D2FE !important;
  padding: 2px 6px !important;
  border-radius: 4px !important;
  margin-left: 6px !important;
  text-transform: uppercase !important;
}

.attendmate-miss-badge.manual { border-color: #A5B4FC !important; background-color: #F5F3FF !important; }
.attendmate-miss-badge.manual .am-num { color: #4338CA !important; }

.am-edit-trigger { cursor: pointer !important; opacity: 0.6 !important; margin-left: 6px !important; }
.am-edit-trigger:hover { opacity: 1 !important; }

/* Override Popover */
.am-override-popover {
  position: fixed !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
  background-color: #FFFFFF !important;
  border: 1px solid #E2E8F0 !important;
  border-radius: 14px !important;
  box-shadow: 0 10px 25px rgba(0,0,0,0.2) !important;
  padding: 22px !important;
  z-index: 999999 !important;
  width: 340px !important;
  color: #0F172A !important;
}
.am-popover-backdrop {
  position: fixed !important;
  top: 0 !important; left: 0 !important;
  width: 100vw !important; height: 100vh !important;
  background: rgba(15, 23, 42, 0.45) !important;
  z-index: 999998 !important;
}
.am-popover-row {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  margin-bottom: 12px !important;
  font-size: 13px !important;
}
.am-popover-input {
  width: 75px !important;
  padding: 6px !important;
  border: 1px solid #CBD5E1 !important;
  border-radius: 6px !important;
  text-align: center !important;
  font-weight: 700 !important;
}
.am-btn-save { background: #4F46E5 !important; color: white !important; border: none !important; border-radius: 6px !important; padding: 7px 14px !important; cursor: pointer !important; font-weight: 600 !important; }
.am-btn-ghost { background: none !important; border: none !important; color: #64748B !important; cursor: pointer !important; }
.am-btn-reset { background: #FEF2F2 !important; border: 1px solid #FECACA !important; color: #B91C1C !important; border-radius: 6px !important; padding: 6px 10px !important; cursor: pointer !important; }

/* Safety pill */
#attendmate-safety-pill {
  position: fixed !important;
  bottom: 16px !important; right: 16px !important;
  background-color: #FEF2F2 !important;
  border: 1px solid #FCA5A5 !important;
  border-radius: 20px !important;
  padding: 6px 14px !important;
  font-size: 12px !important;
  color: #991B1B !important;
  display: flex !important; gap: 8px !important;
  z-index: 99999 !important;
}
`;

  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  let currentTargetPercentage = 75;
  try {
    const saved = localStorage.getItem('attendmate_target_percentage');
    if (saved) currentTargetPercentage = parseFloat(saved) || 75;
  } catch (e) {}

  let cachedData = null;
  let consecutiveErrors = 0;
  let isCircuitBroken = false;

  const timetableSlots = {
    'psp': [ { day: 1, time: '13:30', room: 'A603' }, { day: 2, time: '13:30', room: 'A408' }, { day: 3, time: '13:30', room: 'A603' }, { day: 4, time: '10:10', room: 'A603' } ],
    'wad': [ { day: 1, time: '15:30', room: 'A603' }, { day: 2, time: '15:30', room: 'A301' }, { day: 3, time: '15:30', room: 'A603' }, { day: 5, time: '13:30', room: 'A610' } ],
    'math': [ { day: 2, time: '09:00', room: 'A610' }, { day: 2, time: '11:20', room: 'A610' }, { day: 3, time: '09:00', room: 'A610' }, { day: 5, time: '10:10', room: 'A610' } ],
    'social': [ { day: 1, time: '10:10', room: 'RFP' }, { day: 2, time: '10:10', room: 'RFP' } ],
    'cfn': [ { day: 1, time: '11:20', room: 'A610' }, { day: 3, time: '11:20', room: 'A610' } ],
    'india': [ { day: 4, time: '09:00', room: 'RFP' }, { day: 5, time: '09:00', room: 'RFP' } ],
    'kpmg': [ { day: 4, time: '11:20', room: 'A603' }, { day: 5, time: '11:20', room: 'A610' } ],
    'society': [ { day: 3, time: '10:10', room: 'RFP' } ]
  };

  function matchSubjectKey(name) {
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

  function formatFreshness(timestamp, portalName = 'Rishiverse', now = Date.now()) {
    if (!timestamp) return 'Not yet synced';
    const ts = typeof timestamp === 'string' ? new Date(timestamp).getTime() : Number(timestamp);
    if (isNaN(ts) || ts <= 0) return 'Not yet synced';

    const diffSeconds = Math.max(0, Math.floor((now - ts) / 1000));
    let relativeStr = '';
    if (diffSeconds < 15) relativeStr = 'just now';
    else if (diffSeconds < 60) relativeStr = `${diffSeconds}s ago`;
    else {
      const mins = Math.floor(diffSeconds / 60);
      if (mins < 60) relativeStr = `${mins} min ago`;
      else relativeStr = `${Math.floor(mins / 60)} hr ago`;
    }
    return `Synced ${relativeStr} from ${portalName}`;
  }

  function getStoredOverrides() {
    try {
      const raw = localStorage.getItem('attendmate_manual_overrides');
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }

  function saveOverride(subjectKey, attended, total) {
    const overrides = getStoredOverrides();
    overrides[subjectKey.trim().toLowerCase()] = {
      attended: Math.max(0, parseInt(attended, 10) || 0),
      total: Math.max(1, parseInt(total, 10) || 1),
      updatedAt: Date.now()
    };
    try { localStorage.setItem('attendmate_manual_overrides', JSON.stringify(overrides)); } catch (e) {}
    if (cachedData) render(cachedData);
  }

  function resetOverride(subjectKey) {
    const overrides = getStoredOverrides();
    delete overrides[subjectKey.trim().toLowerCase()];
    try { localStorage.setItem('attendmate_manual_overrides', JSON.stringify(overrides)); } catch (e) {}
    if (cachedData) render(cachedData);
  }

  function applyOverrides(subjects) {
    const overrides = getStoredOverrides();
    return subjects.map((subj) => {
      const key1 = (subj.name || '').trim().toLowerCase();
      const key2 = (subj.code || '').trim().toLowerCase();
      const override = overrides[key1] || (key2 && overrides[key2]);
      if (override && typeof override.attended === 'number' && typeof override.total === 'number') {
        const attended = Math.max(0, override.attended);
        const total = Math.max(attended, override.total);
        return {
          ...subj,
          scrapedAttended: subj.scrapedAttended ?? subj.attended,
          scrapedTotal: subj.scrapedTotal ?? subj.total,
          attended,
          total,
          percentage: total > 0 ? (attended / total) * 100 : 0,
          isManualOverride: true
        };
      }
      return { ...subj, isManualOverride: false };
    });
  }

  function getDynamicRemainingClasses(subjectName, fromDate = new Date()) {
    const key = matchSubjectKey(subjectName);
    const slots = key ? timetableSlots[key] : null;
    const endDate = new Date(2026, 11, 18, 23, 59, 59);
    const diwaliStart = new Date(2026, 10, 6, 0, 0, 0);
    const diwaliEnd = new Date(2026, 10, 13, 23, 59, 59);

    let refDate = new Date(fromDate);
    if (refDate.getFullYear() !== 2026 || refDate > endDate) {
      refDate = new Date(2026, 10, Math.min(fromDate.getDate() || 3, 5), fromDate.getHours() || 10, fromDate.getMinutes() || 0);
    }

    if (!slots) {
      let count = 0, d = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate() + 1);
      while (d <= endDate) {
        if (!(d >= diwaliStart && d <= diwaliEnd)) {
          if (d.getDay() === 1 || d.getDay() === 3) count++;
        }
        d.setDate(d.getDate() + 1);
      }
      return Math.max(1, count);
    }

    let remainingCount = 0;
    const curYear = refDate.getFullYear(), curMonth = refDate.getMonth(), curDate = refDate.getDate(), curDay = refDate.getDay();
    const curTimeMinutes = refDate.getHours() * 60 + refDate.getMinutes();

    if (!(refDate >= diwaliStart && refDate <= diwaliEnd)) {
      for (const slot of slots) {
        if (slot.day === curDay) {
          const [h, m] = slot.time.split(':').map(Number);
          if (h * 60 + m > curTimeMinutes) remainingCount++;
        }
      }
    }

    let iter = new Date(curYear, curMonth, curDate + 1);
    while (iter <= endDate) {
      if (iter >= diwaliStart && iter <= diwaliEnd) { iter.setDate(iter.getDate() + 1); continue; }
      for (const slot of slots) { if (slot.day === iter.getDay()) remainingCount++; }
      iter.setDate(iter.getDate() + 1);
    }
    return remainingCount;
  }

  function calculateBunkWithDeficitRecovery(attended, totalHeld, remainingClasses, targetPercentage = currentTargetPercentage) {
    const finalTotal = totalHeld + remainingClasses;
    const minRequired = Math.ceil((targetPercentage / 100) * finalTotal);
    const mustAttend = Math.max(0, minRequired - attended);
    const canBunk = Math.max(0, remainingClasses - mustAttend);
    const isAttainable = mustAttend <= remainingClasses;
    const maxAttainableAttended = attended + remainingClasses;
    const maxAttainablePct = finalTotal > 0 ? (maxAttainableAttended / finalTotal) * 100 : 0;
    const shortfall = Math.max(0, mustAttend - remainingClasses);

    let statusText = '', badgeClass = '', advice = '', subText = '';
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
      subText = `Short by ${shortfall} class${shortfall === 1 ? '' : 'es'} • 1 excused/medical leave needed`;
      advice = `Short by ${shortfall} class${shortfall === 1 ? '' : 'es'}. Submitting 1 medical/duty leave reaches ${(Math.min(100, (maxAttainableAttended + 1) / finalTotal * 100)).toFixed(1)}%.`;
    }

    return { remainingClasses, finalTotal, mustAttend, canBunk, isAttainable, maxAttainablePct, shortfall, statusText, badgeClass, advice, subText };
  }

  function calculateBunkableClasses(attended, held, targetPercentage = currentTargetPercentage) {
    if (held <= 0 || targetPercentage <= 0) return 0;
    const targetRatio = targetPercentage / 100.0;
    const currentRatio = attended / held;
    if (currentRatio < targetRatio) return 0;

    let bunkable = Math.floor((attended - targetRatio * held) / targetRatio + 1e-9);
    if (bunkable < 0) bunkable = 0;

    while (bunkable > 0 && (attended / (held + bunkable)) < targetRatio) {
      bunkable--;
    }
    while ((attended / (held + bunkable + 1)) >= targetRatio) {
      bunkable++;
    }
    return bunkable;
  }

  function calculateClassesNeeded(attended, held, targetPercentage = currentTargetPercentage) {
    if (held <= 0) return 0;
    const targetRatio = targetPercentage / 100.0;
    const currentRatio = attended / held;
    if (currentRatio >= targetRatio) return 0;
    if (targetRatio >= 1.0) return -1;

    let needed = Math.ceil((targetRatio * held - attended) / (1.0 - targetRatio) - 1e-9);
    if (needed < 1) needed = 1;

    while ((attended + needed) / (held + needed) < targetRatio) {
      needed++;
    }
    while (needed > 1 && ((attended + needed - 1) / (held + needed - 1)) >= targetRatio) {
      needed--;
    }
    return needed;
  }

  function copyDiagnostics() {
    const now = new Date();
    const portal = window.location.hostname.includes('instructure') ? 'Canvas LMS' : 'Rishiverse';
    const domTables = document.querySelectorAll('table').length;
    const subjects = cachedData ? cachedData.subjects : [];
    const drift = cachedData?.drift || { drifted: false };
    const overrides = getStoredOverrides();

    let text = `### Bunkr Diagnostics (v2.4.1)\n`;
    text += `- **Generated**: ${now.toISOString()}\n`;
    text += `- **Portal**: ${portal} (\`${window.location.hostname}\`)\n`;
    text += `- **DOM Tables**: ${domTables}\n`;
    text += `- **Freshness**: ${formatFreshness(cachedData?.timestamp, portal)}\n`;
    text += `- **Drift Status**: ${drift.drifted ? `⚠️ Drift Alert (${drift.reason})` : '✅ Clean'}\n`;
    text += `- **Active Overrides**: ${Object.keys(overrides).length}\n\n`;
    text += `#### Courses\n`;
    subjects.forEach((s, idx) => {
      text += `${idx + 1}. **${s.name}**: ${s.attended}/${s.total} (${s.percentage.toFixed(1)}%) ${s.isManualOverride ? '[MANUAL]' : '[SCRAPED]'}\n`;
    });

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => alert('✅ Bunkr diagnostics copied to clipboard!'));
    } else {
      prompt('Bunkr Diagnostics:', text);
    }
  }

  function copyWhatsAppStatus() {
    const subjects = cachedData ? cachedData.subjects : [];
    if (!subjects || subjects.length === 0) return;
    let totalAttended = 0;
    let totalHeld = 0;
    subjects.forEach((s) => {
      totalAttended += (s.attended || 0);
      totalHeld += (s.total || 0);
    });
    const overallPct = totalHeld > 0 ? (totalAttended / totalHeld) * 100 : 0;
    const now = new Date();
    const dateFormatted = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    let lines = [];
    lines.push(`Bunkr Status • ${dateFormatted}`);
    lines.push(`Overall: ${overallPct.toFixed(1)}% (Target: ${currentTargetPercentage}%)`);
    lines.push('');
    lines.push('Courses:');
    subjects.forEach((s) => {
      const canBunk = calculateBunkableClasses(s.attended, s.total, currentTargetPercentage);
      const needToAttend = calculateClassesNeeded(s.attended, s.total, currentTargetPercentage);
      let note = '';
      if (needToAttend > 0) {
        note = ` — attend ${needToAttend} to reach ${currentTargetPercentage}%`;
      } else {
        note = ` — can bunk ${canBunk}`;
      }
      const ov = s.isManualOverride ? ' [manual]' : '';
      lines.push(`• ${s.name}: ${s.attended}/${s.total} (${s.percentage.toFixed(1)}%)${ov}${note}`);
    });

    const text = lines.join('\n');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => alert('✅ WhatsApp status copied to clipboard!'));
    } else {
      prompt('Copy WhatsApp Status:', text);
    }
  }

  function openOverrideModal(subj) {
    const existing = document.getElementById('am-override-popover');
    if (existing) existing.remove();
    const exBack = document.getElementById('am-popover-backdrop');
    if (exBack) exBack.remove();

    const backdrop = document.createElement('div');
    backdrop.className = 'am-popover-backdrop';
    backdrop.id = 'am-popover-backdrop';

    const popover = document.createElement('div');
    popover.className = 'am-override-popover';
    popover.id = 'am-override-popover';

    popover.innerHTML = `
      <div style="font-weight:700; margin-bottom:4px;">✏️ Override Attendance</div>
      <div style="font-size:12px; color:#64748B; margin-bottom:14px;"><strong>${subj.name}</strong></div>
      <div class="am-popover-row">
        <label>Attended:</label>
        <input type="number" id="am-input-attended" class="am-popover-input" min="0" value="${subj.attended}">
      </div>
      <div class="am-popover-row">
        <label>Total Held:</label>
        <input type="number" id="am-input-total" class="am-popover-input" min="1" value="${subj.total}">
      </div>
      <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:16px;">
        ${subj.isManualOverride ? `<button id="am-modal-reset-btn" class="am-btn-reset">Reset</button>` : ''}
        <button id="am-modal-cancel-btn" class="am-btn-ghost">Cancel</button>
        <button id="am-modal-save-btn" class="am-btn-save">Save</button>
      </div>
    `;

    document.body.appendChild(backdrop);
    document.body.appendChild(popover);

    const close = () => { backdrop.remove(); popover.remove(); };
    backdrop.onclick = close;
    popover.querySelector('#am-modal-cancel-btn').onclick = close;

    const rBtn = popover.querySelector('#am-modal-reset-btn');
    if (rBtn) rBtn.onclick = () => { resetOverride(subj.name); close(); };

    popover.querySelector('#am-modal-save-btn').onclick = () => {
      const a = parseInt(popover.querySelector('#am-input-attended').value, 10);
      const t = parseInt(popover.querySelector('#am-input-total').value, 10);
      if (isNaN(a) || isNaN(t) || t <= 0 || a < 0 || a > t) {
        alert('Invalid numbers. Attended cannot exceed total held.');
        return;
      }
      saveOverride(subj.name, a, t);
      close();
    };
  }

  function scanPage(targetPercentage = 75) {
    const subjects = [];
    const tables = Array.from(document.querySelectorAll('table'));
    for (const table of tables) {
      if (table.closest('#attendmate-root')) continue;
      const rows = Array.from(table.querySelectorAll('tr'));
      if (rows.length < 2) continue;
      for (const row of rows.slice(1)) {
        const cells = Array.from(row.querySelectorAll('td'));
        if (cells.length < 2) continue;
        const nameEl = cells[0].querySelector('.course-title, strong, a') || cells[0];
        const name = nameEl.innerText.trim();
        if (!name || name.length < 3) continue;

        let total = NaN, attended = NaN;
        for (let i = 1; i < cells.length; i++) {
          const txt = cells[i].innerText.trim();
          const match = txt.match(/(\d+)\s*[/]\s*(\d+)/);
          if (match) {
            attended = parseInt(match[1], 10);
            total = parseInt(match[2], 10);
            break;
          }
          const num = parseInt(txt, 10);
          if (!isNaN(num)) {
            if (isNaN(total)) total = num;
            else if (isNaN(attended)) { attended = num; break; }
          }
        }

        if (!isNaN(attended) && !isNaN(total) && total > 0) {
          subjects.push({
            id: `subj_${subjects.length + 1}`,
            name,
            code: '',
            attended,
            total,
            percentage: (attended / total) * 100,
            element: row
          });
        }
      }
      if (subjects.length > 0) break;
    }

    return {
      subjects,
      timestamp: new Date().toISOString()
    };
  }

  function render(data) {
    if (!data) return;
    const subjects = applyOverrides(data.subjects || []);
    cachedData = { ...data, subjects };
    const portal = window.location.hostname.includes('instructure') ? 'Canvas' : 'Rishiverse';

    // Drift banner
    let driftBanner = document.getElementById('attendmate-drift-banner');
    if (data.drift && data.drift.drifted) {
      if (!driftBanner) {
        driftBanner = document.createElement('div');
        driftBanner.id = 'attendmate-drift-banner';
        const target = document.querySelector('table, main, .card');
        if (target) target.parentNode.insertBefore(driftBanner, target);
      }
      driftBanner.innerHTML = `
        <div class="am-drift-left">
          <span>⚠️</span>
          <div>
            <div class="am-drift-title">The ERP page may have changed — showing last known data</div>
            <div class="am-drift-sub">${data.drift.reason || 'Structure changed'} &bull; ${formatFreshness(data.timestamp, portal)}</div>
          </div>
        </div>
        <div class="am-drift-actions">
          <button id="am-u-diag-btn" class="am-drift-btn">📋 Diagnostics</button>
        </div>
      `;
      driftBanner.querySelector('#am-u-diag-btn')?.addEventListener('click', copyDiagnostics);
    } else if (driftBanner) {
      driftBanner.remove();
    }

    // Banner
    const table = document.querySelector('table');
    if (table) {
      let banner = document.getElementById('attendmate-page-banner');
      if (!banner) {
        banner = document.createElement('div');
        banner.id = 'attendmate-page-banner';
        table.parentNode.insertBefore(banner, table);
      }
      banner.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <strong>🎓 Semester Finish Line: Dec 18, 2026</strong> &bull; Target: <strong>${currentTargetPercentage}%</strong>
          <span class="attendmate-freshness-tag ${data.drift?.drifted ? 'stale' : ''}">🕒 ${formatFreshness(data.timestamp, portal)}</span>
        </div>
        <div style="display:flex; align-items:center; gap:6px;">
          <button id="am-page-copy-btn" class="attendmate-banner-btn" style="background:#059669;">📋 Copy Status</button>
          <button id="am-page-diag-btn" class="attendmate-banner-btn" style="background:#475569;">📋 Diagnostics</button>
        </div>
      `;
      banner.querySelector('#am-page-diag-btn')?.addEventListener('click', copyDiagnostics);
      banner.querySelector('#am-page-copy-btn')?.addEventListener('click', copyWhatsAppStatus);

      // Table cells
      subjects.forEach((subj) => {
        const row = subj.element;
        if (!row) return;
        const remaining = getDynamicRemainingClasses(subj.name);
        const calc = calculateBunkWithDeficitRecovery(subj.attended, subj.total, remaining, currentTargetPercentage);

        let td = row.querySelector('.attendmate-miss-cell');
        if (!td) {
          td = document.createElement('td');
          row.appendChild(td);
        }
        td.className = `attendmate-miss-cell ${calc.badgeClass}`;
        let txt = calc.isAttainable ? `Can bunk: <span class="am-num">${calc.canBunk}</span> classes` : `Deficit: <span class="am-num">0</span>`;
        if (subj.isManualOverride) {
          txt += ` <span class="am-manual-pill">✏️ Manual (${subj.attended}/${subj.total})</span>`;
        }
        txt += ` <span class="am-edit-trigger" title="Override counts">✏️</span>`;
        td.innerHTML = txt;
        td.style.cursor = 'pointer';
        td.onclick = () => openOverrideModal(subj);
      });
    }
  }

  function run() {
    if (isCircuitBroken) return;
    try {
      const data = scanPage(currentTargetPercentage);
      render(data);
      consecutiveErrors = 0;
    } catch (err) {
      consecutiveErrors++;
      if (consecutiveErrors >= 3) {
        isCircuitBroken = true;
        let pill = document.createElement('div');
        pill.id = 'attendmate-safety-pill';
        pill.innerHTML = `<span>Bunkr paused to protect page</span> <button id="am-safe-retry">Retry</button>`;
        document.body.appendChild(pill);
        pill.querySelector('#am-safe-retry').onclick = () => { isCircuitBroken = false; consecutiveErrors = 0; pill.remove(); run(); };
      }
    }
  }

  setTimeout(run, 1000);
  setTimeout(run, 2500);
})();
