import { motion, AnimatePresence } from 'framer-motion';
import { OptimizationResponse, GenerationMetric } from '../types';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart,
} from 'recharts';
import { TrendingUp, Target, Shield, Zap, Route, CheckCircle2, Info } from 'lucide-react';

interface GADecisionPanelProps {
  result: OptimizationResponse | null;
  liveGenerations?: GenerationMetric[];
  isStreaming?: boolean;
  selectedRouteType?: 'optimal' | 'balanced' | 'direct';
  onSelectRouteType?: (type: 'optimal' | 'balanced' | 'direct') => void;
}

// ─── Mini metric pill ────────────────────────────────────────────────────
function Pill({ label, value, color, icon }: { label: string; value: string; color: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl p-3 flex flex-col gap-1.5" style={{ background: `${color}0d`, border: `1px solid ${color}22` }}>
      <div className="flex items-center gap-1.5" style={{ color }}>
        <div className="[&>svg]:w-3 [&>svg]:h-3">{icon}</div>
        <span className="text-[9px] font-bold uppercase tracking-widest">{label}</span>
      </div>
      <span className="text-base font-bold font-mono leading-none" style={{ color }}>{value}</span>
    </div>
  );
}

// ─── Section header ──────────────────────────────────────────────────────
function SectionHead({ icon, title, sub }: { icon: React.ReactNode; title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-emerald-500/10 text-emerald-400 [&>svg]:w-3.5 [&>svg]:h-3.5">
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>{title}</p>
        {sub && <p className="text-[9px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
      </div>
    </div>
  );
}

// ─── Custom chart tooltip ────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg px-3 py-2 text-[10px] font-mono" style={{
      background: 'var(--surface-glass-br)',
      border: '1px solid var(--border)',
      boxShadow: 'var(--shadow-card)',
    }}>
      <p style={{ color: 'var(--text-muted)' }}>Gen {label}</p>
      <p style={{ color: '#10b981' }}>Best: {payload[0]?.value?.toFixed(5)}</p>
      {payload[1] && <p style={{ color: '#06b6d4' }}>Avg: {payload[1]?.value?.toFixed(5)}</p>}
    </div>
  );
}

export default function GADecisionPanel({
  result, liveGenerations = [], isStreaming = false,
  selectedRouteType = 'optimal', onSelectRouteType,
}: GADecisionPanelProps) {

  // Use live data while streaming, final history when done
  const genData = (isStreaming && liveGenerations.length > 0)
    ? liveGenerations
    : result?.generation_history ?? [];

  // Active route
  const r = selectedRouteType === 'balanced'
    ? (result?.balanced_route || result?.ga_route)
    : selectedRouteType === 'direct'
    ? (result?.direct_route || result?.ga_route)
    : result?.ga_route;

  // No data yet
  if (!result && genData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
          style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}
        >🧬</motion.div>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>GA Decision Engine</p>
          <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
            Run an optimization to see how the Genetic Algorithm<br />selects and evolves the optimal drone route
          </p>
        </div>
        <div className="w-full space-y-1.5 text-left">
          {[
            { icon: '🔀', t: 'Population Init', d: '100 random chromosome paths generated' },
            { icon: '🎯', t: 'Fitness Scoring', d: 'Each path scored: safety + battery + distance' },
            { icon: '🔁', t: 'Selection & Crossover', d: 'Top chromosomes breed next generation' },
            { icon: '🌀', t: 'Mutation', d: '20% waypoints randomly altered to explore new space' },
            { icon: '✅', t: 'Convergence', d: 'Best route locked in when improvement plateaus' },
          ].map((s, i) => (
            <motion.div key={s.t} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}
              className="flex items-start gap-2.5 rounded-xl px-3 py-2.5"
              style={{ background: 'var(--surface-card)', border: '1px solid var(--border)' }}>
              <span className="text-base">{s.icon}</span>
              <div>
                <p className="text-[10px] font-semibold" style={{ color: 'var(--text-primary)' }}>{s.t}</p>
                <p className="text-[9px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.d}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* ── Live streaming indicator ── */}
      <AnimatePresence>
        {isStreaming && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="rounded-xl px-3 py-2 flex items-center gap-2.5"
            style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <div className="status-dot-live flex-shrink-0" />
            <span className="text-[10px] font-semibold text-emerald-400">GA evolving... gen {genData.length}/100</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 1. Fitness Evolution Chart ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-xl p-4" style={{ background: 'var(--surface-card)', border: '1px solid var(--border)' }}>
        <SectionHead icon={<TrendingUp />} title="Fitness Evolution"
          sub={genData.length > 0 ? `${genData.length} generations evaluated · ${(genData.length * 100).toLocaleString()} route permutations` : 'Awaiting data'} />
        {genData.length > 0 ? (
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={genData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="fitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="avgGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="generation" tick={{ fontSize: 9, fill: 'var(--text-faint)' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9, fill: 'var(--text-faint)' }} tickLine={false} axisLine={false} width={40} tickFormatter={v => v.toFixed(3)} />
              <Tooltip content={<ChartTooltip />} />
              {result?.generations_to_converge ? (
                <ReferenceLine x={result.generations_to_converge} stroke="rgba(245,158,11,0.5)" strokeDasharray="4 3"
                  label={{ value: 'converged', position: 'top', fontSize: 8, fill: '#f59e0b' }} />
              ) : null}
              <Area type="monotone" dataKey="best_fitness" stroke="#10b981" strokeWidth={2} fill="url(#fitGrad)" dot={false} name="Best" />
              <Area type="monotone" dataKey="avg_fitness" stroke="#06b6d4" strokeWidth={1.5} fill="url(#avgGrad)" dot={false} name="Avg" strokeDasharray="4 3" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[140px] flex items-center justify-center">
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Waiting for generations...</p>
          </div>
        )}
        {/* Legend */}
        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-1.5"><div className="w-4 h-0.5 rounded bg-emerald-400" /><span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>Best fitness</span></div>
          <div className="flex items-center gap-1.5"><div className="w-4 h-0.5 rounded bg-cyan-400 opacity-70" style={{ borderTop: '2px dashed #06b6d4' }} /><span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>Avg fitness</span></div>
          {result?.generations_to_converge ? <div className="flex items-center gap-1.5"><div className="w-4 h-0.5 rounded" style={{ background: '#f59e0b', opacity: 0.6 }} /><span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>Convergence</span></div> : null}
        </div>
      </motion.div>

      {/* ── 2. GA Insight Pills ── */}
      {result && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <SectionHead icon={<Target />} title="Route Selection Metrics" />
          <div className="grid grid-cols-2 gap-2">
            <Pill label="Fitness Gain" value={`+${result.fitness_improvement_pct.toFixed(1)}%`} color="#10b981" icon={<TrendingUp />} />
            <Pill label="Converged Gen" value={`Gen ${result.generations_to_converge}`} color="#f59e0b" icon={<Target />} />
            <Pill label="Success Rate" value={`${((r?.success_probability ?? 0.95) * 100).toFixed(0)}%`} color="#06b6d4" icon={<CheckCircle2 />} />
            <Pill label="Permutations" value={`${(genData.length * 100).toLocaleString()}`} color="#8b5cf6" icon={<Route />} />
          </div>
        </motion.div>
      )}

      {/* ── 3. Optimization Objectives Breakdown ── */}
      {result && r && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="rounded-xl p-4" style={{ background: 'var(--surface-card)', border: '1px solid var(--border)' }}>
          <SectionHead icon={<Shield />} title="What the GA Optimized" sub="Multi-objective fitness function breakdown" />
          <div className="space-y-3">
            {[
              {
                label: 'Safety / Airspace',
                score: r.safety_risk_score === 0 ? 100 : Math.max(0, (1 - r.safety_risk_score) * 100),
                detail: r.safety_risk_score === 0 ? 'Full no-fly zone avoidance' : `Risk score: ${r.safety_risk_score.toFixed(3)}`,
                color: r.safety_risk_score === 0 ? '#10b981' : '#f59e0b',
                icon: '🛡️',
              },
              {
                label: 'Battery Efficiency',
                score: Math.max(0, 100 - r.battery_consumed_pct),
                detail: `${r.battery_consumed_pct.toFixed(1)}% consumed · ${r.energy_wh.toFixed(1)} Wh`,
                color: r.battery_consumed_pct < 50 ? '#10b981' : r.battery_consumed_pct < 75 ? '#f59e0b' : '#f43f5e',
                icon: '🔋',
              },
              {
                label: 'Weather Exposure',
                score: Math.max(0, (1 - r.weather_risk_score) * 100),
                detail: `Risk score: ${(r.weather_risk_score * 100).toFixed(0)}%`,
                color: r.weather_risk_score < 0.3 ? '#10b981' : '#f59e0b',
                icon: '💨',
              },
              {
                label: 'Route Efficiency',
                score: Math.min(100, r.success_probability * 100),
                detail: `${r.total_distance_km.toFixed(2)} km · ${r.estimated_flight_time_min.toFixed(1)} min`,
                color: '#06b6d4',
                icon: '📏',
              },
            ].map((obj, i) => (
              <motion.div key={obj.label} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.06 }}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{obj.icon}</span>
                    <span className="text-[10px] font-semibold" style={{ color: 'var(--text-secondary)' }}>{obj.label}</span>
                  </div>
                  <span className="text-[9px] font-mono" style={{ color: obj.color }}>{obj.score.toFixed(0)}pts</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--input-bg)' }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${obj.score}%` }}
                    transition={{ duration: 0.8, delay: 0.3 + i * 0.08, ease: [0.4, 0, 0.2, 1] }}
                    className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${obj.color}, ${obj.color}88)`, boxShadow: `0 0 8px ${obj.color}44` }} />
                </div>
                <p className="text-[9px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{obj.detail}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── 4. Route Selection Reasons ── */}
      {result?.route_selection_reasons && result.route_selection_reasons.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="rounded-xl p-4" style={{ background: 'var(--surface-card)', border: '1px solid var(--border)' }}>
          <SectionHead icon={<Info />} title="Why This Route Was Chosen" sub="GA decision rationale" />
          <div className="space-y-2">
            {result.route_selection_reasons.map((reason, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + i * 0.05 }}
                className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-[10px]"
                style={{ background: 'var(--surface-glass)', border: '1px solid var(--border)' }}>
                <span className="leading-none mt-0.5">{reason.charAt(0)}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{reason.slice(2)}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── 5. 3-Way Route Option Comparison ── */}
      {result && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="rounded-xl p-4" style={{ background: 'var(--surface-card)', border: '1px solid var(--border)' }}>
          <SectionHead icon={<Zap />} title="3-Route GA Option Comparison" sub="Click any route to select & view on map" />
          <div className="grid grid-cols-3 gap-2">
            {[
              {
                id: 'optimal' as const,
                label: '🟢 Optimal',
                route: result.ga_route,
                color: '#10b981',
                desc: 'Best overall fitness & safety',
              },
              {
                id: 'balanced' as const,
                label: '🟡 Balanced',
                route: result.balanced_route || result.ga_route,
                color: '#f59e0b',
                desc: 'Alternative path profile',
              },
              {
                id: 'direct' as const,
                label: '🔴 High Risk',
                route: result.direct_route || result.ga_route,
                color: '#f43f5e',
                desc: 'Direct path / Airspace risk',
              },
            ].map(item => {
              const isSel = selectedRouteType === item.id;
              const rt = item.route;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectRouteType?.(item.id)}
                  className="rounded-xl p-2.5 text-left transition-all relative overflow-hidden"
                  style={{
                    background: isSel ? `${item.color}12` : 'var(--input-bg)',
                    border: `1px solid ${isSel ? `${item.color}66` : 'var(--border)'}`,
                    boxShadow: isSel ? `0 4px 16px ${item.color}22` : 'none',
                  }}
                >
                  {isSel && (
                    <div className="absolute top-1.5 right-1.5">
                      <CheckCircle2 className="w-3 h-3" style={{ color: item.color }} />
                    </div>
                  )}
                  <p className="text-[10px] font-bold truncate" style={{ color: item.color }}>{item.label}</p>
                  <p className="text-[8px] truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>{item.desc}</p>
                  <div className="space-y-1 mt-2 text-[9px] font-mono">
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--text-muted)' }}>Dist</span>
                      <span style={{ color: 'var(--text-primary)' }}>{rt.total_distance_km.toFixed(1)}km</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--text-muted)' }}>Batt</span>
                      <span style={{ color: item.color }}>{rt.battery_consumed_pct.toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--text-muted)' }}>Risk</span>
                      <span style={{ color: rt.safety_risk_score === 0 ? '#10b981' : '#f43f5e' }}>
                        {rt.safety_risk_score === 0 ? '0.0' : rt.safety_risk_score.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <p className="text-[8px] mt-2.5 text-center" style={{ color: 'var(--text-muted)' }}>
            ✦ Click any card above to switch the active map polyline & flight animation
          </p>
        </motion.div>
      )}

      {/* ── 6. Distance progress chart ── */}
      {genData.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="rounded-xl p-4" style={{ background: 'var(--surface-card)', border: '1px solid var(--border)' }}>
          <SectionHead icon={<Route />} title="Route Distance Evolution" sub="How GA shortened the path across generations" />
          <ResponsiveContainer width="100%" height={100}>
            <LineChart data={genData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <XAxis dataKey="generation" tick={{ fontSize: 8, fill: 'var(--text-faint)' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 8, fill: 'var(--text-faint)' }} tickLine={false} axisLine={false} width={32} tickFormatter={v => `${v.toFixed(1)}`} />
              <Tooltip formatter={(v: number) => [`${v.toFixed(3)} km`, 'Best Distance']} contentStyle={{ background: 'var(--surface-glass-br)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 10 }} />
              <Line type="monotone" dataKey="best_distance_km" stroke="#06b6d4" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      )}

    </div>
  );
}

