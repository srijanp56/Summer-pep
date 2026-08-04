import { motion } from 'framer-motion';
import { OptimizationResponse } from '../types';
import { Navigation, Clock, Zap, Shield, Wind, DollarSign, CheckCircle, Cpu, Leaf, AlertTriangle, Bike } from 'lucide-react';

interface TelemetryDashboardProps {
  result: OptimizationResponse | null;
  isLoading: boolean;
  selectedRouteType?: 'optimal' | 'balanced' | 'direct';
}


function StatCard({ label, value, sub, icon, color, delay = 0, alert = false }: {
  label: string; value: string; sub?: string;
  icon: React.ReactNode; color: string; delay?: number; alert?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      className="rounded-xl p-3.5 flex flex-col gap-2 relative overflow-hidden"
      style={{
        background: alert
          ? 'linear-gradient(135deg, rgba(244,63,94,0.12) 0%, rgba(15,23,42,0.85) 100%)'
          : `linear-gradient(135deg, ${color}12 0%, rgba(15,23,42,0.75) 100%)`,
        border: `1px solid ${alert ? 'rgba(244,63,94,0.35)' : `${color}25`}`,
        borderTop: `1px solid ${alert ? 'rgba(244,63,94,0.5)' : `${color}40`}`,
        backdropFilter: 'blur(20px)',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: alert ? '0 8px 24px rgba(244,63,94,0.2)' : `0 8px 24px rgba(0,0,0,0.4), 0 0 16px ${color}10`,
      }}
    >
      {alert && (
        <div className="absolute inset-0 rounded-xl animate-pulse"
          style={{ background: 'radial-gradient(ellipse at top right, rgba(244,63,94,0.06) 0%, transparent 70%)' }}
        />
      )}
      <div className="flex items-center justify-between relative">
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}18` }}>
          <div style={{ color }} className="[&>svg]:w-3.5 [&>svg]:h-3.5">{icon}</div>
        </div>
      </div>
      <div className="relative">
        <span className="text-[22px] font-bold leading-none text-white tracking-tight">{value}</span>
      </div>
      {sub && <span className="text-[9px] text-slate-600 font-medium relative">{sub}</span>}
    </motion.div>
  );
}

function Skeleton() {
  return (
    <div className="rounded-xl p-3.5 animate-pulse space-y-2.5"
      style={{ background: 'rgba(15,23,42,0.45)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex justify-between">
        <div className="h-2.5 rounded w-16" style={{ background: 'rgba(255,255,255,0.08)' }} />
        <div className="w-7 h-7 rounded-lg" style={{ background: 'rgba(255,255,255,0.08)' }} />
      </div>
      <div className="h-6 rounded w-20" style={{ background: 'rgba(255,255,255,0.08)' }} />
      <div className="h-2 rounded w-24" style={{ background: 'rgba(255,255,255,0.05)' }} />
    </div>
  );
}

export default function TelemetryDashboard({ result, isLoading, selectedRouteType = 'optimal' }: TelemetryDashboardProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="relative">
            <div className="w-5 h-5 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
            <div className="absolute inset-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.08)' }} />
          </div>
          <div>
            <span className="text-xs text-slate-300 font-semibold">Running multi-objective optimization...</span>
            <p className="text-[9px] text-slate-600 mt-0.5">Genetic Algorithm evolving optimal route...</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="text-5xl mb-5"
        >🛸</motion.div>
        <p className="text-sm font-semibold text-slate-300 mb-1">No Mission Active</p>
        <p className="text-xs text-slate-600 mb-6">Set origin & destination on the map, then run optimization</p>

        <div className="w-full space-y-1.5">
          {[
            { icon: '🧬', label: 'Genetic Algorithm', desc: '100 pop · 100 gen · Multi-objective fitness', color: '#10b981' },
            { icon: '🔬', label: 'GA Decision Engine', desc: 'Fitness evolution · Convergence analysis · Route insights', color: '#06b6d4' },
            { icon: '🛡️', label: 'Safety Optimizer', desc: 'No-fly zone avoidance · Airspace compliance', color: '#8b5cf6' },
            { icon: '🤖', label: 'AI Rationale', desc: 'Natural language route explanation', color: '#f59e0b' },
          ].map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="rounded-xl px-3 py-3 flex items-center gap-3 transition-all"
              style={{
                background: `linear-gradient(135deg, ${f.color}18 0%, rgba(15,23,42,0.75) 100%)`,
                border: `1px solid ${f.color}35`,
                borderLeft: `4px solid ${f.color}`,
                boxShadow: `0 4px 20px ${f.color}15`,
              }}
            >
              <span className="text-base flex-shrink-0">{f.icon}</span>
              <div className="text-left min-w-0 flex-1">
                <p className="text-[11px] font-bold text-white tracking-wide">{f.label}</p>
                <p className="text-[9px] mt-0.5 font-medium truncate" style={{ color: `${f.color}cc` }}>{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  const r = selectedRouteType === 'balanced'
    ? (result.balanced_route || result.ga_route)
    : selectedRouteType === 'direct'
    ? (result.direct_route || result.ga_route)
    : result.ga_route;

  const routeLabel = selectedRouteType === 'balanced'
    ? '🟡 Balanced Alternative'
    : selectedRouteType === 'direct'
    ? '🔴 Direct / High-Risk Route'
    : '🟢 Optimal GA Route';

  const batteryConsumed = r.battery_consumed_pct;
  const batteryAvailable = result.battery_available_pct ?? 100;
  const batteryRemaining = batteryAvailable - batteryConsumed;
  const batteryExceeded = batteryConsumed > batteryAvailable;

  const batteryColor = batteryConsumed < 40 ? '#10b981' : batteryConsumed < 70 ? '#f59e0b' : '#f43f5e';
  const riskColor = r.safety_risk_score === 0 ? '#10b981' : r.safety_risk_score < 0.3 ? '#f59e0b' : '#f43f5e';

  return (
    <div className="space-y-3">
      {/* Winner Banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-xl p-3.5 flex items-center gap-3 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(6,182,212,0.04) 100%)',
          border: '1px solid rgba(16,185,129,0.22)',
          boxShadow: '0 4px 24px rgba(16,185,129,0.08)',
        }}
      >
        <div className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at top left, rgba(16,185,129,0.06) 0%, transparent 70%)' }} />
        <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0 relative">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0 relative">
          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Active Mission Route</p>
          <p className="text-xs text-slate-300 font-semibold truncate">{routeLabel}</p>
        </div>
        <div className="text-right flex-shrink-0 relative">
          <p className="text-2xl font-bold text-white">{(r.success_probability * 100).toFixed(0)}%</p>
          <p className="text-[9px] text-slate-500">Success Rate</p>
        </div>
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="Distance" value={`${r.total_distance_km.toFixed(2)}`} sub="kilometers" icon={<Navigation />} color="#06b6d4" delay={0.04} />
        <StatCard label="Flight Time" value={`${r.estimated_flight_time_min.toFixed(1)}`} sub="minutes" icon={<Clock />} color="#10b981" delay={0.08} />
        <StatCard label="Battery Used" value={`${batteryConsumed.toFixed(1)}%`} sub={`${r.energy_wh.toFixed(1)} Wh consumed`} icon={<Zap />} color={batteryColor} delay={0.12} alert={batteryExceeded} />
        <StatCard label="Safety Risk" value={r.safety_risk_score === 0 ? 'CLEAR' : r.safety_risk_score.toFixed(3)} sub="No-fly penalty score" icon={<Shield />} color={riskColor} delay={0.16} />
        <StatCard label="Weather Risk" value={`${(r.weather_risk_score * 100).toFixed(0)}%`} sub="wind · rain · visibility" icon={<Wind />} color="#8b5cf6" delay={0.20} />
        <StatCard label="Total Cost" value={`₹${r.total_cost_inr.toFixed(2)}`} sub="Delivery estimate (₹50 base + ₹15/km)" icon={<DollarSign />} color="#f59e0b" delay={0.24} />
        <StatCard label="Waypoints" value={`${r.waypoints.length}`} sub="Route nodes" icon={<Cpu />} color="#06b6d4" delay={0.28} />
        <StatCard label="CO₂ Saved" value={`${r.carbon_saved_kg.toFixed(2)}`} sub="kg vs road delivery" icon={<Leaf />} color="#10b981" delay={0.32} />
      </div>

      {/* Battery Profile — real-life visualization */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.36 }}
        className="rounded-xl p-4"
        style={{
          background: batteryExceeded ? 'rgba(244,63,94,0.04)' : 'rgba(15,23,42,0.65)',
          border: `1px solid ${batteryExceeded ? 'rgba(244,63,94,0.25)' : 'rgba(255,255,255,0.07)'}`,
          borderTop: `1px solid ${batteryExceeded ? 'rgba(244,63,94,0.4)' : 'rgba(255,255,255,0.12)'}`,
        }}
      >
        <div className="flex justify-between items-center mb-3">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
            {batteryExceeded && <AlertTriangle className="w-3 h-3 text-rose-400" />}
            Battery Profile
          </span>
          <span className="text-[10px] font-mono font-bold" style={{ color: batteryColor }}>
            {batteryConsumed.toFixed(1)}% consumed
          </span>
        </div>

        {/* Available battery indicator */}
        <div className="relative h-4 w-full rounded-full overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {/* Available region */}
          <div
            className="absolute left-0 top-0 h-full"
            style={{
              width: `${batteryAvailable}%`,
              background: 'rgba(255,255,255,0.04)',
              borderRight: '2px dashed rgba(255,255,255,0.2)',
            }}
          />
          {/* Consumed bar */}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(batteryConsumed, 100)}%` }}
            transition={{ duration: 1.2, delay: 0.4, ease: [0.4, 0, 0.2, 1] }}
            className="absolute left-0 top-0 h-full rounded-full"
            style={{
              background: `linear-gradient(90deg, ${batteryColor}, ${batteryColor}88)`,
              boxShadow: `0 0 10px ${batteryColor}44`,
            }}
          />
          {/* Overflow flash if insufficient */}
          {batteryExceeded && (
            <div className="absolute right-0 top-0 h-full rounded-full animate-pulse"
              style={{ width: `${100 - batteryAvailable}%`, background: 'rgba(244,63,94,0.4)' }} />
          )}
        </div>

        {/* Labels */}
        <div className="flex justify-between mt-2 text-[9px] text-slate-600">
          <span>0%</span>
          {batteryAvailable < 100 && (
            <span style={{ color: '#f59e0b', fontFamily: 'JetBrains Mono, monospace' }}>
              ⚡ {batteryAvailable.toFixed(0)}% available
            </span>
          )}
          <span>100%</span>
        </div>

        {/* Remaining battery indicator */}
        <div className="mt-3 flex gap-3">
          <div className="flex-1 rounded-lg px-3 py-2" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.12)' }}>
            <p className="text-[9px] text-slate-600">Remaining</p>
            <p className="text-[13px] font-bold font-mono mt-0.5" style={{ color: batteryRemaining > 20 ? '#10b981' : '#f43f5e' }}>
              {Math.max(0, batteryRemaining).toFixed(1)}%
            </p>
          </div>
          <div className="flex-1 rounded-lg px-3 py-2" style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.12)' }}>
            <p className="text-[9px] text-slate-600">Energy</p>
            <p className="text-[13px] font-bold font-mono mt-0.5 text-cyan-400">{r.energy_wh.toFixed(1)} Wh</p>
          </div>
          <div className="flex-1 rounded-lg px-3 py-2" style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.12)' }}>
            <p className="text-[9px] text-slate-600">Efficiency</p>
            <p className="text-[13px] font-bold font-mono mt-0.5 text-violet-400">
              {(r.energy_wh / Math.max(r.total_distance_km, 0.1)).toFixed(1)} Wh/km
            </p>
          </div>
        </div>
      </motion.div>

      {/* Weather Summary */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.42 }}
        className="rounded-xl p-4"
        style={{
          background: 'rgba(15,23,42,0.65)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderTop: '1px solid rgba(255,255,255,0.12)',
        }}
      >
        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-3">Weather Telemetry</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Wind Speed', value: `${result.weather.wind_speed_m_s} m/s`, sub: `${result.weather.wind_direction_deg}° bearing`, color: '#06b6d4' },
            { label: 'Rain', value: `${result.weather.rain_intensity_mm_h} mm/h`, sub: result.weather.rain_intensity_mm_h === 0 ? 'Clear skies' : 'Active precipitation', color: '#8b5cf6' },
            { label: 'Temperature', value: `${result.weather.temperature_c}°C`, sub: 'Ambient air', color: '#f59e0b' },
            { label: 'Visibility', value: `${result.weather.visibility_km} km`, sub: result.weather.visibility_km >= 10 ? 'Excellent' : 'Reduced', color: result.weather.visibility_km >= 10 ? '#10b981' : '#f59e0b' },
          ].map(w => (
            <div key={w.label} className="rounded-lg px-3 py-2.5"
              style={{ background: `${w.color}06`, border: `1px solid ${w.color}15` }}>
              <p className="text-[9px] text-slate-600 font-medium">{w.label}</p>
              <p className="text-xs font-mono font-bold mt-0.5" style={{ color: w.color }}>{w.value}</p>
              <p className="text-[9px] text-slate-600 mt-0.5">{w.sub}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── DRONE VS ROAD DELIVERY RIDER COMPARISON CARD ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.48 }}
        className="rounded-xl p-4 overflow-hidden relative"
        style={{
          background: 'linear-gradient(135deg, rgba(15,23,42,0.8), rgba(6,182,212,0.06))',
          border: '1px solid rgba(6,182,212,0.2)',
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
            ⚡ Drone vs Road Rider Impact
          </span>
          <span className="text-[9px] bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
            71% Faster
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Drone Column */}
          <div className="rounded-lg p-3 space-y-2" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
              <Zap className="w-3.5 h-3.5" /> DroneRoute AI
            </div>
            <div>
              <p className="text-[9px] text-slate-500">Delivery Time</p>
              <p className="text-xs font-mono font-bold text-white">{r.estimated_flight_time_min.toFixed(1)} mins</p>
            </div>
            <div>
              <p className="text-[9px] text-slate-500">Accident Risk</p>
              <p className="text-xs font-mono font-bold text-emerald-400">0.0% (Zero Traffic)</p>
            </div>
            <div>
              <p className="text-[9px] text-slate-500">CO₂ Emissions</p>
              <p className="text-xs font-mono font-bold text-emerald-400">0.00 kg (100% Electric)</p>
            </div>
          </div>

          {/* Road Rider Column */}
          <div className="rounded-lg p-3 space-y-2" style={{ background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.18)' }}>
            <div className="flex items-center gap-1.5 text-rose-400 text-xs font-bold">
              <Bike className="w-3.5 h-3.5" /> Road Bike Rider
            </div>
            <div>
              <p className="text-[9px] text-slate-500">Delivery Time</p>
              <p className="text-xs font-mono font-bold text-slate-300">{(r.estimated_flight_time_min * 3.4).toFixed(1)} mins</p>
            </div>
            <div>
              <p className="text-[9px] text-slate-500">Accident Risk</p>
              <p className="text-xs font-mono font-bold text-rose-400">High (Urban Traffic)</p>
            </div>
            <div>
              <p className="text-[9px] text-slate-500">CO₂ Emissions</p>
              <p className="text-xs font-mono font-bold text-rose-400">+{r.carbon_saved_kg.toFixed(2)} kg CO₂</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
