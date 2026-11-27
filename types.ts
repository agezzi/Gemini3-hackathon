export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement: number;
  category?: 'streak' | 'focus' | 'plan' | 'goal';
  tier?: 'bronze' | 'silver' | 'gold' | 'diamond';
}

export interface NeuralScores {
  focus: number;
  sensory: number;
  processing: number;
  executive: number;
}

export interface NeuralProfile {
  primaryType: string;
  traits: string[];
  context: 'academic' | 'corporate' | 'creative' | 'freelance';
  recommendations: string[];
  scores: NeuralScores;
}

export interface FocusSession {
  isActive: boolean;
  startTime: number | null;
  durationSeconds: number;
  remainingSeconds: number;
  taskTitle?: string;
}

export interface ReminderSettings {
  enabled: boolean;
  time: string; // HH:mm
  lastNotifiedDate: string | null;
}

export interface EmailDigestSettings {
  enabled: boolean;
  preferredTime: string; // HH:mm
  includeFocusTips: boolean;
  includeProgressStats: boolean;
  includeDailyPlan: boolean;
  lastSentDate: string | null; // YYYY-MM-DD
  lastSentAt: string | null; // ISO timestamp
}

export type UiThemeId =
  | 'default'
  | 'amber_dawn'
  | 'arctic_aurora'
  | 'violet_nebula'
  | 'obsidian_emerald'
  | 'solar_sovereign';

export interface UnlockableTheme {
  id: UiThemeId;
  name: string;
  description: string;
  unlockAchievementId: string | null;
  unlockRequirementLabel: string;
  lightCanvasHex: string;
  darkCanvasHex: string;
  swatches: [string, string, string];
  glowTopClass: string;
  glowMidClass: string;
  glowBottomClass: string;
  accentGradientClass: string;
}

export interface MilestoneNode {
  id: string;
  achievementId: string;
  stepNumber: number;
  title: string;
  metricLabel: string;
  category: 'streak' | 'focus' | 'plan';
  requirement: number;
  unit: string;
  rewardThemeId: UiThemeId | null;
}

export interface GoalRecord {
  id: string;
  title: string;
  createdAt: string; // ISO date string
  completedAt?: string | null;
  status: 'active' | 'completed' | 'abandoned';
  notes?: string;
}

export type DyslexiaFontId = 'default' | 'atkinson' | 'lexend' | 'opendyslexic';
export type ReadingTintId = 'none' | 'cream' | 'sage' | 'blue' | 'peach';
export type SpacingPresetId = 'standard' | 'relaxed' | 'wide';

export interface ReadingPreferences {
  font: DyslexiaFontId;
  textScale: number; // 1.0 | 1.1 | 1.2 | 1.3
  spacing: SpacingPresetId;
  noItalics: boolean;
  tint: ReadingTintId;
  simplifiedView: boolean;
  readingRuler: boolean;
  rulerHeight: 'narrow' | 'medium' | 'wide';
  speechRate: number; // 0.85 | 1.0 | 1.15
}

export interface UserStats {
  displayName?: string;
  currentStreak: number;
  highestStreak: number;
  totalPlansGenerated: number;
  totalFocusMinutes: number;
  dailyFocusMinutes?: Record<string, number>;
  dismissedRecoveryAlertDate?: string | null;
  lastUsedDate: string | null;
  lastMeaningfulActionLabel?: string | null;
  unlockedBadgeIds: string[];
  neuralProfile: NeuralProfile | null;
  entryTimeHistory: string[]; 
  mainGoal: string | null;
  goalHistory?: GoalRecord[];
  reminderSettings: ReminderSettings;
  emailDigestSettings?: EmailDigestSettings;
  activeUiTheme?: UiThemeId;
  readingPreferences?: ReadingPreferences;
  hasCompletedOnboarding?: boolean;
}

export interface BurnoutAlert {
  level: 'low' | 'moderate' | 'critical';
  message: string;
  recoveryAction: string;
}

export interface AnalysisResult {
  insights: string;
  adaptedPlan: string;
  explanation: string;
  quickWins: string[];
  burnoutAlert?: BurnoutAlert;
}

export interface AppState {
  history: string;
  nextDayDraft: string;
  isAnalyzing: boolean;
  isOnboarding: boolean;
  result: AnalysisResult | null;
  error: string | null;
  stats: UserStats;
  focusSession: FocusSession;
  showBriefing: boolean;
}

// Backend & CMS Data Models
export type MemberStatus = 'idle' | 'in_focus' | 'plan_ready' | 'redlining';

export interface UserProfileRecord {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  currentStreak: number;
  highestStreak: number;
  totalPlansGenerated: number;
  totalFocusMinutes: number;
  dailyFocusMinutes?: Record<string, number>;
  mainGoal: string | null;
  goalHistory?: GoalRecord[];
  currentStatus: MemberStatus;
  archetype?: string;
  hasCompletedOnboarding?: boolean;
  neuralProfile?: NeuralProfile | null;
  emailDigestSettings?: EmailDigestSettings;
  activeUiTheme?: UiThemeId;
  readingPreferences?: ReadingPreferences;
  lastActiveAt: string;
  createdAt: string;
  focusState?: {
    isActive: boolean;
    remainingSeconds: number;
    taskTitle?: string;
  };
  latestPlanSnippet?: string;
}

export interface DailyPlanRecord {
  id: string;
  userId: string;
  date: string;
  adaptedPlan: string;
  insights?: string;
  explanation?: string;
  completionRate?: number;
  createdAt: string;
}

export type FeedbackType = 'kudos' | 'warning' | 'strategy' | 'checkin';

export interface CoachFeedbackItem {
  id: string;
  userId: string;
  adminId: string;
  adminEmail: string;
  title: string;
  message: string;
  type: FeedbackType;
  read: boolean;
  createdAt: string;
}

// Zen Focus, Relaxation & Meditation Mini-Game Models
export interface ZenScoreRecord {
  id: string;
  userId: string;
  displayName: string;
  photoURL?: string;
  score: number;
  harmonyRate: number; // 0-100%
  longestStreak: number;
  durationSeconds: number;
  weekId: string; // e.g. "2026-W45"
  archetype?: string;
  createdAt: string;
}

export interface ZenWeeklyWinnerRecord {
  id: string;
  weekId: string;
  userId: string;
  displayName: string;
  photoURL?: string;
  topScore: number;
  badgeId: string;
  badgeTitle: string;
  awardedAt: string;
}
