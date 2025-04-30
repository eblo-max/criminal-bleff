/**
 * Модуль для управления туториалом приложения
 * 
 * @module tutorial
 */

// Обработка для правильного экспорта функций
let importedUI, importedUtils;

try {
    // Используем динамический импорт для совместимости
    Promise.all([
        import('./ui.js'),
        import('./utils.js')
    ]).then(([ui, utils]) => {
        importedUI = ui;
        importedUtils = utils;
        console.log('Зависимости туториала успешно загружены');
        // Автоматически инициализируем после загрузки
        setTimeout(initTutorial, 0);
    }).catch(err => {
        console.error('Ошибка импорта зависимостей в tutorial.js:', err);
        // Пытаемся использовать глобальные переменные
        importedUI = { state: window.state, updateMainMenuDisplay: window.updateMainMenuDisplay };
        importedUtils = { showNotification: window.showNotification || function(msg) { console.log(msg); } };
        // Инициализируем с глобальными переменными
        setTimeout(initTutorial, 0);
    });
} catch (e) {
    console.error('Общая ошибка в tutorial.js:', e);
}

/**
 * Инициализация туториала и настройка обработчиков событий
 */
export function initTutorial() {
    console.log('Инициализация туториала');
    
    try {
        setupTutorialEvents();
        
        // Отложенная проверка наличия кнопки туториала
        setTimeout(() => {
            const tutorialBtn = document.getElementById('tutorial-btn');
            if (tutorialBtn) {
                console.log('Найдена кнопка туториала, добавляем обработчик');
                tutorialBtn.addEventListener('click', () => {
                    console.log('Клик по кнопке туториала');
                    showTutorial();
                });
            } else {
                console.warn('Кнопка туториала не найдена');
            }
        }, 500);
        
        return true;
    } catch (error) {
        console.error('Ошибка при инициализации туториала:', error);
        return false;
    }
}

/**
 * Настройка обработчиков событий для туториала
 */
function setupTutorialEvents() {
    const tutorialOverlay = document.getElementById('tutorial-overlay');
    if (!tutorialOverlay) {
        console.warn('Элемент tutorial-overlay не найден при настройке событий');
        return false;
    }
    
    // Находим все кнопки Далее и Закрыть
    const nextButtons = tutorialOverlay.querySelectorAll('.tutorial-next');
    const closeButton = tutorialOverlay.querySelector('.tutorial-close');
    
    // Настраиваем кнопки перехода между шагами
    nextButtons.forEach(button => {
        button.addEventListener('click', () => {
            const currentStep = button.closest('.tutorial-step');
            const stepNumber = parseInt(currentStep.dataset.step, 10);
            const nextStep = tutorialOverlay.querySelector(`.tutorial-step[data-step="${stepNumber + 1}"]`);
            
            if (nextStep) {
                currentStep.style.display = 'none';
                nextStep.style.display = 'block';
            }
        });
    });
    
    // Настраиваем кнопку закрытия туториала
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            closeTutorial();
            try {
                localStorage.setItem('tutorialShown', 'true');
                const showNotification = importedUtils?.showNotification || window.showNotification || console.log;
                showNotification('Вы успешно завершили обучение!');
            } catch (e) {
                console.warn('Ошибка при закрытии туториала:', e);
            }
        });
    }
    
    return true;
}

/**
 * Показываем диалог с предложением пройти туториал
 */
function showTutorialPrompt() {
    if (confirm('Хотите пройти обучение?')) {
        showTutorial();
    } else {
        localStorage.setItem('tutorialShown', 'true');
    }
}

/**
 * Открываем оверлей туториала и показываем первый шаг
 */
export function showTutorial() {
    console.log('Показываем туториал - начало функции');
    
    try {
        let tutorialOverlay = document.getElementById('tutorial-overlay');
        
        // Если элемент не найден, создаем его
        if (!tutorialOverlay) {
            console.log('Туториал не найден, создаем новый');
            tutorialOverlay = document.createElement('div');
            tutorialOverlay.id = 'tutorial-overlay';
            tutorialOverlay.className = 'overlay';
            tutorialOverlay.setAttribute('data-test-id', 'tutorial-overlay');
            document.body.appendChild(tutorialOverlay);
            
            // Создаем контейнер и шаги туториала
            const container = document.createElement('div');
            container.className = 'tutorial-container';
            
            // Шаги туториала
            const stepsData = [
                {
                    title: 'Добро пожаловать в игру!',
                    content: 'В этой игре вы - детектив, который расследует запутанные дела.',
                    buttonText: 'Далее'
                },
                {
                    title: 'Расследование дела',
                    content: 'Изучайте сценарий, допрашивайте подозреваемых и собирайте улики.',
                    buttonText: 'Далее'
                },
                {
                    title: 'Решение дела',
                    content: 'Когда вы готовы, выберите виновного и его мотив. Будьте внимательны!',
                    buttonText: 'Далее'
                },
                {
                    title: 'Достижения и рейтинг',
                    content: 'Зарабатывайте достижения и соревнуйтесь с другими детективами.',
                    buttonText: 'Начать игру',
                    isLast: true
                }
            ];
            
            // Создаем шаги
            stepsData.forEach((step, index) => {
                const stepElement = document.createElement('div');
                stepElement.className = 'tutorial-step';
                stepElement.dataset.step = index + 1;
                stepElement.style.display = index === 0 ? 'block' : 'none';
                
                stepElement.innerHTML = `
                    <h3>${step.title}</h3>
                    <p>${step.content}</p>
                    <button class="${step.isLast ? 'tutorial-close' : 'tutorial-next'} action-button">${step.buttonText}</button>
                `;
                
                container.appendChild(stepElement);
            });
            
            tutorialOverlay.appendChild(container);
            
            // Настраиваем обработчики событий
            setupTutorialEvents();
        }
        
        // Обязательно показываем туториал и делаем его видимым
        tutorialOverlay.classList.remove('hidden');
        tutorialOverlay.style.cssText = 'display: flex !important; z-index: 9999 !important; position: fixed !important; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.85); justify-content: center; align-items: center; opacity: 1 !important; visibility: visible !important;';
        
        // Показываем первый шаг
        const firstStep = tutorialOverlay.querySelector('.tutorial-step[data-step="1"]');
        if (firstStep) {
            firstStep.style.display = 'block';
        } else {
            console.warn('Первый шаг туториала не найден');
        }
        
        console.log('Туториал отображен успешно');
        return true;
    } catch (error) {
        console.error('Ошибка при отображении туториала:', error);
        return false;
    }
}

/**
 * Закрываем оверлей туториала
 */
export function closeTutorial() {
    const tutorialOverlay = document.getElementById('tutorial-overlay');
    tutorialOverlay.classList.add('hidden');
    
    // Разблокируем скролл
    document.body.style.overflow = '';
    
    // Обновляем отображение главного меню
    importedUI?.updateMainMenuDisplay();
}

// Инициализируем туториал при загрузке модуля
document.addEventListener('DOMContentLoaded', initTutorial); 