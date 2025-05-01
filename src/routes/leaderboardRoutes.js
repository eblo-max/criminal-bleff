import express from 'express';
import leaderboardController from '../controllers/leaderboardController.js';
import { requireAuth, validateTelegramWebAppData } from '../middlewares/auth.js';
import { validateLeaderboardQueryParams } from '../utils/validator.js';

const router = express.Router();

// Публичные маршруты для таблицы лидеров
router.get('/daily', validateLeaderboardQueryParams, leaderboardController.getDailyLeaderboard);
router.get('/weekly', validateLeaderboardQueryParams, leaderboardController.getWeeklyLeaderboard);
router.get('/all-time', validateLeaderboardQueryParams, leaderboardController.getAllTimeLeaderboard);
router.get('/user/:userId', leaderboardController.getUserRank);

// Административные и служебные маршруты
router.post('/initialize', leaderboardController.initializeLeaderboards);
router.post('/update-ranks', requireAuth, leaderboardController.updateRanks);

export default router; 