import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import {
    Button,
    Card,
    Chip,
    FAB,
    IconButton,
    Modal,
    Paragraph,
    Portal,
    SegmentedButtons,
    TextInput,
    Title
} from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import WebCompatibleIcon from '../../components/WebCompatibleIcon';
import { SubscriptionPlan } from '../../services/subscriptionService';
import { AppDispatch, RootState } from '../../store';
import { createPlan, deletePlan, fetchPlans, updatePlan } from '../../store/subscriptionSlice';

// Enhanced form data interface to support simple duration
interface PlanFormData {
  name: string;
  monthlyClasses: number;
  monthlyPrice: number;
  duration: number;
  duration_unit: 'days' | 'months' | 'years';
  equipmentAccess: 'mat' | 'reformer' | 'both';
  description: string;
  category: 'trial' | 'basic' | 'standard' | 'premium' | 'unlimited' | 'personal' | 'special';
  features: string;
  // Personal class specific fields
  sessionDuration: number; // in minutes
  maxStudentsPerSession: number;
  instructorRequired: boolean;
  preferredInstructor: string;
}

// Helper function to map backend categories to form categories
const mapBackendCategoryToForm = (backendCategory: string | undefined): PlanFormData['category'] => {
  switch (backendCategory) {
    case 'group': return 'basic';
    case 'personal': return 'personal';
    case 'personal_duo': return 'premium';
    case 'personal_trio': return 'standard';
    default: return 'basic';
  }
};

// Helper function to map form categories to backend categories
const mapFormCategoryToBackend = (formCategory: PlanFormData['category']): 'group' | 'personal' | 'personal_duo' | 'personal_trio' => {
  switch (formCategory) {
    case 'personal': return 'personal';
    case 'premium': return 'personal_duo';
    case 'standard': return 'personal_trio';
    case 'trial':
    case 'basic':
    case 'unlimited':
    case 'special':
    default: return 'group';
  }
};

function SubscriptionPlans() {
  const dispatch = useDispatch<AppDispatch>();
  const { user, isLoggedIn } = useSelector((state: RootState) => state.auth);
  const { plans, isLoading } = useSelector((state: RootState) => state.subscriptions);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [filterCategory, setFilterCategory] = useState('all');

  const [planFormData, setPlanFormData] = useState<PlanFormData>({
    name: '',
    monthlyClasses: 8,
    monthlyPrice: 120,
    duration: 1,
    duration_unit: 'months',
    equipmentAccess: 'mat',
    description: '',
    category: 'basic',
    features: '',
    // Personal class defaults
    sessionDuration: 60,
    maxStudentsPerSession: 12,
    instructorRequired: false,
    preferredInstructor: ''
  });

  const availablePlans = Array.isArray(plans) ? plans : [];
  const filteredPlans = availablePlans.filter(plan => {
    if (filterCategory === 'all') return true;
    return plan.category === filterCategory;
  });

  const getEquipmentColor = (equipment: 'mat' | 'reformer' | 'both') => {
    switch (equipment) {
      case 'mat': return '#4caf50';
      case 'reformer': return '#ff9800';
      case 'both': return '#9c27b0';
      default: return '#666';
    }
  };

  const getCategoryColor = (category: 'trial' | 'basic' | 'standard' | 'premium' | 'unlimited' | 'personal' | 'special') => {
    switch (category) {
      case 'trial': return '#607d8b';
      case 'basic': return '#2196f3';
      case 'standard': return '#ff9800';
      case 'premium': return '#9c27b0';
      case 'unlimited': return '#f44336';
      case 'personal': return '#795548';
      case 'special': return '#4caf50';
      default: return '#666';
    }
  };

  // Check if current plan type is personal
  const isPersonalPlan = planFormData.category === 'personal';

  // Get default features based on category
  const getDefaultFeatures = (category: string): string => {
    switch (category) {
      case 'personal':
        return [
          'One-on-One Personal Training',
          'Customized Workout Plans',
          'Dedicated Instructor Attention',
          'Flexible Scheduling',
          'Progress Tracking & Assessment',
          'Injury Modification Support'
        ].join('\n');
      case 'trial':
        return [
          'Beginner-Friendly Classes',
          'Free Studio Orientation',
          'Basic Equipment Tutorial',
          'No Long-term Commitment',
          'Upgrade Discount Available'
        ].join('\n');
      case 'unlimited':
        return [
          'Unlimited Monthly Classes',
          'All Equipment Access',
          'Priority Booking',
          'Guest Pass Included',
          'Workshop Discounts',
          'Personal Training Discount'
        ].join('\n');
      default:
        return [
          'Monthly Class Allocation',
          'Online Booking System',
          'Class Cancellation Policy',
          'Progress Tracking',
          'Community Access'
        ].join('\n');
    }
  };

  const handleCreatePlan = () => {
    setEditingPlan(null);
    setPlanFormData({
      name: '',
      monthlyClasses: 8,
      monthlyPrice: 120,
      duration: 1,
      duration_unit: 'months',
      equipmentAccess: 'mat',
      description: '',
      category: 'basic',
      features: '',
      sessionDuration: 60,
      maxStudentsPerSession: 12,
      instructorRequired: false,
      preferredInstructor: ''
    });
    setModalVisible(true);
  };

  const handleEditPlan = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setPlanFormData({
      name: plan.name,
      monthlyClasses: plan.monthly_classes ?? plan.monthlyClasses ?? 8,
      monthlyPrice: plan.monthly_price ?? plan.monthlyPrice ?? 120,
      duration: plan.duration ?? 1,
      duration_unit: plan.duration_unit ?? 'months',
      equipmentAccess: plan.equipment_access ?? plan.equipmentAccess ?? 'mat',
      description: plan.description,
      category: mapBackendCategoryToForm(plan.category),
      features: Array.isArray(plan.features) ? plan.features.join('\n') : '',
      // Personal class fields (use defaults if not present)
      sessionDuration: 60,
      maxStudentsPerSession: plan.category === 'personal' ? 1 : 12,
      instructorRequired: plan.category === 'personal',
      preferredInstructor: ''
    });
    setModalVisible(true);
  };

  // Auto-update form when category changes
  const handleCategoryChange = (newCategory: PlanFormData['category']) => {
    setPlanFormData(prev => ({
      ...prev,
      category: newCategory,
      features: getDefaultFeatures(newCategory),
      // Update defaults for personal classes
      maxStudentsPerSession: newCategory === 'personal' ? 1 : 12,
      instructorRequired: newCategory === 'personal',
      monthlyClasses: newCategory === 'personal' ? 4 : newCategory === 'unlimited' ? 999 : prev.monthlyClasses,
      monthlyPrice: newCategory === 'personal' ? 300 : newCategory === 'unlimited' ? 199 : prev.monthlyPrice
    }));
  };

  const handleSavePlan = async () => {
    if (!planFormData.name || planFormData.monthlyPrice <= 0 || planFormData.monthlyClasses <= 0) {
      Alert.alert('Error', 'Please fill in all required fields with valid values');
      return;
    }

    const featuresArray = planFormData.features
      .split('\n')
      .map(feature => feature.trim())
      .filter(feature => feature.length > 0);

    try {
      if (editingPlan) {
        // Update existing plan
        const updateData = {
          name: planFormData.name,
          monthlyClasses: planFormData.monthlyClasses,
          monthlyPrice: planFormData.monthlyPrice,
          equipmentAccess: planFormData.equipmentAccess,
          description: planFormData.description,
          category: mapFormCategoryToBackend(planFormData.category),
          features: featuresArray,
          isActive: true
        };
        await dispatch(updatePlan({ id: editingPlan.id, planData: updateData })).unwrap();
        Alert.alert('Success', 'Plan updated successfully');
      } else {
        // Create new plan
        const createData = {
          name: planFormData.name,
          monthlyClasses: planFormData.monthlyClasses,
          monthlyPrice: planFormData.monthlyPrice,
          duration: planFormData.duration,
          duration_unit: planFormData.duration_unit,
          equipmentAccess: planFormData.equipmentAccess,
          description: planFormData.description,
          category: mapFormCategoryToBackend(planFormData.category),
          features: featuresArray
        };
        await dispatch(createPlan(createData)).unwrap();
        Alert.alert('Success', 'Plan created successfully');
      }
      
      // Refresh the plans list
      dispatch(fetchPlans());
      setModalVisible(false);
    } catch (error) {
      Alert.alert('Error', error as string);
    }
  };

  const handleDeletePlan = async (planId: number) => {
    Alert.alert(
      'Delete Subscription Plan',
      'Are you sure you want to delete this subscription plan?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(deletePlan(planId)).unwrap();
              Alert.alert('Success', 'Plan deleted successfully');
              dispatch(fetchPlans());
            } catch (error) {
              Alert.alert('Error', error as string);
            }
          }
        }
      ]
    );
  };

  const handleTogglePlanStatus = async (planId: number) => {
    const plan = availablePlans.find(p => p.id === planId);
    if (!plan) return;

    try {
      const updateData = {
        isActive: plan.is_active === 1 ? false : true
      };
      await dispatch(updatePlan({ id: planId, planData: updateData })).unwrap();
      Alert.alert('Success', 'Plan status updated successfully');
      dispatch(fetchPlans());
    } catch (error) {
      Alert.alert('Error', error as string);
    }
  };

  useEffect(() => {
    // Fetch subscription plans when component mounts
    if (isLoggedIn && user?.role === 'admin') {
      dispatch(fetchPlans());
    }
  }, [dispatch, isLoggedIn, user?.role]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Title style={styles.headerTitle}>Subscription Plans</Title>
        <Paragraph style={styles.headerSubtitle}>Create and manage monthly subscription packages</Paragraph>
      </View>

      <View style={styles.filtersContainer}>
        <SegmentedButtons
          value={filterCategory}
          onValueChange={setFilterCategory}
          buttons={[
            { value: 'all', label: 'All' },
            { value: 'trial', label: 'Trial' },
            { value: 'basic', label: 'Basic' },
            { value: 'standard', label: 'Standard' },
            { value: 'premium', label: 'Premium' },
            { value: 'unlimited', label: 'Unlimited' },
            { value: 'personal', label: 'Personal' },
            { value: 'special', label: 'Special' },
          ]}
          style={styles.segmentedButtons}
        />
      </View>

      <ScrollView style={styles.content}>
        {filteredPlans.map((plan) => (
          <Card key={plan.id} style={styles.planCard}>
            <Card.Content>
              <View style={styles.planHeader}>
                <View style={styles.planInfo}>
                  <Title style={styles.planName}>{plan.name}</Title>
                  <Paragraph style={styles.planDetails}>
                    {(plan.monthly_classes ?? plan.monthlyClasses ?? 8) >= 999 ? 'Unlimited' : (plan.monthly_classes ?? plan.monthlyClasses ?? 8)} classes per month
                  </Paragraph>
                  <Paragraph style={styles.planDescription}>{plan.description}</Paragraph>
                </View>
                <View style={styles.planLabels}>
                  <Chip 
                    style={[styles.equipmentChip, { backgroundColor: getEquipmentColor(plan.equipment_access || 'mat') }]}
                    textStyle={styles.chipText}
                  >
                    {plan.equipment_access || 'mat'}
                  </Chip>
                  <Chip 
                    style={[styles.categoryChip, { backgroundColor: getCategoryColor(mapBackendCategoryToForm(plan.category)) }]}
                    textStyle={styles.chipText}
                  >
                    {plan.category || 'basic'}
                  </Chip>
                  <Chip 
                    style={[styles.statusChip, { backgroundColor: plan.is_active === 1 ? '#4caf50' : '#f44336' }]}
                    textStyle={styles.chipText}
                  >
                    {plan.is_active === 1 ? 'Active' : 'Inactive'}
                  </Chip>
                </View>
              </View>

              <View style={styles.priceSection}>
                <View style={styles.priceInfo}>
                  <Title style={styles.planPrice}>{(plan.monthly_price ?? plan.monthlyPrice ?? 120).toLocaleString()} ALL</Title>
                  <Paragraph style={styles.priceLabel}>per month</Paragraph>
                </View>
                <View style={styles.priceBreakdown}>
                  {(plan.monthly_classes ?? plan.monthlyClasses ?? 8) !== 999 && (
                    <Paragraph style={styles.pricePerClass}>
                      {((plan.monthly_price ?? plan.monthlyPrice ?? 120) / (plan.monthly_classes ?? plan.monthlyClasses ?? 8)).toLocaleString()} ALL per class
                    </Paragraph>
                  )}
                  <Paragraph style={styles.billingInfo}>
                    Recurring monthly billing
                  </Paragraph>
                </View>
              </View>

              <View style={styles.features}>
                <Title style={styles.featuresTitle}>Features:</Title>
                {(Array.isArray(plan.features) ? plan.features : []).map((feature, index) => (
                  <View key={index} style={styles.featureItem}>
                    <WebCompatibleIcon name="check-circle" size={16} color="#4caf50" />
                    <Paragraph style={styles.featureText}>{feature}</Paragraph>
                  </View>
                ))}
              </View>

              <View style={styles.planActions}>
                <IconButton
                  icon="pencil"
                  mode="outlined"
                  onPress={() => handleEditPlan(plan)}
                />
                <IconButton
                  icon={plan.is_active === 1 ? 'pause' : 'play'}
                  mode="outlined"
                  onPress={() => handleTogglePlanStatus(plan.id)}
                />
                <IconButton
                  icon="delete"
                  mode="outlined"
                  iconColor="#f44336"
                  onPress={() => handleDeletePlan(plan.id)}
                />
              </View>
            </Card.Content>
          </Card>
        ))}

        {filteredPlans.length === 0 && (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <WebCompatibleIcon name="card-membership" size={48} color="#ccc" />
              <Title style={styles.emptyTitle}>No subscription plans found</Title>
              <Paragraph style={styles.emptyText}>
                Create your first subscription plan or adjust your filters.
              </Paragraph>
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={handleCreatePlan}
        label="New Plan"
      />

      <Portal>
        <Modal visible={modalVisible} onDismiss={() => setModalVisible(false)} contentContainerStyle={styles.modal}>
          <ScrollView>
            <Title style={styles.modalTitle}>
              {editingPlan ? 'Edit Subscription Plan' : 'Create New Subscription Plan'}
            </Title>

            <TextInput
              label="Plan Name *"
              value={planFormData.name}
              onChangeText={(text) => setPlanFormData({...planFormData, name: text})}
              mode="outlined"
              style={styles.input}
            />

            <TextInput
              label="Monthly Classes *"
              value={planFormData.monthlyClasses.toString()}
              onChangeText={(text) => setPlanFormData({...planFormData, monthlyClasses: parseInt(text) || 8})}
              mode="outlined"
              keyboardType="numeric"
              style={styles.input}
            />
            <Paragraph style={styles.helperText}>Enter 999 for unlimited classes</Paragraph>

            <TextInput
              label="Monthly Price (ALL) *"
              value={planFormData.monthlyPrice.toString()}
              onChangeText={(text) => setPlanFormData({...planFormData, monthlyPrice: parseInt(text) || 8500})}
              mode="outlined"
              keyboardType="numeric"
              style={styles.input}
            />

            <Title style={styles.sectionTitle}>Duration</Title>
            <SegmentedButtons
              value={planFormData.duration_unit}
              onValueChange={(value) => setPlanFormData({...planFormData, duration_unit: value as 'days' | 'months' | 'years'})}
              buttons={[
                { value: 'days', label: 'Days' },
                { value: 'months', label: 'Months' },
                { value: 'years', label: 'Years' },
              ]}
              style={styles.input}
            />
            <TextInput
              label="Duration"
              value={planFormData.duration.toString()}
              onChangeText={(text) => setPlanFormData({...planFormData, duration: parseInt(text) || 1})}
              mode="outlined"
              keyboardType="numeric"
              style={styles.input}
            />

            <Title style={styles.sectionTitle}>Equipment Access</Title>
            <SegmentedButtons
              value={planFormData.equipmentAccess}
              onValueChange={(value) => setPlanFormData({...planFormData, equipmentAccess: value as 'mat' | 'reformer' | 'both'})}
              buttons={[
                { value: 'mat', label: 'Mat Only' },
                { value: 'reformer', label: 'Reformer Only' },
                { value: 'both', label: 'Both' },
              ]}
              style={styles.input}
            />

            <Title style={styles.sectionTitle}>Category</Title>
            <SegmentedButtons
              value={planFormData.category}
              onValueChange={(value) => handleCategoryChange(value as PlanFormData['category'])}
              buttons={[
                { value: 'trial', label: 'Trial' },
                { value: 'basic', label: 'Basic' },
                { value: 'standard', label: 'Standard' },
                { value: 'premium', label: 'Premium' },
              ]}
              style={styles.categoryRow}
            />
            <SegmentedButtons
              value={planFormData.category}
              onValueChange={(value) => handleCategoryChange(value as PlanFormData['category'])}
              buttons={[
                { value: 'unlimited', label: 'Unlimited' },
                { value: 'personal', label: 'Personal' },
                { value: 'special', label: 'Special' },
              ]}
              style={styles.categoryRow}
            />

            {/* Personal Training Fields - Only show if Personal category */}
            {isPersonalPlan && (
              <>
                <Title style={styles.sectionTitle}>Personal Training Settings</Title>
                
                <TextInput
                  label="Session Duration (minutes)"
                  value={planFormData.sessionDuration.toString()}
                  onChangeText={(text) => setPlanFormData({...planFormData, sessionDuration: parseInt(text) || 60})}
                  mode="outlined"
                  keyboardType="numeric"
                  style={styles.input}
                />

                <TextInput
                  label="Max Students per Session"
                  value={planFormData.maxStudentsPerSession.toString()}
                  onChangeText={(text) => setPlanFormData({...planFormData, maxStudentsPerSession: parseInt(text) || 1})}
                  mode="outlined"
                  keyboardType="numeric"
                  style={styles.input}
                />

                <TextInput
                  label="Preferred Instructor (Optional)"
                  value={planFormData.preferredInstructor}
                  onChangeText={(text) => setPlanFormData({...planFormData, preferredInstructor: text})}
                  mode="outlined"
                  style={styles.input}
                  placeholder="Leave blank for any available instructor"
                />
              </>
            )}

            <TextInput
              label="Description"
              value={planFormData.description}
              onChangeText={(text) => setPlanFormData({...planFormData, description: text})}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={styles.input}
            />

            <TextInput
              label="Features (one per line)"
              value={planFormData.features}
              onChangeText={(text) => setPlanFormData({...planFormData, features: text})}
              mode="outlined"
              multiline
              numberOfLines={5}
              style={styles.input}
            />
            <Paragraph style={styles.helperText}>Enter each feature on a new line</Paragraph>

            <View style={styles.modalActions}>
              <Button mode="outlined" onPress={() => setModalVisible(false)}>
                Cancel
              </Button>
              <Button mode="contained" onPress={handleSavePlan}>
                {editingPlan ? 'Update Plan' : 'Create Plan'}
              </Button>
            </View>
          </ScrollView>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F2E8', // Updated ANIMO background
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#9B8A7D', // ANIMO primary color
  },
  headerTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    marginTop: 5,
  },
  filtersContainer: {
    padding: 15,
    backgroundColor: 'white',
  },
  segmentedButtons: {
    marginBottom: 5,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  planCard: {
    marginBottom: 20,
    elevation: 4,
    borderRadius: 12,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 20,
    marginBottom: 5,
    color: '#9B8A7D', // ANIMO primary color
    fontWeight: 'bold',
  },
  planDetails: {
    color: '#666',
    marginBottom: 8,
    fontSize: 16,
  },
  planDescription: {
    color: '#888',
    fontSize: 14,
    lineHeight: 20,
  },
  planLabels: {
    alignItems: 'flex-end',
  },
  equipmentChip: {
    marginBottom: 5,
  },
  categoryChip: {
    marginBottom: 5,
  },
  statusChip: {
    marginBottom: 5,
  },
  chipText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  priceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    padding: 15,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
  },
  priceInfo: {
    alignItems: 'flex-start',
  },
  planPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#9B8A7D', // ANIMO primary color
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
  },
  priceBreakdown: {
    alignItems: 'flex-end',
  },
  pricePerClass: {
    fontSize: 14,
    color: '#666',
  },
  billingInfo: {
    fontSize: 12,
    color: '#888',
  },
  features: {
    marginBottom: 15,
  },
  featuresTitle: {
    fontSize: 16,
    marginBottom: 10,
    fontWeight: '600',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  featureText: {
    marginLeft: 10,
    color: '#666',
    fontSize: 14,
  },
  planActions: {
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
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#C77474', // Dusty rose for primary actions
    elevation: 6,
    boxShadow: '0px 3px 5px rgba(0, 0, 0, 0.3)'
  },
  modal: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 12,
    maxHeight: '90%',
  },
  modalTitle: {
    marginBottom: 20,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
  },
  input: {
    marginBottom: 15,
  },
  helperText: {
    color: '#666',
    fontSize: 12,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    marginBottom: 10,
    marginTop: 10,
    fontWeight: '600',
  },
  categoryRow: {
    marginBottom: 10,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
});

export default SubscriptionPlans; 