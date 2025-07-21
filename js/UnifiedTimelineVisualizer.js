// UnifiedTimelineVisualizer - Main orchestrator class that coordinates all components
class UnifiedTimelineVisualizer {
    constructor() {
        this.initialized = false;
        this.components = {};
        
        // Configuration
        this.config = window.CONFIG || {};
        this.colors = window.COLORS || {};
        this.settings = window.SETTINGS || {};
        
        this.init();
    }
    
    async init() {
        try {
            console.log('Initializing Unified Timeline Visualizer...');
            
            // Initialize core components in order
            await this.initializeComponents();
            
            // Setup inter-component communication
            this.setupComponentCommunication();
            
            // Load initial data
            await this.loadInitialData();
            
            // Show the interface
            this.showInterface();
            
            this.initialized = true;
            console.log('Unified Timeline Visualizer initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize visualizer:', error);
            this.showError(error.message);
        }
    }
    
    async initializeComponents() {
        // 1. Scene Manager - Three.js setup
        console.log('Initializing Scene Manager...');
        this.components.sceneManager = new SceneManager('threejs-container');
        
        // 2. UI Manager - DOM interactions
        console.log('Initializing UI Manager...');
        this.components.uiManager = new UIManager();
        
        // 3. Data Manager - Data loading and processing
        console.log('Initializing Data Manager...');
        this.components.dataManager = new DataManager();
        
        // 4. Visualization Manager - Rendering logic
        console.log('Initializing Visualization Manager...');
        this.components.visualizationManager = new VisualizationManager(
            this.components.sceneManager
        );
        
        // 5. Interaction Manager - Mouse and touch handling
        console.log('Initializing Interaction Manager...');
        this.components.interactionManager = new InteractionManager(
            this.components.sceneManager,
            this.components.visualizationManager,
            this.components.uiManager
        );
        
        // 6. Timeline Controller - Timeline management
        console.log('Initializing Timeline Controller...');
        this.components.timelineController = new TimelineController(
            this.components.dataManager,
            this.components.visualizationManager,
            this.components.uiManager,
            this.components.sceneManager
        );
        
        console.log('All components initialized successfully');
    }
    
    setupComponentCommunication() {
        console.log('Setting up component communication...');
        
        // Listen for data events
        document.addEventListener('data-loaded', (e) => this.onDataLoaded(e.detail));
        document.addEventListener('data-load-error', (e) => this.onDataLoadError(e.detail));
        
        // Listen for file selection events
        document.addEventListener('file-selected', (e) => this.onFileSelected(e.detail));
        
        // Listen for visualization events
        document.addEventListener('sunburst-setting-changed', (e) => this.onSunburstSettingChanged(e.detail));
        document.addEventListener('toggle-sunburst', () => this.toggleSunburst());
        document.addEventListener('toggle-gantt', () => this.toggleGantt());
        document.addEventListener('toggle-connections', () => this.toggleConnections());
        
        // Listen for command generation events
        document.addEventListener('generate-command', (e) => this.onGenerateCommand(e.detail));
        
        // Listen for milestone events
        document.addEventListener('milestone-select-changed', () => this.onMilestoneSelectChanged());
        document.addEventListener('milestone-color-changed', (e) => this.onMilestoneColorChanged(e.detail));
        document.addEventListener('milestone-clicked', (e) => this.onMilestoneClicked(e.detail));
        
        // Listen for interaction events
        document.addEventListener('node-clicked', (e) => this.onNodeClicked(e.detail));
        
        console.log('Component communication setup complete');
    }
    
    async loadInitialData() {
        console.log('Loading initial data...');
        this.components.uiManager.showLoading('Loading unified timeline data...');
        
        try {
            await this.components.dataManager.loadData();
        } catch (error) {
            console.warn('Failed to load initial data, will show sample data:', error);
            // DataManager will handle fallback to sample data
        }
    }
    
    showInterface() {
        this.components.uiManager.hideLoading();
        this.components.uiManager.showAllPanels();
        this.updateLegend();
    }
    
    showError(message) {
        this.components.uiManager.showError(message);
    }
    
    // Event handlers
    onDataLoaded(detail) {
        console.log('Data loaded:', detail.filename);
        this.components.uiManager.updateCurrentDbFile(detail.filename);
        this.components.uiManager.hideFileError();
        this.updateMilestoneDropdown();
        this.updateLegend();
    }
    
    onDataLoadError(detail) {
        console.error('Data load error:', detail.error);
        this.components.uiManager.showFileError(detail.error);
    }
    
    async onFileSelected(detail) {
        console.log('File selected:', detail.file.name);
        this.components.uiManager.showLoading('Loading custom file...');
        
        try {
            await this.components.dataManager.loadCustomFile(detail.file);
            this.components.uiManager.hideLoading();
        } catch (error) {
            console.error('Failed to load custom file:', error);
            this.components.uiManager.showFileError(error.message);
            this.components.uiManager.hideLoading();
        }
    }
    
    onSunburstSettingChanged(detail) {
        console.log('Sunburst setting changed:', detail);
        this.components.visualizationManager.updateSunburstSettings(detail);
        
        // Trigger visualization update
        const currentEvents = this.getCurrentEvents();
        this.components.visualizationManager.updateVisualization(currentEvents);
    }
    
    toggleSunburst() {
        const newState = this.components.visualizationManager.toggleSunburst();
        const button = document.getElementById('toggle-sunburst');
        if (button) {
            button.textContent = newState ? 'Hide Sunburst' : 'Show Sunburst';
        }
    }
    
    toggleGantt() {
        const newState = this.components.visualizationManager.toggleGantt();
        const button = document.getElementById('toggle-gantt');
        if (button) {
            button.textContent = newState ? 'Hide Gantt' : 'Show Gantt';
        }
    }
    
    toggleConnections() {
        const newState = this.components.visualizationManager.toggleConnections();
        const button = document.getElementById('toggle-connections');
        if (button) {
            button.textContent = newState ? 'Hide Connections' : 'Show Connections';
        }
    }
    
    onGenerateCommand(detail) {
        const command = this.components.dataManager.generateBackendCommand(
            detail.scanDir,
            detail.emailDir,
            detail.docsDir
        );
        this.components.uiManager.displayGeneratedCommand(command);
    }
    
    onMilestoneSelectChanged() {
        const milestoneEvents = this.components.dataManager.getMilestoneEvents();
        this.components.uiManager.updateColorPickers(milestoneEvents);
    }
    
    onMilestoneColorChanged(detail) {
        const milestoneEvents = this.components.dataManager.getMilestoneEvents();
        const milestone = milestoneEvents[detail.milestoneIndex];
        
        if (milestone && milestone.metadata) {
            milestone.metadata.intended_color = detail.intendedColor;
            milestone.metadata.actual_color = detail.actualColor;
            
            // Trigger visualization update
            const currentEvents = this.getCurrentEvents();
            this.components.visualizationManager.updateVisualization(currentEvents);
        }
    }
    
    onMilestoneClicked(detail) {
        console.log('Milestone clicked:', detail);
        // Could implement milestone focus, editing, etc.
        this.components.interactionManager.focusOnObject(detail.event);
    }
    
    onNodeClicked(detail) {
        console.log('Node clicked:', detail.node);
        // Show details for the clicked node
        this.components.interactionManager.showNodeDetails(detail.node);
    }
    
    // Helper methods
    getCurrentEvents() {
        const currentIndex = this.components.timelineController.getCurrentEventIndex();
        return this.components.dataManager.getEventsUpToIndex(currentIndex);
    }
    
    updateMilestoneDropdown() {
        const milestoneEvents = this.components.dataManager.getMilestoneEvents();
        this.components.uiManager.updateMilestoneDropdown(milestoneEvents);
    }
    
    updateLegend() {
        const categories = this.colors.LEGEND_CATEGORIES || {
            'Programming': ['text/javascript', 'text/x-python', 'text/html', 'text/css', 'application/json', 'text/markdown'],
            'Documents': ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
                         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-outlook'],
            'Media': ['image/', 'video/', 'audio/'],
            'Other': ['text/', 'folder', 'default']
        };
        
        this.components.uiManager.updateLegend(categories);
    }
    
    // Public API methods
    
    // Data methods
    async loadData(filename = null) {
        return await this.components.dataManager.loadData(filename);
    }
    
    async loadCustomFile(file) {
        return await this.components.dataManager.loadCustomFile(file);
    }
    
    getData() {
        return this.components.dataManager.getData();
    }
    
    getDataStatistics() {
        return this.components.dataManager.getDataStatistics();
    }
    
    // Timeline methods
    play() {
        this.components.timelineController.play();
    }
    
    pause() {
        this.components.timelineController.pause();
    }
    
    reset() {
        this.components.timelineController.reset();
    }
    
    setCurrentEvent(index) {
        this.components.timelineController.setCurrentEvent(index);
    }
    
    getCurrentEventIndex() {
        return this.components.timelineController.getCurrentEventIndex();
    }
    
    getCurrentEvent() {
        return this.components.timelineController.getCurrentEvent();
    }
    
    setPlaybackSpeed(speed) {
        this.components.timelineController.setPlaybackSpeed(speed);
    }
    
    // Visualization methods
    updateVisualization() {
        const currentEvents = this.getCurrentEvents();
        this.components.visualizationManager.updateVisualization(currentEvents);
    }
    
    setSunburstSettings(settings) {
        this.components.visualizationManager.updateSunburstSettings(settings);
        this.updateVisualization();
    }
    
    // Camera methods
    resetCamera() {
        this.components.sceneManager.resetCamera();
    }
    
    setCameraPosition(x, y, z) {
        this.components.sceneManager.setCameraPosition(x, y, z);
    }
    
    setCameraTarget(x, y, z) {
        this.components.sceneManager.setCameraTarget(x, y, z);
    }
    
    /**
     * Center the camera on the main visualization (sunburst or gantt)
     */
    centerCameraOnVisualization() {
        this.components.visualizationManager.centerCameraOnVisualization();
    }
    
    // Interaction methods
    clearSelection() {
        this.components.interactionManager.clearSelection();
    }
    
    selectObject(object) {
        this.components.interactionManager.selectObject(object);
    }
    
    findObjectsByName(name) {
        return this.components.interactionManager.findObjectsByName(name);
    }
    
    // Search methods
    searchEvents(query) {
        return this.components.dataManager.searchEvents(query);
    }
    
    findEventsByType(eventType) {
        return this.components.dataManager.filterEventsByType(eventType);
    }
    
    findEventsByDateRange(startTime, endTime) {
        return this.components.dataManager.filterEventsByDateRange(startTime, endTime);
    }
    
    // Export methods
    exportTimelineState() {
        return this.components.timelineController.exportTimelineState();
    }
    
    importTimelineState(state) {
        this.components.timelineController.importTimelineState(state);
    }
    
    // Settings methods
    getSettings() {
        return {
            sunburst: {
                minAngleDeg: this.components.visualizationManager.minAngleDeg,
                ringThickness: this.components.visualizationManager.ringThickness
            },
            timeline: {
                playbackSpeed: this.components.timelineController.getPlaybackSpeed(),
                cameraFollowMode: this.components.timelineController.getCameraFollowMode()
            },
            visibility: {
                showSunburst: this.components.visualizationManager.showSunburst,
                showGantt: this.components.visualizationManager.showGantt,
                showConnections: this.components.visualizationManager.showConnections
            }
        };
    }
    
    applySettings(settings) {
        if (settings.sunburst) {
            this.setSunburstSettings(settings.sunburst);
        }
        
        if (settings.timeline) {
            if (settings.timeline.playbackSpeed) {
                this.setPlaybackSpeed(settings.timeline.playbackSpeed);
            }
            if (settings.timeline.cameraFollowMode !== undefined) {
                this.components.timelineController.setCameraFollowMode(settings.timeline.cameraFollowMode);
            }
        }
        
        if (settings.visibility) {
            if (settings.visibility.showSunburst !== undefined) {
                this.components.visualizationManager.showSunburst = settings.visibility.showSunburst;
                this.components.visualizationManager.sunburstGroup.visible = settings.visibility.showSunburst;
            }
            if (settings.visibility.showGantt !== undefined) {
                this.components.visualizationManager.showGantt = settings.visibility.showGantt;
                this.components.visualizationManager.ganttGroup.visible = settings.visibility.showGantt;
            }
            if (settings.visibility.showConnections !== undefined) {
                this.components.visualizationManager.showConnections = settings.visibility.showConnections;
                this.components.visualizationManager.connectionGroup.visible = settings.visibility.showConnections;
            }
        }
    }
    
    // Debug methods
    getComponentInfo() {
        return {
            initialized: this.initialized,
            components: Object.keys(this.components),
            dataLoaded: !!this.components.dataManager?.getData(),
            eventCount: this.components.dataManager?.getTotalEventsCount() || 0,
            currentEventIndex: this.components.timelineController?.getCurrentEventIndex() || 0
        };
    }
    
    // Cleanup
    dispose() {
        console.log('Disposing Unified Timeline Visualizer...');
        
        // Dispose components in reverse order
        if (this.components.timelineController) {
            this.components.timelineController.dispose();
        }
        
        if (this.components.interactionManager) {
            this.components.interactionManager.dispose();
        }
        
        if (this.components.visualizationManager) {
            this.components.visualizationManager.dispose();
        }
        
        if (this.components.dataManager) {
            this.components.dataManager.dispose();
        }
        
        if (this.components.uiManager) {
            this.components.uiManager.dispose();
        }
        
        if (this.components.sceneManager) {
            this.components.sceneManager.dispose();
        }
        
        this.components = {};
        this.initialized = false;
        
        console.log('Unified Timeline Visualizer disposed');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UnifiedTimelineVisualizer;
} else if (typeof window !== 'undefined') {
    window.UnifiedTimelineVisualizer = UnifiedTimelineVisualizer;
}