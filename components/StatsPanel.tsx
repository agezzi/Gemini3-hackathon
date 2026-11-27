import React, { useState } from 'react';
import { 
  Trophy, 
  Flame, 
  Award, 
  History, 
  CheckCircle2, 
  Circle,
  ShieldAlert, 
  Terminal,
  ChevronDown,
  ChevronUp,
  Calendar,
  Bell,
  Target,
  Plus,
  ArrowRight,
  Sparkles,
  Check,
  BrainCircuit,
  RefreshCcw,
  Mail,
  Send,
  BatteryCharging,
  Feather,
  X,
  Clock
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { VrHeadsetIcon } from './xr/VrHeadsetIcon';
import { UserStats, ReminderSettings, EmailDigestSettings } from '../types';
import { ACHIEVEMENTS } from '../constants';
import { GoalHistoryModal } from './GoalHistoryModal';
import { ActivityHeatmap } from './ActivityHeatmap';
import { GoogleSignInButton } from './GoogleSignInButton';
import { FocusPulse } from './FocusPulse';
import { DEFAULT_EMAIL_DIGEST_SETTINGS } from '../services/gmailService';

interface StatsPanelProps {
  stats: UserStats;
  authUser?: FirebaseUser | null;
  isFocusActive?: boolean;
  onUpdateReminder: (settings: Partial<ReminderSettings>) => void;
  onUpdateDigestSettings?: (settings: Partial<EmailDigestSettings>) => void;
  onOpenGmailDigest?: () => void;
  onGoogleSignIn?: () => void;
  onOpenBadges?: () => void;
  onRediagnose?: () => void;
  onOpenZenMode?: () => void;
  onOpenXRMode?: () => void;
  onSetMainGoal?: (goal: string) => void;
  onToggleGoalStatus?: (goalId: string, newStatus: 'active' | 'completed' | 'abandoned') => void;
  onAddGoal?: (goalTitle: string) => void;
  onDeleteGoal?: (goalId: string) => void;
  onDismissRecoveryAlert?: (dateStr: string) => void;
}

const HIGH_FOCUS_THRESHOLD_MINS = 360; // 6 hours/day threshold
const ELEVATED_FOCUS_THRESHOLD_MINS = 240; // 4 hours/day threshold

function formatDurationCompact(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export const StatsPanel: React.FC<StatsPanelProps> = ({ 
  stats, 
  authUser,
  isFocusActive = false,
  onUpdateReminder, 
  onUpdateDigestSettings,
  onOpenGmailDigest,
  onGoogleSignIn,
  onOpenBadges,
  onRediagnose,
  onOpenZenMode,
  onOpenXRMode,
  onSetMainGoal,
  onToggleGoalStatus,
  onAddGoal,
  onDeleteGoal,
  onDismissRecoveryAlert
}) => {
  const digestSettings: EmailDigestSettings = {
    ...DEFAULT_EMAIL_DIGEST_SETTINGS,
    ...(stats.emailDigestSettings || {}),
  };
  const todayStr = new Date().toISOString().split('T')[0];
  const sentDigestToday = digestSettings.lastSentDate === todayStr;
  const [showFullRegistry, setShowFullRegistry] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [quickGoalInput, setQuickGoalInput] = useState('');
  const [isQuickAdding, setIsQuickAdding] = useState(false);
  const [justCompletedGoalId, setJustCompletedGoalId] = useState<string | null>(null);
  const [recoveryQueuedNotice, setRecoveryQueuedNotice] = useState(false);
  const [localAlertDismissedDate, setLocalAlertDismissedDate] = useState<string | null>(null);
  const [peakReminderAligned, setPeakReminderAligned] = useState(false);

  const goals = stats.goalHistory || [];
  const completedGoals = goals.filter(g => g.status === 'completed');
  const completionRate = goals.length > 0 ? Math.round((completedGoals.length / goals.length) * 100) : 0;
  const activeGoalRecord = goals.find(g => g.title === stats.mainGoal && g.status === 'active') || goals.find(g => g.title === stats.mainGoal);

  const getEntryTimes = () => {
    if (!stats.entryTimeHistory || stats.entryTimeHistory.length === 0) return [];
    return stats.entryTimeHistory.slice(-7).map(iso => {
      const date = new Date(iso);
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const totalMinutes = hours * 60 + minutes;
      return {
        fullDate: date.toLocaleString(),
        iso,
        label: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
        percent: (totalMinutes / (24 * 60)) * 100,
        minutes: totalMinutes,
        day: date.toLocaleDateString(undefined, { weekday: 'short' }),
        dateOnly: date.toISOString().split('T')[0]
      };
    });
  };

  const times = getEntryTimes();
  
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    const hasEntry = stats.entryTimeHistory.some(iso => iso.startsWith(dateStr));
    return { date: dateStr, active: hasEntry };
  });

  const calculateMedian = () => {
    if (times.length === 0) return null;
    const sorted = [...times].sort((a, b) => a.minutes - b.minutes);
    const mid = Math.floor(sorted.length / 2);
    const medMin = sorted.length % 2 === 0 ? (sorted[mid - 1].minutes + sorted[mid].minutes) / 2 : sorted[mid].minutes;
    const h = Math.floor(medMin / 60);
    const m = Math.floor(medMin % 60);
    return {
      percent: (medMin / (24 * 60)) * 100,
      label: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
    };
  };

  const median = calculateMedian();
  const isPioneerUnlocked = stats.unlockedBadgeIds.includes('7day');

  // Accurate per-day focus load calculation (capped against 6h / 360m daily threshold)
  const dailyFocusMap: Record<string, number> = stats.dailyFocusMinutes || {};
  const todayFocusMinutes = dailyFocusMap[todayStr] || 0;

  // Scan the last 7 days (today first, then yesterday back 6 days) for >6h peak focus days
  const recentHighLoadDay = (() => {
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const mins = dailyFocusMap[dateStr] || 0;
      if (mins >= HIGH_FOCUS_THRESHOLD_MINS) {
        const dayLabel =
          i === 0
            ? 'Today'
            : i === 1
              ? 'Yesterday'
              : d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
        return { dateStr, minutes: mins, daysAgo: i, dayLabel };
      }
    }
    return null;
  })();

  const isRecoveryAlertDismissed =
    stats.dismissedRecoveryAlertDate === todayStr || localAlertDismissedDate === todayStr;

  const showProactiveRecoveryAlert = Boolean(recentHighLoadDay) && !isRecoveryAlertDismissed;

  // Analyze historical dailyFocusMinutes + entryTimeHistory to determine Peak Performance Schedule Window
  const peakPerformance = (() => {
    const hourlyScores = new Array<number>(24).fill(0);
    const historyList = stats.entryTimeHistory || [];

    // Count how many timestamped entries fall on each UTC/local date so focus minutes distribute proportionally
    const entriesPerDate: Record<string, number> = {};
    const parsedEntries: { hour: number; dateUtc: string; dateLocal: string }[] = [];

    historyList.forEach((iso) => {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return;
      const dateUtc = d.toISOString().split('T')[0];
      const dateLocal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      entriesPerDate[dateUtc] = (entriesPerDate[dateUtc] || 0) + 1;
      parsedEntries.push({ hour: d.getHours(), dateUtc, dateLocal });
    });

    let totalWeightedFocusMins = 0;
    const countedDays = new Set<string>();

    parsedEntries.forEach(({ hour, dateUtc, dateLocal }) => {
      const dayMins = dailyFocusMap[dateUtc] ?? dailyFocusMap[dateLocal] ?? 0;
      const countForDay = Math.max(1, entriesPerDate[dateUtc] || 1);
      if (!countedDays.has(dateUtc) && dayMins > 0) {
        countedDays.add(dateUtc);
        totalWeightedFocusMins += dayMins;
      }
      const focusBoost = (dayMins / countForDay) / 25;
      hourlyScores[hour] += 1 + focusBoost;
    });

    // Also include aggregate focus days in summary count even if no matching entryTimeHistory row exists
    const allRecordedFocusMins = Object.values(dailyFocusMap).reduce<number>((sum, m) => sum + (Number(m) || 0), 0);
    const displayFocusMins = Math.max(totalWeightedFocusMins, allRecordedFocusMins);

    const maxSingleHour = Math.max(...hourlyScores);
    if (parsedEntries.length === 0 || maxSingleHour <= 0) {
      return {
        hasSignal: false,
        sampleCount: parsedEntries.length,
        totalFocusMins: displayFocusMins,
        hourlyScores,
        peakHour: 9,
        peakEndHour: 11,
        peakTimeLabel: '9:00 AM',
        windowLabel: '9:00 AM – 11:00 AM',
        timeInput24: '09:00',
        headline: 'Calibrating peak window',
        confidenceLabel: 'Pending Data',
      };
    }

    // Evaluate sliding 2-hour contiguous focus window (with slight bleed weight from adjacent hours)
    let bestStartHour = 0;
    let bestWindowScore = -1;
    for (let h = 0; h < 24; h++) {
      const nextH = (h + 1) % 24;
      const prevH = (h + 23) % 24;
      const score = hourlyScores[h] * 1.15 + hourlyScores[nextH] * 0.8 + hourlyScores[prevH] * 0.2;
      if (score > bestWindowScore) {
        bestWindowScore = score;
        bestStartHour = h;
      }
    }

    const formatClockHour = (hour24: number) => {
      const ref = new Date(2026, 0, 1, hour24 % 24, 0, 0);
      return ref.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    };

    const peakEndHour = (bestStartHour + 2) % 24;
    const peakTimeLabel = formatClockHour(bestStartHour);
    const windowLabel = `${peakTimeLabel} – ${formatClockHour(peakEndHour)}`;
    const timeInput24 = `${String(bestStartHour).padStart(2, '0')}:00`;

    const isSparse = parsedEntries.length < 3;
    const headline = isSparse
      ? `Early signal points to ${peakTimeLabel}`
      : `Your highest output is typically at ${peakTimeLabel}`;

    return {
      hasSignal: true,
      sampleCount: parsedEntries.length,
      totalFocusMins: displayFocusMins,
      hourlyScores,
      peakHour: bestStartHour,
      peakEndHour,
      peakTimeLabel,
      windowLabel,
      timeInput24,
      headline,
      confidenceLabel: isSparse ? 'Early Signal' : `${parsedEntries.length} Sessions`,
    };
  })();

  const focusLoadPercent = Math.min(100, Math.round((todayFocusMinutes / HIGH_FOCUS_THRESHOLD_MINS) * 100));
  const getLoadColor = () => {
    if (todayFocusMinutes >= HIGH_FOCUS_THRESHOLD_MINS) return 'bg-red-500';
    if (todayFocusMinutes >= ELEVATED_FOCUS_THRESHOLD_MINS) return 'bg-amber-500';
    return 'bg-blue-600 dark:bg-blue-500';
  };

  const handleQueueLowIntensityTask = () => {
    const recoveryTitle = 'Low-Intensity Recovery: 15m light review or inbox triage';
    if (onAddGoal) {
      onAddGoal(recoveryTitle);
    } else if (onSetMainGoal) {
      onSetMainGoal(recoveryTitle);
    }
    setRecoveryQueuedNotice(true);
    setTimeout(() => setRecoveryQueuedNotice(false), 5000);
  };

  const handleDismissAlert = () => {
    setLocalAlertDismissedDate(todayStr);
    onDismissRecoveryAlert?.(todayStr);
  };

  return (
    <div className="bg-white/85 dark:bg-slate-900/50 border border-sky-900/10 dark:border-slate-800 rounded-[2rem] p-6 sm:p-7 h-fit relative overflow-hidden flex flex-col gap-6 shadow-[0_18px_50px_-18px_rgba(37,99,235,0.12)] dark:shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold flex items-center gap-2 text-slate-500 dark:text-slate-400 uppercase tracking-[0.25em]">
          <Trophy className="w-4 h-4 text-amber-500" />
          Neural Metrics
        </h2>
      </div>

      {/* Cognitive Archetype Profile & Re-diagnose Journey Card */}
      <div className="bg-gradient-to-br from-blue-50/90 via-indigo-50/80 to-violet-50/90 dark:from-indigo-950/40 dark:via-slate-950/70 dark:to-purple-950/30 p-5 rounded-2xl border border-indigo-200/80 dark:border-indigo-500/25 relative overflow-hidden group shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
            <BrainCircuit className="w-3.5 h-3.5" />
            Calibrated Archetype
          </span>
          <span className="text-[11px] font-medium text-indigo-700 dark:text-indigo-300 capitalize">
            {stats.neuralProfile?.context || 'General'}
          </span>
        </div>

        <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug mb-1">
          {stats.neuralProfile?.primaryType || 'Uncalibrated Baseline'}
        </h3>
        
        {stats.neuralProfile?.traits && stats.neuralProfile.traits.length > 0 && (
          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed mb-3">
            {stats.neuralProfile.traits[0]}
          </p>
        )}

        {stats.neuralProfile?.scores && (
          <div className="grid grid-cols-4 gap-1 py-2.5 px-2 rounded-xl bg-white/85 dark:bg-slate-950/70 border border-sky-900/10 dark:border-white/5 mb-3 text-center">
            <div>
              <div className="text-xs font-extrabold text-blue-600 dark:text-blue-400 tabular-nums">{stats.neuralProfile.scores.focus}</div>
              <div className="text-[9px] text-slate-500 font-mono uppercase">Focus</div>
            </div>
            <div>
              <div className="text-xs font-extrabold text-violet-600 dark:text-purple-400 tabular-nums">{stats.neuralProfile.scores.executive}</div>
              <div className="text-[9px] text-slate-500 font-mono uppercase">Logic</div>
            </div>
            <div>
              <div className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">{stats.neuralProfile.scores.sensory}</div>
              <div className="text-[9px] text-slate-500 font-mono uppercase">Sensory</div>
            </div>
            <div>
              <div className="text-xs font-extrabold text-amber-600 dark:text-amber-400 tabular-nums">{stats.neuralProfile.scores.processing}</div>
              <div className="text-[9px] text-slate-500 font-mono uppercase">Speed</div>
            </div>
          </div>
        )}

        {onRediagnose && (
          <button
            type="button"
            onClick={onRediagnose}
            className="w-full py-2.5 px-3 rounded-xl bg-white/90 dark:bg-indigo-600/20 hover:bg-indigo-600 hover:text-white text-indigo-700 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-500/30 text-xs font-semibold transition-all flex items-center justify-center gap-2 group/btn shadow-sm active:scale-95"
            title="Restart your cognitive diagnostic to recalibrate your archetype"
          >
            <RefreshCcw className="w-3.5 h-3.5 group-hover/btn:rotate-180 transition-transform duration-500" />
            <span>Re-diagnose Assessment</span>
          </button>
        )}
      </div>

      {/* Proactive Recovery & Streak Longevity Alert (flags >= 6h focus days) */}
      {showProactiveRecoveryAlert && recentHighLoadDay && (
        <div
          role="status"
          aria-live="polite"
          className="p-5 rounded-2xl border border-amber-300/80 dark:border-amber-500/35 bg-gradient-to-br from-amber-50 via-orange-50/70 to-white dark:from-amber-950/40 dark:via-slate-900/90 dark:to-slate-950/80 space-y-3.5 relative animate-in fade-in duration-300"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-2 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300 shrink-0">
                <BatteryCharging className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-widest text-amber-800 dark:text-amber-300">
                  Streak Longevity Alert
                </div>
                <h3 className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                  High Output Flagged · {formatDurationCompact(recentHighLoadDay.minutes)} ({recentHighLoadDay.dayLabel})
                </h3>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDismissAlert}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors shrink-0"
              title="Acknowledge for today"
              aria-label="Acknowledge recovery alert for today"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            {recentHighLoadDay.daysAgo === 0
              ? `You crossed 6 hours of deep focus today. Schedule a recovery day tomorrow or switch to a low-intensity task to prevent burnout and protect your ${stats.currentStreak}-day streak.`
              : `You pushed ${formatDurationCompact(recentHighLoadDay.minutes)} on ${recentHighLoadDay.dayLabel}. Take a recovery day or run a gentle low-intensity task today so fatigue doesn't break your ${stats.currentStreak}-day streak.`}
          </p>

          {recoveryQueuedNotice && (
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-300/70 dark:border-emerald-500/30 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Low-intensity task set as today&apos;s active objective.</span>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-0.5">
            {(onAddGoal || onSetMainGoal) && (
              <button
                type="button"
                onClick={handleQueueLowIntensityTask}
                className="w-full py-2 px-3 rounded-xl bg-white hover:bg-amber-50 dark:bg-slate-900 dark:hover:bg-slate-800 border border-amber-300/70 dark:border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                <Feather className="w-3.5 h-3.5 shrink-0" />
                <span>Queue Low-Intensity Task</span>
              </button>
            )}
            {onOpenZenMode && (
              <button
                type="button"
                onClick={onOpenZenMode}
                className="w-full py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>Take Guided Recovery Day (Zen)</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Burnout Load Meter */}
      <div className="bg-[#F2F9FC] dark:bg-slate-950/50 p-5 rounded-2xl border border-sky-900/10 dark:border-white/5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className={`w-3.5 h-3.5 ${todayFocusMinutes >= HIGH_FOCUS_THRESHOLD_MINS ? 'text-red-500' : 'text-slate-500'}`} />
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Neural Load Index</span>
          </div>
          <span className={`text-[11px] font-bold ${
            todayFocusMinutes >= HIGH_FOCUS_THRESHOLD_MINS
              ? 'text-red-600 dark:text-red-400'
              : todayFocusMinutes >= ELEVATED_FOCUS_THRESHOLD_MINS
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-blue-600 dark:text-blue-400'
          }`}>
            {todayFocusMinutes >= HIGH_FOCUS_THRESHOLD_MINS
              ? 'Recovery Advised'
              : todayFocusMinutes >= ELEVATED_FOCUS_THRESHOLD_MINS
                ? 'Elevated'
                : 'Nominal'}
          </span>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-2 tabular-nums">
          <span>Today&apos;s Focus Load</span>
          <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
            {formatDurationCompact(todayFocusMinutes)} / 6h ceiling
          </span>
        </div>

        <div className="w-full h-1.5 bg-sky-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-1000 ${getLoadColor()}`} 
            style={{ width: `${focusLoadPercent}%` }} 
          />
        </div>

        {onOpenZenMode && (
          <button
            type="button"
            onClick={onOpenZenMode}
            className="w-full mt-3 pt-2.5 border-t border-sky-900/10 dark:border-white/5 flex items-center justify-between text-xs font-semibold text-violet-700 dark:text-teal-400 hover:opacity-80 transition-opacity group/zen"
          >
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 group-hover/zen:rotate-12 transition-transform" />
              <span>Zen Meditation &amp; Focus Game</span>
            </span>
            <span className="text-[11px] font-mono group-hover/zen:translate-x-0.5 transition-transform">Enter →</span>
          </button>
        )}

        {onOpenXRMode && (
          <button
            type="button"
            onClick={onOpenXRMode}
            className="w-full mt-2.5 pt-2.5 border-t border-sky-900/10 dark:border-white/5 flex items-center justify-between text-xs font-semibold text-amber-700 dark:text-amber-400 hover:opacity-80 transition-opacity group/xr"
          >
            <span className="flex items-center gap-1.5">
              <VrHeadsetIcon className="w-3.5 h-3.5" />
              <span>NeuralPlan XR Simulation</span>
            </span>
            <span className="text-[11px] font-mono group-hover/xr:translate-x-0.5 transition-transform">Lab →</span>
          </button>
        )}
      </div>

      {/* Rhythmic Focus Pulse Breathing Visualization paired with Burnout Load */}
      <FocusPulse
        todayFocusMinutes={todayFocusMinutes}
        hasRecentHighLoad={Boolean(recentHighLoadDay)}
        isFocusActive={isFocusActive}
        onOpenZenRecovery={onOpenZenMode}
      />

      {/* Persistence Streak */}
      <div className="grid grid-cols-1 gap-3.5">
        {(() => {
          const isTodayStreakComplete = stats.lastUsedDate === todayStr;
          return (
            <div className={`p-5 rounded-2xl border flex flex-col gap-3 group transition-all duration-500 ${
              isPioneerUnlocked
                ? 'bg-emerald-50 dark:bg-emerald-500/5 border-emerald-300 dark:border-emerald-500/30'
                : 'bg-[#F2F9FC] dark:bg-slate-950/50 border-sky-900/10 dark:border-white/5'
            }`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl transition-all duration-1000 ${
                    stats.currentStreak >= 7
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-600 dark:text-orange-500'
                  }`}>
                    <Flame className={`w-6 h-6 ${stats.currentStreak > 0 ? 'animate-bounce' : ''}`} />
                  </div>
                  <div>
                    <div className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">{stats.currentStreak}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-widest">Persistence Streak</div>
                  </div>
                </div>
              </div>

              <div className="pt-2.5 border-t border-sky-900/10 dark:border-white/5 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-500 dark:text-slate-400">Today&apos;s Streak Status</span>
                  <span className={
                    isTodayStreakComplete
                      ? 'text-emerald-600 dark:text-emerald-400 flex items-center gap-1'
                      : 'text-amber-600 dark:text-amber-400'
                  }>
                    {isTodayStreakComplete && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                    <span>{isTodayStreakComplete ? 'Complete' : 'Pending'}</span>
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                  {isTodayStreakComplete
                    ? `Verified via ${stats.lastMeaningfulActionLabel || 'focus activity'} today.`
                    : 'Complete 1 Focus Lock, Protocol, Goal, or Zen/XR session today.'}
                </p>
              </div>
            </div>
          );
        })()}

        <div className="bg-[#F2F9FC] dark:bg-slate-950/30 p-4 rounded-xl border border-sky-900/10 dark:border-white/5">
          <div className="flex items-center justify-between mb-3 px-0.5">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Calendar className="w-3 h-3" /> 7-Day Fast Check
            </span>
            <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">
              {last7Days.filter(d => d.active).length}/7 Active
            </span>
          </div>
          <div className="flex gap-1.5 justify-between">
            {last7Days.map((day, i) => (
              <div 
                key={i} 
                title={day.date}
                className={`flex-1 h-3.5 rounded-sm transition-all duration-500 ${
                  day.active 
                    ? 'bg-emerald-500 shadow-sm' 
                    : 'bg-sky-200/70 dark:bg-slate-800'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* D3-Powered 30-Day Activity Heatmap */}
      <ActivityHeatmap stats={stats} />

      {/* Daily Objective Reminder Settings */}
      <div className="bg-[#F2F9FC] dark:bg-slate-950/50 p-5 rounded-2xl border border-sky-900/10 dark:border-white/5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bell className={`w-3.5 h-3.5 ${stats.reminderSettings.enabled ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'}`} />
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Protocol Reminder</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer"
              checked={stats.reminderSettings.enabled}
              onChange={(e) => onUpdateReminder({ enabled: e.target.checked })}
            />
            <div className="w-8 h-4 bg-slate-300 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600" />
          </label>
        </div>
        
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Sync Time</span>
            <input 
              type="time" 
              className="bg-white dark:bg-slate-900 border border-sky-900/15 dark:border-white/10 text-xs text-slate-900 dark:text-white px-2.5 py-1 rounded-lg outline-none focus:border-blue-500"
              value={stats.reminderSettings.time}
              onChange={(e) => onUpdateReminder({ time: e.target.value })}
            />
          </div>
          <div className="flex-grow flex flex-col items-end gap-1">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Status</span>
            <span className={`text-xs font-bold ${stats.reminderSettings.enabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
              {stats.reminderSettings.enabled ? 'Armed' : 'Standby'}
            </span>
          </div>
        </div>

        {stats.mainGoal && (
          <div className="mt-4 pt-4 border-t border-sky-900/10 dark:border-white/5 flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-1">
                <Target className="w-3 h-3 text-blue-600 dark:text-blue-500" />
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Locked Objective</span>
              </div>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-300 italic line-clamp-1">"{stats.mainGoal}"</p>
            </div>
            <button
              onClick={() => setShowGoalModal(true)}
              className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap px-2 py-1"
            >
              History →
            </button>
          </div>
        )}
      </div>

      {/* Daily Gmail Digest Integration Card */}
      <div className="bg-[#F2F9FC] dark:bg-slate-950/50 p-5 rounded-2xl border border-sky-900/10 dark:border-white/5 space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Mail className={`w-3.5 h-3.5 ${authUser && digestSettings.enabled ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'}`} />
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              Gmail Daily Digest
            </span>
          </div>
          {authUser && onUpdateDigestSettings && (
            <label className="relative inline-flex items-center cursor-pointer" title="Toggle daily Gmail digest prompts">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={digestSettings.enabled}
                onChange={(e) => onUpdateDigestSettings({ enabled: e.target.checked })}
              />
              <div className="w-8 h-4 bg-slate-300 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600" />
            </label>
          )}
        </div>

        {!authUser ? (
          <div className="space-y-2.5">
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Sign in with Google to receive daily focus tips, progress streaks, and protocol recaps in your Gmail inbox.
            </p>
            {onGoogleSignIn && (
              <GoogleSignInButton
                onClick={onGoogleSignIn}
                label="Sign in with Google"
                compact
                className="w-full"
              />
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="text-slate-600 dark:text-slate-300 font-semibold truncate">
                {authUser.email}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                sentDigestToday
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                  : 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
              }`}>
                {sentDigestToday ? 'Sent Today' : `At ${digestSettings.preferredTime}`}
              </span>
            </div>

            {onOpenGmailDigest && (
              <button
                type="button"
                onClick={onOpenGmailDigest}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-105 text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Preview &amp; Send Update</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Dedicated Goal History View */}
      <div className="bg-[#F2F9FC] dark:bg-slate-950/50 p-5 rounded-2xl border border-sky-900/10 dark:border-white/5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-600 dark:text-blue-400">
              <Target className="w-3.5 h-3.5" />
            </div>
            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Goal History</span>
          </div>
          <button
            onClick={() => setShowGoalModal(true)}
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 transition-colors"
          >
            <span>View All ({goals.length})</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-semibold">
            <span className="text-slate-500">Completion</span>
            <span className="text-emerald-600 dark:text-emerald-400 tabular-nums">{completedGoals.length} of {goals.length} ({completionRate}%)</span>
          </div>
          <div className="w-full h-1.5 bg-sky-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-600 via-violet-500 to-emerald-400 rounded-full transition-all duration-700"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>

        {stats.mainGoal ? (
          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-500/30 relative overflow-hidden group">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Active Objective</span>
              {onToggleGoalStatus && (
                <button
                  onClick={() => {
                    if (activeGoalRecord && onToggleGoalStatus) {
                      setJustCompletedGoalId(activeGoalRecord.id);
                      setTimeout(() => setJustCompletedGoalId(null), 2500);
                      onToggleGoalStatus(activeGoalRecord.id, 'completed');
                    } else if (stats.mainGoal && onAddGoal) {
                      onAddGoal(stats.mainGoal);
                    }
                  }}
                  className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30 text-[10px] font-bold flex items-center gap-1 transition-all active:scale-95"
                  title="Mark this objective as accomplished"
                >
                  <Check className="w-3 h-3" />
                  <span>Mark Done</span>
                </button>
              )}
            </div>
            <p className="text-xs font-bold text-slate-900 dark:text-white leading-snug">"{stats.mainGoal}"</p>
            {justCompletedGoalId && (
              <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1 animate-in fade-in">
                <Sparkles className="w-3 h-3" /> Objective logged as accomplished!
              </div>
            )}
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-dashed border-sky-900/15 dark:border-slate-800 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1.5">No active objective currently set</p>
            <button
              onClick={() => setIsQuickAdding(true)}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Set Objective
            </button>
          </div>
        )}

        {isQuickAdding && (
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (!quickGoalInput.trim()) return;
              if (onAddGoal) {
                onAddGoal(quickGoalInput.trim());
              } else if (onSetMainGoal) {
                onSetMainGoal(quickGoalInput.trim());
              }
              setQuickGoalInput('');
              setIsQuickAdding(false);
            }} 
            className="flex gap-1.5 pt-1 animate-in fade-in"
          >
            <input
              type="text"
              value={quickGoalInput}
              onChange={(e) => setQuickGoalInput(e.target.value)}
              placeholder="New goal objective..."
              className="flex-1 bg-white dark:bg-slate-900 border border-blue-400 dark:border-blue-500/40 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
              autoFocus
            />
            <button
              type="submit"
              disabled={!quickGoalInput.trim()}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-bold rounded-lg transition-colors shrink-0"
            >
              Set
            </button>
            <button
              type="button"
              onClick={() => setIsQuickAdding(false)}
              className="px-2 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-lg transition-colors shrink-0"
            >
              ✕
            </button>
          </form>
        )}

        {goals.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-sky-900/10 dark:border-white/5">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Recent Trajectory
            </div>
            <div className="space-y-1.5">
              {goals.slice(0, 3).map((g) => {
                const isCompleted = g.status === 'completed';
                const formattedDate = (() => {
                  try {
                    const d = new Date(isCompleted && g.completedAt ? g.completedAt : g.createdAt);
                    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
                  } catch {
                    return '';
                  }
                })();

                return (
                  <div 
                    key={g.id}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white/80 dark:bg-slate-900/60 border border-sky-900/10 dark:border-white/5 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {isCompleted ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      ) : (
                        <Circle className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      )}
                      <span className={`truncate ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-slate-200 font-medium'}`}>
                        {g.title}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 shrink-0">
                      {formattedDate}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="pt-1 flex items-center justify-between">
          <button
            onClick={() => setIsQuickAdding(!isQuickAdding)}
            className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Add Goal</span>
          </button>
          <button
            onClick={() => setShowGoalModal(true)}
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 transition-colors"
          >
            <span>Manage All →</span>
          </button>
        </div>
      </div>

      {/* Registry Toggle */}
      <div className="space-y-3">
        <button 
          onClick={() => setShowFullRegistry(!showFullRegistry)}
          className="w-full flex items-center justify-between p-4 bg-[#F2F9FC] dark:bg-slate-950/50 rounded-2xl border border-sky-900/10 dark:border-white/5 hover:bg-sky-50 dark:hover:bg-slate-900 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-600 dark:text-blue-400">
              <Terminal className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">Neural Registry Log</span>
          </div>
          {showFullRegistry ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </button>

        {showFullRegistry && (
          <div className="bg-white dark:bg-black/40 border border-sky-900/10 dark:border-white/5 rounded-2xl p-4 font-mono text-[11px] space-y-2 max-h-48 overflow-y-auto">
            {[...stats.entryTimeHistory].reverse().map((iso, i) => (
              <div key={i} className="flex items-start gap-3 text-slate-600 dark:text-slate-400 border-b border-sky-900/10 dark:border-white/5 pb-2 last:border-0">
                <span className="text-emerald-600 dark:text-emerald-500 font-bold">SYNC</span>
                <span className="text-slate-800 dark:text-white">{new Date(iso).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Timing Consistency & Custom Peak Performance Window */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.25em] flex items-center gap-2">
          <History className="w-3.5 h-3.5" />
          7-Day Timing Consistency
        </h3>
        
        <div className="bg-[#F2F9FC] dark:bg-slate-950/50 p-5 rounded-2xl border border-sky-900/10 dark:border-white/5 relative space-y-4">
          <div className="relative h-10 flex items-center">
            <div className="absolute inset-0 h-1 my-auto w-full bg-sky-200 dark:bg-slate-800 rounded-full" />
            {median && (
              <div className="absolute top-0 bottom-0 w-px bg-blue-500/40 border-l border-dashed border-blue-500/60" style={{ left: `${median.percent}%` }} />
            )}
            {times.map((t, i) => (
              <div key={i} className="absolute group/entry z-10" style={{ left: `${t.percent}%` }}>
                <div className={`w-3 h-3 rounded-full border-2 border-white dark:border-slate-950 ${i === times.length - 1 ? 'bg-emerald-500 ring-4 ring-emerald-500/20 scale-125' : 'bg-slate-400 dark:bg-slate-500'}`} />
              </div>
            ))}
          </div>

          <div className="pt-3.5 border-t border-sky-900/10 dark:border-white/5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-blue-700 dark:text-blue-400">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>Peak Performance Window</span>
              </div>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                {peakPerformance.confidenceLabel}
              </span>
            </div>

            {peakPerformance.hasSignal ? (
              <>
                <div>
                  <p className="text-xs font-extrabold text-slate-900 dark:text-white leading-snug">
                    {peakPerformance.headline}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400 tabular-nums">
                    <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                      {peakPerformance.windowLabel}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {peakPerformance.totalFocusMins > 0
                        ? `${formatDurationCompact(peakPerformance.totalFocusMins)} weighted focus`
                        : `${peakPerformance.sampleCount} logged actions`}
                    </span>
                  </div>
                </div>

                {/* 24h Circadian Output Distribution */}
                {(() => {
                  const maxScore = Math.max(...peakPerformance.hourlyScores, 0.01);
                  return (
                    <div className="space-y-1">
                      <div
                        className="flex items-end gap-[2px] h-7 pt-1"
                        aria-label="24-hour focus output distribution"
                      >
                        {peakPerformance.hourlyScores.map((score, hour) => {
                          const isPeakSlot =
                            hour === peakPerformance.peakHour ||
                            hour === (peakPerformance.peakHour + 1) % 24;
                          const heightPct = score > 0 ? Math.max(20, Math.round((score / maxScore) * 100)) : 10;
                          const hrLabel = new Date(2026, 0, 1, hour, 0).toLocaleTimeString([], {
                            hour: 'numeric',
                          });
                          return (
                            <div
                              key={hour}
                              title={`${hrLabel}: ${score > 0 ? 'Active output' : 'Quiet'}`}
                              style={{ height: `${heightPct}%` }}
                              className={`flex-1 rounded-t-sm transition-all ${
                                isPeakSlot
                                  ? 'bg-blue-600 dark:bg-blue-400'
                                  : score > 0
                                    ? 'bg-emerald-500/65 dark:bg-emerald-400/55'
                                    : 'bg-sky-200/70 dark:bg-slate-800'
                              }`}
                            />
                          );
                        })}
                      </div>
                      <div className="flex justify-between text-[9px] font-mono text-slate-400 tabular-nums">
                        <span>12a</span>
                        <span>6a</span>
                        <span>12p</span>
                        <span>6p</span>
                      </div>
                    </div>
                  );
                })()}

                <button
                  type="button"
                  onClick={() => {
                    onUpdateReminder({ enabled: true, time: peakPerformance.timeInput24 });
                    setPeakReminderAligned(true);
                    setTimeout(() => setPeakReminderAligned(false), 3500);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-slate-800 border border-sky-900/10 dark:border-white/10 text-[11px] font-semibold text-blue-700 dark:text-blue-300 transition-colors flex items-center justify-center gap-1.5"
                >
                  {peakReminderAligned ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>Reminder aligned to {peakPerformance.peakTimeLabel}</span>
                    </>
                  ) : (
                    <>
                      <Bell className="w-3.5 h-3.5 shrink-0" />
                      <span>Align Protocol Reminder ({peakPerformance.peakTimeLabel})</span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Complete at least one Focus Lock session, Goal, or Behavioral Protocol to calculate your highest-output schedule window.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Achievements */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.25em] flex items-center gap-2">
            <Award className="w-3.5 h-3.5 text-amber-500" />
            Badges ({stats.unlockedBadgeIds.length}/{ACHIEVEMENTS.length})
          </h3>
          {onOpenBadges && (
            <button
              onClick={onOpenBadges}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline transition-colors"
            >
              View All →
            </button>
          )}
        </div>
        <div className="grid grid-cols-5 gap-2.5">
          {ACHIEVEMENTS.map((ach) => {
            const isUnlocked = stats.unlockedBadgeIds.includes(ach.id);
            return (
              <button 
                key={ach.id} 
                onClick={onOpenBadges}
                title={`${ach.name} · ${isUnlocked ? 'Unlocked' : 'Locked'}`}
                className={`aspect-square flex items-center justify-center rounded-xl text-lg border transition-all duration-300 ${
                  isUnlocked 
                    ? 'bg-white dark:bg-slate-800 border-blue-300 dark:border-blue-500/40 opacity-100 hover:scale-105 shadow-sm' 
                    : 'bg-[#EEF7FA] dark:bg-slate-900 border-sky-900/10 dark:border-white/5 grayscale opacity-35 hover:opacity-60'
                }`}
              >
                {ach.icon}
              </button>
            );
          })}
        </div>
      </div>

      {/* Goal History Modal */}
      <GoalHistoryModal
        isOpen={showGoalModal}
        onClose={() => setShowGoalModal(false)}
        goals={goals}
        activeGoal={stats.mainGoal}
        onSetMainGoal={(title) => {
          if (onSetMainGoal) onSetMainGoal(title);
        }}
        onToggleGoalStatus={(goalId, status) => {
          if (onToggleGoalStatus) onToggleGoalStatus(goalId, status);
        }}
        onAddGoal={(title) => {
          if (onAddGoal) onAddGoal(title);
        }}
        onDeleteGoal={(goalId) => {
          if (onDeleteGoal) onDeleteGoal(goalId);
        }}
      />
    </div>
  );
};
