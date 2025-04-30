import mongoose from 'mongoose';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('AchievementModel');

const achievementSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    default: 'trophy'
  },
  criteria: {
    type: Object,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Методы модели
achievementSchema.statics.findByCode = function(code) {
  return this.findOne({ code });
};

achievementSchema.statics.getAllAchievements = function() {
  return this.find().sort({ name: 1 });
};

// Индексы
achievementSchema.index({ code: 1 });

const Achievement = mongoose.model('Achievement', achievementSchema);

export default Achievement; 