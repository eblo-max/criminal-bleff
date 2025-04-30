/**
 * Скрипт для инициализации базовых игровых данных
 * Этот файл заменяет тестовый seedData.js и содержит только
 * минимально необходимые производственные данные.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { createLogger } = require('../utils/logger');
const Story = require('../models/Story');

const logger = createLogger('InitGameData');

// Блокируем запуск в продакшене, если не установлен специальный флаг
if (process.env.NODE_ENV === 'production' && process.env.ALLOW_INIT_IN_PRODUCTION !== 'true') {
  logger.error('КРИТИЧЕСКАЯ ОШИБКА: Этот скрипт не должен запускаться в продакшен-окружении без специального разрешения!');
  logger.error('Для запуска в продакшене установите ALLOW_INIT_IN_PRODUCTION=true');
  process.exit(1);
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

// Функция инициализации данных
async function initializeGameData() {
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

// Подключение к БД и инициализация
async function runInitialization() {
  try {
    logger.info(`Запуск инициализации в режиме: ${process.env.NODE_ENV}`);
    
    // Подключаемся к MongoDB
    await mongoose.connect(process.env.MONGO_URL);
    logger.info('Подключено к MongoDB:', mongoose.connection.host);
    
    // Инициализируем данные
    const success = await initializeGameData();
    
    if (success) {
      logger.info('Инициализация игровых данных успешно завершена');
    } else {
      logger.error('Не удалось инициализировать игровые данные');
    }
    
    // Закрываем соединение
    await mongoose.connection.close();
    logger.info('Соединение с MongoDB закрыто');
    
    process.exit(success ? 0 : 1);
  } catch (error) {
    logger.error('Ошибка при запуске инициализации:', error);
    process.exit(1);
  }
}

// Запускаем инициализацию
runInitialization(); 