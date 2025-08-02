import StatusChip from '@/components/ui/StatusChip';
import { Body, Caption, H1, H2 } from '@/components/ui/Typography';
import { Colors } from '@/constants/Colors';
import { layout, spacing } from '@/constants/Spacing';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useEffect, useState } from 'react';
import { Alert, Platform, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { ActivityIndicator, FAB, Modal, Button as PaperButton, Card as PaperCard, Portal, SegmentedButtons, TextInput } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import WebCompatibleIcon from '../../components/WebCompatibleIcon';
import { bookingService } from '../../services/bookingService';
import { classService } from '../../services/classService';
import { notificationService } from '../../services/notificationService';
import { AppDispatch, RootState } from '../../store';
import { shadows } from '../../utils/shadows';

interface Class {
  id: number;
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
    notes: ''
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

  useEffect(() => {
    loadSchedule();
  }, []);

  // Check room availability when date, time, or room changes
  useEffect(() => {
    if (newClass.date && newClass.time && newClass.room) {
      checkRoomAvailability();
    }
  }, [newClass.date, newClass.time, newClass.room, newClass.duration]);

  const loadSchedule = async () => {
    try {
      setLoading(true);
      const response = await classService.getClasses({
        instructor: user?.id?.toString(),
        status: 'active'
      });

      if (response.success && response.data) {
        const classesData = response.data.map(cls => ({
          ...cls,
          level: cls.level || 'beginner',
          equipment_type: cls.equipment_type || 'mat'
        }));
        
        setClasses(classesData);
        
        // Check for newly full classes and notify
        classesData.forEach(cls => {
          if (cls.enrolled === cls.capacity && cls.status !== 'full') {
            checkClassCapacityAndNotify(cls);
          }
        });
      }
    } catch (error) {
      console.error('Failed to load schedule:', error);
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

  const checkClassCapacityAndNotify = async (classItem: Class) => {
    try {
      // Check if class is at capacity
      if (classItem.enrolled >= classItem.capacity) {
        // Show immediate notification to instructor
        Alert.alert(
          '🎉 Class Full!',
          `Your class "${classItem.name}" is now full! All ${classItem.capacity} spots are booked.`,
          [
            {
              text: 'View Enrollments',
              onPress: () => viewClassEnrollments(classItem)
            },
            {
              text: 'OK',
              style: 'default'
            }
          ]
        );

        // Send push notification if user has enabled them
        await notificationService.sendClassFullNotification(classItem.id, user?.id);
        
        // Update class status to 'full' if not already
        if (classItem.status !== 'full') {
          await classService.updateClass(classItem.id, { status: 'full' });
          // Refresh the classes list to show updated status
          loadSchedule();
        }
      }
    } catch (error) {
      console.error('Failed to check class capacity:', error);
    }
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
      notes: ''
    });
    
    // Reset picker dates to current
    setPickerDate(now);
    setPickerTime(now);
    
    setCreateModalVisible(true);
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || pickerDate;
    
    // On iOS, keep picker open for continuous interaction
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (event.type === 'set' && selectedDate) {
      setPickerDate(selectedDate);
      const dateString = selectedDate.toISOString().split('T')[0];
      setNewClass(prev => ({ ...prev, date: dateString }));
      
      // Close picker on iOS after selection
      if (Platform.OS === 'ios') {
        setShowDatePicker(false);
      }
    } else if (event.type === 'dismissed') {
      setShowDatePicker(false);
    }
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    const currentTime = selectedTime || pickerTime;
    
    // On iOS, keep picker open for continuous interaction
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    
    if (event.type === 'set' && selectedTime) {
      setPickerTime(selectedTime);
      const timeString = selectedTime.toTimeString().slice(0, 5);
      setNewClass(prev => ({ ...prev, time: timeString }));
      
      // Close picker on iOS after selection
      if (Platform.OS === 'ios') {
        setShowTimePicker(false);
      }
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

      // Validate room availability
      if (newClass.room && roomAvailability[newClass.room] && !roomAvailability[newClass.room].available) {
        Alert.alert('Error', `${newClass.room} is not available at this time. Please choose a different room or time.`);
        return;
      }

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
        notes: newClass.notes
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

  const getMarkedDates = () => {
    const marked: any = {};
    
    classes.forEach(cls => {
      const enrollmentPercentage = (cls.enrolled / cls.capacity) * 100;
      let dotColor = Colors.light.success;
      
      if (enrollmentPercentage >= 100) {
        dotColor = Colors.light.error;
      } else if (enrollmentPercentage >= 80) {
        dotColor = Colors.light.warning;
      }

      marked[cls.date] = {
        marked: true,
        dotColor,
      };
    });

    if (selectedDate) {
      marked[selectedDate] = {
        ...marked[selectedDate],
        selected: true,
        selectedColor: Colors.light.accent,
      };
    }

    return marked;
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
                  style={styles.calendar}
                  theme={{
                    backgroundColor: Colors.light.surface,
                    calendarBackground: Colors.light.surface,
                    textSectionTitleColor: Colors.light.textSecondary,
                    dayTextColor: Colors.light.text,
                    todayTextColor: Colors.light.accent,
                    selectedDayBackgroundColor: Colors.light.accent,
                    selectedDayTextColor: 'white',
                    monthTextColor: Colors.light.text,
                    indicatorColor: Colors.light.accent,
                    textDayFontWeight: '600',
                    textMonthFontWeight: 'bold',
                    textDayHeaderFontWeight: '600',
                    arrowColor: Colors.light.accent,
                  }}
                  markedDates={getMarkedDates()}
                  onDayPress={(day) => setSelectedDate(day.dateString)}
                  current={new Date().toISOString().split('T')[0]}
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
                      <View key={cls.id} style={styles.classItem}>
                        <TouchableOpacity 
                          style={styles.classInfo}
                          onPress={() => viewClassEnrollments(cls)}
                        >
                          <View style={styles.classHeader}>
                            <Body style={styles.className}>{cls.name}</Body>
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
                              <Caption style={styles.classDetailText}>
                                {`${formatTime(cls.time)} (${cls.duration} min)`}
                              </Caption>
                            </View>

                            <View style={styles.classDetailItem}>
                              <WebCompatibleIcon name="people" size={16} color={Colors.light.textSecondary} />
                              <Caption style={styles.classDetailText}>
                                {cls.enrolled}/{cls.capacity} enrolled
                              </Caption>
                            </View>
                          </View>
                        </TouchableOpacity>

                        <View style={styles.classActions}>
                          <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => handleDeleteClass(cls.id)}
                          >
                            <WebCompatibleIcon name="delete" size={20} color={Colors.light.error} />
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
                  <View key={cls.id} style={styles.classItem}>
                    <TouchableOpacity 
                      style={styles.classInfo}
                      onPress={() => viewClassEnrollments(cls)}
                    >
                      <View style={styles.classHeader}>
                        <Body style={styles.className}>{cls.name}</Body>
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
                          <Caption style={styles.classDetailText}>{cls.date}</Caption>
                        </View>
                        
                        <View style={styles.classDetailItem}>
                          <WebCompatibleIcon name="schedule" size={16} color={Colors.light.textSecondary} />
                          <Caption style={styles.classDetailText}>
                            {`${formatTime(cls.time)} (${cls.duration} min)`}
                          </Caption>
                        </View>

                        <View style={styles.classDetailItem}>
                          <WebCompatibleIcon name="fitness-center" size={16} color={Colors.light.textSecondary} />
                          <Caption style={styles.classDetailText}>{cls.equipment_type}</Caption>
                        </View>
                        
                        <View style={styles.classDetailItem}>
                          <WebCompatibleIcon name="people" size={16} color={Colors.light.textSecondary} />
                          <Caption style={styles.classDetailText}>
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
                        style={styles.actionButton}
                        onPress={() => handleDeleteClass(cls.id)}
                      >
                        <WebCompatibleIcon name="delete" size={20} color={Colors.light.error} />
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
                    <Body style={[styles.dateTimeText, !newClass.date && styles.placeholderText]}>
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
                    <Body style={[styles.dateTimeText, !newClass.time && styles.placeholderText]}>
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
                    <Caption style={[styles.availabilityText, { 
                      color: roomAvailability[newClass.room].available ? Colors.light.success : Colors.light.error 
                    }]}>
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

      {/* Date/Time Pickers - Outside Modal for proper display */}
      {showDatePicker && (
        <DateTimePicker
          value={pickerDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
          minimumDate={new Date()}
          style={Platform.OS === 'ios' ? { backgroundColor: 'white' } : {}}
        />
      )}

      {showTimePicker && (
        <DateTimePicker
          value={pickerTime}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onTimeChange}
          style={Platform.OS === 'ios' ? { backgroundColor: 'white' } : {}}
        />
      )}
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
});

export default ScheduleOverview;