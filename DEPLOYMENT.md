# 🚀 WebSocket Server - Despliegue en Railway

## 📋 Pasos para Despliegue

### 1. Preparación Local
```bash
# Navegar al directorio del websocket
cd websocket-server

# Instalar Railway CLI (si no está instalado)
npm install -g @railway/cli

# Login en Railway
railway login
```

### 2. Configuración en Railway Dashboard

#### Variables de Entorno (Configurar en Railway Dashboard):
```env
NODE_ENV=production
WEBSOCKET_PORT=3001
WEBSOCKET_URL=https://websocket-server-cobrador-production.up.railway.app
CLIENT_URL=https://cobrador-web-production.up.railway.app
MOBILE_CLIENT_URL=https://cobrador-web-production.up.railway.app
JWT_SECRET=CobradorApp2025SecureWebSocketJWTKey64CharsMinimumForProductionSecurity
LOG_LEVEL=warn
CORS_ORIGINS=https://cobrador-web-production.up.railway.app,https://websocket-server-cobrador-production.up.railway.app,capacitor://localhost,ionic://localhost
ALLOWED_ORIGINS=https://cobrador-web-production.up.railway.app,https://websocket-server-cobrador-production.up.railway.app,capacitor://localhost,ionic://localhost
RAILWAY_STATIC_URL=https://websocket-server-cobrador-production.up.railway.app
RAILWAY_PUBLIC_DOMAIN=websocket-server-cobrador-production.up.railway.app
```

### 3. Despliegue Automático
```bash
# Opción 1: Usar script automatizado (Windows)
deploy-railway.bat

# Opción 2: Usar script automatizado (Linux/Mac)
chmod +x deploy-railway.sh
./deploy-railway.sh

# Opción 3: Despliegue manual
railway link
railway up
```

### 4. Verificación Post-Despliegue

#### URLs de Verificación:
- **Health Check**: https://websocket-server-cobrador-production.up.railway.app/health
- **Página de Prueba**: https://websocket-server-cobrador-production.up.railway.app/test.html
- **Usuarios Activos**: https://websocket-server-cobrador-production.up.railway.app/active-users

#### Prueba de Conexión WebSocket:
```javascript
// En tu aplicación Flutter/React
const wsUrl = 'wss://websocket-server-cobrador-production.up.railway.app';
const socket = io(wsUrl);

socket.on('connect', () => {
    console.log('✅ Conectado al WebSocket de producción');
});
```

### 5. Configuración para Aplicaciones Cliente

#### Flutter/React Native:
```dart
class WebSocketConfig {
    static const String productionUrl = 'wss://websocket-server-cobrador-production.up.railway.app';
    static const String developmentUrl = 'ws://192.168.1.100:3001';
    
    static String get serverUrl {
        return kReleaseMode ? productionUrl : developmentUrl;
    }
}
```

#### React/Vue.js:
```javascript
const WEBSOCKET_URL = process.env.NODE_ENV === 'production' 
    ? 'wss://websocket-server-cobrador-production.up.railway.app'
    : 'ws://localhost:3001';

const socket = io(WEBSOCKET_URL, {
    transports: ['websocket', 'polling']
});
```

### 6. Monitoreo y Logs

#### Ver Logs en Tiempo Real:
```bash
railway logs --follow
```

#### Ver Estado del Servicio:
```bash
railway status
```

#### Reiniciar Servicio:
```bash
railway service restart
```

## 🔧 Troubleshooting

### Problemas Comunes:

1. **Error de CORS**:
   - Verificar que CLIENT_URL está configurado correctamente
   - Agregar el dominio a CORS_ORIGINS

2. **Conexión WebSocket falla**:
   - Verificar que la URL usa `wss://` (no `ws://`)
   - Comprobar que el puerto 3001 está expuesto

3. **Variables de entorno no se cargan**:
   - Verificar en Railway Dashboard > Variables
   - Reiniciar el servicio después de cambios

### Commands Útiles:
```bash
# Ver variables de entorno
railway variables

# Conectar a terminal del contenedor
railway shell

# Ver información del proyecto
railway info
```

## 📱 Configuración para Apps Móviles

### Configuración de Red:
- **URL Producción**: `wss://websocket-server-cobrador-production.up.railway.app`
- **Transports**: `['websocket', 'polling']`
- **Timeout**: `5000ms`
- **Reconnection**: `true`

### Headers Requeridos:
```javascript
{
    'Origin': 'https://cobrador-web-production.up.railway.app'
}
```

## ✅ Checklist de Producción

- [ ] Variables de entorno configuradas en Railway
- [ ] SSL/HTTPS funcionando (automático en Railway)
- [ ] CORS configurado correctamente
- [ ] Health check respondiendo
- [ ] WebSocket conectando desde cliente
- [ ] Logs configurados apropiadamente
- [ ] Apps móviles usando URL de producción
- [ ] Autenticación JWT funcionando
- [ ] Notificaciones en tiempo real activas

## 🆘 Soporte

Si tienes problemas:
1. Revisa los logs: `railway logs`
2. Verifica el health check
3. Confirma las variables de entorno
4. Prueba la conexión desde el navegador
