// Redirect Script - Handles QR code scan tracking
class QRRedirectManager {
    constructor() {
        this.qrId = this.getQRIdFromURL();
        this.init();
    }

    getQRIdFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        this.fallbackData = urlParams.get('data'); // Store fallback data if present
        return urlParams.get('id');
    }

    async init() {
        if (!this.qrId) {
            this.showError('Invalid QR code link. No ID found.');
            return;
        }

        // Add mobile debugging
        const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        console.log('Device type:', isMobile ? 'Mobile' : 'Desktop');
        console.log('Looking for QR ID:', this.qrId);

        try {
            // Get QR code data from Firebase or localStorage
            let qrData = null;
            let dataSource = 'none';
            
            // First try Firebase if available
            if (window.FirebaseManager && typeof window.FirebaseManager.getQRCode === 'function') {
                try {
                    console.log('Attempting Firebase access...');
                    qrData = await window.FirebaseManager.getQRCode(this.qrId);
                    if (qrData) {
                        dataSource = 'firebase';
                        console.log('Data found in Firebase');
                    }
                } catch (error) {
                    console.log('Firebase unavailable:', error.message);
                }
            } else {
                console.log('FirebaseManager not available');
            }
            
            // If Firebase failed, try localStorage fallback directly
            if (!qrData) {
                console.log('Trying localStorage fallback...');
                try {
                    // Check if SecurityUtils is available
                    if (window.SecurityUtils && window.SecurityUtils.CryptoManager) {
                        const localQRs = await window.SecurityUtils.CryptoManager.getItem('qr-codes') || {};
                        qrData = localQRs[this.qrId] || null;
                        if (qrData) {
                            dataSource = 'encrypted_storage';
                            console.log('Data found in encrypted localStorage');
                        }
                    } else {
                        console.log('SecurityUtils not available, trying direct localStorage');
                    }
                } catch (error) {
                    console.log('Encrypted localStorage access failed:', error.message);
                    
                    // Final fallback - try unencrypted localStorage (legacy support)
                    try {
                        console.log('Trying unencrypted localStorage...');
                        const unencryptedData = localStorage.getItem('qr-codes');
                        if (unencryptedData) {
                            const parsedData = JSON.parse(unencryptedData);
                            qrData = parsedData[this.qrId] || null;
                            if (qrData) {
                                dataSource = 'unencrypted_storage';
                                console.log('Data found in unencrypted localStorage');
                            }
                        }
                    } catch (legacyError) {
                        console.log('Legacy localStorage also failed:', legacyError.message);
                    }
                }
            }
            
            if (!qrData) {
                // Try URL fallback data (for mobile scanning when localStorage fails)
                if (this.fallbackData) {
                    try {
                        console.log('Trying URL fallback data...');
                        const decodedData = atob(decodeURIComponent(this.fallbackData));
                        const fallbackQRData = JSON.parse(decodedData);
                        
                        // Convert to expected format
                        qrData = {
                            id: this.qrId,
                            name: fallbackQRData.name,
                            originalText: fallbackQRData.text,
                            createdAt: fallbackQRData.created,
                            scanCount: 0
                        };
                        dataSource = 'url_fallback';
                        console.log('Data found in URL fallback');
                    } catch (fallbackError) {
                        console.log('URL fallback failed:', fallbackError.message);
                    }
                }
            }
            
            if (!qrData) {
                // Show detailed error for debugging
                const errorMsg = isMobile 
                    ? `QR code not found. This may be because mobile browsers have stricter security settings. Please try opening this link in your mobile browser instead of scanning.` 
                    : 'QR code not found or has expired. This may be due to a database connection issue.';
                
                console.log('No data found. Checked sources: Firebase, encrypted storage, unencrypted storage');
                this.showError(errorMsg);
                return;
            }

            console.log('Successfully found QR data from:', dataSource);

            // Try to increment scan count (if Firebase is available)
            try {
                if (window.FirebaseManager && typeof window.FirebaseManager.incrementScanCount === 'function') {
                    await window.FirebaseManager.incrementScanCount(this.qrId);
                }
            } catch (error) {
                console.log('Could not increment scan count (Firebase unavailable):', error);
                // Continue anyway - scanning still works without analytics
            }
            
            // Show brief loading message
            const sanitizedText = SecurityUtils.truncateText(qrData.originalText, 50);
            document.querySelector('.redirect-container p').textContent = 
                `Redirecting to: ${sanitizedText}`;

            // Redirect after a short delay (for tracking purposes)
            setTimeout(() => {
                this.redirectToOriginal(qrData.originalText);
            }, 1500);

        } catch (error) {
            console.error('Redirect error:', error);
            const errorMsg = isMobile 
                ? `Mobile scanning error: ${error.message}. Please try copying the link instead of scanning.`
                : `Unable to process your request: ${error.message}. Please try again later.`;
            this.showError(errorMsg);
        }
    }

    redirectToOriginal(originalText) {
        // Check if originalText is a valid URL
        if (this.isValidURL(originalText)) {
            // Check if domain is whitelisted
            if (this.isWhitelistedDomain(originalText)) {
                // Safe redirect to whitelisted domain
                window.location.href = originalText;
            } else {
                // Show confirmation for external domains
                const confirmed = confirm(
                    `This QR code wants to redirect you to an external website:\n\n${originalText}\n\nDo you want to continue?`
                );
                if (confirmed) {
                    window.location.href = originalText;
                } else {
                    // Show content instead if user declines
                    this.showTextContent(originalText);
                }
            }
        } else {
            // Display text content instead of redirecting
            this.showTextContent(originalText);
        }
    }

    isWhitelistedDomain(url) {
        const allowedDomains = [
            'meet.google.com',
            'zoom.us',
            'teams.microsoft.com',
            'webex.com',
            'gotomeeting.com',
            'youtube.com',
            'www.youtube.com',
            'docs.google.com',
            'drive.google.com'
        ];
        
        try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname.toLowerCase();
            
            // Check exact match or subdomain of allowed domains
            return allowedDomains.some(domain => {
                return hostname === domain || hostname.endsWith('.' + domain);
            });
        } catch {
            return false;
        }
    }

    isValidURL(string) {
        try {
            const url = new URL(string);
            
            // Only allow http and https protocols
            if (!['http:', 'https:'].includes(url.protocol)) {
                return false;
            }
            
            // Block dangerous protocols and schemes
            const dangerousPatterns = [
                'javascript:',
                'data:',
                'vbscript:',
                'file:',
                'ftp:'
            ];
            
            const lowerString = string.toLowerCase();
            if (dangerousPatterns.some(pattern => lowerString.includes(pattern))) {
                return false;
            }
            
            return true;
        } catch (_) {
            // Also check for common URL patterns without protocol
            if (string.includes('.com') || string.includes('.org') || 
                string.includes('.net') || string.includes('www.')) {
                
                // Try to validate with https prefix
                try {
                    new URL('https://' + string);
                    return true;
                } catch {
                    return false;
                }
            }
            return false;
        }
    }

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
                        <button onclick="history.back()" class="back-btn">
                            <i class="fas fa-arrow-left"></i> Go Back
                        </button>
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
                .content-display {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
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
                }
                
                .content-header {
                    margin-bottom: 2rem;
                    color: #667eea;
                }
                
                .content-header i {
                    font-size: 3rem;
                    margin-bottom: 1rem;
                }
                
                .content-header h1 {
                    margin: 0;
                    font-size: 2rem;
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
                }
                
                .copy-btn:hover {
                    background: #dd6b20;
                    transform: translateY(-2px);
                }
                
                .scan-info {
                    margin-top: 2rem;
                    color: #718096;
                    font-style: italic;
                }
                
                @media (max-width: 480px) {
                    .content-container {
                        padding: 1.5rem;
                    }
                    
                    .content-footer {
                        flex-direction: column;
                    }
                    
                    .content-text {
                        font-size: 1rem;
                    }
                }
            </style>
        `;

        // Add copy functionality
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
                alert('Failed to copy text to clipboard');
            }
        };
    }

    showError(message) {
        const errorDiv = document.getElementById('errorMessage');
        const manualLink = document.getElementById('manualLink');
        
        errorDiv.style.display = 'block';
        errorDiv.querySelector('p').textContent = message;
        
        // Hide loading elements
        document.querySelector('.loading-spinner').style.display = 'none';
        document.querySelector('.redirect-container h1').textContent = 'Error';
        document.querySelector('.redirect-container p').textContent = '';
        
        // If we have a fallback URL, show manual link
        if (this.qrId) {
            manualLink.style.display = 'inline-block';
            manualLink.href = `mailto:datta@holy-technologies.com?subject=QR Code Error&body=QR ID: ${this.qrId}`;
            manualLink.textContent = 'Contact Support';
        }
    }

    shortenText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }

    escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize redirect manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new QRRedirectManager();
});