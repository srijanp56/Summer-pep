import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Download, FileJson, FileText, Globe } from 'lucide-react';
import { OptimizationResponse } from '../types';
import { exportReport } from '../services/api';

interface ReportExporterProps {
  result: OptimizationResponse;
  onClose: () => void;
}

const FORMATS = [
  { id: 'json', label: 'JSON Data', icon: <FileJson className="w-5 h-5" />, desc: 'Full mission data in structured JSON', color: '#10b981' },
  { id: 'csv', label: 'CSV Report', icon: <FileText className="w-5 h-5" />, desc: 'Algorithm comparison in spreadsheet format', color: '#06b6d4' },
  { id: 'html', label: 'PDF Report', icon: <Globe className="w-5 h-5" />, desc: 'Printable HTML report (open & save as PDF)', color: '#8b5cf6' },
];

export default function ReportExporter({ result, onClose }: ReportExporterProps) {
  const [exporting, setExporting] = useState<string | null>(null);

  const handleExport = async (format: string) => {
    setExporting(format);
    try {
      await exportReport(result, format);
    } finally {
      setExporting(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="glass-panel rounded-2xl w-full max-w-md shadow-2xl border border-white/10"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center">
              <Download className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Export Mission Report</h2>
              <p className="text-[10px] text-slate-400">Mission ID: {result.request_id.slice(0, 12)}...</p>
            </div>
          </div>
          <button onClick={onClose} id="close-exporter-btn" className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mission Summary */}
        <div className="px-5 py-4 border-b border-white/5">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Winner', value: result.winner_algorithm.split(' ')[0] },
              { label: 'Distance', value: `${result.ga_route.total_distance_km.toFixed(2)} km` },
              { label: 'Battery', value: `${result.ga_route.battery_consumed_pct.toFixed(1)}%` },
            ].map(s => (
              <div key={s.label} className="bg-white/5 rounded-xl p-3 text-center">
                <p className="text-[9px] text-slate-500 uppercase tracking-wider">{s.label}</p>
                <p className="text-sm font-bold text-white mt-1">{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Export Options */}
        <div className="p-5 space-y-3">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Select Format</p>
          {FORMATS.map(f => (
            <motion.button
              key={f.id}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => handleExport(f.id)}
              disabled={!!exporting}
              id={`export-${f.id}-btn`}
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border border-white/10 bg-white/5 hover:border-opacity-30 transition-all disabled:opacity-60"
              style={{ borderColor: exporting === f.id ? f.color : undefined, background: exporting === f.id ? `${f.color}10` : undefined }}
            >
              <div className="p-2 rounded-lg flex-shrink-0" style={{ background: `${f.color}15`, color: f.color }}>
                {f.icon}
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-semibold text-white">{f.label}</p>
                <p className="text-[10px] text-slate-400">{f.desc}</p>
              </div>
              {exporting === f.id ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" style={{ color: f.color }} />
              ) : (
                <Download className="w-4 h-4 text-slate-500" />
              )}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
