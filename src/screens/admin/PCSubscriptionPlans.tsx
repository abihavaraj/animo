import React, { useEffect, useState } from 'react';
import { Alert, Dimensions, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { SubscriptionConflictDialog } from '../../components/SubscriptionConflictDialog';
import WebCompatibleIcon from '../../components/WebCompatibleIcon';
import { notificationService } from '../../services/notificationService';
import { SubscriptionPlan, subscriptionService } from '../../services/subscriptionService';
import { BackendUser, userService } from '../../services/userService';
import { AppDispatch, RootState } from '../../store';
import { createPlan, deletePlan, fetchPlans, updatePlan } from '../../store/subscriptionSlice';

interface PlanStats {
  activeSubscriptions: number;
  totalRevenue: number;
  averagePrice: number;
  popularityRank: number;
}

interface ExtendedPlan extends SubscriptionPlan {
  stats?: PlanStats;
}

// Plan form data interface
interface PlanFormData {
  name: string;
  monthlyClasses: number;
  monthlyPrice: number;
  duration: number;
  duration_unit: 'days' | 'months' | 'years';
  equipmentAccess: 'mat' | 'reformer' | 'both';
  description: string;
  category: 'group' | 'personal' | 'personal_duo' | 'personal_trio';
  features: string;
}

function PCSubscriptionPlans() {
  const dispatch = useDispatch<AppDispatch>();
  const { user, isLoggedIn } = useSelector((state: RootState) => state.auth);
  const { plans, isLoading } = useSelector((state: RootState) => state.subscriptions);
  
  // PC-specific state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'popularity' | 'category'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedPlans, setSelectedPlans] = useState<number[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [clients, setClients] = useState<BackendUser[]>([]);
  const [selectedClient, setSelectedClient] = useState<BackendUser | null>(null);
  const [planStats, setPlanStats] = useState<{ [key: number]: PlanStats }>({});

  // Plan creation/editing state
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  
  // Subscription options modal state
  const [showSubscriptionOptionsModal, setShowSubscriptionOptionsModal] = useState(false);
  const [subscriptionOptionsData, setSubscriptionOptionsData] = useState<any>(null);
  
  // Notification testing modal state
  const [showNotificationTestModal, setShowNotificationTestModal] = useState(false);
  const [showExpiringConfirmModal, setShowExpiringConfirmModal] = useState(false);
  const [showExpiredConfirmModal, setShowExpiredConfirmModal] = useState(false);
  const [planFormData, setPlanFormData] = useState<PlanFormData>({
    name: '',
    monthlyClasses: 8,
    monthlyPrice: 8500,
    duration: 1,
    duration_unit: 'months',
    equipmentAccess: 'mat',
    description: '',
    category: 'group',
    features: '',
  });

  // Screen dimensions for responsive design
  const [screenDimensions, setScreenDimensions] = useState(Dimensions.get('window'));

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  // Load plans and statistics
  useEffect(() => {
    if (isLoggedIn) {
      dispatch(fetchPlans());
      loadClients();
      loadPlanStatistics();
    }
  }, [dispatch, isLoggedIn]);

  const loadClients = async () => {
    try {
      const response = await userService.getUsers();
      if (response.success && response.data) {
        const clientUsers = response.data.filter((user: BackendUser) => user.role === 'client');
        setClients(clientUsers);
      }
    } catch (error) {
      console.error('Failed to load clients:', error);
    }
  };

  const loadPlanStatistics = async () => {
    try {
      const response = await subscriptionService.getPlanStatistics();
      
      if (response.success && response.data) {
        setPlanStats(response.data);
      } else {
        console.error('❌ Failed to load plan statistics:', response.error);
        // Fallback to empty stats instead of simulated data
        setPlanStats({});
      }
    } catch (error) {
      console.error('❌ Error loading plan statistics:', error);
      // Fallback to empty stats instead of simulated data
      setPlanStats({});
    }
  };

  // Filter and sort plans
  const filteredAndSortedPlans = React.useMemo(() => {
    let filtered = Array.isArray(plans) ? [...plans] : [];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(plan => 
        (plan.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (plan.description || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply category filter
    if (filterCategory !== 'all') {
      filtered = filtered.filter(plan => (plan.category || 'group') === filterCategory);
    }

    // Apply status filter - handle different possible values for is_active
    if (filterStatus !== 'all') {
      filtered = filtered.filter(plan => {
        // Check if plan is active - use the boolean isActive field
        const isActive = Boolean(plan.isActive);
        const shouldShowActive = filterStatus === 'active';
        const shouldShow = shouldShowActive ? isActive : !isActive;
        
        
        return shouldShow;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let valueA: any, valueB: any;

      switch (sortBy) {
        case 'name':
          valueA = a.name.toLowerCase();
          valueB = b.name.toLowerCase();
          break;
        case 'price':
          valueA = a.monthlyPrice || 0;
          valueB = b.monthlyPrice || 0;
          break;
        case 'popularity':
          valueA = planStats[a.id]?.activeSubscriptions || 0;
          valueB = planStats[b.id]?.activeSubscriptions || 0;
          break;
        case 'category':
          valueA = a.category;
          valueB = b.category;
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
      } else {
        return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
      }
    });

    return filtered;
  }, [plans, searchTerm, filterCategory, filterStatus, sortBy, sortOrder, planStats]);

  // Handle plan selection
  const togglePlanSelection = (planId: number) => {
    setSelectedPlans(prev => 
      prev.includes(planId) 
        ? prev.filter(id => id !== planId)
        : [...prev, planId]
    );
  };

  const selectAllPlans = () => {
    setSelectedPlans(filteredAndSortedPlans.map(plan => plan.id));
  };

  const clearSelection = () => {
    setSelectedPlans([]);
  };

  // Quick assignment functionality
  const handleQuickAssign = (plan: SubscriptionPlan) => {
    setSelectedPlans([plan.id]);
    setShowAssignModal(true);
  };

  const handleBulkAssign = () => {
    if (selectedPlans.length === 0) {
      Alert.alert('No Plans Selected', 'Please select at least one plan to assign.');
      return;
    }
    setShowAssignModal(true);
  };

  const assignPlanToClient = async (clientId: string | number, planId: string | number) => {
    console.log('🔍 ASSIGN: Starting assignment for client:', clientId, 'plan:', planId);
    try {
      // First check for existing subscriptions
      console.log('🔍 ASSIGN: Checking existing subscriptions...');
      const checkResponse = await subscriptionService.checkExistingSubscription(clientId, planId);
      console.log('🔍 ASSIGN: Full checkResponse:', checkResponse);
      console.log('🔍 ASSIGN: checkResponse.data:', checkResponse.data);
      console.log('🔍 ASSIGN: hasExistingSubscription:', checkResponse.data?.hasExistingSubscription);
      
              if (checkResponse.success && checkResponse.data?.hasExistingSubscription) {
          // User has existing subscription - show options modal
          const options = checkResponse.data.options;
          const existingSub = checkResponse.data.existingSubscription;
          const newPlan = checkResponse.data.newPlan;
          const user = checkResponse.data.user;
          
          console.log('🔍 ASSIGN: Showing options modal with:', { options, existingSub });
          
          // Map data to SubscriptionConflictDialog format
          const conflictData = {
            hasExistingSubscription: true,
            canProceed: false,
            user: {
              name: user.name,
              email: user.email
            },
            newPlan: {
              id: newPlan.id,
              name: newPlan.name,
              monthly_price: newPlan.monthly_price,
              monthly_classes: newPlan.monthly_classes,
              equipment_access: newPlan.equipment_access
            },
            existingSubscription: {
              id: existingSub.id,
              planName: existingSub.planName,
              monthlyPrice: existingSub.monthlyPrice,
              classesRemaining: existingSub.classesRemaining,
              daysRemaining: existingSub.daysRemaining,
              endDate: existingSub.endDate,
              equipmentAccess: existingSub.equipmentAccess
            },
            comparison: {
              isUpgrade: newPlan.monthly_price > existingSub.monthlyPrice,
              isDowngrade: newPlan.monthly_price < existingSub.monthlyPrice,
              isSamePlan: newPlan.monthly_price === existingSub.monthlyPrice,
              priceDifference: newPlan.monthly_price - existingSub.monthlyPrice,
              classDifference: newPlan.monthly_classes - existingSub.monthlyClasses
            },
            options: options,
            message: checkResponse.data.message
          };
          
          // Set modal data and show modal
          setSubscriptionOptionsData(conflictData);
          setShowSubscriptionOptionsModal(true);
      } else {
        // No existing subscription - proceed with assignment
        console.log('🔍 ASSIGN: No existing subscription, proceeding with assignment...');
        const response = await subscriptionService.assignSubscription(clientId, planId);
        console.log('🔍 ASSIGN: Assignment response:', response);
        if (response.success) {
          // Send subscription assignment notification to the client
          try {
            const plan = plans.find(p => p.id === planId);
            if (plan) {
              // Skip welcome notification here - it will be sent when user first logs in
              // This ensures user has credentials and push token before receiving notification
              console.log('📋 Subscription assigned - welcome notification will be sent on first login');

              console.log('📢 [RECEPTION] Subscription assignment notification sent to client');
            }
          } catch (notificationError) {
            console.error('❌ Failed to send subscription assignment notification:', notificationError);
            // Don't block the main operation for notification errors
          }

          Alert.alert('Success', 'Subscription plan assigned successfully!');
          // Refresh statistics
          loadPlanStatistics();
        } else {
          Alert.alert('Error', response.error || 'Failed to assign subscription plan');
        }
      }
    } catch (error: any) {
      console.error('Assignment error:', error);
      if (error.message && error.message.includes('already has an active subscription')) {
        Alert.alert('Existing Subscription', 'This client already has an active subscription. Please use the extend option or cancel the existing subscription first.');
      } else {
        Alert.alert('Error', 'An unexpected error occurred');
      }
    }
  };

  const handleCheckExpiringSubscriptions = async () => {
    try {
      setShowExpiringConfirmModal(true);
    } catch (error) {
      console.error('Error in handleCheckExpiringSubscriptions:', error);
      console.log('❌ Error: An unexpected error occurred');
    }
  };

  const performExpiringCheck = async () => {
    try {
      setShowExpiringConfirmModal(false);
      console.log('🔍 Checking for expiring subscriptions...');
      const result = await notificationService.checkAndSendExpiringSubscriptionNotifications();
      if (result.success) {
        const count = result.data?.notificationCount || 0;
        console.log(
          count > 0 
            ? `✅ Found ${count} expiring subscription${count === 1 ? '' : 's'}. Notifications sent to clients.`
            : '✅ No subscriptions expiring in the next 7 days.'
        );
      } else {
        console.error('❌ Error:', result.error || 'Failed to check expiring subscriptions');
      }
    } catch (error) {
      console.error('❌ Error checking expiring subscriptions:', error);
    }
  };

  const handleCheckExpiredSubscriptions = async () => {
    try {
      setShowExpiredConfirmModal(true);
    } catch (error) {
      console.error('Error in handleCheckExpiredSubscriptions:', error);
      console.log('❌ Error: An unexpected error occurred');
    }
  };

  const performExpiredCheck = async () => {
    try {
      setShowExpiredConfirmModal(false);
      console.log('🔍 Checking for expired subscriptions...');
      const result = await notificationService.sendSubscriptionExpiredNotifications();
      if (result.success) {
        const count = result.data?.notificationCount || 0;
        console.log(
          count > 0 
            ? `✅ Found ${count} expired subscription${count === 1 ? '' : 's'}. Notifications sent to clients.`
            : '✅ No recently expired subscriptions found.'
        );
      } else {
        console.error('❌ Error:', result.error || 'Failed to check expired subscriptions');
      }
    } catch (error) {
      console.error('❌ Error checking expired subscriptions:', error);
    }
  };

  const handleTestSubscriptionNotifications = async () => {
    try {
      setShowNotificationTestModal(true);
    } catch (error) {
      console.error('Error in handleTestSubscriptionNotifications:', error);
      console.log('❌ Error: An unexpected error occurred');
    }
  };

  const testWelcomeNotification = async () => {
    try {
      setShowNotificationTestModal(false);
      
      // Find a test user - prioritize "argjend" or use first client
      const testUser = clients.find(u => u.role === 'client' && u.name.toLowerCase().includes('argjend')) || 
                      clients.find(u => u.role === 'client');
      if (!testUser) {
        return;
      }
      const notificationResult = await notificationService.createTranslatedNotification(
        testUser.id,
        'welcome',
        {
          type: 'welcome',
          userName: testUser.name
        }
      );

      if (notificationResult.success && notificationResult.data) {
        await notificationService.sendPushNotificationToUser(
          testUser.id,
          notificationResult.data.title,
          notificationResult.data.message
        );
      }
    } catch (error) {
      // Error handled silently
    }
  };

  const testExpiringNotification = async () => {
    try {
      setShowNotificationTestModal(false);
      // Find a test user - prioritize "argjend" or use first client
      const testUser = clients.find(u => u.role === 'client' && u.name.toLowerCase().includes('argjend')) || 
                      clients.find(u => u.role === 'client');
      if (!testUser) {
        console.log('❌ Error: No client users found to test with');
        return;
      }

      console.log(`🧪 Testing expiring notification for ${testUser.name}...`);
      const notificationResult = await notificationService.createTranslatedNotification(
        testUser.id,
        'subscription_expiring',
        {
          type: 'subscription_expiring',
          planName: 'Test Plan',
          expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()
        }
      );

      if (notificationResult.success && notificationResult.data) {
        await notificationService.sendPushNotificationToUser(
          testUser.id,
          notificationResult.data.title,
          notificationResult.data.message
        );
        console.log(`✅ Expiring notification sent to ${testUser.name}`);
      } else {
        console.error('❌ Error:', notificationResult.error || 'Failed to send expiring notification');
      }
    } catch (error) {
      console.error('❌ Error testing expiring notification:', error);
    }
  };

  const testExpiredNotification = async () => {
    try {
      setShowNotificationTestModal(false);
      // Find a test user - prioritize "argjend" or use first client
      const testUser = clients.find(u => u.role === 'client' && u.name.toLowerCase().includes('argjend')) || 
                      clients.find(u => u.role === 'client');
      if (!testUser) {
        console.log('❌ Error: No client users found to test with');
        return;
      }

      console.log(`🧪 Testing expired notification for ${testUser.name}...`);
      const notificationResult = await notificationService.createTranslatedNotification(
        testUser.id,
        'subscription_expired',
        {
          type: 'subscription_expired',
          planName: 'Test Plan'
        }
      );

      if (notificationResult.success && notificationResult.data) {
        await notificationService.sendPushNotificationToUser(
          testUser.id,
          notificationResult.data.title,
          notificationResult.data.message
        );
        console.log(`✅ Expired notification sent to ${testUser.name}`);
      } else {
        console.error('❌ Error:', notificationResult.error || 'Failed to send expired notification');
      }
    } catch (error) {
      console.error('❌ Error testing expired notification:', error);
    }
  };

  const handleSubscriptionOption = async (optionId: string) => {
    if (!subscriptionOptionsData || !subscriptionOptionsData.user || !subscriptionOptionsData.newPlan) {
      Alert.alert('Error', 'Missing data to perform subscription action.');
      return;
    }

    try {
      const userId = subscriptionOptionsData.user.id;
      const planId = subscriptionOptionsData.newPlan.id;
      const notes = 'Updated via reception conflict dialog';
      let response;

      console.log(`[handleSubscriptionOption] Action: ${optionId}, UserID: ${userId}, PlanID: ${planId}`);

      if (!userId || !planId) {
        Alert.alert('Error', 'User ID or Plan ID is missing.');
        return;
      }

      switch (optionId) {
        case 'replace':
          response = await subscriptionService.assignSubscription(userId, planId, notes, 'replace');
          break;
        case 'extend':
          response = await subscriptionService.assignSubscription(userId, planId, notes, 'extend');
          break;
        case 'queue':
          response = await subscriptionService.assignSubscription(userId, planId, notes, 'queue');
          break;
        default:
          Alert.alert('Error', 'Invalid option selected');
          return;
      }
      
      if (response.success) {
        Alert.alert('Success', 'Subscription updated successfully!');
        // Refresh statistics
        loadPlanStatistics();
      } else {
        Alert.alert('Error', response.error || 'Failed to update subscription');
      }
    } catch (error: any) {
      console.error('Option handling error:', error);
      Alert.alert('Error', `An unexpected error occurred: ${error.message}`);
    }
  };

  // Plan management functions
  const handleCreatePlan = () => {
    setEditingPlan(null);
    setPlanFormData({
      name: '',
      monthlyClasses: 8,
      monthlyPrice: 8500,
      duration: 1,
      duration_unit: 'months',
      equipmentAccess: 'mat',
      description: '',
      category: 'group',
      features: '',
    });
    setShowPlanModal(true);
  };

  const handleEditPlan = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setPlanFormData({
      name: plan.name || '',
      monthlyClasses: plan.monthly_classes || 8,
      monthlyPrice: plan.monthly_price || 8500,
      duration: plan.duration || 1,
      duration_unit: plan.duration_unit || 'months',
      equipmentAccess: plan.equipment_access || 'mat',
      description: plan.description || '',
      category: plan.category || 'group',
      features: Array.isArray(plan.features) ? plan.features.join('\n') : (plan.features || ''),
    });
    setShowPlanModal(true);
  };

  const handleSavePlan = async () => {
    if (!planFormData.name || !planFormData.monthlyPrice || !planFormData.monthlyClasses) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const planData = {
      name: planFormData.name,
      monthlyClasses: planFormData.monthlyClasses,
      monthlyPrice: planFormData.monthlyPrice,
      duration: planFormData.duration,
      duration_unit: planFormData.duration_unit,
      equipmentAccess: planFormData.equipmentAccess,
      description: planFormData.description,
      category: planFormData.category,
      features: planFormData.features.split('\n').filter(f => f.trim())
    };

    setIsSavingPlan(true);
    
    try {
      if (editingPlan) {
        // Update existing plan
        const updateData = {
          name: planData.name.trim(),
          monthlyClasses: planData.monthlyClasses,
          monthlyPrice: planData.monthlyPrice,
          duration: planData.duration,
          duration_unit: planData.duration_unit,
          equipmentAccess: planData.equipmentAccess,
          description: planData.description.trim(),
          category: planData.category,
          features: planData.features,
          isActive: true
        };
        await dispatch(updatePlan({ id: editingPlan.id, planData: updateData })).unwrap();
        Alert.alert('Success', 'Plan updated successfully');
      } else {
        // Create new plan
        const createData = {
          name: planData.name.trim(),
          monthlyClasses: planData.monthlyClasses,
          monthlyPrice: planData.monthlyPrice,
          duration: planData.duration,
          duration_unit: planData.duration_unit,
          equipmentAccess: planData.equipmentAccess,
          description: planData.description.trim(),
          category: planData.category,
          features: planData.features
        };
        await dispatch(createPlan(createData)).unwrap();
        Alert.alert('Success', 'Plan created successfully');
      }
      
      // Refresh the plans list and close modal
      dispatch(fetchPlans());
      setShowPlanModal(false);
      loadPlanStatistics();
    } catch (error) {
      Alert.alert('Error', error as string || 'Failed to save plan');
    } finally {
      setIsSavingPlan(false);
    }
  };

  const handleTogglePlanStatus = async (planId: number) => {
    console.log('🔄 === TOGGLE FUNCTION STARTED ===');
    console.log('🔄 Toggling plan status for plan ID:', planId);
    const plan = filteredAndSortedPlans.find(p => p.id === planId);
    if (!plan) {
      console.log('❌ Plan not found!');
      Alert.alert('Error', 'Plan not found');
      return;
    }

    // Handle boolean isActive field
    const currentStatus = Boolean(plan.isActive);
    const newStatus = !currentStatus;
    
    console.log('📊 Plan found:', plan.name || 'unnamed');
    console.log('📊 Current isActive value:', plan.isActive);
    console.log('📊 Current status (boolean):', currentStatus);
    console.log('📊 Changing status to:', newStatus);

    try {
      const updateData = {
        isActive: newStatus
      };
      console.log('📤 About to dispatch UPDATE PLAN action with data:', updateData);
      
      const result = await dispatch(updatePlan({ id: planId, planData: updateData })).unwrap();
      
      console.log('✅ UPDATE PLAN action completed successfully:', result);
      console.log('📊 Updated plan result:', result);
      
      Alert.alert('Success', `Plan ${newStatus ? 'activated' : 'deactivated'} successfully`);
      
      console.log('🔄 === TOGGLE FUNCTION COMPLETED ===');
    } catch (error) {
      console.error('❌ Error in TOGGLE function:', error);
      Alert.alert('Error', error as string || 'Failed to update plan status');
    }
  };

  const handleDeletePlan = async (planId: number) => {
    console.log('🗑️ === DELETE FUNCTION STARTED ===');
    console.log('🗑️ Delete button clicked for plan ID:', planId);
    
    // Using window.confirm for web compatibility instead of Alert.alert
    const confirmDelete = window.confirm(
      'Delete Subscription Plan\n\nAre you sure you want to delete this subscription plan? This action cannot be undone.'
    );
    
    if (confirmDelete) {
      console.log('✅ User confirmed deletion');
      try {
        console.log('📤 About to dispatch DELETE PLAN action for plan ID:', planId);
        
        const result = await dispatch(deletePlan(planId)).unwrap();
        
        console.log('✅ DELETE PLAN action completed successfully:', result);
        Alert.alert('Success', 'Plan deleted successfully');
        
        console.log('🔄 Refreshing plans list after deletion...');
        dispatch(fetchPlans());
        loadPlanStatistics();
        console.log('🗑️ === DELETE FUNCTION COMPLETED ===');
      } catch (error) {
        console.error('❌ Error in DELETE function:', error);
        const errorMessage = error as string;
        if (errorMessage.includes('active subscriptions')) {
          Alert.alert('Cannot Delete', 'This plan has active subscriptions and cannot be deleted. Please deactivate it instead.');
        } else {
          Alert.alert('Error', errorMessage || 'Failed to delete plan');
        }
      }
    } else {
      console.log('❌ User cancelled deletion');
      console.log('🗑️ === DELETE FUNCTION CANCELLED ===');
    }
  };

  // Get category color
  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      trial: '#607d8b',
      basic: '#2196f3',
      standard: '#ff9800',
      premium: '#9c27b0',
      unlimited: '#f44336',
      personal: '#795548',
      special: '#4caf50',
      group: '#00bcd4',
      personal_duo: '#8bc34a',
      personal_trio: '#cddc39'
    };
    return colors[category] || '#666';
  };

  // Get equipment icon
  const getEquipmentIcon = (equipment: string) => {
    switch (equipment) {
      case 'mat': return 'self-improvement';
      case 'reformer': return 'fitness-center';
      case 'both': return 'fitness-center';
      default: return 'help-outline';
    }
  };

  const renderPlanRow = (plan: SubscriptionPlan, index: number) => {
    const isSelected = selectedPlans.includes(plan.id);
    const stats = planStats[plan.id];

    return (
      <View key={plan.id} style={[styles.planRow, index % 2 === 0 && styles.evenRow]}>
        {/* Selection Checkbox */}
        <TouchableOpacity
          style={styles.checkboxCell}
          onPress={() => togglePlanSelection(plan.id)}
        >
          <WebCompatibleIcon
            name={isSelected ? 'check-box' : 'check-box-outline-blank'}
            size={20}
            color={isSelected ? '#C77474' : '#666'}
          />
        </TouchableOpacity>

        {/* Plan Name & Category */}
        <View style={styles.nameCell}>
          <Text style={styles.planName}>{plan.name}</Text>
          <View style={styles.categoryChip}>
            <View
              style={[styles.categoryDot, { backgroundColor: getCategoryColor(plan.category) }]}
            />
            <Text style={styles.categoryText}>{plan.category}</Text>
          </View>
        </View>

        {/* Price & Classes */}
        <View style={styles.priceCell}>
          <Text style={styles.priceText}>{(plan.monthlyPrice || 0).toLocaleString()} ALL</Text>
          <Text style={styles.classesText}>
            {(plan.monthlyClasses || 0) >= 999 ? 'Unlimited' : `${plan.monthlyClasses || 0} classes`}
          </Text>
        </View>

        {/* Equipment */}
        <View style={styles.equipmentCell}>
          <WebCompatibleIcon
            name={getEquipmentIcon(plan.equipmentAccess || 'mat')}
            size={18}
            color="#666"
          />
          <Text style={styles.equipmentText}>{plan.equipmentAccess || 'mat'}</Text>
        </View>

        {/* Statistics */}
        <View style={styles.statsCell}>
          <Text style={styles.statsNumber}>{stats?.activeSubscriptions || 0}</Text>
          <Text style={styles.statsLabel}>active</Text>
        </View>

        {/* Status */}
        <View style={styles.statusCell}>
          <View
            style={[
              styles.statusIndicator,
              { backgroundColor: plan.isActive ? '#4caf50' : '#f44336' }
            ]}
          />
          <Text style={styles.statusText}>
            {plan.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actionsCell}>
          <View style={styles.actionButtonContainer}>
            <TouchableOpacity
              style={styles.assignButton}
              onPress={() => {
                console.log('🔵 ASSIGN button clicked for plan:', plan.name);
                handleQuickAssign(plan);
              }}
            >
              <WebCompatibleIcon name="person-add" size={16} color="white" />
              <Text style={styles.assignButtonText}>Assign</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.actionButtonContainer}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => {
                console.log('⚪ EDIT button clicked for plan:', plan.name);
                handleEditPlan(plan);
              }}
            >
              <WebCompatibleIcon name="edit" size={16} color="#666" />
            </TouchableOpacity>
            <Text style={styles.buttonLabel}>Edit</Text>
          </View>

          <View style={styles.actionButtonContainer}>
            <TouchableOpacity
              style={[
                styles.statusToggleButton, 
                plan.isActive ? styles.pauseButton : styles.activateButton
              ]}
              onPress={() => {
                console.log('🟠 ORANGE/GREEN STATUS TOGGLE button clicked for plan:', plan.name, 'Current status:', plan.isActive);
                handleTogglePlanStatus(plan.id);
              }}
            >
              <WebCompatibleIcon 
                name={plan.isActive ? 'pause' : 'play-arrow'} 
                size={16} 
                color="white"
              />
            </TouchableOpacity>
            <Text style={styles.buttonLabel}>
              {plan.isActive ? 'Pause' : 'Activate'}
            </Text>
          </View>

          <View style={styles.actionButtonContainer}>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => {
                console.log('🔴 RED DELETE button clicked for plan:', plan.name);
                handleDeletePlan(plan.id);
              }}
            >
              <WebCompatibleIcon name="delete" size={16} color="white" />
            </TouchableOpacity>
            <Text style={styles.buttonLabel}>Delete</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Subscription Plans Management</Text>
            <Text style={styles.headerSubtitle}>
              {filteredAndSortedPlans.length} plans • {selectedPlans.length} selected
            </Text>
          </View>
          
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleCreatePlan}
            >
              <WebCompatibleIcon name="add" size={20} color="white" />
              <Text style={styles.headerButtonText}>New Plan</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.headerButton, styles.notificationHeaderButton]}
              onPress={handleCheckExpiringSubscriptions}
            >
              <WebCompatibleIcon name="notifications" size={20} color="white" />
              <Text style={styles.headerButtonText}>Check Expiring</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.headerButton, styles.notificationHeaderButton]}
              onPress={handleCheckExpiredSubscriptions}
            >
              <WebCompatibleIcon name="notifications-off" size={20} color="white" />
              <Text style={styles.headerButtonText}>Check Expired</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.headerButton, styles.debugHeaderButton]}
              onPress={handleTestSubscriptionNotifications}
            >
              <WebCompatibleIcon name="bug-report" size={20} color="white" />
              <Text style={styles.headerButtonText}>Test Notifications</Text>
            </TouchableOpacity>
            
            {selectedPlans.length > 0 && (
              <TouchableOpacity
                style={[styles.headerButton, styles.assignHeaderButton]}
                onPress={handleBulkAssign}
              >
                <WebCompatibleIcon name="group-add" size={20} color="white" />
                <Text style={styles.headerButtonText}>Bulk Assign</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Search and Filters */}
        <View style={styles.filtersRow}>
          <View style={styles.searchContainer}>
            <WebCompatibleIcon name="search" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search plans..."
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
          </View>

          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Category:</Text>
            <TouchableOpacity
              style={[styles.filterButton, filterCategory === 'all' && styles.activeFilter]}
              onPress={() => setFilterCategory('all')}
            >
              <Text style={[
                styles.filterButtonText,
                filterCategory === 'all' && styles.activeFilterText
              ]}>
                All
              </Text>
            </TouchableOpacity>
            {['trial', 'basic', 'premium', 'unlimited'].map(category => (
              <TouchableOpacity
                key={category}
                style={[styles.filterButton, filterCategory === category && styles.activeFilter]}
                onPress={() => setFilterCategory(category)}
              >
                <Text style={[
                  styles.filterButtonText,
                  filterCategory === category && styles.activeFilterText
                ]}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Status:</Text>
            <TouchableOpacity
              style={[styles.filterButton, filterStatus === 'all' && styles.activeFilter]}
              onPress={() => setFilterStatus('all')}
            >
              <Text style={[
                styles.filterButtonText,
                filterStatus === 'all' && styles.activeFilterText
              ]}>
                All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, filterStatus === 'active' && styles.activeFilter]}
              onPress={() => setFilterStatus('active')}
            >
              <Text style={[
                styles.filterButtonText,
                filterStatus === 'active' && styles.activeFilterText
              ]}>
                Active
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, filterStatus === 'inactive' && styles.activeFilter]}
              onPress={() => setFilterStatus('inactive')}
            >
              <Text style={[
                styles.filterButtonText,
                filterStatus === 'inactive' && styles.activeFilterText
              ]}>
                Inactive
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Table Header */}
      <View style={styles.tableHeader}>
        <TouchableOpacity
          style={styles.selectAllButton}
          onPress={selectedPlans.length === filteredAndSortedPlans.length ? clearSelection : selectAllPlans}
        >
          <WebCompatibleIcon
            name={selectedPlans.length === filteredAndSortedPlans.length ? 'check-box' : 'check-box-outline-blank'}
            size={20}
            color="#666"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerCell}
          onPress={() => {
            setSortBy('name');
            setSortOrder(sortBy === 'name' && sortOrder === 'asc' ? 'desc' : 'asc');
          }}
        >
          <Text style={styles.headerCellText}>Plan & Category</Text>
          {sortBy === 'name' && (
            <WebCompatibleIcon
              name={sortOrder === 'asc' ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
              size={16}
              color="#666"
            />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerCell}
          onPress={() => {
            setSortBy('price');
            setSortOrder(sortBy === 'price' && sortOrder === 'asc' ? 'desc' : 'asc');
          }}
        >
          <Text style={styles.headerCellText}>Price & Classes</Text>
          {sortBy === 'price' && (
            <WebCompatibleIcon
              name={sortOrder === 'asc' ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
              size={16}
              color="#666"
            />
          )}
        </TouchableOpacity>

        <View style={styles.headerCell}>
          <Text style={styles.headerCellText}>Equipment</Text>
        </View>

        <TouchableOpacity
          style={styles.headerCell}
          onPress={() => {
            setSortBy('popularity');
            setSortOrder(sortBy === 'popularity' && sortOrder === 'asc' ? 'desc' : 'asc');
          }}
        >
          <Text style={styles.headerCellText}>Active Subs</Text>
          {sortBy === 'popularity' && (
            <WebCompatibleIcon
              name={sortOrder === 'asc' ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
              size={16}
              color="#666"
            />
          )}
        </TouchableOpacity>

        <View style={styles.headerCell}>
          <Text style={styles.headerCellText}>Status</Text>
        </View>

        <View style={styles.headerCell}>
          <Text style={styles.headerCellText}>Actions</Text>
        </View>
      </View>

      {/* Plans Table */}
      <ScrollView 
        style={[styles.tableContainer, { maxHeight: screenDimensions.height - 300 }]} 
        showsVerticalScrollIndicator={true}
        persistentScrollbar={true}
        contentContainerStyle={styles.tableContentContainer}
      >
        {filteredAndSortedPlans.length > 0 ? (
          filteredAndSortedPlans.map((plan, index) => renderPlanRow(plan, index))
        ) : (
          <View style={styles.emptyState}>
            <WebCompatibleIcon name="card-membership" size={48} color="#ccc" />
            <Text style={styles.emptyStateText}>No subscription plans found</Text>
            <Text style={styles.emptyStateSubtext}>
              {searchTerm || filterCategory !== 'all' || filterStatus !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Create your first subscription plan to get started'
              }
            </Text>
          </View>
        )}
        
        {/* Add extra padding to ensure scroll bar appears */}
        <View style={styles.scrollPadding} />
      </ScrollView>

      {/* Quick Assignment Modal */}
      {showAssignModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.assignModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Assign Subscription{selectedPlans.length > 1 ? 's' : ''} to Client
              </Text>
              <TouchableOpacity onPress={() => setShowAssignModal(false)}>
                <WebCompatibleIcon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <Text style={styles.modalLabel}>Select Client:</Text>
              <ScrollView style={styles.clientsList}>
                {clients.map(client => (
                  <TouchableOpacity
                    key={client.id}
                    style={[
                      styles.clientItem,
                      selectedClient?.id === client.id && styles.selectedClientItem
                    ]}
                    onPress={() => setSelectedClient(client)}
                  >
                    <WebCompatibleIcon
                      name="person"
                      size={20}
                      color={selectedClient?.id === client.id ? '#C77474' : '#666'}
                    />
                    <View style={styles.clientInfo}>
                      <Text style={styles.clientName}>{client.name}</Text>
                      <Text style={styles.clientEmail}>{client.email}</Text>
                    </View>
                    {selectedClient?.id === client.id && (
                      <WebCompatibleIcon name="check-circle" size={20} color="#C77474" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowAssignModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.assignModalButton,
                    (!selectedClient || selectedPlans.length === 0) && styles.disabledButton
                  ]}
                  onPress={() => {
                    console.log('🔍 BUTTON: Assign button clicked');
                    console.log('🔍 BUTTON: Selected client:', selectedClient);
                    console.log('🔍 BUTTON: Selected plans:', selectedPlans);
                    if (selectedClient && selectedPlans.length > 0) {
                      console.log('🔍 BUTTON: Proceeding with assignment...');
                      selectedPlans.forEach(planId => {
                        assignPlanToClient(selectedClient.id, planId);
                      });
                      setShowAssignModal(false);
                      setSelectedClient(null);
                      setSelectedPlans([]);
                    } else {
                      console.log('🔍 BUTTON: No client or plans selected');
                    }
                  }}
                  disabled={!selectedClient || selectedPlans.length === 0}
                >
                  <Text style={styles.assignModalButtonText}>
                    Assign {selectedPlans.length > 1 ? `${selectedPlans.length} Plans` : 'Plan'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Plan Creation/Editing Modal */}
      {showPlanModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.planModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingPlan ? 'Edit Subscription Plan' : 'Create New Subscription Plan'}
              </Text>
              <TouchableOpacity onPress={() => setShowPlanModal(false)}>
                <WebCompatibleIcon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.planModalContent}>
              {/* Basic Information */}
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Basic Information</Text>
                
                <View style={styles.formRow}>
                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>Plan Name *</Text>
                    <TextInput
                      style={styles.formInput}
                      value={planFormData.name}
                      onChangeText={(text) => setPlanFormData({...planFormData, name: text})}
                      placeholder="Enter plan name"
                    />
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>Monthly Classes *</Text>
                    <TextInput
                      style={styles.formInput}
                      value={planFormData.monthlyClasses.toString()}
                      onChangeText={(text) => setPlanFormData({...planFormData, monthlyClasses: parseInt(text) || 0})}
                      placeholder="8"
                      keyboardType="numeric"
                    />
                    <Text style={styles.helperText}>Enter 999 for unlimited classes</Text>
                  </View>
                  
                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>Monthly Price (ALL) *</Text>
                    <TextInput
                      style={styles.formInput}
                      value={planFormData.monthlyPrice.toString()}
                      onChangeText={(text) => setPlanFormData({...planFormData, monthlyPrice: parseInt(text) || 0})}
                      placeholder="8500"
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>Duration *</Text>
                    <View style={styles.durationButtons}>
                      {[
                        { label: '1 Day', duration: 1, unit: 'days' },
                        { label: '3 Days', duration: 3, unit: 'days' },
                        { label: '1 Week', duration: 7, unit: 'days' },
                        { label: '1 Month', duration: 1, unit: 'months' },
                        { label: '3 Months', duration: 3, unit: 'months' },
                        { label: '6 Months', duration: 6, unit: 'months' },
                        { label: '1 Year', duration: 1, unit: 'years' },
                      ].map(option => (
                        <TouchableOpacity
                          key={option.label}
                          style={[
                            styles.durationButton,
                            planFormData.duration === option.duration && 
                            planFormData.duration_unit === option.unit && styles.activeDurationButton,
                          ]}
                          onPress={() => setPlanFormData({ 
                            ...planFormData, 
                            duration: option.duration,
                            duration_unit: option.unit as 'days' | 'months' | 'years'
                          })}
                        >
                          <Text style={[
                            styles.durationButtonText,
                            planFormData.duration === option.duration && 
                            planFormData.duration_unit === option.unit && styles.activeDurationButtonText,
                          ]}>
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <Text style={styles.helperText}>Or enter custom duration below</Text>
                    
                    {/* Custom Duration Input */}
                    <View style={styles.customDurationRow}>
                      <TextInput
                        style={[styles.formInput, { flex: 2, marginRight: 10 }]}
                        value={planFormData.duration.toString()}
                        onChangeText={(text) => {
                          const duration = parseInt(text, 10) || 1;
                          setPlanFormData({ ...planFormData, duration });
                        }}
                        placeholder="Enter number"
                        keyboardType="numeric"
                      />
                      <View style={[styles.formInput, { flex: 1 }]}>
                        <TouchableOpacity
                          style={styles.unitSelector}
                          onPress={() => {
                            // Cycle through units: days -> months -> years -> days
                            const units: ('days' | 'months' | 'years')[] = ['days', 'months', 'years'];
                            const currentIndex = units.indexOf(planFormData.duration_unit);
                            const nextIndex = (currentIndex + 1) % units.length;
                            setPlanFormData({ 
                              ...planFormData, 
                              duration_unit: units[nextIndex]
                            });
                          }}
                        >
                          <Text style={styles.unitSelectorText}>
                            {planFormData.duration_unit.charAt(0).toUpperCase() + planFormData.duration_unit.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>Category *</Text>
                    <View style={styles.categoryButtons}>
                      {[
                        { value: 'group', label: 'GROUP' },
                        { value: 'personal', label: 'PERSONAL' },
                        { value: 'personal_duo', label: 'PERSONAL DUO' },
                        { value: 'personal_trio', label: 'Personal Trio' }
                      ].map(category => (
                        <TouchableOpacity
                          key={category.value}
                          style={[
                            styles.categoryButton,
                            planFormData.category === category.value && styles.activeCategoryButton
                          ]}
                          onPress={() => setPlanFormData({...planFormData, category: category.value as any})}
                        >
                          <Text style={[
                            styles.categoryButtonText,
                            planFormData.category === category.value && styles.activeCategoryButtonText
                          ]}>
                            {category.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>Equipment Access *</Text>
                    <View style={styles.equipmentButtons}>
                      {[
                        { value: 'mat', label: 'Mat Only' },
                        { value: 'reformer', label: 'Reformer Only' },
                        { value: 'both', label: 'Both' }
                      ].map(equipment => (
                        <TouchableOpacity
                          key={equipment.value}
                          style={[
                            styles.equipmentButton,
                            planFormData.equipmentAccess === equipment.value && styles.activeEquipmentButton
                          ]}
                          onPress={() => setPlanFormData({...planFormData, equipmentAccess: equipment.value as any})}
                        >
                          <Text style={[
                            styles.equipmentButtonText,
                            planFormData.equipmentAccess === equipment.value && styles.activeEquipmentButtonText
                          ]}>
                            {equipment.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>Description</Text>
                    <TextInput
                      style={[styles.formInput, styles.textArea]}
                      value={planFormData.description}
                      onChangeText={(text) => setPlanFormData({...planFormData, description: text})}
                      placeholder="Enter plan description"
                      multiline
                      numberOfLines={3}
                    />
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>Features (one per line)</Text>
                    <TextInput
                      style={[styles.formInput, styles.featuresTextArea]}
                      value={planFormData.features}
                      onChangeText={(text) => setPlanFormData({...planFormData, features: text})}
                      placeholder="Enter each feature on a new line"
                      multiline
                      numberOfLines={6}
                    />
                    <Text style={styles.helperText}>Enter each feature on a separate line</Text>
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={styles.planModalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowPlanModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSavePlan}
                disabled={isSavingPlan}
              >
                <Text style={styles.saveButtonText}>
                  {isSavingPlan ? 'Saving...' : (editingPlan ? 'Update Plan' : 'Create Plan')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Subscription Conflict Dialog */}
      <SubscriptionConflictDialog
        visible={showSubscriptionOptionsModal}
        onDismiss={() => setShowSubscriptionOptionsModal(false)}
        conflictData={subscriptionOptionsData}
        onProceed={(option: string) => {
          setShowSubscriptionOptionsModal(false);
          handleSubscriptionOption(option);
        }}
        loading={false}
      />

      {/* Expiring Subscriptions Confirmation Modal */}
      {showExpiringConfirmModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <Text style={styles.confirmTitle}>Check Expiring Subscriptions</Text>
            <Text style={styles.confirmMessage}>
              This will check for subscriptions expiring in the next 5 days and send notifications to clients.
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowExpiringConfirmModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={performExpiringCheck}
              >
                <Text style={styles.confirmButtonText}>Check Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Expired Subscriptions Confirmation Modal */}
      {showExpiredConfirmModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <Text style={styles.confirmTitle}>Check Expired Subscriptions</Text>
            <Text style={styles.confirmMessage}>
              This will check for subscriptions that expired recently and send notifications to clients.
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowExpiredConfirmModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={performExpiredCheck}
              >
                <Text style={styles.confirmButtonText}>Check Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Notification Test Modal */}
      {showNotificationTestModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.testModal}>
            <Text style={styles.confirmTitle}>Test Subscription Notifications</Text>
            <Text style={styles.confirmMessage}>
              Choose which type of subscription notification to test:
            </Text>
            <View style={styles.testActions}>
              <TouchableOpacity
                style={styles.testButton}
                onPress={testWelcomeNotification}
              >
                <Text style={styles.testButtonText}>Test Welcome</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.testButton}
                onPress={testExpiringNotification}
              >
                <Text style={styles.testButtonText}>Test Expiring</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.testButton}
                onPress={testExpiredNotification}
              >
                <Text style={styles.testButtonText}>Test Expired</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowNotificationTestModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F2E8',
  },
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#9B8A7D',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#9B8A7D',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  assignHeaderButton: {
    backgroundColor: '#C77474',
  },
  notificationHeaderButton: {
    backgroundColor: '#ff9800',
  },
  debugHeaderButton: {
    backgroundColor: '#9c27b0',
  },
  confirmModal: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    maxWidth: 400,
    alignSelf: 'center',
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  confirmActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  confirmButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  testModal: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    maxWidth: 400,
    alignSelf: 'center',
  },
  testActions: {
    gap: 12,
  },
  testButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  testButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  headerButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    flexWrap: 'wrap',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    minWidth: 200,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  filterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F0F0F0',
  },
  activeFilter: {
    backgroundColor: '#C77474',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
  },
  activeFilterText: {
    color: 'white',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F8F8F8',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    alignItems: 'center',
  },
  selectAllButton: {
    width: 40,
    alignItems: 'center',
  },
  headerCell: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  headerCellText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
  },
  tableContainer: {
    flex: 1,
    maxHeight: 500, // Fixed height to ensure scrolling works
    backgroundColor: 'white',
  },
  tableContentContainer: {
    paddingBottom: 40, // Extra padding at the bottom
    minHeight: 600, // Ensure minimum content height to trigger scrolling
  },
  scrollPadding: {
    height: 100, // Extra space to ensure scroll bar appears
    backgroundColor: 'transparent',
  },
  planRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    alignItems: 'center',
  },
  evenRow: {
    backgroundColor: '#FAFAFA',
  },
  checkboxCell: {
    width: 40,
    alignItems: 'center',
  },
  nameCell: {
    flex: 2,
    paddingRight: 12,
  },
  planName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
  },
  priceCell: {
    flex: 1.5,
    paddingRight: 12,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  classesText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  equipmentCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 12,
  },
  equipmentText: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
  },
  statsCell: {
    flex: 1,
    alignItems: 'center',
    paddingRight: 12,
  },
  statsNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#C77474',
  },
  statsLabel: {
    fontSize: 10,
    color: '#666',
  },
  statusCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 12,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#666',
  },
  actionsCell: {
    flex: 2,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  actionButtonContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
  },
  assignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#C77474',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  assignButtonText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '500',
  },
  editButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#E0E0E0',
    minWidth: 32,
    alignItems: 'center',
  },
  statusToggleButton: {
    padding: 8,
    borderRadius: 6,
    minWidth: 32,
    alignItems: 'center',
  },
  pauseButton: {
    backgroundColor: '#FF9800',
  },
  activateButton: {
    backgroundColor: '#4caf50',
  },
  deleteButton: {
    backgroundColor: '#f44336',
    padding: 8,
    borderRadius: 6,
    minWidth: 32,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#666',
    marginTop: 12,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  assignModal: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    maxWidth: 600,
    width: '100%',
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  clientsList: {
    maxHeight: 300,
    marginBottom: 20,
  },
  clientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#F8F8F8',
    gap: 12,
  },
  selectedClientItem: {
    backgroundColor: '#C7747420',
    borderWidth: 1,
    borderColor: '#C77474',
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  clientEmail: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#F0F0F0',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 14,
  },
  assignModalButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#C77474',
  },
  disabledButton: {
    backgroundColor: '#CCC',
  },
  assignModalButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  planModal: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  planModalContent: {
    padding: 20,
  },
  formSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  formField: {
    flex: 1,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  formInput: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 6,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  featuresTextArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  categoryButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryButton: {
    padding: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 6,
  },
  activeCategoryButton: {
    borderColor: '#C77474',
  },
  categoryButtonText: {
    fontSize: 12,
    color: '#666',
  },
  activeCategoryButtonText: {
    color: '#C77474',
  },
  equipmentButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  equipmentButton: {
    padding: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 6,
  },
  activeEquipmentButton: {
    borderColor: '#C77474',
  },
  equipmentButtonText: {
    fontSize: 12,
    color: '#666',
  },
  activeEquipmentButtonText: {
    color: '#C77474',
  },
  planModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#C77474',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  buttonLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  durationButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  durationButton: {
    padding: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 6,
  },
  activeDurationButton: {
    borderColor: '#C77474',
    backgroundColor: '#C7747420',
  },
  durationButtonText: {
    fontSize: 12,
    color: '#666',
  },
  activeDurationButtonText: {
    color: '#C77474',
  },
  customDurationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  unitSelector: {
    padding: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 6,
    alignItems: 'center',
  },
  unitSelectorText: {
    fontSize: 12,
    color: '#666',
  },

});

export default PCSubscriptionPlans; 