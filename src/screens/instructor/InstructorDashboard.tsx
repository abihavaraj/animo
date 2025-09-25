import StatusChip from '@/components/ui/StatusChip';
import { Body, Caption, H1, H2 } from '@/components/ui/Typography';
import { Colors } from '@/constants/Colors';
import { spacing } from '@/constants/Spacing';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Modal, Button as PaperButton, Card as PaperCard, Portal } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import ScrollableNotificationsModal from '../../components/ScrollableNotificationsModal';
import WebCompatibleIcon from '../../components/WebCompatibleIcon';
import { supabase } from '../../config/supabase.config';
import { BackendClass, classService } from '../../services/classService';
import { notificationService } from '../../services/notificationService';
import { pushNotificationService } from '../../services/pushNotificationService';
import { AppDispatch, RootState } from '../../store';
import { shadows } from '../../utils/shadows';

function InstructorDashboard() {
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const [refreshing, setRefreshing] = useState(false);
  const [upcomingClasses, setUpcomingClasses] = useState<BackendClass[]>([]);
  const [personalClasses, setPersonalClasses] = useState<BackendClass[]>([]);
  const [fullClasses, setFullClasses] = useState<BackendClass[]>([]);
  const [almostFullClasses, setAlmostFullClasses] = useState<BackendClass[]>([]);
  const [todaysStats, setTodaysStats] = useState({
    classesToday: 0,
    personalClassesToday: 0,
    groupClassesToday: 0,
  });
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [allNotifications, setAllNotifications] = useState<any[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [showingMore, setShowingMore] = useState(false);
  const [notificationsPage, setNotificationsPage] = useState(1);
  const [hasMoreNotifications, setHasMoreNotifications] = useState(false);
  const [timeEditModalVisible, setTimeEditModalVisible] = useState(false);
  const [selectedClassForTimeEdit, setSelectedClassForTimeEdit] = useState<BackendClass | null>(null);
  const [newTime, setNewTime] = useState('');
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);

  useEffect(() => {
    loadInstructorData();
    loadNotifications();
    
    // Initialize notification services for instructors (IPA build support)
    const initializeNotifications = async () => {
      try {
        
        // Initialize both notification services for production builds
        await Promise.all([
          notificationService.initialize(),
          pushNotificationService.initialize()
        ]);
        
      } catch (error) {
        console.error('⚠️ [InstructorDashboard] Failed to initialize notification services:', error);
        // Don't block dashboard loading if notification initialization fails
      }
    };
    
    initializeNotifications();
  }, []);

  // Check for full classes and send notifications automatically
  useEffect(() => {
    if (fullClasses.length > 0) {
      // Note: Class full notifications are sent automatically when classes become full during booking
      // No need to send them again when instructor opens dashboard
    }
  }, [fullClasses, user?.id]);

  const loadNotifications = async (reset: boolean = true) => {
    try {
      if (!user?.id) return;
      
      const response = await notificationService.getUserNotifications(user.id.toString());
      if (response.success && response.data) {
        const notificationsList = response.data as any[];
        const unreadCount = notificationsList.filter(n => !n.is_read).length;
        
        setAllNotifications(notificationsList);
        setUnreadNotificationCount(unreadCount);
        
        if (reset) {
          setNotifications(notificationsList.slice(0, 5)); // Show latest 5 notifications
          setNotificationsPage(1);
          setShowingMore(false);
          setHasMoreNotifications(notificationsList.length > 5);
        }
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const loadMoreNotifications = () => {
    const nextPage = notificationsPage + 1;
    const startIndex = 0;
    const endIndex = nextPage * 5;
    
    setNotifications(allNotifications.slice(startIndex, endIndex));
    setNotificationsPage(nextPage);
    setHasMoreNotifications(allNotifications.length > endIndex);
    setShowingMore(true);
  };

  const handleNotificationTap = async (notification: any) => {
    try {
      // Close the modal first
      setNotificationModalVisible(false);
      
      // Mark as read first
      await markNotificationAsRead(notification.id);
      
      // Check for class_id in different possible locations
      let classId = notification.class_id || 
                   notification.metadata?.class_id || 
                   notification.metadata?.classId;
      
      if (classId) {
        console.log('🎯 Navigating to class from notification:', classId);
        // @ts-ignore - navigation type issue
        navigation.navigate('Schedule', { 
          classId: classId.toString(),
          openClassDetails: true 
        });
      } else {
        console.log('ℹ️ Notification has no class_id - no navigation');
        console.log('🔍 Notification structure:', notification);
      }
    } catch (error) {
      console.error('Error handling notification tap:', error);
    }
  };

  const markNotificationAsRead = async (notificationId: number) => {
    try {
      // Mark as read via Supabase
      const { error } = await require('../../config/supabase.config').supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', user?.id);

      if (!error) {
        // Update local state
        const updatedNotifications = notifications.map(n => 
          n.id === notificationId ? { ...n, is_read: true } : n
        );
        const updatedAllNotifications = allNotifications.map(n => 
          n.id === notificationId ? { ...n, is_read: true } : n
        );
        
        setNotifications(updatedNotifications);
        setAllNotifications(updatedAllNotifications);
        
        // Update unread count
        const newUnreadCount = updatedAllNotifications.filter(n => !n.is_read).length;
        setUnreadNotificationCount(newUnreadCount);
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      if (!user?.id) return;
      
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking notifications as read:', error);
        return;
      }

      // Reset unread count
      setUnreadNotificationCount(0);
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const formatNotificationTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const loadInstructorData = async () => {
    try {
      setLoading(true);
      if (!user?.id) return;



      // Get instructor's classes
      const classResponse = await classService.getClasses({
        instructor: user.id.toString(),
        status: 'active'
      });

      if (classResponse.success && classResponse.data) {
        const allClasses = classResponse.data;
        // Normalize missing category values to avoid zero counts when category is null
        const normalizedClasses = allClasses.map((cls) => ({
          ...cls,
          category: (cls as any).category || 'group',
        }));
        const today = new Date().toISOString().split('T')[0];
        const now = new Date();
        
        // Filter upcoming classes (today and future) - group classes only
        const upcomingClasses = normalizedClasses.filter(cls => {
          const classDate = new Date(cls.date);
          const classDateTime = new Date(`${cls.date}T${cls.time}`);
          return classDate >= new Date(today) && classDateTime > now && cls.category === 'group';
        }).slice(0, 4); // Show next 4 classes for dashboard

        setUpcomingClasses(upcomingClasses);

        // Filter personal classes (today and future)
        const personalClasses = normalizedClasses.filter(cls => {
          const classDate = new Date(cls.date);
          const classDateTime = new Date(`${cls.date}T${cls.time}`);
          return classDate >= new Date(today) && classDateTime > now && cls.category === 'personal';
        }).slice(0, 3); // Show next 3 personal classes

        setPersonalClasses(personalClasses);

        // Filter full classes (at capacity)
        const fullClasses = normalizedClasses.filter(cls => {
          const classDate = new Date(cls.date);
          const classDateTime = new Date(`${cls.date}T${cls.time}`);
          return classDate >= new Date(today) && classDateTime > now && (cls.enrolled || 0) >= cls.capacity;
        }).slice(0, 3); // Show top 3 full classes

        setFullClasses(fullClasses);

        // Filter almost full classes (80% capacity)
        const almostFullClasses = normalizedClasses.filter(cls => {
          const classDate = new Date(cls.date);
          const classDateTime = new Date(`${cls.date}T${cls.time}`);
          const enrollmentPercentage = ((cls.enrolled || 0) / cls.capacity) * 100;
          return classDate >= new Date(today) && 
                 classDateTime > now && 
                 enrollmentPercentage >= 80 && 
                 enrollmentPercentage < 100;
        }).slice(0, 3); // Show top 3 almost full classes

        setAlmostFullClasses(almostFullClasses);

        // Calculate today's stats
        const todaysClasses = normalizedClasses.filter(cls => cls.date === today);
        const todaysPersonalClasses = todaysClasses.filter(cls => cls.category === 'personal');
        const todaysGroupClasses = todaysClasses.filter(cls => cls.category === 'group');

        setTodaysStats({
          classesToday: todaysClasses.length,
          personalClassesToday: todaysPersonalClasses.length,
          groupClassesToday: todaysGroupClasses.length,
        });
      }
    } catch (error) {
      console.error('Failed to load instructor data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadInstructorData();
    loadNotifications();
  };

  const handleViewSchedule = () => {
    // Navigate to schedule view
    console.log('Navigate to schedule');
    // @ts-ignore - navigation type issue
    navigation.navigate('Schedule');
  };

  const handleViewClients = () => {
    // Navigate to clients view
    console.log('Navigate to clients');
    // @ts-ignore - navigation type issue
    navigation.navigate('My Clients');
  };

  const handleClassDetails = (classId: string | number, classStatus?: string) => {
    // Navigate to class details
    console.log('Navigate to class details:', classId, 'Status:', classStatus);
    // @ts-ignore - navigation type issue
    navigation.navigate('ClassDetails', { 
      classId: classId.toString(),
      classStatus: classStatus || 'available'
    });
  };

  const handleEditTime = (classItem: BackendClass) => {
    setSelectedClassForTimeEdit(classItem);
    setNewTime(classItem.time);
    setTimeEditModalVisible(true);
  };

  const handleSaveTimeChange = async () => {
    if (!selectedClassForTimeEdit || !newTime) return;

    try {
      const response = await classService.updateClass(selectedClassForTimeEdit.id, {
        time: newTime
      });

      if (response.success) {
        Alert.alert('Success', 'Class time updated successfully');
        setTimeEditModalVisible(false);
        setSelectedClassForTimeEdit(null);
        setNewTime('');
        // Refresh data
        loadInstructorData();
      } else {
        Alert.alert('Error', response.error || 'Failed to update class time');
      }
    } catch (error) {
      console.error('Error updating class time:', error);
      Alert.alert('Error', 'Failed to update class time');
    }
  };

  const handleFullClassNotification = async (classItem: BackendClass) => {
    try {
      Alert.alert(
        'Class Full Notification',
        `Send notification about "${classItem.name}" being full?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Send',
            onPress: async () => {
              const response = await notificationService.sendClassFullNotification(
                classItem.id,
                user?.id
              );

              if (response.success) {
                Alert.alert('Success', 'Notification sent successfully!');
              } else {
                Alert.alert('Error', response.error || 'Failed to send notification');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error sending full class notification:', error);
      Alert.alert('Error', 'Failed to send notification');
    }
  };

  const getStatusChipState = (cls: BackendClass) => {
    if ((cls.enrolled || 0) >= cls.capacity) return 'warning';
    if ((cls.enrolled || 0) >= cls.capacity * 0.8) return 'warning';
    return 'success';
  };

  const getStatusText = (cls: BackendClass) => {
    if ((cls.enrolled || 0) >= cls.capacity) return 'Full';
    if ((cls.enrolled || 0) >= cls.capacity * 0.8) return 'Almost Full';
    return 'Available';
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateString: string) => {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    if (dateString === today) return 'Today';
    if (dateString === tomorrow) return 'Tomorrow';
    
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Body>Loading dashboard...</Body>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerText}>
            <H1 style={styles.headerTitle}>Welcome, {user?.name?.split(' ')[0] || 'Instructor'}</H1>
            <Caption style={styles.headerSubtitle}>Instructor Dashboard</Caption>
          </View>
          <View style={styles.headerActions}>
            {/* Notification Icon */}
            <TouchableOpacity 
              style={styles.notificationIconContainer}
              onPress={async () => {
                setNotificationModalVisible(true);
                // Mark all notifications as read when modal is opened
                await markAllNotificationsAsRead();
              }}
            >
              <WebCompatibleIcon 
                name="notifications" 
                size={24} 
                color={Colors.light.textOnAccent} 
              />
              {unreadNotificationCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >


        {/* Today's Summary */}
        <PaperCard style={styles.card}>
          <PaperCard.Content style={styles.cardContent}>
            <H2 style={styles.cardTitle}>Today's Overview</H2>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <View style={styles.statHeader}>
                  <WebCompatibleIcon name="event" size={24} color={Colors.light.accent} />
                  <Body style={styles.statNumber}>{todaysStats.classesToday}</Body>
                </View>
                <Caption style={styles.statLabel}>Total Classes Today</Caption>
              </View>
              
              <View style={styles.statItem}>
                <View style={styles.statHeader}>
                  <WebCompatibleIcon name="person" size={24} color={Colors.light.primary} />
                  <Body style={styles.statNumber}>{todaysStats.personalClassesToday}</Body>
                </View>
                <Caption style={styles.statLabel}>Personal Classes</Caption>
              </View>
              
              <View style={styles.statItem}>
                <View style={styles.statHeader}>
                  <WebCompatibleIcon name="groups" size={24} color={Colors.light.secondary} />
                  <Body style={styles.statNumber}>{todaysStats.groupClassesToday}</Body>
                </View>
                <Caption style={styles.statLabel}>Group Classes</Caption>
              </View>
              
            </View>
          </PaperCard.Content>
        </PaperCard>

        {/* Almost Full Classes Warning */}
        {almostFullClasses.length > 0 && (
          <PaperCard style={[styles.card, styles.almostFullClassCard]}>
            <PaperCard.Content style={styles.cardContent}>
              <View style={styles.sectionHeader}>
                <View style={styles.almostFullClassTitle}>
                  <WebCompatibleIcon name="warning" size={20} color={Colors.light.warning} />
                  <H2 style={{ ...styles.cardTitle, color: Colors.light.warning }}>Almost Full Classes</H2>
                </View>
                <Caption style={{ ...styles.almostFullClassSubtitle, color: Colors.light.warning, fontWeight: '500' }}>
                  Classes approaching capacity (80%+)
                </Caption>
              </View>
              
              {almostFullClasses.map((classItem) => (
                <View key={classItem.id} style={styles.almostFullClassItem}>
                  <View style={styles.classInfo}>
                    <View style={styles.classHeader}>
                      <Body style={styles.className}>{classItem.name}</Body>
                      <StatusChip 
                        state="warning"
                        text="ALMOST FULL"
                      />
                    </View>
                    
                    <View style={styles.classDetails}>
                      <View style={styles.classDetailItem}>
                        <WebCompatibleIcon name="schedule" size={16} color={Colors.light.textSecondary} />
                        <Caption style={styles.classDetailText}>
                          {formatDate(classItem.date)} at {formatTime(classItem.time)}
                        </Caption>
                      </View>
                      
                      <View style={styles.classDetailItem}>
                        <WebCompatibleIcon name="people" size={16} color={Colors.light.warning} />
                        <Caption style={styles.almostFullClassText}>
                          {classItem.enrolled}/{classItem.capacity} enrolled ({(Math.round((classItem.enrolled || 0) / classItem.capacity) * 100)}%)
                        </Caption>
                      </View>
                      
                      {classItem.room && (
                        <View style={styles.classDetailItem}>
                          <WebCompatibleIcon name="location-on" size={16} color={Colors.light.textSecondary} />
                          <Caption style={styles.classDetailText}>
                            {classItem.room}
                          </Caption>
                        </View>
                      )}
                    </View>
                  </View>
                  
                  <PaperButton 
                    mode="outlined" 
                    compact
                    style={styles.warningButton}
                    labelStyle={styles.warningButtonLabel}
                    icon={() => <WebCompatibleIcon name="visibility" size={16} color={Colors.light.warning} />}
                    onPress={() => handleClassDetails(classItem.id, 'almost_full')}
                  >
                    View
                  </PaperButton>
                </View>
              ))}
            </PaperCard.Content>
          </PaperCard>
        )}

        {/* Personal Classes */}
        {personalClasses.length > 0 && (
          <PaperCard style={[styles.card, styles.personalClassCard]}>
            <PaperCard.Content style={styles.cardContent}>
              <View style={styles.sectionHeader}>
                <View style={styles.personalClassTitle}>
                  <WebCompatibleIcon name="person" size={20} color={Colors.light.primary} />
                  <H2 style={{ ...styles.cardTitle, color: Colors.light.primary }}>Personal Classes</H2>
                </View>
                <Caption style={{ ...styles.personalClassSubtitle, color: Colors.light.primary, fontWeight: '500' }}>
                  One-on-one sessions
                </Caption>
              </View>
              
              {personalClasses.map((classItem) => (
                <View key={classItem.id} style={styles.personalClassItem}>
                  <View style={styles.classInfo}>
                    <View style={styles.classHeader}>
                      <Body style={{ ...styles.className, color: Colors.light.primary, fontWeight: '600' }}>{classItem.name}</Body>
                      <StatusChip 
                        state="success"
                        text="PERSONAL"
                      />
                    </View>
                    
                    <View style={styles.classDetails}>
                      <View style={styles.classDetailItem}>
                        <WebCompatibleIcon name="schedule" size={16} color={Colors.light.textSecondary} />
                        <Caption style={styles.classDetailText}>
                          {formatDate(classItem.date)} at {formatTime(classItem.time)}
                        </Caption>
                      </View>
                      
                      <View style={styles.classDetailItem}>
                        <WebCompatibleIcon name="people" size={16} color={Colors.light.primary} />
                        <Caption style={styles.personalClassText}>
                          {classItem.enrolled || 0}/{classItem.capacity} enrolled
                        </Caption>
                      </View>
                      
                      {classItem.room && (
                        <View style={styles.classDetailItem}>
                          <WebCompatibleIcon name="location-on" size={16} color={Colors.light.textSecondary} />
                          <Caption style={styles.classDetailText}>
                            {classItem.room}
                          </Caption>
                        </View>
                      )}
                    </View>
                  </View>
                  
                  <View style={styles.personalClassActions}>
                    <PaperButton 
                      mode="outlined" 
                      compact
                      style={styles.timeEditButton}
                      labelStyle={styles.timeEditButtonLabel}
                      icon={() => <WebCompatibleIcon name="edit" size={16} color={Colors.light.primary} />}
                      onPress={() => handleEditTime(classItem)}
                    >
                      Edit Time
                    </PaperButton>
                    
                    <PaperButton 
                      mode="outlined" 
                      compact
                      style={styles.warningButton}
                      labelStyle={styles.warningButtonLabel}
                      icon={() => <WebCompatibleIcon name="visibility" size={16} color={Colors.light.primary} />}
                      onPress={() => handleClassDetails(classItem.id, 'personal')}
                    >
                      View
                    </PaperButton>
                  </View>
                </View>
              ))}
            </PaperCard.Content>
          </PaperCard>
        )}

        {/* Full Classes Alert */}
        {fullClasses.length > 0 && (
          <PaperCard style={[styles.card, styles.fullClassCard]}>
            <PaperCard.Content style={styles.cardContent}>
              <View style={styles.sectionHeader}>
                <View style={styles.fullClassTitle}>
                  <WebCompatibleIcon name="warning" size={20} color={Colors.light.error} />
                  <H2 style={styles.cardTitle}>Full Classes</H2>
                </View>
                <Caption style={styles.fullClassSubtitle}>
                  Classes at maximum capacity
                </Caption>
              </View>
              
              {fullClasses.map((classItem) => (
                <View key={classItem.id} style={styles.fullClassItem}>
                  <View style={styles.classInfo}>
                    <View style={styles.classHeader}>
                      <Body style={styles.className}>{classItem.name}</Body>
                      <StatusChip 
                        state="warning"
                        text="FULL"
                      />
                    </View>
                    
                    <View style={styles.classDetails}>
                      <View style={styles.classDetailItem}>
                        <WebCompatibleIcon name="schedule" size={16} color={Colors.light.textSecondary} />
                        <Caption style={styles.classDetailText}>
                          {formatDate(classItem.date)} at {formatTime(classItem.time)}
                        </Caption>
                      </View>
                      
                      <View style={styles.classDetailItem}>
                        <WebCompatibleIcon name="people" size={16} color={Colors.light.error} />
                        <Caption style={styles.fullClassText}>
                          {classItem.enrolled}/{classItem.capacity} enrolled (FULL)
                        </Caption>
                      </View>
                      
                      {classItem.room && (
                        <View style={styles.classDetailItem}>
                          <WebCompatibleIcon name="location-on" size={16} color={Colors.light.textSecondary} />
                          <Caption style={styles.classDetailText}>
                            {classItem.room}
                          </Caption>
                        </View>
                      )}
                    </View>
                  </View>
                  
                  <PaperButton 
                    mode="outlined" 
                    compact
                    style={styles.warningButton}
                    labelStyle={styles.warningButtonLabel}
                    icon={() => <WebCompatibleIcon name="visibility" size={16} color={Colors.light.error} />}
                    onPress={() => handleClassDetails(classItem.id, 'full')}
                  >
                    View
                  </PaperButton>
                </View>
              ))}
            </PaperCard.Content>
          </PaperCard>
        )}

        {/* Upcoming Classes */}
        <PaperCard style={styles.card}>
          <PaperCard.Content style={styles.cardContent}>
            <View style={styles.sectionHeader}>
              <H2 style={styles.cardTitle}>Upcoming Classes</H2>
            </View>
            
            {upcomingClasses.length > 0 ? (
              upcomingClasses.map((classItem) => (
                <View key={classItem.id} style={styles.classItem}>
                  <View style={styles.classInfo}>
                    <View style={styles.classHeader}>
                      <Body style={styles.className}>{classItem.name}</Body>
                      <StatusChip 
                        state={getStatusChipState(classItem)}
                        text={getStatusText(classItem)}
                      />
                    </View>
                    
                    <View style={styles.classDetails}>
                      <View style={styles.classDetailItem}>
                        <WebCompatibleIcon name="schedule" size={16} color={Colors.light.textSecondary} />
                        <Caption style={styles.classDetailText}>
                          {formatDate(classItem.date)} at {formatTime(classItem.time)}
                        </Caption>
                      </View>
                      
                      <View style={styles.classDetailItem}>
                        <WebCompatibleIcon name="people" size={16} color={Colors.light.textSecondary} />
                        <Caption style={styles.classDetailText}>
                          {classItem.enrolled || 0}/{classItem.capacity} enrolled
                        </Caption>
                      </View>
                      
                      {classItem.room && (
                        <View style={styles.classDetailItem}>
                          <WebCompatibleIcon name="location-on" size={16} color={Colors.light.textSecondary} />
                          <Caption style={styles.classDetailText}>
                            {classItem.room}
                          </Caption>
                        </View>
                      )}
                    </View>
                  </View>
                  
                  <PaperButton 
                    mode="outlined" 
                    compact
                    style={styles.classAction}
                    labelStyle={styles.classActionLabel}
                    onPress={() => handleClassDetails(classItem.id, getStatusText(classItem).toLowerCase().replace(' ', '_'))}
                  >
                    Details
                  </PaperButton>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <WebCompatibleIcon name="event" size={48} color={Colors.light.textSecondary} />
                <Body style={styles.emptyText}>No upcoming classes</Body>
                <Caption style={styles.emptySubtext}>Check your schedule for upcoming classes</Caption>
              </View>
            )}
            
            {/* See more button - only show if there are classes */}
            {upcomingClasses.length > 0 && (
              <PaperButton 
                mode="outlined" 
                style={styles.seeMoreButton}
                labelStyle={styles.seeMoreLabel}
                onPress={handleViewSchedule}
                icon={() => <WebCompatibleIcon name="calendar-today" size={16} color={Colors.light.primary} />}
              >
                See more on calendar
              </PaperButton>
            )}
          </PaperCard.Content>
        </PaperCard>


        {/* Quick Navigation */}
        <PaperCard style={styles.card}>
          <PaperCard.Content style={styles.cardContent}>
            <H2 style={styles.cardTitle}>Quick Navigation</H2>
            
            <View style={styles.navigationButtons}>
              <PaperButton 
                mode="contained" 
                style={styles.primaryAction}
                labelStyle={styles.primaryActionLabel}
                icon={() => <WebCompatibleIcon name="schedule" size={20} color="white" />}
                onPress={handleViewSchedule}
              >
                View Schedule
              </PaperButton>
              
              <PaperButton 
                mode="outlined" 
                style={styles.secondaryAction}
                labelStyle={styles.secondaryActionLabel}
                icon={() => <WebCompatibleIcon name="people" size={20} color={Colors.light.textSecondary} />}
                onPress={handleViewClients}
              >
                My Clients
              </PaperButton>
            </View>
          </PaperCard.Content>
        </PaperCard>
      </ScrollView>

      {/* Time Edit Modal */}
      {timeEditModalVisible && selectedClassForTimeEdit && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <H2 style={styles.modalTitle}>Edit Class Time</H2>
              <PaperButton 
                mode="text" 
                onPress={() => setTimeEditModalVisible(false)}
                icon="close"
              >
                Close
              </PaperButton>
            </View>
            
            <View style={styles.modalContent}>
              <Body style={styles.modalText}>
                Class: {selectedClassForTimeEdit.name}
              </Body>
              <Caption style={styles.modalSubtext}>
                Date: {formatDate(selectedClassForTimeEdit.date)}
              </Caption>
              
              <View style={styles.timeInputContainer}>
                <Caption style={styles.inputLabel}>New Time:</Caption>
                <TextInput
                  style={styles.timeInput}
                  value={newTime}
                  onChangeText={setNewTime}
                  placeholder="HH:MM"
                  placeholderTextColor={Colors.light.textMuted}
                />
              </View>
            </View>
            
            <View style={styles.modalActions}>
              <PaperButton 
                mode="outlined" 
                onPress={() => setTimeEditModalVisible(false)}
                style={styles.modalButton}
              >
                Cancel
              </PaperButton>
              <PaperButton 
                mode="contained" 
                onPress={handleSaveTimeChange}
                style={[styles.modalButton, { backgroundColor: Colors.light.primary }]}
                labelStyle={{ color: 'white' }}
              >
                Save Time
              </PaperButton>
            </View>
          </View>
        </View>
      )}

      {/* Notification Modal */}
      <Portal>
        <Modal
          visible={notificationModalVisible}
          onDismiss={() => setNotificationModalVisible(false)}
          contentContainerStyle={[styles.notificationModal, { backgroundColor: Colors.light.surface }]}
        >
          <View style={styles.notificationModalHeader}>
            <H2 style={{ color: Colors.light.text }}>🔔 Recent Notifications</H2>
            <TouchableOpacity 
              onPress={() => setNotificationModalVisible(false)}
              style={styles.closeButton}
            >
              <WebCompatibleIcon name="close" size={24} color={Colors.light.text} />
            </TouchableOpacity>
          </View>
          <ScrollableNotificationsModal 
            visible={notificationModalVisible}
            onDismiss={() => setNotificationModalVisible(false)}
            onNotificationRead={() => loadNotifications()}
            onNotificationTap={handleNotificationTap}
          />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: spacing.lg,
    paddingTop: 60,
    backgroundColor: Colors.light.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    color: Colors.light.textOnAccent,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    color: Colors.light.textOnAccent,
    opacity: 0.8,
  },
  notificationIconContainer: {
    position: 'relative',
    padding: spacing.sm,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: Colors.light.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.light.primary,
  },
  notificationBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  notificationModal: {
    margin: 20,
    padding: 0,
    borderRadius: 12,
    height: '45%',
    width: '90%',
    alignSelf: 'center',
  },
  notificationModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    paddingTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  closeButton: {
    padding: spacing.sm,
  },
  emptyText: {
    color: Colors.light.textMuted,
    marginTop: spacing.md,
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    color: Colors.light.textMuted,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  card: {
    marginBottom: spacing.lg,
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    ...shadows.card,
  },
  fullClassCard: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.light.error,
  },
  almostFullClassCard: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.light.warning,
  },
  personalClassCard: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.light.primary,
  },
  cardContent: {
    padding: spacing.lg,
  },
  cardTitle: {
    color: Colors.light.text,
    marginBottom: spacing.md,
  },
  fullClassTitle: {
    color: Colors.light.error,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fullClassSubtitle: {
    color: Colors.light.textSecondary,
    marginTop: spacing.xs,
  },
  almostFullClassTitle: {
    color: Colors.light.warning,
    flexDirection: 'row',
    alignItems: 'center',
  },
  almostFullClassSubtitle: {
    color: Colors.light.textSecondary,
    marginTop: spacing.xs,
  },
  personalClassTitle: {
    color: Colors.light.primary,
    flexDirection: 'row',
    alignItems: 'center',
  },
  personalClassSubtitle: {
    color: Colors.light.textSecondary,
    marginTop: spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  viewAllLabel: {
    color: Colors.light.primary,
    fontSize: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statItem: {
    flex: 1,
    minWidth: 120,
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: Colors.light.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginLeft: spacing.xs,
  },
  statLabel: {
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  classItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  fullClassItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    backgroundColor: Colors.light.error + '10',
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  almostFullClassItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    backgroundColor: Colors.light.warning + '10',
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  personalClassItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    backgroundColor: Colors.light.primary + '10',
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  classInfo: {
    flex: 1,
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  className: {
    fontWeight: '600',
    color: Colors.light.text,
    flex: 1,
  },
  classDetails: {
    gap: spacing.xs,
  },
  classDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  classDetailText: {
    color: Colors.light.textSecondary,
    marginLeft: spacing.xs,
  },
  fullClassText: {
    color: Colors.light.error,
    fontWeight: '500',
  },
  almostFullClassText: {
    color: Colors.light.warning,
    fontWeight: '500',
  },
  classAction: {
    marginLeft: spacing.md,
    borderColor: Colors.light.primary,
  },
  classActionLabel: {
    color: Colors.light.primary,
    fontSize: 12,
  },
  notifyButton: {
    marginLeft: spacing.md,
    backgroundColor: Colors.light.error,
  },
  notifyButtonLabel: {
    color: 'white',
    fontSize: 12,
  },
  warningButton: {
    marginLeft: spacing.md,
    borderColor: Colors.light.warning,
  },
  warningButtonLabel: {
    color: Colors.light.warning,
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  navigationButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  primaryAction: {
    flex: 1,
    backgroundColor: Colors.light.primary,
  },
  primaryActionLabel: {
    color: 'white',
    fontWeight: '600',
  },
  secondaryAction: {
    flex: 1,
    borderColor: Colors.light.primary,
  },
  secondaryActionLabel: {
    color: Colors.light.primary,
    fontWeight: '500',
  },
  seeMoreButton: {
    marginTop: spacing.md,
    borderColor: Colors.light.primary,
    borderRadius: 12,
  },
  seeMoreLabel: {
    color: Colors.light.primary,
    fontSize: 14,
  },
  personalClassText: {
    color: Colors.light.primary,
    fontWeight: '500',
  },
  personalClassActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  timeEditButton: {
    borderColor: Colors.light.primary,
  },
  timeEditButtonLabel: {
    color: Colors.light.primary,
    fontSize: 12,
  },
  // Modal styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContainer: {
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    margin: spacing.lg,
    maxWidth: 400,
    width: '90%',
    ...shadows.card,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  modalTitle: {
    color: Colors.light.text,
    flex: 1,
  },
  modalContent: {
    padding: spacing.lg,
  },
  modalText: {
    color: Colors.light.text,
    marginBottom: spacing.xs,
  },
  modalSubtext: {
    color: Colors.light.textSecondary,
    marginBottom: spacing.md,
  },
  timeInputContainer: {
    marginTop: spacing.md,
  },
  inputLabel: {
    color: Colors.light.text,
    marginBottom: spacing.xs,
    fontWeight: '500',
  },
  timeInput: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: 16,
    color: Colors.light.text,
    backgroundColor: Colors.light.background,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  modalButton: {
    minWidth: 100,
  },
});

export default InstructorDashboard; 