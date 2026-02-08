
import React, { useState, useMemo, useEffect } from 'react';
import { Zap, Sparkles, CheckCircle2, Clock, ShieldAlert, Waves, Circle, Trophy, Star, PartyPopper } from 'lucide-react';
import { BurnoutAlert } from '../types';

interface ResultCardProps {
  title: string;
  content: string;
  type: 'insights' | 'plan' | 'explanation';
  quickWins?: string[];
  burnoutAlert?: BurnoutAlert;
  onReset?: () => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({ title, content, type, quickWins, burnoutAlert, onReset }) => {
  const [completedWins, setCompletedWins] = useState<number[]>([]);
  const [lastChecked, setLastChecked] = useState<number | null>(null);
  const [showReward, setShowReward] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const toggleWin = (idx: number) => {
    const isChecking = !completedWins.includes(idx);
    const newCompleted = isChecking 
      ? [...completedWins, idx] 
      : completedWins.filter(i => i !== idx);
    
    setCompletedWins(newCompleted);
    
    if (isChecking) {
      setLastChecked(idx);
      setShowReward(true);
      setTimeout(() => setShowReward(false), 1000);
      
      if (quickWins && newCompleted.length === quickWins.length) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 4000);
      }
    }
  };

  const progress = useMemo(() => {
    if (!quickWins || quickWins.length === 0) return 0;
    return (completedWins.length / quickWins.length) * 100;
  }, [completedWins, quickWins]);

  const getColors = () => {
    switch (type) {
      case 'insights': return 'border-amber-500/30 bg-amber-500/5 text-amber-100';
      case 'plan': return 'border-emerald-500/40 bg-slate-900/80 text-emerald-50';
      case 'explanation': return 'border-blue-500/30 bg-blue-500/5 text-slate-300';
    }
  };

  const getHeaderColor = () => {
    switch (type) {
      case 'insights': return 'text-amber-400';
      case 'plan': return 'text-emerald-400';
      case 'explanation': return 'text-blue-400';
    }
  };

  const formatPlanLine = (line: string) => {
    if (type !== 'plan') return line;
    return line.replace(/\[(High|Med|Low|High Load|Med Load|Low Load)\]/gi, (match) => {
      const color = match.toLowerCase().includes('high') ? 'bg-red-500/20 text-red-400' : 
                    match.toLowerCase().includes('med') ? 'bg-amber-500/20 text-amber-400' : 
                    'bg-emerald-500/20 text-emerald-400';
      return `<span class="${color} px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-current/20">${match.slice(1, -1)}</span>`;
    });
  };

  return (
    <div className={`border rounded-xl p-6 mb-6 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 shadow-xl relative overflow-hidden ${getColors()}`}>
      <style>{`
        @keyframes float-up-fade {
          0% { transform: translateY(0) scale(0.5); opacity: 0; }
          20% { opacity: 1; transform: translateY(-20px) scale(1.1); }
          100% { transform: translateY(-50px) scale(1); opacity: 0; }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.8); opacity: 0.5; }
          100% { transform: scale(2); opacity: 0; }
        }
        @keyframes check-pop {
          0% { transform: scale(0.8); }
          50% { transform: scale(1.25); }
          100% { transform: scale(1); }
        }
        @keyframes confetti-fall {
          0% { transform: translateY(-100%) rotate(0deg); opacity: 1; }
          100% { transform: translateY(1000%) rotate(360deg); opacity: 0; }
        }
        @keyframes haptic-shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-1px); }
          75% { transform: translateX(1px); }
        }
        .animate-reward { animation: float-up-fade 1s ease-out forwards; }
        .animate-check-pop { animation: check-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .pulse-ring { animation: pulse-ring 1s cubic-bezier(0.215, 0.61, 0.355, 1) infinite; }
        .haptic-feedback:active { animation: haptic-shake 0.1s ease-in-out infinite; }
        
        .confetti-particle {
          position: absolute;
          width: 6px;
          height: 6px;
          background: #3b82f6;
          top: -10px;
          animation: confetti-fall 3s linear forwards;
          z-index: 50;
        }
      `}</style>

      {/* Confetti Celebration */}
      {showConfetti && Array.from({ length: 40 }).map((_, i) => (
        <div 
          key={i}
          className="confetti-particle"
          style={{
            left: `${Math.random() * 100}%`,
            backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][Math.floor(Math.random() * 5)],
            animationDelay: `${Math.random() * 2}s`,
            animationDuration: `${2 + Math.random() * 2}s`
          }}
        />
      )}

      {/* Burnout Alert Section */}
      {type === 'plan' && burnoutAlert && (
        <div className={`mb-8 p-6 rounded-2xl border-2 animate-pulse shadow-2xl ${
          burnoutAlert.level === 'critical' ? 'bg-red-500/10 border-red-500/40' : 'bg-amber-500/10 border-amber-500/40'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <ShieldAlert className={`w-6 h-6 ${burnoutAlert.level === 'critical' ? 'text-red-500' : 'text-amber-500'}`} />
              <span className={`text-xs font-black uppercase tracking-[0.4em] ${
                burnoutAlert.level === 'critical' ? 'text-red-500' : 'text-amber-500'
              }`}>
                {burnoutAlert.level} Burnout Risk Detected
              </span>
            </div>
          </div>
          <p className="text-sm font-bold text-slate-200 mb-5 leading-relaxed">{burnoutAlert.message}</p>
          <div className="flex items-center gap-4">
            <div className="flex-grow bg-black/40 p-4 rounded-xl border border-white/5 flex items-center gap-4">
              <Waves className="w-5 h-5 text-blue-400" />
              <div>
                <span className="block text-[8px] uppercase font-black text-blue-400 tracking-widest">Recovery Protocol</span>
                <span className="text-xs font-bold text-white">{burnoutAlert.recoveryAction}</span>
              </div>
            </div>
            <button 
              onClick={onReset}
              className="whitespace-nowrap bg-white text-black px-4 py-3 rounded-xl font-black text-[10px] uppercase hover:scale-105 active:scale-95 transition-all"
            >
              Initiate Reset
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-lg font-bold flex items-center gap-2 ${getHeaderColor()}`}>
          <span className="bg-slate-900/80 px-2 py-1 rounded text-xs border border-white/10 uppercase tracking-widest font-mono">
            {type === 'insights' ? 'Analysis' : type === 'plan' ? 'Protocol' : 'Logic'}
          </span>
          {title}
        </h3>
        {type === 'plan' && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-tighter">Burnout-Resistant</span>
          </div>
        )}
      </div>

      {/* Enhanced Quick Wins Section */}
      {type === 'plan' && quickWins && quickWins.length > 0 && (
        <div className="mb-8 p-6 bg-slate-950/60 border border-white/10 rounded-[2.5rem] animate-in zoom-in-95 duration-500 relative overflow-hidden group/wins shadow-2xl">
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 blur-[100px] pointer-events-none" />
          
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-500/20 rounded-2xl relative shadow-lg">
                <Zap className={`w-5 h-5 text-orange-400 ${progress > 0 ? 'animate-bounce' : ''}`} />
                {progress > 0 && progress < 100 && <div className="absolute inset-0 bg-orange-500/20 rounded-2xl pulse-ring" />}
              </div>
              <div>
                <span className="text-[10px] font-black text-orange-400 uppercase tracking-[0.2em]">Dopamine Protocol</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="text-[8px] text-slate-500 uppercase font-bold tracking-widest">Momentum Tracker</div>
                  <div className="px-1.5 py-0.5 rounded-full bg-slate-800 border border-white/5 text-[8px] font-black text-slate-300 uppercase tracking-tighter">
                    {completedWins.length}/{quickWins.length}
                  </div>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-orange-400 via-amber-400 to-emerald-400 tabular-nums leading-none">
                {Math.round(progress)}%
              </div>
              <div className="text-[8px] text-slate-500 uppercase font-black tracking-widest mt-1">Neural Integration</div>
            </div>
          </div>

          {/* Glowing Progress Bar */}
          <div className="h-3 w-full bg-slate-900 rounded-full mb-8 overflow-hidden border border-white/5 p-1">
            <div 
              className={`h-full bg-gradient-to-r from-orange-500 via-amber-400 to-emerald-500 transition-all duration-1000 ease-out rounded-full shadow-[0_0_20px_rgba(16,185,129,0.3)] ${progress > 0 && progress < 100 ? 'animate-pulse' : ''}`}
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="space-y-3">
            {quickWins.map((win, idx) => {
              const isCompleted = completedWins.includes(idx);
              const isLastChecked = lastChecked === idx;
              
              return (
                <div key={idx} className="relative">
                  {/* Floating Reward Effect */}
                  {isLastChecked && showReward && (
                    <div className="absolute left-10 top-0 z-50 pointer-events-none animate-reward">
                      <div className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-3 py-1.5 rounded-full text-[10px] font-black shadow-2xl border border-white/20">
                        <Star className="w-3 h-3 fill-current" />
                        +10 DOPAMINE
                      </div>
                    </div>
                  )}

                  <button 
                    onClick={() => toggleWin(idx)}
                    className={`w-full text-left flex items-center gap-4 p-5 rounded-3xl border transition-all duration-500 group/win relative overflow-hidden haptic-feedback ${
                      isCompleted 
                        ? 'bg-emerald-500/10 border-emerald-500/40 opacity-90 scale-[0.98]' 
                        : 'bg-slate-900/40 border-white/5 hover:border-orange-500/30 hover:bg-slate-800/80 hover:translate-x-1'
                    }`}
                  >
                    <div className={`p-2 rounded-full transition-all duration-500 relative z-10 ${
                      isCompleted ? 'bg-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.6)] animate-check-pop' : 'bg-slate-800 group-hover/win:bg-slate-700'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-600 group-hover/win:text-orange-400 transition-colors" />
                      )}
                    </div>
                    
                    <span className={`text-sm font-bold transition-all duration-500 relative z-10 ${
                      isCompleted ? 'text-emerald-300 line-through decoration-emerald-500/50 italic opacity-60' : 'text-slate-200'
                    }`}>
                      {win}
                    </span>

                    <div className="ml-auto flex items-center gap-1 text-[8px] font-black text-slate-500 uppercase tracking-widest relative z-10 group-hover/win:text-slate-400 transition-colors">
                      <Clock className="w-3.5 h-3.5" />
                      &lt;5m
                    </div>

                    {/* Completion Glow Overlay */}
                    {isCompleted && (
                      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent animate-in fade-in duration-1000" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {progress === 100 && (
            <div className="mt-10 p-8 bg-gradient-to-br from-emerald-500/20 via-teal-500/10 to-slate-900/50 border border-emerald-500/40 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 animate-in fade-in slide-in-from-top-6 duration-1000 shadow-[0_20px_50px_rgba(16,185,129,0.15)] group/celebration">
              <div className="relative">
                <Trophy className="w-12 h-12 text-emerald-400 animate-bounce group-hover/celebration:scale-110 transition-transform" />
                <div className="absolute inset-0 bg-emerald-400/30 blur-2xl animate-pulse rounded-full" />
                <PartyPopper className="absolute -top-2 -right-2 w-6 h-6 text-amber-400 animate-pulse" />
              </div>
              <div className="text-center">
                <span className="block text-[11px] font-black text-emerald-400 uppercase tracking-[0.4em] mb-2">Cognitive Threshold Reached</span>
                <span className="text-sm font-bold text-slate-300">Executive Momentum Locked. Neural Pathways Optimized.</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="whitespace-pre-wrap leading-relaxed text-sm md:text-base px-2">
        {content.split('\n').map((line, i) => (
          <p 
            key={i} 
            className={`${line.startsWith('-') || line.match(/^\d\./) ? 'ml-4 mb-3 border-l-2 border-slate-700/50 pl-4' : 'mb-4'} ${type === 'plan' ? 'font-medium' : ''}`}
            dangerouslySetInnerHTML={{ __html: formatPlanLine(line) }}
          />
        ))}
      </div>
    </div>
  );
};
