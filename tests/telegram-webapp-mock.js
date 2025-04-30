/**
 * Эмулятор окружения WebApp Telegram для локального тестирования мини-приложений
 * Запускает локальный сервер, который создает эмулятор Telegram WebApp
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const { default: openBrowser } = require('open');

// Настройки
const CONFIG = {
  port: 3000,
  appUrl: 'https://first-bot-production.up.railway.app',
  mockUserData: {
    id: 123456789,
    first_name: "Test",
    last_name: "User",
    username: "test_user",
    language_code: "ru"
  },
  // Параметры для окна Telegram
  window: {
    width: 390,
    height: 600
  }
};

// Создаем приложение Express
const app = express();

// Корневая директория проекта
const rootDir = path.resolve(__dirname, '..');

// HTML для эмуляции Telegram WebApp
const telegramMockHtml = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Telegram WebApp Эмулятор</title>
  <style>
    body, html {
      margin: 0;
      padding: 0;
      height: 100%;
      background-color: #212121;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    }
    
    .container {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    
    .header {
      background-color: #0088cc;
      color: white;
      padding: 10px 15px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }
    
    .header-title {
      font-size: 18px;
      font-weight: bold;
    }
    
    .back-button {
      border: none;
      background: none;
      color: white;
      font-size: 18px;
      cursor: pointer;
      padding: 5px;
    }
    
    .iframe-container {
      flex-grow: 1;
      position: relative;
    }
    
    #app-frame {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border: none;
    }
    
    .footer {
      background-color: #1a1a1a;
      color: #999;
      padding: 8px 15px;
      text-align: center;
      font-size: 12px;
      flex-shrink: 0;
    }
    
    .controls {
      display: flex;
      justify-content: center;
      padding: 8px 0;
      background-color: #181818;
    }
    
    .control-button {
      background-color: #0088cc;
      color: white;
      border: none;
      padding: 5px 10px;
      margin: 0 5px;
      border-radius: 4px;
      cursor: pointer;
    }
    
    .control-button:hover {
      background-color: #0099dd;
    }
    
    .debug-panel {
      position: fixed;
      bottom: 50px;
      right: 10px;
      background-color: rgba(0, 0, 0, 0.7);
      color: #00ff00;
      padding: 10px;
      border-radius: 5px;
      font-family: monospace;
      font-size: 10px;
      max-width: 300px;
      max-height: 200px;
      overflow: auto;
      z-index: 1000;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <button class="back-button" id="back-button">←</button>
      <div class="header-title">MyCoolBot</div>
      <div></div>
    </div>
    
    <div class="controls">
      <button class="control-button" id="reload-btn">Перезагрузить</button>
      <button class="control-button" id="expand-btn">Expand</button>
      <button class="control-button" id="close-btn">Close</button>
    </div>
    
    <div class="iframe-container">
      <iframe id="app-frame" src="${CONFIG.appUrl}" allowfullscreen></iframe>
    </div>
    
    <div class="footer">
      Telegram WebApp Эмулятор - Тестовая среда
    </div>
  </div>
  
  <div class="debug-panel" id="debug-panel">
    <div>WebApp Debug Console:</div>
  </div>

  <script>
    // Создаем эмуляцию объекта Telegram WebApp
    const initData = 'hash=hash_string&user=${encodeURIComponent(JSON.stringify(CONFIG.mockUserData))}';
    
    // Функция добавления отладочной информации
    function addDebugMessage(message) {
      const debugPanel = document.getElementById('debug-panel');
      const messageEl = document.createElement('div');
      messageEl.textContent = '> ' + message;
      debugPanel.appendChild(messageEl);
      debugPanel.scrollTop = debugPanel.scrollHeight;
    }
    
    // Функция для инжекции Telegram WebApp объекта в iframe
    function injectTelegramWebApp() {
      const iframe = document.getElementById('app-frame');
      if (!iframe.contentWindow) {
        setTimeout(injectTelegramWebApp, 100);
        return;
      }
      
      // Создаем объект Telegram
      const telegramObj = {
        WebApp: {
          initData: initData,
          initDataUnsafe: {
            user: ${JSON.stringify(CONFIG.mockUserData)}
          },
          version: "6.0",
          colorScheme: "dark",
          themeParams: {
            bg_color: "#212121",
            text_color: "#ffffff",
            hint_color: "#999999",
            link_color: "#0088cc",
            button_color: "#0088cc",
            button_text_color: "#ffffff"
          },
          isExpanded: true,
          viewportHeight: iframe.contentWindow.innerHeight,
          viewportStableHeight: iframe.contentWindow.innerHeight,
          headerColor: "#0088cc",
          backgroundColor: "#212121",
          
          // Методы
          ready: function() {
            addDebugMessage("WebApp.ready() called");
          },
          expand: function() {
            addDebugMessage("WebApp.expand() called");
          },
          close: function() {
            addDebugMessage("WebApp.close() called");
          },
          
          // Объекты и функции обратного вызова
          MainButton: {
            text: '',
            color: '#0088cc',
            textColor: '#ffffff',
            isVisible: false,
            isActive: true,
            isProgressVisible: false,
            setText: function(text) {
              this.text = text;
              addDebugMessage("MainButton.setText() called with: " + text);
            },
            show: function() {
              this.isVisible = true;
              addDebugMessage("MainButton.show() called");
            },
            hide: function() {
              this.isVisible = false;
              addDebugMessage("MainButton.hide() called");
            },
            setParams: function(params) {
              if (params.text) this.text = params.text;
              if (params.color) this.color = params.color;
              if (params.text_color) this.textColor = params.text_color;
              if (params.is_active !== undefined) this.isActive = params.is_active;
              addDebugMessage("MainButton.setParams() called with: " + JSON.stringify(params));
            }
          },
          
          BackButton: {
            isVisible: false,
            show: function() {
              this.isVisible = true;
              addDebugMessage("BackButton.show() called");
            },
            hide: function() {
              this.isVisible = false;
              addDebugMessage("BackButton.hide() called");
            },
            onClick: function(callback) {
              document.getElementById('back-button').addEventListener('click', () => {
                addDebugMessage("BackButton clicked");
                callback();
              });
              addDebugMessage("BackButton.onClick() registered");
            }
          },
          
          HapticFeedback: {
            impactOccurred: function(style) {
              addDebugMessage("HapticFeedback.impactOccurred() called with style: " + style);
            },
            notificationOccurred: function(type) {
              addDebugMessage("HapticFeedback.notificationOccurred() called with type: " + type);
            },
            selectionChanged: function() {
              addDebugMessage("HapticFeedback.selectionChanged() called");
            }
          },
          
          isClosingConfirmationEnabled: false,
          enableClosingConfirmation: function() {
            this.isClosingConfirmationEnabled = true;
            addDebugMessage("WebApp.enableClosingConfirmation() called");
          },
          disableClosingConfirmation: function() {
            this.isClosingConfirmationEnabled = false;
            addDebugMessage("WebApp.disableClosingConfirmation() called");
          }
        }
      };
      
      // Инжектируем объект в iframe
      try {
        iframe.contentWindow.Telegram = telegramObj;
        
        // Создаем событие для оповещения приложения
        iframe.contentWindow.dispatchEvent(new Event('tg:init'));
        
        addDebugMessage("Telegram WebApp объект успешно инжектирован");
      } catch (e) {
        addDebugMessage("Ошибка при инжекции объекта Telegram: " + e.message);
      }
    }
    
    // Обработчики событий кнопок
    document.getElementById('reload-btn').addEventListener('click', function() {
      document.getElementById('app-frame').src = "${CONFIG.appUrl}";
      addDebugMessage("Перезагрузка приложения");
    });
    
    document.getElementById('expand-btn').addEventListener('click', function() {
      addDebugMessage("Вызов WebApp.expand()");
      try {
        const iframe = document.getElementById('app-frame');
        if (iframe.contentWindow && iframe.contentWindow.Telegram) {
          iframe.contentWindow.Telegram.WebApp.expand();
        }
      } catch (e) {
        addDebugMessage("Ошибка: " + e.message);
      }
    });
    
    document.getElementById('close-btn').addEventListener('click', function() {
      addDebugMessage("Вызов WebApp.close()");
      try {
        const iframe = document.getElementById('app-frame');
        if (iframe.contentWindow && iframe.contentWindow.Telegram) {
          iframe.contentWindow.Telegram.WebApp.close();
        }
      } catch (e) {
        addDebugMessage("Ошибка: " + e.message);
      }
    });
    
    // Инжектируем объект Telegram после загрузки iframe
    document.getElementById('app-frame').addEventListener('load', function() {
      injectTelegramWebApp();
    });
  </script>
</body>
</html>
`;

// Статичный маршрут для сервирования файлов из корневой директории
app.use(express.static(rootDir));

// Маршрут для страницы эмуляции Telegram WebApp
app.get('/', (req, res) => {
  res.send(telegramMockHtml);
});

// Запуск сервера
app.listen(CONFIG.port, () => {
  console.log(`Telegram WebApp эмулятор запущен на http://localhost:${CONFIG.port}`);
  console.log(`Мини-приложение загружается из: ${CONFIG.appUrl}`);
  
  // Открываем браузер с эмулятором
  try {
    openBrowser(`http://localhost:${CONFIG.port}`);
    console.log('Браузер открыт');
  } catch (err) {
    console.error('Ошибка при открытии браузера:', err);
    console.log('Пожалуйста, откройте вручную: http://localhost:' + CONFIG.port);
  }
}); 