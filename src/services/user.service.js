import activeUsersRepository from '../repositories/activeUsers.repository.js';
import socketRepository from '../repositories/socket.repository.js';

class UserService {
    // Obtener todos los usuarios activos
    getActiveUsers() {
        const users = activeUsersRepository.getAllUsers();
        return {
            total: users.length,
            users: users.map(user => ({
                userId: user.userId,
                userName: user.userName,
                userType: user.userType,
                connectedAt: user.connectedAt
            }))
        };
    }

    // Obtener usuarios por tipo
    getUsersByType(userType) {
        return activeUsersRepository.getUsersByType(userType);
    }

    // Verificar si un usuario está conectado
    isUserConnected(userId) {
        return activeUsersRepository.isUserConnected(userId);
    }

    // Contar usuarios activos
    countActiveUsers() {
        return activeUsersRepository.count();
    }

    // Obtener uptime del proceso
    getServerUptime() {
        return process.uptime();
    }

    // Obtener información de salud del servidor (mejorado para producción)
    getHealthInfo() {
        const socketIOReady = socketRepository.io !== null;
        const memoryUsage = process.memoryUsage();

        return {
            status: socketIOReady ? 'OK' : 'DEGRADED',
            message: socketIOReady ? 'WebSocket server is running' : 'Socket.IO not initialized',
            connections: this.countActiveUsers(),
            uptime: Math.floor(this.getServerUptime()),
            socketIO: socketIOReady ? 'ready' : 'not initialized',
            memory: {
                heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
                heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
                rss: Math.round(memoryUsage.rss / 1024 / 1024) // MB
            },
            environment: process.env.NODE_ENV || 'unknown',
            timestamp: new Date().toISOString()
        };
    }
}

export default new UserService();
