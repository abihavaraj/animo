import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSelector } from 'react-redux';
import { SubscriptionConflictDialog } from '../../components/SubscriptionConflictDialog';
import WebCompatibleIcon from '../../components/WebCompatibleIcon';
import { activityService } from '../../services/activityService';
import { instructorClientService } from '../../services/instructorClientService';
import { SubscriptionPlan, subscriptionService } from '../../services/subscriptionService';
import { BackendUser, userService } from '../../services/userService';
import { RootState } from '../../store';
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
  onViewProfile?: (userId: string, userName: string, userRole?: string) => void;
  hideAdminUsers?: boolean; // New prop to hide admin users for reception staff
}

// PC-Optimized User Management Component
function PCUserManagement({ navigation, onViewProfile, hideAdminUsers = false }: PCUserManagementProps) {
  const { user: currentUser } = useSelector((state: RootState) => state.auth);
  const [users, setUsers] = useState<BackendUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<keyof BackendUser>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedUsers, setSelectedUsers] = useState<Set<string | number>>(new Set());
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

  // Instructor assignment modal state
  const [showInstructorAssignmentModal, setShowInstructorAssignmentModal] = useState(false);
  const [assigningInstructorUser, setAssigningInstructorUser] = useState<BackendUser | null>(null);
  const [instructors, setInstructors] = useState<BackendUser[]>([]);
  const [selectedInstructorId, setSelectedInstructorId] = useState<string | null>(null);
  const [assignmentNotes, setAssignmentNotes] = useState('');
  
  // Track which clients have instructor assignments
  const [clientInstructorAssignments, setClientInstructorAssignments] = useState<Map<string, {id: string, name: string}>>(new Map());

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

  // Helper function to check if a user is a prospect client
  const isProspectClient = (user: BackendUser) => {
    return user.role === 'client' && user.referral_source === 'Prospect Client';
  };

  useEffect(() => {
    loadUsers();
    loadSubscriptionPlans();
  }, []);

  // Load instructor assignments after users are loaded
  useEffect(() => {
    if (users.length > 0) {
      loadClientInstructorAssignments();
    }
  }, [users]);

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

  const loadInstructors = async () => {
    try {
      const response = await userService.getUsers({ role: 'instructor' });
      if (response.success && response.data) {
        setInstructors(response.data);
      }
    } catch (error) {
      console.error('Error loading instructors:', error);
    }
  };

  const loadClientInstructorAssignments = async () => {
    try {
      const { instructorClientService } = require('../../services/instructorClientService');
      const assignments = new Map<string, {id: string, name: string}>();
      
      // Get only client users
      const clientUsers = users.filter(user => user.role === 'client');
      
      // Check assignments for each client
      await Promise.all(clientUsers.map(async (client) => {
        try {
          const response = await instructorClientService.getClientCurrentInstructor(client.id.toString());
          if (response.success && response.data) {
            assignments.set(client.id.toString(), {
              id: response.data.id,
              name: response.data.name
            });
          }
        } catch (error) {
          console.error(`Failed to get assignment for client ${client.id}:`, error);
        }
      }));
      
      setClientInstructorAssignments(assignments);
    } catch (error) {
      console.error('Failed to load client instructor assignments:', error);
    }
  };

  // Filtered and sorted users
  const processedUsers = useMemo(() => {
    let filtered = users.filter(user => {
      // Hide admin users if hideAdminUsers prop is true
      if (hideAdminUsers && user.role === 'admin') {
        return false;
      }
      
      const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (user.phone && user.phone.includes(searchQuery));
      
      // Handle prospect filtering separately since prospects are clients with special referral source
      let matchesRole;
      if (filterRole === 'prospect') {
        matchesRole = isProspectClient(user);
        if (matchesRole) {
          console.log('✅ Found prospect:', user.name, user.referral_source);
        }
      } else {
        matchesRole = filterRole === 'all' || user.role === filterRole;
      }
      
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
  const allCurrentPageSelected = paginatedUsers.length > 0 && paginatedUsers.every(u => selectedUsers.has(u.id));

  // Reset to first page when filters/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterRole, filterStatus]);

  const handleSort = (field: keyof BackendUser) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSelectUser = (userId: number | string) => {
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

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    // Validate password for new users
    if (!editingUser && (!formData.password || formData.password.length < 6)) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    try {
      setSaving(true);
      
      if (editingUser) {
        const finalReferralSource = formData.referralSource === 'other' ? customReferralText : formData.referralSource;
        
        const updateData = {
          name: formData.name,
          phone: formData.phone,
          role: formData.role,
          emergency_contact: formData.emergencyContact || undefined,
          medical_conditions: formData.medicalConditions || undefined,
          referral_source: finalReferralSource || undefined
        };

        const response = await userService.updateUser(String(editingUser.id), updateData);
        
        if (response.success) {
          let warnings: string[] = [];
          
          // Update email separately if it changed
          if (formData.email !== editingUser.email) {
            const emailResponse = await userService.updateEmail(String(editingUser.id), {
              newEmail: formData.email
            });
            
            if (!emailResponse.success) {
              warnings.push('email update failed');
            }
          }
          
          // Update password if provided
          if (formData.password) {
            const passwordResponse = await userService.updatePassword(String(editingUser.id), {
              newPassword: formData.password
            });
            
            if (!passwordResponse.success) {
              warnings.push('password update failed');
            }
          }
          
          // Log activity for user update
          if (currentUser && editingUser) {
            await activityService.logActivity({
              staff_id: currentUser.id,
              staff_name: currentUser.name,
              staff_role: currentUser.role as 'reception' | 'instructor' | 'admin',
              activity_type: 'profile_updated',
              activity_description: `Updated ${editingUser.role} profile`,
              client_id: String(editingUser.id),
              client_name: editingUser.name,
              metadata: {
                updatedFields: Object.keys(updateData),
                role: editingUser.role,
                passwordChanged: !!formData.password
              }
            });
          }

          const warningText = warnings.length > 0 ? ` (${warnings.join(', ')})` : '';
          const successMessage = `User ${formData.name} has been updated${formData.password ? ' with new password' : ''}${warningText}`;
          
          Alert.alert(warnings.length > 0 ? 'Partial Success' : 'Success', successMessage);
          setShowCreateModal(false);
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
          // Log activity for user creation
          if (currentUser) {
            await activityService.logActivity({
              staff_id: currentUser.id,
              staff_name: currentUser.name,
              staff_role: currentUser.role as 'reception' | 'instructor' | 'admin',
              activity_type: 'client_created',
              activity_description: `Created new ${formData.role} account`,
              client_id: response.data?.id,
              client_name: formData.name,
              metadata: {
                role: formData.role,
                referralSource: finalReferralSource
              }
            });
          }
          
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
    
    // Check if this is a staff member (reception/instructor) for enhanced profile view
    const isStaffMember = user.role === 'reception' || user.role === 'instructor';

    if (onViewProfile) {
      console.log('🔍 Using onViewProfile callback');
      onViewProfile(String(user.id), user.name, user.role);
    } else if (navigation && navigation.navigate) {
      try {
        const params = {
          userId: String(user.id),
          userName: user.name,
          userRole: user.role, // Pass role for enhanced logic
          isStaffProfile: isStaffMember, // Flag for staff profile handling
        };
        
        // Use ReceptionClientProfile for all profiles with role-specific enhancements
        navigation.navigate('ClientProfile', params);
      } catch (error) {
        console.error('❌ Navigation failed:', error);
        Alert.alert('Navigation Error', 'Failed to navigate to user profile');
      }
    } else {
      console.log('⚠️ No navigation method available, showing profile summary');
      
      // Enhanced summary for staff members
      const summaryTitle = isStaffMember 
        ? `${user.name} - ${user.role.charAt(0).toUpperCase() + user.role.slice(1)} Profile`
        : `${user.name} - Client Profile`;
      
      const summaryText = `📧 Email: ${user.email}\n👤 Role: ${user.role}\n📊 Status: ${user.status}${
        user.credit_balance !== undefined ? `\n💳 Credits: ${user.credit_balance}` : ''
      }${user.phone ? `\n📞 Phone: ${user.phone}` : ''}${
        user.referral_source ? `\n🔗 Referral: ${user.referral_source}` : ''
      }${isStaffMember ? '\n\n🏢 Staff member - View full profile for activity tracking' : ''}`;
      
      Alert.alert(
        summaryTitle, 
        summaryText,
        [
          { text: 'Close', style: 'cancel' },
          { text: 'Edit User', onPress: () => handleEditUser(user) }
        ]
      );
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
        // No conflict, proceed with direct assignment
        console.log('🔍 USER MGMT: No existing subscription, proceeding with assignment...');
        const response = await subscriptionService.assignSubscription(
          assigningSubscriptionUser.id,
          selectedPlanId,
          subscriptionNotes || 'Assigned via reception user management'
        );
        
        if (response && response.success) {
          // Log activity for subscription assignment
          if (currentUser && assigningSubscriptionUser && selectedPlanId) {
            const selectedPlan = subscriptionPlans.find(plan => plan.id === selectedPlanId);
            await activityService.logActivity({
              staff_id: currentUser.id,
              staff_name: currentUser.name,
              staff_role: currentUser.role as 'reception' | 'instructor' | 'admin',
              activity_type: 'subscription_added',
              activity_description: `Assigned subscription: ${selectedPlan?.name || 'Unknown Plan'}`,
              client_id: String(assigningSubscriptionUser.id),
              client_name: assigningSubscriptionUser.name,
              metadata: {
                planName: selectedPlan?.name,
                planId: selectedPlanId,
                monthlyPrice: selectedPlan?.monthlyPrice,
                monthlyClasses: selectedPlan?.monthlyClasses,
                notes: subscriptionNotes
              }
            });
          }

          Alert.alert('Success', 'Subscription plan assigned successfully!');
          setShowSubscriptionModal(false);
          setAssigningSubscriptionUser(null);
          setSelectedPlanId(null);
          setSubscriptionNotes('');
          await loadUsers(); // Refresh the user list
        } else {
          Alert.alert('Error', response?.error || 'Failed to assign subscription plan');
        }
      }
    } catch (error) {
      console.error('Error checking subscription conflicts:', error);
      Alert.alert('Error', 'Failed to check subscription status');
    } finally {
      setSaving(false);
    }
  };

  const proceedWithAssignment = async (option: string, notes?: string) => {
    // Ensure we have the necessary data from the conflict dialog
    if (!conflictData || !conflictData.user || !conflictData.newPlan) {
      Alert.alert('Error', 'Cannot proceed without required conflict data.');
      return;
    }
  
    const userId = conflictData.user.id;
    const planId = conflictData.newPlan.id;
    const assignmentNotes = notes || subscriptionNotes || 'Assigned via reception user management';

    console.log(`[proceedWithAssignment] Action: ${option}, UserID: ${userId}, PlanID: ${planId}`);

    if (!userId || !planId) {
      Alert.alert('Error', 'User ID or Plan ID is missing in conflict data.');
      return;
    }

    try {
      setConflictLoading(true);
      
      const response = await subscriptionService.assignSubscription(
        userId,
        planId,
        assignmentNotes,
        option as 'new' | 'replace' | 'extend' | 'queue' // Cast the option string
      );

      if (response && response.success) {
        const responseData = response.data;
        const operationType = responseData?.operationType || 'assigned';
        const paymentAmount = responseData?.paymentAmount || 0;
        const classesAdded = responseData?.classesAdded || 0;
        
        let successMessage = '';
        if (operationType === 'extended') {
          successMessage = `Successfully extended subscription with ${classesAdded} classes.`;
        } else if (operationType === 'replaced') {
          successMessage = `Successfully replaced subscription.`;
        } else if (operationType === 'queued') {
          successMessage = `New subscription has been queued.`;
        } else {
          successMessage = `Successfully assigned subscription.`;
        }

        if (paymentAmount > 0) {
          successMessage += ` Payment recorded: ${paymentAmount.toLocaleString()} ALL.`;
        }
        
        // Log activity for conflict resolution subscription assignment
        if (currentUser && conflictData) {
          const activityDescription = operationType === 'extended' ? 
            `Extended subscription: ${conflictData.newPlan.name}` :
            operationType === 'replaced' ?
            `Replaced subscription with: ${conflictData.newPlan.name}` :
            operationType === 'queued' ?
            `Queued subscription: ${conflictData.newPlan.name}` :
            `Assigned subscription: ${conflictData.newPlan.name}`;

          await activityService.logActivity({
            staff_id: currentUser.id,
            staff_name: currentUser.name,
            staff_role: currentUser.role as 'reception' | 'instructor' | 'admin',
            activity_type: 'subscription_added',
            activity_description: activityDescription,
            client_id: String(userId),
            client_name: conflictData.user.name,
            metadata: {
              planName: conflictData.newPlan.name,
              planId: planId,
              operationType: operationType,
              paymentAmount: paymentAmount,
              classesAdded: classesAdded,
              conflictResolution: option,
              notes: assignmentNotes
            }
          });
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
      Alert.alert('Error', `Failed to assign subscription: ${(error as Error).message}`);
    } finally {
      setConflictLoading(false);
    }
  };

  const handleConflictDialogDismiss = () => {
    setShowConflictDialog(false);
    setConflictData(null);
    setShowSubscriptionModal(true); // Return to subscription modal
  };

  // Instructor Assignment Functions
  const handleAssignToInstructor = (user: BackendUser) => {
    if (user.role !== 'client') {
      Alert.alert('Error', 'Only clients can be assigned to instructors');
      return;
    }
    setAssigningInstructorUser(user);
    setSelectedInstructorId(null);
    setAssignmentNotes('');
    loadInstructors();
    setShowInstructorAssignmentModal(true);
  };

  const handleSaveInstructorAssignment = async () => {
    if (!assigningInstructorUser || !selectedInstructorId) {
      Alert.alert('Error', 'Please select an instructor');
      return;
    }

    if (!currentUser?.id) {
      Alert.alert('Error', 'Current user not found');
      return;
    }

    try {
      setSaving(true);
      
      const response = await instructorClientService.assignClientToInstructor(
        assigningInstructorUser.id.toString(),
        selectedInstructorId,
        currentUser.id, // Use current user's UUID instead of 'reception'
        'primary',
        assignmentNotes || 'Assigned via reception user management'
      );

      if (response.success) {
        // Log activity for instructor assignment
        if (currentUser && assigningInstructorUser && selectedInstructorId) {
          const assignedInstructor = instructors.find(instructor => instructor.id === selectedInstructorId);
          await activityService.logActivity({
            staff_id: currentUser.id,
            staff_name: currentUser.name,
            staff_role: currentUser.role as 'reception' | 'instructor' | 'admin',
            activity_type: 'instructor_assigned',
            activity_description: `Assigned client to instructor: ${assignedInstructor?.name || 'Unknown'}`,
            client_id: String(assigningInstructorUser.id),
            client_name: assigningInstructorUser.name,
            metadata: {
              instructorName: assignedInstructor?.name,
              instructorId: selectedInstructorId,
              assignmentType: 'primary',
              notes: assignmentNotes
            }
          });
        }

        Alert.alert('Success', 'Client assigned to instructor successfully!');
        setShowInstructorAssignmentModal(false);
        setAssigningInstructorUser(null);
        setSelectedInstructorId(null);
        setAssignmentNotes('');
        await loadUsers(); // Refresh the user list
        await loadClientInstructorAssignments(); // Refresh assignments
      } else {
        Alert.alert('Error', response.error || 'Failed to assign client to instructor');
      }
    } catch (error) {
      console.error('Error assigning client to instructor:', error);
      Alert.alert('Error', 'Failed to assign client to instructor');
    } finally {
      setSaving(false);
    }
  };

  const handleUnassignFromInstructor = async (user: BackendUser) => {
    if (user.role !== 'client') {
      Alert.alert('Error', 'Only clients can be unassigned from instructors');
      return;
    }

    // Show confirmation dialog
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(`Are you sure you want to unassign ${user.name} from their current instructor?`);
      if (!confirmed) return;
    } else {
      Alert.alert(
        'Confirm Unassign',
        `Are you sure you want to unassign ${user.name} from their current instructor?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Unassign', style: 'destructive', onPress: () => performUnassign(user) }
        ]
      );
      return;
    }

    performUnassign(user);
  };

  const performUnassign = async (user: BackendUser) => {
    try {
      setSaving(true);
      
      // First get the current instructor assignment
      const { instructorClientService } = require('../../services/instructorClientService');
      const currentInstructorResponse = await instructorClientService.getClientCurrentInstructor(user.id.toString());
      
      if (!currentInstructorResponse.success || !currentInstructorResponse.data) {
        Alert.alert('Info', 'This client is not currently assigned to any instructor.');
        return;
      }
      
      const currentInstructor = currentInstructorResponse.data;
      
      // Unassign the client from the instructor
      const unassignResponse = await instructorClientService.unassignClientFromInstructor(
        user.id.toString(),
        currentInstructor.id,
        currentUser?.id?.toString() || 'reception',
        'Unassigned via reception user management'
      );
      
      if (unassignResponse.success) {
        // Log activity for instructor unassignment
        if (currentUser) {
          await activityService.logActivity({
            staff_id: currentUser.id,
            staff_name: currentUser.name,
            staff_role: currentUser.role as 'reception' | 'instructor' | 'admin',
            activity_type: 'instructor_unassigned',
            activity_description: `Unassigned client from instructor: ${currentInstructor.name}`,
            client_id: String(user.id),
            client_name: user.name,
            metadata: {
              instructorName: currentInstructor.name,
              instructorId: currentInstructor.id,
              reason: 'Unassigned via reception user management'
            }
          });
        }

        Alert.alert('Success', `${user.name} has been unassigned from instructor ${currentInstructor.name}`);
        await loadUsers(); // Refresh the user list
        await loadClientInstructorAssignments(); // Refresh assignments
      } else {
        Alert.alert('Error', unassignResponse.error || 'Failed to unassign client from instructor');
      }
      
    } catch (error) {
      console.error('Error unassigning client from instructor:', error);
      Alert.alert('Error', 'Failed to unassign client from instructor');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = (user: BackendUser) => {
    console.log('🗑️ PC - Delete button clicked for user:', user.name, user.id);
    
    // For PC/Web environment, use browser confirm
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(`Are you sure you want to delete ${user.name}? This action cannot be undone.`);
      if (confirmed) {
        console.log('🗑️ PC - User confirmed delete action for:', user.name);
        deleteUserAction(user);
      } else {
        console.log('🗑️ PC - User cancelled delete action');
      }
      return;
    }

    Alert.alert(
      'Delete User',
      `Are you sure you want to delete ${user.name}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => deleteUserAction(user)
        }
      ]
    );
  };

  const deleteUserAction = async (user: BackendUser) => {
    try {
      console.log('🗑️ PC - Deleting user:', user.name, user.id);
      const response = await userService.deleteUser(String(user.id));
      console.log('🗑️ PC - Delete response:', response);
      
      if (response.success) {
        if (typeof window !== 'undefined') {
          window.alert('User deleted successfully');
        } else {
          Alert.alert('Success', 'User deleted successfully');
        }
        await loadUsers();
      } else {
        console.error('❌ PC - Delete failed:', response.error);
        const errorMsg = response.error || 'Failed to delete user';
        if (typeof window !== 'undefined') {
          window.alert('Error: ' + errorMsg);
        } else {
          Alert.alert('Error', errorMsg);
        }
      }
    } catch (error) {
      console.error('❌ PC - Error deleting user:', error);
      const errorMsg = 'Failed to delete user. Please try again.';
      if (typeof window !== 'undefined') {
        window.alert('Error: ' + errorMsg);
      } else {
        Alert.alert('Error', errorMsg);
      }
    }
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
                await userService.deleteUser(String(userId));
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

  const handleUpdateUserStatus = async (user: BackendUser, newStatus: 'active' | 'inactive' | 'suspended') => {
    try {
      console.log('🔄 PC - Starting handleUpdateUserStatus...');
      console.log('🔄 PC - User:', user.name, 'ID:', user.id);
      console.log('🔄 PC - Status change:', user.status, '->', newStatus);
      
      // Check if we have the userService
      if (!userService) {
        console.error('❌ PC - userService is not available!');
        Alert.alert('Error', 'User service not available');
        return;
      }
      
      console.log('🔄 PC - Calling userService.updateUser...');
      const response = await userService.updateUser(String(user.id), { status: newStatus });
      console.log('🔄 PC - Raw response received:', response);
      
      if (response && response.success) {
        console.log('✅ PC - Status update successful!');
        if (typeof window !== 'undefined') {
          window.alert(`Success: User status updated to ${newStatus}`);
        } else {
          Alert.alert('Success', `User status updated to ${newStatus}`);
        }
        console.log('🔄 PC - Reloading users...');
        await loadUsers();
        console.log('✅ PC - Users reloaded successfully');
      } else {
        console.error('❌ PC - Status update failed:', response);
        const errorMessage = response?.error || response?.message || 'Failed to update user status';
        console.error('❌ PC - Error message:', errorMessage);
        if (typeof window !== 'undefined') {
          window.alert(`Error: ${errorMessage}`);
        } else {
          Alert.alert('Error', errorMessage);
        }
      }
    } catch (error) {
      console.error('❌ PC - Exception in handleUpdateUserStatus:', error);
      console.error('❌ PC - Error details:', error);
      const errorMsg = `Failed to update user status: ${error}`;
      if (typeof window !== 'undefined') {
        window.alert(`Error: ${errorMsg}`);
      } else {
        Alert.alert('Error', errorMsg);
      }
    }
  };

  const handleSuspendUser = (user: BackendUser) => {
    console.log('🛑 PC - Suspend button clicked for user:', user.name, user.id);
    console.log('🛑 PC - About to show confirmation dialog...');
    
    // For PC/Web environment, use browser confirm instead of React Native Alert
    if (typeof window !== 'undefined') {
      console.log('🛑 PC - Using browser confirm dialog');
      const confirmed = window.confirm(`Are you sure you want to suspend ${user.name}'s account?`);
      if (confirmed) {
        console.log('🛑 PC - User confirmed suspend action for:', user.name);
        handleUpdateUserStatus(user, 'suspended');
      } else {
        console.log('🛑 PC - User cancelled suspend action');
      }
      return;
    }
    
    // Fallback to React Native Alert for mobile
    try {
      Alert.alert(
        'Suspend Account',
        `Are you sure you want to suspend ${user.name}'s account?`,
        [
          { 
            text: 'Cancel', 
            style: 'cancel',
            onPress: () => console.log('🛑 PC - User cancelled suspend action')
          },
          { 
            text: 'Suspend', 
            style: 'destructive',
            onPress: () => {
              console.log('🛑 PC - User confirmed suspend action for:', user.name);
              console.log('🛑 PC - Calling handleUpdateUserStatus...');
              handleUpdateUserStatus(user, 'suspended');
            }
          }
        ]
      );
      console.log('🛑 PC - Alert.alert called successfully');
    } catch (error) {
      console.error('🛑 PC - Error showing alert:', error);
      // Fallback: direct call without confirmation
      console.log('🛑 PC - Fallback: calling handleUpdateUserStatus directly');
      handleUpdateUserStatus(user, 'suspended');
    }
  };

  const handleDeactivateUser = (user: BackendUser) => {
    console.log('⏸️ PC - Deactivate button clicked for user:', user.name, user.id);
    
    // For PC/Web environment, use browser confirm
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(`Are you sure you want to deactivate ${user.name}'s account?`);
      if (confirmed) {
        console.log('⏸️ PC - User confirmed deactivate action for:', user.name);
        handleUpdateUserStatus(user, 'inactive');
      } else {
        console.log('⏸️ PC - User cancelled deactivate action');
      }
      return;
    }

    Alert.alert(
      'Deactivate Account',
      `Are you sure you want to deactivate ${user.name}'s account?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Deactivate', 
          style: 'destructive',
          onPress: () => {
            console.log('⏸️ PC - Confirming deactivate for user:', user.name);
            handleUpdateUserStatus(user, 'inactive');
          }
        }
      ]
    );
  };

  const handleActivateUser = (user: BackendUser) => {
    console.log('✅ PC - Activate button clicked for user:', user.name, user.id);
    
    // For PC/Web environment, use browser confirm
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(`Are you sure you want to activate ${user.name}'s account?`);
      if (confirmed) {
        console.log('✅ PC - User confirmed activate action for:', user.name);
        handleUpdateUserStatus(user, 'active');
      } else {
        console.log('✅ PC - User cancelled activate action');
      }
      return;
    }

    Alert.alert(
      'Activate Account',
      `Are you sure you want to activate ${user.name}'s account?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Activate', 
          onPress: () => {
            console.log('✅ PC - Confirming activate for user:', user.name);
            handleUpdateUserStatus(user, 'active');
          }
        }
      ]
    );
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'client': return '#6B8E7F'; // Studio accent
      case 'instructor': return '#D4A574'; // Studio warning
      case 'reception': return '#7DCEA0'; // Studio success
      case 'admin': return '#4A90E2'; // Studio primary
      default: return '#999999'; // Muted text
    }
  };

  const handleConvertProspectToClient = async (user: BackendUser) => {
    console.log('🔄 Convert prospect clicked for user:', user.name, user.id);
    console.log('🔍 Is prospect client:', isProspectClient(user));
    
    if (!isProspectClient(user)) {
      if (typeof window !== 'undefined') {
        window.alert('Error: This user is not a prospect client');
      } else {
        Alert.alert('Error', 'This user is not a prospect client');
      }
      return;
    }

    const confirmed = typeof window !== 'undefined' 
      ? window.confirm(`Are you sure you want to convert "${user.name}" from prospect to regular client? This will remove the prospect label.`)
      : await new Promise((resolve) => {
          Alert.alert(
            'Convert Prospect to Client',
            `Are you sure you want to convert "${user.name}" from prospect to regular client? This will remove the prospect label.`,
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Convert', onPress: () => resolve(true) }
            ]
          );
        });

    if (!confirmed) return;

    try {
      const response = await userService.updateUser(String(user.id), {
        referral_source: 'Converted from Prospect'
      });

      if (response.success) {
        const successMessage = `${user.name} has been converted to a regular client`;
        if (typeof window !== 'undefined') {
          window.alert('Success: ' + successMessage);
        } else {
          Alert.alert('Success', successMessage);
        }
        await loadUsers();
      } else {
        const errorMessage = response.error || 'Failed to convert prospect';
        if (typeof window !== 'undefined') {
          window.alert('Error: ' + errorMessage);
        } else {
          Alert.alert('Error', errorMessage);
        }
      }
    } catch (error) {
      console.error('Error converting prospect:', error);
      const errorMessage = 'Failed to convert prospect';
      if (typeof window !== 'undefined') {
        window.alert('Error: ' + errorMessage);
      } else {
        Alert.alert('Error', errorMessage);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#7DCEA0'; // Studio success
      case 'inactive': return '#999999'; // Muted text
      case 'suspended': return '#C47D7D'; // Studio error
      default: return '#999999'; // Muted text
    }
  };

  const SortableHeader = ({ field, title }: { field: keyof BackendUser; title: string }) => (
    <TouchableOpacity 
      style={styles.tableHeader} 
      onPress={() => handleSort(field)}
    >
      <Text style={styles.tableHeaderText}>{title}</Text>
      {sortField === field && (
        <WebCompatibleIcon 
          name={sortDirection === 'asc' ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} 
          size={16} 
          color="#666666" 
        />
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <WebCompatibleIcon name="hourglass-empty" size={48} color="#6B8E7F" />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  return (
    <div style={webStyles.container}>
      {/* Header Section */}
      <div style={webStyles.header}>
        <div style={webStyles.headerLeft}>
          <h1 style={webStyles.headerTitle}>User Management</h1>
          <p style={webStyles.headerSubtitle}>
            {`${processedUsers.length} user${processedUsers.length !== 1 ? 's' : ''} found`}
          </p>
        </div>
        <div style={webStyles.headerRight}>
          <button 
            style={webStyles.createButton} 
            onClick={handleCreateUser}
          >
            <WebCompatibleIcon name="person-add" size={20} color="#FFFFFF" />
            <span style={webStyles.createButtonText}>Create User</span>
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div style={webStyles.filtersContainer}>
        <div style={webStyles.searchContainer}>
                     <WebCompatibleIcon name="search" size={20} color="#666666" />
          <input
            style={webStyles.searchInput}
            placeholder="Search users by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div style={webStyles.filterRow}>
          <div style={webStyles.filterGroup}>
            <label style={webStyles.filterLabel}>Role:</label>
            <div style={webStyles.filterButtons}>
              {['all', 'client', 'instructor', 'reception', ...(hideAdminUsers ? [] : ['admin']), 'prospect'].map(role => (
                <button
                  key={role}
                  style={{
                    ...webStyles.filterButton,
                    ...(filterRole === role ? webStyles.filterButtonActive : {})
                  }}
                  onClick={() => setFilterRole(role)}
                >
                  <span style={{
                    ...webStyles.filterButtonText,
                    ...(filterRole === role ? webStyles.filterButtonTextActive : {})
                  }}>
                    {role === 'all' ? 'All' : role.charAt(0).toUpperCase() + role.slice(1)}
                  </span>
                </button>
              ))}
            </div>
          </div>
          
          <div style={webStyles.filterGroup}>
            <label style={webStyles.filterLabel}>Status:</label>
            <div style={webStyles.filterButtons}>
              {['all', 'active', 'inactive', 'suspended'].map(status => (
                <button
                  key={status}
                  style={{
                    ...webStyles.filterButton,
                    ...(filterStatus === status ? webStyles.filterButtonActive : {})
                  }}
                  onClick={() => setFilterStatus(status)}
                >
                  <span style={{
                    ...webStyles.filterButtonText,
                    ...(filterStatus === status ? webStyles.filterButtonTextActive : {})
                  }}>
                    {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedUsers.size > 0 && (
        <div style={webStyles.bulkActionsContainer}>
          <span style={webStyles.bulkActionsText}>
            {`${selectedUsers.size} user${selectedUsers.size !== 1 ? 's' : ''} selected`}
          </span>
          <button 
            style={webStyles.bulkActionButton}
            onClick={handleDeleteSelected}
          >
            <WebCompatibleIcon name="delete" size={18} color="#C47D7D" />
            <span style={webStyles.bulkActionButtonText}>Delete Selected</span>
          </button>
        </div>
      )}

      {/* Data Table */}
      <div style={webStyles.tableContainer}>
        <div style={webStyles.tableContent}>
          {/* Table Header */}
          <div style={webStyles.tableHeaderRow}>
            <div style={webStyles.checkboxHeader}>
              <button onClick={handleSelectAll}>
                <WebCompatibleIcon 
                  name={allCurrentPageSelected ? "check-box" : "check-box-outline-blank"} 
                  size={20} 
                  color="#666666" 
                />
              </button>
            </div>
            <div style={webStyles.tableHeader}>
              <span style={webStyles.tableHeaderText}>Name</span>
            </div>
            <div style={webStyles.tableHeader}>
              <span style={webStyles.tableHeaderText}>Email</span>
            </div>
            <div style={webStyles.tableHeader}>
              <span style={webStyles.tableHeaderText}>Role</span>
            </div>
            <div style={webStyles.tableHeader}>
              <span style={webStyles.tableHeaderText}>Status</span>
            </div>
            <div style={webStyles.tableHeader}>
              <span style={webStyles.tableHeaderText}>Joined</span>
            </div>
            <div style={webStyles.tableHeader}>
              <span style={webStyles.tableHeaderText}>Actions</span>
            </div>
          </div>

          {/* Table Body */}
          <div style={webStyles.tableBody}>
            {paginatedUsers.map((user) => (
              <div key={user.id} style={webStyles.tableRow}>
                <div style={webStyles.checkbox}>
                  <button onClick={() => handleSelectUser(user.id)}>
                    <WebCompatibleIcon 
                      name={selectedUsers.has(user.id) ? "check-box" : "check-box-outline-blank"} 
                      size={20} 
                      color="#666666" 
                    />
                  </button>
                </div>
                
                <div style={webStyles.tableCell}>
                  <div style={webStyles.userName}>{user.name}</div>
                  {user.phone && <div style={webStyles.userPhone}>{user.phone}</div>}
                </div>
                
                <div style={webStyles.tableCell}>
                  <div style={webStyles.userEmail}>{user.email}</div>
                </div>
                
                <div style={webStyles.tableCell}>
                  <div style={webStyles.roleTagContainer}>
                    <span style={{
                      ...webStyles.roleTag,
                      backgroundColor: getRoleColor(user.role)
                    }}>
                      <span style={webStyles.roleTagText}>{user.role}</span>
                    </span>
                    {isProspectClient(user) && (
                      <span style={{
                        ...webStyles.roleTag,
                        backgroundColor: '#FF6B6B',
                        marginLeft: 8
                      }}>
                        <span style={webStyles.roleTagText}>PROSPECT</span>
                      </span>
                    )}
                  </div>
                </div>
                
                <div style={webStyles.tableCell}>
                  <span style={{
                    ...webStyles.statusTag,
                    backgroundColor: getStatusColor(user.status)
                  }}>
                    <span style={webStyles.statusTagText}>{user.status}</span>
                  </span>
                </div>
                
                <div style={webStyles.tableCell}>
                  <div style={webStyles.joinDate}>
                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
                
                <div style={webStyles.actionsCell}>
                  {/* Action buttons */}
                  <button style={webStyles.actionButton} onClick={() => handleViewProfile(user)}>
                    <WebCompatibleIcon name="visibility" size={18} color="#6B8E7F" />
                  </button>
                  <button style={webStyles.actionButton} onClick={() => handleEditUser(user)}>
                    <WebCompatibleIcon name="edit" size={18} color="#D4A574" />
                  </button>
                  
                  {/* Client-specific actions */}
                  {user.role === 'client' && (
                    <>
                      <button style={webStyles.actionButton} onClick={() => handleAssignSubscription(user)}>
                        <WebCompatibleIcon name="card-membership" size={18} color="#6B8E7F" />
                      </button>
                      <button style={webStyles.actionButton} onClick={() => handleAssignToInstructor(user)}>
                        <WebCompatibleIcon name="person-add" size={18} color="#9B8A7D" />
                      </button>
                      {clientInstructorAssignments.has(user.id.toString()) && (
                        <button 
                          style={{...webStyles.actionButton, backgroundColor: '#FF8A65'}} 
                          onClick={() => handleUnassignFromInstructor(user)}
                          title={`Unassign from ${clientInstructorAssignments.get(user.id.toString())?.name}`}
                        >
                          <WebCompatibleIcon name="person-remove" size={18} color="white" />
                        </button>
                      )}
                      {isProspectClient(user) && (
                        <button 
                          style={{...webStyles.actionButton, backgroundColor: '#FF6B6B'}} 
                          onClick={() => handleConvertProspectToClient(user)}
                          title="Convert prospect to regular client"
                        >
                          <WebCompatibleIcon name="arrow-forward" size={18} color="white" />
                        </button>
                      )}
                    </>
                  )}
                  
                  {/* Status management buttons */}
                  {user.status === 'active' && (
                    <>
                      <button style={webStyles.actionButton} onClick={() => handleSuspendUser(user)}>
                        <WebCompatibleIcon name="pause" size={18} color="#D4A574" />
                      </button>
                      <button style={webStyles.actionButton} onClick={() => handleDeactivateUser(user)}>
                        <WebCompatibleIcon name="block" size={18} color="#C47D7D" />
                      </button>
                    </>
                  )}
                  
                  {user.status === 'suspended' && (
                    <button style={webStyles.actionButton} onClick={() => handleActivateUser(user)}>
                      <WebCompatibleIcon name="play-arrow" size={18} color="#7DCEA0" />
                    </button>
                  )}
                  
                  {user.status === 'inactive' && (
                    <button style={webStyles.actionButton} onClick={() => handleActivateUser(user)}>
                      <WebCompatibleIcon name="play-arrow" size={18} color="#7DCEA0" />
                    </button>
                  )}
                  
                  <button style={webStyles.actionButton} onClick={() => handleDeleteUser(user)}>
                    <WebCompatibleIcon name="delete" size={18} color="#C47D7D" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pagination */}
      <div style={webStyles.paginationContainer}>
        <button 
          style={{
            ...webStyles.paginationButton,
            ...(currentPage === 1 ? webStyles.paginationButtonDisabled : {})
          }}
          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
        >
          <WebCompatibleIcon name="chevron-left" size={20} color="#666666" />
        </button>
        
        <span style={webStyles.paginationText}>
          Page {currentPage} of {totalPages}
        </span>
        
        <button 
          style={{
            ...webStyles.paginationButton,
            ...(currentPage === totalPages ? webStyles.paginationButtonDisabled : {})
          }}
          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages}
        >
          <WebCompatibleIcon name="chevron-right" size={20} color="#666666" />
        </button>
      </div>

      {/* Modals remain the same using React Native components */}
      {/* Create/Edit User Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingUser ? 'Edit User' : 'Create New User'}
              </Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowCreateModal(false)}
              >
                <WebCompatibleIcon name="close" size={24} color="#666666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Name *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(text) => setFormData({...formData, name: text})}
                  placeholder="Enter full name"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.email}
                  onChangeText={(text) => setFormData({...formData, email: text})}
                  placeholder="Enter email address"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.phone}
                  onChangeText={(text) => setFormData({...formData, phone: text})}
                  placeholder="Enter phone number"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Password {!editingUser && '*'}
                </Text>
                <TextInput
                  style={styles.input}
                  value={formData.password}
                  onChangeText={(text) => setFormData({...formData, password: text})}
                  placeholder={editingUser ? "Enter new password to change it" : "Enter password"}
                  secureTextEntry
                />
                {editingUser && (
                  <Text style={styles.inputHelp}>
                    💡 Leave blank to keep current password, or enter new password to change it
                  </Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Role *</Text>
                <View style={styles.roleSelector}>
                  {(['client', 'instructor', 'reception', ...(hideAdminUsers ? [] : ['admin'])] as UserRole[]).map(role => (
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
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Emergency Contact</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.emergencyContact}
                      onChangeText={(text) => setFormData({...formData, emergencyContact: text})}
                      placeholder="Enter emergency contact"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Medical Conditions</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={formData.medicalConditions}
                      onChangeText={(text) => setFormData({...formData, medicalConditions: text})}
                      placeholder="Enter any medical conditions or notes..."
                      multiline
                      numberOfLines={3}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>How did they hear about us?</Text>
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
                        <WebCompatibleIcon name="arrow-drop-down" size={24} color="#666666" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Custom referral text input when "other" is selected */}
                  {formData.referralSource === 'other' && (
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Please specify how they heard about us</Text>
                      <TextInput
                        style={[styles.input, styles.textArea]}
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

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalButton}
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonPrimary, saving && styles.modalButtonDisabled]}
                onPress={handleSaveUser}
                disabled={saving}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>
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
                style={styles.closeButton}
                onPress={() => setShowSubscriptionModal(false)}
              >
                <WebCompatibleIcon name="close" size={24} color="#666666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Select Subscription Plan *</Text>
                <ScrollView style={styles.plansList} nestedScrollEnabled={true}>
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
                              styles.planOptionName,
                              selectedPlanId === plan.id && styles.planOptionNameActive
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
                          <WebCompatibleIcon name="check-circle" size={24} color="#7DCEA0" />
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Notes (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={subscriptionNotes}
                  onChangeText={setSubscriptionNotes}
                  placeholder="Add any notes about this assignment..."
                  multiline
                  numberOfLines={3}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalButton}
                onPress={() => setShowSubscriptionModal(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonPrimary, saving && styles.modalButtonDisabled]}
                onPress={handleSaveSubscriptionAssignment}
                disabled={saving || !selectedPlanId}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>
                  {saving ? 'Assigning...' : 'Assign Subscription'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Instructor Assignment Modal */}
      <Modal visible={showInstructorAssignmentModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Assign {assigningInstructorUser?.name} to Instructor
              </Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowInstructorAssignmentModal(false)}
              >
                <WebCompatibleIcon name="close" size={24} color="#666666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Select Instructor *</Text>
                <ScrollView style={styles.plansList} nestedScrollEnabled={true}>
                  {instructors.map((instructor) => (
                    <TouchableOpacity
                      key={instructor.id}
                      style={[
                        styles.planOption,
                        selectedInstructorId === instructor.id.toString() && styles.planOptionActive
                      ]}
                      onPress={() => setSelectedInstructorId(instructor.id.toString())}
                    >
                      <View style={styles.planOptionRow}>
                        <View style={styles.planOptionContent}>
                          <View style={styles.planOptionHeader}>
                            <Text style={[
                              styles.planOptionName,
                              selectedInstructorId === instructor.id.toString() && styles.planOptionNameActive
                            ]}>
                              {instructor.name}
                            </Text>
                            <Text style={[
                              styles.planOptionPrice,
                              selectedInstructorId === instructor.id.toString() && styles.planOptionPriceActive
                            ]}>
                              Instructor
                            </Text>
                          </View>
                          <Text style={[
                            styles.planOptionDescription,
                            selectedInstructorId === instructor.id.toString() && styles.planOptionDescriptionActive
                          ]}>
                            📧 {instructor.email}
                          </Text>
                          {instructor.phone && (
                            <Text style={[
                              styles.planOptionDetail,
                              selectedInstructorId === instructor.id.toString() && styles.planOptionDetailActive
                            ]}>
                              📞 {instructor.phone}
                            </Text>
                          )}
                        </View>
                        {selectedInstructorId === instructor.id.toString() && (
                          <WebCompatibleIcon name="check-circle" size={24} color="#7DCEA0" />
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Assignment Notes (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Enter any notes about this assignment..."
                  value={assignmentNotes}
                  onChangeText={setAssignmentNotes}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </ScrollView>

            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => setShowInstructorAssignmentModal(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleSaveInstructorAssignment}
                disabled={saving || !selectedInstructorId}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>
                  {saving ? 'Assigning...' : 'Assign to Instructor'}
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
                style={styles.closeButton}
                onPress={() => setShowReferralModal(false)}
              >
                <WebCompatibleIcon name="close" size={24} color="#666666" />
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
                    <WebCompatibleIcon name="check" size={20} color="#666666" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </div>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F6F3', // Studio background
    padding: 0, // Remove padding to use full screen
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F6F3',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B8E7F',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 32,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E6E3',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
    elevation: 2,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2C2C2C',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666666',
  },
  headerRight: {
    marginLeft: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6B8E7F',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    boxShadow: '0 2px 4px rgba(107, 142, 127, 0.2)',
    elevation: 2,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    marginVertical: 16,
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E8E6E3',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
    elevation: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAF9',
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E8E6E3',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#2C2C2C',
    backgroundColor: 'transparent',
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
    color: '#2C2C2C',
    marginBottom: 12,
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#FAFAF9',
    borderWidth: 1,
    borderColor: '#E8E6E3',
  },
  filterButtonActive: {
    backgroundColor: '#6B8E7F',
    borderColor: '#6B8E7F',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  bulkActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 165, 116, 0.1)',
    marginHorizontal: 24,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(212, 165, 116, 0.3)',
  },
  bulkActionsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D4A574',
  },
  bulkActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bulkActionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#C47D7D',
  },
  tableContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    marginBottom: 24,
    borderRadius: 12,
    overflow: 'hidden',
    flex: 1,
    borderWidth: 1,
    borderColor: '#E8E6E3',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
    elevation: 3,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#FAFAF9',
    borderBottomWidth: 2,
    borderBottomColor: '#E8E6E3',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  checkboxHeader: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    minWidth: 120, // Ensure minimum column width
  },
  tableHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2C2C2C',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableBody: {
    flex: 1,
    maxHeight: 600, // Increased height for better viewing
  },
  tableBodyContent: {
    flexGrow: 1,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F0EFED',
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  tableRowHover: {
    backgroundColor: '#FAFAF9',
  },
  checkbox: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableCell: {
    flex: 1,
    paddingHorizontal: 12,
    minWidth: 120, // Ensure minimum column width
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C2C2C',
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 12,
    color: '#999999',
  },
  userEmail: {
    fontSize: 14,
    color: '#666666',
  },
  roleTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16, // More rounded for modern look
    alignSelf: 'flex-start',
  },
  roleTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  statusTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16, // More rounded for modern look
    alignSelf: 'flex-start',
  },
  statusTagText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  joinDate: {
    fontSize: 14,
    color: '#666666',
  },
  actionsCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: 200, // Increased width for better spacing
    justifyContent: 'flex-end',
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#FAFAF9',
    borderWidth: 1,
    borderColor: '#E8E6E3',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 12,
    backgroundColor: '#FAFAF9',
    borderTopWidth: 1,
    borderTopColor: '#E8E6E3',
  },
  paginationButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E6E3',
    minWidth: 40,
    alignItems: 'center',
  },
  paginationButtonActive: {
    backgroundColor: '#6B8E7F',
    borderColor: '#6B8E7F',
  },
  paginationButtonDisabled: {
    opacity: 0.5,
  },
  paginationText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  paginationTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 600,
    maxHeight: '90%',
    overflow: 'hidden',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E6E3',
    backgroundColor: '#FAFAF9',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C2C2C',
  },
  closeButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E6E3',
  },
  modalContent: {
    padding: 24,
    gap: 20,
  },
  modalScrollView: {
    maxHeight: 400,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C2C2C',
  },
  inputHelp: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E8E6E3',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#2C2C2C',
    backgroundColor: '#FFFFFF',
  },
  inputFocused: {
    borderColor: '#6B8E7F',
    backgroundColor: '#FFFFFF',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#E8E6E3',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  picker: {
    height: 50,
    color: '#2C2C2C',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#E8E6E3',
    backgroundColor: '#FAFAF9',
  },
  modalButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingHorizontal: 16,
  },
  modalButtonPrimary: {
    backgroundColor: '#6B8E7F',
  },
  modalButtonSecondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E6E3',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  modalButtonTextPrimary: {
    color: '#FFFFFF',
  },
  
  // Subscription Modal Specific
  subscriptionHeader: {
    marginBottom: 20,
  },
  subscriptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C2C2C',
    marginBottom: 8,
  },
  subscriptionSubtitle: {
    fontSize: 14,
    color: '#666666',
  },
  plansList: {
    gap: 12,
  },
  planOption: {
    borderWidth: 1,
    borderColor: '#E8E6E3',
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  planOptionActive: {
    borderColor: '#6B8E7F',
    backgroundColor: 'rgba(107, 142, 127, 0.05)',
  },
  planOptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C2C2C',
  },
  planOptionPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B8E7F',
  },
  planOptionDescription: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  planOptionDescriptionActive: {
    color: '#2C2C2C',
  },
  planOptionDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  planOptionDetail: {
    fontSize: 12,
    color: '#999999',
  },
  planOptionDetailActive: {
    color: '#6B8E7F',
  },
  planOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  conflictMessage: {
    fontSize: 16,
    color: '#2C2C2C',
    marginBottom: 20,
    lineHeight: 24,
  },
  conflictActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  conflictActionButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#6B8E7F',
  },
  conflictActionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  dropdownContainer: {
    borderWidth: 1,
    borderColor: '#E8E6E3',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
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
    color: '#2C2C2C',
    marginRight: 12,
  },
  referralOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EFED',
  },
  referralOptionActive: {
    backgroundColor: '#FAFAF9',
  },
  referralOptionText: {
    fontSize: 16,
    color: '#2C2C2C',
    fontWeight: '500',
  },
  referralOptionTextActive: {
    color: '#6B8E7F',
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#FAFAF9',
    borderWidth: 1,
    borderColor: '#E8E6E3',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666666',
  },
  horizontalScrollContainer: {
    flex: 1,
  },
  horizontalScrollContent: {
    flexGrow: 1,
  },
  tableContent: {
    minWidth: 1200, // Optimized minimum width
  },
  
  // Missing styles that were referenced but not defined
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
    backgroundColor: '#FAFAF9',
    borderWidth: 1,
    borderColor: '#E8E6E3',
  },
  roleOptionActive: {
    backgroundColor: '#6B8E7F',
    borderColor: '#6B8E7F',
  },
  roleOptionText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  roleOptionTextActive: {
    color: '#FFFFFF',
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
  planOptionContent: {
    flexDirection: 'column',
    flex: 1,
  },
  planOptionNameActive: {
    color: '#6B8E7F',
  },
  planOptionPriceActive: {
    color: '#6B8E7F',
  },
});

// Web-specific styles to avoid React Native Web CSS conflicts
const webStyles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    minHeight: '100vh',
    backgroundColor: '#F8F6F3',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: '24px 32px',
    borderBottom: '1px solid #E8E6E3',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#2C2C2C',
    margin: '0 0 4px 0',
  },
  headerSubtitle: {
    fontSize: '16px',
    color: '#666666',
    margin: 0,
  },
  headerRight: {
    marginLeft: '24px',
  },
  createButton: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#6B8E7F',
    padding: '12px 24px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(107, 142, 127, 0.2)',
    transition: 'all 0.2s ease',
  } as React.CSSProperties,
  createButtonText: {
    color: '#FFFFFF',
    fontSize: '16px',
    fontWeight: '600',
    marginLeft: '8px',
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    margin: '16px 24px',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid #E8E6E3',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
  },
  searchContainer: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#FAFAF9',
    borderRadius: '8px',
    padding: '0 16px',
    marginBottom: '20px',
    border: '1px solid #E8E6E3',
  },
  searchIcon: {
    marginRight: '12px',
  },
  searchInput: {
    flex: 1,
    padding: '12px 0',
    fontSize: '16px',
    color: '#2C2C2C',
    backgroundColor: 'transparent',
    border: 'none',
    outline: 'none',
  } as React.CSSProperties,
  filterRow: {
    display: 'flex',
    gap: '32px',
    flexWrap: 'wrap' as const,
  },
  filterGroup: {
    flex: 1,
    minWidth: '200px',
  },
  filterLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#2C2C2C',
    marginBottom: '12px',
    display: 'block',
  },
  filterButtons: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '8px',
  },
  filterButton: {
    padding: '8px 16px',
    borderRadius: '6px',
    backgroundColor: '#FAFAF9',
    border: '1px solid #E8E6E3',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  } as React.CSSProperties,
  filterButtonActive: {
    backgroundColor: '#6B8E7F',
    borderColor: '#6B8E7F',
  },
  filterButtonText: {
    fontSize: '14px',
    color: '#666666',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  bulkActionsContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 165, 116, 0.1)',
    margin: '0 24px 16px',
    borderRadius: '8px',
    padding: '12px 20px',
    border: '1px solid rgba(212, 165, 116, 0.3)',
  },
  bulkActionsText: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#D4A574',
  },
  bulkActionButton: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    gap: '6px',
  } as React.CSSProperties,
  bulkActionButtonText: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#C47D7D',
  },
  tableContainer: {
    backgroundColor: '#FFFFFF',
    margin: '0 24px 24px',
    borderRadius: '12px',
    overflow: 'hidden',
    flex: 1,
    border: '1px solid #E8E6E3',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
  },
  tableContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    minWidth: '1200px',
  },
  tableHeaderRow: {
    display: 'flex',
    backgroundColor: '#FAFAF9',
    borderBottom: '2px solid #E8E6E3',
    padding: '16px 20px',
  },
  checkboxHeader: {
    width: '50px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableHeader: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 12px',
    minWidth: '120px',
  },
  tableHeaderText: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#2C2C2C',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  tableBody: {
    display: 'flex',
    flexDirection: 'column' as const,
    maxHeight: '600px',
    overflowY: 'auto' as const,
  },
  tableRow: {
    display: 'flex',
    borderBottom: '1px solid #F0EFED',
    padding: '16px 20px',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    transition: 'background-color 0.2s ease',
  } as React.CSSProperties,
  checkbox: {
    width: '50px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableCell: {
    flex: 1,
    padding: '0 12px',
    minWidth: '120px',
  },
  userName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2C2C2C',
    marginBottom: '2px',
  },
  userPhone: {
    fontSize: '12px',
    color: '#999999',
  },
  userEmail: {
    fontSize: '14px',
    color: '#666666',
  },
  roleTag: {
    display: 'inline-block',
    padding: '6px 12px',
    borderRadius: '16px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'capitalize' as const,
  },
  roleTagContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  roleTagText: {
    color: '#FFFFFF',
  },
  statusTag: {
    display: 'inline-block',
    padding: '6px 12px',
    borderRadius: '16px',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'capitalize' as const,
  },
  statusTagText: {
    color: '#FFFFFF',
  },
  joinDate: {
    fontSize: '14px',
    color: '#666666',
  },
  actionsCell: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: '200px',
    gap: '8px',
  },
  actionButton: {
    padding: '8px',
    borderRadius: '6px',
    backgroundColor: '#FAFAF9',
    border: '1px solid #E8E6E3',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  } as React.CSSProperties,
  paginationContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: '#FAFAF9',
    borderTop: '1px solid #E8E6E3',
    gap: '12px',
  },
  paginationButton: {
    padding: '8px 16px',
    borderRadius: '6px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #E8E6E3',
    minWidth: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  } as React.CSSProperties,
  paginationButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  paginationText: {
    fontSize: '14px',
    color: '#666666',
    fontWeight: '500',
  },
};

export default PCUserManagement; 