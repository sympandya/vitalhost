// server/src/index.ts
import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import { getLiveMetrics, liveNetworkState, resetNetworkCounters } from './services/agent.js';
import { generateSimulatedMetrics, triggerChaos, setWsClientCount } from './services/simulation.js';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

// The Global Switch
let currentMode: 'simulation' | 'live' = 'simulation';
let responseTimes: number[] = [];

// --- MIDDLEWARE: LIVE NETWORK SENSOR ---
// Every single HTTP request passes through here. We track it, time it, and categorize it.
app.use((req, res, next) => {
  const start = process.hrtime();
  
  // Increment active connections and total RPS
  liveNetworkState.httpConnections++;
  liveNetworkState.rps++;

  // When the request finishes, record the stats
  res.on('finish', () => {
    liveNetworkState.httpConnections--;
    
    // Status Code Tracking
    if (res.statusCode >= 400 && res.statusCode < 500) liveNetworkState.error4xx++;
    if (res.statusCode >= 500) liveNetworkState.error5xx++;

    // Latency Tracking (convert nanoseconds to milliseconds)
    const diff = process.hrtime(start);
    const timeMs = (diff[0] * 1e3) + (diff[1] * 1e-6);
    responseTimes.push(timeMs);
  });
  
  next();
});

// The 1Hz Network Aggregator: Calculates P99 and resets the RPS counters every second
setInterval(() => {
  if (responseTimes.length > 0) {
    responseTimes.sort((a, b) => a - b);
    const p99Index = Math.floor(responseTimes.length * 0.99);
    liveNetworkState.p99 = responseTimes[p99Index] || 0;
    responseTimes = []; // Flush the array for the next second
  } else {
    liveNetworkState.p99 = 0;
  }
  resetNetworkCounters();
}, 1000);

// --- CONTROL ENDPOINTS ---

// The Mode Toggle
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

// The Chaos Controller
app.post('/api/chaos', (req, res) => {
  if (currentMode === 'live') {
    // Safety Net: You cannot fake a spike if you are reading real hardware.
    return res.status(403).json({ error: 'Chaos engineering is disabled in LIVE mode.' });
  }
  triggerChaos(req.body.mode);
  res.json({ success: true });
});

// --- WEBSOCKET BROADCASTER ---
wss.on('connection', (ws) => {
  // Sync the connection count to both engines
  liveNetworkState.wsClients = wss.clients.size;
  setWsClientCount(wss.clients.size);

  ws.on('close', () => {
    liveNetworkState.wsClients = wss.clients.size;
    setWsClientCount(wss.clients.size);
  });
});

// The 60FPS Heartbeat
setInterval(() => {
  // The crucial branch: Which data source are we using?
  const payload = currentMode === 'live' ? getLiveMetrics() : generateSimulatedMetrics();
  const payloadString = JSON.stringify(payload);
  
  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // 1 = WebSocket.OPEN
      client.send(payloadString);
    }
  });
}, 1000);

// Boot the Engine
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`[VitalHost Engine] Running on port ${PORT}`);
});