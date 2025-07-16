import StatusChip from '@/components/ui/StatusChip';
import { Body, Caption, H1, H2 } from '@/components/ui/Typography';
import { Colors } from '@/constants/Colors';
import { layout, spacing } from '@/constants/Spacing';
import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Button as PaperButton, Card as PaperCard } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { classService } from '../../services/classService';
import { AppDispatch, RootState } from '../../store';

interface Class {
  id: number;
  name: string;
  date: string;
  time: string;
  duration: number;
  capacity: number;
  enrolled: number;
  level?: string; // Make level optional
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

  useEffect(() => {
    loadSchedule();
  }, []);

  const loadSchedule = async () => {
    try {
      setLoading(true);
      const response = await classService.getClasses({
        instructor: user?.id?.toString(),
        status: 'active'
      });

      if (response.success && response.data) {
        setClasses(response.data);
      }
    } catch (error) {
      console.error('Failed to load schedule:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadSchedule();
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

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getLevelChipState = (level?: string) => { // Accept optional level
    switch (level?.toLowerCase() || 'beginner') { // Default to 'beginner'
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

  const handleClassDetails = (classId: number) => {
    console.log('View class details:', classId);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <H1 style={styles.headerTitle}>My Schedule</H1>
        <Caption style={styles.headerSubtitle}>Manage your classes and availability</Caption>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* View Toggle */}
        <View style={styles.viewToggle}>
          <PaperButton
            mode={viewMode === 'calendar' ? 'contained' : 'outlined'}
            onPress={() => setViewMode('calendar')}
            style={[styles.toggleButton, viewMode === 'calendar' && styles.activeToggle]}
            labelStyle={viewMode === 'calendar' ? styles.activeToggleLabel : styles.inactiveToggleLabel}
            icon={() => <MaterialIcons name="calendar-today" size={16} color={viewMode === 'calendar' ? 'white' : Colors.light.textSecondary} />}
          >
            Calendar
          </PaperButton>
          <PaperButton
            mode={viewMode === 'list' ? 'contained' : 'outlined'}
            onPress={() => setViewMode('list')}
            style={[styles.toggleButton, viewMode === 'list' && styles.activeToggle]}
            labelStyle={viewMode === 'list' ? styles.activeToggleLabel : styles.inactiveToggleLabel}
            icon={() => <MaterialIcons name="view-list" size={16} color={viewMode === 'list' ? 'white' : Colors.light.textSecondary} />}
          >
            List
          </PaperButton>
        </View>

        {viewMode === 'calendar' ? (
          <>
            {/* Calendar View */}
            <PaperCard style={styles.card}>
              <PaperCard.Content style={styles.cardContent}>
                <H2 style={styles.cardTitle}>Class Calendar</H2>
                <Calendar
                  markedDates={getMarkedDates()}
                  onDayPress={(day) => setSelectedDate(day.dateString)}
                  theme={{
                    backgroundColor: 'transparent',
                    calendarBackground: 'transparent',
                    textSectionTitleColor: Colors.light.textSecondary,
                    selectedDayBackgroundColor: Colors.light.accent,
                    selectedDayTextColor: Colors.light.textOnAccent,
                    todayTextColor: Colors.light.accent,
                    dayTextColor: Colors.light.text,
                    textDisabledColor: Colors.light.textMuted,
                    dotColor: Colors.light.accent,
                    selectedDotColor: Colors.light.textOnAccent,
                    arrowColor: Colors.light.accent,
                    monthTextColor: Colors.light.text,
                  }}
                />
                
                {/* Legend */}
                <View style={styles.legend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: Colors.light.success }]} />
                    <Caption style={styles.legendText}>Available</Caption>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: Colors.light.warning }]} />
                    <Caption style={styles.legendText}>Almost Full</Caption>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: Colors.light.error }]} />
                    <Caption style={styles.legendText}>Full</Caption>
                  </View>
                </View>
              </PaperCard.Content>
            </PaperCard>

            {/* Selected Date Classes */}
            {selectedDate && (
              <PaperCard style={styles.card}>
                <PaperCard.Content style={styles.cardContent}>
                  <H2 style={styles.cardTitle}>Classes on {selectedDate}</H2>
                  {getSelectedDateClasses().length === 0 ? (
                    <View style={styles.emptyState}>
                      <MaterialIcons name="event-note" size={48} color={Colors.light.textMuted} />
                      <Body style={styles.emptyStateText}>No classes scheduled for this date</Body>
                    </View>
                  ) : (
                    getSelectedDateClasses().map((cls) => (
                      <View key={cls.id} style={styles.classItem}>
                        <View style={styles.classInfo}>
                          <View style={styles.classHeader}>
                            <Body style={styles.className}>{cls.name}</Body>
                            <StatusChip 
                              state={getStatusChipState(cls)}
                              text={getStatusText(cls)}
                              size="small"
                            />
                          </View>
                          
                          <View style={styles.classDetails}>
                            <View style={styles.classDetailItem}>
                              <MaterialIcons name="schedule" size={16} color={Colors.light.textSecondary} />
                              <Caption style={styles.classDetailText}>
                                {`${formatTime(cls.time)} (${cls.duration} min)`}
                              </Caption>
                            </View>
                            
                            <View style={styles.classDetailItem}>
                              <MaterialIcons name="people" size={16} color={Colors.light.textSecondary} />
                              <Caption style={styles.classDetailText}>
                                {`${cls.enrolled}/${cls.capacity} enrolled`}
                              </Caption>
                            </View>
                          </View>
                        </View>
                        
                        <TouchableOpacity 
                          style={styles.classAction}
                          onPress={() => handleClassDetails(cls.id)}
                        >
                          <MaterialIcons name="chevron-right" size={20} color={Colors.light.textMuted} />
                        </TouchableOpacity>
          </View>
                    ))
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
                <Caption style={styles.classCount}>{classes.length} classes</Caption>
              </View>
              
              {classes.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialIcons name="event-note" size={48} color={Colors.light.textMuted} />
                  <Body style={styles.emptyStateText}>No classes scheduled</Body>
                  <Caption style={styles.emptyStateSubtext}>Classes will appear here when scheduled</Caption>
                </View>
              ) : (
                classes.map((cls) => (
                  <View key={cls.id} style={styles.classItem}>
                    <View style={styles.classInfo}>
                      <View style={styles.classHeader}>
                        <Body style={styles.className}>{cls.name}</Body>
                        <View style={styles.chipContainer}>
                          <StatusChip 
                            state={getLevelChipState(cls.level)}
                            text={cls.level || 'Beginner'}
                            size="small"
                          />
                        </View>
                      </View>
                      
                      <View style={styles.classDetails}>
                        <View style={styles.classDetailItem}>
                          <MaterialIcons name="calendar-today" size={16} color={Colors.light.textSecondary} />
                          <Caption style={styles.classDetailText}>{cls.date}</Caption>
                        </View>
                        
                        <View style={styles.classDetailItem}>
                          <MaterialIcons name="schedule" size={16} color={Colors.light.textSecondary} />
                          <Caption style={styles.classDetailText}>
                            {`${formatTime(cls.time)} (${cls.duration} min)`}
                          </Caption>
                        </View>

                        <View style={styles.classDetailItem}>
                          <MaterialIcons name="fitness-center" size={16} color={Colors.light.textSecondary} />
                          <Caption style={styles.classDetailText}>{cls.equipment_type}</Caption>
                        </View>
                        
                        <View style={styles.classDetailItem}>
                          <MaterialIcons name="people" size={16} color={Colors.light.textSecondary} />
                          <Caption style={styles.classDetailText}>
                            {`${cls.enrolled}/${cls.capacity} enrolled`}
                          </Caption>
                        </View>
                      </View>
                    </View>
                    
                    <View style={styles.classActions}>
                      <StatusChip 
                        state={getStatusChipState(cls)}
                        text={getStatusText(cls)}
                        size="small"
                      />
                      <TouchableOpacity 
                        style={styles.classAction}
                        onPress={() => handleClassDetails(cls.id)}
                      >
                        <MaterialIcons name="chevron-right" size={20} color={Colors.light.textMuted} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </PaperCard.Content>
          </PaperCard>
        )}

        {/* Quick Stats */}
        <PaperCard style={styles.card}>
          <PaperCard.Content style={styles.cardContent}>
            <H2 style={styles.cardTitle}>Schedule Overview</H2>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <View style={styles.statHeader}>
                  <MaterialIcons name="event" size={24} color={Colors.light.accent} />
                  <Body style={styles.statNumber}>{classes.length}</Body>
                </View>
                <Caption style={styles.statLabel}>Total Classes</Caption>
              </View>
              
              <View style={styles.statItem}>
                <View style={styles.statHeader}>
                  <MaterialIcons name="people" size={24} color={Colors.light.primary} />
                  <Body style={styles.statNumber}>
                    {classes.reduce((sum, cls) => sum + cls.enrolled, 0)}
                  </Body>
                </View>
                <Caption style={styles.statLabel}>Total Enrolled</Caption>
              </View>
              
              <View style={styles.statItem}>
                <View style={styles.statHeader}>
                  <MaterialIcons name="trending-up" size={24} color={Colors.light.success} />
                  <Body style={styles.statNumber}>
                    {classes.length > 0 
                      ? Math.round((classes.reduce((sum, cls) => sum + cls.enrolled, 0) / classes.reduce((sum, cls) => sum + cls.capacity, 0)) * 100)
                      : 0}%
                  </Body>
                </View>
                <Caption style={styles.statLabel}>Avg Fill Rate</Caption>
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
    padding: spacing.md,
    elevation: 1,
    boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.06)',
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

  // View Toggle
  viewToggle: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    backgroundColor: Colors.light.surface,
    borderRadius: layout.borderRadius,
    padding: spacing.xs,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  toggleButton: {
    flex: 1,
    borderRadius: spacing.sm,
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
    fontWeight: '500',
  },

  // Legend
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.light.divider,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: Colors.light.textSecondary,
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  classCount: {
    color: Colors.light.textMuted,
    fontStyle: 'italic',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyStateText: {
    color: Colors.light.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyStateSubtext: {
    color: Colors.light.textMuted,
    textAlign: 'center',
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
  },
  classDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  classDetailText: {
    color: Colors.light.textSecondary,
  },
  classActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  classAction: {
    padding: spacing.xs,
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
});

export default ScheduleOverview; 