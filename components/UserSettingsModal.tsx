import React, { useEffect, useState } from 'react';
import { 
  User, 
  X, 
  ShieldCheck, 
  Flame, 
  Clock, 
  Sparkles, 
  Award, 
  Trophy,
  Cloud, 
  CloudCheck, 
  LogIn, 
  LogOut, 
  Check, 
  Edit3, 
  Download, 
  RefreshCw, 
  Target, 
  Layers, 
  Zap, 
  Lock,
  Compass,
  CheckCircle2,
  AlertCircle,
  Palette,
  Mail,
  Send,
  Trash2
} from 'lucide-react';
import { UserStats, Achievement, EmailDigestSettings, UiThemeId } from '../types';
import { ACHIEVEMENTS, UNLOCKABLE_THEMES } from '../constants';
import { signInWithGoogleAndGmail, signOutGoogle } from '../services/firebase';
import { User as FirebaseUser } from 'firebase/auth';
import { syncUserProfile } from '../services/cohortService';
import { ThemeToggle, ThemeMode } from './ThemeToggle';
import { GoogleSignInButton } from './GoogleSignInButton';
import { DEFAULT_EMAIL_DIGEST_SETTINGS } from '../services/gmailService';

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: UserStats;
  authUser: FirebaseUser | null;
  onUpdateDisplayName: (newName: string) => Promise<void>;
  onRecalibrateAssessment: () => void;
  onUpdateDigestSettings?: (settings: Partial<EmailDigestSettings>) => void;
  onOpenGmailDigest?: () => void;
  theme?: ThemeMode;
  onChangeTheme?: (next: ThemeMode) => void;
  activeUiTheme?: UiThemeId;
  onSelectUiTheme?: (themeId: UiThemeId) => void;
  onResetProgress?: () => Promise<void> | void;
  initialTab?: 'profile' | 'badges' | 'account';
}

export const UserSettingsModal: React.FC<UserSettingsModalProps> = ({
  isOpen,
  onClose,
  stats,
  authUser,
  onUpdateDisplayName,
  onRecalibrateAssessment,
  onUpdateDigestSettings,
  onOpenGmailDigest,
  theme = 'light',
  onChangeTheme,
  activeUiTheme = 'default',
  onSelectUiTheme,
  onResetProgress,
  initialTab = 'profile',
}) => {
  const digestSettings: EmailDigestSettings = {
    ...DEFAULT_EMAIL_DIGEST_SETTINGS,
    ...(stats.emailDigestSettings || {}),
  };
  const [activeTab, setActiveTab] = useState<'profile' | 'badges' | 'account'>(initialTab);
  const [badgeFilter, setBadgeFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'streak' | 'focus' | 'plan' | 'goal'>('all');
  const [displayName, setDisplayName] = useState(
    stats.displayName || authUser?.displayName || 'Cognitive Pioneer'
  );
  const [isEditingName, setIsEditingName] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [cloudSyncMsg, setCloudSyncMsg] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResettingProgress, setIsResettingProgress] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const unlockedCount = ACHIEVEMENTS.filter(a => stats.unlockedBadgeIds.includes(a.id)).length;
  const progressPercent = Math.round((unlockedCount / ACHIEVEMENTS.length) * 100);

  const handleSaveName = async () => {
    if (!displayName.trim()) return;
    setIsSavingName(true);
    try {
      await onUpdateDisplayName(displayName.trim());
      setIsEditingName(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update display name:', err);
    } finally {
      setIsSavingName(false);
    }
  };

  const handleLinkFirebase = async () => {
    setIsLinking(true);
    setCloudSyncMsg(null);
    try {
      await signInWithGoogleAndGmail();
      setCloudSyncMsg('Google Account & Gmail Daily Digest connected!');
      setTimeout(() => setCloudSyncMsg(null), 4000);
    } catch (err: any) {
      console.error('Firebase link error:', err);
      setCloudSyncMsg('Connection could not be completed. Please try again.');
    } finally {
      setIsLinking(false);
    }
  };

  const handleSignOutFirebase = async () => {
    try {
      await signOutGoogle();
      setCloudSyncMsg('Signed out of Google & Firebase Cloud Sync.');
      setTimeout(() => setCloudSyncMsg(null), 3000);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const handleExportData = () => {
    const exportPayload = {
      profile: stats.neuralProfile,
      displayName,
      currentStreak: stats.currentStreak,
      highestStreak: stats.highestStreak,
      totalFocusMinutes: stats.totalFocusMinutes,
      totalPlansGenerated: stats.totalPlansGenerated,
      goalHistory: stats.goalHistory || [],
      unlockedBadges: ACHIEVEMENTS.filter(a => stats.unlockedBadgeIds.includes(a.id)).map(a => a.name),
      exportedAt: new Date().toISOString()
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `neuralplan_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const getBadgeProgress = (ach: Achievement) => {
    const isUnlocked = stats.unlockedBadgeIds.includes(ach.id);

    let unit = 'pts';
    let current = 0;
    if (ach.category === 'streak') {
      unit = 'days';
      current = Math.max(stats.currentStreak || 0, stats.highestStreak || 0);
    } else if (ach.category === 'focus') {
      unit = ach.id === 'zen_master_5000' ? 'Zen pts' : 'mins';
      current = stats.totalFocusMinutes || 0;
    } else if (ach.category === 'plan') {
      unit = ach.requirement === 1 ? 'plan' : 'plans';
      current = stats.totalPlansGenerated || 0;
    } else if (ach.category === 'goal') {
      unit = ach.id === 'zen_weekly_champion' ? 'win' : 'goals';
      current = (stats.goalHistory || []).filter(g => g.status === 'completed').length;
    }

    if (isUnlocked) {
      return { current: ach.requirement, max: ach.requirement, percent: 100, unit };
    }

    const percent = Math.min(100, Math.round((current / ach.requirement) * 100));
    return { current: Math.min(current, ach.requirement), max: ach.requirement, percent, unit };
  };

  const filteredBadges = ACHIEVEMENTS.filter(ach => {
    const isUnlocked = stats.unlockedBadgeIds.includes(ach.id);
    if (badgeFilter === 'unlocked' && !isUnlocked) return false;
    if (badgeFilter === 'locked' && isUnlocked) return false;
    if (categoryFilter !== 'all' && ach.category !== categoryFilter) return false;
    return true;
  });

  const tierBreakdown = (['bronze', 'silver', 'gold', 'diamond'] as const).map(tier => {
    const inTier = ACHIEVEMENTS.filter(a => (a.tier || 'bronze') === tier);
    const earnedInTier = inTier.filter(a => stats.unlockedBadgeIds.includes(a.id)).length;
    return { tier, earned: earnedInTier, total: inTier.length };
  });

  const getTierTextClass = (tier?: string) => {
    switch (tier) {
      case 'diamond': return 'text-cyan-700 dark:text-cyan-300';
      case 'gold': return 'text-amber-700 dark:text-amber-300';
      case 'silver': return 'text-slate-600 dark:text-slate-300';
      default: return 'text-amber-800 dark:text-amber-400';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/45 dark:bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 overflow-y-auto font-sans">
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

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            {/* User Avatar */}
            <div className="relative group">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 p-1 shadow-xl flex items-center justify-center overflow-hidden">
                {authUser?.photoURL ? (
                  <img src={authUser.photoURL} alt="Avatar" className="w-full h-full rounded-xl object-cover" />
                ) : (
                  <div className="w-full h-full rounded-xl bg-slate-900/90 dark:bg-slate-950/80 flex items-center justify-center text-2xl font-black text-white">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 p-1 bg-white dark:bg-slate-900 rounded-lg border border-sky-900/15 dark:border-slate-700 shadow-sm">
                {authUser ? (
                  <div className="w-3 h-3 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" title="Firebase Linked" />
                ) : (
                  <div className="w-3 h-3 rounded-full bg-amber-500 dark:bg-amber-400" title="Local Guest Session" />
                )}
              </div>
            </div>

            {/* User Details */}
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {displayName}
                </h2>
                {authUser ? (
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <CloudCheck className="w-3 h-3" />
                    Cloud Sync Active
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-[#EEF7FA] dark:bg-slate-800 border border-sky-900/10 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    Guest Mode
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-slate-500 dark:text-slate-400 mb-3 tabular-nums">
                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                  <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500 dark:fill-amber-400 dark:text-amber-400" />
                  {stats.currentStreak} Day Streak
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-blue-600 dark:text-blue-300 font-bold">
                  <Clock className="w-3.5 h-3.5" />
                  {stats.totalFocusMinutes} Mins Focused
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-indigo-600 dark:text-purple-300 font-bold">
                  <Award className="w-3.5 h-3.5" />
                  {unlockedCount} / {ACHIEVEMENTS.length} Badges
                </span>
              </div>

              {stats.neuralProfile && (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-[#EEF7FA] dark:bg-slate-800/80 border border-sky-900/10 dark:border-white/5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Archetype: <strong className="text-slate-900 dark:text-white">{stats.neuralProfile.primaryType}</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 mt-6 pt-4 border-t border-sky-900/10 dark:border-slate-800/80 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`flex-1 py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap shrink-0 ${
                activeTab === 'profile'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-sky-100/60 dark:hover:bg-slate-800/50'
              }`}
            >
              <User className="w-4 h-4 shrink-0" />
              <span>Profile</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('badges')}
              className={`flex-1 py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 tabular-nums whitespace-nowrap shrink-0 ${
                activeTab === 'badges'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-sky-100/60 dark:hover:bg-slate-800/50'
              }`}
            >
              <Trophy className="w-4 h-4 shrink-0" />
              <span>Achievement Hall ({unlockedCount}/{ACHIEVEMENTS.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('account')}
              className={`flex-1 py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap shrink-0 ${
                activeTab === 'account'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-sky-100/60 dark:hover:bg-slate-800/50'
              }`}
            >
              <Cloud className="w-4 h-4 shrink-0" />
              <span>Firebase Account</span>
            </button>
          </div>
        </div>

        {/* Tab Contents */}
        <div className="p-6 md:p-8 max-h-[60vh] overflow-y-auto space-y-6">
          {/* TAB 1: Profile & Identity */}
          {activeTab === 'profile' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Appearance Mode & Unlocked Theme Presets */}
              {onChangeTheme && (
                <div className="bg-[#F2F9FC] dark:bg-slate-950/50 border border-sky-900/10 dark:border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Palette className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        Workspace Appearance
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                        Switch between Light and Dark mode, or equip milestone-unlocked UI themes.
                      </p>
                    </div>
                    <ThemeToggle theme={theme} onChangeTheme={onChangeTheme} />
                  </div>

                  {onSelectUiTheme && (
                    <div className="pt-3 border-t border-sky-900/10 dark:border-slate-800/80 flex flex-wrap gap-2">
                      {UNLOCKABLE_THEMES.map((preset) => {
                        const unlocked =
                          !preset.unlockAchievementId ||
                          stats.unlockedBadgeIds.includes(preset.unlockAchievementId);
                        const isSelected = activeUiTheme === preset.id;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            disabled={!unlocked}
                            onClick={() => onSelectUiTheme(preset.id)}
                            title={
                              unlocked
                                ? preset.name
                                : `Locked — unlock at ${preset.unlockRequirementLabel}`
                            }
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-2 ${
                              isSelected
                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                : unlocked
                                  ? 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-sky-900/15 dark:border-slate-700 hover:border-blue-400'
                                  : 'bg-white/50 dark:bg-slate-900/40 text-slate-400 dark:text-slate-500 border-sky-900/10 dark:border-slate-800 cursor-not-allowed opacity-70'
                            }`}
                          >
                            <span
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: preset.swatches[0] }}
                            />
                            <span>{preset.name}</span>
                            {!unlocked && <Lock className="w-3 h-3" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Display Name Section */}
              <div className="bg-[#F2F9FC] dark:bg-slate-950/50 border border-sky-900/10 dark:border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      Display Name
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      Your identity visible in focus containment logs and coach telemetry.
                    </p>
                  </div>
                  {!isEditingName && (
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="px-3 py-1.5 rounded-lg bg-white hover:bg-sky-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-sky-900/10 dark:border-transparent text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit
                    </button>
                  )}
                </div>

                {isEditingName ? (
                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <input
                      type="text"
                      value={displayName}
                      maxLength={30}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Enter your name"
                      className="flex-1 bg-white dark:bg-slate-900 border border-blue-500/50 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSaveName}
                        disabled={isSavingName || !displayName.trim()}
                        className="flex-1 sm:flex-none px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md"
                      >
                        {isSavingName ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setDisplayName(stats.displayName || authUser?.displayName || 'Cognitive Pioneer');
                          setIsEditingName(false);
                        }}
                        className="px-3 py-2.5 bg-[#EEF7FA] hover:bg-sky-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-base font-bold text-slate-900 dark:text-white pt-1 flex items-center gap-2">
                    <span>{displayName}</span>
                    {saveSuccess && (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 animate-in fade-in">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Saved
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Cognitive Archetype Card */}
              <div className="bg-[#F2F9FC] dark:bg-slate-950/50 border border-sky-900/10 dark:border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Compass className="w-4 h-4 text-indigo-600 dark:text-purple-400" />
                    Cognitive Phenotype Diagnostic
                  </h3>
                  <button
                    onClick={() => {
                      onClose();
                      onRecalibrateAssessment();
                    }}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1.5 transition-colors px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20"
                    title="Restart your cognitive diagnostic to recalibrate your archetype"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Re-diagnose Assessment
                  </button>
                </div>

                {stats.neuralProfile ? (
                  <div className="space-y-3">
                    <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                      <div className="text-xs font-black uppercase tracking-wider text-indigo-700 dark:text-purple-300 mb-1">
                        Primary Archetype
                      </div>
                      <div className="text-lg font-black text-slate-900 dark:text-white">
                        {stats.neuralProfile.primaryType}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-300 mt-2">
                        Context Domain: <strong className="capitalize text-slate-900 dark:text-white">{stats.neuralProfile.context}</strong>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Attuned Traits
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {stats.neuralProfile.traits.map((trait, idx) => (
                          <div key={idx} className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-sky-900/10 dark:border-white/5 text-xs text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 shrink-0" />
                            {trait}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-xs text-slate-500 dark:text-slate-400">
                    No archetype calibrated yet.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Dedicated Achievement Hall */}
          {activeTab === 'badges' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Achievement Hall Summary & Tier Breakdown */}
              <div className="bg-[#F2F9FC] dark:bg-slate-950/50 border border-sky-900/10 dark:border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-amber-500" />
                      <span>Achievement Hall</span>
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      Track progress across all {ACHIEVEMENTS.length} milestones and unlockable UI themes.
                    </p>
                  </div>
                  <div className="text-xs font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                    {unlockedCount} / {ACHIEVEMENTS.length} Unlocked ({progressPercent}%)
                  </div>
                </div>

                <div className="w-full h-2.5 bg-sky-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 transition-all duration-700 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                {/* Tier Mastery Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {tierBreakdown.map(({ tier, earned, total }) => (
                    <div
                      key={tier}
                      className="px-3 py-2 rounded-xl bg-white/85 dark:bg-slate-900/70 border border-sky-900/10 dark:border-slate-800 flex items-center justify-between"
                    >
                      <span className={`text-[11px] font-bold capitalize ${getTierTextClass(tier)}`}>
                        {tier}
                      </span>
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white tabular-nums">
                        {earned}/{total}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Status & Category Filter Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-sky-900/10 dark:border-slate-800/80">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(['all', 'unlocked', 'locked'] as const).map((filter) => (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => setBadgeFilter(filter)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all whitespace-nowrap ${
                          badgeFilter === filter
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-slate-800'
                        }`}
                      >
                        {filter === 'locked' ? 'In Progress' : filter}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(
                      [
                        { id: 'all', label: 'All Types' },
                        { id: 'streak', label: 'Streak' },
                        { id: 'focus', label: 'Focus' },
                        { id: 'plan', label: 'Protocols' },
                        { id: 'goal', label: 'Goals' },
                      ] as const
                    ).map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategoryFilter(cat.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
                          categoryFilter === cat.id
                            ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-slate-800'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* All Potential Badges Grid */}
              {filteredBadges.length === 0 ? (
                <div className="p-8 rounded-2xl bg-[#F2F9FC] dark:bg-slate-950/50 border border-sky-900/10 dark:border-slate-800 text-center space-y-2">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    No badges match your current filter.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setBadgeFilter('all');
                      setCategoryFilter('all');
                    }}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Show all {ACHIEVEMENTS.length} badges
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {filteredBadges.map((ach) => {
                    const isUnlocked = stats.unlockedBadgeIds.includes(ach.id);
                    const progress = getBadgeProgress(ach);
                    const tierTextClass = getTierTextClass(ach.tier);
                    const rewardTheme = UNLOCKABLE_THEMES.find(
                      (t) => t.unlockAchievementId === ach.id
                    );
                    const isRewardEquipped = rewardTheme && activeUiTheme === rewardTheme.id;

                    return (
                      <div
                        key={ach.id}
                        className={`p-4 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between gap-3 ${
                          isUnlocked
                            ? 'bg-white dark:bg-slate-900/90 border-blue-500/35 shadow-lg shadow-blue-500/5'
                            : 'bg-[#F4FAFC] dark:bg-slate-950/40 border-sky-900/10 dark:border-slate-800/80'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3 mb-2.5">
                            <div
                              className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl border shrink-0 ${
                                isUnlocked
                                  ? 'bg-[#EEF7FA] dark:bg-slate-800 shadow-sm border-sky-900/10 dark:border-white/10'
                                  : 'bg-sky-50 dark:bg-slate-900 border-sky-900/10 dark:border-slate-800 text-slate-400 dark:text-slate-600 grayscale'
                              }`}
                            >
                              {ach.icon}
                            </div>

                            <div className="flex items-center gap-2 text-[11px] font-semibold">
                              <span className={`capitalize ${tierTextClass}`}>
                                {ach.tier || 'Bronze'}
                              </span>
                              <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
                              {isUnlocked ? (
                                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Unlocked</span>
                                </span>
                              ) : (
                                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                  <Lock className="w-3 h-3" />
                                  <span>Locked</span>
                                </span>
                              )}
                            </div>
                          </div>

                          <h4
                            className={`text-sm font-bold leading-tight mb-1 ${
                              isUnlocked
                                ? 'text-slate-900 dark:text-white'
                                : 'text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {ach.name}
                          </h4>
                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                            {ach.description}
                          </p>

                          {rewardTheme && (
                            <div className="mt-2.5 pt-2 border-t border-sky-900/10 dark:border-white/5 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="flex items-center -space-x-1 shrink-0">
                                  {rewardTheme.swatches.map((hex, i) => (
                                    <span
                                      key={i}
                                      className="w-3 h-3 rounded-full border border-white dark:border-slate-900"
                                      style={{ backgroundColor: hex }}
                                    />
                                  ))}
                                </div>
                                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 truncate">
                                  Reward: {rewardTheme.name}
                                </span>
                              </div>

                              {isUnlocked && onSelectUiTheme && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onSelectUiTheme(isRewardEquipped ? 'default' : rewardTheme.id)
                                  }
                                  className={`text-[11px] font-bold whitespace-nowrap shrink-0 ${
                                    isRewardEquipped
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : 'text-blue-600 dark:text-blue-400 hover:underline'
                                  }`}
                                >
                                  {isRewardEquipped ? 'Equipped' : 'Equip Theme'}
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Progress bar */}
                        <div className="pt-2 border-t border-sky-900/10 dark:border-white/5">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 tabular-nums">
                            <span>{isUnlocked ? 'Completed' : `${progress.percent}% complete`}</span>
                            <span className="font-mono text-slate-700 dark:text-slate-300">
                              {progress.current.toLocaleString()} / {progress.max.toLocaleString()} {progress.unit}
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-sky-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isUnlocked ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-blue-600 dark:bg-blue-500'
                              }`}
                              style={{ width: `${progress.percent}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Firebase Account Management */}
          {activeTab === 'account' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {cloudSyncMsg && (
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs font-semibold text-blue-800 dark:text-blue-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  {cloudSyncMsg}
                </div>
              )}

              {/* Firebase Cloud Sync Status Card */}
              <div className="bg-[#F2F9FC] dark:bg-slate-950/50 border border-sky-900/10 dark:border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400">
                      <Cloud className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Firebase Cloud Synchronization
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Persistent cross-device telemetry & coach supervision.
                      </p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border shrink-0 ${
                    authUser 
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' 
                      : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${authUser ? 'bg-emerald-500 dark:bg-emerald-400 animate-pulse' : 'bg-amber-500 dark:bg-amber-400'}`} />
                    {authUser ? 'Connected' : 'Offline / Local'}
                  </span>
                </div>

                {authUser ? (
                  <div className="space-y-3 pt-2">
                    <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-sky-900/10 dark:border-white/5 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 dark:text-slate-400">Linked Account</span>
                        <span className="font-bold text-slate-900 dark:text-white">{authUser.email}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 dark:text-slate-400">Authentication Provider</span>
                        <span className="font-mono text-slate-700 dark:text-slate-300">google.com</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 dark:text-slate-400">User ID</span>
                        <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[200px]">{authUser.uid}</span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 pt-2">
                      <button
                        onClick={async () => {
                          if (authUser) {
                            await syncUserProfile({
                              id: authUser.uid,
                              displayName,
                              currentStreak: stats.currentStreak,
                              totalFocusMinutes: stats.totalFocusMinutes
                            });
                            setCloudSyncMsg('Cloud synchronization completed successfully.');
                            setTimeout(() => setCloudSyncMsg(null), 3000);
                          }
                        }}
                        className="flex-1 py-3 px-4 bg-white hover:bg-sky-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-sky-900/10 dark:border-transparent text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Sync Telemetry Now
                      </button>
                      <button
                        onClick={handleSignOutFirebase}
                        className="py-3 px-4 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Disconnect
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 pt-2">
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Sign in with Google to sync your streaks, focus history, and earned badges across devices—and unlock daily focus tips &amp; progress digests sent straight to your Gmail inbox.
                    </p>

                    <GoogleSignInButton
                      onClick={handleLinkFirebase}
                      loading={isLinking}
                      label="Sign in with Google"
                      className="w-full py-3.5"
                    />
                  </div>
                )}
              </div>

              {/* Daily Gmail Digest Settings Card */}
              <div className="bg-[#F2F9FC] dark:bg-slate-950/50 border border-sky-900/10 dark:border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        Daily Gmail Updates &amp; Focus Tips
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Get your daily streak progress, tailored tips, and adapted protocol sent to your inbox.
                      </p>
                    </div>
                  </div>
                  {authUser && onUpdateDigestSettings && (
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={digestSettings.enabled}
                        onChange={(e) => onUpdateDigestSettings({ enabled: e.target.checked })}
                      />
                      <div className="w-9 h-5 bg-slate-300 dark:bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                    </label>
                  )}
                </div>

                {authUser && (
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-sky-900/10 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                      <span>Preferred time:</span>
                      {onUpdateDigestSettings ? (
                        <input
                          type="time"
                          value={digestSettings.preferredTime}
                          onChange={(e) => onUpdateDigestSettings({ preferredTime: e.target.value })}
                          className="bg-white dark:bg-slate-900 border border-sky-900/15 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-semibold text-slate-900 dark:text-white"
                        />
                      ) : (
                        <span className="font-semibold text-slate-900 dark:text-white">{digestSettings.preferredTime}</span>
                      )}
                    </div>
                    {onOpenGmailDigest && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenGmailDigest();
                        }}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Preview &amp; Send Digest
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Data Export & Backup Card */}
              <div className="bg-[#F2F9FC] dark:bg-slate-950/50 border border-sky-900/10 dark:border-slate-800 rounded-2xl p-5 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    Export Local Telemetry
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                    Download a full JSON archive of your badges, streaks, and focus metrics.
                  </p>
                </div>
                <button
                  onClick={handleExportData}
                  className="px-4 py-2 bg-white hover:bg-sky-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-sky-900/10 dark:border-transparent text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export JSON
                </button>
              </div>

              {/* Clear Test Data & Reset Progress Card */}
              {onResetProgress && (
                <div className="bg-red-50/70 dark:bg-red-950/20 border border-red-200/80 dark:border-red-500/25 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Trash2 className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                      Clear Test Data &amp; Reset Progress
                    </h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                      Zeroes out streaks, milestones, badges, focus minutes, and goals{authUser ? ' across both this browser and your Google cloud profile' : ' in this browser'}. Keeps your cognitive profile.
                    </p>
                  </div>

                  {!showResetConfirm ? (
                    <button
                      type="button"
                      onClick={() => setShowResetConfirm(true)}
                      className="px-4 py-2 bg-white hover:bg-red-50 dark:bg-slate-900 dark:hover:bg-red-950/60 border border-red-300/80 dark:border-red-500/35 text-red-700 dark:text-red-300 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shrink-0 whitespace-nowrap"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Reset to 0
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={isResettingProgress}
                        onClick={async () => {
                          setIsResettingProgress(true);
                          try {
                            await onResetProgress();
                            setShowResetConfirm(false);
                            setCloudSyncMsg('All streaks, milestones, focus minutes, goals, and badges have been reset to 0.');
                            setTimeout(() => setCloudSyncMsg(null), 5000);
                          } finally {
                            setIsResettingProgress(false);
                          }
                        }}
                        className="px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50 whitespace-nowrap"
                      >
                        {isResettingProgress ? 'Clearing...' : 'Confirm Reset'}
                      </button>
                      <button
                        type="button"
                        disabled={isResettingProgress}
                        onClick={() => setShowResetConfirm(false)}
                        className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 bg-[#F2F9FC] dark:bg-slate-950/70 border-t border-sky-900/10 dark:border-slate-800 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            NeuralPlan Engine v2.4 • Client Secure Store
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
