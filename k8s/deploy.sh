#!/bin/bash

# FileTree Timeline Visualizer - Kubernetes Deployment Script
# This script automates the deployment process for Minikube

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="filetree-timeline"
APP_NAME="filetree-timeline-visualizer"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command_exists kubectl; then
        print_error "kubectl is not installed. Please install kubectl first."
        exit 1
    fi
    
    if ! command_exists minikube; then
        print_error "minikube is not installed. Please install minikube first."
        exit 1
    fi
    
    if ! command_exists docker; then
        print_error "docker is not installed. Please install docker first."
        exit 1
    fi
    
    print_success "All prerequisites are installed"
}

# Function to start and configure Minikube
setup_minikube() {
    print_status "Setting up Minikube..."
    
    # Check if Minikube is running
    if ! minikube status | grep -q "Running"; then
        print_status "Starting Minikube with recommended resources..."
        minikube start --cpus=4 --memory=8192 --disk-size=20g
    else
        print_status "Minikube is already running"
    fi
    
    # Enable required addons
    print_status "Enabling required addons..."
    minikube addons enable ingress
    minikube addons enable metrics-server
    minikube addons enable storage-provisioner
    
    print_success "Minikube setup completed"
}

# Function to build Docker images
build_images() {
    print_status "Building Docker images..."
    
    # Check if Dockerfiles exist
    if [ ! -f "../Dockerfile.unified-backend" ]; then
        print_warning "Dockerfile.unified-backend not found, skipping unified backend build"
    else
        print_status "Building unified backend image..."
        docker build -t filetree-timeline/unified-backend:latest -f ../Dockerfile.unified-backend ..
    fi
    
    if [ ! -f "../Dockerfile.scanner" ]; then
        print_warning "Dockerfile.scanner not found, skipping scanner build"
    else
        print_status "Building scanner image..."
        docker build -t filetree-timeline/scanner:latest -f ../Dockerfile.scanner ..
    fi
    
    if [ ! -f "../Dockerfile.frontend" ]; then
        print_warning "Dockerfile.frontend not found, skipping frontend build"
    else
        print_status "Building frontend image..."
        docker build -t filetree-timeline/frontend:latest -f ../Dockerfile.frontend ..
    fi
    
    if [ ! -f "../Dockerfile.backup" ]; then
        print_warning "Dockerfile.backup not found, creating simple backup image..."
        # Create a simple backup image
        cat > ../Dockerfile.backup << 'EOF'
FROM alpine:latest
RUN apk add --no-cache bash
COPY k8s/backup.sh /backup.sh
RUN chmod +x /backup.sh
CMD ["/backup.sh"]
EOF
        docker build -t filetree-timeline/backup:latest -f ../Dockerfile.backup ..
    else
        print_status "Building backup image..."
        docker build -t filetree-timeline/backup:latest -f ../Dockerfile.backup ..
    fi
    
    print_success "Docker images built successfully"
}

# Function to load images into Minikube
load_images() {
    print_status "Loading images into Minikube..."
    
    minikube image load filetree-timeline/unified-backend:latest || print_warning "Failed to load unified-backend image"
    minikube image load filetree-timeline/scanner:latest || print_warning "Failed to load scanner image"
    minikube image load filetree-timeline/frontend:latest || print_warning "Failed to load frontend image"
    minikube image load filetree-timeline/backup:latest || print_warning "Failed to load backup image"
    
    print_success "Images loaded into Minikube"
}

# Function to deploy the application
deploy_application() {
    print_status "Deploying application..."
    
    # Create namespace if it doesn't exist
    kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -
    
    # Deploy using Kustomize
    if command_exists kustomize; then
        print_status "Deploying with Kustomize..."
        kubectl apply -k .
    else
        print_status "Kustomize not found, deploying individual components..."
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
    fi
    
    print_success "Application deployed successfully"
}

# Function to wait for deployment
wait_for_deployment() {
    print_status "Waiting for deployment to be ready..."
    
    # Wait for deployments
    kubectl wait --for=condition=available --timeout=300s deployment/unified-backend -n $NAMESPACE
    kubectl wait --for=condition=available --timeout=300s deployment/frontend -n $NAMESPACE
    
    print_success "Deployment is ready"
}

# Function to show deployment status
show_status() {
    print_status "Deployment status:"
    echo
    
    print_status "Pods:"
    kubectl get pods -n $NAMESPACE
    
    echo
    print_status "Services:"
    kubectl get services -n $NAMESPACE
    
    echo
    print_status "Persistent Volumes:"
    kubectl get pv,pvc -n $NAMESPACE
    
    echo
    print_status "Ingress:"
    kubectl get ingress -n $NAMESPACE
    
    echo
    print_status "CronJobs:"
    kubectl get cronjobs -n $NAMESPACE
    
    echo
    print_status "Horizontal Pod Autoscalers:"
    kubectl get hpa -n $NAMESPACE
}

# Function to show access information
show_access_info() {
    print_status "Access Information:"
    echo
    
    MINIKUBE_IP=$(minikube ip)
    print_status "Minikube IP: $MINIKUBE_IP"
    
    echo
    print_status "To access the application:"
    echo "1. Add to /etc/hosts: $MINIKUBE_IP filetree-timeline.local"
    echo "2. Open browser: http://filetree-timeline.local"
    echo
    print_status "Or use port forwarding:"
    echo "kubectl port-forward service/frontend-service 8080:80 -n $NAMESPACE"
    echo "Then open: http://localhost:8080"
    echo
    print_status "API access:"
    echo "kubectl port-forward service/unified-backend-service 5000:5000 -n $NAMESPACE"
    echo "Then access: http://localhost:5000"
}

# Function to show logs
show_logs() {
    print_status "Recent logs from unified backend:"
    kubectl logs deployment/unified-backend -n $NAMESPACE --tail=20
    
    echo
    print_status "Recent logs from frontend:"
    kubectl logs deployment/frontend -n $NAMESPACE --tail=20
}

# Function to cleanup
cleanup() {
    print_status "Cleaning up deployment..."
    
    read -p "Are you sure you want to delete all resources? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kubectl delete -k . --ignore-not-found=true
        print_success "Cleanup completed"
    else
        print_status "Cleanup cancelled"
    fi
}

# Function to show help
show_help() {
    echo "FileTree Timeline Visualizer - Kubernetes Deployment Script"
    echo
    echo "Usage: $0 [COMMAND]"
    echo
    echo "Commands:"
    echo "  deploy      Deploy the complete application (default)"
    echo "  status      Show deployment status"
    echo "  logs        Show recent logs"
    echo "  access      Show access information"
    echo "  cleanup     Clean up all resources"
    echo "  help        Show this help message"
    echo
    echo "Examples:"
    echo "  $0 deploy"
    echo "  $0 status"
    echo "  $0 logs"
    echo "  $0 cleanup"
}

# Main script logic
main() {
    case "${1:-deploy}" in
        "deploy")
            check_prerequisites
            setup_minikube
            build_images
            load_images
            deploy_application
            wait_for_deployment
            show_status
            show_access_info
            ;;
        "status")
            show_status
            ;;
        "logs")
            show_logs
            ;;
        "access")
            show_access_info
            ;;
        "cleanup")
            cleanup
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            print_error "Unknown command: $1"
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@" 