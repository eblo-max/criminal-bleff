/**
 * Класс ошибки валидации данных
 * Используется для случаев, когда данные не соответствуют ожидаемому формату
 */
class ValidationError extends Error {
  /**
   * Создает экземпляр ошибки валидации
   * @param {string} message - Сообщение об ошибке
   * @param {Object} [details=null] - Дополнительные детали ошибки
   */
  constructor(message, details = null) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
    this.statusCode = 400; // Bad Request
  }
}

export default ValidationError; 