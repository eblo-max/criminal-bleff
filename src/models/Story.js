import mongoose from 'mongoose';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('StoryModel');

const mistakeSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true
  },
  correct: {
    type: String,
    required: true
  }
});

const storySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    required: true
  },
  category: {
    type: String,
    enum: ['robbery', 'theft', 'fraud', 'murder', 'other'],
    required: true
  },
  mistakes: {
    type: [mistakeSchema],
    validate: [
      {
        validator: function(mistakes) {
          return mistakes.length > 0;
        },
        message: 'Story must have at least one mistake'
      },
      {
        validator: function(mistakes) {
          return mistakes.length <= 5;
        },
        message: 'Story cannot have more than 5 mistakes'
      }
    ]
  },
  explanation: {
    type: String,
    default: ''
  },
  imageUrl: {
    type: String,
    default: 'img/stories/default.jpg'
  },
  timesPlayed: {
    type: Number,
    default: 0
  },
  correctGuesses: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Методы модели
storySchema.methods.incrementPlayed = function() {
  this.timesPlayed += 1;
  return this.save();
};

storySchema.methods.incrementCorrectGuesses = function() {
  this.correctGuesses += 1;
  return this.save();
};

// Виртуальные поля
storySchema.virtual('correctRate').get(function() {
  if (this.timesPlayed === 0) return 0;
  return (this.correctGuesses / this.timesPlayed) * 100;
});

// Преобразование JSON
storySchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

// Статические методы
storySchema.statics.findByDifficultyAndCategory = function(difficulty, category) {
  return this.find({ difficulty, category, isActive: true });
};

storySchema.statics.getRandomStories = function(count = 5, options = {}) {
  const query = { isActive: true };
  
  // Применяем фильтры, если они указаны
  if (options.difficulty) query.difficulty = options.difficulty;
  if (options.category) query.category = options.category;
  
  return this.aggregate([
    { $match: query },
    { $sample: { size: count } }
  ]);
};

// Индексы
storySchema.index({ difficulty: 1, category: 1 });
storySchema.index({ timesPlayed: -1 });
storySchema.index({ createdAt: -1 });
storySchema.index({ content: 'text' });

const Story = mongoose.model('Story', storySchema);

export default Story; 