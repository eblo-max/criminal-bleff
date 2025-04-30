/**
 * E2E тест для проверки клиентской части приложения
 * Использует Puppeteer для имитации действий пользователя в браузере
 * 
 * Примечание: требуется установка puppeteer: npm install puppeteer
 */

const puppeteer = require('puppeteer');

// URL приложения
const APP_URL = 'https://first-bot-production.up.railway.app';

// Задержка для визуальной проверки (в мс)
const VISUAL_DELAY = 1000;

/**
 * Вспомогательная функция для задержки 
 * @param {number} ms - время задержки в миллисекундах
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Тест основного пользовательского потока в интерфейсе
 */
async function testUIFlow() {
  console.log('Запуск E2E тестирования пользовательского интерфейса...');
  
  let browser;
  try {
    // Запуск браузера
    console.log('Запуск браузера...');
    browser = await puppeteer.launch({
      headless: false, // Установите true для запуска без UI
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=390,844'],
      defaultViewport: {
        width: 390,
        height: 844
      }
    });
    
    // Создание новой страницы
    const page = await browser.newPage();
    
    // Переход на страницу приложения
    console.log(`Переход на страницу приложения ${APP_URL}...`);
    await page.goto(APP_URL, { waitUntil: 'networkidle2' });
    
    // Ожидание загрузки страницы и проверка наличия основных элементов
    console.log('Проверка загрузки начальной страницы...');
    await page.waitForSelector('body', { timeout: 10000 });
    
    // Делаем скриншот начальной страницы
    await page.screenshot({ path: 'start-page.png' });
    console.log('✅ Начальная страница загружена (скриншот сохранен как start-page.png)');
    await delay(VISUAL_DELAY);
    
    // Проверка наличия кнопки начала игры или любых других интерактивных элементов
    console.log('Поиск интерактивных элементов на странице...');
    
    // Получаем все кнопки на странице
    const buttons = await page.$$('button');
    console.log(`Найдено ${buttons.length} кнопок на странице`);
    
    // Поиск ссылок с текстом "НАЧАТЬ"
    const startLinks = await page.$$('a');
    console.log(`Найдено ${startLinks.length} ссылок на странице`);
    
    let interactionPerformed = false;
    
    // Пробуем найти и нажать кнопку с текстом "НАЧАТЬ" или "Начать"
    try {
      const buttonTexts = await page.$$eval('button', buttons => 
        buttons.map(btn => btn.textContent.trim()));
      console.log('Тексты найденных кнопок:', buttonTexts);
      
      const startButtonIndex = buttonTexts.findIndex(text => 
        text.includes('НАЧАТЬ') || text.includes('Начать'));
      
      if (startButtonIndex >= 0) {
        console.log(`Нажатие на кнопку "${buttonTexts[startButtonIndex]}"...`);
        await buttons[startButtonIndex].click();
        await delay(VISUAL_DELAY);
        interactionPerformed = true;
      }
    } catch (e) {
      console.log('Ошибка при поиске кнопок с текстом:', e.message);
    }
    
    // Если кнопки не найдены, пробуем нажать на первую кнопку
    if (!interactionPerformed && buttons.length > 0) {
      console.log('Пытаемся нажать на первую кнопку...');
      await buttons[0].click();
      await delay(VISUAL_DELAY);
      interactionPerformed = true;
    }
    
    // Пробуем найти и нажать на ссылку с текстом "НАЧАТЬ"
    if (!interactionPerformed && startLinks.length > 0) {
      try {
        const linkTexts = await page.$$eval('a', links => 
          links.map(link => link.textContent.trim()));
        console.log('Тексты найденных ссылок:', linkTexts);
        
        const startLinkIndex = linkTexts.findIndex(text => 
          text.includes('НАЧАТЬ') || text.includes('Начать'));
        
        if (startLinkIndex >= 0) {
          console.log(`Нажатие на ссылку "${linkTexts[startLinkIndex]}"...`);
          await startLinks[startLinkIndex].click();
          await delay(VISUAL_DELAY);
          interactionPerformed = true;
        }
      } catch (e) {
        console.log('Ошибка при поиске ссылок с текстом:', e.message);
      }
    }
    
    if (interactionPerformed) {
      console.log('✅ Выполнено взаимодействие с элементом на странице');
    } else {
      console.log('⚠️ Не удалось найти подходящий элемент для взаимодействия');
    }
    
    // Делаем скриншот после взаимодействия
    await page.screenshot({ path: 'after-interaction.png' });
    console.log('✅ Скриншот после взаимодействия сохранен (after-interaction.png)');
    
    // Ждем некоторое время, чтобы увидеть результат взаимодействия
    console.log('Ожидание изменений на странице...');
    await delay(VISUAL_DELAY * 2);
    
    // Делаем финальный скриншот
    await page.screenshot({ path: 'final-page.png' });
    console.log('✅ Финальный скриншот сохранен (final-page.png)');
    
    // Завершаем тест
    console.log('\n✅ E2E тестирование пользовательского интерфейса завершено успешно');
    return true;
  } catch (error) {
    console.error('\n❌ E2E тестирование пользовательского интерфейса завершилось с ошибкой:', error);
    return false;
  } finally {
    // Закрываем браузер
    if (browser) {
      await browser.close();
      console.log('Браузер закрыт');
    }
  }
}

// Запуск теста
async function runFrontendE2ETests() {
  console.log(`Начало E2E тестов для приложения ${APP_URL}`);
  
  try {
    const uiFlowResult = await testUIFlow();
    
    console.log('\n----------------------------');
    console.log(`Итоги E2E тестирования интерфейса:`);
    console.log(`- Основной пользовательский поток: ${uiFlowResult ? '✅ Успешно' : '❌ Не пройден'}`);
    console.log('----------------------------');
  } catch (e) {
    console.error('Ошибка при выполнении тестов:', e);
  }
  
  console.log('\nE2E тестирование интерфейса завершено.');
}

// Проверка наличия Puppeteer
try {
  require.resolve('puppeteer');
  // Запускаем тесты только если Puppeteer установлен
  runFrontendE2ETests().catch(console.error);
} catch (e) {
  console.error('Для запуска этого теста необходимо установить Puppeteer:');
  console.error('npm install puppeteer');
} 