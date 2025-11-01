import notificationRoutes from './notification.routes.js';
import healthRoutes from './health.routes.js';
import usersRoutes from './users.routes.js';
import statsRoutes from './stats.routes.js';

export const setupRoutes = (app) => {
    // Rutas de salud y estáticas
    app.use('/', healthRoutes);

    // Rutas de notificaciones
    app.use('/', notificationRoutes);

    // Rutas de estadísticas en tiempo real
    app.use('/', statsRoutes);

    // Rutas de usuarios conectados
    app.use('/api/users', usersRoutes);
};
