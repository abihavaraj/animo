import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Badge, Button, Card, Chip, Searchbar, SegmentedButtons } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { Body, Caption, H1, H2 } from '../../../components/ui/Typography';
import { useThemeColor } from '../../../hooks/useThemeColor';
import { BackendClass } from '../../services/classService';
import { AppDispatch, RootState } from '../../store';
import { createBooking, fetchBookings, fetchUserWaitlist, joinWaitlist } from '../../store/bookingSlice';
import { fetchClasses } from '../../store/classSlice';
import { fetchCurrentSubscription } from '../../store/subscriptionSlice';

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

// Helper to check if can join waitlist (same 2-hour rule as cancellation)
const canJoinWaitlistCheck = (classDate: string, classTime: string): boolean => {
  const now = new Date();
  const classDateTime = new Date(`${classDate}T${classTime}`);
  
  // Class is in the past
  if (now > classDateTime) {
    return false;
  }
  
  // Check 2-hour rule
  const hoursUntilClass = (classDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  return hoursUntilClass >= 2;
};

function ClassBooking() {
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
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  
  const dispatch = useDispatch<AppDispatch>();
  const { classes, isLoading: classesLoading } = useSelector((state: RootState) => state.classes);
  const { currentSubscription, isLoading: subscriptionLoading } = useSelector((state: RootState) => state.subscriptions);
  const { isLoading: bookingLoading, waitlist, bookings, isWaitlistLoading } = useSelector((state: RootState) => state.bookings);

  useEffect(() => {
    // Load all classes for clients (service will apply 2-month rule automatically)
    dispatch(fetchClasses({ 
      userRole: 'client'
      // No date_from, date_to, or limit - let service handle client restrictions
    }));
    dispatch(fetchCurrentSubscription());
    dispatch(fetchUserWaitlist());
    dispatch(fetchBookings({ status: 'confirmed' })); // Only fetch confirmed bookings
  }, [dispatch]);

  useFocusEffect(
    useCallback(() => {
      dispatch(fetchCurrentSubscription());
    }, [dispatch])
  );

  // Ensure classes is always an array to prevent filter errors
  const availableClasses = Array.isArray(classes) ? classes : [];
  
  // Ensure waitlist is always an array to prevent .some() errors
  const availableWaitlist = Array.isArray(waitlist) ? waitlist : [];
  
  // Ensure bookings is always an array
  const userBookings = Array.isArray(bookings) ? bookings : [];

  const filteredClasses = availableClasses.filter(class_ => {
    // Filter out past classes
    const now = new Date();
    const classDateTime = new Date(`${class_.date} ${class_.time}`);
    if (classDateTime <= now) {
      return false; // Don't show past classes
    }

    const matchesSearch = class_.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         class_.instructor_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (selectedFilter === 'all') return matchesSearch;
    if (selectedFilter === 'today') {
      const today = new Date().toISOString().split('T')[0];
      return matchesSearch && class_.date === today;
    }
    if (selectedFilter === 'available') return matchesSearch && (class_.capacity - class_.enrolled) > 0;
    if (selectedFilter === 'mat') return matchesSearch && (class_.equipment_type === 'mat' || class_.equipment_type === 'both');
    if (selectedFilter === 'reformer') return matchesSearch && (class_.equipment_type === 'reformer' || class_.equipment_type === 'both');
    
    return matchesSearch && class_.level?.toLowerCase() === selectedFilter;
  });

  // Helper function to check if user has already booked a class
  const isAlreadyBooked = (classId: number | string) => {
    return userBookings.some(booking => {
      const bookingClassId = booking.class_id;
      return String(bookingClassId) === String(classId) && ['confirmed', 'waitlist'].includes(booking.status);
    });
  };

  // Helper function to get booking for a class
  const getBookingForClass = (classId: number | string) => {
    return userBookings.find(booking => {
      const bookingClassId = booking.class_id;
      return String(bookingClassId) === String(classId) && ['confirmed', 'waitlist'].includes(booking.status);
    });
  };

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'beginner': return successColor;
      case 'intermediate': return warningColor;
      case 'advanced': return errorColor;
      default: return textSecondaryColor;
    }
  };

  const getEquipmentTypeColor = (equipmentType: string) => {
    switch (equipmentType) {
      case 'mat': return successColor;
      case 'reformer': return warningColor;
      case 'both': return accentColor;
      default: return textSecondaryColor;
    }
  };

  const getAvailabilityColor = (available: number, total: number) => {
    const ratio = available / total;
    if (ratio > 0.5) return successColor;
    if (ratio > 0.2) return warningColor;
    return errorColor;
  };

  const canBookClass = (class_: BackendClass) => {
    // Check if user has already booked this class
    if (isAlreadyBooked(class_.id)) {
      return { canBook: false, reason: 'Already booked', isBooked: true };
    }

    // Check if user has a subscription
    if (!currentSubscription) {
      return { canBook: false, reason: 'No active subscription' };
    }

    // Check if subscription is active
    if (currentSubscription.status !== 'active') {
      return { canBook: false, reason: 'Subscription is not active' };
    }

    // Check if user has remaining classes (unless unlimited)
    const monthlyClasses = currentSubscription.monthly_classes || currentSubscription.plan?.monthly_classes || 0;
    const remainingClasses = currentSubscription.remaining_classes || currentSubscription.remainingClasses || 0;
    const isUnlimited = monthlyClasses >= 999;
    if (!isUnlimited && remainingClasses <= 0) {
      return { canBook: false, reason: 'No remaining classes in subscription' };
    }

    // Check personal subscription restrictions
    const subscriptionCategory = currentSubscription.category || currentSubscription.plan?.category;
    const isPersonalSubscription = subscriptionCategory === 'personal';
    const isPersonalClass = class_.category === 'personal';

    if (isPersonalSubscription && !isPersonalClass) {
      return { canBook: false, reason: 'Your personal subscription only allows booking personal/private classes. Please choose a personal training session.' };
    }

    if (!isPersonalSubscription && isPersonalClass) {
      return { canBook: false, reason: 'This is a personal training session. You need a personal subscription to book this class.' };
    }

    // Check equipment access
    const planEquipment = currentSubscription.equipment_access || currentSubscription.plan?.equipment_access;
    
    // Use the same logic as the backend validation
    if (!isEquipmentAccessAllowed(planEquipment, class_.equipment_type)) {
      const accessMap = {
        'mat': 'Mat-only',
        'reformer': 'Reformer-only',
        'both': 'Full equipment'
      };
      
      return { 
        canBook: false, 
        reason: `Equipment access required: This class requires ${accessMap[class_.equipment_type] || class_.equipment_type} access. Your subscription only includes ${accessMap[planEquipment] || planEquipment} access.`
      };
    }

    // Check availability
    const spotsAvailable = class_.capacity - class_.enrolled;
    if (spotsAvailable <= 0) {
      const waitlistAvailable = canJoinWaitlistCheck(class_.date, class_.time);
      return { 
        canBook: false, 
        reason: waitlistAvailable ? 'Class is full' : 'Class is full and waitlist is closed (less than 2 hours before start)', 
        waitlistAvailable 
      };
    }

    return { canBook: true, reason: '' };
  };

  const handleBookClass = async (classId: number | string) => {
    const class_ = classes.find(c => String(c.id) === String(classId));
    if (!class_) return;

    // Double-check if already booked before making API call
    if (isAlreadyBooked(classId)) {
      Alert.alert('Already Booked', 'You have already booked this class. Check your booking history for details.');
      return;
    }

    const bookingCheck = canBookClass(class_);
    
    if (!bookingCheck.canBook) {
      Alert.alert('Cannot Book Class', bookingCheck.reason);
      return;
    }

    const remainingAfterBooking = ((currentSubscription?.monthly_classes || currentSubscription?.plan?.monthly_classes || 0) >= 999)
      ? 'unlimited' 
      : (currentSubscription?.remaining_classes || currentSubscription?.remainingClasses || 0) - 1;

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
              Alert.alert(
                'Booking Confirmed!',
                `You have successfully booked "${class_.name}".`
              );
              // Refresh data
              dispatch(fetchClasses({ 
                userRole: 'client'
                // No limits - service handles client restrictions automatically
              }));
              dispatch(fetchCurrentSubscription());
              dispatch(fetchBookings({ status: 'confirmed' })); // Refresh bookings
            } catch (error) {
              // Handle specific error messages
              const errorMessage = error as string;
              if (errorMessage.includes('already booked')) {
                Alert.alert('Already Booked', 'You have already booked this class. Refreshing your booking list...');
                // Refresh bookings to update UI
                dispatch(fetchBookings({ status: 'confirmed' }));
              } else if (errorMessage.includes('past class')) {
                Alert.alert('Cannot Book Past Class', 'This class has already started or passed.');
                // Refresh classes to update the list
                dispatch(fetchClasses({ 
                userRole: 'client'
                // No limits - service handles client restrictions automatically
              }));
              } else {
                Alert.alert('Booking Failed', errorMessage);
              }
            }
          }
        }
      ]
    );
  };

  const handleJoinWaitlist = async (classId: number | string) => {
    const class_ = classes.find(c => String(c.id) === String(classId));
    if (!class_) return;

    Alert.alert(
      'Join Waitlist',
      `Join the waitlist for "${class_.name}" on ${new Date(class_.date).toLocaleDateString()} at ${class_.time}?

You&apos;ll be notified if a spot becomes available.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Join Waitlist', 
          onPress: async () => {
            try {
              const result = await dispatch(joinWaitlist({ classId })).unwrap();
              Alert.alert(
                'Added to Waitlist!',
                `You are #${result.position} on the waitlist for "${class_.name}".`
              );
              // Refresh data
              dispatch(fetchClasses({ 
                userRole: 'client'
                // No limits - service handles client restrictions automatically
              }));
              dispatch(fetchUserWaitlist());
            } catch (error) {
              Alert.alert('Failed to Join Waitlist', error as string);
            }
          }
        }
      ]
    );
  };

  const isOnWaitlist = (classId: number | string) => {
    return availableWaitlist.some(w => String(w.classId) === String(classId));
  };

  const getWaitlistPosition = (classId: number | string) => {
    const entry = availableWaitlist.find(w => String(w.classId) === String(classId));
    return entry?.position || 0;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    }
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    
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
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={[styles.header, { backgroundColor: surfaceColor, borderBottomColor: textMutedColor }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerText}>
            <H1 style={{ ...styles.headerTitle, color: textColor }}>Book a Class</H1>
            {currentSubscription && (
              <Body style={{ ...styles.headerSubtitle, color: textSecondaryColor }}>
                {((currentSubscription.monthly_classes || currentSubscription.plan?.monthly_classes || 0) >= 999)
                  ? 'Unlimited classes' 
                  : `${currentSubscription.remaining_classes || currentSubscription.remainingClasses || 0} classes remaining this month`}
              </Body>
            )}
          </View>
          <Button
            mode="outlined"
            icon="history"
            onPress={() => {
              // Navigate to booking history - this would need proper navigation setup
              // For now, we'll show a placeholder
              Alert.alert('Navigation', 'Go to Booking History tab to view your bookings');
            }}
            style={[styles.historyButton, { borderColor: accentColor }]}
            textColor={accentColor}
            compact
          >
            My Bookings
          </Button>
        </View>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: surfaceColor }]}>
        <Searchbar
          placeholder="Search classes or instructors..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={[styles.searchBar, { backgroundColor }]}
        />
      </View>

      <View style={[styles.filterContainer, { backgroundColor: surfaceColor, borderBottomColor: textMutedColor }]}>
        <SegmentedButtons
          value={selectedFilter}
          onValueChange={setSelectedFilter}
          buttons={[
            { value: 'all', label: 'All' },
            { value: 'today', label: 'Today' },
            { value: 'available', label: 'Available' },
            { value: 'mat', label: 'Mat' },
            { value: 'reformer', label: 'Reformer' },
          ]}
          style={styles.segmentedButtons}
        />
      </View>

      <ScrollView style={styles.classList} showsVerticalScrollIndicator={false}>
        {classesLoading || subscriptionLoading ? (
          <View style={styles.loadingContainer}>
            <Body style={{ color: textColor }}>Loading classes...</Body>
          </View>
        ) : filteredClasses.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Body style={{ color: textColor }}>No classes found matching your criteria.</Body>
          </View>
        ) : (
          filteredClasses.map((class_) => {
            const spotsAvailable = class_.capacity - class_.enrolled;
            const bookingCheck = canBookClass(class_);
            
            return (
              <Card key={class_.id} style={[styles.classCard, { backgroundColor: surfaceColor }]}>
                <Card.Content>
                  <View style={styles.classHeader}>
                    <View style={styles.classInfo}>
                      <H2 style={{ ...styles.className, color: textColor }}>{class_.name}</H2>
                      <Body style={{ ...styles.instructor, color: textSecondaryColor }}>
                        <MaterialIcons name="person" size={16} color={textSecondaryColor} />
                        {class_.instructor_name}
                      </Body>
                      {class_.room && (
                        <Body style={{ ...styles.instructor, color: textSecondaryColor }}>
                          <MaterialIcons name="room" size={16} color={textSecondaryColor} />
                          {class_.room}
                        </Body>
                      )}
                    </View>
                    <View style={styles.classTime}>
                      <Body style={{ ...styles.date, color: textColor }}>{formatDate(class_.date)}</Body>
                      <Body style={{ ...styles.time, color: textColor }}>{formatTime(class_.time)}</Body>
                      <Caption style={{ ...styles.duration, color: textSecondaryColor }}>{`${class_.duration} min`}</Caption>
                    </View>
                  </View>

                  <View style={styles.classDetails}>
                    <View style={styles.chips}>
                      <Chip 
                        style={[styles.chip, { backgroundColor: getEquipmentTypeColor(class_.equipment_type) }]}
                        textStyle={{ ...styles.chipText, color: backgroundColor }}
                      >
                        {class_.equipment_type.charAt(0).toUpperCase() + class_.equipment_type.slice(1)}
                      </Chip>
                    </View>

                    <View style={styles.availability}>
                      <Badge 
                        style={[
                          styles.availabilityBadge, 
                          { backgroundColor: getAvailabilityColor(spotsAvailable, class_.capacity) }
                        ]}
                      >
                        {`${class_.enrolled}/${class_.capacity} enrolled`}
                      </Badge>
                    </View>
                  </View>

                  <Body style={{ ...styles.description, color: textSecondaryColor }}>{class_.description}</Body>

                  {bookingCheck.canBook ? (
                    <Button
                      mode="contained"
                      onPress={() => handleBookClass(class_.id)}
                      style={[styles.bookButton, { backgroundColor: accentColor }]}
                      labelStyle={{ color: backgroundColor }}
                      disabled={bookingLoading}
                      loading={bookingLoading}
                    >
                      Book Class
                    </Button>
                  ) : bookingCheck.isBooked ? (
                    <View style={styles.buttonContainer}>
                      <Button
                        mode="outlined"
                        style={[styles.bookButton, styles.bookedButton, { borderColor: successColor }]}
                        textColor={successColor}
                        disabled
                        icon="check-circle"
                      >
                        Already Booked
                      </Button>
                      <Caption style={{ ...styles.bookedInfo, color: textSecondaryColor }}>
                        You have booked this class. Check &apos;My Bookings&apos; for details.
                      </Caption>
                    </View>
                  ) : bookingCheck.waitlistAvailable && !isOnWaitlist(class_.id) ? (
                    <View style={styles.buttonContainer}>
                      <Button
                        mode="outlined"
                        onPress={() => handleJoinWaitlist(class_.id)}
                        style={[styles.bookButton, styles.waitlistButton, { borderColor: warningColor }]}
                        textColor={warningColor}
                        disabled={isWaitlistLoading}
                        loading={isWaitlistLoading}
                        icon="access-time"
                      >
                        Join Waitlist
                      </Button>
                      <Caption style={{ ...styles.waitlistInfo, color: textSecondaryColor }}>
                        Class is full. Join waitlist to be notified if a spot opens up.
                      </Caption>
                    </View>
                  ) : isOnWaitlist(class_.id) ? (
                    <View style={styles.buttonContainer}>
                      <Button
                        mode="outlined"
                        style={[styles.bookButton, styles.waitlistedButton, { borderColor: primaryColor }]}
                        textColor={primaryColor}
                        disabled
                        icon="check-circle"
                      >
                        On Waitlist (#{getWaitlistPosition(class_.id)})
                      </Button>
                      <Caption style={{ ...styles.waitlistInfo, color: textSecondaryColor }}>
                        You&apos;re #{getWaitlistPosition(class_.id)} on the waitlist. You&apos;ll be notified if a spot opens up.
                      </Caption>
                    </View>
                  ) : (
                    <Button
                      mode="outlined"
                      style={[styles.bookButton, styles.disabledButton, { borderColor: textMutedColor }]}
                      textColor={textMutedColor}
                      disabled
                    >
                      {bookingCheck.reason}
                    </Button>
                  )}
                </Card.Content>
              </Card>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingTop: 60,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    marginBottom: 4,
  },
  headerSubtitle: {
  },
  searchContainer: {
    padding: 16,
  },
  searchBar: {
    elevation: 0,
    borderRadius: 16,
  },
  filterContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent', // This will be handled by textMutedColor
  },
  segmentedButtons: {
    backgroundColor: 'transparent',
  },
  classList: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  classCard: {
    marginBottom: 16,
    borderRadius: 16,
    elevation: 1,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  classInfo: {
    flex: 1,
    marginRight: 16,
  },
  className: {
    marginBottom: 4,
  },
  instructor: {
    color: 'transparent', // This will be handled by textSecondaryColor
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  classTime: {
    alignItems: 'flex-end',
  },
  date: {
    color: 'transparent', // This will be handled by textColor
  },
  time: {
    color: 'transparent', // This will be handled by textColor
  },
  duration: {
    color: 'transparent', // This will be handled by textSecondaryColor
  },
  classDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  chips: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    borderRadius: 12,
  },
  chipText: {
    // color will be overridden by inline style based on theme
    fontSize: 12,
    fontWeight: '600',
  },
  availability: {
    alignItems: 'flex-end',
  },
  availabilityBadge: {
    borderRadius: 12,
  },
  description: {
    color: 'transparent', // This will be handled by textSecondaryColor
    marginBottom: 16,
    lineHeight: 20,
  },
  buttonContainer: {
    gap: 8,
  },
  bookButton: {
    borderRadius: 16,
  },
  bookedButton: {
    borderColor: 'transparent', // This will be handled by successColor
    backgroundColor: 'transparent',
  },
  bookedInfo: {
    color: 'transparent', // This will be handled by textSecondaryColor
    fontStyle: 'italic',
  },
  waitlistButton: {
    borderColor: 'transparent', // This will be handled by warningColor
    backgroundColor: 'transparent',
  },
  waitlistedButton: {
    borderColor: 'transparent', // This will be handled by primaryColor
    backgroundColor: 'transparent',
  },
  waitlistInfo: {
    color: 'transparent', // This will be handled by textSecondaryColor
    fontStyle: 'italic',
  },
  disabledButton: {
    borderColor: 'transparent', // This will be handled by textMutedColor
    backgroundColor: 'transparent',
  },
  historyButton: {
    marginLeft: 8,
    borderRadius: 16,
  },
});

export default ClassBooking; 