import { createLocalDate, formatLocalDate, calculateNextDueDate } from '../utils/dates.js';

class BillStore {
    constructor() {
        this.bills = [];
        this.listeners = [];
        this.load();
    }

    /**
     * Load bills from localStorage
     */
    load() {
        const storedBills = localStorage.getItem('bills');
        if (storedBills) {
            this.bills = JSON.parse(storedBills);
        }
    }

    /**
     * Save bills to localStorage and notify listeners
     */
    save() {
        localStorage.setItem('bills', JSON.stringify(this.bills));
        this.notify();
    }

    /**
     * Get all bills
     * @returns {Array} List of bills
     */
    getAll() {
        return this.bills;
    }

    /**
     * Add a new bill
     * @param {Object} bill 
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
        this.save();
    }

    /**
     * Update an existing bill
     * @param {Object} updatedBill 
     */
    update(updatedBill) {
        const index = this.bills.findIndex(b => b.id === updatedBill.id);
        if (index !== -1) {
            this.bills[index] = updatedBill;
            this.save();
        }
    }

    /**
     * Delete a bill
     * @param {string} id 
     */
    delete(id) {
        this.bills = this.bills.filter(b => b.id !== id);
        this.save();
    }

    /**
     * Overwrite all bills (for bulk updates/migrations)
     * @param {Array} bills 
     */
    setBills(bills) {
        this.bills = bills;
        this.save();
    }

    /**
     * Subscribe to store changes
     * @param {Function} listener 
     * @returns {Function} Unsubscribe function
     */
    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    notify() {
        this.listeners.forEach(listener => listener(this.bills));
    }
}

export const billStore = new BillStore();
