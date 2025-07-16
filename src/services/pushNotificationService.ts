import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { apiService } from './api';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

class PushNotificationService {
  private pushToken: string | null = null;

  async initialize(): Promise<void> {
    try {
      console.log('📱 Initializing push notifications...');

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('❌ Push notification permission denied');
        return;
      }

      // Get push token
      const token = await this.getPushToken();
      if (token) {
        this.pushToken = token;
        await this.registerTokenWithServer(token);
        console.log('✅ Push notifications initialized successfully');
      }

    } catch (error) {
      console.error('❌ Failed to initialize push notifications:', error);
    }
  }

  private async getPushToken(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        console.log('⚠️ Push notifications only work on physical devices');
        return null;
      }

      // Try to get push token without project ID first
      let token;
      try {
        token = await Notifications.getExpoPushTokenAsync();
      } catch (error) {
        console.log('⚠️ Failed to get Expo push token (this is expected in Expo Go)');
        console.log('📝 For real push notifications, you need:');
        console.log('   1. A development build (not Expo Go)');
        console.log('   2. Or run: npx create-expo-app --template');
        console.log('   3. Then: npx eas init');
        return null;
      }

      console.log('📱 Got push token:', token.data);
      return token.data;

    } catch (error) {
      console.error('❌ Failed to get push token:', error);
      return null;
    }
  }

  private async registerTokenWithServer(token: string): Promise<void> {
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
    }
  }

  async setupNotificationListeners(): Promise<void> {
    // Handle notification received while app is in foreground
    Notifications.addNotificationReceivedListener(notification => {
      console.log('📱 Notification received:', notification);
    });

    // Handle notification response (when user taps notification)
    Notifications.addNotificationResponseReceivedListener(response => {
      console.log('📱 Notification tapped:', response);
      
      const data = response.notification.request.content.data;
      if (data?.classId) {
        // Navigate to class details or relevant screen
        console.log(`📅 Navigate to class ${data.classId}`);
      }
    });
  }

  async sendTestNotification(): Promise<void> {
    try {
      // Send a local notification (works in Expo Go)
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🧘‍♀️ Pilates Class Reminder',
          body: 'Your class starts in 5 minutes! This is a test notification.',
          data: { test: true, classId: 1 },
        },
        trigger: null, // Send immediately
      });

      console.log('✅ Local test notification sent');
    } catch (error) {
      console.error('❌ Failed to send test notification:', error);
    }
  }

  async sendClassReminder(className: string, instructorName: string, minutesBefore: number = 5): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🧘‍♀️ Class Reminder',
          body: `Your "${className}" class with ${instructorName} starts in ${minutesBefore} minutes!`,
          data: { type: 'reminder', className, instructorName },
        },
        trigger: null,
      });

      console.log(`✅ Class reminder sent for: ${className}`);
    } catch (error) {
      console.error('❌ Failed to send class reminder:', error);
    }
  }

  getPushTokenValue(): string | null {
    return this.pushToken;
  }
}

export const pushNotificationService = new PushNotificationService(); 