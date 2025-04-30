/**
 * Скрипт для получения списка пользователей
 * Безопасен для использования в продакшен-окружении
 * с соответствующими ограничениями
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const { createLogger } = require('../utils/logger');

const logger = createLogger('UserManagement');

// Функция получения списка пользователей
async function getUsers() {
  try {
    // Подключаемся к MongoDB
    await mongoose.connect(process.env.MONGO_URL);
    logger.info('Подключено к MongoDB');

    // Проверяем окружение
    const isProduction = process.env.NODE_ENV === 'production';
    
    // В продакшене запрашиваем только минимально необходимые данные
    const projection = isProduction 
      ? { username: 1, firstName: 1, lastName: 1, lastActive: 1, isAdmin: 1 }
      : {};
    
    // Ограничиваем количество записей в продакшене
    const limit = isProduction ? 100 : 0;
    
    // Получаем пользователей
    const users = await User.find({}, projection).limit(limit).sort({ lastActive: -1 });
    
    logger.info(`Найдено ${users.length} пользователей`);
    
    // Выводим данные в зависимости от окружения
    if (isProduction) {
      // В продакшене выводим только обезличенную статистику
      const activeUsers = users.filter(u => 
        u.lastActive && new Date(u.lastActive) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      ).length;
      
      logger.info(`Общее количество пользователей: ${users.length}`);
      logger.info(`Активных за последние 30 дней: ${activeUsers}`);
      logger.info(`Администраторов: ${users.filter(u => u.isAdmin).length}`);
    } else {
      // В других окружениях выводим полный список
      users.forEach(user => {
        logger.info(`Пользователь: ${user.username || 'Без имени'} (ID: ${user._id})`);
        if (user.telegramId) logger.info(`  Telegram ID: ${user.telegramId}`);
        if (user.firstName || user.lastName) logger.info(`  Имя: ${user.firstName || ''} ${user.lastName || ''}`);
        if (user.lastActive) logger.info(`  Последняя активность: ${new Date(user.lastActive).toLocaleString()}`);
        if (user.isAdmin) logger.info(`  Администратор: Да`);
        logger.info('---');
      });
    }

    // Закрываем соединение
    await mongoose.connection.close();
  } catch (error) {
    logger.error('Ошибка при получении пользователей:', error);
    process.exit(1);
  }
}

// Запускаем функцию
getUsers(); 