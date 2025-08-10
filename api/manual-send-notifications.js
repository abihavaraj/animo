// Manual trigger endpoint for sending notifications
// Can be called manually or via external cron service (like cron-job.org)

import { createClient } from '@supabase/supabase-js';
import { Expo } from 'expo-server-sdk';

// Initialize Supabase client
const supabase = createClient(
  'https://byhqueksdwlbiwodpbbd.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5aHF1ZWtzZHdsYml3b2RwYmJkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg2MDQ3OCwiZXhwIjoyMDY4NDM2NDc4fQ.AaWY'
);

// Initialize Expo SDK
const expo = new Expo();

export default async function handler(req, res) {
  try {
    console.log('🔔 Starting manual notification processing...');
    
    // Only allow GET requests
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Get current time
    const now = new Date().toISOString();
    
    // Get notifications that should be sent now
    const { data: pendingNotifications, error } = await supabase
      .from('notifications')
      .select(`
        *,
        users!inner(name, email, push_token)
      `)
      .eq('is_read', false)
      .not('metadata->>push_token', 'is', null)
      .lte('scheduled_for', now)
      .is('sent_at', null)
      .limit(50);

    if (error) {
      console.error('❌ Error fetching notifications:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!pendingNotifications || pendingNotifications.length === 0) {
      console.log('📭 No pending notifications to send');
      return res.status(200).json({ 
        success: true, 
        message: 'No notifications to send',
        processed: 0 
      });
    }

    console.log(`📨 Processing ${pendingNotifications.length} notifications...`);

    let successCount = 0;
    let errorCount = 0;

    // Process each notification
    for (const notification of pendingNotifications) {
      try {
        // Get push token from metadata or user record
        const pushToken = notification.metadata?.push_token || notification.users?.push_token;
        
        if (!pushToken) {
          console.log(`⚠️ No push token for notification ${notification.id}`);
          continue;
        }

        // Validate push token
        if (!Expo.isExpoPushToken(pushToken)) {
          console.log(`❌ Invalid push token for notification ${notification.id}: ${pushToken}`);
          continue;
        }

        // Create push message
        const pushMessage = {
          to: pushToken,
          sound: 'default',
          title: notification.title || '🧘‍♀️ Pilates Reminder',
          body: notification.message,
          data: {
            notificationId: notification.id,
            type: notification.type,
            userId: notification.user_id,
            ...notification.metadata
          },
          priority: 'high',
          channelId: 'pilates-notifications'
        };

        // Send push notification
        const chunks = expo.chunkPushNotifications([pushMessage]);
        const tickets = [];

        for (const chunk of chunks) {
          const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
        }

        // Check if notification was sent successfully
        let notificationSent = false;
        for (const ticket of tickets) {
          if (ticket.status === 'ok') {
            notificationSent = true;
            console.log(`✅ Notification ${notification.id} sent successfully`);
          } else {
            console.log(`❌ Notification ${notification.id} failed:`, ticket.message);
          }
        }

        // Mark as sent in database
        if (notificationSent) {
          await supabase
            .from('notifications')
            .update({ 
              sent_at: new Date().toISOString(),
              is_read: true // Mark as read since it's been sent
            })
            .eq('id', notification.id);
          
          successCount++;
        } else {
          errorCount++;
        }

      } catch (notificationError) {
        console.error(`❌ Error processing notification ${notification.id}:`, notificationError);
        errorCount++;
      }
    }

    console.log(`✅ Manual notification processing complete: ${successCount} sent, ${errorCount} failed`);

    return res.status(200).json({
      success: true,
      message: `Processed ${pendingNotifications.length} notifications`,
      sent: successCount,
      failed: errorCount,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error in manual notification handler:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
} 