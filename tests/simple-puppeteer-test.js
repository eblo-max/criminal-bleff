import puppeteer from 'puppeteer';

async function simpleTest() {
  console.log('Начало простого теста puppeteer');
  
  try {
    console.log('Запуск браузера...');
    const browser = await puppeteer.launch({ headless: false });
    
    console.log('Открытие новой страницы...');
    const page = await browser.newPage();
    
    console.log('Переход на google.com...');
    await page.goto('https://www.google.com');
    
    console.log('Делаю скриншот...');
    await page.screenshot({ path: 'google-home.png' });
    
    console.log('Закрываю браузер...');
    await browser.close();
    
    console.log('Тест успешно завершен!');
    return true;
  } catch (error) {
    console.error('ОШИБКА:', error);
    return false;
  }
}

// Запускаем тест
console.log('==========================================');
console.log('ЗАПУСК ПРОСТОГО ТЕСТА PUPPETEER');
console.log('==========================================');

simpleTest()
  .then(success => {
    console.log(`Результат: ${success ? 'УСПЕХ' : 'ОШИБКА'}`);
  })
  .catch(error => {
    console.error('Неожиданная ошибка:', error);
  }); 