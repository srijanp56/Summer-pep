import {
  OptimizationRequest,
  OptimizationResponse,
  WeatherConditions,
  RAGQueryResponse,
  AttackSimulationResponse,
} from '../types';

const API_BASE = '/api/v1';

export async function fetchWeather(mode: string = 'simulated'): Promise<WeatherConditions> {
  const res = await fetch(`${API_BASE}/weather?mode=${mode}`);
  if (!res.ok) throw new Error('Failed to fetch weather telemetry');
  return res.json();
}

export async function optimizeRoute(req: OptimizationRequest): Promise<OptimizationResponse> {
  const res = await fetch(`${API_BASE}/optimize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error('Route optimization request failed');
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
