// src/controllers/chaosController.ts
import type { Request, Response } from 'express';
import { triggerChaos } from '../services/simulation.js';
import type { ChaosMode } from '../types/index.types.js';

export const setChaosMode = (req: Request, res: Response): void => {
  const { mode } = req.body;
  const validModes: ChaosMode[] = ['none', 'cpu_spike', 'memory_leak', 'high_traffic'];
  
  if (!validModes.includes(mode as ChaosMode)) {
    res.status(400).json({ error: 'Invalid chaos mode' });
    return;
  }

  triggerChaos(mode as ChaosMode);
  res.json({ message: `Chaos mode set to: ${mode}` });
};

export const checkHealth = (req: Request, res: Response): void => {
  res.json({ status: 'ok', message: 'VitalHost Telemetry Engine Running' });
};