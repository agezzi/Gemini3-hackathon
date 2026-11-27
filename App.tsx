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
  ShieldAlert,
  Play,
  CalendarDays,
  ChevronRight,
  Bell,
  RotateCcw,
  Users,
  LogIn,
  LogOut,
  User as UserIcon,
  Mail,
  HelpCircle
} from 'lucide-react';
import { onAuthStateChanged, updateProfile, User } from 'firebase/auth';
import { auth, signInWithGoogleAndGmail, signOutGoogle } from './services/firebase';
import { 
  syncUserProfile, 
  subscribeToUserProfile,
  saveDailyPlanToCloud, 
  subscribeToFeedback, 
  resetUserProgressInCloud,
  isUserAdmin,
  ADMIN_EMAIL 
} from './services/cohortService';
import { InputSection } from './components/InputSection';
import { ResultCard } from './components/ResultCard';
import { StatsPanel } from './components/StatsPanel';
import { Onboarding } from './components/Onboarding';
import { NeuralChat } from './components/NeuralChat';
import { FocusLock } from './components/FocusLock';
import { SplashScreen } from './components/SplashScreen';
import { AdminCMS } from './components/AdminCMS';
import { MemberFeedbackBanner } from './components/MemberFeedbackBanner';
import { UserSettingsModal } from './components/UserSettingsModal';
import { AnalysisSkeleton } from './components/AnalysisSkeleton';
import { ZenMode } from './components/ZenMode';
import { NeuralPlanXRPortal } from './components/xr/NeuralPlanXRPortal';
import { VrHeadsetIcon } from './components/xr/VrHeadsetIcon';
import { ThemeMode, ThemeToggle } from './components/ThemeToggle';
import { GmailDigestModal } from './components/GmailDigestModal';
import { GoogleSignInButton } from './components/GoogleSignInButton';
import { MilestoneTracker } from './components/MilestoneTracker';
import { GuidedTour, TourStep } from './components/GuidedTour';
import { ReadingSupportPopover } from './components/ReadingSupportPopover';
import { ReadingRulerOverlay } from './components/ReadingRulerOverlay';
import { VoiceDictationButton } from './components/VoiceDictationButton';
import { SoundscapeGuideModal } from './components/SoundscapeGuideModal';
import { soundscapeEngine, SOUNDSCAPE_OPTIONS, SoundscapePlaybackState } from './services/soundscapeEngine';
import { DEFAULT_EMAIL_DIGEST_SETTINGS } from './services/gmailService';
import {
  DEFAULT_READING_PREFERENCES,
  READING_TINT_CANVAS,
  applyReadingPreferencesToDom,
  parseVoiceCalibration,
} from './services/speechService';
import { analyzeBehavior, getClientFallbackProfile } from './services/geminiService';
import { AppState, UserStats, NeuralProfile, CoachFeedbackItem, GoalRecord, EmailDigestSettings, UiThemeId, ReadingPreferences } from './types';
import { ACHIEVEMENTS, UNLOCKABLE_THEMES } from './constants';

const THEME_STORAGE_KEY = 'neuralplan_theme';

const LOCAL_STORAGE_KEY = 'neuralplan_v12_stable';
export const ONBOARDING_COMPLETED_KEY = 'neuralplan_onboarded_completed_v12';
const WALKTHROUGH_COMPLETED_KEY = 'neuralplan_walkthrough_completed_v1';
const LEGACY_TEST_CLEANUP_KEY = 'neuralplan_legacy_test_cleanup_v1';
const PENDING_CLOUD_RESET_KEY = 'neuralplan_pending_cloud_reset_v1';

const clearStaleLocalTestStorage = (): void => {
  try {
    [
      'neuralplan_zen_local_scores_v1',
      'neuralplan_zen_weekly_winners_v1',
      'neuralplan_xr_last_report_v1',
    ].forEach((key) => localStorage.removeItem(key));
  } catch {
    // Ignore storage errors
  }
};

const buildCleanZeroStats = (base?: Partial<UserStats>): UserStats => ({
  displayName: base?.displayName,
  currentStreak: 0,
  highestStreak: 0,
  totalPlansGenerated: 0,
  totalFocusMinutes: 0,
  dailyFocusMinutes: {},
  dismissedRecoveryAlertDate: null,
  lastUsedDate: null,
  lastMeaningfulActionLabel: null,
  unlockedBadgeIds: [],
  neuralProfile: base?.neuralProfile ?? null,
  hasCompletedOnboarding: base?.hasCompletedOnboarding ?? false,
  entryTimeHistory: [],
  mainGoal: null,
  goalHistory: [],
  reminderSettings: {
    enabled: base?.reminderSettings?.enabled ?? false,
    time: base?.reminderSettings?.time ?? '09:00',
    lastNotifiedDate: null,
  },
  emailDigestSettings: {
    ...DEFAULT_EMAIL_DIGEST_SETTINGS,
    ...(base?.emailDigestSettings || {}),
  },
  activeUiTheme: 'default',
  readingPreferences: {
    ...DEFAULT_READING_PREFERENCES,
    ...(base?.readingPreferences || {}),
  },
});

const WORKSPACE_TOUR_STEPS: TourStep[] = [
  {
    id: 'calibration',
    targetSelector: '[data-tour="calibration-panel"]',
    sectionLabel: 'Planning Input',
    title: 'Behavioral Calibration',
    description:
      'Start each day here. Log how your focus and energy went under Behavioral History, then list your priorities in Target Objectives.',
    preferredPlacement: 'bottom',
  },
  {
    id: 'analyze-btn',
    targetSelector: '[data-tour="analyze-trigger"]',
    sectionLabel: 'Primary Action',
    title: 'Analyze & Adapt',
    description:
      'Click this trigger to generate your tailored daily protocol, behavioral insights, and quick wins calibrated to your cognitive archetype. Generating a protocol also counts toward today’s streak.',
    preferredPlacement: 'top',
  },
  {
    id: 'focus-lock',
    targetSelector: '[data-tour="focus-lock-panel"]',
    sectionLabel: 'Deep Work Container',
    title: 'Time Lock & Soundscapes',
    description:
      'Select distraction targets, pick a dynamic soundscape (Rainfall, Beach Waves, or Alpha/Theta Pulses), and press Initiate Lock. Your timer syncs to the wall clock so you can lock your phone screen and work away safely.',
    preferredPlacement: 'left',
  },
  {
    id: 'stats-metrics',
    targetSelector: '[data-tour="stats-panel"]',
    sectionLabel: 'Progress & Recovery',
    title: 'Neural Metrics & Streaks',
    description:
      'Monitors your archetype scores, daily focus load (with recovery alerts after 6+ hour days), active objectives, and today’s Streak Status—completed by finishing a Focus Lock, Protocol, Goal, or Zen/XR session.',
    preferredPlacement: 'right',
  },
  {
    id: 'milestones',
    targetSelector: '[data-tour="milestone-tracker"]',
    sectionLabel: 'Rewards & Themes',
    title: 'Milestone Map',
    description:
      'Track your journey toward streak, focus-minute, and goal milestones. Each unlocked tier celebrates your achievement and unlocks new visual themes for your workspace.',
    preferredPlacement: 'top',
  },
  {
    id: 'modes',
    targetSelector: '[data-tour="modes-nav"]',
    sectionLabel: 'Focus & Reset Modes',
    title: 'NeuralPlan XR & Zen Focus',
    description:
      'Open NeuralPlan XR for an interactive attention simulation, or enter Zen Focus for guided breathing and mindfulness resets—both count as meaningful focus activity.',
    preferredPlacement: 'bottom',
  },
  {
    id: 'account',
    targetSelector: '[data-tour="account-nav"]',
    sectionLabel: 'Account & Digest',
    title: 'Profile, Badges & Gmail Sync',
    description:
      'Open your Profile anytime to browse all badges in the Achievement Hall or equip themes, and sign in with Google to receive daily progress recaps and focus tips in Gmail.',
    preferredPlacement: 'bottom',
  },
];

const isDirectAdminUrl = (): boolean => {
  if (typeof window === 'undefined') return false;
  const p = window.location.pathname.toLowerCase();
  const h = window.location.hash.toLowerCase();
  const s = window.location.search.toLowerCase();
  return p === '/admin' || p.startsWith('/admin') || h === '#/admin' || h === '#admin' || s.includes('admin=true');
};

const getDayDiff = (fromDateStr: string, toDateStr: string): number => {
  const fromMs = Date.parse(`${fromDateStr}T00:00:00Z`);
  const toMs = Date.parse(`${toDateStr}T00:00:00Z`);
  if (Number.isNaN(fromMs) || Number.isNaN(toMs)) return 0;
  return Math.round((toMs - fromMs) / (1000 * 60 * 60 * 24));
};

const applyMeaningfulActivity = (prevStats: UserStats, actionLabel: string): UserStats => {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const lastDateStr = prevStats.lastUsedDate;

  let nextStreak = prevStats.currentStreak || 0;
  if (lastDateStr === todayStr) {
    nextStreak = Math.max(1, nextStreak);
  } else if (lastDateStr) {
    const diffDays = getDayDiff(lastDateStr, todayStr);
    nextStreak = diffDays === 1 ? nextStreak + 1 : 1;
  } else {
    // Day 1 initialization: first meaningful focus action starts Day 1 immediately
    nextStreak = 1;
  }

  const nextHighest = Math.max(nextStreak, prevStats.highestStreak || 0);
  const prevHistory = prevStats.entryTimeHistory || [];
  const todayEntryCount = prevHistory.filter((iso) => iso.startsWith(todayStr)).length;
  const nextHistory =
    todayEntryCount < 5 ? [...prevHistory, now.toISOString()].slice(-30) : prevHistory;

  const unlocked = new Set(prevStats.unlockedBadgeIds || []);
  ACHIEVEMENTS.forEach((ach) => {
    if ((ach.category === 'streak' || !ach.category) && nextStreak >= ach.requirement) {
      unlocked.add(ach.id);
    }
  });

  return {
    ...prevStats,
    currentStreak: nextStreak,
    highestStreak: nextHighest,
    lastUsedDate: todayStr,
    lastMeaningfulActionLabel: actionLabel,
    entryTimeHistory: nextHistory,
    unlockedBadgeIds: Array.from(unlocked),
  };
};

const App: React.FC = () => {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      return localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });
  const [showSplash, setShowSplash] = useState<boolean>(() => !isDirectAdminUrl());
  const [isSyncing, setIsSyncing] = useState(false);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [showAdminCMS, setShowAdminCMS] = useState<boolean>(() => isDirectAdminUrl());
  const [showUserSettings, setShowUserSettings] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'profile' | 'badges' | 'account'>('profile');
  const [userFeedback, setUserFeedback] = useState<CoachFeedbackItem[]>([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [isRediagnosing, setIsRediagnosing] = useState(false);
  const [showZenMode, setShowZenMode] = useState(false);
  const [showXRMode, setShowXRMode] = useState(false);
  const [showGmailDigest, setShowGmailDigest] = useState(false);
  const [dismissedDigestBannerDate, setDismissedDigestBannerDate] = useState<string | null>(null);
  const [showGuidedTour, setShowGuidedTour] = useState(false);
  const [showReadingPopover, setShowReadingPopover] = useState(false);
  const [isSplittingVoice, setIsSplittingVoice] = useState(false);
  const [voiceSplitNotice, setVoiceSplitNotice] = useState<string | null>(null);
  const [globalSoundState, setGlobalSoundState] = useState<SoundscapePlaybackState>(() =>
    soundscapeEngine.getPlaybackState()
  );
  const [showGlobalSoundGuide, setShowGlobalSoundGuide] = useState(false);

  useEffect(() => {
    return soundscapeEngine.subscribeState(setGlobalSoundState);
  }, []);

  const handleCloseTour = () => {
    setShowGuidedTour(false);
    try {
      localStorage.setItem(WALKTHROUGH_COMPLETED_KEY, 'true');
    } catch {
      // Ignore storage failures
    }
  };

  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage failures
    }
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const [state, setState] = useState<AppState>(() => {
    const savedStats = localStorage.getItem(LOCAL_STORAGE_KEY);
    const hasCompletedOnboardingStorage = localStorage.getItem(ONBOARDING_COMPLETED_KEY) === 'true';
    let hasDoneLegacyCleanup = false;
    try {
      hasDoneLegacyCleanup = localStorage.getItem(LEGACY_TEST_CLEANUP_KEY) === 'true';
    } catch {
      hasDoneLegacyCleanup = true;
    }
    const now = new Date();

    let initialStats: UserStats;
    let shouldShowOnboarding = false;

    if (savedStats) {
      try {
        const parsed = JSON.parse(savedStats);
        const hasFinished = hasCompletedOnboardingStorage || parsed.hasCompletedOnboarding === true;
        if (!hasDoneLegacyCleanup) {
          clearStaleLocalTestStorage();
          initialStats = buildCleanZeroStats({
            ...parsed,
            hasCompletedOnboarding: hasFinished,
          });
          try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initialStats));
            localStorage.setItem(LEGACY_TEST_CLEANUP_KEY, 'true');
            localStorage.setItem(PENDING_CLOUD_RESET_KEY, 'true');
          } catch {
            // Ignore storage errors
          }
        } else {
          initialStats = {
            ...parsed,
            hasCompletedOnboarding: hasFinished,
            dailyFocusMinutes:
              parsed.dailyFocusMinutes && typeof parsed.dailyFocusMinutes === 'object'
                ? parsed.dailyFocusMinutes
                : {},
            dismissedRecoveryAlertDate: parsed.dismissedRecoveryAlertDate || null,
            mainGoal: parsed.mainGoal || null,
            goalHistory: Array.isArray(parsed.goalHistory) ? parsed.goalHistory : [],
            entryTimeHistory: Array.isArray(parsed.entryTimeHistory) ? parsed.entryTimeHistory : [],
            emailDigestSettings: {
              ...DEFAULT_EMAIL_DIGEST_SETTINGS,
              ...(parsed.emailDigestSettings || {}),
            },
            activeUiTheme: parsed.activeUiTheme || 'default',
            readingPreferences: {
              ...DEFAULT_READING_PREFERENCES,
              ...(parsed.readingPreferences || {}),
            }
          };
        }
        shouldShowOnboarding = !hasFinished;
      } catch (e) {
        shouldShowOnboarding = !hasCompletedOnboardingStorage;
        initialStats = buildCleanZeroStats({
          hasCompletedOnboarding: hasCompletedOnboardingStorage,
        });
      }
    } else {
      // BRAND NEW USER: Clean empty starting state prior to onboarding
      if (!hasDoneLegacyCleanup) {
        clearStaleLocalTestStorage();
        try {
          localStorage.setItem(LEGACY_TEST_CLEANUP_KEY, 'true');
        } catch {
          // Ignore storage errors
        }
      }
      shouldShowOnboarding = !hasCompletedOnboardingStorage;
      initialStats = buildCleanZeroStats({
        hasCompletedOnboarding: hasCompletedOnboardingStorage,
      });
    }

    return {
      history: '',
      nextDayDraft: '',
      isAnalyzing: false,
      isOnboarding: shouldShowOnboarding,
      result: null,
      error: null,
      stats: initialStats,
      focusSession: {
        isActive: false,
        startTime: null,
        durationSeconds: 0,
        remainingSeconds: 0
      },
      showBriefing: !shouldShowOnboarding && !!initialStats.mainGoal && initialStats.lastUsedDate !== now.toISOString().split('T')[0]
    };
  });

  // Auto-launch the guiding walkthrough once for first-time users upon reaching the workspace
  useEffect(() => {
    if (showSplash || state.isOnboarding || state.showBriefing || showAdminCMS || showXRMode || showZenMode) {
      return;
    }
    try {
      if (localStorage.getItem(WALKTHROUGH_COMPLETED_KEY) === 'true') {
        return;
      }
    } catch {
      // Proceed if storage unavailable
    }

    const timer = setTimeout(() => {
      setShowGuidedTour(true);
    }, 450);

    return () => clearTimeout(timer);
  }, [showSplash, state.isOnboarding, state.showBriefing, showAdminCMS, showXRMode, showZenMode]);

  // Track Firebase Authentication State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Admin shortcut (Ctrl+Shift+A or Cmd+Shift+A) to toggle Coach CMS
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        setShowAdminCMS(prev => {
          const next = !prev;
          if (next) {
            window.history.pushState({}, '', '/admin');
          } else {
            window.history.pushState({}, '', '/');
          }
          return next;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Listen to /admin URL path (e.g. neuralplan.com/admin)
  useEffect(() => {
    const checkAdminRoute = () => {
      const pathname = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      const search = window.location.search.toLowerCase();
      if (
        pathname === '/admin' || 
        pathname.startsWith('/admin/') || 
        hash === '#/admin' || 
        hash === '#admin' || 
        search.includes('admin=true')
      ) {
        setShowAdminCMS(true);
      }
    };

    checkAdminRoute();
    window.addEventListener('popstate', checkAdminRoute);
    return () => window.removeEventListener('popstate', checkAdminRoute);
  }, []);

  const handleOpenAdminCMS = () => {
    window.history.pushState({}, '', '/admin');
    setShowAdminCMS(true);
  };

  const handleCloseAdminCMS = () => {
    setShowAdminCMS(false);
    if (window.location.pathname.toLowerCase().startsWith('/admin') || window.location.hash.toLowerCase().includes('admin')) {
      window.history.pushState({}, '', '/');
    }
  };

  // Subscribe to real-time feedback when signed in
  useEffect(() => {
    if (!authUser) {
      setUserFeedback([]);
      return;
    }

    let isCancelled = false;
    let isFlushingPendingCloudReset = false;
    try {
      isFlushingPendingCloudReset = localStorage.getItem(PENDING_CLOUD_RESET_KEY) === 'true';
    } catch {
      isFlushingPendingCloudReset = false;
    }

    if (isFlushingPendingCloudReset) {
      resetUserProgressInCloud(authUser.uid)
        .then(() => {
          if (isCancelled) return;
          try {
            localStorage.removeItem(PENDING_CLOUD_RESET_KEY);
          } catch {
            // Ignore storage errors
          }
          isFlushingPendingCloudReset = false;
        })
        .catch(() => {
          isFlushingPendingCloudReset = false;
        });
    }

    const unsubFeedback = subscribeToFeedback(authUser.uid, (items) => {
      setUserFeedback(items);
    });

    const unsubProfile = subscribeToUserProfile(authUser.uid, (cloudProfile) => {
      if (isFlushingPendingCloudReset) {
        return;
      }
      if (cloudProfile) {
        const cloudHasOnboarded = cloudProfile.hasCompletedOnboarding === true || !!cloudProfile.archetype || !!cloudProfile.neuralProfile;
        if (cloudHasOnboarded) {
          localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
        }

        setState(prev => {
          const stats = prev.stats;
          const mergedStreak = Math.max(stats.currentStreak, cloudProfile.currentStreak ?? stats.currentStreak);
          const mergedPeak = Math.max(stats.highestStreak, cloudProfile.highestStreak ?? stats.highestStreak);
          const mergedFocusMins = Math.max(stats.totalFocusMinutes, cloudProfile.totalFocusMinutes ?? stats.totalFocusMinutes);
          const mergedDailyFocus: Record<string, number> = { ...(stats.dailyFocusMinutes || {}) };
          if (cloudProfile.dailyFocusMinutes && typeof cloudProfile.dailyFocusMinutes === 'object') {
            Object.entries(cloudProfile.dailyFocusMinutes).forEach(([dateKey, mins]) => {
              if (typeof mins === 'number') {
                mergedDailyFocus[dateKey] = Math.max(mergedDailyFocus[dateKey] || 0, mins);
              }
            });
          }
          const mergedPlans = Math.max(stats.totalPlansGenerated, cloudProfile.totalPlansGenerated ?? stats.totalPlansGenerated);
          const mergedGoal = cloudProfile.mainGoal ?? stats.mainGoal;
          const cloudNeuralProfile = cloudProfile.neuralProfile || (cloudProfile.archetype ? getClientFallbackProfile({ archetype: cloudProfile.archetype }) : stats.neuralProfile);

          return {
            ...prev,
            isOnboarding: isRediagnosing ? prev.isOnboarding : (cloudHasOnboarded ? false : prev.isOnboarding),
            stats: {
              ...stats,
              displayName: cloudProfile.displayName || stats.displayName || authUser.displayName || 'Member',
              currentStreak: mergedStreak,
              highestStreak: mergedPeak,
              totalFocusMinutes: mergedFocusMins,
              dailyFocusMinutes: mergedDailyFocus,
              totalPlansGenerated: mergedPlans,
              mainGoal: mergedGoal,
              neuralProfile: cloudNeuralProfile,
              hasCompletedOnboarding: cloudHasOnboarded || stats.hasCompletedOnboarding,
              goalHistory: (cloudProfile.goalHistory && cloudProfile.goalHistory.length > 0)
                ? cloudProfile.goalHistory
                : stats.goalHistory,
              emailDigestSettings: cloudProfile.emailDigestSettings
                ? {
                    ...DEFAULT_EMAIL_DIGEST_SETTINGS,
                    ...(stats.emailDigestSettings || {}),
                    ...cloudProfile.emailDigestSettings,
                  }
                : stats.emailDigestSettings,
              activeUiTheme: cloudProfile.activeUiTheme || stats.activeUiTheme || 'default',
              readingPreferences: cloudProfile.readingPreferences
                ? {
                    ...DEFAULT_READING_PREFERENCES,
                    ...(stats.readingPreferences || {}),
                    ...cloudProfile.readingPreferences,
                  }
                : stats.readingPreferences
            }
          };
        });
      }
    });

    return () => {
      isCancelled = true;
      unsubFeedback();
      unsubProfile();
    };
  }, [authUser?.uid, isRediagnosing]);

  // Sync profile & telemetry to Firestore when signed in
  useEffect(() => {
    if (!authUser) return;

    syncUserProfile({
      id: authUser.uid,
      email: authUser.email || '',
      displayName: authUser.displayName || authUser.email?.split('@')[0] || 'Member',
      photoURL: authUser.photoURL || undefined,
      currentStreak: state.stats.currentStreak,
      highestStreak: state.stats.highestStreak,
      totalPlansGenerated: state.stats.totalPlansGenerated,
      totalFocusMinutes: state.stats.totalFocusMinutes,
      dailyFocusMinutes: state.stats.dailyFocusMinutes || {},
      mainGoal: state.stats.mainGoal,
      goalHistory: state.stats.goalHistory || [],
      archetype: state.stats.neuralProfile?.primaryType || undefined,
      neuralProfile: state.stats.neuralProfile || undefined,
      hasCompletedOnboarding: Boolean(state.stats.hasCompletedOnboarding),
      emailDigestSettings: state.stats.emailDigestSettings,
      activeUiTheme: state.stats.activeUiTheme || 'default',
      readingPreferences: state.stats.readingPreferences || DEFAULT_READING_PREFERENCES,
      currentStatus: state.focusSession.isActive 
        ? 'in_focus' 
        : state.result 
          ? 'plan_ready' 
          : 'idle',
      focusState: {
        isActive: state.focusSession.isActive,
        remainingSeconds: state.focusSession.remainingSeconds,
        taskTitle: state.focusSession.taskTitle
      }
    });
  }, [
    authUser?.uid, 
    state.stats.currentStreak, 
    state.stats.totalFocusMinutes, 
    state.stats.dailyFocusMinutes,
    state.stats.mainGoal, 
    state.stats.neuralProfile?.primaryType,
    state.stats.hasCompletedOnboarding,
    state.stats.emailDigestSettings,
    state.stats.activeUiTheme,
    state.stats.readingPreferences,
    state.focusSession.isActive,
    state.result
  ]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state.stats));
  }, [state.stats]);

  const activeReadingPrefs: ReadingPreferences = {
    ...DEFAULT_READING_PREFERENCES,
    ...(state.stats.readingPreferences || {}),
  };

  useEffect(() => {
    applyReadingPreferencesToDom(activeReadingPrefs);
  }, [
    activeReadingPrefs.font,
    activeReadingPrefs.textScale,
    activeReadingPrefs.spacing,
    activeReadingPrefs.noItalics,
    activeReadingPrefs.tint,
    activeReadingPrefs.simplifiedView,
    activeReadingPrefs.readingRuler,
    activeReadingPrefs.rulerHeight,
    activeReadingPrefs.speechRate,
  ]);

  // Reactive badge evaluation across streak, focus duration, plan & goal metrics
  useEffect(() => {
    const unlocked = new Set(state.stats.unlockedBadgeIds || []);
    let newlyEarned = false;
    const completedGoalsCount = (state.stats.goalHistory || []).filter(g => g.status === 'completed').length;

    ACHIEVEMENTS.forEach(ach => {
      let earned = false;
      if (ach.category === 'streak' || !ach.category) {
        const peakStreak = Math.max(state.stats.currentStreak || 0, state.stats.highestStreak || 0);
        earned = peakStreak >= ach.requirement;
      } else if (ach.category === 'focus') {
        earned = state.stats.totalFocusMinutes >= ach.requirement;
      } else if (ach.category === 'plan') {
        earned = state.stats.totalPlansGenerated >= ach.requirement;
      } else if (ach.category === 'goal') {
        earned = completedGoalsCount >= ach.requirement;
      }
      if (earned && !unlocked.has(ach.id)) {
        unlocked.add(ach.id);
        newlyEarned = true;
      }
    });

    if (newlyEarned) {
      setState(prev => ({
        ...prev,
        stats: {
          ...prev.stats,
          unlockedBadgeIds: Array.from(unlocked)
        }
      }));
    }
  }, [
    state.stats.currentStreak, 
    state.stats.totalFocusMinutes, 
    state.stats.totalPlansGenerated,
    state.stats.goalHistory
  ]);

  // Notification Scheduling Logic
  useEffect(() => {
    if (!state.stats.reminderSettings.enabled || !state.stats.mainGoal) return;

    const checkReminder = () => {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const [targetH, targetM] = state.stats.reminderSettings.time.split(':').map(Number);
      
      const targetTime = new Date();
      targetTime.setHours(targetH, targetM, 0, 0);

      if (now >= targetTime && state.stats.reminderSettings.lastNotifiedDate !== todayStr) {
        if (Notification.permission === 'granted') {
          new Notification('NeuralPlan: Daily Objective', {
            body: `Your main goal: ${state.stats.mainGoal}`
          });
          setState(prev => ({
            ...prev,
            stats: {
              ...prev.stats,
              reminderSettings: { ...prev.stats.reminderSettings, lastNotifiedDate: todayStr }
            }
          }));
        }
      }
    };

    const interval = setInterval(checkReminder, 60000);
    return () => clearInterval(interval);
  }, [state.stats.reminderSettings, state.stats.mainGoal]);

  useEffect(() => {
    if (!state.isOnboarding && !showSplash) {
      performAutonomousSync();
    }
  }, [state.isOnboarding, showSplash]);

  const performAutonomousSync = () => {
    setIsSyncing(true);
    const todayStr = new Date().toISOString().split('T')[0];
    const lastDateStr = state.stats.lastUsedDate;

    // Streaks are only earned via meaningful focus actions, never passive check-ins.
    // On open, simply expire lapsed streaks (>1 full missed day) and keep pending streaks ready.
    if (lastDateStr && lastDateStr !== todayStr) {
      const diffDays = getDayDiff(lastDateStr, todayStr);
      if (diffDays > 1 && state.stats.currentStreak > 0) {
        setState(prev => ({
          ...prev,
          stats: {
            ...prev.stats,
            currentStreak: 0
          }
        }));
      }
    }

    setTimeout(() => setIsSyncing(false), 700);
  };

  const recordMeaningfulActivity = (actionLabel: string) => {
    setState(prev => ({
      ...prev,
      stats: applyMeaningfulActivity(prev.stats, actionLabel)
    }));
  };

  const handleOnboardingComplete = (profile: NeuralProfile) => {
    localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
    setIsRediagnosing(false);
    setState(prev => ({ 
      ...prev, 
      isOnboarding: false, 
      stats: { 
        ...prev.stats, 
        neuralProfile: profile,
        hasCompletedOnboarding: true 
      } 
    }));

    if (authUser) {
      syncUserProfile({
        id: authUser.uid,
        email: authUser.email || '',
        archetype: profile.primaryType,
        neuralProfile: profile,
        hasCompletedOnboarding: true
      });
    }
  };

  const handleRediagnose = () => {
    setIsRediagnosing(true);
    setState(prev => ({ ...prev, isOnboarding: true }));
  };

  const handleCancelRediagnose = () => {
    setIsRediagnosing(false);
    setState(prev => ({ ...prev, isOnboarding: false }));
  };

  const handleAnalyze = async () => {
    if (!state.history.trim() || !state.nextDayDraft.trim()) {
      setState(prev => ({ ...prev, error: "Pattern data required." }));
      return;
    }
    setState(prev => ({ ...prev, isAnalyzing: true, error: null, result: null }));
    try {
      const result = await analyzeBehavior(state.history, state.nextDayDraft, state.stats.currentStreak, state.stats.neuralProfile);
      setState(prev => {
        const updatedStats = applyMeaningfulActivity(prev.stats, 'Behavioral Protocol');
        return {
          ...prev,
          isAnalyzing: false,
          result,
          stats: {
            ...updatedStats,
            totalPlansGenerated: updatedStats.totalPlansGenerated + 1
          }
        };
      });

      // Save to cloud if logged in
      if (authUser) {
        saveDailyPlanToCloud(authUser.uid, {
          date: new Date().toISOString().split('T')[0],
          adaptedPlan: result.adaptedPlan,
          insights: result.insights,
          explanation: result.explanation
        });
      }
    } catch (err: any) {
      const errStr = JSON.stringify(err).toLowerCase();
      const isQuotaError = errStr.includes("429") || errStr.includes("resource_exhausted");
      
      setState(prev => ({ 
        ...prev, 
        isAnalyzing: false, 
        error: isQuotaError 
          ? "Neural Link Saturated (429). The AI quota for this key has been exhausted." 
          : "Calibration failed. Neural link timeout or network interruption." 
      }));
    }
  };

  const handleSetMainGoal = (goal: string) => {
    setState(prev => {
      const existingHistory = prev.stats.goalHistory || [];
      const matchIndex = existingHistory.findIndex(g => g.title.trim().toLowerCase() === goal.trim().toLowerCase());
      let updatedHistory: GoalRecord[];
      
      if (matchIndex >= 0) {
        updatedHistory = existingHistory.map((g, idx) => 
          idx === matchIndex ? { ...g, status: 'active' as const } : g
        );
      } else {
        const newGoal: GoalRecord = {
          id: `goal-${Date.now()}`,
          title: goal,
          createdAt: new Date().toISOString(),
          status: 'active'
        };
        updatedHistory = [newGoal, ...existingHistory];
      }

      return {
        ...prev,
        stats: {
          ...prev.stats,
          mainGoal: goal,
          goalHistory: updatedHistory
        }
      };
    });
  };

  const handleToggleGoalStatus = (goalId: string, newStatus: 'active' | 'completed' | 'abandoned') => {
    setState(prev => {
      const existingHistory = prev.stats.goalHistory || [];
      const targetGoal = existingHistory.find(g => g.id === goalId);
      if (!targetGoal) return prev;

      const updatedHistory = existingHistory.map(g => {
        if (g.id !== goalId) return g;
        return {
          ...g,
          status: newStatus,
          completedAt: newStatus === 'completed' ? new Date().toISOString() : null
        };
      });

      let nextMainGoal = prev.stats.mainGoal;
      if (targetGoal.title === prev.stats.mainGoal) {
        if (newStatus === 'completed' || newStatus === 'abandoned') {
          const nextActive = updatedHistory.find(g => g.status === 'active');
          nextMainGoal = nextActive ? nextActive.title : null;
        }
      } else if (newStatus === 'active') {
        nextMainGoal = targetGoal.title;
      }

      const baseStats: UserStats = {
        ...prev.stats,
        mainGoal: nextMainGoal,
        goalHistory: updatedHistory
      };

      return {
        ...prev,
        stats:
          newStatus === 'completed'
            ? applyMeaningfulActivity(baseStats, 'Goal Completed')
            : baseStats
      };
    });
  };

  const handleAddGoal = (goalTitle: string) => {
    const trimmed = goalTitle.trim();
    if (!trimmed) return;
    const newGoal: GoalRecord = {
      id: `goal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: trimmed,
      createdAt: new Date().toISOString(),
      status: 'active'
    };
    setState(prev => ({
      ...prev,
      stats: {
        ...prev.stats,
        mainGoal: newGoal.title,
        goalHistory: [newGoal, ...(prev.stats.goalHistory || [])]
      }
    }));
  };

  const handleDeleteGoal = (goalId: string) => {
    setState(prev => {
      const existingHistory = prev.stats.goalHistory || [];
      const targetGoal = existingHistory.find(g => g.id === goalId);
      const updatedHistory = existingHistory.filter(g => g.id !== goalId);
      
      let nextMainGoal = prev.stats.mainGoal;
      if (targetGoal && targetGoal.title === prev.stats.mainGoal) {
        const nextActive = updatedHistory.find(g => g.status === 'active');
        nextMainGoal = nextActive ? nextActive.title : null;
      }

      return {
        ...prev,
        stats: {
          ...prev.stats,
          mainGoal: nextMainGoal,
          goalHistory: updatedHistory
        }
      };
    });
  };

  const handleUpdateReminder = (settings: Partial<UserStats['reminderSettings']>) => {
    if (settings.enabled && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
    setState(prev => ({
      ...prev,
      stats: {
        ...prev.stats,
        reminderSettings: { ...prev.stats.reminderSettings, ...settings }
      }
    }));
  };

  const handleUpdateDigestSettings = (settings: Partial<EmailDigestSettings>) => {
    setState(prev => ({
      ...prev,
      stats: {
        ...prev.stats,
        emailDigestSettings: {
          ...DEFAULT_EMAIL_DIGEST_SETTINGS,
          ...(prev.stats.emailDigestSettings || {}),
          ...settings,
        }
      }
    }));
  };

  const handleSelectUiTheme = (nextThemeId: UiThemeId) => {
    setState(prev => ({
      ...prev,
      stats: {
        ...prev.stats,
        activeUiTheme: nextThemeId,
      }
    }));
  };

  const handleUpdateReadingPreferences = (nextPrefs: ReadingPreferences) => {
    setState(prev => ({
      ...prev,
      stats: {
        ...prev.stats,
        readingPreferences: nextPrefs,
      }
    }));
  };

  const handleVoiceCalibrationBoth = async (spokenTranscript: string) => {
    const clean = spokenTranscript.trim();
    if (!clean) return;
    setIsSplittingVoice(true);
    setVoiceSplitNotice(null);
    try {
      const split = await parseVoiceCalibration(clean);
      const historyAdd = split.behavioralHistory || (!split.targetObjectives ? clean : '');
      const objectiveAdd = split.targetObjectives || '';

      setState(prev => {
        const nextHistory = historyAdd
          ? prev.history.trim()
            ? `${prev.history.trim()}${prev.history.trim().endsWith('.') ? ' ' : '. '}${historyAdd}`
            : historyAdd
          : prev.history;
        const nextDraft = objectiveAdd
          ? prev.nextDayDraft.trim()
            ? `${prev.nextDayDraft.trim()}${prev.nextDayDraft.trim().endsWith('.') ? ' ' : '. '}${objectiveAdd}`
            : objectiveAdd
          : prev.nextDayDraft;
        return {
          ...prev,
          history: nextHistory,
          nextDayDraft: nextDraft,
        };
      });

      if (historyAdd && objectiveAdd) {
        setVoiceSplitNotice('Added to both Behavioral History and Target Objectives.');
      } else if (objectiveAdd) {
        setVoiceSplitNotice('Added your spoken plans to Target Objectives.');
      } else {
        setVoiceSplitNotice('Added your spoken check-in to Behavioral History.');
      }
      setTimeout(() => setVoiceSplitNotice(null), 5000);
    } finally {
      setIsSplittingVoice(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogleAndGmail();
    } catch (err) {
      console.error('Google Sign-In Error:', err);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutGoogle();
    } catch (err) {
      console.error('Sign-Out Error:', err);
    }
  };

  const handleUpdateDisplayName = async (newName: string) => {
    if (auth.currentUser) {
      try {
        await updateProfile(auth.currentUser, { displayName: newName });
      } catch (e) {
        console.warn('Firebase profile update notice:', e);
      }
      await syncUserProfile({
        id: auth.currentUser.uid,
        displayName: newName
      });
    }
    setState(prev => ({
      ...prev,
      stats: {
        ...prev.stats,
        displayName: newName
      }
    }));
  };

  const handleResetProgress = async () => {
    clearStaleLocalTestStorage();
    setState(prev => {
      const cleanedStats = buildCleanZeroStats(prev.stats);
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cleanedStats));
        localStorage.setItem(LEGACY_TEST_CLEANUP_KEY, 'true');
      } catch {
        // Ignore storage errors
      }
      return {
        ...prev,
        history: '',
        nextDayDraft: '',
        result: null,
        error: null,
        showBriefing: false,
        focusSession: {
          isActive: false,
          startTime: null,
          durationSeconds: 0,
          remainingSeconds: 0,
        },
        stats: cleanedStats,
      };
    });

    if (authUser) {
      await resetUserProgressInCloud(authUser.uid);
      try {
        localStorage.removeItem(PENDING_CLOUD_RESET_KEY);
      } catch {
        // Ignore storage errors
      }
    } else {
      try {
        localStorage.setItem(PENDING_CLOUD_RESET_KEY, 'true');
      } catch {
        // Ignore storage errors
      }
    }
  };

  // Top-Level Priority Route: /admin directly renders Coach & Admin Portal
  if (showAdminCMS) {
    return (
      <AdminCMS 
        onClose={handleCloseAdminCMS} 
        currentAdminEmail={authUser?.email} 
      />
    );
  }

  if (showSplash) {
    return (
      <SplashScreen
        onFinish={() => setShowSplash(false)}
        theme={theme}
        onChangeTheme={setTheme}
      />
    );
  }
  if (state.isOnboarding) {
    return (
      <Onboarding 
        onComplete={handleOnboardingComplete} 
        isRediagnosis={isRediagnosing || !!state.stats.hasCompletedOnboarding}
        onCancel={state.stats.hasCompletedOnboarding ? handleCancelRediagnose : undefined}
        theme={theme}
        onChangeTheme={setTheme}
      />
    );
  }

  if (showXRMode) {
    return (
      <NeuralPlanXRPortal
        onClosePortal={() => setShowXRMode(false)}
        onSessionComplete={() => recordMeaningfulActivity('XR Simulation')}
      />
    );
  }

  const isAdmin = isUserAdmin(authUser?.email);
  const activeUiTheme: UiThemeId = state.stats.activeUiTheme || 'default';
  const currentUiTheme =
    UNLOCKABLE_THEMES.find((t) => t.id === activeUiTheme) || UNLOCKABLE_THEMES[0];
  const readingTintPreset = READING_TINT_CANVAS[activeReadingPrefs.tint] || READING_TINT_CANVAS.none;
  const effectiveCanvasHex =
    activeReadingPrefs.tint !== 'none'
      ? theme === 'dark'
        ? readingTintPreset.darkBg
        : readingTintPreset.lightBg
      : theme === 'dark'
        ? currentUiTheme.darkCanvasHex
        : currentUiTheme.lightCanvasHex;
  const isReadableTypography =
    activeReadingPrefs.font !== 'default' ||
    activeReadingPrefs.simplifiedView ||
    activeReadingPrefs.spacing !== 'standard';
  const todayDateStr = new Date().toISOString().split('T')[0];
  const isTodayStreakComplete = state.stats.lastUsedDate === todayDateStr;

  return (
    <div
      style={{
        backgroundColor: effectiveCanvasHex,
      }}
      className="min-h-screen pb-20 text-slate-900 dark:text-slate-100 selection:bg-blue-500/20 relative overflow-x-clip transition-colors duration-300"
    >
      {/* Subtle frosted-ice / obsidian ambient lighting matching NeuralPlan logo & equipped reward theme */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className={`absolute -top-24 -left-24 w-[520px] h-[520px] rounded-full ${currentUiTheme.glowTopClass} blur-[140px] transition-colors duration-500`} />
        <div className={`absolute top-1/3 -right-24 w-[460px] h-[460px] rounded-full ${currentUiTheme.glowMidClass} blur-[140px] transition-colors duration-500`} />
        <div className={`absolute bottom-0 left-1/3 w-[420px] h-[420px] rounded-full ${currentUiTheme.glowBottomClass} blur-[140px] transition-colors duration-500`} />
      </div>

      {/* Daily Briefing Overlay */}
      {state.showBriefing && state.stats.mainGoal && (
        <div className="fixed inset-0 z-[200] bg-slate-900/40 dark:bg-slate-950/90 backdrop-blur-2xl flex items-center justify-center p-6 animate-in fade-in duration-700">
          <div className="max-w-lg w-full bg-white/95 dark:bg-slate-900 border border-sky-900/10 dark:border-white/10 rounded-[2.5rem] p-10 md:p-14 shadow-2xl relative overflow-hidden text-center animate-in zoom-in-95 duration-500">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-1 bg-gradient-to-r from-blue-500 via-violet-500 to-amber-400" />
            <div className="mb-10">
              <div className="w-16 h-16 bg-blue-500/10 rounded-2xl border border-blue-500/20 flex items-center justify-center mx-auto mb-6">
                <CalendarDays className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.35em] mb-2">Morning Protocol Briefing</h2>
              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Your Neural Objective</h1>
            </div>
            
            <div className="bg-[#F2F9FC] dark:bg-slate-950/50 p-8 rounded-3xl border border-sky-900/10 dark:border-white/5 mb-10 relative group">
              <div className="absolute -top-3 -right-3 p-2 bg-emerald-500 text-white rounded-lg shadow-xl scale-0 group-hover:scale-100 transition-transform">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <p className="text-xl font-bold text-slate-800 dark:text-blue-100 italic">"{state.stats.mainGoal}"</p>
            </div>

            <button 
              onClick={() => setState(prev => ({ ...prev, showBriefing: false }))}
              className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 dark:from-white dark:to-slate-100 text-white dark:text-slate-950 py-5 rounded-2xl font-bold text-lg shadow-xl shadow-blue-600/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              Initiate Daily Flow
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Top Navigation */}
      <header className="border-b border-sky-900/10 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl sticky top-0 z-50 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-md border border-sky-900/10 dark:border-white/15 relative group bg-[#eaf6f9] shrink-0">
              <img
                src="/assets/aistudio/NeuralplanPP_fdb39126.jpeg"
                alt="NeuralPlan"
                className="w-full h-full object-cover"
              />
              {isSyncing && <div className="absolute inset-0 bg-blue-500/20 animate-ping" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg sm:text-xl text-slate-900 dark:text-white tracking-tight whitespace-nowrap">
                  NeuralPlan
                </h1>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
                <span className={`font-bold tabular-nums ${state.stats.currentStreak >= 7 ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'}`}>
                  {state.stats.currentStreak}d Streak
                </span>
                <span aria-hidden="true">·</span>
                <span className={isTodayStreakComplete ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-amber-600 dark:text-amber-400 font-semibold'}>
                  Today: {isTodayStreakComplete ? 'Complete' : 'Pending'}
                </span>
                <span aria-hidden="true">·</span>
                <span>{authUser ? 'Cloud Sync' : isSyncing ? 'Syncing' : 'Local Session'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5">
            {state.stats.mainGoal && (
              <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F2F9FC] dark:bg-slate-800 border border-sky-900/10 dark:border-white/10 mr-1">
                <Target className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-[140px]">{state.stats.mainGoal}</span>
              </div>
            )}

            {/* Coach CMS Button - Visible exclusively to verified admin */}
            {isAdmin && (
              <button
                onClick={handleOpenAdminCMS}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-amber-500/20 hover:brightness-110 whitespace-nowrap shrink-0"
                title="Open Coach Executive Console"
              >
                <Users className="w-4 h-4" />
                <span>Coach CMS</span>
                <span className="text-[9px] px-1.5 py-0.2 bg-black/20 rounded font-mono">Admin</span>
              </button>
            )}

            {/* Direct Google Sign-In / Gmail Digest & Profile Controls */}
            <div data-tour="account-nav" className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              {!authUser ? (
                <GoogleSignInButton
                  onClick={handleGoogleSignIn}
                  label="Sign in with Google"
                  compact
                />
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setShowGmailDigest(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-500/15 hover:bg-blue-100 dark:hover:bg-blue-500/25 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 text-xs font-semibold transition-all shadow-sm whitespace-nowrap shrink-0"
                    title="Preview and send your daily focus tips & progress update to Gmail"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Gmail Digest</span>
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#F2F9FC] dark:bg-slate-800 hover:bg-sky-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-sky-900/10 dark:border-white/10 transition-all whitespace-nowrap shrink-0"
                    title="Sign out of Google & Firebase Auth"
                  >
                    <LogOut className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    <span>Sign Out</span>
                  </button>
                </>
              )}

              {/* User Profile Settings Button */}
              <button
                onClick={() => {
                  setSettingsInitialTab('profile');
                  setShowUserSettings(true);
                }}
                className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-xl bg-[#F2F9FC] dark:bg-slate-800/80 hover:bg-sky-100/80 dark:hover:bg-slate-700/80 border border-sky-900/10 dark:border-slate-700/60 transition-all text-left group shadow-sm shrink-0"
                title="Open Profile Settings, Achievement Hall & Firebase Account"
              >
                <div className="relative">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 via-violet-500 to-amber-400 flex items-center justify-center text-xs font-bold text-white shadow-sm overflow-hidden">
                    {authUser?.photoURL ? (
                      <img src={authUser.photoURL} alt="User" className="w-full h-full object-cover" />
                    ) : (
                      <span>
                        {(state.stats.displayName || authUser?.displayName || 'P')[0].toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${
                    authUser ? 'bg-emerald-500' : 'bg-amber-400'
                  }`} />
                </div>
                <div className="hidden sm:flex flex-col">
                  <span className="text-[11px] font-bold text-slate-900 dark:text-white leading-none group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors">
                    {state.stats.displayName || authUser?.displayName || 'My Profile'}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-none mt-0.5 tabular-nums">
                    {state.stats.unlockedBadgeIds.length} Badges
                  </span>
                </div>
              </button>
            </div>

            {/* NeuralPlan XR & Zen Focus Navigation Cluster */}
            <div data-tour="modes-nav" className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowXRMode(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-500/15 hover:bg-amber-100 dark:hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 border border-amber-300/70 dark:border-amber-500/35 text-xs font-semibold transition-all shadow-sm whitespace-nowrap shrink-0"
                title="Open NeuralPlan XR Attention & Gaze Simulation Prototype"
              >
                <VrHeadsetIcon className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span className="hidden md:inline">NeuralPlan XR</span>
                <span className="md:hidden">XR</span>
              </button>

              <button 
                onClick={() => setShowZenMode(true)} 
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-50 dark:bg-teal-500/20 hover:bg-violet-100 dark:hover:bg-teal-500/30 text-violet-800 dark:text-teal-300 border border-violet-300/70 dark:border-teal-500/40 text-xs font-semibold transition-all shadow-sm active:scale-95 whitespace-nowrap shrink-0"
                title="Open Zen Focus, Relaxation Mode & Meditation Game"
              >
                <Sparkles className="w-3.5 h-3.5 text-violet-600 dark:text-teal-400" />
                <span>Zen Focus</span>
              </button>
            </div>

            {/* Re-diagnose Button */}
            <button 
              onClick={handleRediagnose} 
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F2F9FC] dark:bg-slate-800/90 hover:bg-sky-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-sky-900/10 dark:border-white/10 text-xs font-semibold transition-all shadow-sm group whitespace-nowrap shrink-0"
              title="Restart cognitive diagnostic to recalibrate your archetype"
            >
              <RefreshCcw className="w-3.5 h-3.5 text-blue-600 dark:text-indigo-400 group-hover:rotate-180 transition-transform duration-500" />
              <span className="hidden lg:inline">Re-diagnose</span>
            </button>

            <ReadingSupportPopover
              isOpen={showReadingPopover}
              onToggle={() => setShowReadingPopover((v) => !v)}
              onClose={() => setShowReadingPopover(false)}
              preferences={activeReadingPrefs}
              onChange={handleUpdateReadingPreferences}
            />

            <ThemeToggle theme={theme} onChangeTheme={setTheme} compact />

            <button
              type="button"
              onClick={() => setShowGuidedTour(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-sky-100/70 dark:hover:bg-slate-800 transition-colors shrink-0 whitespace-nowrap"
              title="Launch Interactive Workspace Walkthrough"
              aria-label="Workspace Guide"
            >
              <HelpCircle className="w-4 h-4" />
              <span className="hidden xl:inline">Guide</span>
            </button>

            <button 
              onClick={() => setShowSplash(true)} 
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-sky-100/70 dark:hover:bg-slate-800 transition-colors shrink-0"
              title="Re-run Startup Sequence"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="max-w-7xl mx-auto px-4 mt-8 relative z-10">
        {/* Real-time Coach Feedback Banner */}
        {authUser && (
          <MemberFeedbackBanner userId={authUser.uid} feedbackList={userFeedback} />
        )}

        {/* Daily Gmail Digest Ready Prompt (requires explicit user confirmation to send) */}
        {(() => {
          if (!authUser?.email) return null;
          const digestPrefs = {
            ...DEFAULT_EMAIL_DIGEST_SETTINGS,
            ...(state.stats.emailDigestSettings || {}),
          };
          const now = new Date();
          const todayStr = now.toISOString().split('T')[0];
          const [prefH, prefM] = (digestPrefs.preferredTime || '08:30').split(':').map(Number);
          const scheduledMoment = new Date();
          scheduledMoment.setHours(prefH || 8, prefM || 30, 0, 0);
          const isDue =
            digestPrefs.enabled &&
            digestPrefs.lastSentDate !== todayStr &&
            dismissedDigestBannerDate !== todayStr &&
            now >= scheduledMoment;
          if (!isDue) return null;

          return (
            <div className="mb-6 rounded-2xl border border-blue-200 dark:border-blue-500/30 bg-white/90 dark:bg-slate-900/80 px-5 py-3.5 shadow-sm backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    Your daily NeuralPlan Gmail digest is ready
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
                    Includes today&apos;s focus tip, {state.stats.currentStreak}-day streak progress, and protocol summary for {authUser.email}.
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setDismissedDigestBannerDate(todayStr)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                >
                  Later
                </button>
                <button
                  type="button"
                  onClick={() => setShowGmailDigest(true)}
                  className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm transition-colors"
                >
                  Review &amp; Send
                </button>
              </div>
            </div>
          );
        })()}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-3" data-tour="stats-panel">
            <StatsPanel 
              stats={state.stats} 
              authUser={authUser}
              isFocusActive={state.focusSession.isActive}
              onUpdateReminder={handleUpdateReminder}
              onUpdateDigestSettings={handleUpdateDigestSettings}
              onOpenGmailDigest={() => setShowGmailDigest(true)}
              onGoogleSignIn={handleGoogleSignIn}
              onOpenBadges={() => {
                setSettingsInitialTab('badges');
                setShowUserSettings(true);
              }}
              onRediagnose={handleRediagnose}
              onOpenZenMode={() => setShowZenMode(true)}
              onOpenXRMode={() => setShowXRMode(true)}
              onSetMainGoal={handleSetMainGoal}
              onToggleGoalStatus={handleToggleGoalStatus}
              onAddGoal={handleAddGoal}
              onDeleteGoal={handleDeleteGoal}
              onDismissRecoveryAlert={(dateStr) =>
                setState(prev => ({
                  ...prev,
                  stats: {
                    ...prev.stats,
                    dismissedRecoveryAlertDate: dateStr
                  }
                }))
              }
            />
          </div>

          <div className="lg:col-span-6 space-y-8">
            {/* Prominent NeuralPlan XR Experimental Concept Card */}
            <div className="rounded-[2rem] border border-amber-400/40 dark:border-amber-500/30 bg-white/85 dark:bg-gradient-to-br dark:from-[#0D1018] dark:via-[#0B0F1A] dark:to-[#08131A] p-6 sm:p-7 relative overflow-hidden shadow-[0_14px_40px_-14px_rgba(245,158,11,0.18)] dark:shadow-2xl backdrop-blur-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                <div className="space-y-2 max-w-md">
                  <div className="flex items-center gap-2 text-xs font-mono text-amber-700 dark:text-amber-400">
                    <VrHeadsetIcon className="w-4 h-4" />
                    <span>Experimental XR Attention Simulation</span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                    NeuralPlan XR
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Explore sustained attention, visual distractibility, and cognitive refocusing latency through an interactive 5-stage browser simulation or Investor Demo walkthrough.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowXRMode(true)}
                  className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 whitespace-nowrap shrink-0"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Open NeuralPlan XR</span>
                </button>
              </div>
            </div>

            <div data-tour="calibration-panel" className="bg-white/90 dark:bg-slate-900/45 border border-sky-900/10 dark:border-slate-800 p-8 rounded-[2.5rem] relative overflow-hidden group shadow-[0_18px_50px_-18px_rgba(37,99,235,0.12)] dark:shadow-2xl backdrop-blur-xl">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div>
                  <h2 className="text-xl font-extrabold tracking-tight flex items-center gap-3 text-slate-900 dark:text-white">
                    <Activity className={`w-6 h-6 text-blue-600 dark:text-blue-400 ${state.isAnalyzing ? 'animate-spin' : 'animate-pulse'}`} />
                    Behavioral Calibration
                  </h2>
                  {authUser && (
                    <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mt-1 inline-block">
                      Auto-Syncing to Cohort
                    </span>
                  )}
                </div>

                <VoiceDictationButton
                  variant="primary"
                  idleLabel={isSplittingVoice ? 'Organizing...' : 'Voice Check-In'}
                  listeningLabel="Stop & Fill"
                  title="Speak freely about today and tomorrow to fill both Behavioral History and Target Objectives"
                  disabled={isSplittingVoice}
                  onTranscript={handleVoiceCalibrationBoth}
                />
              </div>

              {voiceSplitNotice && (
                <div className="mb-5 px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 text-xs font-semibold text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{voiceSplitNotice}</span>
                </div>
              )}

              <div className="grid grid-cols-1 gap-8">
                <InputSection
                  label="Behavioral History"
                  icon={<Clock className="w-4 h-4" />}
                  value={state.history}
                  onChange={(val) => setState(prev => ({ ...prev, history: val }))}
                  placeholder="Describe your energy levels, completed blocks, interruptions, or friction points today..."
                  readableMode={isReadableTypography}
                />
                <InputSection
                  label="Target Objectives"
                  icon={<ListTodo className="w-4 h-4" />}
                  value={state.nextDayDraft}
                  onChange={(val) => setState(prev => ({ ...prev, nextDayDraft: val }))}
                  placeholder="List your top priorities, meetings, and deadlines for your next session..."
                  readableMode={isReadableTypography}
                />
              </div>
              <div className="mt-10">
                <button 
                  data-tour="analyze-trigger"
                  onClick={handleAnalyze} 
                  disabled={state.isAnalyzing} 
                  className={`w-full py-5 rounded-2xl flex items-center justify-center gap-3 font-bold text-lg transition-all shadow-xl active:scale-95 disabled:cursor-not-allowed relative overflow-hidden ${
                    state.isAnalyzing 
                      ? 'bg-gradient-to-r from-blue-600 via-violet-600 to-amber-500 text-white shadow-blue-500/25' 
                      : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 dark:from-white dark:to-slate-100 text-white dark:text-slate-950 hover:brightness-105 hover:scale-[1.01] shadow-blue-600/20 dark:shadow-white/10'
                  }`}
                >
                  {state.isAnalyzing ? (
                    <>
                      <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.2)_50%,transparent_100%)] animate-[shimmer_1.5s_infinite] bg-[length:200%_100%]" />
                      <RefreshCcw className="w-5 h-5 animate-spin text-white relative z-10" />
                      <span className="relative z-10 tracking-tight">
                        Synthesizing Cognitive Protocol...
                      </span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5 fill-current" />
                      <span>Analyze &amp; Adapt</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Skeleton Loading Screen with Dynamic Progress Bar while AI is thinking */}
            {state.isAnalyzing && (
              <AnalysisSkeleton />
            )}

            {state.error && !state.isAnalyzing && (
              <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-6 rounded-2xl text-red-700 dark:text-red-400 text-sm font-bold flex flex-col gap-4 animate-in shake duration-500 shadow-lg">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-red-100 dark:bg-red-500/20 rounded-lg">
                    <ShieldAlert className="w-6 h-6 flex-shrink-0" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-lg tracking-tight block">{state.error}</span>
                    <p className="text-red-600/80 dark:text-slate-400 text-xs font-normal">Check your input details or retry shortly once the AI quota window resets.</p>
                  </div>
                </div>
              </div>
            )}

            {state.result && !state.isAnalyzing && (
              <div className="space-y-6">
                <ResultCard 
                  type="insights" 
                  title="Behavioral Insights" 
                  content={state.result.insights}
                  simplifiedDefault={activeReadingPrefs.simplifiedView}
                  speechRate={activeReadingPrefs.speechRate}
                />
                <ResultCard 
                  type="plan" 
                  title="Adapted Protocol" 
                  content={state.result.adaptedPlan}
                  quickWins={state.result.quickWins}
                  burnoutAlert={state.result.burnoutAlert}
                  onReset={() => setState(prev => ({ ...prev, result: null }))}
                  onSetMainGoal={handleSetMainGoal}
                  activeMainGoal={state.stats.mainGoal}
                  simplifiedDefault={activeReadingPrefs.simplifiedView}
                  speechRate={activeReadingPrefs.speechRate}
                />
                <ResultCard 
                  type="explanation" 
                  title="Cognitive Logic" 
                  content={state.result.explanation}
                  simplifiedDefault={activeReadingPrefs.simplifiedView}
                  speechRate={activeReadingPrefs.speechRate}
                />
              </div>
            )}

            {/* Milestone Tracker & Unlockable UI Theme Progress Map */}
            <div data-tour="milestone-tracker">
              <MilestoneTracker
                stats={state.stats}
                theme={theme}
                activeUiTheme={activeUiTheme}
                onSelectUiTheme={handleSelectUiTheme}
                onOpenAchievementHall={() => {
                  setSettingsInitialTab('badges');
                  setShowUserSettings(true);
                }}
              />
            </div>
          </div>

          <div className="lg:col-span-3" data-tour="focus-lock-panel">
            <FocusLock 
              onComplete={(mins) => setState(prev => {
                const updatedStats = applyMeaningfulActivity(prev.stats, `${mins}m Focus Lock`);
                const todayKey = new Date().toISOString().split('T')[0];
                const prevDaily = { ...(updatedStats.dailyFocusMinutes || {}) };
                prevDaily[todayKey] = (prevDaily[todayKey] || 0) + mins;

                // Keep up to 45 most recent days cleanly
                const sortedKeys = Object.keys(prevDaily).sort();
                if (sortedKeys.length > 45) {
                  sortedKeys.slice(0, sortedKeys.length - 45).forEach((k) => {
                    delete prevDaily[k];
                  });
                }

                return {
                  ...prev,
                  stats: {
                    ...updatedStats,
                    totalFocusMinutes: updatedStats.totalFocusMinutes + mins,
                    dailyFocusMinutes: prevDaily
                  }
                };
              })}
              onStateChange={(isActive) => setState(prev => ({
                ...prev,
                focusSession: { ...prev.focusSession, isActive }
              }))}
            />
          </div>
        </div>
      </main>

      <NeuralChat profile={state.stats.neuralProfile} speechRate={activeReadingPrefs.speechRate} />

      {/* Admin CMS Modal / View */}
      {showAdminCMS && (
        <AdminCMS 
          onClose={handleCloseAdminCMS} 
          currentAdminEmail={authUser?.email} 
        />
      )}

      {/* User-Specific Settings, Achievement Hall & Firebase Modal */}
      <UserSettingsModal
        isOpen={showUserSettings}
        onClose={() => setShowUserSettings(false)}
        stats={state.stats}
        authUser={authUser}
        onUpdateDisplayName={handleUpdateDisplayName}
        onRecalibrateAssessment={handleRediagnose}
        onUpdateDigestSettings={handleUpdateDigestSettings}
        onOpenGmailDigest={() => setShowGmailDigest(true)}
        theme={theme}
        onChangeTheme={setTheme}
        activeUiTheme={activeUiTheme}
        onSelectUiTheme={handleSelectUiTheme}
        onResetProgress={handleResetProgress}
        initialTab={settingsInitialTab}
      />

      {/* Daily Gmail Digest Confirmation & Preview Modal */}
      <GmailDigestModal
        isOpen={showGmailDigest}
        onClose={() => setShowGmailDigest(false)}
        authUser={authUser}
        stats={state.stats}
        latestPlan={state.result}
        onUpdateDigestSettings={handleUpdateDigestSettings}
      />

      {/* Zen Focus, Relaxation Mode & Meditation Game Modal */}
      <ZenMode
        isOpen={showZenMode}
        onClose={() => setShowZenMode(false)}
        authUser={authUser}
        stats={state.stats}
        onActivityComplete={() => recordMeaningfulActivity('Zen Session')}
      />

      {/* Interactive First-Time & On-Demand Workspace Walkthrough */}
      <GuidedTour
        isOpen={showGuidedTour}
        steps={WORKSPACE_TOUR_STEPS}
        onFinish={handleCloseTour}
        onSkip={handleCloseTour}
      />

      {/* Horizontal Reading Ruler / Line-Focus Guide */}
      <ReadingRulerOverlay
        enabled={activeReadingPrefs.readingRuler}
        heightMode={activeReadingPrefs.rulerHeight}
        onClose={() =>
          handleUpdateReadingPreferences({
            ...activeReadingPrefs,
            readingRuler: false,
          })
        }
      />

      {/* Persistent Background Soundscape Controller (visible whenever active outside Focus Lock screen) */}
      {globalSoundState.isPlaying && !state.focusSession.isActive && (
        <div
          className={`fixed left-4 z-[65] flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-sky-900/15 dark:border-slate-700 shadow-xl backdrop-blur-xl max-w-[calc(100vw-6.5rem)] ${
            activeReadingPrefs.readingRuler ? 'bottom-16' : 'bottom-6'
          }`}
        >
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {SOUNDSCAPE_OPTIONS.find((s) => s.id === globalSoundState.activeType)?.name || 'Soundscape'}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {globalSoundState.isPaused
                ? 'Paused'
                : globalSoundState.phase || 'Playing in background'}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setShowGlobalSoundGuide(true)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-sky-50 dark:hover:bg-slate-800"
              title="How background soundscapes work"
              aria-label="Soundscape background guide"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() =>
                globalSoundState.isPaused ? soundscapeEngine.resume() : soundscapeEngine.pause()
              }
              className="px-2.5 py-1.5 rounded-xl bg-[#F2F9FC] dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-sky-900/10 dark:border-white/10 text-xs font-semibold whitespace-nowrap"
            >
              {globalSoundState.isPaused ? 'Resume' : 'Pause'}
            </button>
            <button
              type="button"
              onClick={() => soundscapeEngine.stop()}
              className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold whitespace-nowrap"
              title="Turn off background soundscape"
            >
              Turn Off
            </button>
          </div>
        </div>
      )}

      <SoundscapeGuideModal
        isOpen={showGlobalSoundGuide}
        onClose={() => setShowGlobalSoundGuide(false)}
      />
    </div>
  );
};

export default App;
