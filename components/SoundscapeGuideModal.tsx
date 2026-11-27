import React from 'react';
import {
  Headphones,
  Smartphone,
  Lock,
  Power,
  X,
  CheckCircle2,
  Home,
} from 'lucide-react';

interface SoundscapeGuideModalProps {
  isOpen: boolean;
  onClose: (markSeen?: boolean) => void;
  onStartAudio?: () => void;
  startLabel?: string;
}

export const SoundscapeGuideModal: React.FC<SoundscapeGuideModalProps> = ({
  isOpen,
  onClose,
  onStartAudio,
  startLabel = 'Got It',
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[130] bg-slate-950/60 dark:bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="soundscape-guide-title"
    >
      <div className="max-w-lg w-full bg-white dark:bg-slate-900 border border-sky-900/15 dark:border-slate-700 rounded-[2rem] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-sky-900/10 dark:border-slate-800 flex items-start justify-between gap-4 bg-[#F2F9FC] dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-600 text-white shadow-md">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h3
                id="soundscape-guide-title"
                className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight"
              >
                How Background Soundscapes Work
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Quick guide for uninterrupted audio on phones &amp; desktops.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onClose(true)}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 transition-colors"
            aria-label="Close Soundscape Guide"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3 Clear Steps */}
        <div className="p-6 space-y-4">
          <div className="p-4 rounded-2xl bg-[#F8FCFE] dark:bg-slate-800/50 border border-sky-900/10 dark:border-slate-700 flex items-start gap-3.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                1. Keep the browser open in the background
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mt-1">
                Leave NeuralPlan open in a browser tab rather than force-closing or swiping the browser app away. That keeps your audio session alive.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#F8FCFE] dark:bg-slate-800/50 border border-sky-900/10 dark:border-slate-700 flex items-start gap-3.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
              <Home className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                2. Press Home, switch apps, or lock your phone screen
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mt-1">
                Once playing, you can return to your device&apos;s home screen, open other apps, or put your phone to sleep. Controls also appear on your lock screen if your device ever asks to resume.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#F8FCFE] dark:bg-slate-800/50 border border-sky-900/10 dark:border-slate-700 flex items-start gap-3.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
              <Power className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                3. Plays continuously until you turn it off
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mt-1">
                Finishing a Focus Lock timer or opening other NeuralPlan modes will not stop your soundscape. It stays on in the background until you explicitly tap <strong>Turn Off</strong>.
              </p>
            </div>
          </div>

          <div className="px-3.5 py-2.5 rounded-xl bg-blue-50/80 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/25 flex items-center gap-2.5 text-xs text-blue-900 dark:text-blue-200">
            <Lock className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
            <span>
              Tip: Use <strong>Play / Turn Off</strong> anytime—you don&apos;t even have to lock a timer to listen.
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 pb-6 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onClose(true)}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors px-2 py-2"
          >
            Skip guide
          </button>

          <button
            type="button"
            onClick={() => {
              onClose(true);
              onStartAudio?.();
            }}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{startLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
