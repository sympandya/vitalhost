import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { generateSimulatedMetrics, setWsClientCount } from '../services/simulation.js';

export const initializeWebSocket = (server: Server) => {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws: WebSocket) => {
    console.log(`[WebSocket] Client connected. Total clients: ${wss.clients.size}`);
    setWsClientCount(wss.clients.size);
    
    ws.on('close', () => {
      console.log(`[WebSocket] Client disconnected. Total clients: ${wss.clients.size}`);
      setWsClientCount(wss.clients.size);
    });
  });

  // The 1Hz Broadcaster Loop
  setInterval(() => {
    if (wss.clients.size === 0) return; // Save CPU if nobody is looking

    const payload = JSON.stringify(generateSimulatedMetrics());
    
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }, 1000);
};