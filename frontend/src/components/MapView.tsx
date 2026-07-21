import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, MapPin, Navigation, Loader2 } from 'lucide-react';
import { Coordinates, OptimizationResponse } from '../types';

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
}

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  importance: number;
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
        ">🛸</div>
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

// Geocoding search component using Nominatim
function MapSearchBar({ onSelect, placeholder, type, icon }: {
  onSelect: (coords: Coordinates, name: string) => void;
  placeholder: string;
  type: 'start' | 'destination';
  icon: React.ReactNode;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const search = useCallback(async (q: string) => {
    if (q.length < 3) { setResults([]); setIsOpen(false); return; }
    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=6&addressdetails=1`,
        { headers: { 'Accept-Language': 'en', 'User-Agent': 'DroneRouteAI/1.0' } }
      );
      const data: SearchResult[] = await res.json();
      setResults(data);
      setIsOpen(data.length > 0);
    } catch { setResults([]); }
    finally { setIsSearching(false); }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(v), 400);
  };

  const handleSelect = (r: SearchResult) => {
    const coords = { lat: parseFloat(r.lat), lng: parseFloat(r.lon) };
    const shortName = r.display_name.split(',').slice(0, 2).join(',');
    setQuery(shortName);
    setIsOpen(false);
    onSelect(coords, r.display_name);
  };

  const color = type === 'start' ? '#10b981' : '#06b6d4';

  return (
    <div className="relative">
      <div
        className="flex items-center gap-2 rounded-xl px-3 py-2.5 input-dark"
        style={{ border: `1px solid ${isOpen ? color + '44' : 'rgba(255,255,255,0.08)'}` }}
      >
        <div style={{ color }} className="flex-shrink-0">{icon}</div>
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-xs text-slate-200 placeholder-slate-600 outline-none"
        />
        {isSearching
          ? <Loader2 className="w-3.5 h-3.5 text-slate-500 animate-spin flex-shrink-0" />
          : query
          ? <button onClick={() => { setQuery(''); setResults([]); setIsOpen(false); }} className="text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0">
              <X className="w-3 h-3" />
            </button>
          : <Search className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
        }
      </div>

      <AnimatePresence>
        {isOpen && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-1 z-50 glass-bright rounded-xl overflow-hidden shadow-2xl"
            style={{ border: `1px solid ${color}22` }}
          >
            {results.map((r, i) => (
              <div key={i} className="search-result-item" onClick={() => handleSelect(r)}>
                <div className="flex items-start gap-2">
                  <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color }} />
                  <div>
                    <p className="text-slate-200 text-[11px] font-medium leading-tight">{r.display_name.split(',').slice(0, 2).join(',')}</p>
                    <p className="text-slate-500 text-[9px] mt-0.5">{r.display_name.split(',').slice(2, 4).join(',')}</p>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function MapView({
  start, destination, optimizationResult, onMapClick, clickMode, onLocationSelect,
}: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const routeLayersRef = useRef<L.Layer[]>([]);
  const markerLayersRef = useRef<L.Layer[]>([]);
  const droneMarkerRef = useRef<L.Marker | null>(null);
  const animFrameRef = useRef<number>(0);
  const [liveBattery, setLiveBattery] = useState(100);
  const [isAnimating, setIsAnimating] = useState(false);

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
    const { ga_route, astar_route, dijkstra_route } = optimizationResult;

    // Dijkstra - faint dashed
    if (dijkstra_route?.waypoints?.length > 1) {
      const line = L.polyline(dijkstra_route.waypoints.map(w => [w.lat, w.lng] as [number, number]), {
        color: '#8b5cf6', weight: 1.5, opacity: 0.35, dashArray: '4,10',
      }).addTo(map);
      routeLayersRef.current.push(line);
    }

    // A* - medium dashed
    if (astar_route?.waypoints?.length > 1) {
      const line = L.polyline(astar_route.waypoints.map(w => [w.lat, w.lng] as [number, number]), {
        color: '#06b6d4', weight: 2, opacity: 0.45, dashArray: '10,8',
      }).addTo(map);
      routeLayersRef.current.push(line);
    }

    // GA Winner — glowing solid line (two layers for glow effect)
    if (ga_route?.waypoints?.length > 1) {
      const coords = ga_route.waypoints.map(w => [w.lat, w.lng] as [number, number]);

      // Glow layer
      const glow = L.polyline(coords, { color: '#10b981', weight: 10, opacity: 0.08, lineCap: 'round' }).addTo(map);
      routeLayersRef.current.push(glow);
      // Main line
      const main = L.polyline(coords, { color: '#10b981', weight: 3, opacity: 1, lineCap: 'round' }).addTo(map);
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
              <div style="width:20px;height:3px;background:linear-gradient(90deg,#10b981,#06b6d4);border-radius:2px;box-shadow:0 0 6px #10b98166;"></div>
              <span style="font-size:10px;color:#10b981;font-weight:600;">GA (Winner) ✓</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <div style="width:20px;height:2px;background:#06b6d4;border-radius:2px;opacity:0.6;border-top:2px dashed #06b6d4;"></div>
              <span style="font-size:10px;color:#64748b;">A* Search</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <div style="width:20px;height:1.5px;background:#8b5cf6;border-radius:2px;opacity:0.5;border-top:1.5px dotted #8b5cf6;"></div>
              <span style="font-size:10px;color:#64748b;">Dijkstra</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px;margin-top:2px;">
              <div style="width:20px;height:10px;background:rgba(244,63,94,0.12);border:1px dashed rgba(244,63,94,0.5);border-radius:3px;"></div>
              <span style="font-size:10px;color:#64748b;">No-Fly Zone</span>
            </div>
          </div>
        </div>
      `;
      return div;
    };
    legend.addTo(map);
    routeLayersRef.current.push(legend as any);

    // Animate drone along GA route
    const route = ga_route.waypoints;
    if (route.length < 2) return;

    setIsAnimating(true);
    const totalBattery = ga_route.battery_consumed_pct;
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
  }, [optimizationResult]);

  const handleSearchSelect = (coords: Coordinates, _name: string, type: 'start' | 'destination') => {
    onLocationSelect?.(coords, type);
    mapRef.current?.flyTo([coords.lat, coords.lng], 14, { animate: true, duration: 1.2 });
  };

  return (
    <div className="relative flex-1 w-full h-full overflow-hidden">
      {/* Map canvas */}
      <div ref={containerRef} className="absolute inset-0 z-0 hero-gradient" />

      {/* Search bars overlay */}
      <div className="absolute top-4 left-4 right-4 z-20 flex gap-2 pointer-events-none">
        <div className="flex-1 pointer-events-auto max-w-xs">
          <MapSearchBar
            type="start"
            placeholder="Search origin location..."
            icon={<MapPin className="w-4 h-4" />}
            onSelect={(coords, name) => handleSearchSelect(coords, name, 'start')}
          />
        </div>
        <div className="flex-1 pointer-events-auto max-w-xs">
          <MapSearchBar
            type="destination"
            placeholder="Search destination..."
            icon={<Navigation className="w-4 h-4" />}
            onSelect={(coords, name) => handleSearchSelect(coords, name, 'destination')}
          />
        </div>
      </div>

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
            <span className="text-slate-300">Click map to place</span>
            <span className="font-bold" style={{ color: clickMode === 'start' ? '#10b981' : '#06b6d4' }}>
              {clickMode === 'start' ? 'Origin' : 'Destination'}
            </span>
            <span className="text-slate-500">or use search above</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
