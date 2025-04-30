// Функция для динамического импорта ESM модулей
async function setupAdminPanel(app) {
  try {
    // Импортируем важные пакеты для совместимости с ESM
    const AdminJS = await import('adminjs').then(m => m.default || m);
    const AdminJSExpress = await import('@adminjs/express').then(m => m.default || m);
    const AdminJSMongoose = await import('@adminjs/mongoose').then(m => m.default || m);
    
    const mongoose = require('mongoose');
    const session = require('express-session');
    const { createLogger } = require('../utils/logger');

    // Модели для админки
    const User = require('../models/User');
    const Story = require('../models/Story');
    const Achievement = require('../models/Achievement');
    const Leaderboard = require('../models/Leaderboard');

    const logger = createLogger('AdminJS');

    // Регистрируем адаптер Mongoose
    AdminJS.registerAdapter({
      Resource: AdminJSMongoose.Resource,
      Database: AdminJSMongoose.Database,
    });

    const DEFAULT_ADMIN = {
      email: process.env.ADMIN_EMAIL || 'admin@criminalbluff.com',
      password: process.env.ADMIN_PASSWORD || 'admin123',
    };

    // Находит или создает админа в базе данных
    const authenticate = async (email, password) => {
      if (email === DEFAULT_ADMIN.email && password === DEFAULT_ADMIN.password) {
        return Promise.resolve(DEFAULT_ADMIN);
      }
      return null;
    };

    // Настройка ресурсов для админки
    const adminOptions = {
      resources: [
        {
          resource: User,
          options: {
            navigation: {
              name: 'Пользователи',
              icon: 'User',
            },
            properties: {
              achievements: {
                type: 'mixed',
              },
              stats: {
                type: 'mixed',
              },
            },
          }
        },
        {
          resource: Story,
          options: {
            navigation: {
              name: 'Истории',
              icon: 'Book',
            },
          }
        },
        {
          resource: Achievement,
          options: {
            navigation: {
              name: 'Достижения',
              icon: 'Star',
            },
            properties: {
              criteria: {
                type: 'mixed',
              },
            },
          }
        },
        {
          resource: Leaderboard,
          options: {
            navigation: {
              name: 'Лидерборды',
              icon: 'Award',
            },
            properties: {
              entries: {
                type: 'mixed',
              },
            },
          }
        },
      ],
      branding: {
        companyName: 'Criminal Bluff Admin',
        logo: false,
        softwareBrothers: false,
        theme: {
          colors: {
            primary100: '#1C2026',
            primary80: '#2D3139',
            primary60: '#3E424A',
            primary40: '#646871',
            primary20: '#898D95',
            grey100: '#151A1F',
            grey80: '#2D353F',
            grey60: '#5A6A7F',
            grey40: '#8895A7',
            grey20: '#C6CDD5',
            accent: '#E83333',
            hoverBg: '#252A31',
          },
        },
      },
      // Временно отключаем custom dashboard для тестирования
      /* 
      dashboard: {
        component: AdminJS.bundle('./dashboard'),
      },
      */
      rootPath: '/admin',
    };

    // Создаем экземпляр AdminJS
    const admin = new AdminJS(adminOptions);

    // Обработчик сессий
    const sessionOptions = {
      secret: process.env.SESSION_SECRET || 'supersecretcookie',
      resave: false,
      saveUninitialized: true,
      cookie: { 
        httpOnly: true,
        maxAge: 60 * 60 * 1000, // 1 час
      },
    };

    // Создаем роутер для админки - упрощенная версия без аутентификации для тестирования
    const router = AdminJSExpress.buildRouter(admin);

    /* Версия с аутентификацией - раскомментировать после отладки
    const router = AdminJSExpress.buildAuthenticatedRouter(
      admin,
      {
        authenticate,
        cookieName: 'adminjs',
        cookiePassword: process.env.COOKIE_SECRET || 'supersecretcookiepassword',
      },
      null,
      sessionOptions
    );
    */

    // Подключаем админку к приложению
    app.use(admin.options.rootPath, router);
    
    logger.info(`AdminJS started on ${admin.options.rootPath}`);
    
    return admin;
  } catch (error) {
    console.error('Error initializing AdminJS:', error);
    return null;
  }
}

module.exports = setupAdminPanel; 