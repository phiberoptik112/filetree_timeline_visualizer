# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Core Architecture

This is a **Unified Timeline Visualizer** that combines file system scanning with milestone extraction from email communications. The system correlates file changes with project milestones to provide comprehensive project timeline visualization.

### Main Components

1. **Unified Backend (`unified_backend.py`)**: Combines file tree scanning and email milestone extraction into a single timeline. Uses `TimelineEvent` dataclass to unify both file scans and milestones, performs correlation analysis between file changes and communication events, and exports unified JSON data.

2. **Unified Frontend (`unified_visualizer.html`)**: Interactive 3D visualization combining sunburst charts (file trees) with 3D Gantt bars (milestones). Supports timeline scrubbing, correlation visualization, and synchronized view controls. **Recently refactored into modular architecture** with separate CSS files, configuration files, and specialized JavaScript classes for better maintainability and extensibility.

3. **Legacy Components**: Original `file-tree-timeline/` (file scanning) and `milestone_email_generator/` (email processing) maintained for reference and component testing.

4. **Kubernetes Deployment (`k8s/`)**: Complete Minikube/kubernetes manifests for production-ready containerized deployment with auto-scaling, monitoring, and backup capabilities.

### Data Flow Architecture
Email Files + Directory Scan → Unified Backend → SQLite Database (events + correlations) → JSON Export → 3D Visualization

The unified system uses correlation analysis to link file changes with milestone events based on temporal proximity and file name mentions in communications.

### Modular Frontend Architecture (New)

The frontend has been refactored into a modular architecture:

**Configuration Layer**:
- `config/config.js` - Core application settings
- `config/colors.js` - Color schemes and mappings  
- `config/settings.js` - User preferences

**Styling Layer**:
- `styles/main.css` - Base layout and global styles
- `styles/panels.css` - UI panels and containers
- `styles/controls.css` - Form controls and buttons
- `styles/visualization.css` - Visualization-specific styles

**Component Layer**:
- `js/SceneManager.js` - Three.js scene setup and management
- `js/UIManager.js` - DOM interactions and event handling
- `js/DataManager.js` - Data loading, processing, and caching
- `js/VisualizationManager.js` - Sunburst and Gantt chart rendering
- `js/InteractionManager.js` - Mouse/touch interactions and highlighting
- `js/TimelineController.js` - Timeline playback and navigation
- `js/UnifiedTimelineVisualizer.js` - Main orchestrator class
- `js/utils/ColorUtils.js` - Color processing utilities
- `js/utils/FormatUtils.js` - Data formatting utilities

This modular approach provides better maintainability, testability, and extensibility while maintaining the same user interface and functionality.

## Deployment Options

### 1. Local Development (Default)
```bash
# Generate unified timeline with correlations
python unified_backend.py --scan-dir path/to/project --email-dir path/to/emails --output unified_timeline.json --correlate

# Serve visualization
python -m http.server 8080
# Then open http://localhost:8080/unified_visualizer.html
```

### 2. Docker Compose (Development/Testing)
```bash
# Start services with shared volumes
docker-compose up -d

# Access frontend at http://localhost:5000
# Backend API at http://localhost:5000/api
```

### 3. Kubernetes/Minikube (Production-Ready)
```bash
# Navigate to k8s directory
cd k8s

# Deploy complete application stack
./deploy.sh deploy

# Check deployment status
./deploy.sh status

# Access application
./deploy.sh access

# View logs
./deploy.sh logs

# Cleanup when done
./deploy.sh cleanup
```

## Common Commands

### Unified System (Primary Workflow)
```bash
# Generate unified timeline with correlations
python unified_backend.py --scan-dir path/to/project --email-dir path/to/emails --output unified_timeline.json --correlate

# Serve visualization
python -m http.server 8080
# Then open http://localhost:8080/unified_visualizer.html

# Example with sample data
python unified_backend.py --scan-dir file_tree_timeline/sample_data/example_project --email-dir file_tree_timeline/sample_data/24-004_exampleprojectfolder/Emails --correlate
```

### Legacy Component Commands
```bash
# Original file tree scanner
python file_tree_timeline/backend/scanner.py path/to/directory --output file_tree_timeline/frontend/file_tree_data.json

# Standalone milestone extraction
python milestone_email_generator/milestone_generator.py --emails path/to/emails --output milestone_data.json

# Serve legacy visualizations
cd file_tree_timeline/frontend && python -m http.server 8000
```

### Kubernetes Deployment Commands
```bash
# Quick deployment
cd k8s && ./deploy.sh deploy

# Individual component deployment
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/persistent-volumes.yaml
kubectl apply -f k8s/rbac.yaml
kubectl apply -f k8s/unified-backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/scanner-deployment.yaml
kubectl apply -f k8s/services.yaml
kubectl apply -f k8s/ingress.yaml
kubectl apply -f k8s/network-policy.yaml
kubectl apply -f k8s/cronjob.yaml
kubectl apply -f k8s/hpa.yaml

# Using Kustomize
kubectl apply -k k8s/

# Monitoring and debugging
kubectl get all -n filetree-timeline
kubectl logs -f deployment/unified-backend -n filetree-timeline
kubectl logs -f deployment/frontend -n filetree-timeline
kubectl describe pod <pod-name> -n filetree-timeline
```

## Key Implementation **Details**

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

### Kubernetes Architecture
- **Namespaces**: `filetree-timeline` for application, `filetree-timeline-system` for system components
- **Deployments**: Unified backend (2-10 replicas), Frontend (2-8 replicas), Scanner (1 replica)
- **Services**: Internal cluster networking with ingress for external access
- **Storage**: Persistent volumes for data (10Gi) and backups (5Gi)
- **Automation**: CronJobs for scheduled scanning (every 6 hours) and backups (daily)
- **Scaling**: Horizontal Pod Autoscalers based on CPU/memory usage
- **Security**: Network policies, RBAC, encrypted secrets, CORS configuration

## Development Workflow

### Primary Development Pattern
1. **Generate data**: Run unified backend with both file scan and email directories
2. **Enable correlations**: Use `--correlate` flag for relationship analysis
3. **Serve visualization**: Use unified_visualizer.html for comprehensive timeline view
4. **Iterate**: Re-run backend after file changes or new emails to update timeline

### Testing and Development
- **Sample data**: Use `file_tree_timeline/sample_data/` for consistent testing
- **Real project data**: Point to actual project directories and email folders for realistic correlation analysis
- **Performance testing**: Large datasets may require correlation threshold tuning

### Kubernetes Development
- **Local testing**: Use Minikube for local Kubernetes development
- **Image building**: Build Docker images for each component before deployment
- **Configuration**: Modify `k8s/configmap.yaml` and `k8s/secrets.yaml` for environment-specific settings
- **Monitoring**: Use `kubectl logs` and `kubectl describe` for debugging
- **Scaling**: Test HPA behavior with load testing

### File Dependencies
- **Unified output**: `unified_timeline.json` must be in same directory as `unified_visualizer.html`
- **Database persistence**: `unified_timeline.db` stores event history for incremental updates
- **Email formats**: Supports Microsoft Outlook .msg files (requires extract-msg package), standard .eml files, and plain text email formats
- **Kubernetes manifests**: All manifests in `k8s/` directory with Kustomize configuration

## Database Schema

### Events Table
- `event_id`: Unique identifier combining type and hash
- `timestamp`: Unix timestamp for chronological ordering
- `event_type`: Either 'file_scan' or 'milestone'
- `metadata`: JSON blob containing type-specific data

### Correlations Table  
- Links file_event_id to milestone_event_id with correlation_strength (0.0-1.0)
- `correlation_type`: Currently 'temporal_file_mention' based on time proximity and file name matching

## Kubernetes Components

### Core Services
- **Unified Backend**: Main API service handling timeline data and milestone extraction
- **Frontend**: Web interface for timeline visualization
- **File Scanner**: Service for scanning and analyzing file structures
- **Backup Service**: Automated database backup and verification

### Infrastructure
- **Persistent Storage**: 10Gi for application data, 5Gi for backups
- **Load Balancing**: Ingress controller with CORS support
- **Auto-scaling**: HPA for backend (2-10 replicas) and frontend (2-8 replicas)
- **Scheduled Jobs**: Automated scanning (every 6 hours) and backups (daily)
- **Security**: Network policies, RBAC, encrypted secrets

### Configuration Management
- **ConfigMaps**: Application settings, scanner patterns, logging configuration
- **Secrets**: JWT tokens, encryption keys, API credentials
- **Environment Variables**: Database paths, backup schedules, correlation thresholds

## Frontend Requirements

The unified visualization requires HTTP serving (not file:// protocol) for proper Three.js functionality and JSON loading. Browser must support WebGL for 3D rendering. Timeline data loads automatically from unified_timeline.json in same directory.

### Kubernetes Frontend Access
- **Ingress**: External access via `filetree-timeline.local` or Minikube IP
- **Port Forwarding**: Direct access via `kubectl port-forward`
- **Load Balancing**: Multiple frontend replicas with automatic failover
- **CORS**: Configured for cross-origin requests from various domains

## Deployment Scenarios

### Development Environment
```bash
# Local development
python unified_backend.py --scan-dir ./project --email-dir ./emails --correlate
python -m http.server 8080
```


### Testing Environment
```bash
# Docker Compose
docker-compose up -d
# Access at http://localhost:5000
```

### Production Environment
```bash
# Kubernetes deployment
cd k8s
./deploy.sh deploy
# Access via ingress or load balancer
```

### Scaling Production
```bash
# Manual scaling
kubectl scale deployment unified-backend --replicas=5 -n filetree-timeline
kubectl scale deployment frontend --replicas=4 -n filetree-timeline

# Auto-scaling (configured via HPA)
# Backend: 2-10 replicas based on 70% CPU, 80% memory
# Frontend: 2-8 replicas based on 70% CPU, 80% memory
```

## Monitoring and Maintenance

### Health Checks
- **Liveness Probes**: Detect and restart failed containers
- **Readiness Probes**: Ensure pods are ready to receive traffic
- **Resource Monitoring**: CPU and memory usage tracking
- **Backup Verification**: Automated backup integrity checks

### Logging and Debugging
```bash
# View application logs
kubectl logs -f deployment/unified-backend -n filetree-timeline
kubectl logs -f deployment/frontend -n filetree-timeline

# Check pod status
kubectl get pods -n filetree-timeline
kubectl describe pod <pod-name> -n filetree-timeline

# Monitor resource usage
kubectl top pods -n filetree-timeline
kubectl get hpa -n filetree-timeline
```

### Backup and Recovery
```bash
# Manual backup
kubectl create job --from=cronjob/filetree-timeline-backup manual-backup -n filetree-timeline

# Check backup status
kubectl get jobs -n filetree-timeline

# Restore from backup (manual process)
kubectl exec -it deployment/unified-backend -n filetree-timeline -- cp /data/backups/unified_timeline_YYYYMMDD_HHMMSS.db /data/unified_timeline.db
```