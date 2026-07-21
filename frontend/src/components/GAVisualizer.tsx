import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { OptimizationResponse } from '../types';
import { TrendingUp } from 'lucide-react';

interface GAVisualizerProps {
  result: OptimizationResponse | null;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-panel rounded-xl p-3 text-xs border border-white/10">
      <p className="text-slate-400 mb-1">Generation {label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-medium">
          {p.name}: <span className="font-mono">{p.value.toFixed(2)}</span>
        </p>
      ))}
    </div>
  );
};

export default function GAVisualizer({ result }: GAVisualizerProps) {
  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
        <div className="text-4xl">🧬</div>
        <p className="text-slate-400 text-sm">GA Evolution Chart</p>
        <p className="text-slate-600 text-xs">Run optimization to see evolution</p>
      </div>
    );
  }

  const data = result.generation_history.map(g => ({
    gen: g.generation,
    Best: g.best_fitness,
    Average: g.avg_fitness,
    Worst: g.min_fitness,
  }));

  const lastGen = result.generation_history[result.generation_history.length - 1];
  const improvement = lastGen
    ? ((lastGen.best_fitness - result.generation_history[0].best_fitness) / result.generation_history[0].best_fitness * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">GA Evolution</h3>
          <p className="text-[10px] text-slate-500">{result.generation_history.length} generations tracked</p>
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

      {/* Fitness Evolution Chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel rounded-xl p-4"
      >
        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-3">Fitness Score per Generation</p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
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
            <Legend
              wrapperStyle={{ fontSize: '10px', color: '#94a3b8', paddingTop: '8px' }}
            />
            <Line type="monotone" dataKey="Best" stroke="#10b981" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: '#10b981' }} />
            <Line type="monotone" dataKey="Average" stroke="#06b6d4" strokeWidth={1.5} dot={false} strokeDasharray="4 4" activeDot={{ r: 3 }} />
            <Line type="monotone" dataKey="Worst" stroke="#475569" strokeWidth={1} dot={false} strokeDasharray="2 6" activeDot={{ r: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>

      {/* GA Config Summary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-panel rounded-xl p-4"
      >
        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-3">Algorithm Configuration</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Population', value: '100 chromosomes' },
            { label: 'Generations', value: `${result.generation_history.length} completed` },
            { label: 'Selection', value: 'Tournament (k=5)' },
            { label: 'Crossover', value: 'Two-Point' },
            { label: 'Mutation', value: 'Waypoint Shift' },
            { label: 'Elitism', value: 'Top 10% retained' },
          ].map(c => (
            <div key={c.label} className="bg-white/5 rounded-lg px-2 py-2">
              <p className="text-[9px] text-slate-500">{c.label}</p>
              <p className="text-[11px] text-slate-200 font-medium">{c.value}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Battery evolution mini chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-panel rounded-xl p-4"
      >
        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-3">Battery Drain by Generation</p>
        <ResponsiveContainer width="100%" height={100}>
          <LineChart data={result.generation_history.map(g => ({ gen: g.generation, Drain: g.best_battery_drain_pct }))} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="gen" tick={{ fill: '#64748b', fontSize: 8 }} axisLine={{ stroke: '#334155' }} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 8 }} axisLine={{ stroke: '#334155' }} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="Drain" stroke="#f59e0b" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  );
}
