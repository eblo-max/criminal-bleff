/**
 * Модуль для работы с игровыми достижениями
 * Содержит функции для обработки и визуализации достижений
 */

import { showNotification } from './utils.js';

/**
 * Создает анимацию конфетти при получении достижения
 * @param {number} x - Координата X начала конфетти
 * @param {number} y - Координата Y начала конфетти
 * @param {number} amount - Количество частиц конфетти
 */
export function createAchievementConfetti(x, y, amount = 50) {
  console.log(`Создание анимации конфетти (${amount} частиц) в позиции X:${x}, Y:${y}`);
  
  // Эмуляция создания конфетти для тестовой версии
  if (window.Telegram && window.Telegram.WebApp) {
    try {
      window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
    } catch (e) {
      console.warn('Ошибка вызова виброотклика:', e);
    }
  }
  
  // В полной реализации здесь был бы код для создания анимированных частиц
}

/**
 * Вызывает тактильную обратную связь при получении достижения
 * @param {string} type - Тип обратной связи (success, warning, error)
 */
export function hapticSuccessFeedback(type = 'success') {
  console.log(`Вызов тактильной обратной связи типа: ${type}`);
  
  // Проверяем доступность API
  if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
    try {
      switch (type) {
        case 'success':
          window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
          break;
        case 'warning':
          window.Telegram.WebApp.HapticFeedback.notificationOccurred('warning');
          break;
        case 'error':
          window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
          break;
        default:
          window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
      }
    } catch (e) {
      console.warn('Ошибка тактильной обратной связи:', e);
    }
  } else {
    console.warn('Telegram WebApp HapticFeedback API недоступен');
  }
}

/**
 * Отображает уведомление о получении достижения
 * @param {Object} achievement - Информация о достижении
 */
export function displayAchievement(achievement) {
  if (!achievement || !achievement.name) {
    console.error('Некорректные данные достижения');
    return;
  }
  
  showNotification(`🏆 Достижение разблокировано: ${achievement.name}`, 'success', 5000);
  createAchievementConfetti(window.innerWidth / 2, window.innerHeight / 4, 30);
  hapticSuccessFeedback('success');
}

/**
 * Проверяет условия достижения и выдает его при необходимости
 * @param {string} achievementId - Идентификатор достижения
 * @param {Object} gameState - Текущее состояние игры
 * @returns {boolean} - Было ли выдано достижение
 */
export function checkAndAwardAchievement(achievementId, gameState) {
  // Здесь будет логика проверки конкретных достижений
  console.log(`Проверка достижения: ${achievementId}`);
  return false;
}
