/**
 * Модуль логирования для приложения "Криминальный Блеф"
 */

import winston from 'winston';
import config from '../config/index.js';

// Создаем кастомные форматы
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, module, ...rest } = info;
    const moduleStr = module ? `[${module}]` : '';
    const restString = Object.keys(rest).length ? JSON.stringify(rest, null, 2) : '';
    
    return `${timestamp} ${level.toUpperCase()} ${moduleStr} ${message} ${restString}`;
  })
);

// Набор предустановленных транспортов для разных окружений
const transports = [];

// Для разработки выводим в консоль
if (config.env === 'development') {
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        customFormat
      ),
      level: 'debug'
    })
  );
}

// Для продакшена пишем в файлы и только важные ошибки в консоль
if (config.env === 'production') {
  // Логи ошибок
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      level: 'info',
      maxsize: 5242880, // 5MB
      maxFiles: 10
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        customFormat
      ),
      level: 'warn' // В консоль только warnings и errors
    })
  );
}

// Создаем базовый логгер
const logger = winston.createLogger({
  level: config.env === 'development' ? 'debug' : 'info',
  format: customFormat,
  transports,
  exitOnError: false
});

// Создаем фабрику логгеров для разных модулей
export function createLogger(moduleName) {
  // Создаем детский логгер с указанием модуля
  return logger.child({ module: moduleName });
}

// Мидлвэр для логирования запросов
export function requestLogger() {
  const requestLog = createLogger('HTTP');
  
  return (req, res, next) => {
    const start = Date.now();
    
    // Логируем начало запроса
    requestLog.debug(`${req.method} ${req.originalUrl} - Request started`);
    
    // Логируем завершение запроса
    res.on('finish', () => {
      const duration = Date.now() - start;
      const status = res.statusCode;
      
      const level = status >= 500 ? 'error' :
                   status >= 400 ? 'warn' :
                   'info';
      
      requestLog[level](
        `${req.method} ${req.originalUrl} - ${status} ${res.statusMessage} - ${duration}ms`
      );
    });
    
    next();
  };
}

export default {
  createLogger,
  requestLogger
}; 