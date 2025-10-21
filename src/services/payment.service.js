import notificationService from './notification.service.js';

class PaymentService {
    // Procesar notificación de pago
    processPaymentNotification(payment, cobrador, manager, client) {
        console.log(`💰 Payment notification received`, {
            paymentId: payment?.id,
            amount: payment?.amount,
            cobradorId: cobrador?.id,
            managerId: manager?.id
        });

        let notificationSent = false;

        // Notificar al cobrador que recibió un pago
        if (cobrador) {
            const notificationData = notificationService.formatNotification(
                `Has realizado un pago de ${payment?.amount ?? '?'} Bs de ${client?.name || 'cliente'}`,
                {
                    title: 'Pago realizado',
                    type: 'payment_received',
                    payment: payment,
                    client: client
                }
            );
            notificationSent = notificationService.notifyUser(cobrador.id, 'payment_received', notificationData);
        }

        // Notificar al manager sobre el pago recibido por su cobrador
        if (manager) {
            const notificationData = notificationService.formatNotification(
                `El cobrador ${cobrador?.name || 'cobrador'} recibió un pago de ${payment?.amount ?? '?'} Bs de ${client?.name || 'cliente'}`,
                {
                    title: 'Pago de cobrador recibido',
                    type: 'cobrador_payment_received',
                    payment: payment,
                    cobrador: cobrador,
                    client: client
                }
            );
            notificationService.notifyUser(manager.id, 'cobrador_payment_received', notificationData);
            notificationSent = true;
        }

        return notificationSent;
    }
}

export default new PaymentService();
