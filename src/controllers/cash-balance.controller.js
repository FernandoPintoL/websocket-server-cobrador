import cashBalanceService from '../services/cash-balance.service.js';

class CashBalanceController {
    // Manejar notificaciones de cajas
    async handleCashBalanceNotification(req, res) {
        try {
            const { action, cash_balance, cobrador, manager, reason } = req.body;

            console.log('📦 Cash Balance Notification received:', {
                action,
                cash_balance_id: cash_balance?.id,
                cobrador_id: cobrador?.id,
                manager_id: manager?.id,
                reason
            });

            const notificationSent = cashBalanceService.processCashBalanceNotification(
                action,
                cash_balance,
                cobrador,
                manager,
                reason
            );

            res.json({
                success: true,
                message: 'Caja notificada correctamente',
                action: action,
                cashBalanceId: cash_balance?.id,
                sent: notificationSent
            });
        } catch (error) {
            console.error('❌ Error notificando caja:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

export default new CashBalanceController();
