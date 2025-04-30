import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { createLogger } from '../utils/logger.js';
import { connectDB, closeDB } from './database.js';
import { connectRedis, closeRedis } from './redis.js';
import { errorHandler } from '../utils/errorHandler.js';
import { rateLimiter, securityHeaders, validateInput, idempotencyProtection } from '../middlewares/security.js';
import userRoutes from '../routes/userRoutes.js';
import leaderboardRoutes from '../routes/leaderboardRoutes.js';
import gameRoutes from '../routes/gameRoutes.js';
import healthRoutes from '../routes/healthRoutes.js';
import telegramRoutes from '../routes/telegramRoutes.js';
import setupAdminPanel from './adminConfig.js';

const logger = createLogger('App');

const setupMiddleware = async (app) => {
  // Доверяем прокси от Railway
  app.set('trust proxy', 1); 

  // Базовые middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(compression({
    level: 6,
    filter: (req, res) => {
      if (Number(res.getHeader('Content-Length')) < 1024) {
        return false;
      }
      return compression.filter(req, res);
    },
    threshold: 1024,
    memLevel: 8
  }));

  // Раздача статических файлов из папки public
  app.use(express.static('public'));

  // CORS настройки импортируются и применяются в server.js
  // для обеспечения единообразия конфигурации

  // Логирование запросов
  const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
  app.use(morgan(morganFormat));

  // Безопасность
  app.use(helmet());
  app.use(securityHeaders);
  
  // Rate limiter для защиты от DoS
  app.use('/api/', rateLimiter);
  
  // Защита от повторных запросов для API
  app.use('/api/', idempotencyProtection);
  
  // Валидация входных данных
  app.use('/api/', validateInput);

  // AdminJS setup - должен быть перед другими маршрутами
  if (process.env.ENABLE_ADMIN === 'true') {
    try {
      await setupAdminPanel(app);
      logger.info('AdminJS panel enabled');
    } catch (error) {
      logger.error('Failed to initialize AdminJS:', error);
    }
  }

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });
};

const setupRoutes = (app) => {
  // Базовый маршрут для проверки работоспособности
  app.get('/', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Criminal Bluff API Service' });
  });

  // API маршруты
  app.use('/api/user', userRoutes);
  app.use('/api/game', gameRoutes);
  app.use('/api/leaderboard', leaderboardRoutes);
  app.use('/api/telegram', telegramRoutes);
  app.use('/health', healthRoutes);
  
  // Логирование успешных запросов
  app.use((req, res, next) => {
    res.on('finish', () => {
      if (res.statusCode < 400) {
        logger.info(`${req.ip} - - [${new Date().toISOString()}] "${req.method} ${req.originalUrl} HTTP/${req.httpVersion}" ${res.statusCode} ${res.get('Content-Length') || '-'} "${req.get('Referer') || '-'}" "${req.get('User-Agent') || '-'}"`);
      }
    });
    next();
  });
};

const setupErrorHandling = (app) => {
  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      status: 'error',
      message: 'Not Found'
    });
  });

  // Global error handler
  app.use((err, req, res, next) => {
    logger.error('Unhandled error:', err);
    
    const errorResponse = {
      status: 'error',
      message: process.env.NODE_ENV === 'production' 
        ? 'An error occurred' 
        : err.message
    };

    const statusCode = err.statusCode || 500;
    res.status(statusCode).json(errorResponse);
  });
};

const startServer = async (app, port) => {
  try {
    await connectDB();
    await connectRedis();

    const server = app.listen(port, () => {
      logger.info(`Server is running on port ${port}`);
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('SIGINT received. Shutting down gracefully...');
      await closeDB();
      await closeRedis();
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received. Shutting down gracefully...');
      await closeDB();
      await closeRedis();
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });

    return server;
  } catch (error) {
    logger.error(`Error starting server: ${error.message}`);
    process.exit(1);
  }
};

export {
  setupMiddleware,
  setupRoutes,
  setupErrorHandling,
  startServer
}; 