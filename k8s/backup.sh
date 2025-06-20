#!/bin/bash

# FileTree Timeline Visualizer - Backup Script
# This script is used by the backup CronJob to create database backups

set -e

# Configuration
DB_PATH="${DB_PATH:-/data/unified_timeline.db}"
BACKUP_PATH="${DB_BACKUP_PATH:-/data/backups}"
LOG_LEVEL="${LOG_LEVEL:-INFO}"

# Colors for logging
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Function to check if file exists
file_exists() {
    [ -f "$1" ]
}

# Function to check if directory exists
dir_exists() {
    [ -d "$1" ]
}

# Function to create directory if it doesn't exist
ensure_dir() {
    if ! dir_exists "$1"; then
        log_info "Creating directory: $1"
        mkdir -p "$1"
    fi
}

# Function to get file size in human readable format
get_file_size() {
    local file="$1"
    if file_exists "$file"; then
        du -h "$file" | cut -f1
    else
        echo "0B"
    fi
}

# Function to cleanup old backups
cleanup_old_backups() {
    local max_backups=7
    local backup_dir="$1"
    
    log_info "Cleaning up old backups (keeping latest $max_backups)"
    
    # Get list of backup files sorted by modification time (oldest first)
    local backup_files=($(find "$backup_dir" -name "unified_timeline_*.db" -type f -printf '%T@ %p\n' | sort -n | cut -d' ' -f2-))
    
    local total_backups=${#backup_files[@]}
    
    if [ $total_backups -gt $max_backups ]; then
        local files_to_delete=$((total_backups - max_backups))
        log_info "Found $total_backups backups, removing $files_to_delete oldest"
        
        for ((i=0; i<files_to_delete; i++)); do
            local file_to_delete="${backup_files[$i]}"
            log_info "Removing old backup: $file_to_delete"
            rm -f "$file_to_delete"
        done
    else
        log_info "Found $total_backups backups, no cleanup needed"
    fi
}

# Function to verify backup integrity
verify_backup() {
    local backup_file="$1"
    local original_file="$2"
    
    log_info "Verifying backup integrity..."
    
    if ! file_exists "$backup_file"; then
        log_error "Backup file does not exist: $backup_file"
        return 1
    fi
    
    if ! file_exists "$original_file"; then
        log_warning "Original database file does not exist: $original_file"
        return 0
    fi
    
    # Compare file sizes (rough integrity check)
    local original_size=$(stat -c%s "$original_file" 2>/dev/null || stat -f%z "$original_file" 2>/dev/null || echo "0")
    local backup_size=$(stat -c%s "$backup_file" 2>/dev/null || stat -f%z "$backup_file" 2>/dev/null || echo "0")
    
    if [ "$original_size" -eq "$backup_size" ]; then
        log_success "Backup size matches original: $(get_file_size "$backup_file")"
    else
        log_warning "Backup size differs from original: original=$(get_file_size "$original_file"), backup=$(get_file_size "$backup_file")"
    fi
    
    # Check if backup file is readable
    if sqlite3 "$backup_file" "SELECT COUNT(*) FROM sqlite_master;" >/dev/null 2>&1; then
        log_success "Backup database is readable and valid"
    else
        log_error "Backup database is not readable or corrupted"
        return 1
    fi
    
    return 0
}

# Function to create backup
create_backup() {
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    local backup_file="$BACKUP_PATH/unified_timeline_${timestamp}.db"
    
    log_info "Starting backup process..."
    log_info "Source: $DB_PATH"
    log_info "Destination: $backup_file"
    
    # Ensure backup directory exists
    ensure_dir "$BACKUP_PATH"
    
    # Check if source database exists
    if ! file_exists "$DB_PATH"; then
        log_warning "Source database does not exist: $DB_PATH"
        log_info "Creating empty backup for tracking purposes"
        touch "$backup_file"
        log_success "Empty backup created: $backup_file"
        return 0
    fi
    
    # Get original file size
    local original_size=$(get_file_size "$DB_PATH")
    log_info "Original database size: $original_size"
    
    # Create backup
    log_info "Creating backup..."
    if cp "$DB_PATH" "$backup_file"; then
        log_success "Backup created successfully: $backup_file"
    else
        log_error "Failed to create backup"
        return 1
    fi
    
    # Verify backup
    if verify_backup "$backup_file" "$DB_PATH"; then
        log_success "Backup verification passed"
    else
        log_error "Backup verification failed"
        rm -f "$backup_file"
        return 1
    fi
    
    # Set proper permissions
    chmod 644 "$backup_file"
    
    # Cleanup old backups
    cleanup_old_backups "$BACKUP_PATH"
    
    log_success "Backup process completed successfully"
    log_info "Backup file: $backup_file"
    log_info "Backup size: $(get_file_size "$backup_file")"
    
    return 0
}

# Function to show backup status
show_backup_status() {
    log_info "Backup Status Report"
    echo "===================="
    
    echo "Configuration:"
    echo "  Database Path: $DB_PATH"
    echo "  Backup Path: $BACKUP_PATH"
    echo "  Log Level: $LOG_LEVEL"
    echo
    
    echo "Source Database:"
    if file_exists "$DB_PATH"; then
        echo "  Status: Exists"
        echo "  Size: $(get_file_size "$DB_PATH")"
        echo "  Modified: $(stat -c%y "$DB_PATH" 2>/dev/null || stat -f%Sm "$DB_PATH" 2>/dev/null || echo "Unknown")"
    else
        echo "  Status: Not found"
    fi
    echo
    
    echo "Backup Directory:"
    if dir_exists "$BACKUP_PATH"; then
        echo "  Status: Exists"
        echo "  Path: $BACKUP_PATH"
        
        local backup_count=$(find "$BACKUP_PATH" -name "unified_timeline_*.db" -type f | wc -l)
        echo "  Backup Count: $backup_count"
        
        if [ $backup_count -gt 0 ]; then
            echo "  Recent Backups:"
            find "$BACKUP_PATH" -name "unified_timeline_*.db" -type f -printf "    %T@ %p\n" | sort -n | tail -5 | while read timestamp file; do
                local date=$(date -d "@$timestamp" '+%Y-%m-%d %H:%M:%S' 2>/dev/null || date -r "$timestamp" '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo "Unknown")
                local size=$(get_file_size "$file")
                echo "      $date - $size - $(basename "$file")"
            done
        fi
    else
        echo "  Status: Not found"
    fi
    echo
}

# Main execution
main() {
    log_info "FileTree Timeline Visualizer - Backup Script Started"
    
    # Show current status
    show_backup_status
    
    # Create backup
    if create_backup; then
        log_success "Backup process completed successfully"
        exit 0
    else
        log_error "Backup process failed"
        exit 1
    fi
}

# Handle command line arguments
case "${1:-backup}" in
    "backup")
        main
        ;;
    "status")
        show_backup_status
        ;;
    "verify")
        if [ -n "$2" ]; then
            verify_backup "$2" "$DB_PATH"
        else
            log_error "Please provide backup file path"
            exit 1
        fi
        ;;
    "cleanup")
        ensure_dir "$BACKUP_PATH"
        cleanup_old_backups "$BACKUP_PATH"
        ;;
    "help"|"-h"|"--help")
        echo "FileTree Timeline Visualizer - Backup Script"
        echo
        echo "Usage: $0 [COMMAND]"
        echo
        echo "Commands:"
        echo "  backup      Create a new backup (default)"
        echo "  status      Show backup status"
        echo "  verify FILE Verify backup file integrity"
        echo "  cleanup     Clean up old backups"
        echo "  help        Show this help message"
        echo
        echo "Environment Variables:"
        echo "  DB_PATH         Source database path (default: /data/unified_timeline.db)"
        echo "  BACKUP_PATH     Backup directory path (default: /data/backups)"
        echo "  LOG_LEVEL       Logging level (default: INFO)"
        ;;
    *)
        log_error "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac 