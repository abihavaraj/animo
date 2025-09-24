-- Create activity_logs table for tracking instructor and admin activities
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('class_created', 'client_assigned', 'client_unassigned', 'class_cancelled', 'subscription_assigned', 'payment_received')),
    action_description TEXT NOT NULL,
    target_id TEXT,
    target_type TEXT CHECK (target_type IN ('class', 'booking', 'client', 'subscription', 'payment')),
    target_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON public.activity_logs(action_type);

-- Enable Row Level Security
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for reading activities (reception and admin can see all)
CREATE POLICY "reception_admin_can_view_activities" ON public.activity_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'reception')
        )
    );

-- Create policy for creating activities (instructors, reception, admin can create)
CREATE POLICY "staff_can_create_activities" ON public.activity_logs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'reception', 'instructor')
        )
    );

-- Grant permissions
GRANT SELECT, INSERT ON public.activity_logs TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.activity_logs_id_seq TO authenticated;
