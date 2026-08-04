import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Navigation, Package, Wind, Heart, Plane, Crosshair, Zap, AlertTriangle, CheckCircle, Search, X } from 'lucide-react';
import { Coordinates, WeatherConditions, OptimizationRequest } from '../types';

interface DeliveryFormProps {
  start: Coordinates | null;
  destination: Coordinates | null;
  clickMode: 'start' | 'destination' | null;
  onSetClickMode: (mode: 'start' | 'destination' | null) => void;
  onLocationSelect: (coords: Coordinates, label: string, type: 'start' | 'destination') => void;
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

const PACKAGE_TYPES = [
  { id: 'hot_food', label: '🍲 Hot Food', sub: 'Anti-tilt smooth flight' },
  { id: 'cold_item', label: '🍦 Ice Cream', sub: 'Hyper-speed 35m/s' },
  { id: 'medicine', label: '💊 Medicine', sub: 'Priority corridor' },
  { id: 'standard', label: '📦 Standard', sub: 'Regular parcel' },
];


// Rough drone battery capacity estimates per km (% / km) for estimation
const DRONE_DRAIN_PER_KM: Record<string, number> = {
  'DJI FlyCart 30': 1.8,
  'Matrice 350 RTK': 3.5,
  'Wingcopter 198': 2.2,
  'MedExpress EVTOL': 2.5,
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
      {children}
    </p>
  );
}

// ── Nominatim geocoding search card ──────────────────────────────
interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

interface LocationSearchCardProps {
  type: 'start' | 'destination';
  value: Coordinates | null;
  label: string;
  clickMode: 'start' | 'destination' | null;
  onSetClickMode: (mode: 'start' | 'destination' | null) => void;
  onSelect: (coords: Coordinates, label: string) => void;
  accentColor: string;
  accentBg: string;
  icon: React.ReactNode;
  activeIcon: React.ReactNode;
}

function LocationSearchCard({
  type, value, label, clickMode, onSetClickMode, onSelect, accentColor, accentBg, icon, activeIcon,
}: LocationSearchCardProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isActive = clickMode === type;
  const borderColor = isActive
    ? `${accentColor}66`
    : value
    ? `${accentColor}33`
    : 'var(--border)';

  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5`,
          { headers: { 'Accept-Language': 'en', 'User-Agent': 'DroneRouteAI/1.0' } }
        );
        const data: NominatimResult[] = await res.json();
        setResults(data);
        setOpen(data.length > 0);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 380);
  }, []);

  // Reverse geocode value coordinates to human-readable address string
  useEffect(() => {
    if (!value) {
      setQuery('');
      return;
    }
    let isCancelled = false;
    async function fetchLocationName() {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${value!.lat}&lon=${value!.lng}`,
          { headers: { 'Accept-Language': 'en', 'User-Agent': 'DroneRouteAI/1.0' } }
        );
        const data = await res.json();
        if (!isCancelled && data && data.display_name) {
          const parts = data.display_name.split(',').map((s: string) => s.trim());
          const shortName = parts.length > 3 ? parts.slice(0, 3).join(', ') : data.display_name;
          setQuery(shortName);
        } else if (!isCancelled) {
          setQuery(`Lat: ${value!.lat.toFixed(3)}°, Lng: ${value!.lng.toFixed(3)}°`);
        }
      } catch {
        if (!isCancelled) setQuery(`Lat: ${value!.lat.toFixed(3)}°, Lng: ${value!.lng.toFixed(3)}°`);
      }
    }
    fetchLocationName();
    return () => { isCancelled = true; };
  }, [value]);

  const handlePick = (r: NominatimResult) => {
    const coords = { lat: parseFloat(r.lat), lng: parseFloat(r.lon) };
    const parts = r.display_name.split(',').map(s => s.trim());
    const shortName = parts.length > 3 ? parts.slice(0, 3).join(', ') : r.display_name;
    onSelect(coords, shortName);
    setQuery(shortName);
    setResults([]);
    setOpen(false);
    onSetClickMode(null);
  };

  const clear = () => {
    setQuery('');
    setResults([]);
    setOpen(false);
    onSelect({ lat: 0, lng: 0 }, '');
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      {/* Main card */}
      <div
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all"
        style={{
          background: isActive ? accentBg : value ? accentBg + '80' : 'var(--surface-card)',
          border: `1px solid ${borderColor}`,
        }}
      >
        {/* Icon */}
        <button
          type="button"
          onClick={() => onSetClickMode(isActive ? null : type)}
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
          style={{ background: value || isActive ? accentBg : 'var(--input-bg)' }}
          title={`Click map to set ${label}`}
        >
          {isActive ? activeIcon : icon}
        </button>

        {/* Search input */}
        <div className="flex-1 min-w-0">
          <p className="text-[8px] uppercase tracking-widest mb-0.5" style={{ color: accentColor, opacity: 0.7 }}>{label}</p>
          <div className="flex items-center gap-1">
            <Search className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => { setQuery(e.target.value); search(e.target.value); }}
              onFocus={() => { if (results.length) setOpen(true); }}
              placeholder={`Search ${label} location…`}
              className="flex-1 min-w-0 bg-transparent outline-none text-[11px] font-medium truncate"
              style={{ color: 'var(--text-primary)' }}
            />
            {loading && <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin flex-shrink-0" style={{ color: accentColor }} />}
            {query && !loading && (
              <button type="button" onClick={clear} className="flex-shrink-0">
                <X className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
              </button>
            )}
          </div>
        </div>

        {isActive && <span className="text-[8px] font-bold animate-pulse flex-shrink-0" style={{ color: accentColor }}>ACTIVE</span>}
      </div>

      {/* Dropdown results */}
      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4, scaleY: 0.95 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -4, scaleY: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl overflow-hidden"
            style={{
              background: 'var(--surface-glass-br)',
              border: '1px solid var(--border)',
              backdropFilter: 'blur(24px)',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            {results.map((r, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handlePick(r)}
                className="w-full text-left px-3 py-2 text-[11px] transition-colors flex items-start gap-2"
                style={{ borderBottom: i < results.length - 1 ? '1px solid var(--border)' : 'none' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--tab-hover-bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: accentColor }} />
                <span style={{ color: 'var(--text-primary)' }} className="truncate">{r.display_name}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


interface SliderRowProps {
  label: string; value: number; min: number; max: number; step: number;
  unit: string; color?: string; onChange: (v: number) => void; id: string;
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

// Haversine for rough distance estimate in the form
function roughDistanceKm(a: Coordinates, b: Coordinates): number {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const sin2 = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(sin2), Math.sqrt(1 - sin2));
}

export default function DeliveryForm({
  start, destination, clickMode, onSetClickMode, onLocationSelect, onSubmit, isLoading
}: DeliveryFormProps) {
  const [droneModel, setDroneModel] = useState('DJI FlyCart 30');
  const [payloadKg, setPayloadKg] = useState(1.5);
  const [batteryPct, setBatteryPct] = useState(100);
  const [priority, setPriority] = useState('balanced');
  const [packageType, setPackageType] = useState('standard');
  const [weatherMode, setWeatherMode] = useState<'simulated' | 'live'>('simulated');
  const [emergency, setEmergency] = useState(false);
  const [wind, setWind] = useState(5.5);
  const [windDir, setWindDir] = useState(90);
  const [rain, setRain] = useState(0);

  // Live battery sufficiency estimate
  const batteryEstimate = useMemo(() => {
    if (!start || !destination) return null;
    const dist = roughDistanceKm(start, destination);
    const baseDrain = DRONE_DRAIN_PER_KM[droneModel] || 2.5;
    const specs = { 'DJI FlyCart 30': 30, 'Matrice 350 RTK': 2.7, 'Wingcopter 198': 6, 'MedExpress EVTOL': 5 };
    const maxPayload = specs[droneModel as keyof typeof specs] || 5;
    const payloadFactor = 1 + 0.3 * (payloadKg / maxPayload);
    const windFactor = 1 + 0.05 * wind;
    const rainFactor = 1 + 0.1 * rain;
    const estimated = dist * baseDrain * payloadFactor * windFactor * rainFactor;
    return { estimated: Math.min(estimated, 120), distance: dist, sufficient: estimated <= batteryPct };
  }, [start, destination, droneModel, payloadKg, wind, rain, batteryPct]);

  const handleSubmit = () => {
    const weather: WeatherConditions = {
      wind_speed_m_s: wind,
      wind_direction_deg: windDir,
      rain_intensity_mm_h: rain,
      temperature_c: 22,
      visibility_km: rain > 5 ? 5 : 10,
      is_simulated: weatherMode === 'simulated',
    };
    onSubmit({
      drone_model: droneModel,
      payload_weight_kg: payloadKg,
      initial_battery_pct: batteryPct,
      priority,
      package_type: packageType,
      weather_mode: weatherMode,
      simulated_weather: weather,
      emergency_medical: emergency,
    });
  };


  const batteryColor = batteryPct >= 80 ? '#10b981' : batteryPct >= 50 ? '#f59e0b' : '#f43f5e';
  const batteryBg = batteryPct >= 80 ? 'rgba(16,185,129,0.08)' : batteryPct >= 50 ? 'rgba(245,158,11,0.08)' : 'rgba(244,63,94,0.08)';
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
          <LocationSearchCard
            type="start"
            value={start}
            label="Origin"
            clickMode={clickMode}
            onSetClickMode={onSetClickMode}
            onSelect={(coords, lbl) => onLocationSelect(coords, lbl, 'start')}
            accentColor="#10b981"
            accentBg="rgba(16,185,129,0.08)"
            icon={<MapPin className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />}
            activeIcon={<Crosshair className="w-3.5 h-3.5 animate-pulse" style={{ color: '#10b981' }} />}
          />

          {/* Destination */}
          <LocationSearchCard
            type="destination"
            value={destination}
            label="Destination"
            clickMode={clickMode}
            onSetClickMode={onSetClickMode}
            onSelect={(coords, lbl) => onLocationSelect(coords, lbl, 'destination')}
            accentColor="#06b6d4"
            accentBg="rgba(6,182,212,0.08)"
            icon={<Navigation className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />}
            activeIcon={<Crosshair className="w-3.5 h-3.5 animate-pulse" style={{ color: '#06b6d4' }} />}
          />

          {/* Live battery estimate */}
          <AnimatePresence>
            {batteryEstimate && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div
                  className="rounded-xl px-3 py-2.5 flex items-start gap-2.5"
                  style={{
                    background: batteryEstimate.sufficient ? 'rgba(16,185,129,0.06)' : 'rgba(244,63,94,0.06)',
                    border: `1px solid ${batteryEstimate.sufficient ? 'rgba(16,185,129,0.18)' : 'rgba(244,63,94,0.25)'}`,
                  }}
                >
                  {batteryEstimate.sufficient
                    ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    : <AlertTriangle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0 mt-0.5 animate-pulse" />
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold" style={{ color: batteryEstimate.sufficient ? '#10b981' : '#f43f5e' }}>
                      {batteryEstimate.sufficient ? 'Battery sufficient (estimate)' : '⚠ May be insufficient (estimate)'}
                    </p>
                    <p className="text-[9px] text-slate-600 mt-0.5">
                      ~{batteryEstimate.distance.toFixed(1)} km · est. {batteryEstimate.estimated.toFixed(0)}% needed
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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

          {/* Cargo Package Type Selector */}
          <div className="space-y-1.5 pt-2">
            <SectionLabel><Package className="w-3 h-3 text-cyan-400" /> Cargo Package Type</SectionLabel>
            <div className="grid grid-cols-2 gap-1.5">
              {PACKAGE_TYPES.map(pkg => (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => setPackageType(pkg.id)}
                  className="p-2 rounded-xl text-left transition-all"
                  style={{
                    background: packageType === pkg.id ? 'rgba(6,182,212,0.12)' : 'var(--input-bg)',
                    border: `1px solid ${packageType === pkg.id ? 'rgba(6,182,212,0.6)' : 'var(--border)'}`,
                    boxShadow: packageType === pkg.id ? '0 0 16px rgba(6,182,212,0.25)' : 'none',
                  }}
                >
                  <p className="text-[10px] font-bold" style={{ color: packageType === pkg.id ? '#06b6d4' : 'var(--text-primary)' }}>{pkg.label}</p>
                  <p className="text-[8px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{pkg.sub}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Battery slider with visual gauge */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-slate-500">Initial Battery</span>
              <div className="flex items-center gap-1.5">
                <Zap className="w-3 h-3" style={{ color: batteryColor }} />
                <span className="text-[11px] font-mono font-semibold" style={{ color: batteryColor }}>{batteryPct}%</span>
              </div>
            </div>
            <div className="relative">
              <input
                type="range" min={10} max={100} step={1} value={batteryPct}
                onChange={e => setBatteryPct(Number(e.target.value))}
                id="battery-slider"
                style={{ background: `linear-gradient(to right, ${batteryColor} ${(batteryPct - 10) / 90 * 100}%, rgba(255,255,255,0.08) ${(batteryPct - 10) / 90 * 100}%)` }}
                className="w-full"
              />
            </div>
            {/* Battery visual */}
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: batteryBg, border: `1px solid ${batteryColor}20` }}>
              {/* Battery icon */}
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <div className="w-8 h-4 rounded-sm relative" style={{ border: `1.5px solid ${batteryColor}60`, background: 'transparent' }}>
                  <motion.div
                    animate={{ width: `${batteryPct}%` }}
                    transition={{ duration: 0.3 }}
                    className="absolute left-0 top-0 h-full rounded-[2px]"
                    style={{ background: `linear-gradient(90deg, ${batteryColor}, ${batteryColor}aa)`, boxShadow: `0 0 6px ${batteryColor}44` }}
                  />
                </div>
                <div className="w-1 h-2 rounded-r-sm" style={{ background: batteryColor, opacity: 0.6 }} />
              </div>
              <span className="text-[10px] font-medium" style={{ color: batteryColor }}>
                {batteryPct >= 80 ? 'Fully charged' : batteryPct >= 50 ? 'Moderate charge' : batteryPct >= 30 ? 'Low charge' : 'Critical — may fail to reach'}
              </span>
            </div>
          </div>
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
              : 'text-white glow-btn-primary'
          }`}
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
