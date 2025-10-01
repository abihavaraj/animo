import StatusChip from '@/components/ui/StatusChip';
import { Body, Caption, H1, H2 } from '@/components/ui/Typography';
import { Colors } from '@/constants/Colors';
import { layout, spacing } from '@/constants/Spacing';
import React, { useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import {
  Avatar,
  Divider,
  Button as PaperButton,
  Card as PaperCard,
  Switch
} from 'react-native-paper';
import { useSelector } from 'react-redux';
import WebCompatibleIcon from '../../components/WebCompatibleIcon';
import { supabase } from '../../config/supabase.config';
import { useLogoutWithCredentialSave } from '../../hooks/useLogoutWithCredentialSave';
import { bookingService } from '../../services/bookingService';
import { classService } from '../../services/classService';
import { notificationService } from '../../services/notificationService';
import { pushNotificationService } from '../../services/pushNotificationService';
import { RootState } from '../../store';
import { shadows } from '../../utils/shadows';

interface InstructorStats {
  totalClasses: number;
  totalStudents: number;
  thisMonthClasses: number;
  avgAttendance: number;
  upcomingClasses: number;
}

function InstructorProfile() {
  const { user } = useSelector((state: RootState) => state.auth);
  const { logoutWithCredentialSave } = useLogoutWithCredentialSave();
  const [stats, setStats] = useState<InstructorStats>({
    totalClasses: 0,
    totalStudents: 0,
    thisMonthClasses: 0,
    avgAttendance: 0,
    upcomingClasses: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Notification preferences
  const [notificationPreferences, setNotificationPreferences] = useState({
    enableNotifications: true,
    enablePushNotifications: true,
    enableEmailNotifications: false,
    defaultReminderMinutes: 15,
    classFullNotifications: true,
    newEnrollmentNotifications: false,
    classCancellationNotifications: true,
    generalReminders: true,
  });

  useEffect(() => {
    loadInstructorStats();
    loadNotificationPreferences();
    
    // Initialize notification services for IPA build support
    const initializeNotifications = async () => {
      try {
        
        // Initialize both notification services for production builds
        await Promise.all([
          notificationService.initialize(),
          pushNotificationService.initialize()
        ]);
        
      } catch (error) {
        console.error('⚠️ [InstructorProfile] Failed to initialize notification services:', error);
        // Don't block profile loading if notification initialization fails
      }
    };
    
    initializeNotifications();
  }, []);

  const loadInstructorStats = async () => {
    try {
      setLoading(true);
      
      // Get instructor's classes
      const classResponse = await classService.getClasses({
        instructor: user?.id?.toString(),
        status: 'active'
        // Removed upcoming: true filter so instructor can see all classes including past ones
      });

      if (classResponse.success && classResponse.data) {
        const allClasses = classResponse.data;
        const currentDate = new Date();
        const today = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
        
        // Calculate this month's classes
        const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        
        const thisMonthClasses = allClasses.filter(class_ => {
          const classDate = new Date(class_.date);
          return classDate >= firstDayOfMonth && classDate <= lastDayOfMonth;
        });

        // Calculate upcoming classes
        const upcomingClasses = allClasses.filter(class_ => {
          const classDate = new Date(class_.date);
          return classDate >= today;
        });

        // Calculate total enrolled students and attendance
        const totalEnrolled = allClasses.reduce((sum, class_) => sum + (class_.enrolled || 0), 0);
        const totalCapacity = allClasses.reduce((sum, class_) => sum + class_.capacity, 0);
        const avgAttendance = totalCapacity > 0 ? (totalEnrolled / totalCapacity) * 100 : 0;

        // Get unique students count
        let uniqueStudents = new Set<number>();
        for (const class_ of allClasses) {
          try {
            const attendeesResponse = await bookingService.getClassAttendees(class_.id);
            if (attendeesResponse.success && attendeesResponse.data) {
              attendeesResponse.data.forEach((attendee: any) => {
                uniqueStudents.add(attendee.user_id);
              });
            }
          } catch (error) {
            console.error(`Failed to load attendees for class ${class_.id}:`, error);
          }
        }

        setStats({
          totalClasses: allClasses.length,
          totalStudents: uniqueStudents.size,
          thisMonthClasses: thisMonthClasses.length,
          avgAttendance: Math.round(avgAttendance),
          upcomingClasses: upcomingClasses.length
        });
      }
    } catch (error) {
      console.error('Failed to load instructor stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      console.log('🚀 InstructorProfile: Starting optimized parallel refresh...');
      
      // Use parallel loading for better performance
      const [statsResult, preferencesResult] = await Promise.allSettled([
        loadInstructorStats(),
        loadNotificationPreferences()
      ]);
      
      if (statsResult.status === 'rejected') {
        console.error('❌ Failed to refresh stats:', statsResult.reason);
      }
      if (preferencesResult.status === 'rejected') {
        console.error('❌ Failed to refresh preferences:', preferencesResult.reason);
      }
      
      console.log('✅ Optimized instructor refresh completed');
    } catch (error) {
      console.error('❌ Error refreshing instructor data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const loadNotificationPreferences = async () => {
    try {
      if (!user?.id) return;
      
      // Load preferences from notification_settings table
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id.toString())
        .single();

      if (!error && data) {
        setNotificationPreferences({
          enableNotifications: data.enable_notifications ?? true,
          enablePushNotifications: data.enable_push_notifications ?? true,
          enableEmailNotifications: data.enable_email_notifications ?? false,
          defaultReminderMinutes: data.default_reminder_minutes ?? 15,
          classFullNotifications: data.class_full_notifications ?? true,
          newEnrollmentNotifications: data.new_enrollment_notifications ?? true,
          classCancellationNotifications: data.class_cancellation_notifications ?? true,
          generalReminders: data.general_reminders ?? true,
        });
      } else if (error?.code === 'PGRST116') {
        // No settings found, create default settings
        const { error: insertError } = await supabase
          .from('notification_settings')
          .insert({
            user_id: user.id.toString(),
            enable_notifications: true,
            enable_push_notifications: true,
            enable_email_notifications: false,
            default_reminder_minutes: 15,
            class_full_notifications: true,
            new_enrollment_notifications: true,
            class_cancellation_notifications: true,
            general_reminders: true,
          });

        if (!insertError) {
          setNotificationPreferences({
            enableNotifications: true,
            enablePushNotifications: true,
            enableEmailNotifications: false,
            defaultReminderMinutes: 15,
            classFullNotifications: true,
            newEnrollmentNotifications: true,
            classCancellationNotifications: true,
            generalReminders: true,
          });
        }
      }
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
    }
  };

  const updateNotificationPreference = async (key: string, value: boolean) => {
    try {
      console.log(`🔧 [updateNotificationPreference] Called with key: ${key}, value: ${value}`);
      
      if (!user?.id) {
        console.error('❌ [updateNotificationPreference] No user ID available');
        return;
      }

      console.log(`🔧 [updateNotificationPreference] User ID: ${user.id}`);

      // Update local state immediately
      setNotificationPreferences(prev => ({
        ...prev,
        [key]: value
      }));

      // Convert camelCase to snake_case for database
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      
      console.log(`🔧 [updateNotificationPreference] Database key: ${dbKey}`);
      
      // Update in notification_settings table
      const { error } = await supabase
        .from('notification_settings')
        .upsert({
          user_id: user.id.toString(),
          [dbKey]: value,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('❌ [updateNotificationPreference] Database error:', error);
        Alert.alert('Error', 'Failed to update notification preferences');
        // Revert local state on error
        setNotificationPreferences(prev => ({
          ...prev,
          [key]: !value
        }));
      } else {
        console.log(`✅ [updateNotificationPreference] Successfully updated ${dbKey} to ${value}`);
      }
    } catch (error) {
      console.error('Failed to update notification preference:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => await logoutWithCredentialSave(),
        },
      ]
    );
  };

  const formatJoinDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <H1 style={styles.pageTitle}>Profile</H1>
      </View>

      <ScrollView 
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Profile Header */}
        <PaperCard style={styles.card}>
          <PaperCard.Content style={styles.cardContent}>
            <View style={styles.profileHeader}>
              <Avatar.Text 
                size={80} 
                label={user?.name?.charAt(0).toUpperCase() || 'I'}
                style={styles.avatar}
              />
              <View style={styles.profileInfo}>
                <H2 style={styles.profileName}>{user?.name}</H2>
                <Body style={styles.profileRole}>Pilates Instructor</Body>
                <StatusChip 
                  state="success"
                  text="Certified"
                  size="small"
                />
              </View>
            </View>
          </PaperCard.Content>
        </PaperCard>

        {/* Quick Stats */}
        <PaperCard style={styles.card}>
          <PaperCard.Content style={styles.cardContent}>
            <H2 style={styles.cardTitle}>Your Performance</H2>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <H2 style={styles.statNumber}>{stats.totalClasses}</H2>
                <Caption style={styles.statLabel}>Total Classes</Caption>
              </View>
              <View style={styles.statItem}>
                <H2 style={styles.statNumber}>{stats.totalStudents}</H2>
                <Caption style={styles.statLabel}>Students Taught</Caption>
              </View>
              <View style={styles.statItem}>
                <H2 style={styles.statNumber}>{stats.thisMonthClasses}</H2>
                <Caption style={styles.statLabel}>This Month</Caption>
              </View>
              <View style={styles.statItem}>
                <H2 style={styles.statNumber}>{stats.avgAttendance}%</H2>
                <Caption style={styles.statLabel}>Avg Attendance</Caption>
              </View>
            </View>
          </PaperCard.Content>
        </PaperCard>

        {/* Profile Information */}
        <PaperCard style={styles.card}>
          <PaperCard.Content style={styles.cardContent}>
            <H2 style={styles.cardTitle}>Profile Information</H2>
            <View style={styles.infoList}>
              <View style={styles.infoItem}>
                <WebCompatibleIcon name="email" size={20} color={Colors.light.textSecondary} />
                <View style={styles.infoContent}>
                  <Body style={styles.infoLabel}>Email</Body>
                  <Caption style={styles.infoValue}>{user?.email || 'Not provided'}</Caption>
                </View>
              </View>
              <View style={styles.infoItem}>
                <WebCompatibleIcon name="phone" size={20} color={Colors.light.textSecondary} />
                <View style={styles.infoContent}>
                  <Body style={styles.infoLabel}>Phone</Body>
                  <Caption style={styles.infoValue}>{user?.phone || 'Not provided'}</Caption>
                </View>
              </View>
              <View style={styles.infoItem}>
                <WebCompatibleIcon name="work" size={20} color={Colors.light.textSecondary} />
                <View style={styles.infoContent}>
                  <Body style={styles.infoLabel}>Role</Body>
                  <Caption style={styles.infoValue}>Instructor</Caption>
                </View>
              </View>
              <View style={styles.infoItem}>
                <WebCompatibleIcon name="schedule" size={20} color={Colors.light.textSecondary} />
                <View style={styles.infoContent}>
                  <Body style={styles.infoLabel}>Member Since</Body>
                  <Caption style={styles.infoValue}>{formatJoinDate(user?.created_at)}</Caption>
                </View>
              </View>
            </View>
          </PaperCard.Content>
        </PaperCard>

        {/* Teaching Schedule */}
        <PaperCard style={styles.card}>
          <PaperCard.Content style={styles.cardContent}>
            <H2 style={styles.cardTitle}>Teaching Schedule</H2>
            <View style={styles.scheduleInfo}>
              <View style={styles.scheduleItem}>
                <WebCompatibleIcon name="event" size={24} color={Colors.light.accent} />
                <View style={styles.scheduleText}>
                  <Body style={styles.scheduleTitle}>Upcoming Classes</Body>
                  <Caption style={styles.scheduleValue}>{stats.upcomingClasses} classes scheduled</Caption>
                </View>
              </View>
              <View style={styles.scheduleItem}>
                <WebCompatibleIcon name="trending-up" size={24} color={Colors.light.success} />
                <View style={styles.scheduleText}>
                  <Body style={styles.scheduleTitle}>This Month</Body>
                  <Caption style={styles.scheduleValue}>{stats.thisMonthClasses} classes taught</Caption>
                </View>
              </View>
              <View style={styles.scheduleItem}>
                <WebCompatibleIcon name="people" size={24} color={Colors.light.warning} />
                <View style={styles.scheduleText}>
                  <Body style={styles.scheduleTitle}>Student Engagement</Body>
                  <Caption style={styles.scheduleValue}>{stats.avgAttendance}% average attendance</Caption>
                </View>
              </View>
            </View>
          </PaperCard.Content>
        </PaperCard>

        {/* Notification Preferences */}
        <PaperCard style={styles.card}>
          <PaperCard.Content style={styles.cardContent}>
            <H2 style={styles.cardTitle}>Notification Preferences</H2>
            <View style={styles.preferencesContainer}>
              {/* Main Notification Toggles */}
              <View style={styles.preferenceItem}>
                <View style={styles.preferenceInfo}>
                  <Body style={styles.preferenceTitle}>Enable Notifications</Body>
                  <Caption style={styles.preferenceDescription}>
                    Master toggle for all notifications
                  </Caption>
                </View>
                <Switch
                  value={notificationPreferences.enableNotifications}
                  onValueChange={(value) => updateNotificationPreference('enableNotifications', value)}
                />
              </View>
              
              <View style={styles.preferenceItem}>
                <View style={styles.preferenceInfo}>
                  <Body style={styles.preferenceTitle}>Push Notifications</Body>
                  <Caption style={styles.preferenceDescription}>
                    Receive push notifications on your device
                  </Caption>
                </View>
                <Switch
                  value={notificationPreferences.enablePushNotifications}
                  onValueChange={(value) => updateNotificationPreference('enablePushNotifications', value)}
                  disabled={!notificationPreferences.enableNotifications}
                />
              </View>
              
              <View style={styles.preferenceItem}>
                <View style={styles.preferenceInfo}>
                  <Body style={styles.preferenceTitle}>Email Notifications</Body>
                  <Caption style={styles.preferenceDescription}>
                    Receive notifications via email
                  </Caption>
                </View>
                <Switch
                  value={notificationPreferences.enableEmailNotifications}
                  onValueChange={(value) => updateNotificationPreference('enableEmailNotifications', value)}
                  disabled={!notificationPreferences.enableNotifications}
                />
              </View>

              {/* Specific Notification Types */}
              <View style={styles.preferenceItem}>
                <View style={styles.preferenceInfo}>
                  <Body style={styles.preferenceTitle}>Class Full Notifications</Body>
                  <Caption style={styles.preferenceDescription}>
                    Get notified when your classes reach full capacity
                  </Caption>
                </View>
                <Switch
                  value={notificationPreferences.classFullNotifications}
                  onValueChange={(value) => updateNotificationPreference('classFullNotifications', value)}
                  disabled={!notificationPreferences.enableNotifications}
                />
              </View>
              
              <View style={styles.preferenceItem}>
                <View style={styles.preferenceInfo}>
                  <Body style={styles.preferenceTitle}>New Enrollment Notifications</Body>
                  <Caption style={styles.preferenceDescription}>
                    Get notified each time a student enrolls in your classes
                  </Caption>
                </View>
                <Switch
                  value={notificationPreferences.newEnrollmentNotifications}
                  onValueChange={(value) => updateNotificationPreference('newEnrollmentNotifications', value)}
                  disabled={!notificationPreferences.enableNotifications}
                />
              </View>
              
              <View style={styles.preferenceItem}>
                <View style={styles.preferenceInfo}>
                  <Body style={styles.preferenceTitle}>Class Cancellation Notifications</Body>
                  <Caption style={styles.preferenceDescription}>
                    Get notified when students cancel their bookings
                  </Caption>
                </View>
                <Switch
                  value={notificationPreferences.classCancellationNotifications}
                  onValueChange={(value) => updateNotificationPreference('classCancellationNotifications', value)}
                  disabled={!notificationPreferences.enableNotifications}
                />
              </View>
              
              <View style={styles.preferenceItem}>
                <View style={styles.preferenceInfo}>
                  <Body style={styles.preferenceTitle}>General Reminders</Body>
                  <Caption style={styles.preferenceDescription}>
                    Receive general app notifications and reminders
                  </Caption>
                </View>
                <Switch
                  value={notificationPreferences.generalReminders}
                  onValueChange={(value) => updateNotificationPreference('generalReminders', value)}
                  disabled={!notificationPreferences.enableNotifications}
                />
              </View>
            </View>
          </PaperCard.Content>
        </PaperCard>

        {/* Actions */}
        <PaperCard style={styles.card}>
          <PaperCard.Content style={styles.cardContent}>
            <H2 style={styles.cardTitle}>Account Actions</H2>
            <View style={styles.actionButtons}>
              <PaperButton 
                mode="outlined" 
                icon="edit" 
                style={styles.actionButton}
                onPress={() => Alert.alert('Feature Coming Soon', 'Profile editing will be available in a future update.')}
              >
                Edit Profile
              </PaperButton>
              <PaperButton 
                mode="outlined" 
                icon="settings" 
                style={styles.actionButton}
                onPress={() => Alert.alert('Feature Coming Soon', 'Settings will be available in a future update.')}
              >
                Settings
              </PaperButton>
            </View>
            <Divider style={styles.divider} />
            <PaperButton 
              mode="contained" 
              icon="logout" 
              onPress={handleLogout} 
              style={styles.logoutButton}
              buttonColor={Colors.light.error}
            >
              Logout
            </PaperButton>
          </PaperCard.Content>
        </PaperCard>
      </ScrollView>
    </View>

  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    backgroundColor: Colors.light.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    ...shadows.card,
  },
  pageTitle: {
    color: Colors.light.text,
    fontWeight: '700',
  },
  scrollContainer: {
    flex: 1,
    padding: spacing.md,
  },
  card: {
    marginBottom: spacing.md,
    backgroundColor: Colors.light.surface,
    borderRadius: layout.borderRadius,
    ...shadows.card,
  },
  cardContent: {
    padding: spacing.lg,
  },
  cardTitle: {
    color: Colors.light.text,
    marginBottom: spacing.md,
    fontWeight: '600',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  avatar: {
    backgroundColor: Colors.light.accent,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    color: Colors.light.text,
    marginBottom: spacing.xs,
  },
  profileRole: {
    color: Colors.light.textSecondary,
    marginBottom: spacing.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
  },
  statItem: {
    alignItems: 'center',
    minWidth: '22%',
    marginBottom: spacing.md,
  },
  statNumber: {
    color: Colors.light.accent,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  statLabel: {
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  infoList: {
    gap: spacing.md,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    color: Colors.light.text,
    marginBottom: 2,
  },
  infoValue: {
    color: Colors.light.textSecondary,
  },
  scheduleInfo: {
    gap: spacing.md,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  scheduleText: {
    flex: 1,
  },
  scheduleTitle: {
    color: Colors.light.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  scheduleValue: {
    color: Colors.light.textSecondary,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
  },
  divider: {
    marginVertical: spacing.lg,
  },
  logoutButton: {
    marginTop: spacing.sm,
  },
  
  // Notification preferences styles
  preferencesContainer: {
    gap: spacing.lg,
  },
  preferenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  preferenceInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  preferenceTitle: {
    color: Colors.light.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  preferenceDescription: {
    color: Colors.light.textSecondary,
    lineHeight: 18,
  },
});

export default InstructorProfile; 