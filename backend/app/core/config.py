import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "DroneRoute AI Enterprise Platform"
    API_V1_STR: str = "/api/v1"
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "sqlite:////tmp/droneroute.db" if os.environ.get("VERCEL") else "sqlite:///./droneroute.db"
    )
    POPULATION_SIZE: int = 100
    MAX_GENERATIONS: int = 100
    ELITISM_PCT: float = 0.10
    TOURNAMENT_SIZE: int = 5
    MUTATION_RATE: float = 0.15

    class Config:
        case_sensitive = True


settings = Settings()
