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
  targetUsers?: (number | string)[]; // If empty, sends to all enrolled users - supports both number IDs and UUID strings
}

class NotificationService {
  private isInitialized: boolean = false;

  // Helper to ensure notification settings exist for a user
  private async ensureNotificationSettings(userId: string, userRole: 'instructor' | 'client' = 'client'): Promise<any> {
    try {
      const { data: existing, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        return existing;
      }

      if (error && error.code !== 'PGRST116') {
        console.error(`❌ [ensureNotificationSettings] Error checking settings for ${userId}:`, error);
        return null;
      }

      // Create default settings based on user role
      const defaultSettings = {
        user_id: userId,
        enable_notifications: true,
        enable_push_notifications: true,
        enable_email_notifications: false,
        default_reminder_minutes: 15,
        class_full_notifications: userRole === 'instructor' ? true : false,
        new_enrollment_notifications: userRole === 'instructor' ? true : false,
        class_cancellation_notifications: true,
        general_reminders: true,
      };

      const { data: newSettings, error: insertError } = await supabase
        .from('notification_settings')
        .insert(defaultSettings)
        .select('*')
        .single();

      if (insertError) {
        console.error(`❌ [ensureNotificationSettings] Failed to create settings for ${userId}:`, insertError);
        return null;
      }

      return newSettings;
    } catch (error) {
      console.error(`❌ [ensureNotificationSettings] Unexpected error for ${userId}:`, error);
      return null;
    }
  }
  
  // Public method to ensure notification settings exist for a user
  async ensureUserNotificationSettings(userId: string, userRole: 'instructor' | 'client' = 'client'): Promise<any> {
    return await this.ensureNotificationSettings(userId, userRole);
  }

  // Initialize notification service for the current platform
  async initialize(): Promise<void> {
    if (this.isInitialized) {
              // Already initialized
      return;
    }
    
    try {
              // Initializing notification service
      
      // Enhanced platform detection
      const isWeb = typeof window !== 'undefined' && window.navigator && window.navigator.userAgent;
      const isReactNative = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';
      const isDevelopment = __DEV__;
      
              // Platform detection completed
      
      if (isWeb) {
        // Web platform detected
      } else {
        // Native platform detected
        
        // Enhanced development notification support
        if (isDevelopment) {
          // Development mode enabled
        }
      }
      
      this.isInitialized = true;
              // Notification service initialized successfully
      
    } catch (error) {
      console.error('❌ [notificationService] Failed to initialize:', error);
      // Don't throw - notification failures shouldn't crash the app
    }
  }

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
    type: 'cancellation' | 'update' | 'waitlist_promotion',
    message: string,
    targetUsers?: (number | string)[]
  ): Promise<ApiResponse<any>> {
    try {

      // Get all enrolled users if no specific targets provided
      if (!targetUsers || targetUsers.length === 0) {
        const { data: bookings } = await supabase
          .from('bookings')
          .select('user_id')
          .eq('class_id', classId)
          .eq('status', 'confirmed');
        
        targetUsers = bookings?.map(b => String(b.user_id)) || [];
      }

      if (targetUsers.length === 0) {
        return { success: true, data: [] };
      }

      // Filter users based on their notification preferences
      const enabledUsers = [];
      
      for (const userId of targetUsers) {
        // Ensure userId is a string for UUID queries
        const userIdString = String(userId);
        
        // Check user notification settings
        const { data: userSettings } = await supabase
          .from('notification_settings')
          .select('enable_notifications')
          .eq('user_id', userIdString)
          .single();
        
        // Default to enabled if no settings found, or if notifications are enabled
        const shouldSendNotification = !userSettings || (userSettings.enable_notifications ?? true);
        
        if (shouldSendNotification) {
          enabledUsers.push(userIdString);
    
        } else {
          // User has notifications disabled
        }
      }

      if (enabledUsers.length === 0) {
        console.log(`❌ [notificationService] No users will receive notifications (all disabled settings)`);
        return { success: true, data: [] };
      }
      
      console.log(`📢 [notificationService] Creating notifications for ${enabledUsers.length} user(s)`);

      // Create notification for each user with notifications enabled
      const notifications = enabledUsers.map(userId => ({
        user_id: userId, // Already ensured to be string above
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
  
      }
      
      if (failedNotifications.length > 0) {
        console.log(`⚠️ [notificationService] Failed to create ${failedNotifications.length}/${notifications.length} notifications (RLS restrictions)`);
        console.log(`📝 [notificationService] Failed notifications:`, 
          failedNotifications.map(f => `${f.notification.title}: ${f.notification.message}`));
      }
      
      // Return success if at least some notifications were created, or if main action completed
      return { 
        success: true, 
        data: {
          created: createdNotifications,
          failedCount: failedNotifications.length
        }
      };
    } catch (error) {
      console.error(`❌ [notificationService] Error in sendClassNotification:`, error);
      return { success: false, error: 'Failed to send notification' };
    }
  }

  // Send push notification to a specific user
  async sendPushNotificationToUser(userId: string, title: string, message: string): Promise<void> {
    try {
      // Get user's push token from the database
      const { data: user, error } = await supabase
        .from('users')
        .select('push_token')
        .eq('id', userId)
        .single();

      if (error || !user?.push_token) {
        console.log(`⚠️ [notificationService] No push token found for user ${userId}`);
        
        // Development fallback: Log notification details for debugging
        if (__DEV__) {
          console.log(`🔧 [notificationService] Development mode: Would send notification "${title}: ${message}" to user ${userId}`);
          console.log(`🔧 [notificationService] Development mode: User has no push token, notification stored in database`);
        }
        return;
      }

      // Enhanced platform detection for better cross-platform support
      const isWeb = typeof window !== 'undefined' && window.navigator && window.navigator.userAgent;
      const isReactNative = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';
      const isExpoGo = typeof window === 'undefined' && typeof global !== 'undefined';
      
      console.log(`🔍 [notificationService] Platform detection - Web: ${isWeb}, RN: ${isReactNative}, Expo: ${isExpoGo}`);
      
      if (isWeb) {
        // On web, we can't send push notifications directly due to CORS restrictions
        // The notification is already stored in Supabase for cron job processing
        console.log(`🌐 [notificationService] Web platform detected - notification stored in Supabase for user ${userId}`);
        console.log(`📱 [notificationService] Push notification will be sent via cron job`);
        console.log(`📱 [notificationService] Message: ${title} - ${message}`);
        return;
      }

      // Send push notification using Expo's API (native platforms only)
      console.log(`📱 [notificationService] Sending push notification to user ${userId}`);
      
      const pushMessage = {
        to: user.push_token,
        title: title,
        body: message,
        sound: 'default',
        badge: 1,
        priority: 'high',
        data: {
          userId: userId,
          type: 'class_notification',
          timestamp: new Date().toISOString()
        }
      };

      // Enhanced error handling for production
      console.log(`📱 [notificationService] Sending push message:`, pushMessage);
      
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(pushMessage),
      });
      
      if (response.ok) {
        const result = await response.json();
  
        console.log(`📱 [notificationService] Response:`, result);
        
        // Log success for production debugging
        if (result.data?.status === 'ok') {
          console.log(`🎉 [notificationService] Push notification delivered successfully`);
        } else if (result.data?.status === 'error') {
          console.error(`❌ [notificationService] Push notification error:`, result.data?.message);
        }
        
        // Log any warnings from Expo's push service
        if (result.data && result.data[0] && result.data[0].status === 'error') {
          console.warn(`⚠️ [notificationService] Push notification warning:`, result.data[0].message);
        }
      } else {
        const errorText = await response.text();
        console.error(`❌ [notificationService] Failed to send push notification (HTTP ${response.status}):`, errorText);
        
        // For production builds, don't throw errors that could crash the app
        if (__DEV__) {
          throw new Error(`Push notification failed: ${errorText}`);
        }
      }
    } catch (error) {
      console.error(`❌ [notificationService] Error sending push notification to user ${userId}:`, error);
    }
  }

  // Send bulk push notifications (for multiple users efficiently)
  async sendBulkPushNotifications(tokens: string[], title: string, message: string, data?: any): Promise<boolean> {
    try {
      if (tokens.length === 0) {
        console.log(`⚠️ [notificationService] No tokens provided for bulk notification`);
        return false;
      }

      // Skip web platform for push notifications
      const isWeb = typeof window !== 'undefined' && window.navigator && window.navigator.userAgent;
      if (isWeb) {
        console.log(`🌐 [notificationService] Web platform - skipping push notifications`);
        return false;
      }

      // Split into batches of 100 (Expo's limit)
      const batchSize = 100;
      const batches = [];
      for (let i = 0; i < tokens.length; i += batchSize) {
        batches.push(tokens.slice(i, i + batchSize));
      }

      console.log(`📱 [notificationService] Sending ${tokens.length} notifications in ${batches.length} batches`);

      let successCount = 0;
      let failureCount = 0;

      for (const [batchIndex, batch] of batches.entries()) {
        try {
          const messages = batch.map(token => ({
            to: token,
            title: title,
            body: message,
            sound: 'default',
            badge: 1,
            priority: 'high' as const,
            data: {
              ...data,
              timestamp: new Date().toISOString()
            }
          }));

          console.log(`📱 [notificationService] Sending batch ${batchIndex + 1}/${batches.length} with ${batch.length} notifications`);

          const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify(messages),
          });

          if (response.ok) {
            const result = await response.json();
      
            
            // Count successes and failures
            if (result.data && Array.isArray(result.data)) {
              result.data.forEach((res: any) => {
                if (res.status === 'ok') {
                  successCount++;
                } else {
                  failureCount++;
                  if (res.message) {
                    console.warn(`⚠️ [notificationService] Token failed:`, res.message);
                  }
                }
              });
            } else {
              successCount += batch.length;
            }
          } else {
            failureCount += batch.length;
            console.error(`❌ [notificationService] Batch ${batchIndex + 1} failed with status ${response.status}`);
          }

          // Small delay between batches to avoid rate limiting
          if (batchIndex < batches.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (batchError) {
          failureCount += batch.length;
          console.error(`❌ [notificationService] Exception in batch ${batchIndex + 1}:`, batchError);
        }
      }

      console.log(`📊 [notificationService] Bulk notification complete: ${successCount} success, ${failureCount} failed`);
      return successCount > 0;

    } catch (error) {
      console.error(`❌ [notificationService] Exception in sendBulkPushNotifications:`, error);
      return false;
    }
  }

  // Send notification to multiple users at once (for 500+ users)
  async sendNotificationToMultipleUsers(userIds: string[], title: string, message: string): Promise<void> {
    try {
      if (userIds.length === 0) return;

      console.log(`📱 [notificationService] Sending notification to ${userIds.length} users`);

      // Get all push tokens for these users
      const { data: users, error } = await supabase
        .from('users')
        .select('push_token')
        .in('id', userIds)
        .not('push_token', 'is', null);

      if (error) {
        console.error(`❌ [notificationService] Failed to get user tokens:`, error);
        return;
      }

      const tokens = users?.map(u => u.push_token).filter(Boolean) || [];
      
      if (tokens.length > 0) {
        await this.sendBulkPushNotifications(tokens, title, message, {
          type: 'bulk_notification',
          userCount: userIds.length
        });
      } else {
        console.log(`⚠️ [notificationService] No valid push tokens found for ${userIds.length} users`);
      }
    } catch (error) {
      console.error(`❌ [notificationService] Exception in sendNotificationToMultipleUsers:`, error);
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

  // Get notification settings FROM THE NOTIFICATION_SETTINGS TABLE
  async getNotificationSettings(): Promise<ApiResponse<NotificationSettings>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }
      
      const { data, error } = await supabase
        .from('notification_settings')
        .select('enable_notifications, default_reminder_minutes')
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        // If no row exists, create default settings
        if (error.code === 'PGRST116') {
          const defaultSettings = {
            enableNotifications: true,
            defaultReminderMinutes: 15
          };
          
          // Create default notification settings record
          const { error: insertError } = await supabase
            .from('notification_settings')
            .insert({
              user_id: user.id,
              enable_notifications: true,
              default_reminder_minutes: 15
            });
          
          if (insertError) {
            console.error('Failed to create default notification settings:', insertError);
          }
          
          return { success: true, data: defaultSettings };
        }
        return { success: false, error: error.message };
      }
      
      // Map database columns to the interface
      return { 
          success: true, 
          data: {
              enableNotifications: data.enable_notifications,
              defaultReminderMinutes: data.default_reminder_minutes
          }
      };
    } catch (error) {
      return { success: false, error: 'Failed to fetch notification settings' };
    }
  }

  // Update notification settings ON THE NOTIFICATION_SETTINGS TABLE
  async updateNotificationSettings(settings: Partial<NotificationSettings>): Promise<ApiResponse<NotificationSettings>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }
      
      // Prepare the data for the notification_settings table
      const updateData = {
          enable_notifications: settings.enableNotifications,
          default_reminder_minutes: settings.defaultReminderMinutes,
          updated_at: new Date().toISOString()
      };

      // Try to update existing record first
      const { data, error } = await supabase
        .from('notification_settings')
        .update(updateData)
        .eq('user_id', user.id)
        .select('enable_notifications, default_reminder_minutes')
        .single();
      
      if (error) {
        // If update failed because no record exists, create a new one
        if (error.code === 'PGRST116') {
          const { data: insertData, error: insertError } = await supabase
            .from('notification_settings')
            .insert({
              user_id: user.id,
              ...updateData
            })
            .select('enable_notifications, default_reminder_minutes')
            .single();
          
          if (insertError) {
            return { success: false, error: insertError.message };
          }
          
          return { 
            success: true, 
            data: {
              enableNotifications: insertData.enable_notifications,
              defaultReminderMinutes: insertData.default_reminder_minutes
            } 
          };
        }
        return { success: false, error: error.message };
      }
      
      // Map the response back to the settings interface
      return { 
          success: true, 
          data: {
              enableNotifications: data.enable_notifications,
              defaultReminderMinutes: data.default_reminder_minutes
          } 
      };
    } catch (error) {
      return { success: false, error: 'Failed to update notification settings' };
    }
  }

  // Get user notifications
  async getUserNotifications(userId: number | string, options?: { limit?: number }): Promise<ApiResponse<ClassNotification[]>> {
    try {

      
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      // Apply limit if provided
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error(`❌ [notificationService] Error loading notifications:`, error);
        return { success: false, error: error.message };
      }
      

      return { success: true, data: data || [] };
    } catch (error) {
      console.error(`❌ [notificationService] Exception in getUserNotifications:`, error);
      return { success: false, error: 'Failed to get user notifications' };
    }
  }

  // Mark notification as read
  async markNotificationAsRead(notificationId: number): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true,
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
    // Check if class has passed to determine refund message
    const classStartDateTime = new Date(`${classData.date}T${classData.time}`);
    const now = new Date();
    const classHasPassed = classStartDateTime <= now;
    
    const refundMessage = classHasPassed 
      ? ' Since the class had already started, no credits will be refunded.'
      : ' Your class credit has been automatically refunded to your account.';
    
    return `❌ Class Cancelled: "${classData.name}" scheduled for ${new Date(classData.date).toLocaleDateString()} at ${this.formatTime(classData.time)} has been cancelled.${refundMessage} We apologize for any inconvenience.`;
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
  async sendClassFullNotification(classId: number | string, instructorId?: string): Promise<ApiResponse<any>> {
    try {
      if (!instructorId) {
        return { success: false, error: 'Instructor ID required' };
      }

      console.log(`🎉 [notificationService] Sending class full notification for class ${classId} to instructor ${instructorId}`);

      // Ensure instructor has notification settings and check preferences
      const instructorPrefs = await this.ensureNotificationSettings(instructorId, 'instructor');
      
      if (!instructorPrefs) {
        console.error(`❌ [notificationService] Could not get/create notification settings for instructor ${instructorId}`);
        // Default to allowing notifications if we can't check settings
      } else {
        const canNotifyInstructor = (
          (instructorPrefs.enable_notifications ?? true) &&
          (instructorPrefs.enable_push_notifications ?? true) &&
          (instructorPrefs.class_full_notifications ?? true)
        );

        console.log(`📱 [notificationService] Instructor notification check:`, {
          instructorId,
          preferences: {
            enable_notifications: instructorPrefs.enable_notifications,
            enable_push_notifications: instructorPrefs.enable_push_notifications,
            class_full_notifications: instructorPrefs.class_full_notifications
          },
          canNotify: canNotifyInstructor
        });

        if (!canNotifyInstructor) {
          console.log(`❌ [notificationService] Instructor ${instructorId} has disabled class full notifications`);
          return { success: true, data: { notificationSent: false } };
        }
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
        console.error(`❌ [notificationService] Class not found:`, classError);
        return { success: false, error: 'Class not found' };
      }

      // Get enrollment count
      const { data: enrollments, error: enrollmentError } = await supabase
        .from('bookings')
        .select('id')
        .eq('class_id', classId)
        .eq('status', 'confirmed');

      const enrollmentCount = enrollments?.length || 0;

      console.log(`📊 [notificationService] Class "${classData.name}" enrollment: ${enrollmentCount}/${classData.capacity}`);

      // Create notification record with proper scheduling for immediate delivery
      const { data: notificationData, error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: instructorId,
          type: 'class_full',
          title: '🎉 Class Full!',
          message: `Your class "${classData.name}" is now full with ${enrollmentCount}/${classData.capacity} students enrolled.`,
          scheduled_for: new Date().toISOString(), // Schedule for immediate delivery
          metadata: {
            type: 'class_full',
            classId: classId.toString(),
            className: classData.name,
            date: classData.date,
            time: classData.time,
            enrollmentCount: enrollmentCount,
            capacity: classData.capacity,
            push_token: classData.users?.push_token // Include push token in metadata for cron job
          },
          is_read: false,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (notificationError) {
        console.error(`❌ [notificationService] Failed to create notification record:`, notificationError);
        return { success: false, error: 'Failed to create notification' };
      }



      // Send immediate push notification for real-time delivery
      const instructor = classData.users;
      if (instructor?.push_token) {
        console.log(`📱 [notificationService] Sending immediate push notification to instructor`);
        
        try {
          await this.sendPushNotificationToUser(
            instructorId,
            '🎉 Class Full!',
            `Your class "${classData.name}" is now fully booked!`
          );
    
        } catch (pushError) {
          console.error(`❌ [notificationService] Failed to send immediate push notification:`, pushError);
          // Don't fail the entire operation if push fails - cron job will retry
        }
      } else {
        console.log(`⚠️ [notificationService] No push token found for instructor ${instructorId} - will rely on cron job`);
      }

      return { success: true, data: { notificationSent: true, notificationId: notificationData.id } };
    } catch (error) {
      console.error('❌ [notificationService] Failed to send class full notification:', error);
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

  /**
   * Send cancellation notification to instructor
   */
  async sendInstructorCancellationNotification(
    instructorId: string, 
    classId: string, 
    studentDetails: any
  ): Promise<void> {
    try {
      // Check instructor notification preferences for cancellations
      const { data: settings, error: settingsError } = await supabase
        .from('notification_settings')
        .select('class_cancellation_notifications, enable_notifications, enable_push_notifications')
        .eq('user_id', instructorId)
        .single();

      // For cancellation notifications, default is true - send unless explicitly disabled
      // If there's an error reading settings (e.g., RLS issues), default to sending the notification
      const shouldSend = !settingsError ? 
        (settings?.enable_notifications && 
         settings?.enable_push_notifications && 
         (settings?.class_cancellation_notifications ?? true)) :
        true; // Default to sending if we can't read settings

      console.log(`📧 [NOTIFICATION] Instructor cancellation notification check:`, {
        instructorId,
        settingsError: !!settingsError,
        settingValue: settings?.class_cancellation_notifications ?? true,
        willSend: shouldSend,
        reason: settingsError ? 'using_default_due_to_settings_error' : 'using_preference_value'
      });

      if (!shouldSend) {
        console.log('📧 [NOTIFICATION] Instructor cancellation notification skipped - disabled by preference');
        return;
      }

      // Get class details
      const { data: classData } = await supabase
        .from('classes')
        .select('name, date, time')
        .eq('id', classId)
        .single();

      const notificationMessage = `${studentDetails?.name || 'A student'} cancelled their booking for "${classData?.name || 'class'}"`;

      // Store notification in database first
      const { data: notificationData, error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: instructorId,
          type: 'class_update',
          title: 'Class Cancellation',
          message: notificationMessage,
          scheduled_for: new Date().toISOString(),
          metadata: {
            class_id: classId,
            notification_type: 'class_cancellation',
            student_name: studentDetails?.name || 'A student'
          },
          is_read: false
        })
        .select()
        .single();

      if (notificationError) {
        console.error('❌ Failed to store cancellation notification in database:', notificationError);
      } else {
        console.log('✅ Cancellation notification stored in database successfully');
      }

      // Send push notification
      try {
        await this.sendPushNotificationToUser(
          instructorId,
          'Class Cancellation',
          notificationMessage
        );
        console.log('✅ Cancellation push notification sent to instructor successfully');
      } catch (pushError) {
        console.error('❌ Failed to send cancellation push notification:', pushError);
        // Don't throw error here - notification is already stored in database
      }
    } catch (error) {
      console.error('❌ [NOTIFICATION] Failed to send instructor cancellation notification:', error);
      throw error;
    }
  }
}

export const notificationService = new NotificationService(); 