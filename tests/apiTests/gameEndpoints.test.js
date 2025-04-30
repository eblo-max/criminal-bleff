/**
 * Интеграционные тесты API endpoints игры
 */

const request = require('supertest');
const chai = require('chai');
const { expect } = chai;
const sinon = require('sinon');
const mongoose = require('mongoose');

// Подключаем приложение
const app = require('../../src/app');

// Модули для стабов
const gameLogicService = require('../../src/services/gameLogicService');
const auth = require('../../src/middlewares/auth');

describe('Game API Endpoints', () => {
  // Стаб для аутентификации, чтобы обойти Telegram проверки
  before(() => {
    sinon.stub(auth, 'requireAuth').callsFake((req, res, next) => {
      req.user = { id: 'test-user-id', telegramId: 123456789 };
      next();
    });
    
    sinon.stub(auth, 'validateTelegramWebAppData').callsFake((req, res, next) => {
      next();
    });
  });
  
  after(() => {
    auth.requireAuth.restore();
    auth.validateTelegramWebAppData.restore();
    
    // Очистка стабов
    sinon.restore();
  });
  
  describe('GET /api/game/start', () => {
    it('должен возвращать список историй', async () => {
      // Стаб для функции getRandomStories
      const mockStories = [
        {
          id: 'story1',
          text: 'Тестовая история 1',
          options: ['Вариант 1', 'Вариант 2'],
          correctAnswer: 0
        },
        {
          id: 'story2',
          text: 'Тестовая история 2',
          options: ['Вариант A', 'Вариант B'],
          correctAnswer: 1
        }
      ];
      
      sinon.stub(gameLogicService, 'getRandomStories').resolves(mockStories);
      
      const res = await request(app)
        .get('/api/game/start')
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(res.body.status).to.equal('success');
      expect(res.body.data).to.have.property('stories');
      expect(res.body.data.stories).to.be.an('array');
      expect(res.body.data.stories).to.have.lengthOf(2);
      
      gameLogicService.getRandomStories.restore();
    });
    
    it('должен обрабатывать ошибки при загрузке историй', async () => {
      sinon.stub(gameLogicService, 'getRandomStories').rejects(new Error('Ошибка получения историй'));
      
      const res = await request(app)
        .get('/api/game/start')
        .expect('Content-Type', /json/)
        .expect(500);
      
      expect(res.body.status).to.equal('error');
      
      gameLogicService.getRandomStories.restore();
    });
  });
  
  describe('POST /api/game/submit', () => {
    it('должен обрабатывать правильный ответ', async () => {
      // Стаб для функции checkAnswer
      const mockResult = {
        success: true,
        isCorrect: true,
        score: 120,
        storyId: 'story1',
        selectedOptionIndex: 0
      };
      
      sinon.stub(gameLogicService, 'checkAnswer').resolves(mockResult);
      sinon.stub(gameLogicService, 'calculateScore').returns(120);
      
      const res = await request(app)
        .post('/api/game/submit')
        .send({
          storyId: 'story1',
          selectedOptionIndex: 0,
          isCorrect: true,
          answerTimeMs: 5000,
          telegramUserId: 123456789
        })
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(res.body.status).to.equal('success');
      expect(res.body.message).to.equal('Answer processed');
      expect(res.body.data).to.have.property('isCorrect', true);
      
      gameLogicService.checkAnswer.restore();
      gameLogicService.calculateScore.restore();
    });
    
    it('должен обрабатывать неправильный ответ', async () => {
      // Стаб для функции checkAnswer
      const mockResult = {
        success: true,
        isCorrect: false,
        score: 0,
        storyId: 'story1',
        selectedOptionIndex: 1
      };
      
      sinon.stub(gameLogicService, 'checkAnswer').resolves(mockResult);
      sinon.stub(gameLogicService, 'calculateScore').returns(0);
      
      const res = await request(app)
        .post('/api/game/submit')
        .send({
          storyId: 'story1',
          selectedOptionIndex: 1,
          isCorrect: false,
          answerTimeMs: 5000,
          telegramUserId: 123456789
        })
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(res.body.status).to.equal('success');
      expect(res.body.data).to.have.property('isCorrect', false);
      expect(res.body.data).to.have.property('score', 0);
      
      gameLogicService.checkAnswer.restore();
      gameLogicService.calculateScore.restore();
    });
    
    it('должен отклонять запросы с неверными данными', async () => {
      const res = await request(app)
        .post('/api/game/submit')
        .send({
          // Отсутствует обязательное поле storyId
          selectedOptionIndex: 0,
          isCorrect: true,
          answerTimeMs: 5000
        })
        .expect('Content-Type', /json/)
        .expect(400);
      
      expect(res.body.status).to.equal('error');
      expect(res.body).to.have.property('message');
      expect(res.body.message).to.include('Ошибка валидации');
    });
  });
  
  describe('POST /api/game/finish', () => {
    it('должен успешно завершать игру и возвращать результаты', async () => {
      // Стаб для функции saveGameResult
      const mockResult = {
        score: 500,
        correctAnswers: 4,
        totalQuestions: 5,
        accuracy: 80,
        achievements: []
      };
      
      sinon.stub(gameLogicService, 'saveGameResult').resolves(mockResult);
      
      const res = await request(app)
        .post('/api/game/finish')
        .send({
          score: 500,
          correctAnswers: 4,
          totalQuestions: 5,
          maxStreak: 3,
          telegramUserId: 123456789
        })
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(res.body.status).to.equal('success');
      expect(res.body.message).to.equal('Game finished successfully');
      expect(res.body.data).to.have.property('score', 500);
      expect(res.body.data).to.have.property('correctAnswers', 4);
      
      gameLogicService.saveGameResult.restore();
    });
    
    it('должен отклонять неверно форматированные данные о завершении игры', async () => {
      const res = await request(app)
        .post('/api/game/finish')
        .send({
          // Некорректные данные (отрицательное количество очков)
          score: -50,
          correctAnswers: 4,
          totalQuestions: 5,
          maxStreak: 3
        })
        .expect('Content-Type', /json/)
        .expect(400);
      
      expect(res.body.status).to.equal('error');
      expect(res.body).to.have.property('message');
      expect(res.body.message).to.include('Ошибка валидации');
    });
  });
  
  describe('POST /api/game/track', () => {
    it('должен успешно отслеживать действия пользователя', async () => {
      const res = await request(app)
        .post('/api/game/track')
        .send({
          action: 'view_card',
          gameId: 'game-123',
          cardId: 'card-456',
          telegramUserId: 123456789
        })
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(res.body.status).to.equal('success');
    });
    
    it('должен отклонять запросы с некорректными данными трекинга', async () => {
      const res = await request(app)
        .post('/api/game/track')
        .send({
          // Отсутствует обязательное поле cardId для действия view_card
          action: 'view_card',
          gameId: 'game-123'
        })
        .expect('Content-Type', /json/)
        .expect(400);
      
      expect(res.body.status).to.equal('error');
    });
  });
}); 