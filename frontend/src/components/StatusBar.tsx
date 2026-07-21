import { OptimizationResponse } from '../types';

interface StatusBarProps {
  isLoading: boolean;
  result: OptimizationResponse | null;
}

export default function StatusBar({ isLoading, result }: StatusBarProps) {
  return (
    <div className="h-7 glass-panel border-t border-white/5 flex items-center px-4 gap-6 text-[10px] text-slate-500 flex-shrink-0">
      <div className="flex items-center gap-1.5">
        <div className={`w-1.5 h-1.5 rounded-full ${isLoading ? 'bg-amber-400 animate-pulse' : result ? 'bg-emerald-400' : 'bg-slate-600'}`} />
        <span>{isLoading ? 'OPTIMIZATION RUNNING' : result ? 'MISSION COMPLETE' : 'READY'}</span>
      </div>

      {result && (
        <>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-600">|</span>
            <span>GA: {result.generation_history.length} gen</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-600">|</span>
            <span>Winner: {result.winner_algorithm}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-600">|</span>
            <span>🔋 {result.ga_route.battery_consumed_pct.toFixed(1)}% used</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-600">|</span>
            <span>📍 {result.ga_route.waypoints.length} waypoints</span>
          </div>
        </>
      )}

      <div className="ml-auto flex items-center gap-4">
        <span>Backend: <span className="text-emerald-400">localhost:8000</span></span>
        <span>v1.0.0</span>
      </div>
    </div>
  );
}
