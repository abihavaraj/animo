import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '../config/supabase.config';

// Completely safe notification handler setup
let notificationHandlerSet = false;
try {
  if (!notificationHandlerSet) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
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
      // Check if we have a valid project ID
      const projectId = process.env.EXPO_PROJECT_ID || process.env.EXPO_PUBLIC_PROJECT_ID;
      
      if (!projectId || projectId === 'default-project-id') {
        console.log('⚠️ No valid Expo project ID configured - push notifications disabled');
        return null;
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      });
      console.log('📱 Got push token successfully');
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
}

export const pushNotificationService = new PushNotificationService(); 