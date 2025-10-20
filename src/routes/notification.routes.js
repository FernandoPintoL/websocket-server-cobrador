import express from 'express';
import notificationController from '../controllers/notification.controller.js';
import creditController from '../controllers/credit.controller.js';
import paymentController from '../controllers/payment.controller.js';
import { ensureBackend } from '../middleware/auth.middleware.js';

const router = express.Router();

// API endpoint para notificaciones externas (Laravel)
router.post('/notify', ensureBackend, notificationController.handleNotification);

// API específica para notificaciones de créditos
router.post('/credit-notification', ensureBackend, creditController.handleCreditNotification);

// API específica para notificaciones de pagos
router.post('/payment-notification', ensureBackend, paymentController.handlePaymentNotification);

export default router;
