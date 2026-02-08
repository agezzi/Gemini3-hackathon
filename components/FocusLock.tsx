
import React, { useState, useEffect, useRef } from 'react';
import { 
  Timer, 
  ShieldAlert, 
  Lock, 
  Unlock, 
  Zap, 
  Flame, 
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
  Smartphone
} from 'lucide-react';

interface FocusLockSettings {
  breakDuration: number;
  breakPrompt: string;
}

interface FocusLockProps {
  onComplete: (minutes: number) => void;
  onStateChange: (isActive: boolean) => void;
}

const DEFAULT_SETTINGS: FocusLockSettings = {
  breakDuration: 5,
  breakPrompt: "Breaking Protocol..."
};

const DISTRACTION_APPS = [
  { id: 'instagram', icon: <Instagram className="w-5 h-5" />, color: 'text-pink-500', name: 'Instagram' },
  { id: 'x', icon: <Twitter className="w-5 h-5" />, color: 'text-slate-200', name: 'X / Twitter' },
  { id: 'pinterest', icon: <Pin className="w-5 h-5" />, color: 'text-red-500', name: 'Pinterest' },
  { id: 'netflix', icon: <Tv className="w-5 h-5" />, color: 'text-red-600', name: 'Netflix' },
  { id: 'youtube', icon: <Youtube className="w-5 h-5" />, color: 'text-red-500', name: 'YouTube' },
  { id: 'facebook', icon: <Facebook className="w-5 h-5" />, color: 'text-blue-600', name: 'Facebook' },
  { id: 'tiktok', icon: <Music className="w-5 h-5" />, color: 'text-cyan-400', name: 'TikTok' },
  { id: 'reddit', icon: <MessageCircle className="w-5 h-5" />, color: 'text-orange-500', name: 'Reddit' },
];

export const FocusLock: React.FC<FocusLockProps> = ({ onComplete, onStateChange }) => {
  const [isActive, setIsActive] = useState(false);
  const [duration, setDuration] = useState(60); // minutes
  const [timeLeft, setTimeLeft] = useState(0);
  const [isEmergencyBreaking, setIsEmergencyBreaking] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedApps, setSelectedApps] = useState<string[]>(() => {
    const saved = localStorage.getItem('neuralplan_locked_apps');
    return saved ? JSON.parse(saved) : ['instagram', 'x'];
  });
  
  const [settings, setSettings] = useState<FocusLockSettings>(() => {
    const saved = localStorage.getItem('neuralplan_focus_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  const breakTimerRef = useRef<any>(null);

  useEffect(() => {
    localStorage.setItem('neuralplan_locked_apps', JSON.stringify(selectedApps));
  }, [selectedApps]);

  useEffect(() => {
    let interval: any;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (isActive && timeLeft === 0) {
      handleSuccess();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const handleStart = () => {
    setTimeLeft(duration * 60);
    setIsActive(true);
    onStateChange(true);
  };

  const handleSuccess = () => {
    setIsActive(false);
    onStateChange(false);
    onComplete(duration);
    alert("Protocol Complete. Neural rewards synchronized.");
  };

  const toggleApp = (id: string) => {
    setSelectedApps(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const startEmergencyBreak = () => {
    setIsEmergencyBreaking(true);
    breakTimerRef.current = setTimeout(() => {
      setIsActive(false);
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
    localStorage.setItem('neuralplan_focus_settings', JSON.stringify(newSettings));
    setShowSettings(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (isActive) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-in fade-in duration-700">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="h-full w-full bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(59,130,246,0.1)_3px)]" />
        </div>
        
        <div className="relative">
          <svg className="w-80 h-80 -rotate-90">
            <circle cx="160" cy="160" r="140" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-800" />
            <circle
              cx="160" cy="160" r="140" stroke="currentColor" strokeWidth="8" fill="transparent"
              strokeDasharray={880}
              strokeDashoffset={880 - (timeLeft / (duration * 60)) * 880}
              className="text-blue-500 transition-all duration-1000 ease-linear"
              strokeLinecap="round"
            />
          </svg>
          
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <Lock className="w-8 h-8 text-blue-400 mb-4 animate-pulse" />
            <div className="text-7xl font-black tabular-nums tracking-tighter text-white">
              {formatTime(timeLeft)}
            </div>
            <div className="text-[10px] uppercase tracking-[0.4em] font-black text-blue-500 mt-2">
              Neural Containment Active
            </div>
          </div>
        </div>

        <div className="mt-16 max-w-sm w-full space-y-8">
          <div className="p-6 bg-blue-500/5 border border-blue-500/20 rounded-3xl text-center">
            <h3 className="text-xs font-black text-blue-100 mb-4 uppercase tracking-widest">Targets Under Containment</h3>
            <div className="flex flex-wrap justify-center gap-4">
              {selectedApps.length > 0 ? (
                selectedApps.map(appId => {
                  const app = DISTRACTION_APPS.find(a => a.id === appId);
                  return (
                    <div key={appId} className={`p-3 rounded-2xl bg-slate-900 border border-white/5 ${app?.color}`}>
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
    <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8 ring-1 ring-white/5 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <Timer className="w-20 h-20" />
      </div>

      <div className="flex items-center justify-between mb-8 relative z-10">
        <div className="flex items-center gap-3">
          <div className="bg-blue-500/10 p-2.5 rounded-xl">
            <Zap className="w-5 h-5 text-blue-400" />
          </div>
          <h3 className="text-sm font-black text-slate-200 uppercase tracking-widest">Time Lock Protocol</h3>
        </div>
        <button 
          onClick={() => setShowSettings(true)}
          className="p-2 bg-slate-800/50 hover:bg-slate-700 rounded-lg border border-white/5 transition-colors text-slate-400 hover:text-white"
        >
          <Settings2 className="w-4 h-4" />
        </button>
      </div>

      <div className="mb-8 relative z-10">
        <div className="flex items-center gap-2 mb-4 text-[10px] uppercase font-black text-slate-500 tracking-widest">
          <Smartphone className="w-3.5 h-3.5" />
          Select Containment Targets
        </div>
        <div className="grid grid-cols-4 gap-3">
          {DISTRACTION_APPS.map((app) => (
            <button
              key={app.id}
              onClick={() => toggleApp(app.id)}
              className={`p-4 rounded-2xl border transition-all flex items-center justify-center ${
                selectedApps.includes(app.id)
                  ? `bg-slate-800 border-blue-500/50 ${app.color} shadow-lg shadow-blue-500/5`
                  : 'bg-slate-900/50 border-white/5 text-slate-600 grayscale hover:grayscale-0'
              }`}
              title={app.name}
            >
              {app.icon}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-8 relative z-10">
        {[30, 60, 90, 120].map((mins) => (
          <button
            key={mins}
            onClick={() => setDuration(mins)}
            className={`py-4 rounded-2xl border-2 font-black transition-all ${
              duration === mins 
                ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-900/40 scale-[1.02]' 
                : 'bg-slate-800/50 border-white/5 text-slate-400 hover:border-slate-600'
            }`}
          >
            {mins}m
          </button>
        ))}
      </div>

      <button
        onClick={handleStart}
        className="w-full bg-white text-slate-950 py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-xl relative z-10"
      >
        <Lock className="w-5 h-5" />
        Initiate Lock
      </button>

      <div className="mt-6 flex items-center gap-2 text-slate-600 relative z-10">
        <AlertCircle className="w-3 h-3" />
        <span className="text-[9px] uppercase font-black tracking-widest">Containment Sub-Engine Active</span>
      </div>

      {showSettings && (
        <div className="absolute inset-0 z-20 bg-slate-950/95 flex flex-col animate-in fade-in zoom-in-95 duration-200">
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
              <Settings2 className="w-3.5 h-3.5" />
              Protocol Config
            </h4>
            <button onClick={() => setShowSettings(false)} className="text-slate-500 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="p-6 space-y-6 flex-grow overflow-y-auto">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Emergency Break (Secs)</label>
              <input 
                type="number" min="3" max="30"
                value={settings.breakDuration}
                onChange={(e) => setSettings({...settings, breakDuration: parseInt(e.target.value) || 5})}
                className="w-full bg-slate-900 border border-white/5 rounded-xl p-3 text-sm text-white focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Breach Prompt Text</label>
              <input 
                type="text" maxLength={30}
                value={settings.breakPrompt}
                onChange={(e) => setSettings({...settings, breakPrompt: e.target.value})}
                className="w-full bg-slate-900 border border-white/5 rounded-xl p-3 text-sm text-white focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
              <p className="text-[9px] text-amber-500/80 font-medium leading-relaxed uppercase tracking-widest">
                Higher break durations decrease the probability of impulsive protocol abandonment.
              </p>
            </div>
          </div>

          <div className="p-6 pt-0">
            <button
              onClick={() => saveSettings(settings)}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
            >
              <Save className="w-4 h-4" />
              Store Calibration
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
