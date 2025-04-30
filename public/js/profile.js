/**
 * Модуль для работы с профилем пользователя в Криминальном Блефе
 */

import { logger, notifications, fetchWithRetry, dataCache, isCacheValid } from './utils.js';
import { telegramUser } from './telegram.js';
import { showLoading, hideLoading, navigateTo } from './ui.js';
import { addDossierEffects, addGlitchEffect } from './effects.js';

// Базовый URL API
const API_BASE_URL = window.location.hostname.includes('localhost') 
  ? 'http://localhost:3000' 
  : '';

// Состояние профиля
const profileState = {
  isLoading: false,
  userData: null,
  achievements: null,
  stats: {
    totalGames: 0,
    correctAnswerRate: 0,
    bestStreak: 0,
    rank: 0
  }
};

// Загрузка профиля пользователя
async function loadUserProfile() {
  try {
    // Если данные уже загружаются, ждем
    if (profileState.isLoading) {
      return;
    }

    // Устанавливаем флаг загрузки
    profileState.isLoading = true;
    showLoading();

    // Проверяем, есть ли валидные данные в кэше
    if (isCacheValid(dataCache.profile)) {
      profileState.userData = dataCache.profile.data;
      renderProfile(profileState.userData);
      hideLoading();
      profileState.isLoading = false;
      
      // Асинхронно обновляем кэш в фоне
      refreshProfileData(true);
      return;
    }

    // Загружаем данные пользователя
    await refreshProfileData();

    // Применяем эффекты
    setTimeout(() => {
      const profileContainer = document.querySelector('.profile-container');
      if (profileContainer) {
        addDossierEffects(profileContainer);
      }
      
      const profileUsername = document.getElementById('profile-username');
      if (profileUsername) {
        addGlitchEffect(profileUsername, 1000);
      }
    }, 200);

  } catch (error) {
    logger.error('Ошибка при загрузке профиля:', error);
    notifications.error('Не удалось загрузить профиль. Повторите попытку.');
    
    // Отображаем резервные данные
    renderFallbackProfile();
  } finally {
    hideLoading();
    profileState.isLoading = false;
  }
}

// Загрузка актуальных данных профиля
async function refreshProfileData(background = false) {
  try {
    if (!background) {
      showLoading();
    }
    
    // Получаем ID пользователя
    const userId = telegramUser.id;
    if (!userId) {
      throw new Error('Не удалось определить ID пользователя');
    }
    
    // Загружаем профиль с API
    const profileData = await fetchWithRetry(`${API_BASE_URL}/api/user/profile/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Загружаем достижения с API
    const achievementsData = await fetchWithRetry(`${API_BASE_URL}/api/user/achievements/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Загружаем позицию пользователя в рейтинге
    const rankData = await fetchWithRetry(`${API_BASE_URL}/api/leaderboard/user/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Сохраняем данные
    profileState.userData = profileData.data.user;
    profileState.achievements = achievementsData.data.achievements;
    
    // Обновляем статистику
    profileState.stats = {
      totalGames: profileState.userData.gamesPlayed || 0,
      correctAnswerRate: profileState.userData.gamesPlayed > 0 
        ? Math.round((profileState.userData.correctAnswers / profileState.userData.gamesPlayed) * 100) 
        : 0,
      bestStreak: profileState.userData.bestStreak || 0,
      rank: rankData.data.rank || '-'
    };
    
    // Сохраняем в кэш
    dataCache.profile.data = profileState.userData;
    dataCache.profile.timestamp = Date.now();
    
    // Отрисовываем профиль
    renderProfile();
    
    if (!background) {
      hideLoading();
    }
    
    return true;
  } catch (error) {
    logger.error('Ошибка получения данных профиля:', error);
    
    if (!background) {
      hideLoading();
      notifications.error('Не удалось загрузить данные профиля');
    }
    
    return false;
  }
}

// Рендеринг данных профиля
function renderProfile() {
  // Если нет данных, показываем заглушку
  if (!profileState.userData) {
    renderFallbackProfile();
    return;
  }
  
  try {
    // Основная информация
    const usernameElement = document.getElementById('profile-username');
    if (usernameElement) {
      usernameElement.textContent = profileState.userData.username || 'Детектив';
    }
    
    const userIdElement = document.getElementById('profile-id');
    if (userIdElement) {
      userIdElement.textContent = `ID: ${profileState.userData.telegramId || 'неизвестно'}`;
    }
    
    const userAvatarElement = document.getElementById('profile-avatar');
    if (userAvatarElement && telegramUser.photoUrl) {
      userAvatarElement.style.backgroundImage = `url(${telegramUser.photoUrl})`;
      userAvatarElement.classList.add('has-avatar');
    }
    
    // Статистика
    const totalGamesElement = document.getElementById('stat-total-games');
    if (totalGamesElement) {
      totalGamesElement.textContent = profileState.stats.totalGames;
    }
    
    const correctRateElement = document.getElementById('stat-correct-rate');
    if (correctRateElement) {
      correctRateElement.textContent = `${profileState.stats.correctAnswerRate}%`;
    }
    
    const bestStreakElement = document.getElementById('stat-best-streak');
    if (bestStreakElement) {
      bestStreakElement.textContent = profileState.stats.bestStreak;
    }
    
    const rankElement = document.getElementById('stat-rank');
    if (rankElement) {
      rankElement.textContent = profileState.stats.rank === 0 ? '-' : `#${profileState.stats.rank}`;
    }
    
    const scoreElement = document.getElementById('stat-score');
    if (scoreElement) {
      scoreElement.textContent = profileState.userData.score || 0;
    }
    
    // Достижения
    renderAchievements();
    
  } catch (error) {
    logger.error('Ошибка отрисовки профиля:', error);
  }
}

// Рендеринг достижений
function renderAchievements() {
  const achievementsContainer = document.getElementById('achievements-container');
  if (!achievementsContainer) return;
  
  // Очищаем контейнер
  achievementsContainer.innerHTML = '';
  
  // Если нет достижений или они не загружены
  if (!profileState.achievements || profileState.achievements.length === 0) {
    achievementsContainer.innerHTML = `
      <div class="empty-achievements">
        <div class="empty-icon">🏆</div>
        <div class="empty-text">Достижений пока нет</div>
        <div class="empty-subtext">Играйте больше, чтобы получить награды</div>
      </div>
    `;
    return;
  }
  
  // Доступные достижения
  const achievementsList = [
    {
      id: 'first_win',
      name: 'Первое расследование',
      description: 'Успешно завершите первое расследование',
      icon: '🎮'
    },
    {
      id: 'win_streak',
      name: 'Серия успехов',
      description: 'Получите 5 правильных ответов подряд',
      icon: '🔍'
    },
    {
      id: 'master_detective',
      name: 'Мастер-детектив',
      description: 'Завершите 10 расследований',
      icon: '🕵️'
    },
    {
      id: 'quick_solver',
      name: 'Молниеносное раскрытие',
      description: 'Завершите расследование за 30 секунд',
      icon: '⚡'
    },
    {
      id: 'perfect_score',
      name: 'Идеальный счет',
      description: 'Получите 100% правильных ответов в игре',
      icon: '🎯'
    }
  ];
  
  // Сопоставляем полученные достижения с списком доступных
  const userAchievements = profileState.achievements.map(achId => {
    const achievement = achievementsList.find(a => a.id === achId);
    return achievement || {
      id: achId,
      name: 'Неизвестное достижение',
      description: 'Описание недоступно',
      icon: '❓'
    };
  });
  
  // Отрисовываем достижения
  userAchievements.forEach(achievement => {
    const achievementEl = document.createElement('div');
    achievementEl.className = 'achievement-item';
    achievementEl.innerHTML = `
      <div class="achievement-icon">${achievement.icon}</div>
      <div class="achievement-info">
        <div class="achievement-name">${achievement.name}</div>
        <div class="achievement-description">${achievement.description}</div>
      </div>
    `;
    achievementsContainer.appendChild(achievementEl);
  });
}

// Рендеринг резервного профиля
function renderFallbackProfile() {
  try {
    // Основная информация
    const usernameElement = document.getElementById('profile-username');
    if (usernameElement) {
      usernameElement.textContent = telegramUser.username || 'Детектив';
    }
    
    const userIdElement = document.getElementById('profile-id');
    if (userIdElement) {
      userIdElement.textContent = `ID: ${telegramUser.id || 'неизвестно'}`;
    }
    
    // Статистика
    const statsElements = [
      'stat-total-games', 'stat-correct-rate', 
      'stat-best-streak', 'stat-rank', 'stat-score'
    ];
    
    statsElements.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = '-';
      }
    });
    
    // Достижения
    const achievementsContainer = document.getElementById('achievements-container');
    if (achievementsContainer) {
      achievementsContainer.innerHTML = `
        <div class="empty-achievements">
          <div class="empty-icon">📡</div>
          <div class="empty-text">Нет соединения с сервером</div>
          <div class="empty-subtext">Данные недоступны. Повторите попытку позже.</div>
        </div>
      `;
    }
  } catch (error) {
    logger.error('Ошибка отрисовки резервного профиля:', error);
  }
}

// Обработчики событий профиля
function setupProfileEventListeners() {
  // Кнопка обновления профиля
  const refreshButton = document.getElementById('refresh-profile-btn');
  if (refreshButton) {
    refreshButton.addEventListener('click', () => {
      refreshProfileData();
      // Добавляем анимацию вращения к кнопке
      refreshButton.classList.add('rotating');
      setTimeout(() => {
        refreshButton.classList.remove('rotating');
      }, 1000);
    });
  }
  
  // Кнопка показа достижений
  const showAchievementsButton = document.getElementById('show-achievements-btn');
  if (showAchievementsButton) {
    showAchievementsButton.addEventListener('click', () => {
      const statsSection = document.getElementById('profile-stats-section');
      const achievementsSection = document.getElementById('profile-achievements-section');
      
      if (statsSection && achievementsSection) {
        statsSection.classList.add('hidden');
        achievementsSection.classList.remove('hidden');
      }
    });
  }
  
  // Кнопка возврата к статистике
  const showStatsButton = document.getElementById('show-stats-btn');
  if (showStatsButton) {
    showStatsButton.addEventListener('click', () => {
      const statsSection = document.getElementById('profile-stats-section');
      const achievementsSection = document.getElementById('profile-achievements-section');
      
      if (statsSection && achievementsSection) {
        achievementsSection.classList.add('hidden');
        statsSection.classList.remove('hidden');
      }
    });
  }
}

// Экспорт функций
export {
  loadUserProfile,
  refreshProfileData,
  renderProfile,
  renderAchievements,
  setupProfileEventListeners,
  profileState
}; 