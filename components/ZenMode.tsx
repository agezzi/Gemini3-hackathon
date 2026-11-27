import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Wind, 
  Trophy, 
  Share2, 
  Headphones, 
  Brain, 
  Volume2, 
  VolumeX,
  Play,
  RotateCcw
} from 'lucide-react';
import { ZenGame } from './ZenGame';
import { ZenBreathing } from './ZenBreathing';
import { ZenLeaderboard } from './ZenLeaderboard';
import { ZenShareModal } from './ZenShareModal';
import { ZenScoreRecord, ZenWeeklyWinnerRecord, UserStats } from '../types';
import { User } from 'firebase/auth';

interface ZenModeProps {
  isOpen: boolean;
  onClose: () => void;
  authUser: User | null;
  stats: UserStats;
  onActivityComplete?: () => void;
}

export const ZenMode: React.FC<ZenModeProps> = ({
  isOpen,
  onClose,
  authUser,
  stats,
  onActivityComplete
}) => {
  const [activeTab, setActiveTab] = useState<'game' | 'breathing' | 'leaderboard'>('game');
  const [shareRecord, setShareRecord] = useState<Partial<ZenScoreRecord> | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isWeeklyWinnerShare, setIsWeeklyWinnerShare] = useState(false);

  if (!isOpen) return null;

  const handleOpenShare = (record: Partial<ZenScoreRecord>, isWinner: boolean = false) => {
    setShareRecord(record);
    setIsWeeklyWinnerShare(isWinner);
    setIsShareModalOpen(true);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950/95 backdrop-blur-2xl flex flex-col items-center justify-between overflow-y-auto animate-in fade-in duration-300 font-inter">
      
      {/* Top Header Navigation */}
      <header className="w-full border-b border-teal-500/20 bg-slate-900/60 sticky top-0 z-30 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 h-18 flex items-center justify-between gap-4 py-3">
          
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-slate-950 shadow-lg shadow-teal-500/25">
              <Sparkles className="w-6 h-6 fill-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-teal-400">
                  Neuro-Calm Sanctuary
                </span>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 font-mono border border-teal-500/20">
                  Parasympathetic Mode
                </span>
              </div>
              <h1 className="text-xl font-black text-white tracking-tight">
                Zen Focus & Relaxation
              </h1>
            </div>
          </div>

          {/* Navigation Pill Switches */}
          <div className="hidden md:flex items-center gap-1.5 bg-slate-950/70 p-1.5 rounded-2xl border border-white/5">
            <button
              onClick={() => setActiveTab('game')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'game'
                  ? 'bg-teal-600 text-white shadow-lg shadow-teal-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Brain className="w-4 h-4" />
              <span>Meditation & Focus Game</span>
            </button>

            <button
              onClick={() => setActiveTab('breathing')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'breathing'
                  ? 'bg-teal-600 text-white shadow-lg shadow-teal-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Wind className="w-4 h-4" />
              <span>Breathing Sanctuary</span>
            </button>

            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'leaderboard'
                  ? 'bg-teal-600 text-white shadow-lg shadow-teal-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Trophy className="w-4 h-4 text-amber-300" />
              <span>Weekly Leaderboard</span>
            </button>
          </div>

          {/* Right Action: Close Button */}
          <button
            onClick={onClose}
            className="p-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border border-white/5 flex items-center gap-2"
            title="Return to Workspace"
          >
            <span className="hidden sm:inline text-xs font-bold text-slate-300">Close Zen</span>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile Navigation Tabs */}
        <div className="flex md:hidden items-center justify-around px-4 pb-3 border-t border-white/5 pt-2">
          <button
            onClick={() => setActiveTab('game')}
            className={`text-xs font-bold py-1.5 px-3 rounded-lg ${
              activeTab === 'game' ? 'bg-teal-600 text-white' : 'text-slate-400'
            }`}
          >
            Game
          </button>
          <button
            onClick={() => setActiveTab('breathing')}
            className={`text-xs font-bold py-1.5 px-3 rounded-lg ${
              activeTab === 'breathing' ? 'bg-teal-600 text-white' : 'text-slate-400'
            }`}
          >
            Breathing
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`text-xs font-bold py-1.5 px-3 rounded-lg ${
              activeTab === 'leaderboard' ? 'bg-teal-600 text-white' : 'text-slate-400'
            }`}
          >
            Leaderboard
          </button>
        </div>
      </header>

      {/* Main Mode Content */}
      <main className="w-full flex-1 max-w-6xl mx-auto px-4 py-8 flex flex-col items-center justify-center">
        {activeTab === 'game' && (
          <ZenGame
            authUser={authUser}
            userDisplayName={stats.displayName}
            userArchetype={stats.neuralProfile?.primaryType}
            onOpenLeaderboard={() => setActiveTab('leaderboard')}
            onOpenShareModal={(record) => handleOpenShare(record, false)}
            onSessionComplete={onActivityComplete}
          />
        )}

        {activeTab === 'breathing' && (
          <ZenBreathing onCycleComplete={onActivityComplete} />
        )}

        {activeTab === 'leaderboard' && (
          <ZenLeaderboard
            currentUserId={authUser?.uid}
            onOpenShareModal={(record, isWinner) => handleOpenShare(record, !!isWinner)}
            onPlayGame={() => setActiveTab('game')}
          />
        )}
      </main>

      {/* Footer Ambient Info */}
      <footer className="w-full border-t border-white/5 py-4 text-center text-xs text-slate-500 font-mono">
        NeuralPlan Neuro-Relaxation Engine • 432Hz Solfeggio Resonant Calibrator
      </footer>

      {/* Social Media Share Modal */}
      <ZenShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        scoreRecord={shareRecord}
        isWeeklyChampion={isWeeklyWinnerShare}
      />
    </div>
  );
};
