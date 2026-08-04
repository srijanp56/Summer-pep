import heapq
import math
import time
from typing import List, Tuple, Dict, Set
from app.models.domain import (
    Coordinates,
    Waypoint,
    NoFlyZone,
    DroneSpecs,
    WeatherConditions,
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


class GridNode:
    def __init__(self, lat: float, lng: float, alt: float = 50.0):
        self.lat = lat
        self.lng = lng
        self.alt = alt

    @property
    def key(self) -> Tuple[float, float]:
        return (round(self.lat, 5), round(self.lng, 5))


class SpatialGridSolver:
    def __init__(
        self,
        start: Coordinates,
        destination: Coordinates,
        specs: DroneSpecs = DRONE_MODELS["DJI FlyCart 30"],
        payload_kg: float = 1.5,
        weather: WeatherConditions = WeatherConditions(),
        no_fly_zones: List[NoFlyZone] = DEFAULT_NO_FLY_ZONES,
        grid_resolution: int = 12,
    ):
        self.start = start
        self.destination = destination
        self.specs = specs
        self.payload_kg = payload_kg
        self.weather = weather
        self.no_fly_zones = no_fly_zones
        self.resolution = grid_resolution

        self.nodes, self.adj_list = self._build_graph()

    def _build_graph(self) -> Tuple[List[GridNode], Dict[int, List[Tuple[int, float]]]]:
        """Construct discrete spatial lattice between start and destination."""
        min_lat = min(self.start.lat, self.destination.lat) - 0.015
        max_lat = max(self.start.lat, self.destination.lat) + 0.015
        min_lng = min(self.start.lng, self.destination.lng) - 0.015
        max_lng = max(self.start.lng, self.destination.lng) + 0.015

        lat_step = (max_lat - min_lat) / self.resolution
        lng_step = (max_lng - min_lng) / self.resolution

        grid_nodes: List[GridNode] = [GridNode(self.start.lat, self.start.lng, self.start.alt)]
        start_idx = 0

        for i in range(self.resolution + 1):
            for j in range(self.resolution + 1):
                lat = min_lat + i * lat_step
                lng = min_lng + j * lng_step
                terrain, elev = get_terrain_elevation(lat, lng)
                grid_nodes.append(GridNode(lat, lng, 50.0 + elev * 0.2))

        grid_nodes.append(GridNode(self.destination.lat, self.destination.lng, self.destination.alt))
        dest_idx = len(grid_nodes) - 1

        self.start_idx = start_idx
        self.dest_idx = dest_idx

        adj_list: Dict[int, List[Tuple[int, float]]] = {i: [] for i in range(len(grid_nodes))}

        # Connect neighboring nodes
        for i, n1 in enumerate(grid_nodes):
            c1 = Coordinates(lat=n1.lat, lng=n1.lng, alt=n1.alt)
            for j, n2 in enumerate(grid_nodes):
                if i == j:
                    continue
                c2 = Coordinates(lat=n2.lat, lng=n2.lng, alt=n2.alt)
                d = haversine_distance_km(c1, c2)
                # Only connect nearby nodes (or direct link if small)
                if d <= max(0.8, (lat_step + lng_step) * 110.0 * 1.5):
                    # Check No-Fly Zone penalty
                    penalty = 0.0
                    for zone in self.no_fly_zones:
                        if line_segment_intersects_polygon(c1, c2, zone.polygon):
                            penalty += zone.penalty_score

                    seg_phys = calculate_segment_physics(c1, c2, self.specs, self.payload_kg, self.weather)
                    edge_cost = seg_phys["distance_km"] + (penalty * 0.01) + (seg_phys["risk"] * 0.5)
                    adj_list[i].append((j, edge_cost))

        return grid_nodes, adj_list

    def solve_astar(self) -> RouteResult:
        start_time = time.time()
        start_node = self.nodes[self.start_idx]
        dest_node = self.nodes[self.dest_idx]
        dest_coord = Coordinates(lat=dest_node.lat, lng=dest_node.lng)

        def heuristic(idx: int) -> float:
            n = self.nodes[idx]
            return haversine_distance_km(Coordinates(lat=n.lat, lng=n.lng), dest_coord)

        open_set: List[Tuple[float, float, int]] = [(0.0 + heuristic(self.start_idx), 0.0, self.start_idx)]
        g_score: Dict[int, float] = {i: float("inf") for i in range(len(self.nodes))}
        g_score[self.start_idx] = 0.0
        came_from: Dict[int, int] = {}

        while open_set:
            f, current_g, curr_idx = heapq.heappop(open_set)
            if curr_idx == self.dest_idx:
                break

            if current_g > g_score[curr_idx]:
                continue

            for neighbor_idx, cost in self.adj_list[curr_idx]:
                tentative_g = g_score[curr_idx] + cost
                if tentative_g < g_score[neighbor_idx]:
                    came_from[neighbor_idx] = curr_idx
                    g_score[neighbor_idx] = tentative_g
                    f_score = tentative_g + heuristic(neighbor_idx)
                    heapq.heappush(open_set, (f_score, tentative_g, neighbor_idx))

        path_indices = []
        curr = self.dest_idx
        while curr in came_from:
            path_indices.append(curr)
            curr = came_from[curr]
        path_indices.append(self.start_idx)
        path_indices.reverse()

        execution_time_ms = (time.time() - start_time) * 1000.0
        return self._build_route_result("A* Algorithm", path_indices, execution_time_ms)

    def solve_dijkstra(self) -> RouteResult:
        start_time = time.time()
        dist: Dict[int, float] = {i: float("inf") for i in range(len(self.nodes))}
        dist[self.start_idx] = 0.0
        came_from: Dict[int, int] = {}
        pq: List[Tuple[float, int]] = [(0.0, self.start_idx)]

        while pq:
            d, curr_idx = heapq.heappop(pq)
            if curr_idx == self.dest_idx:
                break
            if d > dist[curr_idx]:
                continue

            for neighbor_idx, cost in self.adj_list[curr_idx]:
                if dist[curr_idx] + cost < dist[neighbor_idx]:
                    dist[neighbor_idx] = dist[curr_idx] + cost
                    came_from[neighbor_idx] = curr_idx
                    heapq.heappush(pq, (dist[neighbor_idx], neighbor_idx))

        path_indices = []
        curr = self.dest_idx
        while curr in came_from:
            path_indices.append(curr)
            curr = came_from[curr]
        path_indices.append(self.start_idx)
        path_indices.reverse()

        execution_time_ms = (time.time() - start_time) * 1000.0
        return self._build_route_result("Dijkstra Algorithm", path_indices, execution_time_ms)

    def _build_route_result(self, algo_name: str, path_indices: List[int], execution_time_ms: float) -> RouteResult:
        waypoints: List[Waypoint] = []
        total_dist_km = 0.0
        total_time_min = 0.0
        total_energy_wh = 0.0
        weather_risk_sum = 0.0
        no_fly_penalties = 0.0

        for idx in path_indices:
            n = self.nodes[idx]
            terrain, _ = get_terrain_elevation(n.lat, n.lng)
            waypoints.append(Waypoint(lat=n.lat, lng=n.lng, alt=n.alt, terrain=terrain))

        n_segments = max(1, len(waypoints) - 1)
        for i in range(n_segments):
            p1 = Coordinates(lat=waypoints[i].lat, lng=waypoints[i].lng, alt=waypoints[i].alt)
            p2 = Coordinates(lat=waypoints[i+1].lat, lng=waypoints[i+1].lng, alt=waypoints[i+1].alt)

            seg_phys = calculate_segment_physics(p1, p2, self.specs, self.payload_kg, self.weather)
            total_dist_km += seg_phys["distance_km"]
            total_time_min += seg_phys["time_min"]
            total_energy_wh += seg_phys["energy_wh"]
            weather_risk_sum += seg_phys["risk"]

            for zone in self.no_fly_zones:
                if line_segment_intersects_polygon(p1, p2, zone.polygon):
                    no_fly_penalties += zone.penalty_score

        battery_drain_pct = min(100.0, (total_energy_wh / self.specs.battery_capacity_wh) * 100.0)
        safety_risk = no_fly_penalties / 5000.0
        avg_weather_risk = weather_risk_sum / n_segments

        success_prob = round(
            max(0.05, min(0.99, (1.0 - (battery_drain_pct / 100.0)) * (1.0 - min(1.0, safety_risk)))), 2
        )

        return RouteResult(
            algorithm=algo_name,
            waypoints=waypoints,
            total_distance_km=round(total_dist_km, 3),
            estimated_flight_time_min=round(total_time_min, 2),
            battery_consumed_pct=round(battery_drain_pct, 2),
            energy_wh=round(total_energy_wh, 2),
            weather_risk_score=round(avg_weather_risk, 3),
            safety_risk_score=round(safety_risk, 3),
            success_probability=success_prob,
            total_cost_inr=round(total_dist_km * 15.0 + 50.0, 2),
            carbon_saved_kg=round(total_dist_km * 0.18, 2),
            execution_time_ms=round(execution_time_ms, 2),
        )
