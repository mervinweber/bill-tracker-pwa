/**
 * Auth / Login Handlers
 * Handles sign-in, sign-up, sign-out, and password reset flows.
 * Includes Supabase cloud sync on successful login.
 */

import { signIn, signUp, signOut, resetPassword, fetchCloudBills, fetchCloudPaymentSettings, syncUserData, syncPaymentSettings } from '../services/supabase.js';
import { setAuthMessage, closeAuthModal } from '../components/authModal.js';
import { billActionHandlers } from '../handlers/billActionHandlers.js';
import { billStore } from '../store/BillStore.js';
import { paycheckManager } from '../utils/paycheckManager.js';
import StorageManager from '../utils/StorageManager.js';
import { STORAGE_KEYS } from '../utils/constants.js';
import logger from '../utils/logger.js';
import { recordAuditEvent } from '../utils/auditTracker.js';
import {
    syncBillsFromCloud,
    syncLocalDataToCloudIfNeeded,
    syncPaymentSettingsFromCloud
} from '../utils/cloudSyncManager.js';
import {
    LOGIN_LOCKOUT_RULES,
    clearLoginAttemptState,
    formatRetryAfter,
    getLoginAttemptStatus,
    recordFailedLoginAttempt
} from '../utils/loginAttemptGuard.js';
import { UI_FEEDBACK_TIMEOUT_MS } from '../config/constants.js';

const isCredentialFailure = (error) => {
    const message = (error?.message || '').toLowerCase();
    const code = (error?.code || '').toLowerCase();
    const status = error?.status;

    if (code.includes('invalid_credentials')) return true;
    if (message.includes('invalid login credentials')) return true;
    if (message.includes('invalid credentials')) return true;
    return status === 400 || status === 401;
};

export async function handleLogin(email, password, options = {}) {
    const preCheck = getLoginAttemptStatus(email);
    if (preCheck.isLocked) {
        const retryText = formatRetryAfter(preCheck.retryAfterMs);
        setAuthMessage(
            `Too many failed attempts. Please wait ${retryText} before trying again.`,
            true
        );
        recordAuditEvent('auth.login.blocked', {
            entityType: 'auth',
            summary: 'Login blocked by local lockout guard',
            metadata: {
                email,
                retryAfterMs: preCheck.retryAfterMs,
                maxAttempts: LOGIN_LOCKOUT_RULES.maxAttempts
            }
        });
        return;
    }

    setAuthMessage('Signing in...', false);
    const { data, error } = await signIn(email, password, options);
    if (error) {
        if (isCredentialFailure(error)) {
            const postFailure = recordFailedLoginAttempt(email);
            if (postFailure.isLocked) {
                const retryText = formatRetryAfter(postFailure.retryAfterMs);
                setAuthMessage(
                    `Account temporarily locked after ${LOGIN_LOCKOUT_RULES.maxAttempts} failed attempts. Try again in ${retryText}.`,
                    true
                );
            } else {
                setAuthMessage(
                    `${error.message} (${postFailure.remainingAttempts} attempt(s) remaining before temporary lockout)`,
                    true
                );
            }
        } else {
            setAuthMessage(error.message, true);
        }

        recordAuditEvent('auth.login.failed', {
            entityType: 'auth',
            summary: 'Login attempt failed',
            metadata: {
                email,
                message: error.message,
                trackedByLockoutGuard: isCredentialFailure(error)
            }
        });
    } else {
        clearLoginAttemptState(email);

        if (data.user && data.user.email) {
            StorageManager.set(STORAGE_KEYS.USER_EMAIL, data.user.email);
        }

        recordAuditEvent('auth.login.succeeded', {
            entityType: 'auth',
            summary: 'User logged in',
            metadata: {
                email: data.user?.email || null
            }
        });

        closeAuthModal();
        billActionHandlers.showSuccessNotification('Logged in successfully');

        try {
            const { cloudPaymentSettings } = await syncPaymentSettingsFromCloud({
                fetchCloudPaymentSettings,
                storageManager: StorageManager,
                storageKeys: STORAGE_KEYS,
                paycheckManager,
                logger
            });

            const { cloudBills } = await syncBillsFromCloud({
                fetchCloudBills,
                billStore,
                storageManager: StorageManager,
                storageKeys: STORAGE_KEYS,
                logger,
                onFetchError: () => {
                    billActionHandlers.showErrorNotification('Could not fetch bills from cloud', 'Sync Error');
                }
            });

            await syncLocalDataToCloudIfNeeded({
                cloudBills,
                cloudPaymentSettings,
                billStore,
                storageManager: StorageManager,
                storageKeys: STORAGE_KEYS,
                syncUserData,
                syncPaymentSettings,
                logger,
                onSyncError: () => {
                    billActionHandlers.showErrorNotification('Could not sync data to cloud', 'Sync Error');
                }
            });
        } catch (err) {
            logger.error('Error syncing data on login', err);
            billActionHandlers.showErrorNotification('Error syncing data from cloud', 'Sync Error');
        }

        setTimeout(() => {
            window.location.reload();
        }, UI_FEEDBACK_TIMEOUT_MS);
    }
}

export async function handleSignUp(email, password, options = {}) {
    setAuthMessage('Signing up...', false);
    const { data, error } = await signUp(email, password, options);
    if (error) {
        setAuthMessage(error.message, true);
        recordAuditEvent('auth.signup.failed', {
            entityType: 'auth',
            summary: 'Signup attempt failed',
            metadata: { message: error.message }
        });
    } else {
        setAuthMessage('Account created! Please check your email.', false);
        recordAuditEvent('auth.signup.succeeded', {
            entityType: 'auth',
            summary: 'Signup completed',
            metadata: { provider: data?.session ? 'oauth' : 'password' }
        });
    }
}

export async function handleLogout() {
    await signOut();
    recordAuditEvent('auth.logout', {
        entityType: 'auth',
        summary: 'User logged out'
    });
    StorageManager.remove(STORAGE_KEYS.USER_EMAIL);
    window.location.reload();
}

export async function handleResetPassword(email) {
    logger.info('Password reset requested');
    setAuthMessage('Sending reset email...', false);
    try {
        const { error } = await resetPassword(email);
        if (error) {
            logger.error('Reset password error', error);
            setAuthMessage(error.message || 'Failed to send reset email', true);
        } else {
            logger.info('Reset email sent successfully');
            setAuthMessage('Success! Check your inbox (and Spam folder).', false);
        }
    } catch (err) {
        logger.error('Unexpected error during password reset', err);
        setAuthMessage('An unexpected error occurred. Check the console.', true);
    }
}
