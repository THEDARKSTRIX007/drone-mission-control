from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models.mission import Mission


class MissionSummary(BaseModel):
    mission_id: int
    name: str
    duration_seconds: Optional[int] = None
    total_distance: Optional[float] = None
    battery_used: Optional[int] = None
    status: str
    ended_at: Optional[datetime] = None

    class Config:
        orm_mode = True
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }


class MissionDetailedReport(BaseModel):
    mission_id: int
    name: str
    status: str
    pattern: str
    altitude: int
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    total_distance: Optional[float] = None
    area_covered_percent: Optional[float] = None
    path_length: Optional[int] = None
    current_index: int
    battery_used: Optional[int] = None

    class Config:
        orm_mode = True
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }


router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/missions", response_model=List[MissionSummary])
def get_missions_report(db: Session = Depends(get_db)):
    """Get summary report for all missions."""
    missions = db.query(Mission).all()
    summaries = []
    
    for mission in missions:
        # Calculate duration
        duration_seconds = None
        if mission.start_time and mission.end_time:
            duration_seconds = int((mission.end_time - mission.start_time).total_seconds())
        
        # Calculate battery used (assuming started at 100)
        # This is a synthetic calculation since we don't store initial battery in mission
        battery_used = None
        
        # Calculate distance if path exists
        total_distance = None
        if mission.path and len(mission.path) > 1:
            try:
                from geopy.distance import geodesic
                distance = 0.0
                for i in range(len(mission.path) - 1):
                    a = (mission.path[i]["lat"], mission.path[i]["lng"])
                    b = (mission.path[i+1]["lat"], mission.path[i+1]["lng"])
                    distance += geodesic(a, b).meters
                total_distance = round(distance, 2)
            except Exception:
                pass
        
        summary = MissionSummary(
            mission_id=mission.id,
            name=mission.name,
            duration_seconds=duration_seconds,
            total_distance=total_distance,
            battery_used=battery_used,
            status=mission.status,
            ended_at=mission.end_time
        )
        summaries.append(summary)
    
    return summaries


@router.get("/{mission_id}", response_model=MissionDetailedReport)
def get_mission_report(mission_id: int, db: Session = Depends(get_db)):
    """Get detailed report for a single mission."""
    mission = db.query(Mission).filter(Mission.id == mission_id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
    
    # Calculate duration
    duration_seconds = None
    if mission.start_time and mission.end_time:
        duration_seconds = int((mission.end_time - mission.start_time).total_seconds())
    elif mission.start_time:
        # Still running - calculate from start to now
        duration_seconds = int((datetime.utcnow() - mission.start_time).total_seconds())
    
    # Calculate total distance
    total_distance = None
    if mission.path and len(mission.path) > 1:
        try:
            from geopy.distance import geodesic
            distance = 0.0
            for i in range(len(mission.path) - 1):
                a = (mission.path[i]["lat"], mission.path[i]["lng"])
                b = (mission.path[i+1]["lat"], mission.path[i+1]["lng"])
                distance += geodesic(a, b).meters
            total_distance = round(distance, 2)
        except Exception:
            pass
    
    # Calculate area covered percentage (current_index / total path length)
    area_covered_percent = None
    path_length = None
    if mission.path:
        path_length = len(mission.path)
        if path_length > 0:
            area_covered_percent = round((mission.current_index / path_length) * 100, 2)
    
    # Battery used (synthetic: assume 100% at start)
    battery_used = None
    
    report = MissionDetailedReport(
        mission_id=mission.id,
        name=mission.name,
        status=mission.status,
        pattern=mission.pattern,
        altitude=mission.altitude,
        start_time=mission.start_time,
        end_time=mission.end_time,
        duration_seconds=duration_seconds,
        total_distance=total_distance,
        area_covered_percent=area_covered_percent,
        path_length=path_length,
        current_index=mission.current_index,
        battery_used=battery_used
    )
    
    return report
