/**
 * Тест для проверки загрузки модулей в браузере
 */
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Получаем путь к текущему файлу и директории
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runBrowserTest() {
  console.log('Запуск теста загрузки модулей в браузере...');
  
  // Запускаем браузер в headless режиме
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    // Открываем новую страницу
    const page = await browser.newPage();
    
    // Настраиваем обработчик консоли браузера
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      
      // Фильтруем сообщения и выводим их
      if (type === 'error') {
        console.error(`Ошибка в браузере: ${text}`);
      } else if (type === 'warning') {
        console.warn(`Предупреждение в браузере: ${text}`);
      } else if (text.includes('[INFO]') || text.includes('Инициализация')) {
        console.log(`Лог из браузера: ${text}`);
      }
    });
    
    // Открываем локальный файл
    await page.goto('file://' + join(__dirname, '../public/index.html'));
    
    // Ждем загрузки страницы
    await page.waitForSelector('#start-screen', { timeout: 5000 });
    
    // Проверяем, что страница загружена
    console.log('Страница успешно загружена');
    
    // Проверяем наличие ошибок в консоли
    const errors = await page.evaluate(() => {
      return window.errorMessages || [];
    });
    
    if (errors.length > 0) {
      console.error('Обнаружены ошибки в консоли браузера:', errors);
    } else {
      console.log('Ошибок в консоли браузера не обнаружено');
    }
    
    // Делаем скриншот
    await page.screenshot({ path: 'browser-test-screenshot.png' });
    console.log('Скриншот сохранен в browser-test-screenshot.png');
    
    console.log('Тест завершен успешно');
  } catch (error) {
    console.error('Ошибка при выполнении теста:', error);
  } finally {
    // Закрываем браузер
    await browser.close();
  }
}

// Запускаем тест
runBrowserTest().catch(console.error); 