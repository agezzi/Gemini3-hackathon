import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Target, 
  Cpu, 
  RefreshCcw, 
  BrainCircuit, 
  Zap, 
  Clock, 
  ListTodo,
  Settings2,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Trophy,
  ShieldAlert
} from 'lucide-react';
import { InputSection } from './components/InputSection';
import { ResultCard } from './components/ResultCard';
import { StatsPanel } from './components/StatsPanel';
import { Onboarding } from './components/Onboarding';
import { NeuralChat } from './components/NeuralChat';
import { FocusLock } from './components/FocusLock';
import { analyzeBehavior } from './services/geminiService';
import { AppState, UserStats, NeuralProfile } from './types';
import { INITIAL_HISTORY_DRAFT, INITIAL_GOALS_DRAFT, ACHIEVEMENTS } from './constants';

const LOCAL_STORAGE_KEY = 'neuralplan_v11_stable';

const App: React.FC = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [state, setState] = useState<AppState>(() => {
    const savedStats = localStorage.getItem(LOCAL_STORAGE_KEY);
    
    // Generate 6 days of history for initial state if no data exists
    const now = new Date();
    const historyData = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date();
      d.setDate(now.getDate() - (5 - i));
      return d.toISOString();
    });

    const initialStats: UserStats = savedStats ? JSON.parse(savedStats) : {
      currentStreak: 6,
      highestStreak: 6,
      totalPlansGenerated: 12,
      totalFocusMinutes: 480,
      lastUsedDate: now.toISOString().split('T')[0],
      unlockedBadgeIds: ['3day'], // Unlocked because streak >= 3
      neuralProfile: null,
      entryTimeHistory: historyData
    };

    return {
      history: INITIAL_HISTORY_DRAFT,
      nextDayDraft: INITIAL_GOALS_DRAFT,
      isAnalyzing: false,
      isOnboarding: !initialStats.neuralProfile,
      result: null,
      error: null,
      stats: initialStats,
      focusSession: {
        isActive: false,
        startTime: null,
        durationSeconds: 0,
        remainingSeconds: 0
      }
    };
  });

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state.stats));
  }, [state.stats]);

  useEffect(() => {
    if (!state.isOnboarding) {
      performAutonomousSync();
    }
  }, [state.isOnboarding]);

  const performAutonomousSync = () => {
    setIsSyncing(true);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const lastDateStr = state.stats.lastUsedDate;
    
    if (!lastDateStr) {
      setState(prev => ({
        ...prev,
        stats: { ...prev.stats, lastUsedDate: todayStr }
      }));
      setTimeout(() => setIsSyncing(false), 500);
      return;
    }

    // Skip if already synced today
    if (lastDateStr === todayStr) {
      setTimeout(() => setIsSyncing(false), 800);
      return;
    }

    const lastDate = new Date(lastDateStr);
    const todayDate = new Date(todayStr);
    const diffTime = Math.abs(todayDate.getTime() - lastDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let newStreak = state.stats.currentStreak;
    if (diffDays === 1) {
      newStreak += 1; // Success: Consecutive day
    } else if (diffDays > 1) {
      newStreak = 1; // Reset: Missed a day
    }

    const newUnlocked = [...state.stats.unlockedBadgeIds];
    ACHIEVEMENTS.forEach(ach => {
      if (newStreak >= ach.requirement && !newUnlocked.includes(ach.id)) {
        newUnlocked.push(ach.id);
      }
    });

    const newHistory = [...(state.stats.entryTimeHistory || [])];
    newHistory.push(now.toISOString());
    if (newHistory.length > 30) newHistory.shift(); // Keep up to 30 days of log history

    setState(prev => ({
      ...prev,
      stats: {
        ...prev.stats,
        currentStreak: newStreak,
        highestStreak: Math.max(newStreak, prev.stats.highestStreak),
        lastUsedDate: todayStr,
        unlockedBadgeIds: newUnlocked,
        entryTimeHistory: newHistory
      }
    }));

    setTimeout(() => setIsSyncing(false), 1500);
  };

  const handleOnboardingComplete = (profile: NeuralProfile) => {
    setState(prev => ({ ...prev, isOnboarding: false, stats: { ...prev.stats, neuralProfile: profile } }));
  };

  const handleAnalyze = async () => {
    if (!state.history.trim() || !state.nextDayDraft.trim()) {
      setState(prev => ({ ...prev, error: "Pattern data required." }));
      return;
    }
    setState(prev => ({ ...prev, isAnalyzing: true, error: null, result: null }));
    try {
      const result = await analyzeBehavior(state.history, state.nextDayDraft, state.stats.currentStreak, state.stats.neuralProfile);
      setState(prev => ({ 
        ...prev, 
        isAnalyzing: false, 
        result,
        stats: { ...prev.stats, totalPlansGenerated: prev.stats.totalPlansGenerated + 1 }
      }));
    } catch (err) {
      setState(prev => ({ ...prev, isAnalyzing: false, error: "Calibration failed. Neural link timeout." }));
    }
  };

  if (state.isOnboarding) return <Onboarding onComplete={handleOnboardingComplete} />;

  return (
    <div className="min-h-screen pb-20 selection:bg-emerald-500/30">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`p-2 rounded-lg shadow-lg relative group transition-all duration-1000 ${state.stats.currentStreak >= 7 ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-blue-500 to-indigo-600'}`}>
              <BrainCircuit className="w-6 h-6 text-white" />
              {isSyncing && <div className="absolute inset-0 bg-white/20 rounded-lg animate-ping" />}
            </div>
            <div>
              <h1 className="font-bold text-xl text-white tracking-tight">NeuralPlan</h1>
              <div className="flex items-center gap-2">
                <p className={`text-[10px] uppercase tracking-[0.4em] font-black leading-none ${state.stats.currentStreak >= 7 ? 'text-emerald-400' : 'text-blue-400'}`}>
                  STREAK: {state.stats.currentStreak} DAYS
                </p>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-800 border border-white/5">
                  <div className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                  <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">
                    {isSyncing ? 'Syncing...' : 'Registry_Verified'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <button onClick={() => setState(prev => ({ ...prev, isOnboarding: true }))} className="p-2 text-slate-500 hover:text-white transition-colors">
            <Settings2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-3">
            <StatsPanel stats={state.stats} />
          </div>

          <div className="lg:col-span-6 space-y-8">
            <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-[2.5rem] relative overflow-hidden group shadow-2xl">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-black tracking-tighter flex items-center gap-3 text-white">
                  <Activity className={`w-6 h-6 ${state.isAnalyzing ? 'animate-spin' : 'animate-pulse'}`} />
                  Behavioral Calibration
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-8">
                <InputSection label="Behavioral History" icon={<Clock className="w-4 h-4" />} value={state.history} onChange={(val) => setState(prev => ({ ...prev, history: val }))} placeholder="Recent behavior patterns..." />
                <InputSection label="Target Objectives" icon={<ListTodo className="w-4 h-4" />} value={state.nextDayDraft} onChange={(val) => setState(prev => ({ ...prev, nextDayDraft: val }))} placeholder="Goals for tomorrow..." />
              </div>
              <div className="mt-10">
                <button onClick={handleAnalyze} disabled={state.isAnalyzing} className="w-full py-6 rounded-2xl flex items-center justify-center gap-4 font-black text-xl bg-white text-slate-950 hover:bg-slate-100 transition-all shadow-xl active:scale-95 disabled:opacity-50">
                  {state.isAnalyzing ? <RefreshCcw className="w-6 h-6 animate-spin" /> : <Zap className="w-6 h-6" />}
                  <span className="ml-2">
                    {state.isAnalyzing ? 'Analyzing Patterns...' : 'Analyze & Adapt'}
                  </span>
                </button>
              </div>
            </div>

            {/* Error handling logic */}
            {state.error && (
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-400 text-sm font-bold flex items-center gap-3">
                <ShieldAlert className="w-5 h-5" />
                {state.error}
              </div>
            )}

            {/* Analysis result display logic */}
            {state.result && (
              <div className="space-y-6">
                <ResultCard 
                  type="insights" 
                  title="Behavioral Insights" 
                  content={state.result.insights} 
                />
                <ResultCard 
                  type="plan" 
                  title="Adapted Protocol" 
                  content={state.result.adaptedPlan}
                  quickWins={state.result.quickWins}
                  burnoutAlert={state.result.burnoutAlert}
                  onReset={() => setState(prev => ({ ...prev, result: null }))}
                />
                <ResultCard 
                  type="explanation" 
                  title="Cognitive Logic" 
                  content={state.result.explanation} 
                />
              </div>
            )}
          </div>

          <div className="lg:col-span-3">
            <FocusLock 
              onComplete={(mins) => setState(prev => ({
                ...prev,
                stats: { ...prev.stats, totalFocusMinutes: prev.stats.totalFocusMinutes + mins }
              }))}
              onStateChange={(isActive) => setState(prev => ({
                ...prev,
                focusSession: { ...prev.focusSession, isActive }
              }))}
            />
          </div>
        </div>
      </main>

      <NeuralChat profile={state.stats.neuralProfile} />
    </div>
  );
};

export default App;
