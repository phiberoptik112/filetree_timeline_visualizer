# File Tree Timeline Scanner - Backend

Python backend for scanning file systems and tracking changes over time. Generates data optimized for Three.js sunburst visualization.

## Features

- **Recursive Directory Scanning**: Deep traversal with configurable ignore patterns
- **File Change Detection**: SHA256 hashing for detecting file modifications
- **SQLite Database**: Persistent storage of scan history
- **MIME Type Detection**: Automatic file categorization
- **JSON Export**: Data formatted for Three.js consumption
- **CLI Interface**: Easy command-line operation

## Installation

```bash
pip install -r requirements.txt
```

## Usage

### Basic Scanning

```bash
# Scan a directory
python scanner.py /path/to/directory

# Specify output file
python scanner.py /path/to/directory --output my_data.json

# Use custom database
python scanner.py /path/to/directory --db my_timeline.db
```

### Timeline Export

```bash
# Export existing timeline data without new scan
python scanner.py /path/to/directory --timeline --output timeline_data.json
```

## Configuration

### Ignore Patterns

The scanner automatically ignores common files and directories:
- `.git`, `__pycache__`, `node_modules`
- `.DS_Store`, `.env`, `.vscode`, `.idea`
- `*.pyc`, `.pytest_cache`, `venv`, `dist`, `build`

### Database Schema

SQLite database stores:
- Scan timestamps and metadata
- File tree structure as JSON
- Total file counts and sizes
- Scan performance metrics

## Output Format

The scanner generates JSON data optimized for Three.js sunburst visualization:

```json
{
  "metadata": {
    "generated_at": "2024-01-01T12:00:00",
    "total_scans": 5,
    "latest_scan": "2024-01-01T11:30:00"
  },
  "timeline": [
    {
      "scan_id": 0,
      "timestamp": "2024-01-01T11:30:00",
      "total_files": 150,
      "total_size": 2048576,
      "tree_data": {
        "name": "root",
        "type": "folder",
        "children": [...]
      }
    }
  ]
}
```

## API Reference

### FileTreeScanner Class

- `__init__(root_path, db_path)` - Initialize scanner
- `perform_scan()` - Execute complete directory scan
- `export_for_frontend(output_file)` - Generate Three.js data
- `get_timeline_data(limit)` - Retrieve scan history

### Data Classes

- `FileInfo` - File metadata structure
- `FolderInfo` - Directory metadata structure

## Error Handling

The scanner handles:
- Permission errors
- Missing files/directories
- Large file processing
- Database connection issues

## Performance

- Efficient recursive traversal
- Streaming file hash calculation
- Configurable scan depth limits
- Memory-optimized JSON export