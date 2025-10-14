import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import moment from 'moment';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Animated, Dimensions, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Button, Card, Modal, Portal, Surface } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { Body, Caption, H1, H2, H3 } from '../../../components/ui/Typography';
import { useNewYearTheme } from '../../components/NewYearThemeProvider';
import { usePinkOctoberTheme } from '../../components/PinkOctoberThemeProvider';
import { WomensDayFloatingElements } from '../../components/WomensDay/WomensDayAnimations';
import { WomensDayBadge, WomensDayElements, WomensDayHeader } from '../../components/WomensDay/WomensDayElements';
import ChristmasFlipWelcomeText from '../../components/animations/ChristmasFlipWelcomeText';
import RainingHearts from '../../components/animations/RainingHearts';
import NewYearMessageCard from '../../components/ui/NewYearMessageCard';
import PinkOctoberMessageCard from '../../components/ui/PinkOctoberMessageCard';
import { ReceptionEidMubarakMessageCard } from '../../components/ui/ReceptionEidMubarakMessageCard';

import ScrollableNotificationsModal from '../../components/ScrollableNotificationsModal';
import { withChristmasDesign } from '../../components/withChristmasDesign';
import { supabase } from '../../config/supabase.config';
import { useTheme } from '../../contexts/ThemeContext';
import { useThemeColor } from '../../hooks/useDynamicThemeColor';
import { Announcement, announcementService } from '../../services/announcementService';
import { Booking, bookingService } from '../../services/bookingService';
import { BackendClass, classService } from '../../services/classService';
import { notificationService } from '../../services/notificationService';
import { subscriptionService } from '../../services/subscriptionService';
import { AppDispatch, RootState } from '../../store';
import { fetchCurrentSubscription } from '../../store/subscriptionSlice';
import { unifiedBookingUtils } from '../../utils/bookingUtils';
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
  const { t } = useTranslation();
  const { user } = useSelector((state: RootState) => state.auth);
  const { currentSubscription } = useSelector((state: RootState) => state.subscriptions);
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation();
  const { refreshTheme, currentTheme, themeColors } = useTheme();
  
  const { isNewYearTheme } = useNewYearTheme();
  const { isPinkOctoberTheme } = usePinkOctoberTheme();
  
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
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [cancellingBookings, setCancellingBookings] = useState<Set<string>>(new Set());
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  
  // Animation values
  const bannerOpacity = useState(new Animated.Value(0))[0];
  const bannerTranslateY = useState(new Animated.Value(-50))[0];
  const cardAnimations = useState<Animated.Value[]>([])[0];
  const pulseAnimations = useState<Animated.Value[]>([])[0];
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    upcomingClasses: [],
    bookedClasses: [],
    waitlistClasses: [],
    notifications: [],
    subscription: null,
  });

  // Removed caching system for more reliable refreshes

  useEffect(() => {
    dispatch(fetchCurrentSubscription());
    loadNotificationCount();
  }, [dispatch]);

  // Load notification count
  const loadNotificationCount = async () => {
    try {
      const response = await notificationService.getUserNotifications(user?.id || '');
      if (response.success && response.data) {
        const notifications = response.data as any[];
        const unreadCount = notifications.filter(n => !n.is_read).length;
        const totalCount = notifications.length;
        setUnreadNotificationCount(unreadCount);
        setNotificationCount(totalCount);
      }
    } catch (error) {
      // Silently handle notification count loading errors
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      if (!user?.id) return;
      
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) {
        // Silently handle notification read marking errors
        return;
      }

      // Reset unread count
      setUnreadNotificationCount(0);
    } catch (error) {
      // Silently handle notification read marking errors
    }
  };

  // Load announcements function
  const loadAnnouncements = async () => {
    try {
      const announcementsData = await announcementService.getActiveAnnouncements();
      setAnnouncements(announcementsData);
      
      // Animate banner entrance if there are announcements
      if (announcementsData.length > 0) {
        // Initialize card animations for each announcement
        const newCardAnimations = announcementsData.map(() => new Animated.Value(0));
        const newPulseAnimations = announcementsData.map(() => new Animated.Value(1));
        cardAnimations.splice(0, cardAnimations.length, ...newCardAnimations);
        pulseAnimations.splice(0, pulseAnimations.length, ...newPulseAnimations);
        
        // Animate banner entrance
        Animated.parallel([
          Animated.timing(bannerOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(bannerTranslateY, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]).start();
        
        // Stagger card animations
        cardAnimations.forEach((cardAnim, index) => {
          Animated.timing(cardAnim, {
            toValue: 1,
            duration: 400,
            delay: index * 150, // Stagger each card by 150ms
            useNativeDriver: true,
          }).start();
        });
        
        // Start pulse animations for urgent announcements
        announcementsData.forEach((announcement, index) => {
          if (announcement.type === 'urgent') {
            const pulseAnim = pulseAnimations[index];
            const createPulseAnimation = () => {
              Animated.sequence([
                Animated.timing(pulseAnim, {
                  toValue: 1.05,
                  duration: 800,
                  useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                  toValue: 1,
                  duration: 800,
                  useNativeDriver: true,
                }),
              ]).start(() => {
                // Repeat pulse animation
                setTimeout(createPulseAnimation, 2000);
              });
            };
            // Start pulse after card animation completes
            setTimeout(createPulseAnimation, index * 150 + 400);
          }
        });
      } else {
        // Hide banner if no announcements
        Animated.parallel([
          Animated.timing(bannerOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(bannerTranslateY, {
            toValue: -50,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      }
    } catch (error) {
      console.error('Error loading announcements:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      // Clear badge when dashboard is focused (main user interaction)
      try {
        Notifications.setBadgeCountAsync(0);
      } catch (error) {
        console.error('Failed to clear badge count on dashboard focus:', error);
      }
      
      // Add a longer delay for production IPA to ensure session restoration completes
      // This prevents the race condition where dashboard loads before Supabase session is restored
      setTimeout(() => {
        loadDashboardData();
        loadAnnouncements();
        refreshTheme();
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
        setTimeout(() => {
          onRefresh();
        }, 3000); // Further increased delay for database consistency
      }
    });

    return () => {
      notificationListener.remove();
    };
  }, [user?.id]);

  // 🚀 OPTIMIZED: Memoize date calculations to avoid recalculation
  const dateHelpers = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + 30); // Only next 30 days
    const futureDateStr = futureDate.toISOString().split('T')[0];
    
    return { now, todayStr, futureDateStr };
  }, []);

  // 🚀 SUPER-OPTIMIZED: Maximum parallel loading with smart caching
  const loadDashboardData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // 🚀 OPTIMIZATION 1: Run status update in parallel with data fetching
      const apiCallsStart = Date.now();
      
      const [
        statusUpdateResult,
        bookingsResponse,
        waitlistResponse,
        classesResponse,
        subscriptionResponse,
        notificationsResponse
      ] = await Promise.allSettled([
        // 🚀 OPTIMIZATION: Status update runs in parallel, not blocking
        classService.updateCompletedClassStatus(),
        
        // 🚀 OPTIMIZATION: Faster bookings query (no date filter - we filter by class date client-side)
        bookingService.getBookings({}),
        
        // Load user waitlist (already optimized)
        bookingService.getUserWaitlist(user.id),
        
        // 🚀 OPTIMIZATION: Smart class loading with cache consideration
        classService.getClasses({
          upcoming: true,
          date_from: dateHelpers.todayStr,
          date_to: dateHelpers.futureDateStr,
          limit: 15,
          userRole: 'client'
        }),
        
        // Load subscription with caching
        subscriptionService.getCurrentSubscription(),
        
        // Load recent notifications only
        notificationService.getUserNotifications(user.id, { limit: 3 })
      ]);
      const apiCallsEnd = Date.now();
              // Parallel API calls completed

      
      // 🚀 OPTIMIZATION 2: Ultra-fast data processing with single-pass filtering
      const dataProcessingStart = Date.now();
      
      // Pre-calculate date for performance
      const nowTime = dateHelpers.now.getTime();
      
      // 🚀 Single-pass booking processing
      let bookedClasses: Booking[] = [];
      let bookedClassIds: Set<string> = new Set();
      
      if (bookingsResponse.status === 'fulfilled' && bookingsResponse.value.success) {
        // 🚀 OPTIMIZATION: Single pass filter + map + ID collection
        bookedClasses = bookingsResponse.value.data
          .filter(booking => booking.status === 'confirmed') // Fast status filter
          .map(booking => {
            const classData = booking.classes;
            const classDate = classData?.date || booking.class_date;
            const classTime = classData?.time || booking.class_time;
            const classDuration = classData?.duration || 60; // Default to 60 minutes if not specified
            
            if (!classDate || !classTime) return null;
            
            // Check if the class has completely finished (date + time + duration)
            const todayDateStr = dateHelpers.todayStr;
            
            // Filter out classes from past dates
            if (classDate < todayDateStr) return null;
            
            // For today's classes, check if they have ended (including duration)
            if (classDate === todayDateStr) {
              try {
                const classDateTime = new Date(`${classDate}T${classTime}`);
                const classEndTime = new Date(classDateTime.getTime() + classDuration * 60000); // Add duration in milliseconds
                
                // If the class has ended, don't show it in My Bookings
                if (classEndTime < dateHelpers.now) {
                  return null;
                }
              } catch (error) {
                console.warn('Error parsing class time:', error);
                // If we can't parse the time, keep the booking to be safe
              }
            }
            
            // Add to booked IDs in same pass
            const classId = booking.class_id || booking.classId;
            if (classId) bookedClassIds.add(classId.toString());
            
            // Return flattened structure in same pass
            return {
              ...booking,
              class_name: classData?.name || booking.class_name,
              instructor_name: classData?.users?.name || booking.instructor_name,
              class_date: classDate,
              class_time: classTime,
              equipment_type: classData?.equipment_type || booking.equipment_type,
              room: classData?.room || booking.room,
              level: booking.class_level,
            };
          })
          .filter(Boolean) as Booking[]; // Remove null entries
      }

      // 🚀 Single-pass waitlist processing
      let waitlistClasses: any[] = [];
      let waitlistedClassIds: Set<string> = new Set();
      
      if (waitlistResponse.status === 'fulfilled' && waitlistResponse.value.success) {
        // 🚀 OPTIMIZATION: Combined filter + map for waitlist
        waitlistClasses = (waitlistResponse.value.data || [])
          .map(waitlistEntry => {
            const classData = (waitlistEntry as any).classes;
            const classDate = classData?.date;
            const classTime = classData?.time;
            
            if (!classDate || !classTime) return null;
            
            // Fast date check
            const classDateTime = new Date(`${classDate} ${classTime}`);
            if (classDateTime.getTime() <= nowTime) return null;
            
            // Quick Albanian timezone check
            const canStayOnWaitlist = unifiedBookingUtils.canJoinWaitlist(classDate, classTime);
            if (!canStayOnWaitlist) {
              // Non-blocking background removal
              unifiedBookingUtils.leaveWaitlist(waitlistEntry.id).catch(console.error);
              return null;
            }
            
            // Add to waitlisted IDs in same pass
            const classId = (waitlistEntry as any).class_id;
            if (classId) waitlistedClassIds.add(classId.toString());
            
            const instructorData = classData?.users;
            
            return {
              ...waitlistEntry,
              classId: classId,
              class_id: classId,
              class_name: classData?.name,
              instructor_name: instructorData?.name,
              class_date: classDate,
              class_time: classTime,
              room: classData?.room,
              level: classData?.level,
              equipment_type: classData?.equipment_type
            };
          })
          .filter(Boolean); // Remove null entries
      }

      // 🚀 Ultra-fast upcoming classes processing
      let upcomingClasses: BackendClass[] = [];
      if (classesResponse.status === 'fulfilled' && classesResponse.value.success) {
        // 🚀 OPTIMIZATION: Single-pass filter + sort + slice
        upcomingClasses = classesResponse.value.data
          .reduce((acc: Array<{ class: BackendClass, timestamp: number }>, cls) => {
            const classIdStr = cls.id.toString();
            
            // Fast Set lookups
            if (bookedClassIds.has(classIdStr) || waitlistedClassIds.has(classIdStr)) {
              return acc;
            }
            
            // Fast date check with pre-calculated timestamp
            const classDateTime = new Date(`${cls.date}T${cls.time}`);
            const timestamp = classDateTime.getTime();
            if (timestamp <= nowTime) return acc;
            
            // Store with timestamp for faster sorting
            acc.push({ class: cls, timestamp });
            return acc;
          }, [])
          .sort((a, b) => a.timestamp - b.timestamp) // Fast numeric sort
          .slice(0, 4) // Limit early
          .map(item => item.class); // Extract classes
      }

      // 🚀 Fast subscription processing
      let subscriptionData = null;
      if (subscriptionResponse.status === 'fulfilled' && subscriptionResponse.value.success) {
        const subscription = subscriptionResponse.value.data;
        if (subscription?.end_date) {
          // Fast date calculation using pre-calculated nowTime
          const endTime = new Date(subscription.end_date).getTime();
          const daysUntilEnd = Math.ceil((endTime - nowTime) / (1000 * 60 * 60 * 24));
          subscriptionData = daysUntilEnd >= 0 ? subscription : null;
        } else {
          subscriptionData = subscription;
        }
      }

      // 🚀 Fast notifications processing (already limited by API)
      const notifications: any[] = notificationsResponse.status === 'fulfilled' && notificationsResponse.value.success
        ? notificationsResponse.value.data.slice(0, 3)
        : [];

      const dataProcessingEnd = Date.now();
      
      // 🚀 Single state update for better performance
      const finalDashboardData = {
        upcomingClasses,
        bookedClasses,
        waitlistClasses,
        notifications,
        subscription: subscriptionData,
      };
      
      setDashboardData(finalDashboardData);
      
      const dashboardEndTime = Date.now();

    } catch (error) {
      console.error('❌ [DASHBOARD_PERF] Error loading dashboard data:', error);
      // Note: Using console.error instead of Alert.alert for better UX
      // Alert.alert causes issues and should be avoided per project guidelines
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, refreshing]);

  const onRefresh = useCallback(() => {
    const refreshStartTime = Date.now();
    // Starting manual refresh
    setRefreshing(true);
    
    const subscriptionStart = Date.now();
            // Starting subscription fetch
    dispatch(fetchCurrentSubscription());
    const subscriptionEnd = Date.now();
            // Subscription fetch completed
    
    Promise.all([
      loadDashboardData(),
      loadAnnouncements(),
      loadNotificationCount(),
      refreshTheme()
    ]).finally(() => {
      const refreshEndTime = Date.now();
              // Manual refresh completedr
    });
  }, [dispatch, loadDashboardData]);

  // 🚀 OPTIMIZATION 5: Memoized helper functions
  const getEquipmentIcon = useCallback((equipment: string) => {
    switch (equipment) {
      case 'mat': return 'fitness-center';
      case 'reformer': return 'fitness-center';
      case 'both': return 'fitness-center';
      default: return 'help-outline';
    }
  }, []);

  const getEquipmentColor = useCallback((equipment: string) => {
    switch (equipment) {
      case 'mat': return successColor; // Use dashboard's existing green color
      case 'reformer': return successColor; // Use dashboard's existing green color
      case 'both': return successColor; // Use dashboard's existing green color
      default: return successColor; // Use dashboard's existing green color
    }
  }, [successColor]);



  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const weekdayIndex = date.getDay();
    const monthIndex = date.getMonth();
    const day = date.getDate();
    
    const weekdays = t('dates.weekdays.short', { returnObjects: true }) as string[];
    const months = t('dates.months.short', { returnObjects: true }) as string[];
    
    return `${weekdays[weekdayIndex]}, ${months[monthIndex]} ${day}`;
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
      return t('timeDistance.classStarted');
    } else if (totalMinutes < 60) {
      return t('timeDistance.minutesAway', { count: totalMinutes });
    } else if (totalHours < 24) {
      const hours = Math.floor(totalHours);
      const minutes = totalMinutes - (hours * 60);
      if (minutes === 0) {
        return t('timeDistance.hoursAway', { count: hours });
      } else {
        return t('timeDistance.hourAndMinutes', { hours, minutes });
      }
    } else {
      const days = Math.floor(totalDays);
      const remainingHours = totalHours - (days * 24);
      if (remainingHours < 1) {
        return t('timeDistance.daysAway', { count: days });
      } else {
        return t('timeDistance.daysAndHours', { days, hours: Math.floor(remainingHours) });
      }
    }
  };

  const getClassTimeStatus = (date: string, time: string) => {
    const hoursUntil = getHoursUntilClass(date, time);
    const timeDisplay = formatTimeUntilClass(date, time);
    
    if (hoursUntil < 0) {
      return { status: 'past', message: t('timeDistance.classHasStarted'), color: errorColor };
    } else if (hoursUntil < 2) {
      return { 
        status: 'too_close', 
        message: t('timeDistance.tooCloseToCancel', { time: timeDisplay }), 
        color: errorColor 
      };
    } else if (hoursUntil < 6) {
      return { 
        status: 'warning', 
        message: t('timeDistance.cancellationDeadlineApproaching', { time: timeDisplay }), 
        color: warningColor 
      };
    } else {
      return { 
        status: 'ok', 
        message: t('timeDistance.canCancelUntil2Hours'), 
        color: successColor 
      };
    }
  };

  const canCancelBooking = (date: string, time: string) => {
    // Use unified booking utils for Albanian timezone consistency
    return unifiedBookingUtils.canCancelBooking(date, time);
  };

  const handleCancelBooking = async (booking: Booking) => {
    // Prevent double cancellation
    const bookingIdStr = booking.id?.toString();
    if (!bookingIdStr || cancellingBookings.has(bookingIdStr)) {
      return; // Already cancelling this booking
    }

    // Mark as cancelling to prevent double clicks
    setCancellingBookings(prev => new Set(prev).add(bookingIdStr));

    try {
      const success = await unifiedBookingUtils.cancelBooking(
        {
          id: booking.id!,
          classId: booking.class_id!,
          class_name: booking.class_name,
          class_date: booking.class_date,
          class_time: booking.class_time,
          instructor_name: booking.instructor_name
        },
        () => {
          // On success callback
          onRefresh();
        },
        t
      );
    } finally {
      // Always remove from cancelling set
      setCancellingBookings(prev => {
        const newSet = new Set(prev);
        newSet.delete(bookingIdStr);
        return newSet;
      });
    }
  };

  const handleBookClass = async (classId: string | number) => {
    const class_ = dashboardData.upcomingClasses.find(c => c.id === classId.toString());
    if (!class_) return;

    // Subscription check is now handled by button disabled state
    if (!currentSubscription || currentSubscription.status !== 'active') {
      return; // Button should be disabled, this is just a safety check
    }

    // Check if user has remaining classes (unless unlimited)
    const monthlyClasses = currentSubscription.monthly_classes || 0;
    const remainingClasses = currentSubscription.remaining_classes || 0;
    const isUnlimited = monthlyClasses >= 999;
    
    if (!isUnlimited && remainingClasses <= 0) {
      Alert.alert(t('classes.noClassesRemaining'), t('classes.noClassesRemainingDesc'));
      return;
    }

    // Check personal subscription restrictions
    const subscriptionCategory = currentSubscription.category;
    const isPersonalSubscription = subscriptionCategory === 'personal';
    const isPersonalClass = class_.category === 'personal';

    if (isPersonalSubscription && !isPersonalClass) {
      Alert.alert(t('equipmentAccess.personalSubscriptionRequired'), t('equipmentAccess.personalOnly'));
      return;
    }

    if (!isPersonalSubscription && isPersonalClass) {
      Alert.alert(t('equipmentAccess.personalTrainingSession'), t('equipmentAccess.needPersonalSubscription'));
      return;
    }

    // Check equipment access
    const planEquipment = currentSubscription.equipment_access;
    
    if (!isEquipmentAccessAllowed(planEquipment, class_.equipment_type)) {
      const accessMap = {
        'mat': t('equipmentAccess.matOnly'),
        'reformer': t('equipmentAccess.reformerOnly'),
        'both': t('equipmentAccess.fullEquipment')
      };
      
      Alert.alert(
        t('equipmentAccess.title'),
        t('equipmentAccess.requiresAccess', { 
          equipment: accessMap[class_.equipment_type] || class_.equipment_type, 
          userAccess: accessMap[planEquipment] || planEquipment 
        })
      );
      return;
    }

    const remainingAfterBooking = isUnlimited ? 'unlimited' : remainingClasses - 1;

    Alert.alert(
      t('classes.confirmBooking'),
      t('classes.confirmBookingMessage', { 
        className: class_.name, 
        date: formatDate(class_.date), 
        time: formatTime(class_.time),
        remaining: remainingAfterBooking
      }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('classes.bookClass'), 
          onPress: async () => {
            try {
              const success = await unifiedBookingUtils.bookClass(classId, currentSubscription, class_, t);
              if (success) {
                onRefresh();
              }
            } catch (error: any) {
              // If booking fails, it might be because class is full - try to join waitlist
              if (error.includes && (error.includes('full') || error.includes('capacity'))) {
                Alert.alert(
                  t('classes.classFull'),
                  t('classes.classFullJoinWaitlist'),
                  [
                    { text: t('common.cancel'), style: 'cancel' },
                    { text: t('classes.joinWaitlist'), onPress: async () => {
                      // Use the same joinWaitlist dialog logic as Calendar
                      Alert.alert(
                        t('classes.joinWaitlist'),
                        `${t('classes.joinWaitlistConfirm', { 
                          className: class_.name, 
                          date: formatDate(class_.date), 
                          time: formatTime(class_.time) 
                        })}\n\n${t('classes.notifyWhenAvailable')}`,
                        [
                          { text: t('common.cancel'), style: 'cancel' },
                          { 
                            text: t('classes.joinWaitlist'), 
                            onPress: async () => {
                              try {
                                const success = await unifiedBookingUtils.joinWaitlist(classId, currentSubscription, class_, t);
                                if (success) {
                                  onRefresh();
                                }
                              } catch (error: any) {
                                console.error('❌ [Dashboard] Error joining waitlist:', error);
                                Alert.alert(t('alerts.error'), t('alerts.errorJoinWaitlist'));
                              }
                            }
                          }
                        ]
                      );
                    }}
                  ]
                );
              } else {
                Alert.alert(t('classes.bookingFailed'), error || t('classes.failedToBookClass'));
              }
            }
          }
        }
      ]
    );
  };

  const handleJoinWaitlist = async (classId: string | number) => {
    const class_ = dashboardData.upcomingClasses.find(c => c.id === classId.toString());
    if (!class_) return;

    // Subscription check is now handled by button disabled state
    if (!currentSubscription || currentSubscription.status !== 'active') {
      return; // Button should be disabled, this is just a safety check
    }

    Alert.alert(
      t('classes.joinWaitlist'),
      `${t('classes.joinWaitlistConfirm', { className: class_.name, date: formatDate(class_.date), time: formatTime(class_.time) })}\n\n${t('classes.notifyWhenAvailable')}`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('classes.joinWaitlist'), 
          onPress: async () => {
            try {
              const success = await unifiedBookingUtils.joinWaitlist(classId, currentSubscription, class_, t);
              if (success) {
                onRefresh();
              }
            } catch (error: any) {
              console.error('❌ [Dashboard] Error joining waitlist:', error);
              Alert.alert(t('alerts.error'), t('alerts.errorJoinWaitlist'));
            }
          }
        }
      ]
    );
  };

  // Announcement helper functions
  const getAnnouncementIcon = (type: string) => {
    // Special Women's Day icons
    if (currentTheme?.name === 'womens_day') {
      switch (type) {
        case 'warning': return 'favorite';
        case 'urgent': return 'local-florist';
        default: return 'spa';
      }
    }
    
    switch (type) {
      case 'warning': return 'warning';
      case 'urgent': return 'error';
      default: return 'info';
    }
  };

  const getAnnouncementColor = (type: string) => {
    switch (type) {
      case 'warning': return warningColor;
      case 'urgent': return errorColor;
      default: return accentColor;
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor }]}>
        <ActivityIndicator size="large" color={accentColor} />
        <Body style={{ ...styles.loadingText, color: textColor }}>{t('dashboard.loadingDashboard')}</Body>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      
      <RainingHearts />
      <WomensDayFloatingElements />
      
      <ScrollView 
        style={styles.scrollView} 
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
      {/* Animated Welcome Header */}
      <Surface style={[
        styles.welcomeHeader, 
        { 
          backgroundColor: currentTheme?.name === 'womens_day' ? 'rgba(139, 90, 107, 0.05)' : surfaceColor, 
          borderBottomWidth: 1, 
          borderBottomColor: textMutedColor 
        }
      ]}>
        <View style={styles.welcomeContent}>
          <View style={styles.welcomeTextSection}>
            {currentTheme?.name === 'womens_day' ? (
              <>
                <View style={styles.womensDayWelcomeCompact}>
                  <MaterialIcons name="favorite" size={18} color={accentColor} />
                  <H1 style={StyleSheet.flatten([styles.welcomeTitle, { color: primaryColor, marginLeft: 8 }])}>{t('dashboard.welcomeBack')}</H1>
                </View>
                <View style={styles.womensDayNameSection}>
                  <MaterialIcons name="spa" size={14} color={accentColor} />
                  <Body style={StyleSheet.flatten([styles.welcomeSubtitle, { color: textColor, marginLeft: 6 }])}>{user?.name}</Body>
                </View>
              </>
            ) : (
              // Check if Christmas theme is active for enhanced welcome
              (() => {
                const isChristmas = currentTheme && currentTheme.name !== 'default' && (
                  currentTheme.name?.toLowerCase().includes('christmas') ||
                  currentTheme.display_name?.toLowerCase().includes('christmas') ||
                  currentTheme.display_name?.includes('🎄')
                );
                return isChristmas;
              })() ? (
                <ChristmasFlipWelcomeText 
                  firstName={user?.name || 'User'} 
                  style={styles.flipWelcomeContainer}
                />
              ) : (
                // Original static welcome header for normal theme
                <>
                  <H1 style={StyleSheet.flatten([styles.welcomeTitle, { color: textColor }])}>
                    {t('dashboard.welcomeBack')}
                  </H1>
                  <View style={styles.womensDayNameSection}>
                    <MaterialIcons name="spa" size={14} color={accentColor} />
                    <Body style={StyleSheet.flatten([styles.welcomeSubtitle, { color: textColor, marginLeft: 6 }])}>{user?.name}</Body>
                  </View>
                </>
              )
            )}
          </View>
          <View style={styles.welcomeActions}>
            {/* Notification Icon */}
            <TouchableOpacity 
              style={styles.notificationIconContainer}
              onPress={async () => {
                setNotificationModalVisible(true);
                // Mark all notifications as read when modal is opened
                await markAllNotificationsAsRead();
              }}
            >
              <MaterialIcons 
                name="notifications" 
                size={24} 
                color={textColor} 
              />
              {unreadNotificationCount > 0 && (
                <View style={[styles.notificationBadge, { backgroundColor: errorColor }]}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            
            {currentTheme?.name === 'womens_day' ? (
              <MaterialIcons name="local-florist" size={24} color={accentColor} />
            ) : (
              <Text style={styles.welcomeEmoji}>👋</Text>
            )}
          </View>
        </View>
      </Surface>

      {/* Women's Day Celebration Header */}
      <WomensDayHeader />

      {/* Islamic Celebration Message Card */}
      <ReceptionEidMubarakMessageCard 
        showAnimations={true}
      />

      {/* New Year Message Card - Only show when New Year theme is active */}
      {isNewYearTheme && (
        <NewYearMessageCard 
          showAnimations={true}
        />
      )}

      {/* Pink October Message Card - Only show when Pink October theme is active */}
      {isPinkOctoberTheme && (
        <PinkOctoberMessageCard 
          showAnimations={true}
        />
      )}

      {/* Active Announcements Banner */}
      {announcements.length > 0 && (
        <Animated.View 
          style={[
            styles.announcementBanner,
            {
              opacity: bannerOpacity,
              transform: [{ translateY: bannerTranslateY }]
            }
          ]}
        >
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.announcementScrollContent}
          >
            {announcements.map((announcement, index) => {
              const cardAnim = cardAnimations[index] || new Animated.Value(1);
              const pulseAnim = pulseAnimations[index] || new Animated.Value(1);
              
              const cardScale = cardAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.8, 1],
              });
              const cardOpacity = cardAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 1],
              });
              
              // Combine card scale with pulse scale for urgent announcements
              const finalScale = announcement.type === 'urgent' 
                ? Animated.multiply(cardScale, pulseAnim)
                : cardScale;
              
              return (
                <Animated.View 
                  key={announcement.id} 
                  style={[
                    styles.announcementCard,
                    currentTheme?.name === 'womens_day' && styles.womensDayCard,
                    { 
                      backgroundColor: surfaceColor,
                      borderLeftColor: getAnnouncementColor(announcement.type),
                      transform: [{ scale: finalScale }],
                      opacity: cardOpacity
                    }
                  ]}
                >
                  <View style={styles.announcementHeader}>
                    <MaterialIcons 
                      name={getAnnouncementIcon(announcement.type)} 
                      size={16} 
                      color={getAnnouncementColor(announcement.type)} 
                    />
                    <Body style={StyleSheet.flatten([styles.announcementTitle, { color: textColor }])}>
                      {announcement.title}
                    </Body>
                  </View>
                  <Caption style={StyleSheet.flatten([styles.announcementMessage, { color: textSecondaryColor }])}>
                    {announcement.message}
                  </Caption>
                </Animated.View>
              );
            })}
          </ScrollView>
        </Animated.View>
      )}

      {/* Subscription Status */}
      <View style={styles.subscriptionContainer}>
        <WomensDayElements />
        {dashboardData.subscription ? (
          <Card style={[styles.subscriptionCard, { backgroundColor: surfaceColor, borderColor: textMutedColor }]}>
            <Card.Content style={styles.statCardContent}>
              <View style={styles.statHeader}>
                <WomensDayBadge text="Empowered" icon="favorite" size="small" />
                <MaterialIcons name="card-membership" size={24} color={primaryColor} />
                <Caption style={{ ...styles.statLabel, color: textSecondaryColor }}>
                  {currentSubscription?.duration_unit === 'days' ? t('subscription.dayPass') : t('subscription.currentPlan')}
                </Caption>
              </View>
              <H3 style={{ ...styles.statValue, color: textColor }}>{dashboardData.subscription.plan_name}</H3>
              <Body style={{ ...styles.statSubtext, color: textSecondaryColor }}>
                {currentSubscription?.duration_unit === 'days' ? 
                  (dashboardData.subscription.remaining_classes > 0 ? 
                    `${t('subscription.validFor')} ${dashboardData.subscription.remaining_classes} ${dashboardData.subscription.remaining_classes === 1 ? t('classes.class') : t('classes.classes')}` :
                    t('subscription.used')) :
                  `${dashboardData.subscription.remaining_classes} ${t('dashboard.classesRemaining')}`}
              </Body>
            </Card.Content>
          </Card>
        ) : (
          <Card style={[styles.noSubscriptionCard, { backgroundColor: surfaceColor, borderColor: textMutedColor }]}>
            <Card.Content style={styles.statCardContent}>
              <View style={styles.statHeader}>
                <MaterialIcons name="sentiment-satisfied" size={24} color={accentColor} />
                <Caption style={{ ...styles.statLabel, color: textSecondaryColor }}>{t('dashboard.welcome')}!</Caption>
              </View>
              <H3 style={{ ...styles.statValue, color: textColor }}>{t('dashboard.readyToStart')}?</H3>
              <Body style={{ ...styles.statSubtext, color: textSecondaryColor }}>
                {t('dashboard.visitReceptionToBegin')}
              </Body>
            </Card.Content>
          </Card>
        )}
      </View>

      

      

      {/* My Booked Classes */}
      <Card style={[styles.sectionCard, { backgroundColor: surfaceColor }]}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <H2 style={{ ...styles.sectionTitle, color: textColor }}>{`${t('dashboard.myBookings')} (${dashboardData.bookedClasses.length})`}</H2>
            <Button 
              mode="text" 
              // @ts-ignore - Navigation type issue
              onPress={() => navigation.navigate('History')}
              icon={() => <MaterialIcons name="arrow-forward" size={20} color={accentColor} />}
              textColor={accentColor}
            >
              {t('dashboard.viewAll')}
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
                        <Body style={{ ...styles.classInstructor, color: textSecondaryColor }}>{t('classes.with')} {booking.instructor_name || t('classes.teacherName')}</Body>
                      </View>
                      <View style={styles.classIcons}>
                                                 <View style={[styles.iconBadge, { backgroundColor: getEquipmentColor(booking.equipment_type || 'mat') }]}>
                                                       <Text style={styles.equipmentText}>
                              {(booking.equipment_type || 'mat') === 'mat' ? '🧘‍♀️' : (booking.equipment_type || 'mat') === 'reformer' ? '💪' : '✨'}
                            </Text>
                         </View>
                        <View style={[styles.iconBadge, { backgroundColor: primaryColor }]}>
                          <Text style={styles.equipmentText}>✓</Text>
                        </View>
                      </View>
                    </View>
                    
                    <View style={styles.classDetails}>
                      <View style={styles.classDetailItem}>
                        <Text style={styles.iconText}>📅</Text>
                        <Caption style={{ ...styles.classDetailText, color: textSecondaryColor }}>{formatDate(booking.class_date || '')}</Caption>
                      </View>
                      <View style={styles.classDetailItem}>
                        <Text style={styles.iconText}>🕐</Text>
                        <Caption style={{ ...styles.classDetailText, color: textSecondaryColor }}>{formatTime(booking.class_time || '')}</Caption>
                      </View>
                      {booking.room && (
                        <View style={styles.classDetailItem}>
                          <Text style={styles.iconText}>📍</Text>
                          <Caption style={{ ...styles.classDetailText, color: textSecondaryColor }}>{booking.room}</Caption>
                        </View>
                      )}
                      <View style={styles.classDetailItem}>
                        <Text style={styles.iconText}>✅</Text>
                        <Caption style={{ ...styles.classDetailText, color: textSecondaryColor }}>{t('classes.booked')}</Caption>
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
                      disabled={!canCancel || cancellingBookings.has(booking.id?.toString() || '')}
                      loading={cancellingBookings.has(booking.id?.toString() || '')}
                      onPress={() => handleCancelBooking(booking)}
                    >
                      {cancellingBookings.has(booking.id?.toString() || '') 
                        ? t('classes.cancelling') 
                        : canCancel ? t('classes.cancelBooking') : t('classes.cannotCancel')
                      }
                    </Button>
                  </Card.Content>
                </Card>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons name="event-available" size={48} color={textMutedColor} />
              <Body style={{ ...styles.emptyStateText, color: textColor }}>{t('classes.noBookedClasses')}</Body>
              <Caption style={{ ...styles.emptyStateSubtext, color: textSecondaryColor }}>
                {t('classes.bookClassToSeeHere')}
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
              <H2 style={{ ...styles.sectionTitle, color: textColor }}>{`${t('classes.waitlist')} (${dashboardData.waitlistClasses.length})`}</H2>
              <MaterialIcons name="format-list-numbered" size={24} color={warningColor} />
            </View>

            <View style={styles.classList}>
              {dashboardData.waitlistClasses.map((waitlistEntry) => (
                <Card key={waitlistEntry.id} style={[styles.classCard, { backgroundColor: surfaceColor, borderColor: warningColor, borderWidth: 1 }]}>
                  <Card.Content style={styles.classCardContent}>
                    <View style={styles.classHeader}>
                      <View style={styles.classInfo}>
                        <H3 style={{ ...styles.className, color: textColor }}>{waitlistEntry.class_name || 'Class'}</H3>
                        <Body style={{ ...styles.classInstructor, color: textSecondaryColor }}>{t('classes.with')} {waitlistEntry.instructor_name || t('classes.teacherName')}</Body>
                      </View>
                      <View style={styles.classIcons}>
                        <View style={[styles.iconBadge, { backgroundColor: warningColor }]}>
                          <MaterialIcons name="format-list-numbered" size={16} color="white" />
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
                          <MaterialIcons name="place" size={16} color={textSecondaryColor} />
                          <Caption style={{ ...styles.classDetailText, color: textSecondaryColor }}>{waitlistEntry.room}</Caption>
                        </View>
                      )}
                      <View style={styles.classDetailItem}>
                        <MaterialIcons name="format-list-numbered" size={16} color={warningColor} />
                        <Caption style={{ ...styles.classDetailText, color: warningColor }}>{t('classes.position')} #{waitlistEntry.position}</Caption>
                      </View>
                    </View>

                    <Button 
                      mode="outlined" 
                      onPress={async () => {
                        try {
                          const success = await unifiedBookingUtils.leaveWaitlist(
                            waitlistEntry.id,
                            waitlistEntry.class_name,
                            () => {
                              onRefresh();
                            },
                            t
                          );
                        } catch (error: any) {
                          console.error('❌ [Dashboard] Error leaving waitlist:', error);
                          Alert.alert(t('alerts.error'), t('alerts.errorLeaveWaitlist'));
                        }
                      }}
                      textColor={errorColor}
                      style={[styles.bookButton, { borderColor: errorColor }]}
                      icon={() => <MaterialIcons name="cancel" size={20} color={errorColor} />}
                    >
                      {t('classes.leaveWaitlist')}
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
            <H2 style={{ ...styles.sectionTitle, color: textColor }}>{t('dashboard.upcomingClasses')}</H2>
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
                        <Body style={{ ...styles.classInstructor, color: textSecondaryColor }}>{t('classes.with')} {cls.instructor_name}</Body>
                      </View>
                                             <View style={styles.classIcons}>
                         <View style={[styles.iconBadge, { backgroundColor: getEquipmentColor(cls.equipment_type) }]}>
                                                       <Text style={styles.equipmentText}>
                              {cls.equipment_type === 'mat' ? '🧘‍♀️' : cls.equipment_type === 'reformer' ? '💪' : '✨'}
                            </Text>
                         </View>
                       </View>
                    </View>
                    
                    <View style={styles.classDetails}>
                      <View style={styles.classDetailItem}>
                        <Text style={styles.iconText}>📅</Text>
                        <Caption style={{ ...styles.classDetailText, color: textSecondaryColor }}>{formatDate(cls.date)}</Caption>
                      </View>
                      <View style={styles.classDetailItem}>
                        <Text style={styles.iconText}>🕐</Text>
                        <Caption style={{ ...styles.classDetailText, color: textSecondaryColor }}>{formatTime(cls.time)}</Caption>
                      </View>
                      <View style={styles.classDetailItem}>
                        <Text style={styles.iconText}>⏱️</Text>
                        <Caption style={{ ...styles.classDetailText, color: textSecondaryColor }}>{`${cls.duration} min`}</Caption>
                      </View>
                      {cls.room && (
                        <View style={styles.classDetailItem}>
                          <Text style={styles.iconText}>📍</Text>
                          <Caption style={{ ...styles.classDetailText, color: textSecondaryColor }}>{cls.room}</Caption>
                        </View>
                      )}
                      <View style={styles.classDetailItem}>
                        <Text style={styles.iconText}>👥</Text>
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
                      
                      // Check if user is on waitlist for this class
                      const waitlistEntry = dashboardData.waitlistClasses.find(waitlistClass => 
                        waitlistClass.class_id?.toString() === cls.id?.toString() || 
                        waitlistClass.classId?.toString() === cls.id?.toString()
                      );
                      const isOnWaitlist = !!waitlistEntry;
                      
                      const isFull = cls.enrolled >= cls.capacity;
                      

                      // Use unified booking utils for Albanian timezone consistency
                      const canJoinWaitlist = unifiedBookingUtils.canJoinWaitlist(cls.date, cls.time);
                      const isBookable = unifiedBookingUtils.isBookable(cls.date, cls.time);
                      
                      if (isUserBooked) {
                        return (
                          <Button 
                            mode="contained" 
                            style={[styles.bookButton, { backgroundColor: successColor }]}
                            textColor="white"
                            icon={() => <MaterialIcons name="check-circle" size={20} color="white" />}
                            disabled
                          >
                            {t('classes.booked')}
                          </Button>
                        );
                      }
                      
                      // Show "Leave Waitlist #X" if user is on waitlist
                      if (isOnWaitlist) {
                        return (
                          <Button 
                            mode="outlined" 
                            style={[styles.bookButton, { borderColor: warningColor }]}
                            textColor={warningColor}
                            icon={() => <MaterialIcons name="format-list-numbered" size={20} color={warningColor} />}
                            onPress={async () => {
                              try {
                                const success = await unifiedBookingUtils.leaveWaitlist(
                                  waitlistEntry.id,
                                  waitlistEntry.class_name,
                                  () => {
                                    onRefresh();
                                  },
                                  t
                                );
                              } catch (error: any) {
                                console.error('❌ [Dashboard] Error leaving waitlist:', error);
                                Alert.alert(t('alerts.error'), t('alerts.errorLeaveWaitlist'));
                              }
                            }}
                          >
                            {t('classes.leaveWaitlist')} #{waitlistEntry.position}
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
                            icon={() => <MaterialIcons name="format-list-numbered" size={20} color={canJoinWaitlist ? warningColor : backgroundColor} />}
                            onPress={() => handleJoinWaitlist(cls.id)}
                            disabled={!canJoinWaitlist || !currentSubscription || currentSubscription.status !== 'active'}
                          >
                            {(!currentSubscription || currentSubscription.status !== 'active') ? t('classes.subscriptionRequired') : (canJoinWaitlist ? t('classes.joinWaitlist') : t('classes.waitlistClosed'))}
                          </Button>
                        );
                      }
                      
                      // Show booking button only if class is bookable
                      if (!isBookable) {
                        return (
                          <Button 
                            mode="contained" 
                            style={[styles.bookButton, { backgroundColor: textSecondaryColor }]}
                            textColor={backgroundColor}
                            icon={() => <MaterialIcons name="event-busy" size={20} color={backgroundColor} />}
                            disabled
                          >
                            {t('classes.bookingClosed')}
                          </Button>
                        );
                      }
                      
                      return (
                        <Button 
                          mode="outlined" 
                          style={[styles.bookButton, { borderColor: accentColor }]}
                          textColor={accentColor}
                          icon={() => <MaterialIcons name="event" size={20} color={accentColor} />}
                          onPress={() => handleBookClass(cls.id)}
                          disabled={!currentSubscription || currentSubscription.status !== 'active'}
                        >
                          {(!currentSubscription || currentSubscription.status !== 'active') ? t('classes.subscriptionRequired') : t('classes.bookClass')}
                        </Button>
                      );
                    })()}
                   </Card.Content>
                 </Card>
                );
               })}
               
               {/* See more button */}
               <Button 
                 mode="outlined" 
                 onPress={() => (navigation as any).navigate('Book')}
                 icon={() => <MaterialIcons name="calendar-today" size={20} color={accentColor} />}
                 textColor={accentColor}
                 style={[styles.seeMoreButton, { borderColor: accentColor }]}
               >
                 {t('dashboard.seeMoreOnCalendar')}
               </Button>
             </View>
           ) : (
             <View style={styles.emptyState}>
               <MaterialIcons name="event-busy" size={48} color={textMutedColor} />
               <Body style={{ ...styles.emptyStateText, color: textColor }}>
                 {dashboardData.subscription 
                   ? t('dashboard.noUpcomingClasses') 
                   : t('dashboard.readyToBook')}
               </Body>
               <Caption style={{ ...styles.emptyStateSubtext, color: textSecondaryColor }}>
                 {dashboardData.subscription 
                   ? t('dashboard.checkBackLater')
                   : t('dashboard.visitReception')}
               </Caption>
             </View>
           )}
         </Card.Content>
       </Card>



      </ScrollView>

      {/* Notification Modal */}
      <Portal>
        <Modal
          visible={notificationModalVisible}
          onDismiss={() => setNotificationModalVisible(false)}
          contentContainerStyle={[styles.notificationModal, { backgroundColor: surfaceColor }]}
        >
          <View style={styles.notificationModalHeader}>
            <H2 style={{ color: textColor }}>🔔 {t('dashboard.notifications')}</H2>
            <TouchableOpacity 
              onPress={() => setNotificationModalVisible(false)}
              style={styles.closeButton}
            >
              <MaterialIcons name="close" size={24} color={textColor} />
            </TouchableOpacity>
          </View>
          <ScrollableNotificationsModal 
            visible={notificationModalVisible}
            onDismiss={() => setNotificationModalVisible(false)}
            onNotificationRead={() => loadNotificationCount()}
          />
        </Modal>

      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  welcomeHeader: {
    padding: 20,
    paddingTop: 60, // Increased from 20 to 60 to account for iPhone notch/dynamic island
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
  flipWelcomeContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notificationIconContainer: {
    position: 'relative',
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  notificationBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  notificationModal: {
    margin: 20,
    padding: 0,
    borderRadius: 12,
    height: '45%',
    width: '90%',
    alignSelf: 'center',
  },
  notificationModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    paddingTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  welcomeEmoji: {
    fontSize: 32,
    color: '#FFD700',
  },
  welcomeTextSection: {
    flex: 1,
  },
  womensDayWelcomeCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  womensDayNameSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
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
    padding: 12,
    borderRadius: 20,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  equipmentText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  iconText: {
    fontSize: 16,
    marginRight: 8,
    textAlign: 'center',
    minWidth: 20,
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
  seeMoreButton: {
    marginTop: 16,
    borderRadius: 12,
  },

  // Announcement styles
  announcementBanner: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    overflow: 'hidden',
  },
  announcementScrollContent: {
    paddingHorizontal: 12,
  },
  announcementCard: {
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    minWidth: 280,
    maxWidth: 320,
    borderLeftWidth: 4,
    ...shadows.card,
    elevation: 3,
  },
  womensDayCard: {
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
  },
  announcementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  announcementTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  announcementMessage: {
    fontSize: 13,
    lineHeight: 18,
  },
  
  scrollView: {
    flex: 1,
  },
  
});

export default withChristmasDesign(ClientDashboard, { 
  variant: 'gold', 
  showSnow: true, 
  showLights: true 
});