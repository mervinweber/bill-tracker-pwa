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
        title: event.summary || event.eventType,
        details: event.eventType,
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
