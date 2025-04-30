import mongoose from 'mongoose';
import Leaderboard from '../models/Leaderboard.js';
import cacheService from './cacheService.js';
import { createLogger } from '../config/logger.js';
import { LeaderboardError, GameError } from '../utils/errorHandler.js';

const logger = createLogger('LeaderboardService');

class LeaderboardService {
  constructor() {
    this.pageSize = 10;
    this.defaultRank = 'Новичок';
  }

  // Получение дневного лидерборда
  async getDailyLeaderboard(page = 1, limit = 10) {
    logger.debug(`Getting daily leaderboard page ${page}, limit ${limit}`);
    return this.getLeaderboard('daily', page, limit);
  }

  // Получение недельного лидерборда
  async getWeeklyLeaderboard(page = 1, limit = 10) {
    logger.debug(`Getting weekly leaderboard page ${page}, limit ${limit}`);
    return this.getLeaderboard('weekly', page, limit);
  }

  // Получение общего лидерборда (все время)
  async getAllTimeLeaderboard(page = 1, limit = 10) {
    logger.debug(`Getting all-time leaderboard page ${page}, limit ${limit}`);
    return this.getLeaderboard('all-time', page, limit);
  }

  // Общий метод для получения лидерборда с пагинацией
  async getLeaderboard(period, page, limit) {
    if (!period || !['daily', 'weekly', 'all-time'].includes(period)) {
      throw new LeaderboardError(`Invalid leaderboard period: ${period}`);
    }

    // Проверяем и нормализуем параметры пагинации
    page = parseInt(page) || 1;
    limit = parseInt(limit) || this.pageSize;
    
    if (page < 1) page = 1;
    if (limit < 1) limit = this.pageSize;
    if (limit > 100) limit = 100; // Максимум 100 записей за раз
    
    try {
      // Создаем ключ для кеширования с учетом пагинации
      const cacheKey = `leaderboard:${period}:page${page}:limit${limit}`;
      
      // Пытаемся получить данные из кеша
      const cachedData = await cacheService.get(cacheKey);
      if (cachedData) {
        logger.debug(`Returning cached ${period} leaderboard data for page ${page}`);
        return cachedData;
      }
      
      // Если данных в кеше нет, получаем их из базы
      logger.debug(`Fetching ${period} leaderboard from database`);
      
      // Проверяем существование лидерборда
      let leaderboard = await Leaderboard.findOne({ period });
      
      if (!leaderboard || !leaderboard.entries.length) {
        logger.info(`${period} leaderboard not found or empty, returning empty result`);
        const emptyResult = {
          period,
          page,
          pageSize: limit,
          totalPages: 0,
          totalEntries: 0,
          entries: []
        };
        
        // Кешируем пустой результат на короткое время
        await cacheService.set(cacheKey, emptyResult, 300); // 5 минут
        return emptyResult;
      }
      
      // Вычисляем общее количество страниц и записей
      const totalEntries = leaderboard.entries.length;
      const totalPages = Math.ceil(totalEntries / limit);
      
      // Применяем пагинацию
      const skip = (page - 1) * limit;
      const paginatedEntries = leaderboard.entries
        .sort((a, b) => b.score - a.score) // Сортировка по убыванию очков
        .slice(skip, skip + limit);
      
      // Формируем результат
      const result = {
        period,
        page,
        pageSize: limit,
        totalPages,
        totalEntries,
        entries: paginatedEntries.map(entry => ({
          userId: entry.userId,
          username: entry.username,
          score: entry.score,
          rank: entry.rank,
          gamesPlayed: entry.gamesPlayed || 0,
          wins: entry.wins || 0,
          winRate: entry.winRate || 0
        }))
      };
      
      // Кешируем результат
      await cacheService.set(cacheKey, result, 600); // 10 минут
      
      logger.debug(`Successfully fetched ${period} leaderboard, page ${page}, entries: ${result.entries.length}`);
      return result;
    } catch (error) {
      logger.error(`Error getting ${period} leaderboard:`, error);
      throw new LeaderboardError(`Failed to get ${period} leaderboard`, error);
    }
  }

  // Получение ранга пользователя в лидерборде
  async getUserRank(userId, period = 'all-time') {
    if (!userId) {
      throw new LeaderboardError('User ID is required');
    }
    
    if (!['daily', 'weekly', 'all-time'].includes(period)) {
      throw new LeaderboardError(`Invalid leaderboard period: ${period}`);
    }
    
    try {
      // Преобразуем userId в строку для надежного сравнения
      const userIdStr = String(userId);
      
      // Проверяем кеш
      const cacheKey = `userRank:${userIdStr}:${period}`;
      const cachedRank = await cacheService.get(cacheKey);
      
      if (cachedRank) {
        logger.debug(`Returning cached rank for user ${userIdStr} in ${period} leaderboard`);
        return cachedRank;
      }
      
      // Получаем лидерборд из базы
      const leaderboard = await Leaderboard.findOne({ period });
      
      // Если лидерборд не существует, возвращаем базовый ответ
      if (!leaderboard || !leaderboard.entries.length) {
        const defaultResult = {
          userId: userIdStr,
          period,
          position: null,
          rank: this.defaultRank,
          score: 0,
          totalPlayers: 0,
          found: false
        };
        
        // Кешируем результат на короткое время
        await cacheService.set(cacheKey, defaultResult, 300); // 5 минут
        return defaultResult;
      }
      
      // Сортируем записи по убыванию очков
      const sortedEntries = [...leaderboard.entries].sort((a, b) => b.score - a.score);
      
      // Ищем пользователя в отсортированном списке
      let userEntry = null;
      let position = -1;
      
      for (let i = 0; i < sortedEntries.length; i++) {
        const entry = sortedEntries[i];
        // Конвертируем ID в строки для корректного сравнения
        if (entry.userId.toString() === userIdStr) {
          userEntry = entry;
          position = i + 1; // Позиция начинается с 1
          break;
        }
      }
      
      // Формируем результат
      const result = {
        userId: userIdStr,
        period,
        position: position > 0 ? position : null,
        score: userEntry ? userEntry.score : 0,
        rank: userEntry ? userEntry.rank : this.defaultRank,
        totalPlayers: sortedEntries.length,
        found: !!userEntry
      };
      
      // Кешируем результат
      await cacheService.set(cacheKey, result, 3600); // 1 час

      return result;
    } catch (error) {
      logger.error(`Error getting rank for user ${userId} in ${period} leaderboard:`, error);
      throw new GameError(`Failed to get user rank: ${error.message}`);
    }
  }

  async updateUserScore(userId, username, newScore, gamesPlayed, wins) {
    if (!userId) {
      throw new LeaderboardError('User ID is required');
    }

    try {
      // Убедимся, что userId это правильный ObjectId
      let userObjectId;
      try {
        // Если userId уже ObjectId, используем его, иначе преобразуем
        userObjectId = typeof userId === 'string' && !mongoose.Types.ObjectId.isValid(userId) 
          ? new mongoose.Types.ObjectId() // Создаем новый ID если строка невалидна
          : new mongoose.Types.ObjectId(userId); // Преобразуем в ObjectId
      } catch (error) {
        // Если не удалось преобразовать, создаем новый
        logger.warn(`Invalid userId: ${userId}, creating new ObjectId`);
        userObjectId = new mongoose.Types.ObjectId();
      }
      
      // Рассчитываем winRate на основе игр и побед
      const winRate = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0;
      
      // Обновляем все типы лидербордов
      const periods = ['daily', 'weekly', 'all-time'];
      
      // Используем Promise.allSettled вместо Promise.all для предотвращения падения при ошибке в одном периоде
      const updateResults = await Promise.allSettled(periods.map(async (period) => {
        try {
          // Инвалидируем кэш для этого периода до внесения изменений
          await this.invalidateLeaderboardCache(period);
          
          // Находим существующий лидерборд
          let leaderboard = await Leaderboard.findOne({ period });
          
          // Создаем лидерборд, если он не существует
          if (!leaderboard) {
            logger.info(`Creating new ${period} leaderboard`);
            leaderboard = await Leaderboard.create({
              period,
              entries: []
            });
          }
          
          // Проверяем, существует ли запись для этого пользователя
          const userEntryIndex = leaderboard.entries.findIndex(entry => 
            entry.userId.toString() === userObjectId.toString()
          );
          
          if (userEntryIndex !== -1) {
            // Обновляем существующую запись
            leaderboard.entries[userEntryIndex].score = newScore;
            leaderboard.entries[userEntryIndex].username = username;
            leaderboard.entries[userEntryIndex].gamesPlayed = gamesPlayed;
            leaderboard.entries[userEntryIndex].wins = wins;
            leaderboard.entries[userEntryIndex].winRate = winRate;
          } else {
            // Создаем новую запись
            leaderboard.entries.push({
              userId: userObjectId,
              username,
              score: newScore,
              gamesPlayed,
              wins,
              winRate,
              rank: 'Новичок' // Начальный ранг
            });
          }
          
          // Сортируем записи по очкам для обновления рангов
          leaderboard.entries.sort((a, b) => b.score - a.score);
          
          // Обновляем ранги на основе позиций
          this.updateRanksBasedOnPositions(leaderboard.entries);
          
          // Сохраняем обновленный лидерборд
          await leaderboard.save();
          
          // Инвалидируем кэш ранга пользователя для этого периода после сохранения
          await this.invalidateUserRankCache(userObjectId.toString(), period);
          
          logger.info(`Successfully updated ${period} leaderboard for user ${username} (${userObjectId})`);
          return { period, success: true };
        } catch (error) {
          logger.error(`Error updating ${period} leaderboard for user ${username} (${userObjectId}):`, error);
          return { period, success: false, error: error.message };
        }
      }));
      
      const successCount = updateResults.filter(result => result.status === 'fulfilled' && result.value.success).length;
      const errorCount = periods.length - successCount;
      
      if (errorCount > 0) {
        logger.warn(`Completed leaderboard update for user ${username} with ${errorCount} errors`);
      } else {
        logger.info(`Successfully updated all leaderboards for user ${username}`);
      }
      
      return {
        userId: userObjectId.toString(),
        username,
        periodsUpdated: successCount,
        totalPeriods: periods.length,
        details: updateResults.map(result => {
          if (result.status === 'fulfilled') {
            return result.value;
          } else {
            return { 
              period: 'unknown', 
              success: false, 
              error: result.reason?.message || 'Unknown error' 
            };
          }
        })
      };
    } catch (error) {
      logger.error(`Critical error updating leaderboards for user ${username}:`, error);
      throw new LeaderboardError('Failed to update user score', error);
    }
  }
  
  // Вспомогательный метод для обновления рангов на основе позиций
  updateRanksBasedOnPositions(entries) {
    if (!entries || entries.length === 0) return;
    
    // Определяем ранги на основе позиций
    entries.forEach((entry, index) => {
      if (index < 3) {
        entry.rank = 'Легенда';
      } else if (index < 10) {
        entry.rank = 'Мастер';
      } else if (index < 50) {
        entry.rank = 'Эксперт';
      } else if (index < 100) {
        entry.rank = 'Профессионал';
      } else if (index < 500) {
        entry.rank = 'Опытный';
      } else {
        entry.rank = 'Новичок';
      }
    });
  }
  
  // Методы для работы с кэшем
  async invalidateLeaderboardCache(period) {
    try {
      await cacheService.del(`leaderboard:${period}`);
      await cacheService.invalidatePattern(`leaderboard:${period}:*`);
      logger.debug(`Invalidated cache for ${period} leaderboard`);
      return true;
    } catch (error) {
      logger.warn(`Failed to invalidate leaderboard cache for period ${period}:`, error);
      return false;
    }
  }
  
  async invalidateUserRankCache(userId, period) {
    try {
      const key = `userRank:${userId}:${period}`;
      await cacheService.del(key);
      logger.debug(`Invalidated cache for user ${userId} rank in ${period} leaderboard`);
      return true;
    } catch (error) {
      logger.warn(`Failed to invalidate user rank cache for user ${userId} in period ${period}:`, error);
      return false;
    }
  }

  async updateAllRanks(period = 'all-time') {
    try {
      const leaderboard = await Leaderboard.findOne({ period });
      if (!leaderboard) {
        return false;
      }
      
      // Пересчитываем ранги всех записей
      leaderboard.updateRanks();
      await leaderboard.save();
      
      // Инвалидируем кэши
      await cacheService.invalidatePattern(`leaderboard:${period}*`);
      
      return true;
    } catch (error) {
      logger.error(`Error updating ranks for ${period} leaderboard:`, error);
      throw new LeaderboardError(`Failed to update ${period} leaderboard ranks`, error);
    }
  }
}

export default new LeaderboardService();