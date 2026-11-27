// Optional, Muted-by-Default Web Audio API Synthesizer for NeuralPlan XR

class XRSoundEngine {
  private ctx: AudioContext | null = null;
  private enabled: boolean = false; // Strictly muted by default per specification
  private masterGain: GainNode | null = null;
  private ambientOscs: OscillatorNode[] = [];
  private ambientGain: GainNode | null = null;
  private isAmbientRunning: boolean = false;

  private ensureContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.enabled ? 0.35 : 0, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(next: boolean) {
    this.enabled = next;
    if (next) {
      this.ensureContext();
    }
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(next ? 0.35 : 0, this.ctx.currentTime, 0.08);
    }
    if (!next) {
      this.stopAmbient();
    }
  }

  public startAmbient() {
    if (!this.enabled || this.isAmbientRunning) return;
    this.ensureContext();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.setValueAtTime(0.0001, now);
    this.ambientGain.gain.linearRampToValueAtTime(0.09, now + 2.0);
    this.ambientGain.connect(this.masterGain);

    // Warm, subdued low-frequency harmonic drone (110Hz, 165Hz, 220Hz)
    const freqs = [110, 164.81, 220];
    this.ambientOscs = freqs.map((f) => {
      const osc = this.ctx!.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now);
      osc.connect(this.ambientGain!);
      osc.start(now);
      return osc;
    });
    this.isAmbientRunning = true;
  }

  public stopAmbient() {
    if (!this.isAmbientRunning || !this.ctx || !this.ambientGain) return;
    const now = this.ctx.currentTime;
    this.ambientGain.gain.setTargetAtTime(0.0001, now, 0.3);
    const oscsToStop = [...this.ambientOscs];
    this.ambientOscs = [];
    this.isAmbientRunning = false;
    setTimeout(() => {
      oscsToStop.forEach((o) => {
        try {
          o.stop();
          o.disconnect();
        } catch {
          // ignore
        }
      });
    }, 800);
  }

  /**
   * Gentle two-note warm cue synchronized with Stage 4 double pulse
   */
  public playDoublePulseCue() {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    [0, 0.24].forEach((offset, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(idx === 0 ? 440 : 523.25, now + offset);

      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.linearRampToValueAtTime(0.14, now + offset + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.32);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + offset);
      osc.stop(now + offset + 0.35);
    });
  }

  /**
   * Subtle ascending transition chime between stages
   */
  public playStageTransition() {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const notes = [329.63, 440, 587.33];
    notes.forEach((freq, i) => {
      if (!this.ctx || !this.masterGain) return;
      const start = now + i * 0.09;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(0.12, start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.7);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(start);
      osc.stop(start + 0.75);
    });
  }

  /**
   * Warm resonant chord on Stage 5 completion
   */
  public playCompletionChord() {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const chord = [261.63, 329.63, 392.0, 523.25];
    chord.forEach((freq, i) => {
      if (!this.ctx || !this.masterGain) return;
      const start = now + i * 0.06;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(0.11, start + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.8);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(start);
      osc.stop(start + 1.85);
    });
  }
}

export const xrSoundEngine = new XRSoundEngine();
