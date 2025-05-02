import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createLogger } from './utils/logger.js';
import { errorHandler } from './middlewares/error.js';
import securityMiddleware from './middlewares/security.js';
import apiRouter from './routes/api.js';
import userRouter from './routes/user.js';
import quizRouter from './routes/quiz.js';
import rateLimiter from './middlewares/rate-limiter.js';
import config from './config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const logger = createLogger('app');

// Настройка CORS
const corsOptions = {
  origin: ['https://web-production-43380.up.railway.app', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Настройка безопасности
app.use(helmet());
app.use(securityMiddleware);
app.use(cors(corsOptions));

// Парсеры для запросов
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Лимитирование запросов
app.use(rateLimiter);

// Логирование всех запросов
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`);
  next();
});

// Статические файлы
app.use(express.static(path.join(__dirname, '../public')));

// Маршруты API
app.use('/api', apiRouter);
app.use('/api/user', userRouter);
app.use('/api/quiz', quizRouter);  // Новые маршруты для игры-викторины

// Любые другие GET запросы возвращают основную страницу
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Обработчик ошибок
app.use(errorHandler);

export default app; 