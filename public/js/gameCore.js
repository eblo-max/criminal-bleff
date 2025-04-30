/**
 * Основной модуль игровой логики для Криминального Блефа
 * Отвечает за управление состоянием игры и основные игровые функции
 */

import { logger, notifications, fetchWithRetry, saveGameState, loadSavedGameState } from './utils.js';
import { telegramUser, shareTelegramResults, safeHapticFeedback } from './telegram.js';
import { showLoading, hideLoading, navigateTo } from './ui.js';
import { showConfetti } from './effects.js';
import { gameState, updateState, resetState, persistState } from './gameState.js';
import { initOfflineMode, cacheStories, loadCachedStories, queueAnswer, queueGameResult, checkNetworkStatus } from './offline.js';

// Базовый URL API
const API_BASE_URL = window.location.hostname.includes('localhost') 
  ? 'http://localhost:3000' 
  : '';

// Инициализация оффлайн-режима
initOfflineMode();

/**
 * Загрузка игровых данных с сервера
 * @param {boolean} useCache - использовать кэшированные данные если они есть
 * @returns {Promise<Array>} - массив историй
 */
async function loadGameData(useCache = true) {
  try {
    // Если игра уже загружена, возвращаем кэшированные данные
    if (useCache && gameState.stories.length > 0) {
      return gameState.stories;
    }

    // Проверяем, находимся ли мы в оффлайн-режиме
    const isOnline = checkNetworkStatus();
    
    // Если оффлайн, пытаемся загрузить кешированные истории
    if (!isOnline) {
      const cachedStories = loadCachedStories();
      
      if (cachedStories && cachedStories.length > 0) {
        updateState({ stories: cachedStories, loaded: true });
        return cachedStories;
      } else {
        // Если нет кешированных историй, создаем мок-данные
        const mockStories = createMockStories();
        updateState({ stories: mockStories, loaded: true });
        return mockStories;
      }
    }

    // URL API для получения историй
    const apiUrl = `${API_BASE_URL}/api/game/start`;
    
    // Отображаем индикатор загрузки
    showLoading();
    
    // Загружаем данные с сервера
    const response = await fetchWithRetry(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Проверяем успешность запроса
    if (!response.success) {
      throw new Error(response.message || 'Ошибка загрузки историй');
    }
    
    // Скрываем индикатор загрузки
    hideLoading();
    
    // Сохраняем истории в состоянии игры
    updateState({ stories: response.data.stories, loaded: true });
    
    // Кешируем истории для использования в оффлайн-режиме
    cacheStories(response.data.stories);
    
    return gameState.stories;
  } catch (error) {
    // В случае ошибки скрываем индикатор загрузки
    hideLoading();
    
    // Логируем ошибку
    logger.error('Ошибка загрузки игровых данных:', error);
    
    // Пытаемся загрузить кешированные истории
    const cachedStories = loadCachedStories();
    
    if (cachedStories && cachedStories.length > 0) {
      logger.info('Используем кешированные истории');
      updateState({ stories: cachedStories, loaded: true, offlineMode: true });
      return cachedStories;
    }
    
    // Если нет кешированных историй, создаем мок-данные
    logger.info('Используем тестовые данные');
    const mockStories = createMockStories();
    updateState({ stories: mockStories, loaded: true, offlineMode: true });
    return mockStories;
  }
}

/**
 * Создание тестовых историй (запасной вариант)
 * @returns {Array} - массив тестовых историй
 */
function createMockStories() {
  return [
    {
      id: 'mock1',
      content: 'Грабитель ворвался в банк с оружием и потребовал деньги. Он забрал 50 тысяч долларов и скрылся на синем автомобиле. Полиция нашла его через час благодаря записям с камер наблюдения.',
      options: [
        'Грабитель не скрыл лицо от камер',
        'Слишком маленькая сумма для ограбления банка',
        'Синий автомобиль слишком заметен для преступления'
      ],
      correctOptionIndex: 0,
      explanation: 'Большинство грабителей банков скрывают лицо масками или другими средствами, чтобы избежать идентификации по камерам.'
    },
    {
      id: 'mock2',
      content: 'Хакер получил доступ к базе данных компании, используя уязвимость в программном обеспечении. Он скачал личные данные клиентов и продал их на черном рынке за криптовалюту.',
      options: [
        'Продажа за криптовалюту не анонимна',
        'Скачивание данных оставляет цифровые следы',
        'Уязвимости в ПО быстро исправляются'
      ],
      correctOptionIndex: 1,
      explanation: 'При скачивании большого объема данных остаются логи активности, по которым можно определить IP адрес и время атаки.'
    },
    {
      id: 'mock3',
      content: 'Мошенник создал поддельный сайт интернет-магазина и разместил рекламу в социальных сетях. Люди оплачивали товары, но никогда их не получали.',
      options: [
        'Платежные системы требуют верификации личности',
        'Создание сайта оставляет цифровые следы',
        'Реклама в соцсетях требует реальных данных'
      ],
      correctOptionIndex: 0,
      explanation: 'Большинство платежных систем требуют верификации личности для получения средств, что делает анонимное мошенничество сложным.'
    },
    {
      id: 'mock4',
      content: 'Вор-карманник работал в метро в час пик. Он украл 15 кошельков за день, но был пойман, когда полицейский в гражданской одежде заметил его действия.',
      options: [
        '15 краж за день слишком много для одного человека',
        'Карманники обычно работают в группах',
        'Полицейские в гражданской одежде редко патрулируют метро'
      ],
      correctOptionIndex: 1,
      explanation: 'Профессиональные карманники обычно работают в группах: один отвлекает, другой крадет, третий быстро уходит с добычей.'
    },
    {
      id: 'mock5',
      content: 'Фальшивомонетчик изготавливал поддельные 100-долларовые купюры дома на обычном принтере. Он успешно расплачивался ими в малых магазинах в течение месяца.',
      options: [
        'Обычный принтер не может воспроизвести защитные элементы валюты',
        'Малые магазины обычно проверяют купюры крупного номинала',
        'Подделка денег требует специального оборудования'
      ],
      correctOptionIndex: 0,
      explanation: 'Современные валюты имеют множество защитных элементов, которые невозможно воспроизвести на обычном принтере: водяные знаки, микропечать, специальные чернила и др.'
    }
  ];
}

/**
 * Запуск новой игры
 */
function startGame() {
  console.log('gameCore.js: startGame - начало функции');
  
  // Сброс состояния игры
  resetState();
  
  console.log('Состояние сброшено, начинаю загрузку игровых данных');
  
  // Показываем загрузку перед запуском
  showLoading();
  
  // Загрузка данных и начало игры
  loadGameData().then(() => {
    console.log('Игровые данные загружены успешно');
    
    // Обновляем состояние игры
    updateState({
      gameStarted: true,
      startTime: Date.now(),
      isPlaying: true
    });
    
    console.log('Состояние игры обновлено, переходим на игровой экран');
    
    // Вибрация для обратной связи
    safeHapticFeedback('medium');
    
    // Скрываем загрузку после получения данных
    hideLoading();
    
    // Переходим на игровой экран с гарантированным выполнением
    try {
      // Гарантируем, что элемент игрового экрана доступен
      const gameScreen = document.getElementById('game-screen');
      if (!gameScreen) {
        console.error('Элемент game-screen не найден в DOM');
        return;
      }
      
      // Сначала применяем базовые стили напрямую
      document.querySelectorAll('.screen').forEach(screen => {
        if (screen.id === 'game-screen') {
          screen.classList.remove('hidden');
          screen.style.display = 'block';
        } else {
          screen.classList.add('hidden');
          screen.style.display = 'none';
        }
      });
      
      // Затем используем стандартную навигацию для дополнительных эффектов
      navigateTo('game-screen');
      
      // Запускаем событие для обновления игрового UI
      document.dispatchEvent(new CustomEvent('game:updateUI'));
      
      console.log('Переход на игровой экран выполнен');
    } catch (e) {
      console.error('Ошибка при переходе на игровой экран:', e);
      // Резервный метод перехода
      setTimeout(() => {
        console.log('Пробуем резервный метод перехода');
        navigateTo('game-screen');
      }, 100);
    }
  }).catch(error => {
    console.error('Ошибка при запуске игры:', error);
    hideLoading();
    
    // Показываем сообщение об ошибке
    notifications.show('Не удалось загрузить игру. Пожалуйста, попробуйте еще раз.', 'error');
  });
}

/**
 * Переход к следующему вопросу
 */
function goToNextStory() {
  // Если это была последняя история, завершаем игру
  if (gameState.currentStoryIndex >= gameState.stories.length - 1) {
    endGame();
    return;
  }
  
  // Увеличиваем индекс текущей истории
  updateState({ currentStoryIndex: gameState.currentStoryIndex + 1 });
  
  // Обновляем игровой UI
  document.dispatchEvent(new CustomEvent('game:updateUI', { detail: gameState }));
}

/**
 * Завершение игры
 */
function endGame() {
  // Устанавливаем флаг завершения игры
  updateState({
    gameEnded: true,
    isPlaying: false
  });
  
  // Отправляем результаты на сервер
  submitGameResults({
    score: gameState.score,
    correctAnswers: gameState.correctAnswers,
    totalQuestions: gameState.stories.length,
    maxStreak: gameState.maxStreak,
    telegramUserId: telegramUser?.id
  });
  
  // Уведомляем другие модули о завершении игры
  document.dispatchEvent(new CustomEvent('game:end', { detail: gameState }));
}

/**
 * Отправка результатов игры на сервер
 * @param {Object} results - результаты игры
 */
async function submitGameResults(results) {
  try {
    // Проверяем, находимся ли мы в оффлайн-режиме
    const isOnline = checkNetworkStatus();
    
    if (!isOnline) {
      // Добавляем результат в очередь для последующей синхронизации
      queueGameResult(results);
      
      // Показываем результаты без ожидания ответа сервера
      showResults({
        success: true,
        offlineMode: true,
        ...results
      });
      
      return;
    }
    
    // URL API для отправки результатов
    const apiUrl = `${API_BASE_URL}/api/game/finish`;
    
    // Отправляем результаты
    const response = await fetchWithRetry(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(results)
    });
    
    // Показываем результаты на основе ответа сервера
    showResults(response.data);
  } catch (error) {
    logger.error('Ошибка отправки результатов:', error);
    
    // Добавляем результат в очередь для последующей синхронизации
    queueGameResult(results);
    
    // Показываем результаты даже в случае ошибки
    showResults({
      success: true,
      offlineMode: true,
      ...results
    });
  }
}

/**
 * Показ экрана результатов
 * @param {Object} data - данные результатов игры
 */
function showResults(data = null) {
  // Используем переданные данные или данные из состояния игры
  const resultData = data || gameState.resultData;
  if (!resultData) return;
  
  // Находим экран результатов
  const resultsScreen = document.getElementById('results-screen');
  if (!resultsScreen) return;
  
  // Процент правильных ответов
  const percentage = Math.round((resultData.correctAnswers / resultData.totalQuestions) * 100);
  
  // Определяем результат
  let resultText;
  if (percentage >= 80) {
    resultText = 'Отличная работа, детектив!';
  } else if (percentage >= 60) {
    resultText = 'Хороший результат!';
  } else if (percentage >= 40) {
    resultText = 'Неплохое начало.';
  } else {
    resultText = 'Есть куда расти.';
  }
  
  // Формируем содержимое экрана результатов
  resultsScreen.innerHTML = `
    <div class="results-container">
      <h2>Результаты расследования</h2>
      
      <div class="results-score">
        <div class="score-circle">
          <span class="score-value">${resultData.score}</span>
          <span class="score-label">очков</span>
        </div>
      </div>
      
      <div class="results-stats">
        <div class="stat-item">
          <span class="stat-label">Правильных ответов:</span>
          <span class="stat-value">${resultData.correctAnswers} из ${resultData.totalQuestions}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Точность:</span>
          <span class="stat-value">${percentage}%</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Серия:</span>
          <span class="stat-value">${resultData.maxStreak}</span>
        </div>
      </div>
      
      <div class="results-message">
        <p>${resultText}</p>
      </div>
      
      <div class="results-buttons">
        <button id="play-again-btn" class="btn-enhanced">Играть снова</button>
        <button id="share-results-btn" class="btn-enhanced secondary">Поделиться</button>
      </div>
    </div>
  `;
  
  // Добавляем обработчики событий для кнопок
  const playAgainBtn = document.getElementById('play-again-btn');
  if (playAgainBtn) {
    playAgainBtn.onclick = startGame;
  }
  
  const shareResultsBtn = document.getElementById('share-results-btn');
  if (shareResultsBtn) {
    shareResultsBtn.onclick = () => shareTelegramResults(resultData);
  }
  
  // Показываем экран результатов
  navigateTo('results-screen');
  
  // Показываем эффект конфетти для визуального поощрения
  showConfetti(resultData.score, resultData.correctAnswers, resultData.totalQuestions);
}

/**
 * Возобновление сохраненной игры
 * @param {Object} saveData - сохраненное состояние игры
 * @returns {boolean} - успешность возобновления
 */
function resumeGame(saveData = null) {
  // Загружаем сохраненное состояние игры
  const savedState = saveData || loadSavedGameState();
  
  if (!savedState) {
    // Если нет сохраненной игры, начинаем новую
    return false;
  }
  
  try {
    // Восстанавливаем состояние игры из сохранения
    gameState.stories = savedState.stories || [];
    gameState.currentStoryIndex = savedState.currentStoryIndex || 0;
    gameState.score = savedState.score || 0;
    gameState.correctAnswers = savedState.correctAnswers || 0;
    gameState.streak = savedState.streak || 0;
    
    // Проверяем валидность восстановленного состояния
    if (gameState.stories.length === 0 || 
        gameState.currentStoryIndex >= gameState.stories.length) {
      throw new Error('Invalid saved game state');
    }
    
    // Устанавливаем флаг начала игры
    gameState.gameStarted = true;
    gameState.gameEnded = false;
    
    // Показ игрового экрана
    navigateTo('game-screen');
    
    // Уведомляем систему об обновлении игрового интерфейса
    document.dispatchEvent(new CustomEvent('game:updateUI', { detail: gameState }));
    
    // Уведомляем систему о необходимости запустить таймер
    document.dispatchEvent(new CustomEvent('game:startTimer', { detail: gameState }));
    
    return true;
  } catch (error) {
    logger.error('Ошибка возобновления игры:', error);
    notifications.error('Не удалось возобновить игру. Начинаем новую.');
    return false;
  }
}

/**
 * Загрузить данные пользователя с сервера
 * @returns {Promise<Object>} Данные пользователя
 */
async function loadUserData() {
  try {
    showLoading('Загрузка профиля...');
    
    const response = await fetchWithRetry(`${API_BASE_URL}/api/user/profile/${telegramUser.id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${window.localStorage.getItem('token')}`
      }
    });

    // ... existing code ...
    return response;
  } catch (error) {
    logger.error('Ошибка загрузки данных пользователя:', error);
    notifications.error('Не удалось загрузить данные профиля');
    throw error;
  } finally {
    hideLoading();
  }
}

/**
 * Отправить событие просмотра карточки
 * @param {string} cardId - ID карточки
 * @returns {Promise<void>}
 */
async function trackCardView(cardId) {
  try {
    const response = await fetchWithRetry(`${API_BASE_URL}/api/game/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${window.localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        action: 'view_card',
        cardId,
        gameId: gameState.gameId
      })
    });

    // ... existing code ...
    return response;
  } catch (error) {
    logger.error('Ошибка отслеживания просмотра карточки:', error);
    // Не показываем уведомление, чтобы не прерывать игровой процесс
    return null;
  }
}

/**
 * Завершить игру и отправить результаты
 * @returns {Promise<Object>} Результаты игры
 */
async function finishGame() {
  try {
    showLoading('Завершение игры...');
    
    const response = await fetchWithRetry(`${API_BASE_URL}/api/game/finish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${window.localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        gameId: gameState.gameId,
        score: gameState.score,
        cards: gameState.cards.map(card => ({
          id: card.id,
          seen: card.seen,
          correct: card.userAnswer === card.truth
        }))
      })
    });

    // ... existing code ...
    return response;
  } catch (error) {
    logger.error('Ошибка завершения игры:', error);
    notifications.error('Не удалось отправить результаты игры');
    throw error;
  } finally {
    hideLoading();
  }
}

// Экспорт объекта состояния и функций
export {
    gameState,
    startGame,
    resetState as resetGame,
    showResults,
    resumeGame,
    loadGameData,
    goToNextStory,
    endGame,
    submitGameResults
  };