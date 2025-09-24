-- Fix reception activity logging issue
-- The RLS policy was too restrictive and only allowed admin users to insert activities
-- This fix allows reception and instructor users to also insert activities

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Admin can insert activities" ON staff_activities;

-- Create the corrected policy that allows admin, reception, and instructor users
CREATE POLICY "Admin can insert activities" ON staff_activities
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'reception', 'instructor')
    )
  );

-- Verify the policy was created correctly
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'staff_activities' 
AND policyname = 'Admin can insert activities';
