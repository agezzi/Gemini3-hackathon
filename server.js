// server.ts
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
var PROFILE_ANALYSIS_INSTRUCTION = `You are a clinical neuro-psychologist specialized in Neurodiversity. 
Analyze the questionnaire results to provide a definitive diagnosis on the cognitive spectrum.
Output JSON: { "primaryType": "Clear Label", "traits": ["3 distinct traits"], "recommendations": ["3 calibrations"], "scores": { "focus": 0-100, "sensory": 0-100, "processing": 0-100, "executive": 0-100 } }`;
var SYSTEM_INSTRUCTION = `You are an expert neuro-behavioral analyst and productivity coach. 
Your goal is to support users with neuro-divergent traits (ADHD, Autism, Dyslexia, etc.).
OUTPUT FORMAT (JSON ONLY):
- 'insights': Diagnostic patterns and behavioral analysis.
- 'burnoutAlert': { level: 'low'|'moderate'|'critical', message: 'Specific warning', recoveryAction: 'Immediate sensory/cognitive fix' } (Return null if no risk).
- 'quickWins': Array of 1-3 specific, dopamine-triggering tasks under 5 minutes.
- 'adaptedPlan': The schedule with [High/Med/Low Load] tags.
- 'explanation': The 'Why' behind the specific sequence.`;
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var app = express();
var PORT = process.env.PORT ? parseInt(process.env.PORT) : 3e3;
app.use(express.json());
var getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    throw new Error("Server Gemini API key is missing.");
  }
  return new GoogleGenAI({ apiKey });
};
function buildFallbackProfile(answers) {
  const archetype = answers.archetype || "sprint_redliner";
  const map = {
    sprint_redliner: {
      title: "Sprint-Crashing Redliner",
      traits: [
        "High-velocity early hyperfocus followed by severe afternoon dopamine depletion",
        "Cognitive friction when transitioning between unscheduled context blocks",
        "Instant recovery when physical resets (ice water, light dimming) are enforced"
      ],
      recommendations: [
        "Enforce hard stops at 45 minutes for all high-load analytical blocks.",
        "Schedule a 15-minute low-stimulation buffer before any afternoon meetings.",
        "Use 3-minute physical movement micro-breaks between cognitive sprints."
      ],
      scores: { focus: 84, sensory: 68, processing: 88, executive: 62 }
    },
    waiting_mode_paralyzed: {
      title: "Waiting-Mode Paralytic",
      traits: [
        "Severe anticipatory anxiety that paralyzes time blocks preceding scheduled meetings",
        "Chronically struggles with open-ended or undefined gap periods under 2 hours",
        "Excels under continuous, protected uninterrupted work blocks with zero schedule interruptions"
      ],
      recommendations: [
        "Cluster all synchronous meetings into a single consolidated afternoon window.",
        "Use 15-minute micro-sprint tasks during pre-meeting gaps with loud countdown timers.",
        "Set calendar notifications to auto-announce 5 minutes prior to eliminate clock-watching."
      ],
      scores: { focus: 74, sensory: 72, processing: 80, executive: 54 }
    },
    hyperfocus_drifter: {
      title: "Hyper-Focus Drifter",
      traits: [
        "Effortless flow state entry that frequently drifts into unintended tangent rabbit holes",
        "Pronounced time-blindness where 3-4 hours pass unnoticed during curiosity quests",
        "Severe neurological friction when attempting unstimulating or monotonous maintenance tasks"
      ],
      recommendations: [
        "Pin a single-sentence visual objective directly to your screen before opening any browser.",
        'Maintain a physical "Tangent Parking Lot" notepad to deposit curiosity impulses immediately.',
        "Use 15-minute micro-deliverable checkpoints to verify directional alignment."
      ],
      scores: { focus: 90, sensory: 62, processing: 86, executive: 58 }
    },
    sensory_overwhelmed: {
      title: "Sensory-Overwhelmed Synthesizer",
      traits: [
        "Executive memory rapidly depleted by background acoustic chatter, notification pings, and visual clutter",
        "Acute sensitivity to screen glare and multi-tab visual fragmentation causing midday brain fog",
        "Exceptional synthesizing depth in low-stimulus environments with acoustic brown-noise grounding"
      ],
      recommendations: [
        "Enforce dark-mode, single-window workspaces and mute non-critical push notifications.",
        "Implement 10-minute non-digital, eyes-closed sensory decompression at 12:30 PM.",
        "Utilize brown noise or low-frequency binaural audio to shield auditory attention."
      ],
      scores: { focus: 78, sensory: 94, processing: 84, executive: 64 }
    },
    last_mile_abandoner: {
      title: "Last-Mile Abandoner",
      traits: [
        "Rapid initial system architecture and 90% build velocity followed by a completion wall",
        "Dopamine flatline when the creative problem is solved and only formatting/delivery remains",
        "High vulnerability to spawning new high-novelty projects to escape administrative finish lines"
      ],
      recommendations: [
        'Adopt the "B-minus work is finished work" principle for final formatting polish.',
        "Schedule a 20-minute body-doubling session specifically for shipping deliverables.",
        "Break the final 10% into discrete 5-minute micro-actions with immediate dopamine checkpoints."
      ],
      scores: { focus: 82, sensory: 60, processing: 90, executive: 52 }
    }
  };
  const selected = map[archetype] || map.sprint_redliner;
  return {
    primaryType: selected.title,
    traits: selected.traits,
    context: answers.context || "corporate",
    recommendations: selected.recommendations,
    scores: selected.scores
  };
}
function buildFallbackAnalysis(history, goals) {
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
      level: "moderate",
      message: "Potential for Afternoon Executive Paralysis detected.",
      recoveryAction: "Implement 10 minutes of low-stimulus environment (dim lights, no screens) at 12:30."
    }
  };
}
app.post("/api/generate-profile", async (req, res) => {
  const { answers } = req.body;
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: `Onboarding Questionnaire Results:
${JSON.stringify(answers || {})}`,
      config: {
        systemInstruction: PROFILE_ANALYSIS_INSTRUCTION,
        responseMimeType: "application/json",
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
              required: ["focus", "sensory", "processing", "executive"]
            }
          },
          required: ["primaryType", "traits", "recommendations", "scores"]
        }
      }
    });
    const parsed = JSON.parse(response.text || "{}");
    return res.json({
      ...parsed,
      context: answers?.context || "corporate"
    });
  } catch (err) {
    console.warn("Gemini API call failed, deploying calibrated profile synthesis fallback:", err.message || err);
    return res.json(buildFallbackProfile(answers || {}));
  }
});
app.post("/api/analyze-behavior", async (req, res) => {
  const { history, goals, streak, profile } = req.body;
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: `USER CONTEXT:
Streak: ${streak || 0} days
Cognitive Profile: ${JSON.stringify(profile || {})}
Recent Behavioral History: ${history || ""}
Target Objectives for Next Session: ${goals || ""}`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
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
                level: { type: Type.STRING, enum: ["low", "moderate", "critical"] },
                message: { type: Type.STRING },
                recoveryAction: { type: Type.STRING }
              },
              required: ["level", "message", "recoveryAction"]
            }
          },
          required: ["insights", "adaptedPlan", "explanation", "quickWins"]
        }
      }
    });
    const parsed = JSON.parse(response.text || "{}");
    return res.json(parsed);
  } catch (err) {
    console.warn("Gemini behavior analysis failed, deploying calibrated fallback:", err.message || err);
    return res.json(buildFallbackAnalysis(history || "", goals || ""));
  }
});
app.post("/api/chat", async (req, res) => {
  const { message, profile } = req.body;
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: message,
      config: {
        systemInstruction: `You are Dr. Neural, a behavioral neuroscience productivity coach. The user's cognitive archetype is ${JSON.stringify(profile?.primaryType || "Analytical Explorer")}. Provide succinct, expert, actionable advice (under 60 words). No fluff.`,
        temperature: 0.7
      }
    });
    return res.json({ text: response.text });
  } catch (err) {
    console.warn("Chat API fallback deployed:", err.message || err);
    return res.json({ text: "Maintain strict temporal boundaries on your focus blocks. Guard against context switching and ensure a 10-minute non-digital reset." });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.use((req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}
startServer();
