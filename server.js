/* eslint-env node */
import express from 'express';
import http from 'http';
import { Server as socketIo } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { getLocalIP } from './network-utils.js';
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
        process.env.MOBILE_CLIENT_URL || "http://192.168.5.44:3000",
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

// API endpoint para notificaciones externas (Laravel)
app.post('/notify', (req, res) => {
    const { event, data } = req.body;

    console.log('📡 Received notification from external source:', event, data);

    // Enviar notificación a todos los clientes conectados o específicos
    if (data.user_id) {
        // Buscar socket específico del usuario
        const userSocket = Array.from(activeUsers.entries())
            .find(([socketId, userData]) => userData.userId == data.user_id);

        if (userSocket) {
            const [socketId] = userSocket;
            io.to(socketId).emit(event, data);
            console.log(`📨 Notification sent to user ${data.user_id}:`, event);
        } else {
            console.log(`⚠️ User ${data.user_id} not connected`);
        }
    } else {
        // Broadcast a todos los usuarios conectados
        io.emit(event, data);
        console.log(`📢 Broadcast notification sent:`, event);
    }

    res.json({
        success: true,
        message: 'Notification sent',
        event: event,
        target: data.user_id ? `user ${data.user_id}` : 'all users'
    });
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
            } else if (userType === 'admin') {
                socket.join('admins');
                socket.join('cobradores'); // Los admins también reciben notificaciones de cobradores
            }

            // Unir a sala personal
            socket.join(`user_${userId}`);

            console.log(`Usuario autenticado: ${userName} (${userType}) - ID: ${userId}`);

            // Confirmar autenticación
            socket.emit('authenticated', {
                success: true,
                message: 'Autenticación exitosa'
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

    // Evento para enviar notificaciones de créditos
    socket.on('credit_notification', (data) => {
        const { targetUserId, notification, userType } = data;

        // Enviar a usuario específico
        if (targetUserId) {
            io.to(`user_${targetUserId}`).emit('new_credit_notification', notification);
        }

        // Enviar a todos los usuarios de un tipo específico
        if (userType) {
            if (userType === 'cobrador') {
                io.to('cobradores').emit('new_credit_notification', notification);
            } else if (userType === 'admin') {
                io.to('admins').emit('new_credit_notification', notification);
            }
        }

        console.log('Notificación de crédito enviada:', notification);
    });

    // Evento para actualizaciones de pagos
    socket.on('payment_update', (data) => {
        const { cobradorId, clientId, payment } = data;

        // Notificar al cobrador
        if (cobradorId) {
            io.to(`user_${cobradorId}`).emit('payment_updated', payment);
        }

        // Notificar al cliente
        if (clientId) {
            io.to(`user_${clientId}`).emit('payment_updated', payment);
        }

        // Notificar a admins
        io.to('admins').emit('payment_updated', payment);

        console.log('Actualización de pago enviada:', payment);
    });

    // Evento para notificaciones de rutas
    socket.on('route_notification', (data) => {
        const { cobradorId, routeUpdate } = data;

        // Notificar al cobrador específico
        if (cobradorId) {
            io.to(`user_${cobradorId}`).emit('route_updated', routeUpdate);
        }

        // Notificar a admins
        io.to('admins').emit('route_updated', routeUpdate);

        console.log('Notificación de ruta enviada:', routeUpdate);
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

// Función para enviar notificación desde API externa
app.post('/notify', (req, res) => {
    const { userId, userType, notification, event } = req.body;

    try {
        if (userId) {
            // Notificar a usuario específico
            io.to(`user_${userId}`).emit(event || 'notification', notification);
        } else if (userType) {
            // Notificar a todos los usuarios de un tipo
            io.to(userType + 's').emit(event || 'notification', notification);
        }

        res.json({ success: true, message: 'Notificación enviada' });
    } catch (error) {
        console.error('Error enviando notificación:', error);
        res.status(500).json({ success: false, error: error.message });
    }
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