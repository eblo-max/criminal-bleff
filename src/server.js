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

// Async function to start the server
async function start() {
  try {
    // Connect to databases first
    logger.info('Connecting to databases...');
    await Promise.all([
      connectDB(),
      connectRedis()
    ]);
    logger.info('Database connections established.');

    // Setup Middleware, Routes, Error Handling
    // Настройка безопасности
    const helmetOptions = {
      contentSecurityPolicy: isProduction ? {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://telegram.org", "https://*.telegram.org", "https://t.me", "https://*.t.me", "https://unpkg.com"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:", "blob:"],
          connectSrc: ["'self'", process.env.API_URL, "https://t.me", "https://*.t.me", "https://web.telegram.org", "https://*.telegram.org", "wss://*.telegram.org", "https://unpkg.com"],
          fontSrc: ["'self'", "https:", "data:"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["https://telegram.org", "https://*.telegram.org", "https://t.me", "https://*.t.me", "https://web.telegram.org"],
          workerSrc: ["'self'", "blob:"]
        }
      } : false
    };
    app.use(helmet(helmetOptions)); 
    
    // Настраиваем CORS для продакшена
    const corsOptions = {
      origin: isProduction 
        ? process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [
            'https://first-bot-production.up.railway.app',
            'https://t.me',
            'https://web.telegram.org',
            'https://telegram.org'
          ]
        : '*', // В разработке разрешаем любой источник
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'telegram-webapp-initdata', 'X-Requested-With'],
      credentials: true,
      maxAge: 86400 // 24 часа
    };
    app.use(cors(corsOptions));
    
    // Настройка парсеров
    app.use(express.json({ limit: '1mb' })); // Ограничиваем размер JSON
    app.use(express.urlencoded({ extended: true, limit: '1mb' }));
    
    // Важно: теперь setupMiddleware асинхронная функция
    await setupMiddleware(app);
    setupRoutes(app);
    setupErrorHandling(app);

    // Start the server
    const PORT = process.env.PORT || 3000;
    server = app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT} in ${process.env.NODE_ENV} mode`);
    });

    server.on('error', (error) => {
      logger.error('Server error:', error);
      process.exit(1);
    });

  } catch (error) {
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
}

// Graceful shutdown
const shutdown = async (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  try {
    // Stop accepting new connections
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) {
            logger.error('Error closing HTTP server:', err);
            return reject(err);
          }
          logger.info('HTTP server closed');
          resolve();
        });
      });
    }

    // Close database connections
    await Promise.all([
      closeDB(),
      closeRedis()
    ]);

    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Handle termination signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// В продакшене немедленное завершение при необработанных ошибках
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  if (isProduction) {
    // В продакшене немедленное завершение при критических ошибках
    logger.error('Critical error in production, exiting process');
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  if (isProduction) {
    // В продакшене немедленное завершение при критических ошибках
    logger.error('Critical unhandled rejection in production, exiting process');
    process.exit(1);
  }
});

// Start the application
start();

export default app; // Export app for testing or other purposes 