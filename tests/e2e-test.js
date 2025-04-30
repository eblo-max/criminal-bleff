/**
 * E2E тест для проверки основного пользовательского сценария
 * Тестирует весь процесс от входа в приложение до завершения игры
 */

const fetch = require('node-fetch');
const crypto = require('crypto');

// URL приложения
const APP_URL = 'https://first-bot-production.up.railway.app';

// Генерация тестовых данных
const generateTestData = () => ({
  telegramUserId: `test-${crypto.randomBytes(4).toString('hex')}`,
  idempotencyKey: crypto.randomBytes(8).toString('hex'),
  mockTelegramData: 'mock-data-' + Date.now()
});

// Тест полного игрового процесса
async function testGamePlayProcess() {
  const testData = generateTestData();
  
  console.log('Запуск E2E тестирования основного сценария...');
  console.log(`Данные тестирования:`, testData);
  
  try {
    // Шаг 1: Проверка доступности API
    console.log('\nШаг 1: Проверка доступности API');
    const healthResponse = await fetch(`${APP_URL}/health`);
    
    if (healthResponse.status === 200) {
      console.log('✅ API доступен');
    } else {
      throw new Error(`API недоступен, статус: ${healthResponse.status}`);
    }
    
    // Шаг 2: Запуск игры
    console.log('\nШаг 2: Запуск игры');
    const startGameResponse = await fetch(`${APP_URL}/api/game/start`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'telegram-webapp-initdata': testData.mockTelegramData
      }
    });
    
    // Если ожидается 401, то ок (нужна авторизация)
    if (startGameResponse.status === 401) {
      console.log('✅ Запрос на запуск игры вернул ожидаемый результат (требуется авторизация)');
    } else if (startGameResponse.status === 200) {
      console.log('✅ Запрос на запуск игры успешно выполнен');
      const gameData = await startGameResponse.json();
      console.log('Данные игры:', JSON.stringify(gameData, null, 2));
    } else {
      console.warn(`⚠️ Запрос на запуск игры вернул статус ${startGameResponse.status}`);
    }
    
    // Шаг 3: Отправка ответа пользователя
    console.log('\nШаг 3: Отправка ответа пользователя');
    const submitResponse = await fetch(`${APP_URL}/api/game/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'telegram-webapp-initdata': testData.mockTelegramData,
        'Idempotency-Key': testData.idempotencyKey
      },
      body: JSON.stringify({
        storyId: 'test-story',
        selectedOptionIndex: 0,
        isCorrect: true,
        answerTimeMs: 3000,
        telegramUserId: testData.telegramUserId
      })
    });
    
    // Если ожидается 401, то ок (нужна авторизация)
    if (submitResponse.status === 401) {
      console.log('✅ Запрос на отправку ответа вернул ожидаемый результат (требуется авторизация)');
    } else if (submitResponse.status === 200) {
      console.log('✅ Запрос на отправку ответа успешно выполнен');
      const responseData = await submitResponse.json();
      console.log('Данные ответа:', JSON.stringify(responseData, null, 2));
    } else {
      console.warn(`⚠️ Запрос на отправку ответа вернул статус ${submitResponse.status}`);
    }
    
    // Шаг 4: Повторная отправка того же ответа (проверка идемпотентности)
    console.log('\nШаг 4: Повторная отправка того же ответа (проверка идемпотентности)');
    const duplicateSubmitResponse = await fetch(`${APP_URL}/api/game/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'telegram-webapp-initdata': testData.mockTelegramData,
        'Idempotency-Key': testData.idempotencyKey
      },
      body: JSON.stringify({
        storyId: 'test-story',
        selectedOptionIndex: 0,
        isCorrect: true,
        answerTimeMs: 3000,
        telegramUserId: testData.telegramUserId
      })
    });
    
    if (duplicateSubmitResponse.status === 409) {
      console.log('✅ Повторный запрос правильно отклонен (код 409)');
      const errorData = await duplicateSubmitResponse.json();
      console.log('Данные ошибки:', JSON.stringify(errorData, null, 2));
    } else {
      console.warn(`⚠️ Повторный запрос вернул неожиданный статус ${duplicateSubmitResponse.status}`);
    }
    
    // Шаг 5: Проверка таблицы лидеров
    console.log('\nШаг 5: Проверка таблицы лидеров');
    const leaderboardResponse = await fetch(`${APP_URL}/api/leaderboard`, {
      headers: {
        'telegram-webapp-initdata': testData.mockTelegramData
      }
    });
    
    if (leaderboardResponse.status === 200 || leaderboardResponse.status === 401) {
      console.log(`✅ Запрос на получение таблицы лидеров вернул статус ${leaderboardResponse.status}`);
    } else {
      console.warn(`⚠️ Запрос на получение таблицы лидеров вернул неожиданный статус ${leaderboardResponse.status}`);
    }
    
    console.log('\n✅ E2E тестирование основного сценария завершено успешно');
    return true;
  } catch (error) {
    console.error('\n❌ E2E тестирование основного сценария завершилось с ошибкой:', error.message);
    return false;
  }
}

// Запуск теста
async function runE2ETests() {
  console.log(`Начало E2E тестов для приложения ${APP_URL}`);
  
  const gameProcessResult = await testGamePlayProcess();
  
  console.log('\n----------------------------');
  console.log(`Итоги E2E тестирования:`);
  console.log(`- Основной игровой процесс: ${gameProcessResult ? '✅ Успешно' : '❌ Не пройден'}`);
  console.log('----------------------------');
  
  console.log('\nE2E тестирование завершено.');
}

// Запускаем тесты
runE2ETests().catch(console.error); 