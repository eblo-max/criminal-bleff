/**
 * Модуль-загрузчик для приложения Криминальный Блеф
 * Обеспечивает корректную загрузку и инициализацию всех компонентов
 */

// Глобальный объект состояния загрузки
const loaderState = {
  isReady: false,
  errors: [],
  loadedModules: [],
  waitingCallbacks: []
};

// Функция инициализации, вызывается при загрузке страницы
function initLoader() {
  console.log('Инициализация загрузчика приложения...');
  
  // Создаем элемент для ошибок, если он не существует
  createErrorContainer();
  
  // Регистрируем обработчик события загрузки страницы
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onDOMContentLoaded);
  } else {
    // DOM уже загружен, запускаем инициализацию напрямую
    onDOMContentLoaded();
  }
}

// Обработчик события загрузки DOM
function onDOMContentLoaded() {
  console.log('DOM загружен, инициализация компонентов...');
  
  // Устанавливаем полифилы и совместимость
  setupCompatibility();
  
  // Проверяем, поддерживаются ли ES модули
  if (supportsESModules()) {
    console.log('Браузер поддерживает ES модули, загружаем модули приложения...');
    
    // Инициализируем компоненты через модули
    loadComponents()
      .then(() => {
        console.log('Все компоненты загружены успешно');
        loaderState.isReady = true;
        
        // Вызываем ожидающие колбэки
        loaderState.waitingCallbacks.forEach(callback => {
          try {
            callback();
          } catch (err) {
            console.error('Ошибка в callback:', err);
          }
        });
        
        // Скрываем загрузочный экран
        hideLoadingOverlay();
      })
      .catch(error => {
        console.error('Ошибка при загрузке компонентов:', error);
        loaderState.errors.push(error);
        
        // Показываем ошибку пользователю
        showErrorMessage('Не удалось загрузить компоненты приложения. Попробуйте обновить страницу.');
      });
  } else {
    console.warn('Браузер не поддерживает ES модули, используем fallback...');
    
    // Используем fallback режим без модулей
    useFallbackMode();
  }
}

// Проверка поддержки ES модулей
function supportsESModules() {
  try {
    new Function('import("")');
    return true;
  } catch (e) {
    return false;
  }
}

// Установка полифилов и исправлений для совместимости
function setupCompatibility() {
  // Эмуляция Telegram WebApp API для автономного режима
  if (!window.Telegram || !window.Telegram.WebApp) {
    console.log('Telegram WebApp API не обнаружен, включаем автономный режим');
    
    window.Telegram = window.Telegram || {};
    window.Telegram.WebApp = {
      isExpanded: true,
      initDataUnsafe: {
        user: {
          id: 123456789,
          first_name: 'Test',
          last_name: 'User',
          username: 'testuser'
        }
      },
      ready: function() { console.log('Telegram.WebApp.ready() called'); },
      expand: function() { console.log('Telegram.WebApp.expand() called'); },
      close: function() { console.log('Telegram.WebApp.close() called'); },
      MainButton: {
        text: '',
        isVisible: false,
        show: function() { this.isVisible = true; console.log('MainButton.show() called'); },
        hide: function() { this.isVisible = false; console.log('MainButton.hide() called'); },
        setText: function(text) { this.text = text; console.log('MainButton.setText() called:', text); }
      },
      BackButton: {
        isVisible: false,
        show: function() { this.isVisible = true; console.log('BackButton.show() called'); },
        hide: function() { this.isVisible = false; console.log('BackButton.hide() called'); },
        onClick: function(callback) { console.log('BackButton.onClick() registered'); }
      },
      HapticFeedback: {
        impactOccurred: function(style) { console.log('HapticFeedback.impactOccurred() called:', style); },
        notificationOccurred: function(type) { console.log('HapticFeedback.notificationOccurred() called:', type); }
      },
      showConfirm: function(text) {
        return confirm(text);
      }
    };
  }
}

// Загрузка компонентов приложения
async function loadComponents() {
  try {
    // Последовательно загружаем основные модули
    await loadModule('./js/utils.js', 'utils');
    
    // Загружаем остальные модули асинхронно
    const otherModules = [
      loadModule('./js/telegram.js', 'telegram'),
      loadModule('./js/ui.js', 'ui'),
      loadModule('./js/effects.js', 'effects'),
      loadModule('./js/tutorial.js', 'tutorial')
    ];
    
    await Promise.all(otherModules);
    
    // После успешной загрузки утилит, загрузим и инициализируем основное приложение
    await loadModule('./js/app.js', 'app');
    
    return true;
  } catch (error) {
    console.error('Ошибка при загрузке модулей:', error);
    throw error;
  }
}

// Загрузка отдельного модуля
async function loadModule(path, name) {
  try {
    console.log(`Загрузка модуля: ${name}...`);
    
    // Импортируем модуль с помощью динамического импорта
    const module = await import(path);
    
    console.log(`Модуль ${name} успешно загружен`);
    
    // Регистрируем модуль как загруженный
    loaderState.loadedModules.push(name);
    return module;
  } catch (error) {
    console.error(`Ошибка при загрузке модуля ${name}:`, error);
    throw error;
  }
}

// Использование fallback режима без модулей
function useFallbackMode() {
  console.log('Активирован fallback режим без ES модулей');
  
  // Проверяем, загружен ли уже nomodule-fallback.js
  if (window.AppModules) {
    console.log('Fallback скрипт уже загружен, инициализация...');
    initializeFallbackMode();
  } else {
    console.log('Загрузка fallback скрипта...');
    const fallbackScript = document.createElement('script');
    fallbackScript.src = 'js/nomodule-fallback.js';
    fallbackScript.onload = () => {
      console.log('Fallback скрипт загружен, инициализация...');
      initializeFallbackMode();
    };
    fallbackScript.onerror = (error) => {
      console.error('Ошибка загрузки fallback скрипта:', error);
      showErrorMessage('Не удалось загрузить совместимый режим. Попробуйте обновить страницу или используйте современный браузер.');
    };
    document.head.appendChild(fallbackScript);
  }
}

// Инициализация fallback режима
function initializeFallbackMode() {
  // Скрываем загрузочный экран
  hideLoadingOverlay();
  
  // Запускаем инициализацию UI
  if (window.AppModules && window.AppModules.ui) {
    window.AppModules.ui.initAllScreens();
    window.AppModules.ui.navigateTo('start-screen');
  } else {
    console.error('Ошибка инициализации fallback: модуль UI не найден');
    showErrorMessage('Ошибка инициализации приложения. Попробуйте обновить страницу.');
  }
}

// Создание контейнера для ошибок
function createErrorContainer() {
  if (!document.getElementById('error-container')) {
    const errorContainer = document.createElement('div');
    errorContainer.id = 'error-container';
    errorContainer.style.cssText = 'display:none; position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); background-color:#f44336; color:white; padding:20px; border-radius:5px; text-align:center; z-index:1000; max-width:80%; box-shadow:0 4px 8px rgba(0,0,0,0.2);';
    document.body.appendChild(errorContainer);
  }
}

// Показ сообщения об ошибке
function showErrorMessage(message) {
  const errorContainer = document.getElementById('error-container');
  if (errorContainer) {
    errorContainer.textContent = message;
    errorContainer.style.display = 'block';
    
    // Добавляем кнопку перезагрузки
    const reloadButton = document.createElement('button');
    reloadButton.textContent = 'Обновить страницу';
    reloadButton.style.cssText = 'margin-top:15px; padding:8px 16px; background-color:white; color:#f44336; border:none; border-radius:4px; cursor:pointer;';
    reloadButton.onclick = function() {
      location.reload();
    };
    
    // Проверяем, есть ли уже кнопка
    if (!errorContainer.querySelector('button')) {
      errorContainer.appendChild(reloadButton);
    }
  } else {
    // Если контейнера нет, используем alert
    alert(message);
  }
}

// Скрытие оверлея загрузки
function hideLoadingOverlay() {
  const loadingOverlay = document.getElementById('loading-overlay');
  if (loadingOverlay) {
    loadingOverlay.classList.add('fade-out');
    setTimeout(() => {
      loadingOverlay.style.display = 'none';
    }, 300);
  }
}

// Функция для регистрации колбэков после загрузки
function onReady(callback) {
  if (loaderState.isReady) {
    // Если загрузчик уже готов, вызываем колбэк сразу
    callback();
  } else {
    // Иначе добавляем в список ожидания
    loaderState.waitingCallbacks.push(callback);
  }
}

// Экспортируем полезные функции для использования другими модулями
export { onReady };

// Запускаем инициализацию
initLoader(); 