// server/src/services/simulation.ts
import type { ChaosMode, TelemetryPayload } from '../types/index.types.js';

const TOTAL_MEM_BYTES = 16 * 1024 * 1024 * 1024; 
const V8_HEAP_LIMIT = 2 * 1024 * 1024 * 1024;    
const PID = process.pid;
const NODE_VERSION = process.version;
const START_TIME = Date.now();
const SYSTEM_START_TIME = START_TIME - (30 * 24 * 60 * 60 * 1000); 

let lastCpuUserUs = 500000; 
let lastCpuSystemUs = 100000;
let currentRss = 120 * 1024 * 1024; 
let currentHeapUsed = 60 * 1024 * 1024; 
let currentEventLoopLag = 1.2; 
let currentRps = 45;
let currentP99 = 25; 
let currentHttpConns = 120;
let currentWsClients = 0; 

let activeChaos: ChaosMode = 'none';
let chaosTimer: NodeJS.Timeout | null = null; 

export const triggerChaos = (mode: ChaosMode) => {
  console.log(`[Chaos] Triggered: ${mode}`);
  activeChaos = mode;

  if (chaosTimer) clearTimeout(chaosTimer);
  if (mode !== 'none') {
    chaosTimer = setTimeout(() => {
      console.log(`[Chaos] Auto-recovering back to normal.`);
      activeChaos = 'none';
    }, 15000);
  }
};

export const setWsClientCount = (count: number) => {
  currentWsClients = count;
};

const drift = (val: number, min: number, max: number, maxVariance: number) => {
  if (activeChaos === 'none' && val > max) return val - (maxVariance * 2);
  const variance = (Math.random() - 0.5) * 2 * maxVariance;
  let newVal = val + variance;
  if (newVal > max) newVal = max - (Math.random() * maxVariance);
  if (newVal < min) newVal = min + (Math.random() * maxVariance);
  return newVal;
};

export const generateSimulatedMetrics = (): TelemetryPayload => {
  const now = Date.now();
  
  // 1. BASELINE DRIFT (Always calculate a healthy baseline first)
  let cpuLoadTarget = drift(0.15, 0.05, 0.35, 0.1); 
  currentHeapUsed = drift(currentHeapUsed, 50 * 1024 * 1024, 150 * 1024 * 1024, 5 * 1024 * 1024);
  currentEventLoopLag = drift(currentEventLoopLag, 0.5, 5, 1);
  currentRps = drift(currentRps, 30, 80, 10);
  currentP99 = drift(currentP99, 15, 60, 5);
  currentHttpConns = drift(currentHttpConns, 50, 150, 10);

  // 2. THE BUTTERFLY EFFECT (Chaos interconnectivity)
  if (activeChaos === 'memory_leak') {
    currentHeapUsed += (12 * 1024 * 1024) + (Math.random() * 5 * 1024 * 1024);
    // GC Panic: CPU works harder to clean up the leak, event loop stutters
    cpuLoadTarget = drift(0.45, 0.35, 0.60, 0.1);
    currentEventLoopLag = drift(currentEventLoopLag + 5, 5, 25, 2);
    
  } else if (activeChaos === 'cpu_spike') {
    cpuLoadTarget = drift(0.95, 0.85, 0.99, 0.10); 
    currentEventLoopLag = drift(currentEventLoopLag, 150, 500, 100); 
    // Blocked Thread: If the event loop lags by 500ms, P99 latency MUST mirror it
    currentP99 = currentEventLoopLag + drift(50, 20, 100, 10);
    
  } else if (activeChaos === 'high_traffic') {
    currentRps = drift(currentRps, 500, 1200, 150); 
    currentHttpConns = drift(currentHttpConns, 400, 800, 50);
    currentP99 = drift(currentP99, 150, 600, 100); 
    // Processing Cost: 1200 RPS requires heavy CPU and Memory allocations
    cpuLoadTarget = drift(0.75, 0.60, 0.85, 0.1);
    currentHeapUsed += (8 * 1024 * 1024); 
  }

  // 3. DEPENDENT HARDWARE CALCS
  currentRss = currentHeapUsed + (40 * 1024 * 1024); // RSS always trails Heap
  // OS Load relies heavily on Node's CPU consumption
  const osLoad1m = (cpuLoadTarget * 6) + drift(0.5, 0.1, 1.2, 0.2); 

  let totalUsConsumed = 1000000 * cpuLoadTarget;
  lastCpuUserUs += totalUsConsumed * 0.8;   
  lastCpuSystemUs += totalUsConsumed * 0.2; 

  const heapTotal = currentHeapUsed * 1.3; 

  return {
    timeSeries: {
      cpuUsage: { user: Math.round(lastCpuUserUs), system: Math.round(lastCpuSystemUs) }, 
      cpuPercent: parseFloat((cpuLoadTarget * 100).toFixed(1)), 
      rss: Math.round(currentRss), 
      heapUsed: Math.round(currentHeapUsed), 
      eventLoopLag: parseFloat(currentEventLoopLag.toFixed(2)), 
      rps: Math.round(currentRps), 
      p99Latency: parseFloat(currentP99.toFixed(2)), 
    },
    v8: {
      heapTotal: Math.round(heapTotal), 
      heapLimit: V8_HEAP_LIMIT, 
      physicalSize: Math.round(heapTotal * 0.9), 
      availableSize: V8_HEAP_LIMIT - currentHeapUsed, 
    },
    os: {
      loadAvg: [parseFloat(osLoad1m.toFixed(2)), parseFloat((osLoad1m * 0.8).toFixed(2)), parseFloat((osLoad1m * 0.6).toFixed(2))], 
      totalMem: TOTAL_MEM_BYTES, 
      freeMem: TOTAL_MEM_BYTES - (currentRss + (2 * 1024 * 1024 * 1024)), 
    },
    network: {
      wsClients: currentWsClients,
      httpConnections: Math.round(currentHttpConns),
      error4xxRate: activeChaos === 'high_traffic' ? drift(12, 5, 20, 2) : drift(0.5, 0, 2, 0.1),
      error5xxRate: (activeChaos === 'high_traffic' || activeChaos === 'cpu_spike') ? drift(25, 10, 50, 5) : 0,
    },
    identity: {
      processUptime: parseFloat(((now - START_TIME) / 1000).toFixed(1)),
      systemUptime: parseFloat(((now - SYSTEM_START_TIME) / 1000).toFixed(1)),
      nodeVersion: NODE_VERSION,
      pid: PID
    },
    timestamp: new Date().toISOString()
  };
};