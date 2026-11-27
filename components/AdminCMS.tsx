import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Activity, 
  Flame, 
  Clock, 
  AlertTriangle, 
  Send, 
  CheckCircle2, 
  Sparkles, 
  Search, 
  Filter, 
  ChevronRight, 
  X, 
  MessageSquare, 
  ShieldCheck, 
  RefreshCw, 
  Download, 
  ExternalLink,
  Brain,
  Zap,
  UserCheck,
  Lock,
  LogIn,
  LogOut,
  ArrowLeft,
  Copy,
  Check,
  Database,
  BarChart3,
  Trash2
} from 'lucide-react';
import { signInWithPopup, signOut } from 'firebase/auth';
import { UserProfileRecord, DailyPlanRecord, CoachFeedbackItem, FeedbackType, ZenScoreRecord } from '../types';
import { 
  subscribeToCohort, 
  subscribeToZenCohortScores,
  subscribeToFeedback, 
  subscribeToMemberPlans, 
  sendFeedbackToMember, 
  purgeAllBackendData,
  isUserAdmin,
  ADMIN_EMAIL 
} from '../services/cohortService';
import { auth, googleProvider } from '../services/firebase';
import { CohortHealthDashboard } from './CohortHealthDashboard';

interface AdminCMSProps {
  onClose: () => void;
  currentAdminEmail?: string | null;
}

const FEEDBACK_TEMPLATES = [
  {
    title: 'Sensory Grounding Protocol',
    message: 'I observed your schedule redlining with multiple back-to-back high-load blocks. Implement a strict 15-minute dim-light sensory cooldown right now to avoid a dopamine crash.',
    type: 'warning' as FeedbackType
  },
  {
    title: 'Waiting-Mode Micro Intervention',
    message: 'Notice you have a 1pm meeting. Do not fall into passive waiting mode this morning—pick a 3-minute micro-task to start immediate momentum.',
    type: 'strategy' as FeedbackType
  },
  {
    title: 'Exceptional Streak & Deep Work',
    message: 'Outstanding adherence to your morning focus chunk. Your plan completion velocity is in the top 5% of the cohort. Keep this rhythm.',
    type: 'kudos' as FeedbackType
  },
  {
    title: 'Cognitive Interleaving Required',
    message: 'Your historical logs indicate afternoon fatigue when working >60 minutes on one subject. Interleave a 20-minute physical walk or alternate task.',
    type: 'strategy' as FeedbackType
  }
];

export const AdminCMS: React.FC<AdminCMSProps> = ({ onClose, currentAdminEmail }) => {
  const [members, setMembers] = useState<UserProfileRecord[]>([]);
  const [selectedMember, setSelectedMember] = useState<UserProfileRecord | null>(null);
  const [memberPlans, setMemberPlans] = useState<DailyPlanRecord[]>([]);
  const [memberFeedback, setMemberFeedback] = useState<CoachFeedbackItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isPurging, setIsPurging] = useState(false);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [purgeSummary, setPurgeSummary] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [feedbackTitle, setFeedbackTitle] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('strategy');
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [zenScores, setZenScores] = useState<ZenScoreRecord[]>([]);
  const [activeView, setActiveView] = useState<'health' | 'roster'>('health');

  const isAuthorized = isUserAdmin(currentAdminEmail);
  const adminLoginUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/admin` : '/admin';

  const handleCopyAdminUrl = async () => {
    try {
      await navigator.clipboard.writeText(adminLoginUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    } catch {
      // Fallback ignored if clipboard blocked
    }
  };

  // Subscribe to all cohort members & zen scores only if authorized
  useEffect(() => {
    if (!isAuthorized) return;
    const unsubscribe = subscribeToCohort((cohortMembers) => {
      setMembers(cohortMembers);
      // If a member was selected, keep selected reference updated
      if (selectedMember) {
        const updated = cohortMembers.find(m => m.id === selectedMember.id);
        if (updated) setSelectedMember(updated);
      }
    });

    const unsubZen = subscribeToZenCohortScores((scores) => {
      setZenScores(scores);
    });

    return () => {
      unsubscribe();
      unsubZen();
    };
  }, [selectedMember?.id, isAuthorized]);

  // When a member is clicked, subscribe to their plans and feedback history
  useEffect(() => {
    if (!selectedMember) {
      setMemberPlans([]);
      setMemberFeedback([]);
      return;
    }

    const unsubPlans = subscribeToMemberPlans(selectedMember.id, (plans) => {
      setMemberPlans(plans);
    });

    const unsubFeedback = subscribeToFeedback(selectedMember.id, (fb) => {
      setMemberFeedback(fb);
    });

    return () => {
      unsubPlans();
      unsubFeedback();
    };
  }, [selectedMember?.id]);

  // Aggregate stats
  const totalCoachees = members.length;
  const activeFocusCount = members.filter(m => m.currentStatus === 'in_focus').length;
  const redliningCount = members.filter(m => m.currentStatus === 'redlining').length;
  const totalFocusHours = Math.round(members.reduce((acc, m) => acc + (m.totalFocusMinutes || 0), 0) / 60);
  const avgStreak = totalCoachees > 0 
    ? (members.reduce((acc, m) => acc + (m.currentStreak || 0), 0) / totalCoachees).toFixed(1) 
    : '0';

  // Filtered members
  const filteredMembers = members.filter(m => {
    const matchesSearch = (m.displayName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (m.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (m.archetype || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = statusFilter === 'all' || m.currentStatus === statusFilter;
    return matchesSearch && matchesFilter;
  });

  const handlePurgeBackendData = async () => {
    setIsPurging(true);
    setPurgeSummary(null);
    try {
      const res = await purgeAllBackendData();
      setSelectedMember(null);
      setMemberPlans([]);
      setMemberFeedback([]);
      setShowPurgeConfirm(false);
      setPurgeSummary(
        `Backend cleared: removed ${res.deletedUsers} users, ${res.deletedSubdocs} plans/feedback docs, ${res.deletedZenScores} Zen scores, and ${res.deletedZenWinners} winner records.`
      );
      setTimeout(() => setPurgeSummary(null), 6000);
    } catch (e) {
      console.error('Failed to purge backend data:', e);
    } finally {
      setIsPurging(false);
    }
  };

  const handleSendFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember || !feedbackTitle.trim() || !feedbackMessage.trim()) return;

    setIsSending(true);
    try {
      await sendFeedbackToMember({
        userId: selectedMember.id,
        adminId: auth.currentUser?.uid || 'admin_console',
        adminEmail: auth.currentUser?.email || ADMIN_EMAIL,
        title: feedbackTitle.trim(),
        message: feedbackMessage.trim(),
        type: feedbackType
      });

      setFeedbackSuccess(true);
      setFeedbackTitle('');
      setFeedbackMessage('');
      setTimeout(() => setFeedbackSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to send feedback', err);
    } finally {
      setIsSending(false);
    }
  };

  const applyTemplate = (template: typeof FEEDBACK_TEMPLATES[0]) => {
    setFeedbackTitle(template.title);
    setFeedbackMessage(template.message);
    setFeedbackType(template.type);
  };

  const exportCSV = () => {
    const headers = ['Name', 'Email', 'Archetype', 'Status', 'Current Streak', 'Total Focus Mins', 'Last Active'];
    const rows = members.map(m => [
      `"${m.displayName || ''}"`,
      `"${m.email || ''}"`,
      `"${m.archetype || 'Uncalibrated'}"`,
      `"${m.currentStatus}"`,
      m.currentStreak || 0,
      m.totalFocusMinutes || 0,
      `"${m.lastActiveAt || ''}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `neuralplan_cohort_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isAuthorized) {
    const handleAdminSignIn = async () => {
      setIsSigningIn(true);
      setAuthError(null);
      try {
        await signInWithPopup(auth, googleProvider);
      } catch (e: any) {
        console.error('Admin Sign-in error:', e);
        const code = e?.code || '';
        if (code === 'auth/popup-blocked') {
          setAuthError('Browser blocked the sign-in popup. Please allow popups for this site and try again.');
        } else if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
          setAuthError('Sign-in was cancelled before completion.');
        } else {
          setAuthError(e?.message || 'Unable to authenticate with Google. Please try again.');
        }
      } finally {
        setIsSigningIn(false);
      }
    };

    const handleAdminSignOut = async () => {
      setAuthError(null);
      try {
        await signOut(auth);
      } catch (e) {
        console.error('Sign-out error:', e);
      }
    };

    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center p-6 text-slate-100 font-sans overflow-y-auto">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 md:p-10 text-center shadow-2xl relative overflow-hidden my-auto">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
          
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            title="Return to App"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto mb-6 text-amber-400 shadow-lg shadow-amber-500/5">
            <Lock className="w-8 h-8" />
          </div>

          <div className="inline-block px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest mb-3">
            Admin Backend Gateway
          </div>

          <h2 className="text-2xl font-black text-white tracking-tight mb-2">
            Admin &amp; Backend Login
          </h2>

          <p className="text-xs text-slate-400 mb-6 leading-relaxed max-w-sm mx-auto">
            Authenticate with your authorized Google admin account to access real-time Firestore cohort telemetry, plans, and coaching tools.
          </p>

          {/* Direct Backend Endpoint Box */}
          <div className="mb-6 p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-left space-y-2">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <span className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-amber-400" />
                Backend Login URL
              </span>
              <button
                type="button"
                onClick={handleCopyAdminUrl}
                className="text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
              >
                {copiedUrl ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedUrl ? 'Copied' : 'Copy Link'}</span>
              </button>
            </div>
            <div className="text-[11px] font-mono text-slate-300 truncate bg-slate-900 px-2.5 py-1.5 rounded-lg border border-white/5">
              {adminLoginUrl}
            </div>
          </div>

          {authError && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 text-left">
              {authError}
            </div>
          )}

          {!currentAdminEmail ? (
            <div className="space-y-4">
              <button
                onClick={handleAdminSignIn}
                disabled={isSigningIn}
                className="w-full py-4 px-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 disabled:opacity-60 text-slate-950 text-sm font-black rounded-2xl shadow-xl shadow-amber-500/20 flex items-center justify-center gap-3 transition-all active:scale-95"
              >
                {isSigningIn ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4" />
                )}
                <span>{isSigningIn ? 'Signing In...' : 'Sign In with Google (Admin)'}</span>
              </button>
              <p className="text-[11px] text-slate-500">
                Authorized Admin: <span className="font-mono text-slate-300">{ADMIN_EMAIL}</span>
              </p>
            </div>
          ) : (
            <div className="space-y-4 bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-4 text-left">
              <div className="flex items-center gap-2 text-red-400 text-xs font-bold">
                <AlertTriangle className="w-4 h-4" />
                Unauthorized Account
              </div>
              <p className="text-xs text-slate-300">
                You are currently signed in as <span className="font-mono text-white">{currentAdminEmail}</span>. Only verified admin <span className="font-mono text-amber-300">{ADMIN_EMAIL}</span> can unlock the backend console.
              </p>
              <button
                onClick={handleAdminSignOut}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out &amp; Switch Account
              </button>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-slate-800">
            <button
              onClick={onClose}
              className="text-xs font-bold text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-2 mx-auto"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Return to NeuralPlan App
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex flex-col text-slate-100 overflow-hidden font-sans">
      {/* Top Navigation & Status Bar */}
      <header className="border-b border-slate-800 bg-slate-900/90 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white">NeuralPlan CMS & Cohort Telemetry</h1>
              <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live Cloud Sync
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Admin & Coach Console • Tracking 1–30 coachees in real time
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!showPurgeConfirm ? (
            <button
              type="button"
              onClick={() => setShowPurgeConfirm(true)}
              disabled={isPurging}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
              title="Clear all test users, plans, feedback, and Zen leaderboard records from Firestore"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Backend Data</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-red-950/70 border border-red-500/40 rounded-lg px-2.5 py-1.5">
              <span className="text-[11px] font-medium text-red-200 whitespace-nowrap">
                Wipe all Firestore test data?
              </span>
              <button
                type="button"
                onClick={handlePurgeBackendData}
                disabled={isPurging}
                className="px-2.5 py-1 text-[11px] font-bold bg-red-600 hover:bg-red-500 text-white rounded transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                {isPurging ? 'Clearing...' : 'Confirm Reset'}
              </button>
              <button
                type="button"
                onClick={() => setShowPurgeConfirm(false)}
                disabled={isPurging}
                className="px-2 py-1 text-[11px] text-slate-300 hover:text-white rounded transition-colors whitespace-nowrap shrink-0"
              >
                Cancel
              </button>
            </div>
          )}

          <button
            onClick={exportCSV}
            disabled={members.length === 0}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <Download className="w-4 h-4 text-blue-400" />
            Export CSV
          </button>

          <button
            onClick={handleCopyAdminUrl}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg transition-colors"
            title="Copy direct backend admin login URL"
          >
            {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
            <span>{copiedUrl ? 'Copied /admin URL' : 'Copy Admin Link'}</span>
          </button>

          <button
            onClick={() => signOut(auth)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-slate-800 hover:bg-red-500/20 hover:text-red-300 text-slate-300 border border-slate-700 rounded-lg transition-colors"
            title="Sign out of Admin Console"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Sign Out</span>
          </button>

          <div className="h-6 w-px bg-slate-800" />

          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-lg shadow-blue-500/20 transition-all"
          >
            Exit CMS View
            <X className="w-4 h-4 ml-1" />
          </button>
        </div>
      </header>

      {/* Cohort Live KPI Row */}
      <div className="px-6 py-4 bg-slate-900/40 border-b border-slate-800/80 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Enrolled Coachees</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{totalCoachees}</span>
            <span className="text-xs text-slate-500">/ 30 cohort limit</span>
          </div>
        </div>

        <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Active Focus Now</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400">{activeFocusCount}</span>
            <span className="text-xs text-emerald-500/80 font-medium">live timers</span>
          </div>
        </div>

        <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Redlining Warnings</span>
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-red-400">{redliningCount}</span>
            <span className="text-xs text-red-500/80 font-medium">high strain</span>
          </div>
        </div>

        <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Total Focus Hours</span>
            <Clock className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{totalFocusHours}</span>
            <span className="text-xs text-slate-500">hours completed</span>
          </div>
        </div>

        <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Avg Cohort Streak</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-400">{avgStreak}</span>
            <span className="text-xs text-slate-500">consecutive days</span>
          </div>
        </div>
      </div>

      {/* Workspace View Switcher: Cohort Health vs. Coachee Roster */}
      <div className="px-6 py-2.5 bg-slate-900/70 border-b border-slate-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-950 border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveView('health')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 ${
              activeView === 'health'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Cohort Health</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveView('roster')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 ${
              activeView === 'roster'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Coachee Roster ({members.length})</span>
          </button>
        </div>

        <div className="hidden sm:block text-xs font-mono text-slate-400">
          {activeView === 'health'
            ? 'Aggregated Firestore Telemetry & Growth Trends'
            : 'Real-Time Member Directory & Coaching Feedback'}
        </div>
      </div>

      {purgeSummary && (
        <div className="px-6 py-2.5 bg-emerald-500/10 border-b border-emerald-500/30 text-xs text-emerald-300 flex items-center justify-between gap-4">
          <span className="font-medium">{purgeSummary}</span>
          <button
            type="button"
            onClick={() => setPurgeSummary(null)}
            className="text-emerald-400 hover:text-white text-xs font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Content Workspace: Cohort Health Dashboard or Members Roster */}
      {activeView === 'health' ? (
        <CohortHealthDashboard
          members={members}
          zenScores={zenScores}
          onInspectMember={(member) => {
            setSelectedMember(member);
            setActiveView('roster');
          }}
        />
      ) : (
      <div className="flex-1 flex overflow-hidden">
        {/* Left / Center Table: Coachee List */}
        <div className={`flex-1 flex flex-col border-r border-slate-800/80 overflow-hidden ${selectedMember ? 'hidden md:flex' : 'flex'}`}>
          {/* Filter Bar */}
          <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search coachee by name, email, or cognitive archetype..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-[11px] text-slate-400 font-medium mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" />
                Status:
              </span>
              {[
                { id: 'all', label: 'All' },
                { id: 'in_focus', label: 'In Focus' },
                { id: 'redlining', label: 'Redlining' },
                { id: 'plan_ready', label: 'Plan Ready' },
                { id: 'idle', label: 'Idle' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                    statusFilter === tab.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Members Table */}
          <div className="flex-1 overflow-y-auto">
            {filteredMembers.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-300">No Coachees Found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                  {members.length === 0 
                    ? "Your database is currently clean with zero enrolled user records. New users will appear here as they sign in and complete onboarding."
                    : "No members match your current search and status filter."}
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-900/90 text-slate-400 font-semibold uppercase tracking-wider text-[10px] sticky top-0 z-10 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Coachee</th>
                    <th className="py-3 px-4">Cognitive Archetype</th>
                    <th className="py-3 px-4">Real-Time Status</th>
                    <th className="py-3 px-4">Streak</th>
                    <th className="py-3 px-4">Focus Time</th>
                    <th className="py-3 px-4">Last Active</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredMembers.map((member) => {
                    const isSelected = selectedMember?.id === member.id;
                    return (
                      <tr 
                        key={member.id}
                        onClick={() => setSelectedMember(member)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-900/20' : 'hover:bg-slate-900/40'
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-xs font-black text-white shrink-0 shadow-md">
                              {(member.displayName || member.email || 'U')[0].toUpperCase()}
                            </div>
                            <div className="truncate">
                              <p className="font-semibold text-slate-200">{member.displayName || 'Cohort Member'}</p>
                              <p className="text-[11px] text-slate-500 truncate">{member.email}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                            <Brain className="w-3 h-3 text-indigo-400" />
                            {member.archetype || 'Neural Calibrating'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          {member.currentStatus === 'in_focus' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                              Focusing ({member.focusState?.remainingSeconds ? `${Math.ceil(member.focusState.remainingSeconds / 60)}m` : 'Active'})
                            </span>
                          )}
                          {member.currentStatus === 'redlining' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-500/10 text-red-400 border border-red-500/30">
                              <AlertTriangle className="w-3 h-3 text-red-400" />
                              Redlining Alert
                            </span>
                          )}
                          {member.currentStatus === 'plan_ready' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                              <CheckCircle2 className="w-3 h-3 text-blue-400" />
                              Plan Active
                            </span>
                          )}
                          {member.currentStatus === 'idle' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-400">
                              Idle
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                          {member.currentStreak || 0}d
                        </td>

                        <td className="py-3.5 px-4 font-mono text-slate-300">
                          {Math.round((member.totalFocusMinutes || 0) / 60)}h {(member.totalFocusMinutes || 0) % 60}m
                        </td>

                        <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                          {member.lastActiveAt ? new Date(member.lastActiveAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMember(member);
                            }}
                            className="px-2.5 py-1 text-[11px] font-semibold bg-slate-800 hover:bg-blue-600 text-slate-200 hover:text-white rounded-md transition-colors inline-flex items-center gap-1"
                          >
                            Inspect
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Drawer / Inspection Studio */}
        <div className={`w-full md:w-[480px] lg:w-[540px] bg-slate-900/90 border-l border-slate-800 flex flex-col overflow-y-auto ${
          selectedMember ? 'flex' : 'hidden md:flex items-center justify-center text-slate-500 p-8 text-center'
        }`}>
          {!selectedMember ? (
            <div>
              <UserCheck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-400">Select a Coachee</p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                Click any row in the roster to view live focus status, inspect historical AI plans, and deliver direct coaching feedback.
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              {/* Member Profile Header */}
              <div className="p-5 border-b border-slate-800 bg-slate-950/60 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-lg font-black text-white shadow-lg shadow-blue-500/20">
                    {(selectedMember.displayName || selectedMember.email)[0].toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      {selectedMember.displayName || 'Cohort Member'}
                    </h2>
                    <p className="text-xs text-slate-400 font-mono">{selectedMember.email}</p>
                    <p className="text-[11px] text-blue-400 font-medium mt-0.5">
                      Archetype: {selectedMember.archetype || 'Neural Baseline'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedMember(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Real-time Status Card */}
              <div className="p-5 border-b border-slate-800 bg-slate-900/50">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  <span>Current Live Telemetry</span>
                  <Activity className="w-4 h-4 text-blue-400" />
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400">Current Status:</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      selectedMember.currentStatus === 'in_focus' ? 'bg-emerald-500/20 text-emerald-400' :
                      selectedMember.currentStatus === 'redlining' ? 'bg-red-500/20 text-red-400' :
                      selectedMember.currentStatus === 'plan_ready' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      {selectedMember.currentStatus.toUpperCase()}
                    </span>
                  </div>

                  {selectedMember.focusState?.isActive && (
                    <div className="mt-3 pt-3 border-t border-slate-800/80">
                      <p className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        Focus Task: {selectedMember.focusState.taskTitle || 'Deep Work Session'}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Time Remaining: {Math.ceil(selectedMember.focusState.remainingSeconds / 60)} minutes
                      </p>
                    </div>
                  )}

                  {selectedMember.mainGoal && (
                    <div className="mt-3 pt-3 border-t border-slate-800/80">
                      <p className="text-[11px] text-slate-400">Primary Sprint Goal:</p>
                      <p className="text-xs font-medium text-slate-200 mt-0.5">{selectedMember.mainGoal}</p>
                    </div>
                  )}

                  {selectedMember.latestPlanSnippet && (
                    <div className="mt-3 pt-3 border-t border-slate-800/80">
                      <p className="text-[11px] text-slate-400">Latest AI Schedule Diagnostic:</p>
                      <p className="text-xs italic text-slate-300 mt-0.5 bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                        "{selectedMember.latestPlanSnippet}"
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Feedback Dispatch Studio */}
              <div className="p-5 border-b border-slate-800">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
                  <span className="flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-blue-400" />
                    Deliver Honest Coach Feedback
                  </span>
                  <span className="text-[10px] text-slate-500">Pushed to user in real time</span>
                </div>

                {/* Feedback Templates */}
                <div className="mb-3">
                  <p className="text-[11px] text-slate-400 mb-1.5">Quick Interventions:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {FEEDBACK_TEMPLATES.map((tmpl, idx) => (
                      <button
                        key={idx}
                        onClick={() => applyTemplate(tmpl)}
                        className="text-[11px] px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-700 transition-colors"
                      >
                        {tmpl.title}
                      </button>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleSendFeedback} className="space-y-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Feedback Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Schedule Restructure Recommendation"
                      value={feedbackTitle}
                      onChange={(e) => setFeedbackTitle(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: 'strategy', label: 'Strategy', color: 'border-blue-500/50 text-blue-400' },
                      { id: 'warning', label: 'Warning', color: 'border-red-500/50 text-red-400' },
                      { id: 'kudos', label: 'Kudos', color: 'border-emerald-500/50 text-emerald-400' },
                      { id: 'checkin', label: 'Check-in', color: 'border-purple-500/50 text-purple-400' },
                    ].map(typeOpt => (
                      <button
                        key={typeOpt.id}
                        type="button"
                        onClick={() => setFeedbackType(typeOpt.id as FeedbackType)}
                        className={`py-1.5 text-[11px] font-semibold rounded-md border text-center transition-all ${
                          feedbackType === typeOpt.id
                            ? `bg-slate-800 ${typeOpt.color} shadow-sm ring-1 ring-blue-500`
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        {typeOpt.label}
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Honest & Direct Feedback Message</label>
                    <textarea
                      rows={3}
                      placeholder="Provide honest, constructive observations on their cognitive load, session pacing, or scheduling blind spots..."
                      value={feedbackMessage}
                      onChange={(e) => setFeedbackMessage(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSending || !feedbackTitle || !feedbackMessage}
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {isSending ? 'Transmitting to Member...' : 'Send Live Feedback to Member'}
                  </button>

                  {feedbackSuccess && (
                    <div className="p-2 bg-emerald-500/20 border border-emerald-500/40 rounded-lg text-emerald-400 text-xs text-center font-semibold animate-fadeIn">
                      Feedback successfully delivered to member's dashboard!
                    </div>
                  )}
                </form>
              </div>

              {/* Past Coaching Feedback History */}
              <div className="p-5 flex-1">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Past Feedback Delivered ({memberFeedback.length})
                </h4>

                {memberFeedback.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No previous feedback logged for this member.</p>
                ) : (
                  <div className="space-y-2.5">
                    {memberFeedback.map(fb => (
                      <div key={fb.id} className="p-3 bg-slate-950 border border-slate-800/80 rounded-lg text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`font-bold ${
                            fb.type === 'warning' ? 'text-red-400' :
                            fb.type === 'kudos' ? 'text-emerald-400' :
                            fb.type === 'checkin' ? 'text-purple-400' : 'text-blue-400'
                          }`}>
                            {fb.title}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(fb.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-slate-300 text-[11px] leading-relaxed">{fb.message}</p>
                        <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                          <span>Coach: {fb.adminEmail}</span>
                          <span className={fb.read ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-medium'}>
                            {fb.read ? 'Acknowledged by Member' : 'Pending Read'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
};
