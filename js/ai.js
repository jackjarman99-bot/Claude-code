// ===== LOCK IN — AI Coach =====
//
// Supports two modes:
//   1. Rule-based: smart tips bank when no API key set
//   2. Claude API: personalized coaching via user's own Anthropic API key
//      (Direct browser → Anthropic API using CORS header)

import { getProfile, getRecentDailyLogs, getTodayStr } from './data.js';
import { getLatestSurvey, getCurrentWeekNumber } from './data.js';
import { getActiveHabits, getTodayCompletion, getDetoxStatus } from './habits.js';
import { calculatePercentiles, calculateOverallScore, getWeeklyHabitScore } from './scoring.js';

// ─── Claude API ──────────────────────────────────────────────────────────────

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL   = 'claude-haiku-4-5-20251001';

/**
 * Calls Claude API directly from the browser.
 * Requires user's Anthropic API key stored in profile.
 */
export async function callClaude(userMessage, systemPrompt = null) {
  const profile = getProfile();
  if (!profile?.apiKey) throw new Error('No API key set. Add your Claude API key in Settings.');

  const body = {
    model: CLAUDE_MODEL,
    max_tokens: 512,
    system: systemPrompt || buildSystemPrompt(),
    messages: [{ role: 'user', content: userMessage }],
  };

  const res = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': profile.apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(err?.error?.message || `API error: ${res.status}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text || '';
}

// ─── Context Builder ──────────────────────────────────────────────────────────

function buildSystemPrompt() {
  const profile = getProfile() || {};
  const detox   = getDetoxStatus();
  const survey  = getLatestSurvey();
  const weekNum = getCurrentWeekNumber();

  return `You are a personal coach for a 14-year-old male named ${profile.name || 'the user'}.
Their stats: ${profile.weight || 60}kg, ${profile.height || 167}cm, rugby back (winger/centre/fullback).
They are in Week ${weekNum} of their self-improvement journey.
Dopamine detox: Phase ${detox.phase}, Day ${detox.daysSinceStart} of the reset.

Their goals:
1. Fix dopamine baseline — dopamine detox (Phase 1: 14 days no social/music/TV; Phase 2: no social media)
2. Improve knowledge — daily reading, studying, educational podcasts, weekly skill
3. Optimise health — sleep 8+ hrs, clean diet, hydration, morning/night routines
4. Build YouTube channel — 1 high-quality 10-minute video per week
5. Improve rugby skills — 15-30 min independent back-specific practice daily
6. Get stronger — gym Mon-Fri, bulk at 2800-3000 cal, 120g+ protein

Latest weekly metrics: ${survey ? JSON.stringify(survey.metrics) : 'No survey yet'}

IMPORTANT COACHING PRINCIPLES:
- Be direct, encouraging, and specific. No fluff.
- Use science-backed advice.
- Keep responses under 150 words unless asked for more.
- Don't lecture about age or safety unless genuinely relevant.
- Treat them as a serious athlete and self-improver.
- Reference their specific goals and data when possible.`;
}

export function buildContextMessage() {
  const logs   = getRecentDailyLogs(7);
  const survey = getLatestSurvey();
  const comp   = getTodayCompletion();
  const habitPct = getWeeklyHabitScore(0);

  let ctx = `Current week habit score: ${habitPct}%\n`;
  ctx += `Today: ${comp.completed}/${comp.total} habits completed\n`;

  if (survey) {
    const p = calculatePercentiles(survey.metrics || {}, habitPct);
    const { score } = calculateOverallScore(p);
    ctx += `Lock In Score: ${score}/100\n`;
    ctx += `Latest metrics: bench ${survey.metrics?.benchPress || '?'}kg, squat ${survey.metrics?.squat || '?'}kg, sleep ${survey.metrics?.avgSleepHours || '?'}hrs\n`;
  }

  // Find weakest area
  const weak = findWeakestCategory(logs);
  if (weak) ctx += `Weakest area this week: ${weak}\n`;

  return ctx;
}

function findWeakestCategory(logs) {
  if (!logs.length) return null;
  const active = getActiveHabits();
  const catScores = {};

  for (const log of logs) {
    for (const habit of active) {
      if (!catScores[habit.cat]) catScores[habit.cat] = { done: 0, total: 0 };
      catScores[habit.cat].total++;
      if (log.habits?.[habit.id]) catScores[habit.cat].done++;
    }
  }

  let worstCat = null;
  let worstScore = Infinity;

  for (const [cat, { done, total }] of Object.entries(catScores)) {
    if (total === 0) continue;
    const score = done / total;
    if (score < worstScore) {
      worstScore = score;
      worstCat = cat;
    }
  }

  return worstCat;
}

// ─── Daily Coaching Message (AI-powered) ─────────────────────────────────────

export async function getDailyAIMessage() {
  const ctx = buildContextMessage();
  const prompt = `${ctx}\nGive me today's coaching message. Be specific, motivating, and direct. One key insight + one action I can take today.`;
  return callClaude(prompt);
}

// ─── Rule-Based Tips Bank ────────────────────────────────────────────────────
// 60+ science-backed tips organised by category.
// Used when no API key is set.

const TIPS_BANK = {
  dopamine: [
    "Every time you resist scrolling, your prefrontal cortex gets stronger. The urge peaks at 10 mins — outlast it.",
    "Your brain needs 3-4 weeks to reset dopamine receptors after heavy social media use. You're literally rewiring yourself right now.",
    "Replace the scroll reflex with a 60-second breathing exercise. Same timing, completely different neurochemical result.",
    "Boredom is not a problem — it's your brain begging for deep work. Sit with it for 5 minutes and something productive will emerge.",
    "Dopamine from achievement lasts hours. Dopamine from a TikTok lasts seconds. The maths is simple.",
    "Put your phone in another room when working or studying. Physical distance reduces usage by 40% (UCL research).",
    "Your brain can't tell the difference between a 'quick check' and a 30-minute scroll. There is no quick check.",
    "After 14 days of detox, foods taste better, music sounds better, and real life becomes more interesting. Hold on.",
    "The most dangerous thing about social media isn't the content — it's the unpredictable reward schedule. It's designed to be a slot machine.",
    "Phase 2 starts Day 14. You've earned music and TV back — but social media is gone for good if you want to perform at a high level.",
  ],

  knowledge: [
    "20 minutes of reading a day = 18+ books a year. Most adults read 0-2. You're building a serious edge.",
    "The best time to read is right before bed — your brain consolidates information during sleep, so you literally learn more.",
    "Active recall (testing yourself) is 3x more effective than re-reading. Close the book and recite what you learned.",
    "Learning a new skill each week compounds massively. 52 skills by the end of a year. In 5 years you're extraordinary.",
    "The most valuable thing you can do in school isn't memorise answers — it's learn how to learn. Focus on understanding, not grades.",
    "Take notes by hand, not on a phone. Writing activates deeper encoding (Mueller & Oppenheimer, 2014).",
    "Podcasts on walks are multiplied learning — you're getting both movement and mental input simultaneously.",
    "Your brain is most plastic between 12-25. Skills you build now stick harder than anything you'll learn as an adult. Invest heavily.",
    "Deliberate practice means practising the thing you can't do yet, not the thing you're already good at.",
    "Reading fiction improves empathy and social intelligence — skills that will massively help your YouTube channel and rugby leadership.",
  ],

  health: [
    "Sleep is the single most important performance variable you can control. 8 hrs of sleep adds more to your bench press than any supplement.",
    "Growth hormone peaks during deep sleep. If you want to grow bigger and stronger, sleep is literally part of the workout.",
    "At 14, your body needs 1,300 mg of calcium per day — that's 4-5 glasses of milk equivalent. Most teens get half that.",
    "Every hour of sleep under 8 increases injury risk by 1.7x (Milewski et al. study on young athletes). For a rugby player, sleep is safety.",
    "Journaling for 10 minutes before bed reduces anxiety and improves sleep quality by helping the brain 'close tabs'.",
    "Morning routines work because they remove decision fatigue from the start of the day — every decision costs mental energy.",
    "Drinking water first thing in the morning after sleep rehydrates your brain, which is ~75% water. Your first glass matters.",
    "Consistent bed and wake times (even weekends) dramatically improve sleep quality — your circadian rhythm runs on regularity.",
    "Cold showers increase dopamine by 250% for 2-3 hours (Shevchuk 2008). Best morning hack for free.",
    "Processed food is not just bad for your body — it creates inflammatory markers in the brain that reduce focus and mood.",
    "Your skin, hygiene, and grooming directly affect your self-esteem feedback loop. Taking care of yourself IS self-respect.",
    "Night routines matter as much as morning routines — they determine your sleep quality and tomorrow's starting energy.",
  ],

  youtube: [
    "One high-quality video per week beats 7 mediocre videos every time. Quality over quantity builds a real audience.",
    "The thumbnail is 80% of the click. Spend as much time on your thumbnail as you do on your video.",
    "Every video you post is a permanent asset on the internet. In 3 years, one of them could be getting 10,000 views/day.",
    "Study your favourite YouTube creators — reverse-engineer their hooks, structure, and why the first 30 seconds work.",
    "YouTube rewards watch time over views. The goal of every second is to keep them watching the next second.",
    "Your video idea doesn't need to be unique — it needs to be your take on something. Your perspective is the differentiator.",
    "Batch your work: script on Monday, film Tuesday, edit Wednesday-Thursday. Consistency comes from systems, not motivation.",
    "The first 30 seconds of your video will determine 80% of your retention rate. Nail the hook above all else.",
    "Comment on every comment in your first 100 videos. Community in the early days multiplies your growth rate.",
    "YouTube SEO: research keywords before filming. A great video on a searched topic beats a great video on a random one.",
  ],

  rugby: [
    "As a back, your most valuable asset is first-step explosive speed. 3x 10m acceleration sprints daily > 1 long run.",
    "Work on both hands. Most backs are weak off their left hand — that's the first thing to fix in your daily practice.",
    "High ball catching under pressure: throw the ball up, sprint 10m, catch at full speed. Do 10 reps every practice.",
    "Footwork beats pace. Practice the side-step, the goose-step, and the cut-back until they're automatic under pressure.",
    "Study the backs you want to play like on YouTube. Watch their feet, their body angle, their decision-making pre-contact.",
    "Catching rolling balls, awkward passes, and balls out of the sun is what separates backs in training. Practice the ugly stuff.",
    "Sprint work: the first 10 metres is where games are won. Practice standing starts, rolling starts, and direction-change sprints.",
    "Mental rehearsal works — before training, spend 2 minutes visualising yourself executing your skills perfectly.",
    "For fullbacks: your return kick positioning and communication defines your team's territory. Practise calling and judging the ball.",
    "Communication as a back is as important as skill — call early, call loud, call names. Practise making decisions vocally.",
    "Slalom runs between cones set 1m apart for 15m → improves footwork and balance simultaneously. Do 6 sets.",
    "Backwards running and changing direction is critical for defensive work as a back. Add 5 minutes to every practice.",
  ],

  strength: [
    "At 60kg, your daily protein target for maximum muscle growth is 120-150g. Track it this week and see where you actually are.",
    "Progressive overload is the only thing that matters in training. Add weight, add reps, or improve form — every single session.",
    "Compound lifts (squat, deadlift, bench, row) should be 80% of your gym time. Isolation work is the cherry on top.",
    "Growth hormone peaks 45-90 minutes into sleep. Eating ~40g of casein protein before bed can fuel overnight muscle synthesis.",
    "At 14, you're in one of the best hormonal windows of your life for building muscle. Take full advantage — be consistent.",
    "Sleep is your cheapest, most powerful anabolic tool. More important than any supplement.",
    "To bulk at 60kg you need ~2,800-3,000 calories/day. Most teens undereat without realising — track for one week.",
    "The bench press is a full-body movement — tight leg drive, arch, and retracted scapula adds 10-20% to your numbers.",
    "Squat depth matters — full depth (below parallel) activates more quad and glute muscle than half squats.",
    "Rest 2-3 minutes between heavy compound sets. Rushing rest reduces strength output by up to 20%.",
    "Creatine monohydrate (3-5g/day) is the most researched and effective legal supplement for strength. Worth considering once you've got diet nailed.",
    "Mobility work (10 minutes after training) prevents injury and improves squat and bench mechanics — most young athletes skip it.",
  ],
};

// ─── Rule-Based Tip Selector ──────────────────────────────────────────────────

/**
 * Returns a smart daily tip based on user data.
 * Rotates using day-of-year so it's consistent within a day but different each day.
 */
export function getDailyTip() {
  const logs   = getRecentDailyLogs(7);
  const cat    = findWeakestCategory(logs) || pickCategoryByDay();
  const tips   = TIPS_BANK[cat] || TIPS_BANK.health;

  // Use day of year + week number as deterministic seed
  const now     = new Date();
  const dayOfYr = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / (24 * 60 * 60 * 1000));
  const idx     = dayOfYr % tips.length;

  return { category: cat, tip: tips[idx] };
}

function pickCategoryByDay() {
  const cats  = Object.keys(TIPS_BANK);
  const today = new Date().getDay(); // 0-6
  return cats[today % cats.length];
}

// ─── Rugby Drill of the Day ────────────────────────────────────────────────────

const RUGBY_DRILLS = [
  {
    name: 'Bounding Sprint Circuit',
    duration: '15 min',
    desc: '5x 25m bounding sprints (max force per step, zigzag), 90s rest between sets. Focus on minimising ground contact time.',
  },
  {
    name: 'Slalom + Acceleration',
    duration: '15 min',
    desc: '6 cones, 1m apart. Slalom through at 70% pace, then explode for 20m at 100%. 8 reps. Builds footwork + first-step speed.',
  },
  {
    name: 'High Ball Practice',
    duration: '20 min',
    desc: 'Throw ball 10-15m high. Sprint 10m, catch at full speed. 15 reps. Rotate: catch on run, catch standing, catch with pressure from imaginary defender.',
  },
  {
    name: 'Both-Hands Passing Drill',
    duration: '15 min',
    desc: 'Stand 3m from wall. Pass off right hand 20x, then left hand 20x. Focus on spiral, wrist snap, hip rotation. Left hand only for last 20.',
  },
  {
    name: 'Explosive 10m Start Drill',
    duration: '20 min',
    desc: 'The first 10m wins or loses a try. From standing start: 10x 10m max sprints, 45s rest. Then 5x from a rolling start. Time yourself.',
  },
  {
    name: 'Footwork Ladder (no ladder needed)',
    duration: '15 min',
    desc: 'Mark 10 spots with shoes/cones, 0.5m apart. High knees through each, 8x each: one foot per box, two feet per box, lateral shuffle. 3 rounds.',
  },
  {
    name: 'Direction Change Sprint',
    duration: '20 min',
    desc: '3 cones in a line, 10m apart. Sprint to first → side-step → sprint to middle → cut-back → sprint to end at 100%. 6 reps each side.',
  },
];

export function getDrillOfDay() {
  const dayOfYr = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / (24 * 60 * 60 * 1000));
  return RUGBY_DRILLS[dayOfYr % RUGBY_DRILLS.length];
}

// ─── Weekly Skill Suggestions ─────────────────────────────────────────────────

export const WEEKLY_SKILLS = [
  // Cognitive/Creative
  { week: 1,  name: 'Touch Typing',         cat: 'cognitive', desc: 'Learn to type 60+ WPM without looking. Use keybr.com free.' },
  { week: 2,  name: 'Speed Reading',        cat: 'cognitive', desc: 'Double your reading speed with focus and reduced subvocalisation. Use Spreeder.' },
  { week: 3,  name: 'Chess Basics',         cat: 'cognitive', desc: 'Learn openings, endgames, tactics. Play on Chess.com — 3 games daily.' },
  { week: 4,  name: 'Public Speaking',      cat: 'social',    desc: 'Record yourself speaking on camera for 2 min daily. Critique and improve.' },
  { week: 5,  name: 'Basic Python Coding',  cat: 'tech',      desc: 'Complete Python basics on freeCodeCamp. Build one small script.' },
  { week: 6,  name: 'Personal Finance',     cat: 'finance',   desc: 'Learn budgeting, compound interest, and index investing basics.' },
  { week: 7,  name: 'Video Editing',        cat: 'creative',  desc: 'Master one editing technique per day in DaVinci Resolve (free).' },
  { week: 8,  name: 'Persuasive Writing',   cat: 'cognitive', desc: 'Write one persuasive essay daily. Learn PEEL structure + rhetorical devices.' },
  { week: 9,  name: 'Cooking Basics',       cat: 'practical', desc: 'Cook one high-protein meal from scratch daily. Master macros.' },
  { week: 10, name: 'Memory Techniques',    cat: 'cognitive', desc: 'Learn the method of loci + memory palace. Memorise a 50-card deck.' },
  { week: 11, name: 'Photography',          cat: 'creative',  desc: 'Learn rule of thirds, lighting, composition. Shoot 10 good photos daily.' },
  { week: 12, name: 'Negotiation Basics',   cat: 'social',    desc: 'Study Chriss Voss techniques. Practice in low-stakes daily conversations.' },
  { week: 13, name: 'Basic HTML/CSS',       cat: 'tech',      desc: 'Build a personal website from scratch. freeCodeCamp responsive design.' },
  { week: 14, name: 'Meditation',           cat: 'health',    desc: '15 min guided meditation daily. Use Waking Up app (free for students).' },
  { week: 15, name: 'Nutrition Science',    cat: 'health',    desc: 'Study macros, micros, timing. Apply to your diet and track for a week.' },
  { week: 16, name: 'Drawing Basics',       cat: 'creative',  desc: 'Draw from reference 20 min daily. drawabox.com is free and excellent.' },
  { week: 17, name: 'Debate Skills',        cat: 'social',    desc: 'Argue both sides of 3 topics per day. Record yourself. Build reasoning speed.' },
  { week: 18, name: 'Cold Calling/Pitching',cat: 'social',    desc: 'Practice your YouTube pitch, a product pitch, a personal intro. 5 min daily.' },
  { week: 19, name: 'Stoic Philosophy',     cat: 'mental',    desc: 'Read Meditations by Marcus Aurelius — 5 pages + 1 application daily.' },
  { week: 20, name: 'Excel/Spreadsheets',   cat: 'tech',      desc: 'Learn VLOOKUP, pivot tables, data visualisation. Hugely valuable skill.' },
  { week: 21, name: 'Body Language',        cat: 'social',    desc: 'Study Navarro\'s "What Every Body is Saying". Practise posture, eye contact.' },
  { week: 22, name: 'Journaling Frameworks',cat: 'mental',    desc: 'Explore Stoic journaling, gratitude journaling, and 5-year diary formats.' },
  { week: 23, name: 'Kicking Technique',    cat: 'rugby',     desc: 'Specific for backs: punt kick, drop kick, grubber. 20 kicks per type daily.' },
  { week: 24, name: 'Second Language',      cat: 'cognitive', desc: 'Start Spanish or French on Duolingo. 15 min/day. Builds neural pathways.' },
  { week: 25, name: 'Music Theory',         cat: 'creative',  desc: 'Learn notes, scales, chords. Use musictheory.net (free). 20 min daily.' },
  { week: 26, name: 'First Aid / CPR',      cat: 'practical', desc: 'Watch St John\'s CPR + first aid videos. Learn to save a life.' },
];

/** Returns the suggested skill for a given week number (cycles through the list) */
export function getSuggestedSkill(weekNum) {
  const idx = (weekNum - 1) % WEEKLY_SKILLS.length;
  return WEEKLY_SKILLS[idx];
}
