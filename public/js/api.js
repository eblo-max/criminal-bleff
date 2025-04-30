/**
 * API Client for the Fast Bot Application
 * Handles API requests, loading indicators, and error handling
 * Supports authentication with token from localStorage
 */
class ApiClient {
    /**
     * Create a new API client
     * @param {Object} options - Client options
     * @param {string} options.baseUrl - API base URL
     * @param {boolean} options.debug - Enable debug logging
     */
    constructor(options = {}) {
        // Set base URL from options or use default
        this.baseUrl = options.baseUrl || 'https://first-bot-production.up.railway.app';
        
        // Больше не добавляем автоматически /api к базовому URL
        // API пути предоставляются полностью в методах
        
        // Debug mode for development
        this.debug = options.debug || window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1';
        
        // Get auth token from localStorage if available
        this.authToken = localStorage.getItem('criminal_bluff_auth_credential');
        
        // Get user ID from localStorage if available
        const userData = localStorage.getItem('criminal_bluff_user_data');
        this.userId = userData ? JSON.parse(userData)?._id : null;
        
        // Maximum number of retries for failed requests
        this.maxRetries = options.maxRetries || 3;
        
        // Loading screen element reference
        this.loadingScreenElement = null;
        
        // Minimum loading time to prevent flickering (ms)
        this.minLoadingTime = 300;
        
        this.log('API Client initialized', {
            baseUrl: this.baseUrl,
            debug: this.debug,
            hasToken: !!this.authToken,
            hasUserId: !!this.userId
        });
    }
    
    /**
     * Log messages in debug mode
     * @param {string} message - Log message
     * @param {Object} [data] - Additional data to log
     */
    log(message, data) {
        if (this.debug) {
            console.log(`[API] ${message}`, data || '');
        }
    }
    
    /**
     * Log warnings
     * @param {string} message - Warning message
     * @param {Object} [data] - Additional data to log
     */
    warn(message, data) {
        if (this.debug) {
            console.warn(`[API] ${message}`, data || '');
        }
    }
    
    /**
     * Log errors
     * @param {string} message - Error message
     * @param {Object} [data] - Additional data to log
     */
    error(message, data) {
        console.error(`[API] ${message}`, data || '');
    }
    
    /**
     * Show loading screen
     * @private
     */
    _showLoading() {
        try {
            // Get loading screen element
            if (!this.loadingScreenElement) {
                this.loadingScreenElement = document.getElementById('loading-screen');
            }
            
            // Show loading screen if exists
            if (this.loadingScreenElement) {
                this.loadingScreenElement.classList.add('active');
                this.loadingStartTime = Date.now();
            } else {
                this.warn('Loading screen element not found');
            }
        } catch (error) {
            this.error('Error showing loading screen', error);
        }
    }
    
    /**
     * Hide loading screen with minimum display time
     * @private
     */
    _hideLoading() {
        try {
            if (!this.loadingScreenElement) {
                this.loadingScreenElement = document.getElementById('loading-screen');
            }
            
            if (this.loadingScreenElement) {
                const elapsed = Date.now() - (this.loadingStartTime || 0);
                const remaining = Math.max(0, this.minLoadingTime - elapsed);
                
                // Add a small delay to avoid flickering
                setTimeout(() => {
                    this.loadingScreenElement.classList.remove('active');
                }, remaining);
            } else {
                this.warn('Loading screen element not found');
            }
        } catch (error) {
            this.error('Error hiding loading screen', error);
        }
    }
    
    /**
     * Make a GET request to the API
     * @param {string} endpoint - API endpoint
     * @param {Object} [options] - Fetch options
     * @param {boolean} [showLoading=true] - Show loading indicator
     * @returns {Promise<any>} Response data
     */
    async get(endpoint, options = {}, showLoading = true) {
        try {
            if (showLoading) this._showLoading();
            
            // Добавляем /api к эндпоинту, если он еще не начинается с /api
            const apiEndpoint = endpoint.startsWith('/api') ? endpoint : `/api${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
            const url = `${this.baseUrl}${apiEndpoint}`;
            this.log(`GET ${url}`);
            
            const fetchOptions = {
                method: 'GET',
                headers: this._getHeaders(),
                ...options
            };
            
            return await this._fetchWithRetry(url, fetchOptions);
        } catch (error) {
            this.error(`GET request failed: ${endpoint}`, error);
            throw error;
        } finally {
            if (showLoading) this._hideLoading();
        }
    }
    
    /**
     * Make a POST request to the API
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request data
     * @param {Object} [options] - Fetch options
     * @param {boolean} [showLoading=true] - Show loading indicator
     * @returns {Promise<any>} Response data
     */
    async post(endpoint, data = {}, options = {}, showLoading = true) {
        try {
            if (showLoading) this._showLoading();
            
            // Добавляем /api к эндпоинту, если он еще не начинается с /api
            const apiEndpoint = endpoint.startsWith('/api') ? endpoint : `/api${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
            const url = `${this.baseUrl}${apiEndpoint}`;
            this.log(`POST ${url}`, data);
            
            const fetchOptions = {
                method: 'POST',
                headers: this._getHeaders(),
                body: JSON.stringify(data),
                ...options
            };
            
            return await this._fetchWithRetry(url, fetchOptions);
        } catch (error) {
            this.error(`POST request failed: ${endpoint}`, error);
            throw error;
        } finally {
            if (showLoading) this._hideLoading();
        }
    }
    
    /**
     * Make a PUT request to the API
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request data
     * @param {Object} [options] - Fetch options
     * @param {boolean} [showLoading=true] - Show loading indicator
     * @returns {Promise<any>} Response data
     */
    async put(endpoint, data = {}, options = {}, showLoading = true) {
        try {
            if (showLoading) this._showLoading();
            
            // Добавляем /api к эндпоинту, если он еще не начинается с /api
            const apiEndpoint = endpoint.startsWith('/api') ? endpoint : `/api${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
            const url = `${this.baseUrl}${apiEndpoint}`;
            this.log(`PUT ${url}`, data);
            
            const fetchOptions = {
                method: 'PUT',
                headers: this._getHeaders(),
                body: JSON.stringify(data),
                ...options
            };
            
            return await this._fetchWithRetry(url, fetchOptions);
        } catch (error) {
            this.error(`PUT request failed: ${endpoint}`, error);
            throw error;
        } finally {
            if (showLoading) this._hideLoading();
        }
    }
    
    /**
     * Make a DELETE request to the API
     * @param {string} endpoint - API endpoint
     * @param {Object} [options] - Fetch options
     * @param {boolean} [showLoading=true] - Show loading indicator
     * @returns {Promise<any>} Response data
     */
    async delete(endpoint, options = {}, showLoading = true) {
        try {
            if (showLoading) this._showLoading();
            
            // Добавляем /api к эндпоинту, если он еще не начинается с /api
            const apiEndpoint = endpoint.startsWith('/api') ? endpoint : `/api${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
            const url = `${this.baseUrl}${apiEndpoint}`;
            this.log(`DELETE ${url}`);
            
            const fetchOptions = {
                method: 'DELETE',
                headers: this._getHeaders(),
                ...options
            };
            
            return await this._fetchWithRetry(url, fetchOptions);
        } catch (error) {
            this.error(`DELETE request failed: ${endpoint}`, error);
            throw error;
        } finally {
            if (showLoading) this._hideLoading();
        }
    }
    
    /**
     * Fetch with retry logic and exponential backoff
     * @param {string} url - Request URL
     * @param {Object} options - Fetch options
     * @param {number} [retryCount=0] - Current retry attempt
     * @returns {Promise<any>} Response data
     * @private
     */
    async _fetchWithRetry(url, options, retryCount = 0) {
        try {
            const response = await fetch(url, options);
            return await this._handleResponse(response);
        } catch (error) {
            if (retryCount < this.maxRetries && this._shouldRetry(error)) {
                // Calculate exponential backoff delay
                const delay = Math.pow(2, retryCount) * 300 + Math.random() * 100;
                this.warn(`Retrying request (${retryCount + 1}/${this.maxRetries}) after ${delay}ms`, { url, error });
                
                await new Promise(resolve => setTimeout(resolve, delay));
                return this._fetchWithRetry(url, options, retryCount + 1);
            }
            
            throw error;
        }
    }
    
    /**
     * Handle API response
     * @param {Response} response - Fetch response
     * @returns {Promise<any>} Processed response data
     * @private
     */
    async _handleResponse(response) {
        // Get response text
        const text = await response.text();
        
        // Try to parse JSON response
        let data;
        try {
            data = text ? JSON.parse(text) : {};
        } catch (e) {
            this.warn('Response is not valid JSON', { text });
            data = { message: text };
        }
        
        // Handle successful responses
        if (response.ok) {
            this.log('Request successful', data);
            
            // Стандартизируем формат ответа
            if (data.success === undefined) {
                data.success = true;
            }
            
            return data;
        }
        
        // Стандартизируем ответ с ошибкой
        const errorResponse = {
            success: false,
            status: response.status,
            message: data.message || `Ошибка запроса: ${response.status}`,
            error: data.error || 'UnknownError'
        };
        
        // Handle unauthorized errors
        if (response.status === 401) {
            this.warn('Unauthorized request - token may be invalid');
            
            // Clear auth credentials
            localStorage.removeItem('criminal_bluff_auth_credential');
            localStorage.removeItem('criminal_bluff_user_data');
            
            // If we're not already on login/welcome screen, reload the page
            const currentPath = window.location.pathname;
            if (currentPath !== '/' && currentPath !== '/index.html' && currentPath !== '/login') {
                this.warn('Redirecting to welcome screen due to auth failure');
                window.location.reload();
            }
        }
        
        // Log the error details
        this.error(`API error: ${errorResponse.message}`, { status: response.status, data });
        
        return errorResponse;
    }
    
    /**
     * Determine if a request should be retried
     * @param {Error} error - Request error
     * @returns {boolean} True if request should be retried
     * @private
     */
    _shouldRetry(error) {
        // Retry network errors and 5xx server errors
        return !error.status || error.status >= 500;
    }
    
    /**
     * Get request headers including auth token if available
     * @returns {Object} Headers object
     * @private
     */
    _getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        
        // Add auth token if available
        if (this.authToken) {
            headers['Authorization'] = `Bearer ${this.authToken}`;
        }
        
        return headers;
    }
    
    /**
     * Create mock responses for development
     * @param {string} type - Response type
     * @returns {Object} Mock response
     * @private
     */
    _createMockResponse(type) {
        switch (type) {
            case 'auth':
                const mockUserId = 'user_' + Math.floor(Math.random() * 1000000);
                return {
                    user: {
                        _id: mockUserId,
                        telegramId: '123456789',
                        firstName: 'Test',
                        lastName: 'User',
                        username: 'testuser',
                        createdAt: new Date().toISOString(),
                        isMockUser: true
                    },
                    token: 'mock_token_' + Math.random().toString(36).substring(2)
                };
            default:
                return { success: true, message: 'Mock response' };
        }
    }
    
    /**
     * Create or update user from Telegram data
     * @param {Object} userData - User data from Telegram
     * @returns {Promise<Object>} User and token data
     */
    async createUser(userData) {
        try {
            // Валидация входных данных
            if (!userData || typeof userData !== 'object') {
                this.error('Некорректные данные пользователя', userData);
                return {
                    success: false,
                    message: 'Некорректные данные пользователя',
                    error: 'InvalidUserData'
                };
            }
            
            // Проверяем обязательные поля
            const requiredFields = ['id', 'first_name'];
            for (const field of requiredFields) {
                if (!userData[field]) {
                    this.error(`Отсутствует обязательное поле ${field}`, userData);
                    return {
                        success: false,
                        message: `Отсутствует обязательное поле ${field}`,
                        error: 'MissingRequiredField'
                    };
                }
            }
            
            // Трансформируем данные из формата Telegram в формат API
            const apiUserData = {
                telegramId: userData.id,
                firstName: userData.first_name,
                lastName: userData.last_name || '',
                username: userData.username || '',
                authDate: userData.auth_date,
                hash: userData.hash
            };
            
            // Исправление API пути для соответствия бэкенду
            const response = await this.post('/user/create', apiUserData);
            
            if (response && response.success && response.token) {
                // Update token in memory
                this.authToken = response.token;
                
                // Update user ID in memory
                if (response.user && response.user._id) {
                    this.userId = response.user._id;
                }
                
                return response;
            }
            
            if (response && !response.success) {
                return response; // Возвращаем стандартизированный ответ с ошибкой
            }
            
            return {
                success: false,
                message: 'Некорректный ответ от сервера авторизации',
                error: 'InvalidAuthResponse'
            };
        } catch (error) {
            this.error('User creation/authorization failed', error);
            
            // In development mode, return mock data
            if (this.debug) {
                this.warn('Returning mock auth data for development');
                return this._createMockResponse('auth');
            }
            
            return {
                success: false,
                message: error.message || 'Ошибка авторизации',
                error: 'AuthError'
            };
        }
    }
    
    /**
     * Get current user profile
     * @returns {Promise<Object>} User profile data
     */
    async getUserProfile() {
        if (!this.userId) {
            this.warn('Cannot get user profile - no user ID');
            throw new Error('User not authenticated');
        }
        
        return this.get(`/user/${this.userId}`);
    }
    
    /**
     * Start a new game session
     * @returns {Promise<Object>} Game session data
     */
    async startGame() {
        try {
            const response = await this.post('/game/start');
            
            if (!response.success) {
                throw new Error(response.error || 'Не удалось начать игру');
            }
            
            return response;
        } catch (error) {
            console.error('API Error - startGame:', error);
            return {
                success: false,
                error: error.message || 'Ошибка сети при запуске игры'
            };
        }
    }
    
    /**
     * Validate data for a specific endpoint
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Data to validate
     * @returns {Object} Validation result with isValid and errors
     */
    validateData(endpoint, data) {
        let requiredFields = [];
        let errors = [];
        
        // Define validation rules for different endpoints
        switch (endpoint) {
            case '/auth/login':
            case '/user/create':
                requiredFields = ['id', 'first_name'];
                break;
            case '/game/start':
                // No required fields
                break;
            case '/game/submit':
                requiredFields = ['gameId', 'cardId', 'answer'];
                break;
            case '/game/finish':
                requiredFields = ['gameId', 'score', 'cards'];
                if (data.cards && Array.isArray(data.cards)) {
                    // Check each card has required fields
                    data.cards.forEach((card, index) => {
                        if (!card.id) errors.push(`Card at index ${index} missing id`);
                        if (card.seen === undefined) errors.push(`Card at index ${index} missing seen status`);
                        if (card.correct === undefined) errors.push(`Card at index ${index} missing correct status`);
                    });
                } else {
                    errors.push('Missing or invalid cards array');
                }
                break;
            case '/game/track':
                requiredFields = ['action', 'gameId'];
                if (data.action === 'view_card' && !data.cardId) {
                    errors.push('Missing cardId for view_card action');
                }
                break;
            default:
                // No validation rules for this endpoint
                return { isValid: true, errors: [] };
        }
        
        // Check required fields
        requiredFields.forEach(field => {
            if (data[field] === undefined || data[field] === null) {
                errors.push(`Missing required field: ${field}`);
            }
        });
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    
    /**
     * Submit an answer in the game
     * @param {Object} answerData - Answer data
     * @returns {Promise<Object>} Answer result data
     */
    async submitAnswer(answerData) {
        try {
            // Validate answer data
            const validation = this.validateData('/game/submit', answerData);
            if (!validation.isValid) {
                this.error('Invalid answer data:', validation.errors);
                return {
                    success: false,
                    message: 'Invalid answer data: ' + validation.errors.join(', '),
                    error: 'ValidationError'
                };
            }
            
            const response = await this.post('/game/submit', answerData);
            
            if (!response.success) {
                throw new Error(response.error || 'Не удалось отправить ответ');
            }
            
            return response;
        } catch (error) {
            console.error('API Error - submitAnswer:', error);
            return {
                success: false,
                error: error.message || 'Ошибка сети при отправке ответа'
            };
        }
    }
    
    /**
     * Finish a game session
     * @param {Object} gameData - Game data including results
     * @returns {Promise<Object>} Final game results
     */
    async finishGame(gameData) {
        try {
            // Validate game data
            const validation = this.validateData('/game/finish', gameData);
            if (!validation.isValid) {
                this.error('Invalid game data:', validation.errors);
                return {
                    success: false,
                    message: 'Invalid game data: ' + validation.errors.join(', '),
                    error: 'ValidationError'
                };
            }
            
            const response = await this.post('/game/finish', gameData);
            
            if (!response.success) {
                throw new Error(response.error || 'Не удалось завершить игру');
            }
            
            return response;
        } catch (error) {
            console.error('API Error - finishGame:', error);
            return {
                success: false,
                error: error.message || 'Ошибка сети при завершении игры'
            };
        }
    }
    
    /**
     * Track user actions in the game
     * @param {Object} trackData - Tracking data
     * @returns {Promise<Object>} Tracking result
     */
    async trackAction(trackData) {
        try {
            // Validate tracking data
            const validation = this.validateData('/game/track', trackData);
            if (!validation.isValid) {
                this.error('Invalid tracking data:', validation.errors);
                // Not returning error to prevent disrupting user experience
                return { success: false };
            }
            
            const response = await this.post('/game/track', trackData);
            
            // Для трекинга игнорируем ошибки сервера
            return {
                success: true
            };
        } catch (error) {
            console.error('API Error - trackAction:', error);
            // Для действий трекинга возвращаем успех, чтобы не прерывать игровой процесс
            return {
                success: true
            };
        }
    }
    
    /**
     * Get leaderboard data
     * @param {string} [type='alltime'] - Leaderboard type (alltime, weekly, daily)
     * @param {number} [limit=10] - Number of entries to fetch
     * @returns {Promise<Array>} Leaderboard entries
     */
    async getLeaderboard(type = 'alltime', limit = 10) {
        return this.get(`/leaderboard/${type}?limit=${limit}`);
    }
    
    /**
     * Get user achievements
     * @returns {Promise<Array>} User achievements
     */
    async getUserAchievements() {
        if (!this.userId) {
            this.warn('Cannot get achievements - no user ID');
            throw new Error('User not authenticated');
        }
        
        return this.get(`/user/${this.userId}/achievements`);
    }
    
    /**
     * Update session token
     * @param {string} token - New auth token
     */
    updateToken(token) {
        if (token) {
            this.authToken = token;
            this.log('Auth token updated');
        }
    }
}

// Create global instance
const api = new ApiClient({
    baseUrl: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:3000'
        : 'https://first-bot-production.up.railway.app'
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ApiClient, api };
} 