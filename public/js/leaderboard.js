/**
 * Модуль для работы с таблицей лидеров в Криминальном Блефе
 */

import { logger, notifications, fetchWithRetry, dataCache, isCacheValid } from './utils.js';
import { telegramUser } from './telegram.js';
import { showLoading, hideLoading } from './ui.js';
import { addArchiveEffects, addGlitchEffect } from './effects.js';

// Базовый URL API
const API_BASE_URL = window.location.hostname.includes('localhost') 
  ? 'http://localhost:3000' 
  : '';

// Состояние таблицы лидеров
const leaderboardState = {
  isLoading: false,
  currentPeriod: 'daily', // 'daily', 'weekly', 'all-time'
  data: {
    daily: [],
    weekly: [],
    allTime: []
  },
  userRank: {
    daily: null,
    weekly: null,
    allTime: null
  },
  pagination: {
    daily: { page: 1, limit: 10, total: 0 },
    weekly: { page: 1, limit: 10, total: 0 },
    allTime: { page: 1, limit: 10, total: 0 }
  }
};

// Загрузка данных таблицы лидеров
async function loadLeaderboard(period = 'daily') {
  try {
    // Если данные уже загружаются, ждем
    if (leaderboardState.isLoading) {
      return;
    }
    
    // Устанавливаем флаг загрузки
    leaderboardState.isLoading = true;
    showLoading();
    
    // Устанавливаем выбранный период
    leaderboardState.currentPeriod = period;
    
    // Проверяем, есть ли валидные данные в кэше
    const cacheKey = period === 'all-time' ? 'allTime' : period;
    if (isCacheValid(dataCache.leaderboard[cacheKey])) {
      // Используем кэшированные данные
      renderLeaderboard(dataCache.leaderboard[cacheKey].data, period);
      hideLoading();
      leaderboardState.isLoading = false;
      
      // Асинхронно обновляем кэш в фоне
      refreshLeaderboardData(period, true);
      return;
    }
    
    // Загружаем актуальные данные
    await refreshLeaderboardData(period);
    
    // Применяем эффекты
    setTimeout(() => {
      const leaderboardContainer = document.querySelector('.leaderboard-container');
      if (leaderboardContainer) {
        addArchiveEffects(leaderboardContainer);
      }
      
      const leaderboardTitle = document.getElementById('leaderboard-title');
      if (leaderboardTitle) {
        addGlitchEffect(leaderboardTitle, 1000);
      }
    }, 200);
    
  } catch (error) {
    logger.error('Ошибка при загрузке таблицы лидеров:', error);
    notifications.error('Не удалось загрузить рейтинг');
    
    // Отображаем резервные данные
    renderFallbackLeaderboard();
  } finally {
    hideLoading();
    leaderboardState.isLoading = false;
  }
}

// Загрузка актуальных данных таблицы лидеров
async function refreshLeaderboardData(period = 'daily', background = false) {
  try {
    if (!background) {
      showLoading();
    }
    
    // Получаем ID пользователя
    const userId = telegramUser.id;
    const periodKey = period === 'all-time' ? 'allTime' : period;
    const pagination = leaderboardState.pagination[periodKey];
    
    // Подготавливаем URL с параметрами пагинации
    const url = `${API_BASE_URL}/api/leaderboard/${period}?page=${pagination.page}&limit=${pagination.limit}`;
    
    // Загружаем данные рейтинга
    const leaderboardData = await fetchWithRetry(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Загружаем позицию пользователя в рейтинге
    let userRankData = null;
    if (userId) {
      userRankData = await fetchWithRetry(`${API_BASE_URL}/api/leaderboard/user/${userId}?period=${period}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Сохраняем данные
    leaderboardState.data[periodKey] = leaderboardData.data.entries || [];
    leaderboardState.pagination[periodKey].total = leaderboardData.data.total || 0;
    
    if (userRankData && userRankData.data) {
      leaderboardState.userRank[periodKey] = userRankData.data;
    }
    
    // Сохраняем в кэш
    dataCache.leaderboard[periodKey].data = leaderboardState.data[periodKey];
    dataCache.leaderboard[periodKey].timestamp = Date.now();
    
    // Отрисовываем таблицу
    renderLeaderboard(leaderboardState.data[periodKey], period);
    
    if (!background) {
      hideLoading();
    }
    
    return true;
  } catch (error) {
    logger.error('Ошибка получения данных рейтинга:', error);
    
    if (!background) {
      hideLoading();
      notifications.error('Не удалось загрузить данные рейтинга');
    }
    
    return false;
  }
}

// Рендеринг таблицы лидеров
function renderLeaderboard(data, period = 'daily') {
  const leaderboardTable = document.getElementById('leaderboard-table');
  if (!leaderboardTable) return;
  
  // Очищаем таблицу
  leaderboardTable.innerHTML = '';
  
  // Если нет данных, показываем заглушку
  if (!data || data.length === 0) {
    leaderboardTable.innerHTML = `
      <div class="empty-leaderboard">
        <div class="empty-icon">🏆</div>
        <div class="empty-text">Данные не найдены</div>
        <div class="empty-subtext">Будьте первым в рейтинге!</div>
      </div>
    `;
    return;
  }
  
  // Создаем заголовок таблицы
  const tableHeader = document.createElement('div');
  tableHeader.className = 'leaderboard-header';
  tableHeader.innerHTML = `
    <div class="rank-col">Ранг</div>
    <div class="player-col">Игрок</div>
    <div class="score-col">Очки</div>
  `;
  leaderboardTable.appendChild(tableHeader);
  
  // Создаем строки для каждого игрока
  data.forEach((player, index) => {
    const playerRow = document.createElement('div');
    playerRow.className = 'leaderboard-row';
    
    // Если это текущий пользователь, выделяем строку
    if (player.telegramId === telegramUser.id) {
      playerRow.classList.add('current-user');
    }
    
    // Определяем класс для топ-3
    if (index === 0) playerRow.classList.add('gold');
    if (index === 1) playerRow.classList.add('silver');
    if (index === 2) playerRow.classList.add('bronze');
    
    // Формируем содержимое строки
    playerRow.innerHTML = `
      <div class="rank-col">${player.rank || index + 1}</div>
      <div class="player-col">
        ${player.photoUrl ? `<div class="player-avatar" style="background-image: url(${player.photoUrl})"></div>` : ''}
        <div class="player-name">${player.username || 'Незнакомец'}</div>
      </div>
      <div class="score-col">${player.score || 0}</div>
    `;
    
    leaderboardTable.appendChild(playerRow);
  });
  
  // Отображаем информацию о ранге текущего пользователя
  renderUserRank(period);
  
  // Обновляем выделение вкладок периодов
  updatePeriodTabs(period);
}

// Отображение ранга текущего пользователя
function renderUserRank(period) {
  const periodKey = period === 'all-time' ? 'allTime' : period;
  const userRankInfo = document.getElementById('user-rank-info');
  
  if (!userRankInfo) return;
  
  // Получаем данные о ранге пользователя
  const rankData = leaderboardState.userRank[periodKey];
  
  // Если нет данных о ранге
  if (!rankData || !rankData.rank) {
    userRankInfo.innerHTML = `
      <div class="user-rank-not-found">
        Вы еще не участвуете в рейтинге
      </div>
    `;
    return;
  }
  
  // Отображаем информацию о ранге
  userRankInfo.innerHTML = `
    <div class="user-rank-container">
      <div class="user-rank-label">Ваш ранг:</div>
      <div class="user-rank-value">#${rankData.rank}</div>
      <div class="user-rank-score">${rankData.score} очков</div>
    </div>
  `;
}

// Обновление выделения вкладок периодов
function updatePeriodTabs(period) {
  const periodTabs = document.querySelectorAll('.period-tab');
  
  periodTabs.forEach(tab => {
    const tabPeriod = tab.getAttribute('data-period');
    
    if (tabPeriod === period) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });
}

// Рендеринг резервной таблицы лидеров
function renderFallbackLeaderboard() {
  const leaderboardTable = document.getElementById('leaderboard-table');
  if (!leaderboardTable) return;
  
  leaderboardTable.innerHTML = `
    <div class="empty-leaderboard">
      <div class="empty-icon">📡</div>
      <div class="empty-text">Нет соединения с сервером</div>
      <div class="empty-subtext">Данные недоступны. Повторите попытку позже.</div>
    </div>
  `;
  
  // Сбрасываем информацию о ранге пользователя
  const userRankInfo = document.getElementById('user-rank-info');
  if (userRankInfo) {
    userRankInfo.innerHTML = '';
  }
}

// Обработка пагинации
function handlePagination(direction) {
  const periodKey = leaderboardState.currentPeriod === 'all-time' ? 'allTime' : leaderboardState.currentPeriod;
  const pagination = leaderboardState.pagination[periodKey];
  
  // Вычисляем новую страницу
  let newPage = pagination.page;
  
  if (direction === 'next' && (pagination.page * pagination.limit) < pagination.total) {
    newPage++;
  } else if (direction === 'prev' && pagination.page > 1) {
    newPage--;
  } else {
    // Нет изменений в странице
    return;
  }
  
  // Обновляем страницу
  leaderboardState.pagination[periodKey].page = newPage;
  
  // Загружаем данные для новой страницы
  refreshLeaderboardData(leaderboardState.currentPeriod);
  
  // Обновляем состояние кнопок пагинации
  updatePaginationControls();
}

// Обновление состояния контролов пагинации
function updatePaginationControls() {
  const prevButton = document.getElementById('prev-page-btn');
  const nextButton = document.getElementById('next-page-btn');
  
  if (!prevButton || !nextButton) return;
  
  const periodKey = leaderboardState.currentPeriod === 'all-time' ? 'allTime' : leaderboardState.currentPeriod;
  const pagination = leaderboardState.pagination[periodKey];
  
  // Отключаем кнопку "назад", если мы на первой странице
  prevButton.disabled = pagination.page <= 1;
  
  // Отключаем кнопку "вперед", если мы на последней странице
  nextButton.disabled = (pagination.page * pagination.limit) >= pagination.total;
}

// Настройка обработчиков событий для таблицы лидеров
function setupLeaderboardEventListeners() {
  // Вкладки периодов
  const periodTabs = document.querySelectorAll('.period-tab');
  periodTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const period = tab.getAttribute('data-period');
      loadLeaderboard(period);
    });
  });
  
  // Кнопки пагинации
  const prevPageBtn = document.getElementById('prev-page-btn');
  if (prevPageBtn) {
    prevPageBtn.addEventListener('click', () => {
      handlePagination('prev');
    });
  }
  
  const nextPageBtn = document.getElementById('next-page-btn');
  if (nextPageBtn) {
    nextPageBtn.addEventListener('click', () => {
      handlePagination('next');
    });
  }
  
  // Кнопка обновления
  const refreshBtn = document.getElementById('refresh-leaderboard-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      refreshLeaderboardData(leaderboardState.currentPeriod);
      // Добавляем анимацию вращения к кнопке
      refreshBtn.classList.add('rotating');
      setTimeout(() => {
        refreshBtn.classList.remove('rotating');
      }, 1000);
    });
  }
}

// Экспорт функций
export {
  loadLeaderboard,
  refreshLeaderboardData,
  renderLeaderboard,
  renderUserRank,
  setupLeaderboardEventListeners,
  leaderboardState
}; 