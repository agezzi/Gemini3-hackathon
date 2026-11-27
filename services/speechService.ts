import { ReadingPreferences } from '../types';

export const DEFAULT_READING_PREFERENCES: ReadingPreferences = {
  font: 'default',
  textScale: 1,
  spacing: 'standard',
  noItalics: false,
  tint: 'none',
  simplifiedView: false,
  readingRuler: false,
  rulerHeight: 'medium',
  speechRate: 1,
};

export const DYSLEXIA_FRIENDLY_PRESET: ReadingPreferences = {
  font: 'atkinson',
  textScale: 1.1,
  spacing: 'relaxed',
  noItalics: true,
  tint: 'cream',
  simplifiedView: true,
  readingRuler: false,
  rulerHeight: 'medium',
  speechRate: 0.95,
};

export const READING_FONT_STACKS: Record<ReadingPreferences['font'], string> = {
  default: "'Plus Jakarta Sans', 'DM Sans', system-ui, sans-serif",
  atkinson: "'Atkinson Hyperlegible', 'Plus Jakarta Sans', system-ui, sans-serif",
  lexend: "'Lexend', 'Plus Jakarta Sans', system-ui, sans-serif",
  opendyslexic: "'OpenDyslexic', 'Atkinson Hyperlegible', 'Comic Sans MS', sans-serif",
};

export const READING_TINT_CANVAS: Record<
  ReadingPreferences['tint'],
  { label: string; lightBg: string; darkBg: string; swatch: string; cardOverlayLight?: string }
> = {
  none: {
    label: 'Default',
    lightBg: '',
    darkBg: '',
    swatch: '#EEF7FA',
  },
  cream: {
    label: 'Warm Cream',
    lightBg: '#F9F3E3',
    darkBg: '#12110E',
    swatch: '#F6EBD0',
  },
  sage: {
    label: 'Soft Sage',
    lightBg: '#ECF4EC',
    darkBg: '#0E1511',
    swatch: '#D8EAD9',
  },
  blue: {
    label: 'Calm Sky',
    lightBg: '#EAF2FA',
    darkBg: '#0C131D',
    swatch: '#D6E6F7',
  },
  peach: {
    label: 'Soft Peach',
    lightBg: '#FAF0E8',
    darkBg: '#17110F',
    swatch: '#F5DED0',
  },
};

export function applyReadingPreferencesToDom(prefs: ReadingPreferences) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  const fontStack = READING_FONT_STACKS[prefs.font] || READING_FONT_STACKS.default;
  root.style.setProperty('--np-font-body', fontStack);

  if (prefs.spacing === 'wide') {
    root.style.setProperty('--np-letter-spacing', '0.045em');
    root.style.setProperty('--np-word-spacing', '0.16em');
    root.style.setProperty('--np-line-height', '1.85');
  } else if (prefs.spacing === 'relaxed') {
    root.style.setProperty('--np-letter-spacing', '0.02em');
    root.style.setProperty('--np-word-spacing', '0.08em');
    root.style.setProperty('--np-line-height', '1.7');
  } else {
    root.style.setProperty('--np-letter-spacing', 'normal');
    root.style.setProperty('--np-word-spacing', 'normal');
    root.style.setProperty('--np-line-height', '1.55');
  }

  // Scale root font-size smoothly (16px baseline)
  const clampedScale = Math.min(1.3, Math.max(0.95, prefs.textScale || 1));
  root.style.fontSize = `${Math.round(clampedScale * 100)}%`;

  root.classList.toggle('np-dyslexia-font', prefs.font !== 'default');
  root.classList.toggle('np-no-italics', Boolean(prefs.noItalics));
  root.classList.toggle('np-reading-relaxed', prefs.spacing !== 'standard');
}

// ============================================================================
// TEXT-TO-SPEECH (Read Aloud) ENGINE
// ============================================================================

export type SpeechStatus = 'idle' | 'speaking' | 'paused';

export interface SpeechStateSnapshot {
  status: SpeechStatus;
  activeId: string | null;
}

class ReadAloudManager {
  private listeners = new Set<(state: SpeechStateSnapshot) => void>();
  private state: SpeechStateSnapshot = { status: 'idle', activeId: null };
  private chunks: string[] = [];
  private chunkIndex = 0;
  private rate = 1;
  private currentSessionToken = 0;

  subscribe(listener: (state: SpeechStateSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit() {
    this.listeners.forEach((fn) => fn(this.state));
  }

  isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  getState(): SpeechStateSnapshot {
    return this.state;
  }

  private cleanTextForSpeech(raw: string): string {
    return raw
      .replace(/\[(High|Med|Low|High Load|Med Load|Low Load|Transition)\]/gi, '$1.')
      .replace(/[*_`#]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private splitIntoChunks(text: string): string[] {
    const cleaned = this.cleanTextForSpeech(text);
    if (!cleaned) return [];

    // Break into manageable <= 180 char chunks along sentence or pause boundaries
    // so browsers never silently drop long utterances.
    const sentences = cleaned.split(/(?<=[.!?])\s+|\n+/);
    const out: string[] = [];
    let buffer = '';

    for (const part of sentences) {
      const s = part.trim();
      if (!s) continue;
      if ((buffer + ' ' + s).trim().length <= 180) {
        buffer = (buffer ? buffer + ' ' : '') + s;
      } else {
        if (buffer) out.push(buffer);
        if (s.length <= 180) {
          buffer = s;
        } else {
          // Split overly long run-on sentence on commas/words
          const words = s.split(' ');
          let chunk = '';
          for (const w of words) {
            if ((chunk + ' ' + w).trim().length > 160) {
              if (chunk) out.push(chunk);
              chunk = w;
            } else {
              chunk = chunk ? `${chunk} ${w}` : w;
            }
          }
          buffer = chunk;
        }
      }
    }
    if (buffer) out.push(buffer);
    return out;
  }

  speak(text: string, activeId: string, rate = 1) {
    if (!this.isSupported()) return;
    this.stop();

    const chunks = this.splitIntoChunks(text);
    if (chunks.length === 0) return;

    this.chunks = chunks;
    this.chunkIndex = 0;
    this.rate = Math.min(1.5, Math.max(0.7, rate || 1));
    this.currentSessionToken += 1;
    const token = this.currentSessionToken;

    this.state = { status: 'speaking', activeId };
    this.emit();

    this.speakNextChunk(token, activeId);
  }

  private speakNextChunk(token: number, activeId: string) {
    if (token !== this.currentSessionToken || !this.isSupported()) return;
    if (this.chunkIndex >= this.chunks.length) {
      this.state = { status: 'idle', activeId: null };
      this.emit();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(this.chunks[this.chunkIndex]);
    utterance.rate = this.rate;
    utterance.pitch = 1;

    // Prefer a clear English natural voice when available
    const voices = window.speechSynthesis.getVoices?.() || [];
    const preferred =
      voices.find((v) => v.lang.startsWith('en') && /natural|neural|google|samantha|daniel/i.test(v.name)) ||
      voices.find((v) => v.lang.startsWith('en'));
    if (preferred) {
      utterance.voice = preferred;
    }

    utterance.onend = () => {
      if (token !== this.currentSessionToken) return;
      this.chunkIndex += 1;
      this.speakNextChunk(token, activeId);
    };

    utterance.onerror = () => {
      if (token !== this.currentSessionToken) return;
      this.state = { status: 'idle', activeId: null };
      this.emit();
    };

    window.speechSynthesis.speak(utterance);
  }

  pause() {
    if (!this.isSupported() || this.state.status !== 'speaking') return;
    window.speechSynthesis.pause();
    this.state = { ...this.state, status: 'paused' };
    this.emit();
  }

  resume() {
    if (!this.isSupported() || this.state.status !== 'paused') return;
    window.speechSynthesis.resume();
    this.state = { ...this.state, status: 'speaking' };
    this.emit();
  }

  stop() {
    this.currentSessionToken += 1;
    this.chunks = [];
    this.chunkIndex = 0;
    if (this.isSupported()) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore cancellation edge cases
      }
    }
    if (this.state.status !== 'idle' || this.state.activeId !== null) {
      this.state = { status: 'idle', activeId: null };
      this.emit();
    }
  }
}

export const readAloud = new ReadAloudManager();

// ============================================================================
// VOICE TRANSCRIPTION & CALIBRATION PARSING HELPERS
// ============================================================================

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Failed to encode audio recording.'));
    reader.readAsDataURL(blob);
  });
}

export async function transcribeAudioBlob(blob: Blob): Promise<string> {
  const base64 = await blobToBase64(blob);
  const res = await fetch('/api/transcribe-audio', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      audioBase64: base64,
      mimeType: blob.type || 'audio/webm',
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Could not transcribe voice recording.');
  }
  return (data.text || '').trim();
}

export interface ParsedVoiceCalibration {
  behavioralHistory: string;
  targetObjectives: string;
}

export function fallbackSplitVoiceCalibration(transcript: string): ParsedVoiceCalibration {
  const clean = transcript.trim();
  if (!clean) {
    return { behavioralHistory: '', targetObjectives: '' };
  }

  const sentences = clean
    .split(/(?<=[.!?])\s+|\s+(?=(?:tomorrow|next|my goals?|i need to|i want to|priorities?|objectives?|for tomorrow|for the next))/i)
    .map((s) => s.trim())
    .filter(Boolean);

  const historyParts: string[] = [];
  const objectiveParts: string[] = [];

  const futureCue = /\b(tomorrow|next session|next|goal|goals|objective|objectives|priority|priorities|deadline|meeting|meetings|need to|want to|plan to|will)\b/i;

  for (const s of sentences) {
    if (futureCue.test(s)) {
      objectiveParts.push(s);
    } else {
      historyParts.push(s);
    }
  }

  if (historyParts.length === 0 && objectiveParts.length > 0 && sentences.length > 1) {
    historyParts.push(sentences[0]);
  }

  return {
    behavioralHistory: historyParts.join(' ').trim(),
    targetObjectives: objectiveParts.join(' ').trim(),
  };
}

export async function parseVoiceCalibration(transcript: string): Promise<ParsedVoiceCalibration> {
  try {
    const res = await fetch('/api/parse-voice-calibration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript }),
    });
    if (res.ok) {
      const data = await res.json();
      return {
        behavioralHistory: typeof data.behavioralHistory === 'string' ? data.behavioralHistory.trim() : '',
        targetObjectives: typeof data.targetObjectives === 'string' ? data.targetObjectives.trim() : '',
      };
    }
  } catch {
    // Fall back to deterministic splitter
  }
  return fallbackSplitVoiceCalibration(transcript);
}
