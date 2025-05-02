import Redis from 'ioredis';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('Redis');

let redisClient;
let redisEnabled = true;

const connectRedis = async () => {
  try {
    // Проверяем наличие REDIS_URL
    if (!process.env.REDIS_URL) {
      logger.warn('REDIS_URL not found in environment variables');
      redisEnabled = false;
      return null;
    }

    // Логируем (безопасно) что будем использовать REDIS_URL
    logger.info('Connecting to Redis using REDIS_URL from environment variables');
    
    // Создаем клиент Redis с минимальными настройками
    redisClient = new Redis(process.env.REDIS_URL, {
      // Включаем поддержку IPv6 согласно документации Railway
      family: 0,
      // Более короткие таймауты для быстрого понимания проблем
      connectTimeout: 5000,
      // Показывать подробный стек ошибок
      showFriendlyErrorStack: true,
      // Меньше попыток переподключения, чтобы быстрее падать в fallback режим
      maxRetriesPerRequest: 2,
      retryStrategy: (times) => {
        const delay = Math.min(times * 100, 2000);
        // После 5 попыток прекращаем пытаться переподключиться
        if (times > 5) {
          redisEnabled = false;
          logger.warn('Redis connection failed after multiple retries. Running in fallback mode without Redis.');
          return null; // Прекращаем попытки переподключения
        }
        return delay;
      },
    });

    // Настраиваем обработчики событий
    redisClient.on('connect', () => {
      redisEnabled = true;
      logger.info('Redis connected successfully');
    });

    redisClient.on('error', (err) => {
      logger.error(`Redis connection error: ${err}`);
    });

    redisClient.on('reconnecting', () => {
      logger.info('Redis reconnecting...');
    });

    redisClient.on('close', () => {
      logger.warn('Redis connection closed');
    });

    // Тестирование соединения с коротким таймаутом
    try {
      await Promise.race([
        redisClient.ping(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Redis ping timeout')), 3000)
        )
      ]);
      logger.info('Redis connection test successful: PING command OK');
      redisEnabled = true;
    } catch (pingError) {
      logger.error(`Redis connection test failed: ${pingError.message}`);
    }

    // Обработка завершения процесса
    process.on('SIGINT', async () => {
      await closeRedis();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await closeRedis();
      process.exit(0);
    });

    return redisClient;
  } catch (error) {
    logger.error(`Error connecting to Redis: ${error.message}`);
    // Вместо завершения процесса, отключаем Redis-функциональность
    redisEnabled = false;
    logger.warn('Running in fallback mode without Redis');
    return null;
  }
};

const closeRedis = async () => {
  try {
    if (redisClient) {
      await redisClient.quit();
      logger.info('Redis connection closed');
    }
  } catch (error) {
    logger.error(`Error closing Redis connection: ${error.message}`);
    throw error;
  }
};

const getRedisClient = () => {
  if (!redisClient && redisEnabled) {
    logger.warn('Redis client not initialized, but trying to reconnect');
    connectRedis().catch(err => {
      logger.error(`Failed to reconnect to Redis: ${err.message}`);
    });
    throw new Error('Redis client not initialized');
  }
  
  if (!redisEnabled) {
    // Возвращаем заглушку Redis для режима без Redis
    return {
      get: async () => null,
      set: async () => true,
      del: async () => true,
      // Другие часто используемые методы
      exists: async () => 0,
      incr: async () => 1,
      expire: async () => true
    };
  }
  
  return redisClient;
};

// Экспортируем дополнительно флаг состояния Redis
export {
  connectRedis,
  closeRedis,
  getRedisClient,
  redisEnabled
}; 