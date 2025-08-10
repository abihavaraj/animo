-- Create notification_settings table for user notification preferences (if not exists)
CREATE TABLE IF NOT EXISTS public.notification_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  enable_notifications BOOLEAN DEFAULT true,
  default_reminder_minutes INTEGER DEFAULT 15,
  enable_push_notifications BOOLEAN DEFAULT true,
  enable_email_notifications BOOLEAN DEFAULT false,
  class_full_notifications BOOLEAN DEFAULT true,
  new_enrollment_notifications BOOLEAN DEFAULT false,
  class_cancellation_notifications BOOLEAN DEFAULT true,
  general_reminders BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add class_full_notifications column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'notification_settings' 
                   AND column_name = 'class_full_notifications') THEN
        ALTER TABLE public.notification_settings ADD COLUMN class_full_notifications BOOLEAN DEFAULT true;
    END IF;
    
    -- Add new_enrollment_notifications column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'notification_settings' 
                   AND column_name = 'new_enrollment_notifications') THEN
        ALTER TABLE public.notification_settings ADD COLUMN new_enrollment_notifications BOOLEAN DEFAULT false;
    END IF;
    
    -- Add class_cancellation_notifications column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'notification_settings' 
                   AND column_name = 'class_cancellation_notifications') THEN
        ALTER TABLE public.notification_settings ADD COLUMN class_cancellation_notifications BOOLEAN DEFAULT true;
    END IF;
    
    -- Add general_reminders column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'notification_settings' 
                   AND column_name = 'general_reminders') THEN
        ALTER TABLE public.notification_settings ADD COLUMN general_reminders BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Create index for better performance (if not exists)
CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON public.notification_settings(user_id);

-- Enable Row Level Security
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for notification_settings table (if not exist)
DO $$ 
BEGIN
    -- Create policy if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notification_settings' AND policyname = 'Users can view own notification settings') THEN
        CREATE POLICY "Users can view own notification settings" ON public.notification_settings
          FOR SELECT USING (user_id = auth.uid());
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notification_settings' AND policyname = 'Users can update own notification settings') THEN
        CREATE POLICY "Users can update own notification settings" ON public.notification_settings
          FOR UPDATE USING (user_id = auth.uid());
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notification_settings' AND policyname = 'Users can insert own notification settings') THEN
        CREATE POLICY "Users can insert own notification settings" ON public.notification_settings
          FOR INSERT WITH CHECK (user_id = auth.uid());
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notification_settings' AND policyname = 'Admins can manage all notification settings') THEN
        CREATE POLICY "Admins can manage all notification settings" ON public.notification_settings
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM public.users 
              WHERE id = auth.uid() AND role IN ('admin', 'reception')
            )
          );
    END IF;
END $$;

-- Create trigger for updated_at (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_notification_settings_updated_at') THEN
        CREATE TRIGGER update_notification_settings_updated_at 
          BEFORE UPDATE ON public.notification_settings
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Insert default notification settings for existing users
INSERT INTO public.notification_settings (
  user_id, 
  enable_notifications, 
  default_reminder_minutes, 
  enable_push_notifications, 
  enable_email_notifications,
  class_full_notifications,
  new_enrollment_notifications,
  class_cancellation_notifications,
  general_reminders
)
SELECT 
  id, 
  true, 
  15, 
  true, 
  false,
  true,
  false,
  true,
  true
FROM public.users
WHERE id NOT IN (SELECT user_id FROM public.notification_settings);