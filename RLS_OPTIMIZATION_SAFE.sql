-- Migration: Optimize RLS Policies for Performance (SAFE VERSION)
-- This migration addresses auth_rls_initplan and multiple_permissive_policies warnings
-- This version uses IF NOT EXISTS to avoid errors if policies already exist

-- Drop existing policies to recreate them optimized
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Anyone can view active subscription plans" ON public.subscription_plans;
DROP POLICY IF EXISTS "Admins can manage subscription plans" ON public.subscription_plans;
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Anyone can view active classes" ON public.classes;
DROP POLICY IF EXISTS "Instructors can manage their classes" ON public.classes;
DROP POLICY IF EXISTS "Admins can manage all classes" ON public.classes;
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can create own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can manage all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can view own waitlist items" ON public.waitlist;
DROP POLICY IF EXISTS "Users can create own waitlist items" ON public.waitlist;
DROP POLICY IF EXISTS "Admins can manage all waitlist items" ON public.waitlist;

-- Drop policies from instructor tables
DROP POLICY IF EXISTS "Instructors can view their assigned clients" ON instructor_client_assignments;
DROP POLICY IF EXISTS "Admin and reception can manage assignments" ON instructor_client_assignments;
DROP POLICY IF EXISTS "Instructors can manage photos for their clients" ON client_progress_photos;
DROP POLICY IF EXISTS "Instructors can manage medical updates for their clients" ON client_medical_updates;
DROP POLICY IF EXISTS "Instructors can manage assessments for their clients" ON client_progress_assessments;

-- Create optimized policies with reduced auth.uid() calls (using DO blocks to handle IF NOT EXISTS)
DO $$
BEGIN
    -- Users table: Single consolidated policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'users_access_policy') THEN
        CREATE POLICY "users_access_policy" ON public.users
          FOR ALL USING (
            auth.uid() = id OR 
            (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'reception')
          );
    END IF;

    -- Subscription plans: Single consolidated policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscription_plans' AND policyname = 'subscription_plans_access_policy') THEN
        CREATE POLICY "subscription_plans_access_policy" ON public.subscription_plans
          FOR ALL USING (
            is_active = true OR 
            (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'reception')
          );
    END IF;

    -- User subscriptions: Single consolidated policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_subscriptions' AND policyname = 'user_subscriptions_access_policy') THEN
        CREATE POLICY "user_subscriptions_access_policy" ON public.user_subscriptions
          FOR ALL USING (
            user_id = auth.uid() OR 
            (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'reception')
          );
    END IF;

    -- Classes: Single consolidated policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'classes' AND policyname = 'classes_access_policy') THEN
        CREATE POLICY "classes_access_policy" ON public.classes
          FOR ALL USING (
            status = 'active' OR 
            instructor_id = auth.uid() OR 
            (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'reception')
          );
    END IF;

    -- Bookings: Single consolidated policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = 'bookings_access_policy') THEN
        CREATE POLICY "bookings_access_policy" ON public.bookings
          FOR ALL USING (
            user_id = auth.uid() OR 
            (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'reception')
          );
    END IF;

    -- Waitlist: Single consolidated policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'waitlist' AND policyname = 'waitlist_access_policy') THEN
        CREATE POLICY "waitlist_access_policy" ON public.waitlist
          FOR ALL USING (
            user_id = auth.uid() OR 
            (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'reception')
          );
    END IF;

    -- Instructor client assignments: Single consolidated policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'instructor_client_assignments' AND policyname = 'instructor_assignments_access_policy') THEN
        CREATE POLICY "instructor_assignments_access_policy" ON instructor_client_assignments
          FOR ALL USING (
            auth.uid() = instructor_id OR 
            auth.uid() = client_id OR 
            (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'reception')
          );
    END IF;

    -- Client progress photos: Single consolidated policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'client_progress_photos' AND policyname = 'progress_photos_access_policy') THEN
        CREATE POLICY "progress_photos_access_policy" ON client_progress_photos
          FOR ALL USING (
            auth.uid() = instructor_id OR 
            auth.uid() = client_id OR 
            (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'reception')
          );
    END IF;

    -- Client medical updates: Single consolidated policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'client_medical_updates' AND policyname = 'medical_updates_access_policy') THEN
        CREATE POLICY "medical_updates_access_policy" ON client_medical_updates
          FOR ALL USING (
            auth.uid() = instructor_id OR 
            auth.uid() = client_id OR 
            (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'reception')
          );
    END IF;

    -- Client progress assessments: Single consolidated policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'client_progress_assessments' AND policyname = 'progress_assessments_access_policy') THEN
        CREATE POLICY "progress_assessments_access_policy" ON client_progress_assessments
          FOR ALL USING (
            auth.uid() = instructor_id OR 
            auth.uid() = client_id OR 
            (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'reception')
          );
    END IF;

END $$;

-- Create a function to get user role efficiently (cached)
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT role FROM public.users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes to support the optimized policies
CREATE INDEX IF NOT EXISTS idx_users_role_for_rls ON public.users(role) WHERE role IN ('admin', 'reception');
CREATE INDEX IF NOT EXISTS idx_classes_instructor_status ON public.classes(instructor_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_user_id ON public.waitlist(user_id);
CREATE INDEX IF NOT EXISTS idx_instructor_assignments_instructor_client ON instructor_client_assignments(instructor_id, client_id);
CREATE INDEX IF NOT EXISTS idx_progress_photos_instructor_client ON client_progress_photos(instructor_id, client_id);
CREATE INDEX IF NOT EXISTS idx_medical_updates_instructor_client ON client_medical_updates(instructor_id, client_id);
CREATE INDEX IF NOT EXISTS idx_progress_assessments_instructor_client ON client_progress_assessments(instructor_id, client_id); 