-- Create staff_activities table for tracking reception and instructor actions
CREATE TABLE IF NOT EXISTS staff_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL,
    staff_name TEXT NOT NULL,
    staff_role TEXT NOT NULL CHECK (staff_role IN ('reception', 'instructor', 'admin')),
    activity_type TEXT NOT NULL,
    activity_description TEXT NOT NULL,
    client_id UUID,
    client_name TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_staff_activities_staff_id ON staff_activities(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_activities_created_at ON staff_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_staff_activities_client_id ON staff_activities(client_id);
CREATE INDEX IF NOT EXISTS idx_staff_activities_type ON staff_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_staff_activities_role ON staff_activities(staff_role);

-- Add foreign key constraint to users table
ALTER TABLE staff_activities 
ADD CONSTRAINT fk_staff_activities_staff_id 
FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE CASCADE;

-- Add foreign key constraint for client_id (optional)
ALTER TABLE staff_activities 
ADD CONSTRAINT fk_staff_activities_client_id 
FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE SET NULL;

-- Enable RLS (Row Level Security)
ALTER TABLE staff_activities ENABLE ROW LEVEL SECURITY;

-- Create policy for admin access (can see all activities)
CREATE POLICY "Admin can view all staff activities" ON staff_activities
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Create policy for staff to view their own activities
CREATE POLICY "Staff can view own activities" ON staff_activities
    FOR SELECT USING (staff_id = auth.uid());

-- Create policy for admin to insert activities (when admins perform actions)
CREATE POLICY "Admin can insert activities" ON staff_activities
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'reception', 'instructor')
        )
    );

-- Grant necessary permissions
GRANT SELECT, INSERT ON staff_activities TO authenticated;

-- Insert some sample data for testing (optional)
-- INSERT INTO staff_activities (staff_id, staff_name, staff_role, activity_type, activity_description, metadata) VALUES
-- (
--     (SELECT id FROM users WHERE role = 'reception' LIMIT 1),
--     (SELECT name FROM users WHERE role = 'reception' LIMIT 1),
--     'reception',
--     'subscription_added',
--     'Added new subscription for client',
--     '{"planName": "Premium Monthly", "clientName": "John Doe"}'
-- );
