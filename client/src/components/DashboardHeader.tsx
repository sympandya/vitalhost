// src/components/DashboardHeader.tsx
import { useState } from 'react';
import { useTelemetryStore } from '../store/useTelemetryStore';

export function DashboardHeader({ connectionStatus }: { connectionStatus: string }) {
  const latest = useTelemetryStore((state) => state.latest);
  const clearHistory = useTelemetryStore((state) => state.clearHistory);
  const [mode, setMode] = useState<'simulation' | 'live'>('simulation');

  const triggerChaos = async (chaosMode: string) => {
    try {
      await fetch('http://localhost:3000/api/chaos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: chaosMode })
      });
    } catch (err) {
      console.error('Failed to trigger chaos:', err);
    }
  };

  const toggleMode = async (newMode: 'simulation' | 'live') => {
    setMode(newMode);
    clearHistory();
    
    // We will build this backend endpoint in the next step!
    try {
      await fetch('http://localhost:3000/api/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: newMode })
      });
    } catch (err) {
      console.error('Failed to switch mode:', err);
    }
  };

  return (
    <div className="flex justify-between items-center mb-6 border-b border-neutral-800 pb-4">
      
      {/* LEFT: Title & Identity */}
      <div className="flex-1">
        <h1 className="text-2xl font-bold tracking-tight">VitalHost SRE</h1>
        <div className="flex gap-4 mt-2 text-xs text-neutral-500">
          <span>PID: {latest?.identity.pid || '---'}</span>
          <span>Node: {latest?.identity.nodeVersion || '---'}</span>
          <span>Uptime: {latest?.identity.processUptime || 0}s</span>
        </div>
      </div>
      
      {/* CENTER: The Mode Toggle (Where your pink circle was) */}
      <div className="flex-none flex bg-neutral-900 rounded-md border border-neutral-800 p-1">
        <button
          onClick={() => toggleMode('simulation')}
          className={`px-4 py-1.5 text-xs font-medium rounded-sm transition ${mode === 'simulation' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}`}
        >
          Simulation Mode
        </button>
        <button
          onClick={() => toggleMode('live')}
          className={`px-4 py-1.5 text-xs font-medium rounded-sm transition ${mode === 'live' ? 'bg-emerald-900/20 text-emerald-400 shadow-sm border border-emerald-800/50' : 'text-neutral-500 hover:text-neutral-300'}`}
        >
          Live Mode
        </button>
      </div>

      {/* RIGHT: Controls & Status */}
      <div className="flex-1 flex justify-end items-center gap-4">
        {mode === 'simulation' && (
          <div className="flex gap-2 bg-neutral-900 p-1 rounded-md border border-neutral-800">
            <button onClick={() => triggerChaos('none')} className="px-3 py-1 text-xs hover:bg-neutral-800 rounded transition">Normal</button>
            <button onClick={() => triggerChaos('cpu_spike')} className="px-3 py-1 text-xs text-red-400 hover:bg-red-950/30 rounded transition">CPU Spike</button>
            <button onClick={() => triggerChaos('memory_leak')} className="px-3 py-1 text-xs text-blue-400 hover:bg-blue-950/30 rounded transition">Mem Leak</button>
            <button onClick={() => triggerChaos('high_traffic')} className="px-3 py-1 text-xs text-orange-400 hover:bg-orange-950/30 rounded transition">Traffic Surge</button>
          </div>
        )}
        <span className="text-sm bg-neutral-900 px-3 py-1 rounded-full border border-neutral-700">
          {connectionStatus}
        </span>
      </div>
    </div>
  );
}