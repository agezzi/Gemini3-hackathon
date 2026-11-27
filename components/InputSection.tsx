import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { VoiceDictationButton } from './VoiceDictationButton';

interface InputSectionProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  icon: React.ReactNode;
  readableMode?: boolean;
}

export const InputSection: React.FC<InputSectionProps> = ({
  label,
  value,
  onChange,
  placeholder,
  icon,
  readableMode = false,
}) => {
  const [interimPreview, setInterimPreview] = useState('');

  const handleVoiceTranscript = (spokenText: string) => {
    setInterimPreview('');
    const cleaned = spokenText.trim();
    if (!cleaned) return;
    const separator = value.trim() ? (value.trim().endsWith('.') ? ' ' : '. ') : '';
    onChange(`${value.trim()}${separator}${cleaned}`);
  };

  return (
    <div className="flex flex-col space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-300 font-semibold">
          {icon}
          <span className={readableMode ? 'text-sm font-bold tracking-normal' : 'uppercase tracking-wider text-xs'}>
            {label}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {value.trim() && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors min-h-[36px]"
              title={`Clear ${label}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear</span>
            </button>
          )}
          <VoiceDictationButton
            compact
            idleLabel="Dictate"
            listeningLabel="Done"
            title={`Speak to fill ${label}`}
            onTranscript={handleVoiceTranscript}
            onInterimChange={setInterimPreview}
          />
        </div>
      </div>

      <textarea
        className={`w-full h-44 bg-[#F4FAFD] dark:bg-slate-800/50 border border-sky-900/15 dark:border-slate-700 rounded-2xl p-4 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all resize-none ${
          readableMode ? 'text-base leading-relaxed font-sans' : 'mono text-sm leading-relaxed'
        }`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />

      {interimPreview && (
        <div
          aria-live="polite"
          className="px-3.5 py-2 rounded-xl bg-blue-50/90 dark:bg-blue-500/15 border border-blue-200 dark:border-blue-500/30 text-xs text-blue-900 dark:text-blue-200 flex items-center gap-2"
        >
          <span className="font-bold shrink-0">Hearing:</span>
          <span className="truncate">{interimPreview}</span>
        </div>
      )}
    </div>
  );
};
