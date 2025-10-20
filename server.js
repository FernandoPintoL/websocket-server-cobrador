import express from 'express';
import http from 'http';
import { Server as socketIo } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Importar configuraciones
import { expressCorOptions, socketCorsOptions } from './src/config/cors.config.js';
import { socketConfig, getPort } from './src/config/socket.config.js';

// Importar rutas
import { setupRoutes } from './src/routes/index.js';

// Importar repositorios (necesarios para inicializar)
import socketRepository from './src/repositories/socket.repository.js';

// Importar controladores
import socketController from './src/controllers/socket.controller.js';

// Importar utilidades
import { getLocalIP } from './src/utils/network-utils.js';

// Cargar variables de entorno
dotenv.config();

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Crear aplicación Express
const app = express();
const server = http.createServer(app);

// Configurar Socket.IO
const io = new socketIo(server, {
    cors: socketCorsOptions,
    ...socketConfig
});

// Middleware
app.use(cors(expressCorOptions));
app.use(express.json());

// Servir archivos estáticos
app.use(express.static(__dirname));

// Inicializar repositorio de Socket.IO
socketRepository.setIO(io);

// Configurar rutas
setupRoutes(app);

// Manejar conexiones de Socket.IO
io.on('connection', (socket) => {
    socketController.handleConnection(socket);
});

// Iniciar el servidor
const PORT = getPort();
server.listen(PORT, '0.0.0.0', () => {
    const localIP = getLocalIP();
    console.log(`\n🚀 Servidor WebSocket corriendo en puerto ${PORT}`);
    console.log(`\n🌐 Entorno: ${process.env.NODE_ENV}`);
    console.log(`\n📡 Escuchando en todas las interfaces (0.0.0.0:${PORT})`);

    console.log(`\n🌐 Servidor accesible en:`);
    console.log(`   Local: http://localhost:${PORT}`);
    console.log(`   Red local: http://${localIP}:${PORT}`);

    if (process.env.NODE_ENV === 'development') {
        console.log(`\n🔧 Configuración de desarrollo:`);
        console.log(`   CORS: Permitiendo cualquier origen (*)`);
        console.log(`   Cliente configurado: ${process.env.CLIENT_URL || 'No configurado'}`);
        console.log(`\n⚠️  DIAGNÓSTICO DE CONECTIVIDAD:`);
        console.log(`   Si no puedes acceder desde otra PC, verifica:`);
        console.log(`   1. Firewall de Windows - Puerto ${PORT} debe estar abierto`);
        console.log(`   2. Red local - Ambas PCs en la misma red`);
        console.log(`   3. IP correcta - Usar ${localIP}:${PORT}`);
        console.log(`\n🧪 Prueba de conectividad desde otra PC:`);
        console.log(`   Navegador: http://${localIP}:${PORT}`);
        console.log(`   Telnet: telnet ${localIP} ${PORT}`);
    }
});

// Manejo de errores del servidor
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`❌ El puerto ${PORT} ya está en uso`);
        console.error('   Intenta detener el proceso anterior o usar otro puerto');
        process.exit(1);
    } else {
        console.error('❌ Error del servidor:', error);
        process.exit(1);
    }
});

// Manejo de cierre graceful
const gracefulShutdown = (signal) => {
    console.log(`\n${signal} recibido: Cerrando servidor WebSocket...`);

    // Notificar a todos los clientes sobre el cierre
    io.emit('server_shutdown', {
        message: 'El servidor se está cerrando. Por favor reconecta en breve.',
        timestamp: new Date().toISOString()
    });

    // Cerrar todas las conexiones de Socket.IO
    io.close(() => {
        console.log('✅ Todas las conexiones de Socket.IO cerradas');

        // Cerrar el servidor HTTP
        server.close(() => {
            console.log('✅ Servidor HTTP cerrado');
            console.log('👋 Servidor cerrado correctamente');
            process.exit(0);
        });
    });
    // Forzar cierre después de 10 segundos si no se cerró correctamente
    setTimeout(() => {
        console.error('⚠️  No se pudo cerrar correctamente. Forzando cierre...');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
    console.error('❌ Excepción no capturada:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promesa rechazada no manejada:', reason);
    gracefulShutdown('UNHANDLED_REJECTION');
});
