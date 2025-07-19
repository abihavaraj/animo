import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { apiService } from './api';

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
        console.log('❌ Push notification permission denied');
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
      if (!Device.isDevice) {
        return null;
      }

      // Multiple safety layers for token retrieval
      let token;
      try {
        // Attempt 1: Standard token retrieval
        const tokenResult = await Notifications.getExpoPushTokenAsync();
        
        if (tokenResult && tokenResult.data) {
          console.log('📱 Got push token successfully');
          return tokenResult.data;
        }
      } catch (tokenError) {
        console.log('⚠️ Standard push token failed (expected in development)');
        
        // Attempt 2: Try with explicit project ID if available
        try {
          const projectId = require('../../app.json').expo?.extra?.eas?.projectId;
          if (projectId) {
            const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId });
            if (tokenResult && tokenResult.data) {
              console.log('📱 Got push token with project ID');
              return tokenResult.data;
            }
          }
        } catch (projectTokenError) {
          console.log('⚠️ Project ID token also failed');
        }
      }

      console.log('⚠️ Could not retrieve push token (this is normal in development)');
      return null;

    } catch (error) {
      console.error('❌ Complete failure in push token retrieval:', error);
      return null;
    }
  }

  private async registerTokenWithServerSafely(token: string): Promise<void> {
    try {
      const response = await apiService.post('/users/register-push-token', {
        pushToken: token
      });

      if (response.success) {
        console.log('✅ Push token registered with server');
      } else {
        console.error('❌ Failed to register push token:', response.error);
      }

    } catch (error) {
      console.error('❌ Error registering push token:', error);
      // Never throw - server registration failure shouldn't crash app
    }
  }

  async setupNotificationListenersSafely(): Promise<void> {
    try {
      // Only set up listeners if notifications are available
      if (!this.isInitialized) {
        console.log('⚠️ Push notifications not initialized, skipping listeners');
        return;
      }

      // Wrap each listener setup individually
      try {
        Notifications.addNotificationReceivedListener(notification => {
          try {
            console.log('📱 Notification received:', notification);
          } catch (listenerError) {
            console.error('❌ Error in notification received listener:', listenerError);
          }
        });
      } catch (receivedError) {
        console.error('❌ Failed to set up received listener:', receivedError);
      }

      try {
        Notifications.addNotificationResponseReceivedListener(response => {
          try {
            console.log('📱 Notification tapped:', response);
            
            const data = response.notification.request.content.data;
            if (data?.classId) {
              console.log(`📅 Navigate to class ${data.classId}`);
            }
          } catch (responseError) {
            console.error('❌ Error in notification response listener:', responseError);
          }
        });
      } catch (responseListenerError) {
        console.error('❌ Failed to set up response listener:', responseListenerError);
      }

      console.log('✅ Notification listeners set up safely');
    } catch (error) {
      console.error('❌ Failed to set up notification listeners:', error);
      // Never throw - listener setup failure shouldn't crash app
    }
  }

  // Safe lazy initialization - call this when you actually need push notifications
  async lazyInitialize(): Promise<boolean> {
    if (!this.isInitialized && !this.initializationAttempted) {
      await this.initialize();
      if (this.isInitialized) {
        await this.setupNotificationListenersSafely();
      }
    }
    return this.isInitialized;
  }

  // Utility method to check if service is properly initialized
  isReady(): boolean {
    return this.isInitialized && this.pushToken !== null;
  }

  // Method to safely send local notifications
  async sendLocalNotificationSafely(title: string, body: string, data?: any): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        console.log('⚠️ Push notifications not initialized');
        return false;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
        },
        trigger: null, // Send immediately
      });

      return true;
    } catch (error) {
      console.error('❌ Failed to send local notification:', error);
      return false;
    }
  }

  // Get status without triggering initialization
  getStatus(): { initialized: boolean; hasToken: boolean; attempted: boolean } {
    return {
      initialized: this.isInitialized,
      hasToken: this.pushToken !== null,
      attempted: this.initializationAttempted
    };
  }
}

export const pushNotificationService = new PushNotificationService(); 