/**
 * Скрипт для инициализации структуры таблиц лидеров
 * ВНИМАНИЕ: Не запускать в продакшен-окружении!
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { createLogger } = require('../config/logger');
const Leaderboard = require('../models/Leaderboard');

const logger = createLogger('LeaderboardInit');

// Блокируем запуск в продакшене
if (process.env.NODE_ENV === 'production') {
  logger.error('КРИТИЧЕСКАЯ ОШИБКА: Этот скрипт не должен запускаться в продакшен-окружении!');
  logger.error('Запуск скрипта отменен для защиты продакшен-данных.');
  process.exit(1);
}

// Функция для подключения к MongoDB
async function connectDB() {
  try {
    const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/criminal-bluff';
    logger.info('Подключение к MongoDB...');
    
    await mongoose.connect(mongoUrl);
    logger.info('MongoDB подключена:', mongoose.connection.host);
    return true;
  } catch (error) {
    logger.error('Ошибка подключения к MongoDB:', error);
    return false;
  }
}

// Функция для создания пустых лидербордов
async function createLeaderboards() {
  try {
    // Проверяем существование дневного лидерборда
    const dailyExists = await Leaderboard.findOne({ period: 'daily' });
    if (!dailyExists) {
      logger.info('Создание дневного лидерборда...');
      await Leaderboard.create({
        period: 'daily',
        entries: []
      });
      logger.info('Дневной лидерборд успешно создан');
    } else {
      logger.info('Дневной лидерборд уже существует');
    }

    // Проверяем существование недельного лидерборда
    const weeklyExists = await Leaderboard.findOne({ period: 'weekly' });
    if (!weeklyExists) {
      logger.info('Создание недельного лидерборда...');
      await Leaderboard.create({
        period: 'weekly',
        entries: []
      });
      logger.info('Недельный лидерборд успешно создан');
    } else {
      logger.info('Недельный лидерборд уже существует');
    }

    // Проверяем существование общего лидерборда
    const allTimeExists = await Leaderboard.findOne({ period: 'all-time' });
    if (!allTimeExists) {
      logger.info('Создание общего лидерборда...');
      await Leaderboard.create({
        period: 'all-time',
        entries: []
      });
      logger.info('Общий лидерборд успешно создан');
    } else {
      logger.info('Общий лидерборд уже существует');
    }

    return true;
  } catch (error) {
    logger.error('Ошибка при создании лидербордов:', error);
    return false;
  }
}

// Главная функция для запуска скрипта
async function initLeaderboards() {
  try {
    logger.info('Запуск инициализации лидербордов в режиме', process.env.NODE_ENV);
    
    // Подключение к базе данных
    const connected = await connectDB();
    if (!connected) {
      logger.error('Не удалось подключиться к базе данных. Инициализация прервана.');
      process.exit(1);
    }

    // Создание структуры лидербордов
    const created = await createLeaderboards();
    if (!created) {
      logger.error('Не удалось создать структуру лидербордов. Инициализация прервана.');
      process.exit(1);
    }

    logger.info('Инициализация лидербордов успешно завершена');
    process.exit(0);
  } catch (error) {
    logger.error('Неожиданная ошибка при инициализации:', error);
    process.exit(1);
  }
}

// Запуск скрипта
initLeaderboards(); 