import mongoose from 'mongoose';
import User from '../models/User.js';
import TelegramService from '../services/telegramService.js';
import { GameError } from '../utils/errorHandler.js';
import { createLogger } from '../config/logger.js';

const logger = createLogger('telegramController');
const telegramService = new TelegramService();

/**
 * Связывает аккаунт пользователя с Telegram ID
 * @param {Object} req - Express request объект
 * @param {Object} res - Express response объект
 * @param {Function} next - Express next middleware функция
 */
const linkUserAccount = async (req, res, next) => {
  try {
    const { userId, telegramId } = req.body;

    if (!userId) {
      throw new GameError('Отсутствует ID пользователя', 400);
    }

    if (!telegramId) {
      throw new GameError('Отсутствует Telegram ID', 400);
    }

    // Преобразуем userId в ObjectId, если это строка
    let userObjectId;
    try {
      userObjectId = mongoose.Types.ObjectId.isValid(userId) 
        ? new mongoose.Types.ObjectId(userId)
        : userId;
    } catch (error) {
      logger.warn(`Невалидный формат userId: ${userId}`);
      throw new GameError('Невалидный формат ID пользователя', 400);
    }

    // Проверяем, существует ли пользователь
    const user = await User.findById(userObjectId);
    if (!user) {
      throw new GameError('Пользователь не найден', 404);
    }

    // Проверяем, не привязан ли telegramId к другому пользователю
    const existingUser = await User.findOne({ telegramId });
    if (existingUser && existingUser._id.toString() !== user._id.toString()) {
      throw new GameError('Данный Telegram ID уже привязан к другому аккаунту', 400);
    }

    // Обновляем пользователя с Telegram ID
    user.telegramId = telegramId;
    await user.save();

    logger.info(`Пользователь ${user._id} привязан к Telegram ID ${telegramId}`);

    // Отправляем приветственное сообщение
    await telegramService.sendWelcomeMessage(telegramId, user.username || 'детектив');

    res.status(200).json({
      success: true,
      data: {
        user: {
          _id: user._id,
          username: user.username,
          telegramId: user.telegramId
        }
      },
      message: 'Аккаунт успешно привязан к Telegram'
    });
  } catch (error) {
    logger.error(`Ошибка при привязке Telegram аккаунта: ${error.message}`);
    next(error);
  }
};

/**
 * Отвязывает аккаунт пользователя от Telegram
 * @param {Object} req - Express request объект
 * @param {Object} res - Express response объект
 * @param {Function} next - Express next middleware функция
 */
const unlinkUserAccount = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      throw new GameError('Отсутствует ID пользователя', 400);
    }

    // Преобразуем userId в ObjectId, если это строка
    let userObjectId;
    try {
      userObjectId = mongoose.Types.ObjectId.isValid(userId) 
        ? new mongoose.Types.ObjectId(userId)
        : userId;
    } catch (error) {
      logger.warn(`Невалидный формат userId: ${userId}`);
      throw new GameError('Невалидный формат ID пользователя', 400);
    }

    // Проверяем, существует ли пользователь
    const user = await User.findById(userObjectId);
    if (!user) {
      throw new GameError('Пользователь не найден', 404);
    }

    // Проверяем, привязан ли пользователь к Telegram
    if (!user.telegramId) {
      throw new GameError('Пользователь не привязан к Telegram', 400);
    }

    const telegramId = user.telegramId;

    // Отвязываем Telegram ID
    user.telegramId = undefined;
    await user.save();

    logger.info(`Пользователь ${user._id} отвязан от Telegram ID ${telegramId}`);

    // Отправляем сообщение об отвязке
    await telegramService.sendUnlinkMessage(telegramId);

    res.status(200).json({
      success: true,
      data: {
        user: {
          _id: user._id,
          username: user.username
        }
      },
      message: 'Аккаунт успешно отвязан от Telegram'
    });
  } catch (error) {
    logger.error(`Ошибка при отвязке Telegram аккаунта: ${error.message}`);
    next(error);
  }
};

/**
 * Проверяет, привязан ли пользователь к Telegram
 * @param {Object} req - Express request объект
 * @param {Object} res - Express response объект
 * @param {Function} next - Express next middleware функция
 */
const checkUserLink = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      throw new GameError('Отсутствует ID пользователя', 400);
    }

    // Преобразуем userId в ObjectId, если это строка
    let userObjectId;
    try {
      userObjectId = mongoose.Types.ObjectId.isValid(userId) 
        ? new mongoose.Types.ObjectId(userId)
        : userId;
    } catch (error) {
      logger.warn(`Невалидный формат userId: ${userId}`);
      throw new GameError('Невалидный формат ID пользователя', 400);
    }

    // Проверяем, существует ли пользователь
    const user = await User.findById(userObjectId);
    if (!user) {
      throw new GameError('Пользователь не найден', 404);
    }

    res.status(200).json({
      success: true,
      data: {
        isLinked: !!user.telegramId,
        telegramId: user.telegramId || null
      }
    });
  } catch (error) {
    logger.error(`Ошибка при проверке привязки к Telegram: ${error.message}`);
    next(error);
  }
};

/**
 * Обрабатывает входящие обновления от Telegram
 * @param {Object} req - Express request объект
 * @param {Object} res - Express response объект
 * @param {Function} next - Express next middleware функция
 */
const handleWebhook = async (req, res, next) => {
  try {
    const update = req.body;
    
    logger.info('Получено обновление от Telegram webhook');
    logger.debug('Данные обновления:', JSON.stringify(update));
    
    // Передаем обновление в telegramService для обработки
    await telegramService.processUpdate(update);
    
    // Быстрый ответ для Telegram
    res.status(200).send('OK');
  } catch (error) {
    logger.error(`Ошибка при обработке webhook: ${error.message}`);
    // В случае ошибки все равно отправляем 200 OK, чтобы Telegram не пытался повторить запрос
    res.status(200).send('Error processing webhook');
  }
};

/**
 * Устанавливает вебхук для Telegram бота
 * @param {Object} req - Express request объект
 * @param {Object} res - Express response объект
 * @param {Function} next - Express next middleware функция
 */
const setWebhook = async (req, res, next) => {
  try {
    const webhookUrl = req.query.url || `${process.env.API_URL}/api/telegram/webhook`;
    
    const result = await telegramService.setWebhook(webhookUrl);
    
    if (result.success) {
      logger.info(`Вебхук успешно установлен на ${webhookUrl}`);
      res.status(200).json({
        success: true,
        message: `Вебхук успешно установлен на ${webhookUrl}`,
        data: result.data
      });
    } else {
      throw new GameError(`Не удалось установить вебхук: ${result.message}`, 400);
    }
  } catch (error) {
    logger.error(`Ошибка при установке вебхука: ${error.message}`);
    next(error);
  }
};

// Создаем объект контроллера
const telegramController = {
  linkUserAccount,
  unlinkUserAccount,
  checkUserLink,
  handleWebhook,
  setWebhook
};

export default telegramController; 