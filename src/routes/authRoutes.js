const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Маршруты для аутентификации
router.post('/login', authController.login);
router.post('/verify', authController.verify);

module.exports = router; 