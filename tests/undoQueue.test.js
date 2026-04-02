// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearUndoQueue, enqueueUndoAction } from '../src/utils/undoQueue.js';

describe('undoQueue', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        clearUndoQueue();
        vi.runOnlyPendingTimers();
        vi.useRealTimers();
    });

    it('consumes undo only once', () => {
        const onUndo = vi.fn();
        const action = enqueueUndoAction({
            durationMs: 10000,
            onUndo
        });

        expect(action.consume()).toBe(true);
        expect(action.consume()).toBe(false);
        expect(onUndo).toHaveBeenCalledTimes(1);
    });

    it('expires undo after duration and triggers expiry callback', () => {
        const onUndo = vi.fn();
        const onExpire = vi.fn();
        const action = enqueueUndoAction({
            durationMs: 5000,
            onUndo,
            onExpire
        });

        vi.advanceTimersByTime(5000);

        expect(onExpire).toHaveBeenCalledTimes(1);
        expect(action.consume()).toBe(false);
        expect(onUndo).toHaveBeenCalledTimes(0);
    });

    it('cancels undo without running callbacks', () => {
        const onUndo = vi.fn();
        const onExpire = vi.fn();
        const action = enqueueUndoAction({
            durationMs: 5000,
            onUndo,
            onExpire
        });

        expect(action.cancel()).toBe(true);
        vi.advanceTimersByTime(5000);

        expect(onUndo).toHaveBeenCalledTimes(0);
        expect(onExpire).toHaveBeenCalledTimes(0);
    });
});
