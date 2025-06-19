# Example Project

A comprehensive web application demonstrating modern development practices with Python Flask backend and JavaScript frontend.

## Features

- **RESTful API**: Complete CRUD operations for user management
- **Database Integration**: SQLite with connection pooling
- **Modern Frontend**: Vanilla JavaScript with ES6+ features
- **Responsive Design**: Mobile-first CSS with dark mode support
- **Real-time Updates**: WebSocket-ready architecture
- **Security**: Password hashing and input validation
- **Logging**: Comprehensive request and error logging
- **Configuration**: Environment-based configuration management

## Architecture

### Backend (`src/`)
- `app.py` - Main Flask application with API endpoints
- `utils.py` - Utility classes for database, logging, and security

### Frontend
- `index.js` - Client-side application logic and API communication
- `style.css` - Modern CSS with responsive design and theming

## API Endpoints

### User Management
- `GET /api/users` - List users with pagination
- `POST /api/users` - Create new user
- `GET /api/users/<id>` - Get specific user
- `PUT /api/users/<id>` - Update user
- `DELETE /api/users/<id>` - Delete user

### System
- `GET /api/health` - Health check endpoint
- `GET /api/analytics` - Usage analytics and metrics

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    preferences TEXT DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Request Logs Table
```sql
CREATE TABLE request_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    method TEXT NOT NULL,
    path TEXT NOT NULL,
    status_code INTEGER,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    duration_ms INTEGER
);
```

## Configuration

Create `config.json` in the project root:

```json
{
    "database_url": "app.db",
    "secret_key": "your-secret-key",
    "debug": false,
    "log_level": "INFO",
    "version": "1.0.0"
}
```

Environment variables override config file settings:
- `DATABASE_URL` - Database connection string
- `SECRET_KEY` - Application secret key
- `DEBUG` - Enable debug mode
- `LOG_LEVEL` - Logging level

## Installation

1. **Install Dependencies**:
   ```bash
   pip install flask werkzeug psutil
   ```

2. **Run Application**:
   ```bash
   python src/app.py
   ```

3. **Access Application**:
   Open `http://localhost:5000` in your browser

## Development

### Running with Debug Mode
```bash
python src/app.py --debug
```

### Custom Host and Port
```bash
python src/app.py --host 0.0.0.0 --port 8080
```

### Using Custom Config
```bash
python src/app.py --config production.json
```

## Frontend Features

### Application Manager
- State management with React-like patterns
- Event-driven architecture
- Error handling and notifications
- API client with retry logic

### UI Manager
- Dynamic DOM manipulation
- Modal and notification systems
- Responsive design components
- Real-time data updates

### API Client
- RESTful API communication
- Error handling and retries
- Request/response transformation
- Authentication support (ready)

## Security Features

- Password hashing with PBKDF2
- Input validation and sanitization
- CSRF protection ready
- SQL injection prevention
- XSS protection in frontend

## Performance

- Database connection pooling
- Lazy loading for large datasets
- Efficient DOM updates
- CSS animations with GPU acceleration
- Memory leak prevention

## Testing

The codebase is structured for easy testing:

### Backend Testing
```python
# Test API endpoints
import unittest
from src.app import create_app

class TestAPI(unittest.TestCase):
    def setUp(self):
        self.app = create_app('test_config.json')
        self.client = self.app.app.test_client()
```

### Frontend Testing
```javascript
// Test application components
describe('ApplicationManager', () => {
    test('should initialize correctly', () => {
        const app = new ApplicationManager();
        expect(app.state.users).toEqual([]);
    });
});
```

## Deployment

### Production Setup
1. Set environment variables
2. Use production WSGI server (gunicorn)
3. Configure reverse proxy (nginx)
4. Set up SSL certificates
5. Configure database backups

### Docker Deployment
```dockerfile
FROM python:3.9-slim
COPY . /app
WORKDIR /app
RUN pip install -r requirements.txt
CMD ["python", "src/app.py", "--host", "0.0.0.0"]
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details