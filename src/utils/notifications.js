import StorageManager from './StorageManager.js';
import { STORAGE_KEYS } from './constants.js';
import logger from './logger.js';
import { MS_PER_DAY } from '../config/constants.js';

const DEFAULT_NOTIFICATION_SETTINGS = {
    enabled: false,
    daysBefore: 1,
    overdueEnabled: true,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00'
};

export function isNotificationSupported() {
    return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationSettings() {
    const stored = StorageManager.get(STORAGE_KEYS.NOTIFICATION_SETTINGS, {});
    return {
        ...DEFAULT_NOTIFICATION_SETTINGS,
        ...(stored || {})
    };
}

export async function requestNotificationPermission() {
    if (!isNotificationSupported()) {
        return 'unsupported';
    }

    if (Notification.permission === 'granted') {
        return 'granted';
    }

    if (Notification.permission === 'denied') {
        return 'denied';
    }

    try {
        return await Notification.requestPermission();
    } catch (error) {
        logger.error('Failed requesting notification permission', error);
        return 'error';
    }
}

function parseHHMM(timeStr) {
    const parts = String(timeStr || '00:00').split(':');
    return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
}

/**
 * Returns true if the given time falls within the configured quiet hours window.
 * Supports overnight windows (e.g. 22:00–08:00).
 *
 * @param {Object} settings - Notification settings object
 * @param {Date} [now] - Current time (defaults to new Date())
 * @returns {boolean}
 */
export function isInQuietHours(settings, now = new Date()) {
    if (!settings || !settings.quietHoursEnabled) {
        return false;
    }

    const startMins = parseHHMM(settings.quietHoursStart || '22:00');
    const endMins = parseHHMM(settings.quietHoursEnd || '08:00');
    const currentMins = now.getHours() * 60 + now.getMinutes();

    if (startMins >= endMins) {
        // Overnight window: e.g. 22:00–08:00
        return currentMins >= startMins || currentMins < endMins;
    } else {
        // Same-day window: e.g. 09:00–17:00
        return currentMins >= startMins && currentMins < endMins;
    }
}

function startOfDay(date) {
    const next = new Date(date);
    next.setHours(0, 0, 0, 0);
    return next;
}

function computeDaysUntilDue(dueDateString, today) {
    const due = new Date(`${dueDateString}T00:00:00`);
    if (Number.isNaN(due.getTime())) {
        return null;
    }

    const dueStart = startOfDay(due);
    const todayStart = startOfDay(today);
    return Math.round((dueStart.getTime() - todayStart.getTime()) / MS_PER_DAY);
}

function buildEligibleBills(bills, daysBefore, today) {
    return bills.filter(bill => {
        if (!bill || bill.isPaid) {
            return false;
        }

        if (bill.reminderEnabled === false) {
            return false;
        }

        if (!bill.dueDate) {
            return false;
        }

        const daysUntilDue = computeDaysUntilDue(bill.dueDate, today);
        if (daysUntilDue === null) {
            return false;
        }

        return daysUntilDue >= 0 && daysUntilDue <= daysBefore;
    });
}

function getReminderLedger() {
    return StorageManager.get(STORAGE_KEYS.NOTIFICATION_REMINDER_LOG, {});
}

function saveReminderLedger(ledger) {
    StorageManager.set(STORAGE_KEYS.NOTIFICATION_REMINDER_LOG, ledger);
}

function reminderKey(bill) {
    return `${bill.id}|${bill.dueDate}`;
}

function parseReminderKey(key) {
    const [billId, dueDate] = key.split('|');
    return { billId, dueDate };
}

function sendNotification(title, body, tag) {
    new Notification(title, {
        body,
        tag,
        silent: false
    });
}

export function sendTestReminder() {
    if (!isNotificationSupported()) {
        return { sent: false, reason: 'unsupported' };
    }

    if (Notification.permission !== 'granted') {
        return { sent: false, reason: 'permission-not-granted' };
    }

    sendNotification('Bill reminder test', 'Notifications are working. You will receive bill reminders based on your settings.', 'bill-reminder-test');
    return { sent: true, reason: 'sent' };
}

export function getReminderHistory(bills = []) {
    const ledger = getReminderLedger();
    const billsById = new Map((bills || []).map(bill => [bill.id, bill]));

    return Object.entries(ledger)
        .map(([key, sentAt]) => {
            const { billId, dueDate } = parseReminderKey(key);
            const bill = billsById.get(billId);
            return {
                key,
                billId,
                billName: bill?.name || 'Unknown bill',
                dueDate,
                sentAt: Number(sentAt) || 0
            };
        })
        .filter(item => item.sentAt > 0)
        .sort((a, b) => b.sentAt - a.sentAt);
}

export function checkAndSendDueBillReminders(bills = []) {
    const settings = getNotificationSettings();
    if (!settings.enabled) {
        return { sentCount: 0, reason: 'disabled' };
    }

    if (!isNotificationSupported()) {
        return { sentCount: 0, reason: 'unsupported' };
    }

    if (Notification.permission !== 'granted') {
        return { sentCount: 0, reason: 'permission-not-granted' };
    }

    const today = new Date();

    if (isInQuietHours(settings, today)) {
        return { sentCount: 0, reason: 'quiet-hours' };
    }

    const daysBefore = Number.isInteger(settings.daysBefore)
        ? settings.daysBefore
        : parseInt(settings.daysBefore, 10) || 1;

    // Advanced: We check for bills due in 0, 1, or 2 days for proactive reminders
    const eligible = buildEligibleBills(bills, Math.max(daysBefore, 2), today);

    const ledger = getReminderLedger();

    const unsent = eligible.filter(bill => {
        const daysUntil = computeDaysUntilDue(bill.dueDate, today);
        const stageKey = `${reminderKey(bill)}|stage-${daysUntil}`;
        return !ledger[stageKey];
    });

    const timestamp = Date.now();
    let sentCount = 0;

    if (unsent.length > 0) {
        if (unsent.length === 1) {
            const bill = unsent[0];
            const daysUntil = computeDaysUntilDue(bill.dueDate, today);
            let title = 'Bill Coming Up';
            let body = `${bill.name} is due in ${daysUntil} day${daysUntil === 1 ? '' : 's'} ($${(bill.amountDue || 0).toFixed(2)}).`;

            if (daysUntil === 0) {
                title = 'Bill Due Today';
                body = `${bill.name} is due today! ($${(bill.amountDue || 0).toFixed(2)}).`;
            }

            const options = {
                body,
                tag: `bill-${bill.id}`,
                data: { billId: bill.id, website: bill.website },
                actions: bill.website ? [{ action: 'pay', title: 'Pay Now' }] : []
            };

            new Notification(title, options);
        } else {
            const nearest = unsent
                .slice()
                .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

            new Notification(
                'Multiple Bills Upcoming',
                {
                    body: `${unsent.length} upcoming bills. Next: ${nearest.name} ($${nearest.amountDue.toFixed(2)}).`,
                    tag: 'bill-summary',
                    data: { count: unsent.length }
                }
            );
        }

        unsent.forEach(bill => {
            const daysUntil = computeDaysUntilDue(bill.dueDate, today);
            const stageKey = `${reminderKey(bill)}|stage-${daysUntil}`;
            ledger[stageKey] = timestamp;
        });

        sentCount += unsent.length;
    }

    // Overdue reminders — sent at most once per day per bill
    if (settings.overdueEnabled !== false) {
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const overdueBills = bills.filter(bill => {
            if (!bill || bill.isPaid || bill.reminderEnabled === false || !bill.dueDate) {
                return false;
            }
            const daysUntil = computeDaysUntilDue(bill.dueDate, today);
            return daysUntil !== null && daysUntil < 0;
        });

        const unsentOverdue = overdueBills.filter(bill => {
            const overdueKey = `${reminderKey(bill)}|overdue-${todayStr}`;
            return !ledger[overdueKey];
        });

        if (unsentOverdue.length > 0) {
            if (unsentOverdue.length === 1) {
                const bill = unsentOverdue[0];
                new Notification('Overdue Bill', {
                    body: `${bill.name} is past due! ($${(bill.amountDue || 0).toFixed(2)}).`,
                    tag: `bill-overdue-${bill.id}`,
                    data: { billId: bill.id }
                });
            } else {
                new Notification('Overdue Bills', {
                    body: `You have ${unsentOverdue.length} overdue unpaid bills.`,
                    tag: 'bill-overdue-summary',
                    data: { count: unsentOverdue.length }
                });
            }

            unsentOverdue.forEach(bill => {
                const overdueKey = `${reminderKey(bill)}|overdue-${todayStr}`;
                ledger[overdueKey] = timestamp;
            });

            sentCount += unsentOverdue.length;
        }
    }

    if (sentCount === 0) {
        return { sentCount: 0, reason: 'already-sent' };
    }

    saveReminderLedger(ledger);
    logger.info('Due bill reminders sent', { sentCount });
    return { sentCount, reason: 'sent' };
}
