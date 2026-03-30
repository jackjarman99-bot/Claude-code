// ===== LOCK IN — Percentile Scoring Engine =====
//
// Research-based benchmarks for 14-year-old males (~60 kg / 5'6").
// Uses piecewise linear interpolation between anchor points.
//
// Sources: Legion Athletics strength standards, CDC sleep data,
//          Common Sense Media reading stats, AASM teen sleep guidelines.

import { getLatestSurvey, getPreviousSurvey, getSurveys } from './data.js';
import { getWeeklyHabitScore } from './habits.js';

// ─── Interpolation ───────────────────────────────────────────────────────────

/**
 * Piecewise linear interpolation.
 * @param {number} value
 * @param {Array<[number, number]>} points - [value, percentile] pairs.
 *   Points must be sorted by value ascending (percentile can go either direction).
 * @returns {number} percentile 1-99
 */
export function interpolate(value, points) {
  if (value <= points[0][0]) return points[0][1];
  if (value >= points[points.length - 1][0]) return points[points.length - 1][1];

  for (let i = 0; i < points.length - 1; i++) {
    const [v1, p1] = points[i];
    const [v2, p2] = points[i + 1];
    if (value >= v1 && value <= v2) {
      const t = (value - v1) / (v2 - v1);
      return Math.max(1, Math.min(99, Math.round(p1 + t * (p2 - p1))));
    }
  }

  return 50;
}

// ─── Benchmark Tables ────────────────────────────────────────────────────────
// Each entry: [metric value, percentile rank]
// Higher percentile = better (except screen time where lower time = higher percentile)

/** Bench Press — kg, 14yo male ~60kg bodyweight */
export const BENCH_POINTS = [
  [20,  5],
  [25, 10],
  [35, 20],
  [38, 25],
  [45, 35],
  [50, 50],
  [58, 65],
  [63, 75],
  [72, 85],
  [78, 90],
  [84, 95],
  [100, 99],
];

/** Squat — kg, 14yo male ~60kg bodyweight */
export const SQUAT_POINTS = [
  [35,  5],
  [50, 10],
  [58, 20],
  [66, 25],
  [75, 40],
  [83, 50],
  [95, 65],
  [111, 75],
  [122, 85],
  [132, 90],
  [144, 95],
  [160, 99],
];

/**
 * Sleep — hours/night.
 * Only 23% of 14-year-olds consistently sleep 8+ hrs (AASM data).
 * Most teens average ~6.5-7 hrs on school nights.
 */
export const SLEEP_POINTS = [
  [4.0,  2],
  [5.0,  8],
  [5.5, 12],
  [6.0, 20],
  [6.5, 35],
  [7.0, 50],
  [7.5, 65],
  [8.0, 77],
  [8.5, 88],
  [9.0, 95],
  [10.0, 99],
];

/**
 * Daily Reading — minutes/day.
 * Average teen boy reads ~34 min/day total; dedicated reading much less.
 */
export const READING_POINTS = [
  [0,  5],
  [5, 12],
  [10, 22],
  [15, 32],
  [20, 42],
  [30, 55],
  [34, 60],
  [45, 72],
  [60, 83],
  [90, 93],
  [120, 98],
];

/**
 * Screen Time — hours/day (lower = better percentile).
 * Average teen boy: ~9.3 hrs/day (Common Sense Media 2024).
 * Points sorted value ascending; percentile DECREASES as hours increase.
 */
export const SCREEN_TIME_POINTS = [
  [0.5, 99],
  [1.0, 95],
  [1.5, 90],
  [2.0, 83],
  [3.0, 70],
  [4.0, 55],
  [5.0, 40],
  [6.0, 28],
  [7.0, 18],
  [8.0, 10],
  [9.0,  5],
  [12.0, 1],
];

/** Diet Quality — self-reported 1-10 scale */
export const DIET_POINTS = [
  [1,  3],
  [2,  8],
  [3, 18],
  [4, 32],
  [5, 50],
  [6, 62],
  [7, 74],
  [8, 85],
  [9, 94],
  [10, 99],
];

/** Daily Protein — grams/day (target: 120g for 60kg at 2g/kg) */
export const PROTEIN_POINTS = [
  [40,  5],
  [60, 15],
  [80, 30],
  [100, 48],
  [120, 65],
  [140, 78],
  [160, 88],
  [180, 95],
  [200, 98],
];

/** Habit Completion % — percentage of active habits done that week */
export const HABIT_SCORE_POINTS = [
  [0,   2],
  [20, 10],
  [40, 25],
  [55, 40],
  [65, 55],
  [75, 68],
  [80, 78],
  [85, 85],
  [90, 92],
  [95, 96],
  [100, 99],
];

/** Rugby Sessions — independent practice sessions per week */
export const RUGBY_SESSIONS_POINTS = [
  [0,  10],
  [1,  25],
  [2,  45],
  [3,  65],
  [4,  80],
  [5,  90],
  [7,  97],
];

/** Sleep Quality — self-reported 1-10 */
export const SLEEP_QUALITY_POINTS = [
  [1, 3],
  [3, 15],
  [5, 40],
  [6, 55],
  [7, 68],
  [8, 80],
  [9, 91],
  [10, 98],
];

// ─── Individual Metric Percentiles ───────────────────────────────────────────

export function benchPercentile(kg)           { return interpolate(kg,   BENCH_POINTS); }
export function squatPercentile(kg)           { return interpolate(kg,   SQUAT_POINTS); }
export function sleepPercentile(hrs)          { return interpolate(hrs,  SLEEP_POINTS); }
export function readingPercentile(mins)       { return interpolate(mins, READING_POINTS); }
export function screenTimePercentile(hrs)     { return interpolate(hrs,  SCREEN_TIME_POINTS); }
export function dietPercentile(rating)        { return interpolate(rating, DIET_POINTS); }
export function proteinPercentile(g)          { return interpolate(g,    PROTEIN_POINTS); }
export function habitScorePercentile(pct)     { return interpolate(pct,  HABIT_SCORE_POINTS); }
export function rugbySessionsPercentile(n)    { return interpolate(n,    RUGBY_SESSIONS_POINTS); }
export function sleepQualityPercentile(r)     { return interpolate(r,    SLEEP_QUALITY_POINTS); }

// ─── Full Percentile Report from Survey ──────────────────────────────────────

/**
 * Calculates all percentiles from a survey object.
 * @param {object} metrics - survey.metrics
 * @param {number} weeklyHabitPct - 0-100
 * @returns {object} percentiles keyed by metric name
 */
export function calculatePercentiles(metrics, weeklyHabitPct = 50) {
  const p = {};

  if (metrics.benchPress > 0) p.benchPress = benchPercentile(metrics.benchPress);
  if (metrics.squat > 0)      p.squat = squatPercentile(metrics.squat);

  // Strength = avg of bench + squat (or whichever is available)
  const strengthVals = [p.benchPress, p.squat].filter(Boolean);
  if (strengthVals.length > 0) {
    p.strength = Math.round(strengthVals.reduce((a, b) => a + b, 0) / strengthVals.length);
  }

  if (metrics.avgSleepHours > 0)     p.sleep = sleepPercentile(metrics.avgSleepHours);
  if (metrics.sleepQuality > 0)      p.sleepQuality = sleepQualityPercentile(metrics.sleepQuality);
  if (metrics.dietQuality > 0)       p.diet = dietPercentile(metrics.dietQuality);
  if (metrics.avgProteinG > 0)       p.protein = proteinPercentile(metrics.avgProteinG);
  if (metrics.avgScreenTimeHours >= 0) p.screenTime = screenTimePercentile(metrics.avgScreenTimeHours);
  if (metrics.avgReadingMinutes > 0) p.reading = readingPercentile(metrics.avgReadingMinutes);
  if (metrics.rugbySessionsCompleted >= 0) {
    p.rugby = rugbySessionsPercentile(metrics.rugbySessionsCompleted);
  }

  p.habits = habitScorePercentile(weeklyHabitPct);

  return p;
}

// ─── Overall Lock In Score ────────────────────────────────────────────────────
//
// Weighted average of available percentiles.
// Weights reflect what matters most for this user's goals.
//

const WEIGHTS = {
  habits:     0.25,  // consistency is king
  sleep:      0.18,  // #1 recovery driver
  strength:   0.14,  // bench + squat combined
  screenTime: 0.14,  // dopamine baseline proxy
  diet:       0.10,  // health + bulk quality
  reading:    0.08,  // knowledge score
  rugby:      0.06,  // sport improvement
  protein:    0.05,  // strength support
};

/**
 * Returns 0-100 overall Lock In Score and overall percentile.
 * @param {object} percentiles - output of calculatePercentiles()
 * @returns {{ score: number, percentile: number }}
 */
export function calculateOverallScore(percentiles) {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const [key, weight] of Object.entries(WEIGHTS)) {
    const val = percentiles[key];
    if (val !== undefined && val !== null) {
      weightedSum += val * weight;
      totalWeight += weight;
    }
  }

  if (totalWeight === 0) return { score: 0, percentile: 50 };

  const percentile = Math.round(weightedSum / totalWeight);
  // Map percentile → 0-100 display score (same as percentile for simplicity)
  return { score: percentile, percentile };
}

// ─── Trend Arrow ─────────────────────────────────────────────────────────────

/**
 * Returns '↑', '↓', or '→' by comparing current vs previous survey percentile.
 */
export function getTrend(current, previous) {
  if (previous === undefined || previous === null) return '→';
  if (current > previous + 2) return '↑';
  if (current < previous - 2) return '↓';
  return '→';
}

// ─── Current Score (from latest survey + today's habit score) ────────────────

export function getCurrentScore() {
  const survey = getLatestSurvey();
  const habitPct = getWeeklyHabitScore(0);

  if (!survey) {
    // Before first survey: score purely on habits
    const p = { habits: habitScorePercentile(habitPct) };
    return calculateOverallScore(p);
  }

  const percentiles = calculatePercentiles(survey.metrics || {}, habitPct);
  return calculateOverallScore(percentiles);
}

// ─── Score Label ─────────────────────────────────────────────────────────────

export function getScoreLabel(score) {
  if (score >= 95) return { label: 'Elite',        color: '#ffd700' };
  if (score >= 85) return { label: 'Exceptional',  color: '#c0ff00' };
  if (score >= 75) return { label: 'Advanced',     color: '#00d4aa' };
  if (score >= 65) return { label: 'Strong',       color: '#6c63ff' };
  if (score >= 50) return { label: 'Above Average', color: '#4d79ff' };
  if (score >= 35) return { label: 'Building',     color: '#ffd93d' };
  if (score >= 20) return { label: 'Starting Out', color: '#ff8c00' };
  return                   { label: 'Locked Out',  color: '#ff4444' };
}

// ─── Metric Display Config ────────────────────────────────────────────────────

export const METRIC_CONFIG = {
  benchPress:   { label: 'Bench Press',    unit: 'kg',   icon: '🏋️', category: 'strength' },
  squat:        { label: 'Squat',          unit: 'kg',   icon: '🦵', category: 'strength' },
  strength:     { label: 'Strength',       unit: '',     icon: '💪', category: 'strength' },
  sleep:        { label: 'Sleep Duration', unit: 'hrs',  icon: '😴', category: 'health' },
  sleepQuality: { label: 'Sleep Quality',  unit: '/10',  icon: '🌙', category: 'health' },
  diet:         { label: 'Diet Quality',   unit: '/10',  icon: '🥗', category: 'health' },
  protein:      { label: 'Protein Intake', unit: 'g/day',icon: '🥩', category: 'strength' },
  screenTime:   { label: 'Screen Time',    unit: 'hrs',  icon: '📵', category: 'dopamine', lowerIsBetter: true },
  reading:      { label: 'Daily Reading',  unit: 'min',  icon: '📖', category: 'knowledge' },
  rugby:        { label: 'Rugby Sessions', unit: '/wk',  icon: '🏉', category: 'rugby' },
  habits:       { label: 'Habit Score',    unit: '%',    icon: '✅', category: 'habits' },
};

export function getPercentileColor(percentile) {
  if (percentile >= 90) return '#ffd700'; // gold
  if (percentile >= 75) return '#00d4aa'; // teal
  if (percentile >= 50) return '#6c63ff'; // purple
  if (percentile >= 25) return '#ffd93d'; // yellow
  return '#ff6b6b';                        // red
}

export function getPercentileLabel(p) {
  if (p >= 99) return 'Top 1%';
  if (p >= 95) return 'Top 5%';
  if (p >= 90) return 'Top 10%';
  if (p >= 75) return 'Top 25%';
  if (p >= 50) return `Top ${100 - p}%`;
  return `Bottom ${p}%`;
}
