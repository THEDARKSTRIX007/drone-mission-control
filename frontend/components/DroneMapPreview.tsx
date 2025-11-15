"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import L from "leaflet";

interface Props {
  lat: number;
  lng: number;
}

const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((m) => m.Marker),
  { ssr: false }
);

export default function DroneMapPreview({ lat, lng }: Props) {
  const [droneIcon, setDroneIcon] = useState<L.Icon | null>(null);

  useEffect(() => {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
      iconUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
      shadowUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    });

    const icon = new L.Icon({
      iconUrl:
        "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTQiIGZpbGw9IiNlZjQ0NDQiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMiIvPgo8Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSI2IiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K",
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    setDroneIcon(icon);
  }, []);

  if (!droneIcon) {
    return <div className="w-full h-24 bg-muted rounded-md" />;
  }

  return (
    <div className="w-full h-24 rounded-md overflow-hidden border border-border">
      <MapContainer
        center={[lat, lng]}
        zoom={14}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={[lat, lng]} icon={droneIcon} />
      </MapContainer>
    </div>
  );
}
