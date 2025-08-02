import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import React, { useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Chip, Paragraph, Title } from 'react-native-paper';
import { pushNotificationService } from '../../services/pushNotificationService';

export default function NotificationTestScreen() {
  const [permissionStatus, setPermissionStatus] = useState<string>('Unknown');
  const [deviceInfo, setDeviceInfo] = useState<string>('');
  const [projectId, setProjectId] = useState<string>('');
  const [pushToken, setPushToken] = useState<string>('');

  useEffect(() => {
    checkNotificationStatus();
  }, []);

  const checkNotificationStatus = async () => {
    try {
      // Check permissions
      const permissions = await Notifications.getPermissionsAsync();
      setPermissionStatus(permissions.status);

      // Device info
      setDeviceInfo(`${Platform.OS} ${Platform.Version} - ${Device.isDevice ? 'Physical Device' : 'Simulator'}`);

      // Project ID
      const projId = Constants.expoConfig?.extra?.eas?.projectId || 'Not found';
      setProjectId(projId);

      // Push token
      const token = pushNotificationService.getPushTokenValue();
      setPushToken(token || 'Not generated');

    } catch (error) {
      console.error('Error checking notification status:', error);
    }
  };

  const requestPermissions = async () => {
    try {
      const result = await Notifications.requestPermissionsAsync();
      setPermissionStatus(result.status);
      Alert.alert('Permission Result', `Status: ${result.status}`);
      
      if (result.status === 'granted') {
        // Try to initialize push service again
        await pushNotificationService.initialize();
        checkNotificationStatus();
      }
    } catch (error) {
      Alert.alert('Error', `Failed to request permissions: ${error}`);
    }
  };

  const testImmediateNotification = async () => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🔔 Immediate Test',
          body: 'This is an immediate local notification test',
          data: { test: true },
        },
        trigger: null, // Immediate
      });
      Alert.alert('Success', 'Immediate notification sent!');
    } catch (error) {
      Alert.alert('Error', `Failed to send immediate notification: ${error}`);
    }
  };

  const testDelayedNotification = async () => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ Delayed Test',
          body: 'This notification was scheduled 3 seconds ago',
          data: { test: true },
        },
        trigger: { 
          seconds: 3,
          channelId: 'animo-notifications'
        },
      });
      Alert.alert('Success', 'Delayed notification scheduled for 3 seconds!');
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
            <Paragraph><strong>Project ID:</strong> {projectId}</Paragraph>
            <Paragraph><strong>Push Token:</strong> {pushToken.substring(0, 50)}...</Paragraph>
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
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Title>🧪 Basic Notification Tests</Title>
          <Paragraph style={styles.description}>
            Test basic notification functionality step by step.
          </Paragraph>
          
          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              onPress={testImmediateNotification}
              style={styles.button}
              icon="flash"
            >
              Test Immediate Notification
            </Button>
            
            <Button
              mode="contained"
              onPress={testDelayedNotification}
              style={styles.button}
                              icon="access-time"
            >
              Test Delayed Notification (3s)
            </Button>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Title>📱 Service-Based Tests</Title>
          <Paragraph style={styles.description}>
            Test using the push notification service.
          </Paragraph>
          
          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              onPress={handleTestLocalNotification}
              style={styles.button}
              icon="bell-ring"
            >
              Service Test Notification
            </Button>
            
            <Button
              mode="contained"
              onPress={handleTestClassReminder}
              style={styles.button}
              icon="yoga"
            >
              Service Class Reminder
            </Button>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Title>📋 Troubleshooting Guide</Title>
          <Paragraph style={styles.note}>
            <strong>If notifications aren't working:</strong>
            {'\n\n'}1. <strong>Check Permission Status above</strong> - must be "granted"
            {'\n'}2. <strong>For Expo Go:</strong> Only local notifications work, not push notifications
            {'\n'}3. <strong>For iOS:</strong> Check iOS Settings → ANIMO Pilates Studio → Notifications
            {'\n'}4. <strong>For Development Build:</strong> Push notifications should work
            {'\n'}5. <strong>Device Required:</strong> Notifications don't work in simulators
          </Paragraph>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  card: {
    marginBottom: 16,
  },
  description: {
    marginBottom: 16,
  },
  debugInfo: {
    marginBottom: 16,
  },
  chip: {
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    marginBottom: 8,
  },
  note: {
    fontStyle: 'italic',
    color: '#666',
    marginTop: 8,
    lineHeight: 22,
  },
}); 