# 🚀 Bunkr Extension - Complete Installation Guide

This guide walks you through setting up the Bunkr Bunk Calculator & Attendance Tracker extension on **both PC (macOS)** and **Mobile (iOS & Android)** for **Rishihood University's Rishiverse (`rishiverse.rishihood.edu.in` / `rishihood.rishiverse.com`)** and **Canvas LMS**.

---

## 💻 1. Installation on PC (macOS)

### A. Google Chrome / Brave / Arc / Microsoft Edge
These browsers use the Chromium engine and run the extension directly:

1. Open your browser and navigate to the Extensions management page:
   - **Chrome**: `chrome://extensions`
   - **Brave**: `brave://extensions`
   - **Edge**: `edge://extensions`
   - **Arc**: Open Settings &rarr; Extensions
2. Enable **Developer mode** (toggle switch in the top-right corner).
3. Click the **"Load unpacked"** button in the top-left corner.
4. Select the `extension` folder located at:
   ```
   /Users/rudrasharma/Desktop/AttendMate-Bunk-Calculator-Attendance-Tracker/extension
   ```
5. Pin the **Bunkr** icon to your toolbar for quick access.
6. Visit your college portal:
   - Go to [rishiverse.rishihood.edu.in](https://rishiverse.rishihood.edu.in) (or [rishihood.rishiverse.com](https://rishihood.rishiverse.com))
   - Or test immediately by opening `extension/demo/rishiverse_demo.html` in your browser!

---

### B. Apple Safari on macOS
Safari supports extensions via Userscripts (most seamless) or Safari Web Extensions:

1. Install **[Stay](https://apps.apple.com/app/stay-for-safari/id1591620171)** or **[Userscripts](https://apps.apple.com/app/userscripts/id1463298887)** (free from the Mac App Store) or Tampermonkey for Safari.
2. Enable the extension in **Safari Settings &rarr; Extensions**.
3. Open or drag `extension/bunkr.user.js` (or `attendmate.user.js`) into Stay / Userscripts.
4. Refresh `rishiverse.rishihood.edu.in`.

---

## 📱 2. Installation on Mobile (iOS & Android)

### A. iPhone & iPad (iOS Safari)
On iOS, Mobile Safari supports extensions through Safari Web Extensions or Userscript managers:

#### Recommended: Using Stay / Userscripts app (100% Free & Native Safari)
1. Download **[Stay - for Safari](https://apps.apple.com/app/stay-for-safari/id1591620171)** or **Userscripts** from the iOS App Store.
2. In your iPhone **Settings &rarr; Safari &rarr; Extensions**, enable **Stay** (or Userscripts) and allow permissions for `rishiverse.rishihood.edu.in` and `rishihood.rishiverse.com` (or All Websites).
3. Open the Stay app, tap **"+" (Add Script)** &rarr; choose **"Import from File"** &rarr; pick `bunkr.user.js` (you can AirDrop or iCloud Drive it from your Mac).
4. Open Safari and visit `https://rishiverse.rishihood.edu.in`.
5. You will see real-time bunk badges and the in-page Bunkr bar injected directly into your attendance table!

#### Alternative: Using Orion Browser on iOS
- [Orion Browser](https://kagi.com/orion/) has built-in native support for Chrome and Firefox extensions on iOS.
- Open Orion on iOS &rarr; Settings &rarr; Extensions &rarr; Install and load the Bunkr extension.

---

### B. Android (Kiwi Browser / Lemur Browser / Firefox)

#### Method 1: Kiwi Browser or Lemur Browser (Direct Chrome Extension Support)
1. Install **Kiwi Browser** or **Lemur Browser** from Google Play Store.
2. Open Kiwi Browser, tap the three dots menu (⋮) &rarr; **Extensions**.
3. Toggle **Developer mode** ON.
4. Tap **"+ (from .zip / .crx / .user.js)"** and select `bunkr.user.js` or the zipped `extension` folder.
5. Log into `rishiverse.rishihood.edu.in` (or `rishihood.rishiverse.com`).

#### Method 2: Tampermonkey / Violentmonkey on Android
1. In Firefox for Android or Kiwi Browser, install the **Tampermonkey** or **Violentmonkey** extension.
2. Tap "Add Script" and paste the contents of `bunkr.user.js`.

---

## 🎯 Features at a Glance
- ⚡ **Auto Attendance Detection**: Scrapes classes held, attended, absent, and percentages from Rishiverse ERP and Canvas LMS.
- 🟢 **Live Bunk Meter**: Instantly see "Can bunk 3 classes" or "Attend 2 more classes" directly next to every subject row.
- 🔮 **Interactive What-If Simulator**: Test how attending +1, +3, +5 or bunking +1, +2 classes will alter your semester percentage in real-time.
- 🎯 **Target Percentage Adjuster**: Instant toggles for 75%, 80%, 85%, or custom target thresholds.
- 📤 **Data & Backup Export**: Generates a JSON baseline file for local backups and syncing.
- 📱 **Mobile Touch-Friendly**: Designed with bottom-sheet gesture drawers and responsive controls for handheld devices.
- 🌙 **AMOLED Dark / Light Theme**: Matches your system theme with sleek frosted glass aesthetics.
