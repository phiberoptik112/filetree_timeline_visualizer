/**
 * Main JavaScript Module
 * 
 * Handles client-side functionality including DOM manipulation,
 * API communication, real-time updates, and user interactions.
 */

class ApplicationManager {
    constructor() {
        this.config = {
            apiBaseUrl: '/api',
            refreshInterval: 5000,
            maxRetries: 3,
            timeout: 10000
        };
        
        this.state = {
            users: [],
            currentUser: null,
            isLoading: false,
            errors: [],
            lastUpdate: null
        };
        
        this.eventHandlers = new Map();
        this.apiClient = new APIClient(this.config.apiBaseUrl);
        this.uiManager = new UIManager();
        
        this.init();
    }
    
    async init() {
        console.log('Initializing Application Manager...');
        
        try {
            this.setupEventListeners();
            this.setupPeriodicUpdates();
            await this.loadInitialData();
            this.uiManager.showSection('dashboard');
            
            console.log('Application initialized successfully');
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.handleError(error);
        }
    }
    
    setupEventListeners() {
        // User management events
        document.addEventListener('DOMContentLoaded', () => {
            this.bindUserFormEvents();
            this.bindNavigationEvents();
            this.bindSearchEvents();
        });
        
        // Custom application events
        document.addEventListener('userCreated', (event) => {
            this.handleUserCreated(event.detail);
        });
        
        document.addEventListener('userUpdated', (event) => {
            this.handleUserUpdated(event.detail);
        });
        
        document.addEventListener('userDeleted', (event) => {
            this.handleUserDeleted(event.detail);
        });
        
        // Error handling
        window.addEventListener('error', (event) => {
            this.handleError(event.error);
        });
        
        // Unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError(event.reason);
        });
    }
    
    bindUserFormEvents() {
        const userForm = document.getElementById('userForm');
        if (userForm) {
            userForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                await this.handleUserFormSubmit(event.target);
            });
        }
        
        const deleteButtons = document.querySelectorAll('.delete-user-btn');
        deleteButtons.forEach(button => {
            button.addEventListener('click', async (event) => {
                const userId = event.target.dataset.userId;
                if (confirm('Are you sure you want to delete this user?')) {
                    await this.deleteUser(userId);
                }
            });
        });
    }
    
    bindNavigationEvents() {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (event) => {
                event.preventDefault();
                const section = event.target.dataset.section;
                this.navigateToSection(section);
            });
        });
    }
    
    bindSearchEvents() {
        const searchInput = document.getElementById('userSearch');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (event) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.performSearch(event.target.value);
                }, 300);
            });
        }
    }
    
    setupPeriodicUpdates() {
        setInterval(async () => {
            try {
                await this.refreshAnalytics();
                this.state.lastUpdate = new Date();
            } catch (error) {
                console.warn('Failed to refresh analytics:', error);
            }
        }, this.config.refreshInterval);
    }
    
    async loadInitialData() {
        this.setState({ isLoading: true });
        
        try {
            const [users, analytics] = await Promise.all([
                this.apiClient.getUsers(),
                this.apiClient.getAnalytics()
            ]);
            
            this.setState({ 
                users: users.users || [],
                isLoading: false
            });
            
            this.uiManager.renderUsers(this.state.users);
            this.uiManager.renderAnalytics(analytics);
            
        } catch (error) {
            this.setState({ isLoading: false });
            throw error;
        }
    }
    
    async handleUserFormSubmit(form) {
        const formData = new FormData(form);
        const userData = {
            name: formData.get('name'),
            email: formData.get('email'),
            preferences: {
                theme: formData.get('theme') || 'light',
                notifications: formData.has('notifications')
            }
        };
        
        try {
            this.setState({ isLoading: true });
            
            const userId = form.dataset.userId;
            if (userId) {
                await this.updateUser(userId, userData);
            } else {
                await this.createUser(userData);
            }
            
            form.reset();
            this.uiManager.hideModal('userModal');
            
        } catch (error) {
            this.handleError(error);
        } finally {
            this.setState({ isLoading: false });
        }
    }
    
    async createUser(userData) {
        try {
            const response = await this.apiClient.createUser(userData);
            const newUser = { ...userData, id: response.id };
            
            this.setState({
                users: [...this.state.users, newUser]
            });
            
            this.uiManager.renderUsers(this.state.users);
            this.uiManager.showNotification('User created successfully', 'success');
            
            // Dispatch custom event
            document.dispatchEvent(new CustomEvent('userCreated', {
                detail: newUser
            }));
            
        } catch (error) {
            throw new Error(`Failed to create user: ${error.message}`);
        }
    }
    
    async updateUser(userId, userData) {
        try {
            await this.apiClient.updateUser(userId, userData);
            
            const updatedUsers = this.state.users.map(user => 
                user.id === parseInt(userId) ? { ...user, ...userData } : user
            );
            
            this.setState({ users: updatedUsers });
            this.uiManager.renderUsers(this.state.users);
            this.uiManager.showNotification('User updated successfully', 'success');
            
            // Dispatch custom event
            document.dispatchEvent(new CustomEvent('userUpdated', {
                detail: { userId, userData }
            }));
            
        } catch (error) {
            throw new Error(`Failed to update user: ${error.message}`);
        }
    }
    
    async deleteUser(userId) {
        try {
            await this.apiClient.deleteUser(userId);
            
            const filteredUsers = this.state.users.filter(
                user => user.id !== parseInt(userId)
            );
            
            this.setState({ users: filteredUsers });
            this.uiManager.renderUsers(this.state.users);
            this.uiManager.showNotification('User deleted successfully', 'success');
            
            // Dispatch custom event
            document.dispatchEvent(new CustomEvent('userDeleted', {
                detail: { userId }
            }));
            
        } catch (error) {
            this.handleError(error);
        }
    }
    
    async refreshAnalytics() {
        try {
            const analytics = await this.apiClient.getAnalytics();
            this.uiManager.renderAnalytics(analytics);
        } catch (error) {
            console.warn('Failed to refresh analytics:', error);
        }
    }
    
    performSearch(query) {
        if (!query.trim()) {
            this.uiManager.renderUsers(this.state.users);
            return;
        }
        
        const filteredUsers = this.state.users.filter(user =>
            user.name.toLowerCase().includes(query.toLowerCase()) ||
            user.email.toLowerCase().includes(query.toLowerCase())
        );
        
        this.uiManager.renderUsers(filteredUsers);
    }
    
    navigateToSection(section) {
        this.uiManager.showSection(section);
        
        // Update URL without page reload
        const url = new URL(window.location);
        url.searchParams.set('section', section);
        window.history.pushState({ section }, '', url);
    }
    
    handleUserCreated(user) {
        console.log('User created:', user);
        this.refreshAnalytics();
    }
    
    handleUserUpdated(data) {
        console.log('User updated:', data);
    }
    
    handleUserDeleted(data) {
        console.log('User deleted:', data);
        this.refreshAnalytics();
    }
    
    handleError(error) {
        console.error('Application error:', error);
        
        const errorMessage = error.message || 'An unexpected error occurred';
        this.setState({
            errors: [...this.state.errors, {
                message: errorMessage,
                timestamp: new Date(),
                id: Date.now()
            }]
        });
        
        this.uiManager.showNotification(errorMessage, 'error');
    }
    
    setState(newState) {
        this.state = { ...this.state, ...newState };
        console.log('State updated:', this.state);
    }
    
    getState() {
        return { ...this.state };
    }
}


class APIClient {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
    }
    
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            headers: { ...this.defaultHeaders, ...options.headers },
            ...options
        };
        
        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }
            
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            }
            
            return await response.text();
            
        } catch (error) {
            console.error(`API request failed: ${endpoint}`, error);
            throw error;
        }
    }
    
    async getUsers(page = 1, perPage = 10) {
        return this.request(`/users?page=${page}&per_page=${perPage}`);
    }
    
    async getUser(userId) {
        return this.request(`/users/${userId}`);
    }
    
    async createUser(userData) {
        return this.request('/users', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }
    
    async updateUser(userId, userData) {
        return this.request(`/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify(userData)
        });
    }
    
    async deleteUser(userId) {
        return this.request(`/users/${userId}`, {
            method: 'DELETE'
        });
    }
    
    async getAnalytics() {
        return this.request('/analytics');
    }
    
    async healthCheck() {
        return this.request('/health');
    }
}


class UIManager {
    constructor() {
        this.notifications = [];
        this.modals = new Map();
        this.currentSection = 'dashboard';
    }
    
    renderUsers(users) {
        const container = document.getElementById('usersContainer');
        if (!container) return;
        
        if (users.length === 0) {
            container.innerHTML = '<p class="empty-state">No users found</p>';
            return;
        }
        
        const userCards = users.map(user => this.createUserCard(user)).join('');
        container.innerHTML = userCards;
        
        // Re-bind event listeners for new elements
        this.bindDynamicEvents();
    }
    
    createUserCard(user) {
        return `
            <div class="user-card" data-user-id="${user.id}">
                <div class="user-info">
                    <h3>${this.escapeHtml(user.name)}</h3>
                    <p>${this.escapeHtml(user.email)}</p>
                    <small>Created: ${new Date(user.created_at).toLocaleDateString()}</small>
                </div>
                <div class="user-actions">
                    <button class="btn btn-edit" data-user-id="${user.id}">Edit</button>
                    <button class="btn btn-delete delete-user-btn" data-user-id="${user.id}">Delete</button>
                </div>
            </div>
        `;
    }
    
    renderAnalytics(analytics) {
        const elements = {
            totalUsers: document.getElementById('totalUsers'),
            totalRequests: document.getElementById('totalRequests'),
            uptime: document.getElementById('uptime'),
            memoryUsage: document.getElementById('memoryUsage')
        };
        
        if (elements.totalUsers) {
            elements.totalUsers.textContent = analytics.total_users || 0;
        }
        
        if (elements.totalRequests) {
            elements.totalRequests.textContent = analytics.total_requests || 0;
        }
        
        if (elements.uptime) {
            elements.uptime.textContent = this.formatUptime(analytics.uptime || 0);
        }
        
        if (elements.memoryUsage && analytics.memory_usage) {
            const usage = analytics.memory_usage;
            elements.memoryUsage.textContent = `${usage.percent.toFixed(1)}%`;
        }
    }
    
    showNotification(message, type = 'info', duration = 5000) {
        const notification = {
            id: Date.now(),
            message,
            type,
            timestamp: new Date()
        };
        
        this.notifications.push(notification);
        this.renderNotification(notification);
        
        setTimeout(() => {
            this.removeNotification(notification.id);
        }, duration);
    }
    
    renderNotification(notification) {
        const container = this.getNotificationContainer();
        
        const notificationEl = document.createElement('div');
        notificationEl.className = `notification notification-${notification.type}`;
        notificationEl.dataset.notificationId = notification.id;
        notificationEl.innerHTML = `
            <span>${this.escapeHtml(notification.message)}</span>
            <button class="notification-close" onclick="this.parentElement.remove()">×</button>
        `;
        
        container.appendChild(notificationEl);
    }
    
    removeNotification(notificationId) {
        const notification = document.querySelector(`[data-notification-id="${notificationId}"]`);
        if (notification) {
            notification.remove();
        }
        
        this.notifications = this.notifications.filter(n => n.id !== notificationId);
    }
    
    getNotificationContainer() {
        let container = document.getElementById('notificationContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notificationContainer';
            container.className = 'notification-container';
            document.body.appendChild(container);
        }
        return container;
    }
    
    showSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.section').forEach(section => {
            section.style.display = 'none';
        });
        
        // Show target section
        const targetSection = document.getElementById(`${sectionName}Section`);
        if (targetSection) {
            targetSection.style.display = 'block';
            this.currentSection = sectionName;
        }
        
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        const activeLink = document.querySelector(`[data-section="${sectionName}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }
    
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
            this.modals.set(modalId, true);
        }
    }
    
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            this.modals.delete(modalId);
        }
    }
    
    bindDynamicEvents() {
        // Re-bind events for dynamically created elements
        const deleteButtons = document.querySelectorAll('.delete-user-btn:not([data-bound])');
        deleteButtons.forEach(button => {
            button.dataset.bound = 'true';
            button.addEventListener('click', async (event) => {
                const userId = event.target.dataset.userId;
                if (confirm('Are you sure you want to delete this user?')) {
                    // This would be handled by the application manager
                    console.log(`Delete user ${userId}`);
                }
            });
        });
    }
    
    formatUptime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}


// Utility functions
const utils = {
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },
    
    formatDate(date) {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(date));
    },
    
    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
};


// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ApplicationManager();
});


// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ApplicationManager, APIClient, UIManager, utils };
}