"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, ArrowRight } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [summary, setSummary] = useState<any>(null);
  const [activeMissions, setActiveMissions] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [summaryData, activeMissionsData, analyticsData] = await Promise.all([
          api.getMissionSummary().catch(() => ({ total: 0, active: 0, completed: 0, aborted: 0 })),
          api.getActiveMissions().catch(() => []),
          api.getAnalyticsOverview().catch(() => ({ total_surveys: 0, estimated_total_distance_m: 0, estimated_total_flight_hours: 0 })),
        ]);

        setSummary(summaryData);
        setActiveMissions(activeMissionsData);
        setAnalytics(analyticsData);
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
        setError("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">Drone Command Center</h1>
            <p className="text-muted-foreground mt-2">Monitor and manage your missions</p>
          </div>
          <Button
            onClick={() => router.push("/missions/new")}
            className="gap-2"
            size="lg"
          >
            <Plus className="w-4 h-4" />
            New Mission
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 max-w-7xl mx-auto space-y-8">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-900">
            {error}
          </div>
        )}

        {/* Mission Summary Cards */}
        {summary && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Mission Summary</h2>
            <div className="grid grid-cols-4 gap-4">
              <StatCard title="Total Missions" value={summary.total} />
              <StatCard title="Active Missions" value={summary.active} />
              <StatCard title="Completed" value={summary.completed} />
              <StatCard title="Aborted" value={summary.aborted} />
            </div>
          </div>
        )}

        {/* Active Missions Mini-Feed */}
        <div className="p-4 bg-slate-900 rounded-xl border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Active Missions</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/fleet")}
              className="gap-1"
            >
              View All
              <ArrowRight className="w-3 h-3" />
            </Button>
          </div>

          {activeMissions.length === 0 ? (
            <p className="text-sm text-slate-400">No active missions at the moment</p>
          ) : (
            <ul className="space-y-2">
              {activeMissions.map((m: any) => (
                <li
                  key={m.id}
                  className="p-3 bg-slate-800 rounded-md cursor-pointer hover:bg-slate-700 transition-colors"
                  onClick={() => router.push(`/dashboard?missionId=${m.id}`)}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-white font-medium">{m.name}</span>
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                      {m.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Updated {new Date(m.updated_at).toLocaleTimeString()}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Organization Analytics */}
        {analytics && (
          <div className="p-4 bg-slate-900 rounded-xl border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Analytics</h2>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <StatCard title="Total Surveys" value={analytics.total_surveys} />
              <StatCard
                title="Total Distance"
                value={`${(analytics.estimated_total_distance_m / 1000).toFixed(1)} km`}
              />
              <StatCard
                title="Flight Hours"
                value={analytics.estimated_total_flight_hours}
              />
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => router.push("/fleet")}>
            <CardHeader>
              <CardTitle className="text-base">Fleet Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Monitor and manage all active drones
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => router.push("/missions/new")}>
            <CardHeader>
              <CardTitle className="text-base">Create Mission</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Start a new drone mission
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

