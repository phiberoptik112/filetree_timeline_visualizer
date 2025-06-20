# FileTree Timeline Visualizer - Kubernetes Manifests

This directory contains comprehensive Kubernetes manifests for deploying the FileTree Timeline Visualizer application on Minikube or any Kubernetes cluster.

## Architecture Overview

The application consists of the following components:

- **Unified Backend**: Main API service handling timeline data and milestone extraction
- **Frontend**: Web interface for timeline visualization
- **File Scanner**: Service for scanning and analyzing file structures
- **Scheduled Jobs**: Automated scanning and backup operations
- **Data Storage**: Persistent volumes for application data and backups

## Prerequisites

### Minikube Setup
```bash
# Start Minikube with sufficient resources
minikube start --cpus=4 --memory=8192 --disk-size=20g

# Enable required addons
minikube addons enable ingress
minikube addons enable metrics-server
minikube addons enable storage-provisioner

# Verify addons are enabled
minikube addons list
```

### Required Tools
- `kubectl` (latest version)
- `kustomize` (v4.0.0+)
- `docker` (for building images)

## Quick Start

### 1. Build and Load Docker Images

```bash
# Build images
docker build -t filetree-timeline/unified-backend:latest -f Dockerfile.unified-backend .
docker build -t filetree-timeline/scanner:latest -f Dockerfile.scanner .
docker build -t filetree-timeline/frontend:latest -f Dockerfile.frontend .
docker build -t filetree-timeline/backup:latest -f Dockerfile.backup .

# Load images into Minikube
minikube image load filetree-timeline/unified-backend:latest
minikube image load filetree-timeline/scanner:latest
minikube image load filetree-timeline/frontend:latest
minikube image load filetree-timeline/backup:latest
```

### 2. Deploy the Application

```bash
# Deploy using Kustomize
kubectl apply -k .

# Or deploy individual components
kubectl apply -f namespace.yaml
kubectl apply -f configmap.yaml
kubectl apply -f secrets.yaml
kubectl apply -f persistent-volumes.yaml
kubectl apply -f rbac.yaml
kubectl apply -f unified-backend-deployment.yaml
kubectl apply -f frontend-deployment.yaml
kubectl apply -f scanner-deployment.yaml
kubectl apply -f services.yaml
kubectl apply -f ingress.yaml
kubectl apply -f network-policy.yaml
kubectl apply -f cronjob.yaml
kubectl apply -f hpa.yaml
```

### 3. Verify Deployment

```bash
# Check all resources
kubectl get all -n filetree-timeline

# Check persistent volumes
kubectl get pv,pvc -n filetree-timeline

# Check ingress
kubectl get ingress -n filetree-timeline

# Check cronjobs
kubectl get cronjobs -n filetree-timeline

# Check horizontal pod autoscalers
kubectl get hpa -n filetree-timeline
```

### 4. Access the Application

```bash
# Get Minikube IP
minikube ip

# Add to /etc/hosts (or use the IP directly)
echo "$(minikube ip) filetree-timeline.local" | sudo tee -a /etc/hosts

# Open in browser
open http://filetree-timeline.local
```

## Configuration

### Environment Variables

Key configuration options in `configmap.yaml`:

- `SCANNER_IGNORE_PATTERNS`: File patterns to ignore during scanning
- `SCANNER_MAX_DEPTH`: Maximum directory depth for scanning
- `SCANNER_MAX_FILE_SIZE`: Maximum file size to process (in bytes)
- `MILESTONE_CONFIDENCE_THRESHOLD`: Minimum confidence for milestone extraction
- `LOG_LEVEL`: Application logging level

### Secrets

Update `secrets.yaml` with your actual secret values:

```bash
# Generate base64 encoded secrets
echo -n "your-jwt-secret" | base64
echo -n "your-encryption-key" | base64
```

### Storage

The application uses two persistent volumes:
- **Data Volume**: 10Gi for application data and databases
- **Backup Volume**: 5Gi for automated backups

## Monitoring and Logs

### View Logs

```bash
# Backend logs
kubectl logs -f deployment/unified-backend -n filetree-timeline

# Frontend logs
kubectl logs -f deployment/frontend -n filetree-timeline

# Scanner logs
kubectl logs -f deployment/file-scanner -n filetree-timeline

# CronJob logs
kubectl logs -f job/filetree-timeline-scanner-xxx -n filetree-timeline
```

### Monitor Resources

```bash
# Resource usage
kubectl top pods -n filetree-timeline

# HPA status
kubectl describe hpa -n filetree-timeline

# Pod events
kubectl get events -n filetree-timeline --sort-by='.lastTimestamp'
```

## Scaling

The application includes Horizontal Pod Autoscalers (HPA) for automatic scaling:

- **Backend**: 2-10 replicas based on CPU/memory usage
- **Frontend**: 2-8 replicas based on CPU/memory usage

Manual scaling:
```bash
kubectl scale deployment unified-backend --replicas=5 -n filetree-timeline
kubectl scale deployment frontend --replicas=4 -n filetree-timeline
```

## Backup and Recovery

### Automated Backups

The system includes automated daily backups via CronJob:
- Runs daily at 2 AM
- Stores backups in persistent volume
- Keeps 7 successful backup history

### Manual Backup

```bash
# Create manual backup
kubectl create job --from=cronjob/filetree-timeline-backup manual-backup -n filetree-timeline

# Check backup status
kubectl get jobs -n filetree-timeline
```

## Troubleshooting

### Common Issues

1. **Images not found**
   ```bash
   # Rebuild and reload images
   docker build -t filetree-timeline/unified-backend:latest .
   minikube image load filetree-timeline/unified-backend:latest
   ```

2. **Persistent volumes not bound**
   ```bash
   # Check storage class
   kubectl get storageclass
   
   # Check PV status
   kubectl get pv,pvc -n filetree-timeline
   ```

3. **Ingress not working**
   ```bash
   # Check ingress controller
   kubectl get pods -n ingress-nginx
   
   # Check ingress status
   kubectl describe ingress -n filetree-timeline
   ```

4. **Pods not starting**
   ```bash
   # Check pod events
   kubectl describe pod <pod-name> -n filetree-timeline
   
   # Check pod logs
   kubectl logs <pod-name> -n filetree-timeline
   ```

### Debug Commands

```bash
# Port forward for direct access
kubectl port-forward service/unified-backend-service 5000:5000 -n filetree-timeline
kubectl port-forward service/frontend-service 8080:80 -n filetree-timeline

# Exec into pods
kubectl exec -it deployment/unified-backend -n filetree-timeline -- /bin/bash
kubectl exec -it deployment/frontend -n filetree-timeline -- /bin/sh

# Check resource usage
kubectl top nodes
kubectl top pods -n filetree-timeline
```

## Cleanup

```bash
# Delete all resources
kubectl delete -k .

# Or delete individual components
kubectl delete namespace filetree-timeline

# Clean up persistent volumes (if needed)
kubectl delete pv filetree-timeline-data-pv filetree-timeline-backup-pv
```

## Development

### Local Development

For local development, you can use the development ingress:

```bash
# Apply development ingress
kubectl apply -f ingress.yaml

# Access via Minikube IP
minikube ip
```

### Customization

1. **Modify configurations**: Edit `configmap.yaml` and `secrets.yaml`
2. **Adjust resources**: Update resource limits in deployment files
3. **Change schedules**: Modify CronJob schedules in `cronjob.yaml`
4. **Add new components**: Create new deployment files and add to `kustomization.yaml`

## Security Considerations

- Network policies restrict pod-to-pod communication
- RBAC provides least-privilege access
- Secrets are stored encrypted in etcd
- Ingress includes CORS configuration
- Service accounts are used for pod identity

## Performance Optimization

- Horizontal Pod Autoscalers for automatic scaling
- Resource limits and requests defined
- Persistent volumes for data storage
- Scheduled backups to prevent data loss
- Health checks and readiness probes

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review pod logs and events
3. Verify configuration and secrets
4. Check resource usage and limits 