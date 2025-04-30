/**
 * Утилита для проверки готовности продакшен-окружения
 * Выполняет проверки конфигурации, соединений и безопасности
 * 
 * Запуск: node src/utils/productionCheck.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Redis = require('ioredis');
const fs = require('fs');
const path = require('path');
const { createLogger } = require('./logger');

// Создаем логгер
const logger = createLogger('ProductionCheck');

// Определяем необходимые переменные окружения
const requiredEnvVars = [
  'NODE_ENV',
  'PORT',
  'MONGO_URL',
  'JWT_SECRET',
  'REDIS_URL',
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_ADMIN_ID',
  'API_URL'
];

// Переменные, которые должны иметь специфические значения в продакшене
const prodSpecificVars = {
  'NODE_ENV': 'production'
};

// Переменные, требующие сложных значений для безопасности
const securityEnvVars = [
  { name: 'JWT_SECRET', minLength: 32 }
];

// Проверка переменных окружения
async function checkEnvironment() {
  logger.info('Проверка переменных окружения...');
  
  const missingVars = [];
  let hasErrors = false;
  
  // Проверяем наличие всех необходимых переменных
  for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
      hasErrors = true;
    }
  }
  
  if (missingVars.length > 0) {
    logger.error(`Отсутствуют обязательные переменные окружения: ${missingVars.join(', ')}`);
  } else {
    logger.info('✓ Все обязательные переменные окружения определены');
  }
  
  // Проверяем значения продакшен-специфичных переменных
  for (const [varName, expectedValue] of Object.entries(prodSpecificVars)) {
    if (process.env[varName] !== expectedValue) {
      logger.error(`Переменная ${varName} должна иметь значение "${expectedValue}" в продакшене, текущее значение: "${process.env[varName]}"`);
      hasErrors = true;
    } else {
      logger.info(`✓ Переменная ${varName} имеет корректное значение для продакшена`);
    }
  }
  
  // Проверяем безопасность переменных
  for (const {name, minLength} of securityEnvVars) {
    if (process.env[name] && process.env[name].length < minLength) {
      logger.error(`Переменная ${name} имеет слишком короткое значение (${process.env[name].length} символов). Минимальная длина: ${minLength} символов`);
      hasErrors = true;
    } else if (process.env[name]) {
      logger.info(`✓ Переменная ${name} имеет достаточную длину для безопасности`);
    }
  }
  
  // Проверяем специфические форматы
  if (!process.env.API_URL.startsWith('https://')) {
    logger.error('API_URL должен использовать HTTPS в продакшен-окружении');
    hasErrors = true;
  } else {
    logger.info('✓ API_URL использует HTTPS');
  }
  
  return !hasErrors;
}

// Проверка подключения к базе данных
async function checkDatabase() {
  logger.info('Проверка подключения к MongoDB...');
  
  try {
    await mongoose.connect(process.env.MONGO_URL, { 
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000
    });
    
    logger.info(`✓ Успешное подключение к MongoDB: ${mongoose.connection.host}`);
    
    // Проверяем, что можем выполнять операции
    const collections = await mongoose.connection.db.listCollections().toArray();
    logger.info(`✓ Доступно коллекций в базе данных: ${collections.length}`);
    
    // Отключаемся
    await mongoose.connection.close();
    logger.info('✓ Соединение с MongoDB успешно закрыто');
    
    return true;
  } catch (error) {
    logger.error(`Ошибка подключения к MongoDB: ${error.message}`);
    return false;
  }
}

// Проверка подключения к Redis
async function checkRedis() {
  logger.info('Проверка подключения к Redis...');
  
  let redis = null;
  
  try {
    // Создаем подключение с тайм-аутом
    redis = new Redis(process.env.REDIS_URL, {
      connectTimeout: 5000,
      maxRetriesPerRequest: 1
    });
    
    // Ожидаем готовности соединения
    await new Promise((resolve, reject) => {
      redis.once('ready', resolve);
      redis.once('error', reject);
    });
    
    // Проверяем, что можем выполнять операции
    const testKey = `prod_check_${Date.now()}`;
    await redis.set(testKey, 'test_value');
    const value = await redis.get(testKey);
    await redis.del(testKey);
    
    if (value === 'test_value') {
      logger.info('✓ Успешное подключение к Redis и операции работают корректно');
    } else {
      logger.error('Подключение к Redis установлено, но операции работают некорректно');
      return false;
    }
    
    // Закрываем соединение
    await redis.quit();
    logger.info('✓ Соединение с Redis успешно закрыто');
    
    return true;
  } catch (error) {
    logger.error(`Ошибка подключения к Redis: ${error.message}`);
    
    // Убедимся, что соединение закрыто
    if (redis) {
      try {
        await redis.quit();
      } catch (e) {
        // Игнорируем ошибки при закрытии
      }
    }
    
    return false;
  }
}

// Проверка директорий и разрешений
async function checkDirectoriesAndPermissions() {
  logger.info('Проверка директорий и разрешений...');
  
  const requiredDirs = [
    'logs',
    'public',
    'public/js',
    'public/css',
    'public/img'
  ];
  
  let hasErrors = false;
  
  // Проверяем, что директории существуют и доступны для записи
  for (const dir of requiredDirs) {
    const dirPath = path.join(process.cwd(), dir);
    
    try {
      if (!fs.existsSync(dirPath)) {
        logger.error(`Директория ${dir} не существует`);
        hasErrors = true;
        continue;
      }
      
      // Проверяем, что это директория
      const stats = fs.statSync(dirPath);
      if (!stats.isDirectory()) {
        logger.error(`${dir} существует, но не является директорией`);
        hasErrors = true;
        continue;
      }
      
      // Проверяем доступ на запись
      fs.accessSync(dirPath, fs.constants.W_OK);
      logger.info(`✓ Директория ${dir} существует и доступна для записи`);
    } catch (error) {
      logger.error(`Проблема с директорией ${dir}: ${error.message}`);
      hasErrors = true;
    }
  }
  
  return !hasErrors;
}

// Главная функция проверки
async function runProductionCheck() {
  logger.info('Запуск проверки готовности продакшен-окружения');
  
  // Проверяем, что мы в продакшен-окружении
  if (process.env.NODE_ENV !== 'production') {
    logger.warn('ВНИМАНИЕ: Вы запустили проверку продакшена, но не находитесь в продакшен-окружении!');
    logger.warn(`Текущее окружение: ${process.env.NODE_ENV || 'не задано'}`);
    logger.warn('Это может привести к неточным результатам проверки');
  }
  
  // Выполняем все проверки
  const envCheck = await checkEnvironment();
  const dbCheck = await checkDatabase();
  const redisCheck = await checkRedis();
  const dirCheck = await checkDirectoriesAndPermissions();
  
  // Выводим итоговый результат
  logger.info('');
  logger.info('=== РЕЗУЛЬТАТЫ ПРОВЕРКИ ГОТОВНОСТИ ПРОДАКШЕН-ОКРУЖЕНИЯ ===');
  logger.info(`Переменные окружения: ${envCheck ? '✓ OK' : '✗ ПРОБЛЕМЫ'}`);
  logger.info(`Подключение к MongoDB: ${dbCheck ? '✓ OK' : '✗ ПРОБЛЕМЫ'}`);
  logger.info(`Подключение к Redis: ${redisCheck ? '✓ OK' : '✗ ПРОБЛЕМЫ'}`);
  logger.info(`Проверка директорий: ${dirCheck ? '✓ OK' : '✗ ПРОБЛЕМЫ'}`);
  logger.info('');
  
  const allOk = envCheck && dbCheck && redisCheck && dirCheck;
  
  if (allOk) {
    logger.info('✅ ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ УСПЕШНО! Окружение готово к продакшену.');
    return 0;
  } else {
    logger.error('❌ ОБНАРУЖЕНЫ ПРОБЛЕМЫ! Окружение НЕ готово к продакшену.');
    logger.error('Устраните указанные выше проблемы и запустите проверку повторно.');
    return 1;
  }
}

// Запускаем проверку и выходим с соответствующим кодом
runProductionCheck()
  .then((exitCode) => {
    process.exit(exitCode);
  })
  .catch((error) => {
    logger.error(`Непредвиденная ошибка при проверке: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  }); 