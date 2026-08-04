import {
  OptimizationRequest,
  OptimizationResponse,
  WeatherConditions,
  RAGQueryResponse,
  AttackSimulationResponse,
  MissionListResponse,
  WSMessage,
} from '../types';

const API_BASE = (import.meta as any).env?.VITE_API_BASE || '/api/v1';

// ── HTTP API helpers ────────────────────────────────────────────

export async function fetchWeather(mode: string = 'simulated', lat?: number, lng?: number): Promise<WeatherConditions> {
  const params = new URLSearchParams({ mode });
  if (lat !== undefined) params.append('lat', String(lat));
  if (lng !== undefined) params.append('lng', String(lng));
  const res = await fetch(`${API_BASE}/weather?${params}`);
  if (!res.ok) throw new Error('Failed to fetch weather telemetry');
  return res.json();
}

export async function optimizeRoute(req: OptimizationRequest): Promise<OptimizationResponse> {
  const res = await fetch(`${API_BASE}/optimize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    try {
      const errBody = await res.json();
      if (errBody?.detail?.error === 'INSUFFICIENT_BATTERY') {
        const d = errBody.detail;
        throw new Error(
          `INSUFFICIENT_BATTERY|${d.message}|${d.battery_required_pct}|${d.battery_available_pct}|${d.deficit_pct}`
        );
      }
      throw new Error(errBody?.detail?.message || errBody?.detail || 'Route optimization request failed');
    } catch (e: any) {
      if (e.message?.startsWith('INSUFFICIENT_BATTERY')) throw e;
      throw new Error('Route optimization request failed');
    }
  }
  return res.json();
}

export async function queryRAG(query: string): Promise<RAGQueryResponse> {
  const res = await fetch(`${API_BASE}/rag/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error('RAG assistant query failed');
  return res.json();
}

export async function simulateCyberAttack(
  attackType: string,
  severity: number,
  route: any[]
): Promise<AttackSimulationResponse> {
  const res = await fetch(`${API_BASE}/security/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ attack_type: attackType, severity, current_route: route }),
  });
  if (!res.ok) throw new Error('Cyber attack simulation failed');
  return res.json();
}

export async function exportReport(data: OptimizationResponse, format: string) {
  const res = await fetch(`${API_BASE}/export?format=${format}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Export request failed');
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `droneroute_report_${data.request_id.slice(0, 8)}.${format === 'html' ? 'html' : format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export async function fetchMissions(limit = 50, offset = 0): Promise<MissionListResponse> {
  const res = await fetch(`${API_BASE}/missions?limit=${limit}&offset=${offset}`);
  if (!res.ok) throw new Error('Failed to fetch mission history');
  return res.json();
}

export async function fetchMissionDetail(id: string) {
  const res = await fetch(`${API_BASE}/missions/${id}`);
  if (!res.ok) throw new Error('Mission not found');
  return res.json();
}

// ── WebSocket GA Streaming ──────────────────────────────────────

/**
 * Creates a managed WebSocket connection to the GA streaming endpoint.
 * Returns control functions to start and close the connection.
 *
 * @param req - Optimization request parameters
 * @param onMessage - Called for each WSMessage received
 * @param onClose - Called when connection closes
 */
export function createGAWebSocket(
  req: OptimizationRequest,
  onMessage: (msg: WSMessage) => void,
  onClose?: () => void
): { close: () => void } {
  const wsBase = (import.meta as any).env?.VITE_WS_BASE;
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const host = window.location.host;
  const wsUrl = wsBase ? `${wsBase}/api/v1/optimize/ws` : `${protocol}://${host}/api/v1/optimize/ws`;

  const ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    ws.send(JSON.stringify(req));
  };

  ws.onmessage = (event) => {
    try {
      const msg: WSMessage = JSON.parse(event.data);
      onMessage(msg);
    } catch {
      // ignore malformed messages
    }
  };

  ws.onclose = () => {
    if (onClose) onClose();
  };

  ws.onerror = () => {
    if (onClose) onClose();
  };

  return {
    close: () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    },
  };
}

