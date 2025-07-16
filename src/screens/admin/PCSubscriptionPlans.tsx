import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
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
  durationMonths: number;
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
  const [planFormData, setPlanFormData] = useState<PlanFormData>({
    name: '',
    monthlyClasses: 8,
    monthlyPrice: 8500,
    durationMonths: 1,
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
      // This would be a new API endpoint to get plan statistics
      // For now, we'll simulate the data
      const statsMap: { [key: number]: PlanStats } = {};
      
      if (Array.isArray(plans)) {
        plans.forEach((plan, index) => {
          statsMap[plan.id] = {
            activeSubscriptions: Math.floor(Math.random() * 50) + 5,
            totalRevenue: plan.monthly_price * (Math.floor(Math.random() * 30) + 10),
            averagePrice: plan.monthly_price,
            popularityRank: index + 1
          };
        });
      }
      
      setPlanStats(statsMap);
    } catch (error) {
      console.error('Failed to load plan statistics:', error);
    }
  };

  // Filter and sort plans
  const filteredAndSortedPlans = React.useMemo(() => {
    let filtered = Array.isArray(plans) ? [...plans] : [];
    
    console.log('📊 All plans before filtering:', filtered.map(p => ({ 
      id: p.id, 
      name: p.name, 
      is_active: p.is_active, 
      type: typeof p.is_active 
    })));

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(plan => 
        plan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        plan.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply category filter
    if (filterCategory !== 'all') {
      filtered = filtered.filter(plan => plan.category === filterCategory);
    }

    // Apply status filter - handle different possible values for is_active
    if (filterStatus !== 'all') {
      filtered = filtered.filter(plan => {
        // Check if plan is active - handle both number (1/0) and any other truthy values
        const isActive = Boolean(plan.is_active);
        const shouldShowActive = filterStatus === 'active';
        const shouldShow = shouldShowActive ? isActive : !isActive;
        
        console.log(`🔍 Plan ${plan.name}: is_active=${plan.is_active}, isActive=${isActive}, filterStatus=${filterStatus}, shouldShow=${shouldShow}`);
        
        return shouldShow;
      });
    }

    console.log('📋 Filtered plans:', filtered.map(p => ({ 
      id: p.id, 
      name: p.name, 
      is_active: p.is_active 
    })));

    // Apply sorting
    filtered.sort((a, b) => {
      let valueA: any, valueB: any;

      switch (sortBy) {
        case 'name':
          valueA = a.name.toLowerCase();
          valueB = b.name.toLowerCase();
          break;
        case 'price':
          valueA = a.monthly_price;
          valueB = b.monthly_price;
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

  const assignPlanToClient = async (clientId: number, planId: number) => {
    try {
      const response = await subscriptionService.assignSubscription(clientId, planId);
      if (response.success) {
        Alert.alert('Success', 'Subscription plan assigned successfully!');
        // Refresh statistics
        loadPlanStatistics();
      } else {
        Alert.alert('Error', response.error || 'Failed to assign subscription plan');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
      console.error('Assignment error:', error);
    }
  };

  // Plan management functions
  const handleCreatePlan = () => {
    setEditingPlan(null);
    setPlanFormData({
      name: '',
      monthlyClasses: 8,
      monthlyPrice: 8500,
      durationMonths: 1,
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
      name: plan.name,
      monthlyClasses: plan.monthly_classes,
      monthlyPrice: plan.monthly_price,
      durationMonths: plan.duration_months || 1,
      equipmentAccess: plan.equipment_access,
      description: plan.description,
      category: plan.category,
      features: Array.isArray(plan.features) ? plan.features.join('\n') : '',
    });
    setShowPlanModal(true);
  };

  const handleSavePlan = async () => {
    // Comprehensive validation
    const errors = [];
    
    if (!planFormData.name || planFormData.name.trim().length === 0) {
      errors.push('Plan name is required');
    }
    
    if (planFormData.monthlyClasses <= 0) {
      errors.push('Monthly classes must be greater than 0');
    }
    
    if (planFormData.monthlyPrice <= 0) {
      errors.push('Monthly price must be greater than 0');
    }
    
    if (planFormData.durationMonths <= 0) {
      errors.push('Duration must be greater than 0');
    }
    
    if (!planFormData.category) {
      errors.push('Category is required');
    }
    
    if (!planFormData.equipmentAccess) {
      errors.push('Equipment access is required');
    }
    
    if (errors.length > 0) {
      Alert.alert('Validation Error', errors.join('\n'));
      return;
    }

    setIsSavingPlan(true);
    
    try {
      const featuresArray = planFormData.features
        .split('\n')
        .map(feature => feature.trim())
        .filter(feature => feature.length > 0);

      if (editingPlan) {
        // Update existing plan
        const updateData = {
          name: planFormData.name.trim(),
          monthlyClasses: planFormData.monthlyClasses,
          monthlyPrice: planFormData.monthlyPrice,
          durationMonths: planFormData.durationMonths,
          equipmentAccess: planFormData.equipmentAccess,
          description: planFormData.description.trim(),
          category: planFormData.category,
          features: featuresArray,
          isActive: true
        };
        await dispatch(updatePlan({ id: editingPlan.id, planData: updateData })).unwrap();
        Alert.alert('Success', 'Plan updated successfully');
      } else {
        // Create new plan
        const createData = {
          name: planFormData.name.trim(),
          monthlyClasses: planFormData.monthlyClasses,
          monthlyPrice: planFormData.monthlyPrice,
          durationMonths: planFormData.durationMonths,
          equipmentAccess: planFormData.equipmentAccess,
          description: planFormData.description.trim(),
          category: planFormData.category,
          features: featuresArray
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

    // Handle both integer (1/0) and boolean values consistently
    const currentStatus = Boolean(plan.is_active);
    const newStatus = !currentStatus;
    
    console.log('📊 Plan found:', plan.name);
    console.log('📊 Current is_active value:', plan.is_active);
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
          <MaterialIcons
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
          <Text style={styles.priceText}>{plan.monthly_price.toLocaleString()} ALL</Text>
          <Text style={styles.classesText}>
            {plan.monthly_classes >= 999 ? 'Unlimited' : `${plan.monthly_classes} classes`}
          </Text>
        </View>

        {/* Equipment */}
        <View style={styles.equipmentCell}>
          <MaterialIcons
            name={getEquipmentIcon(plan.equipment_access)}
            size={18}
            color="#666"
          />
          <Text style={styles.equipmentText}>{plan.equipment_access}</Text>
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
              { backgroundColor: plan.is_active === 1 ? '#4caf50' : '#f44336' }
            ]}
          />
          <Text style={styles.statusText}>
            {plan.is_active === 1 ? 'Active' : 'Inactive'}
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
              <MaterialIcons name="person-add" size={16} color="white" />
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
              <MaterialIcons name="edit" size={16} color="#666" />
            </TouchableOpacity>
            <Text style={styles.buttonLabel}>Edit</Text>
          </View>

          <View style={styles.actionButtonContainer}>
            <TouchableOpacity
              style={[
                styles.statusToggleButton, 
                plan.is_active === 1 ? styles.pauseButton : styles.activateButton
              ]}
              onPress={() => {
                console.log('🟠 ORANGE/GREEN STATUS TOGGLE button clicked for plan:', plan.name, 'Current status:', plan.is_active);
                handleTogglePlanStatus(plan.id);
              }}
            >
              <MaterialIcons 
                name={plan.is_active === 1 ? 'pause' : 'play-arrow'} 
                size={16} 
                color="white"
              />
            </TouchableOpacity>
            <Text style={styles.buttonLabel}>
              {plan.is_active === 1 ? 'Pause' : 'Activate'}
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
              <MaterialIcons name="delete" size={16} color="white" />
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
              <MaterialIcons name="add" size={20} color="white" />
              <Text style={styles.headerButtonText}>New Plan</Text>
            </TouchableOpacity>
            
            {selectedPlans.length > 0 && (
              <TouchableOpacity
                style={[styles.headerButton, styles.assignHeaderButton]}
                onPress={handleBulkAssign}
              >
                <MaterialIcons name="group-add" size={20} color="white" />
                <Text style={styles.headerButtonText}>Bulk Assign</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Search and Filters */}
        <View style={styles.filtersRow}>
          <View style={styles.searchContainer}>
            <MaterialIcons name="search" size={20} color="#666" />
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
          <MaterialIcons
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
            <MaterialIcons
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
            <MaterialIcons
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
            <MaterialIcons
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
            <MaterialIcons name="card-membership" size={48} color="#ccc" />
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
                <MaterialIcons name="close" size={24} color="#666" />
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
                    <MaterialIcons
                      name="person"
                      size={20}
                      color={selectedClient?.id === client.id ? '#C77474' : '#666'}
                    />
                    <View style={styles.clientInfo}>
                      <Text style={styles.clientName}>{client.name}</Text>
                      <Text style={styles.clientEmail}>{client.email}</Text>
                    </View>
                    {selectedClient?.id === client.id && (
                      <MaterialIcons name="check-circle" size={20} color="#C77474" />
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
                    if (selectedClient && selectedPlans.length > 0) {
                      selectedPlans.forEach(planId => {
                        assignPlanToClient(selectedClient.id, planId);
                      });
                      setShowAssignModal(false);
                      setSelectedClient(null);
                      setSelectedPlans([]);
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
                <MaterialIcons name="close" size={24} color="#666" />
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
                    <Text style={styles.formLabel}>Duration (Months) *</Text>
                    <View style={styles.durationButtons}>
                      {[
                        { value: 0.033, label: '1 Day' },
                        { value: 0.233, label: '1 Week' },
                        { value: 1, label: '1 Month' },
                        { value: 3, label: '3 Months' },
                        { value: 6, label: '6 Months' },
                        { value: 12, label: '1 Year' }
                      ].map(duration => (
                        <TouchableOpacity
                          key={duration.value}
                          style={[
                            styles.durationButton,
                            Math.abs(planFormData.durationMonths - duration.value) < 0.01 && styles.activeDurationButton
                          ]}
                          onPress={() => setPlanFormData({...planFormData, durationMonths: duration.value})}
                        >
                          <Text style={[
                            styles.durationButtonText,
                            Math.abs(planFormData.durationMonths - duration.value) < 0.01 && styles.activeDurationButtonText
                          ]}>
                            {duration.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <Text style={styles.helperText}>Or enter custom duration below (in months: 0.033 = 1 day, 0.233 = 1 week)</Text>
                    <TextInput
                      style={styles.formInput}
                      value={planFormData.durationMonths.toString()}
                      onChangeText={(text) => setPlanFormData({...planFormData, durationMonths: parseFloat(text) || 1})}
                      placeholder="1"
                      keyboardType="numeric"
                    />
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
    padding: 20,
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
});

export default PCSubscriptionPlans; 