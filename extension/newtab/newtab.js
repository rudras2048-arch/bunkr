// Bunkr Command Center New Tab Controller
// Phase 2 & 3: Proactive Nudges & Semester Projection

const fallbackSubjects = [
  { name: 'Mathematics-I (Foundation)', code: 'CSD02C1001', attended: 21, total: 31 },
  { name: 'Problem Solving and Programming', code: 'CSD02C1002', attended: 31, total: 33 },
  { name: 'Web Application Development - I', code: 'CSD02C1003', attended: 17, total: 17 },
  { name: 'Social Communication I', code: 'RSPRFC1003', attended: 15, total: 17 },
  { name: 'Computer fundamentals and networking', code: 'CSD02C1004', attended: 16, total: 18 },
  { name: 'Understanding India', code: 'RSPRFC1001', attended: 10, total: 12 },
  { name: 'KPMG/Edept Workshop Certification Program', code: 'KPMG01', attended: 11, total: 12 },
  { name: 'Self and Society I', code: 'RSPRFC1002', attended: 5, total: 7 }
];

// ============================================================================
// Multi-Course Semester SGPA Simulator & Forecaster Engine
// ============================================================================

const DEFAULT_RISHIHOOD_CREDITS = {
  'CSD02C1001': 4, // Mathematics-I
  'CSD02C1002': 4, // Problem Solving and Programming (PSP)
  'CSD02C1003': 3, // Web Application Development - I (WAD)
  'CSD02C1004': 3, // Computer fundamentals and networking (CFN)
  'RSPRFC1003': 2, // Social Communication I
  'RSPRFC1001': 2, // Understanding India
  'KPMG01': 2,     // KPMG/Edept Workshop
  'RSPRFC1002': 2  // Self and Society I
};

const DEFAULT_SEMESTER_COURSES = [
  { code: 'CSD02C1001', name: 'Mathematics-I', credits: 4, lockedPercentage: 52.0, maxPossiblePercentage: 92.0, targetPercentage: 80 },
  { code: 'CSD02C1002', name: 'Problem Solving and Programming (PSP)', credits: 4, lockedPercentage: 65.0, maxPossiblePercentage: 95.0, targetPercentage: 85 },
  { code: 'CSD02C1003', name: 'Web Application Development - I (WAD)', credits: 3, lockedPercentage: 70.0, maxPossiblePercentage: 100.0, targetPercentage: 85 },
  { code: 'CSD02C1004', name: 'Computer fundamentals and networking (CFN)', credits: 3, lockedPercentage: 60.0, maxPossiblePercentage: 90.0, targetPercentage: 80 },
  { code: 'RSPRFC1003', name: 'Social Communication I', credits: 2, lockedPercentage: 75.0, maxPossiblePercentage: 95.0, targetPercentage: 80 },
  { code: 'RSPRFC1001', name: 'Understanding India', credits: 2, lockedPercentage: 80.0, maxPossiblePercentage: 100.0, targetPercentage: 85 },
  { code: 'KPMG01', name: 'KPMG/Edept Workshop', credits: 2, lockedPercentage: 85.0, maxPossiblePercentage: 95.0, targetPercentage: 85 },
  { code: 'RSPRFC1002', name: 'Self and Society I', credits: 2, lockedPercentage: 70.0, maxPossiblePercentage: 90.0, targetPercentage: 80 }
];

function isRecognizedKeyword(courseCode = '', courseTitle = '') {
  const code = (courseCode || '').trim().toUpperCase();
  const title = (courseTitle || '').trim().toLowerCase();

  if (/math/i.test(code) || /math/i.test(title)) return true;
  if (/psp/i.test(code) || /problem\s*solving/i.test(title) || /programming/i.test(title)) return true;
  if (/wad/i.test(code) || /web\s*app/i.test(title)) return true;
  if (/cfn/i.test(code) || /network/i.test(title) || /fundamental/i.test(title)) return true;
  if (/social/i.test(code) || /communication/i.test(title)) return true;
  if (/india/i.test(code) || /understanding\s*india/i.test(title)) return true;
  if (/kpmg/i.test(code) || /edept/i.test(title) || /workshop/i.test(title)) return true;
  if (/self/i.test(code) || /society/i.test(title)) return true;

  return false;
}

function getDefaultCredits(courseCode = '', courseTitle = '') {
  const code = (courseCode || '').trim().toUpperCase();
  const title = (courseTitle || '').trim().toLowerCase();

  if (DEFAULT_RISHIHOOD_CREDITS[code]) {
    return DEFAULT_RISHIHOOD_CREDITS[code];
  }

  if (/math/i.test(code) || /math/i.test(title)) return 4;
  if (/psp/i.test(code) || /problem\s*solving/i.test(title) || /programming/i.test(title)) return 4;
  if (/wad/i.test(code) || /web\s*app/i.test(title)) return 3;
  if (/cfn/i.test(code) || /network/i.test(title) || /fundamental/i.test(title)) return 3;
  if (/social/i.test(code) || /communication/i.test(title)) return 2;
  if (/india/i.test(code) || /understanding\s*india/i.test(title)) return 2;
  if (/kpmg/i.test(code) || /edept/i.test(title) || /workshop/i.test(title)) return 2;
  if (/self/i.test(code) || /society/i.test(title)) return 2;

  return 3;
}

/**
 * Convert percentage (0-100) to UGC CBCS 10-point grade point or Linear SGPA.
 * Default scale: 'ugc' (UGC Choice-Based Credit System 10-point bracket scale).
 * Linear scale: 'linear' (clamped / 10).
 */
function percentageToGradePoint(pct, scale = 'ugc') {
  if (typeof pct !== 'number' || isNaN(pct)) return 0;
  const clamped = Math.max(0, Math.min(100, pct));
  if (scale === 'linear') {
    return Number((clamped / 10).toFixed(2));
  }
  // Official UGC CBCS 10-point bracket scale
  if (clamped >= 90) return 10; // O (Outstanding)
  if (clamped >= 80) return 9;  // A+ (Excellent)
  if (clamped >= 70) return 8;  // A (Very Good)
  if (clamped >= 60) return 7;  // B+ (Good)
  if (clamped >= 50) return 6;  // B (Above Average)
  if (clamped >= 45) return 5;  // C (Average)
  if (clamped >= 40) return 4;  // P (Pass)
  return 0;                     // F (Fail)
}

/**
 * Map percentage to official UGC CBCS grade info object:
 * Returns { grade, letter, point, description, label, minPct, maxPct, band }
 */
function percentageToUgcGrade(pct) {
  if (typeof pct !== 'number' || isNaN(pct)) {
    return {
      grade: 'F',
      letter: 'F',
      point: 0,
      description: 'Fail',
      label: 'Fail',
      minPct: 0,
      maxPct: 39.99,
      band: 'Grade F (0.0 band)'
    };
  }
  const clamped = Math.max(0, Math.min(100, pct));
  if (clamped >= 90) {
    return {
      grade: 'O',
      letter: 'O',
      point: 10,
      description: 'Outstanding',
      label: 'Outstanding',
      minPct: 90,
      maxPct: 100,
      band: 'Grade O (10.0 band)'
    };
  }
  if (clamped >= 80) {
    return {
      grade: 'A+',
      letter: 'A+',
      point: 9,
      description: 'Excellent',
      label: 'Excellent',
      minPct: 80,
      maxPct: 89.99,
      band: 'Grade A+ (9.0 band)'
    };
  }
  if (clamped >= 70) {
    return {
      grade: 'A',
      letter: 'A',
      point: 8,
      description: 'Very Good',
      label: 'Very Good',
      minPct: 70,
      maxPct: 79.99,
      band: 'Grade A (8.0 band)'
    };
  }
  if (clamped >= 60) {
    return {
      grade: 'B+',
      letter: 'B+',
      point: 7,
      description: 'Good',
      label: 'Good',
      minPct: 60,
      maxPct: 69.99,
      band: 'Grade B+ (7.0 band)'
    };
  }
  if (clamped >= 50) {
    return {
      grade: 'B',
      letter: 'B',
      point: 6,
      description: 'Above Average',
      label: 'Above Average',
      minPct: 50,
      maxPct: 59.99,
      band: 'Grade B (6.0 band)'
    };
  }
  if (clamped >= 45) {
    return {
      grade: 'C',
      letter: 'C',
      point: 5,
      description: 'Average',
      label: 'Average',
      minPct: 45,
      maxPct: 49.99,
      band: 'Grade C (5.0 band)'
    };
  }
  if (clamped >= 40) {
    return {
      grade: 'P',
      letter: 'P',
      point: 4,
      description: 'Pass',
      label: 'Pass',
      minPct: 40,
      maxPct: 44.99,
      band: 'Grade P (4.0 band)'
    };
  }
  return {
    grade: 'F',
    letter: 'F',
    point: 0,
    description: 'Fail',
    label: 'Fail',
    minPct: 0,
    maxPct: 39.99,
    band: 'Grade F (0.0 band)'
  };
}

function percentageToSGPA(pct) {
  if (typeof pct !== 'number' || isNaN(pct)) return 0;
  const clamped = Math.max(0, Math.min(100, pct));
  return Number((clamped / 10).toFixed(2));
}

/**
 * Classifies scraped timestamp into 4 freshness tiers:
 * - Fresh (< 3 days): badge 'Fresh (< 3d)' or 'Fresh • Xd ago' (sgpa-freshness-fresh)
 * - Aging (3 - 7 days): badge 'Aging (Xd ago)' (sgpa-freshness-aging)
 * - Stale (> 7 days): badge 'Stale (Xd ago)' (sgpa-freshness-stale)
 * - Never Scraped: badge 'Never Scraped (Baseline)' (sgpa-freshness-never)
 */
function getFreshnessStatus(scrapedAt) {
  if (!scrapedAt) {
    return {
      tier: 'never',
      status: 'never',
      label: 'Never Scraped (Baseline)',
      altLabel: 'Never Scraped (Baseline)',
      className: 'sgpa-freshness-never',
      badgeClass: 'sgpa-freshness-never',
      days: null
    };
  }
  const time = new Date(scrapedAt).getTime();
  if (isNaN(time)) {
    return {
      tier: 'never',
      status: 'never',
      label: 'Never Scraped (Baseline)',
      altLabel: 'Never Scraped (Baseline)',
      className: 'sgpa-freshness-never',
      badgeClass: 'sgpa-freshness-never',
      days: null
    };
  }
  const diffMs = Date.now() - time;
  const diffDays = Math.max(0, diffMs / (1000 * 60 * 60 * 24));
  const daysFloor = Math.floor(diffDays);

  if (diffDays < 3) {
    return {
      tier: 'fresh',
      status: 'fresh',
      label: 'Fresh (< 3d)',
      altLabel: daysFloor === 0 ? 'Fresh (today)' : `Fresh • ${daysFloor}d ago`,
      className: 'sgpa-freshness-fresh',
      badgeClass: 'sgpa-freshness-fresh',
      days: diffDays
    };
  } else if (diffDays <= 7) {
    return {
      tier: 'aging',
      status: 'aging',
      label: `Aging (${daysFloor}d ago)`,
      altLabel: `Aging (${daysFloor}d ago)`,
      className: 'sgpa-freshness-aging',
      badgeClass: 'sgpa-freshness-aging',
      days: diffDays
    };
  } else {
    return {
      tier: 'stale',
      status: 'stale',
      label: `Stale (${daysFloor}d ago)`,
      altLabel: `Stale (${daysFloor}d ago)`,
      className: 'sgpa-freshness-stale',
      badgeClass: 'sgpa-freshness-stale',
      days: diffDays
    };
  }
}

/**
 * Formats overall SGPA freshness date stamp:
 * "As of [date] (X of Y courses updated)" or "Curriculum baseline (0 of Y courses updated)".
 */
function getOverallStalenessStamp(courses) {
  const list = Array.isArray(courses) ? courses : Object.values(courses || {});
  const totalCourses = list.length;
  if (totalCourses === 0) {
    return 'Curriculum baseline (0 of 0 courses updated)';
  }

  const updatedCourses = list.filter((c) => Boolean(c && (c.scrapedAt || c.updatedAt)));
  const updatedCount = updatedCourses.length;

  if (updatedCount === 0) {
    return `Curriculum baseline (0 of ${totalCourses} courses updated)`;
  }

  let latestTime = 0;
  updatedCourses.forEach((c) => {
    const ts = new Date(c.scrapedAt || c.updatedAt).getTime();
    if (!isNaN(ts) && ts > latestTime) {
      latestTime = ts;
    }
  });

  const dateStr = latestTime > 0
    ? new Date(latestTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Recent';

  return `As of ${dateStr} (${updatedCount} of ${totalCourses} courses updated)`;
}

function normalizeCoursesList(courses, options = {}) {
  if (!courses) return [];
  let list = [];
  if (Array.isArray(courses)) {
    list = courses;
  } else if (typeof courses === 'object') {
    list = Object.values(courses);
  }

  const opts = typeof options === 'string' ? { scale: options } : (options || {});
  const scale = opts.scale || 'ugc';
  const customCredits = opts.customCredits || opts.custom_course_credits || {};

  return list.map((c) => {
    const code = c.code || c.courseCode || c.id || '';
    const name = c.name || c.courseTitle || c.title || code;
    const courseId = c.courseId ? String(c.courseId) : '';
    const courseKey = courseId ? `canvas_${courseId}` : code;

    // Custom credits override -> c.credits -> default credits
    const resolvedCredits = (customCredits && (customCredits[courseKey] || (code && customCredits[code]))) ||
      (typeof c.credits === 'number' && !isNaN(c.credits) && c.credits > 0
        ? c.credits
        : getDefaultCredits(code, name));

    const isRecognized = Boolean(DEFAULT_RISHIHOOD_CREDITS[code] || isRecognizedKeyword(code, name));
    const hasCustomCredit = Boolean(customCredits && (customCredits[courseKey] || (code && customCredits[code])));
    const isUnmatched = !isRecognized && !hasCustomCredit;

    // Preserved scrapedAt & updatedAt timestamps
    const scrapedAt = c.scrapedAt || c.updatedAt || null;
    const updatedAt = c.updatedAt || c.scrapedAt || null;

    let lockedPct = 0;
    if (typeof c.lockedPercentage === 'number' && !isNaN(c.lockedPercentage)) {
      lockedPct = c.lockedPercentage;
    } else if (typeof c.currentPercentage === 'number' && !isNaN(c.currentPercentage)) {
      lockedPct = c.currentPercentage;
    } else if (typeof c.percentage === 'number' && !isNaN(c.percentage)) {
      lockedPct = c.percentage;
    } else if (typeof c.scorePct === 'number' && !isNaN(c.scorePct)) {
      lockedPct = c.scorePct;
    } else if (typeof c.lockedSGPA === 'number' && !isNaN(c.lockedSGPA)) {
      lockedPct = c.lockedSGPA * 10;
    } else if (typeof c.courseSGPA === 'number' && !isNaN(c.courseSGPA)) {
      lockedPct = c.courseSGPA * 10;
    } else if (typeof c.sgpa === 'number' && !isNaN(c.sgpa)) {
      lockedPct = c.sgpa * 10;
    }

    let lockedSGPA = 0;
    if (scale === 'ugc') {
      if (typeof c.lockedPercentage === 'number') {
        lockedSGPA = percentageToGradePoint(c.lockedPercentage, 'ugc');
      } else if (typeof c.currentPercentage === 'number') {
        lockedSGPA = percentageToGradePoint(c.currentPercentage, 'ugc');
      } else if (typeof c.lockedGradePoint === 'number' && !isNaN(c.lockedGradePoint)) {
        lockedSGPA = c.lockedGradePoint;
      } else if (typeof c.gradePoint === 'number' && !isNaN(c.gradePoint)) {
        lockedSGPA = c.gradePoint;
      } else {
        lockedSGPA = percentageToGradePoint(lockedPct, 'ugc');
      }
    } else {
      // scale === 'linear'
      if (typeof c.lockedSGPA === 'number' && !isNaN(c.lockedSGPA)) {
        lockedSGPA = c.lockedSGPA;
      } else if (typeof c.courseSGPA === 'number' && !isNaN(c.courseSGPA)) {
        lockedSGPA = c.courseSGPA;
      } else if (typeof c.sgpa === 'number' && !isNaN(c.sgpa)) {
        lockedSGPA = c.sgpa;
      } else {
        lockedSGPA = percentageToGradePoint(lockedPct, 'linear');
      }
    }

    let maxPct = 100;
    if (typeof c.maxPossiblePercentage === 'number' && !isNaN(c.maxPossiblePercentage)) {
      maxPct = c.maxPossiblePercentage;
    } else if (typeof c.maxAttainable === 'number' && !isNaN(c.maxAttainable)) {
      maxPct = c.maxAttainable;
    } else if (typeof c.maxPossibleSGPA === 'number' && !isNaN(c.maxPossibleSGPA)) {
      maxPct = c.maxPossibleSGPA * 10;
    } else {
      maxPct = 100;
    }

    let maxSGPA = 0;
    if (scale === 'ugc') {
      maxSGPA = percentageToGradePoint(maxPct, 'ugc');
    } else {
      maxSGPA = typeof c.maxPossibleSGPA === 'number' && !isNaN(c.maxPossibleSGPA)
        ? c.maxPossibleSGPA
        : percentageToGradePoint(maxPct, 'linear');
    }

    let targetPct = 80;
    if (typeof c.targetPercentage === 'number' && !isNaN(c.targetPercentage)) {
      targetPct = c.targetPercentage;
    } else if (typeof c.targetSGPA === 'number' && !isNaN(c.targetSGPA)) {
      targetPct = c.targetSGPA * 10;
    }

    let targetSGPA = 0;
    if (scale === 'ugc') {
      targetSGPA = percentageToGradePoint(targetPct, 'ugc');
    } else {
      targetSGPA = typeof c.targetSGPA === 'number' && !isNaN(c.targetSGPA)
        ? c.targetSGPA
        : percentageToGradePoint(targetPct, 'linear');
    }

    const ugcGrade = c.ugcGrade || percentageToUgcGrade(lockedPct);
    const freshness = getFreshnessStatus(scrapedAt);

    return {
      code,
      name,
      courseCode: code,
      courseTitle: name,
      courseId,
      courseKey,
      credits: resolvedCredits,
      isUnmatched,
      scrapedAt,
      updatedAt,
      freshness,
      ugcGrade,
      lockedPercentage: Number(lockedPct.toFixed(2)),
      lockedSGPA: Number(lockedSGPA.toFixed(2)),
      courseSGPA: Number(lockedSGPA.toFixed(2)),
      gradePoint: lockedSGPA,
      maxPossiblePercentage: Number(maxPct.toFixed(2)),
      maxPossibleSGPA: Number(maxSGPA.toFixed(2)),
      targetPercentage: Number(targetPct.toFixed(2)),
      targetSGPA: Number(targetSGPA.toFixed(2)),
      remainingWeight: Number(Math.max(0, maxPct - lockedPct).toFixed(2))
    };
  });
}

function calculateCreditWeightedSGPA(courses, options = {}) {
  const opts = typeof options === 'string' ? { scale: options } : (options || {});
  const scale = opts.scale || 'ugc';
  const list = normalizeCoursesList(courses, opts);

  if (list.length === 0) {
    return {
      totalCredits: 0,
      currentSGPA: 0,
      currentPercentage: 0,
      lockedSGPA: 0,
      lockedPercentage: 0,
      maxPossibleSGPA: 0,
      maxPossiblePercentage: 0,
      targetSGPA: 0,
      targetPercentage: 0,
      scale,
      courses: []
    };
  }

  let totalCredits = 0;
  let sumLockedWeightedSGPA = 0;
  let sumMaxWeightedSGPA = 0;
  let sumTargetWeightedSGPA = 0;

  list.forEach((c) => {
    totalCredits += c.credits;
    sumLockedWeightedSGPA += c.lockedSGPA * c.credits;
    sumMaxWeightedSGPA += c.maxPossibleSGPA * c.credits;
    sumTargetWeightedSGPA += c.targetSGPA * c.credits;
  });

  const currentSGPA = totalCredits > 0 ? Number((sumLockedWeightedSGPA / totalCredits).toFixed(2)) : 0;
  const maxPossibleSGPA = totalCredits > 0 ? Number((sumMaxWeightedSGPA / totalCredits).toFixed(2)) : 0;
  const targetSGPA = totalCredits > 0 ? Number((sumTargetWeightedSGPA / totalCredits).toFixed(2)) : 0;

  return {
    totalCredits,
    currentSGPA,
    currentPercentage: Number((currentSGPA * 10).toFixed(2)),
    lockedSGPA: currentSGPA,
    lockedPercentage: Number((currentSGPA * 10).toFixed(2)),
    maxPossibleSGPA,
    maxPossiblePercentage: Number((maxPossibleSGPA * 10).toFixed(2)),
    targetSGPA,
    targetPercentage: Number((targetSGPA * 10).toFixed(2)),
    scale,
    courses: list
  };
}

function calculateOverallSGPA(courses, options = {}) {
  const opts = typeof options === 'string' ? { scale: options } : { scale: 'ugc', ...(options || {}) };
  return calculateCreditWeightedSGPA(courses, opts);
}

function simulateTargetSGPA(courses, targetSGPA = 8.0, options = {}) {
  const opts = typeof options === 'string' ? { scale: options } : (options || {});
  const scale = opts.scale || 'ugc';
  const desiredSGPA = typeof targetSGPA === 'number' ? targetSGPA : (parseFloat(targetSGPA) || 8.0);
  const desiredPercentage = Number((desiredSGPA * 10).toFixed(2));

  const weighted = calculateCreditWeightedSGPA(courses, opts);
  const { totalCredits, currentSGPA, maxPossibleSGPA, courses: list } = weighted;

  if (totalCredits === 0) {
    return {
      targetSGPA: desiredSGPA,
      targetPercentage: desiredPercentage,
      totalCredits: 0,
      currentSGPA: 0,
      maxPossibleSGPA: 0,
      isAchievable: false,
      isAlreadyAchieved: false,
      requiredPaceOnRemaining: null,
      isZeroSlipMargin: false,
      zeroSlipWarning: '',
      unreachableReason: null,
      scale,
      coursesForecast: [],
      courses: []
    };
  }

  const targetPoints = desiredSGPA * totalCredits;
  const lockedPoints = currentSGPA * totalCredits;
  const maxPoints = maxPossibleSGPA * totalCredits;

  const neededPoints = targetPoints - lockedPoints;
  const remainingCapacity = maxPoints - lockedPoints;

  const isAlreadyAchieved = neededPoints <= 1e-6;
  const isAchievable = neededPoints <= remainingCapacity + 1e-6;

  let requiredPaceOnRemaining = 0;
  let isZeroSlipMargin = false;
  let zeroSlipWarning = '';
  let unreachableReason = null;
  let theoreticalPaceOnRemaining = null;

  if (isAlreadyAchieved) {
    requiredPaceOnRemaining = 0;
  } else if (!isAchievable) {
    requiredPaceOnRemaining = null;
    theoreticalPaceOnRemaining = remainingCapacity > 0
      ? Number(((neededPoints / remainingCapacity) * 100).toFixed(2))
      : null;
    unreachableReason = theoreticalPaceOnRemaining !== null
      ? `Unreachable (Requires ${theoreticalPaceOnRemaining}% pace across remaining assessments, exceeding 100%)`
      : `Unreachable (Target ${desiredSGPA} SGPA exceeds maximum achievable ${maxPossibleSGPA} SGPA)`;
  } else {
    requiredPaceOnRemaining = remainingCapacity > 0
      ? Number(((neededPoints / remainingCapacity) * 100).toFixed(2))
      : 0;

    if (requiredPaceOnRemaining >= 95.0) {
      isZeroSlipMargin = true;
      zeroSlipWarning = `⚠️ Zero-slip margin: Requires ${requiredPaceOnRemaining}% pace across remaining assessments. Even a minor penalty will prevent achieving this target.`;
    }
  }

  const coursesForecast = list.map((c) => {
    const remainingPct = c.remainingWeight;

    let neededCoursePct = 0;
    let neededCourseSGPA = 0;
    let neededPctOnRemaining = 0;

    if (isAlreadyAchieved) {
      neededCoursePct = c.lockedPercentage;
      neededCourseSGPA = c.lockedSGPA;
      neededPctOnRemaining = 0;
    } else if (!isAchievable) {
      neededCoursePct = c.maxPossiblePercentage;
      neededCourseSGPA = c.maxPossibleSGPA;
      neededPctOnRemaining = theoreticalPaceOnRemaining !== null ? theoreticalPaceOnRemaining : 100;
    } else {
      neededPctOnRemaining = requiredPaceOnRemaining;
      neededCoursePct = c.lockedPercentage + (requiredPaceOnRemaining / 100) * remainingPct;
      neededCoursePct = Number(Math.min(c.maxPossiblePercentage, neededCoursePct).toFixed(2));
      neededCourseSGPA = percentageToGradePoint(neededCoursePct, scale);
    }

    return {
      code: c.code,
      name: c.name,
      courseCode: c.code,
      courseTitle: c.name,
      courseId: c.courseId,
      courseKey: c.courseKey,
      credits: c.credits,
      isUnmatched: c.isUnmatched,
      scrapedAt: c.scrapedAt,
      updatedAt: c.updatedAt,
      freshness: c.freshness,
      ugcGrade: c.ugcGrade,
      lockedPercentage: c.lockedPercentage,
      lockedSGPA: c.lockedSGPA,
      maxPossiblePercentage: c.maxPossiblePercentage,
      maxPossibleSGPA: c.maxPossibleSGPA,
      remainingWeight: remainingPct,
      neededCoursePercentage: neededCoursePct,
      neededCourseSGPA,
      neededPercentageOnRemaining: neededPctOnRemaining,
      isFullyLocked: remainingPct <= 1e-4,
      isAchievable: isAchievable
    };
  });

  return {
    targetSGPA: desiredSGPA,
    targetPercentage: desiredPercentage,
    totalCredits,
    currentSGPA,
    currentPercentage: weighted.currentPercentage,
    lockedSGPA: currentSGPA,
    lockedPercentage: weighted.currentPercentage,
    maxPossibleSGPA,
    maxPossiblePercentage: weighted.maxPossiblePercentage,
    isAchievable,
    isAlreadyAchieved,
    requiredPaceOnRemaining,
    isZeroSlipMargin,
    zeroSlipWarning,
    unreachableReason,
    scale,
    coursesForecast,
    courses: coursesForecast
  };
}

function initNewTab() {
  const dateTimeEl = document.getElementById('cc-date-time');
  const heroTitle = document.getElementById('hero-class-title');
  const heroDetails = document.getElementById('hero-class-details');
  const heroCountdown = document.getElementById('hero-class-countdown');
  const nudgeToggle = document.getElementById('cc-nudge-toggle');
  const leadPills = document.querySelectorAll('#lead-pills .pill-btn');
  const testNudgeBtn = document.getElementById('cc-test-nudge-btn');
  const calBtn = document.getElementById('cc-cal-btn');
  const timelineEl = document.getElementById('today-classes-timeline');
  const dayBadge = document.getElementById('cc-day-badge');

  let currentLeadMinutes = 10;
  let nudgesEnabled = true;
  let currentProjectionState = null;
  let currentScaleMode = 'ugc';
  let customCourseCredits = {};
  let currentTargetSGPA = 8.0;
  let lastStoredCoursesGrades = null;
  let lastTripPlan = null;

  // Initialize Clock
  updateClock();
  setInterval(updateClock, 1000);

  // Initialize Settings
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['nudgesEnabled', 'nudgeLeadMinutes', 'targetPercentage', 'cachedAttendance', 'bunkrData', 'attendmateData', 'manualOverrides', 'customTimetable', 'canvas_courses_grades', 'canvas_assignments', 'targetSGPA', 'sgpa_scale_mode', 'custom_course_credits'], (res) => {
      const engine = window.BunkrEngine || window.AttendMateEngine;
      if (res.nudgesEnabled !== undefined) {
        nudgesEnabled = Boolean(res.nudgesEnabled);
        nudgeToggle.checked = nudgesEnabled;
      }
      if (res.nudgeLeadMinutes) {
        currentLeadMinutes = parseInt(res.nudgeLeadMinutes, 10) || 10;
        updateLeadPillsUI();
      }
      if (res.customTimetable && engine) {
        engine.setActiveTimetable(res.customTimetable);
      }
      if (res.sgpa_scale_mode) {
        currentScaleMode = res.sgpa_scale_mode === 'linear' ? 'linear' : 'ugc';
      } else {
        try {
          const localScale = localStorage.getItem('bunkr_sgpa_scale_mode');
          if (localScale === 'linear' || localScale === 'ugc') {
            currentScaleMode = localScale;
          }
        } catch (e) {}
      }
      if (res.custom_course_credits && typeof res.custom_course_credits === 'object') {
        customCourseCredits = { ...res.custom_course_credits };
      } else {
        try {
          const localCr = localStorage.getItem('bunkr_custom_course_credits');
          if (localCr) {
            customCourseCredits = JSON.parse(localCr);
          }
        } catch (e) {}
      }
      if (res.targetSGPA !== undefined) {
        const parsed = parseFloat(res.targetSGPA);
        if (!isNaN(parsed) && parsed >= 5.0 && parsed <= 10.0) {
          currentTargetSGPA = parsed;
        }
      }
      renderSchedule(res.customTimetable);
      renderProjection(res);
      renderSGPASimulator(res.canvas_courses_grades, currentTargetSGPA);
      renderBatchSync(res.customTimetable);
      renderTripPlanner();
      renderCanvasDeadlines(res.canvas_assignments);
    });

    if (chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local') {
          chrome.storage.local.get(['nudgesEnabled', 'nudgeLeadMinutes', 'targetPercentage', 'cachedAttendance', 'bunkrData', 'attendmateData', 'manualOverrides', 'customTimetable', 'canvas_courses_grades', 'canvas_assignments', 'targetSGPA', 'sgpa_scale_mode', 'custom_course_credits'], (res) => {
            const engine = window.BunkrEngine || window.AttendMateEngine;
            if (res.customTimetable && engine) {
              engine.setActiveTimetable(res.customTimetable);
            }
            if (res.sgpa_scale_mode) {
              currentScaleMode = res.sgpa_scale_mode === 'linear' ? 'linear' : 'ugc';
            }
            if (res.custom_course_credits && typeof res.custom_course_credits === 'object') {
              customCourseCredits = { ...res.custom_course_credits };
            }
            if (res.targetSGPA !== undefined) {
              const parsed = parseFloat(res.targetSGPA);
              if (!isNaN(parsed) && parsed >= 5.0 && parsed <= 10.0) {
                currentTargetSGPA = parsed;
              }
            }
            renderSchedule(res.customTimetable);
            renderProjection(res);
            renderSGPASimulator(res.canvas_courses_grades, currentTargetSGPA);
            renderBatchSync(res.customTimetable);
            renderTripPlanner();
            renderCanvasDeadlines(res.canvas_assignments);
          });
        }
      });
    }
  } else {
    let localTimetable = null;
    try {
      const savedTt = localStorage.getItem('bunkr_custom_timetable');
      if (savedTt) {
        localTimetable = JSON.parse(savedTt);
        const engine = window.BunkrEngine || window.AttendMateEngine;
        if (engine && localTimetable && localTimetable.SLOTS) {
          engine.setActiveTimetable(localTimetable);
        }
      }
    } catch (e) {}
    try {
      const localScale = localStorage.getItem('bunkr_sgpa_scale_mode');
      if (localScale === 'linear' || localScale === 'ugc') {
        currentScaleMode = localScale;
      }
    } catch (e) {}
    try {
      const localCr = localStorage.getItem('bunkr_custom_course_credits');
      if (localCr) {
        customCourseCredits = JSON.parse(localCr);
      }
    } catch (e) {}
    renderSchedule(localTimetable);
    renderProjection({});
    renderSGPASimulator(null, null);
    renderBatchSync(localTimetable);
    renderTripPlanner();
    renderCanvasDeadlines(null);
  }

  // Setup interactive controllers for Trip Planner & Batch Sync
  setupTripPlanner();
  setupBatchSync();

  // Setup SGPA Simulator interactive controls
  setupSGPAEventListeners();

  // Nudge Toggle Listener
  nudgeToggle.addEventListener('change', () => {
    nudgesEnabled = nudgeToggle.checked;
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ nudgesEnabled });
    }
    localStorage.setItem('bunkr_nudges_enabled', nudgesEnabled ? 'true' : 'false');
    localStorage.setItem('attendmate_nudges_enabled', nudgesEnabled ? 'true' : 'false');
  });

  // Lead Time Buttons Listener
  leadPills.forEach((btn) => {
    btn.addEventListener('click', () => {
      currentLeadMinutes = parseInt(btn.getAttribute('data-lead'), 10) || 10;
      updateLeadPillsUI();
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ nudgeLeadMinutes: currentLeadMinutes });
      }
      localStorage.setItem('bunkr_nudge_lead_minutes', String(currentLeadMinutes));
      localStorage.setItem('attendmate_nudge_lead_minutes', String(currentLeadMinutes));
    });
  });

  function updateLeadPillsUI() {
    leadPills.forEach((btn) => {
      const lead = parseInt(btn.getAttribute('data-lead'), 10);
      btn.classList.toggle('active', lead === currentLeadMinutes);
    });
  }

  // Test Nudge Action
  testNudgeBtn.addEventListener('click', () => {
    const showSentState = () => {
      const orig = testNudgeBtn.innerHTML;
      testNudgeBtn.innerHTML = '✅ Notification Sent!';
      testNudgeBtn.style.background = '#059669';
      setTimeout(() => {
        testNudgeBtn.innerHTML = orig;
        testNudgeBtn.style.background = '';
      }, 2200);
    };
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({
        type: 'TEST_NUDGE',
        course: 'PSP',
        time: '13:30',
        room: 'A603'
      }, () => {
        showSentState();
      });
    } else {
      showSentState();
      if (typeof showToast === 'function') {
        showToast('Preview nudge: Move — PSP starts 13:30 in A603');
      }
    }
  });

  // Download .ics Calendar Button
  calBtn.addEventListener('click', () => {
    const calUrl = (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL)
      ? chrome.runtime.getURL('rishihood_classes_10min_alert.ics')
      : '../rishihood_classes_10min_alert.ics';
    const a = document.createElement('a');
    a.href = calUrl;
    a.download = 'Rishihood_Classes_10Min_Alerts.ics';
    document.body.appendChild(a);
    a.click();
    a.remove();
    if (typeof showToast === 'function') {
      showToast('Downloaded Rishihood_Classes_10Min_Alerts.ics');
    }
  });

  function updateClock() {
    const now = new Date();
    const options = { weekday: 'long', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
    dateTimeEl.textContent = now.toLocaleDateString('en-US', options);
  }

  function renderSchedule(customTimetable = null) {
    const now = new Date();
    const engine = window.BunkrEngine || window.AttendMateEngine;
    const timetable = customTimetable || (engine && engine.getActiveTimetable ? engine.getActiveTimetable() : (window.BunkrTimetable || window.AttendMateTimetable));

    if (!engine || !timetable) {
      heroTitle.textContent = 'Timetable module loading...';
      return;
    }

    const scheduleSub = document.getElementById('cc-schedule-sub');
    if (scheduleSub) {
      if (timetable.custom) {
        scheduleSub.textContent = `${timetable.program || 'Custom Schedule'} (${timetable.weeklySessionsCount || 0} classes/wk)`;
      } else {
        scheduleSub.textContent = 'B.Tech CSE (DS) Sem 1';
      }
    }

    const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
    dayBadge.textContent = timetable.custom ? `${dayName} • Custom` : dayName;

    // Check Diwali Break & Semester
    if (engine.isDateInDiwaliBreak(now)) {
      heroTitle.textContent = '🌴 Diwali Break (Nov 6–13)';
      heroDetails.textContent = 'No classes scheduled. Enjoy the holidays!';
      heroCountdown.textContent = 'Classes resume Nov 14';
      timelineEl.innerHTML = `<div style="text-align:center; padding:24px; color:#94A3B8; font-size:13px;">No classes scheduled during Diwali break.</div>`;
      return;
    }

    // Check Weekend (Allow Saturday if timetable has Saturday slots)
    const hasSat = timetable.SLOTS && Object.values(timetable.SLOTS).some(s => Array.isArray(s.slots) && s.slots.some(sl => sl.day === 6));
    if (now.getDay() === 0 || (!hasSat && now.getDay() === 6)) {
      heroTitle.textContent = `🎉 Weekend (${dayName})`;
      heroDetails.textContent = 'No academic lectures scheduled for today.';
      heroCountdown.textContent = 'Next lecture: Monday';
      timelineEl.innerHTML = `<div style="text-align:center; padding:24px; color:#94A3B8; font-size:13px;">Weekend &bull; Zero lectures scheduled.</div>`;
      return;
    }

    const todaysClasses = engine.getTodaysClasses(now, timetable);
    if (todaysClasses.length === 0) {
      heroTitle.textContent = '🎉 No Classes Today';
      heroDetails.textContent = 'You have no scheduled sessions on the timetable for today.';
      heroCountdown.textContent = 'Free day';
      timelineEl.innerHTML = `<div style="text-align:center; padding:24px; color:#94A3B8; font-size:13px;">No classes scheduled for today.</div>`;
      return;
    }

    // Render Timeline
    const curMinutes = now.getHours() * 60 + now.getMinutes();

    timelineEl.innerHTML = todaysClasses.map((c) => {
      const [h, m] = c.time.split(':').map(Number);
      const slotMinutes = h * 60 + m;
      const isPast = slotMinutes < curMinutes;
      const isUpcoming = slotMinutes >= curMinutes;

      return `
        <div class="class-item" style="opacity: ${isPast ? '0.45' : '1'};">
          <span class="class-time">${c.time}</span>
          <span class="class-name">${c.subjectName}</span>
          <span class="class-room">${c.room || 'Room TBA'}</span>
        </div>
      `;
    }).join('');

    // Determine Hero Card: Next Class
    const nextClass = engine.getNextUpcomingClass(now);
    if (nextClass) {
      const [h, m] = nextClass.time.split(':').map(Number);
      const slotMinutes = h * 60 + m;
      const diffMins = slotMinutes - curMinutes;

      heroTitle.textContent = `📍 Move — ${nextClass.acronym} starts in ${diffMins}m`;
      heroDetails.textContent = `${nextClass.subjectName} • Room ${nextClass.room || 'TBA'} at ${nextClass.time}`;
      heroCountdown.textContent = `Starts at ${nextClass.time} (${diffMins} minutes away)`;
    } else {
      heroTitle.textContent = '🎉 All Classes Done for Today!';
      heroDetails.textContent = 'You have completed all scheduled sessions for today.';
      heroCountdown.textContent = 'Rest easy • See you tomorrow';
    }
  }

  // ==========================================================================
  // Phase 3: Dynamic Semester Projection & Coach Renderer
  // ==========================================================================
  function renderProjection(storageRes = {}) {
    try {
      const engine = window.BunkrEngine || window.AttendMateEngine;
      if (!engine) return;

      const attendData = storageRes.cachedAttendance || storageRes.bunkrData || storageRes.attendmateData || {};
      let subjects = Array.isArray(attendData.subjects) && attendData.subjects.length > 0
        ? attendData.subjects
        : fallbackSubjects;

      let overrides = storageRes.manualOverrides || {};
      try {
        if (Object.keys(overrides).length === 0) {
          const localOv = localStorage.getItem('bunkr_manual_overrides') || localStorage.getItem('attendmate_manual_overrides');
          if (localOv) overrides = JSON.parse(localOv);
        }
      } catch (e) {}

      let targetPct = parseFloat(storageRes.targetPercentage) || 75;
      try {
        const savedTarget = localStorage.getItem('bunkr_target_percentage') || localStorage.getItem('attendmate_target_percentage');
        if (savedTarget) targetPct = parseFloat(savedTarget) || targetPct;
      } catch (e) {}

      const isStale = Boolean(attendData.drift?.drifted);
      const proj = engine.calculateSemesterProjection(subjects, {
        now: new Date(),
        targetPercentage: targetPct,
        overrides,
        drift: attendData.drift,
        isStale
      });

      currentProjectionState = {
        subjects,
        overrides,
        targetPercentage: targetPct,
        timestamp: attendData.timestamp || Date.now(),
        drift: attendData.drift,
        isStale
      };

      // Update Metric Elements
      const curValEl = document.getElementById('proj-current-val');
      const curSubEl = document.getElementById('proj-current-sub');
      const paceValEl = document.getElementById('proj-pace-val');
      const maxValEl = document.getElementById('proj-max-val');
      const remValEl = document.getElementById('proj-rem-val');
      const targetValEl = document.getElementById('proj-target-val');
      const staleBadge = document.getElementById('proj-stale-badge');
      const completeBanner = document.getElementById('proj-complete-banner');
      const coachBadge = document.getElementById('coach-status-badge');
      const coachList = document.getElementById('coach-callouts-list');

      if (curValEl) curValEl.textContent = `${proj.currentOverallPct.toFixed(1)}%`;
      if (curSubEl) curSubEl.textContent = `${proj.totalAttended} attended of ${proj.totalHeld} held`;
      if (paceValEl) paceValEl.textContent = `${proj.overallPacePct.toFixed(1)}%`;
      if (maxValEl) maxValEl.textContent = `${proj.overallMaxPct.toFixed(1)}%`;
      if (remValEl) remValEl.textContent = `${proj.totalRemainingSessions}`;
      if (targetValEl) targetValEl.textContent = `${proj.targetPercentage}%`;

      if (typeof engine.getRemainingTeachingSummary === 'function') {
        const semSummary = engine.getRemainingTeachingSummary(new Date());
        const remSubEl = document.getElementById('proj-rem-sub');
        const semSubEl = document.getElementById('proj-semester-sub');
        const footerTextEl = document.getElementById('cc-footer-text');
        if (remSubEl) {
          remSubEl.textContent = `${semSummary.teachingDaysLeft} teaching days till ${semSummary.endDateFormatted}`;
        }
        if (semSubEl) {
          semSubEl.innerHTML = `Forecast to semester finish (${semSummary.endDateFormatted}) &bull; Target: <strong id="proj-target-val" style="color:#F8FAFC;">${proj.targetPercentage}%</strong>`;
        }
        if (footerTextEl) {
          footerTextEl.textContent = `Bunkr 2.4.2 • Private & Local • Semester ends: ${semSummary.endDateFormatted}`;
        }
      }

      // Stale notice inheritance
      if (staleBadge) {
        staleBadge.style.display = proj.isStale ? 'inline-block' : 'none';
      }

      // Semester complete notice
      if (completeBanner) {
        completeBanner.style.display = proj.isSemesterComplete ? 'block' : 'none';
      }

      // Coach Insights (speaks ONLY when needed)
      if (coachBadge && coachList) {
        if (proj.atRiskCourses.length === 0) {
          coachBadge.textContent = 'Silence (Healthy)';
          coachBadge.className = 'coach-badge';
          coachList.innerHTML = `
            <div class="coach-callout-item healthy">
              <span class="coach-callout-icon">✓</span>
              <span>${proj.coachHealthySummary}</span>
            </div>
          `;
        } else {
          coachBadge.textContent = `${proj.atRiskCourses.length} below target`;
          coachBadge.className = 'coach-badge warning';
          coachList.innerHTML = proj.atRiskCourses.map((c) => `
            <div class="coach-callout-item">
              <span class="coach-callout-icon">⚠️</span>
              <div>
                <strong>${c.name} (${c.acronym})</strong>: ${c.callout}
              </div>
            </div>
          `).join('');
        }
      }
    } catch (err) {
      const curValEl = document.getElementById('proj-current-val');
      if (curValEl) curValEl.textContent = 'ERR:' + err.message;
    }
  }

  // Copy Status Button Listener
  const copyStatusBtn = document.getElementById('cc-copy-status-btn');
  if (copyStatusBtn) {
    copyStatusBtn.addEventListener('click', () => {
      const engine = window.BunkrEngine || window.AttendMateEngine;
      if (!engine || !currentProjectionState) return;

      const shareText = engine.generateShareText(currentProjectionState);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareText).then(() => {
          showCopyFeedback();
        }).catch(() => {
          prompt('Copy Bunkr Status for WhatsApp:', shareText);
        });
      } else {
        prompt('Copy Bunkr Status for WhatsApp:', shareText);
      }
    });
  }

  function showCopyFeedback() {
    if (!copyStatusBtn) return;
    const origHtml = copyStatusBtn.innerHTML;
    copyStatusBtn.innerHTML = '✓ Copied to Clipboard!';
    copyStatusBtn.style.background = '#047857';
    setTimeout(() => {
      copyStatusBtn.innerHTML = origHtml;
      copyStatusBtn.style.background = '';
    }, 2000);
  }

  // ==========================================================================
  // Semester Academic Standing & SGPA Simulator Controller
  // ==========================================================================
  function setupSGPAEventListeners() {
    const slider = document.getElementById('sgpa-target-slider');
    const quickPills = document.querySelectorAll('#sgpa-quick-pills .pill-btn');
    const scaleUgcBtn = document.getElementById('scale-ugc-btn');
    const scaleLinearBtn = document.getElementById('scale-linear-btn');
    const coursesListEl = document.getElementById('sgpa-courses-list');

    if (slider) {
      slider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (!isNaN(val)) {
          currentTargetSGPA = Number(val.toFixed(1));
          const bubble = document.getElementById('sgpa-slider-bubble');
          const targetUgc = percentageToUgcGrade(currentTargetSGPA * 10);
          if (bubble) bubble.textContent = `${currentTargetSGPA.toFixed(1)} SGPA (${targetUgc.band})`;
        }
      });

      slider.addEventListener('change', (e) => {
        const val = parseFloat(e.target.value);
        if (!isNaN(val)) {
          setAndPersistTargetSGPA(Number(val.toFixed(1)));
        }
      });
    }

    quickPills.forEach((p) => {
      p.addEventListener('click', () => {
        if (p.disabled || p.classList.contains('disabled')) return;
        const val = parseFloat(p.getAttribute('data-sgpa'));
        if (!isNaN(val)) {
          setAndPersistTargetSGPA(val);
        }
      });
    });

    if (scaleUgcBtn) {
      scaleUgcBtn.addEventListener('click', () => {
        setScaleMode('ugc');
      });
    }

    if (scaleLinearBtn) {
      scaleLinearBtn.addEventListener('click', () => {
        setScaleMode('linear');
      });
    }

    if (coursesListEl) {
      coursesListEl.addEventListener('change', (e) => {
        const select = e.target;
        if (select && select.classList.contains('sgpa-credit-select')) {
          const courseKey = select.getAttribute('data-course-key');
          const newCredit = parseInt(select.value, 10);
          if (courseKey && !isNaN(newCredit) && newCredit >= 1 && newCredit <= 6) {
            customCourseCredits[courseKey] = newCredit;
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
              chrome.storage.local.set({ custom_course_credits: customCourseCredits });
            }
            try {
              localStorage.setItem('bunkr_custom_course_credits', JSON.stringify(customCourseCredits));
            } catch (err) {}
            renderSGPASimulator(lastStoredCoursesGrades, currentTargetSGPA);
          }
        }
      });
    }
  }

  function setScaleMode(mode) {
    if (mode !== 'ugc' && mode !== 'linear') return;
    currentScaleMode = mode;
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ sgpa_scale_mode: currentScaleMode });
    }
    try {
      localStorage.setItem('bunkr_sgpa_scale_mode', currentScaleMode);
    } catch (e) {}
    renderSGPASimulator(lastStoredCoursesGrades, currentTargetSGPA);
  }

  function setAndPersistTargetSGPA(val) {
    currentTargetSGPA = val;
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ targetSGPA: val });
    }
    try {
      localStorage.setItem('bunkr_target_sgpa', String(val));
    } catch (e) {}

    renderSGPASimulator(lastStoredCoursesGrades, currentTargetSGPA);
  }

  function renderSGPASimulator(storedCoursesGrades = null, savedTargetSGPA = null) {
    const cardEl = document.getElementById('cc-sgpa-card');
    if (!cardEl) return;

    if (savedTargetSGPA !== null && savedTargetSGPA !== undefined) {
      const parsed = parseFloat(savedTargetSGPA);
      if (!isNaN(parsed) && parsed >= 5.0 && parsed <= 10.0) {
        currentTargetSGPA = parsed;
      }
    } else {
      try {
        const local = localStorage.getItem('bunkr_target_sgpa');
        if (local) {
          const parsed = parseFloat(local);
          if (!isNaN(parsed) && parsed >= 5.0 && parsed <= 10.0) {
            currentTargetSGPA = parsed;
          }
        }
      } catch (e) {}
    }

    if (storedCoursesGrades) {
      lastStoredCoursesGrades = storedCoursesGrades;
    }

    // Merge stored Canvas course grades with default semester courses
    const coursesMap = {};
    DEFAULT_SEMESTER_COURSES.forEach((c) => {
      const courseKey = c.courseId ? `canvas_${c.courseId}` : c.code;
      coursesMap[courseKey] = {
        ...c,
        courseKey,
        scrapedAt: null,
        updatedAt: null
      };
    });

    let isCanvasLiveSynced = false;
    let stored = storedCoursesGrades || lastStoredCoursesGrades;
    if (!stored) {
      try {
        const raw = localStorage.getItem('bunkr_canvas_courses_grades');
        if (raw) {
          stored = JSON.parse(raw);
          lastStoredCoursesGrades = stored;
        }
      } catch (e) {}
    }

    if (stored) {
      const storedList = Array.isArray(stored) ? stored : Object.values(stored);
      if (storedList.length > 0) {
        isCanvasLiveSynced = true;
        storedList.forEach((c) => {
          if (!c) return;
          const code = c.code || c.courseCode || '';
          const courseId = c.courseId ? String(c.courseId) : '';
          const courseKey = courseId ? `canvas_${courseId}` : code;

          // Find if there's an existing matching course in coursesMap
          let existingKey = coursesMap[courseKey] ? courseKey : null;
          if (!existingKey && code) {
            existingKey = Object.keys(coursesMap).find((k) => coursesMap[k].code === code);
          }

          if (existingKey) {
            coursesMap[existingKey] = {
              ...coursesMap[existingKey],
              ...c,
              courseId: courseId || coursesMap[existingKey].courseId || '',
              courseKey: courseKey || existingKey,
              name: c.name || c.courseTitle || coursesMap[existingKey].name,
              credits: c.credits || coursesMap[existingKey].credits || getDefaultCredits(code, c.name),
              lockedPercentage: typeof c.lockedPercentage === 'number' ? c.lockedPercentage : coursesMap[existingKey].lockedPercentage,
              maxPossiblePercentage: typeof c.maxPossiblePercentage === 'number' ? c.maxPossiblePercentage : coursesMap[existingKey].maxPossiblePercentage,
              targetPercentage: typeof c.targetPercentage === 'number' ? c.targetPercentage : coursesMap[existingKey].targetPercentage,
              scrapedAt: c.scrapedAt || c.updatedAt || coursesMap[existingKey].scrapedAt,
              updatedAt: c.updatedAt || c.scrapedAt || coursesMap[existingKey].updatedAt
            };
          } else if (courseKey) {
            coursesMap[courseKey] = {
              code,
              name: c.name || c.courseTitle || code,
              courseId,
              courseKey,
              credits: c.credits || getDefaultCredits(code, c.name),
              lockedPercentage: typeof c.lockedPercentage === 'number' ? c.lockedPercentage : 0,
              maxPossiblePercentage: typeof c.maxPossiblePercentage === 'number' ? c.maxPossiblePercentage : 100,
              targetPercentage: typeof c.targetPercentage === 'number' ? c.targetPercentage : 80,
              scrapedAt: c.scrapedAt || c.updatedAt || null,
              updatedAt: c.updatedAt || c.scrapedAt || null
            };
          }
        });
      }
    }

    const mergedCourses = Object.values(coursesMap);
    const simResult = simulateTargetSGPA(mergedCourses, currentTargetSGPA, {
      scale: currentScaleMode,
      customCredits: customCourseCredits
    });

    // Update Scale Toggle UI
    const scaleUgcBtn = document.getElementById('scale-ugc-btn');
    const scaleLinearBtn = document.getElementById('scale-linear-btn');
    if (scaleUgcBtn && scaleLinearBtn) {
      scaleUgcBtn.classList.toggle('active', currentScaleMode === 'ugc');
      scaleLinearBtn.classList.toggle('active', currentScaleMode === 'linear');
    }

    const cardSubEl = document.getElementById('sgpa-card-sub');
    if (cardSubEl) {
      if (currentScaleMode === 'ugc') {
        cardSubEl.textContent = `Credit-weighted UGC CBCS 10-point SGPA forecaster • ${simResult.totalCredits} Semester Credits (Rishihood University)`;
      } else {
        cardSubEl.textContent = `Credit-weighted Linear (pct / 10) SGPA forecaster • ${simResult.totalCredits} Semester Credits (Rishihood University)`;
      }
    }

    // Update Overall Staleness Stamp
    const stalenessStamp = getOverallStalenessStamp(mergedCourses);
    const asOfBadge = document.getElementById('sgpa-as-of-badge');
    if (asOfBadge) {
      asOfBadge.textContent = stalenessStamp;
    }
    const syncInfo = document.getElementById('sgpa-sync-info');
    if (syncInfo) {
      syncInfo.textContent = stalenessStamp;
    }

    // Status Badge (Canvas Synced vs Baseline)
    const statusBadge = document.getElementById('sgpa-status-badge');
    if (statusBadge) {
      if (isCanvasLiveSynced) {
        statusBadge.textContent = 'Canvas Synced';
        statusBadge.className = 'sgpa-sync-badge';
      } else {
        statusBadge.textContent = 'Curriculum Baseline';
        statusBadge.className = 'sgpa-sync-badge baseline';
      }
    }

    // SGPA Metric Pillars
    const currentValEl = document.getElementById('sgpa-current-val');
    const currentSubEl = document.getElementById('sgpa-current-sub');
    const targetValEl = document.getElementById('sgpa-target-val');
    const targetSubEl = document.getElementById('sgpa-target-sub');
    const maxValEl = document.getElementById('sgpa-max-val');
    const maxSubEl = document.getElementById('sgpa-max-sub');
    const creditsValEl = document.getElementById('sgpa-credits-val');
    const creditsSubEl = document.getElementById('sgpa-credits-sub');

    const targetUgc = percentageToUgcGrade(simResult.targetPercentage);

    if (currentValEl) currentValEl.textContent = simResult.currentSGPA.toFixed(2);
    if (currentSubEl) currentSubEl.textContent = `${simResult.currentPercentage.toFixed(1)}% credit-weighted`;
    if (targetValEl) targetValEl.textContent = simResult.targetSGPA.toFixed(2);
    if (targetSubEl) targetSubEl.textContent = `Target: ${targetUgc.band}`;
    if (maxValEl) maxValEl.textContent = simResult.maxPossibleSGPA.toFixed(2);
    if (maxSubEl) maxSubEl.textContent = `Max achievable: ${simResult.maxPossiblePercentage.toFixed(1)}%`;
    if (creditsValEl) creditsValEl.textContent = simResult.totalCredits;
    if (creditsSubEl) creditsSubEl.textContent = `${mergedCourses.length} semester subjects`;

    // Dynamic Slider Clamping to maxPossibleSGPA
    const slider = document.getElementById('sgpa-target-slider');
    const bubble = document.getElementById('sgpa-slider-bubble');
    if (slider) {
      const maxAttainable = Math.min(10.0, simResult.maxPossibleSGPA);
      slider.max = maxAttainable.toFixed(1);
      slider.value = simResult.targetSGPA.toFixed(1);
    }
    if (bubble) {
      bubble.textContent = `${simResult.targetSGPA.toFixed(1)} SGPA (${targetUgc.band})`;
    }

    // Quick Target Pills: Grey out / disable if above maxPossibleSGPA
    const quickPills = document.querySelectorAll('#sgpa-quick-pills .pill-btn');
    quickPills.forEach((p) => {
      const val = parseFloat(p.getAttribute('data-sgpa'));
      if (val > simResult.maxPossibleSGPA) {
        p.disabled = true;
        p.classList.add('disabled');
        p.title = `Target ${val.toFixed(1)} exceeds maximum achievable ${simResult.maxPossibleSGPA.toFixed(2)} SGPA`;
      } else {
        p.disabled = false;
        p.classList.remove('disabled');
        p.removeAttribute('title');
      }
      p.classList.toggle('active', !p.disabled && Math.abs(val - simResult.targetSGPA) < 0.05);
    });

    // Callout box with Zero-Slip & Unreachable Warnings
    const calloutBox = document.getElementById('sgpa-callout-box');
    const calloutIcon = document.getElementById('sgpa-callout-icon');
    const calloutText = document.getElementById('sgpa-callout-text');

    if (calloutBox && calloutText) {
      if (simResult.isAlreadyAchieved) {
        calloutBox.className = 'sgpa-callout-box achieved';
        if (calloutIcon) calloutIcon.textContent = '🎉';
        calloutText.innerHTML = `<strong>Target Already Secured!</strong> Your current credit-weighted academic standing is <strong>${simResult.currentSGPA.toFixed(2)} SGPA (${simResult.currentPercentage.toFixed(1)}%)</strong>, meeting or exceeding your target of ${simResult.targetSGPA.toFixed(1)} SGPA.`;
      } else if (!simResult.isAchievable) {
        calloutBox.className = 'sgpa-callout-box impossible';
        if (calloutIcon) calloutIcon.textContent = '⚠️';
        const reason = simResult.unreachableReason || `Requires pace exceeding 100% across remaining assessments`;
        calloutText.innerHTML = `<strong>Target Unreachable:</strong> Maximum attainable standing across all remaining assessments is <strong>${simResult.maxPossibleSGPA.toFixed(2)} SGPA (${simResult.maxPossiblePercentage.toFixed(1)}%)</strong>. Target ${simResult.targetSGPA.toFixed(1)} cannot be achieved. ${escapeHtml(reason)}.`;
      } else if (simResult.isZeroSlipMargin) {
        calloutBox.className = 'sgpa-callout-box zeroslip warning';
        if (calloutIcon) calloutIcon.textContent = '⚠️';
        calloutText.innerHTML = `<strong>⚠️ Zero-slip margin:</strong> To achieve <strong>${simResult.targetSGPA.toFixed(1)} SGPA (${simResult.targetPercentage.toFixed(1)}%)</strong>, you need an average of <strong>${simResult.requiredPaceOnRemaining}% marks</strong> across remaining assessments in all active courses. Even a minor penalty will prevent achieving this target.`;
      } else {
        calloutBox.className = 'sgpa-callout-box';
        if (calloutIcon) calloutIcon.textContent = '🎯';
        calloutText.innerHTML = `To achieve <strong>${simResult.targetSGPA.toFixed(1)} SGPA (${simResult.targetPercentage.toFixed(1)}%)</strong>: You need an average of <strong>${simResult.requiredPaceOnRemaining}% marks</strong> across remaining assessments in all active courses.`;
      }
    }

    // Unmatched courses warning banner
    const hasUnmatched = simResult.coursesForecast.some((c) => c.isUnmatched);
    const unmatchedBanner = document.getElementById('sgpa-unmatched-banner');
    if (unmatchedBanner) {
      unmatchedBanner.style.display = hasUnmatched ? 'flex' : 'none';
    }

    // Render Course Breakdown List with Dropdowns, Freshness Badges, and Warning Pills
    const coursesListEl = document.getElementById('sgpa-courses-list');
    if (coursesListEl) {
      coursesListEl.innerHTML = simResult.coursesForecast.map((c) => {
        let badgeClass = 'needed';
        let badgeText = '';

        if (simResult.isAlreadyAchieved || c.isFullyLocked) {
          badgeClass = 'achieved';
          badgeText = `Locked: ${c.lockedSGPA.toFixed(currentScaleMode === 'ugc' ? 0 : 2)} SGPA`;
        } else if (!simResult.isAchievable) {
          badgeClass = 'impossible';
          badgeText = `Max: ${c.maxPossibleSGPA.toFixed(currentScaleMode === 'ugc' ? 0 : 2)} SGPA`;
        } else {
          badgeClass = 'needed';
          badgeText = `Need ${c.neededPercentageOnRemaining}% on remaining &rarr; ${c.neededCourseSGPA.toFixed(currentScaleMode === 'ugc' ? 0 : 2)} SGPA`;
        }

        const lockedBarPct = Math.min(100, Math.max(0, c.lockedPercentage));
        const neededBarPct = simResult.isAchievable && !simResult.isAlreadyAchieved
          ? Math.min(100 - lockedBarPct, Math.max(0, c.neededCoursePercentage - c.lockedPercentage))
          : 0;

        const freshness = c.freshness || getFreshnessStatus(c.scrapedAt);
        const courseKeyAttr = escapeHtml(c.courseKey || (c.courseId ? `canvas_${c.courseId}` : c.code));

        const creditSelectHtml = `
          <label class="sgpa-credit-label" title="Edit course credits (1-6)">
            <select class="sgpa-credit-select" data-course-key="${courseKeyAttr}" aria-label="Course Credits for ${escapeHtml(c.name)}">
              ${[1, 2, 3, 4, 5, 6].map((cr) => `<option value="${cr}" ${c.credits === cr ? 'selected' : ''}>${cr} Cr</option>`).join('')}
            </select>
          </label>
        `;

        const unmatchedPillHtml = c.isUnmatched
          ? `<span class="unmatched-credit-pill" title="Unrecognized curriculum course. Please verify credit weighting.">⚠️ Confirm Credits</span>`
          : '';

        const gradeSuffix = currentScaleMode === 'ugc' && c.ugcGrade
          ? ` - Grade ${c.ugcGrade.letter}`
          : '';

        return `
          <div class="sgpa-course-item">
            <div class="sgpa-course-row-top">
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <strong class="sgpa-course-name">${escapeHtml(c.name)}</strong>
                <span class="sgpa-course-code">${escapeHtml(c.code)}</span>
                <span class="sgpa-freshness-badge ${freshness.className}">${freshness.label}</span>
                ${unmatchedPillHtml}
                ${creditSelectHtml}
              </div>
              <div class="sgpa-target-badge ${badgeClass}">${badgeText}</div>
            </div>
            <div class="sgpa-course-meta">
              Locked: <strong style="color:#F8FAFC;">${c.lockedPercentage.toFixed(1)}% (${c.lockedSGPA.toFixed(currentScaleMode === 'ugc' ? 0 : 2)} SGPA${gradeSuffix})</strong>
              &bull; Max Possible: <strong style="color:#60A5FA;">${c.maxPossiblePercentage.toFixed(1)}% (${c.maxPossibleSGPA.toFixed(currentScaleMode === 'ugc' ? 0 : 2)} SGPA)</strong>
              &bull; Remaining Weight: <strong>${c.remainingWeight.toFixed(1)}%</strong>
            </div>
            <div class="sgpa-bar-bg">
              <div class="sgpa-bar-locked" style="width: ${lockedBarPct}%;" title="Locked: ${c.lockedPercentage}%"></div>
              <div class="sgpa-bar-needed" style="width: ${neededBarPct}%;" title="Target Goal: ${c.neededCoursePercentage}%"></div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // ==========================================================================
  // Schedule Customization & Upload Modal
  // ==========================================================================
  const scheduleModal = document.getElementById('schedule-modal');
  const customScheduleBtn = document.getElementById('cc-custom-schedule-btn');
  const scheduleModalClose = document.getElementById('schedule-modal-close');
  const scheduleCancelBtn = document.getElementById('schedule-cancel-btn');
  const scheduleSaveBtn = document.getElementById('schedule-save-btn');
  const scheduleResetBtn = document.getElementById('schedule-reset-btn');
  const scheduleDropZone = document.getElementById('schedule-drop-zone');
  const scheduleFileInput = document.getElementById('schedule-file-input');
  const scheduleLoading = document.getElementById('schedule-loading');
  const scheduleLoadingMsg = document.getElementById('schedule-loading-msg');
  const scheduleErrorAlert = document.getElementById('schedule-error-alert');
  const scheduleSuccessAlert = document.getElementById('schedule-success-alert');
  const schedulePreviewSection = document.getElementById('schedule-preview-section');
  const weeklyPreviewGrid = document.getElementById('weekly-preview-grid');
  const scheduleSummaryStats = document.getElementById('schedule-summary-stats');
  const scheduleStatusText = document.getElementById('schedule-status-text');
  const scheduleStatusBanner = document.getElementById('schedule-status-banner');
  const schedulePasteToggleBtn = document.getElementById('schedule-paste-toggle-btn');
  const schedulePasteBox = document.getElementById('schedule-paste-box');
  const schedulePasteInput = document.getElementById('schedule-paste-input');
  const scheduleParsePasteBtn = document.getElementById('schedule-parse-paste-btn');
  const scheduleAddSlotBtn = document.getElementById('schedule-add-slot-btn');
  const scheduleUndoBtn = document.getElementById('schedule-undo-btn');
  const scheduleNeedsReviewBanner = document.getElementById('schedule-needs-review-banner');
  const courseHarmonizationCard = document.getElementById('course-harmonization-card');
  const harmonizationList = document.getElementById('harmonization-list');
  const harmonizationSummaryBadge = document.getElementById('harmonization-summary-badge');
  const harmonizationNote = document.getElementById('harmonization-note');

  // Structured Slot Editor Modal Elements
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
  let editingSlot = null; // { day, time, key, name, room, endTime }

  function openScheduleModal() {
    if (!scheduleModal) return;
    scheduleModal.style.display = 'flex';
    hideScheduleAlerts();

    // Check active timetable
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['customTimetable'], (res) => {
        setupModalWithTimetable(res.customTimetable);
      });
    } else {
      setupModalWithTimetable(null);
    }
  }

  function closeScheduleModal() {
    if (scheduleModal) scheduleModal.style.display = 'none';
    closeSlotModal();
    hideScheduleAlerts();
  }

  function hideScheduleAlerts() {
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

  function setupModalWithTimetable(custom) {
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
            <div class="slot-name">${s.subjectName}</div>
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

    // Render Course Harmonization List
    renderCourseHarmonization(timetable);
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

    // Retrieve recognized / enrolled courses from storage & default timetable
    let enrolledCourses = [];
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      try {
        const stored = await chrome.storage.local.get(['cachedAttendance', 'bunkrData', 'attendmateData']);
        const att = stored.cachedAttendance || stored.bunkrData || stored.attendmateData || {};
        if (Array.isArray(att.subjects)) enrolledCourses = att.subjects;
      } catch (e) {
        // storage lookup error handled safely
      }
    }

    // Default reference syllabus courses if ERP is not yet synced
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

      // Check against reference list
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

  async function handleScheduleUpload(file) {
    if (!file) return;

    // Reset error state and hide previous previews immediately (Defect 8 & Requirement 4)
    hideScheduleAlerts();
    if (schedulePreviewSection) schedulePreviewSection.style.display = 'none';
    if (scheduleSaveBtn) scheduleSaveBtn.style.display = 'none';
    pendingTimetable = null;

    if (scheduleLoading) {
      scheduleLoading.style.display = 'block';
      scheduleLoadingMsg.textContent = `Analyzing ${file.name}... Extracting timetable...`;
    }

    try {
      const parser = window.BunkrScheduleParser || window.AttendMateScheduleParser;
      if (!parser) {
        throw new Error('Schedule parser module is not loaded.');
      }

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

  // File Upload Handlers
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

  // Paste Text Handlers
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

      hideScheduleAlerts();
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

  // Add Slot Button Handler -> Opens Structured Modal Form
  if (scheduleAddSlotBtn) {
    scheduleAddSlotBtn.addEventListener('click', () => {
      if (!pendingTimetable) {
        initializeBlankCustomTimetable();
      }
      openSlotModal('add');
    });
  }

  // Undo Button Handler
  if (scheduleUndoBtn) {
    scheduleUndoBtn.addEventListener('click', handleUndo);
  }

  // Structured Slot Editor Form Handler
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

      // Form Validations
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

      // Validated!
      saveToHistory();

      if (!pendingTimetable) {
        initializeBlankCustomTimetable();
      }

      // If editing an existing slot, remove previous slot first
      if (editingSlot && editingSlot.key && pendingTimetable.SLOTS[editingSlot.key]) {
        pendingTimetable.SLOTS[editingSlot.key].slots = pendingTimetable.SLOTS[editingSlot.key].slots.filter(
          s => !(s.day === editingSlot.day && s.time === editingSlot.time)
        );
        if (pendingTimetable.SLOTS[editingSlot.key].slots.length === 0) {
          delete pendingTimetable.SLOTS[editingSlot.key];
        }
      }

      // Match or generate key for course name
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
        confidence: 1.0, // Manually entered or confirmed
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

  if (slotModalClose) {
    slotModalClose.addEventListener('click', closeSlotModal);
  }
  if (slotModalCancel) {
    slotModalCancel.addEventListener('click', closeSlotModal);
  }
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
      const isModalOpen = scheduleModal && scheduleModal.style.display !== 'none';
      const isSlotModalOpen = slotModal && slotModal.style.display !== 'none';
      if (isModalOpen && !isSlotModalOpen && !isInput && timetableHistory.length > 0) {
        e.preventDefault();
        handleUndo();
      }
    }
    if (e.key === 'Escape') {
      if (slotModal && slotModal.style.display !== 'none') {
        closeSlotModal();
      } else if (scheduleModal && scheduleModal.style.display !== 'none') {
        closeScheduleModal();
      }
    }
  });

  // Expose test helper hook for test automation
  window.__bunkrSlotModal = {
    open: openSlotModal,
    close: closeSlotModal,
    fillAndSubmit: (slotData) => {
      if (slotFormDay && slotData.day !== undefined) slotFormDay.value = String(slotData.day);
      if (slotFormName && slotData.courseName !== undefined) slotFormName.value = slotData.courseName;
      if (slotFormStart && slotData.startTime !== undefined) slotFormStart.value = slotData.startTime;
      if (slotFormEnd && slotData.endTime !== undefined) slotFormEnd.value = slotData.endTime;
      if (slotFormRoom && slotData.room !== undefined) slotFormRoom.value = slotData.room;
      if (slotFormSubmit) slotFormSubmit.click();
    }
  };

  if (scheduleSaveBtn) {
    scheduleSaveBtn.addEventListener('click', () => {
      if (!pendingTimetable) return;
      pendingTimetable.custom = true;
      pendingTimetable.savedAt = new Date().toISOString();

      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ customTimetable: pendingTimetable }, () => {
          const engine = window.BunkrEngine || window.AttendMateEngine;
          if (engine) {
            engine.setActiveTimetable(pendingTimetable);
          }
          renderSchedule(pendingTimetable);
          chrome.storage.local.get(['cachedAttendance', 'bunkrData', 'attendmateData', 'manualOverrides', 'targetPercentage'], (res) => {
            renderProjection(res);
            renderBatchSync(pendingTimetable);
            renderTripPlanner();
          });
          closeScheduleModal();
          showToast('Custom timetable applied to nudges, projections & trip planner.');
        });
      } else {
        const engine = window.BunkrEngine || window.AttendMateEngine;
        if (engine) {
          engine.setActiveTimetable(pendingTimetable);
        }
        try {
          localStorage.setItem('bunkr_custom_timetable', JSON.stringify(pendingTimetable));
        } catch (e) {}
        renderSchedule(pendingTimetable);
        renderProjection({});
        renderBatchSync(pendingTimetable);
        renderTripPlanner();
        closeScheduleModal();
        showToast('Custom timetable applied.');
      }
    });
  }

  if (scheduleResetBtn) {
    scheduleResetBtn.addEventListener('click', () => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.remove('customTimetable', () => {
          const engine = window.BunkrEngine || window.AttendMateEngine;
          if (engine) {
            engine.setActiveTimetable(null);
          }
          renderSchedule();
          chrome.storage.local.get(['cachedAttendance', 'bunkrData', 'attendmateData', 'manualOverrides', 'targetPercentage'], (res) => {
            renderProjection(res);
            renderBatchSync(null);
            renderTripPlanner();
          });
          closeScheduleModal();
          showToast('Reset to default B.Tech CSE (DS) Sem 1 schedule.');
        });
      } else {
        const engine = window.BunkrEngine || window.AttendMateEngine;
        if (engine) {
          engine.setActiveTimetable(null);
        }
        try { localStorage.removeItem('bunkr_custom_timetable'); } catch (e) {}
        renderSchedule();
        renderProjection({});
        renderBatchSync(null);
        renderTripPlanner();
        closeScheduleModal();
        showToast('Reset to default B.Tech CSE (DS) Sem 1 schedule.');
      }
    });
  }

  if (customScheduleBtn) {
    customScheduleBtn.addEventListener('click', openScheduleModal);
  }
  if (scheduleModalClose) {
    scheduleModalClose.addEventListener('click', closeScheduleModal);
  }
  if (scheduleCancelBtn) {
    scheduleCancelBtn.addEventListener('click', closeScheduleModal);
  }
  if (scheduleModal) {
    scheduleModal.addEventListener('click', (e) => {
      if (e.target === scheduleModal) closeScheduleModal();
    });
  }

  // ==========================================================================
  // Trip & Leave Date-Range Planner Controller
  // ==========================================================================
  function formatIsoLocal(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function getDefaultTripRange(daysCount = 3) {
    const start = new Date();
    start.setDate(start.getDate() + 1);
    const end = new Date(start);
    end.setDate(end.getDate() + Math.max(0, daysCount - 1));
    return { startIso: formatIsoLocal(start), endIso: formatIsoLocal(end) };
  }

  // lastTripPlan hoisted to initNewTab scope

  function setupTripPlanner() {
    const startInput = document.getElementById('cc-trip-start');
    const endInput = document.getElementById('cc-trip-end');
    const excusedCheck = document.getElementById('cc-trip-excused');
    const presetGroup = document.getElementById('cc-trip-presets');
    const copyTripBtn = document.getElementById('cc-trip-copy-btn');

    if (startInput && endInput && !startInput.value) {
      const def = getDefaultTripRange(3);
      startInput.value = def.startIso;
      endInput.value = def.endIso;
    }

    if (presetGroup) {
      presetGroup.querySelectorAll('[data-trip-days]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const days = parseInt(btn.getAttribute('data-trip-days'), 10) || 3;
          presetGroup.querySelectorAll('[data-trip-days]').forEach((b) => b.classList.toggle('active', b === btn));
          const range = getDefaultTripRange(days);
          if (startInput) startInput.value = range.startIso;
          if (endInput) endInput.value = range.endIso;
          renderTripPlanner();
        });
      });
    }

    [startInput, endInput, excusedCheck].forEach((el) => {
      if (el) {
        el.addEventListener('change', () => {
          if (el !== excusedCheck && presetGroup) {
            presetGroup.querySelectorAll('[data-trip-days]').forEach((b) => b.classList.remove('active'));
          }
          renderTripPlanner();
        });
      }
    });

    if (copyTripBtn) {
      copyTripBtn.addEventListener('click', () => {
        const engine = window.BunkrEngine || window.AttendMateEngine;
        if (!engine || !lastTripPlan || !lastTripPlan.valid) return;
        const text = engine.generateTripShareText(lastTripPlan);
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(() => {
            const orig = copyTripBtn.textContent;
            copyTripBtn.textContent = 'Copied Plan!';
            setTimeout(() => { copyTripBtn.textContent = orig; }, 1800);
            showToast('Trip plan copied for WhatsApp');
          }).catch(() => {
            showToast('Trip plan ready — clipboard unavailable in preview');
          });
        }
      });
    }

    renderTripPlanner();
  }

  function renderTripPlanner() {
    const engine = window.BunkrEngine || window.AttendMateEngine;
    const startInput = document.getElementById('cc-trip-start');
    const endInput = document.getElementById('cc-trip-end');
    const excusedCheck = document.getElementById('cc-trip-excused');
    const verdictBox = document.getElementById('cc-trip-verdict');
    const verdictText = document.getElementById('cc-trip-verdict-text');
    const overallText = document.getElementById('cc-trip-overall-text');
    const metaText = document.getElementById('cc-trip-meta-text');
    const coursesEl = document.getElementById('cc-trip-courses');

    if (!engine || !startInput || !endInput || !verdictBox || !coursesEl) return;
    if (!startInput.value || !endInput.value) {
      const def = getDefaultTripRange(3);
      startInput.value = def.startIso;
      endInput.value = def.endIso;
    }

    const subjects = (currentProjectionState && Array.isArray(currentProjectionState.subjects) && currentProjectionState.subjects.length > 0)
      ? currentProjectionState.subjects
      : fallbackSubjects;
    const targetPct = (currentProjectionState && currentProjectionState.targetPercentage) || 75;
    const overrides = (currentProjectionState && currentProjectionState.overrides) || {};

    const plan = engine.simulateLeavePlan(subjects, startInput.value, endInput.value, {
      targetPercentage: targetPct,
      overrides,
      excusedLeaves: excusedCheck && excusedCheck.checked ? 1 : 0
    });
    lastTripPlan = plan;

    if (!plan.valid) {
      verdictBox.className = 'trip-verdict danger';
      verdictText.textContent = plan.error || 'Select a valid date range.';
      overallText.textContent = '';
      metaText.textContent = '';
      coursesEl.innerHTML = '';
      return;
    }

    verdictBox.className = `trip-verdict ${plan.verdictTone}`;
    verdictText.textContent = plan.verdict;
    overallText.textContent = `Overall: ${plan.overallBeforePct.toFixed(1)}% → ${plan.overallAfterPct.toFixed(1)}% (${plan.overallDeltaPct >= 0 ? '+' : ''}${plan.overallDeltaPct.toFixed(1)}%)`;
    metaText.textContent = `${plan.totalMissedSessions} classes across ${plan.teachingDaysMissed} teaching day${plan.teachingDaysMissed === 1 ? '' : 's'}`;

    if (plan.affectedCourses.length === 0) {
      coursesEl.innerHTML = `<div class="trip-course-tile"><div class="trip-course-name">Zero scheduled classes affected</div><div class="trip-course-sub"><span>${plan.startLabel} – ${plan.endLabel} falls on weekend or campus break</span></div></div>`;
      return;
    }

    coursesEl.innerHTML = plan.affectedCourses.map((c) => {
      const pctColor = c.safeAfter ? '#34D399' : '#FCA5A5';
      const detail = c.safeAfter
        ? (c.excusedApplied > 0 ? `Safe (${c.excusedApplied} excused applied)` : 'Remains above target')
        : (c.excusedLeavesToSave > 0
          ? `Need ${c.excusedLeavesToSave} excused or ${c.recoveryClasses} next classes`
          : `Need ${c.recoveryClasses} classes to recover`);
      return `
        <div class="trip-course-tile ${c.safeAfter ? '' : 'risk'}">
          <div class="trip-course-top">
            <span class="trip-course-name">${c.acronym} &middot; ${c.name}</span>
            <span class="trip-course-pct" style="color:${pctColor};">${c.beforePct.toFixed(0)}% → ${c.afterPct.toFixed(1)}%</span>
          </div>
          <div class="trip-course-sub">
            <span>-${c.missed} class${c.missed === 1 ? '' : 'es'}</span>
            <span>${detail}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // ==========================================================================
  // Batch & Section Sync Controller (1-Click Presets + BUNKR-TT1 Share Codes)
  // ==========================================================================
  function applyActiveTimetable(timetableObj, labelMsg) {
    const engine = window.BunkrEngine || window.AttendMateEngine;
    if (!engine || !timetableObj) return;
    engine.setActiveTimetable(timetableObj);

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ customTimetable: timetableObj });
    }
    try {
      localStorage.setItem('bunkr_custom_timetable', JSON.stringify(timetableObj));
    } catch (e) {}

    renderSchedule(timetableObj);
    renderProjection(currentProjectionState || {});
    renderBatchSync(timetableObj);
    renderTripPlanner();
    if (labelMsg) showToast(labelMsg);
  }

  function renderBatchSync(activeTt = null) {
    const engine = window.BunkrEngine || window.AttendMateEngine;
    const ttLib = window.BunkrTimetable || window.AttendMateTimetable;
    const presetsEl = document.getElementById('cc-preset-pills');
    const codePreviewEl = document.getElementById('cc-batch-code-preview');
    const sectionBadge = document.getElementById('cc-active-section-badge');

    if (!engine || !ttLib) return;
    const currentTt = activeTt || engine.getActiveTimetable();
    const activePresetId = (currentTt && currentTt.presetId) || (!currentTt || !currentTt.custom ? 'cse-ds-sec-a' : '');

    if (sectionBadge) {
      sectionBadge.textContent = (currentTt && currentTt.section) ? currentTt.section : 'Sec-A';
    }

    if (presetsEl && ttLib.BATCH_PRESETS) {
      presetsEl.innerHTML = Object.values(ttLib.BATCH_PRESETS).map((preset) => {
        const isActive = preset.id === activePresetId;
        return `<button type="button" class="batch-preset-btn ${isActive ? 'active' : ''}" data-preset-id="${preset.id}">${preset.label}</button>`;
      }).join('');

      presetsEl.querySelectorAll('[data-preset-id]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-preset-id');
          const preset = ttLib.getPreset(id);
          if (!preset) return;
          preset.custom = id !== 'cse-ds-sec-a';
          preset.presetId = id;
          preset.weeklySessionsCount = Object.values(preset.SLOTS).reduce((acc, s) => acc + (s.slots ? s.slots.length : 0), 0);
          applyActiveTimetable(preset, `Switched timetable to ${preset.label}`);
        });
      });
    }

    if (codePreviewEl && typeof engine.encodeBatchCode === 'function') {
      codePreviewEl.textContent = engine.encodeBatchCode(currentTt);
    }
  }

  function setupBatchSync() {
    const copyBtn = document.getElementById('cc-copy-batch-btn');
    const applyBtn = document.getElementById('cc-apply-batch-btn');
    const inputEl = document.getElementById('cc-batch-code-input');
    const feedbackEl = document.getElementById('cc-batch-feedback');

    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const engine = window.BunkrEngine || window.AttendMateEngine;
        if (!engine) return;
        const code = engine.encodeBatchCode(engine.getActiveTimetable());
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(code).then(() => {
            const orig = copyBtn.textContent;
            copyBtn.textContent = 'Copied Code!';
            setTimeout(() => { copyBtn.textContent = orig; }, 1800);
            showToast('Batch code copied — drop it in your section WhatsApp group!');
          }).catch(() => {
            if (feedbackEl) {
              feedbackEl.style.display = 'block';
              feedbackEl.className = 'batch-feedback ok';
              feedbackEl.textContent = 'Batch code ready above — select and copy.';
            }
          });
        }
      });
    }

    if (applyBtn && inputEl) {
      applyBtn.addEventListener('click', () => {
        const engine = window.BunkrEngine || window.AttendMateEngine;
        if (!engine) return;
        const res = engine.decodeBatchCode(inputEl.value);
        if (!res.ok) {
          if (feedbackEl) {
            feedbackEl.style.display = 'block';
            feedbackEl.className = 'batch-feedback err';
            feedbackEl.textContent = res.error;
          }
          return;
        }
        applyActiveTimetable(res.timetable, `Loaded shared batch timetable (${res.timetable.section} · ${res.timetable.weeklySessionsCount} classes/wk)`);
        if (feedbackEl) {
          feedbackEl.style.display = 'block';
          feedbackEl.className = 'batch-feedback ok';
          feedbackEl.textContent = `Applied ${res.timetable.program} (${res.timetable.section}) — ${res.timetable.subjectsCount} courses, ${res.timetable.weeklySessionsCount} sessions/week.`;
        }
        inputEl.value = '';
      });
    }
  }

  // ==========================================================================
  // Upcoming Canvas Deadlines Renderer
  // ==========================================================================
  function renderCanvasDeadlines(storedAssignments) {
    const listEl = document.getElementById('cc-deadlines-list');
    const countEl = document.getElementById('cc-deadlines-count');
    if (!listEl) return;

    let items = Array.isArray(storedAssignments) ? storedAssignments : [];
    if (items.length === 0) {
      try {
        const raw = localStorage.getItem('bunkr_canvas_assignments');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) items = parsed;
        }
      } catch (e) {}
    }

    // Filter unsubmitted upcoming items; provide deterministic preview entries in standalone mode
    const nowMs = Date.now();
    let upcoming = items
      .filter((a) => a && a.dueAt && !a.submitted)
      .map((a) => ({
        title: a.title || a.name || 'Assignment',
        course: a.course || a.courseName || 'Canvas Course',
        dueMs: new Date(a.dueAt).getTime(),
        url: a.url || 'https://rishihood.instructure.com'
      }))
      .filter((a) => !isNaN(a.dueMs) && a.dueMs >= nowMs - 3600000)
      .sort((a, b) => a.dueMs - b.dueMs)
      .slice(0, 5);

    const isPreviewDemo = upcoming.length === 0 && typeof chrome === 'undefined';
    if (isPreviewDemo) {
      upcoming = [
        { title: 'PSP Lab 06: Recursion & Backtracking', course: 'Problem Solving & Programming', dueMs: nowMs + 18 * 3600000 },
        { title: 'WAD Responsive Grid Portfolio Checkpoint', course: 'Web Application Development I', dueMs: nowMs + 42 * 3600000 },
        { title: 'Linear Systems Problem Set 4', course: 'Mathematics-I (Foundation)', dueMs: nowMs + 96 * 3600000 }
      ];
    }

    if (countEl) {
      countEl.textContent = isPreviewDemo
        ? `${upcoming.length} preview`
        : `${upcoming.length} upcoming`;
    }

    if (upcoming.length === 0) {
      listEl.innerHTML = `<div style="text-align:center; padding:22px 12px; color:#94A3B8; font-size:12.5px;">No upcoming Canvas deadlines cached yet.<br><span style="font-size:11px; color:#64748B;">Open your Canvas Assignments page once to sync automatically.</span></div>`;
      return;
    }

    listEl.innerHTML = upcoming.map((item) => {
      const diffHrs = Math.max(0, Math.round((item.dueMs - nowMs) / 3600000));
      const urgent = diffHrs <= 24;
      const dueLabel = diffHrs < 24
        ? `Due in ${diffHrs}h`
        : `Due in ${Math.round(diffHrs / 24)}d`;
      return `
        <div class="deadline-item">
          <div>
            <div class="deadline-title">${item.title}</div>
            <div class="deadline-course">${item.course}</div>
          </div>
          <span class="deadline-due ${urgent ? 'urgent' : ''}">${dueLabel}</span>
        </div>
      `;
    }).join('');
  }

  if (typeof window !== 'undefined' && window.location && window.location.search && window.location.search.includes('modal=schedule')) {
    openScheduleModal();
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNewTab);
  } else {
    initNewTab();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DEFAULT_RISHIHOOD_CREDITS,
    DEFAULT_SEMESTER_COURSES,
    getDefaultCredits,
    isRecognizedKeyword,
    percentageToGradePoint,
    percentageToUgcGrade,
    percentageToSGPA,
    getFreshnessStatus,
    getOverallStalenessStamp,
    normalizeCoursesList,
    calculateCreditWeightedSGPA,
    calculateOverallSGPA,
    simulateTargetSGPA,
    initNewTab
  };
}
