from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class Coordinates(BaseModel):
    lat: float = Field(..., example=37.7749)
    lng: float = Field(..., example=-122.4194)
    alt: float = Field(default=50.0, description="Altitude in meters above ground level")


class Waypoint(BaseModel):
    lat: float
    lng: float
    alt: float = 50.0
    terrain: str = "urban"  # urban, building, forest, mountain, water
    wind_vector: Optional[Dict[str, float]] = None


class NoFlyZone(BaseModel):
    id: str
    name: str
    zone_type: str  # airport, military, government, hospital, school
    polygon: List[Coordinates]
    buffer_m: float = 100.0
    penalty_score: float = 1000.0


class DroneSpecs(BaseModel):
    model_name: str
    max_payload_kg: float
    battery_capacity_wh: float
    max_speed_m_s: float
    base_drain_w: float
    drag_coeff: float
    empty_weight_kg: float


class WeatherConditions(BaseModel):
    wind_speed_m_s: float = 5.0
    wind_direction_deg: float = 45.0
    rain_intensity_mm_h: float = 0.0
    temperature_c: float = 22.0
    visibility_km: float = 10.0
    is_simulated: bool = True


class OptimizationRequest(BaseModel):
    start: Coordinates
    destination: Coordinates
    payload_weight_kg: float = Field(default=1.5, ge=0.0, le=25.0)
    drone_model: str = Field(default="DJI FlyCart 30")
    initial_battery_pct: float = Field(default=100.0, ge=10.0, le=100.0)
    priority: str = Field(default="balanced", description="balanced, speed, battery, safety")
    package_type: str = Field(default="standard", description="standard, hot_food, cold_item, medicine")
    weather_mode: str = Field(default="simulated", description="simulated or live")
    simulated_weather: Optional[WeatherConditions] = None
    emergency_medical: bool = False



class GenerationMetric(BaseModel):
    generation: int
    best_fitness: float
    avg_fitness: float
    min_fitness: float
    best_distance_km: float
    best_battery_drain_pct: float
    mutation_rate: float = 0.20
    diversity_score: float = 0.0


class RouteResult(BaseModel):
    algorithm: str
    waypoints: List[Waypoint]
    total_distance_km: float
    estimated_flight_time_min: float
    battery_consumed_pct: float
    energy_wh: float
    weather_risk_score: float
    safety_risk_score: float
    success_probability: float
    total_cost_inr: float
    carbon_saved_kg: float
    execution_time_ms: float



class OptimizationResponse(BaseModel):
    request_id: str
    ga_route: RouteResult                       # Optimal (Best)
    balanced_route: Optional[RouteResult] = None  # Balanced (Alternative)
    direct_route: Optional[RouteResult] = None    # Direct / High-Risk (Baseline)
    generation_history: List[GenerationMetric]
    winner_algorithm: str
    ai_explanation: str
    weather: WeatherConditions
    battery_sufficient: bool = True
    battery_required_pct: float = 0.0
    battery_available_pct: float = 100.0
    # GA insight fields
    fitness_improvement_pct: float = 0.0      # % improvement gen1 → final
    generations_to_converge: int = 0           # gen where fitness plateaued
    route_selection_reasons: List[str] = []    # human-readable waypoint decisions


class AttackSimulationRequest(BaseModel):
    attack_type: str = Field(..., description="gps_spoofing, fake_weather, sensor_failure, signal_jamming")
    severity: float = Field(default=0.8, ge=0.1, le=1.0)
    current_route: List[Waypoint]


class TelemetryEvent(BaseModel):
    timestamp_s: float
    gps_lat: float
    gps_lng: float
    inertial_lat: float
    inertial_lng: float
    signal_strength_dbm: float
    battery_pct: float
    anomaly_detected: bool
    status: str


class AttackSimulationResponse(BaseModel):
    attack_type: str
    detected: bool
    anomaly_score: float
    defense_action: str
    telemetry_logs: List[TelemetryEvent]
    safe_reroute: List[Waypoint]
    mitigation_details: str


class RAGQueryRequest(BaseModel):
    query: str
    category: Optional[str] = None


class Citation(BaseModel):
    title: str
    section: str
    source: str
    confidence: float


class RAGQueryResponse(BaseModel):
    query: str
    answer: str
    citations: List[Citation]
    confidence: float


class MissionSummary(BaseModel):
    id: str
    created_at: str
    start_lat: float
    start_lng: float
    dest_lat: float
    dest_lng: float
    payload_weight_kg: float
    drone_model: str
    winner_algorithm: str
    ga_distance_km: float
    ga_battery_used_pct: float
    ga_flight_time_min: float


class MissionListResponse(BaseModel):
    missions: List[MissionSummary]
    total: int
