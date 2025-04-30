const logger = require('../utils/logger');
const ValidationError = require('../errors/ValidationError');
const NotFoundError = require('../errors/NotFoundError');

/**
 * Централизованный обработчик ошибок для Express
 */
module.exports = (err, req, res, next) => {
  // Логируем ошибку
  logger.error(`[${req.method}] ${req.path} - Error:`, err);
  
  // Форматируем ответ в зависимости от типа ошибки
  let statusCode = 500;
  let errorMessage = 'Внутренняя ошибка сервера';
  let errorDetails = null;
  
  // Проверяем тип ошибки
  if (err instanceof ValidationError) {
    statusCode = err.statusCode;
    errorMessage = err.message;
    errorDetails = err.details;
  } else if (err instanceof NotFoundError) {
    statusCode = err.statusCode;
    errorMessage = err.message;
    errorDetails = err.details;
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorMessage = 'Недействительный токен авторизации';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorMessage = 'Истек срок действия токена';
  } else if (err.statusCode) {
    // Если ошибка содержит statusCode, используем его
    statusCode = err.statusCode;
    errorMessage = err.message || errorMessage;
  }
  
  // Формируем ответ на ошибку
  const errorResponse = {
    success: false,
    error: errorMessage
  };
  
  // Добавляем детали ошибки, если они есть и не в продакшене
  if (errorDetails && process.env.NODE_ENV !== 'production') {
    errorResponse.details = errorDetails;
  }
  
  // В продакшене скрываем стек ошибки, в разработке показываем
  if (process.env.NODE_ENV !== 'production' && err.stack) {
    errorResponse.stack = err.stack;
  }
  
  // Отправляем ответ
  res.status(statusCode).json(errorResponse);
}; 