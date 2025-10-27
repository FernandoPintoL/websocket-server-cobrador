import creditService from '../services/credit.service.js';

class CreditController {
    // Manejar notificaciones de créditos
    async handleCreditNotification(req, res) {
        try {
            const { action, credit, manager, cobrador } = req.body;

            const notificationSent = creditService.processCreditNotification(
                action,
                credit,
                manager,
                cobrador
            );

            res.json({
                success: true,
                message: 'Credito notificado correctamente',
                action: action,
                creditId: credit?.id,
                sent: notificationSent
            });
        } catch (error) {
            console.error('Error notificando credito:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

export default new CreditController();
