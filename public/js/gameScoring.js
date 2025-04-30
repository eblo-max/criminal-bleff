/**
 * Модуль начисления очков в игре Криминальный Блеф
 * Отвечает за подсчет очков, бонусов и отправку результатов на сервер
 */

import { logger, fetchWithRetry } from './utils.js';
import { telegramUser } from './telegram.js';
import { gameState } from './gameCore.js';
import { calculateScore, calculateStreakBonus } from './utils/scoreCalculator.js';

// Базовый URL API
const API_BASE_URL = window.location.hostname.includes('localhost') 
  ? 'http://localhost:3000' 
  : '';

/**
 * Отправляет ответ на сервер
 * @param {string} storyId - ID истории
 * @param {number} answerIndex - индекс выбранного ответа
 * @param {boolean} isCorrect - правильность ответа
 * @param {number} answerTime - время ответа в миллисекундах
 * @returns {Promise<Object>} результат отправки
 */
async function submitAnswer(storyId, answerIndex, isCorrect, answerTime) {
  try {
    // Валидация входных данных
    if (!storyId) {
      logger.error('Некорректный ID истории', { storyId });
      return {
        success: false,
        error: 'InvalidStoryId'
      };
    }

    if (typeof answerIndex !== 'number' || answerIndex < 0) {
      logger.error('Некорректный индекс ответа', { answerIndex });
      return {
        success: false,
        error: 'InvalidAnswerIndex'
      };
    }

    if (typeof answerTime !== 'number' || answerTime < 0) {
      logger.error('Некорректное время ответа', { answerTime });
      return {
        success: false,
        error: 'InvalidAnswerTime'
      };
    }

    // URL API для отправки ответа
    const apiUrl = `${API_BASE_URL}/api/game/submit`;
    
    // Отправка данных на сервер
    const response = await fetchWithRetry(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        storyId,
        selectedOptionIndex: answerIndex,
        isCorrect,
        answerTimeMs: answerTime,
        telegramUserId: telegramUser?.id
      })
    });

    if (response.success) {
      // Используем общий модуль расчета очков
      const scoreResult = calculateScore(isCorrect, answerTime, gameState.streak);
      
      // Обновляем счет игры при правильном ответе
      if (isCorrect) {
        gameState.score += scoreResult.totalScore;
        gameState.streak = (gameState.streak || 0) + 1;
      } else {
        gameState.streak = 0;
      }
      
      return response.data;
    } else {
      // Запасной вариант: считаем локально при недоступности сервера
      const scoreResult = calculateScore(isCorrect, answerTime, gameState.streak);
      
      // Обновляем счет игры при правильном ответе
      if (isCorrect) {
        gameState.score += scoreResult.totalScore;
        gameState.streak = (gameState.streak || 0) + 1;
      } else {
        gameState.streak = 0;
      }
      
      logger.warn('Ошибка отправки ответа на сервер. Используем локальный расчет.', response);
      
      return {
        isCorrect,
        score: scoreResult.totalScore,
        correctAnswer: isCorrect ? answerIndex : null // Это заглушка
      };
    }
  } catch (error) {
    logger.error('Ошибка при отправке ответа:', error);
    
    // Запасной вариант для работы в оффлайн
    const scoreResult = calculateScore(isCorrect, answerTime, gameState.streak);
    
    // Обновляем счет игры при правильном ответе
    if (isCorrect) {
      gameState.score += scoreResult.totalScore;
      gameState.streak = (gameState.streak || 0) + 1;
    } else {
      gameState.streak = 0;
    }
    
    return {
      isCorrect,
      score: scoreResult.totalScore,
      offline: true
    };
  }
}

/**
 * Рассчитывает количество очков за скорость ответа
 * @param {number} timeLeft - оставшееся время в миллисекундах
 * @returns {number} - бонусные очки за скорость
 * @deprecated Используйте calculateScore из модуля scoreCalculator
 */
function calculateLocalScore(timeLeft) {
  // Используем общий модуль расчета очков
  const result = calculateScore(true, timeLeft, 0);
  return result.baseScore;
}

/**
 * Рассчитывает бонус за серию правильных ответов
 * @param {number} streak - текущая серия правильных ответов
 * @returns {number} - бонусные очки за серию
 */
function calculateStreakBonus(streak) {
  if (streak < 3) return 0;
  // 10 очков за 3 подряд, 20 за 4, 30 за 5 и т.д.
  return (streak - 2) * 10;
}

/**
 * Форматирование данных очков для отображения
 * @param {Object} scoreData - данные о набранных очках
 * @returns {Object} - форматированные данные для отображения
 */
function formatScoreData(scoreData) {
  const result = {
    points: scoreData.points || 0,
    explanation: scoreData.explanation || 'Результат ответа'
  };
  
  // Добавляем бонусы, если они есть
  if (scoreData.speedBonus) {
    result.speedBonus = scoreData.speedBonus;
  }
  
  if (scoreData.streakBonus) {
    result.streakBonus = scoreData.streakBonus;
  }
  
  // Добавляем достижения, если они есть
  if (scoreData.achievements) {
    result.achievements = scoreData.achievements;
  }
  
  return result;
}

/**
 * Рассчитывает финальный счет игры
 * @param {Object} gameState - состояние игры
 * @returns {Object} - объект с итоговым счетом и статистикой
 */
function calculateFinalScore(gameState) {
  const { score, correctAnswers, incorrectAnswers, skippedAnswers } = gameState;
  
  // Расчет процента правильных ответов
  const totalAnswered = correctAnswers + incorrectAnswers;
  const percentCorrect = totalAnswered > 0 ? Math.round((correctAnswers / totalAnswered) * 100) : 0;
  
  return {
    score,
    correctAnswers,
    incorrectAnswers,
    skippedAnswers,
    percentCorrect,
    totalQuestions: correctAnswers + incorrectAnswers + skippedAnswers
  };
}

// Экспорт функций
export {
  submitAnswer,
  calculateLocalScore,
  calculateStreakBonus,
  formatScoreData,
  calculateFinalScore
}; 