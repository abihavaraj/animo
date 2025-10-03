import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { Alert, Platform } from 'react-native';
import { supabase, supabaseAdmin } from '../config/supabase.config';

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
    console.log('🔍 [initialize] METHOD CALLED - Entry point');
    
    // Prevent multiple initialization attempts
    if (this.isInitialized || this.initializationAttempted) {
      console.log('🔍 [initialize] EARLY EXIT - Already initialized or attempted');
      console.log('🔍 [initialize] State:', { isInitialized: this.isInitialized, initializationAttempted: this.initializationAttempted });
      return;
    }

    console.log('🔍 [initialize] PROCEEDING - Setting initializationAttempted = true');
    this.initializationAttempted = true;

    try {
      console.log('🔍 [initialize] STARTING - Beginning initialization process');
      
      // Enhanced platform checks for production
      console.log('🔍 [initialize] Platform check - OS:', Platform.OS);
      if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
        console.log('❌ [initialize] Not on supported platform, exiting');
        return;
      }

      // Check if we're running in Expo Go
      console.log('🔍 [initialize] Execution environment debug:', {
        __DEV__,
        executionEnvironment: Constants.executionEnvironment,
        appOwnership: Constants.appOwnership,
        isStandalone: Constants.executionEnvironment === 'standalone',
        platform: Platform.OS
      });
      
      const isExpoGo = __DEV__ && Constants.executionEnvironment === 'standalone' === false;
      
      // TEMPORARILY DISABLE EXPO GO BLOCKING FOR TESTING
      // if (isExpoGo && Platform.OS === 'android') {
      //   console.log('⚠️ [initialize] Android push notifications not supported in Expo Go (SDK 53+)');
      //   console.log('🏗️ [initialize] Use development build or EAS build to test Android push notifications');
      //   return;
      // }
      
      if (isExpoGo && Platform.OS === 'android') {
        console.log('⚠️ [initialize] WARNING: Running Android in Expo Go - push notifications may be limited');
        console.log('🧪 [initialize] Attempting token generation anyway for testing...');
        // Continue instead of returning - let's see what happens
      }

      // For production IPA builds, we need more robust device checking
      console.log('🔍 [initialize] Device check - isDevice:', Device.isDevice, 'isDev:', __DEV__);
      if (!Device.isDevice) {
        // In production, this should never happen, but let's be safe
        if (__DEV__) {
          console.log('⚠️ [initialize] Device.isDevice is false - this might be an emulator or device detection issue');
          console.log('🧪 [initialize] Continuing anyway for testing purposes...');
          // CONTINUE instead of returning - let's try to generate tokens anyway
        } else {
          console.log('⚠️ [initialize] Device.isDevice is false but continuing in production');
          // Continuing despite device check
        }
      } else {
        console.log('✅ [initialize] Device.isDevice is true - proceeding normally');
      }

      console.log('✅ [initialize] Platform and device checks passed, proceeding to permissions...');

      // Wrap all native calls in individual try-catch blocks
      console.log('🔍 [initialize] Checking notification permissions...');
      let permissionsResult;
      try {
        permissionsResult = await Notifications.getPermissionsAsync();
        console.log('🔍 [initialize] Current permissions:', JSON.stringify(permissionsResult, null, 2));
      } catch (permError) {
        console.error('❌ [initialize] Failed to get permissions:', permError);
        return;
      }

      let finalStatus = permissionsResult.status;
      console.log('🔍 [initialize] Current permission status:', finalStatus);

      if (finalStatus !== 'granted') {
        console.log('🔍 [initialize] Requesting notification permissions...');
        try {
          const requestResult = await Notifications.requestPermissionsAsync();
          finalStatus = requestResult.status;
          console.log('🔍 [initialize] Permission request result:', JSON.stringify(requestResult, null, 2));
          console.log('🔍 [initialize] Final permission status:', finalStatus);
        } catch (requestError) {
          console.error('❌ [initialize] Failed to request permissions:', requestError);
          return;
        }
      }

      if (finalStatus !== 'granted') {
        console.error('❌ [initialize] Permission not granted for push notifications. Status:', finalStatus);
        console.error('❌ [initialize] Full permission result:', JSON.stringify(permissionsResult, null, 2));
        // TestFlight Debug - User denied notification permissions
        return;
      }

      console.log('✅ [initialize] Notification permissions granted');
      console.log('🔍 [initialize] Moving to Android channel creation...');

      // Create Android notification channels for production builds
      if (Platform.OS === 'android') {
        try {
          console.log('🤖 [initialize] Creating Android notification channels...');
          await this.createAndroidNotificationChannels();
          console.log('✅ [initialize] Android channels created successfully');
        } catch (channelError) {
          console.error('❌ [initialize] Failed to create Android channels:', channelError);
          // Continue with token registration even if channels fail
        }
      }

      console.log('🔍 [initialize] Starting push token generation...');
      // Get push token with maximum safety
      const token = await this.getPushTokenSafely();
      console.log('🔍 [initialize] Token generation result:', token ? 'SUCCESS' : 'FAILED');
      
      if (token) {
        this.pushToken = token;
        console.log('🔍 [initialize] Starting token registration with server...');
        await this.registerTokenWithServerSafely(token);
        console.log('✅ Push notifications initialized successfully');
      } else {
        console.log('❌ [initialize] No token obtained - push notifications disabled');
      }

      this.isInitialized = true;
      console.log('🔍 [initialize] Initialization completed. Final state:', {
        isInitialized: this.isInitialized,
        hasToken: !!this.pushToken
      });

    } catch (error) {
      console.error('❌ Failed to initialize push notifications:', error);
      // Never rethrow - this must never crash the app
    }
  }

  private async getPushTokenSafely(): Promise<string | null> {
    try {
      // Enhanced logging for production debugging
      console.log('🔍 [getPushTokenSafely] Starting push token generation...');
      console.log('🔍 [getPushTokenSafely] Platform:', Platform.OS);
      console.log('🔍 [getPushTokenSafely] Device type:', Device.deviceType);
      console.log('🔍 [getPushTokenSafely] Is device?', Device.isDevice);
      
      // Enhanced project ID detection for production builds
      const projectId = (Constants as any).expoConfig?.extra?.eas?.projectId || 
                       (Constants as any).manifest?.extra?.eas?.projectId ||
                       ((Constants as any).manifest2?.extra ? (Constants as any).manifest2.extra.eas?.projectId : undefined) ||
                       'd4bdbfc4-ecbc-40d7-aabb-ad545c836ab3'; // Fallback to your project ID
      
      console.log('🔍 [getPushTokenSafely] Project ID from config:', projectId);

      if (!projectId) {
        console.error('❌ [getPushTokenSafely] Could not find Expo project ID. Push notifications disabled.');
        console.log('🔍 [getPushTokenSafely] Constants info:', JSON.stringify({
          expoConfig: (Constants as any).expoConfig?.extra?.eas,
          manifest: (Constants as any).manifest?.extra?.eas,
          manifest2: (Constants as any).manifest2?.extra?.eas
        }, null, 2));
        return null;
      }

      console.log('🔍 [getPushTokenSafely] Requesting Expo push token with project ID:', projectId);
      
      // Add extra debugging for Android
      if (Platform.OS === 'android') {
        console.log('🤖 [getPushTokenSafely] Android - Attempting FCM token generation...');
        console.log('🤖 [getPushTokenSafely] Android - Constants.appOwnership:', Constants.appOwnership);
        console.log('🤖 [getPushTokenSafely] Android - Constants.executionEnvironment:', Constants.executionEnvironment);
      }
      
      const token = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      console.log('✅ [getPushTokenSafely] Got push token successfully');
      
      // In production, only log partial token for security
      if (__DEV__) {
        console.log('🔍 [getPushTokenSafely] Push Token (DEV):', token.data);
      } else {
        console.log('🔍 [getPushTokenSafely] Push Token (PROD):', token.data.substring(0, 50) + '...');
      }
      
      return token.data;
    } catch (error) {
      console.error('❌ [getPushTokenSafely] Failed to get push token:', error);
      console.error('❌ [getPushTokenSafely] Error details:', JSON.stringify(error, null, 2));
      console.error('❌ [getPushTokenSafely] Error message:', error?.message);
      console.error('❌ [getPushTokenSafely] Error code:', error?.code);
      return null;
    }
  }

  private async registerTokenWithServerSafely(token: string): Promise<void> {
    try {
      console.log('🔍 [registerTokenWithServerSafely] Starting token registration...');
      console.log('📱 [registerTokenWithServerSafely] Token to register:', token.substring(0, 20) + '...');
      console.log('🤖 [registerTokenWithServerSafely] Platform:', Platform.OS);
      
      // VALIDATION: Reject invalid token formats immediately
      if (!token || !token.startsWith('ExponentPushToken[')) {
        console.error('❌ [registerTokenWithServerSafely] Invalid token format! Token must start with "ExponentPushToken["');
        console.error('❌ [registerTokenWithServerSafely] Received token:', token ? token.substring(0, 30) + '...' : 'NULL');
        return; // Don't save invalid tokens
      }
      
      // Get current user ID from Supabase auth
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      console.log('🔍 [registerTokenWithServerSafely] Auth result:', { user: user?.id, authError });
      
      if (authError) {
        console.error('❌ [registerTokenWithServerSafely] Auth error:', authError);
        return;
      }
      
      if (!user) {
        console.error('❌ [registerTokenWithServerSafely] No authenticated user found, skipping token registration');
        return;
      }

      console.log('🔍 [registerTokenWithServerSafely] Registering push token for user:', user.id);

      // Check if user has an old FCM token and this is a new ExponentPushToken
      const { data: currentUserData } = await supabase
        .from('users')
        .select('push_token')
        .eq('id', user.id)
        .single();

      const isUpgradeFromFCM = currentUserData?.push_token && 
                               !currentUserData.push_token.startsWith('ExponentPushToken[') && 
                               token.startsWith('ExponentPushToken[');

      if (isUpgradeFromFCM) {
        console.log('🔄 [registerTokenWithServerSafely] Upgrading from FCM to ExponentPushToken format');
        console.log('   📱 Old FCM token:', currentUserData.push_token.substring(0, 20) + '...');
        console.log('   📱 New ExponentPushToken:', token.substring(0, 20) + '...');
      }

      // 1. Update user's push token in the users table (legacy approach)
      const { error: userError, data: updateResult } = await supabase
        .from('users')
        .update({ push_token: token })
        .eq('id', user.id)
        .select('id, push_token');

      if (userError) {
        console.error('❌ [registerTokenWithServerSafely] Failed to register push token in users table:', userError);
      } else {
        console.log('✅ [registerTokenWithServerSafely] Push token registered in users table for user:', user.id);
        console.log('📱 [registerTokenWithServerSafely] Updated user data:', updateResult);
      }

      // 2. CLEAN UP: DELETE all old tokens for this user in push_tokens table
      // Use supabaseAdmin to bypass RLS
      console.log('🧹 [registerTokenWithServerSafely] Deleting old tokens for user:', user.id);
      
      try {
        const { error: deleteError, count } = await supabaseAdmin
          .from('push_tokens')
          .delete({ count: 'exact' })
          .eq('user_id', user.id)
          .neq('token', token); // Don't delete the new token if it already exists

        if (deleteError) {
          console.error('⚠️ [registerTokenWithServerSafely] Failed to delete old tokens:', deleteError);
        } else {
          console.log(`✅ [registerTokenWithServerSafely] Deleted ${count || 0} old tokens successfully`);
        }
      } catch (cleanupError) {
        console.error('⚠️ [registerTokenWithServerSafely] Error during token cleanup:', cleanupError);
        // Don't fail registration if cleanup fails
      }

      // 3. Register new token in push_tokens table (new approach for multi-device support)
      // Use supabaseAdmin to bypass RLS - this is a system operation
      const deviceInfo = {
        user_id: user.id,
        token: token,
        device_type: Platform.OS,
        device_id: await this.getDeviceId(),
        device_name: await this.getDeviceName(),
        is_active: true,
        last_used_at: new Date().toISOString()
      };

      console.log('🔍 [registerTokenWithServerSafely] Registering in push_tokens table:', deviceInfo);

      const { error: pushTokensError, data: pushTokensResult } = await supabaseAdmin
        .from('push_tokens')
        .upsert(deviceInfo, { 
          onConflict: 'token',
          ignoreDuplicates: false 
        })
        .select('id, token, device_type, is_active');

      if (pushTokensError) {
        console.error('❌ [registerTokenWithServerSafely] Failed to register push token in push_tokens table:', pushTokensError);
      } else {
        console.log('✅ [registerTokenWithServerSafely] Push token registered in push_tokens table successfully');
        console.log('📱 [registerTokenWithServerSafely] Push tokens result:', pushTokensResult);
      }

    } catch (error) {
      console.error('❌ [registerTokenWithServerSafely] Exception during token registration:', error);
      console.error('❌ [registerTokenWithServerSafely] Error details:', JSON.stringify(error, null, 2));
    }
  }

  // Get device ID for tracking
  private async getDeviceId(): Promise<string> {
    try {
      // Use a combination of platform and device info for unique ID
      const deviceId = `${Platform.OS}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      return deviceId;
    } catch (error) {
      console.error('❌ [getDeviceId] Error generating device ID:', error);
      return `${Platform.OS}_unknown`;
    }
  }

  // Get device name for tracking
  private async getDeviceName(): Promise<string> {
    try {
      if (Platform.OS === 'ios') {
        return Device.modelName || 'iOS Device';
      } else if (Platform.OS === 'android') {
        return Device.modelName || 'Android Device';
      } else {
        return 'Unknown Device';
      }
    } catch (error) {
      console.error('❌ [getDeviceName] Error getting device name:', error);
      return 'Unknown Device';
    }
  }

  getPushTokenValue(): string | null {
    return this.pushToken;
  }

  // Clear the current push token (useful for re-registration)
  clearToken(): void {
    this.pushToken = null;
    this.isInitialized = false;
    this.initializationAttempted = false;
    console.log('🧹 [clearToken] Push token cleared, ready for re-registration');
  }

  // Force re-registration of push token (for users without tokens)
  async forceReRegistration(): Promise<boolean> {
    try {
      console.log('🔄 [forceReRegistration] Starting forced re-registration...');
      
      // Clear any existing state
      this.clearToken();
      
      // Force re-initialization
      await this.initialize();
      
      // Check if we got a token
      const token = this.getPushTokenValue();
      if (token) {
        console.log('✅ [forceReRegistration] Push token re-registered successfully');
        return true;
      } else {
        console.log('❌ [forceReRegistration] Failed to get push token after re-registration');
        return false;
      }
    } catch (error) {
      console.error('❌ [forceReRegistration] Error during forced re-registration:', error);
      return false;
    }
  }

  async forceTokenReregistration(): Promise<void> {
    try {
      console.log('🔄 [forceTokenReregistration] Starting push token re-registration...');
      console.log('🔍 [forceTokenReregistration] Current state:', {
        isInitialized: this.isInitialized,
        initializationAttempted: this.initializationAttempted,
        hasToken: !!this.pushToken
      });
      
      // Reset state
      this.isInitialized = false;
      this.initializationAttempted = false;
      this.pushToken = null;
      
      console.log('🔄 [forceTokenReregistration] State reset, starting re-initialization...');
      console.log('🔍 [forceTokenReregistration] About to call this.initialize()...');
      
      // Re-initialize
      await this.initialize();
      
      console.log('✅ [forceTokenReregistration] this.initialize() completed');
      console.log('✅ [forceTokenReregistration] Token re-registration completed');
      console.log('🔍 [forceTokenReregistration] Final state:', {
        isInitialized: this.isInitialized,
        hasToken: !!this.pushToken,
        tokenPreview: this.pushToken ? this.pushToken.substring(0, 50) + '...' : 'none'
      });
    } catch (error) {
      console.error('❌ [forceTokenReregistration] Failed to re-register token:', error);
      console.error('❌ [forceTokenReregistration] Error details:', JSON.stringify(error, null, 2));
    }
  }

  // Create Android notification channels for proper notification display
  private async createAndroidNotificationChannels(): Promise<void> {
    if (Platform.OS !== 'android') {
      return;
    }

    try {
      console.log('🤖 [createAndroidNotificationChannels] Creating Android notification channels...');

      // Main notification channel for general notifications (matches app.json config)
      await Notifications.setNotificationChannelAsync('animo-notifications', {
        name: 'ANIMO Notifications',
        description: 'General notifications from ANIMO Pilates Studio',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#F5F2B8',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: false,
        enableVibrate: true,
        enableLights: true,
        showBadge: true,
        sound: 'default',
      });

      // Class reminder channel
      await Notifications.setNotificationChannelAsync('class-reminders', {
        name: 'Class Reminders',
        description: 'Reminders for upcoming pilates classes',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#F5F2B8',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: false,
        enableVibrate: true,
        enableLights: true,
        showBadge: true,
        sound: 'default',
      });

      // Class updates channel
      await Notifications.setNotificationChannelAsync('class-updates', {
        name: 'Class Updates',
        description: 'Updates about class cancellations, changes, and waitlist promotions',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#F5F2B8',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: false,
        enableVibrate: true,
        enableLights: true,
        showBadge: true,
        sound: 'default',
      });

      // Subscription updates channel
      await Notifications.setNotificationChannelAsync('subscription-updates', {
        name: 'Subscription Updates',
        description: 'Updates about your subscription status and payments',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#F5F2B8',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: false,
        enableVibrate: true,
        enableLights: true,
        showBadge: true,
        sound: 'default',
      });

      // Test channel for debugging
      await Notifications.setNotificationChannelAsync('test-notifications', {
        name: 'Test Notifications',
        description: 'Test notifications for debugging push notification issues',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#F5F2B8',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: false,
        enableVibrate: true,
        enableLights: true,
        showBadge: true,
        sound: 'default',
      });

      console.log('✅ [createAndroidNotificationChannels] Android notification channels created successfully');
      console.log('📱 [createAndroidNotificationChannels] Channels: animo-notifications, class-reminders, class-updates, subscription-updates, test-notifications');
    } catch (error) {
      console.error('❌ [createAndroidNotificationChannels] Failed to create Android notification channels:', error);
      throw error;
    }
  }

  // Get the appropriate channel ID for different notification types
  private getChannelIdForNotificationType(type: string): string | undefined {
    if (Platform.OS !== 'android') {
      return undefined;
    }

    switch (type) {
      case 'class_reminder':
        return 'class-reminders';
      case 'class_cancellation':
      case 'class_update':
      case 'waitlist_promotion':
        return 'class-updates';
      case 'subscription_update':
      case 'payment_reminder':
        return 'subscription-updates';
      default:
        return 'animo-notifications';
    }
  }

  // Send notification with proper channel selection
  async sendNotificationWithChannel(
    title: string,
    body: string,
    data: any,
    type: string = 'general'
  ): Promise<void> {
    try {
      // Check if we're on web platform - notifications not supported
      const isWeb = typeof window !== 'undefined' && window.navigator && window.navigator.userAgent;
      
      if (isWeb) {
        console.log(`📱 [sendNotificationWithChannel] Web platform detected - popup notifications not supported`);
        console.log(`📱 [sendNotificationWithChannel] Would show: "${title}: ${body}"`);
        return;
      }

      const channelId = this.getChannelIdForNotificationType(type);
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
          badge: 1,
          ...(channelId && { channelId })
        },
        trigger: null // Send immediately
      });
      
      console.log(`✅ Notification sent with channel: ${channelId || 'default'}`);
    } catch (error) {
      console.error('❌ Failed to send notification with channel:', error);
      throw error; // Re-throw so calling code can handle gracefully
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
        channelId: Platform.OS === 'android' ? 'animo-notifications' : undefined,
        badge: 1,
      };



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
        // Success
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
        // Checking notification preferences
        
        const { data: userSettings } = await supabase
          .from('notification_settings')
          .select('enable_notifications, enable_push_notifications, class_reminders')
          .eq('user_id', userId)
          .single();
        
        // Check if reminders are enabled (default true if no settings)
        const shouldSendReminder = userSettings ? 
          ((userSettings.enable_notifications ?? true) && 
           (userSettings.enable_push_notifications ?? true) && 
           (userSettings.class_reminders ?? true)) : true;
        
        if (!shouldSendReminder) {
                  // User has disabled class reminders
        return;
      }
      
      // User will receive class reminder
      }
      
      // Get translated notification content
      const { default: NotificationTranslationService } = await import('./notificationTranslationService');
      const translatedContent = await NotificationTranslationService.createTranslatedNotification(
        userId || 'default',
        'class_reminder',
        {
          type: 'class_reminder',
          className: className,
          instructorName: instructorName,
          minutes: minutesBeforeClass
        }
      );
      
      const title = translatedContent.title;
      const body = translatedContent.body;
      
      if (!this.pushToken) {
        return;
      }

      // Check if we're running on web platform
      const isWeb = typeof window !== 'undefined' && window.navigator && window.navigator.userAgent;
      
      if (isWeb) {
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
        // Success
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
              // Scheduling class reminders
      
      // First, cancel ALL existing class reminders for this user to prevent duplicates
      await this.cancelAllClassReminders(userId);
      
      // Get user's notification settings from the notification_settings table
      const { data: userSettings, error: settingsError } = await supabase
        .from('notification_settings')
        .select('enable_notifications, default_reminder_minutes')
        .eq('user_id', userId)
        .single();
      
      // Check if reminders are enabled (default true if no settings)
      const shouldScheduleReminders = userSettings ? (userSettings.enable_notifications ?? true) : true;
      
      if (!shouldScheduleReminders) {
        // User has disabled class reminders
        return;
      }
      
      const reminderMinutes = userSettings?.default_reminder_minutes || 15; // Default 15 minutes before
      
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
        // No upcoming classes found
        return;
      }
      
      // Get user's push token
      const { data: userData } = await supabase
        .from('users')
        .select('push_token')
        .eq('id', userId)
        .single();

      if (!userData?.push_token) {
        return;
      }

      for (const booking of bookings) {
        const classInfo = booking.classes as any;
        if (classInfo) {
          const classDateTime = new Date(`${classInfo.date}T${classInfo.time}`);
          const reminderTime = new Date(classDateTime.getTime() - (reminderMinutes * 60 * 1000));
          const now = new Date();
          
          // Schedule iOS local notification for the user's chosen time
          if (reminderTime > now) {
                    // Scheduling iOS local notification
            
            try {
              // Get translated notification content
              const { default: NotificationTranslationService } = await import('./notificationTranslationService');
              const translatedContent = await NotificationTranslationService.createTranslatedNotification(
                userId,
                'class_reminder',
                {
                  type: 'class_reminder',
                  className: classInfo.name,
                  instructorName: classInfo.users?.name || 'your instructor',
                  minutes: reminderMinutes
                }
              );

              // Schedule iOS local notification (works even when app is closed)
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: translatedContent.title,
                  body: translatedContent.body,
                  sound: true,
                  badge: 1,
                  data: {
                    type: 'class_reminder',
                    classId: classInfo.id,
                    className: classInfo.name,
                    userId: userId
                  }
                },
                trigger: { type: SchedulableTriggerInputTypes.DATE, date: reminderTime }
              });
              
              // iOS local notification scheduled
              
              // Also store in database for record keeping
              await supabase
                .from('notifications')
                .insert({
                  user_id: userId,
                  title: translatedContent.title,
                  message: translatedContent.body,
                  type: 'class_reminder',
                  scheduled_for: reminderTime.toISOString(),
                  metadata: {
                    type: 'class_reminder',
                    classId: classInfo.id,
                    bookingId: booking.id,
                    userId,
                    className: classInfo.name,
                    instructorName: classInfo.users?.name,
                    localNotificationScheduled: true
                  },
                  is_read: false
                });
                
            } catch (notificationError) {
              console.error(`❌ Failed to schedule iOS notification for class ${classInfo.name}:`, notificationError);
            }
          }
        }
      }
      
              // Finished scheduling reminders
    } catch (error) {
      console.error(`❌ [pushNotificationService] Failed to schedule class reminders for user ${userId}:`, error);
    }
  }

  // Cancel ALL class reminder notifications for a user to prevent duplicates
  async cancelAllClassReminders(userId: string): Promise<void> {
    try {
              // Canceling all existing reminders
      
      // Get all scheduled notifications for this user
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const userReminders = scheduledNotifications.filter(notification => 
        notification.content.data?.type === 'class_reminder' &&
        notification.content.data?.userId === userId
      );
      
      // Cancel each matching notification
      for (const notification of userReminders) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
      
      // Also remove from database
      await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId)
        .eq('type', 'class_reminder');
    } catch (error) {
      console.error(`❌ [pushNotificationService] Error canceling all reminders:`, error);
    }
  }

  // Cancel existing class reminder notifications to prevent duplicates
  async cancelClassReminder(userId: string, classId: string | number): Promise<void> {
    try {
      // Check if we're on web platform - notifications not supported
      const isWeb = typeof window !== 'undefined' && window.navigator && window.navigator.userAgent;
      
      if (isWeb) {
        console.log(`📱 [cancelClassReminder] Web platform detected - scheduled notifications not supported`);
        return;
      }

      // Canceling existing reminders
      
      // Get all scheduled notifications for this user and class
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const classReminders = scheduledNotifications.filter(notification => 
        notification.content.data?.type === 'class_reminder' &&
        notification.content.data?.userId === userId &&
        notification.content.data?.classId?.toString() === classId.toString()
      );
      
      // Cancel each matching notification
      for (const notification of classReminders) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
      
      // Also remove from database - get all notifications for this user and filter in JS
      const { data: userNotifications } = await supabase
        .from('notifications')
        .select('id, metadata')
        .eq('user_id', userId)
        .eq('type', 'class_reminder');

      if (userNotifications && userNotifications.length > 0) {
        // Filter notifications that match this class ID (check both metadata formats)
        const notificationsToDelete = userNotifications.filter(notification => {
          const metadata = notification.metadata;
          if (!metadata) return false;
          
          // Check both possible formats: classId (camelCase) and class_id (snake_case)
          const metadataClassId = metadata.classId || metadata.class_id;
          return metadataClassId && metadataClassId.toString() === classId.toString();
        });

        if (notificationsToDelete.length > 0) {
          const notificationIds = notificationsToDelete.map(n => n.id);
          await supabase
            .from('notifications')
            .delete()
            .in('id', notificationIds);
          
          console.log(`🗑️ [cancelClassReminder] Deleted ${notificationIds.length} database notifications`);
        }
      }
    } catch (error) {
      console.error(`❌ [pushNotificationService] Error canceling reminders:`, error);
    }
  }

  // Schedule reminder for a specific class only (performance optimization)
  async scheduleClassReminder(userId: string, classId: string | number): Promise<void> {
    try {
      // Check if we're on web platform - notifications not supported
      const isWeb = typeof window !== 'undefined' && window.navigator && window.navigator.userAgent;
      
      if (isWeb) {
        console.log(`📱 [scheduleClassReminder] Web platform detected - scheduled notifications not supported`);
        return;
      }

      // First, cancel any existing notifications for this user and class to prevent duplicates
      await this.cancelClassReminder(userId, classId);
      
      // Get user's notification settings
      const { data: userSettings, error: settingsError } = await supabase
        .from('notification_settings')
        .select('enable_notifications, default_reminder_minutes')
        .eq('user_id', userId)
        .single();
      
      // Check if reminders are enabled (default true if no settings)
      const shouldScheduleReminders = userSettings ? (userSettings.enable_notifications ?? true) : true;
      
      if (!shouldScheduleReminders) {
        // User has disabled class reminders
        return;
      }

      // Get the specific class booking
      const { data: booking } = await supabase
        .from('bookings')
        .select(`
          id,
          classes (
            id, name, date, time, instructor_id,
            users!classes_instructor_id_fkey (name)
          )
        `)
        .eq('user_id', userId)
        .eq('class_id', classId)
        .eq('status', 'confirmed')
        .single();

      if (!booking || !booking.classes) {
        // No confirmed booking found
        return;
      }
      
      // Type assertion to fix TypeScript error - classes is a single object, not an array
      const classInfo = booking.classes as any;
      const classDateTime = new Date(`${classInfo.date} ${classInfo.time}`);
      const now = new Date();

      // Only schedule if class is in the future
      if (classDateTime <= now) {
        // Class is in the past, skipping reminder
        return;
      }

      const reminderMinutes = userSettings?.default_reminder_minutes || 15;
      
      const reminderTime = new Date(classDateTime.getTime() - (reminderMinutes * 60 * 1000));

      if (reminderTime > now) {
        // Scheduling iOS local notification

        try {
          // Get translated notification content
          const { default: NotificationTranslationService } = await import('./notificationTranslationService');
          const translatedContent = await NotificationTranslationService.createTranslatedNotification(
            userId,
            'class_reminder',
            {
              type: 'class_reminder',
              className: classInfo.name,
              instructorName: classInfo.users?.name || 'your instructor',
              minutes: reminderMinutes
            }
          );

          // Schedule local notification (works even when app is closed)
          await Notifications.scheduleNotificationAsync({
            content: {
              title: translatedContent.title,
              body: translatedContent.body,
              sound: true,
              badge: 1,
              data: {
                type: 'class_reminder',
                classId: classInfo.id,
                className: classInfo.name,
                userId: userId
              }
            },
            trigger: { type: SchedulableTriggerInputTypes.DATE, date: reminderTime }
          });

          // Also store in database for record keeping
          await supabase
            .from('notifications')
            .insert({
              user_id: userId,
              title: translatedContent.title,
              message: translatedContent.body,
              type: 'class_reminder',
              scheduled_for: reminderTime.toISOString(),
              metadata: {
                type: 'class_reminder',
                classId: classInfo.id,
                bookingId: booking.id,
                userId,
                className: classInfo.name,
                instructorName: classInfo.users?.name,
                localNotificationScheduled: true,
                language: translatedContent.userLanguage
              },
              is_read: false
            });
                
        } catch (notificationError) {
          console.error(`❌ Failed to schedule iOS notification for class ${classInfo.name}:`, notificationError);
        }
      }

    } catch (error) {
      console.error(`❌ [pushNotificationService] Error scheduling reminder for user ${userId}, class ${classId}:`, error);
    }
  }

  // Public method for testing re-registration (accessible from UI)
  async testReregistration(): Promise<{ success: boolean; message: string; token?: string }> {
    try {
      console.log('🧪 [testReregistration] Starting test re-registration from UI...');
      
      await this.forceTokenReregistration();
      
      const token = this.pushToken;
      if (token) {
        console.log('✅ [testReregistration] Test re-registration successful!');
        return {
          success: true,
          message: 'Push notification re-registration successful!',
          token: token.substring(0, 50) + '...'
        };
      } else {
        console.log('❌ [testReregistration] Test re-registration failed - no token obtained');
        return {
          success: false,
          message: 'Re-registration failed: No push token obtained'
        };
      }
    } catch (error) {
      console.error('❌ [testReregistration] Test re-registration error:', error);
      return {
        success: false,
        message: `Re-registration failed: ${error}`
      };
    }
  }

}

export const pushNotificationService = new PushNotificationService(); 