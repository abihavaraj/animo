import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import moment from 'moment';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Dimensions, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Card, Surface } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { Body, Caption, H1, H2, H3 } from '../../../components/ui/Typography';
import { useThemeColor } from '../../../hooks/useThemeColor';
import { apiService } from '../../services/api';
import { Booking, bookingService } from '../../services/bookingService';
import { BackendClass, classService } from '../../services/classService';
import { pushNotificationService } from '../../services/pushNotificationService';
import { subscriptionService } from '../../services/subscriptionService';
import { AppDispatch, RootState } from '../../store';
import { createBooking } from '../../store/bookingSlice';
import { fetchCurrentSubscription } from '../../store/subscriptionSlice';
import { shadows } from '../../utils/shadows';

const { width } = Dimensions.get('window');

interface Notification {
  id: number;
  type: 'reminder' | 'cancellation' | 'update' | 'waitlist_promotion' | 'subscription_expiring' | 'subscription_changed';
  message: string;
  scheduled_time: string;
  sent: boolean;
  created_at: string;
}

interface DashboardData {
  upcomingClasses: BackendClass[];
  bookedClasses: Booking[];
  waitlistClasses: any[];
  notifications: Notification[];
  subscription: {
    plan_name: string;
    remaining_classes: number;
    monthly_classes: number;
    status: string;
  } | null;
}

function ClientDashboard() {
  const { user } = useSelector((state: RootState) => state.auth);
  const { currentSubscription } = useSelector((state: RootState) => state.subscriptions);
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation();
  
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
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    upcomingClasses: [],
    bookedClasses: [],
    waitlistClasses: [],
    notifications: [],
    subscription: null,
  });

  useEffect(() => {
    dispatch(fetchCurrentSubscription());
  }, [dispatch]);

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [])
  );

  useEffect(() => {
    // Safe lazy initialization of push notifications after dashboard loads
    const initializePushNotifications = async () => {
      try {
        console.log('🎯 Dashboard loaded, attempting safe push notification setup...');
        
        // Wait a bit more to ensure everything is ready
        setTimeout(async () => {
          try {
            const success = await pushNotificationService.lazyInitialize();
            if (success) {
              console.log('✅ Push notifications initialized from dashboard');
            } else {
              console.log('⚠️ Push notifications not available (normal in development)');
            }
          } catch (error) {
            console.error('❌ Push notification initialization failed (non-critical):', error);
            // This error is non-critical - app continues normally
          }
        }, 2000); // 2 second delay to ensure app is fully loaded
        
      } catch (error) {
        console.error('❌ Error in push notification setup (non-critical):', error);
        // Non-critical error - don't affect dashboard functionality
      }
    };

    // Only attempt if user is logged in and dashboard is mounting
    if (user?.id) {
      initializePushNotifications();
    }
  }, [user?.id]);

  const loadDashboardData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);

      // Load user's booked classes first
      let bookedClasses: Booking[] = [];
      let bookedClassIds: number[] = [];
      
      try {
        const bookingsResponse = await bookingService.getBookings();
        
        if (bookingsResponse.success && bookingsResponse.data) {
          // Filter for upcoming bookings only
          const now = new Date();
          
          bookedClasses = bookingsResponse.data.filter((booking: Booking) => {
            // Check if booking is active (confirmed, or other active statuses)
            const activeStatuses = ['confirmed', 'booked', 'active'];
            if (!activeStatuses.includes(booking.status)) {
              return false;
            }
            
            if (booking.class_date && booking.class_time) {
              const classDateTime = new Date(`${booking.class_date} ${booking.class_time}`);
              return classDateTime > now;
            }
            return false;
          });
          
          // Get IDs of booked classes to filter from upcoming
          bookedClassIds = bookedClasses.map(booking => booking.class_id).filter(id => id !== undefined) as number[];
        }
      } catch (error) {
        console.error('Error loading bookings:', error);
        Alert.alert('Error', 'Failed to load your bookings.');
      }

      // Load upcoming classes and filter out already booked ones
      const classesResponse = await classService.getClasses();
      let upcomingClasses: BackendClass[] = [];
      
      if (classesResponse.success && classesResponse.data) {
        const now = new Date();
        upcomingClasses = classesResponse.data
          .filter((cls: BackendClass) => {
            const classDateTime = new Date(`${cls.date} ${cls.time}`);
            // Filter out past classes and classes already booked by user
            return classDateTime > now && !bookedClassIds.includes(cls.id);
          })
          .sort((a: BackendClass, b: BackendClass) => {
            const dateA = new Date(`${a.date} ${a.time}`);
            const dateB = new Date(`${b.date} ${b.time}`);
            return dateA.getTime() - dateB.getTime();
          })
          .slice(0, 5);
      }

      // Load subscription data
      let subscriptionData = null;
      try {
        const subResponse = await subscriptionService.getCurrentSubscription();
        if (subResponse.success && subResponse.data) {
          subscriptionData = subResponse.data;
        }
      } catch (error) {
        console.log('No active subscription found');
      }

      // Load recent notifications
      let notifications: Notification[] = [];
      try {
        const notificationsResponse = await apiService.get(`/notifications/user/${user.id}`);
        if (notificationsResponse.success && notificationsResponse.data) {
          // Get recent subscription-related notifications
          notifications = (notificationsResponse.data as Notification[])
            .filter(n => n.type === 'subscription_expiring' || n.type === 'subscription_changed')
            .slice(0, 3); // Show only last 3 subscription notifications
        }
      } catch (error) {
        console.error('Error loading notifications:', error);
      }

      // Load user's waitlist
      let waitlistClasses: any[] = [];
      try {
        const waitlistResponse = await bookingService.getUserWaitlist(user.id);
        if (waitlistResponse.success) {
          waitlistClasses = waitlistResponse.data || [];
        }
      } catch (error) {
        console.error('Error loading waitlist:', error);
      }

      setDashboardData({
        upcomingClasses,
        bookedClasses,
        waitlistClasses,
        notifications,
        subscription: subscriptionData,
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    dispatch(fetchCurrentSubscription());
    loadDashboardData();
  };

  const getEquipmentIcon = (equipment: string) => {
    switch (equipment) {
      case 'mat': return 'self-improvement';
      case 'reformer': return 'fitness-center';
      case 'both': return 'fitness-center';
      default: return 'help-outline';
    }
  };

  const getEquipmentColor = (equipment: string) => {
    switch (equipment) {
      case 'mat': return successColor;
      case 'reformer': return warningColor;
      case 'both': return accentColor;
      default: return textSecondaryColor;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'beginner': return successColor;
      case 'intermediate': return warningColor;
      case 'advanced': return errorColor;
      default: return textSecondaryColor;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatTime = (time: string) => {
    return moment(time, 'HH:mm:ss').format('h:mm A');
  };

  const getHoursUntilClass = (date: string, time: string) => {
    const classDateTime = moment(`${date} ${time}`);
    const now = moment();
    return classDateTime.diff(now, 'hours', true);
  };

  const formatTimeUntilClass = (date: string, time: string) => {
    const classDateTime = moment(`${date} ${time}`);
    const now = moment();
    
    const totalMinutes = classDateTime.diff(now, 'minutes');
    const totalHours = classDateTime.diff(now, 'hours');
    const totalDays = classDateTime.diff(now, 'days');
    
    if (totalMinutes < 0) {
      return 'Class started';
    } else if (totalMinutes < 60) {
      return `${totalMinutes} min${totalMinutes === 1 ? '' : 's'} away`;
    } else if (totalHours < 24) {
      const hours = Math.floor(totalHours);
      const minutes = totalMinutes - (hours * 60);
      if (minutes === 0) {
        return `${hours} hour${hours === 1 ? '' : 's'} away`;
      } else {
        return `${hours}h ${minutes}m away`;
      }
    } else {
      const days = Math.floor(totalDays);
      const remainingHours = totalHours - (days * 24);
      if (remainingHours < 1) {
        return `${days} day${days === 1 ? '' : 's'} away`;
      } else {
        return `${days} day${days === 1 ? '' : 's'}, ${Math.floor(remainingHours)}h away`;
      }
    }
  };

  const getClassTimeStatus = (date: string, time: string) => {
    const hoursUntil = getHoursUntilClass(date, time);
    const timeDisplay = formatTimeUntilClass(date, time);
    
    if (hoursUntil < 0) {
      return { status: 'past', message: 'Class has started', color: errorColor };
    } else if (hoursUntil < 2) {
      return { 
        status: 'too_close', 
        message: `Too close to cancel (${timeDisplay})`, 
        color: errorColor 
      };
    } else if (hoursUntil < 6) {
      return { 
        status: 'warning', 
        message: `Cancellation deadline approaching (${timeDisplay})`, 
        color: warningColor 
      };
    } else {
      return { 
        status: 'ok', 
        message: `Can cancel until 2h before class`, 
        color: successColor 
      };
    }
  };

  const canCancelBooking = (date: string, time: string) => {
    const hoursUntil = getHoursUntilClass(date, time);
    return hoursUntil >= 2; // 2-hour cancellation rule
  };

  const handleCancelBooking = async (booking: Booking) => {
    if (!booking.class_date || !booking.class_time) {
      Alert.alert('Error', 'Unable to cancel booking - missing class information');
      return;
    }

    const timeStatus = getClassTimeStatus(booking.class_date, booking.class_time);
    
    if (!canCancelBooking(booking.class_date, booking.class_time)) {
      Alert.alert(
        'Cannot Cancel Booking', 
        `Sorry, you cannot cancel this booking. ${timeStatus.message}.\n\nOur policy requires at least 2 hours notice for cancellations.`,
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    const hoursUntil = getHoursUntilClass(booking.class_date, booking.class_time);
    const timeDisplay = formatTimeUntilClass(booking.class_date, booking.class_time);
    
    Alert.alert(
      'Cancel Booking',
      `Are you sure you want to cancel "${booking.class_name}"?\n\nClass: ${formatDate(booking.class_date)} at ${formatTime(booking.class_time)}\nTime remaining: ${timeDisplay}\n\nYour class credit will be refunded to your account.`,
      [
        { text: 'Keep Booking', style: 'cancel' },
        { 
          text: 'Cancel Booking', 
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await bookingService.cancelBooking(booking.id);
              if (response.success) {
                const cancelData = response.data as any; // Backend returns different structure for cancellation
                Alert.alert(
                  'Booking Cancelled', 
                  cancelData?.waitlistPromoted 
                    ? 'Your booking has been cancelled and your class credit refunded. The next person on the waitlist has been notified.'
                    : 'Your booking has been cancelled and your class credit refunded.',
                  [{ text: 'OK', onPress: () => {
                    // Refresh dashboard data
                    onRefresh();
                  }}]
                );
              } else {
                Alert.alert('Cancellation Failed', response.error || 'Failed to cancel booking. Please try again.');
              }
            } catch (error) {
              console.error('Cancel booking error:', error);
              Alert.alert('Cancellation Failed', 'An error occurred while cancelling your booking. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleBookClass = async (classId: number) => {
    const class_ = dashboardData.upcomingClasses.find(c => c.id === classId);
    if (!class_) return;

    // Check if user has subscription
    if (!currentSubscription) {
      Alert.alert('Subscription Required', 'You need an active subscription plan to book classes. Please contact reception to purchase a plan.');
      return;
    }

    // Check if user has remaining classes (unless unlimited)
    const monthlyClasses = currentSubscription.monthly_classes || 0;
    const remainingClasses = currentSubscription.remaining_classes || 0;
    const isUnlimited = monthlyClasses >= 999;
    
    if (!isUnlimited && remainingClasses <= 0) {
      Alert.alert('No Classes Remaining', 'You have no remaining classes in your subscription. Please renew or upgrade your plan.');
      return;
    }

    // Check personal subscription restrictions
    const subscriptionCategory = currentSubscription.category || currentSubscription.plan?.category;
    const isPersonalSubscription = subscriptionCategory === 'personal';
    const isPersonalClass = class_.category === 'personal';

    if (isPersonalSubscription && !isPersonalClass) {
      Alert.alert('Personal Subscription Required', 'Your personal subscription only allows booking personal/private classes. Please choose a personal training session.');
      return;
    }

    if (!isPersonalSubscription && isPersonalClass) {
      Alert.alert('Personal Training Session', 'This is a personal training session. You need a personal subscription to book this class.');
      return;
    }

    // Check equipment access
    const planEquipment = currentSubscription.equipment_access;
    if (class_.equipment_type === 'reformer' && planEquipment === 'mat') {
      Alert.alert('Equipment Access Required', 'Your subscription does not include Reformer access. Please upgrade your plan.');
      return;
    }

    if (class_.equipment_type === 'both' && planEquipment !== 'both') {
      Alert.alert('Full Equipment Access Required', 'This class requires full equipment access. Please upgrade your plan.');
      return;
    }

    const remainingAfterBooking = isUnlimited ? 'unlimited' : remainingClasses - 1;

    Alert.alert(
      'Confirm Booking',
      `Book "${class_.name}" on ${formatDate(class_.date)} at ${formatTime(class_.time)}?\n\nRemaining classes after booking: ${remainingAfterBooking}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Book Class', 
          onPress: async () => {
            try {
              await dispatch(createBooking({ classId })).unwrap();
              Alert.alert('Success', 'Class booked successfully!');
              onRefresh();
            } catch (error: any) {
              // If booking fails, it might be because class is full - try to join waitlist
              if (error.includes('waitlist') || error.includes('full')) {
                Alert.alert('Class Full', 'This class is full. Would you like to join the waitlist?', [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Join Waitlist', 
                    onPress: async () => {
                      try {
                        const result = await bookingService.joinWaitlist({ classId });
                        if (result.success) {
                          Alert.alert('Success', `You've been added to the waitlist at position #${result.data?.position}.`);
                          onRefresh();
                        } else {
                          Alert.alert('Error', result.message || 'Failed to join waitlist');
                        }
                      } catch (error) {
                        Alert.alert('Error', 'Failed to join waitlist');
                      }
                    }
                  }
                ]);
              } else {
                Alert.alert('Booking Failed', error || 'Failed to book class');
              }
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor }]}>
        <ActivityIndicator size="large" color={accentColor} />
        <Body style={{ ...styles.loadingText, color: textColor }}>Loading your dashboard...</Body>
      </View>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor }]} 
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[accentColor]}
          tintColor={accentColor}
        />
      }
    >
      {/* Welcome Header */}
      <Surface style={[styles.welcomeHeader, { backgroundColor: surfaceColor, borderBottomWidth: 1, borderBottomColor: textMutedColor }]}>
        <View style={styles.welcomeContent}>
          <View>
            <H1 style={{ ...styles.welcomeTitle, color: textColor }}>Welcome back!</H1>
            <Body style={{ ...styles.welcomeSubtitle, color: textSecondaryColor }}>{user?.name}</Body>
          </View>
          <View style={styles.welcomeActions}>
            <MaterialIcons name="waving-hand" size={32} color="#FFD700" />
            {/* Development: Crash Test Button */}
            {__DEV__ && (
              <Button 
                mode="contained" 
                onPress={() => navigation.navigate('CrashTest' as never)}
                style={{ marginLeft: 8 }}
                buttonColor="#FF6B6B"
                textColor="white"
                icon="bug-report"
              >
                Test
              </Button>
            )}
          </View>
        </View>
      </Surface>

      {/* Subscription Status */}
      <View style={styles.subscriptionContainer}>
        {dashboardData.subscription ? (
          <Card style={[styles.subscriptionCard, { backgroundColor: surfaceColor, borderColor: textMutedColor }]}>
            <Card.Content style={styles.statCardContent}>
              <View style={styles.statHeader}>
                <MaterialIcons name="card-membership" size={24} color={primaryColor} />
                <Caption style={{ ...styles.statLabel, color: textSecondaryColor }}>
                  {currentSubscription?.duration_months && currentSubscription.duration_months < 1 ? 'Day Pass' : 'Current Plan'}
                </Caption>
              </View>
              <H3 style={{ ...styles.statValue, color: textColor }}>{dashboardData.subscription.plan_name}</H3>
              <Body style={{ ...styles.statSubtext, color: textSecondaryColor }}>
                {currentSubscription?.duration_months && currentSubscription.duration_months < 1 ? 
                  (dashboardData.subscription.remaining_classes > 0 ? 
                    `Valid for ${dashboardData.subscription.remaining_classes} class${dashboardData.subscription.remaining_classes === 1 ? '' : 'es'}` :
                    'Used') :
                  `${dashboardData.subscription.remaining_classes} classes remaining`}
              </Body>
            </Card.Content>
          </Card>
        ) : (
          <Card style={[styles.noSubscriptionCard, { backgroundColor: surfaceColor, borderColor: textMutedColor }]}>
            <Card.Content style={styles.statCardContent}>
              <View style={styles.statHeader}>
                <MaterialIcons name="emoji-emotions" size={24} color={accentColor} />
                <Caption style={{ ...styles.statLabel, color: textSecondaryColor }}>Welcome!</Caption>
              </View>
              <H3 style={{ ...styles.statValue, color: textColor }}>Ready to Start?</H3>
              <Body style={{ ...styles.statSubtext, color: textSecondaryColor }}>
                Visit reception to begin your journey
              </Body>
            </Card.Content>
          </Card>
        )}
      </View>

      {/* My Booked Classes */}
      <Card style={[styles.sectionCard, { backgroundColor: surfaceColor }]}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <H2 style={{ ...styles.sectionTitle, color: textColor }}>{`My Booked Classes (${dashboardData.bookedClasses.length})`}</H2>
            <Button 
              mode="text" 
              onPress={() => navigation.navigate('BookingHistory')}
              icon="arrow-right"
              textColor={accentColor}
            >
              View All
            </Button>
          </View>

          {dashboardData.bookedClasses.length > 0 ? (
            <View style={styles.classList}>
              {dashboardData.bookedClasses.map((booking) => {
                const timeStatus = getClassTimeStatus(booking.class_date || '', booking.class_time || '');
                const canCancel = canCancelBooking(booking.class_date || '', booking.class_time || '');
                
                return (
                <Card key={booking.id} style={[styles.classCard, { backgroundColor: surfaceColor, borderColor: textMutedColor }]}>
                  <Card.Content style={styles.classCardContent}>
                    <View style={styles.classHeader}>
                      <View style={styles.classInfo}>
                        <H3 style={{ ...styles.className, color: textColor }}>{booking.class_name || 'Class'}</H3>
                        <Body style={{ ...styles.classInstructor, color: textSecondaryColor }}>with {booking.instructor_name || 'Instructor'}</Body>
                      </View>
                      <View style={styles.classIcons}>
                        <View style={[styles.iconBadge, { backgroundColor: getEquipmentColor(booking.equipment_type || 'mat') }]}>
                          <MaterialIcons 
                            name={getEquipmentIcon(booking.equipment_type || 'mat')} 
                            size={16} 
                            color="white" 
                          />
                        </View>
                        <View style={[styles.iconBadge, { backgroundColor: primaryColor }]}>
                          <MaterialIcons name="check" size={16} color="white" />
                        </View>
                      </View>
                    </View>
                    
                    <View style={styles.classDetails}>
                      <View style={styles.classDetailItem}>
                        <MaterialIcons name="calendar-today" size={16} color={textSecondaryColor} />
                        <Caption style={{ ...styles.classDetailText, color: textSecondaryColor }}>{formatDate(booking.class_date || '')}</Caption>
                      </View>
                      <View style={styles.classDetailItem}>
                        <MaterialIcons name="access-time" size={16} color={textSecondaryColor} />
                        <Caption style={{ ...styles.classDetailText, color: textSecondaryColor }}>{formatTime(booking.class_time || '')}</Caption>
                      </View>
                      {booking.room && (
                        <View style={styles.classDetailItem}>
                          <MaterialIcons name="room" size={16} color={textSecondaryColor} />
                          <Caption style={{ ...styles.classDetailText, color: textSecondaryColor }}>{booking.room}</Caption>
                        </View>
                      )}
                      <View style={styles.classDetailItem}>
                        <MaterialIcons name="confirmation-number" size={16} color={textSecondaryColor} />
                        <Caption style={{ ...styles.classDetailText, color: textSecondaryColor }}>Booked</Caption>
                      </View>
                    </View>

                    {/* Time Status Indicator */}
                    <View style={styles.timeStatusContainer}>
                      <View style={[styles.timeStatusIndicator, { backgroundColor: timeStatus.color }]}>
                        <MaterialIcons 
                          name={timeStatus.status === 'ok' ? 'schedule' : timeStatus.status === 'warning' ? 'warning' : 'do-not-disturb-off'} 
                          size={12} 
                          color="white" 
                        />
                      </View>
                      <Caption style={{ ...styles.timeStatusText, color: timeStatus.color }}>
                        {timeStatus.message}
                      </Caption>
                    </View>

                    <Button 
                      mode="outlined" 
                      style={[
                        styles.bookButton, 
                        { 
                          borderColor: canCancel ? errorColor : textMutedColor,
                          opacity: canCancel ? 1 : 0.5
                        }
                      ]}
                      textColor={canCancel ? errorColor : textMutedColor}
                      icon={canCancel ? "cancel" : "do-not-disturb-off"}
                      disabled={!canCancel}
                      onPress={() => handleCancelBooking(booking)}
                    >
                      {canCancel ? 'Cancel' : 'Cannot Cancel'}
                    </Button>
                  </Card.Content>
                </Card>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons name="event-available" size={48} color={textMutedColor} />
              <Body style={{ ...styles.emptyStateText, color: textColor }}>No booked classes yet</Body>
              <Caption style={{ ...styles.emptyStateSubtext, color: textSecondaryColor }}>
                Book a class below to see it here!
              </Caption>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Waitlist Classes */}
      {dashboardData.waitlistClasses.length > 0 && (
        <Card style={[styles.sectionCard, { backgroundColor: surfaceColor }]}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <H2 style={{ ...styles.sectionTitle, color: textColor }}>{`Waitlist (${dashboardData.waitlistClasses.length})`}</H2>
              <MaterialIcons name="queue" size={24} color={warningColor} />
            </View>

            <View style={styles.classList}>
              {dashboardData.waitlistClasses.map((waitlistEntry) => (
                <Card key={waitlistEntry.id} style={[styles.classCard, { backgroundColor: surfaceColor, borderColor: warningColor, borderWidth: 1 }]}>
                  <Card.Content style={styles.classCardContent}>
                    <View style={styles.classHeader}>
                      <View style={styles.classInfo}>
                        <H3 style={{ ...styles.className, color: textColor }}>{waitlistEntry.class_name || 'Class'}</H3>
                        <Body style={{ ...styles.classInstructor, color: textSecondaryColor }}>with {waitlistEntry.instructor_name || 'Instructor'}</Body>
                      </View>
                      <View style={styles.classIcons}>
                        <View style={[styles.iconBadge, { backgroundColor: warningColor }]}>
                          <MaterialIcons name="queue" size={16} color="white" />
                        </View>
                        <View style={[styles.iconBadge, { backgroundColor: warningColor }]}>
                          <Body style={{ color: 'white', fontWeight: 'bold' }}>#{waitlistEntry.position}</Body>
                        </View>
                      </View>
                    </View>
                    
                    <View style={styles.classDetails}>
                      <View style={styles.classDetailItem}>
                        <MaterialIcons name="calendar-today" size={16} color={textSecondaryColor} />
                        <Caption style={{ ...styles.classDetailText, color: textSecondaryColor }}>{formatDate(waitlistEntry.date || '')}</Caption>
                      </View>
                      <View style={styles.classDetailItem}>
                        <MaterialIcons name="access-time" size={16} color={textSecondaryColor} />
                        <Caption style={{ ...styles.classDetailText, color: textSecondaryColor }}>{formatTime(waitlistEntry.time || '')}</Caption>
                      </View>
                      <View style={styles.classDetailItem}>
                        <MaterialIcons name="queue" size={16} color={warningColor} />
                        <Caption style={{ ...styles.classDetailText, color: warningColor }}>Position #{waitlistEntry.position}</Caption>
                      </View>
                    </View>

                    <Button 
                      mode="outlined" 
                      onPress={async () => {
                        Alert.alert(
                          'Leave Waitlist',
                          'Are you sure you want to leave the waitlist?',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { 
                              text: 'Yes', 
                              onPress: async () => {
                                try {
                                  const result = await bookingService.leaveWaitlist(waitlistEntry.id);
                                  if (result.success) {
                                    Alert.alert('Success', 'You have been removed from the waitlist.');
                                    onRefresh();
                                  } else {
                                    Alert.alert('Error', result.message || 'Failed to leave waitlist');
                                  }
                                } catch (error) {
                                  Alert.alert('Error', 'Failed to leave waitlist');
                                }
                              }
                            }
                          ]
                        );
                      }}
                      textColor={errorColor}
                      style={[styles.bookButton, { borderColor: errorColor }]}
                      icon="cancel"
                    >
                      Leave Waitlist
                    </Button>
                  </Card.Content>
                </Card>
              ))}
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Upcoming Classes */}
      <Card style={[styles.sectionCard, { backgroundColor: surfaceColor }]}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <H2 style={{ ...styles.sectionTitle, color: textColor }}>Upcoming Classes</H2>
            <Button 
              mode="text" 
              onPress={() => navigation.navigate('ClassesView')}
              icon="arrow-right"
              textColor={accentColor}
            >
              View All
            </Button>
          </View>

          {dashboardData.upcomingClasses.length > 0 ? (
            <View style={styles.classList}>
              {dashboardData.upcomingClasses.map((cls) => {
                const timeStatus = getClassTimeStatus(cls.date, cls.time);
                const hoursUntil = getHoursUntilClass(cls.date, cls.time);
                
                return (
                <Card key={cls.id} style={[styles.classCard, { backgroundColor: surfaceColor, borderColor: textMutedColor }]}>
                  <Card.Content style={styles.classCardContent}>
                    <View style={styles.classHeader}>
                      <View style={styles.classInfo}>
                        <H3 style={{ ...styles.className, color: textColor }}>{cls.name}</H3>
                        <Body style={{ ...styles.classInstructor, color: textSecondaryColor }}>with {cls.instructor_name}</Body>
                      </View>
                      <View style={styles.classIcons}>
                        <View style={[styles.iconBadge, { backgroundColor: getEquipmentColor(cls.equipment_type) }]}>
                          <MaterialIcons 
                            name={getEquipmentIcon(cls.equipment_type)} 
                            size={16} 
                            color="white" 
                          />
                        </View>
                        <View style={[styles.iconBadge, { backgroundColor: getLevelColor(cls.level || 'beginner') }]}>
                          <Body style={{ ...styles.badgeText, color: 'white' }}>{(cls.level || 'beginner').charAt(0).toUpperCase()}</Body>
                        </View>
                      </View>
                    </View>
                    
                    <View style={styles.classDetails}>
                      <View style={styles.classDetailItem}>
                        <MaterialIcons name="calendar-today" size={16} color={textSecondaryColor} />
                        <Caption style={{ ...styles.classDetailText, color: textSecondaryColor }}>{formatDate(cls.date)}</Caption>
                      </View>
                      <View style={styles.classDetailItem}>
                        <MaterialIcons name="access-time" size={16} color={textSecondaryColor} />
                        <Caption style={{ ...styles.classDetailText, color: textSecondaryColor }}>{formatTime(cls.time)}</Caption>
                      </View>
                      <View style={styles.classDetailItem}>
                        <MaterialIcons name="timer" size={16} color={textSecondaryColor} />
                        <Caption style={{ ...styles.classDetailText, color: textSecondaryColor }}>{`${cls.duration} min`}</Caption>
                      </View>
                      {cls.room && (
                        <View style={styles.classDetailItem}>
                          <MaterialIcons name="room" size={16} color={textSecondaryColor} />
                          <Caption style={{ ...styles.classDetailText, color: textSecondaryColor }}>{cls.room}</Caption>
                        </View>
                      )}
                      <View style={styles.classDetailItem}>
                        <MaterialIcons name="people" size={16} color={textSecondaryColor} />
                        <Caption style={{ ...styles.classDetailText, color: textSecondaryColor }}>
                          {`${cls.enrolled}/${cls.capacity}`}
                        </Caption>
                      </View>
                    </View>

                    {/* Time Status Indicator for Upcoming Classes */}
                    <View style={styles.timeStatusContainer}>
                      <View style={[styles.timeStatusIndicator, { backgroundColor: primaryColor }]}>
                        <MaterialIcons name="schedule" size={12} color="white" />
                      </View>
                      <Caption style={{ ...styles.timeStatusText, color: textSecondaryColor }}>
                        {formatTimeUntilClass(cls.date, cls.time)}
                      </Caption>
                    </View>

                    <Button 
                      mode="outlined" 
                      style={[styles.bookButton, { borderColor: accentColor }]}
                      textColor={accentColor}
                      icon="calendar-plus"
                      disabled={cls.enrolled >= cls.capacity}
                      onPress={() => handleBookClass(cls.id)}
                    >
                      {cls.enrolled >= cls.capacity ? 'Full' : 'Book'}
                    </Button>
                  </Card.Content>
                </Card>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons name="event-busy" size={48} color={textMutedColor} />
              <Body style={{ ...styles.emptyStateText, color: textColor }}>
                {dashboardData.subscription 
                  ? 'No upcoming classes available' 
                  : 'Ready to book your first class?'}
              </Body>
              <Caption style={{ ...styles.emptyStateSubtext, color: textSecondaryColor }}>
                {dashboardData.subscription 
                  ? 'Check back later or contact reception for more information'
                  : 'Visit our reception to get a subscription and start booking classes!'}
              </Caption>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Quick Actions */}
      <Card style={[styles.sectionCard, { backgroundColor: surfaceColor }]}>
        <Card.Content>
          <H2 style={{ ...styles.sectionTitle, color: textColor }}>Quick Actions</H2>
          <View style={styles.quickActionsGrid}>
            <Button 
              mode="contained" 
              style={[styles.actionButton, styles.primaryAction, { backgroundColor: accentColor }]}
              labelStyle={{ color: backgroundColor }}
              icon="calendar-plus"
              onPress={() => navigation.navigate('ClassesView')}
            >
              Book Class
            </Button>
            <Button 
              mode="outlined" 
              style={[styles.actionButton, { borderColor: accentColor }]}
              textColor={accentColor}
              icon="history"
              onPress={() => navigation.navigate('BookingHistory')}
            >
              View History
            </Button>
            <Button 
              mode="outlined" 
              style={[styles.actionButton, { borderColor: accentColor }]}
              textColor={accentColor}
              icon="account"
              onPress={() => navigation.navigate('Profile')}
            >
              Profile
            </Button>
            <Button 
              mode="outlined" 
              style={[styles.actionButton, { borderColor: accentColor }]}
              textColor={accentColor}
              icon="help-circle"
              onPress={() => Alert.alert('Help', 'Contact our reception team for assistance:\n\n📞 Phone: (555) 123-4567\n✉️ Email: help@pilatesstudio.com\n🏢 Visit us at the front desk')}
            >
              Need Help?
            </Button>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  welcomeHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent', // This will be overridden by inline style
  },
  welcomeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  welcomeTitle: {
    marginBottom: 10,
  },
  welcomeSubtitle: {
    // This will be overridden by inline style
  },
  welcomeActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subscriptionContainer: {
    marginBottom: 20,
  },
  statCardContent: {
    padding: 20,
    gap: 10,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  statLabel: {
    // This will be overridden by inline style
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    // This will be overridden by inline style
  },
  statSubtext: {
    // This will be overridden by inline style
  },
  subscriptionCard: {
    borderRadius: 12,
    ...shadows.card,
    borderWidth: 1.5,
    borderColor: 'transparent', // This will be overridden by inline style
  },
  noSubscriptionCard: {
    borderRadius: 12,
    ...shadows.card,
    borderWidth: 1.5,
    borderColor: 'transparent', // This will be overridden by inline style
  },
  sectionCard: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    // This will be overridden by inline style
  },
  classList: {
    gap: 10,
  },
  classCard: {
    borderRadius: 12,
    ...shadows.card,
    borderWidth: 1,
    borderColor: 'transparent', // This will be overridden by inline style
  },
  classCardContent: {
    padding: 20,
    gap: 10,
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  classInfo: {
    flex: 1,
  },
  className: {
    fontWeight: '600',
    // This will be overridden by inline style
  },
  classInstructor: {
    // This will be overridden by inline style
  },
  classIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  iconBadge: {
    padding: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '500',
    // This will be overridden by inline style
  },
  classDetails: {
    gap: 5,
  },
  classDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  classDetailText: {
    // This will be overridden by inline style
  },
  bookButton: {
    borderRadius: 12,
    marginLeft: 10,
    // This will be overridden by inline style
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    // This will be overridden by inline style
    fontSize: 16,
    marginBottom: 10,
  },
  emptyStateSubtext: {
    // This will be overridden by inline style
    fontSize: 14,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    ...shadows.card,
    borderWidth: 1,
    borderColor: 'transparent', // This will be overridden by inline style
  },
  primaryAction: {
    // This will be overridden by inline style
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    // This will be overridden by inline style
    textAlign: 'center',
  },
  timeStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 5,
  },
  timeStatusIndicator: {
    padding: 4,
    borderRadius: 8,
  },
  timeStatusText: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default ClientDashboard; 