// TimelineController - Manages timeline playback, navigation, and state
class TimelineController {
    constructor(dataManager, visualizationManager, uiManager, sceneManager) {
        this.dataManager = dataManager;
        this.visualizationManager = visualizationManager;
        this.uiManager = uiManager;
        this.sceneManager = sceneManager;
        
        // Timeline state
        this.currentEventIndex = 0;
        this.isPlaying = false;
        this.playInterval = null;
        this.playbackSpeed = 2000; // milliseconds
        
        // Configuration
        this.config = window.CONFIG || {};
        this.timelineConfig = this.config.TIMELINE || {};
        
        // Camera following
        this.cameraFollowMode = true;
        this.userCameraPosition = null;
        this.lastUserMove = 0;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.playbackSpeed = this.timelineConfig.PLAY_INTERVAL || 2000;
    }
    
    setupEventListeners() {
        // Listen for UI events
        document.addEventListener('timeline-changed', (e) => this.setCurrentEvent(e.detail.index));
        document.addEventListener('play-toggle', (e) => this.togglePlayback(e.detail.isPlaying));
        document.addEventListener('timeline-reset', () => this.reset());
        document.addEventListener('jump-to-filescan', () => this.jumpToLastFileScan());
        document.addEventListener('filescan-slider-changed', (e) => this.jumpToFileScanIndex(e.detail.index));
        
        // Listen for data events
        document.addEventListener('data-loaded', (e) => this.onDataLoaded(e.detail));
        
        // Listen for camera events
        document.addEventListener('reset-camera', () => this.resetCamera());
    }
    
    onDataLoaded(data) {
        this.initializeTimeline();
    }
    
    initializeTimeline() {
        const events = this.dataManager.getEvents();
        if (!events || events.length === 0) {
            console.warn('No events to initialize timeline');
            return;
        }
        
        // Start at the end to show all events
        this.currentEventIndex = events.length - 1;
        
        // Update UI
        this.uiManager.updateTimelineSlider(this.currentEventIndex, events.length - 1);
        
        // Update visualization
        this.updateVisualization();
        this.updateInfo();
        this.updateGanttChart();
        this.updateCameraPosition();
        
        // Update file scan slider
        const fileScanIndices = this.dataManager.getFileScanEventIndices();
        this.uiManager.updateFileScanSlider(fileScanIndices);
        
        console.log('Timeline initialized:', {
            totalEvents: events.length,
            currentIndex: this.currentEventIndex,
            fileScanEvents: fileScanIndices.length
        });
    }
    
    // Timeline navigation
    setCurrentEvent(index) {
        const events = this.dataManager.getEvents();
        if (!events || index < 0 || index >= events.length) {
            console.warn('Invalid event index:', index);
            return;
        }
        
        console.log(`Setting current event to index ${index}`);
        
        this.currentEventIndex = index;
        
        // Update UI
        this.uiManager.updateTimelineSlider(this.currentEventIndex, events.length - 1);
        
        // Update visualization
        this.updateVisualization();
        this.updateInfo();
        this.updateGanttChart();
        this.updateCameraPosition();
        
        // Dispatch event for other components
        this.dispatchEvent('timeline-event-changed', {
            index: this.currentEventIndex,
            event: events[this.currentEventIndex]
        });
    }
    
    nextEvent() {
        const events = this.dataManager.getEvents();
        if (this.currentEventIndex < events.length - 1) {
            this.setCurrentEvent(this.currentEventIndex + 1);
            return true;
        }
        return false;
    }
    
    previousEvent() {
        if (this.currentEventIndex > 0) {
            this.setCurrentEvent(this.currentEventIndex - 1);
            return true;
        }
        return false;
    }
    
    jumpToStart() {
        this.setCurrentEvent(0);
    }
    
    jumpToEnd() {
        const events = this.dataManager.getEvents();
        this.setCurrentEvent(events.length - 1);
    }
    
    jumpToLastFileScan() {
        const fileScanIndices = this.dataManager.getFileScanEventIndices();
        if (fileScanIndices.length > 0) {
            const lastFileScanIndex = fileScanIndices[fileScanIndices.length - 1];
            console.log(`Jumping to last file scan at index ${lastFileScanIndex}`);
            this.setCurrentEvent(lastFileScanIndex);
        } else {
            console.log('No file scan events found');
        }
    }
    
    jumpToFileScanIndex(fileScanIndex) {
        const fileScanIndices = this.dataManager.getFileScanEventIndices();
        if (fileScanIndex >= 0 && fileScanIndex < fileScanIndices.length) {
            const eventIndex = fileScanIndices[fileScanIndex];
            this.setCurrentEvent(eventIndex);
        }
    }
    
    // Playback control
    play() {
        if (this.isPlaying) return;
        
        this.isPlaying = true;
        this.uiManager.updatePlayButton(true);
        
        this.playInterval = setInterval(() => {
            if (!this.nextEvent()) {
                this.pause(); // Stop at end
            }
        }, this.playbackSpeed);
        
        console.log('Timeline playback started');
    }
    
    pause() {
        if (!this.isPlaying) return;
        
        this.isPlaying = false;
        this.uiManager.updatePlayButton(false);
        
        if (this.playInterval) {
            clearInterval(this.playInterval);
            this.playInterval = null;
        }
        
        console.log('Timeline playback paused');
    }
    
    togglePlayback(forceState = null) {
        const targetState = forceState !== null ? forceState : !this.isPlaying;
        
        if (targetState) {
            this.play();
        } else {
            this.pause();
        }
    }
    
    reset() {
        this.pause();
        this.setCurrentEvent(0);
        this.resetCamera();
        console.log('Timeline reset');
    }
    
    setPlaybackSpeed(speed) {
        this.playbackSpeed = Math.max(100, Math.min(10000, speed)); // Clamp between 100ms and 10s
        
        // If currently playing, restart with new speed
        if (this.isPlaying) {
            this.pause();
            this.play();
        }
    }
    
    // Visualization updates
    updateVisualization() {
        const events = this.dataManager.getEventsUpToIndex(this.currentEventIndex);
        this.visualizationManager.updateVisualization(events);
    }
    
    updateInfo() {
        const events = this.dataManager.getEvents();
        if (!events || events.length === 0) return;
        
        const currentEvent = events[this.currentEventIndex];
        const eventsUpToCurrent = this.dataManager.getEventsUpToIndex(this.currentEventIndex);
        
        // Calculate file count
        let totalFiles = 0;
        if (currentEvent.event_type === 'file_scan') {
            totalFiles = currentEvent.metadata.file_count || 0;
        } else {
            // Get file count from most recent file scan
            for (let i = this.currentEventIndex; i >= 0; i--) {
                const event = events[i];
                if (event.event_type === 'file_scan') {
                    totalFiles = event.metadata.file_count || 0;
                    break;
                }
            }
        }
        
        // Calculate active milestones
        const activeMilestones = eventsUpToCurrent
            .filter(e => e.event_type === 'milestone').length;
        
        // Get correlations count
        const correlationsCount = this.dataManager.getCorrelations().length;
        
        const infoData = {
            currentIndex: this.currentEventIndex,
            totalEvents: events.length,
            currentDate: new Date(currentEvent.timestamp * 1000).toLocaleDateString(),
            eventType: currentEvent.event_type.replace('_', ' ').toUpperCase(),
            totalFiles: totalFiles,
            activeMilestones: activeMilestones,
            correlationsCount: correlationsCount
        };
        
        this.uiManager.updateInfo(infoData);
    }
    
    updateGanttChart() {
        const eventsUpToCurrent = this.dataManager.getEventsUpToIndex(this.currentEventIndex);
        const milestoneEvents = eventsUpToCurrent.filter(e => e.event_type === 'milestone');
        this.uiManager.updateGanttChart(milestoneEvents);
    }
    
    // Camera management
    updateCameraPosition() {
        if (!this.cameraFollowMode) return;
        
        const events = this.dataManager.getEvents();
        if (!events || this.currentEventIndex < 0) return;
        
        // Check if user has moved camera recently
        const timeSinceUserMove = Date.now() - this.lastUserMove;
        if (timeSinceUserMove < 5000) { // 5 seconds
            return; // Don't interfere with user camera control
        }
        
        const eventsUpToCurrent = this.dataManager.getEventsUpToIndex(this.currentEventIndex);
        const milestoneEvents = eventsUpToCurrent.filter(e => e.event_type === 'milestone');
        const fileScanEvents = eventsUpToCurrent.filter(e => e.event_type === 'file_scan');
        
        let targetY = 0;
        const currentEvent = events[this.currentEventIndex];
        const cameraYSpacing = this.timelineConfig.CAMERA_Y_SPACING || 12;
        const cameraOffset = this.timelineConfig.CAMERA_FOLLOW_OFFSET || 30;
        
        if (currentEvent.event_type === 'milestone' && milestoneEvents.length > 0) {
            const milestoneIndex = milestoneEvents.length - 1;
            targetY = milestoneIndex * cameraYSpacing;
        } else if (currentEvent.event_type === 'file_scan' && fileScanEvents.length > 0) {
            const fileScanIndex = fileScanEvents.length - 1;
            targetY = fileScanIndex * cameraYSpacing;
        } else if (milestoneEvents.length > 0) {
            const milestoneIndex = milestoneEvents.length - 1;
            targetY = milestoneIndex * cameraYSpacing;
        } else if (fileScanEvents.length > 0) {
            const fileScanIndex = fileScanEvents.length - 1;
            targetY = fileScanIndex * cameraYSpacing;
        }
        
        // Smoothly move camera
        this.animateCameraToPosition(targetY + cameraOffset, targetY);
    }
    
    animateCameraToPosition(cameraY, targetY, duration = 1000) {
        const camera = this.sceneManager.getCamera();
        const controls = this.sceneManager.getControls();
        
        if (!camera || !controls) return;
        
        const startCameraPos = camera.position.clone();
        const startTarget = controls.target.clone();
        
        const targetCameraPos = new THREE.Vector3(2.5, cameraY, 80);
        const targetControlsTarget = new THREE.Vector3(2.5, targetY, 0);
        
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function
            const eased = progress < 0.5 
                ? 2 * progress * progress 
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;
            
            // Interpolate camera position
            camera.position.lerpVectors(startCameraPos, targetCameraPos, eased);
            controls.target.lerpVectors(startTarget, targetControlsTarget, eased);
            
            camera.lookAt(controls.target);
            controls.update();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }
    
    resetCamera() {
        this.userCameraPosition = null;
        this.lastUserMove = 0;
        this.sceneManager.resetCamera();
        
        // Update camera position based on current event
        setTimeout(() => this.updateCameraPosition(), 100);
    }
    
    setCameraFollowMode(enabled) {
        this.cameraFollowMode = enabled;
        if (enabled) {
            this.updateCameraPosition();
        }
    }
    
    // Event filtering and search
    findEventsByType(eventType) {
        return this.dataManager.filterEventsByType(eventType);
    }
    
    findEventsByDateRange(startTime, endTime) {
        return this.dataManager.filterEventsByDateRange(startTime, endTime);
    }
    
    searchEvents(query) {
        return this.dataManager.searchEvents(query);
    }
    
    // Timeline statistics
    getTimelineStatistics() {
        const stats = this.dataManager.getDataStatistics();
        if (!stats) return null;
        
        return {
            ...stats,
            currentEvent: this.currentEventIndex,
            progressPercentage: ((this.currentEventIndex + 1) / stats.totalEvents) * 100,
            playbackSpeed: this.playbackSpeed,
            isPlaying: this.isPlaying,
            cameraFollowMode: this.cameraFollowMode
        };
    }
    
    // Bookmarks and markers
    createBookmark(name = null) {
        const events = this.dataManager.getEvents();
        const currentEvent = events[this.currentEventIndex];
        
        const bookmark = {
            id: Date.now().toString(),
            name: name || `Bookmark ${this.currentEventIndex + 1}`,
            eventIndex: this.currentEventIndex,
            timestamp: currentEvent.timestamp,
            eventType: currentEvent.event_type,
            created: Date.now()
        };
        
        // Store bookmark (you might want to use localStorage or another persistence method)
        this.dispatchEvent('bookmark-created', { bookmark });
        
        return bookmark;
    }
    
    jumpToBookmark(bookmark) {
        if (bookmark && typeof bookmark.eventIndex === 'number') {
            this.setCurrentEvent(bookmark.eventIndex);
        }
    }
    
    // Export and import
    exportTimelineState() {
        return {
            currentEventIndex: this.currentEventIndex,
            playbackSpeed: this.playbackSpeed,
            cameraFollowMode: this.cameraFollowMode,
            timestamp: Date.now()
        };
    }
    
    importTimelineState(state) {
        if (state.currentEventIndex !== undefined) {
            this.setCurrentEvent(state.currentEventIndex);
        }
        if (state.playbackSpeed !== undefined) {
            this.setPlaybackSpeed(state.playbackSpeed);
        }
        if (state.cameraFollowMode !== undefined) {
            this.setCameraFollowMode(state.cameraFollowMode);
        }
    }
    
    // Event dispatching
    dispatchEvent(eventName, detail = {}) {
        const event = new CustomEvent(eventName, { detail });
        document.dispatchEvent(event);
    }
    
    // Getters
    getCurrentEventIndex() {
        return this.currentEventIndex;
    }
    
    getCurrentEvent() {
        const events = this.dataManager.getEvents();
        return events[this.currentEventIndex];
    }
    
    getIsPlaying() {
        return this.isPlaying;
    }
    
    getPlaybackSpeed() {
        return this.playbackSpeed;
    }
    
    getCameraFollowMode() {
        return this.cameraFollowMode;
    }
    
    // Cleanup
    dispose() {
        this.pause();
        
        // Remove event listeners
        document.removeEventListener('timeline-changed', this.setCurrentEvent);
        document.removeEventListener('play-toggle', this.togglePlayback);
        document.removeEventListener('timeline-reset', this.reset);
        document.removeEventListener('jump-to-filescan', this.jumpToLastFileScan);
        document.removeEventListener('filescan-slider-changed', this.jumpToFileScanIndex);
        document.removeEventListener('data-loaded', this.onDataLoaded);
        document.removeEventListener('reset-camera', this.resetCamera);
        
        // Clear intervals
        if (this.playInterval) {
            clearInterval(this.playInterval);
            this.playInterval = null;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TimelineController;
} else if (typeof window !== 'undefined') {
    window.TimelineController = TimelineController;
}