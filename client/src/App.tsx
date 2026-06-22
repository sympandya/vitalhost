// client/src/App.tsx
import { useEffect, useState } from 'react';
import { useTelemetryStore } from './store/useTelemetryStore';
import { DashboardHeader } from './components/DashboardHeader';
import { TimeSeriesGrid } from './components/TimeSeriesGrid';
import { DeepTelemetryGrid } from './components/DeepTelemetryGrid';
import { IncidentModal } from './components/ui/IncidentModal';

function App() {
  const { latest, updateTelemetry, setIncidentReport } = useTelemetryStore();
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');

  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    const connect = () => {
      ws = new WebSocket('ws://localhost:3000');
      ws.onopen = () => setConnectionStatus('🟢 Live (1Hz)');
      
      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        
        if (message.type === 'TELEMETRY') {
          updateTelemetry(message.data);
        } 
        else if (message.timeSeries) {
          updateTelemetry(message); // Fallback for raw data
        } 
        else if (message.type === 'AI_INCIDENT_START') {
          setIncidentReport({
             trigger: message.data.trigger,
             analysis: "Analyzing system logs... please wait.",
             timestamp: message.data.timestamp
          });
        }
        else if (message.type === 'AI_INCIDENT_REPORT') {
          setIncidentReport(message.data);
        }
      };
      
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
        if (ws.readyState === 1) {
          ws.close();
        }
      }
    };
  }, [updateTelemetry, setIncidentReport]);

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6 font-mono">
      <IncidentModal />
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