import { motion } from 'framer-motion';
import { OptimizationResponse } from '../types';
import { Trophy, Clock, Zap, Shield, Timer, Navigation } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts';

interface AlgorithmComparisonProps {
  result: OptimizationResponse | null;
}

interface MetricRowProps {
  label: string;
  ga: string | number;
  astar: string | number;
  dijkstra: string | number;
  winnerIdx: number;
  icon: React.ReactNode;
}

function MetricRow({ label, ga, astar, dijkstra, winnerIdx, icon }: MetricRowProps) {
  const vals = [ga, astar, dijkstra];
  return (
    <div className="grid grid-cols-4 gap-2 items-center py-2 border-b border-white/5">
      <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
        {icon}
        <span>{label}</span>
      </div>
      {vals.map((v, i) => (
        <div key={i} className={`text-xs text-center font-mono font-medium transition-all ${i === winnerIdx ? 'text-emerald-400' : 'text-slate-400'}`}>
          {i === winnerIdx && <span className="mr-0.5">✓</span>}
          {v}
        </div>
      ))}
    </div>
  );
}

function getBestIdx(vals: number[], lowerIsBetter = true): number {
  let bestIdx = 0;
  for (let i = 1; i < vals.length; i++) {
    if (lowerIsBetter ? vals[i] < vals[bestIdx] : vals[i] > vals[bestIdx]) bestIdx = i;
  }
  return bestIdx;
}

export default function AlgorithmComparison({ result }: AlgorithmComparisonProps) {
  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
        <div className="text-4xl">⚖️</div>
        <p className="text-slate-400 text-sm">Algorithm Comparison</p>
        <p className="text-slate-600 text-xs">Run optimization to compare algorithms</p>
      </div>
    );
  }

  const { ga_route, astar_route, dijkstra_route, winner_algorithm } = result;

  const radarData = [
    { metric: 'Distance', GA: 100 - (ga_route.total_distance_km / Math.max(ga_route.total_distance_km, astar_route.total_distance_km, dijkstra_route.total_distance_km)) * 100, 'A*': 100 - (astar_route.total_distance_km / Math.max(ga_route.total_distance_km, astar_route.total_distance_km, dijkstra_route.total_distance_km)) * 100, Dijkstra: 100 - (dijkstra_route.total_distance_km / Math.max(ga_route.total_distance_km, astar_route.total_distance_km, dijkstra_route.total_distance_km)) * 100 },
    { metric: 'Battery', GA: 100 - ga_route.battery_consumed_pct, 'A*': 100 - astar_route.battery_consumed_pct, Dijkstra: 100 - dijkstra_route.battery_consumed_pct },
    { metric: 'Safety', GA: (1 - ga_route.safety_risk_score) * 100, 'A*': (1 - astar_route.safety_risk_score) * 100, Dijkstra: (1 - dijkstra_route.safety_risk_score) * 100 },
    { metric: 'Weather', GA: (1 - ga_route.weather_risk_score) * 100, 'A*': (1 - astar_route.weather_risk_score) * 100, Dijkstra: (1 - dijkstra_route.weather_risk_score) * 100 },
    { metric: 'Success', GA: ga_route.success_probability * 100, 'A*': astar_route.success_probability * 100, Dijkstra: dijkstra_route.success_probability * 100 },
    { metric: 'Cost', GA: 100 - ga_route.total_cost_usd * 5, 'A*': 100 - astar_route.total_cost_usd * 5, Dijkstra: 100 - dijkstra_route.total_cost_usd * 5 },
  ];

  return (
    <div className="space-y-4">
      {/* Winner Banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-panel rounded-xl p-3 border border-emerald-500/20 bg-emerald-500/5 flex items-center gap-3"
      >
        <Trophy className="w-5 h-5 text-emerald-400 flex-shrink-0" />
        <div>
          <p className="text-xs font-bold text-white">Winner: {winner_algorithm}</p>
          <p className="text-[10px] text-slate-400">Optimal multi-objective fitness score</p>
        </div>
      </motion.div>

      {/* Radar Chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel rounded-xl p-4"
      >
        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-2">Multi-Objective Score Radar</p>
        <ResponsiveContainer width="100%" height={200}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="rgba(255,255,255,0.08)" />
            <PolarAngleAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 9 }} />
            <Radar name="GA" dataKey="GA" stroke="#10b981" fill="#10b981" fillOpacity={0.15} />
            <Radar name="A*" dataKey="A*" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.10} />
            <Radar name="Dijkstra" dataKey="Dijkstra" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.10} />
          </RadarChart>
        </ResponsiveContainer>
        <div className="flex justify-center gap-4 mt-2">
          {[['GA', '#10b981'], ['A*', '#06b6d4'], ['Dijkstra', '#8b5cf6']].map(([name, color]) => (
            <div key={name} className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <div className="w-3 h-1 rounded-full" style={{ background: color as string }} />
              {name}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Comparison Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-panel rounded-xl p-4"
      >
        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-3">Detailed Metrics</p>

        {/* Headers */}
        <div className="grid grid-cols-4 gap-2 mb-1">
          <span className="text-[9px] text-slate-500">METRIC</span>
          {['GA 🧬', 'A* ⭐', 'Djk 🔵'].map(h => (
            <span key={h} className="text-[9px] text-slate-500 text-center font-medium">{h}</span>
          ))}
        </div>

        <MetricRow
          label="Distance"
          ga={`${ga_route.total_distance_km.toFixed(2)}km`}
          astar={`${astar_route.total_distance_km.toFixed(2)}km`}
          dijkstra={`${dijkstra_route.total_distance_km.toFixed(2)}km`}
          winnerIdx={getBestIdx([ga_route.total_distance_km, astar_route.total_distance_km, dijkstra_route.total_distance_km])}
          icon={<Navigation className="w-3 h-3" />}
        />
        <MetricRow
          label="Time"
          ga={`${ga_route.estimated_flight_time_min.toFixed(1)}m`}
          astar={`${astar_route.estimated_flight_time_min.toFixed(1)}m`}
          dijkstra={`${dijkstra_route.estimated_flight_time_min.toFixed(1)}m`}
          winnerIdx={getBestIdx([ga_route.estimated_flight_time_min, astar_route.estimated_flight_time_min, dijkstra_route.estimated_flight_time_min])}
          icon={<Clock className="w-3 h-3" />}
        />
        <MetricRow
          label="Battery"
          ga={`${ga_route.battery_consumed_pct.toFixed(1)}%`}
          astar={`${astar_route.battery_consumed_pct.toFixed(1)}%`}
          dijkstra={`${dijkstra_route.battery_consumed_pct.toFixed(1)}%`}
          winnerIdx={getBestIdx([ga_route.battery_consumed_pct, astar_route.battery_consumed_pct, dijkstra_route.battery_consumed_pct])}
          icon={<Zap className="w-3 h-3" />}
        />
        <MetricRow
          label="Risk"
          ga={ga_route.safety_risk_score.toFixed(2)}
          astar={astar_route.safety_risk_score.toFixed(2)}
          dijkstra={dijkstra_route.safety_risk_score.toFixed(2)}
          winnerIdx={getBestIdx([ga_route.safety_risk_score, astar_route.safety_risk_score, dijkstra_route.safety_risk_score])}
          icon={<Shield className="w-3 h-3" />}
        />
        <MetricRow
          label="Exec Time"
          ga={`${ga_route.execution_time_ms.toFixed(0)}ms`}
          astar={`${astar_route.execution_time_ms.toFixed(0)}ms`}
          dijkstra={`${dijkstra_route.execution_time_ms.toFixed(0)}ms`}
          winnerIdx={getBestIdx([ga_route.execution_time_ms, astar_route.execution_time_ms, dijkstra_route.execution_time_ms])}
          icon={<Timer className="w-3 h-3" />}
        />
      </motion.div>
    </div>
  );
}
