import express from 'express';
import statsController from '../controllers/stats.controller.js';
import { ensureBackend } from '../middleware/auth.middleware.js';

const router = express.Router();

// API endpoint para actualizar estadísticas en tiempo real
// Recibe desde Laravel y distribuye a través del WebSocket
router.post('/stats-update', ensureBackend, statsController.handleStatsUpdate);

export default router;
