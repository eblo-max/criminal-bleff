/**
 * Модуль управления профилем пользователя для игры "Криминальный Блеф"
 */

import { showNotification } from './utils.js';

// Кэш профиля пользователя
let userProfileCache = null;

/**
 * Получает профиль пользователя с сервера
 * @returns {Promise<Object>} - Объект профиля пользователя
 */
export async function getUserProfile() {
    try {
        // Если профиль уже загружен, возвращаем кэшированную версию
        if (userProfileCache) {
            return userProfileCache;
        }
        
        // Иначе загружаем с сервера
        const response = await fetch('/api/profile');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const profile = await response.json();
        
        // Кэшируем профиль
        userProfileCache = profile;
        
        return profile;
    } catch (error) {
        console.error('Ошибка при загрузке профиля:', error);
        throw error;
    }
}

/**
 * Обновляет профиль пользователя
 * @param {Object} profileData - Данные для обновления профиля
 * @returns {Promise<Object>} - Обновленный профиль
 */
export async function updateUserProfile(profileData) {
    try {
        const response = await fetch('/api/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(profileData)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const updatedProfile = await response.json();
        
        // Обновляем кэшированный профиль
        userProfileCache = updatedProfile;
        
        return updatedProfile;
    } catch (error) {
        console.error('Ошибка при обновлении профиля:', error);
        showNotification('Не удалось обновить профиль', 'error');
        throw error;
    }
}

/**
 * Обновляет достижения пользователя
 * @param {Array} achievements - Массив новых достижений
 * @returns {Promise<Object>} - Обновленный профиль
 */
export async function updateAchievements(achievements) {
    if (!achievements || achievements.length === 0) {
        return null;
    }
    
    try {
        const response = await fetch('/api/achievements', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ achievements })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Инвалидируем кэш профиля
        userProfileCache = null;
        
        return result;
    } catch (error) {
        console.error('Ошибка при обновлении достижений:', error);
        return null;
    }
}

/**
 * Получает список всех возможных достижений
 * @returns {Promise<Array>} - Массив всех достижений
 */
export async function getAllAchievements() {
    try {
        const response = await fetch('/api/achievements/all');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const { achievements } = await response.json();
        return achievements;
    } catch (error) {
        console.error('Ошибка при загрузке списка достижений:', error);
        return [];
    }
}

/**
 * Инициализирует модуль профиля
 */
export function initProfile() {
    console.log('Инициализация модуля профиля...');
    
    // Загружаем профиль пользователя
    getUserProfile()
        .then(profile => {
            console.log('Профиль пользователя загружен:', profile);
        })
        .catch(error => {
            console.error('Не удалось загрузить профиль:', error);
        });
    
    console.log('Модуль профиля инициализирован');
} 