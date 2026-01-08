
// Supabase Service
// Secrets are read from .env file (Vite)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

let supabase = null;

export const initializeSupabase = () => {
    if (window.supabase) {
        // Validate URL before attempting init to prevent crash
        if (!SUPABASE_URL || SUPABASE_URL === 'YOUR_SUPABASE_URL' || !SUPABASE_URL.startsWith('http')) {
            console.warn('Supabase URL not configured in .env. Skipping initialization.');
            return;
        }

        try {
            // @ts-ignore
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
            console.log('Supabase initialized');
        } catch (error) {
            console.error('Failed to initialize Supabase:', error);
        }
    } else {
        console.error('Supabase client not loaded');
    }
};

export const getSupabase = () => supabase;

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

export const getUser = async () => {
    if (!supabase) return null;
    const { data: { user } } = await supabase.auth.getUser();
    return user;
};

// Data Functions
export const syncBills = async (localBills) => {
    if (!supabase) return { error: { message: 'Supabase not initialized' } };

    const user = await getUser();
    if (!user) return { error: { message: 'User not logged in' } };

    // Simple Sync Strategy: 
    // 1. Fetch cloud bills
    // 2. Merge (Latest win or union? For simplicity: Cloud Overwrites Local if cloud has data, else Push Local)
    // Actually, safer to Push Local to Cloud for now as "Backup", or Fetch from Cloud as "Restore"
    // Let's implement "Save to Cloud" (Upsert)

    // We need a table 'bills' in Supabase with columns: id, user_id, data (jsonb)
    // Or strictly relational columns. JSONB is easiest for this dynamic structure.

    // Let's store the entire bills array as one record for this user to keep it simple locally?
    // Or simpler: Upsert each bill.
    // Let's go with: Store entire state as one JSON blob in a 'user_data' table.

    const { data, error } = await supabase
        .from('user_data')
        .upsert({ user_id: user.id, bills: localBills })
        .select();

    return { data, error };
};

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
