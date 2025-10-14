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
import { supabase } from '../../config/supabase.config';
import { activityService } from '../../services/activityService';
import { bookingService } from '../../services/bookingService';
import { BackendClass, classService, CreateClassRequest, UpdateClassRequest } from '../../services/classService';
import { notificationService } from '../../services/notificationService';
import { supabaseApiService } from '../../services/supabaseApi';
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
  const [waitlistEntries, setWaitlistEntries] = useState<any[]>([]);
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
  const [selectedClassForBookings, setSelectedClassForBookings] = useState<any>(null);
  const [updatingBooking, setUpdatingBooking] = useState<number | null>(null);
  const [bookingStatusMenuVisible, setBookingStatusMenuVisible] = useState<number | null>(null);
  const [refreshingModal, setRefreshingModal] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  
  // Assign client modal states
  const [assignClientModalVisible, setAssignClientModalVisible] = useState(false);
  const [selectedClassForAssignment, setSelectedClassForAssignment] = useState<BackendClass | null>(null);
  const [isWaitlistAssignment, setIsWaitlistAssignment] = useState(false);
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
  const [shouldRefundCredit, setShouldRefundCredit] = useState(true); // Default to refund
  const [isWithinTwoHours, setIsWithinTwoHours] = useState(false);
  
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
    duration: 55,
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
    await Promise.all([loadClasses(), loadInstructors(), loadBookings(), loadWaitlistEntries()]);
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

  const loadWaitlistEntries = async () => {
    try {
      const response = await supabaseApiService.getAllWaitlistEntries();
      if (response.success && response.data) {
        setWaitlistEntries(Array.isArray(response.data) ? response.data : []);
      } else {
        setWaitlistEntries([]);
      }
    } catch (error) {
      console.error('Error loading waitlist entries:', error);
      setWaitlistEntries([]);
    }
  };

  // Admin function to add any client to waitlist
  const addClientToWaitlistAdmin = async (clientId: string, classId: string | number) => {
    try {
      console.log('🔧 Admin adding client to waitlist:', { clientId, classId });
      
      // Check if client is already on waitlist for this class
      const { data: existingWaitlist, error: checkError } = await supabase
        .from('waitlist')
        .select('id')
        .eq('user_id', clientId)
        .eq('class_id', classId);
      
      if (checkError) {
        return { success: false, error: checkError.message };
      }
      
      if (existingWaitlist && existingWaitlist.length > 0) {
        return { success: false, error: 'Client is already on the waitlist for this class' };
      }
      
      // Check if client is already booked for this class
      const { data: existingBooking, error: bookingError } = await supabase
        .from('bookings')
        .select('id')
        .eq('user_id', clientId)
        .eq('class_id', classId)
        .in('status', ['confirmed']);
      
      if (bookingError) {
        return { success: false, error: bookingError.message };
      }
      
      if (existingBooking && existingBooking.length > 0) {
        return { success: false, error: 'Client is already booked for this class' };
      }
      
      // Get the next position in waitlist
      const { data: waitlistCount, error: countError } = await supabase
        .from('waitlist')
        .select('position')
        .eq('class_id', classId)
        .order('position', { ascending: false })
        .limit(1);
      
      if (countError) {
        return { success: false, error: countError.message };
      }
      
      const nextPosition = waitlistCount && waitlistCount.length > 0 
        ? waitlistCount[0].position + 1 
        : 1;
      
      // Add client to waitlist
      const { data, error } = await supabase
        .from('waitlist')
        .insert({
          user_id: clientId,
          class_id: classId,
          position: nextPosition
        })
        .select(`
          *,
          users!waitlist_user_id_fkey (name, email),
          classes!waitlist_class_id_fkey (name, date, time)
        `)
        .single();
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      console.log('✅ Client added to waitlist successfully:', data);
      return { success: true, data };
      
    } catch (error) {
      console.error('❌ Error adding client to waitlist:', error);
      return { success: false, error: 'Failed to add client to waitlist' };
    }
  };

  // Admin function to remove client from waitlist and promote next user
  const removeClientFromWaitlistAdmin = async (waitlistId: string, classId: string | number) => {
    try {
      console.log('🗑️ [WAITLIST_REMOVAL] Starting removal process:', { waitlistId, classId });
      
      // Get the waitlist entry details before deletion
      const { data: waitlistEntry, error: getError } = await supabase
        .from('waitlist')
        .select(`
          *,
          users!waitlist_user_id_fkey (name, email),
          classes!waitlist_class_id_fkey (name, date, time, capacity)
        `)
        .eq('id', waitlistId)
        .single();
      
      if (getError || !waitlistEntry) {
        console.error('❌ [WAITLIST_REMOVAL] Waitlist entry not found:', { getError, waitlistEntry });
        return { success: false, error: 'Waitlist entry not found' };
      }
      
      console.log('✅ [WAITLIST_REMOVAL] Found waitlist entry:', waitlistEntry);
      
      const removedPosition = waitlistEntry.position;
      
      // Delete the waitlist entry
      const { error: deleteError } = await supabase
        .from('waitlist')
        .delete()
        .eq('id', waitlistId);
      
      if (deleteError) {
        console.error('❌ [WAITLIST_REMOVAL] Delete failed:', deleteError);
        return { success: false, error: deleteError.message };
      }
      
      console.log('✅ [WAITLIST_REMOVAL] Successfully deleted waitlist entry');
      
      // Update positions for remaining users (move everyone up)
      // Get all waitlist entries with position greater than removed position
      const { data: remainingEntries, error: fetchError } = await supabase
        .from('waitlist')
        .select('id, position')
        .eq('class_id', classId)
        .gt('position', removedPosition)
        .order('position', { ascending: true });
      
      if (!fetchError && remainingEntries) {
        // Update each entry's position
        for (const entry of remainingEntries) {
          await supabase
            .from('waitlist')
            .update({ position: entry.position - 1 })
            .eq('id', entry.id);
        }
      }
      
      
      // Check if there's space in the class to promote someone from waitlist
      const { data: classInfo, error: classError } = await supabase
        .from('classes')
        .select('capacity')
        .eq('id', classId)
        .single();
      
      if (classError) {
        console.warn('⚠️ Failed to get class info:', classError);
        return { success: true, data: { removed: waitlistEntry, promoted: null } };
      }
      
      // Get current confirmed bookings count
      const { data: confirmedBookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id')
        .eq('class_id', classId)
        .eq('status', 'confirmed');
      
      if (bookingsError) {
        console.warn('⚠️ Failed to get confirmed bookings:', bookingsError);
        return { success: true, data: { removed: waitlistEntry, promoted: null } };
      }
      
      const currentBookings = confirmedBookings?.length || 0;
      const hasSpace = currentBookings < (classInfo?.capacity || 0);
      
      let promotedClient = null;
      
      if (hasSpace) {
        // Get the next person in waitlist (position 1)
        const { data: nextInLine, error: nextError } = await supabase
          .from('waitlist')
          .select(`
            *,
            users!waitlist_user_id_fkey (name, email)
          `)
          .eq('class_id', classId)
          .eq('position', 1)
          .single();
        
        if (!nextError && nextInLine) {
          // Promote the next person by creating a booking and removing from waitlist
          const { data: newBooking, error: bookingError } = await supabase
            .from('bookings')
            .insert({
              user_id: nextInLine.user_id,
              class_id: classId,
              status: 'confirmed',
              booking_date: new Date().toISOString()
            })
            .select()
            .single();
          
          if (!bookingError && newBooking) {
            // Remove from waitlist
            await supabase
              .from('waitlist')
              .delete()
              .eq('id', nextInLine.id);
            
            // Update positions for remaining waitlist members
            const { data: remainingWaitlist } = await supabase
              .from('waitlist')
              .select('id, position')
              .eq('class_id', classId)
              .gt('position', 1)
              .order('position', { ascending: true });
            
            if (remainingWaitlist) {
              for (const entry of remainingWaitlist) {
                await supabase
                  .from('waitlist')
                  .update({ position: entry.position - 1 })
                  .eq('id', entry.id);
              }
            }
            
            promotedClient = {
              ...nextInLine,
              booking: newBooking
            };
            
            // Send notification to promoted client
            if (user) {
              try {
                await notificationService.createTranslatedNotification(
                  nextInLine.user_id,
                  'waitlist_promoted',
                  {
                    type: 'waitlist_promoted',
                    className: waitlistEntry.classes?.name,
                    date: new Date(waitlistEntry.classes?.date).toLocaleDateString(),
                    time: waitlistEntry.classes?.time
                  }
                );
                
                console.log('📢 Promotion notification sent to:', nextInLine.users?.name);
              } catch (notificationError) {
                console.warn('⚠️ Failed to send promotion notification:', notificationError);
              }
            }
          }
        }
      }
      
      // Log activity
      if (user) {
        await activityService.logActivity({
          staff_id: user.id,
          staff_name: user.name,
          staff_role: user.role as 'reception' | 'instructor' | 'admin',
          activity_type: 'client_removed_from_waitlist',
          activity_description: promotedClient 
            ? `Removed ${waitlistEntry.users?.name} from waitlist and promoted ${promotedClient.users?.name} to confirmed booking`
            : `Removed ${waitlistEntry.users?.name} from waitlist for "${waitlistEntry.classes?.name}"`,
          client_id: String(waitlistEntry.user_id),
          client_name: waitlistEntry.users?.name || 'Unknown Client',
          metadata: {
            classId: classId,
            className: waitlistEntry.classes?.name,
            classDate: waitlistEntry.classes?.date,
            classTime: waitlistEntry.classes?.time,
            removedPosition: removedPosition,
            promotedClient: promotedClient ? {
              id: promotedClient.user_id,
              name: promotedClient.users?.name
            } : null
          }
        });
      }
      
      console.log('✅ Client removed from waitlist successfully:', {
        removed: waitlistEntry.users?.name,
        promoted: promotedClient?.users?.name || null
      });
      
      return { 
        success: true, 
        data: { 
          removed: waitlistEntry, 
          promoted: promotedClient,
          message: promotedClient 
            ? `${waitlistEntry.users?.name} removed from waitlist. ${promotedClient.users?.name} has been promoted to confirmed booking!`
            : `${waitlistEntry.users?.name} removed from waitlist.`
        } 
      };
      
    } catch (error) {
      console.error('❌ Error removing client from waitlist:', error);
      return { success: false, error: 'Failed to remove client from waitlist' };
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
      duration: 55,
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
          // Check if class has already passed (considering duration)
          const isClassPassed = isPastClass(formData.date, formData.time, formData.duration);
          
          // Check for changes that require notifications (only if class hasn't passed)
          const instructorChanged = String(editingClass.instructor_id) !== formData.instructorId;
          const timeChanged = editingClass.time !== formData.time;
          
          // Send notifications for significant changes only if class hasn't passed
          if (!isClassPassed) {
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
          } else {
            console.log('⏰ [RECEPTION] Class has already passed - skipping notifications for:', formData.name);
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
                  <Surface key={classItem.id} style={[styles.calendarClassCard, { backgroundColor: getClassCardBackground(classItem) }]}>
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
                            style={styles.simpleChip}
                            textStyle={styles.simpleChipText}
                            compact
                          >
                            {classItem.category === 'personal' ? '👤 Personal' : '👥 Group'}
                          </Chip>
                          
                          {/* Enrollment count badge */}
                          <Chip
                            style={[styles.enrollmentChip, {
                              backgroundColor: getEnrollmentCount(classItem.id) >= (classItem.capacity || 0) ? 
                                Colors.light.transparentRed : Colors.light.transparentGreen
                            }]}
                            textStyle={[styles.enrollmentChipText, {
                              color: getEnrollmentCount(classItem.id) >= (classItem.capacity || 0) ? 
                                Colors.light.cleanDanger : Colors.light.cleanSuccess,
                              fontWeight: '700'
                            }]}
                            compact
                          >
                            {getEnrollmentCount(classItem.id) >= (classItem.capacity || 0) ? 'FULL' : `${getEnrollmentCount(classItem.id)}/${classItem.capacity || 0}`}
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
              dayClasses.map(classItem => {
                const enrollmentCount = getEnrollmentCount(classItem.id);
                const capacity = classItem.capacity || 0;
                const enrollmentPercentage = capacity > 0 ? (enrollmentCount / capacity) * 100 : 0;
                
                // Check if class has passed
                const isClassPassed = isPastClass(classItem.date, classItem.time, classItem.duration);
                
                // Determine background color based on status
                let cardBgColor = 'rgba(255, 255, 255, 0.95)'; // Default
                
                // Private classes get purple background - highest priority
                if (classItem.visibility === 'private') {
                  cardBgColor = 'rgba(139, 92, 246, 0.1)'; // Light purple background for private classes
                } else if (isClassPassed) {
                  cardBgColor = 'rgba(229, 231, 235, 0.5)'; // Passed - light gray
                } else if (enrollmentPercentage >= 100) {
                  cardBgColor = 'rgba(254, 226, 226, 0.3)'; // Full - light red
                } else if (enrollmentPercentage >= 80) {
                  cardBgColor = 'rgba(254, 243, 199, 0.3)'; // Almost full - light amber
                } else if (enrollmentPercentage >= 50) {
                  cardBgColor = 'rgba(209, 250, 229, 0.2)'; // Half full - very light green
                }
                
                return (
                <Pressable key={classItem.id} onPress={() => handleClassCardClick(classItem)}>
                    <Surface style={[styles.simpleClassCard, { backgroundColor: cardBgColor }]}>
                      {/* Status indicator bar */}
                      <View style={[styles.cardStatusBar, { 
                          backgroundColor: getClassStatusColor(classItem) 
                        }]} />
                      
                      {/* Main Content */}
                      <View style={styles.simpleCardContent}>
                        {/* Time and Title Row */}
                        <View style={styles.simpleHeaderRow}>
                          <View style={[styles.simpleTimeBlockBordered, isClassPassed && { 
                            backgroundColor: '#F3F4F6', 
                            borderColor: '#D1D5DB' 
                          }]}>
                            <WebCompatibleIcon name="access-time" size={14} color={isClassPassed ? '#9CA3AF' : '#6B7280'} />
                            <Text style={[styles.simpleTime, isClassPassed && { color: '#9CA3AF' }]}>
                              {classItem.time}
                            </Text>
                            <Text style={[styles.simpleDuration, isClassPassed && { color: '#9CA3AF' }]}>
                              {classItem.duration}min
                            </Text>
                      </View>
                      
                          <View style={styles.simpleVerticalDivider} />
                          
                          <View style={styles.simpleTitleBlock}>
                            <Text style={[styles.simpleTitle, isClassPassed && { color: '#9CA3AF' }]}>
                              {classItem.name}
                            </Text>
                            <View style={styles.simpleInstructorRow}>
                              <WebCompatibleIcon name="person" size={14} color={isClassPassed ? '#9CA3AF' : '#6B7280'} />
                              <Text style={[styles.simpleInstructor, isClassPassed && { color: '#9CA3AF' }]}>
                                {classItem.instructor_name}
                              </Text>
                            </View>
                        </View>
                        
                          <View style={[styles.simpleCapacityBadge, {
                            backgroundColor: enrollmentPercentage >= 100 ? '#FEE2E2' : 
                                           enrollmentPercentage >= 80 ? '#FEF3C7' : '#D1FAE5'
                          }]}>
                            <WebCompatibleIcon 
                              name={enrollmentPercentage >= 100 ? 'group' : enrollmentPercentage >= 80 ? 'warning' : 'check'}
                              size={14} 
                              color={enrollmentPercentage >= 100 ? '#DC2626' : enrollmentPercentage >= 80 ? '#D97706' : '#059669'} 
                            />
                            <Text style={[styles.simpleCapacityText, {
                              color: enrollmentPercentage >= 100 ? '#DC2626' : 
                                    enrollmentPercentage >= 80 ? '#D97706' : '#059669'
                            }]}>
                              {enrollmentCount}/{capacity}
                            </Text>
                          </View>
                        </View>
                        
                        {/* Info Row with icons */}
                        <View style={styles.simpleInfoRow}>
                          <View style={styles.simpleInfoTag}>
                            <WebCompatibleIcon 
                              name={classItem.category === 'personal' ? 'person' : 'group'} 
                              size={12} 
                              color="#6B7280" 
                            />
                            <Text style={styles.simpleInfoText}>
                              {classItem.category === 'personal' ? 'Personal' : 'Group'}
                            </Text>
                          </View>
                          
                          {/* Private class indicator */}
                          {classItem.visibility === 'private' && (
                            <View style={styles.simpleInfoTag}>
                              <WebCompatibleIcon 
                                name="visibility-off" 
                                size={12} 
                                color="#8B5CF6" 
                              />
                              <Text style={[styles.simpleInfoText, { color: '#8B5CF6' }]}>
                                Private
                              </Text>
                            </View>
                          )}
                          
                          {classItem.room && (
                            <View style={styles.simpleInfoTag}>
                              <WebCompatibleIcon name="location" size={12} color="#6B7280" />
                              <Text style={styles.simpleInfoText}>{classItem.room}</Text>
                            </View>
                          )}
                          
                          {classItem.equipment_type && (
                            <View style={styles.simpleInfoTag}>
                              <WebCompatibleIcon name="fitness-center" size={12} color="#6B7280" />
                              <Text style={styles.simpleInfoText}>
                                {classItem.equipment_type === 'both' ? 'Mat+Reformer' : classItem.equipment_type}
                              </Text>
                        </View>
                          )}
                          
                          {/* Quick stats */}
                          {(() => {
                            const classBookings = getBookingsForClass(classItem.id);
                            const waitlistCount = classBookings.filter(b => b.status === 'waitlist').length;
                            if (waitlistCount > 0) {
                              return (
                                <View style={[styles.simpleInfoTag, { borderColor: '#F59E0B', backgroundColor: '#FFFBEB' }]}>
                                  <WebCompatibleIcon name="pending" size={12} color="#F59E0B" />
                                  <Text style={[styles.simpleInfoText, { color: '#F59E0B' }]}>
                                    {waitlistCount} waitlist
                                  </Text>
                      </View>
                              );
                            }
                            return null;
                          })()}
                    </View>
                    
                        {/* Action Buttons with Labels */}
                        <View style={styles.simpleActionRow}>
                      <TouchableOpacity 
                            style={styles.simpleActionBtnWithLabel}
                        onPress={() => handleAssignClient(classItem)}
                      >
                            <WebCompatibleIcon name="account-plus" size={16} color={Colors.light.cleanSuccess} />
                            <Text style={[styles.simpleActionText, { color: Colors.light.cleanSuccess }]}>Add</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                            style={styles.simpleActionBtnWithLabel}
                        onPress={() => handleUnassignClient(classItem)}
                      >
                            <WebCompatibleIcon name="account-minus" size={16} color={Colors.light.cleanWarning} />
                            <Text style={[styles.simpleActionText, { color: Colors.light.cleanWarning }]}>Remove</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                            style={styles.simpleActionBtnWithLabel}
                        onPress={() => handleEditClass(classItem)}
                      >
                            <WebCompatibleIcon name="pencil" size={16} color={Colors.light.cleanSecondary} />
                            <Text style={[styles.simpleActionText, { color: Colors.light.cleanSecondary }]}>Edit</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                            style={styles.simpleActionBtnWithLabel}
                        onPress={() => handleDeleteClass(classItem.id.toString())}
                      >
                            <WebCompatibleIcon name="delete" size={16} color={Colors.light.cleanDanger} />
                            <Text style={[styles.simpleActionText, { color: Colors.light.cleanDanger }]}>Delete</Text>
                      </TouchableOpacity>
                        </View>
                    </View>
                  </Surface>
                </Pressable>
                );
              })
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
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Body>{classItem.name}</Body>
                    {classItem.visibility === 'private' && (
                      <WebCompatibleIcon name="visibility-off" size={14} color="#8B5CF6" />
                    )}
                  </View>
                  {classItem.room && (
                    <Caption style={{ color: Colors.light.textSecondary }}>📍 {classItem.room}</Caption>
                  )}
                </DataTable.Cell>
                <DataTable.Cell>
                  <Body>{classItem.instructor_name}</Body>
                </DataTable.Cell>
                <DataTable.Cell>
                  <Chip
                    style={styles.simpleChip}
                    textStyle={styles.simpleChipText}
                    compact
                  >
                    {classItem.category === 'personal' ? '👤 Personal' : '👥 Group'}
                  </Chip>
                </DataTable.Cell>
                <DataTable.Cell>
                  <Chip
                    style={[styles.enrollmentChip, {
                      backgroundColor: getEnrollmentCount(classItem.id) >= (classItem.capacity || 0) ? 
                        '#F5E6E6' : '#E8F5E8'
                    }]}
                    textStyle={[styles.enrollmentChipText, {
                      color: getEnrollmentCount(classItem.id) >= (classItem.capacity || 0) ? 
                        '#B85C5C' : '#5C9B5C',
                      fontWeight: '700'
                    }]}
                    compact
                  >
                    {getEnrollmentCount(classItem.id) >= (classItem.capacity || 0) ? '🔴 FULL' : `${getEnrollmentCount(classItem.id)}/${classItem.capacity || 0}`}
                  </Chip>
                </DataTable.Cell>
                <DataTable.Cell>
                  <Body style={{ color: '#6B7280' }}>{getClassStatusText(classItem)}</Body>
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
    // Check if it's a private class first - highest priority
    if (classItem.visibility === 'private') {
      return '#8B5CF6'; // Purple for private classes (only staff can see)
    }
    
    // Check if it's a personal class
    if (classItem.category === 'personal') {
      return '#9B8A7D'; // Subtle brown/taupe for personal classes
    }
    
    if (isPastClass(classItem.date, classItem.time, classItem.duration)) {
      return '#999999'; // Light gray for passed classes
    }
    const enrollmentPercentage = (classItem.enrolled / classItem.capacity) * 100;
    if (enrollmentPercentage >= 100) return '#D32F2F'; // Strong red for full
    if (enrollmentPercentage >= 80) return '#F57C00'; // Orange for almost full
    return '#388E3C'; // Green for available
  };

  const getBookingsForClass = (classId: string | number) => {
    const filteredBookings = bookings.filter(booking => {
      return booking.class_id == classId; // Use == to handle both string and number
    });
    return filteredBookings;
  };

  const getWaitlistForClass = (classId: string | number) => {
    const filteredWaitlist = waitlistEntries.filter(entry => {
      return entry.class_id == classId; // Use == to handle both string and number
    });
    // Sort by position to maintain waitlist order
    return filteredWaitlist.sort((a, b) => (a.position || 0) - (b.position || 0));
  };

  const getEnrollmentCount = (classId: string | number) => {
    const classBookings = getBookingsForClass(classId);
    return classBookings.filter(booking => booking.status === 'confirmed').length;
  };

  // Helper function to get class card background based on capacity and visibility
  const getClassCardBackground = (classItem: BackendClass) => {
    // Private classes get purple background - highest priority
    if (classItem.visibility === 'private') {
      return '#F3F0FF'; // Light purple background for private classes
    }
    
    const enrollmentCount = getEnrollmentCount(classItem.id);
    const capacity = classItem.capacity || 0;
    const enrollmentPercentage = capacity > 0 ? (enrollmentCount / capacity) * 100 : 0;
    
    if (enrollmentPercentage >= 100) {
      return '#FFEBEE'; // Full classes - light red
    } else if (enrollmentPercentage >= 80) {
      return '#FFF3E0'; // Almost full classes - light orange
    }
    return '#FFFFFF'; // Available/Empty classes - white/clean background
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

  const formatShortTimestamp = (timestamp: string | null | undefined) => {
    if (!timestamp) return 'Unknown';
    try {
      const date = new Date(timestamp);
      
      // Format as actual date and time instead of relative time
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      return 'Unknown';
    }
  };

  const handleAssignToWaitlist = (classItem: any) => {
    setSelectedClassForAssignment(classItem);
    setIsWaitlistAssignment(true);
    setOverrideRestrictions(true); // Enable override for waitlist
    setSelectedClient(null);
    setAssignNotes('');
    setClientSearchQuery('');
    setClientMenuVisible(false); // Reset client menu state
    loadClients(); // Load clients for waitlist assignment
    setAssignClientModalVisible(true);
  };

  const handleClassCardClick = async (classItem: BackendClass) => {
    // Calculate if class is within 2 hours
    const classDateTime = new Date(`${classItem.date}T${classItem.time}`);
    const now = new Date();
    const hoursUntilClass = (classDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    const withinTwoHours = hoursUntilClass > 0 && hoursUntilClass < 2;
    
    setIsWithinTwoHours(withinTwoHours);
    setShouldRefundCredit(true); // Default to refund
    
    try {
      // Refresh both bookings and waitlist data to ensure we have the latest information
      await Promise.all([loadBookings(), loadWaitlistEntries()]);
      
      // Get bookings and waitlist data for this class
      const classBookings = getBookingsForClass(classItem.id);
      const classWaitlist = getWaitlistForClass(classItem.id);
      
      const confirmedBookings = classBookings.filter(b => b.status === 'confirmed');
      const cancelledBookings = classBookings.filter(b => b.status === 'cancelled');
      
      const confirmedClients = confirmedBookings.map(booking => ({
        id: booking.user_id,
        bookingId: booking.id,
        name: booking.users?.name || booking.client_name || booking.user_name || 'Unknown Client',
        email: booking.users?.email || booking.client_email || booking.user_email || 'No email',
        status: 'confirmed',
        bookedAt: booking.created_at,
        cancelledAt: null
      }));
      
      // Map waitlist entries (from separate waitlist table)
      const waitlistClients = classWaitlist.map(waitlistEntry => ({
        id: waitlistEntry.user_id,
        waitlistId: waitlistEntry.id,
        name: waitlistEntry.users?.name || 'Unknown Client',
        email: waitlistEntry.users?.email || 'No email',
        status: 'waitlist',
        bookedAt: waitlistEntry.created_at,
        position: waitlistEntry.position,
        cancelledAt: null
      }));
      
      const cancelledClients = cancelledBookings.map(booking => ({
        id: booking.user_id,
        bookingId: booking.id,
        name: booking.users?.name || booking.client_name || booking.user_name || 'Unknown Client',
        email: booking.users?.email || booking.client_email || booking.user_email || 'No email',
        status: 'cancelled',
        bookedAt: booking.created_at,
        cancelledAt: booking.updated_at
      }));
      
      const enrichedClassData = {
        ...classItem,
        confirmedClients,
        waitlistClients,
        cancelledClients,
        confirmedBookings: confirmedClients.length,
        waitlistCount: waitlistClients.length,
        cancelledCount: cancelledClients.length,
        max_capacity: classItem.capacity
      };
      
      setSelectedClassForBookings(enrichedClassData);
      setBookingsModalVisible(true);
    } catch (error) {
      console.error('Error loading class details:', error);
      // Still show modal with current data if refresh fails
      const classBookings = getBookingsForClass(classItem.id);
      const classWaitlist = getWaitlistForClass(classItem.id);
      
      const confirmedBookings = classBookings.filter(b => b.status === 'confirmed');
      const cancelledBookings = classBookings.filter(b => b.status === 'cancelled');
      
      const enrichedClassData = {
        ...classItem,
        confirmedClients: confirmedBookings.map(booking => ({
          id: booking.user_id,
          bookingId: booking.id,
          name: booking.users?.name || booking.client_name || booking.user_name || 'Unknown Client',
          email: booking.users?.email || booking.client_email || booking.user_email || 'No email',
          status: 'confirmed',
          bookedAt: booking.created_at,
          cancelledAt: null
        })),
        waitlistClients: classWaitlist.map(waitlistEntry => ({
          id: waitlistEntry.user_id,
          waitlistId: waitlistEntry.id,
          name: waitlistEntry.users?.name || 'Unknown Client',
          email: waitlistEntry.users?.email || 'No email',
          status: 'waitlist',
          bookedAt: waitlistEntry.created_at,
          position: waitlistEntry.position,
          cancelledAt: null
        })),
        cancelledClients: cancelledBookings.map(booking => ({
          id: booking.user_id,
          bookingId: booking.id,
          name: booking.users?.name || booking.client_name || booking.user_name || 'Unknown Client',
          email: booking.users?.email || booking.client_email || booking.user_email || 'No email',
          status: 'cancelled',
          bookedAt: booking.created_at,
          cancelledAt: booking.updated_at
        })),
        confirmedBookings: confirmedBookings.length,
        waitlistCount: classWaitlist.length,
        cancelledCount: cancelledBookings.length,
        max_capacity: classItem.capacity
      };
      
      setSelectedClassForBookings(enrichedClassData);
      setBookingsModalVisible(true);
    }
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

        // Refresh bookings and waitlist to show updated status
        await Promise.all([loadBookings(), loadWaitlistEntries()]);
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
    setIsWaitlistAssignment(false);
    setClientSearchQuery('');
    setClientMenuVisible(false); // Reset client menu state
    loadClients();
    setAssignClientModalVisible(true);
  };

  const loadClients = async () => {
    try {
      console.log('🔄 Loading clients...');
      const response = await userService.getUsers({ role: 'client' });
      console.log('📊 Clients response:', response);
      if (response.success && response.data) {
        console.log('✅ Loaded clients:', response.data.length);
        setClients(response.data);
      } else {
        console.log('❌ Failed to load clients:', response);
        setClients([]);
      }
    } catch (error) {
      console.error('❌ Error loading clients:', error);
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
          await Promise.all([loadBookings(), loadWaitlistEntries()]); // Refresh bookings and waitlist
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
    console.log('🎯 isWaitlistAssignment:', isWaitlistAssignment);
    
    if (!selectedClient || !selectedClassForAssignment) {
      console.log('❌ Missing selectedClient or selectedClassForAssignment');
      showErrorModal('Error', 'Please select a client and class');
      return;
    }

    try {
      console.log('🚀 Starting assignment...');
      setAssigningClient(true);
      
      let response;
      if (isWaitlistAssignment) {
        // For waitlist assignments, we need to add the client to waitlist manually
        // Since joinWaitlist uses auth.getUser(), we need to create a direct admin function
        console.log('📋 Adding client to waitlist...');
        response = await addClientToWaitlistAdmin(selectedClient.id, selectedClassForAssignment.id);
      } else {
        // For regular assignments, use assignClientToClass function
        console.log('✅ Assigning client to class...');
        response = await bookingService.assignClientToClass(
          selectedClient.id,
          selectedClassForAssignment.id,
          '', // Notes not supported in bookings table
          overrideRestrictions
        );
      }

      console.log('📝 Assignment response:', response);

      if (response.success) {
        console.log('✅ Assignment successful');
        
        // Send notification to the client
        try {
          const notificationType = isWaitlistAssignment ? 'waitlist_joined' : 'class_assignment';
          const notificationResult = await notificationService.createTranslatedNotification(
            selectedClient.id,
            notificationType,
            {
              type: notificationType,
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

          console.log(`📢 [RECEPTION] ${isWaitlistAssignment ? 'Waitlist' : 'Class assignment'} notification sent to client:`, selectedClient.name);
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
            activity_type: isWaitlistAssignment ? 'client_added_to_waitlist' : 
                          (overrideRestrictions ? 'client_assigned_with_override' : 'client_assigned_to_class'),
            activity_description: isWaitlistAssignment 
              ? `Added ${selectedClient.name} to waitlist for "${selectedClassForAssignment.name}"`
              : (overrideRestrictions 
                ? `Assigned ${selectedClient.name} to "${selectedClassForAssignment.name}" with override rules`
                : `Assigned ${selectedClient.name} to "${selectedClassForAssignment.name}"`),
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
        await Promise.all([loadBookings(), loadWaitlistEntries()]); // Refresh bookings and waitlist
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

  const filteredClients = clientSearchQuery.length > 0 
    ? clients.filter(client =>
        client.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
        client.email.toLowerCase().includes(clientSearchQuery.toLowerCase())
      )
    : clients; // Show all clients when no search query

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
        await Promise.all([loadBookings(), loadWaitlistEntries()]); // Refresh bookings and waitlist
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
      const confirmed = window.confirm(`Are you sure you want to unassign ${clientName} from ${className}?\n\nThis will:\n- Cancel their booking\n- Restore class credit if they were charged\n- Promote next person from waitlist if applicable`);
      if (!confirmed) return;
    } else {
      Alert.alert(
        'Unassign Client',
        `Are you sure you want to unassign ${clientName} from ${className}?\n\nThis will:\n- Cancel their booking\n- Restore class credit if they were charged\n- Promote next person from waitlist if applicable`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Unassign', 
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
      console.log('🚀 Starting client unassignment...');
      console.log('📋 [DEBUG] Booking object received:', {
        id: booking.id,
        user_id: booking.user_id,
        class_id: booking.class_id,
        status: booking.status,
        userEmail: booking.users?.email,
        userName: booking.users?.name
      });
      const clientName = booking.users?.name || booking.client_name || booking.user_name || 'Unknown Client';
      
      setUpdatingBooking(booking.id);
      
      // Use cancelClientBooking which handles refunds intelligently
      // It will refund ONLY if the client was actually charged for the class
      const response = await (bookingService.cancelClientBooking as any)(
        booking.user_id,
        selectedClassForBookings!.id,
        undefined, // notes
        shouldRefundCredit
      );

      console.log('📝 Unassignment response:', response);

      if (response.success) {
        console.log('✅ Client unassignment successful');
        
        // Cancel any class reminders for this user
        try {
          const pushNotificationService = (await import('../../services/pushNotificationService')).pushNotificationService;
          await pushNotificationService.cancelClassReminder(
            booking.user_id, 
            booking.class_id || selectedClassForBookings!.id
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
            activity_description: `Removed ${clientName} from "${selectedClassForBookings!.name}"`,
            client_id: String(booking.user_id),
            client_name: clientName,
            metadata: {
              classId: selectedClassForBookings!.id,
              className: selectedClassForBookings!.name,
              classDate: selectedClassForBookings!.date,
              classTime: selectedClassForBookings!.time,
              instructor: selectedClassForBookings!.instructor_name,
              category: selectedClassForBookings!.category,
              bookingId: booking.id,
              bookingStatus: booking.status,
              creditRestored: response.data?.creditRestored || false,
              waitlistPromoted: response.data?.waitlistPromoted || false,
              promotedClient: response.data?.promotedClientName || null,
              reason: 'Manual unassignment by reception via modal'
            }
          });
        }
        
        // Send notification to the removed client
        // 🔒 CRITICAL FIX: Fetch fresh booking data to ensure correct user_id
        try {
          const staffName = user?.name || 'Studio Staff';
          
          // Fetch the actual cancelled booking from database to get correct user_id
          const { data: actualBooking, error: bookingFetchError } = await supabase
            .from('bookings')
            .select('user_id, users(id, name, email)')
            .eq('id', booking.id)
            .eq('class_id', selectedClassForBookings!.id)
            .eq('status', 'cancelled')
            .single();
          
          if (bookingFetchError || !actualBooking) {
            console.error('❌ [UNASSIGN_NOTIFICATION] Could not fetch cancelled booking:', bookingFetchError);
            return;
          }
          
          const removedUserId = actualBooking.user_id;
          
          console.log('🔔 [UNASSIGN_NOTIFICATION] Sending to user ID from FRESH DB data:', removedUserId);
          console.log('🔔 [UNASSIGN_NOTIFICATION] User from DB:', (actualBooking.users as any)?.email);
          console.log('🔔 [UNASSIGN_NOTIFICATION] Booking ID:', booking.id);
          
          const notificationResult = await notificationService.createTranslatedNotification(
            removedUserId,
            'class_assignment_cancelled',
            {
              type: 'class_assignment_cancelled',
              className: selectedClassForBookings!.name,
              date: selectedClassForBookings!.date,
              time: selectedClassForBookings!.time,
              staffName: staffName,
              creditRestored: response.data?.creditRestored || false
            }
          );
          
          // Send push notification for immediate delivery
          if (notificationResult.success && notificationResult.data) {
            await notificationService.sendPushNotificationToUser(
              removedUserId,
              notificationResult.data.title,
              notificationResult.data.message
            );
            console.log('✅ [UNASSIGN_NOTIFICATION] Notification sent successfully');
          }
        } catch (notificationError) {
          console.error('❌ [UNASSIGN_NOTIFICATION] Error sending notification:', notificationError);
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
        
        setBookingStatusMenuVisible(null); // Close any open menus
        
        // Refresh all data first
        await Promise.all([loadClasses(), loadBookings(), loadWaitlistEntries()]);
        
        // Keep modal open and refresh its content to show the cancelled client
        if (selectedClassForBookings) {
          // Keep the modal visible during refresh
          setBookingsModalVisible(true);
          
          // Manually refresh the modal data
          const classBookings = getBookingsForClass(selectedClassForBookings.id);
          const classWaitlist = getWaitlistForClass(selectedClassForBookings.id);
          
          const confirmedBookings = classBookings.filter(b => b.status === 'confirmed');
          const cancelledBookings = classBookings.filter(b => b.status === 'cancelled');
          
          const confirmedClients = confirmedBookings.map(booking => ({
            id: booking.user_id,
            bookingId: booking.id,
            name: booking.users?.name || booking.client_name || booking.user_name || 'Unknown Client',
            email: booking.users?.email || booking.client_email || booking.user_email || 'No email',
            status: 'confirmed',
            bookedAt: booking.created_at,
            cancelledAt: null
          }));
          
          const waitlistClients = classWaitlist.map(waitlistEntry => ({
            id: waitlistEntry.user_id,
            waitlistId: waitlistEntry.id,
            name: waitlistEntry.users?.name || 'Unknown Client',
            email: waitlistEntry.users?.email || 'No email',
            status: 'waitlist',
            bookedAt: waitlistEntry.created_at,
            position: waitlistEntry.position,
            cancelledAt: null
          }));
          
          const cancelledClients = cancelledBookings.map(booking => ({
            id: booking.user_id,
            bookingId: booking.id,
            name: booking.users?.name || booking.client_name || booking.user_name || 'Unknown Client',
            email: booking.users?.email || booking.client_email || booking.user_email || 'No email',
            status: 'cancelled',
            bookedAt: booking.created_at,
            cancelledAt: booking.updated_at
          }));
          
          const enrichedClassData = {
            ...selectedClassForBookings,
            confirmedClients,
            waitlistClients,
            cancelledClients,
            confirmedBookings: confirmedClients.length,
            waitlistCount: waitlistClients.length,
            cancelledCount: cancelledClients.length
          };
          
          setSelectedClassForBookings(enrichedClassData);
        }
      } else {
        console.log('❌ Client unassignment failed:', response.error);
        const errorMsg = response.error || 'Failed to unassign client';
        if (Platform.OS === 'web') {
          window.alert('Error: ' + errorMsg);
        } else {
          Alert.alert('Error', errorMsg);
        }
      }
    } catch (error) {
      console.error('❌ Error unassigning client:', error);
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

      // Calculate if class is within 2 hours
      const classDateTime = new Date(`${classItem.date}T${classItem.time}`);
      const now = new Date();
      const hoursUntilClass = (classDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      const withinTwoHours = hoursUntilClass > 0 && hoursUntilClass < 2;
      
      console.log(`🕐 Class is ${hoursUntilClass.toFixed(2)} hours away. Within 2-hour rule: ${withinTwoHours}`);
      
      setIsWithinTwoHours(withinTwoHours);
      setShouldRefundCredit(true); // Default to refund

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

  const performUnassignClient = async (booking: any, classItem: BackendClass, shouldRefund: boolean = true) => {
    try {
      console.log('🚀 Starting client unassignment (performUnassignClient)...');
      console.log('📋 [DEBUG] Booking object received:', {
        id: booking.id,
        user_id: booking.user_id,
        class_id: booking.class_id,
        status: booking.status,
        userEmail: booking.users?.email,
        userName: booking.users?.name
      });
      const clientName = booking.users?.name || booking.client_name || booking.user_name || 'Unknown Client';
      
      setUpdatingBooking(booking.id);
      
      // Use cancelClientBooking which handles refunds intelligently
      // It will refund ONLY if the client was actually charged for the class
      // Pass shouldRefund parameter to control refund behavior
      const response = await (bookingService.cancelClientBooking as any)(
        booking.user_id,
        classItem.id,
        undefined, // notes
        shouldRefund
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
        // 🔒 CRITICAL FIX: Fetch fresh booking data to ensure correct user_id
        try {
          const staffName = user?.name || 'Studio Staff';
          
          // Fetch the actual cancelled booking from database to get correct user_id
          const { data: actualBooking, error: bookingFetchError } = await supabase
            .from('bookings')
            .select('user_id, users(id, name, email)')
            .eq('id', booking.id)
            .eq('class_id', classItem.id)
            .eq('status', 'cancelled')
            .single();
          
          if (bookingFetchError || !actualBooking) {
            console.error('❌ [UNASSIGN_NOTIFICATION_2] Could not fetch cancelled booking:', bookingFetchError);
            return;
          }
          
          const removedUserId = actualBooking.user_id;
          
          console.log('🔔 [UNASSIGN_NOTIFICATION_2] Sending to user ID from FRESH DB data:', removedUserId);
          console.log('🔔 [UNASSIGN_NOTIFICATION_2] User from DB:', (actualBooking.users as any)?.email);
          console.log('🔔 [UNASSIGN_NOTIFICATION_2] Booking ID:', booking.id);
          
          const notificationResult = await notificationService.createTranslatedNotification(
            removedUserId,
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
              removedUserId,
              notificationResult.data.title,
              notificationResult.data.message
            );
            console.log('✅ [UNASSIGN_NOTIFICATION_2] Notification sent successfully');
          }
        } catch (notificationError) {
          console.error('❌ [UNASSIGN_NOTIFICATION_2] Error sending notification:', notificationError);
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
        
        // Refresh all data
        await Promise.all([loadClasses(), loadBookings(), loadWaitlistEntries()]);
        
        // If the bookings modal is open in the background, refresh it too
        if (selectedClassForBookings && selectedClassForBookings.id === classItem.id) {
          const classBookings = getBookingsForClass(classItem.id);
          const classWaitlist = getWaitlistForClass(classItem.id);
          
          const confirmedBookings = classBookings.filter(b => b.status === 'confirmed');
          const cancelledBookings = classBookings.filter(b => b.status === 'cancelled');
          
          const confirmedClients = confirmedBookings.map(booking => ({
            id: booking.user_id,
            bookingId: booking.id,
            name: booking.users?.name || booking.client_name || booking.user_name || 'Unknown Client',
            email: booking.users?.email || booking.client_email || booking.user_email || 'No email',
            status: 'confirmed',
            bookedAt: booking.created_at,
            cancelledAt: null
          }));
          
          const waitlistClients = classWaitlist.map(waitlistEntry => ({
            id: waitlistEntry.user_id,
            waitlistId: waitlistEntry.id,
            name: waitlistEntry.users?.name || 'Unknown Client',
            email: waitlistEntry.users?.email || 'No email',
            status: 'waitlist',
            bookedAt: waitlistEntry.created_at,
            position: waitlistEntry.position,
            cancelledAt: null
          }));
          
          const cancelledClients = cancelledBookings.map(booking => ({
            id: booking.user_id,
            bookingId: booking.id,
            name: booking.users?.name || booking.client_name || booking.user_name || 'Unknown Client',
            email: booking.users?.email || booking.client_email || booking.user_email || 'No email',
            status: 'cancelled',
            bookedAt: booking.created_at,
            cancelledAt: booking.updated_at
          }));
          
          const enrichedClassData = {
            ...selectedClassForBookings,
            confirmedClients,
            waitlistClients,
            cancelledClients,
            confirmedBookings: confirmedClients.length,
            waitlistCount: waitlistClients.length,
            cancelledCount: cancelledClients.length
          };
          
          setSelectedClassForBookings(enrichedClassData);
        }
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
        
        // 🚨 ADDED: Send "class cancelled by studio" notifications to all enrolled users (only if class hasn't passed)
        if (classToDelete) {
          const isClassPassed = isPastClass(classToDelete.date, classToDelete.time, classToDelete.duration);
          
          if (!isClassPassed) {
            try {
              await notificationService.sendClassCancellationNotifications(
                classId,
                classToDelete.name,
                classToDelete.date,
                classToDelete.time
              );
              console.log('📢 [RECEPTION] Class cancellation notifications sent to enrolled users');
            } catch (notificationError) {
              console.error('❌ Failed to send class cancellation notifications:', notificationError);
              // Don't block the deletion for notification errors
            }
          } else {
            console.log('⏰ [RECEPTION] Class has already passed - skipping cancellation notifications for:', classToDelete.name);
          }
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
        // Show the detailed message including refund info and student notifications
        const successMessage = (response as any).message || 'Class deleted successfully and students have been notified';
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
      <View style={[styles.containerWithBackground, styles.centerContent]}>
        <ActivityIndicator size="large" />
        <Body style={styles.loadingText}>Loading classes...</Body>
      </View>
    );
  }

  return (
    <View style={styles.containerWithBackground}>
      {/* Compact Header - Only Filters */}

      {/* Main Content - Hybrid View Only */}
      <View style={styles.hybridView}>
        <View style={styles.hybridLeft}>
        <ScrollView 
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
          contentContainerStyle={styles.hybridLeftContainer}
        >
          {renderCalendarOnly()}
        </ScrollView>
        </View>
        <ScrollView 
          style={styles.hybridRight}
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
          contentContainerStyle={styles.hybridRightContainer}
        >
          {renderDayClasses()}
        </ScrollView>
      </View>

      {/* Create Class Modal - Modern Redesigned */}
      <Portal>
        {modalVisible && (
          <View style={styles.webModalOverlay}>
            <View style={styles.modernAddClassContainer}>
              <View style={styles.modernAddClassSurface}>
                {/* Header */}
                <View style={styles.modernAddClassHeader}>
                  <View>
                    <Text style={styles.modernAddClassTitle}>
                {editingClass ? 'Edit Class' : 'Create New Class'}
                    </Text>
                    <Text style={styles.modernAddClassSubtitle}>
                      Fill in the details below to {editingClass ? 'update' : 'schedule'} a class
                    </Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.modernAddClassCloseBtn}
                    onPress={() => setModalVisible(false)}
                  >
                    <WebCompatibleIcon name="close" size={24} color="#6B7280" />
                  </TouchableOpacity>
            </View>
            
                {/* Scrollable Content */}
                <ScrollView style={styles.modernAddClassContent} showsVerticalScrollIndicator={true}>
                  {/* Two Column Layout */}
                  <View style={styles.modernFormGrid}>
                    {/* Left Column */}
                    <View style={styles.modernFormColumn}>
                      {/* Basic Info Card */}
                      <View style={styles.modernFormCard}>
                        <View style={styles.modernCardHeader}>
                          <WebCompatibleIcon name="info" size={18} color="#8B5CF6" />
                          <Text style={styles.modernCardTitle}>Basic Information</Text>
                        </View>
                        
              <TextInput
                label="Class Name *"
                value={formData.name}
                onChangeText={(text) => setFormData({...formData, name: text})}
                mode="outlined"
                          style={styles.modernInput}
                          outlineColor="#E5E7EB"
                          activeOutlineColor="#8B5CF6"
                        />
                        
                        <View style={styles.modernQuickNameRow}>
                          {['Reformer', 'Mat', 'Pilates Teen', 'Cadillac', 'Wall'].map((name) => (
                            <Pressable
                              key={name}
                              style={[
                                styles.modernNameChip,
                                formData.name === name && styles.modernNameChipActive
                              ]}
                              onPress={() => setFormData({...formData, name: name})}
                            >
                              <Text style={[
                                styles.modernNameChipText,
                                formData.name === name && styles.modernNameChipTextActive
                              ]}>
                                {name}
                              </Text>
                            </Pressable>
                          ))}
                        </View>

                        <View style={styles.modernPickerWrapper}>
                          <Caption style={styles.modernFieldLabel}>Instructor *</Caption>
                  <Menu
                    visible={instructorMenuVisible}
                    onDismiss={() => setInstructorMenuVisible(false)}
                            contentStyle={styles.modernMenuContent}
                            style={styles.modernMenuContainer}
                    anchor={
                      <Pressable 
                        onPress={() => {
                          if (instructors.length === 0) {
                            Alert.alert('No Instructors Available', 'Please create instructor accounts first before creating classes.');
                            return;
                          }
                          setInstructorMenuVisible(true);
                        }}
                                style={styles.modernDropdownBtn}
                              >
                                <WebCompatibleIcon name="person" size={20} color="#6B7280" />
                                <Text style={[
                                  styles.modernDropdownText,
                                  !formData.instructorName && styles.modernDropdownPlaceholder
                                ]}>
                            {instructors.length === 0 ? 
                              'No instructors available' : 
                                    (formData.instructorName || 'Select instructor')}
                                </Text>
                                <WebCompatibleIcon name="keyboard-arrow-down" size={20} color="#6B7280" />
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
                                  titleStyle={styles.modernMenuItemTitle}
                                  style={styles.modernMenuItem}
                        />
                      );
                    })}
                  </Menu>
              </View>

                        {formData.instructorId && formData.date && formData.time && (
                          <View style={[styles.modernAvailabilityBox, {
                            backgroundColor: instructorAvailability[formData.instructorId]?.available !== false ? '#ECFDF5' : '#FEE2E2',
                            borderColor: instructorAvailability[formData.instructorId]?.available !== false ? '#10B981' : '#EF4444'
                          }]}>
                            <WebCompatibleIcon 
                              name={checkingInstructorAvailability ? 'pending' : (instructorAvailability[formData.instructorId]?.available !== false ? 'check' : 'warning')} 
                              size={16} 
                              color={instructorAvailability[formData.instructorId]?.available !== false ? '#10B981' : '#EF4444'} 
                            />
                            <Text style={[styles.modernAvailabilityText, {
                              color: instructorAvailability[formData.instructorId]?.available !== false ? '#065F46' : '#991B1B'
                            }]}>
                              {checkingInstructorAvailability ? 'Checking...' : (instructorAvailability[formData.instructorId]?.available !== false ? 'Available' : 'Instructor is busy')}
                            </Text>
                          </View>
                  )}
                </View>

                      {/* Date & Time Card */}
                      <View style={styles.modernFormCard}>
                        <View style={styles.modernCardHeader}>
                          <WebCompatibleIcon name="schedule" size={18} color="#8B5CF6" />
                          <Text style={styles.modernCardTitle}>Schedule</Text>
                        </View>
                    
                        <View style={styles.modernInputRow}>
                          <View style={styles.modernInputHalf}>
                            <TextInput
                              label="Date *"
                              value={formData.date}
                              onChangeText={(text) => setFormData({...formData, date: text})}
                              mode="outlined"
                              placeholder="YYYY-MM-DD"
                              style={styles.modernInput}
                              outlineColor="#E5E7EB"
                              activeOutlineColor="#8B5CF6"
                              left={<TextInput.Icon icon="calendar-today" />}
                            />
                          </View>
                          
                          <View style={styles.modernInputHalf}>
                            <TextInput
                              label="Time *"
                              value={formData.time}
                              onChangeText={(text) => setFormData({...formData, time: text})}
                              mode="outlined"
                              placeholder="HH:MM"
                              style={styles.modernInput}
                              outlineColor="#E5E7EB"
                              activeOutlineColor="#8B5CF6"
                              left={<TextInput.Icon icon="access-time" />}
                            />
                          </View>
                        </View>
                        
                        <Caption style={styles.modernFieldHelper}>Quick time selection:</Caption>
                        <View style={styles.modernQuickTimeRow}>
                          {['08:00', '09:00', '10:00', '18:00', '19:00', '20:00'].map((time) => (
                            <Pressable
                              key={time}
                              style={[
                                styles.modernTimeChip,
                                formData.time === time && styles.modernTimeChipActive
                              ]}
                              onPress={() => setFormData({...formData, time: time})}
                            >
                              <Text style={[
                                styles.modernTimeChipText,
                                formData.time === time && styles.modernTimeChipTextActive
                              ]}>
                                {time}
                              </Text>
                            </Pressable>
                          ))}
                        </View>

                        <View style={styles.modernInputRow}>
                          <View style={styles.modernInputHalf}>
                  <TextInput
                              label="Duration (min) *"
                              value={String(formData.duration || '')}
                              onChangeText={(text) => {
                                const numValue = text === '' ? 0 : parseInt(text);
                                setFormData({...formData, duration: isNaN(numValue) ? 0 : numValue});
                              }}
                    mode="outlined"
                    keyboardType="numeric"
                              style={styles.modernInput}
                              outlineColor="#E5E7EB"
                              activeOutlineColor="#8B5CF6"
                    left={<TextInput.Icon icon="timer" />}
                  />
                </View>
                          <View style={styles.modernInputHalf}>
                  <TextInput
                    label="Capacity *"
                              value={String(formData.capacity || '')}
                              onChangeText={(text) => {
                                const numValue = text === '' ? 0 : parseInt(text);
                                setFormData({...formData, capacity: isNaN(numValue) ? 0 : numValue});
                              }}
                    mode="outlined"
                    keyboardType="numeric"
                              style={styles.modernInput}
                              outlineColor="#E5E7EB"
                              activeOutlineColor="#8B5CF6"
                    left={<TextInput.Icon icon="account-group" />}
                  />
                          </View>
                        </View>
                        <Caption style={styles.modernFieldHelper}>
                          {formData.category === 'personal' ? 
                      'Personal: 1 (private), 2 (couple), 3 (trio)' : 
                            'Group: typically 8-15 people'}
                  </Caption>
                </View>
              </View>

                    {/* Right Column */}
                    <View style={styles.modernFormColumn}>
                      {/* Class Type Card */}
                      <View style={styles.modernFormCard}>
                        <View style={styles.modernCardHeader}>
                          <WebCompatibleIcon name="fitness-center" size={18} color="#8B5CF6" />
                          <Text style={styles.modernCardTitle}>Class Type</Text>
                        </View>
                        
                        <Caption style={styles.modernFieldLabel}>Category *</Caption>
                <SegmentedButtons
                  value={formData.category}
                  onValueChange={(value) => {
                    const newCategory = value as 'personal' | 'group';
                    setFormData({
                      ...formData, 
                      category: newCategory,
                      capacity: newCategory === 'personal' && formData.capacity > 10 ? 1 : formData.capacity
                    });
                  }}
                  buttons={[
                            { value: 'group', label: 'Group' },
                            { value: 'personal', label: 'Personal' },
                  ]}
                          style={styles.modernSegmented}
                />

                        <Caption style={styles.modernFieldLabel}>Equipment *</Caption>
                <SegmentedButtons
                  value={formData.equipmentType}
                  onValueChange={(value) => setFormData({...formData, equipmentType: value as BackendClass['equipment_type']})}
                  buttons={[
                    { value: 'mat', label: 'Mat' },
                    { value: 'reformer', label: 'Reformer' },
                    { value: 'both', label: 'Both' },
                  ]}
                          style={styles.modernSegmented}
                />

                        <Caption style={styles.modernFieldLabel}>Room *</Caption>
                <SegmentedButtons
                  value={formData.room}
                  onValueChange={(value) => {
                    const newRoom = value as 'Reformer Room' | 'Mat Room' | 'Cadillac Room' | 'Wall Room';
                            let defaultCapacity = 10;
                            if (newRoom === 'Reformer Room') defaultCapacity = 8;
                            else if (newRoom === 'Mat Room') defaultCapacity = 10;
                            else if (newRoom === 'Cadillac Room') defaultCapacity = 1;
                            else if (newRoom === 'Wall Room') defaultCapacity = 1;
                            setFormData({ ...formData, room: newRoom, capacity: defaultCapacity });
                  }}
                  buttons={[
                    { value: 'Reformer Room', label: 'Reformer' },
                    { value: 'Mat Room', label: 'Mat' },
                    { value: 'Cadillac Room', label: 'Cadillac' },
                    { value: 'Wall Room', label: 'Wall' },
                  ]}
                          style={styles.modernSegmented}
                        />
                        
                        {formData.room && formData.date && formData.time && (
                          <View style={[styles.modernAvailabilityBox, {
                            backgroundColor: (roomAvailability && roomAvailability[formData.room]?.available) === true ? '#ECFDF5' : '#FEE2E2',
                            borderColor: (roomAvailability && roomAvailability[formData.room]?.available) === true ? '#10B981' : '#EF4444'
                          }]}>
                            <WebCompatibleIcon 
                              name={checkingAvailability ? 'pending' : ((roomAvailability && roomAvailability[formData.room]?.available) === true ? 'check' : 'warning')} 
                              size={16} 
                              color={(roomAvailability && roomAvailability[formData.room]?.available) === true ? '#10B981' : '#EF4444'} 
                            />
                            <Text style={[styles.modernAvailabilityText, {
                              color: (roomAvailability && roomAvailability[formData.room]?.available) === true ? '#065F46' : '#991B1B'
                            }]}>
                              {checkingAvailability ? 'Checking...' : ((roomAvailability && roomAvailability[formData.room]?.available) === true ? 'Available' : 'Room is busy')}
                            </Text>
                          </View>
                    )}
                  </View>

                      {/* Visibility Card */}
                      <View style={styles.modernFormCard}>
                        <View style={styles.modernCardHeader}>
                          <WebCompatibleIcon name={formData.visibility === 'private' ? 'visibility-off' : 'visibility'} size={18} color="#8B5CF6" />
                          <Text style={styles.modernCardTitle}>Visibility</Text>
              </View>

                        <View style={styles.modernVisibilityRow}>
                          <View style={styles.modernVisibilityInfo}>
                            <Text style={styles.modernVisibilityTitle}>
                      {formData.visibility === 'private' ? 'Private Class' : 'Public Class'}
                            </Text>
                            <Text style={styles.modernVisibilityDesc}>
                      {formData.visibility === 'private' 
                                ? 'Only staff can see' 
                                : 'Visible to clients'}
                            </Text>
                  </View>
                  <Switch
                    value={formData.visibility === 'private'}
                    onValueChange={(value) => setFormData({...formData, visibility: value ? 'private' : 'public'})}
                            thumbColor={formData.visibility === 'private' ? '#8B5CF6' : '#FFFFFF'}
                            trackColor={{ false: '#D1D5DB', true: '#C4B5FD' }}
                  />
                </View>
              </View>
                    </View>
                  </View>
          </ScrollView>
              
          {/* Action Buttons - Outside ScrollView */}
          <View style={styles.modernAddClassActions}>
            <TouchableOpacity
              style={[styles.modernCancelBtn, saving && styles.webButtonDisabled]}
              onPress={() => setModalVisible(false)}
              disabled={saving}
            >
              <Text style={styles.modernCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            
                <View style={styles.modalActionGroup}>
                  <TouchableOpacity
                style={styles.modernTemplateBtn}
                    onPress={() => setTemplateModalVisible(true)}
                  >
                <WebCompatibleIcon name="list" size={18} color="#6B7280" />
                <Text style={styles.modernTemplateBtnText}>Templates</Text>
                  </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modernSubmitBtn, saving && styles.webButtonDisabled]}
                onPress={handleSaveClass}
                disabled={saving}
              >
                <Text style={styles.modernSubmitBtnText}>
                  {saving ? 'Processing...' : (editingClass ? 'Update Class' : 'Create Class')}
                </Text>
              </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </View>
        )}
      </Portal>

      {/* Class Bookings Modal - Modern Design */}
      <Portal>
        <Modal
          visible={bookingsModalVisible}
          onDismiss={() => {
            setBookingsModalVisible(false);
            setShouldRefundCredit(true); // Reset to default
          }}
          dismissable={true}
          dismissableBackButton={true}
          contentContainerStyle={styles.modalContainerNoBackdrop}
          style={{ backgroundColor: 'transparent' }}
        >
          <View style={styles.modernModalCard}>
            {/* Header */}
            <View style={styles.modernModalHeader}>
              <View style={styles.modernHeaderLeft}>
                <View style={styles.modernModalIconWrapper}>
                  <WebCompatibleIcon name="calendar" size={20} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={styles.modernModalTitle}>
                    {selectedClassForBookings?.name || 'Class Details'}
                  </Text>
                  <Text style={styles.modernModalSubtitle}>
                    {selectedClassForBookings?.date} • {selectedClassForBookings?.time || 'No time'}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity 
                  onPress={() => {
                    if (selectedClassForBookings && !refreshingModal) {
                      // Use setTimeout to avoid blocking the UI thread
                      setTimeout(async () => {
                        try {
                          setRefreshingModal(true);
                          
                          // Refresh data in parallel
                          await Promise.all([loadBookings(), loadWaitlistEntries()]);
                          
                          // Manually update the modal data without closing it
                          const classBookings = getBookingsForClass(selectedClassForBookings.id);
                          const classWaitlist = getWaitlistForClass(selectedClassForBookings.id);
                          
                          const confirmedBookings = classBookings.filter(b => b.status === 'confirmed');
                          const cancelledBookings = classBookings.filter(b => b.status === 'cancelled');
                          
                          const enrichedClassData = {
                            ...selectedClassForBookings,
                            confirmedClients: confirmedBookings.map(booking => ({
                              id: booking.user_id,
                              bookingId: booking.id,
                              name: booking.users?.name || booking.client_name || booking.user_name || 'Unknown Client',
                              email: booking.users?.email || booking.client_email || booking.user_email || 'No email',
                              status: 'confirmed',
                              bookedAt: booking.created_at,
                              cancelledAt: null
                            })),
                            waitlistClients: classWaitlist.map(waitlistEntry => ({
                              id: waitlistEntry.user_id,
                              waitlistId: waitlistEntry.id,
                              name: waitlistEntry.users?.name || 'Unknown Client',
                              email: waitlistEntry.users?.email || 'No email',
                              status: 'waitlist',
                              bookedAt: waitlistEntry.created_at,
                              position: waitlistEntry.position,
                              cancelledAt: null
                            })),
                            cancelledClients: cancelledBookings.map(booking => ({
                              id: booking.user_id,
                              bookingId: booking.id,
                              name: booking.users?.name || booking.client_name || booking.user_name || 'Unknown Client',
                              email: booking.users?.email || booking.client_email || booking.user_email || 'No email',
                              status: 'cancelled',
                              bookedAt: booking.created_at,
                              cancelledAt: booking.updated_at
                            })),
                            confirmedBookings: confirmedBookings.length,
                            waitlistCount: classWaitlist.length,
                            cancelledCount: cancelledBookings.length
                          };
                          
                          setSelectedClassForBookings(enrichedClassData);
                        } catch (error) {
                          console.error('Error refreshing modal:', error);
                        } finally {
                          setRefreshingModal(false);
                        }
                      }, 0);
                    }
                  }}
                  style={[styles.modernCloseButton, { backgroundColor: '#F0F2F0', opacity: refreshingModal ? 0.5 : 1 }]}
                  disabled={refreshingModal}
                >
                  <WebCompatibleIcon name="refresh" size={20} color="#6B7280" />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => {
                    setBookingsModalVisible(false);
                    setShouldRefundCredit(true); // Reset to default
                  }}
                  style={styles.modernCloseButton}
                >
                  <WebCompatibleIcon name="close" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Body - Two Column Layout */}
            {selectedClassForBookings && (
              <View style={styles.modernModalBody}>
                {/* Left Column - Class Info */}
                <View style={styles.modernLeftColumn}>
                  <View style={styles.modernInfoSection}>
                    <Text style={styles.modernSectionTitle}>Class Information</Text>
                    
                    <View style={styles.modernInfoItem}>
                      <View style={styles.modernInfoIconBox}>
                        <WebCompatibleIcon name="person" size={16} color="#3B82F6" />
                      </View>
                      <View style={styles.modernInfoContent}>
                        <Text style={styles.modernInfoLabel}>Instructor</Text>
                        <Text style={styles.modernInfoValue}>
                          {selectedClassForBookings.instructor_name || 'Not assigned'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.modernInfoItem}>
                      <View style={styles.modernInfoIconBox}>
                        <WebCompatibleIcon name="people" size={16} color="#10B981" />
                      </View>
                      <View style={styles.modernInfoContent}>
                        <Text style={styles.modernInfoLabel}>Attendance</Text>
                        <Text style={styles.modernInfoValue}>
                          {selectedClassForBookings.confirmedBookings || 0} / {selectedClassForBookings.max_capacity || selectedClassForBookings.capacity || 0}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.modernInfoItem}>
                      <View style={styles.modernInfoIconBox}>
                        <WebCompatibleIcon name="queue" size={16} color="#F59E0B" />
                      </View>
                      <View style={styles.modernInfoContent}>
                        <Text style={styles.modernInfoLabel}>Waitlist</Text>
                        <Text style={styles.modernInfoValue}>
                          {selectedClassForBookings.waitlistCount || 0} {selectedClassForBookings.waitlistCount === 1 ? 'person' : 'people'}
                        </Text>
                      </View>
                    </View>

                    {selectedClassForBookings.room && (
                      <View style={styles.modernInfoItem}>
                        <View style={styles.modernInfoIconBox}>
                          <WebCompatibleIcon name="room" size={16} color="#8B5CF6" />
                        </View>
                        <View style={styles.modernInfoContent}>
                          <Text style={styles.modernInfoLabel}>Room</Text>
                          <Text style={styles.modernInfoValue}>
                            {selectedClassForBookings.room}
                          </Text>
                        </View>
                      </View>
                    )}

                    {selectedClassForBookings.duration && (
                      <View style={styles.modernInfoItem}>
                        <View style={styles.modernInfoIconBox}>
                          <WebCompatibleIcon name="schedule" size={16} color="#6366F1" />
                        </View>
                        <View style={styles.modernInfoContent}>
                          <Text style={styles.modernInfoLabel}>Duration</Text>
                          <Text style={styles.modernInfoValue}>
                            {selectedClassForBookings.duration} minutes
                          </Text>
                        </View>
                      </View>
                    )}

                    {selectedClassForBookings.equipment_type && (
                      <View style={styles.modernInfoItem}>
                        <View style={styles.modernInfoIconBox}>
                          <WebCompatibleIcon name="fitness-center" size={16} color="#EC4899" />
                        </View>
                        <View style={styles.modernInfoContent}>
                          <Text style={styles.modernInfoLabel}>Equipment</Text>
                          <Text style={styles.modernInfoValue}>
                            {selectedClassForBookings.equipment_type === 'both' ? 'Mat + Reformer' : selectedClassForBookings.equipment_type}
                          </Text>
                        </View>
                      </View>
                    )}

                    {selectedClassForBookings.category && (
                      <View style={styles.modernInfoItem}>
                        <View style={styles.modernInfoIconBox}>
                          <WebCompatibleIcon name="category" size={16} color="#059669" />
                        </View>
                        <View style={styles.modernInfoContent}>
                          <Text style={styles.modernInfoLabel}>Category</Text>
                          <Text style={styles.modernInfoValue}>
                            {selectedClassForBookings.category}
                          </Text>
                        </View>
                      </View>
                    )}

                    {selectedClassForBookings.status && (
                      <View style={styles.modernInfoItem}>
                        <View style={styles.modernInfoIconBox}>
                          <WebCompatibleIcon name="info" size={16} color="#7C3AED" />
                        </View>
                        <View style={styles.modernInfoContent}>
                          <Text style={styles.modernInfoLabel}>Status</Text>
                          <Text style={[styles.modernInfoValue, { 
                            color: selectedClassForBookings.status === 'active' ? Colors.light.cleanSuccess : 
                                   selectedClassForBookings.status === 'cancelled' ? Colors.light.cleanDanger : Colors.light.cleanNeutral
                          }]}>
                            {selectedClassForBookings.status?.charAt(0).toUpperCase() + selectedClassForBookings.status?.slice(1)}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Quick Stats */}
                  <View style={styles.modernStatsRow}>
                    <View style={styles.modernStatBox}>
                      <Text style={styles.modernStatNumber}>{selectedClassForBookings.confirmedBookings || 0}</Text>
                      <Text style={styles.modernStatLabel}>Confirmed</Text>
                    </View>
                    <View style={styles.modernStatBox}>
                      <Text style={[styles.modernStatNumber, { color: Colors.light.cleanWarning }]}>{selectedClassForBookings.waitlistCount || 0}</Text>
                      <Text style={styles.modernStatLabel}>Waitlist</Text>
                    </View>
                    <View style={styles.modernStatBox}>
                      <Text style={[styles.modernStatNumber, { color: '#6B7280' }]}>
                        {(selectedClassForBookings.max_capacity || selectedClassForBookings.capacity || 0) - (selectedClassForBookings.confirmedBookings || 0)}
                      </Text>
                      <Text style={styles.modernStatLabel}>Available</Text>
                    </View>
                  </View>
                  
                  {/* Cancelled Stats (if any) */}
                  {selectedClassForBookings.cancelledCount > 0 && (
                    <View style={[styles.modernStatsRow, { marginTop: 12 }]}>
                      <View style={styles.modernStatBox}>
                        <Text style={[styles.modernStatNumber, { color: Colors.light.cleanDanger }]}>{selectedClassForBookings.cancelledCount || 0}</Text>
                        <Text style={styles.modernStatLabel}>Cancelled</Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* Right Column - Client Lists */}
                <View style={styles.modernRightColumn}>
                  <Text style={styles.modernSectionTitle}>Participants</Text>
                  
                  {/* Show refund toggle only when within 2-hour cancellation window */}
                  {isWithinTwoHours && (
                    <View style={styles.refundToggleContainer}>
                      <View style={styles.refundToggleHeader}>
                        <WebCompatibleIcon name="warning" size={20} color={Colors.light.cleanWarning} />
                        <Body style={styles.refundToggleTitle}>2-Hour Cancellation Rule Active</Body>
                      </View>
                      <Body style={styles.refundToggleDescription}>
                        This class is within 2 hours. Clients removed now violated cancellation policy. Decide if you'll refund their credit.
                      </Body>
                      <View style={styles.refundToggleRow}>
                        <Switch
                          value={shouldRefundCredit}
                          onValueChange={setShouldRefundCredit}
                          color={Colors.light.cleanSuccess}
                        />
                        <Body style={styles.refundToggleLabel}>
                          {shouldRefundCredit ? '✓ Refund Class Credit' : '✗ No Refund (Policy Violation)'}
                        </Body>
                      </View>
                    </View>
                  )}
                  
                  <ScrollView style={styles.modernClientScrollArea} showsVerticalScrollIndicator={true}>
                    {/* Confirmed Clients */}
                    {selectedClassForBookings.confirmedClients && selectedClassForBookings.confirmedClients.length > 0 && (
                      <View style={styles.modernClientGroup}>
                        <View style={styles.modernGroupHeader}>
                          <View style={[styles.modernGroupBadge, { backgroundColor: '#D1FAE5' }]}>
                            <Text style={[styles.modernGroupBadgeText, { color: '#065F46' }]}>
                              Confirmed ({selectedClassForBookings.confirmedClients.length})
                            </Text>
                          </View>
                        </View>
                        <View style={styles.modernClientGrid}>
                          {selectedClassForBookings.confirmedClients.map((client: any, index: number) => (
                            <View key={client.id || index} style={styles.modernClientGridCard}>
                              <TouchableOpacity 
                                style={styles.modernClientGridRemoveButton}
                                onPress={() => {
                                  const booking = bookings.find(b => b.id === client.bookingId);
                                  if (booking) {
                                    handleRemoveClientFromClass(booking);
                                  }
                                }}
                              >
                                <WebCompatibleIcon name="close" size={14} color="#EF4444" />
                              </TouchableOpacity>
                              <View style={[styles.modernClientGridAvatar, { backgroundColor: '#DBEAFE' }]}>
                                <Text style={[styles.modernClientGridInitial, { color: '#1E40AF' }]}>
                                  {client.name?.charAt(0).toUpperCase()}
                                </Text>
                              </View>
                              <View style={styles.modernClientGridDetails}>
                                <Text style={styles.modernClientGridName} numberOfLines={1}>{client.name}</Text>
                                <Text style={styles.modernClientGridEmail} numberOfLines={1}>{client.email}</Text>
                                <Text style={styles.modernClientGridTimestamp}>
                                  Joined: {formatShortTimestamp(client.bookedAt)}
                                </Text>
                              </View>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}

                    {/* Waitlist Clients */}
                    {selectedClassForBookings.waitlistClients && selectedClassForBookings.waitlistClients.length > 0 && (
                      <View style={styles.modernClientGroup}>
                        <View style={styles.modernGroupHeader}>
                          <View style={[styles.modernGroupBadge, { backgroundColor: '#FEF3C7' }]}>
                            <Text style={[styles.modernGroupBadgeText, { color: '#92400E' }]}>
                              Waitlist ({selectedClassForBookings.waitlistClients.length})
                            </Text>
                          </View>
                        </View>
                        <View style={styles.modernClientGrid}>
                          {selectedClassForBookings.waitlistClients.map((client: any, index: number) => (
                            <View key={client.id || index} style={styles.modernClientGridCard}>
                              <TouchableOpacity 
                                style={styles.modernClientGridRemoveButton}
                                onPress={() => {
                                  // For waitlist clients, we need to handle removal from waitlist
                                  if (client.waitlistId) {
                                    console.log('🗑️ Remove from waitlist clicked:', client.waitlistId);
                                    
                                    const handleRemoval = async () => {
                                      console.log('🎯 [DEBUG] handleRemoval function called!');
                                      try {
                                        console.log('🚀 Starting waitlist removal process...');
                                        const response = await removeClientFromWaitlistAdmin(
                                          client.waitlistId, 
                                          selectedClassForBookings.id
                                        );
                                        
                                        console.log('📝 Removal response:', response);
                                        
                                        if (response.success) {
                                          console.log('🔄 Refreshing data after removal...');
                                          
                                          // Show success message first
                                          console.log('📢 Showing success message:', response.data.message);
                                          if (Platform.OS === 'web') {
                                            window.alert(`Success: ${response.data.message}`);
                                          } else {
                                            Alert.alert('Success', response.data.message);
                                          }
                                          
                                          // Refresh all data
                                          await Promise.all([loadClasses(), loadBookings(), loadWaitlistEntries()]);
                                          
                                          // Keep modal open and refresh its content
                                          if (selectedClassForBookings) {
                                            // Keep the modal visible during refresh
                                            setBookingsModalVisible(true);
                                            
                                            // Manually refresh the modal data
                                            const classBookings = getBookingsForClass(selectedClassForBookings.id);
                                            const classWaitlist = getWaitlistForClass(selectedClassForBookings.id);
                                            
                                            const confirmedBookings = classBookings.filter(b => b.status === 'confirmed');
                                            const cancelledBookings = classBookings.filter(b => b.status === 'cancelled');
                                            
                                            const confirmedClients = confirmedBookings.map(booking => ({
                                              id: booking.user_id,
                                              bookingId: booking.id,
                                              name: booking.users?.name || booking.client_name || booking.user_name || 'Unknown Client',
                                              email: booking.users?.email || booking.client_email || booking.user_email || 'No email',
                                              status: 'confirmed',
                                              bookedAt: booking.created_at,
                                              cancelledAt: null
                                            }));
                                            
                                            const waitlistClients = classWaitlist.map(waitlistEntry => ({
                                              id: waitlistEntry.user_id,
                                              waitlistId: waitlistEntry.id,
                                              name: waitlistEntry.users?.name || 'Unknown Client',
                                              email: waitlistEntry.users?.email || 'No email',
                                              status: 'waitlist',
                                              bookedAt: waitlistEntry.created_at,
                                              position: waitlistEntry.position,
                                              cancelledAt: null
                                            }));
                                            
                                            const cancelledClients = cancelledBookings.map(booking => ({
                                              id: booking.user_id,
                                              bookingId: booking.id,
                                              name: booking.users?.name || booking.client_name || booking.user_name || 'Unknown Client',
                                              email: booking.users?.email || booking.client_email || booking.user_email || 'No email',
                                              status: 'cancelled',
                                              bookedAt: booking.created_at,
                                              cancelledAt: booking.updated_at
                                            }));
                                            
                                            const enrichedClassData = {
                                              ...selectedClassForBookings,
                                              confirmedClients,
                                              waitlistClients,
                                              cancelledClients,
                                              confirmedBookings: confirmedClients.length,
                                              waitlistCount: waitlistClients.length,
                                              cancelledCount: cancelledClients.length
                                            };
                                            
                                            setSelectedClassForBookings(enrichedClassData);
                                          }
                                          
                                          console.log('✅ Data refresh completed');
                                        } else {
                                          const errorMsg = response.error || 'Failed to remove from waitlist';
                                          console.error('❌ Removal failed:', errorMsg);
                                          if (Platform.OS === 'web') {
                                            window.alert(`Error: ${errorMsg}`);
                                          } else {
                                            Alert.alert('Error', errorMsg);
                                          }
                                        }
                                      } catch (error) {
                                        console.error('❌ Exception during removal:', error);
                                        const errorMsg = 'Failed to remove from waitlist';
                                        if (Platform.OS === 'web') {
                                          window.alert(`Error: ${errorMsg}`);
                                        } else {
                                          Alert.alert('Error', errorMsg);
                                        }
                                      }
                                    };
                                    
                                    // Use platform-specific confirmation dialog
                                    if (Platform.OS === 'web') {
                                      const confirmed = window.confirm(`Remove ${client.name} from the waitlist?`);
                                      if (confirmed) {
                                        handleRemoval();
                                      }
                                    } else {
                                      Alert.alert('Remove from Waitlist', `Remove ${client.name} from the waitlist?`, [
                                        { text: 'Cancel', style: 'cancel' },
                                        { text: 'Remove', style: 'destructive', onPress: handleRemoval }
                                      ]);
                                    }
                                  } else {
                                    const booking = bookings.find(b => b.id === client.bookingId);
                                    if (booking) {
                                      handleRemoveClientFromClass(booking);
                                    }
                                  }
                                }}
                              >
                                <WebCompatibleIcon name="close" size={14} color="#EF4444" />
                              </TouchableOpacity>
                              <View style={[styles.modernClientGridAvatar, { backgroundColor: '#FEF3C7' }]}>
                                <Text style={[styles.modernClientGridInitial, { color: '#D97706' }]}>
                                  {client.name?.charAt(0).toUpperCase()}
                                </Text>
                              </View>
                              <View style={styles.modernClientGridDetails}>
                                <Text style={styles.modernClientGridName} numberOfLines={1}>{client.name}</Text>
                                <Text style={styles.modernClientGridEmail} numberOfLines={1}>{client.email}</Text>
                                <Text style={styles.modernClientGridTimestamp}>
                                  Joined: {formatShortTimestamp(client.bookedAt)}
                                </Text>
                                <View style={styles.modernClientGridPositionBadge}>
                                  <Text style={styles.modernClientGridPositionText}>
                                    #{client.position || (index + 1)}
                                  </Text>
                                </View>
                              </View>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}

                    {/* Cancelled Clients */}
                    {selectedClassForBookings.cancelledClients && selectedClassForBookings.cancelledClients.length > 0 && (
                      <View style={styles.modernClientGroup}>
                        <View style={styles.modernGroupHeader}>
                          <View style={[styles.modernGroupBadge, { backgroundColor: '#F5E6E6' }]}>
                            <Text style={[styles.modernGroupBadgeText, { color: '#991B1B' }]}>
                              Cancelled ({selectedClassForBookings.cancelledClients.length})
                            </Text>
                          </View>
                        </View>
                        <View style={styles.modernClientGrid}>
                          {selectedClassForBookings.cancelledClients.map((client: any, index: number) => (
                            <View key={client.id || index} style={styles.modernClientGridCard}>
                              <View style={styles.modernClientGridStatusBadge}>
                                <View style={[styles.modernClientGridStatusDot, { backgroundColor: Colors.light.cleanDanger }]} />
                              </View>
                              <View style={[styles.modernClientGridAvatar, { backgroundColor: '#F5E6E6' }]}>
                                <Text style={[styles.modernClientGridInitial, { color: '#B85C5C' }]}>
                                  {client.name?.charAt(0).toUpperCase()}
                                </Text>
                              </View>
                              <View style={styles.modernClientGridDetails}>
                                <Text style={styles.modernClientGridName} numberOfLines={1}>{client.name}</Text>
                                <Text style={styles.modernClientGridEmail} numberOfLines={1}>{client.email}</Text>
                                <Text style={styles.modernClientGridTimestamp}>
                                  Joined: {formatShortTimestamp(client.bookedAt)}
                                </Text>
                                <Text style={[styles.modernClientGridTimestamp, { color: '#B85C5C', fontWeight: '500' }]}>
                                  Cancelled: {formatShortTimestamp(client.cancelledAt)}
                                </Text>
                              </View>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}

                    {/* No Clients */}
                    {(!selectedClassForBookings.confirmedClients || selectedClassForBookings.confirmedClients.length === 0) && 
                     (!selectedClassForBookings.waitlistClients || selectedClassForBookings.waitlistClients.length === 0) && 
                     (!selectedClassForBookings.cancelledClients || selectedClassForBookings.cancelledClients.length === 0) && (
                      <View style={styles.modernEmptyState}>
                        <View style={styles.modernEmptyIcon}>
                          <WebCompatibleIcon name="people-outline" size={40} color="#D1D5DB" />
                        </View>
                        <Text style={styles.modernEmptyTitle}>No participants yet</Text>
                        <Text style={styles.modernEmptyText}>
                          Clients will appear here when they book this class
                        </Text>
                      </View>
                    )}
                  </ScrollView>
                </View>
              </View>
            )}

            {/* Footer */}
            <View style={styles.modernModalFooter}>
              <View style={styles.modernFooterActions}>
                {/* Show Assign to Class only if class is not full */}
                {selectedClassForBookings && 
                 (selectedClassForBookings.confirmedBookings || 0) < (selectedClassForBookings.max_capacity || selectedClassForBookings.capacity || 0) && (
                  <TouchableOpacity 
                    onPress={() => {
                      setBookingsModalVisible(false);
                      handleAssignClient(selectedClassForBookings);
                    }}
                    style={styles.modernActionButton}
                  >
                    <WebCompatibleIcon name="account-plus" size={18} color="#10B981" />
                    <Text style={styles.modernActionButtonText}>Assign to Class</Text>
                  </TouchableOpacity>
                )}
                
                {/* Show Add to Waitlist only if class is full */}
                {selectedClassForBookings && 
                 (selectedClassForBookings.confirmedBookings || 0) >= (selectedClassForBookings.max_capacity || selectedClassForBookings.capacity || 0) && (
                  <TouchableOpacity 
                    onPress={() => {
                      setBookingsModalVisible(false);
                      handleAssignToWaitlist(selectedClassForBookings);
                    }}
                    style={styles.modernActionButton}
                  >
                    <WebCompatibleIcon name="queue" size={18} color="#F59E0B" />
                    <Text style={styles.modernActionButtonText}>Add to Waitlist</Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity 
                  onPress={() => {
                    setBookingsModalVisible(false);
                    handleEditClass(selectedClassForBookings);
                  }}
                  style={styles.modernActionButton}
                >
                  <WebCompatibleIcon name="pencil" size={18} color="#8B5CF6" />
                  <Text style={styles.modernActionButtonText}>Update Class</Text>
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity 
                onPress={() => {
                  setBookingsModalVisible(false);
                  setShouldRefundCredit(true); // Reset to default
                }}
                style={styles.modernCloseFooterButton}
              >
                <Text style={styles.modernFooterButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
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
          dismissable={true}
          dismissableBackButton={true}
          contentContainerStyle={styles.modalContainerNoBackdrop}
          style={{ backgroundColor: 'transparent' }}
        >
          <View style={styles.modernAssignModalCard}>
            {/* Header */}
            <View style={styles.modernModalHeader}>
              <View style={styles.modernHeaderLeft}>
                <View style={[
                  styles.modernModalIconWrapper, 
                  { backgroundColor: isWaitlistAssignment ? Colors.light.cleanWarning : Colors.light.cleanSuccess }
                ]}>
                  <WebCompatibleIcon 
                    name={isWaitlistAssignment ? "queue" : "account-plus"} 
                    size={20} 
                    color="#FFFFFF" 
                  />
                </View>
                <View>
                  <Text style={styles.modernModalTitle}>
                    {isWaitlistAssignment ? 'Add to Waitlist' : 'Assign Client'}
                  </Text>
                  <Text style={styles.modernModalSubtitle}>
                    {selectedClassForAssignment?.name} • {selectedClassForAssignment?.date}
                  </Text>
                </View>
              </View>
              <TouchableOpacity 
                onPress={() => {
                  setAssignClientModalVisible(false);
                  setClientMenuVisible(false);
                }}
                style={styles.modernCloseButton}
              >
                <WebCompatibleIcon name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            {/* Body */}
            <View style={styles.modernAssignModalBody}>
              {/* Search Section */}
              <View style={styles.modernSearchSection}>
                <Searchbar
                  placeholder="Search client by name or email..."
                  onChangeText={setClientSearchQuery}
                  value={clientSearchQuery}
                  style={styles.modernSearchBar}
                  inputStyle={{ fontSize: 15 }}
                  iconColor="#3B82F6"
                />
                
                <TouchableOpacity 
                  onPress={() => setProspectClientModalVisible(true)}
                  style={styles.modernAddProspectButton}
                >
                  <WebCompatibleIcon name="account-plus" size={18} color="#10B981" />
                  <Text style={styles.modernAddProspectText}>Add Prospect</Text>
                </TouchableOpacity>
              </View>

              {/* Client List */}
              <ScrollView style={styles.modernClientListContainer} showsVerticalScrollIndicator={true}>
                {filteredClients.length === 0 ? (
                  <View style={styles.modernEmptyState}>
                    <View style={styles.modernEmptyIcon}>
                      <WebCompatibleIcon name="search" size={40} color="#D1D5DB" />
                    </View>
                    <Text style={styles.modernEmptyTitle}>
                      {clientSearchQuery ? 'No clients found' : clients.length === 0 ? 'Loading clients...' : 'All clients shown'}
                    </Text>
                    <Text style={styles.modernEmptyText}>
                      {clientSearchQuery ? 'Try a different search term' : clients.length === 0 ? 'Please wait' : 'Use search to filter clients'}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.modernClientListGroup}>
                    <Text style={styles.modernListHeader}>
                      {filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''} found
                    </Text>
                    <View style={styles.modernClientGrid}>
                      {filteredClients.map((client) => (
                        <TouchableOpacity
                          key={client.id}
                          style={[
                            styles.modernSelectableClientCard,
                            selectedClient?.id === client.id && styles.modernSelectedClientCard
                          ]}
                          onPress={() => setSelectedClient(client)}
                        >
                          <View style={[
                            styles.modernClientAvatar,
                            { backgroundColor: selectedClient?.id === client.id ? '#DBEAFE' : '#F0F2F0' }
                          ]}>
                            <Text style={[
                              styles.modernClientInitial,
                              { color: selectedClient?.id === client.id ? '#1E40AF' : '#6B7280' }
                            ]}>
                              {client.name?.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <View style={styles.modernClientDetailsCompact}>
                            <Text style={styles.modernClientNameCompact} numberOfLines={1}>{client.name}</Text>
                            <Text style={styles.modernClientEmailCompact} numberOfLines={1}>{client.email}</Text>
                          </View>
                          {selectedClient?.id === client.id && (
                            <View style={styles.modernCheckIconCompact}>
                              <WebCompatibleIcon name="check-circle" size={20} color="#10B981" />
                            </View>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </ScrollView>

              {/* Options Section */}
              <View style={styles.modernOptionsSection}>
                <TouchableOpacity 
                  style={styles.modernToggleOption}
                  onPress={() => setOverrideRestrictions(!overrideRestrictions)}
                >
                  <View style={[
                    styles.modernToggleBox,
                    overrideRestrictions && styles.modernToggleBoxActive
                  ]}>
                    {overrideRestrictions && (
                      <WebCompatibleIcon name="check" size={16} color="#FFFFFF" />
                    )}
                  </View>
                  <View style={styles.modernToggleContent}>
                    <Text style={styles.modernToggleLabel}>Override subscription restrictions</Text>
                    <Text style={styles.modernToggleDescription}>
                      {isWaitlistAssignment 
                        ? 'Waitlist assignments always override restrictions (no class deduction)'
                        : overrideRestrictions 
                          ? 'Assign without checking subscription (capacity still enforced)' 
                          : 'Check subscription and deduct 1 class when assigned'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Footer */}
            <View style={styles.modernModalFooter}>
              <TouchableOpacity 
                onPress={() => {
                  setAssignClientModalVisible(false);
                  setClientMenuVisible(false);
                }}
                style={[styles.modernCloseFooterButton, { backgroundColor: '#9CA3AF' }]}
              >
                <Text style={styles.modernFooterButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={handleAssignClientToClass}
                disabled={!selectedClient || assigningClient}
                style={[
                  styles.modernCloseFooterButton, 
                  { 
                    backgroundColor: isWaitlistAssignment ? Colors.light.cleanWarning : Colors.light.cleanSuccess, 
                    flex: 1, 
                    marginLeft: 12 
                  },
                  (!selectedClient || assigningClient) && { opacity: 0.5 }
                ]}
              >
                <Text style={styles.modernFooterButtonText}>
                  {assigningClient ? 
                    (isWaitlistAssignment ? 'Adding to Waitlist...' : 'Assigning...') : 
                    (isWaitlistAssignment ? 'Add to Waitlist' : 'Assign Client')
                  }
                </Text>
              </TouchableOpacity>
            </View>
          </View>
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
          dismissable={true}
          dismissableBackButton={true}
          contentContainerStyle={styles.modalContainerNoBackdrop}
          style={{ backgroundColor: 'transparent' }}
        >
          <View style={[styles.modernAssignModalCard, { maxHeight: 650 }]}>
            {/* Header */}
            <View style={styles.modernModalHeader}>
              <View style={styles.modernHeaderLeft}>
                <View style={[styles.modernModalIconWrapper, { backgroundColor: Colors.light.cleanSecondary }]}>
                  <WebCompatibleIcon name="person-add" size={20} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={styles.modernModalTitle}>Add Prospect Client</Text>
                  <Text style={styles.modernModalSubtitle}>Create new prospect for trial class</Text>
                </View>
              </View>
              <TouchableOpacity 
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
                style={styles.modernCloseButton}
              >
                <WebCompatibleIcon name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
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

            {/* Footer */}
            <View style={styles.modernModalFooter}>
              <TouchableOpacity 
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
                style={[styles.modernCloseFooterButton, { backgroundColor: '#9CA3AF' }]}
              >
                <Text style={styles.modernFooterButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={handleCreateProspectClient}
                disabled={!prospectClientForm.name.trim() || creatingProspectClient}
                style={[
                  styles.modernCloseFooterButton, 
                  { backgroundColor: Colors.light.cleanSecondary, flex: 1, marginLeft: 12 },
                  (!prospectClientForm.name.trim() || creatingProspectClient) && { opacity: 0.5 }
                ]}
              >
                <Text style={styles.modernFooterButtonText}>
                  {creatingProspectClient ? 'Creating...' : 'Create & Assign'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
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
                      
                      {/* Show refund toggle only when within 2-hour cancellation window */}
                      {isWithinTwoHours && (
                        <View style={styles.refundToggleContainer}>
                          <View style={styles.refundToggleHeader}>
                            <WebCompatibleIcon name="warning" size={20} color={Colors.light.cleanWarning} />
                            <Body style={styles.refundToggleTitle}>2-Hour Cancellation Rule Active</Body>
                          </View>
                          <Body style={styles.refundToggleDescription}>
                            This class is within 2 hours. Client violated cancellation policy. You can decide whether to refund their credit.
                          </Body>
                          <View style={styles.refundToggleRow}>
                            <Switch
                              value={shouldRefundCredit}
                              onValueChange={setShouldRefundCredit}
                              color={Colors.light.cleanSuccess}
                            />
                            <Body style={styles.refundToggleLabel}>
                              {shouldRefundCredit ? '✓ Refund Class Credit' : '✗ No Refund (Policy Violation)'}
                            </Body>
                          </View>
                        </View>
                      )}
                      
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
                                    await performUnassignClient(booking, selectedClassForUnassign, shouldRefundCredit);
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
  containerWithBackground: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    color: Colors.light.textSecondary,
  },
  // Modern Header Styles
  modernHeader: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 2,
    borderBottomColor: Colors.light.border,
    paddingHorizontal: 20,
    paddingVertical: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  modernHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  modernHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  modernHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modernSearchbar: {
    flex: 1,
    maxWidth: 400,
    height: 44,
    backgroundColor: Colors.light.surfaceVariant,
  },
  modernFilterButton: {
    borderRadius: 8,
    borderColor: Colors.light.primary,
  },
  modernIconButton: {
    margin: 0,
  },
  modernAddButton: {
    borderRadius: 8,
  },
  modernAddButtonContent: {
    paddingHorizontal: 8,
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
    padding: 16,
    gap: 16,
    minHeight: isLargeScreen ? 600 : 400,
    backgroundColor: '#F5F5F5',
  },
  hybridLeft: {
    flex: isLargeScreen ? 0.75 : 0.55, // Wider calendar
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: '#E8E6E3',
    minHeight: isLargeScreen ? 700 : 600, // Fixed TALL height
    maxHeight: isLargeScreen ? 700 : 600, // Prevent growing
  },
  hybridRight: {
    flex: isLargeScreen ? 0.25 : 0.45, // Much narrower class cards
    backgroundColor: 'transparent',
  },
  hybridLeftContainer: {
    flexGrow: 1, // Allow content to grow if needed
    padding: isLargeScreen ? spacing.lg : spacing.md,
  },
  hybridRightContainer: {
    flexGrow: 1,
    padding: isLargeScreen ? spacing.lg : spacing.md,
  },
  calendarSection: {
    height: isLargeScreen ? 500 : 450, // Fixed TALL height
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
    height: isLargeScreen ? 450 : 400, // Fixed TALL height
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
    backgroundColor: '#9B8A7D', // Subtle brown/taupe color
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
  // Simple Class Card Styles
  simpleClassCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 12,
    marginHorizontal: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardStatusBar: {
    height: 3,
    width: '100%',
  },
  simpleCardContent: {
    padding: 16,
    gap: 12,
  },
  simpleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  simpleTimeBlock: {
    alignItems: 'center',
    minWidth: 70,
  },
  simpleTimeBlockBordered: {
    alignItems: 'center',
    minWidth: 70,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    backgroundColor: '#F9FAFB',
    gap: 4,
  },
  simpleTime: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  simpleDuration: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  simpleVerticalDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#D1D5DB',
    marginHorizontal: 12,
  },
  simpleTitleBlock: {
    flex: 1,
  },
  simpleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  simpleInstructorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  simpleInstructor: {
    fontSize: 13,
    color: '#6B7280',
  },
  simpleCapacityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  simpleCapacityText: {
    fontSize: 13,
    fontWeight: '700',
  },
  simpleInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  simpleInfoTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    gap: 4,
  },
  simpleInfoText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  simpleInfoDivider: {
    width: 1,
    height: 12,
    backgroundColor: '#D1D5DB',
  },
  simpleActionRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 4,
  },
  simpleActionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  simpleActionBtnWithLabel: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 4,
  },
  simpleActionText: {
    fontSize: 11,
    fontWeight: '600',
  },
  // Shared chip styles for other views
  simpleChip: {
    backgroundColor: '#F0F2F0',
    borderRadius: 6,
  },
  simpleChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
  },
  enrollmentChip: {
    borderRadius: 6,
  },
  enrollmentChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  modernClassHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  modernTimeSection: {
    alignItems: 'center',
    marginRight: 16,
  },
  modernTimeBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8FA8A3',
    borderRadius: 8,
    padding: 8,
    minWidth: 70,
  },
  modernTimeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  modernDurationText: {
    fontSize: 10,
    color: '#DBEAFE',
    fontWeight: '500',
  },
  modernClassMainInfo: {
    flex: 1,
  },
  modernClassName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  modernInstructorText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  modernSimpleChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  modernSimpleChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#F0F2F0',
  },
  modernSimpleChipText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  modernNotesSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 4,
  },
  modernNotesText: {
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
    flex: 1,
  },
  modernSimpleActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  modernSimpleActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#F0F2F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Legacy class card styles (kept for compatibility)
  classCard: {
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainerNoBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'transparent',
  },
  modalSurface: {
    padding: spacing.lg,
    borderRadius: layout.borderRadius,
    backgroundColor: Colors.light.surface,
  },
  // Web-Optimized Modal Styles
  webModalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    paddingHorizontal: spacing.lg,
  },
  webModalContainer: {
    width: '100%',
    maxWidth: 800,
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
  // Modern Add Class Modal Styles
  modernAddClassContainer: {
    width: '100%',
    maxWidth: 900,
    maxHeight: '92%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 30,
  },
  modernAddClassSurface: {
    flex: 1,
  },
  modernAddClassHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FAFAFA',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  modernAddClassTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  modernAddClassSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  modernAddClassCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modernAddClassContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  modernFormGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  modernFormColumn: {
    flex: 1,
    minWidth: 380,
  },
  modernFormCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modernCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modernCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  modernInputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modernInputHalf: {
    flex: 1,
  },
  modernQuickTimeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  modernQuickNameRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  modernNameChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  modernNameChipActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  modernNameChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  modernNameChipTextActive: {
    color: '#FFFFFF',
  },
  modernTimeChip: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  modernTimeChipActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  modernTimeChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  modernTimeChipTextActive: {
    color: '#FFFFFF',
  },
  modernDateTimeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    paddingVertical: 14,
    paddingHorizontal: 12,
    gap: 10,
    minHeight: 56,
  },
  modernDateTimeText: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
  },
  modernDateTimePlaceholder: {
    color: '#9CA3AF',
    fontWeight: '400',
  },
  pickerBackdrop: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 9998,
  },
  modernCalendarDropdown: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
    zIndex: 9999,
    overflow: 'hidden',
  },
  calendarPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FAFAFA',
  },
  calendarPickerHeaderText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  modernTimePickerDropdown: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
    zIndex: 9999,
    overflow: 'hidden',
  },
  timePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FAFAFA',
  },
  timePickerHeaderText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  timePickerColumns: {
    flexDirection: 'row',
    height: 250,
  },
  timePickerColumn: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: '#F3F4F6',
  },
  timePickerColumnLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    textAlign: 'center',
    paddingVertical: 12,
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  timePickerScrollColumn: {
    flex: 1,
  },
  timePickerOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
    alignItems: 'center',
  },
  timePickerOptionActive: {
    backgroundColor: '#EDE9FE',
  },
  timePickerOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  timePickerOptionTextActive: {
    color: '#8B5CF6',
    fontWeight: '700',
  },
  timePickerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FAFAFA',
  },
  timePickerPreview: {
    fontSize: 18,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  timePickerDoneBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
  },
  timePickerDoneBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modernFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 4,
  },
  modernFieldHelper: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
  },
  modernSegmented: {
    marginBottom: 12,
  },
  modernVisibilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modernVisibilityInfo: {
    flex: 1,
  },
  modernVisibilityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  modernVisibilityDesc: {
    fontSize: 12,
    color: '#6B7280',
  },
  modernAddClassSection: {
    marginBottom: 24,
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 16,
  },
  modernSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  modernFormSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  modernInput: {
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  modernPickerWrapper: {
    marginBottom: 12,
  },
  modernPickerLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  modernDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    paddingVertical: 14,
    paddingHorizontal: 12,
    gap: 10,
    minHeight: 56,
  },
  modernDropdownText: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
  },
  modernDropdownPlaceholder: {
    color: '#9CA3AF',
    fontWeight: '400',
  },
  modernMenuContainer: {
    marginTop: 8,
  },
  modernMenuContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    minWidth: 380,
    maxWidth: 480,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modernMenuItem: {
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modernMenuItemTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  modernAvailabilityBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  modernAvailabilityText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modernAddClassActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FAFAFA',
  },
  modernCancelBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  modernCancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  modernTemplateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    marginRight: 12,
  },
  modernTemplateBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  modernSubmitBtn: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#8B5CF6',
  },
  modernSubmitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
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
    backgroundColor: '#9B8A7D', // Subtle brown/taupe instead of bright blue
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
    color: '#333333', // Dark gray instead of accent color
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
  refundToggleContainer: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  refundToggleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  refundToggleTitle: {
    fontWeight: '700',
    color: '#92400E',
  },
  refundToggleDescription: {
    color: '#78350F',
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  refundToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  refundToggleLabel: {
    fontWeight: '600',
    color: '#92400E',
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
  // Modern Modal Styles
  modernModalCard: {
    width: isLargeScreen ? '90%' : '95%',
    maxWidth: isLargeScreen ? 1400 : 1100,
    maxHeight: '92%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 15,
  },
  modernAssignModalCard: {
    width: '90%',
    maxWidth: 650,
    maxHeight: 600,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 15,
  },
  modernModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F0',
  },
  modernModalIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#8FA8A3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modernModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.3,
  },
  modernModalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '500',
  },
  modernCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modernModalBody: {
    flexDirection: 'row',
    flex: 1,
    overflow: 'hidden',
  },
  modernLeftColumn: {
    width: isLargeScreen ? 380 : 340,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 24,
    paddingVertical: 24,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  modernRightColumn: {
    flex: 1,
    paddingHorizontal: isLargeScreen ? 32 : 24,
    paddingVertical: 24,
  },
  modernSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 16,
  },
  modernInfoSection: {
    marginBottom: 24,
  },
  modernInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  modernInfoIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modernInfoContent: {
    flex: 1,
  },
  modernInfoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modernInfoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  modernStatsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modernStatBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  modernStatNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#8FA8A3',
    marginBottom: 4,
  },
  modernStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modernClientScrollArea: {
    flex: 1,
    maxHeight: isLargeScreen ? 600 : 480,
  },
  modernClientGroup: {
    marginBottom: 24,
  },
  modernGroupHeader: {
    marginBottom: 12,
  },
  modernGroupBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  modernGroupBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  // Grid layout styles
  modernClientGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  modernClientGridCard: {
    width: isLargeScreen ? '31%' : '48%',
    minWidth: 240,
    maxWidth: isLargeScreen ? 320 : 280,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0F2F0',
    position: 'relative',
    ...shadows.card,
  },
  modernClientGridRemoveButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F5E6E6',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  modernClientGridStatusBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F5E6E6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modernClientGridStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  modernClientGridAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    alignSelf: 'center',
  },
  modernClientGridInitial: {
    fontSize: 18,
    fontWeight: '700',
  },
  modernClientGridDetails: {
    alignItems: 'center',
  },
  modernClientGridName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
    textAlign: 'center',
  },
  modernClientGridEmail: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
    textAlign: 'center',
  },
  modernClientGridTimestamp: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 2,
  },
  modernClientGridPositionBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  modernClientGridPositionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
  modernClientAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  modernClientInitial: {
    fontSize: 16,
    fontWeight: '700',
  },
  modernClientDetails: {
    flex: 1,
  },
  modernClientName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  modernClientEmail: {
    fontSize: 13,
    color: '#6B7280',
  },
  modernClientTimestamp: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  modernClientRemoveButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5E6E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  modernStatusBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modernStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  modernEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  modernEmptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modernEmptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  modernEmptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
  modernModalFooter: {
    paddingHorizontal: 28,
    paddingVertical: 20,
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modernFooterActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modernActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modernActionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  modernCloseFooterButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#8FA8A3',
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  modernFooterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Modern Assign Modal Styles
  modernAssignModalBody: {
    flex: 1,
    padding: 16,
  },
  modernSearchSection: {
    marginBottom: 12,
  },
  modernSearchBar: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    elevation: 0,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    height: 44,
  },
  modernAddProspectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginTop: 10,
  },
  modernAddProspectText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.cleanSuccess,
  },
  modernClientListContainer: {
    flex: 1,
    marginBottom: 16,
  },
  modernClientListGroup: {
    gap: 8,
  },
  modernListHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  modernSelectableClientCard: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    flexBasis: '31%',
    minWidth: 140,
    maxWidth: '33%',
  },
  modernSelectedClientCard: {
    borderColor: Colors.light.cleanSuccess,
    backgroundColor: '#F0FDF4',
  },
  modernCheckIcon: {
    marginLeft: 'auto',
  },
  modernClientDetailsCompact: {
    flex: 1,
    alignItems: 'center',
    marginTop: 8,
    width: '100%',
  },
  modernClientNameCompact: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
    textAlign: 'center',
  },
  modernClientEmailCompact: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
  },
  modernCheckIconCompact: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  modernOptionsSection: {
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  modernToggleOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  modernToggleBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modernToggleBoxActive: {
    backgroundColor: Colors.light.cleanSuccess,
    borderColor: Colors.light.cleanSuccess,
  },
  modernToggleContent: {
    flex: 1,
  },
  modernToggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  modernToggleDescription: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
});

export default PCClassManagement; 