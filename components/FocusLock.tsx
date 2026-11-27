import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ShieldAlert,
  Lock,
  Zap,
  AlertCircle,
  Settings2,
  X,
  Save,
  Instagram,
  Twitter,
  Youtube,
  Facebook,
  Tv,
  Pin,
  Music,
  MessageCircle,
  Smartphone,
  Volume2,
  VolumeX,
  Volume1,
  Waves,
  CloudRain,
  Sparkles,
  Radio,
  Headphones,
  Monitor,
  CheckCircle2,
  Wind,
  Power,
  HelpCircle,
  Play,
  Pause,
} from 'lucide-react';
import {
  soundscapeEngine,
  SOUNDSCAPE_OPTIONS,
  SoundscapeType,
  SoundscapePlaybackState,
} from '../services/soundscapeEngine';
import { SoundscapeGuideModal } from './SoundscapeGuideModal';

interface FocusLockSettings {
  breakDuration: number;
  breakPrompt: string;
}

interface PersistedFocusSession {
  durationMinutes: number;
  startedAt: number;
  endTime: number;
}

interface FocusLockProps {
  onComplete: (minutes: number) => void;
  onStateChange: (isActive: boolean) => void;
}

const DEFAULT_SETTINGS: FocusLockSettings = {
  breakDuration: 5,
  breakPrompt: 'Breaking Protocol...',
};

const ACTIVE_SESSION_STORAGE_KEY = 'neuralplan_active_focus_session_v1';
const WAKELOCK_PREF_STORAGE_KEY = 'neuralplan_focus_wakelock_v1';
const SOUNDSCAPE_GUIDE_SEEN_KEY = 'neuralplan_soundscape_guide_seen_v1';

const DISTRACTION_APPS = [
  { id: 'instagram', icon: <Instagram className="w-5 h-5" />, color: 'text-pink-500', name: 'Instagram' },
  { id: 'x', icon: <Twitter className="w-5 h-5" />, color: 'text-sky-600 dark:text-slate-200', name: 'X / Twitter' },
  { id: 'pinterest', icon: <Pin className="w-5 h-5" />, color: 'text-red-500', name: 'Pinterest' },
  { id: 'netflix', icon: <Tv className="w-5 h-5" />, color: 'text-red-600', name: 'Netflix' },
  { id: 'youtube', icon: <Youtube className="w-5 h-5" />, color: 'text-red-500', name: 'YouTube' },
  { id: 'facebook', icon: <Facebook className="w-5 h-5" />, color: 'text-blue-600', name: 'Facebook' },
  { id: 'tiktok', icon: <Music className="w-5 h-5" />, color: 'text-cyan-500 dark:text-cyan-400', name: 'TikTok' },
  { id: 'reddit', icon: <MessageCircle className="w-5 h-5" />, color: 'text-orange-500', name: 'Reddit' },
];

function readPersistedSession(): PersistedFocusSession | null {
  try {
    const raw = localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedFocusSession;
    if (
      typeof parsed?.durationMinutes === 'number' &&
      typeof parsed?.endTime === 'number' &&
      parsed.durationMinutes > 0 &&
      parsed.endTime > 0
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export const FocusLock: React.FC<FocusLockProps> = ({ onComplete, onStateChange }) => {
  const [isActive, setIsActive] = useState(false);
  const [duration, setDuration] = useState(60);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isEmergencyBreaking, setIsEmergencyBreaking] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [completionNotice, setCompletionNotice] = useState<string | null>(null);
  const [selectedApps, setSelectedApps] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('neuralplan_locked_apps');
      return saved ? JSON.parse(saved) : ['instagram', 'x'];
    } catch {
      return ['instagram', 'x'];
    }
  });

  const [selectedSoundscape, setSelectedSoundscape] = useState<SoundscapeType>(() => {
    try {
      const saved = localStorage.getItem('neuralplan_focus_soundscape');
      return (saved as SoundscapeType) || 'rainfall';
    } catch {
      return 'rainfall';
    }
  });
  const [soundVolume, setSoundVolume] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('neuralplan_sound_volume');
      return saved ? parseFloat(saved) : 0.65;
    } catch {
      return 0.65;
    }
  });
  const [isSoundMuted, setIsSoundMuted] = useState(false);
  const [soundState, setSoundState] = useState<SoundscapePlaybackState>(() =>
    soundscapeEngine.getPlaybackState()
  );
  const [showSoundscapeGuide, setShowSoundscapeGuide] = useState(false);
  const [resumePromptType, setResumePromptType] = useState<SoundscapeType | null>(() => {
    if (soundscapeEngine.getIsPlaying()) return null;
    return soundscapeEngine.getPersistedSoundscape();
  });

  const [keepScreenAwake, setKeepScreenAwake] = useState<boolean>(() => {
    try {
      return localStorage.getItem(WAKELOCK_PREF_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [wakeLockActive, setWakeLockActive] = useState(false);

  const [settings, setSettings] = useState<FocusLockSettings>(() => {
    try {
      const saved = localStorage.getItem('neuralplan_focus_settings');
      return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const breakTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wakeLockSentinelRef = useRef<{ release: () => Promise<void> } | null>(null);
  const completingRef = useRef(false);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockSentinelRef.current) {
      try {
        await wakeLockSentinelRef.current.release();
      } catch {
        // Ignore already-released errors
      } finally {
        wakeLockSentinelRef.current = null;
        setWakeLockActive(false);
      }
    } else {
      setWakeLockActive(false);
    }
  }, []);

  const acquireWakeLock = useCallback(async () => {
    if (typeof navigator === 'undefined') return;
    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void>; addEventListener?: (evt: string, cb: () => void) => void }> };
    };
    if (!nav.wakeLock) return;
    try {
      const sentinel = await nav.wakeLock.request('screen');
      wakeLockSentinelRef.current = sentinel;
      setWakeLockActive(true);
      sentinel.addEventListener?.('release', () => {
        wakeLockSentinelRef.current = null;
        setWakeLockActive(false);
      });
    } catch {
      // Browser may decline wake lock when battery saver is active or tab is hidden
      setWakeLockActive(false);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('neuralplan_locked_apps', JSON.stringify(selectedApps));
    } catch {
      // Ignore storage quota errors
    }
  }, [selectedApps]);

  useEffect(() => {
    try {
      localStorage.setItem('neuralplan_focus_soundscape', selectedSoundscape);
    } catch {
      // Ignore storage quota errors
    }
  }, [selectedSoundscape]);

  useEffect(() => {
    try {
      localStorage.setItem('neuralplan_sound_volume', soundVolume.toString());
    } catch {
      // Ignore storage quota errors
    }
    soundscapeEngine.setVolume(isSoundMuted ? 0 : soundVolume);
  }, [soundVolume, isSoundMuted]);

  useEffect(() => {
    try {
      localStorage.setItem(WAKELOCK_PREF_STORAGE_KEY, String(keepScreenAwake));
    } catch {
      // Ignore storage quota errors
    }
    if (isActive && keepScreenAwake) {
      acquireWakeLock();
    } else {
      releaseWakeLock();
    }
  }, [keepScreenAwake, isActive, acquireWakeLock, releaseWakeLock]);

  useEffect(() => {
    const unsubscribe = soundscapeEngine.subscribeState((next) => {
      setSoundState(next);
      if (next.isPlaying && next.activeType !== 'none') {
        setResumePromptType(null);
      }
    });
    return () => {
      unsubscribe();
      // Do NOT stop soundscapeEngine on unmount so audio keeps playing in the background
      // until the user explicitly turns it off.
      releaseWakeLock();
      if (breakTimerRef.current) clearTimeout(breakTimerRef.current);
    };
  }, [releaseWakeLock]);

  const maybeShowFirstTimeSoundscapeGuide = useCallback(() => {
    try {
      if (localStorage.getItem(SOUNDSCAPE_GUIDE_SEEN_KEY) === 'true') return;
    } catch {
      // Proceed to show once if storage unavailable
    }
    setShowSoundscapeGuide(true);
  }, []);

  const handleCloseSoundscapeGuide = useCallback((markSeen = true) => {
    setShowSoundscapeGuide(false);
    if (markSeen) {
      try {
        localStorage.setItem(SOUNDSCAPE_GUIDE_SEEN_KEY, 'true');
      } catch {
        // Ignore storage errors
      }
    }
  }, []);

  const completeSession = useCallback(
    (completedMinutes: number, finishedWhileAway = false) => {
      if (completingRef.current) return;
      completingRef.current = true;

      try {
        localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
      } catch {
        // Ignore storage errors
      }

      // Intentionally leave any playing soundscape running until the user explicitly turns it off
      releaseWakeLock();
      setIsActive(false);
      setEndTime(null);
      setTimeLeft(0);
      onStateChange(false);
      onComplete(completedMinutes);
      setCompletionNotice(
        finishedWhileAway
          ? `Completed ${completedMinutes}m focus session while away — logged automatically.`
          : `Completed ${completedMinutes}m focus session.`
      );
      setTimeout(() => setCompletionNotice(null), 6000);
    },
    [onComplete, onStateChange, releaseWakeLock]
  );

  // Restore or finish a lock session persisted across screen locks or page reloads
  useEffect(() => {
    const saved = readPersistedSession();
    if (!saved) return;

    const remainingMs = saved.endTime - Date.now();
    if (remainingMs <= 0) {
      completeSession(saved.durationMinutes, true);
    } else {
      completingRef.current = false;
      setDuration(saved.durationMinutes);
      setEndTime(saved.endTime);
      setTimeLeft(Math.max(1, Math.ceil(remainingMs / 1000)));
      setIsActive(true);
      onStateChange(true);
    }
    // Run once on mount to recover any pre-existing persisted session
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Wall-clock timestamp sync + immediate recovery when unlocking screen or returning to tab
  useEffect(() => {
    if (!isActive || !endTime) return;

    const syncRemaining = () => {
      const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        completeSession(duration, document.visibilityState !== 'visible');
      } else if (document.visibilityState === 'visible' && keepScreenAwake && !wakeLockSentinelRef.current) {
        acquireWakeLock();
      }
    };

    syncRemaining();
    const interval = setInterval(syncRemaining, 500);
    document.addEventListener('visibilitychange', syncRemaining);
    window.addEventListener('focus', syncRemaining);
    window.addEventListener('pageshow', syncRemaining);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', syncRemaining);
      window.removeEventListener('focus', syncRemaining);
      window.removeEventListener('pageshow', syncRemaining);
    };
  }, [isActive, endTime, duration, completeSession, keepScreenAwake, acquireWakeLock]);

  const handleStart = () => {
    completingRef.current = false;
    setCompletionNotice(null);
    const now = Date.now();
    const targetEnd = now + duration * 60 * 1000;

    try {
      const payload: PersistedFocusSession = {
        durationMinutes: duration,
        startedAt: now,
        endTime: targetEnd,
      };
      localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage quota errors
    }

    setEndTime(targetEnd);
    setTimeLeft(duration * 60);
    setIsActive(true);
    onStateChange(true);

    if (selectedSoundscape !== 'none' && !isSoundMuted) {
      soundscapeEngine.setVolume(soundVolume);
      soundscapeEngine.play(selectedSoundscape);
      maybeShowFirstTimeSoundscapeGuide();
    }
  };

  const handleSoundscapeToggleInSession = (type: SoundscapeType) => {
    if (soundState.isPlaying && soundState.activeType === type) {
      soundscapeEngine.stop();
    } else {
      setSelectedSoundscape(type);
      setIsSoundMuted(false);
      soundscapeEngine.setVolume(soundVolume);
      soundscapeEngine.play(type);
      maybeShowFirstTimeSoundscapeGuide();
    }
  };

  const handlePlayOrStopSoundscape = (type: SoundscapeType) => {
    if (soundState.isPlaying && soundState.activeType === type) {
      soundscapeEngine.stop();
    } else {
      setSelectedSoundscape(type);
      setIsSoundMuted(false);
      soundscapeEngine.setVolume(soundVolume);
      soundscapeEngine.play(type);
      maybeShowFirstTimeSoundscapeGuide();
    }
  };

  const handleTurnOffSoundscape = () => {
    soundscapeEngine.stop();
    setResumePromptType(null);
  };

  const toggleSoundMute = () => {
    if (isSoundMuted) {
      setIsSoundMuted(false);
      soundscapeEngine.setVolume(soundVolume);
      if (!soundState.isPlaying && selectedSoundscape !== 'none') {
        soundscapeEngine.play(selectedSoundscape);
      }
    } else {
      setIsSoundMuted(true);
      soundscapeEngine.setVolume(0);
    }
  };

  const toggleApp = (id: string) => {
    setSelectedApps(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const startEmergencyBreak = () => {
    setIsEmergencyBreaking(true);
    breakTimerRef.current = setTimeout(() => {
      try {
        localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
      } catch {
        // Ignore storage errors
      }
      // Keep any playing soundscape active until the user explicitly turns it off
      releaseWakeLock();
      setIsActive(false);
      setEndTime(null);
      onStateChange(false);
      setTimeLeft(0);
      setIsEmergencyBreaking(false);
    }, settings.breakDuration * 1000);
  };

  const cancelEmergencyBreak = () => {
    setIsEmergencyBreaking(false);
    if (breakTimerRef.current) clearTimeout(breakTimerRef.current);
  };

  const saveSettings = (newSettings: FocusLockSettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem('neuralplan_focus_settings', JSON.stringify(newSettings));
    } catch {
      // Ignore storage errors
    }
    setShowSettings(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const supportsWakeLock =
    typeof navigator !== 'undefined' && 'wakeLock' in navigator;

  if (isActive) {
    const formattedEndClock = endTime
      ? new Date(endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';

    return (
      <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-in fade-in duration-700 overflow-y-auto">
        <div className="relative">
          <svg className="w-72 h-72 sm:w-80 sm:h-80 -rotate-90" viewBox="0 0 320 320">
            <circle cx="160" cy="160" r="140" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-800" />
            <circle
              cx="160" cy="160" r="140" stroke="currentColor" strokeWidth="8" fill="transparent"
              strokeDasharray={880}
              strokeDashoffset={880 - (timeLeft / (duration * 60)) * 880}
              className="text-blue-500 transition-all duration-500 ease-linear"
              strokeLinecap="round"
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
            <Lock className="w-7 h-7 text-blue-400 mb-3" />
            <div className="text-6xl sm:text-7xl font-black tabular-nums tracking-tighter text-white">
              {formatTime(timeLeft)}
            </div>
            <div className="text-[10px] uppercase tracking-[0.35em] font-black text-blue-400 mt-2">
              Neural Containment Active
            </div>
            {formattedEndClock && (
              <div className="text-[11px] font-mono text-slate-400 mt-1.5 tabular-nums">
                Ends at {formattedEndClock} · Safe to lock screen
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 max-w-sm w-full space-y-4">
          {supportsWakeLock && (
            <button
              type="button"
              onClick={() => setKeepScreenAwake((prev) => !prev)}
              className={`w-full px-4 py-3 rounded-2xl border text-xs font-semibold flex items-center justify-between transition-all ${
                keepScreenAwake
                  ? 'bg-blue-600/15 border-blue-500/40 text-blue-200'
                  : 'bg-slate-900/90 border-white/10 text-slate-300 hover:border-white/20'
              }`}
            >
              <span className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-blue-400 shrink-0" />
                <span>Keep Screen Awake (Desk Clock)</span>
              </span>
              <span className={`font-mono text-[11px] ${keepScreenAwake ? 'text-emerald-400' : 'text-slate-400'}`}>
                {keepScreenAwake ? (wakeLockActive ? 'Awake' : 'Armed') : 'Off'}
              </span>
            </button>
          )}

          <div className="p-5 bg-slate-900/90 border border-white/10 rounded-3xl shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400">
                  <Headphones className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-white block">
                    Focus Soundscape
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 block truncate max-w-[190px]">
                    {soundState.isPlaying
                      ? `${SOUNDSCAPE_OPTIONS.find(s => s.id === soundState.activeType)?.name || 'Playing'}${soundState.phase ? ` · ${soundState.phase}` : ''}`
                      : 'Off (tap a soundscape to play)'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {soundState.isPlaying && (
                  <button
                    type="button"
                    onClick={handleTurnOffSoundscape}
                    className="px-2.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 text-[10px] font-bold flex items-center gap-1 transition-all"
                    title="Explicitly turn off background soundscape"
                  >
                    <Power className="w-3 h-3" />
                    <span>Turn Off</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={toggleSoundMute}
                  className={`p-2 rounded-xl border transition-all ${
                    isSoundMuted || !soundState.isPlaying
                      ? 'bg-slate-800 border-white/5 text-slate-500 hover:text-white'
                      : 'bg-blue-600/20 border-blue-500/40 text-blue-400 hover:bg-blue-600/30'
                  }`}
                  title={isSoundMuted ? 'Unmute soundscape' : 'Mute soundscape'}
                >
                  {isSoundMuted || !soundState.isPlaying ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mb-3">
              {SOUNDSCAPE_OPTIONS.map((opt) => {
                const isSelected = soundState.isPlaying && soundState.activeType === opt.id && !isSoundMuted;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSoundscapeToggleInSession(opt.id)}
                    className={`py-2 px-2 rounded-xl text-[10px] font-bold border transition-all truncate text-center ${
                      isSelected
                        ? 'bg-blue-600 border-blue-400 text-white shadow-md'
                        : 'bg-slate-800/60 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                    title={opt.name}
                  >
                    {opt.id === 'white_noise'
                      ? 'Brown Noise'
                      : opt.id === 'rainfall'
                        ? 'Rainfall'
                        : opt.id === 'beach_waves'
                          ? 'Beach Waves'
                          : opt.id === 'binaural_alpha'
                            ? '10Hz Alpha'
                            : opt.id === 'binaural_theta'
                              ? '6Hz Theta'
                              : 'Cosmic'}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-white/5">
              <Volume1 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isSoundMuted ? 0 : soundVolume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setSoundVolume(val);
                  setIsSoundMuted(false);
                }}
                className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
              <span className="text-[9px] font-mono text-slate-400 shrink-0 w-7 text-right tabular-nums">
                {Math.round((isSoundMuted ? 0 : soundVolume) * 100)}%
              </span>
            </div>
          </div>

          <div className="p-5 bg-blue-500/5 border border-blue-500/20 rounded-3xl text-center">
            <h3 className="text-xs font-black text-blue-100 mb-3 uppercase tracking-widest">Targets Under Containment</h3>
            <div className="flex flex-wrap justify-center gap-3">
              {selectedApps.length > 0 ? (
                selectedApps.map(appId => {
                  const app = DISTRACTION_APPS.find(a => a.id === appId);
                  return (
                    <div key={appId} className={`p-2.5 rounded-xl bg-slate-900 border border-white/5 ${app?.color}`}>
                      {app?.icon}
                    </div>
                  );
                })
              ) : (
                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-black">All External Stimuli Blocked</div>
              )}
            </div>
          </div>

          <button
            onMouseDown={startEmergencyBreak}
            onMouseUp={cancelEmergencyBreak}
            onMouseLeave={cancelEmergencyBreak}
            onTouchStart={startEmergencyBreak}
            onTouchEnd={cancelEmergencyBreak}
            className={`w-full py-5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all relative overflow-hidden ${
              isEmergencyBreaking ? 'bg-red-600 text-white shadow-[0_0_30px_rgba(220,38,38,0.4)]' : 'bg-slate-900 text-slate-500 border border-white/5'
            }`}
          >
            <div className="relative z-10 flex items-center justify-center gap-3">
              {isEmergencyBreaking ? (
                <>
                  <ShieldAlert className="w-5 h-5 animate-spin" />
                  {settings.breakPrompt}
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5" />
                  Hold {settings.breakDuration}s for Emergency Break
                </>
              )}
            </div>
            {isEmergencyBreaking && (
              <div
                className="absolute left-0 top-0 h-full bg-red-500/50"
                style={{ width: '100%', animation: `width ${settings.breakDuration}s linear forwards` }}
              />
            )}
          </button>
        </div>
        <style>{`@keyframes width { from { width: 0%; } to { width: 100%; } }`}</style>
      </div>
    );
  }

  return (
    <div className="bg-white/85 dark:bg-slate-900/50 border border-sky-900/10 dark:border-slate-800 rounded-[2rem] p-6 sm:p-7 relative overflow-hidden group shadow-[0_18px_50px_-18px_rgba(37,99,235,0.12)] dark:shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="bg-blue-500/10 p-2.5 rounded-xl">
            <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">Time Lock Protocol</h3>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="p-2 bg-[#F2F9FC] dark:bg-slate-800/50 hover:bg-sky-100 dark:hover:bg-slate-700 rounded-lg border border-sky-900/10 dark:border-white/5 transition-colors text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
        >
          <Settings2 className="w-4 h-4" />
        </button>
      </div>

      {completionNotice && (
        <div className="mb-5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30 text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{completionNotice}</span>
        </div>
      )}

      <div className="mb-7 relative z-10">
        <div className="flex items-center gap-2 mb-3 text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-widest">
          <Smartphone className="w-3.5 h-3.5" />
          Select Containment Targets
        </div>
        <div className="grid grid-cols-4 gap-2.5">
          {DISTRACTION_APPS.map((app) => (
            <button
              key={app.id}
              onClick={() => toggleApp(app.id)}
              className={`p-3.5 rounded-2xl border transition-all flex items-center justify-center ${
                selectedApps.includes(app.id)
                  ? `bg-white dark:bg-slate-800 border-blue-500/50 ${app.color} shadow-sm`
                  : 'bg-[#F2F9FC] dark:bg-slate-900/50 border-sky-900/10 dark:border-white/5 text-slate-400 dark:text-slate-600 grayscale hover:grayscale-0'
              }`}
              title={app.name}
            >
              {app.icon}
            </button>
          ))}
        </div>
      </div>

      {/* Focus Soundscape Selector */}
      <div className="mb-7 relative z-10">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-widest">
            <Headphones className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Focus Soundscape</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSoundscapeGuide(true)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              title="How background & lock-screen soundscapes work"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Guide</span>
            </button>
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold truncate max-w-[140px] text-right">
              {soundState.isPlaying
                ? soundState.isPaused
                  ? 'Paused'
                  : soundState.phase || 'Playing'
                : 'Ready'}
            </span>
          </div>
        </div>

        {/* Resume prompt if browser was reopened after a previous active soundscape */}
        {resumePromptType && !soundState.isPlaying && (
          <div className="mb-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-500/15 border border-blue-200 dark:border-blue-500/30 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                Resume {SOUNDSCAPE_OPTIONS.find((s) => s.id === resumePromptType)?.name}?
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-300">
                Was playing before page reload
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => handlePlayOrStopSoundscape(resumePromptType)}
                className="px-2.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold flex items-center gap-1"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Resume</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  soundscapeEngine.clearPersistedSoundscape();
                  setResumePromptType(null);
                }}
                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 dark:text-slate-400"
                title="Dismiss and keep soundscape off"
                aria-label="Turn off saved soundscape"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-2.5 mb-3">
          {SOUNDSCAPE_OPTIONS.map((sound) => {
            const isSelected = selectedSoundscape === sound.id;
            const isPlayingThis = soundState.isPlaying && soundState.activeType === sound.id;

            return (
              <div
                key={sound.id}
                onClick={() => {
                  setSelectedSoundscape(sound.id);
                  if (soundState.isPlaying && soundState.activeType !== sound.id) {
                    handlePlayOrStopSoundscape(sound.id);
                  }
                }}
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between relative overflow-hidden group/sound ${
                  isSelected || isPlayingThis
                    ? 'bg-blue-50/90 dark:bg-blue-600/15 border-blue-400 dark:border-blue-500/50 shadow-sm'
                    : 'bg-[#F2F9FC] dark:bg-slate-900/50 border-sky-900/10 dark:border-white/5 hover:border-blue-300 dark:hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-3 relative z-10 min-w-0">
                  <div className={`p-2 rounded-xl border transition-colors shrink-0 ${
                    isSelected || isPlayingThis
                      ? 'bg-blue-600 text-white border-blue-500'
                      : 'bg-white dark:bg-slate-800 border-sky-900/10 dark:border-white/5 text-slate-500 dark:text-slate-400'
                  }`}>
                    {sound.id === 'white_noise' && <Wind className="w-4 h-4" />}
                    {sound.id === 'rainfall' && <CloudRain className="w-4 h-4" />}
                    {sound.id === 'beach_waves' && <Waves className="w-4 h-4" />}
                    {sound.id === 'binaural_alpha' && <Sparkles className="w-4 h-4" />}
                    {sound.id === 'binaural_theta' && <Zap className="w-4 h-4" />}
                    {sound.id === 'deep_space' && <Radio className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-bold truncate ${isSelected || isPlayingThis ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                        {sound.name}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {sound.tagline}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 relative z-10 ml-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayOrStopSoundscape(sound.id);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border whitespace-nowrap ${
                      isPlayingThis
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-sky-900/10 dark:border-white/10 hover:text-blue-600 dark:hover:text-white'
                    }`}
                  >
                    {isPlayingThis ? 'Turn Off' : 'Play'}
                  </button>

                  <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                    isSelected ? 'border-blue-600 dark:border-blue-400 bg-blue-600 dark:bg-blue-500' : 'border-slate-300 dark:border-slate-700'
                  }`}>
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Gain & Explicit Background Turn-Off Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#F2F9FC] dark:bg-slate-950/40 border border-sky-900/10 dark:border-white/5 text-xs">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <button
                type="button"
                onClick={toggleSoundMute}
                className="p-1 rounded hover:text-slate-900 dark:hover:text-white transition-colors"
                title={isSoundMuted ? 'Unmute' : 'Mute'}
              >
                {isSoundMuted || soundVolume === 0 ? (
                  <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                )}
              </button>
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Gain</span>
            </div>

            <div className="flex items-center gap-2 w-36">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isSoundMuted ? 0 : soundVolume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setSoundVolume(val);
                  setIsSoundMuted(false);
                }}
                className="w-full accent-blue-600 h-1.5 bg-sky-200 dark:bg-slate-800 rounded-lg cursor-pointer"
              />
              <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400 w-7 text-right tabular-nums">
                {Math.round((isSoundMuted ? 0 : soundVolume) * 100)}%
              </span>
            </div>
          </div>

          {soundState.isPlaying && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-200 truncate">
                Playing in background until turned off
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => (soundState.isPaused ? soundscapeEngine.resume() : soundscapeEngine.pause())}
                  className="p-1.5 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-emerald-200 dark:border-emerald-500/30"
                  title={soundState.isPaused ? 'Resume soundscape' : 'Pause soundscape'}
                >
                  {soundState.isPaused ? <Play className="w-3 h-3 fill-current" /> : <Pause className="w-3 h-3" />}
                </button>
                <button
                  type="button"
                  onClick={handleTurnOffSoundscape}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold flex items-center gap-1"
                >
                  <Power className="w-3 h-3" />
                  <span>Turn Off</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5 relative z-10">
        {[30, 60, 90, 120].map((mins) => (
          <button
            key={mins}
            onClick={() => setDuration(mins)}
            className={`py-3.5 rounded-2xl border-2 font-bold tabular-nums transition-all ${
              duration === mins
                ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-600/20 scale-[1.02]'
                : 'bg-[#F2F9FC] dark:bg-slate-800/50 border-sky-900/10 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:border-blue-300 dark:hover:border-slate-600'
            }`}
          >
            {mins}m
          </button>
        ))}
      </div>

      {/* Optional Desk-Clock Wake Lock Toggle */}
      {supportsWakeLock && (
        <div className="mb-5 p-3 rounded-xl bg-[#F2F9FC] dark:bg-slate-950/40 border border-sky-900/10 dark:border-white/5 flex items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            <Monitor className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                Keep Screen Awake
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                Optional desk-clock mode
              </div>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={keepScreenAwake}
              onChange={(e) => setKeepScreenAwake(e.target.checked)}
            />
            <div className="w-8 h-4 bg-slate-300 dark:bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600" />
          </label>
        </div>
      )}

      <button
        onClick={handleStart}
        className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 dark:from-white dark:to-slate-100 text-white dark:text-slate-950 py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-3 hover:brightness-105 hover:scale-[1.01] active:scale-95 transition-all shadow-lg shadow-blue-600/20 dark:shadow-white/10 relative z-10"
      >
        <Lock className="w-4 h-4" />
        Initiate Lock
      </button>

      <p className="mt-3 text-center text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed relative z-10">
        Safe to lock your phone or switch tabs — timer and soundscape keep running seamlessly.
      </p>

      {showSettings && (
        <div className="absolute inset-0 z-20 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
          <div className="p-6 border-b border-sky-900/10 dark:border-white/5 flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
              <Settings2 className="w-3.5 h-3.5" />
              Protocol Config
            </h4>
            <button onClick={() => setShowSettings(false)} className="text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 space-y-6 flex-grow overflow-y-auto">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Emergency Break (Secs)</label>
              <input
                type="number" min="3" max="30"
                value={settings.breakDuration}
                onChange={(e) => setSettings({ ...settings, breakDuration: parseInt(e.target.value) || 5 })}
                className="w-full bg-[#F2F9FC] dark:bg-slate-900 border border-sky-900/15 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Breach Prompt Text</label>
              <input
                type="text" maxLength={30}
                value={settings.breakPrompt}
                onChange={(e) => setSettings({ ...settings, breakPrompt: e.target.value })}
                className="w-full bg-[#F2F9FC] dark:bg-slate-900 border border-sky-900/15 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="p-4 bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 rounded-xl">
              <p className="text-xs text-amber-800 dark:text-amber-400 font-medium leading-relaxed">
                Higher break durations decrease the probability of impulsive protocol abandonment.
              </p>
            </div>
          </div>

          <div className="p-6 pt-0">
            <button
              onClick={() => saveSettings(settings)}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
            >
              <Save className="w-4 h-4" />
              Store Calibration
            </button>
          </div>
        </div>
      )}

      <SoundscapeGuideModal
        isOpen={showSoundscapeGuide}
        onClose={handleCloseSoundscapeGuide}
        startLabel="Got It, Keep Playing"
      />
    </div>
  );
};
