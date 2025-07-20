// UIManager - Handles DOM interactions, event handling, and panel management
class UIManager {
    constructor() {
        this.eventListeners = new Map();
        this.panels = new Map();
        this.controls = new Map();
        this.isInitialized = false;
        
        // Configuration
        this.config = window.CONFIG || {};
        this.colors = window.COLORS || {};
        this.settings = window.SETTINGS || {};
        
        // UI state
        this.currentEventIndex = 0;
        this.totalEvents = 0;
        this.isPlaying = false;
        this.playInterval = null;
        this.fileScanEventIndices = [];
        
        this.init();
    }
    
    init() {
        this.initializePanels();
        this.setupEventListeners();
        this.setupControls();
        this.isInitialized = true;
    }
    
    initializePanels() {
        // Map panel elements
        this.panels.set('loading', document.getElementById('loading'));
        this.panels.set('control', document.getElementById('control-panel'));
        this.panels.set('info', document.getElementById('info-panel'));
        this.panels.set('gantt', document.getElementById('gantt-panel'));
        this.panels.set('legend', document.getElementById('legend'));
        this.panels.set('zAxis', document.getElementById('z-axis-indicator'));
        this.panels.set('details', document.getElementById('details-panel'));
        this.panels.set('fileScanSlider', document.getElementById('file-scan-slider-container'));
        
        // Initially hide all panels except loading
        this.panels.forEach((panel, key) => {
            if (panel && key !== 'loading') {
                panel.classList.add('hidden');
            }
        });
    }
    
    setupEventListeners() {
        // Timeline controls
        this.addEventListeners('timeline-slider', 'input', (e) => this.onTimelineSliderChange(e));
        this.addEventListeners('play-btn', 'click', () => this.onPlayClick());
        this.addEventListeners('pause-btn', 'click', () => this.onPauseClick());
        this.addEventListeners('reset-btn', 'click', () => this.onResetClick());
        this.addEventListeners('jump-to-filescan-btn', 'click', () => this.onJumpToFileScanClick());
        
        // Sunburst controls
        this.addEventListeners('min-angle-slider', 'input', (e) => this.onMinAngleChange(e));
        this.addEventListeners('ring-thickness-slider', 'input', (e) => this.onRingThicknessChange(e));
        
        // View controls
        this.addEventListeners('toggle-sunburst', 'click', () => this.onToggleSunburst());
        this.addEventListeners('toggle-gantt', 'click', () => this.onToggleGantt());
        this.addEventListeners('toggle-connections', 'click', () => this.onToggleConnections());
        this.addEventListeners('reset-camera', 'click', () => this.onResetCamera());
        
        // File input
        this.addEventListeners('db-file-input', 'change', (e) => this.onFileInputChange(e));
        
        // Command generation
        this.addEventListeners('generate-cmd-btn', 'click', () => this.onGenerateCommand());
        
        // Milestone color controls
        this.addEventListeners('milestone-select', 'change', () => this.onMilestoneSelectChange());
        this.addEventListeners('intended-color-picker', 'input', () => this.onColorPickerChange());
        this.addEventListeners('actual-color-picker', 'input', () => this.onColorPickerChange());
        
        // File scan slider
        this.addEventListeners('fileScanSlider', 'input', (e) => this.onFileScanSliderChange(e));
    }
    
    addEventListeners(elementId, eventType, handler) {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener(eventType, handler);
            
            // Store for cleanup
            if (!this.eventListeners.has(elementId)) {
                this.eventListeners.set(elementId, []);
            }
            this.eventListeners.get(elementId).push({ eventType, handler });
        }
    }
    
    setupControls() {
        // Initialize slider values
        this.updateSliderValue('min-angle-slider', 'min-angle-value', 2);
        this.updateSliderValue('ring-thickness-slider', 'ring-thickness-value', 6);
        
        // Initialize file scan slider
        this.setupFileScanSlider();
    }
    
    setupFileScanSlider() {
        const slider = document.getElementById('fileScanSlider');
        const container = this.panels.get('fileScanSlider');
        const valueSpan = document.getElementById('fileScanSliderValue');
        
        if (slider && container && valueSpan) {
            slider.max = '0';
            slider.value = '0';
            valueSpan.textContent = '1';
            container.style.display = 'none';
        }
    }
    
    updateSliderValue(sliderId, valueId, value) {
        const slider = document.getElementById(sliderId);
        const valueSpan = document.getElementById(valueId);
        
        if (slider) slider.value = value;
        if (valueSpan) valueSpan.textContent = value;
    }
    
    // Event handlers
    onTimelineSliderChange(event) {
        const index = parseInt(event.target.value);
        this.currentEventIndex = index;
        this.dispatchCustomEvent('timeline-changed', { index });
    }
    
    onPlayClick() {
        this.isPlaying = !this.isPlaying;
        this.dispatchCustomEvent('play-toggle', { isPlaying: this.isPlaying });
    }
    
    onPauseClick() {
        this.isPlaying = false;
        this.dispatchCustomEvent('play-toggle', { isPlaying: false });
    }
    
    onResetClick() {
        this.isPlaying = false;
        this.currentEventIndex = 0;
        this.dispatchCustomEvent('timeline-reset');
    }
    
    onJumpToFileScanClick() {
        this.dispatchCustomEvent('jump-to-filescan');
    }
    
    onMinAngleChange(event) {
        const value = parseInt(event.target.value);
        this.updateSliderValue('min-angle-slider', 'min-angle-value', value);
        this.dispatchCustomEvent('sunburst-setting-changed', { minAngle: value });
    }
    
    onRingThicknessChange(event) {
        const value = parseInt(event.target.value);
        this.updateSliderValue('ring-thickness-slider', 'ring-thickness-value', value);
        this.dispatchCustomEvent('sunburst-setting-changed', { ringThickness: value });
    }
    
    onToggleSunburst() {
        this.dispatchCustomEvent('toggle-sunburst');
    }
    
    onToggleGantt() {
        this.dispatchCustomEvent('toggle-gantt');
    }
    
    onToggleConnections() {
        this.dispatchCustomEvent('toggle-connections');
    }
    
    onResetCamera() {
        this.dispatchCustomEvent('reset-camera');
    }
    
    onFileInputChange(event) {
        const file = event.target.files[0];
        if (file) {
            this.dispatchCustomEvent('file-selected', { file });
        }
    }
    
    onGenerateCommand() {
        const scanDir = this.getInputValue('scan-dir-input');
        const emailDir = this.getInputValue('email-dir-input');
        const docsDir = this.getInputValue('docs-dir-input');
        
        this.dispatchCustomEvent('generate-command', { scanDir, emailDir, docsDir });
    }
    
    onMilestoneSelectChange() {
        this.dispatchCustomEvent('milestone-select-changed');
    }
    
    onColorPickerChange() {
        const intendedColor = this.getInputValue('intended-color-picker');
        const actualColor = this.getInputValue('actual-color-picker');
        const milestoneIndex = parseInt(this.getInputValue('milestone-select') || '0');
        
        this.dispatchCustomEvent('milestone-color-changed', { 
            intendedColor, 
            actualColor, 
            milestoneIndex 
        });
    }
    
    onFileScanSliderChange(event) {
        const index = parseInt(event.target.value);
        const valueSpan = document.getElementById('fileScanSliderValue');
        if (valueSpan) {
            valueSpan.textContent = (index + 1).toString();
        }
        
        this.dispatchCustomEvent('filescan-slider-changed', { index });
    }
    
    // Utility methods
    getInputValue(elementId) {
        const element = document.getElementById(elementId);
        return element ? element.value.trim() : '';
    }
    
    setInputValue(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.value = value;
        }
    }
    
    dispatchCustomEvent(eventName, detail = {}) {
        const event = new CustomEvent(eventName, { detail });
        document.dispatchEvent(event);
    }
    
    // Panel management
    showPanel(panelKey) {
        const panel = this.panels.get(panelKey);
        if (panel) {
            panel.classList.remove('hidden');
        }
    }
    
    hidePanel(panelKey) {
        const panel = this.panels.get(panelKey);
        if (panel) {
            panel.classList.add('hidden');
        }
    }
    
    showAllPanels() {
        this.panels.forEach((panel, key) => {
            if (panel && key !== 'loading') {
                panel.classList.remove('hidden');
            }
        });
    }
    
    hideLoading() {
        this.hidePanel('loading');
    }
    
    showLoading(message = 'Loading...') {
        const loadingPanel = this.panels.get('loading');
        if (loadingPanel) {
            const messageElement = loadingPanel.querySelector('div:not(.loading-spinner)');
            if (messageElement) {
                messageElement.textContent = message;
            }
            loadingPanel.classList.remove('hidden');
        }
    }
    
    showError(message) {
        const loadingPanel = this.panels.get('loading');
        if (loadingPanel) {
            loadingPanel.innerHTML = `<div class="error">Error: ${message}</div>`;
            loadingPanel.classList.remove('hidden');
        }
    }
    
    // Info panel updates
    updateInfo(data) {
        this.updateElement('current-event', `${data.currentIndex + 1} of ${data.totalEvents}`);
        this.updateElement('current-date', data.currentDate);
        this.updateElement('event-type', data.eventType);
        this.updateElement('total-files', data.totalFiles);
        this.updateElement('active-milestones', data.activeMilestones);
        this.updateElement('correlations-count', data.correlationsCount);
    }
    
    updateElement(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    }
    
    // Timeline controls
    updateTimelineSlider(currentIndex, maxIndex) {
        const slider = document.getElementById('timeline-slider');
        if (slider) {
            slider.max = maxIndex;
            slider.value = currentIndex;
        }
        
        this.currentEventIndex = currentIndex;
        this.totalEvents = maxIndex + 1;
    }
    
    updatePlayButton(isPlaying) {
        const playBtn = document.getElementById('play-btn');
        if (playBtn) {
            if (isPlaying) {
                playBtn.classList.add('active');
                playBtn.textContent = '⏸ Playing';
            } else {
                playBtn.classList.remove('active');
                playBtn.textContent = '▶ Play';
            }
        }
        
        this.isPlaying = isPlaying;
    }
    
    // File scan slider
    updateFileScanSlider(fileScanIndices) {
        this.fileScanEventIndices = fileScanIndices;
        const slider = document.getElementById('fileScanSlider');
        const container = this.panels.get('fileScanSlider');
        const valueSpan = document.getElementById('fileScanSliderValue');
        
        if (fileScanIndices.length > 0 && slider && container && valueSpan) {
            slider.max = fileScanIndices.length - 1;
            slider.value = 0;
            valueSpan.textContent = '1';
            container.style.display = 'block';
        } else if (container) {
            container.style.display = 'none';
        }
    }
    
    // Gantt chart
    updateGanttChart(milestoneEvents) {
        const ganttList = document.getElementById('gantt-list');
        if (!ganttList) return;
        
        ganttList.innerHTML = '';
        
        milestoneEvents.forEach((event, index) => {
            const milestone = event.metadata;
            const item = document.createElement('div');
            item.className = `gantt-item ${milestone.category}`;
            
            item.innerHTML = `
                <div class="gantt-title">${milestone.title}</div>
                <div class="gantt-meta">
                    <span>${milestone.priority?.toUpperCase() || 'NORMAL'}</span>
                    <span>${milestone.confidence?.toFixed(1) || '0.0'}</span>
                </div>
            `;
            
            item.addEventListener('click', () => {
                this.dispatchCustomEvent('milestone-clicked', { event, index });
            });
            
            ganttList.appendChild(item);
        });
    }
    
    // Milestone color controls
    updateMilestoneDropdown(milestoneEvents) {
        const select = document.getElementById('milestone-select');
        if (!select) return;
        
        select.innerHTML = '';
        milestoneEvents.forEach((event, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = event.metadata.title || `Milestone ${index + 1}`;
            select.appendChild(option);
        });
        
        this.updateColorPickers(milestoneEvents);
    }
    
    updateColorPickers(milestoneEvents) {
        const select = document.getElementById('milestone-select');
        const intendedPicker = document.getElementById('intended-color-picker');
        const actualPicker = document.getElementById('actual-color-picker');
        
        if (!select || !intendedPicker || !actualPicker) return;
        
        const index = parseInt(select.value || '0');
        const milestone = milestoneEvents[index]?.metadata;
        
        if (milestone) {
            intendedPicker.value = milestone.intended_color || '#ff00ff';
            actualPicker.value = milestone.actual_color || '#ff00ff';
        }
    }
    
    // Command generation
    displayGeneratedCommand(command) {
        const outputArea = document.getElementById('generated-cmd-output');
        if (outputArea) {
            outputArea.value = command;
            outputArea.style.display = 'block';
        }
    }
    
    // File handling
    updateCurrentDbFile(filename) {
        this.updateElement('current-db-file', filename);
    }
    
    showFileError(message) {
        const errorElement = document.getElementById('db-file-error');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }
    
    hideFileError() {
        const errorElement = document.getElementById('db-file-error');
        if (errorElement) {
            errorElement.style.display = 'none';
        }
    }
    
    // Legend
    updateLegend(categories) {
        const legendContent = document.getElementById('legend-content');
        if (!legendContent) return;
        
        let html = '';
        for (const [category, types] of Object.entries(categories)) {
            html += `<div class="legend-category">${category}</div>`;
            types.forEach(type => {
                const color = this.colors.FILE_TYPES?.[type] || '#bdc3c7';
                const label = this.formatLegendLabel(type);
                html += `
                    <div class="legend-item">
                        <div class="color-box" style="background-color: ${color};"></div>
                        <span>${label}</span>
                    </div>
                `;
            });
        }
        legendContent.innerHTML = html;
    }
    
    formatLegendLabel(type) {
        return type.split('/').pop()
            .replace('application/vnd.', '')
            .replace('openxmlformats-officedocument.', '')
            .replace('wordprocessingml.document', 'Word')
            .replace('spreadsheetml.sheet', 'Excel')
            .replace('ms-outlook', 'Outlook')
            .replace('x-python', 'Python')
            .replace('javascript', 'JavaScript')
            .replace('html', 'HTML')
            .replace('css', 'CSS')
            .replace('json', 'JSON')
            .replace('markdown', 'Markdown')
            .replace('pdf', 'PDF')
            .replace('image', 'Images')
            .replace('video', 'Video')
            .replace('audio', 'Audio')
            .replace('text', 'Text Files')
            .replace('folder', 'Folders')
            .replace('default', 'Other Files');
    }
    
    // Details panel
    showDetailsPanel(title, content, x, y) {
        const panel = this.panels.get('details');
        const titleElement = document.getElementById('details-title');
        const contentElement = document.getElementById('details-content');
        
        if (panel && titleElement && contentElement) {
            titleElement.textContent = title;
            contentElement.innerHTML = content;
            
            if (typeof x === 'number' && typeof y === 'number') {
                panel.style.left = `${Math.min(x + 20, window.innerWidth - 320)}px`;
                panel.style.top = `${Math.min(y + 20, window.innerHeight - 200)}px`;
            }
            
            panel.style.opacity = '1';
        }
    }
    
    hideDetailsPanel() {
        const panel = this.panels.get('details');
        if (panel) {
            panel.style.opacity = '0';
        }
    }
    
    // Update hover info panel
    updateHoverInfo(content) {
        const hoverInfo = document.getElementById('hover-info');
        if (hoverInfo) {
            hoverInfo.innerHTML = content;
        } else {
            console.error('hover-info element not found!');
        }
    }
    
    // Clear hover info panel
    clearHoverInfo() {
        const hoverInfo = document.getElementById('hover-info');
        if (hoverInfo) {
            hoverInfo.innerHTML = '<p style="opacity: 0.6; font-size: 12px;"><em>Hover over elements for details</em></p>';
        }
    }
    
    // Cleanup
    dispose() {
        // Remove event listeners
        this.eventListeners.forEach((listeners, elementId) => {
            const element = document.getElementById(elementId);
            if (element) {
                listeners.forEach(({ eventType, handler }) => {
                    element.removeEventListener(eventType, handler);
                });
            }
        });
        
        this.eventListeners.clear();
        this.panels.clear();
        this.controls.clear();
        
        if (this.playInterval) {
            clearInterval(this.playInterval);
            this.playInterval = null;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManager;
} else if (typeof window !== 'undefined') {
    window.UIManager = UIManager;
}