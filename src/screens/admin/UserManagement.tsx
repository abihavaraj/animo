import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
    ActivityIndicator,
    Avatar,
    Button,
    Card,
    Chip,
    FAB,
    IconButton,
    Menu,
    Modal,
    Paragraph,
    Portal,
    Searchbar,
    SegmentedButtons,
    TextInput,
    Title
} from 'react-native-paper';
import { Colors } from '../../../constants/Colors';
import { spacing } from '../../../constants/Spacing';
import WebCompatibleIcon from '../../components/WebCompatibleIcon';
import { BackendUser, userService } from '../../services/userService';
import { UserRole } from '../../store/authSlice';

// Referral source options for user management
const REFERRAL_SOURCES = [
  { value: '', label: 'Not specified' },
  { value: 'google_search', label: 'Google Search' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'friend_referral', label: 'Friend Referral' },
  { value: 'website', label: 'Studio Website' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'local_ad', label: 'Local Advertisement' },
  { value: 'word_of_mouth', label: 'Word of Mouth' },
  { value: 'flyer', label: 'Flyer' },
  { value: 'event', label: 'Studio Event' },
  { value: 'other', label: 'Other' },
];

function UserManagement() {
  const navigation = useNavigation<any>();
  const [users, setUsers] = useState<BackendUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'client' | 'instructor' | 'admin' | 'reception' | 'prospect'>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [userDetailsModalVisible, setUserDetailsModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<BackendUser | null>(null);
  const [editingUser, setEditingUser] = useState<BackendUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [referralMenuVisible, setReferralMenuVisible] = useState(false);
  const [customReferralText, setCustomReferralText] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'client' as UserRole,
    emergencyContact: '',
    medicalConditions: '',
    referralSource: ''
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const filters = {
        role: filterRole === 'all' ? undefined : filterRole as 'client' | 'instructor' | 'admin' | 'reception' | 'prospect',
        searchTerm: searchQuery || undefined
      };
      
      const response = await userService.getUsers(filters);
      if (response.success && response.data) {
        setUsers(response.data);
      } else {
        console.error('❌ Failed to load users:', response.error);
        Alert.alert('Error', response.error || 'Failed to load users');
        setUsers([]); // Ensure users is always an array
      }
    } catch (error) {
      console.error('❌ Error loading users:', error);
      Alert.alert('Error', 'Failed to load users');
      setUsers([]); // Ensure users is always an array
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [filterRole]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== '') {
        loadUsers();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#4caf50';
      case 'inactive': return '#9e9e9e';
      case 'suspended': return '#f44336';
      default: return '#666';
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'client': return '#2196f3';
      case 'instructor': return '#ff9800';
      case 'reception': return '#4caf50';
      case 'admin': return '#9c27b0';
      default: return '#666';
    }
  };

  const isProspectClient = (user: BackendUser) => {
    return user.role === 'client' && user.referral_source === 'Prospect Client';
  };

  const handleConvertProspectToClient = async (user: BackendUser) => {
    console.log('🔄 Convert prospect clicked for user:', user.name, user.id);
    console.log('🔍 Is prospect client:', isProspectClient(user));
    console.log('🔍 User referral source:', user.referral_source);
    
    if (!isProspectClient(user)) {
      Alert.alert('Error', 'This user is not a prospect client');
      return;
    }

    Alert.alert(
      'Convert Prospect to Client',
      `Are you sure you want to convert "${user.name}" from prospect to regular client? This will remove the prospect label.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Convert',
          onPress: async () => {
            try {
              const response = await userService.updateUser(String(user.id), {
                referral_source: 'Converted from Prospect'
              });

              if (response.success) {
                Alert.alert('Success', `${user.name} has been converted to a regular client`);
                await loadUsers();
              } else {
                Alert.alert('Error', response.error || 'Failed to convert prospect');
              }
            } catch (error) {
              console.error('Error converting prospect:', error);
              Alert.alert('Error', 'Failed to convert prospect');
            }
          }
        }
      ]
    );
  };

  const handleCreateUser = () => {
    setEditingUser(null);
    setCustomReferralText('');
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: '',
      role: 'client',
      emergencyContact: '',
      medicalConditions: '',
      referralSource: ''
    });
    setModalVisible(true);
  };

  const handleEditUser = (user: BackendUser) => {
    setEditingUser(user);
    // Handle custom referral text for existing "other" entries
    const isOtherReferral = user.referral_source && !REFERRAL_SOURCES.find(s => s.value === user.referral_source);
    setCustomReferralText(isOtherReferral ? user.referral_source || '' : '');
    
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      password: '',
      role: user.role,
      emergencyContact: user.emergency_contact || '',
      medicalConditions: user.medical_conditions || '',
      referralSource: isOtherReferral ? 'other' : (user.referral_source || '')
    });
    setModalVisible(true);
  };

  const handleViewUser = (user: BackendUser) => {
    if (user.role === 'client') {
      // Navigate to detailed client profile (same as reception)
      navigation.navigate('ClientProfile', {
        userId: user.id,
        userName: user.name
      });
    } else {
      // Show basic details modal for instructors/admins
      setSelectedUser(user);
      setUserDetailsModalVisible(true);
    }
  };

  const handleViewClientProfile = (user: BackendUser) => {
    navigation.navigate('ClientProfile', {
      userId: user.id,
      userName: user.name
    });
  };

  const handleSaveUser = async () => {
    if (!formData.name || !formData.email || !formData.phone) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    // Validate password for new users
    if (!editingUser && !formData.password) {
      Alert.alert('Error', 'Password is required for new users');
      return;
    }

    if (formData.password && formData.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    try {
      setSaving(true);
      
      if (editingUser) {
        // Update existing user
        const finalReferralSource = formData.referralSource === 'other' ? customReferralText : formData.referralSource;
        
        const updateData = {
          name: formData.name,
          phone: formData.phone,
          role: formData.role,
          emergency_contact: formData.emergencyContact || undefined,
          medical_conditions: formData.medicalConditions || undefined,
          referral_source: finalReferralSource || undefined
        };

        const response = await userService.updateUser(editingUser.id, updateData);
        
        if (response.success) {
          let warnings: string[] = [];
          
          // Update email separately if it changed
          if (formData.email !== editingUser.email) {
            const emailResponse = await userService.updateEmail(editingUser.id, {
              newEmail: formData.email
            });
            
            if (!emailResponse.success) {
              warnings.push('email update failed');
            }
          }
          
          // Update password separately if provided
          if (formData.password) {
            const passwordResponse = await userService.updatePassword(editingUser.id, {
              newPassword: formData.password
            });
            
            if (!passwordResponse.success) {
              warnings.push('password update failed');
            }
          }
          
          const warningText = warnings.length > 0 ? ` (${warnings.join(', ')})` : '';
          const successMessage = `User ${formData.name} has been updated${formData.password ? ' with new password' : ''}${warningText}`;
          
          Alert.alert(warnings.length > 0 ? 'Partial Success' : 'Success', successMessage);
          await loadUsers();
        } else {
          Alert.alert('Error', response.error || 'Failed to update user');
        }
      } else {
        // Create new user
        const finalReferralSource = formData.referralSource === 'other' ? customReferralText : formData.referralSource;
        
        const userData = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          role: formData.role,
          emergencyContact: formData.emergencyContact || undefined,
          medicalConditions: formData.medicalConditions || undefined,
          referralSource: finalReferralSource || undefined
        };

        const response = await userService.createUser(userData);
        
        if (response.success) {
          Alert.alert('Success', `User ${formData.name} has been created`);
          await loadUsers();
        } else {
          Alert.alert('Error', response.error || 'Failed to create user');
        }
      }
      
      setModalVisible(false);
    } catch (error) {
      console.error('Error saving user:', error);
      Alert.alert('Error', 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = (user: BackendUser) => {
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete ${user.name}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🗑️ Deleting user:', user.name, user.id);
              const response = await userService.deleteUser(user.id);
              console.log('🗑️ Delete response:', response);
              
              if (response.success) {
                Alert.alert('Success', 'User deleted successfully');
                await loadUsers();
              } else {
                console.error('❌ Delete failed:', response.error);
                Alert.alert('Error', response.error || 'Failed to delete user');
              }
            } catch (error) {
              console.error('❌ Error deleting user:', error);
              Alert.alert('Error', 'Failed to delete user. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleToggleUserStatus = async (user: BackendUser) => {
    try {
      const newStatus = user.status === 'active' ? 'inactive' : 'active';
      console.log('🔄 Toggling user status:', user.name, 'from', user.status, 'to', newStatus);
      
      const response = await userService.updateUser(user.id, { status: newStatus });
      console.log('🔄 Status update response:', response);
      
      if (response.success) {
        await loadUsers();
        Alert.alert('Success', `User status updated to ${newStatus}`);
      } else {
        console.error('❌ Status update failed:', response.error);
        Alert.alert('Error', response.error || 'Failed to update user status');
      }
    } catch (error) {
      console.error('❌ Error updating user status:', error);
      Alert.alert('Error', 'Failed to update user status. Please try again.');
    }
  };

  const handleSuspendUser = async (user: BackendUser) => {
    Alert.alert(
      'Suspend User',
      `Are you sure you want to suspend ${user.name}? They will not be able to access the system.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Suspend', 
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('⏸️ Suspending user:', user.name, user.id);
              const response = await userService.updateUser(user.id, { status: 'suspended' });
              console.log('⏸️ Suspend response:', response);
              
              if (response.success) {
                await loadUsers();
                Alert.alert('Success', 'User suspended successfully');
              } else {
                console.error('❌ Suspend failed:', response.error);
                Alert.alert('Error', response.error || 'Failed to suspend user');
              }
            } catch (error) {
              console.error('❌ Error suspending user:', error);
              Alert.alert('Error', 'Failed to suspend user. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleDeactivateUser = async (user: BackendUser) => {
    Alert.alert(
      'Deactivate User',
      `Are you sure you want to deactivate ${user.name}? They will be marked as inactive.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Deactivate', 
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('💤 Deactivating user:', user.name, user.id);
              const response = await userService.updateUser(user.id, { status: 'inactive' });
              console.log('💤 Deactivate response:', response);
              
              if (response.success) {
                await loadUsers();
                Alert.alert('Success', 'User deactivated successfully');
              } else {
                console.error('❌ Deactivate failed:', response.error);
                Alert.alert('Error', response.error || 'Failed to deactivate user');
              }
            } catch (error) {
              console.error('❌ Error deactivating user:', error);
              Alert.alert('Error', 'Failed to deactivate user. Please try again.');
            }
          }
        }
      ]
    );
  };

     const handleActivateUser = async (user: BackendUser) => {
     Alert.alert(
       'Activate User',
       `Are you sure you want to activate ${user.name}? They will be able to access the system.`,
       [
         { text: 'Cancel', style: 'cancel' },
         { 
           text: 'Activate', 
           onPress: async () => {
             try {
               console.log('✅ Activating user:', user.name, user.id);
               const response = await userService.updateUser(user.id, { status: 'active' });
               console.log('✅ Activate response:', response);
               
               if (response.success) {
                 await loadUsers();
                 Alert.alert('Success', 'User activated successfully');
               } else {
                 console.error('❌ Activate failed:', response.error);
                 Alert.alert('Error', response.error || 'Failed to activate user');
               }
             } catch (error) {
               console.error('❌ Error activating user:', error);
               Alert.alert('Error', 'Failed to activate user. Please try again.');
             }
           }
         }
       ]
     );
   };

   const handleArchiveUser = async (user: BackendUser) => {
     Alert.alert(
       'Archive User',
       `Are you sure you want to archive ${user.name}? This will mark them as archived but not delete their data.`,
       [
         { text: 'Cancel', style: 'cancel' },
         { 
           text: 'Archive', 
           style: 'destructive',
           onPress: async () => {
             try {
               console.log('📦 Archiving user:', user.name, user.id);
               const response = await userService.updateUser(user.id, { status: 'inactive' });
               console.log('📦 Archive response:', response);
               
               if (response.success) {
                 await loadUsers();
                 Alert.alert('Success', 'User archived successfully');
               } else {
                 console.error('❌ Archive failed:', response.error);
                 Alert.alert('Error', response.error || 'Failed to archive user');
               }
             } catch (error) {
               console.error('❌ Error archiving user:', error);
               Alert.alert('Error', 'Failed to archive user. Please try again.');
             }
           }
         }
       ]
     );
   };

  // Filter users on frontend for search
  const safeUsers = Array.isArray(users) ? users : [];
  
  if (!Array.isArray(users)) {
    console.warn('⚠️ Users is not an array:', typeof users, users);
  }
  
  const filteredUsers = safeUsers.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (user.phone && user.phone.includes(searchQuery));
    
    // Handle prospect filtering separately since prospects are clients with special referral source
    let matchesRole;
    if (filterRole === 'prospect') {
      matchesRole = isProspectClient(user);
    } else {
      matchesRole = filterRole === 'all' || user.role === filterRole;
    }
    
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" />
        <Title style={styles.loadingText}>Loading users...</Title>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Title style={styles.headerTitle}>User Management</Title>
        <Paragraph style={styles.headerSubtitle}>Manage clients, instructors, and administrators</Paragraph>
        
        {/* User Statistics */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Title style={styles.statNumber}>{filteredUsers.filter(u => u.role === 'client' && !isProspectClient(u)).length}</Title>
            <Paragraph style={styles.statLabel}>Clients</Paragraph>
          </View>
          <View style={styles.statItem}>
            <Title style={styles.statNumber}>{filteredUsers.filter(u => isProspectClient(u)).length}</Title>
            <Paragraph style={styles.statLabel}>Prospects</Paragraph>
          </View>
          <View style={styles.statItem}>
            <Title style={styles.statNumber}>{filteredUsers.filter(u => u.role === 'instructor').length}</Title>
            <Paragraph style={styles.statLabel}>Instructors</Paragraph>
          </View>
          <View style={styles.statItem}>
            <Title style={styles.statNumber}>{filteredUsers.filter(u => u.status === 'active').length}</Title>
            <Paragraph style={styles.statLabel}>Active</Paragraph>
          </View>
        </View>
      </View>

      <View style={styles.filtersContainer}>
        <Searchbar
          placeholder="Search users..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />

        <SegmentedButtons
          value={filterRole}
          onValueChange={(value) => setFilterRole(value as typeof filterRole)}
          buttons={[
            { value: 'all', label: 'All' },
            { value: 'client', label: 'Clients' },
            { value: 'instructor', label: 'Instructors' },
            { value: 'reception', label: 'Reception' },
            { value: 'admin', label: 'Admins' },
            { value: 'prospect', label: 'Prospects' },
          ]}
          style={styles.segmentedButtons}
        />
      </View>

      <ScrollView style={styles.content}>
        {filteredUsers.map((user) => (
          <Card key={user.id} style={styles.userCard}>
            <Card.Content>
              <View style={styles.userHeader}>
                <View style={styles.userInfo}>
                  <Avatar.Text size={50} label={user.name.charAt(0)} />
                  <View style={styles.userDetails}>
                    <Pressable onPress={() => handleViewUser(user)}>
                      <Title style={[styles.userName, styles.clickableUserName]}>
                        {user.name}
                      </Title>
                    </Pressable>
                    <Paragraph style={styles.userEmail}>{user.email}</Paragraph>
                    <Paragraph style={styles.userPhone}>{user.phone}</Paragraph>
                  </View>
                </View>
                <View style={styles.userLabels}>
                  <Chip 
                    style={[styles.roleChip, { backgroundColor: getRoleColor(user.role) }]}
                    textStyle={styles.chipText}
                  >
                    {user.role}
                  </Chip>
                  {isProspectClient(user) && (
                    <Chip 
                      style={[styles.roleChip, { backgroundColor: '#FF6B6B' }]}
                      textStyle={styles.chipText}
                    >
                      PROSPECT
                    </Chip>
                  )}
                  <Chip 
                    style={[styles.statusChip, { backgroundColor: getStatusColor(user.status) }]}
                    textStyle={styles.chipText}
                  >
                    {user.status}
                  </Chip>
                </View>
              </View>

              <View style={styles.userMeta}>
                <Paragraph style={styles.joinDate}>
                  Joined: {user.join_date ? new Date(user.join_date).toLocaleDateString() : 'N/A'}
                </Paragraph>
                
                {/* Client-specific information */}
                {user.role === 'client' && (
                  <>
                    {user.currentSubscription && (
                      <View style={styles.subscriptionInfo}>
                        <Paragraph style={styles.subscriptionText}>
                          Plan: {user.currentSubscription.plan_name}
                        </Paragraph>
                        <Paragraph style={styles.subscriptionText}>
                          {user.currentSubscription.remaining_classes} {t('dashboard.classesRemaining')}
                        </Paragraph>
                      </View>
                    )}
                    {(user.credit_balance !== undefined && user.credit_balance !== null) && (
                      <View style={[styles.creditBalanceInfo, user.credit_balance === 0 && styles.zeroCreditBalance]}>
                        <WebCompatibleIcon 
                          name="account-balance-wallet" 
                          size={16} 
                          color={user.credit_balance > 0 ? "#4caf50" : "#f44336"} 
                        />
                        <Paragraph style={[styles.creditBalanceText, user.credit_balance === 0 && styles.zeroCreditBalanceText]}>
                          Credit: ${(user.credit_balance || 0).toFixed(2)}
                        </Paragraph>
                      </View>
                    )}
                  </>
                )}
              </View>

              <View style={styles.userActions}>
                {user.role === 'client' && (
                  <Button
                    mode="contained"
                    onPress={() => handleViewClientProfile(user)}
                    style={styles.actionButton}
                    icon="person"
                    compact
                  >
                    View Profile
                  </Button>
                )}
                
                {/* Status Management Buttons */}
                {user.status === 'active' && (
                  <>
                    <Button
                      mode="outlined"
                      onPress={() => handleSuspendUser(user)}
                      style={[styles.actionButton, styles.suspendButton]}
                      icon="block"
                      compact
                      textColor="#f44336"
                    >
                      Suspend
                    </Button>
                    <Button
                      mode="outlined"
                      onPress={() => handleDeactivateUser(user)}
                      style={[styles.actionButton, styles.deactivateButton]}
                      icon="pause"
                      compact
                      textColor="#ff9800"
                    >
                      Deactivate
                    </Button>
                  </>
                )}
                
                {user.status === 'suspended' && (
                  <Button
                    mode="outlined"
                    onPress={() => handleActivateUser(user)}
                    style={[styles.actionButton, styles.activateButton]}
                    icon="check-circle"
                    compact
                    textColor="#4caf50"
                  >
                    Activate
                  </Button>
                )}
                
                {user.status === 'inactive' && (
                  <Button
                    mode="outlined"
                    onPress={() => handleActivateUser(user)}
                    style={[styles.actionButton, styles.activateButton]}
                    icon="check-circle"
                    compact
                    textColor="#4caf50"
                  >
                    Activate
                  </Button>
                )}

                {/* Archive Button - available for all users */}
                <Button
                  mode="outlined"
                  onPress={() => handleArchiveUser(user)}
                  style={[styles.actionButton, styles.archiveButton]}
                  icon="archive"
                  compact
                  textColor="#9e9e9e"
                >
                  Archive
                </Button>
                
                <Button
                  mode="outlined"
                  onPress={() => handleEditUser(user)}
                  style={styles.actionButton}
                  icon="pencil"
                  compact
                >
                  Edit
                </Button>
                {isProspectClient(user) && (
                  <Button
                    mode="contained"
                    onPress={() => handleConvertProspectToClient(user)}
                    style={[styles.actionButton, { backgroundColor: '#FF6B6B' }]}
                    icon="arrow-right"
                    compact
                  >
                    Convert
                  </Button>
                )}
                <IconButton
                  icon="email"
                  mode="outlined"
                  onPress={() => Alert.alert('Feature', 'Send email functionality')}
                  size={20}
                />
                <IconButton
                  icon="delete"
                  mode="outlined"
                  onPress={() => handleDeleteUser(user)}
                  size={20}
                  iconColor="#f44336"
                />
              </View>
            </Card.Content>
          </Card>
        ))}

        {filteredUsers.length === 0 && (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <WebCompatibleIcon name="people-outline" size={48} color="#ccc" />
              <Title style={styles.emptyTitle}>No users found</Title>
              <Paragraph style={styles.emptyText}>
                Create your first user or adjust your search filters.
              </Paragraph>
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      <FAB
                      icon="add"
        style={styles.fab}
        onPress={handleCreateUser}
        label="New User"
      />

      <Portal>
        <Modal visible={modalVisible} onDismiss={() => setModalVisible(false)} contentContainerStyle={styles.modal}>
          <ScrollView>
            <Title style={styles.modalTitle}>
              {editingUser ? 'Edit User' : 'Create New User'}
            </Title>

            <TextInput
              label="Full Name *"
              value={formData.name}
              onChangeText={(text) => setFormData({...formData, name: text})}
              mode="outlined"
              style={styles.input}
            />

            <TextInput
              label="Email *"
              value={formData.email}
              onChangeText={(text) => setFormData({...formData, email: text})}
              mode="outlined"
              keyboardType="email-address"
              style={styles.input}
            />

            <TextInput
              label="Phone *"
              value={formData.phone}
              onChangeText={(text) => setFormData({...formData, phone: text})}
              mode="outlined"
              keyboardType="phone-pad"
              style={styles.input}
            />

            <TextInput
              label={editingUser ? "New Password (leave empty to keep current)" : "Password *"}
              value={formData.password}
              onChangeText={(text) => setFormData({...formData, password: text})}
              mode="outlined"
              secureTextEntry
              style={styles.input}
            />

            <SegmentedButtons
              value={formData.role}
              onValueChange={(value) => setFormData({...formData, role: value as UserRole})}
              buttons={[
                { value: 'client', label: 'Client' },
                { value: 'instructor', label: 'Instructor' },
                { value: 'reception', label: 'Reception' },
                { value: 'admin', label: 'Admin' },
              ]}
              style={styles.roleSelector}
            />

            <TextInput
              label="Emergency Contact"
              value={formData.emergencyContact}
              onChangeText={(text) => setFormData({...formData, emergencyContact: text})}
              mode="outlined"
              style={styles.input}
            />

            <TextInput
              label="Medical Conditions"
              value={formData.medicalConditions}
              onChangeText={(text) => setFormData({...formData, medicalConditions: text})}
              mode="outlined"
              multiline
              numberOfLines={2}
              style={styles.input}
            />

            {/* Referral Source Dropdown */}
            <Menu
              visible={referralMenuVisible}
              onDismiss={() => setReferralMenuVisible(false)}
              anchor={
                <TextInput
                  label="How did they hear about us?"
                  value={formData.referralSource === 'other' && customReferralText ? 
                    `Other: ${customReferralText}` : 
                    REFERRAL_SOURCES.find(s => s.value === formData.referralSource)?.label || 'Not specified'
                  }
                  mode="outlined"
                  style={styles.input}
                  editable={false}
                  onPress={() => setReferralMenuVisible(true)}
                  right={<TextInput.Icon icon="keyboard-arrow-down" onPress={() => setReferralMenuVisible(true)} />}
                />
              }
            >
              {REFERRAL_SOURCES.map((source) => (
                <Menu.Item
                  key={source.value}
                  onPress={() => {
                    setFormData({...formData, referralSource: source.value});
                    if (source.value !== 'other') {
                      setCustomReferralText(''); // Clear custom text when not "other"
                    }
                    setReferralMenuVisible(false);
                  }}
                  title={source.label}
                />
              ))}
            </Menu>

            {/* Custom referral text input when "other" is selected */}
            {formData.referralSource === 'other' && (
              <TextInput
                label="Please specify how they heard about us"
                value={customReferralText}
                onChangeText={setCustomReferralText}
                mode="outlined"
                style={styles.input}
                placeholder="e.g., Local gym recommendation, doctor referral, etc."
                multiline
                numberOfLines={2}
              />
            )}

            <View style={styles.modalActions}>
              <Button mode="outlined" onPress={() => setModalVisible(false)} disabled={saving}>
                Cancel
              </Button>
              <Button mode="contained" onPress={handleSaveUser} loading={saving} disabled={saving}>
                {editingUser ? 'Update' : 'Create'}
              </Button>
            </View>
          </ScrollView>
        </Modal>
      </Portal>

      {/* User Details Modal */}
      <Portal>
        <Modal 
          visible={userDetailsModalVisible} 
          onDismiss={() => setUserDetailsModalVisible(false)} 
          contentContainerStyle={styles.modal}
        >
          {selectedUser && (
            <ScrollView>
              <Title style={styles.modalTitle}>User Details</Title>
              
              <View style={styles.detailRow}>
                <Avatar.Text size={60} label={selectedUser.name.charAt(0)} style={styles.detailAvatar} />
                <View style={styles.detailInfo}>
                  <Title style={styles.detailName}>{selectedUser.name}</Title>
                  <Chip 
                    style={[styles.roleChip, { backgroundColor: getRoleColor(selectedUser.role) }]}
                    textStyle={styles.chipText}
                  >
                    {selectedUser.role.toUpperCase()}
                  </Chip>
                </View>
              </View>

              <View style={styles.detailSection}>
                <Paragraph style={styles.detailLabel}>Contact Information</Paragraph>
                <Paragraph style={styles.detailValue}>Email: {selectedUser.email}</Paragraph>
                <Paragraph style={styles.detailValue}>Phone: {selectedUser.phone}</Paragraph>
                {selectedUser.emergency_contact && (
                  <Paragraph style={styles.detailValue}>Emergency Contact: {selectedUser.emergency_contact}</Paragraph>
                )}
              </View>

              <View style={styles.detailSection}>
                <Paragraph style={styles.detailLabel}>Account Information</Paragraph>
                <Paragraph style={styles.detailValue}>Status: {selectedUser.status}</Paragraph>
                <Paragraph style={styles.detailValue}>
                  Join Date: {selectedUser.join_date ? new Date(selectedUser.join_date).toLocaleDateString() : 'N/A'}
                </Paragraph>
                {selectedUser.referral_source && (
                  <Paragraph style={styles.detailValue}>
                    Referral Source: {REFERRAL_SOURCES.find(s => s.value === selectedUser.referral_source)?.label || selectedUser.referral_source}
                  </Paragraph>
                )}
              </View>

              {selectedUser.role === 'client' && (
                <View style={styles.detailSection}>
                  <Paragraph style={styles.detailLabel}>Client Details</Paragraph>
                  {selectedUser.medical_conditions && (
                    <Paragraph style={styles.detailValue}>
                      Medical Conditions: {selectedUser.medical_conditions}
                    </Paragraph>
                  )}
                  {selectedUser.currentSubscription && (
                    <Paragraph style={styles.detailValue}>
                      Current Plan: {selectedUser.currentSubscription.plan_name}
                    </Paragraph>
                  )}
                </View>
              )}

              <View style={styles.modalActions}>
                <Button mode="outlined" onPress={() => setUserDetailsModalVisible(false)}>
                  Close
                </Button>
                <Button 
                  mode="contained" 
                  onPress={() => {
                    setUserDetailsModalVisible(false);
                    handleEditUser(selectedUser);
                  }}
                >
                  Edit User
                </Button>
              </View>
            </ScrollView>
          )}
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 20,
    color: '#666',
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
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: spacing.xs,
  },
  filtersContainer: {
    padding: 15,
    backgroundColor: 'white',
  },
  searchbar: {
    marginBottom: 15,
  },
  segmentedButtons: {
    marginBottom: 5,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  userCard: {
    marginBottom: 15,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  userInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  userDetails: {
    marginLeft: 15,
    flex: 1,
  },
  userName: {
    fontSize: 18,
    marginBottom: 5,
  },
  userEmail: {
    color: '#666',
    marginBottom: 2,
  },
  userPhone: {
    color: '#888',
    fontSize: 14,
  },
  userLabels: {
    alignItems: 'flex-end',
  },
  roleChip: {
    marginBottom: 5,
  },
  statusChip: {
    marginBottom: 5,
  },
  chipText: {
    color: 'white',
    fontSize: 12,
  },
  joinDateInfo: {
    marginBottom: 15,
  },
  joinDate: {
    color: '#888',
    fontSize: 12,
  },
  userActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  emptyCard: {
    marginTop: 50,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyTitle: {
    marginTop: 15,
    marginBottom: 10,
    color: '#666',
  },
  emptyText: {
    textAlign: 'center',
    color: '#888',
  },
  fab: {
    position: 'absolute',
    margin: spacing.md,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.light.accent,
    elevation: 6,
    boxShadow: '0px 3px 5px rgba(0, 0, 0, 0.3)'
  },
  modal: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
    maxHeight: '80%',
  },
  modalTitle: {
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    marginBottom: 15,
  },
  roleSelector: {
    marginBottom: 15,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  clickableUserName: {
    color: '#9B8A7D', // ANIMO primary color
    fontWeight: 'bold',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  detailAvatar: {
    marginRight: 15,
  },
  detailInfo: {
    flex: 1,
  },
  detailName: {
    marginBottom: 5,
  },
  detailSection: {
    marginBottom: 15,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  detailValue: {
    color: '#666',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#9B8A7D', // ANIMO primary color
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  userMeta: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  subscriptionInfo: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#e3f2fd',
    borderRadius: 4,
  },
  subscriptionText: {
    fontSize: 12,
    color: '#1976d2',
  },
  actionButton: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: -12,
    marginBottom: 12,
    marginLeft: 12,
  },
  creditBalanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    padding: 6,
    backgroundColor: '#e8f5e9',
    borderRadius: 4,
    gap: 4,
  },
  zeroCreditBalance: {
    backgroundColor: '#ffebee',
  },
  creditBalanceText: {
    fontSize: 12,
    color: '#2e7d32',
    fontWeight: '600',
  },
  zeroCreditBalanceText: {
    color: '#c62828',
  },
  suspendButton: {
    borderColor: '#f44336',
  },
  deactivateButton: {
    borderColor: '#ff9800',
  },
  activateButton: {
    borderColor: '#4caf50',
  },
  archiveButton: {
    borderColor: '#9e9e9e',
  },
});

export default UserManagement; 