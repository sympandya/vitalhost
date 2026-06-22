import { create } from 'zustand';
import type { TelemetryPayload } from '../types/telemetry'; // Adjust path if needed

interface IncidentReport {
  trigger: string;
  analysis: string;
  timestamp: string;
}

interface TelemetryState {
  latest: TelemetryPayload | null;
  history: {
    cpuPercent: number[]; rss: number[]; heapUsed: number[]; eventLoop: number[]; rps: number[]; p99: number[]; timestamps: string[];
  };
  dvr: {
    isActive: boolean;
    data: TelemetryPayload[];
    currentIndex: number;
  };
  
  incidentReport: IncidentReport | null;
  
  updateTelemetry: (data: TelemetryPayload) => void;
  clearHistory: () => void;
  startDvr: (data: TelemetryPayload[]) => void;
  setDvrIndex: (index: number) => void;
  stopDvr: () => void;
  
  setIncidentReport: (report: IncidentReport) => void;
  clearIncidentReport: () => void;
}

const MAX_HISTORY = 60; 
const EMPTY_HISTORY = { cpuPercent: [], rss: [], heapUsed: [], eventLoop: [], rps: [], p99: [], timestamps: [] };

export const useTelemetryStore = create<TelemetryState>((set) => ({
  latest: null,
  history: EMPTY_HISTORY,
  dvr: { isActive: false, data: [], currentIndex: 0 },
  incidentReport: null, // Initial state
  
  updateTelemetry: (data) => set((state) => {
    if (state.dvr.isActive) return {}; 

    const h = state.history;
    const timeString = new Date(data.timestamp).toLocaleTimeString();

    return { 
      latest: data, 
      history: {
        cpuPercent: [...h.cpuPercent.slice(-(MAX_HISTORY - 1)), data.timeSeries.cpuPercent],
        rss: [...h.rss.slice(-(MAX_HISTORY - 1)), data.timeSeries.rss],
        heapUsed: [...h.heapUsed.slice(-(MAX_HISTORY - 1)), data.timeSeries.heapUsed],
        eventLoop: [...h.eventLoop.slice(-(MAX_HISTORY - 1)), data.timeSeries.eventLoopLag],
        rps: [...h.rps.slice(-(MAX_HISTORY - 1)), data.timeSeries.rps],
        p99: [...h.p99.slice(-(MAX_HISTORY - 1)), data.timeSeries.p99Latency],
        timestamps: [...h.timestamps.slice(-(MAX_HISTORY - 1)), timeString]
      } 
    };
  }),

  clearHistory: () => set({ history: EMPTY_HISTORY }),

  startDvr: (data) => set({ dvr: { isActive: true, data, currentIndex: data.length - 1 } }),
  setDvrIndex: (index) => set((state) => ({ dvr: { ...state.dvr, currentIndex: index } })),
  stopDvr: () => set({ dvr: { isActive: false, data: [], currentIndex: 0 } }),

  setIncidentReport: (report) => set({ incidentReport: report }),
  clearIncidentReport: () => set({ incidentReport: null })
}));