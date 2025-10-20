// Logger simple con niveles para producción
// Respeta ENABLE_LOGS y LOG_LEVEL del .env

const LOG_LEVELS = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
};

class Logger {
    constructor() {
        this.enabled = process.env.ENABLE_LOGS !== 'false';
        this.level = LOG_LEVELS[process.env.LOG_LEVEL] ?? LOG_LEVELS.info;
    }

    debug(message, ...args) {
        if (this.enabled && this.level <= LOG_LEVELS.debug) {
            console.log(`[DEBUG] ${message}`, ...args);
        }
    }

    info(message, ...args) {
        if (this.enabled && this.level <= LOG_LEVELS.info) {
            console.log(`[INFO] ${message}`, ...args);
        }
    }

    warn(message, ...args) {
        if (this.enabled && this.level <= LOG_LEVELS.warn) {
            console.warn(`[WARN] ${message}`, ...args);
        }
    }

    error(message, ...args) {
        if (this.enabled && this.level <= LOG_LEVELS.error) {
            console.error(`[ERROR] ${message}`, ...args);
        }
    }

    // Método conveniente para logs de producción críticos (siempre se muestran)
    critical(message, ...args) {
        console.error(`[CRITICAL] ${message}`, ...args);
    }
}

export default new Logger();
