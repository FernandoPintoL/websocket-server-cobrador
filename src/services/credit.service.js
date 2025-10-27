import notificationService from './notification.service.js';

class CreditService {
    // Procesar notificación de crédito creado
    handleCreditCreated(credit, manager, cobrador) {
        if (!manager) return false;

        const cobradorName = cobrador?.name || 'el cobrador';
        const notificationData = notificationService.formatNotification(
            `El cobrador ${cobradorName} ha creado un crédito de ${credit?.amount ?? '?'} Bs que requiere aprobación`,
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

        // Detectar bandera de entrega inmediata (urgencia)
        const entregaInmediata = (
            credit?.entrega_inmediata === true ||
            credit?.entregaInmediata === true ||
            credit?.immediate_delivery === true ||
            credit?.immediateDelivery === true ||
            credit?.deliver_immediately === true ||
            credit?.immediate_delivery_requested === true
        );

        // IMPORTANTE: El crédito está en 'waiting_delivery', NO ha sido entregado aún
        // El cobrador debe confirmar la entrega física para activarlo
        let mensaje;
        if (entregaInmediata) {
            mensaje = `Tu crédito de ${credit?.amount ?? '?'} Bs ha sido aprobado por ${approverName}. Debes entregar el dinero al cliente HOY.`;
        } else {
            const fechaEntrega = credit?.scheduled_delivery_date || 'la fecha programada';
            mensaje = `Tu crédito de ${credit?.amount ?? '?'} Bs ha sido aprobado por ${approverName}. Entregar el ${fechaEntrega}.`;
        }

        const notificationData = notificationService.formatNotification(
            mensaje,
            {
                title: 'Crédito aprobado - Pendiente de entrega',
                type: 'credit_approved',
                credit: {
                    ...(credit || {}),
                    entrega_inmediata: entregaInmediata,
                    status: 'waiting_delivery' // Explícito: aún no está activo
                },
                manager: manager,
                entrega_inmediata: entregaInmediata,
                action_required: 'Confirma la entrega física del dinero para activar el crédito'
            }
        );

        const sent = notificationService.notifyUser(cobrador.id, 'credit_approved', notificationData);
        notificationService.emitServerLog(`📨 Notification sent to user ${cobrador.id}: credit_approved (waiting_delivery, entrega_inmediata=${entregaInmediata})`);
        return sent;
    }

    // Procesar notificación de crédito rechazado
    handleCreditRejected(credit, manager, cobrador) {
        if (!cobrador) return false;

        const rejectorName = manager?.name || 'el gerente';
        const notificationData = notificationService.formatNotification(
            `Tu crédito de ${credit?.amount ?? '?'} Bs ha sido rechazado por ${rejectorName}`,
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
    // Este evento se dispara cuando el cobrador confirma la entrega física del dinero al cliente
    // El crédito pasa de 'waiting_delivery' a 'active' y se arma el cronograma de pagos
    handleCreditDelivered(credit, manager, cobrador) {
        if (!manager) return false;

        const cobradorName = cobrador?.name || 'el cobrador';
        const clientName = credit?.client_name || 'el cliente';

        const notificationData = notificationService.formatNotification(
            `${cobradorName} ha entregado físicamente el crédito de ${credit?.amount ?? '?'} Bs a ${clientName}. El crédito está ahora ACTIVO y el cronograma de pagos ha comenzado.`,
            {
                title: 'Crédito entregado y activado',
                type: 'credit_delivered',
                credit: {
                    ...(credit || {}),
                    status: 'active', // El crédito ahora está activo
                },
                cobrador: cobrador,
                info: 'El cronograma de pagos se calculó desde la fecha de entrega física'
            }
        );

        const sent = notificationService.notifyUser(manager.id, 'credit_delivered', notificationData);
        notificationService.emitServerLog(`📨 Notification sent to user ${manager.id}: credit_delivered (now active)`);
        return sent;
    }

    // Procesar notificación de crédito que requiere atención
    handleCreditRequiresAttention(credit, cobrador) {
        if (!cobrador) return false;

        const notificationData = notificationService.formatNotification(
            `El crédito de ${credit.amount} Bs requiere tu atención`,
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
                console.log(`⚠️ Acción de crédito desconocida: ${action}`);
                return false;
        }
    }
}

export default new CreditService();
