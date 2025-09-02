import StatusChip from '@/components/ui/StatusChip';
import { Body, Caption, H1, H2 } from '@/components/ui/Typography';
import { Colors } from '@/constants/Colors';
import { layout, spacing } from '@/constants/Spacing';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { ActivityIndicator, FAB, Modal, Button as PaperButton, Card as PaperCard, Portal, SegmentedButtons, TextInput } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import WebCompatibleIcon from '../../components/WebCompatibleIcon';
import { bookingService } from '../../services/bookingService';
import { classService } from '../../services/classService';
import { instructorClientService } from '../../services/instructorClientService';
import { AppDispatch, RootState } from '../../store';
import { shadows } from '../../utils/shadows';

interface Class {
  id: string;
  name: string;
  date: string;
  time: string;
  duration: number;
  capacity: number;
  enrolled: number;
  level?: string;
  equipment_type: string;
  status: string;
}

function ScheduleOverview() {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const [refreshing, setRefreshing] = useState(false);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [loading, setLoading] = useState(true);
  const [markedDates, setMarkedDates] = useState<any>({});

  // Class creation modal states
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newClass, setNewClass] = useState({
    name: '',
    date: '',
    time: '',
    duration: 60,
    capacity: 10,
    category: 'group' as 'group' | 'personal',
    equipmentType: 'mat' as 'mat' | 'reformer' | 'both',
    equipment: [] as string[],
    description: '',
    room: '' as 'Reformer Room' | 'Mat Room' | 'Cadillac Room' | 'Wall Room' | '',
    notes: '',
    visibility: 'public' as 'public' | 'private'
  });

  // Date/Time picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickerDate, setPickerDate] = useState(new Date());
  const [pickerTime, setPickerTime] = useState(new Date());

  // Availability checking states
  const [checkingRoomAvailability, setCheckingRoomAvailability] = useState(false);
  const [roomAvailability, setRoomAvailability] = useState<{[key: string]: {available: boolean, conflictClass: any}}>({});

  // Enrollment view states
  const [enrollmentModalVisible, setEnrollmentModalVisible] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);

  // Client assignment states
  const [assignClientModalVisible, setAssignClientModalVisible] = useState(false);
  const [selectedClassForAssignment, setSelectedClassForAssignment] = useState<Class | null>(null);
  const [availableClients, setAvailableClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [assignmentNotes, setAssignmentNotes] = useState<string>('');
  const [overrideRestrictions, setOverrideRestrictions] = useState<boolean>(false);
  const [loadingClients, setLoadingClients] = useState(false);
  const [assigningClient, setAssigningClient] = useState(false);

  // Client unassignment states
  const [unassignClientModalVisible, setUnassignClientModalVisible] = useState(false);
  const [selectedClassForUnassignment, setSelectedClassForUnassignment] = useState<Class | null>(null);
  const [enrolledClients, setEnrolledClients] = useState<any[]>([]);
  const [selectedClientForUnassignment, setSelectedClientForUnassignment] = useState<any>(null);
  const [loadingEnrolledClients, setLoadingEnrolledClients] = useState(false);
  const [unassigningClient, setUnassigningClient] = useState(false);

  useEffect(() => {
    loadSchedule();
  }, []);

  // Generate base marked dates from classes only
  const generateBaseMarkedDates = useCallback(() => {
    const marked: any = {};
    
    console.log(`🔍 [ScheduleOverview] Generating base marked dates for ${classes.length} classes`);
    classes.forEach(cls => {
      const date = cls.date;
      
      let dotColor = Colors.light.success; // Default green for available
      
      if (isPastClass(cls.date, cls.time)) {
        dotColor = Colors.light.textMuted; // Gray for past classes
      } else {
        const enrollmentPercentage = (cls.enrolled / cls.capacity) * 100;
        if (enrollmentPercentage >= 100) {
          dotColor = Colors.light.error; // Red for full
        } else if (enrollmentPercentage >= 80) {
          dotColor = Colors.light.warning; // Yellow for almost full
        }
      }

      // For multiple classes on same date, prioritize error > warning > success > muted
      const existingMarking = marked[date];
      const shouldUpdate = !existingMarking || 
        (dotColor === Colors.light.error) || 
        (dotColor === Colors.light.warning && existingMarking.dotColor !== Colors.light.error) ||
        (dotColor === Colors.light.success && !existingMarking.dotColor.includes('#f44336') && !existingMarking.dotColor.includes('#ff9800'));

      if (shouldUpdate) {
        marked[date] = {
          marked: true,
          dotColor: dotColor,
          activeOpacity: 0.8
        };
      }
    });

    return marked;
  }, [classes]);

  // Update marked dates when classes change
  useEffect(() => {
    const baseMarked = generateBaseMarkedDates();
    setMarkedDates(baseMarked);
  }, [generateBaseMarkedDates]);

  // No visual selection - just track selected date for showing classes below



  // Check room availability when date, time, or room changes
  useEffect(() => {
    if (newClass.date && newClass.time && newClass.room) {
      checkRoomAvailability();
    }
  }, [newClass.date, newClass.time, newClass.room, newClass.duration]);

  const loadSchedule = async () => {
    try {
      setLoading(true);
      console.log(`🔄 [ScheduleOverview] Loading classes for instructor: ${user?.id}`);
      console.log(`🔄 [ScheduleOverview] User object:`, user);
      console.log(`🔄 [ScheduleOverview] Instructor filter value:`, user?.id?.toString());
      
      const response = await classService.getClasses({
        instructor: user?.id?.toString(),
        userRole: 'instructor' // Ensure instructor can see ALL their classes including private ones
        // Removed status filter temporarily to see all classes for this instructor
        // status: 'active'
        // Removed upcoming: true filter so instructor can see all classes including past ones
      });

      console.log(`📊 [ScheduleOverview] API Response:`, {
        success: response.success,
        dataLength: response.data?.length || 0,
        error: response.error
      });

      if (response.success && response.data) {
        const classesData = response.data.map(cls => ({
          ...cls,
          equipment_type: cls.equipment_type || 'mat'
        }));
        
        console.log(`✅ [ScheduleOverview] Loaded ${classesData.length} classes:`, 
          classesData.map(c => ({ id: c.id, name: c.name, date: c.date, status: c.status, instructor_id: c.instructor_id }))
        );
        
        setClasses(classesData);
        
        // Note: Class full notifications are sent automatically when classes become full during booking
        // No need to send them again when instructor views schedule
      } else {
        console.log(`⚠️ [ScheduleOverview] No classes found or API error:`, response.error);
        setClasses([]);
      }
    } catch (error) {
      console.error('❌ [ScheduleOverview] Failed to load schedule:', error);
      setClasses([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const checkRoomAvailability = async () => {
    if (!newClass.date || !newClass.time || !newClass.room) return;
    
    try {
      setCheckingRoomAvailability(true);
      const response = await classService.checkRoomAvailability(
        newClass.date,
        newClass.time,
        newClass.duration
      );
      
      if (response.success && response.data) {
        setRoomAvailability(response.data);
      }
    } catch (error) {
      console.error('Error checking room availability:', error);
    } finally {
      setCheckingRoomAvailability(false);
    }
  };

  const viewClassEnrollments = async (classItem: Class) => {
    try {
      setSelectedClass(classItem);
      setLoadingEnrollments(true);
      setEnrollmentModalVisible(true);

      const response = await bookingService.getClassAttendees(classItem.id);
      
      if (response.success && response.data) {
        setEnrollments(response.data);
      } else {
        Alert.alert('Error', 'Failed to load class enrollments');
        setEnrollments([]);
      }
    } catch (error) {
      console.error('Failed to load enrollments:', error);
      Alert.alert('Error', 'Failed to load class enrollments');
      setEnrollments([]);
    } finally {
      setLoadingEnrollments(false);
    }
  };

  // Note: checkClassCapacityAndNotify function removed - notifications are now sent automatically during booking

  const handleAssignClient = async (classItem: Class) => {
    try {
      setSelectedClassForAssignment(classItem);
      setLoadingClients(true);
      setAssignClientModalVisible(true);
      
      // Load only instructor's assigned clients for assignment
      const response = await instructorClientService.getInstructorClientsForAssignment(user.id.toString());
      
      if (response.success && response.data) {
        setAvailableClients(response.data);
        if (response.data.length === 0) {
          // Don't show error, just let the empty state handle it
          console.log('No assigned clients found for instructor');
        }
      } else {
        Alert.alert('Error', 'Failed to load your assigned clients. Please contact admin if you should have clients assigned.');
        setAvailableClients([]);
      }
    } catch (error) {
      console.error('Error loading clients for assignment:', error);
      Alert.alert('Error', 'Failed to load clients for assignment');
      setAvailableClients([]);
    } finally {
      setLoadingClients(false);
    }
  };

  const handleAssignClientToClass = async () => {
    if (!selectedClientId || !selectedClassForAssignment || !user?.id) {
      Alert.alert('Error', 'Please select a client to assign');
      return;
    }

    try {
      setAssigningClient(true);
      
      // Use the same booking service that reception uses - it already handles everything perfectly
      const response = await bookingService.assignClientToClass(
        selectedClientId,
        selectedClassForAssignment.id,
        assignmentNotes || (overrideRestrictions ? 'Assigned by instructor with override' : 'Assigned by instructor'),
        overrideRestrictions
      );
      
      if (response.success) {
        const successMessage = overrideRestrictions 
          ? 'Client assigned to class successfully (restrictions bypassed)' 
          : 'Client assigned to class successfully';
        Alert.alert('Success', successMessage);
        setAssignClientModalVisible(false);
        resetAssignmentModal();
        loadSchedule(); // Refresh the schedule
      } else {
        Alert.alert('Error', response.error || 'Failed to assign client to class');
      }
    } catch (error) {
      console.error('Error assigning client to class:', error);
      Alert.alert('Error', 'Failed to assign client to class');
    } finally {
      setAssigningClient(false);
    }
  };

  const resetAssignmentModal = () => {
    setSelectedClientId('');
    setAssignmentNotes('');
    setOverrideRestrictions(false);
    setSelectedClassForAssignment(null);
    setAvailableClients([]);
  };

  const handleUnassignClient = async (classItem: Class) => {
    try {
      setSelectedClassForUnassignment(classItem);
      setLoadingEnrolledClients(true);
      setUnassignClientModalVisible(true);
      
      // Load enrolled clients for this class
      const response = await bookingService.getClassAttendees(classItem.id);
      
      if (response.success && response.data) {
        setEnrolledClients(response.data);
        if (response.data.length === 0) {
          console.log('No enrolled clients found for class');
        }
      } else {
        Alert.alert('Error', 'Failed to load enrolled clients');
        setEnrolledClients([]);
      }
    } catch (error) {
      console.error('Error loading enrolled clients:', error);
      Alert.alert('Error', 'Failed to load enrolled clients');
      setEnrolledClients([]);
    } finally {
      setLoadingEnrolledClients(false);
    }
  };

  const handleUnassignClientFromClass = async () => {
    if (!selectedClientForUnassignment || !selectedClassForUnassignment || !user?.id) {
      Alert.alert('Error', 'Please select a client to unassign');
      return;
    }

    try {
      setUnassigningClient(true);
      
      // Use the same booking service that reception uses - it handles everything correctly
      const response = await bookingService.cancelClientBooking(
        selectedClientForUnassignment.user_id || selectedClientForUnassignment.id,
        selectedClassForUnassignment.id,
        'Unassigned by instructor'
      );
      
      if (response.success) {
        Alert.alert('Success', 'Client unassigned successfully');
        setUnassignClientModalVisible(false);
        resetUnassignmentModal();
        loadSchedule(); // Refresh the schedule
      } else {
        Alert.alert('Error', response.error || 'Failed to unassign client');
      }
    } catch (error) {
      console.error('Error unassigning client:', error);
      Alert.alert('Error', 'Failed to unassign client');
    } finally {
      setUnassigningClient(false);
    }
  };



  const resetUnassignmentModal = () => {
    setSelectedClientForUnassignment(null);
    setSelectedClassForUnassignment(null);
    setEnrolledClients([]);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadSchedule();
  };

  const handleCreateClass = () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().slice(0, 5);
    
    // Reset form with default values
    setNewClass({
      name: '',
      date: today,
      time: currentTime,
      duration: 60,
      capacity: 10,
      category: 'group',
      equipmentType: 'mat',
      equipment: [],
      description: '',
      room: '',
      notes: '',
      visibility: 'public'
    });
    
    // Reset picker dates to current
    setPickerDate(now);
    setPickerTime(now);
    
    setCreateModalVisible(true);
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || pickerDate;
    
    // Only close on Android when user dismisses, keep open for continuous selection
    if (Platform.OS === 'android' && event.type === 'dismissed') {
      setShowDatePicker(false);
      return;
    }
    
    if (event.type === 'set' && selectedDate) {
      setPickerDate(selectedDate);
      const dateString = selectedDate.toISOString().split('T')[0];
      setNewClass(prev => ({ ...prev, date: dateString }));
      
      // Keep picker open - don't auto-close on selection
      // User must click "Done" to close
    } else if (event.type === 'dismissed') {
      setShowDatePicker(false);
    }
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    const currentTime = selectedTime || pickerTime;
    
    // Only close on Android when user dismisses, keep open for continuous selection
    if (Platform.OS === 'android' && event.type === 'dismissed') {
      setShowTimePicker(false);
      return;
    }
    
    if (event.type === 'set' && selectedTime) {
      setPickerTime(selectedTime);
      const timeString = selectedTime.toTimeString().slice(0, 5);
      setNewClass(prev => ({ ...prev, time: timeString }));
      
      // Keep picker open - don't auto-close on selection
      // User must click "Done" to close
    } else if (event.type === 'dismissed') {
      setShowTimePicker(false);
    }
  };

  const submitCreateClass = async () => {
    try {
      if (!newClass.name || !newClass.date || !newClass.time || !user?.id) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }

      // Check for instructor conflicts
      const instructorConflictResponse = await classService.checkInstructorConflict(
        user.id,
        newClass.date,
        newClass.time,
        newClass.duration
      );

      if (instructorConflictResponse.success && instructorConflictResponse.data?.hasConflict) {
        const conflictClass = instructorConflictResponse.data.conflictClass;
        Alert.alert(
          'Instructor Conflict',
          `You already have a class "${conflictClass?.name}" scheduled at ${conflictClass?.time} on ${newClass.date}. Please choose a different time.`
        );
        return;
      }

      // Check for room conflicts if room is selected
      if (newClass.room) {
        const roomConflictResponse = await classService.checkRoomAvailability(
          newClass.date,
          newClass.time,
          newClass.duration
        );

        if (roomConflictResponse.success && roomConflictResponse.data) {
          const roomAvailability = roomConflictResponse.data[newClass.room];
          if (roomAvailability && !roomAvailability.available) {
            Alert.alert(
              'Room Conflict',
              `${newClass.room} is already booked at ${newClass.time} on ${newClass.date}. Please choose a different room or time.`
            );
            return;
          }
        }
      }

      console.log('🔧 [ScheduleOverview] Creating class with visibility:', newClass.visibility);
      const response = await classService.createClass({
        name: newClass.name,
        instructorId: user.id,
        date: newClass.date,
        time: newClass.time,
        duration: newClass.duration,
        category: newClass.category,
        capacity: newClass.capacity,
        equipmentType: newClass.equipmentType,
        equipment: newClass.equipment,
        description: newClass.description,
        room: newClass.room,
        notes: newClass.notes,
        visibility: newClass.visibility
      });

      if (response.success) {
        Alert.alert('Success', 'Class created successfully');
        setCreateModalVisible(false);
        loadSchedule(); // Refresh list
      } else {
        Alert.alert('Error', response.error || 'Failed to create class');
      }
    } catch (error) {
      console.error('Failed to create class:', error);
      Alert.alert('Error', 'Failed to create class');
    }
  };

  const handleDeleteClass = (classId: number) => {
    Alert.alert(
      'Delete Class',
      'Are you sure you want to delete this class? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => confirmDeleteClass(classId) },
      ]
    );
  };

  const confirmDeleteClass = async (classId: number) => {
    try {
      const response = await classService.deleteClass(classId);
      
      if (response.success) {
        Alert.alert('Success', 'Class deleted successfully');
        loadSchedule(); // Refresh list
      } else {
        Alert.alert('Error', response.error || 'Failed to delete class');
      }
    } catch (error) {
      console.error('Failed to delete class:', error);
      Alert.alert('Error', 'Failed to delete class');
    }
  };

  const getClassesForDate = (date: string) => {
    return classes.filter(cls => cls.date === date);
  };

  const getSelectedDateClasses = () => {
    if (!selectedDate) return [];
    return getClassesForDate(selectedDate);
  };



  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getLevelChipState = (level?: string) => {
    if (!level) return 'neutral';
    switch (level.toLowerCase()) {
      case 'beginner':
        return 'success';
      case 'intermediate':
        return 'warning';
      case 'advanced':
        return 'info';
      default:
        return 'neutral';
    }
  };

  const getStatusChipState = (cls: Class) => {
    const enrollmentPercentage = (cls.enrolled / cls.capacity) * 100;
    
    if (enrollmentPercentage >= 100) return 'warning';
    if (enrollmentPercentage >= 80) return 'info';
    return 'success';
  };

  const getStatusText = (cls: Class) => {
    const enrollmentPercentage = (cls.enrolled / cls.capacity) * 100;
    
    if (enrollmentPercentage >= 100) return 'Full';
    if (enrollmentPercentage >= 80) return 'Almost Full';
    return 'Available';
  };

  const getClassStatusColor = (cls: Class) => {
    const enrollmentPercentage = (cls.enrolled / cls.capacity) * 100;
    
    if (enrollmentPercentage >= 100) return Colors.light.error; // Red for full
    if (enrollmentPercentage >= 80) return Colors.light.warning; // Yellow for almost full
    return Colors.light.success; // Green for available
  };

  const getClassBackgroundColor = (cls: Class) => {
    if (isPastClass(cls.date, cls.time)) {
      return Colors.light.textMuted; // Gray for past classes
    }
    return getClassStatusColor(cls);
  };

  const isPastClass = (date: string, time: string) => {
    const classDateTime = new Date(`${date}T${time}`);
    return classDateTime < new Date();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <H1 style={styles.headerTitle}>Schedule & Classes</H1>
        <Caption style={styles.headerSubtitle}>Manage your schedule and create classes</Caption>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Quick Stats */}
        <PaperCard style={styles.card}>
          <PaperCard.Content style={styles.cardContent}>
            <H2 style={styles.cardTitle}>Overview</H2>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <View style={styles.statHeader}>
                  <WebCompatibleIcon name="event" size={24} color={Colors.light.accent} />
                  <Body style={styles.statNumber}>{classes.length}</Body>
                </View>
                <Caption style={styles.statLabel}>Total Classes</Caption>
              </View>

              <View style={styles.statItem}>
                <View style={styles.statHeader}>
                  <WebCompatibleIcon name="people" size={24} color={Colors.light.primary} />
                  <Body style={styles.statNumber}>
                    {classes.reduce((sum, cls) => sum + cls.enrolled, 0)}
                  </Body>
                </View>
                <Caption style={styles.statLabel}>Total Enrolled</Caption>
              </View>
              
              <View style={styles.statItem}>
                <View style={styles.statHeader}>
                  <WebCompatibleIcon name="trending-up" size={24} color={Colors.light.success} />
                  <Body style={styles.statNumber}>
                    {classes.length > 0 
                      ? Math.round((classes.reduce((sum, cls) => sum + cls.enrolled, 0) / classes.reduce((sum, cls) => sum + cls.capacity, 0)) * 100)
                      : 0}%
                  </Body>
                </View>
                <Caption style={styles.statLabel}>Fill Rate</Caption>
              </View>
            </View>
          </PaperCard.Content>
        </PaperCard>

        {/* View Toggle */}
        <View style={styles.viewToggle}>
          <PaperButton
            mode={viewMode === 'calendar' ? 'contained' : 'outlined'}
            onPress={() => setViewMode('calendar')}
            style={[styles.toggleButton, viewMode === 'calendar' && styles.activeToggle]}
            labelStyle={viewMode === 'calendar' ? styles.activeToggleLabel : styles.inactiveToggleLabel}
            icon={() => <WebCompatibleIcon name="calendar-today" size={16} color={viewMode === 'calendar' ? 'white' : Colors.light.textSecondary} />}
          >
            Calendar
          </PaperButton>
          <PaperButton
            mode={viewMode === 'list' ? 'contained' : 'outlined'}
            onPress={() => setViewMode('list')}
            style={[styles.toggleButton, viewMode === 'list' && styles.activeToggle]}
            labelStyle={viewMode === 'list' ? styles.activeToggleLabel : styles.inactiveToggleLabel}
            icon={() => <WebCompatibleIcon name="view-list" size={16} color={viewMode === 'list' ? 'white' : Colors.light.textSecondary} />}
          >
            List
          </PaperButton>
        </View>

        {viewMode === 'calendar' ? (
          <>
            {/* Calendar View */}
            <PaperCard style={styles.card}>
              <PaperCard.Content style={styles.cardContent}>
                <View style={styles.sectionHeader}>
                  <H2 style={styles.cardTitle}>Calendar View</H2>
                  <PaperButton 
                    mode="contained" 
                    style={styles.createButton}
                    labelStyle={styles.createButtonLabel}
                    icon={() => <WebCompatibleIcon name="add" size={16} color="white" />}
                    onPress={handleCreateClass}
                    compact
                  >
                    Create Class
                  </PaperButton>
                </View>

                <Calendar
                  key={`calendar-${classes.length}`}
                  style={styles.calendar}
                  theme={{
                    backgroundColor: Colors.light.surface,
                    calendarBackground: Colors.light.surface,
                    textSectionTitleColor: Colors.light.text,
                    dayTextColor: Colors.light.text,
                    todayTextColor: '#FFFFFF',
                    todayBackgroundColor: Colors.light.accent,
                    monthTextColor: Colors.light.text,
                    indicatorColor: Colors.light.accent,
                    textDayFontWeight: '600',
                    textMonthFontWeight: 'bold',
                    textDayHeaderFontWeight: '600',
                    arrowColor: Colors.light.text,
                    disabledArrowColor: Colors.light.textMuted,
                    textDisabledColor: Colors.light.textMuted,
                    // Removed all selection styling - no blue circles or selection dots
                  }}
                  markedDates={markedDates}
                  onDayPress={(day) => {
                    console.log(`🔍 [ScheduleOverview] Day pressed: ${day.dateString}`);
                    console.log(`🔍 [ScheduleOverview] Classes for ${day.dateString}:`, classes.filter(cls => cls.date === day.dateString));
                    setSelectedDate(day.dateString);
                  }}
                  initialDate={classes.length > 0 ? classes[0].date : new Date().toISOString().split('T')[0]}
                />
              </PaperCard.Content>
            </PaperCard>

            {/* Selected Date Classes */}
            {selectedDate && (
              <PaperCard style={styles.card}>
                <PaperCard.Content style={styles.cardContent}>
                  <H2 style={styles.cardTitle}>Classes for {selectedDate}</H2>
                  {getSelectedDateClasses().length > 0 ? (
                    getSelectedDateClasses().map((cls) => (
                      <View key={cls.id} style={[
                        styles.classItem,
                        { 
                          backgroundColor: getClassBackgroundColor(cls) + '20', // 20% opacity
                          borderLeftWidth: 4,
                          borderLeftColor: getClassBackgroundColor(cls),
                          borderRadius: 8,
                          marginVertical: 4,
                          paddingHorizontal: 12
                        }
                      ]}>
                        <TouchableOpacity 
                          style={styles.classInfo}
                          onPress={() => viewClassEnrollments(cls)}
                        >
                          <View style={styles.classHeader}>
                            <Body style={StyleSheet.flatten([styles.className, { color: isPastClass(cls.date, cls.time) ? Colors.light.textMuted : Colors.light.text }])}>{cls.name}</Body>
                            <View style={styles.chipContainer}>
                              <StatusChip 
                                state={getStatusChipState(cls)}
                                text={getStatusText(cls)}
                                size="small"
                              />
                            </View>
                          </View>
                          
                          <View style={styles.classDetails}>
                            <View style={styles.classDetailItem}>
                              <WebCompatibleIcon name="schedule" size={16} color={Colors.light.textSecondary} />
                              <Caption style={StyleSheet.flatten([styles.classDetailText, { color: isPastClass(cls.date, cls.time) ? Colors.light.textMuted : Colors.light.textSecondary }])}>
                                {`${formatTime(cls.time)} (${cls.duration} min)`}
                              </Caption>
                            </View>

                            <View style={styles.classDetailItem}>
                              <WebCompatibleIcon name="people" size={16} color={Colors.light.textSecondary} />
                              <Caption style={StyleSheet.flatten([styles.classDetailText, { color: isPastClass(cls.date, cls.time) ? Colors.light.textMuted : Colors.light.textSecondary }])}>
                                {cls.enrolled}/{cls.capacity} enrolled
                              </Caption>
                            </View>
                          </View>
                        </TouchableOpacity>

                        <View style={styles.classActions}>
                          <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: Colors.light.primary + '20' }]}
                            onPress={() => handleAssignClient(cls)}
                          >
                            <WebCompatibleIcon name="add" size={16} color={Colors.light.primary} />
                            <Text style={{ fontSize: 10, color: Colors.light.primary, marginTop: 2 }}>Assign</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: Colors.light.warning + '20' }]}
                            onPress={() => handleUnassignClient(cls)}
                          >
                            <WebCompatibleIcon name="remove" size={16} color={Colors.light.warning} />
                            <Text style={{ fontSize: 10, color: Colors.light.warning, marginTop: 2 }}>Remove</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: Colors.light.error + '20' }]}
                            onPress={() => handleDeleteClass(parseInt(cls.id))}
                          >
                            <WebCompatibleIcon name="clear" size={16} color={Colors.light.error} />
                            <Text style={{ fontSize: 10, color: Colors.light.error, marginTop: 2 }}>Delete</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
                  ) : (
                    <View style={styles.emptyState}>
                      <WebCompatibleIcon name="event-note" size={48} color={Colors.light.textMuted} />
                      <Body style={styles.emptyStateText}>No classes on this date</Body>
                    </View>
                  )}
                </PaperCard.Content>
              </PaperCard>
            )}
          </>
        ) : (
          /* List View */
          <PaperCard style={styles.card}>
            <PaperCard.Content style={styles.cardContent}>
              <View style={styles.sectionHeader}>
                <H2 style={styles.cardTitle}>All Classes</H2>
                <PaperButton 
                  mode="contained" 
                  style={styles.createButton}
                  labelStyle={styles.createButtonLabel}
                  icon={() => <WebCompatibleIcon name="add" size={16} color="white" />}
                  onPress={handleCreateClass}
                  compact
                >
                  Create Class
                </PaperButton>
              </View>

              {classes.length === 0 ? (
                <View style={styles.emptyState}>
                  <WebCompatibleIcon name="event-note" size={48} color={Colors.light.textMuted} />
                  <Body style={styles.emptyStateText}>No classes created yet</Body>
                  <Caption style={styles.emptyStateSubtext}>Create your first class to get started</Caption>
                </View>
              ) : (
                classes.map((cls) => (
                  <View key={cls.id} style={[
                    styles.classItem,
                    { 
                      backgroundColor: getClassBackgroundColor(cls) + '20', // 20% opacity
                      borderLeftWidth: 4,
                      borderLeftColor: getClassBackgroundColor(cls),
                      borderRadius: 8,
                      marginVertical: 4,
                      paddingHorizontal: 12
                    }
                  ]}>
                    <TouchableOpacity 
                      style={styles.classInfo}
                      onPress={() => viewClassEnrollments(cls)}
                    >
                      <View style={styles.classHeader}>
                        <Body style={StyleSheet.flatten([styles.className, { color: isPastClass(cls.date, cls.time) ? Colors.light.textMuted : Colors.light.text }])}>{cls.name}</Body>
                        <View style={styles.chipContainer}>
                          <StatusChip 
                            state={getLevelChipState(cls.level)}
                            text={cls.level || 'Beginner'}
                            size="small"
                          />
                          <StatusChip 
                            state={getStatusChipState(cls)}
                            text={getStatusText(cls)}
                            size="small"
                          />
                        </View>
                      </View>
                      
                      <View style={styles.classDetails}>
                        <View style={styles.classDetailItem}>
                          <WebCompatibleIcon name="calendar-today" size={16} color={Colors.light.textSecondary} />
                          <Caption style={StyleSheet.flatten([styles.classDetailText, { color: isPastClass(cls.date, cls.time) ? Colors.light.textMuted : Colors.light.textSecondary }])}>{cls.date}</Caption>
                        </View>
                        
                        <View style={styles.classDetailItem}>
                          <WebCompatibleIcon name="schedule" size={16} color={Colors.light.textSecondary} />
                          <Caption style={StyleSheet.flatten([styles.classDetailText, { color: isPastClass(cls.date, cls.time) ? Colors.light.textMuted : Colors.light.textSecondary }])}>
                            {`${formatTime(cls.time)} (${cls.duration} min)`}
                          </Caption>
                        </View>

                        <View style={styles.classDetailItem}>
                          <WebCompatibleIcon name="fitness-center" size={16} color={Colors.light.textSecondary} />
                          <Caption style={StyleSheet.flatten([styles.classDetailText, { color: isPastClass(cls.date, cls.time) ? Colors.light.textMuted : Colors.light.textSecondary }])}>{cls.equipment_type}</Caption>
                        </View>
                        
                        <View style={styles.classDetailItem}>
                          <WebCompatibleIcon name="people" size={16} color={Colors.light.textSecondary} />
                          <Caption style={StyleSheet.flatten([styles.classDetailText, { color: isPastClass(cls.date, cls.time) ? Colors.light.textMuted : Colors.light.textSecondary }])}>
                            {cls.enrolled}/{cls.capacity} enrolled
                          </Caption>
                        </View>
                      </View>

                      {isPastClass(cls.date, cls.time) && (
                        <View style={styles.pastIndicator}>
                          <WebCompatibleIcon name="history" size={16} color={Colors.light.textMuted} />
                          <Caption style={styles.pastText}>Past class</Caption>
                        </View>
                      )}
                    </TouchableOpacity>

                    <View style={styles.classActions}>
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: Colors.light.primary + '20' }]}
                        onPress={() => handleAssignClient(cls)}
                      >
                        <WebCompatibleIcon name="add" size={16} color={Colors.light.primary} />
                        <Text style={{ fontSize: 10, color: Colors.light.primary, marginTop: 2 }}>Assign</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: Colors.light.warning + '20' }]}
                        onPress={() => handleUnassignClient(cls)}
                      >
                        <WebCompatibleIcon name="remove" size={16} color={Colors.light.warning} />
                        <Text style={{ fontSize: 10, color: Colors.light.warning, marginTop: 2 }}>Remove</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: Colors.light.error + '20' }]}
                        onPress={() => handleDeleteClass(parseInt(cls.id))}
                      >
                        <WebCompatibleIcon name="clear" size={16} color={Colors.light.error} />
                        <Text style={{ fontSize: 10, color: Colors.light.error, marginTop: 2 }}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </PaperCard.Content>
          </PaperCard>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <FAB
        style={styles.fab}
        icon={() => <WebCompatibleIcon name="add" size={24} color="white" />}
        onPress={handleCreateClass}
      />

      {/* Create Class Modal */}
      <Portal>
        <Modal
          visible={createModalVisible}
          onDismiss={() => setCreateModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <PaperCard style={styles.modalCard}>
            <PaperCard.Content style={styles.modalContent}>
              <H2 style={styles.modalTitle}>Create New Class</H2>
              
              <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
                <TextInput
                  label="Class Name"
                  value={newClass.name}
                  onChangeText={(text) => setNewClass({...newClass, name: text})}
                  style={styles.input}
                  mode="outlined"
                />

                {/* Date Picker */}
                <View style={styles.input}>
                  <Caption style={styles.pickerLabel}>Date *</Caption>
                  <TouchableOpacity
                    style={styles.dateTimeButton}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <WebCompatibleIcon name="calendar-today" size={20} color={Colors.light.textSecondary} />
                    <Body style={StyleSheet.flatten([styles.dateTimeText, !newClass.date && styles.placeholderText])}>
                      {newClass.date ? formatDisplayDate(newClass.date) : 'Select date'}
                    </Body>
                  </TouchableOpacity>
                </View>

                {/* Time Picker */}
                <View style={styles.input}>
                  <Caption style={styles.pickerLabel}>Time *</Caption>
                  <TouchableOpacity
                    style={styles.dateTimeButton}
                    onPress={() => setShowTimePicker(true)}
                  >
                    <WebCompatibleIcon name="schedule" size={20} color={Colors.light.textSecondary} />
                    <Body style={StyleSheet.flatten([styles.dateTimeText, !newClass.time && styles.placeholderText])}>
                      {newClass.time ? formatTime(newClass.time) : 'Select time'}
                    </Body>
                  </TouchableOpacity>
                </View>

                <TextInput
                  label="Duration (minutes)"
                  value={newClass.duration.toString()}
                  onChangeText={(text) => setNewClass({...newClass, duration: parseInt(text) || 60})}
                  style={styles.input}
                  mode="outlined"
                  keyboardType="numeric"
                />

                <TextInput
                  label="Capacity"
                  value={newClass.capacity.toString()}
                  onChangeText={(text) => setNewClass({...newClass, capacity: parseInt(text) || 10})}
                  style={styles.input}
                  mode="outlined"
                  keyboardType="numeric"
                />

                <Caption style={styles.pickerLabel}>Class Category</Caption>
                <SegmentedButtons
                  value={newClass.category}
                  onValueChange={(value) => setNewClass({...newClass, category: value as 'group' | 'personal'})}
                  buttons={[
                    { value: 'group', label: 'Group' },
                    { value: 'personal', label: 'Personal' },
                  ]}
                  style={styles.segmentedButtons}
                />

                <Caption style={styles.pickerLabel}>Equipment Type</Caption>
                <SegmentedButtons
                  value={newClass.equipmentType}
                  onValueChange={(value) => setNewClass({...newClass, equipmentType: value as 'mat' | 'reformer' | 'both'})}
                  buttons={[
                    { value: 'mat', label: 'Mat' },
                    { value: 'reformer', label: 'Reformer' },
                    { value: 'both', label: 'Both' },
                  ]}
                  style={styles.segmentedButtons}
                />

                <Caption style={styles.pickerLabel}>Room</Caption>
                <SegmentedButtons
                  value={newClass.room}
                  onValueChange={(value) => setNewClass({...newClass, room: value as 'Reformer Room' | 'Mat Room' | 'Cadillac Room' | 'Wall Room' | ''})}
                  buttons={[
                    { value: 'Mat Room', label: 'Mat' },
                    { value: 'Reformer Room', label: 'Reformer' },
                    { value: 'Cadillac Room', label: 'Cadillac' },
                    { value: 'Wall Room', label: 'Wall' },
                  ]}
                  style={styles.segmentedButtons}
                />

                {checkingRoomAvailability && (
                  <View style={styles.availabilityIndicator}>
                    <ActivityIndicator size="small" />
                    <Caption style={styles.availabilityText}>Checking availability...</Caption>
                  </View>
                )}

                {newClass.room && roomAvailability[newClass.room] && (
                  <View style={styles.availabilityIndicator}>
                    <WebCompatibleIcon 
                      name={roomAvailability[newClass.room].available ? "check-circle" : "error"} 
                      size={16} 
                      color={roomAvailability[newClass.room].available ? Colors.light.success : Colors.light.error} 
                    />
                    <Caption style={StyleSheet.flatten([styles.availabilityText, { 
                      color: roomAvailability[newClass.room].available ? Colors.light.success : Colors.light.error 
                    }])}>
                      {roomAvailability[newClass.room].available ? 'Room available' : 'Room not available'}
                    </Caption>
                  </View>
                )}

                <TextInput
                  label="Description (optional)"
                  value={newClass.description}
                  onChangeText={(text) => setNewClass({...newClass, description: text})}
                  style={styles.input}
                  mode="outlined"
                  multiline
                  numberOfLines={3}
                />

                <TextInput
                  label="Notes (optional)"
                  value={newClass.notes}
                  onChangeText={(text) => setNewClass({...newClass, notes: text})}
                  style={styles.input}
                  mode="outlined"
                  multiline
                  numberOfLines={2}
                />

                {/* Class Visibility Toggle */}
                <View style={styles.visibilityContainer}>
                  <View style={styles.visibilityHeader}>
                    <WebCompatibleIcon 
                      name={newClass.visibility === 'private' ? 'visibility-off' : 'visibility'} 
                      size={24} 
                      color={Colors.light.primary} 
                    />
                    <View style={styles.visibilityTextContainer}>
                      <Body style={styles.visibilityTitle}>
                        {newClass.visibility === 'private' ? 'Private Class' : 'Public Class'}
                      </Body>
                      <Caption style={styles.visibilityDescription}>
                        {newClass.visibility === 'private' 
                          ? 'Only visible to reception, instructors, and admin'
                          : 'Visible to all users including clients'
                        }
                      </Caption>
                    </View>
                    <PaperButton
                      mode={newClass.visibility === 'private' ? 'contained' : 'outlined'}
                      onPress={() => setNewClass({...newClass, visibility: newClass.visibility === 'private' ? 'public' : 'private'})}
                      style={styles.visibilityToggle}
                      compact
                    >
                      {newClass.visibility === 'private' ? 'Private' : 'Public'}
                    </PaperButton>
                  </View>
                </View>
              </ScrollView>

              <View style={styles.modalActions}>
                <PaperButton
                  mode="outlined"
                  onPress={() => setCreateModalVisible(false)}
                  style={styles.modalCancelButton}
                >
                  Cancel
                </PaperButton>
                <PaperButton
                  mode="contained"
                  onPress={submitCreateClass}
                  style={styles.modalConfirmButton}
                >
                  Create Class
                </PaperButton>
              </View>
            </PaperCard.Content>
          </PaperCard>


        </Modal>
      </Portal>

      {/* Enrollment Modal */}
      <Portal>
        <Modal
          visible={enrollmentModalVisible}
          onDismiss={() => setEnrollmentModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <PaperCard style={styles.modalCard}>
            <PaperCard.Content style={styles.modalContent}>
              <H2 style={styles.modalTitle}>Class Enrollments</H2>
              
              {selectedClass && (
                <View style={styles.classInfoSection}>
                  <View style={styles.classDetailRow}>
                    <WebCompatibleIcon name="event" size={20} color={Colors.light.textSecondary} />
                    <Body style={styles.className}>{selectedClass.name}</Body>
                  </View>
                  <View style={styles.classDetailRow}>
                    <WebCompatibleIcon name="calendar-today" size={16} color={Colors.light.textSecondary} />
                    <Caption style={styles.classDetailText}>{selectedClass.date} at {formatTime(selectedClass.time)}</Caption>
                  </View>
                  <View style={styles.classDetailRow}>
                    <WebCompatibleIcon name="people" size={16} color={Colors.light.textSecondary} />
                    <Caption style={styles.classDetailText}>
                      {selectedClass.enrolled}/{selectedClass.capacity} enrolled
                    </Caption>
                  </View>
                </View>
              )}

              <ScrollView style={styles.enrollmentsList} showsVerticalScrollIndicator={false}>
                {loadingEnrollments ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.light.accent} />
                    <Caption style={styles.loadingText}>Loading enrollments...</Caption>
                  </View>
                ) : enrollments.length > 0 ? (
                  enrollments.map((enrollment, index) => (
                    <View key={index} style={styles.enrollmentItem}>
                      <View style={styles.enrollmentInfo}>
                        <Body style={styles.enrollmentName}>
                          {enrollment.user_name || enrollment.name || 'Unknown User'}
                        </Body>
                        <Caption style={styles.enrollmentEmail}>
                          {enrollment.user_email || enrollment.email || 'No email'}
                        </Caption>
                      </View>
                      <View style={styles.enrollmentStatus}>
                        <StatusChip 
                          state="success"
                          text={enrollment.status || 'Enrolled'}
                          size="small"
                        />
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyEnrollments}>
                    <WebCompatibleIcon name="people-outline" size={48} color={Colors.light.textMuted} />
                    <Body style={styles.emptyEnrollmentsText}>No enrollments yet</Body>
                    <Caption style={styles.emptyEnrollmentsSubtext}>
                      Students will appear here once they book this class
                    </Caption>
                  </View>
                )}
              </ScrollView>

              <PaperButton
                mode="contained"
                onPress={() => setEnrollmentModalVisible(false)}
                style={styles.modalConfirmButton}
              >
                Close
              </PaperButton>
            </PaperCard.Content>
          </PaperCard>
        </Modal>
      </Portal>

      {/* Client Assignment Modal */}
      <Portal>
        <Modal
          visible={assignClientModalVisible}
          onDismiss={() => {
            setAssignClientModalVisible(false);
            resetAssignmentModal();
          }}
          contentContainerStyle={styles.modalContainer}
        >
          <PaperCard style={styles.modalCard}>
            <PaperCard.Content style={styles.modalContent}>
              <H2 style={styles.modalTitle}>Assign Client to Class</H2>
              
              {selectedClassForAssignment && (
                <View style={styles.classInfoSection}>
                  <View style={styles.classDetailRow}>
                    <WebCompatibleIcon name="event" size={20} color={Colors.light.textSecondary} />
                    <Body style={styles.className}>{selectedClassForAssignment.name}</Body>
                  </View>
                  <View style={styles.classDetailRow}>
                    <WebCompatibleIcon name="calendar-today" size={16} color={Colors.light.textSecondary} />
                    <Caption style={styles.classDetailText}>
                      {selectedClassForAssignment.date} at {formatTime(selectedClassForAssignment.time)}
                    </Caption>
                  </View>
                  <View style={styles.classDetailRow}>
                    <WebCompatibleIcon name="people" size={16} color={Colors.light.textSecondary} />
                    <Caption style={styles.classDetailText}>
                      {selectedClassForAssignment.enrolled}/{selectedClassForAssignment.capacity} enrolled
                    </Caption>
                  </View>
                </View>
              )}

              <ScrollView style={styles.assignmentForm} showsVerticalScrollIndicator={false}>
                {/* Client Selection */}
                <View style={styles.formSection}>
                  <Caption style={styles.sectionLabel}>Select Client *</Caption>
                  {loadingClients ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color={Colors.light.accent} />
                      <Caption style={styles.loadingText}>Loading clients...</Caption>
                    </View>
                  ) : (
                    <ScrollView style={styles.clientsList} nestedScrollEnabled>
                      {availableClients.map((client) => (
                        <TouchableOpacity
                          key={client.id}
                          style={[
                            styles.clientItem,
                            selectedClientId === client.id && styles.selectedClientItem
                          ]}
                          onPress={() => setSelectedClientId(client.id)}
                        >
                          <View style={styles.clientInfo}>
                            <Body style={styles.clientName}>{client.name}</Body>
                            <Caption style={styles.clientEmail}>{client.email}</Caption>
                          </View>
                          {selectedClientId === client.id && (
                            <WebCompatibleIcon name="check-circle" size={20} color={Colors.light.success} />
                          )}
                        </TouchableOpacity>
                      ))}
                      {availableClients.length === 0 && !loadingClients && (
                        <View style={styles.emptyClientsState}>
                          <WebCompatibleIcon name="people-outline" size={32} color={Colors.light.textMuted} />
                          <Body style={styles.emptyClientsText}>No clients assigned to you</Body>
                          <Caption style={styles.emptyClientsSubtext}>
                            Please contact admin to get clients assigned to you
                          </Caption>
                        </View>
                      )}
                    </ScrollView>
                  )}
                </View>

                {/* Override Restrictions Toggle */}
                <View style={styles.formSection}>
                  <TouchableOpacity
                    style={styles.toggleRow}
                    onPress={() => setOverrideRestrictions(!overrideRestrictions)}
                  >
                    <View style={styles.toggleInfo}>
                      <Body style={styles.toggleLabel}>Override Package Restrictions</Body>
                      <Caption style={styles.toggleDescription}>
                        {overrideRestrictions 
                          ? 'Assign without checking package credits'
                          : 'Assign and deduct from client package'
                        }
                      </Caption>
                    </View>
                    <View style={[
                      styles.toggleSwitch,
                      overrideRestrictions && styles.toggleSwitchActive
                    ]}>
                      <View style={[
                        styles.toggleIndicator,
                        overrideRestrictions && styles.toggleIndicatorActive
                      ]} />
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Notes */}
                <TextInput
                  label="Notes (optional)"
                  value={assignmentNotes}
                  onChangeText={setAssignmentNotes}
                  style={styles.input}
                  mode="outlined"
                  multiline
                  numberOfLines={2}
                  placeholder="Add notes about this assignment..."
                />
              </ScrollView>

              <View style={styles.modalActions}>
                <PaperButton
                  mode="outlined"
                  onPress={() => {
                    setAssignClientModalVisible(false);
                    resetAssignmentModal();
                  }}
                  style={styles.modalCancelButton}
                  disabled={assigningClient}
                >
                  Cancel
                </PaperButton>
                <PaperButton
                  mode="contained"
                  onPress={handleAssignClientToClass}
                  style={styles.modalConfirmButton}
                  disabled={!selectedClientId || assigningClient}
                  loading={assigningClient}
                >
                  {overrideRestrictions ? 'Assign (Override)' : 'Assign Client'}
                </PaperButton>
              </View>
            </PaperCard.Content>
          </PaperCard>
        </Modal>
      </Portal>

      {/* Client Unassignment Modal */}
      <Portal>
        <Modal
          visible={unassignClientModalVisible}
          onDismiss={() => {
            setUnassignClientModalVisible(false);
            resetUnassignmentModal();
          }}
          contentContainerStyle={styles.modalContainer}
        >
          <PaperCard style={styles.modalCard}>
            <PaperCard.Content style={styles.modalContent}>
              <H2 style={styles.modalTitle}>Unassign Client from Class</H2>
              
              {selectedClassForUnassignment && (
                <View style={styles.classInfoSection}>
                  <View style={styles.classDetailRow}>
                    <WebCompatibleIcon name="event" size={20} color={Colors.light.textSecondary} />
                    <Body style={styles.className}>{selectedClassForUnassignment.name}</Body>
                  </View>
                  <View style={styles.classDetailRow}>
                    <WebCompatibleIcon name="calendar-today" size={16} color={Colors.light.textSecondary} />
                    <Caption style={styles.classDetailText}>
                      {selectedClassForUnassignment.date} at {formatTime(selectedClassForUnassignment.time)}
                    </Caption>
                  </View>
                  <View style={styles.classDetailRow}>
                    <WebCompatibleIcon name="people" size={16} color={Colors.light.textSecondary} />
                    <Caption style={styles.classDetailText}>
                      {selectedClassForUnassignment.enrolled}/{selectedClassForUnassignment.capacity} enrolled
                    </Caption>
                  </View>
                </View>
              )}

              <ScrollView style={styles.assignmentForm} showsVerticalScrollIndicator={false}>
                {/* Enrolled Clients Selection */}
                <View style={styles.formSection}>
                  <Caption style={styles.sectionLabel}>Select Client to Unassign *</Caption>
                  {loadingEnrolledClients ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color={Colors.light.accent} />
                      <Caption style={styles.loadingText}>Loading enrolled clients...</Caption>
                    </View>
                  ) : (
                    <ScrollView style={styles.clientsList} nestedScrollEnabled>
                      {enrolledClients.map((client, index) => (
                        <TouchableOpacity
                          key={index}
                          style={[
                            styles.clientItem,
                            selectedClientForUnassignment?.user_id === client.user_id && styles.selectedClientItem
                          ]}
                          onPress={() => setSelectedClientForUnassignment(client)}
                        >
                          <View style={styles.clientInfo}>
                            <Body style={styles.clientName}>
                              {client.user_name || client.name || 'Unknown User'}
                            </Body>
                            <Caption style={styles.clientEmail}>
                              {client.user_email || client.email || 'No email'}
                            </Caption>
                          </View>
                          {selectedClientForUnassignment?.user_id === client.user_id && (
                            <WebCompatibleIcon name="check-circle" size={20} color={Colors.light.warning} />
                          )}
                        </TouchableOpacity>
                      ))}
                      {enrolledClients.length === 0 && !loadingEnrolledClients && (
                        <View style={styles.emptyClientsState}>
                          <WebCompatibleIcon name="people-outline" size={32} color={Colors.light.textMuted} />
                          <Body style={styles.emptyClientsText}>No clients enrolled</Body>
                          <Caption style={styles.emptyClientsSubtext}>
                            This class has no enrolled clients to unassign
                          </Caption>
                        </View>
                      )}
                    </ScrollView>
                  )}
                </View>

                {/* Credit Restoration Info */}
                <View style={styles.formSection}>
                  <View style={styles.infoBox}>
                    <WebCompatibleIcon name="info" size={16} color={Colors.light.primary} />
                    <Caption style={styles.infoText}>
                      System will automatically detect if this was an override assignment or normal assignment. Credits will only be restored for normal assignments where credits were originally deducted.
                    </Caption>
                  </View>
                </View>
              </ScrollView>

              <View style={styles.modalActions}>
                <PaperButton
                  mode="outlined"
                  onPress={() => {
                    setUnassignClientModalVisible(false);
                    resetUnassignmentModal();
                  }}
                  style={styles.modalCancelButton}
                  disabled={unassigningClient}
                >
                  Cancel
                </PaperButton>
                <PaperButton
                  mode="contained"
                  onPress={handleUnassignClientFromClass}
                  style={[styles.modalConfirmButton, { backgroundColor: Colors.light.warning }]}
                  disabled={!selectedClientForUnassignment || unassigningClient}
                  loading={unassigningClient}
                >
                  Unassign Client
                </PaperButton>
              </View>
            </PaperCard.Content>
          </PaperCard>
        </Modal>
      </Portal>

      {/* Date/Time Pickers - In separate Portals to appear on top */}
      <Portal>
        {showDatePicker && (
          <View style={styles.dateTimePickerContainer}>
            <View style={styles.dateTimePickerWrapper}>
              <View style={styles.dateTimePickerHeader}>
                <PaperButton
                  mode="text"
                  onPress={() => setShowDatePicker(false)}
                  style={styles.dateTimePickerCloseButton}
                >
                  Cancel
                </PaperButton>
                <Body style={styles.dateTimePickerTitle}>Select Date</Body>
                <PaperButton
                  mode="text"
                  onPress={() => setShowDatePicker(false)}
                  style={styles.dateTimePickerCloseButton}
                >
                  Done
                </PaperButton>
              </View>
              <DateTimePicker
                value={pickerDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onDateChange}
                minimumDate={new Date()}
                style={[
                  Platform.OS === 'ios' ? { backgroundColor: 'white' } : {},
                  styles.dateTimePicker
                ]}
              />
            </View>
          </View>
        )}
      </Portal>

      <Portal>
        {showTimePicker && (
          <View style={styles.dateTimePickerContainer}>
            <View style={styles.dateTimePickerWrapper}>
              <View style={styles.dateTimePickerHeader}>
                <PaperButton
                  mode="text"
                  onPress={() => setShowTimePicker(false)}
                  style={styles.dateTimePickerCloseButton}
                >
                  Cancel
                </PaperButton>
                <Body style={styles.dateTimePickerTitle}>Select Time</Body>
                <PaperButton
                  mode="text"
                  onPress={() => setShowTimePicker(false)}
                  style={styles.dateTimePickerCloseButton}
                >
                  Done
                </PaperButton>
              </View>
              <DateTimePicker
                value={pickerTime}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onTimeChange}
                style={[
                  Platform.OS === 'ios' ? { backgroundColor: 'white' } : {},
                  styles.dateTimePicker
                ]}
              />
            </View>
          </View>
        )}
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    padding: spacing.lg,
    paddingTop: 60,
    backgroundColor: Colors.light.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  headerTitle: {
    color: Colors.light.textOnAccent,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  card: {
    backgroundColor: Colors.light.surface,
    borderRadius: layout.borderRadius,
    ...shadows.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginBottom: spacing.md,
  },
  cardContent: {
    padding: spacing.lg,
  },
  cardTitle: {
    color: Colors.light.text,
    marginBottom: spacing.md,
  },
  
  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  createButton: {
    backgroundColor: Colors.light.accent,
    borderRadius: spacing.sm,
  },
  createButtonLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.textOnAccent,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.light.surfaceVariant,
    padding: spacing.md,
    borderRadius: spacing.sm,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
  },
  statLabel: {
    textAlign: 'center',
    color: Colors.light.textSecondary,
  },

  // View Toggle
  viewToggle: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  toggleButton: {
    flex: 1,
    borderRadius: layout.borderRadius,
    borderColor: Colors.light.border,
  },
  activeToggle: {
    backgroundColor: Colors.light.accent,
  },
  activeToggleLabel: {
    color: Colors.light.textOnAccent,
    fontWeight: '600',
  },
  inactiveToggleLabel: {
    color: Colors.light.textSecondary,
  },

  // Calendar
  calendar: {
    borderRadius: layout.borderRadius,
    marginTop: spacing.sm,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyStateText: {
    color: Colors.light.textSecondary,
  },
  emptyStateSubtext: {
    color: Colors.light.textMuted,
    textAlign: 'center',
    marginBottom: spacing.md,
  },

  // Class Items
  classItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.divider,
  },
  classInfo: {
    flex: 1,
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  className: {
    fontWeight: '600',
    color: Colors.light.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  chipContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  classDetails: {
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  classDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  classDetailText: {
    color: Colors.light.textSecondary,
  },
  pastIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  pastText: {
    color: Colors.light.textMuted,
    fontStyle: 'italic',
  },
  classActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionButton: {
    width: 40,
    height: 40,
    backgroundColor: Colors.light.surfaceVariant,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // FAB
  fab: {
    position: 'absolute',
    margin: spacing.md,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.light.accent,
    ...shadows.accent,
  },

  // Modal Styles
  modalContainer: {
    padding: spacing.lg,
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: layout.borderRadius,
  },
  modalContent: {
    padding: spacing.xl,
  },
  modalTitle: {
    color: Colors.light.text,
    marginBottom: spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  modalCancelButton: {
    flex: 1,
    borderColor: Colors.light.border,
    borderRadius: layout.borderRadius,
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: Colors.light.accent,
    borderRadius: layout.borderRadius,
  },
  
  // Form styles
  formContainer: {
    maxHeight: 400,
    marginBottom: spacing.md,
  },
  input: {
    marginBottom: spacing.sm,
  },
  pickerLabel: {
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: layout.borderRadius,
    backgroundColor: Colors.light.surface,
    gap: spacing.sm,
    minHeight: 56, // Same as TextInput height
  },
  dateTimeText: {
    color: Colors.light.text,
    flex: 1,
    fontSize: 16,
  },
  placeholderText: {
    color: Colors.light.textMuted,
  },
  availabilityIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  availabilityText: {
    color: Colors.light.textSecondary,
  },
  segmentedButtons: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  
  // Enrollment modal styles
  classInfoSection: {
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.divider,
  },
  classDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  enrollmentsList: {
    maxHeight: 300,
    marginBottom: spacing.md,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.sm,
    color: Colors.light.textSecondary,
  },
  enrollmentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.divider,
  },
  enrollmentInfo: {
    flex: 1,
  },
  enrollmentName: {
    fontWeight: '600',
    color: Colors.light.text,
  },
  enrollmentEmail: {
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  enrollmentStatus: {
    marginLeft: spacing.sm,
  },
  emptyEnrollments: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyEnrollmentsText: {
    marginTop: spacing.sm,
    color: Colors.light.textMuted,
    fontWeight: '600',
  },
  emptyEnrollmentsSubtext: {
    marginTop: spacing.xs,
    color: Colors.light.textMuted,
    textAlign: 'center',
  },
  
  // Date/Time Picker styles
  dateTimePickerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99999,
    elevation: 99999,
  },
  dateTimePicker: {
    backgroundColor: Colors.light.surface,
    borderRadius: layout.borderRadius,
    ...shadows.modal,
  },
  dateTimePickerWrapper: {
    backgroundColor: Colors.light.surface,
    borderRadius: layout.borderRadius,
    padding: spacing.md,
    ...shadows.modal,
    minWidth: 300,
  },
  dateTimePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  dateTimePickerTitle: {
    fontWeight: '600',
    color: Colors.light.text,
  },
  dateTimePickerCloseButton: {
    minWidth: 60,
  },
  
  // Client Assignment Modal Styles
  assignmentForm: {
    maxHeight: 350,
    marginBottom: spacing.md,
  },
  formSection: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontWeight: '600',
    marginBottom: spacing.sm,
    color: Colors.light.text,
  },
  clientsList: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: layout.borderRadius,
    backgroundColor: Colors.light.surface,
  },
  clientItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.divider,
  },
  selectedClientItem: {
    backgroundColor: Colors.light.accent + '20',
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontWeight: '600',
    color: Colors.light.text,
  },
  clientEmail: {
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  emptyClientsState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyClientsText: {
    color: Colors.light.textMuted,
    marginTop: spacing.sm,
  },
  emptyClientsSubtext: {
    color: Colors.light.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: layout.borderRadius,
    backgroundColor: Colors.light.surface,
  },
  toggleInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  toggleLabel: {
    fontWeight: '600',
    color: Colors.light.text,
  },
  toggleDescription: {
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  toggleSwitch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.light.border,
    padding: 2,
    justifyContent: 'center',
  },
  toggleSwitchActive: {
    backgroundColor: Colors.light.success,
  },
  toggleIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'white',
    ...shadows.button,
  },
  toggleIndicatorActive: {
    alignSelf: 'flex-end',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: Colors.light.primary + '10',
    borderRadius: layout.borderRadius,
    borderLeftWidth: 4,
    borderLeftColor: Colors.light.primary,
    gap: spacing.sm,
  },
  infoText: {
    flex: 1,
    color: Colors.light.textSecondary,
    lineHeight: 18,
  },
  
  // Visibility Toggle Styles
  visibilityContainer: {
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  visibilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: Colors.light.surface,
    borderRadius: layout.borderRadius,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  visibilityTextContainer: {
    flex: 1,
    marginLeft: spacing.md,
  },
  visibilityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 2,
  },
  visibilityDescription: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    lineHeight: 16,
  },
  visibilityToggle: {
    minWidth: 80,
  },
});

export default ScheduleOverview;