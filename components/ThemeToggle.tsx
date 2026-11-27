import React from 'react';
import { Sun, Moon } from 'lucide-react';

export type ThemeMode = 'light' | 'dark';

interface ThemeToggleProps {
  theme: ThemeMode;
  onChangeTheme: (next: ThemeMode) => void;
  compact?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  theme,
  onChangeTheme,
  compact = false,
}) => {
  return (
    <div
      role="group"
      aria-label="Appearance mode"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      className="inline-flex items-center p-1 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-sky-900/10 dark:border-white/10 shadow-sm backdrop-blur-md shrink-0"
    >
      <button
        type="button"
        onClick={() => onChangeTheme('light')}
        aria-pressed={theme === 'light'}
        title="Light Frosted Ice Theme"
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
          theme === 'light'
            ? 'bg-gradient-to-r from-blue-600 to-indigo-500 text-white shadow-sm'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }`}
      >
        <Sun className="w-3.5 h-3.5" />
        {!compact && <span>Light</span>}
      </button>

      <button
        type="button"
        onClick={() => onChangeTheme('dark')}
        aria-pressed={theme === 'dark'}
        title="Dark Obsidian Theme"
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
          theme === 'dark'
            ? 'bg-slate-800 text-white border border-white/10 shadow-sm'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }`}
      >
        <Moon className="w-3.5 h-3.5" />
        {!compact && <span>Dark</span>}
      </button>
    </div>
  );
};
