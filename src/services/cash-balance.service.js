import notificationService from './notification.service.js';

class CashBalanceService {
    // Procesar notificación de caja auto-cerrada
    handleCashBalanceAutoClosed(cashBalance, cobrador, manager) {
        const notifications = [];

        // Formatear fecha
        const fechaCaja = cashBalance?.date || 'fecha desconocida';
        const montoFinal = cashBalance?.final_amount || 0;

        // Notificar al cobrador
        if (cobrador) {
            const mensajeCobrador = `Tu caja del ${fechaCaja} fue cerrada automáticamente. Saldo final: ${montoFinal} Bs`;

            const notificationData = notificationService.formatNotification(
                mensajeCobrador,
                {
                    type: 'cash_balance_auto_closed',
                    cash_balance: cashBalance,
                    closure_type: 'automatic'
                }
            );

            const sent = notificationService.notifyUser(
                cobrador.id,
                'cash_balance_auto_closed',
                notificationData
            );

            notifications.push({ userId: cobrador.id, sent });
            notificationService.emitServerLog(
                `📦 Notification sent to cobrador ${cobrador.id}: cash_balance_auto_closed`
            );
        }

        // Notificar al manager
        if (manager) {
            const cobradorName = cobrador?.name || 'un cobrador';
            const mensajeManager = `Caja del ${fechaCaja} de ${cobradorName} fue cerrada automáticamente. Saldo final: ${montoFinal} Bs`;

            const notificationData = notificationService.formatNotification(
                mensajeManager,
                {
                    type: 'cash_balance_auto_closed',
                    cash_balance: cashBalance,
                    cobrador: cobrador,
                    closure_type: 'automatic'
                }
            );

            const sent = notificationService.notifyUser(
                manager.id,
                'cash_balance_auto_closed',
                notificationData
            );

            notifications.push({ userId: manager.id, sent });
            notificationService.emitServerLog(
                `📦 Notification sent to manager ${manager.id}: cash_balance_auto_closed`
            );
        }

        return notifications.some(n => n.sent);
    }

    // Procesar notificación de caja auto-creada
    handleCashBalanceAutoCreated(cashBalance, cobrador, manager, reason) {
        const notifications = [];

        const fechaCaja = cashBalance?.date || 'hoy';
        const reasonText = reason === 'payment'
            ? 'al registrar un pago'
            : 'al entregar un crédito';

        // Notificar al cobrador
        if (cobrador) {
            const mensajeCobrador = `Se creó una caja virtual para ${fechaCaja} automáticamente ${reasonText}. Recuerda conciliarla al final del día.`;

            const notificationData = notificationService.formatNotification(
                mensajeCobrador,
                {
                    type: 'cash_balance_auto_created',
                    cash_balance: cashBalance,
                    reason: reason,
                    requires_reconciliation: cashBalance?.requires_reconciliation || false
                }
            );

            const sent = notificationService.notifyUser(
                cobrador.id,
                'cash_balance_auto_created',
                notificationData
            );

            notifications.push({ userId: cobrador.id, sent });
            notificationService.emitServerLog(
                `📦 Notification sent to cobrador ${cobrador.id}: cash_balance_auto_created (${reason})`
            );
        }

        // Notificar al manager
        if (manager) {
            const cobradorName = cobrador?.name || 'un cobrador';
            const mensajeManager = `${cobradorName} creó una caja virtual ${reasonText} para ${fechaCaja}. Requiere conciliación.`;

            const notificationData = notificationService.formatNotification(
                mensajeManager,
                {
                    type: 'cash_balance_auto_created',
                    cash_balance: cashBalance,
                    cobrador: cobrador,
                    reason: reason,
                    requires_reconciliation: cashBalance?.requires_reconciliation || false
                }
            );

            const sent = notificationService.notifyUser(
                manager.id,
                'cash_balance_auto_created',
                notificationData
            );

            notifications.push({ userId: manager.id, sent });
            notificationService.emitServerLog(
                `📦 Notification sent to manager ${manager.id}: cash_balance_auto_created (${reason})`
            );
        }

        return notifications.some(n => n.sent);
    }

    // Procesar notificación de caja que requiere conciliación
    handleCashBalanceRequiresReconciliation(cashBalance, cobrador, manager, reason) {
        const notifications = [];

        const fechaCaja = cashBalance?.date || 'fecha desconocida';
        const montoFinal = cashBalance?.final_amount || 0;

        // Notificar al cobrador
        if (cobrador) {
            const mensajeCobrador = `Tu caja del ${fechaCaja} requiere conciliación. Saldo actual: ${montoFinal} Bs. ${reason || ''}`;

            const notificationData = notificationService.formatNotification(
                mensajeCobrador,
                {
                    type: 'cash_balance_requires_reconciliation',
                    cash_balance: cashBalance,
                    reason: reason,
                    priority: 'high'
                }
            );

            const sent = notificationService.notifyUser(
                cobrador.id,
                'cash_balance_requires_reconciliation',
                notificationData
            );

            notifications.push({ userId: cobrador.id, sent });
            notificationService.emitServerLog(
                `📦 Alert sent to cobrador ${cobrador.id}: cash_balance_requires_reconciliation`
            );
        }

        // Notificar al manager
        if (manager) {
            const cobradorName = cobrador?.name || 'un cobrador';
            const mensajeManager = `Caja del ${fechaCaja} de ${cobradorName} requiere conciliación. ${reason || ''}`;

            const notificationData = notificationService.formatNotification(
                mensajeManager,
                {
                    type: 'cash_balance_requires_reconciliation',
                    cash_balance: cashBalance,
                    cobrador: cobrador,
                    reason: reason,
                    priority: 'high'
                }
            );

            const sent = notificationService.notifyUser(
                manager.id,
                'cash_balance_requires_reconciliation',
                notificationData
            );

            notifications.push({ userId: manager.id, sent });
            notificationService.emitServerLog(
                `📦 Alert sent to manager ${manager.id}: cash_balance_requires_reconciliation`
            );
        }

        return notifications.some(n => n.sent);
    }

    // Método principal para procesar todas las notificaciones de cajas
    processCashBalanceNotification(action, cashBalance, cobrador, manager, reason = '') {
        console.log(`📦 Processing cash balance notification: ${action}`);

        switch (action) {
            case 'auto_closed':
                return this.handleCashBalanceAutoClosed(cashBalance, cobrador, manager);

            case 'auto_created':
                return this.handleCashBalanceAutoCreated(cashBalance, cobrador, manager, reason);

            case 'requires_reconciliation':
                return this.handleCashBalanceRequiresReconciliation(cashBalance, cobrador, manager, reason);

            default:
                console.warn(`⚠️  Unknown cash balance action: ${action}`);
                return false;
        }
    }
}

export default new CashBalanceService();
