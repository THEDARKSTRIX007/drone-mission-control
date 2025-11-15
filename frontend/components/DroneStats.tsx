"use client";

import { useMissionStore } from "@/lib/store";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Battery, Clock, Activity } from "lucide-react";

export default function DroneStats() {
  const { battery, progress, eta, status } = useMissionStore((state) => ({
    battery: state.battery,
    progress: state.progress,
    eta: state.eta,
    status: state.status,
  }));

  const formatETA = (seconds: number | null) => {
    if (seconds === null || seconds === undefined) return "—";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running":
      case "in-progress":
        return "text-green-500";
      case "paused":
        return "text-yellow-500";
      case "completed":
        return "text-blue-500";
      case "aborted":
        return "text-red-500";
      default:
        return "text-muted-foreground";
    }
  };

  const getBatteryColor = (level: number) => {
    if (level > 50) return "text-green-500";
    if (level > 25) return "text-yellow-500";
    if (level > 10) return "text-orange-500";
    return "text-red-500";
  };

  const getBatteryLabel = (level: number) => {
    if (level > 50) return "Good";
    if (level > 25) return "Low";
    if (level > 10) return "Critical";
    return "Emergency";
  };

  const getBatteryWarning = (level: number) => {
    if (level < 10) return "CRITICAL - Drone should return to base immediately";
    if (level < 5) return "EMERGENCY - Battery critically low";
    return null;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Mission Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <span className={`text-sm font-medium capitalize ${getStatusColor(status)}`}>
                {status}
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className={battery < 5 ? "border-red-500 bg-red-50/50" : battery < 10 ? "border-orange-500 bg-orange-50/50" : ""}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Battery className="w-4 h-4" />
            Battery
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Level</span>
              <span className={`text-sm font-medium ${getBatteryColor(battery)} ${battery < 5 ? "battery-critical-blink" : ""}`}>
                {Math.round(battery)}%
              </span>
            </div>
            <Progress value={battery} className={`h-2 ${battery < 10 ? "progress-animated" : ""}`} />
            <div className={`flex items-center gap-1 text-xs ${getBatteryColor(battery)}`}>
              <Battery className="w-3 h-3" />
              <span>{getBatteryLabel(battery)}</span>
            </div>

            {/* Battery Warning Alerts */}
            {battery < 10 && (
              <div className={`mt-3 p-2 rounded-md text-xs font-medium ${
                battery < 5
                  ? "bg-red-100 border border-red-300 text-red-900 battery-critical-blink"
                  : "bg-orange-100 border border-orange-300 text-orange-900"
              }`}>
                {getBatteryWarning(battery)}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4" />
            ETA
          </CardTitle>
        </CardHeader>
        <CardContent>
          {status === "idle" || status === "paused" ? (
            <div className="text-sm text-muted-foreground">
              {status === "idle" ? "Start mission to calculate ETA" : "Paused"}
            </div>
          ) : (
            <>
              <div className="text-2xl font-semibold">
                {formatETA(eta)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Estimated time remaining
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

