import { Body, Caption, H2, H3 } from '@/components/ui/Typography';
import { Colors } from '@/constants/Colors';
import { layout, spacing } from '@/constants/Spacing';
import WebCompatibleIcon from '@/src/components/WebCompatibleIcon';
import { bookingService } from '@/src/services/bookingService';
import { BackendClass, classService, CreateClassRequest, UpdateClassRequest } from '@/src/services/classService';
import { BackendUser, userService } from '@/src/services/userService';
import { RootState } from '@/src/store';
import { shadows } from '@/src/utils/shadows';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Dimensions, Platform, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import {
  ActivityIndicator,
  Button,
  Chip,
  DataTable,
  Divider,
  Icon,
  IconButton,
  Menu,
  Modal,
  Portal,
  Searchbar,
  SegmentedButtons,
  Surface,
  Switch,
  TextInput
} from 'react-native-paper';
import { useSelector } from 'react-redux';

const { width: screenWidth } = Dimensions.get('window');
const isLargeScreen = screenWidth > 1024;

interface CalendarClass extends BackendClass {
  color?: string;
  isSelected?: boolean;
}

function PCClassManagement() {
  // Redux state
  const { user } = useSelector((state: RootState) => state.auth);
  
  // State management
  const [classes, setClasses] = useState<BackendClass[]>([]);
  const [instructors, setInstructors] = useState<BackendUser[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState<'calendar' | 'table' | 'hybrid'>('hybrid');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClasses, setSelectedClasses] = useState<number[]>([]);
  const [markedDates, setMarkedDates] = useState<any>({});
  
  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [editingClass, setEditingClass] = useState<BackendClass | null>(null);
  const [saving, setSaving] = useState(false);
  const [batchMenuVisible, setBatchMenuVisible] = useState(false);
  const [instructorMenuVisible, setInstructorMenuVisible] = useState(false);
  const [bookingsModalVisible, setBookingsModalVisible] = useState(false);
  const [selectedClassForBookings, setSelectedClassForBookings] = useState<BackendClass | null>(null);
  const [updatingBooking, setUpdatingBooking] = useState<number | null>(null);
  const [bookingStatusMenuVisible, setBookingStatusMenuVisible] = useState<number | null>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  
  // Assign client modal states
  const [assignClientModalVisible, setAssignClientModalVisible] = useState(false);
  const [selectedClassForAssignment, setSelectedClassForAssignment] = useState<BackendClass | null>(null);
  const [clients, setClients] = useState<BackendUser[]>([]);
  const [selectedClient, setSelectedClient] = useState<BackendUser | null>(null);
  const [assignNotes, setAssignNotes] = useState('');
  const [overrideRestrictions, setOverrideRestrictions] = useState(false);
  const [assigningClient, setAssigningClient] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [clientMenuVisible, setClientMenuVisible] = useState(false);
  
  // Cancel booking modal states
  const [cancelBookingModalVisible, setCancelBookingModalVisible] = useState(false);
  const [selectedClassForCancellation, setSelectedClassForCancellation] = useState<BackendClass | null>(null);
  const [selectedBookingForCancellation, setSelectedBookingForCancellation] = useState<any>(null);
  const [cancelNotes, setCancelNotes] = useState('');
  const [cancellingBooking, setCancellingBooking] = useState(false);
  const [cancelBookingMenuVisible, setCancelBookingMenuVisible] = useState(false);
  
  // Error modal states
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorTitle, setErrorTitle] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [errorActions, setErrorActions] = useState<Array<{text: string, onPress: () => void, style?: 'default' | 'cancel' | 'destructive'}>>([]);
  
  // Form data
  const [formData, setFormData] = useState({
    name: '',
    instructorId: '',
    instructorName: '',
    date: '',
    time: '',
    duration: 60,
    category: 'group' as 'personal' | 'group',
    capacity: 10,
    equipment: '',
    description: '',
    equipmentType: 'mat' as BackendClass['equipment_type'],
    room: '' as 'Reformer Room' | 'Mat Room' | 'Cadillac Room' | 'Wall Room' | '',
    notes: '', // Add notes field
  });

  // Room availability state
  const [roomAvailability, setRoomAvailability] = useState<{[key: string]: {available: boolean, conflictClass: any}}>({});
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  
  // Instructor availability state
  const [instructorAvailability, setInstructorAvailability] = useState<{[key: string]: {available: boolean, conflictClass: any}}>({});
  const [checkingInstructorAvailability, setCheckingInstructorAvailability] = useState(false);

  useEffect(() => {
    loadInitialData();
    loadTemplates();
  }, []);

  useEffect(() => {
    generateMarkedDates();
  }, [classes, selectedDate, bookings]);

  // Check room availability when date, time, or room changes
  useEffect(() => {
    if (formData.date && formData.time && formData.room) {
      checkRoomAvailability();
    }
  }, [formData.date, formData.time, formData.room, formData.duration]);

  // Check instructor availability when date, time, or instructor changes
  useEffect(() => {
    if (formData.date && formData.time && formData.instructorId) {
      checkInstructorAvailability();
    }
  }, [formData.date, formData.time, formData.instructorId, formData.duration]);

  const checkRoomAvailability = async () => {
    if (!formData.date || !formData.time || !formData.room) return;
    
    try {
      setCheckingAvailability(true);
      const response = await classService.checkRoomAvailability(
        formData.date,
        formData.time,
        formData.duration
      );
      
      if (response.success && response.data) {
        setRoomAvailability(response.data);
      }
    } catch (error) {
      console.error('Error checking room availability:', error);
    } finally {
      setCheckingAvailability(false);
    }
  };

  const checkInstructorAvailability = async () => {
    if (!formData.date || !formData.time || !formData.instructorId) return;
    
    try {
      setCheckingInstructorAvailability(true);
      const response = await classService.checkInstructorConflict(
        formData.instructorId,
        formData.date,
        formData.time,
        formData.duration,
        editingClass?.id
      );
      
      if (response.success && response.data) {
        setInstructorAvailability({
          [formData.instructorId]: {
            available: !response.data.hasConflict,
            conflictClass: response.data.conflictClass || null
          }
        });
      }
    } catch (error) {
      console.error('Error checking instructor availability:', error);
    } finally {
      setCheckingInstructorAvailability(false);
    }
  };

  const loadInitialData = async () => {
    await Promise.all([loadClasses(), loadInstructors(), loadBookings()]);
  };

  const loadClasses = async () => {
    try {
      setLoading(true);
      const response = await classService.getClasses({
        status: filterStatus === 'all' ? undefined : filterStatus
      });
      
      if (response.success && response.data) {
        setClasses(response.data);
      } else {
        console.error('Failed to load classes:', response.error);
        setClasses([]);
      }
    } catch (error) {
      console.error('Error loading classes:', error);
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  const loadInstructors = async () => {
    try {
      console.log('🎓 Loading instructors...');
      const response = await userService.getInstructors();
      console.log('🎓 Instructors response:', response);
      if (response.success && response.data) {
        setInstructors(response.data);
        console.log('🎓 Loaded instructors:', response.data.length, 'instructors:', response.data.map((i: any) => `${i.name} (ID: ${i.id})`));
      } else {
        console.error('❌ Failed to load instructors:', response.error);
        setInstructors([]);
      }
    } catch (error) {
      console.error('❌ Error loading instructors:', error);
      setInstructors([]);
    }
  };

  const loadBookings = async () => {
    try {
      const response = await bookingService.getAllBookings();
      if (response.success && response.data) {
        setBookings(Array.isArray(response.data) ? response.data : []);
      } else {
        setBookings([]);
      }
    } catch (error) {
      console.error('Error loading bookings:', error);
      setBookings([]);
    }
  };

  const generateMarkedDates = useCallback(() => {
    const marked: any = {};
    
    classes.forEach((classItem) => {
      const date = classItem.date;
      if (!marked[date]) {
        marked[date] = { dots: [], periods: [] };
      }
      
      // Use the new status color logic that matches instructor view
      const color = getClassStatusColor(classItem);
      
      marked[date].dots.push({
        key: `class-${classItem.id}`,
        color: color,
        selectedDotColor: color
      });
    });

    // Highlight selected date
    if (selectedDate) {
      if (!marked[selectedDate]) {
        marked[selectedDate] = { dots: [] };
      }
      marked[selectedDate].selected = true;
      marked[selectedDate].selectedColor = Colors.light.accent;
    }

    setMarkedDates(marked);
  }, [classes, selectedDate, bookings]);

  const getClassesForDate = (date: string) => {
    return classes
      .filter(classItem => classItem.date === date)
      .sort((a, b) => a.time.localeCompare(b.time));
  };

  const filteredClasses = classes.filter(classItem => {
    const matchesSearch = classItem.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         classItem.instructor_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const handleCreateClass = () => {
    setEditingClass(null);
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().slice(0, 5);
    
    const initialFormData = {
      name: '',
      instructorId: '',
      instructorName: '',
      date: selectedDate || today,
      time: currentTime,
      duration: 60,
      category: 'group' as 'personal' | 'group',
      capacity: 10,
      equipment: '',
      description: '',
      equipmentType: 'mat' as 'mat' | 'reformer' | 'both',
      room: '' as 'Reformer Room' | 'Mat Room' | 'Cadillac Room' | 'Wall Room' | '',
      level: '' as '' | 'Beginner' | 'Intermediate' | 'Advanced',
      notes: '', // Initialize notes
    };
    
    console.log('🎯 Initializing form data:', initialFormData);
    setFormData(initialFormData);
    setModalVisible(true);
  };

  const handleEditClass = (classItem: BackendClass) => {
    setEditingClass(classItem);
    setFormData({
      name: classItem.name,
      instructorId: classItem.instructor_id.toString(),
      instructorName: classItem.instructor_name,
      date: classItem.date,
      time: classItem.time,
      duration: classItem.duration,
      category: classItem.category,
      capacity: classItem.capacity,
      equipment: classItem.equipment.join(', '),
      description: classItem.description || '',
      equipmentType: classItem.equipment_type,
      room: (classItem as any).room || '',
      
      notes: classItem.notes || '', // Set notes from classItem
    });
    setModalVisible(true);
  };

  const calculateEndTime = (startTime: string, duration: number): string => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + duration;
    const endHours = Math.floor(endMinutes / 60);
    const remainingMinutes = endMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${remainingMinutes.toString().padStart(2, '0')}`;
  };

  const handleSaveClass = async () => {
    console.log('🎯 Form validation starting...');
    console.log('🎯 Available instructors:', instructors.length);
    console.log('🎯 Form data instructorId:', formData.instructorId, 'type:', typeof formData.instructorId);
    console.log('🎯 Form data instructorName:', formData.instructorName);

    // Check if instructors are available
    if (instructors.length === 0) {
      Alert.alert('Error', 'No instructors available. Please make sure instructors are created in the system first.');
      return;
    }

    if (!formData.name || !formData.instructorId || !formData.date || !formData.time) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    // Validate instructor ID is not null or empty
    if (!formData.instructorId || formData.instructorId === '' || formData.instructorId === 'null') {
      Alert.alert('Error', `Please select an instructor from the available ${instructors.length} instructor(s)`);
      return;
    }

    // Debug: Log the form data before submission
    console.log('🎯 Form data being submitted:', {
      name: formData.name,
      instructorId: formData.instructorId,
      date: formData.date,
      time: formData.time,
      duration: formData.duration,
      category: formData.category,
      capacity: formData.capacity,
      equipment: formData.equipment,
      description: formData.description,
      equipmentType: formData.equipmentType,
      room: formData.room,
      notes: formData.notes
    });

    try {
      setSaving(true);

      // Check for instructor conflicts using the backend service
      const conflictResponse = await classService.checkInstructorConflict(
        formData.instructorId, // Keep as string for Supabase UUID
        formData.date,
        formData.time,
        formData.duration,
        editingClass?.id
      );

      if (conflictResponse.success && conflictResponse.data?.hasConflict) {
        const conflictClass = conflictResponse.data.conflictClass;
        const conflictEndTime = conflictClass ? 
          calculateEndTime(conflictClass.time, conflictClass.duration) : '';
        const newEndTime = calculateEndTime(formData.time, formData.duration);
        
        Alert.alert(
          'Scheduling Conflict', 
          `${formData.instructorName} already has a class "${conflictClass?.name}" scheduled from ${conflictClass?.time} to ${conflictEndTime} on ${new Date(formData.date).toLocaleDateString()}.\n\nThis overlaps with your requested time ${formData.time} to ${newEndTime}.\n\nPlease choose a different time or instructor.`
        );
        return;
      }

      const equipmentArray = formData.equipment.split(',').map(item => item.trim()).filter(item => item);
      
      if (editingClass) {
        const updateData: UpdateClassRequest = {
          name: formData.name,
          instructorId: formData.instructorId, // Use string UUID directly for Supabase
          date: formData.date,
          time: formData.time,
          duration: formData.duration,
          category: formData.category,
          capacity: formData.capacity,
          equipment: equipmentArray,
          description: formData.description,
          equipmentType: formData.equipmentType,
          room: formData.room || '',
          notes: formData.notes || undefined, // Include notes in update
        };

        const response = await classService.updateClass(editingClass.id, updateData);
        if (response.success) {
          Alert.alert('Success', 'Class updated successfully');
          await loadClasses();
        } else {
          // Handle instructor conflict errors with better formatting
          if (response.error?.includes('Scheduling Conflict Detected')) {
            const cleanMessage = response.error
              .replace(/⚠️/g, '')
              .replace(/💡/g, '')
              .replace(/•/g, '  •')
              .trim();
            
            // Use web-compatible alert for browser
            alert(`Instructor Busy\n\n${cleanMessage}`);
          } else {
            alert(`Error\n\n${response.error || 'Failed to update class'}`);
          }
          return;
        }
      } else {
        // For Supabase, instructorId is a UUID string, not an integer
        const instructorId = formData.instructorId;
        console.log('🎯 Using instructorId:', instructorId, 'type:', typeof instructorId);
        
        if (!instructorId || instructorId.trim() === '') {
          Alert.alert('Error', 'Invalid instructor selected. Please select a valid instructor.');
          return;
        }

        const createData: CreateClassRequest = {
          name: formData.name,
          instructorId: instructorId,
          date: formData.date,
          time: formData.time,
          duration: formData.duration,
          category: formData.category,
          capacity: formData.capacity,
          equipment: equipmentArray,
          description: formData.description,
          equipmentType: formData.equipmentType,
          room: formData.room || '',
          notes: formData.notes || undefined, // Include notes in create
        };

        const response = await classService.createClass(createData);
        if (response.success) {
          Alert.alert('Success', 'Class created successfully');
          await loadClasses();
        } else {
          // Handle instructor conflict errors with better formatting
          if (response.error?.includes('Scheduling Conflict Detected')) {
            const cleanMessage = response.error
              .replace(/⚠️/g, '')
              .replace(/💡/g, '')
              .replace(/•/g, '  •')
              .trim();
            
            // Use web-compatible alert for browser
            alert(`Instructor Busy\n\n${cleanMessage}`);
          } else {
            alert(`Error\n\n${response.error || 'Failed to create class'}`);
          }
          return;
        }
      }
      
      setModalVisible(false);
    } catch (error) {
      console.error('Error saving class:', error);
      Alert.alert('Error', 'Failed to save class');
    } finally {
      setSaving(false);
    }
  };

  const handleBatchDelete = () => {
    if (selectedClasses.length === 0) return;
    
    Alert.alert(
      'Delete Classes',
      `Are you sure you want to delete ${selectedClasses.length} selected classes?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await Promise.all(
                selectedClasses.map(classId => classService.deleteClass(classId))
              );
              setSelectedClasses([]);
              await loadClasses();
              Alert.alert('Success', 'Selected classes deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete some classes');
            }
          }
        }
      ]
    );
  };

  // Calendar only (for hybrid view left side)
  const renderCalendarOnly = () => {
    return (
      <View style={styles.calendarSection}>
        <Calendar
          current={selectedDate}
          onDayPress={(day) => setSelectedDate(day.dateString)}
          markingType={'multi-dot'}
          markedDates={markedDates}
          theme={{
            backgroundColor: Colors.light.surface,
            calendarBackground: Colors.light.surface,
            selectedDayBackgroundColor: Colors.light.accent,
            selectedDayTextColor: Colors.light.textOnAccent,
            todayTextColor: Colors.light.primary,
            dayTextColor: Colors.light.text,
            textDisabledColor: Colors.light.textMuted,
            dotColor: Colors.light.primary,
            selectedDotColor: Colors.light.textOnAccent,
            arrowColor: Colors.light.primary,
            monthTextColor: Colors.light.primary,
            textDayFontSize: isLargeScreen ? 16 : 14,
            textMonthFontSize: isLargeScreen ? 20 : 18,
            textDayHeaderFontSize: isLargeScreen ? 14 : 12,
            textDayFontWeight: '500',
            textMonthFontWeight: '600',
            textDayHeaderFontWeight: '500',
          }}
          style={styles.pcCalendar}
        />
      </View>
    );
  };

  // Calendar with classes below (for calendar view)
  const renderCalendarView = () => {
    const dayClasses = getClassesForDate(selectedDate);
    
    return (
      <View style={{...styles.calendarSection, padding: spacing.sm}}>
        <Calendar
          current={selectedDate}
          onDayPress={(day) => setSelectedDate(day.dateString)}
          markingType={'multi-dot'}
          markedDates={markedDates}
          theme={{
            backgroundColor: Colors.light.surface,
            calendarBackground: Colors.light.surface,
            selectedDayBackgroundColor: Colors.light.accent,
            selectedDayTextColor: Colors.light.textOnAccent,
            todayTextColor: Colors.light.primary,
            dayTextColor: Colors.light.text,
            textDisabledColor: Colors.light.textMuted,
            dotColor: Colors.light.primary,
            selectedDotColor: Colors.light.textOnAccent,
            arrowColor: Colors.light.primary,
            monthTextColor: Colors.light.primary,
            textDayFontSize: 14,
            textMonthFontSize: 16,
            textDayHeaderFontSize: 12,
          }}
          style={{...styles.calendar, minHeight: isLargeScreen ? 320 : 280}}
        />
        
        {/* Selected Date Classes - Compact View */}
        <View style={styles.calendarClassesSection}>
          <View style={[styles.calendarDayHeader, {marginBottom: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.light.border}]}>
            <Body style={{...styles.calendarDayTitle, fontWeight: '600', fontSize: 16}}>
              {new Date(selectedDate).toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'short', 
                day: 'numeric' 
              }) + ' (' + dayClasses.length + ' ' + (dayClasses.length === 1 ? 'class' : 'classes') + ')'}
            </Body>
            <Button
              mode="contained"
              icon="add"
              onPress={handleCreateClass}
              style={[styles.addClassButton, {paddingHorizontal: spacing.md}]}
              compact
              labelStyle={{fontSize: 14}}
            >
              Add Class
            </Button>
          </View>
          
          {dayClasses.length === 0 ? (
            <View style={[styles.calendarEmptyState, {paddingVertical: spacing.lg, gap: spacing.sm}]}>
              <WebCompatibleIcon name="event" size={32} color={Colors.light.textMuted} />
              <Body style={styles.calendarEmptyText}>No classes scheduled for this date</Body>
            </View>
          ) : (
            <ScrollView 
              style={styles.calendarClassesScrollView}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
              contentContainerStyle={styles.calendarClassesScrollContent}
            >
              <View style={[styles.calendarClassesList, {gap: spacing.sm}]}>
                {dayClasses.map(classItem => (
                  <Surface key={classItem.id} style={styles.calendarClassCard}>
                    <View style={styles.calendarClassHeader}>
                      <View style={styles.calendarClassTime}>
                        <H3 style={styles.calendarTimeText}>{classItem.time}</H3>
                        <Caption style={styles.calendarDurationText}>{classItem.duration + 'min'}</Caption>
                      </View>
                      
                      <View style={styles.calendarClassInfo}>
                        <H3 style={styles.calendarClassName}>{classItem.name}</H3>
                        <Body style={styles.instructorName}>with {classItem.instructor_name}</Body>
                        
                        {/* Room information */}
                        {classItem.room && (
                          <Body style={styles.roomInfo}>📍 {classItem.room}</Body>
                        )}
                        
                        <View style={styles.classStats}>
                          {/* Personal/Group class badge */}
                          <Chip
                            style={[styles.categoryChip, { backgroundColor: getCategoryColor(classItem.category) }]}
                            textStyle={styles.chipText}
                            compact
                          >
                            {classItem.category === 'personal' ? 'Personal' : 'Group'}
                          </Chip>
                          
                          {/* Class status badge - shows "Passed" if class has finished */}
                          <Chip
                            style={[styles.statusChip, { backgroundColor: getClassStatusColor(classItem) }]}
                            textStyle={styles.chipText}
                            compact
                          >
                            {getClassStatusText(classItem)}
                          </Chip>
                          
                          {/* Enrollment count badge */}
                          <Chip
                            style={[styles.enrollmentChip, { backgroundColor: Colors.light.primary }]}
                            textStyle={styles.chipText}
                            compact
                          >
                            {getEnrollmentCount(classItem.id) + '/' + (classItem.capacity || 0)}
                          </Chip>
                        </View>
                        {classItem.notes && (
                          <View style={styles.classNotes}>
                            <Caption style={styles.notesLabel}>Notes:</Caption>
                            <Body style={styles.notesText}>{classItem.notes}</Body>
                          </View>
                        )}
                      </View>
                      
                      <View style={styles.calendarClassActions}>
                        <IconButton
                          icon="pencil"
                          size={20}
                          onPress={() => handleEditClass(classItem)}
                        />
                        <IconButton
                          icon="delete"
                          size={20}
                          iconColor={Colors.light.error}
                          onPress={() => handleDeleteClass(Number(classItem.id))}
                        />
                      </View>
                    </View>
                  </Surface>
                ))}
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    );
  };

  const renderDayClasses = () => {
    const dayClasses = getClassesForDate(selectedDate);
    
    return (
      <View style={styles.dayClassesSection}>
        <View style={styles.dayHeader}>
          <H2 style={styles.dayTitle}>
            {new Date(selectedDate).toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric' 
            })}
          </H2>
          <Button
            mode="contained"
            icon="plus"
            onPress={handleCreateClass}
            style={[styles.addClassButton, {paddingHorizontal: spacing.md}]}
            compact
            labelStyle={{fontSize: 14}}
          >
            Add Class
          </Button>
        </View>
        
        <ScrollView 
          style={styles.dayClassesScrollView}
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
          contentContainerStyle={styles.dayClassesScrollContent}
        >
          <View style={styles.dayClassesList}>
            {dayClasses.length === 0 ? (
              <View style={styles.emptyState}>
                <WebCompatibleIcon name="event" size={48} color={Colors.light.textMuted} />
                <Body style={styles.emptyStateText}>No classes scheduled for this date</Body>
              </View>
            ) : (
              dayClasses.map(classItem => (
                <Pressable key={classItem.id} onPress={() => handleClassCardClick(classItem)}>
                  <Surface style={styles.classCard}>
                    <View style={styles.classHeader}>
                      <View style={styles.classTime}>
                        <H3 style={styles.timeText}>{classItem.time}</H3>
                        <Caption style={styles.durationText}>{classItem.duration + 'min'}</Caption>
                      </View>
                      
                      <View style={styles.classInfo}>
                        <H3 style={styles.className}>{classItem.name}</H3>
                        <Body style={styles.instructorName}>with {classItem.instructor_name}</Body>
                        
                        {/* Room information */}
                        {classItem.room && (
                          <Body style={styles.roomInfo}>📍 {classItem.room}</Body>
                        )}
                        
                        <View style={styles.classStats}>
                          {/* Personal/Group class badge */}
                          <Chip
                            style={[styles.categoryChip, { backgroundColor: getCategoryColor(classItem.category) }]}
                            textStyle={styles.chipText}
                            compact
                          >
                            {classItem.category === 'personal' ? 'Personal' : 'Group'}
                          </Chip>
                          
                          {/* Class status badge - shows "Passed" if class has finished */}
                          <Chip
                            style={[styles.statusChip, { backgroundColor: getClassStatusColor(classItem) }]}
                            textStyle={styles.chipText}
                            compact
                          >
                            {getClassStatusText(classItem)}
                          </Chip>
                          
                          {/* Enrollment count badge */}
                          <Chip
                            style={[styles.enrollmentChip, { backgroundColor: Colors.light.primary }]}
                            textStyle={styles.chipText}
                            compact
                          >
                            {getEnrollmentCount(classItem.id) + '/' + (classItem.capacity || 0)}
                          </Chip>
                        </View>
                        {classItem.notes && (
                          <View style={styles.classNotes}>
                            <Caption style={styles.notesLabel}>Notes:</Caption>
                            <Body style={styles.notesText}>{classItem.notes}</Body>
                          </View>
                        )}
                      </View>
                      
                      <View style={styles.classActions}>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleAssignClient(classItem)}
                        >
                          <WebCompatibleIcon name="account-plus" size={20} color={Colors.light.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => {
                            const classBookings = getBookingsForClass(classItem.id);
                            console.log('🔍 Found class bookings:', classBookings);
                            if (classBookings.length > 0) {
                              const confirmedBookings = classBookings.filter(b => b.status === 'confirmed');
                              console.log('🔍 Confirmed bookings:', confirmedBookings);
                              
                              if (confirmedBookings.length > 0) {
                                if (confirmedBookings.length === 1) {
                                  handleCancelBooking(classItem, confirmedBookings[0]);
                                } else {
                                  // Multiple bookings - show names and let user confirm
                                  const bookingNames = confirmedBookings.map(b => b.users?.name || 'Unknown').join(', ');
                                  Alert.alert(
                                    'Multiple Bookings Found', 
                                    `This class has ${confirmedBookings.length} bookings: ${bookingNames}. This will cancel the first booking.`,
                                    [
                                      { text: 'Cancel', style: 'cancel' },
                                      { text: 'Continue', onPress: () => handleCancelBooking(classItem, confirmedBookings[0]) }
                                    ]
                                  );
                                }
                              } else {
                                Alert.alert('No Active Bookings', 'This class has no confirmed bookings to cancel.');
                              }
                            } else {
                              Alert.alert('No Bookings', 'This class has no bookings to cancel.');
                            }
                          }}
                        >
                          <WebCompatibleIcon name="account-remove" size={20} color={Colors.light.warning} />
                        </TouchableOpacity>
                        <IconButton
                          icon="pencil"
                          size={20}
                          onPress={() => handleEditClass(classItem)}
                        />
                        <IconButton
                          icon="delete"
                          size={20}
                          iconColor={Colors.light.error}
                          onPress={() => handleDeleteClass(Number(classItem.id))}
                        />
                      </View>
                    </View>
                  </Surface>
                </Pressable>
              ))
            )}
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderTableView = () => (
    <View style={styles.tableContainer}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={true}
        style={styles.tableScrollContainer}
        contentContainerStyle={styles.tableContentContainer}
      >
        <ScrollView 
          style={styles.tableVerticalScroll}
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
        >
          <DataTable style={styles.dataTable}>
            <DataTable.Header>
              <DataTable.Title style={styles.checkboxColumn}>
                <Switch
                  value={selectedClasses.length === filteredClasses.length}
                  onValueChange={(value) => {
                    if (value) {
                      setSelectedClasses(filteredClasses.map(c => Number(c.id)));
                    } else {
                      setSelectedClasses([]);
                    }
                  }}
                />
              </DataTable.Title>
              <DataTable.Title>Date/Time</DataTable.Title>
              <DataTable.Title>Class</DataTable.Title>
              <DataTable.Title>Instructor</DataTable.Title>
              <DataTable.Title>Category</DataTable.Title>
              <DataTable.Title>Enrollment</DataTable.Title>
              <DataTable.Title>Status</DataTable.Title>
              <DataTable.Title>Actions</DataTable.Title>
            </DataTable.Header>

            {filteredClasses.map((classItem) => (
              <DataTable.Row key={classItem.id}>
                <DataTable.Cell style={styles.checkboxColumn}>
                  <Switch
                    value={selectedClasses.includes(Number(classItem.id))}
                    onValueChange={(value) => {
                      if (value) {
                        setSelectedClasses([...selectedClasses, Number(classItem.id)]);
                      } else {
                        setSelectedClasses(selectedClasses.filter(id => id !== Number(classItem.id)));
                      }
                    }}
                  />
                </DataTable.Cell>
                <DataTable.Cell>
                  <View>
                    <Body>{classItem.date}</Body>
                    <Caption>{classItem.time}</Caption>
                  </View>
                </DataTable.Cell>
                <DataTable.Cell>
                  <Body>{classItem.name}</Body>
                  {classItem.room && (
                    <Caption style={{ color: Colors.light.textSecondary }}>📍 {classItem.room}</Caption>
                  )}
                </DataTable.Cell>
                <DataTable.Cell>
                  <Body>{classItem.instructor_name}</Body>
                </DataTable.Cell>
                <DataTable.Cell>
                  <Chip
                    style={[styles.categoryChip, { backgroundColor: getCategoryColor(classItem.category) }]}
                    textStyle={styles.chipText}
                    compact
                  >
                    {classItem.category === 'personal' ? 'Personal' : 'Group'}
                  </Chip>
                </DataTable.Cell>
                <DataTable.Cell>
                  <Body>{getEnrollmentCount(classItem.id) + '/' + (classItem.capacity || 0)}</Body>
                </DataTable.Cell>
                <DataTable.Cell>
                  <Chip
                    style={[styles.statusChip, { backgroundColor: getClassStatusColor(classItem) }]}
                    textStyle={styles.chipText}
                    compact
                  >
                    {getClassStatusText(classItem)}
                  </Chip>
                </DataTable.Cell>
                <DataTable.Cell>
                  <View style={styles.rowActions}>
                    <IconButton
                      icon="account-plus"
                      size={16}
                      iconColor={Colors.light.primary}
                      onPress={() => handleAssignClient(classItem)}
                    />
                    <IconButton
                      icon="account-remove"
                      size={16}
                      iconColor={Colors.light.warning}
                      onPress={() => {
                        const classBookings = getBookingsForClass(classItem.id);
                        if (classBookings.length > 0) {
                          handleCancelBooking(classItem, classBookings[0]);
                        } else {
                          Alert.alert('No Bookings', 'This class has no confirmed bookings to cancel.');
                        }
                      }}
                    />
                    <IconButton
                      icon="pencil"
                      size={16}
                      onPress={() => handleEditClass(classItem)}
                    />
                    <IconButton
                      icon="delete"
                      size={16}
                      iconColor={Colors.light.error}
                      onPress={() => handleDeleteClass(Number(classItem.id))}
                    />
                  </View>
                </DataTable.Cell>
              </DataTable.Row>
            ))}
          </DataTable>
        </ScrollView>
      </ScrollView>
    </View>
  );

  const getLevelColor = (level: string | undefined) => {
    switch (level) {
      case 'Beginner': return Colors.light.success;
      case 'Intermediate': return Colors.light.warning;
      case 'Advanced': return Colors.light.error;
      default: return Colors.light.textSecondary;
    }
  };

  const getCategoryColor = (category: string | undefined) => {
    // Debug log for category issue
    if (category !== 'personal' && category !== 'group') {
      console.log(`🐛 getCategoryColor received invalid category:`, category, typeof category, `"${category}"`);
    }
    
    switch (category) {
      case 'personal': return Colors.light.error;      // Red for personal classes
      case 'group': return Colors.light.success;       // Green for group classes
      default: return Colors.light.textSecondary;      // Gray for unknown
    }
  };

  // Helper function to check if a class has passed (finished)
  const isPastClass = (date: string, time: string, duration: number) => {
    const classDateTime = new Date(`${date}T${time}`);
    const endDateTime = new Date(classDateTime.getTime() + duration * 60000); // Add duration in minutes
    return endDateTime < new Date();
  };

  // Helper function to get class status text
  const getClassStatusText = (classItem: BackendClass) => {
    if (isPastClass(classItem.date, classItem.time, classItem.duration)) {
      return 'Passed';
    }
    const enrollmentPercentage = (classItem.enrolled / classItem.capacity) * 100;
    if (enrollmentPercentage >= 100) return 'Full';
    if (enrollmentPercentage >= 80) return 'Almost Full';
    return 'Available';
  };

  // Helper function to get class status color
  const getClassStatusColor = (classItem: BackendClass) => {
    if (isPastClass(classItem.date, classItem.time, classItem.duration)) {
      return Colors.light.textMuted; // Gray for passed classes
    }
    const enrollmentPercentage = (classItem.enrolled / classItem.capacity) * 100;
    if (enrollmentPercentage >= 100) return Colors.light.error; // Red for full
    if (enrollmentPercentage >= 80) return Colors.light.warning; // Yellow for almost full
    return Colors.light.success; // Green for available
  };

  const getBookingsForClass = (classId: string | number) => {
    const filteredBookings = bookings.filter(booking => {
      return booking.class_id == classId; // Use == to handle both string and number
    });
    return filteredBookings;
  };

  const getEnrollmentCount = (classId: string | number) => {
    const classBookings = getBookingsForClass(classId);
    return classBookings.filter(booking => booking.status === 'confirmed').length;
  };

  const getClassesWithEnrollment = () => {
    return classes.map(classItem => ({
      ...classItem,
      enrolled: getEnrollmentCount(classItem.id)
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return Colors.light.success;
      case 'pending': return Colors.light.warning;
      case 'cancelled': return Colors.light.error;
      case 'waitlist': return Colors.light.secondary;
      default: return Colors.light.textSecondary;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleClassCardClick = (classItem: BackendClass) => {
    setSelectedClassForBookings(classItem);
    setBookingsModalVisible(true);
  };

  const handleUpdateBookingStatus = async (bookingId: number, newStatus: string) => {
    try {
      setUpdatingBooking(bookingId);
      const response = await bookingService.updateBookingStatus(bookingId, newStatus);
      
      if (response.success) {
        // Refresh bookings to show updated status
        await loadBookings();
        setBookingStatusMenuVisible(null);
      } else {
        Alert.alert('Error', 'Failed to update booking status');
      }
    } catch (error) {
      console.error('Error updating booking status:', error);
      Alert.alert('Error', 'Failed to update booking status');
    } finally {
      setUpdatingBooking(null);
    }
  };

  const handleSaveTemplate = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter a class name');
      return;
    }

    try {
      setSavingTemplate(true);
      const template = {
        name: formData.name,
        instructorId: formData.instructorId,
        instructorName: formData.instructorName,
        duration: formData.duration,
        category: formData.category,
        capacity: formData.capacity,
        equipment: formData.equipment,
        description: formData.description,
        equipmentType: formData.equipmentType,
        room: formData.room,
        notes: formData.notes,
        created_at: new Date().toISOString()
      };

      // Save to localStorage for now (could be moved to backend later)
      const existingTemplates = JSON.parse(localStorage.getItem('classTemplates') || '[]');
      const newTemplates = [...existingTemplates, template];
      localStorage.setItem('classTemplates', JSON.stringify(newTemplates));
      setTemplates(newTemplates);
      
      Alert.alert('Success', 'Class template saved successfully!');
      setTemplateModalVisible(false);
    } catch (error) {
      console.error('Error saving template:', error);
      Alert.alert('Error', 'Failed to save template');
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleLoadTemplate = (template: any) => {
    setFormData({
      ...formData,
      name: template.name,
      instructorId: template.instructorId,
      instructorName: template.instructorName,
      duration: template.duration,
      category: template.category,
      capacity: template.capacity,
      equipment: template.equipment,
      description: template.description,
      equipmentType: template.equipmentType,
      room: template.room,
      notes: template.notes,
      date: '', // Reset date and time for new class
      time: ''
    });
    setTemplateModalVisible(false);
  };

  const loadTemplates = () => {
    try {
      const savedTemplates = JSON.parse(localStorage.getItem('classTemplates') || '[]');
      setTemplates(savedTemplates);
    } catch (error) {
      console.error('Error loading templates:', error);
      setTemplates([]);
    }
  };

  // Helper function to show error modal (works reliably in React Native Web)
  const showErrorModal = (title: string, message: string, actions?: Array<{text: string, onPress: () => void, style?: 'default' | 'cancel' | 'destructive'}>) => {
    setErrorTitle(title);
    setErrorMessage(message);
    setErrorActions(actions || [{ text: 'OK', onPress: () => setErrorModalVisible(false) }]);
    setErrorModalVisible(true);
  };

  const handleAssignClient = (classItem: BackendClass) => {
    setSelectedClassForAssignment(classItem);
    setSelectedClient(null);
    setAssignNotes('');
    setOverrideRestrictions(false);
    setClientSearchQuery('');
    setClientMenuVisible(false); // Reset client menu state
    loadClients();
    setAssignClientModalVisible(true);
  };

  const loadClients = async () => {
    try {
      const response = await userService.getUsers({ role: 'client' });
      if (response.success && response.data) {
        setClients(response.data);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
      setClients([]);
    }
  };

  const handleAssignClientToClass = async () => {
    console.log('🎯 handleAssignClientToClass called');
    console.log('🎯 selectedClient:', selectedClient);
    console.log('🎯 selectedClassForAssignment:', selectedClassForAssignment);
    
    if (!selectedClient || !selectedClassForAssignment) {
      console.log('❌ Missing selectedClient or selectedClassForAssignment');
      showErrorModal('Error', 'Please select a client and class');
      return;
    }

    try {
      console.log('🚀 Starting assignment...');
      setAssigningClient(true);
      const response = await bookingService.assignClientToClass(
        selectedClient.id,
        selectedClassForAssignment.id,
        '', // Notes not supported in bookings table
        overrideRestrictions
      );

      console.log('📝 Assignment response:', response);

      if (response.success) {
        console.log('✅ Assignment successful');
        const successMessage = overrideRestrictions 
          ? 'Client assigned successfully (restrictions overridden)' 
          : 'Client assigned successfully and 1 class deducted from subscription';
        showErrorModal('Success', successMessage);
        setAssignClientModalVisible(false);
        setSelectedClient(null);
        setSelectedClassForAssignment(null);
        setOverrideRestrictions(false);
        setClientSearchQuery('');
        setClientMenuVisible(false); // Reset client menu state
        await loadClasses(); // Refresh classes to show updated enrollment
        await loadBookings(); // Refresh bookings
      } else {
        console.log('❌ Assignment failed:', response.error);
        console.log('🔍 Error message analysis:', {
          includesSubscription: response.error?.includes('subscription'),
          includesActiveSubscription: response.error?.includes('active subscription'),
          overrideRestrictions,
          fullError: response.error
        });
        
        // Check if it's a capacity error and offer override option
        if (response.error?.includes('Class is full') && !overrideRestrictions) {
          showErrorModal(
            'Class Full',
            `${response.error}\n\nWould you like to enable override to force this assignment?`,
            [
              { text: 'Cancel', onPress: () => setErrorModalVisible(false), style: 'cancel' },
              { 
                text: 'Enable Override', 
                onPress: () => {
                  setOverrideRestrictions(true);
                  setErrorModalVisible(false);
                }
              }
            ]
          );
        } else if ((response.error?.includes('subscription') || response.error?.includes('active subscription')) && !overrideRestrictions) {
          // Subscription-related error - offer to enable override
          console.log('🎯 About to show subscription error popup');
          showErrorModal(
            'Subscription Issue',
            `${response.error}\n\nWould you like to enable override to bypass subscription restrictions?`,
            [
              { text: 'Cancel', onPress: () => setErrorModalVisible(false), style: 'cancel' },
              { 
                text: 'Enable Override', 
                onPress: () => {
                  setOverrideRestrictions(true);
                  setErrorModalVisible(false);
                }
              }
            ]
          );
          console.log('🎯 Subscription error popup should have appeared');
        } else if (response.error?.includes('database permissions')) {
          // Database permission error - suggest override
          showErrorModal(
            'Database Permission Issue',
            `${response.error}\n\nTip: You can use the override toggle to bypass these restrictions.`
          );
        } else {
          // Fallback - show any error as a popup
          showErrorModal('Assignment Error', response.error || 'Failed to assign client');
        }
      }
    } catch (error) {
      console.error('❌ Error assigning client:', error);
      showErrorModal('Error', 'Failed to assign client to class');
    } finally {
      setAssigningClient(false);
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
    client.email.toLowerCase().includes(clientSearchQuery.toLowerCase())
  );

  const handleCancelBooking = (classItem: BackendClass, booking: any) => {
    setSelectedClassForCancellation(classItem);
    setSelectedBookingForCancellation(booking);
    setCancelNotes('');
    setCancelBookingMenuVisible(false); // Reset menu state
    setCancelBookingModalVisible(true);
  };

  const handleCancelClientBooking = async () => {
    console.log('🚫 handleCancelClientBooking called');
    console.log('🚫 selectedBookingForCancellation:', selectedBookingForCancellation);
    console.log('🚫 selectedClassForCancellation:', selectedClassForCancellation);
    
    if (!selectedBookingForCancellation || !selectedClassForCancellation) {
      console.log('❌ Missing selectedBookingForCancellation or selectedClassForCancellation');
      Alert.alert('Error', 'Please select a booking to cancel');
      return;
    }

    try {
      console.log('🚀 Starting cancellation...');
      setCancellingBooking(true);
      const response = await bookingService.cancelClientBooking(
        selectedBookingForCancellation.user_id,
        selectedClassForCancellation.id
        // Notes not supported in bookings table
      );

      console.log('📝 Cancellation response:', response);

      if (response.success) {
        console.log('✅ Cancellation successful');
        Alert.alert('Success', 'Booking cancelled successfully');
        setCancelBookingModalVisible(false);
        setCancelBookingMenuVisible(false); // Reset menu state
        setSelectedClassForCancellation(null);
        setSelectedBookingForCancellation(null);
        await loadClasses(); // Refresh classes to show updated enrollment
        await loadBookings(); // Refresh bookings
      } else {
        console.log('❌ Cancellation failed:', response.error);
        Alert.alert('Error', response.error || 'Failed to cancel booking');
      }
    } catch (error) {
      console.error('❌ Error cancelling booking:', error);
      Alert.alert('Error', 'Failed to cancel booking');
    } finally {
      setCancellingBooking(false);
    }
  };

  const handleDeleteClass = (classId: number) => {
    console.log('🗑️ Delete class button clicked for class ID:', classId);
    
    // For web platform, use browser confirm instead of Alert
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to delete this class?');
      if (confirmed) {
        console.log('🗑️ Delete confirmed for class ID:', classId);
        performDeleteClass(classId);
      } else {
        console.log('🗑️ Delete cancelled by user');
      }
      return;
    }
    
    Alert.alert(
      'Delete Class',
      'Are you sure you want to delete this class?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => performDeleteClass(classId)
        }
      ]
    );
  };

  const performDeleteClass = async (classId: number) => {
    console.log('🗑️ Delete confirmed for class ID:', classId);
    
    // Debug authentication
    console.log('🔍 Current user:', user);
    console.log('🔍 User role:', user?.role);
    console.log('🔍 User ID:', user?.id);
    
    try {
      console.log('🗑️ Calling classService.deleteClass...');
      const response = await classService.deleteClass(classId);
      console.log('🗑️ Delete response:', response);
      if (response.success) {
        console.log('🗑️ Delete successful, reloading classes...');
        await loadClasses();
        // Show the detailed message including refund info
        const successMessage = (response as any).message || 'Class deleted successfully';
        if (Platform.OS === 'web') {
          window.alert(successMessage);
        } else {
          Alert.alert('Success', successMessage);
        }
      } else {
        console.error('🗑️ Delete failed:', response.error);
        const errorMsg = response.error || 'Failed to delete class';
        if (Platform.OS === 'web') {
          window.alert('Error: ' + errorMsg);
        } else {
          Alert.alert('Error', errorMsg);
        }
      }
    } catch (error) {
      console.error('🗑️ Delete error:', error);
      const errorMsg = 'Failed to delete class';
      if (Platform.OS === 'web') {
        window.alert('Error: ' + errorMsg);
      } else {
        Alert.alert('Error', errorMsg);
      }
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" />
        <Body style={styles.loadingText}>Loading classes...</Body>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Compact Header - Only Filters */}
      <Surface style={styles.headerCompact}>
        <View style={styles.headerRow}>
          <SegmentedButtons
            value={filterStatus}
            onValueChange={setFilterStatus}
            buttons={[
              { value: 'all', label: 'All' },
              { value: 'active', label: 'Active' },
              { value: 'full', label: 'Full' },
              { value: 'cancelled', label: 'Cancelled' },
            ]}
            style={styles.statusFilter}
          />
          
          <View style={styles.headerActions}>
            <Searchbar
              placeholder="Search classes..."
              onChangeText={setSearchQuery}
              value={searchQuery}
              style={styles.searchbar}
            />
            
            <SegmentedButtons
              value={viewMode}
              onValueChange={(value) => setViewMode(value as any)}
              buttons={[
                { value: 'calendar', label: 'Calendar' },
                { value: 'table', label: 'Table' },
                { value: 'hybrid', label: 'Hybrid' },
              ]}
              style={styles.viewToggle}
            />
          </View>
          
          {selectedClasses.length > 0 && (
            <View style={styles.batchActions}>
              <Body style={styles.selectedCount}>
                {selectedClasses.length + ' selected'}
              </Body>
              <Button
                mode="contained"
                icon="delete"
                onPress={handleBatchDelete}
                style={styles.batchButton}
                buttonColor={Colors.light.error}
              >
                Delete Selected
              </Button>
            </View>
          )}
        </View>
      </Surface>

      {/* Main Content */}
      {viewMode === 'calendar' && (
        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={true}
          contentContainerStyle={styles.contentContainer}
          nestedScrollEnabled={true}
        >
          {renderCalendarView()}
        </ScrollView>
      )}
      
      {viewMode === 'table' && (
        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={true}
          contentContainerStyle={styles.contentContainer}
          nestedScrollEnabled={true}
        >
          {renderTableView()}
        </ScrollView>
      )}
      
      {viewMode === 'hybrid' && (
        <View style={styles.hybridView}>
          <ScrollView 
            style={styles.hybridLeft}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
            contentContainerStyle={styles.hybridLeftContainer}
          >
            {renderCalendarOnly()}
          </ScrollView>
          <ScrollView 
            style={styles.hybridRight}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
            contentContainerStyle={styles.hybridRightContainer}
          >
            {renderDayClasses()}
          </ScrollView>
        </View>
      )}

      {/* Create Class Modal */}
      <Portal>
        <Modal 
          visible={modalVisible} 
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Surface style={styles.modalSurface}>
            <H2 style={styles.modalTitle}>
              {editingClass ? 'Edit Class' : 'Create New Class'}
            </H2>
            
            <ScrollView style={styles.modalContent}>
              <TextInput
                label="Class Name *"
                value={formData.name}
                onChangeText={(text) => setFormData({...formData, name: text})}
                mode="outlined"
                style={styles.input}
              />

              <View style={styles.pickerContainer}>
                <Caption style={styles.pickerLabel}>Instructor *</Caption>
                <Surface style={styles.dropdownSurface}>
                  <Menu
                    visible={instructorMenuVisible}
                    onDismiss={() => setInstructorMenuVisible(false)}
                    anchor={
                      <Pressable 
                        onPress={() => {
                          if (instructors.length === 0) {
                            Alert.alert('No Instructors Available', 'Please create instructor accounts first before creating classes.');
                            return;
                          }
                          setInstructorMenuVisible(true);
                        }}
                        style={styles.dropdownButton}
                      >
                        <View style={styles.dropdownContent}>
                          <Icon source="person" size={20} color={Colors.light.primary} />
                          <Body style={{
                            ...styles.dropdownText,
                            color: !formData.instructorName ? Colors.light.textSecondary : Colors.light.text
                          }}>
                            {instructors.length === 0 ? 
                              'No instructors available' : 
                              (formData.instructorName || 'Select from ' + instructors.length + ' instructor(s)')}
                          </Body>
                          <Icon source="chevron-down" size={20} color={Colors.light.textSecondary} />
                        </View>
                      </Pressable>
                    }
                  >
                    {instructors.map((instructor) => {
                      const instructorId = instructor.id.toString();
                      const isAvailable = instructorAvailability[instructorId]?.available !== false;
                      const isChecking = checkingInstructorAvailability && formData.instructorId === instructorId;
                      const conflictClass = instructorAvailability[instructorId]?.conflictClass;
                      
                      return (
                        <Menu.Item
                          key={instructor.id}
                          onPress={() => {
                            console.log('🎓 Instructor selected:', instructor.name, 'ID:', instructor.id);
                            setFormData({
                              ...formData, 
                              instructorId: instructorId,
                              instructorName: instructor.name
                            });
                            setInstructorMenuVisible(false);
                            console.log('🎓 Form data updated - instructorId:', instructorId, 'instructorName:', instructor.name);
                          }}
                          title={instructor.name + (isChecking ? ' (Checking...)' : !isAvailable ? ' (Busy ' + (conflictClass?.time || '') + ')' : ' (Available)')}
                          leadingIcon="person"
                        />
                      );
                    })}
                  </Menu>
                </Surface>
              </View>

              {/* Instructor Availability Indicator */}
              {formData.instructorId && formData.date && formData.time ? (
                <View style={{
                  marginTop: 8,
                  padding: 8,
                  backgroundColor: '#f5f5f5',
                  borderRadius: 4,
                  borderWidth: 1,
                  borderColor: '#e0e0e0',
                }}>
                  <Caption style={{ color: '#666', marginBottom: 4, fontSize: 12 }}>
                    {'Instructor Availability: ' + (formData.instructorName || 'N/A') + ' on ' + (formData.date || 'N/A') + ' at ' + (formData.time || 'N/A')}
                  </Caption>
                  {checkingInstructorAvailability ? (
                    <ActivityIndicator size="small" />
                  ) : (
                    <Caption style={{
                      fontWeight: '600',
                      fontSize: 13,
                      color: instructorAvailability[formData.instructorId]?.available !== false ? '#4CAF50' : '#f44336'
                    }}>
                      {instructorAvailability[formData.instructorId]?.available !== false ? 'Available' : 'Instructor is busy'}
                    </Caption>
                  )}
                </View>
              ) : null}

              <View style={styles.dateTimeRow}>
                <View style={styles.dateTimeColumn}>
                  <TextInput
                    label="Date (YYYY-MM-DD) *"
                    value={formData.date}
                    onChangeText={(text) => setFormData({...formData, date: text})}
                    mode="outlined"
                    placeholder="2024-12-25"
                    style={styles.dateTimeInput}
                    left={<TextInput.Icon icon="calendar-today" />}
                  />
                </View>

                <View style={styles.dateTimeColumn}>
                  <TextInput
                    label="Start Time (HH:MM) *"
                    value={formData.time}
                    onChangeText={(text) => setFormData({...formData, time: text})}
                    mode="outlined"
                    placeholder="14:30"
                    style={styles.dateTimeInput}
                    left={<TextInput.Icon icon="access-time" />}
                  />
                  <Caption style={styles.timePickerLabel}>Quick time selection:</Caption>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timePickerScroll}>
                    <View style={styles.timePickerContainer}>
                      {[
                        '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
                        '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
                        '18:00', '19:00', '20:00', '21:00'
                      ].map((time) => (
                        <Pressable
                          key={time}
                          style={[
                            styles.timeButton,
                            formData.time === time && styles.timeButtonSelected
                          ]}
                          onPress={() => setFormData({...formData, time: time})}
                        >
                          <Caption style={
                            formData.time === time 
                              ? {...styles.timeButtonText, ...styles.timeButtonTextSelected}
                              : styles.timeButtonText
                          }>
                            {time}
                          </Caption>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              </View>

              <View style={styles.numberRow}>
                <View style={styles.numberColumn}>
                  <TextInput
                    label="Duration (minutes) *"
                    value={String(formData.duration || 60)}
                    onChangeText={(text) => setFormData({...formData, duration: parseInt(text) || 60})}
                    mode="outlined"
                    keyboardType="numeric"
                    style={styles.numberInput}
                    left={<TextInput.Icon icon="timer" />}
                  />
                </View>

                <View style={styles.numberColumn}>
                  <TextInput
                    label="Capacity *"
                    value={String(formData.capacity || 10)}
                    onChangeText={(text) => setFormData({...formData, capacity: parseInt(text) || 10})}
                    mode="outlined"
                    keyboardType="numeric"
                    style={styles.numberInput}
                    left={<TextInput.Icon icon="account-group" />}
                  />
                  <Caption style={styles.capacityHelper}>
                    {(formData.category === 'personal' ? 
                      'Personal: 1 (private), 2 (couple), 3 (trio)' : 
                      'Group: typically 8-15 people'
                    ) + ' • Current: ' + formData.capacity}
                  </Caption>
                </View>
              </View>

              <View style={styles.segmentedContainer}>
                <Caption style={styles.pickerLabel}>Category *</Caption>
                <SegmentedButtons
                  value={formData.category}
                  onValueChange={(value) => {
                    const newCategory = value as 'personal' | 'group';
                    console.log('🎯 Category changed from', formData.category, 'to', newCategory);
                    setFormData({
                      ...formData, 
                      category: newCategory,
                      // Smart capacity adjustment based on category
                      capacity: newCategory === 'personal' ? 
                        (formData.capacity > 5 ? 1 : formData.capacity) : // Keep small numbers for personal
                        (formData.capacity < 5 ? 10 : formData.capacity)   // Reset to 10 for group if very small
                    });
                  }}
                  buttons={[
                    { value: 'group', label: 'Group Class' },
                    { value: 'personal', label: 'Personal Session' },
                  ]}
                  style={styles.segmentedButtons}
                />
                <Caption style={{ marginTop: 8, color: formData.category === 'group' ? '#4CAF50' : '#FF9800', fontWeight: 'bold' }}>
                  Current selection: {formData.category === 'group' ? 'Group Class' : 'Personal Session'}
                </Caption>
              </View>

              <View style={styles.segmentedContainer}>
                <Caption style={styles.pickerLabel}>Equipment Type *</Caption>
                <SegmentedButtons
                  value={formData.equipmentType}
                  onValueChange={(value) => setFormData({...formData, equipmentType: value as BackendClass['equipment_type']})}
                  buttons={[
                    { value: 'mat', label: 'Mat' },
                    { value: 'reformer', label: 'Reformer' },
                    { value: 'both', label: 'Both' },
                  ]}
                  style={styles.segmentedButtons}
                />
              </View>

              {/* Room Selection for All Classes */}
              <View style={styles.segmentedContainer}>
                <Caption style={styles.pickerLabel}>Room *</Caption>
                <SegmentedButtons
                  value={formData.room}
                  onValueChange={(value) => setFormData({...formData, room: value as 'Reformer Room' | 'Mat Room' | 'Cadillac Room' | 'Wall Room'})}
                  buttons={[
                    { value: 'Reformer Room', label: 'Reformer' },
                    { value: 'Mat Room', label: 'Mat' },
                    { value: 'Cadillac Room', label: 'Cadillac' },
                    { value: 'Wall Room', label: 'Wall' },
                  ]}
                  style={styles.segmentedButtons}
                />
                {formData.room && formData.date && formData.time ? (
                  <View style={styles.roomAvailabilityContainer}>
                    <Caption style={styles.roomAvailabilityLabel}>
                      {'Room Availability: ' + (formData.room || 'N/A') + ' on ' + (formData.date || 'N/A') + ' at ' + (formData.time || 'N/A')}
                    </Caption>
                    {checkingAvailability ? (
                      <ActivityIndicator size="small" />
                    ) : (
                      <Caption style={{
                        ...styles.roomAvailabilityStatus,
                        color: ((roomAvailability && roomAvailability[formData.room]?.available) === true) ? Colors.light.success : Colors.light.error
                      }}>
                        {(roomAvailability && roomAvailability[formData.room]?.available) === true ? 'Available' : 'Room is busy'}
                      </Caption>
                    )}
                  </View>
                ) : null}
              </View>

              <TextInput
                label="Class Description"
                value={formData.description}
                onChangeText={(text) => setFormData({...formData, description: text})}
                mode="outlined"
                multiline
                numberOfLines={3}
                style={styles.input}
                placeholder="Optional description of the class..."
              />

              <TextInput
                label="Class Notes"
                value={formData.notes}
                onChangeText={(text) => setFormData({...formData, notes: text})}
                mode="outlined"
                multiline
                numberOfLines={3}
                style={styles.input}
                placeholder="Optional notes for this class..."
              />
              
              <View style={styles.modalActions}>
                <Button
                  mode="outlined"
                  onPress={() => setModalVisible(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <View style={styles.modalActionGroup}>
                  <Button
                    mode="outlined"
                    onPress={() => setTemplateModalVisible(true)}
                    style={styles.templateButton}
                    icon="content-save-outline"
                  >
                    Templates
                  </Button>
                  <Button
                    mode="contained"
                    onPress={handleSaveClass}
                    loading={saving}
                    disabled={saving}
                    style={styles.modalActionButton}
                  >
                    {editingClass ? 'Update Class' : 'Create Class'}
                  </Button>
                </View>
              </View>
            </ScrollView>
          </Surface>
        </Modal>
      </Portal>

      {/* Class Bookings Modal */}
      <Portal>
        <Modal 
          visible={bookingsModalVisible} 
          onDismiss={() => setBookingsModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Surface style={styles.modalSurface}>
            <H2 style={styles.modalTitle}>
              {selectedClassForBookings ? selectedClassForBookings.name + ' - Bookings' : 'Class Bookings'}
            </H2>
            
            {selectedClassForBookings && (
              <View style={styles.classInfoHeader}>
                <Body style={styles.classInfoText}>
                  {selectedClassForBookings.date} at {selectedClassForBookings.time}
                </Body>
                <Body style={styles.classInfoText}>
                  Instructor: {selectedClassForBookings.instructor_name}
                </Body>
                <Body style={styles.classInfoText}>
                  Level: {selectedClassForBookings.level} • {getEnrollmentCount(selectedClassForBookings.id)}/{selectedClassForBookings.capacity || 0} enrolled
                </Body>
                {selectedClassForBookings.notes && (
                  <View style={styles.classNotesModal}>
                    <Caption style={styles.notesLabel}>Class Notes:</Caption>
                    <Body style={styles.notesText}>{selectedClassForBookings.notes}</Body>
                  </View>
                )}
              </View>
            )}

            <ScrollView style={styles.modalContent}>
              {selectedClassForBookings ? (
                (() => {
                  const classBookings = getBookingsForClass(selectedClassForBookings.id);
                  return classBookings.length > 0 ? (
                    <View style={styles.bookingsList}>
                      {classBookings.map((booking, index) => (
                        <Surface key={booking.id || index} style={styles.bookingCard}>
                          <View style={styles.bookingHeader}>
                            <View style={styles.bookingInfo}>
                              <H3 style={styles.clientName}>
                                {booking.users?.name || booking.client_name || booking.user_name || 'Unknown Client'}
                              </H3>
                              <Body style={styles.clientEmail}>
                                {booking.users?.email || booking.client_email || booking.user_email || 'No email'}
                              </Body>
                            </View>
                            <View style={styles.bookingStatusContainer}>
                              <Menu
                                visible={bookingStatusMenuVisible === booking.id}
                                onDismiss={() => setBookingStatusMenuVisible(null)}
                                anchor={
                                  <Pressable 
                                    onPress={() => setBookingStatusMenuVisible(booking.id)}
                                    style={styles.statusButton}
                                  >
                                    <Chip
                                      style={[styles.bookingStatusChip, { backgroundColor: getStatusColor(booking.status) }]}
                                      textStyle={styles.chipText}
                                      compact
                                    >
                                      {updatingBooking === booking.id ? 'Updating...' : booking.status}
                                    </Chip>
                                  </Pressable>
                                }
                              >
                                <Menu.Item
                                  onPress={() => handleUpdateBookingStatus(booking.id, 'confirmed')}
                                  title="Confirm"
                                  leadingIcon="check"
                                />
                                <Menu.Item
                                  onPress={() => handleUpdateBookingStatus(booking.id, 'pending')}
                                  title="Pending"
                                  leadingIcon="access-time"
                                />
                                <Menu.Item
                                  onPress={() => handleUpdateBookingStatus(booking.id, 'waitlist')}
                                  title="Waitlist"
                                  leadingIcon="schedule"
                                />
                                <Menu.Item
                                  onPress={() => handleUpdateBookingStatus(booking.id, 'cancelled')}
                                  title="Cancel"
                                  leadingIcon="close"
                                />
                              </Menu>
                            </View>
                          </View>
                          <View style={styles.bookingDetails}>
                            <Body style={styles.bookingTime}>
                              Booked: {formatDate(booking.created_at)} at {formatTime(booking.created_at.split('T')[1]?.split('.')[0] || '')}
                            </Body>
                            {booking.notes && (
                              <Body style={styles.bookingNotes}>
                                Notes: {booking.notes}
                              </Body>
                            )}
                          </View>
                        </Surface>
                      ))}
                    </View>
                  ) : (
                    <View style={styles.emptyBookings}>
                      <WebCompatibleIcon name="event-busy" size={48} color={Colors.light.textMuted} />
                      <Body style={styles.emptyBookingsText}>No bookings for this class</Body>
                    </View>
                  );
                })()
              ) : (
                <View style={styles.emptyBookings}>
                  <WebCompatibleIcon name="warning" size={48} color={Colors.light.textMuted} />
                  <Body style={styles.emptyBookingsText}>No class selected</Body>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                mode="outlined"
                onPress={() => setBookingsModalVisible(false)}
                style={styles.modalActionButton}
              >
                Close
              </Button>
            </View>
          </Surface>
        </Modal>
      </Portal>

      {/* Class Templates Modal */}
      <Portal>
        <Modal 
          visible={templateModalVisible} 
          onDismiss={() => setTemplateModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Surface style={styles.modalSurface}>
            <H2 style={styles.modalTitle}>Class Templates</H2>
            
            <ScrollView style={styles.modalContent}>
              {/* Save Current as Template */}
              <View style={styles.templateSaveSection}>
                <H3 style={styles.templateSectionTitle}>Save Current Class as Template</H3>
                <Body style={styles.templateSectionText}>
                  Save the current class configuration as a reusable template.
                </Body>
                <Button
                  mode="contained"
                  onPress={handleSaveTemplate}
                  loading={savingTemplate}
                  disabled={savingTemplate}
                  style={styles.saveTemplateButton}
                  icon="save"
                >
                  Save as Template
                </Button>
              </View>

              <Divider style={styles.templateDivider} />

              {/* Load Existing Templates */}
              <View style={styles.templateLoadSection}>
                <H3 style={styles.templateSectionTitle}>Load Template</H3>
                <Body style={styles.templateSectionText}>
                  Select a saved template to load its configuration.
                </Body>
                
                {templates.length > 0 ? (
                  <View style={styles.templatesList}>
                    {templates.map((template, index) => (
                      <Surface key={index} style={styles.templateCard}>
                        <View style={styles.templateHeader}>
                          <H3 style={styles.templateName}>{template.name}</H3>
                          <Caption style={styles.templateDate}>
                            {new Date(template.created_at).toLocaleDateString()}
                          </Caption>
                        </View>
                        <View style={styles.templateDetails}>
                          <Body style={styles.templateDetail}>
                            Instructor: {template.instructorName}
                          </Body>
                          <Body style={styles.templateDetail}>
                            Duration: {template.duration}min • Level: {template.level}
                          </Body>
                          <Body style={styles.templateDetail}>
                            Capacity: {template.capacity} • Category: {template.category}
                          </Body>
                          {template.notes && (
                            <Body style={styles.templateNotes}>
                              Notes: {template.notes}
                            </Body>
                          )}
                        </View>
                        <Button
                          mode="outlined"
                          onPress={() => handleLoadTemplate(template)}
                          style={styles.loadTemplateButton}
                          icon="download-outline"
                        >
                          Load Template
                        </Button>
                      </Surface>
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyTemplates}>
                    <WebCompatibleIcon name="save" size={48} color={Colors.light.textMuted} />
                    <Body style={styles.emptyTemplatesText}>No templates saved yet</Body>
                    <Caption style={styles.emptyTemplatesSubtext}>
                      Save your first template to get started
                    </Caption>
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                mode="outlined"
                onPress={() => setTemplateModalVisible(false)}
                style={styles.modalActionButton}
              >
                Close
              </Button>
            </View>
          </Surface>
        </Modal>
      </Portal>

      {/* Assign Client Modal */}
      <Portal>
        <Modal 
          visible={assignClientModalVisible} 
          onDismiss={() => {
            setAssignClientModalVisible(false);
            setClientMenuVisible(false);
          }}
          contentContainerStyle={styles.modalContainer}
        >
          <Surface style={styles.modalSurface}>
            <H2 style={styles.modalTitle}>Assign Client to Class</H2>
            
            <ScrollView style={styles.modalContent}>
              <View style={styles.pickerContainer}>
                <Caption style={styles.pickerLabel}>Search and Select Client *</Caption>
                <Searchbar
                  placeholder="Search client by name or email..."
                  onChangeText={setClientSearchQuery}
                  value={clientSearchQuery}
                  style={styles.searchBar}
                  inputStyle={styles.searchInput}
                  iconColor={Colors.light.primary}
                />
                {clientSearchQuery.length > 0 && (
                  <Caption style={styles.searchResultsText}>
                    {filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''} found
                  </Caption>
                )}
                <Surface style={styles.dropdownSurface}>
                  <Menu
                    visible={clientMenuVisible}
                    onDismiss={() => setClientMenuVisible(false)}
                    anchor={
                      <Pressable 
                        onPress={() => setClientMenuVisible(true)}
                        style={styles.dropdownButton}
                      >
                        <View style={styles.dropdownContent}>
                          <Icon source="person" size={20} color={Colors.light.primary} />
                          <Body style={{
                            ...styles.dropdownText,
                            color: !selectedClient ? Colors.light.textSecondary : Colors.light.text
                          }}>
                            {selectedClient ? selectedClient.name : (clientSearchQuery ? 'Select from results' : 'Search for client')}
                          </Body>
                          <Icon source="chevron-down" size={20} color={Colors.light.textSecondary} />
                        </View>
                      </Pressable>
                    }
                  >
                    {filteredClients.length === 0 ? (
                      <Menu.Item
                        title={clientSearchQuery ? "No clients found" : "Start typing to search clients..."}
                        disabled
                        leadingIcon="search"
                      />
                    ) : (
                      filteredClients.map((client) => (
                        <Menu.Item
                          key={client.id}
                          onPress={() => {
                            setSelectedClient(client);
                            setClientMenuVisible(false);
                          }}
                          title={client.name + ' (' + client.email + ')'}
                          leadingIcon="person"
                        />
                      ))
                    )}
                  </Menu>
                </Surface>
              </View>

              <View style={styles.dateTimeRow}>
                <View style={styles.dateTimeColumn}>
                  <View style={styles.switchContainer}>
                    <Switch
                      value={overrideRestrictions}
                      onValueChange={setOverrideRestrictions}
                      thumbColor={overrideRestrictions ? Colors.light.primary : Colors.light.surface}
                      trackColor={{ false: Colors.light.border, true: Colors.light.secondary }}
                    />
                    <View style={{flex: 1}}>
                      <Body style={styles.switchLabel}>Override client&apos;s booking restrictions</Body>
                      <Caption style={{color: Colors.light.textSecondary, marginTop: 4}}>
                        {overrideRestrictions 
                          ? 'ON: Assign without checking subscription or class limits' 
                          : 'OFF: Check subscription and deduct 1 class when assigned'}
                      </Caption>
                    </View>
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                mode="outlined"
                onPress={() => {
                  setAssignClientModalVisible(false);
                  setClientMenuVisible(false);
                }}
                style={styles.modalActionButton}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleAssignClientToClass}
                loading={assigningClient}
                disabled={!selectedClient || assigningClient}
                style={styles.modalActionButton}
                buttonColor={Colors.light.primary}
              >
                Assign Client
              </Button>
            </View>
          </Surface>
        </Modal>
      </Portal>

      {/* Cancel Booking Modal */}
      <Portal>
        <Modal 
          visible={cancelBookingModalVisible} 
          onDismiss={() => {
            setCancelBookingModalVisible(false);
            setCancelBookingMenuVisible(false);
          }}
          contentContainerStyle={styles.modalContainer}
        >
          <Surface style={styles.modalSurface}>
            <H2 style={styles.modalTitle}>Cancel Booking</H2>
            
            <ScrollView style={styles.modalContent}>
              <View style={styles.pickerContainer}>
                <Caption style={styles.pickerLabel}>Select Booking *</Caption>
                <Surface style={styles.dropdownSurface}>
                  <Menu
                    visible={cancelBookingMenuVisible}
                    onDismiss={() => setCancelBookingMenuVisible(false)}
                    anchor={
                      <Pressable 
                        onPress={() => setCancelBookingMenuVisible(true)}
                        style={styles.dropdownButton}
                      >
                        <View style={styles.dropdownContent}>
                          <Icon source="person" size={20} color={Colors.light.primary} />
                          <Body style={{
                            ...styles.dropdownText,
                            color: !selectedBookingForCancellation ? Colors.light.textSecondary : Colors.light.text
                          }}>
                            {selectedBookingForCancellation ? (selectedBookingForCancellation.users?.name || selectedBookingForCancellation.client_name || selectedBookingForCancellation.user_name || 'Unknown Client') + ' - ' + selectedBookingForCancellation.status : 'Select booking'}
                          </Body>
                          <Icon source="chevron-down" size={20} color={Colors.light.textSecondary} />
                        </View>
                      </Pressable>
                    }
                  >
                    {getBookingsForClass(selectedClassForCancellation?.id || 0).map((booking) => (
                      <Menu.Item
                        key={booking.id}
                        onPress={() => {
                          setSelectedBookingForCancellation(booking);
                          setCancelBookingMenuVisible(false);
                        }}
                                                    title={(booking.users?.name || booking.client_name || booking.user_name || 'Unknown Client') + ' - ' + booking.status}
                        leadingIcon="close"
                      />
                    ))}
                  </Menu>
                </Surface>
              </View>

              <View style={styles.dateTimeRow}>
                {/* Notes input removed - bookings table doesn't have notes column
                <View style={styles.dateTimeColumn}>
                  <TextInput
                    label="Cancellation Notes (optional)"
                    value={cancelNotes}
                    onChangeText={(text) => setCancelNotes(text)}
                    mode="outlined"
                    multiline
                    numberOfLines={3}
                    style={styles.input}
                    placeholder="Reason for cancellation..."
                  />
                </View>
                */}
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                mode="outlined"
                onPress={() => {
                  setCancelBookingModalVisible(false);
                  setCancelBookingMenuVisible(false);
                }}
                style={styles.modalActionButton}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleCancelClientBooking}
                loading={cancellingBooking}
                disabled={!selectedBookingForCancellation || cancellingBooking}
                style={styles.modalActionButton}
                buttonColor={Colors.light.error}
              >
                Confirm Cancellation
              </Button>
            </View>
          </Surface>
        </Modal>
      </Portal>

      {/* Error Modal */}
      <Portal>
        <Modal 
          visible={errorModalVisible} 
          onDismiss={() => setErrorModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Surface style={styles.modalSurface}>
            <H2 style={styles.modalTitle}>
              {errorTitle}
            </H2>
            
            <Body style={styles.modalContent}>
              {errorMessage}
            </Body>
            
            <View style={styles.modalActions}>
              {errorActions.map((action, index) => (
                <Button
                  key={index}
                  mode={action.style === 'destructive' ? 'contained' : 'outlined'}
                  onPress={action.onPress}
                  style={[
                    styles.modalActionButton,
                    action.style === 'destructive' && { backgroundColor: Colors.light.error }
                  ]}
                  buttonColor={action.style === 'destructive' ? Colors.light.error : undefined}
                  textColor={action.style === 'destructive' ? Colors.light.surface : undefined}
                >
                  {action.text}
                </Button>
              ))}
            </View>
          </Surface>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    color: Colors.light.textSecondary,
  },
  header: {
    padding: spacing.lg,
    paddingTop: 60,
    backgroundColor: Colors.light.primary,
    elevation: 2,
  },
  headerCompact: {
    padding: spacing.md,
    paddingTop: spacing.md,
    backgroundColor: Colors.light.primary,
    elevation: 2,
  },
  headerRow: {
    flexDirection: isLargeScreen ? 'row' : 'column',
    alignItems: isLargeScreen ? 'center' : 'stretch',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  headerContent: {
    flexDirection: isLargeScreen ? 'row' : 'column',
    justifyContent: 'space-between',
    alignItems: isLargeScreen ? 'center' : 'stretch',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  headerTitle: {
    color: Colors.light.textOnAccent,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: isLargeScreen ? 1 : undefined,
    justifyContent: 'flex-end',
  },
  searchbar: {
    minWidth: 250,
    backgroundColor: Colors.light.surface,
  },
  viewToggle: {
    backgroundColor: Colors.light.surface,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  statusFilter: {
    backgroundColor: Colors.light.surface,
    flex: 1,
  },
  batchActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  selectedCount: {
    color: Colors.light.textOnAccent,
  },
  batchButton: {
    borderRadius: spacing.sm,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    minHeight: '100%',
  },
  hybridView: {
    flex: 1,
    flexDirection: 'row',
    padding: isLargeScreen ? spacing.lg : spacing.md,
    gap: isLargeScreen ? spacing.lg : spacing.md,
    minHeight: isLargeScreen ? 600 : 400,
  },
  hybridLeft: {
    flex: isLargeScreen ? 0.45 : 0.5,
    backgroundColor: Colors.light.surface,
    borderRadius: layout.borderRadius,
    elevation: 2,
    ...shadows.card,
    minWidth: isLargeScreen ? 400 : 300,
  },
  hybridRight: {
    flex: isLargeScreen ? 0.55 : 0.5,
    backgroundColor: Colors.light.surface,
    borderRadius: layout.borderRadius,
    elevation: 2,
    ...shadows.card,
  },
  hybridLeftContainer: {
    flexGrow: 1,
    padding: isLargeScreen ? spacing.lg : spacing.md,
  },
  hybridRightContainer: {
    flexGrow: 1,
    padding: isLargeScreen ? spacing.lg : spacing.md,
  },
  calendarSection: {
    flex: 1,
    padding: spacing.md,
  },
  calendarViewContainer: {
    flexGrow: 1,
  },
  calendar: {
    borderRadius: layout.borderRadius,
  },
  pcCalendar: {
    borderRadius: layout.borderRadius,
    paddingHorizontal: isLargeScreen ? spacing.md : spacing.sm,
    paddingVertical: isLargeScreen ? spacing.md : spacing.sm,
    minHeight: isLargeScreen ? 350 : 300,
  },
  dayClassesSection: {
    flex: 1,
    padding: spacing.md,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  dayTitle: {
    color: Colors.light.text,
  },
  addClassButton: {
    backgroundColor: Colors.light.accent,
  },
  dayClassesList: {
    flex: 1,
    paddingBottom: spacing.lg,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyStateText: {
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  classCard: {
    marginBottom: isLargeScreen ? spacing.lg : spacing.md,
    padding: isLargeScreen ? spacing.lg : spacing.md,
    borderRadius: layout.borderRadius,
    elevation: 1,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  classHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: isLargeScreen ? spacing.lg : spacing.md,
  },
  classTime: {
    alignItems: 'center',
    minWidth: isLargeScreen ? 100 : 80,
    paddingRight: isLargeScreen ? spacing.md : spacing.sm,
  },
  timeText: {
    color: Colors.light.accent,
    fontWeight: 'bold',
    fontSize: isLargeScreen ? 16 : 14,
  },
  durationText: {
    color: Colors.light.textSecondary,
    fontSize: isLargeScreen ? 12 : 11,
  },
  classInfo: {
    flex: 1,
  },
  className: {
    color: Colors.light.text,
    marginBottom: spacing.xs,
    fontSize: isLargeScreen ? 16 : 14,
    fontWeight: '600',
  },
  instructorName: {
    color: Colors.light.textSecondary,
    marginBottom: spacing.sm,
    fontSize: isLargeScreen ? 14 : 12,
  },
  classStats: {
    flexDirection: 'row',
    gap: isLargeScreen ? spacing.md : spacing.sm,
  },
  levelChip: {
    borderRadius: 12,
  },
  statusChip: {
    borderRadius: 12,
  },
  enrollmentChip: {
    borderRadius: 12,
  },
  chipText: {
    color: Colors.light.textOnAccent,
    fontSize: 12,
  },
  classActions: {
    flexDirection: 'row',
  },
  tableContainer: {
    flex: 1,
    padding: spacing.md,
  },
  tableScrollContainer: {
    flex: 1,
  },
  tableContentContainer: {
    minWidth: '100%',
  },
  tableVerticalScroll: {
    flex: 1,
    maxHeight: 600,
  },
  dataTable: {
    backgroundColor: Colors.light.surface,
    minWidth: 800,
  },
  checkboxColumn: {
    flex: 0.5,
  },
  rowActions: {
    flexDirection: 'row',
  },
  modalContainer: {
    margin: spacing.lg,
    maxHeight: '90%',
  },
  modalSurface: {
    padding: spacing.lg,
    borderRadius: layout.borderRadius,
    backgroundColor: Colors.light.surface,
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: spacing.lg,
    color: Colors.light.text,
  },
  modalContent: {
    maxHeight: 500,
  },
  searchBar: {
    marginBottom: spacing.md,
    backgroundColor: Colors.light.surface,
    elevation: 0,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  searchInput: {
    fontSize: 14,
    color: Colors.light.text,
  },
  searchResultsText: {
    marginBottom: spacing.sm,
    color: Colors.light.textSecondary,
    fontStyle: 'italic',
  },
  input: {
    marginBottom: spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  // Form styling
  dateTimeRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  dateTimeColumn: {
    flex: 1,
  },
  dateTimeInput: {
    marginBottom: 0,
  },
  numberRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  numberColumn: {
    flex: 1,
  },
  numberInput: {
    marginBottom: 0,
  },
  segmentedContainer: {
    marginBottom: spacing.md,
  },
  segmentedButtons: {
    backgroundColor: Colors.light.surface,
  },
  pickerContainer: {
    marginBottom: spacing.md,
  },
  pickerLabel: {
    marginBottom: spacing.sm,
    color: Colors.light.textSecondary,
  },
  selectorButton: {
    justifyContent: 'flex-start',
  },
  selectorButtonContent: {
    justifyContent: 'flex-start',
  },
  // Calendar view specific styles
  calendarClassesSection: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  calendarDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  calendarDayTitle: {
    color: Colors.light.text,
  },
  calendarEmptyState: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  calendarEmptyText: {
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  calendarClassesScrollView: {
    flex: 1,
    maxHeight: isLargeScreen ? 600 : 500, // Increased height for better visibility
  },
  calendarClassesScrollContent: {
    paddingBottom: isLargeScreen ? spacing.lg : spacing.md,
  },
  calendarClassesList: {
    gap: spacing.sm,
  },
  calendarClassCard: {
    padding: spacing.md,
    borderRadius: layout.borderRadius,
    elevation: 1,
  },
  calendarClassHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  calendarClassTime: {
    alignItems: 'center',
    minWidth: 80,
  },
  calendarTimeText: {
    color: Colors.light.accent,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  calendarDurationText: {
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  calendarClassInfo: {
    flex: 1,
  },
  calendarClassName: {
    color: Colors.light.text,
    marginBottom: spacing.xs,
  },
  calendarInstructorName: {
    color: Colors.light.textSecondary,
    marginBottom: spacing.sm,
  },
  calendarClassStats: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  calendarClassActions: {
    flexDirection: 'row',
  },
  classNotes: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  notesLabel: {
    color: Colors.light.textSecondary,
    fontSize: 12,
    marginBottom: spacing.xs,
  },
  notesText: {
    color: Colors.light.text,
    fontSize: 13,
  },

  // Day classes scrolling styles
  dayClassesScrollView: {
    flex: 1,
    maxHeight: isLargeScreen ? 600 : 500, // Increased height for better visibility
  },
  dayClassesScrollContent: {
    paddingBottom: isLargeScreen ? spacing.lg : spacing.md,
  },
  
  // Dropdown styles
  dropdownSurface: {
    borderRadius: layout.borderRadius,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.surface,
  },
  dropdownButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: layout.borderRadius,
  },
  dropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dropdownText: {
    flex: 1,
    color: Colors.light.text,
  },
  placeholderText: {
    color: Colors.light.textSecondary,
  },
  roomAvailabilityContainer: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: Colors.light.surface,
    borderRadius: layout.borderRadius,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  roomAvailabilityLabel: {
    marginBottom: spacing.xs,
  },
  roomAvailabilityStatus: {
    fontWeight: '500',
  },
  capacityHelper: {
    color: Colors.light.textSecondary,
    fontSize: 12,
    marginTop: spacing.xs,
    marginLeft: spacing.sm,
  },
  // Bookings modal specific styles
  classInfoHeader: {
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  classInfoText: {
    color: Colors.light.textSecondary,
    fontSize: 14,
    marginBottom: spacing.xs,
  },
  bookingsList: {
    gap: spacing.sm,
  },
  bookingCard: {
    padding: spacing.md,
    borderRadius: layout.borderRadius,
    elevation: 1,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  bookingInfo: {
    flex: 1,
  },
  clientName: {
    color: Colors.light.text,
    fontWeight: '600',
    fontSize: 16,
  },
  clientEmail: {
    color: Colors.light.textSecondary,
    fontSize: 14,
  },
  bookingStatusChip: {
    borderRadius: 12,
  },
  bookingDetails: {
    marginTop: spacing.sm,
  },
  bookingTime: {
    color: Colors.light.textSecondary,
    fontSize: 13,
  },
  bookingNotes: {
    color: Colors.light.text,
    fontSize: 13,
    marginTop: spacing.xs,
  },
  emptyBookings: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  emptyBookingsText: {
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  modalActionButton: {
    borderRadius: spacing.sm,
  },
  modalActionGroup: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  templateButton: {
    borderRadius: spacing.sm,
  },
  classNotesModal: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  bookingStatusContainer: {
    alignItems: 'center',
  },
  statusButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  // Template modal specific styles
  templateSaveSection: {
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  templateSectionTitle: {
    marginBottom: spacing.xs,
    color: Colors.light.text,
  },
  templateSectionText: {
    color: Colors.light.textSecondary,
    marginBottom: spacing.sm,
  },
  saveTemplateButton: {
    borderRadius: spacing.sm,
  },
  templateDivider: {
    marginVertical: spacing.md,
  },
  templateLoadSection: {
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  templatesList: {
    gap: spacing.sm,
  },
  templateCard: {
    padding: spacing.md,
    borderRadius: layout.borderRadius,
    elevation: 1,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  templateName: {
    color: Colors.light.text,
    fontWeight: '600',
    fontSize: 16,
  },
  templateDate: {
    color: Colors.light.textSecondary,
    fontSize: 12,
  },
  templateDetails: {
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  templateDetail: {
    color: Colors.light.textSecondary,
    fontSize: 13,
    marginBottom: spacing.xs,
  },
  templateNotes: {
    color: Colors.light.textSecondary,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  loadTemplateButton: {
    borderRadius: spacing.sm,
  },
  emptyTemplates: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  emptyTemplatesText: {
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  emptyTemplatesSubtext: {
    color: Colors.light.textSecondary,
    fontSize: 12,
  },
  switchRow: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  switchLabel: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  instructorAvailabilityContainer: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: Colors.light.surface,
    borderRadius: layout.borderRadius,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  instructorAvailabilityLabel: {
    color: Colors.light.textSecondary,
    marginBottom: spacing.xs,
    fontSize: 12,
  },
  instructorAvailabilityStatus: {
    fontWeight: '600',
    fontSize: 13,
  },
  // Time picker styles
  timePickerLabel: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    color: Colors.light.textSecondary,
    fontSize: 12,
  },
  timePickerScroll: {
    marginBottom: spacing.sm,
  },
  timePickerContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  timeButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 6,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
    minWidth: 50,
    alignItems: 'center',
  },
  timeButtonSelected: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  timeButtonText: {
    fontSize: 12,
    color: Colors.light.text,
    fontWeight: '500',
  },
  timeButtonTextSelected: {
    color: Colors.light.surface,
    fontWeight: '600',
  },
  actionButton: {
    padding: spacing.xs,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 32,
    minHeight: 32,
  },
  categoryChip: {
    borderRadius: 12,
  },
  roomInfo: {
    color: Colors.light.textSecondary,
    fontSize: 12,
    marginBottom: spacing.xs,
  },
});

export default PCClassManagement; 