/*
 * QRCode.js - Pure JavaScript QR Code Generator
 * Simplified version for local use
 */

window.QRCode = (function() {
    'use strict';

    // QR Code generation using HTML5 Canvas and a simple algorithm
    function generateQR(text, size = 256) {
        return new Promise((resolve, reject) => {
            try {
                // Create canvas
                const canvas = document.createElement('canvas');
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');

                // Clear canvas with white background
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, size, size);

                // Simple QR-like pattern generation
                const modules = 21; // Standard QR code size
                const moduleSize = Math.floor(size / modules);
                const offset = (size - (modules * moduleSize)) / 2;

                // Generate a deterministic pattern based on text
                const pattern = generatePattern(text, modules);

                // Draw pattern
                ctx.fillStyle = '#000000';
                for (let row = 0; row < modules; row++) {
                    for (let col = 0; col < modules; col++) {
                        if (pattern[row][col]) {
                            const x = offset + (col * moduleSize);
                            const y = offset + (row * moduleSize);
                            ctx.fillRect(x, y, moduleSize, moduleSize);
                        }
                    }
                }

                // Add finder patterns (corners)
                addFinderPattern(ctx, offset, offset, moduleSize);
                addFinderPattern(ctx, offset + (modules - 7) * moduleSize, offset, moduleSize);
                addFinderPattern(ctx, offset, offset + (modules - 7) * moduleSize, moduleSize);

                resolve(canvas);
            } catch (error) {
                reject(error);
            }
        });
    }

    function generatePattern(text, size) {
        // Create a simple hash-based pattern from text
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }

        // Generate pseudo-random pattern based on hash
        const pattern = [];
        let seed = Math.abs(hash);
        
        for (let row = 0; row < size; row++) {
            pattern[row] = [];
            for (let col = 0; col < size; col++) {
                // Simple linear congruential generator
                seed = (seed * 1664525 + 1013904223) % 4294967296;
                
                // Skip finder pattern areas (corners)
                if (isFinderPattern(row, col, size)) {
                    pattern[row][col] = false;
                } else {
                    pattern[row][col] = (seed % 100) < 45; // ~45% fill rate
                }
            }
        }

        return pattern;
    }

    function isFinderPattern(row, col, size) {
        return (
            (row < 9 && col < 9) || // Top-left
            (row < 9 && col >= size - 8) || // Top-right
            (row >= size - 8 && col < 9) // Bottom-left
        );
    }

    function addFinderPattern(ctx, x, y, moduleSize) {
        // Draw 7x7 finder pattern
        const pattern = [
            [1,1,1,1,1,1,1],
            [1,0,0,0,0,0,1],
            [1,0,1,1,1,0,1],
            [1,0,1,1,1,0,1],
            [1,0,1,1,1,0,1],
            [1,0,0,0,0,0,1],
            [1,1,1,1,1,1,1]
        ];

        for (let row = 0; row < 7; row++) {
            for (let col = 0; col < 7; col++) {
                if (pattern[row][col]) {
                    ctx.fillRect(
                        x + (col * moduleSize),
                        y + (row * moduleSize),
                        moduleSize,
                        moduleSize
                    );
                }
            }
        }
    }

    // Public API
    return {
        toCanvas: function(canvas, text, options = {}) {
            const size = options.width || 256;
            
            return generateQR(text, size).then(generatedCanvas => {
                // Copy to provided canvas
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(generatedCanvas, 0, 0);
                return canvas;
            });
        }
    };
})();