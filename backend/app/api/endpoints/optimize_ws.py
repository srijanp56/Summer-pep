import json
import asyncio
import uuid
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.models.domain import (
    OptimizationRequest,
    OptimizationResponse,
    WeatherConditions,
    GenerationMetric,
)
from app.ai.physics import DRONE_MODELS, DEFAULT_NO_FLY_ZONES
from app.ai.genetic_algorithm import GeneticAlgorithmSolver
from app.ai.explanation import generate_ai_explanation, build_route_selection_reasons

router = APIRouter()


@router.websocket("/optimize/ws")
async def optimize_websocket(websocket: WebSocket):
    """
    WebSocket endpoint for real-time GA evolution streaming.

    Protocol:
      CLIENT → sends JSON: OptimizationRequest fields
      SERVER → streams JSON per generation: {"type": "generation", "data": GenerationMetric}
      SERVER → sends JSON at end: {"type": "result", "data": OptimizationResponse}
      SERVER → on error: {"type": "error", "message": "..."}
    """
    await websocket.accept()

    try:
        raw = await websocket.receive_text()
        req_data = json.loads(raw)
        req = OptimizationRequest(**req_data)

        specs = DRONE_MODELS.get(req.drone_model, DRONE_MODELS["DJI FlyCart 30"])

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

        effective_priority = "speed" if req.emergency_medical else req.priority

        generation_metrics: list[GenerationMetric] = []

        loop = asyncio.get_event_loop()

        def sync_callback(metric: GenerationMetric):
            generation_metrics.append(metric)
            asyncio.get_event_loop().call_soon_threadsafe(
                asyncio.ensure_future,
                websocket.send_text(json.dumps({
                    "type": "generation",
                    "data": metric.model_dump(),
                }))
            )

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

        ga_route, balanced_route, direct_route, gen_history, _ = await loop.run_in_executor(
            None,
            lambda: ga_solver.solve(on_generation=sync_callback),
        )

        # Battery check
        battery_required = ga_route.battery_consumed_pct
        battery_sufficient = battery_required <= req.initial_battery_pct

        if not battery_sufficient:
            await websocket.send_text(json.dumps({
                "type": "error",
                "error": "INSUFFICIENT_BATTERY",
                "message": (
                    f"Drone cannot reach destination. "
                    f"Best route requires {battery_required:.1f}% battery, "
                    f"only {req.initial_battery_pct:.0f}% available."
                ),
                "battery_required_pct": round(battery_required, 2),
                "battery_available_pct": req.initial_battery_pct,
                "deficit_pct": round(battery_required - req.initial_battery_pct, 2),
            }))
            await websocket.close()
            return

        # GA Insight computation
        fitness_improvement_pct = 0.0
        generations_to_converge = 0
        if gen_history:
            first_fit = gen_history[0].best_fitness
            last_fit = gen_history[-1].best_fitness
            if first_fit != 0:
                fitness_improvement_pct = round(abs(last_fit - first_fit) / abs(first_fit) * 100, 2)
            threshold = 0.0001
            for i in range(1, len(gen_history)):
                if abs(gen_history[i].best_fitness - gen_history[i - 1].best_fitness) < threshold:
                    generations_to_converge = gen_history[i].generation
                    break
            if generations_to_converge == 0:
                generations_to_converge = gen_history[-1].generation

        explanation = generate_ai_explanation(
            ga_route=ga_route,
            weather=weather,
            specs=specs,
            payload_kg=req.payload_weight_kg,
            gen_history=gen_history,
        )
        route_reasons = build_route_selection_reasons(ga_route, weather, gen_history)

        response = OptimizationResponse(
            request_id=str(uuid.uuid4()),
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


        await websocket.send_text(json.dumps({
            "type": "result",
            "data": response.model_dump(),
        }))

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_text(json.dumps({
                "type": "error",
                "message": str(e),
            }))
        except Exception:
            pass
        finally:
            try:
                await websocket.close()
            except Exception:
                pass
