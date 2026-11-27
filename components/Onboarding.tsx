import React, { useState, useMemo } from 'react';
import { 
  BrainCircuit, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  ShieldCheck, 
  Activity, 
  Target, 
  Zap, 
  Fingerprint,
  Cpu,
  Dna,
  AlertTriangle,
  Radar,
  Flame,
  Hourglass,
  Compass,
  GraduationCap,
  Palette,
  Building2,
  Rocket,
  SkipForward,
  X
} from 'lucide-react';
import { ARCHETYPES, getQuestionsForArchetype, DiagnosticQuestion } from '../constants';
import { NeuralProfile, NeuralScores } from '../types';
import { generateNeuralProfile, getClientFallbackProfile } from '../services/geminiService';
import { ThemeMode, ThemeToggle } from './ThemeToggle';

export interface UserRoleOption {
  id: 'academic' | 'creative' | 'corporate' | 'freelance';
  label: string;
  sublabel: string;
  icon: React.ElementType;
  color: string;
  activeBg: string;
  activeBorder: string;
  badge: string;
  accentGradient: string;
}

export const USER_ROLES: UserRoleOption[] = [
  {
    id: 'academic',
    label: 'Student / Scholar',
    sublabel: 'Exams, thesis, research papers & study blocks',
    icon: GraduationCap,
    color: 'text-amber-600 dark:text-amber-400',
    activeBg: 'bg-amber-50/90 dark:bg-amber-500/15',
    activeBorder: 'border-amber-400 dark:border-amber-500/60 shadow-amber-500/10',
    badge: 'Academic',
    accentGradient: 'from-amber-500/20 to-orange-500/5'
  },
  {
    id: 'creative',
    label: 'Artist / Creative',
    sublabel: 'Design, writing, audio, media & nonlinear flow',
    icon: Palette,
    color: 'text-violet-600 dark:text-pink-400',
    activeBg: 'bg-violet-50/90 dark:bg-pink-500/15',
    activeBorder: 'border-violet-400 dark:border-pink-500/60 shadow-violet-500/10',
    badge: 'Creative',
    accentGradient: 'from-pink-500/20 to-purple-500/5'
  },
  {
    id: 'corporate',
    label: 'Corporate Professional',
    sublabel: 'Enterprise syncs, stakeholder triage & sprints',
    icon: Building2,
    color: 'text-blue-600 dark:text-blue-400',
    activeBg: 'bg-blue-50/90 dark:bg-blue-500/15',
    activeBorder: 'border-blue-500 dark:border-blue-500/60 shadow-blue-500/10',
    badge: 'Corporate',
    accentGradient: 'from-blue-500/20 to-cyan-500/5'
  },
  {
    id: 'freelance',
    label: 'Freelancer / Founder',
    sublabel: 'Self-directed ops, client shipping & multi-hat focus',
    icon: Rocket,
    color: 'text-emerald-600 dark:text-emerald-400',
    activeBg: 'bg-emerald-50/90 dark:bg-emerald-500/15',
    activeBorder: 'border-emerald-500 dark:border-emerald-500/60 shadow-emerald-500/10',
    badge: 'Founder / Solo',
    accentGradient: 'from-emerald-500/20 to-teal-500/5'
  }
];

interface OnboardingProps {
  onComplete: (profile: NeuralProfile) => void;
  isRediagnosis?: boolean;
  onCancel?: () => void;
  theme?: ThemeMode;
  onChangeTheme?: (next: ThemeMode) => void;
}

const NeuralMap: React.FC<{ scores: NeuralScores }> = ({ scores }) => {
  const size = 300;
  const center = size / 2;
  const maxRadius = size * 0.38;

  const points = [
    { label: 'EXECUTIVE', value: scores.executive, x: center, y: center - (scores.executive / 100) * maxRadius },
    { label: 'SENSORY', value: scores.sensory, x: center + (scores.sensory / 100) * maxRadius, y: center },
    { label: 'PROCESSING', value: scores.processing, x: center, y: center + (scores.processing / 100) * maxRadius },
    { label: 'FOCUS', value: scores.focus, x: center - (scores.focus / 100) * maxRadius, y: center }
  ];

  const polygonPath = points.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <div className="relative w-full aspect-square flex items-center justify-center group/map py-10 scale-110">
      <div className="absolute inset-0 bg-blue-500/10 rounded-full blur-[100px] scale-75 animate-pulse" />
      
      <svg width={size} height={size} className="overflow-visible relative z-10">
        <defs>
          <linearGradient id="polyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.75" />
            <stop offset="55%" stopColor="#8b5cf6" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.35" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <style>{`
            @keyframes scan {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            .radar-scanner {
              transform-origin: center;
              animation: scan 4s linear infinite;
            }
          `}</style>
        </defs>

        <line 
          x1={center} y1={center} x2={center} y2={center - maxRadius} 
          className="stroke-blue-500/25 stroke-1 radar-scanner" 
        />

        {[0.25, 0.5, 0.75, 1].map((r, i) => (
          <circle
            key={i}
            cx={center}
            cy={center}
            r={maxRadius * r}
            className="fill-none stroke-slate-300 dark:stroke-slate-700/40"
            strokeWidth="1"
          />
        ))}

        <line x1={center - maxRadius} y1={center} x2={center + maxRadius} y2={center} className="stroke-slate-300/70 dark:stroke-slate-700/30 stroke-1" />
        <line x1={center} y1={center - maxRadius} x2={center} y2={center + maxRadius} className="stroke-slate-300/70 dark:stroke-slate-700/30 stroke-1" />

        <polygon
          points={polygonPath}
          fill="url(#polyGrad)"
          className="stroke-blue-500 dark:stroke-blue-400 stroke-2 transition-all duration-[2000ms] ease-out"
          filter="url(#glow)"
        />

        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="5" className="fill-blue-600 dark:fill-white shadow-xl animate-pulse" />
            <text
              x={i === 1 ? center + maxRadius + 25 : i === 3 ? center - maxRadius - 25 : center}
              y={i === 0 ? center - maxRadius - 20 : i === 2 ? center + maxRadius + 30 : center + 5}
              textAnchor="middle"
              className="fill-slate-600 dark:fill-slate-400 font-bold text-[9px] tracking-[0.35em] uppercase"
            >
              {p.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};

const AnimatedFeatureItem: React.FC<{ 
  icon: React.ElementType, 
  text: string, 
  delay: number,
  variant: 'orange' | 'blue'
}> = ({ icon: Icon, text, delay, variant }) => {
  return (
    <div 
      className="group relative bg-white/80 dark:bg-slate-900/60 border border-sky-900/10 dark:border-slate-700/50 rounded-2xl p-5 transition-all duration-500 animate-in fade-in slide-in-from-bottom-4 hover:border-blue-400/40 dark:hover:border-white/20 shadow-sm"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'backwards' }}
    >
      <div className="flex items-center gap-4 relative z-10">
        <div className={`p-3 rounded-xl transition-all duration-500 ${
          variant === 'orange'
            ? 'bg-amber-500/10 text-amber-600 dark:text-orange-400'
            : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
        }`}>
          <Icon className="w-5 h-5 transition-transform duration-500 group-hover:scale-110" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-bold mb-1">
            {variant === 'orange' ? 'Neural Trait' : 'Calibration'}
          </span>
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight">{text}</span>
        </div>
      </div>
    </div>
  );
};

export const Onboarding: React.FC<OnboardingProps> = ({ 
  onComplete, 
  isRediagnosis = false, 
  onCancel,
  theme = 'light',
  onChangeTheme
}) => {
  const [selectedRole, setSelectedRole] = useState<'academic' | 'creative' | 'corporate' | 'freelance'>('corporate');
  const [selectedArchetypeId, setSelectedArchetypeId] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({ context: 'corporate' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<NeuralProfile | null>(null);

  const questions: DiagnosticQuestion[] = useMemo(() => {
    return getQuestionsForArchetype(selectedArchetypeId || undefined);
  }, [selectedArchetypeId]);

  const activeArchetype = useMemo(() => {
    return ARCHETYPES.find(a => a.id === selectedArchetypeId) || null;
  }, [selectedArchetypeId]);

  const currentQ = questions[step] || questions[0];

  const handleSelectRole = (roleId: 'academic' | 'creative' | 'corporate' | 'freelance') => {
    setSelectedRole(roleId);
    setAnswers(prev => ({ ...prev, context: roleId }));
  };

  const handleSelectArchetype = (archetypeId: string) => {
    setSelectedArchetypeId(archetypeId);
    setAnswers(prev => ({ ...prev, archetype: archetypeId, context: selectedRole }));
    setStep(0);
  };

  const handleSelect = (optionId: string) => {
    setAnswers(prev => ({ ...prev, [currentQ.id]: optionId }));
    if (step < questions.length - 1) {
      setStep(s => s + 1);
    }
  };

  const handleSkipQuestion = () => {
    if (!answers[currentQ.id] && currentQ.options.length > 0) {
      const defaultOption = currentQ.options[0].id;
      setAnswers(prev => ({ ...prev, [currentQ.id]: defaultOption }));
    }
    if (step < questions.length - 1) {
      setStep(s => s + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      const payloadAnswers = {
        ...answers,
        context: selectedRole,
        archetype: selectedArchetypeId || 'sprint_redliner'
      };
      const fallback = getClientFallbackProfile(payloadAnswers);
      const apiTimeout = new Promise<NeuralProfile>((_, reject) => 
        setTimeout(() => reject(new Error('timeout')), 900)
      );
      
      const profile = await Promise.race([
        generateNeuralProfile(payloadAnswers),
        apiTimeout
      ]).catch(() => fallback);

      await new Promise(r => setTimeout(r, 300));
      setResult(profile || fallback);
    } catch {
      setResult(getClientFallbackProfile({ ...answers, context: selectedRole, archetype: selectedArchetypeId || 'sprint_redliner' }));
    } finally {
      setIsProcessing(false);
    }
  };

  const getArchetypeIcon = (iconName: string) => {
    switch (iconName) {
      case 'Flame': return Flame;
      case 'Hourglass': return Hourglass;
      case 'Compass': return Compass;
      case 'ShieldAlert': return AlertTriangle;
      case 'Target': return Target;
      default: return BrainCircuit;
    }
  };

  if (result) {
    return (
      <div className="min-h-screen bg-[#EEF7FA] dark:bg-[#020617] flex items-center justify-center p-6 relative overflow-hidden transition-colors duration-300">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-blue-400/15 dark:bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-[450px] h-[450px] bg-violet-400/15 dark:bg-violet-600/10 rounded-full blur-[140px] pointer-events-none" />

        {onChangeTheme && (
          <div className="fixed top-6 right-6 z-50">
            <ThemeToggle theme={theme} onChangeTheme={onChangeTheme} />
          </div>
        )}

        <div className="max-w-6xl w-full bg-white/85 dark:bg-slate-900/80 border border-sky-900/10 dark:border-white/10 rounded-[3rem] p-8 md:p-14 shadow-[0_24px_80px_rgba(37,99,235,0.1)] dark:shadow-2xl backdrop-blur-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-700">
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-7 flex flex-col">
              <div className="flex items-center gap-4 mb-10">
                <div className="bg-blue-500/10 p-3 rounded-2xl border border-blue-500/20">
                  <ShieldCheck className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] uppercase tracking-[0.35em] text-blue-600 dark:text-blue-400 font-bold">
                    Neural Signature Detected
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Calibration verified
                  </span>
                </div>
              </div>

              <div className="mb-12">
                <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 mb-3">
                  <Dna className="w-4 h-4" />
                  <span>Spectral Profile</span>
                </div>
                <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-5 leading-tight">
                  {result.primaryType}
                </h1>
                <p className="text-slate-600 dark:text-slate-400 text-base md:text-lg leading-relaxed max-w-xl">
                  Your behavioral substrate has been mapped. We detected specific focus patterns that benefit from structured pacing and sensory buffers.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-grow">
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.25em] flex items-center gap-2.5">
                    <Fingerprint className="w-4 h-4 text-amber-500" />
                    Neural Phenotype
                  </h3>
                  <div className="space-y-3">
                    {result.traits.map((trait, i) => (
                      <AnimatedFeatureItem key={i} icon={Activity} text={trait} delay={100 * i} variant="orange" />
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.25em] flex items-center gap-2.5">
                    <Zap className="w-4 h-4 text-blue-500" />
                    Active Controls
                  </h3>
                  <div className="space-y-3">
                    {result.recommendations.map((rec, i) => (
                      <AnimatedFeatureItem key={i} icon={Cpu} text={rec} delay={100 * i + 300} variant="blue" />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 flex flex-col justify-between">
              <div className="bg-[#F2F9FC] dark:bg-slate-950/50 border border-sky-900/10 dark:border-white/10 rounded-[2.5rem] p-8 shadow-sm relative">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Radar className="w-4 h-4 text-blue-500/60" />
                  <h3 className="text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.35em]">Prominence Map</h3>
                </div>
                <NeuralMap scores={result.scores} />
                <div className="mt-6 grid grid-cols-2 gap-6 pt-6 border-t border-sky-900/10 dark:border-white/10">
                  <div className="text-center">
                    <div className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">{result.scores.focus}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold tracking-widest mt-1">Attention</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">{result.scores.executive}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold tracking-widest mt-1">Logic</div>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <button
                  onClick={() => onComplete(result)}
                  className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 dark:from-white dark:to-slate-100 text-white dark:text-slate-950 py-6 rounded-2xl font-bold text-xl shadow-xl shadow-blue-600/20 dark:shadow-white/10 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-4 group"
                >
                  <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                  Enter NeuralPlan
                  <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#EEF7FA] dark:bg-[#020617] flex items-center justify-center p-4 md:p-6 relative overflow-hidden transition-colors duration-300">
      {/* Relaxing frosted-ice / obsidian ambient lighting matching logo colors */}
      <div className="absolute top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[620px] h-[620px] bg-blue-400/15 dark:bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[480px] h-[480px] bg-violet-400/15 dark:bg-indigo-600/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute top-12 right-12 w-[320px] h-[320px] bg-amber-300/15 dark:bg-amber-500/5 rounded-full blur-[110px] pointer-events-none" />

      <div className="max-w-4xl w-full bg-white/85 dark:bg-slate-900/80 border border-sky-900/10 dark:border-white/10 rounded-[2.5rem] p-6 sm:p-10 md:p-12 shadow-[0_24px_80px_rgba(37,99,235,0.08)] dark:shadow-2xl backdrop-blur-2xl relative overflow-hidden">
        
        {isProcessing && (
          <div className="absolute inset-0 bg-[#EEF7FA]/95 dark:bg-slate-950/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300">
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-full border-4 border-blue-500/20 border-t-blue-600 dark:border-t-blue-400 animate-spin" />
              <BrainCircuit className="w-9 h-9 text-blue-600 dark:text-blue-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">
              Synthesizing Cognitive Profile...
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm max-w-sm">
              Analyzing responses across {activeArchetype?.name || 'Neuro-Archetype'} vectors to formulate your baseline.
            </p>
          </div>
        )}

        {error ? (
          <div className="relative z-10 text-center py-10 space-y-6">
            <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-500 dark:text-red-400">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Diagnostic Notice</h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm max-w-md mx-auto">{error}</p>
            </div>
            <button
              onClick={() => {
                const profile = getClientFallbackProfile(answers);
                setResult(profile);
              }}
              className="w-full bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              Synthesize Baseline Profile
            </button>
            <button 
              onClick={() => setError(null)}
              className="text-slate-500 text-xs font-semibold uppercase tracking-widest hover:text-slate-800 dark:hover:text-slate-300 transition-colors"
            >
              Back to Questions
            </button>
          </div>
        ) : !selectedArchetypeId ? (
          <div className="relative z-10 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-sky-900/10 dark:border-white/10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl overflow-hidden border border-sky-900/10 dark:border-white/15 shadow-md shrink-0 bg-[#eaf6f9]">
                  <img
                    src="/assets/aistudio/NeuralplanPP_fdb39126.jpeg"
                    alt="NeuralPlan"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                    <span className="font-bold text-blue-600 dark:text-blue-400">Step 1 of 2</span>
                    <span aria-hidden="true">·</span>
                    <span>{isRediagnosis ? 'Recalibration Diagnostic' : 'Archetype Identification'}</span>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-0.5">
                    {isRediagnosis ? 'Re-calibrate Your Productivity Archetype' : 'Select Your Primary Productivity Archetype'}
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
                {onChangeTheme && (
                  <ThemeToggle theme={theme} onChangeTheme={onChangeTheme} />
                )}
                {onCancel && (
                  <button
                    type="button"
                    onClick={onCancel}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all border border-slate-200 dark:border-white/10 flex items-center gap-1.5 whitespace-nowrap shrink-0"
                    title="Cancel recalibration and return to workspace"
                  >
                    <X className="w-4 h-4" />
                    <span>Cancel</span>
                  </button>
                )}
              </div>
            </div>

            {/* Role Context Selector */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400">
                  Your Work Environment &amp; Focus Context
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  Calibrates schedule constraints
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {USER_ROLES.map((role) => {
                  const RoleIcon = role.icon;
                  const isSelected = selectedRole === role.id;
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => handleSelectRole(role.id)}
                      className={`text-left p-4 rounded-2xl border-2 transition-all duration-200 relative overflow-hidden group flex flex-col justify-between ${
                        isSelected 
                          ? `${role.activeBg} ${role.activeBorder} shadow-md scale-[1.01]` 
                          : 'bg-[#F3FAFC] dark:bg-slate-900/60 border-sky-900/10 dark:border-white/10 hover:border-blue-400/50 dark:hover:border-white/25 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-3">
                        <div className={`p-2.5 rounded-xl border transition-all ${
                          isSelected 
                            ? `bg-white dark:bg-slate-950/80 border-sky-900/10 dark:border-white/20 ${role.color}`
                            : 'bg-white/80 dark:bg-slate-800/80 border-sky-900/10 dark:border-white/5 text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'
                        }`}>
                          <RoleIcon className="w-5 h-5 transition-transform group-hover:scale-110" />
                        </div>
                      </div>
                      <div>
                        <span className={`text-sm font-bold block transition-colors ${
                          isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-800 dark:text-slate-200'
                        }`}>
                          {role.label}
                        </span>
                        <p className="text-[11px] leading-snug text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                          {role.sublabel}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between mb-3 pt-4 border-t border-sky-900/10 dark:border-white/10">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400">
                Select Your Dominant Productivity Block
              </span>
              <span className="text-xs text-slate-500 font-mono">
                5 tailored diagnostic questions
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3.5 mb-8">
              {ARCHETYPES.map((arch) => {
                const IconComp = getArchetypeIcon(arch.iconName);
                return (
                  <button
                    key={arch.id}
                    onClick={() => handleSelectArchetype(arch.id)}
                    className={`text-left p-5 md:p-6 rounded-3xl border transition-all duration-200 group relative overflow-hidden bg-white/90 dark:bg-slate-950/60 bg-gradient-to-r ${arch.gradient} ${arch.borderAccent} hover:shadow-lg active:scale-[0.99]`}
                  >
                    <div className="flex items-start justify-between gap-4 relative z-10">
                      <div className="flex items-start gap-4">
                        <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-slate-900/80 border border-sky-900/10 dark:border-white/10 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5 transition-all shadow-sm">
                          <IconComp className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white">
                              {arch.name}
                            </h3>
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                              · {arch.badge}
                            </span>
                          </div>
                          <p className="text-xs text-blue-700 dark:text-blue-300 font-semibold tracking-wide">
                            {arch.tagline} · <span className="text-slate-600 dark:text-slate-400 font-normal">Primary Block: {arch.primaryBlock}</span>
                          </p>
                          <p className="text-xs md:text-sm text-slate-700 dark:text-slate-300 leading-relaxed pt-1">
                            {arch.description}
                          </p>
                        </div>
                      </div>

                      <div className="hidden sm:flex items-center gap-1 shrink-0 text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-white group-hover:translate-x-1 transition-all self-center">
                        <span className="text-xs font-bold uppercase tracking-widest">
                          Assess
                        </span>
                        <ChevronRight className="w-5 h-5" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-sky-900/10 dark:border-white/10">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Selecting an archetype loads 5 targeted diagnostic questions.
              </span>
              <button
                onClick={() => {
                  const fallback = getClientFallbackProfile({ archetype: 'sprint_redliner', context: selectedRole });
                  onComplete(fallback);
                }}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap shrink-0"
              >
                Skip &amp; Use Default Profile →
              </button>
            </div>
          </div>
        ) : (
          <div className="relative z-10 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10 pb-6 border-b border-sky-900/10 dark:border-white/10">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSelectedArchetypeId(null)}
                  className="p-3 rounded-2xl bg-[#F1F8FB] dark:bg-slate-800/80 hover:bg-sky-100 dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-sky-900/10 dark:border-white/10 transition-all"
                  title="Change Archetype"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-bold text-blue-600 dark:text-blue-400">Step 2 of 2</span>
                    {activeArchetype && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-semibold text-slate-700 dark:text-blue-300">{activeArchetype.name}</span>
                      </>
                    )}
                  </div>
                  <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-0.5 tabular-nums">
                    Question {step + 1} of {questions.length}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-3 self-start sm:self-auto">
                <div className="flex items-center gap-1.5">
                  {questions.map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        idx === step
                          ? 'w-7 bg-blue-600 dark:bg-blue-500'
                          : idx < step
                          ? 'w-3 bg-emerald-500'
                          : 'w-2.5 bg-slate-200 dark:bg-slate-800'
                      }`}
                    />
                  ))}
                </div>
                {onChangeTheme && (
                  <ThemeToggle theme={theme} onChangeTheme={onChangeTheme} compact />
                )}
                {onCancel && (
                  <button
                    type="button"
                    onClick={onCancel}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                    title="Cancel recalibration and return to workspace"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="mb-8">
              {currentQ.subtitle && (
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
                  {currentQ.category} · {currentQ.subtitle}
                </span>
              )}
              <h3 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white leading-tight tracking-tight">
                {currentQ.question}
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-3.5 mb-10">
              {currentQ.options.map((opt) => {
                const isSelected = answers[currentQ.id] === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleSelect(opt.id)}
                    className={`text-left p-5 md:p-6 rounded-2xl border-2 transition-all flex items-center justify-between group relative overflow-hidden ${
                      isSelected 
                        ? 'bg-blue-50 dark:bg-blue-600/20 border-blue-500 text-slate-900 dark:text-white shadow-md shadow-blue-500/10' 
                        : 'border-sky-900/10 dark:border-white/10 bg-[#F4FAFD] dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:border-blue-400/60 dark:hover:border-white/25 hover:bg-white dark:hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-4 relative z-10 flex-grow">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        isSelected ? 'border-blue-600 dark:border-blue-400 bg-blue-600 dark:bg-blue-500 text-white' : 'border-slate-300 dark:border-slate-600'
                      }`}>
                        {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <span className="text-base md:text-lg font-semibold leading-snug">
                        {opt.label}
                      </span>
                    </div>

                    <ChevronRight className={`w-5 h-5 transition-all relative z-10 shrink-0 ml-4 ${
                      isSelected ? 'opacity-100 translate-x-1 text-blue-600 dark:text-blue-400' : 'opacity-0 group-hover:opacity-100 text-slate-400'
                    }`} />
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-sky-900/10 dark:border-white/10">
              <button 
                type="button"
                onClick={() => {
                  if (step === 0) {
                    setSelectedArchetypeId(null);
                  } else {
                    setStep(s => s - 1);
                  }
                }}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-[#F1F8FB] dark:bg-slate-800/80 hover:bg-sky-100 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 border border-sky-900/10 dark:border-white/10 font-semibold text-xs transition-all flex items-center justify-center gap-2 active:scale-95 group"
              >
                <ChevronLeft className="w-4 h-4 text-slate-500 group-hover:-translate-x-0.5 transition-transform" />
                <span>{step === 0 ? 'Change Archetype' : 'Back'}</span>
              </button>

              <div className="flex items-center gap-3 order-last sm:order-none">
                {step === questions.length - 1 && answers[currentQ.id] ? (
                  <button
                    type="button"
                    onClick={handleFinish}
                    className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white px-8 py-3.5 rounded-xl font-bold shadow-lg shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2.5 text-sm"
                  >
                    <span>Synthesize Profile</span>
                    <Sparkles className="w-4 h-4 text-amber-200" />
                  </button>
                ) : (
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                    Question <strong className="text-slate-900 dark:text-white">{step + 1}</strong> of <strong className="text-slate-900 dark:text-white">{questions.length}</strong>
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleSkipQuestion}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-[#F1F8FB] dark:bg-slate-800/60 hover:bg-sky-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 border border-sky-900/10 dark:border-white/10 font-semibold text-xs transition-all flex items-center justify-center gap-2 active:scale-95 group"
                title="Skip this question and use default baseline for this parameter"
              >
                <span>{step === questions.length - 1 ? 'Skip & Finish' : 'Skip Question'}</span>
                <SkipForward className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            <div className="mt-8 text-center">
              <button
                onClick={() => {
                  const fallback = getClientFallbackProfile({ 
                    ...answers, 
                    context: selectedRole,
                    archetype: selectedArchetypeId || 'sprint_redliner' 
                  });
                  onComplete(fallback);
                }}
                className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                Skip Assessment &amp; Launch Dashboard (Calibrate Later) →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
