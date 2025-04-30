/**
 * Fallback модуль для работы без поддержки ES-модулей
 * Это решение для обхода ошибки "Cannot use import statement outside a module"
 */

(function() {
  console.log('Инициализация fallback для браузеров без поддержки ES модулей');
  
  // Проверяем, поддерживает ли браузер ES модули
  const supportsESModules = 'noModule' in document.createElement('script');
  if (supportsESModules) {
    console.log('Браузер поддерживает ES модули, fallback не требуется');
    return; // Выходим, если поддерживает
  }
  
  console.log('Браузер не поддерживает ES модули, активируем fallback');
  
  // Блокируем все скрипты с type="module" и вместо них загружаем наши fallback-модули
  document.querySelectorAll('script[type="module"]').forEach(script => {
    script.setAttribute('data-blocked-module', script.src);
    script.removeAttribute('src');
  });
})();

// Создаем пространство имен для хранения всех модулей
window.AppModules = window.AppModules || {};

// Базовые утилиты
window.AppModules.utils = {
  // Объект логгера для отладки
  logger: {
    info: function(message, data) {
      console.info(`[INFO] ${message}`, data || '');
    },
    warn: function(message, data) {
      console.warn(`[WARN] ${message}`, data || '');
    },
    error: function(message, data) {
      console.error(`[ERROR] ${message}`, data || '');
    },
    debug: function(message, data) {
      if (window.DEBUG_MODE) {
        console.debug(`[DEBUG] ${message}`, data || '');
      }
    }
  },
  
  // Объект уведомлений
  notifications: {
    show: function(message, type, duration) {
      const notification = document.getElementById('notification');
      if (!notification) return;
      
      // Удаляем предыдущие классы типов
      notification.classList.remove('info', 'success', 'warning', 'error');
      
      // Добавляем новый класс типа
      notification.classList.add(type || 'info');
      notification.textContent = message;
      notification.classList.remove('hidden');
      
      // Автоматически скрываем уведомление через указанное время
      setTimeout(() => {
        notification.classList.add('hidden');
      }, duration || 3000);
    },
    
    info: function(message, duration) {
      this.show(message, 'info', duration);
    },
    
    success: function(message, duration) {
      this.show(message, 'success', duration);
    },
    
    warning: function(message, duration) {
      this.show(message, 'warning', duration);
    },
    
    error: function(message, duration) {
      this.show(message, 'error', duration);
    }
  },
  
  // Функция debounce
  debounce: function(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
};

// UI модуль
window.AppModules.ui = {
  // Базовое состояние приложения
  appState: {
    domCache: {},
    flags: {
      isLoading: false,
      isTransitioning: false
    },
    timers: {},
    currentScreen: 'start-screen'
  },
  
  // Инициализация всех экранов
  initAllScreens: function() {
    console.log('[Fallback] Инициализация экранов');
    // Находим все кнопки и устанавливаем обработчики
    const startButton = document.getElementById('start-game-btn');
    if (startButton) {
      startButton.addEventListener('click', function() {
        console.log('[Fallback] Клик по кнопке НАЧАТЬ РАССЛЕДОВАНИЕ');
        window.AppModules.game.startGame();
      });
    }
    
    const tutorialButton = document.getElementById('tutorial-btn');
    if (tutorialButton) {
      tutorialButton.addEventListener('click', function() {
        console.log('[Fallback] Клик по кнопке ОБУЧЕНИЕ');
        // Показываем туториал
        const overlay = document.getElementById('tutorial-overlay');
        if (overlay) {
          overlay.style.display = 'flex';
          overlay.classList.remove('hidden');
          
          const firstStep = overlay.querySelector('.tutorial-step');
          if (firstStep) {
            firstStep.classList.add('active');
          }
          
          const nextButtons = overlay.querySelectorAll('.tutorial-next');
          if (nextButtons.length > 0) {
            nextButtons.forEach(button => {
              button.addEventListener('click', function() {
                console.log('[Fallback] Следующий шаг туториала');
              });
            });
          }
        }
      });
    }
  },
  
  // Настройка обработчиков событий
  setupEventListeners: function() {
    console.log('[Fallback] Установка обработчиков событий');
  },
  
  // Адаптация под размер экрана
  adjustLayoutForScreenSize: function() {
    console.log('[Fallback] Адаптация под размер экрана');
  },
  
  // Навигация между экранами
  navigateTo: function(screenId) {
    console.log(`[Fallback] Навигация к экрану ${screenId}`);
    
    // Находим все экраны
    const screens = document.querySelectorAll('.screen');
    
    // Скрываем все экраны
    screens.forEach(screen => {
      screen.classList.add('hidden');
    });
    
    // Показываем целевой экран
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
      targetScreen.classList.remove('hidden');
    }
    
    // Обновляем текущий экран
    window.AppModules.ui.appState.currentScreen = screenId;
  }
};

// Telegram модуль
window.AppModules.telegram = {
  // Проверка доступности API
  initTelegramWebApp: function() {
    console.log('[Fallback] Инициализация Telegram WebApp');
    
    // Проверяем наличие API
    if (!window.Telegram || !window.Telegram.WebApp) {
      console.warn('[Fallback] Telegram WebApp API не доступен, эмулируем');
      
      // Создаем эмуляцию
      window.Telegram = {
        WebApp: {
          ready: function() {},
          expand: function() {},
          close: function() {},
          isExpanded: true,
          initDataUnsafe: {
            user: {
              id: 123456789,
              username: 'test_user',
              first_name: 'Test',
              last_name: 'User'
            }
          },
          BackButton: {
            show: function() {},
            hide: function() {},
            onClick: function() {}
          },
          HapticFeedback: {
            impactOccurred: function() {},
            notificationOccurred: function() {}
          }
        }
      };
      
      return false;
    }
    
    // Вызываем стандартные методы инициализации
    try {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    } catch (e) {
      console.error('[Fallback] Ошибка инициализации Telegram WebApp:', e);
    }
    
    return true;
  },
  
  // Настройка кнопки назад
  setupTelegramBackButton: function() {
    console.log('[Fallback] Настройка кнопки Назад');
  },
  
  // Отображение кнопки назад при необходимости
  showBackButtonIfNeeded: function() {
    console.log('[Fallback] Обновление видимости кнопки Назад');
  }
};

// Game модуль
window.AppModules.game = {
  // Запуск новой игры
  startGame: function() {
    console.log('[Fallback] Запуск игры');
    
    // Переходим на экран игры
    window.AppModules.ui.navigateTo('game-screen');
  }
};

// Эффекты модуль
window.AppModules.effects = {
  // Показ конфетти
  showConfetti: function() {
    console.log('[Fallback] Показ конфетти');
  },
  
  // Добавление эффекта глюка
  addGlitchEffect: function() {
    console.log('[Fallback] Добавление эффекта глюка');
  }
};

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
  console.log('[Fallback] Инициализация приложения');
  
  try {
    // Инициализируем Telegram WebApp
    window.AppModules.telegram.initTelegramWebApp();
    
    // Инициализируем UI
    window.AppModules.ui.initAllScreens();
    
    // Настраиваем обработчики событий
    window.AppModules.ui.setupEventListeners();
    
    // Переходим на стартовый экран
    setTimeout(function() {
      window.AppModules.ui.navigateTo('start-screen');
    }, 500);
  } catch (e) {
    console.error('[Fallback] Ошибка инициализации:', e);
    
    // Показываем сообщение об ошибке
    const notif = window.AppModules.utils.notifications;
    if (notif) {
      notif.error('Ошибка инициализации приложения. Попробуйте перезагрузить страницу.');
    }
  }
}); 