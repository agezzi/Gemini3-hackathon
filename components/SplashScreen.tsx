import React, { useEffect, useRef, useState } from 'react';
import { BrainCircuit } from 'lucide-react';
import { ThemeMode, ThemeToggle } from './ThemeToggle';

interface SplashScreenProps {
  onFinish?: () => void;
  theme?: ThemeMode;
  onChangeTheme?: (next: ThemeMode) => void;
}

type BootStage = 'splash' | 'loading';

const SPLASH_IMAGE_PATH = '/assets/aistudio/NeuralplanPP_fdb39126.jpeg';
const LOADING_IMAGE_PATH = '/assets/aistudio/NueralplanHeader_aa2c4271.jpeg';

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  theme = 'light',
  onChangeTheme,
}) => {
  const [stage, setStage] = useState<BootStage>('splash');
  const [isTransitioningOut, setIsTransitioningOut] = useState(false);
  const [progress, setProgress] = useState(0);
  const [splashImgError, setSplashImgError] = useState(false);
  const [loadingImgError, setLoadingImgError] = useState(false);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  // Stage 1 (~2.4s): Calm splash presentation before fading into Loading Page
  useEffect(() => {
    if (stage !== 'splash') return;

    const fadeTimer = setTimeout(() => {
      setIsTransitioningOut(true);
    }, 2100);

    const switchTimer = setTimeout(() => {
      setIsTransitioningOut(false);
      setStage('loading');
    }, 2450);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(switchTimer);
    };
  }, [stage]);

  // Stage 2 (~3.3s): Smooth 1% increment from 0 to 100
  useEffect(() => {
    if (stage !== 'loading') return;

    const interval = setInterval(() => {
      setProgress((prev) => (prev >= 100 ? 100 : prev + 1));
    }, 33);

    return () => clearInterval(interval);
  }, [stage]);

  // Brief settle at 100% + smooth fade out (~0.65s; ~6.4s total sequence)
  useEffect(() => {
    if (stage !== 'loading' || progress < 100) return;

    const fadeTimer = setTimeout(() => {
      setIsTransitioningOut(true);
    }, 350);

    const finishTimer = setTimeout(() => {
      onFinishRef.current?.();
    }, 650);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [stage, progress]);

  const handleAdvanceFromSplash = () => {
    if (stage !== 'splash' || isTransitioningOut) return;
    setIsTransitioningOut(true);
    setTimeout(() => {
      setIsTransitioningOut(false);
      setStage('loading');
    }, 250);
  };

  if (stage === 'splash') {
    return (
      <div
        onClick={handleAdvanceFromSplash}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleAdvanceFromSplash();
          }
        }}
        aria-label="NeuralPlan splash screen — press Enter or click to continue"
        className={`fixed inset-0 z-[300] bg-[#EAF6F9] dark:bg-[#020617] flex flex-col items-center justify-center p-6 overflow-hidden cursor-pointer select-none focus:outline-none transition-all duration-300 ${
          isTransitioningOut ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {/* Top-right Dark / Light Mode Choice on Entry */}
        {onChangeTheme && (
          <div className="absolute top-6 right-6 z-20 flex items-center gap-3">
            <ThemeToggle theme={theme} onChangeTheme={onChangeTheme} />
          </div>
        )}

        {/* Ambient radial palette inspired by NeuralPlan emblem (cobalt + lavender + warm amber) */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-[520px] h-[520px] rounded-full bg-blue-400/15 dark:bg-blue-600/15 blur-[130px] -translate-x-16 -translate-y-10" />
          <div className="w-[420px] h-[420px] rounded-full bg-violet-400/15 dark:bg-violet-600/10 blur-[130px] translate-x-20 translate-y-12" />
          <div className="w-[320px] h-[320px] rounded-full bg-amber-300/15 dark:bg-amber-500/10 blur-[110px] translate-x-24 -translate-y-16" />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-700">
          <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-[2.75rem] overflow-hidden border border-white/80 dark:border-white/15 shadow-[0_24px_80px_rgba(37,99,235,0.16)] dark:shadow-[0_24px_80px_rgba(37,99,235,0.28)] bg-[#eaf6f9] flex items-center justify-center mb-8 transition-transform duration-500 hover:scale-[1.02]">
            {!splashImgError ? (
              <img
                src={SPLASH_IMAGE_PATH}
                alt="NeuralPlan Logo"
                referrerPolicy="no-referrer"
                onError={() => setSplashImgError(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-600 via-violet-500 to-amber-400 flex items-center justify-center">
                <BrainCircuit className="w-20 h-20 text-white" />
              </div>
            )}
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
            NeuralPlan
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-400 tracking-wide">
            Behavioral Productivity Engine
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`fixed inset-0 z-[300] bg-[#EAF6F9] dark:bg-[#020617] flex flex-col items-center justify-center p-6 overflow-hidden select-none transition-all duration-300 ${
        isTransitioningOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Top-right Dark / Light Mode Choice on Entry */}
      {onChangeTheme && (
        <div className="absolute top-6 right-6 z-20 flex items-center gap-3">
          <ThemeToggle theme={theme} onChangeTheme={onChangeTheme} />
        </div>
      )}

      {/* Soft cobalt, lavender & warm peach ambient wash */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-[640px] h-[380px] rounded-full bg-blue-400/15 dark:bg-blue-500/10 blur-[130px]" />
        <div className="w-[460px] h-[320px] rounded-full bg-violet-400/15 dark:bg-violet-500/10 blur-[130px] translate-x-16" />
      </div>

      <div className="relative z-10 w-full max-w-2xl flex flex-col items-center animate-in fade-in duration-500">
        {/* Second attached image: Loading screen brand header */}
        <div className="w-full max-w-xl aspect-video rounded-3xl overflow-hidden border border-sky-900/10 dark:border-white/10 shadow-[0_24px_80px_rgba(37,99,235,0.16)] dark:shadow-[0_24px_90px_rgba(2,6,23,0.9)] bg-[#010512] flex items-center justify-center mb-10">
          {!loadingImgError ? (
            <img
              src={LOADING_IMAGE_PATH}
              alt="NeuralPlan Behavioral Productivity Engine"
              referrerPolicy="no-referrer"
              onError={() => setLoadingImgError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex items-center gap-4 px-8 py-6">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500 via-violet-500 to-amber-400">
                <BrainCircuit className="w-10 h-10 text-white" />
              </div>
              <div className="text-left">
                <div className="text-3xl font-bold text-white tracking-tight">NeuralPlan</div>
                <div className="text-sm text-blue-200/80">Behavioral Productivity Engine</div>
              </div>
            </div>
          )}
        </div>

        {/* 0-100 Loading Bar */}
        <div className="w-full max-w-md space-y-3">
          <div className="flex items-center justify-end px-0.5">
            <span className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-300 tabular-nums">
              {progress}%
            </span>
          </div>

          <div
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Initialising Neural Handshake"
            className="h-2.5 w-full bg-white/80 dark:bg-slate-900 rounded-full border border-sky-900/10 dark:border-white/10 overflow-hidden p-0.5 shadow-inner"
          >
            <div
              className="h-full bg-gradient-to-r from-blue-600 via-violet-500 to-amber-400 rounded-full transition-[width] duration-75 ease-out shadow-[0_0_12px_rgba(99,102,241,0.45)]"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="text-center text-sm font-medium text-slate-700 dark:text-slate-300 tracking-wide pt-1">
            Initialising Neural Handshake
          </p>
        </div>
      </div>
    </div>
  );
};
