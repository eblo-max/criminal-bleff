/**
 * Модуль визуальных эффектов для Криминального Блефа
 */

import { logger } from './utils.js';
import { safeHapticFeedback } from './telegram.js';

// Показать эффект конфетти при победе
function showConfetti(score, correctAnswers, totalQuestions) {
  logger.info('Отображение эффекта конфетти', { score, correctAnswers, totalQuestions });
  
  // Определяем насколько хороший результат был
  const percentage = Math.round((correctAnswers / totalQuestions) * 100);
  
  // Создаем контейнер для конфетти
  let confettiContainer = document.querySelector('.confetti-container');
  if (!confettiContainer) {
    confettiContainer = document.createElement('div');
    confettiContainer.className = 'confetti-container';
    document.body.appendChild(confettiContainer);
  } else {
    // Очищаем контейнер, если он уже существует
    confettiContainer.innerHTML = '';
  }
  
  // Определяем цвета конфетти в зависимости от результата
  let colors;
  if (percentage >= 80) {
    // Отличный результат - золотое конфетти
    colors = ['#FFD700', '#FFC107', '#FFEB3B', '#FFF59D', '#FFFDE7'];
    // Много конфетти
    createConfettiEffect(confettiContainer, colors, 100);
  } else if (percentage >= 60) {
    // Хороший результат - серебряное и немного золотого
    colors = ['#E0E0E0', '#BDBDBD', '#9E9E9E', '#FFD700', '#FFFFFF'];
    // Среднее количество конфетти
    createConfettiEffect(confettiContainer, colors, 60);
  } else if (percentage >= 40) {
    // Средний результат - простое конфетти
    colors = ['#2196F3', '#03A9F4', '#00BCD4', '#B3E5FC', '#E1F5FE'];
    // Небольшое количество конфетти
    createConfettiEffect(confettiContainer, colors, 30);
  } else {
    // Слабый результат - минимальное конфетти
    colors = ['#9C27B0', '#BA68C8', '#E1BEE7', '#CE93D8', '#F3E5F5'];
    // Совсем немного конфетти
    createConfettiEffect(confettiContainer, colors, 15);
  }
  
  // Добавляем звуковой эффект или вибрацию
  safeHapticFeedback('medium');
  
  // Показываем эффект очков
  showScoreEffect(score);
  
  // Удаляем контейнер через некоторое время
  setTimeout(() => {
    if (confettiContainer && confettiContainer.parentNode) {
      confettiContainer.parentNode.removeChild(confettiContainer);
    }
  }, 5000); // 5 секунд
}

// Создать эффект конфетти
function createConfettiEffect(container, colors, count) {
  logger.info('Создание эффекта конфетти', { count, colors: colors.length });
  
  // Создаем указанное количество частиц
  for (let i = 0; i < count; i++) {
    createConfettiParticle(container, colors);
  }
}

// Создать частицу конфетти
function createConfettiParticle(container, colors) {
  // Создаем DOM-элемент для частицы
  const particle = document.createElement('div');
  particle.className = 'confetti-particle';
  
  // Случайный цвет из палитры
  const color = colors[Math.floor(Math.random() * colors.length)];
  particle.style.backgroundColor = color;
  
  // Случайный размер частицы
  const size = Math.random() * 10 + 5; // от 5 до 15px
  particle.style.width = `${size}px`;
  particle.style.height = `${size}px`;
  
  // Случайное начальное положение (всегда сверху, но с разным X)
  const startPositionX = Math.random() * 100; // процент от ширины контейнера
  particle.style.left = `${startPositionX}%`;
  particle.style.top = '0';
  
  // Случайные параметры движения
  const duration = Math.random() * 3 + 2; // от 2 до 5 секунд
  const delay = Math.random() * 0.5; // задержка до 0.5 сек
  
  // Случайное вращение
  const rotation = Math.random() * 360;
  const rotationEnd = rotation + Math.random() * 360 * 2;
  
  // Добавляем анимацию
  particle.style.animation = `fall ${duration}s ease-in ${delay}s 1 forwards, rotate ${duration * 0.5}s linear ${delay}s infinite`;
  
  // Добавляем трансформацию для вращения
  particle.style.transform = `rotate(${rotation}deg)`;
  
  // Добавляем частицу в контейнер
  container.appendChild(particle);
  
  // Удаляем частицу после окончания анимации
  setTimeout(() => {
    if (particle.parentNode === container) {
      container.removeChild(particle);
    }
  }, (duration + delay) * 1000);
}

// Показать эффект добавления очков
function showScoreEffect(score) {
  logger.info('Отображение эффекта прибавления очков', { score });
  
  // Создаем элемент для отображения очков
  const scoreElement = document.createElement('div');
  scoreElement.className = 'score-effect';
  scoreElement.textContent = `+${score}`;
  
  // Добавляем элемент на страницу (по центру)
  document.body.appendChild(scoreElement);
  
  // Показываем элемент с анимацией
  setTimeout(() => {
    scoreElement.classList.add('show');
    
    // Удаляем элемент через некоторое время
    setTimeout(() => {
      scoreElement.classList.remove('show');
      setTimeout(() => {
        if (scoreElement.parentNode) {
          document.body.removeChild(scoreElement);
        }
      }, 300);
    }, 1500);
  }, 100);
}

// Добавление эффектов для экрана профиля
function addDossierEffects(container) {
  if (!container) {
    logger.warn('Не удалось добавить эффекты к досье: контейнер не существует');
    return;
  }
  
  logger.info('Добавление эффектов к досье', { 
    containerId: container.id || 'без ID' 
  });
  
  // Добавляем эффект штампа "Совершенно секретно"
  const stampElement = document.createElement('div');
  stampElement.className = 'top-secret-stamp';
  stampElement.setAttribute('aria-hidden', 'true');
  container.appendChild(stampElement);
  
  // Добавляем эффект скрепки для бумаг
  const paperClipElement = document.createElement('div');
  paperClipElement.className = 'paper-clip';
  paperClipElement.setAttribute('aria-hidden', 'true');
  container.appendChild(paperClipElement);
  
  // Добавляем эффект потертостей на бумаге
  const wornEffectElement = document.createElement('div');
  wornEffectElement.className = 'worn-paper-effect';
  wornEffectElement.setAttribute('aria-hidden', 'true');
  container.appendChild(wornEffectElement);
  
  // Анимация появления
  setTimeout(() => {
    container.classList.add('effects-loaded');
    logger.info('Эффекты досье загружены');
  }, 100);
}

// Добавление эффектов для экрана таблицы лидеров
function addArchiveEffects(container) {
  if (!container) {
    logger.warn('Не удалось добавить эффекты к архиву: контейнер не существует');
    return;
  }
  
  logger.info('Добавление эффектов к архиву', { 
    containerId: container.id || 'без ID' 
  });
  
  // Добавляем эффект пыльной папки
  const folderElement = document.createElement('div');
  folderElement.className = 'dusty-folder-effect';
  folderElement.setAttribute('aria-hidden', 'true');
  container.appendChild(folderElement);
  
  // Добавляем эффект старых отпечатков пальцев
  const fingerprintsElement = document.createElement('div');
  fingerprintsElement.className = 'fingerprints-effect';
  fingerprintsElement.setAttribute('aria-hidden', 'true');
  container.appendChild(fingerprintsElement);
  
  // Анимация появления
  setTimeout(() => {
    container.classList.add('effects-loaded');
    logger.info('Эффекты архива загружены');
  }, 100);
}

// Создание частиц успеха (звездочки, искры)
function createSuccessParticles(element) {
  // Проверяем, что элемент существует
  if (!element) {
    logger.warn('Не удалось создать эффект частиц успеха: элемент не существует');
    return;
  }
  
  logger.info('Создание эффекта частиц успеха', {
    elementId: element.id || 'без ID',
    elementType: element.tagName
  });
  
  // Получаем размеры и позицию элемента
  const rect = element.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  
  // Создаем контейнер для частиц
  const particlesContainer = document.createElement('div');
  particlesContainer.className = 'particles-container';
  particlesContainer.style.position = 'absolute';
  particlesContainer.style.left = '0';
  particlesContainer.style.top = '0';
  particlesContainer.style.width = '100%';
  particlesContainer.style.height = '100%';
  particlesContainer.style.pointerEvents = 'none';
  particlesContainer.style.zIndex = '9999';
  document.body.appendChild(particlesContainer);
  
  // Цвета частиц
  const colors = ['#FFD700', '#FFC107', '#FFEB3B', '#FFF59D', '#FFFDE7'];
  
  // Создаем частицы
  const particleCount = 20;
  const particles = [];
  
  logger.info('Генерация частиц успеха', { count: particleCount });
  
  for (let i = 0; i < particleCount; i++) {
    // Создаем элемент частицы
    const particle = document.createElement('div');
    particle.className = 'success-particle';
    
    // Задаем случайный цвет
    const color = colors[Math.floor(Math.random() * colors.length)];
    particle.style.backgroundColor = color;
    
    // Задаем случайный размер
    const size = Math.random() * 8 + 4; // от 4px до 12px
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    
    // Начальная позиция (в центре элемента)
    particle.style.left = `${centerX}px`;
    particle.style.top = `${centerY}px`;
    
    // Добавляем частицу в контейнер
    particlesContainer.appendChild(particle);
    
    // Сохраняем информацию о частице
    const angle = Math.random() * Math.PI * 2; // случайный угол (0-360)
    const speed = Math.random() * 50 + 50; // случайная скорость
    const gravity = Math.random() * 0.2 + 0.1; // случайное ускорение падения
    
    particles.push({
      element: particle,
      x: centerX,
      y: centerY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      gravity,
      alpha: 1,
      size
    });
  }
  
  // Анимируем частицы
  let start = null;
  
  const animateParticle = () => {
    const now = Date.now();
    if (!start) start = now;
    const dt = (now - start) / 1000; // время в секундах
    
    let allDone = true;
    
    particles.forEach(particle => {
      // Если частица все еще видима
      if (particle.alpha > 0) {
        allDone = false;
        
        // Обновляем позицию
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt + (particle.gravity * dt * dt * 500);
        
        // Применяем сопротивление
        particle.vx *= 0.99;
        particle.vy *= 0.99;
        
        // Уменьшаем прозрачность
        particle.alpha -= dt * 0.5;
        if (particle.alpha < 0) particle.alpha = 0;
        
        // Обновляем стили частицы
        particle.element.style.transform = `translate(${particle.x - particle.size / 2}px, ${particle.y - particle.size / 2}px)`;
        particle.element.style.opacity = particle.alpha;
      }
    });
    
    // Если все частицы исчезли, удаляем контейнер
    if (allDone) {
      if (particlesContainer.parentNode) {
        particlesContainer.parentNode.removeChild(particlesContainer);
        logger.info('Анимация частиц успеха завершена');
      }
    } else {
      // Иначе продолжаем анимацию
      requestAnimationFrame(animateParticle);
    }
  };
  
  // Запускаем анимацию
  requestAnimationFrame(animateParticle);
}

// Добавление неоновых вспышек для элементов
function addNeonFlash(element, color = '#0ff') {
  // Проверяем, что элемент существует
  if (!element) {
    logger.warn('Не удалось добавить неоновое свечение: элемент не существует');
    return;
  }
  
  logger.info('Добавление неонового свечения', { 
    elementId: element.id || 'без ID',
    elementType: element.tagName,
    color
  });
  
  // Создаем эффект свечения
  element.style.transition = 'box-shadow 0.3s ease-in-out, text-shadow 0.3s ease-in-out';
  
  // Сохраняем оригинальные стили
  const originalBoxShadow = element.style.boxShadow;
  const originalTextShadow = element.style.textShadow;
  
  // Применяем эффект свечения
  element.style.boxShadow = `0 0 10px ${color}, 0 0 20px ${color}, 0 0 30px ${color}`;
  element.style.textShadow = `0 0 5px ${color}, 0 0 10px ${color}`;
  
  // Возвращаем оригинальные стили через некоторое время
  setTimeout(() => {
    element.style.boxShadow = originalBoxShadow;
    element.style.textShadow = originalTextShadow;
    logger.info('Неоновое свечение завершено', { elementId: element.id || 'без ID' });
  }, 300);
}

// Добавление эффекта "глючности" к тексту
function addGlitchEffect(element, duration = 2000) {
  // Проверяем, что элемент существует
  if (!element) {
    logger.warn('Не удалось добавить glitch-эффект: элемент не существует');
    return;
  }
  
  logger.info('Добавление glitch-эффекта', { 
    elementId: element.id || 'без ID', 
    elementType: element.tagName, 
    duration 
  });
  
  // Добавляем класс для эффекта
  element.classList.add('glitch-effect');
  
  // Текст внутри элемента
  const text = element.textContent;
  
  // Функция для создания "глючного" текста
  const createGlitchText = () => {
    // Символы для случайной замены
    const glitchChars = '!@#$%^&*()_+{}:"<>?|ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');
    
    // Заменяем случайные символы
    let glitchedText = '';
    for (let i = 0; i < text.length; i++) {
      if (Math.random() < 0.1) { // 10% вероятность замены
        glitchedText += glitchChars[Math.floor(Math.random() * glitchChars.length)];
      } else {
        glitchedText += text[i];
      }
    }
    
    return glitchedText;
  };
  
  // Запускаем эффект
  let glitchInterval;
  let stopTime = Date.now() + duration;
  
  // Функция для обновления текста
  const updateGlitch = () => {
    // Если время вышло, останавливаем эффект
    if (Date.now() > stopTime) {
      clearInterval(glitchInterval);
      element.textContent = text; // Возвращаем оригинальный текст
      element.classList.remove('glitch-effect');
      logger.info('Glitch-эффект завершен', { elementId: element.id || 'без ID' });
      return;
    }
    
    // Обновляем текст случайным образом
    if (Math.random() < 0.5) { // 50% вероятность обновления
      element.textContent = createGlitchText();
    }
  };
  
  // Запускаем интервал с случайной частотой обновления
  glitchInterval = setInterval(updateGlitch, 50 + Math.random() * 50);
}

/**
 * Создает эффект конфетти специально для достижений
 * @param {HTMLElement} targetElement - элемент, от которого будет расходиться конфетти
 */
function createAchievementConfetti(targetElement) {
  logger.info('Создание эффекта конфетти для достижения');
  
  const colors = [
    '#FFD700', // золото
    '#4CAF50', // зеленый
    '#2196F3', // синий
    '#9C27B0', // пурпурный
    '#FF5722'  // оранжевый
  ];
  
  const particleCount = 30;
  
  // Получаем позицию элемента
  const rect = targetElement.getBoundingClientRect();
  const startX = rect.left + rect.width / 2;
  const startY = rect.top + rect.height / 2;
  
  // Создаем контейнер для частиц
  const container = document.createElement('div');
  container.className = 'achievement-confetti-container';
  container.style.position = 'fixed';
  container.style.zIndex = '1000';
  container.style.left = '0';
  container.style.top = '0';
  container.style.width = '100%';
  container.style.height = '100%';
  container.style.pointerEvents = 'none';
  document.body.appendChild(container);
  
  // Создаем частицы
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'achievement-confetti-particle';
    particle.style.position = 'absolute';
    particle.style.left = `${startX}px`;
    particle.style.top = `${startY}px`;
    
    // Задаем случайный размер
    const size = Math.random() * 10 + 5; // от 5px до 15px
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    
    // Случайная форма (круг или звезда)
    const isCircle = Math.random() > 0.3; // 70% шанс на круг, 30% на звезду
    if (isCircle) {
      particle.style.borderRadius = '50%';
    } else {
      particle.innerHTML = '★';
      particle.style.display = 'flex';
      particle.style.alignItems = 'center';
      particle.style.justifyContent = 'center';
      particle.style.fontSize = `${size}px`;
      particle.style.color = colors[Math.floor(Math.random() * colors.length)];
    }
    
    // Случайный цвет
    particle.style.backgroundColor = isCircle ? colors[Math.floor(Math.random() * colors.length)] : 'transparent';
    
    // Задаем анимацию
    const angle = Math.random() * Math.PI * 2; // случайное направление
    const velocity = 2 + Math.random() * 4; // скорость
    const vx = Math.cos(angle) * velocity;
    const vy = Math.sin(angle) * velocity - 3; // больше вверх чем вбок
    
    // Добавляем частицу в контейнер
    container.appendChild(particle);
    
    // Анимируем частицу
    let posX = startX;
    let posY = startY;
    let opacity = 1;
    let rotation = 0;
    const rotationSpeed = Math.random() * 10 - 5; // скорость вращения
    
    const animate = () => {
      if (opacity <= 0) {
        particle.remove();
        return;
      }
      
      posX += vx;
      posY += vy + 0.5; // добавляем гравитацию
      opacity -= 0.02;
      rotation += rotationSpeed;
      
      particle.style.left = `${posX}px`;
      particle.style.top = `${posY}px`;
      particle.style.opacity = opacity;
      particle.style.transform = `rotate(${rotation}deg)`;
      
      requestAnimationFrame(animate);
    };
    
    requestAnimationFrame(animate);
  }
  
  // Удаляем контейнер через некоторое время
  setTimeout(() => {
    if (container.parentNode) {
      container.remove();
    }
  }, 3000);
}

// Экспорт функций
export {
  showConfetti,
  createConfettiEffect,
  createConfettiParticle,
  showScoreEffect,
  addDossierEffects,
  addArchiveEffects,
  createSuccessParticles,
  addNeonFlash,
  addGlitchEffect,
  createAchievementConfetti
}; 