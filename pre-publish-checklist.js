#!/usr/bin/env node

/**
 * Скрипт для проверки готовности проекта к публикации
 * Запуск: node pre-publish-checklist.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');

// Настройки цветов для консоли
const success = chalk.green;
const error = chalk.red;
const warning = chalk.yellow;
const info = chalk.blue;

console.log(info('🔍 Запуск предпубликационной проверки для Криминального Блефа'));
console.log(info('====================================================='));

const results = {
  pass: 0,
  warn: 0,
  fail: 0
};

// Функция для вывода результата проверки
function logResult(check, status, message) {
  if (status === 'pass') {
    console.log(`${success('✓')} ${check}: ${message}`);
    results.pass++;
  } else if (status === 'warn') {
    console.log(`${warning('⚠')} ${check}: ${message}`);
    results.warn++;
  } else {
    console.log(`${error('✗')} ${check}: ${message}`);
    results.fail++;
  }
}

// Проверка наличия необходимых файлов
function checkRequiredFiles() {
  console.log(info('\n📁 Проверка обязательных файлов:'));
    
  const requiredFiles = [
    'public/index.html',
    'public/manifest.json',
    'public/js/app.js',
    'public/css/styles.css',
    'src/server.js',
    'package.json'
  ];
    
  requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
      logResult('Файл', 'pass', `${file} найден`);
    } else {
      logResult('Файл', 'fail', `${file} не найден!`);
    }
  });
}

// Проверка manifest.json
function checkManifest() {
  console.log(info('\n📋 Проверка manifest.json:'));
    
  try {
    const manifest = require('./public/manifest.json');
        
    // Проверка наличия обязательных полей
    if (manifest.name && manifest.short_name) {
      logResult('Manifest', 'pass', 'Название приложения указано');
    } else {
      logResult('Manifest', 'fail', 'Отсутствует name или short_name!');
    }
        
    if (manifest.icons && manifest.icons.length > 0) {
      logResult('Manifest', 'pass', `Найдено ${manifest.icons.length} иконок`);
    } else {
      logResult('Manifest', 'fail', 'Отсутствуют иконки приложения!');
    }
        
    // Проверка настроек Telegram
    if (manifest.telegram_app_info && manifest.telegram_app_info.app_id) {
      if (manifest.telegram_app_info.app_id === 'criminal_bluff_app') {
        logResult('Manifest', 'pass', 'Идентификатор приложения настроен');
      } else if (manifest.telegram_app_info.app_id.includes('your_') || 
                       manifest.telegram_app_info.app_id.includes('example')) {
        logResult('Manifest', 'fail', 'Используется тестовый идентификатор приложения!');
      } else {
        logResult('Manifest', 'pass', 'Идентификатор приложения настроен');
      }
    } else {
      logResult('Manifest', 'fail', 'Отсутствует telegram_app_info.app_id!');
    }
        
    // Проверка разрешений
    if (manifest.permissions && manifest.permissions.length > 0) {
      logResult('Manifest', 'pass', `Настроено ${manifest.permissions.length} разрешений`);
    } else {
      logResult('Manifest', 'warn', 'Не указаны разрешения для приложения');
    }
  } catch (err) {
    logResult('Manifest', 'fail', `Ошибка при чтении manifest.json: ${err.message}`);
  }
}

// Проверка чувствительной информации в коде
function checkForSensitiveInfo() {
  console.log(info('\n🔒 Проверка на наличие чувствительной информации:'));
    
  const patterns = [
    { regex: /(api|jwt|app)_(secret|key)["']?\s*[:=]\s*["']([^"']*?)["']/gi, name: 'API ключи' },
    { regex: /(password|pwd)["']?\s*[:=]\s*["']([^"']*?)["']/gi, name: 'Пароли' },
    { regex: /(mongodb|redis):\/\/([^@\/\s]+@)/gi, name: 'Данные доступа к БД' },
    { regex: /auth_?token["']?\s*[:=]\s*["']([^"']*?)["']/gi, name: 'Токены авторизации' }
  ];
    
  const filesToCheck = [
    ...findFilesWithExtension('src', 'js'),
    ...findFilesWithExtension('public/js', 'js'),
  ];
    
  let foundSensitiveInfo = false;
    
  filesToCheck.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    patterns.forEach(pattern => {
      const matches = content.match(pattern.regex);
      if (matches) {
        logResult('Безопасность', 'fail', `Найдены потенциальные ${pattern.name} в файле ${file}`);
        foundSensitiveInfo = true;
      }
    });
  });
    
  if (!foundSensitiveInfo) {
    logResult('Безопасность', 'pass', 'Не обнаружено чувствительной информации в коде');
  }
}

// Проверка консольных логов и отладочной информации
function checkForDebugCode() {
  console.log(info('\n🐛 Проверка на наличие отладочного кода:'));
    
  const debugPatterns = [
    { regex: /console\.log\(/g, name: 'console.log' },
    { regex: /debugger;/g, name: 'debugger' },
    { regex: /\/\/\s*TODO/g, name: 'TODO комментарии' },
    { regex: /alert\(/g, name: 'alert(' }
  ];
    
  const jsFiles = [
    ...findFilesWithExtension('public/js', 'js'),
  ];
    
  let totalDebugStatements = 0;
  const debugOccurrences = {};
    
  jsFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
        
    debugPatterns.forEach(pattern => {
      const matches = content.match(pattern.regex);
      if (matches) {
        if (!debugOccurrences[pattern.name]) {
          debugOccurrences[pattern.name] = 0;
        }
        debugOccurrences[pattern.name] += matches.length;
        totalDebugStatements += matches.length;
      }
    });
  });
    
  if (totalDebugStatements > 0) {
    for (const [type, count] of Object.entries(debugOccurrences)) {
      logResult('Отладка', 'warn', `Найдено ${count} ${type} выражений`);
    }
  } else {
    logResult('Отладка', 'pass', 'Не обнаружено отладочного кода');
  }
}

// Проверка оптимизации изображений
function checkImageOptimization() {
  console.log(info('\n🖼️ Проверка оптимизации изображений:'));
    
  const imgDir = 'public/img';
  if (!fs.existsSync(imgDir)) {
    logResult('Изображения', 'warn', 'Директория img не найдена');
    return;
  }
    
  const imageFiles = findFilesWithExtension(imgDir, 'png', 'jpg', 'jpeg', 'gif');
    
  let largeImageCount = 0;
  let totalImagesSize = 0;
    
  imageFiles.forEach(file => {
    const stats = fs.statSync(file);
    const fileSizeInMB = stats.size / (1024 * 1024);
    totalImagesSize += fileSizeInMB;
        
    if (fileSizeInMB > 0.5) { // Более 500KB считаем большим
      largeImageCount++;
      logResult('Изображения', 'warn', `${file} имеет размер ${fileSizeInMB.toFixed(2)}MB`);
    }
  });
    
  logResult('Изображения', imageFiles.length > 0 ? 'pass' : 'warn', 
    `Найдено ${imageFiles.length} файлов изображений, общий размер: ${totalImagesSize.toFixed(2)}MB`);
    
  if (largeImageCount > 0) {
    logResult('Изображения', 'warn', `${largeImageCount} изображений имеют большой размер и могут замедлять загрузку`);
  } else if (imageFiles.length > 0) {
    logResult('Изображения', 'pass', 'Все изображения имеют оптимальный размер');
  }
}

// Проверка indexedDB для работы оффлайн
function checkOfflineSupport() {
  console.log(info('\n📴 Проверка поддержки оффлайн-режима:'));
    
  const offlineFiles = [
    'public/js/offline.js'
  ];
    
  offlineFiles.forEach(file => {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf-8');
      if (content.includes('localStorage') || content.includes('indexedDB')) {
        logResult('Оффлайн', 'pass', `${file} содержит механизмы хранения данных`);
      } else {
        logResult('Оффлайн', 'warn', `${file} может не содержать механизмы хранения данных`);
      }
    } else {
      logResult('Оффлайн', 'fail', `${file} не найден!`);
    }
  });
    
  if (fs.existsSync('public/manifest.json')) {
    const manifest = require('./public/manifest.json');
    if (manifest.offline_enabled) {
      logResult('Оффлайн', 'pass', 'В manifest.json включена поддержка оффлайн режима');
    } else {
      logResult('Оффлайн', 'warn', 'В manifest.json НЕ включена поддержка оффлайн режима');
    }
  }
}

// Проверка доступности
function checkAccessibility() {
  console.log(info('\n♿ Проверка доступности:'));
    
  if (fs.existsSync('public/index.html')) {
    const content = fs.readFileSync('public/index.html', 'utf-8');
        
    // Проверка основных элементов доступности
    const imgAltCheck = !content.includes('<img') || (content.includes('<img') && content.includes('alt='));
    const langCheck = content.includes('lang=');
    const ariaCheck = content.includes('aria-');
        
    if (imgAltCheck) {
      logResult('Доступность', 'pass', 'Атрибуты alt для изображений используются корректно');
    } else {
      logResult('Доступность', 'warn', 'Не все изображения могут иметь атрибут alt');
    }
        
    if (langCheck) {
      logResult('Доступность', 'pass', 'Атрибут lang указан для страницы');
    } else {
      logResult('Доступность', 'warn', 'Атрибут lang отсутствует');
    }
        
    if (ariaCheck) {
      logResult('Доступность', 'pass', 'Используются ARIA атрибуты');
    } else {
      logResult('Доступность', 'warn', 'ARIA атрибуты не обнаружены');
    }
  } else {
    logResult('Доступность', 'fail', 'index.html не найден!');
  }
}

// Поиск файлов с указанными расширениями
function findFilesWithExtension(startDir, ...extensions) {
  const results = [];
    
  if (!fs.existsSync(startDir)) {
    return results;
  }
    
  function traverseDir(dir) {
    const files = fs.readdirSync(dir);
        
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
            
      if (stat.isDirectory()) {
        traverseDir(filePath);
      } else if (extensions.some(ext => file.endsWith(`.${ext}`))) {
        results.push(filePath);
      }
    });
  }
    
  traverseDir(startDir);
  return results;
}

// Запуск всех проверок
function runAllChecks() {
  checkRequiredFiles();
  checkManifest();
  checkForSensitiveInfo();
  checkForDebugCode();
  checkImageOptimization();
  checkOfflineSupport();
  checkAccessibility();
    
  // Суммарный результат
  console.log(info('\n📊 Итоговый результат:'));
  console.log(`${success(`✓ Пройдено: ${results.pass}`)} | ${warning(`⚠ Предупреждений: ${results.warn}`)} | ${error(`✗ Ошибок: ${results.fail}`)}`);
    
  if (results.fail > 0) {
    console.log(error('\n❌ Проект НЕ готов к публикации! Устраните ошибки.'));
    return false;
  } else if (results.warn > 0) {
    console.log(warning('\n⚠️ Проект готов к публикации, но имеет предупреждения. Рекомендуется их устранить.'));
    return true;
  } else {
    console.log(success('\n✅ Проект полностью готов к публикации!'));
    return true;
  }
}

// Запускаем проверки
runAllChecks(); 