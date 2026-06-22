// src/components/DashboardHeader.tsx
import { useState } from 'react';
import { useTelemetryStore } from '../store/useTelemetryStore';

export function DashboardHeader({ connectionStatus }: { connectionStatus: string }) {
  const { latest, clearHistory, dvr, startDvr, setDvrIndex, stopDvr } = useTelemetryStore();
  const [mode, setMode] = useState<'simulation' | 'live' | 'dvr'>('simulation');
  const [isFetchingDvr, setIsFetchingDvr] = useState(false);
  const [activeDvrRes, setActiveDvrRes] = useState<'15m' | '1h' | '24h'>('1h');

  let anchorDisplayTime = 'Now';
  if (mode === 'dvr' && dvr.data.length > 0) {
    const scrubberTime = new Date(dvr.data[dvr.currentIndex].timestamp).getTime();
    const realTime = Date.now();

    if (realTime - scrubberTime > 120000) {
      anchorDisplayTime = new Date(scrubberTime).toLocaleTimeString();
    }
  }

  const triggerChaos = async (chaosMode: string) => {
    try {
      await fetch('https://vitalhost-api.onrender.com/api/chaos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: chaosMode }) });
    } catch (err) { console.error('Failed chaos:', err); }
  };

  const toggleMode = async (newMode: 'simulation' | 'live') => {
    if (mode === 'dvr') stopDvr(); 
    setMode(newMode);
    clearHistory();
    try {
      await fetch('https://vitalhost-api.onrender.com/api/mode', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: newMode }) });
    } catch (err) { console.error('Failed to switch mode:', err); }
  };

  const loadDvrData = async (hours: number, resLabel: '15m' | '1h' | '24h') => {
    setIsFetchingDvr(true);
    setActiveDvrRes(resLabel);
    
    let url = `https://vitalhost-api.onrender.com/api/history?hours=${hours}`;
    
    if (mode === 'dvr' && dvr.data.length > 0 && hours < 24) {
      const anchorTime = dvr.data[dvr.currentIndex].timestamp;
      url += `&endTime=${encodeURIComponent(anchorTime)}`;
    }

    try {
      const res = await fetch(url);
      const json = await res.json();
      
      if (json.data && json.data.length > 0) {
        const payloads = json.data.map((row: any) => row.payload);
        startDvr(payloads);
        setMode('dvr');
      } else {
        alert('Not enough historical data found for this time window.');
        if (mode !== 'dvr') stopDvr(); 
      }
    } catch (err) {
      console.error('Failed to fetch DVR data:', err);
    }
    setIsFetchingDvr(false);
  };

  const scrubberPercentage = mode === 'dvr' && dvr.data.length > 1
    ? (dvr.currentIndex / (dvr.data.length - 1)) * 100
    : 100;

  return (
    <>
      {/* LOADING OVERLAY */}
      {isFetchingDvr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(168,85,247,0.5)]"></div>
            <span className="mt-6 text-purple-400 font-mono font-bold tracking-widest animate-pulse">CALCULATING TIMELINE...</span>
          </div>
        </div>
      )}

      <div className="flex flex-col mb-6 border-b border-neutral-800 pb-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight">VitalHost SRE</h1>
            <div className="flex gap-4 mt-2 text-xs text-neutral-500">
              <span>PID: {latest?.identity.pid || '---'}</span>
              <span>Node: {latest?.identity.nodeVersion || '---'}</span>
            </div>
          </div>
          
          <div className="flex-none flex bg-neutral-900 rounded-md border border-neutral-800 p-1 items-center">
            <button onClick={() => toggleMode('simulation')} className={`px-4 py-1.5 text-xs font-medium rounded-sm transition ${mode === 'simulation' ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}>Simulation</button>
            <button onClick={() => toggleMode('live')} className={`px-4 py-1.5 text-xs font-medium rounded-sm transition ${mode === 'live' ? 'bg-emerald-900/20 text-emerald-400 border border-emerald-800/50' : 'text-neutral-500 hover:text-neutral-300'}`}>Live Mode</button>
            
            <div className="w-px h-6 bg-neutral-700 mx-1"></div> 

            <button 
              onClick={() => { if (mode !== 'dvr') loadDvrData(1, '1h'); }} 
              disabled={isFetchingDvr} 
              className={`px-4 py-1.5 text-xs font-medium rounded-sm transition ${mode === 'dvr' ? 'bg-purple-900/20 text-purple-400 border border-purple-800/50' : 'text-neutral-500 hover:text-purple-400'}`}
            >
              DVR Replay
            </button>
          </div>

          <div className="flex-1 flex justify-end items-center gap-4">
            {mode === 'simulation' && (
              <div className="flex gap-2 bg-neutral-900 p-1 rounded-md border border-neutral-800">
                <button onClick={() => triggerChaos('cpu_spike')} className="px-3 py-1 text-xs text-red-400 hover:bg-red-950/30 rounded">CPU Spike</button>
                <button onClick={() => triggerChaos('memory_leak')} className="px-3 py-1 text-xs text-blue-400 hover:bg-blue-950/30 rounded">Mem Leak</button>
                <button onClick={() => triggerChaos('high_traffic')} className="px-3 py-1 text-xs text-orange-400 hover:bg-orange-950/30 rounded">Traffic Surge</button>
              </div>
            )}
            <span className="text-sm bg-neutral-900 px-3 py-1 rounded-full border border-neutral-700">{connectionStatus}</span>
          </div>
        </div>

        {mode === 'dvr' && dvr.data.length > 0 && (
          <div className="w-full bg-purple-950/20 border border-purple-900/50 p-4 rounded-lg mt-2">
            
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
                <span className="text-xs font-bold text-purple-400 tracking-wider">FLIGHT RECORDER</span>
              </div>
              
              <select 
                value={activeDvrRes}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '15m') loadDvrData(0.25, '15m');
                  if (val === '1h') loadDvrData(1, '1h');
                  if (val === '24h') loadDvrData(24, '24h');
                }}
                className="bg-purple-900/40 text-purple-300 border border-purple-700 rounded-sm px-3 py-1.5 text-xs font-bold cursor-pointer outline-none hover:bg-purple-900/60 transition-colors"
              >
                <option value="15m" className="bg-neutral-900 text-white">15m ending {anchorDisplayTime === 'Now' ? 'Now' : `at ${anchorDisplayTime}`}</option>
                <option value="1h" className="bg-neutral-900 text-white">1h ending {anchorDisplayTime === 'Now' ? 'Now' : `at ${anchorDisplayTime}`}</option>
                <option value="24h" className="bg-neutral-900 text-white">24h ending {anchorDisplayTime === 'Now' ? 'Now' : `at ${anchorDisplayTime}`} (Downsampled)</option>
              </select>
            </div>

            {/* The Interactive Scrubber Area */}
            <div className="relative w-full pb-2">
              <input 
                type="range" min="0" max={dvr.data.length - 1} 
                value={dvr.currentIndex} 
                onChange={(e) => setDvrIndex(Number(e.target.value))} 
                className="w-full accent-purple-500 cursor-pointer relative z-10 m-0"
              />

              {/* FIX 1: Subtle, bottom-aligned hover hint */}
              <div 
                className="absolute top-6 -translate-x-1/2 bg-neutral-900 border border-neutral-700 text-neutral-400 font-mono text-[10px] px-2 py-0.5 rounded pointer-events-none z-20 whitespace-nowrap shadow-sm"
                style={{ 
                  left: `calc(${scrubberPercentage}%)` 
                }}
              >
                {new Date(dvr.data[dvr.currentIndex].timestamp).toLocaleTimeString()}
              </div>
              
              {/* FIX 2: Bold, noticeable boundaries with added top margin to clear the hint */}
              <div className="flex justify-between text-[11px] text-purple-300 font-semibold mt-7 font-mono">
                <span>{new Date(dvr.data[0].timestamp).toLocaleTimeString()}</span>
                <span>{new Date(dvr.data[dvr.data.length - 1].timestamp).toLocaleTimeString()}</span>
              </div>
            </div>

          </div>
        )}
      </div>
    </>
  );
}