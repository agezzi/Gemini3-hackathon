import React, { useState, useEffect } from 'react';
import { BrainCircuit } from 'lucide-react';

interface AnalysisSkeletonProps {
  onCancel?: () => void;
}

const ANALYSIS_STAGES = [
  { progress: 18, message: "Parsing behavioral history & friction vectors...", detail: "Auditing temporal variance across last 7 days" },
  { progress: 42, message: "Detecting prefrontal fatigue & dopamine collapse points...", detail: "Calculating ultradian exhaustion thresholds" },
  { progress: 68, message: "Synthesizing circadian-aligned time blocks...", detail: "Structuring 45-minute focus containment boundaries" },
  { progress: 89, message: "Injecting sensory grounding buffers & micro-wins...", detail: "Calibrating restorative interleaving intervals" },
  { progress: 96, message: "Finalizing executive protocol adaptation...", detail: "Locking neuro-resilient daily schedule" }
];

export const AnalysisSkeleton: React.FC<AnalysisSkeletonProps> = () => {
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [displayProgress, setDisplayProgress] = useState(12);

  useEffect(() => {
    const progressInterval = setInterval(() => {
      setDisplayProgress(prev => {
        if (prev < 95) {
          const next = prev + Math.floor(Math.random() * 4) + 1;
          return next > 95 ? 95 : next;
        }
        return prev;
      });
    }, 200);

    const stageInterval = setInterval(() => {
      setCurrentStageIndex(prev => (prev < ANALYSIS_STAGES.length - 1 ? prev + 1 : prev));
    }, 1800);

    return () => {
      clearInterval(progressInterval);
      clearInterval(stageInterval);
    };
  }, []);

  const currentStage = ANALYSIS_STAGES[currentStageIndex];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .skeleton-shimmer {
          background: linear-gradient(90deg, rgba(148, 163, 184, 0.12) 25%, rgba(148, 163, 184, 0.24) 37%, rgba(148, 163, 184, 0.12) 63%);
          background-size: 200% 100%;
          animation: shimmer 1.8s ease-in-out infinite;
        }
      `}</style>

      {/* Progress & Live Synaptic Feedback Card */}
      <div className="bg-white/90 dark:bg-slate-900/90 border border-blue-300/60 dark:border-blue-500/30 rounded-3xl p-6 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-slate-200 dark:bg-slate-800 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-600 via-violet-500 to-amber-400 transition-all duration-300"
            style={{ width: `${displayProgress}%` }}
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 relative">
              <BrainCircuit className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
                  Neural Engine Active
                </span>
                <span className="font-mono font-bold text-slate-700 dark:text-blue-300 tabular-nums">
                  · {displayProgress}%
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                {currentStage.message}
              </h3>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 block">
              {currentStage.detail}
            </span>
          </div>
        </div>

        <div className="w-full h-2 bg-[#EEF7FA] dark:bg-slate-950 rounded-full overflow-hidden p-0.5 border border-sky-900/10 dark:border-white/5">
          <div 
            className="h-full bg-gradient-to-r from-blue-600 via-violet-500 to-amber-400 rounded-full transition-all duration-300"
            style={{ width: `${displayProgress}%` }}
          />
        </div>
      </div>

      <div className="border border-amber-300/60 dark:border-amber-500/20 bg-white/80 dark:bg-amber-500/5 rounded-2xl p-6 shadow-md space-y-4">
        <div className="flex items-center justify-between border-b border-amber-200/60 dark:border-amber-500/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl skeleton-shimmer" />
            <div className="h-5 w-44 rounded-lg skeleton-shimmer" />
          </div>
          <div className="h-4 w-24 rounded-full skeleton-shimmer" />
        </div>
        <div className="space-y-2.5 pt-1">
          <div className="h-4 w-full rounded-md skeleton-shimmer" />
          <div className="h-4 w-[94%] rounded-md skeleton-shimmer" />
          <div className="h-4 w-[82%] rounded-md skeleton-shimmer" />
        </div>
      </div>

      <div className="border border-blue-300/50 dark:border-emerald-500/30 bg-white/85 dark:bg-slate-900/80 rounded-2xl p-6 shadow-md space-y-5">
        <div className="flex items-center justify-between border-b border-sky-900/10 dark:border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl skeleton-shimmer" />
            <div className="h-5 w-48 rounded-lg skeleton-shimmer" />
          </div>
          <div className="h-6 w-28 rounded-xl skeleton-shimmer" />
        </div>

        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3.5 rounded-xl bg-[#F4FAFD] dark:bg-slate-950/60 border border-sky-900/10 dark:border-white/5">
              <div className="w-5 h-5 rounded-lg skeleton-shimmer shrink-0" />
              <div className="h-3.5 rounded skeleton-shimmer flex-1" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
