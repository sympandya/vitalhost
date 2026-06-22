// server/src/services/ai.ts
import { GoogleGenAI } from '@google/genai';
import { systemLogs } from './logger.js'; 
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

let isAnalyzing = false;
let lastAnalysisTime = 0;
const COOLDOWN_MS = 60000; 

export const analyzeSystemAnomaly = async (
  cpuPercent: number, 
  mode: string, 
  sendToClient: (msg: any) => void 
) => {
  if (mode !== 'simulation' || !ai) return; 
  
  const now = Date.now();
  if (isAnalyzing || (now - lastAnalysisTime < COOLDOWN_MS)) return;

  isAnalyzing = true;
  lastAnalysisTime = now;

  // 1. Instantly notify the UI that analysis has started
  sendToClient({
    type: 'AI_INCIDENT_START',
    data: {
      trigger: `CPU Spike (${cpuPercent}%)`,
      timestamp: new Date().toLocaleTimeString()
    }
  });

  console.log(`\n[AI Agent] 🚨 SIMULATED SPIKE DETECTED (${cpuPercent}%). Generating RCA...`);

  const logSnapshot = systemLogs.slice(-150).join('\n');
  const prompt = `
    You are an elite Site Reliability Engineer (SRE) monitoring a Node.js server.
    The CPU just spiked to ${cpuPercent}% in a simulated chaos event.
    
    Recent logs:
    """
    ${logSnapshot || "No logs available."}
    """

    Analyze these logs and provide a Root Cause Analysis (RCA). 
    Keep it strictly technical, direct, and short. 
    Provide exactly two sections: 
    1. ROOT CAUSE: (What caused it)
    2. REMEDIATION: (Exact actionable step or command to fix it)
    Do not use markdown headers, just plain text with line breaks.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    // 2. Transmit the final RCA
    sendToClient({ 
      type: 'AI_INCIDENT_REPORT', 
      data: { 
        trigger: `CPU Spike (${cpuPercent}%)`, 
        analysis: response.text,
        timestamp: new Date().toLocaleTimeString()
      } 
    });

    console.log('[AI Agent] ✅ RCA generated and successfully transmitted.');
  } catch (error) {
    console.error('[AI Agent] ❌ Gemini API failed:', error);
  } finally {
    isAnalyzing = false;
  }
};