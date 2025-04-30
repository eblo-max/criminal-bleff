/**
 * Тесты для модуля подсчета очков
 */

// Заменяем Mocha и Chai на Jest
// const { describe, it, before } = require('mocha');
// const { expect } = require('chai');
const scoreCalculator = require('../../src/utils/scoreCalculator');

describe('Score Calculator Module', () => {
  describe('calculateBaseScore', () => {
    it('должен возвращать 0 для неправильного ответа', () => {
      const score = scoreCalculator.calculateBaseScore(false, 5000);
      expect(score).to.equal(0);
    });
    
    it('должен возвращать базовые 100 очков для правильного ответа без бонуса за скорость', () => {
      const score = scoreCalculator.calculateBaseScore(true, 15000);
      expect(score).to.equal(100);
    });
    
    it('должен добавлять бонус за скорость для быстрого ответа', () => {
      const score = scoreCalculator.calculateBaseScore(true, 7500); // половина времени
      expect(score).to.be.above(100);
      expect(score).to.be.at.most(150); // не более максимального бонуса
    });
    
    it('должен давать максимальный бонус за очень быстрый ответ', () => {
      const score = scoreCalculator.calculateBaseScore(true, 1000); // очень быстрый ответ
      expect(score).to.be.closeTo(150, 5); // близко к максимуму
    });
  });
  
  describe('calculateStreakBonus', () => {
    it('должен возвращать 0 для серии менее 3 ответов', () => {
      expect(scoreCalculator.calculateStreakBonus(0)).to.equal(0);
      expect(scoreCalculator.calculateStreakBonus(1)).to.equal(0);
      expect(scoreCalculator.calculateStreakBonus(2)).to.equal(0);
    });
    
    it('должен возвращать 50 очков для серии из 3 ответов', () => {
      expect(scoreCalculator.calculateStreakBonus(3)).to.equal(50);
    });
    
    it('должен возвращать 100 очков для серии из 5 ответов', () => {
      expect(scoreCalculator.calculateStreakBonus(5)).to.equal(100);
    });
    
    it('должен возвращать 250 очков для серии из 10 и более ответов', () => {
      expect(scoreCalculator.calculateStreakBonus(10)).to.equal(250);
      expect(scoreCalculator.calculateStreakBonus(15)).to.equal(250);
    });
  });
  
  describe('calculateScore', () => {
    it('должен возвращать объект с нулевыми значениями для неправильного ответа', () => {
      const result = scoreCalculator.calculateScore(false, 5000, 0);
      expect(result.baseScore).to.equal(0);
      expect(result.streakBonus).to.equal(0);
      expect(result.totalScore).to.equal(0);
      expect(result.isCorrect).to.be.false;
    });
    
    it('должен правильно рассчитывать общий счет для правильного ответа без бонусов', () => {
      const result = scoreCalculator.calculateScore(true, 15000, 0);
      expect(result.baseScore).to.equal(100);
      expect(result.streakBonus).to.equal(0);
      expect(result.totalScore).to.equal(100);
      expect(result.isCorrect).to.be.true;
    });
    
    it('должен правильно рассчитывать общий счет для правильного ответа с бонусом за скорость', () => {
      const result = scoreCalculator.calculateScore(true, 7500, 0);
      expect(result.baseScore).to.be.above(100);
      expect(result.streakBonus).to.equal(0);
      expect(result.totalScore).to.equal(result.baseScore);
    });
    
    it('должен правильно рассчитывать общий счет для правильного ответа с бонусом за серию', () => {
      const result = scoreCalculator.calculateScore(true, 15000, 5);
      expect(result.baseScore).to.equal(100);
      expect(result.streakBonus).to.equal(100);
      expect(result.totalScore).to.equal(200);
    });
    
    it('должен правильно рассчитывать общий счет с комбинацией бонусов', () => {
      const result = scoreCalculator.calculateScore(true, 3000, 10);
      expect(result.baseScore).to.be.above(100);
      expect(result.streakBonus).to.equal(250);
      expect(result.totalScore).to.equal(result.baseScore + result.streakBonus);
    });
    
    it('должен возвращать правильный объект с дополнительными данными', () => {
      const result = scoreCalculator.calculateScore(true, 5000, 3);
      expect(result).to.have.all.keys('baseScore', 'streakBonus', 'totalScore', 'isCorrect', 'timeMs');
      expect(result.timeMs).to.equal(5000);
    });
  });
}); 