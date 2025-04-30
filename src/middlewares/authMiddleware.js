const { ValidationError, UnauthorizedError } = require('../utils/errorHandler');
const { createLogger } = require('../utils/logger');
const jwt = require('jsonwebtoken');

const logger = createLogger('AuthMiddleware');

/**
 * Middleware для проверки авторизации пользователя
 * @param {Object} req - Express request объект
 * @param {Object} res - Express response объект
 * @param {Function} next - Express next middleware функция
 */
const authenticate = async (req, res, next) => {
  try {
    // Получаем токен из заголовка Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Требуется авторизация');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedError('Токен не предоставлен');
    }

    try {
      // Проверяем токен
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      logger.error(`Ошибка верификации токена: ${error.message}`);
      throw new UnauthorizedError('Недействительный токен');
    }
  } catch (error) {
    logger.error(`Ошибка аутентификации: ${error.message}`);
    next(error);
  }
};

module.exports = {
  authenticate
}; 