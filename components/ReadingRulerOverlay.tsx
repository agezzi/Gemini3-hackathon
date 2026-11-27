import React, { useEffect, useState } from 'react';
import { ChevronUp, ChevronDown, X } from 'lucide-react';

interface ReadingRulerOverlayProps {
  enabled: boolean;
  heightMode: 'narrow' | 'medium' | 'wide';
  onClose: () => void;
}

const BAND_HEIGHT_PX: Record<'narrow' | 'medium' | 'wide', number> = {
  narrow: 46,
  medium: 78,
  wide: 118,
};

export const ReadingRulerOverlay: React.FC<ReadingRulerOverlayProps> = ({
  enabled,
  heightMode,
  onClose,
}) => {
  const [yPos, setYPos] = useState<number>(() =>
    typeof window !== 'undefined' ? Math.round(window.innerHeight * 0.42) : 320
  );

  useEffect(() => {
    if (!enabled) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') {
        setYPos(e.clientY);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches?.[0]) {
        setYPos(e.touches[0].clientY);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'ArrowUp') {
        e.preventDefault();
        setYPos((prev) => Math.max(40, prev - 28));
      } else if (e.altKey && e.key === 'ArrowDown') {
        e.preventDefault();
        setYPos((prev) => Math.min(window.innerHeight - 40, prev + 28));
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled]);

  if (!enabled) return null;

  const bandHeight = BAND_HEIGHT_PX[heightMode] || BAND_HEIGHT_PX.medium;
  const topHeight = Math.max(0, yPos - bandHeight / 2);
  const bottomTop = yPos + bandHeight / 2;

  return (
    <>
      {/* Top dimmed veil (pointer-events-none so typing & clicking pass straight through) */}
      <div
        aria-hidden="true"
        className="fixed inset-x-0 top-0 pointer-events-none z-[75] bg-slate-950/20 dark:bg-slate-950/50 transition-[height] duration-75"
        style={{ height: `${topHeight}px` }}
      />

      {/* Active bright reading focus band */}
      <div
        aria-hidden="true"
        className="fixed inset-x-0 pointer-events-none z-[76] border-y-2 border-blue-500/55 dark:border-amber-400/55 bg-amber-100/10 dark:bg-blue-400/5 transition-[top,height] duration-75"
        style={{
          top: `${topHeight}px`,
          height: `${bandHeight}px`,
        }}
      />

      {/* Bottom dimmed veil */}
      <div
        aria-hidden="true"
        className="fixed inset-x-0 bottom-0 pointer-events-none z-[75] bg-slate-950/20 dark:bg-slate-950/50 transition-[top] duration-75"
        style={{ top: `${bottomTop}px` }}
      />

      {/* Small interactive nudger & close control */}
      <div className="fixed left-4 bottom-5 z-[78] flex items-center gap-1 rounded-xl bg-white/95 dark:bg-slate-900/95 border border-sky-900/15 dark:border-white/15 px-2.5 py-1.5 shadow-lg backdrop-blur-md">
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 px-1 whitespace-nowrap">
          Reading Ruler
        </span>
        <button
          type="button"
          onClick={() => setYPos((p) => Math.max(40, p - 32))}
          className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-sky-100 dark:hover:bg-slate-800"
          title="Move ruler up (Alt + Up)"
          aria-label="Move reading ruler up"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setYPos((p) => Math.min((typeof window !== 'undefined' ? window.innerHeight : 800) - 40, p + 32))}
          className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-sky-100 dark:hover:bg-slate-800"
          title="Move ruler down (Alt + Down)"
          aria-label="Move reading ruler down"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10"
          title="Turn off Reading Ruler"
          aria-label="Turn off Reading Ruler"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </>
  );
};
