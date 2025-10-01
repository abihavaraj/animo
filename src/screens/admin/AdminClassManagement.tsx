import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import {
    ActivityIndicator,
    Button,
    Caption,
    Card,
    Chip,
    FAB,
    IconButton,
    Menu,
    Modal,
    Paragraph,
    Portal,
    Searchbar,
    SegmentedButtons,
    TextInput,
    Title
} from 'react-native-paper';
import { useThemeColor } from '../../../hooks/useThemeColor';
import { BackendClass, classService, CreateClassRequest, UpdateClassRequest } from '../../services/classService';
import { notificationService } from '../../services/notificationService';
import { BackendUser, userService } from '../../services/userService';

// Helper function to check if a class has passed (finished)
const isPastClass = (date: string, time: string, duration: number) => {
  const classDateTime = new Date(`${date}T${time}`);
  const endDateTime = new Date(classDateTime.getTime() + duration * 60000); // Add duration in minutes
  return endDateTime < new Date();
};

function AdminClassManagement() {
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

  const [classes, setClasses] = useState<BackendClass[]>([]);
  const [instructors, setInstructors] = useState<BackendUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingInstructors, setLoadingInstructors] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingClass, setEditingClass] = useState<BackendClass | null>(null);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
  
  // Instructor selection menu state
  const [instructorMenuVisible, setInstructorMenuVisible] = useState(false);
  
  // Instructor availability state
  const [instructorAvailability, setInstructorAvailability] = useState<{[key: string]: {available: boolean, conflictClass: any}}>({});
  const [checkingInstructorAvailability, setCheckingInstructorAvailability] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    instructorId: '',
    instructorName: '',
    date: '',
    time: '',
    duration: undefined as number | undefined,
    // level: removed from schema
    category: 'group' as 'personal' | 'group',
    capacity: undefined as number | undefined,
    equipment: '',
    description: '',
    equipmentType: 'mat' as BackendClass['equipment_type'],
    room: '' as 'Reformer Room' | 'Mat Room' | 'Cadillac Room' | 'Wall Room' | '',
  });

  useEffect(() => {
    loadClasses();
    loadInstructors();
  }, []);

  // Check instructor availability when date, time, or instructor changes
  useEffect(() => {
    if (formData.date && formData.time && formData.instructorId) {
      checkInstructorAvailability();
    }
  }, [formData.date, formData.time, formData.instructorId, formData.duration]);

  const loadClasses = async () => {
    try {
      setLoading(true);
      const filters = {
        status: filterStatus === 'all' ? undefined : filterStatus,
        userRole: 'admin' // Ensure admin can see all classes including private ones
        // No limit - truly unlimited for admin to see all classes past, present, future
      };
      
      const response = await classService.getClasses(filters);
      if (response.success && response.data) {
        setClasses(response.data);
      } else {
        console.error('Failed to load classes:', response.error);
        Alert.alert('Error', response.error || 'Failed to load classes');
        setClasses([]);
      }
    } catch (error) {
      console.error('Error loading classes:', error);
      Alert.alert('Error', 'Failed to load classes');
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  const loadInstructors = async () => {
    try {
      setLoadingInstructors(true);
      const response = await userService.getInstructors();
      if (response.success && response.data) {
        setInstructors(response.data);
      } else {
        console.error('Failed to load instructors:', response.error);
        setInstructors([]);
      }
    } catch (error) {
      console.error('Error loading instructors:', error);
      setInstructors([]);
    } finally {
      setLoadingInstructors(false);
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

  // Reload classes when filter changes
  useEffect(() => {
    loadClasses();
  }, [filterStatus]);

  const filteredClasses = classes.filter(class_ => {
    const matchesSearch = class_.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         class_.instructor_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#4caf50';
      case 'cancelled': return '#f44336';
      case 'full': return '#ff9800';
      default: return '#666';
    }
  };

  // getLevelColor function removed - level field no longer exists

  const getEquipmentTypeColor = (equipmentType: string) => {
    switch (equipmentType) {
      case 'mat': return '#4caf50';
      case 'reformer': return '#ff9800';
      case 'both': return '#9c27b0';
      default: return '#666';
    }
  };

  const handleCreateClass = () => {
    setEditingClass(null);
    const now = new Date();
    // Format today's date as YYYY-MM-DD
    const today = now.toISOString().split('T')[0];
    // Format current time as HH:MM
    const currentTime = now.toTimeString().slice(0, 5);
    
    setFormData({
      name: '',
      instructorId: '',
      instructorName: '',
      date: today,
      time: currentTime,
      duration: 60,
      // level: removed from schema
      category: 'group',
      capacity: 10,
      equipment: '',
      description: '',
      equipmentType: 'mat',
      room: '',
    });
    setModalVisible(true);
  };

  const handleEditClass = (class_: BackendClass) => {
    setEditingClass(class_);
    setFormData({
      name: class_.name,
      instructorId: class_.instructor_id.toString(),
      instructorName: class_.instructor_name,
      date: class_.date,
      time: class_.time,
      duration: class_.duration,
      // level: removed from schema
      category: class_.category,
      capacity: class_.capacity,
      equipment: (class_.equipment && Array.isArray(class_.equipment) ? class_.equipment.join(', ') : ''),
      description: class_.description || '',
      equipmentType: class_.equipment_type,
      room: (class_ as any).room || '',
    });
    setModalVisible(true);
  };

  const selectInstructor = (instructor: BackendUser) => {
    setFormData({
      ...formData,
      instructorId: instructor.id.toString(),
      instructorName: instructor.name
    });
    setInstructorMenuVisible(false);
  };

  const isPersonalClass = () => {
    return formData.category === 'personal';
  };

  const formatDateForDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long', 
        day: 'numeric',
        year: 'numeric'
      });
    } catch (error) {
      return dateStr;
    }
  };

  const formatTimeForDisplay = (timeStr: string) => {
    if (!timeStr) return '';
    try {
      return new Date(`2000-01-01T${timeStr}`).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      return timeStr;
    }
  };

  const handleSaveClass = async () => {
    if (!formData.name || !formData.instructorId || !formData.date || !formData.time) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    // Validate room selection for personal classes
    if (isPersonalClass() && !formData.room) {
      Alert.alert('Error', 'Please select a room for personal classes');
      return;
    }

    try {
      setSaving(true);

      // Check for instructor conflicts using the backend service
      const conflictResponse = await classService.checkInstructorConflict(
        formData.instructorId || '', // Keep as string for Supabase UUID
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
        // Update existing class
        const updateData: UpdateClassRequest = {
          name: formData.name,
          instructorId: parseInt(formData.instructorId),
          date: formData.date,
          time: formData.time,
          duration: formData.duration,
          // level: removed from schema
          category: formData.category,
          capacity: formData.capacity,
          equipment: equipmentArray,
          description: formData.description,
          equipmentType: formData.equipmentType,
          room: formData.room || '',
        };

        const response = await classService.updateClass(editingClass.id, updateData);
        
        if (response.success && response.data) {
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
              }
              
              if (timeChanged) {
                await notificationService.sendClassTimeChangeNotifications(
                  editingClass.id,
                  formData.name,
                  formData.date,
                  editingClass.time,
                  formData.time
                );
              }
            } catch (notificationError) {
              console.error('Notification error:', notificationError);
              // Don't block the main operation for notification errors
            }
          } else {
            console.log('⏰ [ADMIN] Class has already passed - skipping notifications for:', formData.name);
          }
          
          Alert.alert('Success', `Class updated successfully${formData.room ? ` in ${formData.room}` : ''}`);
          await loadClasses(); // Reload classes from backend
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
        // Create new class
        const createData: CreateClassRequest = {
          name: formData.name,
          instructorId: parseInt(formData.instructorId),
          date: formData.date,
          time: formData.time,
          duration: formData.duration,
          // level: removed from schema
          category: formData.category,
          capacity: formData.capacity,
          equipment: equipmentArray,
          description: formData.description,
          equipmentType: formData.equipmentType,
          room: formData.room || '',
        };

        const response = await classService.createClass(createData);
        
        if (response.success && response.data) {
          Alert.alert('Success', `Class created successfully${formData.room ? ` in ${formData.room}` : ''}`);
          await loadClasses(); // Reload classes from backend
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

  const handleDeleteClass = (classId: string) => {
    Alert.alert(
      'Delete Class',
      'Are you sure you want to delete this class? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await classService.deleteClass(classId);
              if (response.success) {
                // Cancel any scheduled reminder notifications for this class
                try {
                  await notificationService.cancelClassNotifications(Number(classId));
                  console.log('✅ Class reminder notifications cancelled for deleted class');
                } catch (notificationError) {
                  console.error('❌ Failed to cancel class notifications:', notificationError);
                  // Don't block the deletion for notification errors
                }
                
                Alert.alert('Success', 'Class deleted successfully');
                await loadClasses(); // Reload classes from backend
              } else {
                Alert.alert('Error', response.error || 'Failed to delete class');
              }
            } catch (error) {
              console.error('Error deleting class:', error);
              Alert.alert('Error', 'Failed to delete class');
            }
          }
        }
      ]
    );
  };

  const handleCancelClass = (classId: string) => {
    const classToCancel = classes.find(c => c.id === classId);
    
    Alert.alert(
      'Cancel Class',
      'Are you sure you want to cancel this class?',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes, Cancel', 
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await classService.cancelClass(classId);
              if (response.success && response.data && classToCancel) {
                // Send translated cancellation notification to enrolled students
                try {
                  await notificationService.sendClassCancellationNotifications(
                    classId,
                    classToCancel.name,
                    classToCancel.date,
                    classToCancel.time
                  );
                  
                  // Cancel any scheduled reminder notifications
                  await notificationService.cancelClassNotifications(Number(classId));
                } catch (notificationError) {
                  console.error('Notification error:', notificationError);
                  // Don't block the main operation for notification errors
                }
                
                Alert.alert('Success', 'Class cancelled successfully and students have been notified');
                await loadClasses(); // Reload classes from backend
              } else {
                Alert.alert('Error', response.error || 'Failed to cancel class');
              }
            } catch (error) {
              console.error('Error cancelling class:', error);
              Alert.alert('Error', 'Failed to cancel class');
            }
          }
        }
      ]
    );
  };

  // Helper function to calculate end time from start time and duration
  const calculateEndTime = (startTime: string, duration: number): string => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + duration;
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
  };

  // Group classes by date for calendar view
  const groupClassesByDate = (classes: BackendClass[]) => {
    const grouped: { [date: string]: BackendClass[] } = {};
    classes.forEach(class_ => {
      const date = class_.date;
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(class_);
    });
    
    // Sort dates and sort classes within each date by time
    Object.keys(grouped).forEach(date => {
      grouped[date].sort((a, b) => a.time.localeCompare(b.time));
    });
    
    return grouped;
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor }]}>
        <ActivityIndicator size="large" color={accentColor} />
        <Title style={[styles.loadingText, { color: textColor }]}>Loading classes...</Title>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={[styles.header, { backgroundColor: surfaceColor, borderBottomWidth: 1, borderBottomColor: textMutedColor }]}>
        <Title style={[styles.headerTitle, { color: textColor }]}>Class Management</Title>
        <Paragraph style={[styles.headerSubtitle, { color: textSecondaryColor }]}>Create and manage studio classes</Paragraph>
      </View>

      <View style={[styles.filtersContainer, { backgroundColor: surfaceColor }]}>
        <Searchbar
          placeholder="Search classes or instructors..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />

        <View style={styles.filterRow}>
          <SegmentedButtons
            value={viewMode}
            onValueChange={setViewMode}
            buttons={[
              { value: 'list', label: 'List', icon: 'view-list' },
              { value: 'calendar', label: 'Calendar', icon: 'calendar-month' },
            ]}
            style={[styles.viewModeButtons, { backgroundColor: 'transparent', borderColor: textMutedColor }]}
          />
        </View>

        <SegmentedButtons
          value={filterStatus}
          onValueChange={setFilterStatus}
          buttons={[
            { value: 'all', label: 'All' },
            { value: 'active', label: 'Active' },
            { value: 'full', label: 'Full' },
            { value: 'cancelled', label: 'Cancelled' },
          ]}
          style={[styles.segmentedButtons, { backgroundColor: 'transparent', borderColor: textMutedColor }]}
        />
      </View>

      <ScrollView style={styles.content}>
        {viewMode === 'calendar' ? (
          // Calendar View - Group by dates
          (() => {
            const groupedClasses = groupClassesByDate(filteredClasses);
            const sortedDates = Object.keys(groupedClasses).sort();

            if (sortedDates.length === 0) {
              return (
                <Card style={[styles.emptyCard, { backgroundColor: surfaceColor }]}>
                  <Card.Content style={styles.emptyContent}>
                    <MaterialIcons name="event-note" size={48} color={textMutedColor} />
                    <Title style={[styles.emptyTitle, { color: textSecondaryColor }]}>No classes found</Title>
                    <Paragraph style={[styles.emptyText, { color: textMutedColor }]}>
                      Create your first class or adjust your search filters.
                    </Paragraph>
                  </Card.Content>
                </Card>
              );
            }

            return (
              <>
                {sortedDates.map(date => (
                  <View key={date} style={styles.dateGroup}>
                    <View style={[styles.dateHeader, { backgroundColor: surfaceColor, borderColor: textMutedColor }]}>
                      <MaterialIcons name="calendar-today" size={20} color={accentColor} />
                      <Title style={[styles.dateTitle, { color: textColor }]}>
                        {formatDateForDisplay(date)}
                      </Title>
                      <Paragraph style={[styles.dateSubtitle, { color: textSecondaryColor }]}>
                        {groupedClasses[date].length} class{groupedClasses[date].length !== 1 ? 'es' : ''}
                      </Paragraph>
                    </View>
                    
                    {groupedClasses[date].map(class_ => (
                      <Card key={class_.id} style={[styles.classCard, { backgroundColor: surfaceColor, borderColor: textMutedColor }]}>
                        <Card.Content>
                          <View style={styles.classHeaderMobile}>
                            <View style={styles.classInfo}>
                              <Title style={[styles.className, { color: textColor }]}>{class_.name}</Title>
                              <Paragraph style={[styles.instructor, { color: accentColor }]}>with {class_.instructor_name}</Paragraph>
                              <Paragraph style={[styles.classDetails, { color: textSecondaryColor }]}>
                                {`${class_.time} • ${class_.duration}min`}
                              </Paragraph>
                            </View>
                            <View style={styles.classLabelsMobile}>
                              <Chip 
                                style={[styles.equipmentTypeChip, { backgroundColor: getEquipmentTypeColor(class_.equipment_type) }]}
                                textStyle={styles.chipText}
                              >
                                {class_.equipment_type === 'both' ? 'Hybrid' : class_.equipment_type}
                              </Chip>
                              <Chip 
                                style={[styles.statusChip, { backgroundColor: getStatusColor(class_.status) }]}
                                textStyle={styles.chipText}
                              >
                                {class_.status}
                              </Chip>
                              {/* Level chip removed - level field no longer exists */}
                            </View>
                          </View>

                          <View style={styles.enrollmentInfo}>
                            <Paragraph style={[styles.enrollment, { color: textColor }]}>
                              {`Enrollment: ${class_.enrolled}/${class_.capacity}`}
                            </Paragraph>
                            <Paragraph style={[styles.equipmentTypeInfo, { color: textSecondaryColor }]}>
                              Equipment: {class_.equipment_type === 'both' ? 'Mat + Reformer' : class_.equipment_type}
                            </Paragraph>
                          </View>

                          <View style={styles.equipmentInfo}>
                            <MaterialIcons name="sports-gymnastics" size={16} color={textSecondaryColor} />
                            <Paragraph style={[styles.equipmentText, { color: textSecondaryColor }]}>
                              {class_.equipment && Array.isArray(class_.equipment) ? class_.equipment.join(', ') : 'No equipment specified'}
                            </Paragraph>
                          </View>

                          <View style={styles.notificationIndicator}>
                            <MaterialIcons name="notifications" size={16} color={accentColor} />
                            <Paragraph style={[styles.notificationText, { color: textSecondaryColor }]}>
                              Reminder notifications enabled (5 min before)
                            </Paragraph>
                          </View>

                          {class_.description && (
                            <Paragraph style={[styles.description, { color: textSecondaryColor }]}>{class_.description}</Paragraph>
                          )}

                          <View style={styles.classActions}>
                            <IconButton
                              icon="pencil"
                              mode="outlined"
                              onPress={() => handleEditClass(class_)}
                            />
                            <IconButton
                              icon="cancel"
                              mode="outlined"
                              onPress={() => handleCancelClass(class_.id)}
                              disabled={class_.status === 'cancelled'}
                            />
                            <IconButton
                              icon="delete"
                              mode="outlined"
                              iconColor="#f44336"
                              onPress={() => handleDeleteClass(class_.id)}
                            />
                          </View>
                        </Card.Content>
                      </Card>
                    ))}
                  </View>
                ))}
              </>
            );
          })()
        ) : (
          // List View - Original layout
          <>
            {filteredClasses.map((class_) => (
              <Card key={class_.id} style={[styles.classCard, { backgroundColor: surfaceColor, borderColor: textMutedColor }]}>
                <Card.Content>
                  <View style={styles.classHeaderMobile}>
                    <View style={styles.classInfo}>
                      <Title style={[styles.className, { color: textColor }]}>{class_.name}</Title>
                      <Paragraph style={[styles.instructor, { color: accentColor }]}>with {class_.instructor_name}</Paragraph>
                      <Paragraph style={[styles.classDetails, { color: textSecondaryColor }]}>
                        {`${new Date(class_.date).toLocaleDateString()} • ${class_.time} • ${class_.duration}min`}
                      </Paragraph>
                    </View>
                    <View style={styles.classLabelsMobile}>
                      <Chip 
                        style={[styles.equipmentTypeChip, { backgroundColor: getEquipmentTypeColor(class_.equipment_type) }]}
                        textStyle={styles.chipText}
                      >
                        {class_.equipment_type === 'both' ? 'Hybrid' : class_.equipment_type}
                      </Chip>
                      <Chip 
                        style={[styles.statusChip, { backgroundColor: getStatusColor(class_.status) }]}
                        textStyle={styles.chipText}
                      >
                        {class_.status}
                      </Chip>
                      {/* Level chip removed - level field no longer exists */}
                    </View>
                  </View>

                  <View style={styles.enrollmentInfo}>
                    <Paragraph style={[styles.enrollment, { color: textColor }]}>
                      {`Enrollment: ${class_.enrolled}/${class_.capacity}`}
                    </Paragraph>
                    <Paragraph style={[styles.equipmentTypeInfo, { color: textSecondaryColor }]}>
                      Equipment: {class_.equipment_type === 'both' ? 'Mat + Reformer' : class_.equipment_type}
                    </Paragraph>
                  </View>

                  <View style={styles.equipmentInfo}>
                    <MaterialIcons name="sports-gymnastics" size={16} color={textSecondaryColor} />
                    <Paragraph style={[styles.equipmentText, { color: textSecondaryColor }]}>
                      {class_.equipment && Array.isArray(class_.equipment) ? class_.equipment.join(', ') : 'No equipment specified'}
                    </Paragraph>
                  </View>

                  <View style={styles.notificationIndicator}>
                    <MaterialIcons name="notifications" size={16} color={accentColor} />
                    <Paragraph style={[styles.notificationText, { color: textSecondaryColor }]}>
                      Reminder notifications enabled (5 min before)
                    </Paragraph>
                  </View>

                  {class_.description && (
                    <Paragraph style={[styles.description, { color: textSecondaryColor }]}>{class_.description}</Paragraph>
                  )}

                  <View style={styles.classActions}>
                    <IconButton
                      icon="pencil"
                      mode="outlined"
                      onPress={() => handleEditClass(class_)}
                    />
                    <IconButton
                      icon="cancel"
                      mode="outlined"
                      onPress={() => handleCancelClass(class_.id)}
                      disabled={class_.status === 'cancelled'}
                    />
                    <IconButton
                      icon="delete"
                      mode="outlined"
                      iconColor="#f44336"
                      onPress={() => handleDeleteClass(class_.id)}
                    />
                  </View>
                </Card.Content>
              </Card>
            ))}

            {filteredClasses.length === 0 && (
              <Card style={[styles.emptyCard, { backgroundColor: surfaceColor }]}>
                <Card.Content style={styles.emptyContent}>
                  <MaterialIcons name="event-note" size={48} color={textMutedColor} />
                  <Title style={[styles.emptyTitle, { color: textSecondaryColor }]}>No classes found</Title>
                  <Paragraph style={[styles.emptyText, { color: textMutedColor }]}>
                    Create your first class or adjust your search filters.
                  </Paragraph>
                </Card.Content>
              </Card>
            )}
          </>
        )}
      </ScrollView>

      <FAB
                      icon="add"
        style={[styles.fab, { backgroundColor: accentColor }]}
        onPress={handleCreateClass}
        label="New Class"
      />

      <Portal>
        <Modal visible={modalVisible} onDismiss={() => setModalVisible(false)} contentContainerStyle={[styles.modal, { backgroundColor: surfaceColor }]}>
          <ScrollView>
            <Title style={[styles.modalTitle, { color: textColor }]}>
              {editingClass ? 'Edit Class' : 'Create New Class'}
            </Title>

            <TextInput
              label="Class Name *"
              value={formData.name}
              onChangeText={(text) => setFormData({...formData, name: text})}
              mode="outlined"
              style={styles.input}
            />

            <View style={styles.pickerContainer}>
              <Paragraph style={styles.pickerLabel}>Instructor *</Paragraph>
              <Menu
                visible={instructorMenuVisible}
                onDismiss={() => setInstructorMenuVisible(false)}
                anchor={
                  <Button
                    mode="outlined"
                    onPress={() => setInstructorMenuVisible(true)}
                    style={styles.selectorButton}
                    contentStyle={styles.selectorButtonContent}
                    loading={loadingInstructors}
                  >
                    {formData.instructorName || 'Select Instructor'}
                  </Button>
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
                      onPress={() => selectInstructor(instructor)}
                      title={
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Paragraph style={{ flex: 1 }}>{instructor.name}</Paragraph>
                          {isChecking ? (
                            <ActivityIndicator size="small" />
                          ) : !isAvailable ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <MaterialIcons name="schedule" size={16} color="#f44336" />
                              <Caption style={{ color: '#f44336', marginLeft: 4 }}>
                                Busy {conflictClass?.time}
                              </Caption>
                            </View>
                          ) : (
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                              <Caption style={{ color: '#4CAF50', marginLeft: 4 }}>
                                Available
                              </Caption>
                            </View>
                          )}
                        </View>
                      }
                    />
                  );
                })}
              </Menu>
            </View>

            {/* Instructor Availability Indicator */}
            {formData.instructorId && formData.date && formData.time && (
              <View style={{
                marginTop: 8,
                padding: 8,
                backgroundColor: '#f5f5f5',
                borderRadius: 4,
                borderWidth: 1,
                borderColor: '#e0e0e0',
              }}>
                <Caption style={{ color: '#666', marginBottom: 4, fontSize: 12 }}>
                  {`Instructor Availability: ${formData.instructorName || 'N/A'} on ${formData.date || 'N/A'} at ${formData.time || 'N/A'}`}
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
            )}

            <View style={styles.dateTimeContainer}>
              <View style={styles.dateTimeSection}>
                <Paragraph style={styles.pickerLabel}>Class Date *</Paragraph>
                <TextInput
                  label="Date (YYYY-MM-DD)"
                  value={formData.date}
                  onChangeText={(text) => setFormData({...formData, date: text})}
                  mode="outlined"
                  placeholder="2024-12-25"
                  style={styles.dateTimeInput}
                  left={<TextInput.Icon icon="calendar-today" />}
                />
                {formData.date && (
                  <Paragraph style={styles.dateTimePreview}>
                    📅 {formatDateForDisplay(formData.date)}
                  </Paragraph>
                )}
              </View>

              <View style={styles.dateTimeSection}>
                <Paragraph style={styles.pickerLabel}>Start Time *</Paragraph>
                <TextInput
                  label="Time (HH:MM)"
                  value={formData.time}
                  onChangeText={(text) => setFormData({...formData, time: text})}
                  mode="outlined"
                  placeholder="14:30"
                  style={styles.dateTimeInput}
                  left={<TextInput.Icon icon="access-time" />}
                />
                {formData.time && (
                  <Paragraph style={styles.dateTimePreview}>
                    🕐 {formatTimeForDisplay(formData.time)}
                    {formData.duration && ` - ${calculateEndTime(formData.time, formData.duration)} (${formData.duration} min)`}
                  </Paragraph>
                )}
              </View>
            </View>

            <View style={styles.numberInputContainer}>
              <View style={styles.numberInputSection}>
                <TextInput
                  label="Duration (minutes) *"
                  value={formData.duration ? String(formData.duration) : ''}
                  onChangeText={(text) => setFormData({...formData, duration: text ? parseInt(text) : undefined})}
                  mode="outlined"
                  keyboardType="numeric"
                  style={styles.numberInput}
                  left={<TextInput.Icon icon="timer" />}
                />
              </View>

              <View style={styles.numberInputSection}>
                <TextInput
                  label="Capacity *"
                  value={formData.capacity ? String(formData.capacity) : ''}
                  onChangeText={(text) => setFormData({...formData, capacity: text ? parseInt(text) : undefined})}
                  mode="outlined"
                  keyboardType="numeric"
                  style={styles.numberInput}
                  left={<TextInput.Icon icon="account-group" />}
                />
              </View>
            </View>

            {/* Level selection removed - level field no longer exists in schema */}

            <View style={styles.segmentedContainer}>
              <Paragraph style={styles.pickerLabel}>Category *</Paragraph>
              <SegmentedButtons
                value={formData.category}
                onValueChange={(value) => {
                  const newCategory = value as 'personal' | 'group';
                  setFormData({
                    ...formData, 
                    category: newCategory,
                    // Only suggest capacity if switching TO personal and current capacity is unrealistic
                    // Allow manual override for any capacity
                    capacity: newCategory === 'personal' && formData.capacity > 10 ? 1 : formData.capacity
                  });
                }}
                buttons={[
                  { value: 'group', label: 'Group Class' },
                  { value: 'personal', label: 'Personal Session' },
                ]}
                style={styles.segmentedButtons}
              />
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputColumn}>
                <TextInput
                  label="Capacity *"
                  value={formData.capacity ? String(formData.capacity) : ''}
                  onChangeText={(text) => {
                    setFormData({...formData, capacity: text ? parseInt(text) : undefined});
                  }}
                  mode="outlined"
                  keyboardType="numeric"
                  style={styles.input}
                />
                <Paragraph style={styles.helperText}>
                  {formData.category === 'personal' ? 
                    'Personal sessions: 1 (private), 2 (couple), 3 (trio)' : 
                    'Group classes: typically 8-15 people'
                  }
                </Paragraph>
              </View>
              <View style={styles.inputColumn}>
                <TextInput
                  label="Duration (minutes) *"
                  value={formData.duration ? String(formData.duration) : ''}
                  onChangeText={(text) => {
                    setFormData({...formData, duration: text ? parseInt(text) : undefined});
                  }}
                  mode="outlined"
                  keyboardType="numeric"
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.segmentedContainer}>
              <Paragraph style={styles.pickerLabel}>Equipment Type *</Paragraph>
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
              <Paragraph style={styles.pickerLabel}>Room *</Paragraph>
              <SegmentedButtons
                value={formData.room}
                onValueChange={(value) => setFormData({...formData, room: value})}
                buttons={[
                  { value: 'Reformer Room', label: 'Reformer' },
                  { value: 'Mat Room', label: 'Mat' },
                  { value: 'Cadillac Room', label: 'Cadillac' },
                  { value: 'Wall Room', label: 'Wall' },
                ]}
                style={styles.segmentedButtons}
              />
            </View>

            <TextInput
              label="Equipment Required"
              value={formData.equipment}
              onChangeText={(text) => setFormData({...formData, equipment: text})}
              mode="outlined"
              placeholder="e.g., Mat, Resistance Bands, Weights"
              style={styles.input}
            />

            <TextInput
              label="Class Description"
              value={formData.description}
              onChangeText={(text) => setFormData({...formData, description: text})}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={styles.input}
            />

            <View style={styles.modalActions}>
              <Button mode="outlined" onPress={() => setModalVisible(false)} disabled={saving}>
                Cancel
              </Button>
              <Button mode="contained" onPress={handleSaveClass} loading={saving} disabled={saving}>
                {editingClass ? 'Update Class' : 'Create Class'}
              </Button>
            </View>
          </ScrollView>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor will be overridden by inline style
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 20,
    // color will be overridden by inline style
  },
  header: {
    padding: 20,
    paddingTop: 60,
    // backgroundColor will be overridden by inline style
  },
  headerTitle: {
    // color will be overridden by inline style
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    // color will be overridden by inline style
    marginTop: 5,
  },
  filtersContainer: {
    padding: 15,
    // backgroundColor will be overridden by inline style
  },
  searchbar: {
    marginBottom: 15,
  },
  segmentedButtons: {
    marginBottom: 5,
  },
  filterRow: {
    marginBottom: 15,
  },
  viewModeButtons: {
    marginBottom: 5,
  },
  dateGroup: {
    marginBottom: 20,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    gap: 10,
  },
  dateTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  dateSubtitle: {
    fontSize: 14,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  classCard: {
    marginBottom: 15,
    elevation: 3,
    borderRadius: 12,
    borderWidth: 1,
    // backgroundColor and borderColor will be overridden by inline style
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  classHeaderMobile: {
    flexDirection: 'column',
    marginBottom: 15,
  },
  classInfo: {
    flex: 1,
  },
  className: {
    fontSize: 18,
    marginBottom: 5,
    // color will be overridden by inline style
  },
  instructor: {
    // color will be overridden by inline style
    fontWeight: '500',
    marginBottom: 5,
  },
  classDetails: {
    // color will be overridden by inline style
    fontSize: 14,
  },
  classLabels: {
    alignItems: 'flex-end',
  },
  classLabelsMobile: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  equipmentTypeChip: {
    marginBottom: 5,
  },
  statusChip: {
    marginBottom: 5,
  },
  // levelChip styles removed - level field no longer exists
  chipText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '500',
  },
  enrollmentInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  enrollment: {
    // color will be overridden by inline style
    fontWeight: '500',
  },
  equipmentTypeInfo: {
    // color will be overridden by inline style
    fontSize: 14,
  },
  equipmentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  equipmentText: {
    marginLeft: 5,
    color: '#666',
    fontSize: 14,
  },
  notificationIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  notificationText: {
    marginLeft: 5,
    color: '#666',
    fontSize: 14,
  },
  description: {
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 15,
    lineHeight: 20,
  },
  classActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  emptyCard: {
    marginTop: 50,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyTitle: {
    marginTop: 15,
    marginBottom: 10,
    // color will be overridden by inline style
  },
  emptyText: {
    textAlign: 'center',
    // color will be overridden by inline style
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    // backgroundColor will be overridden by inline style
  },
  modal: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 12,
    maxHeight: '90%',
  },
  modalTitle: {
    marginBottom: 25,
    textAlign: 'center',
    // color will be overridden by inline style
  },
  input: {
    marginBottom: 20,
  },
  pickerContainer: {
    marginBottom: 20,
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    // color will be overridden by inline style
  },
  selectorButton: {
    justifyContent: 'flex-start',
  },
  selectorButtonContent: {
    justifyContent: 'flex-start',
  },
  dateTimeContainer: {
    flexDirection: 'column',
    marginBottom: 20,
    gap: 15,
  },
  dateTimeSection: {
    flex: 1,
  },
  dateTimeInput: {
    marginBottom: 0,
  },
  dateTimePreview: {
    color: '#666',
    fontSize: 12,
  },
  numberInputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 15,
  },
  numberInputSection: {
    flex: 0.48,
  },
  numberInput: {
    marginBottom: 0,
  },
  segmentedContainer: {
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 25,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  roomHint: {
    color: '#666',
    fontSize: 12,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 15,
  },
  inputColumn: {
    flex: 1,
  },
  helperText: {
    color: '#666',
    fontSize: 12,
    marginTop: 5,
  },
});

export default AdminClassManagement; 