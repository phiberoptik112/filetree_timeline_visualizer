// Configuration constants for the Unified Timeline Visualizer
const CONFIG = {
    // Scene configuration
    SCENE: {
        CAMERA: {
            FOV: 60,
            NEAR: 1,
            FAR: 20000,
            INITIAL_POSITION: { x: 15, y: 50, z: 80 },
            INITIAL_LOOK_AT: { x: 10, y: 25, z: 0 }
        },
        CONTROLS: {
            ENABLE_DAMPING: true,
            DAMPING_FACTOR: 0.05,
            ENABLE_ZOOM: true,
            ENABLE_PAN: true,
            MIN_DISTANCE: 20,
            MAX_DISTANCE: 150,
            MIN_POLAR_ANGLE: Math.PI / 6,
            MAX_POLAR_ANGLE: Math.PI / 2,
            AUTO_ROTATE: false,
            AUTO_ROTATE_SPEED: 0.5
        },
        LIGHTING: {
            AMBIENT_COLOR: 0x1a1a2e,
            AMBIENT_INTENSITY: 0.3,
            MAIN_LIGHT_COLOR: 0xffffff,
            MAIN_LIGHT_INTENSITY: 0.8,
            FILL_LIGHT_COLOR: 0x4a90e2,
            FILL_LIGHT_INTENSITY: 0.4,
            RIM_LIGHT_COLOR: 0xff6b6b,
            RIM_LIGHT_INTENSITY: 0.3,
            POINT_LIGHT_1_COLOR: 0x4CAF50,
            POINT_LIGHT_1_INTENSITY: 0.6,
            POINT_LIGHT_1_DISTANCE: 200,
            POINT_LIGHT_2_COLOR: 0x3B82F6,
            POINT_LIGHT_2_INTENSITY: 0.4,
            POINT_LIGHT_2_DISTANCE: 150,
            HEMISPHERE_SKY_COLOR: 0x4a90e2,
            HEMISPHERE_GROUND_COLOR: 0x1a1a2e,
            HEMISPHERE_INTENSITY: 0.2
        },
        BACKGROUND: {
            GROUND_COLOR: 0x0a0e14,
            GROUND_OPACITY: 0.1,
            GROUND_SIZE: 1000,
            GRID_SIZE: 200,
            GRID_DIVISIONS: 20,
            GRID_COLOR_1: 0x2a2a2a,
            GRID_COLOR_2: 0x1a1a1a,
            GRID_OPACITY: 0.3,
            WALL_COLOR: 0x0a0e14,
            WALL_OPACITY: 0.05,
            FOG_COLOR: 0x0a0e14,
            FOG_NEAR: 100,
            FOG_FAR: 800
        }
    },
    
    // Sunburst visualization
    SUNBURST: {
        DEFAULT_MIN_ANGLE_DEG: 2,
        DEFAULT_RING_THICKNESS: 6,
        RING_GAP: 2,
        Z_SPACING: 20,
        INITIAL_RADIUS: 2,
        SEGMENTS: 64,
        OPACITY: 0.8,
        HIGHLIGHT_COLOR: '#00ff66',
        HIGHLIGHT_OPACITY: 1.0,
        CONNECTION_LINE_OPACITY: 0.3,
        CONNECTION_LINE_COLOR: 0xffffff
    },
    
    // Gantt chart visualization
    GANTT: {
        AXIS_COLOR: 0xff00ff,
        AXIS_WIDTH: 0.3,
        MIN_Y: 0,
        MAX_Y: 100,
        BAR_OFFSET_X: 10,
        TICK_COLOR: 0x00ff00,
        TICK_SIZE: { radius: 0.5, height: 2, segments: 16 },
        INTENDED_BAR_SIZE: { width: 2, depth: 2 },
        ACTUAL_BAR_SIZE: { width: 1.2, depth: 1.2 },
        DASH_SIZE: 2,
        GAP_SIZE: 2,
        LABEL_OFFSET: 4,
        LABEL_VERTICAL_OFFSET: 2
    },
    
    // Timeline and playback
    TIMELINE: {
        PLAY_INTERVAL: 2000, // milliseconds
        DEFAULT_DURATION: 86400, // seconds (1 day)
        CAMERA_FOLLOW_OFFSET: 30,
        CAMERA_Y_SPACING: 12
    },
    
    // Text rendering
    TEXT: {
        CANVAS_WIDTH: 256,
        CANVAS_HEIGHT: 64,
        FONT: 'bold 12px Arial',
        FONT_COLOR: '#ffffff',
        FONT_POSITION: { x: 10, y: 30 },
        MAX_LENGTH: 20,
        LABEL_SIZE: { width: 12, height: 3 },
        TIME_LABEL_SIZE: { width: 8, height: 2 },
        TIME_LABEL_CANVAS: { width: 128, height: 32 },
        TIME_LABEL_FONT: '12px Arial',
        TIME_LABEL_POSITION: { x: 10, y: 20 }
    },
    
    // Interaction
    INTERACTION: {
        RAYCAST_THRESHOLD: 0.1,
        HOVER_DELAY: 100, // milliseconds
        CLICK_THRESHOLD: 5, // pixels
        DETAILS_PANEL_OFFSET: { x: 20, y: 20 },
        DETAILS_PANEL_MAX_WIDTH: 300,
        DETAILS_PANEL_MAX_HEIGHT: 200
    },
    
    // Connection lines
    CONNECTIONS: {
        DEFAULT_COLOR: 0xF59E0B,
        OPACITY_MULTIPLIER: 0.8,
        CURVE_SEGMENTS: 32,
        BEZIER_CONTROL_FACTOR: 0.5
    },
    
    // File processing
    FILES: {
        DEFAULT_DB_FILE: 'unified_timeline.json',
        SUPPORTED_FORMATS: ['.json'],
        MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
        CACHE_SIZE: 100
    },
    
    // UI
    UI: {
        PANEL_Z_INDEX: 100,
        DETAILS_PANEL_Z_INDEX: 1000,
        LOADING_Z_INDEX: 1000,
        SLIDER_CONTAINER_Z_INDEX: 201,
        ANIMATION_DURATION: 300 // milliseconds
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
} else if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
}