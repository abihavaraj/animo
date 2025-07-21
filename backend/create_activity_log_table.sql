-- Create client_activity_log table in Supabase
-- Run this SQL in your Supabase Dashboard > SQL Editor

CREATE TABLE client_activity_log (
  id SERIAL PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type TEXT CHECK(activity_type IN (
    'registration', 'login', 'subscription_purchase', 'subscription_renewal', 'subscription_cancellation',
    'subscription_extended', 'subscription_paused', 'subscription_resumed',
    'class_booking', 'class_cancellation', 'class_attendance', 'class_no_show',
    'payment_made', 'payment_failed', 'profile_update', 'note_added', 'document_uploaded',
    'status_change', 'communication_sent', 'waitlist_joined', 'waitlist_promoted'
  )) NOT NULL,
  description TEXT NOT NULL,
  metadata TEXT,
  performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for better performance
CREATE INDEX idx_client_activity_log_client_id ON client_activity_log(client_id);
CREATE INDEX idx_client_activity_log_activity_type ON client_activity_log(activity_type);
CREATE INDEX idx_client_activity_log_created_at ON client_activity_log(created_at);
CREATE INDEX idx_client_activity_log_performed_by ON client_activity_log(performed_by); 