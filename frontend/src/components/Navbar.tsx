import { motion } from 'framer-motion';
import { Cpu, BookOpen, Download, Layers, Activity } from 'lucide-react';

interface NavbarProps {
  onOpenRAG: () => void;
  onExport: () => void;
  hasResults: boolean;
}

export default function Navbar({ onOpenRAG, onExport, hasResults }: NavbarProps) {
  return (
    <motion.header
      initial={{ y: -64, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className="h-14 flex items-center justify-between px-5 glass border-b border-white/[0.06] z-50 relative flex-shrink-0"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="relative w-8 h-8 flex items-center justify-center">
          <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 opacity-20 blur-sm" />
          <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg">
            <span className="text-sm leading-none">🛸</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm tracking-tight">
            <span className="text-white">Drone</span><span className="text-gradient-emerald">Route AI</span>
          </span>
          <span className="text-[9px] font-bold bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 tracking-widest">
            ENTERPRISE
          </span>
        </div>
      </div>

      {/* Center — System Status */}
      <div className="hidden md:flex items-center gap-4 text-[11px]">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass-card">
          <div className="status-dot-live" />
          <span className="text-emerald-400 font-semibold tracking-wide">SYSTEMS ONLINE</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-500">
          <Cpu className="w-3.5 h-3.5 text-slate-600" />
          <span>GA: 100 pop · 100 gen · A* · Dijkstra</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-500">
          <Activity className="w-3.5 h-3.5 text-slate-600" />
          <span>FastAPI v0.139 · SQLite</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={onOpenRAG}
          id="rag-assistant-btn"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500/20 hover:border-violet-500/40 transition-all text-[11px] font-medium"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">RAG Assistant</span>
        </button>

        {hasResults && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={onExport}
            id="export-report-btn"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-500/40 transition-all text-[11px] font-medium"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </motion.button>
        )}

        <div className="w-px h-5 bg-white/10 mx-1" />

        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg glass-card text-[10px] text-slate-500">
          <Layers className="w-3 h-3" />
          <span>v1.0.0</span>
        </div>
      </div>
    </motion.header>
  );
}
