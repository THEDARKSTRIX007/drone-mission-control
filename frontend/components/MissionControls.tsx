"use client";

import { Button } from "@/components/ui/button";
import { useMissionStore } from "@/lib/store";
import { api } from "@/lib/api";
import { Play, Pause, X } from "lucide-react";
import { useState } from "react";

export default function MissionControls() {
  const {
    missionId,
    status,
    setMissionStatus,
    resetPath,
  } = useMissionStore((state) => ({
    missionId: state.missionId,
    status: state.status,
    setMissionStatus: state.setMissionStatus,
    resetPath: state.resetPath,
  }));

  const [loading, setLoading] = useState<string | null>(null);

  const handleStart = async () => {
    if (!missionId) return;
    setLoading("start");

    try {
      await api.startMission(missionId);
      setMissionStatus("in-progress");
    } catch (error) {
      console.error("Failed to start mission:", error);
    } finally {
      setLoading(null);
    }
  };

  const handlePause = async () => {
    if (!missionId) return;
    setLoading("pause");

    try {
      await api.pauseMission(missionId);
      setMissionStatus("paused");
    } catch (error) {
      console.error("Failed to pause mission:", error);
    } finally {
      setLoading(null);
    }
  };

  const handleResume = async () => {
    if (!missionId) return;
    setLoading("resume");

    try {
      await api.resumeMission(missionId);
      setMissionStatus("in-progress");
    } catch (error) {
      console.error("Failed to resume mission:", error);
    } finally {
      setLoading(null);
    }
  };

  const handleAbort = async () => {
    if (!missionId) return;
    setLoading("abort");

    try {
      await api.abortMission(missionId);
      setMissionStatus("aborted");
    } catch (error) {
      console.error("Failed to abort mission:", error);
    } finally {
      setLoading(null);
    }
  };

  const handleReplay = async () => {
    if (!missionId) return;
    setLoading("replay");

    try {
      // Reset backend mission
      await api.resetMission(missionId);

      // Reset frontend
      resetPath();
      setMissionStatus("pending");

      // Start again
      await api.startMission(missionId);
      setMissionStatus("in-progress");

    } catch (error) {
      console.error("Replay failed:", error);
    } finally {
      setLoading(null);
    }
  };

  // UI: No mission selected
  if (!missionId) {
    return (
      <div className="text-sm text-muted-foreground">
        No mission selected
      </div>
    );
  }

  // UI: Completed mission
  if (status === "completed") {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="w-2 h-2 bg-blue-500 rounded-full" />
          <span className="text-sm font-medium text-blue-900">
            Mission Completed
          </span>
        </div>
        <Button
          onClick={handleReplay}
          disabled={loading !== null}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          size="sm"
        >
          <Play className="w-4 h-4 mr-2" />
          Replay Flight
        </Button>
      </div>
    );
  }

  // UI: Aborted mission
  if (status === "aborted") {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="w-2 h-2 bg-red-500 rounded-full" />
          <span className="text-sm font-medium text-red-900">
            Mission Aborted
          </span>
        </div>
        <Button
          onClick={handleReplay}
          disabled={loading !== null}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          size="sm"
        >
          <Play className="w-4 h-4 mr-2" />
          Replay Flight
        </Button>
      </div>
    );
  }

  // Active mission controls
  const isPaused = status === "paused";
  const isRunning =
    status === "running" || status === "in-progress";
  const isStartable =
    status === "idle" || status === "pending";

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        {/* Start */}
        {isStartable && (
          <Button
            onClick={handleStart}
            disabled={loading !== null}
            className="w-full"
            size="sm"
          >
            <Play className="w-4 h-4 mr-2" />
            Start
          </Button>
        )}

        {(isRunning || isPaused) && (
          <>
            {/* Pause / Resume */}
            <Button
              onClick={isPaused ? handleResume : handlePause}
              disabled={loading !== null}
              className={`w-full ${
                isPaused
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-yellow-600 hover:bg-yellow-700 text-white"
              }`}
              size="sm"
            >
              {isPaused ? (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Play
                </>
              ) : (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </>
              )}
            </Button>

            {/* Abort */}
            <Button
              onClick={handleAbort}
              disabled={loading !== null}
              className="bg-red-600 hover:bg-red-700 text-white w-full"
              size="sm"
            >
              <X className="w-4 h-4 mr-2" />
              Abort
            </Button>
          </>
        )}
      </div>
    </div>
  );
}