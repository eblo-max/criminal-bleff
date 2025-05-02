/**
 * Модуль инициализации приложения "Криминальный Блеф"
 * Версия: 2.0.0
 * Описание: Игра-викторина с криминальными историями
 */

// Импортируем необходимые модули
import { createLogger, showNotification, showLoading, hideLoading } from './utils.js';
import { initQuizGame, showScreen } from './quiz.js';
import { initProfile } from './quiz-profile.js';
import { initLeaderboard } from './quiz-leaderboard.js';
import { initTelegram } from './telegram.js';

// Создаем логгер для этого модуля
const logger = createLogger('AppInit');

/**
 * Инициализирует приложение
 */
function initApp() {
    logger.info('Инициализация приложения...');
    
    // Проверяем поддержку необходимых API
    checkBrowserSupport();
    
    // Инициализируем Telegram WebApp
    initTelegram()
        .then(() => {
            logger.info('Telegram WebApp инициализирован');
            // Эффект "исчезания" начального экрана загрузки
            setTimeout(() => {
                hideLoading();
            }, 500);
        })
        .catch(error => {
            logger.error('Ошибка инициализации Telegram WebApp:', error);
            // Даже при ошибке продолжаем инициализацию приложения
            hideLoading();
        });
    
    // Инициализируем все необходимые модули
    initModules();
    
    // Настраиваем обработчики событий для глобальных элементов
    setupGlobalEventListeners();
    
    // Показываем начальный экран
    showScreen('start-screen');
    
    logger.info('Приложение инициализировано');
}

/**
 * Проверяет поддержку необходимых браузерных API
 */
function checkBrowserSupport() {
    // Проверяем поддержку Fetch API
    if (!window.fetch) {
        logger.warn('Fetch API не поддерживается в этом браузере');
        showNotification('Ваш браузер не поддерживает некоторые функции. Возможны ограничения в работе приложения.', 'warning');
    }
    
    // Проверяем поддержку localStorage
    try {
        const test = 'test';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
    } catch (e) {
        logger.warn('LocalStorage не поддерживается или отключен:', e);
        showNotification('Локальное хранилище недоступно. Некоторые функции могут не работать.', 'warning');
    }
    
    // Проверяем поддержку Audio API
    if (!window.Audio) {
        logger.warn('Audio API не поддерживается в этом браузере');
        // Здесь можно отключить звуки в приложении
    }
}

/**
 * Инициализирует все необходимые модули приложения
 */
function initModules() {
    try {
        // Инициализируем модуль игры
        initQuizGame();
        
        // Инициализируем модуль профиля
        initProfile();
        
        // Инициализируем модуль рейтинга
        initLeaderboard();
        
        logger.info('Все модули успешно инициализированы');
    } catch (error) {
        logger.error('Ошибка при инициализации модулей:', error);
        showNotification('Произошла ошибка при загрузке компонентов приложения', 'error');
    }
}

/**
 * Настраивает глобальные обработчики событий
 */
function setupGlobalEventListeners() {
    // Обработчик для кнопок навигации и закрытия
    document.addEventListener('click', function(event) {
        // Обрабатываем клики по элементам приложения
        handleAppClickEvents(event);
    });
    
    // Обработчик нажатия клавиш
    document.addEventListener('keydown', function(event) {
        // ESC - возврат к предыдущему экрану
        if (event.key === 'Escape') {
            handleEscapeKey();
        }
    });
    
    // Обработчик событий видимости страницы
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'hidden') {
            // Приложение свернуто - можно приостановить игру, звуки и т.д.
            logger.info('Приложение свернуто');
        } else {
            // Приложение снова активно
            logger.info('Приложение активно');
        }
    });
    
    // Обработчик ошибок
    window.addEventListener('error', function(event) {
        logger.error('Глобальная ошибка:', event.message, event.filename, event.lineno);
    });
    
    // Обработчик непойманных промисов
    window.addEventListener('unhandledrejection', function(event) {
        logger.error('Непойманное отклонение промиса:', event.reason);
    });
}

/**
 * Обрабатывает клики по элементам приложения
 * @param {Event} event - Событие клика
 */
function handleAppClickEvents(event) {
    // Пример обработки специфичных элементов
    if (event.target.closest('.notification')) {
        // Закрываем уведомление при клике на него
        event.target.closest('.notification').classList.add('hidden');
    }
    
    // Дополнительные обработчики кликов можно добавить здесь
}

/**
 * Обрабатывает нажатие клавиши ESC
 */
function handleEscapeKey() {
    // Определяем текущий активный экран
    const activeScreen = document.querySelector('.screen:not(.hidden)');
    
    if (!activeScreen) return;
    
    const screenId = activeScreen.id;
    
    // Логика навигации при нажатии ESC
    switch (screenId) {
        case 'game-screen':
            // Тут нужно предложить пользователю выйти из игры с подтверждением
            if (confirm('Вы уверены, что хотите прервать игру? Прогресс будет потерян.')) {
                showScreen('start-screen');
            }
            break;
        case 'profile-screen':
        case 'leaderboard-screen':
        case 'game-results-screen':
            // Возвращаемся на главный экран
            showScreen('start-screen');
            break;
        case 'answer-result-screen':
            // Из экрана результата ответа возвращаемся к игре
            showScreen('game-screen');
            break;
        default:
            // По умолчанию никаких действий
            break;
    }
}

// Запускаем инициализацию приложения при загрузке DOM
document.addEventListener('DOMContentLoaded', initApp);

// Экспортируем функции для использования в других модулях
export {
    initApp
}; 