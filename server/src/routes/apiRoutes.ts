import { Router } from 'express';
import { setChaosMode, checkHealth } from '../controllers/chaos.controller.js';

const router = Router();

router.get('/health', checkHealth);
router.post('/chaos', setChaosMode);

export default router;