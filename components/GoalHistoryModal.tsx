import React, { useState } from 'react';
import { 
  Target, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Plus, 
  Trash2, 
  X, 
  Calendar, 
  ArrowUpRight, 
  RotateCcw, 
  Award, 
  Sparkles,
  ChevronRight,
  Filter
} from 'lucide-react';
import { GoalRecord } from '../types';

interface GoalHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  goals: GoalRecord[];
  activeGoal: string | null;
  onSetMainGoal: (goalTitle: string) => void;
  onToggleGoalStatus: (goalId: string, newStatus: 'active' | 'completed' | 'abandoned') => void;
  onAddGoal: (goalTitle: string) => void;
  onDeleteGoal: (goalId: string) => void;
}

export const GoalHistoryModal: React.FC<GoalHistoryModalProps> = ({
  isOpen,
  onClose,
  goals,
  activeGoal,
  onSetMainGoal,
  onToggleGoalStatus,
  onAddGoal,
  onDeleteGoal
}) => {
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'abandoned'>('all');
  const [newGoalInput, setNewGoalInput] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  if (!isOpen) return null;

  const totalCount = goals.length;
  const completedCount = goals.filter(g => g.status === 'completed').length;
  const activeCount = goals.filter(g => g.status === 'active').length;
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalInput.trim()) return;
    onAddGoal(newGoalInput.trim());
    setNewGoalInput('');
    setIsAdding(false);
  };

  const filteredGoals = goals.filter(g => {
    if (filter === 'active') return g.status === 'active';
    if (filter === 'completed') return g.status === 'completed';
    if (filter === 'abandoned') return g.status === 'abandoned';
    return true;
  });

  const formatTimestamp = (isoString?: string | null) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="fixed inset-0 z-[150] bg-slate-900/45 dark:bg-slate-950/90 backdrop-blur-2xl flex items-center justify-center p-4 sm:p-6 overflow-y-auto font-sans">
      <div className="max-w-2xl w-full bg-white/95 dark:bg-slate-900 border border-sky-900/15 dark:border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden relative animate-in fade-in zoom-in-95 duration-200 my-auto">
        {/* Top Header Card */}
        <div className="p-6 md:p-8 bg-gradient-to-b from-[#EAF6FA] to-white/90 dark:from-slate-800/60 dark:to-slate-900/60 border-b border-sky-900/10 dark:border-slate-800 relative">
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-sky-100/70 dark:hover:bg-slate-800 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-start gap-4">
            <div className="p-3.5 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl text-white shadow-xl shadow-blue-500/20">
              <Target className="w-6 h-6" />
            </div>
            <div className="flex-1 pr-8">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-[10px] font-black uppercase tracking-[0.28em] text-blue-600 dark:text-blue-400">
                  Telemetry Registry
                </span>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-[10px] font-bold tabular-nums">
                  {completedCount} of {totalCount} Accomplished
                </span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Neural Goal History
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Historical trajectory of locked objectives and circadian commitments.
              </p>
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-3 gap-3 mt-6 pt-6 border-t border-sky-900/10 dark:border-slate-800/80">
            <div className="bg-[#F2F9FC] dark:bg-slate-950/50 p-3.5 rounded-2xl border border-sky-900/10 dark:border-white/5">
              <div className="text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Completion Rate
              </div>
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                {completionRate}%
              </div>
              <div className="w-full h-1 bg-sky-100 dark:bg-slate-800 rounded-full mt-2 overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>

            <div className="bg-[#F2F9FC] dark:bg-slate-950/50 p-3.5 rounded-2xl border border-sky-900/10 dark:border-white/5">
              <div className="text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Active Objectives
              </div>
              <div className="text-xl font-black text-blue-600 dark:text-blue-400 tabular-nums">
                {activeCount}
              </div>
              <span className="text-[10px] text-slate-600 dark:text-slate-400 mt-1 block">
                {activeGoal ? 'Objective Armed' : 'Standby Mode'}
              </span>
            </div>

            <div className="bg-[#F2F9FC] dark:bg-slate-950/50 p-3.5 rounded-2xl border border-sky-900/10 dark:border-white/5">
              <div className="text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Archived Goals
              </div>
              <div className="text-xl font-black text-slate-800 dark:text-slate-200 tabular-nums">
                {completedCount}
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400/80 mt-1 block font-medium">
                Verified Finish
              </span>
            </div>
          </div>

          {/* Filter Tabs & Add Goal Button */}
          <div className="flex flex-wrap items-center justify-between gap-3 mt-6">
            <div className="flex items-center gap-1.5 p-1 bg-[#EEF7FA] dark:bg-slate-950/60 border border-sky-900/10 dark:border-white/5 rounded-xl">
              {(['all', 'active', 'completed'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFilter(t)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all tabular-nums ${
                    filter === t
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {t} ({
                    t === 'all' 
                      ? totalCount 
                      : t === 'active' 
                        ? activeCount 
                        : completedCount
                  })
                </button>
              ))}
            </div>

            <button
              onClick={() => setIsAdding(!isAdding)}
              className="px-3.5 py-1.5 rounded-xl bg-[#EEF7FA] hover:bg-sky-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-bold flex items-center gap-1.5 border border-sky-900/10 dark:border-white/5 transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>{isAdding ? 'Cancel' : 'Set New Goal'}</span>
            </button>
          </div>

          {/* New Goal Input Form */}
          {isAdding && (
            <form onSubmit={handleCreateGoal} className="mt-4 pt-4 border-t border-sky-900/10 dark:border-slate-800 flex gap-2 animate-in fade-in duration-200">
              <input
                type="text"
                value={newGoalInput}
                onChange={(e) => setNewGoalInput(e.target.value)}
                placeholder="Enter objective title (e.g. Audit Q3 metrics & deep work)..."
                className="flex-1 bg-white dark:bg-slate-950 border border-blue-500/40 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                autoFocus
              />
              <button
                type="submit"
                disabled={!newGoalInput.trim()}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all shadow-md shrink-0"
              >
                Arm Objective
              </button>
            </form>
          )}
        </div>

        {/* Goals List */}
        <div className="p-6 md:p-8 max-h-[50vh] overflow-y-auto space-y-3.5">
          {filteredGoals.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400 text-xs">
              <Target className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No goals matching "{filter}" filter.
            </div>
          ) : (
            filteredGoals.map((goal) => {
              const isCurrentMain = activeGoal === goal.title;
              const isCompleted = goal.status === 'completed';

              return (
                <div
                  key={goal.id}
                  className={`p-4 rounded-2xl border transition-all relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group ${
                    isCompleted
                      ? 'bg-emerald-50/70 dark:bg-slate-950/40 border-emerald-500/25 dark:border-emerald-500/20'
                      : isCurrentMain
                        ? 'bg-blue-50/90 dark:bg-blue-600/10 border-blue-500/35 dark:border-blue-500/40 shadow-lg shadow-blue-500/5'
                        : 'bg-[#F4FAFC] dark:bg-slate-950/60 border-sky-900/10 dark:border-white/5'
                  }`}
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <button
                      onClick={() => onToggleGoalStatus(
                        goal.id, 
                        isCompleted ? 'active' : 'completed'
                      )}
                      className={`mt-0.5 p-1 rounded-lg transition-transform active:scale-90 ${
                        isCompleted
                          ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 hover:bg-emerald-500/25'
                          : 'text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 bg-white dark:bg-slate-800 border border-sky-900/10 dark:border-transparent'
                      }`}
                      title={isCompleted ? 'Mark Active' : 'Mark Completed'}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 fill-emerald-500/20 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          isCompleted
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25'
                            : isCurrentMain
                              ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30'
                              : 'bg-sky-100/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-sky-900/10 dark:border-slate-700'
                        }`}>
                          {isCompleted ? 'Completed' : isCurrentMain ? 'Active Locked' : 'Pending'}
                        </span>
                        
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-mono">
                          <Calendar className="w-3 h-3" />
                          {formatTimestamp(goal.createdAt)}
                        </span>
                      </div>

                      <h4 className={`text-sm font-bold leading-tight ${
                        isCompleted ? 'text-slate-400 dark:text-slate-500 line-through decoration-slate-400 dark:decoration-slate-600' : 'text-slate-900 dark:text-white'
                      }`}>
                        {goal.title}
                      </h4>

                      {isCompleted && goal.completedAt && (
                        <div className="text-[10px] text-emerald-700 dark:text-emerald-400/90 font-mono mt-1 flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span>Accomplished on {formatTimestamp(goal.completedAt)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {!isCompleted && !isCurrentMain && (
                      <button
                        onClick={() => onSetMainGoal(goal.title)}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-sky-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center gap-1 border border-sky-900/10 dark:border-white/5 transition-colors"
                        title="Set as Main Goal"
                      >
                        <Target className="w-3 h-3" />
                        <span>Arm</span>
                      </button>
                    )}

                    {isCompleted && (
                      <button
                        onClick={() => onToggleGoalStatus(goal.id, 'active')}
                        className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-sky-100/70 dark:hover:bg-slate-800 transition-colors"
                        title="Re-activate Goal"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => onDeleteGoal(goal.id)}
                      className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-slate-800 transition-colors"
                      title="Delete Entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 bg-[#F2F9FC] dark:bg-slate-950/70 border-t border-sky-900/10 dark:border-slate-800 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            {completedCount} Goals Accomplished in Current Persistence Cycle
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
