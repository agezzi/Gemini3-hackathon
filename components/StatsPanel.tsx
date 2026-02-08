
import React, { useState } from 'react';
import { 
  Trophy, 
  Flame, 
  Award, 
  Timer, 
  History, 
  Zap, 
  Sparkle, 
  CheckCircle2, 
  ShieldAlert, 
  Terminal,
  ChevronDown,
  ChevronUp,
  Clock,
  Calendar
} from 'lucide-react';
import { UserStats } from '../types';
import { ACHIEVEMENTS } from '../constants';

interface StatsPanelProps {
  stats: UserStats;
}

export const StatsPanel: React.FC<StatsPanelProps> = ({ stats }) => {
  const [showFullRegistry, setShowFullRegistry] = useState(false);

  const getEntryTimes = () => {
    if (!stats.entryTimeHistory || stats.entryTimeHistory.length === 0) return [];
    return stats.entryTimeHistory.slice(-14).map(iso => {
      const date = new Date(iso);
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const totalMinutes = hours * 60 + minutes;
      return {
        fullDate: date.toLocaleString(),
        iso,
        label: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
        percent: (totalMinutes / (24 * 60)) * 100,
        minutes: totalMinutes,
        day: date.toLocaleDateString(undefined, { weekday: 'short' }),
        dateOnly: date.toISOString().split('T')[0]
      };
    });
  };

  const times = getEntryTimes();
  
  // Create a 14-day heatmap visualization
  const last14Days = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const dateStr = d.toISOString().split('T')[0];
    const hasEntry = stats.entryTimeHistory.some(iso => iso.startsWith(dateStr));
    return { date: dateStr, active: hasEntry };
  });

  const calculateMedian = () => {
    if (times.length === 0) return null;
    const sorted = [...times].sort((a, b) => a.minutes - b.minutes);
    const mid = Math.floor(sorted.length / 2);
    const medMin = sorted.length % 2 === 0 ? (sorted[mid - 1].minutes + sorted[mid].minutes) / 2 : sorted[mid].minutes;
    const h = Math.floor(medMin / 60);
    const m = Math.floor(medMin % 60);
    return {
      percent: (medMin / (24 * 60)) * 100,
      label: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
    };
  };

  const median = calculateMedian();
  const isPioneerUnlocked = stats.unlockedBadgeIds.includes('7day');
  
  const focusLoadPercent = Math.min(100, (stats.totalFocusMinutes % 480) / 480 * 100);
  const getLoadColor = () => {
    if (focusLoadPercent > 85) return 'bg-red-500';
    if (focusLoadPercent > 60) return 'bg-amber-500';
    return 'bg-blue-500';
  };

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-[2rem] p-8 ring-1 ring-white/5 h-fit relative overflow-hidden flex flex-col gap-8 shadow-2xl">
      <div className="flex items-center justify-between">
        <h2 className="text-[10px] font-black flex items-center gap-2 text-slate-400 uppercase tracking-[0.4em]">
          <Trophy className="w-3.5 h-3.5 text-amber-500" />
          Neural Metrics
        </h2>
      </div>

      {/* Burnout Load Meter */}
      <div className="bg-slate-950/50 p-6 rounded-2xl border border-white/5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className={`w-3.5 h-3.5 ${focusLoadPercent > 80 ? 'text-red-500 animate-pulse' : 'text-slate-500'}`} />
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Neural Load Index</span>
          </div>
          <span className={`text-[10px] font-black uppercase tracking-tighter ${
            focusLoadPercent > 80 ? 'text-red-500' : focusLoadPercent > 60 ? 'text-amber-500' : 'text-blue-400'
          }`}>
            {focusLoadPercent > 80 ? 'High Burnout Risk' : focusLoadPercent > 60 ? 'Strained' : 'Nominal'}
          </span>
        </div>
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-1000 ${getLoadColor()}`} 
            style={{ width: `${focusLoadPercent}%` }} 
          />
        </div>
      </div>

      {/* Streak & Focus Stats */}
      <div className="grid grid-cols-1 gap-4">
        <div className={`p-5 rounded-2xl border flex items-center justify-between group transition-all duration-500 ${isPioneerUnlocked ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-slate-950/50 border-white/5'}`}>
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl transition-all duration-1000 ${stats.currentStreak >= 7 ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-orange-500/10 text-orange-500'}`}>
              <Flame className={`w-6 h-6 ${stats.currentStreak > 0 ? 'animate-bounce' : ''}`} />
            </div>
            <div>
              <div className="text-3xl font-black text-white tabular-nums">{stats.currentStreak}</div>
              <div className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Persistence Streak</div>
            </div>
          </div>
          {isPioneerUnlocked && <CheckCircle2 className="w-5 h-5 text-emerald-500 animate-in zoom-in" />}
        </div>

        {/* Persistence Heatmap */}
        <div className="bg-slate-950/30 p-4 rounded-xl border border-white/5">
          <div className="flex items-center justify-between mb-3 px-1">
             <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1">
               <Calendar className="w-3 h-3" /> 14-Day Persistence Map
             </span>
          </div>
          <div className="flex gap-1 justify-between">
            {last14Days.map((day, i) => (
              <div 
                key={i} 
                title={day.date}
                className={`flex-1 h-4 rounded-sm transition-all duration-500 ${
                  day.active 
                    ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]' 
                    : 'bg-slate-800'
                } ${i === 13 ? 'ring-1 ring-white/20 ring-offset-1 ring-offset-slate-900' : ''}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Neural Registry (Temporal Audit) */}
      <div className="space-y-4">
        <button 
          onClick={() => setShowFullRegistry(!showFullRegistry)}
          className="w-full flex items-center justify-between p-4 bg-slate-950/50 rounded-2xl border border-white/5 hover:bg-slate-900 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 group-hover:scale-110 transition-transform">
              <Terminal className="w-4 h-4" />
            </div>
            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Neural Registry Log</span>
          </div>
          {showFullRegistry ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </button>

        {showFullRegistry && (
          <div className="bg-black/40 border border-white/5 rounded-2xl p-4 font-mono text-[10px] space-y-2 max-h-48 overflow-y-auto animate-in slide-in-from-top-2">
            {stats.entryTimeHistory.length === 0 ? (
              <div className="text-slate-600 italic">No entry logs found...</div>
            ) : (
              [...stats.entryTimeHistory].reverse().map((iso, i) => {
                const d = new Date(iso);
                return (
                  <div key={i} className="flex items-start gap-3 text-slate-400 border-b border-white/5 pb-2 last:border-0">
                    <span className="text-emerald-500/60 font-black">[{i === 0 ? 'LATEST' : 'SYNC'}]</span>
                    <div className="flex flex-col">
                      <span className="text-white font-bold">{d.toLocaleDateString()}</span>
                      <span className="text-[9px] text-slate-500">{d.toLocaleTimeString()}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Temporal Consistency Visual */}
      <div className="space-y-4">
        <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em] flex items-center gap-2">
          <History className="w-3.5 h-3.5" />
          Timing Consistency
        </h3>
        
        <div className="bg-slate-950/50 p-6 rounded-2xl border border-white/5 relative">
          <div className="relative h-12 flex items-center">
            <div className="absolute inset-0 h-1 my-auto w-full bg-slate-800 rounded-full" />
            {median && (
              <div className="absolute top-0 bottom-0 w-px bg-blue-500/40 border-l border-dashed border-blue-400/50" style={{ left: `${median.percent}%` }}>
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[7px] font-black text-blue-500 whitespace-nowrap uppercase tracking-tighter">Median: {median.label}</div>
              </div>
            )}
            {times.map((t, i) => (
              <div key={i} className="absolute group/entry z-10" style={{ left: `${t.percent}%` }}>
                <div 
                  title={t.fullDate}
                  className={`w-3 h-3 rounded-full border-2 border-slate-950 shadow-xl transition-all duration-300 hover:scale-150 cursor-pointer ${i === times.length - 1 ? 'bg-emerald-400 ring-4 ring-emerald-500/20 scale-125' : 'bg-slate-500'}`} 
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-[8px] font-black text-slate-700 uppercase">00:00</span>
            <span className="text-[8px] font-black text-slate-700 uppercase">12:00</span>
            <span className="text-[8px] font-black text-slate-700 uppercase">23:59</span>
          </div>
        </div>
      </div>

      {/* Achievements */}
      <div className="space-y-6">
        <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em] flex items-center gap-2">
          <Award className="w-3.5 h-3.5" />
          Achievement Vault
        </h3>
        <div className="grid grid-cols-4 gap-3">
          {ACHIEVEMENTS.map((ach) => {
            const isUnlocked = stats.unlockedBadgeIds.includes(ach.id);
            return (
              <div 
                key={ach.id} 
                title={ach.description}
                className={`aspect-square flex items-center justify-center rounded-2xl text-xl border transition-all duration-700 ${
                  isUnlocked ? 'bg-slate-800 border-blue-500/40 opacity-100 scale-100' : 'bg-slate-900 border-white/5 grayscale opacity-10 scale-90'
                }`}
              >
                {ach.icon}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
