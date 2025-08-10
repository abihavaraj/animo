import StatusChip from '@/components/ui/StatusChip';
import { Body, Caption, H1, H2 } from '@/components/ui/Typography';
import { Colors } from '@/constants/Colors';
import { spacing } from '@/constants/Spacing';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Button as PaperButton, Card as PaperCard } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import WebCompatibleIcon from '../../components/WebCompatibleIcon';
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
  const [fullClasses, setFullClasses] = useState<BackendClass[]>([]);
  const [almostFullClasses, setAlmostFullClasses] = useState<BackendClass[]>([]);
  const [todaysStats, setTodaysStats] = useState({
    classesToday: 0,
    totalAttendees: 0,
    completedClasses: 0,
    averageAttendance: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInstructorData();
    
    // Initialize notification services for instructors (IPA build support)
    const initializeNotifications = async () => {
      try {
        console.log('📱 [InstructorDashboard] Initializing notification services...');
        
        // Initialize both notification services for production builds
        await Promise.all([
          notificationService.initialize(),
          pushNotificationService.initialize()
        ]);
        
        console.log('✅ [InstructorDashboard] Notification services initialized successfully');
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
      // Send notifications for full classes automatically
      fullClasses.forEach(async (classItem) => {
        try {
          await notificationService.sendClassFullNotification(
            classItem.id,
            user?.id
          );
        } catch (error) {
          console.error('Error sending automatic full class notification:', error);
        }
      });
    }
  }, [fullClasses, user?.id]);



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
        const today = new Date().toISOString().split('T')[0];
        const now = new Date();
        
        // Filter upcoming classes (today and future)
        const upcomingClasses = allClasses.filter(cls => {
          const classDate = new Date(cls.date);
          const classDateTime = new Date(`${cls.date}T${cls.time}`);
          return classDate >= new Date(today) && classDateTime > now;
        }).slice(0, 5); // Show next 5 classes

        setUpcomingClasses(upcomingClasses);

        // Filter full classes (at capacity)
        const fullClasses = allClasses.filter(cls => {
          const classDate = new Date(cls.date);
          const classDateTime = new Date(`${cls.date}T${cls.time}`);
          return classDate >= new Date(today) && classDateTime > now && (cls.enrolled || 0) >= cls.capacity;
        }).slice(0, 3); // Show top 3 full classes

        setFullClasses(fullClasses);

        // Filter almost full classes (80% capacity)
        const almostFullClasses = allClasses.filter(cls => {
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
        const todaysClasses = allClasses.filter(cls => cls.date === today);
        const totalTodayAttendees = todaysClasses.reduce((sum, cls) => sum + (cls.enrolled || 0), 0);
        
        // Calculate completed classes today (past classes)
        const completedToday = todaysClasses.filter(cls => {
          const classDateTime = new Date(`${cls.date}T${cls.time}`);
          return classDateTime < now;
        }).length;

        // Calculate average attendance for all instructor's classes
        const totalEnrolled = allClasses.reduce((sum, cls) => sum + (cls.enrolled || 0), 0);
        const totalCapacity = allClasses.reduce((sum, cls) => sum + cls.capacity, 0);
        const avgAttendance = totalCapacity > 0 ? Math.round((totalEnrolled / totalCapacity) * 100) : 0;

        setTodaysStats({
          classesToday: todaysClasses.length,
          totalAttendees: totalTodayAttendees,
          completedClasses: completedToday,
          averageAttendance: avgAttendance,
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

  const handleClassDetails = (classId: number) => {
    // Navigate to class details
    console.log('Navigate to class details:', classId);
    // @ts-ignore - navigation type issue
    navigation.navigate('ClassDetails', { classId: classId.toString() });
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
        <H1 style={styles.headerTitle}>Welcome, {user?.name?.split(' ')[0] || 'Instructor'}</H1>
        <Caption style={styles.headerSubtitle}>Instructor Dashboard</Caption>
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
                <Caption style={styles.statLabel}>Classes Today</Caption>
              </View>
              
              <View style={styles.statItem}>
                <View style={styles.statHeader}>
                  <WebCompatibleIcon name="people" size={24} color={Colors.light.primary} />
                  <Body style={styles.statNumber}>{todaysStats.totalAttendees}</Body>
                </View>
                <Caption style={styles.statLabel}>Total Attendees</Caption>
              </View>
              
              <View style={styles.statItem}>
                <View style={styles.statHeader}>
                  <WebCompatibleIcon name="check-circle" size={24} color={Colors.light.success} />
                  <Body style={styles.statNumber}>{todaysStats.completedClasses}</Body>
                </View>
                <Caption style={styles.statLabel}>Completed</Caption>
              </View>
              
              <View style={styles.statItem}>
                <View style={styles.statHeader}>
                  <WebCompatibleIcon name="trending-up" size={24} color={Colors.light.warning} />
                  <Body style={styles.statNumber}>{todaysStats.averageAttendance}%</Body>
                </View>
                <Caption style={styles.statLabel}>Avg Attendance</Caption>
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
                  <H2 style={styles.cardTitle}>Almost Full Classes</H2>
                </View>
                <Caption style={styles.almostFullClassSubtitle}>
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
                    onPress={() => handleClassDetails(classItem.id)}
                  >
                    View
                  </PaperButton>
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
                    mode="contained" 
                    compact
                    style={styles.notifyButton}
                    labelStyle={styles.notifyButtonLabel}
                    icon={() => <WebCompatibleIcon name="notifications" size={16} color="white" />}
                    onPress={() => handleFullClassNotification(classItem)}
                  >
                    Notify
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
              <PaperButton 
                mode="text" 
                compact
                labelStyle={styles.viewAllLabel}
                onPress={handleViewSchedule}
              >
                View All
              </PaperButton>
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
                    onPress={() => handleClassDetails(classItem.id)}
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
  headerTitle: {
    color: Colors.light.textOnAccent,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    color: Colors.light.textOnAccent,
    opacity: 0.8,
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
  emptyText: {
    color: Colors.light.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    color: Colors.light.textSecondary,
    textAlign: 'center',
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
  // Notification styles
  notificationCard: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.light.accent,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  notificationBadge: {
    backgroundColor: Colors.light.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  notificationContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  notificationIcon: {
    marginTop: 2,
  },
  notificationText: {
    flex: 1,
  },
  notificationTitle: {
    fontWeight: '500',
    marginBottom: 2,
  },
  unreadText: {
    color: Colors.light.accent,
    fontWeight: '600',
  },
  notificationMessage: {
    color: Colors.light.textSecondary,
    marginBottom: 2,
  },
  notificationTime: {
    color: Colors.light.textSecondary,
    fontSize: 11,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.light.accent,
    marginLeft: spacing.sm,
  },
});

export default InstructorDashboard; 