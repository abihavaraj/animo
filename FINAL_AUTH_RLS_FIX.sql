-- Final RLS Optimization - Fix auth_rls_initplan warnings
-- Replace auth.uid() with (select auth.uid()) to avoid per-row re-evaluation

-- Drop and recreate all policies with optimized auth.uid() calls
DO $$
BEGIN
    -- Notification settings
    DROP POLICY IF EXISTS "notification_settings_access_policy" ON notification_settings;
    CREATE POLICY "notification_settings_access_policy" ON notification_settings
      FOR ALL USING (
        user_id = (select auth.uid()) OR 
        (SELECT role FROM public.users WHERE id = (select auth.uid())) IN ('admin', 'reception')
      );

    -- Client documents
    DROP POLICY IF EXISTS "client_documents_access_policy" ON client_documents;
    CREATE POLICY "client_documents_access_policy" ON client_documents
      FOR ALL USING (
        (select auth.uid()) = client_id OR 
        (select auth.uid()) = uploaded_by OR 
        (SELECT role FROM public.users WHERE id = (select auth.uid())) IN ('admin', 'reception')
      );

    -- Client notes
    DROP POLICY IF EXISTS "client_notes_access_policy" ON client_notes;
    CREATE POLICY "client_notes_access_policy" ON client_notes
      FOR ALL USING (
        (select auth.uid()) = client_id OR 
        (select auth.uid()) = created_by OR 
        (SELECT role FROM public.users WHERE id = (select auth.uid())) IN ('admin', 'reception')
      );

    -- Payments
    DROP POLICY IF EXISTS "payments_access_policy" ON payments;
    CREATE POLICY "payments_access_policy" ON payments
      FOR ALL USING (
        user_id = (select auth.uid()) OR 
        (SELECT role FROM public.users WHERE id = (select auth.uid())) IN ('admin', 'reception')
      );

    -- Class notification settings
    DROP POLICY IF EXISTS "class_notification_settings_access_policy" ON class_notification_settings;
    CREATE POLICY "class_notification_settings_access_policy" ON class_notification_settings
      FOR ALL USING (
        (SELECT role FROM public.users WHERE id = (select auth.uid())) IN ('admin', 'reception')
      );

    -- Client activities
    DROP POLICY IF EXISTS "client_activities_access_policy" ON client_activities;
    CREATE POLICY "client_activities_access_policy" ON client_activities
      FOR ALL USING (
        (SELECT role FROM public.users WHERE id = (select auth.uid())) IN ('admin', 'reception')
      );

    -- Subscription plans
    DROP POLICY IF EXISTS "subscription_plans_access_policy" ON subscription_plans;
    CREATE POLICY "subscription_plans_access_policy" ON subscription_plans
      FOR ALL USING (
        is_active = true OR 
        (SELECT role FROM public.users WHERE id = (select auth.uid())) IN ('admin', 'reception')
      );

    -- User subscriptions
    DROP POLICY IF EXISTS "user_subscriptions_access_policy" ON user_subscriptions;
    CREATE POLICY "user_subscriptions_access_policy" ON user_subscriptions
      FOR ALL USING (
        user_id = (select auth.uid()) OR 
        (SELECT role FROM public.users WHERE id = (select auth.uid())) IN ('admin', 'reception')
      );

    -- Instructor client assignments
    DROP POLICY IF EXISTS "instructor_assignments_access_policy" ON instructor_client_assignments;
    CREATE POLICY "instructor_assignments_access_policy" ON instructor_client_assignments
      FOR ALL USING (
        (select auth.uid()) = instructor_id OR 
        (select auth.uid()) = client_id OR 
        (SELECT role FROM public.users WHERE id = (select auth.uid())) IN ('admin', 'reception')
      );

    -- Client progress photos
    DROP POLICY IF EXISTS "progress_photos_access_policy" ON client_progress_photos;
    CREATE POLICY "progress_photos_access_policy" ON client_progress_photos
      FOR ALL USING (
        (select auth.uid()) = instructor_id OR 
        (select auth.uid()) = client_id OR 
        (SELECT role FROM public.users WHERE id = (select auth.uid())) IN ('admin', 'reception')
      );

    -- Client medical updates
    DROP POLICY IF EXISTS "medical_updates_access_policy" ON client_medical_updates;
    CREATE POLICY "medical_updates_access_policy" ON client_medical_updates
      FOR ALL USING (
        (select auth.uid()) = instructor_id OR 
        (select auth.uid()) = client_id OR 
        (SELECT role FROM public.users WHERE id = (select auth.uid())) IN ('admin', 'reception')
      );

    -- Client progress assessments
    DROP POLICY IF EXISTS "progress_assessments_access_policy" ON client_progress_assessments;
    CREATE POLICY "progress_assessments_access_policy" ON client_progress_assessments
      FOR ALL USING (
        (select auth.uid()) = instructor_id OR 
        (select auth.uid()) = client_id OR 
        (SELECT role FROM public.users WHERE id = (select auth.uid())) IN ('admin', 'reception')
      );

    -- Manual credits
    DROP POLICY IF EXISTS "manual_credits_access_policy" ON manual_credits;
    CREATE POLICY "manual_credits_access_policy" ON manual_credits
      FOR ALL USING (
        user_id = (select auth.uid()) OR 
        (SELECT role FROM public.users WHERE id = (select auth.uid())) IN ('admin', 'reception')
      );

    -- Client activity log
    DROP POLICY IF EXISTS "client_activity_log_access_policy" ON client_activity_log;
    CREATE POLICY "client_activity_log_access_policy" ON client_activity_log
      FOR ALL USING (
        (select auth.uid()) = client_id OR 
        ((select auth.uid()) = performed_by AND performed_by IS NOT NULL) OR 
        (SELECT role FROM public.users WHERE id = (select auth.uid())) IN ('admin', 'reception')
      );

    -- Client lifecycle
    DROP POLICY IF EXISTS "client_lifecycle_access_policy" ON client_lifecycle;
    CREATE POLICY "client_lifecycle_access_policy" ON client_lifecycle
      FOR ALL USING (
        (select auth.uid()) = client_id OR 
        ((select auth.uid()) = stage_changed_by AND stage_changed_by IS NOT NULL) OR 
        (SELECT role FROM public.users WHERE id = (select auth.uid())) IN ('admin', 'reception')
      );

    -- Notifications
    DROP POLICY IF EXISTS "notifications_access_policy" ON notifications;
    CREATE POLICY "notifications_access_policy" ON notifications
      FOR ALL USING (
        user_id = (select auth.uid()) OR 
        (SELECT role FROM public.users WHERE id = (select auth.uid())) IN ('admin', 'reception')
      );

    -- Users
    DROP POLICY IF EXISTS "users_access_policy" ON users;
    CREATE POLICY "users_access_policy" ON users
      FOR ALL USING (
        (select auth.uid()) = id OR 
        (SELECT role FROM public.users WHERE id = (select auth.uid())) IN ('admin', 'reception')
      );

    -- Classes
    DROP POLICY IF EXISTS "classes_access_policy" ON classes;
    CREATE POLICY "classes_access_policy" ON classes
      FOR ALL USING (
        status = 'active' OR 
        instructor_id = (select auth.uid()) OR 
        (SELECT role FROM public.users WHERE id = (select auth.uid())) IN ('admin', 'reception')
      );

    -- Bookings
    DROP POLICY IF EXISTS "bookings_access_policy" ON bookings;
    CREATE POLICY "bookings_access_policy" ON bookings
      FOR ALL USING (
        user_id = (select auth.uid()) OR 
        (SELECT role FROM public.users WHERE id = (select auth.uid())) IN ('admin', 'reception')
      );

    -- Waitlist
    DROP POLICY IF EXISTS "waitlist_access_policy" ON waitlist;
    CREATE POLICY "waitlist_access_policy" ON waitlist
      FOR ALL USING (
        user_id = (select auth.uid()) OR 
        (SELECT role FROM public.users WHERE id = (select auth.uid())) IN ('admin', 'reception')
      );

END $$;