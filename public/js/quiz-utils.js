/**
 * Модуль с утилитами для игры "Криминальный Блеф"
 */

// Основной логгер
const loggers = {};

/**
 * Создает новый логгер для указанного модуля
 * @param {string} moduleName - Имя модуля
 * @returns {Object} - Объект логгера
 */
export function createLogger(moduleName) {
    if (loggers[moduleName]) {
        return loggers[moduleName];
    }
    
    const logger = {
        info: (message, ...args) => console.log(`[INFO][${moduleName}] ${message}`, ...args),
        warn: (message, ...args) => console.warn(`[WARN][${moduleName}] ${message}`, ...args),
        error: (message, ...args) => console.error(`[ERROR][${moduleName}] ${message}`, ...args),
        debug: (message, ...args) => console.debug(`[DEBUG][${moduleName}] ${message}`, ...args)
    };
    
    loggers[moduleName] = logger;
    return logger;
}

/**
 * Показывает всплывающее уведомление
 * @param {string} message - Текст уведомления
 * @param {string} type - Тип уведомления: info, success, warning, error
 * @param {number} duration - Время отображения в миллисекундах
 */
export function showNotification(message, type = 'info', duration = 3000) {
    // Получаем или создаем элемент уведомления
    let notification = document.getElementById('notification');
    
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        notification.className = 'notification hidden';
        document.body.appendChild(notification);
    }
    
    // Удаляем все классы типов
    notification.classList.remove('info', 'success', 'warning', 'error');
    
    // Устанавливаем новый тип
    notification.classList.add(type);
    
    // Устанавливаем текст
    notification.textContent = message;
    
    // Показываем уведомление
    notification.classList.remove('hidden');
    
    // Автоматически скрываем через указанное время
    const timeoutId = notification.dataset.timeoutId;
    if (timeoutId) {
        clearTimeout(parseInt(timeoutId));
    }
    
    const newTimeoutId = setTimeout(() => {
        notification.classList.add('hidden');
    }, duration);
    
    notification.dataset.timeoutId = newTimeoutId;
}

/**
 * Показывает экран загрузки
 */
export function showLoading() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.classList.remove('hidden');
    }
}

/**
 * Скрывает экран загрузки
 */
export function hideLoading() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.classList.add('hidden');
    }
}

/**
 * Форматирует время в секундах в формат 00:00
 * @param {number} seconds - Время в секундах
 * @returns {string} - Отформатированное время
 */
export function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Случайным образом перемешивает элементы массива
 * @param {Array} array - Исходный массив
 * @returns {Array} - Перемешанный массив
 */
export function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

/**
 * Генерирует случайное целое число в заданном диапазоне
 * @param {number} min - Минимальное значение (включительно)
 * @param {number} max - Максимальное значение (включительно)
 * @returns {number} - Случайное число
 */
export function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Безопасно парсит JSON строку
 * @param {string} jsonString - JSON строка
 * @param {*} defaultValue - Значение по умолчанию при ошибке
 * @returns {*} - Распарсенный объект или значение по умолчанию
 */
export function safeParseJSON(jsonString, defaultValue = null) {
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        console.error('Ошибка при парсинге JSON:', error);
        return defaultValue;
    }
}

/**
 * Обрезает текст до указанной длины и добавляет многоточие
 * @param {string} text - Исходный текст
 * @param {number} maxLength - Максимальная длина
 * @returns {string} - Обрезанный текст
 */
export function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

/**
 * Форматирует дату в локальный формат
 * @param {string|Date} dateStr - Дата в виде строки или объекта Date
 * @returns {string} - Отформатированная дата
 */
export function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

/**
 * Получает значение из локального хранилища
 * @param {string} key - Ключ
 * @param {*} defaultValue - Значение по умолчанию
 * @returns {*} - Значение из хранилища или значение по умолчанию
 */
export function getFromStorage(key, defaultValue = null) {
    try {
        const value = localStorage.getItem(key);
        if (value === null) return defaultValue;
        return safeParseJSON(value, defaultValue);
    } catch (error) {
        console.error('Ошибка при получении данных из localStorage:', error);
        return defaultValue;
    }
}

/**
 * Сохраняет значение в локальное хранилище
 * @param {string} key - Ключ
 * @param {*} value - Значение для сохранения
 * @returns {boolean} - Успешность операции
 */
export function saveToStorage(key, value) {
    try {
        const valueToSave = typeof value === 'object' ? JSON.stringify(value) : value;
        localStorage.setItem(key, valueToSave);
        return true;
    } catch (error) {
        console.error('Ошибка при сохранении данных в localStorage:', error);
        return false;
    }
} 