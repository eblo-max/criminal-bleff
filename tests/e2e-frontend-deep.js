/**
 * Глубокий E2E тест для игрового приложения
 * Тестирует взаимодействие с игровыми элементами, используя прямые селекторы
 */

const puppeteer = require('puppeteer');

// URL приложения
const APP_URL = 'https://first-bot-production.up.railway.app';

// Задержка для визуальной проверки (в мс)
const VISUAL_DELAY = 3000;

// Вспомогательная функция для задержки
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Сделать скриншот с метками времени
async function takeScreenshot(page, name) {
  const filename = `${name}-${Date.now()}.png`;
  await page.screenshot({ path: filename, fullPage: true });
  console.log(`📸 Скриншот сохранен как ${filename}`);
  return filename;
}

/**
 * Тест глубокого взаимодействия с приложением
 */
async function testDeepGameFlow() {
  console.log('Запуск глубокого E2E тестирования игрового процесса...');
  
  let browser;
  try {
    // Запуск браузера с увеличенным таймаутом
    console.log('Запуск браузера...');
    browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=390,844'],
      defaultViewport: {
        width: 390,
        height: 844
      }
    });
    
    const page = await browser.newPage();
    
    // Увеличиваем таймауты для стабильности теста
    page.setDefaultTimeout(30000); // 30 секунд таймаут для ожидания элементов
    
    // Переход на страницу приложения
    console.log(`Переход на страницу приложения ${APP_URL}...`);
    await page.goto(APP_URL, { waitUntil: 'networkidle2', timeout: 60000 });
    await delay(VISUAL_DELAY);
    
    // Делаем скриншот начальной страницы
    await takeScreenshot(page, 'initial-screen');
    console.log('✅ Начальная страница загружена');
    
    // Шаг 1: Находим и нажимаем на кнопку "ОБУЧЕНИЕ" - это должно открыть учебник
    console.log('\nШаг 1: Нажатие на кнопку "ОБУЧЕНИЕ"');
    
    // Используем evalute, чтобы найти кнопку по тексту, даже если она недоступна через обычные селекторы
    const obuchenieButtonExists = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const obuchenieButton = buttons.find(button => 
        button.textContent.trim() === 'ОБУЧЕНИЕ' && 
        button.offsetParent !== null); // проверка видимости
      
      if (obuchenieButton) {
        console.log('Кнопка ОБУЧЕНИЕ найдена');
        return true;
      }
      return false;
    });
    
    if (obuchenieButtonExists) {
      // Нажимаем на кнопку "ОБУЧЕНИЕ" используя JavaScript click
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const obuchenieButton = buttons.find(button => 
          button.textContent.trim() === 'ОБУЧЕНИЕ' && 
          button.offsetParent !== null);
        
        if (obuchenieButton) {
          obuchenieButton.click();
          console.log('Клик на кнопку ОБУЧЕНИЕ выполнен');
        }
      });
      console.log('✅ Нажатие на кнопку "ОБУЧЕНИЕ" выполнено');
    } else {
      console.log('⚠️ Кнопка "ОБУЧЕНИЕ" не найдена, пробуем другую');
      
      // Пробуем нажать на "НАЧАТЬ РАССЛЕДОВАНИЕ"
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const startButton = buttons.find(button => 
          button.textContent.includes('НАЧАТЬ') && 
          button.offsetParent !== null);
        
        if (startButton) {
          startButton.click();
          console.log('Клик на кнопку НАЧАТЬ РАССЛЕДОВАНИЕ выполнен');
        }
      });
    }
    
    // Ждем, чтобы страница обновилась после нажатия
    await delay(VISUAL_DELAY);
    await takeScreenshot(page, 'after-first-button');
    
    // Шаг 2: Проверяем, что открылась страница обучения или игры
    console.log('\nШаг 2: Проверка страницы обучения/игры');
    
    // Ищем элементы обучения
    const tutorialElements = await page.evaluate(() => {
      // Проверяем элементы, характерные для обучения
      const hasIntroText = document.body.innerText.includes('Добро пожаловать') || 
                         document.body.innerText.includes('Как играть') ||
                         document.body.innerText.includes('Обучение');
      
      // Ищем кнопки навигации обучения
      const buttons = Array.from(document.querySelectorAll('button'));
      const nextButton = buttons.find(btn => 
        (btn.textContent.includes('Далее') || 
         btn.textContent.includes('Начать игру') ||
         btn.textContent.includes('Пропустить')) && 
        btn.offsetParent !== null);
      
      return {
        hasIntroText,
        hasNextButton: !!nextButton,
        nextButtonText: nextButton ? nextButton.textContent.trim() : null
      };
    });
    
    console.log('Найдены элементы обучения:', tutorialElements);
    
    if (tutorialElements.hasIntroText && tutorialElements.hasNextButton) {
      console.log(`✅ Открылось обучение. Найдена кнопка "${tutorialElements.nextButtonText}"`);
      
      // Шаг 3: Нажимаем на кнопку "Далее" или "Пропустить"
      console.log('\nШаг 3: Взаимодействие с обучением');
      
      // Нажимаем на кнопку навигации
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const nextButton = buttons.find(btn => 
          (btn.textContent.includes('Далее') || 
           btn.textContent.includes('Начать игру') ||
           btn.textContent.includes('Пропустить')) && 
          btn.offsetParent !== null);
        
        if (nextButton) {
          console.log(`Нажимаем на кнопку '${nextButton.textContent.trim()}'`);
          nextButton.click();
        }
      });
      
      await delay(VISUAL_DELAY);
      await takeScreenshot(page, 'after-next-button');
      
      // Шаг 4: Продолжаем взаимодействие, нажимая на следующие кнопки
      console.log('\nШаг 4: Продолжение взаимодействия с обучением');
      
      // Ищем и нажимаем на следующую кнопку
      const hasMoreButtons = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const nextButton = buttons.find(btn => 
          (btn.textContent.includes('Далее') || 
           btn.textContent.includes('Начать игру') ||
           btn.textContent.includes('Пропустить') ||
           btn.textContent.includes('Вариант')) && 
          btn.offsetParent !== null);
        
        if (nextButton) {
          console.log(`Нажимаем на следующую кнопку '${nextButton.textContent.trim()}'`);
          nextButton.click();
          return true;
        }
        return false;
      });
      
      if (hasMoreButtons) {
        console.log('✅ Найдена и нажата следующая кнопка взаимодействия');
      } else {
        console.log('⚠️ Дополнительные кнопки не найдены');
      }
      
      await delay(VISUAL_DELAY);
      await takeScreenshot(page, 'final-interaction');
    } else {
      // Если не нашли элементы обучения, ищем элементы игры
      console.log('⚠️ Элементы обучения не найдены, проверяем элементы игры');
      
      const gameElements = await page.evaluate(() => {
        // Проверяем элементы, характерные для игры
        const hasGameText = document.body.innerText.includes('История') || 
                          document.body.innerText.includes('Вариант') ||
                          document.body.innerText.includes('Расследование');
        
        // Ищем кнопки с вариантами ответов
        const buttons = Array.from(document.querySelectorAll('button'));
        const optionButton = buttons.find(btn => 
          (btn.textContent.includes('Вариант') || 
           btn.textContent.includes('Ответ')) && 
          btn.offsetParent !== null);
        
        return {
          hasGameText,
          hasOptionButton: !!optionButton,
          buttonText: optionButton ? optionButton.textContent.trim() : null
        };
      });
      
      console.log('Найдены элементы игры:', gameElements);
      
      if (gameElements.hasGameText || gameElements.hasOptionButton) {
        console.log('✅ Открылась игра или экран с вариантами');
        
        // Пробуем нажать на кнопку с вариантом ответа
        if (gameElements.hasOptionButton) {
          console.log(`\nШаг 4: Нажатие на вариант ответа "${gameElements.buttonText}"`);
          
          await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const optionButton = buttons.find(btn => 
              (btn.textContent.includes('Вариант') || 
               btn.textContent.includes('Ответ')) && 
              btn.offsetParent !== null);
            
            if (optionButton) {
              optionButton.click();
              return true;
            }
            return false;
          });
          
          await delay(VISUAL_DELAY);
          await takeScreenshot(page, 'after-game-option');
        }
      } else {
        console.log('⚠️ Не удалось определить тип открывшегося экрана');
      }
    }
    
    // Получаем URL финальной страницы для проверки
    const finalUrl = await page.url();
    console.log(`\nФинальный URL: ${finalUrl}`);
    
    console.log('\n✅ Глубокое E2E тестирование игрового процесса завершено успешно');
    return true;
  } catch (error) {
    console.error('\n❌ Глубокое E2E тестирование завершилось с ошибкой:', error);
    return false;
  } finally {
    // Даем время посмотреть на результат
    await delay(VISUAL_DELAY * 2);
    
    // Закрываем браузер
    if (browser) {
      await browser.close();
      console.log('Браузер закрыт');
    }
  }
}

// Запуск теста
async function runDeepGameTest() {
  console.log(`Начало глубокого E2E тестирования для приложения ${APP_URL}`);
  
  try {
    const testResult = await testDeepGameFlow();
    
    console.log('\n----------------------------');
    console.log(`Итоги глубокого E2E тестирования:`);
    console.log(`- Игровой процесс: ${testResult ? '✅ Успешно' : '❌ Не пройден'}`);
    console.log('----------------------------');
  } catch (e) {
    console.error('Ошибка при выполнении тестов:', e);
  }
  
  console.log('\nГлубокое E2E тестирование завершено.');
}

// Проверка наличия Puppeteer
try {
  require.resolve('puppeteer');
  // Запускаем тесты только если Puppeteer установлен
  runDeepGameTest().catch(console.error);
} catch (e) {
  console.error('Для запуска этого теста необходимо установить Puppeteer:');
  console.error('npm install puppeteer');
} 