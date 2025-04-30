/**
 * Скрипт для инициализации системы достижений в приложении
 * Безопасен для запуска в продакшен-окружении, так как проверяет существующие записи.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Achievement = require('../models/Achievement');
const { createLogger } = require('../utils/logger');

const logger = createLogger('AchievementInit');

// Список продакшен-достижений
const achievements = [
  {
    id: 'first_win',
    name: 'Первое расследование',
    description: 'Успешно завершите первое расследование',
    icon: 'first_win_icon.png',
    criteria: {
      type: 'game_complete',
      count: 1
    },
    reward: {
      points: 100
    }
  },
  {
    id: 'win_streak',
    name: 'Серия успехов',
    description: 'Получите 5 правильных ответов подряд',
    icon: 'win_streak_icon.png',
    criteria: {
      type: 'streak',
      count: 5
    },
    reward: {
      points: 250
    }
  },
  {
    id: 'master_detective',
    name: 'Мастер-детектив',
    description: 'Завершите 10 расследований',
    icon: 'master_detective_icon.png',
    criteria: {
      type: 'game_complete',
      count: 10
    },
    reward: {
      points: 500
    }
  },
  {
    id: 'quick_solver',
    name: 'Молниеносное раскрытие',
    description: 'Завершите расследование за 30 секунд',
    icon: 'quick_solver_icon.png',
    criteria: {
      type: 'time',
      max_seconds: 30
    },
    reward: {
      points: 300
    }
  },
  {
    id: 'perfect_score',
    name: 'Идеальный счет',
    description: 'Получите 100% правильных ответов в игре',
    icon: 'perfect_score_icon.png',
    criteria: {
      type: 'accuracy',
      min_percent: 100
    },
    reward: {
      points: 400
    }
  }
];

// Функция инициализации достижений
async function initAchievements() {
  try {
    logger.info(`Запуск инициализации достижений в режиме: ${process.env.NODE_ENV}`);
    
    // Подключаемся к MongoDB
    await mongoose.connect(process.env.MONGO_URL);
    logger.info('Подключено к MongoDB');
    
    // Для каждого достижения
    for (const achievement of achievements) {
      // Проверяем, существует ли уже такое достижение
      const existingAchievement = await Achievement.findOne({ id: achievement.id });
      
      if (existingAchievement) {
        logger.info(`Достижение "${achievement.name}" уже существует, пропускаем`);
        continue;
      }
      
      // Создаем новое достижение
      await Achievement.create(achievement);
      logger.info(`Создано достижение "${achievement.name}"`);
    }
    
    // Проверяем результат
    const totalAchievements = await Achievement.countDocuments();
    logger.info(`Всего в системе ${totalAchievements} достижений`);
    
    // Закрываем соединение
    await mongoose.connection.close();
    logger.info('Инициализация достижений успешно завершена');
    process.exit(0);
  } catch (error) {
    logger.error('Ошибка при инициализации достижений:', error);
    process.exit(1);
  }
}

// Запускаем инициализацию
initAchievements(); 