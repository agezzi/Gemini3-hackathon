import {
  CognitivePerformanceReport,
  DemoProfileId,
  DeviationEvent,
  DistractionEvent,
  GazeStateType,
  LiveTelemetrySnapshot,
  PulseTrialEvent,
  SimulationStageId,
  StageMetrics,
  TimelineSegment,
  TrackingMode
} from './xrTypes';
import { INVESTOR_DEMO_PROFILES, STAGE_DEFINITIONS } from './investorDemoProfiles';

export interface ActiveDistractorCircle {
  id: string;
  x: number;
  y: number;
  radius: number;
}

export class GazeTrackingEngine {
  private trackingMode: TrackingMode = 'interactive_cursor';
  private demoProfileId?: DemoProfileId;

  private segments: TimelineSegment[] = [];
  private distractionEvents: DistractionEvent[] = [];
  private deviationEvents: DeviationEvent[] = [];
  private pulseTrials: PulseTrialEvent[] = [];

  private currentStageId: SimulationStageId = 1;
  private currentState: GazeStateType = 'outside';
  private currentDistractorId: string | undefined = undefined;
  private stateStartMs: number = 0;
  private sessionElapsedMs: number = 0;

  private openDeviation: DeviationEvent | null = null;
  private openDistraction: DistractionEvent | null = null;
  private idCounter: number = 1;

  constructor(trackingMode: TrackingMode, demoProfileId?: DemoProfileId) {
    this.trackingMode = trackingMode;
    this.demoProfileId = demoProfileId;
  }

  public reset(trackingMode: TrackingMode, demoProfileId?: DemoProfileId) {
    this.trackingMode = trackingMode;
    this.demoProfileId = demoProfileId;
    this.segments = [];
    this.distractionEvents = [];
    this.deviationEvents = [];
    this.pulseTrials = [];
    this.currentStageId = 1;
    this.currentState = 'target';
    this.currentDistractorId = undefined;
    this.stateStartMs = 0;
    this.sessionElapsedMs = 0;
    this.openDeviation = null;
    this.openDistraction = null;
    this.idCounter = 1;
  }

  public setTrackingMode(trackingMode: TrackingMode, demoProfileId?: DemoProfileId) {
    this.trackingMode = trackingMode;
    this.demoProfileId = demoProfileId;
  }

  public startStage(stageId: SimulationStageId, initialState: GazeStateType = 'target') {
    this.closeCurrentSegment(this.sessionElapsedMs);
    this.closeOpenEventsOnPauseOrStageEnd(this.sessionElapsedMs);
    this.currentStageId = stageId;
    this.currentState = initialState;
    this.currentDistractorId = undefined;
    this.stateStartMs = this.sessionElapsedMs;
  }

  public setPaused(isPaused: boolean) {
    if (isPaused && this.currentState !== 'paused') {
      this.closeCurrentSegment(this.sessionElapsedMs);
      this.closeOpenEventsOnPauseOrStageEnd(this.sessionElapsedMs);
      this.currentState = 'paused';
      this.currentDistractorId = undefined;
      this.stateStartMs = this.sessionElapsedMs;
    } else if (!isPaused && this.currentState === 'paused') {
      this.closeCurrentSegment(this.sessionElapsedMs);
      this.currentState = 'outside';
      this.currentDistractorId = undefined;
      this.stateStartMs = this.sessionElapsedMs;
    }
  }

  /**
   * Advances simulation clock by dtMs and evaluates cursor against target & distractors.
   */
  public recordSample(
    dtMs: number,
    cursorX: number,
    cursorY: number,
    targetX: number,
    targetY: number,
    targetRadius: number,
    distractors: ActiveDistractorCircle[],
    isPaused: boolean
  ): GazeStateType {
    if (dtMs <= 0) return this.currentState;
    this.sessionElapsedMs += dtMs;

    if (isPaused) {
      if (this.currentState !== 'paused') {
        this.setPaused(true);
      }
      return 'paused';
    }

    // Evaluate spatial hit state
    let nextState: GazeStateType = 'outside';
    let nextDistractorId: string | undefined = undefined;

    const distToTarget = Math.hypot(cursorX - targetX, cursorY - targetY);
    if (distToTarget <= targetRadius) {
      nextState = 'target';
    } else {
      // Check active distractors
      for (const d of distractors) {
        const distToDistractor = Math.hypot(cursorX - d.x, cursorY - d.y);
        if (distToDistractor <= d.radius) {
          nextState = 'distractor';
          nextDistractorId = d.id;
          break;
        }
      }
    }

    // Detect state transition to avoid duplicate frame-by-frame event creation
    if (
      nextState !== this.currentState ||
      (nextState === 'distractor' && nextDistractorId !== this.currentDistractorId)
    ) {
      const transitionTime = this.sessionElapsedMs;
      this.closeCurrentSegment(transitionTime);
      this.handleEventTransition(this.currentState, nextState, transitionTime, nextDistractorId);
      this.currentState = nextState;
      this.currentDistractorId = nextDistractorId;
      this.stateStartMs = transitionTime;
    }

    return this.currentState;
  }

  /**
   * Advances only paused time (e.g. tab unfocused or manual pause)
   */
  public advancePausedTime(dtMs: number) {
    if (dtMs <= 0) return;
    if (this.currentState !== 'paused') {
      this.setPaused(true);
    }
    this.sessionElapsedMs += dtMs;
  }

  private closeCurrentSegment(endTimeMs: number) {
    const durationMs = endTimeMs - this.stateStartMs;
    if (durationMs > 0) {
      this.segments.push({
        state: this.currentState,
        startTimeMs: this.stateStartMs,
        endTimeMs,
        durationMs,
        stageId: this.currentStageId,
        distractorId: this.currentDistractorId
      });
    }
  }

  private closeOpenEventsOnPauseOrStageEnd(timeMs: number) {
    if (this.openDistraction) {
      this.openDistraction.endTimeMs = timeMs;
      this.openDistraction.durationMs = Math.max(0, timeMs - this.openDistraction.startTimeMs);
      this.distractionEvents.push(this.openDistraction);
      this.openDistraction = null;
    }
    if (this.openDeviation) {
      // Unreturned deviation closed at stage end/pause (returnedToTargetAtMs stays null)
      this.openDeviation.durationMs = Math.max(0, timeMs - this.openDeviation.leftTargetAtMs);
      this.deviationEvents.push(this.openDeviation);
      this.openDeviation = null;
    }
  }

  private handleEventTransition(
    prevState: GazeStateType,
    nextState: GazeStateType,
    timeMs: number,
    nextDistractorId?: string
  ) {
    // 1. Closing any active distraction event if leaving distractor state or switching distractors
    if (this.openDistraction) {
      this.openDistraction.endTimeMs = timeMs;
      this.openDistraction.durationMs = Math.max(0, timeMs - this.openDistraction.startTimeMs);
      this.distractionEvents.push(this.openDistraction);
      this.openDistraction = null;
    }

    // 2. Starting a new distraction event ONLY upon entering a distractor region
    if (nextState === 'distractor' && nextDistractorId) {
      this.openDistraction = {
        id: `dist_${this.idCounter++}`,
        stageId: this.currentStageId,
        distractorId: nextDistractorId,
        startTimeMs: timeMs,
        endTimeMs: null,
        durationMs: 0
      };
    }

    // 3. Deviation & Refocus Latency tracking
    if (prevState === 'target' && (nextState === 'outside' || nextState === 'distractor')) {
      this.openDeviation = {
        id: `dev_${this.idCounter++}`,
        stageId: this.currentStageId,
        leftTargetAtMs: timeMs,
        returnedToTargetAtMs: null,
        durationMs: 0
      };
    } else if (nextState === 'target' && this.openDeviation) {
      this.openDeviation.returnedToTargetAtMs = timeMs;
      this.openDeviation.durationMs = Math.max(0, timeMs - this.openDeviation.leftTargetAtMs);
      this.deviationEvents.push(this.openDeviation);
      this.openDeviation = null;
    }
  }

  // Stage 4: CPT Pulse Trial Recording
  public registerPulseTrial(type: 'single' | 'double', responseWindowMs: number = 2200): PulseTrialEvent {
    const trial: PulseTrialEvent = {
      id: `pulse_${this.idCounter++}`,
      stageId: this.currentStageId,
      type,
      onsetTimeMs: this.sessionElapsedMs,
      responseWindowEndMs: this.sessionElapsedMs + responseWindowMs,
      responded: false,
      responseTimeMs: null,
      reactionLatencyMs: null,
      outcome: 'pending'
    };
    this.pulseTrials.push(trial);
    return trial;
  }

  /**
   * Handles participant Spacebar / button press in Stage 4 with single-trigger protection
   */
  public recordParticipantResponse(): {
    accepted: boolean;
    outcome: 'correct_hit' | 'false_alarm' | 'already_responded';
    reactionMs?: number;
  } {
    const now = this.sessionElapsedMs;

    // Look for an active double-pulse window
    const activeDouble = [...this.pulseTrials]
      .reverse()
      .find(
        (t) =>
          t.type === 'double' &&
          now >= t.onsetTimeMs &&
          now <= t.responseWindowEndMs
      );

    if (activeDouble) {
      if (activeDouble.responded) {
        // Prevent accidental duplicate scoring for the same double-pulse event
        return { accepted: false, outcome: 'already_responded' };
      }
      const latency = Math.max(120, Math.round(now - activeDouble.onsetTimeMs));
      activeDouble.responded = true;
      activeDouble.responseTimeMs = now;
      activeDouble.reactionLatencyMs = latency;
      activeDouble.outcome = 'correct_hit';
      return { accepted: true, outcome: 'correct_hit', reactionMs: latency };
    }

    // Check if there was an active single pulse lure window
    const activeSingle = [...this.pulseTrials]
      .reverse()
      .find(
        (t) =>
          t.type === 'single' &&
          now >= t.onsetTimeMs &&
          now <= t.responseWindowEndMs
      );

    if (activeSingle && !activeSingle.responded) {
      activeSingle.responded = true;
      activeSingle.responseTimeMs = now;
      activeSingle.reactionLatencyMs = Math.round(now - activeSingle.onsetTimeMs);
      activeSingle.outcome = 'false_alarm';
      return { accepted: true, outcome: 'false_alarm' };
    }

    // Spontaneous false alarm outside any double pulse window
    this.pulseTrials.push({
      id: `fa_${this.idCounter++}`,
      stageId: this.currentStageId,
      type: 'single',
      onsetTimeMs: now,
      responseWindowEndMs: now,
      responded: true,
      responseTimeMs: now,
      reactionLatencyMs: null,
      outcome: 'false_alarm'
    });

    return { accepted: true, outcome: 'false_alarm' };
  }

  public finalizePendingTrials() {
    const now = this.sessionElapsedMs;
    this.pulseTrials.forEach((t) => {
      if (t.outcome === 'pending' && now >= t.responseWindowEndMs) {
        if (t.type === 'double') {
          t.outcome = t.responded ? 'correct_hit' : 'missed_target';
        } else {
          t.outcome = t.responded ? 'false_alarm' : 'correct_rejection';
        }
      }
    });
  }

  public getLiveSnapshot(): LiveTelemetrySnapshot {
    const allSegments = [...this.segments];
    if (this.sessionElapsedMs > this.stateStartMs) {
      allSegments.push({
        state: this.currentState,
        startTimeMs: this.stateStartMs,
        endTimeMs: this.sessionElapsedMs,
        durationMs: this.sessionElapsedMs - this.stateStartMs,
        stageId: this.currentStageId,
        distractorId: this.currentDistractorId
      });
    }

    let validMs = 0;
    let targetMs = 0;
    let stageValidMs = 0;
    let stageTargetMs = 0;

    allSegments.forEach((seg) => {
      if (seg.state !== 'paused') {
        validMs += seg.durationMs;
        if (seg.state === 'target') targetMs += seg.durationMs;
        if (seg.stageId === this.currentStageId) {
          stageValidMs += seg.durationMs;
          if (seg.state === 'target') stageTargetMs += seg.durationMs;
        }
      }
    });

    const completedDevs = this.deviationEvents.filter((d) => d.returnedToTargetAtMs !== null);
    const avgRefocusMs =
      completedDevs.length > 0
        ? Math.round(
            completedDevs.reduce((acc, d) => acc + d.durationMs, 0) / completedDevs.length
          )
        : 0;

    return {
      currentGazeState: this.currentState,
      targetFixationPct: validMs > 0 ? Math.round((targetMs / validMs) * 100) : 100,
      distractorCaptures:
        this.distractionEvents.length + (this.openDistraction ? 1 : 0),
      gazeDeviations: this.deviationEvents.length + (this.openDeviation ? 1 : 0),
      avgRefocusMs,
      elapsedValidMs: validMs,
      stageFixationPct:
        stageValidMs > 0 ? Math.round((stageTargetMs / stageValidMs) * 100) : 100
    };
  }

  /**
   * Generates the full analytical Cognitive Performance Report.
   */
  public generateReport(completionStatus: 'completed' | 'partial'): CognitivePerformanceReport {
    // Close active open segment & events cleanly
    this.closeCurrentSegment(this.sessionElapsedMs);
    this.closeOpenEventsOnPauseOrStageEnd(this.sessionElapsedMs);

    // Finalize all pending trials
    this.pulseTrials.forEach((t) => {
      if (t.outcome === 'pending') {
        t.outcome = t.type === 'double'
          ? (t.responded ? 'correct_hit' : 'missed_target')
          : (t.responded ? 'false_alarm' : 'correct_rejection');
      }
    });

    const totalPausedMs = this.segments
      .filter((s) => s.state === 'paused')
      .reduce((acc, s) => acc + s.durationMs, 0);

    const validSegments = this.segments.filter((s) => s.state !== 'paused');
    const totalValidObservationMs = validSegments.reduce((acc, s) => acc + s.durationMs, 0);
    const totalSessionDurationMs = totalValidObservationMs + totalPausedMs;

    const totalTargetMs = validSegments
      .filter((s) => s.state === 'target')
      .reduce((acc, s) => acc + s.durationMs, 0);

    const targetFixationPct =
      totalValidObservationMs > 0
        ? Number(((totalTargetMs / totalValidObservationMs) * 100).toFixed(1))
        : 0;

    const distractorCaptureCount = this.distractionEvents.length;
    const avgDistractionDurationMs =
      distractorCaptureCount > 0
        ? Math.round(
            this.distractionEvents.reduce((acc, e) => acc + e.durationMs, 0) /
              distractorCaptureCount
          )
        : 0;

    const returnedDeviations = this.deviationEvents.filter(
      (d) => d.returnedToTargetAtMs !== null
    );
    const refocusDurations = returnedDeviations.map((d) => d.durationMs).sort((a, b) => a - b);

    const avgRefocusLatencyMs =
      refocusDurations.length > 0
        ? Math.round(refocusDurations.reduce((a, b) => a + b, 0) / refocusDurations.length)
        : 0;

    const medianRefocusLatencyMs =
      refocusDurations.length > 0
        ? Math.round(
            refocusDurations.length % 2 === 1
              ? refocusDurations[Math.floor(refocusDurations.length / 2)]
              : (refocusDurations[refocusDurations.length / 2 - 1] +
                  refocusDurations[refocusDurations.length / 2]) /
                  2
          )
        : 0;

    // Sustained Attention Consistency (Early half vs Late half of valid observation)
    const halfValidMs = totalValidObservationMs / 2;
    let accumValid = 0;
    let earlyValid = 0;
    let earlyTarget = 0;
    let lateValid = 0;
    let lateTarget = 0;

    validSegments.forEach((seg) => {
      const segStart = accumValid;
      const segEnd = accumValid + seg.durationMs;
      if (segEnd <= halfValidMs) {
        earlyValid += seg.durationMs;
        if (seg.state === 'target') earlyTarget += seg.durationMs;
      } else if (segStart >= halfValidMs) {
        lateValid += seg.durationMs;
        if (seg.state === 'target') lateTarget += seg.durationMs;
      } else {
        const earlyPart = halfValidMs - segStart;
        const latePart = segEnd - halfValidMs;
        earlyValid += earlyPart;
        lateValid += latePart;
        if (seg.state === 'target') {
          earlyTarget += earlyPart;
          lateTarget += latePart;
        }
      }
      accumValid += seg.durationMs;
    });

    const earlySessionFixationPct =
      earlyValid > 0 ? Number(((earlyTarget / earlyValid) * 100).toFixed(1)) : targetFixationPct;
    const lateSessionFixationPct =
      lateValid > 0 ? Number(((lateTarget / lateValid) * 100).toFixed(1)) : targetFixationPct;
    const sustainedConsistencyDeltaPct = Number(
      (lateSessionFixationPct - earlySessionFixationPct).toFixed(1)
    );

    // Stage 4 CPT Metrics
    const doubleTrials = this.pulseTrials.filter((t) => t.type === 'double');
    const correctHits = doubleTrials.filter((t) => t.outcome === 'correct_hit');
    const missedTargets = doubleTrials.filter((t) => t.outcome === 'missed_target');
    const falseAlarms = this.pulseTrials.filter((t) => t.outcome === 'false_alarm');

    const responseAccuracyPct =
      doubleTrials.length > 0
        ? Number(((correctHits.length / doubleTrials.length) * 100).toFixed(1))
        : null;

    const validRTs = correctHits
      .map((t) => t.reactionLatencyMs)
      .filter((rt): rt is number => rt !== null);

    const avgReactionTimeMs =
      validRTs.length > 0
        ? Math.round(validRTs.reduce((a, b) => a + b, 0) / validRTs.length)
        : null;

    let reactionTimeStdDevMs: number | null = null;
    let responseConsistencyPct: number | null = null;

    if (validRTs.length > 1 && avgReactionTimeMs && avgReactionTimeMs > 0) {
      const variance =
        validRTs.reduce((acc, rt) => acc + Math.pow(rt - avgReactionTimeMs, 2), 0) /
        validRTs.length;
      reactionTimeStdDevMs = Math.round(Math.sqrt(variance));
      // Normalized consistency index: 100 - CV% (bounded 0-100)
      const cv = reactionTimeStdDevMs / avgReactionTimeMs;
      responseConsistencyPct = Math.max(0, Math.min(100, Number(((1 - cv) * 100).toFixed(1))));
    } else if (validRTs.length === 1) {
      reactionTimeStdDevMs = 0;
      responseConsistencyPct = 100;
    }

    // Per-Stage Breakdown (Stages 1 to 4)
    const stageMetrics: StageMetrics[] = ([1, 2, 3, 4] as SimulationStageId[]).map((sId) => {
      const def = STAGE_DEFINITIONS.find((d) => d.id === sId)!;
      const stSegs = this.segments.filter((s) => s.stageId === sId);
      const stValid = stSegs.filter((s) => s.state !== 'paused');
      const stPausedMs = stSegs
        .filter((s) => s.state === 'paused')
        .reduce((a, b) => a + b.durationMs, 0);
      const stValidMs = stValid.reduce((a, b) => a + b.durationMs, 0);
      const stTargetMs = stValid
        .filter((s) => s.state === 'target')
        .reduce((a, b) => a + b.durationMs, 0);
      const stDistractorMs = stValid
        .filter((s) => s.state === 'distractor')
        .reduce((a, b) => a + b.durationMs, 0);
      const stOutsideMs = stValid
        .filter((s) => s.state === 'outside')
        .reduce((a, b) => a + b.durationMs, 0);

      const stDistEvents = this.distractionEvents.filter((e) => e.stageId === sId);
      const stDevEvents = this.deviationEvents.filter((e) => e.stageId === sId);
      const stReturnedDevs = stDevEvents.filter((e) => e.returnedToTargetAtMs !== null);
      const stRefocusSorted = stReturnedDevs.map((e) => e.durationMs).sort((a, b) => a - b);

      const stageStartOffset = stSegs.length > 0 ? stSegs[0].startTimeMs : 0;
      const firstCapture =
        stDistEvents.length > 0
          ? Math.max(0, Math.round(stDistEvents[0].startTimeMs - stageStartOffset))
          : null;

      const targetBouts = stValid.filter((s) => s.state === 'target');
      const avgFixationBoutMs =
        targetBouts.length > 0
          ? Math.round(stTargetMs / targetBouts.length)
          : 0;

      return {
        stageId: sId,
        stageName: def.title,
        totalDurationMs: stValidMs + stPausedMs,
        validObservationMs: stValidMs,
        pausedMs: stPausedMs,
        timeOnTargetMs: stTargetMs,
        timeOnDistractorMs: stDistractorMs,
        timeOutsideMs: stOutsideMs,
        targetFixationPct: stValidMs > 0 ? Number(((stTargetMs / stValidMs) * 100).toFixed(1)) : 0,
        gazeDeviationsCount: stDevEvents.length,
        distractorCaptureCount: stDistEvents.length,
        timeToFirstCaptureMs: firstCapture,
        avgDistractionDurationMs:
          stDistEvents.length > 0
            ? Math.round(
                stDistEvents.reduce((a, b) => a + b.durationMs, 0) / stDistEvents.length
              )
            : 0,
        avgRefocusLatencyMs:
          stRefocusSorted.length > 0
            ? Math.round(stRefocusSorted.reduce((a, b) => a + b, 0) / stRefocusSorted.length)
            : 0,
        medianRefocusLatencyMs:
          stRefocusSorted.length > 0
            ? Math.round(stRefocusSorted[Math.floor(stRefocusSorted.length / 2)])
            : 0,
        successfulReturnsCount: stReturnedDevs.length,
        avgFixationBoutMs
      };
    });

    const reportDraft: CognitivePerformanceReport = {
      sessionId: `xr_${Date.now()}`,
      completedAt: new Date().toISOString(),
      trackingMode: this.trackingMode,
      demoProfileId: this.demoProfileId,
      demoProfileLabel: this.demoProfileId
        ? INVESTOR_DEMO_PROFILES[this.demoProfileId].name
        : undefined,
      completionStatus,
      totalSessionDurationMs,
      totalValidObservationMs,
      totalPausedMs,
      targetFixationPct,
      distractorCaptureCount,
      avgDistractionDurationMs,
      avgRefocusLatencyMs,
      medianRefocusLatencyMs,
      responseAccuracyPct,
      avgReactionTimeMs,
      reactionTimeStdDevMs,
      responseConsistencyPct,
      earlySessionFixationPct,
      lateSessionFixationPct,
      sustainedConsistencyDeltaPct,
      stageMetrics,
      timelineSegments: this.segments,
      distractionEvents: this.distractionEvents,
      deviationEvents: this.deviationEvents,
      pulseTrials: this.pulseTrials,
      falseAlarmCount: falseAlarms.length,
      correctHitCount: correctHits.length,
      missedTargetCount: missedTargets.length,
      totalDoublePulses: doubleTrials.length,
      observations: [],
      recommendations: []
    };

    reportDraft.observations = buildObservations(reportDraft);
    reportDraft.recommendations = buildRecommendations(reportDraft);

    return reportDraft;
  }
}

function buildObservations(r: CognitivePerformanceReport): string[] {
  const obs: string[] = [];
  const s1 = r.stageMetrics.find((s) => s.stageId === 1);
  const s2 = r.stageMetrics.find((s) => s.stageId === 2);
  const s3 = r.stageMetrics.find((s) => s.stageId === 3);
  const s4 = r.stageMetrics.find((s) => s.stageId === 4);

  const subject =
    r.trackingMode === 'investor_demo_synthetic'
      ? `In this synthetic demonstration (${r.demoProfileLabel || 'Demo Profile'}), simulated gaze`
      : 'During this session, simulated cursor gaze';

  if (s1 && s1.validObservationMs > 0) {
    obs.push(
      `${subject} maintained primary target fixation for ${s1.targetFixationPct}% of the baseline period (${Math.round(s1.validObservationMs / 1000)}s valid observation), establishing an unperturbed reference anchor.`
    );
  }

  if (s2 && s2.validObservationMs > 0 && s3 && s3.validObservationMs > 0) {
    const baselineFix = s1 ? s1.targetFixationPct : r.targetFixationPct;
    const delta = Number((s3.targetFixationPct - baselineFix).toFixed(1));
    if (r.distractorCaptureCount > 0) {
      obs.push(
        `Following the introduction of competing cyan and blue visual stimuli across Stages 2 and 3, ${r.distractorCaptureCount} distinct distractor capture${r.distractorCaptureCount === 1 ? '' : 's'} were recorded (averaging ${r.avgDistractionDurationMs} ms per shift), shifting target fixation by ${delta > 0 ? `+${delta}%` : `${delta}%`} under multi-stimulus load.`
      );
    } else {
      obs.push(
        `Across Stages 2 and 3, no sustained distractor captures were registered inside moving particle radii, maintaining ${s3.targetFixationPct}% target fixation despite peripheral visual motion.`
      );
    }
  } else if (r.distractorCaptureCount > 0) {
    obs.push(
      `${r.distractorCaptureCount} distinct distractor engagement events were recorded with an average capture duration of ${r.avgDistractionDurationMs} ms.`
    );
  }

  if (r.avgRefocusLatencyMs > 0) {
    obs.push(
      `When gaze shifted away from the primary amber stimulus, attentional recovery averaged ${r.avgRefocusLatencyMs} ms (median ${r.medianRefocusLatencyMs} ms) to re-anchor on center.`
    );
  }

  if (s4 && s4.validObservationMs > 0 && r.responseAccuracyPct !== null) {
    const rtPart =
      r.avgReactionTimeMs !== null
        ? ` with a mean reaction time of ${r.avgReactionTimeMs} ms (SD: ${r.reactionTimeStdDevMs ?? 0} ms)`
        : '';
    obs.push(
      `In Stage 4's double-pulse response task, target detection accuracy reached ${r.responseAccuracyPct}% (${r.correctHitCount}/${r.totalDoublePulses} double pulses identified, ${r.falseAlarmCount} false-alarm presses)${rtPart}.`
    );
  }

  if (Math.abs(r.sustainedConsistencyDeltaPct) >= 5) {
    const trend = r.sustainedConsistencyDeltaPct < 0 ? 'gradually decreased' : 'strengthened';
    obs.push(
      `Comparing the first half (${r.earlySessionFixationPct}%) to the second half (${r.lateSessionFixationPct}%) of valid observation, sustained target fixation ${trend} by ${Math.abs(r.sustainedConsistencyDeltaPct)} percentage points as session duration progressed.`
    );
  } else {
    obs.push(
      `Sustained fixation remained consistent across time, shifting by only ${r.sustainedConsistencyDeltaPct}% between early (${r.earlySessionFixationPct}%) and late (${r.lateSessionFixationPct}%) portions of the session.`
    );
  }

  return obs;
}

function buildRecommendations(
  r: CognitivePerformanceReport
): CognitivePerformanceReport['recommendations'] {
  const recs: CognitivePerformanceReport['recommendations'] = [];

  if (r.distractorCaptureCount >= 5 || r.targetFixationPct < 75) {
    recs.push({
      category: 'environment',
      title: 'Reduce Competing Peripheral Visual Stimuli',
      detail:
        'Because multiple competing visual shifts were observed when peripheral stimuli entered your field of view, consider minimizing open tabs, floating notification badges, and secondary monitor motion during demanding focus blocks.'
    });
  }

  if (r.sustainedConsistencyDeltaPct <= -6 || r.avgRefocusLatencyMs > 750) {
    recs.push({
      category: 'pacing',
      title: 'Experiment with Shorter, Structured Working Intervals',
      detail:
        'Observed attentional recovery latency and late-session drift suggest testing structured 20–30 minute focus cycles paired with deliberate 5-minute sensory resets rather than prolonged continuous sprints.'
    });
  }

  if (r.falseAlarmCount >= 2 || (r.reactionTimeStdDevMs !== null && r.reactionTimeStdDevMs > 140)) {
    recs.push({
      category: 'visual_anchoring',
      title: 'Use Single-Anchor Visual Task Prioritisation',
      detail:
        'Variable response pacing during dual-task demands often benefits from isolating one visible primary objective at a time and hiding upcoming tasks until the current block concludes.'
    });
  }

  recs.push({
    category: 'recovery',
    title: 'Introduce Planned Attentional Recovery Breaks',
    detail:
      'Brief intentional gaze-rest periods between cognitively demanding blocks may support steadier refocusing consistency. These observations are exploratory productivity ideas, not clinical treatment.'
  });

  return recs;
}
