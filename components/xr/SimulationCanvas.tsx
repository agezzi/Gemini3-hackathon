import React, { useEffect, useRef } from 'react';
import {
  DemoProfileId,
  GazeStateType,
  SimulationStageId,
  TrackingMode
} from '../../services/xr/xrTypes';
import { ActiveDistractorCircle, GazeTrackingEngine } from '../../services/xr/gazeEngine';
import {
  INVESTOR_DEMO_PROFILES,
  SyntheticGazeController
} from '../../services/xr/investorDemoProfiles';
import { xrSoundEngine } from '../../services/xr/xrSoundEngine';

interface SimulationCanvasProps {
  stageId: SimulationStageId;
  isStageRunning: boolean;
  isPaused: boolean;
  stageElapsedMs: number;
  stageDurationMs: number;
  trackingMode: TrackingMode;
  demoProfileId: DemoProfileId;
  reducedMotion: boolean;
  playbackSpeed: number; // 1 for normal, 2 or 3 for accelerated demo
  gazeEngine: GazeTrackingEngine;
  onGazeStateChange?: (state: GazeStateType) => void;
  onPulseTriggered?: (type: 'single' | 'double') => void;
  onSyntheticCPTResponse?: (outcome: 'correct_hit' | 'false_alarm', reactionMs?: number) => void;
}

interface AmbientDust {
  xNorm: number;
  yNorm: number;
  z: number;
  size: number;
  alpha: number;
  vx: number;
  vy: number;
}

export const SimulationCanvas: React.FC<SimulationCanvasProps> = ({
  stageId,
  isStageRunning,
  isPaused,
  stageElapsedMs,
  stageDurationMs,
  trackingMode,
  demoProfileId,
  reducedMotion,
  playbackSpeed,
  gazeEngine,
  onGazeStateChange,
  onPulseTriggered,
  onSyntheticCPTResponse
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Pointer & synthetic gaze refs
  const pointerPosRef = useRef<{ x: number; y: number; hasMoved: boolean }>({
    x: 0,
    y: 0,
    hasMoved: false
  });
  const syntheticGazeRef = useRef<SyntheticGazeController>(new SyntheticGazeController());
  const lastGazeStateRef = useRef<GazeStateType>('target');

  // Ambient 3D starfield dust
  const dustRef = useRef<AmbientDust[]>(
    Array.from({ length: 48 }).map(() => ({
      xNorm: Math.random(),
      yNorm: Math.random(),
      z: 0.3 + Math.random() * 0.7,
      size: 0.8 + Math.random() * 1.4,
      alpha: 0.08 + Math.random() * 0.18,
      vx: (Math.random() - 0.5) * 0.00004,
      vy: (Math.random() - 0.5) * 0.00004
    }))
  );

  // Stage 4 Pulse Scheduler Refs
  const nextPulseDueAtMsRef = useRef<number>(3500);
  const activePulseRef = useRef<{
    type: 'single' | 'double';
    startedAtMs: number;
    secondFlashPlayed: boolean;
  } | null>(null);
  const scheduledSyntheticResponseRef = useRef<{
    triggerAtMs: number;
    type: 'hit' | 'false_alarm';
    fired: boolean;
  } | null>(null);

  // Props refs for animation frame closure
  const propsRef = useRef({
    stageId,
    isStageRunning,
    isPaused,
    stageElapsedMs,
    stageDurationMs,
    trackingMode,
    demoProfileId,
    reducedMotion,
    playbackSpeed,
    onGazeStateChange,
    onPulseTriggered,
    onSyntheticCPTResponse
  });
  propsRef.current = {
    stageId,
    isStageRunning,
    isPaused,
    stageElapsedMs,
    stageDurationMs,
    trackingMode,
    demoProfileId,
    reducedMotion,
    playbackSpeed,
    onGazeStateChange,
    onPulseTriggered,
    onSyntheticCPTResponse
  };

  // Reset stage-specific pulse scheduler when stage changes
  useEffect(() => {
    activePulseRef.current = null;
    nextPulseDueAtMsRef.current = 3200;
    scheduledSyntheticResponseRef.current = null;
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      syntheticGazeRef.current.reset(rect.width / 2, rect.height / 2);
      if (!pointerPosRef.current.hasMoved) {
        pointerPosRef.current.x = rect.width / 2;
        pointerPosRef.current.y = rect.height / 2;
      }
    }
  }, [stageId]);

  // Handle ResizeObserver for razor-sharp DPR scaling
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(320, Math.floor(rect.width * dpr));
      canvas.height = Math.max(240, Math.floor(rect.height * dpr));
      if (!pointerPosRef.current.hasMoved) {
        pointerPosRef.current.x = rect.width / 2;
        pointerPosRef.current.y = rect.height / 2;
      }
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Mouse / Pointer tracking relative to simulation viewport
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (propsRef.current.trackingMode !== 'interactive_cursor') return;
      const rect = canvas.getBoundingClientRect();
      pointerPosRef.current = {
        x: Math.max(0, Math.min(rect.width, e.clientX - rect.left)),
        y: Math.max(0, Math.min(rect.height, e.clientY - rect.top)),
        hasMoved: true
      };
    };

    canvas.addEventListener('pointermove', handlePointerMove);
    return () => canvas.removeEventListener('pointermove', handlePointerMove);
  }, []);

  // Main 60FPS Simulation Render & Gaze Tracking Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let lastTimestamp = performance.now();
    let simTimeClockMs = 0;

    const loop = (now: number) => {
      const rawDt = Math.min(100, Math.max(0, now - lastTimestamp));
      lastTimestamp = now;

      const {
        stageId: curStage,
        isStageRunning: running,
        isPaused: paused,
        stageElapsedMs: stageTime,
        trackingMode: mode,
        demoProfileId: profileId,
        reducedMotion: reduceMotion,
        playbackSpeed: speed,
        onGazeStateChange: notifyState,
        onPulseTriggered: notifyPulse,
        onSyntheticCPTResponse: notifySyntheticResp
      } = propsRef.current;

      const effectiveDt = running && !paused ? rawDt * speed : 0;
      simTimeClockMs += effectiveDt;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;
      const centerX = width / 2;
      const centerY = height / 2;
      const minDim = Math.min(width, height);
      const primaryRadius = Math.max(46, Math.min(72, minDim * 0.115));

      ctx.save();
      ctx.scale(dpr, dpr);

      // 1. Deep Obsidian & Atmospheric Radial Depth Backdrop
      const bgGrad = ctx.createRadialGradient(
        centerX,
        centerY,
        20,
        centerX,
        centerY,
        Math.max(width, height) * 0.72
      );
      bgGrad.addColorStop(0, '#0D111A');
      bgGrad.addColorStop(0.45, '#07090E');
      bgGrad.addColorStop(1, '#030407');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Ambient parallax dust
      dustRef.current.forEach((d) => {
        if (!reduceMotion && running && !paused) {
          d.xNorm = (d.xNorm + d.vx * rawDt + 1) % 1;
          d.yNorm = (d.yNorm + d.vy * rawDt + 1) % 1;
        }
        ctx.beginPath();
        ctx.arc(d.xNorm * width, d.yNorm * height, d.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(226, 232, 240, ${d.alpha})`;
        ctx.fill();
      });

      // Subtle spatial depth reference rings (minimal scientific calibration aesthetic)
      const depthRings = [minDim * 0.22, minDim * 0.36, minDim * 0.46];
      depthRings.forEach((r, idx) => {
        ctx.beginPath();
        ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
        ctx.strokeStyle =
          idx === 0 ? 'rgba(245, 158, 11, 0.08)' : 'rgba(148, 163, 184, 0.05)';
        ctx.lineWidth = 1;
        if (idx === 1) ctx.setLineDash([4, 8]);
        else ctx.setLineDash([]);
        ctx.stroke();
      });
      ctx.setLineDash([]);

      // 2. Compute Stage-Specific Active Distractor Particles
      const activeDistractors: Array<{
        id: string;
        x: number;
        y: number;
        visualRadius: number;
        hitRadius: number;
        colorCore: string;
        colorGlow: string;
        opacity: number;
      }> = [];

      const tSec = simTimeClockMs / 1000;
      const stageSec = stageTime / 1000;
      const orbitScale = minDim * 0.29;
      const motionFactor = reduceMotion ? 0.45 : 1.0;

      if (curStage >= 2 && curStage <= 4 && running) {
        // Primary Cyan Distractor
        if (curStage === 2) {
          // Stage 2 switches cleanly from Behaviour A (Orbital) to Behaviour B (Controlled smooth random) at 24s
          if (stageSec < 24) {
            const angle = tSec * 0.72 * motionFactor;
            const dynamicR = orbitScale * (0.85 + 0.22 * Math.sin(tSec * 0.35));
            const dx = centerX + Math.cos(angle) * dynamicR * 1.18;
            const dy = centerY + Math.sin(angle) * dynamicR * 0.84;
            activeDistractors.push({
              id: 'cyan_primary',
              x: dx,
              y: dy,
              visualRadius: 11,
              hitRadius: 42,
              colorCore: '#67E8F9',
              colorGlow: 'rgba(6, 182, 212, 0.75)',
              opacity: Math.min(1, stageSec / 1.5)
            });
          } else {
            // Behaviour B: Controlled Smooth Non-Linear Lissajous / Spline Path
            const randX =
              centerX +
              Math.sin(tSec * 0.85 * motionFactor) * (width * 0.27) +
              Math.cos(tSec * 1.43 * motionFactor) * (width * 0.11);
            const randY =
              centerY +
              Math.cos(tSec * 0.67 * motionFactor) * (height * 0.26) +
              Math.sin(tSec * 1.19 * motionFactor) * (height * 0.09);
            activeDistractors.push({
              id: 'cyan_primary',
              x: randX,
              y: randY,
              visualRadius: 11,
              hitRadius: 42,
              colorCore: '#67E8F9',
              colorGlow: 'rgba(6, 182, 212, 0.78)',
              opacity: 1
            });
          }
        } else {
          // Stage 3 & Stage 4: Smoothly drifting cyan particle with speed modulation after 28s
          const speedMod = curStage === 3 && stageSec > 28 ? 1.28 : 1.0;
          const dx1 =
            centerX +
            Math.sin(tSec * 0.9 * speedMod * motionFactor) * (width * 0.28) +
            Math.cos(tSec * 1.5 * motionFactor) * (width * 0.08);
          const dy1 =
            centerY +
            Math.cos(tSec * 0.75 * speedMod * motionFactor) * (height * 0.24) +
            Math.sin(tSec * 1.3 * motionFactor) * (height * 0.09);

          const brightnessPulse =
            curStage === 3 && stageSec > 22
              ? 0.65 + 0.35 * Math.sin(tSec * 3.1)
              : 1.0;

          activeDistractors.push({
            id: 'cyan_primary',
            x: dx1,
            y: dy1,
            visualRadius: 11,
            hitRadius: 42,
            colorCore: '#67E8F9',
            colorGlow: 'rgba(6, 182, 212, 0.75)',
            opacity: brightnessPulse
          });

          // Progressive Stimulus 2: Electric Blue asymmetric orbit enters after 8s in Stage 3 (immediately in Stage 4)
          if (curStage === 4 || stageSec >= 8) {
            const enterAlpha = curStage === 3 ? Math.min(1, (stageSec - 8) / 2) : 1;
            const orbAngle = -tSec * 0.95 * motionFactor + 1.4;
            const dx2 = centerX + Math.cos(orbAngle) * (orbitScale * 1.25);
            const dy2 = centerY + Math.sin(orbAngle * 1.15) * (orbitScale * 0.72);
            activeDistractors.push({
              id: 'blue_orbital',
              x: dx2,
              y: dy2,
              visualRadius: 9.5,
              hitRadius: 40,
              colorCore: '#60A5FA',
              colorGlow: 'rgba(37, 99, 235, 0.75)',
              opacity: enterAlpha
            });
          }

          // Progressive Stimulus 3 (Stage 3 >= 18s): Sweeping cross-field transient orb every 13s
          if (curStage === 3 && stageSec >= 18) {
            const sweepCycle = (stageSec - 18) % 13;
            if (sweepCycle < 3.6) {
              const progress = sweepCycle / 3.6; // 0 to 1
              const sx = width * 0.12 + progress * (width * 0.76);
              const sy = centerY + Math.sin(progress * Math.PI) * -42 + 18;
              const fadeAlpha = Math.sin(progress * Math.PI);
              activeDistractors.push({
                id: 'cyan_sweep',
                x: sx,
                y: sy,
                visualRadius: 8.5,
                hitRadius: 36,
                colorCore: '#38BDF8',
                colorGlow: 'rgba(56, 189, 248, 0.8)',
                opacity: fadeAlpha * 0.95
              });
            }
          }

          // Progressive Stimulus 4 (Stage 3 >= 32s): Brief appearing/disappearing peripheral violet pulse
          if (curStage === 3 && stageSec >= 32) {
            const pulseSlot = Math.floor((stageSec - 32) / 6.5);
            const slotAge = (stageSec - 32) % 6.5;
            if (slotAge < 3.2) {
              const pseudoAngle = (pulseSlot * 2.39996) % (Math.PI * 2); // golden angle distribution
              const px = centerX + Math.cos(pseudoAngle) * (orbitScale * 1.15);
              const py = centerY + Math.sin(pseudoAngle) * (orbitScale * 0.92);
              const fade = Math.sin((slotAge / 3.2) * Math.PI);
              activeDistractors.push({
                id: `transient_violet_${pulseSlot}`,
                x: px,
                y: py,
                visualRadius: 9,
                hitRadius: 36,
                colorCore: '#C4B5FD',
                colorGlow: 'rgba(139, 92, 246, 0.7)',
                opacity: fade * 0.9
              });
            }
          }
        }
      }

      // 3. Stage 4: Primary Orb Double-Pulse Scheduler & Animation
      let pulseScaleOffset = 0;
      let pulseFlashAlpha = 0;

      if (curStage === 4 && running && !paused) {
        if (stageTime >= nextPulseDueAtMsRef.current && !activePulseRef.current) {
          // Controlled random schedule: ~40% double pulse (target), ~60% single pulse (lure)
          const isDouble = Math.random() < 0.42;
          const pulseType = isDouble ? 'double' : 'single';
          activePulseRef.current = {
            type: pulseType,
            startedAtMs: stageTime,
            secondFlashPlayed: false
          };
          gazeEngine.registerPulseTrial(pulseType, 2200);
          if (notifyPulse) notifyPulse(pulseType);

          if (pulseType === 'double') {
            xrSoundEngine.playDoublePulseCue();
          }

          // In Investor Demo Mode, schedule synthetic response if profile triggers hit or false alarm
          if (mode === 'investor_demo_synthetic') {
            const p = INVESTOR_DEMO_PROFILES[profileId].behaviorParams;
            if (pulseType === 'double' && Math.random() < p.cptHitRate) {
              const jitter = (Math.random() - 0.5) * 2 * p.cptRtJitterMs;
              const rt = Math.max(260, p.cptMeanRtMs + jitter);
              scheduledSyntheticResponseRef.current = {
                triggerAtMs: stageTime + 260 + rt, // after 2nd flash confirmation
                type: 'hit',
                fired: false
              };
            } else if (pulseType === 'single' && Math.random() < p.cptFalseAlarmRate) {
              const rt = 340 + Math.random() * 280;
              scheduledSyntheticResponseRef.current = {
                triggerAtMs: stageTime + rt,
                type: 'false_alarm',
                fired: false
              };
            }
          }

          // Schedule next pulse 3.6s - 6.2s later
          nextPulseDueAtMsRef.current = stageTime + 3600 + Math.random() * 2600;
        }

        // Fire synthetic response if due
        if (
          mode === 'investor_demo_synthetic' &&
          scheduledSyntheticResponseRef.current &&
          !scheduledSyntheticResponseRef.current.fired &&
          stageTime >= scheduledSyntheticResponseRef.current.triggerAtMs
        ) {
          scheduledSyntheticResponseRef.current.fired = true;
          const res = gazeEngine.recordParticipantResponse();
          if (res.accepted && notifySyntheticResp && (res.outcome === 'correct_hit' || res.outcome === 'false_alarm')) {
            notifySyntheticResp(res.outcome, res.reactionMs);
          }
        }

        // Render active pulse visual envelope
        if (activePulseRef.current) {
          const age = stageTime - activePulseRef.current.startedAtMs;
          if (activePulseRef.current.type === 'single') {
            if (age < 420) {
              const env = Math.sin((age / 420) * Math.PI);
              pulseScaleOffset = env * 0.22;
              pulseFlashAlpha = env * 0.45;
            } else {
              activePulseRef.current = null;
            }
          } else {
            // Double Pulse: Burst 1 (0..180ms), quiet gap (180..270ms), Burst 2 (270..520ms)
            if (age < 180) {
              const env1 = Math.sin((age / 180) * Math.PI);
              pulseScaleOffset = env1 * 0.26;
              pulseFlashAlpha = env1 * 0.7;
            } else if (age < 270) {
              pulseScaleOffset = 0.02;
              pulseFlashAlpha = 0.08;
            } else if (age < 520) {
              const env2 = Math.sin(((age - 270) / 250) * Math.PI);
              pulseScaleOffset = env2 * 0.34;
              pulseFlashAlpha = env2 * 0.92;
            } else {
              activePulseRef.current = null;
            }
          }
        }

        gazeEngine.finalizePendingTrials();
      }

      // 4. Advance Cursor / Synthetic Gaze Position & Record Gaze Telemetry
      let gazePos = { x: pointerPosRef.current.x, y: pointerPosRef.current.y };

      if (mode === 'investor_demo_synthetic') {
        gazePos = running && !paused
          ? syntheticGazeRef.current.step(
              simTimeClockMs,
              effectiveDt,
              centerX,
              centerY,
              profileId,
              activeDistractors.map((d) => ({ id: d.id, x: d.x, y: d.y })),
              curStage
            )
          : { x: centerX, y: centerY };
      }

      let currentState: GazeStateType = lastGazeStateRef.current;
      if (running) {
        if (paused) {
          gazeEngine.advancePausedTime(rawDt);
          currentState = 'paused';
        } else {
          const distractorCircles: ActiveDistractorCircle[] = activeDistractors.map((d) => ({
            id: d.id,
            x: d.x,
            y: d.y,
            radius: d.hitRadius
          }));
          currentState = gazeEngine.recordSample(
            effectiveDt,
            gazePos.x,
            gazePos.y,
            centerX,
            centerY,
            primaryRadius,
            distractorCircles,
            false
          );
        }

        if (currentState !== lastGazeStateRef.current) {
          lastGazeStateRef.current = currentState;
          if (notifyState) notifyState(currentState);
        }
      }

      // 5. Render Primary Target Orb (Warm Amber / Burnt Orange / Soft Gold)
      const organicBreath = reduceMotion
        ? 1.0
        : 1 + 0.065 * Math.sin((now * 0.0018));
      const visualOrbRadius = 24 * (organicBreath + pulseScaleOffset);

      // Target boundary subtle ring (highlights subtly when gaze is locked)
      ctx.beginPath();
      ctx.arc(centerX, centerY, primaryRadius, 0, Math.PI * 2);
      ctx.strokeStyle =
        currentState === 'target'
          ? 'rgba(245, 158, 11, 0.32)'
          : 'rgba(148, 163, 184, 0.14)';
      ctx.lineWidth = currentState === 'target' ? 1.5 : 1;
      ctx.stroke();

      // Double-pulse crisp expanding shockwave ring
      if (pulseFlashAlpha > 0.25 && activePulseRef.current?.type === 'double') {
        const ringAge = stageTime - activePulseRef.current.startedAtMs;
        if (ringAge > 250) {
          const ringProgress = Math.min(1, (ringAge - 250) / 360);
          ctx.beginPath();
          ctx.arc(centerX, centerY, primaryRadius * (0.7 + ringProgress * 0.9), 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(253, 224, 71, ${(1 - ringProgress) * 0.75})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      // Soft outer corona glow
      const coronaGrad = ctx.createRadialGradient(
        centerX,
        centerY,
        visualOrbRadius * 0.3,
        centerX,
        centerY,
        visualOrbRadius * 3.1
      );
      coronaGrad.addColorStop(
        0,
        `rgba(245, 158, 11, ${Math.min(0.85, 0.38 + pulseFlashAlpha * 0.45)})`
      );
      coronaGrad.addColorStop(0.45, 'rgba(217, 119, 6, 0.14)');
      coronaGrad.addColorStop(1, 'rgba(217, 119, 6, 0)');
      ctx.fillStyle = coronaGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, visualOrbRadius * 3.1, 0, Math.PI * 2);
      ctx.fill();

      // Organic Amber Core Sphere
      const coreGrad = ctx.createRadialGradient(
        centerX - visualOrbRadius * 0.25,
        centerY - visualOrbRadius * 0.25,
        2,
        centerX,
        centerY,
        visualOrbRadius
      );
      coreGrad.addColorStop(0, '#FEF3C7');
      coreGrad.addColorStop(0.42, '#F59E0B');
      coreGrad.addColorStop(0.88, '#C2410C');
      coreGrad.addColorStop(1, 'rgba(180, 83, 9, 0.2)');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, visualOrbRadius, 0, Math.PI * 2);
      ctx.fill();

      // 6. Render Distractor Particles
      activeDistractors.forEach((d) => {
        ctx.save();
        ctx.globalAlpha = d.opacity;

        // Subtle outer bloom
        const dGlow = ctx.createRadialGradient(d.x, d.y, 1, d.x, d.y, d.visualRadius * 3.2);
        dGlow.addColorStop(0, d.colorGlow);
        dGlow.addColorStop(1, 'rgba(6, 182, 212, 0)');
        ctx.fillStyle = dGlow;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.visualRadius * 3.2, 0, Math.PI * 2);
        ctx.fill();

        // Core particle
        ctx.fillStyle = d.colorCore;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.visualRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 7. Render Gaze Tracking Reticle
      if (running) {
        const reticleColor =
          currentState === 'target'
            ? 'rgba(251, 191, 36, 0.85)'
            : currentState === 'distractor'
            ? 'rgba(34, 211, 238, 0.9)'
            : 'rgba(148, 163, 184, 0.7)';

        ctx.save();
        ctx.strokeStyle = reticleColor;
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.arc(gazePos.x, gazePos.y, 12, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = reticleColor;
        ctx.beginPath();
        ctx.arc(gazePos.x, gazePos.y, 2.2, 0, Math.PI * 2);
        ctx.fill();

        if (mode === 'investor_demo_synthetic') {
          ctx.font = '10px "JetBrains Mono", monospace';
          ctx.fillStyle = 'rgba(34, 211, 238, 0.85)';
          ctx.fillText('Synthetic Gaze', gazePos.x + 16, gazePos.y + 4);
        }
        ctx.restore();
      }

      ctx.restore();
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [gazeEngine]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[420px] rounded-2xl overflow-hidden border border-slate-800/90 bg-[#04060A]"
    >
      <canvas
        ref={canvasRef}
        className={`w-full h-full block ${
          trackingMode === 'interactive_cursor' ? 'cursor-crosshair' : 'cursor-default'
        }`}
      />
    </div>
  );
};
