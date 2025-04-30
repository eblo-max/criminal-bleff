const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { requireAuth, validateTelegramUser } = require('../middlewares/auth');
const User = require('../models/User');

// Маршруты для пользователей
router.post('/create', userController.createUser);
router.post('/login', userController.login);
router.get('/profile/:telegramId', requireAuth, userController.getProfile);
router.get('/achievements/:telegramId', requireAuth, userController.getAchievements);
router.get('/achievements/progress/:telegramId', requireAuth, userController.getAchievementsProgress);

// Тестовый endpoint для получения списка пользователей
router.get('/list-all', async (req, res) => {
  try {
    const users = await User.find({}).select('_id username telegramId');
    return res.status(200).json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Ошибка при получении пользователей:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router; 