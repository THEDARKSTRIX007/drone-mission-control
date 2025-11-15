"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet-draw";
import { useMissionStore } from "@/lib/store";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

function leafletPolygonToGeoJSON(layer: any) {
  const latlngs = layer.getLatLngs()[0];
  const coords = latlngs.map((pt: any) => [pt.lng, pt.lat]);

  // Close polygon
  if (coords.length > 0) {
    const first = coords[0];
    const last = coords[coords.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      coords.push(first);
    }
  }

  return { type: "Polygon", coordinates: [coords] };
}

interface PolygonDrawerClientProps {
  onPolygonComplete: (polygon: number[][]) => void;
}

export default function PolygonDrawerClient({
  onPolygonComplete,
}: PolygonDrawerClientProps) {
  const mapRef = useRef<L.Map | null>(null);
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null);
  const [hasPolygon, setHasPolygon] = useState(false);

  const { setMissionArea, clearMissionArea } = useMissionStore();

  const handleClearPolygon = () => {
    if (drawnItemsRef.current) {
      drawnItemsRef.current.clearLayers();
      setHasPolygon(false);
      onPolygonComplete([]);
      clearMissionArea();
    }
  };

  useEffect(() => {
    const mapId = "draw-map";
    const mapElement = document.getElementById(mapId);
    if (!mapElement || mapRef.current) return;

    // Init Map
    const map = L.map(mapId).setView([37.7749, -122.4194], 13);
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);

    // Draw Layer
    const drawnItems = new L.FeatureGroup();
    drawnItemsRef.current = drawnItems;
    map.addLayer(drawnItems);

    // Restore polygon from Zustand (THE FIX)
    const saved = useMissionStore.getState().missionArea;

    if (saved && saved.length > 2) {
      const leafletCoords = saved.map(([lat, lng]) => L.latLng(lat, lng));
      const restoredPolygon = L.polygon(leafletCoords, {
        color: "#3b82f6",
        weight: 2,
        fillColor: "#3b82f6",
        fillOpacity: 0.3,
      });

      drawnItems.addLayer(restoredPolygon);
      setHasPolygon(true);
    }

    // Draw Controls
    const drawControl = new L.Control.Draw({
      draw: {
        marker: false,
        polyline: false,
        rectangle: false,
        circle: false,
        circlemarker: false,
        polygon: {
          allowIntersection: false,
          showArea: true,
        },
      },
      edit: {
        featureGroup: drawnItems,
        remove: true,
      },
    });

    map.addControl(drawControl);

    // CREATED (Finished drawing)
    map.on(L.Draw.Event.CREATED, (event: any) => {
      const layer = event.layer;

      // Clear old layers (only one polygon allowed)
      drawnItems.clearLayers();
      drawnItems.addLayer(layer);

      const geo = leafletPolygonToGeoJSON(layer);
      const coords = geo.coordinates[0];

      // Send original coordinates (lng,lat) to parent
      onPolygonComplete(coords);

      // Save rendered polygon in Zustand (lat,lng)
      const latlngs = coords.map(([lng, lat]: [number, number]) => [
        lat,
        lng,
      ]);
      setMissionArea(latlngs);

      setHasPolygon(true);
    });

    // DELETED
    map.on(L.Draw.Event.DELETED, () => {
      setHasPolygon(false);
      onPolygonComplete([]);
      clearMissionArea();
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      <div
        id="draw-map"
        style={{ height: "100%", width: "100%" }}
        className="rounded-lg overflow-hidden"
      />

      {!hasPolygon && (
        <div className="absolute bottom-4 left-4 bg-black/80 text-white p-3 rounded-lg shadow-lg text-sm max-w-xs z-[1000]">
          <p className="font-semibold mb-1">Drawing Mode</p>
          <ul className="text-xs space-y-1">
            <li>• Click to add polygon points</li>
            <li>• Double-click to finish polygon</li>
            <li>• Use toolbar to edit or delete</li>
          </ul>
        </div>
      )}

      {hasPolygon && (
        <button
          onClick={handleClearPolygon}
          className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm font-medium z-[1000] shadow"
        >
          Clear Polygon
        </button>
      )}
    </div>
  );
}
