import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Dimensions, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Calendar, CalendarList, LocaleConfig } from 'react-native-calendars';
import { ActivityIndicator, Button, Chip, Paragraph, Surface, Title } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { Body, Caption, H1 } from '../../../components/ui/Typography';
import { useThemeColor } from '../../../hooks/useThemeColor';
import { bookingService } from '../../services/bookingService';
import { AppDispatch, RootState } from '../../store';
import { createBooking, fetchBookings } from '../../store/bookingSlice';
import { fetchClasses } from '../../store/classSlice';

// Configure locale for calendar
LocaleConfig.locales['en'] = {
  monthNames: [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ],
  monthNamesShort: [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ],
  dayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  dayNamesShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  today: 'Today'
};
LocaleConfig.defaultLocale = 'en';



interface ClassItem {
  id: number;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  instructorName: string;
  level: string;
  capacity: number;
  enrolled: number;
  equipmentType: string;
  isBooked?: boolean;
  bookingId?: number;
  waitlistPosition?: number;
  waitlistId?: number;
}

interface DayClassesModalProps {
  visible: boolean;
  selectedDate: string;
  classes: ClassItem[];
  onDismiss: () => void;
  onBookClass: (classId: number) => void;
  onCancelBooking: (bookingId: number) => void;
  onJoinWaitlist: (classId: number) => void;
  onLeaveWaitlist: (waitlistId: number) => void;
}

const screenWidth = Dimensions.get('window').width;

function DayClassesModal({ 
  visible, 
  selectedDate, 
  classes, 
  onDismiss, 
  onBookClass, 
  onCancelBooking, 
  onJoinWaitlist, 
  onLeaveWaitlist 
}: DayClassesModalProps) {
  // Theme colors for modal
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

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    const timeParts = timeString.split(':');
    if (timeParts.length >= 2) {
      const hours = parseInt(timeParts[0]);
      const minutes = timeParts[1];
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
      return `${displayHours}:${minutes} ${ampm}`;
    }
    return timeString;
  };

  const getLevelColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'beginner': return successColor;
      case 'intermediate': return warningColor;
      case 'advanced': return errorColor;
      default: return textSecondaryColor;
    }
  };

  const getEquipmentIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'reformer': return 'fitness-center';
      case 'mat': return 'self-improvement';
      case 'both': return 'spa';
      default: return 'fitness-center';
    }
  };

  const getEquipmentColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'mat':
        return '#4CAF50';
      case 'reformer':
        return '#2196F3';
      case 'both':
        return '#9C27B0';
      default:
        return '#666666';
    }
  };

  const getAvailabilityColor = (enrolled: number, capacity: number) => {
    const percentage = enrolled / capacity;
    if (percentage >= 1) return errorColor; // Full - Red
    if (percentage >= 0.8) return warningColor; // Nearly full - Orange
    return successColor; // Available - Green
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const renderBookingButton = (classItem: ClassItem) => {
    if (classItem.isBooked) {
      return (
        <Button 
          mode="contained-tonal" 
          onPress={() => onCancelBooking(classItem.bookingId!)}
          style={[styles.bookingButton, { backgroundColor: errorColor }]}
          labelStyle={{ color: 'white' }}
          icon="cancel"
        >
          Cancel Booking
        </Button>
      );
    }

    const isFull = classItem.enrolled >= classItem.capacity;
    const isOnWaitlist = classItem.waitlistPosition !== undefined;

    if (isFull && !isOnWaitlist) {
      return (
        <Button 
          mode="contained" 
          onPress={() => onJoinWaitlist(classItem.id)}
          style={[styles.bookingButton, { backgroundColor: warningColor }]}
          labelStyle={{ color: 'white' }}
          icon="queue"
        >
          Join Waitlist
        </Button>
      );
    }

    if (isOnWaitlist) {
      return (
        <Button 
          mode="contained-tonal" 
          onPress={() => onLeaveWaitlist(classItem.waitlistId!)}
          style={[styles.bookingButton, { backgroundColor: warningColor }]}
          labelStyle={{ color: 'white' }}
          icon="queue"
        >
          Leave Waitlist #{classItem.waitlistPosition}
        </Button>
      );
    }

    return (
      <Button 
        mode="contained" 
        onPress={() => onBookClass(classItem.id)}
        style={[styles.bookingButton, { backgroundColor: primaryColor }]}
        labelStyle={{ color: 'white' }}
        icon="add"
      >
        Book Class
      </Button>
    );
  };

  return (
    <Modal 
      visible={visible} 
      animationType="fade" 
      transparent={true}
      onRequestClose={onDismiss}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalWrapper}>
          <Surface style={[styles.modalSurface, { backgroundColor: surfaceColor }]}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <Title style={{ color: textColor, fontSize: 20, fontWeight: '600' }}>
              {formatDate(selectedDate)}
            </Title>
            <Button mode="text" onPress={onDismiss} compact>
              <MaterialIcons name="close" size={24} color={textSecondaryColor} />
            </Button>
          </View>

          {/* Modal Content */}
          <ScrollView 
            style={styles.modalContent} 
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {classes.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons name="event-busy" size={48} color={textMutedColor} />
                <Paragraph style={{ color: textColor, textAlign: 'center', marginTop: 16 }}>
                  No classes available on this date
                </Paragraph>
              </View>
            ) : (
              classes.map((classItem) => (
                <Surface key={classItem.id} style={[
                  styles.classCard,
                  { backgroundColor: surfaceColor }
                ]}>
                  <View style={styles.classCardContent}>
                    {/* Time and Class Info */}
                    <View style={styles.classCardHeader}>
                      <View style={styles.timeContainer}>
                        <Text style={{ color: primaryColor, fontSize: 18, fontWeight: '600' }}>
                          {formatTime(classItem.startTime)}
                        </Text>
                        <Text style={{ color: textSecondaryColor, fontSize: 12 }}>
                          to {formatTime(classItem.endTime)}
                        </Text>
                      </View>
                      
                      <View style={styles.classInfo}>
                        <View style={styles.classTitleRow}>
                          <View style={styles.classCardLeft}>
                            <Text style={[styles.className, { color: textColor }]} numberOfLines={2} ellipsizeMode="tail">
                              {classItem.name}
                            </Text>
                            
                            <Text style={{ color: textSecondaryColor, fontSize: 12 }}>
                              {formatTime(classItem.startTime)} - {formatTime(classItem.endTime)}
                            </Text>
                          </View>
                          
                          <View style={styles.equipmentBadgeContainer}>
                            <MaterialIcons 
                              name={getEquipmentIcon(classItem.equipmentType)} 
                              size={16} 
                              color={getEquipmentColor(classItem.equipmentType)} 
                              style={styles.equipmentIcon}
                            />
                            <Text style={[styles.equipmentLabel, { color: textSecondaryColor }]}>
                              {classItem.equipmentType.charAt(0).toUpperCase() + classItem.equipmentType.slice(1)}
                            </Text>
                          </View>
                        </View>
                        
                        <View style={styles.instructorRow}>
                          <MaterialIcons name="person" size={16} color={textSecondaryColor} />
                          <Text style={[styles.instructorName, { color: textSecondaryColor }]} numberOfLines={2} ellipsizeMode="tail">
                            {classItem.instructorName}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Status chips row */}
                    <View style={styles.statusChipsRow}>
                      {classItem.isBooked && (
                        <Chip 
                          style={[styles.bookedChip, { backgroundColor: successColor }]}
                          textStyle={styles.bookedChipText}
                          icon="check-circle"
                          compact
                        >
                          Booked
                        </Chip>
                      )}
                      
                      {classItem.waitlistPosition && (
                        <Chip 
                          style={[styles.waitlistChip, { backgroundColor: warningColor, marginLeft: 4 }]}
                          textStyle={styles.waitlistChipText}
                          icon="queue"
                          compact
                        >
                          Waitlist #{classItem.waitlistPosition}
                        </Chip>
                      )}
                    </View>

                    {/* Divider */}
                    <View style={[styles.divider, { backgroundColor: textMutedColor }]} />

                    {/* Availability Info */}
                    <View style={styles.availabilityContainer}>
                      <View style={styles.enrollmentInfo}>
                        <Text style={[styles.enrollmentText, { color: textSecondaryColor }]} numberOfLines={1} ellipsizeMode="tail">
                          {classItem.enrolled}/{classItem.capacity} enrolled
                        </Text>
                        <View style={[
                          styles.availabilityIndicator,
                          { backgroundColor: getAvailabilityColor(classItem.enrolled, classItem.capacity) }
                        ]}>
                          <Text style={styles.availabilityText} numberOfLines={1} ellipsizeMode="tail">
                            {classItem.enrolled >= classItem.capacity ? 'Class Full' : 
                             `${classItem.capacity - classItem.enrolled} spot${classItem.capacity - classItem.enrolled !== 1 ? 's' : ''} left`}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Action Button */}
                    <View style={styles.actionContainer}>
                      {renderBookingButton(classItem)}
                    </View>
                  </View>
                </Surface>
              ))
            )}
          </ScrollView>
        </Surface>
        </View>
      </View>
    </Modal>
  );
}

function CalendarView() {
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
  
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { classes, isLoading: classesLoading } = useSelector((state: RootState) => state.classes);
  const { bookings, isLoading: bookingsLoading } = useSelector((state: RootState) => state.bookings);
  const { currentSubscription } = useSelector((state: RootState) => state.subscriptions);
  
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [selectedDate, setSelectedDate] = useState('');
  const [dayClassesVisible, setDayClassesVisible] = useState(false);
  const [markedDates, setMarkedDates] = useState<any>({});
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().split('T')[0]);
  const [userWaitlist, setUserWaitlist] = useState<any[]>([]);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<number>(Date.now());

  useEffect(() => {
    loadCalendarData();
  }, [dispatch]);

  useFocusEffect(
    useCallback(() => {
      loadCalendarData();
      
      // More frequent polling when screen is focused
      pollIntervalRef.current = setInterval(() => {
        const now = Date.now();
        const timeSinceLastUpdate = now - lastUpdateRef.current;
        
        // If it's been more than 10 seconds since last update, refresh immediately
        if (timeSinceLastUpdate > 10000) {
          console.log('🔄 Calendar auto-refresh triggered');
          loadCalendarData();
        }
      }, 10000); // Check every 10 seconds instead of 30
      
      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }
      };
    }, [selectedDate, dispatch])
  );

  // Add effect to refresh when app comes back to foreground
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        console.log('📱 App became active, refreshing calendar data');
        loadCalendarData();
      }
    };

    // Listen for app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, []);

  useEffect(() => {
    generateMarkedDates();
  }, [classes, bookings, userWaitlist, primaryColor, successColor, warningColor]);

  const loadCalendarData = async () => {
    try {
      await Promise.all([
        dispatch(fetchClasses({})),
        dispatch(fetchBookings({}))
      ]);
      
      // Load user's waitlist
      if (user?.id) {
        const waitlistResponse = await bookingService.getUserWaitlist(user.id);
        if (waitlistResponse.success) {
          setUserWaitlist(waitlistResponse.data || []);
        }
      }
      lastUpdateRef.current = Date.now(); // Update last update time
    } catch (error) {
      console.error('Failed to load calendar data:', error);
    }
  };

  const generateMarkedDates = () => {
    const marked: any = {};
    const classesArray = Array.isArray(classes) ? classes : [];
    const bookingsArray = Array.isArray(bookings) ? bookings : [];

    // Mark dates with classes
    classesArray.forEach((classItem: any) => {
      const date = classItem.date;
      if (!marked[date]) {
        marked[date] = { dots: [] };
      }
      
      // Check if class is full
      const isFull = classItem.enrolled >= classItem.capacity;
      
      // Add a dot for class availability
      if (!marked[date].dots.some((dot: any) => dot.key === 'available')) {
        marked[date].dots.push({
          key: 'available',
          color: isFull ? errorColor : primaryColor,
          selectedDotColor: isFull ? errorColor : primaryColor
        });
      }
    });

    // Mark dates with user bookings
    bookingsArray.forEach((booking: any) => {
      const date = booking.class_date || booking.class?.date;
      if (!date) return;
      
      if (!marked[date]) {
        marked[date] = { dots: [] };
      }
      
      // Add a dot for booked class
      if (booking.status === 'confirmed' && !marked[date].dots.some((dot: any) => dot.key === 'booked')) {
        marked[date].dots.push({
          key: 'booked',
          color: successColor,
          selectedDotColor: successColor
        });
      }
      
      // Add a dot for waitlist booking
      if (booking.status === 'waitlist' && !marked[date].dots.some((dot: any) => dot.key === 'waitlist-booking')) {
        marked[date].dots.push({
          key: 'waitlist-booking',
          color: warningColor,
          selectedDotColor: warningColor
        });
      }
    });

    // Mark dates with user waitlist entries
    userWaitlist.forEach((waitlistEntry: any) => {
      const date = waitlistEntry.date;
      if (!date) return;
      
      if (!marked[date]) {
        marked[date] = { dots: [] };
      }
      
      // Add a dot for waitlisted class
      if (!marked[date].dots.some((dot: any) => dot.key === 'waitlist')) {
        marked[date].dots.push({
          key: 'waitlist',
          color: warningColor,
          selectedDotColor: warningColor
        });
      }
    });

    // Mark today
    const today = new Date().toISOString().split('T')[0];
    if (!marked[today]) {
      marked[today] = { dots: [] };
    }
    marked[today].selected = true;
    marked[today].selectedColor = primaryColor;

    setMarkedDates(marked);
  };

  const getClassesForDate = (date: string): ClassItem[] => {
    if (!classes || !Array.isArray(classes)) return [];
    
    const dateClasses = classes.filter(cls => cls.date === date);
    
    return dateClasses.map(cls => {
      // Check if user has booked this class
      const userBooking = bookings?.find(booking => 
        booking.class_id === cls.id && ['confirmed', 'waitlist'].includes(booking.status)
      );
      
      // Check if user is on waitlist for this class
      const waitlistEntry = userWaitlist.find(w => w.class_id === cls.id);
      
             return {
         id: cls.id,
         name: cls.name,
         date: cls.date,
         startTime: cls.time,
         endTime: cls.time, // Backend doesn't have end_time
         instructorName: cls.instructor_name || 'TBD',
         level: cls.level || 'All Levels',
         capacity: cls.capacity || 10,
         enrolled: cls.enrolled || 0,
         equipmentType: cls.equipment_type || 'mat',
         isBooked: !!userBooking,
         bookingId: userBooking?.id,
         waitlistPosition: waitlistEntry?.position,
         waitlistId: waitlistEntry?.id
       };
    });
  };

  const handleDayPress = (day: any) => {
    setSelectedDate(day.dateString);
    setDayClassesVisible(true);
  };

  const handleBookClass = async (classId: number) => {
    try {
      if (!currentSubscription) {
        Alert.alert('Subscription Required', 'You need an active subscription to book classes. Please visit reception.');
        return;
      }

      // Check personal subscription restrictions
      const class_ = classes.find(c => c.id === classId);
      if (class_) {
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
      }

      try {
        const result = await dispatch(createBooking({ classId })).unwrap();
        Alert.alert('Success', 'Class booked successfully!');
        await loadCalendarData();
      } catch (error: any) {
        // If booking fails, it might be because class is full - try to join waitlist
        if (error.includes('waitlist') || error.includes('full')) {
          Alert.alert('Class Full', 'This class is full. Would you like to join the waitlist?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Join Waitlist', onPress: () => handleJoinWaitlist(classId) }
          ]);
        } else {
          Alert.alert('Booking Failed', error || 'Failed to book class');
        }
      }
    } catch (error: any) {
      Alert.alert('Error', 'An unexpected error occurred');
    }
  };

  const handleCancelBooking = async (bookingId: number) => {
    try {
      Alert.alert(
        'Cancel Booking',
        'Are you sure you want to cancel this booking?',
        [
          { text: 'No', style: 'cancel' },
          { 
            text: 'Yes', 
            onPress: async () => {
              const result = await bookingService.cancelBooking(bookingId);
              if (result.success) {
                Alert.alert('Success', result.message || 'Booking cancelled successfully!');
                await loadCalendarData();
              } else {
                Alert.alert('Error', result.message || 'Failed to cancel booking');
              }
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to cancel booking');
    }
  };

  const handleJoinWaitlist = async (classId: number) => {
    try {
      const result = await bookingService.joinWaitlist({ classId });
      if (result.success) {
        Alert.alert('Success', `You've been added to the waitlist at position #${result.data?.position}.`);
        await loadCalendarData();
      } else {
        Alert.alert('Error', result.message || 'Failed to join waitlist');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to join waitlist');
    }
  };

  const handleLeaveWaitlist = async (waitlistId: number) => {
    try {
      Alert.alert(
        'Leave Waitlist',
        'Are you sure you want to leave the waitlist?',
        [
          { text: 'No', style: 'cancel' },
          { 
            text: 'Yes', 
            onPress: async () => {
              const result = await bookingService.leaveWaitlist(waitlistId);
              if (result.success) {
                Alert.alert('Success', 'You have been removed from the waitlist.');
                await loadCalendarData();
              } else {
                Alert.alert('Error', result.message || 'Failed to leave waitlist');
              }
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to leave waitlist');
    }
  };

  const selectedDateClasses = selectedDate ? getClassesForDate(selectedDate) : [];

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {/* Header */}
      <Surface style={[styles.header, { backgroundColor: surfaceColor }]}>
        <View style={styles.headerContent}>
          <H1 style={{ ...styles.headerTitle, color: textColor }}>Class Calendar</H1>
          
          <View style={styles.viewToggle}>
            <Button
              mode={viewMode === 'month' ? 'contained' : 'outlined'}
              onPress={() => setViewMode('month')}
              style={[styles.toggleButton, viewMode === 'month' && { backgroundColor: accentColor }]}
              labelStyle={viewMode === 'month' ? { color: backgroundColor } : { color: accentColor }}
              compact
            >
              Month
            </Button>
            <Button
              mode={viewMode === 'week' ? 'contained' : 'outlined'}
              onPress={() => setViewMode('week')}
              style={[styles.toggleButton, viewMode === 'week' && { backgroundColor: accentColor }]}
              labelStyle={viewMode === 'week' ? { color: backgroundColor } : { color: accentColor }}
              compact
            >
              Week
            </Button>
          </View>
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: primaryColor }]} />
            <Caption style={{ ...styles.legendText, color: textSecondaryColor }}>Available</Caption>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: successColor }]} />
            <Caption style={{ ...styles.legendText, color: textSecondaryColor }}>Booked</Caption>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: warningColor }]} />
            <Caption style={{ ...styles.legendText, color: textSecondaryColor }}>Waitlist</Caption>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: errorColor }]} />
            <Caption style={{ ...styles.legendText, color: textSecondaryColor }}>Full</Caption>
          </View>
        </View>
      </Surface>

      {/* Calendar */}
      <View style={styles.calendarContainer}>
        {(classesLoading || bookingsLoading) && (
          <View style={[styles.loadingOverlay, { backgroundColor: `${backgroundColor}CC` }]}>
            <ActivityIndicator size="large" color={accentColor} />
            <Body style={{ ...styles.loadingText, color: textColor }}>Loading calendar...</Body>
          </View>
        )}

        {viewMode === 'month' ? (
          <Calendar
            current={currentMonth}
            onDayPress={handleDayPress}
            onMonthChange={(month: { dateString: string }) => {
              setCurrentMonth(month.dateString);
            }}
            markingType={'multi-dot'}
            markedDates={markedDates}
            renderHeader={(date: any) => {
              // Custom header to avoid GMT timestamp display
              const monthDate = new Date(date);
              const monthName = monthDate.toLocaleDateString('en-US', { 
                month: 'long', 
                year: 'numeric' 
              });
              return (
                <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 10 }}>
                  <Text style={{ fontSize: 22, fontWeight: '700', color: textColor }}>
                    {monthName}
                  </Text>
                </View>
              );
            }}
            theme={{
              backgroundColor: surfaceColor,
              calendarBackground: surfaceColor,
              textSectionTitleColor: primaryColor,
              selectedDayBackgroundColor: primaryColor,
              selectedDayTextColor: 'white',
              todayTextColor: primaryColor,
              dayTextColor: textColor,
              textDisabledColor: textMutedColor,
              dotColor: primaryColor,
              selectedDotColor: 'white',
              arrowColor: primaryColor,
              disabledArrowColor: textMutedColor,
              monthTextColor: textColor,
              indicatorColor: primaryColor,
              textDayFontFamily: 'System',
              textMonthFontFamily: 'System',
              textDayHeaderFontFamily: 'System',
              textDayFontWeight: '400',
              textMonthFontWeight: '700',
              textDayHeaderFontWeight: '600',
              textDayFontSize: 16,
              textMonthFontSize: 22,
              textDayHeaderFontSize: 13
            }}
            style={styles.calendar}
            hideExtraDays={true}
            firstDay={1}
            enableSwipeMonths={true}
          />
        ) : (
          <CalendarList
            current={currentMonth}
            onDayPress={handleDayPress}
            horizontal={true}
            pagingEnabled={true}
            calendarWidth={320}
            markingType={'multi-dot'}
            markedDates={markedDates}
            renderHeader={(date: any) => {
              // Custom header to avoid GMT timestamp display
              const monthDate = new Date(date);
              const monthName = monthDate.toLocaleDateString('en-US', { 
                month: 'long', 
                year: 'numeric' 
              });
              return (
                <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 10 }}>
                  <Text style={{ fontSize: 22, fontWeight: '700', color: textColor }}>
                    {monthName}
                  </Text>
                </View>
              );
            }}
            theme={{
              backgroundColor: surfaceColor,
              calendarBackground: surfaceColor,
              textSectionTitleColor: primaryColor,
              selectedDayBackgroundColor: primaryColor,
              selectedDayTextColor: 'white',
              todayTextColor: primaryColor,
              dayTextColor: textColor,
              textDisabledColor: textMutedColor,
              dotColor: primaryColor,
              selectedDotColor: 'white',
              arrowColor: primaryColor,
              disabledArrowColor: textMutedColor,
              monthTextColor: textColor,
              indicatorColor: primaryColor,
              textDayFontFamily: 'System',
              textMonthFontFamily: 'System',
              textDayHeaderFontFamily: 'System',
              textDayFontWeight: '400',
              textMonthFontWeight: '700',
              textDayHeaderFontWeight: '600',
              textDayFontSize: 16,
              textMonthFontSize: 22,
              textDayHeaderFontSize: 13
            }}
            style={styles.calendar}
            hideExtraDays={true}
            firstDay={1}
          />
        )}
      </View>

      {/* Day Classes Modal */}
      <DayClassesModal
        visible={dayClassesVisible}
        selectedDate={selectedDate}
        classes={selectedDateClasses}
        onDismiss={() => setDayClassesVisible(false)}
        onBookClass={handleBookClass}
        onCancelBooking={handleCancelBooking}
        onJoinWaitlist={handleJoinWaitlist}
        onLeaveWaitlist={handleLeaveWaitlist}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: Colors.light.background, // This will be handled by useThemeColor
  },
  header: {
    padding: 20,
    paddingTop: 40,
    // backgroundColor: Colors.light.primary, // This will be handled by useThemeColor
    elevation: 1,
    shadowColor: 'transparent', // This will be handled by useThemeColor
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  headerTitle: {
    // color: Colors.light.textOnAccent, // This will be handled by useThemeColor
  },
  viewToggle: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleButton: {
    borderRadius: 16,
    // backgroundColor: Colors.light.accent, // This will be handled by useThemeColor
  },
  activeToggle: {
    // backgroundColor: Colors.light.accent, // This will be handled by useThemeColor
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'transparent', // This will be handled by useThemeColor
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    // color: Colors.light.textOnAccent, // This will be handled by useThemeColor
  },
  calendarContainer: {
    flex: 1,
    position: 'relative',
    // backgroundColor: Colors.light.background, // This will be handled by useThemeColor
  },
  calendar: {
    borderRadius: 0,
    // backgroundColor: Colors.light.surface, // This will be handled by useThemeColor
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // backgroundColor: `${Colors.light.surface}CC`, // This will be handled by useThemeColor
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 16,
    // color: Colors.light.textSecondary, // This will be handled by useThemeColor
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
  },
  modalWrapper: {
    width: screenWidth - 40,
    maxHeight: '70%',
    alignSelf: 'center',
  },
  modalSurface: {
    borderRadius: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    padding: 16,
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 6,
  },
  modalTitle: {
    // color: Colors.light.text, // This will be handled by useThemeColor
  },
  modalContent: {
    maxHeight: '100%',
    width: '100%',
  },
  modalScrollContent: {
    paddingBottom: 8,
    width: '100%',
  },
  noClassesContainer: {
    alignItems: 'center',
    padding: 32,
  },
  noClassesText: {
    marginTop: 16,
    textAlign: 'center',
    // color: Colors.light.textSecondary, // This will be handled by useThemeColor
  },
  classModalItem: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    // backgroundColor: Colors.light.surface, // This will be handled by useThemeColor
    elevation: 1,
    shadowColor: 'transparent', // This will be handled by useThemeColor
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  bookedClassItem: {
    // backgroundColor: `${Colors.light.success}08`, // This will be handled by useThemeColor
    borderWidth: 1,
    borderColor: 'transparent', // This will be handled by useThemeColor
  },
  classModalHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  timeSection: {
    marginRight: 16,
    alignItems: 'center',
    minWidth: 80,
  },
  classModalTime: {
    // color: Colors.light.accent, // This will be handled by useThemeColor
    textAlign: 'center',
  },
  duration: {
    // color: Colors.light.textSecondary, // This will be handled by useThemeColor
    textAlign: 'center',
  },
  classModalInfo: {
    flex: 1,
  },
  classModalTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  classModalName: {
    flex: 1,
    marginRight: 8,
    // color: Colors.light.text, // This will be handled by useThemeColor
  },
  classModalBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  levelChip: {
    height: 24, // Smaller height
    borderRadius: 12,
    // backgroundColor: Colors.light.success, // This will be handled by useThemeColor
  },
  chipText: {
    // color: Colors.light.textOnAccent, // This will be handled by useThemeColor
    fontSize: 12,
  },
  equipmentIcon: {
    marginLeft: 4,
  },
  instructor: {
    // color: Colors.light.textSecondary, // This will be handled by useThemeColor
    marginBottom: 8,
  },
  availabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  availabilityBadge: {
    borderRadius: 12,
    // backgroundColor: Colors.light.success, // This will be handled by useThemeColor
  },
  bookedChip: {
    borderRadius: 12,
    // backgroundColor will be handled by inline style
  },
  bookedChipText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  waitlistChip: {
    borderRadius: 12,
    // backgroundColor will be handled by inline style
  },
  waitlistChipText: {
    color: 'white',
    fontSize: 12,
  },
  classModalActions: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  bookButton: {
    // backgroundColor: Colors.light.accent, // This will be handled by useThemeColor
    borderRadius: 16,
  },
  cancelButton: {
    // borderColor: Colors.light.error, // This will be handled by useThemeColor
    borderRadius: 16,
  },
  bookingButton: {
    marginTop: 12,
    borderRadius: 8,
  },
  bookingButtonContainer: {
    marginTop: 8,
  },
  // New Modal Styles
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  classCard: {
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    width: '100%',
  },
  classCardContent: {
    padding: 14,
    width: '100%',
  },
  classCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    width: '100%',
  },
  timeContainer: {
    alignItems: 'flex-start',
    width: 90,
    marginRight: 16,
  },
  classInfo: {
    flex: 1,
    flexDirection: 'column',
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    flexWrap: 'wrap',
    width: '100%',
  },
  equipmentIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 2,
    maxWidth: 70, // Reduced max width
  },
  statusChip: {
    height: 24, // Smaller height
    borderRadius: 12,
  },
  availabilityContainer: {
    marginBottom: 8,
    width: '100%',
  },
  enrollmentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  availabilityIndicator: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
    maxWidth: '40%',
  },
  actionContainer: {
    marginTop: 8,
  },
  instructorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  divider: {
    height: 1,
    marginVertical: 12,
    opacity: 0.2,
  },
  className: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'left',
    lineHeight: 22,
  },
  instructorName: {
    fontSize: 12,
    marginLeft: 6,
    textAlign: 'left',
    lineHeight: 16,
    flex: 1,
  },
  equipmentText: {
    fontSize: 9,
    marginLeft: 3,
    lineHeight: 12,
  },
  enrollmentText: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  availabilityText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  // New styles for improved layout
  classTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  classCardLeft: {
    flex: 1,
    marginRight: 12,
  },
  equipmentBadgeContainer: {
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  equipmentLabel: {
    fontSize: 10,
    marginTop: 1,
  },
  statusChipText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  statusChipsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    marginBottom: 4,
  },

});

export default CalendarView; 