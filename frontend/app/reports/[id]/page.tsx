"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MapContainer, TileLayer, Polyline, Marker } from "react-leaflet";
import L from "leaflet";
import { ArrowLeft, MapPin, Clock, Zap, TrendingUp } from "lucide-react";

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

function getStatusColor(status: string) {
  switch (status) {
    case "completed":
      return "bg-green-500";
    case "in-progress":
      return "bg-blue-500";
    case "aborted":
      return "bg-red-500";
    case "paused":
      return "bg-yellow-500";
    default:
      return "bg-gray-500";
  }
}

function formatDuration(seconds?: number) {
  if (!seconds) return "—";
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

export default function ReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const reportId = params.id as string;

  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadReport = async () => {
      try {
        setLoading(true);
        const reportData = await api.getReport(reportId);
        setReport(reportData);
      } catch (error) {
        console.error("Failed to load report:", error);
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [reportId]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading report...</div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Report not found</p>
          <Button onClick={() => router.push("/reports")}>Back to Reports</Button>
        </div>
      </div>
    );
  }

  // Mock path data for demonstration - in real app, this would come from backend
  const mockPath = report.path || [
    [37.7749, -122.4194],
    [37.7750, -122.4195],
    [37.7751, -122.4196],
  ];

  const startPoint = mockPath[0];
  const endPoint = mockPath[mockPath.length - 1];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/reports")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-3xl font-bold">Mission Report</h1>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-muted-foreground">Mission ID:</p>
          <p className="font-mono text-sm">{report.missionId}</p>
          <Badge className={`${getStatusColor(report.status)} text-white capitalize`}>
            {report.status}
          </Badge>
        </div>
      </div>

      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Key Stats */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Distance</p>
                  <p className="text-2xl font-bold">
                    {report.distance ? `${(report.distance / 1000).toFixed(2)}` : "—"} km
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="text-xl font-bold">{formatDuration(report.duration)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Battery Used</p>
                  <p className="text-2xl font-bold">
                    {report.batteryUsed ? `${Math.round(report.batteryUsed)}%` : "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div>
                <p className="text-xs text-muted-foreground">Completed</p>
                <p className="text-sm font-medium">
                  {report.completedAt
                    ? new Date(report.completedAt).toLocaleDateString()
                    : "—"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Mission Path Map */}
        <Card>
          <CardHeader>
            <CardTitle>Flight Path</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full h-96 rounded-md overflow-hidden border border-border">
              <MapContainer
                center={startPoint}
                zoom={13}
                scrollWheelZoom={true}
                style={{ height: "100%", width: "100%" }}
                className="z-0"
              >
                <TileLayer
                  attribution="© OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {mockPath.length > 1 && (
                  <Polyline
                    positions={mockPath}
                    pathOptions={{
                      color: "#3b82f6",
                      weight: 3,
                    }}
                  />
                )}
                {startPoint && <Marker position={startPoint} icon={droneIcon} />}
                {endPoint && startPoint !== endPoint && (
                  <Marker position={endPoint} icon={droneIcon} />
                )}
              </MapContainer>
            </div>
          </CardContent>
        </Card>

        {/* Stats Details */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Start Point</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Latitude</span>
                <span className="font-mono text-sm">{startPoint?.[0].toFixed(6)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Longitude</span>
                <span className="font-mono text-sm">{startPoint?.[1].toFixed(6)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">End Point</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Latitude</span>
                <span className="font-mono text-sm">{endPoint?.[0].toFixed(6)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Longitude</span>
                <span className="font-mono text-sm">{endPoint?.[1].toFixed(6)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Abort Reason if applicable */}
        {report.abortReason && (
          <Card className="border-destructive/20 bg-destructive/5">
            <CardHeader>
              <CardTitle className="text-base text-destructive">Abort Reason</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{report.abortReason}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
