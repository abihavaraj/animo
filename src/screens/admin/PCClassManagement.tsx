import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Dimensions, Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
import { Body, Caption, H2, H3 } from '../../../components/ui/Typography';
import { Colors } from '../../../constants/Colors';
import { layout, spacing } from '../../../constants/Spacing';
import WebCompatibleIcon from '../../components/WebCompatibleIcon';
import { activityService } from '../../services/activityService';
import { bookingService } from '../../services/bookingService';
import { BackendClass, classService, CreateClassRequest, UpdateClassRequest } from '../../services/classService';
import { notificationService } from '../../services/notificationService';
import { BackendUser, userService } from '../../services/userService';
import { RootState } from '../../store';
import { shadows } from '../../utils/shadows';

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
  
  // Prospect client modal states
  const [prospectClientModalVisible, setProspectClientModalVisible] = useState(false);
  const [creatingProspectClient, setCreatingProspectClient] = useState(false);
  const [prospectClientForm, setProspectClientForm] = useState({
    name: '',
    email: '',
    phone: '',
    emergencyContact: '',
    medicalConditions: '',
    referralSource: ''
  });
  
  // Cancel booking modal states
  const [cancelBookingModalVisible, setCancelBookingModalVisible] = useState(false);
  const [selectedClassForCancellation, setSelectedClassForCancellation] = useState<BackendClass | null>(null);
  const [selectedBookingForCancellation, setSelectedBookingForCancellation] = useState<any>(null);
  const [cancelNotes, setCancelNotes] = useState('');
  const [cancellingBooking, setCancellingBooking] = useState(false);
  const [cancelBookingMenuVisible, setCancelBookingMenuVisible] = useState(false);
  
  // Unassign client modal states
  const [unassignModalVisible, setUnassignModalVisible] = useState(false);
  const [selectedClassForUnassign, setSelectedClassForUnassign] = useState<BackendClass | null>(null);
  
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
    equipmentType: 'both' as BackendClass['equipment_type'],
    room: '' as 'Reformer Room' | 'Mat Room' | 'Cadillac Room' | 'Wall Room' | '',
    notes: '', // Add notes field
    visibility: 'public' as 'public' | 'private', // Add visibility field
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
        status: filterStatus === 'all' ? undefined : filterStatus,
        userRole: 'admin' // Ensure admin/reception can see all classes including private ones
        // No limit - truly unlimited for admin/reception - all past, present, future classes
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
      const response = await userService.getInstructors();
      if (response.success && response.data) {
        setInstructors(response.data);
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
    
    
    // Group classes by date to handle multiple classes per date
    const classesByDate: { [date: string]: BackendClass[] } = {};
    classes.forEach((classItem) => {
      const date = classItem.date;
      if (!classesByDate[date]) {
        classesByDate[date] = [];
      }
      classesByDate[date].push(classItem);
    });

    // Generate marked dates with proper multi-dot support
    Object.entries(classesByDate).forEach(([date, dateClasses]) => {
      // Always use dots array for consistency with markingType="multi-dot"
      const dots = dateClasses.map(classItem => ({
        color: getClassStatusColor(classItem)
      }));
      marked[date] = {
        dots: dots,
        marked: true
      };
    });

    // Highlight selected date
    if (selectedDate) {
      if (!marked[selectedDate]) {
        marked[selectedDate] = { dots: [], marked: true };
      }
      if (!marked[selectedDate].dots) {
        marked[selectedDate].dots = [];
      }
      // Preserve existing dots when selecting
      marked[selectedDate] = {
        ...marked[selectedDate],
        selected: true,
        selectedColor: Colors.light.accent
      };
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
      equipmentType: 'both' as 'mat' | 'reformer' | 'both',
      room: '' as 'Reformer Room' | 'Mat Room' | 'Cadillac Room' | 'Wall Room' | '',
      notes: '', // Initialize notes
      visibility: 'public' as 'public' | 'private', // Initialize visibility
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
      equipment: (classItem.equipment && Array.isArray(classItem.equipment) ? classItem.equipment.join(', ') : ''),
      description: classItem.description || '',
      equipmentType: classItem.equipment_type,
      room: (classItem as any).room || '',
      
      notes: classItem.notes || '', // Set notes from classItem
      visibility: classItem.visibility || 'public', // Set visibility from classItem
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
    console.log('🎯 Form data being submitted:');
    console.log('  name:', formData.name);
    console.log('  category:', formData.category);
    console.log('  visibility:', formData.visibility);
    console.log('  room:', formData.room);
    console.log('  equipmentType:', formData.equipmentType);
    console.log('🎯 Full form data:', JSON.stringify(formData, null, 2));

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
          
          visibility: formData.visibility,
          description: formData.description,
          equipmentType: formData.equipmentType,
          room: formData.room || '',
          notes: formData.notes || undefined, // Include notes in update
        };

        const response = await classService.updateClass(editingClass.id, updateData);
        if (response.success) {
          // Check for changes that require notifications
          const instructorChanged = String(editingClass.instructor_id) !== formData.instructorId;
          const timeChanged = editingClass.time !== formData.time;
          
          // Send notifications for significant changes
          try {
            if (instructorChanged) {
              const oldInstructorName = editingClass.instructor_name || 'Previous Instructor';
              const newInstructorName = formData.instructorName || 'New Instructor';
              
              await notificationService.sendInstructorChangeNotifications(
                editingClass.id,
                formData.name,
                formData.date,
                oldInstructorName,
                newInstructorName
              );
              console.log('📢 [RECEPTION] Instructor change notification sent for class:', formData.name);
            }
            
            if (timeChanged) {
              await notificationService.sendClassTimeChangeNotifications(
                editingClass.id,
                formData.name,
                formData.date,
                editingClass.time,
                formData.time
              );
              console.log('📢 [RECEPTION] Time change notification sent for class:', formData.name);
            }
          } catch (notificationError) {
            console.error('❌ Failed to send change notifications:', notificationError);
            // Don't block the main operation for notification errors
          }

          // Log activity for class update
          if (user) {
            await activityService.logActivity({
              staff_id: user.id,
              staff_name: user.name,
              staff_role: user.role as 'reception' | 'instructor' | 'admin',
              activity_type: 'class_updated',
              activity_description: `Updated class "${formData.name}"`,
              metadata: {
                classId: editingClass.id,
                className: formData.name,
                instructor: formData.instructorName,
                date: formData.date,
                time: formData.time,
                duration: formData.duration,
                category: formData.category,
                capacity: formData.capacity,
                room: formData.room,
                equipmentType: formData.equipmentType,
                visibility: formData.visibility,
                changes: {
                  from: {
                    name: editingClass.name,
                    instructor: editingClass.instructor_name,
                    date: editingClass.date,
                    time: editingClass.time,
                    duration: editingClass.duration
                  },
                  to: {
                    name: formData.name,
                    instructor: formData.instructorName,
                    date: formData.date,
                    time: formData.time,
                    duration: formData.duration
                  }
                }
              }
            });
          }

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
          
          visibility: formData.visibility,
          notes: formData.notes || undefined, // Include notes in create
        };

        console.log('🚀 Sending to API - createData:', JSON.stringify(createData, null, 2));
        const response = await classService.createClass(createData);
        if (response.success) {
          // Log activity for class creation
          if (user) {
            await activityService.logActivity({
              staff_id: user.id,
              staff_name: user.name,
              staff_role: user.role as 'reception' | 'instructor' | 'admin',
              activity_type: 'class_created',
              activity_description: `Created new class "${formData.name}"`,
              metadata: {
                classId: response.data?.id,
                className: formData.name,
                instructor: formData.instructorName,
                date: formData.date,
                time: formData.time,
                duration: formData.duration,
                category: formData.category,
                capacity: formData.capacity,
                room: formData.room,
                equipmentType: formData.equipmentType,
                visibility: formData.visibility,
                equipment: equipmentArray
              }
            });
          }

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
          markingType="multi-dot"
          markedDates={markedDates}
          theme={{
            backgroundColor: Colors.light.surface,
            calendarBackground: Colors.light.surface,
            textSectionTitleColor: Colors.light.text,
            selectedDayBackgroundColor: Colors.light.accent,
            selectedDayTextColor: Colors.light.background,
            todayTextColor: '#FFFFFF',
            todayBackgroundColor: Colors.light.accent,
            dayTextColor: Colors.light.text,
            textDisabledColor: Colors.light.textMuted,
            dotColor: Colors.light.primary,
            selectedDotColor: '#FFFFFF',
            arrowColor: Colors.light.text,
            disabledArrowColor: Colors.light.textMuted,
            monthTextColor: Colors.light.text,
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
          markingType="multi-dot"
          markedDates={markedDates}
          theme={{
            backgroundColor: Colors.light.surface,
            calendarBackground: Colors.light.surface,
            textSectionTitleColor: Colors.light.text,
            selectedDayBackgroundColor: Colors.light.accent,
            selectedDayTextColor: Colors.light.background,
            todayTextColor: '#FFFFFF',
            todayBackgroundColor: Colors.light.accent,
            dayTextColor: Colors.light.text,
            textDisabledColor: Colors.light.textMuted,
            dotColor: Colors.light.primary,
            selectedDotColor: '#FFFFFF',
            arrowColor: Colors.light.text,
            disabledArrowColor: Colors.light.textMuted,
            monthTextColor: Colors.light.text,
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
              {new Date(selectedDate).toLocaleDateString('sq-AL', { 
                weekday: 'long', 
                month: 'short', 
                day: 'numeric',
                timeZone: 'Europe/Tirane'
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
                          size={16}
                          iconColor={Colors.light.error}
                          onPress={() => handleDeleteClass(classItem.id.toString())}
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
            {new Date(selectedDate).toLocaleDateString('sq-AL', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric',
              timeZone: 'Europe/Tirane' 
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
                          onPress={() => handleUnassignClient(classItem)}
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
                          size={16}
                          iconColor={Colors.light.error}
                          onPress={() => handleDeleteClass(classItem.id.toString())}
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
                      onPress={() => handleUnassignClient(classItem)}
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
                      onPress={() => handleDeleteClass(classItem.id.toString())}
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
    return new Date(dateString).toLocaleDateString('sq-AL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'Europe/Tirane' // Albania timezone
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('sq-AL', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false, // Use 24-hour format for Albanian
      timeZone: 'Europe/Tirane'
    });
  };

  const formatBookingTimestamp = (timestamp: string) => {
    try {
      // Create a Date object from the full timestamp
      const date = new Date(timestamp);
      
      // Format for Albania timezone (CET/CEST - UTC+1/UTC+2) in Albanian format
      return date.toLocaleString('sq-AL', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false, // Use 24-hour format for Albanian
        timeZone: 'Europe/Tirane' // Albania timezone
      });
    } catch (error) {
      console.error('Error formatting booking timestamp:', error);
      return 'Invalid date';
    }
  };

  const handleClassCardClick = (classItem: BackendClass) => {
    setSelectedClassForBookings(classItem);
    setBookingsModalVisible(true);
  };

  const handleUpdateBookingStatus = async (bookingId: number, newStatus: string) => {
    try {
      setUpdatingBooking(bookingId);
      
      // Get booking details before update for activity logging
      const booking = bookings.find(b => b.id === bookingId);
      const oldStatus = booking?.status;
      
      const response = await bookingService.updateBookingStatus(bookingId, newStatus);
      
      if (response.success) {
        // Log activity for booking status change
        if (user && booking) {
          const classInfo = classes.find(c => c.id === booking.class_id);
          await activityService.logActivity({
            staff_id: user.id,
            staff_name: user.name,
            staff_role: user.role as 'reception' | 'instructor' | 'admin',
            activity_type: 'booking_status_changed',
            activity_description: `Changed booking status from "${oldStatus}" to "${newStatus}"`,
            client_id: String(booking.user_id),
            client_name: booking.client_name || booking.user_name || 'Unknown Client',
            metadata: {
              bookingId: bookingId,
              classId: booking.class_id,
              className: classInfo?.name || 'Unknown Class',
              classDate: classInfo?.date,
              classTime: classInfo?.time,
              instructor: classInfo?.instructor_name,
              oldStatus: oldStatus,
              newStatus: newStatus,
              changeReason: 'Manual status update by staff'
            }
          });
        }

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

  const handleCreateProspectClient = async () => {
    if (!prospectClientForm.name.trim()) {
      showErrorModal('Error', 'Please provide name for the prospect client');
      return;
    }

    try {
      setCreatingProspectClient(true);
      
      // Create prospect client with temporary password and client role (since prospect isn't in DB constraint yet)
      const tempPassword = Math.random().toString(36).slice(-8);
      const userData = {
        name: prospectClientForm.name.trim(),
        email: prospectClientForm.email.trim() || `prospect_${Date.now()}@temp.local`,
        password: tempPassword,
        phone: prospectClientForm.phone.trim() || undefined,
        role: 'client' as const, // Use client role for now until DB constraint is updated
        emergency_contact: prospectClientForm.emergencyContact.trim() || undefined,
        medical_conditions: prospectClientForm.medicalConditions.trim() || undefined,
        referral_source: prospectClientForm.referralSource.trim() || 'Prospect Client'
      };

      const response = await userService.createUser(userData);
      
      if (response.success && response.data) {
        // Auto-assign the prospect client to the selected class
        const assignResponse = await bookingService.assignClientToClass(
          response.data.id,
          selectedClassForAssignment!.id,
          'Free trial class for prospect client',
          true // Override restrictions for prospect clients
        );

        if (assignResponse.success) {
          showErrorModal('Success', `Prospect client "${prospectClientForm.name}" created and assigned to class successfully! (Note: Created as regular client - free trial class assigned)`);
          setProspectClientModalVisible(false);
          setProspectClientForm({
            name: '',
            email: '',
            phone: '',
            emergencyContact: '',
            medicalConditions: '',
            referralSource: ''
          });
          await loadClasses(); // Refresh classes to show updated enrollment
          await loadBookings(); // Refresh bookings
        } else {
          showErrorModal('Partial Success', `Prospect client created but failed to assign to class: ${assignResponse.error}`);
        }
      } else {
        showErrorModal('Error', response.error || 'Failed to create prospect client');
      }
    } catch (error) {
      console.error('Error creating prospect client:', error);
      showErrorModal('Error', 'Failed to create prospect client');
    } finally {
      setCreatingProspectClient(false);
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
        
        // Send class assignment notification to the client
        try {
          const notificationResult = await notificationService.createTranslatedNotification(
            selectedClient.id,
            'class_assignment',
            {
              type: 'class_assignment',
              className: selectedClassForAssignment.name,
              instructorName: selectedClassForAssignment.instructor_name,
              date: new Date(selectedClassForAssignment.date).toLocaleDateString(),
              time: selectedClassForAssignment.time
            }
          );

          // Also send push notification to user's mobile device
          if (notificationResult.success && notificationResult.data) {
            await notificationService.sendPushNotificationToUser(
              selectedClient.id,
              notificationResult.data.title,
              notificationResult.data.message
            );
          }

          console.log('📢 [RECEPTION] Class assignment notification sent to client:', selectedClient.name);
        } catch (notificationError) {
          console.error('❌ Failed to send class assignment notification:', notificationError);
          // Don't block the main operation for notification errors
        }
        
        // Log activity for client assignment to class
        if (user) {
          await activityService.logActivity({
            staff_id: user.id,
            staff_name: user.name,
            staff_role: user.role as 'reception' | 'instructor' | 'admin',
            activity_type: overrideRestrictions ? 'client_assigned_with_override' : 'client_assigned_to_class',
            activity_description: overrideRestrictions 
              ? `Assigned ${selectedClient.name} to "${selectedClassForAssignment.name}" with override rules`
              : `Assigned ${selectedClient.name} to "${selectedClassForAssignment.name}"`,
            client_id: String(selectedClient.id),
            client_name: selectedClient.name,
            metadata: {
              classId: selectedClassForAssignment.id,
              className: selectedClassForAssignment.name,
              classDate: selectedClassForAssignment.date,
              classTime: selectedClassForAssignment.time,
              instructor: selectedClassForAssignment.instructor_name,
              category: selectedClassForAssignment.category,
              overrideUsed: overrideRestrictions,
              notes: assignNotes || null,
              clientEmail: selectedClient.email,
              clientRole: selectedClient.role,
              bookingId: response.data?.id
            }
          });
        }
        
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
        
        // Check if it's a capacity error - no override option for capacity limits
        if (response.error?.includes('full capacity')) {
          showErrorModal(
            'Class Full',
            response.error,
            [
              { text: 'OK', onPress: () => setErrorModalVisible(false) }
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
        const waitlistPromoted = response.data?.waitlistPromoted;
        const successMessage = waitlistPromoted 
          ? 'Booking cancelled successfully and next person on waitlist has been promoted!'
          : 'Booking cancelled successfully';
        Alert.alert('Success', successMessage);
        setCancelBookingModalVisible(false);
        setCancelBookingMenuVisible(false); // Reset menu state
        setSelectedClassForCancellation(null);
        setSelectedBookingForCancellation(null);
        await loadClasses(); // Refresh classes to show updated enrollment
        await loadBookings(); // Refresh bookings
        // Reopen bookings modal to show updated list
        setTimeout(() => {
          setBookingsModalVisible(true);
        }, 500);
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

  const handleRemoveClientFromClass = async (booking: any) => {
    console.log('🗑️ handleRemoveClientFromClass called');
    console.log('🗑️ booking:', booking);
    console.log('🗑️ selectedClassForBookings:', selectedClassForBookings);
    
    if (!booking || !selectedClassForBookings) {
      console.log('❌ Missing booking or selectedClassForBookings');
      Alert.alert('Error', 'Please select a booking to remove');
      return;
    }

    // Show confirmation dialog
    const clientName = booking.users?.name || booking.client_name || booking.user_name || 'Unknown Client';
    const className = selectedClassForBookings.name;
    
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`Are you sure you want to completely remove ${clientName} from ${className}? This will permanently delete their booking and restore their class credit if applicable.`);
      if (!confirmed) return;
    } else {
      Alert.alert(
        'Remove Client',
        `Are you sure you want to completely remove ${clientName} from ${className}? This will permanently delete their booking and restore their class credit if applicable.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Remove', 
            style: 'destructive',
            onPress: () => performRemoveClient(booking)
          }
        ]
      );
      return;
    }
    
    performRemoveClient(booking);
  };

  const performRemoveClient = async (booking: any) => {
    try {
      console.log('🚀 Starting client removal...');
      setUpdatingBooking(booking.id);
      const response = await bookingService.removeClientBooking(
        booking.user_id,
        selectedClassForBookings!.id
      );

      console.log('📝 Removal response:', response);

      if (response.success) {
        console.log('✅ Client removal successful');
        const waitlistPromoted = response.data?.waitlistPromoted;
        const successMessage = waitlistPromoted 
          ? 'Client removed successfully, credit restored, and next person on waitlist has been promoted!'
          : 'Client removed successfully and class credit restored';
        
        if (Platform.OS === 'web') {
          window.alert(successMessage);
        } else {
          Alert.alert('Success', successMessage);
        }
        
        setBookingStatusMenuVisible(null); // Close any open menus
        await loadClasses(); // Refresh classes to show updated enrollment
        await loadBookings(); // Refresh bookings
      } else {
        console.log('❌ Client removal failed:', response.error);
        const errorMsg = response.error || 'Failed to remove client';
        if (Platform.OS === 'web') {
          window.alert('Error: ' + errorMsg);
        } else {
          Alert.alert('Error', errorMsg);
        }
      }
    } catch (error) {
      console.error('❌ Error removing client:', error);
      const errorMsg = 'Failed to remove client from class';
      if (Platform.OS === 'web') {
        window.alert('Error: ' + errorMsg);
      } else {
        Alert.alert('Error', errorMsg);
      }
    } finally {
      setUpdatingBooking(null);
    }
  };

  const handleUnassignClient = async (classItem: BackendClass) => {
    console.log('🔄 handleUnassignClient called for class:', classItem.name);
    
    try {
      // Get bookings for this class to find confirmed clients
      const classBookings = getBookingsForClass(classItem.id);
      console.log('📋 Found bookings for class:', classBookings.length);
      
      if (classBookings.length === 0) {
        const message = 'No clients are assigned to this class.';
        if (Platform.OS === 'web') {
          window.alert(message);
        } else {
          Alert.alert('No Clients', message);
        }
        return;
      }

      // Filter only confirmed bookings (excluding cancelled, waitlist, etc.)
      const confirmedBookings = classBookings.filter(booking => booking.status === 'confirmed');
      
      if (confirmedBookings.length === 0) {
        const message = 'No confirmed clients found to unassign from this class.';
        if (Platform.OS === 'web') {
          window.alert(message);
        } else {
          Alert.alert('No Confirmed Clients', message);
        }
        return;
      }

      // Always open unassign modal for client selection and action
      setSelectedClassForUnassign(classItem);
      setUnassignModalVisible(true);
    } catch (error) {
      console.error('❌ Error in handleUnassignClient:', error);
      const errorMsg = 'Failed to unassign client';
      if (Platform.OS === 'web') {
        window.alert('Error: ' + errorMsg);
      } else {
        Alert.alert('Error', errorMsg);
      }
    }
  };

  const performUnassignClient = async (booking: any, classItem: BackendClass) => {
    try {
      const clientName = booking.users?.name || booking.client_name || booking.user_name || 'Unknown Client';
      
      setUpdatingBooking(booking.id);
      
      // Use cancelClientBooking which handles refunds intelligently
      // It will refund ONLY if the client was actually charged for the class
      const response = await bookingService.cancelClientBooking(
        booking.user_id,
        classItem.id
      );

      if (response.success) {
        
        // Cancel any class reminders for this user
        try {
          const pushNotificationService = (await import('../../services/pushNotificationService')).pushNotificationService;
          await pushNotificationService.cancelClassReminder(
            booking.user_id, 
            booking.class_id || classItem.id
          );
        } catch (reminderError) {
          // Don't fail the operation if reminder cancellation fails
        }
        
        // Log activity for client unassignment from class
        if (user) {
          await activityService.logActivity({
            staff_id: user.id,
            staff_name: user.name,
            staff_role: user.role as 'reception' | 'instructor' | 'admin',
            activity_type: 'client_unassigned_from_class',
            activity_description: `Removed ${clientName} from "${classItem.name}"`,
            client_id: String(booking.user_id),
            client_name: clientName,
            metadata: {
              classId: classItem.id,
              className: classItem.name,
              classDate: classItem.date,
              classTime: classItem.time,
              instructor: classItem.instructor_name,
              category: classItem.category,
              bookingId: booking.id,
              bookingStatus: booking.status,
              creditRestored: response.data?.creditRestored || false,
              waitlistPromoted: response.data?.waitlistPromoted || false,
              promotedClient: response.data?.promotedClientName || null,
              reason: 'Manual unassignment by staff'
            }
          });
        }
        
        // Send notification to the removed client
        try {
          const staffName = user?.name || 'Studio Staff';
          const notificationResult = await notificationService.createTranslatedNotification(
            booking.user_id,
            'class_assignment_cancelled',
            {
              type: 'class_assignment_cancelled',
              className: classItem.name,
              date: classItem.date,
              time: classItem.time,
              staffName: staffName,
              creditRestored: response.data?.creditRestored || false
            }
          );
          
          // Send push notification for immediate delivery
          if (notificationResult.success && notificationResult.data) {
            await notificationService.sendPushNotificationToUser(
              booking.user_id,
              notificationResult.data.title,
              notificationResult.data.message
            );
          }
        } catch (notificationError) {
          // Don't fail the operation if notification fails
        }
        
        const waitlistPromoted = response.data?.waitlistPromoted;
        const successMessage = waitlistPromoted 
          ? `${clientName} unassigned successfully and next person on waitlist has been promoted!`
          : `${clientName} unassigned successfully. Class credit restored if applicable.`;
        
        if (Platform.OS === 'web') {
          window.alert(successMessage);
        } else {
          Alert.alert('Success', successMessage);
        }
        
        await loadClasses(); // Refresh classes to show updated enrollment
        await loadBookings(); // Refresh bookings
        } else {
          const errorMsg = response.error || 'Failed to unassign client';
          if (Platform.OS === 'web') {
            window.alert('Error: ' + errorMsg);
          } else {
            Alert.alert('Error', errorMsg);
          }
        }
      } catch (error) {
        const errorMsg = 'Failed to unassign client from class';
        if (Platform.OS === 'web') {
          window.alert('Error: ' + errorMsg);
        } else {
          Alert.alert('Error', errorMsg);
        }
      } finally {
      setUpdatingBooking(null);
    }
  };

  const handleDeleteClass = (classId: string) => {
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

  const performDeleteClass = async (classId: string) => {
    console.log('🗑️ Delete confirmed for class ID:', classId);
    
    // Get class details before deletion for activity logging
    const classToDelete = classes.find(cls => cls.id.toString() === classId);
    
    // Debug authentication
    console.log('🔍 Current user:', user);
    console.log('🔍 User role:', user?.role);
    console.log('🔍 User ID:', user?.id);
    
    try {
      console.log('🗑️ Calling classService.deleteClass...');
      const response = await classService.deleteClass(classId);
      console.log('🗑️ Delete response:', response);
      if (response.success) {
        // Log activity for class deletion
        if (user && classToDelete) {
          await activityService.logActivity({
            staff_id: user.id,
            staff_name: user.name,
            staff_role: user.role as 'reception' | 'instructor' | 'admin',
            activity_type: 'class_deleted',
            activity_description: `Deleted class "${classToDelete.name}"`,
            metadata: {
              classId: classToDelete.id,
              className: classToDelete.name,
              instructor: classToDelete.instructor_name,
              date: classToDelete.date,
              time: classToDelete.time,
              duration: classToDelete.duration,
              category: classToDelete.category,
              capacity: classToDelete.capacity,
              room: classToDelete.room,
              equipmentType: classToDelete.equipment_type,
              status: classToDelete.status
            }
          });
        }
        // Cancel any scheduled reminder notifications for this class
        try {
          await notificationService.cancelClassNotifications(Number(classId));
          console.log('✅ Class reminder notifications cancelled for deleted class');
        } catch (notificationError) {
          console.error('❌ Failed to cancel class notifications:', notificationError);
          // Don't block the deletion for notification errors
        }
        
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

      {/* Create Class Modal - Web Optimized */}
      {modalVisible && (
        <View style={styles.webModalOverlay}>
          <View style={styles.webModalContainer}>
            <View style={styles.webModalSurface}>
            <View style={styles.webModalHeader}>
              <H2 style={styles.webModalTitle}>
                {editingClass ? 'Edit Class' : 'Create New Class'}
              </H2>
              <TouchableOpacity 
                style={styles.webCloseButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.webCloseButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.webModalContent} showsVerticalScrollIndicator={true}>
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
                          <Icon source="keyboard-arrow-down" size={20} color={Colors.light.textSecondary} />
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
                            setFormData({
                              ...formData, 
                              instructorId: instructorId,
                              instructorName: instructor.name
                            });
                            setInstructorMenuVisible(false);
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
                        '08:00', '09:00', '18:00', '20:00'
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
                  onValueChange={(value) => {
                    const newRoom = value as 'Reformer Room' | 'Mat Room' | 'Cadillac Room' | 'Wall Room';
                    // Set default capacity based on room selection
                    let defaultCapacity = 10; // Default for other rooms
                    if (newRoom === 'Reformer Room') {
                      defaultCapacity = 8;
                    } else if (newRoom === 'Mat Room') {
                      defaultCapacity = 10;
                    }
                    setFormData({
                      ...formData, 
                      room: newRoom,
                      capacity: defaultCapacity
                    });
                  }}
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

              {/* Class Visibility Toggle */}
              <View style={styles.visibilityContainer}>
                <View style={styles.visibilityHeader}>
                  <WebCompatibleIcon 
                    name={formData.visibility === 'private' ? 'visibility-off' : 'visibility'} 
                    size={24} 
                    color={Colors.light.primary} 
                  />
                  <View style={styles.visibilityTextContainer}>
                    <Body style={styles.visibilityTitle}>
                      {formData.visibility === 'private' ? 'Private Class' : 'Public Class'}
                    </Body>
                    <Caption style={styles.visibilityDescription}>
                      {formData.visibility === 'private' 
                        ? 'Only visible to reception, instructors, and admin'
                        : 'Visible to all users including clients'
                      }
                    </Caption>
                  </View>
                  <Switch
                    value={formData.visibility === 'private'}
                    onValueChange={(value) => setFormData({...formData, visibility: value ? 'private' : 'public'})}
                    thumbColor={formData.visibility === 'private' ? Colors.light.primary : Colors.light.surface}
                    trackColor={{ false: Colors.light.border, true: Colors.light.secondary }}
                  />
                </View>
              </View>
              
              <View style={styles.webModalActions}>
                <TouchableOpacity
                  style={[styles.webCancelButton, saving && styles.webButtonDisabled]}
                  onPress={() => setModalVisible(false)}
                  disabled={saving}
                >
                  <Text style={styles.webCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <View style={styles.modalActionGroup}>
                  <TouchableOpacity
                    style={styles.webTemplateButton}
                    onPress={() => setTemplateModalVisible(true)}
                  >
                    <Text style={styles.webTemplateButtonText}>📝 Templates</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.webSubmitButton, (saving) && styles.webButtonDisabled]}
                    onPress={handleSaveClass}
                    disabled={saving}
                  >
                    <Text style={styles.webSubmitButtonText}>
                      {saving ? 'Processing...' : (editingClass ? 'Update Class' : 'Create Class')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
            </View>
          </View>
        </View>
      )}

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
                  {getEnrollmentCount(selectedClassForBookings.id)}/{selectedClassForBookings.capacity || 0} enrolled
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
                                    <Chip
                                      style={[styles.bookingStatusChip, { backgroundColor: getStatusColor(booking.status) }]}
                                      textStyle={styles.chipText}
                                compact={false}
                                    >
                                      {updatingBooking === booking.id ? 'Updating...' : booking.status}
                                    </Chip>
                            </View>
                          </View>
                          <View style={styles.bookingDetails}>
                            <Body style={styles.bookingTime}>
                              Booked: {formatBookingTimestamp(booking.created_at)}
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
                            Duration: {template.duration}min
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
                <View style={styles.pickerHeader}>
                  <Caption style={styles.pickerLabel}>Search and Select Client *</Caption>
                  <Button
                    mode="outlined"
                    compact
                    icon="account-plus"
                    onPress={() => setProspectClientModalVisible(true)}
                    style={styles.addProspectButton}
                    buttonColor={Colors.light.success}
                    textColor={Colors.light.surface}
                  >
                    Add Prospect
                  </Button>
                </View>
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
                          <Icon source="keyboard-arrow-down" size={20} color={Colors.light.textSecondary} />
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
                      <Body style={styles.switchLabel}>Override client&apos;s subscription restrictions</Body>
                      <Caption style={{color: Colors.light.textSecondary, marginTop: 4}}>
                        {overrideRestrictions 
                          ? 'ON: Assign without checking subscription status (class capacity still enforced)' 
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

      {/* Prospect Client Creation Modal */}
      <Portal>
        <Modal 
          visible={prospectClientModalVisible} 
          onDismiss={() => {
            setProspectClientModalVisible(false);
            setProspectClientForm({
              name: '',
              email: '',
              phone: '',
              emergencyContact: '',
              medicalConditions: '',
              referralSource: ''
            });
          }}
          contentContainerStyle={styles.modalContainer}
        >
          <Surface style={styles.modalSurface}>
            <H2 style={styles.modalTitle}>Add Prospect Client</H2>
            <Caption style={styles.modalSubtitle}>
              Create a new prospect client and assign them to "{selectedClassForAssignment?.name}" for a free trial class (temporarily created as regular client)
            </Caption>
            
            <ScrollView style={styles.modalContent}>
              <View style={styles.formRow}>
                <TextInput
                  label="Full Name *"
                  value={prospectClientForm.name}
                  onChangeText={(text) => setProspectClientForm(prev => ({ ...prev, name: text }))}
                  mode="outlined"
                  style={styles.input}
                  placeholder="Enter full name"
                />
              </View>

              <View style={styles.formRow}>
                <TextInput
                  label="Email Address"
                  value={prospectClientForm.email}
                  onChangeText={(text) => setProspectClientForm(prev => ({ ...prev, email: text }))}
                  mode="outlined"
                  style={styles.input}
                  placeholder="Enter email address (optional)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formRow}>
                <TextInput
                  label="Phone Number"
                  value={prospectClientForm.phone}
                  onChangeText={(text) => setProspectClientForm(prev => ({ ...prev, phone: text }))}
                  mode="outlined"
                  style={styles.input}
                  placeholder="Enter phone number"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.formRow}>
                <TextInput
                  label="Emergency Contact"
                  value={prospectClientForm.emergencyContact}
                  onChangeText={(text) => setProspectClientForm(prev => ({ ...prev, emergencyContact: text }))}
                  mode="outlined"
                  style={styles.input}
                  placeholder="Emergency contact name and phone"
                />
              </View>

              <View style={styles.formRow}>
                <TextInput
                  label="Medical Conditions"
                  value={prospectClientForm.medicalConditions}
                  onChangeText={(text) => setProspectClientForm(prev => ({ ...prev, medicalConditions: text }))}
                  mode="outlined"
                  style={styles.input}
                  placeholder="Any medical conditions or injuries"
                  multiline
                  numberOfLines={2}
                />
              </View>

              <View style={styles.formRow}>
                <TextInput
                  label="Referral Source"
                  value={prospectClientForm.referralSource}
                  onChangeText={(text) => setProspectClientForm(prev => ({ ...prev, referralSource: text }))}
                  mode="outlined"
                  style={styles.input}
                  placeholder="How did they hear about us?"
                />
              </View>

              <View style={styles.infoBox}>
                <Icon source="information" size={20} color={Colors.light.primary} />
                <Caption style={styles.infoText}>
                  This prospect client will be created as a regular client and assigned to the selected class with override enabled for a free trial session.
                </Caption>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                mode="outlined"
                onPress={() => {
                  setProspectClientModalVisible(false);
                  setProspectClientForm({
                    name: '',
                    email: '',
                    phone: '',
                    emergencyContact: '',
                    medicalConditions: '',
                    referralSource: ''
                  });
                }}
                style={styles.modalActionButton}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleCreateProspectClient}
                loading={creatingProspectClient}
                disabled={!prospectClientForm.name.trim() || creatingProspectClient}
                style={styles.modalActionButton}
                buttonColor={Colors.light.success}
              >
                Create & Assign
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
                          <Icon source="keyboard-arrow-down" size={20} color={Colors.light.textSecondary} />
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

      {/* Unassign Client Modal */}
      <Portal>
        <Modal 
          visible={unassignModalVisible} 
          onDismiss={() => {
            setUnassignModalVisible(false);
            setSelectedClassForUnassign(null);
          }}
          contentContainerStyle={styles.modalContainer}
        >
          <Surface style={styles.modalSurface}>
            <H2 style={styles.modalTitle}>
              {selectedClassForUnassign ? `Unassign Client from ${selectedClassForUnassign.name}` : 'Unassign Client'}
            </H2>
            
            {selectedClassForUnassign && (
              <View style={styles.classInfoHeader}>
                <Body style={styles.classInfoText}>
                  {selectedClassForUnassign.date} at {selectedClassForUnassign.time}
                </Body>
                <Body style={styles.classInfoText}>
                  Instructor: {selectedClassForUnassign.instructor_name}
                </Body>
                <Body style={styles.classInfoText}>
                  {getEnrollmentCount(selectedClassForUnassign.id)}/{selectedClassForUnassign.capacity || 0} enrolled
                </Body>
    </View>
            )}

            <ScrollView style={styles.modalContent}>
              {selectedClassForUnassign ? (
                (() => {
                  const classBookings = getBookingsForClass(selectedClassForUnassign.id);
                  const confirmedBookings = classBookings.filter(booking => booking.status === 'confirmed');
                  
                  return confirmedBookings.length > 0 ? (
                    <View style={styles.bookingsList}>
                      <Body style={styles.unassignInstructions}>
                        Select a client to unassign. Credits will be refunded only if they were charged when assigned.
                      </Body>
                      {confirmedBookings.map((booking, index) => (
                        <Surface key={booking.id || index} style={styles.unassignBookingCard}>
                          <View style={styles.bookingHeader}>
                            <View style={styles.bookingInfo}>
                              <H3 style={styles.clientName}>
                                {booking.users?.name || booking.client_name || booking.user_name || 'Unknown Client'}
                              </H3>
                              <Body style={styles.clientEmail}>
                                {booking.users?.email || booking.client_email || booking.user_email || 'No email'}
                              </Body>
                            </View>
                            <View style={styles.unassignActions}>
                              <Button
                                mode="contained"
                                onPress={async () => {
                                  const clientName = booking.users?.name || booking.client_name || booking.user_name || 'Unknown Client';
                                  const confirmed = Platform.OS === 'web' 
                                    ? window.confirm(`Unassign ${clientName} from this class?\n\nThis will:\n- Cancel their booking\n- Restore class credit if they were charged\n- Promote next person from waitlist if applicable`)
                                    : await new Promise((resolve) => {
                                        Alert.alert(
                                          'Unassign Client',
                                          `Unassign ${clientName} from this class?\n\nThis will:\n- Cancel their booking\n- Restore class credit if they were charged\n- Promote next person from waitlist if applicable`,
                                          [
                                            { text: 'No', style: 'cancel', onPress: () => resolve(false) },
                                            { text: 'Yes, Unassign', style: 'destructive', onPress: () => resolve(true) }
                                          ]
                                        );
                                      });
                                  
                                  if (confirmed) {
                                    setUnassignModalVisible(false);
                                    await performUnassignClient(booking, selectedClassForUnassign);
                                  }
                                }}
                                style={styles.unassignButtonSingle}
                                buttonColor={Colors.light.error}
                              >
                                Unassign
                              </Button>
                            </View>
                          </View>
                          <View style={styles.bookingDetails}>
                            <Body style={styles.bookingTime}>
                              Booked: {formatBookingTimestamp(booking.created_at)}
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
                      <Body style={styles.emptyBookingsText}>No confirmed bookings for this class</Body>
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
                onPress={() => {
                  setUnassignModalVisible(false);
                  setSelectedClassForUnassign(null);
                }}
                style={styles.modalActionButton}
              >
                Close
              </Button>
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
    maxWidth: isLargeScreen ? 600 : '100%',
    alignSelf: 'center',
  },
  modalSurface: {
    padding: spacing.lg,
    borderRadius: layout.borderRadius,
    backgroundColor: Colors.light.surface,
  },
  // Web-Optimized Modal Styles
  webModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    paddingHorizontal: spacing.lg,
  },
  webModalContainer: {
    width: '100%',
    maxWidth: 800, // Optimal width for PC/laptop screens
    maxHeight: '90%',
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 24,
  },
  webModalSurface: {
    padding: spacing.xl,
    flex: 1,
  },
  webModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  webModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
  },
  webCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.md,
  },
  webCloseButtonText: {
    fontSize: 18,
    color: '#6b7280',
    fontWeight: 'bold',
  },
  webModalContent: {
    flex: 1,
    paddingVertical: spacing.md,
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
  // Web-Optimized Modal Actions
  webModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: spacing.md,
  },
  webCancelButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 8,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webCancelButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  webTemplateButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webTemplateButtonText: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '500',
  },
  webSubmitButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webSubmitButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  webButtonDisabled: {
    opacity: 0.6,
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
  statusButtonLarge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.02)',
    minWidth: 120,
    alignItems: 'center',
  },
  statusButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    gap: spacing.xs,
  },
  menuContent: {
    backgroundColor: Colors.light.surface,
    borderRadius: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    minWidth: 160,
  },
  menuItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.light.text,
  },
  menuItemDanger: {
    color: Colors.light.error,
  },
  // Unassign modal styles
  unassignInstructions: {
    textAlign: 'center',
    color: Colors.light.textSecondary,
    marginBottom: spacing.md,
    fontStyle: 'italic',
  },
  unassignBookingCard: {
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: 8,
    elevation: 2,
  },
  unassignActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  unassignButton: {
    flex: 1,
  },
  unassignButtonSingle: {
    minWidth: 120,
    alignSelf: 'flex-end',
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
  // Visibility toggle styles
  visibilityContainer: {
    marginTop: 16,
    marginBottom: 16,
    padding: 16,
    backgroundColor: Colors.light.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  visibilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  visibilityTextContainer: {
    flex: 1,
  },
  visibilityTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  visibilityDescription: {
    color: Colors.light.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  // New styles for prospect client functionality
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  addProspectButton: {
    borderRadius: spacing.sm,
  },
  modalSubtitle: {
    color: Colors.light.textSecondary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  formRow: {
    marginBottom: spacing.md,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.light.surface,
    padding: spacing.md,
    borderRadius: layout.borderRadius,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  infoText: {
    flex: 1,
    color: Colors.light.textSecondary,
    lineHeight: 18,
  },
});

export default PCClassManagement; 