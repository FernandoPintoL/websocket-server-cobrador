import notificationService from './notification.service.js';

class CreditService {
    // Procesar notificación de crédito creado
    handleCreditCreated(credit, manager, cobrador) {
        if (!manager) return false;

        const cobradorName = cobrador?.name || 'el cobrador';
        const notificationData = notificationService.formatNotification(
            `El cobrador ${cobradorName} ha creado un crédito de $${credit?.amount ?? '?'} que requiere aprobación`,
            {
                type: 'credit_created',
                credit: credit,
                cobrador: cobrador
            }
        );

        const sent = notificationService.notifyUser(manager.id, 'credit_waiting_approval', notificationData);
        notificationService.emitServerLog(`📨 Notification sent to user ${manager.id}: credit_waiting_approval`);
        return sent;
    }

    // Procesar notificación de crédito aprobado
    handleCreditApproved(credit, manager, cobrador) {
        if (!cobrador) return false;

        const approverName = manager?.name || 'el gerente';

        // Detectar bandera de entrega inmediata
        const entregaInmediata = (
            credit?.entrega_inmediata === true ||
            credit?.entregaInmediata === true ||
            credit?.immediate_delivery === true ||
            credit?.immediateDelivery === true ||
            credit?.deliver_immediately === true
        );

        const entregaLabel = entregaInmediata ? 'Sí' : 'No';
        const baseMsg = `Tu crédito de $${credit?.amount ?? '?'} ha sido aprobado por ${approverName}`;
        const extraMsg = ` (Entrega inmediata: ${entregaLabel})`;

        const notificationData = notificationService.formatNotification(
            baseMsg + extraMsg,
            {
                title: 'Crédito aprobado',
                type: 'credit_approved',
                credit: { ...(credit || {}), entrega_inmediata: entregaInmediata },
                manager: manager,
                entrega_inmediata: entregaInmediata,
            }
        );

        const sent = notificationService.notifyUser(cobrador.id, 'credit_approved', notificationData);
        notificationService.emitServerLog(`📨 Notification sent to user ${cobrador.id}: credit_approved (entrega_inmediata=${entregaInmediata})`);
        return sent;
    }

    // Procesar notificación de crédito rechazado
    handleCreditRejected(credit, manager, cobrador) {
        if (!cobrador) return false;

        const rejectorName = manager?.name || 'el gerente';
        const notificationData = notificationService.formatNotification(
            `Tu crédito de $${credit?.amount ?? '?'} ha sido rechazado por ${rejectorName}`,
            {
                title: 'Crédito rechazado',
                type: 'credit_rejected',
                credit: credit,
                manager: manager
            }
        );

        const sent = notificationService.notifyUser(cobrador.id, 'credit_rejected', notificationData);
        notificationService.emitServerLog(`📨 Notification sent to user ${cobrador.id}: credit_rejected`);
        return sent;
    }

    // Procesar notificación de crédito entregado
    handleCreditDelivered(credit, manager, cobrador) {
        if (!manager) return false;

        const cobradorName = cobrador?.name || 'el cobrador';
        const notificationData = notificationService.formatNotification(
            `El cobrador ${cobradorName} ha entregado el crédito de $${credit?.amount ?? '?'}`,
            {
                title: 'Crédito entregado',
                type: 'credit_delivered',
                credit: credit,
                cobrador: cobrador
            }
        );

        const sent = notificationService.notifyUser(manager.id, 'credit_delivered', notificationData);
        notificationService.emitServerLog(`📨 Notification sent to user ${manager.id}: credit_delivered`);
        return sent;
    }

    // Procesar notificación de crédito que requiere atención
    handleCreditRequiresAttention(credit, cobrador) {
        if (!cobrador) return false;

        const notificationData = notificationService.formatNotification(
            `El crédito de $${credit.amount} requiere tu atención`,
            {
                title: 'Crédito requiere atención',
                type: 'credit_attention',
                credit: credit
            }
        );

        const sent = notificationService.notifyUser(cobrador.id, 'credit_attention_required', notificationData);
        notificationService.emitServerLog(`📨 Notification sent to user ${cobrador.id}: credit_attention_required`);
        return sent;
    }

    // Procesar notificación de crédito según acción
    processCreditNotification(action, credit, manager, cobrador) {
        console.log(`🏦 Credit notification received: ${action}`, {
            creditId: credit?.id,
            managerId: manager?.id,
            cobradorId: cobrador?.id
        });

        const payload = {
            creditId: credit?.id,
            managerId: manager?.id,
            cobradorId: cobrador?.id
        };
        notificationService.emitServerLog(`🏦 Credit notification received: ${action} ${JSON.stringify(payload)}`);

        switch (action) {
            case 'created':
                return this.handleCreditCreated(credit, manager, cobrador);
            case 'approved':
                return this.handleCreditApproved(credit, manager, cobrador);
            case 'rejected':
                return this.handleCreditRejected(credit, manager, cobrador);
            case 'delivered':
                return this.handleCreditDelivered(credit, manager, cobrador);
            case 'requires_attention':
                return this.handleCreditRequiresAttention(credit, cobrador);
            default:
                console.log(`⚠️ Unknown credit action: ${action}`);
                return false;
        }
    }
}

export default new CreditService();
