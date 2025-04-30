import mongoose from 'mongoose';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('Database');
let dbConnected = false;

const connectDB = async () => {
  try {
    // Using shared MONGO_URL
    const mongoUrl = process.env.MONGO_URL;
    logger.info(`Attempting to connect to MongoDB at ${mongoUrl.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);
    
    const conn = await mongoose.connect(mongoUrl, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 5,
    });

    dbConnected = true;
    logger.info(`MongoDB Connected: ${conn.connection.host}`);

    // Обработка ошибок подключения
    mongoose.connection.on('error', (err) => {
      logger.error(`MongoDB connection error: ${err}`);
    });

    // Обработка отключения
    mongoose.connection.on('disconnected', () => {
      dbConnected = false;
      logger.warn('MongoDB disconnected. Attempting to reconnect...');
      setTimeout(connectDB, 5000);
    });

    // Обработка переподключения
    mongoose.connection.on('reconnected', () => {
      dbConnected = true;
      logger.info('MongoDB reconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await closeDB();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await closeDB();
      process.exit(0);
    });

  } catch (error) {
    logger.error(`Error connecting to MongoDB: ${error.message}`);
    // Вместо завершения процесса приложения, просто логируем ошибку
    // и позволяем приложению работать с ограниченной функциональностью
    logger.warn('Application will continue with limited functionality');
    dbConnected = false;
    
    // Пытаемся переподключиться через 10 секунд
    setTimeout(() => {
      logger.info('Attempting to reconnect to MongoDB...');
      connectDB().catch(err => {
        logger.error(`Failed to reconnect to MongoDB: ${err.message}`);
      });
    }, 10000);
  }
};

const closeDB = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed');
    }
  } catch (error) {
    logger.error(`Error closing MongoDB connection: ${error.message}`);
    throw error;
  }
};

// Функция для проверки состояния подключения к базе данных
const isConnected = () => {
  return dbConnected && mongoose.connection.readyState === 1;
};

export {
  connectDB,
  closeDB,
  mongoose,
  isConnected
}; 