import React, { useEffect, useState, useRef } from 'react';
import { Wind, Pause, Play, ShieldAlert, Sparkles } from 'lucide-react';

export interface FocusPulseProps {
  todayFocusMinutes: number;
  hasRecentHighLoad: boolean;
  isFocusActive?: boolean;
  onOpenZenRecovery?: () => void;
}

type PaceMode = 'auto' | 'coherent' | 'recovery';
type BreathStage = 'Inhale' | 'Hold' | 'Exhale';

interface PaceProfile {
  label: string;
  tier: 'nominal' | 'elevated' | 'recovery';
  inhaleSec: number;
  holdSec: number;
  exhaleSec: number;
  guidance: string;
}

function resolvePaceProfile(
  mode: PaceMode,
  todayFocusMinutes: number,
  hasRecentHighLoad: boolean
): PaceProfile {
  if (mode === 'coherent') {
    return {
      label: 'Coherent Flow',
      tier: 'nominal',
      inhaleSec: 4,
      holdSec: 0,
      exhaleSec: 4,
      guidance: 'Steady 4-4 cadence to sustain relaxed executive attention.',
    };
  }

  if (mode === 'recovery' || todayFocusMinutes >= 360 || hasRecentHighLoad) {
    return {
      label: 'Burnout Recovery Pace',
      tier: 'recovery',
      inhaleSec: 4,
      holdSec: 4,
      exhaleSec: 8,
      guidance:
        todayFocusMinutes >= 360 || hasRecentHighLoad
          ? 'High neural load detected — extended 8s exhales activate parasympathetic recovery.'
          : 'Deep 4-4-8 vagal downshift to release cognitive tension.',
    };
  }

  if (todayFocusMinutes >= 240) {
    return {
      label: 'Load Downshift',
      tier: 'elevated',
      inhaleSec: 4,
      holdSec: 0,
      exhaleSec: 6,
      guidance: '4+ hours logged today — longer exhales guard against afternoon fatigue.',
    };
  }

  return {
    label: 'Coherent Flow',
    tier: 'nominal',
    inhaleSec: 4,
    holdSec: 0,
    exhaleSec: 4,
    guidance: 'Rhythmic 4-4 pacing synced cleanly for intense focus blocks.',
  };
}

export const FocusPulse: React.FC<FocusPulseProps> = ({
  todayFocusMinutes,
  hasRecentHighLoad,
  isFocusActive = false,
  onOpenZenRecovery,
}) => {
  type BurnoutLevel = 'none' | 'approaching' | 'critical';
  const burnoutLevel: BurnoutLevel =
    todayFocusMinutes >= 360 || hasRecentHighLoad
      ? 'critical'
      : todayFocusMinutes >= 240
        ? 'approaching'
        : 'none';
  const isNearingBurnout = burnoutLevel !== 'none';

  const [paceMode, setPaceMode] = useState<PaceMode>('auto');
  // Always paused initially unless user starts it or burnout threshold is already reached/approaching
  const [isActive, setIsActive] = useState<boolean>(() => burnoutLevel !== 'none');
  const [hasEverStarted, setHasEverStarted] = useState<boolean>(() => burnoutLevel !== 'none');
  const [reducedMotion, setReducedMotion] = useState(false);

  const prevBurnoutLevelRef = useRef<BurnoutLevel>(burnoutLevel);
  const manualLockActiveRef = useRef<boolean>(false);

  // Escalate & auto-activate ONLY when user enters or escalates toward burnout
  useEffect(() => {
    const prevLevel = prevBurnoutLevelRef.current;
    prevBurnoutLevelRef.current = burnoutLevel;

    if (burnoutLevel === 'none') {
      // Return to paused standby if user hadn't explicitly started Focus Pulse themselves
      if (!manualLockActiveRef.current) {
        setIsActive(false);
      }
      return;
    }

    const escalated =
      (prevLevel === 'none' && (burnoutLevel === 'approaching' || burnoutLevel === 'critical')) ||
      (prevLevel === 'approaching' && burnoutLevel === 'critical');

    if (escalated) {
      setIsActive(true);
      setHasEverStarted(true);
    }
  }, [burnoutLevel]);

  const isPaused = !isActive;
  const profile = resolvePaceProfile(paceMode, todayFocusMinutes, hasRecentHighLoad);
  const totalCycleSec = profile.inhaleSec + profile.holdSec + profile.exhaleSec;

  const [animState, setAnimState] = useState<{
    progress: number; // 0.0 (contracted) to 1.0 (expanded)
    stage: BreathStage;
    remainingSec: number;
  }>({
    progress: 0.15,
    stage: 'Inhale',
    remainingSec: profile.inhaleSec,
  });

  const elapsedOffsetRef = useRef<number>(0);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  useEffect(() => {
    if (isPaused) return;

    let rafId = 0;
    const startTs = performance.now() - elapsedOffsetRef.current * 1000;

    const tick = (now: number) => {
      const elapsedSec = (now - startTs) / 1000;
      elapsedOffsetRef.current = elapsedSec % totalCycleSec;
      const cyclePos = elapsedOffsetRef.current;

      let stage: BreathStage = 'Inhale';
      let remaining = 0;
      let progress = 0;

      if (cyclePos < profile.inhaleSec) {
        stage = 'Inhale';
        const ratio = cyclePos / profile.inhaleSec;
        progress = 0.5 - 0.5 * Math.cos(Math.PI * ratio);
        remaining = Math.max(1, Math.ceil(profile.inhaleSec - cyclePos));
      } else if (cyclePos < profile.inhaleSec + profile.holdSec) {
        stage = 'Hold';
        progress = 1;
        remaining = Math.max(1, Math.ceil(profile.inhaleSec + profile.holdSec - cyclePos));
      } else {
        stage = 'Exhale';
        const exhaleElapsed = cyclePos - profile.inhaleSec - profile.holdSec;
        const ratio = exhaleElapsed / profile.exhaleSec;
        progress = 0.5 + 0.5 * Math.cos(Math.PI * ratio);
        remaining = Math.max(1, Math.ceil(profile.exhaleSec - exhaleElapsed));
      }

      if (reducedMotion) {
        progress = 0.5;
      }

      setAnimState({ progress, stage, remainingSec: remaining });
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPaused, profile.inhaleSec, profile.holdSec, profile.exhaleSec, totalCycleSec, reducedMotion]);

  const handleToggleActive = () => {
    setIsActive((prev) => {
      const next = !prev;
      manualLockActiveRef.current = next;
      if (next) {
        setHasEverStarted(true);
      }
      return next;
    });
  };

  const tierColors =
    profile.tier === 'recovery'
      ? {
          cardBorder: 'border-rose-300/75 dark:border-rose-500/35',
          cardBg: 'bg-gradient-to-br from-rose-50/80 via-amber-50/50 to-white dark:from-rose-950/35 dark:via-slate-950/70 dark:to-slate-900/80',
          accentText: 'text-rose-700 dark:text-rose-300',
          haloBg: 'bg-rose-500/20 dark:bg-rose-400/20',
          coreBg: 'from-rose-700 via-red-600 to-amber-700',
          ringBorder: 'border-rose-400/40 dark:border-rose-400/35',
        }
      : profile.tier === 'elevated'
        ? {
            cardBorder: 'border-amber-300/75 dark:border-amber-500/30',
            cardBg: 'bg-gradient-to-br from-amber-50/75 via-[#F2F9FC] to-white dark:from-amber-950/25 dark:via-slate-950/70 dark:to-slate-900/70',
            accentText: 'text-amber-700 dark:text-amber-300',
            haloBg: 'bg-amber-500/20 dark:bg-amber-400/20',
            coreBg: 'from-amber-700 via-orange-600 to-blue-700',
            ringBorder: 'border-amber-400/40 dark:border-amber-400/35',
          }
        : {
            cardBorder: 'border-sky-900/10 dark:border-white/5',
            cardBg: 'bg-[#F2F9FC] dark:bg-slate-950/50',
            accentText: 'text-blue-700 dark:text-blue-400',
            haloBg: 'bg-blue-500/18 dark:bg-blue-400/20',
            coreBg: 'from-blue-700 via-indigo-600 to-teal-700',
            ringBorder: 'border-blue-400/35 dark:border-blue-400/30',
          };

  const orbScale = isPaused ? 0.72 : 0.68 + animState.progress * 0.36;
  const haloScale = isPaused ? 0.76 : 0.72 + animState.progress * 0.56;
  const haloOpacity = isPaused ? 0.18 : 0.25 + animState.progress * 0.55;

  const cadenceText =
    profile.holdSec > 0
      ? `${profile.inhaleSec}s · ${profile.holdSec}s · ${profile.exhaleSec}s`
      : `${profile.inhaleSec}s · ${profile.exhaleSec}s`;

  return (
    <div
      className={`p-5 rounded-2xl border ${tierColors.cardBorder} ${tierColors.cardBg} space-y-3.5 transition-colors duration-500`}
    >
      {/* Header Row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {isNearingBurnout ? (
            <ShieldAlert className={`w-3.5 h-3.5 shrink-0 ${tierColors.accentText}`} />
          ) : (
            <Wind className={`w-3.5 h-3.5 shrink-0 ${tierColors.accentText}`} />
          )}
          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest truncate">
            Focus Pulse
          </span>
        </div>

        <button
          type="button"
          onClick={handleToggleActive}
          className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors flex items-center gap-1 shrink-0 ${
            isPaused
              ? 'bg-blue-600 hover:bg-blue-500 border-blue-500 text-white shadow-sm'
              : 'bg-white/85 dark:bg-slate-900/80 border-sky-900/10 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:text-blue-700 dark:hover:text-white'
          }`}
          aria-label={isPaused ? 'Activate Focus Pulse' : 'Pause Focus Pulse'}
        >
          {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
          <span>{isPaused ? (hasEverStarted ? 'Resume' : 'Start') : 'Pause'}</span>
        </button>
      </div>

      {/* Visible Burnout Alert Banner when approaching or exceeding threshold */}
      {isNearingBurnout && (
        <div
          role="status"
          aria-live="polite"
          className={`p-3 rounded-xl border text-[11px] leading-relaxed flex items-start gap-2 ${
            burnoutLevel === 'critical'
              ? 'bg-rose-100/85 dark:bg-rose-500/15 border-rose-300 dark:border-rose-500/35 text-rose-900 dark:text-rose-200'
              : 'bg-amber-100/85 dark:bg-amber-500/15 border-amber-300 dark:border-amber-500/35 text-amber-900 dark:text-amber-200'
          }`}
        >
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <div className="font-extrabold">
              {burnoutLevel === 'critical'
                ? 'Burnout Warning · Focus Pulse Engaged'
                : 'Approaching Burnout · Slow Your Pace'}
            </div>
            <p className="mt-0.5 opacity-95">
              {isPaused
                ? 'You are nearing burnout — start the Focus Pulse to steady your breathing and protect your focus.'
                : burnoutLevel === 'critical'
                  ? 'High neural load detected. Follow this recovery pulse or take a guided Zen break.'
                  : 'You are nearing your burnout threshold. Focus Pulse started automatically to keep your pace calm.'}
            </p>
          </div>
        </div>
      )}

      {/* Burnout-Paired Status Metadata */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] tabular-nums">
        <span className={`font-bold ${tierColors.accentText}`}>
          {isPaused ? 'Standby · Paused' : profile.label}
          {isFocusActive && !isPaused ? ' · Lock Active' : ''}
        </span>
        <span className="font-mono text-slate-500 dark:text-slate-400">
          {cadenceText}
        </span>
      </div>

      {/* Concentric Compositor Breathing Orb */}
      <div className="relative h-36 flex items-center justify-center select-none overflow-hidden rounded-xl bg-white/60 dark:bg-slate-900/60 border border-sky-900/5 dark:border-white/5">
        {/* Outer reference boundary ring */}
        <div
          aria-hidden="true"
          className={`absolute w-28 h-28 rounded-full border border-dashed ${tierColors.ringBorder}`}
        />

        {/* Expanding / contracting outer halo */}
        <div
          aria-hidden="true"
          style={{
            transform: `scale(${haloScale})`,
            opacity: haloOpacity,
          }}
          className={`absolute w-24 h-24 rounded-full ${tierColors.haloBg} blur-md will-change-transform`}
        />

        {/* Primary luminous core orb */}
        <div
          aria-hidden="true"
          style={{
            transform: `scale(${orbScale})`,
          }}
          className={`absolute w-24 h-24 rounded-full bg-gradient-to-tr ${tierColors.coreBg} shadow-lg will-change-transform transition-opacity duration-300 ${
            isPaused ? 'opacity-70' : 'opacity-90'
          }`}
        />

        {/* Crisp centered breath cue & countdown */}
        <div className="relative z-10 text-center pointer-events-none px-2">
          <div className="text-xs font-extrabold text-white tracking-wide drop-shadow-sm">
            {isPaused ? 'Paused' : animState.stage}
          </div>
          <div className="text-[10px] font-mono font-bold text-white/95 tabular-nums drop-shadow-sm mt-0.5">
            {isPaused ? 'Start manually' : `${animState.remainingSec}s`}
          </div>
        </div>
      </div>

      {/* Guidance & Mode Switcher */}
      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
        {isPaused && !isNearingBurnout
          ? 'Stays paused until you activate it—or starts automatically with an alert if you approach burnout.'
          : profile.guidance}
      </p>

      <div className="flex items-center gap-1 p-1 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-sky-900/10 dark:border-white/5">
        {(
          [
            { id: 'auto', label: 'Load-Synced' },
            { id: 'coherent', label: '4·4 Flow' },
            { id: 'recovery', label: '4·4·8 Reset' },
          ] as { id: PaceMode; label: string }[]
        ).map((tab) => {
          const active = paceMode === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setPaceMode(tab.id)}
              className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold transition-colors whitespace-nowrap ${
                active
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Direct Burnout Recovery Trigger when Elevated or Recovery Threshold Flagged */}
      {isNearingBurnout && onOpenZenRecovery && (
        <button
          type="button"
          onClick={onOpenZenRecovery}
          className="w-full py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          <span>Open Guided Zen Recovery</span>
        </button>
      )}
    </div>
  );
};
