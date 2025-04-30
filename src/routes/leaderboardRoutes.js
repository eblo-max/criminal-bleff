const express = require('express');
const router = express.Router();
const leaderboardController = require('../controllers/leaderboardController');
const { requireAuth } = require('../middlewares/auth');
const { validateLeaderboardQueryParams } = require('../utils/validator');
const { validateTelegramWebAppData } = require('../middlewares/auth');

// Публичные маршруты для таблицы лидеров
router.get('/daily', validateLeaderboardQueryParams, leaderboardController.getDailyLeaderboard);
router.get('/weekly', validateLeaderboardQueryParams, leaderboardController.getWeeklyLeaderboard);
router.get('/all-time', validateLeaderboardQueryParams, leaderboardController.getAllTimeLeaderboard);
router.get('/user/:userId', leaderboardController.getUserRank);

// Административные и служебные маршруты
router.post('/initialize', leaderboardController.initializeLeaderboards);
router.post('/update-ranks', requireAuth, leaderboardController.updateRanks);

module.exports = router; 