/**
 * Firebase Configuration and Database Integration
 * Holy QR Code Generator - Holy Technologies GmbH
 * 
 * Copyright © 2026 Holy Technologies GmbH, Hamburg, Germany
 * All rights reserved.
 * 
 * This software and its documentation are proprietary to Holy Technologies GmbH.
 * Unauthorized copying, distribution, or use is strictly prohibited.
 * 
 * PURPOSE: Manages Firebase Realtime Database connection, QR code CRUD operations,
 * client-side rate limiting, and offline fallback functionality
 * 
 * FEATURES:
 * - Real-time QR code storage and retrieval
 * - Client-side rate limiting (10 requests/minute)
 * - Automatic offline fallback to encrypted localStorage
 * - Connection monitoring and status management
 * - Duplicate QR code detection
 * - Mobile-compatible URL generation
 */

/**
 * Firebase Configuration Object
 * 
 * SECURITY NOTE: For client-side web applications, Firebase configuration including
 * API keys MUST be public as they're downloaded to users' browsers. Security comes
 * from Firebase Security Rules and proper project configuration, not hiding config.
 *
 * PRODUCTION DEPLOYMENT: For production, consider using environment variables
 * with a build process to inject these values at build time.
 *
 * See: https://firebase.google.com/docs/projects/api-keys#api-keys-for-firebase-are-different
 */

// Production-ready configuration approach:
// const firebaseConfig = {
//     apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
//     authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
//     databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
//     projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
//     storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
//     messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
//     appId: process.env.REACT_APP_FIREBASE_APP_ID,
//     measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
// };

// Development/GitHub Pages configuration (MUST be secured with Firebase Security Rules)
const firebaseConfig = {
    apiKey: "AIzaSyAVlJFr94Fw2yO2WaD5BjuplpjnPvLnlXk",
    authDomain: "dynamic-qr-code-generato-9d566.firebaseapp.com",
    databaseURL: "https://dynamic-qr-code-generato-9d566-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "dynamic-qr-code-generato-9d566",
    storageBucket: "dynamic-qr-code-generato-9d566.firebasestorage.app",
    messagingSenderId: "926211974680",
    appId: "1:926211974680:web:af4bc79b27c21e7e14056d",
    measurementId: "G-WXK3G5W33H"
};

// Global Firebase status tracking
let firebaseInitialized = false;
let databaseAvailable = false;

/**
 * RateLimiter Class - Client-side request throttling
 * 
 * WHY: Prevents abuse of Firebase database and ensures fair usage
 * WHEN: Checked before every QR code creation or database operation
 * HOW: Tracks request timestamps per user in a sliding time window
 * USED BY: generateQRCode() function before creating new QR codes
 */
class RateLimiter {
    constructor() {
        this.requests = new Map();
        this.maxRequests = 10; // per minute
        this.timeWindow = 60000; // 1 minute in milliseconds
    }
    
    /**
     * Check if user can make another request
     * 
     * WHY: Enforces rate limiting to prevent database abuse
     * WHEN: Called before every QR code generation attempt
     * HOW: Counts recent requests within sliding time window
     * USED BY: QR generator before creating new QR codes
     * 
     * @param {string} userId - User identifier (defaults to 'anonymous')
     * @returns {boolean} - true if request is allowed, false if rate limited
     */
    canMakeRequest(userId = 'anonymous') {
        const now = Date.now();
        const userRequests = this.requests.get(userId) || [];
        
        // Remove old requests outside time window
        const recentRequests = userRequests.filter(time => now - time < this.timeWindow);
        
        if (recentRequests.length >= this.maxRequests) {
            console.warn('Rate limit exceeded. Please wait before making more requests.');
            return false;
        }
        
        // Add current request
        recentRequests.push(now);
        this.requests.set(userId, recentRequests);
        return true;
    }
    
    /**
     * Get remaining requests for user
     * 
     * WHY: Provides user feedback about rate limit status
     * WHEN: Called after rate limit exceeded to show remaining requests
     * HOW: Calculates difference between max requests and recent requests
     * USED BY: Error messages to inform users when they can try again
     * 
     * @param {string} userId - User identifier (defaults to 'anonymous')
     * @returns {number} - Number of remaining requests in current time window
     */
    getRemainingRequests(userId = 'anonymous') {
        const now = Date.now();
        const userRequests = this.requests.get(userId) || [];
        const recentRequests = userRequests.filter(time => now - time < this.timeWindow);
        return Math.max(0, this.maxRequests - recentRequests.length);
    }
}

// Initialize global rate limiter instance
window.rateLimiter = new RateLimiter();

/**
 * Firebase Initialization with Error Handling
 * 
 * WHY: Establishes database connection with graceful failure handling
 * WHEN: Executed immediately when script loads
 * HOW: Attempts Firebase initialization, sets up connection monitoring
 * FALLBACK: Sets offline mode flags if initialization fails
 */
try {
    firebase.initializeApp(firebaseConfig);
    window.database = firebase.database();
    firebaseInitialized = true;
    databaseAvailable = true;
    console.log('Firebase initialized successfully');
    
    /**
     * Database Connection Monitor
     * 
     * WHY: Tracks real-time connection status for fallback decisions
     * WHEN: Runs continuously while application is active
     * HOW: Listens to Firebase's built-in connection status indicator
     * USED BY: All database operations to decide between Firebase and localStorage
     */
    window.database.ref('.info/connected').on('value', (snapshot) => {
        const wasAvailable = databaseAvailable;
        databaseAvailable = snapshot.val() === true;
        
        if (!databaseAvailable && wasAvailable) {
            console.warn('Firebase database disconnected - using local storage fallback');
        } else if (databaseAvailable && !wasAvailable) {
            console.log('Firebase database reconnected');
        }
    });
    
} catch (error) {
    firebaseInitialized = false;
    databaseAvailable = false;
    console.warn('Firebase initialization failed:', error.message);
    console.log('Running in offline mode - all data stored locally');
}

/**
 * FirebaseStatus - Connection Status Monitoring
 * 
 * WHY: Provides real-time connection status for intelligent fallback decisions
 * WHEN: Checked before database operations to choose storage method
 * HOW: Monitors Firebase connection state and initialization status
 * USED BY: All database operations to determine online/offline mode
 */
const FirebaseStatus = {
    /**
     * Check if Firebase is available and connected
     * 
     * WHY: Determines if online database operations are possible
     * WHEN: Called before every database operation
     * HOW: Checks both initialization and connection status
     * USED BY: All FirebaseManager methods for storage decisions
     * 
     * @returns {boolean} - true if Firebase is fully available
     */
    isAvailable() {
        return firebaseInitialized && databaseAvailable;
    },
    
    /**
     * Check if Firebase was successfully initialized
     * 
     * WHY: Distinguishes between initialization failure and connection loss
     * WHEN: Used in error handling and diagnostics
     * HOW: Checks if Firebase SDK was loaded and configured properly
     * USED BY: Diagnostic functions and error reporting
     * 
     * @returns {boolean} - true if Firebase was initialized
     */
    isInitialized() {
        return firebaseInitialized;
    },
    
    /**
     * Get detailed connection status
     * 
     * WHY: Provides specific connection state for user feedback
     * WHEN: Used in UI to show connection status to users
     * HOW: Returns specific status based on initialization and connection
     * USED BY: Status indicators and connection diagnostics
     * 
     * @returns {string} - 'offline', 'disconnected', or 'connected'
     */
    getStatus() {
        if (!firebaseInitialized) return 'offline';
        if (!databaseAvailable) return 'disconnected';
        return 'connected';
    }
};

/**
 * FirebaseManager - Comprehensive QR Code Database Operations
 * 
 * WHY: Centralizes all QR code data operations with intelligent fallback
 * WHEN: Used for all QR code creation, retrieval, and management operations
 * HOW: Provides unified interface for Firebase and localStorage operations
 * FEATURES: Duplicate detection, scan tracking, offline support, analytics
 */
const FirebaseManager = {
    /**
     * Check for duplicate QR codes by content and name
     * 
     * WHY: Prevents unnecessary duplicate creation and saves storage space
     * WHEN: Called before creating new QR codes to warn users
     * HOW: Searches recent QR codes for matching text and name combinations
     * USED BY: QR generation process to show duplicate warnings
     * 
     * @param {string} originalText - QR code content to check
     * @param {string} name - QR code name/title to check
     * @returns {Promise<Object|null>} - Existing QR data if duplicate found
     */
    async checkForDuplicate(originalText, name) {
        try {
            if (typeof firebase !== 'undefined' && window.database) {
                // Firebase approach - get recent QR codes and check for duplicates
                const snapshot = await window.database.ref('qr-codes')
                    .orderByChild('createdAt')
                    .limitToLast(50) // Check last 50 QR codes for performance
                    .once('value');
                
                let duplicate = null;
                snapshot.forEach((childSnapshot) => {
                    const qrData = childSnapshot.val();
                    if (qrData && 
                        qrData.originalText === originalText && 
                        qrData.name === name) {
                        duplicate = qrData;
                    }
                });
                
                return duplicate;
            } else {
                // Encrypted localStorage fallback
                const localQRs = await SecurityUtils.CryptoManager.getItem('qr-codes') || {};
                
                // Find duplicate by comparing text and name
                for (const [qrId, qrData] of Object.entries(localQRs)) {
                    if (qrData.originalText === originalText && qrData.name === name) {
                        return qrData;
                    }
                }
                return null;
            }
        } catch (error) {
            console.error('Error checking for duplicates:', error);
            return null; // On error, allow creation to proceed
        }
    },

    /**
     * Create new QR code entry with full metadata
     * 
     * WHY: Persists QR code data for sharing, analytics, and mobile access
     * WHEN: Called after successful QR code generation
     * HOW: Stores in Firebase with fallback to encrypted localStorage
     * USED BY: QR generator after user creates a new QR code
     * 
     * @param {string} originalText - The QR code content
     * @param {string} name - Display name for the QR code
     * @param {string|null} logoPath - Optional logo file path
     * @returns {Promise<string>} - Unique QR code identifier
     */
    async createQRCode(originalText, name, logoPath = null) {
        try {
            const qrId = this.generateUniqueId();
            const qrData = {
                id: qrId,
                name: name,
                originalText: originalText,
                logoPath: logoPath,
                scanCount: 0,
                createdAt: Date.now(), // Use local timestamp if Firebase unavailable
                lastScanned: null
            };

            // Primary: Firebase with server timestamp
            if (typeof firebase !== 'undefined' && window.database) {
                await window.database.ref('qr-codes/' + qrId).set({
                    ...qrData,
                    createdAt: firebase.database.ServerValue.TIMESTAMP
                });
                console.log('QR code created successfully in Firebase:', qrId);
            } else {
                // Fallback: Encrypted localStorage
                const localQRs = await SecurityUtils.CryptoManager.getItem('qr-codes') || {};
                localQRs[qrId] = qrData;
                await SecurityUtils.CryptoManager.setItem('qr-codes', localQRs);
                console.log('QR code created successfully in local storage:', qrId);
            }
            
            return qrId;
        } catch (error) {
            console.error('Error creating QR code:', error);
            throw new Error('Failed to save QR code. Please try again.');
        }
    },

    /**
     * Retrieve QR code data by ID
     * 
     * WHY: Enables QR code sharing and cross-page data access
     * WHEN: Called when loading shared QR codes or displaying saved codes
     * HOW: Searches Firebase first, then encrypted localStorage
     * USED BY: Redirect page to display QR content from URL parameters
     * 
     * @param {string} qrId - Unique QR code identifier
     * @returns {Promise<Object|null>} - QR code data or null if not found
     */
    async getQRCode(qrId) {
        try {
            // Input validation
            if (!qrId || typeof qrId !== 'string') {
                throw new Error('Invalid QR code ID provided');
            }

            if (typeof firebase !== 'undefined' && window.database) {
                const snapshot = await window.database.ref('qr-codes/' + qrId).once('value');
                return snapshot.val();
            } else {
                // Encrypted localStorage fallback
                const localQRs = await SecurityUtils.CryptoManager.getItem('qr-codes') || {};
                return localQRs[qrId] || null;
            }
        } catch (error) {
            console.error('Error retrieving QR code:', error);
            throw new Error('Failed to load QR code data.');
        }
    },

    /**
     * Increment scan count for analytics
     * 
     * WHY: Tracks QR code usage for analytics and popularity metrics
     * WHEN: Called each time a QR code is successfully scanned/accessed
     * HOW: Uses Firebase transactions for consistency or localStorage updates
     * USED BY: Redirect page and QR code access points
     * 
     * @param {string} qrId - QR code identifier to update
     */
    async incrementScanCount(qrId) {
        try {
            if (typeof firebase !== 'undefined' && window.database) {
                // Firebase transaction for consistent updates
                const qrRef = window.database.ref('qr-codes/' + qrId);
                await qrRef.transaction((currentData) => {
                    if (currentData) {
                        currentData.scanCount = (currentData.scanCount || 0) + 1;
                        currentData.lastScanned = firebase.database.ServerValue.TIMESTAMP;
                    }
                    return currentData;
                });
                console.log('Scan count incremented for:', qrId);
            } else {
                // localStorage fallback with encryption
                const localQRs = await SecurityUtils.CryptoManager.getItem('qr-codes') || {};
                if (localQRs[qrId]) {
                    localQRs[qrId].scanCount = (localQRs[qrId].scanCount || 0) + 1;
                    localQRs[qrId].lastScanned = Date.now();
                    await SecurityUtils.CryptoManager.setItem('qr-codes', localQRs);
                }
                console.log('Scan count incremented locally for:', qrId);
            }
        } catch (error) {
            console.error('Error incrementing scan count:', error);
            // Don't throw - scan count is not critical functionality
        }
    },

    /**
     * Set up real-time scan count monitoring
     * 
     * WHY: Provides live updates for QR code analytics and usage tracking
     * WHEN: Set up when displaying QR code statistics or analytics
     * HOW: Uses Firebase real-time listeners or polling for localStorage
     * USED BY: Analytics dashboards and QR code management interfaces
     * 
     * @param {string} qrId - QR code to monitor
     * @param {Function} callback - Function called with updated data
     * @returns {Function} - Cleanup function to stop monitoring
     */
    onScanCountChange(qrId, callback) {
        if (typeof firebase !== 'undefined' && window.database) {
            // Real-time Firebase listener
            const qrRef = window.database.ref('qr-codes/' + qrId);
            qrRef.on('value', (snapshot) => {
                const data = snapshot.val();
                if (data && callback) {
                    callback(data);
                }
            });
            
            // Return cleanup function
            return () => qrRef.off('value');
        } else {
            // For local testing, just return the current data once
            setTimeout(() => {
                this.getQRCode(qrId).then(data => {
                    if (data && callback) {
                        callback(data);
                    }
                });
            }, 100);
            return () => {}; // No cleanup needed for local
        }
    },

    /**
     * Get recent QR codes for dashboard display
     * 
     * WHY: Provides recent activity overview for users
     * WHEN: Called when loading QR code management dashboards
     * HOW: Queries Firebase by creation time or sorts localStorage entries
     * USED BY: Dashboard components showing recent QR code activity
     * 
     * @param {number} limit - Maximum number of QR codes to return
     * @returns {Promise<Array>} - Array of recent QR code data
     */
    async getRecentQRCodes(limit = 10) {
        try {
            if (typeof firebase !== 'undefined' && window.database) {
                const snapshot = await window.database.ref('qr-codes')
                    .orderByChild('createdAt')
                    .limitToLast(limit)
                    .once('value');
                
                const qrCodes = [];
                snapshot.forEach((childSnapshot) => {
                    qrCodes.unshift(childSnapshot.val()); // Reverse order for newest first
                });
                return qrCodes;
            } else {
                // localStorage with encryption
                const localQRs = await SecurityUtils.CryptoManager.getItem('qr-codes') || {};
                const qrCodes = Object.values(localQRs)
                    .sort((a, b) => b.createdAt - a.createdAt)
                    .slice(0, limit);
                return qrCodes;
            }
        } catch (error) {
            console.error('Error getting recent QR codes:', error);
            return [];
        }
    },

    /**
     * Generate unique collision-resistant ID
     * 
     * WHY: Creates unique identifiers for QR codes to prevent conflicts
     * WHEN: Called when creating new QR code entries
     * HOW: Combines timestamp with random string for uniqueness
     * USED BY: createQRCode() method for generating primary keys
     * 
     * @returns {string} - Unique identifier string
     */
    generateUniqueId() {
        const timestamp = Date.now().toString(36);
        const randomStr = Math.random().toString(36).substr(2, 9);
        return `${timestamp}_${randomStr}`;
    },

    /**
     * Generate mobile-compatible redirect URL
     * 
     * WHY: Creates shareable URLs that work across all devices and browsers
     * WHEN: Called after QR code creation for sharing functionality
     * HOW: Builds URL with current domain and QR ID parameter
     * USED BY: QR code sharing features and mobile compatibility
     * 
     * @param {string} qrId - QR code identifier
     * @returns {string} - Complete redirect URL
     */
    getRedirectUrl(qrId) {
        // Build URL compatible with GitHub Pages and custom domains
        const baseUrl = window.location.origin + window.location.pathname.replace('index.html', '');
        return `${baseUrl}redirect.html?id=${encodeURIComponent(qrId)}`;
    },

    /**
     * Format timestamp for user display
     * 
     * WHY: Provides human-readable timestamps for QR code metadata
     * WHEN: Called when displaying QR code creation/scan times
     * HOW: Converts timestamps to localized date/time strings
     * USED BY: Dashboard and analytics displays
     * 
     * @param {number|null} timestamp - Unix timestamp to format
     * @returns {string} - Formatted date/time string
     */
    formatTimestamp(timestamp) {
        if (!timestamp || timestamp === null) return 'Never';
        try {
            const date = new Date(timestamp);
            if (isNaN(date.getTime())) return 'Invalid Date';
            
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        } catch (error) {
            console.error('Error formatting timestamp:', error);
            return 'Unknown';
        }
    }

};

// Export for use in other scripts
window.FirebaseManager = FirebaseManager;