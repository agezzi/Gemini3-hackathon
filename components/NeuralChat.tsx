
import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Minimize2, Maximize2, Sparkles, Loader2 } from 'lucide-react';
import { NeuralProfile } from '../types';
import { createChatSession } from '../services/geminiService';

interface Message {
  role: 'user' | 'model';
  text: string;
}

interface NeuralChatProps {
  profile: NeuralProfile | null;
}

export const NeuralChat: React.FC<NeuralChatProps> = ({ profile }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: "Systems online. I am Dr. Neural. How can I assist with your cognitive workflow today?" }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const chatRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      const chat = chatRef.current || createChatSession(profile);
      chatRef.current = chat;
      
      const response = await chat.sendMessage({ message: userMessage });
      setMessages(prev => [...prev, { role: 'model', text: response.text || "I apologize, my neural links faltered. Could you repeat that?" }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'model', text: "Connection interrupted. My behavioral circuits are currently re-calibrating." }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={handleToggle}
        className="fixed bottom-6 right-6 w-16 h-16 bg-white text-slate-900 rounded-2xl shadow-[0_20px_40px_rgba(255,255,255,0.2)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-[60] group"
      >
        <MessageSquare className="w-7 h-7 group-hover:rotate-12 transition-transform" />
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-slate-950 animate-pulse" />
      </button>
    );
  }

  return (
    <div 
      className={`fixed bottom-6 right-6 w-[400px] max-w-[calc(100vw-3rem)] bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.6)] flex flex-col transition-all z-[60] overflow-hidden ${
        isMinimized ? 'h-20' : 'h-[600px] max-h-[calc(100vh-6rem)]'
      } animate-in slide-in-from-bottom-8 fade-in duration-500`}
    >
      {/* Header */}
      <div className="bg-slate-800/50 p-6 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="bg-blue-500/20 p-2 rounded-xl border border-blue-500/30">
            <Bot className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white tracking-tight leading-none">Dr. Neural</h3>
            <span className="text-[9px] uppercase tracking-widest text-emerald-400 font-bold mt-1 inline-block">Cognitive Guide</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsMinimized(!isMinimized)} className="p-2 text-slate-500 hover:text-white transition-colors">
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          <button onClick={handleToggle} className="p-2 text-slate-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div 
            ref={scrollRef}
            className="flex-grow overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-slate-700"
          >
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'bg-slate-800 text-slate-200 border border-white/5'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-800 p-4 rounded-2xl border border-white/5 flex items-center gap-3">
                  <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Processing Modality...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="p-6 border-t border-white/5 bg-slate-900/50">
            <div className="relative group">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Dr. Neural about your flow..."
                className="w-full bg-slate-800/80 border border-white/5 rounded-2xl py-4 pl-5 pr-14 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-600 font-medium"
              />
              <button 
                type="submit"
                disabled={isLoading || !input.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-white text-slate-900 rounded-xl hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100 transition-all shadow-xl"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
};
