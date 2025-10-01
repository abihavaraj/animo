import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import React, { useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, Text, View } from 'react-native';
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
  const [targetUserEmail, setTargetUserEmail] = useState<string>('argjend@argjend.com');
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [firebaseVerification, setFirebaseVerification] = useState<string>('Not checked');

  useEffect(() => {
    gatherDebugInfo();
    checkNotificationStatus();
    setDeviceInfo(`${Device.modelName} (${Platform.OS})`);
    loadAvailableUsers();
    
    // Always use the hardcoded project ID for production reliability
    const projectId = 'd4bdbfc4-ecbc-40d7-aabb-ad545c836ab3';
    
    setProjectId(projectId);
  }, []);

  const loadAvailableUsers = async () => {
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('id, name, email, push_token')
        .not('push_token', 'is', null)
        .order('name');

      if (error) {
        console.error('❌ Failed to load users:', error);
        return;
      }

      setAvailableUsers(users || []);
      console.log(`👥 Loaded ${users?.length || 0} users with push tokens`);
    } catch (error) {
      console.error('❌ Error loading users:', error);
    }
  };

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

  // Create test notification in app's notification system
  const createInAppTestNotification = async () => {
    try {
      console.log('📱 [createInAppTestNotification] Creating test notification in app system...');
      
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        console.log('❌ No user logged in');
        return;
      }

      // Create notification directly in database so it shows in notification menu
      const testNotification = {
        user_id: currentUser.id,
        title: '🧪 In-App Test Notification',
        message: 'This test notification will appear in your notification menu! Check the notification icon in the top menu.',
        type: 'test',
        is_read: false,
        scheduled_for: new Date().toISOString(),
        created_at: new Date().toISOString(),
        metadata: {
          source: 'expo_go_test',
          timestamp: new Date().toISOString()
        }
      };

      const { error } = await supabase
        .from('notifications')
        .insert(testNotification);

      if (error) {
        console.error('❌ Failed to create in-app notification:', error);
      } else {
        console.log('✅ In-app test notification created! Check your notification menu.');
        
        // Also trigger a local notification
        await handleTestLocalNotification();
      }
      
    } catch (error) {
      console.error('❌ [createInAppTestNotification] Error:', error);
    }
  };

  // Firebase verification test
  const verifyFirebaseConfiguration = async () => {
    try {
      console.log('🔥 [verifyFirebaseConfiguration] Starting Firebase verification...');
      setFirebaseVerification('Checking...');

      // 1. Check Firebase project configuration
      const expectedProjectId = 'animostudio-3b804';
      const expectedPackageName = 'com.animo.pilatesstudio';
      
      console.log('🔥 Expected Firebase Project ID:', expectedProjectId);
      console.log('🔥 Expected Package Name:', expectedPackageName);
      
      // 2. Test if Firebase is responding with fresh token
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (currentUser) {
        // Get user data to check existing token
        const { data: userData } = await supabase
          .from('users')
          .select('push_token')
          .eq('id', currentUser.id)
          .single();
        
        // Determine token based on platform (same logic as test notification)
        let tokenToUse;
        if (Platform.OS === 'ios' && userData?.push_token) {
          tokenToUse = userData.push_token;
          console.log('🍎 [verifyFirebaseConfiguration] Using stored iPhone token...');
        } else {
          console.log('🤖 [verifyFirebaseConfiguration] Generating fresh Android token...');
          const tokenResult = await pushNotificationService.testReregistration();
          if (!tokenResult.success || !tokenResult.token) {
            setFirebaseVerification('❌ Failed to generate token');
            return;
          }
          tokenToUse = tokenResult.token;
        }
        
        if (tokenToUse) {
        console.log('🔥 Testing minimal Firebase payload...');
        
        // Test with Firebase-optimized payload
        const firebaseTestResponse = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: tokenToUse,
            title: '🔥 Firebase Verification Test',
            body: 'Testing Firebase configuration...',
            android: {
              priority: 'high',
              ttl: 3600,
              collapse_key: 'firebase_test'
            }
          })
        });

        const fcmResult = await firebaseTestResponse.json();
        console.log('🔥 Firebase Test Response:', fcmResult);
        
        if (firebaseTestResponse.ok) {
          setFirebaseVerification('✅ Firebase Config Working');
        } else {
          setFirebaseVerification(`❌ FCM Error: ${JSON.stringify(fcmResult)}`);
        }
        } else {
          setFirebaseVerification('❌ Token generation failed');
        }
      } else {
        setFirebaseVerification('❌ No user logged in');
      }
      
    } catch (error) {
      console.error('🔥 Firebase verification failed:', error);
      setFirebaseVerification(`❌ Error: ${error}`);
    }
  };

  const testImmediateNotification = async () => {
    try {
      console.log(`🧪 [testImmediateNotification] Starting test for currently logged-in user...`);
      
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        console.log('❌ No user is currently logged in');
        return;
      }
      
      // Find user for display info and check tokens
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, name, email, push_token')
        .eq('id', currentUser.id)
        .single();

      if (userError || !userData) {
        console.error(`❌ Failed to find current user:`, userError);
        console.log(`❌ Could not find current user in database`);
        return;
      }

      console.log(`✅ Found current user ${userData.name || userData.email}:`, userData);
      
      // Determine which token to use based on platform
      let tokenToUse;
      let tokenSource;
      
      if (Platform.OS === 'ios') {
        // iPhone: Use stored token from users table (already working with Expo.dev)
        if (!userData.push_token) {
          console.log('❌ iPhone user has no push token in users table');
          return;
        }
        tokenToUse = userData.push_token;
        tokenSource = 'users.push_token (iPhone - stored ExponentPushToken)';
        console.log('🍎 iPhone detected - using stored ExponentPushToken from users table');
      } else {
        // Android: Generate fresh token to avoid FCM format issues
        console.log('🤖 Android detected - generating fresh ExponentPushToken...');
        const tokenResult = await pushNotificationService.testReregistration();
        
        if (!tokenResult.success || !tokenResult.token) {
          console.log('❌ Failed to generate fresh push token:', tokenResult.message);
          return;
        }
        
        tokenToUse = tokenResult.token;
        tokenSource = 'Fresh ExponentPushToken (Android - generated)';
        console.log('✅ Got fresh ExponentPushToken for Android');
      }
      
      // Log token info for debugging
      console.log('🔍 Token Debug:');
      console.log('   📱 Platform:', Platform.OS);
      console.log('   🎯 Using token:', tokenToUse.substring(0, 50) + '...');
      console.log('   📍 Token source:', tokenSource);
      console.log('   🗄️ Stored users.push_token:', userData.push_token ? userData.push_token.substring(0, 50) + '...' : 'None');
      console.log('   🔧 Full token length:', tokenToUse.length);
      
      console.log(`📱 Sending test notification to ${userData.name || userData.email}...`);
      console.log('🔧 EXACT TOKEN BEING SENT:', JSON.stringify(tokenToUse));

      const payload = {
        to: tokenToUse, // iPhone: users.push_token, Android: fresh ExponentPushToken
        title: `🎉 Test Notification for ${userData.name || userData.email}`,
        body: `Your push notifications are working perfectly!`,
        sound: 'default',
        priority: 'high',
        channelId: 'animo-notifications',
        android: {
          priority: 'max',
          visibility: 'public',
          importance: 'max',
          sound: true,
          vibrate: [0, 250, 250, 250],
          lights: true,
          channelId: 'animo-notifications',
          showWhen: true,
          when: Date.now(),
          autoCancel: true,
          ongoing: false,
          timeoutAfter: null,
          category: 'message'
        },
        data: { 
          test: true,
          userId: userData.id,
          type: 'admin_test' 
        }
      };

      console.log('🔧 EXACT PAYLOAD TO:', JSON.stringify(payload.to));

      // Send via Expo's push service
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      console.log('📤 Push notification result:', result);

      if (response.ok) {
        console.log(`✅ Test notification sent to ${userData.name || userData.email}!`);
        console.log('✅ Push notification sent successfully to argjend!');
      } else {
        console.log('❌ Failed to send push notification');
        console.error('❌ Failed to send push notification:', result);
      }
    } catch (error) {
      console.error('❌ Error sending test notification:', error);
      console.log(`❌ Failed to send test notification: ${error}`);
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
    try {
      console.log('🧪 [handleTestLocalNotification] Testing local notification for Expo Go...');
      
      // First check if permissions are granted
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        console.log('⚠️ Requesting notification permissions first...');
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        if (newStatus !== 'granted') {
          console.log('❌ Permissions not granted');
          return;
        }
      }

      // Schedule immediate local notification that works in Expo Go
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🧪 Expo Go Test Notification',
          body: 'This local notification works in Expo Go! Your notification system is working.',
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
          data: { 
            test: true,
            timestamp: new Date().toISOString(),
            source: 'expo_go_test'
          },
        },
        trigger: null, // Show immediately
      });
      
      console.log('✅ [handleTestLocalNotification] Local notification scheduled for Expo Go');
      
      // Also try a delayed notification to test different timing
      setTimeout(async () => {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '⏰ Delayed Expo Go Notification',
            body: 'This is a 3-second delayed notification test',
            sound: true,
          },
          trigger: null,
        });
        console.log('✅ Delayed notification sent');
      }, 3000);
      
    } catch (error) {
      console.error('❌ [handleTestLocalNotification] Failed:', error);
    }
  };

  const handleTestLocalNotificationWithIcon = async () => {
    try {
      console.log('🧪 [handleTestLocalNotificationWithIcon] Testing local notification with icon for Play Store...');
      
      // First check if permissions are granted
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        console.log('⚠️ Requesting notification permissions first...');
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        if (newStatus !== 'granted') {
          console.log('❌ Permissions not granted');
          return;
        }
      }

      // Schedule immediate local notification with icon configuration
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🧪 Play Store Test Notification',
          body: 'This notification includes the app icon and is optimized for Play Store! Check how it looks in production.',
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
          data: { 
            test: true,
            timestamp: new Date().toISOString(),
            source: 'play_store_test'
          },
        },
        trigger: null, // Show immediately
      });
      
      console.log('✅ [handleTestLocalNotificationWithIcon] Local notification with icon scheduled');
      
      // Also try a delayed notification with icon
      setTimeout(async () => {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '⏰ Delayed Play Store Notification',
            body: 'This is a 3-second delayed notification test with icon support',
            sound: true,
            data: {
              test: true,
              timestamp: new Date().toISOString(),
              source: 'play_store_delayed_test'
            }
          },
          trigger: null,
        });
        console.log('✅ Delayed notification with icon sent');
      }, 3000);
      
    } catch (error) {
      console.error('❌ [handleTestLocalNotificationWithIcon] Failed:', error);
    }
  };

  const handleTestLocalNotificationOriginal = async () => {
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
            <Paragraph>
              <Text style={{ fontWeight: 'bold' }}>Permission Status:</Text>
            </Paragraph>
            <Chip 
              icon="security" 
              style={[styles.chip, { backgroundColor: getPermissionColor() }]}
              textStyle={{ color: 'white' }}
            >
              {permissionStatus}
            </Chip>
            
            <Paragraph>
              <Text style={{ fontWeight: 'bold' }}>Device:</Text> {deviceInfo}
            </Paragraph>
            <Paragraph>
              <Text style={{ fontWeight: 'bold' }}>Build Info:</Text> {buildInfo}
            </Paragraph>
            <Paragraph>
              <Text style={{ fontWeight: 'bold' }}>Environment:</Text> {environmentInfo}
            </Paragraph>
            <Paragraph>
              <Text style={{ fontWeight: 'bold' }}>Project ID:</Text> {projectId}
            </Paragraph>
            <Paragraph>
              <Text style={{ fontWeight: 'bold' }}>Push Token:</Text> {pushToken.length > 50 ? pushToken.substring(0, 50) + '...' : pushToken}
            </Paragraph>
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

          <Button
            mode="contained"
            onPress={verifyFirebaseConfiguration}
            style={[styles.button, { backgroundColor: '#FF5722' }]}
            icon="whatshot"
          >
            🔥 Verify Firebase Configuration
          </Button>
          
          <Paragraph>
            <Text style={{ fontWeight: 'bold' }}>Firebase Status:</Text> {firebaseVerification}
          </Paragraph>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Title>🧪 Basic Notification Tests</Title>
          
          <Button
            mode="contained"
            onPress={createInAppTestNotification}
            style={[styles.button, { backgroundColor: '#E91E63' }]}
            icon="add-alert"
          >
            📱 CREATE IN-APP NOTIFICATION (Shows in Menu!)
          </Button>

           <Button
             mode="contained"
             onPress={handleTestLocalNotification}
             style={[styles.button, { backgroundColor: '#4CAF50' }]}
             icon="notification-important"
           >
             🧪 TEST LOCAL NOTIFICATION (Works in Expo Go!)
           </Button>
           
           <Button
             mode="contained"
             onPress={handleTestLocalNotificationWithIcon}
             style={[styles.button, { backgroundColor: '#FF5722' }]}
             icon="notifications"
           >
             🎯 TEST NOTIFICATION WITH ICON (Play Store Optimized!)
           </Button>
           
           <Button
             mode="contained"
             onPress={testImmediateNotification}
            style={[styles.button, { backgroundColor: '#2196F3' }]}
            icon="flash-on"
          >
            Test Immediate Push Notification
          </Button>
          
          <Button
            mode="contained"
            onPress={testDelayedNotification}
            style={[styles.button, { backgroundColor: '#FF9800' }]}
            icon="schedule"
          >
            Test Delayed Push Notification (3s)
          </Button>
          
          <Button
            mode="contained"
            onPress={handleTestLocalNotification}
            style={[styles.button, { backgroundColor: '#4CAF50' }]}
            icon="notifications"
          >
            Test Service Push Notification
          </Button>
          
          <Button
            mode="contained"
            onPress={handleTestClassReminder}
            style={[styles.button, { backgroundColor: '#9C27B0' }]}
            icon="calendar-today"
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