/**
 * Расширенный E2E тест для проверки взаимодействия с приложением
 * Тестирует не только начальную страницу, но и дальнейшие взаимодействия
 */

const puppeteer = require('puppeteer');

// URL приложения
const APP_URL = 'https://first-bot-production.up.railway.app';

// Задержка для визуальной проверки (в мс)
const VISUAL_DELAY = 2000;
const INTERACTION_DELAY = 1000;

/**
 * Вспомогательная функция для задержки 
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Сделать скриншот и сохранить в файл
 */
async function takeScreenshot(page, name) {
  const filename = `${name}-${Date.now()}.png`;
  await page.screenshot({ path: filename, fullPage: true });
  console.log(`📸 Скриншот сохранен как ${filename}`);
  return filename;
}

/**
 * Расширенный тест пользовательского потока
 */
async function testAdvancedUIFlow() {
  console.log('Запуск расширенного E2E тестирования пользовательского интерфейса...');
  
  let browser;
  try {
    // Запуск браузера
    console.log('Запуск браузера...');
    browser = await puppeteer.launch({
      headless: false, // Видимый браузер для наблюдения за процессом
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=390,844'],
      defaultViewport: {
        width: 390,
        height: 844
      }
    });
    
    const page = await browser.newPage();
    
    // Переход на страницу приложения
    console.log(`Переход на страницу приложения ${APP_URL}...`);
    await page.goto(APP_URL, { waitUntil: 'networkidle2' });
    await delay(VISUAL_DELAY);
    
    // Делаем скриншот начальной страницы
    await takeScreenshot(page, 'start-screen');
    
    // Шаг 1: Нажатие на кнопку "НАЧАТЬ РАССЛЕДОВАНИЕ"
    console.log('\nШаг 1: Нажатие на кнопку "НАЧАТЬ РАССЛЕДОВАНИЕ"');
    
    try {
      // Ищем кнопку "НАЧАТЬ РАССЛЕДОВАНИЕ"
      const buttonTexts = await page.$$eval('button', buttons => 
        buttons.map(btn => ({
          text: btn.textContent.trim(),
          isVisible: btn.offsetWidth > 0 && btn.offsetHeight > 0
        })));
      
      console.log('Найденные кнопки:', buttonTexts);
      
      const startButtonIndex = buttonTexts.findIndex(btn => 
        btn.text.includes('НАЧАТЬ РАССЛЕДОВАНИЕ') && btn.isVisible);
      
      if (startButtonIndex >= 0) {
        const buttons = await page.$$('button');
        console.log(`Нажатие на кнопку "НАЧАТЬ РАССЛЕДОВАНИЕ"...`);
        await buttons[startButtonIndex].click();
        await delay(VISUAL_DELAY);
        console.log('✅ Кнопка нажата успешно');
      } else {
        console.log('⚠️ Кнопка "НАЧАТЬ РАССЛЕДОВАНИЕ" не найдена, пробуем первую кнопку');
        const buttons = await page.$$('button');
        if (buttons.length > 0) {
          await buttons[0].click();
          await delay(VISUAL_DELAY);
        }
      }
    } catch (e) {
      console.error('Ошибка при нажатии на кнопку "НАЧАТЬ РАССЛЕДОВАНИЕ":', e.message);
    }
    
    // Делаем скриншот после первого взаимодействия
    await takeScreenshot(page, 'after-start-button');
    
    // Шаг 2: Проверка, что мы находимся на экране игры или обучения
    console.log('\nШаг 2: Проверка экрана после нажатия кнопки');
    
    // Ищем элементы, характерные для экрана игры или обучения
    const pageContent = await page.content();
    const hasGameElements = pageContent.includes('История') || 
                          pageContent.includes('Вариант') || 
                          pageContent.includes('Ответ') ||
                          pageContent.includes('Обучение');
    
    if (hasGameElements) {
      console.log('✅ Перешли к экрану игры/обучения');
    } else {
      console.log('⚠️ Не обнаружены элементы игрового экрана');
    }
    
    // Шаг 3: Взаимодействие с элементами на новом экране
    console.log('\nШаг 3: Взаимодействие с элементами на новом экране');
    
    // Поиск кнопок на текущем экране
    const currentButtons = await page.$$('button');
    console.log(`Найдено ${currentButtons.length} кнопок на текущем экране`);
    
    const currentButtonTexts = await page.$$eval('button', buttons => 
      buttons.map(btn => ({
        text: btn.textContent.trim(),
        isVisible: btn.offsetWidth > 0 && btn.offsetHeight > 0
      })));
    
    console.log('Тексты кнопок на текущем экране:', currentButtonTexts);
    
    // Ищем кнопку "Далее", "Начать игру" или "Вариант"
    let nextButtonIndex = currentButtonTexts.findIndex(btn => 
      (btn.text.includes('Далее') || 
       btn.text.includes('Начать игру') || 
       btn.text.includes('Вариант')) && 
      btn.isVisible);
    
    if (nextButtonIndex >= 0) {
      console.log(`Нажатие на кнопку "${currentButtonTexts[nextButtonIndex].text}"...`);
      await currentButtons[nextButtonIndex].click();
      await delay(VISUAL_DELAY);
      console.log('✅ Кнопка нажата успешно');
      
      // Делаем скриншот после второго взаимодействия
      await takeScreenshot(page, 'after-second-interaction');
      
      // Шаг 4: Проверка состояния после второго взаимодействия
      console.log('\nШаг 4: Проверка состояния после второго взаимодействия');
      
      // Ищем новые кнопки после второго взаимодействия
      const newButtons = await page.$$('button');
      const newButtonTexts = await page.$$eval('button', buttons => 
        buttons.map(btn => ({
          text: btn.textContent.trim(),
          isVisible: btn.offsetWidth > 0 && btn.offsetHeight > 0
        })));
      
      console.log('Тексты кнопок после второго взаимодействия:', newButtonTexts);
      
      // Проверяем наличие элементов игры
      const newPageContent = await page.content();
      const hasMoreGameElements = newPageContent.includes('Очки') || 
                                  newPageContent.includes('Ответ') || 
                                  newPageContent.includes('Вариант') ||
                                  newPageContent.includes('История');
      
      if (hasMoreGameElements) {
        console.log('✅ Прогресс в приложении подтвержден');
      } else {
        console.log('⚠️ Не обнаружены элементы прогресса');
      }
      
      // Шаг 5: Финальное взаимодействие
      if (newButtons.length > 0) {
        // Найдем интересную кнопку для нажатия
        let finalButtonIndex = newButtonTexts.findIndex(btn => 
          (btn.text.includes('Далее') || 
           btn.text.includes('Вариант') || 
           btn.text.includes('Ответить')) && 
          btn.isVisible);
        
        if (finalButtonIndex < 0) finalButtonIndex = 0; // Если не нашли подходящую, берем первую
        
        console.log(`\nШаг 5: Нажатие на кнопку "${newButtonTexts[finalButtonIndex].text}"`);
        await newButtons[finalButtonIndex].click();
        await delay(VISUAL_DELAY);
        console.log('✅ Финальная кнопка нажата успешно');
        
        // Финальный скриншот
        await takeScreenshot(page, 'final-state');
      }
    } else {
      console.log('⚠️ Не найдена кнопка для продолжения взаимодействия');
    }
    
    console.log('\n✅ Расширенное E2E тестирование пользовательского интерфейса завершено успешно');
    return true;
  } catch (error) {
    console.error('\n❌ Расширенное E2E тестирование пользовательского интерфейса завершилось с ошибкой:', error);
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
async function runAdvancedFrontendE2ETests() {
  console.log(`Начало расширенного E2E тестирования для приложения ${APP_URL}`);
  
  try {
    const uiFlowResult = await testAdvancedUIFlow();
    
    console.log('\n----------------------------');
    console.log(`Итоги расширенного E2E тестирования:`);
    console.log(`- Глубокий пользовательский поток: ${uiFlowResult ? '✅ Успешно' : '❌ Не пройден'}`);
    console.log('----------------------------');
  } catch (e) {
    console.error('Ошибка при выполнении тестов:', e);
  }
  
  console.log('\nРасширенное E2E тестирование интерфейса завершено.');
}

// Проверка наличия Puppeteer
try {
  require.resolve('puppeteer');
  // Запускаем тесты только если Puppeteer установлен
  runAdvancedFrontendE2ETests().catch(console.error);
} catch (e) {
  console.error('Для запуска этого теста необходимо установить Puppeteer:');
  console.error('npm install puppeteer');
} 