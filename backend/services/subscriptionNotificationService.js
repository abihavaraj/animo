const cron = require('node-cron');
const Database = require('../config/database');
const { Expo } = require('expo-server-sdk');

class SubscriptionNotificationService {
  constructor() {
    this.isRunning = false;
    this.expo = new Expo();
  }

  start() {
    if (this.isRunning) {
      console.log('⚠️ Subscription notification service is already running');
      return;
    }

    console.log('🚀 Starting subscription notification service...');
    
    // Run daily at 9 AM to check for expiring subscriptions (but not to expire them - that's automatic now)
    this.dailyTask = cron.schedule('0 9 * * *', async () => {
      await this.checkExpiringSubscriptions();
    }, {
      scheduled: false
    });

    // Run every 5 minutes to send scheduled subscription notifications
    this.notificationTask = cron.schedule('*/5 * * * *', async () => {
      await this.processSubscriptionNotifications();
    }, {
      scheduled: false
    });

    this.dailyTask.start();
    this.notificationTask.start();
    this.isRunning = true;
    console.log('✅ Subscription notification service started');
    console.log('   - Daily expiration check: 9:00 AM');
    console.log('   - Notification processor: Every 5 minutes');
  }

  stop() {
    if (this.dailyTask) {
      this.dailyTask.stop();
    }
    if (this.notificationTask) {
      this.notificationTask.stop();
    }
    this.isRunning = false;
    console.log('🛑 Subscription notification service stopped');
  }

  async checkExpiringSubscriptions() {
    try {
      console.log('🔍 Checking for expiring subscriptions...');
      
      // Get subscriptions expiring in 2 days
      const twoDaysFromNow = new Date();
      twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
      const expiryDate = twoDaysFromNow.toISOString().split('T')[0];
      
      const expiringSubscriptions = await Database.all(`
        SELECT 
          us.id,
          us.user_id,
          us.end_date,
          us.remaining_classes,
          u.name as user_name,
          u.email as user_email,
          sp.name as plan_name,
          sp.monthly_price
        FROM user_subscriptions us
        JOIN users u ON us.user_id = u.id
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE us.status = 'active' 
          AND DATE(us.end_date) = ?
      `, [expiryDate]);

      if (expiringSubscriptions.length === 0) {
        console.log('✅ No subscriptions expiring in 2 days');
        return;
      }

      console.log(`📅 Found ${expiringSubscriptions.length} subscriptions expiring in 2 days`);

      for (const subscription of expiringSubscriptions) {
        await this.scheduleExpirationNotification(subscription);
      }

    } catch (error) {
      console.error('❌ Error checking expiring subscriptions:', error);
    }
  }

  async scheduleExpirationNotification(subscription) {
    try {
      // Check if user has notifications enabled
      const userSettings = await Database.get(`
        SELECT * FROM notification_settings WHERE user_id = ?
      `, [subscription.user_id]);

      const userEnableNotifications = userSettings?.enable_notifications !== 0;
      
      if (!userEnableNotifications) {
        console.log(`🔕 User ${subscription.user_name} has notifications disabled`);
        return;
      }

      // Check if notification already exists for this subscription
      const existingNotification = await Database.get(`
        SELECT id FROM notifications 
        WHERE user_id = ? AND type = 'subscription_expiring' 
          AND message LIKE '%' || ? || '%'
          AND sent = 0
      `, [subscription.user_id, subscription.plan_name]);

      if (existingNotification) {
        console.log(`📱 Expiration notification already scheduled for ${subscription.user_name}`);
        return;
      }

      // Create expiration notification
      const message = `⏰ Your ${subscription.plan_name} subscription expires in 2 days (${new Date(subscription.end_date).toLocaleDateString()}). ${subscription.remaining_classes} classes remaining. Renew now to avoid interruption!`;
      
      const notificationTime = new Date();
      notificationTime.setHours(10, 0, 0, 0); // Send at 10 AM today
      
      await Database.run(`
        INSERT INTO notifications (user_id, type, message, scheduled_time, class_id)
        VALUES (?, 'subscription_expiring', ?, ?, NULL)
      `, [subscription.user_id, message, notificationTime.toISOString()]);

      console.log(`📱 Scheduled expiration notification for ${subscription.user_name} - ${subscription.plan_name}`);

    } catch (error) {
      console.error(`❌ Error scheduling expiration notification for subscription ${subscription.id}:`, error);
    }
  }

  async processSubscriptionNotifications() {
    try {
      const now = new Date().toISOString();
      
      // Get subscription notifications that should be sent now
      const pendingNotifications = await Database.all(`
        SELECT 
          n.*,
          u.name as user_name,
          u.email as user_email
        FROM notifications n
        JOIN users u ON n.user_id = u.id
        WHERE n.sent = 0 
          AND n.scheduled_time <= ?
          AND n.type IN ('subscription_expiring', 'subscription_changed')
        ORDER BY n.scheduled_time ASC
        LIMIT 10
      `, [now]);

      if (pendingNotifications.length === 0) {
        return; // No notifications to send
      }

      console.log(`📨 Processing ${pendingNotifications.length} subscription notifications...`);

      for (const notification of pendingNotifications) {
        await this.sendSubscriptionNotification(notification);
      }

    } catch (error) {
      console.error('❌ Error processing subscription notifications:', error);
    }
  }

  async sendSubscriptionNotification(notification) {
    try {
      // Mark as sent first to prevent duplicate sending
      await Database.run(`
        UPDATE notifications 
        SET sent = 1, sent_at = ? 
        WHERE id = ?
      `, [new Date().toISOString(), notification.id]);

      console.log(`📱 SENDING SUBSCRIPTION NOTIFICATION:`);
      console.log(`   To: ${notification.user_name} (${notification.user_email})`);
      console.log(`   Type: ${notification.type}`);
      console.log(`   Message: ${notification.message}`);

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
          title: notification.type === 'subscription_expiring' ? 
            '⏰ Subscription Expiring Soon' : 
            '📝 Subscription Updated',
          body: notification.message,
          data: {
            type: notification.type,
            userId: notification.user_id,
            notificationId: notification.id
          },
          priority: 'high',
          channelId: 'subscription-notifications'
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
      console.error(`❌ Error sending subscription notification ${notification.id}:`, error);
      
      // Mark as failed and revert sent status
      await Database.run(`
        UPDATE notifications 
        SET sent = 0, sent_at = NULL 
        WHERE id = ?
      `, [notification.id]);
    }
  }

  // Method to create notification when reception makes subscription changes
  async createSubscriptionChangeNotification(userId, changeType, description, performedBy) {
    try {
      // Check if user has notifications enabled
      const userSettings = await Database.get(`
        SELECT * FROM notification_settings WHERE user_id = ?
      `, [userId]);

      const userEnableNotifications = userSettings?.enable_notifications !== 0;
      
      if (!userEnableNotifications) {
        console.log(`🔕 User ${userId} has notifications disabled for subscription changes`);
        return;
      }

      // Get user and admin info
      const user = await Database.get(`SELECT name FROM users WHERE id = ?`, [userId]);
      const admin = await Database.get(`SELECT name, role FROM users WHERE id = ?`, [performedBy]);

      if (!user || !admin) {
        console.log(`❌ User or admin not found for subscription change notification`);
        return;
      }

      // Create notification message based on change type
      let message;
      const adminName = admin.name;
      const adminRole = admin.role;

      switch (changeType) {
        case 'extended':
          message = `📅 Your subscription has been extended by ${adminName} (${adminRole}). ${description}`;
          break;
        case 'paused':
          message = `⏸️ Your subscription has been paused by ${adminName} (${adminRole}). ${description}`;
          break;
        case 'resumed':
          message = `▶️ Your subscription has been resumed by ${adminName} (${adminRole}). ${description}`;
          break;
        case 'cancelled':
          message = `❌ Your subscription has been cancelled by ${adminName} (${adminRole}). ${description}`;
          break;
        case 'assigned':
          message = `🎉 A new subscription has been assigned to you by ${adminName} (${adminRole}). ${description}`;
          break;
        case 'replaced':
          message = `🔄 Your subscription has been replaced by ${adminName} (${adminRole}). ${description}`;
          break;
        default:
          message = `📝 Your subscription has been updated by ${adminName} (${adminRole}). ${description}`;
      }

      // Schedule notification to be sent immediately
      const notificationTime = new Date().toISOString();
      
      await Database.run(`
        INSERT INTO notifications (user_id, type, message, scheduled_time, class_id)
        VALUES (?, 'subscription_changed', ?, ?, NULL)
      `, [userId, message, notificationTime]);

      console.log(`📱 Scheduled subscription change notification for user ${userId}: ${changeType}`);

    } catch (error) {
      console.error(`❌ Error creating subscription change notification:`, error);
    }
  }

  // Manual trigger for testing
  async triggerManual() {
    console.log('🧪 Manually triggering subscription notification check...');
    await this.checkExpiringSubscriptions();
    await this.processSubscriptionNotifications();
  }
}

// Create and export singleton instance
const subscriptionNotificationService = new SubscriptionNotificationService();

module.exports = subscriptionNotificationService; 