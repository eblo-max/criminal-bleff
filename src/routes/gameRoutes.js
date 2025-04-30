import express from 'express';
import * as gameController from '../controllers/gameController.js';
import { requireAuth, strictTelegramAuth } from '../middlewares/auth.js';
import { validateBody, schemas } from '../middlewares/validation.js';

const router = express.Router();

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

export { router as default }; 