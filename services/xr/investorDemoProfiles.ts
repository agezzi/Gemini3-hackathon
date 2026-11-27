import { DemoProfileConfig, DemoProfileId, StageDefinition } from './xrTypes';

export const STAGE_DEFINITIONS: StageDefinition[] = [
  {
    id: 1,
    code: 'STAGE 01',
    title: 'Baseline Attention',
    shortLabel: 'Baseline',
    durationSeconds: 45,
    instructions: [
      'Welcome to the NeuralPlan XR Focus Experience.',
      'Your task is to maintain your attention on the glowing light in the centre of your screen.',
      'Try to keep your gaze on the light for the duration of this stage.'
    ],
    hasDistractors: false,
    hasResponseTask: false
  },
  {
    id: 2,
    code: 'STAGE 02',
    title: 'Visual Distraction',
    shortLabel: 'Distraction',
    durationSeconds: 60,
    instructions: [
      'A new visual stimulus has entered your environment.',
      'Continue focusing on the original amber light.',
      'Try not to allow the moving blue light to capture your attention.'
    ],
    hasDistractors: true,
    hasResponseTask: false
  },
  {
    id: 3,
    code: 'STAGE 03',
    title: 'Competing Stimuli',
    shortLabel: 'Competing',
    durationSeconds: 60,
    instructions: [
      'Multiple competing visual stimuli will enter your peripheral field progressively.',
      'Maintain steady fixation on the central amber light despite visual motion and transient pulses.'
    ],
    hasDistractors: true,
    hasResponseTask: false
  },
  {
    id: 4,
    code: 'STAGE 04',
    title: 'Sustained Attention & Response Control',
    shortLabel: 'Response',
    durationSeconds: 60,
    instructions: [
      'Continue watching the amber light.',
      'Whenever you notice it performing a double pulse, press the SPACEBAR.',
      'Ignore the other moving lights.'
    ],
    hasDistractors: true,
    hasResponseTask: true
  },
  {
    id: 5,
    code: 'STAGE 05',
    title: 'Session Completion',
    shortLabel: 'Complete',
    durationSeconds: 0,
    instructions: [
      'Your Focus Experience Is Complete.',
      'Your session data has been processed.'
    ],
    hasDistractors: false,
    hasResponseTask: false
  }
];

export const INVESTOR_DEMO_PROFILES: Record<DemoProfileId, DemoProfileConfig> = {
  profile_a: {
    id: 'profile_a',
    name: 'Profile A: Relatively stable attention',
    shortTitle: 'Profile A · Stable Attention',
    tagline: 'High target fixation · Minimal distractor captures · Consistent RT',
    description:
      'Illustrative scenario showing sustained central fixation (~90%), brief peripheral glances with rapid ~420ms recovery, and low reaction-time variability.',
    behaviorParams: {
      targetFixationBias: 0.92,
      driftAmplitudePx: 14,
      distractorAttractionProb: 0.035,
      distractorDwellMsMean: 420,
      refocusSpeedFactor: 0.22,
      cptHitRate: 0.94,
      cptMeanRtMs: 490,
      cptRtJitterMs: 55,
      cptFalseAlarmRate: 0.02
    }
  },
  profile_b: {
    id: 'profile_b',
    name: 'Profile B: Variable attention',
    shortTitle: 'Profile B · Variable Attention',
    tagline: 'Moderate fixation · Periodic distraction · Fluctuating recovery',
    description:
      'Illustrative scenario showing steady baseline focus that shifts periodically as competing visual stimuli increase, with moderate refocusing latency and fluctuating response timing.',
    behaviorParams: {
      targetFixationBias: 0.74,
      driftAmplitudePx: 26,
      distractorAttractionProb: 0.14,
      distractorDwellMsMean: 860,
      refocusSpeedFactor: 0.13,
      cptHitRate: 0.80,
      cptMeanRtMs: 640,
      cptRtJitterMs: 140,
      cptFalseAlarmRate: 0.10
    }
  },
  profile_c: {
    id: 'profile_c',
    name: 'Profile C: High distractor engagement',
    shortTitle: 'Profile C · High Distractor Engagement',
    tagline: 'Frequent captures · Longer off-target bouts · Higher RT variability',
    description:
      'Illustrative scenario showing pronounced visual capture when novel cyan/blue stimuli cross the field of view, extended attentional recovery intervals, and variable response timing.',
    behaviorParams: {
      targetFixationBias: 0.54,
      driftAmplitudePx: 38,
      distractorAttractionProb: 0.28,
      distractorDwellMsMean: 1350,
      refocusSpeedFactor: 0.085,
      cptHitRate: 0.65,
      cptMeanRtMs: 790,
      cptRtJitterMs: 225,
      cptFalseAlarmRate: 0.20
    }
  }
};

export interface SimulatedDistractorTarget {
  id: string;
  x: number;
  y: number;
}

/**
 * Generates realistic, smooth synthetic cursor movement for Investor Demo Mode.
 * Never produces discontinuous teleportation — uses eased spring interpolation.
 */
export class SyntheticGazeController {
  private currentX: number = 0;
  private currentY: number = 0;
  private initialized: boolean = false;
  private lockUntilMs: number = 0;
  private trackedDistractorId: string | null = null;
  private driftPhase: number = 0;
  private lastDecisionMs: number = 0;
  private wanderOffset: { x: number; y: number } = { x: 0, y: 0 };

  public reset(centerX: number, centerY: number) {
    this.currentX = centerX;
    this.currentY = centerY;
    this.initialized = true;
    this.lockUntilMs = 0;
    this.trackedDistractorId = null;
    this.wanderOffset = { x: 0, y: 0 };
    this.lastDecisionMs = 0;
  }

  public step(
    nowMs: number,
    dtMs: number,
    centerX: number,
    centerY: number,
    profileId: DemoProfileId,
    distractors: SimulatedDistractorTarget[],
    stageId: number
  ): { x: number; y: number } {
    if (!this.initialized) {
      this.reset(centerX, centerY);
    }

    const params = INVESTOR_DEMO_PROFILES[profileId].behaviorParams;
    this.driftPhase += dtMs * 0.0022;

    // Decision tick every ~350ms to decide if gaze stays on center, glances outside, or tracks a distractor
    if (nowMs - this.lastDecisionMs > 350 && nowMs > this.lockUntilMs) {
      this.lastDecisionMs = nowMs;

      // Cognitive demand multiplier increases across stages 2 -> 4
      const stageLoadMultiplier = stageId === 1 ? 0.25 : stageId === 2 ? 0.9 : stageId === 3 ? 1.25 : 1.15;
      const captureRoll = Math.random();
      const captureProb = Math.min(0.65, params.distractorAttractionProb * stageLoadMultiplier);

      if (distractors.length > 0 && captureRoll < captureProb) {
        // Saccade toward a moving distractor
        const picked = distractors[Math.floor(Math.random() * distractors.length)];
        this.trackedDistractorId = picked.id;
        this.lockUntilMs =
          nowMs + params.distractorDwellMsMean * (0.7 + Math.random() * 0.65);
        this.wanderOffset = { x: (Math.random() - 0.5) * 14, y: (Math.random() - 0.5) * 14 };
      } else if (Math.random() > params.targetFixationBias + (stageId === 1 ? 0.06 : -0.04)) {
        // Brief peripheral wander outside target ring
        this.trackedDistractorId = null;
        const wanderAngle = Math.random() * Math.PI * 2;
        const wanderDist = 90 + Math.random() * 90;
        this.wanderOffset = {
          x: Math.cos(wanderAngle) * wanderDist,
          y: Math.sin(wanderAngle) * wanderDist
        };
        this.lockUntilMs = nowMs + 450 + Math.random() * 600;
      } else {
        // Return to / maintain central fixation on amber orb
        this.trackedDistractorId = null;
        this.wanderOffset = {
          x: (Math.random() - 0.5) * params.driftAmplitudePx,
          y: (Math.random() - 0.5) * params.driftAmplitudePx
        };
      }
    }

    // Determine desired target coordinates
    let goalX = centerX + Math.sin(this.driftPhase) * (params.driftAmplitudePx * 0.5) + this.wanderOffset.x;
    let goalY = centerY + Math.cos(this.driftPhase * 0.8) * (params.driftAmplitudePx * 0.5) + this.wanderOffset.y;

    if (this.trackedDistractorId && nowMs < this.lockUntilMs) {
      const targetDistractor = distractors.find((d) => d.id === this.trackedDistractorId);
      if (targetDistractor) {
        goalX = targetDistractor.x + this.wanderOffset.x;
        goalY = targetDistractor.y + this.wanderOffset.y;
      } else {
        // Distractor disappeared; immediately release lock to refocus
        this.trackedDistractorId = null;
        this.lockUntilMs = 0;
      }
    } else if (nowMs >= this.lockUntilMs && this.trackedDistractorId) {
      this.trackedDistractorId = null;
      this.wanderOffset = { x: 0, y: 0 };
    }

    // Smooth critically-damped interpolation mimicking ocular saccade + fixation micro-drift
    const lerpRate = this.trackedDistractorId
      ? 0.18
      : params.refocusSpeedFactor;
    const clampedAlpha = 1 - Math.pow(1 - lerpRate, Math.max(0.5, dtMs / 16.67));

    this.currentX += (goalX - this.currentX) * clampedAlpha;
    this.currentY += (goalY - this.currentY) * clampedAlpha;

    return { x: this.currentX, y: this.currentY };
  }
}
