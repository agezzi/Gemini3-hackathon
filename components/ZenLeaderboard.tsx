import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Crown, 
  Flame, 
  Clock, 
  Share2, 
  Sparkles, 
  Medal, 
  Award, 
  Zap, 
  Users, 
  RefreshCw,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { 
  subscribeToWeeklyLeaderboard, 
  subscribeToAllTimeLeaderboard, 
  subscribeToWeeklyWinner,
  getCurrentWeekId,
  getRemainingTimeInWeek
} from '../services/zenLeaderboardService';
import { ZenScoreRecord, ZenWeeklyWinnerRecord } from '../types';

interface ZenLeaderboardProps {
  currentUserId?: string;
  onOpenShareModal: (record: Partial<ZenScoreRecord>, isWeeklyWinner?: boolean) => void;
  onPlayGame: () => void;
}

export const ZenLeaderboard: React.FC<ZenLeaderboardProps> = ({
  currentUserId,
  onOpenShareModal,
  onPlayGame
}) => {
  const currentWeekId = getCurrentWeekId();
  const [activeTab, setActiveTab] = useState<'weekly' | 'alltime'>('weekly');
  const [weeklyScores, setWeeklyScores] = useState<ZenScoreRecord[]>([]);
  const [allTimeScores, setAllTimeScores] = useState<ZenScoreRecord[]>([]);
  const [weeklyWinner, setWeeklyWinner] = useState<ZenWeeklyWinnerRecord | null>(null);
  const [remainingTime, setRemainingTime] = useState(getRemainingTimeInWeek());

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setRemainingTime(getRemainingTimeInWeek());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Subscriptions
  useEffect(() => {
    const unsubWeekly = subscribeToWeeklyLeaderboard(currentWeekId, (scores) => {
      setWeeklyScores(scores);
    });

    const unsubAllTime = subscribeToAllTimeLeaderboard((scores) => {
      setAllTimeScores(scores);
    });

    const unsubWinner = subscribeToWeeklyWinner(currentWeekId, (winner) => {
      setWeeklyWinner(winner);
    });

    return () => {
      unsubWeekly();
      unsubAllTime();
      unsubWinner();
    };
  }, [currentWeekId]);

  const activeScores = activeTab === 'weekly' ? weeklyScores : allTimeScores;

  // Determine current #1 leader
  const topLeader = weeklyScores.length > 0 ? weeklyScores[0] : null;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      
      {/* Weekly Tournament Champion Banner */}
      <div className="bg-gradient-to-r from-amber-500/20 via-slate-900 to-teal-500/15 border-2 border-amber-500/30 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 shadow-lg shadow-amber-500/20 shrink-0">
              <Crown className="w-8 h-8 animate-pulse text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Weekly Zen Tournament
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Cycle {currentWeekId}
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-black text-white tracking-tight mt-1">
                {topLeader 
                  ? `Reigning Leader: ${topLeader.displayName}` 
                  : 'Weekly Championship Open'}
              </h2>
              <p className="text-xs text-slate-300 max-w-lg mt-1">
                Top player this week earns the exclusive <strong className="text-amber-300 font-bold">🪷 Lotus Sovereign Badge</strong> and social media winner card certificate!
              </p>
            </div>
          </div>

          {/* Countdown & Award Button */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="bg-slate-950/70 border border-white/10 px-4 py-2.5 rounded-2xl text-center w-full sm:w-auto">
              <span className="text-[9px] uppercase font-mono text-slate-400 tracking-widest block">
                Coronation Countdown
              </span>
              <div className="text-sm font-black text-white font-mono flex items-center justify-center gap-1.5 mt-0.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>{remainingTime.days}d {remainingTime.hours}h {remainingTime.minutes}m</span>
              </div>
            </div>

            {topLeader && (
              <button
                onClick={() => onOpenShareModal(topLeader, true)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 text-slate-950 font-black text-xs transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 shrink-0"
                title="Share Weekly Winner Card to Social Channels"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share Champion</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs & Play Shortcut */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-slate-900/60 p-1 rounded-2xl border border-white/5">
          <button
            onClick={() => setActiveTab('weekly')}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'weekly'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>This Week ({weeklyScores.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('alltime')}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'alltime'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Medal className="w-3.5 h-3.5" />
            <span>All-Time Sages ({allTimeScores.length})</span>
          </button>
        </div>

        <button
          onClick={onPlayGame}
          className="px-5 py-2.5 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-300 font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Play & Set High Score</span>
        </button>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        {activeScores.length === 0 ? (
          <div className="text-center py-16 px-4 space-y-3">
            <Trophy className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-white">No Scores Logged Yet This Week</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Be the first to step into Zen Ripple Flow and claim the #1 spot on the leaderboard!
            </p>
            <button
              onClick={onPlayGame}
              className="mt-3 px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all shadow-md"
            >
              Play Meditation Game
            </button>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {activeScores.map((scoreItem, index) => {
              const rank = index + 1;
              const isCurrentUser = currentUserId && scoreItem.userId === currentUserId;
              const isFirst = rank === 1;

              return (
                <div
                  key={scoreItem.id || index}
                  className={`p-4 md:px-6 flex items-center justify-between gap-4 transition-colors ${
                    isCurrentUser 
                      ? 'bg-teal-500/10 border-l-4 border-l-teal-400' 
                      : 'hover:bg-slate-800/40'
                  }`}
                >
                  {/* Left: Rank & Player Info */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-8 flex items-center justify-center shrink-0">
                      {rank === 1 ? (
                        <div className="w-7 h-7 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-black text-xs shadow-md shadow-amber-500/30">
                          🥇
                        </div>
                      ) : rank === 2 ? (
                        <div className="w-7 h-7 rounded-full bg-slate-300 text-slate-950 flex items-center justify-center font-black text-xs shadow-md">
                          🥈
                        </div>
                      ) : rank === 3 ? (
                        <div className="w-7 h-7 rounded-full bg-amber-700 text-amber-100 flex items-center justify-center font-black text-xs shadow-md">
                          🥉
                        </div>
                      ) : (
                        <span className="text-xs font-mono font-bold text-slate-400">
                          #{rank}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold truncate ${isCurrentUser ? 'text-teal-300' : 'text-white'}`}>
                          {scoreItem.displayName || 'Anonymous Sage'}
                        </span>
                        {isCurrentUser && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-teal-500/20 text-teal-300 font-mono">
                            You
                          </span>
                        )}
                        {isFirst && (
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold hidden sm:inline-block">
                            Weekly Crown
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-0.5">
                        <span className="capitalize">{scoreItem.archetype || 'Mindful Pioneer'}</span>
                        <span>•</span>
                        <span>Streak: <strong className="text-amber-400 font-bold">{scoreItem.longestStreak}x</strong></span>
                        <span>•</span>
                        <span>Harmony: <strong className="text-teal-300 font-bold">{scoreItem.harmonyRate}%</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Score & Share Button */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-base md:text-lg font-black text-white font-mono">
                        {scoreItem.score.toLocaleString()}
                      </div>
                      <span className="text-[9px] text-slate-500 uppercase font-mono block">
                        points
                      </span>
                    </div>

                    <button
                      onClick={() => onOpenShareModal(scoreItem, isFirst)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                      title="Share this score on social media"
                    >
                      <Share2 className="w-4 h-4 text-teal-400" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
