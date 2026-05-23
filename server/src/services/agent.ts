// server/src/services/agent.ts
import os from 'os';
import v8 from 'v8';
import { monitorEventLoopDelay } from 'perf_hooks';
import type { TelemetryPayload } from '../types/index.types.js';

// Native Event Loop Monitor (Captures exact nanosecond delays)
const eld = monitorEventLoopDelay({ resolution: 10 });
eld.enable();

// CPU Calculation State
let lastCpuTime = process.cpuUsage();
let lastHrTime = process.hrtime();

// Network State (We will feed this from Express middleware in the next step)
export const liveNetworkState = {
  rps: 0,
  p99: 0,
  httpConnections: 0,
  error4xx: 0,
  error5xx: 0,
  wsClients: 0
};

// Resets per-second counters
export const resetNetworkCounters = () => {
  liveNetworkState.rps = 0;
  liveNetworkState.error4xx = 0;
  liveNetworkState.error5xx = 0;
};

export const getLiveMetrics = (): TelemetryPayload => {
  // 1. DIFFERENTIAL CPU MATH
  const currentCpuTime = process.cpuUsage();
  const currentHrTime = process.hrtime();
  
  const userDiff = currentCpuTime.user - lastCpuTime.user;
  const sysDiff = currentCpuTime.system - lastCpuTime.system;
  
  // Calculate total elapsed wall-clock time in microseconds
  const timeDiff = (currentHrTime[0] - lastHrTime[0]) * 1000000 + (currentHrTime[1] - lastHrTime[1]) / 1000;
  
  // CPU % = (Total CPU microseconds spent / Total microseconds elapsed) * 100
  let cpuPercent = ((userDiff + sysDiff) / timeDiff) * 100;
  
  // Update state for the next tick
  lastCpuTime = currentCpuTime;
  lastHrTime = currentHrTime;

  // 2. V8 & MEMORY EXTRACTION
  const memUsage = process.memoryUsage();
  const v8Stats = v8.getHeapStatistics();

  // 3. EVENT LOOP (Convert nanoseconds to ms)
  const lagMs = eld.percentile(99) / 1e6; 

  return {
    timeSeries: {
      cpuUsage: { user: currentCpuTime.user, system: currentCpuTime.system },
      cpuPercent: parseFloat(Math.max(0, cpuPercent).toFixed(1)), // Clamp to 0 to avoid -0 bugs
      rss: memUsage.rss,
      heapUsed: memUsage.heapUsed,
      eventLoopLag: parseFloat(lagMs.toFixed(2)),
      rps: liveNetworkState.rps,
      p99Latency: parseFloat(liveNetworkState.p99.toFixed(2))
    },
    v8: {
      heapTotal: v8Stats.total_heap_size,
      heapLimit: v8Stats.heap_size_limit,
      physicalSize: v8Stats.total_physical_size,
      availableSize: v8Stats.total_available_size
    },
    os: {
      loadAvg: os.loadavg().map(n => parseFloat(n.toFixed(2))),
      totalMem: os.totalmem(),
      freeMem: os.freemem()
    },
    network: {
      wsClients: liveNetworkState.wsClients,
      httpConnections: liveNetworkState.httpConnections,
      error4xxRate: liveNetworkState.error4xx,
      error5xxRate: liveNetworkState.error5xx
    },
    identity: {
      processUptime: parseFloat(process.uptime().toFixed(1)),
      systemUptime: parseFloat(os.uptime().toFixed(1)),
      nodeVersion: process.version,
      pid: process.pid
    },
    timestamp: new Date().toISOString()
  };
};