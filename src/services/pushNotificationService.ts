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
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
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

      return;
    }

    this.initializationAttempted = true;

    try {

      
      // Enhanced platform checks for production
      if (Platform.OS !== 'ios' && Platform.OS !== 'android') {

        return;
      }

      // For production IPA builds, we need more robust device checking
      if (!Device.isDevice) {
        // In production, this should never happen, but let's be safe
        if (__DEV__) {
          //console.log('⚠️ Push notifications only work on physical devices (running in simulator/emulator)');
          return;
        } else {
          // In production, Device.isDevice might sometimes give false negatives
          //console.log('⚠️ Device.isDevice returned false, but continuing for production build');
        }
      }

      // Wrap all native calls in individual try-catch blocks
      //console.log('🔍 [initialize] Checking notification permissions...');
      let permissionsResult;
      try {
        permissionsResult = await Notifications.getPermissionsAsync();
        //console.log('🔍 [initialize] Current permissions:', JSON.stringify(permissionsResult, null, 2));
      } catch (permError) {
        console.error('❌ [initialize] Failed to get permissions:', permError);
        return;
      }

      let finalStatus = permissionsResult.status;
      //console.log('🔍 [initialize] Current permission status:', finalStatus);

      if (finalStatus !== 'granted') {
        //console.log('🔍 [initialize] Requesting notification permissions...');
        try {
          const requestResult = await Notifications.requestPermissionsAsync();
          finalStatus = requestResult.status;
          //console.log('🔍 [initialize] Permission request result:', JSON.stringify(requestResult, null, 2));
          //console.log('🔍 [initialize] Final permission status:', finalStatus);
        } catch (requestError) {
          console.error('❌ [initialize] Failed to request permissions:', requestError);
          return;
        }
      }

      if (finalStatus !== 'granted') {
        console.error('❌ [initialize] Permission not granted for push notifications. Status:', finalStatus);
        //console.log('🔍 [initialize] User denied notification permissions or system restriction');
        return;
      }

      //console.log('✅ [initialize] Notification permissions granted');

      // Get push token with maximum safety
      const token = await this.getPushTokenSafely();
      if (token) {
        this.pushToken = token;
        await this.registerTokenWithServerSafely(token);
        //console.log('✅ Push notifications initialized successfully');
      }

      this.isInitialized = true;

    } catch (error) {
      console.error('❌ Failed to initialize push notifications:', error);
      // Never rethrow - this must never crash the app
    }
  }

  private async getPushTokenSafely(): Promise<string | null> {
    try {
      // Enhanced logging for production debugging
      //console.log('🔍 [getPushTokenSafely] Starting push token generation...');
      //console.log('🔍 [getPushTokenSafely] Platform:', Platform.OS);
      //console.log('🔍 [getPushTokenSafely] Device type:', Device.deviceType);
      //console.log('🔍 [getPushTokenSafely] Is device?', Device.isDevice);
      
      // Enhanced project ID detection for production builds
      const projectId = (Constants as any).expoConfig?.extra?.eas?.projectId || 
                       (Constants as any).manifest?.extra?.eas?.projectId ||
                       ((Constants as any).manifest2?.extra ? (Constants as any).manifest2.extra.eas?.projectId : undefined) ||
                       'd4bdbfc4-ecbc-40d7-aabb-ad545c836ab3'; // Fallback to your project ID
      
      //console.log('🔍 [getPushTokenSafely] Project ID from config:', projectId);

      if (!projectId) {
        console.error('❌ [getPushTokenSafely] Could not find Expo project ID. Push notifications disabled.');
        //console.log('🔍 [getPushTokenSafely] Constants.expoConfig:', JSON.stringify((Constants as any).expoConfig, null, 2));
        //console.log('🔍 [getPushTokenSafely] Constants.manifest:', JSON.stringify((Constants as any).manifest, null, 2));
        return null;
      }

      //console.log('🔍 [getPushTokenSafely] Requesting Expo push token with project ID:', projectId);
      const token = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      //console.log('✅ [getPushTokenSafely] Got push token successfully');
      
      // In production, only log partial token for security
      if (__DEV__) {
        //console.log('📱 [getPushTokenSafely] Push Token (DEV):', token.data);
      } else {
        //console.log('📱 [getPushTokenSafely] Push Token (PROD):', token.data.substring(0, 20) + '...');
      }
      
      return token.data;
    } catch (error) {
      console.error('❌ [getPushTokenSafely] Failed to get push token:', error);
      console.error('❌ [getPushTokenSafely] Error details:', JSON.stringify(error, null, 2));
      return null;
    }
  }

  private async registerTokenWithServerSafely(token: string): Promise<void> {
    try {
      //console.log('🔍 [registerTokenWithServerSafely] Starting token registration...');
      //console.log('📱 [registerTokenWithServerSafely] Token to register:', token);
      
      // Get current user ID from Supabase auth
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      //console.log('🔍 [registerTokenWithServerSafely] Auth result:', { user: user?.id, authError });
      
      if (authError) {
        console.error('❌ [registerTokenWithServerSafely] Auth error:', authError);
        return;
      }
      
      if (!user) {
        console.error('❌ [registerTokenWithServerSafely] No authenticated user found, skipping token registration');
        return;
      }

      //console.log('🔍 [registerTokenWithServerSafely] Updating push token for user:', user.id);

      // Update user's push token in Supabase
      const { error, data: updateResult } = await supabase
        .from('users')
        .update({ push_token: token })
        .eq('id', user.id)
        .select('id, push_token');

      if (error) {
        console.error('❌ [registerTokenWithServerSafely] Failed to register push token:', error);
        console.error('❌ [registerTokenWithServerSafely] Error details:', JSON.stringify(error, null, 2));
      } else {
        //console.log('✅ [registerTokenWithServerSafely] Push token registered successfully');
        //console.log('🔍 [registerTokenWithServerSafely] Update result:', updateResult);
      }
    } catch (error) {
      console.error('❌ [registerTokenWithServerSafely] Exception during token registration:', error);
      console.error('❌ [registerTokenWithServerSafely] Error details:', JSON.stringify(error, null, 2));
    }
  }

  getPushTokenValue(): string | null {
    return this.pushToken;
  }

  async forceTokenReregistration(): Promise<void> {
    try {
      //console.log('🔄 Force re-registering push token...');
      
      // Reset state
      this.isInitialized = false;
      this.initializationAttempted = false;
      this.pushToken = null;
      
      // Re-initialize
      await this.initialize();
      
      //console.log('✅ Token re-registration completed');
    } catch (error) {
      console.error('❌ Failed to re-register token:', error);
    }
  }

  async sendTestNotification(): Promise<void> {
    try {
      //console.log('📬 Sending a test push notification...');
      
      // First, check notification registration status
      await this.checkNotificationRegistration();
      
      if (!this.pushToken) {
        //console.log('⚠️ No push token available for test notification');
        return;
      }

      //console.log('📱 Push Token being used:', this.pushToken);
      
      // Try to validate the token first by sending a minimal test
      //console.log('🔍 Validating token registration with Expo...');
      try {
        const validationResponse = await fetch('https://exp.host/--/api/v2/push/getReceipts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ids: [] // Empty array just to test API access
          })
        });
        //console.log('✅ Expo API accessible, validation response status:', validationResponse.status);
      } catch (validationError) {
        console.error('❌ Cannot reach Expo push API:', validationError);
      }

      // Check if we're running on web platform
      const isWeb = typeof window !== 'undefined' && window.navigator && window.navigator.userAgent;
      
      if (isWeb) {
        console.log('🌐 Web platform detected - cannot send push notifications directly');
        //console.log('📱 Test notification would be sent to:', this.pushToken);
        //console.log('📱 Message: 📬 Test Notification - If you see this, your push notifications are working!');
        return;
      }

      // Send via Expo's push service (native platforms only)
      const notificationPayload = {
        to: this.pushToken,
        title: '📬 Test Notification',
        body: 'If you see this, your push notifications are working!',
        data: { testData: 'this is a test' },
        sound: 'default',
        priority: 'high',
        channelId: 'animo-notifications',
        badge: 1,
      };

      console.log('📤 Sending notification payload:', JSON.stringify(notificationPayload, null, 2));

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notificationPayload),
      });

      //console.log('📥 Response status:', response.status);
      //console.log('📥 Response headers:', JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));

      const responseText = await response.text();
      //console.log('📥 Response body:', responseText);

      let responseData;
      try {
        responseData = JSON.parse(responseText);
        //console.log('📥 Parsed response data:', JSON.stringify(responseData, null, 2));
      } catch (parseError) {
        console.error('❌ Failed to parse response as JSON:', parseError);
        //console.log('📥 Raw response text:', responseText);
      }

      if (response.ok) {
        //console.log('✅ Test push notification sent successfully to Expo');
        //console.log('📱 Expo response indicates success, but notification may not be delivered to device');
        //console.log('📱 This could be due to:');
        console.log('   - Device not properly registered with APNs');
        console.log('   - Provisioning profile issues');
        console.log('   - Apple APNs configuration problems');
        console.log('   - Device notification settings');
      } else {
        console.error('❌ Failed to send test push notification to Expo');
        console.error('❌ Status:', response.status);
        console.error('❌ Response:', responseData);
      }
    } catch (error) {
      console.error('❌ Failed to send test push notification:', error);
      console.error('❌ Error details:', {
        message: (error as Error).message,
        stack: (error as Error).stack,
        name: (error as Error).name
      });
    }
  }

  private async checkNotificationRegistration(): Promise<void> {
    try {
      //console.log('🔍 Checking notification registration status...');
      
      // Check permissions
      const permissions = await Notifications.getPermissionsAsync();
      //console.log('🔍 Notification permissions:', JSON.stringify(permissions, null, 2));
      
      // Check if we can get a token
      try {
        const token = await Notifications.getExpoPushTokenAsync({
          projectId: 'd4bdbfc4-ecbc-40d7-aabb-ad545c836ab3', // Hardcoded from app.json
        });
        //console.log('🔍 Current Expo push token:', token.data);
        //console.log('🔍 Token type:', token.type);
      } catch (tokenError) {
        console.error('❌ Failed to get current push token:', tokenError);
      }
      
      // Check device info
      // console.log('🔍 Device info:', {
      //   isDevice: Device.isDevice,
      //   deviceType: Device.deviceType,
      //   platform: Platform.OS,
      //   brand: Device.brand,
      //   modelName: Device.modelName,
      // });
      
    } catch (error) {
      console.error('❌ Error checking notification registration:', error as Error);
    }
  }

  async sendRemoteTestNotification(): Promise<void> {
    try {
      if (!this.pushToken) {
        //console.log('⚠️ No push token available for remote test');
        return;
      }

      //console.log('📬 Sending remote test notification...');
      //console.log('📱 Push Token:', this.pushToken);

      // Check if we're running on web platform
      const isWeb = typeof window !== 'undefined' && window.navigator && window.navigator.userAgent;
      
      if (isWeb) {
        console.log('🌐 Web platform detected - cannot send push notifications directly');
        //console.log('📱 Remote test notification would be sent to:', this.pushToken);
        //console.log('📱 Message: 🚀 Remote Test Notification - If you see this, your remote push notifications are working!');
        return;
      }

      // Send via Expo's push service (native platforms only)
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
          badge: 1,
        }),
      });

      const result = await response.json();
      //console.log('📬 Remote notification result:', result);

      if (response.ok) {
        //console.log('✅ Remote test notification sent successfully');
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
      if (!this.pushToken) {
        //console.log('⚠️ No push token available for notification');
        return;
      }

      // Check if we're running on web platform
      const isWeb = typeof window !== 'undefined' && window.navigator && window.navigator.userAgent;
      
      if (isWeb) {
        console.log('🌐 Web platform detected - cannot send push notifications directly');
        //console.log('📱 Notification would be sent to:', this.pushToken);
        //console.log('📱 Message:', title, '-', body);
        return;
      }

      // Send via Expo's push service (native platforms only)
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: this.pushToken,
          title,
          body,
          data,
          sound: 'default',
          priority: 'high',
          channelId: 'animo-notifications',
          badge: 1,
        }),
      });

      if (response.ok) {
        //console.log('✅ Push notification sent successfully');
      } else {
        console.error('❌ Failed to send push notification');
      }
    } catch (error) {
      console.error('❌ Failed to send push notification:', error);
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
      
      const title = '⏰ Class Reminder';
      const body = `${className} with ${instructorName} starts in ${minutesBeforeClass} minutes!`;
      
      console.log(`📬 Sending class reminder: ${body}`);
      
      if (!this.pushToken) {
        //console.log('⚠️ No push token available for class reminder');
        return;
      }

      // Check if we're running on web platform
      const isWeb = typeof window !== 'undefined' && window.navigator && window.navigator.userAgent;
      
      if (isWeb) {
        console.log('🌐 Web platform detected - cannot send push notifications directly');
        //console.log('📱 Class reminder would be sent to:', this.pushToken);
        //console.log('📱 Message:', title, '-', body);
        return;
      }

      // Send via Expo's push service (native platforms only)
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: this.pushToken,
          title,
          body,
          data: { 
            type: 'class_reminder',
            className,
            instructorName,
            minutesBeforeClass,
            userId
          },
          sound: 'default',
          priority: 'high',
          channelId: 'animo-notifications',
        }),
      });

      if (response.ok) {
        //console.log('✅ Class reminder push notification sent');
      } else {
        console.error('❌ Failed to send class reminder push notification');
      }
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
      
      // Get user's push token
      const { data: userData } = await supabase
        .from('users')
        .select('push_token')
        .eq('id', userId)
        .single();

      if (!userData?.push_token) {
        console.log(`⚠️ No push token found for user ${userId} - cannot schedule reminders`);
        return;
      }

      for (const booking of bookings) {
        const classInfo = booking.classes as any;
        if (classInfo) {
          const classDateTime = new Date(`${classInfo.date}T${classInfo.time}`);
          const reminderTime = new Date(classDateTime.getTime() - (reminderMinutes * 60 * 1000));
          const now = new Date();
          
          // Only schedule if reminder time is in the future
          if (reminderTime > now) {
            console.log(`⏰ [pushNotificationService] Scheduling reminder for "${classInfo.name}" on ${classInfo.date} at ${classInfo.time} (${reminderMinutes} min before)`);
            
            // Store notification in Supabase for Vercel cron job to process
            const { error } = await supabase
              .from('notifications')
              .insert({
                user_id: userId,
                title: '🧘‍♀️ Class Reminder',
                message: `${classInfo.name} with ${classInfo.users?.name || 'your instructor'} starts in ${reminderMinutes} minutes!`,
                type: 'class_reminder',
                scheduled_for: reminderTime.toISOString(),
                metadata: {
                  type: 'class_reminder',
                  classId: classInfo.id,
                  bookingId: booking.id,
                  userId,
                  push_token: userData.push_token,
                  className: classInfo.name,
                  instructorName: classInfo.users?.name
                },
                is_read: false
                // sent_at and created_at will be handled by database defaults
              });

            if (error) {
              console.error(`❌ Failed to schedule reminder for class ${classInfo.name}:`, error);
            } else {
              console.log(`✅ Reminder scheduled for "${classInfo.name}"`);
            }
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