import React, { useEffect, useState } from 'react';
import {
  Mail,
  X,
  Sparkles,
  Flame,
  Clock,
  Target,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Send,
  ShieldCheck,
  Award,
  CalendarClock,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { AnalysisResult, EmailDigestSettings, UserStats } from '../types';
import {
  ComposedDigest,
  DEFAULT_EMAIL_DIGEST_SETTINGS,
  composeDailyDigest,
  sendDailyDigestViaGmail,
} from '../services/gmailService';
import { getGmailAccessToken, signInWithGoogleAndGmail } from '../services/firebase';
import { GoogleSignInButton } from './GoogleSignInButton';

interface GmailDigestModalProps {
  isOpen: boolean;
  onClose: () => void;
  authUser: User | null;
  stats: UserStats;
  latestPlan: AnalysisResult | null;
  onUpdateDigestSettings: (next: Partial<EmailDigestSettings>) => void;
}

export const GmailDigestModal: React.FC<GmailDigestModalProps> = ({
  isOpen,
  onClose,
  authUser,
  stats,
  latestPlan,
  onUpdateDigestSettings,
}) => {
  const settings: EmailDigestSettings = {
    ...DEFAULT_EMAIL_DIGEST_SETTINGS,
    ...(stats.emailDigestSettings || {}),
  };

  const displayName =
    stats.displayName ||
    authUser?.displayName ||
    authUser?.email?.split('@')[0] ||
    'Cognitive Pioneer';

  const [digest, setDigest] = useState<ComposedDigest | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sentConfirmation, setSentConfirmation] = useState<{
    sentTo: string;
    sentAt: string;
  } | null>(null);
  const [hasToken, setHasToken] = useState<boolean>(() => Boolean(getGmailAccessToken()));

  const loadDigestPreview = async () => {
    setIsComposing(true);
    setErrorMsg(null);
    try {
      const composed = await composeDailyDigest({
        stats,
        latestPlan,
        displayName,
        settings,
      });
      setDigest(composed);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not generate digest preview.');
    } finally {
      setIsComposing(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setHasToken(Boolean(getGmailAccessToken()));
    setSentConfirmation(null);
    setErrorMsg(null);
    loadDigestPreview();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConnectGoogle = async () => {
    setIsAuthorizing(true);
    setErrorMsg(null);
    try {
      const res = await signInWithGoogleAndGmail();
      setHasToken(Boolean(res.accessToken));
      if (!res.accessToken) {
        setErrorMsg('Google signed in, but Gmail send permission was not granted. Please allow Gmail send permission when prompted.');
      }
    } catch (err: any) {
      setErrorMsg('Google sign-in was cancelled or blocked. Please try again.');
    } finally {
      setIsAuthorizing(false);
    }
  };

  const handleConfirmAndSend = async () => {
    if (!digest) return;
    setErrorMsg(null);
    setIsSending(true);

    try {
      let token = getGmailAccessToken();
      if (!token) {
        setIsAuthorizing(true);
        const authRes = await signInWithGoogleAndGmail();
        token = authRes.accessToken;
        setHasToken(Boolean(token));
        setIsAuthorizing(false);
      }

      if (!token) {
        setErrorMsg('Please grant Gmail permission in the Google sign-in window so NeuralPlan can deliver this digest to your inbox.');
        setIsSending(false);
        return;
      }

      let result = await sendDailyDigestViaGmail({
        accessToken: token,
        digest,
        stats,
        latestPlan,
        displayName,
        settings,
      });

      if (!result.ok && result.needsReauth) {
        // Token expired or missing gmail.send scope — re-prompt cleanly once
        setIsAuthorizing(true);
        const reauth = await signInWithGoogleAndGmail();
        setIsAuthorizing(false);
        if (reauth.accessToken) {
          setHasToken(true);
          result = await sendDailyDigestViaGmail({
            accessToken: reauth.accessToken,
            digest,
            stats,
            latestPlan,
            displayName,
            settings,
          });
        }
      }

      if (!result.ok) {
        setErrorMsg(result.error || 'Could not send email via Gmail.');
        setIsSending(false);
        return;
      }

      const nowIso = new Date().toISOString();
      const todayStr = nowIso.split('T')[0];
      onUpdateDigestSettings({
        lastSentDate: todayStr,
        lastSentAt: nowIso,
      });

      setSentConfirmation({
        sentTo: result.sentTo || authUser?.email || 'your Gmail inbox',
        sentAt: nowIso,
      });
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unexpected error sending Gmail digest.');
    } finally {
      setIsAuthorizing(false);
      setIsSending(false);
    }
  };

  const completedGoalsCount = (stats.goalHistory || []).filter((g) => g.status === 'completed').length;

  return (
    <div className="fixed inset-0 z-[120] bg-slate-900/50 dark:bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 overflow-y-auto font-sans">
      <div className="max-w-2xl w-full bg-white/95 dark:bg-slate-900 border border-sky-900/15 dark:border-slate-800 rounded-[2.25rem] shadow-2xl overflow-hidden relative my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 sm:p-7 bg-gradient-to-b from-[#EAF6FA] to-white/90 dark:from-slate-800/70 dark:to-slate-900/70 border-b border-sky-900/10 dark:border-slate-800 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-sky-100/70 dark:hover:bg-slate-800 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4 pr-10">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20 shrink-0">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
                Gmail Daily Updates
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Confirm &amp; Send Focus Digest
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Review the exact message that will be sent to your Gmail inbox before sending.
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-7 max-h-[65vh] overflow-y-auto space-y-5">
          {!authUser ? (
            <div className="p-6 rounded-2xl bg-[#F2F9FC] dark:bg-slate-950/60 border border-sky-900/10 dark:border-slate-800 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400">
                <Mail className="w-6 h-6" />
              </div>
              <div className="space-y-1.5 max-w-md mx-auto">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Sign in with Gmail to receive daily updates
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Connect your Google account so NeuralPlan can deliver personalized focus tips, streak progress, and daily protocols directly to your inbox with your confirmation.
                </p>
              </div>
              <div className="pt-1 flex justify-center">
                <GoogleSignInButton
                  onClick={handleConnectGoogle}
                  loading={isAuthorizing}
                  label="Sign in with Google"
                />
              </div>
            </div>
          ) : (
            <>
              {/* Recipient & Schedule Preferences */}
              <div className="bg-[#F2F9FC] dark:bg-slate-950/60 border border-sky-900/10 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      Recipient Inbox
                    </div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {authUser.email}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasToken ? (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Gmail Authorized
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleConnectGoogle}
                        disabled={isAuthorizing}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-bold transition-colors flex items-center gap-1.5"
                      >
                        {isAuthorizing && <RefreshCw className="w-3 h-3 animate-spin" />}
                        Grant Gmail Permission
                      </button>
                    )}
                  </div>
                </div>

                {/* Digest Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-sky-900/10 dark:border-slate-800">
                  <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-sky-900/10 dark:border-slate-800 cursor-pointer">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                      <CalendarClock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      Daily Digest Prompts
                    </span>
                    <input
                      type="checkbox"
                      checked={settings.enabled}
                      onChange={(e) => onUpdateDigestSettings({ enabled: e.target.checked })}
                      className="w-4 h-4 accent-blue-600 rounded"
                    />
                  </label>

                  <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-sky-900/10 dark:border-slate-800">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      Preferred Time
                    </span>
                    <input
                      type="time"
                      value={settings.preferredTime}
                      onChange={(e) => onUpdateDigestSettings({ preferredTime: e.target.value })}
                      className="bg-[#EEF7FA] dark:bg-slate-800 border border-sky-900/15 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white px-2 py-1 rounded-lg outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'includeFocusTips' as const, label: 'Focus Tips' },
                    { key: 'includeProgressStats' as const, label: 'Progress & Streaks' },
                    { key: 'includeDailyPlan' as const, label: 'Adapted Plan' },
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() =>
                        onUpdateDigestSettings({ [item.key]: !settings[item.key] })
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        settings[item.key]
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-sky-900/15 dark:border-slate-700'
                      }`}
                    >
                      {settings[item.key] ? '✓ ' : '+ '}
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Error Banner */}
              {errorMsg && (
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-xs font-semibold text-red-700 dark:text-red-300 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Sent Success Banner */}
              {sentConfirmation && (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <div className="font-bold">Daily digest sent to {sentConfirmation.sentTo}!</div>
                    <div className="text-[11px] opacity-85 mt-0.5">
                      Check your Gmail inbox for your focus tip, progress snapshot, and daily briefing.
                    </div>
                  </div>
                </div>
              )}

              {/* Email Content Preview */}
              <div className="rounded-2xl border border-sky-900/15 dark:border-slate-700/80 bg-white dark:bg-slate-950/80 overflow-hidden shadow-sm">
                <div className="px-4 py-3 bg-[#EEF7FA] dark:bg-slate-900 border-b border-sky-900/10 dark:border-slate-800 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Email Preview
                  </span>
                  <button
                    type="button"
                    onClick={loadDigestPreview}
                    disabled={isComposing}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isComposing ? 'animate-spin' : ''}`} />
                    Refresh Tip
                  </button>
                </div>

                {isComposing || !digest ? (
                  <div className="p-8 text-center space-y-2 text-xs text-slate-500 dark:text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-600 dark:text-blue-400" />
                    <p>Synthesizing your personalized NeuralPlan digest...</p>
                  </div>
                ) : (
                  <div className="p-5 space-y-4">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Subject
                      </div>
                      <input
                        type="text"
                        value={digest.subject}
                        onChange={(e) =>
                          setDigest((prev) =>
                            prev ? { ...prev, subject: e.target.value } : prev
                          )
                        }
                        maxLength={140}
                        className="mt-1 w-full bg-[#F7FBFD] dark:bg-slate-900 border border-sky-900/10 dark:border-slate-800 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {digest.headline}
                      </p>
                      {settings.includeProgressStats && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                          {digest.progressSummary}
                        </p>
                      )}
                    </div>

                    {settings.includeProgressStats && (
                      <div className="grid grid-cols-3 gap-2.5">
                        <div className="p-3 rounded-xl bg-[#F2F9FC] dark:bg-slate-900 border border-sky-900/10 dark:border-slate-800 text-center">
                          <div className="text-base font-black text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1 tabular-nums">
                            <Flame className="w-4 h-4" />
                            {stats.currentStreak}d
                          </div>
                          <div className="text-[10px] font-semibold text-slate-500 uppercase">Streak</div>
                        </div>
                        <div className="p-3 rounded-xl bg-[#F2F9FC] dark:bg-slate-900 border border-sky-900/10 dark:border-slate-800 text-center">
                          <div className="text-base font-black text-blue-600 dark:text-blue-400 flex items-center justify-center gap-1 tabular-nums">
                            <Clock className="w-4 h-4" />
                            {stats.totalFocusMinutes}m
                          </div>
                          <div className="text-[10px] font-semibold text-slate-500 uppercase">Focused</div>
                        </div>
                        <div className="p-3 rounded-xl bg-[#F2F9FC] dark:bg-slate-900 border border-sky-900/10 dark:border-slate-800 text-center">
                          <div className="text-base font-black text-indigo-600 dark:text-violet-400 flex items-center justify-center gap-1 tabular-nums">
                            <Award className="w-4 h-4" />
                            {completedGoalsCount}
                          </div>
                          <div className="text-[10px] font-semibold text-slate-500 uppercase">Goals Done</div>
                        </div>
                      </div>
                    )}

                    {settings.includeFocusTips && (
                      <div className="p-4 rounded-xl bg-blue-50/80 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 space-y-1">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          Tailored Focus Tip
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                          {digest.focusTip}
                        </p>
                      </div>
                    )}

                    {stats.mainGoal && (
                      <div className="p-3.5 rounded-xl bg-[#F2F9FC] dark:bg-slate-900 border border-sky-900/10 dark:border-slate-800 flex items-start gap-2.5">
                        <Target className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Locked Main Goal &amp; Next Move
                          </div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                            "{stats.mainGoal}"
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                            {digest.nextMove}
                          </div>
                        </div>
                      </div>
                    )}

                    {settings.includeDailyPlan && digest.scheduleHighlights.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Today&apos;s Protocol Blocks
                        </div>
                        <div className="space-y-1">
                          {digest.scheduleHighlights.map((line, i) => (
                            <div
                              key={i}
                              className="text-xs text-slate-700 dark:text-slate-300 bg-[#F7FBFD] dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-sky-900/10 dark:border-slate-800"
                            >
                              {line}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer Confirmation Actions */}
        <div className="p-5 sm:p-6 bg-[#F2F9FC] dark:bg-slate-950/70 border-t border-sky-900/10 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-white hover:bg-sky-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-sky-900/10 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors"
          >
            Cancel
          </button>

          {authUser && (
            <button
              type="button"
              onClick={handleConfirmAndSend}
              disabled={isComposing || isSending || isAuthorizing || !digest}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:brightness-105 text-white text-xs font-bold shadow-lg shadow-blue-600/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSending || isAuthorizing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{isAuthorizing ? 'Authorizing Gmail...' : 'Sending to Gmail...'}</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Confirm &amp; Send to {authUser.email}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
