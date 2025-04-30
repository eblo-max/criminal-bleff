const express = require('express');
const router = express.Router();
const { errorHandler } = require('../utils/errorHandler');
const { rateLimiter } = require('../middlewares/rateLimiter');

// Импорт всех маршрутов
const gameRoutes = require('./gameRoutes');
const userRoutes = require('./userRoutes');
const leaderboardRoutes = require('./leaderboardRoutes');

// Применение rate limiting ко всем маршрутам
router.use(rateLimiter);

// Подключение маршрутов
router.use('/api/game', gameRoutes);
router.use('/api/user', userRoutes);
router.use('/api/leaderboard', leaderboardRoutes);

// Обработка 404
router.use((req, res, next) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found'
  });
});

// Глобальная обработка ошибок
router.use(errorHandler);

module.exports = router; 