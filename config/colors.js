// Color configuration for the Unified Timeline Visualizer
const COLORS = {
    // File type colors (hex values)
    FILE_TYPES: {
        // Programming languages
        'text/javascript': '#f7df1e',
        'application/javascript': '#f7df1e',
        'text/x-python': '#5c37ab',
        'text/html': '#e34c26',
        'text/css': '#15b6b1',
        'application/json': '#000000',
        'text/markdown': '#083fa1',
        
        // Documents
        'application/pdf': '#ff0000',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '#217346',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '#3c6f1d',
        'application/vnd.ms-outlook': '#d48300',
        'application/vnd.ms-outlook.msg': '#d48300',
        'message/rfc822': '#d48300',
        
        // Media
        'image/': '#ff6b6b',
        'video/': '#9b59b6',
        'audio/': '#3498db',
        
        // Archives
        'application/zip': '#e67e22',
        'application/x-rar-compressed': '#e67e22',
        'application/x-7z-compressed': '#e67e22',
        'application/x-tar': '#e67e22',
        'application/gzip': '#e67e22',
        
        // Other
        'text/': '#95a5a6',
        'folder': '#a73a81',
        'default': '#bdc3c7'
    },
    
    // File type colors (numeric values for Three.js)
    FILE_TYPES_NUMERIC: {
        'text/javascript': 0xf7df1e,
        'application/javascript': 0xf7df1e,
        'text/x-python': 0x3776ab,
        'text/html': 0xe34c26,
        'text/css': 0x1572b6,
        'application/json': 0x000000,
        'text/markdown': 0x083fa1,
        'application/pdf': 0xff0000,
        'text/plain': 0x9e9e9e,
        'text/csv': 0x2ecc71,
        'application/octet-stream': 0x95a5a6,
        'folder': 0x4CAF50,
        'default': 0x9e9e9e
    },
    
    // Milestone category colors
    MILESTONE_CATEGORIES: {
        'requirement': '#3B82F6',
        'deliverable': '#10B981',
        'meeting': '#F59E0B',
        'deadline': '#EF4444',
        'decision': '#8B5CF6',
        'issue': '#F97316',
        'default': '#6B7280'
    },
    
    // Milestone category colors (numeric)
    MILESTONE_CATEGORIES_NUMERIC: {
        'requirement': 0x3B82F6,
        'deliverable': 0x10B981,
        'meeting': 0xF59E0B,
        'deadline': 0xEF4444,
        'decision': 0x8B5CF6,
        'issue': 0xF97316,
        'default': 0x6B7280
    },
    
    // UI theme colors
    THEME: {
        PRIMARY: '#4CAF50',
        SECONDARY: '#3B82F6',
        SUCCESS: '#10B981',
        WARNING: '#F59E0B',
        ERROR: '#EF4444',
        INFO: '#8B5CF6',
        BACKGROUND: '#0a0e14',
        SURFACE: '#1a1a2e',
        TEXT_PRIMARY: '#ffffff',
        TEXT_SECONDARY: '#9e9e9e',
        ACCENT: '#ff6b6b'
    },
    
    // File extension mapping (for fallback)
    EXTENSIONS: {
        'msg': '#d48300',
        'eml': '#d48300',
        'zip': '#e67e22',
        'rar': '#e67e22',
        '7z': '#e67e22',
        'tar': '#e67e22',
        'gz': '#e67e22',
        'pdf': '#ff0000',
        'docx': '#217346',
        'xlsx': '#3c6f1d',
        'doc': '#d48300',
        'txt': '#95a5a6',
        'md': '#083fa1',
        'js': '#f7df1e',
        'py': '#5c37ab',
        'html': '#e34c26',
        'css': '#15b6b1',
        'json': '#000000'
    },
    
    // Legend categories for display
    LEGEND_CATEGORIES: {
        'Programming': ['text/javascript', 'text/x-python', 'text/html', 'text/css', 'application/json', 'text/markdown'],
        'Documents': ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
                     'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-outlook'],
        'Media': ['image/', 'video/', 'audio/'],
        'Other': ['text/', 'folder', 'default']
    },
    
    // Utility functions
    UTILS: {
        // Convert hex string to Three.js color
        hexToThree: function(hex) {
            if (typeof hex === 'string' && hex.startsWith('#')) {
                return parseInt(hex.slice(1), 16);
            }
            return hex;
        },
        
        // Convert Three.js color to hex string
        threeToHex: function(color) {
            if (typeof color === 'number') {
                return '#' + color.toString(16).padStart(6, '0');
            }
            return color;
        },
        
        // Get color with fallback
        getFileColor: function(mimeType, extension = null) {
            // Try exact mime type match
            if (COLORS.FILE_TYPES[mimeType]) {
                return COLORS.FILE_TYPES[mimeType];
            }
            
            // Try extension fallback
            if (extension && COLORS.EXTENSIONS[extension.toLowerCase()]) {
                return COLORS.EXTENSIONS[extension.toLowerCase()];
            }
            
            // Try prefix match (e.g., 'image/' for 'image/png')
            for (const [pattern, color] of Object.entries(COLORS.FILE_TYPES)) {
                if (pattern.endsWith('/') && mimeType && mimeType.startsWith(pattern)) {
                    return color;
                }
            }
            
            // Default fallback
            return COLORS.FILE_TYPES.default;
        },
        
        // Get milestone color
        getMilestoneColor: function(category) {
            return COLORS.MILESTONE_CATEGORIES[category] || COLORS.MILESTONE_CATEGORIES.default;
        }
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = COLORS;
} else if (typeof window !== 'undefined') {
    window.COLORS = COLORS;
}