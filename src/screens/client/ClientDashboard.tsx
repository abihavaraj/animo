import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import moment from 'moment';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Dimensions, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Card, Surface } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { Body, Caption, H1, H2, H3 } from '../../../components/ui/Typography';
import { useThemeColor } from '../../../hooks/useThemeColor';
import { Booking, bookingService } from '../../services/bookingService';
import { BackendClass, classService } from '../../services/classService';
import { notificationService } from '../../services/notificationService';
import { pushNotificationService } from '../../services/pushNotificationService';
import { subscriptionService } from '../../services/subscriptionService';
import { AppDispatch, RootState } from '../../store';
import { createBooking } from '../../store/bookingSlice';
import { fetchCurrentSubscription } from '../../store/subscriptionSlice';
import { shadows } from '../../utils/shadows';

// Helper function to check equipment access validation
const isEquipmentAccessAllowed = (userAccess: string, classEquipment: string): boolean => {
  // 'both' access allows everything
  if (userAccess === 'both') {
    return true;
  }
  
  // For specific access, user can only book classes that match their access level
  if (userAccess === classEquipment) {
    return true;
  }
  
  // Special case: if class requires 'both' equipment, user needs 'both' access
  if (classEquipment === 'both' && userAccess !== 'both') {
    return false;
  }
  
  return false;
};

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
      // Add a longer delay for production IPA to ensure session restoration completes
      // This prevents the race condition where dashboard loads before Supabase session is restored
      setTimeout(() => {
        loadDashboardData();
        // Also refresh Redux store to keep it in sync
        dispatch(fetchCurrentSubscription());
      }, 0); // 🚀 OPTIMIZATION: Removed artificial delay
    }, [dispatch])
  );

  // Add notification listener for automatic dashboard refresh on waitlist updates
  useEffect(() => {
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      const data = notification.request.content.data;
      
      // Refresh dashboard when waitlist-related notifications are received
      if (data?.type === 'class_notification' && user?.id === data?.userId) {
        console.log('🔄 [Dashboard] Auto-refreshing due to waitlist notification for user:', user?.id);
        console.log('🔄 [Dashboard] Notification data:', data);
        setTimeout(() => {
          console.log('🔄 [Dashboard] Starting delayed refresh for waitlist update...');
          loadDashboardData().then(() => {
            console.log('🔄 [Dashboard] Refresh completed, checking waitlist positions...');
          });
        }, 3000); // Further increased delay for database consistency
      }
    });

    return () => {
      notificationListener.remove();
    };
  }, [user?.id, loadDashboardData]);

  // 🚀 OPTIMIZED: Memoize date calculations to avoid recalculation
  const dateHelpers = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + 30); // Only next 30 days
    const futureDateStr = futureDate.toISOString().split('T')[0];
    
    return { now, todayStr, futureDateStr };
  }, []);

  // 🚀 OPTIMIZED: Parallel data loading with date filters
  const loadDashboardData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);



      // 🔄 UPDATE: Automatically update completed class statuses before loading
      await classService.updateCompletedClassStatus();

      // 🚀 OPTIMIZATION 1: Parallel API calls
      const [
        bookingsResponse,
        waitlistResponse,
        classesResponse,
        subscriptionResponse,
        notificationsResponse
      ] = await Promise.allSettled([
        // Load only upcoming bookings with date filter
        bookingService.getBookings({
          from: dateHelpers.todayStr
        }),
        
        // Load user waitlist
        bookingService.getUserWaitlist(user.id),
        
        // Load only upcoming classes with enrollment counts
        classService.getClasses({
          upcoming: true,
          date_from: dateHelpers.todayStr,
          date_to: dateHelpers.futureDateStr
        }),
        
        // Load subscription
        subscriptionService.getCurrentSubscription(),
        
        // Load recent notifications only
        notificationService.getUserNotifications(user.id, { limit: 3 })
      ]);

      // 🚀 OPTIMIZATION 2: Optimized data processing with early filtering
      let bookedClasses: Booking[] = [];
      let bookedClassIds: Set<string> = new Set(); // Changed to string to support UUIDs
      
      if (bookingsResponse.status === 'fulfilled' && bookingsResponse.value.success) {
        // First pass: collect booked class IDs and filter valid bookings
        const validBookings = bookingsResponse.value.data.filter(booking => {
          // Quick status check first
          const activeStatuses = ['confirmed', 'booked', 'active'];
          if (!activeStatuses.includes(booking.status)) return false;
          
          // Only process if status is valid
          const classData = booking.classes || booking;
          const classDate = classData.class_date || classData.date;
          const classTime = classData.class_time || classData.time;
          
          if (!classDate || !classTime) return false;
          
          // Optimized date comparison
          const classDateTime = new Date(`${classDate} ${classTime}`);
          const isFutureClass = classDateTime > dateHelpers.now;
          
          // Add to bookedClassIds if this is a valid future booking
          if (isFutureClass) {
            const classId = booking.class_id || booking.classId;
            if (classId) {
              const classIdStr = classId.toString();
              bookedClassIds.add(classIdStr);

            }
          }
          
          return isFutureClass;
        });
        
        // Second pass: map the data structure
        bookedClasses = validBookings.map(booking => {
          const classData = booking.classes || {};
          
          // Flatten data structure
          return {
            ...booking,
            class_name: classData.name || booking.class_name,
            instructor_name: classData.instructor_name || booking.instructor_name,
            class_date: classData.date || booking.class_date,
            class_time: classData.time || booking.class_time,
            equipment_type: classData.equipment_type || booking.equipment_type,
            room: classData.room || booking.room,
            level: classData.level || booking.level,
          };
        });
      }

      // Process waitlist efficiently
      let waitlistClasses: any[] = [];
      let waitlistedClassIds: Set<string> = new Set();
      
      if (waitlistResponse.status === 'fulfilled' && waitlistResponse.value.success) {
        console.log('📋 [Dashboard] Raw waitlist data:', waitlistResponse.value.data);
        waitlistClasses = waitlistResponse.value.data
          .filter(waitlistEntry => {
            const classData = waitlistEntry.classes || {};
            const classDate = classData.date || waitlistEntry.class_date;
            const classTime = classData.time || waitlistEntry.class_time;
            
            if (!classDate || !classTime) return false;
            
            const classDateTime = new Date(`${classDate} ${classTime}`);
            const hoursUntilClass = (classDateTime.getTime() - dateHelpers.now.getTime()) / (1000 * 60 * 60);
            
            // Auto-remove from waitlist if within 2 hours (don't wait for response)
            if (hoursUntilClass <= 2 && hoursUntilClass > 0) {
              bookingService.leaveWaitlist(waitlistEntry.id).catch(console.error);
              return false;
            }
            
            return classDateTime > dateHelpers.now;
          })
          .map(waitlistEntry => {
            const classData = waitlistEntry.classes || {};
            const classId = waitlistEntry.class_id;
            if (classId) waitlistedClassIds.add(classId.toString());
            
            console.log(`📋 [Dashboard] Processing waitlist entry - Class: ${classData.name}, Position: ${waitlistEntry.position}, User: ${waitlistEntry.user_id}`);
            
            return {
              ...waitlistEntry,
              class_name: classData.name || waitlistEntry.class_name,
              instructor_name: classData.users?.name || waitlistEntry.instructor_name,
              class_date: classData.date || waitlistEntry.class_date,
              class_time: classData.time || waitlistEntry.class_time,
              equipment_type: classData.equipment_type || waitlistEntry.equipment_type,
              room: classData.room || waitlistEntry.room,
              level: classData.level || waitlistEntry.level
            };
          });
        console.log('📋 [Dashboard] Processed waitlist classes:', waitlistClasses);
      }

      // Process upcoming classes efficiently
      let upcomingClasses: BackendClass[] = [];
      if (classesResponse.status === 'fulfilled' && classesResponse.value.success) {


        
        let debugCount = 0;
        upcomingClasses = classesResponse.value.data
          .filter(cls => {
            // Use string ID comparison to support both UUIDs and integers
            const classIdStr = cls.id.toString();
            
            const isBooked = bookedClassIds.has(classIdStr);
            const isWaitlisted = waitlistedClassIds.has(classIdStr);
            
            // Debug logging for first few classes
            if (debugCount < 3) {
              const classDateTime = new Date(`${cls.date}T${cls.time}`);
              const classEndTime = new Date(classDateTime.getTime() + (cls.duration || 60) * 60000); // Add duration
              const isPastClass = classEndTime < dateHelpers.now; // Class is past if it has ended

              debugCount++;
            }
            
            // Additional safety check: exclude classes that have ENDED (not just started)
            const classDateTime = new Date(`${cls.date}T${cls.time}`);
            const classEndTime = new Date(classDateTime.getTime() + (cls.duration || 60) * 60000);
            const isFutureClass = classEndTime > dateHelpers.now; // Use end time, not start time
            
            if (!isFutureClass) {

            }
            
            // Quick exclusion checks
            return !isBooked && !isWaitlisted && isFutureClass;
          })
          .sort((a, b) => {
            // Optimized sorting
            const dateA = new Date(`${a.date} ${a.time}`);
            const dateB = new Date(`${b.date} ${b.time}`);
            return dateA.getTime() - dateB.getTime();
          })
          .slice(0, 5); // Limit to 5 upcoming classes
      }

      // Process subscription
      let subscriptionData = null;
      if (subscriptionResponse.status === 'fulfilled' && subscriptionResponse.value.success) {
        const subscription = subscriptionResponse.value.data;
        if (subscription?.end_date) {
          const daysUntilEnd = Math.ceil((new Date(subscription.end_date).getTime() - dateHelpers.now.getTime()) / (1000 * 60 * 60 * 24));
          if (daysUntilEnd >= 0) {
            subscriptionData = subscription;
          }
        } else {
          subscriptionData = subscription;
        }
      }

      // Process notifications
      let notifications: Notification[] = [];
      if (notificationsResponse.status === 'fulfilled' && notificationsResponse.value.success) {
        notifications = notificationsResponse.value.data
          .filter(n => n.type === 'subscription_expiring' || n.type === 'subscription_changed')
          .slice(0, 3);
      }

      // 🚀 OPTIMIZATION 3: Single state update
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
  }, [user, dateHelpers]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    dispatch(fetchCurrentSubscription());
    loadDashboardData();
  }, [dispatch, loadDashboardData]);

  // 🚀 OPTIMIZATION 5: Memoized helper functions
  const getEquipmentIcon = useCallback((equipment: string) => {
    switch (equipment) {
      case 'mat': return 'self-improvement';
      case 'reformer': return 'fitness-center';
      case 'both': return 'fitness-center';
      default: return 'help-outline';
    }
  }, []);

  const getEquipmentColor = useCallback((equipment: string) => {
    switch (equipment) {
      case 'mat': return successColor;
      case 'reformer': return warningColor;
      case 'both': return accentColor;
      default: return textSecondaryColor;
    }
  }, [successColor, warningColor, accentColor, textSecondaryColor]);

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
    
    if (!isEquipmentAccessAllowed(planEquipment, class_.equipment_type)) {
      const accessMap = {
        'mat': 'Mat-only',
        'reformer': 'Reformer-only',
        'both': 'Full equipment'
      };
      
      Alert.alert(
        'Equipment Access Required',
        `This class requires ${accessMap[class_.equipment_type] || class_.equipment_type} access. Your subscription only includes ${accessMap[planEquipment] || planEquipment} access. Please upgrade your plan.`
      );
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
                          Alert.alert('Error', result.error || 'Failed to join waitlist');
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

  const handleJoinWaitlist = async (classId: number) => {
    const class_ = dashboardData.upcomingClasses.find(c => c.id === classId);
    if (!class_) return;

    // Check if user has subscription
    if (!currentSubscription) {
      Alert.alert('Subscription Required', 'You need an active subscription plan to join waitlists. Please contact reception to purchase a plan.');
      return;
    }

    Alert.alert(
      'Join Waitlist',
      `Join the waitlist for "${class_.name}" on ${formatDate(class_.date)} at ${formatTime(class_.time)}?\n\nYou'll be notified if a spot becomes available.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Join Waitlist', 
          onPress: async () => {
            try {
              const result = await bookingService.joinWaitlist({ classId });
              if (result.success) {
                Alert.alert('Success', `You've been added to the waitlist at position #${result.data?.position}.`);
                onRefresh(); // Refresh dashboard data
              } else {
                Alert.alert('Error', result.error || 'Failed to join waitlist');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to join waitlist');
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
                icon="build"
              >
                Test Crash
              </Button>
            )}
            
            {/* Development: Notification Test Button */}
            {__DEV__ && (
              <Button 
                mode="contained" 
                onPress={() => pushNotificationService.sendTestNotification()}
                style={{ marginLeft: 8 }}
                buttonColor="#8A2BE2"
                textColor="white"
                icon="notifications"
              >
                Test Local
              </Button>
            )}
            
            {/* Development: Remote Notification Test Button */}
            {__DEV__ && (
              <Button 
                mode="contained" 
                onPress={() => pushNotificationService.sendRemoteTestNotification()}
                style={{ marginLeft: 8 }}
                buttonColor="#FF6B35"
                textColor="white"
                icon="send"
              >
                Test Remote
              </Button>
            )}
            
            {/* Development: Show Push Token Button */}
            {__DEV__ && (
              <Button 
                mode="contained" 
                onPress={() => {
                  const token = pushNotificationService.getPushTokenValue();
                  Alert.alert(
                    'Push Token',
                    token || 'No token available',
                    [{ text: 'OK' }]
                  );
                }}
                style={{ marginLeft: 8 }}
                buttonColor="#4CAF50"
                textColor="white"
                icon="key"
              >
                Show Token
              </Button>
            )}
            
            {/* Test Push Notification Button - Works in both DEV and IPA */}
            <Button 
              mode="contained" 
              onPress={async () => {
                try {
                  // First, get and show the push token
                  const token = pushNotificationService.getPushTokenValue();
                  if (!token) {
                    Alert.alert('No Token', 'No push token available. The app may not be registered for notifications.');
                    return;
                  }
                  
                  // Show the token so user can copy it
                  Alert.alert(
                    'IPA Push Token', 
                    `Token: ${token}\n\nUse this token to test notifications with curl command.`,
                    [
                      { text: 'Copy Full Token', onPress: () => {
                        // Show full token in another alert for easier copying
                        Alert.alert('Full Token', token);
                      }},
                      { text: 'Re-register Token', onPress: async () => {
                        try {
                          await pushNotificationService.forceTokenReregistration();
                          Alert.alert('Success', 'Token re-registered! Try the test again.');
                        } catch (error) {
                          Alert.alert('Error', `Re-registration failed: ${(error as Error).message || error}`);
                        }
                      }},
                      { text: 'Send Test', onPress: async () => {
                        try {
                          const result = await pushNotificationService.sendTestNotification();
                          Alert.alert('Success', 'Test notification sent! Check if you received it.');
                        } catch (error) {
                          Alert.alert('Error', `Failed: ${(error as Error).message || error}`);
                        }
                      }},
                      { text: 'Cancel', style: 'cancel' }
                    ]
                  );
                } catch (error) {
                  Alert.alert('Error', `Failed to get token: ${(error as Error).message || error}`);
                }
              }}
              style={{ marginLeft: 8 }}
              buttonColor="#FF5722"
              textColor="white"
              icon="bell-ring"
            >
              Test Push
            </Button>
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
                  {currentSubscription?.duration_unit === 'days' ? 'Day Pass' : 'Current Plan'}
                </Caption>
              </View>
              <H3 style={{ ...styles.statValue, color: textColor }}>{dashboardData.subscription.plan_name}</H3>
              <Body style={{ ...styles.statSubtext, color: textSecondaryColor }}>
                {currentSubscription?.duration_unit === 'days' ? 
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

      {/* Development: Subscription Debug Section */}
      {__DEV__ && (
        <Card style={[styles.sectionCard, { backgroundColor: surfaceColor, borderColor: '#FF9800' }]}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <H2 style={{ ...styles.sectionTitle, color: '#FF9800' }}>🔍 Subscription Debug</H2>
              <MaterialIcons name="bug-report" size={24} color="#FF9800" />
            </View>
            
            <View style={styles.debugInfo}>
              <Caption style={{ color: textSecondaryColor }}>
                📊 Current Subscription: {currentSubscription ? `${currentSubscription.plan_name} (${currentSubscription.status})` : 'NULL - This causes Ready to Start!'}
              </Caption>
              <Caption style={{ color: textSecondaryColor }}>
                🆔 User ID: {user?.id || 'No user ID'}
              </Caption>
              <Caption style={{ color: textSecondaryColor }}>
                📧 Email: {user?.email || 'No email'}
              </Caption>
              <Caption style={{ color: textSecondaryColor }}>
                📋 Dashboard Subscription: {dashboardData.subscription ? `${dashboardData.subscription.plan_name}` : 'NULL - This causes Ready to Start!'}
              </Caption>
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Development: Push Notification Debug Section */}
      {__DEV__ && (
        <Card style={[styles.sectionCard, { backgroundColor: surfaceColor, borderColor: '#FF6B6B' }]}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <H2 style={{ ...styles.sectionTitle, color: '#FF6B6B' }}>🔧 Push Notification Debug</H2>
              <MaterialIcons name="build" size={24} color="#FF6B6B" />
            </View>
            
            <View style={styles.debugGrid}>
              <Button 
                mode="contained" 
                onPress={() => pushNotificationService.sendTestNotification()}
                style={styles.debugButton}
                buttonColor="#8A2BE2"
                textColor="white"
                icon="notifications"
              >
                Test Local
              </Button>
              
              <Button 
                mode="contained" 
                onPress={() => pushNotificationService.sendRemoteTestNotification()}
                style={styles.debugButton}
                buttonColor="#FF6B35"
                textColor="white"
                icon="send"
              >
                Test Remote
              </Button>
              
              <Button 
                mode="contained" 
                onPress={() => {
                  const token = pushNotificationService.getPushTokenValue();
                  Alert.alert(
                    'Push Token',
                    token || 'No token available',
                    [{ text: 'OK' }]
                  );
                }}
                style={styles.debugButton}
                buttonColor="#4CAF50"
                textColor="white"
                icon="key"
              >
                Show Token
              </Button>
              
              <Button 
                mode="contained" 
                onPress={() => {
                  Alert.alert(
                    'Test Class Reminder',
                    'Sending test class reminder notification...',
                    [{ text: 'OK' }]
                  );
                  // Get current user ID from Redux store or auth context
                  const userId = user?.id;
                  pushNotificationService.sendClassReminder('Pilates Mat', 'Sarah', 30, userId);
                }}
                style={styles.debugButton}
                buttonColor="#FF9800"
                textColor="white"
                icon="event"
              >
                Test Reminder
              </Button>
              
                                  <Button 
                      mode="contained" 
                      onPress={() => {
                        const command = pushNotificationService.getPowerShellCurlCommand();
                        Alert.alert(
                          'PowerShell Command',
                          command,
                          [{ text: 'Copy', onPress: () => {} }, { text: 'OK' }]
                        );
                      }}
                      style={styles.debugButton}
                      buttonColor="#9C27B0"
                      textColor="white"
                      icon="code"
                    >
                      PowerShell Cmd
                    </Button>
                    
                    <Button 
                      mode="contained" 
                      onPress={() => {
                        Alert.alert(
                          'Schedule Reminders',
                          'Scheduling class reminders for all upcoming bookings...',
                          [{ text: 'OK' }]
                        );
                        const userId = user?.id;
                        if (userId) {
                          pushNotificationService.scheduleClassReminders(userId);
                        }
                      }}
                      style={styles.debugButton}
                      buttonColor="#607D8B"
                      textColor="white"
                      icon="schedule"
                    >
                      Schedule Reminders
                    </Button>
            </View>
            
            <View style={styles.debugInfo}>
              <Caption style={{ color: textSecondaryColor }}>
                💡 Local notifications work in Expo Go. Remote notifications require a development build.
              </Caption>
            </View>
          </Card.Content>
        </Card>
      )}

      {/* My Booked Classes */}
      <Card style={[styles.sectionCard, { backgroundColor: surfaceColor }]}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <H2 style={{ ...styles.sectionTitle, color: textColor }}>{`My Booked Classes (${dashboardData.bookedClasses.length})`}</H2>
            <Button 
              mode="text" 
              // @ts-ignore - Navigation type issue
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
                      mode={canCancel ? "outlined" : "contained"}
                      style={[
                        styles.bookButton, 
                        { 
                          borderColor: canCancel ? errorColor : textSecondaryColor,
                          backgroundColor: canCancel ? 'transparent' : textSecondaryColor,
                          opacity: canCancel ? 1 : 0.8
                        }
                      ]}
                      textColor={canCancel ? errorColor : backgroundColor}
                      labelStyle={canCancel ? {} : { color: backgroundColor }}
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
                        <Caption style={{ ...styles.classDetailText, color: textSecondaryColor }}>{formatDate(waitlistEntry.class_date || '')}</Caption>
                      </View>
                      <View style={styles.classDetailItem}>
                        <MaterialIcons name="access-time" size={16} color={textSecondaryColor} />
                        <Caption style={{ ...styles.classDetailText, color: textSecondaryColor }}>{formatTime(waitlistEntry.class_time || '')}</Caption>
                      </View>
                      {waitlistEntry.room && (
                        <View style={styles.classDetailItem}>
                          <MaterialIcons name="room" size={16} color={textSecondaryColor} />
                          <Caption style={{ ...styles.classDetailText, color: textSecondaryColor }}>{waitlistEntry.room}</Caption>
                        </View>
                      )}
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
                                    Alert.alert('Error', result.error || 'Failed to leave waitlist');
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
              onPress={() => (navigation as any).navigate('Book')}
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

                                         {(() => {
                      // Check if user has already booked this class
                      const isUserBooked = dashboardData.bookedClasses.some(bookedClass => 
                        bookedClass.class_id?.toString() === cls.id?.toString()
                      );
                      const isFull = cls.enrolled >= cls.capacity;
                      
                      // Debug button logic (only log first few classes)
                      if (cls.name && cls.name === 'Reformer') {

                      }
                      const hoursUntilClass = getHoursUntilClass(cls.date, cls.time);
                      const canJoinWaitlist = hoursUntilClass >= 2; // 2-hour rule applies to waitlist too
                      
                      if (isUserBooked) {
                        return (
                          <Button 
                            mode="contained" 
                            style={[styles.bookButton, { backgroundColor: successColor }]}
                            textColor="white"
                            icon="check-circle"
                            disabled
                          >
                            Booked
                          </Button>
                        );
                      }
                      
                      if (isFull) {
                        return (
                          <Button 
                            mode={canJoinWaitlist ? "outlined" : "contained"}
                            style={[styles.bookButton, { 
                              borderColor: canJoinWaitlist ? warningColor : textSecondaryColor,
                              backgroundColor: canJoinWaitlist ? 'transparent' : textSecondaryColor,
                              opacity: canJoinWaitlist ? 1 : 0.8
                            }]}
                            textColor={canJoinWaitlist ? warningColor : backgroundColor}
                            labelStyle={canJoinWaitlist ? {} : { color: backgroundColor }}
                            icon="queue"
                            onPress={() => handleJoinWaitlist(cls.id)}
                            disabled={!canJoinWaitlist}
                          >
                            {canJoinWaitlist ? 'Join Waitlist' : 'Waitlist Closed'}
                          </Button>
                        );
                      }
                      
                      return (
                        <Button 
                          mode="outlined" 
                          style={[styles.bookButton, { borderColor: accentColor }]}
                          textColor={accentColor}
                          icon="event"
                          onPress={() => handleBookClass(cls.id)}
                        >
                          Book
                        </Button>
                      );
                    })()}
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
               icon="event"
               onPress={() => (navigation as any).navigate('Book')}
             >
               Book Class
             </Button>
             <Button 
               mode="outlined" 
               style={[styles.actionButton, { borderColor: accentColor }]}
               textColor={accentColor}
               icon="history"
               onPress={() => (navigation as any).navigate('BookingHistory')}
             >
               View History
             </Button>
             <Button 
               mode="outlined" 
               style={[styles.actionButton, { borderColor: accentColor }]}
               textColor={accentColor}
               icon="person"
               onPress={() => (navigation as any).navigate('Profile')}
             >
               Profile
             </Button>
             <Button 
               mode="outlined" 
               style={[styles.actionButton, { borderColor: accentColor }]}
               textColor={accentColor}
               icon="help"
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
  debugGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  debugButton: {
    flex: 1,
    minWidth: 120,
    borderRadius: 8,
    marginBottom: 5,
  },
  debugInfo: {
    marginTop: 15,
    padding: 10,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 8,
  },
});

export default ClientDashboard;