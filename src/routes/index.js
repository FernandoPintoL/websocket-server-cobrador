import notificationRoutes from './notification.routes.js';
import healthRoutes from './health.routes.js';
import usersRoutes from './users.routes.js';

export const setupRoutes = (app) => {
    // Rutas de salud y estáticas
    app.use('/', healthRoutes);

    // Rutas de notificaciones
    app.use('/', notificationRoutes);

    // Rutas de usuarios conectados
    app.use('/api/users', usersRoutes);
};
