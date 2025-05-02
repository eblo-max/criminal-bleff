/**
 * Модуль для работы с рейтингом игроков в "Криминальном Блефе"
 */

import { showNotification } from './utils.js';

/**
 * Загружает данные рейтинга с сервера
 * @param {string} period - Период ('daily', 'weekly', 'all-time')
 * @returns {Promise<Array>} - Массив с данными рейтинга
 */
export async function fetchLeaderboard(period = 'weekly') {
    try {
        const response = await fetch(`/api/leaderboard?period=${period}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data.leaderboard || [];
    } catch (error) {
        console.error('Ошибка при загрузке рейтинга:', error);
        throw error;
    }
}

/**
 * Обновляет отображение таблицы рейтинга
 * @param {HTMLElement} container - Контейнер для отображения рейтинга
 * @param {Array} leaderboardData - Данные рейтинга
 * @param {string} period - Период рейтинга
 */
export function updateLeaderboard(container, leaderboardData, period = 'weekly') {
    if (!container) return;
    
    // Очищаем контейнер
    container.innerHTML = '';
    
    // Если нет данных
    if (!leaderboardData || leaderboardData.length === 0) {
        container.innerHTML = `<div class="loading-message">Нет данных за выбранный период</div>`;
        return;
    }
    
    // Получаем текущего пользователя
    const currentUserId = getCurrentUserId();
    
    // Создаем элементы рейтинга
    leaderboardData.forEach((item, index) => {
        const isCurrentUser = item.userId === currentUserId;
        
        const leaderboardItem = document.createElement('div');
        leaderboardItem.className = `leaderboard-item ${isCurrentUser ? 'current-user' : ''}`;
        
        leaderboardItem.innerHTML = `
            <div class="leaderboard-rank">${index + 1}</div>
            <div class="leaderboard-user">${item.username}</div>
            <div class="leaderboard-score">${item.score}</div>
        `;
        
        container.appendChild(leaderboardItem);
    });
    
    // Добавляем заголовок периода
    const periodTitle = document.createElement('div');
    periodTitle.className = 'leaderboard-period';
    periodTitle.textContent = getPeriodTitle(period);
    container.prepend(periodTitle);
}

/**
 * Получает заголовок для периода
 * @param {string} period - Период рейтинга
 * @returns {string} - Текстовое представление периода
 */
function getPeriodTitle(period) {
    switch (period) {
        case 'daily':
            return 'Лучшие игроки сегодня';
        case 'weekly':
            return 'Лучшие игроки за неделю';
        case 'all-time':
            return 'Лучшие игроки за всё время';
        default:
            return 'Рейтинг игроков';
    }
}

/**
 * Получает ID текущего пользователя
 * @returns {string|null} - ID пользователя или null
 */
function getCurrentUserId() {
    // Здесь должна быть логика получения ID текущего пользователя
    // В реальном приложении это может быть из JWT токена, localStorage или куки
    try {
        const userData = localStorage.getItem('user');
        if (userData) {
            const user = JSON.parse(userData);
            return user.id;
        }
        return null;
    } catch (error) {
        console.error('Ошибка при получении ID пользователя:', error);
        return null;
    }
}

/**
 * Инициализирует модуль рейтинга
 */
export function initLeaderboard() {
    console.log('Инициализация модуля рейтинга...');
    
    // Здесь может быть дополнительная логика инициализации
    
    console.log('Модуль рейтинга инициализирован');
} 