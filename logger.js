const winston = require('winston');
function creatLoggerForApi(port) {
    return winston.createLogger({
        level: 'info',
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.printf(({ timestamp, level, message }) => `${timestamp} ${level}: ${message}`)
        ),
        transports: [
            // new winston.transports.Console(),
            new winston.transports.File({ filename: `${__dirname}/logs/proxy_${port}.log` }),
            new winston.transports.File({ filename: `${__dirname}/logs/error_${port}.log`, level: 'error' }),
        ]
    });
}

function creatLoggerForCommon() {
    return winston.createLogger({
        level: 'info',
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.printf(({ timestamp, level, message }) => `${timestamp} ${level}: ${message}`)
        ),
        transports: [
            new winston.transports.File({ filename: `${__dirname}/logs/common.log` }),
        ]
    });
}

let loggers = {};
function getApiLogger(port) {
    if (!loggers[port]) {
        loggers[port] = creatLoggerForApi(port);
    }
    return loggers[port];
}

let commonLogger = creatLoggerForCommon();

module.exports = {
    getApiLogger,
    commonLogger
}