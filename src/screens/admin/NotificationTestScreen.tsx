import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import React, { useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, View } from 'react-native';
import { Button, Card, Chip, Paragraph, Title } from 'react-native-paper';
import { supabase } from '../../config/supabase.config';
import { pushNotificationService } from '../../services/pushNotificationService';

export default function NotificationTestScreen() {
  const [permissionStatus, setPermissionStatus] = useState<string>('undetermined');
  const [deviceInfo, setDeviceInfo] = useState<string>('Unknown');
  const [projectId, setProjectId] = useState<string>('Unknown');
  const [pushToken, setPushToken] = useState<string>('No token available');
  const [debugInfo, setDebugInfo] = useState<string>('Initializing...');
  const [buildInfo, setBuildInfo] = useState<string>('Unknown');
  const [environmentInfo, setEnvironmentInfo] = useState<string>('Unknown');

  useEffect(() => {
    gatherDebugInfo();
    checkNotificationStatus();
    setDeviceInfo(`${Device.modelName} (${Platform.OS})`);
    
    // Always use the hardcoded project ID for production reliability
    const projectId = 'd4bdbfc4-ecbc-40d7-aabb-ad545c836ab3';
    
    setProjectId(projectId);
  }, []);

  const gatherDebugInfo = async () => {
    try {
      // Environment detection
      const isDev = __DEV__;
      const platform = Platform.OS;
      const isDevice = Device.isDevice;
      const deviceType = Device.deviceType;
      const brand = Device.brand;
      const modelName = Device.modelName;
      
      // Build info
      setBuildInfo(`Device: ${isDevice ? 'Physical' : 'Simulator'} | Type: ${deviceType} | Brand: ${brand}`);
      setEnvironmentInfo(`Platform: ${platform} | Dev Mode: ${isDev} | Model: ${modelName}`);
      
      // Check app state
      const appStateInfo = `Active`;
      
      // Check notification permissions in detail
      const permissions = await Notifications.getPermissionsAsync();
      
      const debugDetails = [
        `🔍 ENVIRONMENT: ${isDev ? 'Development' : 'Production'}`,
        `📱 PLATFORM: ${platform}`,
        `🖥️ DEVICE: ${isDevice ? 'Physical Device' : 'Simulator/Emulator'}`,
        `📋 MODEL: ${modelName || 'Unknown'}`,
        `🏷️ BRAND: ${brand || 'Unknown'}`,
        `🎛️ DEVICE_TYPE: ${deviceType || 'Unknown'}`,
        `🔔 PERMISSIONS: ${JSON.stringify(permissions, null, 2)}`,
        `⚡ APP_STATE: ${appStateInfo}`,
        `🎯 PROJECT_ID: d4bdbfc4-ecbc-40d7-aabb-ad545c836ab3`,
      ].join('\n');
      
      setDebugInfo(debugDetails);
      
      console.log('🐛 FULL DEBUG INFO:');
      console.log(debugDetails);
      
    } catch (error) {
      console.error('Failed to gather debug info:', error);
      setDebugInfo(`Error gathering debug info: ${error}`);
    }
  };

  const checkNotificationStatus = async () => {
    try {
      console.log('🔍 [checkNotificationStatus] Starting notification status check...');
      
      const { status } = await Notifications.getPermissionsAsync();
      console.log('🔍 [checkNotificationStatus] Permission status:', status);
      setPermissionStatus(status);
      
      // First, check if the push service already has a token
      const serviceToken = pushNotificationService.getPushTokenValue();
      if (serviceToken) {
        console.log('✅ [checkNotificationStatus] Found existing push service token:', serviceToken.substring(0, 20) + '...');
        setPushToken(serviceToken);
        return;
      }
      
      console.log('⚠️ [checkNotificationStatus] No existing service token found');
      
      if (status === 'granted') {
        console.log('✅ [checkNotificationStatus] Permissions granted, attempting to get push token...');
        
        // Always use the hardcoded project ID for production reliability
        const projectId = 'd4bdbfc4-ecbc-40d7-aabb-ad545c836ab3';
        
        console.log('🎯 [checkNotificationStatus] Using Project ID:', projectId);
        console.log('📱 [checkNotificationStatus] Platform:', Platform.OS);
        console.log('🖥️ [checkNotificationStatus] Is Device:', Device.isDevice);
        console.log('🏗️ [checkNotificationStatus] Device Type:', Device.deviceType);
        
        try {
          const token = await Notifications.getExpoPushTokenAsync({
            projectId,
          });
          console.log('✅ [checkNotificationStatus] Successfully got push token:', token.data.substring(0, 20) + '...');
          setPushToken(token.data);
        } catch (tokenError) {
          console.error('❌ [checkNotificationStatus] Failed to get push token:', tokenError);
          console.error('❌ [checkNotificationStatus] Token error details:', JSON.stringify(tokenError, null, 2));
          setPushToken(`Error: ${tokenError}`);
        }
      } else {
        console.log('❌ [checkNotificationStatus] Permissions not granted:', status);
        setPushToken(`Permission ${status} - cannot get token`);
      }
    } catch (error) {
      console.error('❌ [checkNotificationStatus] Error checking notification status:', error);
      console.error('❌ [checkNotificationStatus] Error details:', JSON.stringify(error, null, 2));
      setPushToken(`Check failed: ${error}`);
    }
  };

  const requestPermissions = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      setPermissionStatus(status);
      
      if (status === 'granted') {
        // Always use the hardcoded project ID for production reliability
        const projectId = 'd4bdbfc4-ecbc-40d7-aabb-ad545c836ab3';
        
        console.log('Project ID being used:', projectId);
        
        const token = await Notifications.getExpoPushTokenAsync({
          projectId,
        });
        setPushToken(token.data);
        checkNotificationStatus();
      }
    } catch (error) {
      Alert.alert('Error', `Failed to request permissions: ${error}`);
    }
  };

  const testImmediateNotification = async () => {
    try {
      if (!pushToken || pushToken === 'No token available') {
        Alert.alert('Error', 'No push token available');
        return;
      }

      // Send via Expo's push service
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: pushToken,
          title: '🔔 Immediate Test',
          body: 'This is an immediate push notification test',
          data: { test: true },
          sound: 'default',
          priority: 'high',
          channelId: 'animo-notifications',
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Immediate push notification sent!');
      } else {
        Alert.alert('Error', 'Failed to send immediate push notification');
      }
    } catch (error) {
      Alert.alert('Error', `Failed to send immediate notification: ${error}`);
    }
  };

  const testDelayedNotification = async () => {
    try {
      if (!pushToken || pushToken === 'No token available') {
        Alert.alert('Error', 'No push token available');
        return;
      }

      // For delayed notifications, we'll store in Supabase and let backend handle timing
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: 'test-user',
          title: '⏰ Delayed Test',
          message: 'This notification was scheduled 3 seconds ago',
          type: 'system',
          scheduled_for: new Date(Date.now() + 3000).toISOString(), // 3 seconds from now
          metadata: {
            type: 'test',
            test: true,
            push_token: pushToken
          },
          is_read: false,
          created_at: new Date().toISOString()
        });

      if (error) {
        Alert.alert('Error', `Failed to schedule delayed notification: ${error.message}`);
      } else {
        Alert.alert('Success', 'Delayed push notification scheduled for 3 seconds!');
      }
    } catch (error) {
      Alert.alert('Error', `Failed to schedule delayed notification: ${error}`);
    }
  };

  const handleTestLocalNotification = async () => {
    await pushNotificationService.sendTestNotification();
  };

  const handleTestClassReminder = async () => {
    await pushNotificationService.sendClassReminder(
      'Morning Pilates Flow',
      'Sarah Wilson',
      5
    );
  };

  const handleInitializePushService = async () => {
    try {
      console.log('🔄 Manually initializing push notification service...');
      await pushNotificationService.initialize();
      
      // Wait a moment then check the token
      setTimeout(() => {
        const token = pushNotificationService.getPushTokenValue();
        if (token) {
          setPushToken(token);
        }
        checkNotificationStatus();
      }, 1000);
      
    } catch (error) {
      console.error('Failed to initialize push service:', error);
    }
  };

  const getPermissionColor = () => {
    switch (permissionStatus) {
      case 'granted': return '#4CAF50';
      case 'denied': return '#F44336';
      case 'undetermined': return '#FF9800';
      default: return '#9E9E9E';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title>🔍 Notification Debug Info</Title>
          
          <View style={styles.debugInfo}>
            <Paragraph><strong>Permission Status:</strong></Paragraph>
            <Chip 
              icon="security" 
              style={[styles.chip, { backgroundColor: getPermissionColor() }]}
              textStyle={{ color: 'white' }}
            >
              {permissionStatus}
            </Chip>
            
            <Paragraph><strong>Device:</strong> {deviceInfo}</Paragraph>
            <Paragraph><strong>Build Info:</strong> {buildInfo}</Paragraph>
            <Paragraph><strong>Environment:</strong> {environmentInfo}</Paragraph>
            <Paragraph><strong>Project ID:</strong> {projectId}</Paragraph>
            <Paragraph><strong>Push Token:</strong> {pushToken.length > 50 ? pushToken.substring(0, 50) + '...' : pushToken}</Paragraph>
          </View>

          {permissionStatus !== 'granted' && (
            <Button
              mode="contained"
              onPress={requestPermissions}
              style={[styles.button, { backgroundColor: '#FF9800' }]}
              icon="security"
            >
              Request Notification Permissions
            </Button>
          )}

          <Button
            mode="contained"
            onPress={handleInitializePushService}
            style={[styles.button, { backgroundColor: '#673AB7' }]}
            icon="refresh"
          >
            Initialize Push Service & Get Token
          </Button>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Title>🐛 Detailed Debug Information</Title>
          <ScrollView style={{ maxHeight: 200, backgroundColor: '#f5f5f5', padding: 10, marginVertical: 10 }}>
            <Paragraph style={{ fontFamily: 'monospace', fontSize: 12 }}>
              {debugInfo}
            </Paragraph>
          </ScrollView>
          
          <Button
            mode="outlined"
            onPress={() => {
              gatherDebugInfo();
              checkNotificationStatus();
            }}
            style={[styles.button, { borderColor: '#FF5722' }]}
            icon="refresh"
          >
            Refresh Debug Info
          </Button>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Title>🧪 Basic Notification Tests</Title>
          
          <Button
            mode="contained"
            onPress={testImmediateNotification}
            style={[styles.button, { backgroundColor: '#2196F3' }]}
            icon="flash"
          >
            Test Immediate Push Notification
          </Button>
          
          <Button
            mode="contained"
            onPress={testDelayedNotification}
            style={[styles.button, { backgroundColor: '#FF9800' }]}
            icon="clock"
          >
            Test Delayed Push Notification (3s)
          </Button>
          
          <Button
            mode="contained"
            onPress={handleTestLocalNotification}
            style={[styles.button, { backgroundColor: '#4CAF50' }]}
            icon="bell"
          >
            Test Service Push Notification
          </Button>
          
          <Button
            mode="contained"
            onPress={handleTestClassReminder}
            style={[styles.button, { backgroundColor: '#9C27B0' }]}
            icon="calendar"
          >
            Test Class Reminder Push Notification
          </Button>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Title>🚀 Advanced Tests</Title>
          
          <Button
            mode="contained"
            onPress={pushNotificationService.sendRemoteTestNotification}
            style={[styles.button, { backgroundColor: '#E91E63' }]}
            icon="rocket"
          >
            Test Remote Push Notification
          </Button>
          
          <Button
            mode="contained"
            onPress={() => {
              const command = pushNotificationService.getPowerShellCurlCommand();
              Alert.alert('PowerShell Command', command);
            }}
            style={[styles.button, { backgroundColor: '#607D8B' }]}
            icon="code"
          >
            Get PowerShell Test Command
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = {
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  card: {
    marginBottom: 16,
    elevation: 4,
  },
  debugInfo: {
    marginVertical: 16,
  },
  chip: {
    marginVertical: 8,
  },
  button: {
    marginVertical: 8,
  },
}; 