import { useTelemetryStore } from '../store/useTelemetryStore';
import { TelemetryChart } from './charts/TelemetryChart';
import { formatMB } from '../utils/formatters';

export function TimeSeriesGrid() {
  const { latest, history } = useTelemetryStore();

  if (!latest) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      <div className="bg-neutral-900 p-5 rounded-lg border border-neutral-800">
        <div className="flex justify-between mb-4"><h2 className="text-neutral-400">CPU Usage (%)</h2><span className="text-xl text-green-400">{latest.timeSeries.cpuPercent}%</span></div>
        <TelemetryChart title="CPU %" labels={history.timestamps} dataPoints={history.cpuPercent} borderColor="#4ade80" backgroundColor="rgba(74, 222, 128, 0.1)" yAxisMax={100} />
      </div>

      <div className="bg-neutral-900 p-5 rounded-lg border border-neutral-800">
        <div className="flex justify-between mb-4"><h2 className="text-neutral-400">RSS Memory (MB)</h2><span className="text-xl text-blue-400">{formatMB(latest.timeSeries.rss)}</span></div>
        <TelemetryChart title="RSS (MB)" labels={history.timestamps} dataPoints={history.rss.map(b => Number(formatMB(b)))} borderColor="#60a5fa" backgroundColor="rgba(96, 165, 250, 0.1)" />
      </div>

      <div className="bg-neutral-900 p-5 rounded-lg border border-neutral-800">
        <div className="flex justify-between mb-4"><h2 className="text-neutral-400">V8 Heap Used (MB)</h2><span className="text-xl text-teal-400">{formatMB(latest.timeSeries.heapUsed)}</span></div>
        <TelemetryChart title="Heap (MB)" labels={history.timestamps} dataPoints={history.heapUsed.map(b => Number(formatMB(b)))} borderColor="#2dd4bf" backgroundColor="rgba(45, 212, 191, 0.1)" />
      </div>

      <div className="bg-neutral-900 p-5 rounded-lg border border-neutral-800">
        <div className="flex justify-between mb-4"><h2 className="text-neutral-400">Event Loop Lag (ms)</h2><span className="text-xl text-purple-400">{latest.timeSeries.eventLoopLag}</span></div>
        <TelemetryChart title="Event Loop" labels={history.timestamps} dataPoints={history.eventLoop} borderColor="#c084fc" backgroundColor="rgba(192, 132, 252, 0.1)" />
      </div>

      <div className="bg-neutral-900 p-5 rounded-lg border border-neutral-800">
        <div className="flex justify-between mb-4"><h2 className="text-neutral-400">Network Traffic (RPS)</h2><span className="text-xl text-orange-400">{latest.timeSeries.rps}</span></div>
        <TelemetryChart title="RPS" labels={history.timestamps} dataPoints={history.rps} borderColor="#fb923c" backgroundColor="rgba(251, 146, 60, 0.1)" />
      </div>

      <div className="bg-neutral-900 p-5 rounded-lg border border-neutral-800">
        <div className="flex justify-between mb-4"><h2 className="text-neutral-400">HTTP P99 Latency (ms)</h2><span className="text-xl text-rose-400">{latest.timeSeries.p99Latency}</span></div>
        <TelemetryChart title="P99 (ms)" labels={history.timestamps} dataPoints={history.p99} borderColor="#f43f5e" backgroundColor="rgba(244, 63, 94, 0.1)" />
      </div>
    </div>
  );
}