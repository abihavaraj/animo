import { Caption, H2 } from '@/components/ui/Typography';
import { spacing } from '@/constants/Spacing';
import { useThemeColor } from '@/hooks/useThemeColor';
import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { Button, Card, Chip, FAB, Paragraph, SegmentedButtons, Surface } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { bookingService } from '../../services/bookingService';
import { BackendClass } from '../../services/classService';
import { AppDispatch, RootState } from '../../store';
import { cancelBooking, createBooking, fetchBookings } from '../../store/bookingSlice';
import { fetchClasses } from '../../store/classSlice';
import { fetchCurrentSubscription } from '../../store/subscriptionSlice';

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
  duration: number;
  description: string;
  category: 'personal' | 'group';
  isBooked?: boolean;
  bookingId?: number;
  room?: string;
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

// Helper function to convert BackendClass to ClassItem
const mapBackendClassToClassItem = (backendClass: BackendClass, userBooking?: any, waitlistEntry?: any): ClassItem => {
  // Calculate end time from start time and duration
  const calculateEndTime = (startTime: string, duration: number): string => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + duration;
    const endHours = Math.floor(endMinutes / 60);
    const remainingMinutes = endMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${remainingMinutes.toString().padStart(2, '0')}`;
  };

  return {
    id: backendClass.id,
    name: backendClass.name,
    date: backendClass.date,
    startTime: backendClass.time,
    endTime: calculateEndTime(backendClass.time, backendClass.duration),
    instructorName: backendClass.instructor_name,
    level: backendClass.level || 'beginner',
    capacity: backendClass.capacity,
    enrolled: backendClass.enrolled || 0,
    equipmentType: backendClass.equipment_type,
    duration: backendClass.duration,
    description: backendClass.description || '',
    category: backendClass.category,
    isBooked: !!userBooking,
    bookingId: userBooking?.id,
    room: backendClass.room,
    waitlistPosition: waitlistEntry?.position,
    waitlistId: waitlistEntry?.id,
  };
};

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
  // Blue color that works well in both light and dark modes
  const availableColor = '#5B9BD5';
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Helper function to render enrollment info with progress bar
  const renderEnrollmentInfo = (enrolled: number, capacity: number, isPast?: boolean) => {
    const spotsLeft = capacity - enrolled;
    const fillPercentage = (enrolled / capacity) * 100;
    const isNearlyFull = spotsLeft <= 2 && spotsLeft > 0;
    const isFull = spotsLeft <= 0;
    
    // Progress bar color based on availability
    const getProgressColor = () => {
      if (isFull) return errorColor;
      if (isNearlyFull) return warningColor;
      return successColor;
    };

    return (
      <View style={styles.enrollmentInfoContainer}>
        <View style={styles.enrollmentTextRow}>
          <Paragraph style={[styles.enrollmentText, { color: textColor }]}>
            {enrolled}/{capacity} enrolled
          </Paragraph>
          {!isPast && (
            <Caption style={{
              ...(isFull ? styles.fullClassText : styles.spotsLeftText),
              color: isFull ? errorColor : (isNearlyFull ? warningColor : successColor)
            }}>
              {isFull ? 'Class Full' : `${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left`}
            </Caption>
          )}
        </View>
        
        {/* Visual Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBarBackground, { backgroundColor: `${textMutedColor}30` }]}>
            <View 
              style={[
                styles.progressBarFill, 
                { 
                  backgroundColor: getProgressColor(),
                  width: `${Math.min(fillPercentage, 100)}%`
                }
              ]} 
            />
          </View>
        </View>
      </View>
    );
  };

  // Helper to check if class is bookable
  const isBookable = (classItem: ClassItem): boolean => {
    const today = new Date();
    const todayString = today.getFullYear() + '-' + 
      String(today.getMonth() + 1).padStart(2, '0') + '-' + 
      String(today.getDate()).padStart(2, '0');
    
    if (classItem.date < todayString) return false;
    if (classItem.isBooked) return false;
    
    // If it's today, allow booking up to 15 minutes before class
    if (classItem.date === todayString) {
      const [hours, minutes] = classItem.startTime.split(':').map(Number);
      const classDateTime = new Date();
      classDateTime.setHours(hours, minutes, 0, 0);
      
      const cutoffTime = new Date(classDateTime);
      cutoffTime.setMinutes(cutoffTime.getMinutes() - 15);
      
      return new Date() < cutoffTime;
    }
    
    return true;
  };

  // Helper to check if date is in the past
  const isPastDate = (date: string): boolean => {
    const today = new Date();
    const todayString = today.getFullYear() + '-' + 
      String(today.getMonth() + 1).padStart(2, '0') + '-' + 
      String(today.getDate()).padStart(2, '0');
    return date < todayString;
  };

  // Helper to check if booking is cancellable
  const isBookingCancellable = (classItem: ClassItem): boolean => {
    if (!classItem.isBooked) return false;
    if (isPastDate(classItem.date)) return false;
    
    const today = new Date();
    const todayString = today.getFullYear() + '-' + 
      String(today.getMonth() + 1).padStart(2, '0') + '-' + 
      String(today.getDate()).padStart(2, '0');
      
    // If it's today, check the 2-hour rule
    if (classItem.date === todayString) {
      const [hours, minutes] = classItem.startTime.split(':').map(Number);
      const classDateTime = new Date();
      classDateTime.setHours(hours, minutes, 0, 0);
      
      const hoursUntilClass = (classDateTime.getTime() - new Date().getTime()) / (1000 * 60 * 60);
      
      return hoursUntilClass > 2;
    }
    
    return true;
  };

  const renderBookingButton = (classItem: ClassItem, isBookable: boolean, isCancellable: boolean, isPast: boolean) => {
    if (isPast) return null;
    
    if (classItem.isBooked) {
      return (
        <Button 
          mode="contained" 
          onPress={() => onCancelBooking(classItem.bookingId!)}
          style={[
            styles.actionButton, 
            { backgroundColor: isCancellable ? errorColor : textMutedColor },
            !isCancellable && styles.disabledButton
          ]}
          labelStyle={{ color: backgroundColor }}
          icon="cancel"
          disabled={!isCancellable}
        >
          {isCancellable ? 'Cancel' : 'Cannot Cancel'}
        </Button>
      );
    }

    const isFull = classItem.enrolled >= classItem.capacity;
    const isOnWaitlist = classItem.waitlistPosition !== undefined;

    if (isOnWaitlist) {
      return (
        <Button 
          mode="outlined" 
          onPress={() => onLeaveWaitlist(classItem.waitlistId!)}
          style={[styles.actionButton, { borderColor: warningColor }]}
          textColor={warningColor}
          icon="queue"
        >
          Leave Waitlist #{classItem.waitlistPosition}
        </Button>
      );
    }

    if (isFull && !isOnWaitlist) {
      return (
        <Button 
          mode="contained" 
          onPress={() => onJoinWaitlist(classItem.id)}
          style={[styles.actionButton, { backgroundColor: warningColor }]}
          labelStyle={{ color: backgroundColor }}
          icon="queue"
        >
          Join Waitlist
        </Button>
      );
    }

    return (
      <Button 
        mode="contained" 
        onPress={() => onBookClass(classItem.id)}
        style={[
          styles.actionButton,
          { backgroundColor: isBookable ? accentColor : textMutedColor },
          !isBookable && styles.disabledButton
        ]}
        labelStyle={{ color: backgroundColor }}
        icon="calendar-today"
        disabled={!isBookable}
      >
        Book Class
      </Button>
    );
  };

  if (!visible) return null;

  return (
    <View style={styles.modalOverlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
      <View style={[styles.modalSurface, { backgroundColor: surfaceColor }]}>
        <ScrollView 
          style={styles.modalContent} 
          contentContainerStyle={styles.modalScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.modalHeader}>
            <H2 style={{ color: textColor }}>{formatDate(selectedDate)}</H2>
            <Button mode="text" onPress={onDismiss}>
              <MaterialIcons name="close" size={24} color={textSecondaryColor} />
            </Button>
          </View>

          {classes.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="event-busy" size={48} color={textMutedColor} />
              <Paragraph style={{ color: textColor, textAlign: 'center', marginTop: spacing.md }}>
                No classes available on this date
              </Paragraph>
            </View>
          ) : (
            classes.map((classItem) => {
              const canBook = isBookable(classItem);
              const isCancellable = isBookingCancellable(classItem);
              const isPast = isPastDate(classItem.date);

              return (
                <Surface key={classItem.id} style={[
                  styles.classModalItemImproved,
                  { 
                    backgroundColor: textColor + '15',
                    borderColor: textColor + '80',
                    borderWidth: 3,
                    shadowColor: textColor,
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.2,
                    shadowRadius: 6,
                    elevation: 5
                  },
                  classItem.isBooked ? { backgroundColor: `${successColor}20` } : {},
                  classItem.waitlistPosition ? { backgroundColor: `${warningColor}20` } : {}
                ]}>
                  <View>
                    <View style={styles.classModalHeader}>
                      <View style={[styles.timeSection, { 
                        backgroundColor: availableColor + '90',
                        borderRadius: 12,
                        padding: 12,
                        borderWidth: 2,
                        borderColor: availableColor,
                        minWidth: 80,
                        alignItems: 'center'
                      }]}>
                        <H2 style={{ 
                          color: backgroundColor, 
                          fontWeight: 'bold',
                          fontSize: 20,
                          textAlign: 'center'
                        }}>{formatTime(classItem.startTime)}</H2>
                        <Caption style={{ 
                          color: backgroundColor, 
                          fontWeight: '600',
                          textAlign: 'center',
                          fontSize: 12
                        }}>
                          to {formatTime(classItem.endTime)}
                        </Caption>
                      </View>
                      <View style={styles.classModalTitleRow}>
                        <View style={styles.classNameSection}>
                          <H2 style={{ color: textColor }}>{classItem.name}</H2>
                          <Caption style={{ color: textSecondaryColor }}>
                            with {classItem.instructorName}
                          </Caption>
                          {classItem.room && (
                            <Caption style={{ color: textSecondaryColor }}>
                              📍 {classItem.room}
                            </Caption>
                          )}
                        </View>
                        <View style={styles.classModalBadges}>
                          {classItem.isBooked && (
                            <Chip 
                              style={[styles.statusChip, { backgroundColor: successColor }]}
                              textStyle={{ ...styles.statusChipText, color: backgroundColor }}
                              icon="check-circle"
                            >
                              Booked
                            </Chip>
                          )}
                          {classItem.waitlistPosition && (
                            <Chip 
                              style={[styles.statusChip, { backgroundColor: warningColor }]}
                              textStyle={{ ...styles.statusChipText, color: backgroundColor }}
                              icon="queue"
                            >
                              Waitlist #{classItem.waitlistPosition}
                            </Chip>
                          )}
                        </View>
                      </View>
                    </View>
                    {renderEnrollmentInfo(classItem.enrolled, classItem.capacity, isPast)}
                    <View style={styles.classModalActionsImproved}>
                      {renderBookingButton(classItem, canBook, isCancellable, isPast)}
                    </View>
                  </View>
                </Surface>
              );
            })
          )}
        </ScrollView>
      </View>
    </View>
  );
}

function ClassesView() {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { classes, isLoading: classesLoading } = useSelector((state: RootState) => state.classes);
  const { bookings, isLoading: bookingsLoading } = useSelector((state: RootState) => state.bookings);
  const { currentSubscription, isLoading: subscriptionLoading } = useSelector((state: RootState) => state.subscriptions);

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const surfaceColor = useThemeColor({}, 'surface');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const textMutedColor = useThemeColor({}, 'textMuted');
  const primaryColor = useThemeColor({}, 'primary');
  const accentColor = useThemeColor({}, 'accent');
  // Blue color that works well in both light and dark modes
  const availableColor = '#5B9BD5';
  const successColor = useThemeColor({}, 'success');
  const warningColor = useThemeColor({}, 'warning');
  const errorColor = useThemeColor({}, 'error');

  // State
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedDateClasses, setSelectedDateClasses] = useState<ClassItem[]>([]);
  const [dayClassesVisible, setDayClassesVisible] = useState(false);
  const [markedDates, setMarkedDates] = useState<any>({});
  const [refreshing, setRefreshing] = useState(false);
  const [userWaitlist, setUserWaitlist] = useState<any[]>([]);

  // Helper function to get today's date string
  const getTodayString = () => {
    const today = new Date();
    return today.getFullYear() + '-' + 
      String(today.getMonth() + 1).padStart(2, '0') + '-' + 
      String(today.getDate()).padStart(2, '0');
  };

  const [currentMonth, setCurrentMonth] = useState(getTodayString());

  // Helper function to get availability color with theme
  const getAvailabilityColor = (enrolled: number, capacity: number) => {
    const percentage = enrolled / capacity;
    if (percentage >= 1) return errorColor; // Full - Red
    if (percentage >= 0.8) return warningColor; // Nearly full - Orange
    return successColor; // Available - Green
  };

  // Helper function to render enrollment info with progress bar
  const renderEnrollmentInfo = (enrolled: number, capacity: number, isPast?: boolean) => {
    const spotsLeft = capacity - enrolled;
    const fillPercentage = (enrolled / capacity) * 100;
    const isNearlyFull = spotsLeft <= 2 && spotsLeft > 0;
    const isFull = spotsLeft <= 0;
    
    // Progress bar color based on availability
    const getProgressColor = () => {
      if (isFull) return errorColor;
      if (isNearlyFull) return warningColor;
      return successColor;
    };

    return (
      <View style={styles.enrollmentInfoContainer}>
        <View style={styles.enrollmentTextRow}>
          <Paragraph style={[styles.enrollmentText, { color: textColor }]}>
            {enrolled}/{capacity} enrolled
          </Paragraph>
          {!isPast && (
            <Caption style={{
              ...(isFull ? styles.fullClassText : styles.spotsLeftText),
              color: isFull ? errorColor : (isNearlyFull ? warningColor : successColor)
            }}>
              {isFull ? 'Class Full' : `${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left`}
            </Caption>
          )}
        </View>
        
        {/* Visual Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBarBackground, { backgroundColor: `${textMutedColor}30` }]}>
            <View 
              style={[
                styles.progressBarFill, 
                { 
                  backgroundColor: getProgressColor(),
                  width: `${Math.min(fillPercentage, 100)}%`
                }
              ]} 
            />
          </View>
        </View>
      </View>
    );
  };

  // Helper to check if class is bookable
  const isClassBookable = (classItem: ClassItem): boolean => {
    const now = new Date();
    const classDateTime = new Date(`${classItem.date}T${classItem.startTime}`);

    // Class is in the past
    if (now > classDateTime) {
      return false;
    }

    // Class is already booked
    if (classItem.isBooked) {
      return false;
    }

    // Booking cutoff (e.g., 15 minutes before class)
    const cutoffTime = new Date(classDateTime.getTime() - 15 * 60 * 1000);
    if (now > cutoffTime) {
      return false;
    }

    return true;
  };

  // Helper to check if date is in the past
  const isPastDate = (date: string): boolean => {
    const today = new Date();
    const todayString = today.getFullYear() + '-' + 
      String(today.getMonth() + 1).padStart(2, '0') + '-' + 
      String(today.getDate()).padStart(2, '0');
    return date < todayString;
  };

  // Helper to check if booking is cancellable
  const isBookingCancellable = (classItem: ClassItem): boolean => {
    if (!classItem.isBooked) return false;
    if (isPastDate(classItem.date)) return false;
    
    const today = new Date();
    const todayString = today.getFullYear() + '-' + 
      String(today.getMonth() + 1).padStart(2, '0') + '-' + 
      String(today.getDate()).padStart(2, '0');
      
    // If it's today, check the 2-hour rule
    if (classItem.date === todayString) {
      const [hours, minutes] = classItem.startTime.split(':').map(Number);
      const classDateTime = new Date();
      classDateTime.setHours(hours, minutes, 0, 0);
      
      const hoursUntilClass = (classDateTime.getTime() - new Date().getTime()) / (1000 * 60 * 60);
      
      return hoursUntilClass > 2;
    }
    
    return true;
  };

  // Effects
  useEffect(() => {
    loadData();
  }, [dispatch]);

  useEffect(() => {
    generateMarkedDates();
  }, [classes, bookings, userWaitlist]);

  // Add effect to refresh when app comes back to foreground
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        console.log('📱 App became active, refreshing classes data');
        loadData();
      }
    };

    // Listen for app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, []);

  // Add effect to log when view mode changes
  useEffect(() => {
    console.log(`🔄 View mode changed to: ${viewMode}`);
    if (viewMode === 'list') {
      const upcomingCount = getAllUpcomingClasses().length;
      console.log(`📋 List view: ${upcomingCount} upcoming classes`);
    }
  }, [viewMode, classes, bookings]);

  const loadData = async () => {
    try {
      await Promise.all([
        dispatch(fetchClasses({})),
        dispatch(fetchBookings({})),
        dispatch(fetchCurrentSubscription())
      ]);
      
      // Load user's waitlist
      if (user?.id) {
        const waitlistResponse = await bookingService.getUserWaitlist(user.id);
        if (waitlistResponse.success) {
          setUserWaitlist(waitlistResponse.data || []);
        }
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const generateMarkedDates = () => {
    const marked: any = {};
    const classesArray = Array.isArray(classes) ? classes : [];
    const bookingsArray = Array.isArray(bookings) ? bookings : [];
    
    // Get today for comparison
    const today = new Date();
    const todayString = today.getFullYear() + '-' + 
      String(today.getMonth() + 1).padStart(2, '0') + '-' + 
      String(today.getDate()).padStart(2, '0');
    
    console.log('📅 Generating marked dates for calendar');
    console.log(`📊 Total classes: ${classesArray.length}`);
    console.log(`📋 Total bookings: ${bookingsArray.length}`);
    
    classesArray.forEach((classItem: BackendClass) => {
      if (!classItem.date) return;
      
      const date = classItem.date;
      
      // Skip marking dates older than 30 days to keep calendar clean
      const classDate = new Date(date);
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);
      
      if (classDate < thirtyDaysAgo) {
        console.log(`⏰ Skipping old date: ${date} (${classItem.name})`);
        return;
      }
      
      const userBooking = bookingsArray.find((booking: any) => 
        booking.class_id === classItem.id && 
        ['confirmed', 'waitlist'].includes(booking.status)
      );
      
      if (!marked[date]) {
        marked[date] = { dots: [] };
      }
      
      // Different colors for past vs future dates
      let dotColor;
      const isPastDate = date < todayString;
      
      if (isPastDate) {
        // Gray dots for past dates
        dotColor = userBooking ? textMutedColor : textMutedColor;
      } else {
        // Normal colors for future dates
        if (userBooking) {
          dotColor = userBooking.status === 'confirmed' ? successColor : warningColor; // Green for booked, orange for waitlist
        } else if (classItem.enrolled >= classItem.capacity) {
          dotColor = errorColor; // Red for full classes
        } else {
          dotColor = availableColor; // Blue for available classes (good visibility in both modes)
        }
      }
      
      marked[date].dots.push({ color: dotColor });
      
      console.log(`📅 ${date}: ${classItem.name} - ${userBooking ? 'Booked' : 'Available'} ${isPastDate ? '(past)' : ''}`);
    });
    
    console.log(`📅 Total marked dates: ${Object.keys(marked).length}`);
    setMarkedDates(marked);
  };

  const getClassesForDate = (date: string): ClassItem[] => {
    const classesArray = Array.isArray(classes) ? classes : [];
    const bookingsArray = Array.isArray(bookings) ? bookings : [];
    
    console.log(`🗓️ Getting classes for date: ${date}`);
    
    const dayClasses = classesArray
      .filter((classItem: BackendClass) => {
        // Ensure consistent date comparison
        const classDate = classItem.date;
        const matches = classDate === date;
        if (matches) {
          console.log(`✅ Found class on ${date}: ${classItem.name}`);
        }
        return matches;
      })
      .map((classItem: BackendClass) => {
        const userBooking = bookingsArray.find((booking: any) => 
          booking.class_id === classItem.id && 
          ['confirmed', 'waitlist'].includes(booking.status)
        );
        
        // Check if user is on waitlist for this class
        const waitlistEntry = userWaitlist.find(w => w.class_id === classItem.id);
        
        return mapBackendClassToClassItem(classItem, userBooking, waitlistEntry);
      })
      .sort((a, b) => {
        if (!a.startTime || !b.startTime) return 0;
        return a.startTime.localeCompare(b.startTime);
      });
    
    console.log(`🗓️ Classes found for ${date}: ${dayClasses.length}`);
    return dayClasses;
  };

  const getAllUpcomingClasses = (): ClassItem[] => {
    if (!classes || classes.length === 0) return [];
    
    const allClasses: ClassItem[] = [];
    
    classes.forEach(cls => {
      const userBooking = bookings.find(booking => booking.class_id === cls.id);
      const waitlistEntry = userWaitlist.find(w => w.class_id === cls.id);
      const classItem = mapBackendClassToClassItem(cls, userBooking, waitlistEntry);
      
      const today = new Date();
      const todayString = today.getFullYear() + '-' + 
        String(today.getMonth() + 1).padStart(2, '0') + '-' + 
        String(today.getDate()).padStart(2, '0');
      
      // Only include future classes and today's classes that haven't passed
      if (classItem.date > todayString) {
        allClasses.push(classItem);
      } else if (classItem.date === todayString) {
        const [hours, minutes] = classItem.startTime.split(':').map(Number);
        const classDateTime = new Date();
        classDateTime.setHours(hours, minutes, 0, 0);
        
        if (new Date() <= classDateTime) {
          allClasses.push(classItem);
        }
      }
    });
    
    return allClasses.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.startTime.localeCompare(b.startTime);
    });
  };

  // Group classes by date for better organization
  const getGroupedUpcomingClasses = () => {
    const upcomingClasses = getAllUpcomingClasses();
    const grouped: { [key: string]: ClassItem[] } = {};
    
    upcomingClasses.forEach(classItem => {
      if (!grouped[classItem.date]) {
        grouped[classItem.date] = [];
      }
      grouped[classItem.date].push(classItem);
    });
    
    return grouped;
  };

  const formatDateHeader = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayString = today.getFullYear() + '-' + 
      String(today.getMonth() + 1).padStart(2, '0') + '-' + 
      String(today.getDate()).padStart(2, '0');
    const tomorrowString = tomorrow.getFullYear() + '-' + 
      String(tomorrow.getMonth() + 1).padStart(2, '0') + '-' + 
      String(tomorrow.getDate()).padStart(2, '0');
    
    if (dateString === todayString) {
      return 'Today';
    } else if (dateString === tomorrowString) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  };

  const handleDayPress = (day: any) => {
    const date = day.dateString;
    setSelectedDate(date);
    setSelectedDateClasses(getClassesForDate(date));
    setDayClassesVisible(true);
  };

  const handleBookClass = async (classId: number) => {
    const class_ = classes.find(c => c.id === classId);
    if (!class_) return;

    // Check if user has subscription
    if (!currentSubscription) {
      Alert.alert('Subscription Required', 'You need an active subscription plan to book classes. Please contact reception to purchase a plan.');
      return;
    }

    // Check if subscription is active
    if (currentSubscription.status !== 'active') {
      Alert.alert('Subscription Not Active', 'Your subscription is not active. Please contact reception for assistance.');
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
      `Book "${class_.name}" on ${new Date(class_.date).toLocaleDateString()} at ${class_.time}?\n\nRemaining classes after booking: ${remainingAfterBooking}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Book Class', 
          onPress: async () => {
            try {
              await dispatch(createBooking({ classId })).unwrap();
              Alert.alert('Success', 'Class booked successfully!');
              // Refresh data after successful booking
              await loadData();
            } catch (error) {
              Alert.alert('Booking Failed', error as string || 'Failed to book class');
            }
          }
        }
      ]
    );
  };

  const handleCancelBooking = async (bookingId: number) => {
    try {
      Alert.alert(
        'Cancel Booking',
        'Are you sure you want to cancel this booking?\n\nThis will refund 1 class to your subscription if cancelled more than 2 hours before the class starts.',
        [
          { text: 'Keep Booking', style: 'cancel' },
          { 
            text: 'Cancel Booking', 
            style: 'destructive',
            onPress: async () => {
              try {
                await dispatch(cancelBooking(bookingId)).unwrap();
                Alert.alert('Success', 'Booking cancelled successfully');
                // Refresh data to update UI
                await loadData();
              } catch (error) {
                Alert.alert('Error', error as string || 'Failed to cancel booking');
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
        await loadData();
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
                await loadData();
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
      case 'reformer': return 'fitness-center'; // Dumbbell icon - universally recognized for gym equipment
      case 'mat': return 'self-improvement'; // Self-improvement icon - better represents mat exercises
      case 'both': return 'sports'; // Sports icon - represents both equipment types
      default: return 'fitness-center';
    }
  };

  const getEquipmentLabel = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'reformer': return 'Reformer Equipment';
      case 'mat': return 'Mat Only';
      case 'both': return 'Mat + Reformer';
      default: return 'Equipment Required';
    }
  };

  const getEquipmentColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'reformer': return warningColor; // Orange for reformer
      case 'mat': return successColor; // Green for mat
      case 'both': return accentColor; // Blue for both
      default: return textSecondaryColor;
    }
  };

  const upcomingClasses = getAllUpcomingClasses();

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {/* Header */}
      <Surface style={[styles.headerImproved, { backgroundColor: surfaceColor, borderBottomWidth: 1, borderBottomColor: textMutedColor }]}>
        <View style={styles.headerContentVertical}>
          <H2 style={{ ...styles.headerTitle, color: textColor, fontWeight: 'bold', fontSize: 24, marginBottom: 16 }}>Classes</H2>
          
          <SegmentedButtons
            value={viewMode}
            onValueChange={(value) => setViewMode(value as 'calendar' | 'list')}
            buttons={[
              {
                value: 'calendar',
                label: 'Calendar',
                icon: 'calendar-month',
                style: viewMode === 'calendar' ? { 
                  ...styles.activeSegmentSofter, 
                  backgroundColor: `${accentColor}20`, 
                  borderColor: accentColor 
                } : { 
                  ...styles.inactiveSegment,
                  backgroundColor: 'transparent',
                  borderColor: textMutedColor
                }
              },
              {
                value: 'list',
                label: 'List',
                icon: 'format-list-bulleted',
                style: viewMode === 'list' ? { 
                  ...styles.activeSegmentSofter, 
                  backgroundColor: `${accentColor}20`, 
                  borderColor: accentColor 
                } : { 
                  ...styles.inactiveSegment,
                  backgroundColor: 'transparent',
                  borderColor: textMutedColor
                }
              }
            ]}
            style={[styles.segmentedButtonsImproved, { 
              backgroundColor: 'transparent'
            }]}
          />
        </View>

        {viewMode === 'list' && (
          <View style={[styles.listViewBannerImproved, { backgroundColor: `${accentColor}10`, borderColor: `${accentColor}30` }]}>
            <MaterialIcons name="format-list-bulleted" size={18} color={accentColor} />
            <Paragraph style={[styles.listViewBannerText, { color: textColor }]}>
              {`Showing ${getAllUpcomingClasses().length} upcoming classes`}
            </Paragraph>
          </View>
        )}

        {viewMode === 'calendar' && (
          <View style={[styles.legend, { borderTopColor: textMutedColor }]}>
            <Paragraph style={[styles.legendHeaderText, { color: textSecondaryColor }]}>
              Tap any date to view and book classes
            </Paragraph>
          </View>
        )}
      </Surface>

      {/* Content */}
      {viewMode === 'calendar' ? (
        <ScrollView 
          style={styles.calendarContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {(classesLoading || bookingsLoading) && (
            <View style={[styles.loadingOverlay, { backgroundColor: `${backgroundColor}CC` }]}>
              <ActivityIndicator size="large" color={accentColor} />
              <Paragraph style={[styles.loadingText, { color: textColor }]}>Loading classes...</Paragraph>
            </View>
          )}

          <Calendar
            current={currentMonth}
            onDayPress={handleDayPress}
            onMonthChange={(month: { dateString: string }) => {
              console.log(`📅 Calendar month changed to: ${month.dateString}`);
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
              selectedDayTextColor: backgroundColor,
              todayTextColor: primaryColor,
              todayBackgroundColor: `${primaryColor}08`,
              dayTextColor: textColor,
              textDisabledColor: textMutedColor,
              dotColor: primaryColor,
              selectedDotColor: backgroundColor,
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
              textDayHeaderFontSize: 12,
              agendaDayTextColor: textColor,
              agendaDayNumColor: primaryColor,
              agendaTodayColor: primaryColor,
              agendaKnobColor: primaryColor,
            }}
            style={styles.calendar}
            firstDay={1}
            hideExtraDays={true}
            showWeekNumbers={false}
            enableSwipeMonths={true}
          />

          {/* Enhanced Inline Legend */}
          <Surface style={[styles.calendarLegendInline, { backgroundColor: surfaceColor }]}>
            <Paragraph style={[styles.legendTitle, { color: textColor }]}>Class Status</Paragraph>
            <View style={styles.legendRowInline}>
              <View style={styles.legendItemInline}>
                <View style={[styles.legendDotLarge, { backgroundColor: availableColor }]} />
                <Paragraph style={[styles.legendTextInline, { color: textSecondaryColor }]}>Available</Paragraph>
              </View>
              <View style={styles.legendItemInline}>
                <View style={[styles.legendDotLarge, { backgroundColor: successColor }]} />
                <Paragraph style={[styles.legendTextInline, { color: textSecondaryColor }]}>Booked</Paragraph>
              </View>
              <View style={styles.legendItemInline}>
                <View style={[styles.legendDotLarge, { backgroundColor: warningColor }]} />
                <Paragraph style={[styles.legendTextInline, { color: textSecondaryColor }]}>Waitlist</Paragraph>
              </View>
              <View style={styles.legendItemInline}>
                <View style={[styles.legendDotLarge, { backgroundColor: errorColor }]} />
                <Paragraph style={[styles.legendTextInline, { color: textSecondaryColor }]}>Full</Paragraph>
              </View>
            </View>
          </Surface>
        </ScrollView>
      ) : (
        <ScrollView 
          style={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {upcomingClasses.length === 0 ? (
            <View style={styles.noClassesContainer}>
              <MaterialIcons name="event-busy" size={48} color={textMutedColor} />
              <Paragraph style={[styles.noClassesText, { color: textColor }]}>
                No upcoming classes available
              </Paragraph>
            </View>
          ) : (
            Object.entries(getGroupedUpcomingClasses()).map(([date, classesForDate]) => (
              <View key={date}>
                <View style={{...styles.dateHeaderContainer, backgroundColor: surfaceColor, borderBottomColor: textMutedColor}}>
                  <Paragraph style={{...styles.dateHeaderText, color: textColor}}>
                    {formatDateHeader(date)}
                  </Paragraph>
                </View>
                {classesForDate.map((classItem) => (
                  <Pressable
                    key={`${classItem.id}-${classItem.date}`}
                    onPressIn={() => {}}
                    onPressOut={() => {}}
                    style={({ pressed }) => [
                      styles.pressableCard,
                      pressed && styles.pressedCard
                    ]}
                  >
                    <Card style={[
                      styles.classCardImproved,
                      { backgroundColor: surfaceColor, borderColor: textMutedColor }
                    ]}>
                      <Card.Content style={styles.classCardContentImproved}>
                        <View style={styles.classCardHeader}>
                          <View style={styles.classCardInfo}>
                            <View style={styles.classCardTitleRow}>
                              <View style={styles.classCardLeft}>
                                <H2 style={{...styles.classCardName, color: textColor}} numberOfLines={1}>
                                  {classItem.name}
                                  {classItem.category === 'personal' && (
                                    <Caption style={{...styles.personalClassIndicator, color: warningColor}}> 👤 Personal</Caption>
                                  )}
                                </H2>
                                
                                <Caption style={{...styles.classCardTime, color: textSecondaryColor}}>
                                  {classItem.startTime} - {classItem.endTime}
                                </Caption>
                              </View>
                              
                              <View style={styles.equipmentBadgeContainer}>
                                <MaterialIcons 
                                  name={getEquipmentIcon(classItem.equipmentType)} 
                                  size={16} 
                                  color={getEquipmentColor(classItem.equipmentType)} 
                                  style={styles.equipmentIcon}
                                  accessibilityLabel={getEquipmentLabel(classItem.equipmentType)}
                                />
                                <Caption style={{ ...styles.equipmentLabel, color: textSecondaryColor }}>
                                  {getEquipmentLabel(classItem.equipmentType)}
                                </Caption>
                              </View>
                            </View>
                          </View>
                        </View>

                        <View style={{...styles.classCardDivider, backgroundColor: textMutedColor}} />

                        <View style={styles.classCardDetails}>
                          <View style={styles.classCardDetailRow}>
                            <MaterialIcons name="person" size={16} color={textSecondaryColor} />
                            <Paragraph style={{...styles.classCardDetailText, color: textSecondaryColor}}>
                              {classItem.instructorName}
                            </Paragraph>
                          </View>
                          <View style={styles.classCardDetailRow}>
                            <MaterialIcons name="schedule" size={16} color={textSecondaryColor} />
                            <Paragraph style={{...styles.classCardDetailText, color: textSecondaryColor}}>
                              {classItem.startTime} - {classItem.endTime}
                            </Paragraph>
                          </View>
                          {classItem.room && (
                            <View style={styles.classCardDetailRow}>
                              <MaterialIcons name="room" size={16} color={textSecondaryColor} />
                              <Paragraph style={{...styles.classCardDetailText, color: textSecondaryColor}}>
                                {classItem.room}
                              </Paragraph>
                            </View>
                          )}
                          <View style={styles.classCardDetailRow}>
                            <MaterialIcons name="people" size={16} color={textSecondaryColor} />
                            <Paragraph style={{...styles.classCardDetailText, color: textSecondaryColor}}>
                              {classItem.enrolled}/{classItem.capacity} enrolled
                            </Paragraph>
                          </View>

                          {/* Correct location for status chips */}
                          <View style={styles.statusChipsRow}>
                            <View style={styles.statusChipsContainer}>
                              {classItem.isBooked && (
                                <Chip 
                                  style={[styles.bookedChip, { backgroundColor: successColor }]}
                                  textStyle={{ ...styles.statusChipText, color: backgroundColor }}
                                  icon="check-circle"
                                  compact
                                >
                                  Booked
                                </Chip>
                              )}
                              
                              {classItem.waitlistPosition && (
                                <Chip 
                                  style={[styles.waitlistChip, { backgroundColor: warningColor, marginLeft: 4 }]}
                                  textStyle={{ ...styles.statusChipText, color: backgroundColor }}
                                  icon="queue"
                                  compact
                                >
                                  Waitlist #{classItem.waitlistPosition}
                                </Chip>
                              )}
                            </View>
                          </View>
                        </View>

                        <View style={styles.classCardFooterImproved}>
                          {renderEnrollmentInfo(classItem.enrolled, classItem.capacity)}
                          
                          <View style={styles.actionButtonsContainer}>
                            {classItem.isBooked ? (
                              <Button 
                                mode="contained" 
                                onPress={() => handleCancelBooking(classItem.bookingId!)}
                                style={[styles.actionButton, { backgroundColor: textMutedColor }]}
                                labelStyle={styles.cancelButtonLabel}
                                compact
                                accessibilityLabel={`Cancel booking for ${classItem.name} at ${classItem.startTime}`}
                                accessibilityHint="Double tap to cancel your booking for this class"
                              >
                                Cancel
                              </Button>
                            ) : (
                              <Button 
                                mode="contained" 
                                onPress={() => {
                                  if (classItem.enrolled >= classItem.capacity) {
                                    handleJoinWaitlist(classItem.id);
                                  } else {
                                    handleBookClass(classItem.id);
                                  }
                                }}
                                style={[styles.actionButton, { backgroundColor: isClassBookable(classItem) ? accentColor : textMutedColor }]}
                                labelStyle={styles.bookButtonLabel}
                                compact
                                accessibilityLabel={`${classItem.enrolled >= classItem.capacity ? 'Join waitlist for' : 'Book'} ${classItem.name} at ${classItem.startTime}`}
                                accessibilityHint={`Double tap to ${classItem.enrolled >= classItem.capacity ? 'join waitlist for' : 'book'} this class`}
                              >
                                {classItem.enrolled >= classItem.capacity ? 'Waitlist' : 'Book'}
                              </Button>
                            )}
                          </View>
                        </View>
                      </Card.Content>
                    </Card>
                  </Pressable>
                ))}
              </View>
            ))
          )}
        </ScrollView>
      )}

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

      {/* FAB positioned outside ScrollView for proper click handling */}
      <FAB
        icon={() => <MaterialIcons name="today" size={24} color={backgroundColor} />}
        label="Today"
        style={[styles.fab, { backgroundColor: accentColor }]}
        onPress={() => {
          const today = getTodayString();
          console.log(`📅 Today button pressed - navigating to: ${today}`);
          setCurrentMonth(today);
          setSelectedDate(today);
          setSelectedDateClasses(getClassesForDate(today)); // Update classes for today
          setDayClassesVisible(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Improved Header Styles
  headerImproved: {
    paddingTop: 45,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    elevation: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerContentVertical: {
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
  },
  // Improved Segmented Buttons
  segmentedButtonsImproved: {
    borderRadius: 25,
    borderWidth: 1,
  },
  activeSegmentSofter: {
    borderWidth: 1,
  },
  inactiveSegment: {
    backgroundColor: 'transparent',
  },
  // Improved List View Banner
  listViewBannerImproved: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 8,
  },
  listViewBannerText: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '500',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
  },
  legendHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  calendarContainer: {
    flex: 1,
    position: 'relative',
  },
  calendar: {
    marginHorizontal: 8,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 12,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    paddingBottom: 8,
  },
  listContainer: {
    flex: 1,
    padding: 15,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 10,
  },
  fab: {
    position: 'absolute',
    margin: spacing.sm,
    right: 10,
    bottom: 20, // Visible position above tab bar
    elevation: 8, // Higher elevation to ensurre it's clickable
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    zIndex: 1000, // Ensure it's above other elements
  },
  noClassesContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noClassesText: {
    marginTop: 10,
    textAlign: 'center',
  },
  // Improved Class Card Styles
  classCardImproved: {
    marginBottom: spacing.lg,
    elevation: 1,
    borderRadius: 20, // Increased from default for softer look
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    borderWidth: 1,
  },
  classCardContentImproved: {
    padding: 20,
  },
  classCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  classCardInfo: {
    flex: 1,
    paddingRight: 12,
  },
  classCardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  classCardLeft: {
    flex: 1,
    marginRight: 12,
  },
  classCardName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  classCardInstructor: {
    // color will be overridden by inline style
    fontSize: 14,
    marginBottom: 8,
  },
  classCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  classCardTime: {
    fontSize: 14,
    marginBottom: 8,
  },
  classCardBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  classCardDivider: {
    height: 1,
    // backgroundColor will be overridden by inline style
    marginVertical: 16,
  },
  classCardFooterImproved: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  // Improved Level Chip Styles
  levelChip: {
    height: 32,
    minWidth: 110,
    paddingHorizontal: 12,
    paddingVertical: 6,
    // backgroundColor will be overridden by inline style
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  chipText: {
    // color will be overridden by inline style based on theme
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.3,
    marginLeft: 4,
  },
  equipmentIcon: {
    marginBottom: 4,
  },
  equipmentIconContainer: {
    alignItems: 'center',
    marginLeft: 10,
  },
  equipmentBadgeContainer: {
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  equipmentLabel: {
    fontSize: 11,
  },
  // Simplified Enrollment Info Styles (replacing progress bar)
  enrollmentInfoContainer: {
    flex: 1,
    marginRight: 16,
    justifyContent: 'center',
  },
  enrollmentTextRow: {
    flexDirection: 'column',
    marginBottom: 8,
  },
  enrollmentText: {
    fontSize: 14,
    fontWeight: '600',
    // color will be overridden by inline style
    marginBottom: 2,
  },
  spotsLeftText: {
    fontSize: 12,
    fontWeight: '500',
    // color will be overridden by inline style
  },
  fullClassText: {
    fontSize: 12,
    fontWeight: '500',
    // color will be overridden by inline style
  },
  // Progress Bar Styles
  progressBarContainer: {
    marginTop: 4,
  },
  progressBarBackground: {
    height: 6,
    // backgroundColor will be overridden by inline style
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
    minWidth: 2,
  },
  // Improved Action Button Styles
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    elevation: 1,
    // shadowColor will be overridden by inline style
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    minWidth: 100,
  },
  bookButtonImproved: {
    // backgroundColor will be overridden by inline style
    // shadowColor will be overridden by inline style
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  bookButtonLabel: {
    // color will be overridden by inline style based on theme
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  // Softer Cancel Button
  cancelButtonSofter: {
    // backgroundColor will be overridden by inline style
    // shadowColor will be overridden by inline style
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  cancelButtonLabel: {
    // color will be overridden by inline style based on theme
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  disabledButton: {
    opacity: 0.5,
    // backgroundColor will be overridden by inline style
    elevation: 0,
    shadowOpacity: 0,
  },
  // Status Chip Styles
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusChipText: {
    // color will be overridden by inline style based on theme
    fontSize: 12,
    fontWeight: '600',
  },
  statusChipsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusChipsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    marginBottom: 4,
  },
  bookedChip: {
    borderRadius: 12,
    // backgroundColor will be overridden by inline style
  },
  waitlistChip: {
    borderRadius: 12,
    // backgroundColor will be overridden by inline style
  },
  // Modal Styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalSurface: {
    borderRadius: 16,
    padding: 18,
    width: '90%',
    maxWidth: 400,
    minHeight: 580,
    alignItems: 'stretch',
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalScrollContent: {
    flexGrow: 1,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '600',
    // color will be overridden by inline style
    flex: 1,
  },
  modalContent: {
    flex: 1,
  },
  // Improved Modal Item
  classModalItemImproved: {
    // backgroundColor will be overridden by inline style
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    // borderWidth and borderColor will be overridden by inline style
    // shadowColor, shadowOffset, etc. will be overridden by inline style
  },
  bookedClassItem: {
    // backgroundColor will be overridden by inline style
    // borderColor will be overridden by inline style
    borderWidth: 2,
    // shadowColor will be overridden by inline style
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  classModalHeader: {
    marginBottom: 0,
  },
  timeSection: {
    marginBottom: 12,
  },
  classModalTime: {
    fontSize: 32,
    fontWeight: '700',
    // color will be overridden by inline style
    marginBottom: 4,
  },
  duration: {
    fontSize: 14,
    // color will be overridden by inline style
    fontWeight: '500',
  },
  classModalDivider: {
    height: 1,
    // backgroundColor will be overridden by inline style
    marginVertical: 16,
  },
  classModalTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  classNameSection: {
    flex: 1,
    marginRight: 16,
  },
  classModalNameImproved: {
    fontSize: 20,
    fontWeight: '700',
    // color will be overridden by inline style
    marginBottom: 8,
    lineHeight: 26,
  },
  classMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  classTypeIcon: {
    marginRight: 6,
  },
  durationLighter: {
    fontSize: 13,
    // color will be overridden by inline style
    fontWeight: '400',
  },
  classModalBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    justifyContent: 'flex-end',
  },
  instructorImproved: {
    fontSize: 16,
    // color will be overridden by inline style
    marginBottom: 0,
    fontWeight: '500',
  },
  availabilityRowImproved: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  classModalActionsImproved: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    // borderTopColor will be overridden by inline style
  },
  pastDateChip: {
    // backgroundColor will be overridden by inline style
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    alignSelf: 'center',
  },
  pastDateChipText: {
    // color will be overridden by inline style based on theme
    fontSize: 11,
    fontWeight: '600',
  },
  pastClassItem: {
    // backgroundColor will be overridden by inline style
    // borderColor will be overridden by inline style
    opacity: 0.7,
  },
  pastText: {
    // color will be overridden by inline style
  },
  // Interactive Card Styles
  pressableCard: {
    marginBottom: 20,
  },
  pressedCard: {
    transform: [{ scale: 0.98 }],
    shadowOpacity: 0.15,
    elevation: 6,
  },
  // Icon Enhancement Styles
  chipIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tinyLevelIcon: {
    marginRight: 2,
    opacity: 0.9,
  },
  modalCardPressable: {
    marginBottom: 20,
  },
  modalCardPressed: {
    transform: [{ scale: 0.98 }],
    shadowOpacity: 0.15,
    elevation: 6,
  },
  // Enhanced Calendar Legend Styles
  calendarLegendInline: {
    // backgroundColor will be overridden by inline style
    marginHorizontal: 8,
    marginTop: 8,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 1,
    // shadowColor will be overridden by inline style
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    borderWidth: 1,
    // borderColor will be overridden by inline style
  },
  legendTitle: {
    fontSize: 13,
    fontWeight: '600',
    // color will be overridden by inline style
    marginBottom: 10,
    textAlign: 'center',
  },
  legendRowInline: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  legendItemInline: {
    alignItems: 'center',
    flex: 1,
  },
  legendDotLarge: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  legendTextInline: {
    fontSize: 11,
    // color will be overridden by inline style
    textAlign: 'center',
    fontWeight: '500',
  },
  closeButtonContainer: {
    padding: 10,
  },
  cancelButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cancelInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  cancelInfoText: {
    fontSize: 12,
    fontWeight: '500',
    // color will be overridden by inline style
  },
  classCardDetails: {
    marginBottom: 16,
  },
  classCardDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  classCardDetailText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    // color will be overridden by inline style
  },
  personalClassIndicator: {
    // color will be overridden by inline style
    fontSize: 12,
    fontWeight: '500',
  },
  dateHeaderContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    // backgroundColor will be overridden by inline style
    borderBottomWidth: 1,
    // borderBottomColor will be overridden by inline style
  },
  dateHeaderText: {
    fontSize: 18,
    fontWeight: '700',
    // color will be overridden by inline style
  },
  // New styles for DayClassesModal
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  classInfo: {
    paddingBottom: 16,
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  classDetails: {
    marginTop: 4,
  },
  classBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  equipmentChip: {
    height: 28,
    minWidth: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
  },

});

export default ClassesView; 