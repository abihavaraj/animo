import React, { useState } from 'react';
import { Alert, Platform } from 'react-native';
import { Button, Card, Paragraph, Title } from 'react-native-paper';
import { pushNotificationService } from '../services/pushNotificationService';

interface PushTokenReRegistrationProps {
  onTokenRegistered?: (token: string) => void;
}

export default function PushTokenReRegistration({ onTokenRegistered }: PushTokenReRegistrationProps) {
  const [isRegistering, setIsRegistering] = useState(false);

  const handleReRegisterToken = async () => {
    try {
      setIsRegistering(true);
      
      // Enhanced web platform detection
      const isWeb = typeof window !== 'undefined' && window.navigator && window.navigator.userAgent;
      const isWebPlatform = Platform.OS === 'web' || isWeb;
      
      if (isWebPlatform) {
        Alert.alert(
          'Not Supported',
          'Push notifications are not supported on web. Please use the mobile app on your Android or iPhone device.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Force re-initialization of push notifications
      console.log('🔄 Re-registering push token...');
      console.log('🤖 Platform:', Platform.OS);
      
      // Use the new force re-registration method
      const success = await pushNotificationService.forceReRegistration();
      
      if (success) {
        // Get the new token
        const newToken = pushNotificationService.getPushTokenValue();
        
        if (newToken) {
          console.log('✅ Push token re-registered successfully');
          
          // Platform-specific success messages
          if (Platform.OS === 'android') {
            Alert.alert(
              'Success!',
              'Android push notifications have been re-registered! You should now receive notifications on this device. Make sure notifications are enabled in your device settings.',
              [{ text: 'OK' }]
            );
          } else {
            Alert.alert(
              'Success!',
              'Push notifications have been re-registered. You should now receive notifications.',
              [{ text: 'OK' }]
            );
          }
          
          if (onTokenRegistered) {
            onTokenRegistered(newToken);
          }
        } else {
          console.log('❌ Failed to get push token after re-registration');
          
          // Platform-specific error messages
          if (Platform.OS === 'android') {
            Alert.alert(
              'Registration Failed',
              'Unable to register Android push notifications. Please check:\n\n1. Notification permissions are enabled\n2. ANIMO app has notification access\n3. Battery optimization is disabled for ANIMO\n4. Try restarting the app',
              [{ text: 'OK' }]
            );
          } else {
            Alert.alert(
              'Registration Failed',
              'Unable to register push notifications. Please check your notification permissions and try again.',
              [{ text: 'OK' }]
            );
          }
        }
      } else {
        console.log('❌ Force re-registration failed');
        
        // Platform-specific error messages
        if (Platform.OS === 'android') {
          Alert.alert(
            'Registration Failed',
            'Failed to register Android push notifications. This might be due to:\n\n• Notification permissions not granted\n• Device restrictions\n• Network issues\n\nPlease check your device settings and try again.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            'Registration Failed',
            'Unable to register push notifications. Please check your notification permissions and try again.',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      console.error('❌ Error re-registering push token:', error);
      
      // Platform-specific error messages
      if (Platform.OS === 'android') {
        Alert.alert(
          'Error',
          'An error occurred while registering Android push notifications. Please check your device settings and try again.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Error',
          'An error occurred while re-registering push notifications. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setIsRegistering(false);
    }
  };

  // Enhanced web platform detection for render
  const isWeb = typeof window !== 'undefined' && window.navigator && window.navigator.userAgent;
  const isWebPlatform = Platform.OS === 'web' || isWeb;

  return (
    <Card style={{ margin: 16 }}>
      <Card.Content>
        <Title>🔔 Push Notifications</Title>
        <Paragraph>
          {isWebPlatform 
            ? 'Push notifications are only available on mobile devices. Please use the mobile app on your Android or iPhone device to register for notifications.'
            : Platform.OS === 'android' 
              ? 'If you\'re not receiving push notifications on Android, try re-registering your device. Make sure notification permissions are enabled in your device settings.'
              : 'If you\'re not receiving push notifications, try re-registering your device.'
          }
        </Paragraph>
        <Button
          mode="contained"
          onPress={handleReRegisterToken}
          loading={isRegistering}
          disabled={isRegistering || !!isWebPlatform}
          style={{ marginTop: 16 }}
        >
          {isWebPlatform 
            ? 'Use Mobile App for Notifications'
            : isRegistering 
              ? (Platform.OS === 'android' ? 'Re-registering Android...' : 'Re-registering...')
              : (Platform.OS === 'android' ? 'Re-register Android Push Notifications' : 'Re-register Push Notifications')
          }
        </Button>
      </Card.Content>
    </Card>
  );
}
