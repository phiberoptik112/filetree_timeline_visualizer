// Main application initialization
(function() {
    'use strict';
    
    let visualizer = null;
    
    // Initialize the application when the page loads
    function initializeApplication() {
        console.log('Initializing Unified Timeline Visualizer Application...');
        
        try {
            // Check for required dependencies
            if (!window.THREE) {
                throw new Error('Three.js library not found. Please include Three.js before the application scripts.');
            }
            
            if (!window.THREE.OrbitControls) {
                console.warn('OrbitControls not found. Camera controls may not work properly.');
            }
            
            // Verify all required classes are available
            const requiredClasses = [
                'SceneManager',
                'UIManager', 
                'DataManager',
                'VisualizationManager',
                'InteractionManager',
                'TimelineController',
                'UnifiedTimelineVisualizer',
                'ColorUtils',
                'FormatUtils'
            ];
            
            const missingClasses = requiredClasses.filter(className => !window[className]);
            if (missingClasses.length > 0) {
                throw new Error(`Missing required classes: ${missingClasses.join(', ')}`);
            }
            
            // Verify configuration is loaded
            if (!window.CONFIG) {
                console.warn('Configuration not loaded. Using default settings.');
                window.CONFIG = {};
            }
            
            if (!window.COLORS) {
                console.warn('Color configuration not loaded. Using default colors.');
                window.COLORS = {};
            }
            
            if (!window.SETTINGS) {
                console.warn('Settings configuration not loaded. Using defaults.');
                window.SETTINGS = {};
            }
            
            // Create the main visualizer instance
            visualizer = new UnifiedTimelineVisualizer();
            
            // Make it globally accessible for debugging
            window.visualizer = visualizer;
            
            // Setup global error handling
            setupErrorHandling();
            
            // Setup keyboard shortcuts
            setupKeyboardShortcuts();
            
            // Setup performance monitoring (if enabled)
            if (window.CONFIG.DEBUG && window.CONFIG.DEBUG.showFPS) {
                setupPerformanceMonitoring();
            }
            
            console.log('Application initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize application:', error);
            showInitializationError(error.message);
        }
    }
    
    // Setup global error handling
    function setupErrorHandling() {
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            
            // Show user-friendly error message
            if (visualizer && visualizer.components && visualizer.components.uiManager) {
                visualizer.components.uiManager.showError('An unexpected error occurred. Please refresh the page.');
            }
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            
            // Show user-friendly error message
            if (visualizer && visualizer.components && visualizer.components.uiManager) {
                visualizer.components.uiManager.showError('An unexpected error occurred. Please refresh the page.');
            }
        });
    }
    
    // Setup keyboard shortcuts
    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            if (!visualizer || !visualizer.initialized) return;
            
            // Don't interfere with form inputs
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
                return;
            }
            
            try {
                switch (event.key.toLowerCase()) {
                    case ' ':
                    case 'spacebar':
                        event.preventDefault();
                        if (visualizer.components.timelineController.getIsPlaying()) {
                            visualizer.pause();
                        } else {
                            visualizer.play();
                        }
                        break;
                        
                    case 'arrowleft':
                        event.preventDefault();
                        visualizer.components.timelineController.previousEvent();
                        break;
                        
                    case 'arrowright':
                        event.preventDefault();
                        visualizer.components.timelineController.nextEvent();
                        break;
                        
                    case 'home':
                        event.preventDefault();
                        visualizer.components.timelineController.jumpToStart();
                        break;
                        
                    case 'end':
                        event.preventDefault();
                        visualizer.components.timelineController.jumpToEnd();
                        break;
                        
                    case 'r':
                        if (event.ctrlKey || event.metaKey) {
                            event.preventDefault();
                            visualizer.reset();
                        }
                        break;
                        
                    case 'c':
                        if (event.ctrlKey || event.metaKey) {
                            event.preventDefault();
                            visualizer.resetCamera();
                        }
                        break;
                        
                    case 'f':
                        event.preventDefault();
                        visualizer.components.timelineController.jumpToLastFileScan();
                        break;
                        
                    case '1':
                        event.preventDefault();
                        visualizer.toggleSunburst();
                        break;
                        
                    case '2':
                        event.preventDefault();
                        visualizer.toggleGantt();
                        break;
                        
                    case '3':
                        event.preventDefault();
                        visualizer.toggleConnections();
                        break;
                        
                    case 'escape':
                        event.preventDefault();
                        visualizer.clearSelection();
                        break;
                }
            } catch (error) {
                console.error('Error handling keyboard shortcut:', error);
            }
        });
    }
    
    // Setup performance monitoring
    function setupPerformanceMonitoring() {
        let lastTime = performance.now();
        let frameCount = 0;
        let fps = 0;
        
        function updateFPS() {
            frameCount++;
            const currentTime = performance.now();
            
            if (currentTime - lastTime >= 1000) {
                fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
                frameCount = 0;
                lastTime = currentTime;
                
                // Update FPS display
                updateFPSDisplay(fps);
            }
            
            requestAnimationFrame(updateFPS);
        }
        
        function updateFPSDisplay(fps) {
            let fpsElement = document.getElementById('fps-counter');
            if (!fpsElement) {
                fpsElement = document.createElement('div');
                fpsElement.id = 'fps-counter';
                fpsElement.style.cssText = `
                    position: fixed;
                    top: 10px;
                    right: 10px;
                    background: rgba(0, 0, 0, 0.8);
                    color: white;
                    padding: 5px 10px;
                    border-radius: 4px;
                    font-family: monospace;
                    font-size: 12px;
                    z-index: 10000;
                `;
                document.body.appendChild(fpsElement);
            }
            
            fpsElement.textContent = `FPS: ${fps}`;
            
            // Color code based on performance
            if (fps >= 55) {
                fpsElement.style.color = '#4CAF50'; // Green
            } else if (fps >= 30) {
                fpsElement.style.color = '#FF9800'; // Orange
            } else {
                fpsElement.style.color = '#F44336'; // Red
            }
        }
        
        requestAnimationFrame(updateFPS);
    }
    
    // Show initialization error
    function showInitializationError(message) {
        const errorContainer = document.createElement('div');
        errorContainer.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #F44336;
            color: white;
            padding: 20px;
            border-radius: 8px;
            font-family: Arial, sans-serif;
            font-size: 16px;
            max-width: 400px;
            text-align: center;
            z-index: 10001;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        `;
        
        errorContainer.innerHTML = `
            <h3 style="margin: 0 0 10px 0;">Initialization Error</h3>
            <p style="margin: 0 0 15px 0;">${message}</p>
            <button onclick="location.reload()" style="
                background: white;
                color: #F44336;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
                font-weight: bold;
            ">Reload Page</button>
        `;
        
        document.body.appendChild(errorContainer);
    }
    
    // Cleanup function
    function cleanup() {
        if (visualizer) {
            console.log('Cleaning up application...');
            visualizer.dispose();
            visualizer = null;
        }
    }
    
    // Export cleanup function for potential use
    window.cleanupVisualizer = cleanup;
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeApplication);
    } else {
        // DOM is already ready
        initializeApplication();
    }
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', cleanup);
    
    // Expose initialization function globally for manual initialization
    window.initializeVisualizer = initializeApplication;
    
})();