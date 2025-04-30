/**
 * Тест для проверки загрузки модулей ES6 в Telegram мини-приложении
 */
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const APP_URL = 'http://localhost:8080';
const RESULTS_DIR = path.join(__dirname, '../test-results');

// Создаем директорию для результатов тестов, если её нет
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

// Функция форматирования даты для имен файлов
function formatDate() {
  const now = new Date();
  return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}-${now.getMinutes().toString().padStart(2, '0')}-${now.getSeconds().toString().padStart(2, '0')}`;
}

// Вспомогательная функция, заменяющая waitForTimeout
async function sleep(page, ms) {
  await page.evaluate(ms => new Promise(resolve => setTimeout(resolve, ms)), ms);
}

// Основная функция теста
async function runModuleLoadingTest() {
  console.log('Запуск теста загрузки ES модулей...');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    // Открываем новую страницу
    const page = await browser.newPage();
    
    // Настройка перехвата консоли браузера
    const consoleMessages = [];
    page.on('console', message => {
      const text = message.text();
      console.log(`[Браузер] ${text}`);
      consoleMessages.push({
        type: message.type(),
        text: text,
        timestamp: new Date().toISOString()
      });
    });
    
    // Настройка перехвата ошибок
    const pageErrors = [];
    page.on('pageerror', error => {
      console.error(`[Ошибка браузера] ${error.message}`);
      pageErrors.push({
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    });
    
    // Настройка перехвата запросов ресурсов
    const failedRequests = [];
    page.on('requestfailed', request => {
      const failure = request.failure();
      console.error(`[Ошибка запроса] ${request.url()} - ${failure ? failure.errorText : 'неизвестная ошибка'}`);
      failedRequests.push({
        url: request.url(),
        method: request.method(),
        error: failure ? failure.errorText : 'неизвестная ошибка',
        timestamp: new Date().toISOString()
      });
    });
    
    // Открываем страницу приложения
    console.log('Загрузка приложения...');
    await page.goto(APP_URL, { waitUntil: 'networkidle2' });
    
    // Делаем скриншот начального состояния
    const initialScreenshot = path.join(RESULTS_DIR, `initial-load_${formatDate()}.png`);
    await page.screenshot({ path: initialScreenshot, fullPage: true });
    console.log(`Создан скриншот начального состояния: ${initialScreenshot}`);
    
    // Ждем, когда страница полностью загрузится
    try {
      await page.waitForSelector('#start-screen:not(.hidden)', { timeout: 5000 });
    } catch (e) {
      console.log('Не удалось дождаться отображения начального экрана, продолжаем тест');
    }
    
    // Фиксируем путь к CSS и JS файлам
    await page.evaluate(() => {
      // Исправляем пути к CSS файлам, чтобы они указывали на js/css папку
      document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
        if (link.href.includes('/css/')) {
          const newHref = link.href.replace('/css/', '/js/css/');
          link.href = newHref;
        }
      });
    });
    
    // Проверяем видимые кнопки
    console.log('Проверка видимых кнопок...');
    const visibleButtons = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button:not(.hidden)'));
      return buttons.map(btn => ({
        id: btn.id,
        text: btn.textContent.trim(),
        isVisible: btn.offsetParent !== null
      }));
    });
    
    console.log(`Найдено ${visibleButtons.length} видимых кнопок`);
    
    // Проверяем наличие ошибок модулей в консоли
    const moduleErrors = consoleMessages.filter(msg => 
      msg.type === 'error' && (
        msg.text.includes('Cannot use import statement') || 
        msg.text.includes('module') || 
        msg.text.includes('Unexpected token')
      )
    );
    
    if (moduleErrors.length === 0) {
      console.log('✅ ES модули загружены успешно, ошибок импорта не обнаружено');
    } else {
      console.log('❌ Обнаружены ошибки загрузки ES модулей:');
      moduleErrors.forEach(err => console.log(`  - ${err.text}`));
    }
    
    // Кликаем по кнопке "ОБУЧЕНИЕ"
    console.log('Нажатие кнопки "ОБУЧЕНИЕ"...');
    await page.click('#tutorial-btn');
    
    // Делаем небольшую паузу
    await sleep(page, 500);
    
    // Проверяем, что туториал стал видимым
    const isTutorialVisible = await page.evaluate(() => {
      const tutorialOverlay = document.getElementById('tutorial-overlay');
      return tutorialOverlay && !tutorialOverlay.classList.contains('hidden');
    });
    
    if (isTutorialVisible) {
      console.log('✅ Туториал успешно отображается');
      
      // Делаем скриншот
      const tutorialScreenshot = path.join(RESULTS_DIR, `tutorial-screen_${formatDate()}.png`);
      await page.screenshot({ path: tutorialScreenshot, fullPage: true });
      console.log(`Создан скриншот туториала: ${tutorialScreenshot}`);
    } else {
      console.log('❌ Туториал не появился после клика');
    }
    
    // Кликаем по кнопке "НАЧАТЬ РАССЛЕДОВАНИЕ"
    console.log('Возврат на главный экран...');
    await page.evaluate(() => {
      const tutorialOverlay = document.getElementById('tutorial-overlay');
      if (tutorialOverlay) {
        tutorialOverlay.classList.add('hidden');
      }
    });
    
    // Ждем небольшую паузу
    await sleep(page, 500);
    
    console.log('Нажатие кнопки "НАЧАТЬ РАССЛЕДОВАНИЕ"...');
    await page.click('#start-game-btn');
    
    // Делаем небольшую паузу
    await sleep(page, 500);
    
    // Проверяем, что перешли на экран игры
    const isGameScreenVisible = await page.evaluate(() => {
      const gameScreen = document.getElementById('game-screen');
      return gameScreen && !gameScreen.classList.contains('hidden');
    });
    
    if (isGameScreenVisible) {
      console.log('✅ Экран игры успешно отображается');
      
      // Делаем скриншот
      const gameScreenshot = path.join(RESULTS_DIR, `game-screen_${formatDate()}.png`);
      await page.screenshot({ path: gameScreenshot, fullPage: true });
      console.log(`Создан скриншот игры: ${gameScreenshot}`);
    } else {
      console.log('❌ Экран игры не появился после клика');
    }
    
    // Сохраняем результаты в JSON
    const testResults = {
      timestamp: new Date().toISOString(),
      url: APP_URL,
      screenshots: {
        initial: initialScreenshot,
        tutorial: isTutorialVisible ? tutorialScreenshot : null,
        game: isGameScreenVisible ? gameScreenshot : null
      },
      consoleMessages: consoleMessages,
      pageErrors: pageErrors,
      failedRequests: failedRequests,
      visibleButtons: visibleButtons,
      moduleErrors: moduleErrors,
      success: moduleErrors.length === 0 && isTutorialVisible && isGameScreenVisible
    };
    
    const resultsFile = path.join(RESULTS_DIR, `module-test-results_${formatDate()}.json`);
    fs.writeFileSync(resultsFile, JSON.stringify(testResults, null, 2));
    console.log(`Результаты теста сохранены в файл: ${resultsFile}`);
    
    // Вывод итоговых результатов
    if (testResults.success) {
      console.log('\n✅ ТЕСТ ПРОЙДЕН: ES модули загружаются корректно, все экраны отображаются правильно');
    } else {
      console.log('\n❌ ТЕСТ НЕ ПРОЙДЕН: Обнаружены проблемы с загрузкой модулей или отображением экранов');
    }
    
  } catch (error) {
    console.error('Ошибка во время выполнения теста:', error);
    // Сохраняем информацию об ошибке
    const errorFile = path.join(RESULTS_DIR, `module-test-error_${formatDate()}.json`);
    fs.writeFileSync(errorFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        stack: error.stack
      },
      success: false
    }, null, 2));
    console.log(`Информация об ошибке сохранена в файл: ${errorFile}`);
  } finally {
    // Закрываем браузер
    await browser.close();
    console.log('Тест завершен');
  }
}

// Запускаем тест
runModuleLoadingTest(); 