import statsService from '../services/stats.service.js';

class StatsController {
    // Manejar actualización de estadísticas desde Laravel
    async handleStatsUpdate(req, res) {
        try {
            const { type, stats, user_id } = req.body;

            console.log(`📊 Recibida actualización de estadísticas: tipo=${type}, user_id=${user_id}`);

            let success = false;

            // Tipos de estadísticas soportadas
            switch (type) {
                case 'global':
                    // Enviar a todos los usuarios
                    statsService.broadcastGlobalStats(stats);
                    success = true;
                    console.log('📊 Estadísticas globales broadcast a todos');
                    break;

                case 'cobrador':
                    // Enviar al cobrador específico y su manager si existe
                    if (user_id) {
                        statsService.broadcastCobradorStats(user_id, stats);
                        success = true;
                        console.log(`📊 Estadísticas del cobrador ${user_id} enviadas`);
                    }
                    break;

                case 'manager':
                    // Enviar al manager específico
                    if (user_id) {
                        statsService.broadcastManagerStats(user_id, stats);
                        success = true;
                        console.log(`📊 Estadísticas del manager ${user_id} enviadas`);
                    }
                    break;

                default:
                    console.warn(`⚠️ Tipo de estadística desconocido: ${type}`);
                    success = false;
            }

            res.json({
                success,
                message: success ? 'Estadísticas enviadas correctamente' : 'Tipo de estadística no válido',
                type,
                user_id: user_id || null
            });
        } catch (error) {
            console.error('❌ Error enviando estadísticas:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

export default new StatsController();
