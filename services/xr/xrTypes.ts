// NeuralPlan XR Data Models & TypeScript Interfaces

export type XRViewMode = 'landing' | 'simulation' | 'results';

export type TrackingMode = 'interactive_cursor' | 'investor_demo_synthetic';

export type DemoProfileId = 'profile_a' | 'profile_b' | 'profile_c';

export type GazeStateType = 'target' | 'distractor' | 'outside' | 'paused';

export type SimulationStageId = 1 | 2 | 3 | 4 | 5;

export interface StageDefinition {
  id: SimulationStageId;
  code: string;
  title: string;
  shortLabel: string;
  durationSeconds: number;
  instructions: string[];
  hasDistractors: boolean;
  hasResponseTask: boolean;
}

export interface TimelineSegment {
  state: GazeStateType;
  startTimeMs: number;
  endTimeMs: number;
  durationMs: number;
  stageId: SimulationStageId;
  distractorId?: string;
}

export interface DistractionEvent {
  id: string;
  stageId: SimulationStageId;
  distractorId: string;
  startTimeMs: number;
  endTimeMs: number | null;
  durationMs: number;
}

export interface DeviationEvent {
  id: string;
  stageId: SimulationStageId;
  leftTargetAtMs: number;
  returnedToTargetAtMs: number | null;
  durationMs: number;
}

export interface PulseTrialEvent {
  id: string;
  stageId: SimulationStageId;
  type: 'single' | 'double';
  onsetTimeMs: number;
  responseWindowEndMs: number;
  responded: boolean;
  responseTimeMs: number | null;
  reactionLatencyMs: number | null;
  outcome: 'pending' | 'correct_hit' | 'missed_target' | 'correct_rejection' | 'false_alarm';
}

export interface StageMetrics {
  stageId: SimulationStageId;
  stageName: string;
  totalDurationMs: number;
  validObservationMs: number;
  pausedMs: number;
  timeOnTargetMs: number;
  timeOnDistractorMs: number;
  timeOutsideMs: number;
  targetFixationPct: number;
  gazeDeviationsCount: number;
  distractorCaptureCount: number;
  timeToFirstCaptureMs: number | null;
  avgDistractionDurationMs: number;
  avgRefocusLatencyMs: number;
  medianRefocusLatencyMs: number;
  successfulReturnsCount: number;
  avgFixationBoutMs: number;
}

export interface CognitivePerformanceReport {
  sessionId: string;
  completedAt: string;
  trackingMode: TrackingMode;
  demoProfileId?: DemoProfileId;
  demoProfileLabel?: string;
  completionStatus: 'completed' | 'partial';
  totalSessionDurationMs: number;
  totalValidObservationMs: number;
  totalPausedMs: number;

  // Primary 5 Indicators
  targetFixationPct: number;
  distractorCaptureCount: number;
  avgDistractionDurationMs: number;
  avgRefocusLatencyMs: number;
  medianRefocusLatencyMs: number;
  responseAccuracyPct: number | null; // null if Stage 4 was not reached
  avgReactionTimeMs: number | null;
  reactionTimeStdDevMs: number | null;
  responseConsistencyPct: number | null;

  // Sustained Attention Early vs Late Comparison
  earlySessionFixationPct: number;
  lateSessionFixationPct: number;
  sustainedConsistencyDeltaPct: number;

  // Detailed Breakdowns
  stageMetrics: StageMetrics[];
  timelineSegments: TimelineSegment[];
  distractionEvents: DistractionEvent[];
  deviationEvents: DeviationEvent[];
  pulseTrials: PulseTrialEvent[];
  falseAlarmCount: number;
  correctHitCount: number;
  missedTargetCount: number;
  totalDoublePulses: number;

  // Generated Insights & Exploratory Guidance
  observations: string[];
  recommendations: {
    title: string;
    detail: string;
    category: 'environment' | 'pacing' | 'visual_anchoring' | 'recovery';
  }[];
}

export interface DemoProfileConfig {
  id: DemoProfileId;
  name: string;
  shortTitle: string;
  tagline: string;
  description: string;
  behaviorParams: {
    targetFixationBias: number; // 0-1 likelihood to stay centered
    driftAmplitudePx: number;
    distractorAttractionProb: number; // prob per second of looking at a distractor
    distractorDwellMsMean: number;
    refocusSpeedFactor: number;
    cptHitRate: number;
    cptMeanRtMs: number;
    cptRtJitterMs: number;
    cptFalseAlarmRate: number;
  };
}

export interface LiveTelemetrySnapshot {
  currentGazeState: GazeStateType;
  targetFixationPct: number;
  distractorCaptures: number;
  gazeDeviations: number;
  avgRefocusMs: number;
  elapsedValidMs: number;
  stageFixationPct: number;
}
