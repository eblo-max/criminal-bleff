/**
 * Модуль для поддержки оффлайн-режима игры Криминальный Блеф
 * Отвечает за кеширование данных и синхронизацию при восстановлении соединения
 */

import { logger, fetchWithRetry } from './utils.js';
import { gameState, addPendingResult, removePendingResult } from './gameState.js';
import { notifications } from './utils.js';

// Настройки оффлайн-режима
const OFFLINE_CONFIG = {
  SYNC_INTERVAL: 30000, // 30 секунд
  MAX_RETRY_ATTEMPTS: 5,
  RETRY_DELAY: 10000, // 10 секунд
  CACHE_MAX_AGE: 7 * 24 * 60 * 60 * 1000, // 7 дней в миллисекундах
  CACHE_CHECK_INTERVAL: 24 * 60 * 60 * 1000 // проверять кеш раз в 24 часа
};

// Интервал синхронизации
let syncInterval = null;

// Интервал проверки кеша
let cacheCheckInterval = null;

// Состояние сети
let isOnline = navigator.onLine;

/**
 * Инициализирует модуль оффлайн-режима
 */
function initOfflineMode() {
  // Слушаем события онлайн/оффлайн
  window.addEventListener('online', handleNetworkStatusChange);
  window.addEventListener('offline', handleNetworkStatusChange);
  
  // Проверяем состояние сети при запуске
  checkNetworkStatus();
  
  // Запускаем интервал синхронизации
  startSyncInterval();
  
  // Очищаем устаревший кеш при запуске
  cleanupExpiredCache();
  
  // Запускаем интервал проверки кеша
  startCacheCheckInterval();
  
  logger.info('Оффлайн-модуль инициализирован');
}

/**
 * Обработчик изменения статуса сети
 * @param {Event} event - событие изменения статуса
 */
function handleNetworkStatusChange(event) {
  isOnline = event.type === 'online';
  
  logger.info(`Статус сети изменился: ${isOnline ? 'онлайн' : 'оффлайн'}`);
  
  // Обновляем статус в состоянии игры
  gameState.offlineMode = !isOnline;
  
  // Показываем уведомление
  if (isOnline) {
    notifications.success('Соединение восстановлено. Синхронизация...');
    syncPendingResults();
    } else {
    notifications.warning('Нет соединения. Игра работает в оффлайн-режиме.');
  }
}

/**
 * Проверяет текущий статус сети
 * @returns {boolean} статус подключения
 */
function checkNetworkStatus() {
  isOnline = navigator.onLine;
  gameState.offlineMode = !isOnline;
  
  logger.debug(`Проверка статуса сети: ${isOnline ? 'онлайн' : 'оффлайн'}`);
  
  return isOnline;
}

/**
 * Запускает интервал для синхронизации данных
 */
function startSyncInterval() {
  // Очищаем существующий интервал, если есть
  if (syncInterval) {
    clearInterval(syncInterval);
  }
  
  // Устанавливаем новый интервал
  syncInterval = setInterval(() => {
    if (isOnline && gameState.pendingResults.length > 0) {
      syncPendingResults();
    }
  }, OFFLINE_CONFIG.SYNC_INTERVAL);
  
  logger.debug('Интервал синхронизации запущен');
}

/**
 * Синхронизирует ожидающие результаты с сервером
 * @returns {Promise<number>} количество успешно синхронизированных результатов
 */
async function syncPendingResults() {
  if (!isOnline || gameState.pendingResults.length === 0) {
    return 0;
  }
  
  logger.info(`Синхронизация ${gameState.pendingResults.length} результатов...`);
  
  let syncedCount = 0;
  
  // Копируем массив, чтобы избежать проблем при удалении элементов
  const pendingResults = [...gameState.pendingResults];
  
  for (let i = 0; i < pendingResults.length; i++) {
    const result = pendingResults[i];
    
    try {
      // Проверяем тип результата и выбираем соответствующий URL
      const apiUrl = determineApiUrlForResult(result);
      
      if (!apiUrl) {
        logger.error('Неизвестный тип результата:', result);
        continue;
      }
      
      // Отправляем результат на сервер
      const response = await fetchWithRetry(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(result.data || result)
      }, OFFLINE_CONFIG.MAX_RETRY_ATTEMPTS, OFFLINE_CONFIG.RETRY_DELAY);
      
      if (response.success) {
        // Удаляем результат из очереди
        removePendingResult(gameState.pendingResults.indexOf(result));
        syncedCount++;
      } else {
        logger.warn('Не удалось синхронизировать результат:', response.message);
      }
    } catch (error) {
      logger.error('Ошибка при синхронизации результата:', error);
    }
  }
  
  if (syncedCount > 0) {
    notifications.success(`Синхронизировано результатов: ${syncedCount}`);
  }
  
  return syncedCount;
}

/**
 * Определяет URL API для результата в зависимости от его типа
 * @param {Object} result - результат для синхронизации
 * @returns {string|null} URL для отправки результата
 */
function determineApiUrlForResult(result) {
  const BASE_URL = window.location.hostname.includes('localhost') 
    ? 'http://localhost:3000'
    : '';
    
  if (result.type === 'answer') {
    return `${BASE_URL}/api/game/submit`;
  } else if (result.type === 'finish') {
    return `${BASE_URL}/api/game/finish`;
  } else if (result.type === 'track') {
    return `${BASE_URL}/api/game/track`;
  }
  
  return null;
}

/**
 * Проверяет и очищает устаревший кеш
 */
function cleanupExpiredCache() {
  try {
    const now = Date.now();
    
    // Проверяем кеш историй
    const cachedStoriesInfo = localStorage.getItem('cachedStoriesInfo');
    
    if (cachedStoriesInfo) {
      const storiesInfo = JSON.parse(cachedStoriesInfo);
      const cacheAge = now - storiesInfo.timestamp;
      
      // Если кеш старше максимального возраста, удаляем его
      if (cacheAge > OFFLINE_CONFIG.CACHE_MAX_AGE) {
        logger.info(`Удаление устаревшего кеша историй (возраст: ${Math.round(cacheAge / (24 * 60 * 60 * 1000))} дней)`);
        localStorage.removeItem('cachedStories');
        localStorage.removeItem('cachedStoriesInfo');
        notifications.info('Обновлены кешированные данные игры');
      } else {
        logger.debug(`Кеш историй актуален (возраст: ${Math.round(cacheAge / (60 * 60 * 1000))} часов)`);
      }
    }
    
    // Очистка других типов кеша при необходимости
    cleanupOtherCacheTypes();
    
  } catch (error) {
    logger.error('Ошибка при очистке устаревшего кеша:', error);
  }
}

/**
 * Очистка других типов кеша
 */
function cleanupOtherCacheTypes() {
  try {
    // Очистка кеша сохраненных игр, если они старше определенного срока
    const savedGames = localStorage.getItem('savedGames');
    if (savedGames) {
      const games = JSON.parse(savedGames);
      const now = Date.now();
      const updatedGames = games.filter(game => {
        const gameAge = now - game.timestamp;
        return gameAge <= OFFLINE_CONFIG.CACHE_MAX_AGE;
      });
      
      if (updatedGames.length !== games.length) {
        logger.info(`Удалено ${games.length - updatedGames.length} устаревших сохраненных игр`);
        localStorage.setItem('savedGames', JSON.stringify(updatedGames));
      }
    }
  } catch (error) {
    logger.error('Ошибка при очистке других типов кеша:', error);
  }
}

/**
 * Запускает интервал проверки кеша
 */
function startCacheCheckInterval() {
  // Очищаем существующий интервал, если есть
  if (cacheCheckInterval) {
    clearInterval(cacheCheckInterval);
  }
  
  // Устанавливаем новый интервал
  cacheCheckInterval = setInterval(() => {
    cleanupExpiredCache();
  }, OFFLINE_CONFIG.CACHE_CHECK_INTERVAL);
  
  logger.debug('Интервал проверки кеша запущен');
}

/**
 * Останавливает интервал проверки кеша
 */
function stopCacheCheckInterval() {
  if (cacheCheckInterval) {
    clearInterval(cacheCheckInterval);
    cacheCheckInterval = null;
    logger.debug('Интервал проверки кеша остановлен');
  }
}

/**
 * Кеширует истории для оффлайн-использования
 * @param {Array} stories - массив историй для кеширования
 */
function cacheStories(stories) {
  try {
    if (!stories || !Array.isArray(stories) || stories.length === 0) {
      logger.warn('Попытка кеширования пустого массива историй');
      return;
    }
        
    // Сохраняем истории
    localStorage.setItem('cachedStories', JSON.stringify(stories));
    
    // Сохраняем информацию о времени кеширования
    localStorage.setItem('cachedStoriesInfo', JSON.stringify({
      timestamp: Date.now(),
      count: stories.length
    }));
    
    logger.info(`Кешировано ${stories.length} историй для оффлайн-использования`);
  } catch (error) {
    logger.error('Ошибка при кешировании историй:', error);
  }
}

/**
 * Загружает кешированные истории
 * @returns {Array|null} массив кешированных историй или null
 */
function loadCachedStories() {
  try {
    const cachedData = localStorage.getItem('cachedStories');
    
    if (!cachedData) {
      logger.warn('Кешированные истории не найдены');
      return null;
    }
    
    const stories = JSON.parse(cachedData);
    logger.info(`Загружено ${stories.length} кешированных историй`);
    
    return stories;
  } catch (error) {
    logger.error('Ошибка при загрузке кешированных историй:', error);
    return null;
  }
}

/**
 * Добавляет ответ в очередь для последующей синхронизации
 * @param {Object} answerData - данные ответа
 */
function queueAnswer(answerData) {
  addPendingResult({
    type: 'answer',
    data: answerData,
    timestamp: Date.now()
  });
  
  logger.debug('Ответ добавлен в очередь для синхронизации:', answerData);
}

/**
 * Добавляет результат игры в очередь для последующей синхронизации
 * @param {Object} gameResult - результат игры
 */
function queueGameResult(gameResult) {
  addPendingResult({
    type: 'finish',
    data: gameResult,
    timestamp: Date.now()
  });
  
  logger.debug('Результат игры добавлен в очередь для синхронизации:', gameResult);
}

/**
 * Проверяет наличие кешированных данных
 * @returns {boolean} есть ли кешированные данные
 */
function hasCachedData() {
  return !!localStorage.getItem('cachedStories');
}

// Экспорт функций
export {
  initOfflineMode,
  checkNetworkStatus,
  syncPendingResults,
  cacheStories,
  loadCachedStories,
  queueAnswer,
  queueGameResult,
  hasCachedData,
  cleanupExpiredCache,
  startCacheCheckInterval,
  stopCacheCheckInterval
}; 