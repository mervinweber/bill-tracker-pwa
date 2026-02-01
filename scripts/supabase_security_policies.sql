-- ============================================================================
-- Supabase Row Level Security (RLS) Policies
-- Bill Tracker PWA - Security Hardening
-- ============================================================================
--
-- This script sets up comprehensive Row Level Security policies for the
-- Bill Tracker PWA to ensure users can only access their own data.
--
-- INSTRUCTIONS:
-- 1. Log into your Supabase dashboard
-- 2. Navigate to SQL Editor
-- 3. Copy and paste this entire script
-- 4. Click "Run" to execute
--
-- WHAT THIS DOES:
-- - Enables Row Level Security on the user_data table
-- - Creates policies that restrict data access to authenticated users only
-- - Ensures users can only see/modify their own bills
-- - Adds database constraints for data integrity
-- - Creates performance indexes
--
-- ============================================================================

-- Step 1: Enable Row Level Security
-- This is the master switch that enforces all policies below
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing policies if any (safe to run multiple times)
DROP POLICY IF EXISTS "Users can view own data" ON user_data;
DROP POLICY IF EXISTS "Users can insert own data" ON user_data;
DROP POLICY IF EXISTS "Users can update own data" ON user_data;
DROP POLICY IF EXISTS "Users can delete own data" ON user_data;

-- Step 3: Create SELECT policy (viewing data)
-- Users can only SELECT rows where user_id matches their authenticated ID
CREATE POLICY "Users can view own data" ON user_data
    FOR SELECT
    USING (auth.uid() = user_id);

-- Step 4: Create INSERT policy (creating new data)
-- Users can only INSERT rows with their own user_id
CREATE POLICY "Users can insert own data" ON user_data
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Step 5: Create UPDATE policy (modifying existing data)
-- Users can only UPDATE rows they own, and cannot change ownership
CREATE POLICY "Users can update own data" ON user_data
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Step 6: Create DELETE policy (removing data)
-- Users can only DELETE their own rows
CREATE POLICY "Users can delete own data" ON user_data
    FOR DELETE
    USING (auth.uid() = user_id);

-- Step 7: Add database constraints for data integrity
-- Ensure user_id is never null
ALTER TABLE user_data
    ADD CONSTRAINT user_data_user_id_not_null 
    CHECK (user_id IS NOT NULL);

-- Step 8: Create performance index
-- Speeds up queries filtering by user_id
CREATE INDEX IF NOT EXISTS idx_user_data_user_id 
    ON user_data(user_id);

-- ============================================================================
-- VERIFICATION QUERIES
-- Run these to verify the policies are working correctly
-- ============================================================================

-- Check if RLS is enabled (should return 'true')
SELECT relrowsecurity 
FROM pg_class 
WHERE relname = 'user_data';

-- List all policies on user_data table
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'user_data';

-- Count total policies (should be 4)
SELECT COUNT(*) as policy_count
FROM pg_policies
WHERE tablename = 'user_data';

-- ============================================================================
-- TESTING (Optional - for development only)
-- ============================================================================

-- Test 1: Try to view all data (should only show your own)
-- SELECT * FROM user_data;

-- Test 2: Try to insert data with wrong user_id (should fail)
-- INSERT INTO user_data (user_id, bills) 
-- VALUES ('00000000-0000-0000-0000-000000000000', '[]'::jsonb);

-- Test 3: Verify your data exists
-- SELECT user_id, jsonb_array_length(bills) as bill_count 
-- FROM user_data 
-- WHERE user_id = auth.uid();

-- ============================================================================
-- SUCCESS!
-- ============================================================================
-- If this script ran without errors, your RLS policies are now active.
-- Users can only access their own data, even if they have the anon API key.
-- ============================================================================
