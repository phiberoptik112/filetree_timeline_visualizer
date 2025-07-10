// ColorUtils - Color processing and mapping utilities
class ColorUtils {
    constructor() {
        this.colors = window.COLORS || {};
        this.colorCache = new Map();
    }
    
    // Convert hex string to Three.js color number
    hexToThree(hex) {
        if (typeof hex === 'string' && hex.startsWith('#')) {
            return parseInt(hex.slice(1), 16);
        }
        if (typeof hex === 'number') {
            return hex;
        }
        return 0x9e9e9e; // Default gray
    }
    
    // Convert Three.js color number to hex string
    threeToHex(color) {
        if (typeof color === 'number') {
            return '#' + color.toString(16).padStart(6, '0');
        }
        if (typeof color === 'string' && color.startsWith('#')) {
            return color;
        }
        return '#9e9e9e'; // Default gray
    }
    
    // Get color for file node with fallback logic
    getFileColor(node, returnAsHex = true) {
        // Check cache first
        const cacheKey = `${node.name}_${node.type}_${node.mime_type}`;
        if (this.colorCache.has(cacheKey)) {
            const cached = this.colorCache.get(cacheKey);
            return returnAsHex ? this.threeToHex(cached) : cached;
        }
        
        let color;
        
        if (node.type === 'folder') {
            color = this.colors.FILE_TYPES?.folder || '#a73a81';
        } else {
            color = this.getColorForMimeType(node.mime_type, node.name);
        }
        
        // Ensure color is in the correct format
        if (typeof color === 'string' && !color.startsWith('#')) {
            color = `#${color}`;
        }
        
        // Validate hex color format
        if (!this.isValidHexColor(color)) {
            console.warn('[ColorUtils] Invalid color for node:', node, 'Got color:', color);
            color = '#bdc3c7'; // Default fallback
        }
        
        // Cache the result
        this.colorCache.set(cacheKey, color);
        
        return returnAsHex ? color : this.hexToThree(color);
    }
    
    // Get color for MIME type with extension fallback
    getColorForMimeType(mimeType, filename = null) {
        const fileTypes = this.colors.FILE_TYPES || {};
        
        if (!mimeType) {
            return this.getColorForExtension(filename) || fileTypes.default || '#bdc3c7';
        }
        
        // 1. Try exact MIME type match
        if (fileTypes[mimeType]) {
            return fileTypes[mimeType];
        }
        
        // 2. Try extension fallback
        if (filename) {
            const extensionColor = this.getColorForExtension(filename);
            if (extensionColor) {
                return extensionColor;
            }
        }
        
        // 3. Try prefix match (e.g., 'image/' for 'image/png')
        for (const [pattern, color] of Object.entries(fileTypes)) {
            if (pattern.endsWith('/') && mimeType.startsWith(pattern)) {
                return color;
            }
        }
        
        // 4. Default fallback
        return fileTypes.default || '#bdc3c7';
    }
    
    // Get color for file extension
    getColorForExtension(filename) {
        if (!filename || !this.colors.EXTENSIONS) return null;
        
        const extension = filename.split('.').pop()?.toLowerCase();
        return extension ? this.colors.EXTENSIONS[extension] : null;
    }
    
    // Get milestone color
    getMilestoneColor(category, returnAsHex = true) {
        const milestoneColors = this.colors.MILESTONE_CATEGORIES || {};
        const color = milestoneColors[category] || milestoneColors.default || '#6B7280';
        
        return returnAsHex ? color : this.hexToThree(color);
    }
    
    // Get theme color
    getThemeColor(colorName, returnAsHex = true) {
        const themeColors = this.colors.THEME || {};
        const color = themeColors[colorName] || '#ffffff';
        
        return returnAsHex ? color : this.hexToThree(color);
    }
    
    // Validate hex color format
    isValidHexColor(color) {
        if (typeof color !== 'string') return false;
        return /^#([0-9a-fA-F]{3}){1,2}$/.test(color);
    }
    
    // Generate color variations
    lightenColor(color, percent) {
        const hex = this.threeToHex(color);
        const num = parseInt(hex.slice(1), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        
        return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    }
    
    darkenColor(color, percent) {
        const hex = this.threeToHex(color);
        const num = parseInt(hex.slice(1), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) - amt;
        const G = (num >> 8 & 0x00FF) - amt;
        const B = (num & 0x0000FF) - amt;
        
        return '#' + (0x1000000 + (R > 255 ? 255 : R < 0 ? 0 : R) * 0x10000 +
            (G > 255 ? 255 : G < 0 ? 0 : G) * 0x100 +
            (B > 255 ? 255 : B < 0 ? 0 : B)).toString(16).slice(1);
    }
    
    // Generate complementary color
    getComplementaryColor(color) {
        const hex = this.threeToHex(color);
        const num = parseInt(hex.slice(1), 16);
        const R = 255 - (num >> 16);
        const G = 255 - (num >> 8 & 0x00FF);
        const B = 255 - (num & 0x0000FF);
        
        return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    }
    
    // Generate color palette
    generatePalette(baseColor, count = 5) {
        const palette = [];
        const step = 360 / count;
        
        for (let i = 0; i < count; i++) {
            const hue = (i * step) % 360;
            const color = this.hslToHex(hue, 70, 50);
            palette.push(color);
        }
        
        return palette;
    }
    
    // Convert HSL to hex
    hslToHex(h, s, l) {
        l /= 100;
        const a = s * Math.min(l, 1 - l) / 100;
        const f = n => {
            const k = (n + h / 30) % 12;
            const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
            return Math.round(255 * color).toString(16).padStart(2, '0');
        };
        return `#${f(0)}${f(8)}${f(4)}`;
    }
    
    // Convert hex to HSL
    hexToHsl(hex) {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        
        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        
        return {
            h: Math.round(h * 360),
            s: Math.round(s * 100),
            l: Math.round(l * 100)
        };
    }
    
    // Create gradient between two colors
    createGradient(color1, color2, steps = 10) {
        const gradient = [];
        const hex1 = this.threeToHex(color1);
        const hex2 = this.threeToHex(color2);
        
        const r1 = parseInt(hex1.slice(1, 3), 16);
        const g1 = parseInt(hex1.slice(3, 5), 16);
        const b1 = parseInt(hex1.slice(5, 7), 16);
        
        const r2 = parseInt(hex2.slice(1, 3), 16);
        const g2 = parseInt(hex2.slice(3, 5), 16);
        const b2 = parseInt(hex2.slice(5, 7), 16);
        
        for (let i = 0; i <= steps; i++) {
            const ratio = i / steps;
            const r = Math.round(r1 + (r2 - r1) * ratio);
            const g = Math.round(g1 + (g2 - g1) * ratio);
            const b = Math.round(b1 + (b2 - b1) * ratio);
            
            gradient.push(`#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`);
        }
        
        return gradient;
    }
    
    // Get color for file type category
    getCategoryColor(category) {
        const categoryColors = {
            'Programming': '#4CAF50',
            'Documents': '#2196F3',
            'Media': '#FF9800',
            'Archives': '#795548',
            'Other': '#9E9E9E'
        };
        
        return categoryColors[category] || categoryColors.Other;
    }
    
    // Clear color cache
    clearCache() {
        this.colorCache.clear();
    }
    
    // Get cache statistics
    getCacheStats() {
        return {
            size: this.colorCache.size,
            keys: Array.from(this.colorCache.keys())
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ColorUtils;
} else if (typeof window !== 'undefined') {
    window.ColorUtils = ColorUtils;
}