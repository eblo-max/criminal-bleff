import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import express from 'express';
import { createLogger, format, transports } from 'winston';
import helmet from 'helmet';
import cors from 'cors';
import formidable from 'express-formidable';
import { setupMiddleware, setupRoutes, setupErrorHandling } from './config/app.js';
import { connectDB, closeDB } from './config/database.js';
import { connectRedis, closeRedis } from './config/redis.js';
import http from 'http';
import mongoose from 'mongoose';
import config from './config/index.js';

// Настройка путей для ES модулей
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Загрузка переменных окружения
dotenv.config();
dotenv.config({ path: join(dirname(__dirname), 'src/config/admin.env') });

// Проверяем основные переменные окружения и логируем только режим работы
console.log('Environment loaded:', {
  NODE_ENV: process.env.NODE_ENV
});

// В продакшене AdminJS по умолчанию отключен
const enableAdmin = process.env.ENABLE_ADMIN === 'true';
if (enableAdmin && process.env.NODE_ENV === 'production') {
  console.warn('WARNING: AdminJS is enabled in production mode. This is not recommended for security reasons.');
}

// Initialize Express app
const app = express();

// Определяем, находимся ли мы в продакшен-окружении
const isProduction = process.env.NODE_ENV === 'production';

// Configure Winston logger
const logger = createLogger({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  defaultMeta: { service: 'criminal-bluff-api' },
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      )
    }),
    // Для продакшена включаем логирование в файлы
    ...(isProduction ? [
      new transports.File({ filename: 'logs/error.log', level: 'error' }),
      new transports.File({ filename: 'logs/combined.log' })
    ] : [])
  ],
  exceptionHandlers: [
    new transports.Console({ format: format.simple() }),
    ...(isProduction ? [
      new transports.File({ filename: 'logs/exceptions.log' })
    ] : [])
  ],
  rejectionHandlers: [
    new transports.Console({ format: format.simple() }),
    ...(isProduction ? [
      new transports.File({ filename: 'logs/rejections.log' })
    ] : [])
  ]
});

let server;

// Создаем HTTP-сервер
const serverHttp = http.createServer(app);

// Подключаемся к MongoDB
async function connectToDatabase() {
  try {
    await mongoose.connect(config.database.url, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    logger.info('Connected to MongoDB');
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

// Запускаем сервер
async function startServer() {
  // Подключаемся к БД перед запуском сервера
  await connectToDatabase();
  
  serverHttp.listen(process.env.PORT || 3000, () => {
    logger.info(`Server running on port ${process.env.PORT || 3000}`);
  });
  
  // Обработчики событий сервера
  serverHttp.on('error', (error) => {
    logger.error('Server error:', error);
    process.exit(1);
  });
  
  // Корректная обработка сигналов завершения
  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
}

// Функция для корректного завершения работы сервера
function gracefulShutdown() {
  logger.info('SIGTERM/SIGINT received, shutting down gracefully...');
  
  // Останавливаем сервер
  serverHttp.close(() => {
    logger.info('HTTP server closed');
    
    // Закрываем соединение с БД
    mongoose.connection.close(false, () => {
      logger.info('MongoDB connection closed');
      process.exit(0);
    });
    
    // На случай, если БД не отвечает, добавляем таймаут
    setTimeout(() => {
      logger.error('Could not close MongoDB connection in time, forcing shutdown');
      process.exit(1);
    }, 5000);
  });
  
  // Если сервер не закрылся за 10 секунд, принудительно завершаем
  setTimeout(() => {
    logger.error('Could not close server in time, forcing shutdown');
    process.exit(1);
  }, 10000);
}

// Обработчик необработанных исключений
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  gracefulShutdown();
});

// Обработчик необработанных отклонений промисов
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // В production среде можно просто залогировать, не завершая процесс
  // В development среде лучше завершить процесс
  if (process.env.NODE_ENV === 'development') {
    gracefulShutdown();
  }
});

// Запускаем сервер
startServer().catch(error => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});

export default app; // Export app for testing or other purposes 