import { MaterialIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import {
    ActivityIndicator,
    Badge,
    Button,
    Card,
    Chip,
    FAB,
    Modal,
    Portal,
    Searchbar,
    SegmentedButtons,
    Surface,
} from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { Body, Caption, H1, H2, H3 } from '../../../components/ui/Typography';
import { layout, spacing } from '../../../constants/Spacing';
import { useThemeColor } from '../../../hooks/useThemeColor';
import { AppDispatch, RootState } from '../../store';
import { fetchBookings } from '../../store/bookingSlice';
import { fetchClasses } from '../../store/classSlice';
import { fetchCurrentSubscription } from '../../store/subscriptionSlice';
import { unifiedBookingUtils } from '../../utils/bookingUtils';
import { getResponsiveModalDimensions, getResponsiveSpacing } from '../../utils/responsiveUtils';

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

const { width: screenWidth } = Dimensions.get('window');
const isLargeScreen = screenWidth > 1024;

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
  bookingId?: number | string;
  status?: string;
}

function PCCalendarView() {
  const { t } = useTranslation();
  
  // Get responsive dimensions for modal
  const modalDimensions = getResponsiveModalDimensions('medium');
  const responsiveSpacing = getResponsiveSpacing(spacing.lg);
  
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
  
  const dispatch = useDispatch<AppDispatch>();
  const { bookings, isLoading: bookingsLoading } = useSelector((state: RootState) => state.bookings);
  const { classes, isLoading: classesLoading } = useSelector((state: RootState) => state.classes);
  const { currentSubscription } = useSelector((state: RootState) => state.subscriptions);
  
  const [viewMode, setViewMode] = useState<'month' | 'agenda'>('month');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [markedDates, setMarkedDates] = useState<any>({});
  const [filterLevel, setFilterLevel] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);

  // Helper function to get today's date string
  const getTodayString = () => {
    const today = new Date();
    return today.getFullYear() + '-' + 
      String(today.getMonth() + 1).padStart(2, '0') + '-' + 
      String(today.getDate()).padStart(2, '0');
  };

  useEffect(() => {
    loadCalendarData();
    dispatch(fetchCurrentSubscription());
  }, [dispatch]);

  useEffect(() => {
    generateMarkedDates();
  }, [classes, bookings, selectedDate, primaryColor, successColor, warningColor, errorColor, accentColor, availableColor]);

  const loadCalendarData = async () => {
    try {
      // Load all classes for clients (service will apply 2-month rule automatically)
      await Promise.all([
        dispatch(fetchClasses({ 
          userRole: 'client'
          // No date_from, date_to, or limit - let service handle client restrictions
        })), 
        dispatch(fetchBookings({}))
      ]);
    } catch (error) {
      console.error('Failed to load calendar data:', error);
    }
  };

  const generateMarkedDates = useCallback(() => {
    const marked: any = {};
    const classesArray = Array.isArray(classes) ? classes : [];
    const bookingsArray = Array.isArray(bookings) ? bookings : [];

    // console.log('🔍 [PCCalendar] Generating marked dates with', classesArray.length, 'classes');
    // console.log('🔍 [PCCalendar] September 2025 classes:', classesArray.filter((c: any) => c.date >= '2025-09-01' && c.date < '2025-10-01').length);

    classesArray.forEach((classItem: any) => {
      const date = classItem.date;
      if (!marked[date]) {
        marked[date] = { dots: [] };
      }
      
      const userBooking = bookingsArray.find((booking: any) => 
        booking.class_id === classItem.id && 
        ['confirmed', 'waitlist'].includes(booking.status)
      );
      
      let color = availableColor; // Blue for available classes (good visibility in both modes)
      
      // Check if it's a personal class first
      if (classItem.category === 'personal') {
        color = '#9B59B6'; // Purple for personal classes
      } else if (userBooking) {
        // Use distinctive colors for user's bookings that stand out clearly
        color = userBooking.status === 'confirmed' ? '#00C851' : '#FF8800'; // Bright green for confirmed, bright orange for waitlist
      } else if (classItem.enrolled >= classItem.capacity) {
        color = errorColor;
      }
      
      marked[date].dots.push({
        key: `class-${classItem.id}`,
        color: color,
        selectedDotColor: color
      });
    });

    if (selectedDate) {
      if (!marked[selectedDate]) {
        marked[selectedDate] = { dots: [] };
      }
      marked[selectedDate].selected = true;
      marked[selectedDate].selectedColor = accentColor;
    }

    setMarkedDates(marked);
  }, [classes, bookings, selectedDate, primaryColor, successColor, warningColor, errorColor, accentColor, availableColor]);

  const getClassesForDate = (date: string): ClassItem[] => {
    const classesArray = Array.isArray(classes) ? classes : [];
    const bookingsArray = Array.isArray(bookings) ? bookings : [];
    
    return classesArray
      .filter((classItem: any) => {
        const matchesDate = classItem.date === date;
        const matchesLevel = filterLevel === 'all' || classItem.level === filterLevel;
        const matchesSearch = searchQuery === '' || 
          classItem.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          classItem.instructorName?.toLowerCase().includes(searchQuery.toLowerCase());
        
        return matchesDate && matchesLevel && matchesSearch;
      })
      .map((classItem: any) => {
        const userBooking = bookingsArray.find((booking: any) => 
          booking.class_id === classItem.id && 
          ['confirmed', 'waitlist'].includes(booking.status)
        );
        
        return {
          id: classItem.id,
          name: classItem.name,
          date: classItem.date,
          startTime: classItem.startTime || classItem.time,
          endTime: classItem.endTime || classItem.time, // Use startTime instead of '00:00'
          instructorName: classItem.instructorName || classItem.instructor_name || 'TBD',
          level: classItem.level || 'All Levels',
          capacity: classItem.capacity,
          enrolled: classItem.enrolled || 0,
          equipmentType: classItem.equipmentType || classItem.equipment_type,
          isBooked: !!userBooking,
          bookingId: userBooking?.id,
          status: classItem.status
        };
      })
      .sort((a, b) => {
        if (!a.startTime || !b.startTime) return 0;
        return a.startTime.localeCompare(b.startTime);
      });
  };

  const handleBookClass = async (classItem: ClassItem) => {
    setSelectedClass(classItem);
    setShowBookingModal(true);
  };

  const confirmBooking = async () => {
    if (!selectedClass) return;
    
    // Check if user has a subscription
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
    const isPersonalClass = selectedClass.equipmentType === 'personal'; // Note: equipmentType might not be the right field
    
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
    
    if (!isEquipmentAccessAllowed(planEquipment, selectedClass.equipmentType)) {
      const accessMap = {
        'mat': 'Mat-only',
        'reformer': 'Reformer-only',
        'both': 'Full equipment'
      };
      
      Alert.alert(
        'Equipment Access Required',
        `This class requires ${accessMap[selectedClass.equipmentType] || selectedClass.equipmentType} access. Your subscription only includes ${accessMap[planEquipment] || planEquipment} access. Please upgrade your plan.`
      );
      return;
    }
    
    try {
      // Use unified booking utils for consistent behavior
      const success = await unifiedBookingUtils.bookClass(selectedClass.id, currentSubscription);
      if (success) {
        Alert.alert('Success', `Booking confirmed for ${selectedClass.name}`);
        await loadCalendarData();
        setShowBookingModal(false);
        setSelectedClass(null);
      }
    } catch (error: any) {
      Alert.alert('Booking Failed', error || 'Failed to book class');
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

  if (classesLoading || bookingsLoading) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor }]}>
        <ActivityIndicator size="large" color={accentColor} />
        <Body style={{ ...styles.loadingText, color: textSecondaryColor }}>Loading calendar...</Body>
      </View>
    );
  }

  const dayClasses = getClassesForDate(selectedDate);

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Surface style={[styles.header, { backgroundColor: primaryColor }]}>
        <View style={styles.headerContent}>
          <H1 style={{ ...styles.headerTitle, color: 'white' }}>Class Calendar</H1>
          
          <View style={styles.headerControls}>
            <Searchbar
              placeholder="Search classes..."
              onChangeText={setSearchQuery}
              value={searchQuery}
              style={[styles.searchbar, { backgroundColor: surfaceColor }]}
            />
            
            <SegmentedButtons
              value={filterLevel}
              onValueChange={setFilterLevel}
              buttons={[
                { value: 'all', label: 'All' },
                { value: 'Beginner', label: 'Beginner' },
                { value: 'Intermediate', label: 'Intermediate' },
                { value: 'Advanced', label: 'Advanced' },
              ]}
              style={[styles.levelFilter, { backgroundColor: surfaceColor }]}
            />
          </View>
        </View>
      </Surface>

      <View style={styles.content}>
        <View style={[styles.calendarContainer, { borderColor: textMutedColor }]}>
          <Calendar
            current={selectedDate}
            onDayPress={(day: { dateString: string }) => setSelectedDate(day.dateString)}
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
              textSectionTitleColor: textColor,
              selectedDayBackgroundColor: accentColor,
              selectedDayTextColor: backgroundColor,
              todayTextColor: '#FFFFFF',
              todayBackgroundColor: accentColor,
              dayTextColor: textColor,
              textDisabledColor: textMutedColor,
              dotColor: primaryColor,
              selectedDotColor: '#FFFFFF',
              arrowColor: textColor,
              disabledArrowColor: textMutedColor,
              monthTextColor: textColor,
              textDayFontFamily: 'System',
              textMonthFontFamily: 'System',
              textDayHeaderFontFamily: 'System',
              textDayFontWeight: '400',
              textMonthFontWeight: '700',
              textDayHeaderFontWeight: '600',
              textDayFontSize: 16,
              textMonthFontSize: 20,
              textDayHeaderFontSize: 13
            }}
            style={styles.calendar}
          />
        </View>
        
        <View style={styles.classesContainer}>
          <View style={[styles.classesHeader, { borderBottomColor: textMutedColor }]}>
            <H2 style={{ ...styles.classesTitle, color: textColor }}>
              {new Date(selectedDate).toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric' 
              })}
            </H2>
            <Caption style={{ ...styles.classesCount, color: textSecondaryColor }}>
              {`${dayClasses.length} ${dayClasses.length === 1 ? t('classes.class') : t('classes.classes')}`}
            </Caption>
          </View>
          
          <ScrollView 
            style={styles.classesList}
            showsVerticalScrollIndicator={true}
            contentContainerStyle={styles.classesListContainer}
            nestedScrollEnabled={true}
          >
            {dayClasses.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons name="event-note" size={48} color={textMutedColor} />
                <Body style={{ ...styles.emptyStateText, color: textSecondaryColor }}>No classes available</Body>
              </View>
            ) : (
              dayClasses.map((classItem) => (
                <Card key={classItem.id} style={[styles.classCard, { backgroundColor: surfaceColor }]}>
                  <Card.Content style={styles.classCardContent}>
                    <View style={styles.classCardHeader}>
                      <View style={styles.timeSection}>
                        <H3 style={{ ...styles.classTime, color: accentColor }}>{formatTime(classItem.startTime)}</H3>
                      </View>
                      
                      <View style={styles.classDetails}>
                        <H3 style={{ ...styles.className, color: textColor }}>{classItem.name}</H3>
                        <Body style={{ ...styles.instructorName, color: textSecondaryColor }}>with {classItem.instructorName}</Body>
                        
                        <View style={styles.classMetrics}>
                          <Chip
                            style={[styles.levelChip, { backgroundColor: getLevelColor(classItem.level) }]}
                            textStyle={{ ...styles.chipText, color: backgroundColor }}
                            compact
                          >
                            {classItem.level}
                          </Chip>
                          
                          <Badge style={[styles.availabilityBadge, { backgroundColor: accentColor }]}>
                            {`${classItem.enrolled}/${classItem.capacity}`}
                          </Badge>
                          
                          {classItem.isBooked && (
                            <Chip
                              icon="check-circle"
                              style={[styles.bookedChip, { backgroundColor: successColor }]}
                              textStyle={{ ...styles.bookedChipText, color: backgroundColor }}
                              compact
                            >
                              Booked
                            </Chip>
                          )}
                        </View>
                      </View>
                      
                      <View style={styles.classActions}>
                        {classItem.isBooked ? (
                          <Button
                            mode="outlined"
                            onPress={() => {}}
                            style={[styles.cancelButton, { borderColor: errorColor }]}
                            textColor={errorColor}
                            compact
                          >
                            Cancel
                          </Button>
                        ) : (
                          <Button
                            mode="contained"
                            onPress={() => handleBookClass(classItem)}
                            style={[styles.bookButton, { backgroundColor: accentColor }]}
                            labelStyle={{ color: backgroundColor }}
                            disabled={classItem.enrolled >= classItem.capacity}
                            compact
                          >
                            {classItem.enrolled >= classItem.capacity ? t('classes.classFull') : t('classes.bookClass')}
                          </Button>
                        )}
                      </View>
                    </View>
                  </Card.Content>
                </Card>
              ))
            )}
          </ScrollView>
        </View>
      </View>

      <Portal>
        <Modal
          visible={showBookingModal}
          onDismiss={() => setShowBookingModal(false)}
          contentContainerStyle={[styles.modalContainer, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
        >
          {selectedClass && (
            <Surface style={[
              styles.modalSurface, 
              { 
                backgroundColor: surfaceColor,
                width: modalDimensions.width,
                maxWidth: modalDimensions.maxWidth,
                padding: modalDimensions.padding,
                margin: modalDimensions.margin
              }
            ]}>
              <H2 style={{ ...styles.modalTitle, color: textColor }}>Confirm Booking</H2>
              
              <View style={styles.modalClassInfo}>
                <H3 style={{ ...styles.modalClassName, color: textColor }}>{selectedClass.name}</H3>
                <Body style={{ ...styles.modalInstructor, color: textSecondaryColor }}>with {selectedClass.instructorName}</Body>
                <Body style={{ ...styles.modalDateTime, color: textSecondaryColor }}>
                  {new Date(selectedClass.date).toLocaleDateString()} at {formatTime(selectedClass.startTime)}
                </Body>
              </View>
              
              <View style={styles.modalActions}>
                <Button
                  mode="outlined"
                  onPress={() => setShowBookingModal(false)}
                  style={[styles.modalCancelButton, { borderColor: textMutedColor }]}
                  textColor={textColor}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={confirmBooking}
                  style={[styles.modalConfirmButton, { backgroundColor: accentColor }]}
                  labelStyle={{ color: backgroundColor }}
                >
                  Confirm
                </Button>
              </View>
            </Surface>
          )}
        </Modal>
      </Portal>

      {/* FAB positioned outside ScrollView for proper click handling */}
      <FAB
        icon={() => <MaterialIcons name="today" size={24} color={backgroundColor} />}
        label="Today"
        style={[styles.fab, { backgroundColor: accentColor }]}
        onPress={() => {
          const today = getTodayString();
          console.log(`📅 Today button pressed - navigating to: ${today}`);
          setSelectedDate(today);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
  },
  header: {
    padding: spacing.lg,
    paddingTop: 60,
    elevation: 2,
  },
  headerContent: {
    flexDirection: isLargeScreen ? 'row' : 'column',
    justifyContent: 'space-between',
    alignItems: isLargeScreen ? 'center' : 'stretch',
    gap: spacing.md,
  },
  headerTitle: {},
  headerControls: {
    flexDirection: isLargeScreen ? 'row' : 'column',
    alignItems: isLargeScreen ? 'center' : 'stretch',
    gap: spacing.md,
  },
  searchbar: {
    minWidth: isLargeScreen ? 300 : 'auto',
  },
  levelFilter: {
    minWidth: isLargeScreen ? 300 : 'auto',
  },
  content: {
    flex: 1,
    flexDirection: isLargeScreen ? 'row' : 'column',
  },
  calendarContainer: {
    flex: isLargeScreen ? 0.4 : 1,
    borderRightWidth: isLargeScreen ? 1 : 0,
    borderBottomWidth: isLargeScreen ? 0 : 1,
    padding: spacing.md,
  },
  calendar: {
    borderRadius: layout.borderRadius,
  },
  classesContainer: {
    flex: isLargeScreen ? 0.6 : 1,
    padding: spacing.md,
  },
  classesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  classesTitle: {},
  classesCount: {},
  classesList: {
    flex: 1,
  },
  classesListContainer: {
    paddingBottom: spacing.lg,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyStateText: {
    textAlign: 'center',
  },
  classCard: {
    marginBottom: spacing.md,
    elevation: 1,
    borderRadius: layout.borderRadius,
  },
  classCardContent: {
    padding: spacing.md,
  },
  classCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  timeSection: {
    alignItems: 'center',
    minWidth: 80,
  },
  classTime: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  classDetails: {
    flex: 1,
  },
  className: {
    marginBottom: spacing.xs,
  },
  instructorName: {
    marginBottom: spacing.sm,
  },
  classMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  levelChip: {
    borderRadius: 12,
  },
  chipText: {
    fontSize: 12,
  },
  availabilityBadge: {
    borderRadius: 12,
  },
  bookedChip: {
    borderRadius: 12,
  },
  bookedChipText: {
    // color will be overridden by inline style based on theme
    fontSize: 12,
    fontWeight: '600',
  },
  classActions: {
    justifyContent: 'center',
    minWidth: 80,
  },
  bookButton: {
    borderRadius: 16,
  },
  cancelButton: {
    borderRadius: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSurface: {
    borderRadius: layout.borderRadius,
    alignSelf: 'center',
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  modalClassInfo: {
    marginBottom: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  modalClassName: {
    textAlign: 'center',
  },
  modalInstructor: {
    textAlign: 'center',
  },
  modalDateTime: {
    textAlign: 'center',
    fontWeight: 'bold',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  modalCancelButton: {
    flex: 1,
  },
  modalConfirmButton: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    margin: spacing.sm,
    right: 10,
    bottom: 20, // Visible position above tab bar
    elevation: 8, // Higher elevation to ensure it's clickable
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    zIndex: 1000, // Ensure it's above other elements
  },
});

export default PCCalendarView; 