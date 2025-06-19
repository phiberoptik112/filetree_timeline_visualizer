# Unified Timeline Visualizer

A powerful tool that combines file system scanning with milestone extraction from email communications to create comprehensive project timeline visualizations.

## Features

- **Unified Timeline Generation**: Combines file tree scanning and email milestone extraction
- **Interactive 3D Visualization**: Sunburst charts for file trees with 3D Gantt bars for milestones
- **Correlation Analysis**: Links file changes with milestone events based on temporal proximity and file mentions
- **Email Processing**: Supports multiple email formats (.msg, .eml, .txt)
- **SQLite Database**: Persistent storage of events and correlations

## Installation

1. Clone the repository
2. Install required dependencies:
```bash
pip install extract-msg nltk textblob
```

## Usage

### Basic Usage

```bash
# Generate unified timeline with correlations
python unified_backend.py --scan-dir path/to/project --email-dir path/to/emails --output unified_timeline.json --correlate

# Serve visualization
python -m http.server 8080
# Then open http://localhost:8080/unified_visualizer.html
```

### Example with Sample Data

```bash
python unified_backend.py --scan-dir file-tree-timeline/sample_data/example_project --email-dir file-tree-timeline/sample_data/24-004_exampleprojectfolder/Emails --correlate
```

## Key Features

### Timeline Events
- File scans: Tracks file system changes and structure
- Milestones: Extracts from emails with categories:
  - Requirements
  - Deliverables
  - Meetings
  - Deadlines
  - Decisions
  - Issues

### Visualization
- Interactive 3D timeline view
- Sunburst charts for file trees
- 3D Gantt bars for milestones
- Correlation visualization
- Timeline scrubbing
- Synchronized view controls

### Color Coding
- **File Types**:
  - JavaScript: #f7df1e
  - Python: #3776ab
  - HTML: #e34c26
  - CSS: #1572b6
  - Folders: #4CAF50

- **Milestone Categories**:
  - Requirement: #3B82F6
  - Deliverable: #10B981
  - Meeting: #F59E0B
  - Deadline: #EF4444
  - Decision: #8B5CF6
  - Issue: #F97316

## Requirements

- Python 3.x
- WebGL-capable browser
- HTTP server (not file:// protocol)
- Required Python packages:
  - extract-msg
  - nltk
  - textblob

## Development

### Database Schema

#### Events Table
- `event_id`: Unique identifier
- `timestamp`: Unix timestamp
- `event_type`: 'file_scan' or 'milestone'
- `metadata`: JSON data

#### Correlations Table
- Links file events to milestone events
- Includes correlation strength (0.0-1.0)
- Correlation type: 'temporal_file_mention'

## License

[Add your license information here]

## Contributing

[Add contribution guidelines here] 