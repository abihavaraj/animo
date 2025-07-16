import StatusChip from '@/components/ui/StatusChip';
import { Body, Caption, H1, H2, H3 } from '@/components/ui/Typography';
import { Colors } from '@/constants/Colors';
import { layout, spacing } from '@/constants/Spacing';
import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { FAB, Modal, Button as PaperButton, Card as PaperCard, Portal } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { classService } from '../../services/classService';
import { AppDispatch, RootState } from '../../store';
import { shadows } from '../../utils/shadows';

interface ClassItem {
  id: number;
  name: string;
  date: string;
  time: string;
  duration: number;
  capacity: number;
  enrolled: number;
  level: string;
  equipment_type: string;
  status: string;
}

function ClassManagement() {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const [refreshing, setRefreshing] = useState(false);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalVisible, setCreateModalVisible] = useState(false);

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      setLoading(true);
      const response = await classService.getClasses({
        instructor: user?.id?.toString(),
        status: 'active'
      });

              if (response.success && response.data) {
          setClasses(response.data.map(cls => ({
            ...cls,
            level: cls.level || 'beginner',
            equipment_type: cls.equipment_type || 'mat'
          })));
        }
    } catch (error) {
      console.error('Failed to load classes:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadClasses();
  };

  const handleCreateClass = () => {
    setCreateModalVisible(true);
  };

  const handleEditClass = (classId: number) => {
    console.log('Edit class:', classId);
  };

  const handleDeleteClass = (classId: number) => {
    Alert.alert(
      'Delete Class',
      'Are you sure you want to delete this class? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => confirmDeleteClass(classId) },
      ]
    );
  };

  const confirmDeleteClass = async (classId: number) => {
    try {
      // Implementation would delete the class
      console.log('Deleting class:', classId);
      loadClasses(); // Refresh list
    } catch (error) {
      console.error('Failed to delete class:', error);
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
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

  const getStatusChipState = (cls: ClassItem) => {
    const enrollmentPercentage = (cls.enrolled / cls.capacity) * 100;
    
    if (enrollmentPercentage >= 100) return 'warning';
    if (enrollmentPercentage >= 80) return 'info';
    return 'success';
  };

  const getStatusText = (cls: ClassItem) => {
    const enrollmentPercentage = (cls.enrolled / cls.capacity) * 100;
    
    if (enrollmentPercentage >= 100) return 'Full';
    if (enrollmentPercentage >= 80) return 'Almost Full';
    return 'Available';
  };

  const isPastClass = (date: string, time: string) => {
    const classDateTime = new Date(`${date}T${time}`);
    return classDateTime < new Date();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <H1 style={styles.headerTitle}>Class Management</H1>
        <Caption style={styles.headerSubtitle}>Create and manage your classes</Caption>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Quick Stats */}
        <PaperCard style={styles.card}>
          <PaperCard.Content style={styles.cardContent}>
            <H2 style={styles.cardTitle}>Overview</H2>
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
                <Caption style={styles.statLabel}>Fill Rate</Caption>
                    </View>
                      </View>
          </PaperCard.Content>
        </PaperCard>

        {/* Classes List */}
        <PaperCard style={styles.card}>
          <PaperCard.Content style={styles.cardContent}>
            <View style={styles.sectionHeader}>
              <H2 style={styles.cardTitle}>My Classes</H2>
              <PaperButton 
                mode="contained" 
                style={styles.createButton}
                labelStyle={styles.createButtonLabel}
                icon={() => <MaterialIcons name="add" size={16} color="white" />}
                onPress={handleCreateClass}
                compact
              >
                Create
              </PaperButton>
                  </View>
                  
            {classes.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons name="event-note" size={48} color={Colors.light.textMuted} />
                <Body style={styles.emptyStateText}>No classes created yet</Body>
                <Caption style={styles.emptyStateSubtext}>Create your first class to get started</Caption>
                <PaperButton 
                  mode="outlined" 
                  style={styles.emptyStateButton}
                  labelStyle={styles.emptyStateButtonLabel}
                  onPress={handleCreateClass}
                >
                  Create First Class
                </PaperButton>
              </View>
            ) : (
              classes.map((cls) => {
                const isPast = isPastClass(cls.date, cls.time);
                
                return (
                  <View key={cls.id} style={styles.classItem}>
                    <View style={styles.classInfo}>
                      <View style={styles.classHeader}>
                        <Body style={styles.className}>{cls.name}</Body>
                        <View style={styles.chipContainer}>
                          <StatusChip 
                            state={getLevelChipState(cls.level)}
                            text={cls.level}
                            size="small"
                          />
                          <StatusChip 
                            state={getStatusChipState(cls)}
                            text={getStatusText(cls)}
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
                      
                      {isPast && (
                        <View style={styles.pastIndicator}>
                          <MaterialIcons name="history" size={16} color={Colors.light.textMuted} />
                          <Caption style={styles.pastText}>Completed</Caption>
                        </View>
                      )}
                    </View>
                    
                    <View style={styles.classActions}>
                      <TouchableOpacity 
                        style={styles.actionButton}
                        onPress={() => handleEditClass(cls.id)}
                      >
                        <MaterialIcons name="edit" size={20} color={Colors.light.accent} />
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={styles.actionButton}
                        onPress={() => handleDeleteClass(cls.id)}
                      >
                        <MaterialIcons name="delete" size={20} color={Colors.light.error} />
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={styles.actionButton}
                        onPress={() => console.log('View details:', cls.id)}
                      >
                        <MaterialIcons name="chevron-right" size={20} color={Colors.light.textMuted} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </PaperCard.Content>
        </PaperCard>

        {/* Quick Actions */}
        <PaperCard style={styles.card}>
          <PaperCard.Content style={styles.cardContent}>
            <H2 style={styles.cardTitle}>Quick Actions</H2>
            
            <View style={styles.actionGrid}>
              <TouchableOpacity style={styles.quickAction} onPress={() => console.log('Bulk Edit')}>
                <View style={styles.quickActionIcon}>
                  <MaterialIcons name="edit-note" size={24} color={Colors.light.accent} />
                </View>
                <Body style={styles.quickActionTitle}>Bulk Edit</Body>
                <Caption style={styles.quickActionSubtitle}>Edit multiple classes</Caption>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.quickAction} onPress={() => console.log('Export Schedule')}>
                <View style={styles.quickActionIcon}>
                  <MaterialIcons name="file-download" size={24} color={Colors.light.primary} />
                </View>
                <Body style={styles.quickActionTitle}>Export</Body>
                <Caption style={styles.quickActionSubtitle}>Download schedule</Caption>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.quickAction} onPress={() => console.log('Class Templates')}>
                <View style={styles.quickActionIcon}>
                  <MaterialIcons name="content-copy" size={24} color={Colors.light.warning} />
                </View>
                <Body style={styles.quickActionTitle}>Templates</Body>
                <Caption style={styles.quickActionSubtitle}>Use saved templates</Caption>
              </TouchableOpacity>
            </View>
          </PaperCard.Content>
        </PaperCard>
      </ScrollView>

      {/* Create Class FAB */}
      <FAB
        icon={() => <MaterialIcons name="add" size={24} color="white" />}
        label="New Class"
        style={styles.fab}
        onPress={handleCreateClass}
      />

      {/* Create Class Modal - placeholder */}
      <Portal>
        <Modal 
          visible={createModalVisible} 
          onDismiss={() => setCreateModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <PaperCard style={styles.modalCard}>
            <PaperCard.Content style={styles.modalContent}>
              <H3 style={styles.modalTitle}>Create New Class</H3>
              <Body style={styles.modalMessage}>Class creation form would be implemented here.</Body>

              <View style={styles.modalActions}>
                <PaperButton 
                  mode="outlined" 
                  style={styles.modalCancelButton}
                  onPress={() => setCreateModalVisible(false)}
                >
                  Cancel
                </PaperButton>
                
                <PaperButton 
                  mode="contained" 
                  style={styles.modalConfirmButton}
                  onPress={() => {
                    setCreateModalVisible(false);
                    console.log('Create class implementation needed');
                  }}
                >
                  Create
                </PaperButton>
              </View>
            </PaperCard.Content>
          </PaperCard>
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
  createButton: {
    backgroundColor: Colors.light.accent,
    borderRadius: spacing.sm,
  },
  createButtonLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.textOnAccent,
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

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyStateText: {
    color: Colors.light.textSecondary,
  },
  emptyStateSubtext: {
    color: Colors.light.textMuted,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  emptyStateButton: {
    borderColor: Colors.light.accent,
    borderRadius: layout.borderRadius,
  },
  emptyStateButtonLabel: {
    color: Colors.light.accent,
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
    marginBottom: spacing.xs,
  },
  classDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  classDetailText: {
    color: Colors.light.textSecondary,
  },
  pastIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  pastText: {
    color: Colors.light.textMuted,
    fontStyle: 'italic',
  },
  classActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionButton: {
    width: 40,
    height: 40,
    backgroundColor: Colors.light.surfaceVariant,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Quick Actions Grid
  actionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.light.surfaceVariant,
    padding: spacing.md,
    borderRadius: layout.borderRadius,
  },
  quickActionIcon: {
    width: 50,
    height: 50,
    backgroundColor: Colors.light.surface,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  quickActionTitle: {
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: spacing.xs,
  },
  quickActionSubtitle: {
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },

  // FAB
  fab: {
    position: 'absolute',
    margin: spacing.md,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.light.accent,
    ...shadows.accent,
  },

  // Modal Styles
  modalContainer: {
    padding: spacing.lg,
    justifyContent: 'center',
  },
  modalCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: layout.borderRadius,
  },
  modalContent: {
    padding: spacing.xl,
  },
  modalTitle: {
    color: Colors.light.text,
    marginBottom: spacing.md,
  },
  modalMessage: {
    color: Colors.light.textSecondary,
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  modalCancelButton: {
    flex: 1,
    borderColor: Colors.light.border,
    borderRadius: layout.borderRadius,
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: Colors.light.accent,
    borderRadius: layout.borderRadius,
  },
});

export default ClassManagement; 