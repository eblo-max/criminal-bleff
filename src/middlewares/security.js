import rateLimit from 'express-rate-limit';
import { createLogger } from '../utils/logger.js';
import ValidationError from '../errors/ValidationError.js';
import { getRedisClient } from '../config/redis.js';

const logger = createLogger('SecurityMiddleware');

// Ограничение частоты запросов
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100, // максимум 100 запросов
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      status: 'error',
      message: 'Too many requests, please try again later'
    });
  }
});

// Защита от повторных запросов (idempotency)
const idempotencyProtection = async (req, res, next) => {
  // Проверяем только для методов, изменяющих данные
  const methodsToCheck = ['POST', 'PUT', 'DELETE', 'PATCH'];
  
  if (!methodsToCheck.includes(req.method)) {
    return next();
  }
  
  // Проверяем наличие идентификатора запроса
  const idempotencyKey = req.headers['idempotency-key'];
  
  // Если ключ отсутствует для некоторых API-маршрутов, можно пропустить
  if (!idempotencyKey) {
    // Для критических маршрутов требуем ключ
    if (req.path.includes('/api/game/submit') || req.path.includes('/api/game/finish')) {
      logger.warn(`Missing idempotency key for critical endpoint: ${req.path}`, {
        ip: req.ip,
        method: req.method,
        path: req.path
      });
      return res.status(400).json({
        status: 'error',
        message: 'Idempotency-Key header is required for this operation'
      });
    }
    // Для других маршрутов пропускаем
    return next();
  }
  
  try {
    // Генерируем уникальный ключ для Redis на основе ключа идемпотентности и пути запроса
    const redisKey = `idempotency:${idempotencyKey}:${req.path}`;
    const client = getRedisClient();
    
    // Проверяем, существует ли такой ключ в Redis
    const exists = await client.get(redisKey);
    
    if (exists) {
      logger.warn(`Duplicate request detected with Idempotency-Key: ${idempotencyKey}`, {
        ip: req.ip,
        method: req.method,
        path: req.path
      });
      
      // Если запрос уже обрабатывался, возвращаем сохраненный ответ
      return res.status(409).json({
        status: 'error',
        message: 'Duplicate request detected. The request with this Idempotency-Key was already processed.',
        idempotencyKey
      });
    }
    
    // Сохраняем признак обработки запроса в Redis с TTL в 24 часа
    await client.set(redisKey, Date.now().toString(), 'EX', 86400);
    
    // Модифицируем ответ, чтобы добавить заголовок Idempotency-Key в ответ
    const originalSend = res.send;
    res.send = function(body) {
      res.setHeader('Idempotency-Key', idempotencyKey);
      return originalSend.call(this, body);
    };
    
    next();
  } catch (error) {
    logger.error('Error in idempotency checking:', error);
    // В случае ошибки пропускаем запрос, чтобы не блокировать работу
    next();
  }
};

// Безопасные заголовки
const securityHeaders = (req, res, next) => {
  // Защита от XSS
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Защита от MIME-sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Защита от clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // CSP - согласованная с главной конфигурацией в app.js
  res.setHeader(
    'Content-Security-Policy',
    'default-src \'self\'; script-src \'self\' \'unsafe-inline\' \'unsafe-eval\' https://telegram.org; ' +
    'style-src \'self\' \'unsafe-inline\'; img-src \'self\' data: https: blob:; ' +
    'connect-src \'self\' https://web-production-43380.up.railway.app https://t.me https://web.telegram.org; ' +
    'font-src \'self\' https: data:; object-src \'none\'; media-src \'self\'; ' +
    'frame-src https://telegram.org https://t.me https://web.telegram.org'
  );
  
  // HSTS
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  
  next();
};

// Санитизация входных данных
const validateInput = (req, res, next) => {
  try {
    // Очистка строковых параметров
    const cleanString = (str) => {
      if (typeof str !== 'string') return str;
      return str.replace(/[<>]/g, '');
    };

    // Очистка тела запроса
    if (req.body) {
      Object.keys(req.body).forEach(key => {
        if (typeof req.body[key] === 'string') {
          req.body[key] = cleanString(req.body[key]);
        }
      });
    }

    // Очистка параметров запроса
    if (req.query) {
      Object.keys(req.query).forEach(key => {
        if (typeof req.query[key] === 'string') {
          req.query[key] = cleanString(req.query[key]);
        }
      });
    }

    // Очистка параметров URL
    if (req.params) {
      Object.keys(req.params).forEach(key => {
        if (typeof req.params[key] === 'string') {
          req.params[key] = cleanString(req.params[key]);
        }
      });
    }

    next();
  } catch (error) {
    logger.error('Input validation error:', error);
    next(new ValidationError('Invalid input data'));
  }
};

export {
  rateLimiter,
  securityHeaders,
  validateInput,
  idempotencyProtection
}; 