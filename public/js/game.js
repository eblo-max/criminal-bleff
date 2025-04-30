/**
 * Модуль-фасад игровой логики для Криминального Блефа
 * Объединяет все игровые модули и предоставляет единый интерфейс
 * 
 * Архитектурные особенности:
 * - Разделение бизнес-логики (gameCore.js) и UI (gameUI.js)
 * - Взаимодействие между ними через события DOM для предотвращения циклических зависимостей
 * - Модуль-фасад для упрощения взаимодействия с другими частями приложения
 */

import { 
  gameState, 
  startGame as coreStartGame, 
  resetGame,
  showResults as coreShowResults, 
  resumeGame as coreResumeGame, 
  loadGameData,
  goToNextStory as coreGoToNextStory
} from './gameCore.js';

import { 
  updateGameUI, 
  startGameTimer, 
  selectAnswer
} from './gameUI.js';

import { checkAchievements } from './gameAchievements.js';

// Функция запуска игры (для обратной совместимости)
function startGame() {
  console.log('game.js: startGame вызвана');
  
  try {
    // Проверяем состояние перед запуском
    if (gameState && gameState.isPlaying) {
      console.log('Игра уже запущена, перенаправляем на игровой экран');
      // Импортируем ui для навигации
      import('./ui.js').then(({ navigateTo }) => {
        navigateTo('game-screen');
      });
      return;
    }
    
    // Проверяем, загружены ли данные
    import('./gameCore.js').then(({ gameState, coreStartGame, loadGameData }) => {
      console.log('Запускаем игру через core');
      
      // Если данные уже загружены, просто запускаем
      if (gameState.stories && gameState.stories.length > 0) {
        console.log('Данные уже загружены, запускаем игру');
        coreStartGame();
      } else {
        // Если нет, сначала загружаем данные
        console.log('Данные не загружены, загружаем и запускаем');
        loadGameData().then(() => {
          console.log('Данные загружены успешно, запускаем игру');
          coreStartGame();
        }).catch(err => {
          console.error('Ошибка загрузки данных:', err);
          // Сообщение об ошибке
          alert('Не удалось загрузить игровые данные. Пожалуйста, проверьте интернет-соединение и попробуйте снова.');
        });
      }
    }).catch(err => {
      console.error('Ошибка импорта модулей:', err);
    });
  } catch (err) {
    console.error('Критическая ошибка при запуске игры:', err);
  }
}

// Функция возобновления игры (для обратной совместимости)
function resumeGame(saveData = null) {
  coreResumeGame(saveData);
}

// Функция показа результатов (для обратной совместимости)
function showResults(data = null) {
  coreShowResults(data);
}

// Функция перехода к следующему вопросу (для обратной совместимости)
function goToNextStory() {
  coreGoToNextStory();
}

// Экспорт всех необходимых функций для обратной совместимости
export {
  // Основное состояние и функции
  gameState,
  startGame,
  resetGame,
  resumeGame,
  loadGameData,
  goToNextStory,
  
  // Функции UI
  updateGameUI,
  selectAnswer,
  startGameTimer,
  
  // Функции обработки результатов
  showResults,
  checkAchievements
}; 