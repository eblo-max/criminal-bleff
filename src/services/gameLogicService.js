const { createLogger } = require('../config/logger');
const { GameError } = require('../utils/errorHandler');
const User = require('../models/User');
const Leaderboard = require('../models/Leaderboard');
const Achievement = require('../models/Achievement');
const cacheService = require('./cacheService');
const leaderboardService = require('./leaderboardService');
const mongoose = require('mongoose');
const scoreCalculator = require('../utils/scoreCalculator');

const logger = createLogger('GameLogicService');

class GameLogicService {
  constructor() {
    this.BASE_POINTS = 100;
    this.TIME_PENALTY = 0.1;
    this.STREAK_BONUS = 0.2;
    this.MAX_STREAK = 10;
    this.RANKS = {
      NOVICE: { min: 0, max: 1000 },
      APPRENTICE: { min: 1000, max: 5000 },
      JOURNEYMAN: { min: 5000, max: 15000 },
      EXPERT: { min: 15000, max: 30000 },
      MASTER: { min: 30000, max: 50000 },
      GRANDMASTER: { min: 50000, max: Infinity }
    };
  }

  // Метод для получения случайных историй
  async getRandomStories() {
    try {
      // Временная заглушка для тестирования
      return [
        {
          id: 'story1',
          text: 'Тестовая история 1',
          options: ['Вариант 1', 'Вариант 2'],
          correctAnswer: 0
        },
        {
          id: 'story2',
          text: 'Тестовая история 2',
          options: ['Вариант A', 'Вариант B'],
          correctAnswer: 1
        }
      ];
    } catch (error) {
      logger.error('Error getting random stories:', error);
      throw new GameError('Failed to get random stories', error);
    }
  }

  // Метод для проверки ответа игрока
  async submitAnswer(userId, storyId, answer, timeSpent) {
    try {
      // Расширенная логика поиска пользователя с поддержкой telegramId
      let user = null;
      let userObjectId = null;
      
      // Проверяем, является ли userId ObjectId
      const isValidObjectId = mongoose.Types.ObjectId.isValid(userId);
      
      if (isValidObjectId) {
        // Если это валидный ObjectId, используем его напрямую
        userObjectId = new mongoose.Types.ObjectId(userId);
        user = await User.findById(userObjectId);
      }
      
      // Если пользователь не найден или userId не является ObjectId, ищем по telegramId
      if (!user) {
        user = await User.findOne({ telegramId: userId });
        if (user) {
          userObjectId = user._id; // Используем найденный ID для последующих операций
        }
      }
      
      // Если пользователь все еще не найден, выбрасываем ошибку
      if (!user) {
        logger.warn(`User not found with ID or telegramId: ${userId}`);
        throw new GameError('User not found');
      }
      
      // Временная заглушка для тестирования
      // В реальном приложении здесь будет проверка правильности ответа из базы данных
      const isCorrect = Math.random() > 0.5; // Случайный результат
      
      // Если не передано время ответа, используем среднее значение
      timeSpent = timeSpent || 5;
      
      // Рассчитываем очки
      const score = this.calculateScore(isCorrect, timeSpent, user.stats.currentStreak || 0);
      
      // Обновляем статистику пользователя
      await this.updateUserStats(userObjectId, { 
        isCorrect, 
        timeSpent,
        score
      });
      
      // Обновляем серию правильных ответов
      await this.updateStreak(userObjectId, isCorrect);
      
      // Если ответ быстрый и правильный, проверяем достижение "Скоростной детектив"
      if (isCorrect && timeSpent <= 3) {
        // Если это быстрый правильный ответ, проверяем и присваиваем достижение
        const achievements = await Achievement.find({ code: 'SPEED_DETECTIVE' });
        if (achievements.length > 0) {
          await this.unlockAchievement(userObjectId, 'SPEED_DETECTIVE');
          logger.info(`Achievement "Speed Detective" unlocked for user ${user.telegramId || user._id}`);
        }
      }
      
      return {
        isCorrect,
        score,
        correctAnswer: isCorrect ? answer : (answer === 'true' ? 'false' : 'true')
      };
    } catch (error) {
      logger.error(`Error submitting answer for user ${userId}:`, error);
      throw new GameError('Failed to submit answer', error);
    }
  }

  // Метод для завершения игры
  async finishGame(userId) {
    try {
      let user = null;
      
      // Если userId - это строка, которая похожа на telegramId, сначала ищем по нему
      if (typeof userId === 'string' && !mongoose.Types.ObjectId.isValid(userId)) {
        user = await User.findOne({ telegramId: userId });
        // Если нашли пользователя по telegramId, работаем с его _id
        if (user) {
          userId = user._id;
        } else {
          throw new GameError(`User not found with telegramId: ${userId}`);
        }
      } else {
        // Если это ObjectId или строка, которую можно преобразовать в ObjectId
        try {
          const objectId = new mongoose.Types.ObjectId(userId);
          user = await User.findById(objectId);
          if (!user) {
            // Если не нашли по _id, попробуем поискать по telegramId как запасной вариант
            user = await User.findOne({ telegramId: userId });
            if (!user) {
              throw new GameError(`User not found with id: ${userId}`);
            }
          }
        } catch (error) {
          // Если не удалось преобразовать в ObjectId, пробуем снова искать по telegramId
          user = await User.findOne({ telegramId: userId });
          if (!user) {
            throw new GameError(`User not found with id: ${userId}`);
          }
        }
      }
      
      // Получаем фактический ObjectId пользователя для использования в дальнейших операциях
      const userObjectId = user._id;
      
      // Проверяем достижения после завершения игры
      const unlockedAchievements = await this.checkAchievements(userObjectId);
      
      // Обновляем ранг пользователя в лидерборде
      await this.updatePlayerLeaderboard(userObjectId);
      
      // Формируем результат
      return {
        totalScore: user.stats.totalScore || 0,
        gamesPlayed: user.stats.totalGames || 0,
        accuracy: user.stats.accuracy || 0,
        achievements: user.achievements || [],
        newAchievements: unlockedAchievements.map(a => ({
          code: a.code,
          name: a.name,
          description: a.description,
          icon: a.icon
        }))
      };
    } catch (error) {
      logger.error(`Error finishing game for user ${userId}:`, error);
      throw new GameError('Failed to finish game', error);
    }
  }

  /**
   * Рассчитывает очки за ответ в зависимости от правильности и времени
   * @param {boolean} isCorrect - правильный ли ответ
   * @param {number} timeSpentSeconds - время ответа в секундах
   * @param {number} streak - текущая серия правильных ответов
   * @returns {number} - количество очков
   */
  calculateScore(isCorrect, timeSpentSeconds, streak = 0) {
    // Преобразуем время из секунд в миллисекунды для общего модуля
    const timeMs = timeSpentSeconds * 1000;
    
    // Используем общий модуль для расчета очков
    const result = scoreCalculator.calculateScore(isCorrect, timeMs, streak);
    
    // Возвращаем полное количество очков
    return result.totalScore;
  }

  async updateStreak(userId, isCorrect) {
    try {
      // Преобразование userId в ObjectId, если это строка
      let userObjectId;
      try {
        userObjectId = mongoose.Types.ObjectId.isValid(userId) 
          ? new mongoose.Types.ObjectId(userId)
          : userId;
      } catch (error) {
        logger.warn(`Invalid userId format: ${userId}`);
        throw new GameError('Invalid user ID format');
      }
      
      // Пытаемся найти пользователя сначала по ObjectId
      let user = await User.findById(userObjectId);
      
      // Если пользователь не найден и userId - это строка, пробуем найти по telegramId
      if (!user && typeof userId === 'string') {
        user = await User.findOne({ telegramId: userId });
      }
      
      if (!user) {
        throw new GameError('User not found');
      }

      if (isCorrect) {
        user.stats.currentStreak = Math.min(user.stats.currentStreak + 1, this.MAX_STREAK);
        user.stats.maxStreak = Math.max(user.stats.maxStreak, user.stats.currentStreak);
      } else {
        user.stats.currentStreak = 0;
      }

      await user.save();
      await cacheService.invalidatePattern(`user:${userId}:*`);
      
      return user.stats.currentStreak;
    } catch (error) {
      logger.error(`Error updating streak for user ${userId}:`, error);
      throw new GameError('Failed to update streak', error);
    }
  }

  async updateUserStats(userId, gameResults) {
    try {
      // Преобразование userId в ObjectId, если это строка
      let userObjectId;
      try {
        userObjectId = mongoose.Types.ObjectId.isValid(userId) 
          ? new mongoose.Types.ObjectId(userId)
          : userId;
      } catch (error) {
        logger.warn(`Invalid userId format: ${userId}`);
        throw new GameError('Invalid user ID format');
      }
      
      // Пытаемся найти пользователя сначала по ObjectId
      let user = await User.findById(userObjectId);
      
      // Если пользователь не найден и userId - это строка, пробуем найти по telegramId
      if (!user && typeof userId === 'string') {
        user = await User.findOne({ telegramId: userId });
      }
      
      if (!user) {
        throw new GameError('User not found');
      }

      const { isCorrect, timeSpent, score } = gameResults;
      
      // Инициализируем статистику, если её нет
      if (!user.stats) {
        user.stats = {
          totalGames: 0,
          correctAnswers: 0,
          totalScore: 0,
          totalTime: 0,
          averageTime: 0,
          accuracy: 0,
          currentStreak: 0,
          maxStreak: 0,
          perfectGameStreak: 0,
          fastestCorrectAnswer: null
        };
      }
      
      // Обновляем счетчики
      user.stats.totalGames = (user.stats.totalGames || 0) + 1;
      if (isCorrect) {
        user.stats.correctAnswers = (user.stats.correctAnswers || 0) + 1;
        user.stats.totalScore = (user.stats.totalScore || 0) + score;
      }
      
      // Время ответа
      user.stats.totalTime = (user.stats.totalTime || 0) + timeSpent;
      user.stats.averageTime = user.stats.totalTime / user.stats.totalGames;
      
      // Точность
      user.stats.accuracy = Math.round((user.stats.correctAnswers / user.stats.totalGames) * 100);
      
      // Отслеживаем самый быстрый правильный ответ для достижения "Скоростной детектив"
      if (isCorrect) {
        if (!user.stats.fastestCorrectAnswer || timeSpent < user.stats.fastestCorrectAnswer) {
          user.stats.fastestCorrectAnswer = timeSpent;
        }
      }
      
      // Отслеживаем серии игр с 100% точностью для достижения "Мастер дедукции"
      if (isCorrect) {
        // В конце каждой игры, мы обновляем perfectGameStreak если игра была идеальной
        // Эта логика упрощена и должна быть модифицирована для реальной игры
        user.stats.perfectGameStreak = (user.stats.perfectGameStreak || 0) + 1;
      } else {
        user.stats.perfectGameStreak = 0;
      }
      
      // Обновляем ранг пользователя
      user.stats.rank = this.calculateRank(user.stats.totalScore);
      
      // Сохраняем изменения
      user.lastActive = new Date();
      await user.save();
      
      // Инвалидируем кэш
      await cacheService.invalidatePattern(`user:${userId}:*`);
      
      logger.info(`Updated stats for user ${user.telegramId || user._id}: score ${score}, accuracy ${user.stats.accuracy}%`);
      
      return user.stats;
    } catch (error) {
      logger.error(`Error updating stats for user ${userId}:`, error);
      throw new GameError('Failed to update user stats', error);
    }
  }

  // Новый метод для обновления лидерборда пользователя
  async updatePlayerLeaderboard(userId) {
    try {
      // Преобразование userId в ObjectId, если это строка
      let userObjectId;
      try {
        userObjectId = mongoose.Types.ObjectId.isValid(userId) 
          ? new mongoose.Types.ObjectId(userId)
          : userId;
      } catch (error) {
        logger.warn(`Invalid userId format: ${userId}`);
        throw new GameError('Invalid user ID format');
      }
      
      // Пытаемся найти пользователя сначала по ObjectId
      let user = await User.findById(userObjectId);
      
      // Если пользователь не найден и userId - это строка, пробуем найти по telegramId
      if (!user && typeof userId === 'string') {
        user = await User.findOne({ telegramId: userId });
      }
      
      if (!user) {
        throw new GameError('User not found');
      }
      
      // Получаем необходимые данные для обновления лидерборда
      const { stats, username } = user;
      const totalScore = stats?.totalScore || 0;
      const gamesPlayed = stats?.totalGames || 0;
      const wins = stats?.correctAnswers || 0;
      
      // Обновляем лидерборд через сервис лидерборда
      await leaderboardService.updateUserScore(
        userObjectId,
        username,
        totalScore,
        gamesPlayed,
        wins
      );
      
      logger.info(`Updated leaderboard for user ${userId} with score ${totalScore}`);
      return true;
    } catch (error) {
      logger.error(`Error updating leaderboard for user ${userId}:`, error);
      throw new GameError('Failed to update leaderboard', error);
    }
  }

  // Рейтинги и ранги
  calculateRank(score) {
    try {
      for (const [rank, range] of Object.entries(this.RANKS)) {
        if (score >= range.min && score < range.max) {
          return rank;
        }
      }
      return 'GRANDMASTER';
    } catch (error) {
      logger.error('Error calculating rank:', error);
      throw new GameError('Failed to calculate rank', error);
    }
  }

  async updateLeaderboard(userId, score, period = 'daily') {
    try {
      // Преобразование userId в ObjectId, если это строка
      let userObjectId;
      try {
        userObjectId = mongoose.Types.ObjectId.isValid(userId) 
          ? new mongoose.Types.ObjectId(userId)
          : userId;
      } catch (error) {
        logger.warn(`Invalid userId format: ${userId}`);
        throw new GameError('Invalid user ID format');
      }
      
      // Пытаемся найти пользователя сначала по ObjectId
      let user = await User.findById(userObjectId);
      
      // Если пользователь не найден и userId - это строка, пробуем найти по telegramId
      if (!user && typeof userId === 'string') {
        user = await User.findOne({ telegramId: userId });
      }
      
      if (!user) {
        throw new GameError('User not found');
      }

      const leaderboard = await Leaderboard.findOne({ period });
      if (!leaderboard) {
        throw new GameError('Leaderboard not found');
      }

      const entry = leaderboard.entries.find(e => e.userId.toString() === userObjectId.toString());
      
      if (entry) {
        entry.score = score;
        entry.rank = this.calculateRank(score);
      } else {
        leaderboard.entries.push({
          userId: userObjectId,
          score,
          rank: this.calculateRank(score)
        });
      }

      // Сортировка по очкам
      leaderboard.entries.sort((a, b) => b.score - a.score);

      await leaderboard.save();
      await cacheService.invalidatePattern(`leaderboard:${period}`);

      return leaderboard;
    } catch (error) {
      logger.error(`Error updating leaderboard for user ${userId}:`, error);
      throw new GameError('Failed to update leaderboard', error);
    }
  }

  async getLeaderboardPosition(userId, period = 'daily') {
    try {
      const leaderboard = await Leaderboard.findOne({ period });
      if (!leaderboard) {
        throw new GameError('Leaderboard not found');
      }

      const position = leaderboard.entries.findIndex(
        e => e.userId.toString() === userId.toString()
      );

      return position === -1 ? null : position + 1;
    } catch (error) {
      logger.error(`Error getting leaderboard position for user ${userId}:`, error);
      throw new GameError('Failed to get leaderboard position', error);
    }
  }

  // Достижения
  async checkAchievements(userId) {
    try {
      // Преобразование userId в ObjectId, если это строка
      let userObjectId;
      try {
        userObjectId = mongoose.Types.ObjectId.isValid(userId) 
          ? new mongoose.Types.ObjectId(userId)
          : userId;
      } catch (error) {
        logger.warn(`Invalid userId format: ${userId}`);
        throw new GameError('Invalid user ID format');
      }
      
      const achievements = await Achievement.find();
      
      // Пытаемся найти пользователя сначала по ObjectId
      let user = await User.findById(userObjectId);
      
      // Если пользователь не найден и userId - это строка, пробуем найти по telegramId
      if (!user && typeof userId === 'string') {
        user = await User.findOne({ telegramId: userId });
      }
      
      if (!user || !achievements) {
        logger.warn('User or achievements not found', { userId });
        return [];
      }
      
      const stats = user.stats || {};
      const unlocked = [];

      for (const achievement of achievements) {
        // Пропускаем, если достижение уже получено
        if (user.achievements.includes(achievement.code)) {
          continue;
        }
        
        let isUnlocked = false;
        const criteria = achievement.criteria || {};
        
        switch (achievement.code) {
        case 'first_win':
          // Первое расследование
          isUnlocked = stats.totalGames && stats.totalGames >= 1;
          break;
            
        case 'win_streak':
          // Серия успехов - 5 правильных ответов подряд
          isUnlocked = stats.currentStreak && stats.currentStreak >= 5;
          break;
            
        case 'master_detective':
          // Мастер-детектив - 10 завершенных расследований
          isUnlocked = stats.totalGames && stats.totalGames >= 10;
          break;
            
        case 'quick_solver':
          // Молниеносное раскрытие - игра менее чем за 30 секунд
          isUnlocked = stats.fastestGameTime && stats.fastestGameTime <= 30;
          break;
            
        case 'perfect_score':
          // Идеальный счет - 100% точность в игре
          isUnlocked = stats.accuracy === 100 && stats.totalGames >= 1;
          break;
            
        default:
          logger.warn(`Unknown achievement code: ${achievement.code}`);
          continue;
        }
        
        if (isUnlocked) {
          // Выдаем достижение
          await this.unlockAchievement(user._id, achievement.code);
          unlocked.push(achievement);
          logger.info(`Achievement unlocked for user ${user.telegramId || user._id}: ${achievement.name}`);
        }
      }

      return unlocked;
    } catch (error) {
      logger.error(`Error checking achievements for user ${userId}:`, error);
      throw new GameError('Failed to check achievements', error);
    }
  }

  async unlockAchievement(userId, achievementCode) {
    try {
      // Преобразование userId в ObjectId, если это строка
      let userObjectId;
      try {
        userObjectId = mongoose.Types.ObjectId.isValid(userId) 
          ? new mongoose.Types.ObjectId(userId)
          : userId;
      } catch (error) {
        logger.warn(`Invalid userId format: ${userId}`);
        throw new GameError('Invalid user ID format');
      }
      
      // Пытаемся найти пользователя сначала по ObjectId
      let user = await User.findById(userObjectId);
      
      // Если пользователь не найден и userId - это строка, пробуем найти по telegramId
      if (!user && typeof userId === 'string') {
        user = await User.findOne({ telegramId: userId });
      }
      
      if (!user) {
        throw new GameError('User not found');
      }

      if (!user.achievements.includes(achievementCode)) {
        user.achievements.push(achievementCode);
        await user.save();
        await cacheService.invalidatePattern(`user:${userId}:*`);
      }

      return user.achievements;
    } catch (error) {
      logger.error(`Error unlocking achievement ${achievementCode} for user ${userId}:`, error);
      throw new GameError('Failed to unlock achievement', error);
    }
  }

  async getAchievementsProgress(userId) {
    try {
      let user = null;
      
      // Если userId - это строка, которая похожа на telegramId, сначала ищем по нему
      if (typeof userId === 'string' && !mongoose.Types.ObjectId.isValid(userId)) {
        user = await User.findOne({ telegramId: userId });
        // Если нашли пользователя по telegramId, работаем с его _id
        if (user) {
          userId = user._id;
        } else {
          throw new GameError(`User not found with telegramId: ${userId}`);
        }
      } else {
        // Если это ObjectId или строка, которую можно преобразовать в ObjectId
        try {
          const objectId = new mongoose.Types.ObjectId(userId);
          user = await User.findById(objectId);
          if (!user) {
            // Если не нашли по _id, попробуем поискать по telegramId как запасной вариант
            user = await User.findOne({ telegramId: userId });
            if (!user) {
              throw new GameError(`User not found with id: ${userId}`);
            }
          }
        } catch (error) {
          // Если не удалось преобразовать в ObjectId, пробуем снова искать по telegramId
          user = await User.findOne({ telegramId: userId });
          if (!user) {
            throw new GameError(`User not found with id: ${userId}`);
          }
        }
      }
      
      const achievements = await Achievement.find();
      
      if (!achievements) {
        throw new GameError('Achievements not found');
      }

      // Кешируем результат на 5 минут
      const cacheKey = `user:${userId}:achievements:progress`;
      const cachedProgress = await cacheService.get(cacheKey);
      
      if (cachedProgress) {
        logger.debug(`Returning cached achievements progress for user ${userId}`);
        return JSON.parse(cachedProgress);
      }

      const result = achievements.map(achievement => ({
        code: achievement.code,
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        unlocked: user.achievements.includes(achievement.code),
        progress: this.calculateAchievementProgress(achievement.code, user.stats)
      }));

      // Кешируем результат
      await cacheService.set(cacheKey, JSON.stringify(result), 300); // 5 минут
      
      return result;
    } catch (error) {
      logger.error(`Error getting achievements progress for user ${userId}:`, error);
      throw new GameError('Failed to get achievements progress', error);
    }
  }

  calculateAchievementProgress(achievementCode, stats) {
    switch (achievementCode) {
    case 'FIRST_WIN':
      return stats.correctAnswers >= 1 ? 100 : 0;
    case 'STREAK_MASTER':
      return Math.min((stats.maxStreak / 10) * 100, 100);
    case 'PERFECT_ACCURACY':
      return stats.totalGames >= 10 ? (stats.accuracy / 100) * 100 : 0;
    case 'SPEED_DEMON':
      return stats.totalGames >= 20 ? Math.max(0, 100 - (stats.averageTime / 5) * 100) : 0;
    case 'VETERAN':
      return Math.min((stats.totalGames / 100) * 100, 100);
    case 'MASTER_RANK':
      const rank = this.calculateRank(stats.totalScore);
      return rank === 'MASTER' ? 100 : 0;
    default:
      return 0;
    }
  }

  // Метод для проверки ответа игрока из контроллера
  async checkAnswer(storyId, selectedOptionIndex, isCorrect, answerTimeMs) {
    try {
      logger.info(`Проверка ответа: storyId=${storyId}, option=${selectedOptionIndex}, isCorrect=${isCorrect}, time=${answerTimeMs}ms`);
      
      // Конвертировать время из миллисекунд в секунды для расчета очков
      const timeSpentSeconds = answerTimeMs / 1000;
      
      // В реальной реализации здесь была бы проверка правильности ответа через базу данных
      // Но так как с фронтенда передается isCorrect, используем его
      
      // Рассчитываем очки за ответ (без учета серии правильных ответов)
      // В настоящей реализации userStats был бы получен из БД
      const score = this.calculateScore(isCorrect, timeSpentSeconds, 0);
      
      return {
        success: true,
        isCorrect,
        score,
        storyId,
        selectedOptionIndex
      };
    } catch (error) {
      logger.error('Error checking answer:', error);
      throw new GameError('Failed to check answer', error);
    }
  }
}

module.exports = new GameLogicService(); 