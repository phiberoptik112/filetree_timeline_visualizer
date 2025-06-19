# File Tree Timeline Visualizer

An interactive 3D visualization tool that tracks file system changes over time using a sunburst diagram. Combines Python scanning backend with Three.js frontend for immersive timeline exploration.

![File Tree Timeline Visualizer](https://img.shields.io/badge/status-production--ready-green)
![Python](https://img.shields.io/badge/python-3.7+-blue)
![Three.js](https://img.shields.io/badge/three.js-r128-orange)
![SQLite](https://img.shields.io/badge/database-sqlite-lightgrey)

## 🌟 Features

- **3D Sunburst Visualization**: Interactive radial tree representation with time as depth
- **Timeline Navigation**: Smooth scrubbing through file system history
- **Real-time Scanning**: Python backend monitors directory changes
- **File Type Detection**: Color-coded visualization by MIME type
- **Change Detection**: SHA256 hashing tracks file modifications
- **SQLite Storage**: Persistent scan history with metadata
- **Interactive Controls**: Mouse hover, zoom, pan, and orbit controls
- **Responsive Design**: Modern glassmorphism UI with dark theme

## 🚀 Quick Start

### 1. Scan a Directory
```bash
cd file-tree-timeline
python backend/scanner.py sample_data/example_project/
```
cd file-tree-timeline && python backend/scanner.py sample_data/24-004_exampleprojectfolder

### 2. Start Web Server
```bash
cd frontend
python -m http.server 8000
```

### 3. View Visualization
Open `http://localhost:8000` in your browser

## 📁 Project Structure

```
file-tree-timeline/
├── backend/
│   ├── scanner.py          # Python file system scanner
│   ├── requirements.txt    # Python dependencies
│   └── README.md          # Backend documentation
├── frontend/
│   ├── index.html         # Three.js visualization interface
│   └── README.md          # Frontend documentation
├── sample_data/
│   └── example_project/   # Demo files for testing
│       ├── src/
│       │   ├── app.py     # Python Flask application
│       │   └── utils.py   # Utility functions
│       ├── index.js       # JavaScript frontend
│       ├── style.css      # CSS styles
│       └── README.md      # Project documentation
├── README.md              # This file
└── .gitignore            # Git ignore patterns
```

## 🔧 Installation

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
```

### Frontend Setup
No installation required - uses CDN resources for Three.js.

## 📊 Usage Examples

### Basic Directory Scan
```bash
python backend/scanner.py /path/to/project
```

### Custom Output Location
```bash
python backend/scanner.py /path/to/project --output custom_data.json
```

### Multiple Scans for Timeline
```bash
# First scan
python backend/scanner.py /path/to/project --db timeline.db

# Make some changes to files...

# Second scan (adds to timeline)
python backend/scanner.py /path/to/project --db timeline.db
```

### Export Existing Timeline
```bash
python backend/scanner.py /path/to/project --timeline --output timeline_export.json
```

## 🎨 Visualization Guide

### Color Coding
- **JavaScript**: Yellow (`#f7df1e`)
- **Python**: Blue (`#3776ab`)
- **HTML**: Orange (`#e34c26`)
- **CSS**: Blue (`#1572b6`)
- **Folders**: Dark blue-gray (`#34495e`)
- **Other Files**: Light gray (`#bdc3c7`)

### Navigation Controls
- **Mouse Drag**: Rotate view
- **Mouse Wheel**: Zoom in/out
- **Timeline Slider**: Navigate through scan history
- **Play/Pause**: Automatic timeline progression
- **Hover**: Show file/folder details

### Interface Panels
- **Control Panel**: Timeline navigation and playback
- **Info Panel**: Current scan statistics
- **Hover Panel**: Detailed file information
- **Legend**: File type color reference

## 🛠️ Configuration

### Scanner Options
- **Ignore Patterns**: Configurable file/directory exclusions
- **Database Path**: Custom SQLite database location
- **Output Format**: JSON structure optimized for Three.js
- **Hash Algorithm**: SHA256 with 16-character truncation

### Visualization Settings
- **Auto-rotation**: Gentle continuous movement
- **Animation Speed**: Timeline transition timing
- **Camera Controls**: Sensitivity and limits
- **Color Themes**: File type color mapping

## 📈 Performance

### Backend Optimization
- Efficient recursive directory traversal
- Streaming file hash calculation
- SQLite connection management
- Memory-optimized JSON export

### Frontend Optimization
- WebGL-accelerated 3D rendering
- Level-of-detail geometry
- Efficient object management
- Smooth 60 FPS animations

## 🔍 Technical Details

### Data Flow
1. **Python Scanner** → Analyzes file system recursively
2. **SQLite Database** → Stores scan history and metadata
3. **JSON Export** → Transforms data for Three.js consumption
4. **Three.js Frontend** → Renders interactive 3D visualization

### File Detection
- **MIME Type Analysis**: Automatic file categorization
- **Hash Comparison**: Change detection between scans
- **Metadata Extraction**: Size, dates, permissions
- **Path Resolution**: Relative path handling

### Visualization Algorithm
- **Sunburst Layout**: Nested rings for folder hierarchy
- **Size Mapping**: Ring segment size based on file size
- **Depth Mapping**: Z-axis represents timeline progression
- **Color Assignment**: MIME type-based color coding

## 🧪 Sample Data

The project includes a comprehensive example in `sample_data/example_project/`:

- **Python Flask Application** (`src/app.py`, `src/utils.py`)
- **Frontend JavaScript** (`index.js`)
- **Modern CSS Styles** (`style.css`)
- **Documentation** (`README.md`)

This demonstrates various file types and structures for effective visualization testing.

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development Setup
```bash
git clone https://github.com/yourusername/file-tree-timeline.git
cd file-tree-timeline
```

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Troubleshooting

### Common Issues

**"Failed to load data"**
- Ensure `file_tree_data.json` exists in the frontend directory
- Check that the Python scanner completed successfully
- Verify file permissions and accessibility

**"No timeline data available"**
- Run the Python scanner at least once
- Check SQLite database was created successfully
- Verify the export process completed without errors

**Visualization not rendering**
- Ensure modern browser with WebGL support
- Serve files via HTTP server (not file:// protocol)
- Check browser console for JavaScript errors

**Poor performance**
- Reduce data complexity for very large directories
- Close unnecessary browser tabs
- Update graphics drivers

### Support

- **Documentation**: Check individual component READMEs
- **Issues**: Report bugs on GitHub
- **Discussions**: Community support and feature requests

## 🔮 Future Enhancements

- **Real-time Monitoring**: File system watcher integration
- **Advanced Filtering**: Custom ignore patterns and search
- **Export Options**: PDF reports and data visualization
- **Collaboration**: Multi-user timeline sharing
- **Performance**: Incremental scanning and caching
- **Platforms**: Cross-platform desktop application

---

**Built with ❤️ using Python, Three.js, and modern web technologies**