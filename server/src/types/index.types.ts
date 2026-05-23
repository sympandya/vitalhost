export type ChaosMode = 'none' | 'cpu_spike' | 'memory_leak' | 'high_traffic';

export interface TelemetryPayload {
  timeSeries: {
    cpuUsage: { user: number; system: number };
    cpuPercent: number;
    rss: number;
    heapUsed: number;
    eventLoopLag: number;
    rps: number;
    p99Latency: number;
  };
  v8: {
    heapTotal: number;
    heapLimit: number;
    physicalSize: number;
    availableSize: number;
  };
  os: {
    loadAvg: number[];
    totalMem: number;
    freeMem: number;
  };
  network: {
    wsClients: number;
    httpConnections: number;
    error4xxRate: number;
    error5xxRate: number;
  };
  identity: {
    processUptime: number;
    systemUptime: number;
    nodeVersion: string;
    pid: number;
  };
  timestamp: string;
}