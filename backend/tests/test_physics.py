from app.models.domain import Coordinates, WeatherConditions
from app.ai.physics import (
    haversine_distance_km,
    point_in_polygon,
    calculate_segment_physics,
    DRONE_MODELS,
    DEFAULT_NO_FLY_ZONES,
)


def test_haversine_distance():
    p1 = Coordinates(lat=37.7749, lng=-122.4194)
    p2 = Coordinates(lat=37.7849, lng=-122.4094)
    dist = haversine_distance_km(p1, p2)
    assert dist > 1.0 and dist < 2.0


def test_no_fly_zone_point_inside():
    # Test point inside airport polygon
    inside_point = Coordinates(lat=37.6250, lng=-122.3750)
    polygon = DEFAULT_NO_FLY_ZONES[0].polygon
    assert point_in_polygon(inside_point, polygon) is True


def test_physics_power_consumption():
    p1 = Coordinates(lat=37.7749, lng=-122.4194)
    p2 = Coordinates(lat=37.7849, lng=-122.4094)
    specs = DRONE_MODELS["DJI FlyCart 30"]
    weather = WeatherConditions(wind_speed_m_s=5.0)

    phys = calculate_segment_physics(p1, p2, specs, payload_kg=2.0, weather=weather)
    assert phys["distance_km"] > 0
    assert phys["power_w"] > 500.0
    assert phys["energy_wh"] > 0
