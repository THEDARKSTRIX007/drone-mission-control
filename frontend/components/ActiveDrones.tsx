"use client";

import { useEffect } from "react";
import { useMissionStore } from "@/lib/store";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Zap, Wifi } from "lucide-react";

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

export default function ActiveDrones() {
  const { drones, setDrones } = useMissionStore((state) => ({
    drones: state.drones,
    setDrones: state.setDrones,
  }));

  useEffect(() => {
    // Load drones on mount
    const loadDrones = async () => {
      try {
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
      }
    };

    loadDrones();
    // Refresh every 10 seconds
    const interval = setInterval(loadDrones, 10000);
    return () => clearInterval(interval);
  }, [setDrones]);

  if (drones.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Wifi className="w-4 h-4" />
            Active Drones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground text-center py-4">
            No drones available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Wifi className="w-4 h-4" />
          Active Drones ({drones.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {drones.map((drone) => (
          <div key={drone.id} className="space-y-2 p-2 rounded-md border border-border">
            {/* Drone name and status */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{drone.name}</span>
              <Badge className={`${getStatusColor(drone.status)} text-white capitalize text-xs`}>
                {drone.status}
              </Badge>
            </div>

            {/* Battery */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  Battery
                </span>
                <span className={`text-xs font-medium ${getBatteryColor(drone.battery)}`}>
                  {Math.round(drone.battery)}%
                </span>
              </div>
              <Progress value={drone.battery} className="h-1" />
              
              {/* Battery warnings */}
              {drone.battery < 10 && (
                <div className={`mt-1 text-xs font-medium p-1 rounded ${
                  drone.battery < 5
                    ? "bg-red-100 text-red-700 battery-critical-blink"
                    : "bg-orange-100 text-orange-700"
                }`}>
                  ⚠️ {drone.battery < 5 ? "Critical battery" : "Low battery"}
                </div>
              )}
            </div>

            {/* Current mission if applicable */}
            {drone.currentMissionId && (
              <div className="text-xs text-muted-foreground">
                📍 Mission: {drone.currentMissionId.slice(0, 8)}...
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
