import { useTelemetryStore } from '../../store/useTelemetryStore';

export function IncidentModal() {
  const { incidentReport, clearIncidentReport } = useTelemetryStore();
console.log('MODAL RENDER CHECK. Current Report State:', incidentReport);
  if (!incidentReport) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-neutral-950 border border-red-900 shadow-[0_0_30px_rgba(220,38,38,0.2)] rounded-lg w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="bg-red-950/50 border-b border-red-900 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
            <h2 className="text-red-400 font-bold tracking-widest text-sm">AI INCIDENT TICKET</h2>
          </div>
          <span className="text-red-500/50 font-mono text-xs">{incidentReport.timestamp}</span>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-neutral-500 text-xs font-bold mb-1 uppercase">Trigger Event</h3>
            <div className="text-white font-mono text-lg bg-neutral-900 px-3 py-2 rounded border border-neutral-800">
              {incidentReport.trigger}
            </div>
          </div>

          <div>
            <h3 className="text-neutral-500 text-xs font-bold mb-1 uppercase">Gemini RCA Analysis</h3>
            <div className="text-neutral-300 text-sm leading-relaxed whitespace-pre-wrap bg-neutral-900/50 p-4 rounded border border-neutral-800/50 font-mono">
              {incidentReport.analysis}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-neutral-900 px-6 py-4 flex justify-end">
          <button 
            onClick={clearIncidentReport}
            className="bg-neutral-800 hover:bg-neutral-700 text-white px-6 py-2 rounded text-sm font-bold transition-colors border border-neutral-700"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
}