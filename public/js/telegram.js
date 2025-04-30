/**
 * Модуль для работы с Telegram WebApp API
 */

import { logger, notifications } from './utils.js';
    
// Telegram WebApp данные пользователя
let telegramUser = {
    id: null,
    username: null,
    firstName: null,
    lastName: null,
    photoUrl: null
};

// Безопасные методы для работы с Telegram WebApp в production
const TelegramWebAppUtils = {
  // Безопасный вызов hapticFeedback
  hapticFeedback: function(type) {
    try {
      if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred(type);
      }
    } catch (e) {
      logger.warn('Haptic feedback не поддерживается:', e);
    }
  },
  
  // Безопасное получение данных пользователя
  getUserData: function() {
    try {
      if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe) {
        return window.Telegram.WebApp.initDataUnsafe.user;
      }
    } catch (e) {
      logger.warn('Не удалось получить данные пользователя:', e);
    }
    return null;
  },
  
  // Безопасная отправка данных в Telegram
  sendData: function(data) {
    try {
      if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.sendData(JSON.stringify(data));
        return true;
      }
    } catch (e) {
      logger.warn('Ошибка отправки данных в Telegram:', e);
    }
    return false;
  },
  
  // Безопасный вызов showAlert
  showAlert: function(message, callback) {
    try {
      if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.showAlert(message, callback);
        return true;
      }
    } catch (e) {
      logger.warn('Ошибка вызова showAlert:', e);
      alert(message);
      if (callback) setTimeout(callback, 100);
    }
    return false;
  },
    
  // Проверка доступности API
  isAvailable: function() {
    return !!(window.Telegram && window.Telegram.WebApp);
    }
};

// Инициализация Telegram WebApp
function initTelegramWebApp() {
  if (!TelegramWebAppUtils.isAvailable()) {
    logger.warn('Telegram WebApp API не доступен, включаем автономный режим');
    enableStandaloneMode();
    return false;
  }

  try {
    // Инициализируем WebApp
    window.Telegram.WebApp.ready();
    
    // Устанавливаем расширенный UI
    window.Telegram.WebApp.expand();
        
    // Получаем данные пользователя
    const userData = TelegramWebAppUtils.getUserData();
    if (userData) {
      telegramUser = {
        id: userData.id,
        username: userData.username,
        firstName: userData.first_name,
        lastName: userData.last_name,
        photoUrl: userData.photo_url
      };
      
      logger.info('Пользователь Telegram идентифицирован:', telegramUser.id);
    } else {
      logger.warn('Не удалось получить данные пользователя Telegram');
      enableStandaloneMode();
      return false;
    }
    
    // Настраиваем основные события
    setupTelegramEvents();
    return true;
  } catch (error) {
    logger.error('Ошибка инициализации Telegram WebApp:', error);
    enableStandaloneMode();
    return false;
  }
}

// Настройка событий Telegram WebApp
function setupTelegramEvents() {
  if (!TelegramWebAppUtils.isAvailable()) return;
  
  try {
    // Событие закрытия WebApp
    window.Telegram.WebApp.onEvent('viewportChanged', () => {
      // Адаптируем интерфейс при изменении размера окна
      adjustLayoutForScreenSize();
    });
    
    // Настраиваем поведение кнопки назад
    setupTelegramBackButton();
    
    // Другие события при необходимости
  } catch (error) {
    logger.error('Ошибка настройки событий Telegram WebApp:', error);
  }
}

// Настройка кнопки назад Telegram
function setupTelegramBackButton() {
  if (!TelegramWebAppUtils.isAvailable()) return;
  
  try {
    window.Telegram.WebApp.BackButton.onClick(() => {
      const currentScreen = document.querySelector('.screen:not(.hidden)');
      
      if (currentScreen) {
        const screenId = currentScreen.id;
        
        if (screenId === 'start-screen') {
          // На главном экране закрываем приложение
          window.Telegram.WebApp.close();
        } else if (screenId === 'results-screen') {
          // С экрана результатов возвращаемся на главный
          navigateTo('start-screen');
        } else {
          // С других экранов возвращаемся на предыдущий
          navigateTo('start-screen');
    }
      } else {
        // Если не можем определить экран, закрываем приложение
        window.Telegram.WebApp.close();
      }
    });
  } catch (error) {
    logger.error('Ошибка настройки кнопки назад:', error);
  }
}

// Показать кнопку назад при необходимости
function showBackButtonIfNeeded() {
  if (!TelegramWebAppUtils.isAvailable()) return;
  
  try {
    const currentScreen = document.querySelector('.screen:not(.hidden)');
    
    if (currentScreen && currentScreen.id !== 'start-screen') {
      window.Telegram.WebApp.BackButton.show();
    } else {
      window.Telegram.WebApp.BackButton.hide();
    }
  } catch (error) {
    logger.error('Ошибка управления кнопкой назад:', error);
  }
}

// Режим автономной работы (без Telegram)
function enableStandaloneMode() {
  logger.info('Включен автономный режим');
  
  // Генерируем тестового пользователя
  telegramUser = {
    id: Math.floor(Math.random() * 1000000),
    username: 'test_user',
    firstName: 'Test',
    lastName: 'User',
    photoUrl: null
  };
  
  // Добавляем класс для автономного режима
  document.body.classList.add('standalone-mode');
  
  // Создаем эмуляцию Telegram WebApp API для тестирования в автономном режиме
  if (!window.Telegram) {
    window.Telegram = {};
  }
  
  if (!window.Telegram.WebApp) {
    window.Telegram.WebApp = {
      initDataUnsafe: {
        user: telegramUser
      },
      ready: function() {
        logger.info('Эмуляция Telegram.WebApp.ready()');
      },
      expand: function() {
        logger.info('Эмуляция Telegram.WebApp.expand()');
      },
      close: function() {
        logger.info('Эмуляция Telegram.WebApp.close()');
      },
      BackButton: {
        show: function() {
          logger.info('Эмуляция BackButton.show()');
        },
        hide: function() {
          logger.info('Эмуляция BackButton.hide()');
        },
        onClick: function(callback) {
          logger.info('Эмуляция BackButton.onClick()');
          window._backButtonCallback = callback;
        }
      },
      HapticFeedback: {
        impactOccurred: function() {},
        notificationOccurred: function() {},
        selectionChanged: function() {}
      },
      sendData: function(data) {
        logger.info('Эмуляция sendData:', data);
        return true;
      },
      showAlert: function(message, callback) {
        alert(message);
        if (callback) setTimeout(callback, 100);
        return true;
      },
      onEvent: function(eventName, callback) {
        logger.info(`Эмуляция onEvent: ${eventName}`);
      },
      switchInlineQuery: function(text, targets) {
        logger.info(`Эмуляция switchInlineQuery: ${text}`);
        return true;
      }
    };
  }
  
  // Показываем уведомление
  notifications.warning('Запущен в автономном режиме.');
}

// Поделиться результатами в Telegram
function shareTelegramResults(results) {
  if (!TelegramWebAppUtils.isAvailable()) {
    notifications.warning('Шаринг недоступен в автономном режиме');
      return false;
    }
    
  try {
    const text = `🕵️‍♂️ Криминальный Блеф: ${results.correctAnswers} из ${results.totalQuestions}\n💰 Счет: ${results.score} очков`;
    
    Telegram.WebApp.switchInlineQuery(text, ['users']);
    return true;
  } catch (error) {
    logger.error('Ошибка шаринга результатов:', error);
    notifications.error('Не удалось поделиться результатами');
    return false;
  }
}

// Безопасный вызов haptic feedback
function safeHapticFeedback(type) {
  try {
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred(type);
    }
  } catch (e) {
    // Игнорируем ошибки для этой функции
  }
}

// Экспорт функций
export {
  telegramUser,
  TelegramWebAppUtils,
  initTelegramWebApp,
  setupTelegramEvents,
  setupTelegramBackButton,
  showBackButtonIfNeeded,
  enableStandaloneMode,
  shareTelegramResults,
  safeHapticFeedback
}; 