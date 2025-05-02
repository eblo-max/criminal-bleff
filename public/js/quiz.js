/**
 * Основной модуль игровой логики для игры-викторины "Криминальный Блеф"
 */

// Импортируем необходимые модули
import { showNotification, showLoading, hideLoading } from './utils.js';
import { updateUserProfile, getUserProfile, updateAchievements } from './profile.js';
import { updateLeaderboard } from './leaderboard.js';
import { TelegramWebApp } from './telegram.js';

// Состояние игры
const gameState = {
    stories: [], // Загруженные истории
    currentStoryIndex: 0, // Индекс текущей истории
    score: 0, // Текущий счет
    correctAnswers: 0, // Количество правильных ответов
    streak: 0, // Текущая серия правильных ответов
    maxStreak: 0, // Максимальная серия правильных ответов
    timer: null, // Таймер обратного отсчета
    timeLeft: 15, // Время на ответ (в секундах)
    answerTimes: [], // Время ответа на каждый вопрос
    isActive: false // Активна ли сейчас игра
};

// DOM элементы
let storyTextElement;
let storyImageElement;
let answerOptionsElement;
let currentScoreElement;
let timerElement;
let timerProgressElement;
let currentStoryElement;
let totalStoriesElement;

// Звуковые эффекты
const sounds = {
    correct: new Audio('/sounds/correct.mp3'),
    wrong: new Audio('/sounds/wrong.mp3'),
    tick: new Audio('/sounds/tick.mp3'),
    finish: new Audio('/sounds/finish.mp3')
};

/**
 * Инициализация игрового модуля
 */
export function initQuizGame() {
    console.log('Инициализация игрового модуля...');
    
    // Находим DOM элементы
    storyTextElement = document.getElementById('story-text');
    storyImageElement = document.getElementById('story-img');
    answerOptionsElement = document.getElementById('answer-options');
    currentScoreElement = document.getElementById('current-score');
    timerElement = document.getElementById('game-timer');
    timerProgressElement = document.getElementById('timer-progress');
    currentStoryElement = document.getElementById('current-story');
    totalStoriesElement = document.getElementById('total-stories');
    
    // Настройка обработчиков событий
    setupEventListeners();
    
    console.log('Игровой модуль инициализирован');
}

/**
 * Настройка обработчиков событий для игровых элементов
 */
function setupEventListeners() {
    // Кнопка начала игры
    const startGameBtn = document.getElementById('start-game-btn');
    if (startGameBtn) {
        startGameBtn.addEventListener('click', startGame);
    }
    
    // Кнопка перехода к следующей истории
    const nextStoryBtn = document.getElementById('next-story-btn');
    if (nextStoryBtn) {
        nextStoryBtn.addEventListener('click', nextStory);
    }
    
    // Кнопка "играть снова" на экране результатов
    const playAgainBtn = document.getElementById('play-again-btn');
    if (playAgainBtn) {
        playAgainBtn.addEventListener('click', startGame);
    }
    
    // Кнопка "поделиться результатами"
    const shareResultsBtn = document.getElementById('share-results-btn');
    if (shareResultsBtn) {
        shareResultsBtn.addEventListener('click', shareResults);
    }
    
    // Кнопка возврата в меню из результатов
    const backToMenuBtn = document.getElementById('back-to-menu-btn');
    if (backToMenuBtn) {
        backToMenuBtn.addEventListener('click', () => showScreen('start-screen'));
    }
    
    // Кнопки возврата из профиля и рейтинга
    const backFromProfileBtn = document.getElementById('back-from-profile-btn');
    if (backFromProfileBtn) {
        backFromProfileBtn.addEventListener('click', () => showScreen('start-screen'));
    }
    
    const backFromLeaderboardBtn = document.getElementById('back-from-leaderboard-btn');
    if (backFromLeaderboardBtn) {
        backFromLeaderboardBtn.addEventListener('click', () => showScreen('start-screen'));
    }
    
    // Кнопка профиля
    const profileBtn = document.getElementById('profile-btn');
    if (profileBtn) {
        profileBtn.addEventListener('click', () => {
            loadUserProfile();
            showScreen('profile-screen');
        });
    }
    
    // Кнопка рейтинга
    const leaderboardBtn = document.getElementById('leaderboard-btn');
    if (leaderboardBtn) {
        leaderboardBtn.addEventListener('click', () => {
            loadLeaderboard();
            showScreen('leaderboard-screen');
        });
    }
    
    // Табы в рейтинге
    const leaderboardTabs = document.querySelectorAll('.leaderboard-tabs .tab-button');
    leaderboardTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const period = this.getAttribute('data-tab');
            activateLeaderboardTab(this);
            loadLeaderboard(period);
        });
    });
}

/**
 * Активирует выбранную вкладку в рейтинге
 * @param {HTMLElement} activeTab - Активная вкладка
 */
function activateLeaderboardTab(activeTab) {
    document.querySelectorAll('.leaderboard-tabs .tab-button').forEach(tab => {
        tab.classList.remove('active');
    });
    activeTab.classList.add('active');
}

/**
 * Показывает выбранный экран, скрывая все остальные
 * @param {string} screenId - ID экрана для отображения
 */
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.add('hidden');
    });
    
    const screenToShow = document.getElementById(screenId);
    if (screenToShow) {
        screenToShow.classList.remove('hidden');
    }
}

/**
 * Начать новую игру
 */
function startGame() {
    console.log('Запуск новой игры...');
    
    // Сбрасываем состояние игры
    resetGameState();
    
    // Показываем индикатор загрузки
    showLoading();
    
    // Загружаем истории с сервера
    fetchStories()
        .then(stories => {
            gameState.stories = stories;
            // Устанавливаем общее количество историй
            if (totalStoriesElement) {
                totalStoriesElement.textContent = stories.length;
            }
            
            // Скрываем индикатор загрузки
            hideLoading();
            
            // Показываем игровой экран
            showScreen('game-screen');
            
            // Начинаем с первой истории
            loadStory(0);
        })
        .catch(error => {
            console.error('Ошибка при загрузке историй:', error);
            hideLoading();
            showNotification('Не удалось загрузить истории. Пожалуйста, попробуйте позже.', 'error');
        });
}

/**
 * Сбросить состояние игры
 */
function resetGameState() {
    gameState.currentStoryIndex = 0;
    gameState.score = 0;
    gameState.correctAnswers = 0;
    gameState.streak = 0;
    gameState.maxStreak = 0;
    gameState.answerTimes = [];
    gameState.isActive = true;
    
    // Обновляем отображение счета
    if (currentScoreElement) {
        currentScoreElement.textContent = '0';
    }
}

/**
 * Загрузить истории с сервера
 * @returns {Promise<Array>} - Промис с массивом историй
 */
async function fetchStories() {
    try {
        const response = await fetch('/api/stories/random?count=5');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.stories || [];
    } catch (error) {
        console.error('Ошибка при загрузке историй:', error);
        throw error;
    }
}

/**
 * Загрузить историю с указанным индексом
 * @param {number} index - Индекс истории для загрузки
 */
function loadStory(index) {
    if (!gameState.stories || index >= gameState.stories.length) {
        console.error('Невозможно загрузить историю с индексом', index);
        return;
    }
    
    const story = gameState.stories[index];
    gameState.currentStoryIndex = index;
    
    // Обновляем номер текущей истории
    if (currentStoryElement) {
        currentStoryElement.textContent = (index + 1);
    }
    
    // Отображаем текст истории
    if (storyTextElement) {
        storyTextElement.innerHTML = story.content;
    }
    
    // Загружаем изображение, если есть
    if (storyImageElement && story.imageUrl) {
        storyImageElement.src = story.imageUrl;
        storyImageElement.alt = `Иллюстрация к истории ${index + 1}`;
    } else if (storyImageElement) {
        storyImageElement.src = 'img/stories/default.jpg';
        storyImageElement.alt = 'Стандартная иллюстрация';
    }
    
    // Создаем варианты ответов
    createAnswerOptions(story);
    
    // Запускаем таймер
    startTimer();
}

/**
 * Создает варианты ответов для текущей истории
 * @param {Object} story - Объект истории
 */
function createAnswerOptions(story) {
    if (!answerOptionsElement) return;
    
    // Очищаем контейнер вариантов
    answerOptionsElement.innerHTML = '';
    
    // Получаем правильный ответ и две неправильных ошибки
    const correctMistake = story.mistakes[0]; // Предполагаем, что первая ошибка - правильный ответ
    
    // Создаем массив вариантов ответа
    let options = [
        { text: correctMistake.text, isCorrect: true },
        ...generateIncorrectOptions(story.content, correctMistake.text)
    ];
    
    // Перемешиваем варианты ответов
    options = shuffleArray(options);
    
    // Создаем кнопки с вариантами ответов
    options.forEach((option, index) => {
        const button = document.createElement('button');
        button.className = 'option-button';
        button.textContent = option.text;
        button.setAttribute('data-index', index);
        button.setAttribute('data-correct', option.isCorrect);
        
        button.addEventListener('click', function() {
            handleAnswer(this);
        });
        
        answerOptionsElement.appendChild(button);
    });
}

/**
 * Генерирует неправильные варианты ответов
 * @param {string} storyContent - Полный текст истории
 * @param {string} correctOption - Правильный вариант ответа
 * @returns {Array} - Массив неправильных вариантов
 */
function generateIncorrectOptions(storyContent, correctOption) {
    // Разбиваем текст истории на предложения
    const sentences = storyContent.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // Выбираем случайные предложения для неправильных вариантов
    const incorrectOptions = [];
    
    // Для первого неправильного варианта берем фрагмент текста
    if (sentences.length > 2) {
        let randomIndex1 = Math.floor(Math.random() * sentences.length);
        let option1 = sentences[randomIndex1].trim();
        
        // Убедимся, что вариант не совпадает с правильным и имеет разумную длину
        while (option1 === correctOption || option1.length < 10 || option1.length > 100) {
            randomIndex1 = Math.floor(Math.random() * sentences.length);
            option1 = sentences[randomIndex1].trim();
        }
        
        incorrectOptions.push({ text: option1, isCorrect: false });
    } else {
        // Если предложений мало, создаем произвольный вариант
        incorrectOptions.push({ 
            text: "Преступник не совершал никаких ошибок в этой истории", 
            isCorrect: false 
        });
    }
    
    // Для второго неправильного варианта используем другую технику
    if (sentences.length > 3) {
        let randomIndex2 = Math.floor(Math.random() * sentences.length);
        let option2 = sentences[randomIndex2].trim();
        
        // Убедимся, что вариант отличается от предыдущих
        while (option2 === correctOption || option2 === incorrectOptions[0].text || 
               option2.length < 10 || option2.length > 100) {
            randomIndex2 = Math.floor(Math.random() * sentences.length);
            option2 = sentences[randomIndex2].trim();
        }
        
        incorrectOptions.push({ text: option2, isCorrect: false });
    } else {
        // Альтернативный вариант
        incorrectOptions.push({ 
            text: "Ошибка была в методе совершения преступления", 
            isCorrect: false 
        });
    }
    
    return incorrectOptions;
}

/**
 * Перемешивает массив случайным образом
 * @param {Array} array - Массив для перемешивания
 * @returns {Array} - Перемешанный массив
 */
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

/**
 * Обрабатывает выбор ответа пользователем
 * @param {HTMLElement} selectedOption - Выбранный вариант ответа
 */
function handleAnswer(selectedOption) {
    // Если игра не активна, игнорируем клик
    if (!gameState.isActive) return;
    
    // Останавливаем таймер
    stopTimer();
    
    // Определяем, правильный ли ответ
    const isCorrect = selectedOption.getAttribute('data-correct') === 'true';
    
    // Вычисляем потраченное время
    const timeSpent = 15 - gameState.timeLeft;
    gameState.answerTimes.push(timeSpent);
    
    // Рассчитываем баллы за ответ
    let points = 0;
    
    if (isCorrect) {
        // Правильный ответ: базовые очки + бонус за скорость + бонус за серию
        gameState.streak++;
        gameState.correctAnswers++;
        
        // Обновляем максимальную серию
        if (gameState.streak > gameState.maxStreak) {
            gameState.maxStreak = gameState.streak;
        }
        
        // Базовые очки: 100
        points = 100;
        
        // Бонус за скорость: до 50 очков в зависимости от скорости ответа
        // Чем быстрее ответ, тем больше бонус
        const speedBonus = Math.floor(50 * (1 - timeSpent / 15));
        points += speedBonus;
        
        // Бонус за серию: 20 очков за каждый правильный ответ в серии, начиная со второго
        if (gameState.streak > 1) {
            const streakBonus = (gameState.streak - 1) * 20;
            points += streakBonus;
        }
        
        // Воспроизводим звук правильного ответа
        sounds.correct.play().catch(e => console.log('Error playing sound:', e));
    } else {
        // Неправильный ответ: сбрасываем серию
        gameState.streak = 0;
        
        // Воспроизводим звук неправильного ответа
        sounds.wrong.play().catch(e => console.log('Error playing sound:', e));
    }
    
    // Добавляем очки к общему счету
    gameState.score += points;
    
    // Обновляем отображение счета
    if (currentScoreElement) {
        currentScoreElement.textContent = gameState.score;
    }
    
    // Подсвечиваем выбранный вариант
    highlightAnswers(selectedOption, isCorrect);
    
    // Деактивируем игру на время показа результата
    gameState.isActive = false;
    
    // Показываем результат ответа через небольшую задержку
    setTimeout(() => {
        showAnswerResult(isCorrect, points, timeSpent);
    }, 1000);
}

/**
 * Подсвечивает варианты ответов после выбора
 * @param {HTMLElement} selectedOption - Выбранный вариант
 * @param {boolean} isCorrect - Правильный ли ответ
 */
function highlightAnswers(selectedOption, isCorrect) {
    // Подсвечиваем выбранный вариант
    if (isCorrect) {
        selectedOption.classList.add('correct');
    } else {
        selectedOption.classList.add('incorrect');
        
        // Если выбор неверный, подсвечиваем правильный вариант
        const options = document.querySelectorAll('.option-button');
        options.forEach(option => {
            if (option.getAttribute('data-correct') === 'true') {
                option.classList.add('correct');
            }
        });
    }
    
    // Делаем все кнопки некликабельными
    const options = document.querySelectorAll('.option-button');
    options.forEach(option => {
        option.removeEventListener('click', handleAnswer);
        option.style.pointerEvents = 'none';
    });
}

/**
 * Показывает экран с результатом ответа
 * @param {boolean} isCorrect - Правильный ли ответ
 * @param {number} points - Набранные очки
 * @param {number} timeSpent - Потраченное время
 */
function showAnswerResult(isCorrect, points, timeSpent) {
    // Получаем элементы экрана результата
    const resultTitleElement = document.getElementById('answer-result-title');
    const explanationElement = document.getElementById('answer-explanation');
    const answerTimeElement = document.getElementById('answer-time');
    const answerPointsElement = document.getElementById('answer-points');
    const currentStreakElement = document.getElementById('current-streak');
    
    // Устанавливаем заголовок
    if (resultTitleElement) {
        resultTitleElement.textContent = isCorrect ? 'Верно!' : 'Неверно!';
        resultTitleElement.style.color = isCorrect ? 'var(--success)' : 'var(--danger)';
    }
    
    // Устанавливаем объяснение
    if (explanationElement) {
        const story = gameState.stories[gameState.currentStoryIndex];
        if (story && story.mistakes && story.mistakes[0]) {
            explanationElement.innerHTML = `
                <p><strong>Ошибка преступника:</strong> ${story.mistakes[0].text}</p>
                <p><strong>Правильно должно быть:</strong> ${story.mistakes[0].correct}</p>
                <p>${story.explanation || 'Преступники часто делают ошибки, которые приводят к их поимке.'}</p>
            `;
        }
    }
    
    // Устанавливаем время ответа
    if (answerTimeElement) {
        answerTimeElement.textContent = `${timeSpent} сек`;
    }
    
    // Устанавливаем набранные очки
    if (answerPointsElement) {
        answerPointsElement.textContent = isCorrect ? `+${points}` : '0';
        answerPointsElement.style.color = isCorrect ? 'var(--success)' : 'var(--danger)';
    }
    
    // Устанавливаем текущую серию
    if (currentStreakElement) {
        currentStreakElement.textContent = gameState.streak;
    }
    
    // Показываем экран результата
    showScreen('answer-result-screen');
}

/**
 * Переходит к следующей истории
 */
function nextStory() {
    const nextIndex = gameState.currentStoryIndex + 1;
    
    // Если истории закончились, показываем финальный результат
    if (nextIndex >= gameState.stories.length) {
        showGameResults();
    } else {
        // Иначе загружаем следующую историю
        showScreen('game-screen');
        loadStory(nextIndex);
        gameState.isActive = true;
    }
}

/**
 * Показывает экран с результатами игры
 */
function showGameResults() {
    // Воспроизводим звук завершения
    sounds.finish.play().catch(e => console.log('Error playing sound:', e));
    
    // Получаем элементы экрана результатов
    const correctAnswersElement = document.getElementById('correct-answers');
    const totalPointsElement = document.getElementById('total-points');
    const bestStreakElement = document.getElementById('best-streak');
    const averageTimeElement = document.getElementById('average-time');
    
    // Устанавливаем количество правильных ответов
    if (correctAnswersElement) {
        correctAnswersElement.textContent = `${gameState.correctAnswers}/${gameState.stories.length}`;
    }
    
    // Устанавливаем общий счет
    if (totalPointsElement) {
        totalPointsElement.textContent = gameState.score;
    }
    
    // Устанавливаем лучшую серию
    if (bestStreakElement) {
        bestStreakElement.textContent = gameState.maxStreak;
    }
    
    // Вычисляем и устанавливаем среднее время ответа
    if (averageTimeElement && gameState.answerTimes.length > 0) {
        const avgTime = gameState.answerTimes.reduce((sum, time) => sum + time, 0) / gameState.answerTimes.length;
        averageTimeElement.textContent = `${avgTime.toFixed(1)} сек`;
    }
    
    // Проверяем достижения
    checkAchievements();
    
    // Отправляем результаты на сервер
    saveGameResults();
    
    // Показываем экран результатов
    showScreen('game-results-screen');
}

/**
 * Запускает таймер обратного отсчета
 */
function startTimer() {
    // Сбрасываем таймер
    gameState.timeLeft = 15;
    updateTimerDisplay();
    
    // Устанавливаем интервал для обновления таймера
    gameState.timer = setInterval(() => {
        gameState.timeLeft--;
        updateTimerDisplay();
        
        // Воспроизводим звук тиканья при низком времени
        if (gameState.timeLeft <= 5) {
            sounds.tick.play().catch(e => console.log('Error playing sound:', e));
        }
        
        // Если время истекло, обрабатываем как неправильный ответ
        if (gameState.timeLeft <= 0) {
            clearInterval(gameState.timer);
            handleTimeOut();
        }
    }, 1000);
}

/**
 * Обновляет отображение таймера
 */
function updateTimerDisplay() {
    // Обновляем числовое значение таймера
    if (timerElement) {
        timerElement.textContent = gameState.timeLeft;
        
        // Меняем цвет при низком времени
        if (gameState.timeLeft <= 5) {
            timerElement.style.color = 'var(--danger)';
        } else {
            timerElement.style.color = 'var(--accent-primary)';
        }
    }
    
    // Обновляем прогресс-бар
    if (timerProgressElement) {
        const percentage = (gameState.timeLeft / 15) * 100;
        timerProgressElement.style.width = `${percentage}%`;
        
        // Меняем цвет прогресс-бара при низком времени
        if (gameState.timeLeft <= 5) {
            timerProgressElement.style.backgroundColor = 'var(--danger)';
        } else {
            timerProgressElement.style.backgroundColor = 'var(--accent-primary)';
        }
    }
}

/**
 * Останавливает таймер
 */
function stopTimer() {
    if (gameState.timer) {
        clearInterval(gameState.timer);
        gameState.timer = null;
    }
}

/**
 * Обрабатывает ситуацию истечения времени
 */
function handleTimeOut() {
    // Сбрасываем серию правильных ответов
    gameState.streak = 0;
    
    // Воспроизводим звук неправильного ответа
    sounds.wrong.play().catch(e => console.log('Error playing sound:', e));
    
    // Подсвечиваем правильный ответ
    const options = document.querySelectorAll('.option-button');
    options.forEach(option => {
        if (option.getAttribute('data-correct') === 'true') {
            option.classList.add('correct');
        }
        
        // Делаем кнопки некликабельными
        option.removeEventListener('click', handleAnswer);
        option.style.pointerEvents = 'none';
    });
    
    // Деактивируем игру на время показа результата
    gameState.isActive = false;
    
    // Записываем время ответа и показываем результат
    gameState.answerTimes.push(15);
    
    // Показываем результат с задержкой
    setTimeout(() => {
        showAnswerResult(false, 0, 15);
    }, 1000);
}

/**
 * Проверяет и присваивает достижения
 */
function checkAchievements() {
    const achievements = [];
    
    // Проверяем разные условия для достижений
    
    // 1. Первая игра
    achievements.push({
        id: 'first_game',
        name: 'Новичок',
        description: 'Завершите первую игру'
    });
    
    // 2. Все правильные ответы
    if (gameState.correctAnswers === gameState.stories.length) {
        achievements.push({
            id: 'perfect_game',
            name: 'Идеальное расследование',
            description: 'Дайте все правильные ответы в одной игре'
        });
    }
    
    // 3. Серия из 3+ правильных ответов
    if (gameState.maxStreak >= 3) {
        achievements.push({
            id: 'hot_streak',
            name: 'Горячая серия',
            description: 'Получите 3 правильных ответа подряд'
        });
    }
    
    // 4. Быстрые ответы
    const fastAnswers = gameState.answerTimes.filter(time => time < 5).length;
    if (fastAnswers >= 3) {
        achievements.push({
            id: 'speed_demon',
            name: 'Молниеносный детектив',
            description: 'Ответьте на 3 вопроса менее чем за 5 секунд каждый'
        });
    }
    
    // 5. Высокие очки
    if (gameState.score >= 500) {
        achievements.push({
            id: 'high_score',
            name: 'Профессионал',
            description: 'Наберите 500 или более очков в одной игре'
        });
    }
    
    // Отображаем полученное достижение, если есть
    if (achievements.length > 0) {
        showEarnedAchievement(achievements[0]);
    }
    
    // Отправляем достижения на сервер
    updateAchievements(achievements);
}

/**
 * Показывает полученное достижение
 * @param {Object} achievement - Объект достижения
 */
function showEarnedAchievement(achievement) {
    const achievementNotification = document.getElementById('achievement-notification');
    const earnedAchievementElement = document.getElementById('earned-achievement');
    
    if (achievementNotification && earnedAchievementElement) {
        earnedAchievementElement.textContent = achievement.name;
        achievementNotification.classList.remove('hidden');
    }
}

/**
 * Сохраняет результаты игры на сервере
 */
async function saveGameResults() {
    try {
        const result = {
            score: gameState.score,
            correctAnswers: gameState.correctAnswers,
            totalQuestions: gameState.stories.length,
            maxStreak: gameState.maxStreak,
            averageTime: gameState.answerTimes.reduce((sum, time) => sum + time, 0) / gameState.answerTimes.length
        };
        
        const response = await fetch('/api/games', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(result)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Обновляем профиль и рейтинг
        loadUserProfile();
        loadLeaderboard();
        
        console.log('Результаты игры успешно сохранены');
    } catch (error) {
        console.error('Ошибка при сохранении результатов:', error);
    }
}

/**
 * Загружает профиль пользователя
 */
async function loadUserProfile() {
    try {
        const profile = await getUserProfile();
        
        // Обновляем элементы профиля
        const totalGamesElement = document.getElementById('total-games');
        const correctPercentageElement = document.getElementById('correct-percentage');
        const maxStreakElement = document.getElementById('max-streak');
        const rankElement = document.getElementById('rank');
        
        if (totalGamesElement && profile.totalGames !== undefined) {
            totalGamesElement.textContent = profile.totalGames;
        }
        
        if (correctPercentageElement && profile.correctPercentage !== undefined) {
            correctPercentageElement.textContent = `${profile.correctPercentage}%`;
        }
        
        if (maxStreakElement && profile.maxStreak !== undefined) {
            maxStreakElement.textContent = profile.maxStreak;
        }
        
        if (rankElement && profile.rank !== undefined) {
            rankElement.textContent = profile.rank;
        }
        
        // Обновляем достижения
        if (profile.achievements) {
            updateAchievementsDisplay(profile.achievements);
        }
        
    } catch (error) {
        console.error('Ошибка при загрузке профиля:', error);
        showNotification('Не удалось загрузить профиль', 'error');
    }
}

/**
 * Обновляет отображение достижений
 * @param {Array} achievements - Массив достижений
 */
function updateAchievementsDisplay(achievements) {
    const achievementsContainer = document.getElementById('achievements-container');
    
    if (!achievementsContainer) return;
    
    // Очищаем контейнер
    achievementsContainer.innerHTML = '';
    
    // Добавляем все достижения
    achievements.forEach(achievement => {
        const achievementElement = document.createElement('div');
        achievementElement.className = `achievement-item ${achievement.unlocked ? '' : 'locked'}`;
        
        achievementElement.innerHTML = `
            <div class="achievement-icon"></div>
            <div class="achievement-name">${achievement.name}</div>
            <div class="achievement-description">${achievement.description}</div>
        `;
        
        achievementsContainer.appendChild(achievementElement);
    });
}

/**
 * Загружает данные рейтинга
 * @param {string} period - Период времени ('daily', 'weekly', 'all-time')
 */
async function loadLeaderboard(period = 'weekly') {
    try {
        const leaderboardList = document.getElementById('leaderboard-list');
        
        if (!leaderboardList) return;
        
        // Показываем индикатор загрузки
        leaderboardList.innerHTML = '<div class="loading-message">Загрузка рейтинга...</div>';
        
        // Получаем данные рейтинга
        const leaderboardData = await fetch(`/api/leaderboard?period=${period}`).then(res => res.json());
        
        // Обновляем отображение
        updateLeaderboard(leaderboardList, leaderboardData, period);
        
    } catch (error) {
        console.error('Ошибка при загрузке рейтинга:', error);
        
        const leaderboardList = document.getElementById('leaderboard-list');
        if (leaderboardList) {
            leaderboardList.innerHTML = '<div class="loading-message error">Ошибка загрузки рейтинга</div>';
        }
    }
}

/**
 * Делится результатами игры
 */
function shareResults() {
    // Если доступен Telegram Web App, используем его для шаринга
    if (TelegramWebApp.isAvailable) {
        const text = `🕵️‍♂️ Я прошел игру "Криминальный Блеф" с результатом: ${gameState.correctAnswers}/${gameState.stories.length} правильных ответов и набрал ${gameState.score} очков! Сможешь превзойти меня?`;
        
        TelegramWebApp.shareScore(text);
    } else {
        // Иначе используем стандартный Web Share API, если он доступен
        if (navigator.share) {
            navigator.share({
                title: 'Мой результат в игре "Криминальный Блеф"',
                text: `Я прошел игру "Криминальный Блеф" с результатом: ${gameState.correctAnswers}/${gameState.stories.length} правильных ответов и набрал ${gameState.score} очков! Сможешь превзойти меня?`
            }).catch(error => {
                console.log('Ошибка шаринга', error);
            });
        } else {
            showNotification('Шаринг не поддерживается в вашем браузере', 'warning');
        }
    }
}

// Экспортируем функции, необходимые для внешнего использования
export {
    initQuizGame,
    startGame,
    showScreen
}; 