const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { createLogger } = require('../config/logger');
const cacheService = require('../services/cacheService');
const { success, error } = require('../utils/responseFormatter');

const logger = createLogger('HealthRoutes');

// Общая проверка здоровья сервиса
router.get('/', (req, res) => {
  return success(res, { status: 'ok' }, 'Service is healthy', 200);
});

// Проверка подключения к базе данных
router.get('/db', async (req, res) => {
  try {
    const status = mongoose.connection.readyState;
    const statusMap = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    
    if (status === 1) {
      return success(
        res, 
        { status: statusMap[status], details: 'MongoDB connection is healthy' }, 
        'Database check completed', 
        200
      );
    } else {
      return error(
        res, 
        { status: statusMap[status], details: 'MongoDB connection is not ready' }, 
        'Database health check failed', 
        503
      );
    }
  } catch (err) {
    logger.error('Health check for database failed:', err);
    return error(
      res, 
      { error: err.message }, 
      'Database health check error', 
      500
    );
  }
});

// Проверка подключения к Redis
router.get('/redis', async (req, res) => {
  try {
    // Проверяем подключение к Redis
    const redisStatus = await cacheService.checkHealth();
    
    if (redisStatus.isConnected) {
      return success(
        res, 
        { 
          status: 'connected', 
          details: redisStatus.details || 'Redis connection is healthy' 
        }, 
        'Redis check completed', 
        200
      );
    } else {
      return error(
        res, 
        { 
          status: 'disconnected', 
          details: redisStatus.details || 'Redis connection is not ready' 
        }, 
        'Redis health check failed', 
        503
      );
    }
  } catch (err) {
    logger.error('Health check for Redis failed:', err);
    return error(
      res, 
      { error: err.message }, 
      'Redis health check error', 
      500
    );
  }
});

module.exports = router; 