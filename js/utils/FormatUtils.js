// FormatUtils - Data formatting and conversion utilities
class FormatUtils {
    constructor() {
        this.config = window.CONFIG || {};
    }
    
    // Format bytes to human-readable string
    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
    
    // Format timestamp to date string
    formatTimestamp(timestamp, format = 'default') {
        const date = new Date(timestamp * 1000);
        
        switch (format) {
            case 'date':
                return date.toLocaleDateString();
            case 'time':
                return date.toLocaleTimeString();
            case 'datetime':
                return date.toLocaleString();
            case 'iso':
                return date.toISOString();
            case 'relative':
                return this.getRelativeTime(timestamp);
            default:
                return date.toLocaleDateString();
        }
    }
    
    // Get relative time string (e.g., "2 hours ago")
    getRelativeTime(timestamp) {
        const now = Math.floor(Date.now() / 1000);
        const diff = now - timestamp;
        
        if (diff < 60) {
            return 'just now';
        } else if (diff < 3600) {
            const minutes = Math.floor(diff / 60);
            return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        } else if (diff < 86400) {
            const hours = Math.floor(diff / 3600);
            return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        } else if (diff < 2592000) {
            const days = Math.floor(diff / 86400);
            return `${days} day${days > 1 ? 's' : ''} ago`;
        } else if (diff < 31536000) {
            const months = Math.floor(diff / 2592000);
            return `${months} month${months > 1 ? 's' : ''} ago`;
        } else {
            const years = Math.floor(diff / 31536000);
            return `${years} year${years > 1 ? 's' : ''} ago`;
        }
    }
    
    // Format duration in seconds to human-readable string
    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;
        
        if (hours > 0) {
            return `${hours}h ${minutes}m ${remainingSeconds}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${remainingSeconds}s`;
        } else {
            return `${remainingSeconds}s`;
        }
    }
    
    // Format number with thousand separators
    formatNumber(num, decimals = 0) {
        return num.toLocaleString(undefined, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    }
    
    // Format percentage
    formatPercentage(value, total, decimals = 1) {
        const percentage = (value / total) * 100;
        return `${percentage.toFixed(decimals)}%`;
    }
    
    // Format confidence score
    formatConfidence(confidence) {
        return (confidence * 100).toFixed(1) + '%';
    }
    
    // Format priority level
    formatPriority(priority) {
        const priorities = {
            low: 'Low',
            medium: 'Medium',
            high: 'High',
            urgent: 'Urgent',
            critical: 'Critical'
        };
        
        return priorities[priority?.toLowerCase()] || priority || 'Normal';
    }
    
    // Format event type
    formatEventType(eventType) {
        return eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    
    // Format milestone category
    formatMilestoneCategory(category) {
        const categories = {
            requirement: 'Requirement',
            deliverable: 'Deliverable',
            meeting: 'Meeting',
            deadline: 'Deadline',
            decision: 'Decision',
            issue: 'Issue'
        };
        
        return categories[category?.toLowerCase()] || category || 'Other';
    }
    
    // Format file path for display
    formatFilePath(path, maxLength = 50) {
        if (!path || path.length <= maxLength) {
            return path;
        }
        
        const parts = path.split('/');
        if (parts.length <= 2) {
            return path;
        }
        
        let result = parts[0];
        let remainingLength = maxLength - result.length - 3; // Account for "..."
        
        for (let i = parts.length - 1; i > 0; i--) {
            if (remainingLength >= parts[i].length + 1) {
                result = parts[0] + '/.../' + parts.slice(i).join('/');
                break;
            }
            remainingLength -= parts[i].length + 1;
        }
        
        return result;
    }
    
    // Format MIME type for display
    formatMimeType(mimeType) {
        if (!mimeType) return 'Unknown';
        
        const parts = mimeType.split('/');
        if (parts.length !== 2) return mimeType;
        
        const [type, subtype] = parts;
        
        const typeMap = {
            'text': 'Text',
            'image': 'Image',
            'video': 'Video',
            'audio': 'Audio',
            'application': 'Application'
        };
        
        const subtypeMap = {
            'javascript': 'JavaScript',
            'x-python': 'Python',
            'html': 'HTML',
            'css': 'CSS',
            'json': 'JSON',
            'markdown': 'Markdown',
            'pdf': 'PDF',
            'zip': 'ZIP',
            'plain': 'Plain Text'
        };
        
        const formattedType = typeMap[type] || type;
        const formattedSubtype = subtypeMap[subtype] || subtype.replace(/^x-/, '');
        
        return `${formattedType} (${formattedSubtype})`;
    }
    
    // Format correlation strength
    formatCorrelationStrength(strength) {
        const percentage = (strength * 100).toFixed(1);
        let level = 'Low';
        
        if (strength >= 0.8) level = 'Very High';
        else if (strength >= 0.6) level = 'High';
        else if (strength >= 0.4) level = 'Medium';
        else if (strength >= 0.2) level = 'Low';
        else level = 'Very Low';
        
        return `${percentage}% (${level})`;
    }
    
    // Format hash for display
    formatHash(hash, length = 8) {
        if (!hash) return '';
        return hash.substring(0, length);
    }
    
    // Format file count
    formatFileCount(count) {
        if (count === 0) return 'No files';
        if (count === 1) return '1 file';
        return `${this.formatNumber(count)} files`;
    }
    
    // Format tree depth
    formatTreeDepth(depth) {
        if (depth === 0) return 'Root';
        if (depth === 1) return '1 level deep';
        return `${depth} levels deep`;
    }
    
    // Create HTML content for details panel
    createDetailsContent(data) {
        let html = '';
        
        Object.entries(data).forEach(([key, value]) => {
            if (value === null || value === undefined) return;
            
            const label = this.formatLabel(key);
            const formattedValue = this.formatValue(key, value);
            
            html += `<div><span class="label">${label}:</span> <span class="value">${formattedValue}</span></div>`;
        });
        
        return html;
    }
    
    // Format label for display
    formatLabel(key) {
        return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    
    // Format value based on key type
    formatValue(key, value) {
        if (typeof value === 'boolean') {
            return value ? 'Yes' : 'No';
        }
        
        if (typeof value === 'number') {
            if (key.includes('size')) {
                return this.formatBytes(value);
            }
            if (key.includes('time') || key.includes('timestamp')) {
                return this.formatTimestamp(value);
            }
            if (key.includes('confidence')) {
                return this.formatConfidence(value);
            }
            if (key.includes('count')) {
                return this.formatNumber(value);
            }
            return this.formatNumber(value);
        }
        
        if (typeof value === 'string') {
            if (key.includes('mime')) {
                return this.formatMimeType(value);
            }
            if (key.includes('hash')) {
                return this.formatHash(value);
            }
            if (key.includes('path')) {
                return this.formatFilePath(value);
            }
            if (key.includes('priority')) {
                return this.formatPriority(value);
            }
            if (key.includes('category')) {
                return this.formatMilestoneCategory(value);
            }
            if (key.includes('type') && key.includes('event')) {
                return this.formatEventType(value);
            }
            return value;
        }
        
        if (Array.isArray(value)) {
            return `${value.length} items`;
        }
        
        if (typeof value === 'object') {
            return 'Object';
        }
        
        return String(value);
    }
    
    // Truncate text
    truncateText(text, maxLength = 100, ellipsis = '...') {
        if (!text || text.length <= maxLength) {
            return text;
        }
        
        return text.substring(0, maxLength - ellipsis.length) + ellipsis;
    }
    
    // Escape HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Parse CSV string
    parseCSV(csvString) {
        const lines = csvString.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        const data = [];
        
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            if (values.length === headers.length) {
                const row = {};
                headers.forEach((header, index) => {
                    row[header] = values[index];
                });
                data.push(row);
            }
        }
        
        return data;
    }
    
    // Generate CSV from data
    generateCSV(data, headers = null) {
        if (!data || data.length === 0) return '';
        
        const csvHeaders = headers || Object.keys(data[0]);
        const csvRows = [csvHeaders.join(',')];
        
        data.forEach(row => {
            const values = csvHeaders.map(header => {
                const value = row[header];
                return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
            });
            csvRows.push(values.join(','));
        });
        
        return csvRows.join('\n');
    }
    
    // Validate and format coordinates
    formatCoordinates(x, y, z = null) {
        const coords = {
            x: parseFloat(x) || 0,
            y: parseFloat(y) || 0
        };
        
        if (z !== null) {
            coords.z = parseFloat(z) || 0;
        }
        
        return coords;
    }
    
    // Format angle in degrees
    formatAngle(radians, unit = 'degrees') {
        const degrees = radians * (180 / Math.PI);
        
        if (unit === 'radians') {
            return `${radians.toFixed(3)} rad`;
        }
        
        return `${degrees.toFixed(1)}°`;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FormatUtils;
} else if (typeof window !== 'undefined') {
    window.FormatUtils = FormatUtils;
}