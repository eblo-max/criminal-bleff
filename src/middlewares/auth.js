const { ValidationError, UnauthorizedError } = require('../utils/errorHandler');
const { createLogger } = require('../config/logger');
const authService = require('../services/authService');

const logger = createLogger('AuthMiddleware');

// Проверка данных от Telegram WebApp
const validateTelegramWebAppData = async (req, res, next) => {
  try {
    // Проверяем наличие заголовка с данными инициализации
    const initData = req.headers['telegram-webapp-initdata'];
    if (!initData) {
      logger.warn('Missing telegram-webapp-initdata header', {
        ip: req.ip,
        path: req.path,
        method: req.method
      });
      throw new ValidationError('Missing Telegram WebApp data');
    }

    // Проверяем подпись с помощью сервиса авторизации
    const isValid = await authService.verifyTelegramWebAppData(initData);
    if (!isValid) {
      logger.warn('Invalid Telegram WebApp data signature', {
        ip: req.ip,
        path: req.path,
        method: req.method
      });
      throw new ValidationError('Invalid Telegram WebApp data signature');
    }

    // Парсим и сохраняем данные пользователя из initData для использования в запросе
    try {
      const data = new URLSearchParams(initData);
      const userJson = data.get('user');
      if (userJson) {
        const user = JSON.parse(userJson);
        req.telegramUser = user;
      }
    } catch (error) {
      logger.error('Error parsing Telegram user data', error);
    }

    logger.debug('Telegram WebApp data validated successfully');
    next();
  } catch (error) {
    // В development режиме пропускаем валидацию для облегчения тестирования
    if (process.env.NODE_ENV === 'development' && process.env.SKIP_TELEGRAM_VALIDATION === 'true') {
      logger.warn('Skipping Telegram WebApp validation in development mode');
      return next();
    }
    
    logger.error('Telegram WebApp validation error:', error);
    next(error);
  }
};

// Строгая проверка данных Telegram WebApp - не позволяет обойти в production
const strictTelegramAuth = async (req, res, next) => {
  try {
    // Проверяем наличие заголовка с данными инициализации
    const initData = req.headers['telegram-webapp-initdata'];
    if (!initData) {
      logger.warn('Missing telegram-webapp-initdata header in strict mode', {
        ip: req.ip,
        path: req.path,
        method: req.method
      });
      throw new UnauthorizedError('Telegram authentication required');
    }

    // Проверяем подпись с помощью сервиса авторизации
    const isValid = await authService.verifyTelegramWebAppData(initData);
    if (!isValid) {
      logger.warn('Invalid Telegram WebApp data signature in strict mode', {
        ip: req.ip,
        path: req.path,
        method: req.method
      });
      throw new UnauthorizedError('Invalid Telegram authentication');
    }

    // Парсим и проверяем данные пользователя
    try {
      const data = new URLSearchParams(initData);
      const userJson = data.get('user');
      if (!userJson) {
        logger.warn('Missing user data in Telegram initData', {
          ip: req.ip
        });
        throw new UnauthorizedError('Missing Telegram user data');
      }
      
      const user = JSON.parse(userJson);
      req.telegramUser = user;
      
      if (!user.id) {
        logger.warn('Invalid Telegram user data (missing id)', {
          user,
          ip: req.ip
        });
        throw new UnauthorizedError('Invalid Telegram user data');
      }
      
      // Проверяем время жизни данных (не более 24 часов)
      const authDate = parseInt(data.get('auth_date') || '0');
      const now = Math.floor(Date.now() / 1000);
      if (now - authDate > 86400) {
        logger.warn('Telegram auth data expired', {
          authDate,
          now,
          diff: now - authDate,
          ip: req.ip
        });
        throw new UnauthorizedError('Telegram authentication expired');
      }
    } catch (error) {
      logger.error('Error processing Telegram user data', {
        error: error.message,
        ip: req.ip
      });
      throw new UnauthorizedError('Invalid Telegram user data');
    }

    logger.debug('Telegram WebApp data strictly validated');
    next();
  } catch (error) {
    // В production режиме не позволяем обойти проверку
    if (process.env.NODE_ENV === 'production') {
      return next(error);
    }
    
    // В режиме разработки можно пропустить, но с предупреждением
    logger.warn('Bypassing strict Telegram auth in development mode', {
      error: error.message,
      ip: req.ip,
      path: req.path
    });
    next();
  }
};

// Проверка пользователя Telegram
const validateTelegramUser = async (req, res, next) => {
  try {
    // Проверяем наличие ID пользователя в параметрах
    const { telegramId } = req.params;
    if (!telegramId) {
      logger.warn('Missing telegramId parameter');
      throw new ValidationError('Missing telegramId parameter');
    }
    
    // Проверяем, что ID пользователя соответствует токену
    if (req.user && req.user.telegramId && req.user.telegramId !== telegramId) {
      logger.warn('Telegram user ID mismatch', {
        tokenId: req.user.telegramId,
        requestedId: telegramId
      });
      throw new UnauthorizedError('Telegram user ID mismatch');
    }
    
    logger.debug('Telegram user validated successfully');
    next();
  } catch (error) {
    // В development режиме пропускаем валидацию для облегчения тестирования
    if (process.env.NODE_ENV === 'development' && process.env.SKIP_TELEGRAM_VALIDATION === 'true') {
      logger.warn('Skipping Telegram user validation in development mode');
      return next();
    }
    
    logger.error('Telegram user validation error:', error);
    next(error);
  }
};

// Общий middleware для защиты маршрутов
const requireAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      throw new UnauthorizedError('No token provided');
    }

    const user = await authService.verifyToken(token);
    if (!user) {
      throw new UnauthorizedError('Invalid token');
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    next(error);
  }
};

module.exports = {
  validateTelegramWebAppData,
  validateTelegramUser,
  requireAuth,
  strictTelegramAuth
}; 