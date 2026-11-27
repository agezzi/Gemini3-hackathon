// Web Audio API Synthesizer for Zen Meditation, Singing Bowls & Resonance Chimes

class ZenSoundSynthesizer {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;
  private droneOscillators: OscillatorNode[] = [];
  private droneGain: GainNode | null = null;
  private isDroneActive: boolean = false;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.7, this.ctx.currentTime, 0.05);
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Resonates an authentic Tibetan Singing Bowl harmonic tone.
   * Frequencies are tuned to healing solfeggio / 432Hz harmonics.
   */
  public playSingingBowl(pitch: 'low' | 'mid' | 'high' | 'celestial' = 'mid') {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const baseFreqs = {
      low: 216,      // 432Hz octave down
      mid: 432,      // Natural concert pitch
      high: 528,     // Solfeggio Miracle / Transformation frequency
      celestial: 639 // Harmonic connection
    };

    const fundamental = baseFreqs[pitch];
    // Overtones characteristic of hammered bronze Himalayan singing bowls
    const partials = [
      { ratio: 1.0, gain: 0.6, decay: 3.8 },
      { ratio: 2.76, gain: 0.25, decay: 3.0 },
      { ratio: 5.4, gain: 0.12, decay: 2.2 },
      { ratio: 8.9, gain: 0.05, decay: 1.5 }
    ];

    const now = this.ctx.currentTime;

    partials.forEach(({ ratio, gain, decay }) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(fundamental * ratio, now);

      // Subtle vibrato / beat frequency for acoustic richness
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.setValueAtTime(2.4, now); // 2.4 Hz wobble
      lfoGain.gain.setValueAtTime(1.8, now);
      lfo.connect(osc.frequency);
      lfo.start(now);
      lfo.stop(now + decay);

      // Strike envelope: rapid attack, long acoustic exponential tail
      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.gain.linearRampToValueAtTime(gain * 0.5, now + 0.03);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + decay);

      osc.connect(gainNode);
      gainNode.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + decay);
    });
  }

  /**
   * Plays a crisp, gentle crystal chime for perfect alignment
   */
  public playHarmonyChime(streakCount: number = 1) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    // Ascending pentatonic notes based on streak
    const scale = [528, 594, 660, 792, 880, 1056, 1188];
    const freq = scale[Math.min(streakCount, scale.length - 1)];

    const osc = this.ctx.createOscillator();
    const subOsc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = 'sine';
    subOsc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    subOsc.frequency.setValueAtTime(freq * 0.5, now);

    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.linearRampToValueAtTime(0.35, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);

    osc.connect(gainNode);
    subOsc.connect(gainNode);
    gainNode.connect(this.masterGain);

    osc.start(now);
    subOsc.start(now);
    osc.stop(now + 1.6);
    subOsc.stop(now + 1.6);
  }

  /**
   * Soft water drop / ripple tone
   */
  public playRippleTone() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.25);

    gainNode.gain.setValueAtTime(0.18, now);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

    osc.connect(gainNode);
    gainNode.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  /**
   * Starts a continuous soft 432Hz ambient drone pad
   */
  public startAmbientDrone() {
    if (this.isDroneActive || this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
    this.droneGain.gain.linearRampToValueAtTime(0.12, this.ctx.currentTime + 2.5);
    this.droneGain.connect(this.masterGain);

    const notes = [108, 216, 324, 432]; // 432Hz fundamental with warm sub-harmonics
    this.droneOscillators = notes.map(f => {
      const osc = this.ctx!.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, this.ctx!.currentTime);
      osc.connect(this.droneGain!);
      osc.start();
      return osc;
    });

    this.isDroneActive = true;
  }

  /**
   * Fades out and stops ambient drone
   */
  public stopAmbientDrone() {
    if (!this.isDroneActive || !this.ctx || !this.droneGain) return;
    const now = this.ctx.currentTime;
    this.droneGain.gain.linearRampToValueAtTime(0.0001, now + 1.2);
    setTimeout(() => {
      this.droneOscillators.forEach(osc => {
        try { osc.stop(); osc.disconnect(); } catch {}
      });
      this.droneOscillators = [];
      this.isDroneActive = false;
    }, 1300);
  }
}

export const zenSoundSynth = new ZenSoundSynthesizer();
