const TelegramBot = require('node-telegram-bot-api');
const { createLogger } = require('../utils/logger');
const Story = require('../models/Story');

// Создаем логгер для бота
const logger = createLogger('TelegramBot');

// URL вашего Telegram Mini App
const MINI_APP_URL = 'https://first-bot-production.up.railway.app';

// Инициализация бота с токеном
class TelegramBotService {
  constructor() {
    this.token = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!this.token) {
      logger.error('TELEGRAM_BOT_TOKEN не найден в переменных окружения');
      return;
    }
    
    // Создаем экземпляр бота
    this.bot = new TelegramBot(this.token, { polling: true });
    
    // Инициализируем обработчики команд
    this.initCommandHandlers();
    
    logger.info('Telegram бот запущен');
  }
  
  // Настройка обработчиков команд
  initCommandHandlers() {
    // Команда /start
    this.bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;
      const firstName = msg.from.first_name || 'там';
      
      const welcomeMessage = `Привет, ${firstName}! 👋\n\nЯ бот для игры "Криминальный Блеф".\n\nНажми кнопку ниже, чтобы начать играть!`;
      
      // Отправляем приветственное сообщение с кнопкой для запуска Mini App
      this.bot.sendMessage(chatId, welcomeMessage, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🎮 Играть', web_app: { url: MINI_APP_URL } }]
          ]
        }
      });
    });
    
    // Команда /play
    this.bot.onText(/\/play/, (msg) => {
      const chatId = msg.chat.id;
      
      this.bot.sendMessage(chatId, 'Нажми кнопку ниже, чтобы начать игру:', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🎮 Играть', web_app: { url: MINI_APP_URL } }]
          ]
        }
      });
    });
    
    // Команда /help
    this.bot.onText(/\/help/, (msg) => {
      const chatId = msg.chat.id;
      
      const helpMessage = `*Криминальный Блеф* - игра-викторина, где ты угадываешь ошибки преступников в реальных историях.

*Доступные команды:*
/start - Запуск бота
/play - Начать игру
/help - Справка
/leaderboard - Посмотреть лидерборд
/achievements - Мои достижения
/stories - Просмотр историй

Чтобы играть, просто нажми кнопку "Играть" после любой команды.`;
      
      this.bot.sendMessage(chatId, helpMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🎮 Играть', web_app: { url: MINI_APP_URL } }]
          ]
        }
      });
    });
    
    // Команда /leaderboard
    this.bot.onText(/\/leaderboard/, (msg) => {
      const chatId = msg.chat.id;
      
      this.bot.sendMessage(chatId, 'Нажми кнопку ниже, чтобы увидеть таблицу лидеров:', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🏆 Таблица лидеров', web_app: { url: `${MINI_APP_URL}?page=leaderboard` } }]
          ]
        }
      });
    });
    
    // Команда /achievements
    this.bot.onText(/\/achievements/, (msg) => {
      const chatId = msg.chat.id;
      
      this.bot.sendMessage(chatId, 'Нажми кнопку ниже, чтобы увидеть свои достижения:', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🏅 Мои достижения', web_app: { url: `${MINI_APP_URL}?page=achievements` } }]
          ]
        }
      });
    });
    
    // Команда /stories - для просмотра историй
    this.bot.onText(/\/stories(?:\s+(\d{4}-\d{2}-\d{2}))?/, async (msg, match) => {
      const chatId = msg.chat.id;
      const dateParam = match[1]; // Опциональный параметр даты (YYYY-MM-DD)
      
      try {
        // Создаем базовый запрос
        let query = {};
        let messageText = '📚 *Последние истории:*\n\n';
        
        // Если указана дата, фильтруем истории по этой дате
        if (dateParam) {
          const startDate = new Date(dateParam);
          const endDate = new Date(dateParam);
          endDate.setDate(endDate.getDate() + 1);
          
          query.createdAt = { 
            $gte: startDate, 
            $lt: endDate 
          };
          
          messageText = `📚 *Истории за ${dateParam}:*\n\n`;
        }
        
        // Получаем истории из базы данных
        const stories = await Story.find(query)
          .sort({ createdAt: -1 })
          .limit(5)
          .select('title difficulty category createdAt');
        
        if (stories.length === 0) {
          if (dateParam) {
            return this.bot.sendMessage(chatId, `Истории за ${dateParam} не найдены.`);
          } else {
            return this.bot.sendMessage(chatId, 'В базе данных пока нет историй.');
          }
        }
        
        // Формируем сообщение со списком историй
        stories.forEach(story => {
          const date = story.createdAt.toISOString().split('T')[0];
          messageText += `*${story.title}*\n`;
          messageText += `Сложность: ${this.getDifficultyEmoji(story.difficulty)} ${story.difficulty}\n`;
          messageText += `Категория: ${this.getCategoryEmoji(story.category)} ${story.category}\n`;
          messageText += `Дата: ${date}\n\n`;
        });
        
        // Добавляем инструкцию по получению историй за конкретную дату
        if (!dateParam) {
          messageText += 'Чтобы посмотреть истории за определенную дату, используйте команду:\n';
          messageText += '`/stories YYYY-MM-DD`';
        }
        
        // Отправляем сообщение с кнопкой для игры
        await this.bot.sendMessage(chatId, messageText, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🎮 Играть', web_app: { url: MINI_APP_URL } }]
            ]
          }
        });
        
      } catch (error) {
        logger.error(`Ошибка при получении историй: ${error.message}`);
        this.bot.sendMessage(chatId, 'Произошла ошибка при получении историй. Пожалуйста, попробуйте позже.');
      }
    });
    
    // Обработчик для неизвестных команд
    this.bot.on('message', (msg) => {
      // Проверяем, является ли сообщение командой
      if (msg.text && msg.text.startsWith('/') && !msg.text.match(/^\/(start|play|help|leaderboard|achievements|stories)/)) {
        const chatId = msg.chat.id;
        
        this.bot.sendMessage(chatId, 'Неизвестная команда. Используйте /help для просмотра доступных команд.');
      }
    });
  }
  
  // Вспомогательный метод для получения эмодзи сложности
  getDifficultyEmoji(difficulty) {
    switch(difficulty) {
    case 'easy': return '🟢';
    case 'medium': return '🟡';
    case 'hard': return '🔴';
    default: return '⚪';
    }
  }
  
  // Вспомогательный метод для получения эмодзи категории
  getCategoryEmoji(category) {
    switch(category) {
    case 'robbery': return '💰';
    case 'theft': return '🔍';
    case 'fraud': return '📝';
    case 'other': return '📦';
    default: return '❓';
    }
  }
  
  // Метод для отправки уведомления о получении достижения
  async sendAchievementNotification(telegramId, achievementData) {
    try {
      const message = `🏆 *Поздравляем!*\n\nВы получили новое достижение:\n\n*${achievementData.name}*\n\n${achievementData.description}`;
      
      await this.bot.sendMessage(telegramId, message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🎮 Продолжить игру', web_app: { url: MINI_APP_URL } }]
          ]
        }
      });
      
      logger.info(`Отправлено уведомление о достижении ${achievementData.code} пользователю ${telegramId}`);
    } catch (error) {
      logger.error(`Ошибка при отправке уведомления о достижении: ${error.message}`);
    }
  }
  
  // Метод для отправки результатов игры
  async sendGameResults(telegramId, gameResults) {
    try {
      const { correctAnswers, totalQuestions, score } = gameResults;
      
      const message = `🎮 *Результаты игры*\n\nПравильных ответов: *${correctAnswers}/${totalQuestions}*\nОчки: *${score}*\n\nСыграйте еще раз, чтобы улучшить свой результат!`;
      
      await this.bot.sendMessage(telegramId, message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🎮 Играть снова', web_app: { url: MINI_APP_URL } }],
            [{ text: '🏆 Таблица лидеров', web_app: { url: `${MINI_APP_URL}?page=leaderboard` } }]
          ]
        }
      });
      
      logger.info(`Отправлены результаты игры пользователю ${telegramId}`);
    } catch (error) {
      logger.error(`Ошибка при отправке результатов игры: ${error.message}`);
    }
  }
}

// Экспортируем singleton экземпляр для использования во всем приложении
const telegramBotService = new TelegramBotService();

module.exports = telegramBotService; 