/**
 * Модуль для расчета игровых очков в Криминальном Блефе
 * Используется как на бэкенде, так и на фронтенде для обеспечения согласованности
 */

// Константы для расчета очков
const CONSTANTS = {
  // Базовые очки за правильный ответ
  BASE_POINTS: 100,
  
  // Максимальный бонус за скорость
  MAX_SPEED_BONUS: 50,
  
  // Максимальное время на ответ в секундах
  MAX_ANSWER_TIME: 15,
  
  // Бонусы за серии
  STREAK_BONUSES: {
    3: 50,   // 3 правильных ответа подряд: +50
    5: 100,  // 5 правильных ответов подряд: +100
    10: 250  // 10 правильных ответов подряд: +250
  }
};

/**
 * Рассчитывает базовые очки за правильный ответ с учетом скорости
 * @param {boolean} isCorrect - Правильный ли ответ
 * @param {number} timeMs - Время ответа в миллисекундах
 * @returns {number} - Количество очков
 */
function calculateBaseScore(isCorrect, timeMs) {
  if (!isCorrect) return 0;
  
  // Конвертируем время из миллисекунд в секунды
  const timeSeconds = timeMs / 1000;
  
  // Если время превышает максимальное, начисляем только базовые очки
  if (timeSeconds >= CONSTANTS.MAX_ANSWER_TIME) {
    return CONSTANTS.BASE_POINTS;
  }
  
  // Рассчитываем бонус за скорость (чем быстрее, тем больше бонус)
  const speedRatio = 1 - (timeSeconds / CONSTANTS.MAX_ANSWER_TIME);
  const speedBonus = Math.floor(CONSTANTS.MAX_SPEED_BONUS * speedRatio);
  
  return CONSTANTS.BASE_POINTS + speedBonus;
}

/**
 * Рассчитывает бонус за серию правильных ответов
 * @param {number} streak - Текущая серия правильных ответов
 * @returns {number} - Бонусные очки за серию
 */
function calculateStreakBonus(streak) {
  // Проверяем, есть ли бонус для данной серии
  for (const [requiredStreak, bonus] of Object.entries(CONSTANTS.STREAK_BONUSES).sort((a, b) => b[0] - a[0])) {
    if (streak >= parseInt(requiredStreak)) {
      return bonus;
    }
  }
  
  return 0; // Нет бонуса
}

/**
 * Рассчитывает полное количество очков за ответ
 * @param {boolean} isCorrect - Правильный ли ответ
 * @param {number} timeMs - Время ответа в миллисекундах
 * @param {number} streak - Текущая серия правильных ответов
 * @returns {Object} - Объект с данными о начисленных очках
 */
function calculateScore(isCorrect, timeMs, streak = 0) {
  const baseScore = calculateBaseScore(isCorrect, timeMs);
  const streakBonus = isCorrect ? calculateStreakBonus(streak) : 0;
  
  return {
    baseScore,
    streakBonus,
    totalScore: baseScore + streakBonus,
    isCorrect,
    timeMs
  };
}

// Экспорт функций для использования в других модулях
module.exports = {
  calculateBaseScore,
  calculateStreakBonus,
  calculateScore,
  CONSTANTS
}; 