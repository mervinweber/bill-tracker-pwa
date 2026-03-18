
import { createClient } from '@supabase/supabase-js';
import logger from '../utils/logger.js';
import { USER_CACHE_TTL_MS, SUPABASE_HEALTH_CHECK_TIMEOUT_MS, TOKEN_EXPIRY_WARNING_MS } from '../config/constants.js';
import { createAppErrorObject } from '../errors/errorCodes.js';
// Secrets are read from .env file (Vite)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

let supabase = null;
let cachedUser = null;
let cachedUserAt = 0;
let inFlightUserRequest = null;
let tokenWarningTimeout = null;
let isIntentionalSignOut = false;

const resetUserCache = () => {
    cachedUser = null;
    cachedUserAt = 0;
    inFlightUserRequest = null;
};

const isConfiguredUrl = (url) => {
    return url &&
        url !== 'YOUR_SUPABASE_URL' &&
        url.startsWith('http');
};

const isConfiguredKey = (key) => {
    return key && key !== 'YOUR_SUPABASE_ANON_KEY';
};

const isSupabaseEndpointReachable = async (url, timeoutMs = SUPABASE_HEALTH_CHECK_TIMEOUT_MS) => {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        await fetch(`${url}/auth/v1/health`, {
            method: 'GET',
            mode: 'no-cors',
            cache: 'no-store',
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        return true;
    } catch (error) {
        return false;
    }
};

export const initializeSupabase = async () => {
    // Validate URL before attempting init to prevent crash
    if (!isConfiguredUrl(SUPABASE_URL) || !isConfiguredKey(SUPABASE_KEY)) {
        logger.warn('Supabase URL not configured in .env. Skipping initialization.');
        return false;
    }

    const reachable = await isSupabaseEndpointReachable(SUPABASE_URL);
    if (!reachable) {
        logger.warn('Supabase endpoint is unreachable. Cloud auth is disabled for this session.', {
            url: SUPABASE_URL
        });
        return false;
    }

    try {
        supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        logger.info('Supabase initialized');
        return true;
    } catch (error) {
        logger.error('Failed to initialize Supabase', error);
        return false;
    }
};

export const getSupabase = () => supabase;

export const isSupabaseConfigured = () => {
    return isConfiguredUrl(SUPABASE_URL) && isConfiguredKey(SUPABASE_KEY);
};

// Auth Functions
export const signUp = async (email, password, options = {}) => {
    if (!supabase) return { error: createAppErrorObject('SUPABASE_NOT_INITIALIZED') };
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: options.captchaToken
            ? {
                captchaToken: options.captchaToken
            }
            : undefined,
    });
    return { data, error };
};

export const signIn = async (email, password, options = {}) => {
    if (!supabase) return { error: createAppErrorObject('SUPABASE_NOT_INITIALIZED') };
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: options.captchaToken
            ? {
                captchaToken: options.captchaToken
            }
            : undefined,
    });

    if (!error && data?.user) {
        cachedUser = data.user;
        cachedUserAt = Date.now();
    }

    return { data, error };
};

export const signInWithGoogle = async () => {
    if (!supabase) return { error: createAppErrorObject('SUPABASE_NOT_INITIALIZED') };
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin
        }
    });
    return { data, error };
};

export const signOut = async () => {
    if (!supabase) return { error: createAppErrorObject('SUPABASE_NOT_INITIALIZED') };
    isIntentionalSignOut = true;
    try {
        const { error } = await supabase.auth.signOut();
        resetUserCache();
        return { error };
    } finally {
        isIntentionalSignOut = false;
    }
};

export const resetPassword = async (email) => {
    logger.info('Attempting password reset');
    if (!supabase) {
        logger.error('Supabase not initialized for resetPassword');
        return { error: createAppErrorObject('SUPABASE_NOT_INITIALIZED') };
    }
    try {
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin
        });
        logger.info('Reset password response received', { hasError: !!error });
        return { data, error };
    } catch (err) {
        logger.error('Exception in resetPassword', err);
        return { error: err };
    }
};

export const updatePassword = async (newPassword) => {
    if (!supabase) return { error: createAppErrorObject('SUPABASE_NOT_INITIALIZED') };
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
    return { data, error };
};

export const getUser = async () => {
    if (!supabase) return null;

    const now = Date.now();
    if (cachedUser && now - cachedUserAt < USER_CACHE_TTL_MS) {
        return cachedUser;
    }

    if (inFlightUserRequest) {
        return inFlightUserRequest;
    }

    try {
        inFlightUserRequest = supabase.auth
            .getUser()
            .then(({ data: { user } }) => {
                cachedUser = user;
                cachedUserAt = Date.now();
                return user;
            })
            .finally(() => {
                inFlightUserRequest = null;
            });

        return await inFlightUserRequest;
    } catch (error) {
        logger.warn('Supabase user lookup failed. Falling back to logged-out state.', {
            message: error?.message
        });
        resetUserCache();
        return null;
    }
};

/**
 * Sync both bills and payment settings to cloud
 * @param {Array} localBills - Bills array to sync
 * @param {Object} localPaymentSettings - Payment settings to sync
 */
export const syncUserData = async (localBills, localPaymentSettings = null) => {
    if (!supabase) return { error: createAppErrorObject('SUPABASE_NOT_INITIALIZED') };

    const user = await getUser();
    if (!user) return { error: createAppErrorObject('SUPABASE_AUTH_REQUIRED') };

    // Get current user_data to resolve household_id
    const { data: userData } = await supabase
        .from('user_data')
        .select('household_id')
        .eq('user_id', user.id)
        .single();

    const updateData = {
        user_id: user.id,
        bills: localBills,
        last_sync: new Date().toISOString()
    };

    if (userData?.household_id) {
        updateData.household_id = userData.household_id;
    }

    if (localPaymentSettings) {
        updateData.paymentSettings = localPaymentSettings;
    }

    const { data, error } = await supabase
        .from('user_data')
        .upsert(updateData);

    return { data, error };
};

/**
 * Sync bills to cloud (legacy - now uses syncUserData)
 */
export const syncBills = async (localBills) => {
    return syncUserData(localBills);
};

/**
 * Sync payment settings to cloud
 * @param {Object} paymentSettings - Payment settings to sync
 */
export const syncPaymentSettings = async (paymentSettings) => {
    if (!supabase) return { error: createAppErrorObject('SUPABASE_NOT_INITIALIZED') };

    const user = await getUser();
    if (!user) return { error: createAppErrorObject('SUPABASE_AUTH_REQUIRED') };

    const { data, error } = await supabase
        .from('user_data')
        .upsert({
            user_id: user.id,
            paymentSettings: paymentSettings
        });

    return { data, error };
};

/**
 * Fetch bills from cloud
 */
export const fetchCloudBills = async () => {
    if (!supabase) return { error: createAppErrorObject('SUPABASE_NOT_INITIALIZED') };

    const user = await getUser();
    if (!user) return { error: createAppErrorObject('SUPABASE_AUTH_REQUIRED') };

    // First, check if user belongs to a household
    const { data: userData, error: userError } = await supabase
        .from('user_data')
        .select('bills, household_id')
        .eq('user_id', user.id)
        .single();

    if (userError && userError.code !== 'PGRST116') {
        return { error: userError };
    }

    // If user has a household, fetch bills for that household instead
    if (userData?.household_id) {
        const { data: householdData, error: householdError } = await supabase
            .from('user_data')
            .select('bills')
            .eq('household_id', userData.household_id)
            .limit(1)
            .single();
        
        if (!householdError && householdData) {
            return { data: householdData.bills || [], error: null };
        }
    }

    return { data: userData ? userData.bills : [], error: null };
};

/**
 * Fetch payment settings from cloud
 */
export const fetchCloudPaymentSettings = async () => {
    if (!supabase) return { data: null, error: createAppErrorObject('SUPABASE_NOT_INITIALIZED') };

    const user = await getUser();
    if (!user) return { data: null, error: createAppErrorObject('SUPABASE_AUTH_REQUIRED') };

    const { data, error } = await supabase
        .from('user_data')
        .select('paymentSettings')
        .eq('user_id', user.id)
        .single();

    return { data: data ? data.paymentSettings : null, error };
};

/**
 * Create a new household
 */
export const createHousehold = async () => {
    if (!supabase) return { error: createAppErrorObject('SUPABASE_NOT_INITIALIZED') };
    const user = await getUser();
    if (!user) return { error: createAppErrorObject('SUPABASE_AUTH_REQUIRED') };

    const householdId = crypto.randomUUID();
    
    const { data, error } = await supabase
        .from('user_data')
        .update({ household_id: householdId })
        .eq('user_id', user.id);
    
    return { householdId, error };
};

/**
 * Join an existing household
 */
export const joinHousehold = async (householdId) => {
    if (!supabase) return { error: createAppErrorObject('SUPABASE_NOT_INITIALIZED') };
    const user = await getUser();
    if (!user) return { error: createAppErrorObject('SUPABASE_AUTH_REQUIRED') };

    // Verify household exists by checking if any user has it
    const { data: existing, error: checkError } = await supabase
        .from('user_data')
        .select('user_id')
        .eq('household_id', householdId)
        .limit(1);

    if (checkError || !existing || existing.length === 0) {
        return { error: createAppErrorObject('SUPABASE_INVALID_HOUSEHOLD_ID') };
    }

    const { data, error } = await supabase
        .from('user_data')
        .update({ household_id: householdId })
        .eq('user_id', user.id);

    return { data, error };
};

/**
 * Get household status
 */
export const getHouseholdStatus = async () => {
    if (!supabase) return null;
    const user = await getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('user_data')
        .select('household_id')
        .eq('user_id', user.id)
        .single();
    
    return data?.household_id || null;
};

/**
 * Monitor token expiry and trigger silent refresh or session-expired callbacks.
 *
 * @param {object} [callbacks]
 * @param {() => void} [callbacks.onWarning] - Called ~5 minutes before token expiry
 * @param {() => void} [callbacks.onExpired] - Called when session expires (not from intentional sign-out)
 * @returns {object|null} Supabase auth subscription (call .unsubscribe() to clean up)
 */
export const setupTokenRefreshMonitor = ({ onWarning, onExpired } = {}) => {
    if (!supabase) return null;

    const clearWarning = () => {
        if (tokenWarningTimeout) {
            clearTimeout(tokenWarningTimeout);
            tokenWarningTimeout = null;
        }
    };

    const scheduleWarning = (expiresAt) => {
        clearWarning();
        const msUntilWarning = (expiresAt * 1000) - Date.now() - TOKEN_EXPIRY_WARNING_MS;
        if (msUntilWarning > 0) {
            tokenWarningTimeout = setTimeout(() => {
                logger.warn('Session token expiring soon');
                onWarning?.();
            }, msUntilWarning);
        }
    };

    // Schedule warning for the current session immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.expires_at) {
            scheduleWarning(session.expires_at);
        }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'TOKEN_REFRESHED') {
            if (session?.user) {
                cachedUser = session.user;
                cachedUserAt = Date.now();
            }
            clearWarning();
            if (session?.expires_at) {
                scheduleWarning(session.expires_at);
            }
            logger.info('Session token refreshed silently');

        } else if (event === 'SIGNED_IN') {
            if (session?.user) {
                cachedUser = session.user;
                cachedUserAt = Date.now();
            }
            if (session?.expires_at) {
                scheduleWarning(session.expires_at);
            }

        } else if (event === 'SIGNED_OUT') {
            clearWarning();
            resetUserCache();
            if (!isIntentionalSignOut) {
                onExpired?.();
            }
        }
    });

    return subscription;
};
