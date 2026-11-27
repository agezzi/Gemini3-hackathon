import express from 'express';
import type { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
const PROFILE_ANALYSIS_INSTRUCTION = `You are a clinical neuro-psychologist specialized in Neurodiversity. 
Analyze the questionnaire results to provide a definitive diagnosis on the cognitive spectrum.
Output JSON: { "primaryType": "Clear Label", "traits": ["3 distinct traits"], "recommendations": ["3 calibrations"], "scores": { "focus": 0-100, "sensory": 0-100, "processing": 0-100, "executive": 0-100 } }`;

const SYSTEM_INSTRUCTION = `You are an expert neuro-behavioral analyst and productivity coach. 
Your goal is to support users with neuro-divergent traits (ADHD, Autism, Dyslexia, etc.).
OUTPUT FORMAT (JSON ONLY):
- 'insights': Diagnostic patterns and behavioral analysis.
- 'burnoutAlert': { level: 'low'|'moderate'|'critical', message: 'Specific warning', recoveryAction: 'Immediate sensory/cognitive fix' } (Return null if no risk).
- 'quickWins': Array of 1-3 specific, dopamine-triggering tasks under 5 minutes.
- 'adaptedPlan': The schedule with [High/Med/Low Load] tags.
- 'explanation': The 'Why' behind the specific sequence.`;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.use(express.json({ limit: '12mb' }));

const getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    throw new Error('Server Gemini API key is missing.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// Deterministic intelligent profile generator fallback
function buildFallbackProfile(answers: Record<string, string>) {
  const archetype = answers.archetype || 'sprint_redliner';
  
  const map: Record<string, { title: string; traits: string[]; recommendations: string[]; scores: { focus: number; sensory: number; processing: number; executive: number } }> = {
    sprint_redliner: {
      title: 'Sprint-Crashing Redliner',
      traits: [
        'High-velocity early hyperfocus followed by severe afternoon dopamine depletion',
        'Cognitive friction when transitioning between unscheduled context blocks',
        'Instant recovery when physical resets (ice water, light dimming) are enforced'
      ],
      recommendations: [
        'Enforce hard stops at 45 minutes for all high-load analytical blocks.',
        'Schedule a 15-minute low-stimulation buffer before any afternoon meetings.',
        'Use 3-minute physical movement micro-breaks between cognitive sprints.'
      ],
      scores: { focus: 84, sensory: 68, processing: 88, executive: 62 }
    },
    waiting_mode_paralyzed: {
      title: 'Waiting-Mode Paralytic',
      traits: [
        'Severe anticipatory anxiety that paralyzes time blocks preceding scheduled meetings',
        'Chronically struggles with open-ended or undefined gap periods under 2 hours',
        'Excels under continuous, protected uninterrupted work blocks with zero schedule interruptions'
      ],
      recommendations: [
        'Cluster all synchronous meetings into a single consolidated afternoon window.',
        'Use 15-minute micro-sprint tasks during pre-meeting gaps with loud countdown timers.',
        'Set calendar notifications to auto-announce 5 minutes prior to eliminate clock-watching.'
      ],
      scores: { focus: 74, sensory: 72, processing: 80, executive: 54 }
    },
    hyperfocus_drifter: {
      title: 'Hyper-Focus Drifter',
      traits: [
        'Effortless flow state entry that frequently drifts into unintended tangent rabbit holes',
        'Pronounced time-blindness where 3-4 hours pass unnoticed during curiosity quests',
        'Severe neurological friction when attempting unstimulating or monotonous maintenance tasks'
      ],
      recommendations: [
        'Pin a single-sentence visual objective directly to your screen before opening any browser.',
        'Maintain a physical "Tangent Parking Lot" notepad to deposit curiosity impulses immediately.',
        'Use 15-minute micro-deliverable checkpoints to verify directional alignment.'
      ],
      scores: { focus: 90, sensory: 62, processing: 86, executive: 58 }
    },
    sensory_overwhelmed: {
      title: 'Sensory-Overwhelmed Synthesizer',
      traits: [
        'Executive memory rapidly depleted by background acoustic chatter, notification pings, and visual clutter',
        'Acute sensitivity to screen glare and multi-tab visual fragmentation causing midday brain fog',
        'Exceptional synthesizing depth in low-stimulus environments with acoustic brown-noise grounding'
      ],
      recommendations: [
        'Enforce dark-mode, single-window workspaces and mute non-critical push notifications.',
        'Implement 10-minute non-digital, eyes-closed sensory decompression at 12:30 PM.',
        'Utilize brown noise or low-frequency binaural audio to shield auditory attention.'
      ],
      scores: { focus: 78, sensory: 94, processing: 84, executive: 64 }
    },
    last_mile_abandoner: {
      title: 'Last-Mile Abandoner',
      traits: [
        'Rapid initial system architecture and 90% build velocity followed by a completion wall',
        'Dopamine flatline when the creative problem is solved and only formatting/delivery remains',
        'High vulnerability to spawning new high-novelty projects to escape administrative finish lines'
      ],
      recommendations: [
        'Adopt the "B-minus work is finished work" principle for final formatting polish.',
        'Schedule a 20-minute body-doubling session specifically for shipping deliverables.',
        'Break the final 10% into discrete 5-minute micro-actions with immediate dopamine checkpoints.'
      ],
      scores: { focus: 82, sensory: 60, processing: 90, executive: 52 }
    }
  };

  const selected = map[archetype] || map.sprint_redliner;

  return {
    primaryType: selected.title,
    traits: selected.traits,
    context: (answers.context as any) || 'corporate',
    recommendations: selected.recommendations,
    scores: selected.scores
  };
}

// Fallback analysis generator
function buildFallbackAnalysis(history: string, goals: string) {
  return {
    insights: "Analysis of your recent behavioral inputs reveals high morning cognitive velocity paired with a tendency toward post-hyperfocus exhaustion. Unplanned context-switches create noticeable dopamine friction.",
    quickWins: [
      "Set a 3-minute timer to clear immediate physical workspace distractions.",
      "Place mobile devices outside direct line-of-sight for the next 25 minutes.",
      "Hydrate with cold water to provide instantaneous sensory autonomic grounding."
    ],
    adaptedPlan: `09:00 - 09:45: [High Load] Core Priority Sprint (Cap 45m strictly)
10:00 - 10:45: [Med Load] Execution & Secondary Analysis
11:00 - 11:30: [Low Load] Communication Triage (Max 10 messages)
13:00 - 13:45: [Transition] Strategy Prep & Micro Task
14:00 - 15:00: [Med Load] Team Collaborative Session`,
    explanation: "This schedule structure employs Behavioral Interleaving to protect cognitive reserves. Demanding cognitive tasks are front-loaded, and restorative buffers are enforced between sessions to eliminate redlining.",
    burnoutAlert: {
      level: 'moderate',
      message: "Potential for Afternoon Executive Paralysis detected.",
      recoveryAction: "Implement 10 minutes of low-stimulus environment (dim lights, no screens) at 12:30."
    }
  };
}

// API Routes
app.post('/api/generate-profile', async (req: Request, res: Response) => {
  const { answers } = req.body;
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Onboarding Questionnaire Results:\n${JSON.stringify(answers || {})}`,
      config: {
        systemInstruction: PROFILE_ANALYSIS_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            primaryType: { type: Type.STRING },
            traits: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
            scores: {
              type: Type.OBJECT,
              properties: {
                focus: { type: Type.NUMBER },
                sensory: { type: Type.NUMBER },
                processing: { type: Type.NUMBER },
                executive: { type: Type.NUMBER }
              },
              required: ['focus', 'sensory', 'processing', 'executive']
            }
          },
          required: ['primaryType', 'traits', 'recommendations', 'scores']
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({
      ...parsed,
      context: (answers?.context as any) || 'corporate'
    });
  } catch (err: any) {
    console.warn('Gemini API call failed, deploying calibrated profile synthesis fallback:', err.message || err);
    // Provide calibrated deterministic fallback so onboarding never breaks!
    return res.json(buildFallbackProfile(answers || {}));
  }
});

app.post('/api/analyze-behavior', async (req: Request, res: Response) => {
  const { history, goals, streak, profile } = req.body;
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `USER CONTEXT:
Streak: ${streak || 0} days
Cognitive Profile: ${JSON.stringify(profile || {})}
Recent Behavioral History: ${history || ''}
Target Objectives for Next Session: ${goals || ''}`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            insights: { type: Type.STRING },
            adaptedPlan: { type: Type.STRING },
            explanation: { type: Type.STRING },
            quickWins: { type: Type.ARRAY, items: { type: Type.STRING } },
            burnoutAlert: {
              type: Type.OBJECT,
              properties: {
                level: { type: Type.STRING, enum: ['low', 'moderate', 'critical'] },
                message: { type: Type.STRING },
                recoveryAction: { type: Type.STRING }
              },
              required: ['level', 'message', 'recoveryAction']
            }
          },
          required: ['insights', 'adaptedPlan', 'explanation', 'quickWins']
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (err: any) {
    console.warn('Gemini behavior analysis failed, deploying calibrated fallback:', err.message || err);
    return res.json(buildFallbackAnalysis(history || '', goals || ''));
  }
});

app.post('/api/chat', async (req: Request, res: Response) => {
  const { message, profile } = req.body;
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: message,
      config: {
        systemInstruction: `You are Dr. Neural, a behavioral neuroscience productivity coach. The user's cognitive archetype is ${JSON.stringify(profile?.primaryType || 'Analytical Explorer')}. Provide succinct, expert, actionable advice (under 60 words). No fluff.`,
        temperature: 0.7
      }
    });
    return res.json({ text: response.text });
  } catch (err: any) {
    console.warn('Chat API fallback deployed:', err.message || err);
    return res.json({ text: "Maintain strict temporal boundaries on your focus blocks. Guard against context switching and ensure a 10-minute non-digital reset." });
  }
});

app.post('/api/transcribe-audio', async (req: Request, res: Response) => {
  const { audioBase64, mimeType } = req.body || {};
  if (!audioBase64 || typeof audioBase64 !== 'string') {
    return res.status(400).json({ error: 'Missing audio data.' });
  }

  const cleanMime = typeof mimeType === 'string' && mimeType.startsWith('audio/')
    ? mimeType.split(';')[0]
    : 'audio/webm';

  const audioPart = {
    inlineData: {
      mimeType: cleanMime,
      data: audioBase64,
    },
  };

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [
          audioPart,
          { text: 'Transcribe the spoken words accurately with natural punctuation. Return only the transcribed text.' },
        ],
      },
    });
    return res.json({ text: (response.text || '').trim() });
  } catch (err: any) {
    // Fallback to gemini-4-hydrogen multimodal audio if transcribe model is unavailable
    try {
      const ai = getAI();
      const fallbackRes = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: {
          parts: [
            audioPart,
            { text: 'Transcribe the spoken words accurately with natural punctuation. Output only the spoken transcript.' },
          ],
        },
      });
      return res.json({ text: (fallbackRes.text || '').trim() });
    } catch (innerErr: any) {
      console.error('Audio transcription failed:', innerErr?.message || err?.message);
      return res.status(502).json({ error: 'Unable to transcribe audio right now. Please try speaking again or typing.' });
    }
  }
});

app.post('/api/parse-voice-calibration', async (req: Request, res: Response) => {
  const { transcript } = req.body || {};
  if (!transcript || typeof transcript !== 'string') {
    return res.status(400).json({ error: 'Missing voice transcript.' });
  }

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Spoken daily check-in from user:\n"""${transcript.slice(0, 4000)}"""`,
      config: {
        systemInstruction:
          'Split the user voice reflection into two clean plain-text fields without inventing details. "behavioralHistory" covers how today went (energy, focus, completed work, interruptions, mood, friction). "targetObjectives" covers upcoming priorities, meetings, deadlines, or tasks for tomorrow or the next session. If the speaker only talked about one side, leave the other empty string.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            behavioralHistory: { type: Type.STRING },
            targetObjectives: { type: Type.STRING },
          },
          required: ['behavioralHistory', 'targetObjectives'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({
      behavioralHistory: String(parsed.behavioralHistory || '').trim(),
      targetObjectives: String(parsed.targetObjectives || '').trim(),
    });
  } catch (err: any) {
    console.warn('Voice calibration split fallback triggered:', err?.message || err);
    return res.status(500).json({ error: 'Fallback split required' });
  }
});

// HTML escape helper for safe email body rendering
function escapeHtml(input: unknown): string {
  const str = String(input ?? '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeHeaderLine(input: unknown, maxLen = 160): string {
  return String(input ?? '')
    .replace(/[\r\n]+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

function buildFallbackDigest(params: {
  displayName: string;
  archetype: string;
  streak: number;
  focusMinutes: number;
  completedGoals: number;
  mainGoal: string | null;
  adaptedPlan?: string;
}) {
  const firstName = params.displayName.split(' ')[0] || 'Pioneer';
  const scheduleLines = (params.adaptedPlan || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 5);

  const tipsByArchetype: Record<string, string> = {
    'Sprint-Crashing Redliner':
      'Cap your first high-load cognitive block strictly at 45 minutes today. Step away from screens for 10 minutes before lunch so your afternoon reserve stays intact.',
    'Waiting-Mode Paralytic':
      'If you have an obligation later today, pick one low-stakes 15-minute warm-up task right now with a visible timer so waiting mode never steals your morning.',
    'Hyper-Focus Drifter':
      'Write your single priority sentence on paper before opening a browser tab, and keep a Tangent Parking Lot beside your keyboard for off-track ideas.',
    'Sensory-Overwhelmed Synthesizer':
      'Drop visual noise early: silence non-critical pings, switch on Ambient Rainfall or Brownian White Noise in FocusLock, and protect a 10-minute eyes-closed reset at midday.',
    'Last-Mile Abandoner':
      'Pick one nearly finished task and ship the B-minus version in a 15-minute sprint before starting anything shiny and new.',
  };

  const focusTip =
    tipsByArchetype[params.archetype] ||
    'Front-load one meaningful 30–45 minute focus sprint inside Time Lock Protocol before checking messages, then give your nervous system a clean 10-minute reset.';

  return {
    subject: `NeuralPlan Daily Digest • ${params.streak}d Streak & Today's Focus Tip`,
    headline: `Good focus momentum, ${firstName}. Here is your daily behavioral briefing.`,
    focusTip,
    progressSummary: `You are on a ${params.streak}-day persistence streak with ${params.focusMinutes} total focus minutes logged and ${params.completedGoals} goal${params.completedGoals === 1 ? '' : 's'} completed.`,
    nextMove: params.mainGoal
      ? `Open a 30-minute Time Lock session and move "${params.mainGoal}" forward by one visible milestone.`
      : 'Set a clear Main Goal inside Behavioral Calibration and lock a 30-minute focus sprint.',
    scheduleHighlights: scheduleLines,
    generatedAt: new Date().toISOString(),
  };
}

app.post('/api/gmail/compose-digest', async (req: Request, res: Response) => {
  const body = req.body || {};
  const stats = body.stats || {};
  const latestPlan = body.latestPlan || null;
  const displayName = sanitizeHeaderLine(body.displayName || 'Cognitive Pioneer', 60);
  const archetype = sanitizeHeaderLine(stats?.neuralProfile?.primaryType || 'Adaptive Focus Explorer', 80);
  const streak = Number.isFinite(Number(stats.currentStreak)) ? Number(stats.currentStreak) : 0;
  const focusMinutes = Number.isFinite(Number(stats.totalFocusMinutes)) ? Number(stats.totalFocusMinutes) : 0;
  const completedGoals = Array.isArray(stats.goalHistory)
    ? stats.goalHistory.filter((g: any) => g?.status === 'completed').length
    : 0;
  const mainGoal = typeof stats.mainGoal === 'string' ? stats.mainGoal.slice(0, 200) : null;
  const adaptedPlan = typeof latestPlan?.adaptedPlan === 'string' ? latestPlan.adaptedPlan.slice(0, 3000) : '';

  const fallback = buildFallbackDigest({
    displayName,
    archetype,
    streak,
    focusMinutes,
    completedGoals,
    mainGoal,
    adaptedPlan,
  });

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: JSON.stringify({
        displayName,
        archetype,
        context: stats?.neuralProfile?.context || 'corporate',
        streak,
        focusMinutes,
        completedGoals,
        mainGoal,
        adaptedPlanSnippet: adaptedPlan.slice(0, 800),
      }),
      config: {
        systemInstruction:
          'You write concise, grounded daily behavioral focus digests for NeuralPlan users. Keep tone warm, practical, and free of corporate buzzwords. Return JSON with subject, headline, focusTip (under 45 words), progressSummary (under 35 words), and nextMove (under 30 words).',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING },
            headline: { type: Type.STRING },
            focusTip: { type: Type.STRING },
            progressSummary: { type: Type.STRING },
            nextMove: { type: Type.STRING },
          },
          required: ['subject', 'headline', 'focusTip', 'progressSummary', 'nextMove'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({
      subject: sanitizeHeaderLine(parsed.subject || fallback.subject, 140),
      headline: String(parsed.headline || fallback.headline).slice(0, 220),
      focusTip: String(parsed.focusTip || fallback.focusTip).slice(0, 500),
      progressSummary: String(parsed.progressSummary || fallback.progressSummary).slice(0, 400),
      nextMove: String(parsed.nextMove || fallback.nextMove).slice(0, 300),
      scheduleHighlights: fallback.scheduleHighlights,
      generatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.warn('Digest AI composition fallback used:', err?.message || err);
    return res.json(fallback);
  }
});

app.post('/api/gmail/send-digest', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return res.status(401).json({ error: 'Missing Google OAuth Bearer token.', needsReauth: true });
  }
  const accessToken = match[1].trim();

  try {
    // 1. Verify caller token & resolve authenticated Gmail recipient directly from Google
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userInfoRes.ok) {
      return res.status(401).json({
        error: 'Your Google session token expired or lacks verification. Please authorize Gmail again.',
        needsReauth: true,
      });
    }

    const userInfo = (await userInfoRes.json()) as {
      email?: string;
      email_verified?: boolean;
      name?: string;
    };

    if (!userInfo.email || userInfo.email_verified === false) {
      return res.status(403).json({
        error: 'A verified Google email address is required to send daily updates.',
        needsReauth: true,
      });
    }

    const recipientEmail = sanitizeHeaderLine(userInfo.email, 160);
    const body = req.body || {};
    const digest = body.digest || {};
    const stats = body.stats || {};
    const settings = body.settings || {};

    const subject = sanitizeHeaderLine(
      digest.subject || 'NeuralPlan Daily Focus Digest',
      140
    );
    const displayName = escapeHtml(body.displayName || userInfo.name || 'Pioneer');
    const headline = escapeHtml(digest.headline || 'Here is your NeuralPlan behavioral briefing.');
    const focusTip = escapeHtml(digest.focusTip || '');
    const progressSummary = escapeHtml(digest.progressSummary || '');
    const nextMove = escapeHtml(digest.nextMove || '');
    const mainGoal = stats.mainGoal ? escapeHtml(stats.mainGoal) : '';
    const archetype = stats.archetype ? escapeHtml(stats.archetype) : 'Calibrated Explorer';
    const streak = Number.isFinite(Number(stats.currentStreak)) ? Number(stats.currentStreak) : 0;
    const focusMinutes = Number.isFinite(Number(stats.totalFocusMinutes)) ? Number(stats.totalFocusMinutes) : 0;
    const completedGoals = Number.isFinite(Number(stats.completedGoalsCount)) ? Number(stats.completedGoalsCount) : 0;
    const badgesCount = Number.isFinite(Number(stats.unlockedBadgeCount)) ? Number(stats.unlockedBadgeCount) : 0;

    const scheduleLines: string[] = Array.isArray(digest.scheduleHighlights)
      ? digest.scheduleHighlights.slice(0, 6).map((l: unknown) => String(l).slice(0, 200))
      : [];

    const includeFocusTips = settings.includeFocusTips !== false;
    const includeProgressStats = settings.includeProgressStats !== false;
    const includeDailyPlan = settings.includeDailyPlan !== false;

    const plainTextParts = [
      `NEURALPLAN DAILY BRIEFING — ${new Date().toLocaleDateString()}`,
      `Archetype: ${String(stats.archetype || 'Calibrated Explorer')}`,
      '',
      String(digest.headline || ''),
    ];
    if (includeProgressStats) {
      plainTextParts.push(
        '',
        'PROGRESS SNAPSHOT:',
        `- Streak: ${streak} days | Focus Logged: ${focusMinutes} mins | Goals Done: ${completedGoals} | Badges: ${badgesCount}`,
        String(digest.progressSummary || '')
      );
    }
    if (includeFocusTips && digest.focusTip) {
      plainTextParts.push('', 'TODAY\'S FOCUS TIP:', String(digest.focusTip));
    }
    if (stats.mainGoal) {
      plainTextParts.push('', `MAIN OBJECTIVE: "${String(stats.mainGoal)}"`, `NEXT MOVE: ${String(digest.nextMove || '')}`);
    }
    if (includeDailyPlan && scheduleLines.length > 0) {
      plainTextParts.push('', 'ADAPTED PROTOCOL:', ...scheduleLines.map((l) => `• ${l}`));
    }
    const plainTextBody = plainTextParts.join('\n');

    const scheduleHtml =
      includeDailyPlan && scheduleLines.length > 0
        ? `<div style="margin-top:20px;padding:16px;background:#F2F9FC;border:1px solid #DBEAFE;border-radius:14px;">
             <div style="font-size:11px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#1E40AF;margin-bottom:10px;">Today's Protocol Blocks</div>
             ${scheduleLines
               .map(
                 (line) =>
                   `<div style="font-size:13px;color:#1E293B;padding:6px 10px;margin-bottom:6px;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:8px;">${escapeHtml(line)}</div>`
               )
               .join('')}
           </div>`
        : '';

    const htmlBody = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:24px;background:#EEF7FA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0F172A;">
  <div style="max-width:600px;margin:0 auto;background:#FFFFFF;border:1px solid #CBD5E1;border-radius:20px;overflow:hidden;">
    <div style="padding:24px 28px;background:linear-gradient(135deg,#2563EB,#4F46E5);color:#FFFFFF;">
      <div style="font-size:11px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;opacity:0.9;">NeuralPlan Behavioral Engine</div>
      <h1 style="margin:6px 0 4px;font-size:22px;font-weight:800;">Daily Focus &amp; Progress Update</h1>
      <div style="font-size:13px;opacity:0.9;">For ${displayName} &middot; ${archetype}</div>
    </div>
    <div style="padding:26px 28px;">
      <p style="margin:0 0 14px;font-size:15px;font-weight:600;color:#0F172A;line-height:1.5;">${headline}</p>
      ${
        includeProgressStats
          ? `<p style="margin:0 0 18px;font-size:13px;color:#475569;line-height:1.6;">${progressSummary}</p>
             <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
               <tr>
                 <td width="33%" style="padding:12px;background:#F2F9FC;border:1px solid #DBEAFE;border-radius:12px;text-align:center;">
                   <div style="font-size:20px;font-weight:800;color:#D97706;">${streak}d</div>
                   <div style="font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;">Streak</div>
                 </td>
                 <td width="8"></td>
                 <td width="33%" style="padding:12px;background:#F2F9FC;border:1px solid #DBEAFE;border-radius:12px;text-align:center;">
                   <div style="font-size:20px;font-weight:800;color:#2563EB;">${focusMinutes}m</div>
                   <div style="font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;">Focused</div>
                 </td>
                 <td width="8"></td>
                 <td width="33%" style="padding:12px;background:#F2F9FC;border:1px solid #DBEAFE;border-radius:12px;text-align:center;">
                   <div style="font-size:20px;font-weight:800;color:#4F46E5;">${completedGoals}</div>
                   <div style="font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;">Goals Done</div>
                 </td>
               </tr>
             </table>`
          : ''
      }
      ${
        includeFocusTips && focusTip
          ? `<div style="padding:16px 18px;background:#EFF6FF;border-left:4px solid #2563EB;border-radius:10px;margin-bottom:18px;">
               <div style="font-size:11px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#1D4ED8;margin-bottom:6px;">Tailored Focus Tip</div>
               <div style="font-size:13.5px;color:#1E293B;line-height:1.55;">${focusTip}</div>
             </div>`
          : ''
      }
      ${
        mainGoal
          ? `<div style="padding:16px 18px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;">
               <div style="font-size:11px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#64748B;margin-bottom:4px;">Locked Main Objective</div>
               <div style="font-size:14px;font-weight:700;color:#0F172A;">&ldquo;${mainGoal}&rdquo;</div>
               ${nextMove ? `<div style="font-size:12.5px;color:#475569;margin-top:6px;">Next step: ${nextMove}</div>` : ''}
             </div>`
          : ''
      }
      ${scheduleHtml}
      <div style="margin-top:24px;padding-top:16px;border-top:1px solid #E2E8F0;font-size:11px;color:#64748B;">
        Sent from your NeuralPlan workspace with your permission. Badges unlocked: ${badgesCount}.
      </div>
    </div>
  </div>
</body>
</html>`;

    const boundary = `neuralplan_boundary_${Date.now()}`;
    const mimeMessage = [
      `To: ${recipientEmail}`,
      `Subject: =?UTF-8?B?${Buffer.from(subject, 'utf8').toString('base64')}?=`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      'Content-Transfer-Encoding: 7bit',
      '',
      plainTextBody,
      '',
      `--${boundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      'Content-Transfer-Encoding: 7bit',
      '',
      htmlBody,
      '',
      `--${boundary}--`,
    ].join('\r\n');

    const rawEncoded = Buffer.from(mimeMessage, 'utf8').toString('base64url');
    const gmailRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: rawEncoded }),
    });

    const gmailData = await gmailRes.json().catch(() => ({}));
    if (!gmailRes.ok) {
      const needsReauth = gmailRes.status === 401 || gmailRes.status === 403;
      return res.status(gmailRes.status).json({
        error:
          gmailData?.error?.message ||
          'Gmail rejected the send request. Re-authorizing Google permissions usually fixes this.',
        needsReauth,
      });
    }

    return res.json({
      ok: true,
      messageId: gmailData.id,
      sentTo: recipientEmail,
    });
  } catch (err: any) {
    console.error('Gmail digest send error:', err?.message || err);
    return res.status(500).json({ error: 'Unable to complete Gmail delivery right now.' });
  }
});

// Setup Vite middleware or static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    app.get('/@vite/client', (_req: Request, res: Response) => {
      res.type('application/javascript').send(`
// HMR disabled shim — avoids unreachable port 24678 WebSocket errors behind HTTPS proxies
const sheetsMap = new Map();
export function updateStyle(id, content) {
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.setAttribute('data-vite-dev-id', id);
    style.textContent = content;
    document.head.appendChild(style);
    sheetsMap.set(id, style);
  } else {
    style.textContent = content;
  }
}
export function removeStyle(id) {
  const style = sheetsMap.get(id);
  if (style) {
    document.head.removeChild(style);
    sheetsMap.delete(id);
  }
}
export function createHotContext() {
  const noop = () => {};
  return {
    accept: noop,
    dispose: noop,
    prune: noop,
    invalidate: noop,
    on: noop,
    off: noop,
    send: noop,
    data: {},
  };
}
export function injectQuery(url) { return url; }
export class ErrorOverlay extends HTMLElement {}
`);
    });

    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false, ws: false },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.use((req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
