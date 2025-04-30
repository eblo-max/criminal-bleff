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
    enum: ['robbery', 'theft', 'fraud', 'other'],
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

// Статические методы
storySchema.statics.findByDifficultyAndCategory = function(difficulty, category) {
  return this.find({ difficulty, category });
};

storySchema.statics.getRandomStory = function(difficulty, category) {
  const query = {};
  if (difficulty) query.difficulty = difficulty;
  if (category) query.category = category;
  
  return this.aggregate([
    { $match: query },
    { $sample: { size: 1 } }
  ]);
};

// Индексы
storySchema.index({ difficulty: 1, category: 1 });
storySchema.index({ timesPlayed: -1 });
storySchema.index({ createdAt: -1 });
storySchema.index({ text: 'text' });

const Story = mongoose.model('Story', storySchema);

export default Story; 