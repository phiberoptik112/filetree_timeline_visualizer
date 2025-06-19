#!/usr/bin/env python3
"""
File Tree Timeline Scanner

A tool for scanning file systems and tracking changes over time.
Exports data optimized for Three.js sunburst visualization.
"""

import os
import json
import sqlite3
import hashlib
import mimetypes
import argparse
from datetime import datetime
from pathlib import Path
from dataclasses import dataclass, asdict
from typing import List, Dict, Optional, Any


@dataclass
class FileInfo:
    """Data structure for file information"""
    name: str
    path: str
    size: int
    mime_type: str
    file_hash: str
    created: float
    modified: float
    depth: int


@dataclass
class FolderInfo:
    """Data structure for folder information"""
    name: str
    path: str
    size: int
    file_count: int
    created: float
    modified: float
    depth: int
    children: List[Dict[str, Any]]


class FileTreeScanner:
    """Main scanner class for analyzing file system changes over time"""
    
    def __init__(self, root_path: str, db_path: str = "file_tree_timeline.db"):
        """Initialize scanner with SQLite database"""
        self.root_path = Path(root_path).resolve()
        self.db_path = db_path
        self.ignore_patterns = {
            '.git', '__pycache__', 'node_modules', '.DS_Store', 
            '.env', '.vscode', '.idea', '*.pyc', '.pytest_cache',
            'venv', 'env', '.venv', 'dist', 'build'
        }
        self._init_database()
    
    def _init_database(self):
        """Initialize SQLite database with required schema"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS scans (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                root_path TEXT NOT NULL,
                total_files INTEGER NOT NULL,
                total_size INTEGER NOT NULL,
                scan_data TEXT NOT NULL
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def _should_ignore(self, path: Path) -> bool:
        """Check if path should be ignored based on patterns"""
        path_str = str(path)
        name = path.name
        
        for pattern in self.ignore_patterns:
            if pattern.startswith('*'):
                if name.endswith(pattern[1:]):
                    return True
            elif pattern in path_str or name == pattern:
                return True
        
        return False
    
    def _get_file_hash(self, file_path: Path) -> str:
        """Generate SHA256 hash for file, truncated to 16 characters"""
        try:
            hasher = hashlib.sha256()
            with open(file_path, 'rb') as f:
                for chunk in iter(lambda: f.read(4096), b""):
                    hasher.update(chunk)
            return hasher.hexdigest()[:16]
        except (OSError, IOError):
            return "unknown"
    
    def get_file_info(self, file_path: Path, depth: int = 0) -> FileInfo:
        """Extract comprehensive file metadata"""
        try:
            stat = file_path.stat()
            mime_type, _ = mimetypes.guess_type(str(file_path))
            if not mime_type:
                mime_type = "application/octet-stream"
            
            return FileInfo(
                name=file_path.name,
                path=str(file_path.relative_to(self.root_path)),
                size=stat.st_size,
                mime_type=mime_type,
                file_hash=self._get_file_hash(file_path),
                created=stat.st_ctime,
                modified=stat.st_mtime,
                depth=depth
            )
        except (OSError, IOError) as e:
            print(f"Error accessing file {file_path}: {e}")
            return None
    
    def scan_folder(self, folder_path: Path, depth: int = 0) -> FolderInfo:
        """Recursively scan folder and return structured data"""
        children = []
        total_size = 0
        file_count = 0
        
        try:
            items = sorted(folder_path.iterdir(), key=lambda p: (p.is_file(), p.name.lower()))
            
            for item in items:
                if self._should_ignore(item):
                    continue
                
                if item.is_file():
                    file_info = self.get_file_info(item, depth + 1)
                    if file_info:
                        children.append({
                            'type': 'file',
                            'data': asdict(file_info)
                        })
                        total_size += file_info.size
                        file_count += 1
                
                elif item.is_dir():
                    folder_info = self.scan_folder(item, depth + 1)
                    if folder_info:
                        children.append({
                            'type': 'folder',
                            'data': asdict(folder_info)
                        })
                        total_size += folder_info.size
                        file_count += folder_info.file_count
            
            stat = folder_path.stat()
            return FolderInfo(
                name=folder_path.name if folder_path != self.root_path else "root",
                path=str(folder_path.relative_to(self.root_path)) if folder_path != self.root_path else "",
                size=total_size,
                file_count=file_count,
                created=stat.st_ctime,
                modified=stat.st_mtime,
                depth=depth,
                children=children
            )
            
        except (OSError, IOError) as e:
            print(f"Error scanning folder {folder_path}: {e}")
            return None
    
    def perform_scan(self) -> Dict[str, Any]:
        """Perform complete directory scan with timing"""
        print(f"Starting scan of: {self.root_path}")
        start_time = datetime.now()
        
        if not self.root_path.exists():
            raise FileNotFoundError(f"Path does not exist: {self.root_path}")
        
        if not self.root_path.is_dir():
            raise NotADirectoryError(f"Path is not a directory: {self.root_path}")
        
        root_folder = self.scan_folder(self.root_path)
        
        if not root_folder:
            raise RuntimeError("Failed to scan root directory")
        
        end_time = datetime.now()
        scan_duration = (end_time - start_time).total_seconds()
        
        scan_result = {
            'timestamp': start_time.isoformat(),
            'root_path': str(self.root_path),
            'scan_duration': scan_duration,
            'total_files': root_folder.file_count,
            'total_size': root_folder.size,
            'data': asdict(root_folder)
        }
        
        self._save_scan_to_db(scan_result)
        
        print(f"Scan completed in {scan_duration:.2f}s")
        print(f"Files: {root_folder.file_count}, Total size: {root_folder.size:,} bytes")
        
        return scan_result
    
    def _save_scan_to_db(self, scan_result: Dict[str, Any]):
        """Save scan result to SQLite database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO scans (timestamp, root_path, total_files, total_size, scan_data)
            VALUES (?, ?, ?, ?, ?)
        ''', (
            scan_result['timestamp'],
            scan_result['root_path'],
            scan_result['total_files'],
            scan_result['total_size'],
            json.dumps(scan_result)
        ))
        
        conn.commit()
        conn.close()
    
    def get_timeline_data(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Retrieve historical scan data for timeline visualization"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT scan_data FROM scans 
            ORDER BY timestamp DESC 
            LIMIT ?
        ''', (limit,))
        
        results = []
        for row in cursor.fetchall():
            results.append(json.loads(row[0]))
        
        conn.close()
        return results
    
    def export_for_frontend(self, output_file: str = "file_tree_data.json"):
        """Transform data for Three.js sunburst visualization"""
        timeline_data = self.get_timeline_data()
        
        if not timeline_data:
            print("No scan data available for export")
            return
        
        # Transform data for Three.js consumption
        export_data = {
            'metadata': {
                'generated_at': datetime.now().isoformat(),
                'total_scans': len(timeline_data),
                'latest_scan': timeline_data[0]['timestamp'] if timeline_data else None
            },
            'timeline': []
        }
        
        for i, scan in enumerate(timeline_data):
            transformed_scan = {
                'scan_id': i,
                'timestamp': scan['timestamp'],
                'total_files': scan['total_files'],
                'total_size': scan['total_size'],
                'scan_duration': scan.get('scan_duration', 0),
                'tree_data': self._transform_for_sunburst(scan['data'], i)
            }
            export_data['timeline'].append(transformed_scan)
        
        output_path = Path(output_file)
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(export_data, f, indent=2, ensure_ascii=False)
        
        print(f"Data exported to: {output_path.resolve()}")
        return output_path
    
    def _transform_for_sunburst(self, node_data: Dict[str, Any], scan_index: int) -> Dict[str, Any]:
        """Transform tree data for sunburst visualization"""
        def transform_node(node: Dict[str, Any], depth: int) -> Dict[str, Any]:
            if 'children' in node:  # Folder
                children = []
                for child in node['children']:
                    transformed_child = transform_node(child['data'], depth + 1)
                    if transformed_child:
                        children.append(transformed_child)
                
                return {
                    'name': node['name'],
                    'type': 'folder',
                    'size': node['size'],
                    'file_count': node['file_count'],
                    'depth': depth,
                    'scan_index': scan_index,
                    'children': children
                }
            else:  # File
                return {
                    'name': node['name'],
                    'type': 'file',
                    'size': node['size'],
                    'mime_type': node['mime_type'],
                    'depth': depth,
                    'scan_index': scan_index,
                    'file_hash': node['file_hash']
                }
        
        return transform_node(node_data, 0)


def main():
    """CLI interface for the file tree scanner"""
    parser = argparse.ArgumentParser(
        description="Scan file system and generate timeline visualization data"
    )
    parser.add_argument(
        "path", 
        help="Path to scan"
    )
    parser.add_argument(
        "--output", "-o",
        default="file_tree_data.json",
        help="Output JSON file path (default: file_tree_data.json)"
    )
    parser.add_argument(
        "--db", "-d",
        default="file_tree_timeline.db",
        help="SQLite database path (default: file_tree_timeline.db)"
    )
    parser.add_argument(
        "--timeline", "-t",
        action="store_true",
        help="Export timeline data for existing scans"
    )
    
    args = parser.parse_args()
    
    try:
        scanner = FileTreeScanner(args.path, args.db)
        
        if args.timeline:
            scanner.export_for_frontend(args.output)
        else:
            scanner.perform_scan()
            scanner.export_for_frontend(args.output)
            
    except Exception as e:
        print(f"Error: {e}")
        return 1
    
    return 0


if __name__ == "__main__":
    exit(main())