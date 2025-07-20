// VisualizationManager - Handles sunburst and gantt chart rendering
class VisualizationManager {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;
        this.scene = sceneManager.getScene();
        this.camera = sceneManager.getCamera();
        this.renderer = sceneManager.getRenderer();
        
        // Visualization groups
        this.sunburstGroup = new THREE.Group();
        this.ganttGroup = new THREE.Group();
        this.connectionGroup = new THREE.Group();
        
        // Add groups to scene
        this.scene.add(this.sunburstGroup);
        this.scene.add(this.ganttGroup);
        this.scene.add(this.connectionGroup);
        
        // Configuration
        this.config = window.CONFIG || {};
        this.colors = window.COLORS || {};
        this.colorUtils = new ColorUtils();
        this.formatUtils = new FormatUtils();
        
        // Sunburst settings
        this.sunburstConfig = this.config.SUNBURST || {};
        this.minAngleDeg = this.sunburstConfig.DEFAULT_MIN_ANGLE_DEG || 2;
        this.ringThickness = this.sunburstConfig.DEFAULT_RING_THICKNESS || 6;
        this.ringGap = this.sunburstConfig.RING_GAP || 2;
        this.zSpacing = this.sunburstConfig.Z_SPACING || 20;
        
        // Gantt settings
        this.ganttConfig = this.config.GANTT || {};
        
        // Visibility settings
        this.showSunburst = true;
        this.showGantt = true;
        this.showConnections = true;
        
        // Caches
        this.segmentMeshes = new Map();
        this.connectionLinesByChild = new Map();
        this.connectionLines = [];
        
        this.init();
    }
    
    init() {
        // Set initial visibility
        this.sunburstGroup.visible = this.showSunburst;
        this.ganttGroup.visible = this.showGantt;
        this.connectionGroup.visible = this.showConnections;
    }
    
    // Main visualization update method
    updateVisualization(events) {
        console.log('updateVisualization called with', events?.length || 0, 'events');
        console.log('Visibility flags:', { showSunburst: this.showSunburst, showGantt: this.showGantt, showConnections: this.showConnections });
        
        this.clearVisualization();
        
        if (!events || events.length === 0) {
            console.log('No events to visualize');
            return;
        }
        
        console.log('Updating visualization with', events.length, 'events');
        
        if (this.showSunburst) {
            console.log('Creating sunburst visualization...');
            this.createSunburstVisualization(events);
        }
        
        if (this.showGantt) {
            console.log('Creating Gantt visualization...');
            this.createGanttVisualization(events);
        }
        
        if (this.showConnections) {
            console.log('Creating connection visualization...');
            this.createConnectionVisualization(events);
        }
        
        console.log('Visualization update complete. Group visibilities:', {
            sunburst: this.sunburstGroup.visible,
            gantt: this.ganttGroup.visible,
            connections: this.connectionGroup.visible
        });
    }
    
    // Clear all visualizations
    clearVisualization() {
        this.clearGroup(this.sunburstGroup);
        this.clearGroup(this.ganttGroup);
        this.clearGroup(this.connectionGroup);
        
        // Clear caches
        this.segmentMeshes.clear();
        this.connectionLinesByChild.clear();
        this.connectionLines = [];
    }
    
    clearGroup(group) {
        while (group.children.length > 0) {
            const child = group.children[0];
            group.remove(child);
            
            // Dispose of geometry and materials
            if (child.geometry) {
                child.geometry.dispose();
            }
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.dispose());
                } else {
                    child.material.dispose();
                }
            }
        }
    }
    
    // Sunburst visualization
    createSunburstVisualization(events) {
        const fileScanEvents = events.filter(e => e.event_type === 'file_scan');
        console.log('Creating sunburst for', fileScanEvents.length, 'file scan events');
        
        if (fileScanEvents.length === 0) return;
        
        // Calculate timeline parameters
        const scanTimes = fileScanEvents.map(e => e.timestamp);
        const minTime = Math.min(...scanTimes);
        const maxTime = Math.max(...scanTimes);
        const minY = this.ganttConfig.MIN_Y || 0;
        const maxY = this.ganttConfig.MAX_Y || 100;
        
        events.forEach((event, index) => {
            if (event.event_type === 'file_scan' && event.metadata && event.metadata.tree_structure) {
                const yPosition = this.timestampToY(event.timestamp, minTime, maxTime, minY, maxY);
                console.log(`Creating sunburst for event ${index} at Y=${yPosition}`);
                
                this.createSunburstAtPosition(event.metadata.tree_structure, yPosition, index);
                this.createTimeLabel(event.timestamp, 0, 'file_scan');
            }
        });
    }
    
    createSunburstAtPosition(treeData, yPosition, eventIndex) {
        const sunburstGroup = this.createSunburst(treeData, eventIndex);
        sunburstGroup.position.y = yPosition;
        sunburstGroup.rotation.x = Math.PI * 1.5; // 270 degrees
        this.sunburstGroup.add(sunburstGroup);
    }
    
    createSunburst(treeData, eventIndex) {
        const group = new THREE.Group();
        const minAngleRad = this.minAngleDeg * Math.PI / 180;
        
        // Helper function to get segment center
        const getSegmentCenter = (innerRadius, outerRadius, startAngle, endAngle, z) => {
            const angle = (startAngle + endAngle) / 2;
            const radius = (innerRadius + outerRadius) / 2;
            return new THREE.Vector3(
                Math.cos(angle) * radius,
                Math.sin(angle) * radius,
                z
            );
        };
        
        // Create ring segment
        const createRingSegment = (node, innerRadius, outerRadius, startAngle, endAngle, depth) => {
            const segments = this.sunburstConfig.SEGMENTS || 64;
            const geometry = new THREE.RingGeometry(
                innerRadius,
                outerRadius,
                segments,
                1,
                startAngle,
                endAngle - startAngle
            );
            
            const color = this.colorUtils.getFileColor(node, false);
            const material = new THREE.MeshLambertMaterial({
                color: color,
                transparent: true,
                opacity: this.sunburstConfig.OPACITY || 0.8,
                side: THREE.DoubleSide
            });
            
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.z = depth * 2;
            mesh.receiveShadow = true;
            mesh.castShadow = true;
            
            // Store metadata
            mesh.userData = {
                node,
                eventIndex,
                depth,
                innerRadius,
                outerRadius,
                startAngle,
                endAngle,
                originalColor: this.colorUtils.getFileColor(node, true)
            };
            
            return mesh;
        };
        
        // Recursive sunburst building
        const buildSunburst = (node, innerRadius, outerRadius, startAngle, endAngle, depth = 0, parentInfo = null, parentNode = null) => {
            node.parent = parentNode;
            
            const children = node.children || [];
            const mesh = createRingSegment(node, innerRadius, outerRadius, startAngle, endAngle, depth);
            group.add(mesh);
            
            // Store for interaction
            this.segmentMeshes.set(node, mesh);
            
            // Draw connection line to parent
            if (parentInfo) {
                this.createSunburstConnection(parentInfo, {
                    innerRadius, outerRadius, startAngle, endAngle, node
                }, depth, group);
            }
            
            // Process children
            if (children.length > 0) {
                const totalSize = children.reduce((sum, child) => sum + (child.size || 1), 0);
                const totalMinAngle = children.length * minAngleRad;
                const availableAngle = Math.max(0, (endAngle - startAngle) - totalMinAngle);
                
                let currentAngle = startAngle;
                children.forEach((child, i) => {
                    const childSize = child.size || 1;
                    const angleSpan = minAngleRad + (availableAngle * (childSize / totalSize));
                    const childEndAngle = currentAngle + angleSpan;
                    
                    buildSunburst(
                        child,
                        outerRadius + this.ringGap,
                        outerRadius + this.ringGap + this.ringThickness,
                        currentAngle,
                        childEndAngle,
                        depth + 1,
                        { innerRadius, outerRadius, startAngle, endAngle, node },
                        node
                    );
                    
                    currentAngle = childEndAngle;
                });
            }
        };
        
        // Start building from root
        const initialRadius = this.sunburstConfig.INITIAL_RADIUS || 2;
        buildSunburst(treeData, initialRadius, initialRadius + this.ringThickness, 0, Math.PI * 2);
        
        return group;
    }
    
    createSunburstConnection(parentInfo, childInfo, depth, group) {
        const parentCenter = this.getSegmentCenter(
            parentInfo.innerRadius, parentInfo.outerRadius, 
            parentInfo.startAngle, parentInfo.endAngle, 
            (depth - 1) * 2
        );
        
        const childCenter = this.getSegmentCenter(
            childInfo.innerRadius, childInfo.outerRadius,
            childInfo.startAngle, childInfo.endAngle,
            depth * 2
        );
        
        const curve = new THREE.QuadraticBezierCurve3(
            parentCenter,
            parentCenter.clone().lerp(childCenter, 0.5),
            childCenter
        );
        
        const points = curve.getPoints(this.config.CONNECTIONS?.CURVE_SEGMENTS || 32);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color: this.sunburstConfig.CONNECTION_LINE_COLOR || 0xffffff,
            opacity: this.sunburstConfig.CONNECTION_LINE_OPACITY || 0.3,
            transparent: true
        });
        
        const line = new THREE.Line(geometry, material);
        line.userData = {
            type: 'connection',
            parentNode: parentInfo.node,
            childNode: childInfo.node
        };
        
        group.add(line);
        this.connectionLines.push(line);
        this.connectionLinesByChild.set(childInfo.node, line);
    }
    
    getSegmentCenter(innerRadius, outerRadius, startAngle, endAngle, z) {
        const angle = (startAngle + endAngle) / 2;
        const radius = (innerRadius + outerRadius) / 2;
        return new THREE.Vector3(
            Math.cos(angle) * radius,
            Math.sin(angle) * radius,
            z
        );
    }
    
    // Gantt visualization
    createGanttVisualization(events) {
        console.log('createGanttVisualization called with', events.length, 'events');
        
        const milestoneEvents = events.filter(e => e.event_type === 'milestone');
        console.log('Filtered milestone events:', milestoneEvents.length);
        
        if (milestoneEvents.length === 0) {
            console.log('No milestone events found, returning early');
            return;
        }
        
        console.log('Creating gantt for', milestoneEvents.length, 'milestone events');
        
        // Timeline parameters
        const times = milestoneEvents.map(e => e.metadata.start_time || e.timestamp);
        const endTimes = milestoneEvents.map(e => 
            e.metadata.end_time || (e.metadata.start_time || e.timestamp) + (e.metadata.duration || 86400)
        );
        
        const minTime = Math.min(...times);
        const maxTime = Math.max(...endTimes);
        const minY = this.ganttConfig.MIN_Y || 0;
        const maxY = this.ganttConfig.MAX_Y || 100;
        
        console.log('Time range:', { minTime, maxTime, minY, maxY });
        
        // Create timeline axis
        console.log('Creating timeline axis...');
        this.createTimelineAxis(minY, maxY);
        
        // Create milestone bars
        console.log('Creating milestone bars...');
        milestoneEvents.forEach((event, index) => {
            console.log(`Processing milestone ${index + 1}/${milestoneEvents.length}: ${event.metadata.title}`);
            this.createMilestoneBar(event, minTime, maxTime, minY, maxY, index);
        });
        
        console.log('Gantt visualization creation complete. Total children in ganttGroup:', this.ganttGroup.children.length);
    }
    
    createTimelineAxis(minY, maxY) {
        console.log(`Creating timeline axis from Y=${minY} to Y=${maxY}`);
        
        const axisConfig = this.ganttConfig;
        const axisHeight = maxY - minY + 10;
        
        const axisGeometry = new THREE.CylinderGeometry(
            axisConfig.AXIS_WIDTH || 0.3,
            axisConfig.AXIS_WIDTH || 0.3,
            axisHeight,
            32
        );
        
        const axisMaterial = new THREE.MeshBasicMaterial({
            color: axisConfig.AXIS_COLOR || 0xff00ff
        });
        
        const axisMesh = new THREE.Mesh(axisGeometry, axisMaterial);
        const axisY = (minY + maxY) / 2;
        axisMesh.position.set(0, axisY, 0);
        
        console.log(`Timeline axis created: height=${axisHeight}, position=(0, ${axisY}, 0), color=${axisConfig.AXIS_COLOR || 0xff00ff}`);
        
        this.ganttGroup.add(axisMesh);
        
        console.log(`Timeline axis added to ganttGroup. Group now has ${this.ganttGroup.children.length} children`);
    }
    
    createMilestoneBar(event, minTime, maxTime, minY, maxY, index) {
        const milestone = event.metadata;
        const startTime = milestone.start_time || event.timestamp;
        const duration = milestone.duration || (milestone.end_time ? (milestone.end_time - startTime) : 86400);
        const endTime = milestone.end_time || (startTime + duration);
        
        const intendedEnd = milestone.intended_end_time || endTime;
        const actualEnd = milestone.actual_end_time || endTime;
        
        const startY = this.timestampToY(startTime, minTime, maxTime, minY, maxY);
        const intendedBarHeight = this.timestampToY(intendedEnd, minTime, maxTime, minY, maxY) - startY;
        const actualBarHeight = this.timestampToY(actualEnd, minTime, maxTime, minY, maxY) - startY;
        
        // Debug logging
        console.log(`Creating milestone bar for "${milestone.title}":`, {
            startTime, endTime, startY, 
            intendedBarHeight, actualBarHeight,
            intendedColor: milestone.intended_color,
            actualColor: milestone.actual_color
        });
        
        // Colors
        const intendedColor = new THREE.Color(milestone.intended_color || '#ff00ff');
        const actualColor = new THREE.Color(milestone.actual_color || '#ff00ff');
        
        const barOffsetX = this.ganttConfig.BAR_OFFSET_X || 10;
        
        // Create tick marker
        this.createTickMarker(startY, 0);
        
        // Create connection line
        this.createConnectionLine(0, startY, barOffsetX, startY);
        
        // Create intended duration outline
        this.createIntendedBar(barOffsetX, startY, intendedBarHeight, intendedColor);
        
        // Create actual duration solid bar
        this.createActualBar(barOffsetX, startY, actualBarHeight, actualColor);
        
        // Create text label
        this.createTextLabel(milestone.title, barOffsetX + 4, startY + intendedBarHeight + 2, 0);
        
        console.log(`Milestone bar created at position: x=${barOffsetX}, y=${startY + actualBarHeight / 2}, z=0`);
    }
    
    createTickMarker(y, z) {
        const tickConfig = this.ganttConfig.TICK_SIZE || {};
        const tickGeometry = new THREE.CylinderGeometry(
            tickConfig.radius || 0.5,
            tickConfig.radius || 0.5,
            tickConfig.height || 2,
            tickConfig.segments || 16
        );
        
        const tickMaterial = new THREE.MeshBasicMaterial({
            color: this.ganttConfig.TICK_COLOR || 0x00ff00
        });
        
        const tick = new THREE.Mesh(tickGeometry, tickMaterial);
        tick.position.set(0, y, z);
        this.ganttGroup.add(tick);
    }
    
    createConnectionLine(x1, y1, x2, y2) {
        const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(x1, y1, 0),
            new THREE.Vector3(x2, y2, 0)
        ]);
        
        const material = new THREE.LineDashedMaterial({
            color: 0xffffff,
            dashSize: this.ganttConfig.DASH_SIZE || 2,
            gapSize: this.ganttConfig.GAP_SIZE || 2
        });
        
        const line = new THREE.Line(geometry, material);
        line.computeLineDistances();
        this.ganttGroup.add(line);
    }
    
    createIntendedBar(x, y, height, color) {
        const barConfig = this.ganttConfig.INTENDED_BAR_SIZE || {};
        
        // Ensure minimum height for visibility
        const minHeight = 2; // Minimum 2 units height
        const actualHeight = Math.max(Math.abs(height), minHeight);
        
        const geometry = new THREE.BoxGeometry(
            barConfig.width || 2,
            actualHeight,
            barConfig.depth || 2
        );
        
        const edges = new THREE.EdgesGeometry(geometry);
        const material = new THREE.LineBasicMaterial({
            color: color,
            linewidth: 3 // Make wireframe more visible
        });
        
        const wireframe = new THREE.LineSegments(edges, material);
        wireframe.position.set(x, y + actualHeight / 2, 0);
        
        // Debug logging
        console.log(`Creating intended bar wireframe: size=${barConfig.width || 2}x${actualHeight}x${barConfig.depth || 2}, position=(${x}, ${y + actualHeight / 2}, 0), color:`, color);
        
        this.ganttGroup.add(wireframe);
    }
    
    createActualBar(x, y, height, color) {
        const barConfig = this.ganttConfig.ACTUAL_BAR_SIZE || {};
        
        // Ensure minimum height for visibility
        const minHeight = 2; // Minimum 2 units height
        const actualHeight = Math.max(Math.abs(height), minHeight);
        
        const geometry = new THREE.BoxGeometry(
            barConfig.width || 1.2,
            actualHeight,
            barConfig.depth || 1.2
        );
        
        // Use MeshBasicMaterial for debugging (doesn't require lighting)
        const material = new THREE.MeshBasicMaterial({ 
            color: color,
            transparent: false,
            opacity: 1.0
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y + actualHeight / 2, 0);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        // Debug logging
        console.log(`Creating actual bar: size=${barConfig.width || 1.2}x${actualHeight}x${barConfig.depth || 1.2}, position=(${x}, ${y + actualHeight / 2}, 0), color:`, color);
        
        this.ganttGroup.add(mesh);
        
        // Verify it was added
        console.log(`Gantt group now has ${this.ganttGroup.children.length} children`);
    }
    
    // Connection visualization
    createConnectionVisualization(events) {
        // This would typically use correlation data
        // For now, we'll create a simple implementation
        console.log('Creating connections visualization');
    }
    
    // Text label creation
    createTextLabel(text, x, y, z) {
        const textConfig = this.config.TEXT || {};
        const canvas = document.createElement('canvas');
        canvas.width = textConfig.CANVAS_WIDTH || 256;
        canvas.height = textConfig.CANVAS_HEIGHT || 64;
        
        const context = canvas.getContext('2d');
        context.font = textConfig.FONT || 'bold 12px Arial';
        context.fillStyle = textConfig.FONT_COLOR || '#ffffff';
        
        const maxLength = textConfig.MAX_LENGTH || 20;
        const displayText = text.substring(0, maxLength);
        
        const textPos = textConfig.FONT_POSITION || { x: 10, y: 30 };
        context.fillText(displayText, textPos.x, textPos.y);
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            alphaTest: 0.1
        });
        
        const labelSize = textConfig.LABEL_SIZE || { width: 12, height: 3 };
        const geometry = new THREE.PlaneGeometry(labelSize.width, labelSize.height);
        const textMesh = new THREE.Mesh(geometry, material);
        textMesh.position.set(x, y, z);
        textMesh.lookAt(this.camera.position);
        
        this.ganttGroup.add(textMesh);
    }
    
    createTimeLabel(timestamp, z, eventType) {
        const date = new Date(timestamp * 1000);
        const dateStr = date.toLocaleDateString();
        
        const textConfig = this.config.TEXT || {};
        const canvas = document.createElement('canvas');
        canvas.width = textConfig.TIME_LABEL_CANVAS?.width || 128;
        canvas.height = textConfig.TIME_LABEL_CANVAS?.height || 32;
        
        const context = canvas.getContext('2d');
        context.fillStyle = eventType === 'file_scan' ? '#4CAF50' : '#3B82F6';
        context.font = textConfig.TIME_LABEL_FONT || '12px Arial';
        
        const textPos = textConfig.TIME_LABEL_POSITION || { x: 10, y: 20 };
        context.fillText(dateStr, textPos.x, textPos.y);
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            alphaTest: 0.1
        });
        
        const labelSize = textConfig.TIME_LABEL_SIZE || { width: 8, height: 2 };
        const geometry = new THREE.PlaneGeometry(labelSize.width, labelSize.height);
        const label = new THREE.Mesh(geometry, material);
        label.position.set(-15, 0, z);
        label.lookAt(this.camera.position);
        
        this.sunburstGroup.add(label);
    }
    
    // Utility methods
    timestampToY(timestamp, minTime, maxTime, minY, maxY) {
        if (maxTime === minTime) return minY;
        const t = (timestamp - minTime) / (maxTime - minTime);
        return minY + t * (maxY - minY);
    }
    
    // Settings methods
    updateSunburstSettings(settings) {
        if (settings.minAngle !== undefined) {
            this.minAngleDeg = settings.minAngle;
        }
        if (settings.ringThickness !== undefined) {
            this.ringThickness = settings.ringThickness;
        }
        
        // Trigger visualization update
        this.dispatchEvent('sunburst-settings-changed', settings);
    }
    
    // Visibility methods
    toggleSunburst() {
        this.showSunburst = !this.showSunburst;
        this.sunburstGroup.visible = this.showSunburst;
        return this.showSunburst;
    }
    
    toggleGantt() {
        this.showGantt = !this.showGantt;
        this.ganttGroup.visible = this.showGantt;
        return this.showGantt;
    }
    
    toggleConnections() {
        this.showConnections = !this.showConnections;
        this.connectionGroup.visible = this.showConnections;
        return this.showConnections;
    }
    
    // Interaction methods
    getIntersectedObjects(raycaster) {
        const allObjects = [
            ...this.sunburstGroup.children,
            ...this.connectionLines
        ];
        
        return raycaster.intersectObjects(allObjects, true);
    }
    
    highlightPath(node) {
        this.clearHighlights();
        
        if (!node) return;
        
        let currentNode = node;
        while (currentNode) {
            const mesh = this.segmentMeshes.get(currentNode);
            if (mesh) {
                this.highlightMesh(mesh);
            }
            
            const line = this.connectionLinesByChild.get(currentNode);
            if (line) {
                this.highlightLine(line);
            }
            
            currentNode = currentNode.parent;
        }
    }
    
    highlightMesh(mesh) {
        const highlightColor = this.sunburstConfig.HIGHLIGHT_COLOR || '#00ff66';
        mesh.material.color.set(highlightColor);
        mesh.material.opacity = this.sunburstConfig.HIGHLIGHT_OPACITY || 1.0;
        
        if (!mesh.userData.highlighted) {
            mesh.userData.highlighted = true;
            if (!this.highlightedObjects) this.highlightedObjects = new Set();
            this.highlightedObjects.add(mesh);
        }
    }
    
    highlightLine(line) {
        const highlightColor = this.sunburstConfig.HIGHLIGHT_COLOR || '#00ff66';
        line.material.color.set(highlightColor);
        line.material.opacity = this.sunburstConfig.HIGHLIGHT_OPACITY || 1.0;
        
        if (!line.userData.highlighted) {
            line.userData.highlighted = true;
            if (!this.highlightedObjects) this.highlightedObjects = new Set();
            this.highlightedObjects.add(line);
        }
    }
    
    clearHighlights() {
        if (!this.highlightedObjects) return;
        
        this.highlightedObjects.forEach(obj => {
            if (obj.isMesh) {
                const originalColor = obj.userData.originalColor || '#bdc3c7';
                obj.material.color.set(originalColor);
                obj.material.opacity = this.sunburstConfig.OPACITY || 0.8;
            } else if (obj.isLine) {
                obj.material.color.set(this.sunburstConfig.CONNECTION_LINE_COLOR || 0xffffff);
                obj.material.opacity = this.sunburstConfig.CONNECTION_LINE_OPACITY || 0.3;
            }
            obj.userData.highlighted = false;
        });
        
        this.highlightedObjects.clear();
    }
    
    // Event dispatching
    dispatchEvent(eventName, detail = {}) {
        const event = new CustomEvent(eventName, { detail });
        document.dispatchEvent(event);
    }
    
    // Cleanup
    dispose() {
        this.clearVisualization();
        
        // Remove groups from scene
        this.scene.remove(this.sunburstGroup);
        this.scene.remove(this.ganttGroup);
        this.scene.remove(this.connectionGroup);
        
        // Clear references
        this.segmentMeshes.clear();
        this.connectionLinesByChild.clear();
        this.connectionLines = [];
        
        if (this.highlightedObjects) {
            this.highlightedObjects.clear();
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VisualizationManager;
} else if (typeof window !== 'undefined') {
    window.VisualizationManager = VisualizationManager;
}