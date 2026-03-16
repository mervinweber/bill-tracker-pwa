import StorageManager from './StorageManager.js';
import { STORAGE_KEYS } from './constants.js';

const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_LOCKOUT_MS = 15 * 60 * 1000;

const normalizeEmail = (email) => {
    if (typeof email !== 'string') return '';
    return email.trim().toLowerCase();
};

const loadState = () => {
    const fallback = { users: {} };
    const state = StorageManager.get(STORAGE_KEYS.LOGIN_ATTEMPT_STATE, fallback);
    if (!state || typeof state !== 'object' || typeof state.users !== 'object' || state.users === null) {
        return fallback;
    }
    return state;
};

const saveState = (state) => {
    StorageManager.set(STORAGE_KEYS.LOGIN_ATTEMPT_STATE, state);
};

const getEntry = (state, email) => {
    const key = normalizeEmail(email);
    if (!key) return { key: '', entry: { failedAttempts: 0, lockoutUntil: 0 } };

    const entry = state.users[key] || { failedAttempts: 0, lockoutUntil: 0 };
    return { key, entry };
};

const ensureUnlockedIfExpired = (entry, nowMs) => {
    if (!entry.lockoutUntil) return entry;
    if (entry.lockoutUntil > nowMs) return entry;
    return { failedAttempts: 0, lockoutUntil: 0 };
};

export const getLoginAttemptStatus = (email, options = {}) => {
    const maxAttempts = options.maxAttempts || DEFAULT_MAX_ATTEMPTS;
    const nowMs = options.nowMs || Date.now();

    const state = loadState();
    const { key, entry } = getEntry(state, email);
    const normalizedEntry = ensureUnlockedIfExpired(entry, nowMs);

    if (key && (normalizedEntry.failedAttempts !== entry.failedAttempts || normalizedEntry.lockoutUntil !== entry.lockoutUntil)) {
        state.users[key] = normalizedEntry;
        saveState(state);
    }

    const isLocked = normalizedEntry.lockoutUntil > nowMs;
    return {
        isLocked,
        failedAttempts: normalizedEntry.failedAttempts,
        remainingAttempts: Math.max(0, maxAttempts - normalizedEntry.failedAttempts),
        lockoutUntil: normalizedEntry.lockoutUntil,
        retryAfterMs: isLocked ? normalizedEntry.lockoutUntil - nowMs : 0
    };
};

export const recordFailedLoginAttempt = (email, options = {}) => {
    const maxAttempts = options.maxAttempts || DEFAULT_MAX_ATTEMPTS;
    const lockoutMs = options.lockoutMs || DEFAULT_LOCKOUT_MS;
    const nowMs = options.nowMs || Date.now();

    const state = loadState();
    const { key, entry } = getEntry(state, email);

    if (!key) {
        return {
            isLocked: false,
            failedAttempts: 0,
            remainingAttempts: maxAttempts,
            lockoutUntil: 0,
            retryAfterMs: 0
        };
    }

    const normalizedEntry = ensureUnlockedIfExpired(entry, nowMs);
    const nextAttempts = normalizedEntry.failedAttempts + 1;
    const shouldLock = nextAttempts >= maxAttempts;

    const nextEntry = {
        failedAttempts: nextAttempts,
        lockoutUntil: shouldLock ? nowMs + lockoutMs : 0
    };

    state.users[key] = nextEntry;
    saveState(state);

    return {
        isLocked: nextEntry.lockoutUntil > nowMs,
        failedAttempts: nextEntry.failedAttempts,
        remainingAttempts: Math.max(0, maxAttempts - nextEntry.failedAttempts),
        lockoutUntil: nextEntry.lockoutUntil,
        retryAfterMs: nextEntry.lockoutUntil > nowMs ? nextEntry.lockoutUntil - nowMs : 0
    };
};

export const clearLoginAttemptState = (email) => {
    const key = normalizeEmail(email);
    if (!key) return;

    const state = loadState();
    if (state.users[key]) {
        delete state.users[key];
        saveState(state);
    }
};

export const formatRetryAfter = (retryAfterMs) => {
    const seconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes <= 0) {
        return `${remainingSeconds}s`;
    }
    if (remainingSeconds === 0) {
        return `${minutes}m`;
    }
    return `${minutes}m ${remainingSeconds}s`;
};

export const LOGIN_LOCKOUT_RULES = {
    maxAttempts: DEFAULT_MAX_ATTEMPTS,
    lockoutMs: DEFAULT_LOCKOUT_MS
};
