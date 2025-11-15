# Drone Mission Control Dashboard

A full-featured frontend for real-time drone mission creation, monitoring, fleet management, and analytics. Built using Next.js 15, TypeScript, TailwindCSS, Leaflet, Zustand, and ShadCN UI.

## Features

### Mission Creation

* Polygon drawing using Leaflet-Draw
* Mission pattern selection (grid, crosshatch, perimeter, lawnmower, spiral, zigzag)
* Altitude configuration
* Drone assignment with availability filtering
* **Sensor selection via checkboxes** (optical camera, thermal camera, LiDAR, multispectral, RTK GPS, gas sensor)
* Automatic area-to-GeoJSON conversion

### Real-Time Dashboard

* Live drone telemetry streamed via WebSocket
* Smooth map updates + fly-to animation
* Drone trail tracking
* Mission path visualization
* Progress, ETA, battery simulation
* Mission controls (Start, Pause, Resume, Abort)

### Fleet Monitoring

* View all drones
* Battery, status, and live locations
* Auto-update via WebSocket

### Analytics

* Mission summary cards
* Total surveys, distance, flight hours
* Active missions feed with timestamps

### UI Enhancements

* Dark mode optimized
* ShadCN components
* Error fallbacks and loading states
* SSR-safe Leaflet rendering

---

## Tech Stack

* Next.js 15 (App Router)
* TypeScript
* TailwindCSS
* ShadCN UI
* Zustand
* Leaflet + React-Leaflet
* Leaflet-Draw
* WebSocket

---

## Prerequisites

* Node.js 18+
* Backend API at `http://127.0.0.1:8000`
* WebSocket at `ws://127.0.0.1:8000/ws`

---

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Add Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
NEXT_PUBLIC_WS_URL=ws://127.0.0.1:8000/ws
```

### 3. Start Dev Server

```bash
npm run dev
```

### 4. Open App

```
http://localhost:3000
```

---

## Project Structure

```
frontend/
├── app/
│   ├── dashboard/page.tsx           # Main mission dashboard
│   ├── missions/new/page.tsx        # Mission creation
│   ├── layout.tsx                   # Global layout
│   ├── page.tsx                     # Landing dashboard
│   └── globals.css                  # Base styles
├── components/
│   ├── MapClient.tsx                # Real-time drone map
│   ├── PolygonDrawer.tsx            # Client-only polygon tool
│   ├── MissionControls.tsx          # Mission start/pause/resume/abort
│   ├── DroneStats.tsx               # Drone telemetry
│   ├── ActiveDrones.tsx             # Fleet panel
│   └── ui/                          # ShadCN UI components
├── lib/
│   ├── api.ts                       # REST client
│   ├── ws.ts                        # WebSocket client
│   ├── store.ts                     # Zustand state store
│   ├── sensors.ts                   # Sensor definitions
│   └── utils.ts                     # Helpers
└── package.json
```

---

## API Endpoints Used

* `POST /missions` – Create mission
* `GET /missions/{id}` – Fetch mission
* `POST /missions/{id}/start` – Start
* `POST /missions/{id}/pause`
* `POST /missions/{id}/resume`
* `POST /missions/{id}/abort`
* `GET /drones` – Drone list
* `GET /reports/missions` – Summary reports
* `GET /analytics/overview` – Analytics

---

## WebSocket Message Format

```json
{
  "type": "mission_update",
  "missionId": 12,
  "droneId": 5,
  "location": { "lat": 37.78, "lng": -122.41 },
  "progress": 42,
  "battery": 87,
  "eta": 120,
  "status": "in-progress"
}
```

---

## Usage Guide

### Creating a Mission

1. Go to `/missions/new`
2. Draw polygon
3. Choose pattern + altitude
4. Select drone
5. Tick sensors
6. Submit mission

### Live Dashboard

* Navigate to `/dashboard?missionId={id}`
* View real-time drone motion, telemetry, battery, path
* Control mission lifecycle

---

## Development Commands

```bash
npm run dev          # start frontend
npm run build        # build app
npm start            # run production
npm run lint         # lint code
```

---

## Notes

* Leaflet uses OSM tiles, no API keys needed
* WebSocket auto-reconnect
* Polygon persists during navigation
* Fully responsive and dark-mode
