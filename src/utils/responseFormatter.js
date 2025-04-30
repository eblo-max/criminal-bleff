import { createLogger } from '../config/logger.js';

const logger = createLogger('ResponseFormatter');

/**
 * Утилиты для стандартизации форматов ответов API
 */

/**
 * Формирует успешный ответ API
 * @param {Object} res - Объект ответа Express
 * @param {Object|Array} data - Данные для включения в ответ
 * @param {string} message - Сообщение об успехе
 * @param {number} statusCode - HTTP-статус (по умолчанию 200)
 * @returns {Object} Форматированный ответ
 */
const success = (res, data = {}, message = 'Success', statusCode = 200) => {
  logger.info(`Success response: ${message}`, {
    statusCode,
    path: res.req.path,
    method: res.req.method
  });

  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

/**
 * Формирует ответ об ошибке API
 * @param {Object} res - Объект ответа Express
 * @param {string} error - Сообщение об ошибке
 * @param {number} statusCode - HTTP-статус (по умолчанию 400)
 * @param {Object} details - Дополнительные детали ошибки
 * @returns {Object} Форматированный ответ с ошибкой
 */
const error = (res, error = 'An error occurred', statusCode = 400, details = null) => {
  logger.error(`Error response: ${error}`, {
    statusCode,
    type: 'AppError',
    path: res.req.path,
    method: res.req.method
  });

  const response = {
    success: false,
    error
  };
  
  // Добавляем детали только если они предоставлены
  if (details) {
    response.details = details;
  }
  
  return res.status(statusCode).json(response);
};

const paginated = (res, data, total, page, limit, message = 'Success') => {
  const totalPages = Math.ceil(total / limit);
  
  logger.info(`Paginated response: ${message}`, {
    total,
    page,
    limit,
    totalPages,
    path: res.req.path,
    method: res.req.method
  });

  return res.status(200).json({
    status: 'success',
    message,
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages
    }
  });
};

const partial = (res, data, range, total, message = 'Partial content') => {
  const [start, end] = range;
  
  logger.info(`Partial response: ${message}`, {
    range: `${start}-${end}`,
    total,
    path: res.req.path,
    method: res.req.method
  });

  res.set('Content-Range', `items ${start}-${end}/${total}`);
  return res.status(206).json({
    status: 'success',
    message,
    data,
    range: {
      start,
      end,
      total
    }
  });
};

const conflict = (res, message = 'Conflict', data = null) => {
  logger.warn(`Conflict response: ${message}`, {
    path: res.req.path,
    method: res.req.method,
    data
  });

  return res.status(409).json({
    status: 'error',
    message,
    type: 'ConflictError',
    data
  });
};

const created = (res, data, message = 'Resource created successfully') => {
  return success(res, data, message, 201);
};

const updated = (res, data, message = 'Resource updated successfully') => {
  return success(res, data, message, 200);
};

const deleted = (res, message = 'Resource deleted successfully') => {
  return success(res, null, message, 204);
};

export {
  success,
  error,
  paginated,
  partial,
  conflict,
  created,
  updated,
  deleted
}; 