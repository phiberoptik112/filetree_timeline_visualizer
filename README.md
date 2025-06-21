# Unified Timeline Visualizer

A powerful tool that combines file system scanning with milestone extraction from communications and documents to create comprehensive project timeline visualizations.

## Features

- **Unified Timeline Generation**: Combines file system scanning with milestone extraction from emails and documents.
- **Interactive 3D Visualization**: Sunburst charts for file trees with 3D Gantt bars for milestones.
- **Integrated Command Generator**: UI to help generate the necessary command for data processing.
- **Correlation Analysis**: Links file changes with milestone events based on temporal proximity and file mentions.
- **Multi-Source Processing**: Supports multiple email formats (`.msg`, `.eml`, `.txt`) and document formats (`.md`, `.txt`).
- **SQLite Database**: Persistent storage for all timeline events and their correlations.

## Usage Workflow

This project uses a two-step process to visualize your data:

1.  **Generate Data**: Run the Python backend script (`unified_backend.py`) to scan your project folders and extract milestones. This creates a `unified_timeline.json` file.
2.  **Visualize Data**: Open `unified_visualizer.html` in your browser and load the `unified_timeline.json` file to see the interactive visualization.

### Step 1: Generate the Timeline Data

The easiest way to generate the data is to use the integrated command generator.

1.  Start a local web server in the project's root directory:
    ```bash
    python -m http.server 8080
    ```
2.  Open `http://localhost:8080/unified_visualizer.html` in your browser.
3.  In the **Controls** panel, find the **Generate Timeline** section.
4.  Enter the local paths to your project, email, and/or document folders.
5.  Click **Generate Command**.
6.  Copy the generated command and run it in your terminal. This will create the `unified_timeline.json` file.

#### Manual Command Generation

You can also construct the command manually. Here is a full example:

```bash
# Generate a unified timeline from a project folder, emails, and documents
python unified_backend.py \
    --scan-dir path/to/your/project_folder \
    --email-dir path/to/your/email_folder \
    --docs-dir path/to/your/documents_folder \
    --output unified_timeline.json \
    --correlate
```

**Arguments:**

*   `--scan-dir`: (Optional) Path to the project directory to scan.
*   `--email-dir`: (Optional) Path to the directory containing email files.
*   `--docs-dir`: (Optional) Path to the directory containing document files.
*   `--output`: (Optional) Name of the output JSON file.
*   `--correlate`: (Optional) Flag to enable correlation analysis.

### Step 2: View the Visualization

1.  Make sure your local server from Step 1 is still running.
2.  Go to `http://localhost:8080/unified_visualizer.html`.
3.  In the **Controls** panel, find the **Data Source** section.
4.  Click the file input and select the `unified_timeline.json` file you generated.
5.  The visualization will load with your data.

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