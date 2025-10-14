import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Button as PaperButton, Card as PaperCard } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import StatusChip from '../../components/ui/StatusChip';
import { Body, Caption, H1, H2 } from '../../components/ui/Typography';
import { Colors } from '../../constants/Colors';
import { layout, spacing } from '../../constants/Spacing';
import { AppDispatch, RootState } from '../store';
import { shadows } from '../utils/shadows';

function HomeScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation();
  const { user } = useSelector((state: RootState) => state.auth);
  const [refreshing, setRefreshing] = useState(false);
  const [todaysClasses, setTodaysClasses] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);

  useEffect(() => {
    loadHomeData();
  }, []);

  const loadHomeData = async () => {
    try {
      // Simulate loading home data
      setTodaysClasses([
        {
          id: 1,
          name: 'Power Mat',
          instructor: 'Sarah Johnson',
          time: '09:00',
          duration: 60,
          spotsLeft: 3,
          totalSpots: 15,
          level: 'Intermediate',
        },
        {
          id: 2,
          name: 'Reformer Flow',
          instructor: 'Mike Thompson',
          time: '14:30',
          duration: 45,
          spotsLeft: 0,
          totalSpots: 10,
          level: 'Beginner',
        },
        {
          id: 3,
          name: 'Gentle Restoration',
          instructor: 'Sarah Johnson',
          time: '18:00',
          duration: 45,
          spotsLeft: 6,
          totalSpots: 12,
          level: 'All Levels',
        },
      ]);

      setAnnouncements([
        {
          id: 1,
          title: 'New Spring Schedule',
          message: 'Check out our updated class schedule with new morning sessions!',
          type: 'info',
          date: '2025-06-05',
        },
        {
          id: 2,
          title: 'Holiday Hours',
          message: 'Studio will be closed on June 15th for maintenance.',
          type: 'warning',
          date: '2025-06-03',
        },
      ]);
    } catch (error) {
      console.error('Failed to load home data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadHomeData();
  };

  const handleBookClass = (classId: number) => {
    console.log('Book class:', classId);
  };

  const handleViewAllClasses = () => {
    console.log('Navigate to all classes');
  };

  const handleViewProfile = () => {
    console.log('Navigate to profile');
  };

  const handleViewSchedule = () => {
    console.log('Navigate to schedule');
  };



  const getWelcomeMessage = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getLevelChipState = (level: string) => {
    switch (level.toLowerCase()) {
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

  const getAnnouncementChipState = (type: string) => {
    switch (type) {
      case 'info':
        return 'info';
      case 'warning':
        return 'warning';
      case 'success':
        return 'success';
      default:
        return 'neutral';
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <H1 style={styles.headerTitle}>ANIMO Pilates Studio</H1>
        <Caption style={styles.headerSubtitle}>
          {getWelcomeMessage()}, {user?.name?.split(' ')[0] || 'Guest'}
        </Caption>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Quick Actions */}
        <PaperCard style={styles.card}>
          <PaperCard.Content style={styles.cardContent}>
            <H2 style={styles.cardTitle}>Quick Actions</H2>
            
            <View style={styles.actionGrid}>
              <PaperButton 
                mode="contained" 
                style={styles.primaryAction}
                labelStyle={styles.primaryActionLabel}
                icon={() => <MaterialIcons name="search" size={20} color="white" />}
                onPress={handleViewAllClasses}
              >
                Browse Classes
              </PaperButton>
              
              <PaperButton 
                mode="outlined" 
                style={styles.secondaryAction}
                labelStyle={styles.secondaryActionLabel}
                icon={() => <MaterialIcons name="calendar-today" size={20} color={Colors.light.textSecondary} />}
                onPress={handleViewSchedule}
              >
                My Schedule
              </PaperButton>
            </View>

            <View style={styles.actionGrid}>
              <PaperButton 
                mode="outlined" 
                style={styles.secondaryAction}
                labelStyle={styles.secondaryActionLabel}
                icon={() => <MaterialIcons name="person" size={20} color={Colors.light.textSecondary} />}
                onPress={handleViewProfile}
              >
                My Profile
              </PaperButton>
              
              <PaperButton 
                mode="outlined" 
                style={styles.secondaryAction}
                labelStyle={styles.secondaryActionLabel}
                icon={() => <MaterialIcons name="support" size={20} color={Colors.light.textSecondary} />}
                onPress={() => console.log('Contact Support')}
              >
                Support
              </PaperButton>
            </View>

            <View style={styles.actionGrid}>
            </View>
            <View style={styles.actionGrid}>
              <PaperButton 
                mode="outlined" 
                style={styles.secondaryAction}
                labelStyle={styles.secondaryActionLabel}
                icon={() => <MaterialIcons name="lock" size={20} color={Colors.light.textSecondary} />}
                onPress={handleAuthTest}
              >
                Auth Test
              </PaperButton>
              <PaperButton 
                mode="outlined" 
                style={styles.secondaryAction}
                labelStyle={styles.secondaryActionLabel}
                icon={() => <MaterialIcons name="network-check" size={20} color={Colors.light.textSecondary} />}
                onPress={handleNetworkTest}
              >
                Network Test
              </PaperButton>
            </View>
          </PaperCard.Content>
        </PaperCard>

        {/* Today's Classes */}
        <PaperCard style={styles.card}>
          <PaperCard.Content style={styles.cardContent}>
            <View style={styles.sectionHeader}>
              <H2 style={styles.cardTitle}>Today&apos;s Classes</H2>
              <PaperButton 
                mode="text" 
                compact
                labelStyle={styles.viewAllLabel}
                onPress={handleViewAllClasses}
              >
                View All
              </PaperButton>
            </View>
            
            {todaysClasses.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons name="event-note" size={48} color={Colors.light.textMuted} />
                <Body style={styles.emptyStateText}>No classes scheduled for today</Body>
                <Caption style={styles.emptyStateSubtext}>Check back tomorrow or browse all classes</Caption>
              </View>
            ) : (
              todaysClasses.map((classItem) => (
                <View key={classItem.id} style={styles.classItem}>
                  <View style={styles.classInfo}>
                    <View style={styles.classHeader}>
                      <Body style={styles.className}>{classItem.name}</Body>
                      <StatusChip 
                        state={getLevelChipState(classItem.level)}
                        text={classItem.level}
                        size="small"
                      />
                    </View>
                    
                    <View style={styles.classDetails}>
                      <View style={styles.classDetailItem}>
                        <MaterialIcons name="person" size={16} color={Colors.light.textSecondary} />
                        <Caption style={styles.classDetailText}>{classItem.instructor}</Caption>
                      </View>
                      
                      <View style={styles.classDetailItem}>
                        <MaterialIcons name="schedule" size={16} color={Colors.light.textSecondary} />
                        <Caption style={styles.classDetailText}>
                          {`${classItem.time} (${classItem.duration} min)`}
                        </Caption>
                      </View>

                      {classItem.room && (
                        <View style={styles.classDetailItem}>
                          <MaterialIcons name="place" size={16} color={Colors.light.textSecondary} />
                          <Caption style={styles.classDetailText}>{classItem.room}</Caption>
                        </View>
                      )}

                      <View style={styles.classDetailItem}>
                        <MaterialIcons 
                          name="people" 
                          size={16} 
                          color={classItem.spotsLeft === 0 ? Colors.light.warning : Colors.light.textSecondary} 
                        />
                                                 <Caption style={{
                           ...styles.classDetailText,
                           color: classItem.spotsLeft === 0 ? Colors.light.warning : Colors.light.textSecondary
                         }}>
                           {classItem.spotsLeft === 0 
                             ? 'Fully Booked' 
                             : `${classItem.spotsLeft} spots available`}
                         </Caption>
                      </View>
                    </View>
                  </View>
                  
                  <PaperButton 
                    mode={classItem.spotsLeft > 0 ? "contained" : "outlined"}
                    disabled={classItem.spotsLeft === 0}
                    style={[styles.bookButton, classItem.spotsLeft === 0 && styles.disabledButton]}
                    labelStyle={[styles.bookButtonLabel, classItem.spotsLeft === 0 && styles.disabledButtonLabel]}
                    onPress={() => handleBookClass(classItem.id)}
                  >
                    {classItem.spotsLeft > 0 ? 'Book' : 'Full'}
                  </PaperButton>
                </View>
              ))
            )}
          </PaperCard.Content>
        </PaperCard>

        {/* Announcements */}
        {announcements.length > 0 && (
          <PaperCard style={styles.card}>
            <PaperCard.Content style={styles.cardContent}>
              <H2 style={styles.cardTitle}>Studio Updates</H2>
              
              {announcements.map((announcement) => (
                <View key={announcement.id} style={styles.announcementItem}>
                  <View style={styles.announcementIcon}>
                    <MaterialIcons 
                      name={announcement.type === 'warning' ? 'warning' : 'info'} 
                      size={20} 
                      color={announcement.type === 'warning' ? Colors.light.warning : Colors.light.accent} 
                    />
                  </View>
                  
                  <View style={styles.announcementContent}>
                    <View style={styles.announcementHeader}>
                      <Body style={styles.announcementTitle}>{announcement.title}</Body>
                      <StatusChip 
                        state={getAnnouncementChipState(announcement.type)}
                        text={announcement.type.charAt(0).toUpperCase() + announcement.type.slice(1)}
                        size="small"
                      />
                    </View>
                    
                    <Caption style={styles.announcementMessage}>{announcement.message}</Caption>
                    <Caption style={styles.announcementDate}>{announcement.date}</Caption>
                  </View>
                </View>
              ))}
            </PaperCard.Content>
          </PaperCard>
        )}

        {/* Studio Info */}
        <PaperCard style={styles.card}>
          <PaperCard.Content style={styles.cardContent}>
            <H2 style={styles.cardTitle}>Studio Information</H2>
            
            <View style={styles.infoItem}>
              <View style={styles.infoIcon}>
                <MaterialIcons name="location-on" size={20} color={Colors.light.accent} />
              </View>
              <View style={styles.infoContent}>
                <Body style={styles.infoText}>123 Wellness Street</Body>
                <Caption style={styles.infoSubtext}>Downtown, CA 90210</Caption>
              </View>
            </View>
            
            <View style={styles.infoItem}>
              <View style={styles.infoIcon}>
                <MaterialIcons name="phone" size={20} color={Colors.light.accent} />
              </View>
              <View style={styles.infoContent}>
                <Body style={styles.infoText}>(555) 123-4567</Body>
                <Caption style={styles.infoSubtext}>Mon-Fri 6AM-9PM, Sat-Sun 8AM-6PM</Caption>
              </View>
            </View>
            
            <View style={styles.infoItem}>
              <View style={styles.infoIcon}>
                <MaterialIcons name="email" size={20} color={Colors.light.accent} />
              </View>
              <View style={styles.infoContent}>
                <Body style={styles.infoText}>hello@animostudio.com</Body>
                <Caption style={styles.infoSubtext}>We&apos;ll respond within 24 hours</Caption>
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

  // Action Grid
  actionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.sm,
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
  bookButton: {
    borderRadius: spacing.sm,
    marginLeft: spacing.md,
    backgroundColor: Colors.light.accent,
  },
  bookButtonLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.textOnAccent,
  },
  disabledButton: {
    backgroundColor: 'transparent',
    borderColor: Colors.light.border,
  },
  disabledButtonLabel: {
    color: Colors.light.textMuted,
  },

  // Announcement Items
  announcementItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.divider,
    gap: spacing.md,
  },
  announcementIcon: {
    width: 40,
    height: 40,
    backgroundColor: Colors.light.surfaceVariant,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  announcementContent: {
    flex: 1,
  },
  announcementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  announcementTitle: {
    fontWeight: '600',
    color: Colors.light.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  announcementMessage: {
    color: Colors.light.textSecondary,
    marginBottom: spacing.xs,
    lineHeight: 20,
  },
  announcementDate: {
    color: Colors.light.textMuted,
  },

  // Info Items
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.divider,
    gap: spacing.md,
  },
  infoIcon: {
    width: 40,
    height: 40,
    backgroundColor: Colors.light.surfaceVariant,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoText: {
    color: Colors.light.text,
    marginBottom: spacing.xs,
  },
  infoSubtext: {
    color: Colors.light.textMuted,
  },
});

export default HomeScreen; 