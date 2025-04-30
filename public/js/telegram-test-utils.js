/**
 * Утилиты для эмуляции Telegram WebApp API в тестовом окружении
 * Предоставляет единый интерфейс для тестирования приложения без реального Telegram
 */

// Функция для создания эмуляции Telegram WebApp API
export function createTelegramMock(config = {}) {
  // Объединяем дефолтную конфигурацию с переданной
  const defaultConfig = {
    isExpanded: true,
    showConfirmResult: true,
    userId: 123456789,
    firstName: 'Test',
    lastName: 'User',
    username: 'testuser',
    enableLogging: true
  };
  
  const finalConfig = { ...defaultConfig, ...config };
  
  // Создаем базовую эмуляцию
  const telegramMock = {
    WebApp: {
      isExpanded: finalConfig.isExpanded,
      initDataUnsafe: {
        user: {
          id: finalConfig.userId,
          first_name: finalConfig.firstName,
          last_name: finalConfig.lastName,
          username: finalConfig.username
        },
        query_id: 'test_query_id',
        start_param: finalConfig.startParam || ''
      },
      ready: function() { 
        if (finalConfig.enableLogging) console.log('[TelegramMock] WebApp.ready() вызван');
        return true;
      },
      expand: function() { 
        if (finalConfig.enableLogging) console.log('[TelegramMock] WebApp.expand() вызван');
        this.isExpanded = true;
        return true;
      },
      close: function() { 
        if (finalConfig.enableLogging) console.log('[TelegramMock] WebApp.close() вызван');
        return true;
      },
      MainButton: {
        text: '',
        isVisible: false,
        isActive: true,
        isProgressVisible: false,
        color: '#2481cc',
        textColor: '#ffffff',
        
        show: function() { 
          this.isVisible = true; 
          if (finalConfig.enableLogging) console.log('[TelegramMock] MainButton.show() вызван');
          return true;
        },
        hide: function() { 
          this.isVisible = false; 
          if (finalConfig.enableLogging) console.log('[TelegramMock] MainButton.hide() вызван');
          return true;
        },
        enable: function() { 
          this.isActive = true; 
          if (finalConfig.enableLogging) console.log('[TelegramMock] MainButton.enable() вызван');
          return true;
        },
        disable: function() { 
          this.isActive = false; 
          if (finalConfig.enableLogging) console.log('[TelegramMock] MainButton.disable() вызван');
          return true;
        },
        setText: function(text) { 
          this.text = text; 
          if (finalConfig.enableLogging) console.log(`[TelegramMock] MainButton.setText() вызван с текстом: ${text}`);
          return true;
        },
        onClick: function(callback) {
          this._callback = callback;
          if (finalConfig.enableLogging) console.log('[TelegramMock] MainButton.onClick() зарегистрирован');
          return true;
        },
        showProgress: function(leaveActive) {
          this.isProgressVisible = true;
          if (leaveActive !== undefined) {
            this.isActive = !!leaveActive;
          }
          if (finalConfig.enableLogging) console.log('[TelegramMock] MainButton.showProgress() вызван');
          return true;
        },
        hideProgress: function() {
          this.isProgressVisible = false;
          if (finalConfig.enableLogging) console.log('[TelegramMock] MainButton.hideProgress() вызван');
          return true;
        },
        
        // Метод для тестирования, запускает обработчик клика
        simulateClick: function() {
          if (this._callback && typeof this._callback === 'function') {
            if (finalConfig.enableLogging) console.log('[TelegramMock] Симуляция клика по MainButton');
            this._callback();
            return true;
          }
          if (finalConfig.enableLogging) console.log('[TelegramMock] Попытка симуляции клика, но обработчик не установлен');
          return false;
        }
      },
      BackButton: {
        isVisible: false,
        
        show: function() { 
          this.isVisible = true; 
          if (finalConfig.enableLogging) console.log('[TelegramMock] BackButton.show() вызван');
          return true;
        },
        hide: function() { 
          this.isVisible = false; 
          if (finalConfig.enableLogging) console.log('[TelegramMock] BackButton.hide() вызван');
          return true;
        },
        onClick: function(callback) {
          this._callback = callback;
          if (finalConfig.enableLogging) console.log('[TelegramMock] BackButton.onClick() зарегистрирован');
          return true;
        },
        
        // Метод для тестирования, запускает обработчик клика
        simulateClick: function() {
          if (this._callback && typeof this._callback === 'function') {
            if (finalConfig.enableLogging) console.log('[TelegramMock] Симуляция клика по BackButton');
            this._callback();
            return true;
          }
          if (finalConfig.enableLogging) console.log('[TelegramMock] Попытка симуляции клика, но обработчик не установлен');
          return false;
        }
      },
      HapticFeedback: {
        impactOccurred: function(style) { 
          if (finalConfig.enableLogging) console.log(`[TelegramMock] HapticFeedback.impactOccurred() вызван со стилем: ${style}`);
          return true;
        },
        notificationOccurred: function(type) { 
          if (finalConfig.enableLogging) console.log(`[TelegramMock] HapticFeedback.notificationOccurred() вызван с типом: ${type}`);
          return true;
        },
        selectionChanged: function() {
          if (finalConfig.enableLogging) console.log('[TelegramMock] HapticFeedback.selectionChanged() вызван');
          return true;
        }
      },
      showConfirm: function(text) {
        if (finalConfig.enableLogging) console.log(`[TelegramMock] showConfirm() вызван с текстом: ${text}`);
        return Promise.resolve(finalConfig.showConfirmResult);
      },
      enableClosingConfirmation: function() {
        if (finalConfig.enableLogging) console.log('[TelegramMock] enableClosingConfirmation() вызван');
        return true;
      },
      disableClosingConfirmation: function() {
        if (finalConfig.enableLogging) console.log('[TelegramMock] disableClosingConfirmation() вызван');
        return true;
      }
    }
  };
  
  return telegramMock;
}

// Функция для установки эмуляции в глобальный объект window
export function injectTelegramMock(config = {}) {
  const telegramMock = createTelegramMock(config);
  window.Telegram = telegramMock;
  
  // Генерируем событие для оповещения приложения о готовности API
  const telegramReadyEvent = new Event('telegram:ready');
  document.dispatchEvent(telegramReadyEvent);
  
  // Вызываем метод ready для сигнализации о готовности
  window.Telegram.WebApp.ready();
  
  console.log('[TelegramMock] Эмуляция Telegram WebApp API инициализирована');
  
  return telegramMock;
}

/**
 * Функция для принудительной инициализации и отображения всех элементов интерфейса
 * Полезна для тестирования, когда нужно проверить скрытые элементы без выполнения всех шагов навигации
 * 
 * @param {Object} options - Опции инициализации
 * @param {boolean} options.showAllScreens - Показать все экраны (по умолчанию true)
 * @param {boolean} options.showAllButtons - Показать все кнопки (по умолчанию true)
 * @param {boolean} options.markTestElements - Добавить визуальную маркировку тестовых элементов (по умолчанию true)
 * @param {boolean} options.logResults - Выводить результаты в консоль (по умолчанию true)
 * @returns {Object} Информация о количестве отображенных элементов
 */
export function forceInitialization(options = {}) {
  console.log('[TelegramMock] Принудительная инициализация приложения для тестирования');
  
  const defaultOptions = {
    showAllScreens: true,
    showAllButtons: true,
    markTestElements: true,
    logResults: true
  };
  
  const finalOptions = { ...defaultOptions, ...options };
  const result = {
    screens: {
      total: 0,
      shown: 0,
      elements: []
    },
    buttons: {
      total: 0,
      shown: 0,
      elements: []
    },
    dialogs: {
      total: 0,
      shown: 0,
      elements: []
    }
  };
  
  // 1. Показываем все скрытые экраны
  if (finalOptions.showAllScreens) {
    const screens = document.querySelectorAll('.screen');
    result.screens.total = screens.length;
    
    screens.forEach(screen => {
      // Сохраняем оригинальное состояние для возможного восстановления
      screen._originalDisplay = screen.style.display;
      screen._originalVisibility = screen.style.visibility;
      screen._originalOpacity = screen.style.opacity;
      screen._originalZIndex = screen.style.zIndex;
      screen._originalPosition = screen.style.position;
      screen._wasHidden = screen.classList.contains('hidden');
      
      // Делаем экран видимым, но полупрозрачным и на заднем плане
      if (screen.classList.contains('hidden')) {
        // Не удаляем класс hidden, чтобы не нарушить логику приложения
        // Вместо этого переопределяем его стили
        screen.style.display = 'block';
        screen.style.visibility = 'visible';
        
        if (finalOptions.markTestElements) {
          screen.style.opacity = '0.3';
          screen.style.position = 'absolute';
          screen.style.zIndex = '-1';
          screen.style.border = '2px dashed rgba(255, 0, 0, 0.5)';
          
          // Добавляем метку для тестирования
          const testLabel = document.createElement('div');
          testLabel.className = 'test-label';
          testLabel.textContent = `TEST SCREEN: ${screen.id || 'unnamed'}`;
          testLabel.style.cssText = 'position: absolute; top: 10px; right: 10px; background: rgba(255, 0, 0, 0.7); color: white; padding: 5px; font-size: 12px; border-radius: 4px; z-index: 9999; pointer-events: none;';
          screen.appendChild(testLabel);
        }
        
        result.screens.shown++;
        result.screens.elements.push({
          id: screen.id,
          classList: Array.from(screen.classList)
        });
      }
    });
    
    if (finalOptions.logResults) {
      console.log(`[TelegramMock] Отображено ${result.screens.shown} из ${result.screens.total} экранов`);
    }
  }
  
  // 2. Показываем все скрытые кнопки
  if (finalOptions.showAllButtons) {
    const buttons = document.querySelectorAll('button[style*="display: none"], button.hidden, button[hidden]');
    result.buttons.total = buttons.length;
    
    buttons.forEach(button => {
      // Сохраняем оригинальное состояние
      button._originalDisplay = button.style.display;
      button._originalVisibility = button.style.visibility;
      button._originalOpacity = button.style.opacity;
      button._wasHidden = button.hidden || button.classList.contains('hidden');
      
      // Делаем кнопку видимой, но с визуальным отличием
      button.style.display = 'inline-block';
      button.style.visibility = 'visible';
      button.hidden = false;
      
      if (finalOptions.markTestElements) {
        button.style.opacity = '0.7';
        button.style.border = '2px dashed rgba(0, 128, 255, 0.8)';
        button.style.position = 'relative';
        
        // Если у кнопки нет текста, добавляем его
        if (!button.textContent.trim()) {
          button.textContent = 'TEST BUTTON';
        }
        
        // Добавляем метку с ID кнопки
        const buttonId = button.id || 'unnamed-button-' + Math.random().toString(36).substr(2, 5);
        const testLabel = document.createElement('span');
        testLabel.className = 'test-button-label';
        testLabel.textContent = `${buttonId}`;
        testLabel.style.cssText = 'position: absolute; top: -15px; left: 0; background: rgba(0, 128, 255, 0.8); color: white; padding: 2px 4px; font-size: 9px; border-radius: 2px; pointer-events: none;';
        button.appendChild(testLabel);
      }
      
      result.buttons.shown++;
      result.buttons.elements.push({
        id: button.id || 'unnamed',
        text: button.textContent.trim(),
        classList: Array.from(button.classList)
      });
    });
    
    if (finalOptions.logResults) {
      console.log(`[TelegramMock] Отображено ${result.buttons.shown} из ${result.buttons.total} кнопок`);
    }
  }
  
  // 3. Показываем диалоги, оверлеи и модальные окна
  const dialogs = document.querySelectorAll('.dialog, .overlay, .modal, .popup');
  result.dialogs.total = dialogs.length;
  
  dialogs.forEach(dialog => {
    // Только для скрытых диалогов
    if (dialog.style.display === 'none' || dialog.classList.contains('hidden') || window.getComputedStyle(dialog).display === 'none') {
      // Сохраняем оригинальное состояние
      dialog._originalDisplay = dialog.style.display;
      dialog._originalVisibility = dialog.style.visibility;
      dialog._originalOpacity = dialog.style.opacity;
      dialog._originalZIndex = dialog.style.zIndex;
      dialog._wasHidden = dialog.classList.contains('hidden');
      
      // Делаем диалог видимым
      dialog.style.display = 'block';
      dialog.style.visibility = 'visible';
      
      if (finalOptions.markTestElements) {
        dialog.style.opacity = '0.4';
        dialog.style.zIndex = '99999';
        dialog.style.border = '3px dashed rgba(255, 128, 0, 0.8)';
        
        // Добавляем метку
        const testLabel = document.createElement('div');
        testLabel.className = 'test-dialog-label';
        testLabel.textContent = `TEST DIALOG: ${dialog.id || dialog.className || 'unnamed'}`;
        testLabel.style.cssText = 'position: absolute; top: 10px; left: 10px; background: rgba(255, 128, 0, 0.8); color: white; padding: 5px; font-size: 12px; border-radius: 4px; z-index: 999999; pointer-events: none;';
        dialog.appendChild(testLabel);
      }
      
      result.dialogs.shown++;
      result.dialogs.elements.push({
        id: dialog.id || 'unnamed',
        classList: Array.from(dialog.classList)
      });
    }
  });
  
  if (finalOptions.logResults && result.dialogs.shown > 0) {
    console.log(`[TelegramMock] Отображено ${result.dialogs.shown} из ${result.dialogs.total} диалогов/оверлеев`);
  }
  
  // 4. Добавляем панель управления тестированием, если нужно
  if (finalOptions.markTestElements) {
    // Проверяем, есть ли уже панель
    let testPanel = document.querySelector('.telegram-test-panel');
    if (!testPanel) {
      testPanel = document.createElement('div');
      testPanel.className = 'telegram-test-panel';
      testPanel.style.cssText = 'position: fixed; bottom: 10px; right: 10px; background: rgba(0, 0, 0, 0.8); color: white; padding: 10px; border-radius: 5px; font-size: 12px; z-index: 999999; max-width: 300px;';
      
      testPanel.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 5px;">🔍 Telegram Test Mode</div>
        <div>Screens: ${result.screens.shown}/${result.screens.total}</div>
        <div>Buttons: ${result.buttons.shown}/${result.buttons.total}</div>
        <div>Dialogs: ${result.dialogs.shown}/${result.dialogs.total}</div>
        <button id="test-reset-view" style="margin-top: 5px; padding: 3px 8px; background: #f44336; color: white; border: none; border-radius: 3px; cursor: pointer;">Reset View</button>
      `;
      
      document.body.appendChild(testPanel);
      
      // Добавляем функциональность кнопке сброса
      document.getElementById('test-reset-view').addEventListener('click', function() {
        // Находим все элементы с сохраненным состоянием и возвращаем их к исходному
        document.querySelectorAll('[style*="_original"]').forEach(el => {
          if (el._originalDisplay) el.style.display = el._originalDisplay;
          if (el._originalVisibility) el.style.visibility = el._originalVisibility;
          if (el._originalOpacity) el.style.opacity = el._originalOpacity;
          if (el._originalZIndex) el.style.zIndex = el._originalZIndex;
          if (el._originalPosition) el.style.position = el._originalPosition;
          
          // Удаляем тестовые метки
          el.querySelectorAll('.test-label, .test-button-label, .test-dialog-label').forEach(label => {
            label.remove();
          });
          
          // Возвращаем класс hidden, если он был
          if (el._wasHidden && !el.classList.contains('hidden')) {
            el.classList.add('hidden');
          }
        });
        
        // Удаляем панель
        testPanel.remove();
      });
    }
  }
  
  // Возвращаем информацию о том, сколько элементов было показано
  return result;
}

// Функция для восстановления нормального вида после forceInitialization
export function resetTestView() {
  console.log('[TelegramMock] Сброс тестового режима отображения');
  
  // Находим все элементы с сохраненным состоянием
  const elements = document.querySelectorAll('[style*="_original"]');
  let count = 0;
  
  elements.forEach(el => {
    if (el._originalDisplay) el.style.display = el._originalDisplay;
    if (el._originalVisibility) el.style.visibility = el._originalVisibility;
    if (el._originalOpacity) el.style.opacity = el._originalOpacity;
    if (el._originalZIndex) el.style.zIndex = el._originalZIndex;
    if (el._originalPosition) el.style.position = el._originalPosition;
    
    // Удаляем тестовые стили
    el.style.border = '';
    
    // Удаляем тестовые метки
    el.querySelectorAll('.test-label, .test-button-label, .test-dialog-label').forEach(label => {
      label.remove();
    });
    
    // Возвращаем класс hidden, если он был
    if (el._wasHidden && !el.classList.contains('hidden')) {
      el.classList.add('hidden');
    }
    
    count++;
  });
  
  // Удаляем панель управления тестированием
  const testPanel = document.querySelector('.telegram-test-panel');
  if (testPanel) {
    testPanel.remove();
  }
  
  console.log(`[TelegramMock] Восстановлено исходное отображение ${count} элементов`);
  return count;
}

// Экспортируем по умолчанию объект с основными функциями
export default {
  createTelegramMock,
  injectTelegramMock,
  forceInitialization,
  resetTestView
}; 