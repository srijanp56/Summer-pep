import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, BookOpen, Send, Loader2 } from 'lucide-react';
import { Citation } from '../types';
import { queryRAG } from '../services/api';

interface RAGAssistantProps {
  onClose: () => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
}

const QUICK_PROMPTS = [
  'What is the max altitude for drone operations?',
  'When should I suspend a flight due to weather?',
  'What is the battery reserve requirement?',
  'What are red zone no-fly restrictions?',
  'What payload limits apply to cargo drones?',
];

export default function RAGAssistant({ onClose }: RAGAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '👋 Hello! I\'m the DroneRoute AI Regulatory & Operations Assistant.\n\nI can answer questions about FAA Part 107, DGCA Drone Rules, battery safety, weather flight limits, and payload constraints.\n\nWhat would you like to know?',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (query: string) => {
    if (!query.trim() || isLoading) return;
    const userMsg: Message = { role: 'user', content: query };
    setMessages((prev: Message[]) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    try {
      const res = await queryRAG(query);
      setMessages((prev: Message[]) => [...prev, { role: 'assistant', content: res.answer, citations: res.citations }]);
    } catch {
      setMessages((prev: Message[]) => [...prev, { role: 'assistant', content: '⚠️ Unable to reach the RAG knowledge base. Ensure the backend is running at http://localhost:8000' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="glass-panel rounded-2xl w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl border border-violet-500/20"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">RAG Regulatory Assistant</h2>
              <p className="text-[10px] text-slate-400">FAA Part 107 · DGCA · Avionics Manual · Weather Protocols</p>
            </div>
          </div>
          <button onClick={onClose} id="close-rag-btn" className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg: Message, idx: number) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-sm ${
                msg.role === 'user'
                  ? 'bg-gradient-to-br from-cyan-500 to-emerald-500'
                  : 'bg-gradient-to-br from-violet-500 to-purple-600'
              }`}>
                {msg.role === 'user' ? '👤' : '🤖'}
              </div>
              <div className={`max-w-[85%] space-y-2 ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                <div className={`rounded-xl px-4 py-3 text-xs leading-relaxed whitespace-pre-line ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 border border-cyan-500/20 text-slate-200'
                    : 'bg-white/5 border border-white/10 text-slate-300'
                }`}>
                  {msg.content}
                </div>
                {msg.citations && msg.citations.length > 0 && (
                  <div className="space-y-1 w-full">
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider">Sources</p>
                    {msg.citations.map((c: Citation, ci: number) => (
                      <div key={ci} className="bg-violet-500/10 border border-violet-500/20 rounded-lg px-3 py-2 text-[10px]">
                        <p className="text-violet-300 font-medium">{c.title}</p>
                        <p className="text-slate-500">{c.source} · {c.section}</p>
                        <p className="text-slate-500">Confidence: {(c.confidence * 100).toFixed(0)}%</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}

          {isLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 items-start">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-sm flex-shrink-0">🤖</div>
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts */}
        <div className="px-4 pb-2 flex gap-2 flex-wrap">
          {QUICK_PROMPTS.map(p => (
            <button
              key={p}
              onClick={() => handleSend(p)}
              className="text-[10px] bg-white/5 hover:bg-violet-500/15 border border-white/10 hover:border-violet-500/30 text-slate-400 hover:text-violet-300 px-2.5 py-1 rounded-lg transition-all"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="px-4 pb-4 flex gap-3">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend(input)}
            placeholder="Ask about regulations, weather limits, battery protocols..."
            id="rag-input"
            className="flex-1 bg-white/5 border border-white/10 text-white text-xs rounded-xl px-4 py-3 focus:outline-none focus:border-violet-500/50 placeholder-slate-600 transition-all"
          />
          <button
            onClick={() => handleSend(input)}
            disabled={!input.trim() || isLoading}
            id="rag-send-btn"
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-all"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
