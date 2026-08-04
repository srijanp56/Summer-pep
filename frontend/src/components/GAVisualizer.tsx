import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ScatterChart, Scatter, ZAxis,
} from 'recharts';
import { OptimizationResponse, GenerationMetric } from '../types';
import { TrendingUp, Zap, Activity, Target } from 'lucide-react';

interface GAVisualizerProps {
  result: OptimizationResponse | null;
  liveGenerations?: GenerationMetric[];
  isStreaming?: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-panel rounded-xl p-3 text-xs border border-white/10">
      <p className="text-slate-400 mb-1">Generation {label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-medium">
          {p.name}: <span className="font-mono">{typeof p.value === 'number' ? p.value.toFixed(2) : p.value}</span>
        </p>
      ))}
    </div>
  );
};

const ScatterTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="glass-panel rounded-xl p-3 text-xs border border-white/10">
      <p className="text-slate-400 mb-1">Generation {d.gen}</p>
      <p className="text-cyan-400">Distance: <span className="font-mono">{d.x.toFixed(2)} km</span></p>
      <p className="text-amber-400">Battery: <span className="font-mono">{d.y.toFixed(1)}%</span></p>
      <p className="text-emerald-400">Fitness: <span className="font-mono">{d.z.toFixed(2)}</span></p>
    </div>
  );
};

// Mutation rate badge color
function mutationColor(rate: number): string {
  if (rate > 0.35) return '#f43f5e';
  if (rate > 0.22) return '#f59e0b';
  return '#10b981';
}

export default function GAVisualizer({ result, liveGenerations = [], isStreaming = false }: GAVisualizerProps) {
  // Use live data while streaming, else use completed result
  const generations: GenerationMetric[] = isStreaming || !result
    ? liveGenerations
    : result.generation_history;

  const isEmpty = generations.length === 0;
  const currentGen = generations[generations.length - 1];
  const firstGen = generations[0];

  const improvement = (!isEmpty && firstGen && currentGen && firstGen.best_fitness > 0)
    ? ((currentGen.best_fitness - firstGen.best_fitness) / firstGen.best_fitness * 100).toFixed(1)
    : '0';

  const fitnessData = generations.map(g => ({
    gen: g.generation,
    Best: g.best_fitness,
    Average: g.avg_fitness,
    Worst: g.min_fitness,
  }));

  // Pareto proxy: distance vs battery, colored by fitness
  const paretoData = generations.map(g => ({
    x: g.best_distance_km,
    y: g.best_battery_drain_pct,
    z: g.best_fitness,
    gen: g.generation,
  }));

  const mutRate = currentGen?.mutation_rate ?? 0.20;
  const diversity = currentGen?.diversity_score ?? 0;

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
        <motion.div
          animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 0.95, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="text-4xl"
        >
          🧬
        </motion.div>
        <p className="text-slate-400 text-sm">GA Evolution Chart</p>
        <p className="text-slate-600 text-xs">Run optimization to see live evolution</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            GA Evolution
            {isStreaming && (
              <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LIVE
              </span>
            )}
          </h3>
          <p className="text-[10px] text-slate-500">
            {isStreaming ? `Evolving… Gen ${generations.length}/100` : `${generations.length} generations completed`}
          </p>
        </div>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full"
        >
          <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-xs text-emerald-400 font-bold">+{improvement}%</span>
        </motion.div>
      </div>

      {/* Live stats row */}
      <div className="grid grid-cols-3 gap-2">
        {/* Mutation Rate badge */}
        <div className="glass-panel rounded-xl p-2.5 flex flex-col items-center gap-1">
          <Zap className="w-3.5 h-3.5" style={{ color: mutationColor(mutRate) }} />
          <p className="text-[9px] text-slate-500 uppercase tracking-wide">Mutation</p>
          <AnimatePresence mode="wait">
            <motion.p
              key={mutRate.toFixed(3)}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="text-[11px] font-mono font-bold"
              style={{ color: mutationColor(mutRate) }}
            >
              {(mutRate * 100).toFixed(1)}%
            </motion.p>
          </AnimatePresence>
          {mutRate > 0.35 && (
            <p className="text-[8px] text-rose-400 font-medium">BOOSTED</p>
          )}
        </div>

        {/* Diversity */}
        <div className="glass-panel rounded-xl p-2.5 flex flex-col items-center gap-1">
          <Activity className="w-3.5 h-3.5 text-violet-400" />
          <p className="text-[9px] text-slate-500 uppercase tracking-wide">Diversity</p>
          <p className="text-[11px] font-mono font-bold text-violet-400">
            {(diversity * 100).toFixed(0)}%
          </p>
        </div>

        {/* Best fitness */}
        <div className="glass-panel rounded-xl p-2.5 flex flex-col items-center gap-1">
          <Target className="w-3.5 h-3.5 text-emerald-400" />
          <p className="text-[9px] text-slate-500 uppercase tracking-wide">Best Fit</p>
          <AnimatePresence mode="wait">
            <motion.p
              key={currentGen?.best_fitness.toFixed(1)}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="text-[11px] font-mono font-bold text-emerald-400"
            >
              {currentGen?.best_fitness.toFixed(1)}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      {/* Fitness Evolution Chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl p-4"
        style={{
          background: 'linear-gradient(135deg, rgba(16,185,129,0.06) 0%, rgba(15,23,42,0.85) 100%)',
          border: '1px solid rgba(16,185,129,0.2)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 20px rgba(16,185,129,0.08)',
        }}
      >
        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-3">
          Fitness Score per Generation
        </p>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={fitnessData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="gen"
              tick={{ fill: '#64748b', fontSize: 9 }}
              tickLine={{ stroke: '#334155' }}
              axisLine={{ stroke: '#334155' }}
              label={{ value: 'Generation', position: 'insideBottom', offset: -2, fill: '#64748b', fontSize: 9 }}
            />
            <YAxis
              tick={{ fill: '#64748b', fontSize: 9 }}
              tickLine={{ stroke: '#334155' }}
              axisLine={{ stroke: '#334155' }}
              domain={['auto', 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '10px', color: '#94a3b8', paddingTop: '8px' }} />
            <Line type="monotone" dataKey="Best" stroke="#10b981" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: '#10b981' }} isAnimationActive={false} />
            <Line type="monotone" dataKey="Average" stroke="#06b6d4" strokeWidth={1.5} dot={false} strokeDasharray="4 4" activeDot={{ r: 3 }} isAnimationActive={false} />
            <Line type="monotone" dataKey="Worst" stroke="#475569" strokeWidth={1} dot={false} strokeDasharray="2 6" activeDot={{ r: 2 }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Pareto Front Scatter */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-panel rounded-xl p-4"
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">
            Pareto Front — Distance vs Battery
          </p>
          <span className="text-[9px] text-slate-600 italic">Color = fitness</span>
        </div>
        <ResponsiveContainer width="100%" height={140}>
          <ScatterChart margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="x"
              type="number"
              name="Distance"
              tick={{ fill: '#64748b', fontSize: 8 }}
              axisLine={{ stroke: '#334155' }}
              tickLine={false}
              label={{ value: 'km', position: 'insideRight', fill: '#64748b', fontSize: 8 }}
            />
            <YAxis
              dataKey="y"
              type="number"
              name="Battery"
              tick={{ fill: '#64748b', fontSize: 8 }}
              axisLine={{ stroke: '#334155' }}
              tickLine={false}
              label={{ value: '%', position: 'insideTop', fill: '#64748b', fontSize: 8 }}
            />
            <ZAxis dataKey="z" range={[20, 80]} />
            <Tooltip content={<ScatterTooltip />} />
            <Scatter
              data={paretoData}
              fill="#06b6d4"
              fillOpacity={0.7}
              shape={(props: any) => {
                const { cx, cy, payload } = props;
                // Color gradient: low fitness = red, high = emerald
                const t = Math.max(0, Math.min(1, (payload.z - 40) / 60));
                const r = Math.round(244 - t * (244 - 16));
                const g = Math.round(63 + t * (185 - 63));
                const b = Math.round(94 - t * (94 - 129));
                return <circle cx={cx} cy={cy} r={3} fill={`rgb(${r},${g},${b})`} fillOpacity={0.8} />;
              }}
            />
          </ScatterChart>
        </ResponsiveContainer>
        <p className="text-[9px] text-slate-600 text-center mt-1">
          Bottom-left corner = optimal (low distance, low battery drain)
        </p>
      </motion.div>

      {/* GA Config Summary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass-panel rounded-xl p-4"
      >
        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-3">Algorithm Configuration</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Population', value: '100 chromosomes' },
            { label: 'Generations', value: `${generations.length} completed` },
            { label: 'Selection', value: 'Tournament (k=5)' },
            { label: 'Crossover', value: 'Two-Point' },
            { label: 'Mutation', value: `Adaptive (${(mutRate * 100).toFixed(0)}%)` },
            { label: 'Elitism', value: 'Top 10% retained' },
          ].map(c => (
            <div key={c.label} className="bg-white/5 rounded-lg px-2 py-2">
              <p className="text-[9px] text-slate-500">{c.label}</p>
              <p className="text-[11px] text-slate-200 font-medium">{c.value}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Battery drain chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-panel rounded-xl p-4"
      >
        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-3">Battery Drain by Generation</p>
        <ResponsiveContainer width="100%" height={90}>
          <LineChart
            data={generations.map(g => ({ gen: g.generation, Drain: g.best_battery_drain_pct }))}
            margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="gen" tick={{ fill: '#64748b', fontSize: 8 }} axisLine={{ stroke: '#334155' }} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 8 }} axisLine={{ stroke: '#334155' }} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="Drain" stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  );
}
