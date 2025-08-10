import { supabase } from '../config/supabase.config';

interface NotificationData {
  user_id: string;
  title: string;
  message: string;
  type: 'subscription_assigned' | 'subscription_updated' | 'subscription_expired';
  metadata?: any;
}

class SupabaseNotificationService {
  async createNotification(data: NotificationData): Promise<void> {
    try {
      console.log(`📱 Creating Supabase notification for user ${data.user_id}: ${data.title}`);

      // Insert notification into Supabase
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: data.user_id,
          title: data.title,
          message: data.message,
          type: 'system', // Use 'system' type since custom types are not in the constraint
          scheduled_for: new Date().toISOString(), // Required field
          metadata: {
            ...data.metadata,
            original_type: data.type // Store the original type in metadata
          },
          is_read: false,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('❌ Error creating notification:', error);
        return;
      }

      console.log('✅ Notification created in Supabase');

      // Send push notification using expo-notifications
      await this.sendPushNotification(data);

    } catch (error) {
      console.error('❌ Error in createNotification:', error);
    }
  }

  async sendPushNotification(data: NotificationData): Promise<void> {
    try {
      // Get user's push token from Supabase
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('push_token')
        .eq('id', data.user_id)
        .single();

      if (userError || !userData?.push_token) {
        console.log(`⚠️ No push token found for user ${data.user_id} - notification not sent to device`);
        return;
      }

      const pushToken = userData.push_token;

      // Check if push token is valid
      if (!this.isExpoPushToken(pushToken)) {
        console.log(`❌ Invalid push token for user ${data.user_id}: ${pushToken}`);
        return;
      }

      // Send push notification using Expo's push notification service
      const message = {
        to: pushToken,
        sound: 'default',
        title: data.title,
        body: data.message,
        data: {
          type: data.type,
          userId: data.user_id,
          ...data.metadata
        },
        priority: 'high',
        channelId: 'subscription-notifications'
      };

      // Check if we're running on web platform
      const isWeb = typeof window !== 'undefined' && window.navigator && window.navigator.userAgent;
      
      if (isWeb) {
        // On web, we can't send push notifications directly due to CORS restrictions
        console.log('🌐 Web platform detected - notification stored in Supabase');
        console.log('📱 Push notification would be sent to:', pushToken);
        console.log('📱 Message:', data.title, '-', data.message);
        return;
      }

      // Use fetch to send to Expo's push service (native platforms only)
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      if (response.ok) {
        console.log('✅ Push notification sent successfully');
      } else {
        console.error('❌ Failed to send push notification:', response.statusText);
      }

    } catch (error) {
      console.error('❌ Error sending push notification:', error);
    }
  }

  // Helper method to validate Expo push tokens
  private isExpoPushToken(token: string): boolean {
    return /^ExponentPushToken\[.*\]$/.test(token) || /^ExpoPushToken\[.*\]$/.test(token);
  }

  async createSubscriptionAssignmentNotification(
    userId: string,
    planName: string,
    assignedBy: string
  ): Promise<void> {
    await this.createNotification({
      user_id: userId,
      title: '🎉 New Subscription Assigned',
      message: `You have been assigned a ${planName} subscription by ${assignedBy}. Check your account for details!`,
      type: 'subscription_assigned',
      metadata: {
        plan_name: planName,
        assigned_by: assignedBy
      }
    });
  }

  async createSubscriptionUpdateNotification(
    userId: string,
    action: 'extended' | 'cancelled' | 'paused' | 'resumed' | 'replaced' | 'queued',
    message: string,
    updatedBy: string
  ): Promise<void> {
    let title = 'Subscription Updated';
    let icon = '📝';
    
    switch (action) {
      case 'extended':
        title = '📅 Subscription Extended';
        icon = '📅';
        break;
      case 'cancelled':
        title = '❌ Subscription Cancelled';
        icon = '❌';
        break;
      case 'paused':
        title = '⏸️ Subscription Paused';
        icon = '⏸️';
        break;
      case 'resumed':
        title = '▶️ Subscription Resumed';
        icon = '▶️';
        break;
      case 'replaced':
        title = '🔄 Subscription Replaced';
        icon = '🔄';
        break;
      case 'queued':
        title = '⏳ Subscription Queued';
        icon = '⏳';
        break;
    }

    await this.createNotification({
      user_id: userId,
      title: title,
      message: `${icon} ${message}`,
      type: 'subscription_updated',
      metadata: {
        action: action,
        updated_by: updatedBy
      }
    });
  }

  async createSubscriptionExpirationNotification(
    userId: string,
    planName: string,
    daysUntilExpiry: number
  ): Promise<void> {
    await this.createNotification({
      user_id: userId,
      title: '⏰ Subscription Expiring Soon',
      message: `Your ${planName} subscription expires in ${daysUntilExpiry} days. Renew now to continue your classes!`,
      type: 'subscription_expired',
      metadata: {
        plan_name: planName,
        days_until_expiry: daysUntilExpiry
      }
    });
  }
}

export const supabaseNotificationService = new SupabaseNotificationService(); 