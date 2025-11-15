# Drone Mission Control 

A complete backend system for drone mission planning, real-time simulation, drone tracking, analytics, fleet management, and reporting.  
Built using **FastAPI**, **SQLAlchemy**, **PostgreSQL**, **WebSockets**, and a custom mission simulator.

---

## Features

### Mission Management
- Mission creation with:
  - GeoJSON polygon area
  - Grid, crosshatch, perimeter patterns
  - Altitude configuration
  - Drone assignment
  - Sensor selection (optical, thermal, LiDAR, multispectral, RTK GPS, gas)
- Automatic path generation using custom algorithms
- Mission state transitions:
  - Pending → In-Progress → Completed
  - Pause, Resume, Abort
  - Reset mission to restart simulation
- Persistent progress tracking (`current_index`, timestamps)

### Drone Management
- Drone registry with:
  - Name
  - Battery percentage
  - Status (available, in-use, etc.)
  - Live location (lat/lng)
- Auto-update drone battery + location during missions
- Automatic release of drone on mission completion

### Real-Time Simulation
- Smooth real-time drone movement using:
  - Interpolated waypoint traversal  
  - 20 FPS flight updates (`FRAME_INTERVAL = 0.05`)
  - Geodesic distance calculations
- Automatic ETA calculation
- Automatic mission finalization
- Flight trail updates via WebSocket

### WebSocket System
- Broadcasts mission updates to all connected clients:
  - Location
  - Progress
  - Battery
  - ETA
  - Mission status
- Auto-cleanup of dead WebSocket connections

### Reports & Analytics
- Mission reports:
  - Duration
  - Distance traveled
  - Area coverage estimate
  - Path length & progress
- Organization-level analytics:
  - Total surveys
  - Estimated total distance flown
  - Estimated total flight hours

---

## Project Structure

backend/
├── app/
│ ├── main.py # FastAPI entrypoint
│ ├── database.py # Database session + engine
│ ├── websocket_manager.py # WebSocket client manager
│ ├── mission_utils.py # Path-generation algorithms
│ ├── services/
│ │ └── mission_simulator.py # Real-time simulator
│ ├── models/
│ │ ├── mission.py
│ │ └── drone.py
│ └── routers/
│ ├── missions.py
│ ├── mission_control.py
│ ├── drones.py
│ ├── reports.py
│ └── analytics.py
├── alembic/ # Future DB migrations
├── requirements.txt
└── setup.sh

yaml
Copy code

---

## API Endpoints Overview

### Mission Endpoints
POST /missions/ # Create mission
GET /missions/ # List missions
GET /missions/{id} # Get mission details
GET /missions/summary # Mission counts
GET /missions/active # Last 10 active missions

shell
Copy code

### Mission Control
POST /missions/{id}/start
POST /missions/{id}/pause
POST /missions/{id}/resume
POST /missions/{id}/abort
POST /missions/{id}/reset

shell
Copy code

### Drones
GET /drones/
GET /drones/active
GET /drones/available

shell
Copy code

### Reports
GET /reports/missions
GET /reports/{mission_id}

shell
Copy code

### Analytics
GET /analytics/overview

shell
Copy code

### WebSocket
ws://127.0.0.1:8000/ws

yaml
Copy code

---

## Mission Creation Schema

### Request Body
{
  "name": "Mission A",
  "pattern": "grid",
  "altitude": 50,
  "assigned_drone_id": 3,
  "sensors": ["lidar", "rtk_gps"],
  "area": {
    "type": "Polygon",
    "coordinates": [[[lng, lat], ...]]
  }
}
Mission Simulator Workflow
Mission start creates a new simulator instance.

Loads waypoints from database.

Interpolates between points at 20 FPS.

Updates:

Drone location

Battery drain

Waypoint progress

Broadcasts updates over WebSocket.

On last waypoint:

Marks mission completed

Releases drone (status → available)

Saves end time

Models
Mission
id

name

area (JSONB)

pattern

altitude

assigned_drone_id

sensors (JSONB list)

status

path (JSONB list of waypoints)

current_index

timestamps

start_time / end_time

Drone
id

name

battery

status

location (JSON)

current_mission_id

Requirements
php
Copy code
fastapi
uvicorn
SQLAlchemy
psycopg2-binary
geopy
shapely
python-dotenv
websockets
websocket-client
Install:

bash
Copy code
pip install -r requirements.txt
Running the Backend
1. Configure database
Set environment variable:

bash
Copy code
DATABASE_URL=postgresql://postgres:password@localhost:5432/mission_control
2. Start the server
bash
Copy code
uvicorn app.main:app --reload
Backend will be available at:

API → http://127.0.0.1:8000

Docs → http://127.0.0.1:8000/docs

Additional Notes
Codec-safe WebSocket broadcasting included.

All path-generation and simulation logic is kept modular.

Designed to plug directly into the Next.js dashboard.

Sensor selection fully supported end-to-end (frontend → API → DB).

Zero external map APIs required.
