const mongoose = require('mongoose');
const { createLogger } = require('../utils/logger');

const logger = createLogger('GameCardModel');

const gameCardSchema = new mongoose.Schema({
  gameId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Game',
    required: true
  },
  cardId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Card',
    required: true
  },
  seen: {
    type: Boolean,
    default: false
  },
  answered: {
    type: Boolean,
    default: false
  },
  userAnswer: {
    type: Boolean,
    default: null
  },
  isCorrect: {
    type: Boolean,
    default: null
  },
  timeSpent: {
    type: Number, // в секундах
    default: 0
  },
  pointsAwarded: {
    type: Number,
    default: 0
  },
  answeredAt: {
    type: Date
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Составной индекс для быстрого поиска карточек в рамках игры
gameCardSchema.index({ gameId: 1, cardId: 1 }, { unique: true });
gameCardSchema.index({ gameId: 1, order: 1 });
gameCardSchema.index({ cardId: 1 });

// Метод для отметки карточки как просмотренной
gameCardSchema.methods.markAsSeen = function() {
  this.seen = true;
  return this.save();
};

// Метод для сохранения ответа пользователя
gameCardSchema.methods.saveAnswer = function(answer, timeSpent, isCorrect, points) {
  this.answered = true;
  this.userAnswer = answer;
  this.isCorrect = isCorrect;
  this.timeSpent = timeSpent || this.timeSpent;
  this.pointsAwarded = points || 0;
  this.answeredAt = new Date();
  return this.save();
};

// Статический метод для получения карточек игры
gameCardSchema.statics.findByGameId = function(gameId) {
  return this.find({ gameId })
    .sort({ order: 1 })
    .populate('cardId');
};

// Статический метод для получения статистики ответов на карточку
gameCardSchema.statics.getCardStats = function(cardId) {
  return this.aggregate([
    { $match: { cardId: mongoose.Types.ObjectId(cardId) } },
    { $group: {
        _id: null,
        totalAnswers: { $sum: { $cond: [{ $eq: ["$answered", true] }, 1, 0] } },
        correctAnswers: { $sum: { $cond: [{ $eq: ["$isCorrect", true] }, 1, 0] } },
        averageTime: { $avg: "$timeSpent" }
      }
    }
  ]);
};

// Обработчик pre-save для логирования
gameCardSchema.pre('save', function(next) {
  if (this.isModified('answered') && this.answered) {
    logger.info(`Ответ на карточку ${this.cardId} в игре ${this.gameId} сохранен. Правильно: ${this.isCorrect}`);
  }
  next();
});

const GameCard = mongoose.model('GameCard', gameCardSchema);

module.exports = GameCard; 