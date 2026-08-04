import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, AlertTriangle, Activity, Zap, Radio, Satellite, Thermometer, Terminal } from 'lucide-react';
import { Waypoint, AttackSimulationResponse, TelemetryEvent } from '../types';
import { simulateCyberAttack } from '../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface CyberSecurityPanelProps {
  route: Waypoint[];
}

const ATTACKS = [
  { id: 'gps_spoofing', label: 'GPS Spoofing', icon: <Satellite className="w-4 h-4" />, color: '#f43f5e', desc: 'Fake GPS coordinates injection displaces the drone off course.' },
  { id: 'fake_weather', label: 'Fake Weather', icon: <Thermometer className="w-4 h-4" />, color: '#f59e0b', desc: 'Injects unphysical weather sensor data to trigger unsafe routing.' },
  { id: 'sensor_failure', label: 'Sensor Failure', icon: <Activity className="w-4 h-4" />, color: '#8b5cf6', desc: 'IMU accelerometer drift leads to attitude destabilization.' },
  { id: 'signal_jamming', label: 'Signal Jamming', icon: <Radio className="w-4 h-4" />, color: '#06b6d4', desc: 'RF C2 link RSSI jammed below safe operational threshold.' },
];

function statusColor(status: string): string {
  if (status === 'ATTACK_DETECTED') return '#f43f5e';
  return '#10b981';
}

function gpsDelta(ev: TelemetryEvent): number {
  return Math.sqrt(
    Math.pow((ev.gps_lat - ev.inertial_lat) * 111000, 2) +
    Math.pow((ev.gps_lng - ev.inertial_lng) * 111000, 2)
  );
}

export default function CyberSecurityPanel({ route }: CyberSecurityPanelProps) {
  const [selectedAttack, setSelectedAttack] = useState<string>('gps_spoofing');
  const [severity, setSeverity] = useState(0.8);
  const [result, setResult] = useState<AttackSimulationResponse | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [showAlert, setShowAlert] = useState(false);

  const [siemLog, setSiemLog] = useState<TelemetryEvent[]>([]);
  const [isReplaying, setIsReplaying] = useState(false);
  const siemRef = useRef<HTMLDivElement>(null);
  const replayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleSimulate = async () => {
    setIsSimulating(true);
    setResult(null);
    setShowAlert(false);
    setSiemLog([]);
    setIsReplaying(false);
    if (replayRef.current) clearInterval(replayRef.current);

    const dummyRoute = route.length > 0 ? route : [
      { lat: 37.7749, lng: -122.4194, alt: 50 },
      { lat: 37.7800, lng: -122.4100, alt: 55 },
      { lat: 37.7850, lng: -122.4000, alt: 50 },
    ];

    try {
      const res = await simulateCyberAttack(selectedAttack, severity, dummyRoute);
      setResult(res);
      setShowAlert(res.detected);
      // Start SIEM replay
      startSiemReplay(res.telemetry_logs);
    } catch {
      setResult({
        attack_type: selectedAttack,
        detected: true,
        anomaly_score: 87.5,
        defense_action: 'SIMULATION_ERROR',
        telemetry_logs: [],
        safe_reroute: [],
        mitigation_details: '⚠️ Backend unavailable. Start backend to run attack simulation.',
      });
    } finally {
      setIsSimulating(false);
    }
  };

  const startSiemReplay = (logs: TelemetryEvent[]) => {
    if (!logs.length) return;
    setIsReplaying(true);
    let idx = 0;
    replayRef.current = setInterval(() => {
      if (idx >= logs.length) {
        clearInterval(replayRef.current!);
        setIsReplaying(false);
        return;
      }
      setSiemLog(prev => [...prev, logs[idx]]);
      idx++;
    }, 400); // ~400ms per telemetry tick = realistic SIEM feel
  };

  // Auto-scroll SIEM console to bottom
  useEffect(() => {
    if (siemRef.current) {
      siemRef.current.scrollTop = siemRef.current.scrollHeight;
    }
  }, [siemLog]);

  // Cleanup on unmount
  useEffect(() => () => { if (replayRef.current) clearInterval(replayRef.current); }, []);

  const attackInfo = ATTACKS.find(a => a.id === selectedAttack);

  const chartData = result?.telemetry_logs.map(t => ({
    time: `${t.timestamp_s}s`,
    Signal: (t.signal_strength_dbm + 120) * 0.8,
    Battery: t.battery_pct,
    Anomaly: t.anomaly_detected ? 20 : 0,
  }));

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 glass-panel rounded-xl p-3 border border-rose-500/20 bg-rose-500/5">
        <Shield className="w-5 h-5 text-rose-400 flex-shrink-0" />
        <div>
          <p className="text-xs font-bold text-white">Cyber Security Module</p>
          <p className="text-[10px] text-slate-400">Attack simulation & autonomous defense</p>
        </div>
      </div>

      {/* Attack Selector */}
      <div className="space-y-2">
        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Attack Vector</p>
        <div className="grid grid-cols-2 gap-2">
          {ATTACKS.map(a => (
            <button
              key={a.id}
              onClick={() => setSelectedAttack(a.id)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                selectedAttack === a.id
                  ? 'border-opacity-50 text-white'
                  : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20'
              }`}
              style={selectedAttack === a.id ? { borderColor: a.color, background: `${a.color}15`, color: a.color } : {}}
            >
              <span style={{ color: selectedAttack === a.id ? a.color : undefined }}>{a.icon}</span>
              <span className="text-left leading-tight">{a.label}</span>
            </button>
          ))}
        </div>
        {attackInfo && (
          <p className="text-[10px] text-slate-500 px-1 italic">{attackInfo.desc}</p>
        )}
      </div>

      {/* Severity */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium flex items-center gap-1"><Zap className="w-3 h-3" /> Severity</p>
          <span className={`text-xs font-bold font-mono ${severity > 0.7 ? 'text-rose-400' : severity > 0.4 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {severity > 0.7 ? 'CRITICAL' : severity > 0.4 ? 'MODERATE' : 'LOW'} ({(severity * 100).toFixed(0)}%)
          </span>
        </div>
        <input
          type="range" min={0.1} max={1.0} step={0.05} value={severity}
          onChange={e => setSeverity(Number(e.target.value))}
          className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-rose-500"
        />
      </div>

      {/* Simulate Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleSimulate}
        disabled={isSimulating}
        id="run-attack-sim-btn"
        className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-lg hover:shadow-rose-500/25 disabled:opacity-50"
      >
        {isSimulating ? (
          <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Simulating Attack...</>
        ) : (
          <><Shield className="w-4 h-4" /> Simulate Attack</>
        )}
      </motion.button>

      {/* Attack Alert */}
      <AnimatePresence>
        {showAlert && result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-panel rounded-xl p-4 border border-rose-500/30 bg-rose-500/10"
          >
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
              <span className="text-xs font-bold text-rose-400">ATTACK DETECTED</span>
              <span className="ml-auto text-xs font-mono text-rose-300">{result.anomaly_score.toFixed(1)}%</span>
            </div>
            <div className="space-y-1 text-[10px] text-slate-300">
              <p><span className="text-slate-500">Defense:</span> <span className="text-cyan-400 font-mono">{result.defense_action}</span></p>
              <p className="text-slate-400 leading-relaxed">{result.mitigation_details}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SIEM Animated Console */}
      <AnimatePresence>
        {siemLog.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="glass-panel rounded-xl overflow-hidden"
          >
            {/* Console header */}
            <div
              className="flex items-center gap-2 px-3 py-2"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.3)' }}
            >
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[10px] font-mono text-emerald-400 font-bold">SIEM TELEMETRY CONSOLE</span>
              {isReplaying && (
                <span className="ml-auto flex items-center gap-1 text-[9px] text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE
                </span>
              )}
            </div>
            {/* Scrolling log */}
            <div
              ref={siemRef}
              className="p-2 space-y-0.5 font-mono text-[9px] overflow-y-auto"
              style={{ maxHeight: '160px', background: 'rgba(0,0,0,0.5)' }}
            >
              {siemLog.map((ev, i) => {
                const delta = gpsDelta(ev);
                const isAnomaly = ev.anomaly_detected;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-2 px-1 py-0.5 rounded"
                    style={{
                      background: isAnomaly ? 'rgba(244,63,94,0.08)' : 'transparent',
                      borderLeft: isAnomaly ? '2px solid rgba(244,63,94,0.5)' : '2px solid transparent',
                    }}
                  >
                    <span className="text-slate-600 flex-shrink-0">{ev.timestamp_s.toFixed(1)}s</span>
                    <span
                      className="font-bold flex-shrink-0"
                      style={{ color: statusColor(ev.status) }}
                    >
                      [{ev.status}]
                    </span>
                    <span className="text-slate-400">
                      GPS±{delta.toFixed(1)}m
                    </span>
                    <span className="text-slate-500">
                      SIG:{ev.signal_strength_dbm.toFixed(0)}dBm
                    </span>
                    <span className="text-amber-400">
                      BAT:{ev.battery_pct.toFixed(0)}%
                    </span>
                  </motion.div>
                );
              })}
              {isReplaying && (
                <div className="flex items-center gap-1 px-1 text-emerald-400">
                  <span className="animate-pulse">▌</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Telemetry Chart */}
      {result && chartData && chartData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel rounded-xl p-4"
        >
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-3">Telemetry During Attack</p>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 8 }} axisLine={{ stroke: '#334155' }} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 8 }} axisLine={{ stroke: '#334155' }} tickLine={false} />
              <Tooltip contentStyle={{ background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 10 }} />
              <Line type="monotone" dataKey="Signal" stroke="#10b981" strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="Battery" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="Anomaly" stroke="#f43f5e" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 justify-center">
            {[['Signal', '#10b981'], ['Battery', '#f59e0b'], ['Anomaly', '#f43f5e']].map(([k, c]) => (
              <div key={k} className="flex items-center gap-1 text-[9px] text-slate-400">
                <div className="w-3 h-0.5 rounded-full" style={{ background: c as string }} /> {k}
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
