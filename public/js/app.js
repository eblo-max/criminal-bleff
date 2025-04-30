/**
 * Главный файл приложения Криминальный Блеф
 */

// Обрабатываем возможные ошибки импорта в начале файла
(function() {
  // Проверяем, поддерживаются ли ES модули
  const supportsESModules = 'noModule' in document.createElement('script');
  
  // Если модули не поддерживаются, переключаемся на fallback версию
  if (!supportsESModules) {
    console.warn('Браузер не поддерживает ES модули. Используем fallback версию.');
    
    // Предотвращаем ошибки импорта, добавляя заглушки для импортов
    window.importModule = function(modulePath) {
      console.log(`Попытка импорта модуля ${modulePath} через fallback`);
      return Promise.resolve(window.AppModules[modulePath.split('/').pop().replace('.js', '')]);
    };
    
    // Оборачиваем все импорты в try-catch
    try {
      // Имитация импортов для совместимости
      const ui = window.AppModules.ui || {};
      const telegram = window.AppModules.telegram || {};
      const effects = window.AppModules.effects || {};
      const gameAchievements = window.AppModules.gameAchievements || {};
      const utils = window.AppModules.utils || {};
      
      // Глобальные переменные для использования вместо импортов
      window.navigateTo = ui.navigateTo;
      window.initAllScreens = ui.initAllScreens;
      window.setupEventListeners = ui.setupEventListeners;
      window.initTelegramWebApp = telegram.initTelegramWebApp;
      window.setupTelegramBackButton = telegram.setupTelegramBackButton;
      window.showConfetti = effects.showConfetti || function() {};
      window.addGlitchEffect = effects.addGlitchEffect || function() {};
      window.createAchievementConfetti = gameAchievements.createAchievementConfetti || function() {};
      window.hapticSuccessFeedback = gameAchievements.hapticSuccessFeedback || function() {};
      window.logger = utils.logger || console;
      window.notifications = utils.notifications || { show: alert };
      window.debounce = utils.debounce || function(fn) { return fn; };
    } catch (e) {
      console.error('Ошибка при загрузке fallback-импортов:', e);
    }
  }
})();

// Импорт зависимостей (будет работать, только если ES модули поддерживаются)
try {
  import('./ui.js').then(module => {
    window.navigateTo = module.navigateTo;
    window.initAllScreens = module.initAllScreens;
    window.setupEventListeners = module.setupEventListeners;
    console.log('UI модуль успешно загружен');
  }).catch(err => console.error('Ошибка загрузки UI модуля:', err));
  
  import('./telegram.js').then(module => {
    window.initTelegramWebApp = module.initTelegramWebApp;
    window.setupTelegramBackButton = module.setupTelegramBackButton;
    console.log('Telegram модуль успешно загружен');
  }).catch(err => console.error('Ошибка загрузки Telegram модуля:', err));
  
  import('./effects.js').then(module => {
    window.showConfetti = module.showConfetti;
    window.addGlitchEffect = module.addGlitchEffect;
    console.log('Effects модуль успешно загружен');
  }).catch(err => console.error('Ошибка загрузки Effects модуля:', err));
  
  import('./gameAchievements.js').then(module => {
    window.createAchievementConfetti = module.createAchievementConfetti;
    window.hapticSuccessFeedback = module.hapticSuccessFeedback;
    console.log('GameAchievements модуль успешно загружен');
  }).catch(err => console.error('Ошибка загрузки GameAchievements модуля:', err));
  
  import('./utils.js').then(module => {
    window.logger = module.logger;
    window.notifications = module.notifications;
    window.debounce = module.debounce;
    console.log('Utils модуль успешно загружен');
  }).catch(err => console.error('Ошибка загрузки Utils модуля:', err));
} catch (e) {
  console.error('Общая ошибка при импорте модулей:', e);
}

// Глобальный обработчик ошибок для отладки проблем загрузки модулей
window.addEventListener('error', function(event) {
  // Проверяем, связана ли ошибка с импортом модулей
  if (event.message && event.message.includes('import') || 
      event.message && event.message.includes('module') ||
      event.filename && event.filename.includes('.js')) {
    console.error('Ошибка загрузки модуля:', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error
    });
  }
});

// Обработчик uncaught promise rejection
window.addEventListener('unhandledrejection', function(event) {
  console.error('Необработанное отклонение промиса:', event.reason);
});

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
  // Инициализация состояния приложения
  try {
    // Пытаемся инициализировать Telegram WebApp
    const telegramInitialized = initTelegramWebApp();
    
    // Логируем результат инициализации
    logger.info(`Инициализация Telegram WebApp: ${telegramInitialized ? 'успешно' : 'автономный режим'}`);
    
    // Инициализируем интерфейс
    initAppUI();
    
    // Настраиваем глобальные обработчики ошибок
    setupErrorHandlers();
    
    // Настраиваем адаптивность интерфейса
    adjustLayoutForScreenSize();
    window.addEventListener('resize', debounce(adjustLayoutForScreenSize, 300));
    
    // Проверяем сохраненное состояние игры
    const savedState = loadSavedGameState();
    if (savedState && savedState.isPlaying) {
      // Если игра была в процессе, предлагаем продолжить
      showGameResumePrompt(savedState);
    }
    
    // Добавляем навигацию на стартовый экран после инициализации
    setTimeout(() => {
      navigateTo('start-screen');
      
      // Демонстрация конфетти при первом запуске для привлечения внимания
      // (упрощенная версия с фиксированными параметрами)
      showConfetti(0, 5, 5); // Минимальное конфетти для приветствия
      
      // Логирование инициализации функций достижений
      logger.info('Функции достижений инициализированы:', { 
        confettiFunction: typeof createAchievementConfetti === 'function',
        hapticFunction: typeof hapticSuccessFeedback === 'function'
      });
    }, 500);
    
    // Логируем успешную инициализацию
    logger.info('Приложение инициализировано успешно');
  } catch (error) {
    // В случае критической ошибки инициализации
    logger.error('Критическая ошибка инициализации приложения:', error);
    
    // Показываем сообщение об ошибке
    const errorElement = document.createElement('div');
    errorElement.className = 'critical-error';
    errorElement.innerHTML = `
      <h2>Критическая ошибка</h2>
      <p>Произошла ошибка при инициализации приложения. Пожалуйста, попробуйте обновить страницу.</p>
      <button onclick="location.reload()">Обновить страницу</button>
    `;
    
    // Находим контейнер и добавляем сообщение об ошибке
    const container = document.getElementById('app');
    if (container) {
      container.innerHTML = '';
      container.appendChild(errorElement);
    } else {
      document.body.innerHTML = '';
      document.body.appendChild(errorElement);
    }
  }
});

// Проверка сохраненной игры
function checkSavedGame() {
  try {
    const savedGameState = localStorage.getItem('gameState');
    if (savedGameState) {
      const gameState = JSON.parse(savedGameState);
      
      // Проверяем, что игра не была завершена
      if (!gameState.gameEnded && gameState.currentStoryIndex < gameState.stories.length) {
        // Показываем уведомление о возможности продолжить игру
        const confirmContinue = confirm('У вас есть незавершенная игра. Хотите продолжить?');
        
        if (confirmContinue) {
          // Импортируем модуль игры и продолжаем сохраненную игру
          import('./game.js').then(({ resumeGame }) => {
            resumeGame(gameState);
          });
        } else {
          // Если пользователь отказался, удаляем сохраненную игру
          localStorage.removeItem('gameState');
        }
      }
    }
  } catch (error) {
    logger.error('Ошибка при проверке сохраненной игры:', error);
    // Удаляем поврежденное сохранение
    localStorage.removeItem('gameState');
  }
}

// Инициализация UI приложения
function initAppUI() {
  // Настройка кнопки назад в Telegram
  try {
    setupTelegramBackButton();
  } catch (e) {
    logger.warn('Ошибка настройки кнопки назад Telegram:', e);
  }
  
  // Инициализация UI
  initAllScreens();
  
  // Настройка обработчиков событий
  setupEventListeners();
  
  // Добавляем эффект глюка к логотипу
  const logoText = document.querySelector('.glitch-text');
  if (logoText) {
    addGlitchEffect(logoText, 1000);
    
    // Повторяем эффект каждые 15 секунд
    setInterval(() => {
      addGlitchEffect(logoText, 1000);
    }, 15000);
  }
  
  // Инициализация модуля туториала
  try {
    import('./tutorial.js').then(module => {
      if (module && typeof module.init === 'function') {
        module.init();
      }
    }).catch(err => {
      logger.warn('Ошибка инициализации туториала:', err);
    });
  } catch (e) {
    logger.warn('Ошибка загрузки модуля туториала:', e);
  }
}

// Настройка глобальных обработчиков ошибок
function setupErrorHandlers() {
  // Обработчик глобальных ошибок
  window.onerror = (message, source, lineno, colno, error) => {
    logger.error('Глобальная ошибка JS:', { message, source, lineno, colno, error });
    // Не показываем уведомления для ошибок загрузки ресурсов
    if (!source.includes('extension') && !message.includes('Script error')) {
      notifications.error('Произошла ошибка. Попробуйте перезагрузить приложение.');
    }
    return false; // Разрешаем стандартную обработку ошибки
  };
  
  // Обработчик необработанных промисов
  window.addEventListener('unhandledrejection', (event) => {
    logger.error('Необработанное отклонение промиса:', event.reason);
    // Скрываем общее уведомление для пользователя, чтобы не спамить
  });
}

// Отображение подсказки о продолжении игры
function showGameResumePrompt(savedState) {
  // Проверяем, что это действительно активная игра
  if (!savedState || !savedState.isPlaying) return;
  
  try {
    // Показываем диалог через Telegram API или обычный confirm в автономном режиме
    const resumeGame = window.Telegram && window.Telegram.WebApp ? 
      window.Telegram.WebApp.showConfirm('У вас есть незавершённая игра. Хотите продолжить?') :
      confirm('У вас есть незавершённая игра. Хотите продолжить?');
    
    if (resumeGame) {
      // Импортируем модуль игры и возобновляем
      import('./game.js').then(module => {
        if (module && typeof module.resumeGame === 'function') {
          module.resumeGame(savedState);
        }
      });
    } else {
      // Сбрасываем сохранение если пользователь отказался
      localStorage.removeItem('gameState');
    }
  } catch (e) {
    logger.warn('Ошибка при показе диалога продолжения игры:', e);
  }
}

// Функция для загрузки сохраненного состояния игры
function loadSavedGameState() {
  try {
    const savedState = localStorage.getItem('gameState');
    if (savedState) {
      return JSON.parse(savedState);
    }
  } catch (e) {
    logger.warn('Ошибка загрузки сохраненного состояния игры:', e);
  }
  return null;
}

// Функция для адаптации интерфейса под размер экрана
function adjustLayoutForScreenSize() {
  try {
    const isMobile = window.innerWidth < 768;
    const isSmallHeight = window.innerHeight < 600;
    
    // Добавляем соответствующие классы к body
    document.body.classList.toggle('mobile', isMobile);
    document.body.classList.toggle('small-height', isSmallHeight);
    
    // Логируем информацию о размере экрана
    logger.debug('Адаптация под размер экрана', { 
      width: window.innerWidth, 
      height: window.innerHeight,
      isMobile,
      isSmallHeight
    });
  } catch (e) {
    logger.warn('Ошибка при адаптации интерфейса:', e);
  }
}

// Экспорт публичных функций
export {
  initAppUI,
  adjustLayoutForScreenSize,
  loadSavedGameState
};
