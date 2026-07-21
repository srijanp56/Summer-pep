import { motion } from 'framer-motion';
import { OptimizationResponse } from '../types';
import { Navigation, Clock, Zap, Shield, Wind, DollarSign, CheckCircle, Cpu, Leaf } from 'lucide-react';

interface TelemetryDashboardProps {
  result: OptimizationResponse | null;
  isLoading: boolean;
}

function StatCard({ label, value, sub, icon, color, delay = 0 }: {
  label: string; value: string; sub?: string;
  icon: React.ReactNode; color: string; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      className="glass-card rounded-xl p-3.5 flex flex-col gap-2"
    >
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}18` }}>
          <div style={{ color }} className="[&>svg]:w-3.5 [&>svg]:h-3.5">{icon}</div>
        </div>
      </div>
      <div>
        <span className="text-[22px] font-bold leading-none text-white tracking-tight">{value}</span>
      </div>
      {sub && <span className="text-[9px] text-slate-600 font-medium">{sub}</span>}
    </motion.div>
  );
}

function Skeleton() {
  return (
    <div className="glass-card rounded-xl p-3.5 animate-pulse space-y-2.5">
      <div className="flex justify-between">
        <div className="h-2.5 skeleton rounded w-16" />
        <div className="w-7 h-7 skeleton rounded-lg" />
      </div>
      <div className="h-6 skeleton rounded w-20" />
      <div className="h-2 skeleton rounded w-24" />
    </div>
  );
}

export default function TelemetryDashboard({ result, isLoading }: TelemetryDashboardProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          <span className="text-xs text-slate-400 font-medium">Running multi-objective optimization...</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="text-5xl mb-5"
        >🛸</motion.div>
        <p className="text-sm font-semibold text-slate-300 mb-1">No Mission Active</p>
        <p className="text-xs text-slate-600 mb-6">Set origin & destination on the map, then run optimization</p>

        <div className="w-full space-y-1.5">
          {[
            { icon: '🧬', label: 'Genetic Algorithm', desc: '100 pop · 100 gen' },
            { icon: '⭐', label: 'A* Search', desc: 'Heuristic pathfinding' },
            { icon: '🔵', label: 'Dijkstra', desc: 'Shortest path' },
            { icon: '🤖', label: 'AI Rationale', desc: 'Route explanation' },
          ].map(f => (
            <div key={f.label} className="glass-card rounded-lg px-3 py-2 flex items-center gap-3">
              <span className="text-base">{f.icon}</span>
              <div className="text-left">
                <p className="text-[11px] font-medium text-slate-300">{f.label}</p>
                <p className="text-[9px] text-slate-600">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const r = result.ga_route;
  const batteryColor = r.battery_consumed_pct < 40 ? '#10b981' : r.battery_consumed_pct < 70 ? '#f59e0b' : '#f43f5e';
  const riskColor = r.safety_risk_score === 0 ? '#10b981' : r.safety_risk_score < 0.3 ? '#f59e0b' : '#f43f5e';

  return (
    <div className="space-y-3">
      {/* Winner Banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-xl p-3.5 flex items-center gap-3"
        style={{
          background: 'rgba(16,185,129,0.07)',
          border: '1px solid rgba(16,185,129,0.18)',
        }}
      >
        <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Optimal Route Found</p>
          <p className="text-xs text-slate-300 font-medium truncate">{result.winner_algorithm}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xl font-bold text-white">{(r.success_probability * 100).toFixed(0)}%</p>
          <p className="text-[9px] text-slate-500">Success Rate</p>
        </div>
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="Distance" value={`${r.total_distance_km.toFixed(2)}`} sub="kilometers" icon={<Navigation />} color="#06b6d4" delay={0.04} />
        <StatCard label="Flight Time" value={`${r.estimated_flight_time_min.toFixed(1)}`} sub="minutes" icon={<Clock />} color="#10b981" delay={0.08} />
        <StatCard label="Battery Used" value={`${r.battery_consumed_pct.toFixed(1)}%`} sub={`${r.energy_wh.toFixed(1)} Wh consumed`} icon={<Zap />} color={batteryColor} delay={0.12} />
        <StatCard label="Safety Risk" value={r.safety_risk_score === 0 ? 'CLEAR' : r.safety_risk_score.toFixed(3)} sub="No-fly penalty score" icon={<Shield />} color={riskColor} delay={0.16} />
        <StatCard label="Weather Risk" value={`${(r.weather_risk_score * 100).toFixed(0)}%`} sub="wind · rain · visibility" icon={<Wind />} color="#8b5cf6" delay={0.20} />
        <StatCard label="Total Cost" value={`$${r.total_cost_usd.toFixed(2)}`} sub="Delivery estimate" icon={<DollarSign />} color="#f59e0b" delay={0.24} />
        <StatCard label="Waypoints" value={`${r.waypoints.length}`} sub="Route nodes" icon={<Cpu />} color="#06b6d4" delay={0.28} />
        <StatCard label="CO₂ Saved" value={`${r.carbon_saved_kg.toFixed(2)}`} sub="kg vs road delivery" icon={<Leaf />} color="#10b981" delay={0.32} />
      </div>

      {/* Battery bar visual */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.36 }}
        className="glass-card rounded-xl p-4"
      >
        <div className="flex justify-between items-center mb-2">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Battery Profile</span>
          <span className="text-[10px] font-mono font-bold" style={{ color: batteryColor }}>{r.battery_consumed_pct.toFixed(1)}% consumed</span>
        </div>
        <div className="h-3 w-full bg-white/[0.06] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${r.battery_consumed_pct}%` }}
            transition={{ duration: 1.2, delay: 0.4, ease: [0.4, 0, 0.2, 1] }}
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${batteryColor}, ${batteryColor}88)`, boxShadow: `0 0 10px ${batteryColor}44` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[9px] text-slate-600">0%</span>
          <span className="text-[9px] text-slate-600">100%</span>
        </div>
      </motion.div>

      {/* Weather Summary */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.42 }}
        className="glass-card rounded-xl p-4"
      >
        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-3">Weather Telemetry</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Wind', value: `${result.weather.wind_speed_m_s} m/s`, sub: `${result.weather.wind_direction_deg}° bearing` },
            { label: 'Rain', value: `${result.weather.rain_intensity_mm_h} mm/h`, sub: result.weather.rain_intensity_mm_h === 0 ? 'Clear' : 'Active precipitation' },
            { label: 'Temperature', value: `${result.weather.temperature_c}°C`, sub: 'Ambient' },
            { label: 'Visibility', value: `${result.weather.visibility_km} km`, sub: result.weather.visibility_km >= 10 ? 'Excellent' : 'Reduced' },
          ].map(w => (
            <div key={w.label} className="rounded-lg px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="text-[9px] text-slate-600 font-medium">{w.label}</p>
              <p className="text-xs text-slate-200 font-mono font-semibold mt-0.5">{w.value}</p>
              <p className="text-[9px] text-slate-600 mt-0.5">{w.sub}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
