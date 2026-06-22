const MAX_LOG_HISTORY = 200; 
export const systemLogs: string[] = [];

export const ingestLog = (level: 'INFO' | 'WARN' | 'ERROR', message: string) => {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] [${level}] ${message}`;
  
  systemLogs.push(logLine);
  
  if (systemLogs.length > MAX_LOG_HISTORY) {
    systemLogs.shift();
  }
};

// Generate background noise for Simulation Mode
export const generateSimulatedLogs = (cpu: number, rps: number) => {
  if (Math.random() > 0.7) ingestLog('INFO', `Handled ${rps} incoming HTTP requests successfully.`);
  if (cpu > 80) ingestLog('WARN', `High CPU load detected: ${cpu}% - V8 Garbage Collector working overtime.`);
  if (rps > 800) ingestLog('ERROR', `Connection pool maxed out. Dropping incoming packets.`);
};