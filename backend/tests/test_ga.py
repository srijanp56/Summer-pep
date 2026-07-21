from app.models.domain import Coordinates, WeatherConditions
from app.ai.genetic_algorithm import GeneticAlgorithmSolver
from app.ai.physics import DRONE_MODELS, DEFAULT_NO_FLY_ZONES


def test_genetic_algorithm_solve():
    start = Coordinates(lat=37.7749, lng=-122.4194)
    dest = Coordinates(lat=37.7949, lng=-122.3994)
    specs = DRONE_MODELS["Matrice 350 RTK"]
    weather = WeatherConditions(wind_speed_m_s=4.0)

    solver = GeneticAlgorithmSolver(
        start=start,
        destination=dest,
        specs=specs,
        payload_kg=1.0,
        weather=weather,
        no_fly_zones=DEFAULT_NO_FLY_ZONES,
        population_size=30,
        max_generations=15,
    )

    route_result, gen_history, exec_ms = solver.solve()

    assert route_result.algorithm == "Genetic Algorithm"
    assert len(route_result.waypoints) >= 4
    assert route_result.total_distance_km > 0
    assert route_result.battery_consumed_pct > 0
    assert len(gen_history) == 15
    assert exec_ms > 0
