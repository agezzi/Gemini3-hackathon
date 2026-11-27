import React, { useMemo, useState } from 'react';
import * as d3 from 'd3';
import { CognitivePerformanceReport, GazeStateType } from '../../services/xr/xrTypes';

interface PerformanceChartsProps {
  report: CognitivePerformanceReport;
}

const STATE_COLORS: Record<GazeStateType, string> = {
  target: '#F59E0B',     // Amber
  distractor: '#06B6D4', // Cyan
  outside: '#64748B',    // Grey
  paused: '#8B5CF6'      // Violet
};

const STATE_LABELS: Record<GazeStateType, string> = {
  target: 'Target Fixation',
  distractor: 'Distractor Capture',
  outside: 'Outside Target',
  paused: 'Paused / Unfocused'
};

const formatSec = (ms: number): string => `${(ms / 1000).toFixed(1)}s`;

export const PerformanceCharts: React.FC<PerformanceChartsProps> = ({ report }) => {
  const [hoveredSegIdx, setHoveredSegIdx] = useState<number | null>(null);

  const totalSessionMs = Math.max(1, report.totalSessionDurationMs);

  // 1. Attention Over Time (24 even slices across valid observation)
  const attentionCurve = useMemo(() => {
    const validSegs = report.timelineSegments.filter((s) => s.state !== 'paused');
    const totalValid = validSegs.reduce((a, b) => a + b.durationMs, 0);
    if (totalValid <= 0) return [];

    const binCount = 24;
    const binSize = totalValid / binCount;
    const bins: Array<{ index: number; label: string; fixationPct: number }> = [];

    // Re-index valid segments sequentially in valid-time coordinates
    let cursor = 0;
    const validTimed = validSegs.map((s) => {
      const start = cursor;
      cursor += s.durationMs;
      return { state: s.state, start, end: cursor };
    });

    for (let i = 0; i < binCount; i++) {
      const bStart = i * binSize;
      const bEnd = (i + 1) * binSize;
      let targetMs = 0;
      validTimed.forEach((seg) => {
        const overlapStart = Math.max(bStart, seg.start);
        const overlapEnd = Math.min(bEnd, seg.end);
        if (overlapEnd > overlapStart && seg.state === 'target') {
          targetMs += overlapEnd - overlapStart;
        }
      });
      bins.push({
        index: i,
        label: `${Math.round(bStart / 1000)}s`,
        fixationPct: Number(((targetMs / binSize) * 100).toFixed(1))
      });
    }
    return bins;
  }, [report.timelineSegments]);

  // 2. Gaze Distribution Totals
  const gazeDistribution = useMemo(() => {
    const sums: Record<GazeStateType, number> = {
      target: 0,
      distractor: 0,
      outside: 0,
      paused: 0
    };
    report.timelineSegments.forEach((seg) => {
      sums[seg.state] += seg.durationMs;
    });
    const totalAll = Math.max(1, Object.values(sums).reduce((a, b) => a + b, 0));
    return (['target', 'distractor', 'outside', 'paused'] as GazeStateType[]).map((state) => ({
      state,
      label: STATE_LABELS[state],
      color: STATE_COLORS[state],
      ms: sums[state],
      pct: Number(((sums[state] / totalAll) * 100).toFixed(1))
    }));
  }, [report.timelineSegments]);

  // Donut Arc Generator via d3
  const donutArcs = useMemo(() => {
    const activeSlices = gazeDistribution.filter((d) => d.ms > 0);
    const pie = d3
      .pie<(typeof gazeDistribution)[number]>()
      .value((d) => d.ms)
      .sort(null);
    const arc = d3
      .arc<d3.PieArcDatum<(typeof gazeDistribution)[number]>>()
      .innerRadius(48)
      .outerRadius(72);

    return pie(activeSlices).map((slice) => ({
      data: slice.data,
      path: arc(slice) || ''
    }));
  }, [gazeDistribution]);

  // Attention Over Time SVG paths via d3
  const lineChartPaths = useMemo(() => {
    if (attentionCurve.length < 2) return null;
    const w = 520;
    const h = 160;
    const pad = { top: 14, right: 14, bottom: 26, left: 34 };
    const x = d3
      .scaleLinear()
      .domain([0, attentionCurve.length - 1])
      .range([pad.left, w - pad.right]);
    const y = d3.scaleLinear().domain([0, 100]).range([h - pad.bottom, pad.top]);

    const line = d3
      .line<(typeof attentionCurve)[number]>()
      .x((d) => x(d.index))
      .y((d) => y(d.fixationPct))
      .curve(d3.curveMonotoneX);

    const area = d3
      .area<(typeof attentionCurve)[number]>()
      .x((d) => x(d.index))
      .y0(y(0))
      .y1((d) => y(d.fixationPct))
      .curve(d3.curveMonotoneX);

    return {
      width: w,
      height: h,
      pad,
      x,
      y,
      linePath: line(attentionCurve) || '',
      areaPath: area(attentionCurve) || ''
    };
  }, [attentionCurve]);

  // Stage 4 Pulse Trials
  const cptTrials = useMemo(() => {
    return report.pulseTrials.filter((t) => t.type === 'double' || t.outcome === 'false_alarm');
  }, [report.pulseTrials]);

  return (
    <div className="space-y-6">
      {/* A. Horizontal Segmented Attention Timeline */}
      <section className="rounded-2xl border border-slate-800 bg-[#0B0E17] p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-white">
              Attention Timeline Across Session
            </h3>
            <p className="text-xs text-slate-400">
              Segmented real-time transitions between target fixation, distractor captures, peripheral gaze, and paused intervals.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
            {(['target', 'distractor', 'outside', 'paused'] as GazeStateType[]).map((st) => (
              <span key={st} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-sm inline-block"
                  style={{ backgroundColor: STATE_COLORS[st] }}
                />
                <span>{STATE_LABELS[st]}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="relative pt-2">
          <div className="w-full h-10 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 flex">
            {report.timelineSegments.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">
                No telemetry segments recorded
              </div>
            ) : (
              report.timelineSegments.map((seg, idx) => {
                const widthPct = Math.max(0.25, (seg.durationMs / totalSessionMs) * 100);
                return (
                  <div
                    key={idx}
                    onMouseEnter={() => setHoveredSegIdx(idx)}
                    onMouseLeave={() => setHoveredSegIdx(null)}
                    style={{
                      width: `${widthPct}%`,
                      backgroundColor: STATE_COLORS[seg.state]
                    }}
                    className="h-full transition-opacity hover:opacity-80 cursor-crosshair border-r border-black/15 last:border-r-0"
                    title={`${STATE_LABELS[seg.state]} · Stage ${seg.stageId} · ${formatSec(seg.durationMs)}`}
                  />
                );
              })
            )}
          </div>

          <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>0:00 Start</span>
            <span>
              {hoveredSegIdx !== null && report.timelineSegments[hoveredSegIdx]
                ? `Hovered: Stage 0${report.timelineSegments[hoveredSegIdx].stageId} · ${
                    STATE_LABELS[report.timelineSegments[hoveredSegIdx].state]
                  } (${Math.round(report.timelineSegments[hoveredSegIdx].durationMs)} ms)`
                : `Total Observed Duration: ${formatSec(report.totalSessionDurationMs)}`}
            </span>
            <span>End ({formatSec(report.totalSessionDurationMs)})</span>
          </div>
        </div>
      </section>

      {/* B. Attention Over Time + Gaze Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Attention Over Time Curve */}
        <section className="lg:col-span-7 rounded-2xl border border-slate-800 bg-[#0B0E17] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-white">Attention Stability Over Time</h3>
              <p className="text-xs text-slate-400">
                Target fixation trajectory (%) across successive valid observation slices
              </p>
            </div>
            <span className="text-xs font-mono text-amber-300">
              Early {report.earlySessionFixationPct}% → Late {report.lateSessionFixationPct}%
            </span>
          </div>

          {lineChartPaths ? (
            <svg
              viewBox={`0 0 ${lineChartPaths.width} ${lineChartPaths.height}`}
              className="w-full h-44 overflow-visible"
            >
              <defs>
                <linearGradient id="xrAmberArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.32" />
                  <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              {[0, 25, 50, 75, 100].map((tick) => {
                const yPos = lineChartPaths.y(tick);
                return (
                  <g key={tick}>
                    <line
                      x1={lineChartPaths.pad.left}
                      x2={lineChartPaths.width - lineChartPaths.pad.right}
                      y1={yPos}
                      y2={yPos}
                      stroke="rgba(148,163,184,0.12)"
                      strokeDasharray={tick === 50 ? '4 4' : undefined}
                    />
                    <text
                      x={lineChartPaths.pad.left - 8}
                      y={yPos + 3}
                      textAnchor="end"
                      className="fill-slate-500 text-[9px] font-mono"
                    >
                      {tick}%
                    </text>
                  </g>
                );
              })}

              <path d={lineChartPaths.areaPath} fill="url(#xrAmberArea)" />
              <path
                d={lineChartPaths.linePath}
                fill="none"
                stroke="#F59E0B"
                strokeWidth="2.2"
              />

              {attentionCurve.map((pt) => (
                <circle
                  key={pt.index}
                  cx={lineChartPaths.x(pt.index)}
                  cy={lineChartPaths.y(pt.fixationPct)}
                  r="2.6"
                  fill="#FDE68A"
                >
                  <title>{`${pt.label}: ${pt.fixationPct}% fixation`}</title>
                </circle>
              ))}
            </svg>
          ) : (
            <div className="h-44 flex items-center justify-center text-xs text-slate-500">
              Insufficient valid time slices for trajectory curve
            </div>
          )}
        </section>

        {/* Gaze Distribution Donut */}
        <section className="lg:col-span-5 rounded-2xl border border-slate-800 bg-[#0B0E17] p-6 space-y-4">
          <div>
            <h3 className="text-base font-semibold text-white">Gaze Distribution</h3>
            <p className="text-xs text-slate-400">
              Proportional breakdown of total observation state durations
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            <svg viewBox="-82 -82 164 164" className="w-40 h-40 shrink-0">
              {donutArcs.map((arc) => (
                <path key={arc.data.state} d={arc.path} fill={arc.data.color}>
                  <title>{`${arc.data.label}: ${arc.data.pct}% (${formatSec(arc.data.ms)})`}</title>
                </path>
              ))}
              <text
                y="-4"
                textAnchor="middle"
                className="fill-white text-lg font-semibold font-mono"
              >
                {report.targetFixationPct}%
              </text>
              <text y="14" textAnchor="middle" className="fill-slate-400 text-[9px] uppercase">
                On Target
              </text>
            </svg>

            <div className="flex-1 w-full space-y-2.5">
              {gazeDistribution.map((item) => (
                <div key={item.state} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-slate-300">
                      <span
                        className="w-2.5 h-2.5 rounded-sm"
                        style={{ backgroundColor: item.color }}
                      />
                      <span>{item.label}</span>
                    </span>
                    <span className="font-mono text-slate-200 tabular-nums">
                      {item.pct}% ({formatSec(item.ms)})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* C. Stage-by-Stage Performance Comparison + Refocusing Latency */}
      <section className="rounded-2xl border border-slate-800 bg-[#0B0E17] p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-white">
              Stage-by-Stage Attention &amp; Refocusing Dynamics
            </h3>
            <p className="text-xs text-slate-400">
              Comparing target fixation %, distractor captures, and refocusing recovery across cognitive demand levels
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {report.stageMetrics.map((st) => {
            const hasData = st.validObservationMs > 0;
            return (
              <div
                key={st.stageId}
                className="rounded-xl border border-slate-800 bg-[#080B12] p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-amber-400">STAGE 0{st.stageId}</span>
                  <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                    {formatSec(st.validObservationMs)} valid
                  </span>
                </div>
                <div className="text-sm font-medium text-white truncate">{st.stageName}</div>

                {/* Bar for Fixation % */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Fixation</span>
                    <span className="font-mono text-amber-300 tabular-nums">
                      {hasData ? `${st.targetFixationPct}%` : '—'}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{ width: `${hasData ? st.targetFixationPct : 0}%` }}
                    />
                  </div>
                </div>

                {/* Captures & Refocusing Metrics */}
                <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-[10px] text-slate-500">Captures</div>
                    <div className="font-mono text-cyan-300 tabular-nums">
                      {hasData ? st.distractorCaptureCount : '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500">Avg Refocus</div>
                    <div className="font-mono text-slate-200 tabular-nums">
                      {hasData && st.avgRefocusLatencyMs > 0
                        ? `${st.avgRefocusLatencyMs} ms`
                        : '—'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* D. Stage 4 Response-Time Distribution */}
      <section className="rounded-2xl border border-slate-800 bg-[#0B0E17] p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-white">
              Stage 4 Double-Pulse Response Distribution
            </h3>
            <p className="text-xs text-slate-400">
              Trial-by-trial reaction times for target double-pulse hits, missed pulses, and false-alarm lures.
            </p>
          </div>
          {report.avgReactionTimeMs !== null && (
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="text-emerald-300">
                Mean RT: {report.avgReactionTimeMs} ms
              </span>
              <span className="text-slate-300">
                SD: ±{report.reactionTimeStdDevMs ?? 0} ms
              </span>
              <span className="text-amber-300">
                False Alarms: {report.falseAlarmCount}
              </span>
            </div>
          )}
        </div>

        {cptTrials.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
            Stage 4 response trials were not completed in this session.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5">
            {cptTrials.map((trial, i) => {
              const isHit = trial.outcome === 'correct_hit';
              const isMiss = trial.outcome === 'missed_target';
              return (
                <div
                  key={trial.id}
                  className={`p-3 rounded-xl border text-center space-y-1 ${
                    isHit
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : isMiss
                      ? 'bg-slate-900 border-slate-700'
                      : 'bg-rose-500/10 border-rose-500/30'
                  }`}
                >
                  <div className="text-[10px] font-mono text-slate-400">Trial {i + 1}</div>
                  <div
                    className={`text-xs font-mono font-semibold tabular-nums ${
                      isHit
                        ? 'text-emerald-300'
                        : isMiss
                        ? 'text-slate-400'
                        : 'text-rose-300'
                    }`}
                  >
                    {isHit
                      ? `${trial.reactionLatencyMs} ms`
                      : isMiss
                      ? 'Missed'
                      : 'False Alarm'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
