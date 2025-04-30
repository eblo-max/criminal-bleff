const express = require('express');
const { authenticate } = require('../middlewares/authMiddleware');
const telegramController = require('../controllers/telegramController');

const router = express.Router();

/**
 * @route POST /api/telegram/link
 * @desc Связать аккаунт пользователя с Telegram ID
 * @access Private
 */
router.post('/link', authenticate, telegramController.linkUserAccount);

/**
 * @route DELETE /api/telegram/unlink/:userId
 * @desc Отвязать аккаунт пользователя от Telegram
 * @access Private
 */
router.delete('/unlink/:userId', authenticate, telegramController.unlinkUserAccount);

/**
 * @route GET /api/telegram/check/:userId
 * @desc Проверить, привязан ли пользователь к Telegram
 * @access Private
 */
router.get('/check/:userId', authenticate, telegramController.checkUserLink);

/**
 * @route POST /api/telegram/webhook
 * @desc Вебхук для приема обновлений от Telegram бота
 * @access Public
 */
router.post('/webhook', telegramController.handleWebhook);

/**
 * @route GET /api/telegram/set-webhook
 * @desc Установить вебхук для Telegram бота
 * @access Private
 */
router.get('/set-webhook', authenticate, telegramController.setWebhook);

module.exports = router; 