import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Alert, Platform } from 'react-native';
import { supabase } from '../config/supabase.config';

// Completely safe notification handler setup
let notificationHandlerSet = false;
try {
  if (!notificationHandlerSet) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true, // For showing a banner at the top of the screen
        shouldShowList: true,   // For showing the notification in the notification list
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    notificationHandlerSet = true;
  }
} catch (error) {
  console.error('❌ Failed to set notification handler:', error);
  // Fail silently to prevent app crash
}

class PushNotificationService {
  private pushToken: string | null = null;
  private isInitialized: boolean = false;
  private initializationAttempted: boolean = false;

  async initialize(): Promise<void> {
    // Prevent multiple initialization attempts
    if (this.isInitialized || this.initializationAttempted) {
      console.log('📱 Push notifications already initialized or attempted');
      return;
    }

    this.initializationAttempted = true;

    try {
      console.log('📱 Starting safe push notification initialization...');

      // Early platform checks
      if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
        console.log('⚠️ Push notifications not supported on this platform');
        return;
      }

      // Check if device supports notifications
      if (!Device.isDevice) {
        console.log('⚠️ Push notifications only work on physical devices');
        return;
      }

      // Wrap all native calls in individual try-catch blocks
      let permissionsResult;
      try {
        permissionsResult = await Notifications.getPermissionsAsync();
      } catch (permError) {
        console.error('❌ Failed to get permissions:', permError);
        return;
      }

      let finalStatus = permissionsResult.status;

      if (finalStatus !== 'granted') {
        try {
          const requestResult = await Notifications.requestPermissionsAsync();
          finalStatus = requestResult.status;
        } catch (requestError) {
          console.error('❌ Failed to request permissions:', requestError);
          return;
        }
      }

      if (finalStatus !== 'granted') {
        console.log('⚠️ Permission not granted for push notifications');
        return;
      }

      // Get push token with maximum safety
      const token = await this.getPushTokenSafely();
      if (token) {
        this.pushToken = token;
        await this.registerTokenWithServerSafely(token);
        console.log('✅ Push notifications initialized successfully');
      }

      this.isInitialized = true;

    } catch (error) {
      console.error('❌ Failed to initialize push notifications:', error);
      // Never rethrow - this must never crash the app
    }
  }

  private async getPushTokenSafely(): Promise<string | null> {
    try {
      // THE ROBUST FIX: Get projectId directly from the app's configuration.
      // This removes the dependency on the .env file.
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;

      if (!projectId) {
        console.log('⚠️ Could not find Expo project ID in app config (extra.eas.projectId). Push notifications disabled.');
        return null;
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      console.log('📱 Got push token successfully');
      console.log('📱 Push Token:', token.data);
      return token.data;
    } catch (error) {
      console.error('❌ Failed to get push token:', error);
      return null;
    }
  }

  private async registerTokenWithServerSafely(token: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('⚠️ No authenticated user for push token registration');
        return;
      }

      // Update user's push token in Supabase
      const { error } = await supabase
        .from('users')
        .update({ 
          push_token: token,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        console.error('❌ Failed to register push token:', error.message);
      } else {
        console.log('✅ Push token registered with server');
      }
    } catch (error) {
      console.error('❌ Failed to register push token:', error);
    }
  }

  getPushTokenValue(): string | null {
    return this.pushToken;
  }

  async sendTestNotification(): Promise<void> {
    try {
      console.log('📬 Scheduling a test notification...');
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📬 Test Notification',
          body: 'If you see this, your local notifications are working!',
          data: { testData: 'this is a test' },
        },
        trigger: { 
          seconds: 2,
          channelId: 'animo-notifications', // Specify a channel for Android
        },
      });
      console.log('✅ Test notification scheduled.');
    } catch (error) {
      console.error('❌ Failed to schedule test notification:', error);
    }
  }

  async sendRemoteTestNotification(): Promise<void> {
    try {
      if (!this.pushToken) {
        console.log('⚠️ No push token available for remote test');
        return;
      }

      console.log('📬 Sending remote test notification...');
      console.log('📱 Push Token:', this.pushToken);

      // Send via Expo's push service
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: this.pushToken,
          title: '🚀 Remote Test Notification',
          body: 'If you see this, your remote push notifications are working!',
          data: { testData: 'remote test' },
          sound: 'default',
        }),
      });

      const result = await response.json();
      console.log('📬 Remote notification result:', result);

      if (response.ok) {
        console.log('✅ Remote test notification sent successfully');
        // Show success alert
        if (typeof Alert !== 'undefined') {
          Alert.alert(
            '✅ Success',
            'Remote notification sent successfully! Check your device.',
            [{ text: 'OK' }]
          );
        }
      } else {
        console.error('❌ Failed to send remote notification:', result);
        // Show error alert
        if (typeof Alert !== 'undefined') {
          Alert.alert(
            '❌ Error',
            `Failed to send remote notification: ${JSON.stringify(result)}`,
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      console.error('❌ Failed to send remote test notification:', error);
      // Show error alert
      if (typeof Alert !== 'undefined') {
        Alert.alert(
          '❌ Error',
          `Failed to send remote notification: ${error}`,
          [{ text: 'OK' }]
        );
      }
    }
  }

  // Helper method to get PowerShell curl command
  getPowerShellCurlCommand(): string {
    if (!this.pushToken) {
      return 'No push token available';
    }
    
    return `Invoke-RestMethod -Uri "https://exp.host/--/api/v2/push/send" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"to": "${this.pushToken}", "title": "Test Notification", "body": "Hello from PowerShell!", "sound": "default"}'`;
  }

  async sendNotification(title: string, body: string, data?: any): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
        },
        trigger: null, // Send immediately
      });
    } catch (error) {
      console.error('❌ Failed to send local notification:', error);
    }
  }

  async sendClassReminder(className: string, instructorName: string, minutesBeforeClass: number, userId?: string): Promise<void> {
    try {
      // If userId is provided, check their notification preferences
      if (userId) {
        console.log(`🔍 [pushNotificationService] Checking notification preferences for user ${userId}`);
        
        const { data: userSettings } = await supabase
          .from('notification_settings')
          .select('enable_notifications, enable_push_notifications, class_reminders')
          .eq('user_id', userId)
          .single();
        
        // Default to enabled if no settings found, or check if reminders are disabled
        const shouldSendReminder = !userSettings || 
          (userSettings.enable_notifications && 
           userSettings.enable_push_notifications && 
           userSettings.class_reminders !== false);
        
        if (!shouldSendReminder) {
          console.log(`❌ [pushNotificationService] User ${userId} has disabled class reminders`);
          return;
        }
        
        console.log(`✅ [pushNotificationService] User ${userId} will receive class reminder`);
      }
      
      const title = 'Class Reminder';
      const body = `${className} with ${instructorName} starts in ${minutesBeforeClass} minutes!`;
      
      console.log(`📬 Sending class reminder: ${body}`);
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { 
            type: 'class_reminder',
            className,
            instructorName,
            minutesBeforeClass,
            userId
          },
        },
        trigger: null, // Send immediately for testing
      });
      
      console.log('✅ Class reminder notification sent');
    } catch (error) {
      console.error('❌ Failed to send class reminder:', error);
    }
  }

  // Schedule reminders for all user's upcoming classes based on their preferences
  async scheduleClassReminders(userId: string): Promise<void> {
    try {
      console.log(`🗓️ [pushNotificationService] Scheduling class reminders for user ${userId}`);
      
      // Get user's notification settings
      const { data: userSettings } = await supabase
        .from('notification_settings')
        .select('enable_notifications, enable_push_notifications, class_reminders, default_reminder_minutes')
        .eq('user_id', userId)
        .single();
      
      // Default to enabled if no settings found
      const shouldScheduleReminders = !userSettings || 
        (userSettings.enable_notifications && 
         userSettings.enable_push_notifications && 
         userSettings.class_reminders !== false);
      
      if (!shouldScheduleReminders) {
        console.log(`❌ [pushNotificationService] User ${userId} has disabled class reminders`);
        return;
      }
      
      const reminderMinutes = userSettings?.default_reminder_minutes || 30; // Default 30 minutes before
      
      // Get user's upcoming bookings
      const { data: bookings } = await supabase
        .from('bookings')
        .select(`
          id,
          classes (
            id,
            name,
            date,
            time,
            users (name)
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'confirmed')
        .gte('classes.date', new Date().toISOString().split('T')[0]); // Today or future
      
      if (!bookings || bookings.length === 0) {
        console.log(`📭 [pushNotificationService] No upcoming classes found for user ${userId}`);
        return;
      }
      
      console.log(`📅 [pushNotificationService] Found ${bookings.length} upcoming classes for user ${userId}`);
      
      for (const booking of bookings) {
        const classInfo = booking.classes as any;
        if (classInfo) {
          const classDateTime = new Date(`${classInfo.date}T${classInfo.time}`);
          const reminderTime = new Date(classDateTime.getTime() - (reminderMinutes * 60 * 1000));
          const now = new Date();
          
          // Only schedule if reminder time is in the future
          if (reminderTime > now) {
            const secondsUntilReminder = (reminderTime.getTime() - now.getTime()) / 1000;
            
            await Notifications.scheduleNotificationAsync({
              content: {
                title: 'Class Reminder',
                body: `${classInfo.name} with ${classInfo.users?.name || 'your instructor'} starts in ${reminderMinutes} minutes!`,
                data: { 
                  type: 'class_reminder',
                  classId: classInfo.id,
                  bookingId: booking.id,
                  userId
                },
              },
              trigger: {
                seconds: secondsUntilReminder,
              },
            });
            
            console.log(`⏰ [pushNotificationService] Scheduled reminder for "${classInfo.name}" on ${classInfo.date} at ${classInfo.time} (${reminderMinutes} min before)`);
          }
        }
      }
      
      console.log(`✅ [pushNotificationService] Finished scheduling reminders for user ${userId}`);
    } catch (error) {
      console.error(`❌ [pushNotificationService] Failed to schedule class reminders for user ${userId}:`, error);
    }
  }
}

export const pushNotificationService = new PushNotificationService(); 