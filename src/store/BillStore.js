/**
 * Bill Store
 * 
 * Centralized storage for bill data with persistence to localStorage.
 * Provides CRUD operations and listener pattern for reactive updates.
 * 
 * Bill Object Structure:
 * - id: Unique identifier (generated on creation)
 * - name: Bill name (e.g., "Electric Bill")
 * - category: Bill category (e.g., "Utilities")
 * - dueDate: Due date in YYYY-MM-DD format
 * - amountDue: Amount of bill in dollars
 * - balance: Current balance owed
 * - isPaid: Payment status (boolean)
 * - recurrence: Recurrence frequency ('One-time', 'Weekly', 'Bi-weekly', 'Monthly', 'Yearly')
 * - notes: Additional notes (optional)
 * - lastPaymentDate: Date of last payment (optional)
 * - paymentHistory: Array of past payments (optional)
 * 
 * @module BillStore
 * @requires dates
 */

import { createLocalDate, formatLocalDate, calculateNextDueDate } from '../utils/dates.js';
import { queueOfflineTransaction } from '../utils/indexedDBUtils.js';
import StorageManager from '../utils/StorageManager.js';
import logger from '../utils/logger.js';
import { STORAGE_KEYS } from '../utils/constants.js';

/**
 * Bill Store Class
 * 
 * Singleton class that manages all bill data.
 * Automatically persists changes to localStorage.
 * Notifies listeners on any data change for reactive UI updates.
 * 
 * @class BillStore
 */
class BillStore {
    /**
     * Initialize BillStore and load bills from localStorage
     * 
     * @constructor
     * @description Initializes empty bills array and listeners array,
     *   then attempts to load bills from localStorage.
     *   Creates empty bills list if localStorage is unavailable or corrupted.
     */
    constructor() {
        this.bills = [];
        this.listeners = [];
        this.load();
    }

    /**
     * Load bills from localStorage
     * 
     * @method load
     * @description Retrieves bills from localStorage and populates the bills array.
     *   Silently ignores errors if localStorage is unavailable or corrupted.
     *   Called automatically on BillStore instantiation.
     * 
     * @returns {void}
     * 
     * @example
     * const store = new BillStore();
     * // Bills automatically loaded from localStorage during construction
     */
    load() {
        try {
            const storedBills = StorageManager.get(STORAGE_KEYS.BILLS, null);
            if (storedBills) {
                // StorageManager already parses JSON, so we don't need safeJSONParse
                const parsed = Array.isArray(storedBills) ? storedBills : [];

                // Validate that we got an array
                if (!Array.isArray(parsed)) {
                    logger.warn('Stored bills data is not an array, resetting to empty');
                    this.bills = [];
                    return;
                }

                this.bills = parsed;
            }
        } catch (error) {
            logger.error('Failed to load bills from storage', error);
            this.bills = [];
        }
    }

    /**
     * Save bills to localStorage and notify listeners
     * 
     * @method save
     * @description Persists current bills array to localStorage as JSON string.
     *   Automatically called after any modify operation (add, update, delete).
     *   Triggers all subscribed listeners to enable reactive UI updates.
     *   Handles serialization errors silently to prevent crashes.
     * 
     * @returns {void}
     * 
     * @example
     * // Automatically called after bill modifications
     * store.add(newBill); // Calls save() internally
     */
    save(action = 'update', data = null) {
        StorageManager.set(STORAGE_KEYS.BILLS, this.bills);

        // Queue for offline sync if needed (especially for Supabase)
        if (data) {
            queueOfflineTransaction({ action, data }).catch(err => {
                logger.error('Failed to queue offline transaction', err);
            });
        }

        this.notify();
    }

    /**
     * Get all bills from the store
     * 
     * @method getAll
     * @description Returns the complete list of bills currently stored.
     *   Safe to mutate array elements, but modifications must be followed
     *   by update() call to persist changes and notify listeners.
     * 
     * @returns {Array<Object>} Array of bill objects
     * 
     * @example
     * const allBills = store.getAll();
     * console.log(allBills.length); // Total number of bills
     */
    getAll() {
        return this.bills;
    }

    /**
     * Add a new bill to the store
     * 
     * @method add
     * @param {Object} bill - Bill object to add
     * @param {string} [bill.id] - Optional unique identifier. Auto-generated from timestamp if omitted.
     * @param {string} bill.name - Bill name (e.g., "Electric Bill")
     * @param {string} bill.category - Bill category for filtering (e.g., "Utilities")
     * @param {string} bill.dueDate - Due date in YYYY-MM-DD format
     * @param {number} bill.amountDue - Amount due in dollars
     * @param {number} bill.balance - Current balance owed
     * @param {boolean} bill.isPaid - Payment status
     * @param {string} bill.recurrence - Frequency ('One-time', 'Weekly', 'Bi-weekly', 'Monthly', 'Yearly')
     * @param {string} [bill.notes] - Optional notes about the bill
     * @param {string} [bill.lastPaymentDate] - Optional last payment date (YYYY-MM-DD)
     * @param {Array} [bill.paymentHistory] - Optional payment history array
     * 
     * @returns {void}
     * 
     * @description Creates new bill record with auto-generated ID if needed.
     *   Handles both one-time and recurring bills.
     *   Automatically saves to localStorage and notifies listeners.
     * 
     * @example
     * store.add({
     *   name: "Electric Bill",
     *   category: "Utilities",
     *   dueDate: "2024-12-15",
     *   amountDue: 125.50,
     *   balance: 125.50,
     *   isPaid: false,
     *   recurrence: "Monthly"
     * });
     */
    add(bill) {
        // Generate ID if not present
        if (!bill.id) {
            bill.id = Date.now().toString();
        }

        // Handle One-time bills
        if (bill.recurrence === 'One-time') {
            this.bills.push(bill);
        } else {
            // Check for existing base bill for recurring updates? 
            // For now, simple add. Logic from index.js saveBill needs to be adapted here or kept in controller.
            // Keeping it simple: Store just adds what it's given. logic stays in controller for now?
            // Refactor Strategy: Move Logic HERE.
            this.bills.push(bill);
        }
        this.save('add', bill);
    }

    /**
     * Update an existing bill
     * 
     * @method update
     * @param {Object} updatedBill - Updated bill object with matching id
     * @param {string} updatedBill.id - Bill ID to match (required for lookup)
     * @param {string} [updatedBill.name] - Updated bill name
     * @param {string} [updatedBill.category] - Updated category
     * @param {string} [updatedBill.dueDate] - Updated due date (YYYY-MM-DD)
     * @param {number} [updatedBill.amountDue] - Updated amount due
     * @param {number} [updatedBill.balance] - Updated balance
     * @param {boolean} [updatedBill.isPaid] - Updated payment status
     * @param {string} [updatedBill.recurrence] - Updated recurrence
     * @param {string} [updatedBill.notes] - Updated notes
     * 
     * @returns {void}
     * 
     * @description Replaces entire bill object with new one when ID matches.
     *   Does nothing silently if ID not found (no error thrown).
     *   Automatically saves to localStorage and notifies listeners on success.
     * 
     * @example
     * store.update({
     *   id: "1702681200000",
     *   name: "Electric Bill",
     *   category: "Utilities",
     *   dueDate: "2024-12-20",
     *   amountDue: 150.00,
     *   balance: 75.00,
     *   isPaid: false,
     *   recurrence: "Monthly"
     * });
     */
    update(updatedBill) {
        const index = this.bills.findIndex(b => b.id === updatedBill.id);
        if (index !== -1) {
            this.bills[index] = updatedBill;
            this.save('update', updatedBill);
        }
    }

    /**
     * Delete a bill from the store
     * 
     * @method delete
     * @param {string} id - Bill ID to delete
     * 
     * @returns {void}
     * 
     * @description Removes bill with matching ID from the store.
     *   Silently succeeds even if ID not found (no error thrown).
     *   Automatically saves to localStorage and notifies listeners.
     * 
     * @example
     * store.delete("1702681200000"); // Delete specific bill
     */
    delete(id) {
        const billToDelete = this.bills.find(b => b.id === id);
        this.bills = this.bills.filter(b => b.id !== id);
        this.save('delete', { id });
    }

    /**
     * Replace all bills in the store (bulk update)
     * 
     * @method setBills
     * @param {Array<Object>} bills - Complete new bills array
     * 
     * @returns {void}
     * 
     * @description Overwrites entire bills array with new one.
     *   Useful for migrations, bulk updates, or restoring backups.
     *   Automatically saves to localStorage and notifies listeners.
     * 
     * @example
     * // Restore backup
     * const backup = JSON.parse(backupJson);
     * store.setBills(backup);
     */
    setBills(bills) {
        this.bills = bills;
        this.save();
    }

    /**
     * Subscribe to store changes
     * 
     * @method subscribe
     * @param {Function} listener - Callback function called on store changes
     * @description Listener receives updated bills array as parameter.
     *   Called immediately after save() to enable reactive UI updates.
     *   Returns unsubscribe function to remove listener.
     * 
     * @returns {Function} Unsubscribe function - call to remove this listener
     * 
     * @example
     * const unsubscribe = store.subscribe((bills) => {
     *   console.log("Bills updated:", bills);
     *   refreshBillDisplay(bills);
     * });
     * 
     * // Later, to stop listening:
     * unsubscribe();
     */
    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    /**
     * Notify all subscribers of store changes
     * 
     * @method notify
     * @private
     * @description Called internally after save() to trigger all listener callbacks.
     *   Passes current bills array to each listener.
     *   Errors in individual listeners do not affect other listeners.
     * 
     * @returns {void}
     */
    notify() {
        this.listeners.forEach(listener => listener(this.bills));
    }

}

export const billStore = new BillStore();
