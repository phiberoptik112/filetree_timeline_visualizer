#!/usr/bin/env python3
"""
Example Flask Application

A simple web application demonstrating modern Python development practices.
Includes API endpoints, database integration, and configuration management.
"""

import os
import json
from datetime import datetime
from flask import Flask, request, jsonify, render_template
from werkzeug.exceptions import BadRequest, NotFound
from utils import DatabaseManager, Logger, ConfigLoader


class WebApplication:
    """Main application class for the example web service"""
    
    def __init__(self, config_path='config.json'):
        self.app = Flask(__name__)
        self.config = ConfigLoader(config_path)
        self.db = DatabaseManager(self.config.get('database_url'))
        self.logger = Logger('webapp')
        self._setup_routes()
        
    def _setup_routes(self):
        """Configure Flask routes and handlers"""
        
        @self.app.route('/')
        def index():
            """Home page with basic information"""
            return render_template('index.html', 
                                 title='Example Application',
                                 timestamp=datetime.now().isoformat())
        
        @self.app.route('/api/health')
        def health_check():
            """Health check endpoint for monitoring"""
            return jsonify({
                'status': 'healthy',
                'timestamp': datetime.now().isoformat(),
                'version': self.config.get('version', '1.0.0'),
                'database': self.db.is_connected()
            })
        
        @self.app.route('/api/users', methods=['GET', 'POST'])
        def users_handler():
            """Handle user operations"""
            if request.method == 'GET':
                return self._get_users()
            elif request.method == 'POST':
                return self._create_user()
        
        @self.app.route('/api/users/<int:user_id>', methods=['GET', 'PUT', 'DELETE'])
        def user_handler(user_id):
            """Handle individual user operations"""
            if request.method == 'GET':
                return self._get_user(user_id)
            elif request.method == 'PUT':
                return self._update_user(user_id)
            elif request.method == 'DELETE':
                return self._delete_user(user_id)
        
        @self.app.route('/api/analytics')
        def analytics():
            """Provide usage analytics and metrics"""
            return jsonify({
                'total_users': self.db.count('users'),
                'total_requests': self.logger.get_request_count(),
                'uptime': self._get_uptime(),
                'memory_usage': self._get_memory_usage()
            })
        
        @self.app.errorhandler(404)
        def not_found(error):
            return jsonify({'error': 'Resource not found'}), 404
        
        @self.app.errorhandler(500)
        def internal_error(error):
            self.logger.error(f'Internal error: {error}')
            return jsonify({'error': 'Internal server error'}), 500
    
    def _get_users(self):
        """Retrieve all users with pagination support"""
        try:
            page = request.args.get('page', 1, type=int)
            per_page = request.args.get('per_page', 10, type=int)
            
            users = self.db.get_users_paginated(page, per_page)
            total = self.db.count('users')
            
            return jsonify({
                'users': users,
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': total,
                    'pages': (total + per_page - 1) // per_page
                }
            })
        except Exception as e:
            self.logger.error(f'Error fetching users: {e}')
            return jsonify({'error': 'Failed to fetch users'}), 500
    
    def _create_user(self):
        """Create a new user from JSON payload"""
        try:
            data = request.get_json()
            
            if not data or 'name' not in data or 'email' not in data:
                raise BadRequest('Name and email are required')
            
            user_id = self.db.create_user(
                name=data['name'],
                email=data['email'],
                preferences=data.get('preferences', {})
            )
            
            self.logger.info(f'Created user {user_id}: {data["name"]}')
            
            return jsonify({
                'id': user_id,
                'message': 'User created successfully'
            }), 201
            
        except BadRequest as e:
            return jsonify({'error': str(e)}), 400
        except Exception as e:
            self.logger.error(f'Error creating user: {e}')
            return jsonify({'error': 'Failed to create user'}), 500
    
    def _get_user(self, user_id):
        """Retrieve specific user by ID"""
        try:
            user = self.db.get_user(user_id)
            if not user:
                raise NotFound('User not found')
            
            return jsonify(user)
            
        except NotFound as e:
            return jsonify({'error': str(e)}), 404
        except Exception as e:
            self.logger.error(f'Error fetching user {user_id}: {e}')
            return jsonify({'error': 'Failed to fetch user'}), 500
    
    def _update_user(self, user_id):
        """Update user information"""
        try:
            data = request.get_json()
            if not data:
                raise BadRequest('No data provided')
            
            success = self.db.update_user(user_id, data)
            if not success:
                raise NotFound('User not found')
            
            self.logger.info(f'Updated user {user_id}')
            return jsonify({'message': 'User updated successfully'})
            
        except (BadRequest, NotFound) as e:
            return jsonify({'error': str(e)}), 400 if isinstance(e, BadRequest) else 404
        except Exception as e:
            self.logger.error(f'Error updating user {user_id}: {e}')
            return jsonify({'error': 'Failed to update user'}), 500
    
    def _delete_user(self, user_id):
        """Delete user by ID"""
        try:
            success = self.db.delete_user(user_id)
            if not success:
                raise NotFound('User not found')
            
            self.logger.info(f'Deleted user {user_id}')
            return jsonify({'message': 'User deleted successfully'})
            
        except NotFound as e:
            return jsonify({'error': str(e)}), 404
        except Exception as e:
            self.logger.error(f'Error deleting user {user_id}: {e}')
            return jsonify({'error': 'Failed to delete user'}), 500
    
    def _get_uptime(self):
        """Calculate application uptime in seconds"""
        # This would typically track actual start time
        return 3600  # Placeholder: 1 hour
    
    def _get_memory_usage(self):
        """Get current memory usage statistics"""
        import psutil
        process = psutil.Process()
        return {
            'rss': process.memory_info().rss,
            'vms': process.memory_info().vms,
            'percent': process.memory_percent()
        }
    
    def run(self, host='0.0.0.0', port=5000, debug=False):
        """Start the Flask development server"""
        self.logger.info(f'Starting application on {host}:{port}')
        self.app.run(host=host, port=port, debug=debug)


def create_app(config_path='config.json'):
    """Application factory function"""
    return WebApplication(config_path)


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Example Web Application')
    parser.add_argument('--host', default='127.0.0.1', help='Host to bind to')
    parser.add_argument('--port', type=int, default=5000, help='Port to bind to')
    parser.add_argument('--debug', action='store_true', help='Enable debug mode')
    parser.add_argument('--config', default='config.json', help='Configuration file path')
    
    args = parser.parse_args()
    
    app = create_app(args.config)
    app.run(host=args.host, port=args.port, debug=args.debug)