# Quick Start Guide

## 1. Install Dependencies

```bash
npm install
```

## 2. Set Up Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
NEXT_PUBLIC_WS_URL=ws://127.0.0.1:8000/ws
```

**Note:** No map API token required - Leaflet uses OpenStreetMap tiles.

## 3. Start Development Server

```bash
npm run dev
```

## 4. Access the Application

Open your browser and navigate to:
- **Dashboard:** http://localhost:3000/dashboard
- **Create Mission:** http://localhost:3000/missions/new

## Backend Requirements

Make sure your backend is running and accessible at:
- **REST API:** http://127.0.0.1:8000
- **WebSocket:** ws://127.0.0.1:8000/ws

## Testing the Application

1. **Create a Mission:**
   - Go to `/missions/new`
   - Fill in mission details
   - Use the polygon drawing tool on the map to draw the mission area
   - Click "Create Mission"

2. **View Dashboard:**
   - After creating a mission, you'll be redirected to the dashboard
   - The map will show the mission polygon
   - Real-time updates will appear via WebSocket

3. **Control Mission:**
   - Use the control buttons (Start, Pause, Resume, Abort)
   - Monitor progress, battery, and ETA in the side panel

## Troubleshooting

- **Map not loading:** Ensure Leaflet CSS is properly imported (check `app/globals.css`)
- **WebSocket connection issues:** Ensure the backend WebSocket server is running
- **API errors:** Verify the backend API is accessible at the configured URL
- **Polygon drawing not working:** Make sure `leaflet-draw` is installed and CSS is imported

