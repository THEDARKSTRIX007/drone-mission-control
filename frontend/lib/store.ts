import { create } from "zustand";

export type MissionStatus =
  | "idle"
  | "pending"
  | "running"
  | "in-progress"
  | "paused"
  | "completed"
  | "aborted";

export type DroneStatus = "available" | "in-mission" | "charging";

export interface DroneLocation {
  lat: number;
  lng: number;
}

export interface GeoJSONPolygon {
  type: "Polygon";
  coordinates: number[][][];
}

export interface Mission {
  id: string;
  name: string;
  pattern: string;
  altitude: number;
  area?: GeoJSONPolygon;
  polygon?: number[][];
  path?: { lat: number; lng: number }[];
}

export interface Drone {
  id: number;
  name: string;
  status: DroneStatus;
  battery: number;
  location: DroneLocation;
  currentMissionId?: string;
}

export interface MissionReport {
  id: string;
  missionId: string;
  status: MissionStatus;
  distance?: number;
  duration?: number;
  batteryUsed?: number;
  completedAt?: string;
  abortReason?: string;
}

export interface MissionState {
  missionId: string | null;
  droneId: string | null;
  location: DroneLocation | null;
  progress: number;
  battery: number;
  eta: number | null;
  status: MissionStatus;
  mission: Mission | null;
  locationPath: { lat: number; lng: number }[];
  // Fleet data
  drones: Drone[];
  activeDrone: Drone | null;
  // Reports data
  reports: MissionReport[];
  // Mission area (polygon)
  missionArea: number[][] | null;
}

interface MissionStore extends MissionState {
  setMission: (mission: Mission) => void;
  setMissionStatus: (status: MissionStatus) => void;
  updateFromWS: (data: {
    type: string;
    missionId?: string;
    droneId?: string;
    location?: { lat: number; lng: number };
    progress?: number;
    battery?: number;
    eta?: number | null;
    status?: MissionStatus;
  }) => void;
  addLocationPoint: (pt: { lat: number; lng: number }) => void;
  resetPath: () => void;
  // Fleet actions
  setDrones: (drones: Drone[]) => void;
  setActiveDrone: (drone: Drone | null) => void;
  updateDrone: (droneId: number, updates: Partial<Drone>) => void;
  // Reports actions
  setReports: (reports: MissionReport[]) => void;
  // Mission area actions
  setMissionArea: (area: number[][] | null) => void;
  clearMissionArea: () => void;
  reset: () => void;
}

const initialState: MissionState = {
  missionId: null,
  droneId: null,
  location: null,
  progress: 0,
  battery: 100,
  eta: null,
  status: "idle",
  mission: null,
  locationPath: [],
  drones: [],
  activeDrone: null,
  reports: [],
  missionArea: null,
};

export const useMissionStore = create<MissionStore>((set) => ({
  ...initialState,

  setMission: (mission) =>
    set({
      mission,
      missionId: mission.id,
      status: "idle",
      progress: 0,
      locationPath: [],
    }),

  setMissionStatus: (status) =>
    set((state) => ({
      status,
      mission: state.mission ? { ...state.mission } : null,
    })),

  updateFromWS: (data) => {
    if (data.type === "mission_update") {
      set((state) => ({
        missionId: data.missionId ?? state.missionId,
        droneId: data.droneId ?? state.droneId,
        location: data.location ?? state.location,
        progress: data.progress ?? state.progress,
        battery: data.battery ?? state.battery,
        eta: data.eta ?? state.eta,
        status: data.status ?? state.status,
      }));
    }
  },

  addLocationPoint: (pt) =>
    set((state) => ({
      locationPath: [...state.locationPath, pt],
    })),

  resetPath: () => set({ locationPath: [] }),

  // Fleet actions
  setDrones: (drones) => set({ drones }),

  setActiveDrone: (drone) => set({ activeDrone: drone }),

  updateDrone: (droneId, updates) =>
    set((state) => ({
      drones: state.drones.map((d) =>
        d.id === droneId ? { ...d, ...updates } : d
      ),
      activeDrone:
        state.activeDrone?.id === droneId
          ? { ...state.activeDrone, ...updates }
          : state.activeDrone,
    })),

  // Reports actions
  setReports: (reports) => set({ reports }),

  // Mission area actions
  setMissionArea: (area) => set({ missionArea: area }),

  clearMissionArea: () => set({ missionArea: null }),

  reset: () => set(initialState),
}));
