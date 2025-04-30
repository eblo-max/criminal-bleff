const mongoose = require('mongoose');
const { createLogger } = require('../utils/logger');

const logger = createLogger('LeaderboardModel');

// Схема для записи в лидерборде
const leaderboardEntrySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true
  },
  score: {
    type: Number,
    required: true,
    default: 0
  },
  rank: {
    type: String,
    required: true,
    default: 'Новичок',
    enum: ['Новичок', 'Опытный', 'Профессионал', 'Эксперт', 'Мастер', 'Легенда']
  },
  gamesPlayed: {
    type: Number,
    default: 0
  },
  wins: {
    type: Number,
    default: 0
  },
  winRate: {
    type: Number,
    default: 0
  }
});

// Основная схема лидерборда
const leaderboardSchema = new mongoose.Schema({
  period: {
    type: String,
    enum: ['daily', 'weekly', 'all-time'],
    required: true,
    unique: true
  },
  entries: {
    type: [leaderboardEntrySchema],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Методы для обновления записей лидерборда
leaderboardSchema.methods.updateEntry = function(userId, username, score) {
  // Найти существующую запись или создать новую
  const existingEntry = this.entries.find(entry => entry.userId.toString() === userId.toString());
  
  if (existingEntry) {
    // Обновить существующую запись
    existingEntry.score += score;
    existingEntry.gamesPlayed += 1;
    if (score > 0) {
      existingEntry.wins += 1;
    }
    existingEntry.winRate = (existingEntry.wins / existingEntry.gamesPlayed) * 100;
  } else {
    // Создать новую запись
    this.entries.push({
      userId,
      username,
      score,
      rank: 'Новичок',
      gamesPlayed: 1,
      wins: score > 0 ? 1 : 0,
      winRate: score > 0 ? 100 : 0
    });
  }
  
  // Пересчитать ранги всех записей
  this.updateRanks();
  
  this.updatedAt = Date.now();
  return this.save();
};

// Обновление рангов внутри лидерборда
leaderboardSchema.methods.updateRanks = function() {
  // Сортируем записи по убыванию очков
  this.entries.sort((a, b) => b.score - a.score);
  
  // Обновляем ранги на основе позиции
  this.entries.forEach((entry, index) => {
    if (index < 3) {
      entry.rank = 'Легенда';
    } else if (index < 10) {
      entry.rank = 'Мастер';
    } else if (index < 50) {
      entry.rank = 'Эксперт';
    } else if (index < 100) {
      entry.rank = 'Профессионал';
    } else if (index < 500) {
      entry.rank = 'Опытный';
    } else {
      entry.rank = 'Новичок';
    }
  });
};

// Статические методы
leaderboardSchema.statics.getTopPlayers = async function(period, limit = 10) {
  const leaderboard = await this.findOne({ period });
  if (!leaderboard) return [];
  
  return leaderboard.entries
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
};

leaderboardSchema.statics.getUserRank = async function(userId, period) {
  const leaderboard = await this.findOne({ period });
  if (!leaderboard) return null;
  
  return leaderboard.entries.find(entry => entry.userId.toString() === userId.toString());
};

// Индексы
leaderboardSchema.index({ period: 1 });
leaderboardSchema.index({ createdAt: 1 });

const Leaderboard = mongoose.model('Leaderboard', leaderboardSchema);

module.exports = Leaderboard; 