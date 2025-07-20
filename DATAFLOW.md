# Data Flow: JSON Input to Visual Graphics

This document describes the complete data processing pipeline from raw JSON input to the rendered file tree sunburst and milestone event chart visualizations in the Unified Timeline Visualizer.

## Overview

The system processes two main types of data:
1. **File Scan Events** → **File Tree Sunburst Visualizations** 
2. **Milestone Events** → **Milestone Event Chart (Gantt-style)**

## 1. JSON Data Structure

### Input JSON Format
```json
{
  "events": [
    {
      "event_id": "filescan_1234567890_hash",
      "event_type": "file_scan",
      "timestamp": 1234567890,
      "metadata": {
        "root_path": "/path/to/directory",
        "scan_duration": 2.5,
        "file_count": 25,
        "total_size": 1024000,
        "tree_structure": {
          "name": "root_folder",
          "type": "folder",
          "size": 1024000,
          "children": [
            {
              "name": "src",
              "type": "folder", 
              "size": 512000,
              "children": [
                {
                  "name": "main.js",
                  "type": "file",
                  "size": 2048,
                  "mime_type": "text/javascript",
                  "file_hash": "abc123"
                }
              ]
            }
          ]
        }
      }
    },
    {
      "event_id": "milestone_1234567890",
      "event_type": "milestone",
      "timestamp": 1234567890,
      "metadata": {
        "title": "Project Kickoff",
        "category": "meeting",
        "priority": "high",
        "confidence": 0.9,
        "start_time": 1234567890,
        "end_time": 1234571490,
        "intended_color": "#3B82F6",
        "actual_color": "#10B981"
      }
    }
  ],
  "correlations": [
    {
      "file_event_id": "filescan_1234567890_hash",
      "milestone_event_id": "milestone_1234567890", 
      "correlation_strength": 0.8,
      "correlation_type": "temporal_file_mention"
    }
  ]
}
```

## 2. Data Processing Pipeline

### Stage 1: Data Loading & Validation
**File**: `js/DataManager.js`

1. **JSON Loading**:
   - `loadData()` fetches JSON from file or URL
   - `loadCustomFile()` handles user file uploads
   - Data is cached using LRU cache mechanism

2. **Data Validation**:
   - `validateData()` ensures required fields exist
   - Checks for proper event structure and types
   - Validates metadata completeness

3. **Data Processing**:
   - `processLoadedData()` extracts different event types:
     - File scan events: `event.event_type === 'file_scan'`
     - Milestone events: `event.event_type === 'milestone'`
     - Correlations between events

### Stage 2: Component Initialization
**File**: `js/UnifiedTimelineVisualizer.js`

1. **Component Setup**:
   - `DataManager`: Handles data loading/processing
   - `VisualizationManager`: Manages 3D rendering
   - `SceneManager`: Three.js scene setup
   - `UIManager`: DOM interactions
   - `InteractionManager`: Mouse/touch handling

2. **Event Communication**:
   - Custom DOM events for inter-component communication
   - `data-loaded` event triggers visualization updates

## 3. File Tree Sunburst Processing

### Stage 3A: Tree Structure Analysis
**Files**: `unified_visualizer_original.html` (lines 1136-1320), `js/VisualizationManager.js`

1. **Event Filtering**:
   ```javascript
   const fileScanEvents = events.filter(e => e.event_type === 'file_scan');
   ```

2. **Tree Data Extraction**:
   - Each file scan event contains `metadata.tree_structure`
   - Tree structure is hierarchical: folders contain files/subfolders
   - Each node has: `name`, `type`, `size`, `children[]`, `mime_type` (for files)

3. **Spatial Positioning**:
   - Timeline mapping: `timestampToY(event.timestamp, minTime, maxTime, minY, maxY)`
   - Y-axis represents time progression
   - Z-axis fixed at center (0) for sunburst positioning

### Stage 3B: Sunburst Geometry Generation
**File**: `unified_visualizer_original.html` (lines 1172-1320)

1. **Ring Calculation**:
   - `buildSunburst()` recursively processes tree nodes
   - Each depth level = concentric ring
   - Ring parameters:
     - `innerRadius`: Starts at 2, increases by `ringThickness + ringGap`
     - `outerRadius`: `innerRadius + ringThickness`
     - Angular span distributed proportionally by file/folder size

2. **Angle Distribution**:
   ```javascript
   const totalSize = children.reduce((sum, child) => sum + (child.size || 1), 0);
   const angleSpan = minAngleRad + (availableAngle * (childSize / totalSize));
   ```

3. **3D Mesh Creation**:
   - `THREE.RingGeometry()` for each segment
   - Z-depth separation: `depth * 2`
   - Each segment stores node metadata in `mesh.userData`

### Stage 3C: Color Assignment
**Files**: `unified_visualizer_original.html` (lines 1952-2000), `config/colors.js`

1. **Color Mapping**:
   - MIME type → color mapping from `COLORS.FILE_TYPES`
   - Folder type: `#a73a81`
   - File extensions fallback for unknown MIME types
   - Prefix matching (e.g., `image/`, `text/`)

2. **Color Cache**:
   - Colors cached per node to avoid recalculation
   - Sibling color variation for visual distinction

3. **Material Creation**:
   ```javascript
   const material = new THREE.MeshLambertMaterial({
     color: color,
     transparent: true,
     opacity: 0.8,
     side: THREE.DoubleSide
   });
   ```

## 4. Milestone Event Chart Processing

### Stage 4A: Milestone Data Extraction
**Files**: `js/VisualizationManager.js` (lines 299-390), `unified_visualizer_original.html` (lines 1324-1424)

1. **Event Filtering**:
   ```javascript
   const milestoneEvents = events.filter(e => e.event_type === 'milestone');
   ```

2. **Time Range Calculation**:
   - Extract start/end times from milestone metadata
   - Calculate timeline bounds: `minTime`, `maxTime`
   - Map to Y-axis range: `minY = 0`, `maxY = 100`

3. **Duration Processing**:
   - `start_time`: Milestone start timestamp
   - `end_time` or calculated from `duration`
   - `intended_end_time` vs `actual_end_time` for comparison

### Stage 4B: Gantt Chart Visualization
**File**: `unified_visualizer_original.html` (lines 1324-1424)

1. **Timeline Axis**:
   - Vertical purple cylinder (`0xff00ff`) at X=0, Z=0
   - Height spans full Y range (`maxY - minY + 10`)

2. **Milestone Bar Creation**:
   For each milestone:
   - **Tick Marker**: Green cylinder at start Y position
   - **Connection Line**: Dashed line from axis to bar
   - **Intended Duration**: Outline box showing planned duration
   - **Actual Duration**: Solid colored bar showing actual duration
   - **Text Label**: Milestone title at top of intended bar

3. **Color Processing**:
   - Colors from milestone metadata: `intended_color`, `actual_color`
   - Fallback to category colors from `COLORS.MILESTONE_CATEGORIES`
   - CSS color strings converted to Three.js Color objects

### Stage 4C: 3D Geometry Creation

1. **Bar Geometry**:
   ```javascript
   // Intended duration (outline)
   const intendedBarGeom = new THREE.BoxGeometry(2, intendedBarHeight, 2);
   const intendedBarEdges = new THREE.EdgesGeometry(intendedBarGeom);
   
   // Actual duration (solid)
   const actualBarGeom = new THREE.BoxGeometry(1.2, actualBarHeight, 1.2);
   ```

2. **Positioning**:
   - X-offset: `barOffsetX = 10` units from timeline axis
   - Y-position: Calculated from timestamp mapping
   - Z-position: Fixed at timeline axis Z-coordinate

## 5. Rendering Pipeline

### Stage 5A: Scene Assembly
**Files**: `js/SceneManager.js`, `js/VisualizationManager.js`

1. **Group Organization**:
   - `sunburstGroup`: Contains all sunburst visualizations
   - `ganttGroup`: Contains all milestone chart elements
   - `connectionGroup`: Contains correlation lines between events

2. **Lighting Setup**:
   - Ambient light for overall illumination
   - Directional lights for depth perception
   - Shadow casting enabled for 3D depth

### Stage 5B: Interactive Features
**File**: `js/InteractionManager.js`

1. **Mouse Interaction**:
   - Raycasting for hover detection
   - `handleSunburstMouseMove()` for file tree tooltips
   - Click handlers for milestone selection

2. **Details Panel**:
   - `showSunburstDetailsPanel()` displays file/folder information
   - Dynamic positioning based on mouse coordinates
   - Shows: name, type, size, MIME type, file count

### Stage 5C: Real-time Updates
**Files**: `js/UIManager.js`, `js/UnifiedTimelineVisualizer.js`

1. **Setting Changes**:
   - Ring thickness adjustment updates sunburst geometry
   - Minimum angle changes affect segment visibility
   - Color picker changes update milestone bar colors

2. **Visibility Toggles**:
   - `toggleSunburst()`: Show/hide file tree visualizations
   - `toggleGantt()`: Show/hide milestone charts
   - `toggleConnections()`: Show/hide correlation lines

## 6. Performance Optimizations

1. **Caching**:
   - Color cache prevents repeated calculations
   - Data cache for loaded JSON files
   - Geometry reuse where possible

2. **Level of Detail**:
   - Minimum angle threshold prevents tiny segments
   - Depth limiting for very deep file trees
   - Segment culling for performance

3. **Memory Management**:
   - Proper disposal of Three.js objects
   - Cache size limits with LRU eviction
   - Event listener cleanup

## 7. Data Flow Summary

```
JSON Input → DataManager → Event Processing → Visualization Components
     ↓              ↓            ↓                    ↓
File Events → Tree Analysis → Sunburst Geometry → 3D Rendering
     ↓              ↓            ↓                    ↓
Milestone Events → Time Mapping → Gantt Bars → Interactive Display
```

The complete pipeline transforms structured JSON data into interactive 3D visualizations, maintaining data integrity while providing rich visual feedback and user interaction capabilities.