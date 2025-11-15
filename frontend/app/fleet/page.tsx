"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMissionStore } from "@/lib/store";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import L from "leaflet";
import { ChevronRight, Zap } from "lucide-react";
import dynamic from "next/dynamic";

// Fix default Leaflet icons
if (typeof window !== "undefined") {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  });
}

const droneIcon = new L.Icon({
  iconUrl:
    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTQiIGZpbGw9IiNlZjQ0NDQiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMiIvPgo8Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSI2IiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);

const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);

const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);

function DroneMapPreview({ lat, lng }: { lat: number; lng: number }) {
  return (
    <div className="w-full h-24 rounded-md overflow-hidden border border-border">
      <MapContainer
        center={[lat, lng]}
        zoom={14}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
        className="z-0"
      >
        <TileLayer
          attribution="© OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[lat, lng]} icon={droneIcon} />
      </MapContainer>
    </div>
  );
}

function getStatusColor(status: string) {
  switch (status) {
    case "available":
      return "bg-green-500";
    case "in-mission":
      return "bg-blue-500";
    case "charging":
      return "bg-yellow-500";
    default:
      return "bg-gray-500";
  }
}

function getBatteryColor(battery: number) {
  if (battery > 50) return "text-green-500";
  if (battery > 25) return "text-yellow-500";
  if (battery > 10) return "text-orange-500";
  return "text-red-500";
}

export default function FleetPage() {
  const router = useRouter();
  const { drones, setDrones, setActiveDrone } = useMissionStore((state) => ({
    drones: state.drones,
    setDrones: state.setDrones,
    setActiveDrone: state.setActiveDrone,
  }));

  const [loading, setLoading] = useState(true);
  const [selectedDroneId, setSelectedDroneId] = useState<string | null>(null);

  useEffect(() => {
    const loadDrones = async () => {
      try {
        setLoading(true);
        const dronesData = await api.getDrones();
        setDrones(
        dronesData.map((d) => ({
          id: d.id,
          name: d.name,
          status: d.status as any,
          battery: d.battery,
          location: d.location,
          current_mission_id: d.current_mission_id ?? null,
        }))
      );
      } catch (error) {
        console.error("Failed to load drones:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDrones();
  }, [setDrones]);

  const handleDroneSelect = (drone: any) => {
    setSelectedDroneId(drone.id);
    setActiveDrone(drone);
  };

  const handleGotoDrone = (droneId: string) => {
    router.push(`/dashboard?droneId=${droneId}`);
  };

  const selectedDrone = drones.find((d) => d.id === selectedDroneId);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading fleet...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-border p-6">
        <h1 className="text-3xl font-bold">Drone Fleet</h1>
        <p className="text-muted-foreground mt-1">
          Monitor and manage {drones.length} drone{drones.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Drone List */}
        <div className="w-96 border-r border-border overflow-y-auto p-6 space-y-4">
          {drones.map((drone) => (
            <Card
              key={drone.id}
              className={`cursor-pointer transition-all ${
                selectedDroneId === drone.id
                  ? "ring-2 ring-primary"
                  : "hover:shadow-md"
              }`}
              onClick={() => handleDroneSelect(drone)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{drone.name}</CardTitle>
                  <Badge className={`${getStatusColor(drone.status)} text-white capitalize`}>
                    {drone.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Battery */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      Battery
                    </span>
                    <span className={`text-sm font-medium ${getBatteryColor(drone.battery)}`}>
                      {Math.round(drone.battery)}%
                    </span>
                  </div>
                  <Progress value={drone.battery} className="h-1.5" />
                </div>

                {/* Location */}
                <div className="text-xs text-muted-foreground">
                  📍 {drone.location.lat.toFixed(4)}, {drone.location.lng.toFixed(4)}
                </div>
              </CardContent>
            </Card>
          ))}

          {drones.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              No drones available
            </div>
          )}
        </div>

        {/* Detail View */}
        <div className="flex-1 overflow-y-auto p-6">
          {selectedDrone ? (
            <div className="space-y-6">
              {/* Info Card */}
              <Card>
                <CardHeader>
                  <CardTitle>{selectedDrone.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">ID</p>
                      <p className="font-mono text-sm">{selectedDrone.id}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Status</p>
                      <Badge className={`${getStatusColor(selectedDrone.status)} text-white capitalize`}>
                        {selectedDrone.status}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Battery Level</p>
                    <div className="flex items-center gap-3">
                      <Progress value={selectedDrone.battery} className="flex-1 h-2" />
                      <span className={`text-lg font-bold ${getBatteryColor(selectedDrone.battery)}`}>
                        {Math.round(selectedDrone.battery)}%
                      </span>
                    </div>
                  </div>

                  {selectedDrone.currentMissionId && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Current Mission</p>
                      <p className="text-sm font-mono">{selectedDrone.currentMissionId}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Map Preview */}
              <div>
                <h3 className="text-sm font-medium mb-2">Location Map</h3>
                <DroneMapPreview
                  lat={selectedDrone.location.lat}
                  lng={selectedDrone.location.lng}
                />
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              Select a drone to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
