/**
 * Firebase Configuration and Database Integration
 * Dynamic QR Code Generator with Analytics
 * 
 * Copyright © 2026 Holy Technologies GmbH, Hamburg, Germany
 * All rights reserved.
 * 
 * This software and its documentation are proprietary to Holy Technologies GmbH.
 * Unauthorized copying, distribution, or use is strictly prohibited.
 */

// Firebase Configuration
// Dynamic QR Code Generator Firebase Config
//
// SECURITY NOTE: For client-side web applications, Firebase configuration including
// API keys MUST be public as they're downloaded to users' browsers. Security comes
// from Firebase Security Rules and proper project configuration, not hiding config.
//
// PRODUCTION DEPLOYMENT: For production, consider using environment variables
// with a build process to inject these values at build time.
//
// See: https://firebase.google.com/docs/projects/api-keys#api-keys-for-firebase-are-different

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

// Initialize Firebase with enhanced error handling
let firebaseInitialized = false;
let databaseAvailable = false;

// Rate Limiting Class for Client-Side Protection
class RateLimiter {
    constructor() {
        this.requests = new Map();
        this.maxRequests = 10; // per minute
        this.timeWindow = 60000; // 1 minute in milliseconds
    }
    
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
    
    getRemainingRequests(userId = 'anonymous') {
        const now = Date.now();
        const userRequests = this.requests.get(userId) || [];
        const recentRequests = userRequests.filter(time => now - time < this.timeWindow);
        return Math.max(0, this.maxRequests - recentRequests.length);
    }
}

// Initialize rate limiter
window.rateLimiter = new RateLimiter();

try {
    firebase.initializeApp(firebaseConfig);
    window.database = firebase.database();
    firebaseInitialized = true;
    databaseAvailable = true;
    console.log('Firebase initialized successfully');
    
    // Test database connection
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

// Firebase status monitoring
const FirebaseStatus = {
    isAvailable() {
        return firebaseInitialized && databaseAvailable;
    },
    
    isInitialized() {
        return firebaseInitialized;
    },
    
    getStatus() {
        if (!firebaseInitialized) return 'offline';
        if (!databaseAvailable) return 'disconnected';
        return 'connected';
    }
};

// Database helper functions
const FirebaseManager = {
    // Create new QR code entry
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

            // Try Firebase first, fallback to encrypted localStorage
            if (typeof firebase !== 'undefined' && window.database) {
                await window.database.ref('qr-codes/' + qrId).set({
                    ...qrData,
                    createdAt: firebase.database.ServerValue.TIMESTAMP
                });
                console.log('QR code created successfully in Firebase:', qrId);
            } else {
                // Fallback for local testing with encryption
                const localQRs = await SecurityUtils.CryptoManager.getItem('qr-codes') || {};
                localQRs[qrId] = qrData;
                await SecurityUtils.CryptoManager.setItem('qr-codes', localQRs);
                console.log('QR code created successfully locally:', qrId);
            }
            
            return qrId;
        } catch (error) {
            console.error('Error creating QR code:', error);
            throw error;
        }
    },

    // Get QR code data
    async getQRCode(qrId) {
        try {
            if (typeof firebase !== 'undefined' && window.database) {
                const snapshot = await window.database.ref('qr-codes/' + qrId).once('value');
                return snapshot.val();
            } else {
                // Fallback for local testing with encryption
                const localQRs = await SecurityUtils.CryptoManager.getItem('qr-codes') || {};
                return localQRs[qrId] || null;
            }
        } catch (error) {
            console.error('Error getting QR code:', error);
            throw error;
        }
    },

    // Increment scan count
    async incrementScanCount(qrId) {
        try {
            if (typeof firebase !== 'undefined' && window.database) {
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
                // Fallback for local testing with encryption
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
            throw error;
        }
    },

    // Listen to scan count changes
    onScanCountChange(qrId, callback) {
        if (typeof firebase !== 'undefined' && window.database) {
            const qrRef = window.database.ref('qr-codes/' + qrId);
            qrRef.on('value', (snapshot) => {
                const data = snapshot.val();
                if (data && callback) {
                    callback(data);
                }
            });
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

    // Get recent QR codes (last 10)
    async getRecentQRCodes() {
        try {
            if (typeof firebase !== 'undefined' && window.database) {
                const snapshot = await window.database.ref('qr-codes')
                    .orderByChild('createdAt')
                    .limitToLast(10)
                    .once('value');
                
                const qrCodes = [];
                snapshot.forEach((childSnapshot) => {
                    qrCodes.unshift(childSnapshot.val());
                });
                return qrCodes;
            } else {
                // Fallback for local testing with encryption
                const localQRs = await SecurityUtils.CryptoManager.getItem('qr-codes') || {};
                const qrCodes = Object.values(localQRs)
                    .sort((a, b) => b.createdAt - a.createdAt)
                    .slice(0, 10);
                return qrCodes;
            }
        } catch (error) {
            console.error('Error getting recent QR codes:', error);
            return [];
        }
    },

    // Generate unique ID for QR codes
    generateUniqueId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    // Get redirect URL for QR code
    getRedirectUrl(qrId) {
        // Update this with your GitHub Pages URL
        const baseUrl = window.location.origin + window.location.pathname.replace('index.html', '');
        return `${baseUrl}redirect.html?id=${qrId}`;
    },

    // Format timestamp
    formatTimestamp(timestamp) {
        if (!timestamp) return 'Never';
        const date = new Date(timestamp);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }
};

// Export for use in other scripts
window.FirebaseManager = FirebaseManager;