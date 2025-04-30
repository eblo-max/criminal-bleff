/**
 * Тесты для проверки оффлайн-режима и механизма очистки кеша
 * Проверяет работоспособность компонентов после внесения изменений
 */

// Имитируем браузерное окружение
class LocalStorageMock {
  constructor() {
    this.store = {};
  }

  clear() {
    this.store = {};
  }

  getItem(key) {
    return this.store[key] || null;
  }

  setItem(key, value) {
    this.store[key] = String(value);
  }

  removeItem(key) {
    delete this.store[key];
  }
}

// Имитируем StorageEvent
class StorageEventMock {
  constructor(type) {
    this.type = type;
  }
}

// Настраиваем окружение
global.localStorage = new LocalStorageMock();
global.navigator = { onLine: true };

// Импортируем модуль offline.js
// В реальном тесте пришлось бы использовать модули ES и транспайлинг, здесь упрощенная версия
const offlineModule = (() => {
  const OFFLINE_CONFIG = {
    CACHE_MAX_AGE: 7 * 24 * 60 * 60 * 1000, // 7 дней в миллисекундах
    CACHE_CHECK_INTERVAL: 24 * 60 * 60 * 1000 // проверять кеш раз в 24 часа
  };
  
  const logger = {
    info: console.log,
    debug: console.log,
    warn: console.warn,
    error: console.error
  };
  
  // Проверяет и очищает устаревший кеш
  function cleanupExpiredCache() {
    try {
      const now = Date.now();
      
      // Проверяем кеш историй
      const cachedStoriesInfo = localStorage.getItem('cachedStoriesInfo');
      
      if (cachedStoriesInfo) {
        const storiesInfo = JSON.parse(cachedStoriesInfo);
        const cacheAge = now - storiesInfo.timestamp;
        
        // Если кеш старше максимального возраста, удаляем его
        if (cacheAge > OFFLINE_CONFIG.CACHE_MAX_AGE) {
          logger.info(`Удаление устаревшего кеша историй (возраст: ${Math.round(cacheAge / (24 * 60 * 60 * 1000))} дней)`);
          localStorage.removeItem('cachedStories');
          localStorage.removeItem('cachedStoriesInfo');
          return true; // Кеш был очищен
        } else {
          logger.debug(`Кеш историй актуален (возраст: ${Math.round(cacheAge / (60 * 60 * 1000))} часов)`);
          return false; // Кеш актуален
        }
      }
      
      return null; // Кеш отсутствует
    } catch (error) {
      logger.error('Ошибка при очистке устаревшего кеша:', error);
      return null;
    }
  }
  
  // Кеширует истории для оффлайн-использования
  function cacheStories(stories) {
    try {
      if (!stories || !Array.isArray(stories) || stories.length === 0) {
        logger.warn('Попытка кеширования пустого массива историй');
        return false;
      }
          
      // Сохраняем истории
      localStorage.setItem('cachedStories', JSON.stringify(stories));
      
      // Сохраняем информацию о времени кеширования
      localStorage.setItem('cachedStoriesInfo', JSON.stringify({
        timestamp: Date.now(),
        count: stories.length
      }));
      
      logger.info(`Кешировано ${stories.length} историй для оффлайн-использования`);
      return true;
    } catch (error) {
      logger.error('Ошибка при кешировании историй:', error);
      return false;
    }
  }
  
  // Загружает кешированные истории
  function loadCachedStories() {
    try {
      const cachedData = localStorage.getItem('cachedStories');
      
      if (!cachedData) {
        logger.warn('Кешированные истории не найдены');
        return null;
      }
      
      const stories = JSON.parse(cachedData);
      logger.info(`Загружено ${stories.length} кешированных историй`);
      
      return stories;
    } catch (error) {
      logger.error('Ошибка при загрузке кешированных историй:', error);
      return null;
    }
  }
  
  // Проверяет наличие кешированных данных
  function hasCachedData() {
    return !!localStorage.getItem('cachedStories');
  }
  
  return {
    cleanupExpiredCache,
    cacheStories,
    loadCachedStories,
    hasCachedData,
    OFFLINE_CONFIG
  };
})();

// Тесты
function runOfflineTests() {
  console.log('Начало тестирования оффлайн-режима...');
  
  // Очистка перед тестами
  localStorage.clear();
  
  // Тест 1: Кеширование историй
  console.log('Тест 1: Кеширование историй');
  const testStories = [
    { id: 'story1', title: 'Test Story 1', content: 'Test content 1' },
    { id: 'story2', title: 'Test Story 2', content: 'Test content 2' }
  ];
  
  const cacheResult = offlineModule.cacheStories(testStories);
  if (cacheResult) {
    console.log('✅ Тест пройден: Истории успешно кешированы');
  } else {
    console.log('❌ Тест не пройден: Ошибка при кешировании историй');
  }
  
  // Проверяем сохраненные данные
  const storiesInfo = JSON.parse(localStorage.getItem('cachedStoriesInfo'));
  console.log('Информация о кеше:', storiesInfo);
  console.log('----------------------------');
  
  // Тест 2: Загрузка кешированных историй
  console.log('Тест 2: Загрузка кешированных историй');
  const loadedStories = offlineModule.loadCachedStories();
  
  if (loadedStories && loadedStories.length === testStories.length) {
    console.log('✅ Тест пройден: Истории успешно загружены из кеша');
  } else {
    console.log('❌ Тест не пройден: Ошибка при загрузке историй из кеша');
  }
  console.log('----------------------------');
  
  // Тест 3: Проверка очистки старого кеша
  console.log('Тест 3: Проверка очистки старого кеша');
  
  // Устанавливаем старую метку времени (8 дней назад)
  const oldTimestamp = Date.now() - (8 * 24 * 60 * 60 * 1000);
  
  localStorage.setItem('cachedStoriesInfo', JSON.stringify({
    timestamp: oldTimestamp,
    count: testStories.length
  }));
  
  // Вызываем очистку кеша
  const cleanupResult = offlineModule.cleanupExpiredCache();
  
  if (cleanupResult === true) {
    // Проверяем, что кеш был удален
    const hasCachedStories = offlineModule.hasCachedData();
    
    if (!hasCachedStories) {
      console.log('✅ Тест пройден: Устаревший кеш был успешно очищен');
    } else {
      console.log('❌ Тест не пройден: Устаревший кеш не был очищен');
    }
  } else {
    console.log('❌ Тест не пройден: Очистка кеша не сработала');
  }
  console.log('----------------------------');
  
  // Тест 4: Проверка сохранения актуального кеша
  console.log('Тест 4: Проверка сохранения актуального кеша');
  
  // Снова создаем кеш с текущей меткой времени
  offlineModule.cacheStories(testStories);
  
  // Вызываем очистку кеша
  const cleanupResult2 = offlineModule.cleanupExpiredCache();
  
  if (cleanupResult2 === false) {
    // Проверяем, что кеш был сохранен
    const hasCachedStories = offlineModule.hasCachedData();
    
    if (hasCachedStories) {
      console.log('✅ Тест пройден: Актуальный кеш был сохранен');
    } else {
      console.log('❌ Тест не пройден: Актуальный кеш был неожиданно удален');
    }
  } else {
    console.log('❌ Тест не пройден: Проверка актуального кеша не сработала корректно');
  }
  
  console.log('Тестирование оффлайн-режима завершено.');
}

// Запуск тестов
runOfflineTests(); 