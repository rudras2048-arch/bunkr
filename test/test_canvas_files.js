// test/test_canvas_files.js
// Verification suite for Canvas Smart Course Files Hub & Exam Cram Pack Engine

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('🧪 Starting Canvas Course Files Hub & Cram Pack Verification Suite...\n');

const canvasFiles = require('../extension/content/canvas_files');

// Load HTML fixture: Rishihood CSD02C1001 Mathematics-I Modules & Files
const fixturePath = path.resolve(__dirname, '../extension/demo/canvas_modules_demo.html');
const demoHtml = fs.readFileSync(fixturePath, 'utf8');

// ============================================================================
// PART 1: Course Header & Document Parsing
// ============================================================================
console.log('1️⃣ Testing Canvas Course Header & Metadata Extraction...');

const header = canvasFiles.parseCourseHeader(demoHtml);
assert.strictEqual(header.courseCode, 'CSD02C1001', 'Course code must be CSD02C1001');
assert.strictEqual(header.courseTitle, 'Mathematics-I', 'Course title must be Mathematics-I');
assert.strictEqual(header.fullTitle, 'CSD02C1001 Mathematics-I', 'Full title must match');
console.log(`   ✅ Course Header parsed: "${header.fullTitle}" (Code: ${header.courseCode}, Title: ${header.courseTitle})`);

// ============================================================================
// PART 2: Modules Scraping & Indexing
// ============================================================================
console.log('\n2️⃣ Testing Canvas Modules & Units Scraping (/courses/*/modules)...');

const indexed = canvasFiles.indexCourseDocuments(demoHtml, { baseUrl: 'https://rishihood.instructure.com' });
assert(Array.isArray(indexed.files), 'indexed.files must be an array');
assert(indexed.files.length >= 8, `Must index at least 8 files from demo, got ${indexed.files.length}`);

console.log(`   ✅ Successfully indexed ${indexed.files.length} documents across ${indexed.modules.length} modules/sections.`);
console.log(`   ✅ Total course material size: ${indexed.stats.totalSizeFormatted} across all units.`);

// Check specific files
const filesByName = new Map();
indexed.files.forEach((f) => filesByName.set(f.name, f));

// File 1: Limits Lecture PDF
const f1 = filesByName.get('Lecture 01 - Limits and Continuity.pdf');
assert(f1, 'Must find Lecture 01 - Limits and Continuity.pdf');
assert.strictEqual(f1.type, '.pdf', 'f1 type must be .pdf');
assert.strictEqual(f1.extension, 'pdf', 'f1 extension must be pdf');
assert.strictEqual(f1.category, 'Slides', 'f1 category must be Slides');
assert.strictEqual(f1.size, '2.4 MB', 'f1 size must be 2.4 MB');
assert.strictEqual(f1.unit, 'Unit 1', 'f1 unit must be Unit 1');
assert(f1.downloadUrl.includes('download_frd=1'), 'downloadUrl must contain download_frd=1');
console.log('   ✅ Unit 1 PDF lecture notes parsed and categorized as Slides.');

// File 2: Unit 1 PPTX Slides
const f2 = filesByName.get('Unit 1 Lecture Slides.pptx');
assert(f2, 'Must find Unit 1 Lecture Slides.pptx');
assert.strictEqual(f2.type, '.pptx', 'f2 type must be .pptx');
assert.strictEqual(f2.category, 'Slides', 'f2 category must be Slides');
assert.strictEqual(f2.size, '14.2 MB', 'f2 size must be 14.2 MB');
console.log('   ✅ Unit 1 PPTX slides parsed correctly with 14.2 MB size.');

// File 3: Course Syllabus
const f3 = filesByName.get('Course Syllabus and Grading Policy 2026.pdf');
assert(f3, 'Must find Syllabus');
assert.strictEqual(f3.category, 'Syllabus', 'f3 category must be Syllabus');
assert.strictEqual(f3.size, '450 KB', 'f3 size must be 450 KB');
console.log('   ✅ Course Syllabus parsed correctly and categorized as Syllabus.');

// File 4: Problem Set / Assignment
const f4 = filesByName.get('Problem Set 1 - Limits Practice.docx');
assert(f4, 'Must find Problem Set 1');
assert.strictEqual(f4.category, 'Assignments', 'f4 category must be Assignments');
assert.strictEqual(f4.size, '180 KB', 'f4 size must be 180 KB');
console.log('   ✅ Assignment / Problem Set parsed correctly.');

// File 5: Code Archive
const f5 = filesByName.get('Supplementary_Code_Examples.zip');
assert(f5, 'Must find ZIP file');
assert.strictEqual(f5.type, '.zip', 'f5 type must be .zip');
assert.strictEqual(f5.category, 'Other', 'f5 category must be Other');
console.log('   ✅ Archive (.zip) parsed correctly.');

// ============================================================================
// PART 3: Live Keyword & Tab Filtering
// ============================================================================
console.log('\n3️⃣ Testing Live Keyword Search & Category Filtering...');

// 3a. Search by keyword "continuity" (specific file keyword)
const continuityResults = canvasFiles.filterFiles(indexed.files, 'continuity', 'All');
assert.strictEqual(continuityResults.length, 1, 'Keyword "continuity" must match exactly 1 document');
assert.strictEqual(continuityResults[0].name, 'Lecture 01 - Limits and Continuity.pdf');
console.log('   ✅ Live keyword search for "continuity" returned 1 matching item.');

// 3b. Search by keyword "practice" (matches across multiple units)
const practiceResults = canvasFiles.filterFiles(indexed.files, 'practice', 'All');
assert.strictEqual(practiceResults.length, 2, 'Keyword "practice" must match 2 documents');
assert(practiceResults.some((f) => f.name.includes('Limits Practice')));
assert(practiceResults.some((f) => f.name.includes('Integrals_CheatSheet')));
console.log('   ✅ Live keyword search for "practice" returned 2 matching items across units.');

// 3c. Search by unit keyword "limits" (matches all 4 items under Unit 1: Differential Calculus & Limits)
const limitsResults = canvasFiles.filterFiles(indexed.files, 'limits', 'All');
assert.strictEqual(limitsResults.length, 4, 'Unit keyword "limits" matches 4 items in Unit 1');
console.log('   ✅ Unit keyword search for "limits" returned all 4 items in Unit 1.');

// 3d. Search by multi-term "unit 1 slides"
const multiTermResults = canvasFiles.filterFiles(indexed.files, 'unit 1 slides', 'All');
assert(multiTermResults.length >= 1, 'Multi-term search must return Unit 1 slides');
console.log('   ✅ Multi-token search for "unit 1 slides" matched correctly.');

// 3c. Filter by 'Slides' tab
const slidesOnly = canvasFiles.filterFiles(indexed.files, '', 'Slides');
assert(slidesOnly.length >= 4, `Must filter to slide documents, got ${slidesOnly.length}`);
slidesOnly.forEach((s) => {
  assert(s.category === 'Slides' || s.extension === 'pptx' || s.extension === 'ppt', 'Every item in Slides tab must be a slide');
});
console.log(`   ✅ 'Slides' tab filtered cleanly (${slidesOnly.length} lecture slides).`);

// 3d. Filter by 'Syllabus' tab
const syllabusOnly = canvasFiles.filterFiles(indexed.files, '', 'Syllabus');
assert.strictEqual(syllabusOnly.length, 1, 'Must find exactly 1 syllabus document');
assert.strictEqual(syllabusOnly[0].name, 'Course Syllabus and Grading Policy 2026.pdf');
console.log('   ✅ ' + "'Syllabus' tab filtered cleanly (1 document).");

// 3e. Filter by 'Assignments' tab
const assignmentsOnly = canvasFiles.filterFiles(indexed.files, '', 'Assignments');
assert.strictEqual(assignmentsOnly.length, 1, 'Must find exactly 1 assignment document');
assert.strictEqual(assignmentsOnly[0].name, 'Problem Set 1 - Limits Practice.docx');
console.log('   ✅ ' + "'Assignments' tab filtered cleanly (1 document).");

// ============================================================================
// PART 4: 1-Click Exam Cram Pack Generation
// ============================================================================
console.log('\n4️⃣ Testing 1-Click Exam Cram Pack Generator...');

// 4a. Unit 1 Cram Pack
const unit1Cram = canvasFiles.generateCramPack(indexed.files, 'Unit 1');
assert(unit1Cram, 'Unit 1 Cram Pack must be generated');
assert(unit1Cram.slideCount >= 2, `Unit 1 must contain at least 2 slide items, got ${unit1Cram.slideCount}`);
assert(unit1Cram.totalSizeBytes > 0, 'Total size must be greater than 0');
assert(unit1Cram.downloadUrls.length === unit1Cram.slideCount, 'Download URLs count must match slide count');
console.log(`   ✅ Unit 1 Exam Cram Pack generated: ${unit1Cram.slideCount} slides (${unit1Cram.totalSizeFormatted}).`);

// 4b. All Course Units Cram Pack
const fullCram = canvasFiles.generateCramPack(indexed.files);
assert(fullCram.slideCount >= 4, `All course cram pack must contain at least 4 slides, got ${fullCram.slideCount}`);
console.log(`   ✅ Semester-wide Exam Cram Pack generated: ${fullCram.slideCount} slides (${fullCram.totalSizeFormatted}).`);

// 4c. Link Formats: Markdown & Plain Text & cURL
const mdLinks = canvasFiles.formatCramPackLinks(indexed.files, 'markdown');
assert(mdLinks.includes('[Lecture 01 - Limits and Continuity.pdf]'), 'Markdown must format link with [Title]');
assert(mdLinks.includes('download_frd=1'), 'Markdown link must have direct download URL');

const plainLinks = canvasFiles.formatCramPackLinks(indexed.files, 'plain');
assert(plainLinks.includes('Lecture 01 - Limits and Continuity.pdf: https://'), 'Plain text must format Title: URL');

const curlScript = canvasFiles.formatCramPackLinks(indexed.files, 'curl');
assert(curlScript.includes('#!/usr/bin/env bash'), 'cURL script must have shebang');
assert(curlScript.includes('curl -L -O'), 'cURL script must have curl command');
console.log('   ✅ Cram Pack link formatting verified for Markdown, Plain Text, and cURL bash script.');

// ============================================================================
// PART 5: Utilities, File Sizes & URL Normalization
// ============================================================================
console.log('\n5️⃣ Testing Utility Functions & File Size Normalization...');

// 5a. File Size Parser
assert.strictEqual(canvasFiles.parseFileSize('2.4 MB').sizeBytes, 2516582);
assert.strictEqual(canvasFiles.parseFileSize('450 KB').sizeBytes, 460800);
assert.strictEqual(canvasFiles.parseFileSize('1.2 GB').sizeBytes, 1288490189);
assert.strictEqual(canvasFiles.parseFileSize('512 bytes').sizeBytes, 512);
console.log('   ✅ parseFileSize correctly converted MB, KB, GB, and bytes.');

// 5b. Download URL Normalization
const rawCanvasUrl = '/courses/101/files/555';
const normalized = canvasFiles.normalizeDownloadUrl(rawCanvasUrl, 'https://rishihood.instructure.com');
assert.strictEqual(
  normalized,
  'https://rishihood.instructure.com/courses/101/files/555/download?download_frd=1',
  'Must normalize relative URL and append download_frd=1'
);
console.log('   ✅ normalizeDownloadUrl properly formats relative Canvas file paths with direct download flag.');

// ============================================================================
// PART 6: Manifest Registration Verification
// ============================================================================
console.log('\n6️⃣ Verifying Extension Manifest Registration...');

const manifestPath = path.resolve(__dirname, '../extension/manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const contentScripts = manifest.content_scripts;
assert(Array.isArray(contentScripts), 'content_scripts must be an array');
const allJs = contentScripts[0].js;
assert(
  allJs.includes('content/canvas_files.js'),
  'manifest.json content_scripts must register content/canvas_files.js'
);
console.log('   ✅ canvas_files.js is strictly registered in extension/manifest.json content_scripts.');

// ============================================================================
// PART 7: Throttled Download & URL Fallback Verification (Milestone 4 / F-07)
// ============================================================================
console.log('\n7️⃣ Testing Throttled Download & URL Fallback Verification (F-07)...');

(async () => {
  // 7a. Fallback URL Verification on Indexed Files
  assert(indexed.files.length > 0, 'Indexed files should not be empty');
  indexed.files.forEach((f) => {
    assert(f.fallbackUrl, `File "${f.name}" must have a fallbackUrl defined`);
    assert(
      !f.fallbackUrl.includes('download_frd=1'),
      `File "${f.name}" fallbackUrl must NOT contain "download_frd=1", got: ${f.fallbackUrl}`
    );
    assert(
      f.downloadUrl.includes('download_frd=1') || f.downloadUrl.includes('download'),
      `File "${f.name}" downloadUrl must be direct endpoint`
    );
  });
  console.log(`   ✅ Verified fallbackUrl defined and free of download_frd=1 on all ${indexed.files.length} indexed files.`);

  // 7b. Throttled cURL Script Assertions
  const throttledCurl = canvasFiles.formatCramPackLinks(indexed.files, 'curl');

  assert(
    throttledCurl.includes('#!/usr/bin/env bash'),
    'cURL script must have bash shebang'
  );
  assert(
    throttledCurl.includes('Bunkr Exam Cram Pack Safe Batch Downloader (Throttled)'),
    'cURL script must include throttled header'
  );
  assert(
    throttledCurl.includes('# Note: 1-second delay between requests to comply with Canvas rate limits'),
    'cURL script must include rate-limit compliance note'
  );
  assert(
    throttledCurl.includes('sleep 1'),
    'cURL script must include "sleep 1" between consecutive requests'
  );
  assert(
    throttledCurl.includes('|| curl -L -O -f'),
    'cURL script must format commands with fallback: "|| curl -L -O -f"'
  );

  // Verify that sleep 1 does not follow the last slide
  const curlLines = throttledCurl.split('\n');
  const nonEmptyLines = curlLines.filter((l) => l.trim().length > 0);
  const lastLine = nonEmptyLines[nonEmptyLines.length - 1];
  assert.notStrictEqual(
    lastLine,
    'sleep 1',
    'cURL script must NOT end with sleep 1 after the final file'
  );
  console.log('   ✅ cURL script contains rate-limit compliance header, sleep 1 delays, and fallback execution.');

  // 7c. URL Normalization for Relative and Absolute Paths
  // Relative path without download flag
  const rel1 = canvasFiles.getDownloadUrls('/courses/101/files/555', 'https://rishihood.instructure.com');
  assert.strictEqual(
    rel1.downloadUrl,
    'https://rishihood.instructure.com/courses/101/files/555/download?download_frd=1',
    'Relative path must produce direct downloadUrl with download_frd=1'
  );
  assert.strictEqual(
    rel1.fallbackUrl,
    'https://rishihood.instructure.com/courses/101/files/555',
    'Relative path must produce clean fallbackUrl'
  );

  // Relative path already with /download?download_frd=1
  const rel2 = canvasFiles.getDownloadUrls('/courses/101/files/555/download?download_frd=1', 'https://rishihood.instructure.com');
  assert.strictEqual(
    rel2.downloadUrl,
    'https://rishihood.instructure.com/courses/101/files/555/download?download_frd=1',
    'Direct downloadUrl must retain download_frd=1'
  );
  assert.strictEqual(
    rel2.fallbackUrl,
    'https://rishihood.instructure.com/courses/101/files/555/download',
    'Fallback URL must strip download_frd=1'
  );

  // Absolute path with download_frd=1
  const abs1 = canvasFiles.getDownloadUrls('https://rishihood.instructure.com/courses/101/files/8888/download?download_frd=1');
  assert.strictEqual(
    abs1.downloadUrl,
    'https://rishihood.instructure.com/courses/101/files/8888/download?download_frd=1'
  );
  assert.strictEqual(
    abs1.fallbackUrl,
    'https://rishihood.instructure.com/courses/101/files/8888/download'
  );

  // Absolute path without download_frd=1
  const abs2 = canvasFiles.getDownloadUrls('https://rishihood.instructure.com/courses/101/files/8888');
  assert.strictEqual(
    abs2.downloadUrl,
    'https://rishihood.instructure.com/courses/101/files/8888/download?download_frd=1'
  );
  assert.strictEqual(
    abs2.fallbackUrl,
    'https://rishihood.instructure.com/courses/101/files/8888'
  );

  // normalizeDownloadUrl backward-compatibility check
  const normRel = canvasFiles.normalizeDownloadUrl('/courses/101/files/555', 'https://rishihood.instructure.com');
  assert.strictEqual(normRel, rel1.downloadUrl, 'normalizeDownloadUrl must return direct downloadUrl');
  console.log('   ✅ URL normalization handles relative and absolute paths for direct and fallback links.');

  // 7d. batchDownloadSequential Execution and Spacing
  assert(typeof canvasFiles.batchDownloadSequential === 'function', 'batchDownloadSequential must be exported');
  const mockBatchFiles = [
    { name: 'Lecture 1.pdf', downloadUrl: 'https://instructure.com/files/1/download?download_frd=1', fallbackUrl: 'https://instructure.com/files/1' },
    { name: 'Lecture 2.pdf', downloadUrl: 'https://instructure.com/files/2/download?download_frd=1', fallbackUrl: 'https://instructure.com/files/2' }
  ];

  const progressLogs = [];
  const startTs = Date.now();
  await canvasFiles.batchDownloadSequential(mockBatchFiles, 50, (current, total, file) => {
    progressLogs.push({ current, total, name: file.name });
  });
  const elapsed = Date.now() - startTs;

  assert.strictEqual(progressLogs.length, 2, 'Should receive progress callback for each slide');
  assert.strictEqual(progressLogs[0].current, 1);
  assert.strictEqual(progressLogs[0].total, 2);
  assert.strictEqual(progressLogs[1].current, 2);
  assert.strictEqual(progressLogs[1].total, 2);
  assert(elapsed >= 40, `Should enforce delay between downloads (elapsed ${elapsed}ms >= 40ms)`);
  console.log(`   ✅ batchDownloadSequential executed with rate-limit pacing (${elapsed}ms for 2 items) and progress callbacks.`);

  console.log('\n🎉 ALL CANVAS COURSE FILES HUB & EXAM CRAM PACK TESTS PASSED! (100% Verification Parity)');
})().catch((err) => {
  console.error('\n❌ Test failure in Canvas Files suite:', err);
  process.exit(1);
});
