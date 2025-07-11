// Settings and user preferences for the Unified Timeline Visualizer
const SETTINGS = {
    // Default user preferences
    DEFAULTS: {
        minAngleDeg: 2,
        ringThickness: 6,
        showSunburst: true,
        showGantt: true,
        showConnections: true,
        showLegend: true,
        playbackSpeed: 2000, // milliseconds
        cameraFollowMode: true,
        autoRotate: false,
        enableShadows: true,
        enableFog: true,
        enableGrid: true
    },
    
    // UI preferences
    UI_PREFERENCES: {
        panelOpacity: 0.85,
        fontSize: 12,
        compactMode: false,
        showTooltips: true,
        animationDuration: 300,
        theme: 'dark'
    },
    
    // Performance settings
    PERFORMANCE: {
        maxRenderDistance: 20000,
        shadowMapSize: 2048,
        antialias: true,
        preserveDrawingBuffer: true,
        maxSegments: 64,
        lodEnabled: true,
        cullingEnabled: true,
        maxVisibleObjects: 1000
    },
    
    // Debug settings
    DEBUG: {
        showFPS: false,
        showStats: false,
        logLevel: 'info', // 'debug', 'info', 'warn', 'error'
        showBoundingBoxes: false,
        showWireframes: false,
        showAxes: false,
        verboseLogging: false
    },
    
    // Data processing settings
    DATA: {
        correlationThreshold: 0.5,
        maxEvents: 10000,
        cacheSize: 100,
        autoRefresh: false,
        refreshInterval: 30000, // milliseconds
        compressionEnabled: true
    },
    
    // Export settings
    EXPORT: {
        defaultFormat: 'json',
        includeMetadata: true,
        compressOutput: true,
        timestampFormat: 'iso',
        includeCorrelations: true
    },
    
    // Local storage keys
    STORAGE_KEYS: {
        USER_PREFERENCES: 'timeline_visualizer_prefs',
        CAMERA_POSITION: 'timeline_visualizer_camera',
        LAST_FILE: 'timeline_visualizer_last_file',
        WINDOW_STATE: 'timeline_visualizer_window',
        CUSTOM_COLORS: 'timeline_visualizer_colors',
        RECENT_FILES: 'timeline_visualizer_recent'
    },
    
    // Validation rules
    VALIDATION: {
        minAngleDeg: { min: 1, max: 50 },
        ringThickness: { min: 2, max: 20 },
        playbackSpeed: { min: 100, max: 10000 },
        maxFileSize: 50 * 1024 * 1024, // 50MB
        maxEvents: 50000,
        maxCorrelations: 10000
    },
    
    // Utility functions for settings management
    UTILS: {
        // Load settings from localStorage
        loadSettings: function() {
            try {
                const stored = localStorage.getItem(SETTINGS.STORAGE_KEYS.USER_PREFERENCES);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    return { ...SETTINGS.DEFAULTS, ...parsed };
                }
            } catch (error) {
                console.warn('Failed to load settings:', error);
            }
            return SETTINGS.DEFAULTS;
        },
        
        // Save settings to localStorage
        saveSettings: function(settings) {
            try {
                const toSave = { ...SETTINGS.DEFAULTS, ...settings };
                localStorage.setItem(SETTINGS.STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(toSave));
                return true;
            } catch (error) {
                console.warn('Failed to save settings:', error);
                return false;
            }
        },
        
        // Validate setting value
        validateSetting: function(key, value) {
            const validation = SETTINGS.VALIDATION[key];
            if (!validation) return true;
            
            if (typeof validation.min === 'number' && value < validation.min) return false;
            if (typeof validation.max === 'number' && value > validation.max) return false;
            
            return true;
        },
        
        // Get setting with validation
        getSetting: function(key, defaultValue = null) {
            const settings = this.loadSettings();
            const value = settings[key] !== undefined ? settings[key] : defaultValue;
            
            if (!this.validateSetting(key, value)) {
                console.warn(`Invalid setting value for ${key}: ${value}`);
                return SETTINGS.DEFAULTS[key] || defaultValue;
            }
            
            return value;
        },
        
        // Set setting with validation
        setSetting: function(key, value) {
            if (!this.validateSetting(key, value)) {
                console.warn(`Invalid setting value for ${key}: ${value}`);
                return false;
            }
            
            const settings = this.loadSettings();
            settings[key] = value;
            return this.saveSettings(settings);
        },
        
        // Reset settings to defaults
        resetSettings: function() {
            try {
                localStorage.removeItem(SETTINGS.STORAGE_KEYS.USER_PREFERENCES);
                return true;
            } catch (error) {
                console.warn('Failed to reset settings:', error);
                return false;
            }
        }
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SETTINGS;
} else if (typeof window !== 'undefined') {
    window.SETTINGS = SETTINGS;
}