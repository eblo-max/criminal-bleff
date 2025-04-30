/**
 * Простой тест для проверки модуля подсчета очков
 * Не использует фреймворки тестирования
 */

// Импортируем модуль подсчета очков
const scoreCalculator = require('../src/utils/scoreCalculator');

console.log('Запуск простого теста подсчета очков...');

// Тестовые данные
const testCases = [
  {
    name: 'Тест быстрого правильного ответа',
    data: {
      isCorrect: true,
      answerTimeMs: 1000, // 1 секунда
      streak: 1
    },
    expectedMinBaseScore: 90 // примерное минимальное ожидаемое значение
  },
  {
    name: 'Тест медленного правильного ответа',
    data: {
      isCorrect: true,
      answerTimeMs: 9000, // 9 секунд
      streak: 1
    },
    expectedMinBaseScore: 60 // примерное минимальное ожидаемое значение
  },
  {
    name: 'Тест серии ответов',
    data: {
      isCorrect: true,
      answerTimeMs: 5000,
      streak: 5
    },
    expectedStreakBonus: 100
  },
  {
    name: 'Тест неправильного ответа',
    data: {
      isCorrect: false,
      answerTimeMs: 5000,
      streak: 0
    },
    expectedBaseScore: 0
  }
];

// Запуск тестов
function runScoreTests() {
  let passedTests = 0;
  let failedTests = 0;
  
  for (const testCase of testCases) {
    console.log(`\nТест: ${testCase.name}`);
    
    try {
      const result = scoreCalculator.calculateScore(
        testCase.data.isCorrect,
        testCase.data.answerTimeMs,
        testCase.data.streak
      );
      
      console.log(`Результат:`, result);
      
      // Проверка результата
      if (testCase.data.isCorrect) {
        if (testCase.expectedMinBaseScore !== undefined && result.baseScore >= testCase.expectedMinBaseScore) {
          console.log(`✅ Тест пройден: Базовые очки (${result.baseScore}) соответствуют ожидаемым (>= ${testCase.expectedMinBaseScore})`);
          passedTests++;
        } else if (testCase.expectedStreakBonus !== undefined && result.streakBonus === testCase.expectedStreakBonus) {
          console.log(`✅ Тест пройден: Бонус за серию (${result.streakBonus}) соответствует ожидаемому (${testCase.expectedStreakBonus})`);
          passedTests++;
        } else {
          console.log(`❌ Тест не пройден: Очки не соответствуют ожидаемым`);
          failedTests++;
        }
      } else {
        if (result.baseScore === testCase.expectedBaseScore) {
          console.log(`✅ Тест пройден: Базовые очки (${result.baseScore}) соответствуют ожидаемым (${testCase.expectedBaseScore})`);
          passedTests++;
        } else {
          console.log(`❌ Тест не пройден: Базовые очки (${result.baseScore}) не соответствуют ожидаемым (${testCase.expectedBaseScore})`);
          failedTests++;
        }
      }
    } catch (error) {
      console.error(`❌ Тест не пройден: ${error.message}`);
      failedTests++;
    }
  }
  
  console.log('\n----------------------------');
  console.log(`Результаты: ${passedTests} тестов пройдено, ${failedTests} тестов не пройдено`);
  
  return {
    passed: passedTests,
    failed: failedTests
  };
}

// Запускаем тесты
const results = runScoreTests();

// Выводим общий результат
console.log('\nТестирование модуля подсчета очков завершено.'); 