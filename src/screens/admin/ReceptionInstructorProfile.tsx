import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { Alert, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  ActivityIndicator,
  Avatar,
  Button,
  Caption,
  Card,
  Chip,
  DataTable,
  IconButton,
  Modal,
  Paragraph,
  Portal,
  Surface,
  Title
} from 'react-native-paper';
import WebCompatibleIcon from '../../components/WebCompatibleIcon';
import { supabase } from '../../config/supabase.config';
import { bookingService } from '../../services/bookingService';
import { classService } from '../../services/classService';
import { instructorClientService } from '../../services/instructorClientService';
import { userService } from '../../services/userService';

const { width: screenWidth } = Dimensions.get('window');
const isLargeScreen = screenWidth > 1024;

interface InstructorStats {
  totalClasses: number;
  totalStudents: number;
  thisMonthClasses: number;
  avgAttendance: number;
  upcomingClasses: number;
  totalRevenue: number;
  thisMonthRevenue: number;
  privateClassHours: number;
  groupClassHours: number;
  privateClassesCount: number;
  groupClassesCount: number;
  totalClients: number;
  hasProfilePicture: boolean;
}

interface InstructorAssignment {
  id: string;
  client_id: string;
  client_name: string;
  assigned_date: string;
  status: string;
  notes?: string;
}

interface ClassSchedule {
  id: string;
  name: string;
  date: string;
  time: string;
  duration: number;
  max_capacity: number;
  current_bookings: number;
  status: string;
  type: 'private' | 'group';
}

interface BookingData {
  id: string;
  class_name: string;
  class_date: string;
  class_time: string;
  user_name: string;
  status: string;
}

interface ClassData {
  id: string;
  name: string;
  date: string;
  time: string;
  duration: number;
  max_capacity: number;
  current_bookings: number;
  status: string;
  is_private: boolean;
}

type TabType = 'overview' | 'classes' | 'bookings' | 'clients' | 'activity' | 'profile';

function ReceptionInstructorProfile() {
  const navigation = useNavigation();
  const route = useRoute();
  const { userId, userName } = route.params as { userId: string; userName: string };
  
  const [instructor, setInstructor] = useState<any>(null);
  const [stats, setStats] = useState<InstructorStats>({
    totalClasses: 0,
    totalStudents: 0,
    thisMonthClasses: 0,
    avgAttendance: 0,
    upcomingClasses: 0,
    totalRevenue: 0,
    thisMonthRevenue: 0,
    privateClassHours: 0,
    groupClassHours: 0,
    privateClassesCount: 0,
    groupClassesCount: 0,
    totalClients: 0,
    hasProfilePicture: false
  });
  const [assignments, setAssignments] = useState<InstructorAssignment[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [assignmentNotes, setAssignmentNotes] = useState('');

  const updateStatsWithRealData = () => {
    console.log('🔄 Updating stats with real data:', {
      assignmentsCount: assignments.length,
      classesCount: classes.length
    });
    
    setStats(prevStats => {
      const upcomingClassesCount = classes.filter(cls => new Date(cls.date) >= new Date()).length;
      const privateClasses = classes.filter(cls => cls.is_private);
      const groupClasses = classes.filter(cls => !cls.is_private);
      
      const privateHours = privateClasses.reduce((total, cls) => total + (cls.duration / 60), 0);
      const groupHours = groupClasses.reduce((total, cls) => total + (cls.duration / 60), 0);
      
      const updatedStats = {
        ...prevStats,
        totalClasses: classes.length,
        totalClients: assignments.length,
        upcomingClasses: upcomingClassesCount,
        privateClassesCount: privateClasses.length,
        groupClassesCount: groupClasses.length,
        privateClassHours: Math.round(privateHours * 10) / 10,
        groupClassHours: Math.round(groupHours * 10) / 10
      };
      
      console.log('📊 Updated stats:', updatedStats);
      return updatedStats;
    });
  };

  // Update stats when assignments or classes change
  useEffect(() => {
    if (assignments.length > 0 || classes.length > 0) {
      console.log('🔄 Triggering stats update due to data change');
      updateStatsWithRealData();
    }
  }, [assignments, classes]);

  useEffect(() => {
    loadInstructorData();
  }, [userId]);

  const loadInstructorData = async () => {
    try {
      setLoading(true);
      
      // Load instructor details
      const instructorResponse = await userService.getUserById(userId);
      if (instructorResponse.success && instructorResponse.data) {
        setInstructor(instructorResponse.data);
      }

      // Load instructor stats and data in parallel
      await Promise.all([
        loadInstructorStats(),
        loadInstructorAssignments(),
        loadInstructorClasses(),
        loadInstructorBookings()
      ]);

      // Stats will be updated automatically via useEffect when data loads
      console.log('✅ All instructor data loaded successfully');
    } catch (error) {
      console.error('Error loading instructor data:', error);
      Alert.alert('Error', 'Failed to load instructor data');
    } finally {
      setLoading(false);
    }
  };

  const loadInstructorStats = async () => {
    try {
      // Get instructor's classes
      const classResponse = await classService.getClasses({
        instructor: userId,
        status: 'active'
      });

      if (classResponse.success && classResponse.data) {
        const allClasses = classResponse.data;
        const currentDate = new Date();
        const today = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
        
        // Calculate this month's classes
        const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const thisMonthClasses = allClasses.filter((classItem: any) => {
          const classDate = new Date(classItem.date);
          return classDate >= firstDayOfMonth && classDate < today;
        });

        // Calculate upcoming classes
        const upcomingClasses = allClasses.filter((classItem: any) => {
          const classDate = new Date(classItem.date);
          return classDate >= today;
        });

        // Calculate average attendance
        let totalAttendance = 0;
        let classesWithBookings = 0;

        for (const classItem of allClasses) {
          try {
            const attendeesResponse = await bookingService.getClassAttendees(classItem.id);
            if (attendeesResponse.success && attendeesResponse.data) {
              totalAttendance += attendeesResponse.data.length;
              classesWithBookings++;
            }
          } catch (error) {
            console.error(`Error loading attendees for class ${classItem.id}:`, error);
          }
        }

        const avgAttendance = classesWithBookings > 0 ? totalAttendance / classesWithBookings : 0;

        // Get unique students count
        const uniqueStudents = new Set();
        for (const classItem of allClasses) {
          try {
            const attendeesResponse = await bookingService.getClassAttendees(classItem.id);
            if (attendeesResponse.success && attendeesResponse.data) {
              attendeesResponse.data.forEach((attendee: any) => {
                uniqueStudents.add(attendee.user_id);
              });
            }
          } catch (error) {
            console.error(`Error loading attendees for class ${classItem.id}:`, error);
          }
        }

        // Calculate private vs group class statistics
        const privateClasses = allClasses.filter((classItem: any) => classItem.type === 'private' || classItem.max_capacity === 1);
        const groupClasses = allClasses.filter((classItem: any) => classItem.type === 'group' || classItem.max_capacity > 1);
        
        const privateClassHours = privateClasses.reduce((total: number, classItem: any) => {
          return total + (classItem.duration || 60) / 60; // Convert minutes to hours
        }, 0);
        
        const groupClassHours = groupClasses.reduce((total: number, classItem: any) => {
          return total + (classItem.duration || 60) / 60; // Convert minutes to hours
        }, 0);

        // Check if instructor has profile picture
        const hasProfilePicture = instructor?.profile_picture_url && instructor.profile_picture_url.trim() !== '';

        // Set initial stats from class data
        const initialStats = {
          totalClasses: allClasses.length,
          totalStudents: uniqueStudents.size,
          thisMonthClasses: thisMonthClasses.length,
          avgAttendance: Math.round(avgAttendance),
          upcomingClasses: upcomingClasses.length,
          totalRevenue: 0, // TODO: Calculate revenue from bookings
          thisMonthRevenue: 0, // TODO: Calculate this month's revenue
          privateClassHours: Math.round(privateClassHours * 10) / 10,
          groupClassHours: Math.round(groupClassHours * 10) / 10,
          privateClassesCount: privateClasses.length,
          groupClassesCount: groupClasses.length,
          totalClients: 0, // Will be updated when assignments load
          hasProfilePicture: hasProfilePicture || false
        };

        console.log('📊 Setting initial stats from class data:', initialStats);
        setStats(initialStats);
      }
    } catch (error) {
      console.error('Error loading instructor stats:', error);
    }
  };

  const loadInstructorAssignments = async () => {
    try {
      console.log('🔍 Loading instructor assignments for:', userId);
      
      // First try to get assignments from instructorClientService
      const response = await instructorClientService.getInstructorClients(userId);
      if (response.success && response.data && response.data.length > 0) {
        console.log('✅ Found instructor clients:', response.data);
        const formattedAssignments = response.data.map((client: any) => ({
          id: `assignment-${client.id}`,
          client_id: client.id,
          client_name: client.name || client.first_name + ' ' + client.last_name || 'Unknown Client',
          assigned_date: new Date().toISOString(), // Default to now since we don't have this data
          status: 'active',
          notes: ''
        }));
        setAssignments(formattedAssignments);
      } else {
        // Fallback: Try to get all client bookings for this instructor's classes
        console.log('📝 No direct assignments found, checking class bookings...');
        
        // Get all classes for this instructor
        const classResponse = await classService.getClasses({
          instructor: userId,
          status: 'active'
        });
        
        if (classResponse.success && classResponse.data) {
          const classIds = classResponse.data.map((cls: any) => cls.id);
          
          // Get unique clients who have booked this instructor's classes
          const { data: bookings, error } = await supabase
            .from('bookings')
            .select(`
              user_id,
              users!inner(id, name, email)
            `)
            .in('class_id', classIds)
            .eq('status', 'confirmed');
          
          if (!error && bookings) {
            // Get unique clients
            const uniqueClients = new Map();
            bookings.forEach((booking: any) => {
              if (booking.users && !uniqueClients.has(booking.user_id)) {
                uniqueClients.set(booking.user_id, booking.users);
              }
            });
            
            const formattedAssignments = Array.from(uniqueClients.values()).map((client: any) => ({
              id: `booking-client-${client.id}`,
              client_id: client.id,
              client_name: client.name || 'Unknown Client',
              assigned_date: new Date().toISOString(),
              status: 'active (via bookings)',
              notes: 'Client found through class bookings'
            }));
            
            console.log('✅ Found clients through bookings:', formattedAssignments);
            setAssignments(formattedAssignments);
          } else {
            console.log('❌ No bookings found for instructor classes');
            setAssignments([]);
          }
        } else {
          console.log('❌ No classes found for instructor');
          setAssignments([]);
        }
      }
    } catch (error) {
      console.error('Error loading instructor assignments:', error);
      setAssignments([]);
    }
  };

  const loadInstructorClasses = async () => {
    try {
      const classResponse = await classService.getClasses({
        instructor: userId,
        status: 'active'
      });

      if (classResponse.success && classResponse.data) {
        // Get real booking counts for each class
        const classesWithBookings = await Promise.all(
          classResponse.data.map(async (classItem: any) => {
            try {
              // Get booking count for this class
              const attendeesResponse = await bookingService.getClassAttendees(classItem.id);
              const currentBookings = attendeesResponse.success && attendeesResponse.data 
                ? attendeesResponse.data.length 
                : 0;

              return {
                id: classItem.id,
                name: classItem.name,
                date: classItem.date,
                time: classItem.time,
                duration: classItem.duration || 60,
                max_capacity: classItem.max_capacity || 10,
                current_bookings: currentBookings,
                status: classItem.status,
                is_private: classItem.max_capacity === 1 || classItem.type === 'private'
              };
            } catch (error) {
              console.error(`Error loading bookings for class ${classItem.id}:`, error);
              return {
                id: classItem.id,
                name: classItem.name,
                date: classItem.date,
                time: classItem.time,
                duration: classItem.duration || 60,
                max_capacity: classItem.max_capacity || 10,
                current_bookings: 0,
                status: classItem.status,
                is_private: classItem.max_capacity === 1 || classItem.type === 'private'
              };
            }
          })
        );
        
        setClasses(classesWithBookings);
      }
    } catch (error) {
      console.error('Error loading instructor classes:', error);
    }
  };

  const loadInstructorBookings = async () => {
    try {
      // Get bookings from existing bookings table
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          classes(name, date, time),
          users(name)
        `)
        .eq('classes.instructor_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading instructor bookings:', error);
        return;
      }

      const formattedBookings = data?.map((booking: any) => ({
        id: booking.id,
        class_name: booking.classes?.name || 'Unknown Class',
        class_date: booking.classes?.date || '',
        class_time: booking.classes?.time || '',
        user_name: booking.users?.name || 'Unknown User',
        status: booking.status
      })) || [];

      setBookings(formattedBookings);
    } catch (error) {
      console.error('Error loading instructor bookings:', error);
    }
  };


  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'dashboard' },
    { id: 'classes', label: 'Classes', icon: 'fitness-center' },
    { id: 'bookings', label: 'Bookings', icon: 'calendar-today' },
    { id: 'clients', label: 'Clients', icon: 'group' },
    { id: 'activity', label: 'Activity', icon: 'timeline' },
    { id: 'profile', label: 'Profile', icon: 'person' }
  ];

  const renderTabBar = () => {
    if (!isLargeScreen) return null;
    
    return (
      <Surface style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tabButton,
              activeTab === tab.id && styles.tabButtonActive
            ]}
            onPress={() => setActiveTab(tab.id as TabType)}
          >
            <WebCompatibleIcon 
              name={tab.icon} 
              size={20} 
              color={activeTab === tab.id ? '#6B8E7F' : '#666'} 
            />
            <Text style={[
              styles.tabButtonText,
              activeTab === tab.id && styles.tabButtonTextActive
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </Surface>
    );
  };

  const handleAssignClient = async () => {
    if (!selectedClient) return;

    try {
      const response = await instructorClientService.assignClientToInstructor(
        selectedClient.id,
        userId,
        assignmentNotes
      );

      if (response.success) {
        Alert.alert('Success', 'Client assigned to instructor successfully');
        setShowAssignmentModal(false);
        setSelectedClient(null);
        setAssignmentNotes('');
        loadInstructorAssignments();
      } else {
        Alert.alert('Error', response.error || 'Failed to assign client');
      }
    } catch (error) {
      console.error('Error assigning client:', error);
      Alert.alert('Error', 'Failed to assign client');
    }
  };

  const handleUnassignClient = async (assignmentId: string) => {
    Alert.alert(
      'Unassign Client',
      'Are you sure you want to unassign this client from the instructor?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unassign',
          style: 'destructive',
          onPress: async () => {
            try {
              // Find the assignment to get client and instructor IDs
              const assignment = assignments.find(a => a.id === assignmentId);
              if (!assignment) {
                Alert.alert('Error', 'Assignment not found');
                return;
              }
              
              const response = await instructorClientService.unassignClientFromInstructor(
                assignment.client_id,
                userId,
                'reception_user', // TODO: Get actual current user ID
                'Unassigned by reception staff'
              );
              if (response.success) {
                Alert.alert('Success', 'Client unassigned successfully');
                loadInstructorAssignments();
              } else {
                Alert.alert('Error', response.error || 'Failed to unassign client');
              }
            } catch (error) {
              console.error('Error unassigning client:', error);
              Alert.alert('Error', 'Failed to unassign client');
            }
          }
        }
      ]
    );
  };

  const renderOverviewTab = () => (
    <View style={styles.tabContent}>
      {/* Stats Grid */}
      <View style={isLargeScreen ? styles.statsGrid : styles.statsContainer}>
        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <WebCompatibleIcon name="fitness-center" size={32} color="#6B8E7F" />
            <Title style={styles.statNumber}>{stats.totalClasses}</Title>
            <Caption style={styles.statLabel}>Total Classes</Caption>
          </Card.Content>
        </Card>
        
        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <WebCompatibleIcon name="group" size={32} color="#6B8E7F" />
            <Title style={styles.statNumber}>{stats.totalClients}</Title>
            <Caption style={styles.statLabel}>Total Clients</Caption>
          </Card.Content>
        </Card>
        
        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <WebCompatibleIcon name="person" size={32} color="#1976D2" />
            <Title style={styles.statNumber}>{stats.privateClassesCount}</Title>
            <Caption style={styles.statLabel}>Private Classes</Caption>
          </Card.Content>
        </Card>
        
        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <WebCompatibleIcon name="group-work" size={32} color="#4CAF50" />
            <Title style={styles.statNumber}>{stats.groupClassesCount}</Title>
            <Caption style={styles.statLabel}>Group Classes</Caption>
          </Card.Content>
        </Card>
        
        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <WebCompatibleIcon name="schedule" size={32} color="#FF9800" />
            <Title style={styles.statNumber}>{stats.privateClassHours}h</Title>
            <Caption style={styles.statLabel}>Private Hours</Caption>
          </Card.Content>
        </Card>
        
        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <WebCompatibleIcon name="schedule" size={32} color="#9C27B0" />
            <Title style={styles.statNumber}>{stats.groupClassHours}h</Title>
            <Caption style={styles.statLabel}>Group Hours</Caption>
          </Card.Content>
        </Card>
      </View>
    </View>
  );

  const renderClassesTab = () => (
    <View style={styles.tabContent}>
      <Card style={styles.dataCard}>
        <Card.Content>
          <Title style={styles.sectionTitle}>Instructor Classes</Title>
          <DataTable>
            <DataTable.Header>
              <DataTable.Title>Class Name</DataTable.Title>
              <DataTable.Title>Date</DataTable.Title>
              <DataTable.Title>Time</DataTable.Title>
              <DataTable.Title>Type</DataTable.Title>
              <DataTable.Title>Capacity</DataTable.Title>
              <DataTable.Title>Status</DataTable.Title>
            </DataTable.Header>
            
            {classes.map((classItem) => (
              <DataTable.Row key={classItem.id}>
                <DataTable.Cell>{classItem.name}</DataTable.Cell>
                <DataTable.Cell>{new Date(classItem.date).toLocaleDateString()}</DataTable.Cell>
                <DataTable.Cell>{classItem.time}</DataTable.Cell>
                <DataTable.Cell>
                  <Chip 
                    mode="outlined" 
                    style={classItem.is_private ? styles.privateChip : styles.groupChip}
                    textStyle={classItem.is_private ? styles.privateChipText : styles.groupChipText}
                  >
                    {classItem.is_private ? 'Private' : 'Group'}
                  </Chip>
                </DataTable.Cell>
                <DataTable.Cell>{classItem.current_bookings}/{classItem.max_capacity}</DataTable.Cell>
                <DataTable.Cell>
                  <Chip mode="outlined" style={styles.statusChip}>
                    {classItem.status}
                  </Chip>
                </DataTable.Cell>
              </DataTable.Row>
            ))}
          </DataTable>
        </Card.Content>
      </Card>
    </View>
  );

  const renderBookingsTab = () => (
    <View style={styles.tabContent}>
      <Card style={styles.dataCard}>
        <Card.Content>
          <Title style={styles.sectionTitle}>Class Bookings</Title>
          <DataTable>
            <DataTable.Header>
              <DataTable.Title>Class</DataTable.Title>
              <DataTable.Title>Client</DataTable.Title>
              <DataTable.Title>Date</DataTable.Title>
              <DataTable.Title>Time</DataTable.Title>
              <DataTable.Title>Status</DataTable.Title>
            </DataTable.Header>
            
            {bookings.map((booking) => (
              <DataTable.Row key={booking.id}>
                <DataTable.Cell>{booking.class_name}</DataTable.Cell>
                <DataTable.Cell>{booking.user_name}</DataTable.Cell>
                <DataTable.Cell>{new Date(booking.class_date).toLocaleDateString()}</DataTable.Cell>
                <DataTable.Cell>{booking.class_time}</DataTable.Cell>
                <DataTable.Cell>
                  <Chip mode="outlined" style={styles.statusChip}>
                    {booking.status}
                  </Chip>
                </DataTable.Cell>
              </DataTable.Row>
            ))}
          </DataTable>
        </Card.Content>
      </Card>
    </View>
  );

  const renderClientsTab = () => (
    <View style={styles.tabContent}>
      <Card style={styles.dataCard}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Title style={styles.sectionTitle}>Assigned Clients</Title>
            <Button 
              mode="contained" 
              onPress={() => setShowAssignmentModal(true)}
              style={styles.assignButton}
            >
              Assign Client
            </Button>
          </View>
          
          <DataTable>
            <DataTable.Header>
              <DataTable.Title>Client Name</DataTable.Title>
              <DataTable.Title>Assigned Date</DataTable.Title>
              <DataTable.Title>Status</DataTable.Title>
              <DataTable.Title>Actions</DataTable.Title>
            </DataTable.Header>
            
            {assignments.map((assignment) => (
              <DataTable.Row key={assignment.id}>
                <DataTable.Cell>{assignment.client_name}</DataTable.Cell>
                <DataTable.Cell>{new Date(assignment.assigned_date).toLocaleDateString()}</DataTable.Cell>
                <DataTable.Cell>
                  <Chip mode="outlined" style={styles.statusChip}>
                    {assignment.status}
                  </Chip>
                </DataTable.Cell>
                <DataTable.Cell>
                  <Button
                    mode="outlined"
                    onPress={() => handleUnassignClient(assignment.id)}
                    style={styles.unassignButton}
                  >
                    Unassign
                  </Button>
                </DataTable.Cell>
              </DataTable.Row>
            ))}
          </DataTable>
        </Card.Content>
      </Card>
    </View>
  );

  const renderActivityTab = () => {
    // Generate meaningful activities (different from overview data)
    const activities: any[] = [];
    
    // Activity 1: Profile picture status
    if (instructor) {
      const hasProfilePic = instructor.profile_picture_url && instructor.profile_picture_url.trim() !== '';
      activities.push({
        id: `profile-pic-${instructor.id}`,
        type: 'profile_update',
        description: hasProfilePic 
          ? `✅ Profile picture uploaded` 
          : `❌ No profile picture uploaded`,
        timestamp: instructor.updated_at || instructor.created_at,
        icon: hasProfilePic ? 'account-circle' : 'account-circle-outline',
        color: hasProfilePic ? '#4CAF50' : '#FF9800'
      });
    }
    
    // Activity 2: Client assignment status
    if (assignments.length > 0) {
      activities.push({
        id: `clients-assigned`,
        type: 'client_management',
        description: `👥 Has ${assignments.length} assigned clients`,
        timestamp: new Date().toISOString(),
        icon: 'account-group',
        color: '#2196F3'
      });
      
      // Show recent client activities (last 5 clients)
      assignments.slice(0, 5).forEach((assignment, index) => {
        activities.push({
          id: `client-${assignment.client_id}-${index}`,
          type: 'client_assignment',
          description: `👤 Managing client: ${assignment.client_name}`,
          timestamp: assignment.assigned_date,
          icon: 'account-plus',
          color: '#4CAF50'
        });
      });
    } else {
      activities.push({
        id: `no-clients`,
        type: 'client_management',
        description: `❌ No clients currently assigned`,
        timestamp: new Date().toISOString(),
        icon: 'account-remove',
        color: '#FF5722'
      });
    }
    
    // Activity 3: Class creation activity
    if (classes.length > 0) {
      const privateCount = classes.filter(cls => cls.is_private).length;
      const groupCount = classes.filter(cls => !cls.is_private).length;
      
      activities.push({
        id: `class-creation-summary`,
        type: 'class_management',
        description: `📚 Created ${classes.length} classes (${privateCount} private, ${groupCount} group)`,
        timestamp: new Date().toISOString(),
        icon: 'book-plus',
        color: '#9C27B0'
      });
      
      // Show recent class creation activities
      classes.slice(0, 3).forEach((classItem, index) => {
        activities.push({
          id: `class-created-${classItem.id}-${index}`,
          type: 'class_created',
          description: `📝 Created ${classItem.is_private ? 'private' : 'group'} class: "${classItem.name}"`,
          timestamp: classItem.created_at || classItem.date,
          icon: classItem.is_private ? 'account' : 'account-group',
          color: classItem.is_private ? '#1976D2' : '#4CAF50'
        });
      });
    } else {
      activities.push({
        id: `no-classes`,
        type: 'class_management',
        description: `❌ No classes created yet`,
        timestamp: new Date().toISOString(),
        icon: 'book-remove',
        color: '#FF5722'
      });
    }
    
    // Activity 4: Booking activity summary
    if (bookings.length > 0) {
      const recentBookings = bookings.filter(booking => {
        const bookingDate = new Date(booking.class_date);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return bookingDate >= weekAgo;
      });
      
      activities.push({
        id: `booking-activity`,
        type: 'booking_activity',
        description: `📅 ${recentBookings.length} bookings in the last 7 days`,
        timestamp: new Date().toISOString(),
        icon: 'calendar-check',
        color: '#FF9800'
      });
    }
    
    // Activity 5: Account creation
    if (instructor) {
      activities.push({
        id: `account-created`,
        type: 'account_creation',
        description: `🎯 Instructor account created`,
        timestamp: instructor.created_at,
        icon: 'account-star',
        color: '#E91E63'
      });
    }
    
    // Sort by timestamp (most recent first)
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return (
      <View style={styles.tabContent}>
        <Card style={styles.dataCard}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Recent Instructor Activity</Title>
            <Paragraph style={styles.sectionSubtitle}>
              Key actions and status updates for this instructor
            </Paragraph>
            
            {activities.length > 0 ? (
              activities.map((activity) => (
                <View key={activity.id} style={styles.activityItem}>
                  <View style={[styles.activityIconContainer, { backgroundColor: `${activity.color}20` }]}>
                    <WebCompatibleIcon 
                      name={activity.icon} 
                      size={20} 
                      color={activity.color} 
                    />
                  </View>
                  <View style={styles.activityContent}>
                    <Paragraph style={styles.activityDescription}>
                      {activity.description}
                    </Paragraph>
                    <Caption style={styles.activityTime}>
                      {new Date(activity.timestamp).toLocaleDateString()} - {formatTimeAgo(activity.timestamp)}
                    </Caption>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <WebCompatibleIcon name="timeline" size={48} color="#CCCCCC" />
                <Paragraph style={styles.emptyText}>No recent activity</Paragraph>
              </View>
            )}
          </Card.Content>
        </Card>
      </View>
    );
  };

  const renderProfileTab = () => (
    <View style={styles.tabContent}>
      <Card style={styles.dataCard}>
        <Card.Content>
          <Title style={styles.sectionTitle}>Instructor Profile</Title>
          <View style={styles.profileSection}>
            <Avatar.Text 
              size={120} 
              label={instructor?.name?.charAt(0) || 'I'} 
              style={styles.profileAvatar}
            />
            <View style={styles.profileInfo}>
              <Title style={styles.profileName}>{instructor?.name}</Title>
              <Paragraph style={styles.profileEmail}>{instructor?.email}</Paragraph>
              <Paragraph style={styles.profilePhone}>{instructor?.phone || 'No phone'}</Paragraph>
              
              <View style={styles.profileStats}>
                <View style={styles.profileStatItem}>
                  <Title style={styles.profileStatNumber}>{stats.hasProfilePicture ? 'Yes' : 'No'}</Title>
                  <Caption style={styles.profileStatLabel}>Profile Picture</Caption>
                </View>
                <View style={styles.profileStatItem}>
                  <Title style={styles.profileStatNumber}>{stats.avgAttendance}</Title>
                  <Caption style={styles.profileStatLabel}>Avg Attendance</Caption>
                </View>
                <View style={styles.profileStatItem}>
                  <Title style={styles.profileStatNumber}>{stats.thisMonthClasses}</Title>
                  <Caption style={styles.profileStatLabel}>This Month</Caption>
                </View>
              </View>
            </View>
          </View>
        </Card.Content>
      </Card>
    </View>
  );

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewTab();
      case 'classes':
        return renderClassesTab();
      case 'bookings':
        return renderBookingsTab();
      case 'clients':
        return renderClientsTab();
      case 'activity':
        return renderActivityTab();
      case 'profile':
        return renderProfileTab();
      default:
        return renderOverviewTab();
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6B8E7F" />
        <Paragraph style={styles.loadingText}>Loading instructor profile...</Paragraph>
      </View>
    );
  }

  if (!instructor) {
    return (
      <View style={styles.errorContainer}>
        <WebCompatibleIcon name="error" size={48} color="#FF6B6B" />
        <Title style={styles.errorTitle}>Instructor Not Found</Title>
        <Paragraph style={styles.errorText}>
          The instructor profile could not be loaded.
        </Paragraph>
        <Button mode="contained" onPress={() => navigation.goBack()}>
          Go Back
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <Surface style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <IconButton
              icon="arrow-left"
              size={24}
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            />
            <Avatar.Text 
              size={60} 
              label={instructor?.name?.charAt(0) || 'I'} 
              style={styles.avatar}
            />
            <View style={styles.headerText}>
              <Title style={styles.instructorName}>{instructor?.name}</Title>
              <Paragraph style={styles.instructorEmail}>{instructor?.email}</Paragraph>
              <Chip 
                mode="outlined" 
                style={styles.roleChip}
                textStyle={styles.roleChipText}
              >
                Instructor
              </Chip>
            </View>
          </View>
        </View>
      </Surface>

      {/* Tab Bar for PC */}
      {renderTabBar()}

      {/* Content */}
      <ScrollView style={styles.content}>
        {renderTabContent()}
      </ScrollView>

      {/* Assignment Modal */}
      <Portal>
        <Modal
          visible={showAssignmentModal}
          onDismiss={() => setShowAssignmentModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Card>
            <Card.Content>
              <Title>Assign Client to Instructor</Title>
              <Paragraph>Assignment functionality would go here...</Paragraph>
              <View style={styles.modalActions}>
                <Button onPress={() => setShowAssignmentModal(false)}>
                  Cancel
                </Button>
                <Button mode="contained" onPress={handleAssignClient}>
                  Assign
                </Button>
              </View>
            </Card.Content>
          </Card>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 20,
  },
  errorTitle: {
    marginTop: 16,
    color: '#FF6B6B',
  },
  errorText: {
    textAlign: 'center',
    marginTop: 8,
    color: '#666',
  },
  // Header styles
  header: {
    backgroundColor: 'white',
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerContent: {
    padding: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: '#6B8E7F',
    marginHorizontal: 16,
  },
  headerText: {
    flex: 1,
  },
  instructorName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  instructorEmail: {
    color: '#666',
    marginTop: 4,
  },
  roleChip: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  roleChipText: {
    color: '#6B8E7F',
  },
  backButton: {
    margin: 0,
  },
  // Tab Bar styles
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    elevation: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: '#6B8E7F',
    backgroundColor: '#F8F9FA',
  },
  tabButtonText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  tabButtonTextActive: {
    color: '#6B8E7F',
    fontWeight: '600',
  },
  // Content styles
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 20,
  },
  // Stats styles
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  statCard: {
    width: isLargeScreen ? '16.66%' : '48%',
    margin: 8,
    elevation: 2,
    backgroundColor: 'white',
  },
  statContent: {
    alignItems: 'center',
    padding: 20,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
  },
  statLabel: {
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    fontSize: 14,
  },
  // Data Table styles
  dataCard: {
    elevation: 2,
    backgroundColor: 'white',
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  assignButton: {
    backgroundColor: '#6B8E7F',
  },
  unassignButton: {
    borderColor: '#F44336',
  },
  // Chip styles
  privateChip: {
    backgroundColor: '#E3F2FD',
  },
  privateChipText: {
    color: '#1976D2',
  },
  groupChip: {
    backgroundColor: '#E8F5E8',
  },
  groupChipText: {
    color: '#4CAF50',
  },
  statusChip: {
    backgroundColor: '#FFF3E0',
  },
  statusChipText: {
    color: '#F57C00',
  },
  // Profile styles
  profileSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 20,
  },
  profileAvatar: {
    backgroundColor: '#6B8E7F',
    marginRight: 24,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  profileEmail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  profilePhone: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  profileStats: {
    flexDirection: 'row',
    gap: 24,
  },
  profileStatItem: {
    alignItems: 'center',
  },
  profileStatNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6B8E7F',
  },
  profileStatLabel: {
    color: '#666',
    marginTop: 4,
  },
  // Activity styles
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  activityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityDescription: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  activityTime: {
    color: '#666',
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  // Modal styles
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 12,
  },
});

export default ReceptionInstructorProfile;
