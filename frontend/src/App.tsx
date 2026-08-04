import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from './components/Navbar';
import DeliveryForm from './components/DeliveryForm';
import MapView from './components/MapView';
import TelemetryDashboard from './components/TelemetryDashboard';
import GAVisualizer from './components/GAVisualizer';
import GADecisionPanel from './components/GADecisionPanel';
import AIExplanationPanel from './components/AIExplanationPanel';
import CyberSecurityPanel from './components/CyberSecurityPanel';
import AltitudeProfile from './components/AltitudeProfile';
import ReportExporter from './components/ReportExporter';
import StatusBar from './components/StatusBar';
import { OptimizationResponse, Coordinates, GenerationMetric, WSMessage } from './types';
import { optimizeRoute, createGAWebSocket } from './services/api';
import { audioTelemetry } from './services/audioTelemetry';
import { ThemeProvider, useTheme } from './ThemeContext';

type ActivePanel = 'dashboard' | 'ga' | 'decision' | 'ai' | 'security' | 'history';

const PANEL_TABS: { id: ActivePanel; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Telemetry', icon: '📊' },
  { id: 'ga', label: 'GA Evolution', icon: '🧬' },
  { id: 'decision', label: 'GA Insights', icon: '🔬' },
  { id: 'ai', label: 'AI Rationale', icon: '🤖' },
  { id: 'security', label: 'CyberSec', icon: '🔐' },
  { id: 'history', label: 'History', icon: '📋' },
];

interface BatteryError {
  message: string;
  required: number;
  available: number;
  deficit: number;
}

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}

function AppInner() {
  const { theme, toggleTheme } = useTheme();
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [batteryError, setBatteryError] = useState<BatteryError | null>(null);
  const [activePanel, setActivePanel] = useState<ActivePanel>('dashboard');
  const [showExporter, setShowExporter] = useState(false);
  const [clickMode, setClickMode] = useState<'start' | 'destination' | null>(null);
  const [start, setStart] = useState<Coordinates | null>(null);
  const [destination, setDestination] = useState<Coordinates | null>(null);

  const [selectedRouteType, setSelectedRouteType] = useState<'optimal' | 'balanced' | 'direct'>('optimal');
  const [mobileTab, setMobileTab] = useState<'map' | 'config' | 'telemetry'>('map');
  const [activeHoverWaypointIdx, setActiveHoverWaypointIdx] = useState<number | null>(null);
  const lastFormDataRef = useRef<any>(null);

  // Live GA streaming state
  const [liveGenerations, setLiveGenerations] = useState<GenerationMetric[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const wsRef = useRef<{ close: () => void } | null>(null);

  const handleMapClick = useCallback((coords: Coordinates) => {
    if (clickMode === 'start') { setStart(coords); setClickMode('destination'); }
    else if (clickMode === 'destination') { setDestination(coords); setClickMode(null); }
  }, [clickMode]);

  const handleLocationSelect = useCallback((coords: Coordinates, type: 'start' | 'destination') => {
    if (type === 'start') { setStart(coords); setClickMode(null); }
    else { setDestination(coords); setClickMode(null); }
  }, []);

  const handleRunOptimization = useCallback(async (formData: any) => {
    if (!start || !destination) { setError('Please select both origin and destination.'); return; }

    lastFormDataRef.current = formData;

    // Close any existing WS
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }

    setIsLoading(true);
    setError(null);
    setBatteryError(null);
    setOptimizationResult(null);
    setLiveGenerations([]);
    setIsStreaming(true);
    setActivePanel('ga');
    setMobileTab('map');

    const reqPayload = { ...formData, start, destination };

    let wsSucceeded = false;

    try {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('WS_TIMEOUT'));
        }, 2000);

        const ws = createGAWebSocket(
          reqPayload,
          (msg: WSMessage) => {
            clearTimeout(timeout);
            wsSucceeded = true;

            if (msg.type === 'generation') {
              setLiveGenerations(prev => [...prev, msg.data]);
            } else if (msg.type === 'result') {
              setOptimizationResult(msg.data);
              setIsStreaming(false);
              setIsLoading(false);
              setActivePanel('dashboard');

              // Announce audio mission start telemetry
              audioTelemetry.announceMissionStart(
                msg.data.ga_route.total_distance_km,
                msg.data.ga_route.estimated_flight_time_min,
                msg.data.ga_route.battery_consumed_pct
              );
              resolve();
            } else if (msg.type === 'error') {
              if (msg.error === 'INSUFFICIENT_BATTERY') {
                setBatteryError({
                  message: msg.message,
                  required: msg.battery_required_pct ?? 0,
                  available: msg.battery_available_pct ?? 0,
                  deficit: msg.deficit_pct ?? 0,
                });
              } else {
                setError(msg.message);
              }
              setIsStreaming(false);
              setIsLoading(false);
              reject(new Error(msg.message));
            }
          },
          () => {
            if (!wsSucceeded) {
              clearTimeout(timeout);
              reject(new Error('WS_CLOSED'));
            }
          }
        );

        wsRef.current = ws;
      });
    } catch (wsErr: any) {
      if (!wsSucceeded) {
        setIsStreaming(false);
        setLiveGenerations([]);
        try {
          const result = await optimizeRoute(reqPayload);
          setOptimizationResult(result);
          setActivePanel('dashboard');

          audioTelemetry.announceMissionStart(
            result.ga_route.total_distance_km,
            result.ga_route.estimated_flight_time_min,
            result.ga_route.battery_consumed_pct
          );
        } catch (e: any) {
          const msg: string = e.message || '';
          if (msg.startsWith('INSUFFICIENT_BATTERY')) {
            const parts = msg.split('|');
            setBatteryError({
              message: parts[1] || 'Insufficient battery to reach destination.',
              required: parseFloat(parts[2]) || 0,
              available: parseFloat(parts[3]) || 0,
              deficit: parseFloat(parts[4]) || 0,
            });
          } else {
            setError(msg || 'Optimization failed. Check that the backend is running at port 8000.');
          }
        } finally {
          setIsLoading(false);
        }
      }
    }
  }, [start, destination]);

  const handleInjectHazard = useCallback(() => {
    const currentForm = lastFormDataRef.current || { priority: 'safety', payload_weight_kg: 1.5, drone_model: 'DJI FlyCart 30', initial_battery_pct: 100, weather_mode: 'simulated', emergency_medical: false };
    const hazardForm = {
      ...currentForm,
      priority: 'safety',
      simulated_weather: {
        wind_speed_m_s: 12.5,
        wind_direction_deg: 210.0,
        rain_intensity_mm_h: 8.0,
        temperature_c: 18.0,
        visibility_km: 4.0,
        is_simulated: true,
      },
    };
    handleRunOptimization(hazardForm);
  }, [handleRunOptimization]);


  return (
    <div className={`min-h-screen flex flex-col hero-gradient ${theme}`} style={{ height: '100vh', overflow: 'hidden' }}>
      <Navbar
        onExport={() => optimizationResult && setShowExporter(true)}
        hasResults={!!optimizationResult}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <div className="flex flex-1 min-h-0 relative pb-14 lg:pb-0">
        {/* ── LEFT: Mission Config ── */}
        <motion.aside
          initial={{ x: -320, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1], delay: 0.1 }}
          className={`w-full lg:w-72 flex-shrink-0 flex-col glass border-r overflow-y-auto ${
            mobileTab === 'config' ? 'flex' : 'hidden lg:flex'
          }`}
          style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}
        >
          <DeliveryForm
            start={start}
            destination={destination}
            onSetClickMode={setClickMode}
            clickMode={clickMode}
            onLocationSelect={(coords, _label, type) => handleLocationSelect(coords, type)}
            onSubmit={handleRunOptimization}
            isLoading={isLoading}
          />
        </motion.aside>

        {/* ── CENTER: Map ── */}
        <main className={`flex-1 flex-col min-w-0 relative ${
          mobileTab === 'map' ? 'flex' : 'hidden lg:flex'
        }`}>
          <MapView
            start={start}
            destination={destination}
            optimizationResult={optimizationResult}
            onMapClick={handleMapClick}
            clickMode={clickMode}
            onLocationSelect={handleLocationSelect}
            selectedRouteType={selectedRouteType}
            onSelectRouteType={setSelectedRouteType}
            onInjectHazard={handleInjectHazard}
            activeWaypointIdx={activeHoverWaypointIdx}
          />

          {/* Docked 3D Altitude & Terrain Profile HUD */}
          <div className="p-3.5 border-t flex-shrink-0 z-10" style={{ background: 'var(--bg-main)', borderTop: '1px solid var(--border)' }}>
            <AltitudeProfile
              route={optimizationResult?.ga_route ?? null}
              activeWaypointIdx={activeHoverWaypointIdx}
              onHoverWaypoint={setActiveHoverWaypointIdx}
            />
          </div>


          {/* Battery Insufficient Toast */}
          <AnimatePresence>
            {batteryError && (
              <motion.div
                initial={{ opacity: 0, y: 40, scale: 0.93 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 40, scale: 0.93 }}
                transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 w-[460px] max-w-[calc(100vw-2rem)]"
                style={{
                  background: 'rgba(10, 6, 6, 0.96)',
                  border: '1px solid rgba(244,63,94,0.45)',
                  borderTop: '1px solid rgba(244,63,94,0.7)',
                  borderRadius: '16px',
                  boxShadow: '0 8px 48px rgba(244,63,94,0.25), 0 0 0 1px rgba(244,63,94,0.1)',
                  backdropFilter: 'blur(32px)',
                }}
              >
                {/* Red pulsing header */}
                <div className="flex items-center gap-3 px-4 pt-4 pb-3" style={{ borderBottom: '1px solid rgba(244,63,94,0.15)' }}>
                  <div className="relative flex-shrink-0">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl"
                      style={{ background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.3)' }}>
                      🔋
                    </div>
                    <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-rose-500 border-2 border-[#0a0606]"
                      style={{ animation: 'live-ping 1.5s ease-in-out infinite' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-rose-400 font-bold text-sm tracking-wide">INSUFFICIENT BATTERY</p>
                    <p className="text-[10px] text-rose-400/60 font-medium">Drone cannot complete this mission</p>
                  </div>
                  <button
                    onClick={() => setBatteryError(null)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-rose-400 transition-colors flex-shrink-0"
                    style={{ background: 'rgba(255,255,255,0.05)' }}
                  >✕</button>
                </div>

                {/* Battery bars */}
                <div className="px-4 py-3 space-y-2">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-500">Available Battery</span>
                      <span className="font-mono text-amber-400 font-bold">{batteryError.available.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${batteryError.available}%` }}
                        transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
                        className="h-full rounded-full"
                        style={{ background: 'linear-gradient(90deg, #f59e0b, #f59e0b88)' }}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-500">Required Battery</span>
                      <span className="font-mono text-rose-400 font-bold">{batteryError.required.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(batteryError.required, 100)}%` }}
                        transition={{ duration: 0.8, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
                        className="h-full rounded-full"
                        style={{ background: 'linear-gradient(90deg, #f43f5e, #f43f5e88)', boxShadow: '0 0 8px rgba(244,63,94,0.4)' }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-600">Deficit</span>
                    <span className="text-[11px] font-bold font-mono text-rose-400">-{batteryError.deficit.toFixed(1)}%</span>
                  </div>
                </div>

                <div className="px-4 pb-4">
                  <p className="text-[11px] text-slate-400 leading-relaxed">{batteryError.message}</p>
                  <div className="flex gap-2 mt-3">
                    <div className="flex-1 text-[10px] text-center py-2 rounded-lg font-medium text-amber-400"
                      style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                      ⬆ Increase Battery
                    </div>
                    <div className="flex-1 text-[10px] text-center py-2 rounded-lg font-medium text-cyan-400"
                      style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)' }}>
                      📦 Reduce Payload
                    </div>
                    <div className="flex-1 text-[10px] text-center py-2 rounded-lg font-medium text-violet-400"
                      style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}>
                      📍 Shorter Route
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Generic Error toast */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 30, scale: 0.95 }}
                className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 glass-bright px-5 py-3 rounded-xl text-xs font-medium shadow-2xl flex items-center gap-2"
                style={{ border: '1px solid rgba(244,63,94,0.3)', color: '#fda4af' }}
                onClick={() => setError(null)}
              >
                <span className="text-rose-400">⚠</span>
                {error}
                <span className="ml-2 text-slate-500 cursor-pointer">✕</span>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* ── RIGHT: Analytics Panel ── */}
        <motion.aside
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1], delay: 0.15 }}
          className={`w-full lg:w-[380px] flex-shrink-0 flex-col glass ${
            mobileTab === 'telemetry' ? 'flex' : 'hidden lg:flex'
          }`}
          style={{ borderLeft: '1px solid rgba(255,255,255,0.06)' }}
        >
          {/* Tab bar */}
          <div className="flex items-center gap-1 p-2 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            {PANEL_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActivePanel(tab.id)}
                className={`panel-tab flex items-center gap-1.5 ${activePanel === tab.id ? 'active' : ''}`}
              >
                <span className="text-[12px]">{tab.icon}</span>
                <span className="hidden lg:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Panel content */}
          <div className="flex-1 overflow-y-auto p-4">
            <AnimatePresence mode="wait">
              {activePanel === 'dashboard' && (
                <motion.div key="dashboard" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
                  <TelemetryDashboard result={optimizationResult} isLoading={isLoading} selectedRouteType={selectedRouteType} />
                </motion.div>
              )}
              {activePanel === 'ga' && (
                <motion.div key="ga" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
                  <GAVisualizer
                    result={optimizationResult}
                    liveGenerations={liveGenerations}
                    isStreaming={isStreaming}
                  />
                </motion.div>
              )}
              {activePanel === 'decision' && (
                <motion.div key="decision" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
                  <GADecisionPanel
                    result={optimizationResult}
                    liveGenerations={liveGenerations}
                    isStreaming={isStreaming}
                    selectedRouteType={selectedRouteType}
                    onSelectRouteType={setSelectedRouteType}
                  />
                </motion.div>
              )}

              {activePanel === 'ai' && (
                <motion.div key="ai" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
                  <AIExplanationPanel result={optimizationResult} />
                </motion.div>
              )}
              {activePanel === 'security' && (
                <motion.div key="security" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
                  <CyberSecurityPanel route={optimizationResult?.ga_route?.waypoints ?? []} />
                </motion.div>
              )}
              {activePanel === 'history' && (
                <motion.div key="history" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
                  {/* Inline history panel (not a modal) */}
                  <MissionHistoryInline />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.aside>
      </div>

      {/* ── MOBILE BOTTOM NAVIGATION BAR ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass-bright px-4 py-2 border-t border-white/10 flex items-center justify-around">
        <button
          onClick={() => setMobileTab('map')}
          className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            mobileTab === 'map'
              ? 'text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="text-base">🗺️</span>
          <span>Map</span>
        </button>

        <button
          onClick={() => setMobileTab('config')}
          className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            mobileTab === 'config'
              ? 'text-cyan-400 bg-cyan-500/15 border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="text-base">⚙️</span>
          <span>Mission</span>
        </button>

        <button
          onClick={() => setMobileTab('telemetry')}
          className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl text-xs font-semibold transition-all relative ${
            mobileTab === 'telemetry'
              ? 'text-violet-400 bg-violet-500/15 border border-violet-500/30 shadow-[0_0_12px_rgba(139,92,246,0.25)]'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="text-base">📊</span>
          <span>Telemetry</span>
          {optimizationResult && (
            <span className="absolute top-1 right-3 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          )}
        </button>
      </div>

      <StatusBar isLoading={isLoading} result={optimizationResult} batteryError={batteryError !== null} />

      {/* Modals */}
      <AnimatePresence>
        {showExporter && optimizationResult && (
          <ReportExporter result={optimizationResult} onClose={() => setShowExporter(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Inline Mission History (fits inside the right panel) ──────────
import { useState as useStateInline, useEffect as useEffectInline } from 'react';
import { MissionSummary } from './types';
import { fetchMissions } from './services/api';
import { History, RefreshCw } from 'lucide-react';

function MissionHistoryInline() {
  const [missions, setMissions] = useStateInline<MissionSummary[]>([]);
  const [total, setTotal] = useStateInline(0);
  const [loading, setLoading] = useStateInline(true);
  const [selectedId, setSelectedId] = useStateInline<string | null>(null);

  const ALGO_COLORS: Record<string, string> = {
    'Genetic Algorithm': '#10b981',
  };
  const ALGO_ICONS: Record<string, string> = {
    'Genetic Algorithm': '🧬',
  };

  function timeAgo(isoString: string): string {
    try {
      const diff = (Date.now() - new Date(isoString).getTime()) / 1000;
      if (diff < 60) return `${Math.round(diff)}s ago`;
      if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
      if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
      return `${Math.round(diff / 86400)}d ago`;
    } catch { return 'recently'; }
  }

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchMissions(20);
      setMissions(data.missions);
      setTotal(data.total);
    } catch { /* backend offline */ }
    finally { setLoading(false); }
  };

  useEffectInline(() => { load(); }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="w-6 h-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
        <p className="text-slate-500 text-xs">Loading missions...</p>
      </div>
    );
  }

  if (missions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <History className="w-10 h-10 text-slate-700" />
        <p className="text-slate-400 text-sm">No missions yet</p>
        <p className="text-slate-600 text-xs">Run an optimization to create your first mission record</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <History className="w-4 h-4 text-violet-400" /> Mission History
          </h3>
          <p className="text-[10px] text-slate-500">{total} missions recorded</p>
        </div>
        <button
          onClick={load}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {missions.map((m, i) => {
        const algoColor = ALGO_COLORS[m.winner_algorithm] ?? '#64748b';
        const algoIcon = ALGO_ICONS[m.winner_algorithm] ?? '🏆';
        const isSelected = selectedId === m.id;

        return (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            onClick={() => setSelectedId(isSelected ? null : m.id)}
            className="glass-panel rounded-xl p-3 cursor-pointer transition-all"
            style={{
              border: isSelected ? `1px solid ${algoColor}40` : '1px solid rgba(255,255,255,0.06)',
              background: isSelected ? `${algoColor}08` : 'rgba(255,255,255,0.02)',
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-base">🛸</span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-slate-400 truncate font-mono">
                  ({m.start_lat.toFixed(2)}, {m.start_lng.toFixed(2)}) → ({m.dest_lat.toFixed(2)}, {m.dest_lng.toFixed(2)})
                </p>
                <p className="text-[9px] text-slate-600">{m.drone_model} · {timeAgo(m.created_at)}</p>
              </div>
              <div
                className="flex items-center gap-1 px-2 py-0.5 rounded-lg flex-shrink-0"
                style={{ background: `${algoColor}18`, border: `1px solid ${algoColor}30` }}
              >
                <span className="text-[10px]">{algoIcon}</span>
                <span className="text-[9px] font-bold" style={{ color: algoColor }}>
                  {m.winner_algorithm === 'Genetic Algorithm' ? 'GA' : m.winner_algorithm}
                </span>
              </div>
            </div>
            <AnimatePresence>
              {isSelected && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2.5 pt-2.5 grid grid-cols-3 gap-2"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="text-center">
                      <p className="text-[9px] text-slate-500">Distance</p>
                      <p className="text-[10px] font-mono font-bold text-cyan-400">{m.ga_distance_km.toFixed(2)} km</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] text-slate-500">Battery</p>
                      <p className="text-[10px] font-mono font-bold text-amber-400">{m.ga_battery_used_pct.toFixed(1)}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] text-slate-500">Time</p>
                      <p className="text-[10px] font-mono font-bold text-violet-400">{m.ga_flight_time_min.toFixed(1)} min</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}

      <p className="text-[9px] text-slate-600 text-center">Click a mission to expand · Showing {missions.length} of {total}</p>
    </div>
  );
}
