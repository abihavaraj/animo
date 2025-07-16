const cron = require('node-cron');
const Database = require('../config/database');
const { Expo } = require('expo-server-sdk');

class NotificationScheduler {
  constructor() {
    this.isRunning = false;
    this.expo = new Expo();
  }

  start() {
    if (this.isRunning) {
      console.log('⚠️ Notification scheduler is already running');
      return;
    }

    console.log('🚀 Starting notification scheduler...');
    
    // Run every minute to check for scheduled notifications
    this.task = cron.schedule('* * * * *', async () => {
      await this.processScheduledNotifications();
    }, {
      scheduled: false
    });

    this.task.start();
    this.isRunning = true;
    console.log('✅ Notification scheduler started - checking every minute');
  }

  stop() {
    if (this.task) {
      this.task.stop();
      this.isRunning = false;
      console.log('🛑 Notification scheduler stopped');
    }
  }

  async processScheduledNotifications() {
    try {
      const now = new Date().toISOString();
      
      // Get notifications that should be sent now
      const pendingNotifications = await Database.all(`
        SELECT 
          n.*,
          c.name as class_name,
          c.date as class_date,
          c.time as class_time,
          u.name as user_name,
          u.email as user_email
        FROM notifications n
        LEFT JOIN classes c ON n.class_id = c.id
        LEFT JOIN users u ON n.user_id = u.id
        WHERE n.sent = 0 
        AND n.scheduled_time <= ?
        ORDER BY n.scheduled_time ASC
        LIMIT 50
      `, [now]);

      if (pendingNotifications.length === 0) {
        return; // No notifications to send
      }

      console.log(`📨 Processing ${pendingNotifications.length} scheduled notifications...`);

      for (const notification of pendingNotifications) {
        await this.sendNotification(notification);
      }

      // --- NEW: Process client note reminders ---
      // Find notes with due reminders that haven't been sent
      const dueReminders = await Database.all(`
        SELECT cn.*, u.name as client_name
        FROM client_notes cn
        JOIN users u ON cn.client_id = u.id
        WHERE cn.reminder_at IS NOT NULL
          AND cn.reminder_sent = 0
          AND cn.reminder_at <= ?
        ORDER BY cn.reminder_at ASC
        LIMIT 20
      `, [now]);

      for (const note of dueReminders) {
        // Mark reminder as sent (the recent notifications endpoint will pick it up)
        await Database.run(`
          UPDATE client_notes SET reminder_sent = 1 WHERE id = ?
        `, [note.id]);
        console.log(`🔔 Reminder processed for client note #${note.id} (client: ${note.client_name})`);
      }
      // --- END NEW ---
    } catch (error) {
      console.error('❌ Error processing scheduled notifications:', error);
    }
  }

  async sendNotification(notification) {
    try {
      // Mark as sent first to prevent duplicate sending
      await Database.run(`
        UPDATE notifications 
        SET sent = 1, sent_at = ? 
        WHERE id = ?
      `, [new Date().toISOString(), notification.id]);

      console.log(`📱 SENDING NOTIFICATION:`);
      console.log(`   To: ${notification.user_name} (${notification.user_email})`);
      console.log(`   Type: ${notification.type}`);
      console.log(`   Message: ${notification.message}`);
      console.log(`   Class: ${notification.class_name} - ${notification.class_date} ${notification.class_time}`);

      // Get user's push token from database
      const userPushToken = await Database.get(`
        SELECT push_token FROM users WHERE id = ?
      `, [notification.user_id]);

      if (userPushToken && userPushToken.push_token) {
        const pushToken = userPushToken.push_token;

        // Check if push token is valid
        if (!Expo.isExpoPushToken(pushToken)) {
          console.log(`   ❌ Invalid push token for user ${notification.user_name}: ${pushToken}`);
          return;
        }

        // Create push notification message
        const pushMessage = {
          to: pushToken,
          sound: 'default',
          title: '🧘‍♀️ Pilates Class Reminder',
          body: notification.message,
          data: {
            classId: notification.class_id,
            type: notification.type,
            userId: notification.user_id
          },
          priority: 'high',
          channelId: 'pilates-notifications'
        };

        try {
          // Send push notification
          const chunks = this.expo.chunkPushNotifications([pushMessage]);
          const tickets = [];

          for (const chunk of chunks) {
            const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
            tickets.push(...ticketChunk);
          }

          // Handle tickets
          for (const ticket of tickets) {
            if (ticket.status === 'error') {
              console.log(`   ❌ Push notification error: ${ticket.message}`);
              if (ticket.details && ticket.details.error) {
                console.log(`   📝 Error details: ${ticket.details.error}`);
              }
            } else {
              console.log(`   ✅ Push notification sent successfully! Receipt ID: ${ticket.id}`);
            }
          }

        } catch (pushError) {
          console.log(`   ❌ Failed to send push notification: ${pushError.message}`);
        }

      } else {
        console.log(`   ⚠️ No push token found for user ${notification.user_name} - notification not sent to device`);
      }

      console.log(`   📅 Scheduled: ${notification.scheduled_time}`);
      console.log(`   ⏰ Sent: ${new Date().toISOString()}`);
      console.log('');

    } catch (error) {
      console.error(`❌ Error sending notification ${notification.id}:`, error);
      
      // Mark as failed and revert sent status
      await Database.run(`
        UPDATE notifications 
        SET sent = 0, sent_at = NULL 
        WHERE id = ?
      `, [notification.id]);
    }
  }

  // Get scheduler status
  getStatus() {
    return {
      isRunning: this.isRunning,
      startTime: this.startTime
    };
  }

  // Manual trigger for testing
  async triggerManual() {
    console.log('🧪 Manually triggering notification check...');
    await this.processScheduledNotifications();
  }
}

// Create and export singleton instance
const notificationScheduler = new NotificationScheduler();

module.exports = notificationScheduler; 