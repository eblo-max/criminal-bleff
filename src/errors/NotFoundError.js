/**
 * Класс ошибки для случаев, когда запрашиваемый ресурс не найден
 */
class NotFoundError extends Error {
  /**
   * Создает экземпляр ошибки "Не найдено"
   * @param {string} message - Сообщение об ошибке
   * @param {Object} [details=null] - Дополнительные детали ошибки
   */
  constructor(message, details = null) {
    super(message);
    this.name = 'NotFoundError';
    this.details = details;
    this.statusCode = 404; // Not Found
  }
}

export default NotFoundError; 