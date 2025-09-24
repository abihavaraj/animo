import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Card, Chip, Divider } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { Body, Caption, H1, H2 } from '../../../components/ui/Typography';
import { spacing } from '../../../constants/Spacing';
import RainingHearts from '../../components/animations/RainingHearts';
import { withChristmasDesign } from '../../components/withChristmasDesign';
import { useThemeColor } from '../../hooks/useDynamicThemeColor';
import { bookingService } from '../../services/bookingService';
import { subscriptionService } from '../../services/subscriptionService';
import { AppDispatch, RootState } from '../../store';
import { fetchBookings } from '../../store/bookingSlice';
import { unifiedBookingUtils } from '../../utils/bookingUtils';

function BookingHistory() {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation();
  const { bookings, isLoading } = useSelector((state: RootState) => state.bookings);
  const { user } = useSelector((state: RootState) => state.auth);
  const [refreshing, setRefreshing] = useState(false);
  const [waitlistEntries, setWaitlistEntries] = useState([]);
  const [cancellingBookings, setCancellingBookings] = useState<Set<string>>(new Set());
  const [subscriptionHistory, setSubscriptionHistory] = useState([]);
  const [groupedBookings, setGroupedBookings] = useState({});
  const [sortedSubscriptionOrder, setSortedSubscriptionOrder] = useState<string[]>([]);
  
  // Pagination state
  const [displayLimit, setDisplayLimit] = useState(20);
  const [showLoadMore, setShowLoadMore] = useState(false);
  
  // Subscription pagination state
  const [displayedSubscriptionCount, setDisplayedSubscriptionCount] = useState(1); // Start with 1 (active subscription)
  const [isLoadingMoreSubscriptions, setIsLoadingMoreSubscriptions] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // Clear badge when booking history screen is focused
  useFocusEffect(
    useCallback(() => {
      try {
        Notifications.setBadgeCountAsync(0);
      } catch (error) {
        console.error('Failed to clear badge count on booking history focus:', error);
      }
    }, [])
  );

  // Update showLoadMore when bookings change
  useEffect(() => {
    const safeBookings = Array.isArray(bookings) ? bookings : [];
    setShowLoadMore(safeBookings.length > displayLimit);
  }, [bookings, displayLimit]);

  // Update grouped bookings when subscription history OR bookings change
  useEffect(() => {
    if (subscriptionHistory.length > 0 && bookings && bookings.length >= 0) {
      groupBookingsBySubscription(subscriptionHistory);
    }
  }, [subscriptionHistory, bookings]);

  const loadData = async () => {
    try {
      // Reset pagination when loading fresh data
      setDisplayedSubscriptionCount(1);
      
      // Load bookings, waitlist entries, and subscription history
      await Promise.all([
        dispatch(fetchBookings({})).unwrap(),
        loadWaitlistEntries(),
        loadSubscriptionHistory()
      ]);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const loadSubscriptionHistory = async () => {
    try {
      const response = await subscriptionService.getSubscriptionHistory();
      if (response.success && response.data) {
        setSubscriptionHistory(response.data);
        groupBookingsBySubscription(response.data);
      }
    } catch (error) {
      console.error('Error loading subscription history:', error);
    }
  };

  const loadMoreSubscriptions = () => {
    if (isLoadingMoreSubscriptions) return;
    
    setIsLoadingMoreSubscriptions(true);
    
    // Simulate loading delay for better UX
    setTimeout(() => {
      const nextCount = Math.min(displayedSubscriptionCount + 2, sortedSubscriptionOrder.length);
      setDisplayedSubscriptionCount(nextCount);
      setIsLoadingMoreSubscriptions(false);
    }, 500);
  };

  const groupBookingsBySubscription = (subscriptions: any[]) => {
    const grouped: { [key: string]: any } = {};
    
    // Safe array check - ensure both data sources are available
    const safeBookings = Array.isArray(bookings) ? bookings : [];
    
    if (safeBookings.length === 0) {
      return;
    }
    
    // 🎯 SHOW ALL SUBSCRIPTIONS: Every subscription gets its own card (even with 0 bookings)
    // This way you can see complete history: terminated + new = separate cards
    
    // Group ALL past bookings by subscription (including cancelled for display)
    const pastBookingsOnly = safeBookings.filter(booking => {
      if (!booking || !booking.id) return false;
      
      try {
        const now = new Date();
        const classDate = booking.classes?.date || booking.class_date;
        const classTime = booking.classes?.time || booking.class_time;
        
        if (!classDate || !classTime || classDate === 'undefined' || classTime === 'undefined') {
          return false;
        }
        
        const classDateTime = new Date(`${classDate} ${classTime}`);
        
        if (isNaN(classDateTime.getTime())) {
          return false;
        }
        
        // Include all past bookings for display AND cancelled bookings regardless of date
        const isPast = classDateTime <= now;
        const isCancelled = booking.status === 'cancelled';
        return isPast || isCancelled;
      } catch (error) {
        return false;
      }
    });
    
    // Sort subscriptions: Active first, then by start date (newest to oldest)
    const now = new Date();
    const sortedSubscriptions = [...subscriptions].sort((a, b) => {
      // 1. Active subscriptions always come first
      const aIsActive = a.status === 'active';
      const bIsActive = b.status === 'active';
      
      if (aIsActive && !bIsActive) return -1;
      if (!aIsActive && bIsActive) return 1;
      
      // 2. Then sort by start date (newest first)
      const aStartDate = new Date(a.start_date);
      const bStartDate = new Date(b.start_date);
      
      return bStartDate.getTime() - aStartDate.getTime();
    });
    
    // Track which bookings have been assigned to avoid duplicates
    const assignedBookings = new Set();
    
    // First pass: Initialize all subscriptions with empty arrays
    sortedSubscriptions.forEach((subscription) => {
      const subscriptionId = subscription.id;
      
      grouped[subscriptionId] = {
        subscription,
        bookings: [],
        usage: {
          used: 0,
          total: subscription.monthly_classes || 0,
          remaining: subscription.remaining_classes || 0
        }
      };
    });
    
    // Second pass: Assign each booking to the FIRST (most recent) subscription that fits
    pastBookingsOnly.forEach(booking => {
      // Safety check for booking data
      if (!booking || !booking.id || assignedBookings.has(booking.id)) {
        return;
      }
      
      const rawDate = booking.class_date || booking.classes?.date;
      
      // Safety check for date data
      if (!rawDate || rawDate === 'undefined' || rawDate === null) {
        return;
      }
      
      try {
        const bookingDate = new Date(rawDate);
        
        // Check if date is valid
        if (isNaN(bookingDate.getTime())) {
          return;
        }
        
        // Include all past bookings for display (including cancelled)
        // We'll handle counting separately
        
        // Find the FIRST subscription (most recent due to sorting) that contains this booking
        for (const subscription of sortedSubscriptions) {
          const startDate = new Date(subscription.start_date);
          const endDate = new Date(subscription.end_date);
          
          const isInDateRange = bookingDate >= startDate && bookingDate <= endDate;
          
          if (isInDateRange) {
            // Assign this booking to this subscription and mark as assigned
            grouped[subscription.id].bookings.push(booking);
            
            // Only count attended bookings (not cancelled/no_show) for usage
            const attendedBookings = grouped[subscription.id].bookings.filter(b => 
              b.status === 'confirmed' || b.status === 'completed'
            );
            grouped[subscription.id].usage.used = attendedBookings.length;
            
            assignedBookings.add(booking.id);
            
            break; // Stop looking for other subscriptions - this booking is assigned
          }
        }
      } catch (error) {
        console.error('Error processing booking date:', error, 'Raw date:', rawDate);
      }
    });
    
    
    // Store the sorted order for UI rendering
    const subscriptionOrder = sortedSubscriptions.map(sub => sub.id);
    
    
    setGroupedBookings(grouped);
    setSortedSubscriptionOrder(subscriptionOrder);
  };

  const loadWaitlistEntries = async () => {
    if (!user?.id) return;
    
    try {
      const response = await bookingService.getUserWaitlist(user.id);
      if (response.success) {
        setWaitlistEntries(response.data || []);
      }
    } catch (error) {
      console.error('Failed to load waitlist:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setDisplayLimit(20); // Reset to show only last 20 bookings
    loadData();
  };

  const handleCancelBooking = async (bookingId: string | number, className: string) => {
    const bookingIdStr = String(bookingId);
    
    // Prevent double cancellation
    if (cancellingBookings.has(bookingIdStr)) {
      return; // Already cancelling this booking
    }

    // Mark as cancelling to prevent double clicks
    setCancellingBookings(prev => new Set(prev).add(bookingIdStr));

    try {
      // Find the booking data for proper reminder cleanup
      const booking = bookings.find(b => String(b.id) === bookingIdStr);
      
      if (!booking) {
        Alert.alert(t('alerts.error'), t('booking.bookingNotFound'));
        return;
      }
      
      // Use the same fallback logic as the display code
      const classDate = booking.classes?.date || booking.class_date;
      const classTime = booking.classes?.time || booking.class_time;
      const instructorName = booking.classes?.users?.name || booking.instructor_name;
      
      const success = await unifiedBookingUtils.cancelBooking(
        {
          id: bookingIdStr,
          classId: booking?.class_id || booking?.classes?.id || '',
          class_name: className,
          class_date: classDate,
          class_time: classTime,
          instructor_name: instructorName
        },
        () => {
          // On success callback - refresh bookings
          dispatch(fetchBookings({}));
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

  const handleCancelWaitlist = async (waitlistId: number, className: string) => {
    const success = await unifiedBookingUtils.leaveWaitlist(
      waitlistId,
      className,
      () => {
        // On success callback
        loadData(); // Refresh all data
      },
      t
    );
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Date not available';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return 'Time not available';
    
    try {
      // Handle time format from backend (could be "HH:MM:SS" or "HH:MM")
      const timeParts = timeString.split(':');
      if (timeParts.length >= 2) {
        const hours = parseInt(timeParts[0]);
        const minutes = timeParts[1];
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
        return `${displayHours}:${minutes} ${ampm}`;
      }
      return timeString;
    } catch {
      return timeString;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return successColor;
      case 'completed': return primaryColor;
      case 'cancelled': return errorColor;
      case 'no_show': return warningColor;
      default: return secondaryTextColor;
    }
  };

  const getStatusText = (status: string, classDate: string, classTime: string, cancelledBy?: string) => {
    if (!status) return t('booking.unknown');
    
    try {
      const now = new Date();
      const classDateTime = new Date(`${classDate} ${classTime}`);
      
      if (status === 'confirmed' && classDateTime > now) {
        return t('classes.upcoming');
      }
      
      switch (status) {
        case 'confirmed': return t('booking.confirmed');
        case 'completed': return t('classes.completed');
        case 'cancelled': 
          if (cancelledBy === 'user') return t('booking.cancelledByUser');
          if (cancelledBy === 'reception') return t('booking.cancelledByReception');
          if (cancelledBy === 'studio') return t('booking.cancelledByStudio');
          return t('booking.cancelled');
        case 'no_show': return t('booking.noShow');
        default: return status.charAt(0).toUpperCase() + status.slice(1);
      }
    } catch {
      return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const isUpcoming = (booking: any) => {
    if (!booking || !booking.id) return false;
    
    // Cancelled, no-show, and completed bookings are never upcoming
    if (booking.status === 'cancelled' || booking.status === 'no_show' || booking.status === 'completed') {
      return false;
    }
    
    try {
      const now = new Date();
      const classDate = booking.classes?.date || booking.class_date;
      const classTime = booking.classes?.time || booking.class_time;
      
      // Safety check for undefined/null dates
      if (!classDate || !classTime || classDate === 'undefined' || classTime === 'undefined') {
        return false;
      }
      
      const classDateTime = new Date(`${classDate} ${classTime}`);
      
      // Check if date is valid
      if (isNaN(classDateTime.getTime())) {
        return false;
      }
      
      // Only confirmed bookings that are in the future are upcoming
      return booking.status === 'confirmed' && classDateTime > now;
    } catch (error) {
      console.error('Error in isUpcoming:', error, 'Booking:', booking?.id);
      return false;
    }
  };

  const canCancel = (booking: any) => {
    if (!booking || !isUpcoming(booking)) return false;
    
    try {
      const classDate = booking.classes?.date || booking.class_date;
      const classTime = booking.classes?.time || booking.class_time;
      
      if (!classDate || !classTime) return false;
      
      // Use unified booking utils for Albanian timezone consistency
      return unifiedBookingUtils.canCancelBooking(classDate, classTime);
    } catch {
      return false;
    }
  };

  // Safe string helper function
  const safeString = (value: any, fallback: string = '') => {
    if (value === null || value === undefined || value === '') {
      return fallback;
    }
    return String(value);
  };

  // Safe array check
  const safeBookings = Array.isArray(bookings) ? bookings : [];
  
  // 🎯 GET CURRENT ACTIVE SUBSCRIPTION for summary stats
  const activeSubscription = subscriptionHistory.find(sub => sub.status === 'active');
  
  // Filter bookings to only show those from the ACTIVE subscription period
  const getBookingsForActiveSubscription = (allBookings: any[]) => {
    if (!activeSubscription) return [];
    
    const subStart = new Date(activeSubscription.start_date);
    const subEnd = new Date(activeSubscription.end_date);
    
    return allBookings.filter(booking => {
      if (!booking || !booking.id) return false;
      
      const bookingDate = new Date(booking.classes?.date || booking.class_date);
      if (isNaN(bookingDate.getTime())) return false;
      
      return bookingDate >= subStart && bookingDate <= subEnd;
    });
  };
  
  // Only count upcoming/completed from ACTIVE subscription
  const activeSubscriptionBookings = getBookingsForActiveSubscription(safeBookings);
  const upcomingBookings = activeSubscriptionBookings.filter(booking => booking && isUpcoming(booking));
  
  // Show ALL past bookings in history (including cancelled) but exclude from count
  const pastBookings = safeBookings.filter(booking => {
    if (!booking || !booking.id) return false;
    
    // Include all past bookings regardless of status for display
    try {
      const now = new Date();
      const classDate = booking.classes?.date || booking.class_date;
      const classTime = booking.classes?.time || booking.class_time;
      
      // Safety check for dates
      if (!classDate || !classTime || classDate === 'undefined' || classTime === 'undefined') {
        return false;
      }
      
      const classDateTime = new Date(`${classDate} ${classTime}`);
      
      // Check if date is valid
      if (isNaN(classDateTime.getTime())) {
        return false;
      }
      
      // Show all past bookings (confirmed, completed, cancelled, no_show)
      const isPast = classDateTime <= now;
      
      // SPECIAL CASE: Cancelled bookings should always show in history regardless of class date
      // because once cancelled, they're part of your booking history
      const isCancelled = booking.status === 'cancelled';
      
      
      return isPast || isCancelled;
    } catch (error) {
      return false;
    }
  });
  
  // Count only past classes that were actually attended (exclude cancelled) - ONLY from active subscription
  const pastCompletedClasses = activeSubscriptionBookings.filter(booking => {
    if (!booking || !booking.id) return false;
    
    try {
      const now = new Date();
      const classDate = booking.classes?.date || booking.class_date;
      const classTime = booking.classes?.time || booking.class_time;
      
      // Safety check for undefined/null dates
      if (!classDate || !classTime || classDate === 'undefined' || classTime === 'undefined') {
        return false;
      }
      
      const classDateTime = new Date(`${classDate} ${classTime}`);
      
      // Check if date is valid
      if (isNaN(classDateTime.getTime())) {
        return false;
      }
      
      const isPast = classDateTime <= now;
      
      // Only count confirmed or completed classes that actually happened
      // Exclude cancelled and no-show
      const wasAttended = booking.status === 'confirmed' || booking.status === 'completed';
      const wasNotCancelled = booking.status !== 'cancelled' && booking.status !== 'no_show';
      
      const shouldCount = isPast && wasAttended && wasNotCancelled;
      
      
      return shouldCount;
    } catch (error) {
      console.error('Error in pastCompletedClasses filter:', error, 'Booking:', booking?.id);
      return false;
    }
  });
  
  // Apply pagination to past bookings - show only the most recent ones
  const displayedPastBookings = pastBookings.slice(0, displayLimit);
  const hasMoreBookings = pastBookings.length > displayLimit;
  
  const handleLoadMore = () => {
    setDisplayLimit(prev => prev + 20);
  };
  
  // Process waitlist entries - filter for upcoming classes only AND within active subscription period
  const safeWaitlistEntries = Array.isArray(waitlistEntries) ? waitlistEntries : [];
  const upcomingWaitlistEntries = safeWaitlistEntries.filter(entry => {
    try {
      const classDate = entry.classes?.date;
      const classTime = entry.classes?.time;
      if (!classDate || !classTime) return false;
      
      const classDateTime = new Date(`${classDate} ${classTime}`);
      const isUpcoming = classDateTime > new Date();
      
      // 🎯 Only count waitlist entries within active subscription period
      if (!activeSubscription || !isUpcoming) return false;
      
      const subStart = new Date(activeSubscription.start_date);
      const subEnd = new Date(activeSubscription.end_date);
      const bookingDate = new Date(classDate);
      
      return bookingDate >= subStart && bookingDate <= subEnd;
    } catch {
      return false;
    }
  });

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const cardColor = useThemeColor({}, 'surface');
  const textColor = useThemeColor({}, 'text');
  const accentColor = useThemeColor({}, 'accent');
  const errorColor = useThemeColor({}, 'error');
  const warningColor = useThemeColor({}, 'warning');
  const successColor = useThemeColor({}, 'success');
  const primaryColor = useThemeColor({}, 'primary');
  const secondaryTextColor = useThemeColor({}, 'textSecondary');
  const surfaceColor = useThemeColor({}, 'surface');
  const textMutedColor = useThemeColor({}, 'textMuted');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');

  if (isLoading && !refreshing) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor }]}>
        <ActivityIndicator size="large" color={accentColor} />
        <H2 style={{ ...styles.loadingText, color: textColor }}>{t('common.loading')}...</H2>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <RainingHearts />
      {/* Header */}
      <View style={[styles.header, { backgroundColor: surfaceColor, borderBottomWidth: 1, borderBottomColor: textMutedColor }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerText}>
            <H1 style={{ ...styles.headerTitle, color: textColor }}>{t('classes.myBookings')}</H1>
            <Body style={{ ...styles.headerSubtitle, color: textSecondaryColor }}>{t('classes.yourBookingsDesc')}</Body>
          </View>
          <Button
            mode="contained"
            icon="add"
            onPress={() => {
              // Navigate to Book tab
              navigation.navigate('Book' as never);
            }}
            style={[styles.bookNewButton, { backgroundColor: accentColor }]}
            labelStyle={{ color: 'white' }}
            compact
          >
            {t('classes.bookClass')}
          </Button>
        </View>
      </View>
      
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Summary Stats - Only for Active Subscription */}
        {activeSubscription && (
            <Card style={[styles.summaryCard, { backgroundColor: cardColor }]}>
              <Card.Content>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryItem}>
                    <H2 style={{ color: textColor, fontSize: 24 }}>{upcomingBookings.length}</H2>
                    <Caption style={{ color: textSecondaryColor }}>{t('classes.upcoming')}</Caption>
                  </View>
                  <View style={styles.summaryItem}>
                    <H2 style={{ color: textColor, fontSize: 24 }}>{pastCompletedClasses.length}</H2>
                    <Caption style={{ color: textSecondaryColor }}>{t('classes.completed')}</Caption>
                  </View>
                  <View style={styles.summaryItem}>
                    <H2 style={{ color: textColor, fontSize: 24 }}>{upcomingWaitlistEntries.length}</H2>
                    <Caption style={{ color: textSecondaryColor }}>{t('classes.waitlist')}</Caption>
                  </View>
                </View>
              </Card.Content>
            </Card>
        )}


        {safeBookings.length === 0 && safeWaitlistEntries.length === 0 ? (
          <Card style={[styles.emptyCard, { backgroundColor: cardColor }]}>
            <Card.Content>
              <H2 style={{ color: textColor }}>{t('classes.noBookingsYet')}</H2>
              <Body style={{ color: secondaryTextColor }}>{t('classes.noBookingsDesc')}</Body>
              <Button 
                mode="contained" 
                onPress={() => navigation.navigate('Book' as never)}
                style={[styles.bookButton, { backgroundColor: accentColor }]} 
                icon="calendar-today"
                labelStyle={{ color: 'white' }}
              >
                {t('classes.bookClass')}
              </Button>
            </Card.Content>
          </Card>
        ) : (
          <>
            {/* Upcoming Bookings Section */}
            {upcomingBookings.length > 0 && (
              <>
                <H2 style={{ ...styles.sectionTitle, color: textColor }}>{t('classes.upcoming')}</H2>
                {upcomingBookings.map((booking, index) => {
                  if (!booking || !booking.id) return null;
                  
                  const className = safeString(booking.classes?.name || booking.class_name, 'Unknown Class');
                  const instructorName = safeString(booking.classes?.users?.name || booking.instructor_name, 'TBA');
                  const classDate = safeString(booking.classes?.date || booking.class_date || booking.createdAt, '');
                  const classTime = safeString(booking.classes?.time || booking.class_time, '');
                  const equipmentType = safeString(booking.classes?.equipment_type || booking.equipment_type, '');
                  const bookingStatus = safeString(booking.status, 'unknown');
                  
                  return (
                    <Card key={`upcoming-booking-${booking.id}-${booking.status}-${index}`} style={[styles.bookingCard, styles.upcomingCard, { backgroundColor: cardColor, borderColor: successColor }]}>
                      <Card.Content>
                        <View style={styles.bookingHeader}>
                          <H2 style={{ ...styles.className, color: textColor }}>{className}</H2>
                          <Chip 
                            style={[styles.statusChip, { backgroundColor: getStatusColor(bookingStatus) }]}
                            textStyle={{ ...styles.chipText, color: backgroundColor }}
                          >
                            {getStatusText(bookingStatus, classDate, classTime, booking.cancelled_by)}
                          </Chip>
                        </View>
                        <Body style={{ ...styles.instructor, color: secondaryTextColor }}>{t('labels.with')} {instructorName}</Body>
                        <Body style={{ ...styles.dateTime, color: textColor }}>
                          {formatDate(classDate)} • {formatTime(classTime)}
                        </Body>
                        
                        {equipmentType && equipmentType.length > 0 && (
                          <Caption style={{ ...styles.equipment, color: secondaryTextColor }}>
                            {t('labels.equipment')}: {equipmentType.charAt(0).toUpperCase() + equipmentType.slice(1)}
                          </Caption>
                        )}
                        
                        {(booking.checkedIn === true || booking.checked_in === true) && (
                          <Caption style={{ ...styles.checkedIn, color: successColor }}>✓ {t('labels.checkedIn')}</Caption>
                        )}
                        
                        {canCancel(booking) && (
                          <Button 
                            mode="outlined" 
                            onPress={() => handleCancelBooking(String(booking.id), className)}
                            style={[styles.cancelButton, { borderColor: errorColor }]}
                            textColor={errorColor}
                            icon="close"
                            disabled={cancellingBookings.has(String(booking.id))}
                            loading={cancellingBookings.has(String(booking.id))}
                          >
                            {cancellingBookings.has(String(booking.id)) 
                              ? t('classes.cancelling') 
                              : t('classes.cancelBooking')
                            }
                          </Button>
                        )}
                      </Card.Content>
                    </Card>
                  );
                })}
              </>
            )}
            
            {/* Waitlist Section */}
            {upcomingWaitlistEntries.length > 0 && (
              <>
                <H2 style={{ ...styles.sectionTitle, color: textColor }}>{t('labels.onWaitlist')}</H2>
                {upcomingWaitlistEntries.map((waitlistEntry, index) => {
                  if (!waitlistEntry || !waitlistEntry.id) return null;
                  
                  const className = safeString(waitlistEntry.classes?.name, 'Unknown Class');
                  const instructorName = safeString(waitlistEntry.classes?.users?.name, 'TBA');
                  const classDate = safeString(waitlistEntry.classes?.date, '');
                  const classTime = safeString(waitlistEntry.classes?.time, '');
                  const equipmentType = safeString(waitlistEntry.classes?.equipment_type, '');
                  const position = waitlistEntry.position || 0;
                  
                  return (
                    <Card key={`waitlist-entry-${waitlistEntry.id}-${waitlistEntry.position}-${index}`} style={[styles.bookingCard, styles.waitlistCard, { backgroundColor: cardColor, borderColor: warningColor }]}>
                      <Card.Content>
                        <View style={styles.bookingHeader}>
                          <H2 style={{ ...styles.className, color: textColor }}>{className}</H2>
                          <Chip 
                            style={[styles.statusChip, { backgroundColor: warningColor }]}
                            textStyle={{ ...styles.chipText, color: 'white' }}
                          >
                            {t('labels.position')} #{position}
                          </Chip>
                        </View>
                        <Body style={{ ...styles.instructor, color: secondaryTextColor }}>{t('labels.with')} {instructorName}</Body>
                        <Body style={{ ...styles.dateTime, color: textColor }}>
                          {formatDate(classDate)} • {formatTime(classTime)}
                        </Body>
                        
                        {equipmentType && equipmentType.length > 0 && (
                          <Caption style={{ ...styles.equipment, color: secondaryTextColor }}>
                            {t('labels.equipment')}: {equipmentType.charAt(0).toUpperCase() + equipmentType.slice(1)}
                          </Caption>
                        )}
                        
                        <Caption style={{ ...styles.waitlistInfo, color: warningColor }}>
                          📝 {t('classes.waitlistInfoText')}
                        </Caption>
                        
                        <Button 
                          mode="outlined" 
                          onPress={() => handleCancelWaitlist(waitlistEntry.id, className)}
                          style={[styles.cancelButton, { borderColor: warningColor }]}
                          textColor={warningColor}
                          icon="close"
                        >
                          {t('classes.leaveWaitlist')}
                        </Button>
                      </Card.Content>
                    </Card>
                  );
                })}
              </>
            )}
            
            {/* Past Bookings Section - Grouped by Subscription */}
            {pastBookings.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <H2 style={{ ...styles.sectionTitle, color: textColor, marginBottom: 0 }}>{t('classes.completed')}</H2>
                  <Caption style={{ color: textSecondaryColor }}>
                    {t('classes.showingClasses', { displayed: pastBookings.length, total: pastBookings.length })}
                  </Caption>
                </View>
                
                {/* Group bookings by subscription periods */}
                {sortedSubscriptionOrder.slice(0, displayedSubscriptionCount).map((subscriptionId, groupIndex) => {
                  const group = groupedBookings[subscriptionId];
                  if (!group) return null;
                  
                  const { subscription, bookings: subscriptionBookings } = group;
                  // Show all bookings for each subscription period, don't limit them
                  const displayedSubscriptionBookings = subscriptionBookings;
                  
                  return (
                    <View key={`subscription-group-${subscription.id}-${groupIndex}`}>
                      {/* Subscription Period Header */}
                      <View style={styles.subscriptionPeriodHeader}>
                        <View style={styles.subscriptionPeriodInfo}>
                          <H2 style={{ color: textColor, fontSize: 18 }}>{subscription.plan_name}</H2>
                          <Caption style={{ color: textSecondaryColor }}>
                            {formatDate(subscription.start_date)} - {formatDate(subscription.end_date)}
                          </Caption>
                        </View>
                        <View style={styles.subscriptionPeriodStats}>
                          <Caption style={{ color: textColor, fontWeight: 'bold' }}>
                            {group.usage.used} {t('classes.completed')}
                          </Caption>
                          {group.bookings.length > group.usage.used && (
                            <Caption style={{ color: errorColor, fontSize: 12 }}>
                              {group.bookings.length - group.usage.used} cancelled
                            </Caption>
                          )}
                        </View>
                      </View>
                      
                      {/* Bookings for this subscription period */}
                      {displayedSubscriptionBookings.length === 0 ? (
                        <Card style={[styles.bookingCard, { backgroundColor: cardColor }]}>
                          <Card.Content>
                            <Body style={{ color: textSecondaryColor, textAlign: 'center', fontStyle: 'italic' }}>
                              {t('classes.noBookingsYet')}
                            </Body>
                          </Card.Content>
                        </Card>
                      ) : (
                        displayedSubscriptionBookings.map((booking: any, index: number) => {
                          if (!booking || !booking.id) return null;
                          
                          const className = safeString(booking.classes?.name || booking.class_name, 'Unknown Class');
                          const instructorName = safeString(booking.classes?.users?.name || booking.instructor_name, 'TBA');
                          const classDate = safeString(booking.classes?.date || booking.class_date || booking.createdAt, '');
                          const classTime = safeString(booking.classes?.time || booking.class_time, '');
                          const equipmentType = safeString(booking.classes?.equipment_type || booking.equipment_type, '');
                          const bookingStatus = safeString(booking.status, 'unknown');
                          
                          return (
                            <Card key={`subscription-booking-${subscription.id}-${booking.id}-${index}`} style={[styles.bookingCard, { backgroundColor: cardColor }]}>
                              <Card.Content>
                                <View style={styles.bookingHeader}>
                                  <H2 style={{ ...styles.className, color: textColor }}>{className}</H2>
                                  <Chip 
                                    style={[styles.statusChip, { backgroundColor: getStatusColor(bookingStatus) }]}
                                    textStyle={{ ...styles.chipText, color: backgroundColor }}
                                  >
                                    {getStatusText(bookingStatus, classDate, classTime, booking.cancelled_by)}
                                  </Chip>
                                </View>
                                <Body style={{ ...styles.instructor, color: secondaryTextColor }}>{t('labels.with')} {instructorName}</Body>
                                <Body style={{ ...styles.dateTime, color: textColor }}>
                                  {formatDate(classDate)} • {formatTime(classTime)}
                                </Body>
                                
                                {equipmentType && equipmentType.length > 0 && (
                                  <Caption style={{ ...styles.equipment, color: secondaryTextColor }}>
                                    {t('labels.equipment')}: {equipmentType.charAt(0).toUpperCase() + equipmentType.slice(1)}
                                  </Caption>
                                )}
                                
                                {(booking.checkedIn === true || booking.checked_in === true) && (
                                  <Caption style={{ ...styles.checkedIn, color: successColor }}>✓ {t('labels.checkedIn')}</Caption>
                                )}
                              </Card.Content>
                            </Card>
                          );
                        })
                      )}
                      
                      {/* Divider between subscription periods */}
                      {groupIndex < Math.min(displayedSubscriptionCount, sortedSubscriptionOrder.length) - 1 && (
                        <Divider style={{ marginVertical: 20, backgroundColor: textMutedColor, height: 2 }} />
                      )}
                    </View>
                  );
                })}
                
                {/* Load More Subscriptions Button */}
                {displayedSubscriptionCount < sortedSubscriptionOrder.length && (
                  <View style={styles.loadMoreContainer}>
                    <Button
                      mode="outlined"
                      onPress={loadMoreSubscriptions}
                      loading={isLoadingMoreSubscriptions}
                      disabled={isLoadingMoreSubscriptions}
                      style={[styles.loadMoreButton, { borderColor: accentColor }]}
                      textColor={accentColor}
                      icon="history"
                    >
                      {isLoadingMoreSubscriptions ? t('classes.loadingHistory') : t('classes.loadMoreHistory')}
                    </Button>
                    <Caption style={{ color: textSecondaryColor, marginTop: spacing.sm, textAlign: 'center' }}>
                      {t('classes.showingSubscriptions', { displayed: displayedSubscriptionCount, total: sortedSubscriptionOrder.length })}
                    </Caption>
                  </View>
                )}
                
                {/* Load More / Show All Buttons */}
                {hasMoreBookings && (
                  <View style={styles.loadMoreContainer}>
                    <View style={styles.buttonRow}>
                      <Button
                        mode="outlined"
                        onPress={handleLoadMore}
                        style={[styles.loadMoreButton, { borderColor: accentColor, flex: 1, marginRight: spacing.sm }]}
                        textColor={accentColor}
                        icon="keyboard-arrow-down"
                      >
                        Load More
                      </Button>
                      <Button
                        mode="contained"
                        onPress={() => setDisplayLimit(pastBookings.length)}
                        style={[styles.showAllButton, { backgroundColor: accentColor, flex: 1, marginLeft: spacing.sm }]}
                        textColor="white"
                        icon="list"
                      >
                        Show All
                      </Button>
                    </View>
                    <Caption style={{ color: textSecondaryColor, marginTop: spacing.sm, textAlign: 'center' }}>
                      Showing {displayedPastBookings.length} of {pastBookings.length} total classes
                    </Caption>
                  </View>
                )}
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
  },
  centerContent: { 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  loadingText: { 
    marginTop: spacing.lg, 
  },
  header: { 
    padding: spacing.xl, 
    paddingTop: 60, 
  },
  headerContent: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  headerText: { 
    flex: 1 
  },
  headerTitle: { 
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerSubtitle: { 
    marginTop: 4,
    fontSize: 16,
  },
  content: { 
    flex: 1, 
    padding: spacing.lg 
  },
  emptyCard: { 
    marginBottom: spacing.lg,
    borderRadius: 16,
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  bookButton: { 
    marginTop: spacing.lg, 
    alignSelf: 'flex-start',
    borderRadius: 16,
  },
  bookingCard: { 
    marginBottom: spacing.lg,
    borderRadius: 16,
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  bookingHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: spacing.sm 
  },
  className: { 
    flex: 1, 
    marginRight: spacing.sm,
    fontSize: 18,
    fontWeight: '600',
  },
  statusChip: { 
    marginLeft: spacing.sm,
    borderRadius: 12,
  },
  chipText: {
    // color will be overridden by inline style based on theme
    fontSize: 12,
    fontWeight: '600',
  },
  instructor: { 
    marginBottom: 4,
    fontSize: 15,
  },
  dateTime: { 
    marginBottom: spacing.sm,
    fontSize: 15,
    fontWeight: '500',
  },
  equipment: { 
    marginBottom: 4,
    fontSize: 13,
  },
  checkedIn: { 
    marginBottom: 4,
    fontSize: 13,
    fontWeight: '500',
  },
  cancelButton: { 
    marginTop: spacing.lg, 
    alignSelf: 'flex-start', 
    borderRadius: 12,
  },
  bookNewButton: { 
    marginLeft: spacing.sm,
    borderRadius: 16,
  },
  sectionTitle: { 
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
    fontSize: 20,
    fontWeight: '600',
  },
  sectionHeader: {
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  upcomingCard: { 
    borderWidth: 1,
  },
  waitlistCard: { 
    borderWidth: 1,
  },
  waitlistInfo: { 
    marginBottom: spacing.sm,
    fontSize: 13,
    fontStyle: 'italic',
  },
  loadMoreContainer: {
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: spacing.sm,
  },
  loadMoreButton: {
    borderRadius: 16,
    paddingHorizontal: spacing.xl,
  },
  showAllButton: {
    borderRadius: 16,
    paddingHorizontal: spacing.xl,
  },
  summaryCard: {
    marginBottom: spacing.lg,
    borderRadius: 16,
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  subscriptionCard: {
    marginBottom: spacing.md,
    borderRadius: 16,
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  subscriptionHeader: {
    marginBottom: spacing.md,
  },
  usageContainer: {
    marginTop: spacing.sm,
  },
  usageStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
  },
  usageItem: {
    alignItems: 'center',
    flex: 1,
  },
  progressContainer: {
    marginTop: spacing.sm,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: spacing.xs,
  },
  unlimitedContainer: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
  },
  subscriptionPeriodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
  },
  subscriptionPeriodInfo: {
    flex: 1,
  },
  subscriptionPeriodStats: {
    alignItems: 'flex-end',
  },
});

export default withChristmasDesign(BookingHistory, { 
  variant: 'celestial', 
  showSnow: true, 
  showLights: true 
});