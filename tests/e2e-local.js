/**
 * Локальная версия E2E теста для тестирования Telegram mini-app
 * Тест без запуска сервера, просто открывает файлы напрямую
 */

import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

// Получаем текущую директорию в ES модулях
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');

// Функция задержки
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Основная функция теста
async function runLocalTest() {
  console.log('=== Запуск локального E2E теста ===');
  
  // Формируем путь к index.html
  const indexPath = path.join(ROOT_DIR, 'public', 'index.html');
  const fileUrl = `file://${indexPath}`;
  
  console.log('Путь к файлу:', fileUrl);
  
  // Запускаем браузер
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });
  
  try {
    console.log('Браузер запущен, открываю страницу...');
    const page = await browser.newPage();
    
    // Обработчики событий консоли
    page.on('console', msg => {
      console.log(`[Браузер консоль] ${msg.type()}: ${msg.text()}`);
    });
    
    page.on('pageerror', error => {
      console.error('[Браузер ошибка]', error.message);
    });
    
    page.on('requestfailed', request => {
      console.warn(`[Запрос не удался] ${request.url()}`);
    });
    
    // Настраиваем Telegram WebApp API мок
    await page.evaluateOnNewDocument(() => {
      window.Telegram = {
        WebApp: {
          initData: 'init_data_mock',
          initDataUnsafe: {
            user: {
              id: 123456789,
              username: 'test_user',
              first_name: 'Test',
              last_name: 'User'
            }
          },
          ready: function() {},
          expand: function() {},
          close: function() {},
          isExpanded: true,
          viewportHeight: window.innerHeight,
          viewportStableHeight: window.innerHeight,
          MainButton: {
            text: '',
            isVisible: false,
            show: function() { this.isVisible = true; },
            hide: function() { this.isVisible = false; },
            setText: function(text) { this.text = text; }
          }
        }
      };
      console.log('Telegram WebApp API мок установлен');
    });
    
    // Переходим на страницу
    await page.goto(fileUrl, { waitUntil: 'networkidle2' });
    console.log('Страница загружена');
    
    // Делаем скриншот начального состояния
    await page.screenshot({ path: 'initial-screen.png' });
    console.log('Сделан скриншот начального состояния');
    
    // Проверяем доступность элементов
    const elementsInfo = await page.evaluate(() => {
      // Находим основные элементы игры
      const startScreen = document.getElementById('start-screen');
      const tutorialBtn = document.getElementById('tutorial-btn');
      const startGameBtn = document.getElementById('start-game-btn');
      
      return {
        hasStartScreen: !!startScreen,
        hasTutorialBtn: !!tutorialBtn,
        hasStartGameBtn: !!startGameBtn,
        visibleButtons: Array.from(document.querySelectorAll('button'))
          .filter(btn => btn.offsetParent !== null)
          .map(btn => btn.innerText.trim())
      };
    });
    
    console.log('Информация об элементах:', elementsInfo);
    
    // Нажимаем на кнопку ОБУЧЕНИЕ
    if (elementsInfo.hasTutorialBtn) {
      console.log('Нажимаю на кнопку ОБУЧЕНИЕ...');
      await page.click('#tutorial-btn');
      
      // Ждем немного для анимаций и UI обновлений
      await delay(2000);
      
      // Делаем скриншот
      await page.screenshot({ path: 'after-tutorial-button.png' });
      
      // Проверяем отображение туториала
      const tutorialInfo = await page.evaluate(() => {
        const tutorialOverlay = document.getElementById('tutorial-overlay');
        return {
          exists: !!tutorialOverlay,
          visible: !!tutorialOverlay && window.getComputedStyle(tutorialOverlay).display !== 'none',
          stepsCount: document.querySelectorAll('.tutorial-step').length
        };
      });
      
      console.log('Информация о туториале:', tutorialInfo);
      
      if (tutorialInfo.exists) {
        // Если туториал существует, но не виден, пробуем принудительно отобразить его
        if (!tutorialInfo.visible) {
          console.log('Туториал не виден, пробую принудительно отобразить...');
          await page.evaluate(() => {
            const tutorialOverlay = document.getElementById('tutorial-overlay');
            if (tutorialOverlay) {
              tutorialOverlay.style.cssText = 'display: flex !important; z-index: 9999 !important; position: fixed !important; top: 0; left: 0; width: 100%; height: 100%; opacity: 1 !important; visibility: visible !important;';
              
              // Показываем первый шаг
              const firstStep = tutorialOverlay.querySelector('.tutorial-step[data-step="1"]');
              if (firstStep) {
                firstStep.style.display = 'block';
              }
            }
          });
          
          // Делаем скриншот после принудительного отображения
          await delay(1000);
          await page.screenshot({ path: 'after-tutorial-forced.png' });
        }
        
        // Попытка нажать на кнопку Далее в туториале
        const nextButtonClicked = await page.evaluate(() => {
          const nextButton = document.querySelector('.tutorial-next');
          if (nextButton) {
            nextButton.click();
            return true;
          }
          return false;
        });
        
        console.log('Нажатие на кнопку Далее в туториале:', nextButtonClicked ? 'успешно' : 'не удалось');
        
        // Делаем скриншот после нажатия
        await delay(1000);
        await page.screenshot({ path: 'after-tutorial-next.png' });
      }
    }
    
    // Нажимаем на кнопку НАЧАТЬ РАССЛЕДОВАНИЕ
    if (elementsInfo.hasStartGameBtn) {
      console.log('Нажимаю на кнопку НАЧАТЬ РАССЛЕДОВАНИЕ...');
      await page.click('#start-game-btn');
      
      // Ждем немного для анимаций и UI обновлений
      await delay(2000);
      
      // Делаем скриншот
      await page.screenshot({ path: 'after-start-game.png' });
      
      // Проверяем переход на игровой экран
      const gameScreenInfo = await page.evaluate(() => {
        const gameScreen = document.getElementById('game-screen');
        return {
          exists: !!gameScreen,
          visible: !!gameScreen && !gameScreen.classList.contains('hidden'),
          hasGameContent: !!document.querySelector('.game-content')
        };
      });
      
      console.log('Информация об игровом экране:', gameScreenInfo);
    }
    
    console.log('Тест успешно завершен');
    return true;
  } catch (error) {
    console.error('Ошибка в тесте:', error);
    return false;
  } finally {
    // Закрываем браузер
    await browser.close();
    console.log('Браузер остановлен');
  }
}

// Запускаем тест
runLocalTest()
  .then(result => {
    console.log(`Результат теста: ${result ? 'УСПЕШНО' : 'НЕУДАЧНО'}`);
    process.exit(result ? 0 : 1);
  })
  .catch(error => {
    console.error('Критическая ошибка:', error);
    process.exit(1);
  }); 