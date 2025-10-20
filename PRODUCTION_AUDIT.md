# Auditoría de Producción - WebSocket Server
**Fecha:** 20 de octubre de 2025  
**Proyecto:** cobrador-websocket-server

## 🔍 Resumen Ejecutivo

**Estado General:** ⚠️ REQUIERE AJUSTES MENORES  
**Nivel de Riesgo:** MEDIO  
**Bloqueantes:** 0  
**Críticos:** 2  
**Recomendados:** 5

---

## ✅ Aspectos Correctos

### 1. Arquitectura Base
- ✅ Estructura modular (controllers, services, repositories)
- ✅ Separación de configuraciones por entorno
- ✅ Manejo de graceful shutdown (SIGTERM, SIGINT)
- ✅ Socket.IO configurado con CORS apropiado
- ✅ Autenticación de backend con WS_SECRET

### 2. Seguridad
- ✅ Middleware `ensureBackend` protege endpoints HTTP
- ✅ Validación de WS_SECRET obligatoria en producción
- ✅ CORS restrictivo en producción (lista blanca)

### 3. Escalabilidad
- ✅ Repositorios singleton para gestión centralizada
- ✅ Normalización de userId a string (consistencia)
- ✅ Sistema de salas para notificaciones por tipo de usuario

---

## ❌ Problemas Críticos (DEBEN CORREGIRSE)

### 1. **Timeouts Socket.IO NO sincronizados con .env.production**
**Severidad:** 🔴 CRÍTICO  
**Impacto:** Desconexiones prematuras en móviles con red inestable

**Problema:**
```javascript
// src/config/socket.config.js - ACTUAL
export const socketConfig = {
    pingTimeout: 30000,      // 30s HARDCODED
    pingInterval: 10000,     // 10s HARDCODED
    upgradeTimeout: 10000,
    maxHttpBufferSize: 1e6,
    allowEIO3: true
};
```

**Tu .env.production define:**
```
SOCKET_PING_TIMEOUT=60000      # 60s
SOCKET_PING_INTERVAL=25000     # 25s
```

**Consecuencia:** Las variables del .env NO se usan; el servidor corre con timeouts más agresivos (30s/10s) que pueden desconectar a clientes móviles antes de lo necesario.

**Solución:** Leer desde process.env con fallbacks.

---

### 2. **Falta validación de variables críticas al arranque**
**Severidad:** 🔴 CRÍTICO  
**Impacto:** El servidor arranca pero falla silenciosamente sin WS_SECRET en producción

**Problema:** Si olvidas setear `WS_SECRET` en Railway, el servidor arranca pero **todos** los requests desde Laravel retornan 401.

**Solución:** Validar variables obligatorias al inicio y abortar si faltan.

---

## ⚠️ Problemas Importantes (RECOMENDADO CORREGIR)

### 3. **Logging sin estructura ni niveles configurables**
**Severidad:** 🟡 MEDIO  
**Impacto:** Logs de producción ruidosos; dificulta debugging

**Problema:** 
- Todos los `console.log` van a stdout sin filtros
- `.env.production` define `LOG_LEVEL=warn` pero NO se usa
- En producción verás logs de cada conexión/desconexión con emojis

**Solución:** Implementar logger con niveles (debug, info, warn, error) que respete `LOG_LEVEL` y `ENABLE_LOGS`.

---

### 4. **CORS permite localhost en producción**
**Severidad:** 🟡 MEDIO  
**Impacto:** Superficie de ataque innecesaria

**Problema:**
```javascript
return process.env.NODE_ENV === 'production'
    ? [
        process.env.CLIENT_URL,
        process.env.MOBILE_CLIENT_URL,
        process.env.WEBSOCKET_URL,
        "capacitor://localhost",    // OK para Capacitor
        "ionic://localhost",         // OK para Ionic
        "http://localhost"           // ⚠️ NO NECESARIO en prod
    ]
```

**Solución:** Remover `http://localhost` de producción (capacitor/ionic son OK para apps móviles).

---

### 5. **Sin healthcheck de dependencias**
**Severidad:** 🟡 MEDIO  
**Impacto:** Healthcheck dice "OK" aunque el servidor no pueda operar

**Problema:** El endpoint `/health` solo retorna uptime y conexiones, no valida:
- Socket.IO inicializado
- Repositorio funcionando
- Memory footprint aceptable

**Solución:** Extender healthcheck para validar estado real.

---

### 6. **Sin rate limiting en endpoints HTTP**
**Severidad:** 🟡 MEDIO  
**Impacto:** Vulnerable a DoS desde Laravel comprometido o leak de WS_SECRET

**Solución:** Agregar express-rate-limit a `/notify`, `/credit-notification`, `/payment-notification`.

---

### 7. **Sin métricas de observabilidad**
**Severidad:** 🟢 BAJO  
**Impacto:** Difícil diagnosticar problemas en producción sin métricas

**Recomendación:** Agregar endpoint `/metrics` con:
- Total conexiones activas
- Notificaciones enviadas por minuto
- Errores 401/500
- Usuarios por tipo (cobradores, managers, etc.)

---

## 🛠️ Correcciones Aplicadas

### 1. Sincronizar timeouts de Socket.IO con .env
**Archivo:** `src/config/socket.config.js`

**Cambio:**
```javascript
// Leer timeouts desde variables de entorno
export const socketConfig = {
    pingTimeout: parseInt(process.env.SOCKET_PING_TIMEOUT) || 60000,
    pingInterval: parseInt(process.env.SOCKET_PING_INTERVAL) || 25000,
    upgradeTimeout: 10000,
    maxHttpBufferSize: parseInt(process.env.SOCKET_MAX_HTTP_BUFFER_SIZE) || 1048576,
    allowEIO3: true
};
```

---

### 2. Validación de variables obligatorias
**Archivo:** `server.js` (inicio)

**Cambio:**
```javascript
// Validar variables críticas antes de arrancar
if (process.env.NODE_ENV === 'production') {
    if (!process.env.WS_SECRET) {
        console.error('❌ FATAL: WS_SECRET no configurado en producción');
        process.exit(1);
    }
    if (!process.env.CLIENT_URL) {
        console.warn('⚠️ CLIENT_URL no configurado. CORS puede fallar.');
    }
}
```

---

### 3. Logger con niveles
**Archivo:** `src/utils/logger.js` (nuevo)

**Cambio:** Implementar logger simple que respete `LOG_LEVEL`.

---

### 4. CORS limpio en producción
**Archivo:** `src/config/cors.config.js`

**Cambio:**
```javascript
export const getCorsOrigins = () => {
    if (process.env.NODE_ENV === 'production') {
        return [
            process.env.CLIENT_URL,
            process.env.MOBILE_CLIENT_URL,
            process.env.WEBSOCKET_URL,
            "capacitor://localhost",
            "ionic://localhost"
        ].filter(Boolean); // Remover undefined/null
    }
    return '*'; // Desarrollo permite todo
};
```

---

### 5. Healthcheck mejorado
**Archivo:** `src/services/user.service.js`

**Cambio:**
```javascript
getHealthInfo() {
    const socketIOReady = socketRepository.io !== null;
    return {
        status: socketIOReady ? 'OK' : 'DEGRADED',
        message: 'WebSocket server is running',
        connections: this.countActiveUsers(),
        uptime: Math.floor(this.getServerUptime()),
        socketIO: socketIOReady ? 'ready' : 'not initialized',
        memory: process.memoryUsage().heapUsed / 1024 / 1024, // MB
        timestamp: new Date().toISOString()
    };
}
```

---

## 📋 Checklist de Despliegue

Antes de desplegar en Railway:

- [ ] Verificar variables en Railway:
  - `NODE_ENV=production`
  - `WS_SECRET=<mismo-que-laravel>`
  - `CLIENT_URL=https://cobrador-web-production.up.railway.app`
  - `MOBILE_CLIENT_URL=<url-o-igual>`
  - `WEBSOCKET_URL=https://websocket-server-cobrador-production.up.railway.app`
  - **NO setear** `PORT` (Railway lo asigna)

- [ ] Confirmar que Railway tiene el build command correcto:
  - `npm install` (default)

- [ ] Confirmar start command:
  - `npm start` o `node server.js`

- [ ] Probar healthcheck después del deploy:
  - `curl https://websocket-server-cobrador-production.up.railway.app/health`

- [ ] Verificar logs de Railway para:
  - "🚀 Servidor WebSocket corriendo en puerto X"
  - NO debe verse "❌ FATAL: WS_SECRET no configurado"

- [ ] Probar desde Laravel:
  - `php artisan websocket:diagnose`
  - Debe retornar `status: "OK"`

---

## 🎯 Próximos Pasos Recomendados

### Corto plazo (sprint actual)
1. ✅ Aplicar correcciones críticas (timeouts, validación)
2. ✅ Implementar logger básico
3. ✅ Limpiar CORS de producción
4. ⏳ Agregar rate limiting (express-rate-limit)

### Mediano plazo (próximo mes)
- Agregar métricas con Prometheus o endpoint `/metrics`
- Implementar reconnect automático en clientes con backoff exponencial
- Agregar tests de integración (supertest + socket.io-client)
- Monitoreo de latencia de notificaciones

### Largo plazo (roadmap)
- Migrar a Redis Adapter para Socket.IO (escalabilidad horizontal)
- Implementar persistent sessions (Redis store)
- Agregar dashboard de monitoreo en tiempo real

---

## 📊 Métricas de Calidad

| Aspecto | Puntuación | Notas |
|---------|-----------|-------|
| Seguridad | 8/10 | Falta rate limiting |
| Escalabilidad | 7/10 | Sin Redis adapter |
| Observabilidad | 5/10 | Sin métricas estructuradas |
| Mantenibilidad | 9/10 | Código limpio y modular |
| Resiliencia | 7/10 | Falta manejo de edge cases |
| **TOTAL** | **7.2/10** | ✅ Apto para producción con ajustes |

---

## ✅ Conclusión

El servidor WebSocket está **funcionalmente completo** pero requiere ajustes para producción robusta:

**BLOQUEANTE (deploy ahora):**
- ❌ Ninguno

**CRÍTICO (deploy esta semana):**
- Sincronizar timeouts Socket.IO con .env
- Validar WS_SECRET al arranque

**RECOMENDADO (próxima iteración):**
- Logger con niveles
- Limpiar CORS
- Healthcheck extendido
- Rate limiting

**Recomendación:** ✅ Procede con el deploy después de aplicar las correcciones críticas (ya incluidas en los patches).
