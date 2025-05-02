/**
 * Реэкспорт логгера из централизованной утилиты
 * @deprecated Используйте импорт из '../utils/logger.js'
 */

// Импортируем из единственного источника
import { logger, createLogger } from '../utils/logger.js';

// Реэкспортируем для обратной совместимости
export { logger, createLogger }; 