/**
 * Профессиональный E2E тест для тестирования Telegram mini-app
 * Основан на Page Object Pattern и лучших практиках E2E тестирования
 */

console.log('Загрузка файла e2e-professional.js...');

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

console.log('Импорты успешно загружены');

// Получаем текущую директорию в ES модулях
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Путь к текущей директории:', __dirname);

// Константы настроек
const CONFIG = {
  app: {
    url: 'https://first-bot-production.up.railway.app',
    timeouts: {
      navigation: 60000,
      element: 15000,
      animation: 1000,
      interaction: 2000,
      rendering: 3000,
    }
  },
  browser: {
    headless: false, // Изменить на true для запуска без UI
    viewport: {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      isMobile: true,
    },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process'
    ]
  },
  test: {
    screenshotsDir: './test-screenshots',
    telegram: {
      initData: `query_id=AAHdF6IQAAAAAN0XohDhrOrc&user=%7B%22id%22%3A377381733%2C%22first_name%22%3A%22Test%22%2C%22last_name%22%3A%22User%22%2C%22username%22%3A%22testuser%22%2C%22language_code%22%3A%22en%22%7D&auth_date=${Math.floor(Date.now() / 1000)}&hash=b5d4aa648c32b6a560f5331339d5c013751689b32f55a2f78f56ba0f3b881bcb`,
      user: {
        id: 377381733,
        first_name: "Test",
        last_name: "User",
        username: "testuser"
      }
    }
  }
};

// Утилиты
class TestUtils {
  static async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  static getTimestampedFilename(name) {
    return `${name}_${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
  }

  static extractTextContent(element) {
    return element ? element.textContent.trim() : null;
  }
}

// Класс отчетов
class TestReport {
  constructor() {
    this.steps = [];
    this.errors = [];
    this.warnings = [];
    this.screenshots = [];
    this.consoleMessages = [];
    this.startTime = Date.now();
  }

  addStep(description, status = 'info') {
    const step = {
      step: this.steps.length + 1,
      description,
      status,
      timestamp: new Date().toISOString()
    };
    this.steps.push(step);
    console.log(`[${status.toUpperCase()}] Step ${step.step}: ${description}`);
    return step;
  }

  addScreenshot(path) {
    this.screenshots.push({
      path,
      timestamp: new Date().toISOString(),
      step: this.steps.length
    });
  }

  addConsoleMessage(message) {
    this.consoleMessages.push({
      message,
      timestamp: new Date().toISOString()
    });
  }

  addError(error) {
    this.errors.push({
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      step: this.steps.length
    });
    console.error(`[ERROR] ${error.message}`);
  }

  addWarning(message) {
    this.warnings.push({
      message,
      timestamp: new Date().toISOString(),
      step: this.steps.length
    });
    console.warn(`[WARNING] ${message}`);
  }

  summary() {
    const duration = Date.now() - this.startTime;
    return {
      duration: `${(duration / 1000).toFixed(2)} seconds`,
      stepsCompleted: this.steps.length,
      errors: this.errors.length,
      warnings: this.warnings.length,
      screenshots: this.screenshots.length,
      success: this.errors.length === 0
    };
  }

  save(filename = 'test-report.json') {
    const report = {
      summary: this.summary(),
      steps: this.steps,
      errors: this.errors,
      warnings: this.warnings,
      screenshots: this.screenshots,
      consoleMessages: this.consoleMessages
    };

    fs.writeFileSync(filename, JSON.stringify(report, null, 2));
    console.log(`Report saved to ${filename}`);
  }
}

// Page Objects
class MainPage {
  constructor(page, report) {
    this.page = page;
    this.report = report;
  }

  async takeScreenshot(name) {
    const screenshotDir = CONFIG.test.screenshotsDir;
    TestUtils.ensureDirectoryExists(screenshotDir);
    
    const filename = TestUtils.getTimestampedFilename(name);
    const filepath = path.join(screenshotDir, filename);
    
    await this.page.screenshot({ path: filepath, fullPage: true });
    this.report.addScreenshot(filepath);
    this.report.addStep(`Скриншот сохранен: ${filename}`, 'info');
    return filepath;
  }

  async getVisibleButtons() {
    return this.page.evaluate(() => {
      return Array.from(document.querySelectorAll('button'))
        .filter(btn => btn.offsetParent !== null) // только видимые кнопки
        .map(btn => ({
          text: btn.innerText.trim(),
          id: btn.id,
          classes: btn.className,
          rect: btn.getBoundingClientRect()
        }));
    });
  }

  async getPageState() {
    return this.page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        h1: Array.from(document.querySelectorAll('h1'))
          .map(h => h.innerText.trim()),
        texts: Array.from(document.querySelectorAll('p, h1, h2, h3, h4, button'))
          .filter(el => el.offsetParent !== null)
          .map(el => el.innerText.trim())
          .filter(txt => txt.length > 0),
        buttons: Array.from(document.querySelectorAll('button'))
          .filter(btn => btn.offsetParent !== null)
          .map(btn => btn.innerText.trim()),
        inputs: Array.from(document.querySelectorAll('input, textarea'))
          .filter(inp => inp.offsetParent !== null)
          .map(inp => ({
            type: inp.type,
            id: inp.id,
            placeholder: inp.placeholder
          }))
      };
    });
  }

  async logDomChanges() {
    await this.page.evaluate(() => {
      if (window._domObserver) return; // Если наблюдатель уже есть
      
      window._domChanges = [];
      window._domObserver = new MutationObserver(mutations => {
        for (const mutation of mutations) {
          window._domChanges.push({
            type: mutation.type,
            target: mutation.target.tagName,
            timestamp: new Date().toISOString(),
            addedNodes: mutation.addedNodes.length,
            removedNodes: mutation.removedNodes.length
          });
        }
        
        console.log(`DOM changed: ${mutations.length} mutations`);
      });
      
      window._domObserver.observe(document.body, { 
        childList: true, 
        attributes: true,
        subtree: true 
      });
      
      console.log('DOM observer started');
    });
  }

  async injectTelegramMock() {
    const telegramUser = CONFIG.test.telegram.user;
    const telegramInitData = CONFIG.test.telegram.initData;
    
    this.report.addStep(`Инжектирование мока Telegram WebApp API с пользователем ID: ${telegramUser.id}`, 'info');
    
    return this.page.evaluate((user, initData) => {
      if (window.Telegram) {
        console.log('Telegram WebApp объект уже существует.');
        return false;
      }

      window.Telegram = {
        WebApp: {
          initData: initData,
          initDataUnsafe: {
            user: user
          },
          ready: () => console.log('Telegram.WebApp.ready called'),
          expand: () => console.log('Telegram.WebApp.expand called'),
          close: () => console.log('Telegram.WebApp.close called'),
          isExpanded: true,
          viewportHeight: window.innerHeight,
          viewportStableHeight: window.innerHeight,
          MainButton: {
            text: '',
            isVisible: false,
            show: function() { this.isVisible = true; console.log('MainButton.show called'); },
            hide: function() { this.isVisible = false; console.log('MainButton.hide called'); },
            setText: function(text) { this.text = text; console.log('MainButton.setText called with:', text); }
          }
        }
      };
      
      console.log('Telegram WebApp API успешно сэмулирован');
      
      // Генерируем событие для приложения, чтобы оно знало, что Telegram API готов
      const readyEvent = new Event('telegram:ready');
      window.dispatchEvent(readyEvent);
      
      return true;
    }, telegramUser, telegramInitData);
  }

  async clickButtonByText(buttonText) {
    this.report.addStep(`Поиск и клик по кнопке "${buttonText}"`, 'info');
    
    const result = await this.page.evaluate((text) => {
      // Ищем точное совпадение
      let button = Array.from(document.querySelectorAll('button'))
        .find(btn => btn.innerText.trim() === text && btn.offsetParent !== null);
      
      // Если не найдено, ищем частичное совпадение
      if (!button) {
        button = Array.from(document.querySelectorAll('button'))
          .find(btn => btn.innerText.includes(text) && btn.offsetParent !== null);
      }
      
      if (button) {
        console.log(`Найдена кнопка с текстом "${text}"`);
        
        try {
          button.click();
          console.log(`Клик по кнопке "${text}" выполнен`);
          return { clicked: true, buttonText: button.innerText.trim() };
        } catch (e) {
          console.error(`Ошибка при клике по кнопке "${text}": ${e.message}`);
          return { clicked: false, error: e.message };
        }
      } else {
        console.warn(`Кнопка с текстом "${text}" не найдена`);
        return { clicked: false, error: 'Button not found' };
      }
    }, buttonText);
    
    if (result.clicked) {
      this.report.addStep(`Кнопка "${result.buttonText}" успешно нажата`, 'success');
      await TestUtils.delay(CONFIG.app.timeouts.interaction);
    } else {
      this.report.addWarning(`Не удалось нажать кнопку "${buttonText}": ${result.error}`);
    }
    
    return result.clicked;
  }

  async findAndClickAnyInteractiveElement() {
    this.report.addStep('Поиск любого интерактивного элемента для взаимодействия', 'info');
    
    const result = await this.page.evaluate(() => {
      // Приоритетные элементы для клика
      const selectors = [
        'button:not([disabled])',
        'a[href]',
        '.button',
        '.btn',
        '[role="button"]',
        '[onclick]',
        '.clickable'
      ];
      
      for (const selector of selectors) {
        const elements = Array.from(document.querySelectorAll(selector))
          .filter(el => el.offsetParent !== null); // только видимые
          
        if (elements.length > 0) {
          const element = elements[0];
          const text = element.innerText.trim();
          const elementType = element.tagName.toLowerCase();
          
          try {
            element.click();
            return { 
              clicked: true, 
              element: elementType,
              text: text || '[No text]'
            };
          } catch (e) {
            console.error(`Ошибка при клике по ${elementType}: ${e.message}`);
          }
        }
      }
      
      return { clicked: false, error: 'No interactive elements found' };
    });
    
    if (result.clicked) {
      this.report.addStep(`Элемент <${result.element}> "${result.text}" успешно нажат`, 'success');
      await TestUtils.delay(CONFIG.app.timeouts.interaction);
    } else {
      this.report.addWarning('Не найдено интерактивных элементов для взаимодействия');
    }
    
    return result.clicked;
  }
}

// Основной класс теста
class TelegramAppTest {
  constructor() {
    this.browser = null;
    this.page = null;
    this.report = new TestReport();
    TestUtils.ensureDirectoryExists(CONFIG.test.screenshotsDir);
  }
  
  async setup() {
    this.report.addStep('Запуск браузера', 'setup');
    try {
      this.browser = await puppeteer.launch({
        headless: CONFIG.browser.headless,
        args: CONFIG.browser.args,
        defaultViewport: CONFIG.browser.viewport
      });
      
      this.page = await this.browser.newPage();
      this.mainPage = new MainPage(this.page, this.report);
      
      // Настройка обработчиков событий консоли и ошибок
      this.page.on('console', message => {
        this.report.addConsoleMessage({
          type: message.type(),
          text: message.text()
        });
        if (message.type() === 'error') {
          this.report.addWarning(`Console error: ${message.text()}`);
        }
      });
      
      this.page.on('pageerror', error => {
        this.report.addError(error);
      });
      
      this.page.on('requestfailed', request => {
        this.report.addWarning(`Failed request: ${request.url()}`);
      });
      
      // Увеличиваем таймауты для стабильности
      this.page.setDefaultTimeout(CONFIG.app.timeouts.element);
      this.page.setDefaultNavigationTimeout(CONFIG.app.timeouts.navigation);
      
      // Смотрим за изменениями в DOM
      await this.mainPage.logDomChanges();
      
      return true;
    } catch (error) {
      this.report.addError(error);
      return false;
    }
  }
  
  async navigateToApp() {
    this.report.addStep(`Переход на страницу приложения: ${CONFIG.app.url}`, 'navigation');
    try {
      await this.page.goto(CONFIG.app.url, { 
        waitUntil: 'networkidle2',
        timeout: CONFIG.app.timeouts.navigation
      });
      
      this.report.addStep('Страница приложения загружена', 'success');
      await TestUtils.delay(CONFIG.app.timeouts.rendering);
      
      await this.mainPage.takeScreenshot('initial-app-load');
      
      return true;
    } catch (error) {
      this.report.addError(error);
      return false;
    }
  }
  
  async injectTelegramMock() {
    this.report.addStep('Инъекция мока Telegram WebApp API', 'inject');
    try {
      const success = await this.mainPage.injectTelegramMock();
      if (success) {
        this.report.addStep('Telegram WebApp API успешно эмулирован', 'success');
      } else {
        this.report.addWarning('Telegram WebApp API уже существует или не может быть эмулирован');
      }
      
      await TestUtils.delay(CONFIG.app.timeouts.rendering);
      return success;
    } catch (error) {
      this.report.addError(error);
      return false;
    }
  }
  
  async analyzeInitialState() {
    this.report.addStep('Анализ начального состояния приложения', 'analysis');
    try {
      const buttons = await this.mainPage.getVisibleButtons();
      this.report.addStep(`Найдено ${buttons.length} видимых кнопок на странице`, 'info');
      
      if (buttons.length > 0) {
        buttons.forEach((btn, index) => {
          this.report.addStep(`Кнопка ${index + 1}: "${btn.text}"`, 'info');
        });
      }
      
      const state = await this.mainPage.getPageState();
      this.report.addStep(`Текущее состояние страницы: URL=${state.url}, Заголовок=${state.title}`, 'info');
      
      // Проверка наличия ключевых элементов игры
      const hasGameElements = state.texts.some(text => 
        text.includes('НАЧАТЬ РАССЛЕДОВАНИЕ') || 
        text.includes('ОБУЧЕНИЕ') ||
        text.includes('Криминальный Блеф'));
      
      if (hasGameElements) {
        this.report.addStep('Обнаружены элементы главного экрана игры', 'success');
      } else {
        this.report.addWarning('Не обнаружены элементы главного экрана игры');
      }
      
      return true;
    } catch (error) {
      this.report.addError(error);
      return false;
    }
  }
  
  async interactWithApp() {
    this.report.addStep('Начало взаимодействия с приложением', 'interaction');
    try {
      // Шаг 1: Нажать на кнопку "ОБУЧЕНИЕ"
      this.report.addStep('Шаг 1: Нажатие на кнопку "ОБУЧЕНИЕ"', 'step');
      let clicked = await this.mainPage.clickButtonByText('ОБУЧЕНИЕ');
      
      if (!clicked) {
        this.report.addStep('Пробуем альтернативу: кнопка "НАЧАТЬ РАССЛЕДОВАНИЕ"', 'retry');
        clicked = await this.mainPage.clickButtonByText('НАЧАТЬ РАССЛЕДОВАНИЕ');
      }
      
      await this.mainPage.takeScreenshot('after-first-button');
      await TestUtils.delay(CONFIG.app.timeouts.rendering);
      
      // Дополнительное логирование для отладки туториала
      this.report.addStep('Проверка наличия туториала в DOM', 'debug');
      
      const tutorialInfo = await this.page.evaluate(() => {
        const tutorialOverlay = document.getElementById('tutorial-overlay');
        const tutorialSteps = document.querySelectorAll('.tutorial-step');
        
        return {
          overlayExists: !!tutorialOverlay,
          overlayDisplay: tutorialOverlay ? window.getComputedStyle(tutorialOverlay).display : 'not found',
          overlayClass: tutorialOverlay ? tutorialOverlay.className : 'not found',
          stepsCount: tutorialSteps.length,
          stepContents: Array.from(tutorialSteps).map(step => ({
            step: step.dataset.step,
            display: window.getComputedStyle(step).display,
            content: step.innerHTML.substring(0, 100) + '...'
          })),
          elementsWithDaleeText: Array.from(document.querySelectorAll('button')).filter(btn => 
            btn.innerText.includes('Далее') || 
            btn.innerText.includes('Пропустить')).length
        };
      });
      
      // Логируем результаты
      this.report.addStep(`Результаты проверки туториала: overlay=${tutorialInfo.overlayExists ? 'found' : 'not found'}, 
          display=${tutorialInfo.overlayDisplay}, stepsCount=${tutorialInfo.stepsCount}`, 'info');
      
      // Пытаемся найти любые кнопки или элементы туториала
      if (tutorialInfo.elementsWithDaleeText > 0) {
        this.report.addStep(`Найдено ${tutorialInfo.elementsWithDaleeText} элементов с текстом "Далее/Пропустить"`, 'success');
      } else {
        this.report.addWarning('Не найдено элементов с текстом "Далее/Пропустить"');
      }
      
      // Принудительно показываем туториал
      this.report.addStep('Попытка принудительно показать туториал', 'debug');
      await this.page.evaluate(() => {
        const tutorialOverlay = document.getElementById('tutorial-overlay');
        if (tutorialOverlay) {
          // Удаляем класс hidden
          tutorialOverlay.classList.remove('hidden');
          
          // Применяем встроенные стили для принудительного отображения
          tutorialOverlay.style.cssText = 'display: flex !important; z-index: 9999 !important; position: fixed !important; opacity: 1 !important; visibility: visible !important; top: 0; left: 0; width: 100%; height: 100%;';
          
          // Делаем видимым первый шаг
          const firstStep = document.querySelector('.tutorial-step[data-step="1"]');
          if (firstStep) {
            firstStep.style.display = 'block';
          }
          
          console.log('Туториал принудительно показан');
          return true;
        }
        return false;
      });
      
      // Делаем дополнительный скриншот
      await this.mainPage.takeScreenshot('after-tutorial-forced');
      
      // Проверяем состояние после первого клика
      const stateAfterClick = await this.mainPage.getPageState();
      this.report.addStep(`Состояние после клика: найдено ${stateAfterClick.buttons.length} кнопок`, 'info');
      
      // Шаг 2: Смотрим DOM-изменения после клика
      this.report.addStep('Шаг 2: Анализ DOM-изменений после клика', 'step');
      const domChanges = await this.page.evaluate(() => {
        return window._domChanges || [];
      });
      
      this.report.addStep(`Обнаружено ${domChanges.length} изменений в DOM`, 'info');
      
      // Проверяем наличие элементов обучения или игры
      const hasGameOrTutorial = stateAfterClick.texts.some(text => 
        text.includes('Далее') || 
        text.includes('Пропустить') ||
        text.includes('Вариант') ||
        text.includes('Играть') ||
        text.includes('Как играть'));
      
      if (hasGameOrTutorial) {
        this.report.addStep('Обнаружены элементы обучения или игры', 'success');
      } else {
        this.report.addWarning('Не обнаружены элементы обучения или игры после клика');
      }
      
      // Шаг 3: Попробуем найти и нажать на следующую интерактивную кнопку
      this.report.addStep('Шаг 3: Поиск следующего интерактивного элемента', 'step');
      
      // Приоритетные кнопки для нажатия
      const buttonPriorities = ['Далее', 'Начать игру', 'Пропустить', 'Вариант'];
      let secondInteraction = false;
      
      for (const buttonText of buttonPriorities) {
        this.report.addStep(`Пробуем найти кнопку "${buttonText}"`, 'info');
        secondInteraction = await this.mainPage.clickButtonByText(buttonText);
        
        if (secondInteraction) {
          this.report.addStep(`Кнопка "${buttonText}" найдена и нажата`, 'success');
          break;
        }
      }
      
      if (!secondInteraction) {
        this.report.addStep('Не найдено приоритетных кнопок, пробуем любой интерактивный элемент', 'retry');
        secondInteraction = await this.mainPage.findAndClickAnyInteractiveElement();
      }
      
      await this.mainPage.takeScreenshot('after-second-interaction');
      await TestUtils.delay(CONFIG.app.timeouts.rendering);
      
      // Финальная проверка состояния
      const finalState = await this.mainPage.getPageState();
      this.report.addStep(`Финальное состояние: URL=${finalState.url}`, 'info');
      
      // Делаем финальный скриншот
      await this.mainPage.takeScreenshot('final-state');
      
      return true;
    } catch (error) {
      this.report.addError(error);
      return false;
    }
  }
  
  async debugAppState() {
    this.report.addStep('Отладка состояния приложения', 'debug');
    try {
      // Дамп важной информации
      const debug = await this.page.evaluate(() => {
        return {
          // Базовая информация
          url: window.location.href,
          userAgent: navigator.userAgent,
          windowSize: {
            innerWidth: window.innerWidth,
            innerHeight: window.innerHeight,
            outerWidth: window.outerWidth,
            outerHeight: window.outerHeight
          },
          
          // История localStorage
          localStorage: Object.keys(localStorage).map(key => ({
            key,
            value: localStorage.getItem(key)
          })),
          
          // Извлекаем информацию о React/Vue/Angular если она есть
          frameworks: {
            hasReact: !!window.__REACT_DEVTOOLS_GLOBAL_HOOK__,
            hasVue: !!window.__VUE__ || !!window.__VUE_DEVTOOLS_GLOBAL_HOOK__,
            hasAngular: !!window.ng || !!window.angular,
            hasTelegram: !!window.Telegram
          },
          
          // Состояние кнопок и форм
          forms: Array.from(document.querySelectorAll('form')).length,
          buttons: Array.from(document.querySelectorAll('button')).length,
          visibleButtons: Array.from(document.querySelectorAll('button'))
            .filter(btn => btn.offsetParent !== null).length,
          
          // Текущая видимая область
          visibleText: Array.from(document.querySelectorAll('body *'))
            .filter(el => el.offsetParent !== null && el.innerText)
            .map(el => el.innerText.trim())
            .filter(text => text.length > 0)
            .slice(0, 20) // Ограничиваем количество
        };
      });
      
      this.report.addStep('Отладочная информация собрана', 'success');
      this.report.addStep(`Найдено ${debug.visibleButtons} видимых кнопок из ${debug.buttons} общих`, 'info');
      
      if (debug.frameworks.hasTelegram) {
        this.report.addStep('Объект Telegram WebApp обнаружен', 'success');
      } else {
        this.report.addWarning('Объект Telegram WebApp не обнаружен');
      }
      
      // Проверяем, используется ли iframe
      const hasIframes = await this.page.evaluate(() => {
        return document.querySelectorAll('iframe').length > 0;
      });
      
      if (hasIframes) {
        this.report.addStep('На странице обнаружены iframe элементы', 'info');
        
        // Получаем список iframe и их содержимое
        const iframeInfo = await this.page.evaluate(() => {
          return Array.from(document.querySelectorAll('iframe')).map(iframe => ({
            id: iframe.id,
            src: iframe.src,
            visible: iframe.offsetParent !== null
          }));
        });
        
        iframeInfo.forEach((iframe, i) => {
          this.report.addStep(`iframe ${i+1}: src=${iframe.src}, visible=${iframe.visible}`, 'info');
        });
      }
      
      return debug;
    } catch (error) {
      this.report.addError(error);
      return null;
    }
  }
  
  async teardown() {
    this.report.addStep('Завершение теста', 'teardown');
    try {
      if (this.browser) {
        await this.browser.close();
        this.report.addStep('Браузер закрыт', 'success');
      }
      return true;
    } catch (error) {
      this.report.addError(error);
      return false;
    }
  }
  
  async run() {
    this.report.addStep('Запуск профессионального E2E тестирования', 'start');
    
    try {
      await this.setup();
      await this.navigateToApp();
      await this.injectTelegramMock();
      await this.analyzeInitialState();
      await this.interactWithApp();
      await this.debugAppState();
      
      const summary = this.report.summary();
      this.report.addStep(`Тестирование завершено. Длительность: ${summary.duration}`, 'end');
      
      if (summary.success) {
        this.report.addStep('Тест успешно пройден без ошибок', 'success');
      } else {
        this.report.addStep(`Тест завершен с ошибками: ${summary.errors}`, 'error');
      }
      
      this.report.save('e2e-test-report.json');
    } catch (error) {
      this.report.addError(error);
    } finally {
      await this.teardown();
    }
    
    return this.report.summary();
  }
}

// Запускаем тест
async function runProfessionalE2ETest() {
  console.log('=================================================');
  console.log('НАЧАЛО ПРОФЕССИОНАЛЬНОГО E2E ТЕСТИРОВАНИЯ');
  console.log('=================================================');
  
  const test = new TelegramAppTest();
  
  try {
    const result = await test.run();
    
    console.log('\n=================================================');
    console.log('РЕЗУЛЬТАТЫ ПРОФЕССИОНАЛЬНОГО E2E ТЕСТИРОВАНИЯ:');
    console.log(`- Длительность: ${result.duration}`);
    console.log(`- Пройденные шаги: ${result.stepsCompleted}`);
    console.log(`- Ошибки: ${result.errors}`);
    console.log(`- Предупреждения: ${result.warnings}`);
    console.log(`- Сделано скриншотов: ${result.screenshots}`);
    console.log(`- Общий результат: ${result.success ? '✅ УСПЕХ' : '❌ ОШИБКА'}`);
    console.log('=================================================');
    
    // Сохраняем результаты теста в файл
    const reportFile = 'e2e-test-results.json';
    fs.writeFileSync(reportFile, JSON.stringify(result, null, 2));
    console.log(`Результаты теста сохранены в ${reportFile}`);
    
    return result.success;
  } catch (error) {
    console.error('КРИТИЧЕСКАЯ ОШИБКА при запуске теста:', error);
    return false;
  }
}

// Экспортируем функцию для использования в других модулях
export { runProfessionalE2ETest };

// Запускаем напрямую, без проверки условия
console.log('Запускаем тест напрямую...');
runProfessionalE2ETest()
  .then(result => {
    console.log('Тест завершен с результатом:', result);
  })
  .catch(error => {
    console.error('Ошибка при запуске теста:', error);
  }); 