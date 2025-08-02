import { useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Card, Chip } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { Body, Caption, H1, H2 } from '../../../components/ui/Typography';
import { spacing } from '../../../constants/Spacing';
import { useThemeColor } from '../../../hooks/useThemeColor';
import { AppDispatch, RootState } from '../../store';
import { cancelBooking, fetchBookings } from '../../store/bookingSlice';

function BookingHistory() {
  const dispatch = useDispatch<AppDispatch>();
  const { bookings, isLoading } = useSelector((state: RootState) => state.bookings);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      await dispatch(fetchBookings({})).unwrap();
    } catch (error) {
      console.error('Failed to load bookings:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadBookings();
  };

  const handleCancelBooking = async (bookingId: number, className: string) => {
    Alert.alert(
      'Cancel Booking',
      `Are you sure you want to cancel your booking for "${className}"?\n\nThis will refund 1 class to your subscription if cancelled more than 2 hours before the class starts.`,
      [
        { text: 'Keep Booking', style: 'cancel' },
        { 
          text: 'Cancel Booking', 
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(cancelBooking(bookingId)).unwrap();
              Alert.alert('Success', 'Booking cancelled successfully');
              loadBookings(); // Refresh the list
            } catch (error) {
              Alert.alert('Error', error as string);
            }
          }
        }
      ]
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

  const getStatusText = (status: string, classDate: string, classTime: string) => {
    if (!status) return 'Unknown';
    
    try {
      const now = new Date();
      const classDateTime = new Date(`${classDate} ${classTime}`);
      
      if (status === 'confirmed' && classDateTime > now) {
        return 'Upcoming';
      }
      
      switch (status) {
        case 'confirmed': return 'Confirmed';
        case 'completed': return 'Completed';
        case 'cancelled': return 'Cancelled';
        case 'no_show': return 'No Show';
        default: return status.charAt(0).toUpperCase() + status.slice(1);
      }
    } catch {
      return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const isUpcoming = (booking: any) => {
    if (!booking || booking.status !== 'confirmed') return false;
    
    try {
      const now = new Date();
      const classDate = booking.classes?.date || booking.class_date;
      const classTime = booking.classes?.time || booking.class_time;
      
      if (!classDate || !classTime) return false;
      
      const classDateTime = new Date(`${classDate} ${classTime}`);
      return classDateTime > now;
    } catch {
      return false;
    }
  };

  const canCancel = (booking: any) => {
    if (!booking || !isUpcoming(booking)) return false;
    
    try {
      const now = new Date();
      const classDate = booking.classes?.date || booking.class_date;
      const classTime = booking.classes?.time || booking.class_time;
      
      if (!classDate || !classTime) return false;
      
      const classDateTime = new Date(`${classDate} ${classTime}`);
      const hoursUntilClass = (classDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      return hoursUntilClass > 2; // Can cancel if more than 2 hours before class
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
  const upcomingBookings = safeBookings.filter(booking => booking && isUpcoming(booking));
  const pastBookings = safeBookings.filter(booking => booking && !isUpcoming(booking));

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
        <H2 style={{ ...styles.loadingText, color: textColor }}>Loading booking history...</H2>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: surfaceColor, borderBottomWidth: 1, borderBottomColor: textMutedColor }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerText}>
            <H1 style={{ ...styles.headerTitle, color: textColor }}>Booking History</H1>
            <Body style={{ ...styles.headerSubtitle, color: textSecondaryColor }}>Your past and upcoming classes</Body>
          </View>
          <Button
            mode="contained"
            icon="plus"
            onPress={() => {
              // Navigate to class booking - this would need proper navigation setup
              Alert.alert('Navigation', 'Go to Booking tab to book more classes');
            }}
            style={[styles.bookNewButton, { backgroundColor: accentColor }]}
            labelStyle={{ color: 'white' }}
            compact
          >
            Book Class
          </Button>
        </View>
      </View>
      
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {safeBookings.length === 0 ? (
          <Card style={[styles.emptyCard, { backgroundColor: cardColor }]}>
            <Card.Content>
              <H2 style={{ color: textColor }}>No Bookings Yet</H2>
              <Body style={{ color: secondaryTextColor }}>You haven&apos;t booked any classes yet. Start by booking your first class!</Body>
              <Button 
                mode="contained" 
                style={[styles.bookButton, { backgroundColor: accentColor }]} 
                icon="calendar-today"
                labelStyle={{ color: 'white' }}
              >
                Book a Class
              </Button>
            </Card.Content>
          </Card>
        ) : (
          <>
            {/* Upcoming Bookings Section */}
            {upcomingBookings.length > 0 && (
              <>
                <H2 style={{ ...styles.sectionTitle, color: textColor }}>Upcoming Classes</H2>
                {upcomingBookings.map((booking) => {
                  if (!booking || !booking.id) return null;
                  
                  const className = safeString(booking.classes?.name || booking.class_name, 'Unknown Class');
                  const instructorName = safeString(booking.classes?.users?.name || booking.instructor_name, 'TBA');
                  const classDate = safeString(booking.classes?.date || booking.class_date || booking.createdAt, '');
                  const classTime = safeString(booking.classes?.time || booking.class_time, '');
                  const equipmentType = safeString(booking.classes?.equipment_type || booking.equipment_type, '');
                  const bookingStatus = safeString(booking.status, 'unknown');
                  
                  return (
                    <Card key={booking.id} style={[styles.bookingCard, styles.upcomingCard, { backgroundColor: cardColor, borderColor: successColor }]}>
                      <Card.Content>
                        <View style={styles.bookingHeader}>
                          <H2 style={{ ...styles.className, color: textColor }}>{className}</H2>
                          <Chip 
                            style={[styles.statusChip, { backgroundColor: getStatusColor(bookingStatus) }]}
                            textStyle={{ ...styles.chipText, color: backgroundColor }}
                          >
                            {getStatusText(bookingStatus, classDate, classTime)}
                          </Chip>
                        </View>
                        <Body style={{ ...styles.instructor, color: secondaryTextColor }}>with {instructorName}</Body>
                        <Body style={{ ...styles.dateTime, color: textColor }}>
                          {formatDate(classDate)} • {formatTime(classTime)}
                        </Body>
                        
                        {equipmentType && equipmentType.length > 0 && (
                          <Caption style={{ ...styles.equipment, color: secondaryTextColor }}>
                            Equipment: {equipmentType.charAt(0).toUpperCase() + equipmentType.slice(1)}
                          </Caption>
                        )}
                        
                        {(booking.checkedIn === true || booking.checked_in === true) && (
                          <Caption style={{ ...styles.checkedIn, color: successColor }}>✓ Checked in</Caption>
                        )}
                        
                        {canCancel(booking) && (
                          <Button 
                            mode="outlined" 
                            onPress={() => handleCancelBooking(booking.id, className)}
                            style={[styles.cancelButton, { borderColor: errorColor }]}
                            textColor={errorColor}
                            icon="close"
                          >
                            Cancel Booking
                          </Button>
                        )}
                      </Card.Content>
                    </Card>
                  );
                })}
              </>
            )}
            
            {/* Past Bookings Section */}
            {pastBookings.length > 0 && (
              <>
                <H2 style={{ ...styles.sectionTitle, color: textColor }}>Past Classes</H2>
                {pastBookings.map((booking) => {
                  if (!booking || !booking.id) return null;
                  
                  const className = safeString(booking.classes?.name || booking.class_name, 'Unknown Class');
                  const instructorName = safeString(booking.classes?.users?.name || booking.instructor_name, 'TBA');
                  const classDate = safeString(booking.classes?.date || booking.class_date || booking.createdAt, '');
                  const classTime = safeString(booking.classes?.time || booking.class_time, '');
                  const equipmentType = safeString(booking.classes?.equipment_type || booking.equipment_type, '');
                  const bookingStatus = safeString(booking.status, 'unknown');
                  
                  return (
                    <Card key={booking.id} style={[styles.bookingCard, { backgroundColor: cardColor }]}>
                      <Card.Content>
                        <View style={styles.bookingHeader}>
                          <H2 style={{ ...styles.className, color: textColor }}>{className}</H2>
                          <Chip 
                            style={[styles.statusChip, { backgroundColor: getStatusColor(bookingStatus) }]}
                            textStyle={{ ...styles.chipText, color: backgroundColor }}
                          >
                            {getStatusText(bookingStatus, classDate, classTime)}
                          </Chip>
                        </View>
                        <Body style={{ ...styles.instructor, color: secondaryTextColor }}>with {instructorName}</Body>
                        <Body style={{ ...styles.dateTime, color: textColor }}>
                          {formatDate(classDate)} • {formatTime(classTime)}
                        </Body>
                        
                        {equipmentType && equipmentType.length > 0 && (
                          <Caption style={{ ...styles.equipment, color: secondaryTextColor }}>
                            Equipment: {equipmentType.charAt(0).toUpperCase() + equipmentType.slice(1)}
                          </Caption>
                        )}
                        
                        {(booking.checkedIn === true || booking.checked_in === true) && (
                          <Caption style={{ ...styles.checkedIn, color: successColor }}>✓ Checked in</Caption>
                        )}
                      </Card.Content>
                    </Card>
                  );
                })}
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
  upcomingCard: { 
    borderWidth: 1,
  },
});

export default BookingHistory; 