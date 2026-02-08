
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement: number; // days streak
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
}

export interface UserStats {
  currentStreak: number;
  highestStreak: number;
  totalPlansGenerated: number;
  totalFocusMinutes: number;
  lastUsedDate: string | null;
  unlockedBadgeIds: string[];
  neuralProfile: NeuralProfile | null;
  entryTimeHistory: string[]; 
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
  burnoutAlert?: BurnoutAlert; // New: Preventive warning system
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
}
