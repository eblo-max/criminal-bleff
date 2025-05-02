/**
 * End-to-End тест для игры-викторины "Криминальный Блеф"
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;

// Конфигурация теста
const CONFIG = {
  app: {
    url: 'https://web-production-43380.up.railway.app/', // URL приложения
    //url: 'http://localhost:3000/', // URL для локальной разработки
    timeouts: {
      navigation: 60000,
      element: 10000,
      animation: 1000,
      interaction: 2000,
      rendering: 3000,
    },
    telegramMock: {
      enabled: true,    // Включает имитацию Telegram WebApp
      userId: 12345678, // ID пользователя Telegram
      userName: "Test User", // Имя пользователя
      initData: "query_id=AAHdF6IQAAAAAN0XohDhrOrc&user=%7B%22id%22%3A12345678%2C%22first_name%22%3A%22Test%22%2C%22last_name%22%3A%22User%22%2C%22username%22%3A%22testuser%22%7D&auth_date=1677529427&hash=c501b91338b0a1aed0f4677c63f0a4a950bf9691dcf44fe0d6d3467a92107af4"
    }
  },
  
  test: {
    headless: true,        // Запуск браузера в headless режиме
    slowMo: 0,            // Замедление выполнения
    screenshots: true,    // Делать скриншоты
    screenshotsPath: './screenshots/' // Путь для сохранения скриншотов
  }
};

// Запуск тестов
(async () => {
  console.log("Запуск E2E тестирования игры \"Криминальный Блеф\"...");
  
  const startTime = Date.now();
  let successCount = 0;
  let warningCount = 0;
  const steps = [];
  
  try {
    // Создаем директорию для скриншотов, если нужно
    if (CONFIG.test.screenshots) {
      try {
        await fs.mkdir(CONFIG.test.screenshotsPath, { recursive: true });
        console.log(`Директория для скриншотов создана: ${CONFIG.test.screenshotsPath}`);
      } catch (error) {
        console.warn(`Невозможно создать директорию для скриншотов: ${error.message}`);
        warningCount++;
      }
    }
    
    // Запускаем браузер
    console.log("Запуск браузера...");
    const browser = await puppeteer.launch({
      headless: CONFIG.test.headless ? 'new' : false,
      slowMo: CONFIG.test.slowMo,
      defaultViewport: null,
      args: ['--window-size=375,812', '--no-sandbox']
    });
    
    // Открываем страницу
    const page = await browser.newPage();
    
    // Устанавливаем пользовательский User-Agent для мобильного устройства
    await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1');
    
    // Мокаем Telegram WebApp API если нужно
    if (CONFIG.app.telegramMock.enabled) {
      await page.evaluateOnNewDocument((telegramConfig) => {
        window.Telegram = {
          WebApp: {
            initData: telegramConfig.initData,
            initDataUnsafe: {
              user: {
                id: telegramConfig.userId,
                first_name: "Test",
                last_name: "User",
                username: "testuser",
                language_code: "ru"
              },
              start_param: "test"
            },
            ready: () => {},
            expand: () => {},
            close: () => {},
            isExpanded: true,
            viewportHeight: 812,
            viewportStable: true,
            colorScheme: "dark",
            themeParams: {
              bg_color: "#18222d",
              text_color: "#ffffff",
              hint_color: "#7d8b99",
              button_color: "#50a8eb",
              button_text_color: "#ffffff"
            },
            onEvent: () => {},
            offEvent: () => {},
            sendData: () => {},
            openLink: (url) => console.log('WebApp.openLink:', url),
            showAlert: (message) => console.log('WebApp.showAlert:', message),
            showConfirm: (message) => {
              console.log('WebApp.showConfirm:', message);
              return true;
            },
            MainButton: {
              text: "",
              color: "#50a8eb",
              textColor: "#ffffff",
              isVisible: false,
              isActive: true,
              setText: () => {},
              onClick: () => {},
              show: () => {},
              hide: () => {},
              enable: () => {},
              disable: () => {}
            },
            BackButton: {
              isVisible: false,
              onClick: () => {},
              show: () => {},
              hide: () => {}
            },
            HapticFeedback: {
              impactOccurred: () => {},
              notificationOccurred: () => {},
              selectionChanged: () => {}
            }
          }
        };
        
        console.log('Telegram WebApp API успешно имитирован');
      }, CONFIG.app.telegramMock);
    }
    
    // Перехватываем и логируем консольные сообщения
    page.on('console', message => {
      const type = message.type();
      if (type === 'error') {
        console.error(`[BROWSER CONSOLE ERROR] ${message.text()}`);
      } else if (type === 'warning') {
        console.warn(`[BROWSER CONSOLE WARNING] ${message.text()}`);
      } else {
        //console.log(`[BROWSER CONSOLE] ${message.text()}`); // Раскомментируйте для логирования всех сообщений
      }
    });
    
    // Функция для выполнения и логирования шагов
    async function executeStep(name, action) {
      try {
        console.log(`Шаг: ${name}...`);
        await action();
        console.log(`✓ Шаг выполнен: ${name}`);
        successCount++;
        steps.push({ name, status: 'success' });
      } catch (error) {
        console.error(`✗ Ошибка в шаге "${name}": ${error.message}`);
        
        // Делаем скриншот ошибки
        if (CONFIG.test.screenshots) {
          try {
            const screenshotPath = `${CONFIG.test.screenshotsPath}error_${Date.now()}.png`;
            await page.screenshot({ path: screenshotPath, fullPage: true });
            console.log(`Скриншот ошибки сохранен: ${screenshotPath}`);
          } catch (screenshotError) {
            console.warn(`Не удалось сделать скриншот: ${screenshotError.message}`);
          }
        }
        
        // Добавляем в лог и пробрасываем ошибку дальше
        steps.push({ name, status: 'error', error: error.message });
        throw error;
      }
    }
    
    // Функция для взаимодействия с приложением
    async function interactWithApp() {
      // Переход на стартовую страницу
      await executeStep('Переход на стартовую страницу', async () => {
        await page.goto(CONFIG.app.url, { 
          waitUntil: 'networkidle2',
          timeout: CONFIG.app.timeouts.navigation
        });
        
        // Ожидаем загрузки приложения - исчезновения оверлея загрузки
        await page.waitForSelector('#loading-overlay.hidden', { 
          timeout: CONFIG.app.timeouts.navigation,
          visible: false
        });
        
        // Проверяем, что стартовый экран отображается
        await page.waitForSelector('#start-screen:not(.hidden)', {
          timeout: CONFIG.app.timeouts.element
        });
      });
      
      // Делаем скриншот стартового экрана
      if (CONFIG.test.screenshots) {
        await executeStep('Скриншот стартового экрана', async () => {
          await page.screenshot({ 
            path: `${CONFIG.test.screenshotsPath}start_screen.png`,
            fullPage: true
          });
        });
      }
      
      // Начинаем игру
      await executeStep('Нажимаем кнопку "Начать игру"', async () => {
        await page.click('#start-game-btn');
        
        // Ожидаем появления игрового экрана
        await page.waitForSelector('#game-screen:not(.hidden)', {
          timeout: CONFIG.app.timeouts.element
        });
      });
      
      // Проверяем элементы игрового экрана
      await executeStep('Проверка элементов игрового экрана', async () => {
        // Проверяем наличие таймера
        await page.waitForSelector('#game-timer', {
          timeout: CONFIG.app.timeouts.element
        });
        
        // Проверяем наличие текста истории
        await page.waitForSelector('#story-text', {
          timeout: CONFIG.app.timeouts.element
        });
        
        // Проверяем наличие вариантов ответа
        await page.waitForSelector('#answer-options', {
          timeout: CONFIG.app.timeouts.element
        });
      });
      
      // Делаем скриншот игрового экрана
      if (CONFIG.test.screenshots) {
        await executeStep('Скриншот игрового экрана', async () => {
          await page.screenshot({ 
            path: `${CONFIG.test.screenshotsPath}game_screen.png`,
            fullPage: true
          });
        });
      }
      
      // Выбираем вариант ответа
      await executeStep('Выбираем вариант ответа', async () => {
        // Ждем появления вариантов ответа
        await page.waitForSelector('.option-button', {
          timeout: CONFIG.app.timeouts.element
        });
        
        // Получаем все варианты ответа
        const options = await page.$$('.option-button');
        
        if (options.length === 0) {
          throw new Error('Варианты ответа не найдены');
        }
        
        // Выбираем первый вариант
        await options[0].click();
        
        // Ожидаем появления экрана результата ответа
        await page.waitForSelector('#answer-result-screen:not(.hidden)', {
          timeout: CONFIG.app.timeouts.element
        });
      });
      
      // Делаем скриншот экрана результата ответа
      if (CONFIG.test.screenshots) {
        await executeStep('Скриншот экрана результата ответа', async () => {
          await page.screenshot({ 
            path: `${CONFIG.test.screenshotsPath}answer_result_screen.png`,
            fullPage: true
          });
        });
      }
      
      // Переходим к следующей истории
      await executeStep('Переходим к следующей истории', async () => {
        await page.click('#next-story-btn');
        
        // Ожидаем либо игровой экран, либо экран результатов игры
        try {
          await Promise.race([
            page.waitForSelector('#game-screen:not(.hidden)', {
              timeout: CONFIG.app.timeouts.element
            }),
            page.waitForSelector('#game-results-screen:not(.hidden)', {
              timeout: CONFIG.app.timeouts.element
            })
          ]);
        } catch (error) {
          throw new Error('Не удалось перейти к следующей истории или результатам');
        }
      });
      
      // Игра может продолжиться, или мы можем перейти сразу к результатам
      // Проверяем, какой экран активен
      await executeStep('Проверка активного экрана', async () => {
        const isGameScreen = await page.evaluate(() => {
          return !document.getElementById('game-screen').classList.contains('hidden');
        });
        
        if (isGameScreen) {
          console.log('Игра продолжается - отвечаем на все оставшиеся вопросы');
          
          // Отвечаем на оставшиеся вопросы
          let continueAnswering = true;
          let questionCount = 1;
          
          while (continueAnswering) {
            // Проверяем, находимся ли мы на игровом экране
            const isStillGameScreen = await page.evaluate(() => {
              return !document.getElementById('game-screen').classList.contains('hidden');
            });
            
            if (!isStillGameScreen) {
              console.log('Игра завершена после ответов на все вопросы');
              continueAnswering = false;
              break;
            }
            
            questionCount++;
            console.log(`Отвечаем на вопрос #${questionCount}`);
            
            // Выбираем вариант ответа
            try {
              // Ждем появления вариантов ответа
              await page.waitForSelector('.option-button', {
                timeout: CONFIG.app.timeouts.element
              });
              
              // Получаем все варианты ответа
              const options = await page.$$('.option-button');
              
              if (options.length === 0) {
                throw new Error('Варианты ответа не найдены');
              }
              
              // Выбираем первый вариант
              await options[0].click();
              
              // Ожидаем появления экрана результата ответа
              await page.waitForSelector('#answer-result-screen:not(.hidden)', {
                timeout: CONFIG.app.timeouts.element
              });
              
              // Переходим к следующей истории
              await page.click('#next-story-btn');
              
              // Ожидаем либо игровой экран, либо экран результатов игры
              try {
                await Promise.race([
                  page.waitForSelector('#game-screen:not(.hidden)', {
                    timeout: CONFIG.app.timeouts.element
                  }),
                  page.waitForSelector('#game-results-screen:not(.hidden)', {
                    timeout: CONFIG.app.timeouts.element
                  })
                ]);
              } catch (error) {
                throw new Error('Не удалось перейти к следующей истории или результатам');
              }
            } catch (error) {
              console.warn(`Предупреждение: Не удалось ответить на вопрос #${questionCount}: ${error.message}`);
              warningCount++;
              continueAnswering = false;
            }
          }
        } else {
          console.log('Мы уже на экране результатов игры');
        }
      });
      
      // Делаем скриншот экрана результатов игры
      if (CONFIG.test.screenshots) {
        await executeStep('Скриншот экрана результатов игры', async () => {
          await page.screenshot({ 
            path: `${CONFIG.test.screenshotsPath}game_results_screen.png`,
            fullPage: true
          });
        });
      }
      
      // Возвращаемся в меню
      await executeStep('Возвращаемся в главное меню', async () => {
        // Проверяем, что мы на экране результатов
        const isResultsScreen = await page.evaluate(() => {
          return !document.getElementById('game-results-screen').classList.contains('hidden');
        });
        
        if (isResultsScreen) {
          await page.click('#back-to-menu-btn');
        } else {
          console.warn('Мы не на экране результатов, пытаемся вернуться в меню через ESC');
          warningCount++;
          
          // Нажимаем ESC
          await page.keyboard.press('Escape');
          
          // Пытаемся подтвердить выход из игры
          try {
            // Имитируем нажатие OK в диалоговом окне
            page.on('dialog', async dialog => {
              console.log(`Диалог: ${dialog.message()}`);
              await dialog.accept();
            });
          } catch (error) {
            console.warn(`Предупреждение: Проблема с диалоговым окном: ${error.message}`);
            warningCount++;
          }
        }
        
        // Ожидаем появления стартового экрана
        await page.waitForSelector('#start-screen:not(.hidden)', {
          timeout: CONFIG.app.timeouts.element
        });
      });
      
      // Переходим в профиль
      await executeStep('Проверяем профиль пользователя', async () => {
        await page.click('#profile-btn');
        
        // Ожидаем появления экрана профиля
        await page.waitForSelector('#profile-screen:not(.hidden)', {
          timeout: CONFIG.app.timeouts.element
        });
        
        // Проверяем элементы профиля
        await page.waitForSelector('.profile-info', {
          timeout: CONFIG.app.timeouts.element
        });
        
        await page.waitForSelector('.profile-stats', {
          timeout: CONFIG.app.timeouts.element
        });
      });
      
      // Делаем скриншот экрана профиля
      if (CONFIG.test.screenshots) {
        await executeStep('Скриншот экрана профиля', async () => {
          await page.screenshot({ 
            path: `${CONFIG.test.screenshotsPath}profile_screen.png`,
            fullPage: true
          });
        });
      }
      
      // Возвращаемся в меню
      await executeStep('Возвращаемся из профиля в главное меню', async () => {
        await page.click('#back-from-profile-btn');
        
        // Ожидаем появления стартового экрана
        await page.waitForSelector('#start-screen:not(.hidden)', {
          timeout: CONFIG.app.timeouts.element
        });
      });
      
      // Переходим в рейтинг
      await executeStep('Проверяем рейтинг игроков', async () => {
        await page.click('#leaderboard-btn');
        
        // Ожидаем появления экрана рейтинга
        await page.waitForSelector('#leaderboard-screen:not(.hidden)', {
          timeout: CONFIG.app.timeouts.element
        });
        
        // Проверяем элементы рейтинга
        await page.waitForSelector('.leaderboard-tabs', {
          timeout: CONFIG.app.timeouts.element
        });
        
        await page.waitForSelector('#leaderboard-list', {
          timeout: CONFIG.app.timeouts.element
        });
      });
      
      // Проверяем переключение табов в рейтинге
      await executeStep('Проверяем переключение периодов в рейтинге', async () => {
        // Проверяем вкладки рейтинга
        const tabs = await page.$$('.tab-button');
        
        if (tabs.length < 3) {
          throw new Error('Не найдены вкладки рейтинга');
        }
        
        // Нажимаем на вкладку "Сегодня"
        await tabs[0].click();
        
        // Небольшая пауза для обновления данных
        await page.waitForTimeout(CONFIG.app.timeouts.animation);
        
        // Нажимаем на вкладку "Все время"
        await tabs[2].click();
        
        // Небольшая пауза для обновления данных
        await page.waitForTimeout(CONFIG.app.timeouts.animation);
      });
      
      // Делаем скриншот экрана рейтинга
      if (CONFIG.test.screenshots) {
        await executeStep('Скриншот экрана рейтинга', async () => {
          await page.screenshot({ 
            path: `${CONFIG.test.screenshotsPath}leaderboard_screen.png`,
            fullPage: true
          });
        });
      }
      
      // Возвращаемся в меню
      await executeStep('Возвращаемся из рейтинга в главное меню', async () => {
        await page.click('#back-from-leaderboard-btn');
        
        // Ожидаем появления стартового экрана
        await page.waitForSelector('#start-screen:not(.hidden)', {
          timeout: CONFIG.app.timeouts.element
        });
      });
    }
    
    // Запускаем основной процесс тестирования
    await interactWithApp();
    
    // Закрываем браузер
    await browser.close();
    console.log("Браузер закрыт");
    
    // Выводим итоговый отчет
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log("\n=== ОТЧЕТ О ТЕСТИРОВАНИИ ===");
    console.log(`Длительность: ${duration} секунд`);
    console.log(`Всего шагов: ${steps.length}`);
    console.log(`Успешно: ${successCount}`);
    console.log(`Предупреждения: ${warningCount}`);
    console.log(`Статус: ${successCount === steps.length ? 'УСПЕХ' : 'ПРОВАЛ'}`);
    
    if (warningCount > 0) {
      console.log("\nВ процессе тестирования были предупреждения!");
    }
    
    // Если были ошибки, завершаем с ненулевым кодом
    if (successCount !== steps.length) {
      console.log("\n=== ДЕТАЛИ ОШИБОК ===");
      steps.filter(step => step.status === 'error').forEach(step => {
        console.log(`Шаг "${step.name}": ${step.error}`);
      });
      process.exit(1);
    }
    
  } catch (error) {
    console.error(`\nТЕСТИРОВАНИЕ ПРЕРВАНО С ОШИБКОЙ: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
})(); 