import { useState } from 'react';
import { motion } from 'framer-motion';
import { Cpu, Download, Layers, Activity, Wifi, Sun, Moon, Volume2, VolumeX } from 'lucide-react';
import { audioTelemetry } from '../services/audioTelemetry';

interface NavbarProps {
  onExport: () => void;
  hasResults: boolean;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export default function Navbar({ onExport, hasResults, theme, onToggleTheme }: NavbarProps) {
  const [audioMuted, setAudioMuted] = useState(audioTelemetry.getMuted());

  const toggleAudio = () => {
    const nextMuted = audioTelemetry.toggleMute();
    setAudioMuted(nextMuted);
  };

  return (
    <motion.header
      initial={{ y: -64, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className="h-14 flex items-center justify-between px-5 glass border-b z-50 relative flex-shrink-0"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="relative w-8 h-8">
          {/* Glow halo */}
          <div className="absolute inset-0 rounded-xl blur-md"
            style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.6), rgba(6,182,212,0.4))' }} />
          <div className="relative w-8 h-8 rounded-xl flex items-center justify-center shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #0d9467 0%, #059669 45%, #0891b2 100%)',
              border: '1px solid rgba(16,185,129,0.4)',
              boxShadow: '0 4px 16px rgba(16,185,129,0.3)',
            }}>
            <img src="/drone.png" alt="Drone" className="w-6 h-6 object-contain" style={{ filter: 'drop-shadow(0 0 4px rgba(6,182,212,0.6))' }} />
          </div>
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-tight">
              <span className="text-white">Drone</span><span className="text-gradient-emerald">Route</span><span className="text-slate-400"> AI</span>
            </span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full tracking-widest"
              style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.22)' }}>
              ENTERPRISE
            </span>
          </div>
          <span className="text-[9px] text-slate-700 tracking-wide font-medium hidden md:block">
            Autonomous Delivery Platform
          </span>
        </div>
      </div>

      {/* Center — System Status */}
      <div className="hidden md:flex items-center gap-3 text-[11px]">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.35)', boxShadow: '0 0 16px rgba(16,185,129,0.2)' }}>
          <div className="status-dot-live" />
          <span className="text-emerald-400 font-semibold tracking-wide">SYSTEMS ONLINE</span>
        </div>

        <div className="h-4 w-px" style={{ background: 'rgba(255,255,255,0.08)' }} />

        <div className="flex items-center gap-1.5 text-slate-600">
          <Cpu className="w-3 h-3" />
          <span>Genetic Algorithm Engine</span>
        </div>

        <div className="h-4 w-px" style={{ background: 'rgba(255,255,255,0.08)' }} />

        <div className="flex items-center gap-1.5 text-slate-600">
          <Activity className="w-3 h-3" />
          <span>FastAPI · SQLite</span>
        </div>

        <div className="h-4 w-px" style={{ background: 'rgba(255,255,255,0.08)' }} />

        <div className="flex items-center gap-1.5 text-slate-600">
          <Wifi className="w-3 h-3 text-cyan-700" />
          <span>100 pop · 100 gen</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {hasResults && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onExport}
            id="export-report-btn"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all"
            style={{
              background: 'rgba(6,182,212,0.08)',
              border: '1px solid rgba(6,182,212,0.20)',
              color: '#67e8f9',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(6,182,212,0.16)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(6,182,212,0.35)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(6,182,212,0.08)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(6,182,212,0.20)';
            }}
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </motion.button>
        )}

        <div className="w-px h-5 mx-1" style={{ background: 'var(--border)' }} />

        {/* Audio Telemetry Toggle */}
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={toggleAudio}
          id="audio-toggle-btn"
          title={audioMuted ? 'Unmute Voice Telemetry' : 'Mute Voice Telemetry'}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all relative overflow-hidden"
          style={{
            background: audioMuted ? 'rgba(244,63,94,0.08)' : 'rgba(16,185,129,0.08)',
            border: audioMuted ? '1px solid rgba(244,63,94,0.22)' : '1px solid rgba(16,185,129,0.22)',
          }}
        >
          {audioMuted
            ? <VolumeX className="w-3.5 h-3.5 text-rose-400" />
            : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
          }
        </motion.button>

        {/* Theme Toggle */}
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={onToggleTheme}
          id="theme-toggle-btn"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all relative overflow-hidden"
          style={{
            background: theme === 'dark' ? 'rgba(251,191,36,0.08)' : 'rgba(99,102,241,0.10)',
            border: theme === 'dark' ? '1px solid rgba(251,191,36,0.22)' : '1px solid rgba(99,102,241,0.22)',
          }}
        >
          <motion.div
            key={theme}
            initial={{ opacity: 0, rotate: -30, scale: 0.7 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 30, scale: 0.7 }}
            transition={{ duration: 0.25 }}
          >
            {theme === 'dark'
              ? <Sun className="w-3.5 h-3.5" style={{ color: '#fbbf24' }} />
              : <Moon className="w-3.5 h-3.5" style={{ color: '#818cf8' }} />
            }
          </motion.div>
        </motion.button>


        <div className="w-px h-5 mx-1" style={{ background: 'var(--border)' }} />

        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px]"
          style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
          <Layers className="w-3 h-3" />
          <span>v1.0.0</span>
        </div>
      </div>
    </motion.header>
  );
}
