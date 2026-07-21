import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Navigation, Package, Wind, Heart, Plane, Crosshair } from 'lucide-react';
import { Coordinates, WeatherConditions, OptimizationRequest } from '../types';

interface DeliveryFormProps {
  start: Coordinates | null;
  destination: Coordinates | null;
  clickMode: 'start' | 'destination' | null;
  onSetClickMode: (mode: 'start' | 'destination' | null) => void;
  onSubmit: (data: Partial<OptimizationRequest>) => void;
  isLoading: boolean;
}

const DRONE_MODELS = ['DJI FlyCart 30', 'Matrice 350 RTK', 'Wingcopter 198', 'MedExpress EVTOL'];
const PRIORITIES = [
  { id: 'balanced', label: 'Balanced', icon: '⚖️' },
  { id: 'speed', label: 'Speed', icon: '⚡' },
  { id: 'battery', label: 'Battery', icon: '🔋' },
  { id: 'safety', label: 'Safety', icon: '🛡️' },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
      {children}
    </p>
  );
}

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  color?: string;
  onChange: (v: number) => void;
  id: string;
}

function SliderRow({ label, value, min, max, step, unit, color = '#10b981', onChange, id }: SliderRowProps) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-[10px] text-slate-500">{label}</span>
        <span className="text-[11px] font-mono font-semibold" style={{ color }}>{value}{unit}</span>
      </div>
      <div className="relative">
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          id={id}
          style={{ background: `linear-gradient(to right, ${color} ${pct}%, rgba(255,255,255,0.08) ${pct}%)` }}
          className="w-full"
        />
      </div>
    </div>
  );
}

export default function DeliveryForm({
  start, destination, clickMode, onSetClickMode, onSubmit, isLoading
}: DeliveryFormProps) {
  const [droneModel, setDroneModel] = useState('DJI FlyCart 30');
  const [payloadKg, setPayloadKg] = useState(1.5);
  const [batteryPct, setBatteryPct] = useState(100);
  const [priority, setPriority] = useState('balanced');
  const [weatherMode, setWeatherMode] = useState<'simulated' | 'live'>('simulated');
  const [emergency, setEmergency] = useState(false);
  const [wind, setWind] = useState(5.5);
  const [windDir, setWindDir] = useState(90);
  const [rain, setRain] = useState(0);

  const handleSubmit = () => {
    const weather: WeatherConditions = {
      wind_speed_m_s: wind,
      wind_direction_deg: windDir,
      rain_intensity_mm_h: rain,
      temperature_c: 22,
      visibility_km: rain > 5 ? 5 : 10,
      is_simulated: weatherMode === 'simulated',
    };
    onSubmit({ drone_model: droneModel, payload_weight_kg: payloadKg, initial_battery_pct: batteryPct, priority, weather_mode: weatherMode, simulated_weather: weather, emergency_medical: emergency });
  };

  const batteryColor = batteryPct >= 80 ? '#10b981' : batteryPct >= 50 ? '#f59e0b' : '#f43f5e';
  const canRun = !!(start && destination);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[11px] font-bold text-white tracking-widest uppercase">Mission Config</h2>
            <p className="text-[9px] text-slate-600 mt-0.5">Configure delivery parameters</p>
          </div>
          {emergency && (
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="flex items-center gap-1 text-[9px] bg-rose-500/15 text-rose-400 border border-rose-500/25 px-2 py-1 rounded-full font-bold tracking-wide"
            >
              <Heart className="w-2.5 h-2.5" /> MED
            </motion.div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5">

        {/* ── LOCATION PICKERS ── */}
        <div className="space-y-2">
          <SectionLabel>📍 Location</SectionLabel>

          {/* Origin */}
          <button
            id="set-start-btn"
            onClick={() => onSetClickMode(clickMode === 'start' ? null : 'start')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs transition-all ${
              clickMode === 'start'
                ? 'bg-emerald-500/10 text-emerald-400'
                : start
                ? 'bg-emerald-500/5 text-emerald-300'
                : 'text-slate-500 hover:text-slate-300'
            }`}
            style={{
              border: `1px solid ${clickMode === 'start' ? 'rgba(16,185,129,0.4)' : start ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.07)'}`,
            }}
          >
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${start ? 'bg-emerald-500/20' : 'bg-white/5'}`}>
              {clickMode === 'start' ? <Crosshair className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> : <MapPin className="w-3.5 h-3.5" />}
            </div>
            <div className="flex-1 text-left min-w-0">
              {start ? (
                <>
                  <p className="text-[9px] text-slate-500 uppercase tracking-wider">Origin</p>
                  <p className="font-mono text-[11px] text-emerald-300 truncate">{start.lat.toFixed(5)}, {start.lng.toFixed(5)}</p>
                </>
              ) : (
                <p className="text-slate-500 text-[11px]">Click map or search above</p>
              )}
            </div>
            {clickMode === 'start' && <span className="text-[9px] text-emerald-400 font-bold animate-pulse flex-shrink-0">ACTIVE</span>}
          </button>

          {/* Destination */}
          <button
            id="set-destination-btn"
            onClick={() => onSetClickMode(clickMode === 'destination' ? null : 'destination')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs transition-all ${
              clickMode === 'destination'
                ? 'bg-cyan-500/10 text-cyan-400'
                : destination
                ? 'bg-cyan-500/5 text-cyan-300'
                : 'text-slate-500 hover:text-slate-300'
            }`}
            style={{
              border: `1px solid ${clickMode === 'destination' ? 'rgba(6,182,212,0.4)' : destination ? 'rgba(6,182,212,0.2)' : 'rgba(255,255,255,0.07)'}`,
            }}
          >
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${destination ? 'bg-cyan-500/20' : 'bg-white/5'}`}>
              {clickMode === 'destination' ? <Crosshair className="w-3.5 h-3.5 text-cyan-400 animate-pulse" /> : <Navigation className="w-3.5 h-3.5" />}
            </div>
            <div className="flex-1 text-left min-w-0">
              {destination ? (
                <>
                  <p className="text-[9px] text-slate-500 uppercase tracking-wider">Destination</p>
                  <p className="font-mono text-[11px] text-cyan-300 truncate">{destination.lat.toFixed(5)}, {destination.lng.toFixed(5)}</p>
                </>
              ) : (
                <p className="text-slate-500 text-[11px]">Click map or search above</p>
              )}
            </div>
            {clickMode === 'destination' && <span className="text-[9px] text-cyan-400 font-bold animate-pulse flex-shrink-0">ACTIVE</span>}
          </button>
        </div>

        {/* ── DRONE MODEL ── */}
        <div>
          <SectionLabel><Plane className="w-3 h-3" /> Drone Model</SectionLabel>
          <div className="relative">
            <select
              value={droneModel}
              onChange={e => setDroneModel(e.target.value)}
              id="drone-model-select"
              className="w-full input-dark rounded-xl px-3 py-2.5 text-xs pr-8"
            >
              {DRONE_MODELS.map(m => <option key={m} value={m} className="bg-[#0a1628]">{m}</option>)}
            </select>
          </div>
        </div>

        {/* ── SLIDERS ── */}
        <div className="space-y-4">
          <SectionLabel><Package className="w-3 h-3" /> Payload & Battery</SectionLabel>
          <SliderRow id="payload-slider" label="Payload Weight" value={payloadKg} min={0.1} max={25} step={0.1} unit=" kg" color="#10b981" onChange={setPayloadKg} />
          <SliderRow id="battery-slider" label="Initial Battery" value={batteryPct} min={10} max={100} step={1} unit="%" color={batteryColor} onChange={setBatteryPct} />
        </div>

        {/* ── PRIORITY ── */}
        <div>
          <SectionLabel>🎯 Delivery Priority</SectionLabel>
          <div className="grid grid-cols-2 gap-1.5">
            {PRIORITIES.map(p => (
              <button
                key={p.id}
                onClick={() => setPriority(p.id)}
                className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-[11px] font-medium transition-all border ${
                  priority === p.id
                    ? 'bg-emerald-500/12 border-emerald-500/30 text-emerald-300'
                    : 'border-white/[0.06] bg-white/[0.03] text-slate-500 hover:border-white/10 hover:text-slate-400'
                }`}
              >
                <span>{p.icon}</span> {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── WEATHER ── */}
        <div>
          <SectionLabel><Wind className="w-3 h-3" /> Weather</SectionLabel>
          <div className="grid grid-cols-2 gap-1.5 mb-3">
            {(['simulated', 'live'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setWeatherMode(mode)}
                className={`py-2 rounded-lg text-[11px] font-medium transition-all border ${
                  weatherMode === mode
                    ? 'bg-cyan-500/12 border-cyan-500/30 text-cyan-300'
                    : 'border-white/[0.06] bg-white/[0.03] text-slate-500 hover:border-white/10'
                }`}
              >
                {mode === 'live' ? '🌐 Live API' : '🎛️ Simulated'}
              </button>
            ))}
          </div>

          {weatherMode === 'simulated' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-3 pt-3"
              style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
            >
              <SliderRow id="wind-slider" label="Wind Speed" value={wind} min={0} max={20} step={0.5} unit=" m/s" color="#06b6d4" onChange={setWind} />
              <SliderRow id="winddir-slider" label="Wind Direction" value={windDir} min={0} max={359} step={1} unit="°" color="#06b6d4" onChange={setWindDir} />
              <SliderRow id="rain-slider" label="Rain Intensity" value={rain} min={0} max={20} step={0.5} unit=" mm/h" color="#8b5cf6" onChange={setRain} />
            </motion.div>
          )}
        </div>

        {/* ── EMERGENCY MODE ── */}
        <button
          onClick={() => setEmergency(!emergency)}
          id="emergency-mode-btn"
          className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-xs font-semibold transition-all border ${
            emergency
              ? 'bg-rose-500/12 border-rose-500/30 text-rose-400'
              : 'border-white/[0.06] bg-white/[0.02] text-slate-500 hover:border-rose-500/20 hover:text-rose-400/70'
          }`}
        >
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${emergency ? 'bg-rose-500/20' : 'bg-white/5'}`}>
            <Heart className={`w-4 h-4 ${emergency ? 'text-rose-400' : ''}`} />
          </div>
          <div className="text-left">
            <p>{emergency ? '🚨 Emergency Medical — ACTIVE' : 'Emergency Medical Mode'}</p>
            {emergency && <p className="text-[9px] font-normal text-rose-400/70 mt-0.5">Priority: Speed override enabled</p>}
          </div>
        </button>
      </div>

      {/* ── SUBMIT ── */}
      <div className="px-4 pb-4 pt-3 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <motion.button
          whileHover={canRun && !isLoading ? { scale: 1.02, y: -1 } : {}}
          whileTap={canRun && !isLoading ? { scale: 0.98 } : {}}
          onClick={handleSubmit}
          disabled={!canRun || isLoading}
          id="run-optimization-btn"
          className={`w-full py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2.5 relative overflow-hidden ${
            !canRun || isLoading
              ? 'bg-white/[0.04] text-slate-600 cursor-not-allowed border border-white/[0.06]'
              : 'text-white shadow-lg border border-emerald-400/20'
          }`}
          style={canRun && !isLoading ? {
            background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #06b6d4 100%)',
            boxShadow: '0 8px 32px rgba(16,185,129,0.3), 0 0 0 1px rgba(16,185,129,0.15)',
          } : {}}
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Running GA Optimization...
            </>
          ) : (
            <>
              <span className="text-base">🧬</span>
              Run GA Optimization
              {canRun && (
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-700" />
              )}
            </>
          )}
        </motion.button>

        {!canRun && (
          <p className="text-center text-[10px] text-slate-600 mt-2">
            Set origin & destination to continue
          </p>
        )}
      </div>
    </div>
  );
}
