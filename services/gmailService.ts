import { AnalysisResult, EmailDigestSettings, UserStats } from '../types';

export interface ComposedDigest {
  subject: string;
  headline: string;
  focusTip: string;
  progressSummary: string;
  nextMove: string;
  scheduleHighlights: string[];
  generatedAt: string;
}

export const DEFAULT_EMAIL_DIGEST_SETTINGS: EmailDigestSettings = {
  enabled: true,
  preferredTime: '08:30',
  includeFocusTips: true,
  includeProgressStats: true,
  includeDailyPlan: true,
  lastSentDate: null,
  lastSentAt: null,
};

export async function composeDailyDigest(params: {
  stats: UserStats;
  latestPlan: AnalysisResult | null;
  displayName: string;
  settings: EmailDigestSettings;
}): Promise<ComposedDigest> {
  const res = await fetch('/api/gmail/compose-digest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    throw new Error('Could not generate your daily digest preview.');
  }

  return (await res.json()) as ComposedDigest;
}

export async function sendDailyDigestViaGmail(params: {
  accessToken: string;
  digest: ComposedDigest;
  stats: UserStats;
  latestPlan: AnalysisResult | null;
  displayName: string;
  settings: EmailDigestSettings;
}): Promise<{
  ok: boolean;
  messageId?: string;
  sentTo?: string;
  needsReauth?: boolean;
  error?: string;
}> {
  const res = await fetch('/api/gmail/send-digest', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.accessToken}`,
    },
    body: JSON.stringify({
      digest: params.digest,
      stats: {
        currentStreak: params.stats.currentStreak,
        highestStreak: params.stats.highestStreak,
        totalFocusMinutes: params.stats.totalFocusMinutes,
        totalPlansGenerated: params.stats.totalPlansGenerated,
        mainGoal: params.stats.mainGoal,
        unlockedBadgeCount: params.stats.unlockedBadgeIds.length,
        completedGoalsCount: (params.stats.goalHistory || []).filter(
          (g) => g.status === 'completed'
        ).length,
        totalGoalsCount: (params.stats.goalHistory || []).length,
        archetype: params.stats.neuralProfile?.primaryType || null,
      },
      latestPlan: params.latestPlan
        ? {
            adaptedPlan: params.latestPlan.adaptedPlan,
            quickWins: params.latestPlan.quickWins,
          }
        : null,
      displayName: params.displayName,
      settings: params.settings,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      ok: false,
      needsReauth: Boolean(data.needsReauth || res.status === 401 || res.status === 403),
      error: data.error || 'Failed to send email via Gmail.',
    };
  }

  return {
    ok: true,
    messageId: data.messageId,
    sentTo: data.sentTo,
  };
}
