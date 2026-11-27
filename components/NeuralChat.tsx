import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Bot,
  Minimize2,
  Maximize2,
  Loader2,
  Mic,
  Square,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { NeuralProfile } from '../types';
import { createChatSession } from '../services/geminiService';
import { readAloud, SpeechStateSnapshot } from '../services/speechService';
import { useVoiceDictation } from './VoiceDictationButton';

interface Message {
  role: 'user' | 'model';
  text: string;
}

interface NeuralChatProps {
  profile: NeuralProfile | null;
  speechRate?: number;
}

export const NeuralChat: React.FC<NeuralChatProps> = ({ profile, speechRate = 1 }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      text: 'Systems online. I am Dr. Neural. How can I assist with your cognitive workflow today?',
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [autoSpeakReplies, setAutoSpeakReplies] = useState(true);
  const [speechState, setSpeechState] = useState<SpeechStateSnapshot>(() => readAloud.getState());
  const chatRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return readAloud.subscribe(setSpeechState);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const initChat = () => {
    if (!chatRef.current) {
      chatRef.current = createChatSession(profile);
    }
  };

  const handleToggle = () => {
    if (!isOpen) initChat();
    setIsOpen(!isOpen);
    setIsMinimized(false);
  };

  const submitMessageText = useCallback(
    async (rawText: string, fromVoice = false) => {
      const userMessage = rawText.trim();
      if (!userMessage || isLoading) return;

      setInput('');
      setMessages((prev) => [...prev, { role: 'user', text: userMessage }]);
      setIsLoading(true);

      try {
        const chat = chatRef.current || createChatSession(profile);
        chatRef.current = chat;

        const response = await chat.sendMessage({ message: userMessage });
        const replyText =
          response.text || 'I apologize, my neural links faltered. Could you repeat that?';

        setMessages((prev) => {
          const next = [...prev, { role: 'model' as const, text: replyText }];
          if ((fromVoice || autoSpeakReplies) && autoSpeakReplies && readAloud.isSupported()) {
            readAloud.speak(replyText, `chat-msg-${next.length - 1}`, speechRate);
          }
          return next;
        });
      } catch {
        const fallbackText =
          'Connection interrupted. My behavioral circuits are currently re-calibrating.';
        setMessages((prev) => [...prev, { role: 'model', text: fallbackText }]);
      } finally {
        setIsLoading(false);
      }
    },
    [autoSpeakReplies, isLoading, profile, speechRate]
  );

  const {
    isListening,
    isTranscribing,
    interimText,
    elapsedSeconds,
    error: voiceError,
    clearError: clearVoiceError,
    toggle: toggleVoiceMic,
  } = useVoiceDictation({
    onFinalTranscript: (spoken) => {
      submitMessageText(spoken, true);
    },
  });

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    await submitMessageText(input, false);
  };

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!isOpen) {
    return (
      <button
        onClick={handleToggle}
        aria-label="Open Dr. Neural Chat"
        className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 dark:from-white dark:to-slate-100 text-white dark:text-slate-900 rounded-2xl shadow-[0_18px_40px_rgba(37,99,235,0.3)] dark:shadow-[0_20px_40px_rgba(255,255,255,0.2)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-[60] group"
      >
        <MessageSquare className="w-7 h-7 group-hover:rotate-12 transition-transform" />
      </button>
    );
  }

  return (
    <div
      className={`fixed bottom-6 right-6 w-[410px] max-w-[calc(100vw-2rem)] bg-white/95 dark:bg-slate-900 border border-sky-900/15 dark:border-white/10 rounded-[2rem] shadow-[0_24px_60px_rgba(15,23,42,0.18)] dark:shadow-[0_30px_60px_rgba(0,0,0,0.6)] backdrop-blur-2xl flex flex-col transition-all z-[60] overflow-hidden ${
        isMinimized ? 'h-20' : 'h-[610px] max-h-[calc(100vh-5rem)]'
      } animate-in slide-in-from-bottom-8 fade-in duration-500`}
    >
      {/* Header */}
      <div className="bg-[#F2F9FC] dark:bg-slate-800/50 p-4 sm:p-5 flex items-center justify-between border-b border-sky-900/10 dark:border-white/5">
        <div className="flex items-center gap-3">
          <div className="bg-blue-500/15 p-2 rounded-xl border border-blue-500/25">
            <Bot className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight leading-none">
              Dr. Neural
            </h3>
            <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold mt-1 inline-block">
              Voice &amp; Text Guide
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {readAloud.isSupported() && (
            <button
              type="button"
              onClick={() => {
                if (autoSpeakReplies) {
                  readAloud.stop();
                }
                setAutoSpeakReplies((v) => !v);
              }}
              className={`p-2 rounded-xl text-xs font-semibold transition-colors ${
                autoSpeakReplies
                  ? 'bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
              title={
                autoSpeakReplies
                  ? 'Voice replies are ON (tap to mute auto-speak)'
                  : 'Voice replies are OFF (tap to speak Dr. Neural replies aloud)'
              }
              aria-label={autoSpeakReplies ? 'Mute voice replies' : 'Enable voice replies'}
            >
              {autoSpeakReplies ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          )}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
            aria-label={isMinimized ? 'Expand chat' : 'Minimize chat'}
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={handleToggle}
            className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
            aria-label="Close chat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div ref={scrollRef} className="flex-grow overflow-y-auto p-5 space-y-4">
            {messages.map((msg, i) => {
              const msgId = `chat-msg-${i}`;
              const isSpeakingMsg =
                speechState.activeId === msgId && speechState.status === 'speaking';

              return (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                >
                  <div
                    className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed space-y-2 ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                        : 'bg-[#F2F9FC] dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-sky-900/10 dark:border-white/5'
                    }`}
                  >
                    <div>{msg.text}</div>
                    {msg.role === 'model' && readAloud.isSupported() && (
                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (isSpeakingMsg) {
                              readAloud.stop();
                            } else {
                              readAloud.speak(msg.text, msgId, speechRate);
                            }
                          }}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                            isSpeakingMsg
                              ? 'bg-blue-600 text-white'
                              : 'text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-300 hover:bg-white/70 dark:hover:bg-slate-700/60'
                          }`}
                          title={isSpeakingMsg ? 'Stop reading' : 'Listen to this reply'}
                        >
                          {isSpeakingMsg ? (
                            <>
                              <Square className="w-3 h-3 fill-current" />
                              <span>Stop</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3.5 h-3.5" />
                              <span>Listen</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-[#F2F9FC] dark:bg-slate-800 p-4 rounded-2xl border border-sky-900/10 dark:border-white/5 flex items-center gap-3">
                  <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin" />
                  <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">
                    Thinking...
                  </span>
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={handleSend}
            className="p-4 sm:p-5 border-t border-sky-900/10 dark:border-white/5 bg-[#F4FAFD] dark:bg-slate-900/50 space-y-2.5"
          >
            {(isListening || isTranscribing) && (
              <div className="px-3.5 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 flex items-center justify-between gap-2 text-xs">
                <div className="min-w-0">
                  <span className="font-bold text-rose-700 dark:text-rose-300">
                    {isTranscribing ? 'Transcribing speech...' : `Listening (${formatDuration(elapsedSeconds)})`}
                  </span>
                  {interimText && (
                    <p className="text-slate-700 dark:text-slate-200 truncate mt-0.5">
                      {interimText}
                    </p>
                  )}
                </div>
                {isListening && (
                  <button
                    type="button"
                    onClick={toggleVoiceMic}
                    className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold shrink-0"
                  >
                    Send
                  </button>
                )}
              </div>
            )}

            {voiceError && (
              <div
                onClick={clearVoiceError}
                className="px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-500/30 text-xs text-rose-700 dark:text-rose-200 cursor-pointer"
              >
                {voiceError}
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (voiceError) clearVoiceError();
                  toggleVoiceMic();
                }}
                disabled={isLoading || isTranscribing}
                title={isListening ? 'Stop and send spoken message' : 'Speak to Dr. Neural'}
                aria-label={isListening ? 'Stop and send voice message' : 'Speak to Dr. Neural'}
                className={`p-3 rounded-2xl border transition-all shrink-0 ${
                  isListening
                    ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-500/25'
                    : isTranscribing
                      ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-300'
                      : 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border-sky-900/15 dark:border-white/10 hover:bg-blue-50 dark:hover:bg-slate-700'
                }`}
              >
                {isTranscribing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isListening ? (
                  <Square className="w-4 h-4 fill-current" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>

              <div className="relative flex-1">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type or tap mic to speak..."
                  className="w-full bg-white dark:bg-slate-800/80 border border-sky-900/15 dark:border-white/10 rounded-2xl py-3.5 pl-4 pr-12 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium"
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 dark:bg-white text-white dark:text-slate-900 rounded-xl hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100 transition-all shadow-md"
                  aria-label="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </form>
        </>
      )}
    </div>
  );
};
