import { createLogger } from '../config/logger.js';
import { ValidationError } from '../utils/errorHandler.js';
import { success } from '../utils/responseFormatter.js';
import userService from '../services/userService.js';
import authService from '../services/authService.js';
import gameService from '../services/gameLogicService.js';
import { validateTelegramWebAppData, validateTelegramUser } from '../middlewares/auth.js';

const logger = createLogger('UserController');

class UserController {
  constructor() {
    // Привязываем методы к экземпляру класса
    this.createUser = this.createUser.bind(this);
    this.getProfile = this.getProfile.bind(this);
    this.getAchievements = this.getAchievements.bind(this);
    this.getAchievementsProgress = this.getAchievementsProgress.bind(this);
    this.login = this.login.bind(this);
  }

  async createUser(req, res, next) {
    try {
      const userData = req.body;
      
      // Раскомментировал валидацию для безопасности в продакшене
      await validateTelegramWebAppData(req, res, () => {});
      
      // Создание пользователя
      const user = await userService.createUser(userData);
      
      // Генерация токена
      const token = authService.generateToken(user);
      
      // Возвращаем ответ с user и token, соблюдая ожидаемый формат
      return res.status(201).json(success({
        user,
        token
      }));
    } catch (error) {
      logger.error('Error creating user:', error);
      next(error);
    }
  }

  async getProfile(req, res, next) {
    try {
      const { telegramId } = req.params;
      
      // Валидация пользователя Telegram
      await validateTelegramUser(req, res, () => {});
      
      // Получение профиля
      const user = await userService.getUserById(telegramId);
      
      return success(res, { user });
    } catch (error) {
      logger.error('Error getting user profile:', error);
      next(error);
    }
  }

  async getAchievements(req, res, next) {
    try {
      const { telegramId } = req.params;
      
      // Валидация пользователя Telegram
      await validateTelegramUser(req, res, () => {});
      
      // Получение достижений
      const achievements = await userService.getUserAchievements(telegramId);
      
      return success(res, { achievements });
    } catch (error) {
      logger.error('Error getting user achievements:', error);
      next(error);
    }
  }

  async getAchievementsProgress(req, res, next) {
    try {
      const { telegramId } = req.params;
      
      // Валидация пользователя Telegram
      await validateTelegramUser(req, res, () => {});
      
      // Получение прогресса достижений
      const achievementsProgress = await gameService.getAchievementsProgress(telegramId);
      
      return success(res, { achievementsProgress });
    } catch (error) {
      logger.error('Error getting achievements progress:', error);
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { telegramId } = req.body;
      
      const user = await userService.getUserById(telegramId);
      if (!user) {
        throw new ValidationError('User not found');
      }

      const token = authService.generateToken(user);
      return success(res, {
        status: 'success',
        message: 'Login successful',
        data: {
          token,
          user: {
            _id: user._id,
            telegramId: user.telegramId,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            score: user.score,
            gamesPlayed: user.gamesPlayed,
            gamesWon: user.gamesWon,
            achievements: user.achievements,
            createdAt: user.createdAt,
            lastActive: user.lastActive
          }
        }
      });
    } catch (error) {
      logger.error('Error during login:', error);
      next(error);
    }
  }
}

export default new UserController(); 