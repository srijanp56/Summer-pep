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
from app.ai.explanation import generate_ai_explanation, build_route_selection_reasons
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

    # Emergency Medical Mode — always prioritise speed
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
        package_type=req.package_type,
    )
    ga_route, balanced_route, direct_route, gen_history, _ = ga_solver.solve()

    # 4. Battery Sufficiency Check
    battery_required = ga_route.battery_consumed_pct
    battery_sufficient = battery_required <= req.initial_battery_pct

    if not battery_sufficient:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "INSUFFICIENT_BATTERY",
                "message": (
                    f"Drone cannot reach the destination. "
                    f"The optimized route requires {battery_required:.1f}% battery, "
                    f"but the drone only has {req.initial_battery_pct:.0f}% available. "
                    f"Please charge the battery or reduce payload/distance."
                ),
                "battery_required_pct": round(battery_required, 2),
                "battery_available_pct": req.initial_battery_pct,
                "deficit_pct": round(battery_required - req.initial_battery_pct, 2),
            },
        )

    # 5. GA Insight Metrics
    fitness_improvement_pct = 0.0
    generations_to_converge = 0
    if gen_history:
        first_fit = gen_history[0].best_fitness
        last_fit = gen_history[-1].best_fitness
        if first_fit != 0:
            fitness_improvement_pct = round(abs(last_fit - first_fit) / abs(first_fit) * 100, 2)
        # Find convergence generation
        threshold = 0.0001
        for i in range(1, len(gen_history)):
            if abs(gen_history[i].best_fitness - gen_history[i - 1].best_fitness) < threshold:
                generations_to_converge = gen_history[i].generation
                break
        if generations_to_converge == 0:
            generations_to_converge = gen_history[-1].generation

    # 6. Generate AI Explanation & Route Reasons
    explanation = generate_ai_explanation(
        ga_route=ga_route,
        weather=weather,
        specs=specs,
        payload_kg=req.payload_weight_kg,
        gen_history=gen_history,
    )
    route_reasons = build_route_selection_reasons(ga_route, weather, gen_history)

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
            winner_algorithm="Genetic Algorithm",
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
        balanced_route=balanced_route,
        direct_route=direct_route,
        generation_history=gen_history,
        winner_algorithm="Genetic Algorithm",
        ai_explanation=explanation,
        weather=weather,
        battery_sufficient=True,
        battery_required_pct=round(battery_required, 2),
        battery_available_pct=req.initial_battery_pct,
        fitness_improvement_pct=fitness_improvement_pct,
        generations_to_converge=generations_to_converge,
        route_selection_reasons=route_reasons,
    )

