import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Paragraph, Title } from 'react-native-paper';
import { pushNotificationService } from '../../services/pushNotificationService';

export default function NotificationTestScreen() {
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

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title>🧪 Notification Testing</Title>
          <Paragraph style={styles.description}>
            Test the notification system. These are local notifications that work in Expo Go.
          </Paragraph>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Title>Local Notifications</Title>
          <Paragraph style={styles.description}>
            These notifications work within the app and will appear on your device immediately.
          </Paragraph>
          
          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              onPress={handleTestLocalNotification}
              style={styles.button}
              icon="bell-ring"
            >
              Send Test Notification
            </Button>
            
            <Button
              mode="contained"
              onPress={handleTestClassReminder}
              style={styles.button}
              icon="yoga"
            >
              Send Class Reminder
            </Button>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Title>Push Notification Status</Title>
          <Paragraph style={styles.description}>
            Push Token: {pushNotificationService.getPushTokenValue() || 'Not available (Expo Go limitation)'}
          </Paragraph>
          <Paragraph style={styles.note}>
            💡 For real push notifications to external devices, you need:
            {'\n'}• Development build (not Expo Go)
            {'\n'}• EAS project setup
            {'\n'}• Real device testing
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
  },
}); 