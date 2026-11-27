import { AnalysisResult, NeuralProfile } from "../types";

export const getMockAnalysis = (): AnalysisResult => ({
  insights: "Analysis of your 'Neural Redlining' patterns indicates high-intensity focus periods followed by severe dopamine crashes. Your 'Waiting Mode' at 1pm is a classic symptom of executive paralysis preceding scheduled obligations. Current cognitive load is trending towards 'Strained'.",
  quickWins: [
    "Set a 2-minute timer to clear exactly 3 emails.",
    "Place your phone in a separate room for the next 15 minutes.",
    "Refill water bottle with ice for sensory grounding."
  ],
  adaptedPlan: `09:00 - 09:45: [High Load] Financial Audit Block 1 (Focus on Chunk 1: Data Entry)
10:00 - 10:45: [High Load] Financial Audit Block 2 (Focus on Chunk 2: Reconciliation)
11:00 - 11:30: [Low Load] Email Triage (Max 10 items)
13:00 - 13:45: [Med Load] Team Sync Prep (Transition Protocol)
14:00 - 15:00: [Med Load] Team Sync Meeting`,
  explanation: "This plan utilizes 'Interleaving' to prevent burnout. High-load tasks are front-loaded when your anxiety-driven morning energy is peak, but capped at 45 minutes to avoid the crash observed in your history. Transition buffers are strictly enforced.",
  burnoutAlert: {
    level: 'moderate',
    message: "Detected potential for 'Post-Hyperfocus Collapse'.",
    recoveryAction: "Implement 10 minutes of low-stimulus environment (dim lights, no screens) at 12:00."
  }
});

export const getClientFallbackProfile = (answers: Record<string, string>): NeuralProfile => {
  const archetype = answers.archetype || 'sprint_redliner';
  
  const profiles: Record<string, Partial<NeuralProfile>> = {
    sprint_redliner: {
      primaryType: 'Sprint-Crashing Redliner',
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
      primaryType: 'Waiting-Mode Paralytic',
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
      primaryType: 'Hyper-Focus Drifter',
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
      primaryType: 'Sensory-Overwhelmed Synthesizer',
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
      primaryType: 'Last-Mile Abandoner',
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

  const selected = profiles[archetype] || profiles.sprint_redliner;

  return {
    primaryType: selected.primaryType || 'Sprint-Crashing Redliner',
    traits: selected.traits || [],
    context: (answers.context as any) || 'corporate',
    recommendations: selected.recommendations || [],
    scores: selected.scores || { focus: 80, sensory: 70, processing: 85, executive: 60 }
  };
};

export const generateNeuralProfile = async (answers: Record<string, string>): Promise<NeuralProfile> => {
  try {
    const res = await fetch('/api/generate-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers })
    });

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.warn('Profile API request encountered an issue, using client calibrated profile:', err);
    return getClientFallbackProfile(answers);
  }
};

export const analyzeBehavior = async (
  history: string, 
  goals: string, 
  streak: number = 0,
  profile: NeuralProfile | null = null
): Promise<AnalysisResult> => {
  try {
    const res = await fetch('/api/analyze-behavior', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ history, goals, streak, profile })
    });

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.warn('Behavior API request encountered an issue, using calibrated analysis:', err);
    return getMockAnalysis();
  }
};

export const sendChatMessage = async (message: string, profile: NeuralProfile | null): Promise<string> => {
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, profile })
    });
    if (res.ok) {
      const data = await res.json();
      return data.text || "Cognitive protocol verified. Ensure you take periodic sensory breaks.";
    }
  } catch (e) {
    console.warn('Chat proxy error:', e);
  }
  return "Protocol active. Remember to guard your dopamine reserves and cap high-load sessions at 45 minutes.";
};

export const createChatSession = (profile: NeuralProfile | null) => {
  return {
    sendMessage: async ({ message }: { message: string }) => {
      const text = await sendChatMessage(message, profile);
      return { text };
    }
  };
};
