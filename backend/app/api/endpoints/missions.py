from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.db_models import SimulationLogDB
from app.models.domain import MissionSummary, MissionListResponse

router = APIRouter()


@router.get("/missions", response_model=MissionListResponse)
def list_missions(limit: int = 50, offset: int = 0, db: Session = Depends(get_db)):
    """Returns paginated mission history, newest first."""
    total = db.query(SimulationLogDB).count()
    missions_db = (
        db.query(SimulationLogDB)
        .order_by(SimulationLogDB.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    summaries = [
        MissionSummary(
            id=m.id,
            created_at=m.created_at.isoformat() if m.created_at else "",
            start_lat=m.start_lat,
            start_lng=m.start_lng,
            dest_lat=m.dest_lat,
            dest_lng=m.dest_lng,
            payload_weight_kg=m.payload_weight_kg,
            drone_model=m.drone_model,
            winner_algorithm=m.winner_algorithm,
            ga_distance_km=m.ga_distance_km,
            ga_battery_used_pct=m.ga_battery_used_pct,
            ga_flight_time_min=m.ga_flight_time_min,
        )
        for m in missions_db
    ]

    return MissionListResponse(missions=summaries, total=total)


@router.get("/missions/{mission_id}")
def get_mission(mission_id: str, db: Session = Depends(get_db)):
    """Returns full detail for a single mission including AI explanation and weather."""
    m = db.query(SimulationLogDB).filter(SimulationLogDB.id == mission_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Mission not found")

    return {
        "id": m.id,
        "created_at": m.created_at.isoformat() if m.created_at else "",
        "start_lat": m.start_lat,
        "start_lng": m.start_lng,
        "dest_lat": m.dest_lat,
        "dest_lng": m.dest_lng,
        "payload_weight_kg": m.payload_weight_kg,
        "drone_model": m.drone_model,
        "winner_algorithm": m.winner_algorithm,
        "ga_distance_km": m.ga_distance_km,
        "ga_battery_used_pct": m.ga_battery_used_pct,
        "ga_flight_time_min": m.ga_flight_time_min,
        "weather_summary": m.weather_summary,
        "ai_explanation": m.ai_explanation,
    }
