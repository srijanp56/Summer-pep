import math
from typing import List, Tuple, Dict
from app.models.domain import Coordinates, Waypoint, NoFlyZone, DroneSpecs, WeatherConditions

# 1. Preset Drone Specifications
DRONE_MODELS: Dict[str, DroneSpecs] = {
    "DJI FlyCart 30": DroneSpecs(
        model_name="DJI FlyCart 30",
        max_payload_kg=30.0,
        battery_capacity_wh=1800.0,
        max_speed_m_s=20.0,
        base_drain_w=650.0,
        drag_coeff=0.35,
        empty_weight_kg=65.0,
    ),
    "Matrice 350 RTK": DroneSpecs(
        model_name="Matrice 350 RTK",
        max_payload_kg=2.7,
        battery_capacity_wh=520.0,
        max_speed_m_s=23.0,
        base_drain_w=280.0,
        drag_coeff=0.25,
        empty_weight_kg=6.4,
    ),
    "Wingcopter 198": DroneSpecs(
        model_name="Wingcopter 198",
        max_payload_kg=6.0,
        battery_capacity_wh=1200.0,
        max_speed_m_s=35.0,
        base_drain_w=420.0,
        drag_coeff=0.18,
        empty_weight_kg=15.0,
    ),
    "MedExpress EVTOL": DroneSpecs(
        model_name="MedExpress EVTOL",
        max_payload_kg=5.0,
        battery_capacity_wh=1400.0,
        max_speed_m_s=30.0,
        base_drain_w=380.0,
        drag_coeff=0.20,
        empty_weight_kg=12.0,
    ),
}

# 2. Preset No-Fly Zones (San Francisco / Bay Area & Default Geo Presets)
DEFAULT_NO_FLY_ZONES: List[NoFlyZone] = [
    NoFlyZone(
        id="nfz_airport_1",
        name="International Airport Class B Airspace",
        zone_type="airport",
        polygon=[
            Coordinates(lat=37.6213, lng=-122.3790),
            Coordinates(lat=37.6400, lng=-122.3600),
            Coordinates(lat=37.6350, lng=-122.3900),
            Coordinates(lat=37.6100, lng=-122.4000),
        ],
        penalty_score=5000.0,
    ),
    NoFlyZone(
        id="nfz_military_1",
        name="Restricted Military Logistics Zone",
        zone_type="military",
        polygon=[
            Coordinates(lat=37.7500, lng=-122.4200),
            Coordinates(lat=37.7600, lng=-122.4100),
            Coordinates(lat=37.7550, lng=-122.3950),
            Coordinates(lat=37.7450, lng=-122.4050),
        ],
        penalty_score=8000.0,
    ),
    NoFlyZone(
        id="nfz_hospital_1",
        name="Metro Hospital Helipad Noise Buffer",
        zone_type="hospital",
        polygon=[
            Coordinates(lat=37.7850, lng=-122.4350),
            Coordinates(lat=37.7900, lng=-122.4300),
            Coordinates(lat=37.7880, lng=-122.4220),
            Coordinates(lat=37.7830, lng=-122.4280),
        ],
        penalty_score=2500.0,
    ),
]


def haversine_distance_km(coord1: Coordinates, coord2: Coordinates) -> float:
    """Calculate the Great Circle Distance between two lat/lng points in kilometers."""
    R = 6371.0  # Earth radius in km
    dlat = math.radians(coord2.lat - coord1.lat)
    dlng = math.radians(coord2.lng - coord1.lng)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(coord1.lat))
        * math.cos(math.radians(coord2.lat))
        * math.sin(dlng / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def calculate_bearing_deg(coord1: Coordinates, coord2: Coordinates) -> float:
    """Calculate compass bearing between two points in degrees (0..360)."""
    lat1 = math.radians(coord1.lat)
    lat2 = math.radians(coord2.lat)
    dlng = math.radians(coord2.lng - coord1.lng)

    x = math.sin(dlng) * math.cos(lat2)
    y = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(dlng)
    initial_bearing = math.atan2(x, y)
    initial_bearing = math.degrees(initial_bearing)
    return (initial_bearing + 360) % 360


def point_in_polygon(point: Coordinates, polygon: List[Coordinates]) -> bool:
    """Ray-casting algorithm to test if point is inside a polygon."""
    num = len(polygon)
    j = num - 1
    c = False
    for i in range(num):
        if ((polygon[i].lng > point.lng) != (polygon[j].lng > point.lng)) and (
            point.lat
            < (polygon[j].lat - polygon[i].lat)
            * (point.lng - polygon[i].lng)
            / (polygon[j].lng - polygon[i].lng + 1e-12)
            + polygon[i].lat
        ):
            c = not c
        j = i
    return c


def line_segment_intersects_polygon(
    p1: Coordinates, p2: Coordinates, polygon: List[Coordinates]
) -> bool:
    """Check if line segment p1-p2 intersects polygon boundary or has endpoints inside."""
    if point_in_polygon(p1, polygon) or point_in_polygon(p2, polygon):
        return True

    def ccw(A, B, C):
        return (C.lat - A.lat) * (B.lng - A.lng) > (B.lat - A.lat) * (C.lng - A.lng)

    def intersect(A, B, C, D):
        return ccw(A, C, D) != ccw(B, C, D) and ccw(A, B, C) != ccw(A, B, D)

    n = len(polygon)
    for i in range(n):
        q1 = polygon[i]
        q2 = polygon[(i + 1) % n]
        if intersect(p1, p2, q1, q2):
            return True
    return False


def get_terrain_elevation(lat: float, lng: float) -> Tuple[str, float]:
    """
    Synthesize terrain type and elevation (meters above sea level) based on coordinates.
    Provides realistic variation across geographic regions.
    """
    # Pseudo-elevation using harmonic functions
    elev = 20.0 + 40.0 * math.sin(lat * 80.0) * math.cos(lng * 80.0) + 15.0 * math.sin(lat * 200.0)
    elev = max(5.0, elev)

    if elev > 50.0:
        terrain = "mountain"
    elif 35.0 < elev <= 50.0:
        terrain = "building"
    elif 20.0 < elev <= 35.0:
        terrain = "forest"
    elif elev < 10.0:
        terrain = "water"
    else:
        terrain = "urban"

    return terrain, float(elev)


def calculate_segment_physics(
    p1: Coordinates,
    p2: Coordinates,
    specs: DroneSpecs,
    payload_kg: float,
    weather: WeatherConditions,
    package_type: str = "standard",
) -> Dict[str, float]:
    """
    Calculates detailed physical properties for flight between p1 and p2:
    - Ground distance (km)
    - Effective airspeed considering wind vectors (headwind / crosswind)
    - Power consumption (Watts) & battery Wh used
    - Weather risk factor
    """
    dist_km = haversine_distance_km(p1, p2)
    if dist_km < 1e-6:
        return {"distance_km": 0.0, "time_min": 0.0, "power_w": 0.0, "energy_wh": 0.0, "risk": 0.0}

    dist_m = dist_km * 1000.0
    bearing_deg = calculate_bearing_deg(p1, p2)

    # Wind vector decomposition
    # Wind direction in weather is direction wind is coming FROM in degrees
    wind_rad = math.radians((weather.wind_direction_deg + 180) % 360)
    bearing_rad = math.radians(bearing_deg)

    # Relative angle between flight path and wind heading
    rel_angle = wind_rad - bearing_rad
    headwind_component = weather.wind_speed_m_s * math.cos(rel_angle)  # positive = headwind
    crosswind_component = weather.wind_speed_m_s * math.sin(rel_angle)

    # Base cruise speed adjusted for payload, safety, and package type
    speed_mult = 1.2 if package_type == "cold_item" else (0.85 if package_type == "hot_food" else 1.0)
    base_speed = specs.max_speed_m_s * speed_mult * max(0.6, 1.0 - 0.25 * (payload_kg / specs.max_payload_kg))
    effective_ground_speed = max(5.0, base_speed - headwind_component)

    flight_time_s = dist_m / effective_ground_speed
    flight_time_min = flight_time_s / 60.0

    # Power breakdown (Aerodynamic model):
    # P_total = P_hover * (1 + payload_ratio) + P_parasitic_drag + P_climb + P_rain
    total_mass_kg = specs.empty_weight_kg + payload_kg
    mass_ratio = total_mass_kg / specs.empty_weight_kg

    p_hover = specs.base_drain_w * math.pow(mass_ratio, 1.5)

    # Drag power depends on relative airspeed v_air = ground_speed + headwind
    airspeed = effective_ground_speed + headwind_component
    p_drag = 0.5 * 1.225 * specs.drag_coeff * math.pow(airspeed, 3)

    # Climb power requirement
    alt_change_m = p2.alt - p1.alt
    p_climb = max(0.0, (total_mass_kg * 9.81 * alt_change_m) / max(1.0, flight_time_s))

    # Rain and environmental overhead
    p_env = 10.0 * weather.rain_intensity_mm_h + 0.5 * abs(crosswind_component) ** 2

    total_power_w = p_hover + p_drag + p_climb + p_env
    energy_wh = (total_power_w * flight_time_s) / 3600.0

    # Risk calculation
    wind_risk = min(1.0, weather.wind_speed_m_s / 25.0)
    rain_risk = min(1.0, weather.rain_intensity_mm_h / 20.0)
    vis_risk = max(0.0, 1.0 - (weather.visibility_km / 10.0))
    weather_risk = 0.4 * wind_risk + 0.4 * rain_risk + 0.2 * vis_risk

    return {
        "distance_km": dist_km,
        "time_min": flight_time_min,
        "power_w": total_power_w,
        "energy_wh": energy_wh,
        "risk": weather_risk,
    }
