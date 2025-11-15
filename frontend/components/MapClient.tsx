"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Polygon, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { useMissionStore } from "@/lib/store";

// Fix default Leaflet icons
if (typeof window !== "undefined") {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  });
}

// Drone icon
const droneIcon = new L.Icon({
  iconUrl:
    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTQiIGZpbGw9IiNlZjQ0NDQiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMiIvPgo8Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSI2IiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

function FlyToDrone() {
  const map = useMap();
  const location = useMissionStore((s) => s.location);
  const lastFlyToRef = useRef<number>(0);
  const THROTTLE_DELAY = 1000; // Throttle to 1 second

  useEffect(() => {
    if (!location) return;
    
    const now = Date.now();
    if (now - lastFlyToRef.current < THROTTLE_DELAY) {
      return;
    }
    
    lastFlyToRef.current = now;
    map.flyTo([location.lat, location.lng], 16, { duration: 1 });
  }, [location, map]);

  return null;
}

type LatLngTuple = [number, number];

interface MapClientProps {
  polygon?: number[][];
}

export default function MapClient({ polygon }: MapClientProps) {
  const mission = useMissionStore((s) => s.mission);
  const location = useMissionStore((s) => s.location);
  const locationPath = useMissionStore((s) => s.locationPath);
  const persistedMissionArea = useMissionStore((s) => s.missionArea); // Read persistent polygon from store
  
  // Prevent SSR + strict mode double mount
  const [mounted, setMounted] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  
  // Generate a unique key once per component instance using useMemo
  // This ensures the key is stable across re-renders but unique per mount
  const mapKey = useMemo(() => `map-${Date.now()}-${Math.random().toString(36).slice(2)}`, []);

  useEffect(() => {
    setMounted(true);
    // Small delay to ensure any previous map instances are cleaned up
    const timer = setTimeout(() => {
      setMapReady(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Memoize polygon coordinates to prevent unnecessary re-renders
  const polygonCoords = useMemo(() => {
    let coords: LatLngTuple[] = [];
    
    // Priority order:
    // 1. Persisted mission area from store (survives navigation)
    // 2. Prop polygon (immediate local update)
    // 3. Mission area/polygon object
    
    if (persistedMissionArea && persistedMissionArea.length > 0) {
      // persistedMissionArea is already in [lat, lng] format
      coords = persistedMissionArea as LatLngTuple[];
    } else if (polygon && polygon.length > 0) {
      coords = polygon.map((pt) => {
        const [lng, lat] = pt;
        return [lat, lng] as LatLngTuple;
      });
    } else if (mission?.area) {
      const coords_arr = mission.area.coordinates[0] || [];
      coords = coords_arr.map(([lng, lat]: number[]) => [lat, lng] as LatLngTuple);
    } else if (mission?.polygon) {
      coords = mission.polygon.map((pt) => {
        const [lng, lat] = pt;
        return [lat, lng] as LatLngTuple;
      });
    }
    
    return coords;
  }, [persistedMissionArea, polygon, mission?.area, mission?.polygon]);

  const dronePos: LatLngTuple | null = useMemo(() => {
    return location ? [location.lat, location.lng] : null;
  }, [location]);

  // Memoize path coordinates
  const pathCoords = useMemo(
    () => mission?.path?.map((p) => [p.lat, p.lng] as LatLngTuple) || [],
    [mission?.path]
  );

  // Memoize trail coordinates
  const trailCoords = useMemo(
    () => locationPath.map((p) => [p.lat, p.lng] as LatLngTuple),
    [locationPath]
  );

  if (!mounted || !mapReady) {
    return <div className="w-full h-full bg-muted" />;
  }

  return (
    <div className="w-full h-full">
      <MapContainer
        key={mapKey}                                    // <-- Important
        center={[37.7749, -122.4194]}
        zoom={13}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%", minHeight: "400px" }}
        className="z-0"
      >
        <TileLayer
          attribution="© OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
  
        {polygonCoords.length > 0 && (
          <Polygon
            positions={polygonCoords}
            pathOptions={{
              color: "#3b82f6",
              fillColor: "#3b82f6",
              fillOpacity: 0.3,
              weight: 2,
            }}
          />
        )}

        {/* Grid path overlay */}
        {pathCoords.length > 0 && (
          <Polyline
            positions={pathCoords}
            pathOptions={{
              color: "#fbbf24",
              weight: 2,
              dashArray: "6 6",
            }}
          />
        )}

        {/* Drone flight trail */}
        {trailCoords.length > 2 && (
          <Polyline
            positions={trailCoords}
            pathOptions={{
              color: "#3b82f6",
              weight: 3,
            }}
          />
        )}
  
        {dronePos && <Marker position={dronePos} icon={droneIcon} />}
  
        <FlyToDrone />
      </MapContainer>
    </div>
  );  
}
