export interface Coordinates {
  lat: number;
  lng: number;
  alt?: number;
}

export interface Waypoint {
  lat: number;
  lng: number;
  alt: number;
  terrain?: string;
}

export interface WeatherConditions {
  wind_speed_m_s: number;
  wind_direction_deg: number;
  rain_intensity_mm_h: number;
  temperature_c: number;
  visibility_km: number;
  is_simulated: boolean;
}

export interface OptimizationRequest {
  start: Coordinates;
  destination: Coordinates;
  payload_weight_kg: number;
  drone_model: string;
  initial_battery_pct: number;
  priority: string;
  package_type?: string;
  weather_mode: string;
  simulated_weather?: WeatherConditions;
  emergency_medical: boolean;
}

export interface GenerationMetric {
  generation: number;
  best_fitness: number;
  avg_fitness: number;
  min_fitness: number;
  best_distance_km: number;
  best_battery_drain_pct: number;
  mutation_rate: number;
  diversity_score: number;
}

export interface RouteResult {
  algorithm: string;
  waypoints: Waypoint[];
  total_distance_km: number;
  estimated_flight_time_min: number;
  battery_consumed_pct: number;
  energy_wh: number;
  weather_risk_score: number;
  safety_risk_score: number;
  success_probability: number;
  total_cost_inr: number;
  carbon_saved_kg: number;
  execution_time_ms: number;

}

export interface OptimizationResponse {
  request_id: string;
  ga_route: RouteResult;             // Optimal (Best)
  balanced_route?: RouteResult;       // Balanced (Alternative)
  direct_route?: RouteResult;         // Direct / High-Risk (Baseline)
  generation_history: GenerationMetric[];
  winner_algorithm: string;
  ai_explanation: string;
  weather: WeatherConditions;
  battery_sufficient: boolean;
  battery_required_pct: number;
  battery_available_pct: number;
  // GA insight fields
  fitness_improvement_pct: number;
  generations_to_converge: number;
  route_selection_reasons: string[];
}


export interface TelemetryEvent {
  timestamp_s: number;
  gps_lat: number;
  gps_lng: number;
  inertial_lat: number;
  inertial_lng: number;
  signal_strength_dbm: number;
  battery_pct: number;
  anomaly_detected: boolean;
  status: string;
}

export interface AttackSimulationResponse {
  attack_type: string;
  detected: boolean;
  anomaly_score: number;
  defense_action: string;
  telemetry_logs: TelemetryEvent[];
  safe_reroute: Waypoint[];
  mitigation_details: string;
}

export interface Citation {
  title: string;
  section: string;
  source: string;
  confidence: number;
}

export interface RAGQueryResponse {
  query: string;
  answer: string;
  citations: Citation[];
  confidence: number;
}

export interface MissionSummary {
  id: string;
  created_at: string;
  start_lat: number;
  start_lng: number;
  dest_lat: number;
  dest_lng: number;
  payload_weight_kg: number;
  drone_model: string;
  winner_algorithm: string;
  ga_distance_km: number;
  ga_battery_used_pct: number;
  ga_flight_time_min: number;
}

export interface MissionListResponse {
  missions: MissionSummary[];
  total: number;
}

// WebSocket message types from the streaming GA endpoint
export type WSMessage =
  | { type: 'generation'; data: GenerationMetric }
  | { type: 'result'; data: OptimizationResponse }
  | { type: 'error'; error?: string; message: string; battery_required_pct?: number; battery_available_pct?: number; deficit_pct?: number };

