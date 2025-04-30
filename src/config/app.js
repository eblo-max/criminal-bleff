const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const { createLogger } = require('../utils/logger');
const { connectDB, closeDB } = require('./database');
const { connectRedis, closeRedis } = require('./redis');
const { errorHandler } = require('../utils/errorHandler');
const { rateLimiter, securityHeaders, validateInput, idempotencyProtection } = require('../middlewares/security');
const userRoutes = require('../routes/userRoutes');
const leaderboardRoutes = require('../routes/leaderboardRoutes');
const gameRoutes = require('../routes/gameRoutes');
const healthRoutes = require('../routes/healthRoutes');
const telegramRoutes = require('../routes/telegramRoutes');
const setupAdminPanel = require('./adminConfig');

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

module.exports = {
  setupMiddleware,
  setupRoutes,
  setupErrorHandling,
  startServer
}; 