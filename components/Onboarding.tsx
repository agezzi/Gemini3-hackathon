
import React, { useState } from 'react';
import { 
  BrainCircuit, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  Loader2, 
  ShieldCheck, 
  Activity, 
  Target, 
  Zap, 
  Fingerprint,
  Cpu,
  Workflow,
  Search,
  Dna,
  Layers
} from 'lucide-react';
import { ONBOARDING_QUESTIONS } from '../constants';
import { NeuralProfile, NeuralScores } from '../types';
import { generateNeuralProfile } from '../services/geminiService';

interface OnboardingProps {
  onComplete: (profile: NeuralProfile) => void;
}

const NeuralMap: React.FC<{ scores: NeuralScores }> = ({ scores }) => {
  const size = 260;
  const center = size / 2;
  const maxRadius = size * 0.35;

  const points = [
    { label: 'EXECUTIVE', value: scores.executive, x: center, y: center - (scores.executive / 100) * maxRadius },
    { label: 'SENSORY', value: scores.sensory, x: center + (scores.sensory / 100) * maxRadius, y: center },
    { label: 'PROCESSING', value: scores.processing, x: center, y: center + (scores.processing / 100) * maxRadius },
    { label: 'FOCUS', value: scores.focus, x: center - (scores.focus / 100) * maxRadius, y: center }
  ];

  const polygonPath = points.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <div className="relative w-full aspect-square flex items-center justify-center group/map py-10">
      <div className="absolute inset-0 bg-blue-500/10 rounded-full blur-[80px] scale-75 animate-pulse" />
      
      <svg width={size} height={size} className="overflow-visible relative z-10">
        <defs>
          <linearGradient id="polyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.4" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Radar Rings */}
        {[0.25, 0.5, 0.75, 1].map((r, i) => (
          <circle
            key={i}
            cx={center}
            cy={center}
            r={maxRadius * r}
            className="fill-none stroke-slate-700/30"
            strokeWidth="1"
          />
        ))}

        {/* Data Shape */}
        <polygon
          points={polygonPath}
          fill="url(#polyGrad)"
          className="stroke-blue-400 stroke-2 transition-all duration-[2000ms] ease-out"
          filter="url(#glow)"
        />

        {/* Labels & Data Points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" className="fill-white shadow-xl animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
            <text
              x={i === 1 ? center + maxRadius + 15 : i === 3 ? center - maxRadius - 15 : center}
              y={i === 0 ? center - maxRadius - 15 : i === 2 ? center + maxRadius + 20 : center + 5}
              textAnchor="middle"
              className="fill-slate-500 font-black text-[8px] tracking-[0.3em] uppercase"
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
  icon: React.ReactNode, 
  text: string, 
  delay: number,
  variant: 'orange' | 'blue'
}> = ({ icon, text, delay, variant }) => {
  return (
    <div 
      className={`group relative bg-slate-900/60 border border-slate-700/50 rounded-2xl p-4 transition-all duration-500 animate-in fade-in slide-in-from-bottom-4`}
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'backwards' }}
    >
      <div className="flex items-center gap-4 relative z-10">
        <div className={`p-2.5 rounded-xl transition-all duration-700 ${
          variant === 'orange' ? 'bg-orange-500/10 text-orange-400 group-hover:bg-orange-500/20' : 'bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20'
        }`}>
          <div className="animate-pulse group-hover:scale-125 transition-transform duration-500">
            {icon}
          </div>
        </div>
        <div className="flex flex-col">
          <span className="text-[8px] uppercase tracking-widest text-slate-500 font-black mb-0.5">{variant === 'orange' ? 'Neural Trait' : 'Calibration'}</span>
          <span className="text-sm font-bold text-slate-100">{text}</span>
        </div>
      </div>
    </div>
  );
};

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<NeuralProfile | null>(null);

  const currentQ = ONBOARDING_QUESTIONS[step];

  const handleSelect = (optionId: string) => {
    setAnswers(prev => ({ ...prev, [currentQ.id]: optionId }));
    if (step < ONBOARDING_QUESTIONS.length - 1) {
      setStep(s => s + 1);
    }
  };

  const handleFinish = async () => {
    setIsProcessing(true);
    try {
      const profile = await generateNeuralProfile(answers);
      setResult(profile);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (result) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 font-inter">
        <div className="max-w-5xl w-full bg-slate-900/80 border border-white/5 rounded-[3rem] p-10 md:p-14 shadow-2xl backdrop-blur-3xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-1000">
          <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.1),transparent_50%)]" />
          
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-16">
            <div className="lg:col-span-7 flex flex-col">
              <div className="flex items-center gap-4 mb-10">
                <div className="bg-blue-500/10 p-3 rounded-2xl border border-blue-500/20">
                  <ShieldCheck className="w-6 h-6 text-blue-400" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-[0.5em] text-blue-400 font-black">Neural Signature Detected</span>
                  <span className="text-[9px] text-slate-500 font-mono uppercase tracking-widest">Calibration_Verified</span>
                </div>
              </div>

              <div className="mb-14">
                <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter mb-4 leading-none">
                  {result.primaryType}
                </h1>
                <p className="text-slate-400 text-lg font-medium leading-relaxed max-w-xl">
                  Your behavioral substrate has been mapped. We've detected high-variance focus patterns that require structured reinforcement.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-grow">
                <div className="space-y-6">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] flex items-center gap-3">
                    <Fingerprint className="w-4 h-4 text-orange-500" />
                    Detected Traits
                  </h3>
                  <div className="space-y-3">
                    {result.traits.map((trait, i) => (
                      <AnimatedFeatureItem key={i} icon={<Activity/>} text={trait} delay={100 * i} variant="orange" />
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] flex items-center gap-3">
                    <Zap className="w-4 h-4 text-blue-500" />
                    Active Calibrations
                  </h3>
                  <div className="space-y-3">
                    {result.recommendations.map((rec, i) => (
                      <AnimatedFeatureItem key={i} icon={<Cpu/>} text={rec} delay={100 * i + 300} variant="blue" />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 flex flex-col justify-between">
              <div className="bg-slate-950/40 border border-white/5 rounded-[2.5rem] p-8 shadow-2xl">
                <h3 className="text-center text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] mb-8">Prominence Map</h3>
                <NeuralMap scores={result.scores} />
                <div className="mt-8 grid grid-cols-2 gap-6 pt-8 border-t border-white/5">
                  <div className="text-center">
                    <div className="text-3xl font-black text-white">{result.scores.focus}</div>
                    <div className="text-[9px] text-slate-500 uppercase font-black tracking-widest mt-1">Attention</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-black text-white">{result.scores.executive}</div>
                    <div className="text-[9px] text-slate-500 uppercase font-black tracking-widest mt-1">Logic</div>
                  </div>
                </div>
              </div>

              <div className="mt-12">
                <button
                  onClick={() => onComplete(result)}
                  className="w-full bg-white text-slate-950 py-7 rounded-[2rem] font-black text-xl shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 group"
                >
                  <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                  Initiate System
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
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6">
      <div className="max-w-xl w-full bg-slate-900 border border-white/5 rounded-[3rem] p-12 md:p-16 shadow-2xl relative overflow-hidden">
        {isProcessing ? (
          <div className="text-center py-20 space-y-8">
            <Loader2 className="w-16 h-16 text-blue-400 animate-spin mx-auto" />
            <h2 className="text-3xl font-black text-white">Synthesizing Profile...</h2>
          </div>
        ) : (
          <div className="relative z-10">
            <div className="flex items-center gap-6 mb-12">
              <div className="bg-white p-4 rounded-[1.5rem]">
                <BrainCircuit className="w-8 h-8 text-slate-950" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-xl font-black text-white uppercase tracking-widest">Initialization</h1>
                <span className="text-[10px] text-blue-400 font-black uppercase tracking-widest">Phase {step + 1}</span>
              </div>
            </div>

            <h2 className="text-4xl font-black text-white mb-10 leading-tight tracking-tighter">
              {currentQ.question}
            </h2>

            <div className="grid grid-cols-1 gap-4">
              {currentQ.options.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => handleSelect(opt.id)}
                  className="text-left p-6 rounded-[1.5rem] border-2 border-white/5 bg-slate-800/50 text-slate-300 hover:border-blue-500 hover:text-white transition-all flex items-center justify-between group"
                >
                  <span className="text-lg font-bold">{opt.label}</span>
                  <ChevronRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>

            <div className="mt-12 flex justify-between">
              <button 
                onClick={() => setStep(s => Math.max(0, s - 1))}
                disabled={step === 0}
                className="text-slate-500 font-bold uppercase tracking-widest disabled:opacity-0"
              >
                Back
              </button>
              
              {step === ONBOARDING_QUESTIONS.length - 1 && answers[currentQ.id] && (
                <button
                  onClick={handleFinish}
                  className="bg-white text-slate-950 px-10 py-4 rounded-2xl font-black shadow-2xl hover:scale-105 active:scale-95 transition-all"
                >
                  Finish Calibration
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
