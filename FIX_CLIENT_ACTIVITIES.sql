-- Fix the last remaining table: client_activities
-- Drop the old policy and create an optimized one

-- Drop old policy for client_activities
DROP POLICY IF EXISTS "Allow reception and admin to manage client activities" ON client_activities;

-- Create optimized policy for client_activities
-- Since this table exists but we're not sure of its structure, we'll use a simple admin/reception-only policy
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'client_activities' AND policyname = 'client_activities_access_policy') THEN
        CREATE POLICY "client_activities_access_policy" ON client_activities
          FOR ALL USING (
            (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'reception')
          );
    END IF;
END $$;