import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Lock,
  Map as MapIcon,
  Palette,
  ArrowRight,
  Sun,
  Moon,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react';
import { MilestoneNode, UiThemeId, UnlockableTheme, UserStats } from '../types';
import { ACHIEVEMENTS, MILESTONE_MAP_NODES, UNLOCKABLE_THEMES } from '../constants';
import { ThemeMode } from './ThemeToggle';

interface MilestoneTrackerProps {
  stats: UserStats;
  theme: ThemeMode;
  activeUiTheme: UiThemeId;
  onSelectUiTheme: (themeId: UiThemeId) => void;
  onOpenAchievementHall?: () => void;
}

interface ConfettiPiece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  vRot: number;
  tilt: number;
  vTilt: number;
  alpha: number;
  isCircle: boolean;
}

const DEFAULT_CONFETTI_COLORS = ['#2563EB', '#7C3AED', '#10B981', '#F59E0B', '#EC4899'];

export const MilestoneTracker: React.FC<MilestoneTrackerProps> = ({
  stats,
  theme,
  activeUiTheme,
  onSelectUiTheme,
  onOpenAchievementHall,
}) => {
  const [viewMode, setViewMode] = useState<'map' | 'themes'>('map');
  const [celebrationBanner, setCelebrationBanner] = useState<{
    badgeName: string;
    badgeIcon: string;
    rewardTheme: UnlockableTheme | null;
  } | null>(null);
  const [celebratingNodeId, setCelebratingNodeId] = useState<string | null>(null);

  const containerRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const particlesRef = useRef<ConfettiPiece[]>([]);

  const getMetricValue = useCallback(
    (category: MilestoneNode['category']) => {
      if (category === 'streak') {
        return Math.max(stats.currentStreak || 0, stats.highestStreak || 0);
      }
      if (category === 'focus') {
        return stats.totalFocusMinutes || 0;
      }
      return stats.totalPlansGenerated || 0;
    },
    [stats.currentStreak, stats.highestStreak, stats.totalFocusMinutes, stats.totalPlansGenerated]
  );

  const isNodeUnlocked = useCallback(
    (node: MilestoneNode) => {
      if (stats.unlockedBadgeIds.includes(node.achievementId)) return true;
      return getMetricValue(node.category) >= node.requirement;
    },
    [getMetricValue, stats.unlockedBadgeIds]
  );

  const isThemeUnlocked = useCallback(
    (uiTheme: UnlockableTheme) => {
      if (!uiTheme.unlockAchievementId) return true;
      if (stats.unlockedBadgeIds.includes(uiTheme.unlockAchievementId)) return true;
      const node = MILESTONE_MAP_NODES.find(
        (n) => n.achievementId === uiTheme.unlockAchievementId
      );
      if (node) return getMetricValue(node.category) >= node.requirement;
      const ach = ACHIEVEMENTS.find((a) => a.id === uiTheme.unlockAchievementId);
      if (!ach) return false;
      if (ach.category === 'streak') return getMetricValue('streak') >= ach.requirement;
      if (ach.category === 'focus') return getMetricValue('focus') >= ach.requirement;
      if (ach.category === 'plan') return getMetricValue('plan') >= ach.requirement;
      return false;
    },
    [getMetricValue, stats.unlockedBadgeIds]
  );

  const enrichedNodes = useMemo(() => {
    return MILESTONE_MAP_NODES.map((node) => {
      const unlocked = isNodeUnlocked(node);
      const current = getMetricValue(node.category);
      const percent = Math.min(100, Math.round((current / node.requirement) * 100));
      const rewardTheme = node.rewardThemeId
        ? UNLOCKABLE_THEMES.find((t) => t.id === node.rewardThemeId) || null
        : null;
      return {
        ...node,
        unlocked,
        current,
        percent,
        rewardTheme,
      };
    });
  }, [getMetricValue, isNodeUnlocked]);

  const unlockedNodesCount = enrichedNodes.filter((n) => n.unlocked).length;
  const unlockedThemesCount = UNLOCKABLE_THEMES.filter((t) => isThemeUnlocked(t)).length;

  const defaultNodeId = useMemo(() => {
    const nextLocked = enrichedNodes.find((n) => !n.unlocked);
    return (nextLocked || enrichedNodes[enrichedNodes.length - 1]).id;
  }, [enrichedNodes]);

  const [selectedNodeId, setSelectedNodeId] = useState<string>(defaultNodeId);
  const selectedNode =
    enrichedNodes.find((n) => n.id === selectedNodeId) || enrichedNodes[0];

  const overallMapPercent = Math.round(
    (unlockedNodesCount / enrichedNodes.length) * 100
  );

  const activeThemeMeta =
    UNLOCKABLE_THEMES.find((t) => t.id === activeUiTheme) || UNLOCKABLE_THEMES[0];

  // Lightweight self-terminating HTML5 canvas confetti engine
  const launchConfetti = useCallback((customPalette?: string[]) => {
    if (typeof window === 'undefined') return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const palette =
      customPalette && customPalette.length > 0
        ? [...customPalette, '#10B981', '#F8FAFC']
        : DEFAULT_CONFETTI_COLORS;

    const origins = [
      { x: rect.width * 0.25, y: rect.height * 0.32 },
      { x: rect.width * 0.5, y: rect.height * 0.25 },
      { x: rect.width * 0.75, y: rect.height * 0.32 },
    ];

    const newPieces: ConfettiPiece[] = [];
    origins.forEach((origin) => {
      for (let i = 0; i < 26; i++) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.9;
        const speed = 3.4 + Math.random() * 6.2;
        newPieces.push({
          x: origin.x + (Math.random() - 0.5) * 24,
          y: origin.y + (Math.random() - 0.5) * 12,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.5,
          size: 5 + Math.random() * 5,
          color: palette[Math.floor(Math.random() * palette.length)],
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.18,
          tilt: Math.random() * Math.PI,
          vTilt: 0.08 + Math.random() * 0.14,
          alpha: 1,
          isCircle: Math.random() > 0.72,
        });
      }
    });

    particlesRef.current = [...particlesRef.current, ...newPieces].slice(-160);

    if (animFrameRef.current !== null) return;

    const step = () => {
      const activeCanvas = canvasRef.current;
      const activeContainer = containerRef.current;
      if (!activeCanvas || !activeContainer) {
        animFrameRef.current = null;
        return;
      }
      const context = activeCanvas.getContext('2d');
      if (!context) {
        animFrameRef.current = null;
        return;
      }

      const cRect = activeContainer.getBoundingClientRect();
      const cDpr = Math.min(window.devicePixelRatio || 1, 2);

      context.setTransform(cDpr, 0, 0, cDpr, 0, 0);
      context.clearRect(0, 0, cRect.width, cRect.height);

      const alive: ConfettiPiece[] = [];
      for (const p of particlesRef.current) {
        p.vx *= 0.985;
        p.vy += 0.19;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.vRot;
        p.tilt += p.vTilt;
        if (p.y > cRect.height * 0.7) {
          p.alpha -= 0.025;
        } else {
          p.alpha -= 0.006;
        }

        if (p.alpha > 0.02 && p.y < cRect.height + 24) {
          alive.push(p);
          context.save();
          context.globalAlpha = Math.max(0, Math.min(1, p.alpha));
          context.translate(p.x, p.y);
          context.rotate(p.rotation);
          context.scale(Math.cos(p.tilt), 1);
          context.fillStyle = p.color;
          if (p.isCircle) {
            context.beginPath();
            context.arc(0, 0, p.size * 0.5, 0, Math.PI * 2);
            context.fill();
          } else {
            context.fillRect(-p.size / 2, -p.size * 0.32, p.size, p.size * 0.64);
          }
          context.restore();
        }
      }

      particlesRef.current = alive;
      if (alive.length > 0) {
        animFrameRef.current = requestAnimationFrame(step);
      } else {
        context.clearRect(0, 0, cRect.width, cRect.height);
        animFrameRef.current = null;
      }
    };

    animFrameRef.current = requestAnimationFrame(step);
  }, []);

  useEffect(() => {
    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  const triggerNodeCelebration = useCallback(
    (achievementId: string) => {
      const ach = ACHIEVEMENTS.find((a) => a.id === achievementId);
      const mapNode = enrichedNodes.find((n) => n.achievementId === achievementId);
      const rewardTheme =
        mapNode?.rewardTheme ||
        UNLOCKABLE_THEMES.find((t) => t.unlockAchievementId === achievementId) ||
        null;

      if (mapNode) {
        setSelectedNodeId(mapNode.id);
        setCelebratingNodeId(mapNode.id);
        setTimeout(() => {
          setCelebratingNodeId((curr) => (curr === mapNode.id ? null : curr));
        }, 2200);
      }

      setCelebrationBanner({
        badgeName: ach?.name || mapNode?.title || 'Milestone Cleared',
        badgeIcon: ach?.icon || '🏆',
        rewardTheme,
      });

      launchConfetti(rewardTheme?.swatches);
    },
    [enrichedNodes, launchConfetti]
  );

  // Detect real-time badge or milestone unlocks and celebrate automatically
  const previousUnlockedRef = useRef<Set<string> | null>(null);
  useEffect(() => {
    const currentUnlocked = new Set<string>(stats.unlockedBadgeIds || []);
    enrichedNodes.forEach((node) => {
      if (node.unlocked) currentUnlocked.add(node.achievementId);
    });

    if (previousUnlockedRef.current === null) {
      previousUnlockedRef.current = currentUnlocked;
      return;
    }

    const newlyUnlockedIds = Array.from(currentUnlocked).filter(
      (id) => !previousUnlockedRef.current!.has(id)
    );
    previousUnlockedRef.current = currentUnlocked;

    if (newlyUnlockedIds.length > 0) {
      // Prioritize a newly unlocked badge that grants a theme or sits on the map
      const prioritized =
        newlyUnlockedIds.find((id) =>
          enrichedNodes.some((n) => n.achievementId === id && n.rewardTheme)
        ) || newlyUnlockedIds[newlyUnlockedIds.length - 1];
      triggerNodeCelebration(prioritized);
    }
  }, [stats.unlockedBadgeIds, enrichedNodes, triggerNodeCelebration]);

  useEffect(() => {
    if (
      unlockedNodesCount === 0 &&
      (stats.currentStreak || 0) === 0 &&
      (stats.highestStreak || 0) === 0 &&
      (stats.totalFocusMinutes || 0) === 0 &&
      (stats.totalPlansGenerated || 0) === 0
    ) {
      setSelectedNodeId(MILESTONE_MAP_NODES[0].id);
      setCelebrationBanner(null);
      setCelebratingNodeId(null);
    }
  }, [
    unlockedNodesCount,
    stats.currentStreak,
    stats.highestStreak,
    stats.totalFocusMinutes,
    stats.totalPlansGenerated,
  ]);

  return (
    <section
      ref={containerRef}
      aria-label="Milestone Tracker"
      className="bg-white/85 dark:bg-slate-900/45 border border-sky-900/10 dark:border-slate-800 rounded-[2.25rem] p-6 sm:p-8 shadow-[0_18px_50px_-18px_rgba(37,99,235,0.12)] dark:shadow-2xl backdrop-blur-xl space-y-6 relative overflow-hidden"
    >
      {/* Celebration Confetti Overlay Canvas */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 w-full h-full z-20"
      />

      {/* Newly Unlocked / Replay Celebration Banner */}
      {celebrationBanner && (
        <div
          role="status"
          aria-live="polite"
          className="relative z-10 rounded-2xl border border-emerald-300/70 dark:border-emerald-500/35 bg-gradient-to-r from-emerald-50 via-sky-50 to-indigo-50 dark:from-emerald-950/50 dark:via-slate-900/90 dark:to-indigo-950/50 px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in zoom-in-95 duration-300"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300/60 dark:border-emerald-500/30 flex items-center justify-center text-xl shadow-sm shrink-0">
              {celebrationBanner.badgeIcon}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>Achievement Unlocked</span>
              </div>
              <div className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                {celebrationBanner.badgeName}
                {celebrationBanner.rewardTheme && (
                  <span className="font-semibold text-slate-600 dark:text-slate-300">
                    {' '}
                    · Unlocked {celebrationBanner.rewardTheme.name} Theme
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {celebrationBanner.rewardTheme &&
              activeUiTheme !== celebrationBanner.rewardTheme.id && (
                <button
                  type="button"
                  onClick={() => onSelectUiTheme(celebrationBanner.rewardTheme!.id)}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm transition-colors whitespace-nowrap shrink-0"
                >
                  Apply {celebrationBanner.rewardTheme.name}
                </button>
              )}
            <button
              type="button"
              onClick={() => setCelebrationBanner(null)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800 transition-colors"
              aria-label="Dismiss celebration banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header Row */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <MapIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>Milestone Tracker</span>
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            <span>
              {unlockedNodesCount} of {enrichedNodes.length} Milestones Cleared
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {unlockedThemesCount} of {UNLOCKABLE_THEMES.length} UI Themes Unlocked
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              Active Theme: {activeThemeMeta.name}
            </span>
          </div>
        </div>

        {/* Segmented Control & Achievement Hall Link */}
        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto shrink-0">
          <div
            role="tablist"
            aria-label="Milestone Tracker View"
            className="inline-flex items-center p-1 rounded-xl bg-[#EEF7FA] dark:bg-slate-950/70 border border-sky-900/10 dark:border-slate-800 shrink-0"
          >
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'map'}
              onClick={() => setViewMode('map')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                viewMode === 'map'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Progress Map</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'themes'}
              onClick={() => setViewMode('themes')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                viewMode === 'themes'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>UI Themes ({unlockedThemesCount})</span>
            </button>
          </div>

          {onOpenAchievementHall && (
            <button
              type="button"
              onClick={onOpenAchievementHall}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800/90 hover:bg-sky-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-sky-900/15 dark:border-slate-700 text-xs font-semibold transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-sm"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <span>Achievement Hall</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          )}
        </div>
      </div>

      {/* VIEW 1: INTERACTIVE PROGRESS MAP */}
      {viewMode === 'map' && (
        <div className="relative z-10 space-y-6">
          {/* Trajectory Progress Map */}
          <div className="pt-2 pb-1 overflow-x-auto">
            <div className="min-w-[540px] relative px-3 pt-2 pb-2">
              {/* Background Track */}
              <div className="absolute left-8 right-8 top-7 h-1 rounded-full bg-sky-100 dark:bg-slate-800" />
              {/* Completed Fill Track */}
              <div
                className="absolute left-8 top-7 h-1 rounded-full bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500 transition-all duration-500"
                style={{
                  width: `calc(${Math.max(0, overallMapPercent)}% - 4rem * ${
                    overallMapPercent / 100
                  })`,
                }}
              />

              <div className="relative flex items-start justify-between gap-2">
                {enrichedNodes.map((node) => {
                  const isSelected = node.id === selectedNode.id;
                  const isCelebrating = node.id === celebratingNodeId;
                  const hasReward = Boolean(node.rewardTheme);
                  const isActiveReward =
                    node.rewardTheme && node.rewardTheme.id === activeUiTheme;

                  return (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => setSelectedNodeId(node.id)}
                      className="flex flex-col items-center text-center group focus:outline-none w-16 sm:w-20 shrink-0"
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold tabular-nums border-2 transition-transform duration-200 ${
                          isCelebrating
                            ? 'scale-125 ring-4 ring-emerald-400/50'
                            : isSelected
                              ? 'scale-110 ring-4 ring-blue-500/20'
                              : 'group-hover:scale-105'
                        } ${
                          node.unlocked
                            ? 'bg-emerald-600 dark:bg-emerald-500 text-white border-white dark:border-slate-900 shadow-md'
                            : node.percent > 0
                              ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 border-blue-500 dark:border-blue-400'
                              : 'bg-[#F2F9FC] dark:bg-slate-900 text-slate-400 dark:text-slate-500 border-sky-900/15 dark:border-slate-700'
                        }`}
                      >
                        {node.unlocked ? (
                          <Check className="w-4 h-4 stroke-[2.5]" />
                        ) : (
                          <span>0{node.stepNumber}</span>
                        )}
                      </div>

                      <div className="mt-2.5 space-y-0.5 w-full">
                        <div
                          className={`text-[11px] font-bold leading-tight truncate ${
                            isSelected
                              ? 'text-blue-700 dark:text-blue-300'
                              : node.unlocked
                                ? 'text-slate-900 dark:text-white'
                                : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {node.metricLabel}
                        </div>

                        {hasReward ? (
                          <div className="flex items-center justify-center gap-1 pt-0.5">
                            <span
                              className="w-2.5 h-2.5 rounded-full border border-white/60 dark:border-slate-900"
                              style={{ backgroundColor: node.rewardTheme!.swatches[0] }}
                            />
                            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate max-w-[54px]">
                              {isActiveReward ? 'Equipped' : 'Theme'}
                            </span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 tabular-nums">
                            {node.unlocked ? 'Cleared' : `${node.percent}%`}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Hairline Divider */}
          <div className="border-t border-sky-900/10 dark:border-slate-800/80" />

          {/* Selected Milestone Inspector + Reward Action */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
            <div className="md:col-span-7 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    Milestone 0{selectedNode.stepNumber}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{selectedNode.metricLabel}</span>
                  <span aria-hidden="true">·</span>
                  <span
                    className={`font-semibold ${
                      selectedNode.unlocked
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {selectedNode.unlocked ? 'Completed' : 'In Progress'}
                  </span>
                </div>

                {selectedNode.unlocked && (
                  <button
                    type="button"
                    onClick={() => triggerNodeCelebration(selectedNode.achievementId)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0"
                    title="Replay unlock confetti celebration"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Celebrate</span>
                  </button>
                )}
              </div>

              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                {selectedNode.title}
              </h3>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs tabular-nums">
                  <span className="text-slate-600 dark:text-slate-400">
                    Progress toward {selectedNode.metricLabel}
                  </span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-white">
                    {Math.min(selectedNode.current, selectedNode.requirement).toLocaleString()} /{' '}
                    {selectedNode.requirement.toLocaleString()} {selectedNode.unit} (
                    {selectedNode.percent}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-sky-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      selectedNode.unlocked
                        ? 'bg-emerald-500'
                        : 'bg-gradient-to-r from-blue-600 to-indigo-500'
                    }`}
                    style={{ width: `${selectedNode.percent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Associated Theme Reward Panel */}
            <div className="md:col-span-5">
              {selectedNode.rewardTheme ? (
                (() => {
                  const reward = selectedNode.rewardTheme!;
                  const unlocked = isThemeUnlocked(reward);
                  const isActive = activeUiTheme === reward.id;

                  return (
                    <div className="p-4 rounded-2xl bg-[#F2F9FC] dark:bg-slate-950/60 border border-sky-900/10 dark:border-slate-800 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            Unlockable UI Theme
                          </div>
                          <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {reward.name}
                          </div>
                        </div>

                        {/* Palette Swatch Strip */}
                        <div className="flex items-center -space-x-1 shrink-0">
                          {reward.swatches.map((hex, idx) => (
                            <span
                              key={idx}
                              className="w-5 h-5 rounded-full border-2 border-white dark:border-slate-900 shadow-sm"
                              style={{ backgroundColor: hex }}
                            />
                          ))}
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {reward.description}
                      </p>

                      {unlocked ? (
                        <button
                          type="button"
                          onClick={() => onSelectUiTheme(isActive ? 'default' : reward.id)}
                          className={`w-full py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                            isActive
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm'
                          }`}
                        >
                          {isActive ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Active Theme (Reset to Default)</span>
                            </>
                          ) : (
                            <>
                              <Palette className="w-3.5 h-3.5" />
                              <span>Apply {reward.name}</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 pt-1">
                          <span className="flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5" />
                            <span>Unlock at {selectedNode.metricLabel}</span>
                          </span>
                          <span className="tabular-nums font-mono">
                            {Math.max(0, selectedNode.requirement - selectedNode.current)}{' '}
                            {selectedNode.unit} left
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                <div className="p-4 rounded-2xl bg-[#F2F9FC] dark:bg-slate-950/60 border border-sky-900/10 dark:border-slate-800 space-y-2">
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Foundation Checkpoint
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Clearing foundational checkpoints builds momentum toward unlockable visual themes at 3-day, 7-day, 300-minute, 14-day, and 1,000-minute milestones.
                  </p>
                  <button
                    type="button"
                    onClick={() => setViewMode('themes')}
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                  >
                    <span>Browse all UI themes</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: UNLOCKABLE UI THEMES VAULT */}
      {viewMode === 'themes' && (
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {UNLOCKABLE_THEMES.map((uiTheme) => {
            const unlocked = isThemeUnlocked(uiTheme);
            const isActive = activeUiTheme === uiTheme.id;
            const canvasPreview =
              theme === 'dark' ? uiTheme.darkCanvasHex : uiTheme.lightCanvasHex;

            return (
              <div
                key={uiTheme.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
                  isActive
                    ? 'bg-white dark:bg-slate-900 border-blue-500 shadow-md'
                    : unlocked
                      ? 'bg-[#F2F9FC] dark:bg-slate-950/60 border-sky-900/10 dark:border-slate-800'
                      : 'bg-[#F6FAFC] dark:bg-slate-950/35 border-sky-900/10 dark:border-slate-800/70 opacity-80'
                }`}
              >
                <div className="space-y-3">
                  {/* Live Canvas Preview Strip */}
                  <div
                    className="h-14 rounded-xl border border-sky-900/10 dark:border-white/10 p-3 flex items-center justify-between"
                    style={{ backgroundColor: canvasPreview }}
                  >
                    <div className="flex items-center gap-1.5">
                      {uiTheme.swatches.map((hex, i) => (
                        <span
                          key={i}
                          className="w-4 h-4 rounded-full border border-white/60 dark:border-slate-900"
                          style={{ backgroundColor: hex }}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                      {theme === 'dark' ? (
                        <Moon className="w-3.5 h-3.5" />
                      ) : (
                        <Sun className="w-3.5 h-3.5" />
                      )}
                      <span>{theme === 'dark' ? 'Dark Pair' : 'Light Pair'}</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {uiTheme.name}
                      </h3>
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        {unlocked ? 'Unlocked' : uiTheme.unlockRequirementLabel}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                      {uiTheme.description}
                    </p>
                  </div>
                </div>

                {unlocked ? (
                  <button
                    type="button"
                    onClick={() => onSelectUiTheme(uiTheme.id)}
                    className={`w-full py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                      isActive
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white hover:bg-sky-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white border border-sky-900/15 dark:border-slate-700'
                    }`}
                  >
                    {isActive ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Equipped</span>
                      </>
                    ) : (
                      <span>Apply Theme</span>
                    )}
                  </button>
                ) : (
                  <div className="py-2 px-3 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-sky-900/10 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Requires {uiTheme.unlockRequirementLabel}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
