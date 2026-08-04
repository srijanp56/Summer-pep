import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, X, MapPin, Battery, Clock, Cpu, RefreshCw } from 'lucide-react';
import { MissionSummary } from '../types';
import { fetchMissions } from '../services/api';

interface MissionHistoryProps {
  onClose: () => void;
}

const ALGO_COLORS: Record<string, string> = {
  'Genetic Algorithm': '#10b981',
};

const ALGO_ICONS: Record<string, string> = {
  'Genetic Algorithm': '🧬',
};


function formatCoord(lat: number, lng: number): string {
  return `${lat.toFixed(3)}°, ${lng.toFixed(3)}°`;
}

function timeAgo(isoString: string): string {
  try {
    const diff = (Date.now() - new Date(isoString).getTime()) / 1000;
    if (diff < 60) return `${Math.round(diff)}s ago`;
    if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
    return `${Math.round(diff / 86400)}d ago`;
  } catch {
    return 'recently';
  }
}

export default function MissionHistory({ onClose }: MissionHistoryProps) {
  const [missions, setMissions] = useState<MissionSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMissions(50);
      setMissions(data.missions);
      setTotal(data.total);
    } catch {
      setError('Failed to load mission history. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 24 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 24 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="glass rounded-2xl w-full max-w-2xl mx-4 overflow-hidden flex flex-col"
        style={{
          maxHeight: '80vh',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)' }}>
            <History className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Mission History</h2>
            <p className="text-[10px] text-slate-500">{total} missions recorded</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={load}
              disabled={loading}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
              <p className="text-slate-500 text-xs">Loading missions...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <div className="text-3xl">📡</div>
              <p className="text-slate-400 text-sm">No missions found</p>
              <p className="text-slate-600 text-xs">{error}</p>
            </div>
          )}

          {!loading && !error && missions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <div className="text-4xl">🛸</div>
              <p className="text-slate-400 text-sm">No missions yet</p>
              <p className="text-slate-600 text-xs">Run your first optimization to see it here</p>
            </div>
          )}

          {!loading && missions.map((m, i) => {
            const algoColor = ALGO_COLORS[m.winner_algorithm] ?? '#64748b';
            const algoIcon = ALGO_ICONS[m.winner_algorithm] ?? '🏆';
            const isSelected = selectedId === m.id;

            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => setSelectedId(isSelected ? null : m.id)}
                className="glass-panel rounded-xl p-3.5 cursor-pointer transition-all hover:border-white/15"
                style={{
                  border: isSelected ? `1px solid ${algoColor}40` : '1px solid rgba(255,255,255,0.06)',
                  background: isSelected ? `${algoColor}08` : 'rgba(255,255,255,0.02)',
                }}
              >
                {/* Mission row */}
                <div className="flex items-center gap-3">
                  {/* Drone icon */}
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
                    style={{ background: `${algoColor}15`, border: `1px solid ${algoColor}30` }}>
                    🛸
                  </div>

                  {/* Route info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <MapPin className="w-3 h-3 text-slate-500 flex-shrink-0" />
                      <p className="text-[11px] text-slate-300 font-mono truncate">
                        {formatCoord(m.start_lat, m.start_lng)} → {formatCoord(m.dest_lat, m.dest_lng)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-slate-500">{m.drone_model}</span>
                      <span className="text-[10px] text-slate-600">•</span>
                      <span className="text-[10px] text-slate-500">{timeAgo(m.created_at)}</span>
                    </div>
                  </div>

                  {/* Winner badge */}
                  <div
                    className="flex items-center gap-1 px-2 py-1 rounded-lg flex-shrink-0"
                    style={{ background: `${algoColor}18`, border: `1px solid ${algoColor}30` }}
                  >
                    <span className="text-[11px]">{algoIcon}</span>
                    <span className="text-[9px] font-bold" style={{ color: algoColor }}>
                      {m.winner_algorithm.replace('Genetic Algorithm', 'GA')}
                    </span>
                  </div>
                </div>

                {/* Expanded stats */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 pt-3 grid grid-cols-3 gap-2"
                        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="flex flex-col items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                          <p className="text-[9px] text-slate-500">Distance</p>
                          <p className="text-[11px] font-mono font-bold text-cyan-400">
                            {m.ga_distance_km.toFixed(2)} km
                          </p>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <Battery className="w-3.5 h-3.5 text-amber-400" />
                          <p className="text-[9px] text-slate-500">Battery</p>
                          <p className="text-[11px] font-mono font-bold text-amber-400">
                            {m.ga_battery_used_pct.toFixed(1)}%
                          </p>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-violet-400" />
                          <p className="text-[9px] text-slate-500">Flight Time</p>
                          <p className="text-[11px] font-mono font-bold text-violet-400">
                            {m.ga_flight_time_min.toFixed(1)} min
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <Cpu className="w-3 h-3 text-slate-600" />
                        <p className="text-[9px] text-slate-600">
                          Payload: {m.payload_weight_kg} kg &nbsp;·&nbsp; Winner: {m.winner_algorithm}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* Footer */}
        {total > 0 && (
          <div
            className="px-5 py-3 flex-shrink-0 flex items-center justify-between"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
          >
            <p className="text-[10px] text-slate-600">Click a mission to expand details</p>
            <p className="text-[10px] text-slate-600">Showing {missions.length} of {total}</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
