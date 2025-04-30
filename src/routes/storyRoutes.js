const express = require('express');
const { 
  getAllStories, 
  getStoryById, 
  getStoriesByDate, 
  getRecentStories 
} = require('../controllers/storyController');
const { auth } = require('../middlewares/auth');

const router = express.Router();

// Public routes
router.get('/recent', getRecentStories);

// Protected routes
router.get('/', auth, getAllStories);
router.get('/:id', auth, getStoryById);
router.get('/date/:date', auth, getStoriesByDate);

module.exports = router; 