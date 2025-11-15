from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.database import get_db
from app.models.mission import Mission
from app.mission_utils import (
    generate_grid_path,
    generate_crosshatch_path,
    generate_perimeter_path,
)

ALLOWED_SENSORS = {
    "optical_camera",
    "thermal_camera",
    "lidar",
    "multispectral",
    "rtk_gps",
    "gas_sensor"
}

class MissionCreate(BaseModel):
    name: str = Field(..., min_length=1)
    area: dict
    pattern: str
    altitude: int
    assigned_drone_id: int | None = None
    sensors: List[str] = []     
    status: str | None = None


class MissionRead(BaseModel):
    id: int
    name: str
    area: dict
    pattern: str
    altitude: int
    status: str
    sensors: List[str] = []
    assigned_drone_id: int | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

router = APIRouter(prefix="/missions", tags=["missions"])

@router.get("/summary")
def get_mission_summary(db: Session = Depends(get_db)):
    """Get mission count summary by status."""
    total = db.query(Mission).count()
    active = db.query(Mission).filter(Mission.status.in_(["in-progress", "paused"])).count()
    completed = db.query(Mission).filter(Mission.status == "completed").count()
    aborted = db.query(Mission).filter(Mission.status == "aborted").count()

    return {
        "total": total,
        "active": active,
        "completed": completed,
        "aborted": aborted,
    }


@router.get("/active")
def get_active_missions(db: Session = Depends(get_db)):
    """Get last 10 active missions."""
    missions = (
        db.query(Mission)
        .filter(Mission.status.in_(["in-progress", "paused"]))
        .order_by(Mission.updated_at.desc())
        .limit(10)
        .all()
    )

    return [
        {
            "id": m.id,
            "name": m.name,
            "status": m.status,
            "updated_at": m.updated_at.isoformat() if m.updated_at else None,
        }
        for m in missions
    ]

@router.post("/", response_model=MissionRead, status_code=status.HTTP_201_CREATED)
def create_mission(mission: MissionCreate, db: Session = Depends(get_db)):
    mission_data = mission.dict()

    mission_data["sensors"] = [
    s for s in mission_data.get("sensors", [])
    if s in ALLOWED_SENSORS]
    
    mission_data["status"] = mission_data.get("status") or "pending"

    # Assigned drone
    mission_data["assigned_drone_id"] = mission.assigned_drone_id

    # GeoJSON coords
    coords = mission.area["coordinates"][0]

    # Convert GeoJSON → (lat, lng)
    polygon_coords = [(c[1], c[0]) for c in coords]

    # Pattern logic
    pattern = mission.pattern.lower()
    if pattern == "crosshatch":
        path = generate_crosshatch_path(polygon_coords)
    elif pattern == "perimeter":
        path = generate_perimeter_path(polygon_coords)
    else:
        path = generate_grid_path(polygon_coords)

    # Required by SQLAlchemy model
    mission_data["path"] = path
    mission_data["current_index"] = 0


    db_mission = Mission(**mission_data)
    db.add(db_mission)
    db.commit()
    db.refresh(db_mission)

    return db_mission


@router.get("/", response_model=List[MissionRead])
def list_missions(status: str | None = None, db: Session = Depends(get_db)):
    """List missions, or list completed ones sorted by latest update."""
    query = db.query(Mission)
    if status:
        query = query.filter(Mission.status == status)
        if status == "completed":
            return query.order_by(Mission.updated_at.desc()).all()

    return query.order_by(Mission.id).all()

@router.get("/{mission_id}", response_model=MissionRead)
def get_mission(mission_id: int, db: Session = Depends(get_db)):
    mission = db.query(Mission).filter(Mission.id == mission_id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
    return mission
