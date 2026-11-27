// Lock-screen resilient, dynamic Web Audio API synthesis engine for neuro-acoustic focus soundscapes

export type SoundscapeType =
  | 'none'
  | 'white_noise'
  | 'pink_noise'
  | 'rainfall'
  | 'beach_waves'
  | 'binaural_alpha'
  | 'binaural_theta'
  | 'deep_space';

export interface SoundscapeOption {
  id: SoundscapeType;
  name: string;
  tagline: string;
  category: 'Broadband Noise' | 'Biophilic Nature' | 'Neural Entrainment';
  description: string;
  iconName: string;
  badge: string;
  gradient: string;
}

export const SOUNDSCAPE_OPTIONS: SoundscapeOption[] = [
  {
    id: 'rainfall',
    name: 'Restorative Rainfall',
    tagline: 'Droplet patters, swelling showers & distant thunder',
    category: 'Biophilic Nature',
    description:
      'Starts as gentle pattering droplets before swelling into lush stereo rainfall with passing gusts and slow, distant thunder rumbles.',
    iconName: 'CloudRain',
    badge: 'Evolving Storm',
    gradient: 'from-blue-500/20 to-cyan-500/10',
  },
  {
    id: 'beach_waves',
    name: 'Beachside Ocean Waves',
    tagline: 'Rolling swells, crashing crests & retreating foam',
    category: 'Biophilic Nature',
    description:
      'Procedural coastal surf that builds offshore, crests and crashes across the stereo shoreline, and recedes softly over wet sand.',
    iconName: 'Waves',
    badge: 'Coastal Surf',
    gradient: 'from-cyan-500/20 to-teal-500/10',
  },
  {
    id: 'white_noise',
    name: 'Velvet Brown Noise',
    tagline: 'Warm, breathing distraction shielding',
    category: 'Broadband Noise',
    description:
      'Stereo low-pass Brownian noise with gentle filter breathing that masks sudden chatter and sharp room transients without ear fatigue.',
    iconName: 'Wind',
    badge: 'Distraction Mask',
    gradient: 'from-amber-500/20 to-orange-500/10',
  },
  {
    id: 'binaural_alpha',
    name: '10Hz Alpha Pulses',
    tagline: 'Modulating flow pulses & harmonic breath',
    category: 'Neural Entrainment',
    description:
      'Dynamic stereo beat drifting cleanly through 8.5–11.5Hz Alpha with warm breathing pulse swells for relaxed, sustained focus.',
    iconName: 'Sparkles',
    badge: 'Flow Entrainment',
    gradient: 'from-indigo-500/20 to-purple-500/10',
  },
  {
    id: 'binaural_theta',
    name: '6Hz Deep Theta',
    tagline: 'Drifting theta pulses & harmonic shimmer',
    category: 'Neural Entrainment',
    description:
      'Evolving 4.8–7.2Hz Theta frequency pulses paired with breathing warm harmonics for deep synthesis and creative problem solving.',
    iconName: 'Zap',
    badge: 'Deep Synthesis',
    gradient: 'from-emerald-500/20 to-teal-500/10',
  },
  {
    id: 'deep_space',
    name: 'Cosmic Resonance',
    tagline: 'Evolving sub-bass pulses & drifting overtones',
    category: 'Broadband Noise',
    description:
      'Warm polyphonic low-frequency pulses, sweeping spatial filters, and slow harmonic blooms engineered for deep hyperfocus.',
    iconName: 'Radio',
    badge: 'Neural Lock',
    gradient: 'from-violet-500/20 to-indigo-500/10',
  },
];

type PhaseListener = (phase: string) => void;

export interface SoundscapePlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  activeType: SoundscapeType;
  phase: string;
  volume: number;
  isMuted: boolean;
}

type StateListener = (state: SoundscapePlaybackState) => void;

const ACTIVE_SOUNDSCAPE_STORAGE_KEY = 'neuralplan_soundscape_explicit_active_v1';

/**
 * Generates an in-memory silent 2-second mono PCM WAV Blob URL.
 * Used as a fallback background media session anchor when MediaStreamAudioDestinationNode
 * is unavailable on the host browser.
 */
function createSilentWavBlobUrl(): string {
  const sampleRate = 8000;
  const numSamples = sampleRate * 2;
  const dataSize = numSamples * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // Linear PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  const blob = new Blob([buffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

class SoundscapeEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isPlaying: boolean = false;
  private isPausedByMediaSession: boolean = false;
  private isMuted: boolean = false;
  private currentType: SoundscapeType = 'none';
  private activeNodes: { stop?: () => void; disconnect?: () => void }[] = [];
  private uiTimers: ReturnType<typeof setTimeout>[] = [];
  private stopTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private playGeneration: number = 0;
  private volume: number = 0.65;
  private currentPhase: string = '';
  private phaseListeners: Set<PhaseListener> = new Set();
  private stateListeners: Set<StateListener> = new Set();

  // Background OS playback anchors (MediaStreamDestination + fallback silent WAV)
  private bgStreamAudio: HTMLAudioElement | null = null;
  private mediaStreamDest: MediaStreamAudioDestinationNode | null = null;
  private lockScreenAudio: HTMLAudioElement | null = null;
  private silentWavUrl: string | null = null;
  private visibilityBound: boolean = false;
  private bufferCache: Map<string, AudioBuffer> = new Map();

  private bindVisibilityRecovery() {
    if (this.visibilityBound || typeof document === 'undefined') return;
    this.visibilityBound = true;

    const recoverIfNeeded = () => {
      if (!this.isPlaying || this.isPausedByMediaSession) return;
      if (this.ctx && (this.ctx.state === 'suspended' || (this.ctx.state as string) === 'interrupted')) {
        this.ctx.resume().catch(() => {});
      }
      if (this.bgStreamAudio && this.bgStreamAudio.srcObject && this.bgStreamAudio.paused) {
        this.bgStreamAudio.play().catch(() => {});
      }
      if (this.lockScreenAudio && this.lockScreenAudio.paused) {
        this.lockScreenAudio.play().catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', recoverIfNeeded);
    window.addEventListener('pageshow', recoverIfNeeded);
    window.addEventListener('focus', recoverIfNeeded);
  }

  private getAudioContext(): AudioContext {
    this.bindVisibilityRecovery();

    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.ctx.addEventListener('statechange', () => {
        if (
          this.isPlaying &&
          !this.isPausedByMediaSession &&
          this.ctx &&
          (this.ctx.state === 'suspended' || (this.ctx.state as string) === 'interrupted')
        ) {
          this.ctx.resume().catch(() => {});
        }
      });
    }
    if (this.ctx.state === 'suspended' || (this.ctx.state as string) === 'interrupted') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private persistExplicitSoundscape(type: SoundscapeType | null) {
    try {
      if (!type || type === 'none') {
        localStorage.removeItem(ACTIVE_SOUNDSCAPE_STORAGE_KEY);
      } else {
        localStorage.setItem(ACTIVE_SOUNDSCAPE_STORAGE_KEY, type);
      }
    } catch {
      // Ignore storage failures
    }
  }

  public getPersistedSoundscape(): SoundscapeType | null {
    try {
      const val = localStorage.getItem(ACTIVE_SOUNDSCAPE_STORAGE_KEY) as SoundscapeType | null;
      if (val && val !== 'none' && SOUNDSCAPE_OPTIONS.some((o) => o.id === val)) {
        return val;
      }
      return null;
    } catch {
      return null;
    }
  }

  public clearPersistedSoundscape() {
    this.persistExplicitSoundscape(null);
  }

  private connectOutputForBackgroundPlayback(ctx: AudioContext, masterGain: GainNode, type: SoundscapeType) {
    // Route live Web Audio directly into an OS-managed <audio> MediaStream element when supported.
    // This makes iOS Safari & Android Chrome treat the synthesis as an active background media stream
    // so pressing Home or locking the screen keeps audio alive until explicitly stopped.
    let routedThroughStream = false;

    if (typeof ctx.createMediaStreamDestination === 'function' && typeof Audio !== 'undefined') {
      try {
        const dest = ctx.createMediaStreamDestination();
        masterGain.connect(dest);
        this.mediaStreamDest = dest;
        this.activeNodes.push(dest);

        if (!this.bgStreamAudio) {
          const el = new Audio();
          el.autoplay = true;
          el.muted = false;
          el.volume = 1;
          el.setAttribute('playsinline', 'true');
          el.addEventListener('pause', () => {
            if (this.isPlaying && !this.isPausedByMediaSession && el.srcObject) {
              // If the OS tried to pause on background transition without user request, resume immediately
              el.play().catch(() => {});
            }
          });
          this.bgStreamAudio = el;
        }

        this.bgStreamAudio.srcObject = dest.stream;
        const playPromise = this.bgStreamAudio.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(() => {
            // If stream playback is blocked, ensure direct hardware destination is connected
            try {
              masterGain.connect(ctx.destination);
            } catch {}
          });
        }
        routedThroughStream = true;
      } catch {
        routedThroughStream = false;
      }
    }

    if (!routedThroughStream) {
      masterGain.connect(ctx.destination);
      this.startFallbackSilentAnchor();
    }

    this.updateMediaSession(type, 'playing');
  }

  private startFallbackSilentAnchor() {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') return;
    try {
      if (!this.silentWavUrl) {
        this.silentWavUrl = createSilentWavBlobUrl();
      }
      if (!this.lockScreenAudio) {
        const el = new Audio(this.silentWavUrl);
        el.loop = true;
        el.preload = 'auto';
        el.muted = false;
        el.volume = 0.02;
        el.setAttribute('playsinline', 'true');
        this.lockScreenAudio = el;
      }
      this.lockScreenAudio.play().catch(() => {});
    } catch {
      // Safe fallback
    }
  }

  private updateMediaSession(type: SoundscapeType, playbackState: 'playing' | 'paused' | 'none') {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    const option = SOUNDSCAPE_OPTIONS.find((o) => o.id === type);
    try {
      if (playbackState !== 'none') {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: option?.name || 'NeuralPlan Focus Audio',
          artist: 'NeuralPlan Soundscape',
          album: 'Plays until you turn it off',
        });
      }
      navigator.mediaSession.playbackState = playbackState;

      navigator.mediaSession.setActionHandler('play', () => {
        this.resumeFromLockScreen();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        this.pauseFromLockScreen();
      });
      navigator.mediaSession.setActionHandler('stop', () => {
        this.stop();
      });
    } catch {
      // Ignore MediaSession errors on unsupported platforms
    }
  }

  private stopLockScreenAnchor() {
    if (this.bgStreamAudio) {
      try {
        this.bgStreamAudio.pause();
        this.bgStreamAudio.srcObject = null;
      } catch {
        // Ignore cleanup errors
      }
    }
    this.mediaStreamDest = null;

    if (this.lockScreenAudio) {
      try {
        this.lockScreenAudio.pause();
        this.lockScreenAudio.currentTime = 0;
      } catch {
        // Ignore pause errors
      }
    }

    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      try {
        navigator.mediaSession.playbackState = 'none';
      } catch {
        // Ignore
      }
    }
  }

  public pause() {
    this.pauseFromLockScreen();
  }

  public resume() {
    this.resumeFromLockScreen();
  }

  private pauseFromLockScreen() {
    if (!this.isPlaying) return;
    this.isPausedByMediaSession = true;
    this.ctx?.suspend().catch(() => {});
    this.bgStreamAudio?.pause();
    this.lockScreenAudio?.pause();
    this.updateMediaSession(this.currentType, 'paused');
    this.emitState();
  }

  private resumeFromLockScreen() {
    if (!this.isPlaying) return;
    this.isPausedByMediaSession = false;
    this.ctx?.resume().catch(() => {});
    if (this.bgStreamAudio && this.bgStreamAudio.srcObject) {
      this.bgStreamAudio.play().catch(() => {});
    }
    this.lockScreenAudio?.play().catch(() => {});
    this.updateMediaSession(this.currentType, 'playing');
    this.emitState();
  }

  public getPlaybackState(): SoundscapePlaybackState {
    return {
      isPlaying: this.isPlaying,
      isPaused: this.isPausedByMediaSession,
      activeType: this.currentType,
      phase: this.currentPhase,
      volume: this.volume,
      isMuted: this.isMuted,
    };
  }

  private emitState() {
    const snapshot = this.getPlaybackState();
    this.stateListeners.forEach((cb) => cb(snapshot));
  }

  public subscribeState(listener: StateListener): () => void {
    this.stateListeners.add(listener);
    listener(this.getPlaybackState());
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  public subscribePhase(listener: PhaseListener): () => void {
    this.phaseListeners.add(listener);
    listener(this.currentPhase);
    return () => {
      this.phaseListeners.delete(listener);
    };
  }

  public getCurrentPhase(): string {
    return this.currentPhase;
  }

  private setPhase(phase: string, generation: number) {
    if (generation !== this.playGeneration) return;
    if (this.currentPhase === phase) return;
    this.currentPhase = phase;
    this.phaseListeners.forEach((cb) => cb(phase));
    this.emitState();
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    this.isMuted = this.volume === 0;
    if (this.masterGain && this.ctx && this.isPlaying) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
    this.emitState();
  }

  public getVolume(): number {
    return this.volume;
  }

  public getCurrentType(): SoundscapeType {
    return this.currentType;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  private scheduleUiTimer(
    fn: () => void,
    delayMs: number,
    generation: number
  ): ReturnType<typeof setTimeout> {
    const id = setTimeout(() => {
      this.uiTimers = this.uiTimers.filter((t) => t !== id);
      if (generation === this.playGeneration && this.isPlaying) {
        fn();
      }
    }, delayMs);
    this.uiTimers.push(id);
    return id;
  }

  private clearActiveAudioImmediately() {
    if (this.stopTimeoutId) {
      clearTimeout(this.stopTimeoutId);
      this.stopTimeoutId = null;
    }

    this.uiTimers.forEach((id) => clearTimeout(id));
    this.uiTimers = [];

    this.activeNodes.forEach((node) => {
      try {
        if (node.stop) node.stop();
      } catch {
        // Ignore already-stopped nodes
      }
      try {
        if (node.disconnect) node.disconnect();
      } catch {
        // Ignore already-disconnected nodes
      }
    });
    this.activeNodes = [];
  }

  public stop() {
    this.persistExplicitSoundscape(null);

    if (!this.isPlaying && this.activeNodes.length === 0) {
      this.stopLockScreenAnchor();
      this.emitState();
      return;
    }

    this.playGeneration += 1;
    this.isPlaying = false;
    this.isPausedByMediaSession = false;
    this.currentType = 'none';
    this.currentPhase = '';
    this.phaseListeners.forEach((cb) => cb(''));

    this.uiTimers.forEach((id) => clearTimeout(id));
    this.uiTimers = [];

    this.stopLockScreenAnchor();
    this.emitState();

    if (this.masterGain && this.ctx) {
      try {
        this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.12);
      } catch {
        // Ignore scheduling errors
      }
    }

    const genAtStop = this.playGeneration;
    this.stopTimeoutId = setTimeout(() => {
      if (genAtStop !== this.playGeneration) return;
      this.clearActiveAudioImmediately();
    }, 240);
  }

  public play(type: SoundscapeType) {
    if (type === 'none') {
      this.stop();
      return;
    }

    const ctx = this.getAudioContext();
    this.playGeneration += 1;
    const generation = this.playGeneration;
    this.isPausedByMediaSession = false;
    this.isMuted = this.volume === 0;

    this.clearActiveAudioImmediately();

    this.masterGain = ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.001, ctx.currentTime);
    this.masterGain.gain.setTargetAtTime(this.volume, ctx.currentTime + 0.04, 0.25);
    this.activeNodes.push(this.masterGain);

    this.connectOutputForBackgroundPlayback(ctx, this.masterGain, type);
    this.persistExplicitSoundscape(type);

    this.isPlaying = true;
    this.currentType = type;
    this.emitState();

    switch (type) {
      case 'white_noise':
      case 'pink_noise':
        this.generateDynamicBrownNoise(ctx, this.masterGain, generation);
        break;
      case 'rainfall':
        this.generateDynamicRainfall(ctx, this.masterGain, generation);
        break;
      case 'beach_waves':
        this.generateBeachWaves(ctx, this.masterGain, generation);
        break;
      case 'binaural_alpha':
        this.generateDynamicFrequencyPulses(ctx, this.masterGain, generation, {
          mode: 'alpha',
          baseFreq: 200,
          centerBeat: 10,
          beatSwing: 1.5,
          pulseCycleSec: 12,
        });
        break;
      case 'binaural_theta':
        this.generateDynamicFrequencyPulses(ctx, this.masterGain, generation, {
          mode: 'theta',
          baseFreq: 162,
          centerBeat: 6,
          beatSwing: 1.2,
          pulseCycleSec: 15,
        });
        break;
      case 'deep_space':
        this.generateCosmicResonance(ctx, this.masterGain, generation);
        break;
    }
  }

  // Utility: Seamless crossfaded stereo pink-noise buffer (works on BaseAudioContext & OfflineAudioContext)
  private createStereoPinkNoiseBuffer(ctx: BaseAudioContext, durationSec: number): AudioBuffer {
    const length = Math.floor(durationSec * ctx.sampleRate);
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    const crossfadeSamples = Math.min(Math.floor(ctx.sampleRate * 0.25), Math.floor(length / 8));

    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.095;
        b6 = white * 0.115926;
      }

      for (let i = 0; i < crossfadeSamples; i++) {
        const t = i / crossfadeSamples;
        const head = data[i];
        const tail = data[length - crossfadeSamples + i];
        data[i] = head * t + tail * (1 - t);
      }
    }
    return buffer;
  }

  // Utility: Seamless crossfaded stereo brown-noise buffer
  private createStereoBrownNoiseBuffer(ctx: BaseAudioContext, durationSec: number): AudioBuffer {
    const length = Math.floor(durationSec * ctx.sampleRate);
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    const crossfadeSamples = Math.min(Math.floor(ctx.sampleRate * 0.25), Math.floor(length / 8));

    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      let lastOut = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + 0.02 * white) / 1.02;
        data[i] = lastOut * 3.2;
      }
      for (let i = 0; i < crossfadeSamples; i++) {
        const t = i / crossfadeSamples;
        data[i] = data[i] * t + data[length - crossfadeSamples + i] * (1 - t);
      }
    }
    return buffer;
  }

  // Utility: Apply seamless head-tail loop crossfade directly onto a rendered OfflineAudioContext buffer
  private smoothLoopBoundaries(buffer: AudioBuffer, crossfadeSec: number = 0.8): AudioBuffer {
    const crossSamples = Math.min(Math.floor(buffer.sampleRate * crossfadeSec), Math.floor(buffer.length / 6));
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const data = buffer.getChannelData(ch);
      const len = data.length;
      for (let i = 0; i < crossSamples; i++) {
        const fadeOut = Math.cos((i / crossSamples) * Math.PI * 0.5);
        const fadeIn = Math.sin((i / crossSamples) * Math.PI * 0.5);
        const tailVal = data[len - crossSamples + i];
        const headVal = data[i];
        data[i] = headVal * fadeIn + tailVal * fadeOut;
        data[len - crossSamples + i] = tailVal * fadeIn;
      }
    }
    return buffer;
  }

  // Cached OfflineAudioContext rendering helper so hardware-threaded dynamic loops never depend on JS timers
  private async getOrRenderLoopBuffer(
    cacheKey: string,
    sampleRate: number,
    durationSec: number,
    buildGraph: (offline: OfflineAudioContext) => void
  ): Promise<AudioBuffer | null> {
    const fullKey = `${cacheKey}_${sampleRate}`;
    const existing = this.bufferCache.get(fullKey);
    if (existing) return existing;

    if (typeof OfflineAudioContext === 'undefined') return null;
    try {
      const length = Math.floor(durationSec * sampleRate);
      const offline = new OfflineAudioContext(2, length, sampleRate);
      buildGraph(offline);
      const rendered = await offline.startRendering();
      this.smoothLoopBoundaries(rendered, 0.9);
      this.bufferCache.set(fullKey, rendered);
      return rendered;
    } catch {
      return null;
    }
  }

  // 1. Dynamic Velvet Brown Noise (100% native audio-thread LFO modulation)
  private generateDynamicBrownNoise(ctx: AudioContext, destination: AudioNode, generation: number) {
    this.setPhase('Warm Acoustic Shield', generation);

    const buffer = this.createStereoBrownNoiseBuffer(ctx, 11);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(440, ctx.currentTime);
    filter.Q.setValueAtTime(0.6, ctx.currentTime);

    const filterLfo = ctx.createOscillator();
    filterLfo.type = 'sine';
    filterLfo.frequency.setValueAtTime(0.045, ctx.currentTime);
    const filterLfoGain = ctx.createGain();
    filterLfoGain.gain.setValueAtTime(100, ctx.currentTime);
    filterLfo.connect(filterLfoGain);
    filterLfoGain.connect(filter.frequency);

    const breathGain = ctx.createGain();
    breathGain.gain.setValueAtTime(0.85, ctx.currentTime);
    const ampLfo = ctx.createOscillator();
    ampLfo.type = 'sine';
    ampLfo.frequency.setValueAtTime(0.03, ctx.currentTime);
    const ampLfoGain = ctx.createGain();
    ampLfoGain.gain.setValueAtTime(0.1, ctx.currentTime);
    ampLfo.connect(ampLfoGain);
    ampLfoGain.connect(breathGain.gain);

    source.connect(filter);
    filter.connect(breathGain);
    breathGain.connect(destination);

    source.start();
    filterLfo.start();
    ampLfo.start();

    this.activeNodes.push(source, filter, filterLfo, filterLfoGain, breathGain, ampLfo, ampLfoGain);
  }

  // 2. Dynamic Biophilic Rainfall:
  //    - Immediate opening patters & intro swell scheduled directly on AudioContext time
  //    - Two coprime hardware-rendered looping storm tracks (37s rain+droplets + 53s distant rolling thunder)
  //      so patters, swells, and thunder continue organically even while phone is locked & JS sleeps!
  private generateDynamicRainfall(ctx: AudioContext, destination: AudioNode, generation: number) {
    const now = ctx.currentTime;
    this.setPhase('Gentle Patters', generation);

    // Immediate opening bed (light mist blooming smoothly into rain so playback begins with 0ms latency)
    const introPink = this.createStereoPinkNoiseBuffer(ctx, 13);
    const rainBedSrc = ctx.createBufferSource();
    rainBedSrc.buffer = introPink;
    rainBedSrc.loop = true;

    const bedHp = ctx.createBiquadFilter();
    bedHp.type = 'highpass';
    bedHp.frequency.setValueAtTime(260, now);

    const bedLp = ctx.createBiquadFilter();
    bedLp.type = 'lowpass';
    bedLp.frequency.setValueAtTime(900, now);
    bedLp.frequency.exponentialRampToValueAtTime(2500, now + 12);

    // Native slow gust filter sweep (runs lock-screen safe on hardware audio thread)
    const gustLfo = ctx.createOscillator();
    gustLfo.type = 'sine';
    gustLfo.frequency.setValueAtTime(0.08, now);
    const gustFilterGain = ctx.createGain();
    gustFilterGain.gain.setValueAtTime(420, now);
    gustLfo.connect(gustFilterGain);
    gustFilterGain.connect(bedLp.frequency);

    const bedGain = ctx.createGain();
    bedGain.gain.setValueAtTime(0.14, now);
    bedGain.gain.linearRampToValueAtTime(0.46, now + 10);

    // Native slow rain intensity swell LFO (steady <-> heavy squall)
    const swellLfo = ctx.createOscillator();
    swellLfo.type = 'sine';
    swellLfo.frequency.setValueAtTime(0.032, now);
    const swellGain = ctx.createGain();
    swellGain.gain.setValueAtTime(0.16, now);
    swellLfo.connect(swellGain);
    swellGain.connect(bedGain.gain);

    rainBedSrc.connect(bedHp);
    bedHp.connect(bedLp);
    bedLp.connect(bedGain);
    bedGain.connect(destination);

    rainBedSrc.start(now);
    gustLfo.start(now);
    swellLfo.start(now);
    this.activeNodes.push(
      rainBedSrc,
      bedHp,
      bedLp,
      gustLfo,
      gustFilterGain,
      bedGain,
      swellLfo,
      swellGain
    );

    // Pre-schedule opening droplet patters directly onto ctx.currentTime (0s -> 6s)
    const dropNoiseLen = Math.floor(ctx.sampleRate * 0.08);
    const dropBuffer = ctx.createBuffer(1, dropNoiseLen, ctx.sampleRate);
    const dropArr = dropBuffer.getChannelData(0);
    for (let i = 0; i < dropNoiseLen; i++) {
      dropArr[i] = Math.random() * 2 - 1;
    }

    let t = 0.05;
    while (t < 6.0) {
      const startAt = now + t;
      const src = ctx.createBufferSource();
      src.buffer = dropBuffer;
      const isHollow = Math.random() < 0.3;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(isHollow ? 900 + Math.random() * 650 : 2100 + Math.random() * 2500, startAt);
      bp.Q.setValueAtTime(isHollow ? 6.0 : 3.2, startAt);

      const g = ctx.createGain();
      const dur = isHollow ? 0.045 : 0.022;
      g.gain.setValueAtTime(0.0001, startAt);
      g.gain.linearRampToValueAtTime(0.085 + Math.random() * 0.07, startAt + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, startAt + dur);

      const pan = ctx.createStereoPanner();
      pan.pan.setValueAtTime(Math.random() * 1.6 - 0.8, startAt);

      src.connect(bp);
      bp.connect(g);
      g.connect(pan);
      pan.connect(destination);
      src.start(startAt);
      src.stop(startAt + dur + 0.01);
      this.activeNodes.push(src);

      t += Math.max(0.07, 0.28 - (t / 6) * 0.19) + Math.random() * 0.12;
    }

    // Render prime-length hardware-looping tracks (37s stereo droplet+rain dynamics & 53s distant rolling thunder)
    const rainLoopSec = 37;
    const thunderLoopSec = 53;

    Promise.all([
      this.getOrRenderLoopBuffer('rain_droplet_storm_v1', ctx.sampleRate, rainLoopSec, (offline) => {
        const pink = this.createStereoPinkNoiseBuffer(offline, rainLoopSec);
        const sheet = offline.createBufferSource();
        sheet.buffer = pink;

        const sheetLp = offline.createBiquadFilter();
        sheetLp.type = 'lowpass';
        sheetLp.frequency.setValueAtTime(1600, 0);
        // Sculpt organic intensity peaks and calm pauses across the 37s loop
        sheetLp.frequency.linearRampToValueAtTime(3400, 11);
        sheetLp.frequency.linearRampToValueAtTime(1400, 22);
        sheetLp.frequency.linearRampToValueAtTime(3100, 30);
        sheetLp.frequency.linearRampToValueAtTime(1600, rainLoopSec);

        const sheetGain = offline.createGain();
        sheetGain.gain.setValueAtTime(0.32, 0);
        sheetGain.gain.linearRampToValueAtTime(0.68, 11);
        sheetGain.gain.linearRampToValueAtTime(0.28, 22);
        sheetGain.gain.linearRampToValueAtTime(0.6, 30);
        sheetGain.gain.linearRampToValueAtTime(0.32, rainLoopSec);

        sheet.connect(sheetLp);
        sheetLp.connect(sheetGain);
        sheetGain.connect(offline.destination);
        sheet.start(0);

        // Bake ~480 organic stereo droplets across the 37s loop
        const dLen = Math.floor(offline.sampleRate * 0.07);
        const dBuf = offline.createBuffer(1, dLen, offline.sampleRate);
        const dData = dBuf.getChannelData(0);
        for (let i = 0; i < dLen; i++) dData[i] = Math.random() * 2 - 1;

        let dt = 0.05;
        while (dt < rainLoopSec - 0.1) {
          const s = offline.createBufferSource();
          s.buffer = dBuf;
          const hollow = Math.random() < 0.28;
          const f = offline.createBiquadFilter();
          f.type = 'bandpass';
          f.frequency.setValueAtTime(hollow ? 850 + Math.random() * 750 : 1950 + Math.random() * 2900, dt);
          f.Q.setValueAtTime(hollow ? 6.2 : 3.4, dt);

          const dg = offline.createGain();
          const decay = hollow ? 0.048 : 0.02 + Math.random() * 0.022;
          dg.gain.setValueAtTime(0.0001, dt);
          dg.gain.linearRampToValueAtTime(0.055 + Math.random() * 0.075, dt + 0.003);
          dg.gain.exponentialRampToValueAtTime(0.0001, dt + decay);

          const dp = offline.createStereoPanner();
          dp.pan.setValueAtTime(Math.random() * 1.7 - 0.85, dt);

          s.connect(f);
          f.connect(dg);
          dg.connect(dp);
          dp.connect(offline.destination);
          s.start(dt);
          s.stop(dt + decay + 0.01);

          // Vary droplet spacing across storm swells
          const swellFactor = Math.sin((dt / rainLoopSec) * Math.PI * 3.0) * 0.5 + 0.5;
          dt += 0.045 + (1 - swellFactor) * 0.085 + Math.random() * 0.075;
        }
      }),
      this.getOrRenderLoopBuffer('rain_thunder_roll_v1', ctx.sampleRate, thunderLoopSec, (offline) => {
        const brown = this.createStereoBrownNoiseBuffer(offline, thunderLoopSec);
        const rumbleEvents = [
          { start: 6.5, duration: 7.4, maxGain: 0.42, pan: -0.38 },
          { start: 30.0, duration: 8.6, maxGain: 0.5, pan: 0.42 },
        ];

        rumbleEvents.forEach((ev) => {
          const rSrc = offline.createBufferSource();
          rSrc.buffer = brown;
          const lp = offline.createBiquadFilter();
          lp.type = 'lowpass';
          lp.Q.setValueAtTime(1.0, ev.start);
          lp.frequency.setValueAtTime(240, ev.start);
          lp.frequency.exponentialRampToValueAtTime(50, ev.start + ev.duration);

          const rg = offline.createGain();
          rg.gain.setValueAtTime(0.0001, ev.start);
          rg.gain.linearRampToValueAtTime(ev.maxGain * 0.72, ev.start + 0.55);
          rg.gain.linearRampToValueAtTime(ev.maxGain * 0.42, ev.start + 1.6);
          rg.gain.linearRampToValueAtTime(ev.maxGain, ev.start + 2.7);
          rg.gain.exponentialRampToValueAtTime(0.0001, ev.start + ev.duration);

          const sub = offline.createOscillator();
          sub.type = 'sine';
          sub.frequency.setValueAtTime(48, ev.start);
          sub.frequency.exponentialRampToValueAtTime(34, ev.start + ev.duration * 0.85);
          const sg = offline.createGain();
          sg.gain.setValueAtTime(0.0001, ev.start);
          sg.gain.linearRampToValueAtTime(ev.maxGain * 0.25, ev.start + 1.8);
          sg.gain.exponentialRampToValueAtTime(0.0001, ev.start + ev.duration * 0.9);

          const pan = offline.createStereoPanner();
          pan.pan.setValueAtTime(ev.pan, ev.start);

          rSrc.connect(lp);
          lp.connect(rg);
          rg.connect(pan);
          sub.connect(sg);
          sg.connect(pan);
          pan.connect(offline.destination);

          rSrc.start(ev.start, ev.start);
          rSrc.stop(ev.start + ev.duration + 0.1);
          sub.start(ev.start);
          sub.stop(ev.start + ev.duration + 0.1);
        });
      }),
    ]).then(([rainLoopBuf, thunderLoopBuf]) => {
      if (generation !== this.playGeneration || !this.isPlaying || !this.ctx) return;
      const attachAt = this.ctx.currentTime;

      if (rainLoopBuf) {
        const rainLoopSrc = this.ctx.createBufferSource();
        rainLoopSrc.buffer = rainLoopBuf;
        rainLoopSrc.loop = true;

        const rainLoopGain = this.ctx.createGain();
        rainLoopGain.gain.setValueAtTime(0.001, attachAt);
        rainLoopGain.gain.setTargetAtTime(0.85, attachAt + 1.2, 2.0);

        rainLoopSrc.connect(rainLoopGain);
        rainLoopGain.connect(destination);
        rainLoopSrc.start(attachAt);
        this.activeNodes.push(rainLoopSrc, rainLoopGain);
      }

      if (thunderLoopBuf) {
        const thunderLoopSrc = this.ctx.createBufferSource();
        thunderLoopSrc.buffer = thunderLoopBuf;
        thunderLoopSrc.loop = true;

        const thunderGain = this.ctx.createGain();
        thunderGain.gain.setValueAtTime(0.9, attachAt);
        thunderLoopSrc.connect(thunderGain);
        thunderGain.connect(destination);
        thunderLoopSrc.start(attachAt);
        this.activeNodes.push(thunderLoopSrc, thunderGain);
      }
    });

    // UI-only phase label progression (audio keeps running independently even when screen locks)
    const updateRainUiPhase = (stepSec: number) => {
      const cycle = stepSec % thunderLoopSec;
      if (stepSec < 6) {
        this.setPhase('Gentle Patters', generation);
      } else if ((cycle >= 6.5 && cycle <= 14) || (cycle >= 30 && cycle <= 38.5)) {
        this.setPhase('Distant Thunder', generation);
      } else if (stepSec % 37 < 14) {
        this.setPhase('Heavy Downpour', generation);
      } else if (stepSec % 37 < 24) {
        this.setPhase('Light Shower', generation);
      } else {
        this.setPhase('Steady Rainfall', generation);
      }
      this.scheduleUiTimer(() => updateRainUiPhase(stepSec + 2), 2000, generation);
    };
    updateRainUiPhase(0);
  }

  // 3. Dynamic Beachside Ocean Waves:
  //    - Immediate opening shore wave + horizon wash on AudioContext time
  //    - Coprime 41s & 59s hardware-rendered ocean surf loops so waves continue breaking on locked screen!
  private generateBeachWaves(ctx: AudioContext, destination: AudioNode, generation: number) {
    const now = ctx.currentTime;
    this.setPhase('Approaching Swell', generation);

    const brownBuffer = this.createStereoBrownNoiseBuffer(ctx, 11);
    const pinkBuffer = this.createStereoPinkNoiseBuffer(ctx, 13);

    // Offshore deep horizon bed with slow native tide swell
    const horizonSrc = ctx.createBufferSource();
    horizonSrc.buffer = brownBuffer;
    horizonSrc.loop = true;

    const horizonLp = ctx.createBiquadFilter();
    horizonLp.type = 'lowpass';
    horizonLp.frequency.setValueAtTime(240, now);

    const horizonGain = ctx.createGain();
    horizonGain.gain.setValueAtTime(0.3, now);

    const tideLfo = ctx.createOscillator();
    tideLfo.type = 'sine';
    tideLfo.frequency.setValueAtTime(0.055, now);
    const tideMod = ctx.createGain();
    tideMod.gain.setValueAtTime(0.09, now);
    tideLfo.connect(tideMod);
    tideMod.connect(horizonGain.gain);

    horizonSrc.connect(horizonLp);
    horizonLp.connect(horizonGain);
    horizonGain.connect(destination);
    horizonSrc.start(now);
    tideLfo.start(now);

    // Soft coastal air breeze
    const breezeSrc = ctx.createBufferSource();
    breezeSrc.buffer = pinkBuffer;
    breezeSrc.loop = true;
    const breezeBp = ctx.createBiquadFilter();
    breezeBp.type = 'bandpass';
    breezeBp.frequency.setValueAtTime(2700, now);
    breezeBp.Q.setValueAtTime(0.7, now);
    const breezeGain = ctx.createGain();
    breezeGain.gain.setValueAtTime(0.03, now);
    breezeSrc.connect(breezeBp);
    breezeBp.connect(breezeGain);
    breezeGain.connect(destination);
    breezeSrc.start(now);

    this.activeNodes.push(
      horizonSrc,
      horizonLp,
      horizonGain,
      tideLfo,
      tideMod,
      breezeSrc,
      breezeBp,
      breezeGain
    );

    // Schedule immediate opening wave directly onto ctx.currentTime so user hears a live crash right away
    const scheduleWaveOnContext = (
      targetCtx: BaseAudioContext,
      targetDest: AudioNode,
      surfNoiseBuf: AudioBuffer,
      thudNoiseBuf: AudioBuffer,
      startTime: number,
      buildTime: number,
      crestDur: number,
      retreatDur: number,
      strength: number,
      panFrom: number,
      panTo: number,
      trackList?: { stop?: () => void; disconnect?: () => void }[]
    ) => {
      const totalDur = buildTime + crestDur + retreatDur;

      const surfSrc = targetCtx.createBufferSource();
      surfSrc.buffer = surfNoiseBuf;
      surfSrc.loop = true;

      const hp = targetCtx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.setValueAtTime(85, startTime);

      const lp = targetCtx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.Q.setValueAtTime(0.85, startTime);
      lp.frequency.setValueAtTime(160, startTime);
      lp.frequency.exponentialRampToValueAtTime(720, startTime + buildTime * 0.85);
      lp.frequency.exponentialRampToValueAtTime(2400 + strength * 1300, startTime + buildTime + crestDur * 0.45);
      lp.frequency.exponentialRampToValueAtTime(340, startTime + totalDur);

      const gain = targetCtx.createGain();
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(0.25 * strength, startTime + buildTime * 0.78);
      gain.gain.linearRampToValueAtTime(0.8 * strength, startTime + buildTime + crestDur * 0.35);
      gain.gain.linearRampToValueAtTime(0.36 * strength, startTime + buildTime + crestDur + retreatDur * 0.3);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + totalDur);

      const thudSrc = targetCtx.createBufferSource();
      thudSrc.buffer = thudNoiseBuf;
      thudSrc.loop = true;
      const thudLp = targetCtx.createBiquadFilter();
      thudLp.type = 'lowpass';
      thudLp.frequency.setValueAtTime(140, startTime + buildTime * 0.75);
      const thudGain = targetCtx.createGain();
      thudGain.gain.setValueAtTime(0.0001, startTime);
      thudGain.gain.setValueAtTime(0.0001, startTime + buildTime * 0.75);
      thudGain.gain.linearRampToValueAtTime(0.32 * strength, startTime + buildTime + crestDur * 0.25);
      thudGain.gain.exponentialRampToValueAtTime(0.0001, startTime + buildTime + crestDur + 1.4);

      const pan = targetCtx.createStereoPanner();
      pan.pan.setValueAtTime(panFrom, startTime);
      pan.pan.linearRampToValueAtTime(panTo, startTime + buildTime + crestDur + 1.5);

      surfSrc.connect(hp);
      hp.connect(lp);
      lp.connect(gain);
      gain.connect(pan);

      thudSrc.connect(thudLp);
      thudLp.connect(thudGain);
      thudGain.connect(pan);

      pan.connect(targetDest);

      const offset = (startTime * 1.7) % 8;
      surfSrc.start(startTime, offset);
      surfSrc.stop(startTime + totalDur + 0.08);
      thudSrc.start(startTime, offset);
      thudSrc.stop(startTime + buildTime + crestDur + 1.5);

      if (trackList) {
        trackList.push(surfSrc, thudSrc);
      }
    };

    // Wave #0 immediate live wave (0s -> 8.2s)
    scheduleWaveOnContext(ctx, destination, pinkBuffer, brownBuffer, now + 0.05, 2.2, 1.0, 4.8, 0.85, -0.35, 0.25, this.activeNodes);

    const waveLoopASec = 41;
    const waveLoopBSec = 59;

    Promise.all([
      this.getOrRenderLoopBuffer('beach_waves_primary_v1', ctx.sampleRate, waveLoopASec, (offline) => {
        const oPink = this.createStereoPinkNoiseBuffer(offline, waveLoopASec);
        const oBrown = this.createStereoBrownNoiseBuffer(offline, waveLoopASec);
        const wavesA = [
          { start: 0.4, build: 2.8, crest: 1.0, retreat: 4.6, str: 0.84, p1: -0.4, p2: 0.3 },
          { start: 9.8, build: 3.3, crest: 1.2, retreat: 5.2, str: 0.96, p1: 0.45, p2: -0.35 },
          { start: 20.5, build: 2.5, crest: 0.9, retreat: 4.5, str: 0.74, p1: -0.25, p2: 0.4 },
          { start: 29.8, build: 3.1, crest: 1.1, retreat: 5.1, str: 0.9, p1: 0.3, p2: -0.4 },
        ];
        wavesA.forEach((w) =>
          scheduleWaveOnContext(offline, offline.destination, oPink, oBrown, w.start, w.build, w.crest, w.retreat, w.str, w.p1, w.p2)
        );
      }),
      this.getOrRenderLoopBuffer('beach_waves_secondary_v1', ctx.sampleRate, waveLoopBSec, (offline) => {
        const oPink = this.createStereoPinkNoiseBuffer(offline, waveLoopBSec);
        const oBrown = this.createStereoBrownNoiseBuffer(offline, waveLoopBSec);
        const wavesB = [
          { start: 5.2, build: 3.6, crest: 1.1, retreat: 5.6, str: 0.58, p1: 0.5, p2: -0.2 },
          { start: 23.0, build: 3.9, crest: 1.3, retreat: 6.0, str: 0.64, p1: -0.5, p2: 0.25 },
          { start: 41.5, build: 3.4, crest: 1.0, retreat: 5.8, str: 0.55, p1: 0.35, p2: -0.45 },
        ];
        wavesB.forEach((w) =>
          scheduleWaveOnContext(offline, offline.destination, oPink, oBrown, w.start, w.build, w.crest, w.retreat, w.str, w.p1, w.p2)
        );
      }),
    ]).then(([bufA, bufB]) => {
      if (generation !== this.playGeneration || !this.isPlaying || !this.ctx) return;
      const attachAt = this.ctx.currentTime;

      [bufA, bufB].forEach((buf, idx) => {
        if (!buf || !this.ctx) return;
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        src.loop = true;

        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.001, attachAt);
        // Crossfade primary surf loop cleanly right as the immediate opening wave finishes (~5s)
        g.gain.setTargetAtTime(idx === 0 ? 0.92 : 0.72, attachAt + 3.2, 1.4);

        src.connect(g);
        g.connect(destination);
        src.start(attachAt);
        this.activeNodes.push(src, g);
      });
    });

    const updateWaveUiPhase = (sec: number) => {
      const mod = sec % 9;
      if (mod < 3) {
        this.setPhase('Approaching Swell', generation);
      } else if (mod < 5) {
        this.setPhase('Wave Crest & Crash', generation);
      } else {
        this.setPhase('Retreating Foam', generation);
      }
      this.scheduleUiTimer(() => updateWaveUiPhase(sec + 1.5), 1500, generation);
    };
    updateWaveUiPhase(0);
  }

  // 4. Dynamic Frequency Pulses (100% hardware AudioParam modulation via LFOs — zero JS timer dependency!)
  private generateDynamicFrequencyPulses(
    ctx: AudioContext,
    destination: AudioNode,
    generation: number,
    config: {
      mode: 'alpha' | 'theta';
      baseFreq: number;
      centerBeat: number;
      beatSwing: number;
      pulseCycleSec: number;
    }
  ) {
    const now = ctx.currentTime;
    const merger = ctx.createChannelMerger(2);

    const oscLeft = ctx.createOscillator();
    oscLeft.type = 'sine';
    oscLeft.frequency.setValueAtTime(config.baseFreq, now);

    const oscRight = ctx.createOscillator();
    oscRight.type = 'sine';
    oscRight.frequency.setValueAtTime(config.baseFreq + config.centerBeat, now);

    const harmonicLeft = ctx.createOscillator();
    harmonicLeft.type = 'sine';
    harmonicLeft.frequency.setValueAtTime(config.baseFreq * 1.5, now);

    const harmonicRight = ctx.createOscillator();
    harmonicRight.type = 'sine';
    harmonicRight.frequency.setValueAtTime((config.baseFreq + config.centerBeat) * 1.5, now);

    const harmonicGainL = ctx.createGain();
    harmonicGainL.gain.setValueAtTime(0.06, now);
    const harmonicGainR = ctx.createGain();
    harmonicGainR.gain.setValueAtTime(0.06, now);

    const subLeft = ctx.createOscillator();
    subLeft.type = 'sine';
    subLeft.frequency.setValueAtTime(config.baseFreq * 0.5, now);
    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.11, now);

    const gainLeft = ctx.createGain();
    gainLeft.gain.setValueAtTime(0.28, now);
    const gainRight = ctx.createGain();
    gainRight.gain.setValueAtTime(0.28, now);

    // Rhythmic pulse LFO running at the target brainwave beat frequency
    const pulseOsc = ctx.createOscillator();
    pulseOsc.type = 'sine';
    pulseOsc.frequency.setValueAtTime(config.centerBeat, now);

    const pulseDepthGain = ctx.createGain();
    pulseDepthGain.gain.setValueAtTime(0.045, now);

    // Native hardware LFOs driving carrier drift (+-5Hz) and beat frequency drift (+-1.5Hz / +-1.2Hz)
    const carrierDriftLfo = ctx.createOscillator();
    carrierDriftLfo.type = 'sine';
    carrierDriftLfo.frequency.setValueAtTime(0.025, now); // ~40s warm harmonic breath
    const carrierDriftAmt = ctx.createGain();
    carrierDriftAmt.gain.setValueAtTime(5.5, now);
    const harmonicDriftAmt = ctx.createGain();
    harmonicDriftAmt.gain.setValueAtTime(8.25, now);
    const subDriftAmt = ctx.createGain();
    subDriftAmt.gain.setValueAtTime(2.75, now);

    carrierDriftLfo.connect(carrierDriftAmt);
    carrierDriftAmt.connect(oscLeft.frequency);
    carrierDriftAmt.connect(oscRight.frequency);
    carrierDriftLfo.connect(harmonicDriftAmt);
    harmonicDriftAmt.connect(harmonicLeft.frequency);
    harmonicDriftAmt.connect(harmonicRight.frequency);
    carrierDriftLfo.connect(subDriftAmt);
    subDriftAmt.connect(subLeft.frequency);

    const beatDriftLfo = ctx.createOscillator();
    beatDriftLfo.type = 'sine';
    beatDriftLfo.frequency.setValueAtTime(0.038, now); // ~26s beat sweep cycle
    const beatDriftAmt = ctx.createGain();
    beatDriftAmt.gain.setValueAtTime(config.beatSwing, now);
    const harmonicBeatDriftAmt = ctx.createGain();
    harmonicBeatDriftAmt.gain.setValueAtTime(config.beatSwing * 1.5, now);

    beatDriftLfo.connect(beatDriftAmt);
    beatDriftAmt.connect(oscRight.frequency);
    beatDriftAmt.connect(pulseOsc.frequency);
    beatDriftLfo.connect(harmonicBeatDriftAmt);
    harmonicBeatDriftAmt.connect(harmonicRight.frequency);

    // Slow macro breath LFO modulating pulse prominence + harmonic shimmer
    const breathLfo = ctx.createOscillator();
    breathLfo.type = 'sine';
    breathLfo.frequency.setValueAtTime(1 / config.pulseCycleSec, now);

    const breathDepthMod = ctx.createGain();
    breathDepthMod.gain.setValueAtTime(0.035, now);
    breathLfo.connect(breathDepthMod);
    breathDepthMod.connect(pulseDepthGain.gain);

    const breathHarmonicMod = ctx.createGain();
    breathHarmonicMod.gain.setValueAtTime(0.045, now);
    breathLfo.connect(breathHarmonicMod);
    breathHarmonicMod.connect(harmonicGainL.gain);
    breathHarmonicMod.connect(harmonicGainR.gain);

    pulseOsc.connect(pulseDepthGain);
    pulseDepthGain.connect(gainLeft.gain);
    pulseDepthGain.connect(gainRight.gain);

    oscLeft.connect(gainLeft);
    harmonicLeft.connect(harmonicGainL);
    harmonicGainL.connect(gainLeft);

    oscRight.connect(gainRight);
    harmonicRight.connect(harmonicGainR);
    harmonicGainR.connect(gainRight);

    gainLeft.connect(merger, 0, 0);
    gainRight.connect(merger, 0, 1);

    // Warm pink air bed
    const pinkBedBuffer = this.createStereoPinkNoiseBuffer(ctx, 11);
    const noise = ctx.createBufferSource();
    noise.buffer = pinkBedBuffer;
    noise.loop = true;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(config.mode === 'alpha' ? 420 : 320, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.18, now);

    const bedFilterBreath = ctx.createGain();
    bedFilterBreath.gain.setValueAtTime(120, now);
    breathLfo.connect(bedFilterBreath);
    bedFilterBreath.connect(noiseFilter.frequency);

    const pulseBus = ctx.createGain();
    pulseBus.gain.setValueAtTime(0.95, now);

    subLeft.connect(subGain);
    subGain.connect(pulseBus);
    merger.connect(pulseBus);
    pulseBus.connect(destination);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(destination);

    oscLeft.start(now);
    oscRight.start(now);
    harmonicLeft.start(now);
    harmonicRight.start(now);
    subLeft.start(now);
    pulseOsc.start(now);
    breathLfo.start(now);
    carrierDriftLfo.start(now);
    beatDriftLfo.start(now);
    noise.start(now);

    this.activeNodes.push(
      oscLeft,
      oscRight,
      harmonicLeft,
      harmonicRight,
      harmonicGainL,
      harmonicGainR,
      subLeft,
      subGain,
      gainLeft,
      gainRight,
      pulseOsc,
      pulseDepthGain,
      breathLfo,
      breathDepthMod,
      breathHarmonicMod,
      carrierDriftLfo,
      carrierDriftAmt,
      harmonicDriftAmt,
      subDriftAmt,
      beatDriftLfo,
      beatDriftAmt,
      harmonicBeatDriftAmt,
      bedFilterBreath,
      noise,
      noiseFilter,
      noiseGain,
      merger,
      pulseBus
    );

    // UI-only phase readout mirroring the deterministic 0.038Hz hardware LFO curve
    const startMs = performance.now();
    const updatePulseLabel = () => {
      const elapsedSec = (performance.now() - startMs) / 1000;
      const currentBeat = config.centerBeat + Math.sin(elapsedSec * 0.038 * Math.PI * 2) * config.beatSwing;
      const bandLabel = config.mode === 'alpha' ? 'Alpha Pulse' : 'Theta Pulse';
      this.setPhase(`${currentBeat.toFixed(1)}Hz ${bandLabel}`, generation);
      this.scheduleUiTimer(updatePulseLabel, 1800, generation);
    };
    updatePulseLabel();
  }

  // 5. Dynamic Cosmic Sub-Harmonic Resonance (hardware LFOs + OfflineAudioContext 47s harmonic bloom loop)
  private generateCosmicResonance(ctx: AudioContext, destination: AudioNode, generation: number) {
    const now = ctx.currentTime;
    this.setPhase('Sub-Harmonic Swell', generation);

    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(55, now);

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(110, now);

    const osc2Detune = ctx.createOscillator();
    osc2Detune.type = 'sine';
    osc2Detune.frequency.setValueAtTime(110.35, now);

    const osc3 = ctx.createOscillator();
    osc3.type = 'triangle';
    osc3.frequency.setValueAtTime(165, now);

    const gain1 = ctx.createGain();
    gain1.gain.setValueAtTime(0.36, now);

    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0.16, now);

    const gain2Detune = ctx.createGain();
    gain2Detune.gain.setValueAtTime(0.11, now);

    const gain3 = ctx.createGain();
    gain3.gain.setValueAtTime(0.08, now);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(280, now);
    filter.Q.setValueAtTime(1.4, now);

    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.16, now);
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(0.09, now);
    lfo.connect(lfoGain);
    lfoGain.connect(gain1.gain);

    const sweepLfo = ctx.createOscillator();
    sweepLfo.type = 'sine';
    sweepLfo.frequency.setValueAtTime(0.055, now);
    const sweepGain = ctx.createGain();
    sweepGain.gain.setValueAtTime(170, now);
    sweepLfo.connect(sweepGain);
    sweepGain.connect(filter.frequency);

    const spacePanner = ctx.createStereoPanner();
    const panLfo = ctx.createOscillator();
    panLfo.type = 'sine';
    panLfo.frequency.setValueAtTime(0.04, now);
    const panLfoGain = ctx.createGain();
    panLfoGain.gain.setValueAtTime(0.35, now);
    panLfo.connect(panLfoGain);
    panLfoGain.connect(spacePanner.pan);

    osc1.connect(gain1);
    osc2.connect(gain2);
    osc2Detune.connect(gain2Detune);
    osc3.connect(gain3);

    gain1.connect(filter);
    gain2.connect(filter);
    gain2Detune.connect(filter);
    gain3.connect(filter);

    filter.connect(spacePanner);
    spacePanner.connect(destination);

    osc1.start(now);
    osc2.start(now);
    osc2Detune.start(now);
    osc3.start(now);
    lfo.start(now);
    sweepLfo.start(now);
    panLfo.start(now);

    this.activeNodes.push(
      osc1,
      osc2,
      osc2Detune,
      osc3,
      lfo,
      sweepLfo,
      panLfo,
      gain1,
      gain2,
      gain2Detune,
      gain3,
      lfoGain,
      sweepGain,
      panLfoGain,
      filter,
      spacePanner
    );

    const bloomLoopSec = 47;
    this.getOrRenderLoopBuffer('cosmic_harmonic_blooms_v1', ctx.sampleRate, bloomLoopSec, (offline) => {
      const chimes = [
        { start: 3.0, freq: 220, dur: 8.0, pan: -0.35 },
        { start: 14.5, freq: 329.63, dur: 8.5, pan: 0.4 },
        { start: 26.0, freq: 277.18, dur: 8.2, pan: -0.25 },
        { start: 37.5, freq: 440, dur: 7.8, pan: 0.3 },
      ];
      chimes.forEach((c) => {
        const osc = offline.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(c.freq, c.start);
        const g = offline.createGain();
        g.gain.setValueAtTime(0.0001, c.start);
        g.gain.linearRampToValueAtTime(0.075, c.start + c.dur * 0.35);
        g.gain.exponentialRampToValueAtTime(0.0001, c.start + c.dur);
        const p = offline.createStereoPanner();
        p.pan.setValueAtTime(c.pan, c.start);
        osc.connect(g);
        g.connect(p);
        p.connect(offline.destination);
        osc.start(c.start);
        osc.stop(c.start + c.dur + 0.1);
      });
    }).then((bloomBuf) => {
      if (generation !== this.playGeneration || !this.isPlaying || !this.ctx || !bloomBuf) return;
      const attachAt = this.ctx.currentTime;
      const src = this.ctx.createBufferSource();
      src.buffer = bloomBuf;
      src.loop = true;
      src.connect(destination);
      src.start(attachAt);
      this.activeNodes.push(src);
    });

    const updateCosmicUiPhase = (sec: number) => {
      const m = sec % 12;
      if (m >= 3 && m < 9) {
        this.setPhase('Harmonic Bloom', generation);
      } else {
        this.setPhase('Sub-Harmonic Swell', generation);
      }
      this.scheduleUiTimer(() => updateCosmicUiPhase(sec + 2), 2000, generation);
    };
    updateCosmicUiPhase(0);
  }
}

// Singleton audio engine instance
export const soundscapeEngine = new SoundscapeEngine();
