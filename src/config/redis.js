const Redis = require('ioredis');
const { createLogger } = require('../utils/logger');

const logger = createLogger('Redis');

let redisClient;

const connectRedis = async () => {
  try {
    // Connect using shared REDIS_URL
    redisClient = new Redis(process.env.REDIS_URL, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
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
    process.exit(1);
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
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }
  return redisClient;
};

module.exports = {
  connectRedis,
  closeRedis,
  getRedisClient
}; 