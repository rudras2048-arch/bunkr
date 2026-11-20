// Bunkr Studio UX Controller for Command Center
// Handles Light/Dark theme persistence, Workspace Rail navigation,
// Cmd+K / Ctrl+K Command Palette, and Live Retina Share Card Studio.

(function () {
  'use strict';

  const THEME_KEY = 'bunkr_studio_theme';
  let activeCardTheme = 'obsidian';

  function applyTheme(theme) {
    const clean = theme === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', clean);
    try {
      localStorage.setItem(THEME_KEY, clean);
    } catch (e) {}

    document.querySelectorAll('[data-set-theme]').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-set-theme') === clean);
    });
  }

  function initTheme() {
    let saved = 'dark';
    try {
      saved = localStorage.getItem(THEME_KEY) || 'dark';
    } catch (e) {}
    applyTheme(saved);

    document.querySelectorAll('[data-set-theme]').forEach((btn) => {
      btn.addEventListener('click', () => {
        applyTheme(btn.getAttribute('data-set-theme'));
      });
    });

    const mobileBtn = document.getElementById('cc-mobile-theme-btn');
    if (mobileBtn) {
      mobileBtn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        applyTheme(current === 'dark' ? 'light' : 'dark');
      });
    }
  }

  function initWorkspaceRail() {
    const links = Array.from(document.querySelectorAll('.rail-link[data-rail-target]'));
    if (links.length === 0) return;

    links.forEach((link) => {
      link.addEventListener('click', () => {
        links.forEach((l) => l.classList.remove('active'));
        link.classList.add('active');
      });
    });

    if (typeof IntersectionObserver !== 'undefined') {
      const targets = links
        .map((l) => document.getElementById(l.getAttribute('data-rail-target')))
        .filter(Boolean);

      const obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const id = entry.target.id;
              links.forEach((l) => {
                l.classList.toggle('active', l.getAttribute('data-rail-target') === id);
              });
            }
          });
        },
        { rootMargin: '-18% 0px -65% 0px', threshold: 0.05 }
      );
      targets.forEach((t) => obs.observe(t));
    }
  }

  function renderShareCardPreview() {
    const canvas = document.getElementById('cc-share-canvas');
    const lib = window.BunkrShareCard;
    if (!canvas || !lib) return;

    const state = window.__bunkrCommandState || {};
    const engine = window.BunkrEngine || window.AttendMateEngine;
    const activeTt = engine && engine.getActiveTimetable ? engine.getActiveTimetable() : null;
    const includeTripEl = document.getElementById('cc-card-include-trip');

    const subjects = Array.isArray(state.subjects) && state.subjects.length > 0
      ? state.subjects
      : (typeof fallbackSubjects !== 'undefined' ? fallbackSubjects : []);

    const sectionLabel = activeTt
      ? `${activeTt.program || 'B.Tech CSE'} · ${activeTt.section || 'Sec-A'}`
      : 'B.Tech CSE (DS) · Sec-A';

    const model = lib.buildShareCardModel({
      subjects,
      targetPercentage: state.targetPercentage || 75,
      sectionLabel,
      semesterLabel: (activeTt && activeTt.semester) || 'Diwali Semester 2026',
      includeTrip: includeTripEl ? includeTripEl.checked : true,
      tripPlan: state.lastTripPlan || null
    });

    lib.renderShareCardCanvas(canvas, model, activeCardTheme);
  }

  function initShareCardStudio() {
    const themeBtns = document.querySelectorAll('[data-card-theme]');
    themeBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        activeCardTheme = btn.getAttribute('data-card-theme') || 'obsidian';
        themeBtns.forEach((b) => b.classList.toggle('active', b === btn));
        renderShareCardPreview();
      });
    });

    const includeTripEl = document.getElementById('cc-card-include-trip');
    if (includeTripEl) {
      includeTripEl.addEventListener('change', renderShareCardPreview);
    }

    const downloadBtn = document.getElementById('cc-card-download-btn');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        const canvas = document.getElementById('cc-share-canvas');
        if (window.BunkrShareCard && canvas) {
          window.BunkrShareCard.downloadShareCardPng(canvas);
          const orig = downloadBtn.textContent;
          downloadBtn.textContent = 'Downloaded PNG';
          setTimeout(() => { downloadBtn.textContent = orig; }, 1800);
        }
      });
    }

    const copyBtn = document.getElementById('cc-card-copy-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', async () => {
        const canvas = document.getElementById('cc-share-canvas');
        if (!window.BunkrShareCard || !canvas) return;
        const ok = await window.BunkrShareCard.copyShareCardImage(canvas);
        const orig = copyBtn.textContent;
        if (ok) {
          copyBtn.textContent = 'Image Copied';
          setTimeout(() => { copyBtn.textContent = orig; }, 1800);
        } else {
          window.BunkrShareCard.downloadShareCardPng(canvas);
          copyBtn.textContent = 'Saved PNG Instead';
          setTimeout(() => { copyBtn.textContent = orig; }, 1800);
        }
      });
    }

    window.addEventListener('bunkr:state-updated', renderShareCardPreview);
    setTimeout(renderShareCardPreview, 120);
  }

  function initCommandPalette() {
    const modal = document.getElementById('cc-cmd-modal');
    const input = document.getElementById('cc-cmd-input');
    const listEl = document.getElementById('cc-cmd-list');
    const triggerBtn = document.getElementById('cc-cmd-trigger');
    if (!modal || !input || !listEl) return;

    const actions = [
      {
        title: 'Jump to Trip & Leave Planner',
        sub: 'Simulate multi-day absences',
        run: () => document.getElementById('cc-trip-card')?.scrollIntoView({ behavior: 'smooth' })
      },
      {
        title: 'Jump to SGPA Forecaster',
        sub: 'UGC 10-point credit-weighted standing',
        run: () => document.getElementById('cc-sgpa-card')?.scrollIntoView({ behavior: 'smooth' })
      },
      {
        title: 'Jump to Share Card Studio',
        sub: 'Export Retina 2x attendance PNG',
        run: () => document.getElementById('cc-share-studio')?.scrollIntoView({ behavior: 'smooth' })
      },
      {
        title: 'Toggle Obsidian / Daylight Theme',
        sub: 'Switch Command Center appearance',
        run: () => {
          const cur = document.documentElement.getAttribute('data-theme') || 'dark';
          applyTheme(cur === 'dark' ? 'light' : 'dark');
        }
      },
      {
        title: 'Copy Attendance Status for WhatsApp',
        sub: 'Plain-text summary of all courses',
        run: () => document.getElementById('cc-copy-status-btn')?.click()
      },
      {
        title: 'Copy Active Batch Timetable Code',
        sub: 'BUNKR-TT1 share code for your section',
        run: () => document.getElementById('cc-copy-batch-btn')?.click()
      },
      {
        title: 'Download Safe Bunk Card (PNG)',
        sub: 'High-DPI attendance graphic',
        run: () => document.getElementById('cc-card-download-btn')?.click()
      },
      {
        title: 'Open My Schedule & Timetable Studio',
        sub: 'Upload PDF, image, CSV, or .ics',
        run: () => document.getElementById('cc-custom-schedule-btn')?.click()
      },
      {
        title: 'Download 10m Calendar Alerts (.ics)',
        sub: 'Import into Google or Apple Calendar',
        run: () => document.getElementById('cc-cal-btn')?.click()
      }
    ];

    let selectedIdx = 0;
    let filtered = actions;

    function renderCommands() {
      const q = (input.value || '').trim().toLowerCase();
      filtered = q
        ? actions.filter((a) => a.title.toLowerCase().includes(q) || a.sub.toLowerCase().includes(q))
        : actions;
      if (selectedIdx >= filtered.length) selectedIdx = 0;

      if (filtered.length === 0) {
        listEl.innerHTML = `<div style="padding:16px; text-align:center; color:var(--ink-muted); font-size:12.5px;">No matching commands</div>`;
        return;
      }

      listEl.innerHTML = filtered
        .map((item, idx) => `
          <button type="button" class="cmd-item ${idx === selectedIdx ? 'selected' : ''}" data-cmd-idx="${idx}" role="option" aria-selected="${idx === selectedIdx}">
            <span>${item.title}</span>
            <span class="cmd-item-sub">${item.sub}</span>
          </button>
        `)
        .join('');

      listEl.querySelectorAll('[data-cmd-idx]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const i = parseInt(btn.getAttribute('data-cmd-idx'), 10);
          closePalette();
          if (filtered[i]) filtered[i].run();
        });
      });
    }

    function openPalette() {
      modal.style.display = 'flex';
      input.value = '';
      selectedIdx = 0;
      renderCommands();
      setTimeout(() => input.focus(), 20);
    }

    function closePalette() {
      modal.style.display = 'none';
    }

    if (triggerBtn) triggerBtn.addEventListener('click', openPalette);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closePalette();
    });

    input.addEventListener('input', () => {
      selectedIdx = 0;
      renderCommands();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (filtered.length > 0) {
          selectedIdx = (selectedIdx + 1) % filtered.length;
          renderCommands();
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (filtered.length > 0) {
          selectedIdx = (selectedIdx - 1 + filtered.length) % filtered.length;
          renderCommands();
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const choice = filtered[selectedIdx];
        closePalette();
        if (choice) choice.run();
      } else if (e.key === 'Escape') {
        closePalette();
      }
    });

    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (modal.style.display === 'flex') closePalette();
        else openPalette();
      } else if (e.key === 'Escape' && modal.style.display === 'flex') {
        closePalette();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initWorkspaceRail();
    initShareCardStudio();
    initCommandPalette();
  });
})();
