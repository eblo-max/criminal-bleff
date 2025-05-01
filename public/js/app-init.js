/**
 * Модуль инициализации приложения "Криминальный Блеф"
 * Настраивает приложение при загрузке и обеспечивает совместимость
 */

// Импортируем необходимые модули
import { initTelegramWebApp } from './telegram.js';
import { navigateTo, initAllScreens, setupEventListeners } from './ui.js';
import { logger } from './utils.js';

// Глобальная настройка интерфейса
window.UI_VERSION = 'new'; // всегда используем новый интерфейс

// Экспортируемая функция инициализации
export function initApp() {
  console.log('Инициализация приложения...');
  
  // Скрываем загрузочный оверлей
  hideLoadingOverlay();

  // Инициализируем Telegram WebApp
  const telegramInitialized = initTelegramWebApp();
  logger.info(`Инициализация Telegram WebApp: ${telegramInitialized ? 'успешно' : 'автономный режим'}`);

  // Установка класса для нового интерфейса
  document.body.classList.add('new-ui');
  
  // Инициализируем UI
  initAllScreens();
  
  // Настройка обработчиков событий
  setupEventListeners();
  
  // Инициализируем обработчики глобальных ошибок
  setupErrorHandlers();
  
  // Показываем стартовый экран
  setTimeout(() => {
    navigateTo('start-screen');
  }, 300);
}

// Автоматически вызываем инициализацию при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

// Скрытие оверлея загрузки
function hideLoadingOverlay() {
  const loadingOverlay = document.getElementById('loading-overlay');
  if (loadingOverlay) {
    // Добавляем анимацию затухания
    loadingOverlay.classList.add('fade-out');
    
    // Скрываем после завершения анимации
    setTimeout(() => {
      loadingOverlay.style.display = 'none';
    }, 300);
  }
}

// Настройка обработчиков глобальных ошибок
function setupErrorHandlers() {
  // Обработчик глобальных ошибок
  window.onerror = (message, source, lineno, colno, error) => {
    logger.error('Глобальная ошибка JS:', { message, source, lineno, colno, error });
    
    // Не показываем уведомления для системных ошибок
    if (!source.includes('extension') && !message.includes('Script error')) {
      showErrorMessage('Произошла ошибка. Попробуйте перезагрузить приложение.');
    }
    return false; // Разрешаем стандартную обработку ошибки
  };
  
  // Обработчик необработанных промисов
  window.addEventListener('unhandledrejection', (event) => {
    logger.error('Необработанное отклонение промиса:', event.reason);
  });
}

// Отображение сообщения об ошибке
function showErrorMessage(message) {
  console.error(message);
  
  let errorContainer = document.getElementById('error-container');
  if (!errorContainer) {
    errorContainer = document.createElement('div');
    errorContainer.id = 'error-container';
    errorContainer.style.cssText = 'position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); background-color:#f44336; color:white; padding:20px; border-radius:5px; text-align:center; z-index:1000; max-width:80%; box-shadow:0 4px 8px rgba(0,0,0,0.2);';
    document.body.appendChild(errorContainer);
  }
  
  errorContainer.innerHTML = message + '<br><button onclick="location.reload()" style="margin-top:15px; padding:8px 16px; background-color:white; color:#f44336; border:none; border-radius:4px; cursor:pointer;">Обновить страницу</button>';
  errorContainer.style.display = 'block';
} 