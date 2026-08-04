import time
import asyncio
from typing import Optional, Dict, Tuple
import httpx
from fastapi import APIRouter
from app.models.domain import WeatherConditions
from app.core.config import settings

router = APIRouter()

# ──────────────────────────────────────────────────────────────
# In-memory weather cache: { cache_key: (WeatherConditions, timestamp) }
# TTL: 5 minutes
# ──────────────────────────────────────────────────────────────
_weather_cache: Dict[str, Tuple[WeatherConditions, float]] = {}
CACHE_TTL_SECONDS = 300  # 5 minutes


def _cache_key(lat: float, lng: float) -> str:
    # Round to 2 decimal places (~1 km grid) for cache hit rate
    return f"{round(lat, 2)},{round(lng, 2)}"


def _fetch_openweathermap(lat: float, lng: float) -> Optional[WeatherConditions]:
    """Call OpenWeatherMap Current Weather API and map response to WeatherConditions."""
    api_key = settings.OPENWEATHER_API_KEY
    if not api_key:
        return None

    url = (
        f"https://api.openweathermap.org/data/2.5/weather"
        f"?lat={lat}&lon={lng}&units=metric&appid={api_key}"
    )
    try:
        with httpx.Client(timeout=5.0) as client:
            resp = client.get(url)
            resp.raise_for_status()
            data = resp.json()

        wind = data.get("wind", {})
        rain = data.get("rain", {}).get("1h", 0.0)  # mm in last hour
        main = data.get("main", {})

        wind_speed_m_s = float(wind.get("speed", 5.0))
        wind_direction_deg = float(wind.get("deg", 45.0))
        rain_intensity_mm_h = float(rain)
        temperature_c = float(main.get("temp", 22.0))
        visibility_km = float(data.get("visibility", 10000)) / 1000.0  # OWM gives metres

        return WeatherConditions(
            wind_speed_m_s=round(wind_speed_m_s, 1),
            wind_direction_deg=round(wind_direction_deg, 1),
            rain_intensity_mm_h=round(rain_intensity_mm_h, 2),
            temperature_c=round(temperature_c, 1),
            visibility_km=round(visibility_km, 1),
            is_simulated=False,
        )
    except Exception:
        return None


@router.get("/weather", response_model=WeatherConditions)
def get_weather(mode: str = "simulated", lat: float = 37.7749, lng: float = -122.4194):
    """
    Returns weather telemetry data.
    - mode=simulated: returns deterministic simulated conditions
    - mode=live: calls OpenWeatherMap API (cached 5 min), falls back to simulated if API key not set
    """
    if mode == "live":
        key = _cache_key(lat, lng)
        cached = _weather_cache.get(key)
        if cached and (time.time() - cached[1]) < CACHE_TTL_SECONDS:
            # Return cached live data
            return cached[0]

        live_weather = _fetch_openweathermap(lat, lng)
        if live_weather:
            _weather_cache[key] = (live_weather, time.time())
            return live_weather

        # Fallback: simulated with realistic variance if API key not set
        import random
        fallback = WeatherConditions(
            wind_speed_m_s=round(random.uniform(2.0, 10.0), 1),
            wind_direction_deg=round(random.uniform(0.0, 360.0), 1),
            rain_intensity_mm_h=round(random.uniform(0.0, 3.0), 2),
            temperature_c=round(random.uniform(12.0, 32.0), 1),
            visibility_km=round(random.uniform(6.0, 10.0), 1),
            is_simulated=True,
        )
        return fallback

    # Simulated preset
    return WeatherConditions(
        wind_speed_m_s=5.5,
        wind_direction_deg=90.0,
        rain_intensity_mm_h=0.0,
        temperature_c=22.0,
        visibility_km=10.0,
        is_simulated=True,
    )
