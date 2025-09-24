-- Optimize RLS policies for better performance
-- This migration fixes the auth_rls_initplan warnings by wrapping auth functions in SELECT subqueries
-- and consolidates overlapping policies for better performance

-- 1. Fix notification_settings RLS policies
-- Drop existing policies and recreate them with optimized auth function calls

-- Drop existing notification_settings policies
DROP POLICY IF EXISTS "Allow reading notification settings for notifications" ON public.notification_settings;
DROP POLICY IF EXISTS "Admins can manage all notification settings" ON public.notification_settings;
DROP POLICY IF EXISTS "Users can update own notification settings" ON public.notification_settings;
DROP POLICY IF EXISTS "Users can insert own notification settings" ON public.notification_settings;
DROP POLICY IF EXISTS "notification_settings_access_policy" ON public.notification_settings;

-- Create optimized notification_settings policies
-- Policy for users to manage their own settings
CREATE POLICY "Users can manage own notification settings" ON public.notification_settings
  FOR ALL USING (
    user_id = (SELECT auth.uid())
  );

-- Policy for admins to manage all settings
CREATE POLICY "Admins can manage all notification settings" ON public.notification_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = (SELECT auth.uid())
      AND role = 'admin'
    )
  );

-- Policy for reading notification settings for the notification system
CREATE POLICY "Allow reading notification settings for notifications" ON public.notification_settings
  FOR SELECT USING (true); -- Notifications system needs to read all settings

-- 2. Fix announcements RLS policies
-- Drop existing overlapping policies
DROP POLICY IF EXISTS "Announcements are viewable by everyone" ON public.announcements;
DROP POLICY IF EXISTS "Reception and admin can manage announcements" ON public.announcements;

-- Create single comprehensive policy for announcements
CREATE POLICY "Announcements access policy" ON public.announcements
  FOR SELECT USING (
    -- Everyone can view active announcements
    (is_active = true AND (end_date IS NULL OR end_date > NOW()))
    OR
    -- Reception and admin can view all announcements
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = (SELECT auth.uid())
      AND role IN ('reception', 'admin')
    )
  );

-- Separate policy for write operations (only reception/admin)
CREATE POLICY "Reception and admin can manage announcements" ON public.announcements
  FOR INSERT, UPDATE, DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = (SELECT auth.uid())
      AND role IN ('reception', 'admin')
    )
  );

-- 3. Fix themes RLS policies
-- Drop existing overlapping policies
DROP POLICY IF EXISTS "Themes are viewable by everyone" ON public.themes;
DROP POLICY IF EXISTS "Reception and admin can manage themes" ON public.themes;

-- Create single comprehensive policy for themes
CREATE POLICY "Themes access policy" ON public.themes
  FOR SELECT USING (true); -- Everyone can view themes

-- Separate policy for write operations (only reception/admin)
CREATE POLICY "Reception and admin can manage themes" ON public.themes
  FOR INSERT, UPDATE, DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = (SELECT auth.uid())
      AND role IN ('reception', 'admin')
    )
  );

-- Add helpful comment for future reference
COMMENT ON TABLE public.notification_settings IS 'Optimized RLS policies: Users manage own settings, admins manage all, notifications system can read all';
COMMENT ON TABLE public.announcements IS 'Optimized RLS policies: Everyone can view active announcements, reception/admin can manage all';
COMMENT ON TABLE public.themes IS 'Optimized RLS policies: Everyone can view themes, reception/admin can manage';
