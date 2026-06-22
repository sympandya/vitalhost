// src/components/TimeSeriesGrid.tsx
import { useMemo } from 'react';
import { useTelemetryStore } from '../store/useTelemetryStore';
import { TelemetryChart } from './charts/TelemetryChart';
import { formatMB } from '../utils/formatters';

export function TimeSeriesGrid() {
  const { latest, history, dvr } = useTelemetryStore();

  // The Magic Switch: Use the current DVR frame, or the live WebSocket payload
  const displayData = dvr.isActive ? dvr.data[dvr.currentIndex] : latest;

  // The Magic Chart Builder: Reconstructs the 60-second array for the charts based on where you drag the slider
    const displayHistory = useMemo(() => {
        if (!dvr.isActive) return history;
        
        // CRITICAL FIX: Draw the entire timeline from the start up to the scrubber's current position.
        // This creates a "revealing" effect as you drag the slider right.
        const slice = dvr.data.slice(0, dvr.currentIndex + 1);
        
        return {
        cpuPercent: slice.map(d => d.timeSeries.cpuPercent),
        rss: slice.map(d => d.timeSeries.rss),
        heapUsed: slice.map(d => d.timeSeries.heapUsed),
        eventLoop: slice.map(d => d.timeSeries.eventLoopLag),
        rps: slice.map(d => d.timeSeries.rps),
        p99: slice.map(d => d.timeSeries.p99Latency),
        timestamps: slice.map(d => new Date(d.timestamp).toLocaleTimeString())
        };
    }, [history, dvr]);

  if (!displayData) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      <div className="bg-neutral-900 p-5 rounded-lg border border-neutral-800">
        <div className="flex justify-between mb-4"><h2 className="text-neutral-400">CPU Usage (%)</h2><span className="text-xl text-green-400">{displayData.timeSeries.cpuPercent}%</span></div>
        <TelemetryChart title="CPU %" labels={displayHistory.timestamps} dataPoints={displayHistory.cpuPercent} borderColor="#4ade80" backgroundColor="rgba(74, 222, 128, 0.1)" yAxisMax={100} />
      </div>
      <div className="bg-neutral-900 p-5 rounded-lg border border-neutral-800">
        <div className="flex justify-between mb-4"><h2 className="text-neutral-400">RSS Memory (MB)</h2><span className="text-xl text-blue-400">{formatMB(displayData.timeSeries.rss)}</span></div>
        <TelemetryChart title="RSS (MB)" labels={displayHistory.timestamps} dataPoints={displayHistory.rss.map(b => Number(formatMB(b)))} borderColor="#60a5fa" backgroundColor="rgba(96, 165, 250, 0.1)" />
      </div>
      <div className="bg-neutral-900 p-5 rounded-lg border border-neutral-800">
        <div className="flex justify-between mb-4"><h2 className="text-neutral-400">V8 Heap Used (MB)</h2><span className="text-xl text-teal-400">{formatMB(displayData.timeSeries.heapUsed)}</span></div>
        <TelemetryChart title="Heap (MB)" labels={displayHistory.timestamps} dataPoints={displayHistory.heapUsed.map(b => Number(formatMB(b)))} borderColor="#2dd4bf" backgroundColor="rgba(45, 212, 191, 0.1)" />
      </div>
      <div className="bg-neutral-900 p-5 rounded-lg border border-neutral-800">
        <div className="flex justify-between mb-4"><h2 className="text-neutral-400">Event Loop Lag (ms)</h2><span className="text-xl text-purple-400">{displayData.timeSeries.eventLoopLag}</span></div>
        <TelemetryChart title="Event Loop" labels={displayHistory.timestamps} dataPoints={displayHistory.eventLoop} borderColor="#c084fc" backgroundColor="rgba(192, 132, 252, 0.1)" />
      </div>
      <div className="bg-neutral-900 p-5 rounded-lg border border-neutral-800">
        <div className="flex justify-between mb-4"><h2 className="text-neutral-400">Network Traffic (RPS)</h2><span className="text-xl text-orange-400">{displayData.timeSeries.rps}</span></div>
        <TelemetryChart title="RPS" labels={displayHistory.timestamps} dataPoints={displayHistory.rps} borderColor="#fb923c" backgroundColor="rgba(251, 146, 60, 0.1)" />
      </div>
      <div className="bg-neutral-900 p-5 rounded-lg border border-neutral-800">
        <div className="flex justify-between mb-4"><h2 className="text-neutral-400">HTTP P99 Latency (ms)</h2><span className="text-xl text-rose-400">{displayData.timeSeries.p99Latency}</span></div>
        <TelemetryChart title="P99 (ms)" labels={displayHistory.timestamps} dataPoints={displayHistory.p99} borderColor="#f43f5e" backgroundColor="rgba(244, 63, 94, 0.1)" />
      </div>
    </div>
  );
}