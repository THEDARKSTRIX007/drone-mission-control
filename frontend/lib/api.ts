// =========================
// API BASE URL
// =========================
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

// =========================
// TYPES
// =========================
export interface GeoJSONPolygon {
  type: "Polygon";
  coordinates: number[][][];
}

export interface CreateMissionRequest {
  name: string;
  pattern: string;
  altitude: number;
  area: GeoJSONPolygon;
  assigned_drone_id: number;
  sensors: string[];
}

export interface MissionResponse {
  id: string;
  name: string;
  pattern: string;
  altitude: number;
  area: GeoJSONPolygon;
  assigned_drone_id?: number | null;
  sensors: string[];
  path?: { lat: number; lng: number }[];
}

export interface DroneResponse {
  id: string;
  name: string;
  status: string;
  battery: number;
  location: { lat: number; lng: number };
  current_mission_id?: string | number | null; 
}


export type MissionStatus =
  | "pending"
  | "in-progress"
  | "completed"
  | "aborted"
  | "paused";

export interface MissionReport {
  id: string;
  missionId: string;  
  status: string;
  distance: number | null;
  duration: number | null;
  batteryUsed: number | null;
  completedAt: string | null;
  abortReason: string | null;
}





// =========================
// API METHODS
// =========================
export const api = {
  async createMission(data: CreateMissionRequest): Promise<MissionResponse> {
    const response = await fetch(`${API_URL}/missions/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: data.name,
        pattern: data.pattern,
        altitude: data.altitude,
        area: data.area,
        assigned_drone_id: data.assigned_drone_id,
        sensors: data.sensors, 
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create mission: ${response.statusText}`);
    }

    return response.json();
  },

  async getMission(id: string): Promise<MissionResponse> {
    const response = await fetch(`${API_URL}/missions/${id}`);

    if (!response.ok) {
      throw new Error(`Failed to get mission: ${response.statusText}`);
    }

    return response.json();
  },

  async startMission(missionId: string): Promise<void> {
    const response = await fetch(`${API_URL}/missions/${missionId}/start`, {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error(`Failed to start mission: ${response.statusText}`);
    }
  },

  async pauseMission(missionId: string): Promise<void> {
    const response = await fetch(`${API_URL}/missions/${missionId}/pause`, {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error(`Failed to pause mission: ${response.statusText}`);
    }
  },

  async resumeMission(missionId: string): Promise<void> {
    const response = await fetch(`${API_URL}/missions/${missionId}/resume`, {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error(`Failed to resume mission: ${response.statusText}`);
    }
  },

  async abortMission(missionId: string): Promise<void> {
    const response = await fetch(`${API_URL}/missions/${missionId}/abort`, {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error(`Failed to abort mission: ${response.statusText}`);
    }
  },

  async resetMission(missionId: string): Promise<void> {
    const response = await fetch(`${API_URL}/missions/${missionId}/reset`, {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error(`Failed to reset mission: ${response.statusText}`);
    }
  },

  async getDrones(): Promise<DroneResponse[]> {
    const response = await fetch(`${API_URL}/drones/`);

    if (!response.ok) {
      throw new Error(`Failed to fetch drones: ${response.statusText}`);
    }

    return response.json();
  },

  async getDrone(id: string): Promise<DroneResponse> {
    const response = await fetch(`${API_URL}/drones/${id}`);

    if (!response.ok) {
      throw new Error(`Failed to get drone: ${response.statusText}`);
    }

    return response.json();
  },

  async getReports(): Promise<MissionReport[]> {
    const response = await fetch(`${API_URL}/reports/missions`);

    if (!response.ok) {
      throw new Error(`Failed to fetch reports: ${response.statusText}`);
    }

    return response.json();
  },

  async getReport(id: string): Promise<MissionReport> {
    const response = await fetch(`${API_URL}/reports/${id}`);

    if (!response.ok) {
      throw new Error(`Failed to get report: ${response.statusText}`);
    }

    return response.json();
  },

  async getMissionSummary(): Promise<{
    total: number;
    active: number;
    completed: number;
    aborted: number;
  }> {
    const response = await fetch(`${API_URL}/missions/summary`);

    if (!response.ok) {
      throw new Error(`Failed to fetch mission summary: ${response.statusText}`);
    }

    return response.json();
  },

  async getActiveMissions(): Promise<
    Array<{
      id: string;
      name: string;
      status: string;
      updated_at: string;
    }>
  > {
    const response = await fetch(`${API_URL}/missions/active`);

    if (!response.ok) {
      throw new Error(`Failed to fetch active missions: ${response.statusText}`);
    }

    return response.json();
  },

  async getAnalyticsOverview(): Promise<{
    total_surveys: number;
    estimated_total_distance_m: number;
    estimated_total_flight_hours: number;
  }> {
    const response = await fetch(`${API_URL}/analytics/overview`);

    if (!response.ok) {
      throw new Error(`Failed to fetch analytics overview: ${response.statusText}`);
    }

    return response.json();
  },
};
