const mongoose = require('mongoose');
const Story = require('../models/Story');
const { GameError } = require('../utils/errorHandler');
const { success, error } = require('../utils/responseFormatter');
const { createLogger } = require('../config/logger');

const logger = createLogger('StoryController');

/**
 * Получает все истории
 * 
 * @param {Object} req - Express request объект
 * @param {Object} res - Express response объект
 */
const getAllStories = async (req, res) => {
  try {
    const stories = await Story.find().sort({ createdAt: -1 });
    return success(res, { stories });
  } catch (err) {
    logger.error('Error getting all stories:', err);
    return error(res, err.message || 'Failed to get stories');
  }
};

/**
 * Получает историю по ID
 *
 * @param {Object} req - Express request объект
 * @param {Object} res - Express response объект
 */
const getStoryById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new GameError('Invalid story ID', 400);
    }
    
    const story = await Story.findById(id);
    
    if (!story) {
      throw new GameError('Story not found', 404);
    }
    
    return success(res, { story });
  } catch (err) {
    logger.error(`Error getting story by ID ${req.params.id}:`, err);
    return error(res, err.message || 'Failed to get story', err.statusCode);
  }
};

/**
 * Получает истории по дате создания
 *
 * @param {Object} req - Express request объект
 * @param {Object} res - Express response объект
 */
const getStoriesByDate = async (req, res) => {
  try {
    const { date } = req.params;
    
    // Проверяем формат даты (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new GameError('Invalid date format. Use YYYY-MM-DD', 400);
    }
    
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);
    
    const stories = await Story.find({
      createdAt: {
        $gte: startDate,
        $lt: endDate
      }
    }).sort({ createdAt: -1 });
    
    return success(res, { stories, date });
  } catch (err) {
    logger.error(`Error getting stories by date ${req.params.date}:`, err);
    return error(res, err.message || 'Failed to get stories by date', err.statusCode);
  }
};

/**
 * Получает последние добавленные истории
 *
 * @param {Object} req - Express request объект
 * @param {Object} res - Express response объект
 */
const getRecentStories = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    if (limit < 1 || limit > 50) {
      throw new GameError('Limit must be between 1 and 50', 400);
    }
    
    const stories = await Story.find()
      .sort({ createdAt: -1 })
      .limit(limit);
    
    return success(res, { stories });
  } catch (err) {
    logger.error('Error getting recent stories:', err);
    return error(res, err.message || 'Failed to get recent stories', err.statusCode);
  }
};

module.exports = {
  getAllStories,
  getStoryById,
  getStoriesByDate,
  getRecentStories
}; 