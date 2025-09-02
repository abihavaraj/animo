// Create notification settings for argjend
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://byhqueksdwlbiwodpbbd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5aHF1ZWtzZHdsYml3b2RwYmJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4NjA0NzgsImV4cCI6MjA2ODQzNjQ3OH0.UpbbA73l8to48B42AWiGaL8sXkOmJIqeisbaDg-u-Io';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createNotificationSettings() {
  console.log('🔧 Creating notification settings for argjend...\n');
  
  // Get your user ID
  const { data: user } = await supabase
    .from('users')
    .select('id, name')
    .eq('name', 'argjend')
    .single();
    
  if (!user) {
    console.log('❌ User not found');
    return;
  }
  
  console.log(`👤 Found user: ${user.name} (${user.id})`);
  
  // Create notification settings with defaults that enable reminders
  const { data, error } = await supabase
    .from('notification_settings')
    .insert({
      user_id: user.id,
      enable_notifications: true,
      enable_push_notifications: true,
      enable_email_notifications: true,
      class_reminders: true,
      default_reminder_minutes: 30,  // 30 minutes before class
      class_full_notifications: true,
      new_enrollment_notifications: false,
      class_cancellation_notifications: true,
      general_reminders: true
    })
    .select()
    .single();
    
  if (error) {
    console.error('❌ Failed to create notification settings:', error);
  } else {
    console.log('✅ Notification settings created successfully!');
    console.log('📋 Settings:');
    console.log(`   - Notifications enabled: ${data.enable_notifications}`);
    console.log(`   - Push enabled: ${data.enable_push_notifications}`);
    console.log(`   - Class reminders: ${data.class_reminders}`);
    console.log(`   - Reminder time: ${data.default_reminder_minutes} minutes before class`);
    console.log(`   - Email notifications: ${data.enable_email_notifications}`);
  }
}

createNotificationSettings().catch(console.error);
