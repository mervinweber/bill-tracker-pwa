import StorageManager from './StorageManager.js';
import { STORAGE_KEYS } from './constants.js';
import logger from './logger.js';
import { MS_PER_DAY } from '../config/constants.js';

const DEFAULT_NOTIFICATION_SETTINGS = {
    enabled: false,
    daysBefore: 1
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
    const daysBefore = Number.isInteger(settings.daysBefore)
        ? settings.daysBefore
        : parseInt(settings.daysBefore, 10) || 1;

    // Advanced: We check for bills due in 0, 1, or 2 days for proactive reminders
    const eligible = buildEligibleBills(bills, Math.max(daysBefore, 2), today);
    if (eligible.length === 0) {
        return { sentCount: 0, reason: 'no-eligible-bills' };
    }

    const ledger = getReminderLedger();
    const unsent = eligible.filter(bill => {
        const daysUntil = computeDaysUntilDue(bill.dueDate, today);
        const stageKey = `${reminderKey(bill)}|stage-${daysUntil}`;
        return !ledger[stageKey];
    });

    if (unsent.length === 0) {
        return { sentCount: 0, reason: 'already-sent' };
    }

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

    const timestamp = Date.now();
    unsent.forEach(bill => {
        const daysUntil = computeDaysUntilDue(bill.dueDate, today);
        const stageKey = `${reminderKey(bill)}|stage-${daysUntil}`;
        ledger[stageKey] = timestamp;
    });
    saveReminderLedger(ledger);

    logger.info('Due bill reminders sent', { sentCount: unsent.length });
    return { sentCount: unsent.length, reason: 'sent' };
}
