/**
 * Модуль управления состоянием игры Криминальный Блеф
 * Предоставляет централизованное хранилище игрового состояния 
 * и методы его обновления
 */

import { logger, saveGameState, loadSavedGameState } from './utils.js';

// Начальное состояние игры
const initialState = {
  stories: [],
  currentStoryIndex: 0,
  gameStarted: false,
  gameEnded: false,
  score: 0,
  correctAnswers: 0,
  incorrectAnswers: 0,
  skippedAnswers: 0,
  streak: 0,
  maxStreak: 0,
  lastAnswerTime: 0,
  timeLeft: 15, // секунды на ответ
  timerId: null,
  resultData: null,
  isLoading: false,
  isPlaying: false,
  startTime: 0,
  loaded: false,
  offlineMode: false,
  pendingResults: [] // Результаты, ожидающие отправки на сервер
};

// Текущее состояние игры
const gameState = {...initialState};

/**
 * Сбрасывает состояние игры к начальным значениям
 */
function resetState() {
  Object.keys(initialState).forEach(key => {
    gameState[key] = initialState[key];
  });
  
  // Загружаем сохраненные данные при сбросе состояния
  loadSavedState();
  
  logger.info('Состояние игры сброшено');
}

/**
 * Обновляет состояние игры
 * @param {Object} newState - новые значения для состояния
 * @param {boolean} persist - сохранять ли состояние в локальное хранилище
 */
function updateState(newState, persist = true) {
  // Обновляем только те свойства, которые переданы
  Object.keys(newState).forEach(key => {
    gameState[key] = newState[key];
  });
  
  // Максимальная серия правильных ответов
  if (gameState.streak > gameState.maxStreak) {
    gameState.maxStreak = gameState.streak;
  }
  
  // Сохраняем обновленное состояние, если требуется
  if (persist) {
    saveGameState(gameState);
  }
  
  // Уведомляем об обновлении состояния
  document.dispatchEvent(new CustomEvent('game:stateUpdated', { detail: gameState }));
  
  return gameState;
}

/**
 * Сохраняет текущее состояние в локальное хранилище
 */
function persistState() {
  saveGameState(gameState);
  logger.debug('Состояние игры сохранено');
}

/**
 * Загружает сохраненное состояние из локального хранилища
 * @returns {Object} загруженное состояние
 */
function loadSavedState() {
  const savedState = loadSavedGameState();
  
  if (savedState) {
    // Обновляем состояние, но не сохраняем его снова
    updateState(savedState, false);
    logger.info('Загружено сохраненное состояние игры');
  }
  
  return gameState;
}

/**
 * Добавляет результат в очередь для последующей синхронизации
 * @param {Object} result - результат для отправки
 */
function addPendingResult(result) {
  gameState.pendingResults.push({
    ...result,
    timestamp: Date.now()
  });
  
  // Сохраняем очередь
  persistState();
  
  logger.debug('Добавлен результат в очередь синхронизации', result);
}

/**
 * Удаляет результат из очереди после успешной синхронизации
 * @param {number} index - индекс результата в очереди
 */
function removePendingResult(index) {
  if (index >= 0 && index < gameState.pendingResults.length) {
    gameState.pendingResults.splice(index, 1);
    persistState();
    logger.debug(`Удален результат из очереди (индекс: ${index})`);
  }
}

// Экспорт объекта состояния и функций управления
export {
  gameState,
  resetState,
  updateState,
  persistState,
  loadSavedState,
  addPendingResult,
  removePendingResult
}; 