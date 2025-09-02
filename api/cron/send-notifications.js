// Vercel Edge Function to send push notifications from Supabase
// This runs as a scheduled cron job once daily to process all pending notifications

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
    console.log('🔔 Starting daily notification processing...');
    
    // Only allow GET requests and cron job calls
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Get current time and calculate time ranges
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    console.log(`📅 Processing notifications from ${yesterday.toISOString()} to ${now.toISOString()}`);
    
    // Get ALL notifications that should have been sent (including overdue ones)
    // This handles the fact that we only run once per day now
    const { data: pendingNotifications, error } = await supabase
      .from('notifications')
      .select(`
        *,
        users!inner(name, email, push_token)
      `)
      .eq('is_read', false)
      .lte('scheduled_for', now.toISOString())
      .is('read_at', null)
      .or('metadata->>push_token.not.is.null,users.push_token.not.is.null')
      .order('scheduled_for', { ascending: true }) // Process oldest first
      .limit(500); // Increased limit for daily batch processing

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

    console.log(`📨 Processing ${pendingNotifications.length} notifications in daily batch...`);

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    // Process notifications in chunks to avoid overwhelming the system
    const chunkSize = 50;
    const chunks = [];
    
    for (let i = 0; i < pendingNotifications.length; i += chunkSize) {
      chunks.push(pendingNotifications.slice(i, i + chunkSize));
    }

    console.log(`🔄 Processing in ${chunks.length} chunks of ${chunkSize}`);

    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];
      console.log(`📦 Processing chunk ${chunkIndex + 1}/${chunks.length} (${chunk.length} notifications)`);

      // Process each notification in the chunk
      for (const notification of chunk) {
        try {
          // Get push token from metadata or user record
          const pushToken = notification.metadata?.push_token || notification.users?.push_token;
          
          if (!pushToken) {
            console.log(`⚠️ No push token for notification ${notification.id}`);
            skippedCount++;
            continue;
          }

          // Validate push token
          if (!Expo.isExpoPushToken(pushToken)) {
            console.log(`❌ Invalid push token for notification ${notification.id}: ${pushToken}`);
            skippedCount++;
            continue;
          }

          // Check if notification is too old (more than 7 days) - skip to avoid spam
          const notificationDate = new Date(notification.scheduled_for);
          const daysOld = (now - notificationDate) / (1000 * 60 * 60 * 24);
          
          if (daysOld > 7) {
            console.log(`⏰ Skipping notification ${notification.id} - too old (${daysOld.toFixed(1)} days)`);
            // Mark old notifications as read to avoid reprocessing
            await supabase
              .from('notifications')
              .update({ 
                read_at: now.toISOString(),
                is_read: true,
                metadata: { ...notification.metadata, skipped_reason: 'too_old' }
              })
              .eq('id', notification.id);
            skippedCount++;
            continue;
          }

          // Create push message with enhanced metadata
          const pushMessage = {
            to: pushToken,
            sound: 'default',
            title: notification.title || '🧘‍♀️ Pilates Studio',
            body: notification.message,
            data: {
              notificationId: notification.id,
              type: notification.type,
              userId: notification.user_id,
              timestamp: now.toISOString(),
              scheduledFor: notification.scheduled_for,
              daysOld: daysOld.toFixed(1),
              ...notification.metadata
            },
            priority: 'high',
            channelId: 'animo-notifications',
            badge: 1
          };

          console.log(`📱 Sending push message for ${notification.type} notification:`, {
            id: notification.id,
            title: pushMessage.title,
            body: pushMessage.body.substring(0, 50) + '...',
            to: pushToken.substring(0, 20) + '...',
            daysOld: daysOld.toFixed(1)
          });

          // Send push notification
          const expoChunks = expo.chunkPushNotifications([pushMessage]);
          const tickets = [];

          for (const expoChunk of expoChunks) {
            const ticketChunk = await expo.sendPushNotificationsAsync(expoChunk);
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
                read_at: now.toISOString(),
                is_read: true,
                metadata: { ...notification.metadata, processed_at: now.toISOString() }
              })
              .eq('id', notification.id);
            
            successCount++;
          } else {
            errorCount++;
          }

          // Small delay between notifications to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (notificationError) {
          console.error(`❌ Error processing notification ${notification.id}:`, notificationError);
          errorCount++;
        }
      }

      // Delay between chunks to avoid overwhelming the system
      if (chunkIndex < chunks.length - 1) {
        console.log(`⏳ Waiting 2 seconds before next chunk...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log(`✅ Daily notification processing complete: ${successCount} sent, ${errorCount} failed, ${skippedCount} skipped`);

    return res.status(200).json({
      success: true,
      message: `Daily batch processed ${pendingNotifications.length} notifications`,
      sent: successCount,
      failed: errorCount,
      skipped: skippedCount,
      total: pendingNotifications.length,
      processedAt: now.toISOString()
    });

  } catch (error) {
    console.error('❌ Error in daily notification handler:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}