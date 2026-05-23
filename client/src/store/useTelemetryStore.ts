import { create } from 'zustand';
import type { TelemetryPayload } from '../types/telemetry';

interface TelemetryState {
  latest: TelemetryPayload | null;
  history: {
    cpuPercent: number[];
    rss: number[];
    heapUsed: number[];
    eventLoop: number[];
    rps: number[];
    p99: number[];
    timestamps: string[];
  };
  updateTelemetry: (data: TelemetryPayload) => void;
  clearHistory: () => void; // <--- ADDED THIS
}

const MAX_HISTORY = 60; 

const EMPTY_HISTORY = { cpuPercent: [], rss: [], heapUsed: [], eventLoop: [], rps: [], p99: [], timestamps: [] };

export const useTelemetryStore = create<TelemetryState>((set) => ({
  latest: null,
  history: EMPTY_HISTORY,
  
  updateTelemetry: (data) => set((state) => {
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

  // <--- ADDED THIS FUNCTION
  clearHistory: () => set({ history: EMPTY_HISTORY }),
}));