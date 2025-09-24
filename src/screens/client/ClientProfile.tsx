import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Dimensions, Linking, RefreshControl, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { Avatar, Button, Card, Chip, Modal, Portal, ProgressBar, Surface } from 'react-native-paper';
import { useSelector } from 'react-redux';
import { Body, Caption, H1, H2 } from '../../../components/ui/Typography';
import RainingHearts from '../../components/animations/RainingHearts';
import LanguageSelector from '../../components/LanguageSelector';
import { withChristmasDesign } from '../../components/withChristmasDesign';
import { useTheme } from '../../contexts/ThemeContext';
import { useThemeColor } from '../../hooks/useDynamicThemeColor';
import { notificationService } from '../../services/notificationService';
import { subscriptionService } from '../../services/subscriptionService';
import { RootState, useAppDispatch } from '../../store';
import { logoutUser } from '../../store/authSlice';
import { fetchCurrentSubscription } from '../../store/subscriptionSlice';
import { getResponsiveModalDimensions } from '../../utils/responsiveUtils';
import { SimpleDateCalculator } from '../../utils/simpleDateCalculator';
import { getFormattedAppVersion } from '../../utils/versionUtils';

const { width } = Dimensions.get('window');

interface NotificationSettings {
  enableNotifications: boolean;
  defaultReminderMinutes: number;
}

function ClientProfile({ navigation }: any) {
  const { t } = useTranslation();
  const { user } = useSelector((state: RootState) => state.auth);
  const { currentSubscription, isLoading } = useSelector((state: RootState) => state.subscriptions);
  const dispatch = useAppDispatch();
  const { refreshTheme } = useTheme();
  
  // Get responsive dimensions for modal
  const modalDimensions = getResponsiveModalDimensions('small');
  
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
  
  // Create dynamic styles with theme colors
  const styles = createStyles({
    background: backgroundColor,
    surface: surfaceColor, 
    text: textColor,
    textSecondary: textSecondaryColor,
    textOnAccent: textMutedColor,
    primary: primaryColor,
    accent: accentColor
  });
  
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    enableNotifications: true,
    defaultReminderMinutes: 15,
  });
  const [reminderModalVisible, setReminderModalVisible] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Only fetch on initial load if we don't have data
    if (!currentSubscription) {
      dispatch(fetchCurrentSubscription());
    }
    loadNotificationSettings();
  }, [dispatch]); // Removed currentSubscription dependency to prevent loops

  // Add focus listener to refresh data when screen is focused (always refresh to catch reception changes)
  useFocusEffect(
    useCallback(() => {
      // Clear badge when profile is focused
      try {
        Notifications.setBadgeCountAsync(0);
      } catch (error) {
        console.error('Failed to clear badge count on profile focus:', error);
      }
      
      // Always fetch the latest subscription data to catch any changes made by reception
      dispatch(fetchCurrentSubscription());
      
      // Trigger automatic subscription notification checks (runs max once per day)
      subscriptionService.checkAndSendAutomaticNotifications().catch(error => {
        console.error('Error in automatic notification check:', error);
      });
    }, [dispatch])
  );



  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Use parallel loading for better performance
      const [subscriptionResult, notificationResult] = await Promise.allSettled([
        dispatch(fetchCurrentSubscription()).unwrap(),
        loadNotificationSettings()
      ]);
      
      if (subscriptionResult.status === 'rejected') {
        console.error('❌ Failed to refresh subscription:', subscriptionResult.reason);
      }
      if (notificationResult.status === 'rejected') {
        console.error('❌ Failed to refresh notifications:', notificationResult.reason);
      }
    } catch (error) {
      console.error('❌ Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Enhanced subscription data processing with expiration check
  const subscriptionData = currentSubscription && currentSubscription.end_date ? (() => {
    const daysUntilEnd = SimpleDateCalculator.daysUntilExpiration(currentSubscription.end_date);
    
    // If subscription is expired (negative days until end), don't show it
    // Day 0 means expires today and should still be valid
    if (daysUntilEnd < 0) {
      return null;
    }
    
    return {
      planName: currentSubscription.plan_name || 'Unknown Plan',
      remainingClasses: Math.max(0, currentSubscription.remaining_classes || 0),
      monthlyClasses: Math.max(1, currentSubscription.monthly_classes || 1),
      monthlyPrice: currentSubscription.monthly_price || 0,
      equipmentAccess: currentSubscription.equipment_access || 'mat',
      status: currentSubscription.status || 'unknown',
      startDate: currentSubscription.start_date,
      endDate: currentSubscription.end_date,
      duration: currentSubscription.duration || 1,
      durationUnit: currentSubscription.duration_unit || 'months',
      isUnlimited: (currentSubscription.monthly_classes || 0) >= 999,
      isDayPass: currentSubscription.duration_unit === 'days', // Detect day/week passes
      daysSinceStart: currentSubscription.start_date ? 
        Math.floor((new Date().getTime() - new Date(currentSubscription.start_date).getTime()) / (1000 * 60 * 60 * 24)) : 0,
      daysUntilEnd: daysUntilEnd,
    };
  })() : null;

  // Remove the problematic infinite loop - subscriptions should expire automatically based on end_date

  const getProgressValue = () => {
    if (!subscriptionData) return 0;
    const usedClasses = Math.max(0, subscriptionData.monthlyClasses - subscriptionData.remainingClasses);
    return subscriptionData.monthlyClasses > 0 ? Math.min(1, usedClasses / subscriptionData.monthlyClasses) : 0;
  };

  const getUsedClasses = () => {
    if (!subscriptionData) return 0;
    // Handle edge case where remaining classes might be greater than monthly classes
    const used = subscriptionData.monthlyClasses - subscriptionData.remainingClasses;
    return Math.max(0, used); // Ensure we never show negative used classes
  };

  const handleLogout = async () => {
    Alert.alert(
      t('alerts.logout'),
      t('alerts.logoutConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('alerts.logout'),
          style: 'destructive',
          onPress: async () => {
            await dispatch(logoutUser());
          },
        },
      ]
    );
  };

  const handleWhatsAppContact = () => {
    const phoneNumber = '+355689400040';
    const message = 'Hello! I would like to inquire about my subscription and services at Animo Pilates.';
    const whatsappUrl = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
    
    Linking.openURL(whatsappUrl).catch(() => {
      Alert.alert(t('alerts.error'), t('alerts.errorWhatsApp'));
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
          Alert.alert(t('alerts.error'), t('alerts.errorPhoneCall'));
        }
      })
      .catch((err) => {
        console.error('Error making phone call:', err);
        Alert.alert(t('alerts.error'), t('alerts.errorPhoneCallManual'));
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
      const response = await notificationService.getNotificationSettings();
      if (response.success && response.data) {
        setNotificationSettings(response.data as NotificationSettings);
      }
    } catch (error) {
      console.error('❌ Error loading notification settings:', error);
    }
  };



  const updateNotificationSetting = async (key: keyof NotificationSettings, value: boolean | number) => {
    // Update local state immediately
    setNotificationSettings(prev => ({
      ...prev,
      [key]: value
    }));

    // Auto-save to database immediately
    try {
      const updatedSettings = {
        ...notificationSettings,
        [key]: value
      };
      
      const response = await notificationService.updateNotificationSettings(updatedSettings);
      
      if (!response.success) {
        console.error('Failed to save notification setting:', response.error);
        Alert.alert(t('alerts.error'), t('alerts.errorSaveSettings'));
        // Revert local state on error
        setNotificationSettings(prev => ({
          ...prev,
          [key]: key === 'defaultReminderMinutes' ? notificationSettings.defaultReminderMinutes : !value
        }));
      }
    } catch (error) {
      console.error('Failed to save notification setting:', error);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor }]}>
        <Body style={{ color: textColor }}>Loading subscription information...</Body>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      
      <RainingHearts />
      <ScrollView 
        style={{ flex: 1 }}
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
              icon="person"
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
                  {subscriptionData.isDayPass ? t('subscription.currentDayPass') : t('subscription.currentSubscription')}
                </H2>
              </View>
            </View>
            
            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressHeader}>
                <Body style={{ ...styles.progressTitle, color: textColor }}>
                  {subscriptionData.isDayPass ? t('subscription.dayPass') : 
                   subscriptionData.isUnlimited ? t('subscription.unlimitedClasses') : t('subscription.classUsage')}
                </Body>
                <Body style={{ ...styles.progressValue, color: getProgressColor(subscriptionData.remainingClasses, subscriptionData.monthlyClasses) }}>
                  {subscriptionData.isDayPass ? 
                    (subscriptionData.remainingClasses > 0 ? t('subscription.valid') : t('subscription.used')) :
                    `${subscriptionData.remainingClasses} ${t('subscription.left')}`}
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
                  `${t('subscription.validFor')} ${subscriptionData.remainingClasses} ${subscriptionData.remainingClasses === 1 ? t('classes.class') : t('classes.classes')}` :
                 subscriptionData.isUnlimited ? t('subscription.enjoyUnlimited') : 
                 subscriptionData.remainingClasses > subscriptionData.monthlyClasses ? 
                   `${subscriptionData.remainingClasses} ${t('subscription.classesAvailable')} (${t('subscription.bonusCredits')})` :
                   `${getUsedClasses()} ${t('subscription.of')} ${subscriptionData.monthlyClasses} ${t('subscription.classesUsed')}`}
              </Caption>
            </View>

            <Surface style={[styles.subscriptionCard, { backgroundColor: `${primaryColor}08` }]}>
              {subscriptionData.status === 'active' && (
                <View style={styles.billingInfo}>
                  <View style={styles.billingItem}>
                    <MaterialIcons name="schedule" size={16} color={textSecondaryColor} />
                    <Caption style={{ ...styles.billingText, color: textSecondaryColor }}>
                      {subscriptionData.isDayPass ? 
                        (subscriptionData.daysUntilEnd < 0 
                          ? 'Day pass expired'
                          : subscriptionData.daysUntilEnd === 0 
                            ? 'Expires today'
                            : `Expires in ${subscriptionData.daysUntilEnd} ${subscriptionData.daysUntilEnd === 1 ? 'day' : 'days'}`
                        ) :
                        (subscriptionData.daysUntilEnd <= 0 
                          ? 'Subscription expired'
                          : subscriptionData.daysUntilEnd > 0 
                            ? `${subscriptionData.daysUntilEnd} ${subscriptionData.daysUntilEnd === 1 ? 'day' : 'days'} until renewal`
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
                <Caption style={{ ...styles.detailCardLabel, color: textSecondaryColor }}>{t('classes.equipment')}</Caption>
                <Body style={{ ...styles.detailCardValue, color: textColor }}>
                  {subscriptionData.equipmentAccess === 'both' ? t('classes.both') : 
                   subscriptionData.equipmentAccess === 'mat' ? t('equipmentAccess.matOnly') : t('equipmentAccess.reformerOnly')}
                </Body>
              </View>
              
              <View style={[styles.detailCard, { backgroundColor: surfaceColor }]}>
                <MaterialIcons name="fitness-center" size={24} color={primaryColor} />
                <Caption style={{ ...styles.detailCardLabel, color: textSecondaryColor }}>{t('classes.classes')}</Caption>
                <Body style={{ ...styles.detailCardValue, color: textColor }}>
                  {subscriptionData.isDayPass ? 
                    `${subscriptionData.remainingClasses} ${subscriptionData.remainingClasses === 1 ? t('classes.class') : t('classes.classes')}` :
                   subscriptionData.isUnlimited ? t('dashboard.unlimited') : 
                   `${subscriptionData.monthlyClasses}/${t('subscription.month')}`}
                </Body>
              </View>
              
              <View style={[styles.detailCard, { backgroundColor: surfaceColor }]}>
                <MaterialIcons name="timeline" size={24} color={warningColor} />
                <Caption style={{ ...styles.detailCardLabel, color: textSecondaryColor }}>{t('subscription.memberFor')}</Caption>
                <Body style={{ ...styles.detailCardValue, color: textColor }}>
                  {subscriptionData.daysSinceStart} {subscriptionData.daysSinceStart === 1 ? t('subscription.day') : t('subscription.days')}
                </Body>
              </View>
              
              <View style={[styles.detailCard, { backgroundColor: surfaceColor }]}>
                <MaterialIcons 
                  name={subscriptionData.daysUntilEnd > (subscriptionData.isDayPass ? 0 : 7) ? "trending-up" : "report-problem"} 
                  size={24} 
                  color={subscriptionData.daysUntilEnd > (subscriptionData.isDayPass ? 0 : 7) ? successColor : warningColor} 
                />
                <Caption style={{ ...styles.detailCardLabel, color: textSecondaryColor }}>
                  {subscriptionData.isDayPass ? t('subscription.validity') : t('subscription.timeLeft')}
                </Caption>
                <Body style={{ ...styles.detailCardValue, color: textColor }}>
                  {subscriptionData.isDayPass ? 
                    (subscriptionData.daysUntilEnd < 0 ? t('subscription.expired') : 
                     subscriptionData.daysUntilEnd === 0 ? t('subscription.today') : 
                     `${subscriptionData.daysUntilEnd} ${subscriptionData.daysUntilEnd === 1 ? t('subscription.day') : t('subscription.days')}`) :
                   (subscriptionData.daysUntilEnd <= 0 ? t('subscription.expired') : `${subscriptionData.daysUntilEnd} ${subscriptionData.daysUntilEnd === 1 ? t('subscription.day') : t('subscription.days')}`)}
                </Body>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: textMutedColor }]} />

            <View style={styles.contactSection}>
              <Body style={{ ...styles.managedByReception, color: textSecondaryColor, textAlign: 'center' }}>
                📋 {t('profile.managedByReception')} 
                {'\n'}{t('profile.contactForChanges')}
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
                  {t('profile.callUs')}
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
              <H2 style={{ ...styles.welcomeTitle, color: textColor }}>{t('profile.welcomeToAnimo')}</H2>
              <Body style={{ ...styles.welcomeSubtitle, color: textSecondaryColor }}>
                {t('profile.welcomeSubtitle')}
              </Body>
            </View>
            
            <View style={styles.featuresList}>
              <View style={styles.featureItem}>
                <MaterialIcons name="self-improvement" size={24} color={successColor} />
                <Body style={{ ...styles.featureText, color: textColor }}>{t('profile.matReformerClasses')}</Body>
              </View>
              <View style={styles.featureItem}>
                <MaterialIcons name="star" size={24} color={warningColor} />
                <Body style={{ ...styles.featureText, color: textColor }}>{t('profile.expertInstructors')}</Body>
              </View>
              <View style={styles.featureItem}>
                <MaterialIcons name="schedule" size={24} color={primaryColor} />
                <Body style={{ ...styles.featureText, color: textColor }}>{t('profile.flexibleScheduling')}</Body>
              </View>
              <View style={styles.featureItem}>
                <MaterialIcons name="group" size={24} color={accentColor} />
                <Body style={{ ...styles.featureText, color: textColor }}>{t('profile.smallGroupClasses')}</Body>
              </View>
            </View>
            
            <View style={styles.ctaSection}>
              <Body style={{ ...styles.ctaText, color: textSecondaryColor }}>
                {t('profile.getStartedToday')}
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
                  {t('profile.callUs')}
                </Button>
              </View>
              
              <Caption style={{ ...styles.phoneNumber, color: textMutedColor, textAlign: 'center' }}>
                📞 +355 689 400 040
              </Caption>
            </View>
          </Card.Content>
        </Card>
      )}



      {/* Enhanced Notification Settings */}
      <Card style={[styles.cardImproved, { backgroundColor: surfaceColor }]}>
        <Card.Content style={styles.cardContentImproved}>
          <View style={styles.sectionHeaderImproved}>
            <View style={styles.sectionTitleRow}>
              <MaterialIcons name="notifications" size={24} color={primaryColor} style={styles.sectionIcon} />
              <H2 style={{ ...styles.sectionTitle, color: textColor }}>{t('profile.notificationSettings')}</H2>
            </View>
          </View>
          
          <View style={styles.settingsSection}>
            <View style={styles.settingsRow}>
              <View style={styles.settingInfo}>
                <Body style={{ ...styles.settingTitle, color: textColor }}>📱 {t('profile.pushNotifications')}</Body>
                <Caption style={{ ...styles.settingDescription, color: textSecondaryColor }}>
                  {t('profile.getPushNotifications')}
                </Caption>
              </View>
              <Switch
                value={notificationSettings.enableNotifications}
                onValueChange={(value) => updateNotificationSetting('enableNotifications', value)}
                trackColor={{ false: textSecondaryColor, true: `${accentColor}60` }}
                thumbColor={notificationSettings.enableNotifications ? accentColor : textMutedColor}
              />
            </View>
            
            {notificationSettings.enableNotifications && (
              <View style={[styles.settingsRow, styles.reminderSection, { backgroundColor: `${accentColor}04` }]}>
                <View style={styles.settingInfo}>
                  <Body style={{ ...styles.settingTitle, color: textColor }}>⏰ {t('profile.reminderTime')}</Body>
                  <Caption style={{ ...styles.settingDescription, color: textSecondaryColor }}>
                    {t('profile.reminderTimeDescription')}
                  </Caption>
                </View>
                <Button
                  mode="outlined"
                  onPress={() => setReminderModalVisible(true)}
                  style={{ ...styles.reminderButton, borderColor: accentColor }}
                  icon="access-time"
                >
                  {notificationSettings.defaultReminderMinutes} min
                </Button>
              </View>
            )}
          </View>
          
          <View style={[styles.divider, { backgroundColor: textMutedColor }]} />
          
          <Caption style={{ ...styles.autoSaveText, color: textSecondaryColor, textAlign: 'center', marginTop: 8 }}>
            💾 Settings are automatically saved when changed
          </Caption>
        </Card.Content>
      </Card>

      {/* Language Settings */}
      <Card style={[styles.cardImproved, { backgroundColor: surfaceColor }]}>
        <Card.Content style={styles.cardContentImproved}>
          <View style={styles.sectionHeaderImproved}>
            <View style={styles.sectionTitleRow}>
              <MaterialIcons name="language" size={24} color={primaryColor} style={styles.sectionIcon} />
              <H2 style={{ ...styles.sectionTitle, color: textColor }}>{t('profile.languageSettings')}</H2>
            </View>
          </View>
          
          <View style={styles.settingsSection}>
            <LanguageSelector 
              showAsButton={true}
              onLanguageChange={(language) => {
                // Optional: Show success message or handle language change
                console.log('Language changed to:', language);
              }}
            />
          </View>
        </Card.Content>
      </Card>


      {/* Account Settings - Moved to the end */}
      <Card style={[styles.card, { backgroundColor: surfaceColor }]}>
        <Card.Content>
          <H2 style={{ color: textColor }}>{t('profile.accountSettings')}</H2>
          <View style={styles.accountInfo}>
            <View style={styles.infoItem}>
              <Body style={{ ...styles.label, color: textSecondaryColor }}>{t('profile.name')}:</Body>
              <Body style={{ ...styles.value, color: textColor }}>{user?.name || t('profile.notSet')}</Body>
            </View>
            <View style={styles.infoItem}>
              <Body style={{ ...styles.label, color: textSecondaryColor }}>{t('profile.email')}:</Body>
              <Body style={{ ...styles.value, color: textColor }}>{user?.email || t('profile.notSet')}</Body>
            </View>
            <View style={styles.infoItem}>
              <Body style={{ ...styles.label, color: textSecondaryColor }}>{t('profile.phone')}:</Body>
              <Body style={{ ...styles.value, color: textColor }}>{user?.phone || t('profile.notSet')}</Body>
            </View>
            {user?.emergency_contact && (
              <View style={styles.infoItem}>
                <Body style={{ ...styles.label, color: textSecondaryColor }}>{t('profile.emergencyContact')}:</Body>
                <Body style={{ ...styles.value, color: textColor }}>{user.emergency_contact}</Body>
              </View>
            )}
            <View style={styles.infoItem}>
              <Body style={{ ...styles.label, color: textSecondaryColor }}>{t('profile.appVersion')}:</Body>
              <Body style={{ ...styles.value, color: textColor }}>{getFormattedAppVersion()}</Body>
            </View>
          </View>
          
          <View style={styles.buttonContainer}>
            <Button 
              mode="outlined" 
              style={{ ...styles.editButton, borderColor: textMutedColor, opacity: 0.5 }} 
              textColor={textMutedColor} 
              icon="person"
              disabled={true}
            >
              Edit Profile (Disabled)
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

      <Portal key="reminder-settings-modal">
        <Modal 
          key="reminder-modal"
          visible={reminderModalVisible} 
          onDismiss={() => setReminderModalVisible(false)} 
          contentContainerStyle={[
            styles.modalContainer,
            {
              width: modalDimensions.width,
              maxWidth: modalDimensions.maxWidth,
              padding: modalDimensions.padding,
              margin: modalDimensions.margin
            }
          ]}
        >
          <H2 style={{ ...styles.modalTitle, color: textColor }}>{t('profile.reminderTime')}</H2>
          <Body style={{ ...styles.modalText, color: textSecondaryColor }}>
            {t('profile.reminderTimeModalDescription')}
          </Body>
          
          {[5, 10, 15, 30, 60].map((minutes) => (
            <Button
              key={minutes}
              mode={notificationSettings.defaultReminderMinutes === minutes ? "contained" : "outlined"}
              onPress={() => {
                updateNotificationSetting('defaultReminderMinutes', minutes);
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
    </View>
  );
}

const createStyles = (themeColors: any) => StyleSheet.create({
  container: { 
    flex: 1 
    // backgroundColor is applied dynamically via useThemeColor in component
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
    backgroundColor: themeColors.accent, 
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
    backgroundColor: `${themeColors.textOnAccent || themeColors.text}20`, 
    borderWidth: 1, 
    borderColor: `${themeColors.textOnAccent || themeColors.text}30`,
    borderRadius: 12,
  },
  roleChipText: { 
    color: themeColors.textOnAccent || themeColors.text, 
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
    backgroundColor: themeColors.surface,
    borderWidth: 1,
    borderColor: `${themeColors.primary}20`,
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
    backgroundColor: themeColors.surface, 
    borderRadius: 16,
    alignSelf: 'center',
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8
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
  autoSaveText: {
    fontSize: 12,
    fontStyle: 'italic',
  },

});

export default withChristmasDesign(ClientProfile, { 
  variant: 'snow', 
  showSnow: true, 
  showLights: true 
}); 