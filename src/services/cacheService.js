const redis = require('redis');
const { createLogger } = require('../config/logger');
const { CacheError } = require('../utils/errorHandler');
const Story = require('../models/Story');
const User = require('../models/User');
const Leaderboard = require('../models/Leaderboard');

const logger = createLogger('CacheService');
const RECONNECT_INTERVAL = 5000; // 5 секунд между попытками переподключения

class CacheService {
  constructor() {
    this.client = null;
    this.connected = false;
    this.reconnecting = false;
    this.reconnectTimer = null;
    this.ttl = {
      stories: 60 * 60, // 1 час
      profiles: 15 * 60, // 15 минут
      leaderboards: {
        daily: 5 * 60, // 5 минут
        weekly: 15 * 60, // 15 минут
        allTime: 30 * 60 // 30 минут
      }
    };
    // Инициализация соединения при создании сервиса
    this.initConnection();
  }

  // Инициализация соединения с Redis
  async connect() {
    try {
      // Очистка существующего таймера переподключения, если он существует
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }

      // Проверка наличия URL для подключения
      if (!process.env.REDIS_URL) {
        logger.warn('REDIS_URL not found in environment variables, Redis caching disabled');
        this.connected = false;
        return;
      }

      // Создание нового клиента Redis с оптимизированными настройками
      this.client = redis.createClient({
        url: process.env.REDIS_URL,
        socket: {
          reconnectStrategy: false // Отключаем встроенную стратегию переподключения и реализуем свою
        }
      });

      // Подписка на события клиента Redis
      this.client.on('error', (err) => {
        logger.error('Redis error occurred:', err);
        this.handleDisconnect();
      });

      this.client.on('connect', () => {
        logger.info('Connected to Redis successfully');
        this.connected = true;
        this.reconnecting = false;
      });

      this.client.on('end', () => {
        logger.warn('Redis connection closed');
        this.handleDisconnect();
      });

      // Попытка подключения к Redis
      await this.client.connect();
      this.connected = true;
      logger.info('Redis client initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Redis client:', error);
      this.handleDisconnect();
    }
  }

  // Поддержка совместимости
  initConnection() {
    this.connect();
  }

  // Обработка отключения и планирование переподключения
  handleDisconnect() {
    this.connected = false;
    
    // Предотвращаем создание множества таймеров
    if (!this.reconnecting) {
      this.reconnecting = true;
      logger.info(`Scheduling Redis reconnect in ${RECONNECT_INTERVAL/1000} seconds`);
      
      this.reconnectTimer = setTimeout(async () => {
        logger.info('Attempting to reconnect to Redis...');
        await this.connect();
      }, RECONNECT_INTERVAL);
    }
  }

  // Безопасное получение данных из кеша
  async get(key) {
    try {
      // Если Redis недоступен, сразу возвращаем null
      if (!this.connected || !this.client) {
        return null;
      }
      
      try {
        const data = await this.client.get(key);
        return data ? JSON.parse(data) : null;
      } catch (redisError) {
        logger.error(`Redis error when getting key ${key}:`, redisError);
        this.handleDisconnect();
        return null;
      }
    } catch (error) {
      logger.error(`Error getting key ${key}:`, error);
      return null;
    }
  }

  // Безопасное сохранение данных в кеш
  async set(key, data, expiration = null) {
    try {
      // Если Redis недоступен, пропускаем операцию кеширования
      if (!this.connected || !this.client) {
        return false;
      }
      
      const value = JSON.stringify(data);
      try {
        if (expiration) {
          await this.client.set(key, value, { EX: expiration });
        } else {
          await this.client.set(key, value);
        }
        return true;
      } catch (redisError) {
        logger.error(`Redis error when setting key ${key}:`, redisError);
        this.handleDisconnect();
        return false;
      }
    } catch (error) {
      logger.error(`Error setting key ${key}:`, error);
      return false;
    }
  }

  // Безопасное удаление ключа из кеша
  async del(key) {
    try {
      // Если Redis недоступен, пропускаем операцию удаления
      if (!this.connected || !this.client) {
        return false;
      }
      
      try {
        await this.client.del(key);
        return true;
      } catch (redisError) {
        logger.error(`Redis error when deleting key ${key}:`, redisError);
        this.handleDisconnect();
        return false;
      }
    } catch (error) {
      logger.error(`Error deleting key ${key}:`, error);
      return false;
    }
  }

  // Оптимизированная инвалидация ключей по паттерну
  async invalidatePattern(pattern) {
    try {
      // Если Redis недоступен, пропускаем операцию инвалидации
      if (!this.connected || !this.client) {
        return false;
      }
      
      try {
        // Используем SCAN вместо KEYS для больших наборов данных
        // (для текущей нагрузки не критично, но это лучшая практика)
        const keys = await this.client.keys(pattern);
        
        if (keys.length === 0) {
          return true;
        }
        
        // Оптимизация: используем UNLINK вместо DEL для асинхронного удаления
        // или удаление пакетами, если много ключей
        if (keys.length > 100) {
          // Разбиваем на пакеты по 100 ключей
          const chunks = this.chunkArray(keys, 100);
          for (const chunk of chunks) {
            await this.client.unlink(chunk);
          }
        } else if (keys.length > 1) {
          // Удаляем все ключи за одну операцию
          await this.client.unlink(keys);
        } else {
          // Один ключ - удаляем напрямую
          await this.client.unlink(keys[0]);
        }
        
        return true;
      } catch (redisError) {
        logger.error(`Redis error when invalidating pattern ${pattern}:`, redisError);
        this.handleDisconnect();
        return false;
      }
    } catch (error) {
      logger.error(`Error invalidating pattern ${pattern}:`, error);
      return false;
    }
  }
  
  // Утилита для разбивки массива на чанки
  chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  // Кеширование историй
  async cacheStories(stories) {
    try {
      const success = await this.set('stories:all', stories, this.ttl.stories);
      if (success) {
        logger.info(`Cached ${stories.length} stories`);
      }
      return stories;
    } catch (error) {
      logger.error('Error caching stories:', error);
      return stories; // Возвращаем данные даже при ошибке кеширования
    }
  }

  // Получение историй с безопасным кешированием
  async getStories() {
    try {
      const cached = await this.get('stories:all');
      if (cached) return cached;

      const stories = await Story.find().lean();
      await this.cacheStories(stories);
      return stories;
    } catch (error) {
      logger.error('Error getting stories:', error);
      // Отказоустойчивый подход: при ошибке кеширования
      // пытаемся вернуть данные напрямую из БД
      try {
        return await Story.find().lean();
      } catch (dbError) {
        logger.error('Failed to fetch stories from database:', dbError);
        throw new CacheError('Failed to get stories', dbError);
      }
    }
  }

  // Кеширование лидерборда с оптимизацией
  async cacheLeaderboard(period, data) {
    try {
      const key = `leaderboard:${period}`;
      const ttl = this.ttl.leaderboards[period] || this.ttl.leaderboards.daily;
      const success = await this.set(key, data, ttl);
      if (success) {
        logger.info(`Cached leaderboard for period ${period}`);
      }
      return data;
    } catch (error) {
      logger.error(`Error caching leaderboard for period ${period}:`, error);
      return data; // Возвращаем данные даже при ошибке кеширования
    }
  }

  // Получение лидерборда с оптимизированным кешированием
  async getLeaderboard(period) {
    try {
      const key = `leaderboard:${period}`;
      const cached = await this.get(key);
      if (cached) return cached;

      // Получаем данные из БД и кешируем их
      const leaderboard = await Leaderboard.getByPeriod(period);
      await this.cacheLeaderboard(period, leaderboard);
      return leaderboard;
    } catch (error) {
      logger.error(`Error getting leaderboard for period ${period}:`, error);
      // Отказоустойчивый подход: при ошибке кеширования
      // пытаемся вернуть данные напрямую из БД
      try {
        return await Leaderboard.getByPeriod(period);
      } catch (dbError) {
        logger.error(`Failed to fetch leaderboard from database for period ${period}:`, dbError);
        throw new CacheError(`Failed to get leaderboard for period ${period}`, dbError);
      }
    }
  }

  // Оптимизированное кеширование профиля пользователя
  async cacheUserProfile(telegramId, profile) {
    try {
      const key = `user:${telegramId}:profile`;
      const success = await this.set(key, profile, this.ttl.profiles);
      if (success) {
        logger.info(`Cached profile for user ${telegramId}`);
      }
      return profile;
    } catch (error) {
      logger.error(`Error caching profile for user ${telegramId}:`, error);
      return profile; // Возвращаем данные даже при ошибке кеширования
    }
  }

  // Получение профиля пользователя с оптимизацией
  async getUserProfile(telegramId) {
    try {
      const key = `user:${telegramId}:profile`;
      const cached = await this.get(key);
      if (cached) return cached;

      const profile = await User.findOne({ telegramId }).lean();
      if (profile) {
        await this.cacheUserProfile(telegramId, profile);
      }
      return profile;
    } catch (error) {
      logger.error(`Error getting profile for user ${telegramId}:`, error);
      // Отказоустойчивый подход
      try {
        return await User.findOne({ telegramId }).lean();
      } catch (dbError) {
        logger.error(`Failed to fetch user profile from database for ${telegramId}:`, dbError);
        throw new CacheError(`Failed to get profile for user ${telegramId}`, dbError);
      }
    }
  }

  // Кеширование достижений пользователя
  async cacheAchievements(telegramId, achievements) {
    try {
      const key = `user:${telegramId}:achievements`;
      const success = await this.set(key, achievements, this.ttl.profiles);
      if (success) {
        logger.info(`Cached achievements for user ${telegramId}`);
      }
      return achievements;
    } catch (error) {
      logger.error(`Error caching achievements for user ${telegramId}:`, error);
      return achievements;
    }
  }

  // Получение достижений пользователя с оптимизацией
  async getAchievements(telegramId) {
    try {
      const key = `user:${telegramId}:achievements`;
      const cached = await this.get(key);
      if (cached) return cached;

      const user = await User.findOne({ telegramId }).select('achievements').lean();
      if (user && user.achievements) {
        await this.cacheAchievements(telegramId, user.achievements);
        return user.achievements;
      }
      return null;
    } catch (error) {
      logger.error(`Error getting achievements for user ${telegramId}:`, error);
      // Отказоустойчивый подход
      try {
        const user = await User.findOne({ telegramId }).select('achievements').lean();
        return user?.achievements || null;
      } catch (dbError) {
        logger.error(`Failed to fetch achievements from database for ${telegramId}:`, dbError);
        throw new CacheError(`Failed to get achievements for user ${telegramId}`, dbError);
      }
    }
  }

  /**
   * Проверка состояния подключения к Redis
   * @returns {Promise<{isConnected: boolean, details?: string}>} Состояние подключения
   */
  async checkHealth() {
    try {
      if (!this.client || !this.connected) {
        return { 
          isConnected: false, 
          details: 'Redis client is not connected or not initialized' 
        };
      }
      
      // Проверяем работоспособность Redis установкой и получением тестового значения
      const testKey = 'health:check:test';
      const testValue = 'health-check-' + Date.now();
      
      await this.client.set(testKey, testValue, { EX: 10 }); // 10 секунд
      const retrievedValue = await this.client.get(testKey);
      
      if (retrievedValue === testValue) {
        return { 
          isConnected: true,
          details: 'Redis connection is healthy and operational'
        };
      } else {
        return { 
          isConnected: false,
          details: 'Redis connection test failed: values do not match'
        };
      }
    } catch (error) {
      logger.error('Redis health check failed:', error);
      return {
        isConnected: false,
        details: `Redis health check error: ${error.message}`
      };
    }
  }
}

module.exports = new CacheService(); 