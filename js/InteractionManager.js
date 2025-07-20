// InteractionManager - Handles mouse interactions, raycasting, and highlighting
class InteractionManager {
    constructor(sceneManager, visualizationManager, uiManager) {
        this.sceneManager = sceneManager;
        this.visualizationManager = visualizationManager;
        this.uiManager = uiManager;
        
        this.scene = sceneManager.getScene();
        this.camera = sceneManager.getCamera();
        this.renderer = sceneManager.getRenderer();
        
        // Interaction state
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.hoveredObject = null;
        this.highlightedObjects = new Set();
        
        // Configuration
        this.config = window.CONFIG || {};
        this.interactionConfig = this.config.INTERACTION || {};
        this.formatUtils = new FormatUtils();
        
        // Timing
        this.lastHoverTime = 0;
        this.hoverDelay = this.interactionConfig.HOVER_DELAY || 0; // Temporarily set to 0 for debugging
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        const canvas = this.renderer.domElement;
        
        // Mouse events
        canvas.addEventListener('mousemove', (event) => this.onMouseMove(event));
        canvas.addEventListener('mouseleave', () => this.onMouseLeave());
        canvas.addEventListener('click', (event) => this.onClick(event));
        
        // Touch events for mobile support
        canvas.addEventListener('touchstart', (event) => this.onTouchStart(event));
        canvas.addEventListener('touchmove', (event) => this.onTouchMove(event));
        canvas.addEventListener('touchend', (event) => this.onTouchEnd(event));
        
        // Prevent context menu
        canvas.addEventListener('contextmenu', (event) => event.preventDefault());
    }
    
    onMouseMove(event) {
        this.updateMousePosition(event);
        
        // Debug: Always log mouse position
        console.log('Mouse position:', this.mouse.x, this.mouse.y);
        
        // Debounce hover detection
        const now = Date.now();
        if (now - this.lastHoverTime < this.hoverDelay) {
            return;
        }
        this.lastHoverTime = now;
        
        console.log('Mouse move detected, performing raycast...');
        this.performRaycast();
        this.handleHoverInteraction(event.clientX, event.clientY);
    }
    
    onMouseLeave() {
        this.clearHighlights();
        this.hideDetailsPanel();
        this.hoveredObject = null;
        this.uiManager.clearHoverInfo();
    }
    
    onClick(event) {
        this.updateMousePosition(event);
        this.performRaycast();
        
        if (this.hoveredObject) {
            this.handleClickInteraction(this.hoveredObject);
        }
    }
    
    onTouchStart(event) {
        if (event.touches.length === 1) {
            this.updateMousePositionFromTouch(event.touches[0]);
        }
    }
    
    onTouchMove(event) {
        if (event.touches.length === 1) {
            this.updateMousePositionFromTouch(event.touches[0]);
            this.performRaycast();
            this.handleHoverInteraction(event.touches[0].clientX, event.touches[0].clientY);
        }
    }
    
    onTouchEnd(event) {
        this.clearHighlights();
        this.hideDetailsPanel();
        this.uiManager.clearHoverInfo();
    }
    
    updateMousePosition(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }
    
    updateMousePositionFromTouch(touch) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
    }
    
    performRaycast() {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Get intersectable objects from visualization manager
        const intersects = this.visualizationManager.getIntersectedObjects(this.raycaster);
        
        console.log('Raycast found', intersects.length, 'intersections');
        
        if (intersects.length > 0) {
            const intersected = intersects[0].object;
            console.log('Intersected object userData:', intersected.userData);
            
            if (this.hoveredObject !== intersected) {
                console.log('New hover object detected');
                this.hoveredObject = intersected;
                this.handleObjectHover(intersected);
            }
        } else {
            if (this.hoveredObject) {
                console.log('Clearing hover object');
                this.hoveredObject = null;
                this.clearHighlights();
                this.hideDetailsPanel();
                this.uiManager.clearHoverInfo();
            }
        }
    }
    
    handleObjectHover(object) {
        this.clearHighlights();
        
        if (object.userData && object.userData.node) {
            // Sunburst segment hover
            this.handleSunburstHover(object);
        } else if (object.userData && object.userData.type === 'connection') {
            // Connection line hover
            this.handleConnectionHover(object);
        } else if (object.userData && object.userData.milestone) {
            // Milestone hover
            this.handleMilestoneHover(object);
        }
    }
    
    handleSunburstHover(mesh) {
        console.log('=== HOVER EVENT TRIGGERED ===');
        const node = mesh.userData.node;
        console.log('Hover node:', node);
        
        // Highlight the entire path from root to this node
        this.visualizationManager.highlightPath(node);
        
        // Show details for the hovered node
        this.showNodeDetails(node);
    }
    
    handleConnectionHover(line) {
        // Highlight the connection line and connected segments
        this.visualizationManager.highlightLine(line);
        
        const parentNode = line.userData.parentNode;
        const childNode = line.userData.childNode;
        
        if (parentNode) {
            const parentMesh = this.visualizationManager.segmentMeshes.get(parentNode);
            if (parentMesh) {
                this.visualizationManager.highlightMesh(parentMesh);
            }
        }
        
        if (childNode) {
            const childMesh = this.visualizationManager.segmentMeshes.get(childNode);
            if (childMesh) {
                this.visualizationManager.highlightMesh(childMesh);
            }
        }
        
        // Show connection details
        this.showConnectionDetails(line.userData);
    }
    
    handleMilestoneHover(object) {
        // Highlight milestone
        this.highlightMilestone(object);
        
        // Show milestone details
        this.showMilestoneDetails(object.userData.milestone);
    }
    
    handleHoverInteraction(clientX, clientY) {
        if (!this.hoveredObject) {
            this.hideDetailsPanel();
            return;
        }
        
        // Position and show details panel
        const panelOffset = this.interactionConfig.DETAILS_PANEL_OFFSET || { x: 20, y: 20 };
        const maxWidth = this.interactionConfig.DETAILS_PANEL_MAX_WIDTH || 300;
        const maxHeight = this.interactionConfig.DETAILS_PANEL_MAX_HEIGHT || 200;
        
        const x = Math.min(clientX + panelOffset.x, window.innerWidth - maxWidth);
        const y = Math.min(clientY + panelOffset.y, window.innerHeight - maxHeight);
        
        this.showDetailsPanel(x, y);
    }
    
    handleClickInteraction(object) {
        if (object.userData && object.userData.node) {
            // Node click - could trigger focus, expansion, etc.
            this.dispatchEvent('node-clicked', { node: object.userData.node });
        } else if (object.userData && object.userData.milestone) {
            // Milestone click
            this.dispatchEvent('milestone-clicked', { milestone: object.userData.milestone });
        }
    }
    
    // Details panel methods
    showNodeDetails(node) {
        // Handle the nested data structure from the backend
        // Root nodes are flat, child nodes are nested
        const nodeData = node.data || node;
        const nodeType = node.type || nodeData.type || (node.children ? 'folder' : 'file');
        
        const title = nodeData.name || 'File/Folder';
        
        // Debug: Log the actual name being extracted
        console.log('=== TOOLTIP DEBUG ===');
        console.log('Node:', node);
        console.log('NodeData:', nodeData);
        console.log('Extracted name:', nodeData.name);
        console.log('Final title:', title);
        console.log('===================');
        
        const details = {
            Type: nodeType,
            Size: nodeData.size ? this.formatUtils.formatBytes(nodeData.size) : null,
            'MIME Type': nodeData.mime_type ? this.formatUtils.formatMimeType(nodeData.mime_type) : null,
            Hash: nodeData.file_hash ? this.formatUtils.formatHash(nodeData.file_hash) : null,
            'File Count': nodeData.file_count ? this.formatUtils.formatFileCount(nodeData.file_count) : null,
            Path: nodeData.path ? this.formatUtils.formatFilePath(nodeData.path) : null,
            Depth: nodeData.depth !== undefined ? this.formatUtils.formatTreeDepth(nodeData.depth) : null
        };
        
        // Remove null values
        const filteredDetails = {};
        Object.entries(details).forEach(([key, value]) => {
            if (value !== null) {
                filteredDetails[key] = value;
            }
        });
        
        const content = this.formatUtils.createDetailsContent(filteredDetails);
        this.currentDetailsContent = { title, content };
        
        // Also update the hover info panel
        let hoverContent = `<strong>${title}</strong><br>`;
        hoverContent += `<span style='color: #4CAF50;'>Type:</span> ${nodeType}<br>`;
        if (nodeData.size) {
            hoverContent += `<span style='color: #4CAF50;'>Size:</span> ${this.formatUtils.formatBytes(nodeData.size)}<br>`;
        }
        if (nodeType === 'file' && nodeData.mime_type) {
            hoverContent += `<span style='color: #888;'>MIME:</span> ${this.formatUtils.formatMimeType(nodeData.mime_type)}<br>`;
        } else if (nodeType === 'folder' && nodeData.file_count) {
            hoverContent += `<span style='color: #888;'>Files:</span> ${this.formatUtils.formatFileCount(nodeData.file_count)}<br>`;
        }
        
        this.uiManager.updateHoverInfo(hoverContent);
    }
    
    showConnectionDetails(connectionData) {
        const title = 'File Connection';
        
        // Handle nested data structure
        const parentData = connectionData.parentNode?.data || connectionData.parentNode;
        const childData = connectionData.childNode?.data || connectionData.childNode;
        
        const details = {
            'Parent': parentData?.name || 'Unknown',
            'Child': childData?.name || 'Unknown',
            'Connection Type': connectionData.type || 'hierarchy'
        };
        
        const content = this.formatUtils.createDetailsContent(details);
        this.currentDetailsContent = { title, content };
    }
    
    showMilestoneDetails(milestone) {
        const title = milestone.title || 'Milestone';
        const details = {
            Category: this.formatUtils.formatMilestoneCategory(milestone.category),
            Priority: this.formatUtils.formatPriority(milestone.priority),
            Confidence: this.formatUtils.formatConfidence(milestone.confidence),
            Duration: milestone.duration ? this.formatUtils.formatDuration(milestone.duration) : null,
            'Start Time': milestone.start_time ? this.formatUtils.formatTimestamp(milestone.start_time) : null,
            'End Time': milestone.end_time ? this.formatUtils.formatTimestamp(milestone.end_time) : null
        };
        
        // Remove null values
        const filteredDetails = {};
        Object.entries(details).forEach(([key, value]) => {
            if (value !== null) {
                filteredDetails[key] = value;
            }
        });
        
        const content = this.formatUtils.createDetailsContent(filteredDetails);
        this.currentDetailsContent = { title, content };
    }
    
    showDetailsPanel(x, y) {
        if (!this.currentDetailsContent) return;
        
        this.uiManager.showDetailsPanel(
            this.currentDetailsContent.title,
            this.currentDetailsContent.content,
            x,
            y
        );
    }
    
    hideDetailsPanel() {
        this.uiManager.hideDetailsPanel();
        this.uiManager.clearHoverInfo();
        this.currentDetailsContent = null;
    }
    
    // Highlighting methods
    clearHighlights() {
        this.visualizationManager.clearHighlights();
    }
    
    highlightMilestone(object) {
        // Implement milestone highlighting
        if (object.material) {
            const originalColor = object.userData.originalColor || object.material.color.getHex();
            object.userData.originalColor = originalColor;
            
            object.material.color.set(0x00ff66);
            object.material.opacity = 1.0;
            
            this.highlightedObjects.add(object);
        }
    }
    
    // Focus methods
    focusOnObject(object) {
        if (!object) return;
        
        // Calculate optimal camera position to view the object
        const boundingBox = new THREE.Box3().setFromObject(object);
        const center = boundingBox.getCenter(new THREE.Vector3());
        const size = boundingBox.getSize(new THREE.Vector3());
        
        // Calculate distance needed to fit object in view
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = this.camera.fov * (Math.PI / 180);
        let distance = Math.abs(maxDim / 2 / Math.tan(fov / 2));
        
        // Add some padding
        distance *= 1.5;
        
        // Calculate new camera position
        const direction = new THREE.Vector3()
            .subVectors(this.camera.position, center)
            .normalize();
        
        const newPosition = new THREE.Vector3()
            .addVectors(center, direction.multiplyScalar(distance));
        
        // Animate camera to new position
        this.animateCameraToPosition(newPosition, center);
    }
    
    animateCameraToPosition(targetPosition, targetLookAt, duration = 1000) {
        const startPosition = this.camera.position.clone();
        const startLookAt = this.sceneManager.getControls()?.target.clone() || new THREE.Vector3();
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (ease-in-out)
            const eased = progress < 0.5 
                ? 2 * progress * progress 
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;
            
            // Interpolate position
            this.camera.position.lerpVectors(startPosition, targetPosition, eased);
            
            // Interpolate look-at target
            const currentLookAt = new THREE.Vector3().lerpVectors(startLookAt, targetLookAt, eased);
            
            const controls = this.sceneManager.getControls();
            if (controls) {
                controls.target.copy(currentLookAt);
                controls.update();
            }
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }
    
    // Search and selection methods
    findObjectsByName(name) {
        const results = [];
        
        // Search in sunburst segments
        this.visualizationManager.segmentMeshes.forEach((mesh, node) => {
            // Handle nested data structure
            const nodeData = node.data || node;
            const nodeName = nodeData.name || '';
            
            if (nodeName && nodeName.toLowerCase().includes(name.toLowerCase())) {
                results.push({
                    type: 'node',
                    object: mesh,
                    node: node,
                    name: nodeName
                });
            }
        });
        
        return results;
    }
    
    selectObject(object) {
        this.clearHighlights();
        this.hoveredObject = object;
        this.handleObjectHover(object);
        this.focusOnObject(object);
    }
    
    // Event dispatching
    dispatchEvent(eventName, detail = {}) {
        const event = new CustomEvent(eventName, { detail });
        document.dispatchEvent(event);
    }
    
    // Public API methods
    getHoveredObject() {
        return this.hoveredObject;
    }
    
    getHighlightedObjects() {
        return Array.from(this.highlightedObjects);
    }
    
    clearSelection() {
        this.hoveredObject = null;
        this.clearHighlights();
        this.hideDetailsPanel();
    }
    
    setHoverDelay(delay) {
        this.hoverDelay = Math.max(0, delay);
    }
    
    // Cleanup
    dispose() {
        const canvas = this.renderer.domElement;
        
        // Remove event listeners
        canvas.removeEventListener('mousemove', this.onMouseMove);
        canvas.removeEventListener('mouseleave', this.onMouseLeave);
        canvas.removeEventListener('click', this.onClick);
        canvas.removeEventListener('touchstart', this.onTouchStart);
        canvas.removeEventListener('touchmove', this.onTouchMove);
        canvas.removeEventListener('touchend', this.onTouchEnd);
        canvas.removeEventListener('contextmenu', (event) => event.preventDefault());
        
        // Clear state
        this.clearHighlights();
        this.hoveredObject = null;
        this.highlightedObjects.clear();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InteractionManager;
} else if (typeof window !== 'undefined') {
    window.InteractionManager = InteractionManager;
}