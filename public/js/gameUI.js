/**
 * Модуль управления пользовательским интерфейсом игры для Криминального Блефа
 * Отвечает за обновление UI, таймеры и анимации игрового экрана
 */

import { gameState, goToNextStory, submitGameResults } from './gameCore.js';
import { safeHapticFeedback } from './telegram.js';
import { logger } from './utils.js';
import { submitAnswer, calculateLocalScore } from './gameScoring.js';
import { renderLeaderboard } from './leaderboard.js';
import { checkAchievements } from './gameAchievements.js';

// В начало файла после импортов добавить инициализацию обработчика событий
// Прослушивание событий окончания игры
document.addEventListener('game:end', handleGameEnd);
document.addEventListener('game:updateUI', handleGameUpdateUI);
document.addEventListener('game:startTimer', handleGameStartTimer);

/**
 * Обрабатывает событие окончания игры
 * @param {CustomEvent} event - событие с данными
 */
function handleGameEnd(event) {
  // Получаем состояние игры из события
  const gameState = event.detail;
  
  // Вызываем UI-функцию окончания игры
  endGame();
}

/**
 * Обрабатывает событие обновления игрового интерфейса
 * @param {CustomEvent} event - событие с данными
 */
function handleGameUpdateUI(event) {
  // Обновляем игровой интерфейс
  updateGameUI();
}

/**
 * Обрабатывает событие запуска таймера
 * @param {CustomEvent} event - событие с данными
 */
function handleGameStartTimer(event) {
  // Запускаем таймер
  gameState.timer = startGameTimer();
  gameState.lastAnswerTime = Date.now();
}

/**
 * Обновляет игровой интерфейс согласно текущему состоянию игры
 */
function updateGameUI() {
  // Получаем текущую историю
  const story = gameState.stories[gameState.currentStoryIndex];
  if (!story) {
    logger.error('Ошибка: история не найдена');
    return;
  }
  
  // Обновляем счет и прогресс
  updateScoreDisplay(gameState.score);
  
  // Обновляем номер вопроса и общее количество
  const questionCounter = document.getElementById('question-counter');
  if (questionCounter) {
    questionCounter.textContent = `${gameState.currentStoryIndex + 1}/${gameState.stories.length}`;
  }
  
  // Обновляем текст истории
  const storyText = document.getElementById('story-text');
  if (storyText) {
    storyText.textContent = story.text;
  }
  
  // Сбрасываем подсветку ответов
  resetAnswerHighlighting();
  
  // Обновляем варианты ответов
  const answerContainer = document.getElementById('answer-options');
  if (answerContainer) {
    // Очищаем контейнер
    answerContainer.innerHTML = '';
    
    // Создаем новые кнопки для вариантов ответа
    story.options.forEach((option, index) => {
      const button = document.createElement('button');
      button.className = 'answer-option';
      button.textContent = option;
      button.setAttribute('data-index', index);
      
      // Добавляем обработчик клика
      button.addEventListener('click', () => {
        selectAnswer(index);
      });
      
      answerContainer.appendChild(button);
    });
  }
  
  // Сбрасываем флаг выбора ответа
  gameState.answerSelected = false;
  
  // Запускаем таймер
  gameState.timer = startGameTimer();
  gameState.lastAnswerTime = Date.now();
}

/**
 * Обновление вариантов ответов
 * @param {Object} story - текущая история
 */
function updateAnswerOptions(story) {
  // Находим все кнопки вариантов
  const optionButtons = document.querySelectorAll('.btn-option');
  
  // Проходим по каждой кнопке и обновляем содержимое
  optionButtons.forEach((button, index) => {
    // Находим элемент с текстом варианта ответа
    const optionText = button.querySelector('.option-text');
    
    if (optionText && story.options && story.options[index]) {
      // Обновляем текст
      optionText.textContent = story.options[index];
      
      // Обновляем доступность
      button.disabled = false;
      
      // Сбрасываем классы выбора
      button.classList.remove('selected', 'correct', 'wrong');
      
      // Добавляем обработчик события клика
      button.onclick = () => selectAnswer(index);
    }
  });
}

/**
 * Запускает таймер для текущего вопроса
 * @param {number} duration - продолжительность в секундах
 * @returns {Object} - объект таймера с методом stop
 */
function startGameTimer(duration = 20) {
  const timerElement = document.getElementById('question-timer');
  const timerBarElement = document.querySelector('.timer-bar');
  
  if (!timerElement || !timerBarElement) {
    logger.error('Элементы таймера не найдены');
    return { stop: () => {} };
  }
  
  // Сбрасываем стили таймера
  timerBarElement.style.width = '100%';
  timerBarElement.classList.remove('warning');
  
  // Переменные для работы таймера
  let timeLeft = duration;
  timerElement.textContent = timeLeft;
  
  // Создаем интервал обновления таймера
  const interval = setInterval(() => {
    timeLeft--;
    
    // Обновляем отображение таймера
    timerElement.textContent = timeLeft;
    const percentage = (timeLeft / duration) * 100;
    timerBarElement.style.width = `${percentage}%`;
    
    // Добавляем предупреждение, когда мало времени
    if (timeLeft <= 5 && !timerBarElement.classList.contains('warning')) {
      timerBarElement.classList.add('warning');
      safeHapticFeedback('warning');
    }
    
    // Если время вышло
    if (timeLeft <= 0) {
      clearInterval(interval);
      handleTimeUp();
    }
  }, 1000);
  
  // Возвращаем объект таймера с методом остановки
  return {
    stop: () => {
      clearInterval(interval);
    }
  };
}

/**
 * Обработчик выбора ответа игроком
 * @param {number} answerIndex - индекс выбранного ответа
 */
function selectAnswer(answerIndex) {
  // Если ответ уже выбран, игнорируем
  if (gameState.answerSelected) {
    return;
  }
  
  // Отмечаем, что ответ выбран
  gameState.answerSelected = true;
  
  // Останавливаем таймер
  if (gameState.timer) {
    gameState.timer.stop();
  }
  
  // Получаем текущую историю
  const story = gameState.stories[gameState.currentStoryIndex];
  const isCorrect = answerIndex === story.correctOptionIndex;
  
  // Визуально отмечаем ответ
  highlightSelectedAnswer(answerIndex, isCorrect);
  
  // Попытка отправить ответ на сервер
  submitAnswer(story.id, answerIndex, isCorrect, Date.now() - gameState.lastAnswerTime)
    .then(response => {
      // Обработка успешного ответа сервера
      if (response && response.score !== undefined) {
        gameState.score = response.score;
        updateScoreDisplay(response.score, response.bonus || 0);
        
        // Обновляем статистику
        if (isCorrect) {
          gameState.correctAnswers++;
          gameState.currentStreak++;
          gameState.maxStreak = Math.max(gameState.maxStreak, gameState.currentStreak);
        } else {
          gameState.incorrectAnswers++;
          gameState.currentStreak = 0;
        }
      }
    })
    .catch(error => {
      logger.error('Ошибка при отправке ответа:', error);
      // Запасной вариант при недоступности сервера
      fallbackAnswerBehavior(answerIndex, story);
    })
    .finally(() => {
      // Переходим к следующему вопросу через 2 секунды
      setTimeout(() => {
        goToNextStory();
      }, 2000);
    });
}

/**
 * Резервное поведение при недоступности сервера
 * @param {number} answerIndex - индекс выбранного ответа
 * @param {Object} story - текущая история
 */
function fallbackAnswerBehavior(answerIndex, story) {
  const isCorrect = answerIndex === story.correctOptionIndex;
  
  // Обновляем локальную статистику
  if (isCorrect) {
    gameState.correctAnswers++;
    gameState.currentStreak++;
    gameState.maxStreak = Math.max(gameState.maxStreak, gameState.currentStreak);
    
    // Локальный подсчет очков
    const baseScore = 100;
    const answerTime = Date.now() - gameState.lastAnswerTime;
    const timeBonus = calculateLocalScore(answerTime);
    const streakBonus = Math.min(50, gameState.currentStreak * 10);
    
    const totalBonus = timeBonus + streakBonus;
    gameState.score += (baseScore + totalBonus);
    
    // Обновляем интерфейс
    updateScoreDisplay(gameState.score, totalBonus);
  } else {
    gameState.incorrectAnswers++;
    gameState.currentStreak = 0;
  }
  
  logger.info('Использовано локальное резервное поведение для обработки ответа');
}

/**
 * Обработка правильного ответа
 * @param {number} answerIndex - индекс выбранного ответа
 * @param {Object} result - данные ответа от сервера
 */
function processCorrectAnswer(answerIndex, result) {
  // Получаем текущую историю
  const story = gameState.stories[gameState.currentStoryIndex];
  
  // Находим все кнопки вариантов
  const optionButtons = document.querySelectorAll('.btn-option');
  
  // Выделяем правильный ответ
  const correctButton = optionButtons[story.correctOptionIndex];
  if (correctButton) {
    correctButton.classList.add('correct');
  }
  
  // Увеличиваем счет и счетчики
  gameState.score += result.points || 100;
  gameState.correctAnswers++;
  gameState.streak++;
  
  // Добавляем бонус за серию
  if (result.streakBonus) {
    gameState.score += result.streakBonus;
  }
  
  // Показываем результат
  updateResultOverlay(true, result);
  
  // Вибрация для обратной связи
  safeHapticFeedback('success');
  
  // Проверяем достижения
  if (result.achievements) {
    checkAchievements(result);
  }
  
  // Переход к следующей истории или завершение игры
  setTimeout(() => {
    goToNextStory();
  }, 2000);
}

/**
 * Обработка неправильного ответа
 * @param {number} answerIndex - индекс выбранного ответа
 * @param {Object} result - данные ответа от сервера
 */
function processWrongAnswer(answerIndex, result) {
  // Получаем текущую историю
  const story = gameState.stories[gameState.currentStoryIndex];
  
  // Находим все кнопки вариантов
  const optionButtons = document.querySelectorAll('.btn-option');
  
  // Выделяем неправильный ответ
  const wrongButton = optionButtons[answerIndex];
  if (wrongButton) {
    wrongButton.classList.add('wrong');
  }
  
  // Выделяем правильный ответ
  const correctButton = optionButtons[story.correctOptionIndex];
  if (correctButton) {
    correctButton.classList.add('correct');
  }
  
  // Сбрасываем серию
  gameState.streak = 0;
  
  // Показываем результат
  updateResultOverlay(false, result);
  
  // Вибрация для обратной связи
  safeHapticFeedback('error');
  
  // Переход к следующей истории или завершение игры
  setTimeout(() => {
    goToNextStory();
  }, 2000);
}

/**
 * Сбрасывает подсветку всех ответов
 */
function resetAnswerHighlighting() {
  const answers = document.querySelectorAll('.answer-option');
  answers.forEach(answer => {
    answer.classList.remove('correct', 'incorrect', 'selected', 'missed');
    answer.style.pointerEvents = 'auto';
  });
}

/**
 * Подсвечивает выбранный ответ и правильный ответ
 * @param {number} selectedIndex - индекс выбранного пользователем ответа
 * @param {boolean} isCorrect - правильность ответа
 */
function highlightSelectedAnswer(selectedIndex, isCorrect) {
  const answers = document.querySelectorAll('.answer-option');
  
  // Получаем текущую историю и индекс правильного ответа
  const story = gameState.stories[gameState.currentStoryIndex];
  const correctIndex = story.correctOptionIndex;
  
  // Подсвечиваем выбранный ответ
  const selectedAnswer = answers[selectedIndex];
  if (selectedAnswer) {
    selectedAnswer.classList.add('selected');
    selectedAnswer.classList.add(isCorrect ? 'correct' : 'incorrect');
  }
  
  // Если выбран неправильный ответ, показываем правильный
  if (!isCorrect && answers[correctIndex]) {
    answers[correctIndex].classList.add('correct');
  }
  
  // Отключаем дальнейшие клики по ответам
  answers.forEach(answer => {
    answer.style.pointerEvents = 'none';
  });
  
  // Тактильная обратная связь
  safeHapticFeedback(isCorrect ? 'success' : 'error');
}

/**
 * Обновляет отображение счета и бонусов
 * @param {number} score - текущий счет
 * @param {number} [bonus=0] - бонусные очки для анимации
 */
function updateScoreDisplay(score, bonus = 0) {
  const scoreElement = document.getElementById('score-value');
  
  if (!scoreElement) {
    logger.error('Элемент счета не найден');
    return;
  }
  
  // Обновляем текст счета
  scoreElement.textContent = score;
  
  // Если есть бонус, показываем анимацию
  if (bonus > 0) {
    // Создаем элемент для отображения бонуса
    const bonusElement = document.createElement('div');
    bonusElement.className = 'score-bonus';
    bonusElement.textContent = `+${bonus}`;
    
    // Добавляем элемент рядом с счетом
    const scoreContainer = scoreElement.parentElement;
    if (scoreContainer) {
      scoreContainer.appendChild(bonusElement);
      
      // Анимируем бонус
      setTimeout(() => {
        bonusElement.classList.add('score-bonus-animate');
        
        // Удаляем элемент после анимации
        setTimeout(() => {
          bonusElement.remove();
        }, 1000);
      }, 50);
    }
  }
}

/**
 * Обновление оверлея результата
 * @param {boolean} isCorrect - флаг правильности ответа
 * @param {Object} pointsData - данные о начисленных очках
 */
function updateResultOverlay(isCorrect, pointsData = null) {
  // Находим оверлей результата
  const resultOverlay = document.getElementById('result-overlay');
  if (!resultOverlay) return;
  
  // Получаем текущую историю
  const story = gameState.stories[gameState.currentStoryIndex];
  
  // Формируем содержимое оверлея
  resultOverlay.innerHTML = `
    <div class="result-content ${isCorrect ? 'correct' : 'wrong'}">
      <div class="result-header">
        <h2>${isCorrect ? 'Правильно!' : 'Неправильно!'}</h2>
        ${isCorrect ? `<div class="points">+${pointsData?.points || 100}</div>` : ''}
      </div>
      <div class="result-explanation">
        <p>${pointsData?.explanation || story.explanation}</p>
      </div>
      ${pointsData?.streakBonus ? `<div class="streak-bonus">Бонус за серию: +${pointsData.streakBonus}</div>` : ''}
    </div>
  `;
  
  // Показываем оверлей
  resultOverlay.classList.remove('hidden');
}

/**
 * Обрабатывает истечение времени на ответ
 */
function handleTimeUp() {
  // Если ответ уже выбран, игнорируем
  if (gameState.answerSelected) {
    return;
  }
  
  // Отмечаем, что время истекло
  gameState.answerSelected = true;
  
  // Получаем текущую историю
  const story = gameState.stories[gameState.currentStoryIndex];
  
  // Подсвечиваем правильный ответ
  const answers = document.querySelectorAll('.answer-option');
  answers.forEach((answer, index) => {
    if (index === story.correctOptionIndex) {
      answer.classList.add('correct', 'missed');
    } else {
      answer.classList.add('missed');
    }
    answer.style.pointerEvents = 'none';
  });
  
  // Сбрасываем серию правильных ответов
  gameState.currentStreak = 0;
  gameState.incorrectAnswers++;
  
  // Тактильная обратная связь
  safeHapticFeedback('error');
  
  // Уведомляем об окончании времени
  logger.info('Время на ответ истекло');
  
  // Отправляем информацию о пропущенном ответе
  submitAnswer(story.id, -1, false, Date.now() - gameState.lastAnswerTime)
    .catch(error => {
      logger.error('Ошибка отправки данных о пропущенном ответе:', error);
    });
  
  // Переходим к следующему вопросу через 2 секунды
  setTimeout(() => {
    goToNextStory();
  }, 2000);
}

/**
 * Обновляет индикатор прогресса игры
 */
function updateProgressIndicator() {
  const progressBar = document.getElementById('progress-bar');
  if (progressBar) {
    const progressPercent = ((gameState.currentStoryIndex) / gameState.stories.length) * 100;
    progressBar.style.width = `${progressPercent}%`;
    progressBar.setAttribute('aria-valuenow', progressPercent);
  }
  
  // Обновляем текстовый счетчик вопросов
  const questionCounter = document.getElementById('question-counter');
  if (questionCounter) {
    questionCounter.textContent = `${gameState.currentStoryIndex + 1}/${gameState.stories.length}`;
  }
  
  // Показываем/скрываем контейнер серии в зависимости от наличия серии
  const streakContainer = document.getElementById('streak-container');
  const streakCount = document.getElementById('streak-count');
  
  if (streakContainer && streakCount) {
    streakCount.textContent = gameState.currentStreak.toString();
    streakContainer.classList.toggle('visible', gameState.currentStreak > 0);
  }
}

/**
 * Завершает игру и показывает итоговые результаты
 * Эта версия функции используется только для UI, основная логика в gameCore.js
 */
function endGame() {
  // Останавливаем таймер если активен
  if (gameState.timer) {
    gameState.timer.stop();
  }
  
  // Скрываем игровое поле
  const gameContainer = document.getElementById('game-container');
  if (gameContainer) {
    gameContainer.style.display = 'none';
  }
  
  // Показываем экран с результатами
  const resultsContainer = document.getElementById('results-container');
  if (resultsContainer) {
    resultsContainer.style.display = 'block';
    
    // Заполняем результаты
    const scoreElement = document.getElementById('final-score');
    if (scoreElement) {
      scoreElement.textContent = gameState.score;
    }
    
    const correctElement = document.getElementById('correct-answers');
    if (correctElement) {
      correctElement.textContent = gameState.correctAnswers;
    }
    
    const incorrectElement = document.getElementById('incorrect-answers');
    if (incorrectElement) {
      incorrectElement.textContent = gameState.incorrectAnswers;
    }
    
    const streakElement = document.getElementById('max-streak');
    if (streakElement) {
      streakElement.textContent = gameState.maxStreak;
    }
  }
  
  // Пытаемся отправить финальные результаты
  api.finishGame(gameState)
    .then(response => {
      // Обрабатываем успешный ответ
      if (response && response.leaderboard) {
        renderLeaderboard(response.leaderboard);
      }
    })
    .catch(error => {
      logger.error('Ошибка при отправке результатов:', error);
    });
  
  // Отображаем кнопку "играть снова"
  const playAgainButton = document.getElementById('play-again-button');
  if (playAgainButton) {
    playAgainButton.style.display = 'block';
    playAgainButton.addEventListener('click', () => {
      window.location.reload();
    });
  }
}

// Экспорт функций
export {
  updateGameUI,
  updateAnswerOptions,
  startGameTimer,
  selectAnswer,
  processCorrectAnswer,
  processWrongAnswer,
  updateResultOverlay,
  handleTimeUp,
  endGame
}; 