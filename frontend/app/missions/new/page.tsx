"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import dynamic from "next/dynamic";
import { useMissionStore } from "@/lib/store";
import { api } from "@/lib/api";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { SENSOR_OPTIONS } from "@/lib/sensors";

export default function NewMissionPage() {
  const router = useRouter();

  // Zustand polygon
  const missionArea = useMissionStore((s) => s.missionArea);
  const [name, setName] = useState("");
  const [pattern, setPattern] = useState("grid");
  const [altitude, setAltitude] = useState("50");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // NEW → drone selection states
  const [drones, setDrones] = useState<any[]>([]);
  const [selectedDrone, setSelectedDrone] = useState<number | null>(null);
  const [selectedSensors, setSelectedSensors] = useState<string[]>([]);

  const PolygonDrawer = dynamic(
  () => import("@/components/PolygonDrawerClient"),
  { ssr: false }
);

const MapClient = dynamic(
  () => import("@/components/MapClient"),
  { ssr: false }
);

  // Fetch drones on load
  useEffect(() => {
    (async () => {
      try {
        const list = await api.getDrones();
        setDrones(list);

        // Auto-select first available drone
        const available = list.find((d) => d.status === "available");
        if (available) setSelectedDrone(Number(available.id));
      } catch (err) {
        console.error("Failed to load drones", err);
      }
    })();
  }, []);

  // On polygon draw complete
  const handlePolygonComplete = (poly: number[][]) => {
    if (poly.length >= 3) return;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!missionArea || missionArea.length < 3) {
      setError("Please draw a polygon before creating mission");
      return;
    }

    if (!name.trim()) {
      setError("Mission name is required");
      return;
    }

    if (!selectedDrone) {
      setError("Please select a drone to assign for this mission");
      return;
    }

    setLoading(true);

    try {
      // Convert Zustand polygon → GeoJSON
      const geoPolygon = {
        type: "Polygon" as const,
        coordinates: [missionArea.map(([lat, lng]) => [lng, lat])],
      };
      const mission = await api.createMission({
        name: name.trim(),
        pattern,
        altitude: parseFloat(altitude),
        area: geoPolygon,
        assigned_drone_id: selectedDrone,
        sensors: selectedSensors,
      });


      router.push(`/dashboard?missionId=${mission.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to create mission");
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b border-border p-4 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-2xl font-bold">Create New Mission</h1>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* LEFT SIDE: Map */}
        <div className="flex-1 relative">
          <PolygonDrawer onPolygonComplete={handlePolygonComplete} />
          <div className="absolute inset-0 pointer-events-none">
            <MapClient polygon={missionArea ?? undefined} />
          </div>
        </div>

        {/* RIGHT SIDE: Form */}
        <div className="w-96 bg-background border-l border-border overflow-y-auto p-6">
          <Card>
            <CardHeader>
              <CardTitle>Mission Details</CardTitle>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">

                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Mission Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter mission name"
                    required
                  />
                </div>

                {/* Pattern */}
                <div className="space-y-2">
                  <Label htmlFor="pattern">Pattern</Label>
                  <select
                    id="pattern"
                    value={pattern}
                    onChange={(e) => setPattern(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="grid">Grid</option>
                    <option value="crosshatch">Crosshatch</option>
                    <option value="perimeter">Perimeter</option>
                    <option value="lawnmower">Lawnmower</option>
                    <option value="spiral">Spiral</option>
                    <option value="zigzag">Zigzag</option>
                  </select>
                </div>

                {/* Altitude */}
                <div className="space-y-2">
                  <Label htmlFor="altitude">Altitude (meters)</Label>
                  <Input
                    id="altitude"
                    type="number"
                    value={altitude}
                    min={10}
                    max={500}
                    onChange={(e) => setAltitude(e.target.value)}
                    required
                  />
                </div>

                {/* Drone Selection (NEW) */}
                <div className="space-y-2">
                  <Label>Assign Drone</Label>
                  <select
                    value={selectedDrone ?? ""}
                    onChange={(e) => setSelectedDrone(Number(e.target.value))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    required
                  >
                    <option value="" disabled>
                      {drones.length === 0
                        ? "Loading drones..."
                        : "Select a drone"}
                    </option>

                    {drones.map((d) => (
                      <option
                        key={d.id}
                        value={d.id}
                        disabled={d.status !== "available"}
                      >
                        {d.name} — {d.battery}% {d.status !== "available" ? `( ${d.status} )` : ""}
                      </option>
                    ))}
                  </select>

                  <p className="text-xs text-muted-foreground">
                    Only available drones can be selected.
                  </p>
                </div>

              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">Select Sensors</label>

                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {SENSOR_OPTIONS.map((sensor) => (
                      <label
                        key={sensor.value}
                        className="flex items-center gap-2 cursor-pointer select-none"
                      >
                        <input
                          type="checkbox"
                          checked={selectedSensors.includes(sensor.value)}
                          onChange={() => {
                            setSelectedSensors((prev) =>
                              prev.includes(sensor.value)
                                ? prev.filter((s) => s !== sensor.value)
                                : [...prev, sensor.value]
                            );
                          }}
                        />
                        <span>{sensor.label}</span>
                      </label>
                    ))}
                  </div>
            </div>


                {/* Polygon Status */}
                <div className="space-y-2">
                  <Label>Mission Area</Label>
                  <div className="text-sm text-muted-foreground p-3 bg-muted rounded-md">
                    {missionArea && missionArea.length >= 3 ? (
                      <div>
                        <p className="font-medium text-foreground mb-1">
                          Polygon drawn ({missionArea.length} points)
                        </p>
                        <p className="text-xs">Use the map to adjust or redraw the polygon.</p>
                      </div>
                    ) : (
                      <p>Use the polygon drawing tool to draw the mission area.</p>
                    )}
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                {/* Submit */}
                <Button
                  disabled={loading || !missionArea || missionArea.length < 3}
                  className="w-full"
                >
                  {loading ? "Creating..." : "Create Mission"}
                </Button>

              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
