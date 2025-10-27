import paymentService from '../services/payment.service.js';

class PaymentController {
    // Manejar notificaciones de pagos
    async handlePaymentNotification(req, res) {
        try {
            const { payment, cobrador, manager, client } = req.body;

            const notificationSent = paymentService.processPaymentNotification(
                payment,
                cobrador,
                manager,
                client
            );

            res.json({
                success: true,
                message: 'Pago notificado correctamente',
                paymentId: payment?.id,
                sent: notificationSent
            });
        } catch (error) {
            console.error('Error notificando pago:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

export default new PaymentController();
