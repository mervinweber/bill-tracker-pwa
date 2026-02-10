
import logger from '../utils/logger.js';

// Supabase Service
// Secrets are read from .env file (Vite)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

let supabase = null;

export const initializeSupabase = () => {
    if (window.supabase) {
        // Validate URL before attempting init to prevent crash
        if (!SUPABASE_URL || SUPABASE_URL === 'YOUR_SUPABASE_URL' || !SUPABASE_URL.startsWith('http')) {
            logger.warn('Supabase URL not configured in .env. Skipping initialization.');
            return;
        }

        try {
            // @ts-ignore
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
            logger.info('Supabase initialized');
        } catch (error) {
            logger.error('Failed to initialize Supabase', error);
        }
    } else {
        logger.error('Supabase client not loaded');
    }
};

export const getSupabase = () => supabase;

export const isSupabaseConfigured = () => {
    return SUPABASE_URL && 
           SUPABASE_URL !== 'YOUR_SUPABASE_URL' && 
           SUPABASE_URL.startsWith('http') &&
           SUPABASE_KEY &&
           SUPABASE_KEY !== 'YOUR_SUPABASE_ANON_KEY';
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
    const { data: { user } } = await supabase.auth.getUser();
    return user;
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
