# pyright: reportAttributeAccessIssue=false, reportGeneralTypeIssues=false
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import cast

from app.database import get_db
from app.models.mission import Mission
from app.models.drone import Drone
from app.services.mission_simulator import (
    MissionSimulator,
    simulators,
)
from app.mission_utils import generate_grid_path
from app.websocket_manager import manager


router = APIRouter(prefix="/missions", tags=["mission_control"])


class ControlResponse(BaseModel):
    status: str
    path: list[dict] | None = None


@router.post("/{mission_id}/start", response_model=ControlResponse)
async def start_mission(mission_id: int, db: Session = Depends(get_db)):
    mission = db.query(Mission).filter(Mission.id == mission_id).first()
    if not mission:
        raise HTTPException(404, f"Mission {mission_id} not found")

    if mission.status == "aborted":
        raise HTTPException(400, f"Mission {mission_id} is aborted and must be reset")

    if mission_id in simulators:
        raise HTTPException(400, f"Mission {mission_id} is already running")

    assigned_id = mission.assigned_drone_id

    # Always use assigned drone first
    if assigned_id is not None:
        drone = db.query(Drone).filter(Drone.id == assigned_id).first()
        if not drone:
            raise HTTPException(400, f"Assigned drone {assigned_id} not found")

        if drone.status != "available":
            # force override
            drone.status = "available"
    else:
        # fallback only if no drone assigned
        drone = db.query(Drone).filter(Drone.status == "available").first()
        if not drone:
            raise HTTPException(404, "No drones available")

    # Mark drone as busy and attach mission
    drone.status = "in-use"
    drone.current_mission_id = mission_id
    db.commit()

    # Generate mission path
    coords = mission.area["coordinates"][0]
    path = generate_grid_path(coords, spacing=60)

    mission.path = path
    mission.current_index = 0
    mission.status = "in-progress"
    db.commit()

    simulator = MissionSimulator(
        mission_id=mission_id,
        drone_id=drone.id,
        waypoints=path,
        manager=manager,
    )

    simulators[mission_id] = simulator
    await simulator.start()

    try:
        await manager.broadcast_json({
            "type": "mission_started",
            "missionId": mission_id,
            "droneId": drone.id,
            "status": "in-progress",
        })
    except Exception:
        pass

    return ControlResponse(status="ok", path=path)


@router.post("/{mission_id}/pause", response_model=ControlResponse)
async def pause_mission(mission_id: int, db: Session = Depends(get_db)):
    """Pause a mission simulation."""
    # Check if mission exists
    mission = db.query(Mission).filter(Mission.id == mission_id).first()
    if not mission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Mission {mission_id} not found",
        )

    # Check if simulator exists
    if mission_id not in simulators:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Mission {mission_id} is not running",
        )

    simulator = simulators[mission_id]
    await simulator.pause()

    # Broadcast mission paused event
    try:
        await manager.broadcast_json({
            "type": "mission_paused",
            "missionId": mission_id,
            "status": "paused",
        })
    except Exception:
        pass

    return ControlResponse(status="ok")


@router.post("/{mission_id}/resume", response_model=ControlResponse)
async def resume_mission(mission_id: int, db: Session = Depends(get_db)):
    """Resume a paused mission simulation."""
    # Check if mission exists
    mission = db.query(Mission).filter(Mission.id == mission_id).first()
    if not mission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Mission {mission_id} not found",
        )

    # Check if simulator exists
    if mission_id not in simulators:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Mission {mission_id} is not running",
        )

    simulator = simulators[mission_id]
    await simulator.resume()

    # Broadcast mission resumed event
    try:
        await manager.broadcast_json({
            "type": "mission_resumed",
            "missionId": mission_id,
            "status": "in-progress",
        })
    except Exception:
        pass

    return ControlResponse(status="ok")


@router.post("/{mission_id}/abort", response_model=ControlResponse)
async def abort_mission(mission_id: int, db: Session = Depends(get_db)):
    """Abort a mission simulation."""
    # Check if mission exists
    mission = db.query(Mission).filter(Mission.id == mission_id).first()
    if not mission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Mission {mission_id} not found",
        )

    # Check if simulator exists
    if mission_id not in simulators:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Mission {mission_id} is not running",
        )

    simulator = simulators[mission_id]
    await simulator.abort()

    # Release drone
    drone = db.query(Drone).filter(Drone.id == simulator.drone_id).first()
    if drone:
        drone.status = "available"
        db.commit()

    # Broadcast mission aborted event
    try:
        await manager.broadcast_json({
            "type": "mission_aborted",
            "missionId": mission_id,
            "status": "aborted",
        })
    except Exception:
        pass

    return ControlResponse(status="ok")

@router.post("/{mission_id}/reset", response_model=ControlResponse)
async def reset_mission(mission_id: int, db: Session = Depends(get_db)):
    mission = db.query(Mission).filter(Mission.id == mission_id).first()
    if not mission:
        raise HTTPException(404, f"Mission {mission_id} not found")

    # Stop and remove any running simulator
    if mission_id in simulators:
        simulator = simulators[mission_id]
        await simulator.abort()  # safely stop if running
        del simulators[mission_id]

    # Reset mission fields
    mission.status = "pending"
    mission.current_index = 0
    mission.path = None
    mission.start_time = None
    mission.end_time = None
    db.commit()

    # Release drone if attached
    if mission.assigned_drone_id:
        drone = db.query(Drone).filter(Drone.id == mission.assigned_drone_id).first()
        if drone:
            drone.status = "available"
            drone.current_mission_id = None
            db.commit()

    # Notify frontend
    try:
        await manager.broadcast_json({
            "type": "mission_reset",
            "missionId": mission_id,
            "status": "pending",
        })
    except Exception:
        pass

    return ControlResponse(status="ok")


