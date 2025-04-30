/**
 * Индексный файл, экспортирующий все модели для удобства импорта в других модулях
 */

const User = require('./User');
const Game = require('./Game');
const Card = require('./Card');
const GameCard = require('./GameCard');
const Achievement = require('./Achievement');
const Leaderboard = require('./Leaderboard');
const Story = require('./Story');

module.exports = {
  User,
  Game,
  Card,
  GameCard,
  Achievement,
  Leaderboard,
  Story
}; 