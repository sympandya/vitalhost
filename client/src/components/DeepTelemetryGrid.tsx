// src/components/DeepTelemetryGrid.tsx
import { useTelemetryStore } from '../store/useTelemetryStore';
import { MetricCard } from './ui/MetricCard';
import { formatMB, formatGB } from '../utils/formatters';

export function DeepTelemetryGrid() {
  const latest = useTelemetryStore((state) => state.latest);

  if (!latest) return null;

  return (
    <div className="space-y-8">
      <section className="border-t border-neutral-800 pt-8">
        <h2 className="text-lg font-semibold mb-4 text-neutral-300">V8 Garbage Collector & Memory</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard title="Total Heap Allocated" value={formatMB(latest.v8.heapTotal)} unit="MB" />
          <MetricCard title="Absolute Heap Limit" value={formatMB(latest.v8.heapLimit)} unit="MB" subtitle={
            <div className="w-full bg-neutral-950 rounded-full h-1.5 mt-2">
              <div className="bg-teal-500 h-1.5 rounded-full" style={{ width: `${(latest.timeSeries.heapUsed / latest.v8.heapLimit) * 100}%` }}></div>
            </div>
          } />
          <MetricCard title="Physical Memory Size" value={formatMB(latest.v8.physicalSize)} unit="MB" subtitle={<span className="text-xs text-neutral-500">Actual RAM occupied</span>} />
          <MetricCard title="Available to Allocate" value={formatMB(latest.v8.availableSize)} unit="MB" />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4 text-neutral-300">Host Machine Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard title="System Load (1m, 5m, 15m)" value={<span className="text-2xl tracking-tighter whitespace-nowrap">{latest.os.loadAvg.join(' / ')}</span>} />
          <MetricCard title="Free OS Memory" value={formatGB(latest.os.freeMem)} unit="GB" />
          <MetricCard title="Total OS Memory" value={formatGB(latest.os.totalMem)} unit="GB" subtitle={
            <div className="w-full bg-neutral-950 rounded-full h-1.5 mt-2">
              <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${((latest.os.totalMem - latest.os.freeMem) / latest.os.totalMem) * 100}%` }}></div>
            </div>
          }/>
          <MetricCard title="Server Uptime" value={(latest.identity.systemUptime / 3600).toFixed(1)} unit="Hours" />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4 text-neutral-300">Network Health & Sockets</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard title="Active HTTP Conns" value={latest.network.httpConnections} />
          <MetricCard title="Active WebSockets" value={latest.network.wsClients} />
          <MetricCard title="Client Errors (4xx)" value={latest.network.error4xxRate.toFixed(1)} unit="/sec" alert={latest.network.error4xxRate > 15} />
          <MetricCard title="Server Crashes (5xx)" value={latest.network.error5xxRate.toFixed(1)} unit="/sec" alert={latest.network.error5xxRate > 5} />
        </div>
      </section>
    </div>
  );
}