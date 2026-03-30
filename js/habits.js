// ===== LOCK IN — Habit Definitions & Streak Logic =====

import { getDailyLog, getAllDailyLogs, getProfile, formatDate, getTodayStr } from './data.js';

// ─── Category Definitions ────────────────────────────────────────────────────

export const CATEGORIES = {
  dopamine:  { label: 'Dopamine Control', icon: '🧠', color: '#ff6b6b', desc: 'Break the low-effort stimulation cycle' },
  knowledge: { label: 'Knowledge',        icon: '📚', color: '#ffd93d', desc: 'Feed your mind every single day' },
  health:    { label: 'Health',           icon: '💚', color: '#6bcb77', desc: 'Maximise sleep, diet & recovery' },
  youtube:   { label: 'YouTube',          icon: '🎥', color: '#ff4d4d', desc: 'Build your high-value channel' },
  rugby:     { label: 'Rugby',            icon: '🏉', color: '#4d79ff', desc: 'Sharpen your skills as a back' },
  strength:  { label: 'Strength',         icon: '💪', color: '#ff8c00', desc: 'Bulk, recover & get stronger' },
};

// ─── Habit Definitions ───────────────────────────────────────────────────────
//
//  phases: [1] = Phase-1 only (first 14 days of detox)
//          [2] = Phase-2 only (after 14 days)
//          [1,2] = both phases
//

export const HABIT_DEFS = [
  // ── Dopamine Control ──
  {
    id: 'noSocialMedia',
    cat: 'dopamine',
    label: 'No Social Media',
    icon: '🚫',
    phases: [1, 2],
    desc: 'Zero Instagram, TikTok, Twitter/X, YouTube Shorts, Snapchat all day.',
  },
  {
    id: 'noMusicOrTV',
    cat: 'dopamine',
    label: 'No Music or TV',
    icon: '🔇',
    phases: [1],
    desc: 'Phase 1 only — no music, Netflix, YouTube videos, or passive entertainment.',
  },

  // ── Knowledge ──
  {
    id: 'read20min',
    cat: 'knowledge',
    label: 'Read 20+ Minutes',
    icon: '📖',
    phases: [1, 2],
    desc: 'A real book (not articles/social). 20 minutes minimum — builds cognitive baseline.',
  },
  {
    id: 'studied',
    cat: 'knowledge',
    label: 'Quality Study Session',
    icon: '✏️',
    phases: [1, 2],
    desc: 'Focused school study with full attention — no phone, no distractions.',
  },
  {
    id: 'listenedPodcast',
    cat: 'knowledge',
    label: 'Educational Podcast',
    icon: '🎧',
    phases: [2],
    desc: 'Phase 2 only — a podcast that actually teaches you something useful.',
  },
  {
    id: 'practicedWeeklySkill',
    cat: 'knowledge',
    label: 'Practiced Weekly Skill',
    icon: '🎯',
    phases: [1, 2],
    desc: 'At least 15 minutes of deliberate practice on this week\'s skill.',
  },

  // ── Health ──
  {
    id: 'slept8hrs',
    cat: 'health',
    label: 'Slept 8+ Hours',
    icon: '😴',
    phases: [1, 2],
    desc: '8+ hours. Sleep is your #1 recovery & performance tool. Only 23% of teens hit this.',
  },
  {
    id: 'ateClean',
    cat: 'health',
    label: 'Ate Clean',
    icon: '🥗',
    phases: [1, 2],
    desc: 'No junk food, fast food, or excessive sugar today. High protein, whole foods.',
  },
  {
    id: 'drank2L',
    cat: 'health',
    label: 'Drank 2L+ Water',
    icon: '💧',
    phases: [1, 2],
    desc: 'Minimum 2 litres of water — dehydration tanks your focus and performance.',
  },
  {
    id: 'morningRoutine',
    cat: 'health',
    label: 'Morning Routine',
    icon: '🌅',
    phases: [1, 2],
    desc: 'Completed your full morning routine before school — sets the tone for everything.',
  },
  {
    id: 'nightRoutine',
    cat: 'health',
    label: 'Night Routine',
    icon: '🌙',
    phases: [1, 2],
    desc: 'Completed your full night routine including hygiene, journal, no screens before bed.',
  },
  {
    id: 'journaled',
    cat: 'health',
    label: 'Journaled',
    icon: '📓',
    phases: [1, 2],
    desc: 'Wrote in your journal — thoughts, wins, what you\'re grateful for, tomorrow\'s goal.',
  },
  {
    id: 'hygieneRoutine',
    cat: 'health',
    label: 'Hygiene Routine',
    icon: '🪥',
    phases: [1, 2],
    desc: 'Brushed teeth (morning + night), showered, and looked after yourself properly.',
  },

  // ── YouTube ──
  {
    id: 'workedOnYouTube',
    cat: 'youtube',
    label: 'Worked on YouTube',
    icon: '🎥',
    phases: [1, 2],
    desc: 'Scripting, filming, editing, thumbnail, or research. Every day compounds.',
  },

  // ── Rugby ──
  {
    id: 'rugbyIndependent',
    cat: 'rugby',
    label: 'Independent Practice (15-30 min)',
    icon: '🏉',
    phases: [1, 2],
    desc: 'Solo or with your brother: sprint work, footwork, catching high balls, passing accuracy.',
  },
  {
    id: 'rugbyClub',
    cat: 'rugby',
    label: 'Club Training',
    icon: '🏆',
    phases: [1, 2],
    desc: 'Attended and gave 100% at club training session.',
  },

  // ── Strength ──
  {
    id: 'gymSession',
    cat: 'strength',
    label: 'Gym Session',
    icon: '🏋️',
    phases: [1, 2],
    desc: 'Full gym workout completed. Mon-Fri consistency builds the base.',
  },
  {
    id: 'hitProtein',
    cat: 'strength',
    label: 'Hit 120g+ Protein',
    icon: '🥩',
    phases: [1, 2],
    desc: '120g+ daily protein at 60kg = 2g/kg. Non-negotiable for muscle growth.',
  },
  {
    id: 'caloricSurplus',
    cat: 'strength',
    label: 'Caloric Surplus',
    icon: '🍽️',
    phases: [1, 2],
    desc: 'Ate ~2,800-3,000 calories. You can\'t build muscle in a deficit.',
  },
];

// ─── Phase Logic ─────────────────────────────────────────────────────────────

/** Returns 1 (first 14 days) or 2 (after 14 days) based on detox start date */
export function getDetoxPhase() {
  const profile = getProfile();
  if (!profile?.dopamineDetoxStartDate) return 1;
  const start = new Date(profile.dopamineDetoxStartDate);
  const now = new Date();
  const daysSince = Math.floor((now - start) / (24 * 60 * 60 * 1000));
  return daysSince >= 14 ? 2 : 1;
}

/** Returns detailed dopamine detox status */
export function getDetoxStatus() {
  const profile = getProfile();
  if (!profile?.dopamineDetoxStartDate) {
    return { phase: 1, daysSinceStart: 0, daysRemainingPhase1: 14, started: false };
  }
  const start = new Date(profile.dopamineDetoxStartDate);
  const now = new Date();
  const daysSinceStart = Math.floor((now - start) / (24 * 60 * 60 * 1000));
  const phase = daysSinceStart >= 14 ? 2 : 1;
  const daysRemainingPhase1 = Math.max(0, 14 - daysSinceStart);

  return {
    phase,
    daysSinceStart,
    daysRemainingPhase1,
    started: true,
    milestone: getMilestone(daysSinceStart),
  };
}

function getMilestone(days) {
  if (days >= 30)  return { label: 'Baseline Reset', emoji: '🔥', reached: true };
  if (days >= 14)  return { label: 'Phase 2 Unlocked', emoji: '⚡', reached: true };
  if (days >= 7)   return { label: 'One Week Strong', emoji: '💪', reached: true };
  if (days >= 3)   return { label: 'First 3 Days', emoji: '✅', reached: true };
  return null;
}

/** Returns only habits that should be visible in the current detox phase */
export function getActiveHabits() {
  const phase = getDetoxPhase();
  return HABIT_DEFS.filter(h => h.phases.includes(phase));
}

// ─── Streak Logic ────────────────────────────────────────────────────────────

/**
 * Current streak for a specific habit.
 * Counts consecutive days (including today if checked).
 */
export function getStreak(habitId) {
  const today = new Date();
  let streak = 0;
  let d = new Date(today);

  // If today's habit is already checked, include today; otherwise start from yesterday
  const todayLog = getDailyLog(formatDate(today));
  if (!todayLog?.habits?.[habitId]) {
    d.setDate(d.getDate() - 1);
  }

  for (let i = 0; i < 3650; i++) { // max 10 years safety cap
    const log = getDailyLog(formatDate(d));
    if (!log || log.habits?.[habitId] !== true) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }

  return streak;
}

/**
 * All-time best streak for a specific habit.
 */
export function getBestStreak(habitId) {
  const logs = getAllDailyLogs(); // sorted oldest→newest
  let best = 0;
  let current = 0;
  let prevDate = null;

  for (const log of logs) {
    const date = new Date(log.date + 'T00:00:00');

    if (prevDate !== null) {
      const diffDays = Math.round((date - prevDate) / (24 * 60 * 60 * 1000));
      if (diffDays > 1) current = 0; // gap resets streak
    }

    if (log.habits?.[habitId] === true) {
      current++;
      if (current > best) best = current;
    } else {
      current = 0;
    }

    prevDate = date;
  }

  return best;
}

/**
 * Returns last `days` days as array of { date, completed, dayOfWeek }
 * for the calendar heatmap on the Habits view.
 */
export function getHabitCalendar(habitId, days = 35) {
  const result = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = formatDate(d);
    const log = getDailyLog(dateStr);
    result.push({
      date: dateStr,
      completed: log?.habits?.[habitId] === true,
      dayOfWeek: d.getDay(),
      isToday: dateStr === getTodayStr(),
    });
  }

  return result;
}

// ─── Overall Streak ──────────────────────────────────────────────────────────

/**
 * Consecutive days where ≥ 80% of active habits were completed.
 */
export function getOverallStreak() {
  let streak = 0;
  const today = new Date();
  const active = getActiveHabits();

  for (let i = 0; i <= 3650; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const log = getDailyLog(formatDate(d));

    if (!log) {
      if (i === 0) continue; // today not checked in yet — don't break
      break;
    }

    const completed = active.filter(h => log.habits?.[h.id] === true).length;
    const pct = active.length > 0 ? completed / active.length : 0;

    if (pct < 0.8) {
      if (i > 0) break; // allow today to not be perfect yet
    } else {
      streak++;
    }
  }

  return streak;
}

// ─── Today Completion ────────────────────────────────────────────────────────

export function getTodayCompletion() {
  const log = getDailyLog(getTodayStr());
  const active = getActiveHabits();
  if (!active.length) return { completed: 0, total: 0, pct: 0 };
  const completed = active.filter(h => log?.habits?.[h.id] === true).length;
  return {
    completed,
    total: active.length,
    pct: active.length > 0 ? Math.round((completed / active.length) * 100) : 0,
  };
}

// ─── Weekly Habit Score ──────────────────────────────────────────────────────

/**
 * Returns habit completion % for the current week (0-100).
 * @param {number} weeksAgo - 0 = this week, 1 = last week, etc.
 */
export function getWeeklyHabitScore(weeksAgo = 0) {
  const active = getActiveHabits();
  const today = new Date();
  let totalPossible = 0;
  let totalCompleted = 0;

  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - (weeksAgo * 7) - i);
    const log = getDailyLog(formatDate(d));
    if (!log) continue;
    totalPossible += active.length;
    totalCompleted += active.filter(h => log.habits?.[h.id] === true).length;
  }

  return totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;
}

// ─── Category Completion ─────────────────────────────────────────────────────

/** Returns completion % per category for today */
export function getTodayCategoryCompletion() {
  const log = getDailyLog(getTodayStr());
  const result = {};

  for (const catKey of Object.keys(CATEGORIES)) {
    const catHabits = getActiveHabits().filter(h => h.cat === catKey);
    if (!catHabits.length) { result[catKey] = null; continue; }
    const completed = catHabits.filter(h => log?.habits?.[h.id] === true).length;
    result[catKey] = Math.round((completed / catHabits.length) * 100);
  }

  return result;
}

// ─── Weekly History for Charts ───────────────────────────────────────────────

/** Returns weekly habit scores for the last `numWeeks` weeks */
export function getWeeklyHabitHistory(numWeeks = 12) {
  return Array.from({ length: numWeeks }, (_, i) => ({
    weeksAgo: i,
    score: getWeeklyHabitScore(i),
  })).reverse();
}
