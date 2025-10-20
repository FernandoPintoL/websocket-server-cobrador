import dotenv from 'dotenv';
dotenv.config();

// Configuración de orígenes CORS
export const getCorsOrigins = () => {
    if (process.env.NODE_ENV === 'production') {
        // En producción, solo permitir orígenes específicos
        return [
            process.env.CLIENT_URL,
            process.env.MOBILE_CLIENT_URL,
            process.env.WEBSOCKET_URL,
            "capacitor://localhost",
            "ionic://localhost"
        ].filter(Boolean); // Remover valores undefined/null
    }
    // En desarrollo, permitir cualquier origen
    return '*';
};

// Configuración CORS para Express
export const expressCorOptions = {
    origin: getCorsOrigins(),
    credentials: true
};

// Configuración CORS para Socket.IO
export const socketCorsOptions = {
    origin: getCorsOrigins(),
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowEIO3: true
};
