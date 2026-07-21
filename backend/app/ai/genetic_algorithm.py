import random
import time
import math
from typing import List, Tuple, Dict, Any
from app.models.domain import (
    Coordinates,
    Waypoint,
    NoFlyZone,
    DroneSpecs,
    WeatherConditions,
    GenerationMetric,
    RouteResult,
)
from app.ai.physics import (
    haversine_distance_km,
    calculate_segment_physics,
    line_segment_intersects_polygon,
    get_terrain_elevation,
    DRONE_MODELS,
    DEFAULT_NO_FLY_ZONES,
)


class Chromosome:
    """Represents a drone flight path consisting of waypoints between start and destination."""

    def __init__(self, waypoints: List[Waypoint]):
        self.waypoints: List[Waypoint] = waypoints
        self.fitness: float = 0.0
        self.metrics: Dict[str, float] = {}

    def copy(self) -> "Chromosome":
        c = Chromosome([Waypoint(**wp.model_dump()) for wp in self.waypoints])
        c.fitness = self.fitness
        c.metrics = self.metrics.copy()
        return c


class GeneticAlgorithmSolver:
    def __init__(
        self,
        start: Coordinates,
        destination: Coordinates,
        specs: DroneSpecs = DRONE_MODELS["DJI FlyCart 30"],
        payload_kg: float = 1.5,
        weather: WeatherConditions = WeatherConditions(),
        no_fly_zones: List[NoFlyZone] = DEFAULT_NO_FLY_ZONES,
        population_size: int = 100,
        max_generations: int = 100,
        elitism_pct: float = 0.10,
        mutation_rate: float = 0.20,
        intermediate_waypoints_count: int = 4,
        priority: str = "balanced",
    ):
        self.start = start
        self.destination = destination
        self.specs = specs
        self.payload_kg = payload_kg
        self.weather = weather
        self.no_fly_zones = no_fly_zones
        self.population_size = population_size
        self.max_generations = max_generations
        self.elitism_count = max(1, int(population_size * elitism_pct))
        self.mutation_rate = mutation_rate
        self.num_intermediate = intermediate_waypoints_count
        self.priority = priority

        self.direct_dist_km = haversine_distance_km(start, destination)

    def _generate_random_waypoint(self, ratio: float) -> Waypoint:
        """Generate a random intermediate waypoint along the journey vector with orthogonal noise."""
        lat = self.start.lat + ratio * (self.destination.lat - self.start.lat)
        lng = self.start.lng + ratio * (self.destination.lng - self.start.lng)

        # Perpendicular offset (spread proportional to distance)
        max_offset = min(0.04, max(0.005, self.direct_dist_km * 0.003))
        lat_offset = random.uniform(-max_offset, max_offset)
        lng_offset = random.uniform(-max_offset, max_offset)

        w_lat = lat + lat_offset
        w_lng = lng + lng_offset
        terrain, elev = get_terrain_elevation(w_lat, w_lng)
        alt = random.uniform(40.0, 100.0) + (elev * 0.2)

        return Waypoint(lat=w_lat, lng=w_lng, alt=alt, terrain=terrain)

    def initialize_population(self) -> List[Chromosome]:
        population: List[Chromosome] = []
        for _ in range(self.population_size):
            waypoints = [Waypoint(lat=self.start.lat, lng=self.start.lng, alt=self.start.alt)]
            for i in range(1, self.num_intermediate + 1):
                ratio = i / (self.num_intermediate + 1)
                waypoints.append(self._generate_random_waypoint(ratio))
            waypoints.append(Waypoint(lat=self.destination.lat, lng=self.destination.lng, alt=self.destination.alt))

            c = Chromosome(waypoints)
            population.append(c)

        return population

    def evaluate_fitness(self, chromosome: Chromosome) -> float:
        """
        Multi-objective fitness evaluation:
        Fitness = 0.30*Distance + 0.25*Battery + 0.20*Weather + 0.15*Risk + 0.10*Payload
        Minus heavy penalty for No-Fly Zone intersection.
        """
        total_dist_km = 0.0
        total_time_min = 0.0
        total_energy_wh = 0.0
        weather_risk_sum = 0.0
        no_fly_penalties = 0.0
        terrain_penalty = 0.0

        wps = chromosome.waypoints
        n_segments = len(wps) - 1

        for i in range(n_segments):
            p1 = Coordinates(lat=wps[i].lat, lng=wps[i].lng, alt=wps[i].alt)
            p2 = Coordinates(lat=wps[i+1].lat, lng=wps[i+1].lng, alt=wps[i+1].alt)

            seg_phys = calculate_segment_physics(p1, p2, self.specs, self.payload_kg, self.weather)
            total_dist_km += seg_phys["distance_km"]
            total_time_min += seg_phys["time_min"]
            total_energy_wh += seg_phys["energy_wh"]
            weather_risk_sum += seg_phys["risk"]

            # No-fly zone intersection check
            for zone in self.no_fly_zones:
                if line_segment_intersects_polygon(p1, p2, zone.polygon):
                    no_fly_penalties += zone.penalty_score

            # Terrain elevation check
            if wps[i+1].terrain == "mountain":
                terrain_penalty += 15.0
            elif wps[i+1].terrain == "building":
                terrain_penalty += 10.0

        avg_weather_risk = weather_risk_sum / max(1, n_segments)

        # Normalized fitness sub-scores (0 to 1 scale)
        dist_ratio = self.direct_dist_km / max(0.001, total_dist_km)
        f_distance = min(1.0, dist_ratio)

        battery_drain_pct = min(100.0, (total_energy_wh / self.specs.battery_capacity_wh) * 100.0)
        f_battery = max(0.0, 1.0 - (battery_drain_pct / 100.0))

        f_weather = max(0.0, 1.0 - avg_weather_risk)
        f_risk = 1.0 if no_fly_penalties == 0 else max(0.0, 1.0 - (no_fly_penalties / 10000.0))

        payload_capacity_ratio = self.payload_kg / self.specs.max_payload_kg
        f_payload = max(0.1, 1.0 - 0.4 * payload_capacity_ratio)

        # Dynamic priority weighting
        if self.priority == "speed":
            w_dist, w_bat, w_wea, w_risk, w_pay = 0.45, 0.15, 0.15, 0.15, 0.10
        elif self.priority == "battery":
            w_dist, w_bat, w_wea, w_risk, w_pay = 0.20, 0.45, 0.15, 0.10, 0.10
        elif self.priority == "safety":
            w_dist, w_bat, w_wea, w_risk, w_pay = 0.15, 0.15, 0.30, 0.30, 0.10
        else:  # balanced
            w_dist, w_bat, w_wea, w_risk, w_pay = 0.30, 0.25, 0.20, 0.15, 0.10

        base_fitness = (
            w_dist * f_distance
            + w_bat * f_battery
            + w_wea * f_weather
            + w_risk * f_risk
            + w_pay * f_payload
        ) * 100.0

        # Subtractions for hard safety violations
        final_fitness = max(0.001, base_fitness - no_fly_penalties - terrain_penalty)

        chromosome.fitness = final_fitness
        chromosome.metrics = {
            "distance_km": round(total_dist_km, 3),
            "time_min": round(total_time_min, 2),
            "battery_drain_pct": round(battery_drain_pct, 2),
            "energy_wh": round(total_energy_wh, 2),
            "weather_risk": round(avg_weather_risk, 3),
            "safety_risk": round(no_fly_penalties / 5000.0, 3),
            "no_fly_penalties": no_fly_penalties,
        }
        return final_fitness

    def tournament_selection(self, population: List[Chromosome], k: int = 5) -> Chromosome:
        selected = random.sample(population, k)
        return max(selected, key=lambda c: c.fitness)

    def two_point_crossover(self, p1: Chromosome, p2: Chromosome) -> Tuple[Chromosome, Chromosome]:
        """Perform two-point crossover on intermediate waypoints."""
        if len(p1.waypoints) <= 3:
            return p1.copy(), p2.copy()

        n = len(p1.waypoints) - 2  # exclude start and dest
        idx1, idx2 = sorted(random.sample(range(1, n + 1), 2))

        child1_wps = (
            [p1.waypoints[0]]
            + p1.waypoints[1:idx1]
            + p2.waypoints[idx1:idx2]
            + p1.waypoints[idx2:-1]
            + [p1.waypoints[-1]]
        )

        child2_wps = (
            [p2.waypoints[0]]
            + p2.waypoints[1:idx1]
            + p1.waypoints[idx1:idx2]
            + p2.waypoints[idx2:-1]
            + [p2.waypoints[-1]]
        )

        return Chromosome(child1_wps), Chromosome(child2_wps)

    def mutate(self, chromosome: Chromosome) -> None:
        """Random waypoint mutation: offsets intermediate waypoints."""
        for i in range(1, len(chromosome.waypoints) - 1):
            if random.random() < self.mutation_rate:
                wp = chromosome.waypoints[i]
                lat_noise = random.gauss(0, 0.003)
                lng_noise = random.gauss(0, 0.003)
                alt_noise = random.gauss(0, 5.0)

                new_lat = wp.lat + lat_noise
                new_lng = wp.lng + lng_noise
                new_alt = max(30.0, min(120.0, wp.alt + alt_noise))
                terrain, _ = get_terrain_elevation(new_lat, new_lng)

                chromosome.waypoints[i] = Waypoint(
                    lat=new_lat, lng=new_lng, alt=new_alt, terrain=terrain
                )

    def solve(self) -> Tuple[RouteResult, List[GenerationMetric], float]:
        start_time = time.time()
        population = self.initialize_population()
        for c in population:
            self.evaluate_fitness(c)

        generation_history: List[GenerationMetric] = []
        best_overall = max(population, key=lambda c: c.fitness).copy()

        for gen in range(1, self.max_generations + 1):
            population.sort(key=lambda c: c.fitness, reverse=True)

            # Record generation metrics
            best_curr = population[0]
            avg_fit = sum(c.fitness for c in population) / self.population_size
            min_fit = population[-1].fitness

            if best_curr.fitness > best_overall.fitness:
                best_overall = best_curr.copy()

            generation_history.append(
                GenerationMetric(
                    generation=gen,
                    best_fitness=round(best_curr.fitness, 2),
                    avg_fitness=round(avg_fit, 2),
                    min_fitness=round(min_fit, 2),
                    best_distance_km=best_curr.metrics.get("distance_km", 0.0),
                    best_battery_drain_pct=best_curr.metrics.get("battery_drain_pct", 0.0),
                )
            )

            # Elitism: retain top 10%
            next_generation = [c.copy() for c in population[: self.elitism_count]]

            # Breed remaining population
            while len(next_generation) < self.population_size:
                p1 = self.tournament_selection(population)
                p2 = self.tournament_selection(population)
                c1, c2 = self.two_point_crossover(p1, p2)
                self.mutate(c1)
                self.mutate(c2)
                self.evaluate_fitness(c1)
                self.evaluate_fitness(c2)
                next_generation.append(c1)
                if len(next_generation) < self.population_size:
                    next_generation.append(c2)

            population = next_generation

        execution_time_ms = (time.time() - start_time) * 1000.0

        # Construct RouteResult for GA winner
        m = best_overall.metrics
        battery_pct = m.get("battery_drain_pct", 15.0)
        safety_risk = m.get("safety_risk", 0.0)

        success_prob = round(
            max(0.05, min(0.99, (1.0 - (battery_pct / 100.0)) * (1.0 - safety_risk))), 2
        )

        route_result = RouteResult(
            algorithm="Genetic Algorithm",
            waypoints=best_overall.waypoints,
            total_distance_km=m.get("distance_km", 0.0),
            estimated_flight_time_min=m.get("time_min", 0.0),
            battery_consumed_pct=battery_pct,
            energy_wh=m.get("energy_wh", 0.0),
            weather_risk_score=m.get("weather_risk", 0.0),
            safety_risk_score=safety_risk,
            success_probability=success_prob,
            total_cost_usd=round(m.get("distance_km", 0.0) * 0.45 + 2.5, 2),
            carbon_saved_kg=round(m.get("distance_km", 0.0) * 0.18, 2),
            execution_time_ms=round(execution_time_ms, 2),
        )

        return route_result, generation_history, execution_time_ms
