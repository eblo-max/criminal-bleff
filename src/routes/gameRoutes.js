const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');
const { requireAuth, strictTelegramAuth } = require('../middlewares/auth');
const { validateBody, schemas } = require('../middlewares/validation');

// Маршруты для игры
router.get('/start', strictTelegramAuth, gameController.getRandomStories);
router.post('/submit', 
  strictTelegramAuth, 
  validateBody(schemas.submitAnswer), 
  gameController.submitAnswer
);
router.post('/finish', 
  strictTelegramAuth, 
  validateBody(schemas.finishGame), 
  gameController.finishGame
);
router.post('/track', 
  strictTelegramAuth, 
  validateBody(schemas.trackAction), 
  gameController.trackAction
);

module.exports = router; 