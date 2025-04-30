/**
 * Скрипт для безопасной инициализации данных в продакшен-окружении
 * Этот скрипт можно безопасно запускать в продакшене - он проверяет наличие
 * данных и инициализирует только недостающие структуры
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { createLogger } = require('../utils/logger');
const Story = require('../models/Story');
const Leaderboard = require('../models/Leaderboard');

const logger = createLogger('ProductionInit');

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

// Базовый набор историй для игры
const productionStories = [
  {
    title: 'Ограбление в центре города',
    content: 'В центральном банке произошло ограбление в 14:00. Двое преступников в масках проникли через главный вход. Они обезвредили охранника и вскрыли сейф. Украдено 5 миллионов рублей. Преступники скрылись на черном автомобиле.',
    difficulty: 'medium',
    category: 'robbery',
    mistakes: [
      { text: 'в 14:00', correct: 'в 15:00' },
      { text: 'Двое преступников', correct: 'Трое преступников' },
      { text: 'черном автомобиле', correct: 'синем автомобиле' }
    ]
  },
  {
    title: 'Исчезновение картины',
    content: 'Ценная картина исчезла из галереи искусств вчера ночью. Камеры наблюдения показали, что вор проник в здание через окно на втором этаже. Сигнализация была отключена профессионально. Картина оценивается в 2 миллиона долларов.',
    difficulty: 'hard',
    category: 'theft',
    mistakes: [
      { text: 'через окно', correct: 'через вентиляцию' },
      { text: 'на втором этаже', correct: 'на третьем этаже' },
      { text: '2 миллиона долларов', correct: '3 миллиона долларов' }
    ]
  },
  {
    title: 'Кража в ювелирном магазине',
    content: 'Ювелирный магазин был ограблен сегодня утром. Преступник разбил витрину камнем и похитил кольца с бриллиантами. Охранник находился на перерыве. Свидетели описали преступника как высокого мужчину в кепке и солнцезащитных очках.',
    difficulty: 'easy',
    category: 'theft',
    mistakes: [
      { text: 'утром', correct: 'днем' },
      { text: 'камнем', correct: 'молотком' },
      { text: 'высокого мужчину', correct: 'мужчину среднего роста' }
    ]
  }
];

// Функция инициализации историй
async function initializeStories() {
  try {
    // Проверяем наличие историй в базе
    const existingStories = await Story.countDocuments();
    
    if (existingStories > 0) {
      logger.info(`В базе данных уже есть ${existingStories} историй. Пропускаем инициализацию.`);
      return true;
    }
    
    logger.info('Инициализация базовых игровых историй...');
    
    // Создаем начальные истории
    const createdStories = await Story.insertMany(productionStories);
    logger.info(`Создано ${createdStories.length} базовых историй для игры`);

    return true;
  } catch (error) {
    logger.error('Ошибка при инициализации игровых данных:', error);
    return false;
  }
}

// Функция для создания пустых лидербордов
async function initializeLeaderboards() {
  try {
    let changes = 0;
    
    // Проверяем существование дневного лидерборда
    const dailyExists = await Leaderboard.findOne({ period: 'daily' });
    if (!dailyExists) {
      logger.info('Создание дневного лидерборда...');
      await Leaderboard.create({
        period: 'daily',
        entries: []
      });
      changes++;
      logger.info('Дневной лидерборд успешно создан');
    }

    // Проверяем существование недельного лидерборда
    const weeklyExists = await Leaderboard.findOne({ period: 'weekly' });
    if (!weeklyExists) {
      logger.info('Создание недельного лидерборда...');
      await Leaderboard.create({
        period: 'weekly',
        entries: []
      });
      changes++;
      logger.info('Недельный лидерборд успешно создан');
    }

    // Проверяем существование общего лидерборда
    const allTimeExists = await Leaderboard.findOne({ period: 'all-time' });
    if (!allTimeExists) {
      logger.info('Создание общего лидерборда...');
      await Leaderboard.create({
        period: 'all-time',
        entries: []
      });
      changes++;
      logger.info('Общий лидерборд успешно создан');
    }

    if (changes === 0) {
      logger.info('Все лидерборды уже существуют. Пропускаем инициализацию.');
    } else {
      logger.info(`Создано ${changes} лидербордов`);
    }

    return true;
  } catch (error) {
    logger.error('Ошибка при создании лидербордов:', error);
    return false;
  }
}

// Главная функция для запуска скрипта
async function runInitialization() {
  try {
    logger.info(`Запуск безопасной инициализации в режиме: ${process.env.NODE_ENV || 'development'}`);
    
    // Подключаемся к MongoDB
    const connected = await connectDB();
    if (!connected) {
      logger.error('Не удалось подключиться к базе данных. Инициализация прервана.');
      process.exit(1);
    }
    
    // Инициализируем истории
    const storiesInitialized = await initializeStories();
    
    // Инициализируем лидерборды
    const leaderboardsInitialized = await initializeLeaderboards();
    
    if (storiesInitialized && leaderboardsInitialized) {
      logger.info('Инициализация данных успешно завершена');
    } else {
      logger.error('Произошли ошибки при инициализации данных');
    }
    
    // Закрываем соединение
    await mongoose.connection.close();
    logger.info('Соединение с MongoDB закрыто');
    
    process.exit(storiesInitialized && leaderboardsInitialized ? 0 : 1);
  } catch (error) {
    logger.error('Ошибка при запуске инициализации:', error);
    process.exit(1);
  }
}

// Запускаем инициализацию
runInitialization(); 