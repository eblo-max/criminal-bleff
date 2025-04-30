import Redis from 'ioredis';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('Redis');

let redisClient;
let redisEnabled = true;

const connectRedis = async () => {
  try {
    // Connect using shared REDIS_URL
    redisClient = new Redis(process.env.REDIS_URL, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        // После 10 попыток прекращаем пытаться переподключиться
        if (times > 10) {
          redisEnabled = false;
          logger.warn('Redis connection failed after multiple retries. Running in fallback mode without Redis.');
          return null; // Прекращаем попытки переподключения
        }
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      maxLoadingRetryTime: 10000,
      connectTimeout: 10000,
      // Add DNS options
      family: 4,
      // Add more detailed error reporting
      showFriendlyErrorStack: true
    });

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

    // Graceful shutdown
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