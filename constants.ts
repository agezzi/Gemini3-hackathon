
import { Achievement, MilestoneNode, UnlockableTheme } from "./types";

export const ACHIEVEMENTS: Achievement[] = [
  { id: '3day', name: 'Momentum Spark', description: '3-Day Persistence: Initialized positive dopamine loop.', icon: '🔥', requirement: 3, category: 'streak', tier: 'bronze' },
  { id: '7day', name: 'Neural Pioneer', description: '7-Day Mastery: One full week of circadian synchronization.', icon: '🛡️', requirement: 7, category: 'streak', tier: 'silver' },
  { id: '14day', name: 'Executive Flow', description: '14-Day Streak: Prefrontal cortex neuroplasticity anchored.', icon: '⚡', requirement: 14, category: 'streak', tier: 'gold' },
  { id: '30day', name: 'Cognitive Architect', description: '30-Day Paradigm: Total reconstruction of executive regulation.', icon: '🧬', requirement: 30, category: 'streak', tier: 'diamond' },
  { id: 'first_plan', name: 'Neural Calibrator', description: 'Generated and analyzed your first behavioral protocol.', icon: '🧭', requirement: 1, category: 'plan', tier: 'bronze' },
  { id: 'plan_5', name: 'Adaptive Pacer', description: 'Committed 5 custom behavioral schedules to protect dopamine.', icon: '📊', requirement: 5, category: 'plan', tier: 'silver' },
  { id: 'focus_60m', name: 'Deep Work Initiate', description: 'Logged 60+ minutes of distraction-free containment work.', icon: '🎯', requirement: 60, category: 'focus', tier: 'bronze' },
  { id: 'focus_300m', name: 'Temporal Lock Master', description: 'Accumulated 300 minutes inside high-focus containment.', icon: '⏳', requirement: 300, category: 'focus', tier: 'silver' },
  { id: 'focus_1000m', name: 'Flow-State Sovereign', description: 'Surpassed 1,000 minutes of pure neuro-attuned focus.', icon: '👑', requirement: 1000, category: 'focus', tier: 'gold' },
  { id: 'zen_weekly_champion', name: 'Lotus Sovereign', description: 'Crowned #1 Weekly Champion in the Zen Meditation & Focus Tournament.', icon: '🪷', requirement: 1, category: 'goal', tier: 'diamond' },
  { id: 'zen_master_5000', name: 'Serenity Sage', description: 'Surpassed 5,000 Zen Harmony points in Mindful Ripple Flow.', icon: '🧘', requirement: 5000, category: 'focus', tier: 'gold' },
];

export const UNLOCKABLE_THEMES: UnlockableTheme[] = [
  {
    id: 'default',
    name: 'Frosted Horizon',
    description: 'Signature glacial blue and cobalt ambient glass palette.',
    unlockAchievementId: null,
    unlockRequirementLabel: 'Included by default',
    lightCanvasHex: '#EEF7FA',
    darkCanvasHex: '#020617',
    swatches: ['#2563EB', '#7C3AED', '#F59E0B'],
    glowTopClass: 'bg-blue-400/14 dark:bg-blue-600/12',
    glowMidClass: 'bg-violet-400/14 dark:bg-violet-600/12',
    glowBottomClass: 'bg-amber-300/12 dark:bg-amber-500/8',
    accentGradientClass: 'from-blue-600 via-indigo-600 to-violet-600',
  },
  {
    id: 'amber_dawn',
    name: 'Amber Dawn',
    description: 'Warm sunlit sandstone and soft saffron illumination for steady morning starts.',
    unlockAchievementId: '3day',
    unlockRequirementLabel: '3-day persistence streak',
    lightCanvasHex: '#FCF7EF',
    darkCanvasHex: '#0C0906',
    swatches: ['#D97706', '#EA580C', '#FBBF24'],
    glowTopClass: 'bg-amber-400/18 dark:bg-amber-500/14',
    glowMidClass: 'bg-orange-300/14 dark:bg-orange-600/10',
    glowBottomClass: 'bg-yellow-300/14 dark:bg-yellow-500/8',
    accentGradientClass: 'from-amber-600 via-orange-500 to-rose-500',
  },
  {
    id: 'arctic_aurora',
    name: 'Arctic Aurora',
    description: 'Calibrated northern-lights teal and glacial cyan tuned for circadian clarity.',
    unlockAchievementId: '7day',
    unlockRequirementLabel: '7-day persistence streak',
    lightCanvasHex: '#ECF9F7',
    darkCanvasHex: '#031012',
    swatches: ['#0D9488', '#0284C7', '#10B981'],
    glowTopClass: 'bg-teal-400/18 dark:bg-teal-500/14',
    glowMidClass: 'bg-sky-400/15 dark:bg-cyan-600/12',
    glowBottomClass: 'bg-emerald-300/14 dark:bg-emerald-500/8',
    accentGradientClass: 'from-teal-600 via-cyan-600 to-sky-600',
  },
  {
    id: 'violet_nebula',
    name: 'Violet Nebula',
    description: 'Low-stimulus twilight lavender and cosmic indigo for deep analytical flow.',
    unlockAchievementId: 'focus_300m',
    unlockRequirementLabel: '300 focus minutes',
    lightCanvasHex: '#F3F0FC',
    darkCanvasHex: '#080614',
    swatches: ['#6D28D9', '#4F46E5', '#C026D3'],
    glowTopClass: 'bg-violet-400/18 dark:bg-violet-600/15',
    glowMidClass: 'bg-indigo-400/15 dark:bg-indigo-600/12',
    glowBottomClass: 'bg-fuchsia-300/14 dark:bg-fuchsia-500/8',
    accentGradientClass: 'from-violet-600 via-purple-600 to-indigo-600',
  },
  {
    id: 'obsidian_emerald',
    name: 'Mineral Sage',
    description: 'Grounded botanical emerald and slate stone for disciplined executive regulation.',
    unlockAchievementId: '14day',
    unlockRequirementLabel: '14-day persistence streak',
    lightCanvasHex: '#EEF7F2',
    darkCanvasHex: '#040E09',
    swatches: ['#059669', '#0F766E', '#3B82F6'],
    glowTopClass: 'bg-emerald-400/18 dark:bg-emerald-600/14',
    glowMidClass: 'bg-teal-400/14 dark:bg-teal-700/12',
    glowBottomClass: 'bg-sky-300/12 dark:bg-sky-600/8',
    accentGradientClass: 'from-emerald-600 via-teal-600 to-cyan-600',
  },
  {
    id: 'solar_sovereign',
    name: 'Solar Sovereign',
    description: 'Luminous champagne gold and deep bronze mastery earned at 1,000 focus minutes.',
    unlockAchievementId: 'focus_1000m',
    unlockRequirementLabel: '1,000 focus minutes',
    lightCanvasHex: '#FAF5E8',
    darkCanvasHex: '#0B0804',
    swatches: ['#B45309', '#D97706', '#2563EB'],
    glowTopClass: 'bg-amber-400/20 dark:bg-amber-500/16',
    glowMidClass: 'bg-yellow-300/16 dark:bg-yellow-600/10',
    glowBottomClass: 'bg-blue-400/12 dark:bg-blue-600/8',
    accentGradientClass: 'from-amber-600 via-yellow-600 to-orange-600',
  },
];

export const MILESTONE_MAP_NODES: MilestoneNode[] = [
  {
    id: 'node_first_plan',
    achievementId: 'first_plan',
    stepNumber: 1,
    title: 'First Calibration',
    metricLabel: '1 Daily Protocol',
    category: 'plan',
    requirement: 1,
    unit: 'plan',
    rewardThemeId: null,
  },
  {
    id: 'node_3day',
    achievementId: '3day',
    stepNumber: 2,
    title: 'Momentum Spark',
    metricLabel: '3-Day Streak',
    category: 'streak',
    requirement: 3,
    unit: 'days',
    rewardThemeId: 'amber_dawn',
  },
  {
    id: 'node_focus_60',
    achievementId: 'focus_60m',
    stepNumber: 3,
    title: 'Deep Work Hour',
    metricLabel: '60 Focus Mins',
    category: 'focus',
    requirement: 60,
    unit: 'mins',
    rewardThemeId: null,
  },
  {
    id: 'node_7day',
    achievementId: '7day',
    stepNumber: 4,
    title: 'Neural Pioneer',
    metricLabel: '7-Day Streak',
    category: 'streak',
    requirement: 7,
    unit: 'days',
    rewardThemeId: 'arctic_aurora',
  },
  {
    id: 'node_focus_300',
    achievementId: 'focus_300m',
    stepNumber: 5,
    title: 'Temporal Lock',
    metricLabel: '300 Focus Mins',
    category: 'focus',
    requirement: 300,
    unit: 'mins',
    rewardThemeId: 'violet_nebula',
  },
  {
    id: 'node_14day',
    achievementId: '14day',
    stepNumber: 6,
    title: 'Executive Flow',
    metricLabel: '14-Day Streak',
    category: 'streak',
    requirement: 14,
    unit: 'days',
    rewardThemeId: 'obsidian_emerald',
  },
  {
    id: 'node_focus_1000',
    achievementId: 'focus_1000m',
    stepNumber: 7,
    title: 'Flow-State Sovereign',
    metricLabel: '1,000 Focus Mins',
    category: 'focus',
    requirement: 1000,
    unit: 'mins',
    rewardThemeId: 'solar_sovereign',
  },
];

export interface ArchetypeOption {
  id: string;
  name: string;
  tagline: string;
  badge: string;
  description: string;
  iconName: string;
  gradient: string;
  borderAccent: string;
  primaryBlock: string;
}

export interface DiagnosticQuestion {
  id: string;
  question: string;
  subtitle?: string;
  category: 'initiation' | 'focus' | 'burnout' | 'sensory' | 'recovery' | 'pacing';
  options: {
    id: string;
    label: string;
    sublabel?: string;
    impactScore?: number;
  }[];
}

export const ARCHETYPES: ArchetypeOption[] = [
  {
    id: 'sprint_redliner',
    name: 'Sprint-Crashing Redliner',
    tagline: 'All-or-Nothing Hyper-Velocity',
    badge: 'High Acceleration',
    description: 'You launch into high-intensity hyperfocus sprints early in the day, but hit a severe cliff by early afternoon followed by executive exhaustion.',
    iconName: 'Flame',
    gradient: 'from-orange-500/20 via-amber-500/10 to-red-500/20',
    borderAccent: 'border-orange-500/40 hover:border-orange-400 group-hover:border-orange-500',
    primaryBlock: 'Post-Hyperfocus Dopamine Crashes'
  },
  {
    id: 'waiting_mode_paralyzed',
    name: 'Waiting-Mode Paralytic',
    tagline: 'Pre-Meeting Schedule Anxiety',
    badge: 'Temporal Friction',
    description: 'A 2 PM meeting destroys your entire morning. Unstructured gaps between events trigger freeze states and cognitive holding patterns.',
    iconName: 'Hourglass',
    gradient: 'from-amber-500/20 via-yellow-500/10 to-orange-500/20',
    borderAccent: 'border-amber-500/40 hover:border-amber-400 group-hover:border-amber-500',
    primaryBlock: 'Anticipatory Task Paralysis'
  },
  {
    id: 'hyperfocus_drifter',
    name: 'Hyper-Focus Drifter',
    tagline: 'Rabbit Hole Captive',
    badge: 'Tunnel Vision',
    description: 'You fall into deep flow easily, but often on accidental tangent tasks or research spirals while your actual core priorities remain untouched.',
    iconName: 'Compass',
    gradient: 'from-cyan-500/20 via-blue-500/10 to-indigo-500/20',
    borderAccent: 'border-cyan-500/40 hover:border-cyan-400 group-hover:border-cyan-500',
    primaryBlock: 'Intentional Direction Hijacking'
  },
  {
    id: 'sensory_overwhelmed',
    name: 'Sensory-Overwhelmed Synthesizer',
    tagline: 'Environmental Energy Drain',
    badge: 'Hypersensitive',
    description: 'Open spaces, notifications, Slack pings, and visual clutter deplete your working memory and executive battery before high-load work even starts.',
    iconName: 'ShieldAlert',
    gradient: 'from-purple-500/20 via-pink-500/10 to-blue-500/20',
    borderAccent: 'border-purple-500/40 hover:border-purple-400 group-hover:border-purple-500',
    primaryBlock: 'Sensory Battery Depletion'
  },
  {
    id: 'last_mile_abandoner',
    name: 'Last-Mile Abandoner',
    tagline: 'The 90% Completion Wall',
    badge: 'Novelty Depletion',
    description: 'You generate brilliant momentum and build complex systems to 90%, but formatting, polish, administrative cleanup, and delivery trigger total dread.',
    iconName: 'Target',
    gradient: 'from-emerald-500/20 via-teal-500/10 to-cyan-500/20',
    borderAccent: 'border-emerald-500/40 hover:border-emerald-400 group-hover:border-emerald-500',
    primaryBlock: 'Zero-Dopamine Finalization Wall'
  }
];

export const ARCHETYPE_QUESTION_SETS: Record<string, DiagnosticQuestion[]> = {
  // 1. SPRINT-CRASHING REDLINER
  sprint_redliner: [
    {
      id: 'redliner_trigger',
      question: "When your hyperfocus sprint begins, what usually drives the initial surge?",
      subtitle: "Pinpointing the neuro-chemical ignition source of your sprint pattern.",
      category: 'initiation',
      options: [
        { id: 'panic_adrenaline', label: 'Imminent deadline adrenaline & urgency panic' },
        { id: 'novelty_hyperfixation', label: 'Sudden hyper-fixation on a fresh, exciting problem' },
        { id: 'guilt_compensation', label: 'Overcompensating for a previous day of perceived unproductivity' },
        { id: 'caffeine_stimulants', label: 'Heavy chemical stimulation (high caffeine/stimulant dosing)' }
      ]
    },
    {
      id: 'redliner_crash_signal',
      question: "What is your earliest warning signal before the inevitable cliff hit?",
      subtitle: "Detecting the physiological boundary before prefrontal exhaustion.",
      category: 'burnout',
      options: [
        { id: 'staring_blankly', label: 'Screen glaze: Reading the same line 4 times without comprehension' },
        { id: 'physical_tension', label: 'Somatic distress: Clenched jaw, headache, or stiff shoulders' },
        { id: 'sudden_irritability', label: 'Dopamine drop: Instant irritability at minor disruptions' },
        { id: 'app_hopping', label: 'Compulsive tab-switching seeking micro-stimulation' }
      ]
    },
    {
      id: 'redliner_containment',
      question: "How do you respond when an alarm interrupts you during a deep sprint?",
      subtitle: "Assessing capacity for artificial focus containment.",
      category: 'pacing',
      options: [
        { id: 'dismiss_continue', label: 'Instantly dismiss it; interrupting flow feels physically painful' },
        { id: 'snooze_spiral', label: 'Snooze repeatedly until flow is completely derailed' },
        { id: 'rage_frustration', label: 'Lose train of thought and become paralyzed by frustration' },
        { id: 'grudgingly_pause', label: 'Step away briefly only if water or bathroom is strictly urgent' }
      ]
    },
    {
      id: 'redliner_post_collapse',
      question: "Following a heavy 3-hour sprint, what does your subsequent afternoon look like?",
      subtitle: "Measuring the depth and duration of your executive recovery valley.",
      category: 'recovery',
      options: [
        { id: 'zombie_scrolling', label: 'Total vegetative scrolling & executive paralysis for 2-3 hours' },
        { id: 'shame_rumination', label: 'Guilt spirals about not finishing the remaining agenda' },
        { id: 'seek_sugar_stim', label: 'Aggressive cravings for sugar, snacks, or emergency caffeine' },
        { id: 'call_it_a_day', label: 'Mental shutdown; incapable of writing even a basic email' }
      ]
    },
    {
      id: 'redliner_adaptation_preference',
      question: "Which pacing mechanism would protect your afternoon energy most effectively?",
      subtitle: "Calibrating your tailored protocol constraint algorithm.",
      category: 'pacing',
      options: [
        { id: 'hard_45m_cap', label: 'Hard 45-minute focus caps with mandatory physical resets' },
        { id: 'frontload_low_demand', label: 'Moving all admin/shallow tasks to post-sprint exhaustion zones' },
        { id: 'somatosensory_grounding', label: 'Ice water & dark-room decompression rituals at 12:30 PM' },
        { id: 'buddy_checkpoint', label: 'External accountability handoff before the afternoon slump' }
      ]
    }
  ],

  // 2. WAITING-MODE PARALYTIC
  waiting_mode_paralyzed: [
    {
      id: 'waiting_threshold',
      question: "How much buffer time before an event triggers your 'Waiting Mode' freeze?",
      subtitle: "Mapping your pre-event temporal interference horizon.",
      category: 'initiation',
      options: [
        { id: 'any_gap', label: 'Any gap under 2 hours feels completely unusable' },
        { id: 'half_day', label: 'A single afternoon appointment compromises my entire morning' },
        { id: 'under_45m', label: 'Only short 30-45 minute gaps create paralysis' },
        { id: 'uncertain_timing', label: 'Only events with vague start times ("sometime after lunch")' }
      ]
    },
    {
      id: 'waiting_cognitive_state',
      question: "What is your internal dialogue while trapped in waiting mode?",
      subtitle: "Identifying the cognitive loop sustaining the freeze response.",
      category: 'focus',
      options: [
        { id: 'fear_of_missing', label: '"If I get immersed, I\'ll lose track of time and miss the call"' },
        { id: 'interruption_dread', label: '"There is no point starting because I\'ll have to stop soon anyway"' },
        { id: 'anticipatory_anxiety', label: 'Rehearsing the upcoming meeting or social interaction repeatedly' },
        { id: 'clock_monitoring', label: 'Constantly glancing at the clock every 90 seconds' }
      ]
    },
    {
      id: 'waiting_filler_behavior',
      question: "What do you default to doing while waiting for the scheduled milestone?",
      subtitle: "Assessing default displacement activities during holding patterns.",
      category: 'recovery',
      options: [
        { id: 'shallow_cleaning', label: 'Tidying desk, organizing tabs, or cleaning irrelevant items' },
        { id: 'passive_consumption', label: 'Refreshing email, Twitter/X, Reddit, or YouTube shorts' },
        { id: 'catatonic_waiting', label: 'Sitting in chair mentally frozen waiting for the notification' },
        { id: 'micro_chores', label: 'Starting 20 tiny inconsequential things without finishing any' }
      ]
    },
    {
      id: 'waiting_calendar_density',
      question: "How do scattered meetings across a day impact your baseline cognitive reserve?",
      subtitle: "Calculating the fragmentation tax on your executive battery.",
      category: 'burnout',
      options: [
        { id: 'catastrophic_drain', label: '3 scattered 30m meetings drain more energy than 8 hours of work' },
        { id: 'severe_friction', label: 'Requires 30+ minutes of re-orientation after every single call' },
        { id: 'moderate_pacing', label: 'I can recover only if there is a minimum 60m uninterrupted block' },
        { id: 'late_night_compensate', label: 'Forces me to do all my actual deep work past 9 PM' }
      ]
    },
    {
      id: 'waiting_protocol_anchor',
      question: "Which intervention would free your trapped pre-meeting time blocks?",
      subtitle: "Setting the schedule architecture rules for your adapted plan.",
      category: 'pacing',
      options: [
        { id: 'meeting_clustering', label: 'Batch all meetings into a single contiguous afternoon block' },
        { id: 'micro_sprint_guard', label: 'Prescribed 15-minute low-risk tasks with countdown timers' },
        { id: 'loud_auditory_fail_safe', label: 'Loud multi-device alarms allowing 100% immersion without fear' },
        { id: 'asynchronous_first', label: 'Protocol to convert synchronous check-ins into async updates' }
      ]
    }
  ],

  // 3. HYPER-FOCUS DRIFTER
  hyperfocus_drifter: [
    {
      id: 'drifter_hijack_vector',
      question: "What most commonly derails your attention into an unintended rabbit hole?",
      subtitle: "Isolating the primary attentional hijack mechanism.",
      category: 'focus',
      options: [
        { id: 'tool_optimization', label: 'Optimizing tools, Notion setups, color themes, or configurations' },
        { id: 'curiosity_tangent', label: 'A single hyper-specific question leading to 40 open Wikipedia/research tabs' },
        { id: 'perfectionist_formatting', label: 'Obsessing over design, typography, or slide aesthetics over substance' },
        { id: 'edge_case_solving', label: 'Solving a minor hypothetical bug that wasn\'t even in scope' }
      ]
    },
    {
      id: 'drifter_time_blindness',
      question: "When you finally emerge from an unintended rabbit hole, what is the realization?",
      subtitle: "Evaluating the severity of temporal distortion.",
      category: 'pacing',
      options: [
        { id: 'hours_vanished', label: '3-4 hours have vanished and the sun has literally moved' },
        { id: 'shock_dread', label: 'Initial euphoric pride followed by sinking dread: "Wait, this wasn\'t the goal"' },
        { id: 'depleted_vitality', label: 'Realizing I haven\'t eaten, drank water, or moved in 5 hours' },
        { id: 'defensive_justification', label: 'Convincing myself the tangent was secretly essential background work' }
      ]
    },
    {
      id: 'drifter_guardrails',
      question: "What currently happens when you try using standard focus timers or blockers?",
      subtitle: "Diagnosing resistance to standard anti-distraction tooling.",
      category: 'initiation',
      options: [
        { id: 'bypass_outsmart', label: 'I outsmart or disable the app blocker within 5 minutes' },
        { id: 'ignore_bells', label: 'The timer chimes and I click "extend by 1 hour" subconsciously' },
        { id: 'frustrated_escape', label: 'The constraint frustrates me so I abandon the work entirely' },
        { id: 'never_set_them', label: 'I forget to turn them on because starting the timer is a barrier' }
      ]
    },
    {
      id: 'drifter_friction_with_boring',
      question: "How do you experience working on crucial tasks that lack dopamine or novelty?",
      subtitle: "Measuring the prefrontal resistance threshold for unstimulating work.",
      category: 'burnout',
      options: [
        { id: 'physical_pain', label: 'Feels like physical nausea or intense neurological resistance' },
        { id: 'instant_sleepiness', label: 'Sudden overpowering fatigue and heavy eyelids' },
        { id: 'urgent_tangent_craving', label: 'My brain immediately invents 10 other urgent "problems" to solve' },
        { id: 'endless_procrastination', label: 'Will clean baseboards or file taxes rather than face the core task' }
      ]
    },
    {
      id: 'drifter_recalibration_anchor',
      question: "Which mechanism would best tether your focus to the actual core mission?",
      subtitle: "Calibrating real-time directional focus locks.",
      category: 'focus',
      options: [
        { id: 'visual_single_task_lock', label: 'Single-task visual lock screen with one sentence objective pinned' },
        { id: 'tangent_parking_lot', label: 'A rapid "Parking Lot" scratchpad to offload curiosity impulses safely' },
        { id: 'gamified_checkpoint', label: '15-minute micro-deliverable milestones with progress feedback' },
        { id: 'dopamine_pairing', label: 'Pairing monotonous tasks with high-stimulation audio/soundtracks' }
      ]
    }
  ],

  // 4. SENSORY-OVERWHELMED SYNTHESIZER
  sensory_overwhelmed: [
    {
      id: 'sensory_drain_source',
      question: "Which environmental factor drains your executive cognitive battery fastest?",
      subtitle: "Mapping your primary sensory vulnerability channels.",
      category: 'sensory',
      options: [
        { id: 'auditory_distraction', label: 'Background chatter, chewing, humming appliances, or unpredictable noise' },
        { id: 'visual_chaos', label: 'Cluttered desk, open browser tabs, moving visual peripherals' },
        { id: 'digital_notifications', label: 'Slack pings, red notification badges, buzzes, and alert popups' },
        { id: 'physical_discomfort', label: 'Uncomfortable chair, scratchy clothes, harsh fluorescent lighting' }
      ]
    },
    {
      id: 'sensory_overload_behavior',
      question: "When your sensory threshold is breached, how does the shutdown present?",
      subtitle: "Recognizing your acute sensory overload signature.",
      category: 'burnout',
      options: [
        { id: 'brain_fog_paralysis', label: 'Instant dense brain fog where simple decisions become impossible' },
        { id: 'sensory_rage', label: 'Intense spike of internal irritation and fight-or-flight panic' },
        { id: 'withdrawal_isolation', label: 'Desperate urge to pull blinds, close laptop, and lie in a dark room' },
        { id: 'compulsive_fidgeting', label: 'Agitation, restlessness, and inability to keep body still' }
      ]
    },
    {
      id: 'sensory_focus_environment',
      question: "Under what environmental conditions do you achieve your deepest cognitive clarity?",
      subtitle: "Identifying your optimal baseline nervous system operating state.",
      category: 'sensory',
      options: [
        { id: 'dead_silence', label: 'Absolute silent cave (earplugs or heavy active noise-canceling)' },
        { id: 'brown_noise_loop', label: 'Continuous low-frequency acoustic drone (brown noise, ambient binaural)' },
        { id: 'cozy_dim_light', label: 'Dim, warm-toned lighting with zero overhead fluorescent bulbs' },
        { id: 'active_body_fidget', label: 'Movement while thinking (walking pad, pacing, fidget tool in hand)' }
      ]
    },
    {
      id: 'sensory_digital_friction',
      question: "How does digital context-switching affect your nervous system throughout the day?",
      subtitle: "Evaluating digital clutter impact on working memory reserves.",
      category: 'focus',
      options: [
        { id: 'rapid_overwhelm', label: 'More than 5 open applications makes my thoughts feel scattered and buzzing' },
        { id: 'tab_hoarding_stress', label: 'I hoard 70 tabs for fear of forgetting, but looking at them causes dread' },
        { id: 'chat_hypervigilance', label: 'Constantly feeling watched and on-edge waiting for incoming messages' },
        { id: 'visual_fatigue', label: 'Screen glare causes physical eye strain and tension headaches by 2 PM' }
      ]
    },
    {
      id: 'sensory_restorative_protocol',
      question: "What restorative ritual resets your nervous system most reliably?",
      subtitle: "Configuring biological decompression breaks into your protocol.",
      category: 'recovery',
      options: [
        { id: 'dark_room_decompression', label: '10 minutes of complete darkness with eyes closed and no screens' },
        { id: 'temperature_shock', label: 'Cold water splash on face or drinking ice water (mammalian dive reflex)' },
        { id: 'outdoor_nature_walk', label: 'Stepping outside into fresh air with natural horizon distance vision' },
        { id: 'heavy_compression', label: 'Weighted blanket, deep breathing, or progressive muscle relaxation' }
      ]
    }
  ],

  // 5. LAST-MILE ABANDONER
  last_mile_abandoner: [
    {
      id: 'lastmile_wall_moment',
      question: "At what exact milestone does the 'Wall of Awful' typically drop for you?",
      subtitle: "Pinpointing the psychological friction wall in your project cycle.",
      category: 'initiation',
      options: [
        { id: 'formatting_cleanup', label: 'The core ideas are solved, but formatting/tidying feels agonizing' },
        { id: 'sending_delivering', label: 'The deliverable is 99% done, but clicking "Send" or publishing triggers terror' },
        { id: 'admin_logging', label: 'Filling in tickets, updating spreadsheets, or writing summary documentation' },
        { id: 'novelty_zero', label: 'The moment the intellectual challenge is proven and only manual execution remains' }
      ]
    },
    {
      id: 'lastmile_procrastination_form',
      question: "When avoiding that final 10% polish, what do you usually do instead?",
      subtitle: "Analyzing novelty-seeking displacement behaviors.",
      category: 'focus',
      options: [
        { id: 'spawn_new_project', label: 'Excitedly start a brand new project with 10x higher energy' },
        { id: 'endless_revising', label: 'Micro-edit the beginning repeatedly instead of finishing the end' },
        { id: 'shelf_abandon', label: 'Leave it in a "Drafts" folder indefinitely and never look at it again' },
        { id: 'distraction_spiral', label: 'Fall into total avoidance and dread until an angry email arrives' }
      ]
    },
    {
      id: 'lastmile_perfectionism',
      question: "How much does perfectionism or fear of judgment feed the completion block?",
      subtitle: "Separating boredom-driven fatigue from vulnerability-driven delay.",
      category: 'burnout',
      options: [
        { id: 'fear_of_exposure', label: 'As long as it is unfinished, it cannot be judged or criticized as inadequate' },
        { id: 'dopamine_flatline', label: 'It\'s pure boredom: zero dopamine left once the problem is solved' },
        { id: 'exhaustion_depletion', label: 'I exhausted all my energy building the first 90% and have nothing left' },
        { id: 'both_equal', label: 'A toxic mix of intellectual boredom combined with imposter syndrome' }
      ]
    },
    {
      id: 'lastmile_unfinished_graveyard',
      question: "What is the psychological toll of your backlog of 90%-done projects?",
      subtitle: "Measuring psychic weight of unfinished open loops.",
      category: 'recovery',
      options: [
        { id: 'crushing_guilt', label: 'A constant hum of shame and feeling like a chronic underachiever' },
        { id: 'cognitive_leak', label: 'Mental RAM is constantly occupied tracking open unfinished loops' },
        { id: 'imposter_proof', label: 'It serves as internal evidence that I can\'t execute like a professional' },
        { id: 'creative_frustration', label: 'Deep sadness because great ideas never see the light of day' }
      ]
    },
    {
      id: 'lastmile_closing_protocol',
      question: "Which tactic would help you push through the final 10% and ship?",
      subtitle: "Selecting your closure and shipping calibration rule.",
      category: 'pacing',
      options: [
        { id: 'b_minus_standard', label: 'A strict "B-minus work is complete work" permission framework' },
        { id: 'body_double_handoff', label: 'Live co-working or body-doubling for the final 20 minutes of shipping' },
        { id: 'hard_finish_timer', label: 'A 15-minute "Ugly Draft Ship" countdown with zero revisions permitted' },
        { id: 'delegate_handoff', label: 'Handing off raw output to a teammate or AI for final formatting polish' }
      ]
    }
  ]
};

// Fallback legacy questions for backwards compatibility
export const ONBOARDING_QUESTIONS = ARCHETYPE_QUESTION_SETS.sprint_redliner;

export const getQuestionsForArchetype = (archetypeId?: string): DiagnosticQuestion[] => {
  if (archetypeId && ARCHETYPE_QUESTION_SETS[archetypeId]) {
    return ARCHETYPE_QUESTION_SETS[archetypeId];
  }
  return ARCHETYPE_QUESTION_SETS.sprint_redliner;
};

export const SYSTEM_INSTRUCTION = `You are an expert neuro-behavioral analyst and productivity coach. 
Your goal is to support users with neuro-divergent traits (ADHD, Autism, Dyslexia, etc.).

CORE CONSTRAINT - BURNOUT PREVENTION:
You MUST analyze the 'history' for signs of 'Neural Redlining'. 
- Warning Signs: Consistent 4+ hour hyperfocus blocks without breaks, "waiting mode" anxiety, or frequent late-night entries.
- If burnout risk is detected: Trigger the 'burnoutAlert' object.

PLANNING OPTIMIZATIONS:
1. TASK DECOMPOSITION: Break tasks > 45m into 15m chunks.
2. TRANSITION BUFFERS: Schedule 10m gaps for neuro-regulation.
3. MOMENTUM START (QUICK WINS): Identify 1-3 tasks that take <5 minutes for immediate neuro-chemical rewards.

OUTPUT FORMAT (JSON ONLY):
- 'insights': Diagnostic patterns and behavioral analysis.
- 'burnoutAlert': { level: 'low'|'moderate'|'critical', message: 'Specific warning', recoveryAction: 'Immediate sensory/cognitive fix' } (Return null if no risk).
- 'quickWins': Array of 1-3 specific, dopamine-triggering tasks under 5 minutes.
- 'adaptedPlan': The schedule with [High/Med/Low Load] tags.
- 'explanation': The 'Why' behind the specific sequence.`;

export const PROFILE_ANALYSIS_INSTRUCTION = `You are a clinical neuro-psychologist specialized in Neurodiversity. 
Analyze the questionnaire results to provide a definitive diagnosis on the cognitive spectrum.

DIAGNOSTIC CRITERIA MAPPING:
- If User is 'Visual' + 'Organization' struggle + 'Hypersensitive' -> Likely ASD / Dyslexia profile.
- If User is 'Verbal' + 'Initiation' struggle + 'Seeker' -> Likely ADHD profile.
- If User is 'Neutral' + 'Completion' struggle -> Likely General Executive Dysfunction.

Output JSON: 
{ 
  "primaryType": "Clear Label", 
  "traits": ["3 distinct traits"], 
  "recommendations": ["3 calibrations"],
  "scores": {
    "focus": 0-100,
    "sensory": 0-100,
    "processing": 0-100,
    "executive": 0-100
  }
}`;
