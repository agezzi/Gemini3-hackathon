import React, { useState, useMemo, useEffect } from 'react';
import {
  Zap,
  Sparkles,
  Clock,
  ShieldAlert,
  Waves,
  Circle,
  Trophy,
  Star,
  PartyPopper,
  Target,
  ArrowUpRight,
  Volume2,
  Pause,
  Play,
  Square,
  ListChecks,
  AlignLeft,
  Feather,
  Layers,
  Coffee,
  Lightbulb,
  ArrowRight,
} from 'lucide-react';
import { BurnoutAlert } from '../types';
import { readAloud, SpeechStateSnapshot } from '../services/speechService';

interface ResultCardProps {
  title: string;
  content: string;
  type: 'insights' | 'plan' | 'explanation';
  quickWins?: string[];
  burnoutAlert?: BurnoutAlert;
  onReset?: () => void;
  onSetMainGoal?: (goal: string) => void;
  activeMainGoal?: string | null;
  simplifiedDefault?: boolean;
  speechRate?: number;
}

type PlanLoadKind = 'high' | 'med' | 'low' | 'transition' | 'neutral';

interface ParsedPlanRow {
  timeWindow: string | null;
  loadKind: PlanLoadKind;
  loadLabel: string | null;
  bodyText: string;
}

const parsePlanLine = (rawLine: string): ParsedPlanRow => {
  let line = rawLine.replace(/^[-•*]\s*/, '').trim();
  let timeWindow: string | null = null;
  let loadKind: PlanLoadKind = 'neutral';
  let loadLabel: string | null = null;

  const timeMatch = line.match(/^(\d{1,2}:\d{2}(?:\s*(?:AM|PM))?(?:\s*[-–]\s*\d{1,2}:\d{2}(?:\s*(?:AM|PM))?)?)\s*:\s*(.*)$/i);
  if (timeMatch) {
    timeWindow = timeMatch[1].trim();
    line = timeMatch[2].trim();
  }

  const tagMatch = line.match(/\[(High|Med|Low|High Load|Med Load|Low Load|Transition)\]/i);
  if (tagMatch) {
    const tag = tagMatch[1].toLowerCase();
    if (tag.includes('high')) {
      loadKind = 'high';
      loadLabel = 'High focus';
    } else if (tag.includes('med')) {
      loadKind = 'med';
      loadLabel = 'Medium focus';
    } else if (tag.includes('low')) {
      loadKind = 'low';
      loadLabel = 'Light task';
    } else if (tag.includes('transition')) {
      loadKind = 'transition';
      loadLabel = 'Reset buffer';
    }
    line = line.replace(tagMatch[0], '').replace(/\s+/g, ' ').trim();
  }

  return {
    timeWindow,
    loadKind,
    loadLabel,
    bodyText: line,
  };
};

const splitReadableBullets = (text: string): string[] => {
  const lines = text
    .split('\n')
    .map((l) => l.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean);

  const bullets: string[] = [];
  for (const line of lines) {
    const sentences = line
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (sentences.length > 1) {
      bullets.push(...sentences);
    } else {
      bullets.push(line);
    }
  }
  return bullets;
};

export const ResultCard: React.FC<ResultCardProps> = ({
  title,
  content,
  type,
  quickWins,
  burnoutAlert,
  onReset,
  onSetMainGoal,
  activeMainGoal,
  simplifiedDefault = false,
  speechRate = 1,
}) => {
  const [completedWins, setCompletedWins] = useState<number[]>([]);
  const [lastChecked, setLastChecked] = useState<number | null>(null);
  const [showReward, setShowReward] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isEasyRead, setIsEasyRead] = useState<boolean>(simplifiedDefault);
  const [speechState, setSpeechState] = useState<SpeechStateSnapshot>(() => readAloud.getState());

  useEffect(() => {
    setIsEasyRead(simplifiedDefault);
  }, [simplifiedDefault]);

  useEffect(() => {
    return readAloud.subscribe(setSpeechState);
  }, []);

  const speechCardId = `result-card-${type}`;
  const isThisCardSpeaking = speechState.activeId === speechCardId && speechState.status === 'speaking';
  const isThisCardPaused = speechState.activeId === speechCardId && speechState.status === 'paused';

  const buildSpokenScript = () => {
    const parts: string[] = [`${title}.`];
    if (type === 'plan' && burnoutAlert) {
      parts.push(`Burnout warning: ${burnoutAlert.message}. Recovery step: ${burnoutAlert.recoveryAction}.`);
    }
    if (type === 'plan' && quickWins && quickWins.length > 0) {
      parts.push(`Quick wins to get started: ${quickWins.join('. ')}.`);
    }
    parts.push(content);
    return parts.join(' ');
  };

  const handleToggleSpeech = () => {
    if (isThisCardSpeaking) {
      readAloud.pause();
    } else if (isThisCardPaused) {
      readAloud.resume();
    } else {
      readAloud.speak(buildSpokenScript(), speechCardId, speechRate);
    }
  };

  const toggleWin = (idx: number) => {
    const isChecking = !completedWins.includes(idx);
    const newCompleted = isChecking
      ? [...completedWins, idx]
      : completedWins.filter((i) => i !== idx);

    setCompletedWins(newCompleted);

    if (isChecking) {
      setLastChecked(idx);
      setShowReward(true);
      setTimeout(() => setShowReward(false), 1000);

      if (quickWins && newCompleted.length === quickWins.length) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 4000);
      }
    }
  };

  const progress = useMemo(() => {
    if (!quickWins || quickWins.length === 0) return 0;
    return (completedWins.length / quickWins.length) * 100;
  }, [completedWins, quickWins]);

  const statusMessage = useMemo(() => {
    if (progress === 0) return 'Standby';
    if (progress < 40) return 'Momentum Building';
    if (progress < 70) return 'Neural Sync Active';
    if (progress < 100) return 'Threshold Approaching';
    return 'Flow State Locked';
  }, [progress]);

  const getColors = () => {
    switch (type) {
      case 'insights':
        return 'border-amber-300/70 dark:border-amber-500/30 bg-white/95 dark:bg-amber-500/5 text-slate-800 dark:text-amber-100';
      case 'plan':
        return 'border-blue-300/60 dark:border-emerald-500/40 bg-white/95 dark:bg-slate-900/80 text-slate-800 dark:text-emerald-50';
      case 'explanation':
        return 'border-violet-300/60 dark:border-blue-500/30 bg-white/95 dark:bg-blue-500/5 text-slate-700 dark:text-slate-300';
    }
  };

  const getHeaderColor = () => {
    switch (type) {
      case 'insights':
        return 'text-amber-700 dark:text-amber-400';
      case 'plan':
        return 'text-blue-700 dark:text-emerald-400';
      case 'explanation':
        return 'text-violet-700 dark:text-blue-400';
    }
  };

  const formatPlanLine = (line: string) => {
    if (type !== 'plan') return line;
    return line.replace(/\[(High|Med|Low|High Load|Med Load|Low Load|Transition)\]/gi, (match) => {
      const lower = match.toLowerCase();
      const color = lower.includes('high')
        ? 'bg-red-500/15 text-red-700 dark:text-red-400'
        : lower.includes('med')
          ? 'bg-amber-500/15 text-amber-800 dark:text-amber-400'
          : lower.includes('transition')
            ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300'
            : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400';
      return `<span class="${color} px-2 py-0.5 rounded text-xs font-bold border border-current/20">${match.slice(1, -1)}</span>`;
    });
  };

  const renderPlanLoadBadge = (kind: PlanLoadKind, label: string | null) => {
    if (!label) return null;
    if (kind === 'high') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 dark:text-rose-300">
          <Zap className="w-3.5 h-3.5 shrink-0" />
          <span>{label}</span>
        </span>
      );
    }
    if (kind === 'med') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 dark:text-amber-300">
          <Layers className="w-3.5 h-3.5 shrink-0" />
          <span>{label}</span>
        </span>
      );
    }
    if (kind === 'transition') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 dark:text-blue-300">
          <Coffee className="w-3.5 h-3.5 shrink-0" />
          <span>{label}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
        <Feather className="w-3.5 h-3.5 shrink-0" />
        <span>{label}</span>
      </span>
    );
  };

  const simplifiedBullets = useMemo(() => splitReadableBullets(content), [content]);
  const parsedPlanRows = useMemo(
    () =>
      content
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .map(parsePlanLine),
    [content]
  );

  return (
    <div
      className={`border rounded-[2rem] p-6 mb-6 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 shadow-[0_14px_40px_-14px_rgba(37,99,235,0.1)] dark:shadow-xl backdrop-blur-xl relative overflow-hidden ${getColors()}`}
    >
      <style>{`
        @keyframes float-up-fade {
          0% { transform: translateY(0) scale(0.5); opacity: 0; }
          20% { opacity: 1; transform: translateY(-20px) scale(1.1); }
          100% { transform: translateY(-50px) scale(1); opacity: 0; }
        }
        @keyframes check-pop {
          0% { transform: scale(0.8); }
          50% { transform: scale(1.25); }
          100% { transform: scale(1); }
        }
        @keyframes confetti-fall {
          0% { transform: translateY(-100%) rotate(0deg); opacity: 1; }
          100% { transform: translateY(1000%) rotate(360deg); opacity: 0; }
        }
        @keyframes draw-checkmark {
          from { stroke-dashoffset: 100; }
          to { stroke-dashoffset: 0; }
        }
        .animate-reward { animation: float-up-fade 1s ease-out forwards; }
        .animate-check-pop { animation: check-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .checkmark-path { stroke-dasharray: 100; animation: draw-checkmark 0.5s ease-out forwards; }
        .confetti-particle {
          position: absolute;
          width: 6px;
          height: 6px;
          background: #3b82f6;
          top: -10px;
          animation: confetti-fall 3s linear forwards;
          z-index: 50;
        }
      `}</style>

      {showConfetti &&
        Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            className="confetti-particle"
            style={{
              left: `${Math.random() * 100}%`,
              backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][
                Math.floor(Math.random() * 5)
              ],
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          />
        ))}

      {/* Burnout Alert Section */}
      {type === 'plan' && burnoutAlert && (
        <div
          className={`mb-8 p-6 rounded-2xl border-2 shadow-lg ${
            burnoutAlert.level === 'critical'
              ? 'bg-red-50 dark:bg-red-500/10 border-red-300 dark:border-red-500/40'
              : 'bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/40'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <ShieldAlert
                className={`w-6 h-6 ${
                  burnoutAlert.level === 'critical'
                    ? 'text-red-600 dark:text-red-500'
                    : 'text-amber-600 dark:text-amber-500'
                }`}
              />
              <span
                className={`text-xs font-bold ${
                  burnoutAlert.level === 'critical'
                    ? 'text-red-700 dark:text-red-400'
                    : 'text-amber-800 dark:text-amber-400'
                }`}
              >
                {burnoutAlert.level === 'critical' ? 'High' : 'Moderate'} Burnout Risk Detected
              </span>
            </div>
          </div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-5 leading-relaxed">
            {burnoutAlert.message}
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <div className="flex-grow bg-white/85 dark:bg-black/40 p-4 rounded-xl border border-sky-900/10 dark:border-white/5 flex items-center gap-4">
              <Waves className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
              <div>
                <span className="block text-xs font-bold text-blue-700 dark:text-blue-400">
                  Recovery Step
                </span>
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  {burnoutAlert.recoveryAction}
                </span>
              </div>
            </div>
            <button
              onClick={onReset}
              className="whitespace-nowrap bg-slate-900 dark:bg-white text-white dark:text-slate-950 px-4 py-3 rounded-xl font-bold text-xs hover:scale-105 active:scale-95 transition-all"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Header Row with Read-Aloud & Easy-Read Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5 min-w-0">
          <h3 className={`text-lg font-bold flex items-center gap-2 ${getHeaderColor()}`}>
            <span>{title}</span>
          </h3>
          {type === 'plan' && (
            <span className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              <span aria-hidden="true">·</span>
              <Sparkles className="w-3.5 h-3.5" />
              <span>Burnout-Resistant</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Easy-Read Bullet Toggle */}
          <button
            type="button"
            onClick={() => setIsEasyRead((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap min-h-[36px] ${
              isEasyRead
                ? 'bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-200 border-blue-300 dark:border-blue-500/40'
                : 'bg-[#F2F9FC] dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-sky-900/10 dark:border-white/10 hover:bg-sky-100/70 dark:hover:bg-slate-700'
            }`}
            title={isEasyRead ? 'Switch to standard paragraph formatting' : 'Switch to scannable bullets & visual icons'}
          >
            {isEasyRead ? <AlignLeft className="w-3.5 h-3.5" /> : <ListChecks className="w-3.5 h-3.5" />}
            <span>{isEasyRead ? 'Standard View' : 'Easy-Read'}</span>
          </button>

          {/* Read Aloud Audio Controls */}
          {readAloud.isSupported() && (
            <div className="inline-flex items-center gap-1">
              <button
                type="button"
                onClick={handleToggleSpeech}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap min-h-[36px] ${
                  isThisCardSpeaking || isThisCardPaused
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-[#F2F9FC] dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-sky-900/10 dark:border-white/10 hover:bg-sky-100/70 dark:hover:bg-slate-700'
                }`}
                title={isThisCardSpeaking ? 'Pause reading aloud' : isThisCardPaused ? 'Resume reading aloud' : `Listen to ${title}`}
              >
                {isThisCardSpeaking ? (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    <span>Pause</span>
                  </>
                ) : isThisCardPaused ? (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Resume</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Listen</span>
                  </>
                )}
              </button>

              {(isThisCardSpeaking || isThisCardPaused) && (
                <button
                  type="button"
                  onClick={() => readAloud.stop()}
                  className="p-2 rounded-xl bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 hover:bg-rose-100 transition-colors min-h-[36px]"
                  title="Stop reading aloud"
                  aria-label="Stop reading aloud"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick Wins Section */}
      {type === 'plan' && quickWins && quickWins.length > 0 && (
        <div className="mb-8 p-6 bg-[#F2F9FC] dark:bg-slate-950/60 border border-sky-900/10 dark:border-white/10 rounded-[2rem] animate-in zoom-in-95 duration-500 relative overflow-hidden group/wins shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-5">
              <div className="relative w-16 h-16 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90">
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="transparent"
                    className="text-sky-200 dark:text-slate-800"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="transparent"
                    strokeDasharray={176}
                    strokeDashoffset={176 - (progress / 100) * 176}
                    className="text-amber-500 transition-all duration-700 ease-out"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Zap
                    className={`w-6 h-6 ${
                      progress > 0 ? 'text-amber-500 animate-pulse' : 'text-slate-400 dark:text-slate-700'
                    }`}
                  />
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-amber-700 dark:text-orange-400 block mb-0.5">
                  Starter Quick Wins
                </span>
                <div className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  {statusMessage}
                  <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-blue-600 via-violet-500 to-amber-500 tabular-nums leading-none">
                {Math.round(progress)}%
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">
                Done
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {quickWins.map((win, idx) => {
              const isCompleted = completedWins.includes(idx);
              const isLastChecked = lastChecked === idx;

              return (
                <div key={idx} className="relative">
                  {isLastChecked && showReward && (
                    <div className="absolute left-10 top-0 z-50 pointer-events-none animate-reward">
                      <div className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-xl border border-white/20">
                        <Star className="w-3 h-3 fill-current" />
                        Nice Start
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => toggleWin(idx)}
                    className={`w-full text-left flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 group/win relative overflow-hidden active:scale-95 ${
                      isCompleted
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/40'
                        : 'bg-white/95 dark:bg-slate-900/40 border-sky-900/10 dark:border-white/5 hover:border-blue-400/50 dark:hover:border-orange-500/30'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 relative z-10 shrink-0 ${
                        isCompleted
                          ? 'bg-emerald-500 shadow-md shadow-emerald-500/30 animate-check-pop'
                          : 'bg-[#EEF7FA] dark:bg-slate-800 border border-sky-900/10 dark:border-white/5'
                      }`}
                    >
                      {isCompleted ? (
                        <svg
                          className="w-4 h-4 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="4"
                        >
                          <path
                            className="checkmark-path"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : (
                        <Circle className="w-4 h-4 text-slate-400 dark:text-slate-600 group-hover/win:text-blue-500 transition-colors" />
                      )}
                    </div>

                    <span
                      className={`text-sm font-semibold transition-all duration-300 relative z-10 flex-grow ${
                        isCompleted
                          ? 'text-emerald-700 dark:text-emerald-300 line-through opacity-60'
                          : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {win}
                    </span>

                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0 tabular-nums">
                      <Clock className="w-3.5 h-3.5" />
                      &lt;5m
                    </div>
                  </button>
                </div>
              );
            })}
          </div>

          {progress === 100 && (
            <div className="mt-6 p-6 bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-300 dark:border-emerald-500/40 rounded-3xl flex flex-col items-center justify-center gap-3 animate-in fade-in slide-in-from-top-4 duration-700">
              <div className="relative">
                <Trophy className="w-12 h-12 text-emerald-500 dark:text-emerald-400 animate-bounce" />
                <PartyPopper className="absolute -top-2 -right-3 w-7 h-7 text-amber-500" />
              </div>
              <div className="text-center">
                <span className="block text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-1">
                  Quick Wins Complete
                </span>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Great momentum. You are ready for your next block.
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Body Presentation: Easy-Read Scannable Bullets + Icons OR Standard */}
      {isEasyRead ? (
        type === 'plan' ? (
          <ul className="space-y-3">
            {parsedPlanRows.map((row, i) => {
              const isMainGoal = activeMainGoal && row.bodyText.includes(activeMainGoal);
              return (
                <li
                  key={i}
                  className="group/line flex items-start justify-between gap-4 p-4 rounded-2xl bg-[#F6FBFE] dark:bg-slate-800/60 border border-sky-900/10 dark:border-white/10"
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-sky-900/10 dark:border-white/10 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
                      {row.loadKind === 'high' ? (
                        <Zap className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                      ) : row.loadKind === 'med' ? (
                        <Layers className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      ) : row.loadKind === 'transition' ? (
                        <Coffee className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      ) : row.loadKind === 'low' ? (
                        <Feather className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                    <div className="space-y-1.5 min-w-0">
                      {(row.timeWindow || row.loadLabel) && (
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          {row.timeWindow && (
                            <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                              {row.timeWindow}
                            </span>
                          )}
                          {row.timeWindow && row.loadLabel && (
                            <span aria-hidden="true" className="text-slate-400">
                              ·
                            </span>
                          )}
                          {renderPlanLoadBadge(row.loadKind, row.loadLabel)}
                        </div>
                      )}
                      <p className="text-base font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
                        {row.bodyText}
                      </p>
                    </div>
                  </div>

                  {onSetMainGoal && row.bodyText && (
                    <button
                      onClick={() => onSetMainGoal(row.bodyText)}
                      className={`flex-shrink-0 p-2 rounded-xl border transition-all ${
                        isMainGoal
                          ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                          : 'bg-white dark:bg-slate-900 border-sky-900/10 dark:border-white/10 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400'
                      }`}
                      title="Set as Main Goal"
                    >
                      <Target className="w-4 h-4" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <ul className="space-y-3">
            {simplifiedBullets.map((bullet, i) => (
              <li
                key={i}
                className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#F8FCFE] dark:bg-slate-800/45 border border-sky-900/10 dark:border-white/5"
              >
                <span className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-sky-900/10 dark:border-white/10 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
                  {type === 'insights' ? (
                    <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  ) : (
                    <ArrowRight className="w-4 h-4 text-violet-600 dark:text-blue-400" />
                  )}
                </span>
                <p className="text-base font-medium text-slate-800 dark:text-slate-100 leading-relaxed">
                  {bullet}
                </p>
              </li>
            ))}
          </ul>
        )
      ) : (
        <div className="whitespace-pre-wrap leading-relaxed text-sm md:text-base px-1">
          {content.split('\n').map((line, i) => {
            const isMainGoal = activeMainGoal && line.includes(activeMainGoal);
            return (
              <div
                key={i}
                className={`group/line flex items-start gap-4 ${
                  line.startsWith('-') || line.match(/^\d\./)
                    ? 'ml-3 mb-3 pl-4 border-l border-sky-900/15 dark:border-slate-700/50'
                    : 'mb-3.5'
                }`}
              >
                <p
                  className={`flex-grow ${
                    type === 'plan'
                      ? 'font-medium text-slate-800 dark:text-slate-100'
                      : 'text-slate-700 dark:text-slate-200'
                  }`}
                  dangerouslySetInnerHTML={{ __html: formatPlanLine(line) }}
                />
                {type === 'plan' && line.includes(':') && onSetMainGoal && (
                  <button
                    onClick={() => onSetMainGoal(line.split(':').slice(1).join(':').trim())}
                    className={`flex-shrink-0 p-2 rounded-xl border transition-all ${
                      isMainGoal
                        ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                        : 'bg-[#F2F9FC] dark:bg-slate-800 border-sky-900/10 dark:border-white/5 text-slate-500 opacity-0 group-hover/line:opacity-100 hover:text-blue-600 dark:hover:text-blue-400'
                    }`}
                    title="Lock as Primary Objective"
                  >
                    <Target className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
