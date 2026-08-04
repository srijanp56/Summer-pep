import { motion } from 'framer-motion';
import { OptimizationResponse } from '../types';

interface StatusBarProps {
  isLoading: boolean;
  result: OptimizationResponse | null;
  batteryError?: boolean;
}

export default function StatusBar({ isLoading, result, batteryError }: StatusBarProps) {
  const statusColor = batteryError ? '#f43f5e' : isLoading ? '#f59e0b' : result ? '#10b981' : '#475569';
  const statusLabel = batteryError ? 'BATTERY INSUFFICIENT' : isLoading ? 'OPTIMIZATION RUNNING' : result ? 'MISSION COMPLETE' : 'READY';

  return (
    <div
      className="h-7 flex items-center px-4 gap-6 text-[10px] text-slate-500 flex-shrink-0"
      style={{
        background: 'rgba(3,7,18,0.92)',
        borderTop: `1px solid ${batteryError ? 'rgba(244,63,94,0.2)' : 'rgba(255,255,255,0.05)'}`,
        backdropFilter: 'blur(16px)',
      }}
    >
      <div className="flex items-center gap-1.5">
        <motion.div
          className="w-1.5 h-1.5 rounded-full"
          animate={isLoading || batteryError ? { scale: [1, 1.4, 1], opacity: [1, 0.5, 1] } : {}}
          transition={{ duration: 1, repeat: Infinity }}
          style={{ background: statusColor, boxShadow: `0 0 6px ${statusColor}88` }}
        />
        <span style={{ color: batteryError ? '#f43f5e' : isLoading ? '#f59e0b' : result ? '#10b981' : undefined }}>
          {statusLabel}
        </span>
      </div>

      {result && !batteryError && (
        <>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-700">|</span>
            <span>GA: {result.generation_history.length} gen</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-700">|</span>
            <span>Winner: <span className="text-emerald-400">{result.winner_algorithm}</span></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-700">|</span>
            <span>🔋 <span style={{ color: result.ga_route.battery_consumed_pct > 80 ? '#f43f5e' : result.ga_route.battery_consumed_pct > 50 ? '#f59e0b' : '#10b981' }}>
              {result.ga_route.battery_consumed_pct.toFixed(1)}%
            </span> used</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-700">|</span>
            <span>📍 {result.ga_route.waypoints.length} waypoints</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-700">|</span>
            <span>📏 {result.ga_route.total_distance_km.toFixed(2)} km</span>
          </div>
        </>
      )}

      {batteryError && (
        <div className="flex items-center gap-1.5">
          <span className="text-slate-700">|</span>
          <span className="text-rose-400 font-medium">Increase battery or reduce payload/route to proceed</span>
        </div>
      )}

      <div className="ml-auto flex items-center gap-4">
        <span>Backend: <span className="text-emerald-400">localhost:8000</span></span>
        <span>v1.0.0</span>
      </div>
    </div>
  );
}
