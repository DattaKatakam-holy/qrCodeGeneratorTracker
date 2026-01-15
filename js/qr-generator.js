/**
 * QR Code Generator with Security, Analytics, and Mobile Compatibility
 * Holy QR Code Generator - Holy Technologies GmbH 
 * 
 * Copyright © 2026 Holy Technologies GmbH, Hamburg, Germany
 * All rights reserved.
 * 
 * This software and its documentation are proprietary to Holy Technologies GmbH.
 * Unauthorized copying, distribution, or use is strictly prohibited.
 * 
 * PURPOSE: Main QR code generation interface with comprehensive security validation,
 * duplicate detection, mobile compatibility, and real-time analytics
 * 
 * FEATURES:
 * - Secure QR code generation with input validation
 * - Logo overlay with custom logo support
 * - Mobile-compatible fallback data in URLs
 * - Real-time scan count analytics
 * - Duplicate detection and management
 * - Encrypted local storage fallback
 * - Responsive design for all devices
 */

/**
 * QRGenerator Class - Main QR Code Generation Interface
 * 
 * WHY: Provides comprehensive QR code creation with security and mobile compatibility
 * WHEN: Instantiated when page loads to manage all QR generation functionality
 * HOW: Manages UI interactions, security validation, database operations, and rendering
 * USED BY: Main index.html page as the primary user interface controller
 */
class QRGenerator {
    /**
     * Initialize QR Generator with UI setup and event binding
     * 
     * WHY: Sets up complete QR generation interface with all required components
     * WHEN: Called automatically when page loads
     * HOW: Initializes DOM references, binds events, loads recent QR codes
     * USED BY: Document ready event to start the application
     */
    constructor() {
        this.selectedLogo = 'assets/holyLogo.png'; // Default company logo
        this.currentQRId = null; // Currently displayed QR code ID
        this.scanCountListener = null; // Real-time analytics listener
        this.currentCanvas = null; // Canvas for download functionality
        
        this.initializeElements();
        this.bindEvents();
        this.loadRecentQRCodes();
    }

    /**
     * Initialize DOM element references
     * 
     * WHY: Caches DOM elements for efficient access throughout the application
     * WHEN: Called during constructor to set up UI references
     * HOW: Queries DOM for all required elements and stores references
     * USED BY: Constructor and all UI interaction methods
     */
    initializeElements() {
        // Main input and generation elements
        this.qrTextArea = document.getElementById('qrText');
        this.qrNameInput = document.getElementById('qrName');
        this.generateBtn = document.getElementById('generateBtn');
        this.qrResult = document.getElementById('qrResult');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.copyLinkBtn = document.getElementById('copyLinkBtn');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        
        // Logo customization elements
        this.logoOptions = document.querySelectorAll('.logo-option');
        this.logoUpload = document.getElementById('logoUpload');
        this.customLogoPreview = document.getElementById('customLogoPreview');
        
        // QR code configuration elements
        this.qrSize = document.getElementById('qrSize');
        this.errorLevel = document.getElementById('errorLevel');
        
        // Analytics and statistics elements
        this.scanCount = document.getElementById('scanCount');
        this.createdDate = document.getElementById('createdDate');
        this.lastScan = document.getElementById('lastScan');
        this.downloadControls = document.querySelector('.download-controls');
        
        // Recent QR codes display
        this.recentQRs = document.getElementById('recentQRs');

        // Set default logo selection UI
        if (this.logoOptions.length > 0) {
            this.logoOptions[0].classList.add('selected');
        }
    }

    /**
     * Bind event listeners for user interactions
     * 
     * WHY: Enables responsive UI interactions and keyboard shortcuts
     * WHEN: Called during initialization to set up all user interactions
     * HOW: Attaches event listeners to all interactive elements
     * USED BY: Constructor to enable complete UI functionality
     */
    bindEvents() {
        // Primary QR generation
        this.generateBtn.addEventListener('click', () => this.generateQRCode());
        
        // Logo selection interface
        this.logoOptions.forEach(option => {
            option.addEventListener('click', () => this.selectLogo(option));
        });
        
        // Custom logo upload handling
        this.logoUpload.addEventListener('change', (e) => this.handleLogoUpload(e));
        
        // Download and sharing functions
        this.downloadBtn.addEventListener('click', () => this.downloadQRCode());
        this.copyLinkBtn.addEventListener('click', () => this.copyQRLink());
        
        // Keyboard shortcuts for power users
        this.qrTextArea.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                this.generateQRCode();
            }
        });
        
        // Input validation on typing
        this.qrTextArea.addEventListener('input', () => this.validateInput());
        this.qrNameInput.addEventListener('input', () => this.validateInput());
    }

    /**
     * Real-time input validation feedback
     * 
     * WHY: Provides immediate feedback on input requirements and limits
     * WHEN: Called on every keystroke in input fields
     * HOW: Uses SecurityUtils to validate and provide user feedback
     * USED BY: Input event listeners to guide user input
     */
    validateInput() {
        try {
            const text = this.qrTextArea.value.trim();
            const name = this.qrNameInput.value.trim();
            
            // Update character count and validation status
            const textLength = text.length;
            const maxLength = 1000; // QR code practical limit
            
            // Update UI with validation feedback
            const remaining = maxLength - textLength;
            if (remaining < 0) {
                this.qrTextArea.style.borderColor = '#e53e3e';
            } else if (remaining < 100) {
                this.qrTextArea.style.borderColor = '#ed8936';
            } else {
                this.qrTextArea.style.borderColor = '#68d391';
            }
            
        } catch (error) {
            // Silent validation - don't interrupt user typing
            console.debug('Input validation:', error.message);
        }
    }

    /**
     * Handle logo selection from predefined options
     * 
     * WHY: Allows users to customize QR codes with branded logos
     * WHEN: Called when user clicks on a logo option
     * HOW: Updates selection state and stores logo path for QR generation
     * USED BY: Logo option click events to manage logo selection
     * 
     * @param {HTMLElement} selectedOption - The clicked logo option element
     */
    selectLogo(selectedOption) {
        // Remove selection from all options
        this.logoOptions.forEach(option => option.classList.remove('selected'));
        
        // Add selection to clicked option
        selectedOption.classList.add('selected');
        
        // Store selected logo path
        this.selectedLogo = selectedOption.dataset.logo;
        
        // Clear custom logo if default selected
        if (this.selectedLogo !== 'custom') {
            this.customLogoPreview.innerHTML = '';
            this.logoUpload.value = '';
        }
        
        console.log('Logo selected:', this.selectedLogo);
    }

    /**
     * Handle custom logo file upload with security validation
     * 
     * WHY: Allows users to upload custom logos while preventing security threats
     * WHEN: Called when user selects a file in the logo upload input
     * HOW: Validates file security, creates preview, and stores logo data
     * USED BY: Logo upload input change event for custom logo functionality
     * 
     * @param {Event} event - File input change event
     */
    async handleLogoUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            // Comprehensive security validation using SecurityUtils
            await window.securityUtils.validateImageFile(file);

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    // Create secure preview with XSS protection
                    this.customLogoPreview.innerHTML = `
                        <img src="${window.securityUtils.escapeHTML(e.target.result)}" 
                             alt="Custom Logo" 
                             style="width: 80px; height: 80px; object-fit: cover; border-radius: 10px; border: 2px solid #667eea;">
                    `;
                    
                    // Set as selected logo data
                    this.selectedLogo = e.target.result;
                    
                    // Update selection UI
                    this.logoOptions.forEach(option => option.classList.remove('selected'));
                    
                    console.log('Custom logo uploaded successfully');
                } catch (error) {
                    console.error('Error creating logo preview:', error);
                }
            };
            
            reader.onerror = () => {
                throw new Error('Failed to read logo file');
            };
            
            reader.readAsDataURL(file);

        } catch (error) {
            // Clear the file input for security
            event.target.value = '';
            this.customLogoPreview.innerHTML = '';
            
            // Show user-friendly error message
            alert(`Logo upload failed: ${error.message}`);
            console.error('Logo validation error:', error);
        }
    }

    /**
     * Generate QR code with comprehensive security and mobile compatibility
     * 
     * WHY: Creates secure, shareable QR codes with duplicate detection and mobile fallback
     * WHEN: Called when user clicks generate button or uses Ctrl+Enter shortcut
     * HOW: Validates input, checks for duplicates, creates QR with mobile-compatible URL
     * USED BY: Generate button click event and keyboard shortcuts
     * 
     * SECURITY FEATURES:
     * - Input validation and sanitization
     * - Rate limiting protection
     * - Duplicate detection with user choice
     * - Mobile fallback data in URLs
     */
    async generateQRCode() {
        const text = this.qrTextArea.value.trim();
        const name = this.qrNameInput.value.trim();
        
        // Rate limiting check - prevents abuse and protects Firebase quota
        if (window.rateLimiter && !window.rateLimiter.canMakeRequest()) {
            const remaining = window.rateLimiter.getRemainingRequests();
            alert(`Rate limit exceeded. You can create ${remaining} more QR codes in the next minute. Please wait before creating more QR codes.`);
            return;
        }
        
        try {
            // Comprehensive input validation using SecurityUtils
            window.securityUtils.validateQRInput(text, name);
        } catch (error) {
            alert(error.message);
            return;
        }

        // Show loading state and disable button to prevent double-submission
        this.showLoading(true);
        this.generateBtn.disabled = true;

        try {
            // Duplicate detection - saves storage and informs users
            const existingQR = await FirebaseManager.checkForDuplicate(text, name);
            
            if (existingQR) {
                // Smart duplicate handling with user choice
                const confirmCreate = confirm(
                    `A QR code with this content already exists!\n\n` +
                    `Name: "${existingQR.name}"\n` +
                    `Created: ${FirebaseManager.formatTimestamp(existingQR.createdAt)}\n` +
                    `Scans: ${existingQR.scanCount || 0}\n\n` +
                    `Choose your action:\n` +
                    `• Click "OK" to load the existing QR code\n` +
                    `• Click "Cancel" to create a new duplicate QR code`
                );
                
                if (confirmCreate) {
                    // Load existing QR instead of creating duplicate
                    await this.loadQRCode(existingQR.id);
                    return;
                }
                // Continue to create duplicate if user cancels
            }
            
            // Create QR code entry in database (Firebase or localStorage)
            const qrId = await FirebaseManager.createQRCode(text, name, this.selectedLogo);
            this.currentQRId = qrId;
            
            // Generate mobile-compatible redirect URL
            let redirectUrl = FirebaseManager.getRedirectUrl(qrId);
            
            // CRITICAL: Add fallback data for mobile compatibility
            // Mobile browsers can't access localStorage from desktop sessions
            // This ensures QR codes work across all devices and browsers
            const fallbackData = btoa(JSON.stringify({
                text: window.securityUtils.sanitizeText(text),
                name: window.securityUtils.sanitizeText(name),
                created: Date.now(),
                source: 'mobile-fallback'
            }));
            redirectUrl += `&data=${encodeURIComponent(fallbackData)}`;
            console.log('Added mobile fallback data to URL for cross-device compatibility');
            
            // Generate QR code canvas with logo overlay
            const canvas = await this.createQRCanvas(redirectUrl);
            
            // Display result in UI
            this.displayQRCode(canvas);
            
            // Enable download and sharing controls
            this.downloadControls.style.display = 'block';
            
            // Set up real-time scan count monitoring
            this.startScanCountListener(qrId);
            
            // Update analytics display with initial data
            this.updateAnalytics({
                scanCount: 0,
                createdAt: Date.now(),
                lastScanned: null
            });
            
            // Refresh recent QR codes list
            this.loadRecentQRCodes();
            
            console.log('QR Code generated successfully:', qrId);
            
        } catch (error) {
            console.error('Error generating QR code:', error);
            alert('Failed to generate QR code. Please try again.');
        } finally {
            // Always restore UI state
            this.showLoading(false);
            this.generateBtn.disabled = false;
        }
    }

    /**
     * Create QR code canvas with logo overlay
     * 
     * WHY: Generates high-quality QR codes with customizable branding
     * WHEN: Called during QR code generation process
     * HOW: Uses QRCode.js library with canvas manipulation for logo overlay
     * USED BY: generateQRCode() method to create the visual QR code
     * 
     * @param {string} text - Text to encode in QR code (usually a URL)
     * @returns {Promise<HTMLCanvasElement>} - Canvas element with QR code and logo
     */
    async createQRCanvas(text) {
        const size = parseInt(this.qrSize.value) || 400;
        const errorCorrectionLevel = this.errorLevel.value || 'M';
        
        // Create temporary container for QR generation
        const tempDiv = document.createElement('div');
        tempDiv.style.display = 'none';
        document.body.appendChild(tempDiv);
        
        try {
            // Map error correction levels to QRCode.js constants
            let correctLevel;
            switch(errorCorrectionLevel) {
                case 'L': correctLevel = QRCode.CorrectLevel.L; break; // ~7% correction
                case 'M': correctLevel = QRCode.CorrectLevel.M; break; // ~15% correction
                case 'Q': correctLevel = QRCode.CorrectLevel.Q; break; // ~25% correction
                case 'H': correctLevel = QRCode.CorrectLevel.H; break; // ~30% correction
                default: correctLevel = QRCode.CorrectLevel.M;
            }

            // Generate base QR code
            const qr = new QRCode(tempDiv, {
                text: text,
                width: size,
                height: size,
                colorDark: "#000000",
                colorLight: "#FFFFFF",
                correctLevel: correctLevel
            });

            // Wait for QR generation to complete
            await new Promise(resolve => setTimeout(resolve, 100));

            // Extract the generated canvas
            const qrCanvas = tempDiv.querySelector('canvas');
            if (!qrCanvas) {
                throw new Error('Failed to generate QR canvas');
            }

            // Create output canvas for logo overlay
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');

            // Copy base QR code to output canvas
            ctx.drawImage(qrCanvas, 0, 0);

            // Add logo overlay if selected (requires higher error correction)
            if (this.selectedLogo && this.selectedLogo !== 'none') {
                await this.addLogoToCanvas(canvas);
            }

            return canvas;
        } finally {
            // Clean up temporary DOM element
            document.body.removeChild(tempDiv);
        }
    }

    /**
     * Add logo overlay to QR code canvas
     * 
     * WHY: Provides branding while maintaining QR code readability
     * WHEN: Called during QR generation if logo is selected
     * HOW: Draws logo in center with white background circle for contrast
     * USED BY: createQRCanvas() method when logo overlay is requested
     * 
     * @param {HTMLCanvasElement} canvas - QR code canvas to add logo to
     * @returns {Promise<void>} - Resolves when logo is successfully added
     */
    async addLogoToCanvas(canvas) {
        return new Promise((resolve, reject) => {
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                try {
                    const logoSize = canvas.width * 0.2; // 20% of QR size
                    const x = (canvas.width - logoSize) / 2;
                    const y = (canvas.height - logoSize) / 2;
                    
                    // Draw white background circle for contrast
                    ctx.fillStyle = 'white';
                    ctx.beginPath();
                    ctx.arc(canvas.width / 2, canvas.height / 2, logoSize / 2 + 10, 0, 2 * Math.PI);
                    ctx.fill();
                    
                    // Clip to circular area and draw logo
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
            
            img.onerror = () => reject(new Error('Failed to load logo image'));
            
            // Handle different logo sources (default path or base64 data)
            img.src = this.selectedLogo;
        });
    }

    /**
     * Display generated QR code in the UI
     * 
     * WHY: Shows the final QR code to user and enables download functionality
     * WHEN: Called after successful QR code generation
     * HOW: Creates canvas element in results area and stores for download
     * USED BY: generateQRCode() method to display the finished QR code
     * 
     * @param {HTMLCanvasElement} canvas - Generated QR code canvas
     */
    displayQRCode(canvas) {
        this.qrResult.innerHTML = `
            <div class="qr-display">
                <canvas width="${canvas.width}" height="${canvas.height}"></canvas>
            </div>
        `;
        
        // Copy QR code to display canvas
        const displayCanvas = this.qrResult.querySelector('canvas');
        const ctx = displayCanvas.getContext('2d');
        ctx.drawImage(canvas, 0, 0);
        
        // Store canvas for download functionality
        this.currentCanvas = canvas;
        
        console.log('QR code displayed successfully');
    }

    /**
     * Set up real-time scan count monitoring
     * 
     * WHY: Provides live analytics feedback as QR codes are scanned
     * WHEN: Called after QR code generation to start monitoring
     * HOW: Uses FirebaseManager to listen for real-time database changes
     * USED BY: generateQRCode() and loadQRCode() methods for analytics
     * 
     * @param {string} qrId - QR code identifier to monitor
     */
    startScanCountListener(qrId) {
        // Clean up any existing listener to prevent memory leaks
        if (this.scanCountListener) {
            this.scanCountListener();
        }
        
        // Start new real-time listener for scan count updates
        this.scanCountListener = FirebaseManager.onScanCountChange(qrId, (data) => {
            this.updateAnalytics(data);
        });
    }

    /**
     * Update analytics display with current QR code statistics
     * 
     * WHY: Shows users real-time usage statistics for their QR codes
     * WHEN: Called when analytics data changes or QR code is loaded
     * HOW: Updates DOM elements with formatted analytics data
     * USED BY: startScanCountListener() callback and initial QR display
     * 
     * @param {Object} data - QR code analytics data
     * @param {number} data.scanCount - Number of times QR was scanned
     * @param {number} data.createdAt - Creation timestamp
     * @param {number|null} data.lastScanned - Last scan timestamp
     */
    updateAnalytics(data) {
        try {
            this.scanCount.textContent = data.scanCount || 0;
            this.createdDate.textContent = FirebaseManager.formatTimestamp(data.createdAt).split(' ')[0];
            this.lastScan.textContent = data.lastScanned ? 
                FirebaseManager.formatTimestamp(data.lastScanned) : 'Never';
        } catch (error) {
            console.error('Error updating analytics:', error);
        }
    }

    /**
     * Download generated QR code as PNG file
     * 
     * WHY: Allows users to save QR codes for offline use and printing
     * WHEN: Called when user clicks download button
     * HOW: Converts canvas to data URL and triggers browser download
     * USED BY: Download button click event for QR code export
     */
    downloadQRCode() {
        if (!this.currentCanvas) {
            alert('Please generate a QR code first.');
            return;
        }

        try {
            // Create safe filename from QR name and timestamp
            const qrName = this.qrNameInput.value.trim();
            const safeName = qrName.replace(/[^a-zA-Z0-9\-_\s]/g, '').replace(/\s+/g, '-');
            const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD format
            const filename = safeName ? `${safeName}-${timestamp}.png` : `qr-code-${timestamp}.png`;

            // Create temporary download link
            const link = document.createElement('a');
            link.download = filename;
            link.href = this.currentCanvas.toDataURL('image/png');
            
            // Trigger download and cleanup
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            console.log('QR code downloaded:', filename);
        } catch (error) {
            console.error('Download failed:', error);
            alert('Failed to download QR code. Please try again.');
        }
    }

    /**
     * Copy QR code sharing link to clipboard
     * 
     * WHY: Enables easy sharing of QR codes via URL
     * WHEN: Called when user clicks copy link button
     * HOW: Uses Clipboard API to copy redirect URL
     * USED BY: Copy link button click event for QR sharing
     */
    async copyQRLink() {
        if (!this.currentQRId) {
            alert('Please generate a QR code first.');
            return;
        }

        try {
            const redirectUrl = FirebaseManager.getRedirectUrl(this.currentQRId);
            
            // Use modern Clipboard API
            await navigator.clipboard.writeText(redirectUrl);
            
            // Visual feedback for successful copy
            const originalText = this.copyLinkBtn.innerHTML;
            this.copyLinkBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
            this.copyLinkBtn.style.background = '#48bb78';
            
            // Reset button after 2 seconds
            setTimeout(() => {
                this.copyLinkBtn.innerHTML = originalText;
                this.copyLinkBtn.style.background = '#ed8936';
            }, 2000);
            
            console.log('QR link copied to clipboard');
            
        } catch (error) {
            console.error('Failed to copy link:', error);
            
            // Fallback for older browsers
            try {
                const textarea = document.createElement('textarea');
                textarea.value = FirebaseManager.getRedirectUrl(this.currentQRId);
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                alert('Link copied to clipboard!');
            } catch (fallbackError) {
                alert('Failed to copy link to clipboard. Please copy manually.');
            }
        }
    }

    /**
     * Load and display recent QR codes for quick access
     * 
     * WHY: Provides easy access to previously created QR codes
     * WHEN: Called during initialization and after creating new QR codes
     * HOW: Retrieves recent QR data and generates mini QR previews
     * USED BY: Constructor and generateQRCode() for dashboard functionality
     */
    async loadRecentQRCodes() {
        try {
            const recentQRs = await FirebaseManager.getRecentQRCodes();

            if (recentQRs.length === 0) {
                this.recentQRs.innerHTML = '<p class="no-recent">No recent QR codes. Generate one to get started!</p>';
                return;
            }

            // Generate HTML for recent QR codes with security sanitization
            const recentHTML = recentQRs.map(qr => {
                const shortText = window.securityUtils.truncateText(qr.originalText, 40);
                const safeName = window.securityUtils.sanitizeText(qr.name) || 'Unnamed QR Code';
                const safeId = window.securityUtils.escapeHTML(qr.id);
                
                return `
                    <div class="recent-item" onclick="qrGenerator.loadQRCode('${safeId}')">
                        <div class="recent-qr">
                            <canvas width="60" height="60" data-qr-id="${safeId}"></canvas>
                        </div>
                        <div class="recent-info">
                            <div class="recent-name">${safeName}</div>
                            <div class="recent-text">${shortText}</div>
                            <div class="recent-stats">
                                Scans: ${parseInt(qr.scanCount) || 0} | Created: ${window.securityUtils.escapeHTML(FirebaseManager.formatTimestamp(qr.createdAt).split(' ')[0])}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            this.recentQRs.innerHTML = recentHTML;
            
            // Generate mini QR code previews asynchronously
            recentQRs.forEach(qr => {
                this.generateMiniQR(qr.id, FirebaseManager.getRedirectUrl(qr.id));
            });
            
        } catch (error) {
            console.error('Error loading recent QR codes:', error);
            this.recentQRs.innerHTML = '<p class="error">Failed to load recent QR codes.</p>';
        }
    }

    /**
     * Generate mini QR code preview for recent items
     * 
     * WHY: Provides visual preview of QR codes in recent items list
     * WHEN: Called for each recent QR code when loading the list
     * HOW: Creates small QR codes using QRCode.js library
     * USED BY: loadRecentQRCodes() method for dashboard previews
     * 
     * @param {string} qrId - QR code identifier
     * @param {string} redirectUrl - URL to encode in mini QR code
     */
    async generateMiniQR(qrId, redirectUrl) {
        try {
            const canvas = this.recentQRs.querySelector(`canvas[data-qr-id="${qrId}"]`);
            if (!canvas) return;

            // Create temporary container for mini QR generation
            const tempDiv = document.createElement('div');
            tempDiv.style.display = 'none';
            document.body.appendChild(tempDiv);

            try {
                // Generate compact mini QR code
                const qr = new QRCode(tempDiv, {
                    text: redirectUrl,
                    width: 60,
                    height: 60,
                    colorDark: "#667eea", // Brand color for mini QRs
                    colorLight: "#FFFFFF",
                    correctLevel: QRCode.CorrectLevel.M
                });

                // Wait for generation
                await new Promise(resolve => setTimeout(resolve, 50));

                // Copy to target canvas
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

    /**
     * Load existing QR code data and display it
     * 
     * WHY: Allows users to revisit and manage previously created QR codes
     * WHEN: Called when user clicks on recent QR code or loads from URL
     * HOW: Retrieves QR data from database and recreates the display
     * USED BY: Recent QR code clicks and deep-linking functionality
     * 
     * @param {string} qrId - QR code identifier to load
     */
    async loadQRCode(qrId) {
        try {
            // Validate input
            if (!qrId || typeof qrId !== 'string') {
                throw new Error('Invalid QR code ID');
            }

            this.showLoading(true);
            
            // Retrieve QR data from database
            const qrData = await FirebaseManager.getQRCode(qrId);
            if (!qrData) {
                alert('QR code not found or has been deleted.');
                return;
            }

            // Populate UI with QR data
            this.qrTextArea.value = qrData.originalText || '';
            this.qrNameInput.value = qrData.name || '';
            this.currentQRId = qrId;
            
            // Restore logo selection if available
            if (qrData.logoPath && qrData.logoPath !== 'none') {
                this.selectedLogo = qrData.logoPath;
                // Update UI selection state
                this.updateLogoSelection(qrData.logoPath);
            }
            
            // Regenerate and display QR code
            const redirectUrl = FirebaseManager.getRedirectUrl(qrId);
            const canvas = await this.createQRCanvas(redirectUrl);
            this.displayQRCode(canvas);
            
            // Show controls and update analytics
            this.downloadControls.style.display = 'block';
            this.updateAnalytics(qrData);
            this.startScanCountListener(qrId);
            
            console.log('QR code loaded successfully:', qrId);
            
        } catch (error) {
            console.error('Error loading QR code:', error);
            alert('Failed to load QR code data. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Update logo selection UI based on saved logo path
     * 
     * WHY: Maintains UI consistency when loading saved QR codes
     * WHEN: Called when loading QR codes with custom logo settings
     * HOW: Updates logo selection buttons and preview elements
     * USED BY: loadQRCode() method to restore UI state
     * 
     * @param {string} logoPath - Path or data URL of the logo
     */
    updateLogoSelection(logoPath) {
        try {
            // Clear current selection
            this.logoOptions.forEach(option => option.classList.remove('selected'));
            
            if (logoPath.startsWith('data:')) {
                // Custom uploaded logo
                this.customLogoPreview.innerHTML = `
                    <img src="${window.securityUtils.escapeHTML(logoPath)}" 
                         alt="Custom Logo" 
                         style="width: 80px; height: 80px; object-fit: cover; border-radius: 10px; border: 2px solid #667eea;">
                `;
            } else {
                // Default logo - find and select matching option
                const matchingOption = Array.from(this.logoOptions).find(option => 
                    option.dataset.logo === logoPath
                );
                if (matchingOption) {
                    matchingOption.classList.add('selected');
                }
            }
        } catch (error) {
            console.error('Error updating logo selection:', error);
        }
    }

    /**
     * Show or hide loading overlay
     * 
     * WHY: Provides user feedback during async operations
     * WHEN: Called at start and end of operations like QR generation
     * HOW: Toggles display of loading overlay element
     * USED BY: All async methods that require user feedback
     * 
     * @param {boolean} show - Whether to show (true) or hide (false) loading
     */
    showLoading(show) {
        if (this.loadingOverlay) {
            this.loadingOverlay.style.display = show ? 'flex' : 'none';
        }
    }
}

/**
 * Application Initialization
 * 
 * WHY: Ensures QR Generator is ready when page loads and dependencies are available
 * WHEN: Executed automatically when DOM content is fully loaded
 * HOW: Creates global QRGenerator instance and verifies security modules
 * USED BY: Browser's DOM loading process to initialize the application
 * 
 * DEPENDENCIES: Requires SecurityUtils, FirebaseManager, and QRCode.js to be loaded
 */
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Give a small delay to ensure all scripts are loaded
        setTimeout(() => {
            try {
                // Verify required dependencies with detailed error messages
                if (typeof QRCode === 'undefined') {
                    throw new Error('QRCode library not loaded. Check if qrcode.min.js is included.');
                }
                
                if (!window.SecurityUtils && !window.securityUtils) {
                    throw new Error('SecurityUtils not available. Check if security-utils.js loaded properly.');
                }
                
                if (!window.FirebaseManager) {
                    console.warn('FirebaseManager not available - offline mode will be used');
                }
                
                // Initialize QR Generator
                window.qrGenerator = new QRGenerator();
                
                console.log('QR Generator initialized successfully');
                console.log('Security features enabled:', {
                    xssProtection: true,
                    inputValidation: true,
                    fileValidation: true,
                    encryptedStorage: true
                });
                
            } catch (error) {
                console.error('Failed to initialize QR Generator:', error);
                
                // Show user-friendly error based on specific failure
                let userMessage = 'Application failed to load. ';
                if (error.message.includes('QRCode')) {
                    userMessage += 'QR code library failed to load.';
                } else if (error.message.includes('SecurityUtils')) {
                    userMessage += 'Security modules failed to load.';
                } else {
                    userMessage += 'Please check your internet connection.';
                }
                userMessage += ' Please refresh the page and try again.';
                
                alert(userMessage);
            }
        }, 100); // Small delay to ensure script loading
        
    } catch (error) {
        console.error('Critical initialization error:', error);
        alert('Critical error during application startup. Please refresh the page.');
    }
});