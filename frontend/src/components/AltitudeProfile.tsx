import { motion } from 'framer-motion';
import { RouteResult, Waypoint } from '../types';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Mountain, ArrowUpRight, ShieldAlert } from 'lucide-react';

interface AltitudeProfileProps {
  route: RouteResult | null;
  activeWaypointIdx?: number | null;
  onHoverWaypoint?: (idx: number | null) => void;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  return (
    <div className="rounded-lg px-3 py-2 text-[10px] font-mono" style={{
      background: 'var(--surface-glass-br)',
      border: '1px solid var(--border)',
      boxShadow: 'var(--shadow-card)',
    }}>
      <p className="font-bold text-emerald-400">Waypoint {label + 1}</p>
      <p style={{ color: '#10b981' }}>Flight Altitude: {data.altitude} m</p>
      <p style={{ color: '#8b5cf6' }}>Terrain Elev: {data.terrainElev} m</p>
      <p style={{ color: 'var(--text-muted)' }}>Ground Clearance: {data.clearance} m</p>
      <p style={{ color: 'var(--text-faint)' }}>Terrain Type: {data.terrainType}</p>
    </div>
  );
}

export default function AltitudeProfile({ route, onHoverWaypoint }: AltitudeProfileProps) {
  if (!route || !route.waypoints || route.waypoints.length === 0) {
    return (
      <div className="h-28 rounded-xl px-4 py-3 flex items-center justify-center text-center"
        style={{ background: 'var(--surface-card)', border: '1px solid var(--border)' }}>
        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          🏔️ Run an optimization to inspect 3D flight altitude profile & terrain clearance
        </p>
      </div>
    );
  }

  // Build chart dataset from waypoints
  const chartData = route.waypoints.map((wp: Waypoint, i: number) => {
    // Generate terrain elevation profile estimate based on terrain type
    const terrainElevMap: Record<string, number> = {
      mountain: 65, building: 40, urban: 20, forest: 15, water: 0,
    };
    const terrainElev = terrainElevMap[wp.terrain || 'urban'] ?? 20;
    const flightAlt = wp.alt || 50.0;
    const totalAlt = terrainElev + flightAlt;
    const clearance = Math.max(10, flightAlt);

    return {
      index: i,
      altitude: Math.round(totalAlt),
      flightAlt: Math.round(flightAlt),
      terrainElev: Math.round(terrainElev),
      clearance: Math.round(clearance),
      terrainType: wp.terrain || 'urban',
    };
  });

  const minClearance = Math.min(...chartData.map(d => d.clearance));
  const maxAlt = Math.max(...chartData.map(d => d.altitude));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl p-3 space-y-2 relative overflow-hidden"
      style={{ background: 'var(--surface-card)', border: '1px solid var(--border)' }}
    >
      {/* HUD Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-violet-500/10 text-violet-400 flex items-center justify-center">
            <Mountain className="w-3 h-3" />
          </div>
          <div>
            <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>
              3D Altitude & Terrain Profile
            </span>
            <span className="text-[8px] block" style={{ color: 'var(--text-muted)' }}>
              AGL Altitude (30m - 120m corridor) · Terrain clearance
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[9px] font-mono">
          <div className="flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3 text-emerald-400" />
            <span className="text-emerald-400 font-bold">{maxAlt}m Peak</span>
          </div>
          <div className="flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 text-cyan-400" />
            <span className="text-cyan-400 font-bold">{minClearance}m Clearance</span>
          </div>
        </div>
      </div>

      {/* Recharts Area Chart */}
      <div className="h-20 w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
            onMouseMove={(state: any) => {
              if (state && state.activeTooltipIndex !== undefined) {
                onHoverWaypoint?.(state.activeTooltipIndex);
              }
            }}
            onMouseLeave={() => onHoverWaypoint?.(null)}
          >
            <defs>
              <linearGradient id="droneAltGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="terrainGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis dataKey="index" tick={{ fontSize: 8, fill: 'var(--text-faint)' }} tickLine={false} axisLine={false} tickFormatter={i => `WP${i+1}`} />
            <YAxis tick={{ fontSize: 8, fill: 'var(--text-faint)' }} tickLine={false} axisLine={false} width={28} tickFormatter={v => `${v}m`} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={120} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: '120m Ceiling', fontSize: 7, fill: '#f43f5e', position: 'top' }} />
            {/* Terrain Profile */}
            <Area type="monotone" dataKey="terrainElev" stroke="#8b5cf6" strokeWidth={1.5} fill="url(#terrainGrad)" name="Terrain" />
            {/* Drone Altitude Profile */}
            <Area type="monotone" dataKey="altitude" stroke="#10b981" strokeWidth={2} fill="url(#droneAltGrad)" name="Drone Altitude" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between text-[8px]" style={{ color: 'var(--text-muted)' }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1"><div className="w-2.5 h-1 rounded bg-emerald-400" /><span>Drone Altitude</span></div>
          <div className="flex items-center gap-1"><div className="w-2.5 h-1 rounded bg-violet-400" /><span>Terrain Elevation</span></div>
        </div>
        <span>Hover over graph to inspect waypoints</span>
      </div>
    </motion.div>
  );
}
