import { createLogger } from '../utils/logger.js';
import ValidationError from '../errors/ValidationError.js';
import NotFoundError from '../errors/NotFoundError.js';

const logger = createLogger('ErrorHandler');

/**
 * Базовый класс для всех ошибок приложения
 */
class AppError extends Error {
  constructor(message, statusCode, name = 'AppError') {
    super(message);
    this.statusCode = statusCode || 500;
    this.name = name;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Ошибка БД
 */
class DatabaseError extends AppError {
  constructor(message = 'Database operation failed', originalError = null) {
    super(message, 500, 'DatabaseError');
    this.originalError = originalError;
  }
}

/**
 * Ошибка авторизации
 */
class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access', originalError = null) {
    super(message, 401, 'UnauthorizedError');
    this.originalError = originalError;
  }
}

/**
 * Ошибка доступа
 */
class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden', originalError = null) {
    super(message, 403, 'ForbiddenError');
    this.originalError = originalError;
  }
}

/**
 * Ошибка пользовательских данных
 */
class UserError extends AppError {
  constructor(message = 'User operation failed', originalError = null) {
    super(message, 400, 'UserError');
    this.originalError = originalError;
  }
}

/**
 * Ошибка игровой логики
 */
class GameError extends AppError {
  constructor(message = 'Game operation failed', originalError = null) {
    super(message, 500, 'GameError');
    this.originalError = originalError;
  }
}

/**
 * Ошибка лидерборда
 */
class LeaderboardError extends AppError {
  constructor(message = 'Leaderboard operation failed', originalError = null) {
    super(message, 500, 'LeaderboardError');
    this.originalError = originalError;
  }
}

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Логирование ошибки
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    name: err.name,
    statusCode: err.statusCode
  });

  // Безопасные сообщения об ошибках
  const errorResponse = {
    status: err.status,
    message: process.env.NODE_ENV === 'production' 
      ? getSafeErrorMessage(err) 
      : err.message
  };

  // Добавление дополнительной информации в development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
    errorResponse.name = err.name;
  }

  res.status(err.statusCode).json(errorResponse);
};

// Безопасные сообщения об ошибках для production
const getSafeErrorMessage = (err) => {
  if (err.isOperational) {
    return err.message;
  }

  switch (err.name) {
  case 'ValidationError':
    return 'Invalid input data';
  case 'AuthenticationError':
    return 'Authentication failed';
  case 'AuthorizationError':
    return 'Access denied';
  case 'NotFoundError':
    return 'Resource not found';
  case 'RateLimitError':
    return 'Too many requests';
  case 'DatabaseError':
    return 'Database operation failed';
  case 'UnauthorizedError':
    return 'Unauthorized';
  case 'UserError':
    return 'User operation failed';
  case 'ForbiddenError':
    return 'Access forbidden';
  case 'GameError':
  case 'LeaderboardError':
    return 'Leaderboard operation failed';
  default:
    return 'An error occurred';
  }
};

export {
  AppError,
  ValidationError,
  UnauthorizedError as AuthenticationError,
  ForbiddenError as AuthorizationError,
  UnauthorizedError,
  NotFoundError,
  ForbiddenError as RateLimitError,
  DatabaseError,
  UserError,
  ForbiddenError as CacheError,
  ForbiddenError as NetworkError,
  LeaderboardError,
  GameError,
  errorHandler
}; 