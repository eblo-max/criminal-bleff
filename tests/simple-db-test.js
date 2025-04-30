/**
 * Простой тест для проверки подключения к MongoDB
 * Не использует фреймворки тестирования
 */

require('dotenv').config();
const mongoose = require('mongoose');

console.log('Запуск теста подключения к MongoDB...');

// Функция для подключения к базе данных
async function connectToDatabase() {
  try {
    // Используем URL из переменной окружения или тестовый URL
    const mongoUrl = process.env.MONGO_PUBLIC_URL || 'mongodb://mongo:XgbIqIHdwdCnvLEjGgngVYNbfiCcpaCz@centerbeam.proxy.rlwy.net:37643';
    
    console.log('Попытка подключения к MongoDB...');
    await mongoose.connect(mongoUrl);
    
    console.log('✅ Тест пройден: Успешное подключение к MongoDB');
    return true;
  } catch (error) {
    console.error('❌ Тест не пройден: Ошибка подключения к MongoDB', error.message);
    return false;
  } finally {
    // Закрываем соединение
    try {
      await mongoose.connection.close();
      console.log('Соединение с MongoDB закрыто');
    } catch (err) {
      console.error('Ошибка при закрытии соединения с MongoDB', err.message);
    }
  }
}

// Функция для простой проверки схем
function checkModels() {
  try {
    console.log('\nПроверка моделей MongoDB...');
    
    // Получаем все определенные модели
    const modelNames = Object.keys(mongoose.models);
    
    if (modelNames.length > 0) {
      console.log('✅ Найдены следующие модели:');
      modelNames.forEach(name => console.log(`   - ${name}`));
      return true;
    } else {
      console.log('❌ Не найдено ни одной модели. Возможно, модели еще не загружены.');
      return false;
    }
  } catch (error) {
    console.error('❌ Ошибка при проверке моделей:', error.message);
    return false;
  }
}

// Запускаем тесты последовательно
async function runTests() {
  const dbConnected = await connectToDatabase();
  
  if (dbConnected) {
    checkModels();
  }
  
  console.log('\nТестирование подключения к MongoDB завершено.');
}

// Запускаем все тесты
runTests().catch(console.error); 