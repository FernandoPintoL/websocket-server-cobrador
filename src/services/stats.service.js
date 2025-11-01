import socketRepository from '../repositories/socket.repository.js';
import activeUsersRepository from '../repositories/activeUsers.repository.js';

class StatsService {
    /**
     * Enviar estadísticas globales a todos los usuarios
     */
    broadcastGlobalStats(stats) {
        socketRepository.emitToAll('stats.global.updated', {
            type: 'global',
            stats,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Enviar estadísticas de un cobrador al cobrador y a su manager
     */
    broadcastCobradorStats(cobradorId, stats) {
        // Enviar al cobrador
        socketRepository.emitToUser(cobradorId, 'stats.cobrador.updated', {
            type: 'cobrador',
            user_id: cobradorId,
            stats,
            timestamp: new Date().toISOString()
        });

        console.log(`   → Enviado a cobrador ${cobradorId}`);

        // También enviar a todos en la sala de cobradores (para dashboards de managers)
        socketRepository.emitToRoom('cobradors', 'stats.cobrador.updated', {
            type: 'cobrador',
            user_id: cobradorId,
            stats,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Enviar estadísticas de un manager
     */
    broadcastManagerStats(managerId, stats) {
        // Enviar al manager
        socketRepository.emitToUser(managerId, 'stats.manager.updated', {
            type: 'manager',
            user_id: managerId,
            stats,
            timestamp: new Date().toISOString()
        });

        console.log(`   → Enviado a manager ${managerId}`);

        // También enviar a todos en la sala de managers
        socketRepository.emitToRoom('managers', 'stats.manager.updated', {
            type: 'manager',
            user_id: managerId,
            stats,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Obtener estadísticas cachadas del repositorio (si existen)
     */
    getCachedStats(type, userId = null) {
        // Este método permite que los clientes puedan solicitar stats
        // en caso de haber perdido la conexión
        return {
            type,
            user_id: userId,
            message: 'Stats cached (if any)'
        };
    }
}

export default new StatsService();
