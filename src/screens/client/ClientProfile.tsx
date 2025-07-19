import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Dimensions, Linking, RefreshControl, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { Avatar, Button, Card, Chip, Modal, Portal, ProgressBar, Surface } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { Body, Caption, H1, H2 } from '../../../components/ui/Typography';
import { Colors as AppColors } from '../../../constants/Colors';
import { useThemeColor } from '../../../hooks/useThemeColor';
import { apiService } from '../../services/api';
import { AppDispatch, RootState } from '../../store';
import { logout, resetAppState } from '../../store/authSlice';
import { fetchCurrentSubscription } from '../../store/subscriptionSlice';

const { width } = Dimensions.get('window');

interface NotificationSettings {
  enableNotifications: boolean;
  reminderMinutes: number;
  emailNotifications: boolean;
  classUpdates: boolean;
}

function ClientProfile({ navigation }: any) {
  const { user } = useSelector((state: RootState) => state.auth);
  const { currentSubscription, isLoading } = useSelector((state: RootState) => state.subscriptions);
  const dispatch = useDispatch<AppDispatch>();
  
  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const surfaceColor = useThemeColor({}, 'surface');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const textMutedColor = useThemeColor({}, 'textMuted');
  const primaryColor = useThemeColor({}, 'primary');
  const accentColor = useThemeColor({}, 'accent');
  const successColor = useThemeColor({}, 'success');
  const warningColor = useThemeColor({}, 'warning');
  const errorColor = useThemeColor({}, 'error');
  
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    enableNotifications: true,
    reminderMinutes: 15,
    emailNotifications: true,
    classUpdates: true,
  });
  const [reminderModalVisible, setReminderModalVisible] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    dispatch(fetchCurrentSubscription());
    loadNotificationSettings();
  }, [dispatch]);

  // Add focus listener to refresh data when screen is focused
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 ClientProfile focused - refreshing subscription data');
      dispatch(fetchCurrentSubscription());
    }, [dispatch])
  );



  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      console.log('🔄 Manual refresh triggered - fetching latest subscription data');
      await dispatch(fetchCurrentSubscription()).unwrap();
      await loadNotificationSettings();
      console.log('✅ Data refreshed successfully');
    } catch (error) {
      console.error('❌ Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Enhanced subscription data processing with expiration check
  const subscriptionData = currentSubscription ? {
    planName: currentSubscription.plan_name || 'Unknown Plan',
    remainingClasses: Math.max(0, currentSubscription.remaining_classes || 0),
    monthlyClasses: Math.max(1, currentSubscription.monthly_classes || 1),
    monthlyPrice: currentSubscription.monthly_price || 0,
    equipmentAccess: currentSubscription.equipment_access || 'mat',
    status: currentSubscription.status || 'unknown',
    startDate: currentSubscription.start_date,
    endDate: currentSubscription.end_date,
    durationMonths: currentSubscription.duration_months || 1,
    isUnlimited: (currentSubscription.monthly_classes || 0) >= 999,
    isDayPass: (currentSubscription.duration_months || 1) < 1, // Detect day passes
    daysSinceStart: currentSubscription.start_date ? 
      Math.floor((new Date().getTime() - new Date(currentSubscription.start_date).getTime()) / (1000 * 60 * 60 * 24)) : 0,
    daysUntilEnd: currentSubscription.end_date ? 
      Math.max(0, Math.ceil((new Date(currentSubscription.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))) : 0,
    // Add expiration check
    isExpired: currentSubscription.end_date ? new Date(currentSubscription.end_date) < new Date() : false,
  } : null;

  // If subscription is expired but still showing, trigger immediate refresh
  useEffect(() => {
    if (subscriptionData && subscriptionData.isExpired && subscriptionData.status === 'active') {
      console.log('⚠️ Detected expired subscription still showing as active - forcing refresh');
      setTimeout(() => {
        dispatch(fetchCurrentSubscription());
      }, 1000);
    }
  }, [subscriptionData, dispatch]);

  const getProgressValue = () => {
    if (!subscriptionData) return 0;
    const usedClasses = subscriptionData.monthlyClasses - subscriptionData.remainingClasses;
    return subscriptionData.monthlyClasses > 0 ? usedClasses / subscriptionData.monthlyClasses : 0;
  };

  const getUsedClasses = () => {
    if (!subscriptionData) return 0;
    return subscriptionData.monthlyClasses - subscriptionData.remainingClasses;
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            await dispatch(logout());
            await dispatch(resetAppState());
          }
        }
      ]
    );
  };

  const handleWhatsAppContact = () => {
    const phoneNumber = '+355689400040';
    const message = 'Hello! I would like to inquire about my subscription and services at Animo Pilates.';
    const whatsappUrl = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
    
    Linking.canOpenURL(whatsappUrl)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(whatsappUrl);
        } else {
          // Fallback to web WhatsApp if app is not installed
          const webWhatsappUrl = `https://api.whatsapp.com/send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
          return Linking.openURL(webWhatsappUrl);
        }
      })
      .catch((err) => {
        console.error('Error opening WhatsApp:', err);
        Alert.alert('Error', 'Could not open WhatsApp. Please contact us directly at +355689400040');
      });
  };

  const handlePhoneCall = () => {
    const phoneNumber = '+355689400040';
    const phoneUrl = `tel:${phoneNumber}`;
    
    Linking.canOpenURL(phoneUrl)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(phoneUrl);
        } else {
          Alert.alert('Error', 'Phone calls are not supported on this device');
        }
      })
      .catch((err) => {
        console.error('Error making phone call:', err);
        Alert.alert('Error', 'Could not make phone call. Please dial +355689400040 manually');
      });
  };

  const getEquipmentColor = (equipment: string | undefined) => {
    switch (equipment) {
      case 'mat': return successColor;
      case 'reformer': return primaryColor;
      case 'both': return accentColor;
      default: return textMutedColor;
    }
  };

  const getEquipmentIcon = (equipment: string | undefined) => {
    switch (equipment) {
      case 'mat': return 'self-improvement';
      case 'reformer': return 'fitness-center';
      case 'both': return 'fitness-center';
      default: return 'help';
    }
  };

  const getProgressColor = (remaining: number | undefined, total: number | undefined) => {
    if (!remaining || !total) return textMutedColor;
    const percentage = remaining / total;
    if (percentage > 0.5) return successColor;
    if (percentage > 0.25) return warningColor;
    return errorColor;
  };

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case 'active': return successColor;
      case 'expired': return errorColor;
      case 'cancelled': return warningColor;
      default: return textMutedColor;
    }
  };

  const loadNotificationSettings = async () => {
    try {
      console.log('📱 Loading notification settings...');
      const response = await apiService.get('/notifications/settings');
      if (response.success && response.data) {
        setNotificationSettings(response.data as NotificationSettings);
      }
      console.log('✅ Notification settings loaded successfully');
    } catch (error) {
      console.error('❌ Error loading notification settings:', error);
    }
  };

  const saveNotificationSettings = async () => {
    setSavingSettings(true);
    try {
      const response = await apiService.put('/notifications/settings', notificationSettings);
      if (response.success) {
        Alert.alert('Success', 'Notification preferences saved successfully');
      } else {
        throw new Error(response.error || 'Failed to save settings');
      }
    } catch (error) {
      Alert.alert('Error', `Failed to save notification preferences: ${error}`);
    } finally {
      setSavingSettings(false);
    }
  };

  const updateNotificationSetting = (key: keyof NotificationSettings, value: boolean | number) => {
    setNotificationSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor }]}>
        <Body style={{ color: textColor }}>Loading subscription information...</Body>
      </View>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Header */}
      <View style={[styles.headerImproved, { backgroundColor: surfaceColor, borderBottomWidth: 1, borderBottomColor: textMutedColor }]}>
        <View style={styles.headerContent}>
          <Avatar.Text 
            size={60} 
            label={user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            style={styles.avatarImproved}
          />
          <View style={styles.headerText}>
            <H1 style={{...styles.nameImproved, color: textColor }}>{user?.name || 'User'}</H1>
            <Body style={{...styles.emailImproved, color: textSecondaryColor }}>{user?.email || 'No email'}</Body>
            <Chip 
              style={[styles.roleChip, { backgroundColor: 'transparent', borderColor: accentColor }]}
              textStyle={{...styles.roleChipText, color: accentColor }}
              icon="account"
            >
              {user?.role || 'client'}
            </Chip>
          </View>
        </View>
      </View>

      {/* Current Subscription */}
      {subscriptionData ? (
        <Card style={[styles.cardImproved, { backgroundColor: surfaceColor }]}>
          <Card.Content style={styles.cardContentImproved}>
            <View style={styles.sectionHeaderImproved}>
              <View style={styles.sectionTitleRow}>
                <MaterialIcons name="card-membership" size={24} color={primaryColor} style={styles.sectionIcon} />
                <H2 style={{ ...styles.sectionTitle, color: textColor }}>
                  {subscriptionData.isDayPass ? 'Current Day Pass' : 'Current Subscription'}
                </H2>
              </View>
            </View>
            
            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressHeader}>
                <Body style={{ ...styles.progressTitle, color: textColor }}>
                  {subscriptionData.isDayPass ? 'Day Pass' : 
                   subscriptionData.isUnlimited ? 'Unlimited Classes' : 'Class Usage'}
                </Body>
                <Body style={{ ...styles.progressValue, color: getProgressColor(subscriptionData.remainingClasses, subscriptionData.monthlyClasses) }}>
                  {subscriptionData.isDayPass ? 
                    (subscriptionData.remainingClasses > 0 ? 'Valid' : 'Used') :
                    `${subscriptionData.remainingClasses} left`}
                </Body>
              </View>
              {!subscriptionData.isUnlimited && !subscriptionData.isDayPass && (
                <ProgressBar 
                  progress={getProgressValue()} 
                  color={getProgressColor(subscriptionData.remainingClasses, subscriptionData.monthlyClasses)}
                  style={styles.progressBar}
                />
              )}
              <Caption style={{ ...styles.progressSubtitle, color: textSecondaryColor }}>
                {subscriptionData.isDayPass ? 
                  `Valid for ${subscriptionData.monthlyClasses} class${subscriptionData.monthlyClasses === 1 ? '' : 'es'}` :
                 subscriptionData.isUnlimited ? 'Enjoy unlimited classes this month!' : 
                 `${getUsedClasses()} of ${subscriptionData.monthlyClasses} classes used`}
              </Caption>
            </View>

            <Surface style={[styles.subscriptionCard, { backgroundColor: `${primaryColor}08` }]}>
              {subscriptionData.status === 'active' && (
                <View style={styles.billingInfo}>
                  <View style={styles.billingItem}>
                    <MaterialIcons name="schedule" size={16} color={textSecondaryColor} />
                    <Caption style={{ ...styles.billingText, color: textSecondaryColor }}>
                      {subscriptionData.isDayPass ? 
                        (subscriptionData.daysUntilEnd <= 0 
                          ? 'Day pass expired'
                          : subscriptionData.daysUntilEnd === 1 
                            ? 'Expires today'
                            : `Expires in ${subscriptionData.daysUntilEnd} days`
                        ) :
                        (subscriptionData.daysUntilEnd <= 0 
                          ? 'Subscription expired'
                          : subscriptionData.daysUntilEnd > 0 
                            ? `${subscriptionData.daysUntilEnd} days until renewal`
                            : 'Renews today'
                        )
                      }
                    </Caption>
                  </View>
                </View>
              )}
            </Surface>
            
            {/* Subscription Details Grid */}
            <View style={styles.detailsGrid}>
              <View style={[styles.detailCard, { backgroundColor: surfaceColor }]}>
                <MaterialIcons 
                  name={getEquipmentIcon(subscriptionData.equipmentAccess)} 
                  size={24} 
                  color={getEquipmentColor(subscriptionData.equipmentAccess)} 
                />
                <Caption style={{ ...styles.detailCardLabel, color: textSecondaryColor }}>Equipment</Caption>
                <Body style={{ ...styles.detailCardValue, color: textColor }}>
                  {subscriptionData.equipmentAccess === 'both' ? 'Mat + Reformer' : 
                   subscriptionData.equipmentAccess === 'mat' ? 'Mat Only' : 'Reformer Only'}
                </Body>
              </View>
              
              <View style={[styles.detailCard, { backgroundColor: surfaceColor }]}>
                <MaterialIcons name="fitness-center" size={24} color={primaryColor} />
                <Caption style={{ ...styles.detailCardLabel, color: textSecondaryColor }}>Classes</Caption>
                <Body style={{ ...styles.detailCardValue, color: textColor }}>
                  {subscriptionData.isDayPass ? 
                    `${subscriptionData.monthlyClasses} Class${subscriptionData.monthlyClasses === 1 ? '' : 'es'}` :
                   subscriptionData.isUnlimited ? 'Unlimited' : 
                   `${subscriptionData.monthlyClasses}/month`}
                </Body>
              </View>
              
              <View style={[styles.detailCard, { backgroundColor: surfaceColor }]}>
                <MaterialIcons name="timeline" size={24} color={warningColor} />
                <Caption style={{ ...styles.detailCardLabel, color: textSecondaryColor }}>Member for</Caption>
                <Body style={{ ...styles.detailCardValue, color: textColor }}>
                  {subscriptionData.daysSinceStart} days
                </Body>
              </View>
              
              <View style={[styles.detailCard, { backgroundColor: surfaceColor }]}>
                <MaterialIcons 
                  name={subscriptionData.daysUntilEnd > (subscriptionData.isDayPass ? 0 : 7) ? "trending-up" : "report-problem"} 
                  size={24} 
                  color={subscriptionData.daysUntilEnd > (subscriptionData.isDayPass ? 0 : 7) ? successColor : warningColor} 
                />
                <Caption style={{ ...styles.detailCardLabel, color: textSecondaryColor }}>
                  {subscriptionData.isDayPass ? 'Validity' : 'Time Left'}
                </Caption>
                <Body style={{ ...styles.detailCardValue, color: textColor }}>
                  {subscriptionData.isDayPass ? 
                    (subscriptionData.daysUntilEnd <= 0 ? 'Expired' : 
                     subscriptionData.daysUntilEnd === 1 ? 'Today' : 
                     `${subscriptionData.daysUntilEnd} days`) :
                   (subscriptionData.daysUntilEnd <= 0 ? 'Expired' : `${subscriptionData.daysUntilEnd} days`)}
                </Body>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: textMutedColor }]} />

            <View style={styles.contactSection}>
              <Body style={{ ...styles.managedByReception, color: textSecondaryColor, textAlign: 'center' }}>
                📋 Your subscription is managed by our reception team. 
                {'\n'}For any changes or questions, please contact us:
              </Body>
              
              <View style={styles.contactButtons}>
                <Button 
                  mode="contained" 
                  style={[styles.whatsappButton, { backgroundColor: '#25D366' }]} 
                  labelStyle={{ color: 'white' }}
                  icon="message"
                  onPress={handleWhatsAppContact}
                >
                  WhatsApp
                </Button>
                <Button 
                  mode="outlined" 
                  style={[styles.phoneButton, { borderColor: accentColor }]} 
                  textColor={accentColor}
                  icon="phone"
                  onPress={handlePhoneCall}
                >
                  Call Us
                </Button>
              </View>
              
              <Caption style={{ ...styles.phoneNumber, color: textMutedColor, textAlign: 'center' }}>
                📞 +355 689 400 040
              </Caption>
            </View>
          </Card.Content>
        </Card>
      ) : (
        <Card style={[styles.cardImproved, styles.welcomeCard, { backgroundColor: surfaceColor }]}>
          <Card.Content style={styles.cardContentImproved}>
            <View style={styles.welcomeHeader}>
              <MaterialIcons name="sentiment-satisfied-alt" size={48} color={accentColor} />
              <H2 style={{ ...styles.welcomeTitle, color: textColor }}>Welcome to Animo Pilates!</H2>
              <Body style={{ ...styles.welcomeSubtitle, color: textSecondaryColor }}>
                Ready to start your Pilates journey? Our studio offers expert instruction and premium equipment.
              </Body>
            </View>
            
            <View style={styles.featuresList}>
              <View style={styles.featureItem}>
                <MaterialIcons name="self-improvement" size={24} color={successColor} />
                <Body style={{ ...styles.featureText, color: textColor }}>Mat & Reformer Classes</Body>
              </View>
              <View style={styles.featureItem}>
                <MaterialIcons name="star" size={24} color={warningColor} />
                <Body style={{ ...styles.featureText, color: textColor }}>Expert Certified Instructors</Body>
              </View>
              <View style={styles.featureItem}>
                <MaterialIcons name="schedule" size={24} color={primaryColor} />
                <Body style={{ ...styles.featureText, color: textColor }}>Flexible Scheduling</Body>
              </View>
              <View style={styles.featureItem}>
                <MaterialIcons name="group" size={24} color={accentColor} />
                <Body style={{ ...styles.featureText, color: textColor }}>Small Group Classes</Body>
              </View>
            </View>
            
            <View style={styles.ctaSection}>
              <Body style={{ ...styles.ctaText, color: textSecondaryColor }}>
                Get started today! Contact our reception team to select the perfect plan for you.
              </Body>
              
              <View style={styles.contactButtons}>
                <Button 
                  mode="contained" 
                  style={[styles.whatsappButton, { backgroundColor: '#25D366' }]} 
                  labelStyle={{ color: 'white' }}
                  icon="message"
                  onPress={handleWhatsAppContact}
                >
                  WhatsApp
                </Button>
                <Button 
                  mode="outlined" 
                  style={[styles.phoneButton, { borderColor: accentColor }]} 
                  textColor={accentColor}
                  icon="phone"
                  onPress={handlePhoneCall}
                >
                  Call Us
                </Button>
              </View>
              
              <Caption style={{ ...styles.phoneNumber, color: textMutedColor, textAlign: 'center' }}>
                📞 +355 689 400 040
              </Caption>
            </View>
          </Card.Content>
        </Card>
      )}

      <Card style={[styles.card, { backgroundColor: surfaceColor }]}>
        <Card.Content>
          <H2 style={{ color: textColor }}>Account Settings</H2>
          <View style={styles.accountInfo}>
            <View style={styles.infoItem}>
              <Body style={{ ...styles.label, color: textSecondaryColor }}>Name:</Body>
              <Body style={{ ...styles.value, color: textColor }}>{user?.name || 'Not set'}</Body>
            </View>
            <View style={styles.infoItem}>
              <Body style={{ ...styles.label, color: textSecondaryColor }}>Email:</Body>
              <Body style={{ ...styles.value, color: textColor }}>{user?.email || 'Not set'}</Body>
            </View>
            <View style={styles.infoItem}>
              <Body style={{ ...styles.label, color: textSecondaryColor }}>Phone:</Body>
              <Body style={{ ...styles.value, color: textColor }}>{user?.phone || 'Not set'}</Body>
            </View>
            {user?.emergency_contact && (
              <View style={styles.infoItem}>
                <Body style={{ ...styles.label, color: textSecondaryColor }}>Emergency Contact:</Body>
                <Body style={{ ...styles.value, color: textColor }}>{user.emergency_contact}</Body>
              </View>
            )}
          </View>
          
          <View style={styles.buttonContainer}>
            <Button 
              mode="outlined" 
              style={{ ...styles.editButton, borderColor: accentColor }} 
              textColor={accentColor} 
              icon="account-edit"
              onPress={() => navigation.navigate('EditProfile')}
            >
              Edit Profile
            </Button>
            <Button 
              mode="outlined" 
              style={{ ...styles.logoutButton, borderColor: errorColor }}
              onPress={handleLogout}
              icon="logout"
              textColor={errorColor}
            >
              Logout
            </Button>
          </View>
        </Card.Content>
      </Card>

      {/* Enhanced Notification Settings */}
      <Card style={[styles.cardImproved, { backgroundColor: surfaceColor }]}>
        <Card.Content style={styles.cardContentImproved}>
          <View style={styles.sectionHeaderImproved}>
            <View style={styles.sectionTitleRow}>
              <MaterialIcons name="notifications" size={24} color={primaryColor} style={styles.sectionIcon} />
              <H2 style={{ ...styles.sectionTitle, color: textColor }}>Notification Preferences</H2>
            </View>
          </View>
          
          <View style={styles.settingsSection}>
            <View style={styles.settingsRow}>
              <View style={styles.settingInfo}>
                <Body style={{ ...styles.settingTitle, color: textColor }}>📱 Push Notifications</Body>
                <Caption style={{ ...styles.settingDescription, color: textSecondaryColor }}>
                  Get push notifications on your device
                </Caption>
              </View>
              <Switch
                value={notificationSettings.enableNotifications}
                onValueChange={(value) => updateNotificationSetting('enableNotifications', value)}
                trackColor={{ false: textSecondaryColor, true: `${accentColor}60` }}
                thumbColor={notificationSettings.enableNotifications ? accentColor : textMutedColor}
              />
            </View>
            
            <View style={styles.settingsRow}>
              <View style={styles.settingInfo}>
                <Body style={{ ...styles.settingTitle, color: textColor }}>📧 Email Notifications</Body>
                <Caption style={{ ...styles.settingDescription, color: textSecondaryColor }}>
                  Receive class confirmations and updates via email
                </Caption>
              </View>
              <Switch
                value={notificationSettings.emailNotifications}
                onValueChange={(value) => updateNotificationSetting('emailNotifications', value)}
                trackColor={{ false: textSecondaryColor, true: `${accentColor}60` }}
                thumbColor={notificationSettings.emailNotifications ? accentColor : textMutedColor}
              />
            </View>
            
            <View style={styles.settingsRow}>
              <View style={styles.settingInfo}>
                <Body style={{ ...styles.settingTitle, color: textColor }}>📢 Class Updates</Body>
                <Caption style={{ ...styles.settingDescription, color: textSecondaryColor }}>
                  Get notified about class changes, cancellations
                </Caption>
              </View>
              <Switch
                value={notificationSettings.classUpdates}
                onValueChange={(value) => updateNotificationSetting('classUpdates', value)}
                trackColor={{ false: textSecondaryColor, true: `${accentColor}60` }}
                thumbColor={notificationSettings.classUpdates ? accentColor : textMutedColor}
              />
            </View>
            
            {notificationSettings.enableNotifications && (
              <View style={[styles.settingsRow, styles.reminderSection, { backgroundColor: `${accentColor}04` }]}>
                <View style={styles.settingInfo}>
                  <Body style={{ ...styles.settingTitle, color: textColor }}>⏰ Reminder Time</Body>
                  <Caption style={{ ...styles.settingDescription, color: textSecondaryColor }}>
                    How early do you want to be reminded before class?
                  </Caption>
                </View>
                <Button
                  mode="outlined"
                  onPress={() => setReminderModalVisible(true)}
                  style={{ ...styles.reminderButton, borderColor: accentColor }}
                  icon="clock"
                >
                  {notificationSettings.reminderMinutes} min
                </Button>
              </View>
            )}
          </View>
          
          <View style={[styles.divider, { backgroundColor: textMutedColor }]} />
          
          <Button
            mode="contained"
            onPress={saveNotificationSettings}
            style={{ ...styles.saveButton, backgroundColor: accentColor }}
            loading={savingSettings}
            disabled={savingSettings}
            icon={savingSettings ? undefined : "check"}
            labelStyle={{ color: backgroundColor }}
          >
            {savingSettings ? 'Saving...' : 'Save Preferences'}
          </Button>
        </Card.Content>
      </Card>

      <Portal>
        <Modal visible={reminderModalVisible} onDismiss={() => setReminderModalVisible(false)} contentContainerStyle={styles.modalContainer}>
          <H2 style={{ ...styles.modalTitle, color: textColor }}>Reminder Time</H2>
          <Body style={{ ...styles.modalText, color: textSecondaryColor }}>
            Choose how many minutes before your class you&apos;d like to be reminded:
          </Body>
          
          {[5, 10, 15, 30, 60].map((minutes) => (
            <Button
              key={minutes}
              mode={notificationSettings.reminderMinutes === minutes ? "contained" : "outlined"}
              onPress={() => {
                updateNotificationSetting('reminderMinutes', minutes);
                setReminderModalVisible(false);
              }}
              style={{ ...styles.reminderOption, borderColor: accentColor }}
              labelStyle={{ color: textColor }}
            >
              {minutes} minutes
            </Button>
          ))}
          
          <Button 
            mode="outlined" 
            onPress={() => setReminderModalVisible(false)}
            style={{ ...styles.modalButton, borderColor: accentColor }}
            textColor={accentColor}
          >
            Cancel
          </Button>
        </Modal>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: AppColors.light.background 
  },
  loadingContainer: { 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  headerImproved: { 
    padding: 24, 
    paddingTop: 60, 
  },
  headerContent: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  avatarImproved: { 
    backgroundColor: AppColors.light.accent, 
    elevation: 1,
    boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.06)'
  },
  headerText: { 
    marginLeft: 24, 
    flex: 1 
  },
  nameImproved: { 
    marginBottom: 4 
  },
  emailImproved: { 
    marginBottom: 8 
  },
  roleChip: { 
    backgroundColor: `${AppColors.light.textOnAccent}20`, 
    borderWidth: 1, 
    borderColor: `${AppColors.light.textOnAccent}30`,
    borderRadius: 12,
  },
  roleChipText: { 
    color: AppColors.light.textOnAccent, 
    fontSize: 11, 
  },
  cardImproved: { 
    margin: 16, 
    marginBottom: 8, 
    borderRadius: 16, 
    elevation: 1,
    boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.06)'
  },
  card: { 
    margin: 16, 
    marginBottom: 8,
    borderRadius: 16, 
    elevation: 1,
    boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.06)'
  },
  cardContentImproved: { 
    padding: 24 
  },
  sectionHeaderImproved: { 
    marginBottom: 20 
  },
  sectionTitleRow: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  sectionIcon: { 
    marginRight: 12 
  },
  sectionTitle: { 
    fontSize: 20, 
    fontWeight: '600' 
  },
  progressContainer: { 
    marginBottom: 20 
  },
  progressHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 8 
  },
  progressTitle: { 
    fontSize: 16, 
    fontWeight: '500' 
  },
  progressValue: { 
    fontSize: 16, 
    fontWeight: '700' 
  },
  progressBar: { 
    height: 8, 
    borderRadius: 4, 
    marginBottom: 8 
  },
  progressSubtitle: { 
    fontSize: 12 
  },
  subscriptionCard: { 
    padding: 16, 
    borderRadius: 12, 
    marginBottom: 16,
    elevation: 0,
    boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.04)'
  },
  billingInfo: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  billingItem: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  billingText: { 
    marginLeft: 8, 
    fontSize: 12 
  },
  detailsGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between',
    marginBottom: 16 
  },
  detailCard: { 
    width: (width - 80) / 2, 
    padding: 16, 
    borderRadius: 12, 
    alignItems: 'center', 
    marginBottom: 12,
    elevation: 0,
    boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.04)'
  },
  detailCardLabel: { 
    fontSize: 12, 
    marginTop: 8, 
    marginBottom: 4 
  },
  detailCardValue: { 
    fontSize: 14, 
    fontWeight: '600', 
    textAlign: 'center' 
  },
  divider: { 
    height: 1, 
    marginVertical: 16 
  },
  buttonContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginTop: 16 
  },
  contactSection: {
    alignItems: 'center',
  },
  managedByReception: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    marginBottom: 16,
  },
  contactButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 12,
    width: '100%',
  },
  whatsappButton: {
    flex: 1,
    maxWidth: 140,
    borderRadius: 12,
  },
  phoneButton: {
    flex: 1,
    maxWidth: 140,
    borderRadius: 12,
  },
  phoneNumber: {
    fontSize: 12,
    fontWeight: '500',
  },
  welcomeCard: { 
    backgroundColor: AppColors.light.surface,
    borderWidth: 1,
    borderColor: `${AppColors.light.primary}20`,
  },
  welcomeHeader: { 
    alignItems: 'center', 
    marginBottom: 24 
  },
  welcomeTitle: { 
    textAlign: 'center', 
    marginTop: 16, 
    marginBottom: 8 
  },
  welcomeSubtitle: { 
    textAlign: 'center', 
    lineHeight: 20 
  },
  featuresList: { 
    marginBottom: 24 
  },
  featureItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 12 
  },
  featureText: { 
    marginLeft: 12, 
    fontSize: 16 
  },
  ctaSection: { 
    alignItems: 'center' 
  },
  ctaText: { 
    textAlign: 'center', 
    marginBottom: 16, 
    lineHeight: 18 
  },
  accountInfo: { 
    marginVertical: 16 
  },
  infoItem: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingVertical: 8 
  },
  label: { 
    fontWeight: '500' 
  },
  value: { 
    textAlign: 'right', 
    flex: 1, 
    marginLeft: 16 
  },
  editButton: { 
    flex: 1, 
    marginRight: 8 
  },
  logoutButton: { 
    flex: 1, 
    marginLeft: 8 
  },
  settingsSection: { 
    marginBottom: 16 
  },
  settingsRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  settingInfo: { 
    flex: 1, 
    marginRight: 16 
  },
  settingTitle: { 
    fontSize: 16, 
    fontWeight: '500', 
    marginBottom: 4 
  },
  settingDescription: { 
    fontSize: 12, 
    lineHeight: 16 
  },
  reminderSection: { 
    borderRadius: 12, 
    padding: 16, 
    marginTop: 8 
  },
  reminderButton: { 
    minWidth: 80 
  },
  saveButton: { 
    paddingVertical: 4 
  },
  modalContainer: { 
    backgroundColor: AppColors.light.surface, 
    margin: 20, 
    borderRadius: 16, 
    padding: 24 
  },
  modalTitle: { 
    fontSize: 20, 
    fontWeight: '600', 
    marginBottom: 16, 
    textAlign: 'center' 
  },
  modalText: { 
    fontSize: 16, 
    marginBottom: 20, 
    textAlign: 'center', 
    lineHeight: 22 
  },
  reminderOption: { 
    marginBottom: 12 
  },
  modalButton: { 
    marginTop: 16 
  },
});

export default ClientProfile; 