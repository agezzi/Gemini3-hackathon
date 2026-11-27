import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart2,
  Brain,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Download,
  Flame,
  Target,
  TrendingUp,
  Users
} from 'lucide-react';
import { MemberStatus, UserProfileRecord, ZenScoreRecord } from '../types';

interface CohortHealthDashboardProps {
  members: UserProfileRecord[];
  zenScores: ZenScoreRecord[];
  onInspectMember: (member: UserProfileRecord) => void;
}

type TrendWindow = '14d' | '30d' | 'all';
type RoleKey = 'academic' | 'creative' | 'corporate' | 'freelance';

interface DailyBucket {
  dateKey: string;
  label: string;
  newUsers: number;
  cumulativeUsers: number;
  activeUsers: number;
}

interface RoleMetric {
  key: RoleKey;
  archetype: 'Student' | 'Artist' | 'Corporate' | 'Freelancer';
  fullName: string;
  color: string;
  users: number;
  pct: number;
  avgFocusMins: number;
  avgStreak: number;
}

const STATUS_META: Record<
  MemberStatus,
  { label: string; color: string; textClass: string }
> = {
  in_focus: { label: 'In Focus', color: '#10B981', textClass: 'text-emerald-400' },
  plan_ready: { label: 'Plan Ready', color: '#3B82F6', textClass: 'text-blue-400' },
  idle: { label: 'Idle', color: '#64748B', textClass: 'text-slate-400' },
  redlining: { label: 'Redlining', color: '#EF4444', textClass: 'text-red-400' }
};

const ROLE_CONFIG: Array<{
  key: RoleKey;
  archetype: 'Student' | 'Artist' | 'Corporate' | 'Freelancer';
  fullName: string;
  color: string;
}> = [
  { key: 'academic', archetype: 'Student', fullName: 'Student / Scholar', color: '#F59E0B' },
  { key: 'creative', archetype: 'Artist', fullName: 'Artist / Creative', color: '#EC4899' },
  { key: 'corporate', archetype: 'Corporate', fullName: 'Corporate Professional', color: '#3B82F6' },
  { key: 'freelance', archetype: 'Freelancer', fullName: 'Freelancer / Founder', color: '#10B981' }
];

function toDateKey(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
}

function resolveMemberRole(member: UserProfileRecord): RoleKey | null {
  const ctx = member.neuralProfile?.context;
  if (ctx === 'academic' || ctx === 'creative' || ctx === 'corporate' || ctx === 'freelance') {
    return ctx;
  }

  const corpus = [
    member.archetype || '',
    member.neuralProfile?.primaryType || '',
    member.mainGoal || '',
    member.latestPlanSnippet || ''
  ]
    .join(' ')
    .toLowerCase();

  if (!corpus.trim()) return null;

  if (/(student|scholar|academic|thesis|exam|paper|study|doctoral|university|phd)/.test(corpus)) {
    return 'academic';
  }
  if (/(artist|creative|design|brand|writing|audio|media|wireframe|deck)/.test(corpus)) {
    return 'creative';
  }
  if (/(freelance|founder|solo|consultant|client|monolith|technical debt|self-directed)/.test(corpus)) {
    return 'freelance';
  }
  if (/(corporate|enterprise|sales|ops|pipeline|infrastructure|meeting|api|executive|sprint)/.test(corpus)) {
    return 'corporate';
  }

  return null;
}

function escapeCsvCell(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const GrowthChartTooltip: React.FC<{
  active?: boolean;
  payload?: Array<{ payload: DailyBucket }>;
}> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-950/95 px-3.5 py-2.5 text-xs shadow-xl space-y-1">
      <div className="font-semibold text-white font-mono">
        {data.label} ({data.dateKey})
      </div>
      <div className="flex items-center justify-between gap-5 font-mono tabular-nums">
        <span className="text-emerald-400">Daily Active Users</span>
        <span className="text-white font-semibold">{data.activeUsers}</span>
      </div>
      <div className="flex items-center justify-between gap-5 font-mono tabular-nums">
        <span className="text-blue-400">Cumulative Growth</span>
        <span className="text-white font-semibold">{data.cumulativeUsers}</span>
      </div>
      <div className="flex items-center justify-between gap-5 font-mono tabular-nums">
        <span className="text-amber-400">New Signups</span>
        <span className="text-white font-semibold">+{data.newUsers}</span>
      </div>
    </div>
  );
};

const ArchetypeBarTooltip: React.FC<{
  active?: boolean;
  payload?: Array<{ payload: RoleMetric }>;
}> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-950/95 px-3.5 py-2.5 text-xs shadow-xl space-y-1">
      <div className="font-semibold text-white">{item.fullName}</div>
      <div className="flex items-center justify-between gap-5 font-mono tabular-nums">
        <span className="text-slate-400">Members</span>
        <span className="text-white font-semibold">
          {item.users} ({item.pct}%)
        </span>
      </div>
      <div className="flex items-center justify-between gap-5 font-mono tabular-nums">
        <span className="text-slate-400">Avg Focus Time</span>
        <span className="text-white font-semibold">{item.avgFocusMins} mins</span>
      </div>
      <div className="flex items-center justify-between gap-5 font-mono tabular-nums">
        <span className="text-slate-400">Avg Streak</span>
        <span className="text-white font-semibold">{item.avgStreak} days</span>
      </div>
    </div>
  );
};

export const CohortHealthDashboard: React.FC<CohortHealthDashboardProps> = ({
  members,
  zenScores,
  onInspectMember
}) => {
  const [trendWindow, setTrendWindow] = useState<TrendWindow>('30d');
  const [downloadedRecently, setDownloadedRecently] = useState(false);

  const summary = useMemo(() => {
    const now = Date.now();
    const dayMs = 86400000;
    const count = members.length;

    let active24h = 0;
    let active7d = 0;
    let onboardedCount = 0;
    let totalFocusMins = 0;
    let totalPlans = 0;
    let totalStreak = 0;
    let highestCohortStreak = 0;
    let totalGoals = 0;
    let completedGoals = 0;
    let uncalibratedRoles = 0;

    const statusCounts: Record<MemberStatus, number> = {
      in_focus: 0,
      plan_ready: 0,
      idle: 0,
      redlining: 0
    };

    const roleBuckets: Record<
      RoleKey,
      { count: number; totalFocus: number; totalStreak: number }
    > = {
      academic: { count: 0, totalFocus: 0, totalStreak: 0 },
      creative: { count: 0, totalFocus: 0, totalStreak: 0 },
      corporate: { count: 0, totalFocus: 0, totalStreak: 0 },
      freelance: { count: 0, totalFocus: 0, totalStreak: 0 }
    };

    const cognitiveMap = new Map<
      string,
      { count: number; totalFocus: number; totalStreak: number }
    >();

    const engagementTiers = [
      { label: '0 mins (New)', count: 0, color: '#64748B' },
      { label: '1 – 180 mins', count: 0, color: '#38BDF8' },
      { label: '181 – 600 mins', count: 0, color: '#6366F1' },
      { label: '600+ mins', count: 0, color: '#10B981' }
    ];

    const attentionList: Array<{
      member: UserProfileRecord;
      reason: string;
      severity: 'high' | 'medium';
    }> = [];

    members.forEach((m) => {
      const lastActiveMs = m.lastActiveAt ? new Date(m.lastActiveAt).getTime() : 0;
      const ageSinceActive = lastActiveMs > 0 ? now - lastActiveMs : Infinity;

      if (ageSinceActive <= dayMs) active24h += 1;
      if (ageSinceActive <= 7 * dayMs) active7d += 1;

      if (m.hasCompletedOnboarding || m.archetype || m.neuralProfile) {
        onboardedCount += 1;
      }

      const focus = m.totalFocusMinutes || 0;
      const plans = m.totalPlansGenerated || 0;
      const streak = m.currentStreak || 0;

      totalFocusMins += focus;
      totalPlans += plans;
      totalStreak += streak;
      if ((m.highestStreak || streak) > highestCohortStreak) {
        highestCohortStreak = m.highestStreak || streak;
      }

      const status: MemberStatus = m.currentStatus || 'idle';
      statusCounts[status] = (statusCounts[status] || 0) + 1;

      const roleKey = resolveMemberRole(m);
      if (roleKey) {
        roleBuckets[roleKey].count += 1;
        roleBuckets[roleKey].totalFocus += focus;
        roleBuckets[roleKey].totalStreak += streak;
      } else {
        uncalibratedRoles += 1;
      }

      const cogType = m.archetype || m.neuralProfile?.primaryType || 'Uncalibrated';
      const existingCog = cognitiveMap.get(cogType) || {
        count: 0,
        totalFocus: 0,
        totalStreak: 0
      };
      existingCog.count += 1;
      existingCog.totalFocus += focus;
      existingCog.totalStreak += streak;
      cognitiveMap.set(cogType, existingCog);

      if (focus === 0) engagementTiers[0].count += 1;
      else if (focus <= 180) engagementTiers[1].count += 1;
      else if (focus <= 600) engagementTiers[2].count += 1;
      else engagementTiers[3].count += 1;

      if (m.goalHistory && Array.isArray(m.goalHistory)) {
        totalGoals += m.goalHistory.length;
        completedGoals += m.goalHistory.filter((g) => g.status === 'completed').length;
      }

      if (status === 'redlining') {
        attentionList.push({
          member: m,
          reason: 'Redlining strain detected',
          severity: 'high'
        });
      } else if (ageSinceActive > 7 * dayMs && count > 0) {
        const daysAgo = Number.isFinite(ageSinceActive)
          ? `${Math.floor(ageSinceActive / dayMs)}d inactive`
          : 'No activity logged';
        attentionList.push({
          member: m,
          reason: daysAgo,
          severity: 'medium'
        });
      }
    });

    const roleDistribution: RoleMetric[] = ROLE_CONFIG.map((cfg) => {
      const bucket = roleBuckets[cfg.key];
      const classifiedTotal = Math.max(1, count - uncalibratedRoles);
      return {
        key: cfg.key,
        archetype: cfg.archetype,
        fullName: cfg.fullName,
        color: cfg.color,
        users: bucket.count,
        pct: bucket.count > 0 ? Math.round((bucket.count / classifiedTotal) * 100) : 0,
        avgFocusMins: bucket.count > 0 ? Math.round(bucket.totalFocus / bucket.count) : 0,
        avgStreak: bucket.count > 0 ? Number((bucket.totalStreak / bucket.count).toFixed(1)) : 0
      };
    });

    const cognitiveArchetypes = Array.from(cognitiveMap.entries())
      .map(([name, val]) => ({
        name,
        count: val.count,
        pct: count > 0 ? Math.round((val.count / count) * 100) : 0,
        avgFocusMins: Math.round(val.totalFocus / val.count),
        avgStreak: Number((val.totalStreak / val.count).toFixed(1))
      }))
      .sort((a, b) => b.count - a.count);

    const statusPieData = (Object.keys(STATUS_META) as MemberStatus[])
      .map((key) => ({
        key,
        name: STATUS_META[key].label,
        color: STATUS_META[key].color,
        value: statusCounts[key] || 0
      }))
      .filter((d) => d.value > 0);

    const zenSessions = zenScores.length;
    const avgZenHarmony =
      zenSessions > 0
        ? Math.round(
            zenScores.reduce((acc, s) => acc + (s.harmonyRate || 0), 0) / zenSessions
          )
        : null;

    return {
      count,
      active24h,
      active7d,
      retention7dPct: count > 0 ? Math.round((active7d / count) * 100) : 0,
      onboardedCount,
      onboardedPct: count > 0 ? Math.round((onboardedCount / count) * 100) : 0,
      totalFocusMins,
      totalFocusHours: Number((totalFocusMins / 60).toFixed(1)),
      avgFocusMins: count > 0 ? Math.round(totalFocusMins / count) : 0,
      totalPlans,
      avgPlansPerUser: count > 0 ? Number((totalPlans / count).toFixed(1)) : 0,
      avgStreak: count > 0 ? Number((totalStreak / count).toFixed(1)) : 0,
      highestCohortStreak,
      totalGoals,
      completedGoals,
      goalCompletionPct:
        totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : null,
      statusCounts,
      statusPieData,
      roleDistribution,
      uncalibratedRoles,
      cognitiveArchetypes,
      engagementTiers,
      attentionList: attentionList.sort((a, b) =>
        a.severity === b.severity ? 0 : a.severity === 'high' ? -1 : 1
      ),
      zenSessions,
      avgZenHarmony
    };
  }, [members, zenScores]);

  // Build chronological User Growth & Daily Active timeseries from Firestore timestamps
  const growthSeries = useMemo<DailyBucket[]>(() => {
    if (members.length === 0) return [];

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    let earliestMs = today.getTime() - 29 * 86400000;
    if (trendWindow === 'all') {
      const timestamps = members
        .map((m) => (m.createdAt ? new Date(m.createdAt).getTime() : NaN))
        .filter((t) => !Number.isNaN(t));
      if (timestamps.length > 0) {
        const minTs = Math.min(...timestamps);
        const minDay = new Date(minTs);
        minDay.setUTCHours(0, 0, 0, 0);
        earliestMs = Math.min(minDay.getTime(), today.getTime() - 6 * 86400000);
      }
    } else {
      const daysBack = trendWindow === '14d' ? 13 : 29;
      earliestMs = today.getTime() - daysBack * 86400000;
    }

    const totalDays = Math.max(
      7,
      Math.min(90, Math.round((today.getTime() - earliestMs) / 86400000) + 1)
    );
    const startMs = today.getTime() - (totalDays - 1) * 86400000;

    let preWindowUsers = 0;
    const signupByDay = new Map<string, number>();
    const activeByDay = new Map<string, Set<string>>();

    members.forEach((m) => {
      const createdKey = toDateKey(m.createdAt) || toDateKey(m.lastActiveAt);
      if (createdKey) {
        const cMs = new Date(`${createdKey}T00:00:00Z`).getTime();
        if (cMs < startMs) {
          preWindowUsers += 1;
        } else {
          signupByDay.set(createdKey, (signupByDay.get(createdKey) || 0) + 1);
        }
      } else {
        preWindowUsers += 1;
      }

      const activeKey = toDateKey(m.lastActiveAt);
      if (activeKey) {
        if (!activeByDay.has(activeKey)) activeByDay.set(activeKey, new Set());
        activeByDay.get(activeKey)!.add(m.id);
      }
    });

    const buckets: DailyBucket[] = [];
    let runningTotal = preWindowUsers;

    for (let i = 0; i < totalDays; i++) {
      const d = new Date(startMs + i * 86400000);
      const dateKey = d.toISOString().split('T')[0];
      const newUsers = signupByDay.get(dateKey) || 0;
      runningTotal += newUsers;
      const activeUsers = activeByDay.get(dateKey)?.size || 0;
      buckets.push({
        dateKey,
        label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        newUsers,
        cumulativeUsers: runningTotal,
        activeUsers
      });
    }

    return buckets;
  }, [members, trendWindow]);

  const handleDownloadMetrics = () => {
    const generatedAt = new Date().toISOString();
    const lines: string[] = [];
    const pushRow = (...cells: Array<string | number | null | undefined>) => {
      lines.push(cells.map(escapeCsvCell).join(','));
    };

    // Section 1: Aggregated Cohort Summary
    pushRow('Section', 'Metric', 'Value', 'Unit / Notes');
    pushRow('Cohort Summary', 'Generated At', generatedAt, 'ISO-8601 UTC');
    pushRow('Cohort Summary', 'Selected Growth Window', trendWindow, 'Active filter');
    pushRow('Cohort Summary', 'Total Enrolled Users', summary.count, 'members');
    pushRow('Cohort Summary', 'Active Users (Last 24h)', summary.active24h, 'members');
    pushRow('Cohort Summary', 'Active Users (Last 7d)', summary.active7d, 'members');
    pushRow('Cohort Summary', '7-Day Active Retention', `${summary.retention7dPct}%`, 'percent');
    pushRow('Cohort Summary', 'Diagnostic Completion Count', summary.onboardedCount, 'members');
    pushRow('Cohort Summary', 'Diagnostic Completion Rate', `${summary.onboardedPct}%`, 'percent');
    pushRow('Cohort Summary', 'Total Focus Hours', summary.totalFocusHours, 'hours');
    pushRow('Cohort Summary', 'Total Focus Minutes', summary.totalFocusMins, 'minutes');
    pushRow('Cohort Summary', 'Average Focus Minutes Per User', summary.avgFocusMins, 'minutes/user');
    pushRow('Cohort Summary', 'Total AI Plans Generated', summary.totalPlans, 'plans');
    pushRow('Cohort Summary', 'Average AI Plans Per User', summary.avgPlansPerUser, 'plans/user');
    pushRow('Cohort Summary', 'Average Cohort Streak', summary.avgStreak, 'days');
    pushRow('Cohort Summary', 'Peak Cohort Streak', summary.highestCohortStreak, 'days');
    pushRow('Cohort Summary', 'Completed Goals / Total Goals', `${summary.completedGoals}/${summary.totalGoals}`, summary.goalCompletionPct !== null ? `${summary.goalCompletionPct}% completion` : 'No goals logged');
    pushRow('Cohort Summary', 'Zen Meditation Sessions', summary.zenSessions, summary.avgZenHarmony !== null ? `${summary.avgZenHarmony}% avg harmony` : 'sessions');

    pushRow();

    // Section 2: Real-Time Cohort Status Breakdown
    pushRow('Real-Time Status', 'Status', 'Member Count', 'Share (%)');
    (Object.keys(STATUS_META) as MemberStatus[]).forEach((key) => {
      const count = summary.statusCounts[key] || 0;
      const pct = summary.count > 0 ? Math.round((count / summary.count) * 100) : 0;
      pushRow('Real-Time Status', STATUS_META[key].label, count, `${pct}%`);
    });

    pushRow();

    // Section 3: Primary User Archetypes (Student, Artist, Corporate, Freelancer)
    pushRow('User Archetypes', 'Archetype', 'User Count', 'Share (%) · Avg Focus · Avg Streak');
    summary.roleDistribution.forEach((role) => {
      pushRow(
        'User Archetypes',
        role.archetype,
        role.users,
        `${role.pct}% · ${role.avgFocusMins}m avg · ${role.avgStreak}d streak`
      );
    });
    if (summary.uncalibratedRoles > 0) {
      pushRow('User Archetypes', 'Uncalibrated', summary.uncalibratedRoles, 'Pending onboarding');
    }

    pushRow();

    // Section 4: Cognitive Block Phenotypes
    pushRow('Cognitive Phenotypes', 'Phenotype', 'User Count', 'Share (%) · Avg Focus · Avg Streak');
    summary.cognitiveArchetypes.forEach((cog) => {
      pushRow(
        'Cognitive Phenotypes',
        cog.name,
        cog.count,
        `${cog.pct}% · ${cog.avgFocusMins}m avg · ${cog.avgStreak}d streak`
      );
    });

    pushRow();

    // Section 5: Daily Active User Growth Series
    pushRow('Daily Growth Trend', 'Date', 'Daily Active Users', 'Cumulative Users / New Signups');
    growthSeries.forEach((day) => {
      pushRow(
        'Daily Growth Trend',
        day.dateKey,
        day.activeUsers,
        `Total: ${day.cumulativeUsers} (+${day.newUsers} new)`
      );
    });

    const csvContent = lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `neuralplan_cohort_metrics_${generatedAt.split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadedRecently(true);
    setTimeout(() => setDownloadedRecently(false), 2500);
  };

  if (members.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-6 md:p-10 flex items-center justify-center">
        <div className="max-w-md w-full rounded-2xl border border-slate-800 bg-slate-900/70 p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto text-blue-400">
            <TrendingUp className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">No Firestore Cohort Data Yet</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Your backend database is currently clean. As real users sign in with Google, complete onboarding, and run focus sessions, Cohort Health will chart live user growth, archetype distribution, and retention trends here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Section Header + Time Range Selector + Download Metrics CSV Action */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight">
            Cohort Health &amp; Growth Analytics
          </h2>
          <p className="text-xs text-slate-400">
            Aggregated usage telemetry, daily active growth, and archetype mix across {summary.count} Firestore user records
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-900 border border-slate-800 text-xs">
            {(
              [
                { id: '14d', label: '14 Days' },
                { id: '30d', label: '30 Days' },
                { id: 'all', label: 'All History' }
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTrendWindow(opt.id)}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap shrink-0 ${
                  trendWindow === opt.id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleDownloadMetrics}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
          >
            {downloadedRecently ? (
              <Check className="w-3.5 h-3.5 text-emerald-300" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>{downloadedRecently ? 'Metrics Downloaded' : 'Download Metrics'}</span>
          </button>
        </div>
      </div>

      {/* Row 1: Aggregated Usage & Health Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>7-Day Active Retention</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white tabular-nums">
            {summary.retention7dPct}%
          </div>
          <div className="text-[11px] font-mono text-slate-400 tabular-nums">
            {summary.active7d}/{summary.count} active 7d · {summary.active24h} active 24h
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Diagnostic Completion</span>
            <CheckCircle2 className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white tabular-nums">
            {summary.onboardedPct}%
          </div>
          <div className="text-[11px] font-mono text-slate-400 tabular-nums">
            {summary.onboardedCount} calibrated profiles · Peak {summary.highestCohortStreak}d
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Focus &amp; Plan Throughput</span>
            <Clock className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white tabular-nums">
            {summary.totalFocusHours} hrs
          </div>
          <div className="text-[11px] font-mono text-slate-400 tabular-nums">
            {summary.avgFocusMins}m avg/user · {summary.totalPlans} AI plans ({summary.avgPlansPerUser}/user)
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Goals &amp; Zen Sessions</span>
            <Target className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white tabular-nums">
            {summary.goalCompletionPct !== null ? `${summary.goalCompletionPct}%` : `${summary.zenSessions} Zen`}
          </div>
          <div className="text-[11px] font-mono text-slate-400 tabular-nums">
            {summary.totalGoals > 0
              ? `${summary.completedGoals}/${summary.totalGoals} goals · ${summary.zenSessions} Zen runs`
              : `${summary.zenSessions} Zen runs${summary.avgZenHarmony !== null ? ` · ${summary.avgZenHarmony}% harmony` : ''}`}
          </div>
        </div>
      </div>

      {/* Row 2: Recharts LineChart (Daily Active User Growth) + Recharts BarChart (User Archetypes) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Daily Active User Growth Line Chart (Recharts) */}
        <section className="lg:col-span-7 rounded-xl border border-slate-800 bg-slate-900/70 p-5 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                Daily Active User Growth
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Daily active check-ins vs. cumulative cohort growth from Firestore user timestamps
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400 tabular-nums">
              {growthSeries[0]?.label} – {growthSeries[growthSeries.length - 1]?.label}
            </span>
          </div>

          <div className="w-full h-64 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growthSeries} margin={{ top: 10, right: 16, left: -12, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.12)" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#64748B', fontSize: 11 }}
                  axisLine={{ stroke: '#334155' }}
                  tickLine={false}
                  minTickGap={24}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: '#64748B', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<GrowthChartTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                  iconType="circle"
                />
                <Line
                  type="monotone"
                  dataKey="activeUsers"
                  name="Daily Active Users"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  dot={{ r: 2.5, fill: '#10B981', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#34D399' }}
                />
                <Line
                  type="monotone"
                  dataKey="cumulativeUsers"
                  name="Cumulative Users"
                  stroke="#3B82F6"
                  strokeWidth={2.2}
                  dot={false}
                  activeDot={{ r: 5, fill: '#60A5FA' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* User Archetypes Distribution Bar Chart (Recharts) */}
        <section className="lg:col-span-5 rounded-xl border border-slate-800 bg-slate-900/70 p-5 flex flex-col justify-between space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-amber-400" />
                User Archetype Distribution
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Cohort breakdown across Student, Artist, Corporate, and Freelancer profiles
              </p>
            </div>
            {summary.uncalibratedRoles > 0 && (
              <span className="text-[11px] font-mono text-slate-500 shrink-0 tabular-nums">
                {summary.uncalibratedRoles} uncalibrated
              </span>
            )}
          </div>

          <div className="w-full h-56 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={summary.roleDistribution}
                margin={{ top: 10, right: 12, left: -16, bottom: 4 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="rgba(148, 163, 184, 0.12)"
                />
                <XAxis
                  dataKey="archetype"
                  tick={{ fill: '#CBD5E1', fontSize: 11 }}
                  axisLine={{ stroke: '#334155' }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: '#64748B', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
                  content={<ArchetypeBarTooltip />}
                />
                <Bar dataKey="users" name="Users" radius={[6, 6, 0, 0]} maxBarSize={48}>
                  {summary.roleDistribution.map((entry) => (
                    <Cell key={entry.key} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800">
            {summary.roleDistribution.map((role) => (
              <div key={role.key} className="flex items-center justify-between text-xs px-1">
                <span className="flex items-center gap-1.5 text-slate-300 truncate">
                  <span
                    className="w-2 h-2 rounded-sm shrink-0"
                    style={{ backgroundColor: role.color }}
                  />
                  <span className="truncate">{role.archetype}</span>
                </span>
                <span className="font-mono text-slate-200 tabular-nums ml-1">
                  {role.users}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Row 3: Live Cohort State Donut (Recharts), Cognitive Phenotypes, and Triage Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cohort Real-Time State Donut */}
        <section className="lg:col-span-3 rounded-xl border border-slate-800 bg-slate-900/70 p-5 flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              Cohort Real-Time State
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live status split across enrolled members
            </p>
          </div>

          <div className="relative w-full h-40 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={summary.statusPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={44}
                  outerRadius={66}
                  paddingAngle={2}
                  stroke="none"
                >
                  {summary.statusPieData.map((entry) => (
                    <Cell key={entry.key} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#020617',
                    borderColor: '#334155',
                    borderRadius: '0.5rem',
                    fontSize: '12px',
                    color: '#F8FAFC'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold font-mono text-white tabular-nums">
                {summary.count}
              </span>
              <span className="text-[10px] text-slate-400">Members</span>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-800">
            {(Object.keys(STATUS_META) as MemberStatus[]).map((key) => {
              const count = summary.statusCounts[key] || 0;
              const pct = summary.count > 0 ? Math.round((count / summary.count) * 100) : 0;
              return (
                <div key={key} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-slate-300">
                    <span
                      className="w-2.5 h-2.5 rounded-sm inline-block"
                      style={{ backgroundColor: STATUS_META[key].color }}
                    />
                    <span>{STATUS_META[key].label}</span>
                  </span>
                  <span className="font-mono text-slate-200 tabular-nums">
                    {count} ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Cognitive Block Phenotype Breakdown */}
        <section className="lg:col-span-4 rounded-xl border border-slate-800 bg-slate-900/70 p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Brain className="w-4 h-4 text-indigo-400" />
              Cognitive Block Phenotypes
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Share, average focus output, and streak persistence per phenotype
            </p>
          </div>

          <div className="space-y-3">
            {summary.cognitiveArchetypes.map((arch) => (
              <div key={arch.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-200 truncate pr-3">
                    {arch.name}
                  </span>
                  <span className="font-mono text-slate-400 tabular-nums shrink-0">
                    {arch.count} ({arch.pct}%) · {arch.avgFocusMins}m avg
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                    style={{ width: `${arch.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Focus Engagement Tiers + Members Needing Attention */}
        <section className="lg:col-span-5 rounded-xl border border-slate-800 bg-slate-900/70 p-5 space-y-5">
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400" />
              Focus Depth Tiers
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              {summary.engagementTiers.map((tier) => (
                <div
                  key={tier.label}
                  className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1"
                >
                  <div className="text-[11px] text-slate-400 truncate">{tier.label}</div>
                  <div
                    className="text-lg font-bold font-mono tabular-nums"
                    style={{ color: tier.color }}
                  >
                    {tier.count}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Triage Queue: Redlining or Dormant Members */}
          <div className="space-y-2.5 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Coaching Attention Queue ({summary.attentionList.length})
              </h4>
              <span className="text-[11px] text-slate-500">
                Redlining or 7d+ inactive
              </span>
            </div>

            {summary.attentionList.length === 0 ? (
              <div className="py-4 text-center text-xs text-emerald-400 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                All enrolled members are active and within nominal cognitive load.
              </div>
            ) : (
              <div className="divide-y divide-slate-800/80 max-h-44 overflow-y-auto border border-slate-800 rounded-lg bg-slate-950/50">
                {summary.attentionList.map(({ member, reason, severity }) => (
                  <div
                    key={member.id}
                    className="px-3 py-2.5 flex items-center justify-between gap-3 hover:bg-slate-900/70 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white truncate">
                        {member.displayName || member.email}
                      </div>
                      <div
                        className={`text-[11px] font-mono ${
                          severity === 'high' ? 'text-red-400' : 'text-amber-400'
                        }`}
                      >
                        {reason} · {member.archetype || 'Uncalibrated'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onInspectMember(member)}
                      className="px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-blue-600 text-xs font-medium text-slate-200 hover:text-white flex items-center gap-1 transition-colors shrink-0 whitespace-nowrap"
                    >
                      <span>Coach</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
