// ===== LOCK IN — Data Layer =====
// All localStorage read/write operations. Single source of truth for persistence.

export const DATA_KEYS = {
  PROFILE:   'lockin_profile',
  SURVEYS:   'lockin_weekly_surveys',
  SKILLS:    'lockin_skills',
  ONBOARDED: 'lockin_onboarded',
};

// ─── Date Helpers ────────────────────────────────────────────────────────────

export function formatDate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getTodayStr() {
  return formatDate(new Date());
}

export function dailyKey(dateStr) {
  return `lockin_daily_${dateStr}`;
}

export function getWeekStartDate(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  d.setDate(d.getDate() - day);
  return formatDate(d);
}

// ─── Profile ─────────────────────────────────────────────────────────────────

export function getProfile() {
  const raw = localStorage.getItem(DATA_KEYS.PROFILE);
  return raw ? JSON.parse(raw) : null;
}

export function saveProfile(updates) {
  const existing = getProfile() || {};
  const merged = { ...existing, ...updates };
  localStorage.setItem(DATA_KEYS.PROFILE, JSON.stringify(merged));
  return merged;
}

// ─── Daily Logs ──────────────────────────────────────────────────────────────

export function getDailyLog(dateStr) {
  const raw = localStorage.getItem(dailyKey(dateStr));
  return raw ? JSON.parse(raw) : null;
}

export function saveDailyLog(log) {
  // Ensure date field is always set
  const dateStr = log.date || getTodayStr();
  const full = { ...log, date: dateStr };
  localStorage.setItem(dailyKey(dateStr), JSON.stringify(full));
  return full;
}

export function getTodayLog() {
  return getDailyLog(getTodayStr());
}

/** Returns all daily logs sorted oldest → newest */
export function getAllDailyLogs() {
  return Object.keys(localStorage)
    .filter(k => k.startsWith('lockin_daily_'))
    .sort()
    .map(k => JSON.parse(localStorage.getItem(k)));
}

/**
 * Returns the last `days` daily logs (newest first).
 * Skips days with no log entry.
 */
export function getRecentDailyLogs(days = 30) {
  const result = [];
  const today = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const log = getDailyLog(formatDate(d));
    if (log) result.push(log);
  }
  return result;
}

// ─── Surveys ─────────────────────────────────────────────────────────────────

export function getSurveys() {
  const raw = localStorage.getItem(DATA_KEYS.SURVEYS);
  return raw ? JSON.parse(raw) : [];
}

export function saveSurvey(survey) {
  const surveys = getSurveys();
  const idx = surveys.findIndex(s => s.weekNumber === survey.weekNumber);
  if (idx >= 0) surveys[idx] = survey;
  else surveys.push(survey);
  localStorage.setItem(DATA_KEYS.SURVEYS, JSON.stringify(surveys));
}

export function getLatestSurvey() {
  const surveys = getSurveys();
  return surveys.length ? surveys[surveys.length - 1] : null;
}

export function getPreviousSurvey() {
  const surveys = getSurveys();
  return surveys.length >= 2 ? surveys[surveys.length - 2] : null;
}

export function getSurveyByWeek(weekNum) {
  return getSurveys().find(s => s.weekNumber === weekNum) || null;
}

// ─── Skills ──────────────────────────────────────────────────────────────────

export function getSkills() {
  const raw = localStorage.getItem(DATA_KEYS.SKILLS);
  return raw ? JSON.parse(raw) : [];
}

export function saveSkills(skills) {
  localStorage.setItem(DATA_KEYS.SKILLS, JSON.stringify(skills));
}

export function getCurrentWeekSkill() {
  const weekNum = getCurrentWeekNumber();
  return getSkills().find(s => s.weekNumber === weekNum) || null;
}

export function saveWeekSkill(skill) {
  const skills = getSkills();
  const idx = skills.findIndex(s => s.weekNumber === skill.weekNumber);
  if (idx >= 0) skills[idx] = skill;
  else skills.push(skill);
  saveSkills(skills);
}

// ─── Week Number ─────────────────────────────────────────────────────────────

/** Returns how many weeks the user has been using the app (starts at 1) */
export function getCurrentWeekNumber() {
  const profile = getProfile();
  if (!profile?.createdAt) return 1;
  const start = new Date(profile.createdAt);
  const now = new Date();
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  return Math.floor((now - start) / msPerWeek) + 1;
}

// ─── Onboarding ──────────────────────────────────────────────────────────────

export function isOnboarded() {
  return !!localStorage.getItem(DATA_KEYS.ONBOARDED);
}

export function setOnboarded() {
  localStorage.setItem(DATA_KEYS.ONBOARDED, '1');
}

// ─── Data Export & Reset ─────────────────────────────────────────────────────

export function exportAllData() {
  return JSON.stringify(
    {
      profile:   getProfile(),
      surveys:   getSurveys(),
      skills:    getSkills(),
      dailyLogs: getAllDailyLogs(),
      exportedAt: new Date().toISOString(),
    },
    null,
    2
  );
}

export function resetAllData() {
  Object.keys(localStorage)
    .filter(k => k.startsWith('lockin_'))
    .forEach(k => localStorage.removeItem(k));
}

// ─── Survey Due Check ─────────────────────────────────────────────────────────

/**
 * Returns true if a weekly survey is due.
 * Due on Sunday (or any day if no survey in the last 7 days).
 */
export function isSurveyDue() {
  const latest = getLatestSurvey();
  if (!latest) return isOnboarded(); // always due if never done one

  const lastDate = new Date(latest.completedAt);
  const now = new Date();
  const daysSinceLast = (now - lastDate) / (24 * 60 * 60 * 1000);

  return daysSinceLast >= 7;
}
