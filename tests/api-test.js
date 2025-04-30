/**
 * Тесты для проверки API Криминального Блефа
 * Проверяет работоспособность основных компонентов после внесения изменений
 */

const fetch = require('node-fetch');
const crypto = require('crypto');

// Базовый URL API (изменить на свой)
const API_BASE_URL = 'https://first-bot-production.up.railway.app';

// Вспомогательная функция для генерации случайного ID
const generateRandomId = () => crypto.randomBytes(8).toString('hex');

// Тест 1: Проверка health endpoint
async function testHealthEndpoint() {
  console.log('Тест 1: Проверка health endpoint');
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    const data = await response.json();
    
    console.log(`Статус: ${response.status}`);
    console.log('Ответ:', data);
    
    if (response.status === 200 && data.status === 'ok') {
      console.log('✅ Тест пройден: Health endpoint работает корректно');
    } else {
      console.log('❌ Тест не пройден: Health endpoint вернул неожиданный результат');
    }
  } catch (error) {
    console.error('❌ Тест не пройден: Ошибка при запросе к health endpoint', error);
  }
  console.log('----------------------------');
}

// Тест 2: Проверка сжатия ответов
async function testCompression() {
  console.log('Тест 2: Проверка сжатия ответов');
  try {
    // Запрос без поддержки сжатия
    const responseWithoutCompression = await fetch(`${API_BASE_URL}/api/game/start`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'telegram-webapp-initdata': 'mock-data' // Моковые данные для тестирования
      }
    });
    
    // Запрос с поддержкой сжатия
    const responseWithCompression = await fetch(`${API_BASE_URL}/api/game/start`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'telegram-webapp-initdata': 'mock-data' // Моковые данные для тестирования
      }
    });
    
    console.log(`Статус без сжатия: ${responseWithoutCompression.status}`);
    console.log(`Статус со сжатием: ${responseWithCompression.status}`);
    
    // Проверяем заголовок Content-Encoding
    const contentEncoding = responseWithCompression.headers.get('Content-Encoding');
    console.log(`Content-Encoding: ${contentEncoding || 'не указан'}`);
    
    if (contentEncoding && (contentEncoding.includes('gzip') || contentEncoding.includes('deflate'))) {
      console.log('✅ Тест пройден: Сжатие ответов работает корректно');
    } else {
      console.log('❌ Тест не пройден: Сжатие ответов не работает');
    }
  } catch (error) {
    console.error('❌ Тест не пройден: Ошибка при проверке сжатия', error);
  }
  console.log('----------------------------');
}

// Тест 3: Проверка защиты от повторных запросов
async function testIdempotency() {
  console.log('Тест 3: Проверка защиты от повторных запросов');
  try {
    const idempotencyKey = generateRandomId();
    
    // Первый запрос с ключом идемпотентности
    const firstResponse = await fetch(`${API_BASE_URL}/api/game/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'telegram-webapp-initdata': 'mock-data', // Моковые данные для тестирования
        'Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify({
        storyId: 'test-story',
        selectedOptionIndex: 0,
        isCorrect: true,
        answerTimeMs: 1000,
        telegramUserId: '12345'
      })
    });
    
    console.log(`Статус первого запроса: ${firstResponse.status}`);
    
    // Второй запрос с тем же ключом идемпотентности
    const secondResponse = await fetch(`${API_BASE_URL}/api/game/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'telegram-webapp-initdata': 'mock-data', // Моковые данные для тестирования
        'Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify({
        storyId: 'test-story',
        selectedOptionIndex: 0,
        isCorrect: true,
        answerTimeMs: 1000,
        telegramUserId: '12345'
      })
    });
    
    console.log(`Статус второго запроса: ${secondResponse.status}`);
    
    // Проверка идемпотентности: второй запрос должен вернуть 409
    if (secondResponse.status === 409) {
      console.log('✅ Тест пройден: Защита от повторных запросов работает корректно');
    } else {
      console.log('❌ Тест не пройден: Защита от повторных запросов не работает');
    }
    
    // Проверяем ответ
    const secondResponseData = await secondResponse.json();
    console.log('Ответ на повторный запрос:', secondResponseData);
    
  } catch (error) {
    console.error('❌ Тест не пройден: Ошибка при проверке идемпотентности', error);
  }
  console.log('----------------------------');
}

// Запускаем тесты последовательно
async function runTests() {
  console.log('Начало тестирования API...');
  
  // Добавляем небольшую задержку между тестами
  await testHealthEndpoint();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await testCompression();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await testIdempotency();
  
  console.log('Тестирование завершено.');
}

// Запуск тестов
runTests(); 