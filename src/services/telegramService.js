import axios from 'axios';
import { createLogger } from '../config/logger.js';
import User from '../models/User.js';

const logger = createLogger('telegramService');

class TelegramService {
  constructor() {
    this.token = process.env.TELEGRAM_BOT_TOKEN;
    this.apiUrl = `https://api.telegram.org/bot${this.token}`;
    this.enabled = !!this.token;
    this.adminId = process.env.TELEGRAM_ADMIN_ID;
    
    if (!this.enabled) {
      logger.warn('Telegram интеграция отключена: отсутствует токен в TELEGRAM_BOT_TOKEN');
    } else {
      logger.info('Telegram сервис инициализирован');
      if (this.adminId) {
        logger.info(`Telegram админ ID настроен: ${this.adminId}`);
      } else {
        logger.warn('Telegram админ ID не настроен в TELEGRAM_ADMIN_ID');
      }
    }
  }

  /**
   * Отправляет сообщение пользователю в Telegram
   * @param {string} chatId - ID чата/пользователя в Telegram
   * @param {string} text - Текст сообщения
   * @param {Object} options - Дополнительные опции для сообщения
   * @returns {Promise<Object>} - Ответ от Telegram API
   */
  async sendMessage(chatId, text, options = {}) {
    if (!this.enabled) {
      logger.warn('Попытка отправить сообщение при отключенной интеграции');
      return null;
    }

    try {
      const response = await axios.post(`${this.apiUrl}/sendMessage`, {
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
        ...options
      });

      logger.info(`Сообщение успешно отправлено пользователю ${chatId}`);
      return response.data;
    } catch (error) {
      logger.error(`Ошибка при отправке сообщения в Telegram: ${error.message}`);
      if (error.response) {
        logger.error(`Статус ошибки: ${error.response.status}`);
        logger.error(`Данные ошибки: ${JSON.stringify(error.response.data)}`);
      }
      return null;
    }
  }

  /**
   * Отправляет приветственное сообщение новому пользователю
   * @param {string} chatId - ID чата/пользователя в Telegram
   * @param {string} username - Имя пользователя
   * @returns {Promise<Object>} - Ответ от Telegram API
   */
  async sendWelcomeMessage(chatId, username) {
    const welcomeText = `👋 Привет, <b>${username}</b>!\n\n` +
      'Твой аккаунт успешно привязан к Criminal Bluff. Теперь ты будешь получать уведомления о важных событиях игры.\n\n' +
      '🔍 <b>Что я умею:</b>\n' +
      '- Сообщать о полученных достижениях\n' +
      '- Уведомлять о новых игровых событиях\n' +
      '- Присылать напоминания о ежедневных наградах\n\n' +
      'Удачи в расследованиях, детектив! 🕵️';
    
    return this.sendMessage(chatId, welcomeText);
  }

  /**
   * Отправляет сообщение об отвязке аккаунта
   * @param {string} chatId - ID чата/пользователя в Telegram
   * @returns {Promise<Object>} - Ответ от Telegram API
   */
  async sendUnlinkMessage(chatId) {
    const unlinkText = '🔔 <b>Уведомление</b>\n\n' +
      'Твой аккаунт был отвязан от Criminal Bluff.\n' +
      'Ты больше не будешь получать уведомления от игры.\n\n' +
      'Если это произошло по ошибке, ты можешь заново привязать аккаунт в настройках игры.';
    
    return this.sendMessage(chatId, unlinkText);
  }

  /**
   * Отправляет уведомление о полученном достижении
   * @param {string} chatId - ID чата/пользователя в Telegram
   * @param {Object} achievement - Информация о достижении
   * @returns {Promise<Object>} - Ответ от Telegram API
   */
  async sendAchievementNotification(chatId, achievement) {
    const achievementText = '🏆 <b>Новое достижение!</b>\n\n' +
      `<b>${achievement.title}</b>\n` +
      `${achievement.description}\n\n` +
      `Очки: +${achievement.points}`;
    
    return this.sendMessage(chatId, achievementText);
  }

  /**
   * Отправляет уведомление о еженедельных результатах
   * @param {string} chatId - ID чата/пользователя в Telegram
   * @param {Object} stats - Статистика пользователя
   * @returns {Promise<Object>} - Ответ от Telegram API
   */
  async sendWeeklyReport(chatId, stats) {
    const reportText = '📊 <b>Твои результаты за неделю</b>\n\n' +
      `Игр сыграно: <b>${stats.gamesPlayed}</b>\n` +
      `Правильных ответов: <b>${stats.correctAnswers}</b>\n` +
      `Неправильных ответов: <b>${stats.wrongAnswers}</b>\n` +
      `Процент успеха: <b>${stats.successRate}%</b>\n\n` +
      `Место в рейтинге: <b>${stats.rank}</b> ${this.getRankEmoji(stats.rank)}\n\n` +
      'Так держать, детектив! 🕵️';
    
    return this.sendMessage(chatId, reportText);
  }

  /**
   * Возвращает эмодзи в зависимости от места в рейтинге
   * @param {number} rank - Место в рейтинге
   * @returns {string} - Эмодзи
   */
  getRankEmoji(rank) {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    if (rank <= 10) return '🏅';
    return '';
  }

  /**
   * Устанавливает вебхук для бота
   * @param {string} url - URL для вебхука
   * @returns {Promise<Object>} - Результат операции
   */
  async setWebhook(url) {
    if (!this.enabled) {
      logger.warn('Попытка установить вебхук при отключенной интеграции');
      return { success: false, message: 'Telegram интеграция отключена: отсутствует токен' };
    }

    try {
      const response = await axios.post(`${this.apiUrl}/setWebhook`, {
        url: url,
        allowed_updates: ['message', 'callback_query', 'inline_query']
      });

      if (response.data.ok) {
        logger.info(`Вебхук успешно установлен на ${url}`);
        return { success: true, data: response.data, message: 'Вебхук успешно установлен' };
      } else {
        logger.error(`Ошибка при установке вебхука: ${response.data.description}`);
        return { success: false, message: response.data.description };
      }
    } catch (error) {
      logger.error(`Ошибка при установке вебхука: ${error.message}`);
      return { 
        success: false, 
        message: error.response ? error.response.data.description : error.message 
      };
    }
  }

  /**
   * Получает информацию о текущем вебхуке
   * @returns {Promise<Object>} - Информация о вебхуке
   */
  async getWebhookInfo() {
    if (!this.enabled) {
      logger.warn('Попытка получить информацию о вебхуке при отключенной интеграции');
      return null;
    }

    try {
      const response = await axios.get(`${this.apiUrl}/getWebhookInfo`);
      return response.data;
    } catch (error) {
      logger.error(`Ошибка при получении информации о вебхуке: ${error.message}`);
      return null;
    }
  }

  /**
   * Обрабатывает обновление от Telegram
   * @param {Object} update - Объект обновления от Telegram
   * @returns {Promise<void>}
   */
  async processUpdate(update) {
    if (!this.enabled) {
      logger.warn('Попытка обработать обновление при отключенной интеграции');
      return;
    }

    try {
      // Обработка сообщений
      if (update.message) {
        await this.processMessage(update.message);
      }

      // Обработка callback_query (нажатия на inline кнопки)
      if (update.callback_query) {
        await this.processCallbackQuery(update.callback_query);
      }
    } catch (error) {
      logger.error(`Ошибка при обработке обновления от Telegram: ${error.message}`);
    }
  }

  /**
   * Обрабатывает сообщение от пользователя
   * @param {Object} message - Объект сообщения от Telegram
   * @returns {Promise<void>}
   */
  async processMessage(message) {
    const chatId = message.chat.id;
    const text = message.text;

    if (!text) return;

    // Обработка команд
    if (text.startsWith('/')) {
      const command = text.split(' ')[0].substring(1);
      switch (command) {
      case 'start':
        await this.handleStartCommand(chatId, message.from);
        break;
      case 'help':
        await this.handleHelpCommand(chatId);
        break;
      case 'link':
        await this.handleLinkCommand(chatId, message);
        break;
      default:
        // Неизвестная команда
        await this.sendMessage(chatId, 'Неизвестная команда. Используйте /help для получения списка команд.');
      }
    } else {
      // Обработка обычных сообщений
      await this.handleTextMessage(chatId, text, message.from);
    }
  }

  /**
   * Обработка команды /start
   * @param {number} chatId - ID чата
   * @param {Object} user - Информация о пользователе
   */
  async handleStartCommand(chatId, user) {
    const startText = `👋 Привет, <b>${user.first_name}</b>!\n\n` +
      'Добро пожаловать в бота Criminal Bluff! Я помогаю следить за игровыми событиями и достижениями.\n\n' +
      'Чтобы привязать свой аккаунт, используй команду /link или соответствующую кнопку в приложении.\n\n' +
      'Для получения списка команд используй /help.';
    
    await this.sendMessage(chatId, startText);
  }

  /**
   * Обработка команды /help
   * @param {number} chatId - ID чата
   */
  async handleHelpCommand(chatId) {
    const helpText = '🔍 <b>Доступные команды:</b>\n\n' +
      '/start - Начать взаимодействие с ботом\n' +
      '/help - Показать список команд\n' +
      '/link - Привязать аккаунт (если вы уже в игре, используйте кнопку в приложении)\n\n' +
      'Если у тебя возникли проблемы или вопросы, обратись в поддержку через игру.';
    
    await this.sendMessage(chatId, helpText);
  }

  /**
   * Обработка команды /link
   * @param {number} chatId - ID чата
   * @param {Object} message - Сообщение пользователя
   */
  async handleLinkCommand(chatId, message) {
    const linkText = '🔗 <b>Привязка аккаунта</b>\n\n' +
      'Для привязки аккаунта перейди в игру и используй соответствующую кнопку в настройках.\n\n' +
      'Твой Telegram ID: <code>' + chatId + '</code>\n\n' +
      'Скопируй этот ID и вставь его в поле "Telegram ID" в настройках игры.';
    
    await this.sendMessage(chatId, linkText);
  }

  /**
   * Обработка обычного текстового сообщения
   * @param {number} chatId - ID чата
   * @param {string} text - Текст сообщения
   * @param {Object} from - Информация о пользователе
   */
  async handleTextMessage(chatId, text, from) {
    // Проверяем, привязан ли пользователь к аккаунту
    const user = await User.findOne({ telegramId: chatId });
    
    if (user) {
      await this.sendMessage(chatId, `Твое сообщение получено, ${user.username || 'детектив'}! Если нужна помощь, используй команду /help.`);
    } else {
      await this.sendMessage(chatId, 'Твой аккаунт не привязан к игре. Используй команду /link для привязки или перейди в настройки игры.');
    }
  }

  /**
   * Обработка callback query (нажатия на inline кнопки)
   * @param {Object} query - Объект callback query
   */
  async processCallbackQuery(query) {
    const chatId = query.message.chat.id;
    const data = query.data;
    
    // Обработка различных типов callback query
    switch (data) {
    case 'help':
      await this.handleHelpCommand(chatId);
      break;
    case 'link':
      await this.handleLinkCommand(chatId, query.message);
      break;
    default:
      // Неизвестный callback query
      await this.sendMessage(chatId, 'Неизвестная команда.');
    }
    
    // Отправляем ответ на callback query
    try {
      await axios.post(`${this.apiUrl}/answerCallbackQuery`, {
        callback_query_id: query.id
      });
    } catch (error) {
      logger.error(`Ошибка при ответе на callback query: ${error.message}`);
    }
  }
}

export default TelegramService; 