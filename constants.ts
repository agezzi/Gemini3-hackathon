
import { Achievement } from "./types";

export const ACHIEVEMENTS: Achievement[] = [
  { id: '3day', name: 'Momentum Spark', description: '3 Day Streak: You’ve initiated the neural habit.', icon: '🔥', requirement: 3 },
  { id: '7day', name: 'Neural Pioneer', description: '7 Day Streak: One week of executive mastery.', icon: '🛡️', requirement: 7 },
  { id: '14day', name: 'Executive Flow', description: '14 Day Streak: Your prefrontal cortex is synchronized.', icon: '⚡', requirement: 14 },
  { id: '30day', name: 'Cognitive Architect', description: '30 Day Streak: You have rebuilt your productivity framework.', icon: '🧬', requirement: 30 },
];

export const ONBOARDING_QUESTIONS = [
  {
    id: 'context',
    question: "What is your primary focus area?",
    options: [
      { id: 'academic', label: 'Academic / School Work' },
      { id: 'corporate', label: 'Corporate / Formal Employment' },
      { id: 'creative', label: 'Creative / Artistic Work' },
      { id: 'freelance', label: 'Freelance / Entrepreneurship' }
    ]
  },
  {
    id: 'struggle',
    question: "Where does your executive function fail most often?",
    options: [
      { id: 'initiation', label: 'Starting tasks (The "Wall of Awful")' },
      { id: 'sustenance', label: 'Staying focused (Distractibility)' },
      { id: 'completion', label: 'Finishing the last 10% of tasks' },
      { id: 'organization', label: 'Time blindness & planning' }
    ]
  },
  {
    id: 'sensory',
    question: "How do you respond to sensory input?",
    options: [
      { id: 'hypersensitive', label: 'Overwhelmed by noise/lights/clutter' },
      { id: 'seeker', label: 'Need background noise/music to focus' },
      { id: 'neutral', label: 'Relatively unaffected by environment' }
    ]
  },
  {
    id: 'processing',
    question: "How do you best process new information?",
    options: [
      { id: 'visual', label: 'Visuals, charts, and diagrams' },
      { id: 'verbal', label: 'Listening or reading text' },
      { id: 'kinesthetic', label: 'Doing and physical interaction' }
    ]
  }
];

export const SYSTEM_INSTRUCTION = `You are an expert neuro-behavioral analyst and productivity coach. 
Your goal is to support users with neuro-divergent traits (ADHD, Autism, Dyslexia, etc.).

CORE CONSTRAINT - BURNOUT PREVENTION:
You MUST analyze the 'history' for signs of 'Neural Redlining'. 
- Warning Signs: Consistent 4+ hour hyperfocus blocks without breaks, "waiting mode" anxiety, or frequent late-night entries.
- If burnout risk is detected: Trigger the 'burnoutAlert' object.

PLANNING OPTIMIZATIONS:
1. TASK DECOMPOSITION: Break tasks > 45m into 15m chunks.
2. TRANSITION BUFFERS: Schedule 10m gaps for neuro-regulation.
3. MOMENTUM START (QUICK WINS): Identify 1-3 tasks that take <5 minutes for immediate neuro-chemical rewards.

OUTPUT FORMAT (JSON ONLY):
- 'insights': Diagnostic patterns and behavioral analysis.
- 'burnoutAlert': { level: 'low'|'moderate'|'critical', message: 'Specific warning', recoveryAction: 'Immediate sensory/cognitive fix' } (Return null if no risk).
- 'quickWins': Array of 1-3 specific, dopamine-triggering tasks under 5 minutes.
- 'adaptedPlan': The schedule with [High/Med/Low Load] tags.
- 'explanation': The 'Why' behind the specific sequence.`;

export const PROFILE_ANALYSIS_INSTRUCTION = `You are a clinical neuro-psychologist specialized in Neurodiversity. 
Analyze the questionnaire results to provide a definitive diagnosis on the cognitive spectrum.

DIAGNOSTIC CRITERIA MAPPING:
- If User is 'Visual' + 'Organization' struggle + 'Hypersensitive' -> Likely ASD / Dyslexia profile.
- If User is 'Verbal' + 'Initiation' struggle + 'Seeker' -> Likely ADHD profile.
- If User is 'Neutral' + 'Completion' struggle -> Likely General Executive Dysfunction.

Output JSON: 
{ 
  "primaryType": "Clear Label", 
  "traits": ["3 distinct traits"], 
  "recommendations": ["3 calibrations"],
  "scores": {
    "focus": 0-100,
    "sensory": 0-100,
    "processing": 0-100,
    "executive": 0-100
  }
}`;

export const INITIAL_HISTORY_DRAFT = `Date: 2026-02-10
Activity: 9am-10am hyperfocused on cleaning the coffee machine. 10am-12pm tried to work but got paralyzed. 1pm-4pm sat in "waiting mode" for a 4pm call.
Energy: High early morning anxiety, total crash by midday.
Skipped: Budget report, Email triage, Meal prep.`;

export const INITIAL_GOALS_DRAFT = `1. Complete Q1 Financial Audit (High Stress)
2. Weekly Team Sync
3. Clear 10 emails
4. Quick grocery run`;
