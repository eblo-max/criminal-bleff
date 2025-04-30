import mongoose from 'mongoose';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('UserModel');

// Схема статистики пользователя
const statSchema = new mongoose.Schema({
  totalGames: {
    type: Number,
    default: 0
  },
  correctAnswers: {
    type: Number,
    default: 0
  },
  totalScore: {
    type: Number,
    default: 0
  },
  totalTime: {
    type: Number,
    default: 0
  },
  averageTime: {
    type: Number,
    default: 0
  },
  accuracy: {
    type: Number,
    default: 0
  },
  currentStreak: {
    type: Number,
    default: 0
  },
  maxStreak: {
    type: Number,
    default: 0
  }
});

const userSchema = new mongoose.Schema({
  telegramId: {
    type: String,
    required: false,
    unique: true,
    sparse: true
  },
  username: {
    type: String,
    required: false
  },
  firstName: {
    type: String,
    required: false
  },
  lastName: {
    type: String,
    required: false
  },
  stats: {
    type: statSchema,
    default: () => ({})
  },
  achievements: [{
    type: String,
    enum: ['first_win', 'win_streak', 'master_detective', 'quick_solver', 'perfect_score']
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastActive: {
    type: Date,
    default: Date.now
  }
});

// Методы модели
userSchema.methods.updateScore = function(points) {
  this.stats.totalScore += points;
  return this.save();
};

userSchema.methods.addAchievement = function(achievement) {
  if (!this.achievements.includes(achievement)) {
    this.achievements.push(achievement);
    return this.save();
  }
  return this;
};

// Статические методы
userSchema.statics.findByTelegramId = function(telegramId) {
  return this.findOne({ telegramId });
};

userSchema.statics.getTopPlayers = function(limit = 10) {
  return this.find()
    .sort({ 'stats.totalScore': -1 })
    .limit(limit)
    .select('username stats.totalScore stats.totalGames stats.correctAnswers');
};

// Индексы
userSchema.index({ telegramId: 1 });
userSchema.index({ createdAt: 1 });
userSchema.index({ 'stats.totalScore': -1 });

const User = mongoose.model('User', userSchema);

export default User; 