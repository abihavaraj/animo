-- Fix RLS Security Issues
-- Enable Row Level Security on all tables that have policies but RLS disabled

BEGIN;

-- Enable RLS on bookings table
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Enable RLS on classes table  
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- Enable RLS on client_activity_log table
ALTER TABLE public.client_activity_log ENABLE ROW LEVEL SECURITY;

-- Enable RLS on client_lifecycle table
ALTER TABLE public.client_lifecycle ENABLE ROW LEVEL SECURITY;

-- Enable RLS on manual_credits table
ALTER TABLE public.manual_credits ENABLE ROW LEVEL SECURITY;

-- Enable RLS on notifications table
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Enable RLS on waitlist table
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Enable RLS on subscriptions table (mentioned in linter errors)
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

COMMIT;

-- Verify RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  hasrls
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'bookings', 'classes', 'client_activity_log', 'client_lifecycle',
    'manual_credits', 'notifications', 'users', 'waitlist', 'subscriptions'
  )
ORDER BY tablename;