const { createLogger } = require('../config/logger');
const { UserError, ValidationError } = require('../utils/errorHandler');
const User = require('../models/User');
const cacheService = require('./cacheService');
const { validateUserData } = require('../utils/validator');

const logger = createLogger('UserService');

class UserService {
  /**
   * Validate user data for creating or updating
   * @param {Object} userData - User data to validate
   * @throws {ValidationError} If validation fails
   */
  validateUserData(userData) {
    if (!userData) {
      throw new ValidationError('User data is required');
    }
    
    // Check required fields
    const requiredFields = ['id', 'first_name'];
    for (const field of requiredFields) {
      if (!userData[field]) {
        throw new ValidationError(`Field '${field}' is required for user data`);
      }
    }
    
    // Validate data types
    if (typeof userData.id !== 'number' && typeof userData.id !== 'string') {
      throw new ValidationError('User ID must be a number or string');
    }
    
    if (typeof userData.first_name !== 'string') {
      throw new ValidationError('First name must be a string');
    }
    
    // Optional fields validation
    if (userData.last_name !== undefined && typeof userData.last_name !== 'string') {
      throw new ValidationError('Last name must be a string');
    }
    
    if (userData.username !== undefined && typeof userData.username !== 'string') {
      throw new ValidationError('Username must be a string');
    }
    
    if (userData.photo_url !== undefined && typeof userData.photo_url !== 'string') {
      throw new ValidationError('Photo URL must be a string');
    }
    
    return true;
  }

  /**
   * Create a new user
   * @param {Object} userData - User data from Telegram
   * @returns {Promise<Object>} Created user
   */
  async createUser(userData) {
    try {
      // Validate user data
      this.validateUserData(userData);
      
      // Check if user already exists
      const existingUser = await User.findOne({ telegramId: userData.id });
      if (existingUser) {
        logger.info(`User already exists: ${userData.id}`);
        // Обновляем поля пользователя
        Object.assign(existingUser, this.mapTelegramUserToModel(userData));
        await existingUser.save();
        return existingUser;
      }
      
      // Create new user
      const user = new User(this.mapTelegramUserToModel(userData));
      await user.save();
      
      logger.info(`New user created: ${user.telegramId}`);
      return user;
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  async getUserById(telegramId) {
    try {
      let user = null;
      
      try {
        user = await cacheService.getUserProfile(telegramId);
      } catch (cacheError) {
        logger.warn(`Cache error for user ${telegramId}, falling back to database:`, cacheError);
      }
      
      if (!user) {
        user = await User.findOne({ telegramId });
        if (!user) {
          throw new UserError('User not found');
        }
        
        try {
          await cacheService.cacheUserProfile(telegramId, user);
        } catch (cacheError) {
          logger.warn(`Failed to cache user ${telegramId}:`, cacheError);
        }
      }
      
      return user;
    } catch (error) {
      if (error instanceof UserError) {
        throw error;
      }
      logger.error(`Error getting user ${telegramId}:`, error);
      throw new UserError('Failed to get user', error);
    }
  }

  async updateUserScore(telegramId, score) {
    try {
      const user = await User.findOne({ telegramId });
      if (!user) {
        throw new UserError('User not found');
      }

      user.stats.totalScore += score;
      user.lastActive = new Date();
      
      await user.save();
      
      await cacheService.invalidatePattern(`user:${telegramId}:*`);
      logger.info(`Updated score for user ${telegramId}: +${score}`);
      
      await this.updateUserLeaderboard(user._id);
      
      return user.stats.totalScore;
    } catch (error) {
      logger.error(`Error updating score for user ${telegramId}:`, error);
      throw new UserError('Failed to update user score', error);
    }
  }

  async updateUserLeaderboard(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new UserError('User not found');
      }
      
      const { stats } = user;
      const username = user.username || `User${user.telegramId.slice(-5)}`;
      
      const scoreData = {
        totalScore: stats.totalScore || 0,
        gamesPlayed: stats.totalGames || 0,
        wins: stats.correctAnswers || 0
      };
      
      const leaderboardService = require('./leaderboardService');
      
      await leaderboardService.updateUserScore(
        userId,
        username,
        scoreData.totalScore,
        scoreData.gamesPlayed,
        scoreData.wins
      );
      
      logger.info(`Updated leaderboard for user ${userId}`);
      return true;
    } catch (error) {
      logger.error(`Error updating leaderboard for user ${userId}:`, error);
      throw new UserError('Failed to update user leaderboard', error);
    }
  }

  async getUserStats(telegramId) {
    try {
      const user = await this.getUserById(telegramId);
      return user.stats;
    } catch (error) {
      logger.error(`Error getting stats for user ${telegramId}:`, error);
      throw new UserError('Failed to get user stats', error);
    }
  }

  async getUserAchievements(telegramId) {
    try {
      const cached = await cacheService.getAchievements(telegramId);
      if (cached) return cached;

      const user = await User.findOne({ telegramId });
      if (!user) {
        throw new UserError('User not found');
      }

      await cacheService.cacheAchievements(telegramId, user.achievements);
      return user.achievements;
    } catch (error) {
      logger.error(`Error getting achievements for user ${telegramId}:`, error);
      throw new UserError('Failed to get user achievements', error);
    }
  }

  /**
   * Map Telegram user data to database model
   * @param {Object} telegramData - Raw Telegram user data
   * @returns {Object} Mapped user data for database
   */
  mapTelegramUserToModel(telegramData) {
    return {
      telegramId: telegramData.id,
      username: telegramData.username || '',
      firstName: telegramData.first_name,
      lastName: telegramData.last_name || '',
      photoUrl: telegramData.photo_url || '',
      lastActive: new Date()
    };
  }
}

module.exports = new UserService(); 