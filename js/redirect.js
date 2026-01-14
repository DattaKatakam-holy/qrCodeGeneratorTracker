// Redirect Script - Handles QR code scan tracking
class QRRedirectManager {
    constructor() {
        this.qrId = this.getQRIdFromURL();
        this.init();
    }

    getQRIdFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id');
    }

    async init() {
        if (!this.qrId) {
            this.showError('Invalid QR code link. No ID found.');
            return;
        }

        try {
            // Get QR code data from Firebase
            const qrData = await FirebaseManager.getQRCode(this.qrId);
            
            if (!qrData) {
                this.showError('QR code not found or has expired.' + this.qrId);
                return;
            }

            // Increment scan count
            await FirebaseManager.incrementScanCount(this.qrId);
            
            // Show brief loading message
            document.querySelector('.redirect-container p').textContent = 
                `Redirecting to: ${this.shortenText(qrData.originalText, 50)}`;

            // Redirect after a short delay (for tracking purposes)
            setTimeout(() => {
                this.redirectToOriginal(qrData.originalText);
            }, 1500);

        } catch (error) {
            console.error('Redirect error:', error);
            this.showError('Unable to process your request. Please try again.');
        }
    }

    redirectToOriginal(originalText) {
        // Check if originalText is a valid URL
        if (this.isValidURL(originalText)) {
            // Redirect to URL
            window.location.href = originalText;
        } else {
            // Display text content instead of redirecting
            this.showTextContent(originalText);
        }
    }

    isValidURL(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            // Also check for common URL patterns without protocol
            if (string.includes('.com') || string.includes('.org') || 
                string.includes('.net') || string.includes('www.')) {
                return true;
            }
            return false;
        }
    }

    showTextContent(text) {
        document.body.innerHTML = `
            <div class="content-display">
                <div class="content-container">
                    <div class="content-header">
                        <i class="fas fa-qrcode"></i>
                        <h1>QR Code Content</h1>
                    </div>
                    <div class="content-body">
                        <div class="content-text">${this.escapeHTML(text)}</div>
                    </div>
                    <div class="content-footer">
                        <button onclick="history.back()" class="back-btn">
                            <i class="fas fa-arrow-left"></i> Go Back
                        </button>
                        <button onclick="this.copyContent('${this.escapeHTML(text)}')" class="copy-btn">
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
            manualLink.href = `mailto:support@example.com?subject=QR Code Error&body=QR ID: ${this.qrId}`;
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