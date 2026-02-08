
import React from 'react';

interface InputSectionProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  icon: React.ReactNode;
}

export const InputSection: React.FC<InputSectionProps> = ({ label, value, onChange, placeholder, icon }) => {
  return (
    <div className="flex flex-col space-y-2">
      <div className="flex items-center space-x-2 text-slate-400 font-medium">
        {icon}
        <span className="uppercase tracking-wider text-xs">{label}</span>
      </div>
      <textarea
        className="w-full h-48 bg-slate-800/50 border border-slate-700 rounded-lg p-4 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all resize-none mono text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
};
