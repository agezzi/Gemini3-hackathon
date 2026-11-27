import React from 'react';
import {
  Activity,
  ArrowLeft,
  Clock,
  Download,
  Eye,
  Printer,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Target,
  Zap
} from 'lucide-react';
import { CognitivePerformanceReport, DemoProfileId } from '../../services/xr/xrTypes';
import { INVESTOR_DEMO_PROFILES } from '../../services/xr/investorDemoProfiles';
import { PerformanceCharts } from './PerformanceCharts';

interface CognitiveResultsDashboardProps {
  report: CognitivePerformanceReport;
  onRetakeInteractive: () => void;
  onRunDemoProfile: (profileId: DemoProfileId) => void;
  onBackToXRLanding: () => void;
  onReturnToNeuralPlan: () => void;
}

const formatDuration = (ms: number): string => {
  const secs = Math.round(ms / 1000);
  const mins = Math.floor(secs / 60);
  const rem = secs % 60;
  return mins > 0 ? `${mins}m ${rem}s` : `${rem}s`;
};

export const CognitiveResultsDashboard: React.FC<CognitiveResultsDashboardProps> = ({
  report,
  onRetakeInteractive,
  onRunDemoProfile,
  onBackToXRLanding,
  onReturnToNeuralPlan
}) => {
  const handleExportJSON = () => {
    const jsonString = JSON.stringify(report, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `neuralplan-xr-report-${report.sessionId}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrintReport = () => {
    window.print();
  };

  const isDemo = report.trackingMode === 'investor_demo_synthetic';

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 pb-16">
      {/* Top Action Header */}
      <header className="border-b border-slate-800/80 bg-[#0B0E17]/95 backdrop-blur-md sticky top-0 z-30 print:hidden">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onReturnToNeuralPlan}
              className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>NeuralPlan Dashboard</span>
            </button>
            <span className="text-slate-700" aria-hidden="true">·</span>
            <button
              type="button"
              onClick={onBackToXRLanding}
              className="text-xs font-medium text-slate-400 hover:text-amber-300 transition-colors whitespace-nowrap shrink-0"
            >
              XR Overview
            </button>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleExportJSON}
              className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>

            <button
              type="button"
              onClick={handlePrintReport}
              className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>

            <button
              type="button"
              onClick={onRetakeInteractive}
              className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retake Session</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-8 space-y-8">
        {/* Mandatory Non-Clinical Disclaimer Banner */}
        <div className="rounded-xl border border-amber-500/30 bg-[#10131C] p-4 flex items-start gap-3">
          <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-300 leading-relaxed">
            NeuralPlan XR is an experimental cognitive simulation designed to explore attention-related behaviours. This experience is not a medical device and does not diagnose ADHD or any other neurodevelopmental condition.
          </p>
        </div>

        {/* Investor Demo Mode Callout + Quick Profile Switcher */}
        {isDemo && (
          <div className="rounded-xl border border-cyan-500/40 bg-[#0D1624] p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:border-slate-700">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-mono text-cyan-300 font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Investor Demo Mode — Synthetic Data</span>
              </div>
              <p className="text-xs text-slate-300">
                Currently displaying synthetic gaze telemetry for <strong>{report.demoProfileLabel}</strong>. Launch another illustrative scenario to inspect how metrics adapt:
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 print:hidden shrink-0">
              {(Object.keys(INVESTOR_DEMO_PROFILES) as DemoProfileId[]).map((pid) => (
                <button
                  key={pid}
                  type="button"
                  onClick={() => onRunDemoProfile(pid)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    report.demoProfileId === pid
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                      : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-cyan-500/40'
                  }`}
                >
                  Run {INVESTOR_DEMO_PROFILES[pid].shortTitle}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Title & Session Overview */}
        <section className="rounded-2xl border border-slate-800 bg-[#0B0E17] p-6 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-mono text-amber-400">
                Cognitive Performance Summary · {report.sessionId}
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
                Attention &amp; Gaze Analytics Report
              </h1>
            </div>
            <div className="text-right text-xs font-mono text-slate-400 space-y-1">
              <div>{new Date(report.completedAt).toLocaleString()}</div>
              <div>
                Status:{' '}
                <span
                  className={
                    report.completionStatus === 'completed'
                      ? 'text-emerald-400'
                      : 'text-amber-300'
                  }
                >
                  {report.completionStatus === 'completed' ? 'Completed All Stages' : 'Partial Session'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-800/80 text-xs">
            <div>
              <div className="text-slate-500 mb-1">Tracking Mode</div>
              <div className="font-mono text-slate-200">
                {isDemo ? 'Simulated Demo (Synthetic)' : 'Simulated Gaze (Cursor)'}
              </div>
            </div>
            <div>
              <div className="text-slate-500 mb-1">Total Session Duration</div>
              <div className="font-mono text-slate-200 tabular-nums">
                {formatDuration(report.totalSessionDurationMs)}
              </div>
            </div>
            <div>
              <div className="text-slate-500 mb-1">Valid Observation Time</div>
              <div className="font-mono text-amber-300 tabular-nums">
                {formatDuration(report.totalValidObservationMs)}
              </div>
            </div>
            <div>
              <div className="text-slate-500 mb-1">Paused / Unfocused</div>
              <div className="font-mono text-violet-300 tabular-nums">
                {formatDuration(report.totalPausedMs)}
              </div>
            </div>
          </div>
        </section>

        {/* Five Main Cognitive Indicator Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* 1. Target Fixation */}
          <div className="rounded-2xl border border-slate-800 bg-[#0B0E17] p-5 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Target Fixation</span>
              <Target className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-3xl font-semibold font-mono text-white tabular-nums">
              {report.targetFixationPct}%
            </div>
            <p className="text-xs text-slate-400">
              Early {report.earlySessionFixationPct}% vs Late {report.lateSessionFixationPct}%
            </p>
          </div>

          {/* 2. Distractor Captures */}
          <div className="rounded-2xl border border-slate-800 bg-[#0B0E17] p-5 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Distractor Captures</span>
              <Eye className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-3xl font-semibold font-mono text-white tabular-nums">
              {report.distractorCaptureCount}
            </div>
            <p className="text-xs text-slate-400">
              {report.distractorCaptureCount > 0
                ? `Avg duration: ${report.avgDistractionDurationMs} ms`
                : 'No sustained captures logged'}
            </p>
          </div>

          {/* 3. Average Refocusing Latency */}
          <div className="rounded-2xl border border-slate-800 bg-[#0B0E17] p-5 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Avg Refocusing</span>
              <Clock className="w-4 h-4 text-amber-300" />
            </div>
            <div className="text-3xl font-semibold font-mono text-white tabular-nums">
              {report.avgRefocusLatencyMs > 0 ? `${report.avgRefocusLatencyMs} ms` : '—'}
            </div>
            <p className="text-xs text-slate-400">
              {report.medianRefocusLatencyMs > 0
                ? `Median recovery: ${report.medianRefocusLatencyMs} ms`
                : 'No off-target returns measured'}
            </p>
          </div>

          {/* 4. Response Accuracy */}
          <div className="rounded-2xl border border-slate-800 bg-[#0B0E17] p-5 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Response Accuracy</span>
              <Zap className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-semibold font-mono text-white tabular-nums">
              {report.responseAccuracyPct !== null ? `${report.responseAccuracyPct}%` : 'N/A'}
            </div>
            <p className="text-xs text-slate-400">
              {report.totalDoublePulses > 0
                ? `${report.correctHitCount}/${report.totalDoublePulses} hits · ${report.falseAlarmCount} false alarms`
                : 'Stage 4 not completed'}
            </p>
          </div>

          {/* 5. Reaction-Time Consistency */}
          <div className="rounded-2xl border border-slate-800 bg-[#0B0E17] p-5 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>RT Consistency</span>
              <Activity className="w-4 h-4 text-violet-400" />
            </div>
            <div className="text-3xl font-semibold font-mono text-white tabular-nums">
              {report.responseConsistencyPct !== null ? `${report.responseConsistencyPct}%` : 'N/A'}
            </div>
            <p className="text-xs text-slate-400">
              {report.avgReactionTimeMs !== null
                ? `Mean ${report.avgReactionTimeMs} ms (±${report.reactionTimeStdDevMs ?? 0} ms)`
                : 'Requires Stage 4 hits'}
            </p>
          </div>
        </section>

        {/* Visual Analytics Suite */}
        <PerformanceCharts report={report} />

        {/* Data-Driven Observations & Exploratory Recommendations */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <section className="lg:col-span-6 rounded-2xl border border-slate-800 bg-[#0B0E17] p-6 space-y-4">
            <div>
              <h3 className="text-base font-semibold text-white">
                Descriptive Cognitive Observations
              </h3>
              <p className="text-xs text-slate-400">
                Neutral summary derived directly from recorded session timestamps and events
              </p>
            </div>
            <ul className="space-y-3">
              {report.observations.map((obs, idx) => (
                <li
                  key={idx}
                  className="text-sm text-slate-300 leading-relaxed pl-4 border-l-2 border-amber-500/40"
                >
                  {obs}
                </li>
              ))}
            </ul>
          </section>

          <section className="lg:col-span-6 rounded-2xl border border-slate-800 bg-[#0B0E17] p-6 space-y-4">
            <div>
              <h3 className="text-base font-semibold text-white">
                Exploratory Productivity Reflections
              </h3>
              <p className="text-xs text-slate-400">
                Non-clinical workflow experiments worth testing alongside your NeuralPlan routine
              </p>
            </div>
            <div className="space-y-3">
              {report.recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-slate-800 bg-[#080B12] space-y-1.5"
                >
                  <div className="text-sm font-medium text-amber-300">{rec.title}</div>
                  <p className="text-xs text-slate-300 leading-relaxed">{rec.detail}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};
