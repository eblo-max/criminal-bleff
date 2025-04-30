/**
 * Скрипт для создания администратора системы
 * Запуск: node src/scripts/createUser.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const { createLogger } = require('../utils/logger');

const logger = createLogger('AdminCreation');

// Блокируем запуск с тестовыми данными
if (process.env.NODE_ENV === 'production' && !process.env.ADMIN_TELEGRAM_ID) {
  logger.error('Для создания администратора в продакшене необходимо установить ADMIN_TELEGRAM_ID');
  process.exit(1);
}

async function createAdminUser() {
  try {
    // Подключение к MongoDB
    await mongoose.connect(process.env.MONGO_URL);
    logger.info('Подключено к MongoDB');

    // Проверяем, существует ли уже пользователь с указанным Telegram ID
    const adminTelegramId = process.env.ADMIN_TELEGRAM_ID || process.env.TELEGRAM_ADMIN_ID;
    
    if (!adminTelegramId) {
      logger.error('Не указан Telegram ID для администратора в .env файле');
      process.exit(1);
    }

    const existingAdmin = await User.findOne({ telegramId: adminTelegramId });
    
    if (existingAdmin) {
      logger.info(`Администратор с Telegram ID ${adminTelegramId} уже существует:`);
      logger.info(`ID: ${existingAdmin._id}, Username: ${existingAdmin.username || 'не указан'}`);
      
      // Обновляем права администратора
      existingAdmin.isAdmin = true;
      await existingAdmin.save();
      logger.info('Права администратора обновлены');
      
      await mongoose.connection.close();
      return;
    }

    // Создаем администратора
    const adminUser = new User({
      username: 'admin',
      firstName: 'Admin',
      lastName: 'User',
      telegramId: adminTelegramId,
      isAdmin: true
    });

    await adminUser.save();
    
    logger.info('Администратор успешно создан:');
    logger.info(`ID: ${adminUser._id}`);
    logger.info(`Username: ${adminUser.username}`);
    logger.info(`TelegramID: ${adminUser.telegramId}`);

    // Закрываем соединение
    await mongoose.connection.close();
  } catch (error) {
    logger.error('Ошибка при создании администратора:', error);
    process.exit(1);
  }
}

// Запускаем функцию
createAdminUser(); 