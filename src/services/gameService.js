const { Game, Card, GameCard } = require('../models');
const logger = require('../utils/logger');
const ValidationError = require('../errors/ValidationError');
const NotFoundError = require('../errors/NotFoundError');

class GameService {
  /**
   * Validate game data
   * @param {string} action - Action type ('start', 'submit', 'finish')
   * @param {Object} data - Data to validate
   * @throws {ValidationError} If validation fails
   */
  validateGameData(action, data) {
    switch (action) {
      case 'start':
        // Nothing to validate for starting a game
        break;
      case 'submit':
        if (!data.gameId) throw new ValidationError('Game ID is required');
        if (!data.cardId) throw new ValidationError('Card ID is required');
        if (data.answer === undefined) throw new ValidationError('Answer is required');
        break;
      case 'finish':
        if (!data.gameId) throw new ValidationError('Game ID is required');
        if (typeof data.score !== 'number') throw new ValidationError('Score must be a number');
        if (!Array.isArray(data.cards)) throw new ValidationError('Cards must be an array');
        
        // Validate each card
        data.cards.forEach((card, index) => {
          if (!card.id) throw new ValidationError(`Card at index ${index} is missing ID`);
          if (card.seen === undefined) throw new ValidationError(`Card at index ${index} is missing seen status`);
          if (card.correct === undefined) throw new ValidationError(`Card at index ${index} is missing correct status`);
        });
        break;
      case 'track':
        if (!data.action) throw new ValidationError('Action is required');
        if (!data.gameId) throw new ValidationError('Game ID is required');
        if (data.action === 'view_card' && !data.cardId) {
          throw new ValidationError('Card ID is required for view_card action');
        }
        break;
      default:
        throw new ValidationError(`Unknown action: ${action}`);
    }
  }

  /**
   * Обрабатывает ответ пользователя, вычисляет очки и обновляет статистику игры
   * 
   * @param {string} userId - ID пользователя
   * @param {string} gameId - ID игры
   * @param {string} questionId - ID вопроса
   * @param {string} selectedAnswer - Выбранный пользователем ответ
   * @param {number} timeSpent - Время, затраченное на ответ (в секундах)
   * @returns {Object} - Объект с результатами обработки ответа:
   *   - isCorrect {boolean} - Правильность ответа
   *   - scoreEarned {number} - Заработанные очки
   *   - totalScore {number} - Общий счет игры
   *   - currentStreak {number} - Текущая серия правильных ответов
   *   - maxStreak {number} - Максимальная серия правильных ответов
   *   - correctAnswers {number} - Количество правильных ответов
   *   - answeredQuestions {number} - Общее количество отвеченных вопросов
   */
  async processAnswer(userId, gameId, questionId, selectedAnswer, timeSpent) {
    try {
      // Проверка существования игры
      const game = await this.gameRepository.getById(gameId);
      if (!game) {
        throw new GameError('Game not found');
      }

      // Проверка, принадлежит ли игра пользователю
      if (game.userId !== userId) {
        throw new GameError('User not authorized for this game');
      }

      // Получение текущего вопроса
      const question = await this.questionRepository.getById(questionId);
      if (!question) {
        throw new GameError('Question not found');
      }

      // Проверка правильности ответа
      const isCorrect = question.correctAnswer === selectedAnswer;
      
      // Обновление статистики игры
      game.answeredQuestions += 1;
      
      // Обновление серии правильных ответов
      if (isCorrect) {
        game.currentStreak += 1;
        game.correctAnswers += 1;
        if (game.currentStreak > game.maxStreak) {
          game.maxStreak = game.currentStreak;
        }
      } else {
        game.currentStreak = 0;
      }

      // Расчет очков за ответ
      const scoreEarned = this.gameLogicService.calculateScore(
        isCorrect, 
        timeSpent,
        game.currentStreak
      );
      
      game.totalScore += scoreEarned;
      
      // Сохранение обновленной игры
      await this.gameRepository.update(game);
      
      // Логирование результата
      logger.info(`User ${userId} answered question ${questionId} in game ${gameId}: correct=${isCorrect}, score=${scoreEarned}, total=${game.totalScore}`);
      
      // Возвращаем результат
      return {
        isCorrect,
        scoreEarned,
        totalScore: game.totalScore,
        currentStreak: game.currentStreak,
        maxStreak: game.maxStreak,
        correctAnswers: game.correctAnswers,
        answeredQuestions: game.answeredQuestions
      };
    } catch (error) {
      logger.error('Error processing answer:', error);
      throw new GameError('Failed to process answer', error);
    }
  }

  /**
   * Start a new game for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Game data
   */
  async startGame(userId) {
    try {
      // Get 10 random cards
      const cards = await Card.aggregate([
        { $sample: { size: 10 } }
      ]);
      
      if (cards.length === 0) {
        throw new ValidationError('No cards available');
      }
      
      // Create a new game
      const game = new Game({
        userId,
        status: 'active',
        score: 0,
        startTime: new Date(),
      });
      
      await game.save();
      
      // Associate cards with the game
      const gameCards = cards.map(card => ({
        gameId: game._id,
        cardId: card._id,
        seen: false,
        answered: false,
        userAnswer: null
      }));
      
      await GameCard.insertMany(gameCards);
      
      // Prepare response data
      const gameData = {
        gameId: game._id,
        cards: cards.map(card => ({
          id: card._id,
          question: card.question,
          truth: card.truth,
          seen: false,
          answered: false
        }))
      };
      
      return gameData;
    } catch (error) {
      logger.error('Error starting game:', error);
      throw error;
    }
  }

  /**
   * Submit an answer for a card
   * @param {Object} answerData - Answer data
   * @returns {Promise<Object>} Result data
   */
  async submitAnswer(answerData) {
    try {
      this.validateGameData('submit', answerData);
      
      const { gameId, cardId, answer } = answerData;
      
      // Find the game card
      const gameCard = await GameCard.findOne({ gameId, cardId });
      if (!gameCard) {
        throw new NotFoundError('Game card not found');
      }
      
      // Find the card to get the correct answer
      const card = await Card.findById(cardId);
      if (!card) {
        throw new NotFoundError('Card not found');
      }
      
      // Update the game card with user's answer
      gameCard.answered = true;
      gameCard.userAnswer = answer;
      await gameCard.save();
      
      // Calculate score change
      const isCorrect = (answer === card.truth);
      const scoreChange = isCorrect ? 10 : 0;
      
      // Update game score
      if (scoreChange > 0) {
        await Game.findByIdAndUpdate(gameId, {
          $inc: { score: scoreChange }
        });
      }
      
      return {
        correct: isCorrect,
        scoreChange,
        correctAnswer: card.truth,
        explanation: card.explanation
      };
    } catch (error) {
      logger.error('Error submitting answer:', error);
      throw error;
    }
  }

  /**
   * Track user actions in the game
   * @param {Object} trackData - Tracking data
   * @returns {Promise<Object>} Tracking result
   */
  async trackAction(trackData) {
    try {
      this.validateGameData('track', trackData);
      
      const { action, gameId, cardId } = trackData;
      
      if (action === 'view_card') {
        // Mark card as seen
        await GameCard.findOneAndUpdate(
          { gameId, cardId },
          { seen: true }
        );
      }
      
      return { success: true };
    } catch (error) {
      logger.error('Error tracking action:', error);
      // Fail silently for tracking
      return { success: false };
    }
  }

  /**
   * Finish a game and calculate final results
   * @param {Object} finishData - Game finish data
   * @returns {Promise<Object>} Final results
   */
  async finishGame(finishData) {
    try {
      this.validateGameData('finish', finishData);
      
      const { gameId, score, cards } = finishData;
      
      // Find and update the game
      const game = await Game.findById(gameId);
      if (!game) {
        throw new NotFoundError('Game not found');
      }
      
      // Update game status
      game.status = 'completed';
      game.endTime = new Date();
      game.score = score;
      await game.save();
      
      // Update game cards with final status
      for (const cardData of cards) {
        await GameCard.findOneAndUpdate(
          { gameId, cardId: cardData.id },
          {
            seen: cardData.seen,
            answered: cardData.correct !== undefined,
            userAnswer: cardData.correct
          }
        );
      }
      
      return {
        gameId,
        score,
        timePlayed: Math.round((game.endTime - game.startTime) / 1000),
        cardsPlayed: cards.length,
        correctAnswers: cards.filter(c => c.correct).length
      };
    } catch (error) {
      logger.error('Error finishing game:', error);
      throw error;
    }
  }

  /**
   * Отслеживает просмотр карточки
   * @param {string} gameId - ID игры
   * @param {string} cardId - ID карточки
   * @returns {Promise<boolean>} Результат операции
   */
  async trackCardView(gameId, cardId) {
    try {
      // Валидация входных данных
      this.validateGameData('track', { action: 'view_card', gameId, cardId });
      
      // Находим связь игра-карточка
      const gameCard = await GameCard.findOne({ gameId, cardId });
      
      if (!gameCard) {
        logger.warn(`Связь игра-карточка не найдена для игры ${gameId} и карточки ${cardId}`);
        return false;
      }
      
      // Отмечаем карточку как просмотренную
      if (!gameCard.seen) {
        gameCard.seen = true;
        await gameCard.save();
        logger.info(`Карточка ${cardId} отмечена как просмотренная в игре ${gameId}`);
      }
      
      return true;
    } catch (error) {
      logger.error(`Ошибка отслеживания просмотра карточки ${cardId} в игре ${gameId}:`, error);
      // Для трекинга не выбрасываем ошибку дальше
      return false;
    }
  }
}

module.exports = new GameService();