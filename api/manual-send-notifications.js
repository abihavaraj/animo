// Manual trigger endpoint for immediate notification processing
// This can be called via API when immediate notifications are needed
// Since cron jobs are limited to once daily on free plan

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
    // Only allow POST requests for manual triggers
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed. Use POST to manually trigger notifications.' });
    }

    // Optional: Add basic authentication to prevent abuse
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization required. Include Bearer token in Authorization header.' });
    }

    const token = authHeader.substring(7);
    // You can add your own token validation here
    // For now, we'll accept any Bearer token to keep it simple

    console.log('🔔 Manual notification trigger activated...');
    
    // Get current time
    const now = new Date();
    
    // Get immediate notifications that should be sent now
    const { data: immediateNotifications, error } = await supabase
      .from('notifications')
      .select(`
        *,
        users!inner(name, email, push_token)
      `)
      .eq('is_read', false)
      .lte('scheduled_for', now.toISOString())
      .is('read_at', null)
      .or('metadata->>push_token.not.is.null,users.push_token.not.is.null')
      .order('scheduled_for', { ascending: true })
      .limit(100); // Limit for manual triggers

    if (error) {
      console.error('❌ Error fetching notifications:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!immediateNotifications || immediateNotifications.length === 0) {
      console.log('📭 No immediate notifications to send');
      return res.status(200).json({ 
        success: true, 
        message: 'No immediate notifications to send',
        processed: 0 
      });
    }

    console.log(`📨 Processing ${immediateNotifications.length} immediate notifications...`);

    let successCount = 0;
    let errorCount = 0;

    // Process each notification
    for (const notification of immediateNotifications) {
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
          title: notification.title || '🧘‍♀️ Pilates Studio',
          body: notification.message,
          data: {
            notificationId: notification.id,
            type: notification.type,
            userId: notification.user_id,
            timestamp: now.toISOString(),
            scheduledFor: notification.scheduled_for,
            trigger: 'manual',
            ...notification.metadata
          },
          priority: 'high',
          channelId: 'animo-notifications',
          badge: 1
        };

        console.log(`📱 Sending immediate push message for ${notification.type} notification:`, {
          id: notification.id,
          title: pushMessage.title,
          body: pushMessage.body.substring(0, 50) + '...',
          to: pushToken.substring(0, 20) + '...'
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
            console.log(`✅ Immediate notification ${notification.id} sent successfully`);
          } else {
            console.log(`❌ Immediate notification ${notification.id} failed:`, ticket.message);
          }
        }

        // Mark as sent in database
        if (notificationSent) {
          await supabase
            .from('notifications')
            .update({ 
              read_at: now.toISOString(),
              is_read: true,
              metadata: { ...notification.metadata, processed_at: now.toISOString(), trigger: 'manual' }
            })
            .eq('id', notification.id);
          
          successCount++;
        } else {
          errorCount++;
        }

        // Small delay between notifications
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (notificationError) {
        console.error(`❌ Error processing immediate notification ${notification.id}:`, notificationError);
        errorCount++;
      }
    }

    console.log(`✅ Manual notification processing complete: ${successCount} sent, ${errorCount} failed`);

    return res.status(200).json({
      success: true,
      message: `Manual trigger processed ${immediateNotifications.length} notifications`,
      sent: successCount,
      failed: errorCount,
      total: immediateNotifications.length,
      processedAt: now.toISOString(),
      trigger: 'manual'
    });

  } catch (error) {
    console.error('❌ Error in manual notification handler:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
} 