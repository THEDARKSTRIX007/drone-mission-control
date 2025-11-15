# Drone Mission Control

A complete backend system for drone mission planning, real time simulation, drone tracking, analytics, fleet management, and reporting.
Built using **FastAPI**, **SQLAlchemy**, **PostgreSQL**, **WebSockets**, and a custom mission simulator.

**Live Deployment:**
(https://drone-mission-control-syoj.vercel.app/)

---

## Features

### Mission Management

* Mission creation with:

  * GeoJSON polygon area
  * Grid, crosshatch, perimeter patterns
  * Altitude configuration
  * Drone assignment
  * Sensor selection (optical, thermal, LiDAR, multispectral, RTK GPS, gas)
* Automatic path generation using custom algorithms
* Mission state transitions:

  * Pending. In Progress. Completed
  * Pause. Resume. Abort
  * Reset mission to restart simulation
* Persistent progress tracking (`current_index`, timestamps)

### Drone Management

* Drone registry with:

  * Name
  * Battery percentage
  * Status (available, in use, etc.)
  * Live location (lat and lng)
* Auto update of drone battery and location during missions
* Automatic release of drone when mission completes

### Real Time Simulation

* Smooth real time drone movement with:

  * Interpolated waypoint traversal
  * 20 FPS updates using `FRAME_INTERVAL = 0.05`
  * Geodesic distance based movement
* Automatic ETA calculation
* Automatic mission finalization upon completion
* Flight trail updates broadcast over WebSocket

### WebSocket System

* Broadcasts mission updates to all connected clients:

  * Live drone location
  * Progress
  * Battery
  * ETA
  * Mission status
* Automatic cleanup of dead WebSocket connections

### Reports and Analytics

* Mission reports include:

  * Duration
  * Distance traveled
  * Area coverage estimate
  * Path length and progress
* Organization analytics include:

  * Total surveys
  * Estimated total distance flown
  * Estimated flight hours

---

## Project Structure

```text
backend/
├── app/
│   ├── main.py                 # FastAPI entrypoint
│   ├── database.py             # Database session and engine
│   ├── websocket_manager.py    # WebSocket client manager
│   ├── mission_utils.py        # Path generation algorithms
│   ├── services/
│   │   └── mission_simulator.py   # Real time simulator
│   ├── models/
│   │   ├── mission.py
│   │   └── drone.py
│   └── routers/
│       ├── missions.py
│       ├── mission_control.py
│       ├── drones.py
│       ├── reports.py
│       └── analytics.py
├── alembic/                    # Database migrations
├── requirements.txt
└── setup.sh
```

---

## API Endpoints Overview

### Mission Endpoints

```http
POST /missions/
GET  /missions/
GET  /missions/{id}
GET  /missions/summary
GET  /missions/active
```

### Mission Control

```http
POST /missions/{id}/start
POST /missions/{id}/pause
POST /missions/{id}/resume
POST /missions/{id}/abort
POST /missions/{id}/reset
```

### Drones

```http
GET /drones/
GET /drones/active
GET /drones/available
```

### Reports

```http
GET /reports/missions
GET /reports/{mission_id}
```

### Analytics

```http
GET /analytics/overview
```

### WebSocket

```
ws://127.0.0.1:8000/ws
```

---

## Mission Creation Schema

### Request Body Example

```json
{
  "name": "Mission A",
  "pattern": "grid",
  "altitude": 50,
  "assigned_drone_id": 3,
  "sensors": ["lidar", "rtk_gps"],
  "area": {
    "type": "Polygon",
    "coordinates": [[[77.5946, 12.9716], [77.5950, 12.9718], [77.5948, 12.9710]]]
  }
}
```

---

## Mission Simulator Workflow

1. Mission start creates a new simulator instance.
2. Loads waypoints from the database.
3. Interpolates movement between points at 20 FPS.
4. Updates each frame:

   * Drone coordinates
   * Battery drain
   * Waypoint progress
   * ETA
5. Broadcasts telemetry to WebSocket clients.
6. On the final waypoint:

   * Mission is marked completed
   * Drone is released and set to available
   * End time is saved

---

## Data Models

### Mission

* id
* name
* area (JSONB)
* pattern
* altitude
* assigned_drone_id
* sensors (JSONB list)
* status
* path (JSONB list of waypoints)
* current_index
* created_at
* updated_at
* start_time
* end_time

### Drone

* id
* name
* battery
* status
* location (JSON with lat and lng)
* current_mission_id

---

## Requirements

```
fastapi
uvicorn
SQLAlchemy
psycopg2-binary
geopy
shapely
python-dotenv
websockets
websocket-client
```

Install dependencies:

```bash
pip install -r requirements.txt
```

---

## Running the Backend

### Configure the Database

```bash
export DATABASE_URL=postgresql://postgres:password@localhost:5432/mission_control
```

### Start the Server

```bash
uvicorn app.main:app --reload
```

Backend available at:

* API: [http://127.0.0.1:8000](http://127.0.0.1:8000)
* Docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

## Additional Notes

* WebSocket broadcasting is stable and codec safe.
* All path generation and simulation logic is modular and separable.
* Designed to integrate directly with a Next.js dashboard.
* Sensor selection supported end to end from frontend to API to DB.
* No external map API dependencies.
