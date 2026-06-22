// server/src/websockets/broadcaster.ts
import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { generateSimulatedMetrics, setWsClientCount } from '../services/simulation.js';
import { analyzeSystemAnomaly } from '../services/ai.js';

export const initializeWebSocket = (server: Server) => {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws: WebSocket) => {
    console.log(`[WebSocket] Client connected. Total clients: ${wss.clients.size}`);
    setWsClientCount(wss.clients.size);
    
    ws.on('close', () => {
      setWsClientCount(wss.clients.size);
    });
  });

  setInterval(() => {
    if (wss.clients.size === 0) return;

    console.log(`[Sanity Check] Tick. Current CPU is: ${generateSimulatedMetrics().timeSeries.cpuPercent}`);

    // 1. Generate the metrics
    const metrics = generateSimulatedMetrics();
    const currentCpu = metrics.timeSeries.cpuPercent;

    // 2. CHECK AI TRIGGER: Pass the AI a strict callback function to reach the clients
    if (currentCpu > 80) {
      console.log('💥 BRUTE FORCING DUMMY TICKET TO FRONTEND...');
      const dummyPayload = JSON.stringify({
        type: 'AI_INCIDENT_REPORT',
        data: { 
          trigger: 'HARDCODE TEST', 
          analysis: 'If this alert pops, the WebSockets are perfect and Gemini is broken.', 
          timestamp: 'NOW' 
        }
      });
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(dummyPayload);
        }
      });
    }

    // 3. Send standard 1Hz telemetry
    const payload = JSON.stringify({
      type: 'TELEMETRY',
      data: metrics
    });
    
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }, 1000);
};