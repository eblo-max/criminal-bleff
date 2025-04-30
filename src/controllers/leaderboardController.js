const { createLogger } = require('../config/logger');
const { ValidationError } = require('../utils/errorHandler');
const { success, error } = require('../utils/responseFormatter');
const leaderboardService = require('../services/leaderboardService');
const { validateTelegramWebAppData, validateTelegramUser } = require('../middlewares/auth');
const Leaderboard = require('../models/Leaderboard');
const mongoose = require('mongoose');

const logger = createLogger('LeaderboardController');

class LeaderboardController {
  constructor() {
    // Привязываем методы к экземпляру класса
    this.getDailyLeaderboard = this.getDailyLeaderboard.bind(this);
    this.getWeeklyLeaderboard = this.getWeeklyLeaderboard.bind(this);
    this.getAllTimeLeaderboard = this.getAllTimeLeaderboard.bind(this);
    this.getUserRank = this.getUserRank.bind(this);
  }

  async getDailyLeaderboard(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const result = await leaderboardService.getDailyLeaderboard(page, limit);
      return success(res, result);
    } catch (err) {
      logger.error('Error getting daily leaderboard:', err);
      return error(res, err.message || 'Failed to get daily leaderboard');
    }
  }

  async getWeeklyLeaderboard(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const result = await leaderboardService.getWeeklyLeaderboard(page, limit);
      return success(res, result);
    } catch (err) {
      logger.error('Error getting weekly leaderboard:', err);
      return error(res, err.message || 'Failed to get weekly leaderboard');
    }
  }

  async getAllTimeLeaderboard(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const result = await leaderboardService.getAllTimeLeaderboard(page, limit);
      return success(res, result);
    } catch (err) {
      logger.error('Error getting all-time leaderboard:', err);
      return error(res, err.message || 'Failed to get all-time leaderboard');
    }
  }

  async getUserRank(req, res) {
    try {
      // Проверяем идентификатор пользователя из запроса
      const { userId } = req.params;
      const { period = 'all-time' } = req.query;
      
      if (!userId) {
        throw new ValidationError('User ID is required');
      }
      
      const result = await leaderboardService.getUserRank(userId, period);
      
      if (!result) {
        return success(res, { message: 'User not found in leaderboard', data: null });
      }
      
      return success(res, result);
    } catch (err) {
      logger.error('Error getting user rank:', err);
      return error(res, err.message || 'Failed to get user rank');
    }
  }

  async initializeLeaderboards(req, res, next) {
    try {
      logger.info('Initializing leaderboards...');
      
      // Сохраняем результаты инициализации
      const results = {
        daily: false,
        weekly: false,
        allTime: false
      };
      
      // Инициализация дневного лидерборда
      const dailyExists = await Leaderboard.findOne({ period: 'daily' });
      if (!dailyExists) {
        logger.info('Creating daily leaderboard...');
        await Leaderboard.create({
          period: 'daily'
          // entries будет по умолчанию пустым массивом
        });
        logger.info('Daily leaderboard created successfully');
        results.daily = true;
      } else {
        logger.info('Daily leaderboard already exists');
        results.daily = true;
      }

      // Инициализация недельного лидерборда
      const weeklyExists = await Leaderboard.findOne({ period: 'weekly' });
      if (!weeklyExists) {
        logger.info('Creating weekly leaderboard...');
        await Leaderboard.create({
          period: 'weekly'
          // entries будет по умолчанию пустым массивом
        });
        logger.info('Weekly leaderboard created successfully');
        results.weekly = true;
      } else {
        logger.info('Weekly leaderboard already exists');
        results.weekly = true;
      }

      // Инициализация общего лидерборда
      const allTimeExists = await Leaderboard.findOne({ period: 'all-time' });
      if (!allTimeExists) {
        logger.info('Creating all-time leaderboard...');
        await Leaderboard.create({
          period: 'all-time'
          // entries будет по умолчанию пустым массивом
        });
        logger.info('All-time leaderboard created successfully');
        results.allTime = true;
      } else {
        logger.info('All-time leaderboard already exists');
        results.allTime = true;
      }

      return success(res, { 
        message: 'Leaderboards initialized successfully',
        results
      });
    } catch (error) {
      logger.error('Error initializing leaderboards:', error);
      next(error);
    }
  }

  // Метод для обновления рангов (для административных целей)
  async updateRanks(req, res, next) {
    try {
      const { period = 'all-time' } = req.body;
      
      if (!['daily', 'weekly', 'all-time'].includes(period)) {
        return error(res, 'Invalid period. Must be one of: daily, weekly, all-time', 400);
      }
      
      const result = await leaderboardService.updateAllRanks(period);
      
      if (result) {
        return success(res, { 
          message: `Successfully updated ranks for ${period} leaderboard` 
        });
      } else {
        return error(res, `Leaderboard for period ${period} not found`, 404);
      }
    } catch (err) {
      logger.error('Error updating leaderboard ranks:', err);
      next(err);
    }
  }
}

// Создаем и экспортируем экземпляр контроллера
const leaderboardController = new LeaderboardController();
module.exports = leaderboardController; 