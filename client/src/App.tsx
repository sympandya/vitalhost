// src/App.tsx
import { useEffect, useState } from 'react';
import { useTelemetryStore } from './store/useTelemetryStore';
import { DashboardHeader } from './components/DashboardHeader';
import { TimeSeriesGrid } from './components/TimeSeriesGrid';
import { DeepTelemetryGrid } from './components/DeepTelemetryGrid';

function App() {
  const { latest, updateTelemetry } = useTelemetryStore();
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');

  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    const connect = () => {
      ws = new WebSocket('ws://localhost:3000');
      ws.onopen = () => setConnectionStatus('🟢 Live (1Hz)');
      ws.onmessage = (event) => updateTelemetry(JSON.parse(event.data));
      ws.onclose = () => {
        setConnectionStatus('🔴 Offline - Retrying...');
        reconnectTimer = setTimeout(connect, 3000);
      };
      ws.onerror = () => {
        setConnectionStatus('⚠️ Error');
        ws.close();
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      if (ws) {
        ws.onclose = null;
        // Only close if it is fully connected (readyState 1)
        if (ws.readyState === 1) {
          ws.close();
        }
      }
    };
  }, [updateTelemetry]);

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6 font-mono">
      <DashboardHeader connectionStatus={connectionStatus} />

      {!latest ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-neutral-500 animate-pulse">Awaiting telemetry...</p>
        </div>
      ) : (
        <div className="space-y-8 pb-12">
          <TimeSeriesGrid />
          <DeepTelemetryGrid />
        </div>
      )}
    </div>
  );
}

export default App;