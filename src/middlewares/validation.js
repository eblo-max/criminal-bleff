/**
 * Модуль валидации входных данных для API Криминального Блефа
 * Предоставляет middleware для проверки запросов на соответствие схемам
 */

const { createLogger } = require('../config/logger');
const { ValidationError } = require('../utils/errorHandler');
const Joi = require('joi');

const logger = createLogger('ValidationMiddleware');

/**
 * Валидирует тело запроса по указанной схеме
 * @param {Object} schema - Joi схема для валидации
 * @returns {Function} middleware для валидации
 */
function validateBody(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });
    
    if (error) {
      const details = error.details.map(detail => detail.message).join(', ');
      logger.warn(`Ошибка валидации данных запроса: ${details}`, {
        path: req.path,
        method: req.method,
        body: req.body
      });
      
      return next(new ValidationError(`Ошибка валидации: ${details}`));
    }
    
    // Обновляем тело запроса валидированными данными
    req.body = value;
    next();
  };
}

/**
 * Валидирует параметры запроса по указанной схеме
 * @param {Object} schema - Joi схема для валидации
 * @returns {Function} middleware для валидации
 */
function validateParams(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true
    });
    
    if (error) {
      const details = error.details.map(detail => detail.message).join(', ');
      logger.warn(`Ошибка валидации параметров запроса: ${details}`, {
        path: req.path,
        method: req.method,
        params: req.params
      });
      
      return next(new ValidationError(`Ошибка валидации: ${details}`));
    }
    
    // Обновляем параметры запроса валидированными данными
    req.params = value;
    next();
  };
}

/**
 * Валидирует параметры запроса в query по указанной схеме
 * @param {Object} schema - Joi схема для валидации
 * @returns {Function} middleware для валидации
 */
function validateQuery(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    });
    
    if (error) {
      const details = error.details.map(detail => detail.message).join(', ');
      logger.warn(`Ошибка валидации query-параметров: ${details}`, {
        path: req.path,
        method: req.method,
        query: req.query
      });
      
      return next(new ValidationError(`Ошибка валидации: ${details}`));
    }
    
    // Обновляем query запроса валидированными данными
    req.query = value;
    next();
  };
}

// Схемы валидации для различных эндпоинтов
const schemas = {
  // Схема для проверки ответа на вопрос
  submitAnswer: Joi.object({
    storyId: Joi.string().required().trim(),
    selectedOptionIndex: Joi.number().min(0).required(),
    isCorrect: Joi.boolean().required(),
    answerTimeMs: Joi.number().min(0).max(30000).required(),
    telegramUserId: Joi.number().allow(null)
  }),
  
  // Схема для завершения игры
  finishGame: Joi.object({
    score: Joi.number().min(0).required(),
    correctAnswers: Joi.number().min(0).required(),
    totalQuestions: Joi.number().min(0).required(),
    maxStreak: Joi.number().min(0).required(),
    telegramUserId: Joi.number().allow(null)
  }),
  
  // Схема для трекинга действий пользователя
  trackAction: Joi.object({
    action: Joi.string().required().trim(),
    gameId: Joi.string().required().trim(),
    cardId: Joi.string().when('action', {
      is: 'view_card',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    telegramUserId: Joi.number().allow(null)
  }),
  
  // Схема для получения профиля пользователя
  userProfile: Joi.object({
    telegramId: Joi.number().required()
  }),
  
  // Схема для лидерборда
  leaderboard: Joi.object({
    period: Joi.string().valid('daily', 'weekly', 'monthly', 'all-time').default('all-time'),
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(10)
  })
};

module.exports = {
  validateBody,
  validateParams,
  validateQuery,
  schemas
}; 