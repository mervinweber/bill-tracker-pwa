
import logger from '../utils/logger.js';

// Supabase Service
// Secrets are read from .env file (Vite)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

let supabase = null;

const isConfiguredUrl = (url) => {
    return url &&
        url !== 'YOUR_SUPABASE_URL' &&
        url.startsWith('http');
};

const isConfiguredKey = (key) => {
    return key && key !== 'YOUR_SUPABASE_ANON_KEY';
};

const isSupabaseEndpointReachable = async (url, timeoutMs = 2500) => {
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
    if (window.supabase) {
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
            // @ts-ignore
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
            logger.info('Supabase initialized');
            return true;
        } catch (error) {
            logger.error('Failed to initialize Supabase', error);
            return false;
        }
    } else {
        logger.error('Supabase client not loaded');
        return false;
    }
};

export const getSupabase = () => supabase;

export const isSupabaseConfigured = () => {
    return isConfiguredUrl(SUPABASE_URL) && isConfiguredKey(SUPABASE_KEY);
};

// Auth Functions
export const signUp = async (email, password) => {
    if (!supabase) return { error: { message: 'Supabase not initialized' } };
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    });
    return { data, error };
};

export const signIn = async (email, password) => {
    if (!supabase) return { error: { message: 'Supabase not initialized' } };
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });
    return { data, error };
};

export const signInWithGoogle = async () => {
    if (!supabase) return { error: { message: 'Supabase not initialized' } };
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin
        }
    });
    return { data, error };
};

export const signOut = async () => {
    if (!supabase) return { error: { message: 'Supabase not initialized' } };
    const { error } = await supabase.auth.signOut();
    return { error };
};

export const resetPassword = async (email) => {
    logger.info('Attempting password reset', { email });
    if (!supabase) {
        logger.error('Supabase not initialized for resetPassword');
        return { error: { message: 'Supabase not initialized' } };
    }
    try {
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin
        });
        logger.info('Reset password response', { data, error });
        return { data, error };
    } catch (err) {
        logger.error('Exception in resetPassword', err);
        return { error: err };
    }
};

export const getUser = async () => {
    if (!supabase) return null;
    try {
        const { data: { user } } = await supabase.auth.getUser();
        return user;
    } catch (error) {
        logger.warn('Supabase user lookup failed. Falling back to logged-out state.', {
            message: error?.message
        });
        return null;
    }
};

// Data Sync Functions

/**
 * Sync both bills and payment settings to cloud
 * @param {Array} localBills - Bills array to sync
 * @param {Object} localPaymentSettings - Payment settings to sync
 */
export const syncUserData = async (localBills, localPaymentSettings = null) => {
    if (!supabase) return { error: { message: 'Supabase not initialized' } };

    const user = await getUser();
    if (!user) return { error: { message: 'User not logged in' } };

    const updateData = {
        user_id: user.id,
        bills: localBills
    };

    // Include payment settings if provided
    if (localPaymentSettings) {
        updateData.paymentSettings = localPaymentSettings;
    }

    const { data, error } = await supabase
        .from('user_data')
        .upsert(updateData)
        .select();

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
    if (!supabase) return { error: { message: 'Supabase not initialized' } };

    const user = await getUser();
    if (!user) return { error: { message: 'User not logged in' } };

    const { data, error } = await supabase
        .from('user_data')
        .upsert({
            user_id: user.id,
            paymentSettings: paymentSettings
        })
        .select();

    return { data, error };
};

/**
 * Fetch bills from cloud
 */
export const fetchCloudBills = async () => {
    if (!supabase) return { error: { message: 'Supabase not initialized' } };

    const user = await getUser();
    if (!user) return { error: { message: 'User not logged in' } };

    const { data, error } = await supabase
        .from('user_data')
        .select('bills')
        .eq('user_id', user.id)
        .single();

    return { data: data ? data.bills : [], error };
};

/**
 * Fetch payment settings from cloud
 */
export const fetchCloudPaymentSettings = async () => {
    if (!supabase) return { data: null, error: { message: 'Supabase not initialized' } };

    const user = await getUser();
    if (!user) return { data: null, error: { message: 'User not logged in' } };

    const { data, error } = await supabase
        .from('user_data')
        .select('paymentSettings')
        .eq('user_id', user.id)
        .single();

    return { data: data ? data.paymentSettings : null, error };
};
