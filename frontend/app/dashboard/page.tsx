"use client";

import { useEffect, useState, Suspense } from "react";
import { useMissionStore } from "@/lib/store";
import { wsClient } from "@/lib/ws";
import { api } from "@/lib/api";
import Map from "@/components/Map";
import MissionControls from "@/components/MissionControls";
import DroneStats from "@/components/DroneStats";
import ActiveDrones from "@/components/ActiveDrones";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSearchParams, useRouter } from "next/navigation";

function DashboardContent() {
  const { missionId, mission, status, location, setMission } = useMissionStore();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Connect WebSocket
    wsClient.connect();

    return () => {
      wsClient.disconnect();
    };
  }, []);

  useEffect(() => {
    const id = searchParams.get("missionId");
    if (!id) {
      setLoading(false);
      return;
    }
  
    // Load mission only once
    if (!mission) {
      loadMission(id);
    }
  }, [searchParams, mission]);
  

  const loadMission = async (id: string) => {
    try {
      setLoading(true);
      const missionData = await api.getMission(id);
      setMission(missionData);
    } catch (error) {
      console.error("Failed to load mission:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading mission...</div>
      </div>
    );
  }

  if (!mission) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>No Mission Selected</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Please create a mission or select one from the URL.
            </p>
            <button
              onClick={() => router.push("/missions/new")}
              className="text-primary hover:underline"
            >
              Create New Mission →
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        {/* Map Section */}
        <div className="flex-1 relative h-full overflow-hidden">
          <Map />
        </div>

        {/* Side Panel */}
        <div className="w-96 bg-background border-l border-border overflow-y-auto p-6 space-y-6">
          <div>
            <h1 className="text-2xl font-bold mb-2">{mission.name}</h1>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Pattern: {mission.pattern}</p>
              <p>Altitude: {mission.altitude}m</p>
            </div>
          </div>

          <DroneStats />

          <ActiveDrones />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Controls</CardTitle>
            </CardHeader>
            <CardContent>
              <MissionControls />
            </CardContent>
          </Card>

          {location && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Drone Position</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Latitude:</span>
                    <span className="font-mono">{location.lat.toFixed(6)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Longitude:</span>
                    <span className="font-mono">{location.lng.toFixed(6)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}

