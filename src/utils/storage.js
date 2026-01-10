/**
 * Local Storage Utilities
 * 
 * Simple wrapper functions for localStorage operations on bills data.
 * Note: Prefer using BillStore class for better state management and reactivity.
 * These functions are maintained for backward compatibility.
 * 
 * @module storage
 * @deprecated Use BillStore from 'src/store/BillStore.js' instead for better state management
 */

/**
 * Save bills array to localStorage
 * 
 * @function saveBills
 * @param {Array<Object>} bills - Array of bill objects to persist
 * 
 * @returns {void}
 * 
 * @description Serializes bills array to JSON and stores in localStorage
 *   under 'bills' key. Overwrites any existing bills data.
 * 
 * @deprecated Use BillStore.save() instead for reactive updates and subscribers
 * 
 * @example
 * const bills = [
 *   { id: "1", name: "Electric", amountDue: 100 },
 *   { id: "2", name: "Water", amountDue: 50 }
 * ];
 * saveBills(bills);
 */
export const saveBills = (bills) => {
    localStorage.setItem('bills', JSON.stringify(bills));
};

/**
 * Retrieve bills array from localStorage
 * 
 * @function getBills
 * 
 * @returns {Array<Object>} Array of bill objects from localStorage.
 *   Returns empty array if no bills are stored or storage fails.
 * 
 * @description Retrieves and parses bills from localStorage.
 *   Safe fallback: returns empty array on any error.
 * 
 * @deprecated Use BillStore.getAll() instead for better state management
 * 
 * @example
 * const bills = getBills();
 * console.log(bills); // [{id: "1", name: "Electric", ...}, ...]
 */
export const getBills = () => {
    const stored = localStorage.getItem('bills');
    return stored ? JSON.parse(stored) : [];
};