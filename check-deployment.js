#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Verificando configuración para despliegue en Railway...\n');

const checks = [
    {
        name: 'Archivo package.json',
        check: () => fs.existsSync(path.join(__dirname, 'package.json')),
        fix: 'Asegúrate de que package.json existe'
    },
    {
        name: 'Archivo server.js',
        check: () => fs.existsSync(path.join(__dirname, 'server.js')),
        fix: 'Asegúrate de que server.js existe'
    },
    {
        name: 'Archivo .env',
        check: () => fs.existsSync(path.join(__dirname, '.env')),
        fix: 'Crea el archivo .env con las variables necesarias'
    },
    {
        name: 'Archivo railway.json',
        check: () => fs.existsSync(path.join(__dirname, 'railway.json')),
        fix: 'El archivo railway.json se ha creado automáticamente'
    },
    {
        name: 'Archivo network-utils.js',
        check: () => fs.existsSync(path.join(__dirname, 'network-utils.js')),
        fix: 'network-utils.js es requerido por server.js'
    },
    {
        name: 'Archivo test.html',
        check: () => fs.existsSync(path.join(__dirname, 'test.html')),
        fix: 'test.html es usado para pruebas del WebSocket'
    },
    {
        name: 'Script de despliegue Windows',
        check: () => fs.existsSync(path.join(__dirname, 'deploy-railway.bat')),
        fix: 'Script de despliegue para Windows creado'
    },
    {
        name: 'Script de despliegue Unix',
        check: () => fs.existsSync(path.join(__dirname, 'deploy-railway.sh')),
        fix: 'Script de despliegue para Linux/Mac creado'
    }
];

let allPassed = true;

checks.forEach((check, index) => {
    const passed = check.check();
    const icon = passed ? '✅' : '❌';
    const status = passed ? 'OK' : 'FALTA';

    console.log(`${icon} ${check.name}: ${status}`);

    if (!passed) {
        console.log(`   💡 ${check.fix}`);
        allPassed = false;
    }
});

console.log('\n📋 Verificando variables de entorno en .env...');

if (fs.existsSync(path.join(__dirname, '.env'))) {
    const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');

    const requiredVars = [
        'NODE_ENV',
        'WEBSOCKET_PORT',
        'WEBSOCKET_URL',
        'CLIENT_URL',
        'MOBILE_CLIENT_URL',
        'JWT_SECRET',
        'LOG_LEVEL',
        'CORS_ORIGINS'
    ];

    requiredVars.forEach(varName => {
        const hasVar = envContent.includes(`${varName}=`);
        const icon = hasVar ? '✅' : '❌';
        const status = hasVar ? 'Configurado' : 'Falta';

        console.log(`${icon} ${varName}: ${status}`);

        if (!hasVar) {
            allPassed = false;
        }
    });
} else {
    console.log('❌ Archivo .env no encontrado');
    allPassed = false;
}

console.log('\n📦 Verificando dependencias...');

if (fs.existsSync(path.join(__dirname, 'package.json'))) {
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));

    const requiredDeps = [
        'socket.io',
        'express',
        'cors',
        'dotenv'
    ];

    requiredDeps.forEach(dep => {
        const hasDep = packageJson.dependencies && packageJson.dependencies[dep];
        const icon = hasDep ? '✅' : '❌';
        const status = hasDep ? `v${packageJson.dependencies[dep]}` : 'Falta';

        console.log(`${icon} ${dep}: ${status}`);

        if (!hasDep) {
            allPassed = false;
        }
    });

    // Verificar scripts
    const hasStartScript = packageJson.scripts && packageJson.scripts.start;
    console.log(`${hasStartScript ? '✅' : '❌'} Script start: ${hasStartScript ? 'OK' : 'Falta'}`);

    if (!hasStartScript) {
        allPassed = false;
    }
}

console.log('\n' + '='.repeat(50));

if (allPassed) {
    console.log('🎉 ¡Todo está listo para el despliegue en Railway!');
    console.log('\n📝 Próximos pasos:');
    console.log('1. Ejecuta: railway login');
    console.log('2. Ejecuta: railway link (si no está vinculado)');
    console.log('3. Ejecuta: railway up');
    console.log('4. O usa el script: ./deploy-railway.bat (Windows) o ./deploy-railway.sh (Unix)');
    console.log('\n🌐 URLs importantes:');
    console.log('- WebSocket: https://websocket-server-cobrador-production.up.railway.app');
    console.log('- Health Check: https://websocket-server-cobrador-production.up.railway.app/health');
    console.log('- Pruebas: https://websocket-server-cobrador-production.up.railway.app/test.html');
} else {
    console.log('⚠️  Hay configuraciones pendientes antes del despliegue.');
    console.log('   Revisa los elementos marcados con ❌ y corrígelos.');
    console.log('\n💡 Para obtener ayuda, revisa el archivo DEPLOYMENT.md');
}

console.log('\n🔗 Recursos útiles:');
console.log('- Documentación: ./DEPLOYMENT.md');
console.log('- Railway CLI: npm install -g @railway/cli');
console.log('- Dashboard Railway: https://railway.app/dashboard');

process.exit(allPassed ? 0 : 1);
