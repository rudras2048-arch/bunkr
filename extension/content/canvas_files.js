/**
 * Bunkr - Canvas Smart Course Files Hub & Exam Cram Pack Engine
 * Target: *://*.instructure.com/courses/*
 *
 * Capabilities:
 * 1. Scraper / Indexer:
 *    - Parses Canvas /courses/*\/modules and /courses/*\/files
 *    - Indexes course documents: name, size, type (.pdf, .pptx, .docx, .zip, etc.), download URL, module/unit name
 * 2. Search & Live Filtering:
 *    - Instant keyword search across titles, units, and file types
 *    - File type tabs: 'All', 'Slides', 'Syllabus', 'Assignments'
 * 3. 1-Click Exam Cram Pack:
 *    - Groups lecture slides by unit/module
 *    - 1-Click batch download or copy direct download links (Markdown, Plain Text, or cURL script)
 * 4. UI & Modal:
 *    - Spotlight Quick Search Modal triggered by Cmd+K / Ctrl+K or clicking 'Search Course Files' pill
 *    - Keyboard accessible (Arrow keys, Enter, Escape)
 * 5. Clean UMD export supporting Node.js test harness and browser runtime
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const exported = factory();
    module.exports = exported;
    if (exported && typeof exported === 'object') {
      Object.assign(module.exports, exported);
    }
  } else {
    const exported = factory();
    root.CanvasFiles = exported;
    root.BunkrCanvasFiles = exported;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // =========================================================================
  // CONSTANTS & FILE TYPE DICTIONARIES
  // =========================================================================

  const FILE_EXTENSIONS = {
    // Presentations / Slides
    pptx: { ext: 'pptx', type: '.pptx', category: 'slides', icon: '📊', label: 'PPTX' },
    ppt: { ext: 'ppt', type: '.ppt', category: 'slides', icon: '📊', label: 'PPT' },
    pps: { ext: 'pps', type: '.pps', category: 'slides', icon: '📊', label: 'PPS' },
    key: { ext: 'key', type: '.key', category: 'slides', icon: '📊', label: 'Keynote' },
    odp: { ext: 'odp', type: '.odp', category: 'slides', icon: '📊', label: 'ODP' },

    // Documents
    pdf: { ext: 'pdf', type: '.pdf', category: 'documents', icon: '📄', label: 'PDF' },
    docx: { ext: 'docx', type: '.docx', category: 'documents', icon: '📝', label: 'DOCX' },
    doc: { ext: 'doc', type: '.doc', category: 'documents', icon: '📝', label: 'DOC' },
    txt: { ext: 'txt', type: '.txt', category: 'documents', icon: '📄', label: 'TXT' },
    rtf: { ext: 'rtf', type: '.rtf', category: 'documents', icon: '📝', label: 'RTF' },
    odt: { ext: 'odt', type: '.odt', category: 'documents', icon: '📝', label: 'ODT' },

    // Spreadsheets
    xlsx: { ext: 'xlsx', type: '.xlsx', category: 'spreadsheets', icon: '📈', label: 'XLSX' },
    xls: { ext: 'xls', type: '.xls', category: 'spreadsheets', icon: '📈', label: 'XLS' },
    csv: { ext: 'csv', type: '.csv', category: 'spreadsheets', icon: '📈', label: 'CSV' },

    // Archives
    zip: { ext: 'zip', type: '.zip', category: 'archives', icon: '📦', label: 'ZIP' },
    tar: { ext: 'tar', type: '.tar', category: 'archives', icon: '📦', label: 'TAR' },
    gz: { ext: 'gz', type: '.gz', category: 'archives', icon: '📦', label: 'GZ' },
    rar: { ext: 'rar', type: '.rar', category: 'archives', icon: '📦', label: 'RAR' },
    '7z': { ext: '7z', type: '.7z', category: 'archives', icon: '📦', label: '7Z' },

    // Code
    py: { ext: 'py', type: '.py', category: 'code', icon: '💻', label: 'Python' },
    ipynb: { ext: 'ipynb', type: '.ipynb', category: 'code', icon: '💻', label: 'Jupyter' },
    js: { ext: 'js', type: '.js', category: 'code', icon: '💻', label: 'JavaScript' },
    ts: { ext: 'ts', type: '.ts', category: 'code', icon: '💻', label: 'TypeScript' },
    cpp: { ext: 'cpp', type: '.cpp', category: 'code', icon: '💻', label: 'C++' },
    c: { ext: 'c', type: '.c', category: 'code', icon: '💻', label: 'C' },
    java: { ext: 'java', type: '.java', category: 'code', icon: '💻', label: 'Java' },
    html: { ext: 'html', type: '.html', category: 'code', icon: '🌐', label: 'HTML' }
  };

  // =========================================================================
  // UTILITIES & STRING HELPERS
  // =========================================================================

  /**
   * Normalize and clean text string from HTML / whitespace
   */
  function cleanText(text) {
    if (!text) return '';
    return String(text)
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Extract course code and title from document or HTML string
   */
  function parseCourseHeader(doc) {
    let rawTitle = '';
    let courseId = '';

    if (typeof doc === 'string') {
      const html = doc;
      // Extract from breadcrumbs
      const crumbMatch = html.match(/<nav[^>]*id=["']breadcrumbs["'][^>]*>([\s\S]*?)<\/nav>/i) ||
                         html.match(/<ul[^>]*class=["'][^"']*ic-app-crumbs[^"']*["'][^>]*>([\s\S]*?)<\/ul>/i);
      if (crumbMatch) {
        const liMatches = [...crumbMatch[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)];
        if (liMatches.length >= 2) {
          rawTitle = cleanText(liMatches[1][1]);
        }
      }
      if (!rawTitle) {
        const h1Match = html.match(/<h1[^>]*class=["'][^"']*course-title[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i) ||
                        html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
        if (h1Match) rawTitle = cleanText(h1Match[1]);
      }
      if (!rawTitle) {
        const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        if (titleMatch) rawTitle = cleanText(titleMatch[1]);
      }
      const idMatch = html.match(/\/courses\/(\d+)/);
      if (idMatch) courseId = idMatch[1];
    } else if (doc && typeof doc === 'object') {
      const d = doc.ownerDocument || doc;
      const crumbItems = d.querySelectorAll ? d.querySelectorAll('#breadcrumbs ul li, .ic-app-crumbs li') : [];
      if (crumbItems && crumbItems.length >= 2) {
        rawTitle = cleanText(crumbItems[1].textContent);
      }
      if (!rawTitle && d.querySelector) {
        const heading = d.querySelector('h1.course-title, .course-title, h1');
        if (heading) rawTitle = cleanText(heading.textContent);
      }
      if (!rawTitle && d.title) {
        rawTitle = cleanText(d.title);
      }
      if (typeof window !== 'undefined' && window.location) {
        const idMatch = window.location.pathname.match(/\/courses\/(\d+)/);
        if (idMatch) courseId = idMatch[1];
      }
    }

    let courseCode = '';
    const codeMatch = (rawTitle || '').match(/\b([A-Z]{2,6}\d{1,4}[A-Z\d]*)\b/);
    if (codeMatch) {
      courseCode = codeMatch[1];
    }

    let courseTitle = rawTitle || '';
    if (courseCode) {
      courseTitle = courseTitle.replace(courseCode, '').replace(/^[:\s\-|–]+/, '').trim();
    }
    courseTitle = courseTitle.replace(/\s*\|\s*Canvas.*$/i, '').trim();

    return {
      courseCode: courseCode || 'COURSE',
      courseTitle: courseTitle || rawTitle || 'Course Files',
      fullTitle: rawTitle || `${courseCode} ${courseTitle}`.trim(),
      courseId: courseId || ''
    };
  }

  /**
   * Detect file extension, type, and icon from filename or URL
   */
  function detectFileType(filename, url = '') {
    const raw = (filename || url || '').toLowerCase();
    const extMatch = raw.match(/\.([a-z0-9]{2,5})(?:[?#]|$)/i);
    const ext = extMatch ? extMatch[1].toLowerCase() : '';

    if (ext && FILE_EXTENSIONS[ext]) {
      return { ...FILE_EXTENSIONS[ext] };
    }

    // Heuristics based on URL or icons
    if (raw.includes('pdf')) {
      return { ext: 'pdf', type: '.pdf', category: 'documents', icon: '📄', label: 'PDF' };
    }
    if (raw.includes('ppt') || raw.includes('presentation') || raw.includes('slides')) {
      return { ext: 'pptx', type: '.pptx', category: 'slides', icon: '📊', label: 'PPTX' };
    }
    if (raw.includes('zip') || raw.includes('archive')) {
      return { ext: 'zip', type: '.zip', category: 'archives', icon: '📦', label: 'ZIP' };
    }

    return {
      ext: ext || 'file',
      type: ext ? `.${ext}` : '.file',
      category: 'other',
      icon: '📎',
      label: ext ? ext.toUpperCase() : 'FILE'
    };
  }

  /**
   * Categorize file into live-filter tabs: 'Slides', 'Syllabus', 'Assignments', 'Other'
   */
  function categorizeFile(filename, moduleName = '', typeInfo = null) {
    const fn = (filename || '').toLowerCase();
    const mod = (moduleName || '').toLowerCase();
    const combined = `${fn} ${mod}`;

    // 1. Syllabus check
    if (
      combined.includes('syllabus') ||
      combined.includes('course outline') ||
      combined.includes('curriculum') ||
      combined.includes('course policy') ||
      combined.includes('grading policy') ||
      combined.includes('grading scheme')
    ) {
      return 'Syllabus';
    }

    // 2. Slides check (Presentations, lecture slides, decks, notes)
    const isPresentationType = typeInfo && (typeInfo.category === 'slides' || typeInfo.ext === 'pptx' || typeInfo.ext === 'ppt' || typeInfo.ext === 'key');
    if (
      isPresentationType ||
      combined.includes('slide') ||
      combined.includes('lecture') ||
      combined.includes('presentation') ||
      combined.includes('deck') ||
      combined.includes('session') ||
      combined.includes('class notes') ||
      /\blec\b|\bl0\d|\bl1\d|\bppt\b/i.test(combined)
    ) {
      return 'Slides';
    }

    // 3. Assignments check (Homework, problem sets, rubrics, projects, labs)
    if (
      combined.includes('assignment') ||
      combined.includes('homework') ||
      combined.includes('problem set') ||
      combined.includes('solution') ||
      combined.includes('rubric') ||
      combined.includes('exercise') ||
      combined.includes('lab') ||
      combined.includes('project') ||
      /\bhw\d*\b|\bps\d*\b/i.test(combined)
    ) {
      return 'Assignments';
    }

    // Default to Other
    return 'Other';
  }

  /**
   * Parse human-readable file size string to byte integer
   * e.g. "2.4 MB" -> 2516582
   */
  function parseFileSize(sizeStr) {
    if (!sizeStr) return { sizeBytes: 0, formatted: 'Unknown' };
    const str = String(sizeStr).trim();
    const match = str.match(/([\d.]+)\s*(bytes|b|kb|mb|gb|tb)?/i);
    if (!match) return { sizeBytes: 0, formatted: str };

    const value = parseFloat(match[1]);
    const unit = (match[2] || 'bytes').toUpperCase();

    let bytes = 0;
    if (unit === 'BYTES' || unit === 'B') {
      bytes = Math.round(value);
    } else if (unit === 'KB') {
      bytes = Math.round(value * 1024);
    } else if (unit === 'MB') {
      bytes = Math.round(value * 1024 * 1024);
    } else if (unit === 'GB') {
      bytes = Math.round(value * 1024 * 1024 * 1024);
    } else if (unit === 'TB') {
      bytes = Math.round(value * 1024 * 1024 * 1024 * 1024);
    }

    return {
      sizeBytes: bytes,
      formatted: formatBytes(bytes)
    };
  }

  /**
   * Format byte count into human-readable string (e.g. 2.4 MB)
   */
  function formatBytes(bytes) {
    if (!bytes || isNaN(bytes) || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const val = parseFloat((bytes / Math.pow(k, i)).toFixed(1));
    return `${val} ${sizes[i]}`;
  }

  /**
   * Generates both direct download URL (?download_frd=1) and standard fallback URL (strips download_frd=1)
   */
  function getDownloadUrls(url, baseUrl = '') {
    if (!url) return { downloadUrl: '', fallbackUrl: '' };
    let full = String(url).trim();

    // Attach baseUrl if relative
    if (full.startsWith('/') && !full.startsWith('//')) {
      const base = baseUrl || (typeof window !== 'undefined' && window.location ? window.location.origin : 'https://instructure.com');
      full = `${base.replace(/\/+$/, '')}${full}`;
    }

    // Generate standard fallback URL: clean standard Canvas endpoint without download_frd=1
    let fallbackUrl = full
      .replace(/([?&])download_frd=1(?:&|$)/, (match, prefix) => (match.endsWith('&') ? prefix : ''))
      .replace(/[?&]$/, '');

    // Generate direct download URL (ensure download_frd=1 on file / download endpoints)
    let directUrl = fallbackUrl;
    if (directUrl.includes('/files/') && !directUrl.includes('download')) {
      directUrl = directUrl.replace(/(\/files\/\d+)(?:\b|\/|$)/, '$1/download?download_frd=1');
    } else if (directUrl.includes('/download') && !directUrl.includes('download_frd=1')) {
      directUrl += (directUrl.includes('?') ? '&' : '?') + 'download_frd=1';
    }

    return {
      downloadUrl: directUrl,
      fallbackUrl: fallbackUrl
    };
  }

  /**
   * Normalize Canvas download URLs to ensure direct browser download
   */
  function normalizeDownloadUrl(url, baseUrl = '') {
    if (!url) return '';
    return getDownloadUrls(url, baseUrl).downloadUrl;
  }

  /**
   * Extract Unit or Module label from module title
   * e.g. "Unit 1: Differential Calculus & Limits" -> "Unit 1"
   */
  function extractUnitLabel(moduleName) {
    if (!moduleName) return 'General';
    const match = moduleName.match(/\b(Unit\s*\d+|Module\s*\d+|Week\s*\d+|Chapter\s*\d+|Topic\s*\d+)\b/i);
    return match ? match[1].trim() : cleanText(moduleName.split(/[:\-–]/)[0] || moduleName);
  }

  // =========================================================================
  // 1. SCRAPER & INDEXER ENGINE
  // =========================================================================

  /**
   * Parse Canvas Modules (/courses/*\/modules)
   * Supports both DOM Document / Element and HTML string
   */
  function parseCanvasModules(docOrHtml, options = {}) {
    if (!docOrHtml) return [];

    const baseUrl = options.baseUrl || (typeof window !== 'undefined' && window.location ? window.location.origin : '');
    const defaultCourse = options.courseName || '';
    const results = [];
    const seenUrls = new Set();

    // -----------------------------------------------------------------------
    // DOM Element / Document branch
    // -----------------------------------------------------------------------
    if (typeof docOrHtml === 'object' && docOrHtml.querySelectorAll) {
      const doc = docOrHtml.ownerDocument || docOrHtml;
      const moduleContainers = doc.querySelectorAll('.context_module, .item-group-condensed, [data-module-id]');

      moduleContainers.forEach((modEl, modIdx) => {
        // Module Title
        const headerEl = modEl.querySelector('.ig-header .name, .header h2, .collapse_module_link, h2.name, h2, .name');
        const moduleName = headerEl ? cleanText(headerEl.textContent) : `Module ${modIdx + 1}`;
        const unitLabel = extractUnitLabel(moduleName);

        // Module Items
        const itemRows = modEl.querySelectorAll('.context_module_item, .ig-row, li.module-item');
        itemRows.forEach((rowEl, rowIdx) => {
          const titleEl = rowEl.querySelector('.ig-title a, a.ig-title, a.title, .item_name a, a[href*="/files/"], a');
          if (!titleEl) return;

          const rawTitle = cleanText(titleEl.getAttribute('title') || titleEl.textContent);
          if (!rawTitle) return;

          const rawUrl = titleEl.getAttribute('href') || '';
          const dlEl = rowEl.querySelector('a.download-link, a.download_category, a[href*="/download"]');
          const finalDlUrl = dlEl ? dlEl.getAttribute('href') : rawUrl;

          // File Size
          const sizeEl = rowEl.querySelector('.file-size, .ig-details, .screenreader-only, .type_description');
          let sizeRaw = sizeEl ? cleanText(sizeEl.textContent) : '';
          const sizeInfo = parseFileSize(sizeRaw);

          const typeInfo = detectFileType(rawTitle, finalDlUrl);
          const category = categorizeFile(rawTitle, moduleName, typeInfo);

          const urls = getDownloadUrls(finalDlUrl || rawUrl, baseUrl);
          const downloadUrl = urls.downloadUrl;
          const fallbackUrl = urls.fallbackUrl;
          if (downloadUrl && seenUrls.has(downloadUrl)) return;
          if (downloadUrl) seenUrls.add(downloadUrl);

          const itemId = rowEl.getAttribute('data-item-id') || rowEl.id || `mod_${modIdx}_item_${rowIdx}`;

          results.push({
            id: itemId,
            name: rawTitle,
            title: rawTitle,
            size: sizeInfo.formatted !== 'Unknown' ? sizeInfo.formatted : (sizeRaw || 'Unknown'),
            sizeBytes: sizeInfo.sizeBytes,
            type: typeInfo.type,
            extension: typeInfo.ext,
            typeLabel: typeInfo.label,
            icon: typeInfo.icon,
            category: category,
            url: normalizeDownloadUrl(rawUrl, baseUrl),
            downloadUrl: downloadUrl,
            fallbackUrl: fallbackUrl,
            moduleName: moduleName,
            unit: unitLabel,
            courseName: defaultCourse,
            source: 'modules'
          });
        });
      });

      return results;
    }

    // -----------------------------------------------------------------------
    // HTML String branch (for Node.js test harness)
    // -----------------------------------------------------------------------
    const html = String(docOrHtml);
    const modRegex = /<(?:div|section)[^>]*class=["'][^"']*\b(?:context_module|item-group-condensed)(?![_a-zA-Z0-9])[^"']*["'][^>]*>([\s\S]*?)(?=<(?:div|section)[^>]*class=["'][^"']*\b(?:context_module|item-group-condensed)(?![_a-zA-Z0-9])|<div class=["'][^"']*ef-directory|$)/gi;
    let modMatch;
    let modCounter = 0;

    while ((modMatch = modRegex.exec(html)) !== null) {
      modCounter++;
      const modContent = modMatch[1];

      // Extract Module Title
      const headerMatch = modContent.match(/<(?:h2|span|a)[^>]*class=["'][^"']*name[^"']*["'][^>]*>([\s\S]*?)<\/(?:h2|span|a)>/i) ||
                          modContent.match(/<div[^>]*class=["'][^"']*(?:ig-header|header)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
      const moduleName = headerMatch ? cleanText(headerMatch[1]) : `Module ${modCounter}`;
      const unitLabel = extractUnitLabel(moduleName);

      // Extract Module Items
      const itemRegex = /<li[^>]*class=["'][^"']*(?:context_module_item|ig-row)[^"']*["'][^>]*>([\s\S]*?)<\/li>/gi;
      let itemMatch;
      let itemCounter = 0;

      while ((itemMatch = itemRegex.exec(modContent)) !== null) {
        itemCounter++;
        const itemHtml = itemMatch[1];

        // Title and Link
        const linkMatch = itemHtml.match(/<a[^>]*class=["'][^"']*(?:ig-title|title)[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i) ||
                          itemHtml.match(/<a[^>]*class=["'][^"']*(?:ig-title|title)[^"']*["'][^>]*title=["']([^"']+)["'][^>]*href=["']([^"']+)["']/i) ||
                          itemHtml.match(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);

        if (!linkMatch) continue;

        let rawUrl = linkMatch[1];
        let rawTitle = cleanText(linkMatch[2]);
        // If second match had href and title swapped
        if (rawUrl && rawUrl.length > 0 && !rawUrl.startsWith('/') && !rawUrl.startsWith('http') && (linkMatch[2].startsWith('/') || linkMatch[2].startsWith('http'))) {
          const tmp = rawUrl;
          rawUrl = linkMatch[2];
          rawTitle = cleanText(tmp);
        }
        if (!rawTitle) continue;

        // Direct Download link
        const dlMatch = itemHtml.match(/<a[^>]*class=["'][^"']*(?:download-link|download_category)[^"']*["'][^>]*href=["']([^"']+)["']/i) ||
                        itemHtml.match(/<a[^>]*href=["']([^"']*\/download[^"']*)["']/i);
        const finalDlUrl = dlMatch ? dlMatch[1] : rawUrl;

        // Size
        const sizeMatch = itemHtml.match(/<span[^>]*class=["'][^"']*file-size[^"']*["'][^>]*>([\s\S]*?)<\/span>/i) ||
                          itemHtml.match(/([\d.]+\s*(?:KB|MB|GB|bytes|B))/i);
        const sizeRaw = sizeMatch ? cleanText(sizeMatch[1]) : '';
        const sizeInfo = parseFileSize(sizeRaw);

        const typeInfo = detectFileType(rawTitle, finalDlUrl);
        const category = categorizeFile(rawTitle, moduleName, typeInfo);

        const urls = getDownloadUrls(finalDlUrl || rawUrl, baseUrl);
        const downloadUrl = urls.downloadUrl;
        const fallbackUrl = urls.fallbackUrl;
        if (downloadUrl && seenUrls.has(downloadUrl)) continue;
        if (downloadUrl) seenUrls.add(downloadUrl);

        results.push({
          id: `mod_${modCounter}_item_${itemCounter}`,
          name: rawTitle,
          title: rawTitle,
          size: sizeInfo.formatted !== 'Unknown' ? sizeInfo.formatted : (sizeRaw || 'Unknown'),
          sizeBytes: sizeInfo.sizeBytes,
          type: typeInfo.type,
          extension: typeInfo.ext,
          typeLabel: typeInfo.label,
          icon: typeInfo.icon,
          category: category,
          url: normalizeDownloadUrl(rawUrl, baseUrl),
          downloadUrl: downloadUrl,
          fallbackUrl: fallbackUrl,
          moduleName: moduleName,
          unit: unitLabel,
          courseName: defaultCourse,
          source: 'modules'
        });
      }
    }

    return results;
  }

  /**
   * Parse Canvas Files Directory Table (/courses/*\/files)
   * Supports both DOM and HTML string
   */
  function parseCanvasFiles(docOrHtml, options = {}) {
    if (!docOrHtml) return [];

    const baseUrl = options.baseUrl || (typeof window !== 'undefined' && window.location ? window.location.origin : '');
    const defaultCourse = options.courseName || '';
    const results = [];
    const seenUrls = new Set();

    // -----------------------------------------------------------------------
    // DOM Element / Document branch
    // -----------------------------------------------------------------------
    if (typeof docOrHtml === 'object' && docOrHtml.querySelectorAll) {
      const doc = docOrHtml.ownerDocument || docOrHtml;
      const fileRows = doc.querySelectorAll('.ef-item-row, tr.ef-item-row, .files-table tbody tr');

      fileRows.forEach((rowEl, idx) => {
        const linkEl = rowEl.querySelector('a.ef-name-col__link, .ef-name-col a, a[data-item-name], a');
        if (!linkEl) return;

        const rawTitle = cleanText(linkEl.getAttribute('data-item-name') || linkEl.getAttribute('title') || linkEl.textContent);
        if (!rawTitle) return;

        const rawUrl = linkEl.getAttribute('href') || '';
        const sizeEl = rowEl.querySelector('.ef-size-col, .file-size');
        const sizeRaw = sizeEl ? cleanText(sizeEl.textContent) : '';
        const sizeInfo = parseFileSize(sizeRaw);

        const typeInfo = detectFileType(rawTitle, rawUrl);
        const category = categorizeFile(rawTitle, 'Course Files', typeInfo);
        const urls = getDownloadUrls(rawUrl, baseUrl);
        const downloadUrl = urls.downloadUrl;
        const fallbackUrl = urls.fallbackUrl;

        if (downloadUrl && seenUrls.has(downloadUrl)) return;
        if (downloadUrl) seenUrls.add(downloadUrl);

        results.push({
          id: rowEl.getAttribute('data-id') || `file_${idx + 1}`,
          name: rawTitle,
          title: rawTitle,
          size: sizeInfo.formatted !== 'Unknown' ? sizeInfo.formatted : (sizeRaw || 'Unknown'),
          sizeBytes: sizeInfo.sizeBytes,
          type: typeInfo.type,
          extension: typeInfo.ext,
          typeLabel: typeInfo.label,
          icon: typeInfo.icon,
          category: category,
          url: normalizeDownloadUrl(rawUrl, baseUrl),
          downloadUrl: downloadUrl,
          fallbackUrl: fallbackUrl,
          moduleName: 'Course Files',
          unit: 'Files',
          courseName: defaultCourse,
          source: 'files'
        });
      });

      return results;
    }

    // -----------------------------------------------------------------------
    // HTML String branch
    // -----------------------------------------------------------------------
    const html = String(docOrHtml);
    if (!html.includes('ef-item-row') && !html.includes('ef-directory')) return [];

    const rowRegex = /<tr[^>]*class=["'][^"']*ef-item-row[^"']*["'][^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;
    let rowCount = 0;

    while ((rowMatch = rowRegex.exec(html)) !== null) {
      rowCount++;
      const rowContent = rowMatch[1];

      const linkMatch = rowContent.match(/<a[^>]*class=["'][^"']*ef-name-col__link[^"']*["'][^>]*href=["']([^"']+)["'][^>]*data-item-name=["']([^"']+)["']/i) ||
                        rowContent.match(/<a[^>]*class=["'][^"']*ef-name-col__link[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i) ||
                        rowContent.match(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);

      if (!linkMatch) continue;

      const rawUrl = linkMatch[1];
      const rawTitle = cleanText(linkMatch[2]);
      if (!rawTitle) continue;

      const sizeMatch = rowContent.match(/<td[^>]*class=["'][^"']*ef-size-col[^"']*["'][^>]*>([\s\S]*?)<\/td>/i);
      const sizeRaw = sizeMatch ? cleanText(sizeMatch[1]) : '';
      const sizeInfo = parseFileSize(sizeRaw);

      const typeInfo = detectFileType(rawTitle, rawUrl);
      const category = categorizeFile(rawTitle, 'Course Files', typeInfo);
      const urls = getDownloadUrls(rawUrl, baseUrl);
      const downloadUrl = urls.downloadUrl;
      const fallbackUrl = urls.fallbackUrl;

      if (downloadUrl && seenUrls.has(downloadUrl)) continue;
      if (downloadUrl) seenUrls.add(downloadUrl);

      results.push({
        id: `file_${rowCount}`,
        name: rawTitle,
        title: rawTitle,
        size: sizeInfo.formatted !== 'Unknown' ? sizeInfo.formatted : (sizeRaw || 'Unknown'),
        sizeBytes: sizeInfo.sizeBytes,
        type: typeInfo.type,
        extension: typeInfo.ext,
        typeLabel: typeInfo.label,
        icon: typeInfo.icon,
        category: category,
        url: normalizeDownloadUrl(rawUrl, baseUrl),
        downloadUrl: downloadUrl,
        fallbackUrl: fallbackUrl,
        moduleName: 'Course Files',
        unit: 'Files',
        courseName: defaultCourse,
        source: 'files'
      });
    }

    return results;
  }

  /**
   * Main Indexer: aggregates all documents from Modules & Files
   */
  function indexCourseDocuments(docOrHtml, options = {}) {
    const course = parseCourseHeader(docOrHtml);
    const opts = { ...options, courseName: course.fullTitle };

    const moduleFiles = parseCanvasModules(docOrHtml, opts);
    const directoryFiles = parseCanvasFiles(docOrHtml, opts);

    // Combine and deduplicate by downloadUrl or name
    const allFiles = [];
    const seenNames = new Set();
    const seenUrls = new Set();

    [...moduleFiles, ...directoryFiles].forEach((item) => {
      const lowerName = item.name.toLowerCase();
      const dl = item.downloadUrl || item.url;
      if (seenNames.has(lowerName) || (dl && seenUrls.has(dl))) {
        return;
      }
      seenNames.add(lowerName);
      if (dl) seenUrls.add(dl);

      item.courseCode = course.courseCode;
      item.courseTitle = course.courseTitle;
      item.courseId = course.courseId;
      if (!item.fallbackUrl) {
        item.fallbackUrl = getDownloadUrls(item.downloadUrl || item.url, opts.baseUrl).fallbackUrl;
      }
      allFiles.push(item);
    });

    // Group by Module / Unit
    const moduleMap = new Map();
    allFiles.forEach((file) => {
      const mod = file.moduleName || 'Other Files';
      if (!moduleMap.has(mod)) {
        moduleMap.set(mod, {
          name: mod,
          unit: file.unit || extractUnitLabel(mod),
          files: [],
          slideCount: 0,
          totalSizeBytes: 0
        });
      }
      const entry = moduleMap.get(mod);
      entry.files.push(file);
      if (file.category === 'Slides') {
        entry.slideCount++;
      }
      entry.totalSizeBytes += (file.sizeBytes || 0);
    });

    const modules = Array.from(moduleMap.values());
    modules.forEach((m) => {
      m.totalSizeFormatted = formatBytes(m.totalSizeBytes);
    });

    // Compute stats
    let totalSlides = 0;
    let totalSyllabus = 0;
    let totalAssignments = 0;
    let totalSizeBytes = 0;

    allFiles.forEach((f) => {
      totalSizeBytes += (f.sizeBytes || 0);
      if (f.category === 'Slides') totalSlides++;
      if (f.category === 'Syllabus') totalSyllabus++;
      if (f.category === 'Assignments') totalAssignments++;
    });

    return {
      course,
      files: allFiles,
      modules,
      stats: {
        totalFiles: allFiles.length,
        totalSlides,
        totalSyllabus,
        totalAssignments,
        totalSizeBytes,
        totalSizeFormatted: formatBytes(totalSizeBytes)
      }
    };
  }

  // =========================================================================
  // 2. LIVE FILTERING & SEARCH ENGINE
  // =========================================================================

  /**
   * Filter files instantly by keyword query and category tab ('All', 'Slides', 'Syllabus', 'Assignments')
   */
  function filterFiles(files = [], query = '', activeTab = 'All') {
    if (!Array.isArray(files)) return [];

    const q = (query || '').trim().toLowerCase();
    const tab = (activeTab || 'All').trim().toLowerCase();
    const tokens = q ? q.split(/\s+/) : [];

    return files.filter((file) => {
      // 1. Tab Filtering
      if (tab !== 'all') {
        const fileCat = (file.category || '').toLowerCase();
        if (tab === 'slides') {
          const isSlide = fileCat === 'slides' || file.extension === 'pptx' || file.extension === 'ppt';
          if (!isSlide) return false;
        } else if (tab === 'syllabus') {
          if (fileCat !== 'syllabus') return false;
        } else if (tab === 'assignments') {
          if (fileCat !== 'assignments') return false;
        } else if (tab !== fileCat) {
          return false;
        }
      }

      // 2. Keyword Tokens Filtering
      if (tokens.length === 0) return true;

      const searchableText = `${file.name} ${file.moduleName} ${file.unit} ${file.type} ${file.extension} ${file.category}`.toLowerCase();
      return tokens.every((token) => searchableText.includes(token));
    });
  }

  // =========================================================================
  // 3. 1-CLICK EXAM CRAM PACK GENERATOR
  // =========================================================================

  /**
   * Generate Cram Pack for a specific unit or all slides
   */
  function generateCramPack(files = [], unitOrModuleName = null) {
    if (!Array.isArray(files)) return null;

    let targetSlides = files.filter((f) => {
      const typeInfo = detectFileType(f.name || '', f.downloadUrl || f.url || '');
      const ext = (f.extension || f.ext || typeInfo.ext || '').toLowerCase();
      const cat = (f.category || typeInfo.category || '').toLowerCase();
      const lowerName = (f.name || '').toLowerCase();
      return (
        cat === 'slides' ||
        ext === 'pptx' ||
        ext === 'ppt' ||
        ext === 'key' ||
        (ext === 'pdf' && (lowerName.includes('slide') || lowerName.includes('lecture')))
      );
    });

    if (unitOrModuleName) {
      const matchKey = String(unitOrModuleName).trim().toLowerCase();
      targetSlides = targetSlides.filter((f) => {
        return (
          (f.unit && f.unit.toLowerCase() === matchKey) ||
          (f.moduleName && f.moduleName.toLowerCase().includes(matchKey))
        );
      });
    }

    let totalSizeBytes = 0;
    const downloadUrls = [];
    const markdownLines = [];
    const plainTextLines = [];
    const curlLines = [
      '#!/usr/bin/env bash',
      '# Bunkr Exam Cram Pack Safe Batch Downloader (Throttled)',
      '# Note: 1-second delay between requests to comply with Canvas rate limits',
      'set -e',
      ''
    ];

    targetSlides.forEach((slide, idx) => {
      totalSizeBytes += (slide.sizeBytes || 0);
      const url = slide.downloadUrl || slide.url;
      const fallbackUrl = slide.fallbackUrl || url;
      downloadUrls.push(url);
      markdownLines.push(`- [${slide.name}](${url}) (${slide.size || 'Download'})`);
      plainTextLines.push(`${slide.name}: ${url}`);
      curlLines.push(`echo "[${idx + 1}/${targetSlides.length}] Downloading: ${slide.name}..."`);
      curlLines.push(`curl -L -O -f "${url}" || curl -L -O -f "${fallbackUrl}"`);
      if (idx < targetSlides.length - 1) {
        curlLines.push('sleep 1');
      }
    });

    return {
      unitName: unitOrModuleName || 'All Course Units',
      slides: targetSlides,
      slideCount: targetSlides.length,
      totalSizeBytes,
      totalSizeFormatted: formatBytes(totalSizeBytes),
      downloadUrls,
      markdownLinks: markdownLines.join('\n'),
      plainTextLinks: plainTextLines.join('\n'),
      batchDownloadScript: curlLines.join('\n')
    };
  }

  /**
   * Formats cram pack links in specific syntax ('markdown' | 'plain' | 'urls' | 'curl')
   */
  function formatCramPackLinks(files = [], format = 'markdown') {
    const pack = generateCramPack(files);
    if (!pack) return '';

    switch (format.toLowerCase()) {
      case 'markdown':
      case 'md':
        return pack.markdownLinks;
      case 'plain':
      case 'text':
        return pack.plainTextLinks;
      case 'urls':
        return pack.downloadUrls.join('\n');
      case 'curl':
      case 'bash':
        return pack.batchDownloadScript;
      default:
        return pack.markdownLinks;
    }
  }

  /**
   * Asynchronously download files sequentially with rate-limit throttling
   */
  async function batchDownloadSequential(files = [], delayMs = 750, onProgress = null) {
    if (!Array.isArray(files) || files.length === 0) return { downloaded: 0, total: 0 };

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (typeof onProgress === 'function') {
        onProgress(i + 1, files.length, file);
      }

      if (typeof document !== 'undefined') {
        const a = document.createElement('a');
        a.href = file.downloadUrl || file.url;
        a.download = file.name || `slide_${i + 1}`;
        a.target = '_blank';
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      if (i < files.length - 1 && delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    return { downloaded: files.length, total: files.length };
  }

  // =========================================================================
  // 4. MODAL & UI CONTROLLER
  // =========================================================================

  let activeIndexData = null;
  let activeTab = 'All';
  let activeQuery = '';
  let selectedResultIndex = 0;
  let isModalOpen = false;

  /**
   * Inject CSS styles for modal and pills
   */
  function injectStyles() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('bunkr-canvas-files-styles')) return;

    const style = document.createElement('style');
    style.id = 'bunkr-canvas-files-styles';
    style.textContent = `
      /* Bunkr Course Files Pill */
      .canvas-files-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: #008EE2;
        color: #FFFFFF !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 13px;
        font-weight: 700;
        padding: 5px 12px;
        border-radius: 20px;
        border: none;
        cursor: pointer;
        box-shadow: 0 1px 3px rgba(0, 142, 226, 0.3);
        transition: all 0.2s ease;
        margin-left: 12px;
        vertical-align: middle;
      }
      .canvas-files-pill:hover {
        background: #0077BE;
        transform: translateY(-1px);
        box-shadow: 0 3px 6px rgba(0, 142, 226, 0.4);
      }
      .canvas-files-pill kbd {
        background: rgba(255, 255, 255, 0.25);
        color: #FFFFFF;
        font-size: 10px;
        padding: 1px 5px;
        border-radius: 4px;
        font-family: monospace;
        font-weight: 800;
      }

      /* Modal Backdrop */
      #canvas-files-modal-root {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(15, 23, 42, 0.65);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding-top: 80px;
        z-index: 9999999;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
      #canvas-files-modal-root.hidden {
        display: none !important;
      }

      /* Modal Container */
      .canvas-files-dialog {
        background: #FFFFFF;
        width: 100%;
        max-width: 680px;
        border-radius: 14px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25), 0 1px 3px rgba(0,0,0,0.1);
        overflow: hidden;
        border: 1px solid #E2E8F0;
        display: flex;
        flex-direction: column;
        max-height: 80vh;
        animation: amModalScaleIn 0.18s ease-out;
      }

      @keyframes amModalScaleIn {
        from { opacity: 0; transform: scale(0.97) translateY(-8px); }
        to { opacity: 1; transform: scale(1) translateY(0); }
      }

      /* Search Header */
      .canvas-files-header {
        display: flex;
        align-items: center;
        padding: 14px 18px;
        border-bottom: 1px solid #E2E8F0;
        gap: 12px;
        background: #FAFAFA;
      }
      .canvas-files-search-icon {
        font-size: 18px;
        color: #64748B;
      }
      .canvas-files-search-input {
        flex: 1;
        border: none;
        background: transparent;
        font-size: 16px;
        color: #0F172A;
        outline: none;
        font-weight: 500;
      }
      .canvas-files-search-input::placeholder {
        color: #94A3B8;
      }
      .canvas-files-esc-hint {
        font-size: 11px;
        font-weight: 700;
        color: #64748B;
        background: #E2E8F0;
        padding: 2px 6px;
        border-radius: 4px;
        font-family: monospace;
      }

      /* Tabs Bar */
      .canvas-files-tabs-bar {
        display: flex;
        gap: 8px;
        padding: 10px 18px;
        background: #FFFFFF;
        border-bottom: 1px solid #F1F5F9;
      }
      .canvas-files-tab-btn {
        background: transparent;
        border: 1px solid transparent;
        font-size: 13px;
        font-weight: 600;
        padding: 5px 12px;
        border-radius: 20px;
        color: #475569;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: all 0.15s ease;
      }
      .canvas-files-tab-btn:hover {
        background: #F1F5F9;
        color: #0F172A;
      }
      .canvas-files-tab-btn.active {
        background: #008EE2;
        color: #FFFFFF;
      }
      .canvas-files-tab-badge {
        font-size: 11px;
        background: rgba(0,0,0,0.06);
        padding: 1px 6px;
        border-radius: 10px;
        font-weight: 700;
      }
      .canvas-files-tab-btn.active .canvas-files-tab-badge {
        background: rgba(255,255,255,0.25);
        color: #FFFFFF;
      }

      /* Cram Pack Quick Banner */
      .canvas-files-cram-banner {
        background: linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%);
        border-bottom: 1px solid #BAE6FD;
        padding: 10px 18px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .canvas-files-cram-info {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        color: #0369A1;
        font-weight: 600;
      }
      .canvas-files-cram-actions {
        display: flex;
        gap: 8px;
      }
      .cram-action-btn {
        background: #0284C7;
        color: #FFFFFF;
        border: none;
        padding: 5px 10px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        transition: background 0.15s;
      }
      .cram-action-btn:hover {
        background: #0369A1;
      }
      .cram-action-btn.secondary {
        background: #FFFFFF;
        color: #0284C7;
        border: 1px solid #BAE6FD;
      }
      .cram-action-btn.secondary:hover {
        background: #F0F9FF;
      }
      .cram-action-btn.advanced-opt {
        background: #F1F5F9;
        color: #475569;
        border: 1px solid #CBD5E1;
        font-weight: 600;
        font-size: 11px;
      }
      .cram-action-btn.advanced-opt:hover {
        background: #E2E8F0;
        color: #1E293B;
      }
      .cram-action-btn:disabled {
        opacity: 0.65;
        cursor: not-allowed;
      }

      /* File Results List */
      .canvas-files-list {
        flex: 1;
        overflow-y: auto;
        padding: 6px 0;
        max-height: 420px;
      }
      .canvas-file-item {
        display: flex;
        align-items: center;
        padding: 10px 18px;
        gap: 12px;
        border-bottom: 1px solid #F8FAFC;
        cursor: pointer;
        transition: background 0.1s ease;
      }
      .canvas-file-item:last-child {
        border-bottom: none;
      }
      .canvas-file-item:hover,
      .canvas-file-item.selected {
        background: #F1F5F9;
      }
      .canvas-file-icon-badge {
        width: 38px;
        height: 38px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        background: #F8FAFC;
        border: 1px solid #E2E8F0;
        flex-shrink: 0;
      }
      .canvas-file-details {
        flex: 1;
        min-width: 0;
      }
      .canvas-file-title {
        font-size: 14px;
        font-weight: 600;
        color: #0F172A;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .canvas-file-meta {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        color: #64748B;
        margin-top: 3px;
      }
      .canvas-file-module-tag {
        background: #E2E8F0;
        padding: 1px 6px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
        color: #334155;
      }
      .canvas-file-actions {
        display: flex;
        gap: 6px;
      }
      .canvas-file-btn {
        background: #F8FAFC;
        border: 1px solid #CBD5E1;
        color: #334155;
        font-size: 12px;
        font-weight: 600;
        padding: 4px 8px;
        border-radius: 6px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        text-decoration: none;
      }
      .canvas-file-btn:hover {
        background: #008EE2;
        color: #FFFFFF;
        border-color: #008EE2;
      }

      /* Empty State */
      .canvas-files-empty {
        padding: 40px 20px;
        text-align: center;
        color: #64748B;
        font-size: 14px;
      }

      /* Footer hints */
      .canvas-files-footer {
        padding: 8px 18px;
        background: #F8FAFC;
        border-top: 1px solid #E2E8F0;
        font-size: 11px;
        color: #64748B;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .canvas-files-footer kbd {
        background: #E2E8F0;
        padding: 1px 5px;
        border-radius: 4px;
        font-weight: 700;
        font-family: monospace;
      }

      /* Toast Notification */
      #canvas-files-toast {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        background: #0F172A;
        color: #FFFFFF;
        padding: 8px 16px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000000;
        display: none;
        animation: amToastFade 0.2s ease-out;
      }
      @keyframes amToastFade {
        from { opacity: 0; transform: translate(-50%, 8px); }
        to { opacity: 1; transform: translate(-50%, 0); }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Show non-intrusive toast notification
   */
  function showToast(message, duration = 2500) {
    if (typeof document === 'undefined') return;
    let toast = document.getElementById('canvas-files-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'canvas-files-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.display = 'block';
    setTimeout(() => {
      if (toast) toast.style.display = 'none';
    }, duration);
  }

  /**
   * Copy text to clipboard safely
   */
  function copyToClipboard(text, successMessage = 'Copied to clipboard!') {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast(successMessage);
      }).catch(() => {
        _fallbackCopy(text, successMessage);
      });
    } else {
      _fallbackCopy(text, successMessage);
    }
  }

  function _fallbackCopy(text, successMessage) {
    if (typeof document === 'undefined') return;
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      showToast(successMessage);
    } catch (e) {}
    document.body.removeChild(textArea);
  }

  /**
   * Render or re-render results inside modal
   */
  function renderModalResults() {
    if (typeof document === 'undefined') return;
    const listEl = document.getElementById('canvas-files-list-container');
    if (!listEl) return;

    const files = activeIndexData ? activeIndexData.files : [];
    const filtered = filterFiles(files, activeQuery, activeTab);

    // Update Tab Badges
    const allCount = files.length;
    const slidesCount = files.filter((f) => f.category === 'Slides' || f.extension === 'pptx' || f.extension === 'ppt').length;
    const syllabusCount = files.filter((f) => f.category === 'Syllabus').length;
    const assignmentsCount = files.filter((f) => f.category === 'Assignments').length;

    const bAll = document.getElementById('cf-badge-all');
    if (bAll) bAll.textContent = allCount;
    const bSlides = document.getElementById('cf-badge-slides');
    if (bSlides) bSlides.textContent = slidesCount;
    const bSyllabus = document.getElementById('cf-badge-syllabus');
    if (bSyllabus) bSyllabus.textContent = syllabusCount;
    const bAssignments = document.getElementById('cf-badge-assignments');
    if (bAssignments) bAssignments.textContent = assignmentsCount;

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div class="canvas-files-empty">
          <p>No documents found matching "<strong>${cleanText(activeQuery)}</strong>" in ${activeTab}.</p>
        </div>
      `;
      return;
    }

    listEl.innerHTML = '';
    filtered.forEach((file, idx) => {
      const itemEl = document.createElement('div');
      itemEl.className = `canvas-file-item ${idx === selectedResultIndex ? 'selected' : ''}`;
      itemEl.setAttribute('data-index', idx);

      itemEl.innerHTML = `
        <div class="canvas-file-icon-badge">${file.icon || '📄'}</div>
        <div class="canvas-file-details">
          <div class="canvas-file-title" title="${file.name}">${file.name}</div>
          <div class="canvas-file-meta">
            <span class="canvas-file-module-tag">${file.unit || file.moduleName}</span>
            <span>•</span>
            <span>${file.size || 'File'}</span>
            <span>•</span>
            <span>${file.typeLabel || file.extension.toUpperCase()}</span>
          </div>
        </div>
        <div class="canvas-file-actions">
          <a class="canvas-file-btn" href="${file.downloadUrl}" target="_blank" rel="noopener" download title="Download file">
            📥 Download
          </a>
          <button class="canvas-file-btn copy-link-btn" title="Copy direct download link">
            📋 Copy Link
          </button>
        </div>
      `;

      itemEl.querySelector('.copy-link-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        copyToClipboard(file.downloadUrl, `Copied link for "${file.name}"!`);
      });

      itemEl.addEventListener('click', () => {
        window.open(file.downloadUrl, '_blank');
      });

      listEl.appendChild(itemEl);
    });
  }

  /**
   * Build Modal DOM structure
   */
  function buildModalDOM() {
    if (typeof document === 'undefined') return null;
    let modalRoot = document.getElementById('canvas-files-modal-root');
    if (modalRoot) return modalRoot;

    injectStyles();

    modalRoot = document.createElement('div');
    modalRoot.id = 'canvas-files-modal-root';
    modalRoot.className = 'hidden';

    modalRoot.innerHTML = `
      <div class="canvas-files-dialog" role="dialog" aria-modal="true" aria-label="Course Files Hub">
        <!-- Search Header -->
        <div class="canvas-files-header">
          <span class="canvas-files-search-icon">🔍</span>
          <input
            id="canvas-files-search-input"
            class="canvas-files-search-input"
            type="text"
            placeholder="Search course slides, syllabus, files... (Cmd+K)"
            autocomplete="off"
            spellcheck="false"
          />
          <span class="canvas-files-esc-hint">ESC</span>
        </div>

        <!-- Category Tabs -->
        <div class="canvas-files-tabs-bar">
          <button class="canvas-files-tab-btn active" data-tab="All">
            All <span id="cf-badge-all" class="canvas-files-tab-badge">0</span>
          </button>
          <button class="canvas-files-tab-btn" data-tab="Slides">
            Slides 📊 <span id="cf-badge-slides" class="canvas-files-tab-badge">0</span>
          </button>
          <button class="canvas-files-tab-btn" data-tab="Syllabus">
            Syllabus 📄 <span id="cf-badge-syllabus" class="canvas-files-tab-badge">0</span>
          </button>
          <button class="canvas-files-tab-btn" data-tab="Assignments">
            Assignments 📝 <span id="cf-badge-assignments" class="canvas-files-tab-badge">0</span>
          </button>
        </div>

        <!-- Cram Pack Banner -->
        <div class="canvas-files-cram-banner">
          <div class="canvas-files-cram-info">
            <span>⚡</span>
            <span id="canvas-cram-info-text">Exam Cram Pack: Lecture Slides</span>
          </div>
          <div class="canvas-files-cram-actions">
            <button id="cf-cram-copy-btn" class="cram-action-btn secondary">📋 Copy All Slide Links</button>
            <button id="cf-cram-dl-btn" class="cram-action-btn">📥 Download All Slides</button>
            <button id="cf-cram-curl-btn" class="cram-action-btn advanced-opt" title="Export throttled cURL bash script for terminal use">⚡ Advanced: Export Throttled Bash Script (sleep 1)</button>
          </div>
        </div>

        <!-- Results List -->
        <div id="canvas-files-list-container" class="canvas-files-list"></div>

        <!-- Footer -->
        <div class="canvas-files-footer">
          <div><kbd>↑</kbd> <kbd>↓</kbd> navigate &nbsp;•&nbsp; <kbd>Enter</kbd> download &nbsp;•&nbsp; <kbd>Esc</kbd> close</div>
          <div>Bunkr Course Files Hub</div>
        </div>
      </div>
    `;

    document.body.appendChild(modalRoot);

    // Event listeners
    const input = modalRoot.querySelector('#canvas-files-search-input');
    input.addEventListener('input', (e) => {
      activeQuery = e.target.value;
      selectedResultIndex = 0;
      renderModalResults();
    });

    // Close on backdrop click
    modalRoot.addEventListener('click', (e) => {
      if (e.target === modalRoot) {
        closeModal();
      }
    });

    // Tabs switching
    const tabBtns = modalRoot.querySelectorAll('.canvas-files-tab-btn');
    tabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        tabBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        activeTab = btn.getAttribute('data-tab');
        selectedResultIndex = 0;
        renderModalResults();
      });
    });

    // Cram Pack actions
    const copyCramBtn = modalRoot.querySelector('#cf-cram-copy-btn');
    copyCramBtn.addEventListener('click', () => {
      const files = activeIndexData ? activeIndexData.files : [];
      const pack = generateCramPack(files);
      if (pack && pack.slideCount > 0) {
        copyToClipboard(pack.markdownLinks, `Copied ${pack.slideCount} lecture slide links!`);
      } else {
        showToast('No lecture slides available to copy.');
      }
    });

    const curlCramBtn = modalRoot.querySelector('#cf-cram-curl-btn');
    if (curlCramBtn) {
      curlCramBtn.addEventListener('click', () => {
        const files = activeIndexData ? activeIndexData.files : [];
        const pack = generateCramPack(files);
        if (pack && pack.slideCount > 0) {
          copyToClipboard(pack.batchDownloadScript, `Copied throttled bash script (${pack.slideCount} slides with sleep 1)!`);
        } else {
          showToast('No lecture slides found for Cram Pack.');
        }
      });
    }

    const dlCramBtn = modalRoot.querySelector('#cf-cram-dl-btn');
    let isDownloadingPack = false;

    dlCramBtn.addEventListener('click', async () => {
      if (isDownloadingPack) return;
      const files = activeIndexData ? activeIndexData.files : [];
      const pack = generateCramPack(files);
      if (!pack || pack.slideCount === 0) {
        showToast('No lecture slides found for Cram Pack.');
        return;
      }

      isDownloadingPack = true;
      dlCramBtn.disabled = true;
      const originalText = dlCramBtn.textContent || '📥 Download All Slides';
      dlCramBtn.textContent = '⏳ Downloading (Throttled)...';

      try {
        await batchDownloadSequential(pack.slides, 750, (current, total, slide) => {
          showToast(`[${current}/${total}] Downloading: ${slide.name}...`);
        });
        showToast(`✅ Safely downloaded ${pack.slideCount} slides with rate-limit protection!`);
      } catch (err) {
        showToast('⚠️ An error occurred during batch download.');
      } finally {
        isDownloadingPack = false;
        dlCramBtn.disabled = false;
        dlCramBtn.textContent = originalText;
      }
    });

    return modalRoot;
  }

  /**
   * Open the Quick Search Modal
   */
  function openModal() {
    if (typeof document === 'undefined') return;

    if (!activeIndexData) {
      activeIndexData = indexCourseDocuments(document);
    }

    const modal = buildModalDOM();
    if (!modal) return;

    modal.classList.remove('hidden');
    isModalOpen = true;

    const input = document.getElementById('canvas-files-search-input');
    if (input) {
      input.value = activeQuery;
      input.focus();
      input.select();
    }

    renderModalResults();
  }

  /**
   * Close the Quick Search Modal
   */
  function closeModal() {
    if (typeof document === 'undefined') return;
    const modal = document.getElementById('canvas-files-modal-root');
    if (modal) {
      modal.classList.add('hidden');
    }
    isModalOpen = false;
  }

  /**
   * Toggle modal open / closed
   */
  function toggleModal() {
    if (isModalOpen) {
      closeModal();
    } else {
      openModal();
    }
  }

  /**
   * Injects the 'Search Course Files' pill into Canvas header / breadcrumbs
   */
  function injectSearchPill(doc = null) {
    if (typeof document === 'undefined') return null;
    const d = doc || document;

    if (d.getElementById('canvas-files-pill')) {
      return d.getElementById('canvas-files-pill');
    }

    injectStyles();

    // 1. Target breadcrumbs navigation
    const breadcrumbs = d.querySelector('#breadcrumbs ul, .ic-app-crumbs, nav#breadcrumbs');
    const pill = d.createElement('button');
    pill.id = 'canvas-files-pill';
    pill.className = 'canvas-files-pill';
    pill.type = 'button';
    pill.innerHTML = `🔍 Search Course Files <kbd>⌘K</kbd>`;
    pill.title = 'Quick search course files, slides, and exam cram packs (Cmd+K or Ctrl+K)';

    pill.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openModal();
    });

    if (breadcrumbs) {
      if (breadcrumbs.tagName.toLowerCase() === 'ul') {
        const li = d.createElement('li');
        li.className = 'canvas-files-pill-container';
        li.style.marginLeft = 'auto';
        li.style.display = 'inline-flex';
        li.style.alignItems = 'center';
        li.appendChild(pill);
        breadcrumbs.appendChild(li);
      } else {
        breadcrumbs.appendChild(pill);
      }
      return pill;
    }

    // 2. Fallback: canvas top navigation or header bar
    const topBar = d.querySelector('.ic-app-nav-bar, .header-bar, #content');
    if (topBar) {
      topBar.appendChild(pill);
      return pill;
    }

    return null;
  }

  /**
   * Setup global keyboard shortcuts (Cmd+K / Ctrl+K and Escape)
   */
  function setupKeyboardListeners() {
    if (typeof window === 'undefined') return;

    window.addEventListener('keydown', (e) => {
      // Toggle on Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggleModal();
        return;
      }

      // Close on Escape
      if (e.key === 'Escape' && isModalOpen) {
        e.preventDefault();
        closeModal();
        return;
      }

      // Arrow navigation inside open modal
      if (isModalOpen) {
        const listEl = document.getElementById('canvas-files-list-container');
        if (!listEl) return;
        const items = listEl.querySelectorAll('.canvas-file-item');
        if (items.length === 0) return;

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          selectedResultIndex = (selectedResultIndex + 1) % items.length;
          items.forEach((it, i) => it.classList.toggle('selected', i === selectedResultIndex));
          items[selectedResultIndex].scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          selectedResultIndex = (selectedResultIndex - 1 + items.length) % items.length;
          items.forEach((it, i) => it.classList.toggle('selected', i === selectedResultIndex));
          items[selectedResultIndex].scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'Enter') {
          if (items[selectedResultIndex]) {
            e.preventDefault();
            const dlLink = items[selectedResultIndex].querySelector('a.canvas-file-btn');
            if (dlLink) dlLink.click();
          }
        }
      }
    });
  }

  /**
   * Check if safe-guard mode applies to current URL
   */
  function isExamSafeUrl(url = '') {
    const u = (url || (typeof window !== 'undefined' && window.location ? window.location.href : '')).toLowerCase();
    return (
      u.includes('/quizzes/') && u.includes('/take') ||
      u.includes('/examinations/') ||
      u.includes('/canvas-speedgrader') ||
      u.includes('/submissions/new')
    );
  }

  /**
   * Main Initialization Method
   */
  function init(options = {}) {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return false;
    }

    // Exam Safety check: do not inject overlays during active exams or quizzes
    if (isExamSafeUrl()) {
      return false;
    }

    // Scrape & Index course documents
    activeIndexData = indexCourseDocuments(document, options);

    // Save to chrome.storage.local for cross-page persistence
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local && activeIndexData.course.courseId) {
      const storageKey = `canvas_course_files_${activeIndexData.course.courseId}`;
      const payload = {};
      payload[storageKey] = {
        course: activeIndexData.course,
        files: activeIndexData.files,
        stats: activeIndexData.stats,
        timestamp: Date.now()
      };
      chrome.storage.local.set(payload, () => {});
    }

    // Inject Pill & Setup Shortcut
    injectSearchPill(document);
    setupKeyboardListeners();

    return true;
  }

  // Auto-init on DOMContentLoaded in browser
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => init());
    } else {
      init();
    }
  }

  // =========================================================================
  // PUBLIC EXPORTS
  // =========================================================================

  return {
    // Parsing & Indexing
    parseCourseHeader,
    detectFileType,
    categorizeFile,
    parseFileSize,
    formatBytes,
    normalizeDownloadUrl,
    getDownloadUrls,
    extractUnitLabel,
    parseCanvasModules,
    parseCanvasFiles,
    parseCanvasFilesPage: parseCanvasFiles,
    indexCourseDocuments,

    // Search & Cram Pack
    filterFiles,
    generateCramPack,
    formatCramPackLinks,
    batchDownloadSequential,

    // UI & Modal
    openModal,
    closeModal,
    toggleModal,
    injectSearchPill,
    injectStyles,
    showToast,
    copyToClipboard,
    init,

    // Constants
    FILE_EXTENSIONS
  };
});
