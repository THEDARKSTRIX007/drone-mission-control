from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models.drone import Drone


class DroneRead(BaseModel):
    id: int
    name: str
    battery: int
    status: str
    location: dict
    last_updated: Optional[datetime] = None

    class Config:
        orm_mode = True
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }


router = APIRouter(prefix="/drones", tags=["drones"])


@router.get("/", response_model=List[DroneRead])
def list_drones(db: Session = Depends(get_db)):
    """Get all drones with their current status and location."""
    drones = db.query(Drone).order_by(Drone.id).all()
    result = []
    for drone in drones:
        drone_dict = {
            "id": drone.id,
            "name": drone.name,
            "battery": drone.battery,
            "status": drone.status,
            "location": drone.location,
            "last_updated": datetime.utcnow()
        }
        result.append(DroneRead(**drone_dict))
    return result


@router.get("/active", response_model=List[DroneRead])
def list_active_drones(db: Session = Depends(get_db)):
    """Get only drones with status == 'in-use'."""
    drones = db.query(Drone).filter(Drone.status == "in-use").order_by(Drone.id).all()
    result = []
    for drone in drones:
        drone_dict = {
            "id": drone.id,
            "name": drone.name,
            "battery": drone.battery,
            "status": drone.status,
            "location": drone.location,
            "last_updated": datetime.utcnow()
        }
        result.append(DroneRead(**drone_dict))
    return result


@router.get("/available", response_model=List[DroneRead])
def list_available_drones(db: Session = Depends(get_db)):
    """Get only drones with status == 'available'."""
    drones = db.query(Drone).filter(Drone.status == "available").order_by(Drone.id).all()
    result = []
    for drone in drones:
        drone_dict = {
            "id": drone.id,
            "name": drone.name,
            "battery": drone.battery,
            "status": drone.status,
            "location": drone.location,
            "last_updated": datetime.utcnow()
        }
        result.append(DroneRead(**drone_dict))
    return result
