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
// NOTE: Firebase client-side API keys are designed to be public and safe to expose
// Security comes from Firebase Security Rules, not hiding this config
// See: https://firebase.google.com/docs/projects/api-keys#api-keys-for-firebase-are-different
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

// Initialize Firebase
try {
    firebase.initializeApp(firebaseConfig);
    window.database = firebase.database();
    console.log('Firebase initialized successfully');
} catch (error) {
    console.warn('Firebase initialization failed:', error);
    console.log('Running in offline mode - tracking disabled');
}

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

            // Try Firebase, fallback to localStorage for testing
            if (typeof firebase !== 'undefined' && window.database) {
                await window.database.ref('qr-codes/' + qrId).set({
                    ...qrData,
                    createdAt: firebase.database.ServerValue.TIMESTAMP
                });
                console.log('QR code created successfully in Firebase:', qrId);
            } else {
                // Fallback for local testing
                const localQRs = JSON.parse(localStorage.getItem('qr-codes') || '{}');
                localQRs[qrId] = qrData;
                localStorage.setItem('qr-codes', JSON.stringify(localQRs));
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
                // Fallback for local testing
                const localQRs = JSON.parse(localStorage.getItem('qr-codes') || '{}');
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
                // Fallback for local testing
                const localQRs = JSON.parse(localStorage.getItem('qr-codes') || '{}');
                if (localQRs[qrId]) {
                    localQRs[qrId].scanCount = (localQRs[qrId].scanCount || 0) + 1;
                    localQRs[qrId].lastScanned = Date.now();
                    localStorage.setItem('qr-codes', JSON.stringify(localQRs));
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
                // Fallback for local testing
                const localQRs = JSON.parse(localStorage.getItem('qr-codes') || '{}');
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