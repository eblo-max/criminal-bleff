/**
 * Основной конфигурационный файл приложения "Криминальный Блеф"
 */

import dotenv from 'dotenv';

// Загружаем переменные окружения из .env файла
dotenv.config();

const env = process.env.NODE_ENV || 'development';
const isDev = env === 'development';

// Базовая конфигурация
const config = {
  env,
  isDev,
  isProduction: env === 'production',
  
  // Настройки сервера
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || '0.0.0.0',
    cors: {
      origin: isDev 
        ? '*'
        : process.env.ALLOWED_ORIGINS
          ? process.env.ALLOWED_ORIGINS.split(',')
          : ['https://web-production-43380.up.railway.app', 'https://telegram.org', 'https://t.me'],
      credentials: true
    }
  },
  
  // Настройки базы данных
  database: {
    url: process.env.MONGODB_URI || 'mongodb://localhost:27017/criminal-bluff',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }
  },
  
  // Настройки Redis для кэширования
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    enabled: !!process.env.REDIS_URL
  },
  
  // Настройки JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-for-development',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d'
  },
  
  // Настройки Telegram
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    webhookUrl: process.env.TELEGRAM_WEBHOOK_URL
  },
  
  // Лимиты запросов
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 минут
    max: isDev ? 1000 : 100 // Лимит запросов
  }
};

export default config; 