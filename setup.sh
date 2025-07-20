#!/bin/bash

# FileTree Timeline Visualizer - Complete Setup Script
# This script sets up both Docker Compose and Minikube environments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

print_header() {
    echo -e "\n${GREEN}================================================${NC}"
    echo -e "${GREEN} $1${NC}"
    echo -e "${GREEN}================================================${NC}\n"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to wait for user input
wait_for_user() {
    if [ "$1" != "--auto" ]; then
        read -p "Press Enter to continue..."
    fi
}

# Function to check prerequisites
check_prerequisites() {
    print_header "STEP 1: Checking Prerequisites"
    
    # Check Docker
    if command_exists docker; then
        print_success "Docker is installed"
        docker --version
    else
        print_error "Docker is not installed. Please install Docker Desktop first."
        echo "Visit: https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    # Check Docker Compose
    if command_exists docker-compose || docker compose version >/dev/null 2>&1; then
        print_success "Docker Compose is available"
        if command_exists docker-compose; then
            docker-compose --version
        else
            docker compose version
        fi
    else
        print_error "Docker Compose is not available"
        exit 1
    fi
    
    # Check Minikube
    if command_exists minikube; then
        print_success "Minikube is installed"
        minikube version
    else
        print_error "Minikube is not installed. Please install minikube first."
        echo "Visit: https://minikube.sigs.k8s.io/docs/start/"
        exit 1
    fi
    
    # Check kubectl
    if command_exists kubectl; then
        print_success "kubectl is installed"
        kubectl version --client --short 2>/dev/null || kubectl version --client
    else
        print_error "kubectl is not installed. Please install kubectl first."
        echo "Visit: https://kubernetes.io/docs/tasks/tools/install-kubectl/"
        exit 1
    fi
    
    wait_for_user $1
}

# Function to start Docker Desktop
start_docker() {
    print_header "STEP 2: Starting Docker"
    
    # Check if Docker daemon is running
    if docker info >/dev/null 2>&1; then
        print_success "Docker is already running"
    else
        print_status "Starting Docker Desktop..."
        
        # Try to start Docker Desktop based on OS
        case "$(uname -s)" in
            Darwin*)
                print_status "Detected macOS - starting Docker Desktop"
                open -a Docker || {
                    print_error "Could not start Docker Desktop automatically"
                    print_status "Please start Docker Desktop manually and wait for it to be ready"
                }
                ;;
            Linux*)
                print_status "Detected Linux - starting Docker service"
                sudo systemctl start docker || {
                    print_error "Could not start Docker service"
                    print_status "Please start Docker manually: sudo systemctl start docker"
                }
                ;;
            CYGWIN*|MINGW32*|MSYS*|MINGW*)
                print_status "Detected Windows - please start Docker Desktop manually"
                ;;
            *)
                print_warning "Unknown OS - please start Docker manually"
                ;;
        esac
        
        # Wait for Docker to be ready
        print_status "Waiting for Docker to be ready..."
        local max_attempts=30
        local attempt=1
        
        while [ $attempt -le $max_attempts ]; do
            if docker info >/dev/null 2>&1; then
                print_success "Docker is ready!"
                break
            fi
            
            printf "."
            sleep 2
            attempt=$((attempt + 1))
        done
        
        if [ $attempt -gt $max_attempts ]; then
            print_error "Docker failed to start within 60 seconds"
            print_status "Please ensure Docker Desktop is running and try again"
            exit 1
        fi
    fi
    
    # Show Docker info
    print_status "Docker system info:"
    docker system df
    
    wait_for_user $1
}

# Function to verify and adjust existing Dockerfiles
verify_dockerfiles() {
    print_header "STEP 3: Verifying Dockerfiles"
    
    # Check your existing Dockerfiles
    if [ -f "Dockerfile.backend" ]; then
        print_success "Found existing Dockerfile.backend"
        # Verify the requirements path is correct
        if grep -q "file-tree-timeline/backend/requirements.txt" Dockerfile.backend; then
            print_warning "Dockerfile.backend references incorrect requirements path"
            print_status "Updating Dockerfile.backend to use correct requirements path..."
            sed -i.bak 's|file-tree-timeline/backend/requirements.txt|requirements.txt|g' Dockerfile.backend
            sed -i.bak 's|file-tree-timeline/backend/|file_tree_timeline/backend/|g' Dockerfile.backend
            print_success "Updated Dockerfile.backend"
        fi
    else
        print_warning "Dockerfile.backend not found - creating basic version..."
        cat > Dockerfile.backend << 'EOF'
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libffi-dev \
    libssl-dev \
    libxml2-dev \
    libxslt1-dev \
    libjpeg-dev \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy backend code
COPY unified_backend.py /app/unified_backend.py
COPY file_tree_timeline/ /app/file_tree_timeline/
COPY milestone_email_generator/ /app/milestone_email_generator/

# Download NLTK data
RUN python -m nltk.downloader punkt

ENTRYPOINT ["python", "unified_backend.py"]
EOF
        print_success "Created basic Dockerfile.backend"
    fi
    
    if [ -f "Dockerfile.frontend" ]; then
        print_success "Found existing Dockerfile.frontend"
        # Verify the directory path is correct
        if grep -q "file-tree-timeline/frontend/" Dockerfile.frontend; then
            print_warning "Dockerfile.frontend references incorrect directory path"
            print_status "Updating Dockerfile.frontend to use correct directory path..."
            sed -i.bak 's|file-tree-timeline/frontend/|file_tree_timeline/frontend/|g' Dockerfile.frontend
            print_success "Updated Dockerfile.frontend"
        fi
    else
        print_warning "Dockerfile.frontend not found - creating basic version..."
        cat > Dockerfile.frontend << 'EOF'
FROM nginx:alpine

RUN rm -rf /usr/share/nginx/html/*

COPY unified_visualizer.html /usr/share/nginx/html/
COPY file_tree_timeline/frontend/ /usr/share/nginx/html/

EXPOSE 80
EOF
        print_success "Created basic Dockerfile.frontend"
    fi
    
    # Create missing Dockerfiles for Kubernetes deployment
    if [ ! -f "Dockerfile.unified-backend" ]; then
        print_status "Creating Dockerfile.unified-backend for Kubernetes deployment..."
        cat > Dockerfile.unified-backend << 'EOF'
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libffi-dev \
    libssl-dev \
    libxml2-dev \
    libxslt1-dev \
    libjpeg-dev \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy backend code
COPY unified_backend.py /app/unified_backend.py
COPY file_tree_timeline/ /app/file_tree_timeline/
COPY milestone_email_generator/ /app/milestone_email_generator/

# Download NLTK data
RUN python -m nltk.downloader punkt

# Create data directory
RUN mkdir -p /data/backups

EXPOSE 5000

CMD ["python", "unified_backend.py", "--host", "0.0.0.0", "--port", "5000"]
EOF
        print_success "Created Dockerfile.unified-backend"
    fi
    
    if [ ! -f "Dockerfile.scanner" ]; then
        print_status "Creating Dockerfile.scanner for Kubernetes deployment..."
        cat > Dockerfile.scanner << 'EOF'
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libffi-dev \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy scanner code
COPY file_tree_timeline/backend/scanner.py /app/scanner.py
COPY file_tree_timeline/backend/requirements.txt /app/requirements.txt

# Install requirements
RUN pip install --no-cache-dir -r /app/requirements.txt

# Create data directory
RUN mkdir -p /data

CMD ["python", "scanner.py"]
EOF
        print_success "Created Dockerfile.scanner"
    fi
    
    # Check docker-compose.yaml
    if [ -f "docker-compose.yaml" ]; then
        print_success "Found existing docker-compose.yaml"
        # Check for hardcoded paths and suggest updates
        if grep -q "/Users/jakepfitsch" docker-compose.yaml; then
            print_warning "Found hardcoded path in docker-compose.yaml"
            print_status "Current volume mount: $(grep -o '/Users/jakepfitsch[^:]*' docker-compose.yaml)"
            print_status "You may want to update this to your actual data directory"
        fi
        # Show current content
        print_status "Current docker-compose.yaml structure:"
        grep -E "^[a-z]|services:" docker-compose.yaml || echo "  (Could not parse structure)"
    else
        print_warning "docker-compose.yaml not found - creating basic version..."
        cat > docker-compose.yaml << 'EOF'
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    volumes:
      - shared-data:/shared
      - ./sample_data:/data:ro
    command: python unified_backend.py --scan-dir /data/ --output /shared/unified_timeline.json --correlate

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "8080:80"
    volumes:
      - shared-data:/usr/share/nginx/html
    depends_on:
      - backend

volumes:
  shared-data:
    driver: local
EOF
        print_success "Created basic docker-compose.yaml"
    fi
    
    wait_for_user $1
}

# Function to run Docker Compose
run_docker_compose() {
    print_header "STEP 4: Running Docker Compose"
    
    # Stop any existing containers
    print_status "Stopping any existing containers..."
    if command_exists docker-compose; then
        docker-compose down --remove-orphans 2>/dev/null || true
    else
        docker compose down --remove-orphans 2>/dev/null || true
    fi
    
    # Check if we need to modify the docker-compose for the demo
    if [ -f "docker-compose.yaml" ]; then
        # Check if the compose file has hardcoded paths
        if grep -q "/Users/jakepfitsch" docker-compose.yaml; then
            print_warning "Found hardcoded path in docker-compose.yaml"
            print_status "Current path: $(grep -o '/Users/jakepfitsch[^:]*' docker-compose.yaml)"
            print_status "This path may not exist on your system."
            
            # Ask user if they want to update the path
            if [ "$1" != "--auto" ]; then
                read -p "Do you want to update the volume path to use sample data? (y/n): " -n 1 -r
                echo
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    print_status "Updating docker-compose.yaml to use sample data..."
                    # Create a backup
                    cp docker-compose.yaml docker-compose.yaml.backup
                    # Update the volume mount
                    sed -i.bak 's|/Users/jakepfitsch/Documents/sample_project_databaseWork/Project_1_Acoustic_Design/|./file_tree_timeline/sample_data/example_project|g' docker-compose.yaml
                    sed -i.bak 's|/data/email_db|/data|g' docker-compose.yaml
                    sed -i.bak 's|/data/deliverables_db|/data|g' docker-compose.yaml
                    print_success "Updated docker-compose.yaml to use sample data"
                fi
            else
                print_status "Auto mode: Using existing docker-compose.yaml configuration"
            fi
        fi
    fi
    
    # Build and start containers
    print_status "Building and starting containers..."
    if command_exists docker-compose; then
        docker-compose up --build -d
    else
        docker compose up --build -d
    fi
    
    # Wait for containers to be ready
    print_status "Waiting for containers to be ready..."
    sleep 15
    
    # Show container status
    print_status "Container status:"
    if command_exists docker-compose; then
        docker-compose ps
    else
        docker compose ps
    fi
    
    # Show logs
    print_status "Recent logs:"
    if command_exists docker-compose; then
        docker-compose logs --tail=20
    else
        docker compose logs --tail=20
    fi
    
    print_success "Docker Compose environment is running!"
    print_status "Frontend available at: http://localhost:8080"
    
    wait_for_user $1
}

# Function to start Minikube
start_minikube() {
    print_header "STEP 5: Starting Minikube"
    
    # Check if Minikube is already running
    if minikube status | grep -q "Running"; then
        print_success "Minikube is already running"
        minikube status
    else
        print_status "Starting Minikube with recommended resources..."
        minikube start --cpus=4 --memory=8192 --disk-size=20g --driver=docker
        
        print_success "Minikube started successfully!"
    fi
    
    # Enable required addons
    print_status "Enabling required addons..."
    minikube addons enable ingress
    minikube addons enable metrics-server
    minikube addons enable storage-provisioner
    
    # Show addon status
    print_status "Addon status:"
    minikube addons list | grep -E "(ingress|metrics-server|storage-provisioner)"
    
    # Show cluster info
    print_status "Cluster information:"
    kubectl cluster-info
    
    wait_for_user $1
}

# Function to build and load Docker images for Minikube
prepare_minikube_images() {
    print_header "STEP 6: Preparing Images for Minikube"
    
    # Set Docker environment to use Minikube's Docker daemon
    print_status "Setting Docker environment to use Minikube..."
    eval $(minikube docker-env)
    
    # Build images in Minikube's Docker environment
    print_status "Building images in Minikube..."
    
    # Build unified backend image
    if [ -f "Dockerfile.unified-backend" ]; then
        docker build -t filetree-timeline/unified-backend:latest -f Dockerfile.unified-backend .
        print_success "Built unified-backend image"
    else
        print_error "Dockerfile.unified-backend not found. Please run setup again to create it."
        return 1
    fi
    
    # Build scanner image
    if [ -f "Dockerfile.scanner" ]; then
        docker build -t filetree-timeline/scanner:latest -f Dockerfile.scanner .
        print_success "Built scanner image"
    else
        print_error "Dockerfile.scanner not found. Please run setup again to create it."
        return 1
    fi
    
    # Build frontend image
    if [ -f "Dockerfile.frontend" ]; then
        docker build -t filetree-timeline/frontend:latest -f Dockerfile.frontend .
        print_success "Built frontend image"
    else
        print_error "Dockerfile.frontend not found"
        return 1
    fi
    
    # Create simple backup image
    print_status "Creating backup image..."
    cat > Dockerfile.backup << 'EOF'
FROM alpine:latest
RUN apk add --no-cache bash sqlite
COPY k8s/backup.sh /backup.sh
RUN chmod +x /backup.sh
CMD ["/backup.sh"]
EOF
    
    docker build -t filetree-timeline/backup:latest -f Dockerfile.backup .
    print_success "Built backup image"
    
    # List built images
    print_status "Built images:"
    docker images | grep filetree-timeline
    
    # Reset Docker environment
    eval $(minikube docker-env -u)
    
    print_success "Images built and loaded into Minikube!"
    
    wait_for_user $1
}

# Function to deploy to Kubernetes
deploy_kubernetes() {
    print_header "STEP 7: Deploying to Kubernetes"
    
    if [ ! -d "k8s" ]; then
        print_error "k8s directory not found. Make sure you're in the project root."
        exit 1
    fi
    
    cd k8s
    
    # Check if deploy script exists and is executable
    if [ -f "deploy.sh" ]; then
        chmod +x deploy.sh
        print_status "Running Kubernetes deployment script..."
        ./deploy.sh deploy
    else
        print_status "deploy.sh not found, deploying manually..."
        
        # Deploy individual components
        kubectl apply -f namespace.yaml
        kubectl apply -f configmap.yaml
        kubectl apply -f recommendation-configmap.yaml
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
    
    cd ..
    
    # Wait for deployment
    print_status "Waiting for deployments to be ready..."
    kubectl wait --for=condition=available --timeout=300s deployment/unified-backend -n filetree-timeline || true
    kubectl wait --for=condition=available --timeout=300s deployment/frontend -n filetree-timeline || true
    
    # Show deployment status
    print_status "Deployment status:"
    kubectl get all -n filetree-timeline
    
    print_success "Kubernetes deployment completed!"
    
    wait_for_user $1
}

# Function to show access information
show_access_info() {
    print_header "STEP 8: Access Information"
    
    print_success "🎉 Setup Complete! Here's how to access your applications:"
    
    echo
    print_status "📦 DOCKER COMPOSE:"
    echo "  Frontend: http://localhost:8080"
    echo "  Backend:  http://localhost:5000"
    
    echo
    print_status "☸️  KUBERNETES (Minikube):"
    
    MINIKUBE_IP=$(minikube ip)
    echo "  Minikube IP: $MINIKUBE_IP"
    
    echo
    echo "  Option 1 - Add to /etc/hosts:"
    echo "    echo '$MINIKUBE_IP filetree-timeline.local' | sudo tee -a /etc/hosts"
    echo "    Then visit: http://filetree-timeline.local"
    
    echo
    echo "  Option 2 - Port forwarding:"
    echo "    kubectl port-forward service/frontend-service 8081:80 -n filetree-timeline"
    echo "    Then visit: http://localhost:8081"
    
    echo
    echo "  Option 3 - Minikube service:"
    echo "    minikube service frontend-service -n filetree-timeline"
    
    echo
    print_status "📋 USEFUL COMMANDS:"
    echo
    echo "  Docker Compose:"
    echo "    docker-compose logs -f          # View logs"
    echo "    docker-compose down             # Stop containers"
    echo "    docker-compose up --build       # Rebuild and restart"
    
    echo
    echo "  Kubernetes:"
    echo "    kubectl get pods -n filetree-timeline              # View pods"
    echo "    kubectl logs deployment/unified-backend -n filetree-timeline  # View backend logs"
    echo "    kubectl delete -k k8s/                            # Delete deployment"
    
    echo
    print_status "🔧 TROUBLESHOOTING:"
    echo "  - If containers fail to start, check logs with 'docker-compose logs'"
    echo "  - If Kubernetes pods fail, check with 'kubectl describe pod <pod-name> -n filetree-timeline'"
    echo "  - Make sure Docker Desktop has enough resources (4 CPU, 8GB RAM recommended)"
}

# Function to validate project structure
validate_project_structure() {
    print_header "STEP 0: Validating Project Structure"
    
    local missing_files=()
    
    # Check core files
    if [ ! -f "unified_backend.py" ]; then
        missing_files+=("unified_backend.py")
    fi
    
    if [ ! -f "unified_visualizer.html" ]; then
        missing_files+=("unified_visualizer.html")
    fi
    
    if [ ! -f "requirements.txt" ]; then
        missing_files+=("requirements.txt")
    fi
    
    # Check directories
    if [ ! -d "file_tree_timeline" ]; then
        missing_files+=("file_tree_timeline/")
    fi
    
    if [ ! -d "milestone_email_generator" ]; then
        missing_files+=("milestone_email_generator/")
    fi
    
    if [ ! -d "k8s" ]; then
        missing_files+=("k8s/")
    fi
    
    # Report missing files
    if [ ${#missing_files[@]} -gt 0 ]; then
        print_error "Missing required files/directories:"
        for file in "${missing_files[@]}"; do
            echo "  • $file"
        done
        print_error "Please ensure you're running this script from the project root directory"
        exit 1
    fi
    
    print_success "Project structure validation passed"
    
    # Show project structure
    print_status "Project structure:"
    echo "  • unified_backend.py ($(wc -c < unified_backend.py 2>/dev/null || echo "unknown") bytes)"
    echo "  • unified_visualizer.html ($(wc -c < unified_visualizer.html 2>/dev/null || echo "unknown") bytes)"
    echo "  • file_tree_timeline/ (directory)"
    echo "  • milestone_email_generator/ (directory)"
    echo "  • k8s/ (directory)"
    
    wait_for_user $1
}

# Main function
main() {
    local auto_mode=""
    if [ "$1" = "--auto" ]; then
        auto_mode="--auto"
    fi
    
    print_header "FileTree Timeline Visualizer - Complete Setup"
    echo "This script will set up both Docker Compose and Minikube environments"
    echo
    
    print_status "Current Architecture:"
    echo "  • Unified Backend (unified_backend.py): Combines file scanning and milestone extraction"
    echo "  • Unified Frontend (unified_visualizer.html): 3D timeline visualization"
    echo "  • Legacy Components: file_tree_timeline/ and milestone_email_generator/"
    echo "  • Kubernetes: Complete production deployment in k8s/"
    echo
    
    print_status "Setup will:"
    echo "  • Verify and fix Dockerfile paths and configurations"
    echo "  • Create missing Dockerfiles for Kubernetes deployment"
    echo "  • Update docker-compose.yaml to use sample data"
    echo "  • Deploy both Docker Compose and Kubernetes environments"
    echo
    
    if [ "$auto_mode" = "" ]; then
        echo "Press Ctrl+C to cancel, or Enter to continue..."
        read
    fi
    
    validate_project_structure $auto_mode
    check_prerequisites $auto_mode
    start_docker $auto_mode
    verify_dockerfiles $auto_mode
    run_docker_compose $auto_mode
    start_minikube $auto_mode
    prepare_minikube_images $auto_mode
    deploy_kubernetes $auto_mode
    show_access_info
    
    print_success "🚀 All done! Both Docker Compose and Kubernetes environments are ready!"
}

# Run main function with all arguments
main "$@"