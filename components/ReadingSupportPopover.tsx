import React, { useEffect, useRef } from 'react';
import {
  BookOpen,
  RotateCcw,
  Sparkles,
  Check,
  X,
  Volume2,
  Eye,
  ListChecks,
} from 'lucide-react';
import { DyslexiaFontId, ReadingPreferences, ReadingTintId, SpacingPresetId } from '../types';
import {
  DEFAULT_READING_PREFERENCES,
  DYSLEXIA_FRIENDLY_PRESET,
  READING_FONT_STACKS,
  READING_TINT_CANVAS,
} from '../services/speechService';

interface ReadingSupportPopoverProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  preferences: ReadingPreferences;
  onChange: (next: ReadingPreferences) => void;
}

const FONT_OPTIONS: { id: DyslexiaFontId; label: string; hint: string }[] = [
  { id: 'default', label: 'Default', hint: 'Plus Jakarta' },
  { id: 'atkinson', label: 'Atkinson', hint: 'Distinct letters' },
  { id: 'lexend', label: 'Lexend', hint: 'Reading flow' },
  { id: 'opendyslexic', label: 'OpenDyslexic', hint: 'Weighted base' },
];

const SPACING_OPTIONS: { id: SpacingPresetId; label: string }[] = [
  { id: 'standard', label: 'Standard' },
  { id: 'relaxed', label: 'Relaxed' },
  { id: 'wide', label: 'Wide' },
];

const SCALE_OPTIONS = [
  { value: 1, label: '100%' },
  { value: 1.1, label: '110%' },
  { value: 1.2, label: '120%' },
  { value: 1.3, label: '130%' },
];

const TINT_OPTIONS: ReadingTintId[] = ['none', 'cream', 'sage', 'blue', 'peach'];

export const ReadingSupportPopover: React.FC<ReadingSupportPopoverProps> = ({
  isOpen,
  onToggle,
  onClose,
  preferences,
  onChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  const isCustomized =
    preferences.font !== 'default' ||
    preferences.textScale !== 1 ||
    preferences.spacing !== 'standard' ||
    preferences.noItalics ||
    preferences.tint !== 'none' ||
    preferences.simplifiedView ||
    preferences.readingRuler;

  const update = (patch: Partial<ReadingPreferences>) => {
    onChange({ ...preferences, ...patch });
  };

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={onToggle}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap shrink-0 min-h-[36px] ${
          isOpen || isCustomized
            ? 'bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-200 border-blue-300 dark:border-blue-500/40 shadow-sm'
            : 'bg-[#F2F9FC] dark:bg-slate-800/90 hover:bg-sky-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-sky-900/10 dark:border-white/10'
        }`}
        title="Dyslexia-friendly fonts, spacing, reading tints, easy-read view, and reading ruler"
        aria-expanded={isOpen}
      >
        <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
        <span className="hidden md:inline">Reading</span>
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Reading and Dyslexia Preferences"
          className="fixed sm:absolute right-3 sm:right-0 left-3 sm:left-auto top-16 sm:top-full sm:mt-2 w-auto sm:w-[390px] max-h-[82vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-sky-900/15 dark:border-slate-700 shadow-2xl p-5 z-[90] space-y-5"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-sky-900/10 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                Reading &amp; Dyslexia Ease
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Customize fonts, spacing, paper tint, and focus guides.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Close reading preferences"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* One-Click Presets */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onChange({ ...DYSLEXIA_FRIENDLY_PRESET })}
              className="flex-1 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>Apply Dyslexia Preset</span>
            </button>
            <button
              type="button"
              onClick={() => onChange({ ...DEFAULT_READING_PREFERENCES })}
              className="py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
              title="Reset to default display settings"
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
              <span>Reset</span>
            </button>
          </div>

          {/* Font Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
              Font Family
            </label>
            <div className="grid grid-cols-2 gap-2">
              {FONT_OPTIONS.map((opt) => {
                const active = preferences.font === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => update({ font: opt.id })}
                    style={{ fontFamily: READING_FONT_STACKS[opt.id] }}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      active
                        ? 'bg-blue-50 dark:bg-blue-500/20 border-blue-500 text-blue-900 dark:text-white'
                        : 'bg-[#F8FCFE] dark:bg-slate-800/60 border-sky-900/10 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-sm font-bold leading-tight">{opt.label}</span>
                      {active && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {opt.hint}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Text Size & Spacing */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <span className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                Text Size
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {SCALE_OPTIONS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => update({ textScale: s.value })}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold border tabular-nums transition-colors ${
                      preferences.textScale === s.value
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-sky-900/10 dark:border-slate-700 hover:bg-sky-50'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <span className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                Letter &amp; Line Spacing
              </span>
              <div className="flex flex-col gap-1.5">
                {SPACING_OPTIONS.map((sp) => (
                  <button
                    key={sp.id}
                    type="button"
                    onClick={() => update({ spacing: sp.id })}
                    className={`py-1 px-2.5 rounded-lg text-xs font-semibold border text-left transition-colors ${
                      preferences.spacing === sp.id
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-sky-900/10 dark:border-slate-700 hover:bg-sky-50'
                    }`}
                  >
                    {sp.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Paper Tints */}
          <div className="space-y-2">
            <span className="block text-xs font-bold text-slate-700 dark:text-slate-200">
              Soft Reading Paper Tint
            </span>
            <div className="grid grid-cols-5 gap-1.5">
              {TINT_OPTIONS.map((tintId) => {
                const item = READING_TINT_CANVAS[tintId];
                const active = preferences.tint === tintId;
                return (
                  <button
                    key={tintId}
                    type="button"
                    onClick={() => update({ tint: tintId })}
                    className={`p-2 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                      active
                        ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/50 dark:bg-blue-500/10'
                        : 'border-sky-900/10 dark:border-slate-700 hover:border-blue-300'
                    }`}
                    title={item.label}
                  >
                    <span
                      className="w-6 h-6 rounded-full border border-slate-300 dark:border-slate-600 shrink-0"
                      style={{ backgroundColor: item.swatch }}
                    />
                    <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 truncate max-w-full">
                      {item.label.split(' ').pop()}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Visual & Reading Toggles */}
          <div className="space-y-2.5 pt-2 border-t border-sky-900/10 dark:border-slate-800">
            <button
              type="button"
              onClick={() => update({ noItalics: !preferences.noItalics })}
              className="w-full flex items-center justify-between gap-3 p-2.5 rounded-xl bg-[#F8FCFE] dark:bg-slate-800/60 border border-sky-900/10 dark:border-slate-700 text-left"
            >
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-white">Turn Off Italics</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Keeps all letters upright to prevent slanting blur
                </div>
              </div>
              <span
                className={`w-10 h-6 rounded-full transition-colors p-0.5 shrink-0 ${
                  preferences.noItalics ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    preferences.noItalics ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </span>
            </button>

            <button
              type="button"
              onClick={() => update({ simplifiedView: !preferences.simplifiedView })}
              className="w-full flex items-center justify-between gap-3 p-2.5 rounded-xl bg-[#F8FCFE] dark:bg-slate-800/60 border border-sky-900/10 dark:border-slate-700 text-left"
            >
              <div className="flex items-start gap-2.5">
                <ListChecks className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-white">Easy-Read Bullet View</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Breaks plans into clean bullets with visual icons
                  </div>
                </div>
              </div>
              <span
                className={`w-10 h-6 rounded-full transition-colors p-0.5 shrink-0 ${
                  preferences.simplifiedView ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    preferences.simplifiedView ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </span>
            </button>

            <div className="p-2.5 rounded-xl bg-[#F8FCFE] dark:bg-slate-800/60 border border-sky-900/10 dark:border-slate-700 space-y-2.5">
              <button
                type="button"
                onClick={() => update({ readingRuler: !preferences.readingRuler })}
                className="w-full flex items-center justify-between gap-3 text-left"
              >
                <div className="flex items-start gap-2.5">
                  <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-white">Reading Ruler (Line Focus)</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Highlights one horizontal band as you read
                    </div>
                  </div>
                </div>
                <span
                  className={`w-10 h-6 rounded-full transition-colors p-0.5 shrink-0 ${
                    preferences.readingRuler ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      preferences.readingRuler ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </span>
              </button>

              {preferences.readingRuler && (
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-sky-900/10 dark:border-slate-700">
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    Band Height
                  </span>
                  <div className="flex items-center gap-1">
                    {(['narrow', 'medium', 'wide'] as const).map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => update({ rulerHeight: h })}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize ${
                          preferences.rulerHeight === h
                            ? 'bg-blue-600 text-white'
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-sky-900/10 dark:border-slate-700'
                        }`}
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Read Aloud Speed */}
            <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-[#F8FCFE] dark:bg-slate-800/60 border border-sky-900/10 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="text-xs font-bold text-slate-800 dark:text-white">Read-Aloud Speed</span>
              </div>
              <div className="flex items-center gap-1">
                {[0.85, 1, 1.15].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => update({ speechRate: r })}
                    className={`px-2 py-1 rounded-lg text-[11px] font-semibold tabular-nums ${
                      preferences.speechRate === r
                        ? 'bg-blue-600 text-white'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-sky-900/10 dark:border-slate-700'
                    }`}
                  >
                    {r}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
