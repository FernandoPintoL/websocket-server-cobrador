import express from 'express';
import http from 'http';
import { Server as socketIo } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { getLocalIP } from './network-utils.js';
import { findUserSocket, notifyUser, notifyUserType, notifyAll, formatNotification } from './notification-utils.js';
import dotenv from 'dotenv';
dotenv.config();

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Configurar CORS para Socket.IO - Compatible con móviles
const corsOrigins = process.env.NODE_ENV === 'production'
    ? [
        process.env.CLIENT_URL,
        process.env.MOBILE_CLIENT_URL,
        process.env.WEBSOCKET_URL,
        "capacitor://localhost",
        "ionic://localhost",
        "http://localhost"
    ]
    : [
        process.env.CLIENT_URL || "http://localhost:3000",
        process.env.MOBILE_CLIENT_URL || "http://192.168.0.24:3000",
        // Permitir cualquier IP local para desarrollo
        /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
        /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,
        /^http:\/\/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+:\d+$/,
        // Para aplicaciones móviles (Flutter/React Native)
        "capacitor://localhost",
        "ionic://localhost",
        "http://localhost",
    ];

const io = new socketIo(server, {
    cors: {
        origin: corsOrigins,
        methods: ["GET", "POST"],
        credentials: true,
        allowEIO3: true
    },
    // Configuración optimizada para móviles
    pingTimeout: 30000,
    pingInterval: 10000,
    upgradeTimeout: 10000,
    maxHttpBufferSize: 1e6,
    allowEIO3: true
});

// Middleware
app.use(cors({
    origin: corsOrigins,
    credentials: true
}));
app.use(express.json());

// Puerto del servidor - Railway usa la variable PORT automáticamente
const PORT = process.env.PORT || process.env.WEBSOCKET_PORT || 3001;

// Almacenar conexiones activas por usuario
const activeUsers = new Map();

// Servir archivo de prueba
app.get('/', (req, res) => {
    res.redirect('/test.html');
});

app.get('/test.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'test.html'));
});

// Ruta de salud del servidor
app.get('/health', (req, res) => {
    const activeConnections = activeUsers.size;
    const uptime = process.uptime();

    res.json({
        status: 'OK',
        message: 'WebSocket server is running',
        connections: activeConnections,
        uptime: uptime,
        timestamp: new Date().toISOString()
    });
});

// Middleware simple: validar secreto para llamadas del backend
function ensureBackend(req, res) {
    const secret = req.headers['x-ws-secret'] || req.query.ws_secret;
    // En desarrollo, si no hay WS_SECRET definido, permitir (para facilitar pruebas)
    if (!process.env.WS_SECRET && process.env.NODE_ENV !== 'production') {
        return true;
    }
    if (!process.env.WS_SECRET || secret !== process.env.WS_SECRET) {
        return false;
    }
    return true;
}

// API endpoint para notificaciones externas (Laravel)
app.post('/notify', (req, res) => {
    if (!ensureBackend(req, res)) {
        return res.status(401).json({ success: false, error: 'Unauthorized: backend only' });
    }
    // Soportar múltiples formatos para compatibilidad
    const { event, data, userId, userType, notification } = req.body;

    // Determinar el evento a enviar
    const eventName = event || req.body.event || 'notification';

    // Determinar los datos a enviar
    let notificationData = data || notification || {};

    console.log('📡 Received notification from external source:', eventName);

    try {
        let notificationSent = false;

        // Notificar a un usuario específico por ID
        if (userId || data?.user_id) {
            const targetUserId = userId || data?.user_id;
            notificationSent = notifyUser(io, targetUserId, eventName, notificationData);
        }
        // Notificar a todos los usuarios de un tipo específico (cobrador, manager, etc.)
        else if (userType) {
            notificationSent = notifyUserType(io, userType, eventName, notificationData);
        }
        // Broadcast a todos los usuarios
        else {
            notifyAll(io, eventName, notificationData);
            notificationSent = true;
        }

        res.json({
            success: true,
            message: 'Notification sent',
            event: eventName,
            target: userId || data?.user_id
                ? `user ${userId || data.user_id}`
                : (userType ? `all ${userType}s` : 'all users')
        });
    } catch (error) {
        console.error('Error sending notification:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// API específica para notificaciones de créditos
app.post('/credit-notification', (req, res) => {
    if (!ensureBackend(req, res)) {
        return res.status(401).json({ success: false, error: 'Unauthorized: backend only' });
    }
    const { action, credit, user, manager, cobrador } = req.body;

    console.log(`🏦 Credit notification received: ${action}`, {
        creditId: credit?.id,
        userId: user?.id,
        managerId: manager?.id,
        cobradorId: cobrador?.id
    });

    // Emitir el mismo log a los clientes para que se muestre en el HTML de prueba
    try {
        const payload = {
            creditId: credit?.id,
            userId: user?.id,
            managerId: manager?.id,
            cobradorId: cobrador?.id
        };
        io.emit('server_log', `🏦 Credit notification received: ${action} ${JSON.stringify(payload)}`);
    } catch (_) {
        // no-op
    }

    try {
        let notificationSent = false;

        switch (action) {
            case 'created':
                // Notificar al manager que un cobrador creó un crédito
                if (manager) {
                    const cobradorName = cobrador?.name || 'el cobrador';
                    const notificationData = formatNotification(
                        `El cobrador ${cobradorName} ha creado un crédito de $${credit?.amount ?? '?'} que requiere aprobación`,
                        {
                            type: 'credit_created',
                            credit: credit,
                            cobrador: cobrador
                        }
                    );
                    notificationSent = notifyUser(io, manager.id, 'credit_waiting_approval', notificationData);
                    try { io.emit('server_log', `📨 Notification sent to user ${manager.id}: credit_waiting_approval`); } catch (_) {}
                }
                break;

            case 'approved':
                // Notificar al cobrador que su crédito fue aprobado
                if (cobrador) {
                    const approverName = manager?.name || 'el gerente';
                    // Detectar bandera de entrega inmediata desde distintas claves posibles
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
                    const notificationData = formatNotification(
                        baseMsg + extraMsg,
                        {
                            title: 'Crédito aprobado',
                            type: 'credit_approved',
                            credit: { ...(credit || {}), entrega_inmediata: entregaInmediata },
                            manager: manager,
                            entrega_inmediata: entregaInmediata,
                        }
                    );
                    notificationSent = notifyUser(io, cobrador.id, 'credit_approved', notificationData);
                    try { io.emit('server_log', `📨 Notification sent to user ${cobrador.id}: credit_approved (entrega_inmediata=${entregaInmediata})`); } catch (_) {}
                }
                break;

            case 'rejected':
                // Notificar al cobrador que su crédito fue rechazado
                if (cobrador) {
                    const rejectorName = manager?.name || 'el gerente';
                    const notificationData = formatNotification(
                        `Tu crédito de $${credit?.amount ?? '?'} ha sido rechazado por ${rejectorName}`,
                        {
                            title: 'Crédito rechazado',
                            type: 'credit_rejected',
                            credit: credit,
                            manager: manager
                        }
                    );
                    notificationSent = notifyUser(io, cobrador.id, 'credit_rejected', notificationData);
                    try { io.emit('server_log', `📨 Notification sent to user ${cobrador.id}: credit_rejected`); } catch (_) {}
                }
                break;

            case 'delivered':
                // Notificar al manager que un crédito fue entregado
                if (manager) {
                    const cobradorName2 = cobrador?.name || 'el cobrador';
                    const notificationData = formatNotification(
                        `El cobrador ${cobradorName2} ha entregado el crédito de $${credit?.amount ?? '?'}`,
                        {
                            title: 'Crédito entregado',
                            type: 'credit_delivered',
                            credit: credit,
                            cobrador: cobrador
                        }
                    );
                    notificationSent = notifyUser(io, manager.id, 'credit_delivered', notificationData);
                    try { io.emit('server_log', `📨 Notification sent to user ${manager.id}: credit_delivered`); } catch (_) {}
                }
                break;

            case 'requires_attention':
                // Notificar al cobrador que un crédito requiere atención
                if (cobrador) {
                    const notificationData = formatNotification(
                        `El crédito de $${credit.amount} requiere tu atención`,
                        {
                            title: 'Crédito requiere atención',
                            type: 'credit_attention',
                            credit: credit
                        }
                    );
                    notificationSent = notifyUser(io, cobrador.id, 'credit_attention_required', notificationData);
                    try { io.emit('server_log', `📨 Notification sent to user ${cobrador.id}: credit_attention_required`); } catch (_) {}
                }
                break;

            default:
                console.log(`⚠️ Unknown credit action: ${action}`);
        }

        res.json({
            success: true,
            message: 'Credit notification processed',
            action: action,
            creditId: credit?.id,
            sent: notificationSent
        });

    } catch (error) {
        console.error('Error processing credit notification:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// API específica para notificaciones de pagos
app.post('/payment-notification', (req, res) => {
    if (!ensureBackend(req, res)) {
        return res.status(401).json({ success: false, error: 'Unauthorized: backend only' });
    }
    const { payment, cobrador, manager, client } = req.body;

    console.log(`💰 Payment notification received`, {
        paymentId: payment?.id,
        amount: payment?.amount,
        cobradorId: cobrador?.id,
        managerId: manager?.id
    });

    try {
        let notificationSent = false;

        // Notificar al cobrador que recibió un pago
        if (cobrador) {
            const notificationData = formatNotification(
                `Has recibido un pago de $${payment?.amount ?? '?'} de ${client?.name || 'cliente'}`,
                {
                    title: 'Pago recibido',
                    type: 'payment_received',
                    payment: payment,
                    client: client
                }
            );
            notificationSent = notifyUser(io, cobrador.id, 'payment_received', notificationData);
        }

        // Notificar al manager sobre el pago recibido por su cobrador
        if (manager) {
            const notificationData = formatNotification(
                `El cobrador ${cobrador?.name || 'cobrador'} recibió un pago de $${payment?.amount ?? '?'} de ${client?.name || 'cliente'}`,
                {
                    title: 'Pago de cobrador recibido',
                    type: 'cobrador_payment_received',
                    payment: payment,
                    cobrador: cobrador,
                    client: client
                }
            );
            notifyUser(io, manager.id, 'cobrador_payment_received', notificationData);
            notificationSent = true;
        }

        res.json({
            success: true,
            message: 'Payment notification processed',
            paymentId: payment?.id,
            sent: notificationSent
        });

    } catch (error) {
        console.error('Error processing payment notification:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Eventos de Socket.IO
io.on('connection', (socket) => {
    console.log(`Usuario conectado: ${socket.id}`);

    // Evento de autenticación del usuario
    socket.on('authenticate', (data) => {
        const { userId, userType, userName } = data;

        if (userId) {
            // Almacenar información del usuario
            activeUsers.set(socket.id, {
                userId,
                userType,
                userName,
                socketId: socket.id,
                connectedAt: new Date()
            });

            // Unir al usuario a salas según su tipo
            if (userType === 'cobrador') {
                socket.join('cobradores');
            } else if (userType === 'client') {
                socket.join('clients');
            } else if (userType === 'manager') {
                socket.join('managers');
                socket.join('admins'); // Los managers también reciben notificaciones de admin
            } else if (userType === 'admin') {
                socket.join('admins');
                socket.join('managers'); // Los admins también reciben notificaciones de managers
                socket.join('cobradores'); // Los admins también reciben notificaciones de cobradores
            }

            // Unir a sala personal
            socket.join(`user_${userId}`);

            console.log(`Usuario autenticado: ${userName} (${userType}) - ID: ${userId}`);

            // Confirmar autenticación
            socket.emit('authenticated', {
                success: true,
                message: 'Autenticación exitosa',
                userId: userId,
                userType: userType
            });

            // Notificar a otros usuarios sobre la conexión (opcional)
            socket.broadcast.emit('user_connected', {
                userId,
                userName,
                userType
            });
        } else {
            socket.emit('authentication_error', {
                success: false,
                message: 'Datos de autenticación inválidos'
            });
        }
    });

    // Evento de ciclo de vida de crédito: permitir reenvío desde cliente
    socket.on('credit_lifecycle', (data) => {
        const { action, creditId, targetUserId, credit, userType, message } = data;
        const user = activeUsers.get(socket.id);

        console.log(`🏦 Credit lifecycle event: ${action}`, {
            creditId,
            from: user?.userName,
            targetUserId
        });

        const notificationData = {
            action: action,
            creditId: creditId,
            credit: credit,
            message: message,
            timestamp: new Date().toISOString(),
            from: user ? { id: user.userId, name: user.userName, type: user.userType } : null
        };

        // Enviar a usuario específico si corresponde
        if (targetUserId) {
            io.to(`user_${targetUserId}`).emit('credit_lifecycle_update', notificationData);
            console.log(`📨 Credit lifecycle sent to user ${targetUserId}`);
        }

        // Enviar a grupos según el tipo de acción
        switch (action) {
            case 'created':
                // Notificar a managers cuando se crea un crédito
                io.to('managers').emit('credit_pending_approval', notificationData);
                break;
            case 'approved':
            case 'rejected':
                // Notificar al cobrador sobre decisión del manager
                io.to('cobradores').emit('credit_decision', notificationData);
                if (targetUserId) {
                    io.to(`user_${targetUserId}`).emit('credit_decision', notificationData);
                }
                break;
            case 'delivered':
                // Notificar a managers cuando se entrega un crédito
                io.to('managers').emit('credit_delivered_notification', notificationData);
                break;
            case 'requires_attention':
                // Notificar al cobrador específico
                if (targetUserId) {
                    io.to(`user_${targetUserId}`).emit('credit_attention_required', notificationData);
                } else {
                    io.to('cobradores').emit('credit_attention_required', notificationData);
                }
                break;
        }
    });

    // Permitir notificaciones de crédito desde el cliente (compatibilidad)
    socket.on('credit_notification', (data) => {
        const { targetUserId, notification, userType } = data;
        const user = activeUsers.get(socket.id);
        const payload = {
            ...notification,
            from: user ? { id: user.userId, name: user.userName, type: user.userType } : null,
            timestamp: new Date().toISOString(),
        };
        if (targetUserId) {
            io.to(`user_${targetUserId}`).emit('new_credit_notification', payload);
            console.log(`📨 credit_notification reenviado a user_${targetUserId}`);
        } else if (userType) {
            io.to(`${userType}s`).emit('new_credit_notification', payload);
            console.log(`📨 credit_notification reenviado a grupo ${userType}s`);
        } else {
            io.emit('new_credit_notification', payload);
            console.log(`📨 credit_notification broadcast`);
        }
    });

    // Permitir actualizaciones de pago desde el cliente (cobrador)
    socket.on('payment_update', (data) => {
        const { payment, cobradorId, clientId } = data || {};
        const user = activeUsers.get(socket.id);
        const payload = {
            type: 'payment_update',
            payment: payment,
            cobradorId: cobradorId || user?.userId,
            clientId: clientId,
            from: user ? { id: user.userId, name: user.userName, type: user.userType } : null,
            timestamp: new Date().toISOString(),
        };
        // Notificar al cobrador mismo y a los managers
        if (payload.cobradorId) {
            io.to(`user_${payload.cobradorId}`).emit('payment_received', payload);
        }
        io.to('managers').emit('cobrador_payment_received', payload);
        console.log(`💰 payment_update reenviado (cobrador ${payload.cobradorId ?? 'N/A'})`);
    });

    // Permitir notificaciones de rutas desde cliente (opcional)
    socket.on('route_notification', (data) => {
        const payload = {
            ...data,
            timestamp: new Date().toISOString(),
        };
        io.to('managers').emit('route_updated', payload);
        socket.emit('route_updated', payload);
        console.log('🛣️ route_notification reenviado');
    });

    // Evento para chat/mensajes
    socket.on('send_message', (data) => {
        const { recipientId, message, senderId } = data;

        // Enviar mensaje al destinatario
        io.to(`user_${recipientId}`).emit('new_message', {
            senderId,
            message,
            timestamp: new Date()
        });

        console.log(`Mensaje enviado de ${senderId} a ${recipientId}`);
    });

    // Evento para ubicación en tiempo real
    socket.on('location_update', (data) => {
        const user = activeUsers.get(socket.id);
        if (user && user.userType === 'cobrador') {
            const { latitude, longitude } = data;

            // Enviar ubicación a admins
            io.to('admins').emit('cobrador_location_update', {
                cobradorId: user.userId,
                cobradorName: user.userName,
                latitude,
                longitude,
                timestamp: new Date()
            });

            console.log(`Ubicación actualizada para cobrador ${user.userName}`);
        }
    });

    // Evento de desconexión
    socket.on('disconnect', () => {
        const user = activeUsers.get(socket.id);

        if (user) {
            console.log(`Usuario desconectado: ${user.userName} (${user.userType})`);

            // Notificar a otros usuarios sobre la desconexión
            socket.broadcast.emit('user_disconnected', {
                userId: user.userId,
                userName: user.userName,
                userType: user.userType
            });

            // Remover de usuarios activos
            activeUsers.delete(socket.id);
        } else {
            console.log(`Cliente desconectado: ${socket.id}`);
        }
    });

    // Manejar errores
    socket.on('error', (error) => {
        console.error('Error en socket:', error);
    });
});

// Función para obtener usuarios activos (endpoint para debugging)
app.get('/active-users', (req, res) => {
    const users = Array.from(activeUsers.values());
    res.json({
        total: users.length,
        users: users.map(user => ({
            userId: user.userId,
            userName: user.userName,
            userType: user.userType,
            connectedAt: user.connectedAt
        }))
    });
});


// Iniciar servidor
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor WebSocket corriendo en puerto ${PORT}`);
    console.log(`🌐 Entorno: ${process.env.NODE_ENV || 'development'}`);

    if (process.env.NODE_ENV === 'production') {
        console.log(`🌐 WebSocket URL: ${process.env.WEBSOCKET_URL}`);
        console.log(`🌐 Cliente URL: ${process.env.CLIENT_URL}`);
        console.log('');
        console.log('📋 URLs de producción:');
        console.log(`   Health: ${process.env.WEBSOCKET_URL}/health`);
        console.log(`   Pruebas: ${process.env.WEBSOCKET_URL}/test.html`);
        console.log(`   Usuarios: ${process.env.WEBSOCKET_URL}/active-users`);
    } else {
        const localIP = getLocalIP();
        console.log(`🌐 Cliente URL permitida: ${process.env.CLIENT_URL || "http://localhost:3000"}`);
        console.log(`📱 Accesible desde dispositivos móviles en: http://${localIP}:${PORT}`);
        console.log('');
        console.log('📋 URLs de prueba:');
        console.log(`   Estado: http://${localIP}:${PORT}/health`);
        console.log(`   Pruebas: http://${localIP}:${PORT}/test.html`);
        console.log(`   Usuarios activos: http://${localIP}:${PORT}/active-users`);
        console.log('');
        console.log('📲 Configuración para Flutter:');
        console.log(`   _wsService.configureServer(url: 'http://${localIP}:${PORT}');`);
    }
    console.log('');
});

// Manejo de errores del servidor
server.on('error', (error) => {
    console.error('Error del servidor:', error);
});

// Manejo de cierre graceful
process.on('SIGTERM', () => {
    console.log('Cerrando servidor WebSocket...');
    server.close(() => {
        console.log('Servidor cerrado correctamente');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('Cerrando servidor WebSocket...');
    server.close(() => {
        console.log('Servidor cerrado correctamente');
        process.exit(0);
    });
});
