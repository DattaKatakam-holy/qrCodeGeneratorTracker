/**
 * QR Code Generator with Logo Overlay and Analytics
 * Dynamic QR Code Generator Application
 * 
 * Copyright © 2026 Holy Technologies GmbH, Hamburg, Germany
 * All rights reserved.
 * 
 * This software and its documentation are proprietary to Holy Technologies GmbH.
 * Unauthorized copying, distribution, or use is strictly prohibited.
 */

// QR Code Generator Main Script
class QRGenerator {
    constructor() {
        this.selectedLogo = 'assets/holyLogo.png'; // Default logo
        this.currentQRId = null;
        this.scanCountListener = null;
        
        this.initializeElements();
        this.bindEvents();
        this.loadRecentQRCodes();
    }

    initializeElements() {
        // Main elements
        this.qrTextArea = document.getElementById('qrText');
        this.qrNameInput = document.getElementById('qrName');
        this.generateBtn = document.getElementById('generateBtn');
        this.qrResult = document.getElementById('qrResult');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.copyLinkBtn = document.getElementById('copyLinkBtn');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        
        // Logo elements
        this.logoOptions = document.querySelectorAll('.logo-option');
        this.logoUpload = document.getElementById('logoUpload');
        this.customLogoPreview = document.getElementById('customLogoPreview');
        
        // Settings elements
        this.qrSize = document.getElementById('qrSize');
        this.errorLevel = document.getElementById('errorLevel');
        
        // Analytics elements
        this.scanCount = document.getElementById('scanCount');
        this.createdDate = document.getElementById('createdDate');
        this.lastScan = document.getElementById('lastScan');
        this.downloadControls = document.querySelector('.download-controls');
        
        // Recent QR codes
        this.recentQRs = document.getElementById('recentQRs');

        // Set default logo selection
        this.logoOptions[0].classList.add('selected');
    }

    bindEvents() {
        // Generate button
        this.generateBtn.addEventListener('click', () => this.generateQRCode());
        
        // Logo selection
        this.logoOptions.forEach(option => {
            option.addEventListener('click', () => this.selectLogo(option));
        });
        
        // Custom logo upload
        this.logoUpload.addEventListener('change', (e) => this.handleLogoUpload(e));
        
        // Download button
        this.downloadBtn.addEventListener('click', () => this.downloadQRCode());
        
        // Copy link button
        this.copyLinkBtn.addEventListener('click', () => this.copyQRLink());
        
        // Enter key in text area
        this.qrTextArea.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                this.generateQRCode();
            }
        });
    }

    selectLogo(selectedOption) {
        // Remove selection from all options
        this.logoOptions.forEach(option => option.classList.remove('selected'));
        
        // Add selection to clicked option
        selectedOption.classList.add('selected');
        
        // Get logo path
        this.selectedLogo = selectedOption.dataset.logo;
        
        // Clear custom logo if default selected
        if (this.selectedLogo !== 'custom') {
            this.customLogoPreview.innerHTML = '';
            this.logoUpload.value = '';
        }
    }

    async handleLogoUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            // Comprehensive file validation
            await SecurityUtils.validateImageFile(file);

            const reader = new FileReader();
            reader.onload = (e) => {
                // Create preview
                this.customLogoPreview.innerHTML = `
                    <img src="${SecurityUtils.escapeHTML(e.target.result)}" alt="Custom Logo" style="width: 80px; height: 80px; object-fit: cover; border-radius: 10px;">
                `;
                
                // Set as selected logo
                this.selectedLogo = e.target.result;
                
                // Update selection UI
                this.logoOptions.forEach(option => option.classList.remove('selected'));
            };
            reader.readAsDataURL(file);

        } catch (error) {
            // Clear the file input
            event.target.value = '';
            
            // Show user-friendly error
            alert(`File upload failed: ${error.message}`);
            console.error('File validation error:', error);
        }
    }

    async generateQRCode() {
        const text = this.qrTextArea.value.trim();
        const name = this.qrNameInput.value.trim();
        
        // Check rate limiting first
        if (window.rateLimiter && !window.rateLimiter.canMakeRequest()) {
            const remaining = window.rateLimiter.getRemainingRequests();
            alert(`Rate limit exceeded. You can create ${remaining} more QR codes in the next minute. Please wait before creating more QR codes.`);
            return;
        }
        
        try {
            // Validate inputs
            SecurityUtils.validateQRInput(text, name);
        } catch (error) {
            alert(error.message);
            return;
        }

        this.showLoading(true);
        this.generateBtn.disabled = true;

        try {
            // Create QR code entry in Firebase
            const qrId = await FirebaseManager.createQRCode(text, name, this.selectedLogo);
            this.currentQRId = qrId;
            
            // Get redirect URL for QR code
            let redirectUrl = FirebaseManager.getRedirectUrl(qrId);
            
            // If Firebase is unavailable, add fallback data to URL for mobile compatibility
            if (!FirebaseStatus.isAvailable()) {
                // Encode the essential data in the URL for mobile scanning
                const fallbackData = btoa(JSON.stringify({
                    text: text,
                    name: name,
                    created: Date.now()
                }));
                redirectUrl += `&data=${encodeURIComponent(fallbackData)}`;
                console.log('Added fallback data to URL for mobile compatibility');
            }
            
            // Generate QR code
            const canvas = await this.createQRCanvas(redirectUrl);
            
            // Display result
            this.displayQRCode(canvas);
            
            // Show download controls
            this.downloadControls.style.display = 'block';
            
            // Start listening for scan count updates
            this.startScanCountListener(qrId);
            
            // Update analytics display
            this.updateAnalytics({
                scanCount: 0,
                createdAt: Date.now(),
                lastScanned: null
            });
            
            // Refresh recent QR codes
            this.loadRecentQRCodes();
            
            console.log('QR Code generated successfully:', qrId);
            
        } catch (error) {
            console.error('Error generating QR code:', error);
            alert('Failed to generate QR code. Please try again.');
        } finally {
            this.showLoading(false);
            this.generateBtn.disabled = false;
        }
    }

    async createQRCanvas(text) {
        const size = parseInt(this.qrSize.value);
        const errorCorrectionLevel = this.errorLevel.value;
        
        // Create a temporary div for QR generation
        const tempDiv = document.createElement('div');
        tempDiv.style.display = 'none';
        document.body.appendChild(tempDiv);
        
        try {
            // Map our error correction levels to QRCode.js levels
            let correctLevel;
            switch(errorCorrectionLevel) {
                case 'L': correctLevel = QRCode.CorrectLevel.L; break;
                case 'M': correctLevel = QRCode.CorrectLevel.M; break;
                case 'Q': correctLevel = QRCode.CorrectLevel.Q; break;
                case 'H': correctLevel = QRCode.CorrectLevel.H; break;
                default: correctLevel = QRCode.CorrectLevel.M;
            }

            // Generate QR code
            const qr = new QRCode(tempDiv, {
                text: text,
                width: size,
                height: size,
                colorDark: "#000000",
                colorLight: "#FFFFFF",
                correctLevel: correctLevel
            });

            // Wait a bit for QR to generate
            await new Promise(resolve => setTimeout(resolve, 100));

            // Get the canvas from the generated QR code
            const qrCanvas = tempDiv.querySelector('canvas');
            if (!qrCanvas) {
                throw new Error('Failed to generate QR canvas');
            }

            // Create our output canvas
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');

            // Copy QR code to our canvas
            ctx.drawImage(qrCanvas, 0, 0);

            // Add logo overlay if selected
            if (this.selectedLogo && this.selectedLogo !== 'none') {
                await this.addLogoToCanvas(canvas);
            }

            return canvas;
        } finally {
            // Clean up temporary div
            document.body.removeChild(tempDiv);
        }
    }

    async addLogoToCanvas(canvas) {
        return new Promise((resolve, reject) => {
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                try {
                    const logoSize = canvas.width * 0.2; // 20% of QR code size
                    const x = (canvas.width - logoSize) / 2;
                    const y = (canvas.height - logoSize) / 2;
                    
                    // Draw white background circle
                    ctx.fillStyle = 'white';
                    ctx.beginPath();
                    ctx.arc(canvas.width / 2, canvas.height / 2, logoSize / 2 + 10, 0, 2 * Math.PI);
                    ctx.fill();
                    
                    // Draw logo
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(canvas.width / 2, canvas.height / 2, logoSize / 2, 0, 2 * Math.PI);
                    ctx.clip();
                    ctx.drawImage(img, x, y, logoSize, logoSize);
                    ctx.restore();
                    
                    resolve();
                } catch (error) {
                    reject(error);
                }
            };
            
            img.onerror = () => reject(new Error('Failed to load logo'));
            
            // Handle different logo sources
            if (this.selectedLogo.startsWith('data:')) {
                img.src = this.selectedLogo; // Custom uploaded logo
            } else {
                img.src = this.selectedLogo; // Default logo path
            }
        });
    }

    displayQRCode(canvas) {
        this.qrResult.innerHTML = `
            <div class="qr-display">
                <canvas width="${canvas.width}" height="${canvas.height}"></canvas>
            </div>
        `;
        
        const displayCanvas = this.qrResult.querySelector('canvas');
        const ctx = displayCanvas.getContext('2d');
        ctx.drawImage(canvas, 0, 0);
        
        // Store canvas for download
        this.currentCanvas = canvas;
    }

    startScanCountListener(qrId) {
        // Remove existing listener
        if (this.scanCountListener) {
            this.scanCountListener();
        }
        
        // Start new listener
        this.scanCountListener = FirebaseManager.onScanCountChange(qrId, (data) => {
            this.updateAnalytics(data);
        });
    }

    updateAnalytics(data) {
        this.scanCount.textContent = data.scanCount || 0;
        this.createdDate.textContent = FirebaseManager.formatTimestamp(data.createdAt).split(' ')[0];
        this.lastScan.textContent = data.lastScanned ? 
            FirebaseManager.formatTimestamp(data.lastScanned) : 'Never';
    }

    downloadQRCode() {
        if (!this.currentCanvas) {
            alert('Please generate a QR code first.');
            return;
        }

        // Create filename with name and timestamp
        const qrName = this.qrNameInput.value.trim();
        const safeName = qrName.replace(/[^a-zA-Z0-9\-_\s]/g, '').replace(/\s+/g, '-');
        const timestamp = new Date().toISOString().slice(0, 10);
        const filename = safeName ? `${safeName}-${timestamp}.png` : `qr-code-${timestamp}.png`;

        // Create download link
        const link = document.createElement('a');
        link.download = filename;
        link.href = this.currentCanvas.toDataURL();
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('QR code downloaded:', filename);
    }

    async copyQRLink() {
        if (!this.currentQRId) {
            alert('Please generate a QR code first.');
            return;
        }

        const redirectUrl = FirebaseManager.getRedirectUrl(this.currentQRId);
        
        try {
            await navigator.clipboard.writeText(redirectUrl);
            
            // Visual feedback
            const originalText = this.copyLinkBtn.innerHTML;
            this.copyLinkBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
            this.copyLinkBtn.style.background = '#48bb78';
            
            setTimeout(() => {
                this.copyLinkBtn.innerHTML = originalText;
                this.copyLinkBtn.style.background = '#ed8936';
            }, 2000);
            
        } catch (error) {
            console.error('Failed to copy link:', error);
            alert('Failed to copy link to clipboard.');
        }
    }

    async loadRecentQRCodes() {
        try {
            const recentQRs = await FirebaseManager.getRecentQRCodes();
            
            if (recentQRs.length === 0) {
                this.recentQRs.innerHTML = '<p class="no-recent">No recent QR codes. Generate one to get started!</p>';
                return;
            }

            const recentHTML = recentQRs.map(qr => {
                const shortText = SecurityUtils.truncateText(qr.originalText, 40);
                const safeName = SecurityUtils.sanitizeText(qr.name) || 'Unnamed QR Code';
                
                return `
                    <div class="recent-item" onclick="qrGenerator.loadQRCode('${SecurityUtils.escapeHTML(qr.id)}')">
                        <div class="recent-qr">
                            <canvas width="60" height="60" data-qr-id="${SecurityUtils.escapeHTML(qr.id)}"></canvas>
                        </div>
                        <div class="recent-info">
                            <div class="recent-name">${safeName}</div>
                            <div class="recent-text">${shortText}</div>
                            <div class="recent-stats">
                                Scans: ${parseInt(qr.scanCount) || 0} | Created: ${SecurityUtils.escapeHTML(FirebaseManager.formatTimestamp(qr.createdAt).split(' ')[0])}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            this.recentQRs.innerHTML = recentHTML;
            
            // Generate mini QR codes for recent items
            recentQRs.forEach(qr => {
                this.generateMiniQR(qr.id, FirebaseManager.getRedirectUrl(qr.id));
            });
            
        } catch (error) {
            console.error('Error loading recent QR codes:', error);
        }
    }

    async generateMiniQR(qrId, redirectUrl) {
        try {
            const canvas = this.recentQRs.querySelector(`canvas[data-qr-id="${qrId}"]`);
            if (!canvas) return;

            // Create temporary div for mini QR
            const tempDiv = document.createElement('div');
            tempDiv.style.display = 'none';
            document.body.appendChild(tempDiv);

            try {
                // Generate mini QR code
                const qr = new QRCode(tempDiv, {
                    text: redirectUrl,
                    width: 60,
                    height: 60,
                    colorDark: "#667eea",
                    colorLight: "#FFFFFF",
                    correctLevel: QRCode.CorrectLevel.M
                });

                // Wait for generation
                await new Promise(resolve => setTimeout(resolve, 100));

                // Get the generated canvas and copy to target
                const qrCanvas = tempDiv.querySelector('canvas');
                if (qrCanvas) {
                    const ctx = canvas.getContext('2d');
                    canvas.width = 60;
                    canvas.height = 60;
                    ctx.drawImage(qrCanvas, 0, 0);
                }
            } finally {
                document.body.removeChild(tempDiv);
            }
        } catch (error) {
            console.error('Error generating mini QR:', error);
        }
    }

    async loadQRCode(qrId) {
        try {
            const qrData = await FirebaseManager.getQRCode(qrId);
            if (!qrData) {
                alert('QR code not found.');
                return;
            }

            // Load QR data into interface
            this.qrTextArea.value = qrData.originalText;
            this.qrNameInput.value = qrData.name || '';
            this.currentQRId = qrId;
            
            // Set logo selection
            if (qrData.logoPath && qrData.logoPath !== 'none') {
                this.selectedLogo = qrData.logoPath;
                // Update UI selection if needed
            }
            
            // Generate and display QR code
            const redirectUrl = FirebaseManager.getRedirectUrl(qrId);
            const canvas = await this.createQRCanvas(redirectUrl);
            this.displayQRCode(canvas);
            
            // Show download controls and update analytics
            this.downloadControls.style.display = 'block';
            this.updateAnalytics(qrData);
            this.startScanCountListener(qrId);
            
        } catch (error) {
            console.error('Error loading QR code:', error);
            alert('Failed to load QR code.');
        }
    }

    showLoading(show) {
        this.loadingOverlay.style.display = show ? 'flex' : 'none';
    }
}

// Initialize QR Generator when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.qrGenerator = new QRGenerator();
    console.log('QR Generator initialized successfully');
});