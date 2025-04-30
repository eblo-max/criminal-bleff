/**
 * Полный E2E тест для проверки работы приложения в окружении Telegram WebApp
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
  timeout: 15000, // Увеличиваем таймаут
  forceVisibility: true // Флаг для принудительного отображения скрытых элементов
};

// Убеждаемся, что директории существуют
if (!fs.existsSync(config.screenshotDir)) {
  fs.mkdirSync(config.screenshotDir, { recursive: true });
}
if (!fs.existsSync(config.reportDir)) {
  fs.mkdirSync(config.reportDir, { recursive: true });
}

// Основная функция теста
async function runTelegramE2ETest() {
  console.log('Запуск E2E теста Telegram WebApp...');
  
  // Начинаем сбор данных для отчета
  const testReport = {
    startTime: new Date().toISOString(),
    testName: 'Telegram WebApp E2E Test',
    steps: [],
    errors: [],
    warnings: [],
    screenshots: [],
    domInfo: [],
    forcedElements: null, // Будет содержать информацию о принудительно отображенных элементах
    endTime: null,
    success: false
  };
  
  // Запускаем браузер в неголовном режиме для лучшей производительности
  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: { width: 390, height: 844 }, // Размер экрана смартфона
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
    
    // Добавляем обработчик консоли и ошибок
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      
      // Записываем важные сообщения в отчет
      if (type === 'error') {
        testReport.errors.push({ type: 'console', message: text, timestamp: new Date().toISOString() });
        console.error(`Ошибка в браузере: ${text}`);
      } else if (type === 'warning') {
        testReport.warnings.push({ message: text, timestamp: new Date().toISOString() });
        console.warn(`Предупреждение в браузере: ${text}`);
      } else if (text.includes('[INFO]') || text.includes('[TelegramMock]') || text.includes('Инициализация')) {
        testReport.steps.push({ type: 'log', message: text, timestamp: new Date().toISOString() });
        console.log(`Лог из браузера: ${text}`);
      }
    });
    
    // Перехватываем исключения в браузере
    page.on('pageerror', error => {
      testReport.errors.push({ 
        type: 'pageError', 
        message: error.message, 
        timestamp: new Date().toISOString() 
      });
      console.error(`Ошибка страницы: ${error.message}`);
    });
    
    // Шаг 1: Инжектируем код модуля telegram-test-utils.js
    testReport.steps.push({ 
      step: 1, 
      description: 'Загрузка модуля telegram-test-utils.js',
      timestamp: new Date().toISOString()
    });
    
    // Читаем содержимое модуля telegram-test-utils.js
    const testUtilsPath = join(__dirname, '../public/js/telegram-test-utils.js');
    let testUtilsCode = '';
    
    try {
      if (fs.existsSync(testUtilsPath)) {
        testUtilsCode = fs.readFileSync(testUtilsPath, 'utf8');
        console.log('Модуль telegram-test-utils.js успешно загружен');
      } else {
        console.warn('Модуль telegram-test-utils.js не найден, будет использована базовая эмуляция');
      }
    } catch (error) {
      console.warn('Ошибка при чтении модуля telegram-test-utils.js:', error.message);
    }
    
    // Перехватываем запросы для контроля загрузки страницы
    await page.setRequestInterception(true);
    
    page.on('request', request => {
      // Пропускаем все запросы
      request.continue();
    });
    
    // Шаг 2: Загружаем страницу
    testReport.steps.push({ 
      step: 2, 
      description: 'Загрузка страницы приложения',
      timestamp: new Date().toISOString()
    });
    
    // Загружаем страницу и ждем до полной загрузки
    await page.goto(config.appUrl, { 
      waitUntil: ['domcontentloaded', 'networkidle2'],
      timeout: config.timeout
    });
    
    // Шаг 3: Инжектируем модуль тестовых утилит, если он был загружен
    if (testUtilsCode) {
      testReport.steps.push({ 
        step: 3, 
        description: 'Внедрение модуля telegram-test-utils.js в страницу',
        timestamp: new Date().toISOString()
      });
      
      // Внедряем модуль как ES модуль
      await page.evaluate(`
        // Создаем скрипт с типом module
        const script = document.createElement('script');
        script.type = 'module';
        script.textContent = \`
          // Экспортируем функции в глобальную область видимости для доступа из тестов
          window.TelegramTestUtils = {};
          
          ${testUtilsCode.replace(/export\s+function\s+(\w+)/g, 'window.TelegramTestUtils.$1 = function')}
          
          // Создаем событие для оповещения о готовности модуля
          document.dispatchEvent(new CustomEvent('telegram-test-utils:ready'));
          console.log('[TEST] Модуль telegram-test-utils.js успешно внедрен');
        \`;
        document.head.appendChild(script);
      `);
      
      // Ждем, пока модуль будет загружен
      try {
        await page.waitForFunction(() => {
          return window.TelegramTestUtils && window.TelegramTestUtils.forceInitialization;
        }, { timeout: 5000 });
        console.log('Модуль telegram-test-utils.js успешно инициализирован в странице');
      } catch (error) {
        console.warn('Таймаут при ожидании инициализации модуля telegram-test-utils.js:', error.message);
      }
    }
    
    // Шаг 4: Инжектируем эмуляцию Telegram WebApp непосредственно в страницу
    testReport.steps.push({ 
      step: 4, 
      description: 'Инициализация эмуляции Telegram WebApp API',
      timestamp: new Date().toISOString()
    });
    
    // Эмулируем объект Telegram
    await page.evaluate(() => {
      // Сначала удаляем существующий объект, если он есть
      delete window.Telegram;
      
      // Создаем базовую эмуляцию API
      window.Telegram = {
        WebApp: {
          isExpanded: true,
          initDataUnsafe: {
            user: {
              id: 12345678,
              first_name: 'Test',
              last_name: 'User',
              username: 'testuser',
              language_code: 'ru',
              photo_url: ''
            },
            chat: {
              id: 87654321,
              type: 'private'
            },
            auth_date: Math.floor(Date.now() / 1000) - 60,
            hash: 'test_hash'
          },
          ready: function() { 
            console.log('[TelegramMock] WebApp.ready() вызван'); 
            // Создаем событие для оповещения приложения о готовности API
            const event = new Event('telegram:ready');
            document.dispatchEvent(event);
          },
          expand: function() { console.log('[TelegramMock] WebApp.expand() вызван'); },
          close: function() { console.log('[TelegramMock] WebApp.close() вызван'); },
          showPopup: function(params, callback) {
            console.log('[TelegramMock] WebApp.showPopup() вызван', params);
            if (callback) setTimeout(() => callback(), 500);
          },
          showAlert: function(message, callback) {
            console.log('[TelegramMock] WebApp.showAlert() вызван', message);
            if (callback) setTimeout(() => callback(), 500);
          },
          showConfirm: function(message, callback) {
            console.log('[TelegramMock] WebApp.showConfirm() вызван', message);
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
        color: '#2481cc',
        textColor: '#ffffff',
        
        show: function() { this.isVisible = true; console.log('[TelegramMock] MainButton.show() вызван'); },
        hide: function() { this.isVisible = false; console.log('[TelegramMock] MainButton.hide() вызван'); },
        enable: function() { this.isActive = true; console.log('[TelegramMock] MainButton.enable() вызван'); },
        disable: function() { this.isActive = false; console.log('[TelegramMock] MainButton.disable() вызван'); },
        setText: function(text) { this.text = text; console.log(`[TelegramMock] MainButton.setText(${text}) вызван`); },
        onClick: function(callback) {
          this._callback = callback;
          console.log('[TelegramMock] MainButton.onClick() зарегистрирован');
        },
        showProgress: function(leaveActive) {
          this.isProgressVisible = true;
          if (leaveActive !== undefined) this.isActive = !!leaveActive;
          console.log('[TelegramMock] MainButton.showProgress() вызван');
        },
        hideProgress: function() {
          this.isProgressVisible = false;
          console.log('[TelegramMock] MainButton.hideProgress() вызван');
        }
      };
      
      // Добавляем BackButton
      window.Telegram.WebApp.BackButton = {
        isVisible: false,
        
        show: function() { 
          this.isVisible = true; 
          console.log('[TelegramMock] BackButton.show() вызван'); 
        },
        hide: function() { 
          this.isVisible = false; 
          console.log('[TelegramMock] BackButton.hide() вызван'); 
        },
        onClick: function(callback) {
          this._callback = callback;
          console.log('[TelegramMock] BackButton.onClick() зарегистрирован');
        }
      };
      
      // Добавляем HapticFeedback
      window.Telegram.WebApp.HapticFeedback = {
        impactOccurred: function(style) { 
          console.log(`[TelegramMock] HapticFeedback.impactOccurred(${style}) вызван`);
        },
        notificationOccurred: function(type) { 
          console.log(`[TelegramMock] HapticFeedback.notificationOccurred(${type}) вызван`);
        },
        selectionChanged: function() {
          console.log('[TelegramMock] HapticFeedback.selectionChanged() вызван');
        }
      };
      
      console.log('[TEST] Создана базовая эмуляция Telegram WebApp API');
      
      // Отслеживаем ошибки в консоли
      window.errorMessages = [];
      window.addEventListener('error', (e) => {
        window.errorMessages.push(e.message);
        console.error('[ERROR]', e.message);
      });
      
      // Запускаем инициализацию WebApp
      window.Telegram.WebApp.ready();
    });
    
    // Делаем небольшую паузу, чтобы приложение успело инициализироваться
    await page.waitForTimeout(1000);
    
    // Делаем скриншот начального состояния
    const initialScreenshot = `telegram-e2e-initial-${Date.now()}.png`;
    await page.screenshot({ path: join(config.screenshotDir, initialScreenshot), fullPage: true });
    testReport.screenshots.push({ name: initialScreenshot, description: 'Начальное состояние приложения' });
    
    // Шаг 5: Ожидание полной загрузки приложения
    testReport.steps.push({ 
      step: 5, 
      description: 'Ожидание полной загрузки приложения',
      timestamp: new Date().toISOString()
    });
    
    // Отладка импортов скриптов
    const importIssues = await page.evaluate(() => {
      const importErrors = [];
      // Проверяем, какие модули успешно загружены
      const scripts = document.querySelectorAll('script[type="module"]');
      const scriptUrls = Array.from(scripts).map(s => s.src);
      
      return {
        scriptUrls: scriptUrls,
        errorMessages: window.errorMessages || []
      };
    });
    
    console.log('Загруженные скрипты:', importIssues.scriptUrls);
    console.log('Ошибки импортов:', importIssues.errorMessages);
    
    // Делаем скриншот текущего состояния
    const debugScreenshot = `telegram-e2e-debug-${Date.now()}.png`;
    await page.screenshot({ path: join(config.screenshotDir, debugScreenshot), fullPage: true });
    testReport.screenshots.push({ name: debugScreenshot, description: 'Отладочный скриншот состояния страницы' });
    
    // Завершаем тест здесь, чтобы найти причину проблемы
    console.log('Тест завершен на этапе диагностики проблем импорта');
    testReport.success = false;  // Помечаем тест как неудачный, т.к. это диагностический режим
    testReport.endTime = new Date().toISOString();
    
    // Завершаем функцию, чтобы избежать дальнейших ошибок
    return;
  } catch (error) {
    // Записываем ошибку в отчет
    testReport.errors.push({ 
      type: 'testError', 
      message: error.message, 
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    testReport.endTime = new Date().toISOString();
    testReport.success = false;
    
    console.error('Критическая ошибка при выполнении теста:', error);
    
    // Делаем скриншот при ошибке
    try {
      const errorScreenshot = `telegram-e2e-error-${Date.now()}.png`;
      const page = (await browser.pages())[0];
      await page.screenshot({ path: join(config.screenshotDir, errorScreenshot), fullPage: true });
      testReport.screenshots.push({ name: errorScreenshot, description: 'Скриншот при критической ошибке' });
    } catch (screenshotError) {
      console.error('Не удалось сделать скриншот при ошибке:', screenshotError);
    }
  } finally {
    // Сохраняем отчет в файл
    const reportFile = join(config.reportDir, `telegram-e2e-report-${Date.now()}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(testReport, null, 2));
    console.log(`Отчет о тесте сохранен в ${reportFile}`);
    
    // Закрываем браузер
    await browser.close();
    
    // Формируем краткую сводку
    const duration = new Date(testReport.endTime) - new Date(testReport.startTime);
    const summary = {
      success: testReport.success,
      duration: `${Math.floor(duration / 1000)} секунд`,
      errors: testReport.errors.length,
      warnings: testReport.warnings.length,
      steps: testReport.steps.length,
      screenshots: testReport.screenshots.length,
      forcedElementsShown: testReport.forcedElements ? 
        testReport.forcedElements.screens.shown + 
        testReport.forcedElements.buttons.shown + 
        testReport.forcedElements.dialogs.shown : 0
    };
    
    // Сохраняем краткую сводку
    const summaryFile = join(config.reportDir, `telegram-e2e-summary-${Date.now()}.json`);
    fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
    
    console.log('Сводка теста:', JSON.stringify(summary, null, 2));
    
    // Возвращаем статус теста
    return testReport.success;
  }
}

// Запускаем тест и обрабатываем результат
runTelegramE2ETest()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Критическая ошибка при выполнении теста:', error);
    process.exit(1);
  }); 