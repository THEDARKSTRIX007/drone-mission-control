# Drone Survey Management System — Backend

This document provides a detailed, code-accurate overview of the backend service for the Drone Survey Management System. It reflects the exact architecture, file structure, models, routers, simulation engine, and WebSocket behavior implemented in the provided backend code.

The backend is built using FastAPI, SQLAlchemy 2.0, and PostgreSQL. It serves as the core mission engine that manages drone missions, flight paths, live telemetry, reports, and analytics.

---

## 1. Technologies Used

* **FastAPI** for API routing and WebSocket support
* **SQLAlchemy 2.0** ORM with Declarative Mapping
* **PostgreSQL** with JSONB and JSON fields
* **Uvicorn** ASGI server
* **geopy** for geodesic distance calculations in reports and simulation
* **shapely** for geometry operations used in simulation
* **WebSockets** for real-time mission telemetry

---

## 2. Core Features

### Mission Management

* Create missions with:

  * GeoJSON area definitions
  * Flight pattern (grid, crosshatch, perimeter)
  * Altitude
  * Assigned drone
  * Sensor list (validated)
* Automatic flight path generation based on the selected pattern
* Tracks mission lifecycle: pending → in-progress → paused → resumed → completed or aborted
* Stores full mission metadata including waypoints, start/end times, and progress

### Drone Fleet Management

* Drone inventory stored in the database
* Tracks drone battery, status, and last known location
* Assigns drones to missions
* Updates drone state throughout simulation

### Real-Time Simulation

* Smooth waypoint-to-waypoint interpolation (approx. 33 FPS)
* Battery drain model
* ETA calculation
* Location updates streamed to WebSocket clients
* Updates persisted to the database

### Reporting

* Mission summary and detailed reports
* Calculates:

  * total distance
  * duration
  * area coverage percentage
  * path length

### Analytics

* Computes organization-wide analytics for completed missions
* Returns:

  * total completed missions
  * estimated total distance
  * estimated total flight hours

### WebSocket Telemetry

* Single `/ws` endpoint for live mission updates
* Broadcasts mission progress to all subscribed clients

---

## 3. Directory Structure

```
backend/
└── app/
    ├── main.py                     # FastAPI application and WebSocket endpoint
    ├── database.py                 # SQLAlchemy engine/session/Base
    │
    ├── models/
    │   ├── mission.py              # Mission model (JSONB path, area, sensors)
    │   └── drone.py                # Drone model
    │
    ├── routers/
    │   ├── missions.py             # Mission CRUD + creation logic
    │   ├── drones.py               # Drone listing/filters
    │   ├── mission_control.py      # Mission start/pause/resume/abort/reset
    │   ├── reports.py              # Mission reporting APIs
    │   └── analytics.py            # Summary analytics APIs
    │
    ├── services/
    │   └── mission_simulator.py    # Real-time mission simulator
    │
    ├── mission_utils.py            # Path generation utilities
    ├── websocket_manager.py        # Broadcast manager for WebSockets
    └── ...
```

---

## 4. Database Schema

### Mission Model

Fields:

* `id`: integer primary key
* `name`: mission name
* `area`: GeoJSON polygon (JSONB)
* `pattern`: grid, crosshatch, perimeter
* `altitude`: mission altitude in meters
* `assigned_drone_id`: drone ID
* `status`: pending/in-progress/paused/completed/aborted
* `path`: list of waypoint dicts (JSONB)
* `current_index`: current waypoint index
* `created_at`, `updated_at`: timestamps
* `start_time`, `end_time`: mission lifecycle timestamps
* `sensors`: list of selected sensors stored as JSONB (MutableList)

### Drone Model

* `id`: integer primary key
* `name`: drone name
* `battery`: stored as an integer
* `status`: available / in-use / charging
* `location`: JSON storing lat/lng
* `current_mission_id`: nullable reference to mission

---

## 5. API Routers

### Mission Router (`/missions`)

* `POST /missions/` — Create a mission
* `GET /missions/` — List missions
* `GET /missions/{mission_id}` — Get mission details
* `GET /missions/summary` — Summary counts
* `GET /missions/active` — Lightweight active mission summary

Mission creation pipeline includes:

1. Sensor validation against allowed list
2. GeoJSON coordinate correction
3. Pattern-based path generation
4. Initial mission status and index setup

---

### Drone Router (`/drones`)

* `GET /drones/` — List all drones
* `GET /drones/active` — In-use drones
* `GET /drones/available` — Available drones

Adds synthetic `last_updated` timestamp per response.

---

### Mission Control Router (`/missions/{id}`)

Handles runtime mission operations:

* `POST /start`
* `POST /pause`
* `POST /resume`
* `POST /abort`
* `POST /reset`

Integrated directly with the mission simulator.

---

### Reports Router (`/reports`)

* `GET /reports/missions` — Summary for all missions
* `GET /reports/{id}` — Detailed mission-level report

Calculates:

* duration (start/end timestamps)
* distance (via geodesic)
* coverage percent
* path length

---

### Analytics Router (`/analytics`)

* `GET /analytics/overview`

Returns:

* total completed missions
* estimated total flight distance
* total flight hours

---

## 6. Mission Simulation Engine

Located in `services/mission_simulator.py`.

### Responsibilities

* Smooth interpolation between waypoints
* Battery drain calculation
* Progress updates
* ETA estimation
* Writes live drone position to database
* Writes mission state updates to database
* Sends WebSocket messages using the broadcast manager

### Execution Model

* Simulator runs as an asyncio task
* Per-frame updates every 0.05 seconds
* Interpolates between waypoints using linear interpolation
* Uses geodesic distances for realism

### Completion and Abort Logic

On completion:

* Drone is marked available
* Mission status is set to completed
* Progress broadcast is sent

On abort:

* Task is cancelled safely
* Mission marked aborted
* Final broadcast sent

---

## 7. WebSocket Behavior

The backend defines a single endpoint:

```
/ws
```

### Connection Handling

* All connections are accepted and stored in an in-memory list
* Broadcasts go to all connected clients
* Dead connections are removed automatically

### Message Format

Simulation broadcasts messages like:

```
{
  "type": "mission_update",
  "missionId": 42,
  "droneId": 5,
  "location": {"lat": 37.78, "lng": -122.45},
  "progress": 37,
  "battery": 92,
  "eta": 12.5,
  "status": "in-progress"
}
```

---

## 8. Environment Variables

Loaded via `dotenv`:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mission_control
```

Fallback is the above value if env variable is missing.

---

## 9. Running the Backend

1. Install dependencies

```
pip install -r requirements.txt
```

2. Ensure PostgreSQL is running and database exists
3. Start FastAPI server

```
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

4. Visit documentation at:

```
http://localhost:8000/docs
```

---

## 10. Additional Notes

* Alembic folder exists but automatic table creation is done using SQLAlchemy `create_all`.
* Sensors field uses JSONB MutableList allowing SQLAlchemy to detect mutations.
* Mission paths are always stored in lat/lng structured dictionaries.
* WebSocket endpoint currently broadcasts all messages to all clients.
* Mission simulator state is stored globally per mission ID.

This README reflects the exact backend implementation you provided.
