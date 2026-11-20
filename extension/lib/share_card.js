// Bunkr Studio — 100% Local Shareable Safe Bunk Card Generator
// Pure model builder + Retina 2x HTML5 Canvas renderer (Zero external servers)

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BunkrShareCard = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function calculateCourseSummary(subject, targetPercentage) {
    const attended = Math.max(0, Number(subject.attended) || 0);
    const total = Math.max(0, Number(subject.total) || 0);
    const pct = total > 0 ? (attended / total) * 100 : 0;
    const target = Number(targetPercentage) || 75;
    const t = target / 100;

    let canBunk = 0;
    let needed = 0;
    if (total > 0) {
      if (pct >= target) {
        canBunk = Math.max(0, Math.floor((attended / t) - total));
      } else if (t < 1) {
        needed = Math.max(0, Math.ceil((t * total - attended) / (1 - t)));
      }
    }

    let statusTone = 'safe';
    let statusLabel = canBunk > 0 ? `Safe +${canBunk} bunk${canBunk === 1 ? '' : 's'}` : 'On target';
    if (pct < target) {
      statusTone = 'danger';
      statusLabel = `Need ${needed} class${needed === 1 ? '' : 'es'}`;
    } else if (canBunk === 0) {
      statusTone = 'warning';
      statusLabel = 'Attend next';
    }

    return {
      name: String(subject.name || 'Course').trim(),
      code: String(subject.code || '').trim(),
      attended,
      total,
      percentage: Number(pct.toFixed(1)),
      canBunk,
      needed,
      statusTone,
      statusLabel
    };
  }

  /**
   * Pure data model builder for unit testing and deterministic canvas rendering.
   */
  function buildShareCardModel(options = {}) {
    const subjects = Array.isArray(options.subjects) ? options.subjects : [];
    const targetPercentage = Number(options.targetPercentage) || 75;
    const sectionLabel = String(options.sectionLabel || 'B.Tech CSE · Sec-A').trim();
    const semesterLabel = String(options.semesterLabel || 'Diwali Semester 2026').trim();
    const tripPlan = options.includeTrip && options.tripPlan && options.tripPlan.valid
      ? options.tripPlan
      : null;

    let totalAttended = 0;
    let totalHeld = 0;
    const computed = subjects.map((s) => {
      const item = calculateCourseSummary(s, targetPercentage);
      totalAttended += item.attended;
      totalHeld += item.total;
      return item;
    });

    const overallPct = totalHeld > 0 ? Number(((totalAttended / totalHeld) * 100).toFixed(1)) : 0;
    const overallCalc = calculateCourseSummary(
      { name: 'Overall', attended: totalAttended, total: totalHeld },
      targetPercentage
    );

    const safeCount = computed.filter((c) => c.percentage >= targetPercentage).length;
    const riskCount = computed.length - safeCount;

    // Sort so at-risk or highest-attended interesting courses surface clearly (max 4 rows for studio clarity)
    const prioritized = [...computed]
      .sort((a, b) => {
        if (a.statusTone === 'danger' && b.statusTone !== 'danger') return -1;
        if (b.statusTone === 'danger' && a.statusTone !== 'danger') return 1;
        return b.total - a.total;
      })
      .slice(0, 4);

    let headline = 'On track for semester';
    if (computed.length === 0) {
      headline = 'Ready to track attendance';
    } else if (overallCalc.statusTone === 'danger') {
      headline = `Attend next ${overallCalc.needed} to recover ${targetPercentage}%`;
    } else if (overallCalc.canBunk > 0) {
      headline = `${overallCalc.canBunk} safe overall bunk${overallCalc.canBunk === 1 ? '' : 's'} available`;
    } else {
      headline = `Holding ${targetPercentage}% margin`;
    }

    return {
      sectionLabel,
      semesterLabel,
      targetPercentage,
      totalAttended,
      totalHeld,
      overallPct,
      overallTone: overallCalc.statusTone,
      overallCanBunk: overallCalc.canBunk,
      overallNeeded: overallCalc.needed,
      headline,
      safeCount,
      riskCount,
      totalCourses: computed.length,
      featuredCourses: prioritized,
      tripSummary: tripPlan
        ? {
            verdict: tripPlan.verdict,
            verdictTone: tripPlan.verdictTone,
            range: `${tripPlan.startLabel} - ${tripPlan.endLabel}`,
            overallAfterPct: Number(tripPlan.overallAfterPct.toFixed(1)),
            missed: tripPlan.totalMissedSessions
          }
        : null,
      generatedDate: options.dateLabel || new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    };
  }

  function roundRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function truncateText(ctx, text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let out = text;
    while (out.length > 3 && ctx.measureText(`${out}...`).width > maxWidth) {
      out = out.slice(0, -1);
    }
    return `${out}...`;
  }

  /**
   * Renders a crisp 1080x660 (2x Retina) Shareable Safe Bunk Card onto an HTMLCanvasElement.
   */
  function renderShareCardCanvas(canvas, model, theme = 'obsidian') {
    if (!canvas || !canvas.getContext || !model) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const W = 1080;
    const H = 660;
    canvas.width = W;
    canvas.height = H;

    const isDark = theme !== 'ivory';
    const palette = isDark
      ? {
          bg: '#090B10',
          bgGlow: 'rgba(200, 30, 43, 0.14)',
          surface: '#11151E',
          surfaceAlt: '#161B26',
          border: 'rgba(255, 255, 255, 0.09)',
          ink: '#F3F5F8',
          secondary: '#9CA3AF',
          muted: '#6B7280',
          accent: '#E5484D',
          ringTrack: 'rgba(255, 255, 255, 0.09)',
          safe: '#34D399',
          safeBg: 'rgba(52, 211, 153, 0.12)',
          warn: '#FBBF24',
          warnBg: 'rgba(251, 191, 36, 0.12)',
          danger: '#F87171',
          dangerBg: 'rgba(248, 113, 113, 0.14)'
        }
      : {
          bg: '#F7F8FA',
          bgGlow: 'rgba(200, 30, 43, 0.07)',
          surface: '#FFFFFF',
          surfaceAlt: '#F3F4F6',
          border: '#E5E7EB',
          ink: '#0B0F19',
          secondary: '#4B5563',
          muted: '#6B7280',
          accent: '#C81E2B',
          ringTrack: '#E5E7EB',
          safe: '#059669',
          safeBg: '#ECFDF5',
          warn: '#D97706',
          warnBg: '#FFFBEB',
          danger: '#DC2626',
          dangerBg: '#FEF2F2'
        };

    const sans = '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const mono = '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';

    // Background canvas
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, W, H);

    // Subtle architectural top-right ambient radial
    const glow = ctx.createRadialGradient(W - 140, 80, 20, W - 140, 80, 420);
    glow.addColorStop(0, palette.bgGlow);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // Subtle architectural hairline grid frame
    const pad = 44;
    roundRect(ctx, pad, pad, W - pad * 2, H - pad * 2, 24);
    ctx.fillStyle = palette.surface;
    ctx.fill();
    ctx.strokeStyle = palette.border;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Header row inside card
    const innerX = pad + 40;
    const innerRight = W - pad - 40;
    let y = pad + 46;

    // Crimson brand mark square
    roundRect(ctx, innerX, y - 20, 26, 26, 7);
    ctx.fillStyle = palette.accent;
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `800 15px ${sans}`;
    ctx.textAlign = 'center';
    ctx.fillText('B', innerX + 13, y - 2);

    ctx.textAlign = 'left';
    ctx.fillStyle = palette.ink;
    ctx.font = `800 20px ${sans}`;
    ctx.fillText('Bunkr', innerX + 36, y);

    ctx.fillStyle = palette.muted;
    ctx.font = `500 14px ${sans}`;
    ctx.fillText(`${model.semesterLabel}  ·  ${model.sectionLabel}`, innerX + 106, y - 1);

    ctx.textAlign = 'right';
    ctx.fillStyle = palette.muted;
    ctx.font = `600 13px ${mono}`;
    ctx.fillText(`TARGET ${model.targetPercentage}%  ·  ${model.generatedDate.toUpperCase()}`, innerRight, y - 1);

    // Divider line
    y += 24;
    ctx.strokeStyle = palette.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(innerX, y);
    ctx.lineTo(innerRight, y);
    ctx.stroke();

    // Main split: Left = Precision Ring + Overall Stats | Right = Course Breakdown
    const contentTop = y + 36;

    // Left column (width ~ 340px)
    const ringCx = innerX + 102;
    const ringCy = contentTop + 104;
    const ringR = 86;

    // Track arc
    ctx.beginPath();
    ctx.arc(ringCx, ringCy, ringR, 0, Math.PI * 2);
    ctx.strokeStyle = palette.ringTrack;
    ctx.lineWidth = 14;
    ctx.stroke();

    // Value arc
    const toneColor = model.overallTone === 'danger'
      ? palette.danger
      : (model.overallTone === 'warning' ? palette.warn : palette.safe);
    const pctClamped = Math.max(0, Math.min(100, model.overallPct));
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (Math.PI * 2 * (pctClamped / 100));

    ctx.beginPath();
    ctx.arc(ringCx, ringCy, ringR, startAngle, endAngle);
    ctx.strokeStyle = toneColor;
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.lineCap = 'butt';

    // Center percentage
    ctx.textAlign = 'center';
    ctx.fillStyle = palette.ink;
    ctx.font = `700 40px ${mono}`;
    ctx.fillText(`${model.overallPct.toFixed(1)}%`, ringCx, ringCy + 10);

    ctx.fillStyle = palette.muted;
    ctx.font = `600 12px ${sans}`;
    ctx.fillText(`${model.totalAttended} / ${model.totalHeld} HELD`, ringCx, ringCy + 34);

    // Left headline & sub-metrics below ring
    ctx.textAlign = 'left';
    const leftTextY = ringCy + ringR + 42;
    ctx.fillStyle = toneColor;
    ctx.font = `700 18px ${sans}`;
    ctx.fillText(truncateText(ctx, model.headline, 310), innerX, leftTextY);

    ctx.fillStyle = palette.secondary;
    ctx.font = `500 14px ${sans}`;
    ctx.fillText(`${model.safeCount} of ${model.totalCourses} courses above ${model.targetPercentage}%`, innerX, leftTextY + 26);

    // Optional Trip Verdict box in left column
    if (model.tripSummary) {
      const tripY = leftTextY + 48;
      const tripColor = model.tripSummary.verdictTone === 'danger'
        ? palette.danger
        : (model.tripSummary.verdictTone === 'warning' ? palette.warn : palette.safe);
      const tripBg = model.tripSummary.verdictTone === 'danger'
        ? palette.dangerBg
        : (model.tripSummary.verdictTone === 'warning' ? palette.warnBg : palette.safeBg);

      roundRect(ctx, innerX, tripY, 310, 74, 12);
      ctx.fillStyle = tripBg;
      ctx.fill();
      ctx.strokeStyle = palette.border;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = tripColor;
      ctx.font = `700 13px ${sans}`;
      ctx.fillText(truncateText(ctx, `Trip Plan (${model.tripSummary.range})`, 284), innerX + 14, tripY + 26);

      ctx.fillStyle = palette.ink;
      ctx.font = `600 13px ${mono}`;
      ctx.fillText(
        `After trip: ${model.tripSummary.overallAfterPct.toFixed(1)}% (-${model.tripSummary.missed} cls)`,
        innerX + 14,
        tripY + 52
      );
    }

    // Vertical hairline separator
    const sepX = innerX + 344;
    ctx.strokeStyle = palette.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sepX, contentTop - 6);
    ctx.lineTo(sepX, H - pad - 88);
    ctx.stroke();

    // Right column: Course Breakdown List
    const rightX = sepX + 34;
    const rightW = innerRight - rightX;

    ctx.textAlign = 'left';
    ctx.fillStyle = palette.muted;
    ctx.font = `700 12px ${mono}`;
    ctx.fillText('COURSE MARGINS', rightX, contentTop + 12);

    ctx.textAlign = 'right';
    ctx.fillText('STANDING', innerRight, contentTop + 12);

    let rowY = contentTop + 34;
    const rowH = 82;
    const rowGap = 12;

    model.featuredCourses.forEach((c) => {
      roundRect(ctx, rightX, rowY, rightW, rowH, 12);
      ctx.fillStyle = palette.surfaceAlt;
      ctx.fill();
      ctx.strokeStyle = palette.border;
      ctx.lineWidth = 1;
      ctx.stroke();

      const cColor = c.statusTone === 'danger'
        ? palette.danger
        : (c.statusTone === 'warning' ? palette.warn : palette.safe);

      // Course title
      ctx.textAlign = 'left';
      ctx.fillStyle = palette.ink;
      ctx.font = `700 15.5px ${sans}`;
      ctx.fillText(truncateText(ctx, c.name, rightW - 140), rightX + 18, rowY + 30);

      // Subline: counts + status (dynamically spaced for typographic precision)
      const countLabel = `${c.attended}/${c.total} classes`;
      ctx.fillStyle = palette.muted;
      ctx.font = `500 13px ${mono}`;
      ctx.fillText(countLabel, rightX + 18, rowY + 56);
      const countWidth = ctx.measureText(countLabel).width;

      ctx.fillStyle = cColor;
      ctx.font = `600 13px ${sans}`;
      ctx.fillText(`·  ${c.statusLabel}`, rightX + 18 + countWidth + 10, rowY + 56);

      // Right percentage
      ctx.textAlign = 'right';
      ctx.fillStyle = cColor;
      ctx.font = `700 22px ${mono}`;
      ctx.fillText(`${c.percentage.toFixed(1)}%`, rightX + rightW - 18, rowY + 46);

      rowY += rowH + rowGap;
    });

    // Footer bar inside card
    const footerY = H - pad - 34;
    ctx.strokeStyle = palette.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(innerX, footerY - 26);
    ctx.lineTo(innerRight, footerY - 26);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = palette.muted;
    ctx.font = `500 13px ${sans}`;
    ctx.fillText('Rishihood University · 100% local in-browser calculation', innerX, footerY);

    ctx.textAlign = 'right';
    ctx.fillStyle = palette.secondary;
    ctx.font = `600 13px ${mono}`;
    ctx.fillText('bunkr.extension · v2.4.2', innerRight, footerY);

    return canvas;
  }

  function downloadShareCardPng(canvas, filename) {
    if (!canvas || typeof canvas.toDataURL !== 'function') return false;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `Bunkr_Attendance_${new Date().toISOString().slice(0, 10)}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    return true;
  }

  function copyShareCardImage(canvas) {
    return new Promise((resolve) => {
      if (!canvas || typeof canvas.toBlob !== 'function' || !navigator.clipboard || typeof ClipboardItem === 'undefined') {
        resolve(false);
        return;
      }
      canvas.toBlob((blob) => {
        if (!blob) {
          resolve(false);
          return;
        }
        navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
          .then(() => resolve(true))
          .catch(() => resolve(false));
      }, 'image/png');
    });
  }

  return {
    buildShareCardModel,
    renderShareCardCanvas,
    downloadShareCardPng,
    copyShareCardImage
  };
});
