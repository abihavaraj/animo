-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create announcements table for reception to manage studio announcements
CREATE TABLE public.announcements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT CHECK(type IN ('info', 'warning', 'urgent')) NOT NULL DEFAULT 'info',
  is_active BOOLEAN DEFAULT true,
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create themes table for dynamic theme switching
CREATE TABLE public.themes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT false,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  colors JSONB NOT NULL, -- Store theme colors as JSON
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default themes (only if users exist)
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Try to get an admin user, fallback to any user
    SELECT id INTO admin_user_id FROM public.users WHERE role = 'admin' LIMIT 1;
    
    IF admin_user_id IS NULL THEN
        SELECT id INTO admin_user_id FROM public.users LIMIT 1;
    END IF;
    
    -- Only insert if we have a user
    IF admin_user_id IS NOT NULL THEN
        INSERT INTO public.themes (name, display_name, description, is_active, colors, created_by) VALUES
        ('default', 'Default Theme', 'Standard studio theme', true, 
         '{"primary": "#6B8E7F", "secondary": "#FFFFFF", "accent": "#6B8E7F", "background": "#FFFFFF", "surface": "#FFFFFF", "text": "#2C2C2C", "textSecondary": "#666666", "border": "#E8E6E3"}', 
         admin_user_id),
        ('womens_day', 'Women''s Day Celebration', 'Elegant feminine theme celebrating International Women''s Day with authentic pilates aesthetics', false,
         '{"primary": "#8B5A6B", "secondary": "#F5F0F2", "accent": "#D4719A", "background": "#FEFCFD", "surface": "#FFFFFF", "text": "#3C3C3C", "textSecondary": "#7A6B73", "textMuted": "#A194A1", "border": "#E8DDE3", "divider": "#F0E8ED", "success": "#8B9A6B", "warning": "#D4A574", "error": "#C47D7D", "tint": "#8B5A6B", "icon": "#8B5A6B", "actionPrimary": "#D4719A", "actionSecondary": "#8B5A6B", "surfaceElevated": "#FFFFFF", "surfaceVariant": "#F9F5F7", "textOnAccent": "#FFFFFF", "tabIconDefault": "#A194A1", "tabIconSelected": "#8B5A6B"}',
         admin_user_id),
        ('new_year', 'New Year', 'Celebratory theme for New Year', false,
         '{"primary": "#FF6B35", "secondary": "#FFF3E0", "accent": "#E65100", "background": "#FFFBFE", "surface": "#FFFFFF", "text": "#2C2C2C", "textSecondary": "#666666", "border": "#FFCC80"}',
         admin_user_id),
        ('christmas', 'Christmas', 'Festive holiday theme', false,
         '{"primary": "#D32F2F", "secondary": "#FFEBEE", "accent": "#B71C1C", "background": "#FFF8F8", "surface": "#FFFFFF", "text": "#2C2C2C", "textSecondary": "#666666", "border": "#FFCDD2"}',
         admin_user_id);
    END IF;
END
$$;

-- Create RLS policies
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.themes ENABLE ROW LEVEL SECURITY;

-- Announcements policies
CREATE POLICY "Announcements are viewable by everyone" ON public.announcements
  FOR SELECT USING (is_active = true AND (end_date IS NULL OR end_date > NOW()));

CREATE POLICY "Reception and admin can manage announcements" ON public.announcements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('reception', 'admin')
    )
  );

-- Themes policies
CREATE POLICY "Themes are viewable by everyone" ON public.themes
  FOR SELECT USING (true);

CREATE POLICY "Reception and admin can manage themes" ON public.themes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('reception', 'admin')
    )
  );

-- Create indexes for performance
CREATE INDEX idx_announcements_active ON public.announcements(is_active, start_date, end_date);
CREATE INDEX idx_themes_active ON public.themes(is_active, start_date, end_date);
CREATE INDEX idx_announcements_created_by ON public.announcements(created_by);
CREATE INDEX idx_themes_created_by ON public.themes(created_by);
