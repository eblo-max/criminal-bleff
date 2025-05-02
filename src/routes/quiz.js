import express from 'express';
import Story from '../models/Story.js';
import User from '../models/User.js';
import Achievement from '../models/Achievement.js';
import Game from '../models/Game.js';
import { createLogger } from '../utils/logger.js';
import { asyncHandler } from '../middlewares/async.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = express.Router();
const logger = createLogger('QuizRoutes');

// Маршрут для получения случайных историй
router.get('/stories/random', authMiddleware, asyncHandler(async (req, res) => {
    const { count = 5, difficulty, category } = req.query;
    
    logger.info(`Запрос на получение ${count} случайных историй.`);
    
    const options = {};
    if (difficulty) options.difficulty = difficulty;
    if (category) options.category = category;
    
    const stories = await Story.getRandomStories(parseInt(count), options);
    
    // Маркируем, что истории были использованы
    for (const story of stories) {
        await Story.findByIdAndUpdate(story._id, { $inc: { timesPlayed: 1 } });
    }
    
    res.json({ success: true, stories });
}));

// Маршрут для записи результата игры
router.post('/games', authMiddleware, asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { score, correctAnswers, totalQuestions, maxStreak, averageTime } = req.body;
    
    logger.info(`Сохранение результата игры для пользователя ${userId}`);
    
    if (!score || !correctAnswers || !totalQuestions) {
        return res.status(400).json({ success: false, message: 'Не все обязательные поля указаны' });
    }
    
    // Создаем запись об игре
    const game = new Game({
        userId,
        score,
        correctAnswers,
        totalQuestions,
        accuracy: (correctAnswers / totalQuestions) * 100,
        maxStreak: maxStreak || 0,
        averageTime: averageTime || 0
    });
    
    await game.save();
    
    // Обновляем статистику пользователя
    const user = await User.findById(userId);
    
    if (user) {
        user.totalGames = (user.totalGames || 0) + 1;
        user.totalScore = (user.totalScore || 0) + score;
        user.correctAnswers = (user.correctAnswers || 0) + correctAnswers;
        user.totalQuestions = (user.totalQuestions || 0) + totalQuestions;
        
        // Обновляем максимальную серию правильных ответов
        if (maxStreak && (!user.maxStreak || maxStreak > user.maxStreak)) {
            user.maxStreak = maxStreak;
        }
        
        await user.save();
    }
    
    res.json({ success: true, game });
}));

// Маршрут для добавления достижений
router.post('/achievements', authMiddleware, asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { achievements } = req.body;
    
    logger.info(`Обновление достижений для пользователя ${userId}`);
    
    if (!achievements || !Array.isArray(achievements)) {
        return res.status(400).json({ success: false, message: 'Некорректные данные достижений' });
    }
    
    // Получаем существующие достижения пользователя
    const user = await User.findById(userId).populate('achievements');
    const existingAchievementIds = user.achievements.map(a => a.id);
    
    // Добавляем новые достижения
    const newAchievements = [];
    
    for (const achievementData of achievements) {
        // Проверяем, есть ли уже такое достижение
        const existingAchievement = await Achievement.findOne({ code: achievementData.id });
        
        if (existingAchievement) {
            if (!existingAchievementIds.includes(existingAchievement.id)) {
                newAchievements.push(existingAchievement.id);
            }
        } else {
            // Создаем новое достижение
            const newAchievement = new Achievement({
                code: achievementData.id,
                name: achievementData.name,
                description: achievementData.description,
                category: 'quiz'
            });
            
            await newAchievement.save();
            newAchievements.push(newAchievement.id);
        }
    }
    
    // Обновляем пользователя с новыми достижениями
    if (newAchievements.length > 0) {
        await User.findByIdAndUpdate(userId, {
            $addToSet: { achievements: { $each: newAchievements } }
        });
    }
    
    res.json({ success: true, newAchievements: newAchievements.length });
}));

// Маршрут для получения всех возможных достижений
router.get('/achievements/all', authMiddleware, asyncHandler(async (req, res) => {
    const achievements = await Achievement.find({ category: 'quiz' });
    
    // Получаем достижения пользователя
    const user = await User.findById(req.user.id).populate('achievements');
    const userAchievementIds = user.achievements.map(a => a.id.toString());
    
    // Отмечаем, какие достижения у пользователя уже есть
    const achievementsWithStatus = achievements.map(achievement => {
        const isUnlocked = userAchievementIds.includes(achievement.id.toString());
        return {
            id: achievement.id,
            code: achievement.code,
            name: achievement.name,
            description: achievement.description,
            unlocked: isUnlocked
        };
    });
    
    res.json({ success: true, achievements: achievementsWithStatus });
}));

// Маршрут для получения рейтинга
router.get('/leaderboard', asyncHandler(async (req, res) => {
    const { period = 'weekly', limit = 10 } = req.query;
    
    // Определяем временной диапазон
    let dateFilter = {};
    const now = new Date();
    
    if (period === 'daily') {
        // За сегодня (начало дня)
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        dateFilter = { createdAt: { $gte: startOfDay } };
    } else if (period === 'weekly') {
        // За последние 7 дней
        const lastWeek = new Date(now);
        lastWeek.setDate(now.getDate() - 7);
        dateFilter = { createdAt: { $gte: lastWeek } };
    }
    // Если 'all-time', то фильтр по дате не нужен
    
    // Получаем игры с фильтром по дате
    const games = await Game.find(dateFilter)
        .sort({ score: -1 })
        .limit(parseInt(limit))
        .populate('userId', 'username photoUrl');
    
    // Формируем рейтинг
    const leaderboard = games.map(game => ({
        userId: game.userId._id,
        username: game.userId.username,
        photoUrl: game.userId.photoUrl,
        score: game.score,
        correctAnswers: game.correctAnswers,
        totalQuestions: game.totalQuestions,
        accuracy: game.accuracy,
        date: game.createdAt
    }));
    
    res.json({ success: true, period, leaderboard });
}));

// Маршрут для получения профиля пользователя
router.get('/profile', authMiddleware, asyncHandler(async (req, res) => {
    const userId = req.user.id;
    
    const user = await User.findById(userId).populate('achievements');
    
    if (!user) {
        return res.status(404).json({ success: false, message: 'Пользователь не найден' });
    }
    
    // Рассчитываем процент правильных ответов
    const correctPercentage = user.totalQuestions > 0 
        ? Math.round((user.correctAnswers / user.totalQuestions) * 100) 
        : 0;
    
    // Получаем позицию в рейтинге
    const betterScores = await Game.countDocuments({ 
        score: { $gt: user.totalScore || 0 } 
    });
    const rank = betterScores + 1;
    
    // Форматируем достижения
    const achievements = user.achievements.map(achievement => ({
        id: achievement.id,
        code: achievement.code,
        name: achievement.name,
        description: achievement.description,
        unlocked: true
    }));
    
    const profile = {
        id: user.id,
        username: user.username,
        photoUrl: user.photoUrl,
        totalGames: user.totalGames || 0,
        totalScore: user.totalScore || 0,
        correctAnswers: user.correctAnswers || 0,
        totalQuestions: user.totalQuestions || 0,
        correctPercentage,
        maxStreak: user.maxStreak || 0,
        rank,
        achievements
    };
    
    res.json({ success: true, profile });
}));

// Маршрут для обновления профиля пользователя
router.put('/profile', authMiddleware, asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { username, photoUrl } = req.body;
    
    const updateFields = {};
    if (username) updateFields.username = username;
    if (photoUrl) updateFields.photoUrl = photoUrl;
    
    // Обновляем только разрешенные поля
    const user = await User.findByIdAndUpdate(
        userId,
        { $set: updateFields },
        { new: true, runValidators: true }
    ).populate('achievements');
    
    if (!user) {
        return res.status(404).json({ success: false, message: 'Пользователь не найден' });
    }
    
    res.json({ success: true, user });
}));

export default router; 