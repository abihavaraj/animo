import StatusChip from '@/components/ui/StatusChip';
import { Body, Caption, H1, H2 } from '@/components/ui/Typography';
import { Colors } from '@/constants/Colors';
import { layout, spacing } from '@/constants/Spacing';
import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Button as PaperButton, Card as PaperCard } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { shadows } from '../../utils/shadows';

function InstructorDashboard() {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const [refreshing, setRefreshing] = useState(false);
  const [upcomingClasses, setUpcomingClasses] = useState<any[]>([]);
  const [todaysStats, setTodaysStats] = useState({
    classesToday: 0,
    totalAttendees: 0,
    completedClasses: 0,
    revenue: 0,
  });

  useEffect(() => {
    loadInstructorData();
  }, []);

  const loadInstructorData = async () => {
    try {
      // Simulate loading instructor data
      setUpcomingClasses([
        {
          id: 1,
          name: 'Power Mat',
          time: '09:00',
          date: 'Today',
          attendees: 12,
          maxCapacity: 15,
          status: 'confirmed',
        },
        {
          id: 2,
          name: 'Reformer Flow',
          time: '14:30',
          date: 'Today',
          attendees: 8,
          maxCapacity: 10,
          status: 'confirmed',
        },
        {
          id: 3,
          name: 'Gentle Restoration',
          time: '10:00',
          date: 'Tomorrow',
          attendees: 6,
          maxCapacity: 12,
          status: 'open',
        },
      ]);

      setTodaysStats({
        classesToday: 2,
        totalAttendees: 20,
        completedClasses: 1,
        revenue: 580,
      });
    } catch (error) {
      console.error('Failed to load instructor data:', error);
    } finally {
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

  const getStatusChipState = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'success';
      case 'open':
        return 'info';
      case 'cancelled':
        return 'warning';
      default:
        return 'neutral';
    }
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
                  <MaterialIcons name="event" size={24} color={Colors.light.accent} />
                  <Body style={styles.statNumber}>{todaysStats.classesToday}</Body>
                </View>
                <Caption style={styles.statLabel}>Classes Today</Caption>
              </View>
              
              <View style={styles.statItem}>
                <View style={styles.statHeader}>
                  <MaterialIcons name="people" size={24} color={Colors.light.primary} />
                  <Body style={styles.statNumber}>{todaysStats.totalAttendees}</Body>
                </View>
                <Caption style={styles.statLabel}>Total Attendees</Caption>
              </View>
              
              <View style={styles.statItem}>
                <View style={styles.statHeader}>
                  <MaterialIcons name="check-circle" size={24} color={Colors.light.success} />
                  <Body style={styles.statNumber}>{todaysStats.completedClasses}</Body>
                </View>
                <Caption style={styles.statLabel}>Completed</Caption>
              </View>
              
              <View style={styles.statItem}>
                <View style={styles.statHeader}>
                  <MaterialIcons name="attach-money" size={24} color={Colors.light.warning} />
                  <Body style={styles.statNumber}>${todaysStats.revenue}</Body>
                </View>
                <Caption style={styles.statLabel}>Revenue</Caption>
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
                      state={getStatusChipState(classItem.status)}
                      text={classItem.status.charAt(0).toUpperCase() + classItem.status.slice(1)}
                    />
                  </View>
                  
                  <View style={styles.classDetails}>
                    <View style={styles.classDetailItem}>
                      <MaterialIcons name="schedule" size={16} color={Colors.light.textSecondary} />
                      <Caption style={styles.classDetailText}>
                        {classItem.date} at {classItem.time}
                      </Caption>
                    </View>
                    
                    <View style={styles.classDetailItem}>
                      <MaterialIcons name="people" size={16} color={Colors.light.textSecondary} />
                      <Caption style={styles.classDetailText}>
                        {classItem.attendees}/{classItem.maxCapacity} attendees
                      </Caption>
                    </View>
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
                icon={() => <MaterialIcons name="schedule" size={20} color="white" />}
                onPress={handleViewSchedule}
              >
                View Schedule
              </PaperButton>
              
              <PaperButton 
                mode="outlined" 
                style={styles.secondaryAction}
                labelStyle={styles.secondaryActionLabel}
                icon={() => <MaterialIcons name="people" size={20} color={Colors.light.textSecondary} />}
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
                <MaterialIcons name="trending-up" size={20} color={Colors.light.accent} />
              </View>
              <View style={styles.performanceContent}>
                <Body style={styles.performanceText}>Average class attendance: 92%</Body>
                <Caption style={styles.performanceSubtext}>Up 5% from last week</Caption>
              </View>
            </View>
            
            <View style={styles.performanceItem}>
              <View style={styles.performanceIcon}>
                <MaterialIcons name="star" size={20} color={Colors.light.warning} />
              </View>
              <View style={styles.performanceContent}>
                <Body style={styles.performanceText}>Client satisfaction: 4.8/5</Body>
                <Caption style={styles.performanceSubtext}>Based on 15 reviews</Caption>
              </View>
            </View>
            
            <View style={styles.performanceItem}>
              <View style={styles.performanceIcon}>
                <MaterialIcons name="event-available" size={20} color={Colors.light.success} />
              </View>
              <View style={styles.performanceContent}>
                <Body style={styles.performanceText}>Classes completed: 12/14</Body>
                <Caption style={styles.performanceSubtext}>2 more this week</Caption>
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