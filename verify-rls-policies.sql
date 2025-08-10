-- Verification Query: Check Current RLS Policies
-- Run this to see all current policies on user_subscriptions table

SELECT 
    schemaname,
    tablename,
    policyname,
    roles,
    cmd as operation,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies 
WHERE tablename = 'user_subscriptions'
ORDER BY policyname;

-- Expected result after fix:
-- Should show only 2 policies:
-- 1. user_subscriptions_unified_policy
-- 2. user_subscriptions_service_role_policy (if needed)

-- If you see more than 2 policies, some old ones weren't dropped properly