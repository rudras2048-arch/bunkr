// test/test_all_dev_fixtures.js
// Evaluates schedule_parser on all dev fixtures (PDF, CSV, TSV, TXT, ICS)

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const scheduleParser = require('../lib/schedule_parser');

async function testAll() {
  console.log('🧪 Testing all Dev fixtures with schedule_parser...\n');

  const devDir = path.resolve('test/fixtures/dev');
  const files = fs.readdirSync(devDir).filter(f => !f.endsWith('.json'));

  let passed = 0;
  let failed = 0;

  for (const f of files) {
    const fullPath = path.join(devDir, f);
    const gtPath = fullPath.replace(/\.[^.]+$/, '.json');
    if (!fs.existsSync(gtPath)) continue;

    const gt = JSON.parse(fs.readFileSync(gtPath, 'utf-8'));
    const ext = path.extname(f).slice(1).toLowerCase();

    try {
      let result;
      if (ext === 'pdf') {
        const buf = fs.readFileSync(fullPath);
        result = await scheduleParser.parseSchedule(buf, { fileName: f });
      } else if (['csv', 'tsv', 'txt', 'ics'].includes(ext)) {
        const text = fs.readFileSync(fullPath, 'utf-8');
        result = await scheduleParser.parseSchedule(text, { fileName: f });
      } else if (['png', 'jpg', 'jpeg'].includes(ext)) {
        // Image OCR in Node (fallback)
        const buf = fs.readFileSync(fullPath);
        result = await scheduleParser.parseSchedule(buf, { fileName: f });
      }

      assert(result, 'Result must exist');
      assert(result.weeklySessionsCount > 0, 'Must have at least 1 session');

      // Check slot confidence scores
      let minConf = 1.0;
      for (const subj of Object.values(result.SLOTS)) {
        for (const slot of subj.slots) {
          assert(typeof slot.confidence === 'number', 'Slot must have confidence score');
          if (slot.confidence < minConf) minConf = slot.confidence;
        }
      }

      console.log(`✅ [PASS] ${f} (${ext.toUpperCase()}): Expected ${gt.length} sessions, parsed ${result.weeklySessionsCount} sessions across ${result.subjectsCount} subjects (Min conf: ${minConf.toFixed(2)})`);
      passed++;
    } catch (e) {
      console.log(`❌ [FAIL] ${f} (${ext.toUpperCase()}): ${e.message}`);
      failed++;
    }
  }

  console.log(`\n📊 Summary: ${passed} Passed, ${failed} Failed out of ${passed + failed} dev fixtures.`);
}

testAll();
