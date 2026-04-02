/**
 * Shared domain typedefs for JSDoc across app modules.
 * Import in comments using: import('../types/domainTypes.js').Bill
 */

/**
 * @typedef {Object} PaymentHistoryEntry
 * @property {string} id
 * @property {string} date
 * @property {number} amount
 * @property {string} [method]
 * @property {string} [confirmationNumber]
 * @property {string} [notes]
 */

/**
 * @typedef {Object} SplitPayer
 * @property {string} id
 * @property {string} name
 * @property {number} amount
 * @property {boolean} isPaid
 */

/**
 * @typedef {Object} BillSplit
 * @property {boolean} enabled
 * @property {SplitPayer[]} payers
 */

/**
 * @typedef {Object} Bill
 * @property {string} id
 * @property {string} name
 * @property {string} category
 * @property {string} dueDate
 * @property {number} amountDue
 * @property {number} balance
 * @property {boolean} isPaid
 * @property {('One-time'|'Weekly'|'Bi-weekly'|'Monthly'|'Quarterly'|'Yearly')} recurrence
 * @property {string} [notes]
 * @property {string|null} [lastPaymentDate]
 * @property {PaymentHistoryEntry[]} [paymentHistory]
 * @property {BillSplit} [split]
 * @property {number} [debtTotal]
 * @property {number} [interestRate]
 * @property {boolean} [includeInDebtSnowball]
 */

/**
 * @typedef {Object} PaymentSettings
 * @property {string} startDate
 * @property {('weekly'|'bi-weekly'|'monthly')} frequency
 * @property {number} payPeriodsToShow
 * @property {number} [amount]
 */

/**
 * @typedef {Object} Category
 * @property {string} name
 * @property {boolean} [isDefault]
 */

/**
 * @typedef {Object} SyncOperation
 * @property {'push'|'pull'|'merge'} direction
 * @property {'bills'|'paymentSettings'|'all'} target
 * @property {string} startedAt
 * @property {string} [finishedAt]
 * @property {boolean} success
 * @property {string|null} [errorCode]
 */

export {};
