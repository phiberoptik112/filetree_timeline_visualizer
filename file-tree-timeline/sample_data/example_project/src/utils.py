"""
Utility Classes and Functions

Common functionality shared across the application including database management,
logging, configuration handling, and various helper functions.
"""

import os
import json
import sqlite3
import logging
import hashlib
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from contextlib import contextmanager


class ConfigLoader:
    """Configuration management with environment variable support"""
    
    def __init__(self, config_path: str = 'config.json'):
        self.config_path = config_path
        self._config = self._load_config()
    
    def _load_config(self) -> Dict[str, Any]:
        """Load configuration from file with environment variable overrides"""
        config = {}
        
        # Load from file if it exists
        if os.path.exists(self.config_path):
            try:
                with open(self.config_path, 'r') as f:
                    config = json.load(f)
            except (json.JSONDecodeError, IOError) as e:
                logging.warning(f"Failed to load config from {self.config_path}: {e}")
        
        # Override with environment variables
        env_mappings = {
            'DATABASE_URL': 'database_url',
            'SECRET_KEY': 'secret_key',
            'DEBUG': 'debug',
            'LOG_LEVEL': 'log_level'
        }
        
        for env_var, config_key in env_mappings.items():
            if env_var in os.environ:
                value = os.environ[env_var]
                # Convert boolean strings
                if value.lower() in ('true', 'false'):
                    value = value.lower() == 'true'
                config[config_key] = value
        
        return config
    
    def get(self, key: str, default: Any = None) -> Any:
        """Get configuration value with optional default"""
        return self._config.get(key, default)
    
    def set(self, key: str, value: Any) -> None:
        """Set configuration value"""
        self._config[key] = value
    
    def reload(self) -> None:
        """Reload configuration from file"""
        self._config = self._load_config()


class DatabaseManager:
    """SQLite database management with connection pooling and migrations"""
    
    def __init__(self, database_url: str = 'app.db'):
        self.database_url = database_url
        self._setup_database()
    
    def _setup_database(self) -> None:
        """Initialize database schema"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Users table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    preferences TEXT DEFAULT '{}',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Request logs table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS request_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    method TEXT NOT NULL,
                    path TEXT NOT NULL,
                    status_code INTEGER,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    duration_ms INTEGER
                )
            ''')
            
            # Application metrics table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    metric_name TEXT NOT NULL,
                    metric_value REAL NOT NULL,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            conn.commit()
    
    @contextmanager
    def get_connection(self):
        """Context manager for database connections"""
        conn = sqlite3.connect(self.database_url)
        conn.row_factory = sqlite3.Row  # Enable dictionary-like access
        try:
            yield conn
        finally:
            conn.close()
    
    def is_connected(self) -> bool:
        """Check if database is accessible"""
        try:
            with self.get_connection() as conn:
                conn.execute('SELECT 1')
                return True
        except Exception:
            return False
    
    def create_user(self, name: str, email: str, preferences: Dict = None) -> int:
        """Create a new user and return the user ID"""
        if preferences is None:
            preferences = {}
        
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO users (name, email, preferences)
                VALUES (?, ?, ?)
            ''', (name, email, json.dumps(preferences)))
            conn.commit()
            return cursor.lastrowid
    
    def get_user(self, user_id: int) -> Optional[Dict]:
        """Retrieve user by ID"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
            row = cursor.fetchone()
            
            if row:
                user = dict(row)
                user['preferences'] = json.loads(user['preferences'])
                return user
            return None
    
    def get_users_paginated(self, page: int, per_page: int) -> List[Dict]:
        """Retrieve users with pagination"""
        offset = (page - 1) * per_page
        
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT * FROM users 
                ORDER BY created_at DESC 
                LIMIT ? OFFSET ?
            ''', (per_page, offset))
            
            users = []
            for row in cursor.fetchall():
                user = dict(row)
                user['preferences'] = json.loads(user['preferences'])
                users.append(user)
            
            return users
    
    def update_user(self, user_id: int, data: Dict) -> bool:
        """Update user information"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Build dynamic update query
            set_clauses = []
            values = []
            
            for key, value in data.items():
                if key in ('name', 'email'):
                    set_clauses.append(f'{key} = ?')
                    values.append(value)
                elif key == 'preferences':
                    set_clauses.append('preferences = ?')
                    values.append(json.dumps(value))
            
            if not set_clauses:
                return False
            
            set_clauses.append('updated_at = CURRENT_TIMESTAMP')
            values.append(user_id)
            
            query = f"UPDATE users SET {', '.join(set_clauses)} WHERE id = ?"
            cursor.execute(query, values)
            conn.commit()
            
            return cursor.rowcount > 0
    
    def delete_user(self, user_id: int) -> bool:
        """Delete user by ID"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('DELETE FROM users WHERE id = ?', (user_id,))
            conn.commit()
            return cursor.rowcount > 0
    
    def count(self, table: str) -> int:
        """Count records in a table"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(f'SELECT COUNT(*) FROM {table}')
            return cursor.fetchone()[0]
    
    def log_request(self, method: str, path: str, status_code: int, duration_ms: int) -> None:
        """Log request information"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO request_logs (method, path, status_code, duration_ms)
                VALUES (?, ?, ?, ?)
            ''', (method, path, status_code, duration_ms))
            conn.commit()


class Logger:
    """Enhanced logging with request tracking and metrics"""
    
    def __init__(self, name: str, level: str = 'INFO'):
        self.logger = logging.getLogger(name)
        self.logger.setLevel(getattr(logging, level.upper()))
        
        if not self.logger.handlers:
            # Console handler
            console_handler = logging.StreamHandler()
            console_handler.setLevel(logging.DEBUG)
            
            # File handler
            file_handler = logging.FileHandler('app.log')
            file_handler.setLevel(logging.INFO)
            
            # Formatter
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            console_handler.setFormatter(formatter)
            file_handler.setFormatter(formatter)
            
            self.logger.addHandler(console_handler)
            self.logger.addHandler(file_handler)
        
        self.request_count = 0
    
    def info(self, message: str) -> None:
        """Log info message"""
        self.logger.info(message)
    
    def warning(self, message: str) -> None:
        """Log warning message"""
        self.logger.warning(message)
    
    def error(self, message: str) -> None:
        """Log error message"""
        self.logger.error(message)
    
    def debug(self, message: str) -> None:
        """Log debug message"""
        self.logger.debug(message)
    
    def log_request(self, method: str, path: str, status_code: int) -> None:
        """Log HTTP request"""
        self.request_count += 1
        self.info(f"{method} {path} - {status_code}")
    
    def get_request_count(self) -> int:
        """Get total request count"""
        return self.request_count


class SecurityUtils:
    """Security-related utility functions"""
    
    @staticmethod
    def hash_password(password: str, salt: str = None) -> tuple:
        """Hash password with salt"""
        if salt is None:
            salt = os.urandom(32).hex()
        
        password_hash = hashlib.pbkdf2_hmac('sha256', 
                                          password.encode('utf-8'), 
                                          salt.encode('utf-8'), 
                                          100000)
        return password_hash.hex(), salt
    
    @staticmethod
    def verify_password(password: str, password_hash: str, salt: str) -> bool:
        """Verify password against hash"""
        computed_hash, _ = SecurityUtils.hash_password(password, salt)
        return computed_hash == password_hash
    
    @staticmethod
    def generate_token(length: int = 32) -> str:
        """Generate secure random token"""
        return os.urandom(length).hex()


class CacheManager:
    """Simple in-memory cache with TTL support"""
    
    def __init__(self, default_ttl: int = 300):
        self.cache = {}
        self.default_ttl = default_ttl
    
    def get(self, key: str) -> Any:
        """Get value from cache"""
        if key in self.cache:
            value, expiry = self.cache[key]
            if datetime.now() < expiry:
                return value
            else:
                del self.cache[key]
        return None
    
    def set(self, key: str, value: Any, ttl: int = None) -> None:
        """Set value in cache with TTL"""
        if ttl is None:
            ttl = self.default_ttl
        
        expiry = datetime.now() + timedelta(seconds=ttl)
        self.cache[key] = (value, expiry)
    
    def delete(self, key: str) -> None:
        """Delete key from cache"""
        if key in self.cache:
            del self.cache[key]
    
    def clear(self) -> None:
        """Clear all cache entries"""
        self.cache.clear()
    
    def cleanup_expired(self) -> int:
        """Remove expired entries and return count"""
        now = datetime.now()
        expired_keys = [
            key for key, (_, expiry) in self.cache.items() 
            if now >= expiry
        ]
        
        for key in expired_keys:
            del self.cache[key]
        
        return len(expired_keys)


def format_file_size(size_bytes: int) -> str:
    """Format file size in human readable format"""
    if size_bytes == 0:
        return "0 B"
    
    size_names = ["B", "KB", "MB", "GB", "TB"]
    i = 0
    while size_bytes >= 1024 and i < len(size_names) - 1:
        size_bytes /= 1024.0
        i += 1
    
    return f"{size_bytes:.1f} {size_names[i]}"


def validate_email(email: str) -> bool:
    """Basic email validation"""
    import re
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


def get_file_extension(filename: str) -> str:
    """Get file extension from filename"""
    return os.path.splitext(filename)[1].lower()


def safe_json_loads(json_str: str, default: Any = None) -> Any:
    """Safely parse JSON string with fallback"""
    try:
        return json.loads(json_str)
    except (json.JSONDecodeError, TypeError):
        return default