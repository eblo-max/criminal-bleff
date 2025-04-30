const { body, validationResult } = require('express-validator');
const { createLogger } = require('../config/logger');
const { ValidationError } = require('./errorHandler');

const logger = createLogger('Validator');

// Общие правила валидации
const commonRules = {
  username: body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers and underscores'),

  email: body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),

  password: body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter and one number'),

  telegramId: body('telegramId')
    .isInt()
    .withMessage('Telegram ID must be a number')
    .toInt(),

  score: body('score')
    .isInt({ min: 0 })
    .withMessage('Score must be a non-negative number')
    .toInt(),

  difficulty: body('difficulty')
    .isIn(['easy', 'medium', 'hard'])
    .withMessage('Difficulty must be one of: easy, medium, hard'),

  category: body('category')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Category must be between 2 and 50 characters'),

  period: body('period')
    .isIn(['daily', 'weekly', 'all-time'])
    .withMessage('Period must be one of: daily, weekly, all-time'),

  rank: body('rank')
    .isInt({ min: 1 })
    .withMessage('Rank must be a positive number')
    .toInt(),

  streak: body('streak')
    .isInt({ min: 0 })
    .withMessage('Streak must be a non-negative number')
    .toInt()
};

// Middleware для проверки результатов валидации
const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg);
    logger.warn('Validation failed', {
      errors: errorMessages,
      path: req.path,
      method: req.method
    });
    
    throw new ValidationError(errorMessages.join(', '));
  }
  
  next();
};

// Валидация для создания пользователя
const validateUserCreation = [
  commonRules.telegramId,
  commonRules.username,
  validate
];

// Валидация для обновления пользователя
const validateUserUpdate = [
  commonRules.username.optional(),
  commonRules.score.optional(),
  validate
];

// Валидация для создания истории
const validateStoryCreation = [
  body('text')
    .trim()
    .isLength({ min: 10 })
    .withMessage('Story text must be at least 10 characters long'),
  
  body('options')
    .isArray({ min: 2, max: 4 })
    .withMessage('Story must have between 2 and 4 options'),
  
  body('options.*')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Each option must not be empty'),
  
  body('correctAnswer')
    .isInt({ min: 0 })
    .withMessage('Correct answer must be a valid index')
    .custom((value, { req }) => {
      if (value >= req.body.options.length) {
        throw new Error('Correct answer index out of bounds');
      }
      return true;
    }),
  
  body('explanation')
    .trim()
    .isLength({ min: 10 })
    .withMessage('Explanation must be at least 10 characters long'),
  
  commonRules.difficulty,
  commonRules.category,
  validate
];

// Валидация для обновления таблицы лидеров
const validateLeaderboardUpdate = [
  commonRules.score,
  commonRules.period,
  validate
];

// Валидация для получения таблицы лидеров
const validateLeaderboardQuery = [
  commonRules.period,
  body('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
  body('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative number')
    .toInt(),
  validate
];

function validateUserData(userData) {
  if (!userData) {
    throw new ValidationError('User data is required');
  }

  if (!userData.telegramId) {
    throw new ValidationError('Telegram ID is required');
  }

  if (typeof userData.telegramId !== 'string' && typeof userData.telegramId !== 'number') {
    throw new ValidationError('Invalid Telegram ID format');
  }

  // Optional fields validation
  if (userData.username && typeof userData.username !== 'string') {
    throw new ValidationError('Username must be a string');
  }

  if (userData.firstName && typeof userData.firstName !== 'string') {
    throw new ValidationError('First name must be a string');
  }

  if (userData.lastName && typeof userData.lastName !== 'string') {
    throw new ValidationError('Last name must be a string');
  }
}

// Валидация запроса лидерборда (как middleware)
const validateLeaderboardQueryParams = (req, res, next) => {
  try {
    const { page, limit } = req.query;
    
    req.query.page = parseInt(page, 10) || 1;
    req.query.limit = parseInt(limit, 10) || 10;
    
    if (req.query.page < 1) {
      req.query.page = 1;
    }
    
    if (req.query.limit < 1) {
      req.query.limit = 10;
    }
    
    if (req.query.limit > 100) {
      req.query.limit = 100;
    }
    
    next();
  } catch (error) {
    next(new ValidationError('Invalid query parameters'));
  }
};

// Валидация ID пользователя
const validateUserId = (userId) => {
  if (!userId) {
    throw new ValidationError('User ID is required');
  }
  
  return true;
};

// Валидация периода лидерборда
const validateLeaderboardPeriod = (period) => {
  const validPeriods = ['daily', 'weekly', 'all-time'];
  
  if (!validPeriods.includes(period)) {
    throw new ValidationError(`Invalid period: ${period}. Must be one of: ${validPeriods.join(', ')}`);
  }
  
  return true;
};

module.exports = {
  commonRules,
  validate,
  validateUserCreation,
  validateUserUpdate,
  validateStoryCreation,
  validateLeaderboardUpdate,
  validateLeaderboardQuery,
  validateUserData,
  validateUserId,
  validateLeaderboardPeriod,
  validateLeaderboardQueryParams
}; 