-- Complete Fix for Multiple Permissive Policies Warning
-- This will consolidate all RLS policies into a single, optimized policy

-- Step 1: Drop ALL existing policies on user_subscriptions table
DROP POLICY IF EXISTS "user_subscriptions_access_policy" ON public.user_subscriptions;
DROP POLICY IF EXISTS "user_subscriptions_select_own" ON public.user_subscriptions;
DROP POLICY IF EXISTS "user_subscriptions_update_own" ON public.user_subscriptions;
DROP POLICY IF EXISTS "user_subscriptions_select_optimized" ON public.user_subscriptions;
DROP POLICY IF EXISTS "user_subscriptions_update_optimized" ON public.user_subscriptions;

-- Step 2: Create a single comprehensive policy for ALL operations
-- This eliminates the "multiple permissive policies" warning
CREATE POLICY "user_subscriptions_unified_policy" ON public.user_subscriptions
FOR ALL -- Covers SELECT, INSERT, UPDATE, DELETE
TO authenticated, anon, dashboard_user, authenticator
USING (
  -- User can access their own subscriptions
  user_id = (select auth.uid())
  OR 
  -- Admin/reception/instructor can access all subscriptions (for waitlist promotion, etc.)
  (select auth.uid()) IN (
    select id from public.users 
    where role IN ('admin', 'reception', 'instructor')
  )
)
WITH CHECK (
  -- Same permissions for modifications
  user_id = (select auth.uid())
  OR 
  (select auth.uid()) IN (
    select id from public.users 
    where role IN ('admin', 'reception', 'instructor')
  )
);

-- Step 3: Add performance indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id_status 
ON public.user_subscriptions (user_id, status);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_end_date_status 
ON public.user_subscriptions (end_date, status);

CREATE INDEX IF NOT EXISTS idx_users_role 
ON public.users (role);

-- Step 4: Verify the policy works correctly
-- Run these test queries after applying the fix:

-- Test 1: User accessing their own subscription (should work)
-- SELECT * FROM user_subscriptions WHERE user_id = auth.uid();

-- Test 2: Admin accessing any subscription (should work) 
-- SELECT * FROM user_subscriptions WHERE user_id = 'any-user-id';

-- Test 3: User accessing another user's subscription (should fail for non-admin)
-- SELECT * FROM user_subscriptions WHERE user_id != auth.uid();

-- Step 5: Check if we need service_role policy for admin operations
-- If your admin operations use service_role, add this policy:
CREATE POLICY "user_subscriptions_service_role_policy" ON public.user_subscriptions
FOR ALL
TO service_role
USING (true)  -- Service role has full access
WITH CHECK (true);

-- Step 6: Verify no duplicate policies exist
-- Run this query to check for remaining policies:
-- SELECT schemaname, tablename, policyname, roles, cmd 
-- FROM pg_policies 
-- WHERE tablename = 'user_subscriptions';

-- Expected result: Should show only 2 policies:
-- 1. user_subscriptions_unified_policy (for regular users)
-- 2. user_subscriptions_service_role_policy (for service role)

-- This should completely eliminate all "multiple permissive policies" warnings!