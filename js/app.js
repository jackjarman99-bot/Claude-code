// ===== LOCK IN — Main App Controller =====
// Handles routing, view rendering, and all user interactions.

import {
  getProfile, saveProfile, isOnboarded, setOnboarded,
  getTodayLog, saveDailyLog, getTodayStr, formatDate,
  isSurveyDue, getCurrentWeekNumber, getCurrentWeekSkill,
  saveWeekSkill, exportAllData, resetAllData, getRecentDailyLogs,
} from './data.js';

import {
  HABIT_DEFS, CATEGORIES, getActiveHabits, getDetoxStatus,
  getDetoxPhase, getTodayCompletion, getStreak, getBestStreak,
  getHabitCalendar, getOverallStreak, getWeeklyHabitHistory,
} from './habits.js';

import {
  getCurrentScore, calculatePercentiles, calculateOverallScore,
  getScoreLabel, getPercentileColor, getPercentileLabel,
  METRIC_CONFIG, getTrend,
} from './scoring.js';

import {
  getDailyTip, getDrillOfDay, getSuggestedSkill,
  getDailyAIMessage, callClaude, buildContextMessage, WEEKLY_SKILLS,
} from './ai.js';

import {
  drawRing, drawLineChart, drawBarChart, drawScoreGauge, drawCalendarHeatmap,
} from './charts.js';

import {
  SURVEY_SECTIONS, buildEmptyMetrics, validateMetrics, submitSurvey,
  getSurveyDeltas, getBenchHistory, getSquatHistory,
  getSleepHistory, getScoreHistory, getScreenTimeHistory,
} from './survey.js';

import {
  getLatestSurvey, getPreviousSurvey, getSurveys,
} from './data.js';

import { getWeeklyHabitScore } from './habits.js';

// ─── App State ────────────────────────────────────────────────────────────────

const state = {
  currentView:   'home',
  surveyStep:    0,
  surveyMetrics: {},
  chatHistory:   [],
  chartRange:    12,
  aiLoading:     false,
};

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  if (!isOnboarded()) {
    showOnboarding();
  } else {
    showApp();
    navigate('home');
  }

  // Bottom nav clicks
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      if (view === 'more') { toggleDrawer(true); return; }
      navigate(view);
    });
  });

  // Drawer items
  document.querySelectorAll('.drawer-item').forEach(btn => {
    btn.addEventListener('click', () => {
      toggleDrawer(false);
      navigate(btn.dataset.view);
    });
  });

  // Backdrop closes drawer
  document.getElementById('drawer-backdrop').addEventListener('click', () => toggleDrawer(false));

  // Hash-based navigation (back button support)
  window.addEventListener('hashchange', () => {
    const view = location.hash.slice(1) || 'home';
    if (view !== state.currentView) renderView(view);
  });
});

// Expose public methods for inline HTML calls
window.app = {
  obNext: onboardingNext,
  obBack: onboardingBack,
  finishOnboarding,
  toggleHabit,
  submitCheckin,
  navigateTo: navigate,
  submitSurveyStep,
  prevSurveyStep,
  saveApiKey,
  saveSkillNotes,
  sendChat,
  setChartRange,
  exportData,
  confirmReset,
  startDetoxNow,
};

// ─── Navigation ───────────────────────────────────────────────────────────────

function navigate(view) {
  state.currentView = view;
  location.hash = view;
  setActiveNav(view);
  renderView(view);
  document.getElementById('content').scrollTop = 0;
}

function setActiveNav(view) {
  const mainViews = ['home', 'checkin', 'rankings', 'coach'];
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active',
      btn.dataset.view === view ||
      (btn.dataset.view === 'more' && !mainViews.includes(view))
    );
  });
}

function showApp() {
  document.getElementById('onboarding').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
}

function toggleDrawer(open) {
  document.getElementById('more-drawer').classList.toggle('open', open);
  document.getElementById('more-drawer').classList.toggle('hidden', false);
  document.getElementById('drawer-backdrop').classList.toggle('hidden', !open);
}

// ─── View Router ──────────────────────────────────────────────────────────────

function renderView(view) {
  const content = document.getElementById('content');
  switch (view) {
    case 'home':     content.innerHTML = renderHome();     afterHome();     break;
    case 'checkin':  content.innerHTML = renderCheckin();  afterCheckin();  break;
    case 'habits':   content.innerHTML = renderHabits();   afterHabits();   break;
    case 'rankings': content.innerHTML = renderRankings(); afterRankings(); break;
    case 'coach':    content.innerHTML = renderCoach();    afterCoach();    break;
    case 'progress': content.innerHTML = renderProgress(); afterProgress(); break;
    case 'skills':   content.innerHTML = renderSkills();   afterSkills();   break;
    case 'survey':   content.innerHTML = renderSurvey();   break;
    case 'settings': content.innerHTML = renderSettings(); break;
    default:         content.innerHTML = renderHome();     afterHome();
  }
}

// ─── Onboarding ───────────────────────────────────────────────────────────────

let obStep = 1;

function showOnboarding() {
  document.getElementById('onboarding').classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');
  // Set today as default detox start date
  const d = document.getElementById('ob-detox-date');
  if (d) d.value = getTodayStr();
}

function onboardingNext() {
  if (obStep === 2) {
    const name   = document.getElementById('ob-name')?.value?.trim();
    const weight = parseFloat(document.getElementById('ob-weight')?.value);
    const height = parseFloat(document.getElementById('ob-height')?.value);
    const dob    = document.getElementById('ob-dob')?.value;
    if (!name) { showToast('Please enter your name'); return; }
    saveProfile({ name, weight: weight || 60, height: height || 167, dob });
  }
  if (obStep === 3) {
    const detoxDate = document.getElementById('ob-detox-date')?.value || getTodayStr();
    saveProfile({ dopamineDetoxStartDate: detoxDate });
  }

  obStep = Math.min(obStep + 1, 4);
  updateObSteps();
}

function onboardingBack() {
  obStep = Math.max(obStep - 1, 1);
  updateObSteps();
}

function updateObSteps() {
  for (let i = 1; i <= 4; i++) {
    document.getElementById(`ob-step-${i}`)?.classList.toggle('hidden', i !== obStep);
    document.getElementById(`ob-dot-${i}`)?.classList.toggle('active', i === obStep);
  }
}

function finishOnboarding() {
  saveProfile({ createdAt: new Date().toISOString() });
  setOnboarded();
  showApp();
  navigate('home');
  showToast('Welcome to Lock In 🔒');
}

// ─── HOME / DASHBOARD ─────────────────────────────────────────────────────────

function renderHome() {
  const profile  = getProfile() || {};
  const name     = profile.name || 'Athlete';
  const detox    = getDetoxStatus();
  const comp     = getTodayCompletion();
  const streak   = getOverallStreak();
  const { score, percentile } = getCurrentScore();
  const scoreInfo = getScoreLabel(score);
  const tip      = getDailyTip();
  const surveyDue = isSurveyDue();

  const now  = new Date();
  const hour = now.getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  const milestones = [
    { label: '3 days',  days: 3  },
    { label: '1 week',  days: 7  },
    { label: '2 weeks', days: 14 },
    { label: '30 days', days: 30 },
  ].map(m => ({
    ...m,
    reached: detox.daysSinceStart >= m.days,
  }));

  const scienceDay = detox.daysSinceStart;
  const scienceMsg = scienceDay < 3
    ? 'The first 3 days are the hardest. Your brain is adjusting to lower stimulus.'
    : scienceDay < 7
    ? 'Day ' + scienceDay + ' — dopamine receptors are beginning to recalibrate. Urges will start to fade.'
    : scienceDay < 14
    ? 'Day ' + scienceDay + ' — focus and motivation are improving. Stay the course.'
    : scienceDay < 30
    ? 'Phase 2 active. No social media is your new permanent baseline. Music and TV in moderation.'
    : 'Day ' + scienceDay + ' — baseline reset complete. Real life is more rewarding now. Keep going.';

  return `
  <div class="view fade-in">
    <div class="home-greeting">
      <h2>${greet}, ${name} 💪</h2>
      <p>${dateStr} · Week ${getCurrentWeekNumber()}</p>
    </div>

    ${surveyDue ? `
    <div class="survey-nudge">
      <span>📋 Weekly survey is due!</span>
      <button onclick="window.app.navigateTo('survey')">Do it now</button>
    </div>` : ''}

    <!-- Dopamine Detox Card -->
    <div class="detox-card ${detox.phase === 2 ? 'phase-2' : ''}">
      <div class="detox-top">
        <span class="detox-phase-tag">Phase ${detox.phase} · Dopamine Reset</span>
      </div>
      <div class="detox-day-num">${detox.daysSinceStart}</div>
      <div class="detox-day-label">${
        detox.phase === 1
          ? `days in · ${detox.daysRemainingPhase1} days until Phase 2`
          : `days in · Phase 2 active`
      }</div>
      <div class="detox-milestones">
        ${milestones.map(m => `
          <span class="milestone ${m.reached ? 'reached' : 'pending'}">
            ${m.reached ? '✓' : '○'} ${m.label}
          </span>`).join('')}
      </div>
      <p class="detox-science-text">${scienceMsg}</p>
    </div>

    <!-- Today's Habits Ring -->
    <div class="today-card">
      <div class="ring-wrap">
        <canvas id="habit-ring" width="100" height="100"></canvas>
        <div class="ring-center">
          <span class="ring-num">${comp.completed}</span>
          <span class="ring-denom">/${comp.total}</span>
        </div>
      </div>
      <div class="today-info">
        <h3>Today's Habits</h3>
        <p>${comp.completed} of ${comp.total} done${comp.pct === 100 ? ' 🎉' : ''}</p>
        <button class="btn-primary" onclick="window.app.navigateTo('checkin')">
          ${comp.pct === 100 ? 'Edit Check-In' : 'Check In →'}
        </button>
      </div>
    </div>

    <!-- Stats Row -->
    <div class="stat-row">
      <div class="stat-chip">
        <div class="stat-chip-val">${streak}</div>
        <div class="stat-chip-label">🔥 Streak</div>
      </div>
      <div class="stat-chip">
        <div class="stat-chip-val" style="color:${scoreInfo.color}">${score}</div>
        <div class="stat-chip-label">Lock In Score</div>
      </div>
      <div class="stat-chip">
        <div class="stat-chip-val" style="color:${scoreInfo.color}">${getPercentileLabel(percentile)}</div>
        <div class="stat-chip-label">vs men your age</div>
      </div>
    </div>

    <!-- Daily Tip -->
    <div class="tip-card">
      <div class="tip-header">💡 ${CATEGORIES[tip.category]?.label || 'Coaching'} Tip</div>
      <p class="tip-text">${tip.tip}</p>
    </div>

    <!-- Quick Nav -->
    <div class="quick-grid">
      <button class="quick-tile" onclick="window.app.navigateTo('rankings')">
        <span class="quick-tile-icon">📊</span><span>Rankings</span>
      </button>
      <button class="quick-tile" onclick="window.app.navigateTo('habits')">
        <span class="quick-tile-icon">🔥</span><span>Streaks</span>
      </button>
      <button class="quick-tile" onclick="window.app.navigateTo('progress')">
        <span class="quick-tile-icon">📈</span><span>Progress</span>
      </button>
      <button class="quick-tile" onclick="window.app.navigateTo('skills')">
        <span class="quick-tile-icon">🎯</span><span>Skills</span>
      </button>
    </div>
  </div>`;
}

function afterHome() {
  const comp = getTodayCompletion();
  const canvas = document.getElementById('habit-ring');
  if (canvas) drawRing(canvas, comp.pct, comp.pct === 100 ? '#00d4aa' : '#6c63ff');
}

// ─── DAILY CHECK-IN ───────────────────────────────────────────────────────────

function renderCheckin() {
  const todayLog  = getTodayLog() || { habits: {} };
  const active    = getActiveHabits();
  const comp      = getTodayCompletion();
  const phase     = getDetoxPhase();
  const byCategory = {};

  for (const h of active) {
    if (!byCategory[h.cat]) byCategory[h.cat] = [];
    byCategory[h.cat].push(h);
  }

  const catOrder = ['dopamine', 'knowledge', 'health', 'youtube', 'rugby', 'strength'];

  let habitsHTML = '';
  for (const catKey of catOrder) {
    const catHabits = byCategory[catKey];
    if (!catHabits?.length) continue;
    const cat = CATEGORIES[catKey];
    const catDone = catHabits.filter(h => todayLog.habits[h.id]).length;

    habitsHTML += `
    <div class="cat-header">
      <span class="cat-dot" style="background:${cat.color}"></span>
      <span class="cat-header-label">${cat.icon} ${cat.label}</span>
      <span class="cat-progress">${catDone}/${catHabits.length}</span>
    </div>
    <div class="card">
      ${catHabits.map(h => `
        <div class="habit-item">
          <span class="habit-icon">${h.icon}</span>
          <div class="habit-info">
            <div class="habit-label">${h.label}</div>
            <div class="habit-desc">${h.desc}</div>
          </div>
          <button class="toggle habit-toggle ${todayLog.habits[h.id] ? 'on' : ''}"
            onclick="window.app.toggleHabit('${h.id}')"
            aria-label="Toggle ${h.label}"
            id="toggle-${h.id}">
          </button>
        </div>`).join('')}
    </div>`;
  }

  const isComplete = comp.pct === 100;

  return `
  <div class="view fade-in">
    <div class="checkin-header">
      <h2>Check In</h2>
      <span class="checkin-pct">${comp.pct}%</span>
    </div>

    <div class="checkin-progress">
      <div class="checkin-progress-label">
        <span>${comp.completed} of ${comp.total} habits</span>
        <span>${new Date().toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})}</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" id="checkin-fill" style="width:${comp.pct}%"></div>
      </div>
    </div>

    ${isComplete ? `
    <div class="checkin-complete card" style="margin-bottom:16px">
      <div class="complete-icon">🎉</div>
      <h3>All Habits Done!</h3>
      <p>You completed 100% today. That puts you ahead of most people your age. Keep the streak alive tomorrow.</p>
    </div>` : ''}

    ${habitsHTML}

    <div class="checkin-submit">
      <button class="btn-primary btn-full" onclick="window.app.submitCheckin()">
        ${isComplete ? '✅ Day Complete' : 'Save Check-In'}
      </button>
    </div>
  </div>`;
}

function toggleHabit(habitId) {
  const log = getTodayLog() || { date: getTodayStr(), habits: {}, completedAt: null };
  log.habits[habitId] = !log.habits[habitId];
  saveDailyLog(log);

  // Update toggle button
  const toggle = document.getElementById(`toggle-${habitId}`);
  if (toggle) toggle.classList.toggle('on', log.habits[habitId]);

  // Update progress
  const comp = getTodayCompletion();
  const fill = document.getElementById('checkin-fill');
  if (fill) fill.style.width = comp.pct + '%';
  const pctEl = document.querySelector('.checkin-pct');
  if (pctEl) pctEl.textContent = comp.pct + '%';
  const countEl = document.querySelector('.checkin-progress-label span');
  if (countEl) countEl.textContent = `${comp.completed} of ${comp.total} habits`;
}

function submitCheckin() {
  const log = getTodayLog() || { date: getTodayStr(), habits: {} };
  log.completedAt = new Date().toISOString();
  saveDailyLog(log);
  const comp = getTodayCompletion();
  showToast(comp.pct === 100 ? '🔥 Day complete! Streak alive.' : `✅ Saved — ${comp.pct}% done`);
  navigate('home');
}

function afterCheckin() {} // no async work needed

// ─── HABITS & STREAKS ─────────────────────────────────────────────────────────

function renderHabits() {
  const active = getActiveHabits();

  const cards = active.map(h => {
    const streak = getStreak(h.id);
    const best   = getBestStreak(h.id);
    const cat    = CATEGORIES[h.cat];
    return `
    <div class="habit-streak-card">
      <div class="habit-streak-top">
        <span class="habit-streak-icon">${h.icon}</span>
        <div class="habit-streak-info">
          <div class="habit-streak-name">${h.label}</div>
          <div class="habit-streak-cat" style="color:${cat.color}">${cat.label}</div>
        </div>
        <div class="habit-streak-nums">
          <span class="streak-current">${streak}</span>
          <span class="streak-best">Best: ${best}</span>
        </div>
      </div>
      <canvas class="heatmap-canvas" id="heatmap-${h.id}" height="48"></canvas>
    </div>`;
  }).join('');

  return `
  <div class="view fade-in">
    <div class="page-header">
      <span class="page-icon">🔥</span>
      <h2>Habits & Streaks</h2>
    </div>
    <p style="font-size:13px;color:var(--txt3);margin-bottom:16px">
      Overall streak (80%+ days): <strong style="color:var(--orange)">${getOverallStreak()} days</strong>
    </p>
    ${cards || '<div class="empty-state"><div class="empty-icon">🎯</div><p>Complete your first check-in to see streaks.</p></div>'}
  </div>`;
}

function afterHabits() {
  const active = getActiveHabits();
  for (const h of active) {
    const canvas = document.getElementById(`heatmap-${h.id}`);
    if (!canvas) continue;
    const days = getHabitCalendar(h.id, 35);
    const cat  = CATEGORIES[h.cat];
    drawCalendarHeatmap(canvas, days, cat.color);
  }
}

// ─── RANKINGS / PERCENTILE VIEW ───────────────────────────────────────────────

function renderRankings() {
  const survey   = getLatestSurvey();
  const habitPct = getWeeklyHabitScore(0);

  if (!survey) {
    return `
    <div class="view fade-in">
      <div class="page-header"><span class="page-icon">📊</span><h2>Rankings</h2></div>
      <div class="no-survey-card">
        <div style="font-size:48px">📋</div>
        <p>Complete your first weekly survey to see your percentile rankings vs men your age.</p>
        <button class="btn-primary btn-full" onclick="window.app.navigateTo('survey')">Do Weekly Survey →</button>
      </div>
    </div>`;
  }

  const percentiles = calculatePercentiles(survey.metrics || {}, habitPct);
  const { score, percentile } = calculateOverallScore(percentiles);
  const scoreInfo = getScoreLabel(score);
  const deltas    = getSurveyDeltas();

  const metricOrder = ['habits','sleep','strength','benchPress','squat','screenTime','diet','protein','reading','rugby'];

  const cards = metricOrder
    .filter(k => percentiles[k] !== undefined)
    .map(k => {
      const cfg    = METRIC_CONFIG[k];
      const pct    = percentiles[k];
      const color  = getPercentileColor(pct);
      const delta  = deltas[k];
      const trend  = delta?.delta != null
        ? (delta.delta > 2 ? '↑' : delta.delta < -2 ? '↓' : '→')
        : '→';
      const trendClass = trend === '↑' ? 'up' : trend === '↓' ? 'down' : 'flat';

      let valDisplay = '';
      if (k === 'benchPress') valDisplay = (survey.metrics?.benchPress || 0) + 'kg';
      else if (k === 'squat') valDisplay = (survey.metrics?.squat || 0) + 'kg';
      else if (k === 'sleep') valDisplay = (survey.metrics?.avgSleepHours || 0) + 'hrs';
      else if (k === 'screenTime') valDisplay = (survey.metrics?.avgScreenTimeHours || 0) + 'hrs';
      else if (k === 'diet') valDisplay = (survey.metrics?.dietQuality || 0) + '/10';
      else if (k === 'reading') valDisplay = (survey.metrics?.avgReadingMinutes || 0) + 'min';
      else if (k === 'protein') valDisplay = (survey.metrics?.avgProteinG || 0) + 'g';
      else if (k === 'rugby') valDisplay = (survey.metrics?.rugbySessionsCompleted || 0) + ' sessions';
      else if (k === 'habits') valDisplay = habitPct + '%';
      else if (k === 'strength') valDisplay = '';

      return `
      <div class="percentile-card" style="--accent-color:${color}">
        <span class="pct-trend ${trendClass}">${trend}</span>
        <div class="pct-icon">${cfg.icon}</div>
        <div class="pct-metric">${cfg.label}</div>
        ${valDisplay ? `<div class="pct-value">${valDisplay}</div>` : ''}
        <span class="pct-rank" style="background:${color}22;color:${color}">${getPercentileLabel(pct)}</span>
      </div>`;
    }).join('');

  return `
  <div class="view fade-in">
    <div class="page-header"><span class="page-icon">📊</span><h2>Rankings</h2></div>

    <div class="overall-score-card">
      <canvas id="score-gauge" style="width:100%;height:160px"></canvas>
      <div class="overall-label" style="color:${scoreInfo.color}">${scoreInfo.label}</div>
      <div class="overall-rank">${getPercentileLabel(percentile)} of men your age</div>
    </div>

    <div class="section-label">Breakdown by Category</div>
    <div class="percentile-grid">${cards}</div>

    <p style="font-size:11px;color:var(--txt3);text-align:center;padding:8px 0 16px">
      Week ${survey.weekNumber} · ${new Date(survey.completedAt).toLocaleDateString('en-GB')} ·
      <button class="btn-ghost" onclick="window.app.navigateTo('survey')">Update survey</button>
    </p>
  </div>`;
}

function afterRankings() {
  const canvas = document.getElementById('score-gauge');
  if (!canvas) return;
  const survey   = getLatestSurvey();
  const habitPct = getWeeklyHabitScore(0);
  if (!survey) return;
  const percentiles = calculatePercentiles(survey.metrics || {}, habitPct);
  const { score } = calculateOverallScore(percentiles);
  const scoreInfo = getScoreLabel(score);
  drawScoreGauge(canvas, score, scoreInfo.color);
}

// ─── AI COACH ─────────────────────────────────────────────────────────────────

function renderCoach() {
  const profile  = getProfile() || {};
  const hasKey   = !!profile.apiKey;
  const tip      = getDailyTip();
  const drill    = getDrillOfDay();

  const chatHTML = state.chatHistory.map(m => `
    <div class="chat-bubble ${m.role}">${m.content}</div>`).join('');

  return `
  <div class="view fade-in">
    <div class="coach-header">
      <div class="coach-avatar">🤖</div>
      <div class="coach-title">AI Coach</div>
      <div class="coach-sub">${hasKey ? 'Claude-powered · Personal coaching' : 'Rule-based tips · Add API key for full AI'}</div>
    </div>

    <!-- Daily tip (always shown) -->
    <div class="coach-message-card">
      <div class="card-title">TODAY'S INSIGHT — ${CATEGORIES[tip.category]?.label}</div>
      <p class="coach-msg-text">${tip.tip}</p>
    </div>

    <!-- Rugby drill -->
    <div class="drill-card">
      <div class="card-title" style="color:var(--teal)">🏉 TODAY'S RUGBY DRILL</div>
      <div class="drill-title">${drill.name}</div>
      <div class="drill-dur">⏱ ${drill.duration}</div>
      <div class="drill-desc">${drill.desc}</div>
    </div>

    ${hasKey ? `
    <!-- Full AI chat -->
    <div class="card" style="margin-bottom:12px">
      <div class="card-title">ASK YOUR COACH</div>
      <div class="coach-chat" id="chat-messages">${chatHTML}</div>
      ${state.aiLoading ? '<div class="spinner" style="margin:12px auto"></div>' : ''}
      <div class="chat-input-row">
        <input id="chat-input" type="text" placeholder="Ask anything about your training…"
          onkeydown="if(event.key==='Enter')window.app.sendChat()">
        <button class="chat-send" onclick="window.app.sendChat()">↑</button>
      </div>
    </div>
    <button class="btn-ghost" style="display:block;text-align:center;width:100%;margin-bottom:12px"
      onclick="window.app.navigateTo('settings')">⚙️ Manage API key</button>
    ` : `
    <!-- Unlock prompt -->
    <div class="api-unlock">
      <div style="font-size:32px">✨</div>
      <p>Add your free Claude API key to unlock personalised daily coaching, weekly analysis, and an AI chat interface trained on your habit data.</p>
      <button class="btn-primary" onclick="window.app.navigateTo('settings')">Add API Key →</button>
    </div>`}
  </div>`;
}

async function afterCoach() {
  if (!getProfile()?.apiKey || state.chatHistory.length > 0) return;
  // Auto-load daily AI message if key present
  state.aiLoading = true;
  const content = document.getElementById('content');
  try {
    const msg = await getDailyAIMessage();
    state.chatHistory.push({ role: 'coach', content: msg });
  } catch (e) {
    state.chatHistory.push({ role: 'coach', content: "Couldn't load AI message. Check your API key in Settings." });
  }
  state.aiLoading = false;
  if (state.currentView === 'coach') renderView('coach');
}

async function sendChat() {
  const input = document.getElementById('chat-input');
  const text  = input?.value?.trim();
  if (!text) return;
  input.value = '';

  state.chatHistory.push({ role: 'user', content: text });
  state.aiLoading = true;
  renderView('coach');

  try {
    const ctx   = buildContextMessage();
    const reply = await callClaude(`${ctx}\n\nUser question: ${text}`);
    state.chatHistory.push({ role: 'coach', content: reply });
  } catch (e) {
    state.chatHistory.push({ role: 'coach', content: `Error: ${e.message}` });
  }
  state.aiLoading = false;
  renderView('coach');

  // Scroll to bottom of chat
  setTimeout(() => {
    const msgs = document.getElementById('chat-messages');
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
  }, 50);
}

// ─── PROGRESS CHARTS ──────────────────────────────────────────────────────────

function renderProgress() {
  return `
  <div class="view fade-in">
    <div class="page-header"><span class="page-icon">📈</span><h2>Progress</h2></div>

    <div class="chart-range-row">
      ${[4,8,12].map(w => `
        <button class="chart-range-btn ${state.chartRange===w?'active':''}"
          onclick="window.app.setChartRange(${w})">${w}w</button>`).join('')}
    </div>

    <div class="chart-card">
      <h3>💪 Bench Press (kg)</h3>
      <canvas id="chart-bench" style="width:100%;height:160px"></canvas>
    </div>
    <div class="chart-card">
      <h3>🦵 Squat (kg)</h3>
      <canvas id="chart-squat" style="width:100%;height:160px"></canvas>
    </div>
    <div class="chart-card">
      <h3>🔒 Lock In Score</h3>
      <canvas id="chart-score" style="width:100%;height:160px"></canvas>
    </div>
    <div class="chart-card">
      <h3>✅ Habit Completion (%)</h3>
      <canvas id="chart-habits" style="width:100%;height:160px"></canvas>
    </div>
    <div class="chart-card">
      <h3>😴 Average Sleep (hrs)</h3>
      <canvas id="chart-sleep" style="width:100%;height:160px"></canvas>
    </div>
    <div class="chart-card">
      <h3>📵 Screen Time (hrs)</h3>
      <canvas id="chart-screen" style="width:100%;height:160px"></canvas>
    </div>
  </div>`;
}

function setChartRange(weeks) {
  state.chartRange = weeks;
  renderView('progress');
}

function afterProgress() {
  const n = state.chartRange;

  const bench  = getBenchHistory().slice(-n);
  const squat  = getSquatHistory().slice(-n);
  const scores = getScoreHistory().slice(-n);
  const sleep  = getSleepHistory().slice(-n);
  const screen = getScreenTimeHistory().slice(-n);
  const habits = getWeeklyHabitHistory(n);

  const weekLabels = (arr) => arr.map((_, i) => `W${i + 1}`);

  function tryDraw(id, series, labels, yUnit = '', yMin, yMax) {
    const c = document.getElementById(id);
    if (!c) return;
    drawLineChart(c, { series, labels, yUnit, yMin, yMax });
  }

  tryDraw('chart-bench', [{ label: 'Bench', data: bench.map(d => d.value), color: '#ff8c00' }],
    weekLabels(bench), 'kg', 0);
  tryDraw('chart-squat', [{ label: 'Squat', data: squat.map(d => d.value), color: '#4d79ff' }],
    weekLabels(squat), 'kg', 0);
  tryDraw('chart-score', [{ label: 'Score', data: scores.map(d => d.value), color: '#6c63ff' }],
    weekLabels(scores), '', 0, 100);
  tryDraw('chart-sleep', [{ label: 'Sleep', data: sleep.map(d => d.value), color: '#00d4aa' }],
    weekLabels(sleep), 'h', 4, 12);
  tryDraw('chart-screen',[{ label: 'Screen', data: screen.map(d => d.value), color: '#ff6b6b' }],
    weekLabels(screen), 'h', 0);

  const habitC = document.getElementById('chart-habits');
  if (habitC) {
    drawBarChart(habitC, {
      labels: habits.map((_, i) => `W${i + 1}`),
      values: habits.map(w => w.score),
      colors: habits.map(w => w.score >= 80 ? '#6c63ff' : w.score >= 60 ? '#ffd93d' : '#ff6b6b'),
      maxVal: 100,
    });
  }
}

// ─── WEEKLY SKILLS ────────────────────────────────────────────────────────────

function renderSkills() {
  const weekNum     = getCurrentWeekNumber();
  const suggested   = getSuggestedSkill(weekNum);
  const currentSkill = getCurrentWeekSkill() || { weekNumber: weekNum, skill: suggested.name, notes: '', completed: false };
  const allSkills   = WEEKLY_SKILLS.slice(0, weekNum).reverse();

  return `
  <div class="view fade-in">
    <div class="page-header"><span class="page-icon">🎯</span><h2>Weekly Skills</h2></div>

    <div class="skill-current-card">
      <div class="skill-week-label">Week ${weekNum} · Current Skill</div>
      <div class="skill-name">${currentSkill.skill}</div>
      <div class="skill-cat">${suggested.cat}</div>
      <div class="skill-desc">${suggested.desc}</div>
      <label class="form-label">Notes / Progress</label>
      <textarea class="form-input skill-notes" id="skill-notes" rows="3"
        placeholder="What did you practise? What improved?">${currentSkill.notes || ''}</textarea>
      <div style="display:flex;gap:10px;margin-top:10px">
        <button class="btn-primary" style="flex:2" onclick="window.app.saveSkillNotes()">Save Notes</button>
        <button class="btn-secondary" style="flex:1"
          onclick="window.app.markSkillDone()">${currentSkill.completed ? '✅ Done' : 'Mark Done'}</button>
      </div>
    </div>

    <div class="section-label">Skill Library (${Math.min(weekNum - 1, WEEKLY_SKILLS.length)} completed)</div>
    <div class="card">
      ${allSkills.slice(1).map(s => `
        <div class="skill-history-item">
          <span class="skill-week-num">W${allSkills.indexOf(s) + 2}</span>
          <span class="skill-history-name">${s.name}</span>
          <span class="skill-done-badge">✅</span>
        </div>`).join('') || '<p style="color:var(--txt3);font-size:13px;padding:8px 0">Skills you complete each week will appear here.</p>'}
    </div>
  </div>`;
}

function saveSkillNotes() {
  const weekNum = getCurrentWeekNumber();
  const notes   = document.getElementById('skill-notes')?.value || '';
  const suggested = getSuggestedSkill(weekNum);
  const existing  = getCurrentWeekSkill() || { weekNumber: weekNum, skill: suggested.name, completed: false };
  saveWeekSkill({ ...existing, notes });
  showToast('Notes saved ✅');
}

window.app.markSkillDone = function() {
  const weekNum  = getCurrentWeekNumber();
  const suggested = getSuggestedSkill(weekNum);
  const existing  = getCurrentWeekSkill() || { weekNumber: weekNum, skill: suggested.name, notes: '' };
  saveWeekSkill({ ...existing, completed: true });
  showToast('Skill marked complete 🎯');
  renderView('skills');
};

function afterSkills() {}

// ─── WEEKLY SURVEY ────────────────────────────────────────────────────────────

function renderSurvey() {
  const sections = SURVEY_SECTIONS;
  const total    = sections.length;
  const step     = state.surveyStep;
  const section  = sections[step];
  const metrics  = state.surveyMetrics;

  return `
  <div class="view fade-in">
    <div class="page-header"><span class="page-icon">📋</span><h2>Weekly Survey</h2></div>
    <p style="font-size:13px;color:var(--txt3);margin-bottom:12px">
      Week ${getCurrentWeekNumber()} · Section ${step + 1} of ${total}
    </p>

    <div class="survey-progress-bar">
      <div class="progress-bar">
        <div class="progress-fill" style="width:${((step + 1) / total) * 100}%"></div>
      </div>
    </div>

    <div class="survey-section-card">
      <div class="survey-section-header">
        <span class="survey-section-icon">${section.icon}</span>
        <div>
          <div class="survey-section-title">${section.title}</div>
          <div class="survey-section-desc">${section.desc}</div>
        </div>
      </div>

      ${section.questions.map(q => renderSurveyQuestion(q, metrics)).join('')}
    </div>

    <div class="survey-nav">
      ${step > 0 ? `<button class="btn-secondary" style="flex:1" onclick="window.app.prevSurveyStep()">← Back</button>` : ''}
      <button class="btn-primary" style="flex:2" onclick="window.app.submitSurveyStep()">
        ${step === total - 1 ? 'Submit & See Results →' : 'Next →'}
      </button>
    </div>
  </div>`;
}

function renderSurveyQuestion(q, metrics) {
  const val = metrics[q.id];
  if (q.type === 'slider') {
    const cur = val || Math.round((q.min + q.max) / 2);
    return `
    <div class="survey-q">
      <div class="survey-q-label">${q.label}</div>
      <div class="survey-q-hint">${q.hint}</div>
      <div class="slider-wrap">
        <input type="range" min="${q.min}" max="${q.max}" step="${q.step}" value="${cur}"
          id="sq-${q.id}"
          oninput="document.getElementById('sv-${q.id}').textContent=this.value;window._surveyUpdate('${q.id}',+this.value)">
        <span class="slider-val" id="sv-${q.id}">${cur}</span>
      </div>
    </div>`;
  }
  if (q.type === 'boolean') {
    return `
    <div class="survey-q">
      <div class="survey-q-label">${q.label}</div>
      <div class="bool-row">
        <button class="bool-btn ${val === true ? 'selected-yes' : ''}"
          onclick="window._surveyUpdate('${q.id}',true);this.classList.add('selected-yes');this.nextElementSibling.classList.remove('selected-no')">
          ✅ Yes
        </button>
        <button class="bool-btn ${val === false && val !== undefined ? 'selected-no' : ''}"
          onclick="window._surveyUpdate('${q.id}',false);this.classList.add('selected-no');this.previousElementSibling.classList.remove('selected-yes')">
          ❌ No
        </button>
      </div>
    </div>`;
  }
  // number
  return `
  <div class="survey-q">
    <div class="survey-q-label">${q.label}</div>
    <div class="survey-q-hint">${q.hint}</div>
    <div style="display:flex;align-items:center;gap:8px">
      <input class="form-input" type="number" min="${q.min}" max="${q.max}" step="${q.step}"
        value="${val || ''}" placeholder="0" id="sq-${q.id}"
        oninput="window._surveyUpdate('${q.id}',+this.value)"
        style="flex:1">
      ${q.unit ? `<span style="color:var(--txt3);font-size:13px;white-space:nowrap">${q.unit}</span>` : ''}
    </div>
    ${q.scienceNote ? `<div class="survey-q-science">📊 ${q.scienceNote}</div>` : ''}
  </div>`;
}

window._surveyUpdate = function(id, val) {
  state.surveyMetrics[id] = val;
};

function submitSurveyStep() {
  // Collect any inputs in the DOM into state
  SURVEY_SECTIONS[state.surveyStep].questions.forEach(q => {
    const el = document.getElementById(`sq-${q.id}`);
    if (!el) return;
    if (q.type === 'boolean') return; // handled inline
    state.surveyMetrics[q.id] = q.type === 'number' ? parseFloat(el.value) || 0 : parseFloat(el.value) || 0;
  });

  if (state.surveyStep < SURVEY_SECTIONS.length - 1) {
    state.surveyStep++;
    renderView('survey');
    document.getElementById('content').scrollTop = 0;
  } else {
    // Final submit
    const result = submitSurvey(state.surveyMetrics);
    state.surveyStep    = 0;
    state.surveyMetrics = {};
    showToast('📊 Survey complete! Rankings updated.');
    navigate('rankings');
  }
}

function prevSurveyStep() {
  if (state.surveyStep > 0) {
    state.surveyStep--;
    renderView('survey');
    document.getElementById('content').scrollTop = 0;
  }
}

// ─── SETTINGS ────────────────────────────────────────────────────────────────

function renderSettings() {
  const profile = getProfile() || {};
  const masked  = profile.apiKey
    ? profile.apiKey.slice(0, 10) + '••••••••••••'
    : '';

  return `
  <div class="view fade-in">
    <div class="page-header"><span class="page-icon">⚙️</span><h2>Settings</h2></div>

    <!-- Profile -->
    <div class="settings-section">
      <div class="settings-section-title">Profile</div>
      <div class="card">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Name</label>
            <input class="form-input" id="set-name" value="${profile.name || ''}" placeholder="Your name">
          </div>
          <div class="form-group">
            <label class="form-label">Weight (kg)</label>
            <input class="form-input" id="set-weight" type="number" value="${profile.weight || 60}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Height (cm)</label>
            <input class="form-input" id="set-height" type="number" value="${profile.height || 167}">
          </div>
          <div class="form-group">
            <label class="form-label">Detox Start</label>
            <input class="form-input" id="set-detox" type="date" value="${profile.dopamineDetoxStartDate || getTodayStr()}">
          </div>
        </div>
        <button class="btn-primary btn-full" onclick="window.app.saveProfile()">Save Profile</button>
      </div>
    </div>

    <!-- AI API Key -->
    <div class="settings-section">
      <div class="settings-section-title">AI Coach (Claude API)</div>
      <div class="card">
        <p style="font-size:13px;color:var(--txt2);margin-bottom:12px;line-height:1.6">
          Add your Anthropic API key to unlock personalised AI coaching. Your key is stored only on this device and sent directly to Anthropic — never via a server.
          <br><br>
          Get a free key at <strong>console.anthropic.com</strong>
        </p>
        <label class="form-label">API Key</label>
        <div class="api-key-input-wrap">
          <input class="form-input" id="set-apikey" type="password"
            placeholder="sk-ant-api03-..." value="${profile.apiKey || ''}">
          <button class="api-key-save" onclick="window.app.saveApiKey()">Save</button>
        </div>
        ${profile.apiKey ? `<p style="font-size:12px;color:var(--teal);margin-top:8px">✅ API key set — AI coaching active</p>` : ''}
      </div>
    </div>

    <!-- Detox Reset -->
    <div class="settings-section">
      <div class="settings-section-title">Dopamine Detox</div>
      <div class="card">
        <p style="font-size:13px;color:var(--txt2);margin-bottom:12px">
          Start the dopamine detox from today (resets the day counter to 0).
        </p>
        <button class="btn-secondary btn-full" onclick="window.app.startDetoxNow()">🔄 Restart Detox from Today</button>
      </div>
    </div>

    <!-- Install guide -->
    <div class="settings-section">
      <div class="settings-section-title">Install as Phone App</div>
      <div class="install-guide">
        <div class="install-step"><span class="install-step-num">1</span><span><strong>iPhone (Safari):</strong> Tap the Share button at the bottom of Safari, then tap "Add to Home Screen", then "Add".</span></div>
        <div class="install-step"><span class="install-step-num">2</span><span><strong>Android (Chrome):</strong> Tap the three-dot menu in Chrome, then tap "Install App" or "Add to Home Screen".</span></div>
        <div class="install-step"><span class="install-step-num">3</span><span>The Lock In icon will appear on your home screen. Open it — it runs fullscreen with no browser bar.</span></div>
        <div class="install-step"><span class="install-step-num">4</span><span>All your data is saved in your phone's browser storage and works offline.</span></div>
      </div>
    </div>

    <!-- Data -->
    <div class="settings-section">
      <div class="settings-section-title">Data</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        <button class="btn-secondary btn-full" onclick="window.app.exportData()">📤 Export All Data (JSON)</button>
      </div>
    </div>

    <!-- Danger -->
    <div class="settings-section danger-zone">
      <div class="settings-section-title" style="color:var(--red)">Danger Zone</div>
      <button class="btn-secondary btn-full" style="color:var(--red);border-color:rgba(255,107,107,0.3)"
        onclick="window.app.confirmReset()">🗑️ Reset All Data</button>
    </div>

    <div style="height:24px"></div>
  </div>`;
}

window.app.saveProfile = function() {
  const name   = document.getElementById('set-name')?.value?.trim();
  const weight = parseFloat(document.getElementById('set-weight')?.value);
  const height = parseFloat(document.getElementById('set-height')?.value);
  const detox  = document.getElementById('set-detox')?.value;
  if (!name) { showToast('Name cannot be empty'); return; }
  saveProfile({ name, weight: weight || 60, height: height || 167, dopamineDetoxStartDate: detox });
  showToast('Profile saved ✅');
};

function saveApiKey() {
  const key = document.getElementById('set-apikey')?.value?.trim();
  saveProfile({ apiKey: key });
  showToast(key ? '🔑 API key saved — AI coaching active' : 'API key removed');
  renderView('settings');
}

function startDetoxNow() {
  if (!confirm('Reset dopamine detox counter to today?')) return;
  saveProfile({ dopamineDetoxStartDate: getTodayStr() });
  showToast('🧠 Detox restarted from today');
  renderView('settings');
}

function exportData() {
  const json = exportAllData();
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `lockin-export-${getTodayStr()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('📤 Export downloaded');
}

function confirmReset() {
  if (!confirm('This will delete ALL your data permanently. Are you sure?')) return;
  if (!confirm('Last chance — delete everything?')) return;
  resetAllData();
  obStep = 1;
  state.chatHistory   = [];
  state.surveyMetrics = {};
  state.surveyStep    = 0;
  showToast('Data reset');
  setTimeout(() => location.reload(), 800);
}

// ─── TOAST ────────────────────────────────────────────────────────────────────

let toastTimer = null;
function showToast(msg, duration = 2800) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove('show');
  }, duration);
}
