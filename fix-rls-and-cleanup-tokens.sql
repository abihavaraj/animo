-- ================================================
-- FIX RLS POLICIES AND CLEANUP OLD TOKENS
-- ================================================

-- PART 1: Delete all those 9 inactive tokens for that user (and everyone else)
-- ================================================

-- Count how many we're about to delete
SELECT 
    COUNT(*) as tokens_to_delete,
    COUNT(DISTINCT user_id) as affected_users
FROM push_tokens
WHERE is_active = false;

-- Delete all inactive tokens (free up database space)
DELETE FROM push_tokens
WHERE is_active = false;

-- Delete all invalid token formats (even if marked active)
DELETE FROM push_tokens
WHERE token NOT LIKE 'ExponentPushToken[%';

-- Verify cleanup
SELECT 
    COUNT(*) as remaining_tokens,
    COUNT(DISTINCT user_id) as users_with_tokens
FROM push_tokens;

-- ================================================
-- PART 2: Fix RLS Policies (The Real Problem!)
-- ================================================

-- Check current RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'push_tokens';

-- If RLS is enabled but blocking inserts, we need better policies

-- Drop and recreate policies with better logic
DROP POLICY IF EXISTS "Users can insert their own push tokens" ON push_tokens;
DROP POLICY IF EXISTS "Users can update their own push tokens" ON push_tokens;
DROP POLICY IF EXISTS "Users can delete their own push tokens" ON push_tokens;

-- Recreate with fixed logic
CREATE POLICY "Users can insert their own push tokens"
ON push_tokens
FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = user_id::uuid
);

CREATE POLICY "Users can update their own push tokens"  
ON push_tokens
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id::uuid)
WITH CHECK (auth.uid() = user_id::uuid);

CREATE POLICY "Users can delete their own push tokens"
ON push_tokens
FOR DELETE
TO authenticated
USING (auth.uid() = user_id::uuid);

-- Add service role bypass for server-side operations
CREATE POLICY "Service role can do anything"
ON push_tokens
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ================================================
-- PART 3: Verify RLS Policies Are Working
-- ================================================

SELECT 
    policyname,
    cmd,
    roles,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'push_tokens'
ORDER BY cmd, policyname;

-- ================================================
-- PART 4: Check Current State After Cleanup
-- ================================================

-- See how many tokens remain
SELECT 
    COUNT(*) as total_tokens,
    COUNT(DISTINCT user_id) as users_with_tokens,
    COUNT(CASE WHEN is_active THEN 1 END) as active_tokens,
    COUNT(CASE WHEN NOT is_active THEN 1 END) as inactive_tokens
FROM push_tokens;

-- See if there are any users with multiple tokens (should be minimal)
SELECT 
    user_id,
    COUNT(*) as token_count,
    STRING_AGG(SUBSTRING(token, 1, 30), ', ') as tokens
FROM push_tokens
GROUP BY user_id
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC
LIMIT 10;

-- ================================================
-- EXPECTED RESULTS:
-- ================================================
-- After running this:
-- 1. All 68 inactive tokens should be DELETED (not just inactive)
-- 2. RLS policies should allow authenticated users to insert/update/delete
-- 3. Each user should have AT MOST 2-3 tokens (if using multiple devices)
-- 4. Database should be much cleaner!
-- ================================================


