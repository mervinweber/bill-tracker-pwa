import { getAuditEvents } from './auditTracker.js';

/**
 * @typedef {Object} BillTimelineEntry
 * @property {'payment'|'audit'} kind
 * @property {string} timestamp
 * @property {number} sortTime
 * @property {string} title
 * @property {string} details
 * @property {number|null} amount
 */

function toTimestamp(value) {
    const ms = Date.parse(value || '');
    return Number.isFinite(ms) ? ms : 0;
}

function toMoney(value) {
    const amount = Number.parseFloat(value);
    return Number.isFinite(amount) ? `$${amount.toFixed(2)}` : null;
}

function mapAuditTitle(eventType, summary) {
    if (summary) return summary;

    switch (eventType) {
        case 'bill.payment.recorded':
            return 'Payment recorded';
        case 'bill.payment_status.toggled':
            return 'Payment status updated';
        case 'bill.balance.updated':
            return 'Balance updated';
        case 'bill.reconcile.fixed':
            return 'Reconcile fix applied';
        case 'bill.due_date.updated':
            return 'Due date updated';
        default:
            return eventType;
    }
}

function mapAuditDetails(event) {
    const metadata = event?.metadata || {};

    switch (event.eventType) {
        case 'bill.balance.updated': {
            const balance = toMoney(metadata.balance);
            return balance ? `New balance: ${balance}` : event.eventType;
        }
        case 'bill.due_date.updated': {
            const previous = metadata.previousDueDate;
            const next = metadata.newDueDate;
            if (previous && next) {
                return `${previous} -> ${next}`;
            }
            return event.eventType;
        }
        case 'bill.reconcile.fixed':
            return metadata.issueCode ? `Issue fixed: ${metadata.issueCode}` : event.eventType;
        case 'bill.payment_status.toggled':
            return typeof metadata.isPaid === 'boolean'
                ? `Marked ${metadata.isPaid ? 'paid' : 'unpaid'}`
                : event.eventType;
        case 'bill.payment.recorded': {
            const amount = toMoney(metadata.amount);
            return amount ? `Payment amount: ${amount}` : event.eventType;
        }
        default:
            return event.eventType;
    }
}

/** @returns {BillTimelineEntry} */
function mapPaymentEvent(payment) {
    const amount = Number.parseFloat(payment.amount) || 0;
    const date = payment.date || new Date().toISOString().split('T')[0];

    return {
        kind: 'payment',
        timestamp: date,
        sortTime: toTimestamp(date),
        title: 'Payment recorded',
        details: payment.method
            ? `${payment.method}${payment.confirmationNumber ? ` | Conf: ${payment.confirmationNumber}` : ''}`
            : 'Payment entry',
        amount
    };
}

/** @returns {BillTimelineEntry} */
function mapAuditEvent(event) {
    return {
        kind: 'audit',
        timestamp: event.timestamp,
        sortTime: toTimestamp(event.timestamp),
        title: mapAuditTitle(event.eventType, event.summary),
        details: mapAuditDetails(event),
        amount: null
    };
}

/**
 * Build a unified timeline for a bill using payments + audit events.
 * @param {import('../types/domainTypes.js').Bill} bill
 * @returns {BillTimelineEntry[]}
 */
export function buildBillTimeline(bill) {
    if (!bill) {
        return [];
    }

    const paymentEvents = (bill.paymentHistory || []).map(mapPaymentEvent);
    const auditEvents = getAuditEvents(250)
        .filter((event) => event.entityType === 'bill' && event.entityId === bill.id)
        .map(mapAuditEvent);

    return [...paymentEvents, ...auditEvents]
        .sort((a, b) => b.sortTime - a.sortTime);
}
