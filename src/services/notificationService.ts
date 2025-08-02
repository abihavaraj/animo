import { supabase } from '../config/supabase.config';

// Define ApiResponse locally to avoid import issues
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

import { BackendClass } from './classService';

export interface NotificationSettings {
  enableNotifications: boolean;
  defaultReminderMinutes: number;
  enablePushNotifications: boolean;
  enableEmailNotifications: boolean;
}

export interface ClassNotification {
  id: number;
  classId: number;
  userId: number;
  type: 'reminder' | 'cancellation' | 'update';
  scheduledTime: string;
  sent: boolean;
  sentAt?: string;
  message: string;
  createdAt: string;
}

export interface NotificationRequest {
  classId: number;
  type: 'reminder' | 'cancellation' | 'update';
  message: string;
  scheduledTime?: string;
  targetUsers?: number[]; // If empty, sends to all enrolled users
}

class NotificationService {
  // Schedule notifications for a class
  async scheduleClassNotifications(
    classData: BackendClass, 
    reminderMinutes: number = 5
  ): Promise<ApiResponse<any>> {
    try {
      // Get all enrolled users for this class
      const { data: bookings } = await supabase
        .from('bookings')
        .select('user_id')
        .eq('class_id', classData.id)
        .eq('status', 'confirmed');
      
      if (!bookings || bookings.length === 0) {
        return { success: true, data: [] };
      }

      // Calculate notification time
      const classDateTime = new Date(`${classData.date}T${classData.time}`);
      const notificationTime = new Date(classDateTime.getTime() - (reminderMinutes * 60 * 1000));
      
      // Create notifications for each enrolled user using correct Supabase schema
      const notifications = bookings.map(booking => ({
        user_id: booking.user_id,
        type: 'class_reminder',
        title: `Class Reminder: ${classData.name}`,
        message: `Your ${classData.name} class with ${classData.instructor_name} starts in ${reminderMinutes} minutes!`,
        scheduled_for: notificationTime.toISOString(),
        metadata: {
          class_id: classData.id,
          class_name: classData.name,
          reminder_minutes: reminderMinutes
        },
        is_read: false
      }));

      const { data, error } = await supabase
        .from('notifications')
        .insert(notifications)
        .select();
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to schedule notifications'
      };
    }
  }

  // Send immediate notification
  async sendClassNotification(
    classId: number | string,
    type: 'cancellation' | 'update',
    message: string,
    targetUsers?: number[]
  ): Promise<ApiResponse<any>> {
    try {
      console.log(`📢 [notificationService] Sending ${type} notification for class ${classId}:`, message);
      // Get all enrolled users if no specific targets provided
      if (!targetUsers || targetUsers.length === 0) {
        const { data: bookings } = await supabase
          .from('bookings')
          .select('user_id')
          .eq('class_id', classId)
          .eq('status', 'confirmed');
        
        targetUsers = bookings?.map(b => Number(b.user_id)) || [];
      }

      if (targetUsers.length === 0) {
        return { success: true, data: [] };
      }

      // Filter users based on their notification preferences
      const enabledUsers = [];
      
      for (const userId of targetUsers) {
        // Check user notification settings
        const { data: userSettings } = await supabase
          .from('notification_settings')
          .select('enable_notifications, enable_push_notifications')
          .eq('user_id', userId)
          .single();
        
        // Default to enabled if no settings found, or if both general and push notifications are enabled
        const shouldSendNotification = !userSettings || 
          (userSettings.enable_notifications && userSettings.enable_push_notifications);
        
        if (shouldSendNotification) {
          enabledUsers.push(userId);
          console.log(`✅ [notificationService] User ${userId} will receive notification (settings allow)`);
        } else {
          console.log(`❌ [notificationService] User ${userId} will NOT receive notification (settings disabled)`);
        }
      }

      if (enabledUsers.length === 0) {
        console.log(`❌ [notificationService] No users will receive notifications (all disabled settings)`);
        return { success: true, data: [] };
      }
      
      console.log(`📢 [notificationService] Creating notifications for ${enabledUsers.length} user(s)`);

      // Create notification for each user with notifications enabled
      const notifications = enabledUsers.map(userId => ({
        user_id: String(userId), // Ensure it's a string for Supabase
        type: `class_${type}`,
        title: type === 'update' ? 'Class Assignment' : 'Class Cancellation',
        message,
        scheduled_for: new Date().toISOString(),
        metadata: {
          class_id: String(classId),
          notification_type: type
        },
        is_read: false,
        created_at: new Date().toISOString()
      }));

      // Try to create notifications by inserting one by one (sometimes RLS allows individual inserts)
      const createdNotifications = [];
      const failedNotifications = [];
      
      for (const notification of notifications) {
        try {
          const { data, error } = await supabase
            .from('notifications')
            .insert(notification)
            .select()
            .single();
          
          if (error) {
            console.error(`❌ [notificationService] Failed to create notification for user ${notification.user_id}:`, error);
            failedNotifications.push({ notification, error });
          } else {
            console.log(`✅ [notificationService] Successfully created notification for user ${notification.user_id}`);
            createdNotifications.push(data);
            
            // Send actual push notification to the user's device
            await this.sendPushNotificationToUser(notification.user_id, notification.title, notification.message);
          }
        } catch (insertError) {
          console.error(`❌ [notificationService] Error inserting notification for user ${notification.user_id}:`, insertError);
          failedNotifications.push({ notification, error: insertError });
        }
      }
      
      if (createdNotifications.length > 0) {
        console.log(`✅ [notificationService] Successfully created ${createdNotifications.length}/${notifications.length} notifications`);
      }
      
      if (failedNotifications.length > 0) {
        console.log(`⚠️ [notificationService] Failed to create ${failedNotifications.length}/${notifications.length} notifications (RLS restrictions)`);
        console.log(`📝 [notificationService] Failed notifications:`, 
          failedNotifications.map(f => `${f.notification.title}: ${f.notification.message}`));
      }
      
      // Return success if at least some notifications were created, or if main action completed
      return { 
        success: true, 
        data: createdNotifications,
        warning: failedNotifications.length > 0 ? `${failedNotifications.length} notifications failed due to permissions` : undefined
      };
    } catch (error) {
      console.error(`❌ [notificationService] Error in sendClassNotification:`, error);
      return { success: false, error: 'Failed to send notification' };
    }
  }

  // Send push notification to a specific user
  private async sendPushNotificationToUser(userId: string, title: string, message: string): Promise<void> {
    try {
      // Get user's push token from the database
      const { data: user, error } = await supabase
        .from('users')
        .select('push_token')
        .eq('id', userId)
        .single();

      if (error || !user?.push_token) {
        console.log(`⚠️ [notificationService] No push token found for user ${userId}`);
        return;
      }

      // Send push notification using Expo's API
      const pushMessage = {
        to: user.push_token,
        title: title,
        body: message,
        sound: 'default',
        badge: 1,
        data: {
          userId: userId,
          type: 'class_notification'
        }
      };

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pushMessage),
      });

      if (response.ok) {
        console.log(`📱 [notificationService] Push notification sent to user ${userId}`);
      } else {
        const errorText = await response.text();
        console.error(`❌ [notificationService] Failed to send push notification:`, errorText);
      }
    } catch (error) {
      console.error(`❌ [notificationService] Error sending push notification to user ${userId}:`, error);
    }
  }

  // Cancel scheduled notifications for a class
  async cancelClassNotifications(classId: number): Promise<ApiResponse<any>> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('class_id', classId)
        .eq('status', 'scheduled');
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to cancel notifications' };
    }
  }

  // Get notification settings FROM THE USERS TABLE
  async getNotificationSettings(): Promise<ApiResponse<NotificationSettings>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }
      
      const { data, error } = await supabase
        .from('users')
        .select('enable_notifications, default_reminder_minutes, enable_email_notifications')
        .eq('id', user.id)
        .single();
      
      if (error) {
        // If no row exists, we can treat it as default settings
        if (error.code === 'PGRST116') {
            return { success: true, data: {
                enableNotifications: true,
                defaultReminderMinutes: 15,
                enablePushNotifications: true, // Assuming this maps to enable_notifications
                enableEmailNotifications: true
            }};
        }
        return { success: false, error: error.message };
      }
      
      // Map database columns to the interface
      return { 
          success: true, 
          data: {
              enableNotifications: data.enable_notifications,
              defaultReminderMinutes: data.default_reminder_minutes,
              enablePushNotifications: data.enable_notifications, // Push is the main notification type
              enableEmailNotifications: data.enable_email_notifications
          }
      };
    } catch (error) {
      return { success: false, error: 'Failed to fetch notification settings' };
    }
  }

  // Update notification settings ON THE USERS TABLE
  async updateNotificationSettings(settings: Partial<NotificationSettings>): Promise<ApiResponse<NotificationSettings>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }
      
      // Prepare the data for the users table
      const updateData = {
          enable_notifications: settings.enableNotifications,
          default_reminder_minutes: settings.defaultReminderMinutes,
          enable_email_notifications: settings.enableEmailNotifications,
          updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id)
        .select('enable_notifications, default_reminder_minutes, enable_email_notifications')
        .single();
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      // Map the response back to the settings interface
      return { 
          success: true, 
          data: {
              enableNotifications: data.enable_notifications,
              defaultReminderMinutes: data.default_reminder_minutes,
              enablePushNotifications: data.enable_notifications,
              enableEmailNotifications: data.enable_email_notifications
          } 
      };
    } catch (error) {
      return { success: false, error: 'Failed to update notification settings' };
    }
  }

  // Get user notifications
  async getUserNotifications(userId: number): Promise<ApiResponse<ClassNotification[]>> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          classes (name, date, time, instructor_name)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true, data: data || [] };
    } catch (error) {
      return { success: false, error: 'Failed to get user notifications' };
    }
  }

  // Mark notification as read
  async markNotificationAsRead(notificationId: number): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          read: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', notificationId);
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to mark notification as read' };
    }
  }

  // Get notification statistics
  async getNotificationStats(classId?: number): Promise<ApiResponse<any>> {
    try {
      let query = supabase
        .from('notifications')
        .select('*');
      
      if (classId) {
        query = query.eq('class_id', classId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      const stats = {
        total: data?.length || 0,
        sent: data?.filter(n => n.status === 'sent').length || 0,
        scheduled: data?.filter(n => n.status === 'scheduled').length || 0,
        cancelled: data?.filter(n => n.status === 'cancelled').length || 0
      };
      
      return { success: true, data: stats };
    } catch (error) {
      return { success: false, error: 'Failed to get notification stats' };
    }
  }

  // Send test notification
  async sendTestNotification(userId: number, message: string): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type: 'test',
          message,
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true, data };
    } catch (error) {
      return { success: false, error: 'Failed to send test notification' };
    }
  }

  // Helper method to format notification messages
  formatClassReminderMessage(classData: BackendClass, minutes: number): string {
    return `🧘‍♀️ Class Reminder: "${classData.name}" with ${classData.instructor_name} starts in ${minutes} minutes at ${this.formatTime(classData.time)}. See you there!`;
  }

  formatClassCancellationMessage(classData: BackendClass): string {
    return `❌ Class Cancelled: "${classData.name}" scheduled for ${new Date(classData.date).toLocaleDateString()} at ${this.formatTime(classData.time)} has been cancelled. We apologize for any inconvenience.`;
  }

  formatClassUpdateMessage(classData: BackendClass): string {
    return `📝 Class Updated: "${classData.name}" on ${new Date(classData.date).toLocaleDateString()} has been updated. Please check the latest details in the app.`;
  }

  private formatTime(time: string): string {
    try {
      return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return time;
    }
  }

  // Send notification when a class becomes full
  async sendClassFullNotification(classId: number, instructorId?: string): Promise<ApiResponse<any>> {
    try {
      if (!instructorId) {
        return { success: false, error: 'Instructor ID required' };
      }

      // Get class details
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select(`
          *,
          users!classes_instructor_id_fkey (name, push_token)
        `)
        .eq('id', classId)
        .single();

      if (classError || !classData) {
        return { success: false, error: 'Class not found' };
      }

      // Get enrollment count
      const { data: enrollments, error: enrollmentError } = await supabase
        .from('bookings')
        .select('id')
        .eq('class_id', classId)
        .eq('status', 'confirmed');

      const enrollmentCount = enrollments?.length || 0;

      // Create notification record
      await supabase.from('notifications').insert({
        user_id: instructorId,
        type: 'class_full',
        title: '🎉 Class Full!',
        message: `Your class "${classData.name}" is now full with ${enrollmentCount}/${classData.capacity} students enrolled.`,
        data: {
          classId: classId,
          className: classData.name,
          date: classData.date,
          time: classData.time,
          enrollmentCount: enrollmentCount,
          capacity: classData.capacity
        },
        created_at: new Date().toISOString()
      });

      // Send push notification if instructor has push token
      const instructor = classData.users;
      if (instructor?.push_token) {
        await this.sendPushNotification(instructor.push_token, {
          title: '🎉 Class Full!',
          body: `Your class "${classData.name}" is now fully booked!`,
          data: {
            type: 'class_full',
            classId: classId.toString(),
            className: classData.name
          }
        });
      }

      return { success: true, data: { notificationSent: true } };
    } catch (error) {
      console.error('Failed to send class full notification:', error);
      return { success: false, error: 'Failed to send notification' };
    }
  }

  // Helper method to send push notifications
  private async sendPushNotification(pushToken: string, notification: any): Promise<void> {
    try {
      const message = {
        to: pushToken,
        sound: 'default',
        title: notification.title,
        body: notification.body,
        data: notification.data,
      };

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        console.error('Failed to send push notification:', response.statusText);
      }
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  }
}

export const notificationService = new NotificationService(); 