import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  LogOut,
  Pause,
  Play,
  RotateCcw,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Volume2,
  VolumeX
} from 'lucide-react';
import {
  CognitivePerformanceReport,
  DemoProfileId,
  GazeStateType,
  LiveTelemetrySnapshot,
  SimulationStageId,
  TrackingMode
} from '../../services/xr/xrTypes';
import { GazeTrackingEngine } from '../../services/xr/gazeEngine';
import {
  INVESTOR_DEMO_PROFILES,
  STAGE_DEFINITIONS
} from '../../services/xr/investorDemoProfiles';
import { xrSoundEngine } from '../../services/xr/xrSoundEngine';
import { SimulationCanvas } from './SimulationCanvas';

interface SimulationStageManagerProps {
  initialTrackingMode: TrackingMode;
  initialDemoProfileId: DemoProfileId;
  reducedMotion: boolean;
  onToggleReducedMotion: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onCompleteReport: (report: CognitivePerformanceReport) => void;
  onExitToLanding: () => void;
}

const formatClock = (ms: number): string => {
  const safe = Math.max(0, Math.ceil(ms / 1000));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const SimulationStageManager: React.FC<SimulationStageManagerProps> = ({
  initialTrackingMode,
  initialDemoProfileId,
  reducedMotion,
  onToggleReducedMotion,
  soundEnabled,
  onToggleSound,
  onCompleteReport,
  onExitToLanding
}) => {
  const [trackingMode, setTrackingMode] = useState<TrackingMode>(initialTrackingMode);
  const [demoProfileId, setDemoProfileId] = useState<DemoProfileId>(initialDemoProfileId);
  const [currentStageId, setCurrentStageId] = useState<SimulationStageId>(1);
  const [isPreStagePrompt, setIsPreStagePrompt] = useState<boolean>(true);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [focusLostNotice, setFocusLostNotice] = useState<boolean>(false);
  const [stageElapsedMs, setStageElapsedMs] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(
    initialTrackingMode === 'investor_demo_synthetic' ? 2 : 1
  );
  const [gazeState, setGazeState] = useState<GazeStateType>('target');
  const [cptFeedback, setCptFeedback] = useState<{
    text: string;
    tone: 'hit' | 'lure' | 'neutral';
  } | null>(null);
  const [liveTelemetry, setLiveTelemetry] = useState<LiveTelemetrySnapshot>({
    currentGazeState: 'target',
    targetFixationPct: 100,
    distractorCaptures: 0,
    gazeDeviations: 0,
    avgRefocusMs: 0,
    elapsedValidMs: 0,
    stageFixationPct: 100
  });

  const gazeEngineRef = useRef<GazeTrackingEngine>(
    new GazeTrackingEngine(initialTrackingMode, initialDemoProfileId)
  );
  const lastTickRef = useRef<number>(performance.now());
  const cptToastTimerRef = useRef<number | null>(null);

  const stageDef = useMemo(
    () => STAGE_DEFINITIONS.find((s) => s.id === currentStageId)!,
    [currentStageId]
  );
  const stageDurationMs = stageDef.durationSeconds * 1000;

  // Keep sound engine in sync cleanly
  useEffect(() => {
    xrSoundEngine.setEnabled(soundEnabled);
    if (soundEnabled && !isPreStagePrompt && !isPaused && currentStageId < 5) {
      xrSoundEngine.startAmbient();
    } else {
      xrSoundEngine.stopAmbient();
    }
  }, [soundEnabled, isPreStagePrompt, isPaused, currentStageId]);

  useEffect(() => {
    return () => {
      xrSoundEngine.stopAmbient();
      if (cptToastTimerRef.current) window.clearTimeout(cptToastTimerRef.current);
    };
  }, []);

  // Keep GazeTrackingEngine trackingMode synced when user toggles mode
  useEffect(() => {
    gazeEngineRef.current.setTrackingMode(trackingMode, demoProfileId);
  }, [trackingMode, demoProfileId]);

  const showCptToast = useCallback(
    (text: string, tone: 'hit' | 'lure' | 'neutral') => {
      setCptFeedback({ text, tone });
      if (cptToastTimerRef.current) window.clearTimeout(cptToastTimerRef.current);
      cptToastTimerRef.current = window.setTimeout(() => {
        setCptFeedback(null);
      }, 1500);
    },
    []
  );

  // Automatic Focus-Loss / Tab-Visibility Pause Protection
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && !isPreStagePrompt && currentStageId < 5 && !isPaused) {
        setIsPaused(true);
        setFocusLostNotice(true);
        gazeEngineRef.current.setPaused(true);
      }
    };
    const handleBlur = () => {
      if (!isPreStagePrompt && currentStageId < 5 && !isPaused) {
        setIsPaused(true);
        setFocusLostNotice(true);
        gazeEngineRef.current.setPaused(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
    };
  }, [isPreStagePrompt, currentStageId, isPaused]);

  const beginCurrentStage = useCallback(() => {
    if (currentStageId === 5) return;
    gazeEngineRef.current.startStage(currentStageId, 'target');
    setStageElapsedMs(0);
    setIsPaused(false);
    setFocusLostNotice(false);
    setIsPreStagePrompt(false);
    lastTickRef.current = performance.now();
  }, [currentStageId]);

  // Auto-advance pre-stage instruction card briefly in Investor Demo Mode so demo feels effortless
  useEffect(() => {
    if (trackingMode === 'investor_demo_synthetic' && isPreStagePrompt && currentStageId < 5) {
      const timer = window.setTimeout(() => {
        beginCurrentStage();
      }, 1800);
      return () => window.clearTimeout(timer);
    }
  }, [trackingMode, isPreStagePrompt, currentStageId, beginCurrentStage]);

  const advanceToNextStage = useCallback(() => {
    if (currentStageId < 4) {
      xrSoundEngine.playStageTransition();
      const nextId = (currentStageId + 1) as SimulationStageId;
      setCurrentStageId(nextId);
      setStageElapsedMs(0);
      setIsPreStagePrompt(true);
    } else if (currentStageId === 4) {
      xrSoundEngine.playCompletionChord();
      xrSoundEngine.stopAmbient();
      setCurrentStageId(5);
      setIsPreStagePrompt(false);
      setIsPaused(false);
    }
  }, [currentStageId]);

  // Stage Countdown & Live Telemetry Loop
  useEffect(() => {
    if (isPreStagePrompt || isPaused || currentStageId === 5) return;

    lastTickRef.current = performance.now();
    let telemetryTickCounter = 0;

    const interval = window.setInterval(() => {
      const now = performance.now();
      const rawDt = Math.min(200, Math.max(0, now - lastTickRef.current));
      lastTickRef.current = now;
      const effectiveDt = rawDt * playbackSpeed;

      setStageElapsedMs((prev) => {
        const next = prev + effectiveDt;
        if (next >= stageDurationMs) {
          return stageDurationMs;
        }
        return next;
      });

      telemetryTickCounter += 1;
      if (telemetryTickCounter % 2 === 0) {
        setLiveTelemetry(gazeEngineRef.current.getLiveSnapshot());
      }
    }, 100);

    return () => window.clearInterval(interval);
  }, [isPreStagePrompt, isPaused, currentStageId, playbackSpeed, stageDurationMs]);

  // Trigger stage advancement right when stageElapsedMs hits stageDurationMs
  useEffect(() => {
    if (!isPreStagePrompt && currentStageId < 5 && stageElapsedMs >= stageDurationMs) {
      advanceToNextStage();
    }
  }, [stageElapsedMs, stageDurationMs, isPreStagePrompt, currentStageId, advanceToNextStage]);

  // Stage 4 Participant Double-Pulse Response Handler (Spacebar + Screen Button)
  const triggerCPTResponse = useCallback(() => {
    if (currentStageId !== 4 || isPreStagePrompt || isPaused) return;
    const result = gazeEngineRef.current.recordParticipantResponse();
    if (result.outcome === 'correct_hit') {
      showCptToast(`Double Pulse Recorded (${result.reactionMs} ms)`, 'hit');
    } else if (result.outcome === 'false_alarm') {
      showCptToast('Single Pulse / No Double-Pulse Lure', 'lure');
    } else {
      showCptToast('Already recorded for this pulse', 'neutral');
    }
  }, [currentStageId, isPreStagePrompt, isPaused, showCptToast]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && currentStageId === 4 && !isPreStagePrompt && !isPaused) {
        if (e.repeat) return;
        e.preventDefault();
        if (trackingMode === 'interactive_cursor') {
          triggerCPTResponse();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStageId, isPreStagePrompt, isPaused, trackingMode, triggerCPTResponse]);

  const handleTogglePause = () => {
    const nextPaused = !isPaused;
    setIsPaused(nextPaused);
    setFocusLostNotice(false);
    gazeEngineRef.current.setPaused(nextPaused);
    if (!nextPaused) {
      lastTickRef.current = performance.now();
    }
  };

  const handleRestartSimulation = () => {
    gazeEngineRef.current.reset(trackingMode, demoProfileId);
    setCurrentStageId(1);
    setStageElapsedMs(0);
    setIsPaused(false);
    setFocusLostNotice(false);
    setIsPreStagePrompt(true);
    setGazeState('target');
    setLiveTelemetry({
      currentGazeState: 'target',
      targetFixationPct: 100,
      distractorCaptures: 0,
      gazeDeviations: 0,
      avgRefocusMs: 0,
      elapsedValidMs: 0,
      stageFixationPct: 100
    });
  };

  const handleSwitchMode = (nextMode: TrackingMode) => {
    setTrackingMode(nextMode);
    setPlaybackSpeed(nextMode === 'investor_demo_synthetic' ? 2 : 1);
    gazeEngineRef.current.setTrackingMode(nextMode, demoProfileId);
  };

  const handleFinishSession = (status: 'completed' | 'partial') => {
    xrSoundEngine.stopAmbient();
    const report = gazeEngineRef.current.generateReport(status);
    onCompleteReport(report);
  };

  const remainingMs = Math.max(0, stageDurationMs - stageElapsedMs);
  const gazeLabel =
    gazeState === 'target'
      ? 'Target Fixation'
      : gazeState === 'distractor'
      ? 'Distractor Capture'
      : gazeState === 'paused'
      ? 'Paused'
      : 'Peripheral / Outside';

  return (
    <div className="min-h-screen bg-[#05070B] text-slate-100 flex flex-col select-none">
      {/* Minimal Scientific Top HUD */}
      <header className="border-b border-slate-800/80 bg-[#0A0D14]/95 backdrop-blur-md px-4 sm:px-6 py-3 z-30">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Left: Stage Progress Stepper + Status */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => {
                xrSoundEngine.stopAmbient();
                onExitToLanding();
              }}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors whitespace-nowrap shrink-0"
              title="Exit simulation"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exit</span>
            </button>

            <div className="h-4 w-px bg-slate-800" />

            {/* 5 Stage Stepper */}
            <div className="flex items-center gap-1.5" aria-label="Simulation stage progress">
              {STAGE_DEFINITIONS.map((st) => {
                const isDone = st.id < currentStageId;
                const isCurrent = st.id === currentStageId;
                return (
                  <div
                    key={st.id}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors ${
                      isCurrent
                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40'
                        : isDone
                        ? 'bg-slate-800/80 text-slate-300 border border-slate-700/60'
                        : 'text-slate-500 border border-transparent'
                    }`}
                  >
                    <span>0{st.id}</span>
                    <span className="hidden lg:inline font-sans">{st.shortLabel}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Center / Status Indicator */}
          <div className="flex items-center gap-3 text-xs font-mono">
            {currentStageId < 5 && (
              <>
                <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-slate-900 border border-slate-800">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isPaused || isPreStagePrompt
                        ? 'bg-violet-400'
                        : 'bg-emerald-400 animate-pulse'
                    }`}
                  />
                  <span className="text-[11px] tracking-wider text-slate-300 uppercase">
                    Simulated Gaze Tracking Active
                  </span>
                </div>

                <div className="px-3 py-1 rounded-md bg-slate-900 border border-slate-800 text-amber-300 tabular-nums font-medium">
                  {formatClock(remainingMs)}
                </div>
              </>
            )}
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Switch between Interactive & Demo */}
            <div className="hidden sm:flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => handleSwitchMode('interactive_cursor')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap ${
                  trackingMode === 'interactive_cursor'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Interactive
              </button>
              <button
                type="button"
                onClick={() => handleSwitchMode('investor_demo_synthetic')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap ${
                  trackingMode === 'investor_demo_synthetic'
                    ? 'bg-cyan-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Demo Mode
              </button>
            </div>

            {currentStageId < 5 && !isPreStagePrompt && (
              <button
                type="button"
                onClick={handleTogglePause}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
              >
                {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                <span>{isPaused ? 'Resume' : 'Pause'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleRestartSimulation}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Restart session"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={onToggleReducedMotion}
              className={`p-2 rounded-lg border transition-colors ${
                reducedMotion
                  ? 'bg-slate-800 border-amber-500/40 text-amber-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
              title="Toggle Reduced Motion"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={onToggleSound}
              className={`p-2 rounded-lg border transition-colors ${
                soundEnabled
                  ? 'bg-slate-800 border-amber-500/40 text-amber-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
              title={soundEnabled ? 'Mute sound' : 'Unmute optional sound'}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Investor Demo Mode Explicit Banner + Live Updating Telemetry */}
        {trackingMode === 'investor_demo_synthetic' && currentStageId < 5 && (
          <div className="max-w-7xl mx-auto mt-2.5 pt-2.5 border-t border-cyan-500/20 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <span className="px-2.5 py-1 rounded-md bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 font-mono text-[11px] font-medium flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />
                Investor Demo Mode — Synthetic Data
              </span>

              <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                {(Object.keys(INVESTOR_DEMO_PROFILES) as DemoProfileId[]).map((pid) => (
                  <button
                    key={pid}
                    type="button"
                    onClick={() => setDemoProfileId(pid)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors whitespace-nowrap ${
                      demoProfileId === pid
                        ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-500/40'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {INVESTOR_DEMO_PROFILES[pid].shortTitle}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Synthetic Telemetry Readout */}
            <div className="flex flex-wrap items-center gap-4 font-mono text-[11px] text-slate-300">
              <span>
                Fixation:{' '}
                <strong className="text-amber-300 tabular-nums">
                  {liveTelemetry.targetFixationPct}%
                </strong>
              </span>
              <span>
                Captures:{' '}
                <strong className="text-cyan-300 tabular-nums">
                  {liveTelemetry.distractorCaptures}
                </strong>
              </span>
              <span>
                Avg Refocus:{' '}
                <strong className="text-slate-100 tabular-nums">
                  {liveTelemetry.avgRefocusMs > 0 ? `${liveTelemetry.avgRefocusMs} ms` : '—'}
                </strong>
              </span>

              {/* Speed & Skip Controls for Smooth Presentations */}
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-md p-0.5">
                {[1, 2, 3].map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => setPlaybackSpeed(spd)}
                    className={`px-1.5 py-0.5 rounded text-[10px] ${
                      playbackSpeed === spd
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={advanceToNextStage}
                className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-cyan-300 font-sans text-[11px] font-medium flex items-center gap-1 transition-colors"
              >
                <span>Skip Stage</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Spatial Simulation Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-4 relative">
        <div className="relative flex-1 min-h-[480px] sm:min-h-[540px] flex">
          {/* Render Canvas for Stages 1-4 */}
          {currentStageId < 5 && (
            <SimulationCanvas
              stageId={currentStageId}
              isStageRunning={!isPreStagePrompt}
              isPaused={isPaused}
              stageElapsedMs={stageElapsedMs}
              stageDurationMs={stageDurationMs}
              trackingMode={trackingMode}
              demoProfileId={demoProfileId}
              reducedMotion={reducedMotion}
              playbackSpeed={playbackSpeed}
              gazeEngine={gazeEngineRef.current}
              onGazeStateChange={setGazeState}
              onSyntheticCPTResponse={(outcome, rt) => {
                if (outcome === 'correct_hit') {
                  showCptToast(`Synthetic Response: Hit (${rt} ms)`, 'hit');
                } else {
                  showCptToast('Synthetic Response: False Alarm Lure', 'lure');
                }
              }}
            />
          )}

          {/* Bottom Spatial Footer HUD during active Stage */}
          {currentStageId < 5 && !isPreStagePrompt && (
            <div className="pointer-events-none absolute bottom-4 inset-x-4 flex flex-wrap items-end justify-between gap-3 z-10">
              <div className="px-3.5 py-2 rounded-xl bg-[#0B0E17]/85 border border-slate-800/90 backdrop-blur-md text-xs flex items-center gap-3">
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-mono text-slate-300">
                  {stageDef.code} · {stageDef.title}
                </span>
                <span className="text-slate-600">|</span>
                <span
                  className={`font-mono text-[11px] ${
                    gazeState === 'target'
                      ? 'text-amber-300'
                      : gazeState === 'distractor'
                      ? 'text-cyan-300'
                      : 'text-slate-400'
                  }`}
                >
                  {gazeLabel}
                </span>
              </div>

              {/* Stage 4 Interactive Response Control Button + Toast */}
              {currentStageId === 4 && (
                <div className="pointer-events-auto flex items-center gap-3">
                  {cptFeedback && (
                    <div
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono border backdrop-blur-md ${
                        cptFeedback.tone === 'hit'
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                          : cptFeedback.tone === 'lure'
                          ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                          : 'bg-slate-800/90 border-slate-700 text-slate-300'
                      }`}
                    >
                      {cptFeedback.text}
                    </div>
                  )}

                  {trackingMode === 'interactive_cursor' && (
                    <button
                      type="button"
                      onClick={triggerCPTResponse}
                      className="px-4 py-2 rounded-xl bg-amber-500/90 hover:bg-amber-400 text-slate-950 font-semibold text-xs shadow-lg transition-all active:scale-95"
                    >
                      Double Pulse Detected [SPACEBAR]
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Pre-Stage Concise Instruction Overlay */}
          {currentStageId < 5 && isPreStagePrompt && (
            <div className="absolute inset-0 bg-[#05070B]/80 backdrop-blur-sm rounded-2xl flex items-center justify-center p-6 z-20">
              <div className="max-w-lg w-full bg-[#0C1018] border border-slate-800 rounded-2xl p-8 text-center space-y-6 shadow-2xl">
                <div className="text-xs font-mono text-amber-400 uppercase tracking-widest">
                  {stageDef.code} · {stageDef.title} ({stageDef.durationSeconds}s)
                </div>

                <div className="space-y-3">
                  {stageDef.instructions.map((line, i) => (
                    <p
                      key={i}
                      className={`${
                        i === 0
                          ? 'text-lg font-medium text-white'
                          : 'text-sm text-slate-300'
                      } leading-relaxed`}
                    >
                      {line}
                    </p>
                  ))}
                </div>

                <div className="pt-2 flex flex-col items-center gap-3">
                  <button
                    type="button"
                    onClick={beginCurrentStage}
                    className="px-8 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm transition-all flex items-center gap-2 shadow-lg shadow-amber-500/15"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>START</span>
                  </button>

                  {trackingMode === 'investor_demo_synthetic' && (
                    <span className="text-[11px] font-mono text-cyan-400">
                      Investor Demo auto-starting stage...
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Paused / Focus-Loss Protection Overlay */}
          {currentStageId < 5 && !isPreStagePrompt && isPaused && (
            <div className="absolute inset-0 bg-[#05070B]/85 backdrop-blur-md rounded-2xl flex items-center justify-center p-6 z-20">
              <div className="max-w-md w-full bg-[#0C1018] border border-slate-800 rounded-2xl p-7 text-center space-y-5 shadow-2xl">
                <div className="w-10 h-10 rounded-full bg-violet-500/15 border border-violet-500/30 flex items-center justify-center mx-auto text-violet-400">
                  {focusLostNotice ? (
                    <ShieldAlert className="w-5 h-5" />
                  ) : (
                    <Pause className="w-5 h-5" />
                  )}
                </div>

                <div className="space-y-2">
                  <h2 className="text-lg font-semibold text-white">
                    {focusLostNotice ? 'Window Focus Paused' : 'Simulation Paused'}
                  </h2>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {focusLostNotice
                      ? 'The browser window lost focus. Simulation timing paused automatically and unfocused intervals were marked as paused rather than attentional drift.'
                      : 'Gaze tracking is paused. Resume when you are ready to continue this stage.'}
                  </p>
                </div>

                <div className="flex flex-col gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={handleTogglePause}
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm transition-colors"
                  >
                    Resume Stage
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFinishSession('partial')}
                    className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs transition-colors"
                  >
                    End Early &amp; View Partial Report
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      xrSoundEngine.stopAmbient();
                      onExitToLanding();
                    }}
                    className="w-full py-2 text-xs text-slate-400 hover:text-white transition-colors"
                  >
                    Exit Without Saving
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Stage 5: Session Completion Screen */}
          {currentStageId === 5 && (
            <div className="w-full rounded-2xl border border-slate-800 bg-[#070A11] flex items-center justify-center p-8">
              <div className="max-w-lg w-full text-center space-y-6">
                <div className="w-14 h-14 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
                  <CheckCircle2 className="w-7 h-7" />
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-mono text-amber-400 uppercase tracking-widest">
                    STAGE 05 · Session Completion
                  </div>
                  <h2 className="text-3xl font-semibold text-white tracking-tight">
                    Your Focus Experience Is Complete.
                  </h2>
                  <p className="text-sm text-slate-300">
                    Your session data has been processed.
                  </p>
                </div>

                <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleFinishSession('completed')}
                    className="px-7 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm transition-all flex items-center gap-2 shadow-lg shadow-amber-500/15"
                  >
                    <span>View My Results</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={handleRestartSimulation}
                    className="px-5 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-medium text-sm transition-colors"
                  >
                    Restart Experience
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
