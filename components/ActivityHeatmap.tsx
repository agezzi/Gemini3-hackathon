import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { Calendar, Flame, CheckCircle2, Trophy } from 'lucide-react';
import { UserStats, GoalRecord } from '../types';

interface ActivityHeatmapProps {
  stats: UserStats;
}

export interface DayActivityData {
  dateStr: string;
  dateObj: Date;
  dayOfWeek: number;
  weekIndex: number;
  hasSync: boolean;
  syncCount: number;
  focusMinutes: number;
  completedGoalsCount: number;
  completedGoalTitles: string[];
  totalScore: number;
  isToday: boolean;
}

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({ stats }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoveredDay, setHoveredDay] = useState<DayActivityData | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [isDark, setIsDark] = useState<boolean>(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  );

  // Watch html.dark changes so D3 SVG tiles adapt immediately when Light/Dark toggles
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const activityData: DayActivityData[] = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const goalHistory = stats.goalHistory || [];
    const entryHistory = stats.entryTimeHistory || [];
    const dailyFocus = stats.dailyFocusMinutes || {};

    const completedGoalsByDate: Record<string, string[]> = {};
    goalHistory.forEach((g: GoalRecord) => {
      if (g.status === 'completed' && g.completedAt) {
        const dStr = g.completedAt.split('T')[0];
        if (!completedGoalsByDate[dStr]) completedGoalsByDate[dStr] = [];
        completedGoalsByDate[dStr].push(g.title);
      }
    });

    const syncCountByDate: Record<string, number> = {};
    entryHistory.forEach((iso: string) => {
      const dStr = iso.split('T')[0];
      syncCountByDate[dStr] = (syncCountByDate[dStr] || 0) + 1;
    });

    const days: DayActivityData[] = [];
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 29);

    for (let i = 0; i < 30; i++) {
      const cur = new Date(startDate);
      cur.setDate(cur.getDate() + i);
      const curStr = cur.toISOString().split('T')[0];
      const isToday = cur.getTime() === today.getTime();

      const syncs = syncCountByDate[curStr] || 0;
      const focusMins = dailyFocus[curStr] || 0;
      const completedGoals = completedGoalsByDate[curStr] || [];
      const focusScore = focusMins >= 360 ? 3 : focusMins >= 120 ? 2 : focusMins > 0 ? 1 : 0;
      const totalScore = (syncs > 0 ? 1 : 0) + (syncs > 1 ? 1 : 0) + focusScore + (completedGoals.length * 2);

      days.push({
        dateStr: curStr,
        dateObj: cur,
        dayOfWeek: cur.getDay(),
        weekIndex: 0,
        hasSync: syncs > 0,
        syncCount: syncs,
        focusMinutes: focusMins,
        completedGoalsCount: completedGoals.length,
        completedGoalTitles: completedGoals,
        totalScore,
        isToday
      });
    }

    let currentWeek = 0;
    days.forEach((day, idx) => {
      if (idx > 0 && day.dayOfWeek === 0) {
        currentWeek++;
      }
      day.weekIndex = currentWeek;
    });

    return days;
  }, [stats.entryTimeHistory, stats.goalHistory, stats.dailyFocusMinutes]);

  const activeDaysCount = useMemo(() => {
    return activityData.filter(d => d.totalScore > 0).length;
  }, [activityData]);

  const totalGoalsCompletedIn30d = useMemo(() => {
    return activityData.reduce((acc, d) => acc + d.completedGoalsCount, 0);
  }, [activityData]);

  useEffect(() => {
    if (!svgRef.current || activityData.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const cellSize = 13;
    const cellGap = 3.5;
    const cellRadius = 3;
    const paddingLeft = 24;
    const paddingTop = 18;

    const maxWeek = d3.max(activityData, d => d.weekIndex) || 4;
    const width = paddingLeft + (maxWeek + 1) * (cellSize + cellGap) + 10;
    const height = paddingTop + 7 * (cellSize + cellGap) + 8;

    svg.attr('viewBox', `0 0 ${width} ${height}`)
       .attr('width', '100%')
       .attr('height', '100%');

    const emptyFill = isDark ? '#1e293b' : '#dceef5';
    const labelColor = isDark ? '#94a3b8' : '#64748b';

    const colorScale = d3.scaleThreshold<number, string>()
      .domain([1, 2, 4, 6])
      .range([
        emptyFill,
        '#2563eb',
        '#7c3aed',
        '#10b981',
        '#34d399'
      ]);

    const mainG = svg.append('g');

    const dayLabels = [
      { day: 1, label: 'M' },
      { day: 3, label: 'W' },
      { day: 5, label: 'F' }
    ];

    mainG.selectAll('.day-label')
      .data(dayLabels)
      .enter()
      .append('text')
      .attr('class', 'day-label')
      .attr('x', paddingLeft - 7)
      .attr('y', d => paddingTop + d.day * (cellSize + cellGap) + cellSize * 0.75)
      .attr('text-anchor', 'end')
      .attr('font-size', '8px')
      .attr('font-weight', '700')
      .attr('font-family', 'monospace')
      .attr('fill', labelColor)
      .text(d => d.label);

    const firstDay = activityData[0];
    const lastDay = activityData[activityData.length - 1];
    const monthFormatter = d3.timeFormat('%b');
    const firstMonth = monthFormatter(firstDay.dateObj);
    const lastMonth = monthFormatter(lastDay.dateObj);
    const headerText = firstMonth === lastMonth ? firstMonth : `${firstMonth} - ${lastMonth}`;

    mainG.append('text')
      .attr('x', paddingLeft)
      .attr('y', paddingTop - 6)
      .attr('font-size', '8px')
      .attr('font-weight', '800')
      .attr('font-family', 'monospace')
      .attr('fill', labelColor)
      .attr('letter-spacing', '0.1em')
      .text(headerText.toUpperCase());

    const cells = mainG.selectAll('.day-cell')
      .data(activityData)
      .enter()
      .append('g')
      .attr('class', 'day-cell-group')
      .attr('transform', d => {
        const x = paddingLeft + d.weekIndex * (cellSize + cellGap);
        const y = paddingTop + d.dayOfWeek * (cellSize + cellGap);
        return `translate(${x}, ${y})`;
      });

    cells.append('rect')
      .attr('width', cellSize)
      .attr('height', cellSize)
      .attr('rx', cellRadius)
      .attr('ry', cellRadius)
      .attr('fill', d => (d.totalScore === 0 ? emptyFill : colorScale(d.totalScore)))
      .attr('stroke', d => {
        if (d.isToday) return '#2563eb';
        if (d.completedGoalsCount > 0) return isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(15, 23, 42, 0.2)';
        return 'transparent';
      })
      .attr('stroke-width', d => (d.isToday ? 1.5 : 0.8))
      .style('cursor', 'pointer')
      .style('transition', 'all 0.2s ease')
      .on('mouseenter', function (event, d) {
        d3.select(this)
          .attr('transform', 'scale(1.25)')
          .attr('stroke', isDark ? '#ffffff' : '#0f172a')
          .attr('stroke-width', 1.5);

        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          setTooltipPos({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
          });
        }
        setHoveredDay(d);
      })
      .on('mouseleave', function (_event, d) {
        d3.select(this)
          .attr('transform', 'scale(1)')
          .attr('stroke', d.isToday ? '#2563eb' : (d.completedGoalsCount > 0 ? (isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(15, 23, 42, 0.2)') : 'transparent'))
          .attr('stroke-width', d.isToday ? 1.5 : 0.8);

        setHoveredDay(null);
        setTooltipPos(null);
      });

    cells.filter(d => d.completedGoalsCount > 0)
      .append('circle')
      .attr('cx', cellSize / 2)
      .attr('cy', cellSize / 2)
      .attr('r', 1.8)
      .attr('fill', '#ffffff')
      .attr('pointer-events', 'none')
      .style('opacity', 0.95);

  }, [activityData, isDark]);

  return (
    <div 
      ref={containerRef}
      className="bg-[#F2F9FC] dark:bg-slate-950/60 p-5 rounded-2xl border border-sky-900/10 dark:border-white/5 relative overflow-hidden group shadow-sm"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-emerald-400">
            <Calendar className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-wider leading-none">
              30-Day Activity
            </h3>
            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block mt-0.5">
              Focus &amp; Goal Velocity
            </span>
          </div>
        </div>

        <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-bold tabular-nums">
          {activeDaysCount}/30 Days
        </span>
      </div>

      <div className="w-full aspect-[2.8/1] min-h-[120px] max-h-[140px] relative">
        <svg ref={svgRef} className="w-full h-full overflow-visible" />

        {hoveredDay && tooltipPos && (
          <div 
            className="absolute z-50 pointer-events-none bg-white/95 dark:bg-slate-900 border border-sky-900/15 dark:border-white/15 rounded-xl p-3 shadow-xl backdrop-blur-md text-left text-xs min-w-[160px] max-w-[220px] animate-in fade-in zoom-in-95 duration-150"
            style={{
              left: Math.min(Math.max(tooltipPos.x - 80, 10), 240),
              top: Math.max(tooltipPos.y - 75, -10)
            }}
          >
            <div className="flex items-center justify-between border-b border-sky-900/10 dark:border-white/10 pb-1.5 mb-2">
              <span className="font-mono text-[10px] font-bold text-slate-700 dark:text-slate-300">
                {hoveredDay.dateStr}
              </span>
              {hoveredDay.isToday && (
                <span className="text-[9px] uppercase tracking-wider font-bold text-blue-600 dark:text-sky-400">
                  Today
                </span>
              )}
            </div>

            <div className="space-y-1 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-amber-500" /> Sessions:
                </span>
                <span className="font-bold text-slate-900 dark:text-white font-mono tabular-nums">
                  {hoveredDay.syncCount}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Goals:
                </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                  {hoveredDay.completedGoalsCount}
                </span>
              </div>

              {hoveredDay.focusMinutes > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Focus:</span>
                  <span className={`font-bold font-mono tabular-nums ${
                    hoveredDay.focusMinutes >= 360
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-blue-600 dark:text-blue-400'
                  }`}>
                    {Math.floor(hoveredDay.focusMinutes / 60)}h {hoveredDay.focusMinutes % 60}m
                    {hoveredDay.focusMinutes >= 360 ? ' · Peak' : ''}
                  </span>
                </div>
              )}

              {hoveredDay.completedGoalTitles.length > 0 && (
                <div className="pt-1.5 mt-1 border-t border-sky-900/10 dark:border-white/5 space-y-0.5">
                  {hoveredDay.completedGoalTitles.slice(0, 2).map((title, idx) => (
                    <p key={idx} className="text-[10px] text-slate-700 dark:text-slate-200 truncate italic">
                      · {title}
                    </p>
                  ))}
                </div>
              )}

              {hoveredDay.totalScore === 0 && (
                <p className="text-[10px] text-slate-400 italic pt-1">
                  No activity recorded
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-sky-900/10 dark:border-white/5 flex items-center justify-between text-[10px] font-mono">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
            <Trophy className="w-3 h-3 text-amber-500" />
            <span>Goals: <strong className="text-slate-900 dark:text-white tabular-nums">{totalGoalsCompletedIn30d}</strong></span>
          </div>
          <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
            <Flame className="w-3 h-3 text-orange-500" />
            <span>Streak: <strong className="text-slate-900 dark:text-white tabular-nums">{stats.currentStreak}d</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-[9px] text-slate-400 uppercase mr-0.5">Less</span>
          <div className="w-2.5 h-2.5 rounded-sm bg-[#dceef5] dark:bg-[#1e293b]" />
          <div className="w-2.5 h-2.5 rounded-sm bg-[#2563eb]" />
          <div className="w-2.5 h-2.5 rounded-sm bg-[#7c3aed]" />
          <div className="w-2.5 h-2.5 rounded-sm bg-[#10b981]" />
          <div className="w-2.5 h-2.5 rounded-sm bg-[#34d399]" />
          <span className="text-[9px] text-slate-400 uppercase ml-0.5">More</span>
        </div>
      </div>
    </div>
  );
};
