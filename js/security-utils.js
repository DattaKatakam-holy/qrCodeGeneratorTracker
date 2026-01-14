/**
 * Security Utilities - Input Sanitization and Validation
 * Dynamic QR Code Generator with Analytics
 * 
 * Copyright © 2026 Holy Technologies GmbH, Hamburg, Germany
 * All rights reserved.
 */

// Simple but effective HTML sanitization
const SecurityUtils = {
    
    // Escape HTML entities to prevent XSS
    escapeHTML(text) {
        if (!text) return '';
        
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    // Sanitize text for safe HTML insertion
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
    
    // Truncate text safely
    truncateText(text, maxLength = 40) {
        if (!text) return '';
        
        const sanitized = this.sanitizeText(text);
        if (sanitized.length <= maxLength) return sanitized;
        return sanitized.substring(0, maxLength - 3) + '...';
    },
    
    // Validate file signature (magic bytes)
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
    
    // Comprehensive file validation
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
    
    // Validate QR text input
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
    
    // Crypto utilities for secure local storage
    CryptoManager: {
        // Generate or get persistent encryption key (works across pages)
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
        
        // Secure localStorage wrapper
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
        
        // Secure localStorage getter
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