// Test endpoint for debugging notification issues
// Access via: /api/test-notifications?action=check

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://byhqueksdwlbiwodpbbd.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5aHF1ZWtzZHdsYml3b2RwYmJkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg2MDQ3OCwiZXhwIjoyMDY4NDM2NDc4fQ.AaWY'
);

export default async function handler(req, res) {
  try {
    const { action = 'check' } = req.query;

    if (action === 'check') {
      // Check pending notifications
      const { data: notifications, error: notifError } = await supabase
        .from('notifications')
        .select('*')
        .eq('is_read', false)
        .is('sent_at', null)
        .order('created_at', { ascending: false })
        .limit(20);

      // Check users with push tokens
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, name, push_token')
        .not('push_token', 'is', null)
        .limit(10);

      // Check notification settings
      const { data: settings, error: settingsError } = await supabase
        .from('notification_settings')
        .select('*')
        .limit(10);

      return res.status(200).json({
        success: true,
        data: {
          pendingNotifications: notifications || [],
          usersWithTokens: users || [],
          notificationSettings: settings || [],
          errors: {
            notifications: notifError,
            users: usersError,
            settings: settingsError
          }
        },
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'create-test') {
      // Create a test notification for debugging
      const { userId, title = 'Test Notification', message = 'This is a test notification' } = req.query;
      
      if (!userId) {
        return res.status(400).json({ error: 'userId parameter required' });
      }

      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type: 'test',
          title,
          message,
          scheduled_for: new Date().toISOString(),
          metadata: { test: true },
          is_read: false
        })
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({
        success: true,
        message: 'Test notification created',
        data,
        timestamp: new Date().toISOString()
      });
    }

    return res.status(400).json({ 
      error: 'Invalid action. Use ?action=check or ?action=create-test&userId=xxx' 
    });

  } catch (error) {
    console.error('Test notifications error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
