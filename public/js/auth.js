/**
 * Authentication Module for the Telegram Web App
 * Handles user authentication, session management, and integration with Telegram
 */
class AuthModule {
    /**
     * Create a new authentication module
     */
    constructor() {
        // Storage keys for persistent data
        this.STORAGE_KEYS = {
            AUTH_CREDENTIAL: 'criminal_bluff_auth_credential',
            SESSION_START: 'criminal_bluff_session_start',
            USER_DATA: 'criminal_bluff_user_data',
        };
        
        // Session duration in milliseconds (24 hours)
        this.SESSION_DURATION = 24 * 60 * 60 * 1000;
        
        // Debug mode for development
        this.debug = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1';
        
        // Initialize module
        this.init();
    }
    
    /**
     * Initialize the authentication module
     */
    init() {
        this.log('AuthModule initialized');
        
        // Check if we're in Telegram WebApp environment
        this.isTelegramWebApp = window.Telegram && window.Telegram.WebApp;
        
        if (this.isTelegramWebApp) {
            this.log('Running in Telegram WebApp environment');
        } else {
            this.warn('Not running in Telegram WebApp environment');
        }
    }
    
    /**
     * Log messages in debug mode
     * @param {string} message - Log message
     * @param {Object} [data] - Additional data to log
     */
    log(message, data) {
        if (this.debug) {
            console.log(`[Auth] ${message}`, data || '');
        }
    }
    
    /**
     * Log warnings
     * @param {string} message - Warning message
     * @param {Object} [data] - Additional data to log
     */
    warn(message, data) {
        if (this.debug) {
            console.warn(`[Auth] ${message}`, data || '');
        }
    }
    
    /**
     * Log errors
     * @param {string} message - Error message
     * @param {Object} [data] - Additional data to log
     */
    error(message, data) {
        console.error(`[Auth] ${message}`, data || '');
    }
    
    /**
     * Extract telegram initialization data from WebApp
     * @returns {Object|null} Telegram initialization data or null if not available
     */
    extractTelegramInitData() {
        try {
            // Check if we're in Telegram WebApp environment
            if (!this.isTelegramWebApp) {
                this.warn('Cannot extract Telegram data: Not in Telegram WebApp environment');
                return null;
            }
            
            const webApp = window.Telegram.WebApp;
            
            // Extract user data
            if (!webApp.initDataUnsafe || !webApp.initDataUnsafe.user) {
                this.warn('No user data in Telegram WebApp initDataUnsafe');
                return null;
            }
            
            const user = webApp.initDataUnsafe.user;
            
            // Log extracted data
            this.log('Extracted Telegram user data', user);
            
            return {
                telegramId: user.id.toString(),
                firstName: user.first_name || '',
                lastName: user.last_name || '',
                username: user.username || '',
                languageCode: webApp.initDataUnsafe.user.language_code || 'en',
                initData: webApp.initData,
                colorScheme: webApp.colorScheme || 'light',
                themeParams: webApp.themeParams || {}
            };
        } catch (error) {
            this.error('Failed to extract Telegram data', error);
            return null;
        }
    }
    
    /**
     * Create mock Telegram data for development purposes
     * @private
     * @returns {Object} Mock Telegram user data
     */
    _createMockTelegramData() {
        const mockId = Math.floor(Math.random() * 1000000000).toString();
        
        return {
            telegramId: mockId,
            firstName: 'Test',
            lastName: 'User',
            username: `test_user_${mockId.substring(0, 4)}`,
            languageCode: 'en',
            initData: 'mock_init_data',
            colorScheme: 'light',
            themeParams: {
                bg_color: '#ffffff',
                text_color: '#000000',
                hint_color: '#999999',
                button_color: '#2673b6',
                button_text_color: '#ffffff'
            },
            isMockData: true
        };
    }
    
    /**
     * Prepare user data for API authorization
     * @returns {Object|null} User data for API or null if not available
     */
    prepareUserData() {
        try {
            // Extract data from Telegram WebApp
            let userData = this.extractTelegramInitData();
            
            // Use mock data in development if no Telegram data available
            if (!userData && this.debug) {
                this.warn('Using mock Telegram data for development');
                userData = this._createMockTelegramData();
            }
            
            // If still no user data, authentication is not possible
            if (!userData) {
                this.error('Failed to prepare user data for authorization');
                return null;
            }
            
            this.log('Prepared user data for authorization', userData);
            return userData;
        } catch (error) {
            this.error('Error preparing user data', error);
            return null;
        }
    }
    
    /**
     * Save user session data to localStorage
     * @param {Object} authResponse - Authentication response from API
     */
    saveSessionData(authResponse) {
        try {
            if (!authResponse || !authResponse.token || !authResponse.user) {
                this.error('Invalid auth response, cannot save session');
                return false;
            }
            
            // Save auth token
            localStorage.setItem(
                this.STORAGE_KEYS.AUTH_CREDENTIAL, 
                authResponse.token
            );
            
            // Save session start time
            localStorage.setItem(
                this.STORAGE_KEYS.SESSION_START, 
                Date.now().toString()
            );
            
            // Save user data
            localStorage.setItem(
                this.STORAGE_KEYS.USER_DATA, 
                JSON.stringify(authResponse.user)
            );
            
            this.log('Session data saved successfully');
            return true;
        } catch (error) {
            this.error('Failed to save session data', error);
            return false;
        }
    }
    
    /**
     * Check if the current session is valid
     * @returns {boolean} True if session is valid
     */
    isSessionValid() {
        try {
            // Check if token exists
            const token = localStorage.getItem(this.STORAGE_KEYS.AUTH_CREDENTIAL);
            if (!token) {
                this.log('No auth token found in localStorage');
                return false;
            }
            
            // Check if user data exists
            const userData = localStorage.getItem(this.STORAGE_KEYS.USER_DATA);
            if (!userData) {
                this.log('No user data found in localStorage');
                return false;
            }
            
            // Check session age
            const sessionStart = parseInt(localStorage.getItem(this.STORAGE_KEYS.SESSION_START) || '0', 10);
            const sessionAge = Date.now() - sessionStart;
            
            if (sessionAge >= this.SESSION_DURATION) {
                this.log('Session expired');
                return false;
            }
            
            this.log('Session is valid');
            return true;
        } catch (error) {
            this.error('Error checking session validity', error);
            return false;
        }
    }
    
    /**
     * Clear all session data from localStorage
     */
    clearSessionData() {
        try {
            localStorage.removeItem(this.STORAGE_KEYS.AUTH_CREDENTIAL);
            localStorage.removeItem(this.STORAGE_KEYS.SESSION_START);
            localStorage.removeItem(this.STORAGE_KEYS.USER_DATA);
            this.log('Session data cleared');
        } catch (error) {
            this.error('Failed to clear session data', error);
        }
    }
    
    /**
     * Get current authenticated user data
     * @returns {Object|null} User data or null if not authenticated
     */
    getCurrentUser() {
        try {
            if (!this.isSessionValid()) {
                return null;
            }
            
            const userData = localStorage.getItem(this.STORAGE_KEYS.USER_DATA);
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            this.error('Error getting current user', error);
            return null;
        }
    }
    
    /**
     * Authorize user with the API
     * @param {Function} [callback] - Optional callback after authorization
     */
    async authorizeUser(callback) {
        try {
            // Check if we already have a valid session
            if (this.isSessionValid()) {
                this.log('Using existing valid session');
                
                // Update token in API client
                if (window.api) {
                    const token = localStorage.getItem(this.STORAGE_KEYS.AUTH_CREDENTIAL);
                    window.api.updateToken(token);
                }
                
                // Call callback if provided
                if (typeof callback === 'function') {
                    const userData = this.getCurrentUser();
                    callback(null, userData);
                }
                
                return;
            }
            
            // Prepare user data for authorization
            const userData = this.prepareUserData();
            if (!userData) {
                const error = new Error('Failed to prepare user data for authorization');
                if (typeof callback === 'function') {
                    callback(error);
                }
                throw error;
            }
            
            this.log('Authorizing user with API...');
            
            // Authorize with API
            const authResponse = await window.api.createUser(userData);
            
            // Save session data
            if (authResponse && authResponse.token) {
                this.saveSessionData(authResponse);
                
                this.log('User authorized successfully', { 
                    userId: authResponse.user?._id,
                    hasToken: !!authResponse.token 
                });
                
                // Call callback if provided
                if (typeof callback === 'function') {
                    callback(null, authResponse.user);
                }
            } else {
                throw new Error('Invalid auth response from API');
            }
        } catch (error) {
            this.error('Authorization failed', error);
            
            // Call callback with error if provided
            if (typeof callback === 'function') {
                callback(error);
            }
            
            throw error;
        }
    }
}

// Create global instance
const auth = new AuthModule();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AuthModule, auth };
} 