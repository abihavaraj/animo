-- Fix Supabase RLS Performance Warnings
-- This addresses the linter warnings while maintaining security

-- Step 1: Fix auth function performance issues
-- Replace auth.uid() with (select auth.uid()) for better performance

-- Drop existing problematic policies
DROP POLICY IF EXISTS "user_subscriptions_select_own" ON public.user_subscriptions;
DROP POLICY IF EXISTS "user_subscriptions_update_own" ON public.user_subscriptions;

-- Step 2: Create optimized RLS policies with proper auth function calls

-- Optimized SELECT policy (fixes auth_rls_initplan warning)
CREATE POLICY "user_subscriptions_select_optimized" ON public.user_subscriptions
FOR SELECT 
TO authenticated, anon, dashboard_user, authenticator
USING (
  user_id = (select auth.uid())  -- Optimized: wrapped in select
  OR 
  (select auth.uid()) IN (
    select id from public.users 
    where role IN ('admin', 'reception', 'instructor')
  )
);

-- Optimized UPDATE policy (fixes auth_rls_initplan warning)  
CREATE POLICY "user_subscriptions_update_optimized" ON public.user_subscriptions
FOR UPDATE
TO authenticated, anon, dashboard_user, authenticator
USING (
  user_id = (select auth.uid())  -- Optimized: wrapped in select
  OR 
  (select auth.uid()) IN (
    select id from public.users 
    where role IN ('admin', 'reception', 'instructor')
  )
)
WITH CHECK (
  user_id = (select auth.uid())  -- Optimized: wrapped in select
  OR 
  (select auth.uid()) IN (
    select id from public.users 
    where role IN ('admin', 'reception', 'instructor')
  )
);

-- Step 3: Check if user_subscriptions_access_policy is still needed
-- If it's redundant with the optimized policies above, consider dropping it

-- Step 4: Add index for better performance on RLS checks
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id_status 
ON public.user_subscriptions (user_id, status);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_end_date_status 
ON public.user_subscriptions (end_date, status);

-- Step 5: Add index for users role lookup (used in RLS policies)
CREATE INDEX IF NOT EXISTS idx_users_role 
ON public.users (role);

-- Optional: If you want to simplify further, create a single comprehensive policy
-- that replaces both user_subscriptions_access_policy and the optimized ones above

/*
-- Alternative: Single comprehensive policy (uncomment if preferred)
DROP POLICY IF EXISTS "user_subscriptions_access_policy" ON public.user_subscriptions;

CREATE POLICY "user_subscriptions_comprehensive" ON public.user_subscriptions
FOR ALL
TO authenticated, anon, dashboard_user, authenticator
USING (
  -- User can access their own subscriptions
  user_id = (select auth.uid())
  OR 
  -- Admin/reception/instructor can access all subscriptions
  (select auth.uid()) IN (
    select id from public.users 
    where role IN ('admin', 'reception', 'instructor')
  )
)
WITH CHECK (
  -- User can only modify their own subscriptions  
  user_id = (select auth.uid())
  OR 
  -- Admin/reception/instructor can modify any subscription
  (select auth.uid()) IN (
    select id from public.users 
    where role IN ('admin', 'reception', 'instructor')
  )
);
*/

-- Step 6: Verify the policies work correctly
-- Test queries (run these to verify):

-- This should work for a user accessing their own subscription:
-- SELECT * FROM user_subscriptions WHERE user_id = auth.uid();

-- This should work for admin users accessing any subscription:
-- SELECT * FROM user_subscriptions WHERE user_id = 'any-user-id';

-- After running this script, the linter warnings should be resolved!