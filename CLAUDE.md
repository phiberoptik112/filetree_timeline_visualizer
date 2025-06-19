# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Core Architecture

This is a **Unified Timeline Visualizer** that combines file system scanning with milestone extraction from email communications. The system correlates file changes with project milestones to provide comprehensive project timeline visualization.

### Main Components

1. **Unified Backend (`unified_backend.py`)**: Combines file tree scanning and email milestone extraction into a single timeline. Uses `TimelineEvent` dataclass to unify both file scans and milestones, performs correlation analysis between file changes and communication events, and exports unified JSON data.

2. **Unified Frontend (`unified_visualizer.html`)**: Interactive 3D visualization combining sunburst charts (file trees) with 3D Gantt bars (milestones). Supports timeline scrubbing, correlation visualization, and synchronized view controls.

3. **Legacy Components**: Original `file-tree-timeline/` (file scanning) and `milestone_email_generator/` (email processing) maintained for reference and component testing.

### Data Flow Architecture
Email Files + Directory Scan → Unified Backend → SQLite Database (events + correlations) → JSON Export → 3D Visualization

The unified system uses correlation analysis to link file changes with milestone events based on temporal proximity and file name mentions in communications.

## Common Commands

### Unified System (Primary Workflow)
```bash
# Generate unified timeline with correlations
python unified_backend.py --scan-dir path/to/project --email-dir path/to/emails --output unified_timeline.json --correlate

# Serve visualization
python -m http.server 8080
# Then open http://localhost:8080/unified_visualizer.html

# Example with sample data
python unified_backend.py --scan-dir file-tree-timeline/sample_data/example_project --email-dir file-tree-timeline/sample_data/24-004_exampleprojectfolder/Emails --correlate
```

### Legacy Component Commands
```bash
# Original file tree scanner
python file-tree-timeline/backend/scanner.py path/to/directory --output file-tree-timeline/frontend/file_tree_data.json

# Standalone milestone extraction
python milestone_email_generator/milestone_generator.py --emails path/to/emails --output milestone_data.json

# Serve legacy visualizations
cd file-tree-timeline/frontend && python -m http.server 8000
```

## Key Implementation Details

### Unified Backend Architecture
- **TimelineEvent dataclass**: Unified container for both file_scan and milestone events
- **Correlation engine**: Analyzes temporal and file-mention relationships between file changes and milestones
- **Email processing**: Supports .msg, .eml, and .txt email formats with pattern-based milestone extraction
- **SQLite schema**: Single database with `events` table and `correlations` table for relationship tracking

### Email Milestone Extraction Patterns
- **Categories**: requirement, deliverable, meeting, deadline, decision, issue
- **Priority detection**: Based on urgency keywords (urgent, asap, critical, important)
- **File reference extraction**: Regex patterns for file paths and names mentioned in communications
- **Confidence scoring**: Algorithm considers pattern strength, context, and text length

### 3D Visualization Integration
- **Sunburst positioning**: File trees positioned along Z-axis representing timeline progression
- **Gantt bars**: 3D milestone bars with priority indicators and duration visualization
- **Correlation lines**: Visual connections between related file changes and milestones
- **Interactive controls**: Timeline scrubbing, view toggles, hover details, camera navigation

### Color Coding System
- **File types**: JavaScript (#f7df1e), Python (#3776ab), HTML (#e34c26), CSS (#1572b6), Folders (#4CAF50)
- **Milestone categories**: Requirement (#3B82F6), Deliverable (#10B981), Meeting (#F59E0B), Deadline (#EF4444), Decision (#8B5CF6), Issue (#F97316)

## Development Workflow

### Primary Development Pattern
1. **Generate data**: Run unified backend with both file scan and email directories
2. **Enable correlations**: Use `--correlate` flag for relationship analysis
3. **Serve visualization**: Use unified_visualizer.html for comprehensive timeline view
4. **Iterate**: Re-run backend after file changes or new emails to update timeline

### Testing and Development
- **Sample data**: Use `file-tree-timeline/sample_data/` for consistent testing
- **Real project data**: Point to actual project directories and email folders for realistic correlation analysis
- **Performance testing**: Large datasets may require correlation threshold tuning

### File Dependencies
- **Unified output**: `unified_timeline.json` must be in same directory as `unified_visualizer.html`
- **Database persistence**: `unified_timeline.db` stores event history for incremental updates
- **Email formats**: Supports Microsoft Outlook .msg files (requires extract-msg package), standard .eml files, and plain text email formats

## Database Schema

### Events Table
- `event_id`: Unique identifier combining type and hash
- `timestamp`: Unix timestamp for chronological ordering
- `event_type`: Either 'file_scan' or 'milestone'
- `metadata`: JSON blob containing type-specific data

### Correlations Table  
- Links file_event_id to milestone_event_id with correlation_strength (0.0-1.0)
- `correlation_type`: Currently 'temporal_file_mention' based on time proximity and file name matching

## Frontend Requirements

The unified visualization requires HTTP serving (not file:// protocol) for proper Three.js functionality and JSON loading. Browser must support WebGL for 3D rendering. Timeline data loads automatically from unified_timeline.json in same directory.