// test/run_browser_tests.js
// Playwright End-to-End Browser Test Suite for BUNKR Schedule Upload & Timetable System

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const EXTENSION_PATH = path.resolve('extension');
const FIXTURES_DIR = path.resolve('test/fixtures');
const SCREENSHOTS_DIR = path.resolve('test/screenshots');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function runSuite() {
  console.log('🚀 [Tester] Starting Real-Browser Playwright Test Suite for BUNKR...');
  console.log('📦 Extension path:', EXTENSION_PATH);

  const testResults = {
    fixtures: [],
    popupIssues: [],
    uiIssues: [],
    storageIssues: [],
    engineBackgroundIssues: []
  };

  // Launch persistent context with extension loaded
  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--no-sandbox'
    ]
  });

  try {
    // 1. Discover Extension ID via service worker
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker', { timeout: 10000 }).catch(() => null);
    }

    if (!background) {
      throw new Error('Service worker failed to register for BUNKR extension');
    }

    const extensionId = background.url().split('/')[2];
    console.log(`✅ Service worker registered. Extension ID: ${extensionId}`);

    // =========================================================================
    // TEST 1: Popup Lifecycle, File Picker & Schedule Navigation
    // =========================================================================
    console.log('\n--- TEST 1: Extension Popup Lifecycle & File Picker ---');
    const popupPage = await context.newPage();
    const consoleLogs = [];
    popupPage.on('console', msg => consoleLogs.push(`[Popup Console ${msg.type()}]: ${msg.text()}`));
    popupPage.on('pageerror', err => consoleLogs.push(`[Popup Error]: ${err.message}`));

    await popupPage.goto(`chrome-extension://${extensionId}/popup/popup.html`);
    await popupPage.waitForLoadState('domcontentloaded');
    await popupPage.screenshot({ path: path.join(SCREENSHOTS_DIR, '01_popup_initial.png') });
    console.log('📸 Captured 01_popup_initial.png');

    // Switch to Nudges tab
    await popupPage.click('.tab-btn[data-tab="nudges-tab"]');
    await popupPage.waitForTimeout(500);
    await popupPage.screenshot({ path: path.join(SCREENSHOTS_DIR, '02_popup_nudges_tab.png') });
    console.log('📸 Captured 02_popup_nudges_tab.png');

    // Check today's classes rendered in popup initially
    const initialClassesHtml = await popupPage.$eval('#popup-today-classes', el => el.innerHTML);
    console.log('Initial popup today classes HTML:', initialClassesHtml.trim().slice(0, 150));

    // Test clicking Customize Schedule button from popup
    const popupScheduleBtn = await popupPage.$('#popup-schedule-btn');
    if (popupScheduleBtn) {
      const pagePromise = context.waitForEvent('page', { timeout: 5000 }).catch(() => null);
      await popupScheduleBtn.click();
      const newPage = await pagePromise;
      if (newPage) {
        console.log('✅ Popup schedule button opened new tab:', newPage.url());
        await newPage.close();
      } else {
        console.log('⚠️ Popup schedule button did not open a new page (or opened window.open)');
        testResults.popupIssues.push({
          type: 'POPUP_NAVIGATION',
          message: 'Clicking Customize Schedule from popup did not trigger standard page event'
        });
      }
    }

    // Test file input in popup (Restore button uses <input type="file">)
    const restoreInput = await popupPage.$('#restore-file-input');
    if (restoreInput) {
      console.log('ℹ️ Popup contains hidden #restore-file-input.');
      // In native Chrome, clicking a file picker inside a popup window automatically closes the popup due to blur.
      testResults.popupIssues.push({
        type: 'FILE_PICKER_IN_POPUP',
        message: 'Direct file input in browser action popup is prone to popup closure on window blur in Chrome. BUNKR appropriately redirects schedule uploads to the dedicated New Tab Command Center.'
      });
    }

    await popupPage.close();

    // =========================================================================
    // TEST 2: New Tab Schedule Upload Modal (Initial State)
    // =========================================================================
    console.log('\n--- TEST 2: New Tab Schedule Modal Initial State ---');
    const newtabPage = await context.newPage();
    newtabPage.on('console', msg => consoleLogs.push(`[NewTab Console ${msg.type()}]: ${msg.text()}`));
    newtabPage.on('pageerror', err => consoleLogs.push(`[NewTab Error]: ${err.message}`));

    // Navigate to newtab with query param modal=schedule
    await newtabPage.goto(`chrome-extension://${extensionId}/newtab/newtab.html?modal=schedule`);
    await newtabPage.waitForSelector('#schedule-modal', { state: 'visible', timeout: 5000 });
    await newtabPage.screenshot({ path: path.join(SCREENSHOTS_DIR, '03_schedule_modal_initial.png') });
    console.log('📸 Captured 03_schedule_modal_initial.png');

    const statusText = await newtabPage.$eval('#schedule-status-text', el => el.textContent);
    console.log('Schedule status text:', statusText);

    // =========================================================================
    // TEST 3: Testing All Fixtures Across Diverse Formats
    // =========================================================================
    console.log('\n--- TEST 3: Fixture Parsing & Upload Flow Across Formats ---');
    const manifestPath = path.join(FIXTURES_DIR, 'manifest.json');
    let fixturesList = [];

    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      const rawList = Array.isArray(manifest) ? manifest : (manifest.fixtures || []);
      fixturesList = rawList.map(item => ({
        file: item.file || path.join('test/fixtures', item.subset, item.fileName),
        ground_truth: item.ground_truth || path.join('test/fixtures', item.subset, item.jsonName),
        subset: item.subset,
        format: item.format,
        sessionCount: item.sessionCount,
        title: item.title,
        description: item.description
      }));
    } else {
      // Discover manually
      for (const subset of ['dev', 'held_out']) {
        const subDir = path.join(FIXTURES_DIR, subset);
        if (fs.existsSync(subDir)) {
          const files = fs.readdirSync(subDir);
          for (const f of files) {
            if (!f.endsWith('.json')) {
              fixturesList.push({
                file: path.join('test/fixtures', subset, f),
                ground_truth: path.join('test/fixtures', subset, f.replace(/\.[^.]+$/, '.json')),
                subset,
                format: path.extname(f).slice(1).toUpperCase()
              });
            }
          }
        }
      }
    }

    console.log(`Found ${fixturesList.length} fixtures to evaluate in the real browser.`);

    for (let i = 0; i < fixturesList.length; i++) {
      const fix = fixturesList[i];
      const fullPath = path.resolve(fix.file);
      const gtPath = path.resolve(fix.ground_truth);
      const basename = path.basename(fix.file);
      console.log(`\nTesting fixture [${i + 1}/${fixturesList.length}]: ${basename} (${fix.format}, ${fix.subset})`);

      if (!fs.existsSync(fullPath)) {
        console.log(`   ❌ File not found on disk: ${fullPath}`);
        continue;
      }

      let gtSessions = [];
      if (fs.existsSync(gtPath)) {
        try {
          gtSessions = JSON.parse(fs.readFileSync(gtPath, 'utf-8'));
        } catch (e) {
          console.log(`   ⚠️ Could not read ground truth: ${e.message}`);
        }
      }

      // Re-open schedule modal if closed
      const isModalVisible = await newtabPage.$eval('#schedule-modal', el => el.style.display !== 'none');
      if (!isModalVisible) {
        await newtabPage.click('#cc-custom-schedule-btn');
        await newtabPage.waitForSelector('#schedule-modal', { state: 'visible' });
      }

      // Reset preview and alerts between fixture runs
      await newtabPage.evaluate(() => {
        const preview = document.getElementById('schedule-preview-section');
        if (preview) preview.style.display = 'none';
        const err = document.getElementById('schedule-error-alert');
        if (err) err.style.display = 'none';
        const succ = document.getElementById('schedule-success-alert');
        if (succ) succ.style.display = 'none';
      });

      // Upload file via file input
      const fileInput = await newtabPage.$('#schedule-file-input');
      await fileInput.evaluate(el => el.value = '');
      await fileInput.setInputFiles(fullPath);

      // Wait for loading indicator to finish or alert to appear
      await newtabPage.waitForTimeout(1000);
      try {
        await newtabPage.waitForFunction(() => {
          const loading = document.getElementById('schedule-loading');
          return !loading || loading.style.display === 'none';
        }, { timeout: 15000 });
      } catch (e) {
        console.log('   ⚠️ Timeout waiting for schedule-loading to disappear');
      }

      // Check success vs error alert
      const errorVisible = await newtabPage.$eval('#schedule-error-alert', el => el.style.display !== 'none');
      const successVisible = await newtabPage.$eval('#schedule-success-alert', el => el.style.display !== 'none');
      const errorMsg = errorVisible ? await newtabPage.$eval('#schedule-error-alert', el => el.textContent.trim()) : null;
      const successMsg = successVisible ? await newtabPage.$eval('#schedule-success-alert', el => el.textContent.trim()) : null;

      const previewVisible = await newtabPage.$eval('#schedule-preview-section', el => el.style.display !== 'none');
      const statsText = previewVisible ? await newtabPage.$eval('#schedule-summary-stats', el => el.textContent.trim()) : null;

      const resultEntry = {
        fixture: basename,
        format: fix.format,
        subset: fix.subset,
        groundTruthCount: gtSessions.length,
        success: successVisible && !errorVisible && previewVisible,
        error: errorMsg,
        successMsg: successMsg,
        parsedStats: statsText
      };

      if (successVisible && previewVisible) {
        console.log(`   ✅ PARSED SUCCESSFULLY: ${statsText} (Ground Truth: ${gtSessions.length} sessions)`);
        // Capture screenshot of successful preview for representative formats
        if (['dev_01_word_exported.pdf', 'dev_14_standard_csv.csv', 'dev_18_standard_ical.ics', 'dev_16_day_grouped_text.txt'].includes(basename)) {
          const shotName = `preview_${basename.replace(/\.[^.]+$/, '')}.png`;
          await newtabPage.screenshot({ path: path.join(SCREENSHOTS_DIR, shotName) });
          console.log(`   📸 Saved ${shotName}`);
        }
      } else {
        console.log(`   ❌ FAILED TO PARSE: ${errorMsg || 'Unknown parsing failure'}`);
        // Capture screenshot of error state
        if (['dev_05_scanned_image_in_pdf.pdf', 'dev_08_clean_screenshot.png', 'dev_09_mobile_photo.jpg', 'dev_10_angled_skewed.jpg'].includes(basename)) {
          const shotName = `error_${basename.replace(/\.[^.]+$/, '')}.png`;
          await newtabPage.screenshot({ path: path.join(SCREENSHOTS_DIR, shotName) });
          console.log(`   📸 Saved ${shotName}`);
        }
      }

      testResults.fixtures.push(resultEntry);
    }

    // =========================================================================
    // TEST 4: Interactive Preview Editing (Add, Edit, Delete, Save)
    // =========================================================================
    console.log('\n--- TEST 4: Schedule Preview Editing & Storage Flow ---');
    // First, upload a known good file, e.g. dev_14_standard_csv.csv
    const goodFile = path.resolve('test/fixtures/dev/dev_14_standard_csv.csv');
    const fileInput = await newtabPage.$('#schedule-file-input');
    await fileInput.setInputFiles(goodFile);
    await newtabPage.waitForTimeout(1000);

    await newtabPage.screenshot({ path: path.join(SCREENSHOTS_DIR, '04_preview_loaded_csv.png') });
    console.log('📸 Captured 04_preview_loaded_csv.png');

    // 4A: Delete a slot
    console.log('Testing slot deletion (del-slot)...');
    const initialSlotCount = await newtabPage.$$eval('.slot-item', els => els.length);
    console.log('Initial slots in preview:', initialSlotCount);

    const firstDelBtn = await newtabPage.$('.del-slot');
    if (firstDelBtn) {
      await firstDelBtn.click();
      await newtabPage.waitForTimeout(500);
      const afterDelCount = await newtabPage.$$eval('.slot-item', els => els.length);
      console.log('Slots after deletion:', afterDelCount);
      if (afterDelCount === initialSlotCount - 1) {
        console.log('✅ Slot deletion works correctly.');
      } else {
        console.log('❌ Slot deletion count mismatch.');
        testResults.uiIssues.push({ type: 'DELETE_SLOT_FAIL', message: 'Slot deletion failed to decrement UI items' });
      }
    }

    // 4B: Edit a slot
    console.log('Testing slot editing (edit-slot) via dialog prompt...');
    const editBtn = await newtabPage.$('.edit-slot');
    if (editBtn) {
      let promptIndex = 0;
      const promptValues = ['Computer Networks & Protocols', '09:30', '11:00', 'B302'];

      const dialogHandler = async dialog => {
        const val = promptValues[promptIndex] || 'Test';
        promptIndex++;
        // console.log(`Dialog [${dialog.type()}]: ${dialog.message()} -> responding: ${val}`);
        await dialog.accept(val);
      };

      newtabPage.on('dialog', dialogHandler);
      await editBtn.click();
      await newtabPage.waitForTimeout(1000);
      newtabPage.off('dialog', dialogHandler);

      await newtabPage.screenshot({ path: path.join(SCREENSHOTS_DIR, '05_preview_after_edit.png') });
      console.log('📸 Captured 05_preview_after_edit.png');

      const updatedName = await newtabPage.$eval('.slot-name', el => el.textContent);
      console.log('Updated slot name after edit:', updatedName);
    }

    // 4C: Add a new class slot (+ Add Class)
    console.log('Testing adding a new class slot (+ Add Class)...');
    const addSlotBtn = await newtabPage.$('#schedule-add-slot-btn');
    if (addSlotBtn) {
      let addPromptIndex = 0;
      // Day (1=Mon), Course Name, Start Time, End Time, Room
      const addPromptValues = ['1', 'Cloud Computing', '14:00', '15:30', 'Lab-3'];

      const addDialogHandler = async dialog => {
        const val = addPromptValues[addPromptIndex] || '';
        addPromptIndex++;
        await dialog.accept(val);
      };

      newtabPage.on('dialog', addDialogHandler);
      await addSlotBtn.click();
      await newtabPage.waitForTimeout(1000);
      newtabPage.off('dialog', addDialogHandler);

      await newtabPage.screenshot({ path: path.join(SCREENSHOTS_DIR, '06_preview_after_add.png') });
      console.log('📸 Captured 06_preview_after_add.png');
    }

    // 4D: Save & Apply Schedule
    console.log('Testing Save & Apply Schedule...');
    const saveBtn = await newtabPage.$('#schedule-save-btn');
    if (saveBtn) {
      let alertSeen = false;
      const saveDialogHandler = async dialog => {
        alertSeen = true;
        console.log(`Save confirmation dialog: ${dialog.message()}`);
        await dialog.accept();
      };

      newtabPage.on('dialog', saveDialogHandler);
      await saveBtn.click();
      await newtabPage.waitForTimeout(1000);
      newtabPage.off('dialog', saveDialogHandler);

      // Verify chrome.storage.local
      const storedTimetable = await newtabPage.evaluate(async () => {
        return new Promise(resolve => {
          chrome.storage.local.get(['customTimetable'], res => resolve(res.customTimetable));
        });
      });

      console.log('Stored customTimetable in chrome.storage.local:', {
        custom: storedTimetable?.custom,
        sessions: storedTimetable?.weeklySessionsCount,
        subjects: storedTimetable?.subjectsCount,
        savedAt: storedTimetable?.savedAt
      });

      if (storedTimetable && storedTimetable.custom) {
        console.log('✅ Schedule successfully persisted to chrome.storage.local');
      } else {
        console.log('❌ Failed to save customTimetable to chrome.storage.local');
        testResults.storageIssues.push({ type: 'STORAGE_SAVE_FAIL', message: 'customTimetable not found in storage after save' });
      }

      await newtabPage.screenshot({ path: path.join(SCREENSHOTS_DIR, '07_newtab_dashboard_with_custom.png') });
      console.log('📸 Captured 07_newtab_dashboard_with_custom.png');

      // 4E: Reload page and verify persistence
      console.log('Reloading New Tab page to test cold persistence...');
      await newtabPage.reload();
      await newtabPage.waitForLoadState('domcontentloaded');
      await newtabPage.waitForTimeout(1000);

      const scheduleSubText = await newtabPage.$eval('#cc-schedule-sub', el => el.textContent);
      console.log('Schedule subtitle on newtab after reload:', scheduleSubText);
      await newtabPage.screenshot({ path: path.join(SCREENSHOTS_DIR, '08_newtab_after_reload.png') });
      console.log('📸 Captured 08_newtab_after_reload.png');
    }

    // =========================================================================
    // TEST 5: Popup with Custom Timetable (Verifying Async Storage Race Bug)
    // =========================================================================
    console.log('\n--- TEST 5: Popup Behavior with Active Custom Timetable ---');
    const popupTestPage = await context.newPage();
    await popupTestPage.goto(`chrome-extension://${extensionId}/popup/popup.html`);
    await popupTestPage.waitForLoadState('domcontentloaded');
    await popupTestPage.click('.tab-btn[data-tab="nudges-tab"]');
    await popupTestPage.waitForTimeout(500);

    const popupClassesAfterSave = await popupTestPage.$eval('#popup-today-classes', el => el.innerHTML);
    console.log('Popup today classes HTML with custom timetable active:');
    console.log(popupClassesAfterSave.trim().slice(0, 300));

    await popupTestPage.screenshot({ path: path.join(SCREENSHOTS_DIR, '09_popup_with_custom_schedule.png') });
    console.log('📸 Captured 09_popup_with_custom_schedule.png');

    // Verify whether engine in popup has custom schedule or default schedule
    const engineActiveTimetableInPopup = await popupTestPage.evaluate(() => {
      const eng = window.BunkrEngine || window.AttendMateEngine;
      const tt = eng ? eng.getActiveTimetable() : null;
      return {
        isCustom: tt ? Boolean(tt.custom) : false,
        sessionsCount: tt ? tt.weeklySessionsCount : null
      };
    });
    console.log('Engine active timetable in popup context:', engineActiveTimetableInPopup);

    if (!engineActiveTimetableInPopup.isCustom) {
      console.log('🚨 CONFIRMED BUG: Popup fails to activate custom timetable in Engine due to race condition!');
      testResults.uiIssues.push({
        type: 'POPUP_TIMETABLE_RACE_CONDITION',
        message: 'popup.js calls renderTodayClasses() synchronously before chrome.storage.local.get completes, leaving engine on default timetable'
      });
    }

    await popupTestPage.close();

    // =========================================================================
    // TEST 6: Background Worker Nudge Engine Evaluation
    // =========================================================================
    console.log('\n--- TEST 6: Background Worker & Nudge Integration ---');
    const bgResult = await newtabPage.evaluate(async () => {
      return new Promise(resolve => {
        chrome.runtime.sendMessage({ type: 'TEST_NUDGE', course: 'Cloud Computing', time: '14:00', room: 'Lab-3' }, res => {
          resolve(res);
        });
      });
    });
    console.log('Background TEST_NUDGE response:', bgResult);

    // Test proactive nudge boundary limitations
    const bgBoundsCheck = await newtabPage.evaluate(() => {
      // Check SEMESTER_BOUNDS in background:
      return {
        today: new Date().toISOString(),
        currentDay: new Date().getDay()
      };
    });
    console.log('Current browser execution date & day:', bgBoundsCheck);

    // =========================================================================
    // TEST 7: Reset to Default Timetable
    // =========================================================================
    console.log('\n--- TEST 7: Reset to Default Schedule ---');
    const isModalOpen = await newtabPage.$eval('#schedule-modal', el => el.style.display !== 'none');
    if (!isModalOpen) {
      await newtabPage.click('#cc-custom-schedule-btn');
      await newtabPage.waitForSelector('#schedule-modal', { state: 'visible' });
    }

    const resetBtn = await newtabPage.$('#schedule-reset-btn');
    if (resetBtn) {
      const resetDialogHandler = async dialog => {
        console.log(`Reset confirmation dialog: ${dialog.message()}`);
        await dialog.accept();
      };
      newtabPage.on('dialog', resetDialogHandler);
      await resetBtn.click();
      await newtabPage.waitForTimeout(1000);
      newtabPage.off('dialog', resetDialogHandler);

      const storedAfterReset = await newtabPage.evaluate(async () => {
        return new Promise(resolve => {
          chrome.storage.local.get(['customTimetable'], res => resolve(res.customTimetable));
        });
      });
      console.log('Stored timetable after reset:', storedAfterReset);

      if (!storedAfterReset) {
        console.log('✅ Schedule successfully reset to default.');
      } else {
        console.log('❌ customTimetable still present after reset.');
        testResults.storageIssues.push({ type: 'RESET_FAIL', message: 'customTimetable was not removed from storage' });
      }

      await newtabPage.screenshot({ path: path.join(SCREENSHOTS_DIR, '10_schedule_after_reset.png') });
      console.log('📸 Captured 10_schedule_after_reset.png');
    }

    await newtabPage.close();

  } finally {
    await context.close();
  }

  // Save raw test output for report generation
  fs.writeFileSync(path.resolve('test/test_run_data.json'), JSON.stringify(testResults, null, 2));
  console.log('\n🏁 [Tester] Browser test run complete. Data saved to test/test_run_data.json');
}

runSuite().catch(err => {
  console.error('❌ Browser test execution failed:', err);
  process.exit(1);
});
