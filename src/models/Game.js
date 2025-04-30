const mongoose = require('mongoose');
const { createLogger } = require('../utils/logger');

const logger = createLogger('GameModel');

const gameSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  telegramId: {
    type: String,
    required: false
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'abandoned'],
    default: 'active'
  },
  score: {
    type: Number,
    default: 0
  },
  correctAnswers: {
    type: Number,
    default: 0
  },
  totalQuestions: {
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
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  duration: {
    type: Number, // в секундах
    default: 0
  }
}, {
  timestamps: true
});

// Индексы для ускорения запросов
gameSchema.index({ userId: 1 });
gameSchema.index({ telegramId: 1 });
gameSchema.index({ startTime: -1 });
gameSchema.index({ status: 1 });
gameSchema.index({ score: -1 });

// Виртуальное поле для вычисления длительности игры
gameSchema.virtual('gameDuration').get(function() {
  if (this.endTime && this.startTime) {
    return Math.round((this.endTime - this.startTime) / 1000);
  }
  return 0;
});

// Метод для обновления счета игры
gameSchema.methods.updateScore = function(points) {
  this.score += points;
  return this.save();
};

// Метод для завершения игры
gameSchema.methods.finishGame = function(score, correctAnswers, totalQuestions) {
  this.status = 'completed';
  this.endTime = new Date();
  this.score = score || this.score;
  this.correctAnswers = correctAnswers || this.correctAnswers;
  this.totalQuestions = totalQuestions || this.totalQuestions;
  this.duration = this.gameDuration;
  return this.save();
};

// Статический метод для получения активных игр пользователя
gameSchema.statics.findActiveByUserId = function(userId) {
  return this.findOne({ userId, status: 'active' });
};

// Статический метод для получения истории игр пользователя
gameSchema.statics.findByUserId = function(userId, limit = 10) {
  return this.find({ userId })
    .sort({ startTime: -1 })
    .limit(limit);
};

// Обработчик pre-save для логирования
gameSchema.pre('save', function(next) {
  if (this.isNew) {
    logger.info(`Новая игра создана для пользователя: ${this.userId}`);
  } else if (this.isModified('status') && this.status === 'completed') {
    logger.info(`Игра ${this._id} завершена с результатом: ${this.score} очков, ${this.correctAnswers}/${this.totalQuestions} правильных ответов`);
  }
  next();
});

const Game = mongoose.model('Game', gameSchema);

module.exports = Game; 