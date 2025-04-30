/**
 * Базовый E2E тест для проверки загрузки приложения в окружении Telegram WebApp
 */
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Получаем путь к текущему файлу и директории
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Настройки теста
const config = {
  screenshotDir: join(__dirname, '../test-screenshots'),
  reportDir: join(__dirname, '../test-results'),
  appUrl: 'file://' + join(__dirname, '../public/index.html'),
  timeout: 10000
};

// Убеждаемся, что директории существуют
if (!fs.existsSync(config.screenshotDir)) {
  fs.mkdirSync(config.screenshotDir, { recursive: true });
}
if (!fs.existsSync(config.reportDir)) {
  fs.mkdirSync(config.reportDir, { recursive: true });
}

// Основная функция теста
async function runBasicTelegramTest() {
  console.log('Запуск базового теста Telegram WebApp...');
  
  // Начинаем сбор данных для отчета
  const testReport = {
    startTime: new Date().toISOString(),
    testName: 'Basic Telegram WebApp Test',
    errors: [],
    warnings: [],
    screenshots: [],
    endTime: null,
    success: false
  };
  
  // Запускаем браузер
  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: { width: 390, height: 844 },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process'
    ]
  });
  
  try {
    // Открываем новую страницу
    const page = await browser.newPage();
    
    // Настраиваем размер мобильного устройства
    await page.setViewport({
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true
    });
    
    // Собираем ошибки консоли
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        console.error(`Ошибка в браузере: ${msg.text()}`);
      } else {
        console.log(`Лог из браузера: ${msg.text()}`);
      }
    });
    
    // Собираем ошибки страницы
    const pageErrors = [];
    page.on('pageerror', error => {
      pageErrors.push(error.message);
      console.error(`Ошибка страницы: ${error.message}`);
    });
    
    // Создаем базовую эмуляцию Telegram WebApp перед загрузкой страницы
    await page.evaluateOnNewDocument(() => {
      window.Telegram = {
        WebApp: {
          isExpanded: true,
          initDataUnsafe: {
            user: {
              id: 12345678,
              first_name: 'Test',
              last_name: 'User',
              username: 'testuser',
              language_code: 'ru'
            },
            chat: { id: 87654321, type: 'private' },
            auth_date: Math.floor(Date.now() / 1000) - 60,
            hash: 'test_hash'
          },
          ready: function() { 
            console.log('[TelegramMock] WebApp.ready() вызван');
            document.dispatchEvent(new Event('telegram:ready'));
          },
          expand: function() { console.log('[TelegramMock] WebApp.expand() вызван'); },
          close: function() { console.log('[TelegramMock] WebApp.close() вызван'); },
          showPopup: function(params, callback) {
            console.log('[TelegramMock] WebApp.showPopup() вызван');
            if (callback) setTimeout(() => callback(), 500);
          },
          showAlert: function(message, callback) {
            console.log('[TelegramMock] WebApp.showAlert() вызван');
            if (callback) setTimeout(() => callback(), 500);
          },
          showConfirm: function(message, callback) {
            console.log('[TelegramMock] WebApp.showConfirm() вызван');
            if (callback) setTimeout(() => callback(true), 500);
            return Promise.resolve(true);
          }
        }
      };
      
      // Добавляем MainButton
      window.Telegram.WebApp.MainButton = {
        text: '',
        isVisible: false,
        isActive: true,
        isProgressVisible: false,
        show: function() { this.isVisible = true; },
        hide: function() { this.isVisible = false; },
        enable: function() { this.isActive = true; },
        disable: function() { this.isActive = false; },
        setText: function(text) { this.text = text; },
        onClick: function(callback) { this._callback = callback; }
      };
      
      // Добавляем BackButton
      window.Telegram.WebApp.BackButton = {
        isVisible: false,
        show: function() { this.isVisible = true; },
        hide: function() { this.isVisible = false; },
        onClick: function(callback) { this._callback = callback; }
      };
      
      console.log('Эмуляция Telegram WebApp API создана');
    });
    
    // Загружаем страницу
    console.log('Загрузка страницы...');
    await page.goto(config.appUrl, { waitUntil: ['load', 'domcontentloaded'], timeout: config.timeout });
    
    // Делаем паузу для инициализации скриптов
    await page.waitForTimeout(2000);
    
    // Делаем скриншот загруженной страницы
    const initialScreenshot = `telegram-basic-test-${Date.now()}.png`;
    await page.screenshot({ path: join(config.screenshotDir, initialScreenshot), fullPage: true });
    testReport.screenshots.push(initialScreenshot);
    
    // Проверяем загрузку модулей
    const scriptInfo = await page.evaluate(() => {
      return {
        scripts: Array.from(document.querySelectorAll('script')).map(s => ({
          src: s.src,
          type: s.type,
          id: s.id
        })),
        visibleScreens: Array.from(document.querySelectorAll('.screen:not(.hidden)')).map(s => s.id)
      };
    });
    
    console.log('Информация о скриптах:', JSON.stringify(scriptInfo.scripts, null, 2));
    console.log('Видимые экраны:', scriptInfo.visibleScreens);
    
    // Собираем все ошибки
    if (consoleErrors.length > 0) {
      testReport.errors.push(...consoleErrors.map(error => ({
        type: 'consoleError',
        message: error
      })));
    }
    
    if (pageErrors.length > 0) {
      testReport.errors.push(...pageErrors.map(error => ({
        type: 'pageError',
        message: error
      })));
    }
    
    // Тест считается успешным, если страница загрузилась
    testReport.success = true;
    console.log('Базовый тест завершен. Страница загружена.');
    
  } catch (error) {
    console.error('Ошибка при выполнении теста:', error);
    testReport.errors.push({
      type: 'testError',
      message: error.message,
      stack: error.stack
    });
  } finally {
    // Записываем отчет
    testReport.endTime = new Date().toISOString();
    const reportPath = join(config.reportDir, `telegram-basic-test-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(testReport, null, 2));
    console.log(`Отчет о тесте сохранен в ${reportPath}`);
    
    // Закрываем браузер
    await browser.close();
    
    return testReport.success;
  }
}

// Запускаем тест
runBasicTelegramTest()
  .then(success => {
    console.log(`Результат теста: ${success ? 'успешно' : 'ошибка'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Критическая ошибка:', error);
    process.exit(1);
  }); 