const { createLogger } = require('../config/logger');
const { StoryError } = require('../utils/errorHandler');
const Story = require('../models/Story');
const cacheService = require('./cacheService');
const { validateStoryData } = require('../utils/validator');

const logger = createLogger('StoryService');

class StoryService {
  async getRandomStories(count = 1, difficulty = null) {
    try {
      const cacheKey = `stories:random:${count}:${difficulty || 'any'}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;

      const query = difficulty ? { difficulty } : {};
      const stories = await Story.aggregate([
        { $match: query },
        { $sample: { size: count } }
      ]);

      if (stories.length === 0) {
        throw new StoryError('No stories found');
      }

      await cacheService.set(cacheKey, stories, 60 * 5); // 5 минут кэша
      return stories;
    } catch (error) {
      logger.error('Error getting random stories:', error);
      throw new StoryError('Failed to get random stories', error);
    }
  }

  async getStoryById(storyId) {
    try {
      const cacheKey = `story:${storyId}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;

      const story = await Story.findById(storyId);
      if (!story) {
        throw new StoryError('Story not found');
      }

      await cacheService.set(cacheKey, story, 60 * 60); // 1 час кэша
      return story;
    } catch (error) {
      logger.error(`Error getting story ${storyId}:`, error);
      throw new StoryError('Failed to get story', error);
    }
  }

  async addStory(storyData) {
    try {
      await validateStoryData(storyData);

      const story = new Story({
        text: storyData.text,
        options: storyData.options,
        correctAnswer: storyData.correctAnswer,
        explanation: storyData.explanation,
        difficulty: storyData.difficulty,
        category: storyData.category
      });

      await story.save();
      await cacheService.invalidatePattern('stories:*');
      
      logger.info(`Added new story: ${story._id}`);
      return story;
    } catch (error) {
      logger.error('Error adding story:', error);
      throw new StoryError('Failed to add story', error);
    }
  }

  async validateAnswer(storyId, selectedOption) {
    try {
      const story = await this.getStoryById(storyId);
      
      const isCorrect = story.correctAnswer === selectedOption;
      const result = {
        isCorrect,
        correctAnswer: story.correctAnswer,
        explanation: story.explanation
      };

      return result;
    } catch (error) {
      logger.error(`Error validating answer for story ${storyId}:`, error);
      throw new StoryError('Failed to validate answer', error);
    }
  }
}

module.exports = new StoryService(); 