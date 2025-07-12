#!/usr/bin/env python3
"""
Unified Timeline Visualizer Backend
Combines file tree scanning and milestone extraction into a single unified timeline
"""

import os
import json
import sqlite3
import hashlib
import mimetypes
import argparse
import email
import re
from datetime import datetime, timedelta
from pathlib import Path
from dataclasses import dataclass, asdict
from typing import List, Dict, Optional, Any, Union
from email.header import decode_header
import configparser

# Add CommunicationThread dataclass
@dataclass
class CommunicationThread:
    """Represents a thread of related communications"""
    thread_id: str
    subject: str
    participants: List[str]
    start_date: float
    end_date: float
    message_count: int
    key_topics: List[str]

# Try to import optional dependencies
try:
    import extract_msg
    MSG_SUPPORT = True
except ImportError:
    MSG_SUPPORT = False

try:
    import nltk
    from textblob import TextBlob
    NLP_SUPPORT = True
    # Download required NLTK data
    try:
        nltk.data.find('tokenizers/punkt')
    except LookupError:
        nltk.download('punkt')
except ImportError:
    NLP_SUPPORT = False


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


@dataclass
class Milestone:
    """Represents a project milestone or event"""
    id: str
    timestamp: float
    title: str
    description: str
    category: str  # 'requirement', 'deliverable', 'meeting', 'decision', 'issue', 'deadline'
    priority: str  # 'low', 'medium', 'high', 'critical'
    participants: List[str]
    source: str  # 'email', 'document', 'calendar', 'manual'
    source_id: str  # email message ID, document path, etc.
    status: str  # 'pending', 'in_progress', 'completed', 'cancelled'
    related_files: List[str]  # file paths mentioned in context
    confidence: float  # 0.0-1.0 confidence in automated extraction


@dataclass
class TimelineEvent:
    """Unified timeline event that can be either a file scan or milestone"""
    event_id: str
    timestamp: float
    event_type: str  # 'file_scan' or 'milestone'
    metadata: Dict[str, Any]  # Flexible metadata container


class UnifiedTimelineGenerator:
    """Main class for generating unified timeline visualizations"""
    
    def __init__(self, db_path: str = "unified_timeline.db", recommendation_config: str = None):
        self.db_path = db_path
        self.ignore_patterns = {
            '.git', '__pycache__', 'node_modules', '.DS_Store', 
            '.env', '.vscode', '.idea', '*.pyc', '.pytest_cache',
            'venv', 'env', '.venv', 'dist', 'build', '*.db'
        }
        # Milestone extraction patterns
        self.milestone_patterns = {
            'deadline': [
                r'due\s+(?:by\s+)?(\w+\s+\d{1,2}(?:th|st|nd|rd)?)',
                r'deadline\s+(?:is\s+)?(\w+\s+\d{1,2})',
                r'needs?\s+to\s+be\s+(?:done|completed|finished)\s+by\s+(\w+\s+\d{1,2})',
                r'submit\s+(?:by\s+)?(\w+\s+\d{1,2})'
            ],
            'requirement': [
                r'(?:we\s+)?need\s+(?:to\s+)?(.{10,100})',
                r'requirement\s*:\s*(.{10,100})',
                r'must\s+(?:have|include|implement)\s+(.{10,100})',
                r'(?:client|customer)\s+(?:wants|needs|requires)\s+(.{10,100})'
            ],
            'deliverable': [
                r'deliver(?:able)?\s*:\s*(.{10,200})',
                r'(?:will\s+)?provide\s+(.{10,200})',
                r'(?:sending|attaching|submitting)\s+(.{10,200})',
                r'here\s+(?:is|are)\s+(?:the\s+)?(.{10,200})',
                r'completed\s+(.{10,200})',
                r'finished\s+(.{10,200})',
                r'(?:ready|done)\s+(?:with\s+)?(.{10,200})'
            ],
            'meeting': [
                r'meeting\s+(?:on\s+)?(\w+\s+\d{1,2})',
                r'call\s+(?:scheduled\s+)?(?:for\s+)?(\w+\s+\d{1,2})',
                r'let\'s\s+meet\s+(?:on\s+)?(\w+\s+\d{1,2})',
                r'discussion\s+(?:on\s+)?(\w+\s+\d{1,2})'
            ],
            'decision': [
                r'(?:we\s+)?(?:decided|agreed)\s+(?:to\s+)?(.{10,100})',
                r'decision\s*:\s*(.{10,100})',
                r'(?:final|approved)\s+(.{10,100})',
                r'go\s+with\s+(.{10,100})'
            ]
        }
        # File reference patterns
        self.file_patterns = [
            r'([a-zA-Z0-9_-]+\.(?:py|js|html|css|json|md|txt|pdf|doc|docx|xlsx|pptx|zip|tar|gz))',
            r'(?:file|document|script|module)\s+(?:named\s+)?([a-zA-Z0-9_.-]+)',
            r'([a-zA-Z0-9_/-]+/[a-zA-Z0-9_.-]+)',
            r'(?:folder|directory)\s+([a-zA-Z0-9_/-]+)',
            r'`([^`]+\.[a-zA-Z0-9]+)`',  # Files in backticks
            r'"([^"]+\.[a-zA-Z0-9]+)"',  # Files in quotes
        ]
        # Load recommendation keywords/phrases from config file
        self.recommendation_phrases = []
        if recommendation_config:
            self._load_recommendation_phrases(recommendation_config)
        self._init_database()
    
    def _load_recommendation_phrases(self, config_path):
        # Config file: one phrase per line, ignore empty lines and comments
        with open(config_path, 'r') as f:
            self.recommendation_phrases = [line.strip() for line in f if line.strip() and not line.strip().startswith('#')]

    def _init_database(self):
        """Initialize SQLite database with unified schema"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Unified events table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS events (
                event_id TEXT PRIMARY KEY,
                timestamp REAL NOT NULL,
                event_type TEXT NOT NULL,
                metadata TEXT NOT NULL,
                created_at REAL DEFAULT (julianday('now'))
            )
        ''')
        
        # Correlation table for linking file changes to milestones
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS correlations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                file_event_id TEXT,
                milestone_event_id TEXT,
                correlation_strength REAL,
                correlation_type TEXT,
                created_at REAL DEFAULT (julianday('now')),
                FOREIGN KEY (file_event_id) REFERENCES events (event_id),
                FOREIGN KEY (milestone_event_id) REFERENCES events (event_id)
            )
        ''')
        
        # Add communication_threads table (from milestone_generator.py)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS communication_threads (
                thread_id TEXT PRIMARY KEY,
                subject TEXT,
                participants TEXT,
                start_date REAL,
                end_date REAL,
                message_count INTEGER,
                key_topics TEXT
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
    
    def get_file_info(self, file_path: Path, depth: int = 0) -> Optional[FileInfo]:
        """Extract comprehensive file metadata"""
        try:
            stat = file_path.stat()
            mime_type, _ = mimetypes.guess_type(str(file_path))
            if not mime_type:
                mime_type = "application/octet-stream"
            
            return FileInfo(
                name=file_path.name,
                path=str(file_path.relative_to(file_path.parent)),
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
    
    def scan_directory(self, directory_path: str) -> TimelineEvent:
        """Scan a directory and create a file scan event"""
        root_path = Path(directory_path).resolve()
        print(f"Scanning directory: {root_path}")
        
        start_time = datetime.now()
        
        if not root_path.exists():
            raise FileNotFoundError(f"Directory does not exist: {root_path}")
        
        if not root_path.is_dir():
            raise NotADirectoryError(f"Path is not a directory: {root_path}")
        
        # Recursively scan directory
        tree_structure = self._scan_folder(root_path, root_path)
        
        end_time = datetime.now()
        scan_duration = (end_time - start_time).total_seconds()
        
        # Create timeline event
        event_metadata = {
            'root_path': str(root_path),
            'scan_duration': scan_duration,
            'tree_structure': asdict(tree_structure) if tree_structure else None,
            'file_count': tree_structure.file_count if tree_structure else 0,
            'total_size': tree_structure.size if tree_structure else 0,
            'scan_timestamp': start_time.isoformat()
        }
        
        event = TimelineEvent(
            event_id=f"filescan_{int(start_time.timestamp())}_{hash(str(root_path))}",
            timestamp=start_time.timestamp(),
            event_type='file_scan',
            metadata=event_metadata
        )
        
        print(f"Directory scan completed in {scan_duration:.2f}s")
        print(f"Files: {event_metadata['file_count']}, Total size: {event_metadata['total_size']:,} bytes")
        
        return event
    
    def _scan_folder(self, folder_path: Path, root_path: Path, depth: int = 0) -> Optional[FolderInfo]:
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
                    folder_info = self._scan_folder(item, root_path, depth + 1)
                    if folder_info:
                        children.append({
                            'type': 'folder',
                            'data': asdict(folder_info)
                        })
                        total_size += folder_info.size
                        file_count += folder_info.file_count
            
            stat = folder_path.stat()
            return FolderInfo(
                name=folder_path.name if folder_path != root_path else "root",
                path=str(folder_path.relative_to(root_path)) if folder_path != root_path else "",
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
    
    def extract_milestones_from_emails(self, email_directory: str) -> List[TimelineEvent]:
        """Extract milestone events from email directory"""
        milestone_events = []
        email_path = Path(email_directory)
        
        if not email_path.exists():
            print(f"Email directory does not exist: {email_directory}")
            return milestone_events
        
        # Support multiple email formats
        for pattern in ['*.eml', '*.msg', '*.txt']:
            for email_file in email_path.glob(pattern):
                try:
                    if email_file.suffix.lower() == '.msg':
                        milestones = self._extract_from_msg_file(email_file)
                    elif email_file.suffix.lower() == '.eml':
                        milestones = self._extract_from_eml_file(email_file)
                    elif email_file.suffix.lower() == '.txt':
                        milestones = self._extract_from_text_email(email_file)
                    
                    # Convert milestones to timeline events
                    for milestone in milestones:
                        event = TimelineEvent(
                            event_id=f"milestone_{milestone.id}",
                            timestamp=milestone.timestamp,
                            event_type='milestone',
                            metadata=asdict(milestone)
                        )
                        milestone_events.append(event)
                        
                except Exception as e:
                    print(f"Error processing {email_file}: {e}")
        
        print(f"Extracted {len(milestone_events)} milestone events from emails")
        return milestone_events
    
    def _extract_from_msg_file(self, msg_file: Path) -> List[Milestone]:
        """Extract milestones from Outlook .msg file"""
        if not MSG_SUPPORT:
            print(f"Skipping {msg_file}: extract_msg not available")
            return []
        
        try:
            msg = extract_msg.Message(str(msg_file))
            
            # Extract email metadata
            subject = msg.subject or ""
            sender = msg.sender or ""
            date = msg.date
            body = msg.body or ""
            
            # Convert date to timestamp
            if date:
                if isinstance(date, str):
                    try:
                        timestamp = datetime.strptime(date, "%a, %d %b %Y %H:%M:%S %z").timestamp()
                    except ValueError:
                        try:
                            timestamp = datetime.strptime(date, "%Y-%m-%d %H:%M:%S").timestamp()
                        except ValueError:
                            timestamp = datetime.now().timestamp()
                else:
                    timestamp = date.timestamp()
            else:
                timestamp = datetime.now().timestamp()
            
            # Extract participants
            participants = []
            if sender:
                participants.append(sender)
            if hasattr(msg, 'to') and msg.to:
                participants.extend(msg.to.split(';'))
            if hasattr(msg, 'cc') and msg.cc:
                participants.extend(msg.cc.split(';'))
            
            participants = [p.strip() for p in participants if p.strip()]
            
            return self._extract_milestones_from_content(
                subject=subject,
                body=body,
                timestamp=timestamp,
                participants=participants,
                source_id=str(msg_file)
            )
            
        except Exception as e:
            print(f"Error reading .msg file {msg_file}: {e}")
            return []
    
    def _extract_from_eml_file(self, eml_file: Path) -> List[Milestone]:
        """Extract milestones from .eml file"""
        try:
            with open(eml_file, 'r', encoding='utf-8', errors='ignore') as f:
                msg = email.message_from_file(f)
                return self._extract_from_email_message(msg, str(eml_file))
        except Exception as e:
            print(f"Error reading .eml file {eml_file}: {e}")
            return []
    
    def _extract_from_text_email(self, text_file: Path) -> List[Milestone]:
        """Extract milestones from plain text email file"""
        try:
            with open(text_file, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            # Parse text email format
            lines = content.split('\n')
            subject = ""
            sender = ""
            body = ""
            date_str = ""
            participants = []
            
            body_start = 0
            for i, line in enumerate(lines):
                line_lower = line.lower().strip()
                
                if line_lower.startswith('subject:'):
                    subject = line[8:].strip()
                elif line_lower.startswith('from:'):
                    sender = line[5:].strip()
                    participants.append(sender)
                elif line_lower.startswith('to:'):
                    to_addresses = line[3:].strip().split(',')
                    participants.extend([addr.strip() for addr in to_addresses])
                elif line_lower.startswith('date:'):
                    date_str = line[5:].strip()
                elif line.strip() == "" and i > 0:
                    body_start = i + 1
                    break
            
            body = '\n'.join(lines[body_start:])
            
            if not subject and not sender:
                body = content
                subject = f"Text file: {text_file.name}"
            
            # Parse timestamp
            timestamp = datetime.now().timestamp()
            if date_str:
                try:
                    for fmt in ["%a, %d %b %Y %H:%M:%S %z", "%Y-%m-%d %H:%M:%S", "%m/%d/%Y %H:%M"]:
                        try:
                            timestamp = datetime.strptime(date_str, fmt).timestamp()
                            break
                        except ValueError:
                            continue
                except:
                    pass
            
            participants = [p.strip() for p in participants if p.strip()]
            
            return self._extract_milestones_from_content(
                subject=subject,
                body=body,
                timestamp=timestamp,
                participants=participants,
                source_id=str(text_file)
            )
            
        except Exception as e:
            print(f"Error reading text file {text_file}: {e}")
            return []
    
    def _extract_from_email_message(self, msg: email.message.Message, source_id: str) -> List[Milestone]:
        """Extract milestones from email message object"""
        # Extract basic email info
        subject = self._decode_email_header(msg.get('Subject', ''))
        sender = self._decode_email_header(msg.get('From', ''))
        date_str = msg.get('Date', '')
        
        try:
            timestamp = email.utils.parsedate_to_datetime(date_str).timestamp()
        except:
            timestamp = datetime.now().timestamp()
        
        # Get email body
        body = self._extract_email_body(msg)
        if not body:
            return []
        
        # Extract participants
        participants = self._extract_participants(msg)
        
        return self._extract_milestones_from_content(
            subject=subject,
            body=body,
            timestamp=timestamp,
            participants=participants,
            source_id=source_id
        )
    
    def _extract_milestones_from_content(self, subject: str, body: str, 
                                        timestamp: float, participants: List[str], 
                                        source_id: str) -> List[Milestone]:
        """Extract milestones from email content (unified method)"""
        milestones = []
        
        # Combine subject and body for analysis
        full_content = f"{subject}\n\n{body}"
        
        if not full_content.strip():
            return milestones
        
        # Look for milestone patterns
        for category, patterns in self.milestone_patterns.items():
            for pattern in patterns:
                matches = re.finditer(pattern, full_content, re.IGNORECASE | re.MULTILINE)
                for match in matches:
                    # Extract the milestone text
                    milestone_text = match.group(1) if match.groups() else match.group(0)
                    milestone_text = milestone_text.strip()
                    
                    if len(milestone_text) < 5:  # Skip very short matches
                        continue
                    
                    # Determine priority based on keywords
                    priority = self._determine_priority(full_content, milestone_text)
                    
                    # Extract related files
                    related_files = self._extract_file_references(full_content)
                    
                    # Calculate confidence based on context
                    confidence = self._calculate_confidence(category, milestone_text, full_content)
                    
                    milestone = Milestone(
                        id=f"email_{abs(hash(source_id + milestone_text))}",
                        timestamp=timestamp,
                        title=self._generate_milestone_title(category, milestone_text),
                        description=milestone_text,
                        category=category,
                        priority=priority,
                        participants=participants,
                        source='email',
                        source_id=source_id,
                        status='pending',
                        related_files=related_files,
                        confidence=confidence
                    )
                    
                    milestones.append(milestone)
        
        return milestones
    
    def _decode_email_header(self, header: str) -> str:
        """Decode email header with proper encoding"""
        if not header:
            return ""
        
        decoded_parts = decode_header(header)
        decoded_header = ""
        
        for part, encoding in decoded_parts:
            if isinstance(part, bytes):
                decoded_header += part.decode(encoding or 'utf-8', errors='ignore')
            else:
                decoded_header += part
        
        return decoded_header.strip()
    
    def _extract_email_body(self, msg: email.message.Message) -> str:
        """Extract text body from email message"""
        body = ""
        
        if msg.is_multipart():
            for part in msg.walk():
                if part.get_content_type() == "text/plain":
                    payload = part.get_payload(decode=True)
                    if payload:
                        body += payload.decode('utf-8', errors='ignore')
        else:
            payload = msg.get_payload(decode=True)
            if payload:
                body = payload.decode('utf-8', errors='ignore')
        
        return body
    
    def _extract_participants(self, msg: email.message.Message) -> List[str]:
        """Extract email participants"""
        participants = []
        
        for header in ['From', 'To', 'Cc']:
            value = msg.get(header, '')
            if value:
                emails = re.findall(r'[\w\.-]+@[\w\.-]+\.\w+', value)
                participants.extend(emails)
        
        return list(set(participants))
    
    def _extract_file_references(self, text: str) -> List[str]:
        """Extract file path references from text"""
        files = []
        
        for pattern in self.file_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            files.extend(matches)
        
        return list(set(files))
    
    def _determine_priority(self, context: str, milestone_text: str) -> str:
        """Determine milestone priority based on context"""
        high_priority_keywords = ['urgent', 'asap', 'critical', 'immediately', 'emergency']
        medium_priority_keywords = ['important', 'priority', 'soon', 'needed']
        
        combined_text = (context + " " + milestone_text).lower()
        
        if any(keyword in combined_text for keyword in high_priority_keywords):
            return 'high'
        elif any(keyword in combined_text for keyword in medium_priority_keywords):
            return 'medium'
        else:
            return 'low'
    
    def _calculate_confidence(self, category: str, milestone_text: str, context: str) -> float:
        """Calculate confidence score for extracted milestone"""
        confidence = 0.5  # Base confidence
        
        # Increase confidence for clear patterns
        if category in ['deadline', 'meeting'] and re.search(r'\d{1,2}', milestone_text):
            confidence += 0.3
        
        # Increase confidence for structured context
        if any(word in context.lower() for word in ['project', 'deliverable', 'requirement']):
            confidence += 0.2
        
        # Decrease confidence for very short text
        if len(milestone_text) < 20:
            confidence -= 0.2
        
        return max(0.0, min(1.0, confidence))
    
    def _generate_milestone_title(self, category: str, description: str) -> str:
        """Generate a concise title for the milestone"""
        title = description[:50].strip()
        if len(description) > 50:
            title += "..."
        
        # Add category prefix
        category_prefixes = {
            'deadline': '⏰',
            'requirement': '📋',
            'deliverable': '📦',
            'meeting': '🤝',
            'decision': '✅',
            'issue': '⚠️'
        }
        
        prefix = category_prefixes.get(category, '📌')
        return f"{prefix} {title}"
    
    def store_events(self, events: List[TimelineEvent]):
        """Store timeline events in database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        for event in events:
            cursor.execute('''
                INSERT OR REPLACE INTO events (event_id, timestamp, event_type, metadata)
                VALUES (?, ?, ?, ?)
            ''', (
                event.event_id,
                event.timestamp,
                event.event_type,
                json.dumps(event.metadata)
            ))
        
        conn.commit()
        conn.close()
        print(f"Stored {len(events)} events in database")
    
    def analyze_correlations(self):
        """Analyze correlations between file changes and milestones"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Get file scan events and milestone events
        cursor.execute("SELECT * FROM events WHERE event_type = 'file_scan' ORDER BY timestamp")
        file_events = cursor.fetchall()
        
        cursor.execute("SELECT * FROM events WHERE event_type = 'milestone' ORDER BY timestamp")
        milestone_events = cursor.fetchall()
        
        correlations = []
        
        for milestone_row in milestone_events:
            milestone_data = json.loads(milestone_row[3])  # metadata
            milestone_timestamp = milestone_row[1]
            milestone_files = milestone_data.get('related_files', [])
            
            # Find file scans within a reasonable time window
            for file_row in file_events:
                file_timestamp = file_row[1]
                time_diff = abs(milestone_timestamp - file_timestamp)
                
                # Correlate if within 7 days
                if time_diff <= 7 * 24 * 3600:  # 7 days in seconds
                    file_data = json.loads(file_row[3])
                    
                    # Calculate correlation strength based on file mentions
                    correlation_strength = self._calculate_file_correlation(
                        milestone_files, file_data
                    )
                    
                    if correlation_strength > 0.1:  # Minimum threshold
                        correlations.append({
                            'file_event_id': file_row[0],
                            'milestone_event_id': milestone_row[0],
                            'correlation_strength': correlation_strength,
                            'correlation_type': 'temporal_file_mention'
                        })
        
        # Store correlations
        for corr in correlations:
            cursor.execute('''
                INSERT OR REPLACE INTO correlations 
                (file_event_id, milestone_event_id, correlation_strength, correlation_type)
                VALUES (?, ?, ?, ?)
            ''', (
                corr['file_event_id'], corr['milestone_event_id'],
                corr['correlation_strength'], corr['correlation_type']
            ))
        
        conn.commit()
        conn.close()
        print(f"Analyzed and stored {len(correlations)} correlations")
    
    def _calculate_file_correlation(self, milestone_files: List[str], file_data: Dict[str, Any]) -> float:
        """Calculate correlation strength between milestone and file scan"""
        if not milestone_files:
            return 0.0
        
        # Simple correlation based on file name matching
        correlation = 0.0
        
        def extract_file_names(data, names=None):
            if names is None:
                names = set()
            
            if isinstance(data, dict):
                if 'name' in data:
                    names.add(data['name'])
                for value in data.values():
                    extract_file_names(value, names)
            elif isinstance(data, list):
                for item in data:
                    extract_file_names(item, names)
            
            return names
        
        scan_files = extract_file_names(file_data)
        
        # Check for file name matches
        for milestone_file in milestone_files:
            if any(milestone_file.lower() in scan_file.lower() for scan_file in scan_files):
                correlation += 0.5
        
        return min(1.0, correlation)
    
    def export_unified_timeline(self, output_file: str = "unified_timeline.json") -> Dict[str, Any]:
        """Export unified timeline data for frontend visualization"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Get all events ordered by timestamp
        cursor.execute("SELECT * FROM events ORDER BY timestamp")
        events = cursor.fetchall()
        
        # Get correlations
        cursor.execute("SELECT * FROM correlations")
        correlations = cursor.fetchall()
        
        # Transform for frontend
        export_data = {
            'metadata': {
                'generated_at': datetime.now().isoformat(),
                'total_events': len(events),
                'event_types': {},
                'time_range': {
                    'start': events[0][1] if events else 0,
                    'end': events[-1][1] if events else 0
                }
            },
            'events': [],
            'correlations': []
        }
        
        # Count event types
        event_type_counts = {}
        for event in events:
            event_type = event[2]
            event_type_counts[event_type] = event_type_counts.get(event_type, 0) + 1
        
        export_data['metadata']['event_types'] = event_type_counts
        
        # Add events
        for event in events:
            event_data = {
                'event_id': event[0],
                'timestamp': event[1],
                'event_type': event[2],
                'metadata': json.loads(event[3])
            }
            export_data['events'].append(event_data)
        
        # Add correlations
        for corr in correlations:
            corr_data = {
                'id': corr[0],
                'file_event_id': corr[1],
                'milestone_event_id': corr[2],
                'correlation_strength': corr[3],
                'correlation_type': corr[4]
            }
            export_data['correlations'].append(corr_data)
        
        conn.close()
        
        # Write to file
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(export_data, f, indent=2, ensure_ascii=False)
        
        print(f"Unified timeline exported to: {output_file}")
        print(f"Total events: {len(events)}")
        print(f"Event types: {event_type_counts}")
        print(f"Correlations: {len(correlations)}")
        
        return export_data

    def extract_milestones_from_documents(self, doc_directory: str) -> List[TimelineEvent]:
        """Extract milestone events from project documents."""
        milestone_events = []
        doc_path = Path(doc_directory)

        if not doc_path.exists():
            print(f"Document directory does not exist: {doc_directory}")
            return milestone_events

        # Support various document formats
        for pattern in ['*.txt', '*.md', '*.rst']:
            for doc_file in doc_path.glob(pattern):
                try:
                    with open(doc_file, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                        milestones = self._extract_milestones_from_text_content(content, str(doc_file))
                        # Convert milestones to timeline events
                        for milestone in milestones:
                            event = TimelineEvent(
                                event_id=f"milestone_{milestone.id}",
                                timestamp=milestone.timestamp,
                                event_type='milestone',
                                metadata=asdict(milestone)
                            )
                            milestone_events.append(event)
                except Exception as e:
                    print(f"Error processing {doc_file}: {e}")
        
        print(f"Extracted {len(milestone_events)} milestone events from documents")
        return milestone_events

    def _extract_milestones_from_text_content(self, text: str, source_id: str) -> List[Milestone]:
        """Extract milestones from plain text content (e.g., from documents)."""
        milestones = []
        
        # Look for structured formats like TODO, FIXME, NOTE
        structured_patterns = {
            'requirement': [r'TODO:\s*(.{10,200})', r'REQUIREMENT:\s*(.{10,200})'],
            'issue': [r'FIXME:\s*(.{10,200})', r'BUG:\s*(.{10,200})'],
            'deliverable': [r'DONE:\s*(.{10,200})', r'COMPLETED:\s*(.{10,200})']
        }
        
        timestamp = datetime.now().timestamp()
        
        for category, patterns in structured_patterns.items():
            for pattern in patterns:
                matches = re.finditer(pattern, text, re.IGNORECASE | re.MULTILINE)
                for match in matches:
                    milestone_text = match.group(1).strip()
                    
                    milestone = Milestone(
                        id=f"doc_{abs(hash(source_id + milestone_text))}",
                        timestamp=timestamp,
                        title=self._generate_milestone_title(category, milestone_text),
                        description=milestone_text,
                        category=category,
                        priority='medium',
                        participants=[],
                        source='document',
                        source_id=source_id,
                        status='pending',
                        related_files=self._extract_file_references(text),
                        confidence=0.8
                    )
                    
                    milestones.append(milestone)
        
        return milestones

    def extract_recommendations_from_text(self, text: str, source_id: str, timestamp: float) -> List[TimelineEvent]:
        """Scan text for user-defined recommendation phrases and create recommendation events"""
        events = []
        for phrase in self.recommendation_phrases:
            # Case-insensitive search for phrase
            for match in re.finditer(re.escape(phrase), text, re.IGNORECASE):
                # Extract context: sentence or paragraph
                start, end = match.span()
                # Find sentence boundaries
                before = text.rfind('.', 0, start)
                after = text.find('.', end)
                context = text[before+1:after+1].strip() if before != -1 and after != -1 else text[max(0, start-60):min(len(text), end+60)].strip()
                event_id = f"recommendation_{hash(source_id + phrase + str(start))}"
                event = TimelineEvent(
                    event_id=event_id,
                    timestamp=timestamp,
                    event_type='recommendation',
                    metadata={
                        'phrase': phrase,
                        'context': context,
                        'source_id': source_id
                    }
                )
                events.append(event)
        return events

    def extract_communication_threads(self, email_directory: str) -> List[CommunicationThread]:
        """Extract communication threads from emails (group by subject/participants) and store in DB"""
        from collections import defaultdict
        import hashlib
        import json
        email_path = Path(email_directory)
        thread_groups = defaultdict(list)
        email_infos = []

        # Helper to normalize subject
        def normalize_subject(subject):
            subject = subject.lower().strip()
            for prefix in ["re:", "fw:", "fwd:"]:
                if subject.startswith(prefix):
                    subject = subject[len(prefix):].strip()
            return subject

        # Parse all emails and group by (normalized subject, sorted participants)
        for pattern in ['*.eml', '*.msg', '*.txt']:
            for email_file in email_path.glob(pattern):
                try:
                    if email_file.suffix.lower() == '.msg':
                        msg = None
                        if MSG_SUPPORT:
                            import extract_msg
                            msg_obj = extract_msg.Message(str(email_file))
                            subject = msg_obj.subject or ""
                            sender = msg_obj.sender or ""
                            date = msg_obj.date
                            body = msg_obj.body or ""
                            # Convert date to timestamp
                            if date:
                                try:
                                    timestamp = datetime.strptime(date, "%a, %d %b %Y %H:%M:%S %z").timestamp()
                                except Exception:
                                    try:
                                        timestamp = datetime.strptime(date, "%Y-%m-%d %H:%M:%S").timestamp()
                                    except Exception:
                                        timestamp = datetime.now().timestamp()
                            else:
                                timestamp = datetime.now().timestamp()
                            participants = [sender]
                            if hasattr(msg_obj, 'to') and msg_obj.to:
                                participants.extend(msg_obj.to.split(';'))
                            if hasattr(msg_obj, 'cc') and msg_obj.cc:
                                participants.extend(msg_obj.cc.split(';'))
                            participants = [p.strip() for p in participants if p.strip()]
                        else:
                            continue
                    elif email_file.suffix.lower() == '.eml':
                        with open(email_file, 'r', encoding='utf-8', errors='ignore') as f:
                            import email as pyemail
                            msg = pyemail.message_from_file(f)
                            subject = msg.get('Subject', '')
                            sender = msg.get('From', '')
                            date_str = msg.get('Date', '')
                            try:
                                timestamp = pyemail.utils.parsedate_to_datetime(date_str).timestamp()
                            except Exception:
                                timestamp = datetime.now().timestamp()
                            # Participants
                            participants = []
                            for header in ['From', 'To', 'Cc']:
                                value = msg.get(header, '')
                                if value:
                                    emails = re.findall(r'[\w\.-]+@[\w\.-]+\.\w+', value)
                                    participants.extend(emails)
                            participants = list(set([p.strip() for p in participants if p.strip()]))
                    elif email_file.suffix.lower() == '.txt':
                        with open(email_file, 'r', encoding='utf-8', errors='ignore') as f:
                            lines = f.read().split('\n')
                        subject = ""
                        sender = ""
                        date_str = ""
                        participants = []
                        body_start = 0
                        for i, line in enumerate(lines):
                            line_lower = line.lower().strip()
                            if line_lower.startswith('subject:'):
                                subject = line[8:].strip()
                            elif line_lower.startswith('from:'):
                                sender = line[5:].strip()
                                participants.append(sender)
                            elif line_lower.startswith('to:'):
                                to_addresses = line[3:].strip().split(',')
                                participants.extend([addr.strip() for addr in to_addresses])
                            elif line_lower.startswith('cc:'):
                                cc_addresses = line[3:].strip().split(',')
                                participants.extend([addr.strip() for addr in cc_addresses])
                            elif line_lower.startswith('date:'):
                                date_str = line[5:].strip()
                            elif line.strip() == "" and i > 0:
                                body_start = i + 1
                                break
                        try:
                            for fmt in [
                                "%a, %d %b %Y %H:%M:%S %z",
                                "%Y-%m-%d %H:%M:%S",
                                "%m/%d/%Y %H:%M",
                                "%d/%m/%Y %H:%M"
                            ]:
                                try:
                                    timestamp = datetime.strptime(date_str, fmt).timestamp()
                                    break
                                except Exception:
                                    continue
                            else:
                                timestamp = datetime.now().timestamp()
                        except Exception:
                            timestamp = datetime.now().timestamp()
                        participants = [p.strip() for p in participants if p.strip()]
                    else:
                        continue
                    norm_subject = normalize_subject(subject)
                    key = (norm_subject, tuple(sorted(participants)))
                    email_infos.append({
                        'subject': norm_subject,
                        'participants': participants,
                        'timestamp': timestamp,
                        'file': str(email_file)
                    })
                    thread_groups[key].append(timestamp)
                except Exception as e:
                    print(f"Error processing {email_file}: {e}")

        threads = []
        for (subject, participants), timestamps in thread_groups.items():
            if not timestamps:
                continue
            start_date = min(timestamps)
            end_date = max(timestamps)
            message_count = len(timestamps)
            # Simple key_topics: most common words in subject (could be improved)
            words = re.findall(r'\w+', subject)
            word_freq = {}
            for w in words:
                word_freq[w] = word_freq.get(w, 0) + 1
            key_topics = sorted(word_freq, key=word_freq.get, reverse=True)[:5]
            thread_id = hashlib.sha1((subject + ' '.join(participants)).encode('utf-8')).hexdigest()
            thread = CommunicationThread(
                thread_id=thread_id,
                subject=subject,
                participants=list(participants),
                start_date=start_date,
                end_date=end_date,
                message_count=message_count,
                key_topics=key_topics
            )
            threads.append(thread)
        self._store_communication_threads(threads)
        return threads

    def _store_communication_threads(self, threads: List[CommunicationThread]):
        import json
        conn = sqlite3.connect(self.db_path)
        for thread in threads:
            conn.execute('''
                INSERT OR REPLACE INTO communication_threads
                (thread_id, subject, participants, start_date, end_date, message_count, key_topics)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                thread.thread_id,
                thread.subject,
                json.dumps(thread.participants),
                thread.start_date,
                thread.end_date,
                thread.message_count,
                json.dumps(thread.key_topics)
            ))
        conn.commit()
        conn.close()

    def export_communication_threads(self, output_file: str = "communication_threads.json") -> None:
        """Export all communication threads to a JSON file"""
        import json
        conn = sqlite3.connect(self.db_path)
        cursor = conn.execute('SELECT thread_id, subject, participants, start_date, end_date, message_count, key_topics FROM communication_threads ORDER BY start_date')
        threads = []
        for row in cursor.fetchall():
            thread = {
                'thread_id': row[0],
                'subject': row[1],
                'participants': json.loads(row[2]),
                'start_date': row[3],
                'end_date': row[4],
                'message_count': row[5],
                'key_topics': json.loads(row[6])
            }
            threads.append(thread)
        conn.close()
        with open(output_file, 'w') as f:
            json.dump({'threads': threads}, f, indent=2)
        print(f"Exported {len(threads)} communication threads to {output_file}")


def main():
    """CLI interface for the unified timeline generator"""
    parser = argparse.ArgumentParser(
        description="Generate unified timeline visualization from file scans and milestones"
    )
    parser.add_argument(
        "--scan-dir", 
        help="Directory to scan for file tree timeline"
    )
    parser.add_argument(
        "--email-dir", 
        help="Directory containing email files for milestone extraction"
    )
    parser.add_argument(
        "--docs-dir",
        help="Directory containing project document files for milestone extraction"
    )
    parser.add_argument(
        "--output", "-o",
        default="unified_timeline.json",
        help="Output JSON file path (default: unified_timeline.json)"
    )
    parser.add_argument(
        "--db", "-d",
        default="unified_timeline.db",
        help="SQLite database path (default: unified_timeline.db)"
    )
    parser.add_argument(
        "--correlate",
        action="store_true",
        help="Analyze correlations between file changes and milestones"
    )
    
    args = parser.parse_args()
    
    try:
        generator = UnifiedTimelineGenerator(args.db)
        all_events = []
        
        # Scan directory if provided
        if args.scan_dir:
            print(f"Scanning directory: {args.scan_dir}")
            file_event = generator.scan_directory(args.scan_dir)
            all_events.append(file_event)
        
        # Extract milestones if email directory provided
        if args.email_dir:
            print(f"Extracting milestones from: {args.email_dir}")
            milestone_events = generator.extract_milestones_from_emails(args.email_dir)
            all_events.extend(milestone_events)
        
        # Extract milestones from documents if provided
        if args.docs_dir:
            print(f"Extracting milestones from documents in: {args.docs_dir}")
            doc_milestone_events = generator.extract_milestones_from_documents(args.docs_dir)
            all_events.extend(doc_milestone_events)
        
        # Store events
        if all_events:
            # Sort events by timestamp before storing and processing
            all_events.sort(key=lambda x: x.timestamp)
            generator.store_events(all_events)
            
            # Analyze correlations if requested
            if args.correlate:
                generator.analyze_correlations()
            
            # Export unified timeline
            generator.export_unified_timeline(args.output)
        else:
            print("No events generated. Please specify --scan-dir, --email-dir, or --docs-dir")
            
    except Exception as e:
        print(f"Error: {e}")
        return 1
    
    return 0


if __name__ == "__main__":
    exit(main())