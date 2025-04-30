const mongoose = require('mongoose');
const { createLogger } = require('../utils/logger');

const logger = createLogger('CardModel');

const cardSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    trim: true
  },
  truth: {
    type: Boolean,
    required: true
  },
  explanation: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: ['general', 'cyber', 'history', 'scam', 'tech'],
    default: 'general'
  },
  difficulty: {
    type: Number,
    min: 1,
    max: 5,
    default: 1
  },
  tags: [{
    type: String,
    trim: true
  }],
  author: {
    type: String,
    required: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  usageCount: {
    type: Number,
    default: 0
  },
  correctAnswersCount: {
    type: Number,
    default: 0
  },
  incorrectAnswersCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Индексы для оптимизации запросов
cardSchema.index({ category: 1 });
cardSchema.index({ difficulty: 1 });
cardSchema.index({ tags: 1 });
cardSchema.index({ isActive: 1 });
cardSchema.index({ usageCount: 1 });

// Виртуальное поле для расчета процента правильных ответов
cardSchema.virtual('correctAnswerPercentage').get(function() {
  const total = this.correctAnswersCount + this.incorrectAnswersCount;
  if (total === 0) return 0;
  return Math.round((this.correctAnswersCount / total) * 100);
});

// Метод для обновления статистики карточки
cardSchema.methods.updateStats = function(wasCorrect) {
  this.usageCount += 1;
  if (wasCorrect) {
    this.correctAnswersCount += 1;
  } else {
    this.incorrectAnswersCount += 1;
  }
  return this.save();
};

// Статический метод для получения случайных карточек
cardSchema.statics.getRandomCards = function(count = 10, filters = {}) {
  const query = { isActive: true, ...filters };
  return this.aggregate([
    { $match: query },
    { $sample: { size: count } }
  ]);
};

// Статический метод для получения карточек по категории
cardSchema.statics.getByCategory = function(category, limit = 20) {
  return this.find({ category, isActive: true })
    .limit(limit)
    .sort({ createdAt: -1 });
};

// Обработчик pre-save для логирования
cardSchema.pre('save', function(next) {
  if (this.isNew) {
    logger.info(`Новая карточка создана: ${this.question}`);
  }
  next();
});

const Card = mongoose.model('Card', cardSchema);

module.exports = Card; 