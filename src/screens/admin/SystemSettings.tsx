import { useThemeColor } from '@/hooks/useThemeColor';
import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import {
  Button,
  Card,
  Paragraph,
  TextInput,
  Title
} from 'react-native-paper';
import { useAppDispatch } from '../../store';
import { logoutUser } from '../../store/authSlice';

function SystemSettings() {
  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const surfaceColor = useThemeColor({}, 'surface');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const textMutedColor = useThemeColor({}, 'textMuted');
  const accentColor = useThemeColor({}, 'accent');
  const errorColor = useThemeColor({}, 'error');

  const dispatch = useAppDispatch();

  // Studio Settings State
  const [studioSettings, setStudioSettings] = useState({
    studioName: 'ANIMO Pilates Studio',
    email: 'info@animopilates.com',
    phone: '+1 (555) 123-4567',
    address: '123 Wellness Street, City, State 12345',
  });

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await dispatch(logoutUser());
          },
        },
      ]
    );
  };

  const handleSaveStudioSettings = () => {
    Alert.alert('Success', 'Studio settings updated successfully!');
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={[styles.header, { backgroundColor: surfaceColor, borderBottomWidth: 1, borderBottomColor: textMutedColor }]}>
        <Title style={[styles.headerTitle, { color: textColor }]}>Settings</Title>
        <Paragraph style={[styles.headerSubtitle, { color: textSecondaryColor }]}>Configure studio information</Paragraph>
      </View>

      <ScrollView style={styles.content}>
        <Card style={[styles.card, { backgroundColor: surfaceColor, borderColor: textMutedColor }]}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="business" size={24} color={accentColor} />
              <Title style={[styles.sectionTitle, { color: textColor }]}>Studio Information</Title>
            </View>

            <TextInput
              label="Studio Name"
              value={studioSettings.studioName}
              onChangeText={(text) => setStudioSettings({...studioSettings, studioName: text})}
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="Email"
              value={studioSettings.email}
              onChangeText={(text) => setStudioSettings({...studioSettings, email: text})}
              mode="outlined"
              keyboardType="email-address"
              style={styles.input}
            />
            <TextInput
              label="Phone"
              value={studioSettings.phone}
              onChangeText={(text) => setStudioSettings({...studioSettings, phone: text})}
              mode="outlined"
              keyboardType="phone-pad"
              style={styles.input}
            />
            <TextInput
              label="Address"
              value={studioSettings.address}
              onChangeText={(text) => setStudioSettings({...studioSettings, address: text})}
              mode="outlined"
              multiline
              numberOfLines={2}
              style={styles.input}
            />

            <Button
              mode="contained"
              onPress={handleSaveStudioSettings}
              style={[styles.saveButton, { backgroundColor: accentColor }]}
            >
              Save Settings
            </Button>
          </Card.Content>
        </Card>

        <Card style={[styles.card, { backgroundColor: surfaceColor, borderColor: textMutedColor }]}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="exit-to-app" size={24} color={errorColor} />
              <Title style={[styles.sectionTitle, { color: textColor }]}>Account</Title>
            </View>

            <Paragraph style={[styles.logoutDescription, { color: textSecondaryColor }]}>
              Sign out of your administrator account
            </Paragraph>

            <Button
              mode="outlined"
              onPress={handleLogout}
              style={[styles.logoutButton, { borderColor: errorColor }]}
              labelStyle={{ color: errorColor }}
              icon="logout"
            >
              Logout
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor will be overridden by inline style
  },
  header: {
    padding: 20,
    paddingTop: 60,
    // backgroundColor, borderBottomWidth, borderBottomColor will be overridden by inline style
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    // color will be overridden by inline style
  },
  headerSubtitle: {
    marginTop: 5,
    // color will be overridden by inline style
  },
  content: {
    flex: 1,
    padding: 15,
  },
  card: {
    marginBottom: 20,
    borderRadius: 8,
    padding: 16,
    elevation: 2,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    borderWidth: 1,
    // backgroundColor and borderColor will be overridden by inline style
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    // color will be overridden by inline style
  },
  input: {
    marginBottom: 15,
  },
  saveButton: {
    marginTop: 10,
    // backgroundColor will be overridden by inline style
  },
  logoutDescription: {
    marginBottom: 20,
    // color will be overridden by inline style
  },
  logoutButton: {
    marginTop: 10,
    // borderColor will be overridden by inline style
  },
});

export default SystemSettings; 