import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.models.domain import (
    OptimizationRequest,
    OptimizationResponse,
    WeatherConditions,
)
from app.ai.physics import DRONE_MODELS, DEFAULT_NO_FLY_ZONES
from app.ai.genetic_algorithm import GeneticAlgorithmSolver
from app.ai.pathfinding import SpatialGridSolver
from app.ai.explanation import generate_ai_explanation
from app.core.database import get_db
from app.models.db_models import SimulationLogDB

router = APIRouter()


@router.post("/optimize", response_model=OptimizationResponse)
def run_optimization(req: OptimizationRequest, db: Session = Depends(get_db)):
    # 1. Resolve Drone Model Specs
    specs = DRONE_MODELS.get(req.drone_model, DRONE_MODELS["DJI FlyCart 30"])

    # 2. Weather setup
    if req.weather_mode == "simulated" and req.simulated_weather:
        weather = req.simulated_weather
    else:
        weather = WeatherConditions(
            wind_speed_m_s=6.5,
            wind_direction_deg=135.0,
            rain_intensity_mm_h=0.0,
            temperature_c=21.0,
            visibility_km=10.0,
            is_simulated=True,
        )

    # Emergency Medical Mode adjustments
    effective_priority = "speed" if req.emergency_medical else req.priority

    # 3. Run Genetic Algorithm
    ga_solver = GeneticAlgorithmSolver(
        start=req.start,
        destination=req.destination,
        specs=specs,
        payload_kg=req.payload_weight_kg,
        weather=weather,
        no_fly_zones=DEFAULT_NO_FLY_ZONES,
        population_size=100,
        max_generations=100,
        priority=effective_priority,
    )
    ga_route, gen_history, _ = ga_solver.solve()

    # 4. Run Deterministic Solvers (A* & Dijkstra)
    grid_solver = SpatialGridSolver(
        start=req.start,
        destination=req.destination,
        specs=specs,
        payload_kg=req.payload_weight_kg,
        weather=weather,
        no_fly_zones=DEFAULT_NO_FLY_ZONES,
        grid_resolution=10,
    )
    astar_route = grid_solver.solve_astar()
    dijkstra_route = grid_solver.solve_dijkstra()

    # 5. Declare Winner
    all_routes = {
        "Genetic Algorithm": ga_route,
        "A*": astar_route,
        "Dijkstra": dijkstra_route,
    }

    # Winner selected based on lowest composite cost (Safety Risk -> Battery -> Distance)
    winner_name = min(
        all_routes,
        key=lambda k: (
            all_routes[k].safety_risk_score,
            all_routes[k].battery_consumed_pct,
            all_routes[k].total_distance_km,
        ),
    )

    # 6. Generate Natural Language AI Explanation
    explanation = generate_ai_explanation(
        ga_route=ga_route,
        astar_route=astar_route,
        dijkstra_route=dijkstra_route,
        weather=weather,
        specs=specs,
        payload_kg=req.payload_weight_kg,
    )

    req_id = str(uuid.uuid4())

    # 7. Persist to Database
    try:
        log_entry = SimulationLogDB(
            id=req_id,
            start_lat=req.start.lat,
            start_lng=req.start.lng,
            dest_lat=req.destination.lat,
            dest_lng=req.destination.lng,
            payload_weight_kg=req.payload_weight_kg,
            drone_model=req.drone_model,
            winner_algorithm=winner_name,
            ga_distance_km=ga_route.total_distance_km,
            ga_battery_used_pct=ga_route.battery_consumed_pct,
            ga_flight_time_min=ga_route.estimated_flight_time_min,
            weather_summary=weather.model_dump(),
            ai_explanation=explanation,
        )
        db.add(log_entry)
        db.commit()
    except Exception:
        db.rollback()

    return OptimizationResponse(
        request_id=req_id,
        ga_route=ga_route,
        astar_route=astar_route,
        dijkstra_route=dijkstra_route,
        generation_history=gen_history,
        winner_algorithm=winner_name,
        ai_explanation=explanation,
        weather=weather,
    )
