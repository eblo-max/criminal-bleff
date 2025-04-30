const winston = require('winston');
const fs = require('fs');
const path = require('path');

// Создаем директорию для логов если её нет
const logDir = 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Настройка формата логов
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

// Функция создания логгера
const createLogger = (service) => {
  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { service },
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      }),
      new winston.transports.File({
        filename: path.join(logDir, 'error.log'),
        level: 'error'
      }),
      new winston.transports.File({
        filename: path.join(logDir, 'combined.log')
      })
    ]
  });
};

// Очистка старых логов
const cleanupOldLogs = () => {
  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 дней
  const now = Date.now();

  fs.readdir(logDir, (err, files) => {
    if (err) {
      console.error('Error reading logs directory:', err);
      return;
    }

    files.forEach(file => {
      const filePath = path.join(logDir, file);
      fs.stat(filePath, (err, stats) => {
        if (err) {
          console.error('Error getting file stats:', err);
          return;
        }

        if (now - stats.mtime.getTime() > maxAge) {
          fs.unlink(filePath, err => {
            if (err) {
              console.error('Error deleting old log file:', err);
            }
          });
        }
      });
    });
  });
};

// Запускаем очистку старых логов каждые 24 часа
let cleanupInterval;
if (process.env.NODE_ENV !== 'test') {
  cleanupInterval = setInterval(cleanupOldLogs, 24 * 60 * 60 * 1000);
}

// Функция для остановки интервала очистки
const stopCleanup = () => {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
  }
};

module.exports = {
  createLogger,
  stopCleanup
}; 