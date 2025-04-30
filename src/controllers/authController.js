const jwt = require('jsonwebtoken');
const userService = require('../services/userService');
const logger = require('../utils/logger');
const config = require('../config');
const ValidationError = require('../errors/ValidationError');
const { success, error } = require('../utils/responseFormatter');

/**
 * Генерирует JWT токен для пользователя
 * @param {Object} user - Объект пользователя
 * @returns {string} JWT токен
 */
const generateToken = (user) => {
  return jwt.sign(
    { id: user.telegramId },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
};

/**
 * Контроллер авторизации
 */
const authController = {
  /**
   * Авторизует пользователя через Telegram и возвращает JWT токен
   * @route POST /api/auth/login
   */
  async login(req, res, next) {
    try {
      // Проверяем входные данные
      const userData = req.body;
      
      if (!userData || !userData.id || !userData.first_name) {
        throw new ValidationError('Неверные данные авторизации. Требуются id и first_name.');
      }
      
      logger.info(`Авторизация пользователя: ${userData.id}`);
      
      // Создаем пользователя, если его нет, или обновляем существующего
      const user = await userService.createUser(userData);
      
      // Генерируем токен
      const token = generateToken(user);
      
      // Отправляем стандартизированный ответ с токеном и данными пользователя
      return success(res, {
        user,
        token
      }, 'Авторизация успешна', 200);
      
    } catch (err) {
      logger.error('Ошибка авторизации:', err);
      next(err);
    }
  },

  /**
   * Проверяет валидность JWT токена
   * @route POST /api/auth/verify
   */
  async verify(req, res, next) {
    try {
      const { token } = req.body;
      
      if (!token) {
        throw new ValidationError('Токен не предоставлен');
      }
      
      // Проверяем токен
      const decoded = jwt.verify(token, config.jwt.secret);
      
      // Находим пользователя
      const user = await userService.getUserById(decoded.id);
      
      if (!user) {
        throw new ValidationError('Пользователь не найден');
      }
      
      // Отправляем стандартизированный ответ с данными пользователя
      return success(res, {
        user,
        token
      }, 'Токен действителен', 200);
      
    } catch (err) {
      if (err instanceof jwt.JsonWebTokenError) {
        return error(res, 'Недействительный токен', 401);
      }
      
      logger.error('Ошибка проверки токена:', err);
      next(err);
    }
  }
};

module.exports = authController; 