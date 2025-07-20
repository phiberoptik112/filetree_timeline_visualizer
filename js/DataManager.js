// DataManager - Handles data loading, processing, and caching
class DataManager {
    constructor() {
        this.data = null;
        this.currentDbFile = 'unified_timeline.json';
        this.userLoadedFile = false;
        this.cache = new Map();
        this.processingQueue = [];
        this.isProcessing = false;
        
        // Configuration
        this.config = window.CONFIG || {};
        this.fileConfig = this.config.FILES || {};
        
        // Data state
        this.fileScanEventIndices = [];
        this.milestoneEvents = [];
        this.correlations = [];
        
        this.init();
    }
    
    init() {
        this.setupCache();
    }
    
    setupCache() {
        const maxCacheSize = this.fileConfig.CACHE_SIZE || 100;
        this.cache = new Map();
        
        // Implement LRU cache behavior
        this.cache.set = function(key, value) {
            if (this.size >= maxCacheSize) {
                const firstKey = this.keys().next().value;
                this.delete(firstKey);
            }
            Map.prototype.set.call(this, key, value);
        }.bind(this.cache);
    }
    
    async loadData(filename = null) {
        try {
            const fileToLoad = filename || this.currentDbFile;
            console.log('Loading data from:', fileToLoad);
            
            // Check cache first
            if (this.cache.has(fileToLoad)) {
                console.log('Loading from cache:', fileToLoad);
                this.data = this.cache.get(fileToLoad);
                this.processLoadedData();
                return this.data;
            }
            
            const response = await fetch(fileToLoad);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            this.validateData(data);
            
            this.data = data;
            this.currentDbFile = fileToLoad;
            
            // Cache the loaded data
            this.cache.set(fileToLoad, data);
            
            this.processLoadedData();
            this.dispatchEvent('data-loaded', { data: this.data, filename: fileToLoad });
            
            return this.data;
            
        } catch (error) {
            console.error('Error loading data:', error);
            this.dispatchEvent('data-load-error', { error: error.message, filename: fileToLoad });
            
            // Only generate sample data if not user-initiated
            if (!this.userLoadedFile) {
                this.generateSampleData();
            }
            
            throw error;
        }
    }
    
    async loadCustomFile(file) {
        try {
            this.userLoadedFile = true;
            
            // Validate file
            if (!this.validateFile(file)) {
                throw new Error('Invalid file format or size');
            }
            
            const text = await this.readFileAsText(file);
            const data = JSON.parse(text);
            this.validateData(data);
            
            this.data = data;
            this.currentDbFile = file.name;
            
            // Cache the loaded data
            this.cache.set(file.name, data);
            
            this.processLoadedData();
            this.dispatchEvent('data-loaded', { data: this.data, filename: file.name });
            
            return this.data;
            
        } catch (error) {
            console.error('Error loading custom file:', error);
            this.dispatchEvent('data-load-error', { error: error.message, filename: file.name });
            throw error;
        }
    }
    
    validateFile(file) {
        const maxSize = this.fileConfig.MAX_FILE_SIZE || 50 * 1024 * 1024; // 50MB
        const supportedFormats = this.fileConfig.SUPPORTED_FORMATS || ['.json'];
        
        // Check file size
        if (file.size > maxSize) {
            throw new Error(`File too large. Maximum size: ${Math.round(maxSize / 1024 / 1024)}MB`);
        }
        
        // Check file extension
        const extension = '.' + file.name.split('.').pop().toLowerCase();
        if (!supportedFormats.includes(extension)) {
            throw new Error(`Unsupported file format. Supported: ${supportedFormats.join(', ')}`);
        }
        
        return true;
    }
    
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }
    
    validateData(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid data format: not an object');
        }
        
        if (!data.events || !Array.isArray(data.events)) {
            throw new Error('Invalid data format: missing events array');
        }
        
        if (data.events.length === 0) {
            throw new Error('No events found in data');
        }
        
        // Validate event structure
        data.events.forEach((event, index) => {
            if (!event.event_type || !event.timestamp || !event.metadata) {
                throw new Error(`Invalid event structure at index ${index}`);
            }
        });
        
        console.log('Data validation successful:', {
            eventsCount: data.events.length,
            correlationsCount: data.correlations ? data.correlations.length : 0,
            eventTypes: this.getEventTypes(data.events)
        });
    }
    
    processLoadedData() {
        if (!this.data || !this.data.events) {
            console.warn('No data to process');
            return;
        }
        
        // Extract file scan event indices
        this.fileScanEventIndices = this.data.events
            .map((event, index) => event.event_type === 'file_scan' ? index : -1)
            .filter(index => index !== -1);
        
        // Extract milestone events
        this.milestoneEvents = this.data.events
            .filter(event => event.event_type === 'milestone');
        
        // Extract correlations
        this.correlations = this.data.correlations || [];
        
        console.log('Data processing complete:', {
            totalEvents: this.data.events.length,
            fileScanEvents: this.fileScanEventIndices.length,
            milestoneEvents: this.milestoneEvents.length,
            correlations: this.correlations.length
        });
    }
    
    getEventTypes(events) {
        const types = {};
        events.forEach(event => {
            types[event.event_type] = (types[event.event_type] || 0) + 1;
        });
        return types;
    }
    
    generateSampleData() {
        console.log('Generating sample data...');
        
        const sampleData = {
            events: [
                {
                    event_id: 'sample_file_scan_1',
                    event_type: 'file_scan',
                    timestamp: Math.floor(Date.now() / 1000) - 86400, // 1 day ago
                    metadata: {
                        file_count: 25,
                        tree_structure: this.generateSampleTreeStructure()
                    }
                },
                {
                    event_id: 'sample_milestone_1',
                    event_type: 'milestone',
                    timestamp: Math.floor(Date.now() / 1000) - 43200, // 12 hours ago
                    metadata: {
                        title: 'Project Kickoff',
                        category: 'meeting',
                        priority: 'high',
                        confidence: 0.9,
                        start_time: Math.floor(Date.now() / 1000) - 43200,
                        end_time: Math.floor(Date.now() / 1000) - 39600,
                        duration: 3600, // 1 hour
                        intended_color: '#3B82F6',
                        actual_color: '#10B981'
                    }
                },
                {
                    event_id: 'sample_milestone_2',
                    event_type: 'milestone',
                    timestamp: Math.floor(Date.now() / 1000) - 21600, // 6 hours ago
                    metadata: {
                        title: 'Requirements Review',
                        category: 'deliverable',
                        priority: 'medium',
                        confidence: 0.8,
                        start_time: Math.floor(Date.now() / 1000) - 21600,
                        end_time: Math.floor(Date.now() / 1000) - 19800,
                        duration: 1800, // 30 minutes
                        intended_color: '#F59E0B',
                        actual_color: '#EF4444'
                    }
                },
                {
                    event_id: 'sample_milestone_3',
                    event_type: 'milestone',
                    timestamp: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
                    metadata: {
                        title: 'Design Phase Complete',
                        category: 'deadline',
                        priority: 'high',
                        confidence: 0.9,
                        start_time: Math.floor(Date.now() / 1000) - 7200,
                        end_time: Math.floor(Date.now() / 1000) - 5400,
                        duration: 1800, // 30 minutes
                        intended_color: '#8B5CF6',
                        actual_color: '#06B6D4'
                    }
                },
                {
                    event_id: 'sample_file_scan_2',
                    event_type: 'file_scan',
                    timestamp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
                    metadata: {
                        file_count: 30,
                        tree_structure: this.generateSampleTreeStructure()
                    }
                }
            ],
            correlations: [
                {
                    file_event_id: 'sample_file_scan_1',
                    milestone_event_id: 'sample_milestone_1',
                    correlation_strength: 0.8,
                    correlation_type: 'temporal_file_mention'
                }
            ],
            metadata: {
                generation_time: Math.floor(Date.now() / 1000),
                event_types: {
                    file_scan: 2,
                    milestone: 3
                }
            }
        };

        this.data = sampleData;
        this.processLoadedData();
        this.dispatchEvent('data-loaded', { data: this.data, filename: 'sample_data.json' });
        
        console.log('Sample data generated successfully');
    }
    
    generateSampleTreeStructure() {
        return {
            name: 'sample_project',
            type: 'folder',
            size: 1024000,
            children: [
                {
                    name: 'src',
                    type: 'folder',
                    size: 512000,
                    children: [
                        {
                            name: 'main.js',
                            type: 'file',
                            size: 2048,
                            mime_type: 'text/javascript',
                            file_hash: 'abc123'
                        },
                        {
                            name: 'style.css',
                            type: 'file',
                            size: 1024,
                            mime_type: 'text/css',
                            file_hash: 'def456'
                        }
                    ]
                },
                {
                    name: 'docs',
                    type: 'folder',
                    size: 256000,
                    children: [
                        {
                            name: 'README.md',
                            type: 'file',
                            size: 512,
                            mime_type: 'text/markdown',
                            file_hash: 'ghi789'
                        }
                    ]
                },
                {
                    name: 'package.json',
                    type: 'file',
                    size: 256,
                    mime_type: 'application/json',
                    file_hash: 'jkl012'
                }
            ]
        };
    }
    
    // Data access methods
    getData() {
        return this.data;
    }
    
    getEvents() {
        return this.data ? this.data.events : [];
    }
    
    getEventByIndex(index) {
        return this.data && this.data.events ? this.data.events[index] : null;
    }
    
    getEventById(eventId) {
        return this.data && this.data.events ? 
            this.data.events.find(event => event.event_id === eventId) : null;
    }
    
    getFileScanEvents() {
        return this.data ? this.data.events.filter(event => event.event_type === 'file_scan') : [];
    }
    
    getMilestoneEvents() {
        return this.milestoneEvents;
    }
    
    getCorrelations() {
        return this.correlations;
    }
    
    getFileScanEventIndices() {
        return this.fileScanEventIndices;
    }
    
    getEventsUpToIndex(index) {
        return this.data && this.data.events ? this.data.events.slice(0, index + 1) : [];
    }
    
    getEventTypeCount(eventType) {
        return this.data && this.data.events ? 
            this.data.events.filter(event => event.event_type === eventType).length : 0;
    }
    
    getTotalEventsCount() {
        return this.data && this.data.events ? this.data.events.length : 0;
    }
    
    getCurrentDbFile() {
        return this.currentDbFile;
    }
    
    isUserLoadedFile() {
        return this.userLoadedFile;
    }
    
    // Data filtering and search
    filterEventsByType(eventType) {
        return this.data && this.data.events ? 
            this.data.events.filter(event => event.event_type === eventType) : [];
    }
    
    filterEventsByDateRange(startTime, endTime) {
        return this.data && this.data.events ? 
            this.data.events.filter(event => 
                event.timestamp >= startTime && event.timestamp <= endTime) : [];
    }
    
    searchEvents(query) {
        if (!this.data || !this.data.events || !query) return [];
        
        const lowerQuery = query.toLowerCase();
        return this.data.events.filter(event => {
            // Search in event metadata
            if (event.metadata) {
                const metadataStr = JSON.stringify(event.metadata).toLowerCase();
                if (metadataStr.includes(lowerQuery)) return true;
            }
            
            // Search in event type
            if (event.event_type && event.event_type.toLowerCase().includes(lowerQuery)) {
                return true;
            }
            
            return false;
        });
    }
    
    // Data statistics
    getDataStatistics() {
        if (!this.data || !this.data.events) return null;
        
        const events = this.data.events;
        const eventTypes = this.getEventTypes(events);
        
        const timestamps = events.map(event => event.timestamp);
        const minTime = Math.min(...timestamps);
        const maxTime = Math.max(...timestamps);
        
        return {
            totalEvents: events.length,
            eventTypes: eventTypes,
            timeRange: {
                start: minTime,
                end: maxTime,
                duration: maxTime - minTime
            },
            correlations: this.correlations.length,
            fileScanEvents: this.fileScanEventIndices.length,
            milestoneEvents: this.milestoneEvents.length
        };
    }
    
    // Command generation
    generateBackendCommand(scanDir, emailDir, docsDir) {
        let command = 'python unified_backend.py';
        
        if (scanDir) {
            command += ` --scan-dir "${scanDir}"`;
        }
        if (emailDir) {
            command += ` --email-dir "${emailDir}"`;
        }
        if (docsDir) {
            command += ` --docs-dir "${docsDir}"`;
        }
        
        command += ' --correlate --output unified_timeline.json';
        
        if (!scanDir && !emailDir && !docsDir) {
            return 'Please provide at least one directory path.';
        }
        
        return command;
    }
    
    // Event dispatching
    dispatchEvent(eventName, detail = {}) {
        const event = new CustomEvent(eventName, { detail });
        document.dispatchEvent(event);
    }
    
    // Cache management
    clearCache() {
        this.cache.clear();
    }
    
    getCacheSize() {
        return this.cache.size;
    }
    
    getCacheKeys() {
        return Array.from(this.cache.keys());
    }
    
    // Cleanup
    dispose() {
        this.clearCache();
        this.data = null;
        this.fileScanEventIndices = [];
        this.milestoneEvents = [];
        this.correlations = [];
        this.processingQueue = [];
        this.isProcessing = false;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataManager;
} else if (typeof window !== 'undefined') {
    window.DataManager = DataManager;
}