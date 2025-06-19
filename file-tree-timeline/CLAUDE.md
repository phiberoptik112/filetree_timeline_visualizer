# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Core Architecture

This is a File Tree Timeline Visualizer that tracks file system changes over time using 3D sunburst visualization. The system consists of two main components:

1. **Python Backend (`backend/scanner.py`)**: Recursively scans directories, calculates SHA256 hashes for change detection, stores scan history in SQLite database, and exports JSON data optimized for Three.js consumption.

2. **Three.js Frontend (`frontend/index.html`)**: Renders interactive 3D sunburst visualization where nested rings represent folder hierarchy, ring segments are sized by file content, and Z-axis depth represents timeline progression.

### Data Flow
Python Scanner → SQLite Database → JSON Export → Three.js Visualization

The scanner uses dataclasses (`FileInfo`, `FolderInfo`) to structure metadata, maintains scan history in SQLite for timeline functionality, and transforms data into sunburst-compatible JSON format with color coding based on MIME types.

## Common Commands

### Backend Operations
```bash
# Basic directory scan with default output
python backend/scanner.py /path/to/directory

# Scan with custom database and output location
python backend/scanner.py /path/to/directory --db custom.db --output frontend/data.json

# Export existing timeline without new scan
python backend/scanner.py /path/to/directory --timeline --output timeline_export.json

# Test with sample data
python backend/scanner.py sample_data/example_project/ --output frontend/file_tree_data.json
```

### Frontend Development
```bash
# Start local web server for visualization
cd frontend
python -m http.server 8000

# Access visualization at http://localhost:8000
# Ensure file_tree_data.json exists in frontend/ directory
```

### Development Workflow
```bash
# 1. Run scanner to generate/update data
python backend/scanner.py sample_data/example_project/ --output frontend/file_tree_data.json

# 2. Start web server
cd frontend && python -m http.server 8000

# 3. View changes at http://localhost:8000
```

## File Structure Dependencies

- **Scanner output must go to `frontend/` directory**: The Three.js app expects `file_tree_data.json` in the same directory as `index.html`
- **SQLite database**: Scanner creates `file_tree_timeline.db` by default to store scan history for timeline functionality
- **Sample data**: `sample_data/example_project/` contains realistic test files (Python Flask app, JS, CSS) for demonstration

## Key Implementation Details

### Scanner Configuration
- Ignore patterns: `.git`, `__pycache__`, `node_modules`, `.DS_Store`, `.env`, `.vscode`, `.idea`, `*.pyc`, `.pytest_cache`, `venv`, `dist`, `build`
- Hash algorithm: SHA256 truncated to 16 characters for change detection
- MIME type detection for file categorization and color coding

### Visualization Color Mapping
- JavaScript: Yellow (#f7df1e)
- Python: Blue (#3776ab) 
- HTML: Orange (#e34c26)
- CSS: Blue (#1572b6)
- Folders: Dark blue-gray (#34495e)
- Other files: Light gray (#bdc3c7)

### Timeline Functionality
Multiple scans of the same directory create timeline data. Each scan is stored with timestamp, and the frontend can scrub through scan history to visualize changes over time.

## Development Notes

The frontend requires files to be served via HTTP (not file://) for proper Three.js functionality. The scanner must complete successfully before the visualization can display data. For testing changes, always run the scanner first to update the JSON data, then refresh the browser.