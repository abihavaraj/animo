import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SubscriptionConflictDialog } from '../../components/SubscriptionConflictDialog';
import { SubscriptionPlan, subscriptionService } from '../../services/subscriptionService';
import { BackendUser, userService } from '../../services/userService';
import { UserRole } from '../../store/authSlice';

// Referral source options for PC user management
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

interface PCUserManagementProps {
  navigation?: any;
}

// PC-Optimized User Management Component
function PCUserManagement({ navigation }: PCUserManagementProps) {
  const [users, setUsers] = useState<BackendUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<keyof BackendUser>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [editingUser, setEditingUser] = useState<BackendUser | null>(null);
  const [assigningSubscriptionUser, setAssigningSubscriptionUser] = useState<BackendUser | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(20);
  const [saving, setSaving] = useState(false);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [subscriptionNotes, setSubscriptionNotes] = useState('');
  
  // Conflict dialog state
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflictData, setConflictData] = useState<any>(null);
  const [conflictLoading, setConflictLoading] = useState(false);

  // Referral source modal state
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [customReferralText, setCustomReferralText] = useState('');

  // Form state
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
    loadSubscriptionPlans();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await userService.getUsers();
      if (response.success && response.data) {
        setUsers(response.data);
      } else {
        Alert.alert('Error', 'Failed to load users');
        setUsers([]);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Error', 'Failed to load users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSubscriptionPlans = async () => {
    try {
      const plans = await subscriptionService.getSubscriptionPlans();
      setSubscriptionPlans(plans);
    } catch (error) {
      console.error('Error loading subscription plans:', error);
    }
  };

  // Filtered and sorted users
  const processedUsers = useMemo(() => {
    let filtered = users.filter(user => {
      const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (user.phone && user.phone.includes(searchQuery));
      const matchesRole = filterRole === 'all' || user.role === filterRole;
      const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
      return matchesSearch && matchesRole && matchesStatus;
    });

    // Sort users
    filtered.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      const modifier = sortDirection === 'asc' ? 1 : -1;
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return aValue.localeCompare(bValue) * modifier;
      }
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return (aValue - bValue) * modifier;
      }
      return 0;
    });

    return filtered;
  }, [users, searchQuery, filterRole, filterStatus, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(processedUsers.length / usersPerPage);
  const paginatedUsers = processedUsers.slice(
    (currentPage - 1) * usersPerPage,
    currentPage * usersPerPage
  );

  const handleSort = (field: keyof BackendUser) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSelectUser = (userId: number) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedUsers.size === paginatedUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(paginatedUsers.map(u => u.id)));
    }
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
    setShowCreateModal(true);
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
    setShowCreateModal(true);
  };

  const handleSaveUser = async () => {
    if (!formData.name || !formData.email || !formData.phone) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      setSaving(true);
      
      if (editingUser) {
        const finalReferralSource = formData.referralSource === 'other' ? customReferralText : formData.referralSource;
        
        const updateData = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
          emergencyContact: formData.emergencyContact || undefined,
          medicalConditions: formData.medicalConditions || undefined,
          referralSource: finalReferralSource || undefined
        };

        const response = await userService.updateUser(editingUser.id, updateData);
        if (response.success) {
          Alert.alert('Success', 'User updated successfully');
          await loadUsers();
        } else {
          Alert.alert('Error', response.error || 'Failed to update user');
        }
      } else {
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

        console.log('📝 Creating user with data:', userData);
        const response = await userService.createUser(userData);
        
        if (response.success) {
          Alert.alert('Success', `User ${formData.name} has been created successfully`);
          await loadUsers();
        } else {
          Alert.alert('Error', response.error || 'Failed to create user');
        }
      }
      
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error saving user:', error);
      Alert.alert('Error', 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const handleViewProfile = (user: BackendUser) => {
    console.log('🔍 handleViewProfile called for user:', user.id, user.name, user.role);
    console.log('🔍 Navigation object exists:', !!navigation);
    
    if (user.role === 'client') {
      if (!navigation) {
        console.error('❌ Navigation object is undefined!');
        Alert.alert('Error', 'Navigation not available. Please try again.');
        return;
      }
      
      const navigationParams = {
        userId: user.id,
        userName: user.name
      };
      
      console.log('🔍 Navigating to ClientProfile with params:', navigationParams);
      
      try {
        navigation.navigate('ClientProfile', navigationParams);
        console.log('✅ Navigation call completed');
      } catch (error) {
        console.error('❌ Navigation error:', error);
        Alert.alert('Error', 'Failed to navigate to client profile');
      }
    } else {
      Alert.alert('Info', 'Profile view is only available for client users');
    }
  };

  const handleAssignSubscription = (user: BackendUser) => {
    if (user.role !== 'client') {
      Alert.alert('Error', 'Subscriptions can only be assigned to clients');
      return;
    }
    setAssigningSubscriptionUser(user);
    setSelectedPlanId(null);
    setSubscriptionNotes('');
    setShowSubscriptionModal(true);
  };

  const handleSaveSubscriptionAssignment = async () => {
    if (!assigningSubscriptionUser || !selectedPlanId) {
      Alert.alert('Error', 'Please select a subscription plan');
      return;
    }

    try {
      setSaving(true);
      
      // First check for existing subscription conflicts
      const conflictResponse = await subscriptionService.checkExistingSubscription(
        assigningSubscriptionUser.id,
        selectedPlanId
      );

      if (!conflictResponse.success) {
        Alert.alert('Error', conflictResponse.error || 'Failed to check subscription status');
        return;
      }

      if (conflictResponse.data.hasExistingSubscription) {
        // Show conflict dialog with options
        setConflictData(conflictResponse.data);
        setShowConflictDialog(true);
        setShowSubscriptionModal(false);
      } else {
        // No conflict, proceed with assignment
        await proceedWithAssignment('direct', subscriptionNotes);
      }
    } catch (error) {
      console.error('Error checking subscription conflicts:', error);
      Alert.alert('Error', 'Failed to check subscription status');
    } finally {
      setSaving(false);
    }
  };

  const proceedWithAssignment = async (option: string, notes?: string) => {
    if (!assigningSubscriptionUser || !selectedPlanId) return;

    try {
      setConflictLoading(true);
      
      // Handle different conflict resolution options
      let response;
      
      switch (option) {
        case 'direct':
          // Direct assignment (new subscription)
          response = await subscriptionService.assignSubscription(
            assigningSubscriptionUser.id,
            selectedPlanId,
            notes || subscriptionNotes,
            'new'
          );
          break;
          
        case 'replace':
          // Replace existing subscription
          response = await subscriptionService.assignSubscription(
            assigningSubscriptionUser.id,
            selectedPlanId,
            notes || subscriptionNotes,
            'new'
          );
          break;
          
        case 'extend':
          // Extend existing subscription with classes from selected plan
          response = await subscriptionService.assignSubscription(
            assigningSubscriptionUser.id,
            selectedPlanId,
            notes || subscriptionNotes,
            'extend'
          );
          break;
          
        case 'queue':
          // Implement basic queue functionality
          response = await subscriptionService.assignSubscription(
            assigningSubscriptionUser.id,
            selectedPlanId,
            notes || subscriptionNotes,
            'queue'
          );
          break;
          
        default:
          Alert.alert('Error', 'Invalid option selected');
          setShowConflictDialog(false);
          return;
      }

      if (response && response.success) {
        const responseData = response.data;
        const operationType = responseData?.operationType || 'assigned';
        const paymentAmount = responseData?.paymentAmount || 0;
        const classesAdded = responseData?.classesAdded || 0;
        
        let successMessage = '';
        if (operationType === 'extended') {
          successMessage = `Successfully extended ${assigningSubscriptionUser.name}'s subscription with ${classesAdded} classes. Payment: $${paymentAmount}`;
        } else {
          successMessage = `Successfully assigned subscription to ${assigningSubscriptionUser.name}. Payment: $${paymentAmount}`;
        }
        
        Alert.alert('Success', successMessage);
        setShowSubscriptionModal(false);
        setShowConflictDialog(false);
        await loadUsers(); // Refresh the user list
      } else {
        Alert.alert('Error', response?.error || 'Failed to assign subscription');
      }
    } catch (error) {
      console.error('Error assigning subscription:', error);
      Alert.alert('Error', 'Failed to assign subscription');
    } finally {
      setConflictLoading(false);
    }
  };

  const handleConflictDialogDismiss = () => {
    setShowConflictDialog(false);
    setConflictData(null);
    setShowSubscriptionModal(true); // Return to subscription modal
  };

  const handleDeleteSelected = () => {
    if (selectedUsers.size === 0) return;
    
    Alert.alert(
      'Delete Users',
      `Are you sure you want to delete ${selectedUsers.size} user(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              for (const userId of selectedUsers) {
                await userService.deleteUser(userId);
              }
              Alert.alert('Success', 'Users deleted successfully');
              setSelectedUsers(new Set());
              await loadUsers();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete users');
            }
          }
        }
      ]
    );
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'client': return '#2196F3';
      case 'instructor': return '#FF9800';
      case 'reception': return '#4CAF50';
      case 'admin': return '#9C27B0';
      default: return '#666';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#4CAF50';
      case 'inactive': return '#9E9E9E';
      case 'suspended': return '#F44336';
      default: return '#666';
    }
  };

  const SortableHeader = ({ field, title }: { field: keyof BackendUser; title: string }) => (
    <TouchableOpacity 
      style={styles.tableHeader} 
      onPress={() => handleSort(field)}
    >
      <Text style={styles.tableHeaderText}>{title}</Text>
      {sortField === field && (
        <MaterialIcons 
          name={sortDirection === 'asc' ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} 
          size={16} 
          color="#666" 
        />
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <MaterialIcons name="hourglass-empty" size={48} color="#9B8A7D" />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>User Management</Text>
          <Text style={styles.subtitle}>
            {`${processedUsers.length} user${processedUsers.length !== 1 ? 's' : ''} found`}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.createButton} 
            onPress={handleCreateUser}
          >
            <MaterialIcons name="person-add" size={20} color="#fff" />
            <Text style={styles.createButtonText}>Create User</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filters and Search */}
      <View style={styles.filtersContainer}>
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users by name, email, or phone..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        
        <View style={styles.filterRow}>
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Role:</Text>
            <View style={styles.filterButtons}>
              {['all', 'client', 'instructor', 'reception', 'admin'].map(role => (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.filterButton,
                    filterRole === role && styles.filterButtonActive
                  ]}
                  onPress={() => setFilterRole(role)}
                >
                  <Text style={[
                    styles.filterButtonText,
                    filterRole === role && styles.filterButtonTextActive
                  ]}>
                    {role === 'all' ? 'All' : role.charAt(0).toUpperCase() + role.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Status:</Text>
            <View style={styles.filterButtons}>
              {['all', 'active', 'inactive', 'suspended'].map(status => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.filterButton,
                    filterStatus === status && styles.filterButtonActive
                  ]}
                  onPress={() => setFilterStatus(status)}
                >
                  <Text style={[
                    styles.filterButtonText,
                    filterStatus === status && styles.filterButtonTextActive
                  ]}>
                    {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </View>

      {/* Bulk Actions */}
      {selectedUsers.size > 0 && (
        <View style={styles.bulkActionsContainer}>
          <Text style={styles.bulkActionsText}>
            {`${selectedUsers.size} user${selectedUsers.size !== 1 ? 's' : ''} selected`}
          </Text>
          <TouchableOpacity 
            style={styles.bulkActionButton}
            onPress={handleDeleteSelected}
          >
            <MaterialIcons name="delete" size={18} color="#F44336" />
            <Text style={styles.bulkActionButtonText}>Delete Selected</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Data Table */}
      <View style={styles.tableContainer}>
        {/* Table Header */}
        <View style={styles.tableHeaderRow}>
          <TouchableOpacity 
            style={styles.checkboxHeader}
            onPress={handleSelectAll}
          >
            <MaterialIcons 
              name={selectedUsers.size === paginatedUsers.length && paginatedUsers.length > 0 
                ? "check-box" : "check-box-outline-blank"} 
              size={20} 
              color="#9B8A7D" 
            />
          </TouchableOpacity>
          <SortableHeader field="name" title="Name" />
          <SortableHeader field="email" title="Email" />
          <SortableHeader field="role" title="Role" />
          <SortableHeader field="status" title="Status" />
          <SortableHeader field="join_date" title="Joined" />
          <View style={styles.tableHeader}>
            <Text style={styles.tableHeaderText}>Actions</Text>
          </View>
        </View>

        {/* Table Body */}
        <ScrollView 
          style={styles.tableBody} 
          contentContainerStyle={styles.tableBodyContent}
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
        >
          {paginatedUsers.map((user) => (
            <View key={user.id} style={styles.tableRow}>
              <TouchableOpacity 
                style={styles.checkbox}
                onPress={() => handleSelectUser(user.id)}
              >
                <MaterialIcons 
                  name={selectedUsers.has(user.id) ? "check-box" : "check-box-outline-blank"} 
                  size={20} 
                  color="#9B8A7D" 
                />
              </TouchableOpacity>
              
              <View style={styles.tableCell}>
                <Text style={styles.userName}>{user.name}</Text>
                <Text style={styles.userPhone}>{user.phone}</Text>
              </View>
              
              <View style={styles.tableCell}>
                <Text style={styles.userEmail}>{user.email}</Text>
              </View>
              
              <View style={styles.tableCell}>
                <View style={[styles.roleTag, { backgroundColor: getRoleColor(user.role) }]}>
                  <Text style={styles.roleTagText}>{user.role}</Text>
                </View>
              </View>
              
              <View style={styles.tableCell}>
                <View style={[styles.statusTag, { backgroundColor: getStatusColor(user.status) }]}>
                  <Text style={styles.statusTagText}>{user.status}</Text>
                </View>
              </View>
              
              <View style={styles.tableCell}>
                <Text style={styles.joinDate}>
                  {new Date(user.join_date).toLocaleDateString()}
                </Text>
              </View>
              
              <View style={styles.actionsCell}>
                {user.role === 'client' && (
                  <>
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => handleViewProfile(user)}
                    >
                      <MaterialIcons name="visibility" size={18} color="#2196F3" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => handleAssignSubscription(user)}
                    >
                      <MaterialIcons name="card-membership" size={18} color="#4CAF50" />
                    </TouchableOpacity>
                  </>
                )}
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => handleEditUser(user)}
                >
                  <MaterialIcons name="edit" size={18} color="#FF9800" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Pagination */}
      {totalPages > 1 && (
        <View style={styles.paginationContainer}>
          <TouchableOpacity
            style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
            onPress={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            <MaterialIcons name="chevron-left" size={20} color={currentPage === 1 ? "#ccc" : "#666"} />
          </TouchableOpacity>
          
          <Text style={styles.paginationText}>
            {`Page ${currentPage} of ${totalPages}`}
          </Text>
          
          <TouchableOpacity
            style={[styles.paginationButton, currentPage === totalPages && styles.paginationButtonDisabled]}
            onPress={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            <MaterialIcons name="chevron-right" size={20} color={currentPage === totalPages ? "#ccc" : "#666"} />
          </TouchableOpacity>
        </View>
      )}

      {/* Create/Edit User Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingUser ? 'Edit User' : 'Create New User'}
              </Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowCreateModal(false)}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Name *</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.name}
                  onChangeText={(text) => setFormData({...formData, name: text})}
                  placeholder="Enter full name"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Email *</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.email}
                  onChangeText={(text) => setFormData({...formData, email: text})}
                  placeholder="Enter email address"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Phone *</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.phone}
                  onChangeText={(text) => setFormData({...formData, phone: text})}
                  placeholder="Enter phone number"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  Password {!editingUser && '*'}
                </Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.password}
                  onChangeText={(text) => setFormData({...formData, password: text})}
                  placeholder={editingUser ? "Leave blank to keep current password" : "Enter password"}
                  secureTextEntry
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Role *</Text>
                <View style={styles.roleSelector}>
                  {(['client', 'instructor', 'reception', 'admin'] as UserRole[]).map(role => (
                    <TouchableOpacity
                      key={role}
                      style={[
                        styles.roleOption,
                        formData.role === role && styles.roleOptionActive
                      ]}
                      onPress={() => setFormData({...formData, role})}
                    >
                      <Text style={[
                        styles.roleOptionText,
                        formData.role === role && styles.roleOptionTextActive
                      ]}>
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {formData.role === 'client' && (
                <>
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Emergency Contact</Text>
                    <TextInput
                      style={styles.formInput}
                      value={formData.emergencyContact}
                      onChangeText={(text) => setFormData({...formData, emergencyContact: text})}
                      placeholder="Enter emergency contact"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Medical Conditions</Text>
                    <TextInput
                      style={[styles.formInput, styles.textArea]}
                      value={formData.medicalConditions}
                      onChangeText={(text) => setFormData({...formData, medicalConditions: text})}
                      placeholder="Enter any medical conditions or notes..."
                      multiline
                      numberOfLines={3}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>How did they hear about us?</Text>
                    <View style={styles.dropdownContainer}>
                      <TouchableOpacity 
                        style={styles.dropdown}
                        onPress={() => setShowReferralModal(true)}
                      >
                        <Text style={styles.dropdownText}>
                          {formData.referralSource === 'other' && customReferralText ? 
                            `Other: ${customReferralText}` : 
                            REFERRAL_SOURCES.find(s => s.value === formData.referralSource)?.label || 'Not specified'
                          }
                        </Text>
                        <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Custom referral text input when "other" is selected */}
                  {formData.referralSource === 'other' && (
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Please specify how they heard about us</Text>
                      <TextInput
                        style={[styles.formInput, styles.textArea]}
                        value={customReferralText}
                        onChangeText={setCustomReferralText}
                        placeholder="e.g., Local gym recommendation, doctor referral, etc."
                        multiline
                        numberOfLines={2}
                      />
                    </View>
                  )}
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalSaveButton, saving && styles.modalSaveButtonDisabled]}
                onPress={handleSaveUser}
                disabled={saving}
              >
                <Text style={styles.modalSaveButtonText}>
                  {saving ? 'Saving...' : (editingUser ? 'Update' : 'Create')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Subscription Assignment Modal */}
      <Modal visible={showSubscriptionModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Assign Subscription to {assigningSubscriptionUser?.name}
              </Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowSubscriptionModal(false)}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Select Subscription Plan *</Text>
                <ScrollView style={styles.planSelector} nestedScrollEnabled={true}>
                  {subscriptionPlans.map((plan) => (
                    <TouchableOpacity
                      key={plan.id}
                      style={[
                        styles.planOption,
                        selectedPlanId === plan.id && styles.planOptionActive
                      ]}
                      onPress={() => setSelectedPlanId(plan.id)}
                    >
                      <View style={styles.planOptionRow}>
                        <View style={styles.planOptionContent}>
                          <View style={styles.planOptionHeader}>
                            <Text style={[
                              styles.planOptionTitle,
                              selectedPlanId === plan.id && styles.planOptionTitleActive
                            ]}>
                              {plan.name}
                            </Text>
                            <Text style={[
                              styles.planOptionPrice,
                              selectedPlanId === plan.id && styles.planOptionPriceActive
                            ]}>
                              ${plan.monthly_price}/month
                            </Text>
                          </View>
                          <Text style={[
                            styles.planOptionDescription,
                            selectedPlanId === plan.id && styles.planOptionDescriptionActive
                          ]}>
                            {plan.description}
                          </Text>
                          <View style={styles.planOptionDetails}>
                            <Text style={[
                              styles.planOptionDetail,
                              selectedPlanId === plan.id && styles.planOptionDetailActive
                            ]}>
                              📅 {plan.monthly_classes} classes/month
                            </Text>
                            <Text style={[
                              styles.planOptionDetail,
                              selectedPlanId === plan.id && styles.planOptionDetailActive
                            ]}>
                              🏋️ {plan.equipment_access}
                            </Text>
                            <Text style={[
                              styles.planOptionDetail,
                              selectedPlanId === plan.id && styles.planOptionDetailActive
                            ]}>
                              🏷️ {plan.category}
                            </Text>
                          </View>
                        </View>
                        {selectedPlanId === plan.id && (
                          <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Notes (Optional)</Text>
                <TextInput
                  style={[styles.formInput, styles.textArea]}
                  value={subscriptionNotes}
                  onChangeText={setSubscriptionNotes}
                  placeholder="Add any notes about this assignment..."
                  multiline
                  numberOfLines={3}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => setShowSubscriptionModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalSaveButton, saving && styles.modalSaveButtonDisabled]}
                onPress={handleSaveSubscriptionAssignment}
                disabled={saving || !selectedPlanId}
              >
                <Text style={styles.modalSaveButtonText}>
                  {saving ? 'Assigning...' : 'Assign Subscription'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Subscription Conflict Dialog */}
      <SubscriptionConflictDialog
        visible={showConflictDialog}
        onDismiss={handleConflictDialogDismiss}
        conflictData={conflictData}
        onProceed={proceedWithAssignment}
        loading={conflictLoading}
      />

      {/* Referral Source Selection Modal */}
      <Modal visible={showReferralModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>How did they hear about us?</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowReferralModal(false)}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {REFERRAL_SOURCES.map((source) => (
                <TouchableOpacity
                  key={source.value}
                  style={[
                    styles.referralOption,
                    formData.referralSource === source.value && styles.referralOptionActive
                  ]}
                  onPress={() => {
                    setFormData({...formData, referralSource: source.value});
                    if (source.value !== 'other') {
                      setCustomReferralText(''); // Clear custom text when not "other"
                    }
                    setShowReferralModal(false);
                  }}
                >
                  <Text style={[
                    styles.referralOptionText,
                    formData.referralSource === source.value && styles.referralOptionTextActive
                  ]}>
                    {source.label}
                  </Text>
                  {formData.referralSource === source.value && (
                    <MaterialIcons name="check" size={20} color="#9B8A7D" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#9B8A7D',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#9B8A7D',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  filtersContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#374151',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 32,
  },
  filterGroup: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterButtonActive: {
    backgroundColor: '#9B8A7D',
    borderColor: '#9B8A7D',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  bulkActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  bulkActionsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
  },
  bulkActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bulkActionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F44336',
  },
  tableContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    flex: 1,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  checkboxHeader: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  tableHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  tableBody: {
    flex: 1,
    maxHeight: 400, // Set maximum height for scrolling
  },
  tableBodyContent: {
    flexGrow: 1,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  checkbox: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableCell: {
    flex: 1,
    paddingHorizontal: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 12,
    color: '#6B7280',
  },
  userEmail: {
    fontSize: 14,
    color: '#374151',
  },
  roleTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  roleTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'capitalize',
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  statusTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'capitalize',
  },
  joinDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  actionsCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: 120,
  },
  actionButton: {
    padding: 6,
    borderRadius: 4,
    backgroundColor: '#f3f4f6',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 16,
  },
  paginationButton: {
    padding: 8,
    borderRadius: 4,
    backgroundColor: '#f3f4f6',
  },
  paginationButtonDisabled: {
    opacity: 0.5,
  },
  paginationText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '100%',
    maxWidth: 600,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
    maxHeight: 400,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#374151',
    backgroundColor: '#fff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  roleSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  roleOptionActive: {
    backgroundColor: '#9B8A7D',
    borderColor: '#9B8A7D',
  },
  roleOptionText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  roleOptionTextActive: {
    color: '#fff',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  modalCancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
  },
  modalCancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  modalSaveButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: '#9B8A7D',
  },
  modalSaveButtonDisabled: {
    opacity: 0.6,
  },
  modalSaveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  planSelector: {
    maxHeight: 200,
  },
  planOption: {
    padding: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    marginBottom: 8,
  },
  planOptionActive: {
    borderColor: '#9B8A7D',
  },
  planOptionContent: {
    flexDirection: 'column',
    flex: 1,
  },
  planOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  planOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  planOptionTitleActive: {
    color: '#9B8A7D',
  },
  planOptionPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  planOptionPriceActive: {
    color: '#9B8A7D',
  },
  planOptionDescription: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
  },
  planOptionDescriptionActive: {
    color: '#1F2937',
  },
  planOptionDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  planOptionDetail: {
    fontSize: 12,
    color: '#6B7280',
  },
  planOptionDetailActive: {
    color: '#9B8A7D',
  },
  planOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  conflictMessage: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 20,
  },
  conflictActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  conflictActionButton: {
    padding: 12,
    borderRadius: 6,
    backgroundColor: '#9B8A7D',
  },
  conflictActionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  dropdownContainer: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  dropdownText: {
    fontSize: 16,
    color: '#374151',
    marginRight: 8,
  },
  referralOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  referralOptionActive: {
    backgroundColor: '#f3f4f6',
  },
  referralOptionText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  referralOptionTextActive: {
    color: '#9B8A7D',
  },
});

export default PCUserManagement; 