import React, { useState } from 'react';
import { 
  MessageSquare, 
  AlertTriangle, 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck
} from 'lucide-react';
import { CoachFeedbackItem } from '../types';
import { markFeedbackRead } from '../services/cohortService';

interface MemberFeedbackBannerProps {
  userId: string;
  feedbackList: CoachFeedbackItem[];
}

export const MemberFeedbackBanner: React.FC<MemberFeedbackBannerProps> = ({ userId, feedbackList }) => {
  const [showArchive, setShowArchive] = useState(false);

  const unreadItems = feedbackList.filter(f => !f.read);
  const activeFeedback = unreadItems[0] || (showArchive ? feedbackList[0] : null);

  if (!activeFeedback && !showArchive) return null;

  const handleAcknowledge = async (item: CoachFeedbackItem) => {
    try {
      await markFeedbackRead(userId, item.id);
    } catch (e) {
      console.error(e);
    }
  };

  const getBorderAndBg = (type: string) => {
    switch (type) {
      case 'warning':
        return 'border-red-300 dark:border-red-500/40 bg-red-50/90 dark:bg-red-950/30 text-red-900 dark:text-red-200';
      case 'kudos':
        return 'border-emerald-300 dark:border-emerald-500/40 bg-emerald-50/90 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200';
      case 'checkin':
        return 'border-violet-300 dark:border-purple-500/40 bg-violet-50/90 dark:bg-purple-950/30 text-violet-900 dark:text-purple-200';
      default:
        return 'border-blue-300 dark:border-blue-500/40 bg-white/90 dark:bg-blue-950/30 text-slate-900 dark:text-blue-200';
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />;
      case 'kudos':
        return <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />;
      default:
        return <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />;
    }
  };

  return (
    <div className="mb-6">
      {unreadItems.length > 0 && activeFeedback && (
        <div className={`p-4 rounded-2xl border ${getBorderAndBg(activeFeedback.type)} shadow-md backdrop-blur-md transition-all`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              {getIcon(activeFeedback.type)}
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <span className="font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                    Live Coach Feedback
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono">
                    From {activeFeedback.adminEmail}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                  {activeFeedback.title}
                </h3>
                <p className="text-xs text-slate-700 dark:text-slate-200 mt-1.5 leading-relaxed">
                  {activeFeedback.message}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleAcknowledge(activeFeedback)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-all"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Acknowledge
              </button>
            </div>
          </div>

          {unreadItems.length > 1 && (
            <div className="mt-3 pt-2 border-t border-sky-900/10 dark:border-slate-800/60 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <span>+ {unreadItems.length - 1} more coach observations</span>
            </div>
          )}
        </div>
      )}

      {feedbackList.length > 0 && unreadItems.length === 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-white/80 dark:bg-slate-900/60 border border-sky-900/10 dark:border-slate-800/80 rounded-xl text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Coach notes logged: {feedbackList.length} (All acknowledged)</span>
          </div>
          <button
            onClick={() => setShowArchive(!showArchive)}
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            {showArchive ? 'Hide Notes' : 'View Past Feedback'}
          </button>
        </div>
      )}

      {showArchive && feedbackList.length > 0 && (
        <div className="mt-2 space-y-2">
          {feedbackList.map(item => (
            <div key={item.id} className="p-3 bg-white/85 dark:bg-slate-900/90 border border-sky-900/10 dark:border-slate-800 rounded-xl text-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                <span className="font-bold text-slate-900 dark:text-slate-200">{item.title}</span>
                <span>{new Date(item.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="text-slate-700 dark:text-slate-300 text-xs">{item.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
