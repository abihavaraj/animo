import StatusChip from '@/components/ui/StatusChip';
import { Body, Caption, H1, H2 } from '@/components/ui/Typography';
import { Colors } from '@/constants/Colors';
import { layout, spacing } from '@/constants/Spacing';
import React, { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Button as PaperButton, Card as PaperCard } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import WebCompatibleIcon from '../../components/WebCompatibleIcon';
import { BackendClass, classService } from '../../services/classService';
import { AppDispatch, RootState } from '../../store';
import { shadows } from '../../utils/shadows';

function InstructorDashboard() {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const [refreshing, setRefreshing] = useState(false);
  const [upcomingClasses, setUpcomingClasses] = useState<BackendClass[]>([]);
  const [todaysStats, setTodaysStats] = useState({
    classesToday: 0,
    totalAttendees: 0,
    completedClasses: 0,
    averageAttendance: 0,
  });
  const [weeklyStats, setWeeklyStats] = useState({
    totalClasses: 0,
    completedClasses: 0,
    averageAttendance: 0,
    upcomingThisWeek: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInstructorData();
  }, []);

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
        }).slice(0, 3); // Show only next 3 classes

        setUpcomingClasses(upcomingClasses);

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

        // Calculate this week's stats
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        const startOfWeekStr = startOfWeek.toISOString().split('T')[0];
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6);
        const endOfWeekStr = endOfWeek.toISOString().split('T')[0];

        const thisWeekClasses = allClasses.filter(cls => 
          cls.date >= startOfWeekStr && cls.date <= endOfWeekStr
        );

        const weeklyCompleted = thisWeekClasses.filter(cls => {
          const classDateTime = new Date(`${cls.date}T${cls.time}`);
          return classDateTime < now;
        }).length;

        const weeklyUpcoming = thisWeekClasses.filter(cls => {
          const classDateTime = new Date(`${cls.date}T${cls.time}`);
          return classDateTime > now;
        }).length;

        const weeklyTotalEnrolled = thisWeekClasses.reduce((sum, cls) => sum + (cls.enrolled || 0), 0);
        const weeklyTotalCapacity = thisWeekClasses.reduce((sum, cls) => sum + cls.capacity, 0);
        const weeklyAvgAttendance = weeklyTotalCapacity > 0 ? Math.round((weeklyTotalEnrolled / weeklyTotalCapacity) * 100) : 0;

        setWeeklyStats({
          totalClasses: thisWeekClasses.length,
          completedClasses: weeklyCompleted,
          averageAttendance: weeklyAvgAttendance,
          upcomingThisWeek: weeklyUpcoming,
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
    console.log('Navigate to Schedule');
  };

  const handleViewClients = () => {
    console.log('Navigate to Clients');
  };

  const handleClassDetails = (classId: number) => {
    console.log('View class details:', classId);
  };

  const getStatusChipState = (cls: BackendClass) => {
    const enrollmentPercentage = (cls.enrolled / cls.capacity) * 100;
    
    if (enrollmentPercentage >= 100) return 'warning';
    if (enrollmentPercentage >= 80) return 'info';
    return 'success';
  };

  const getStatusText = (cls: BackendClass) => {
    const enrollmentPercentage = (cls.enrolled / cls.capacity) * 100;
    
    if (enrollmentPercentage >= 100) return 'Full';
    if (enrollmentPercentage >= 80) return 'Almost Full';
    return 'Available';
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
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
            <H2 style={styles.cardTitle}>Today&apos;s Overview</H2>
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
            
            {upcomingClasses.map((classItem) => (
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
            ))}
          </PaperCard.Content>
        </PaperCard>

        {/* Quick Actions */}
        <PaperCard style={styles.card}>
          <PaperCard.Content style={styles.cardContent}>
            <H2 style={styles.cardTitle}>Quick Actions</H2>
            
            <View style={styles.actionButtons}>
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

        {/* Performance Insights */}
        <PaperCard style={styles.card}>
          <PaperCard.Content style={styles.cardContent}>
            <H2 style={styles.cardTitle}>This Week&apos;s Performance</H2>
            
            <View style={styles.performanceItem}>
              <View style={styles.performanceIcon}>
                <WebCompatibleIcon name="trending-up" size={20} color={Colors.light.accent} />
              </View>
              <View style={styles.performanceContent}>
                <Body style={styles.performanceText}>Average class attendance: {weeklyStats.averageAttendance}%</Body>
                <Caption style={styles.performanceSubtext}>
                  {weeklyStats.totalClasses > 0 ? `Based on ${weeklyStats.totalClasses} classes` : 'No classes this week'}
                </Caption>
              </View>
            </View>
            
            <View style={styles.performanceItem}>
              <View style={styles.performanceIcon}>
                <WebCompatibleIcon name="event-available" size={20} color={Colors.light.success} />
              </View>
              <View style={styles.performanceContent}>
                <Body style={styles.performanceText}>
                  Classes completed: {weeklyStats.completedClasses}/{weeklyStats.totalClasses}
                </Body>
                <Caption style={styles.performanceSubtext}>
                  {weeklyStats.upcomingThisWeek > 0 
                    ? `${weeklyStats.upcomingThisWeek} more this week` 
                    : 'Week completed'
                  }
                </Caption>
              </View>
            </View>
            
            <View style={styles.performanceItem}>
              <View style={styles.performanceIcon}>
                <WebCompatibleIcon name="people" size={20} color={Colors.light.primary} />
              </View>
              <View style={styles.performanceContent}>
                <Body style={styles.performanceText}>Total attendees today: {todaysStats.totalAttendees}</Body>
                <Caption style={styles.performanceSubtext}>
                  {todaysStats.classesToday > 0 
                    ? `Across ${todaysStats.classesToday} classes` 
                    : 'No classes today'
                  }
                </Caption>
              </View>
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
    gap: spacing.sm,
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
  viewAllLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.accent,
  },
  
  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
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
  },
  classDetails: {
    gap: spacing.xs,
  },
  classDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  classDetailText: {
    color: Colors.light.textSecondary,
  },
  classAction: {
    borderColor: Colors.light.border,
    borderRadius: spacing.sm,
    marginLeft: spacing.md,
  },
  classActionLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.light.textSecondary,
  },
  
  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  primaryAction: {
    flex: 1,
    backgroundColor: Colors.light.accent,
    borderRadius: layout.borderRadius,
    ...shadows.accent,
  },
  primaryActionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.textOnAccent,
    paddingVertical: spacing.xs,
  },
  secondaryAction: {
    flex: 1,
    borderColor: Colors.light.border,
    borderRadius: layout.borderRadius,
  },
  secondaryActionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.textSecondary,
    paddingVertical: spacing.xs,
  },
  
  // Performance Items
  performanceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.divider,
    gap: spacing.md,
  },
  performanceIcon: {
    width: 40,
    height: 40,
    backgroundColor: Colors.light.surfaceVariant,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  performanceContent: {
    flex: 1,
  },
  performanceText: {
    color: Colors.light.text,
    marginBottom: spacing.xs,
  },
  performanceSubtext: {
    color: Colors.light.textMuted,
  },
});

export default InstructorDashboard; 