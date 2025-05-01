/**
 * Утилиты для приложения Криминальный Блеф
 */

// Флаг режима разработки (определяется автоматически)
const isDevelopment = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1' ||
                      window.location.hostname.includes('.local') ||
                      window.location.hostname.includes('.development');

// Система кэширования данных приложения
const dataCache = {
  // Кэш для данных лидерборда
  leaderboard: {
    daily: {
      data: null,
      timestamp: 0,
      ttl: 5 * 60 * 1000 // 5 минут
    },
    weekly: {
      data: null,
      timestamp: 0,
      ttl: 15 * 60 * 1000 // 15 минут
    },
    allTime: {
      data: null,
      timestamp: 0,
      ttl: 30 * 60 * 1000 // 30 минут
    }
  },
  // Кэш для данных профиля
  profile: {
    data: null,
    timestamp: 0,
    ttl: 5 * 60 * 1000 // 5 минут
  }
};

// Создаем локальное хранение состояния приложения для DOM-кэша
const appState = {
  domCache: {}
};

// Объект логгера для отладки
export const logger = {
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
};

// Дополнительная функция для обновления досье пользователя
export function addDossierEffects() {
  logger.info('Добавление эффектов для досье пользователя');
  const profileElements = document.querySelectorAll('.profile-avatar, .profile-stats, .achievement');
  
  if (profileElements.length > 0) {
    profileElements.forEach((el, index) => {
      // Добавляем задержку для последовательного появления элементов
      el.style.animationDelay = `${index * 0.1}s`;
      el.classList.add('fade-in');
    });
  }
}

// Функция для расчета бонуса за серию успешных решений
export function calculateStreakBonus(streak) {
  if (streak <= 0) return 0;
  
  // Базовый бонус за серию
  let bonus = 0;
  
  if (streak >= 3 && streak < 5) {
    bonus = 10; // +10 очков за серию 3-4
  } else if (streak >= 5 && streak < 10) {
    bonus = 25; // +25 очков за серию 5-9
  } else if (streak >= 10) {
    bonus = 50; // +50 очков за серию 10+
  }
  
  return bonus;
}

// Объект уведомлений
const notifications = {
  show: function(message, type = 'info', duration = 3000) {
    // Проверяем, существует ли уже функция showToast (из offline.js)
    if (typeof window.showToast === 'function') {
      window.showToast(message, type);
      return;
    }
    
    console.log(`[NOTIFICATION] ${type}: ${message}`); // Добавляем логирование для отладки
    
    const notification = document.getElementById('notification');
    if (!notification) {
      console.warn('Элемент уведомления не найден в DOM');
      // Создаем элемент уведомления, если он отсутствует
      const newNotification = document.createElement('div');
      newNotification.id = 'notification';
      newNotification.className = `notification ${type}`;
      newNotification.textContent = message;
      document.body.appendChild(newNotification);
      
      setTimeout(() => {
        newNotification.classList.add('hidden');
        setTimeout(() => {
          document.body.removeChild(newNotification);
        }, 300);
      }, duration);
      return;
    }
    
    // Удаляем предыдущие классы типов
    notification.classList.remove('info', 'success', 'warning', 'error', 'hidden');
    
    // Добавляем новый класс типа
    notification.classList.add(type);
    notification.textContent = message;
    
    // Автоматически скрываем уведомление через указанное время
    setTimeout(() => {
      notification.classList.add('hidden');
    }, duration);
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
};

// Функция для отображения уведомлений (экспортируется отдельно для совместимости)
function showNotification(message, type = 'info', duration = 3000) {
  notifications.show(message, type, duration);
}

// Утилиты для работы с DOM
function getDOMElement(id) {
  if (!appState.domCache[id]) {
    appState.domCache[id] = document.getElementById(id);
  }
  return appState.domCache[id];
}

function safeSetText(elementOrId, text) {
  const element = typeof elementOrId === 'string' ? getDOMElement(elementOrId) : elementOrId;
  if (element) {
    element.textContent = text;
    return true;
  }
  return false;
}

function safeToggleClass(elementOrId, className, add = true) {
  const element = typeof elementOrId === 'string' ? getDOMElement(elementOrId) : elementOrId;
  if (element) {
    if (add) {
      element.classList.add(className);
    } else {
      element.classList.remove(className);
    }
    return true;
  }
  return false;
}

function clearDOMCache(ids = []) {
  if (ids.length === 0) {
    appState.domCache = {};
  } else {
    ids.forEach(id => delete appState.domCache[id]);
  }
}

// Проверка валидности кэша
function isCacheValid(cacheData) {
  return cacheData && cacheData.data && cacheData.timestamp && 
         (Date.now() - cacheData.timestamp < cacheData.ttl);
}

// Функция для fetch с автоматическими повторами при ошибках
async function fetchWithRetry(url, options, retries = 2, delay = 500) {
  try {
    const response = await fetch(url, options);
    let data;
    
    try {
      data = await response.json();
    } catch (parseError) {
      // Если ответ не в формате JSON, создаем стандартизированный ответ
      logger.error('Ошибка парсинга JSON:', parseError);
      throw new Error('Некорректный формат ответа от сервера');
    }
    
    // Проверяем формат ответа
    if (!response.ok) {
      // Стандартизируем ответ с ошибкой
      return {
        success: false,
        status: response.status,
        message: data.message || `Ошибка запроса: ${response.status}`,
        error: data.error || 'UnknownError'
      };
    }
    
    // Если ответ не содержит поле success, добавляем его
    if (data.success === undefined) {
      data.success = true;
    }
    
    return data;
  } catch (error) {
    if (retries > 0) {
      logger.warn(`Ошибка запроса, повторная попытка (осталось ${retries}):`, error);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1, delay * 1.5);
    }
    
    logger.error('Запрос не удался после всех попыток:', error);
    
    // Возвращаем стандартизированный объект ошибки
    return {
      success: false,
      status: error.status || 0,
      message: error.message || 'Ошибка сетевого запроса',
      error: 'NetworkError',
      offline: !navigator.onLine
    };
  }
}

// Функция debounce для оптимизации вызовов
function debounce(func, wait) {
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

// Сохранение состояния игры
function saveGameState(gameState) {
  try {
    localStorage.setItem('gameState', JSON.stringify(gameState));
    return true;
  } catch (e) {
    logger.warn('Ошибка сохранения состояния игры:', e);
    return false;
  }
}

// Загрузка сохраненного состояния игры
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

// Экспорт всех утилит
export {
  isDevelopment,
  dataCache,
  logger,
  notifications,
  showNotification,
  getDOMElement,
  safeSetText,
  safeToggleClass,
  clearDOMCache,
  isCacheValid,
  fetchWithRetry,
  debounce,
  saveGameState,
  loadSavedGameState
}; 