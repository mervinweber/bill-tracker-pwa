// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { showSuccessNotification } from '../src/handlers/billActionHandlers.js';

describe('undo toast behavior', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.runOnlyPendingTimers();
        vi.useRealTimers();
        document.body.innerHTML = '';
    });

    it('renders undo action and invokes callback', () => {
        const onAction = vi.fn();
        showSuccessNotification('Updated bills', {
            actionLabel: 'Undo',
            onAction,
            durationMs: 10000
        });

        const button = document.querySelector('.success-notification button');
        expect(button).toBeTruthy();
        button.click();
        expect(onAction).toHaveBeenCalledTimes(1);
        expect(document.querySelector('.success-notification')).toBeNull();
    });

    it('auto-removes after configured duration', () => {
        showSuccessNotification('Updated bills', { durationMs: 5000 });
        expect(document.querySelector('.success-notification')).not.toBeNull();

        vi.advanceTimersByTime(5000);
        expect(document.querySelector('.success-notification')).toBeNull();
    });
});
