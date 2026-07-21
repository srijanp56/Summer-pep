import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from './components/Navbar';
import DeliveryForm from './components/DeliveryForm';
import MapView from './components/MapView';
import TelemetryDashboard from './components/TelemetryDashboard';
import GAVisualizer from './components/GAVisualizer';
import AlgorithmComparison from './components/AlgorithmComparison';
import AIExplanationPanel from './components/AIExplanationPanel';
import RAGAssistant from './components/RAGAssistant';
import CyberSecurityPanel from './components/CyberSecurityPanel';
import ReportExporter from './components/ReportExporter';
import StatusBar from './components/StatusBar';
import { OptimizationResponse, Coordinates } from './types';
import { optimizeRoute } from './services/api';

type ActivePanel = 'dashboard' | 'ga' | 'comparison' | 'ai' | 'security';

const PANEL_TABS: { id: ActivePanel; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Telemetry', icon: '📊' },
  { id: 'ga', label: 'GA Evolution', icon: '🧬' },
  { id: 'comparison', label: 'Compare', icon: '⚖️' },
  { id: 'ai', label: 'AI Rationale', icon: '🤖' },
  { id: 'security', label: 'CyberSec', icon: '🔐' },
];

export default function App() {
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<ActivePanel>('dashboard');
  const [showRAG, setShowRAG] = useState(false);
  const [showExporter, setShowExporter] = useState(false);
  const [clickMode, setClickMode] = useState<'start' | 'destination' | null>(null);
  const [start, setStart] = useState<Coordinates | null>(null);
  const [destination, setDestination] = useState<Coordinates | null>(null);

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
    setIsLoading(true); setError(null);
    try {
      const result = await optimizeRoute({ ...formData, start, destination });
      setOptimizationResult(result);
      setActivePanel('dashboard');
    } catch (e: any) {
      setError(e.message || 'Optimization failed. Check that the backend is running at port 8000.');
    } finally { setIsLoading(false); }
  }, [start, destination]);

  return (
    <div className="min-h-screen flex flex-col hero-gradient" style={{ height: '100vh', overflow: 'hidden' }}>
      <Navbar
        onOpenRAG={() => setShowRAG(true)}
        onExport={() => optimizationResult && setShowExporter(true)}
        hasResults={!!optimizationResult}
      />

      <div className="flex flex-1 min-h-0">
        {/* ── LEFT: Mission Config ── */}
        <motion.aside
          initial={{ x: -320, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1], delay: 0.1 }}
          className="w-72 flex-shrink-0 flex flex-col glass border-r overflow-y-auto"
          style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}
        >
          <DeliveryForm
            start={start}
            destination={destination}
            onSetClickMode={setClickMode}
            clickMode={clickMode}
            onSubmit={handleRunOptimization}
            isLoading={isLoading}
          />
        </motion.aside>

        {/* ── CENTER: Map ── */}
        <main className="flex-1 flex flex-col min-w-0 relative">
          <MapView
            start={start}
            destination={destination}
            optimizationResult={optimizationResult}
            onMapClick={handleMapClick}
            clickMode={clickMode}
            onLocationSelect={handleLocationSelect}
          />

          {/* Error toast */}
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
          className="w-[380px] flex-shrink-0 flex flex-col glass"
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
                  <TelemetryDashboard result={optimizationResult} isLoading={isLoading} />
                </motion.div>
              )}
              {activePanel === 'ga' && (
                <motion.div key="ga" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
                  <GAVisualizer result={optimizationResult} />
                </motion.div>
              )}
              {activePanel === 'comparison' && (
                <motion.div key="comparison" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
                  <AlgorithmComparison result={optimizationResult} />
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
            </AnimatePresence>
          </div>
        </motion.aside>
      </div>

      <StatusBar isLoading={isLoading} result={optimizationResult} />

      {/* Modals */}
      <AnimatePresence>
        {showRAG && <RAGAssistant onClose={() => setShowRAG(false)} />}
        {showExporter && optimizationResult && (
          <ReportExporter result={optimizationResult} onClose={() => setShowExporter(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
