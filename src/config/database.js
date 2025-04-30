const mongoose = require('mongoose');
const { createLogger } = require('../utils/logger');

const logger = createLogger('Database');

const connectDB = async () => {
  try {
    // Using shared MONGO_URL
    const mongoUrl = process.env.MONGO_URL;
    const conn = await mongoose.connect(mongoUrl, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 5,
    });

    logger.info(`MongoDB Connected: ${conn.connection.host}`);

    // Обработка ошибок подключения
    mongoose.connection.on('error', (err) => {
      logger.error(`MongoDB connection error: ${err}`);
    });

    // Обработка отключения
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting to reconnect...');
      setTimeout(connectDB, 5000);
    });

    // Обработка переподключения
    mongoose.connection.on('reconnected', () => {
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
    process.exit(1);
  }
};

const closeDB = async () => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  } catch (error) {
    logger.error(`Error closing MongoDB connection: ${error.message}`);
    throw error;
  }
};

module.exports = {
  connectDB,
  closeDB,
  mongoose
}; 