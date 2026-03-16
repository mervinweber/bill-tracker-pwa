import { beforeEach, expect, it } from 'vitest';
import {
    clearLoginAttemptState,
    formatRetryAfter,
    getLoginAttemptStatus,
    recordFailedLoginAttempt
} from '../src/utils/loginAttemptGuard.js';

const mockStorage = {};
global.localStorage = {
    getItem: (key) => mockStorage[key] ?? null,
    setItem: (key, value) => { mockStorage[key] = String(value); },
    removeItem: (key) => { delete mockStorage[key]; },
    clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); },
    get length() { return Object.keys(mockStorage).length; },
    key: (i) => Object.keys(mockStorage)[i] ?? null,
};

beforeEach(() => {
    global.localStorage.clear();
});

it('allows login before max attempts', () => {
    const email = 'user@example.com';
    const status = getLoginAttemptStatus(email, { nowMs: 1000, maxAttempts: 5 });

    expect(status.isLocked).toBe(false);
    expect(status.remainingAttempts).toBe(5);
});

it('locks account on fifth failed credential attempt', () => {
    const email = 'user@example.com';

    recordFailedLoginAttempt(email, { nowMs: 1000, maxAttempts: 5, lockoutMs: 60000 });
    recordFailedLoginAttempt(email, { nowMs: 2000, maxAttempts: 5, lockoutMs: 60000 });
    recordFailedLoginAttempt(email, { nowMs: 3000, maxAttempts: 5, lockoutMs: 60000 });
    recordFailedLoginAttempt(email, { nowMs: 4000, maxAttempts: 5, lockoutMs: 60000 });
    const status = recordFailedLoginAttempt(email, { nowMs: 5000, maxAttempts: 5, lockoutMs: 60000 });

    expect(status.isLocked).toBe(true);
    expect(status.remainingAttempts).toBe(0);
    expect(status.lockoutUntil).toBe(65000);
});

it('auto-unlocks after lockout window expires', () => {
    const email = 'user@example.com';

    for (let i = 0; i < 5; i++) {
        recordFailedLoginAttempt(email, { nowMs: 1000 + i, maxAttempts: 5, lockoutMs: 60000 });
    }

    const stillLocked = getLoginAttemptStatus(email, { nowMs: 61000, maxAttempts: 5 });
    expect(stillLocked.isLocked).toBe(true);

    const unlocked = getLoginAttemptStatus(email, { nowMs: 62001, maxAttempts: 5 });
    expect(unlocked.isLocked).toBe(false);
    expect(unlocked.failedAttempts).toBe(0);
    expect(unlocked.remainingAttempts).toBe(5);
});

it('clears failed attempt state after successful login', () => {
    const email = 'user@example.com';

    recordFailedLoginAttempt(email, { nowMs: 1000, maxAttempts: 5, lockoutMs: 60000 });
    recordFailedLoginAttempt(email, { nowMs: 2000, maxAttempts: 5, lockoutMs: 60000 });

    clearLoginAttemptState(email);
    const status = getLoginAttemptStatus(email, { nowMs: 3000, maxAttempts: 5 });

    expect(status.failedAttempts).toBe(0);
    expect(status.remainingAttempts).toBe(5);
    expect(status.isLocked).toBe(false);
});

it('formats retry text for seconds and minutes', () => {
    expect(formatRetryAfter(45000)).toBe('45s');
    expect(formatRetryAfter(125000)).toBe('2m 5s');
    expect(formatRetryAfter(180000)).toBe('3m');
});
