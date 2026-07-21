import { motion } from 'framer-motion';
import { OptimizationResponse } from '../types';
import { Bot } from 'lucide-react';

interface AIExplanationPanelProps {
  result: OptimizationResponse | null;
}

function parseExplanationLine(line: string, idx: number) {
  if (!line.trim()) return null;
  const icon = line.startsWith('🎯') ? 'goal'
    : line.startsWith('🛡️') ? 'shield'
    : line.startsWith('💨') ? 'wind'
    : line.startsWith('🌧️') ? 'rain'
    : line.startsWith('☀️') ? 'sun'
    : line.startsWith('📦') ? 'package'
    : line.startsWith('❌') ? 'reject'
    : line.startsWith('⚠️') ? 'warn'
    : 'info';

  const borderColor = icon === 'reject' ? '#f43f5e'
    : icon === 'warn' ? '#f59e0b'
    : icon === 'goal' ? '#10b981'
    : icon === 'shield' ? '#10b981'
    : '#06b6d4';

  const bgColor = icon === 'reject' ? 'rgba(244,63,94,0.05)'
    : icon === 'warn' ? 'rgba(245,158,11,0.05)'
    : icon === 'goal' ? 'rgba(16,185,129,0.05)'
    : 'rgba(6,182,212,0.05)';

  // Parse **bold** markdown
  const parts = line.split(/(\*\*[^*]+\*\*)/g);

  return (
    <motion.div
      key={idx}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.08 }}
      className="rounded-xl p-3 text-xs leading-relaxed"
      style={{ background: bgColor, borderLeft: `3px solid ${borderColor}` }}
    >
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**')
          ? <strong key={i} style={{ color: borderColor }} className="font-semibold">{part.slice(2, -2)}</strong>
          : <span key={i} className="text-slate-300">{part}</span>
      )}
    </motion.div>
  );
}

export default function AIExplanationPanel({ result }: AIExplanationPanelProps) {
  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
        <div className="text-4xl">🤖</div>
        <p className="text-slate-400 text-sm">AI Route Rationale</p>
        <p className="text-slate-600 text-xs">Run optimization to get AI reasoning</p>
      </div>
    );
  }

  const lines = result.ai_explanation.split('\n\n').filter(Boolean);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 glass-panel rounded-xl p-3 border border-violet-500/20 bg-violet-500/5">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-xs font-bold text-white">AI Decision Engine</p>
          <p className="text-[10px] text-slate-400">Multi-objective route selection rationale</p>
        </div>
      </div>

      {/* Explanation cards */}
      <div className="space-y-2">
        {lines.map((line, idx) => parseExplanationLine(line, idx))}
      </div>

      {/* Fitness Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-panel rounded-xl p-4"
      >
        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-3">Fitness Function Weights</p>
        <div className="space-y-2">
          {[
            { label: 'Distance', weight: 30, color: '#06b6d4' },
            { label: 'Battery', weight: 25, color: '#10b981' },
            { label: 'Weather', weight: 20, color: '#8b5cf6' },
            { label: 'Risk (Safety)', weight: 15, color: '#f59e0b' },
            { label: 'Payload', weight: 10, color: '#f43f5e' },
          ].map(f => (
            <div key={f.label} className="flex items-center gap-3">
              <span className="text-[10px] text-slate-400 w-24 flex-shrink-0">{f.label}</span>
              <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${f.weight}%` }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="h-full rounded-full"
                  style={{ background: f.color }}
                />
              </div>
              <span className="text-[10px] font-mono font-bold w-8 text-right" style={{ color: f.color }}>{f.weight}%</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
