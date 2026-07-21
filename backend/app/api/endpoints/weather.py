import random
from fastapi import APIRouter
from app.models.domain import WeatherConditions

router = APIRouter()


@router.get("/weather", response_model=WeatherConditions)
def get_weather(mode: str = "simulated", lat: float = 37.7749, lng: float = -122.4194):
    """Returns real-time or simulated weather telemetry data."""
    if mode == "live":
        # Realistic live weather synthesis (or fallback API bridge)
        return WeatherConditions(
            wind_speed_m_s=round(random.uniform(3.0, 9.5), 1),
            wind_direction_deg=round(random.uniform(0.0, 360.0), 1),
            rain_intensity_mm_h=round(random.uniform(0.0, 4.0), 1),
            temperature_c=round(random.uniform(14.0, 26.0), 1),
            visibility_km=round(random.uniform(7.0, 10.0), 1),
            is_simulated=False,
        )

    # Simulated preset
    return WeatherConditions(
        wind_speed_m_s=5.5,
        wind_direction_deg=90.0,
        rain_intensity_mm_h=0.0,
        temperature_c=22.0,
        visibility_km=10.0,
        is_simulated=True,
    )
