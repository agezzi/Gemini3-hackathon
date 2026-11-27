import React, { useEffect, useState, useCallback, useLayoutEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, X, Compass } from 'lucide-react';

export interface TourStep {
  id: string;
  targetSelector: string;
  title: string;
  sectionLabel: string;
  description: string;
  preferredPlacement?: 'top' | 'bottom' | 'left' | 'right';
}

interface GuidedTourProps {
  isOpen: boolean;
  steps: TourStep[];
  onFinish: () => void;
  onSkip: () => void;
}

interface RectBox {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PADDING = 10;
const VIEWPORT_MARGIN = 14;

export const GuidedTour: React.FC<GuidedTourProps> = ({
  isOpen,
  steps,
  onFinish,
  onSkip,
}) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<RectBox | null>(null);
  const [popoverSize, setPopoverSize] = useState({ width: 360, height: 240 });
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const currentStep = steps[stepIndex];

  // Reset step to 0 whenever opened
  useEffect(() => {
    if (isOpen) {
      setStepIndex(0);
    }
  }, [isOpen]);

  const measureTarget = useCallback(() => {
    if (!isOpen || !currentStep) return;
    const el = document.querySelector(currentStep.targetSelector) as HTMLElement | null;
    if (!el) {
      setTargetRect(null);
      return;
    }

    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      setTargetRect(null);
      return;
    }

    setTargetRect({
      top: rect.top - PADDING,
      left: rect.left - PADDING,
      width: rect.width + PADDING * 2,
      height: rect.height + PADDING * 2,
    });
  }, [isOpen, currentStep]);

  // Scroll target element smoothly into view on step change, then re-measure
  useEffect(() => {
    if (!isOpen || !currentStep) return;
    const el = document.querySelector(currentStep.targetSelector) as HTMLElement | null;
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    }
    measureTarget();
    const t1 = setTimeout(measureTarget, 180);
    const t2 = setTimeout(measureTarget, 420);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isOpen, stepIndex, currentStep, measureTarget]);

  // Keep spotlight synced on scroll / resize
  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener('resize', measureTarget);
    window.addEventListener('scroll', measureTarget, true);
    return () => {
      window.removeEventListener('resize', measureTarget);
      window.removeEventListener('scroll', measureTarget, true);
    };
  }, [isOpen, measureTarget]);

  // Measure actual rendered popover size for collision-free placement
  useLayoutEffect(() => {
    if (!isOpen || !popoverRef.current) return;
    const box = popoverRef.current.getBoundingClientRect();
    if (box.width > 0 && box.height > 0) {
      setPopoverSize({ width: box.width, height: box.height });
    }
  }, [isOpen, stepIndex, targetRect]);

  // Keyboard shortcuts: Esc to skip, Left/Right arrows to step
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onSkip();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (stepIndex < steps.length - 1) {
          setStepIndex((prev) => prev + 1);
        } else {
          onFinish();
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (stepIndex > 0) {
          setStepIndex((prev) => prev - 1);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, stepIndex, steps.length, onFinish, onSkip]);

  if (!isOpen || !currentStep) return null;

  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;

  // Compute optimal popover coordinates inside viewport without clipping
  const computePopoverStyle = (): React.CSSProperties => {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
    const cardW = Math.min(368, vw - VIEWPORT_MARGIN * 2);
    const cardH = popoverSize.height || 235;

    if (!targetRect) {
      return {
        top: Math.max(VIEWPORT_MARGIN, (vh - cardH) / 2),
        left: Math.max(VIEWPORT_MARGIN, (vw - cardW) / 2),
        width: cardW,
      };
    }

    const gap = 14;
    const spaceBelow = vh - (targetRect.top + targetRect.height) - VIEWPORT_MARGIN;
    const spaceAbove = targetRect.top - VIEWPORT_MARGIN;
    const spaceRight = vw - (targetRect.left + targetRect.width) - VIEWPORT_MARGIN;
    const spaceLeft = targetRect.left - VIEWPORT_MARGIN;

    const preferred = currentStep.preferredPlacement;
    let chosenSide: 'bottom' | 'top' | 'right' | 'left' | 'float-bottom' = 'bottom';

    if (preferred === 'right' && spaceRight >= cardW + gap) {
      chosenSide = 'right';
    } else if (preferred === 'left' && spaceLeft >= cardW + gap) {
      chosenSide = 'left';
    } else if (preferred === 'top' && spaceAbove >= cardH + gap) {
      chosenSide = 'top';
    } else if (preferred === 'bottom' && spaceBelow >= cardH + gap) {
      chosenSide = 'bottom';
    } else if (spaceBelow >= cardH + gap) {
      chosenSide = 'bottom';
    } else if (spaceAbove >= cardH + gap) {
      chosenSide = 'top';
    } else if (spaceRight >= cardW + gap) {
      chosenSide = 'right';
    } else if (spaceLeft >= cardW + gap) {
      chosenSide = 'left';
    } else {
      chosenSide = 'float-bottom';
    }

    let top = VIEWPORT_MARGIN;
    let left = VIEWPORT_MARGIN;

    if (chosenSide === 'bottom') {
      top = targetRect.top + targetRect.height + gap;
      left = targetRect.left + targetRect.width / 2 - cardW / 2;
    } else if (chosenSide === 'top') {
      top = targetRect.top - cardH - gap;
      left = targetRect.left + targetRect.width / 2 - cardW / 2;
    } else if (chosenSide === 'right') {
      top = targetRect.top + targetRect.height / 2 - cardH / 2;
      left = targetRect.left + targetRect.width + gap;
    } else if (chosenSide === 'left') {
      top = targetRect.top + targetRect.height / 2 - cardH / 2;
      left = targetRect.left - cardW - gap;
    } else {
      top = vh - cardH - VIEWPORT_MARGIN;
      left = (vw - cardW) / 2;
    }

    // Clamp to safe viewport boundaries
    top = Math.max(VIEWPORT_MARGIN, Math.min(vh - cardH - VIEWPORT_MARGIN, top));
    left = Math.max(VIEWPORT_MARGIN, Math.min(vw - cardW - VIEWPORT_MARGIN, left));

    return { top, left, width: cardW };
  };

  const popoverStyle = computePopoverStyle();

  return (
    <div
      className="fixed inset-0 z-[180] pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-label={`Workspace walkthrough step ${stepIndex + 1} of ${steps.length}: ${currentStep.title}`}
    >
      {/* Click-blocker backdrop when no cutout is active */}
      {!targetRect && (
        <div
          className="fixed inset-0 bg-slate-950/75 backdrop-blur-[2px] transition-opacity duration-200"
          onClick={onSkip}
        />
      )}

      {/* Spotlight Cutout Frame with crisp highlight ring + surrounding scrim */}
      {targetRect && (
        <div
          aria-hidden="true"
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
            boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.72)',
          }}
          className="fixed rounded-2xl ring-2 ring-blue-500 dark:ring-blue-400 pointer-events-none transition-all duration-300 ease-out"
        />
      )}

      {/* Invisible click shield so user interacts cleanly with walkthrough first */}
      {targetRect && <div className="fixed inset-0 bg-transparent" />}

      {/* Guiding Callout Popover */}
      <div
        ref={popoverRef}
        style={popoverStyle}
        className="fixed z-[190] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-sky-900/15 dark:border-white/15 rounded-3xl p-5 sm:p-6 shadow-2xl transition-all duration-300 ease-out"
      >
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-mono text-blue-600 dark:text-blue-400 font-semibold">
              <Compass className="w-3.5 h-3.5 shrink-0" />
              <span>{currentStep.sectionLabel}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums text-slate-500 dark:text-slate-400">
                {stepIndex + 1} / {steps.length}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight mt-1">
              {currentStep.title}
            </h3>
          </div>

          <button
            type="button"
            onClick={onSkip}
            className="p-2 -mr-1 -mt-1 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 shrink-0"
            title="Skip walkthrough"
            aria-label="Skip walkthrough"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-5">
          {currentStep.description}
        </p>

        {/* Step Indicator Dots */}
        <div className="flex items-center gap-1.5 mb-4" aria-label="Walkthrough progress">
          {steps.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStepIndex(idx)}
              aria-label={`Go to step ${idx + 1}: ${s.title}`}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                idx === stepIndex
                  ? 'w-6 bg-blue-600 dark:bg-blue-400'
                  : idx < stepIndex
                    ? 'w-2.5 bg-blue-400/50 dark:bg-blue-500/40 hover:bg-blue-500/70'
                    : 'w-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'
              }`}
            />
          ))}
        </div>

        {/* Navigation & Skip Controls */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-sky-900/10 dark:border-white/10">
          <button
            type="button"
            onClick={onSkip}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Skip tour
          </button>

          <div className="flex items-center gap-2 shrink-0">
            {!isFirst && (
              <button
                type="button"
                onClick={() => setStepIndex((prev) => Math.max(0, prev - 1))}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#F2F9FC] dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-sky-900/10 dark:border-white/10 hover:bg-sky-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (isLast) {
                  onFinish();
                } else {
                  setStepIndex((prev) => Math.min(steps.length - 1, prev + 1));
                }
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              <span>{isLast ? 'Finish Tour' : 'Next'}</span>
              {!isLast && <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
