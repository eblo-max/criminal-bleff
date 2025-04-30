const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { createLogger } = require('../config/logger');
const User = require('../models/User');

const logger = createLogger('AuthService');

class AuthService {
  // Проверка данных от Telegram WebApp
  async verifyTelegramWebAppData(initData) {
    try {
      // Проверяем, что initData не пустая
      if (!initData || typeof initData !== 'string') {
        logger.warn('Invalid initData format', { initData });
        return false;
      }

      // Парсим параметры из строки запроса
      const data = new URLSearchParams(initData);
      
      // Проверяем наличие обязательных полей
      const requiredFields = ['auth_date', 'hash'];
      for (const field of requiredFields) {
        if (!data.has(field)) {
          logger.warn(`Missing required field in initData: ${field}`);
          return false;
        }
      }
      
      const hash = data.get('hash');
      data.delete('hash');

      // Проверяем auth_date - не должен быть в будущем
      const authDate = parseInt(data.get('auth_date'));
      const now = Math.floor(Date.now() / 1000);
      
      if (isNaN(authDate) || authDate > now) {
        logger.warn('Invalid auth_date', { authDate, now });
        return false;
      }

      // Сортировка параметров по алфавиту
      const sortedData = Array.from(data.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

      // Проверяем наличие токена бота
      if (!process.env.TELEGRAM_BOT_TOKEN) {
        logger.error('TELEGRAM_BOT_TOKEN is not defined');
        return false;
      }

      // Создание HMAC
      const secret = crypto
        .createHmac('sha256', 'WebAppData')
        .update(process.env.TELEGRAM_BOT_TOKEN)
        .digest();

      const calculatedHash = crypto
        .createHmac('sha256', secret)
        .update(sortedData)
        .digest('hex');

      // Сравниваем хеши
      const isHashValid = hash === calculatedHash;
      
      if (!isHashValid) {
        logger.warn('Hash validation failed', {
          receivedHash: hash,
          calculatedHash: calculatedHash
        });
      }

      return isHashValid;
    } catch (error) {
      logger.error('Error verifying Telegram WebApp data:', error);
      return false;
    }
  }

  // Проверка пользователя Telegram
  async verifyTelegramUser(telegramId) {
    try {
      return await User.findOne({ telegramId });
    } catch (error) {
      logger.error('Error verifying Telegram user:', error);
      return null;
    }
  }

  // Создание JWT токена
  generateToken(userData) {
    try {
      return jwt.sign(
        { 
          telegramId: userData.telegramId,
          username: userData.username
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
    } catch (error) {
      logger.error('Error generating token:', error);
      throw error;
    }
  }

  // Проверка JWT токена
  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      return await this.verifyTelegramUser(decoded.telegramId);
    } catch (error) {
      logger.error('Error verifying token:', error);
      return null;
    }
  }
}

module.exports = new AuthService(); 