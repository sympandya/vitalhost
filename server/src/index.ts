// server/src/index.ts
import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

// Services
import { getLiveMetrics, liveNetworkState, resetNetworkCounters } from './services/agent.js';
import { generateSimulatedMetrics, triggerChaos, setWsClientCount } from './services/simulation.js';
import { ingestLog, generateSimulatedLogs } from './services/logger.js';
import { analyzeSystemAnomaly } from './services/ai.js';

// Database & Types
import { initDB, flushTelemetryToDB, cleanOldData, getHistoricalTelemetry } from './db/index.db.js';
import type { TelemetryPayload } from './types/index.types.js';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, 
  max: 100, 
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', apiLimiter);

// --- GLOBAL STATE ---
let currentMode: 'simulation' | 'live' = 'simulation';
let responseTimes: number[] = [];
let telemetryBuffer: TelemetryPayload[] = [];

// Initialize Database
initDB().then(() => {
  cleanOldData(); 
}).catch(console.error);

// ==========================================
// 1. HTTP MIDDLEWARE & ENDPOINTS
// ==========================================
app.use((req, res, next) => {
  const start = process.hrtime();
  liveNetworkState.httpConnections++;
  liveNetworkState.rps++;

  res.on('finish', () => {
    liveNetworkState.httpConnections--;
    if (res.statusCode >= 400 && res.statusCode < 500) liveNetworkState.error4xx++;
    if (res.statusCode >= 500) liveNetworkState.error5xx++;

    const diff = process.hrtime(start);
    const timeMs = (diff[0] * 1e3) + (diff[1] * 1e-6);
    responseTimes.push(timeMs);
  });
  next();
});

app.post('/api/mode', (req, res) => {
  const { mode } = req.body;
  if (mode === 'simulation' || mode === 'live') {
    currentMode = mode;
    console.log(`[VitalHost] Switched to ${mode.toUpperCase()} mode.`);
    res.json({ success: true, mode });
  } else {
    res.status(400).json({ error: 'Invalid mode' });
  }
});

app.post('/api/chaos', (req, res) => {
  if (currentMode === 'live') {
    return res.status(403).json({ error: 'Chaos engineering is disabled in LIVE mode.' });
  }
  triggerChaos(req.body.mode);
  res.json({ success: true });
});

app.get('/api/history', async (req, res) => {
  const hours = parseFloat(req.query.hours as string) || 24; 
  const endTime = req.query.endTime as string; 
  
  try {
    const history = await getHistoricalTelemetry(hours, endTime);
    res.json({ success: true, count: history.length, data: history });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve historical telemetry' });
  }
});

// ==========================================
// 2. WEBSOCKET SETUP
// ==========================================
wss.on('connection', (ws) => {
  liveNetworkState.wsClients = wss.clients.size;
  setWsClientCount(wss.clients.size);
  ws.on('close', () => {
    liveNetworkState.wsClients = wss.clients.size;
    setWsClientCount(wss.clients.size);
  });
});

// ==========================================
// 3. BACKGROUND WORKERS
// ==========================================
setInterval(() => {
  if (responseTimes.length > 0) {
    responseTimes.sort((a, b) => a - b);
    const p99Index = Math.floor(responseTimes.length * 0.99);
    liveNetworkState.p99 = responseTimes[p99Index] || 0;
    responseTimes = []; 
  } else {
    liveNetworkState.p99 = 0;
  }
  resetNetworkCounters();
}, 1000);

setInterval(() => {
  if (telemetryBuffer.length > 0) {
    const bufferToFlush = [...telemetryBuffer];
    telemetryBuffer = []; 
    flushTelemetryToDB(bufferToFlush, 'live'); 
  }
}, 5000);

setInterval(() => { cleanOldData(); }, 60 * 60 * 1000); 

setInterval(() => {
  const livePayload = getLiveMetrics();
  telemetryBuffer.push(livePayload);
  const uiPayload = currentMode === 'live' ? livePayload : generateSimulatedMetrics();
  
  // Send Telemetry
  const payloadString = JSON.stringify({ type: 'TELEMETRY', data: uiPayload });
  wss.clients.forEach((client) => {
    if (client.readyState === 1) client.send(payloadString);
  });

  // AI Trigger
  const currentCpu = uiPayload.timeSeries.cpuPercent;
  if (currentMode === 'simulation' && currentCpu > 80) {
    analyzeSystemAnomaly(currentCpu, 'simulation', (aiMessage) => {
      const aiPayloadString = JSON.stringify(aiMessage);
      wss.clients.forEach((client) => {
        if (client.readyState === 1) client.send(aiPayloadString);
      });
    });
  }

  // Logs
  if (currentMode === 'simulation') {
    generateSimulatedLogs(uiPayload.timeSeries.cpuPercent, uiPayload.timeSeries.rps);
  } else {
    if (livePayload.timeSeries.cpuPercent > 80) ingestLog('WARN', `Live CPU spiked to ${livePayload.timeSeries.cpuPercent}%`);
    if (livePayload.network.error5xxRate > 0) ingestLog('ERROR', `Live 5xx errors detected: ${livePayload.network.error5xxRate}/s`);
  }
}, 1000);

// ==========================================
// BOOT & SHUTDOWN
// ==========================================
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`[VitalHost Engine] Running on port ${PORT}`);
});

const emergencyShutdown = async (reason: string, error?: Error) => {
  if (error) console.error(`[FATAL] ${reason}:`, error);
  else console.log(`\n[SHUTDOWN] ${reason} received.`);

  if (telemetryBuffer.length > 0) {
    try {
      await flushTelemetryToDB([...telemetryBuffer], 'live');
    } catch (dbErr) {
      console.error('[SHUTDOWN] Failed to flush final buffer:', dbErr);
    }
  }
  process.exit(error ? 1 : 0);
};

process.on('uncaughtException', (err) => emergencyShutdown('uncaughtException', err));
process.on('unhandledRejection', (reason: any) => emergencyShutdown('unhandledRejection', reason));
process.on('SIGINT', () => emergencyShutdown('SIGINT'));
process.on('SIGTERM', () => emergencyShutdown('SIGTERM'));