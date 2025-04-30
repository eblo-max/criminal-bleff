/**
 * Тест для проверки работы защиты от повторных запросов (idempotency protection)
 * Эмулирует работу middleware и проверяет корректную обработку запросов
 */

import { v4 as uuidv4 } from 'uuid';

// Имитируем Redis для тестов
class RedisMock {
  constructor() {
    this.store = {};
    this.expirations = {};
  }
  
  async get(key) {
    return this.store[key] || null;
  }
  
  async setex(key, ttl, value) {
    this.store[key] = value;
    this.expirations[key] = {
      ttl,
      timestamp: Date.now()
    };
    return 'OK';
  }
  
  async exists(key) {
    return this.store[key] ? 1 : 0;
  }
  
  // Вспомогательный метод для тестирования
  getAllKeys() {
    return Object.keys(this.store);
  }
  
  getExpirations() {
    return this.expirations;
  }
}

// Имитация middleware
async function idempotencyProtectionMiddleware(req, res, next) {
  const redisMock = req.redisMock;
  const idempotencyKey = req.headers['idempotency-key'];
  
  if (!idempotencyKey) {
    return next({
      status: 400,
      message: 'Отсутствует Idempotency-Key заголовок'
    });
  }
  
  // Проверка формата ключа (UUID)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(idempotencyKey)) {
    return next({
      status: 400,
      message: 'Некорректный формат Idempotency-Key'
    });
  }
  
  // Проверяем, существует ли ключ в Redis
  const exists = await redisMock.exists(`idempotency:${idempotencyKey}`);
  
  if (exists) {
    return next({
      status: 409,
      message: 'Дублирующий запрос. Запрос с таким Idempotency-Key уже обрабатывается или был обработан'
    });
  }
  
  // Сохраняем ключ в Redis с временем жизни 24 часа
  const TTL = 24 * 60 * 60; // 24 часа в секундах
  await redisMock.setex(`idempotency:${idempotencyKey}`, TTL, 'processing');
  
  // Имитируем успешное завершение запроса
  res.status = 200;
  next();
}

// Тестовые функции
async function runIdempotencyTests() {
  console.log('Запуск тестов защиты от повторных запросов...');
  
  const redisMock = new RedisMock();
  
  // Тест 1: Запрос без Idempotency-Key заголовка
  console.log('Тест 1: Запрос без Idempotency-Key заголовка');
  
  const req1 = {
    headers: {},
    redisMock
  };
  
  const res1 = {};
  
  let error1 = null;
  await idempotencyProtectionMiddleware(req1, res1, (err) => {
    error1 = err;
  });
  
  if (error1 && error1.status === 400) {
    console.log('✅ Тест пройден: Запрос без Idempotency-Key правильно отклонен');
  } else {
    console.log('❌ Тест не пройден: Запрос без Idempotency-Key должен быть отклонен');
  }
  console.log('----------------------------');
  
  // Тест 2: Запрос с некорректным форматом ключа
  console.log('Тест 2: Запрос с некорректным форматом ключа');
  
  const req2 = {
    headers: { 'idempotency-key': 'invalid-key' },
    redisMock
  };
  
  const res2 = {};
  
  let error2 = null;
  await idempotencyProtectionMiddleware(req2, res2, (err) => {
    error2 = err;
  });
  
  if (error2 && error2.status === 400) {
    console.log('✅ Тест пройден: Запрос с некорректным форматом ключа правильно отклонен');
  } else {
    console.log('❌ Тест не пройден: Запрос с некорректным ключом должен быть отклонен');
  }
  console.log('----------------------------');
  
  // Тест 3: Успешная обработка запроса с корректным ключом
  console.log('Тест 3: Успешная обработка запроса с корректным ключом');
  
  const validKey = uuidv4();
  const req3 = {
    headers: { 'idempotency-key': validKey },
    redisMock
  };
  
  const res3 = {};
  
  let error3 = null;
  await idempotencyProtectionMiddleware(req3, res3, (err) => {
    error3 = err;
  });
  
  if (!error3 && await redisMock.exists(`idempotency:${validKey}`)) {
    console.log('✅ Тест пройден: Запрос с корректным ключом успешно обработан');
    console.log(`Ключ "${validKey}" сохранен в Redis`);
    
    const expiration = redisMock.getExpirations()[`idempotency:${validKey}`];
    console.log(`Время жизни ключа: ${expiration.ttl} секунд`);
  } else {
    console.log('❌ Тест не пройден: Запрос с корректным ключом не был обработан должным образом');
  }
  console.log('----------------------------');
  
  // Тест 4: Повторный запрос с тем же ключом
  console.log('Тест 4: Повторный запрос с тем же ключом');
  
  const req4 = {
    headers: { 'idempotency-key': validKey },
    redisMock
  };
  
  const res4 = {};
  
  let error4 = null;
  await idempotencyProtectionMiddleware(req4, res4, (err) => {
    error4 = err;
  });
  
  if (error4 && error4.status === 409) {
    console.log('✅ Тест пройден: Повторный запрос с тем же ключом правильно отклонен');
    console.log(`Сообщение об ошибке: ${error4.message}`);
  } else {
    console.log('❌ Тест не пройден: Повторный запрос должен быть отклонен со статусом 409');
  }
  
  console.log('Тестирование защиты от повторных запросов завершено.');
}

// Запускаем тесты
runIdempotencyTests().catch(console.error); 