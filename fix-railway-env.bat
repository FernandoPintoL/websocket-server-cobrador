@echo off
echo 🔧 Configurando variables de entorno en Railway...

REM Variable crítica para Railway
railway variables set PORT=3001

REM Variables de aplicación
railway variables set NODE_ENV=production
railway variables set WEBSOCKET_PORT=3001
railway variables set WEBSOCKET_URL=https://websocket-server-cobrador-production.up.railway.app
railway variables set CLIENT_URL=https://cobrador-web-production.up.railway.app
railway variables set MOBILE_CLIENT_URL=https://cobrador-web-production.up.railway.app
railway variables set JWT_SECRET=CobradorApp2025SecureWebSocketJWTKey64CharsMinimumForProductionSecurity
railway variables set LOG_LEVEL=warn
railway variables set CORS_ORIGINS="https://cobrador-web-production.up.railway.app,https://websocket-server-cobrador-production.up.railway.app,capacitor://localhost,ionic://localhost"
railway variables set ALLOWED_ORIGINS="https://cobrador-web-production.up.railway.app,https://websocket-server-cobrador-production.up.railway.app,capacitor://localhost,ionic://localhost"
railway variables set RAILWAY_STATIC_URL=https://websocket-server-cobrador-production.up.railway.app
railway variables set RAILWAY_PUBLIC_DOMAIN=websocket-server-cobrador-production.up.railway.app

echo ✅ Variables configuradas!
echo 🚀 Desplegando con nueva configuración...
railway up --detach

echo 📊 Ver logs en tiempo real:
echo railway logs --follow

pause
