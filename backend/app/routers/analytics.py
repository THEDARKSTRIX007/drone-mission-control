from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Dict
from app.database import get_db
from app.models.mission import Mission

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/overview", response_model=Dict[str, object])
def analytics_overview(db: Session = Depends(get_db)):
    """Get organization analytics overview (completed missions, distance, flight hours)."""
    total_surveys = db.query(Mission).filter(Mission.status == "completed").count()
    total_distance = 0
    total_duration = 0

    missions = db.query(Mission).filter(Mission.status == "completed").all()

    for m in missions:
        if m.path:
            # Approximate distance: number of waypoints * 10 meters per segment
            total_distance += len(m.path) * 10
        if m.start_time and m.end_time:
            total_duration += (m.end_time - m.start_time).total_seconds()

    return {
        "total_surveys": total_surveys,
        "estimated_total_distance_m": total_distance,
        "estimated_total_flight_hours": round(total_duration / 3600, 2),
    }
