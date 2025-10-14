import StatusChip from '@/components/ui/StatusChip';
import { Body, Caption, H1, H2, H3 } from '@/components/ui/Typography';
import { Colors } from '@/constants/Colors';
import { spacing } from '@/constants/Spacing';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    Image,
    Keyboard,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { Avatar, Chip, Button as PaperButton, Card as PaperCard } from 'react-native-paper';
import { useSelector } from 'react-redux';
import WebCompatibleIcon from '../../components/WebCompatibleIcon';
import {
    ClientMedicalUpdate,
    ClientProgressAssessment,
    ClientProgressPhoto,
    InstructorClientAssignment,
    instructorClientService,
} from '../../services/instructorClientService';
import { RootState } from '../../store';

// Simple interface for selected client with medical conditions
interface SelectedClient extends InstructorClientAssignment {
  progressPhotos: ClientProgressPhoto[];
  medicalUpdates: ClientMedicalUpdate[];
  assessments: ClientProgressAssessment[];
  client_medical_conditions?: string;
  client_emergency_contact?: string;
}

function MyClients() {
  const { t } = useTranslation();
  const { user } = useSelector((state: RootState) => state.auth);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<InstructorClientAssignment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Simple modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedClient, setSelectedClient] = useState<SelectedClient | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'photos' | 'medical' | 'assessments' | 'classes'>('overview');

  // Medical update states
  const [medicalUpdateVisible, setMedicalUpdateVisible] = useState(false);
  const [newMedicalConditions, setNewMedicalConditions] = useState('');
  const [updateReason, setUpdateReason] = useState('');
  const [severityLevel, setSeverityLevel] = useState<'minor' | 'moderate' | 'significant' | 'major'>('minor');

  // Photo upload states
  const [photoUploadVisible, setPhotoUploadVisible] = useState(false);
  const [photoType, setPhotoType] = useState<'before' | 'after' | 'progress' | 'assessment'>('before');
  const [photoDescription, setPhotoDescription] = useState('');
  const [bodyArea, setBodyArea] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');
  const [selectedImage, setSelectedImage] = useState<ImagePicker.ImagePickerResult | null>(null);

  // Assessment states
  const [assessmentVisible, setAssessmentVisible] = useState(false);
  const [assessmentNotes, setAssessmentNotes] = useState('');

  // Class assignment states
  const [classAssignmentVisible, setClassAssignmentVisible] = useState(false);
  const [availableClasses, setAvailableClasses] = useState<any[]>([]);
  const [clientBookings, setClientBookings] = useState<any[]>([]);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const response = await instructorClientService.getInstructorClients(user.id);
      if (response.success) {
        setClients(response.data || []);
      }
    } catch (error) {
      console.error('Failed to load clients:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadClients();
  };

  const openClientDetails = async (client: InstructorClientAssignment) => {
    try {
      console.log('Opening client details for:', client.client_name);
      // Load additional client data including user profile medical conditions
      const [photosResponse, medicalResponse, assessmentsResponse, userProfileResponse] = await Promise.all([
        instructorClientService.getClientProgressPhotos(client.client_id, user?.id),
        instructorClientService.getClientMedicalUpdates(client.client_id, user?.id),
        instructorClientService.getClientProgressAssessments(client.client_id, user?.id),
        instructorClientService.getClientUserProfile(client.client_id),
      ]);

      const selectedClientData: SelectedClient = {
        ...client,
        progressPhotos: photosResponse.success ? photosResponse.data! : [],
        medicalUpdates: medicalResponse.success ? medicalResponse.data! : [],
        assessments: assessmentsResponse.success ? assessmentsResponse.data! : [],
        client_medical_conditions: userProfileResponse.success ? userProfileResponse.data?.medical_conditions : undefined,
        client_emergency_contact: userProfileResponse.success ? userProfileResponse.data?.emergency_contact : undefined,
      };

      console.log('Setting selected client and opening modal');
      setSelectedClient(selectedClientData);
      setModalVisible(true);
      setActiveTab('overview'); // Always start with overview
    } catch (error) {
      console.error('Failed to load client details:', error);
      Alert.alert('Error', 'Failed to load client details');
    }
  };

  const launchCamera = async () => {
    try {
      // Show action sheet to choose between camera and library
      Alert.alert(
        'Select Photo Source',
        'Choose how you want to add a photo',
        [
          {
            text: 'Take Photo',
            onPress: async () => {
              try {
                const { status } = await ImagePicker.requestCameraPermissionsAsync();
                if (status !== 'granted') {
                  Alert.alert('Permission Required', 'Camera permission is required to take photos');
                  return;
                }

                const result = await ImagePicker.launchCameraAsync({
                  mediaTypes: ImagePicker.MediaTypeOptions.Images,
                  allowsEditing: false, // Disable cropping
                  quality: 1.0, // No quality limit
                });

                if (!result.canceled && result.assets && result.assets.length > 0) {
                  setSelectedImage(result);
                  console.log('Photo captured:', result.assets[0].uri);
                }
              } catch (error) {
                console.error('Camera error:', error);
                Alert.alert('Error', 'Failed to access camera');
              }
            }
          },
          {
            text: 'Choose from Library',
            onPress: async () => {
              try {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') {
                  Alert.alert('Permission Required', 'Photo library permission is required');
                  return;
                }

                const result = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ImagePicker.MediaTypeOptions.Images,
                  allowsEditing: false, // Disable cropping
                  quality: 1.0, // No quality limit
                });

                if (!result.canceled && result.assets && result.assets.length > 0) {
                  setSelectedImage(result);
                  console.log('Photo selected from library:', result.assets[0].uri);
                }
              } catch (error) {
                console.error('Library error:', error);
                Alert.alert('Error', 'Failed to access photo library');
              }
            }
          },
          {
            text: 'Cancel',
            style: 'cancel'
          }
        ]
      );
    } catch (error) {
      console.error('Photo picker error:', error);
      Alert.alert('Error', 'Failed to open photo picker');
    }
  };

  const handlePhotoUpload = async () => {
    if (!selectedClient || !user?.id) return;

    if (!photoDescription.trim() || !bodyArea.trim()) {
      Alert.alert('Error', 'Please fill in photo description and body area');
      return;
    }

    if (!selectedImage || !selectedImage.assets || selectedImage.assets.length === 0) {
      Alert.alert('Error', 'Please take a photo first');
      return;
    }

    try {
      const imageAsset = selectedImage.assets[0];
      const photoFile = {
        uri: imageAsset.uri,
        name: `${photoType}_photo_${Date.now()}.jpg`,
        type: 'image/jpeg',
        size: imageAsset.fileSize || 1024 * 100, // Use actual file size or default
      };

      const response = await instructorClientService.uploadProgressPhoto(
        photoFile,
        selectedClient.client_id,
        user.id,
        photoType,
        {
          description: photoDescription,
          bodyArea: bodyArea,
          sessionNotes: sessionNotes,
        }
      );

      if (response.success) {
        Alert.alert('Success', 'Photo uploaded successfully!');
        setPhotoUploadVisible(false);
        setPhotoDescription('');
        setBodyArea('');
        setSessionNotes('');
        setSelectedImage(null);
        // Return to main modal and refresh client details
        setTimeout(() => {
          setModalVisible(true);
          if (selectedClient) openClientDetails(selectedClient);
        }, 100);
      } else {
        Alert.alert('Error', response.error || 'Failed to upload photo');
      }
    } catch (error) {
      console.error('Photo upload error:', error);
      Alert.alert('Error', 'Failed to upload photo');
    }
  };

  const handleDeletePhoto = async (photoId: number) => {
    try {
      console.log('🗑️ Deleting progress photo:', photoId);
      
      const response = await instructorClientService.deleteProgressPhoto(photoId, user?.id);
      
      if (response.success) {
        Alert.alert('Success', 'Photo deleted successfully');
        console.log('✅ Photo deleted successfully');
        
        // Reload client data to refresh the photos list
        if (selectedClient) {
          await openClientDetails(selectedClient);
        }
      } else {
        Alert.alert('Error', response.error || 'Failed to delete photo');
        console.error('❌ Failed to delete photo:', response.error);
      }
    } catch (error) {
      console.error('❌ Exception while deleting photo:', error);
      Alert.alert('Error', 'Failed to delete photo');
    }
  };

  const confirmDeletePhoto = (photoId: number, photoDescription?: string) => {
    Alert.alert(
      'Delete Photo',
      `Are you sure you want to delete this progress photo${photoDescription ? `: ${photoDescription}` : ''}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleDeletePhoto(photoId),
        },
      ]
    );
  };

  const handleMedicalUpdate = async () => {
    if (!selectedClient || !newMedicalConditions.trim() || !updateReason.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const response = await instructorClientService.updateClientMedicalConditions(
        selectedClient.client_id,
        user!.id,
        newMedicalConditions,
        updateReason,
        severityLevel,
        severityLevel === 'major' // Require clearance for major updates
      );

      if (response.success) {
        Alert.alert('Success', 'Medical conditions updated successfully!');
        setMedicalUpdateVisible(false);
        setNewMedicalConditions('');
        setUpdateReason('');
        setSeverityLevel('minor');
        // Return to main modal and refresh client details
        setTimeout(() => {
          setModalVisible(true);
          if (selectedClient) openClientDetails(selectedClient);
        }, 100);
      } else {
        Alert.alert('Error', response.error || 'Failed to update medical conditions');
      }
    } catch (error) {
      console.error('Medical update error:', error);
      Alert.alert('Error', 'Failed to update medical conditions');
    }
  };

  const handleAssessmentSubmit = async () => {
    if (!selectedClient || !assessmentNotes.trim()) {
      Alert.alert('Error', 'Please add assessment notes');
      return;
    }

    try {
      const response = await instructorClientService.createProgressAssessment({
        client_id: selectedClient.client_id,
        instructor_id: user!.id,
        assessment_date: new Date().toISOString().split('T')[0],
        assessment_type: 'monthly',
        fitness_level: 'intermediate',
        overall_notes: assessmentNotes,
      });

      if (response.success) {
        Alert.alert('Success', 'Assessment added successfully!');
        setAssessmentVisible(false);
        setAssessmentNotes('');
        // Return to main modal and refresh client details
        setTimeout(() => {
          setModalVisible(true);
          if (selectedClient) openClientDetails(selectedClient);
        }, 100);
      } else {
        Alert.alert('Error', response.error || 'Failed to add assessment');
      }
    } catch (error) {
      console.error('Assessment submission error:', error);
      Alert.alert('Error', 'Failed to add assessment');
    }
  };

  // Class assignment functions
  const loadAvailableClasses = async () => {
    if (!user?.id) return;
    
    try {
      const response = await instructorClientService.getInstructorClasses(user.id);
      if (response.success) {
        setAvailableClasses(response.data || []);
      }
    } catch (error) {
      console.error('Failed to load available classes:', error);
    }
  };

  const loadClientBookings = async (clientId: string) => {
    try {
      // Import bookingService at the top of the file if not already imported
      const { bookingService } = await import('../../services/bookingService');
      const response = await bookingService.getBookings({ userId: clientId });
      if (response.success) {
        setClientBookings(response.data?.filter(booking => booking.status === 'confirmed') || []);
      }
    } catch (error) {
      console.error('Failed to load client bookings:', error);
    }
  };

  const handleAssignToClass = async (classId: string) => {
    if (!selectedClient || !user?.id) return;

    try {
      const response = await instructorClientService.assignClientToClass(
        selectedClient.client_id,
        classId,
        user.id
      );

      if (response.success) {
        Alert.alert('Success', 'Client assigned to class successfully!');
        loadClientBookings(selectedClient.client_id); // Refresh bookings
      } else {
        Alert.alert('Error', response.error || 'Failed to assign client to class');
      }
    } catch (error) {
      console.error('Class assignment error:', error);
      Alert.alert('Error', 'Failed to assign client to class');
    }
  };

  const handleUnassignFromClass = async (classId: string) => {
    if (!selectedClient || !user?.id) return;

    Alert.alert(
      'Confirm Unassign',
      'Are you sure you want to unassign this client from the class? Their remaining classes will be restored.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unassign',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await instructorClientService.unassignClientFromClass(
                selectedClient.client_id,
                classId,
                user.id
              );

              if (response.success) {
                Alert.alert('Success', 'Client unassigned from class successfully!');
                loadClientBookings(selectedClient.client_id); // Refresh bookings
              } else {
                Alert.alert('Error', response.error || 'Failed to unassign client from class');
              }
            } catch (error) {
              console.error('Class unassignment error:', error);
              Alert.alert('Error', 'Failed to unassign client from class');
            }
          }
        }
      ]
    );
  };

  const openClassAssignment = () => {
    if (!selectedClient) return;
    
    setModalVisible(false);
    setTimeout(() => {
      loadAvailableClasses();
      loadClientBookings(selectedClient.client_id);
      setClassAssignmentVisible(true);
    }, 100);
  };

  const renderClientCard = (client: InstructorClientAssignment) => {
    const activeSubscription = getActiveSubscription(client);
    
    return (
      <PaperCard key={`client-${client.client_id}-${client.instructor_id}`} style={styles.clientCard}>
        <TouchableOpacity onPress={() => openClientDetails(client)}>
          <PaperCard.Content style={styles.clientCardContent}>
            <View style={styles.clientHeader}>
              <Avatar.Text
                size={50}
                label={client.client_name?.charAt(0).toUpperCase() || 'C'}
                style={styles.avatar}
              />
              <View style={styles.clientInfo}>
                <H3 style={styles.clientName}>{client.client_name}</H3>
                <Body style={styles.clientEmail}>{client.client_email}</Body>
                
                {/* Package Information */}
                {activeSubscription && (
                  <View style={styles.packageInfo}>
                    <View style={styles.packageRow}>
                      <WebCompatibleIcon name="fitness-center" size={16} color={Colors.light.primary} />
                      <Caption style={styles.packageText}>
                        {activeSubscription.remaining_classes} {t('dashboard.classesRemaining')}
                      </Caption>
                    </View>
                    {activeSubscription.subscription_plans && (
                      <View style={styles.packageRow}>
                        <WebCompatibleIcon name="card-membership" size={16} color={Colors.light.textSecondary} />
                        <Caption style={styles.packagePlanText}>
                          {activeSubscription.subscription_plans.name}
                        </Caption>
                      </View>
                    )}
                  </View>
                )}
                
                <View style={styles.chipContainer}>
                  <Chip icon="person" mode="outlined" compact style={styles.typeChip}>
                    {client.assignment_type}
                  </Chip>
                  <StatusChip
                    state={client.status === 'active' ? 'success' : 'warning'}
                    text={client.status}
                    size="small"
                  />
                  {/* Package Credit Badge */}
                  {activeSubscription && (
                    <Chip 
                      icon="fitness-center" 
                      mode="flat" 
                      compact 
                      style={[
                        styles.creditsChip, 
                        { backgroundColor: activeSubscription.remaining_classes > 0 ? Colors.light.success + '20' : Colors.light.error + '20' }
                      ]}
                      textStyle={{ 
                        color: activeSubscription.remaining_classes > 0 ? Colors.light.success : Colors.light.error,
                        fontWeight: '600',
                        fontSize: 12
                      }}
                    >
                      {activeSubscription.remaining_classes}
                    </Chip>
                  )}
                </View>
              </View>
              <WebCompatibleIcon name="chevron-right" size={24} color={Colors.light.textSecondary} />
            </View>
            
            {client.notes && (
              <View style={styles.notesContainer}>
                <Caption style={styles.notesText}>{client.notes}</Caption>
              </View>
            )}
          </PaperCard.Content>
        </TouchableOpacity>
      </PaperCard>
    );
  };

  const filteredClients = clients.filter(client => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      client.client_name?.toLowerCase().includes(query) ||
      client.client_email?.toLowerCase().includes(query) ||
      client.client_phone?.toLowerCase().includes(query) ||
      client.notes?.toLowerCase().includes(query)
    );
  });

  // CLEAN SIMPLE MODAL - NO NESTED CONTAINERS!
  const renderClientDetails = () => {
    if (!selectedClient) return null;

    return (
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.fullScreenModal}>
          {/* Improved Header with Clear Navigation */}
          <View style={styles.simpleHeader}>
            <TouchableOpacity
              onPress={() => {
                console.log('Back button pressed');
                setModalVisible(false);
                setActiveTab('overview'); // Reset to overview tab
              }}
              style={styles.headerBackButton}
              activeOpacity={0.7}
            >
              <WebCompatibleIcon name="arrow-left" size={24} color="white" />
            </TouchableOpacity>
            <H2 style={styles.headerTitle}>{selectedClient.client_name}</H2>
            <TouchableOpacity
              onPress={() => {
                console.log('Close button pressed');
                setModalVisible(false);
                setActiveTab('overview'); // Reset to overview tab
              }}
              style={styles.headerCloseButton}
              activeOpacity={0.7}
            >
              <WebCompatibleIcon name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Simple Tabs */}
          <View style={styles.simpleTabContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {(['overview', 'photos', 'medical', 'assessments', 'classes'] as const).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[styles.simpleTab, activeTab === tab && styles.simpleActiveTab]}
                  onPress={() => setActiveTab(tab)}
                >
                  <Body style={activeTab === tab ? styles.simpleActiveTabText : styles.simpleTabText}>
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </Body>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Simple Content */}
          <ScrollView style={styles.simpleContent} showsVerticalScrollIndicator={false}>
            {activeTab === 'overview' && (
              <View style={styles.overviewContainer}>
                <PaperCard style={styles.infoCard}>
                  <PaperCard.Content>
                    <H3 style={styles.sectionTitle}>Client Information</H3>
                    <View style={styles.detailRow}>
                      <WebCompatibleIcon name="email" size={20} color={Colors.light.primary} />
                      <Body style={styles.infoText}>{selectedClient.client_email}</Body>
                    </View>
                    <View style={styles.detailRow}>
                      <WebCompatibleIcon name="person" size={20} color={Colors.light.primary} />
                      <Body style={styles.infoText}>Assignment: {selectedClient.assignment_type}</Body>
                    </View>
                    <View style={styles.detailRow}>
                      <WebCompatibleIcon name="calendar" size={20} color={Colors.light.primary} />
                      <Body style={styles.infoText}>
                        Assigned: {new Date(selectedClient.start_date).toLocaleDateString()}
                      </Body>
                    </View>
                    {selectedClient.notes && (
                      <View style={styles.detailRow}>
                        <WebCompatibleIcon name="note" size={20} color={Colors.light.primary} />
                        <Body style={styles.infoText}>{selectedClient.notes}</Body>
                      </View>
                    )}
                  </PaperCard.Content>
                </PaperCard>

                {/* Package Plan Information */}
                {(() => {
                  const activeSubscription = getActiveSubscription(selectedClient);
                  return activeSubscription ? (
                    <PaperCard style={styles.infoCard}>
                      <PaperCard.Content>
                        <H3 style={styles.sectionTitle}>Package Plan</H3>
                        <View style={styles.detailRow}>
                          <WebCompatibleIcon name="card-membership" size={20} color={Colors.light.primary} />
                          <Body style={styles.infoText}>
                            {activeSubscription.subscription_plans?.name || 'Unknown Plan'}
                          </Body>
                        </View>
                        <View style={styles.detailRow}>
                          <WebCompatibleIcon name="fitness-center" size={20} color={Colors.light.success} />
                          <Body style={[styles.infoText, { color: Colors.light.success, fontWeight: '600' }]}>
                            {activeSubscription.remaining_classes} {t('dashboard.classesRemaining')}
                          </Body>
                        </View>
                        <View style={styles.detailRow}>
                          <WebCompatibleIcon name="date-range" size={20} color={Colors.light.textSecondary} />
                          <Body style={styles.infoText}>
                            Start: {new Date(activeSubscription.start_date).toLocaleDateString()}
                          </Body>
                        </View>
                        <View style={styles.detailRow}>
                          <WebCompatibleIcon name="event" size={20} color={Colors.light.textSecondary} />
                          <Body style={styles.infoText}>
                            End: {new Date(activeSubscription.end_date).toLocaleDateString()}
                          </Body>
                        </View>
                        {activeSubscription.subscription_plans?.monthly_classes && (
                          <View style={styles.detailRow}>
                            <WebCompatibleIcon name="repeat" size={20} color={Colors.light.textSecondary} />
                            <Body style={styles.infoText}>
                              {activeSubscription.subscription_plans.monthly_classes} classes/month
                            </Body>
                          </View>
                        )}
                        
                        {/* Visual Progress Bar */}
                        {activeSubscription.subscription_plans?.monthly_classes && (
                          <View style={styles.progressContainer}>
                            <Caption style={styles.progressLabel}>
                              Package Usage
                            </Caption>
                            <View style={styles.progressBar}>
                              <View 
                                style={[
                                  styles.progressFill, 
                                  { 
                                    width: `${Math.min(100, (activeSubscription.remaining_classes / activeSubscription.subscription_plans.monthly_classes) * 100)}%`,
                                    backgroundColor: activeSubscription.remaining_classes > (activeSubscription.subscription_plans.monthly_classes * 0.2) 
                                      ? Colors.light.success 
                                      : activeSubscription.remaining_classes > 0 
                                        ? Colors.light.warning 
                                        : Colors.light.error
                                  }
                                ]} 
                              />
                            </View>
                            <Caption style={styles.progressText}>
                              {activeSubscription.remaining_classes} / {activeSubscription.subscription_plans.monthly_classes} remaining
                            </Caption>
                          </View>
                        )}
                      </PaperCard.Content>
                    </PaperCard>
                  ) : (
                    <PaperCard style={styles.infoCard}>
                      <PaperCard.Content>
                        <H3 style={styles.sectionTitle}>Package Plan</H3>
                        <View style={styles.noPackageContainer}>
                          <WebCompatibleIcon name="info" size={24} color={Colors.light.textSecondary} />
                          <Body style={styles.noPackageText}>
                            No active package plan found for this client
                          </Body>
                        </View>
                      </PaperCard.Content>
                    </PaperCard>
                  );
                })()}
              </View>
            )}

            {activeTab === 'photos' && (
              <View style={styles.photosContainer}>
                <View style={styles.sectionHeader}>
                  <H3 style={styles.sectionTitle}>Progress Photos</H3>
                  <PaperButton
                    mode="contained"
                    icon="camera"
                    onPress={() => {
                      console.log('Add Photo button pressed');
                      setModalVisible(false); // Close main modal first
                      setTimeout(() => setPhotoUploadVisible(true), 100); // Open photo modal after delay
                    }}
                    style={[styles.simpleActionButton, { backgroundColor: Colors.light.primary }]}
                    labelStyle={{ color: 'white', fontWeight: '600' }}
                    compact
                  >
                    Add Photo
                  </PaperButton>
                </View>

                {selectedClient.progressPhotos.length > 0 ? (
                  selectedClient.progressPhotos.map((photo) => (
                    <PaperCard key={photo.id} style={styles.photoCard}>
                      <PaperCard.Content>
                        <View style={styles.photoHeader}>
                          <View>
                            <Body style={styles.photoType}>{photo.photo_type.toUpperCase()}</Body>
                            <Caption>{new Date(photo.taken_date).toLocaleDateString()}</Caption>
                          </View>
                          <View style={styles.photoActions}>
                            <Chip icon="image" mode="outlined" compact>
                              {photo.body_area || 'General'}
                            </Chip>
                            <TouchableOpacity
                              style={styles.deletePhotoButton}
                              onPress={() => confirmDeletePhoto(photo.id, photo.description)}
                            >
                              <WebCompatibleIcon name="delete" size={20} color="#ff4444" />
                            </TouchableOpacity>
                          </View>
                        </View>
                        
                        {/* Display the actual photo */}
                        {photo.file_url && (
                          <View style={styles.photoImageContainer}>
                            <Image
                              source={{ uri: photo.file_url }}
                              style={styles.photoImage}
                              resizeMode="cover"
                            />
                          </View>
                        )}
                        
                        {photo.description && (
                          <Body style={styles.photoDescription}>{photo.description}</Body>
                        )}
                        {photo.session_notes && (
                          <Caption style={styles.sessionNotes}>{photo.session_notes}</Caption>
                        )}
                      </PaperCard.Content>
                    </PaperCard>
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <WebCompatibleIcon name="camera" size={48} color={Colors.light.textSecondary} />
                    <Body style={styles.emptyText}>No progress photos yet</Body>
                  </View>
                )}
              </View>
            )}

            {activeTab === 'medical' && (
              <View style={styles.medicalContainer}>
                <View style={styles.sectionHeader}>
                  <H3 style={styles.sectionTitle}>Medical Information</H3>
                  <PaperButton
                    mode="contained"
                    icon="medical-bag"
                    onPress={() => {
                      console.log('Medical Update button pressed');
                      setModalVisible(false); // Close main modal first
                      setTimeout(() => setMedicalUpdateVisible(true), 100); // Open medical modal after delay
                    }}
                    style={[styles.simpleActionButton, { backgroundColor: Colors.light.primary }]}
                    labelStyle={{ color: 'white', fontWeight: '600' }}
                    compact
                  >
                    Update Medical
                  </PaperButton>
                </View>

                {/* Current Medical Conditions */}
                <PaperCard style={styles.medicalCard}>
                  <PaperCard.Content>
                    <View style={styles.currentMedicalHeader}>
                      <WebCompatibleIcon name="medical-bag" size={20} color={Colors.light.primary} />
                      <H3 style={styles.currentMedicalTitle}>Current Medical Conditions</H3>
                      <Chip icon="person" mode="outlined" compact>From Profile</Chip>
                    </View>
                    {selectedClient.client_medical_conditions ? (
                      <Body style={styles.currentConditionsText}>
                        {selectedClient.client_medical_conditions}
                      </Body>
                    ) : (
                      <Caption style={styles.noConditionsText}>
                        No medical conditions recorded
                      </Caption>
                    )}
                  </PaperCard.Content>
                </PaperCard>

                {/* Medical Updates */}
                {selectedClient.medicalUpdates.length > 0 && (
                  <View style={styles.medicalUpdatesSection}>
                    <H3 style={styles.updatesTitle}>Medical Updates History</H3>
                    {selectedClient.medicalUpdates.map((update) => (
                      <PaperCard key={update.id} style={styles.medicalCard}>
                        <PaperCard.Content>
                          <View style={styles.medicalHeader}>
                            <View>
                              <Body style={styles.medicalDate}>
                                {new Date(update.effective_date).toLocaleDateString()}
                              </Body>
                              <Chip
                                icon="alert"
                                mode="outlined"
                                compact
                                style={[styles.severityChip, { backgroundColor: getSeverityColor(update.severity_level) }]}
                              >
                                {update.severity_level}
                              </Chip>
                            </View>
                          </View>
                          <Body style={styles.conditionsText}>{update.updated_conditions}</Body>
                          <Caption style={styles.updateReason}>Reason: {update.update_reason}</Caption>
                        </PaperCard.Content>
                      </PaperCard>
                    ))}
                  </View>
                )}

                {selectedClient.medicalUpdates.length === 0 && (
                  <View style={styles.emptyState}>
                    <WebCompatibleIcon name="medical-bag" size={48} color={Colors.light.textSecondary} />
                    <Body style={styles.emptyText}>No medical updates yet</Body>
                  </View>
                )}
              </View>
            )}

            {activeTab === 'assessments' && (
              <View style={styles.assessmentsContainer}>
                <View style={styles.sectionHeader}>
                  <H3 style={styles.sectionTitle}>Progress Assessments</H3>
                  <PaperButton
                    mode="contained"
                    icon="chart-line"
                    onPress={() => {
                      console.log('New Assessment button pressed');
                      setModalVisible(false); // Close main modal first
                      setTimeout(() => setAssessmentVisible(true), 100); // Open assessment modal after delay
                    }}
                    style={[styles.simpleActionButton, { backgroundColor: Colors.light.primary }]}
                    labelStyle={{ color: 'white', fontWeight: '600' }}
                    compact
                  >
                    New Assessment
                  </PaperButton>
                </View>

                {selectedClient.assessments.length > 0 ? (
                  selectedClient.assessments.map((assessment) => (
                    <PaperCard key={assessment.id} style={styles.assessmentCard}>
                      <PaperCard.Content>
                        <View style={styles.assessmentHeader}>
                          <View>
                            <Body style={styles.assessmentType}>Assessment #{assessment.id}</Body>
                            <Caption>{new Date(assessment.assessment_date).toLocaleDateString()}</Caption>
                          </View>
                        </View>
                        <Body style={styles.assessmentNotes}>{assessment.overall_notes}</Body>
                      </PaperCard.Content>
                    </PaperCard>
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <WebCompatibleIcon name="chart-line" size={48} color={Colors.light.textSecondary} />
                    <Body style={styles.emptyText}>No assessments yet</Body>
                  </View>
                )}
              </View>
            )}

            {activeTab === 'classes' && (
              <View style={styles.classesContainer}>
                <View style={styles.sectionHeader}>
                  <H3 style={styles.sectionTitle}>Class Management</H3>
                  <PaperButton
                    mode="contained"
                    icon="event-add"
                    onPress={openClassAssignment}
                    style={[styles.simpleActionButton, { backgroundColor: Colors.light.primary }]}
                    labelStyle={{ color: 'white', fontWeight: '600' }}
                    compact
                  >
                    Assign to Class
                  </PaperButton>
                </View>

                {clientBookings.length > 0 ? (
                  clientBookings.map((booking) => (
                    <PaperCard key={booking.id} style={styles.classCard}>
                      <PaperCard.Content>
                        <View style={styles.classHeader}>
                          <View style={styles.classInfo}>
                            <H3 style={styles.className}>{booking.class_name}</H3>
                            <Body style={styles.classDate}>
                              {new Date(booking.class_date).toLocaleDateString()} at {booking.class_time}
                            </Body>
                            <Chip 
                              icon="check-circle" 
                              mode="outlined" 
                              compact 
                              style={[styles.statusChip, { borderColor: Colors.light.success }]}
                            >
                              Confirmed
                            </Chip>
                          </View>
                          <PaperButton
                            mode="outlined"
                            icon="close"
                            onPress={() => handleUnassignFromClass(booking.class_id)}
                            style={styles.unassignButton}
                            labelStyle={{ color: Colors.light.error }}
                            compact
                          >
                            Unassign
                          </PaperButton>
                        </View>
                      </PaperCard.Content>
                    </PaperCard>
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <WebCompatibleIcon name="event-remove" size={48} color={Colors.light.textSecondary} />
                    <Body style={styles.emptyText}>No class assignments yet</Body>
                    <Caption style={styles.emptySubtext}>Assign this client to your upcoming classes</Caption>
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    );
  };

  const getSeverityColor = (level: string) => {
    switch (level) {
      case 'major': return Colors.light.error + '20';
      case 'significant': return Colors.light.warning + '20';
      case 'moderate': return Colors.light.secondary + '20';
      default: return Colors.light.success + '20';
    }
  };

  // Helper function to get active subscription data - using same logic as client profile
  const getActiveSubscription = (client: InstructorClientAssignment) => {
    if (!client.user_subscriptions || client.user_subscriptions.length === 0) {
      return null;
    }
    
    // Find active subscription that hasn't expired (using same logic as client profile)
    return client.user_subscriptions.find(sub => {
      const isStatusActive = sub.status === 'active';
      
      // Calculate days until expiration (same logic as SimpleDateCalculator.daysUntilExpiration)
      const endDate = new Date(sub.end_date);
      const now = new Date();
      const timeDiff = endDate.getTime() - now.getTime();
      const daysUntilEnd = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
      
      // Subscription is valid if status is active AND not expired (daysUntilEnd >= 0)
      const isNotExpired = daysUntilEnd >= 0;
      
      // Debug log for the specific user
      if (client.client_name?.toLowerCase().includes('argjend')) {
        console.log('🔍 [DEBUG] Subscription check for', client.client_name, {
          status: sub.status,
          endDate: sub.end_date,
          daysUntilEnd,
          isStatusActive,
          isNotExpired,
          shouldShow: isStatusActive && isNotExpired
        });
      }
      
      return isStatusActive && isNotExpired;
    }) || null;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Body>Loading clients...</Body>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <H1 style={styles.title}>My Clients</H1>
          <Body style={styles.subtitle}>
            Manage your assigned clients and track their progress
          </Body>
          
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
                              <WebCompatibleIcon name="search" size={20} color={Colors.light.textSecondary} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search clients by name, email, or phone..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor={Colors.light.textSecondary}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  style={styles.clearButton}
                  activeOpacity={0.7}
                >
                  <WebCompatibleIcon name="close-circle" size={20} color={Colors.light.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        <View style={styles.clientsList}>
          {filteredClients.length > 0 ? (
            filteredClients.map(renderClientCard)
          ) : searchQuery.trim() ? (
            <View style={styles.emptyState}>
              <WebCompatibleIcon name="search" size={64} color={Colors.light.textSecondary} />
              <H3 style={styles.emptyTitle}>No Clients Found</H3>
              <Body style={styles.emptyText}>
                No clients match your search criteria.
              </Body>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <WebCompatibleIcon name="account-group" size={64} color={Colors.light.textSecondary} />
              <H3 style={styles.emptyTitle}>No Clients Assigned</H3>
              <Body style={styles.emptyText}>
                Contact your admin to get clients assigned to you.
              </Body>
            </View>
          )}
        </View>
      </ScrollView>

      {renderClientDetails()}

      {/* Simple Medical Update Modal */}
      <Modal
        visible={medicalUpdateVisible}
        animationType="slide"
        presentationStyle="overFullScreen"
        transparent={false}
        onRequestClose={() => {
          setMedicalUpdateVisible(false);
          setTimeout(() => setModalVisible(true), 100);
        }}
        style={{ zIndex: 9999 }}
      >
        <View style={styles.simpleModalContainer}>
          <View style={styles.simpleModalHeader}>
            <TouchableOpacity
              onPress={() => {
                Keyboard.dismiss();
                setMedicalUpdateVisible(false);
                setTimeout(() => setModalVisible(true), 100);
              }}
              style={styles.headerBackButton}
              activeOpacity={0.7}
            >
              <WebCompatibleIcon name="arrow-left" size={24} color={Colors.light.text} />
            </TouchableOpacity>
            <H3 style={styles.simpleModalTitle}>Update Medical Conditions</H3>
            <TouchableOpacity
              onPress={() => {
                Keyboard.dismiss();
                setMedicalUpdateVisible(false);
                setTimeout(() => setModalVisible(true), 100); // Return to main modal
              }}
              style={styles.simpleCloseButton}
            >
              <WebCompatibleIcon name="close" size={24} color={Colors.light.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            style={styles.simpleModalContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <TextInput
              style={[styles.cleanInput, styles.multilineInput]}
              placeholder="Updated medical conditions *"
              value={newMedicalConditions}
              onChangeText={setNewMedicalConditions}
              multiline
              numberOfLines={3}
            />

            <TextInput
              style={[styles.cleanInput, styles.multilineInput]}
              placeholder="Reason for update *"
              value={updateReason}
              onChangeText={setUpdateReason}
              multiline
              numberOfLines={2}
            />

            <View style={styles.cleanSeverityContainer}>
              <Body style={styles.cleanSeverityLabel}>Severity Level:</Body>
              <View style={styles.cleanSeverityOptions}>
                {(['minor', 'moderate', 'significant', 'major'] as const).map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.cleanSeverityOption,
                      severityLevel === level && styles.cleanSelectedSeverity
                    ]}
                    onPress={() => setSeverityLevel(level)}
                  >
                                            <Body style={severityLevel === level ? styles.cleanSelectedSeverityText : styles.cleanSeverityText}>
                      {level}
                    </Body>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.cleanModalButtons}>
              <PaperButton
                mode="outlined"
                onPress={() => {
                  Keyboard.dismiss();
                  setMedicalUpdateVisible(false);
                  setTimeout(() => setModalVisible(true), 100); // Return to main modal
                }}
                style={styles.cleanModalButton}
              >
                Cancel
              </PaperButton>
              <PaperButton
                mode="contained"
                onPress={handleMedicalUpdate}
                style={styles.cleanModalButton}
              >
                Update
              </PaperButton>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Simple Assessment Modal */}
      <Modal
        visible={assessmentVisible}
        animationType="slide"
        presentationStyle="overFullScreen"
        transparent={false}
        onRequestClose={() => {
          setAssessmentVisible(false);
          setTimeout(() => setModalVisible(true), 100);
        }}
        style={{ zIndex: 9999 }}
      >
        <View style={styles.simpleModalContainer}>
          <View style={styles.simpleModalHeader}>
            <TouchableOpacity
              onPress={() => {
                setAssessmentVisible(false);
                setTimeout(() => setModalVisible(true), 100);
              }}
              style={styles.headerBackButton}
              activeOpacity={0.7}
            >
              <WebCompatibleIcon name="arrow-left" size={24} color={Colors.light.text} />
            </TouchableOpacity>
            <H3 style={styles.simpleModalTitle}>Add Progress Assessment</H3>
            <TouchableOpacity
              onPress={() => {
                setAssessmentVisible(false);
                setTimeout(() => setModalVisible(true), 100); // Return to main modal
              }}
              style={styles.simpleCloseButton}
            >
              <WebCompatibleIcon name="close" size={24} color={Colors.light.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.simpleModalContent}>
            <TextInput
              style={[styles.cleanInput, styles.multilineInput]}
              placeholder="Assessment notes *"
              value={assessmentNotes}
              onChangeText={setAssessmentNotes}
              multiline
              numberOfLines={4}
            />

            <View style={styles.cleanModalButtons}>
              <PaperButton
                mode="outlined"
                onPress={() => {
                  setAssessmentVisible(false);
                  setTimeout(() => setModalVisible(true), 100); // Return to main modal
                }}
                style={styles.cleanModalButton}
              >
                Cancel
              </PaperButton>
              <PaperButton
                mode="contained"
                onPress={handleAssessmentSubmit}
                style={styles.cleanModalButton}
              >
                Save Assessment
              </PaperButton>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Class Assignment Modal */}
      <Modal
        visible={classAssignmentVisible}
        animationType="slide"
        presentationStyle="overFullScreen"
        transparent={false}
        onRequestClose={() => {
          setClassAssignmentVisible(false);
          setTimeout(() => setModalVisible(true), 100);
        }}
        style={{ zIndex: 9999 }}
      >
        <View style={styles.simpleModalContainer}>
          <View style={styles.simpleModalHeader}>
            <TouchableOpacity
              onPress={() => {
                setClassAssignmentVisible(false);
                setTimeout(() => setModalVisible(true), 100);
              }}
              style={styles.headerBackButton}
              activeOpacity={0.7}
            >
              <WebCompatibleIcon name="arrow-left" size={24} color={Colors.light.text} />
            </TouchableOpacity>
            <H3 style={styles.simpleModalTitle}>Assign to Class</H3>
            <TouchableOpacity
              onPress={() => {
                setClassAssignmentVisible(false);
                setTimeout(() => setModalVisible(true), 100);
              }}
              style={styles.simpleCloseButton}
            >
              <WebCompatibleIcon name="close" size={24} color={Colors.light.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.simpleModalContent}>
            <H3 style={styles.sectionTitle}>Available Classes</H3>
            {availableClasses.length > 0 ? (
              availableClasses.map((classItem) => (
                <PaperCard key={classItem.id} style={styles.availableClassCard}>
                  <PaperCard.Content>
                    <View style={styles.classHeader}>
                      <View style={styles.classInfo}>
                        <H3 style={styles.className}>{classItem.name}</H3>
                        <Body style={styles.classDate}>
                          {new Date(classItem.date).toLocaleDateString()} at {classItem.time}
                        </Body>
                        <Caption style={styles.classDuration}>
                          Duration: {classItem.duration} minutes
                        </Caption>
                      </View>
                      <PaperButton
                        mode="contained"
                        icon="add"
                        onPress={() => handleAssignToClass(classItem.id)}
                        style={[styles.assignButton, { backgroundColor: Colors.light.primary }]}
                        labelStyle={{ color: 'white' }}
                        compact
                      >
                        Assign
                      </PaperButton>
                    </View>
                  </PaperCard.Content>
                </PaperCard>
              ))
            ) : (
              <View style={styles.emptyState}>
                <WebCompatibleIcon name="calendar-clock" size={48} color={Colors.light.textSecondary} />
                <Body style={styles.emptyText}>No upcoming classes available</Body>
                <Caption style={styles.emptySubtext}>Create classes in your schedule to assign clients</Caption>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Photo Upload Modal */}
      <Modal
        visible={photoUploadVisible}
        animationType="slide"
        presentationStyle="overFullScreen"
        transparent={false}
        onRequestClose={() => {
          setPhotoUploadVisible(false);
          setSelectedImage(null);
          setTimeout(() => setModalVisible(true), 100);
        }}
        style={{ zIndex: 9999 }}
      >
        <View style={styles.simpleModalContainer}>
          <View style={styles.simpleModalHeader}>
            <TouchableOpacity
              onPress={() => {
                setPhotoUploadVisible(false);
                setSelectedImage(null);
                setTimeout(() => setModalVisible(true), 100);
              }}
              style={styles.headerBackButton}
              activeOpacity={0.7}
            >
              <WebCompatibleIcon name="arrow-left" size={24} color={Colors.light.text} />
            </TouchableOpacity>
            <H3 style={styles.simpleModalTitle}>Upload Progress Photo</H3>
            <TouchableOpacity
              onPress={() => {
                setPhotoUploadVisible(false);
                setSelectedImage(null);
                setTimeout(() => setModalVisible(true), 100); // Return to main modal
              }}
              style={styles.simpleCloseButton}
            >
              <WebCompatibleIcon name="close" size={24} color={Colors.light.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.simpleModalContent}>
            <View style={styles.photoTypeContainer}>
              {(['before', 'after', 'progress', 'assessment'] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.photoTypeOption,
                    photoType === type && styles.selectedPhotoType
                  ]}
                  onPress={() => setPhotoType(type)}
                >
                  <Body style={photoType === type ? styles.selectedPhotoTypeText : styles.photoTypeText}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Body>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.cleanInput}
              placeholder="Body area (e.g., Arms, Legs, Core) *"
              value={bodyArea}
              onChangeText={setBodyArea}
            />

            <TextInput
              style={[styles.cleanInput, styles.multilineInput]}
              placeholder="Photo description *"
              value={photoDescription}
              onChangeText={setPhotoDescription}
              multiline
              numberOfLines={2}
            />

            <TextInput
              style={[styles.cleanInput, styles.multilineInput]}
              placeholder="Session notes (optional)"
              value={sessionNotes}
              onChangeText={setSessionNotes}
              multiline
            />

            {/* Photo Preview */}
            {selectedImage && selectedImage.assets && selectedImage.assets.length > 0 && (
              <View style={styles.photoPreviewContainer}>
                <Body style={styles.photoPreviewText}>Photo Preview:</Body>
                <View style={styles.photoPreview}>
                  <Image
                    source={{ uri: selectedImage.assets[0].uri }}
                    style={styles.photoPreviewImage}
                  />
                  <Caption style={styles.photoPreviewCaption}>Photo captured successfully</Caption>
                </View>
              </View>
            )}

            {/* Take Photo Button */}
            <PaperButton
              mode="contained"
              onPress={launchCamera}
              style={[styles.cleanModalButton, styles.takePhotoButton]}
              labelStyle={{ color: 'white', fontWeight: '600' }}
                         >
               {selectedImage && selectedImage.assets && selectedImage.assets.length > 0 
                 ? 'Change Photo' 
                 : 'Add Photo (Camera or Library)'
               }
            </PaperButton>

            <View style={styles.cleanModalButtons}>
              <PaperButton
                mode="outlined"
                onPress={() => {
                  setPhotoUploadVisible(false);
                  setSelectedImage(null);
                  setTimeout(() => setModalVisible(true), 100); // Return to main modal
                }}
                style={styles.cleanModalButton}
              >
                Cancel
              </PaperButton>
              <PaperButton
                mode="contained"
                onPress={handlePhotoUpload}
                style={styles.cleanModalButton}
                disabled={!selectedImage || !selectedImage.assets || selectedImage.assets.length === 0}
              >
                                 Upload Photo
              </PaperButton>
            </View>
          </ScrollView>
        </View>
      </Modal>
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
  scrollView: {
    flex: 1,
  },
  header: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    color: Colors.light.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: Colors.light.textSecondary,
  },
  searchContainer: {
    marginTop: spacing.md,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    paddingHorizontal: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: Colors.light.text,
  },
  clearButton: {
    padding: spacing.xs,
  },
  clientsList: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  clientCard: {
    marginBottom: spacing.md,
    backgroundColor: Colors.light.surface,
  },
  clientCardContent: {
    padding: spacing.md,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: Colors.light.primary,
    marginRight: spacing.md,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    color: Colors.light.text,
    marginBottom: spacing.xs,
  },
  clientEmail: {
    color: Colors.light.textSecondary,
    marginBottom: spacing.sm,
  },
  chipContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  typeChip: {
    backgroundColor: Colors.light.surface,
  },
  notesContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  notesText: {
    color: Colors.light.textSecondary,
    fontStyle: 'italic',
  },
  packageInfo: {
    marginVertical: spacing.xs,
    gap: spacing.xs,
  },
  packageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  packageText: {
    color: Colors.light.primary,
    fontWeight: '600',
    fontSize: 12,
  },
  packagePlanText: {
    color: Colors.light.textSecondary,
    fontSize: 12,
  },
  creditsChip: {
    borderWidth: 1,
    borderColor: 'transparent',
  },
  progressContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  progressLabel: {
    color: Colors.light.text,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.light.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  noPackageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  noPackageText: {
    color: Colors.light.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyTitle: {
    color: Colors.light.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyText: {
    color: Colors.light.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },

  // BEAUTIFUL MODAL STYLES - Updated to match app design
  fullScreenModal: {
    flex: 1,
    backgroundColor: '#F8F6F3', // App's soft beige background
  },
  simpleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E6E3',
    backgroundColor: Colors.light.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerBackButton: {
    padding: spacing.md,
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    marginRight: spacing.sm,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: Colors.light.text,
    fontWeight: '600',
  },
  headerCloseButton: {
    padding: spacing.md,
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    marginLeft: spacing.sm,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  simpleTabContainer: {
    backgroundColor: Colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E6E3',
    paddingHorizontal: spacing.sm,
  },
  simpleTab: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginHorizontal: spacing.xs,
    borderRadius: 8,
  },
  simpleActiveTab: {
    backgroundColor: '#6B8E7F20', // Forest green with 20% opacity
    borderBottomWidth: 3,
    borderBottomColor: Colors.light.primary,
  },
  simpleTabText: {
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  simpleActiveTabText: {
    color: Colors.light.primary,
    fontWeight: '600',
  },
  simpleContent: {
    flex: 1,
    padding: spacing.lg,
  },

  // CONTENT STYLES
  overviewContainer: {
    gap: spacing.md,
  },
  infoCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    color: Colors.light.text,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  infoText: {
    marginLeft: spacing.sm,
    color: Colors.light.text,
  },
  medicalContainer: {
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  medicalCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  currentMedicalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  currentMedicalTitle: {
    flex: 1,
    color: Colors.light.primary,
  },
  currentConditionsText: {
    color: Colors.light.text,
    fontWeight: '500',
  },
  noConditionsText: {
    color: Colors.light.textSecondary,
    fontStyle: 'italic',
  },
  medicalUpdatesSection: {
    marginTop: spacing.lg,
  },
  updatesTitle: {
    color: Colors.light.text,
    marginBottom: spacing.md,
  },
  medicalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  medicalDate: {
    fontWeight: '600',
    color: Colors.light.text,
  },
  severityChip: {
    marginTop: spacing.xs,
  },
  conditionsText: {
    color: Colors.light.text,
    marginBottom: spacing.sm,
  },
  updateReason: {
    color: Colors.light.textSecondary,
  },
  assessmentsContainer: {
    gap: spacing.md,
  },
  assessmentCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  assessmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  assessmentType: {
    fontWeight: '600',
    color: Colors.light.text,
  },
  assessmentNotes: {
    color: Colors.light.text,
  },
  simpleActionButton: {
    borderRadius: 8,
    borderColor: Colors.light.primary,
    borderWidth: 1,
    backgroundColor: Colors.light.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  // BEAUTIFUL MODAL STYLES - Updated to match app design
  simpleModalContainer: {
    flex: 1,
    backgroundColor: '#F8F6F3', // App's soft beige background
    zIndex: 10000,
    elevation: 10,
  },
  simpleModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E6E3',
    backgroundColor: Colors.light.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 10001,
  },
  simpleModalTitle: {
    color: Colors.light.text,
    fontWeight: '600',
  },
  simpleCloseButton: {
    padding: spacing.xs,
  },
  simpleModalContent: {
    flex: 1,
    padding: spacing.lg,
  },
  cleanInput: {
    borderWidth: 1,
    borderColor: '#E8E6E3',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    color: Colors.light.text,
    backgroundColor: Colors.light.surface,
    fontSize: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  cleanSeverityContainer: {
    marginBottom: spacing.lg,
  },
  cleanSeverityLabel: {
    color: Colors.light.text,
    marginBottom: spacing.sm,
    fontWeight: '500',
  },
  cleanSeverityOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  cleanSeverityOption: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: '#E8E6E3',
    borderRadius: 12,
    backgroundColor: Colors.light.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cleanSelectedSeverity: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  cleanSeverityText: {
    color: Colors.light.text,
    fontSize: 14,
  },
  cleanSelectedSeverityText: {
    color: 'white',
    fontWeight: '500',
  },
  cleanModalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
  },
  cleanModalButton: {
    flex: 1,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  
  // Photo styles
  photosContainer: {
    gap: spacing.md,
  },
  photoCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  photoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  photoActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deletePhotoButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#ffebee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoType: {
    fontWeight: '600',
    color: Colors.light.text,
  },
  photoDescription: {
    color: Colors.light.text,
    marginBottom: spacing.sm,
  },
  sessionNotes: {
    color: Colors.light.textSecondary,
    fontStyle: 'italic',
  },
  photoImageContainer: {
    marginVertical: spacing.md,
    alignItems: 'center',
  },
  photoImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: Colors.light.surface,
  },
  
  // Photo upload styles
  photoTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  photoTypeOption: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: '#E8E6E3',
    borderRadius: 12,
    backgroundColor: Colors.light.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  selectedPhotoType: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  photoTypeText: {
    color: Colors.light.text,
    fontSize: 14,
  },
  selectedPhotoTypeText: {
    color: 'white',
    fontWeight: '500',
  },
  
  // Photo preview styles
  photoPreviewContainer: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.primary,
    borderStyle: 'dashed',
  },
  photoPreviewText: {
    color: Colors.light.text,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  photoPreview: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: '#F0F8F0',
    borderRadius: 8,
  },
  photoPreviewCaption: {
    color: Colors.light.primary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  photoPreviewImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  takePhotoButton: {
    backgroundColor: Colors.light.primary,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },

  // Class Management Styles
  classesContainer: {
    gap: spacing.md,
  },
  classCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: spacing.sm,
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  classInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  className: {
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: spacing.xs,
  },
  classDate: {
    color: Colors.light.textSecondary,
    marginBottom: spacing.xs,
  },
  classDuration: {
    color: Colors.light.textMuted,
  },
  statusChip: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  unassignButton: {
    borderColor: Colors.light.error,
    borderWidth: 1,
  },
  assignButton: {
    borderRadius: 8,
  },
  availableClassCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: spacing.md,
  },
  emptySubtext: {
    color: Colors.light.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});

export default MyClients;