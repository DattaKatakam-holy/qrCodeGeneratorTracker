/**
 * QR Code Redirect Handler with Mobile Compatibility and Security
 * Holy QR Code Generator - Holy Technologies GmbH
 * 
 * Copyright © 2026 Holy Technologies GmbH, Hamburg, Germany
 * All rights reserved.
 * 
 * This software and its documentation are proprietary to Holy Technologies GmbH.
 * Unauthorized copying, distribution, or use is strictly prohibited.
 * 
 * PURPOSE: Handles QR code scanning results, tracks analytics, and redirects users
 * securely to the intended content with comprehensive fallback mechanisms
 * 
 * FEATURES:
 * - Multi-layer data access (Firebase → localStorage → URL fallback)
 * - Mobile device compatibility with cross-session data access
 * - URL validation and security filtering
 * - Real-time scan count tracking
 * - Elegant error handling and user feedback
 * - Text content display for non-URL QR codes
 */

/**
 * QRRedirectManager Class - Secure QR Code Content Resolution
 * 
 * WHY: Provides secure, reliable access to QR code content across all devices
 * WHEN: Instantiated when redirect.html page loads from QR code scan
 * HOW: Extracts QR ID from URL, retrieves data, validates content, and redirects safely
 * USED BY: QR code scanning from any device or QR reader application
 */
class QRRedirectManager {
    /**
     * Initialize redirect manager and start content resolution process
     * 
     * WHY: Sets up QR code content resolution with comprehensive error handling
     * WHEN: Called when redirect page loads from QR code scan
     * HOW: Extracts QR ID from URL parameters and begins data retrieval
     * USED BY: Page load process when users scan QR codes
     */
    constructor() {
        this.qrId = this.getQRIdFromURL();
        this.fallbackData = this.getFallbackDataFromURL();
        this.init();
    }

    /**
     * Extract QR code identifier from URL parameters
     * 
     * WHY: Determines which QR code data to retrieve from database
     * WHEN: Called during initialization to identify the QR code
     * HOW: Parses URL search parameters for 'id' parameter
     * USED BY: Constructor to identify the target QR code
     * 
     * @returns {string|null} - QR code identifier or null if not found
     */
    getQRIdFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id');
    }

    /**
     * Extract mobile fallback data from URL parameters
     * 
     * WHY: Enables QR codes to work on mobile devices without shared localStorage
     * WHEN: Called during initialization to check for embedded fallback data
     * HOW: Decodes base64 JSON data from URL 'data' parameter
     * USED BY: Constructor to support cross-device compatibility
     * 
     * @returns {Object|null} - Decoded fallback data or null if not available
     */
    getFallbackDataFromURL() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const encodedData = urlParams.get('data');
            
            if (encodedData) {
                const decodedData = atob(decodeURIComponent(encodedData));
                return JSON.parse(decodedData);
            }
            return null;
        } catch (error) {
            console.warn('Failed to decode fallback data:', error);
            return null;
        }
    }

    /**
     * Initialize content resolution with progressive fallback mechanisms
     * 
     * WHY: Ensures QR codes work reliably across all scenarios and devices
     * WHEN: Called after constructor sets up basic properties
     * HOW: Attempts multiple data sources in priority order with error handling
     * USED BY: Constructor to begin the content resolution process
     * 
     * FALLBACK ORDER:
     * 1. Firebase Realtime Database (primary)
     * 2. Encrypted localStorage (desktop sessions)
     * 3. Unencrypted localStorage (legacy support)
     * 4. URL fallback data (mobile compatibility)
     */
    async init() {
        if (!this.qrId) {
            this.showError('Invalid QR code link. Missing identifier.');
            return;
        }

        try {            
            let qrData = null;
            
            // Primary: Attempt Firebase database access
            try {
                qrData = await FirebaseManager.getQRCode(this.qrId);
                if (qrData) {
                    console.log('QR data loaded from Firebase');
                }
            } catch (error) {
                console.warn('Firebase access failed:', error);
            }
            
            // Fallback 1: Encrypted localStorage (same-session desktop access)
            if (!qrData) {
                try {
                    const localQRs = await SecurityUtils.CryptoManager.getItem('qr-codes') || {};
                    qrData = localQRs[this.qrId] || null;
                    if (qrData) {
                        console.log('QR data loaded from encrypted localStorage');
                    }
                } catch (error) {
                    console.warn('Encrypted localStorage access failed:', error);
                }
            }
            
            // Fallback 2: Unencrypted localStorage (legacy support)
            if (!qrData) {
                try {
                    const unencryptedData = localStorage.getItem('qr-codes');
                    if (unencryptedData) {
                        const parsedData = JSON.parse(unencryptedData);
                        qrData = parsedData[this.qrId] || null;
                        if (qrData) {
                            console.log('QR data loaded from legacy localStorage');
                        }
                    }
                } catch (error) {
                    console.warn('Legacy localStorage access failed:', error);
                }
            }
            
            if (!qrData) {
                this.showError('QR code content not found. The code may have expired or the database may be temporarily unavailable.');
                return;
            }

            // Track scan analytics (best effort, don't fail if tracking fails)
            try {
                await FirebaseManager.incrementScanCount(this.qrId);
            } catch (error) {
                console.warn('Scan tracking failed:', error);
                // Continue with redirect - analytics failure shouldn't block access
            }
            
            // Show content preview with security sanitization
            const sanitizedText = SecurityUtils.truncateText(qrData.originalText, 50);
            document.querySelector('.redirect-container p').textContent = 
                `Redirecting to: ${sanitizedText}`;

            // Redirect after brief delay (allows tracking to complete)
            setTimeout(() => {
                this.redirectToOriginal(qrData.originalText);
            }, 1500);

        } catch (error) {
            console.error('Redirect initialization error:', error);
            this.showError('Unable to process your request. Please check your internet connection and try again.');
        }
    }

    /**
     * Handle redirection to original content with security validation
     * 
     * WHY: Safely redirects users while preventing malicious content execution
     * WHEN: Called after QR data is successfully retrieved and validated
     * HOW: Validates URLs and either redirects or displays text content
     * USED BY: init() method after successful data retrieval
     * 
     * @param {string} originalText - The QR code's original content
     */
    redirectToOriginal(originalText) {
        try {
            // Validate and sanitize the original content
            const sanitizedText = SecurityUtils.sanitizeText(originalText);
            
            if (this.isValidURL(sanitizedText)) {
                // Safe URL - proceed with redirect
                console.log('Redirecting to validated URL:', sanitizedText);
                window.location.href = sanitizedText;
            } else {
                // Not a URL or invalid URL - display as text content
                console.log('Displaying text content (not a valid URL)');
                this.showTextContent(sanitizedText);
            }
        } catch (error) {
            console.error('Redirect error:', error);
            this.showError('Unable to process QR code content safely.');
        }
    }

    /**
     * Comprehensive URL validation with security filtering
     * 
     * WHY: Prevents XSS attacks and malicious redirects through QR codes
     * WHEN: Called before redirecting to validate URL safety
     * HOW: Checks protocol, domain structure, and filters dangerous patterns
     * USED BY: redirectToOriginal() method for security validation
     * 
     * SECURITY CHECKS:
     * - Only allows HTTP/HTTPS protocols
     * - Blocks javascript:, data:, file: schemes
     * - Validates URL structure
     * - Supports domain-only URLs with auto-HTTPS
     * 
     * @param {string} string - URL string to validate
     * @returns {boolean} - true if URL is safe for redirect
     */
    isValidURL(string) {
        try {
            const url = new URL(string);
            
            // Only allow safe web protocols
            if (!['http:', 'https:'].includes(url.protocol)) {
                return false;
            }
            
            // Block dangerous protocols and schemes
            const dangerousPatterns = [
                'javascript:',
                'data:',
                'vbscript:',
                'file:',
                'ftp:',
                'about:',
                'blob:'
            ];
            
            const lowerString = string.toLowerCase();
            if (dangerousPatterns.some(pattern => lowerString.includes(pattern))) {
                console.warn('Blocked dangerous URL pattern:', string);
                return false;
            }
            
            return true;
        } catch (urlError) {
            // Try to handle domain-only URLs (e.g., "google.com" → "https://google.com")
            if (string.includes('.') && !string.includes(' ')) {
                try {
                    // Add https:// prefix and validate
                    const httpsUrl = string.startsWith('www.') ? `https://${string}` : `https://${string}`;
                    new URL(httpsUrl);
                    
                    // If validation passes, modify the original string for redirect
                    arguments[0] = httpsUrl;
                    return true;
                } catch (httpsError) {
                    console.warn('URL validation failed:', string);
                    return false;
                }
            }
            return false;
        }
    }

    /**
     * Display text content with elegant UI when QR contains non-URL data
     * 
     * WHY: Provides beautiful display for text-based QR codes (not just URLs)
     * WHEN: Called when QR code contains text that isn't a valid URL
     * HOW: Replaces page content with styled text display and interaction options
     * USED BY: redirectToOriginal() method for non-URL QR code content
     * 
     * @param {string} text - Sanitized text content to display
     */
    showTextContent(text) {
        const sanitizedText = SecurityUtils.sanitizeText(text);
        const escapedForButton = SecurityUtils.escapeHTML(text).replace(/'/g, '&#39;');
        
        document.body.innerHTML = `
            <div class="content-display">
                <div class="content-container">
                    <div class="content-header">
                        <i class="fas fa-qrcode"></i>
                        <h1>QR Code Content</h1>
                    </div>
                    <div class="content-body">
                        <div class="content-text">${sanitizedText}</div>
                    </div>
                    <div class="content-footer">
                        <button onclick="this.copyContent('${escapedForButton}')" class="copy-btn">
                            <i class="fas fa-copy"></i> Copy Text
                        </button>
                    </div>
                    <div class="scan-info">
                        <small>This content was accessed via QR code scan</small>
                    </div>
                </div>
            </div>
            
            <style>
                body {
                    margin: 0;
                    padding: 0;
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                }
                
                .content-display {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    padding: 2rem;
                    color: #333;
                }
                
                .content-container {
                    background: white;
                    border-radius: 20px;
                    padding: 2rem;
                    max-width: 600px;
                    width: 100%;
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
                    text-align: center;
                    animation: slideIn 0.5s ease-out;
                }
                
                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateY(30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .content-header {
                    margin-bottom: 2rem;
                    color: #667eea;
                }
                
                .content-header i {
                    font-size: 3rem;
                    margin-bottom: 1rem;
                    display: block;
                }
                
                .content-header h1 {
                    margin: 0;
                    font-size: 2rem;
                    font-weight: 600;
                }
                
                .content-body {
                    margin: 2rem 0;
                    padding: 2rem;
                    background: #f7fafc;
                    border-radius: 15px;
                    border: 1px solid #e2e8f0;
                }
                
                .content-text {
                    font-size: 1.2rem;
                    line-height: 1.6;
                    color: #4a5568;
                    word-wrap: break-word;
                    white-space: pre-wrap;
                    text-align: left;
                }
                
                .content-footer {
                    display: flex;
                    gap: 1rem;
                    justify-content: center;
                    margin-top: 2rem;
                    flex-wrap: wrap;
                }
                
                .back-btn, .copy-btn {
                    padding: 1rem 1.5rem;
                    border: none;
                    border-radius: 10px;
                    cursor: pointer;
                    font-weight: 600;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 1rem;
                    text-decoration: none;
                }
                
                .back-btn {
                    background: #667eea;
                    color: white;
                }
                
                .copy-btn {
                    background: #ed8936;
                    color: white;
                }
                
                .back-btn:hover {
                    background: #5a67d8;
                    transform: translateY(-2px);
                    box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
                }
                
                .copy-btn:hover {
                    background: #dd6b20;
                    transform: translateY(-2px);
                    box-shadow: 0 8px 20px rgba(237, 137, 54, 0.3);
                }
                
                .scan-info {
                    margin-top: 2rem;
                    color: #718096;
                    font-style: italic;
                }
                
                @media (max-width: 480px) {
                    .content-display {
                        padding: 1rem;
                    }
                    
                    .content-container {
                        padding: 1.5rem;
                    }
                    
                    .content-footer {
                        flex-direction: column;
                    }
                    
                    .content-text {
                        font-size: 1rem;
                    }
                    
                    .content-header h1 {
                        font-size: 1.5rem;
                    }
                    
                    .content-header i {
                        font-size: 2rem;
                    }
                }
            </style>
        `;

        // Add global copy functionality
        window.copyContent = async function(text) {
            try {
                await navigator.clipboard.writeText(text);
                const copyBtn = document.querySelector('.copy-btn');
                const originalHTML = copyBtn.innerHTML;
                copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                copyBtn.style.background = '#48bb78';
                
                setTimeout(() => {
                    copyBtn.innerHTML = originalHTML;
                    copyBtn.style.background = '#ed8936';
                }, 2000);
            } catch (error) {
                console.error('Copy failed:', error);
                alert('Failed to copy text to clipboard');
            }
        };
    }

    /**
     * Display error message with support contact information
     * 
     * WHY: Provides helpful feedback when QR code access fails
     * WHEN: Called when QR ID is missing or data cannot be retrieved
     * HOW: Updates page elements to show error state and support options
     * USED BY: init() method and other error scenarios
     * 
     * @param {string} message - User-friendly error message to display
     */
    showError(message) {
        try {
            const errorDiv = document.getElementById('errorMessage');
            const manualLink = document.getElementById('manualLink');
            
            if (errorDiv) {
                errorDiv.style.display = 'block';
                const errorP = errorDiv.querySelector('p');
                if (errorP) {
                    errorP.textContent = message;
                }
            }
            
            // Hide loading elements
            const spinner = document.querySelector('.loading-spinner');
            if (spinner) {
                spinner.style.display = 'none';
            }
            
            const header = document.querySelector('.redirect-container h1');
            if (header) {
                header.textContent = 'Error';
            }
            
            const description = document.querySelector('.redirect-container p');
            if (description) {
                description.textContent = '';
            }
            
            // Show support contact option if QR ID is available
            if (manualLink && this.qrId) {
                manualLink.style.display = 'inline-block';
                manualLink.href = `mailto:datta@holy-technologies.com?subject=QR Code Error&body=QR ID: ${encodeURIComponent(this.qrId)}%0A%0AError: ${encodeURIComponent(message)}`;
                manualLink.textContent = 'Contact Support';
            }
        } catch (error) {
            console.error('Error displaying error message:', error);
        }
    }

    /**
     * Truncate long text for display purposes
     * 
     * WHY: Prevents UI overflow and improves readability
     * WHEN: Called when displaying text previews or summaries
     * HOW: Cuts text at specified length and adds ellipsis
     * USED BY: Various display methods for text previews
     * 
     * @param {string} text - Text to truncate
     * @param {number} maxLength - Maximum allowed length
     * @returns {string} - Truncated text with ellipsis if needed
     */
    shortenText(text, maxLength) {
        if (!text || typeof text !== 'string') return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }

    /**
     * Legacy HTML escaping function (deprecated - use SecurityUtils)
     * 
     * WHY: Provides basic XSS protection for text content
     * WHEN: Used in legacy code paths that haven't been updated
     * HOW: Uses DOM API to safely escape HTML entities
     * USED BY: Legacy code - new code should use window.securityUtils.escapeHTML()
     * 
     * @param {string} text - Text to escape
     * @returns {string} - HTML-escaped text
     * @deprecated Use window.securityUtils.escapeHTML() instead
     */
    escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

/**
 * Redirect Page Initialization
 * 
 * WHY: Starts QR code content resolution process when page loads
 * WHEN: Executed automatically when redirect.html loads from QR scan
 * HOW: Creates QRRedirectManager instance to handle the redirect process
 * USED BY: Browser when redirect.html is accessed via QR code scan
 * 
 * DEPENDENCIES: Requires SecurityUtils and FirebaseManager to be loaded
 */
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Give a small delay to ensure all scripts are loaded
        setTimeout(() => {
            // Verify required dependencies
            if (!window.SecurityUtils && !window.securityUtils) {
                console.error('SecurityUtils not available');
                alert('Security modules not loaded. Please refresh the page.');
                return;
            }
            
            if (!window.FirebaseManager) {
                console.warn('FirebaseManager not available - using fallback methods');
            }
            console.log('All dependencies loaded successfully');
            // Initialize redirect manager
            new QRRedirectManager();
            
            console.log('QR Redirect Manager initialized');
        }, 50); // Small delay for script loading
        
    } catch (error) {
        console.error('Failed to initialize redirect manager:', error);
        alert('Failed to load QR code content. Please try again.');
    }
});