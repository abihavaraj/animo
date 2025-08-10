-- Check which policies already exist
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    CASE 
        WHEN policyname LIKE '%_access_policy' THEN 'NEW OPTIMIZED POLICY'
        ELSE 'OLD POLICY'
    END as policy_type
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname; 