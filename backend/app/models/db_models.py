from sqlalchemy import Column, String, Float, Integer, DateTime, Text, JSON
from datetime import datetime
from app.core.database import Base


class SimulationLogDB(Base):
    __tablename__ = "simulation_logs"

    id = Column(String, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    start_lat = Column(Float, nullable=False)
    start_lng = Column(Float, nullable=False)
    dest_lat = Column(Float, nullable=False)
    dest_lng = Column(Float, nullable=False)
    payload_weight_kg = Column(Float, nullable=False)
    drone_model = Column(String, nullable=False)
    winner_algorithm = Column(String, nullable=False)
    ga_distance_km = Column(Float, nullable=False)
    ga_battery_used_pct = Column(Float, nullable=False)
    ga_flight_time_min = Column(Float, nullable=False)
    weather_summary = Column(JSON, nullable=True)
    ai_explanation = Column(Text, nullable=True)
