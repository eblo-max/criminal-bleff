/**
 * Модуль инициализации приложения "Криминальный Блеф"
 * Настраивает приложение при загрузке и обеспечивает совместимость
 */

// Сначала создаем временный логгер, если основной не загрузится
const tempLogger = {
  info: (msg) => console.log(`[INFO] ${msg}`),
  warn: (msg) => console.warn(`[WARN] ${msg}`),
  error: (msg) => console.error(`[ERROR] ${msg}`),
  debug: (msg) => console.debug(`[DEBUG] ${msg}`)
};

// Глобальная переменная для логгера
window.appLogger = tempLogger;

// Безопасный импорт модулей
function safeImport(modulePath, moduleName) {
  return import(modulePath).catch(error => {
    console.error(`Ошибка загрузки ${moduleName || modulePath}: `, error);
    return { default: {}, exported: false };
  });
}

// Настройка версии UI
window.UI_VERSION = 'new';
document.body.classList.add('new-ui');

// Экспортируемая функция инициализации
export async function initApp() {
  try {
    // Загружаем сначала утилиты, так как они необходимы для всего остального
    const utils = await safeImport('./utils.js', 'Utils модуля');
    
    // Если логгер доступен, используем его
    if (utils && utils.logger) {
      window.appLogger = utils.logger;
    }
    
    // Устанавливаем логгер в глобальный объект для отладки
    window.logger = window.appLogger;
    
    // Загружаем остальные модули параллельно
    const [ui, telegram, effects, gameCore] = await Promise.all([
      safeImport('./ui.js', 'UI модуля'),
      safeImport('./telegram.js', 'Telegram модуля'),
      safeImport('./effects.js', 'Effects модуля'),
      safeImport('./gameState.js', 'GameState модуля')
    ]);
    
    // Инициализируем модули
    window.appLogger.info('Инициализация приложения...');
    
    if (ui && ui.initUI) {
      window.appLogger.info('Инициализация UI...');
      ui.initUI();
    }
    
    if (telegram && telegram.initTelegram) {
      window.appLogger.info('Инициализация Telegram интеграции...');
      telegram.initTelegram();
    }
    
    if (effects && effects.initEffects) {
      window.appLogger.info('Инициализация визуальных эффектов...');
      effects.initEffects();
    }
    
    if (gameCore && gameCore.initGame) {
      window.appLogger.info('Инициализация игровой логики...');
      gameCore.initGame();
    }
    
    // Устанавливаем статус загрузки
    document.body.classList.add('app-loaded');
    window.appLogger.info('Приложение успешно инициализировано.');
    
  } catch (error) {
    console.error('Критическая ошибка при инициализации приложения:', error);
    
    // Показываем пользователю информацию об ошибке
    const errorContainer = document.getElementById('error-container') || document.createElement('div');
    errorContainer.id = 'error-container';
    errorContainer.className = 'error-message';
    errorContainer.innerHTML = `
      <h3>Произошла ошибка</h3>
      <p>Пожалуйста, обновите страницу или попробуйте позже.</p>
    `;
    
    if (!document.getElementById('error-container')) {
      document.body.appendChild(errorContainer);
    }
  }
}

// Запускаем инициализацию после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
  initApp().catch(err => console.error('Ошибка при инициализации приложения:', err));
});

// Если документ уже загружен, запускаем сразу
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setTimeout(() => {
    initApp().catch(err => console.error('Ошибка при инициализации приложения:', err));
  }, 0);
}

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