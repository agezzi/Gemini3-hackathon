import React, { useRef, useState, useEffect } from 'react';
import { 
  X, 
  Share2, 
  Twitter, 
  Linkedin, 
  Send, 
  Download, 
  Copy, 
  Check, 
  Sparkles, 
  Award, 
  Flame, 
  Zap, 
  ExternalLink,
  MessageCircle,
  Trophy
} from 'lucide-react';
import { ZenScoreRecord, ZenWeeklyWinnerRecord } from '../types';

interface ZenShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  scoreRecord: Partial<ZenScoreRecord> | null;
  weeklyWinner?: ZenWeeklyWinnerRecord | null;
  isWeeklyChampion?: boolean;
}

export const ZenShareModal: React.FC<ZenShareModalProps> = ({
  isOpen,
  onClose,
  scoreRecord,
  weeklyWinner,
  isWeeklyChampion = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [imageGenerated, setImageGenerated] = useState(false);
  const [canWebShare, setCanWebShare] = useState(false);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && !!navigator.share) {
      setCanWebShare(true);
    }
  }, []);

  const playerName = scoreRecord?.displayName || weeklyWinner?.displayName || 'Mindful Pioneer';
  const score = scoreRecord?.score ?? weeklyWinner?.topScore ?? 4250;
  const harmony = scoreRecord?.harmonyRate ?? 96;
  const streak = scoreRecord?.longestStreak ?? 24;
  const weekId = scoreRecord?.weekId || weeklyWinner?.weekId || 'Current Week';

  const titleText = isWeeklyChampion 
    ? `🪷 Crowned #1 Weekly Champion in NeuralPlan Zen Tournament!`
    : `🧘 Reached ${score.toLocaleString()} Zen Harmony Points in NeuralPlan!`;

  const shareText = isWeeklyChampion
    ? `I just claimed the #1 Weekly Champion Lotus Badge in NeuralPlan's Zen Meditation & Focus Tournament (${score.toLocaleString()} pts, ${harmony}% harmony streak). Training parasympathetic calm and executive flow!`
    : `Trained my calm focus in NeuralPlan Zen Meditation: ${score.toLocaleString()} Harmony Points with an unbroken ${streak}x resonance streak. #Mindfulness #ZenFocus #NeuralPlan`;

  const shareUrl = typeof window !== 'undefined' ? window.location.origin : 'https://neuralplan.app';

  // Render high-res social card on Canvas
  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set resolution (1200 x 630 standard OpenGraph landscape)
    const width = 1200;
    const height = 630;
    canvas.width = width;
    canvas.height = height;

    // Draw deep midnight gradient background
    const bgGradient = ctx.createLinearGradient(0, 0, width, height);
    bgGradient.addColorStop(0, '#021017');
    bgGradient.addColorStop(0.5, '#062633');
    bgGradient.addColorStop(1, '#03131c');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Decorative radial aura
    const aura = ctx.createRadialGradient(width / 2, height / 2 - 20, 50, width / 2, height / 2, 450);
    aura.addColorStop(0, isWeeklyChampion ? 'rgba(245, 158, 11, 0.25)' : 'rgba(20, 184, 166, 0.25)');
    aura.addColorStop(0.7, 'rgba(6, 182, 212, 0.08)');
    aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = aura;
    ctx.fillRect(0, 0, width, height);

    // Border glow
    ctx.strokeStyle = isWeeklyChampion ? '#f59e0b' : '#14b8a6';
    ctx.lineWidth = 6;
    ctx.strokeRect(20, 20, width - 40, height - 40);

    // Header Branding
    ctx.fillStyle = isWeeklyChampion ? '#fbbf24' : '#2dd4bf';
    ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.letterSpacing = '6px';
    ctx.fillText('NEURALPLAN • ZEN MEDITATION & FOCUS', 70, 85);

    // Tournament Badge Pill
    const badgeText = isWeeklyChampion ? '👑 WEEKLY TOURNAMENT CHAMPION' : `TOURNAMENT CYCLE: ${weekId}`;
    ctx.fillStyle = isWeeklyChampion ? 'rgba(245, 158, 11, 0.2)' : 'rgba(20, 184, 166, 0.2)';
    ctx.roundRect(width - 480, 55, 410, 42, 12);
    ctx.fill();
    ctx.fillStyle = isWeeklyChampion ? '#fef08a' : '#99f6e4';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(badgeText, width - 455, 82);

    // Player Name
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 48px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(playerName, 70, 175);

    // Subtitle / Achievement Callout
    ctx.fillStyle = isWeeklyChampion ? '#fde047' : '#5eead4';
    ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(isWeeklyChampion ? 'Lotus Sovereign • #1 Reigning Master of Calm Focus' : 'Mindful Resonance Flow • Cognitive Calm Certified', 70, 215);

    // Main Big Score
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 96px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(score.toLocaleString(), 70, 340);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('ZEN HARMONY RESONANCE POINTS', 70, 375);

    // Metrics Cards Grid
    const cardY = 430;
    const cardW = 320;
    const cardH = 120;

    // Card 1: Harmony Rate
    ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
    ctx.roundRect(70, cardY, cardW, cardH, 18);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(70, cardY, cardW, cardH);

    ctx.fillStyle = '#2dd4bf';
    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('RHYTHMIC HARMONY', 95, cardY + 40);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 38px monospace';
    ctx.fillText(`${harmony}%`, 95, cardY + 90);

    // Card 2: Flow Streak
    ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
    ctx.roundRect(420, cardY, cardW, cardH, 18);
    ctx.fill();
    ctx.strokeRect(420, cardY, cardW, cardH);

    ctx.fillStyle = '#fb923c';
    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('LONGEST CALM STREAK', 445, cardY + 40);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 38px monospace';
    ctx.fillText(`${streak}x Chain`, 445, cardY + 90);

    // Card 3: Awarded Badge
    ctx.fillStyle = isWeeklyChampion ? 'rgba(245, 158, 11, 0.15)' : 'rgba(15, 23, 42, 0.7)';
    ctx.roundRect(770, cardY, cardW, cardH, 18);
    ctx.fill();
    ctx.strokeStyle = isWeeklyChampion ? 'rgba(245, 158, 11, 0.4)' : 'rgba(255, 255, 255, 0.1)';
    ctx.strokeRect(770, cardY, cardW, cardH);

    ctx.fillStyle = isWeeklyChampion ? '#fde047' : '#a855f7';
    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(isWeeklyChampion ? 'AWARDED REWARD' : 'ACCOLADE STATUS', 795, cardY + 40);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 30px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(isWeeklyChampion ? '🪷 Lotus Sovereign' : '🧘 Serenity Sage', 795, cardY + 90);

    // Footer Watermark
    ctx.fillStyle = '#64748b';
    ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Verified by NeuralPlan Behavioral Adaptation Engine • neuralplan.app', 70, 585);

    setImageGenerated(true);
  }, [isOpen, playerName, score, harmony, streak, weekId, isWeeklyChampion]);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleDownloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `NeuralPlan_Zen_${isWeeklyChampion ? 'Weekly_Champion' : 'Score'}_${score}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleWebShare = async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({
        title: titleText,
        text: shareText,
        url: shareUrl
      });
    } catch (e) {
      console.log('Share canceled or failed', e);
    }
  };

  const handleTwitterShare = () => {
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(tweetUrl, '_blank', 'noopener,noreferrer');
  };

  const handleLinkedInShare = () => {
    const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    window.open(linkedinUrl, '_blank', 'noopener,noreferrer');
  };

  const handleWhatsAppShare = () => {
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  const handleRedditShare = () => {
    const redditUrl = `https://reddit.com/submit?title=${encodeURIComponent(titleText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(redditUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-[250] bg-slate-950/85 backdrop-blur-xl flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-300">
      <div className="max-w-2xl w-full bg-slate-900 border border-teal-500/30 rounded-[2.5rem] p-6 md:p-8 shadow-2xl relative overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Glow ambient background */}
        <div className={`absolute top-0 right-0 w-80 h-80 rounded-full blur-[100px] pointer-events-none ${
          isWeeklyChampion ? 'bg-amber-500/20' : 'bg-teal-500/15'
        }`} />

        {/* Modal Top Bar */}
        <div className="flex items-center justify-between mb-5 relative z-10">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl ${
              isWeeklyChampion 
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
            }`}>
              {isWeeklyChampion ? <Trophy className="w-6 h-6 animate-bounce" /> : <Sparkles className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                  isWeeklyChampion ? 'bg-amber-500/20 text-amber-300' : 'bg-teal-500/20 text-teal-300'
                }`}>
                  {isWeeklyChampion ? 'Weekly Champion Award' : 'Share Zen Score'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {weekId}
                </span>
              </div>
              <h2 className="text-xl font-black text-white tracking-tight mt-0.5">
                {isWeeklyChampion ? 'Share Your Weekly Championship!' : 'Broadcast Your Zen Focus Flow'}
              </h2>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Generated Certificate Card Preview */}
        <div className="space-y-4 overflow-y-auto pr-1">
          <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-xl group">
            <canvas 
              ref={canvasRef} 
              className="w-full h-auto object-cover rounded-2xl block aspect-[1200/630]" 
            />
            <div className="absolute bottom-3 right-3 flex items-center gap-2">
              <button
                onClick={handleDownloadImage}
                className="px-3 py-1.5 rounded-xl bg-black/70 hover:bg-black/90 backdrop-blur-md text-white text-xs font-bold border border-white/20 flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                title="Download High-Resolution PNG Certificate"
              >
                <Download className="w-3.5 h-3.5 text-teal-400" />
                <span>Save Image</span>
              </button>
            </div>
          </div>

          {/* Social Media Intent Buttons */}
          <div className="bg-slate-950/60 border border-white/5 p-4 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-teal-400" />
                Integrated Social Channels
              </span>
              {canWebShare && (
                <button
                  onClick={handleWebShare}
                  className="text-xs font-bold text-teal-400 hover:text-teal-300 flex items-center gap-1 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  System Share Sheet
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                onClick={handleTwitterShare}
                className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/5 hover:border-sky-500/40 text-slate-200 hover:text-white transition-all flex items-center justify-center gap-2 text-xs font-bold group"
              >
                <Twitter className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
                <span>X / Twitter</span>
              </button>

              <button
                onClick={handleLinkedInShare}
                className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/5 hover:border-blue-500/40 text-slate-200 hover:text-white transition-all flex items-center justify-center gap-2 text-xs font-bold group"
              >
                <Linkedin className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                <span>LinkedIn</span>
              </button>

              <button
                onClick={handleWhatsAppShare}
                className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/5 hover:border-emerald-500/40 text-slate-200 hover:text-white transition-all flex items-center justify-center gap-2 text-xs font-bold group"
              >
                <Send className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                <span>WhatsApp</span>
              </button>

              <button
                onClick={handleRedditShare}
                className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/5 hover:border-orange-500/40 text-slate-200 hover:text-white transition-all flex items-center justify-center gap-2 text-xs font-bold group"
              >
                <MessageCircle className="w-4 h-4 text-orange-400 group-hover:scale-110 transition-transform" />
                <span>Reddit</span>
              </button>
            </div>
          </div>

          {/* Direct Copy Link & Shareable Text Section */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              readOnly
              value={`${shareText} ${shareUrl}`}
              className="flex-1 bg-slate-950/80 border border-white/10 rounded-xl px-4 py-3 text-xs text-slate-300 font-mono truncate focus:outline-none"
            />
            <button
              onClick={handleCopyLink}
              className={`px-5 py-3 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-md active:scale-95 shrink-0 ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-teal-600 hover:bg-teal-500 text-white'
              }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied!' : 'Copy Post'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
