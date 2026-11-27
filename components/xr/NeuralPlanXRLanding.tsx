import React, { useState } from 'react';
import {
  ArrowLeft,
  Eye,
  Activity,
  Sparkles,
  Volume2,
  VolumeX,
  Play,
  SlidersHorizontal,
  ShieldCheck,
  Monitor,
  Layers
} from 'lucide-react';
import { DemoProfileId } from '../../services/xr/xrTypes';
import { INVESTOR_DEMO_PROFILES } from '../../services/xr/investorDemoProfiles';
import { VrHeadsetIcon } from './VrHeadsetIcon';

interface NeuralPlanXRLandingProps {
  onStartInteractive: () => void;
  onStartDemo: (profileId: DemoProfileId) => void;
  onBackToDashboard: () => void;
  reducedMotion: boolean;
  onToggleReducedMotion: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  lastReportAvailable: boolean;
  onViewLastReport: () => void;
}

export const NeuralPlanXRLanding: React.FC<NeuralPlanXRLandingProps> = ({
  onStartInteractive,
  onStartDemo,
  onBackToDashboard,
  reducedMotion,
  onToggleReducedMotion,
  soundEnabled,
  onToggleSound,
  lastReportAvailable,
  onViewLastReport
}) => {
  const [selectedDemoProfile, setSelectedDemoProfile] = useState<DemoProfileId>('profile_b');
  const [showDemoPicker, setShowDemoPicker] = useState(false);

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 flex flex-col">
      {/* Minimal Scientific Header */}
      <header className="border-b border-slate-800/80 bg-[#0B0E17]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onBackToDashboard}
              className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>NeuralPlan Dashboard</span>
            </button>
            <span className="text-slate-700" aria-hidden="true">·</span>
            <span className="text-sm font-semibold tracking-tight text-white whitespace-nowrap shrink-0 flex items-center gap-2">
              <VrHeadsetIcon className="w-4 h-4 text-amber-400" />
              <span>NeuralPlan XR</span>
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {lastReportAvailable && (
              <button
                type="button"
                onClick={onViewLastReport}
                className="px-3 py-1.5 text-xs font-medium text-amber-300 hover:text-amber-200 border border-amber-500/30 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                Previous Session Report
              </button>
            )}
            <button
              type="button"
              onClick={onToggleReducedMotion}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                reducedMotion
                  ? 'bg-slate-800 border-amber-500/40 text-amber-300'
                  : 'bg-transparent border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle reduced visual motion and particle effects"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{reducedMotion ? 'Reduced Motion: On' : 'Reduced Motion: Off'}</span>
            </button>

            <button
              type="button"
              onClick={onToggleSound}
              className={`p-2 rounded-lg border transition-colors ${
                soundEnabled
                  ? 'bg-slate-800 border-amber-500/40 text-amber-300'
                  : 'bg-transparent border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title={soundEnabled ? 'Mute optional audio cues' : 'Enable optional ambient and pulse cues'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-12 lg:py-16 space-y-14">
        {/* Small Screen Notice */}
        <div className="md:hidden border border-slate-800 bg-[#111520] rounded-xl p-4 flex items-start gap-3 text-xs text-slate-300">
          <Monitor className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            NeuralPlan XR is calibrated for desktop and laptop displays with cursor gaze tracking. Smaller screens run in a simplified spatial viewport and do not reproduce headset XR optics.
          </p>
        </div>

        {/* Hero Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
          <div className="lg:col-span-7 flex flex-col justify-between space-y-8">
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-xs font-mono text-amber-400/90 tracking-wide">
                <span>Experimental Cognitive Concept</span>
                <span aria-hidden="true">·</span>
                <span>Browser-Based XR Prototype</span>
              </div>

              <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-white leading-[1.1] text-balance">
                NeuralPlan XR
              </h1>

              <p className="text-xl sm:text-2xl font-medium text-amber-200/90 leading-snug text-balance">
                Explore your attention. Understand your cognitive patterns.
              </p>

              <p className="text-base text-slate-300 max-w-2xl leading-relaxed">
                An experimental immersive experience exploring sustained attention, visual distractibility and attentional control through interactive cognitive simulations.
              </p>
            </div>

            {/* Primary & Secondary CTAs */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={onStartInteractive}
                  className="px-7 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm transition-all flex items-center gap-2.5 shadow-lg shadow-amber-500/15 whitespace-nowrap shrink-0"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start XR Experience</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowDemoPicker((prev) => !prev)}
                  className="px-6 py-3.5 rounded-xl bg-[#131824] hover:bg-[#1B2233] text-slate-100 border border-slate-700 hover:border-cyan-500/50 font-semibold text-sm transition-all flex items-center gap-2.5 whitespace-nowrap shrink-0"
                >
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>Explore Demonstration</span>
                </button>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
                Works directly in your desktop browser without a VR headset or specialist eye-tracking hardware. Simulated gaze tracking uses cursor position.
              </p>
            </div>

            {/* Mandatory Scientific & Ethical Disclaimer */}
            <div className="border border-slate-800 bg-[#0D111A] rounded-xl p-4 flex items-start gap-3">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-300 leading-relaxed">
                NeuralPlan XR is an experimental cognitive simulation designed to explore attention-related behaviours. This experience is not a medical device and does not diagnose ADHD or any other neurodevelopmental condition.
              </p>
            </div>
          </div>

          {/* Spatial Environment Live Preview Card */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="flex-1 min-h-[340px] rounded-2xl border border-slate-800 bg-[#04060A] relative overflow-hidden flex flex-col items-center justify-center p-8">
              {/* Subtle Radial Coordinates */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-72 h-72 rounded-full border border-slate-800/70" />
                <div className="absolute w-48 h-48 rounded-full border border-slate-800/60 border-dashed" />
                <div className="absolute w-24 h-24 rounded-full border border-amber-500/20" />
              </div>

              {/* Ambient Warm Amber Core Stimulus */}
              <div className="relative flex items-center justify-center">
                <div
                  className={`w-36 h-36 rounded-full bg-amber-500/20 blur-2xl ${
                    reducedMotion ? '' : 'animate-pulse'
                  }`}
                />
                <div
                  className="absolute w-16 h-16 rounded-full"
                  style={{
                    background:
                      'radial-gradient(circle at 38% 35%, #FDE68A 0%, #F59E0B 48%, #B45309 100%)',
                    boxShadow: '0 0 42px rgba(245, 158, 11, 0.55)'
                  }}
                />
                {/* Cyan Secondary Distractor Orbit */}
                <div
                  className={`absolute w-52 h-52 ${reducedMotion ? '' : 'animate-[spin_14s_linear_infinite]'}`}
                >
                  <div
                    className="w-3.5 h-3.5 rounded-full bg-cyan-400 absolute top-1 left-1/2 -translate-x-1/2"
                    style={{ boxShadow: '0 0 18px rgba(34, 211, 238, 0.85)' }}
                  />
                </div>
              </div>

              <div className="absolute bottom-5 inset-x-6 flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>Primary: Warm Amber Fixation</span>
                <span className="text-cyan-400">Stimulus: Cyan Orbital</span>
              </div>
            </div>
          </div>
        </div>

        {/* Investor Demonstration Profile Selector (Revealed via Explore Demonstration) */}
        {showDemoPicker && (
          <section className="border border-cyan-500/30 bg-[#0D131F] rounded-2xl p-6 lg:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
              <div>
                <div className="text-xs font-mono text-cyan-400 mb-1">
                  Investor Demo Mode · Synthetic Behavioural Scenarios
                </div>
                <h2 className="text-xl font-semibold text-white">
                  Select an Illustrative Attention Scenario to Walk Through
                </h2>
                <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                  Automated walkthrough drives a synthetic gaze cursor across all stages, updates live telemetry, and compiles a sample report. All metrics are clearly marked as synthetic demonstration data.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onStartDemo(selectedDemoProfile)}
                className="px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Launch Automated Demo</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(Object.keys(INVESTOR_DEMO_PROFILES) as DemoProfileId[]).map((pid) => {
                const profile = INVESTOR_DEMO_PROFILES[pid];
                const isSelected = selectedDemoProfile === pid;
                return (
                  <button
                    key={pid}
                    type="button"
                    onClick={() => setSelectedDemoProfile(pid)}
                    className={`text-left p-5 rounded-xl border transition-all flex flex-col justify-between space-y-3 ${
                      isSelected
                        ? 'bg-[#141D2E] border-cyan-400 text-white'
                        : 'bg-[#090D15] border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-white">
                          {profile.name}
                        </span>
                      </div>
                      <p className="text-xs font-mono text-cyan-300/90">
                        {profile.tagline}
                      </p>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {profile.description}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-slate-800/80 text-[11px] font-mono text-slate-400 flex items-center justify-between">
                      <span>Target Bias: {Math.round(profile.behaviorParams.targetFixationBias * 100)}%</span>
                      <span>{isSelected ? 'Selected' : 'Select'}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Three Core Feature Highlights */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          <div className="border border-slate-800 bg-[#0C1018] rounded-2xl p-6 space-y-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="text-base font-semibold text-white">
              1. Immersive Attention Simulation
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Five progressive experimental stages calibrate baseline fixation, orbital distractors, competing peripheral stimuli, and response control under quiet atmospheric depth.
            </p>
          </div>

          <div className="border border-slate-800 bg-[#0C1018] rounded-2xl p-6 space-y-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Eye className="w-4 h-4" />
            </div>
            <h3 className="text-base font-semibold text-white">
              2. Real-Time Gaze Interaction
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Timestamped cursor telemetry tracks fixation stability, distinct distractor capture events, and refocusing latency without requiring external XR headsets or cameras.
            </p>
          </div>

          <div className="border border-slate-800 bg-[#0C1018] rounded-2xl p-6 space-y-3">
            <div className="w-9 h-9 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <Activity className="w-4 h-4" />
            </div>
            <h3 className="text-base font-semibold text-white">
              3. Cognitive Performance Insights
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Multi-stage analytics visualize attention timelines, reaction-time consistency, and stage-by-stage recovery dynamics with descriptive, neurodiversity-informed summaries.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
};
