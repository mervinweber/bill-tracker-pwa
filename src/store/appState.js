/**
 * App State Store
 * Centralized UI state management with subscriber pattern
 * 
 * Manages:
 * - selectedPaycheck: Current paycheck index for filtering
 * - selectedCategory: Current category filter
 * - viewMode: 'filtered' (paycheck+category view) or 'all' (all bills)
 * - displayMode: 'list', 'calendar', or 'analytics'
 * - paymentFilter: 'all', 'paid', or 'unpaid'
 * - isLoading: Loading state for async operations
 * - error: Current error message if any
 * 
 * @class AppState
 * @example
 * const state = appState.getState();
 * appState.setState({ selectedCategory: 'Utilities' });
 * appState.subscribe((newState) => console.log(newState));
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
     * 
     * @private
     * @returns {void}
     * @description Restores selectedCategory from localStorage on initialization
     */
    loadSavedState() {
        const savedCategory = localStorage.getItem('selectedCategory');
        if (savedCategory) {
            this.state.selectedCategory = savedCategory;
        }
    }

    /**
     * Get entire state or a specific property
     * 
     * @param {string|null} [key=null] - Optional property name to retrieve
     * @returns {Object|*} Entire state object if key is null, otherwise specific property value
     * @example
     * const allState = appState.getState();
     * const category = appState.getState('selectedCategory');
     */
    getState(key = null) {
        if (key) {
            return this.state[key];
        }
        return this.state;
    }

    /**
     * Update entire state and notify subscribers
     * 
     * @param {Object} updates - Partial state object with properties to update
     * @returns {void}
     * @description Merges provided updates into current state using shallow merge,
     *   then notifies all subscribers of the change.
     * @example
     * appState.setState({ selectedPaycheck: 0, selectedCategory: 'Utilities' });
     */
    setState(updates) {
        this.state = { ...this.state, ...updates };
        this.notifySubscribers();
    }

    /**
     * Set individual state properties with automatic notification
     * 
     * @param {number} index - Paycheck index (0-based)
     * @returns {void}
     * @description Updates selectedPaycheck and notifies subscribers
     */
    setSelectedPaycheck(index) {
        this.state.selectedPaycheck = index;
        this.notifySubscribers();
    }

    /**
     * Set selected category and persist to localStorage
     * 
     * @param {string} category - Category name to select
     * @returns {void}
     * @description Updates selectedCategory, saves to localStorage for persistence,
     *   and notifies subscribers of the change
     */
    setSelectedCategory(category) {
        this.state.selectedCategory = category;
        localStorage.setItem('selectedCategory', category);
        this.notifySubscribers();
    }

    /**
     * Set view mode (filtered or all bills)
     * 
     * @param {string} mode - View mode: 'filtered' or 'all'
     * @returns {void}
     * @description Updates viewMode and notifies subscribers
     */
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
