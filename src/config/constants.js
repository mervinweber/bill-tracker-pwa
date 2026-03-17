/**
 * Application-wide Constants
 * 
 * Centralized configuration for magic numbers, version strings, and app-wide settings.
 * This replaces hardcoded values scattered throughout the codebase.
 * 
 * @module config/constants
 */

// ============================================================================
// APP VERSION & METADATA
// ============================================================================
export const APP_VERSION = '1.0';
export const APP_NAME = 'Bill Tracker PWA';

// ============================================================================
// CACHE SETTINGS
// ============================================================================
export const CACHE_NAME = `bill-tracker-cache-v3`;
export const CACHE_VERSION = 'v3';

// ============================================================================
// DATE & TIME LIMITS
// ============================================================================
/** Maximum years into the future for bill forecasting */
export const MAX_YEARS_FUTURE = 5;
/** Maximum years into the past for historical data */
export const MAX_YEARS_PAST = 2;

// ============================================================================
// BILL & FINANCIAL SETTINGS
// ============================================================================
/** Maximum bill amount allowed (in dollars, currency-agnostic) */
export const MAX_BILL_AMOUNT = 99999.99;
/** Minimum bill amount allowed */
export const MIN_BILL_AMOUNT = 0.01;

/** Default payment categories shown in dropdown */
export const DEFAULT_CATEGORIES = [
    'Rent',
    'Utilities',
    'Groceries',
    'Transportation',
    'Insurance',
    'Entertainment'
];

// ============================================================================
// RETRY & RESILIENCE CONFIGURATION
// ============================================================================
export const RETRY_CONFIG = {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 16000,
    backoffMultiplier: 2
};

// ============================================================================
// SYNC & DEBOUNCE SETTINGS
// ============================================================================
/** Debounce delay for cloud sync operations (milliseconds) */
export const SYNC_DEBOUNCE_DELAY_MS = 2000;
/** Debounce delay for form input debouncing (milliseconds) */
export const INPUT_DEBOUNCE_DELAY_MS = 300;
/** Debounce delay for settings save operations (milliseconds) */
export const SETTINGS_SAVE_DEBOUNCE_MS = 1000;

// ============================================================================
// TIMEOUT SETTINGS (milliseconds)
// ============================================================================
/** User cache time-to-live (15 seconds) */
export const USER_CACHE_TTL_MS = 15000;
/** Supabase endpoint health check timeout (2.5 seconds) */
export const SUPABASE_HEALTH_CHECK_TIMEOUT_MS = 2500;
/** Default network request timeout */
export const NETWORK_REQUEST_TIMEOUT_MS = 10000;
/** UI toast/notification display timeout (500ms for quick feedback) */
export const UI_FEEDBACK_TIMEOUT_MS = 500;
/** Page reload delay (allow sync to complete) (1.5 seconds) */
export const PAGE_RELOAD_DELAY_MS = 1500;
/** Toast notification auto-dismiss delay (5 seconds) */
export const TOAST_DISMISS_DELAY_MS = 5000;

// ============================================================================
// GESTURE & TOUCH INTERACTIONS
// ============================================================================
/** Swipe gesture horizontal distance threshold (pixels) */
export const GESTURE_SWIPE_THRESHOLD_PX = 50;
/** Long-press duration threshold (milliseconds) */
export const GESTURE_LONG_PRESS_DELAY_MS = 500;
/** Gesture debounce delay (milliseconds) */
export const GESTURE_DEBOUNCE_MS = 300;

// ============================================================================
// AUDIT & LOGGING
// ============================================================================
/** Maximum number of audit events to keep in storage */
export const MAX_AUDIT_EVENTS = 1000;
/** Audit log retention days (7 days) */
export const AUDIT_LOG_RETENTION_DAYS = 7;

// ============================================================================
// TIME UNIT CONVERSIONS (for convenience)
// ============================================================================
export const MS_PER_SECOND = 1000;
export const MS_PER_MINUTE = 60 * 1000;
export const MS_PER_HOUR = 60 * 60 * 1000;
export const MS_PER_DAY = 24 * 60 * 60 * 1000;
export const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

// ============================================================================
// SUPABASE & AUTHENTICATION
// ============================================================================
/** Token expiry warning threshold (5 minutes before expiry) */
export const TOKEN_EXPIRY_WARNING_MS = 5 * 60 * 1000;
/** Session idle timeout (30 minutes) */
export const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000;

// ============================================================================
// LOGIN ATTEMPT GUARD
// ============================================================================
export const LOGIN_LOCKOUT_RULES = {
    maxAttempts: 5,
    lockoutDurationMs: 15 * 60 * 1000, // 15 minutes
    captchaThreshold: 3 // Show CAPTCHA after 3 failed attempts
};

// ============================================================================
// FEATURE FLAGS & TOGGLES
// ============================================================================
export const FEATURES = {
    enableOfflineMode: true,
    enableCloudSync: true,
    enableAuditLogging: true,
    enableNotifications: true
};
