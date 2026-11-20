// Bunkr 2.0 - Core Attendance Math Engine
// Exact parity with Bunkr AttendanceMath algorithms

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BunkrMath = root.AttendMateMath = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /**
   * Calculates how many consecutive upcoming classes can be bunked while keeping
   * attendance at or above targetPercentage.
   */
  function calculateBunkableClasses(attended, marked, targetPercentage = 75) {
    if (marked <= 0 || targetPercentage <= 0) return 0;
    const targetRatio = targetPercentage / 100.0;
    const currentRatio = attended / marked;
    if (currentRatio < targetRatio) return 0;

    let bunkable = Math.floor((attended - targetRatio * marked) / targetRatio + 1e-9);
    if (bunkable < 0) bunkable = 0;

    while (bunkable > 0 && (attended / (marked + bunkable)) < targetRatio) {
      bunkable--;
    }
    while ((attended / (marked + bunkable + 1)) >= targetRatio) {
      bunkable++;
    }
    return bunkable;
  }

  /**
   * Calculates how many consecutive upcoming classes must be attended to reach
   * targetPercentage.
   * Returns 0 if already at or above target.
   * Returns -1 if target >= 100% and attendance < 100% (unreachable).
   */
  function calculateClassesNeeded(attended, marked, targetPercentage = 75) {
    if (marked <= 0) return 0;
    const targetRatio = targetPercentage / 100.0;
    const currentRatio = attended / marked;
    if (currentRatio >= targetRatio) return 0;
    if (targetRatio >= 1.0) return -1; // Unreachable

    let needed = Math.ceil((targetRatio * marked - attended) / (1.0 - targetRatio) - 1e-9);
    if (needed < 1) needed = 1;

    while ((attended + needed) / (marked + needed) < targetRatio) {
      needed++;
    }
    while (needed > 1 && ((attended + needed - 1) / (marked + needed - 1)) >= targetRatio) {
      needed--;
    }
    return needed;
  }

  /**
   * Calculates the signed bunkable metric:
   * - Positive (+k): number of classes you can safely bunk.
   * - 0: attendance is exactly at target or no marked classes.
   * - Negative (-x): number of consecutive classes you must attend to get back to target.
   */
  function calculateBunkableDeficitOrSurplus(attended, marked, targetPercentage = 75) {
    if (marked <= 0) return 0;
    const targetRatio = targetPercentage / 100.0;
    const currentRatio = attended / marked;

    if (currentRatio > targetRatio) {
      return calculateBunkableClasses(attended, marked, targetPercentage);
    } else if (currentRatio < targetRatio) {
      const needed = calculateClassesNeeded(attended, marked, targetPercentage);
      if (needed === -1) {
        return -(marked - attended);
      }
      return -needed;
    }
    return 0;
  }

  /**
   * Simulates future attendance under a "What-If" scenario:
   * "If I attend next X classes and bunk next Y classes..."
   */
  function simulateWhatIf({ attended, marked, willAttend = 0, willBunk = 0, targetPercentage = 75 }) {
    const curAttended = Number(attended) || 0;
    const curMarked = Number(marked) || 0;
    const addAttend = Math.max(0, parseInt(willAttend, 10) || 0);
    const addBunk = Math.max(0, parseInt(willBunk, 10) || 0);

    const newAttended = curAttended + addAttend;
    const newMarked = curMarked + addAttend + addBunk;

    const currentPercentage = curMarked > 0 ? (curAttended / curMarked) * 100 : 0;
    const projectedPercentage = newMarked > 0 ? (newAttended / newMarked) * 100 : 0;
    const percentageDelta = projectedPercentage - currentPercentage;

    const newBunkable = calculateBunkableClasses(newAttended, newMarked, targetPercentage);
    const newNeeded = calculateClassesNeeded(newAttended, newMarked, targetPercentage);

    return {
      currentPercentage,
      projectedPercentage,
      percentageDelta,
      currentAttended: curAttended,
      currentMarked: curMarked,
      projectedAttended: newAttended,
      projectedMarked: newMarked,
      newBunkable,
      newNeeded,
      isAboveTarget: projectedPercentage >= targetPercentage
    };
  }

  /**
   * Computes human-friendly status descriptor and theme colors.
   */
  function getAttendanceStatus(attended, marked, targetPercentage = 75) {
    if (marked <= 0) {
      return {
        type: 'empty',
        percentage: 0,
        text: 'No Classes Yet',
        shortText: '0 Classes',
        bunkable: 0,
        needed: 0,
        color: '#6B7280',
        bg: 'rgba(107, 114, 128, 0.12)',
        borderColor: 'rgba(107, 114, 128, 0.3)'
      };
    }

    const percentage = (attended / marked) * 100;
    const targetRatio = targetPercentage / 100.0;
    const currentRatio = attended / marked;

    if (currentRatio >= targetRatio) {
      const bunkable = calculateBunkableClasses(attended, marked, targetPercentage);
      if (bunkable > 0) {
        return {
          type: 'safe',
          percentage,
          text: `Can bunk ${bunkable} class${bunkable === 1 ? '' : 'es'}`,
          shortText: `Bunk ${bunkable}`,
          bunkable,
          needed: 0,
          color: '#10B981', // Emerald green
          bg: 'rgba(16, 185, 129, 0.12)',
          borderColor: 'rgba(16, 185, 129, 0.3)'
        };
      } else {
        return {
          type: 'borderline',
          percentage,
          text: 'On track (Can\'t bunk next)',
          shortText: 'Bunk 0',
          bunkable: 0,
          needed: 0,
          color: '#06B6D4', // Cyan
          bg: 'rgba(6, 182, 212, 0.12)',
          borderColor: 'rgba(6, 182, 212, 0.3)'
        };
      }
    } else {
      const needed = calculateClassesNeeded(attended, marked, targetPercentage);
      if (needed === -1) {
        return {
          type: 'critical',
          percentage,
          text: `Target ${targetPercentage}% unreachable`,
          shortText: 'Unreachable',
          bunkable: 0,
          needed: -1,
          color: '#DC2626', // Dark red
          bg: 'rgba(220, 38, 38, 0.15)',
          borderColor: 'rgba(220, 38, 38, 0.4)'
        };
      } else {
        return {
          type: 'shortage',
          percentage,
          text: `Attend next ${needed} class${needed === 1 ? '' : 'es'}`,
          shortText: `Attend ${needed}`,
          bunkable: 0,
          needed,
          color: needed > 3 ? '#EF4444' : '#F59E0B', // Red if big shortage, Amber if 1-3
          bg: needed > 3 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
          borderColor: needed > 3 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'
        };
      }
    }
  }

  // Predefined vibrant palette matching Bunkr app
  const subjectColors = [
    '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B',
    '#EC4899', '#06B6D4', '#EF4444', '#14B8A6',
    '#6366F1', '#84CC16', '#F97316', '#A855F7'
  ];

  function getSubjectColor(indexOrString) {
    if (typeof indexOrString === 'number') {
      return subjectColors[indexOrString % subjectColors.length];
    }
    if (typeof indexOrString === 'string') {
      let hash = 0;
      for (let i = 0; i < indexOrString.length; i++) {
        hash = (hash << 5) - hash + indexOrString.charCodeAt(i);
        hash |= 0;
      }
      return subjectColors[Math.abs(hash) % subjectColors.length];
    }
    return subjectColors[0];
  }

    return {
    calculateBunkableClasses,
    calculateClassesNeeded,
    calculateBunkableDeficitOrSurplus,
    simulateWhatIf,
    getAttendanceStatus,
    getSubjectColor
  };
});
