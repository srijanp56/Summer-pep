import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';

import { Coordinates, OptimizationResponse } from '../types';
import { useTheme } from '../ThemeContext';
import { audioTelemetry } from '../services/audioTelemetry';

// Fix Leaflet default icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapViewProps {
  start: Coordinates | null;
  destination: Coordinates | null;
  optimizationResult: OptimizationResponse | null;
  onMapClick: (coords: Coordinates) => void;
  clickMode: 'start' | 'destination' | null;
  onLocationSelect?: (coords: Coordinates, type: 'start' | 'destination') => void;
  selectedRouteType?: 'optimal' | 'balanced' | 'direct';
  onSelectRouteType?: (type: 'optimal' | 'balanced' | 'direct') => void;
  onInjectHazard?: () => void;
  activeWaypointIdx?: number | null;
}




const NO_FLY_ZONES = [
  {
    id: 'airport', name: 'SFO International Airport', type: 'airport', color: '#f43f5e',
    coords: [[37.6213, -122.3790], [37.6400, -122.3600], [37.6350, -122.3900], [37.6100, -122.4000]] as [number, number][],
  },
  {
    id: 'military', name: 'Military Restricted Zone', type: 'military', color: '#8b5cf6',
    coords: [[37.7500, -122.4200], [37.7600, -122.4100], [37.7550, -122.3950], [37.7450, -122.4050]] as [number, number][],
  },
  {
    id: 'hospital', name: 'UCSF Hospital Helipad Buffer', type: 'hospital', color: '#f59e0b',
    coords: [[37.7850, -122.4350], [37.7900, -122.4300], [37.7880, -122.4220], [37.7830, -122.4280]] as [number, number][],
  },
];

function createMarkerIcon(type: 'start' | 'destination' | 'waypoint'): L.DivIcon {
  const configs = {
    start: { color: '#10b981', label: 'ORIGIN', emoji: '📍' },
    destination: { color: '#06b6d4', label: 'DEST', emoji: '🎯' },
    waypoint: { color: '#8b5cf6', label: '', emoji: '●' },
  };
  const c = configs[type];

  return L.divIcon({
    className: '',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;gap:3px;">
        <div style="
          width:${type === 'waypoint' ? '10px' : '40px'};
          height:${type === 'waypoint' ? '10px' : '40px'};
          border-radius:50%;
          background:${c.color}22;
          border:2.5px solid ${c.color};
          display:flex;align-items:center;justify-content:center;
          font-size:${type === 'waypoint' ? '6px' : '18px'};
          box-shadow:0 0 20px ${c.color}66, 0 0 40px ${c.color}22;
          position:relative;
        ">
          ${type !== 'waypoint' ? c.emoji : ''}
          ${type !== 'waypoint' ? `<div style="
            position:absolute;inset:-3px;border-radius:50%;
            border:1px solid ${c.color}44;
            animation:ping 2s ease-in-out infinite;
          "></div>` : ''}
        </div>
        ${type !== 'waypoint' ? `
        <div style="
          background:rgba(3,7,18,0.92);
          color:${c.color};
          font-size:8px;font-weight:700;
          padding:2px 7px;border-radius:4px;
          border:1px solid ${c.color}33;
          white-space:nowrap;font-family:Inter,sans-serif;
          letter-spacing:0.08em;
        ">${c.label}</div>` : ''}
      </div>
      <style>@keyframes ping{0%,100%{transform:scale(1);opacity:0.6}50%{transform:scale(1.3);opacity:0}}</style>
    `,
    iconSize: type === 'waypoint' ? [10, 10] : [60, 58],
    iconAnchor: type === 'waypoint' ? [5, 5] : [30, 44],
  });
}

function createDroneIcon(battery: number): L.DivIcon {
  const bColor = battery > 60 ? '#10b981' : battery > 30 ? '#f59e0b' : '#f43f5e';
  return L.divIcon({
    className: '',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;gap:3px;">
        <div style="
          width:46px;height:46px;border-radius:50%;
          background:radial-gradient(circle, rgba(6,182,212,0.2), rgba(6,182,212,0.05));
          border:2px solid #06b6d4;
          display:flex;align-items:center;justify-content:center;
          font-size:22px;
          box-shadow:0 0 25px rgba(6,182,212,0.6),0 0 50px rgba(6,182,212,0.2);
          animation:drone-hover 2.5s ease-in-out infinite;
        "><img src="/drone.png" alt="drone" style="width:28px;height:28px;object-fit:contain;filter:drop-shadow(0 0 6px rgba(6,182,212,0.9)) drop-shadow(0 0 12px rgba(6,182,212,0.4));" /></div>
        <div style="
          background:rgba(3,7,18,0.95);
          color:${bColor};font-size:8px;font-weight:700;
          padding:2px 7px;border-radius:4px;
          border:1px solid ${bColor}44;
          font-family:'JetBrains Mono',monospace;
          box-shadow:0 0 8px ${bColor}33;
        ">🔋 ${battery.toFixed(0)}%</div>
      </div>
      <style>
        @keyframes drone-hover{
          0%,100%{transform:translateY(0)rotate(0deg)}
          33%{transform:translateY(-5px)rotate(1.5deg)}
          66%{transform:translateY(-3px)rotate(-1deg)}
        }
      </style>
    `,
    iconSize: [70, 62],
    iconAnchor: [35, 23],
  });
}


export default function MapView({
  start, destination, optimizationResult, onMapClick, clickMode,
  selectedRouteType = 'optimal', onSelectRouteType, onInjectHazard,
}: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const routeLayersRef = useRef<L.Layer[]>([]);
  const markerLayersRef = useRef<L.Layer[]>([]);
  const windLayersRef = useRef<L.Layer[]>([]);
  const droneMarkerRef = useRef<L.Marker | null>(null);
  const animFrameRef = useRef<number>(0);
  const [liveBattery, setLiveBattery] = useState(100);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showWindHeatmap, setShowWindHeatmap] = useState(false);
  const { theme } = useTheme();

  // Update tile filter when theme changes
  useEffect(() => {
    const tiles = document.querySelectorAll<HTMLImageElement>('.leaflet-tile');
    const filter = theme === 'dark'
      ? 'brightness(0.38) saturate(0.5) hue-rotate(200deg) invert(0.06)'
      : 'brightness(1) saturate(1)';
    tiles.forEach(t => { t.style.filter = filter; });
    // Also update the CSS variable on root
    document.documentElement.style.setProperty(
      '--tile-filter',
      filter
    );
  }, [theme]);

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [37.7749, -122.4194],
      zoom: 12,
      zoomControl: false,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Draw styled No-Fly Zones
    NO_FLY_ZONES.forEach(zone => {
      L.polygon(zone.coords, {
        color: zone.color,
        fillColor: zone.color,
        fillOpacity: 0.08,
        weight: 1.5,
        dashArray: '8,5',
        lineCap: 'round',
      }).addTo(map);

      const labelIcon = L.divIcon({
        className: '',
        html: `<div style="
          display:flex;align-items:center;gap:4px;
          background:rgba(3,7,18,0.88);
          color:${zone.color};
          font-size:9px;font-weight:700;
          padding:3px 8px;border-radius:6px;
          border:1px solid ${zone.color}33;
          white-space:nowrap;backdrop-filter:blur(8px);
          font-family:Inter,sans-serif;letter-spacing:0.06em;
        ">🚫 ${zone.name}</div>`,
        iconAnchor: [60, 10],
      });

      const center = zone.coords.reduce(
        (acc, c) => [acc[0] + c[0] / zone.coords.length, acc[1] + c[1] / zone.coords.length],
        [0, 0]
      );
      L.marker(center as [number, number], { icon: labelIcon, interactive: false }).addTo(map);
    });

    mapRef.current = map;
  }, []);

  // Map click handler
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.getContainer().style.cursor = clickMode ? 'crosshair' : '';
    const handler = (e: L.LeafletMouseEvent) => {
      if (clickMode) onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    };
    map.on('click', handler);
    return () => { map.off('click', handler); };
  }, [clickMode, onMapClick]);

  // Start/destination markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markerLayersRef.current.forEach(l => map.removeLayer(l));
    markerLayersRef.current = [];

    if (start) {
      const m = L.marker([start.lat, start.lng], { icon: createMarkerIcon('start'), zIndexOffset: 900 }).addTo(map);
      markerLayersRef.current.push(m);
    }
    if (destination) {
      const m = L.marker([destination.lat, destination.lng], { icon: createMarkerIcon('destination'), zIndexOffset: 900 }).addTo(map);
      markerLayersRef.current.push(m);
    }
    if (start && destination) {
      map.fitBounds([[start.lat, start.lng], [destination.lat, destination.lng]], { padding: [80, 80], maxZoom: 14 });
    } else if (start) {
      map.flyTo([start.lat, start.lng], 14, { animate: true, duration: 1 });
    } else if (destination) {
      map.flyTo([destination.lat, destination.lng], 14, { animate: true, duration: 1 });
    }
  }, [start, destination]);

  // Wind Vector Heatmap Layer Effect
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    windLayersRef.current.forEach(l => map.removeLayer(l));
    windLayersRef.current = [];

    if (!showWindHeatmap) return;

    const centerLat = start?.lat ?? 37.7749;
    const centerLng = start?.lng ?? -122.4194;
    const windDir = optimizationResult?.weather?.wind_direction_deg ?? 90;

    const latStep = 0.012;
    const lngStep = 0.018;

    for (let r = -3; r <= 3; r++) {
      for (let c = -4; c <= 4; c++) {
        const lat = centerLat + r * latStep;
        const lng = centerLng + c * lngStep;

        const windIcon = L.divIcon({
          className: '',
          html: `<div style="
            transform: rotate(${windDir}deg);
            color: rgba(6,182,212,0.7);
            font-size: 14px; font-weight: bold;
            text-shadow: 0 0 6px rgba(6,182,212,0.5);
            pointer-events: none;
          ">➔</div>`,
          iconAnchor: [7, 7],
        });

        const m = L.marker([lat, lng], { icon: windIcon, interactive: false }).addTo(map);
        windLayersRef.current.push(m);
      }
    }
  }, [showWindHeatmap, start, optimizationResult]);


  // Optimization result routes + drone animation
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    routeLayersRef.current.forEach(l => map.removeLayer(l));
    routeLayersRef.current = [];
    if (droneMarkerRef.current) { map.removeLayer(droneMarkerRef.current); droneMarkerRef.current = null; }
    cancelAnimationFrame(animFrameRef.current);
    setIsAnimating(false);

    if (!optimizationResult) return;
    const { ga_route, balanced_route, direct_route } = optimizationResult;

    // 1. Direct Route (High-Risk) — Red dashed line
    if (direct_route && direct_route.waypoints && direct_route.waypoints.length > 1) {
      const isSel = selectedRouteType === 'direct';
      const coords = direct_route.waypoints.map(w => [w.lat, w.lng] as [number, number]);
      const line = L.polyline(coords, {
        color: '#f43f5e',
        weight: isSel ? 4 : 2,
        opacity: isSel ? 0.95 : 0.45,
        dashArray: '8,6',
      }).addTo(map);
      routeLayersRef.current.push(line);
    }

    // 2. Balanced Route (Alternative) — Amber line
    if (balanced_route && balanced_route.waypoints && balanced_route.waypoints.length > 1) {
      const isSel = selectedRouteType === 'balanced';
      const coords = balanced_route.waypoints.map(w => [w.lat, w.lng] as [number, number]);
      const line = L.polyline(coords, {
        color: '#f59e0b',
        weight: isSel ? 4 : 2.5,
        opacity: isSel ? 0.95 : 0.5,
        dashArray: isSel ? undefined : '10,6',
      }).addTo(map);
      routeLayersRef.current.push(line);
    }


    // 3. Optimal GA Route — Emerald glowing solid line
    if (ga_route?.waypoints?.length > 1) {
      const isSel = selectedRouteType === 'optimal';
      const coords = ga_route.waypoints.map(w => [w.lat, w.lng] as [number, number]);

      if (isSel) {
        const glow = L.polyline(coords, { color: '#10b981', weight: 12, opacity: 0.12, lineCap: 'round' }).addTo(map);
        routeLayersRef.current.push(glow);
      }
      const main = L.polyline(coords, {
        color: '#10b981',
        weight: isSel ? 4 : 2.5,
        opacity: isSel ? 1 : 0.5,
        lineCap: 'round',
      }).addTo(map);
      routeLayersRef.current.push(main);

      // Waypoint dots
      ga_route.waypoints.slice(1, -1).forEach(wp => {
        const dot = L.marker([wp.lat, wp.lng], { icon: createMarkerIcon('waypoint'), interactive: false }).addTo(map);
        routeLayersRef.current.push(dot);
      });
    }

    // Legend
    const legend = (L.control as any)({ position: 'bottomleft' });
    legend.onAdd = () => {
      const div = L.DomUtil.create('div', '');
      div.innerHTML = `
        <div style="background:rgba(3,7,18,0.92);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,0.08);padding:12px 16px;border-radius:12px;font-family:Inter,sans-serif;min-width:160px;">
          <div style="font-size:9px;font-weight:700;color:#475569;margin-bottom:8px;letter-spacing:0.1em;">ROUTE LEGEND</div>
          <div style="display:flex;flex-direction:column;gap:6px;">
            <div style="display:flex;align-items:center;gap:8px;">
              <div style="width:20px;height:3px;background:#10b981;border-radius:2px;box-shadow:0 0 6px #10b98166;"></div>
              <span style="font-size:10px;color:#10b981;font-weight:600;">🟢 Optimal GA Route</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <div style="width:20px;height:2px;background:#f59e0b;border-radius:2px;"></div>
              <span style="font-size:10px;color:#f59e0b;font-weight:500;">🟡 Balanced Alternative</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <div style="width:20px;height:2px;background:#f43f5e;border-radius:2px;border-top:2px dashed #f43f5e;"></div>
              <span style="font-size:10px;color:#f43f5e;font-weight:500;">🔴 Direct / High-Risk</span>
            </div>
          </div>
        </div>
      `;
      return div;
    };
    legend.addTo(map);
    routeLayersRef.current.push(legend as any);

    // Active route for drone flight animation
    const activeRouteObj = selectedRouteType === 'balanced'
      ? (balanced_route || ga_route)
      : selectedRouteType === 'direct'
      ? (direct_route || ga_route)
      : ga_route;

    const route = activeRouteObj.waypoints;
    if (route.length < 2) return;

    setIsAnimating(true);
    const totalBattery = activeRouteObj.battery_consumed_pct;
    let segIdx = 0;
    let t = 0;
    const SPEED = 0.006;
    setLiveBattery(100);

    const droneMark = L.marker([route[0].lat, route[0].lng], { icon: createDroneIcon(100), zIndexOffset: 2000 }).addTo(map);
    droneMarkerRef.current = droneMark;

    const animate = () => {
      if (segIdx >= route.length - 1) { setIsAnimating(false); return; }
      const from = route[segIdx];
      const to = route[segIdx + 1];
      t += SPEED;
      if (t >= 1) { t = 0; segIdx++; return animate(); }
      const lat = from.lat + (to.lat - from.lat) * t;
      const lng = from.lng + (to.lng - from.lng) * t;
      const progress = (segIdx + t) / (route.length - 1);
      const curr = Math.max(0, 100 - totalBattery * progress);
      setLiveBattery(curr);
      droneMark.setLatLng([lat, lng]);
      droneMark.setIcon(createDroneIcon(curr));
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);

    return () => { cancelAnimationFrame(animFrameRef.current); };
  }, [optimizationResult, selectedRouteType]);


  return (
    <div className="relative flex-1 w-full h-full overflow-hidden">
      {/* Map canvas */}
      <div ref={containerRef} className="absolute inset-0 z-0 hero-gradient" />

      {/* On-Map Route Selection & Hazard Injection Widget */}
      {optimizationResult && (
        <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 p-1.5 rounded-2xl glass-bright shadow-2xl"
          style={{ border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(20px)' }}>
          {[
            { id: 'optimal' as const, label: '🟢 Optimal', color: '#10b981', desc: `${optimizationResult.ga_route.total_distance_km.toFixed(1)} km` },
            { id: 'balanced' as const, label: '🟡 Balanced', color: '#f59e0b', desc: `${(optimizationResult.balanced_route?.total_distance_km ?? 0).toFixed(1)} km` },
            { id: 'direct' as const, label: '🔴 High Risk', color: '#f43f5e', desc: `${(optimizationResult.direct_route?.total_distance_km ?? 0).toFixed(1)} km` },
          ].map(opt => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSelectRouteType?.(opt.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                selectedRouteType === opt.id
                  ? 'text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
              style={{
                background: selectedRouteType === opt.id ? `${opt.color}25` : 'transparent',
                border: `1px solid ${selectedRouteType === opt.id ? `${opt.color}66` : 'transparent'}`,
              }}
            >
              <span>{opt.label}</span>
              <span className="text-[9px] font-mono text-slate-400 opacity-80">({opt.desc})</span>
            </button>
          ))}

          <div className="w-px h-5 bg-white/10 mx-1" />

          {/* Inject Hazard Button */}
          <button
            type="button"
            onClick={() => {
              audioTelemetry.announceHazardInjected();
              onInjectHazard?.();
            }}
            id="inject-hazard-btn"
            title="Inject Dynamic Storm/TFR Obstacle & Trigger GA Mid-Flight Re-routing"
            className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 text-rose-400 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 active:scale-95"
          >
            <span>⚡ Inject Hazard</span>
          </button>

          {/* Wind Vectors Overlay Button */}
          <button
            type="button"
            onClick={() => setShowWindHeatmap(!showWindHeatmap)}
            id="wind-heatmap-btn"
            title="Toggle Live Wind Vector Heatmap Layer"
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
              showWindHeatmap
                ? 'text-cyan-300 bg-cyan-500/25 border border-cyan-500/50'
                : 'text-slate-400 bg-white/5 border border-white/10 hover:text-slate-200'
            }`}
          >
            <span>💨 Wind Vectors</span>
          </button>
        </div>
      )}



      {/* Live Battery HUD */}
      <AnimatePresence>
        {isAnimating && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-20 left-1/2 -translate-x-1/2 z-20 glass-bright px-4 py-2 rounded-full flex items-center gap-3 text-xs shadow-xl"
            style={{ border: '1px solid rgba(6,182,212,0.25)' }}
          >
            <div className="flex items-center gap-1.5">
              <div className="status-dot-live" style={{ background: '#06b6d4', boxShadow: '0 0 0 0 rgba(6,182,212,0.5)' }} />
              <span className="text-cyan-400 font-semibold tracking-wide">LIVE FLIGHT</span>
            </div>
            <div className="w-px h-4 bg-white/10" />
            <span>🔋</span>
            <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full battery-bar"
                style={{
                  width: `${liveBattery}%`,
                  background: liveBattery > 60
                    ? 'linear-gradient(90deg,#10b981,#06b6d4)'
                    : liveBattery > 30
                    ? '#f59e0b'
                    : '#f43f5e',
                  boxShadow: `0 0 8px ${liveBattery > 60 ? '#10b981' : liveBattery > 30 ? '#f59e0b' : '#f43f5e'}66`,
                }}
              />
            </div>
            <span className={`font-mono font-bold text-xs ${liveBattery > 60 ? 'text-emerald-400' : liveBattery > 30 ? 'text-amber-400' : 'text-rose-400'}`}>
              {liveBattery.toFixed(1)}%
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Crosshair click mode hint */}
      <AnimatePresence>
        {clickMode && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 glass-bright px-5 py-2.5 rounded-full flex items-center gap-2.5 text-xs shadow-xl"
            style={{
              border: `1px solid ${clickMode === 'start' ? 'rgba(16,185,129,0.3)' : 'rgba(6,182,212,0.3)'}`,
            }}
          >
            <div className="w-4 h-4 rounded-full border-2 border-current flex items-center justify-center" style={{ color: clickMode === 'start' ? '#10b981' : '#06b6d4' }}>
              <div className="w-1 h-1 rounded-full bg-current" />
            </div>
            <span style={{ color: clickMode === 'start' ? '#10b981' : '#06b6d4' }} className="font-bold">
              {clickMode === 'start' ? 'Origin' : 'Destination'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
