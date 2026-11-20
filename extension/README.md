# ⚡ Bunkr 2.4.1 - Rishiverse & Canvas Attendance Companion

> Real-time Bunk Calculator, Attendance Tracker, Proactive Nudges, Semester Projection & Attendance Coach for **Rishihood University (Rishiverse ERP & LMS)** and **Canvas LMS**.
> **Phase 3: "Coach & Share" (v2.4.1 Hotfix)** — Answers "where am I heading?" and "how do I tell my batch?" with unified engine-derived semester projections and one-click WhatsApp status sharing.

Available for **macOS (Chrome, Arc, Brave, Safari, Edge, Firefox)** and **Mobile (iOS Safari & Android Kiwi/Lemur/Firefox)**. Compatible with [AttendMate App](../README.md).

---

## 🌟 What's New in Phase 3 (v2.4.0): Coach & Share

1. **📈 Dynamic Semester Projections**:
   - Forecasts your final overall attendance by semester end (**December 18, 2026**):
     - **At Current Pace**: Where attendance lands if your current rate continues across remaining sessions.
     - **If Attending Every Session**: Maximum possible finish if you attend 100% of remaining classes.
   - Grounded completely in the official B.Tech CSE timetable (`data/timetable.js`) and engine calendar logic — dynamically counting remaining sessions, excluding the Diwali break (Nov 6–13), Sundays, and Saturdays. Zero hardcoded counts.
2. **🎯 Attendance Coach (Speaks Only When Needed)**:
   - Evaluates courses individually against your target percentage (**75% / 80% / 85%**).
   - Generates a short, factual callout **ONLY** when a course is trending to finish below target, stating the projected finish and the exact session gap needed to secure the target.
   - **Silence is default**: Healthy courses receive no callouts. The tone is purely factual — it never scolds and never celebrates skipping.
3. **🛡️ Projection Honesty & State Inheritance**:
   - Projections visibly inherit drift and stale warnings (`⚠️ Based on last known data`).
   - Human manual overrides seamlessly flow into projection calculations.
   - When all teaching sessions conclude, transitions to a clean "Semester Complete" status.
4. **📋 Copy My Status for WhatsApp**:
   - 1-click button on the Command Center New Tab, Toolbar Popup, and In-Page ERP Banner copies a tidy plain-text summary ready for WhatsApp.
   - Clean bullet points: overall %, target, pace projection, and per-course one-liners with safe bunk counts or required classes.
   - **Text-only**: No links, no images, no tracking, crisp short lines that format cleanly in chat without awkward line wraps.
5. **📱 Mobile Userscript Harmony**:
   - Updated `extension/bunkr.user.js` (and `attendmate.user.js`) to v2.4.1 with "📋 Copy Status" action in the banner.

---

## 🔔 Phase 2 Foundations: "Proactive Nudges & Command Center" (v2.3.0)

- **🔔 Class Departure Nudges**: Desktop alerts ~10 minutes before next lecture starts with course acronym, time, and room (`Move — PSP starts 13:30 in A603`).
- **🎛️ Total Control**: Master on/off toggle and 5/10/15 min lead-time selectors on both New Tab and Popup.
- **📅 Schedule Correctness**: Evaluates against timetable — quiet on Sundays, Diwali break, outside semester, and after last lecture.
- **🛡️ Exactly One Nudge per Lecture**: Zero duplicate alerts; opening browser mid-day never replays missed classes.
- **⚡ On-Demand Demo**: "⚡ Send Test Nudge" button in New Tab, popup, and banner for instant verification.
- **🏫 College Command Center New Tab (`chrome_url_overrides.newtab`)**: Live clock, next class countdown, daily schedule timeline, and campus launchpad.
- **📢 Honest Scope**: Explicit notice that browser notifications fire only while Chrome is running; pre-configured `.ics` calendar generator provided for phone-native alarms.

---

## 🛡️ Phase 1 Foundations: "Never Silently Wrong" (v2.2.0)

- **🕒 Data Freshness**: Plain-English data age indicators with dynamic 15-second background updates.
- **⚠️ Drift Alarm**: High-visibility warning banner halts stale presentation if scrape returns 0 courses or counts drop.
- **✏️ Human Override**: Click-to-edit any course's attended/held counts directly in the page table or popup with distinct Apple HIG styling (`✏️ Manual`).
- **📋 One-Click Diagnostics**: Markdown scraper state report ready to paste into chat to debug broken pages.
- **🛡️ Host Page Safety Net**: Defensive circuit breaker with exponential backoff protects host portal stability.
- **💾 Full Resilience**: Settings, overrides, and targets persist across updates with 1-click JSON backup export/restore.

---

## 📂 Extension Structure

```
extension/
├── manifest.json              # WebExtension Manifest V3 (Chrome, Brave, Arc, Edge)
├── INSTALLATION.md            # Step-by-step setup guide for macOS & Mobile
├── bunkr.user.js              # Single-file userscript for iOS Safari (Stay app) & Android (alias: attendmate.user.js)
├── icons/                     # 16, 32, 48, 128px high-DPI icons
├── background/
│   └── background.js          # Background service worker & proactive nudge evaluation engine
├── data/
│   └── timetable.js           # B.Tech CSE single source of truth timetable
├── lib/
│   └── engine.js              # Attendance math, schedule logic, projection & share engine
├── content/
│   ├── math.js                # Core Bunkr bunk/deficit math engine
│   ├── parser.js              # Rishiverse & Canvas DOM table & card scraper
│   ├── ui.js                  # In-page badges, banner, copy status button & drawer
│   ├── content.js             # Content script coordinator & SPA mutation observer
│   └── content.css            # Responsive frosted glass & AMOLED dark styles
├── popup/
│   ├── popup.html             # Browser toolbar popup dashboard, projection & copy status
│   ├── popup.js               # Popup controller, projection renderer & offline cache viewer
│   └── popup.css              # Compact popup styling
├── newtab/
│   ├── newtab.html            # College Command Center New Tab & Semester Projection
│   ├── newtab.js              # Live clock, hero countdown, projection engine & copy status
│   └── newtab.css             # Glassmorphism Command Center design
└── demo/
    ├── rishiverse_demo.html   # Realistic Rishiverse portal mockup for local testing
    ├── canvas_demo.html       # Realistic Canvas LMS mockup for local testing
    └── verify_browser.html    # In-browser test runner & interactive suite (Phases 1, 2, 3)
```

---

## 🚀 Quick Start (macOS Chrome / Brave / Arc)

1. Go to `chrome://extensions`.
2. Turn on **Developer mode** (top-right).
3. Click **Load unpacked** &rarr; select this `extension/` directory.
4. Open a new tab (`⌘T`) to experience the **College Command Center & Semester Projection**!
5. Open [`extension/demo/rishiverse_demo.html`](file:///Users/rudrasharma/Desktop/AttendMate-Bunk-Calculator-Attendance-Tracker/extension/demo/rishiverse_demo.html) or [rishiverse.rishihood.edu.in](https://rishiverse.rishihood.edu.in).
