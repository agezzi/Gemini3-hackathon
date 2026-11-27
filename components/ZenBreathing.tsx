import React, { useState, useEffect, useRef } from 'react';
import { 
  Wind, 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Heart,
  Sliders
} from 'lucide-react';
import { zenSoundSynth } from '../services/zenSoundSynth';

type BreathingPattern = 'box' | 'calm' | 'coherence';

interface PatternConfig {
  id: BreathingPattern;
  name: string;
  tagline: string;
  inhale: number;
  hold1: number;
  exhale: number;
  hold2: number;
  description: string;
}

const PATTERNS: PatternConfig[] = [
  {
    id: 'box',
    name: '4-4-4-4 Box Breathing',
    tagline: 'Navy SEAL executive composure',
    inhale: 4,
    hold1: 4,
    exhale: 4,
    hold2: 4,
    description: 'Stabilizes the nervous system, lowers cortisol, and anchors prefrontal decision-making.'
  },
  {
    id: 'calm',
    name: '4-7-8 Deep Recovery',
    tagline: 'Dr. Weil parasympathetic reset',
    inhale: 4,
    hold1: 7,
    exhale: 8,
    hold2: 0,
    description: 'Extended exhalation stimulates the vagus nerve to dissolve acute cognitive strain and anxiety.'
  },
  {
    id: 'coherence',
    name: '5.5s Heart Coherence',
    tagline: 'Cardiovascular flow resonance',
    inhale: 5.5,
    hold1: 0,
    exhale: 5.5,
    hold2: 0,
    description: 'Aligns heart rate variability (HRV) with brainwave oscillation for peak relaxed focus.'
  }
];

interface ZenBreathingProps {
  onCycleComplete?: () => void;
}

export const ZenBreathing: React.FC<ZenBreathingProps> = ({ onCycleComplete }) => {
  const [selectedPattern, setSelectedPattern] = useState<BreathingPattern>('box');
  const [isActive, setIsActive] = useState<boolean>(false);
  const [phase, setPhase] = useState<'inhale' | 'hold1' | 'exhale' | 'hold2'>('inhale');
  const [secondsRemaining, setSecondsRemaining] = useState<number>(4);
  const [cycleCount, setCycleCount] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(() => zenSoundSynth.getIsMuted());

  const currentConfig = PATTERNS.find(p => p.id === selectedPattern) || PATTERNS[0];

  const toggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    zenSoundSynth.setMuted(next);
  };

  useEffect(() => {
    if (!isActive) return;

    let timer: NodeJS.Timeout;
    const interval = 100; // 100ms tick for smooth transitions
    let currentPhase = phase;
    let duration = 
      currentPhase === 'inhale' ? currentConfig.inhale :
      currentPhase === 'hold1' ? currentConfig.hold1 :
      currentPhase === 'exhale' ? currentConfig.exhale : currentConfig.hold2;

    let elapsed = 0;

    timer = setInterval(() => {
      elapsed += 0.1;
      const left = Math.max(0, Math.ceil(duration - elapsed));
      setSecondsRemaining(left);

      if (elapsed >= duration) {
        // Transition to next phase
        let nextPhase: typeof phase;
        if (currentPhase === 'inhale') {
          nextPhase = currentConfig.hold1 > 0 ? 'hold1' : 'exhale';
        } else if (currentPhase === 'hold1') {
          nextPhase = 'exhale';
        } else if (currentPhase === 'exhale') {
          nextPhase = currentConfig.hold2 > 0 ? 'hold2' : 'inhale';
          if (nextPhase === 'inhale') {
            setCycleCount(c => c + 1);
            onCycleComplete?.();
          }
        } else {
          nextPhase = 'inhale';
          setCycleCount(c => c + 1);
          onCycleComplete?.();
        }

        currentPhase = nextPhase;
        setPhase(nextPhase);
        elapsed = 0;
        duration = 
          nextPhase === 'inhale' ? currentConfig.inhale :
          nextPhase === 'hold1' ? currentConfig.hold1 :
          nextPhase === 'exhale' ? currentConfig.exhale : currentConfig.hold2;

        // Sound cue on transition
        if (nextPhase === 'inhale') {
          zenSoundSynth.playSingingBowl('low');
        } else if (nextPhase === 'exhale') {
          zenSoundSynth.playSingingBowl('high');
        } else {
          zenSoundSynth.playRippleTone();
        }
      }
    }, interval);

    return () => clearInterval(timer);
  }, [isActive, phase, currentConfig]);

  const handleStart = () => {
    setIsActive(true);
    setPhase('inhale');
    setSecondsRemaining(Math.ceil(currentConfig.inhale));
    zenSoundSynth.playSingingBowl('mid');
    zenSoundSynth.startAmbientDrone();
  };

  const handlePause = () => {
    setIsActive(false);
    zenSoundSynth.stopAmbientDrone();
  };

  const handleReset = () => {
    setIsActive(false);
    setPhase('inhale');
    setCycleCount(0);
    setSecondsRemaining(Math.ceil(currentConfig.inhale));
    zenSoundSynth.stopAmbientDrone();
  };

  const phaseInstruction = 
    phase === 'inhale' ? 'Inhale deeply through the nose...' :
    phase === 'hold1' ? 'Hold breath gently in stillness...' :
    phase === 'exhale' ? 'Exhale smoothly through the mouth...' : 'Rest in natural calm...';

  // Scale computation for visual flower
  const flowerScale = 
    phase === 'inhale' ? 'scale-125' :
    phase === 'hold1' ? 'scale-125' :
    phase === 'exhale' ? 'scale-75' : 'scale-75';

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center space-y-6">
      
      {/* Pattern Selector */}
      <div className="flex flex-wrap items-center justify-center gap-2 bg-slate-900/60 p-2 rounded-2xl border border-white/5 backdrop-blur-xl">
        {PATTERNS.map((pattern) => (
          <button
            key={pattern.id}
            onClick={() => {
              setSelectedPattern(pattern.id);
              handleReset();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
              selectedPattern === pattern.id
                ? 'bg-teal-600 text-white border-teal-400 shadow-md shadow-teal-500/20'
                : 'bg-slate-900 text-slate-400 border-white/5 hover:text-white hover:bg-slate-800'
            }`}
          >
            {pattern.name}
          </button>
        ))}
      </div>

      {/* Visual Breathing Sanctum */}
      <div className="relative w-full max-w-xl aspect-square rounded-[3rem] overflow-hidden border border-teal-500/30 bg-gradient-to-b from-slate-950 via-[#03151f] to-slate-950 p-8 flex flex-col items-center justify-between shadow-2xl">
        
        {/* Top Info Bar */}
        <div className="w-full flex items-center justify-between z-10">
          <div className="flex items-center gap-2 text-teal-300">
            <Wind className="w-4 h-4 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest">
              {currentConfig.tagline}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded-xl border border-white/5">
              Cycles: <strong className="text-white">{cycleCount}</strong>
            </span>
            <button
              onClick={toggleSound}
              className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-teal-400" />}
            </button>
          </div>
        </div>

        {/* Center Animated Sacred Geometry Lotus */}
        <div className="relative flex items-center justify-center my-auto">
          {/* Outer Pulsing Glow */}
          <div className={`w-64 h-64 rounded-full bg-teal-500/10 blur-2xl transition-transform duration-[4000ms] ease-in-out ${flowerScale}`} />

          {/* Concentric Breathing Rings */}
          <div className={`absolute w-56 h-56 rounded-full border-2 border-dashed border-teal-400/40 transition-transform duration-[4000ms] ease-in-out ${flowerScale}`} />
          <div className={`absolute w-44 h-44 rounded-full border border-teal-500/30 transition-transform duration-[4000ms] ease-in-out ${flowerScale}`} />

          {/* Center Lotus Flower */}
          <div className={`relative z-10 w-32 h-32 rounded-full bg-gradient-to-br from-teal-500/20 to-emerald-500/30 border border-teal-400/60 flex flex-col items-center justify-center transition-transform duration-[4000ms] ease-in-out shadow-[0_0_40px_rgba(45,212,191,0.25)] ${flowerScale}`}>
            <span className="text-4xl font-black text-white font-mono">
              {secondsRemaining}
            </span>
            <span className="text-[9px] font-black uppercase tracking-widest text-teal-300 mt-1">
              {phase === 'hold1' || phase === 'hold2' ? 'HOLD' : phase.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Bottom Phase Text & Controls */}
        <div className="w-full flex flex-col items-center gap-4 z-10">
          <p className="text-sm font-bold text-teal-200 text-center tracking-tight min-h-[24px]">
            {isActive ? phaseInstruction : 'Press Begin to start guided breathwork'}
          </p>

          <div className="flex items-center gap-3">
            {!isActive ? (
              <button
                onClick={handleStart}
                className="px-8 py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-black text-xs transition-all shadow-lg shadow-teal-500/25 flex items-center gap-2 active:scale-95"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Begin Breathwork</span>
              </button>
            ) : (
              <button
                onClick={handlePause}
                className="px-8 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-black text-xs transition-all border border-white/10 flex items-center gap-2 active:scale-95"
              >
                <Pause className="w-4 h-4" />
                <span>Pause</span>
              </button>
            )}

            <button
              onClick={handleReset}
              className="p-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors border border-white/5"
              title="Reset Breathwork"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      <p className="text-xs text-slate-400 text-center max-w-md">
        {currentConfig.description}
      </p>

    </div>
  );
};
