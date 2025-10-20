// Configuración de Socket.IO optimizada para móviles
// Los valores se leen desde .env para permitir ajustes sin rebuild
export const socketConfig = {
    pingTimeout: parseInt(process.env.SOCKET_PING_TIMEOUT) || 60000,
    pingInterval: parseInt(process.env.SOCKET_PING_INTERVAL) || 25000,
    upgradeTimeout: 10000,
    maxHttpBufferSize: parseInt(process.env.SOCKET_MAX_HTTP_BUFFER_SIZE) || 1048576,
    allowEIO3: true
};

// Puerto del servidor
export const getPort = () => {
    return process.env.PORT || process.env.WEBSOCKET_PORT || 3001;
};
