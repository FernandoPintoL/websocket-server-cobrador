@echo off
echo 🚀 Preparando despliegue a Railway...

REM Verificar que estamos en el directorio correcto
if not exist "server.js" (
    echo ❌ Error: No se encuentra server.js. Ejecuta desde el directorio websocket-server/
    exit /b 1
)

REM Verificar que Railway CLI está instalado
where railway >nul 2>nul
if %errorlevel% neq 0 (
    echo ⚠️ Railway CLI no está instalado. Instalando...
    npm install -g @railway/cli
)

REM Login a Railway (si no está logueado)
echo 🔐 Verificando login en Railway...
railway login

REM Vincular proyecto (si no está vinculado)
echo 🔗 Vinculando proyecto...
railway link

REM Configurar variables de entorno en Railway
echo ⚙️ Configurando variables de entorno...

railway variables set NODE_ENV=production
railway variables set WEBSOCKET_PORT=3001
railway variables set WEBSOCKET_URL=https://websocket-server-cobrador-production.up.railway.app
railway variables set CLIENT_URL=https://cobrador-web-production.up.railway.app
railway variables set MOBILE_CLIENT_URL=https://cobrador-web-production.up.railway.app
railway variables set JWT_SECRET="CobradorApp2025SecureWebSocketJWTKey64CharsMinimumForProductionSecurity"
railway variables set LOG_LEVEL=warn
railway variables set CORS_ORIGINS="https://cobrador-web-production.up.railway.app,https://websocket-server-cobrador-production.up.railway.app,capacitor://localhost,ionic://localhost"
railway variables set ALLOWED_ORIGINS="https://cobrador-web-production.up.railway.app,https://websocket-server-cobrador-production.up.railway.app,capacitor://localhost,ionic://localhost"
railway variables set RAILWAY_STATIC_URL=https://websocket-server-cobrador-production.up.railway.app
railway variables set RAILWAY_PUBLIC_DOMAIN=websocket-server-cobrador-production.up.railway.app

echo 📦 Desplegando a Railway...
railway up

echo ✅ Despliegue completado!
echo 🌐 Tu WebSocket está disponible en: https://websocket-server-cobrador-production.up.railway.app
echo 🏥 Health check: https://websocket-server-cobrador-production.up.railway.app/health
echo 🧪 Página de prueba: https://websocket-server-cobrador-production.up.railway.app/test.html

pause
