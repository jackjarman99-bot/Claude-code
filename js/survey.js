// ===== LOCK IN — Weekly Survey =====
// Defines survey questions, validates answers, calculates percentiles on submit.

import { saveSurvey, getSurveys, getCurrentWeekNumber, getWeekStartDate } from './data.js';
import { calculatePercentiles, calculateOverallScore }                     from './scoring.js';
import { getWeeklyHabitScore }                                             from './habits.js';

// ─── Survey Question Definitions ─────────────────────────────────────────────

export const SURVEY_SECTIONS = [
  {
    id: 'strength',
    title: 'Strength',
    icon: '💪',
    desc: 'Enter your 1-rep max (or heaviest set of 3-5 reps). Be honest — these scores only matter to you.',
    questions: [
      {
        id: 'benchPress',
        label: 'Bench Press',
        hint: 'Heaviest weight you pressed this week (kg)',
        type: 'number',
        min: 0, max: 300, step: 2.5,
        unit: 'kg',
        required: false,
        scienceNote: 'Median 14yo male at 60kg: ~50kg. Top 25%: 63kg+',
      },
      {
        id: 'squat',
        label: 'Back Squat',
        hint: 'Heaviest weight you squatted this week (kg)',
        type: 'number',
        min: 0, max: 400, step: 2.5,
        unit: 'kg',
        required: false,
        scienceNote: 'Median 14yo male at 60kg: ~83kg. Top 25%: 111kg+',
      },
    ],
  },
  {
    id: 'sleep',
    title: 'Sleep',
    icon: '😴',
    desc: 'Sleep is the most underrated performance drug — free, legal, and more powerful than any supplement.',
    questions: [
      {
        id: 'avgSleepHours',
        label: 'Average Sleep Per Night',
        hint: 'Hours per night this week',
        type: 'number',
        min: 3, max: 14, step: 0.25,
        unit: 'hrs',
        required: true,
        scienceNote: 'Only 23% of teens sleep 8+ hrs. Getting 8+ puts you in top 23%.',
      },
      {
        id: 'sleepQuality',
        label: 'Sleep Quality',
        hint: 'How rested did you feel? (1 = terrible, 10 = perfect)',
        type: 'slider',
        min: 1, max: 10, step: 1,
        required: true,
      },
    ],
  },
  {
    id: 'diet',
    title: 'Diet & Nutrition',
    icon: '🥗',
    desc: 'Food is information for your body. Clean food → better mood, focus, recovery, and gains.',
    questions: [
      {
        id: 'dietQuality',
        label: 'Overall Diet Quality',
        hint: '1 = mostly junk, 10 = whole foods only',
        type: 'slider',
        min: 1, max: 10, step: 1,
        required: true,
      },
      {
        id: 'avgProteinG',
        label: 'Average Daily Protein',
        hint: 'Grams of protein per day (track for 1-2 days if unsure)',
        type: 'number',
        min: 0, max: 400, step: 5,
        unit: 'g/day',
        required: false,
        scienceNote: 'Target: 120-150g/day at 60kg. Most teens get ~60-80g.',
      },
      {
        id: 'junkFoodDays',
        label: 'Days with Junk Food',
        hint: 'Number of days this week you ate junk/fast food',
        type: 'number',
        min: 0, max: 7, step: 1,
        unit: 'days',
        required: false,
      },
    ],
  },
  {
    id: 'screenTime',
    title: 'Screen Time',
    icon: '📵',
    desc: 'Lower is almost always better. Average teen: 9+ hours per day.',
    questions: [
      {
        id: 'avgScreenTimeHours',
        label: 'Average Daily Screen Time',
        hint: 'Non-productive screen time (social media, YouTube, gaming, TV)',
        type: 'number',
        min: 0, max: 16, step: 0.5,
        unit: 'hrs/day',
        required: true,
        scienceNote: 'Under 2hrs/day puts you in the top 18% of males your age.',
      },
    ],
  },
  {
    id: 'knowledge',
    title: 'Knowledge',
    icon: '📚',
    desc: 'Your mind is a muscle. Daily reading and learning compound over years into an extraordinary edge.',
    questions: [
      {
        id: 'avgReadingMinutes',
        label: 'Average Daily Reading',
        hint: 'Minutes of real book reading per day this week',
        type: 'number',
        min: 0, max: 240, step: 5,
        unit: 'min/day',
        required: false,
        scienceNote: 'Average teen boy reads 34 min/day. 60+ min puts you in top 20%.',
      },
      {
        id: 'studySessions',
        label: 'Quality Study Sessions',
        hint: 'Number of focused (phone-free) study sessions this week',
        type: 'number',
        min: 0, max: 21, step: 1,
        unit: 'sessions',
        required: false,
      },
    ],
  },
  {
    id: 'rugby',
    title: 'Rugby',
    icon: '🏉',
    desc: 'Back-specific development — speed, footwork, catching, and decision-making.',
    questions: [
      {
        id: 'rugbySessionsCompleted',
        label: 'Independent Practice Sessions',
        hint: 'Solo/brother practice sessions completed this week (15+ min each)',
        type: 'number',
        min: 0, max: 7, step: 1,
        unit: 'sessions',
        required: false,
        scienceNote: '3+ independent sessions per week puts you in the top 35% of amateur backs your age.',
      },
      {
        id: 'rugbySkillRating',
        label: 'Self-Rated Rugby Skill',
        hint: 'How are your back skills progressing? (1-10)',
        type: 'slider',
        min: 1, max: 10, step: 1,
        required: false,
      },
    ],
  },
  {
    id: 'youtube',
    title: 'YouTube',
    icon: '🎥',
    desc: 'Consistency builds channels. One quality video per week = 52 videos per year.',
    questions: [
      {
        id: 'videoPosted',
        label: 'Posted a Video This Week?',
        hint: '',
        type: 'boolean',
        required: false,
      },
      {
        id: 'youtubeHoursWorked',
        label: 'Hours Worked on Channel',
        hint: 'Total hours scripting, filming, editing this week',
        type: 'number',
        min: 0, max: 40, step: 0.5,
        unit: 'hrs',
        required: false,
      },
    ],
  },
  {
    id: 'wellbeing',
    title: 'Wellbeing',
    icon: '🧘',
    desc: 'Mental state is the foundation of everything. Track it honestly to see the impact your habits have.',
    questions: [
      {
        id: 'moodAvg',
        label: 'Average Mood',
        hint: '1 = low / depressed, 10 = excellent / happy',
        type: 'slider',
        min: 1, max: 10, step: 1,
        required: true,
      },
      {
        id: 'selfEsteemAvg',
        label: 'Self-Esteem',
        hint: '1 = very low, 10 = strong and confident',
        type: 'slider',
        min: 1, max: 10, step: 1,
        required: true,
      },
      {
        id: 'energyAvg',
        label: 'Average Energy Level',
        hint: '1 = exhausted, 10 = full energy all day',
        type: 'slider',
        min: 1, max: 10, step: 1,
        required: true,
      },
    ],
  },
];

// ─── Build Empty Metrics Object ───────────────────────────────────────────────

export function buildEmptyMetrics() {
  const metrics = {};
  for (const section of SURVEY_SECTIONS) {
    for (const q of section.questions) {
      if (q.type === 'boolean') metrics[q.id] = false;
      else metrics[q.id] = 0;
    }
  }
  return metrics;
}

// ─── Validate Survey Metrics ──────────────────────────────────────────────────

export function validateMetrics(metrics) {
  const errors = [];
  for (const section of SURVEY_SECTIONS) {
    for (const q of section.questions) {
      if (!q.required) continue;
      const val = metrics[q.id];
      if (val === undefined || val === null || val === 0) {
        errors.push(`${section.title}: "${q.label}" is required`);
      }
    }
  }
  return errors; // empty = valid
}

// ─── Submit Survey ────────────────────────────────────────────────────────────

/**
 * Calculates percentiles and saves the completed survey.
 * @param {object} metrics - keyed by question id
 * @returns {object} - the saved survey object including percentiles + overall score
 */
export function submitSurvey(metrics) {
  const weekNum    = getCurrentWeekNumber();
  const habitPct   = getWeeklyHabitScore(0);
  const percentiles = calculatePercentiles(metrics, habitPct);
  const { score, percentile } = calculateOverallScore(percentiles);

  const survey = {
    weekNumber:   weekNum,
    weekStartDate: getWeekStartDate(),
    completedAt:  new Date().toISOString(),
    metrics,
    percentiles,
    overallScore: score,
    overallPercentile: percentile,
  };

  saveSurvey(survey);
  return survey;
}

// ─── Week-over-Week Delta ─────────────────────────────────────────────────────

/**
 * Returns { current, previous, delta } for each percentile metric.
 * Used to show trend arrows on the Rankings view.
 */
export function getSurveyDeltas() {
  const surveys = getSurveys();
  if (surveys.length < 1) return {};

  const cur  = surveys[surveys.length - 1]?.percentiles || {};
  const prev = surveys.length >= 2 ? (surveys[surveys.length - 2]?.percentiles || {}) : {};

  const result = {};
  for (const key of Object.keys(cur)) {
    result[key] = {
      current:  cur[key],
      previous: prev[key] ?? null,
      delta:    prev[key] != null ? cur[key] - prev[key] : null,
    };
  }

  return result;
}

// ─── Chart Data Helpers ───────────────────────────────────────────────────────

/** Returns weekly benchPress values for the line chart */
export function getBenchHistory() {
  return getSurveys().map(s => ({
    week:  s.weekNumber,
    value: s.metrics?.benchPress || null,
  }));
}

export function getSquatHistory() {
  return getSurveys().map(s => ({
    week:  s.weekNumber,
    value: s.metrics?.squat || null,
  }));
}

export function getSleepHistory() {
  return getSurveys().map(s => ({
    week:  s.weekNumber,
    value: s.metrics?.avgSleepHours || null,
  }));
}

export function getScoreHistory() {
  return getSurveys().map(s => ({
    week:  s.weekNumber,
    value: s.overallScore || null,
  }));
}

export function getScreenTimeHistory() {
  return getSurveys().map(s => ({
    week:  s.weekNumber,
    value: s.metrics?.avgScreenTimeHours ?? null,
  }));
}
