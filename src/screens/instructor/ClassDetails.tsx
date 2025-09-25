import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Button as PaperButton, Card as PaperCard } from 'react-native-paper';
import { useSelector } from 'react-redux';

import StatusChip from '../../../components/ui/StatusChip';
import { Body, Caption, H1, H2 } from '../../../components/ui/Typography';
import { Colors } from '../../../constants/Colors';
import { spacing } from '../../../constants/Spacing';
import WebCompatibleIcon from '../../components/WebCompatibleIcon';
import { bookingService } from '../../services/bookingService';
import { BackendClass, classService } from '../../services/classService';
import { RootState } from '../../store';
import { shadows } from '../../utils/shadows';

type RouteParams = {
  params: {
    classId: string;
  };
};

function ClassDetails() {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useSelector((state: RootState) => state.auth);
  const [classData, setClassData] = useState<BackendClass | null>(null);
  const [loading, setLoading] = useState(true);
  const [attendees, setAttendees] = useState<any[]>([]);
  const [waitlist, setWaitlist] = useState<any[]>([]);
  const [loadingAttendees, setLoadingAttendees] = useState(false);
  const [loadingWaitlist, setLoadingWaitlist] = useState(false);

  const classId = (route.params as any)?.classId;

  useEffect(() => {
    if (classId) {
      loadClassDetails();
    }
  }, [classId]);

  const loadClassDetails = async () => {
    try {
      setLoading(true);
      
      console.log('Loading class details for ID:', classId);
      
      // Get class details
      const classResponse = await classService.getClassById(classId);

      if (classResponse.success && classResponse.data) {
        console.log('Class details loaded successfully:', classResponse.data.name);
        setClassData(classResponse.data);
        
        // Load real attendees and waitlist data
        await loadAttendees();
        await loadWaitlist();
      } else {
        console.error('Failed to load class details:', classResponse.error);
        Alert.alert('Error', 'Failed to load class details');
      }
    } catch (error) {
      console.error('Failed to load class details:', error);
      Alert.alert('Error', 'Failed to load class details');
    } finally {
      setLoading(false);
    }
  };

  const loadAttendees = async () => {
    try {
      setLoadingAttendees(true);
      const attendeesResponse = await bookingService.getClassAttendees(classId);
      
      if (attendeesResponse.success && attendeesResponse.data) {
        setAttendees(attendeesResponse.data);
      } else {
        console.error('Failed to load attendees:', attendeesResponse.error);
        setAttendees([]);
      }
    } catch (error) {
      console.error('Error loading attendees:', error);
      setAttendees([]);
    } finally {
      setLoadingAttendees(false);
    }
  };

  const loadWaitlist = async () => {
    try {
      setLoadingWaitlist(true);
      const waitlistResponse = await bookingService.getClassWaitlist(classId);
      
      if (waitlistResponse.success && waitlistResponse.data) {
        setWaitlist(waitlistResponse.data);
      } else {
        console.error('Failed to load waitlist:', waitlistResponse.error);
        setWaitlist([]);
      }
    } catch (error) {
      console.error('Error loading waitlist:', error);
      setWaitlist([]);
    } finally {
      setLoadingWaitlist(false);
    }
  };

  const handlePromoteFromWaitlist = (attendeeId: string) => {
    Alert.alert(
      'Promote from Waitlist',
      'Are you sure you want to promote this person from the waitlist?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Promote',
          onPress: async () => {
            try {
              // Leave waitlist (this will trigger promotion logic)
              const response = await bookingService.leaveWaitlist(Number(attendeeId));
              
              if (response.success) {
                Alert.alert('Success', 'Attendee promoted from waitlist');
                // Reload attendees and waitlist
                await loadAttendees();
                await loadWaitlist();
              } else {
                Alert.alert('Error', response.error || 'Failed to promote attendee');
              }
            } catch (error) {
              console.error('Error promoting attendee:', error);
              Alert.alert('Error', 'Failed to promote attendee');
            }
          }
        }
      ]
    );
  };


  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Body>Loading class details...</Body>
      </View>
    );
  }

  if (!classData) {
    return (
      <View style={styles.errorContainer}>
        <Body>Class not found</Body>
        <PaperButton onPress={() => navigation.goBack()}>
          Go Back
        </PaperButton>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Class Header */}
        <PaperCard style={styles.card}>
          <PaperCard.Content style={styles.cardContent}>
            <View style={styles.classHeader}>
              <H1 style={{
                ...styles.className,
                color: getStatusChipState(classData) === 'warning' 
                  ? (getStatusText(classData) === 'Full' ? Colors.light.error : Colors.light.warning)
                  : Colors.light.text
              }}>{classData.name}</H1>
              <StatusChip 
                state={getStatusChipState(classData)}
                text={getStatusText(classData)}
              />
            </View>
            
            <View style={styles.classInfo}>
              <View style={styles.infoRow}>
                <WebCompatibleIcon name="schedule" size={20} color={Colors.light.textSecondary} />
                <Body style={styles.infoText}>
                  {formatDate(classData.date)} at {formatTime(classData.time)}
                </Body>
              </View>
              
              <View style={styles.infoRow}>
                <WebCompatibleIcon name="people" size={20} color={Colors.light.textSecondary} />
                <Body style={styles.infoText}>
                  {classData.enrolled || 0}/{classData.capacity} enrolled
                </Body>
              </View>
              
              {classData.room && (
                <View style={styles.infoRow}>
                  <WebCompatibleIcon name="location-on" size={20} color={Colors.light.textSecondary} />
                  <Body style={styles.infoText}>{classData.room}</Body>
                </View>
              )}
              
              {classData.duration && (
                <View style={styles.infoRow}>
                  <WebCompatibleIcon name="timer" size={20} color={Colors.light.textSecondary} />
                  <Body style={styles.infoText}>{classData.duration} minutes</Body>
                </View>
              )}
            </View>
          </PaperCard.Content>
        </PaperCard>

        {/* Attendees */}
        <PaperCard style={styles.card}>
          <PaperCard.Content style={styles.cardContent}>
            <H2 style={styles.sectionTitle}>Attendees ({attendees.length})</H2>
            
                         {loadingAttendees ? (
               <View style={styles.emptyState}>
                 <Caption style={styles.emptyText}>Loading attendees...</Caption>
               </View>
             ) : attendees.length > 0 ? (
               attendees.map((attendee) => (
                 <View key={attendee.id} style={styles.attendeeItem}>
                   <View style={styles.attendeeInfo}>
                     <Body style={styles.attendeeName}>
                       {attendee.users?.name || attendee.user_name || 'Unknown User'}
                     </Body>
                     <Caption style={styles.attendeeEmail}>
                       {attendee.users?.email || attendee.user_email || 'No email'}
                     </Caption>
                     <Caption style={styles.joinTime}>
                       Joined: {attendee.created_at ? new Date(attendee.created_at).toLocaleString() : 'Unknown time'}
                     </Caption>
                   </View>
                 </View>
               ))
             ) : (
               <View style={styles.emptyState}>
                 <Caption style={styles.emptyText}>No attendees yet</Caption>
               </View>
             )}
          </PaperCard.Content>
        </PaperCard>

                 {/* Waitlist */}
         {waitlist.length > 0 && (
           <PaperCard style={styles.card}>
             <PaperCard.Content style={styles.cardContent}>
               <H2 style={styles.sectionTitle}>Waitlist ({waitlist.length})</H2>
               
               {loadingWaitlist ? (
                 <View style={styles.emptyState}>
                   <Caption style={styles.emptyText}>Loading waitlist...</Caption>
                 </View>
               ) : (
                 waitlist.map((attendee) => (
                   <View key={attendee.id} style={styles.attendeeItem}>
                     <View style={styles.attendeeInfo}>
                       <Body style={styles.attendeeName}>
                         {attendee.users?.name || 'Unknown User'}
                       </Body>
                       <Caption style={styles.attendeeEmail}>
                         {attendee.users?.email || 'No email'}
                       </Caption>
                       <Caption style={styles.joinTime}>
                         Joined: {attendee.created_at ? new Date(attendee.created_at).toLocaleString() : 'Unknown time'}
                       </Caption>
                       <Caption style={styles.waitlistPosition}>Position: {attendee.position}</Caption>
                     </View>
                     
                     <PaperButton 
                       mode="contained" 
                       compact
                       style={styles.promoteButton}
                       labelStyle={styles.promoteButtonLabel}
                       onPress={() => handlePromoteFromWaitlist(attendee.id)}
                     >
                       Promote
                     </PaperButton>
                   </View>
                 ))
               )}
             </PaperCard.Content>
           </PaperCard>
         )}

                 {/* Actions */}
         <PaperCard style={styles.card}>
           <PaperCard.Content style={styles.cardContent}>
             <H2 style={styles.sectionTitle}>Actions</H2>
             
             <View style={styles.actionButtons}>
               <PaperButton 
                 mode="contained" 
                 style={styles.actionButton}
                 labelStyle={styles.actionButtonLabel}
                 icon={() => <WebCompatibleIcon name="refresh" size={20} color="white" />}
                 onPress={async () => {
                   // Refresh data
                   await loadAttendees();
                   await loadWaitlist();
                   Alert.alert('Success', 'Data refreshed');
                 }}
               >
                 Refresh Data
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
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
  cardContent: {
    padding: spacing.lg,
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  className: {
    color: Colors.light.text,
    flex: 1,
    marginRight: spacing.md,
  },
  classInfo: {
    gap: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    color: Colors.light.text,
    marginLeft: spacing.sm,
  },
  sectionTitle: {
    color: Colors.light.text,
    marginBottom: spacing.md,
  },
  attendeeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  attendeeInfo: {
    flex: 1,
  },
  attendeeName: {
    color: Colors.light.text,
    fontWeight: '500',
  },
  attendeeEmail: {
    color: Colors.light.textSecondary,
    marginTop: spacing.xs,
  },
  joinTime: {
    color: Colors.light.textMuted,
    marginTop: spacing.xs,
    fontSize: 11,
  },
  waitlistPosition: {
    color: Colors.light.warning,
    marginTop: spacing.xs,
  },
  promoteButton: {
    marginLeft: spacing.md,
    backgroundColor: Colors.light.success,
  },
  promoteButtonLabel: {
    color: 'white',
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    color: Colors.light.textSecondary,
  },
  actionButtons: {
    gap: spacing.md,
  },
  actionButton: {
    marginBottom: spacing.sm,
  },
  actionButtonLabel: {
    color: 'white',
    fontWeight: '600',
  },
});

export default ClassDetails; 