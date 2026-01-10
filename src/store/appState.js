/**
 * App State Store
 * Centralized UI state management with subscriber pattern
 * Handles: selectedPaycheck, selectedCategory, viewMode, displayMode, paymentFilter
 */

class AppState {
    constructor() {
        this.state = {
            selectedPaycheck: null,
            selectedCategory: null,
            viewMode: 'filtered', // 'filtered' or 'all'
            displayMode: 'list', // 'list', 'calendar', 'analytics'
            paymentFilter: 'all', // 'all', 'unpaid', 'paid'
            currentCalendarDate: new Date(),
            isLoading: false,
            error: null
        };

        this.subscribers = [];
        this.loadSavedState();
    }

    /**
     * Load state from localStorage where applicable
     */
    loadSavedState() {
        const savedCategory = localStorage.getItem('selectedCategory');
        if (savedCategory) {
            this.state.selectedCategory = savedCategory;
        }
    }

    /**
     * Get entire state or a specific property
     */
    getState(key = null) {
        if (key) {
            return this.state[key];
        }
        return this.state;
    }

    /**
     * Update state and notify subscribers
     */
    setState(updates) {
        this.state = { ...this.state, ...updates };
        this.notifySubscribers();
    }

    /**
     * Set individual state properties
     */
    setSelectedPaycheck(index) {
        this.state.selectedPaycheck = index;
        this.notifySubscribers();
    }

    setSelectedCategory(category) {
        this.state.selectedCategory = category;
        localStorage.setItem('selectedCategory', category);
        this.notifySubscribers();
    }

    setViewMode(mode) {
        this.state.viewMode = mode; // 'filtered' or 'all'
        this.notifySubscribers();
    }

    setDisplayMode(mode) {
        this.state.displayMode = mode; // 'list', 'calendar', 'analytics'
        this.notifySubscribers();
    }

    setPaymentFilter(filter) {
        this.state.paymentFilter = filter; // 'all', 'unpaid', 'paid'
        this.notifySubscribers();
    }

    setCurrentCalendarDate(date) {
        this.state.currentCalendarDate = date;
        this.notifySubscribers();
    }

    setLoading(isLoading) {
        this.state.isLoading = isLoading;
        this.notifySubscribers();
    }

    /**
     * Set error state with optional message
     */
    setError(error) {
        this.state.error = error;
        this.notifySubscribers();
    }

    /**
     * Clear error state
     */
    clearError() {
        this.state.error = null;
        this.notifySubscribers();
    }

    /**
     * Subscribe to state changes
     */
    subscribe(callback) {
        this.subscribers.push(callback);
        return () => {
            this.subscribers = this.subscribers.filter(sub => sub !== callback);
        };
    }

    /**
     * Notify all subscribers of state change
     */
    notifySubscribers() {
        this.subscribers.forEach(callback => {
            try {
                callback(this.state);
            } catch (error) {
                console.error('Error in app state subscriber:', error);
            }
        });
    }

    /**
     * Reset state to initial values
     */
    reset() {
        this.state = {
            selectedPaycheck: null,
            selectedCategory: localStorage.getItem('selectedCategory') || null,
            viewMode: 'filtered',
            displayMode: 'list',
            paymentFilter: 'all',
            currentCalendarDate: new Date(),
            isLoading: false,
            error: null
        };
        this.notifySubscribers();
    }
}

// Export singleton instance
export const appState = new AppState();
