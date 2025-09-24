-- SAFE RLS ENABLEMENT STRATEGY
-- This script enables RLS on tables that have policies but RLS is disabled
-- It's designed to maintain current functionality while adding proper security

-- STEP 1: Enable RLS on tables that already have policies
-- These tables already have access policies defined, we just need to activate them

-- Enable RLS for bookings table
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Enable RLS for class_notification_settings table  
ALTER TABLE public.class_notification_settings ENABLE ROW LEVEL SECURITY;

-- Enable RLS for classes table
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- Enable RLS for client_activities table
ALTER TABLE public.client_activities ENABLE ROW LEVEL SECURITY;

-- Enable RLS for client_activity_log table
ALTER TABLE public.client_activity_log ENABLE ROW LEVEL SECURITY;

-- Enable RLS for client_lifecycle table
ALTER TABLE public.client_lifecycle ENABLE ROW LEVEL SECURITY;

-- Enable RLS for manual_credits table
ALTER TABLE public.manual_credits ENABLE ROW LEVEL SECURITY;

-- Enable RLS for notifications table
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Enable RLS for users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Enable RLS for waitlist table
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Enable RLS for subscriptions table (mentioned in warnings)
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Add helpful comments
COMMENT ON TABLE public.bookings IS 'RLS enabled - uses bookings_access_policy';
COMMENT ON TABLE public.class_notification_settings IS 'RLS enabled - uses class_notification_settings_access_policy';
COMMENT ON TABLE public.classes IS 'RLS enabled - uses classes_unified_access_policy';
COMMENT ON TABLE public.client_activities IS 'RLS enabled - uses client_activities_access_policy';
COMMENT ON TABLE public.client_activity_log IS 'RLS enabled - uses client_activity_log_access_policy';
COMMENT ON TABLE public.client_lifecycle IS 'RLS enabled - uses client_lifecycle_access_policy';
COMMENT ON TABLE public.manual_credits IS 'RLS enabled - uses manual_credits_access_policy';
COMMENT ON TABLE public.notifications IS 'RLS enabled - uses notifications_access_policy';
COMMENT ON TABLE public.users IS 'RLS enabled - uses users_access_policy';
COMMENT ON TABLE public.waitlist IS 'RLS enabled - uses waitlist_access_policy';
