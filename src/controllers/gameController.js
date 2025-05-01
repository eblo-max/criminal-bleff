import { createLogger } from '../config/logger.js';
import { ValidationError } from '../utils/errorHandler.js';
import { success, error } from '../utils/responseFormatter.js';
import gameService from '../services/gameLogicService.js';
import { validateTelegramWebAppData, validateTelegramUser } from '../middlewares/auth.js';
import userService from '../services/userService.js';

const logger = createLogger('GameController');

class GameController {
  // Явно определяем методы как свойства класса для обеспечения их доступности
  constructor() {
    // Привязываем методы к экземпляру класса
    this.getRandomStories = this.getRandomStories.bind(this);
    this.submitAnswer = this.submitAnswer.bind(this);
    this.finishGame = this.finishGame.bind(this);
    this.startGame = this.startGame.bind(this);
    this.trackAction = this.trackAction.bind(this);
  }

  async getRandomStories(req, res) {
    try {
      // Валидация теперь выполняется в middleware strictTelegramAuth
      
      // Получение случайных историй
      const stories = await gameService.getRandomStories();
      
      return success(res, { stories });
    } catch (err) {
      logger.error('Error getting random stories:', err);
      return error(res, err.message || 'Failed to get stories');
    }
  }

  async submitAnswer(req, res, next) {
    try {
      const { telegramUserId, storyId, selectedOptionIndex, isCorrect, answerTimeMs } = req.body;
      
      // Валидация теперь выполняется в middleware strictTelegramAuth
      
      // Проверяем ответ
      const result = await gameService.checkAnswer(storyId, selectedOptionIndex, isCorrect, answerTimeMs);
      
      // Обновляем статистику пользователя, если он авторизован
      if (telegramUserId) {
        await userService.updateStats(telegramUserId, isCorrect);
      }
      
      return success(res, result, 'Answer processed', 200);
    } catch (error) {
      logger.error('Error processing answer:', error);
      next(error);
    }
  }

  async finishGame(req, res, next) {
    try {
      const { score, correctAnswers, totalQuestions, maxStreak, telegramUserId } = req.body;
      
      // Валидация теперь выполняется в middleware strictTelegramAuth
      
      // Сохраняем результаты игры
      const gameResult = await gameService.saveGameResult({
        score,
        correctAnswers,
        totalQuestions,
        maxStreak,
        telegramUserId
      });
      
      return success(res, gameResult, 'Game finished successfully', 200);
    } catch (error) {
      logger.error('Error finishing game:', error);
      next(error);
    }
  }

  async startGame(req, res, next) {
    try {
      // Валидация теперь выполняется в middleware strictTelegramAuth
      
      // Получаем список всех историй с описаниями
      const stories = await gameService.getStories();
      
      return success(res, { stories }, 'Game stories loaded successfully', 200);
    } catch (error) {
      logger.error('Error starting game:', error);
      next(error);
    }
  }

  /**
   * Отслеживает действия пользователя в игре
   * @param {Object} req - HTTP запрос
   * @param {Object} res - HTTP ответ
   * @param {Function} next - Следующий middleware
   */
  async trackAction(req, res, next) {
    try {
      const { action, gameId, cardId } = req.body;
      
      // Валидация входных данных
      if (!action) {
        throw new ValidationError('Требуется указать действие');
      }
      
      if (!gameId) {
        throw new ValidationError('Требуется указать ID игры');
      }
      
      // Для просмотра карточки требуется ID карточки
      if (action === 'view_card' && !cardId) {
        throw new ValidationError('Для действия view_card требуется указать ID карточки');
      }
      
      // Обработка различных действий
      let result = { success: true };
      
      switch (action) {
        case 'view_card':
          // Отмечаем карточку как просмотренную
          await gameService.trackCardView(gameId, cardId);
          break;
        
        case 'game_started':
          // Логируем начало игры
          logger.info(`Игра ${gameId} начата`);
          break;
        
        default:
          // Логируем неизвестное действие
          logger.info(`Неизвестное действие '${action}' для игры ${gameId}`);
      }
      
      return success(res, result, 'Действие отслежено', 200);
    } catch (error) {
      // Для трекинга не прерываем работу в случае ошибок
      logger.error('Ошибка отслеживания действия:', error);
      return success(res, { success: true }, 'Действие обработано', 200);
    }
  }
}

// Создаем и экспортируем экземпляр контроллера
const gameController = new GameController();
export default gameController;
export const { getRandomStories, submitAnswer, finishGame, startGame, trackAction } = gameController; 