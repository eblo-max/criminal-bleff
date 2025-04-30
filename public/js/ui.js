/**
 * Модуль пользовательского интерфейса для Криминального Блефа
 */

import { logger, debounce } from './utils.js';
import { showBackButtonIfNeeded } from './telegram.js';

// Состояние приложения
const appState = {
  // Система кэширования DOM-элементов
  domCache: {},
  // Флаги состояния
  flags: {
    isLoading: false,
    isTransitioning: false,
    isGamePaused: false
  },
  // Таймауты и интервалы
  timers: {
    loadingTimer: null,
    transitionTimer: null
  },
  // Текущий активный экран
  currentScreen: 'start-screen'
};

// Инициализация всех экранов
function initAllScreens() {
  // Получаем все экраны
  const screens = document.querySelectorAll('.screen');
  
  // Проходим по каждому экрану и инициализируем его
  screens.forEach(screen => {
    const screenId = screen.id;
    
    // Вызываем соответствующую функцию инициализации
    switch (screenId) {
      case 'profile-screen':
        initProfileScreen(screen);
        break;
      case 'leaderboard-screen':
        initLeaderboardScreen(screen);
        break;
      case 'game-screen':
        initGameScreen(screen);
        break;
      case 'cases-screen':
        // Инициализация экрана коллекции дел
        break;
      // Другие экраны при необходимости
    }
  });
  
  // Инициализация навигации
  initBottomNavigation();
  
  // Настройка обработчиков событий для кнопок
  setupMainButtons();
  
  // Настройка доступности
  enhanceAccessibility();
}

// Инициализация экрана профиля
function initProfileScreen(screen) {
  if (!screen) return;
  
  // Создаем эффекты для экрана профиля
  addDossierEffects(screen);
  
  // Настраиваем обработчики событий
  setupProfileEventListeners();
}

// Инициализация экрана рейтинга
function initLeaderboardScreen(screen) {
  if (!screen) return;
  
  // Создаем эффекты для экрана рейтинга
  addArchiveEffects(screen);
  
  // Настраиваем обработчики событий
  setupLeaderboardEventListeners();
}

// Инициализация игрового экрана
function initGameScreen(screen) {
  if (!screen) return;
  
  // Настраиваем обработчики событий для кнопок
  const optionButtons = screen.querySelectorAll('.btn-option');
  optionButtons.forEach(button => {
    button.disabled = true; // По умолчанию отключены
  });
}

// Настройка доступности
function enhanceAccessibility() {
  // Добавляем метки и роли к элементам
  const screens = document.querySelectorAll('.screen');
  screens.forEach(screen => {
    // Устанавливаем атрибуты ARIA для скрытия/показа
    if (screen.classList.contains('hidden')) {
      screen.setAttribute('aria-hidden', 'true');
    } else {
      screen.setAttribute('aria-hidden', 'false');
    }
    
    // Добавляем атрибуты роли, если они отсутствуют
    if (!screen.hasAttribute('role')) {
      screen.setAttribute('role', 'region');
    }
    
    // Добавляем лейблы для экранов, если они отсутствуют
    if (!screen.hasAttribute('aria-label')) {
      const screenName = getScreenLabel(screen.id);
      if (screenName) {
        screen.setAttribute('aria-label', screenName);
      }
    }
  });
  
  // Добавляем подсказки к кнопкам
  const buttons = document.querySelectorAll('button:not([aria-label])');
  buttons.forEach(button => {
    if (button.textContent.trim()) {
      button.setAttribute('aria-label', button.textContent.trim());
    }
  });
}

// Получение человекочитаемого названия экрана
function getScreenLabel(screenId) {
  const labels = {
    'start-screen': 'Главный экран',
    'game-screen': 'Экран игры',
    'results-screen': 'Результаты игры',
    'profile-screen': 'Профиль игрока',
    'leaderboard-screen': 'Таблица лидеров',
    'cases-screen': 'Коллекция дел'
  };
  
  return labels[screenId] || 'Экран приложения';
}

// Настройка кнопок навигации
function initBottomNavigation() {
  // Находим контейнер для навигации
  const appContainer = document.getElementById('app');
  if (!appContainer) return;
  
  // Создаем элемент навигации, если он не существует
  let bottomNav = document.querySelector('.bottom-navigation');
  if (!bottomNav) {
    bottomNav = document.createElement('div');
    bottomNav.className = 'bottom-navigation';
    bottomNav.setAttribute('role', 'navigation');
    bottomNav.setAttribute('aria-label', 'Основная навигация');
    
    // Добавляем кнопки навигации
    bottomNav.innerHTML = `
      <button class="nav-btn active" data-screen="start-screen" aria-label="Главная">
        <span class="nav-icon home-icon"></span>
        <span class="nav-label">Главная</span>
      </button>
      <button class="nav-btn" data-screen="profile-screen" aria-label="Профиль">
        <span class="nav-icon profile-icon"></span>
        <span class="nav-label">Профиль</span>
      </button>
      <button class="nav-btn" data-screen="leaderboard-screen" aria-label="Рейтинг">
        <span class="nav-icon leaderboard-icon"></span>
        <span class="nav-label">Рейтинг</span>
      </button>
    `;
    
    // Добавляем навигацию в контейнер приложения
    appContainer.appendChild(bottomNav);
  }
  
  // Настраиваем обработчики событий для кнопок навигации
  setupBottomNavigation();
}

// Настройка главных кнопок
function setupMainButtons() {
  // Кнопка "Начать игру"
  const startGameBtn = document.getElementById('start-game-btn');
  if (startGameBtn) {
    startGameBtn.addEventListener('click', () => {
      // Импортируем функцию startGame только при необходимости
      import('./game.js').then(({ startGame }) => {
        startGame();
      });
    });
  }
  
  // Кнопка "Профиль"
  const profileBtn = document.getElementById('profile-btn');
  if (profileBtn) {
    profileBtn.addEventListener('click', () => {
      // Импортируем функцию для работы с профилем
      import('./profile.js').then(({ loadUserProfile }) => {
        loadUserProfile().then(() => {
          navigateTo('profile-screen');
        });
      });
    });
  }
  
  // Кнопка "Рейтинг"
  const leaderboardBtn = document.getElementById('leaderboard-btn');
  if (leaderboardBtn) {
    leaderboardBtn.addEventListener('click', () => {
      // Импортируем функцию для работы с рейтингом
      import('./leaderboard.js').then(({ loadLeaderboard }) => {
        loadLeaderboard().then(() => {
          navigateTo('leaderboard-screen');
        });
      });
    });
  }
  
  // Кнопка "Обучение"
  const tutorialBtn = document.getElementById('tutorial-btn');
  if (tutorialBtn) {
    tutorialBtn.addEventListener('click', () => {
      // Импортируем функцию для работы с обучением
      import('./tutorial.js').then(({ showTutorial }) => {
        showTutorial();
      });
    });
  }
}

// Настройка нижней навигации
function setupBottomNavigation() {
  const navButtons = document.querySelectorAll('.nav-btn');
  
  navButtons.forEach(button => {
    button.addEventListener('click', (event) => {
      // Получаем ID экрана для перехода
      const screenId = button.getAttribute('data-screen');
      if (!screenId) return;
      
      // Обновляем выделение кнопок
      navButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      // Выполняем переход
      handleScreenTransition(screenId);
    });
  });
  
  // Функция обработки перехода между экранами
  function handleScreenTransition(screenId) {
    // В зависимости от экрана, выполняем соответствующие действия
    switch (screenId) {
      case 'profile-screen':
        // Загружаем профиль и переходим на экран
        import('./profile.js').then(({ loadUserProfile }) => {
          loadUserProfile().then(() => {
            navigateTo(screenId);
          });
        });
        break;
      case 'leaderboard-screen':
        // Загружаем рейтинг и переходим на экран
        import('./leaderboard.js').then(({ loadLeaderboard }) => {
          loadLeaderboard().then(() => {
            navigateTo(screenId);
          });
        });
        break;
      case 'start-screen':
      default:
        // Просто переходим на экран
        navigateTo(screenId);
        break;
    }
  }
}

// Навигация между экранами (улучшенная версия)
function navigateTo(screenId) {
  console.log(`navigateTo вызвана: ${appState.currentScreen} -> ${screenId}`);
  
  // Если переход уже выполняется, игнорируем
  if (appState.flags.isTransitioning) {
    logger.warn('Переход уже выполняется, запрос проигнорирован:', screenId);
    return;
  }
  
  // Если это тот же экран, игнорируем
  if (appState.currentScreen === screenId) {
    logger.info('Уже на экране:', screenId);
    return;
  }
  
  // Устанавливаем флаг перехода
  appState.flags.isTransitioning = true;
  
  // Находим текущий и новый экраны
  const currentScreen = document.getElementById(appState.currentScreen);
  const newScreen = document.getElementById(screenId);
  
  // Проверяем, что оба экрана существуют
  if (!currentScreen || !newScreen) {
    logger.error('Ошибка навигации: экран не найден', { current: appState.currentScreen, new: screenId });
    appState.flags.isTransitioning = false;
    
    console.log('Текущие экраны в DOM:');
    document.querySelectorAll('.screen').forEach(screen => {
      console.log(`- ${screen.id}: classNames=${screen.className}, display=${window.getComputedStyle(screen).display}`);
    });
    
    // Аварийное восстановление - если newScreen существует, но currentScreen нет
    if (newScreen && !currentScreen) {
      console.log('Аварийное восстановление - переходим на запрошенный экран напрямую');
      document.querySelectorAll('.screen').forEach(screen => {
        if (screen.id === screenId) {
          screen.classList.remove('hidden');
          screen.style.display = 'block';
          appState.currentScreen = screenId;
        } else {
          screen.classList.add('hidden');
          screen.style.display = 'none';
        }
      });
      
      // Обновляем выделение в нижней навигации
      updateNavigationHighlight(screenId);
      appState.flags.isTransitioning = false;
    }
    
    return;
  }
  
  console.log(`Текущий экран: ${currentScreen.id}, классы: ${currentScreen.className}`);
  console.log(`Новый экран: ${newScreen.id}, классы: ${newScreen.className}`);
  
  try {
    // Немедленно удаляем класс hidden с нового экрана (важно для iOS)
    newScreen.classList.remove('hidden');
    
    // Делаем экран видимым напрямую через стили
    newScreen.style.display = 'block';
    
    // Применяем активный класс к новому экрану
    newScreen.classList.add('active');
    
    console.log(`После установки стилей - Новый экран: ${newScreen.id}, классы: ${newScreen.className}, display: ${newScreen.style.display}`);
    
    // Принудительная перерисовка DOM для применения изменений
    void newScreen.offsetWidth;
    
    // Применяем классы анимации с минимальной задержкой
    requestAnimationFrame(() => {
      // Анимация выхода текущего экрана
      currentScreen.classList.add('exiting');
      
      // Анимация входа нового экрана
      newScreen.classList.add('entering');
      
      console.log('Анимационные классы применены');
    });
    
    // Обновляем ARIA-атрибуты для доступности
    currentScreen.setAttribute('aria-hidden', 'true');
    newScreen.setAttribute('aria-hidden', 'false');
    
    // Выполняем переход с анимацией
    setTimeout(() => {
      try {
        // Скрываем предыдущий экран
        currentScreen.classList.add('hidden');
        currentScreen.classList.remove('active', 'exiting');
        currentScreen.style.display = 'none'; // Явно устанавливаем display: none
        
        // Проверяем видимость нового экрана для отладки
        const isNewScreenVisible = newScreen.offsetParent !== null;
        console.log(`Новый экран ${newScreen.id} видим: ${isNewScreenVisible}`);
        
        // Если новый экран не виден, принудительно показываем его
        if (!isNewScreenVisible) {
          console.log('Новый экран не виден, применяем принудительные стили');
          newScreen.style.cssText = 'display: block !important; visibility: visible !important; opacity: 1 !important;';
        }
        
        // Завершаем анимацию нового экрана
        newScreen.classList.remove('entering');
        
        // Обновляем текущий экран
        appState.currentScreen = screenId;
        
        // Сбрасываем флаг перехода
        appState.flags.isTransitioning = false;
        
        // Обновляем выделение в нижней навигации
        updateNavigationHighlight(screenId);
        
        // Обновляем состояние кнопки "Назад" в Telegram
        try {
          showBackButtonIfNeeded();
        } catch (e) {
          logger.warn('Ошибка обновления кнопки назад:', e);
        }
        
        // Вызываем специфичные для экрана инициализационные функции
        initScreenSpecificContent(screenId);
        
        logger.info(`Навигация на экран ${screenId} завершена успешно`);
      } catch (innerError) {
        console.error('Ошибка во время перехода экрана:', innerError);
        logger.error('Ошибка во время перехода экрана:', innerError);
        appState.flags.isTransitioning = false;
      }
    }, 300); // 300ms - длительность анимации перехода
  } catch (outerError) {
    console.error('Критическая ошибка навигации:', outerError);
    logger.error('Критическая ошибка навигации:', outerError);
    appState.flags.isTransitioning = false;
  }
}

// Инициализация специфичного для экрана контента
function initScreenSpecificContent(screenId) {
  switch (screenId) {
    case 'game-screen':
      // При переходе на игровой экран обновляем UI
      document.dispatchEvent(new CustomEvent('game:updateUI'));
      break;
    case 'profile-screen':
      // При переходе на экран профиля обновляем данные профиля
      document.dispatchEvent(new CustomEvent('profile:refresh'));
      break;
    case 'leaderboard-screen':
      // При переходе на экран рейтинга обновляем данные рейтинга
      document.dispatchEvent(new CustomEvent('leaderboard:refresh'));
      break;
    // Другие экраны...
  }
}

// Обновление выделения в нижней навигации
function updateNavigationHighlight(screenId) {
  const navButtons = document.querySelectorAll('.nav-btn');
  
  navButtons.forEach(button => {
    const buttonScreenId = button.getAttribute('data-screen');
    if (buttonScreenId === screenId) {
      button.classList.add('active');
    } else {
      button.classList.remove('active');
    }
  });
}

// Показ индикатора загрузки
function showLoading() {
  const loadingScreen = document.getElementById('loading-screen');
  if (!loadingScreen) return;
  
  // Показываем индикатор загрузки
  loadingScreen.classList.add('visible');
  appState.flags.isLoading = true;
  
  // Запускаем анимацию прогресс-бара
  optimizedSimulateLoading();
}

// Скрытие индикатора загрузки
function hideLoading() {
  const loadingScreen = document.getElementById('loading-screen');
  if (!loadingScreen) return;
  
  // Скрываем индикатор загрузки
  loadingScreen.classList.remove('visible');
  appState.flags.isLoading = false;
  
  // Очищаем таймер, если он был запущен
  if (appState.timers.loadingTimer) {
    clearTimeout(appState.timers.loadingTimer);
    appState.timers.loadingTimer = null;
  }
}

// Оптимизированная анимация загрузки
function optimizedSimulateLoading() {
  const loadingBar = document.getElementById('loading-bar');
  if (!loadingBar) return;
  
  // Сбрасываем прогресс
  let progress = 0;
  loadingBar.style.width = '0%';
  
  // Функция для анимации загрузки
  function animate() {
    // Если загрузка отменена, выходим
    if (!appState.flags.isLoading) return;
    
    // Увеличиваем прогресс нелинейно (быстрее вначале, медленнее к концу)
    progress += (100 - progress) * 0.05;
    
    // Ограничиваем прогресс 90% (последние 10% - когда загрузка завершится)
    if (progress > 90) progress = 90;
    
    // Обновляем ширину прогресс-бара
    loadingBar.style.width = `${progress}%`;
    
    // Продолжаем анимацию, если загрузка не завершена
    if (appState.flags.isLoading && progress < 90) {
      appState.timers.loadingTimer = requestAnimationFrame(animate);
    }
  }
  
  // Запускаем анимацию
  animate();
}

// Адаптация интерфейса под размер экрана
const adjustLayoutForScreenSize = debounce(() => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  
  // Настройка для разных размеров экрана
  if (width < 360) {
    // Очень маленький экран
    document.body.classList.add('xs-screen');
    document.body.classList.remove('sm-screen', 'md-screen', 'lg-screen');
  } else if (width < 768) {
    // Смартфон
    document.body.classList.add('sm-screen');
    document.body.classList.remove('xs-screen', 'md-screen', 'lg-screen');
  } else if (width < 1024) {
    // Планшет
    document.body.classList.add('md-screen');
    document.body.classList.remove('xs-screen', 'sm-screen', 'lg-screen');
  } else {
    // Десктоп
    document.body.classList.add('lg-screen');
    document.body.classList.remove('xs-screen', 'sm-screen', 'md-screen');
  }
  
  // Настройка высоты контента
  document.documentElement.style.setProperty('--app-height', `${height}px`);
}, 250);

// Настройка основных обработчиков событий
function setupEventListeners() {
  // Обработчик изменения размера окна
  window.addEventListener('resize', adjustLayoutForScreenSize);
  
  // Инициализация размера при загрузке
  adjustLayoutForScreenSize();
  
  // Предотвращение масштабирования на мобильных устройствах
  document.addEventListener('touchmove', (event) => {
    if (event.scale !== 1) {
      event.preventDefault();
    }
  }, { passive: false });
  
  // Другие глобальные обработчики событий
}

// Экспорт функций
export {
  appState,
  initAllScreens,
  initProfileScreen,
  initLeaderboardScreen,
  initGameScreen,
  enhanceAccessibility,
  setupMainButtons,
  setupBottomNavigation,
  navigateTo,
  showLoading,
  hideLoading,
  setupEventListeners,
  adjustLayoutForScreenSize,
  initScreenSpecificContent
}; 