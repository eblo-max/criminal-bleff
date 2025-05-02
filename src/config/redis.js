import Redis from 'ioredis';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('Redis');

let redisClient;
let redisEnabled = true;

// Функция для получения URL Redis из переменных окружения
const getRedisConnectionDetails = () => {
  // Если доступен REDIS_URL, используем его
  if (process.env.REDIS_URL) {
    logger.info('Using REDIS_URL from environment variables');
    // Проверяем, содержит ли URL уже параметр family
    const url = process.env.REDIS_URL;
    if (!url.includes('?family=')) {
      logger.info('Adding family=0 parameter to REDIS_URL for dual-stack IPv4/IPv6 support');
      return { url: url + '?family=0' };
    }
    return { url };
  }
  
  // Если доступны переменные Railways для Redis
  if (process.env.RAILWAY_REDIS_HOST && process.env.RAILWAY_REDIS_PORT) {
    const host = process.env.RAILWAY_REDIS_HOST;
    const port = process.env.RAILWAY_REDIS_PORT;
    const password = process.env.RAILWAY_REDIS_PASSWORD || '';
    
    logger.info(`Using Railway Redis variables: ${host}:${port} with dual-stack IPv4/IPv6 support`);
    
    return { 
      host, 
      port,
      password: password.length > 0 ? password : undefined,
      family: 0 // Для поддержки IPv4 и IPv6
    };
  }
  
  // Если Railways предоставляет Redis через переменную сервиса
  if (process.env.REDISHOST || process.env.REDIS_HOST) {
    const host = process.env.REDISHOST || process.env.REDIS_HOST;
    const port = process.env.REDISPORT || process.env.REDIS_PORT || 6379;
    const password = process.env.REDISPASSWORD || process.env.REDIS_PASSWORD || '';
    
    logger.info(`Using standard Redis variables: ${host}:${port} with dual-stack IPv4/IPv6 support`);
    
    return { 
      host, 
      port,
      password: password.length > 0 ? password : undefined,
      family: 0 // Для поддержки IPv4 и IPv6
    };
  }
  
  // Попытка использовать стандартные переменные Railway для сервисов
  if (process.env.REDIS_SERVICE_HOST) {
    const host = process.env.REDIS_SERVICE_HOST;
    const port = process.env.REDIS_SERVICE_PORT || 6379;
    
    logger.info(`Using Kubernetes-style Redis service: ${host}:${port} with dual-stack IPv4/IPv6 support`);
    
    return { 
      host, 
      port,
      family: 0 // Для поддержки IPv4 и IPv6
    };
  }
  
  // По умолчанию для локальной разработки
  logger.warn('No Redis configuration found, using default localhost:6379');
  return { 
    host: 'localhost', 
    port: 6379,
    family: 0 // Для поддержки IPv4 и IPv6 по умолчанию
  };
};

const connectRedis = async () => {
  try {
    const redisConfig = getRedisConnectionDetails();
    
    // Логируем параметры подключения (без пароля для безопасности)
    logger.info(`Connecting to Redis with parameters: ${
      redisConfig.url 
        ? `URL format with dual-stack support` 
        : `host=${redisConfig.host}, port=${redisConfig.port}, family=0`
    }`);
    
    // Connect using the configuration
    redisClient = new Redis({
      ...redisConfig,
      // Убедимся, что family установлен на 0, если не указан в redisConfig
      ...(redisConfig.family === undefined && !redisConfig.url ? { family: 0 } : {}),
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
      // Важно: используем dual-stack IPv4/IPv6 lookups для решения ошибки ENOTFOUND
      // Устанавливаем family: 0 если еще не установлено
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

    // Тестирование соединения Redis
    try {
      await redisClient.ping();
      logger.info('Redis connection test successful: PING command OK');
      redisEnabled = true;
    } catch (pingError) {
      logger.error(`Redis connection test failed: ${pingError.message}`);
    }

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