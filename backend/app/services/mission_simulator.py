import asyncio
import logging
from datetime import datetime
from geopy.distance import geodesic
from typing import Optional
from sqlalchemy.orm import Session

from app.models.mission import Mission
from app.models.drone import Drone
from app.database import SessionLocal
from app.websocket_manager import ConnectionManager
from shapely.geometry import Point, Polygon as ShapelyPolygon

logger = logging.getLogger(__name__)

simulators: dict[int, "MissionSimulator"] = {}

def clamp_point_inside_polygon(lat, lng, polygon: ShapelyPolygon):
    """If point lies outside polygon, snap it to nearest point on boundary."""
    p = Point(lng, lat)

    if polygon.contains(p):
        return lat, lng

    # Snap to nearest boundary point
    nearest = polygon.exterior.interpolate(
        polygon.exterior.project(p)
    )
    return nearest.y, nearest.x


class MissionSimulator:
    def __init__(self, mission_id: int, drone_id: int, waypoints: list[dict], manager: ConnectionManager):
        self.mission_id = mission_id
        self.drone_id = drone_id
        self.waypoints = waypoints
        self.manager = manager
        self.current_waypoint_index = 0
        self.is_running = False
        self.is_paused = False
        self.task: Optional[asyncio.Task] = None

        self.total_distance = 0.0
        self.distance_travelled = 0.0
        self.battery = 100

        try:
            if self.waypoints and len(self.waypoints) > 1:
                for i in range(len(self.waypoints) - 1):
                    a = (self.waypoints[i]["lat"], self.waypoints[i]["lng"])
                    b = (self.waypoints[i + 1]["lat"], self.waypoints[i + 1]["lng"])
                    self.total_distance += geodesic(a, b).meters
        except Exception:
            logger.exception("Failed to compute waypoint distances")

        if self.waypoints:
            self.current_lat = float(self.waypoints[0]["lat"])
            self.current_lng = float(self.waypoints[0]["lng"])
        else:
            self.current_lat = 0.0
            self.current_lng = 0.0

    async def start(self):
        if self.is_running:
            return

        simulators[self.mission_id] = self
        self.is_running = True
        self.is_paused = False

        db = SessionLocal()
        try:
            mission = db.query(Mission).filter(Mission.id == self.mission_id).first()
            if mission:
                self.current_waypoint_index = int(mission.current_index or 0)
                mission.status = "in-progress"
                if not mission.start_time:
                    mission.start_time = datetime.utcnow()
                db.commit()
        finally:
            db.close()

        db = SessionLocal()
        try:
            mission = db.query(Mission).filter(Mission.id == self.mission_id).first()
            if mission and mission.path:
                idx = int(mission.current_index or 0)
                if 0 <= idx < len(mission.path):
                    self.current_lat = mission.path[idx]["lat"]
                    self.current_lng = mission.path[idx]["lng"]
        finally:
            db.close()

        self.task = asyncio.create_task(self._simulation_loop())

    async def pause(self):
        if not self.is_running:
            return
        self.is_paused = True

        db = SessionLocal()
        try:
            mission = db.query(Mission).filter(Mission.id == self.mission_id).first()
            if mission:
                mission.current_index = int(self.current_waypoint_index)
                mission.status = "paused"
                db.commit()
        finally:
            db.close()

    async def resume(self):
        if not self.is_running or not self.is_paused:
            return
        self.is_paused = False

        db = SessionLocal()
        try:
            mission = db.query(Mission).filter(Mission.id == self.mission_id).first()
            if mission:
                self.current_waypoint_index = int(mission.current_index or self.current_waypoint_index)
                mission.status = "in-progress"
                db.commit()
        finally:
            db.close()

    async def abort(self):
        self.is_running = False
        self.is_paused = False

        db = SessionLocal()
        try:
            mission = db.query(Mission).filter(Mission.id == self.mission_id).first()
            if mission:
                mission.status = "aborted"
                mission.current_index = int(self.current_waypoint_index)
                mission.end_time = datetime.utcnow()
                db.commit()
        finally:
            db.close()

        if self.task and not self.task.done():
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                pass

        await self.manager.broadcast_json({
            "type": "mission_update",
            "missionId": self.mission_id,
            "droneId": self.drone_id,
            "status": "aborted",
        })

        simulators.pop(self.mission_id, None)

    async def _simulation_loop(self):
        try:
            db = SessionLocal()
            try:
                mission = db.query(Mission).filter(Mission.id == self.mission_id).first()
                path = mission.path if mission and mission.path else self.waypoints
            finally:
                db.close()

            if not path or len(path) < 2:
                return

            TOTAL_WP = len(path)

            INTERPOLATION_DURATION = 0.7   # seconds per segment
            FRAME_INTERVAL = 0.05          # smooth 33 FPS
            FRAMES = int(INTERPOLATION_DURATION / FRAME_INTERVAL)

            while self.current_waypoint_index < TOTAL_WP - 1 and self.is_running:

                while self.is_paused and self.is_running:
                    await asyncio.sleep(0.2)

                if not self.is_running:
                    break

                A = path[self.current_waypoint_index]
                B = path[self.current_waypoint_index + 1]

                Ax, Ay = A["lat"], A["lng"]
                Bx, By = B["lat"], B["lng"]

                segment_distance = geodesic((Ax, Ay), (Bx, By)).meters
                self.distance_travelled += segment_distance
                self.battery = max(0, self.battery - segment_distance * 0.0005)

                progress = int(((self.current_waypoint_index) / (TOTAL_WP - 1)) * 100)

                for f in range(FRAMES):
                    t = (f + 1) / FRAMES
                    lat = Ax + (Bx - Ax) * t
                    lng = Ay + (By - Ay) * t

                    self.current_lat = lat
                    self.current_lng = lng

                    remaining_segments = TOTAL_WP - self.current_waypoint_index - 1
                    eta_seconds = remaining_segments * INTERPOLATION_DURATION if remaining_segments > 0 else 0

                    db = SessionLocal()
                    try:
                        drone = db.query(Drone).filter(Drone.id == self.drone_id).first()
                        if drone:
                            drone.battery = int(self.battery)
                            drone.location = {"lat": lat, "lng": lng}
                            db.commit()
                    finally:
                        db.close()

                    await self.manager.broadcast_json({
                        "type": "mission_update",
                        "missionId": self.mission_id,
                        "droneId": self.drone_id,
                        "location": {"lat": lat, "lng": lng},
                        "progress": progress,
                        "battery": int(self.battery),
                        "eta": eta_seconds,
                        "status": "in-progress",
                    })

                    await asyncio.sleep(FRAME_INTERVAL)

                self.current_waypoint_index += 1

            if self.is_running:
                await self.manager.broadcast_json({
                    "type": "mission_update",
                    "missionId": self.mission_id,
                    "droneId": self.drone_id,
                    "status": "completed",
                    "progress": 100,
                    "battery": int(self.battery),
                    "eta": 0,
                })

                db = SessionLocal()
                try:
                    mission = db.query(Mission).filter(Mission.id == self.mission_id).first()
                    drone = db.query(Drone).filter(Drone.id == self.drone_id).first()
                    if mission:
                        mission.status = "completed"
                        mission.current_index = len(path)
                        mission.end_time = datetime.utcnow()
                    if drone:
                        drone.status = "available"
                    db.commit()
                finally:
                    db.close()

                simulators.pop(self.mission_id, None)

        except Exception:
            logger.exception("Error in simulation loop")
        finally:
            self.is_running = False


def generate_waypoints_from_polygon(area: dict) -> list[dict]:
    """Generate waypoints inside polygon. Pattern logic untouched."""

    coordinates = []
    if isinstance(area, dict) and "coordinates" in area:
        if isinstance(area["coordinates"], list) and len(area["coordinates"]) > 0:
            coordinates = area["coordinates"][0]

    if not coordinates:
        coordinates = [
            [-122.4294, 37.7649],
            [-122.4094, 37.7649],
            [-122.4094, 37.7849],
            [-122.4294, 37.7849],
            [-122.4294, 37.7649],
        ]

    polygon = ShapelyPolygon([(c[0], c[1]) for c in coordinates])

    lngs = [c[0] for c in coordinates]
    lats = [c[1] for c in coordinates]
    centroid_lng = sum(lngs) / len(lngs)
    centroid_lat = sum(lats) / len(lats)

    waypoints = []

    for i in range(10):
        t = i / 9
        edge = coordinates[i % len(coordinates)]
        lat = centroid_lat + (edge[1] - centroid_lat) * t
        lng = centroid_lng + (edge[0] - centroid_lng) * t

        lat, lng = clamp_point_inside_polygon(lat, lng, polygon)

        waypoints.append({"lat": lat, "lng": lng})

    return waypoints
