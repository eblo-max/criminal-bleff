const userRoutes = require('./routes/userRoutes');
const gameRoutes = require('./routes/gameRoutes');
const achievementRoutes = require('./routes/achievementRoutes');
const leaderboardRoutes = require('./routes/leaderboardRoutes');
const telegramRoutes = require('./routes/telegramRoutes');
const storyRoutes = require('./routes/storyRoutes');
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');

// Подключаем обработчик ошибок
const errorHandler = require('./middlewares/errorHandler');

// Маршруты API
app.use('/api/user', userRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/telegram', telegramRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/auth', authRoutes);
app.use('/health', healthRoutes);

// Добавляем middleware для обработки ошибок
app.use(errorHandler);

// Базовый маршрут для проверки работоспособности
app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Criminal Bluff API Service' });
}); 