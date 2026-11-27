import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Sparkles, 
  Play, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Trophy, 
  Share2, 
  CheckCircle2, 
  Flame, 
  Zap, 
  Heart, 
  ShieldCheck, 
  Clock, 
  Target,
  Brain,
  Award
} from 'lucide-react';
import { zenSoundSynth } from '../services/zenSoundSynth';
import { submitZenScore, getCurrentWeekId } from '../services/zenLeaderboardService';
import { ZenScoreRecord } from '../types';
import { User } from 'firebase/auth';

interface ZenGameProps {
  authUser: User | null;
  userDisplayName?: string;
  userArchetype?: string;
  onOpenLeaderboard: () => void;
  onOpenShareModal: (record: Partial<ZenScoreRecord>) => void;
  onSessionComplete?: () => void;
}

interface Orb {
  id: number;
  x: number; // 0 to 1 relative to canvas width
  y: number; // 0 to 1 relative to canvas height
  targetRadius: number; // distance from center
  currentRadius: number;
  angle: number; // in radians
  speed: number;
  type: 'clarity' | 'prana' | 'stillness' | 'flow';
  color: string;
  glowColor: string;
  points: number;
  label: string;
  isHit: boolean;
  spawnTime: number;
}

export const ZenGame: React.FC<ZenGameProps> = ({
  authUser,
  userDisplayName,
  userArchetype,
  onOpenLeaderboard,
  onOpenShareModal,
  onSessionComplete
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameDuration, setGameDuration] = useState<number>(90); // 90 seconds
  const [timeLeft, setTimeLeft] = useState<number>(90);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [perfectHits, setPerfectHits] = useState(0);
  const [isMuted, setIsMuted] = useState(() => zenSoundSynth.getIsMuted());
  const [isGameOver, setIsGameOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRecord, setSubmittedRecord] = useState<ZenScoreRecord | null>(null);
  const [feedbackText, setFeedbackText] = useState<{ text: string; color: string } | null>(null);

  // Stillness / Anti-Frantic Clicker Detection
  const lastTapTimeRef = useRef<number>(0);
  const franticCountRef = useRef<number>(0);
  const [isFranticWarning, setIsFranticWarning] = useState(false);

  // Game Animation State Refs
  const orbsRef = useRef<Orb[]>([]);
  const nextOrbIdRef = useRef<number>(1);
  const ripplePhaseRef = useRef<number>(0); // 0 to 1 (breath cycle)
  const animFrameIdRef = useRef<number | null>(null);
  const lastSpawnTimeRef = useRef<number>(0);
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; life: number; color: string }[]>([]);

  const toggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    zenSoundSynth.setMuted(next);
  };

  const playerName = userDisplayName || authUser?.displayName || 'Mindful Pioneer';

  const resetGameState = useCallback(() => {
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setTotalAttempts(0);
    setPerfectHits(0);
    setTimeLeft(gameDuration);
    setIsGameOver(false);
    setSubmittedRecord(null);
    setFeedbackText(null);
    orbsRef.current = [];
    particlesRef.current = [];
    lastTapTimeRef.current = 0;
    franticCountRef.current = 0;
    setIsFranticWarning(false);
  }, [gameDuration]);

  const startGame = () => {
    resetGameState();
    setIsPlaying(true);
    zenSoundSynth.playSingingBowl('mid');
    zenSoundSynth.startAmbientDrone();
  };

  const stopGame = useCallback(() => {
    setIsPlaying(false);
    setIsGameOver(true);
    zenSoundSynth.stopAmbientDrone();
    zenSoundSynth.playSingingBowl('high');
    onSessionComplete?.();
  }, [onSessionComplete]);

  // Timer Countdown
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          stopGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, stopGame]);

  // Main Canvas Render & Physics Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;

    const render = (time: number) => {
      if (!running) return;

      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;
      const maxRippleRadius = Math.min(width, height) * 0.38;

      // Clear with deep midnight indigo
      ctx.fillStyle = '#020b12';
      ctx.fillRect(0, 0, width, height);

      // Draw subtle ambient background stars
      ctx.fillStyle = 'rgba(45, 212, 191, 0.15)';
      for (let i = 0; i < 20; i++) {
        const sx = ((i * 137.5) % width);
        const sy = ((i * 223.1) % height);
        ctx.beginPath();
        ctx.arc(sx, sy, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Update breathing ripple rhythm: 4-second cycle
      // Expands outwards gracefully
      const breathSpeed = 0.0012; // ~4.5 seconds per full breath cycle
      ripplePhaseRef.current = (time * breathSpeed) % 1;
      const currentRingRadius = ripplePhaseRef.current * maxRippleRadius;

      // Draw Guide Resonance Ripple (The target ring)
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, currentRingRadius, 0, Math.PI * 2);
      ctx.lineWidth = 3.5;
      const ringAlpha = (1 - ripplePhaseRef.current) * 0.8;
      ctx.strokeStyle = isFranticWarning 
        ? `rgba(245, 158, 11, ${ringAlpha})` 
        : `rgba(45, 212, 191, ${ringAlpha})`;
      ctx.shadowColor = isFranticWarning ? '#f59e0b' : '#2dd4bf';
      ctx.shadowBlur = 15;
      ctx.stroke();

      // Outer boundary harmonic ring
      ctx.beginPath();
      ctx.arc(centerX, centerY, maxRippleRadius, 0, Math.PI * 2);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.stroke();
      ctx.restore();

      // Center Sacred Lotus / Zen Seed
      const centerPulse = 1 + Math.sin(time * 0.003) * 0.08;
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.scale(centerPulse, centerPulse);

      // Lotus petals
      const petals = 8;
      for (let p = 0; p < petals; p++) {
        ctx.save();
        ctx.rotate((p * Math.PI * 2) / petals);
        ctx.beginPath();
        ctx.ellipse(0, -22, 12, 24, 0, 0, Math.PI * 2);
        ctx.fillStyle = isFranticWarning ? 'rgba(245, 158, 11, 0.25)' : 'rgba(45, 212, 191, 0.25)';
        ctx.fill();
        ctx.strokeStyle = isFranticWarning ? 'rgba(245, 158, 11, 0.6)' : 'rgba(45, 212, 191, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }

      // Center pearl
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#2dd4bf';
      ctx.shadowBlur = 20;
      ctx.fill();
      ctx.restore();

      // Spawn new floating meditative orbs when playing
      if (isPlaying) {
        if (time - lastSpawnTimeRef.current > 1400) {
          lastSpawnTimeRef.current = time;
          const types: Orb['type'][] = ['clarity', 'prana', 'stillness', 'flow'];
          const type = types[Math.floor(Math.random() * types.length)];
          const angle = Math.random() * Math.PI * 2;
          
          let color = '#2dd4bf';
          let glowColor = '#0d9488';
          let points = 100;
          let label = 'Clarity';

          if (type === 'prana') {
            color = '#f59e0b';
            glowColor = '#d97706';
            points = 250;
            label = 'Prana';
          } else if (type === 'flow') {
            color = '#a855f7';
            glowColor = '#9333ea';
            points = 175;
            label = 'Flow';
          } else if (type === 'stillness') {
            color = '#38bdf8';
            glowColor = '#0284c7';
            points = 125;
            label = 'Stillness';
          }

          orbsRef.current.push({
            id: nextOrbIdRef.current++,
            x: 0,
            y: 0,
            angle,
            targetRadius: maxRippleRadius,
            currentRadius: 35, // starts near center and floats out
            speed: 1.2 + Math.random() * 0.4,
            type,
            color,
            glowColor,
            points,
            label,
            isHit: false,
            spawnTime: time
          });
        }

        // Update and draw orbs
        orbsRef.current.forEach(orb => {
          orb.currentRadius += orb.speed;
          orb.x = centerX + Math.cos(orb.angle) * orb.currentRadius;
          orb.y = centerY + Math.sin(orb.angle) * orb.currentRadius;

          // Draw Glowing Orb
          ctx.save();
          ctx.beginPath();
          ctx.arc(orb.x, orb.y, 14, 0, Math.PI * 2);
          ctx.fillStyle = orb.color;
          ctx.shadowColor = orb.glowColor;
          ctx.shadowBlur = 18;
          ctx.fill();

          // Subtle label
          ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
          ctx.font = 'bold 9px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(orb.label, orb.x, orb.y + 24);
          ctx.restore();
        });

        // Filter out orbs that passed beyond max boundary
        orbsRef.current = orbsRef.current.filter(orb => {
          if (orb.currentRadius > maxRippleRadius + 45) {
            // Missed orb
            return false;
          }
          return !orb.isHit;
        });

        // Update and draw particle explosion effects
        particlesRef.current.forEach(p => {
          p.x += p.vx;
          p.y += p.vy;
          p.life -= 0.025;

          ctx.save();
          ctx.beginPath();
          ctx.arc(p.x, p.y, 3 * p.life, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 10;
          ctx.fill();
          ctx.restore();
        });
        particlesRef.current = particlesRef.current.filter(p => p.life > 0);
      }

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      running = false;
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [isPlaying, isFranticWarning]);

  // Handle Mindful Tap / Spacebar Harmonization
  const handleHarmonize = () => {
    if (!isPlaying) return;

    const now = Date.now();
    const timeSinceLastTap = now - lastTapTimeRef.current;
    lastTapTimeRef.current = now;

    // Detect Frantic / Anti-Mindful Click Spamming (<220ms between clicks)
    if (timeSinceLastTap < 220) {
      franticCountRef.current++;
      if (franticCountRef.current >= 3) {
        setIsFranticWarning(true);
        setFeedbackText({ text: 'Breathe... Find Your Center', color: 'text-amber-400' });
        setStreak(0);
        setTimeout(() => setIsFranticWarning(false), 2000);
        return;
      }
    } else {
      franticCountRef.current = 0;
    }

    setTotalAttempts(prev => prev + 1);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const width = canvas.width;
    const height = canvas.height;
    const maxRippleRadius = Math.min(width, height) * 0.38;
    const currentRingRadius = ripplePhaseRef.current * maxRippleRadius;

    // Find closest orb to current breath ripple ring
    let closestOrb: Orb | null = null;
    let minDistance = Infinity;

    orbsRef.current.forEach(orb => {
      const distToRing = Math.abs(orb.currentRadius - currentRingRadius);
      if (distToRing < minDistance) {
        minDistance = distToRing;
        closestOrb = orb;
      }
    });

    // Timing tolerance windows (in pixels)
    const PERFECT_WINDOW = 22;
    const GOOD_WINDOW = 45;

    if (closestOrb && minDistance <= GOOD_WINDOW) {
      const isPerfect = minDistance <= PERFECT_WINDOW;
      (closestOrb as Orb).isHit = true;

      // Spawn burst particles
      for (let i = 0; i < 12; i++) {
        const pAngle = Math.random() * Math.PI * 2;
        const pSpeed = 1.5 + Math.random() * 3.5;
        particlesRef.current.push({
          x: (closestOrb as Orb).x,
          y: (closestOrb as Orb).y,
          vx: Math.cos(pAngle) * pSpeed,
          vy: Math.sin(pAngle) * pSpeed,
          life: 1.0,
          color: (closestOrb as Orb).color
        });
      }

      const multiplier = Math.min(4, 1 + Math.floor(streak / 5));
      const gainedScore = ((closestOrb as Orb).points * (isPerfect ? 1.5 : 1.0)) * multiplier;

      setScore(s => Math.round(s + gainedScore));
      setStreak(curr => {
        const next = curr + 1;
        setMaxStreak(m => Math.max(m, next));
        return next;
      });

      if (isPerfect) {
        setPerfectHits(p => p + 1);
        zenSoundSynth.playHarmonyChime(streak);
        zenSoundSynth.playSingingBowl('high');
        setFeedbackText({ text: `PERFECT HARMONY +${Math.round(gainedScore)}`, color: 'text-teal-300' });
      } else {
        zenSoundSynth.playRippleTone();
        zenSoundSynth.playSingingBowl('mid');
        setFeedbackText({ text: `CALM SYNC +${Math.round(gainedScore)}`, color: 'text-blue-300' });
      }
    } else {
      // Gentle rhythm miss
      setStreak(0);
      setFeedbackText({ text: 'Gentle breath... match the ripple', color: 'text-slate-400' });
    }
  };

  // Keyboard Spacebar listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isPlaying) {
        e.preventDefault();
        handleHarmonize();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying]);

  // Submit score to Firestore
  const handleSubmitScore = async () => {
    if (isSubmitting || submittedRecord) return;
    setIsSubmitting(true);
    try {
      const harmonyPct = totalAttempts > 0 ? Math.round((perfectHits / totalAttempts) * 100) : 90;
      const record = await submitZenScore({
        userId: authUser?.uid || 'guest_zen_player',
        displayName: playerName,
        photoURL: authUser?.photoURL || undefined,
        score,
        harmonyRate: Math.max(50, harmonyPct),
        longestStreak: maxStreak,
        durationSeconds: gameDuration,
        archetype: userArchetype || 'Sprint-Crashing Redliner'
      });
      setSubmittedRecord(record);
      zenSoundSynth.playSingingBowl('celestial');
    } catch (err) {
      console.error('Score submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentMultiplier = Math.min(4, 1 + Math.floor(streak / 5));
  const harmonyPercent = totalAttempts > 0 ? Math.round((perfectHits / totalAttempts) * 100) : 100;

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto space-y-6">
      
      {/* Top Controls & Telemetry */}
      <div className="w-full bg-slate-900/60 border border-teal-500/20 rounded-2xl p-4 md:p-5 flex flex-wrap items-center justify-between gap-4 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-300">
            <Brain className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-teal-400">
                Zen Ripple Flow
              </span>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 font-mono border border-teal-500/20">
                {getCurrentWeekId()}
              </span>
            </div>
            <h3 className="text-base font-black text-white tracking-tight">
              Mindful Meditation & Focus Game
            </h3>
          </div>
        </div>

        {/* Live In-Game Metrics */}
        <div className="flex items-center gap-3 sm:gap-6">
          <div className="text-center">
            <div className="text-xs text-slate-400 font-mono uppercase">Time</div>
            <div className={`text-xl font-black font-mono ${timeLeft <= 15 ? 'text-amber-400 animate-pulse' : 'text-white'}`}>
              {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
            </div>
          </div>

          <div className="text-center">
            <div className="text-xs text-slate-400 font-mono uppercase">Zen Points</div>
            <div className="text-2xl font-black text-teal-300 font-mono">
              {score.toLocaleString()}
            </div>
          </div>

          <div className="text-center">
            <div className="text-xs text-slate-400 font-mono uppercase">Streak</div>
            <div className="text-xl font-black text-amber-400 flex items-center justify-center gap-1">
              <Flame className="w-4 h-4 fill-amber-400" />
              <span>{streak}x</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 pl-2 border-l border-white/10">
            <button
              onClick={toggleSound}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title={isMuted ? 'Unmute Meditation Soundscape' : 'Mute Meditation Soundscape'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-teal-400" />}
            </button>
            <button
              onClick={onOpenLeaderboard}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 transition-colors"
              title="View Weekly Tournament Leaderboard"
            >
              <Trophy className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Interactive Canvas Area */}
      <div className="relative w-full max-w-2xl aspect-square md:aspect-[4/3] rounded-[2.5rem] overflow-hidden border-2 border-teal-500/30 shadow-[0_0_50px_rgba(20,184,166,0.15)] bg-slate-950 flex items-center justify-center group select-none">
        
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          onClick={handleHarmonize}
          className="w-full h-full object-cover cursor-pointer"
        />

        {/* Ambient Overlay Header Status */}
        {isPlaying && (
          <div className="absolute top-5 left-1/2 -translate-x-1/2 pointer-events-none flex flex-col items-center">
            {feedbackText && (
              <span className={`text-xs font-black tracking-widest uppercase transition-all duration-300 ${feedbackText.color}`}>
                {feedbackText.text}
              </span>
            )}
            {currentMultiplier > 1 && (
              <span className="text-[10px] font-mono text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 mt-1">
                Flow Multiplier: {currentMultiplier}x
              </span>
            )}
          </div>
        )}

        {/* Start / Intro Screen */}
        {!isPlaying && !isGameOver && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300">
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-full bg-teal-500/10 border-2 border-teal-500/40 flex items-center justify-center animate-pulse">
                <Sparkles className="w-10 h-10 text-teal-300" />
              </div>
            </div>
            
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-teal-400 mb-2">
              Deep Cognitive Relaxation
            </span>
            <h2 className="text-3xl font-black text-white tracking-tight mb-3">
              Zen Ripple Flow
            </h2>
            <p className="text-sm text-slate-300 max-w-md leading-relaxed mb-6">
              Synchronize your breath with expanding harmonic ripple rings. Tap or press <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-white/20 text-xs font-mono">SPACE</kbd> as orbs align with the ring crest to train parasympathetic calm.
            </p>

            {/* Session Duration Selector */}
            <div className="flex items-center gap-2 mb-8">
              {[60, 90, 180].map((dur) => (
                <button
                  key={dur}
                  onClick={() => {
                    setGameDuration(dur);
                    setTimeLeft(dur);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                    gameDuration === dur
                      ? 'bg-teal-600 text-white border-teal-400 shadow-md shadow-teal-500/20'
                      : 'bg-slate-900 text-slate-400 border-white/10 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {dur === 60 ? '1 Min Sprint' : dur === 90 ? '90s Mindful' : '3 Min Deep'}
                </button>
              ))}
            </div>

            <button
              onClick={startGame}
              className="px-10 py-4 rounded-2xl bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-500 hover:brightness-110 text-slate-950 font-black text-lg transition-all shadow-xl shadow-teal-500/25 flex items-center gap-3 active:scale-95"
            >
              <Play className="w-5 h-5 fill-slate-950" />
              <span>Begin Meditation Game</span>
            </button>
          </div>
        )}

        {/* Game Completed / Victory Screen */}
        {isGameOver && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 md:p-8 text-center animate-in zoom-in-95 duration-400">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center mb-4 shadow-xl shadow-amber-500/30 text-slate-950">
              <Trophy className="w-8 h-8" />
            </div>

            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-teal-400 mb-1">
              Meditation Session Complete
            </span>
            <h2 className="text-3xl font-black text-white tracking-tight mb-2">
              {score >= 3000 ? 'Master of Serenity' : 'Deep Calm Attained'}
            </h2>
            <div className="text-4xl font-black text-teal-300 font-mono mb-4">
              {score.toLocaleString()} <span className="text-sm font-sans text-slate-400 font-normal">pts</span>
            </div>

            {/* Quick Metrics Breakdown */}
            <div className="grid grid-cols-3 gap-3 w-full max-w-sm mb-6">
              <div className="bg-slate-900/80 border border-white/10 rounded-xl p-3">
                <div className="text-[9px] text-slate-400 uppercase font-mono">Max Streak</div>
                <div className="text-lg font-black text-amber-400">{maxStreak}x</div>
              </div>
              <div className="bg-slate-900/80 border border-white/10 rounded-xl p-3">
                <div className="text-[9px] text-slate-400 uppercase font-mono">Harmony</div>
                <div className="text-lg font-black text-teal-300">{harmonyPercent}%</div>
              </div>
              <div className="bg-slate-900/80 border border-white/10 rounded-xl p-3">
                <div className="text-[9px] text-slate-400 uppercase font-mono">Focus Time</div>
                <div className="text-lg font-black text-blue-300">{gameDuration}s</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md">
              {!submittedRecord ? (
                <button
                  onClick={handleSubmitScore}
                  disabled={isSubmitting}
                  className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
                >
                  <Trophy className="w-4 h-4 text-amber-300" />
                  <span>{isSubmitting ? 'Posting...' : 'Post to Leaderboard'}</span>
                </button>
              ) : (
                <div className="w-full sm:flex-1 py-2.5 px-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Posted to Leaderboard!</span>
                </div>
              )}

              <button
                onClick={() => onOpenShareModal({
                  score,
                  harmonyRate: harmonyPercent,
                  longestStreak: maxStreak,
                  displayName: playerName,
                  weekId: getCurrentWeekId()
                })}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
              >
                <Share2 className="w-4 h-4" />
                <span>Share Score & Badge</span>
              </button>

              <button
                onClick={startGame}
                className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                title="Play Again"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Tap Prompt Overlay during game */}
        {isPlaying && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none text-center">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 bg-slate-900/60 px-3 py-1 rounded-full border border-white/5 backdrop-blur-sm">
              Tap Canvas or Press Space when orb touches ring
            </span>
          </div>
        )}
      </div>

    </div>
  );
};
