-- Final RLS Optimization with Exact Column Names from Supabase Schema
-- This addresses the remaining tables with multiple old policies

-- Drop old policies for notification_settings
DROP POLICY IF EXISTS "Admins can manage all notification settings" ON notification_settings;
DROP POLICY IF EXISTS "Allow all access to notification_settings" ON notification_settings;
DROP POLICY IF EXISTS "Users can insert own notification settings" ON notification_settings;
DROP POLICY IF EXISTS "Users can manage their own notification settings" ON notification_settings;
DROP POLICY IF EXISTS "Users can update own notification settings" ON notification_settings;
DROP POLICY IF EXISTS "Users can view own notification settings" ON notification_settings;

-- Drop old policies for client_documents
DROP POLICY IF EXISTS "Admins and reception can delete client documents" ON client_documents;
DROP POLICY IF EXISTS "Admins and reception can insert client documents" ON client_documents;
DROP POLICY IF EXISTS "Admins and reception can update client documents" ON client_documents;
DROP POLICY IF EXISTS "Admins and reception can view all client documents" ON client_documents;
DROP POLICY IF EXISTS "Allow reception and admin to manage client documents" ON client_documents;

-- Drop old policies for client_notes
DROP POLICY IF EXISTS "Admins can manage all notes" ON client_notes;
DROP POLICY IF EXISTS "Allow reception and admin to manage client notes" ON client_notes;

-- Drop old policies for payments
DROP POLICY IF EXISTS "Admins can view all payments" ON payments;
DROP POLICY IF EXISTS "Allow reception and admin access to payments" ON payments;
DROP POLICY IF EXISTS "Users can view own payments" ON payments;

-- Drop old policies for manual_credits
DROP POLICY IF EXISTS "Admins can manage all credits" ON manual_credits;
DROP POLICY IF EXISTS "Users can view own credits" ON manual_credits;

-- Drop old policies for other tables
DROP POLICY IF EXISTS "Admins can view all activity logs" ON client_activity_log;
DROP POLICY IF EXISTS "Admins can manage all lifecycle data" ON client_lifecycle;
DROP POLICY IF EXISTS "Allow reception and admin to manage notifications" ON notifications;
DROP POLICY IF EXISTS "Allow reception and admin to manage client activities" ON client_activities;
DROP POLICY IF EXISTS "Admins can manage class notification settings" ON class_notification_settings;

-- Drop old policies for subscription_plans (keep the optimized one)
DROP POLICY IF EXISTS "Allow modifying subscription_plans" ON subscription_plans;
DROP POLICY IF EXISTS "Allow reading subscription_plans" ON subscription_plans;

-- Drop old policies for user_subscriptions (keep the optimized one)
DROP POLICY IF EXISTS "Allow authenticated users to delete user_subscriptions" ON user_subscriptions;
DROP POLICY IF EXISTS "Allow authenticated users to insert user_subscriptions" ON user_subscriptions;
DROP POLICY IF EXISTS "Allow authenticated users to read user_subscriptions" ON user_subscriptions;
DROP POLICY IF EXISTS "Allow authenticated users to update user_subscriptions" ON user_subscriptions;

-- Create optimized policies for remaining tables with exact column names
DO $$
BEGIN
    -- Notification settings: Single consolidated policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notification_settings' AND policyname = 'notification_settings_access_policy') THEN
        CREATE POLICY "notification_settings_access_policy" ON notification_settings
          FOR ALL USING (
            user_id = auth.uid() OR 
            (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'reception')
          );
    END IF;

    -- Client documents: Single consolidated policy (uses client_id and uploaded_by)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'client_documents' AND policyname = 'client_documents_access_policy') THEN
        CREATE POLICY "client_documents_access_policy" ON client_documents
          FOR ALL USING (
            auth.uid() = client_id OR 
            auth.uid() = uploaded_by OR 
            (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'reception')
          );
    END IF;

    -- Client notes: Single consolidated policy (uses client_id and created_by)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'client_notes' AND policyname = 'client_notes_access_policy') THEN
        CREATE POLICY "client_notes_access_policy" ON client_notes
          FOR ALL USING (
            auth.uid() = client_id OR 
            auth.uid() = created_by OR 
            (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'reception')
          );
    END IF;

    -- Payments: Single consolidated policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'payments_access_policy') THEN
        CREATE POLICY "payments_access_policy" ON payments
          FOR ALL USING (
            user_id = auth.uid() OR 
            (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'reception')
          );
    END IF;

    -- Manual credits: Single consolidated policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'manual_credits' AND policyname = 'manual_credits_access_policy') THEN
        CREATE POLICY "manual_credits_access_policy" ON manual_credits
          FOR ALL USING (
            user_id = auth.uid() OR 
            (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'reception')
          );
    END IF;

    -- Client activity log: Single consolidated policy (uses client_id and performed_by)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'client_activity_log' AND policyname = 'client_activity_log_access_policy') THEN
        CREATE POLICY "client_activity_log_access_policy" ON client_activity_log
          FOR ALL USING (
            auth.uid() = client_id OR 
            auth.uid() = performed_by OR 
            (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'reception')
          );
    END IF;

    -- Client lifecycle: Single consolidated policy (uses client_id and stage_changed_by)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'client_lifecycle' AND policyname = 'client_lifecycle_access_policy') THEN
        CREATE POLICY "client_lifecycle_access_policy" ON client_lifecycle
          FOR ALL USING (
            auth.uid() = client_id OR 
            auth.uid() = stage_changed_by OR 
            (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'reception')
          );
    END IF;

    -- Notifications: Single consolidated policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'notifications_access_policy') THEN
        CREATE POLICY "notifications_access_policy" ON notifications
          FOR ALL USING (
            user_id = auth.uid() OR 
            (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'reception')
          );
    END IF;

    -- Client activities: Single consolidated policy (uses client_id and admin_id)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'client_activities' AND policyname = 'client_activities_access_policy') THEN
        CREATE POLICY "client_activities_access_policy" ON client_activities
          FOR ALL USING (
            auth.uid() = client_id OR 
            auth.uid() = admin_id OR 
            (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'reception')
          );
    END IF;

    -- Class notification settings: Single consolidated policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'class_notification_settings' AND policyname = 'class_notification_settings_access_policy') THEN
        CREATE POLICY "class_notification_settings_access_policy" ON class_notification_settings
          FOR ALL USING (
            (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'reception')
          );
    END IF;

END $$;

-- Create additional indexes for the remaining tables
CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON notification_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_client_uploaded ON client_documents(client_id, uploaded_by);
CREATE INDEX IF NOT EXISTS idx_client_notes_client_created ON client_notes(client_id, created_by);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_manual_credits_user_id ON manual_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_client_activity_log_client_performed ON client_activity_log(client_id, performed_by);
CREATE INDEX IF NOT EXISTS idx_client_lifecycle_client_stage ON client_lifecycle(client_id, stage_changed_by);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_client_activities_client_admin ON client_activities(client_id, admin_id); 