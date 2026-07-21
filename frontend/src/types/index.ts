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
  total_cost_usd: number;
  carbon_saved_kg: number;
  execution_time_ms: number;
}

export interface OptimizationResponse {
  request_id: string;
  ga_route: RouteResult;
  astar_route: RouteResult;
  dijkstra_route: RouteResult;
  generation_history: GenerationMetric[];
  winner_algorithm: string;
  ai_explanation: string;
  weather: WeatherConditions;
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
