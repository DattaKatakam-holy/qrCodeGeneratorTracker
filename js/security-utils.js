/**
 * Security Utilities - Input Sanitization and Validation
 * Holy QR Code Generator - Holy Technologies GmbH
 * 
 * Copyright © 2026 Holy Technologies GmbH, Hamburg, Germany
 * All rights reserved.
 * 
 * This module provides comprehensive security utilities for:
 * - XSS prevention through HTML escaping
 * - Input validation for QR code content
 * - File upload security validation  
 * - Encrypted local storage management
 * - Content sanitization for safe display
 */

/**
 * SecurityUtils - Centralized security utilities object
 * 
 * PURPOSE: Provides security functions to prevent XSS attacks, validate inputs,
 * and secure file uploads across the QR code generator application
 * 
 * USAGE: All user-facing content must be processed through SecurityUtils
 * before display or storage to prevent security vulnerabilities
 */
const SecurityUtils = {
    
    /**
     * Escape HTML entities to prevent XSS attacks
     * 
     * WHY: Prevents malicious script injection when displaying user content
     * WHEN: Called automatically by sanitizeText() and manually for safe HTML display
     * HOW: Uses browser's native textContent property to escape HTML entities
     * USED BY: sanitizeText(), recent QR code display, error messages
     * 
     * @param {string} text - Raw text that might contain HTML entities
     * @returns {string} - HTML-escaped safe text
     */
    escapeHTML(text) {
        if (!text) return '';
        
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    /**
     * Comprehensive text sanitization for safe HTML insertion
     * 
     * WHY: Provides layered security against XSS by escaping HTML and removing dangerous patterns
     * WHEN: Called before displaying any user-generated content (QR names, text content)
     * HOW: First escapes HTML, then removes script tags, JavaScript URIs, and event handlers
     * USED BY: QR code display, recent QR list generation, form validation
     * 
     * @param {string} text - Raw text that needs sanitization
     * @returns {string} - Sanitized text safe for HTML insertion
     */
    sanitizeText(text) {
        if (!text) return '';
        
        // First escape HTML
        let sanitized = this.escapeHTML(text.toString());
        
        // Remove any remaining script-like content
        sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gi, '');
        sanitized = sanitized.replace(/javascript:/gi, '');
        sanitized = sanitized.replace(/on\w+\s*=/gi, '');
        
        return sanitized;
    },
    
    /**
     * Safely truncate text for UI display
     * 
     * WHY: Prevents UI layout issues from long text while maintaining security
     * WHEN: Called when displaying QR content in recent lists or previews
     * HOW: Sanitizes first, then truncates to specified length with ellipsis
     * USED BY: Recent QR codes list, preview displays, mobile responsive layouts
     * 
     * @param {string} text - Text to truncate
     * @param {number} maxLength - Maximum length before truncation (default: 40)
     * @returns {string} - Sanitized and truncated text with ellipsis if needed
     */
    truncateText(text, maxLength = 40) {
        if (!text) return '';
        
        const sanitized = this.sanitizeText(text);
        if (sanitized.length <= maxLength) return sanitized;
        return sanitized.substring(0, maxLength - 3) + '...';
    },
    
    /**
     * Validate image file signature using magic bytes
     * 
     * WHY: Prevents malicious files disguised as images from being uploaded
     * WHEN: Called during file upload before processing custom logos
     * HOW: Reads first 12 bytes of file and compares against known image signatures
     * USED BY: validateImageFile() for comprehensive file validation
     * 
     * @param {File} file - File object to validate
     * @returns {string|false} - Image format (jpeg/png/gif/webp) or false if invalid
     */
    async validateImageSignature(file) {
        const buffer = await file.slice(0, 12).arrayBuffer();
        const bytes = new Uint8Array(buffer);
        
        // Check for common image signatures
        const signatures = {
            jpeg: [[0xFF, 0xD8, 0xFF]],
            png: [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
            gif: [[0x47, 0x49, 0x46, 0x38], [0x47, 0x49, 0x46, 0x39]],
            webp: [[0x52, 0x49, 0x46, 0x46]]
        };
        
        // Check if file matches any valid signature
        for (const [format, sigs] of Object.entries(signatures)) {
            for (const sig of sigs) {
                if (sig.every((byte, index) => bytes[index] === byte)) {
                    return format;
                }
            }
        }
        
        return false;
    },
    
    /**
     * Comprehensive image file validation
     * 
     * WHY: Provides multiple layers of security validation for uploaded image files
     * WHEN: Called when user uploads custom logo files
     * HOW: Validates MIME type, file size, magic bytes, and filename patterns
     * USED BY: QR generator logo upload functionality, file input handlers
     * 
     * @param {File} file - File object from input element
     * @throws {Error} - Descriptive error message if validation fails
     * @returns {boolean} - true if file passes all validation checks
     */
    async validateImageFile(file) {
        // Basic checks
        if (!file) {
            throw new Error('No file selected');
        }
        
        // Allowed MIME types
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type.toLowerCase())) {
            throw new Error('Only JPEG, PNG, GIF, and WebP images are allowed');
        }
        
        // Size validation (max 2MB for security)
        const maxSize = 2 * 1024 * 1024;
        if (file.size > maxSize) {
            throw new Error('Image must be smaller than 2MB');
        }
        
        // Validate file signature (magic bytes)
        const validFormat = await this.validateImageSignature(file);
        if (!validFormat) {
            throw new Error('Invalid image file format');
        }
        
        // Additional security: check for suspicious file names
        const fileName = file.name.toLowerCase();
        const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.com', '.scr', '.js', '.vbs', '.php', '.asp'];
        if (suspiciousExtensions.some(ext => fileName.includes(ext))) {
            throw new Error('Suspicious file detected');
        }
        
        return true;
    },
    
    /**
     * Validate QR code text input and name for security and length requirements
     * 
     * WHY: Ensures QR code content meets security and usability standards
     * WHEN: Called before generating any QR code to validate user input
     * HOW: Checks length limits, validates content against malicious patterns
     * USED BY: QR generator generateQRCode() function, form validation
     * 
     * @param {string} text - QR code content (URL, text, etc.)
     * @param {string} name - User-defined name/reference for the QR code
     * @throws {Error} - Descriptive error message if validation fails
     * @returns {boolean} - true if input passes all validation checks
     */
    validateQRInput(text, name) {
        // Length validation
        if (!text || text.trim().length === 0) {
            throw new Error('Please enter some text or URL to generate QR code');
        }
        
        if (text.length > 4000) {
            throw new Error('Text content too long (max 4000 characters)');
        }
        
        if (!name || name.trim().length === 0) {
            throw new Error('Please enter a name/reference for this QR code');
        }
        
        if (name.length > 100) {
            throw new Error('Name too long (max 100 characters)');
        }
        
        // Content validation - check for malicious patterns
        const maliciousPatterns = [
            /<script[^>]*>/i,
            /javascript:/i,
            /data:text\/html/i,
            /vbscript:/i,
            /<iframe[^>]*>/i,
            /<object[^>]*>/i,
            /<embed[^>]*>/i
        ];
        
        if (maliciousPatterns.some(pattern => pattern.test(text))) {
            throw new Error('Invalid content detected in text');
        }
        
        if (maliciousPatterns.some(pattern => pattern.test(name))) {
            throw new Error('Invalid content detected in name');
        }
        
        return true;
    },
    
    /**
     * CryptoManager - Secure encrypted localStorage management
     * 
     * WHY: Provides client-side encryption for sensitive data storage
     * WHEN: Used when Firebase is unavailable for offline functionality
     * HOW: Uses Web Crypto API with AES-GCM encryption and persistent keys
     * USED BY: Firebase fallback storage, QR code data persistence
     */
    CryptoManager: {
        /**
         * Generate or retrieve persistent encryption key for cross-page security
         * 
         * WHY: Enables encrypted data sharing between QR generator and redirect pages
         * WHEN: Called automatically by setItem() and getItem() operations
         * HOW: Generates new AES-GCM key or imports existing key from localStorage
         * USED BY: Internal CryptoManager methods for data encryption/decryption
         * 
         * @returns {CryptoKey} - AES-GCM encryption key for secure operations
         */
        async getOrCreateKey() {
            let keyData = localStorage.getItem('app_crypto_key_v2');
            
            if (!keyData) {
                // Generate new key for this domain
                const key = await window.crypto.subtle.generateKey(
                    { name: 'AES-GCM', length: 256 },
                    true,
                    ['encrypt', 'decrypt']
                );
                
                // Export key and store in localStorage for cross-page access
                const exportedKey = await window.crypto.subtle.exportKey('raw', key);
                keyData = btoa(String.fromCharCode(...new Uint8Array(exportedKey)));
                localStorage.setItem('app_crypto_key_v2', keyData);
                
                return key;
            } else {
                // Import existing key
                const keyBuffer = new Uint8Array(atob(keyData).split('').map(c => c.charCodeAt(0)));
                return await window.crypto.subtle.importKey(
                    'raw',
                    keyBuffer,
                    { name: 'AES-GCM', length: 256 },
                    false,
                    ['encrypt', 'decrypt']
                );
            }
        },
        
        /**
         * Secure encrypted localStorage setter with fallback
         * 
         * WHY: Protects sensitive QR code data when stored locally
         * WHEN: Called when Firebase is unavailable or for offline backup
         * HOW: Encrypts data with AES-GCM, falls back to plain storage if crypto fails
         * USED BY: Firebase fallback storage, QR code data persistence
         * 
         * @param {string} key - Storage key identifier
         * @param {any} data - Data to encrypt and store (will be JSON stringified)
         */
        async setItem(key, data) {
            try {
                const cryptoKey = await this.getOrCreateKey();
                const iv = window.crypto.getRandomValues(new Uint8Array(12));
                const encodedData = new TextEncoder().encode(JSON.stringify(data));
                
                const encryptedData = await window.crypto.subtle.encrypt(
                    { name: 'AES-GCM', iv },
                    cryptoKey,
                    encodedData
                );
                
                // Combine IV and encrypted data
                const combined = new Uint8Array(iv.length + encryptedData.byteLength);
                combined.set(iv, 0);
                combined.set(new Uint8Array(encryptedData), iv.length);
                
                const encrypted = btoa(String.fromCharCode(...combined));
                localStorage.setItem(`encrypted_${key}`, encrypted);
            } catch (error) {
                console.error('Secure storage failed:', error);
                // Fallback to regular storage
                localStorage.setItem(key, JSON.stringify(data));
            }
        },
        
        /**
         * Secure encrypted localStorage getter with migration support
         * 
         * WHY: Retrieves encrypted data securely, with fallback for legacy data
         * WHEN: Called when accessing stored QR code data offline
         * HOW: Decrypts AES-GCM data, migrates unencrypted legacy data automatically
         * USED BY: Firebase fallback retrieval, offline QR code access
         * 
         * @param {string} key - Storage key identifier
         * @returns {any|null} - Decrypted data object or null if not found
         */
        async getItem(key) {
            try {
                const encrypted = localStorage.getItem(`encrypted_${key}`);
                if (encrypted) {
                    const cryptoKey = await this.getOrCreateKey();
                    const combined = new Uint8Array(atob(encrypted).split('').map(c => c.charCodeAt(0)));
                    
                    const iv = combined.slice(0, 12);
                    const data = combined.slice(12);
                    
                    const decryptedData = await window.crypto.subtle.decrypt(
                        { name: 'AES-GCM', iv },
                        cryptoKey,
                        data
                    );
                    
                    const decodedData = new TextDecoder().decode(decryptedData);
                    return JSON.parse(decodedData);
                }
                
                // Fallback to check regular storage
                const regular = localStorage.getItem(key);
                if (regular) {
                    // Migrate old unencrypted data
                    const data = JSON.parse(regular);
                    await this.setItem(key, data);
                    localStorage.removeItem(key); // Remove old unencrypted data
                    return data;
                }
                
                return null;
            } catch (error) {
                console.error('Secure retrieval failed:', error);
                return null;
            }
        }
    }
};

// Export for use in other scripts
window.SecurityUtils = SecurityUtils;
window.securityUtils = SecurityUtils; // Also provide lowercase alias for consistency