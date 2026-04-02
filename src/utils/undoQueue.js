const activeUndoEntries = new Map();

function getId() {
    return `undo_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Register a single-use undo action with automatic expiry.
 * @param {{
 *  durationMs?: number,
 *  onUndo: () => void,
 *  onExpire?: () => void
 * }} options
 * @returns {{ id: string, consume: () => boolean, cancel: () => boolean }}
 */
export function enqueueUndoAction(options) {
    const {
        durationMs = 10000,
        onUndo,
        onExpire
    } = options || {};

    if (typeof onUndo !== 'function') {
        throw new Error('enqueueUndoAction requires an onUndo callback.');
    }

    const id = getId();
    let settled = false;

    const timeoutId = setTimeout(() => {
        if (settled) return;
        settled = true;
        activeUndoEntries.delete(id);
        if (typeof onExpire === 'function') {
            onExpire();
        }
    }, durationMs);

    activeUndoEntries.set(id, timeoutId);

    return {
        id,
        consume: () => {
            if (settled) return false;
            settled = true;
            const activeTimeoutId = activeUndoEntries.get(id);
            if (activeTimeoutId) {
                clearTimeout(activeTimeoutId);
            }
            activeUndoEntries.delete(id);
            onUndo();
            return true;
        },
        cancel: () => {
            if (settled) return false;
            settled = true;
            const activeTimeoutId = activeUndoEntries.get(id);
            if (activeTimeoutId) {
                clearTimeout(activeTimeoutId);
            }
            activeUndoEntries.delete(id);
            return true;
        }
    };
}

export function clearUndoQueue() {
    activeUndoEntries.forEach((timeoutId) => clearTimeout(timeoutId));
    activeUndoEntries.clear();
}
