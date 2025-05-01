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
    url: 'https://web-production-43380.up.railway.app/',
    timeouts: {
      navigation: 60000,
      element: 15000,
      animation: 1000,
      interaction: 2000,
      rendering: 3000,
    },
    uiVersion: 'new', // 'new' или 'old' - выбор версии интерфейса для тестирования
    forceMobile: true  // Принудительно использовать мобильный user-agent
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
        h2: Array.from(document.querySelectorAll('h2'))
          .map(h => h.innerText.trim()),
        h3: Array.from(document.querySelectorAll('h3'))
          .map(h => h.innerText.trim()),
        texts: Array.from(document.querySelectorAll('p, h1, h2, h3, h4, button, label, div, span'))
          .filter(el => {
            // Только видимые элементы с текстом
            const isVisible = el.offsetParent !== null;
            const hasText = el.innerText && el.innerText.trim().length > 0;
            const isSmall = el.innerText && el.innerText.trim().length < 100; // Игнорируем слишком длинные тексты
            return isVisible && hasText && isSmall;
          })
          .map(el => el.innerText.trim())
          .filter((txt, idx, arr) => arr.indexOf(txt) === idx), // Удаляем дубликаты
        buttons: Array.from(document.querySelectorAll('button, .button, [role="button"]'))
          .filter(btn => btn.offsetParent !== null)
          .map(btn => btn.innerText.trim())
          .filter(txt => txt.length > 0),
        // Навигационные элементы (нижнее меню)
        navigationItems: Array.from(document.querySelectorAll('nav a, footer a, .navigation a, .bottom-menu a, .tab'))
          .filter(nav => nav.offsetParent !== null)
          .map(nav => {
            const text = nav.innerText.trim() || nav.getAttribute('aria-label') || nav.title || '';
            const icon = nav.querySelector('img, svg, i');
            const iconAlt = icon ? (icon.getAttribute('alt') || icon.getAttribute('title') || '') : '';
            return {
              text: text,
              iconAlt: iconAlt,
              isActive: nav.classList.contains('active') || nav.getAttribute('aria-selected') === 'true',
              href: nav.href || ''
            };
          }),
        inputs: Array.from(document.querySelectorAll('input, textarea, select'))
          .filter(inp => inp.offsetParent !== null)
          .map(inp => ({
            type: inp.type,
            id: inp.id,
            name: inp.name,
            placeholder: inp.placeholder,
            value: inp.value
          })),
        // Дополнительная информация
        images: Array.from(document.querySelectorAll('img'))
          .filter(img => img.offsetParent !== null)
          .map(img => ({
            src: img.src,
            alt: img.alt,
            width: img.width,
            height: img.height
          })),
        // Идентификация страницы по характерным элементам
        pageIdentifiers: {
          isMainMenu: !!document.querySelector('.main-menu, header h1, [data-page="main"]'),
          isCasePage: !!document.querySelector('.case, .story, [data-page="case"]'),
          isProfilePage: !!document.querySelector('.profile, [data-page="profile"]'),
          isLeaderboardPage: !!document.querySelector('.leaderboard, [data-page="leaderboard"]')
        },
        classes: [...new Set(
          Array.from(document.querySelectorAll('*'))
            .filter(el => el.className && typeof el.className === 'string')
            .flatMap(el => el.className.split(' '))
            .filter(cls => cls.length > 0)
        )].slice(0, 20) // Берем только первые 20 уникальных классов
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
        
        // Проверим структуру существующего объекта и исправим её при необходимости
        if (!window.Telegram.WebApp) {
          console.log('Создаём WebApp в существующем объекте Telegram');
          window.Telegram.WebApp = {};
        }
        
        // Обновляем данные пользователя
        window.Telegram.WebApp.initData = initData;
        window.Telegram.WebApp.initDataUnsafe = {
          user: user
        };
        
        // Добавляем методы, если их нет
        if (!window.Telegram.WebApp.ready) {
          window.Telegram.WebApp.ready = () => console.log('Telegram.WebApp.ready called');
        }
        if (!window.Telegram.WebApp.expand) {
          window.Telegram.WebApp.expand = () => console.log('Telegram.WebApp.expand called');
        }
        if (!window.Telegram.WebApp.close) {
          window.Telegram.WebApp.close = () => console.log('Telegram.WebApp.close called');
        }
        
        // Проверяем и создаём MainButton, если его нет
        if (!window.Telegram.WebApp.MainButton) {
          window.Telegram.WebApp.MainButton = {
            text: '',
            isVisible: false,
            show: function() { this.isVisible = true; console.log('MainButton.show called'); },
            hide: function() { this.isVisible = false; console.log('MainButton.hide called'); },
            setText: function(text) { this.text = text; console.log('MainButton.setText called with:', text); }
          };
        }
        
        console.log('Telegram WebApp API обновлен');
        return true;
      }

      // Если объект Telegram не существует, создаём его полностью
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
          },
          // Добавляем BackButton
          BackButton: {
            isVisible: false,
            show: function() { this.isVisible = true; console.log('BackButton.show called'); },
            hide: function() { this.isVisible = false; console.log('BackButton.hide called'); }
          },
          // Добавляем HapticFeedback
          HapticFeedback: {
            impactOccurred: (style) => console.log(`HapticFeedback.impactOccurred called with: ${style}`),
            notificationOccurred: (type) => console.log(`HapticFeedback.notificationOccurred called with: ${type}`),
            selectionChanged: () => console.log('HapticFeedback.selectionChanged called')
          }
        }
      };
      
      console.log('Telegram WebApp API успешно сэмулирован');
      
      // Генерируем событие для приложения, чтобы оно знало, что Telegram API готов
      const readyEvent = new Event('telegram:ready');
      window.dispatchEvent(readyEvent);
      
      // Также вызываем window.TelegramWebviewProxy метод, если он существует
      if (window.TelegramWebviewProxy && window.TelegramWebviewProxy.postEvent) {
        try {
          window.TelegramWebviewProxy.postEvent('web_app_ready', '{}');
          console.log('Вызван TelegramWebviewProxy.postEvent("web_app_ready")');
        } catch (e) {
          console.error('Ошибка при вызове TelegramWebviewProxy.postEvent:', e);
        }
      }
      
      return true;
    }, telegramUser, telegramInitData);
  }

  async clickButtonByText(buttonText) {
    this.report.addStep(`Поиск и клик по кнопке "${buttonText}"`, 'info');
    
    const result = await this.page.evaluate((text) => {
      // Расширенный селектор - включает все кликабельные элементы
      const selector = 'button, .button, [role="button"], a, .btn, nav a, .menu-item, .tab, [onclick], .clickable';
      
      // Ищем точное совпадение
      let element = Array.from(document.querySelectorAll(selector))
        .find(el => {
          const visible = el.offsetParent !== null;
          const hasExactText = el.innerText.trim() === text;
          return visible && hasExactText;
        });
      
      // Если не найдено, ищем элемент, содержащий текст
      if (!element) {
        element = Array.from(document.querySelectorAll(selector))
          .find(el => {
            const visible = el.offsetParent !== null;
            const containsText = el.innerText.trim().includes(text);
            return visible && containsText;
          });
      }
      
      // Ищем по атрибутам
      if (!element) {
        element = Array.from(document.querySelectorAll(selector))
          .find(el => {
            const visible = el.offsetParent !== null;
            const matchesAttribute = 
              el.getAttribute('value') === text || 
              el.getAttribute('aria-label') === text ||
              el.getAttribute('title') === text || 
              el.getAttribute('data-text') === text ||
              el.getAttribute('name') === text;
            return visible && matchesAttribute;
          });
      }
      
      // Ищем элемент с изображением и текстом в подписи или со скрытым текстом
      if (!element) {
        const navItems = Array.from(document.querySelectorAll('nav a, footer a, .navigation a, .menu a'))
          .filter(el => el.offsetParent !== null);
          
        for (const navItem of navItems) {
          // Проверяем текст навигационного элемента (может быть скрыт в подэлементе)
          const navItemText = navItem.innerText.trim() || 
                            navItem.querySelector('.label')?.innerText.trim() || 
                            navItem.getAttribute('aria-label') || 
                            navItem.title || 
                            '';
                            
          if (navItemText.includes(text)) {
            element = navItem;
            break;
          }
          
          // Проверяем иконки с атрибутами alt и title
          const icon = navItem.querySelector('img, svg');
          if (icon) {
            const iconText = icon.getAttribute('alt') || icon.getAttribute('title') || '';
            if (iconText.includes(text)) {
              element = navItem;
              break;
            }
          }
        }
      }
      
      if (element) {
        console.log(`Найден элемент с текстом "${text}": ${element.tagName}`);
        
        try {
          // Скроллим к элементу
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          // Сначала пробуем естественный клик
          element.click();
          console.log(`Клик по элементу "${text}" выполнен`);
          
          // Получаем текст элемента для отчета
          const elementText = element.innerText.trim() || element.value || element.getAttribute('aria-label') || element.title || text;
          
          return { 
            clicked: true, 
            buttonText: elementText, 
            elementType: element.tagName.toLowerCase()
          };
        } catch (e) {
          // Если обычный клик не работает, пробуем создать и диспатчить событие клика
          try {
            console.log(`Попытка альтернативного клика по элементу "${text}"`);
            const clickEvent = new MouseEvent('click', {
              bubbles: true,
              cancelable: true,
              view: window
            });
            element.dispatchEvent(clickEvent);
            
            // Если элемент - ссылка, пробуем также программно перейти по ней
            if (element.tagName.toLowerCase() === 'a' && element.href) {
              console.log(`Программный переход по ссылке: ${element.href}`);
              window.location.href = element.href;
            }
            
            const elementText = element.innerText.trim() || element.value || element.getAttribute('aria-label') || element.title || text;
            
            return { 
              clicked: true, 
              buttonText: elementText, 
              elementType: element.tagName.toLowerCase(),
              alternate: true 
            };
          } catch (err) {
            console.error(`Ошибка при альтернативном клике по элементу "${text}": ${err.message}`);
            return { clicked: false, error: err.message };
          }
        }
      } else {
        console.warn(`Элемент с текстом "${text}" не найден`);
        return { clicked: false, error: 'Element not found' };
      }
    }, buttonText);
    
    if (result.clicked) {
      if (result.alternate) {
        this.report.addStep(`Элемент <${result.elementType}> "${result.buttonText}" успешно нажат (альтернативным способом)`, 'success');
      } else {
        this.report.addStep(`Элемент <${result.elementType}> "${result.buttonText}" успешно нажат`, 'success');
      }
      await TestUtils.delay(CONFIG.app.timeouts.interaction);
    } else {
      this.report.addWarning(`Не удалось найти и нажать элемент "${buttonText}": ${result.error}`);
    }
    
    return result.clicked;
  }

  async findAndClickAnyInteractiveElement() {
    this.report.addStep('Поиск любого интерактивного элемента для взаимодействия', 'info');
    
    const result = await this.page.evaluate(() => {
      // Приоритетные элементы для клика, адаптированные для нового интерфейса
      const selectors = [
        // Основные кнопки действий
        'button.primary, .primary-button, .main-button',
        'button:not([disabled])',
        
        // Ссылки и навигация
        'nav a, footer a, .tab',
        'a[href]',
        
        // Специфичные элементы интерфейса
        '.action-button, .card, .case-card, .item-card',
        '.button, .btn, .clickable',
        '[role="button"]',
        '[onclick]',
        
        // Любые интерактивные элементы
        '.menu-item, .tab-item, .list-item',
        'input[type="button"], input[type="submit"]'
      ];
      
      // Последовательный перебор селекторов с возвратом первого видимого элемента
      for (const selector of selectors) {
        const elements = Array.from(document.querySelectorAll(selector))
          .filter(el => {
            // Проверяем, что элемент видим и имеет достаточные размеры для взаимодействия
            const visible = el.offsetParent !== null;
            const hasSize = el.offsetWidth > 10 && el.offsetHeight > 10;
            return visible && hasSize;
          });
          
        if (elements.length > 0) {
          // Пробуем сначала найти элементы с текстом
          const elementsWithText = elements.filter(el => el.innerText.trim().length > 0);
          const element = elementsWithText.length > 0 ? elementsWithText[0] : elements[0];
          
          const text = element.innerText.trim() || 
                       element.value || 
                       element.getAttribute('aria-label') || 
                       element.title || 
                       element.getAttribute('data-text') || 
                       `[${element.tagName}]`;
                       
          const elementType = element.tagName.toLowerCase();
          
          try {
            // Скроллим к элементу и кликаем
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.click();
            
            return { 
              clicked: true, 
              element: elementType,
              text: text,
              selector
            };
          } catch (e) {
            console.error(`Ошибка при клике по ${elementType}: ${e.message}`);
            // Пробуем альтернативный клик через событие
            try {
              const clickEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
              });
              element.dispatchEvent(clickEvent);
              
              return { 
                clicked: true, 
                element: elementType,
                text: text,
                selector,
                alternate: true
              };
            } catch (err) {
              console.error(`Ошибка при альтернативном клике: ${err.message}`);
            }
          }
        }
      }
      
      return { clicked: false, error: 'No interactive elements found' };
    });
    
    if (result.clicked) {
      if (result.alternate) {
        this.report.addStep(`Элемент <${result.element}> "${result.text}" успешно нажат (альтернативно)`, 'success');
      } else {
        this.report.addStep(`Элемент <${result.element}> "${result.text}" успешно нажат`, 'success');
      }
      this.report.addStep(`Селектор: ${result.selector}`, 'info');
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
      
      // Установка мобильного User-Agent, если включена опция
      if (CONFIG.app.forceMobile) {
        const mobileUserAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1';
        await this.page.setUserAgent(mobileUserAgent);
        this.report.addStep('Установлен мобильный User-Agent', 'info');
      }
      
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
    // Формируем URL с параметрами версии интерфейса, если указана 'new'
    let appUrl = CONFIG.app.url;
    if (CONFIG.app.uiVersion === 'new') {
      // Добавляем параметр для принудительного использования нового интерфейса
      const separator = appUrl.includes('?') ? '&' : '?';
      appUrl += `${separator}ui=new&v=2`;
    }
    
    this.report.addStep(`Переход на страницу приложения: ${appUrl}`, 'navigation');
    try {
      await this.page.goto(appUrl, { 
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
      
      // Проверка наличия ключевых элементов игры - обновленный список для нового дизайна
      const gameKeywords = [
        'НАЧАТЬ РАССЛЕДОВАНИЕ', 'ЛИЧНОЕ ДЕЛО', 'УПРАВЛЕНИЕ КАДРОВ',
        'ГЛАВНАЯ', 'АРХИВ', 'ДЕЛА', 'ДОСЬЕ', 'РЕЙТИНГ',
        'Криминальный Блеф', 'КРИМИНАЛЬНЫЙ БЛЕФ'
      ];
      
      const foundKeywords = gameKeywords.filter(keyword => 
        state.texts.some(text => text.includes(keyword))
      );
      
      if (foundKeywords.length > 0) {
        this.report.addStep(`Обнаружены элементы игры: ${foundKeywords.join(', ')}`, 'success');
      } else {
        this.report.addWarning('Не обнаружены характерные элементы игры');
        
        // Выводим первые 5 текстовых элементов для отладки
        if (state.texts.length > 0) {
          this.report.addStep('Найденные текстовые элементы:', 'info');
          state.texts.slice(0, 5).forEach((text, idx) => {
            this.report.addStep(`Текст ${idx+1}: "${text}"`, 'info');
          });
        }
      }
      
      // Проверка наличия элементов нижнего меню
      const hasBottomMenu = await this.page.evaluate(() => {
        // Проверяем наличие элементов нижнего меню
        const menuItems = Array.from(document.querySelectorAll('nav a, .bottom-menu a, .navigation a, footer a'))
          .filter(el => el.offsetParent !== null)
          .map(el => ({
            text: el.innerText.trim(),
            hasIcon: el.querySelector('img, svg, i') !== null
          }));
          
        return {
          count: menuItems.length,
          items: menuItems
        };
      });
      
      if (hasBottomMenu.count > 0) {
        this.report.addStep(`Обнаружено ${hasBottomMenu.count} элементов в нижнем меню`, 'success');
      }
      
      // Проверка наличия элементов интерфейса
      const hasUI = await this.page.evaluate(() => {
        // Проверяем наличие кнопок, навигации и других элементов UI
        const buttons = document.querySelectorAll('button').length;
        const links = document.querySelectorAll('a').length;
        const divs = document.querySelectorAll('div').length;
        const images = document.querySelectorAll('img').length;
        
        return {
          buttons, links, divs, images,
          hasHeader: !!document.querySelector('header'),
          hasFooter: !!document.querySelector('footer'),
          hasNav: !!document.querySelector('nav'),
        };
      });
      
      this.report.addStep(`Статистика UI: кнопок=${hasUI.buttons}, ссылок=${hasUI.links}, изображений=${hasUI.images}`, 'info');
      
      return true;
    } catch (error) {
      this.report.addError(error);
      return false;
    }
  }
  
  async interactWithApp() {
    this.report.addStep('Начало взаимодействия с приложением', 'interaction');
    try {
      // Шаг 1: Нажать на кнопку "НАЧАТЬ РАССЛЕДОВАНИЕ" или альтернативные кнопки
      this.report.addStep('Шаг 1: Нажатие на основную кнопку', 'step');
      let clicked = false;
      
      // Обновленный список возможных кнопок на главном экране для нового дизайна
      const mainButtons = ['НАЧАТЬ РАССЛЕДОВАНИЕ', 'ЛИЧНОЕ ДЕЛО', 'УПРАВЛЕНИЕ КАДРОВ'];
      
      for (const buttonText of mainButtons) {
        this.report.addStep(`Пробуем нажать кнопку "${buttonText}"`, 'info');
        clicked = await this.mainPage.clickButtonByText(buttonText);
        if (clicked) {
          this.report.addStep(`Успешно нажата кнопка "${buttonText}"`, 'success');
          break;
        }
      }
      
      // Если не удалось нажать на кнопки, проверяем нижнее меню
      if (!clicked) {
        this.report.addStep('Не удалось найти основные кнопки. Проверяем нижнее меню.', 'retry');
        
        const menuItems = ['ГЛАВНАЯ', 'АРХИВ', 'ДЕЛА', 'ДОСЬЕ', 'РЕЙТИНГ'];
        
        for (const menuText of menuItems) {
          this.report.addStep(`Пробуем нажать на элемент меню "${menuText}"`, 'info');
          clicked = await this.mainPage.clickButtonByText(menuText);
          if (clicked) {
            this.report.addStep(`Успешно нажат элемент меню "${menuText}"`, 'success');
            break;
          }
        }
      }
      
      // Если до сих пор ничего не нажали, пробуем любой интерактивный элемент
      if (!clicked) {
        this.report.addStep('Не удалось найти известные элементы. Пробуем найти любой интерактивный элемент', 'retry');
        clicked = await this.mainPage.findAndClickAnyInteractiveElement();
      }
      
      await this.mainPage.takeScreenshot('after-first-button');
      await TestUtils.delay(CONFIG.app.timeouts.rendering);
      
      // Анализируем текущее состояние страницы после клика
      const stateAfterClick = await this.mainPage.getPageState();
      this.report.addStep(`Состояние после клика: найдено ${stateAfterClick.buttons.length} кнопок`, 'info');
      
      // Выводим список найденных кнопок для отладки
      if (stateAfterClick.buttons.length > 0) {
        stateAfterClick.buttons.forEach((btnText, idx) => {
          this.report.addStep(`Обнаружена кнопка ${idx+1}: "${btnText}"`, 'info');
        });
      }
      
      // Дополнительное логирование текстовых элементов
      if (stateAfterClick.texts.length > 0) {
        this.report.addStep(`Обнаружено ${stateAfterClick.texts.length} текстовых элементов`, 'info');
        stateAfterClick.texts.slice(0, 5).forEach((text, idx) => {
          this.report.addStep(`Текстовый элемент ${idx+1}: "${text}"`, 'info');
        });
      }
      
      // Шаг 2: Взаимодействие со страницей дела/расследования
      this.report.addStep('Шаг 2: Взаимодействие со страницей расследования', 'step');
      
      // Обновленный список возможных кнопок в интерфейсе расследования
      const caseButtons = [
        'РЕШИТЬ ДЕЛО', 'ПОДТВЕРДИТЬ', 'ДАЛЕЕ', 'УЛИКИ', 'ПОДОЗРЕВАЕМЫЕ', 
        'ИНФОРМАЦИЯ', 'ВЕРНУТЬСЯ К ДЕЛУ', 'СЛЕДУЮЩЕЕ ДЕЛО'
      ];
      
      let secondInteraction = false;
      for (const buttonText of caseButtons) {
        this.report.addStep(`Пробуем найти кнопку "${buttonText}"`, 'info');
        secondInteraction = await this.mainPage.clickButtonByText(buttonText);
        
        if (secondInteraction) {
          this.report.addStep(`Кнопка "${buttonText}" найдена и нажата`, 'success');
          break;
        }
      }
      
      if (!secondInteraction) {
        this.report.addStep('Не найдено известных кнопок, пробуем любой интерактивный элемент', 'retry');
        secondInteraction = await this.mainPage.findAndClickAnyInteractiveElement();
      }
      
      await this.mainPage.takeScreenshot('after-second-interaction');
      await TestUtils.delay(CONFIG.app.timeouts.rendering);
      
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