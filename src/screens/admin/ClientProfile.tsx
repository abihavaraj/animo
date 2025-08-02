import { MaterialIcons } from '@expo/vector-icons';
import { RouteProp, useRoute } from '@react-navigation/native';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Platform, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
    ActivityIndicator,
    Avatar,
    Button,
    Card,
    Checkbox,
    Chip,
    Dialog,
    IconButton,
    Paragraph,
    Portal,
    Surface,
    TextInput,
    Title
} from 'react-native-paper';
import { useSelector } from 'react-redux';
import { apiService } from '../../services/api';
import { bookingService } from '../../services/bookingService';
import { SubscriptionPlan, subscriptionService } from '../../services/subscriptionService';
import { BackendUser, userService } from '../../services/userService';
import { RootState } from '../../store';

type ClientProfileRoute = {
  ClientProfile: {
    userId: number | string;
    userName?: string;
  };
};

type RouteParams = {
  ClientProfile: {
    userId: number | string;
    userName: string;
  };
};

interface ClientStats {
  totalSpent: number;
  totalClasses: number;
  currentPlan?: string;
  joinDate: string;
  lastActivity: string;
  attendanceRate: number;
  favoriteInstructor?: string;
  totalBookings: number;
  cancelledBookings: number;
  noShowBookings: number;
}

interface BookingHistory {
  id: number;
  class_name: string;
  instructor_name: string;
  class_date: string;
  class_time: string;
  status: string;
  booking_date: string;
  equipment_type?: string;
}

interface PaymentHistory {
  id: number;
  amount: number;
  payment_date: string;
  payment_method: string;
  status: string;
  subscription_plan_name?: string;
  transaction_id?: string;
}

interface AssignmentHistory {
  id: number;
  client_name: string;
  admin_name: string;
  admin_role: string;
  plan_name: string;
  monthly_price: number;
  classes_added: number;
  subscription_status: string;
  description: string;
  created_at: string;
}

interface SubscriptionHistory {
  id: number;
  plan_name: string;
  start_date: string;
  end_date: string;
  status: string;
  monthly_price: number;
  remaining_classes: number;
  equipment_access: string;
  assigned_by?: {
    id: number;
    name: string;
    role: string;
    assignment_date: string;
    assignment_notes: string;
  } | null;
}

// Main ClientProfile component with fallback for reception dashboard
function ClientProfile({ userId: propUserId, userName: propUserName }: { userId?: number | string; userName?: string } = {}) {
  const { token, isLoggedIn, user } = useSelector((state: RootState) => state.auth);
  
  // Try to get route params, but handle case where useRoute fails (reception dashboard)
  let routeUserId: number | string | undefined;
  let routeUserName: string | undefined;
  
  try {
    const route = useRoute<RouteProp<RouteParams, 'ClientProfile'>>();
    routeUserId = route.params?.userId;
    routeUserName = route.params?.userName;
    console.log('🔍 ClientProfile got route params:', { routeUserId, routeUserName });
    } catch (error) {
    console.log('🔍 ClientProfile: useRoute failed (probably reception dashboard), using props instead');
    routeUserId = undefined;
    routeUserName = undefined;
  }
  
  // Use props if route params are not available (reception dashboard scenario)
  const userId = propUserId || routeUserId;
  const userName = propUserName || routeUserName;
  
  console.log('🔍 ClientProfile final params:', { 
    userId, 
    userName,
    propUserId,
    propUserName,
    routeUserId,
    routeUserName,
    tokenExists: !!token, 
    isLoggedIn, 
    userExists: !!user,
    userRole: user?.role 
  });

  // Validate that we have a userId
  if (!userId) {
    console.error('❌ ClientProfile: No userId provided');
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error" size={64} color="#f44336" />
        <Title style={styles.errorTitle}>Invalid User ID</Title>
        <Paragraph style={styles.errorText}>
          No user ID was provided. Please try again.
        </Paragraph>
      </View>
    );
  }

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [client, setClient] = useState<BackendUser | null>(null);
  const [clientStats, setClientStats] = useState<ClientStats | null>(null);
  const [bookingHistory, setBookingHistory] = useState<BookingHistory[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [subscriptionHistory, setSubscriptionHistory] = useState<SubscriptionHistory[]>([]);
  const [assignmentHistory, setAssignmentHistory] = useState<AssignmentHistory[]>([]);
  const [clientNotes, setClientNotes] = useState<any[]>([]);
  const [clientDocuments, setClientDocuments] = useState<any[]>([]);
  const [clientLifecycle, setClientLifecycle] = useState<any>(null);
  const [clientActivity, setClientActivity] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'bookings' | 'payments' | 'subscriptions' | 'notes' | 'documents' | 'lifecycle' | 'activity'>('overview');

  // Use ref to persist activeTab across re-renders
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  // Modal state for web-compatible dialogs
  const [cancelDialogVisible, setCancelDialogVisible] = useState(false);
  const [pauseDialogVisible, setPauseDialogVisible] = useState(false);
  const [removeClassesDialogVisible, setRemoveClassesDialogVisible] = useState(false);
  const [resumeDialogVisible, setResumeDialogVisible] = useState(false);
  const [addClassesDialogVisible, setAddClassesDialogVisible] = useState(false);
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<number | null>(null);
  
  // Add classes state
  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlanForClasses, setSelectedPlanForClasses] = useState<number | null>(null);
  const [classesToAdd, setClassesToAdd] = useState<number>(8);
  const [classesToRemove, setClassesToRemove] = useState<number>(1);
  const [pauseDays, setPauseDays] = useState<number>(30);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);

  // Notes management state
  const [addNoteDialogVisible, setAddNoteDialogVisible] = useState(false);
  const [editNoteDialogVisible, setEditNoteDialogVisible] = useState(false);
  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [noteForm, setNoteForm] = useState({
    title: '',
    content: '',
    noteType: 'general',
    priority: 'medium',
    isPrivate: false,
    reminderAt: '', // ISO string or empty
    reminderMessage: '',
  });

  // Documents management state
  const [uploadDocumentDialogVisible, setUploadDocumentDialogVisible] = useState(false);
  const [documentForm, setDocumentForm] = useState({
    documentType: 'photo',
    description: '',
    isSensitive: false
  });

  // Lifecycle management state
  const [updateStageDialogVisible, setUpdateStageDialogVisible] = useState(false);
  const [updateRiskDialogVisible, setUpdateRiskDialogVisible] = useState(false);
  const [lifecycleForm, setLifecycleForm] = useState({
    newStage: 'prospect',
    notes: '',
    riskScore: 0
  });

  useEffect(() => {
    console.log('🔍 ClientProfile useEffect triggered, userId:', userId, 'token exists:', !!token);
    
    // Check if userId is valid before proceeding
    if (!userId || userId === undefined) {
      console.error('❌ ClientProfile: userId is undefined or invalid:', userId);
      Alert.alert('Error', 'Invalid client ID. Please try again.');
      return;
    }
    
    // Set the auth token for apiService
    if (token) {
      apiService.setToken(token);
    }
    
    // Wrap in try-catch to prevent any errors from crashing the app
    try {
      loadClientData();
      loadAvailablePlans();
    } catch (error) {
      console.error('❌ Error in ClientProfile useEffect:', error);
      setLoading(false);
    }
  }, [userId, token]);

  // Monitor activeTab changes
  useEffect(() => {
    console.log('🔍 activeTab changed to:', activeTab);
  }, [activeTab]);

  const handleTabChange = (newTab: typeof activeTab) => {
    console.log('🔍 handleTabChange called with:', newTab);
    console.log('🔍 Current activeTab before change:', activeTab);
    setActiveTab(newTab);
    console.log('🔍 activeTab set to:', newTab);
  };

  const loadClientData = async () => {
    // Check if userId is valid before making API calls
    if (!userId || userId === undefined) {
      console.error('❌ loadClientData: userId is undefined or invalid:', userId);
      Alert.alert('Error', 'Invalid client ID. Please try again.');
      return;
    }
    
    try {
      setLoading(true);
      
      // Load each section independently to prevent one failure from breaking everything
      await Promise.all([
        loadClientDetails().catch(error => console.error('Client details error:', error)),
        loadClientStats().catch(error => console.error('Client stats error:', error)),
        loadBookingHistory().catch(error => console.error('Booking history error:', error)),
        loadPaymentHistory().catch(error => console.error('Payment history error:', error)),
        loadSubscriptionHistory().catch(error => console.error('Subscription history error:', error)),
        loadAssignmentHistory().catch(error => console.error('Assignment history error:', error)),
        loadClientNotes().catch(error => console.error('Client notes error:', error)),
        loadClientDocuments().catch(error => console.error('Client documents error:', error)),
        loadClientLifecycle().catch(error => console.error('Client lifecycle error:', error)),
        loadClientActivity().catch(error => console.error('Client activity error:', error))
      ]);
    } catch (error) {
      console.error('Failed to load client data:', error);
      Alert.alert('Error', 'Failed to load client information');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadClientDetails = async () => {
    // Check if userId is valid before making API call
    if (!userId || userId === undefined) {
      console.error('❌ loadClientDetails: userId is undefined or invalid:', userId);
      return;
    }
    
    try {
      console.log('🔍 Loading client details for userId:', userId);
      console.log('🔍 Current auth token:', token ? 'Token exists' : 'No token');
      
      const response = await userService.getUser(String(userId));
      console.log('🔍 UserService response:', response);
      
      if (response.success && response.data) {
        console.log('✅ Client loaded successfully:', response.data.name);
        setClient(response.data);
      } else {
        console.error('❌ Failed to load client - response not successful:', response);
        Alert.alert('Error', response.error || 'Failed to load client details');
      }
    } catch (error) {
      console.error('❌ Failed to load client details - exception:', error);
      Alert.alert('Error', 'Network error while loading client information');
    }
  };

  const loadClientStats = async () => {
    // Check if userId is valid before making API calls
    if (!userId || userId === undefined) {
      console.error('❌ loadClientStats: userId is undefined or invalid:', userId);
      return;
    }
    
    try {
      console.log('📊 Loading client stats for user:', userId);
      
      // Get booking stats using bookingService (Supabase)
      const bookingStatsResponse = await bookingService.getBookingStatsForUser(userId);
      console.log('📊 Booking stats response:', bookingStatsResponse);
      
      if (bookingStatsResponse.success && bookingStatsResponse.data) {
        const bookingStatsData = bookingStatsResponse.data as any;
        
        const stats: ClientStats = {
          totalSpent: 0, // Will be updated from subscription stats
          totalClasses: bookingStatsData.statusBreakdown?.completed || 0,
          joinDate: client?.join_date || '',
          lastActivity: bookingStatsData.lastActivity 
            ? `${bookingStatsData.lastActivity.className} on ${formatDate(bookingStatsData.lastActivity.date)}`
            : 'No recent activity',
          attendanceRate: bookingStatsData.attendanceRate || 0,
          favoriteInstructor: bookingStatsData.favoriteInstructor,
          totalBookings: bookingStatsData.totalBookings || 0,
          cancelledBookings: bookingStatsData.statusBreakdown?.cancelled || 0,
          noShowBookings: bookingStatsData.statusBreakdown?.no_show || 0,
        };
        
        // Get subscription stats using subscriptionService (Supabase)
        console.log('💳 Loading subscription stats for user:', userId);
        const subscriptionStatsResponse = await subscriptionService.getSubscriptionStatsForUser(userId);
        console.log('💳 Subscription stats response:', subscriptionStatsResponse);
        
        if (subscriptionStatsResponse.success && subscriptionStatsResponse.data) {
          const subscriptionStatsData = subscriptionStatsResponse.data as any;
          stats.totalSpent = subscriptionStatsData.totalSpent || 0;
          stats.currentPlan = subscriptionStatsData.currentSubscription?.plan_name;
        }
        
        setClientStats(stats);
        console.log('✅ Client stats loaded successfully:', stats);
      }
    } catch (error) {
      console.error('Failed to load client stats:', error);
    }
  };

  const loadBookingHistory = async () => {
    // Check if userId is valid before making API call
    if (!userId || userId === undefined) {
      console.error('❌ loadBookingHistory: userId is undefined or invalid:', userId);
      return;
    }
    
    try {
      console.log('📅 Loading booking history for user:', userId);
      const response = await bookingService.getBookings();
      console.log('📅 Booking history response:', response);
      
      if (response.success && response.data) {
        setBookingHistory(response.data as BookingHistory[]);
        console.log('✅ Booking history loaded:', (response.data as BookingHistory[]).length, 'bookings');
      }
    } catch (error) {
      console.error('Failed to load booking history:', error);
    }
  };

  const loadPaymentHistory = async () => {
    try {
      const response = await apiService.get(`/payments?user_id=eq.${userId}&select=*&order=created_at.desc`);
      if (response.success && response.data && Array.isArray(response.data)) {
        setPaymentHistory(response.data);
        
        // Calculate total spent
        const totalSpent = response.data
          .filter((p: any) => p.status === 'completed')
          .reduce((sum: number, payment: any) => sum + payment.amount, 0);
        
        if (clientStats) {
          setClientStats({ ...clientStats, totalSpent });
        }
      }
    } catch (error) {
      console.error('Failed to load payment history:', error);
    }
  };

  const loadSubscriptionHistory = async () => {
    // Check if userId is valid before making API call
    if (!userId || userId === undefined) {
      console.error('❌ loadSubscriptionHistory: userId is undefined or invalid:', userId);
      return;
    }
    
    try {
      console.log('💳 🆕 UPDATED CODE - Loading subscription history for user:', userId, 'at', new Date().toISOString());
      const response = await apiService.get(`/user_subscriptions?user_id=eq.${userId}&select=*,subscription_plans!inner(name,equipment_access,monthly_price,monthly_classes,category,features)&order=created_at.desc`);
      console.log('💳 Subscription history response:', response);
      
      if (response.success && response.data) {
        // Process and validate the subscription data
        console.log('💳 RAW API RESPONSE:', JSON.stringify(response.data, null, 2));
        
        const processedSubscriptions = (response.data as any[]).map(subscription => {
          // Double-check subscription status based on end date
          const endDate = new Date(subscription.end_date);
          const today = new Date();
          const isExpired = endDate < today;
          
          // If the subscription should be expired but isn't marked as such, correct it locally
          const correctedStatus = isExpired && subscription.status === 'active' ? 'expired' : subscription.status;
          
          // Transform Supabase response to expected format
          const transformedSubscription = {
            ...subscription,
            plan_name: subscription.subscription_plans?.name || 'Unknown Plan',
            equipment_access: subscription.subscription_plans?.equipment_access || 'mat',
            monthly_price: subscription.subscription_plans?.monthly_price || 0,
            monthly_classes: subscription.subscription_plans?.monthly_classes || 0,
            category: subscription.subscription_plans?.category || 'group',
            features: subscription.subscription_plans?.features || [],
            status: correctedStatus
          };
          
          console.log(`💳 PROCESSING SUBSCRIPTION:`);
          console.log(`   ID: ${subscription.id}`);
          console.log(`   Plan: ${transformedSubscription.plan_name}`);
          console.log(`   Original Status: "${subscription.status}"`);
          console.log(`   End Date: ${subscription.end_date}`);
          console.log(`   Today: ${today.toISOString().split('T')[0]}`);
          console.log(`   Is Expired?: ${isExpired}`);
          console.log(`   Corrected Status: "${correctedStatus}"`);
          console.log(`   ${correctedStatus === 'active' ? '🟢 WILL SHOW AS ACTIVE' : '🔴 WILL SHOW AS EXPIRED'}`);
          console.log('');
          
          return transformedSubscription;
        });
        
        setSubscriptionHistory(processedSubscriptions);
        console.log('✅ Subscription history loaded and processed:', processedSubscriptions.length, 'subscriptions');
      }
    } catch (error) {
      console.error('Failed to load subscription history:', error);
    }
  };

  const loadAssignmentHistory = async () => {
    // Check if userId is valid before making API call
    if (!userId || userId === undefined) {
      console.error('❌ loadAssignmentHistory: userId is undefined or invalid:', userId);
      return;
    }
    
    try {
      console.log('📊 Loading assignment history for user:', userId);
      const response = await apiService.get(`/manual_credits?user_id=eq.${userId}&select=*&order=created_at.desc`);
      console.log('📊 Assignment history response:', response);
      
      if (response.success && response.data && Array.isArray(response.data)) {
        setAssignmentHistory(response.data);
        console.log('✅ Assignment history loaded:', response.data.length, 'assignments');
      }
    } catch (error) {
      console.error('Failed to load assignment history:', error);
    }
  };

  const loadClientNotes = async () => {
    // Check if userId is valid before making API call
    if (!userId || userId === undefined) {
      console.error('❌ loadClientNotes: userId is undefined or invalid:', userId);
      return;
    }
    
    try {
      console.log('📝 Loading client notes for user:', userId);
      const response = await apiService.get(`/client_notes?client_id=eq.${userId}&select=*`);
      console.log('📝 Client notes response:', response);
      
      if (response.success && response.data && Array.isArray(response.data)) {
        setClientNotes(response.data);
        console.log('✅ Client notes loaded:', response.data.length, 'notes');
      } else {
        setClientNotes([]);
      }
    } catch (error) {
      console.error('Failed to load client notes:', error);
      setClientNotes([]);
    }
  };

  const loadClientDocuments = async () => {
    // Check if userId is valid before making API call
    if (!userId || userId === undefined) {
      console.error('❌ loadClientDocuments: userId is undefined or invalid:', userId);
      return;
    }
    
    try {
      console.log('📄 Loading client documents for user:', userId);
      const response = await apiService.get(`/client_documents?client_id=eq.${userId}&select=*`);
      console.log('📄 Client documents response:', response);
      
      if (response.success && response.data && Array.isArray(response.data)) {
        setClientDocuments(response.data);
        console.log('✅ Client documents loaded:', response.data.length, 'documents');
      } else {
        setClientDocuments([]);
      }
    } catch (error) {
      console.error('Failed to load client documents:', error);
      setClientDocuments([]);
    }
  };

  const loadClientLifecycle = async () => {
    // Check if userId is valid before making API call
    if (!userId || userId === undefined) {
      console.error('❌ loadClientLifecycle: userId is undefined or invalid:', userId);
      return;
    }
    
    try {
      console.log('👥 Loading client lifecycle for user:', userId);
      const response = await apiService.get(`/client_lifecycle?client_id=eq.${userId}&select=*`);
      console.log('👥 Client lifecycle response:', response);
      
      if (response.success && response.data) {
        setClientLifecycle(response.data);
        console.log('✅ Client lifecycle loaded');
      } else {
        console.log('👥 Client lifecycle table not available - using empty data');
        setClientLifecycle(null);
      }
    } catch (error) {
      console.error('Failed to load client lifecycle (non-critical):', error);
      setClientLifecycle(null);
    }
  };

  const loadClientActivity = async () => {
    // Check if userId is valid before making API call
    if (!userId || userId === undefined) {
      console.error('❌ loadClientActivity: userId is undefined or invalid:', userId);
      return;
    }
    
    try {
      console.log('📊 Loading client activity for user:', userId);
      console.log('📊 API token exists:', !!token);
      console.log('📊 Making API call to:', `/client_activity_log?client_id=eq.${userId}`);
      
      const response = await apiService.get(`/client_activity_log?client_id=eq.${userId}&select=*&order=created_at.desc`);
      console.log('📊 Client activity response:', response);
      console.log('📊 Response success:', response.success);
      console.log('📊 Response data type:', typeof response.data);
      console.log('📊 Response data is array:', Array.isArray(response.data));
      
      if (response.success && response.data && Array.isArray(response.data)) {
        console.log('📊 Setting client activity with', response.data.length, 'activities');
        console.log('📊 First activity sample:', response.data[0]);
        setClientActivity(response.data);
        console.log('✅ Client activity loaded successfully:', response.data.length, 'activities');
        
        // Log each activity for debugging
        response.data.forEach((activity, index) => {
          console.log(`📊 Activity ${index + 1}:`, {
            id: activity.id,
            type: activity.activity_type,
            description: activity.description,
            performed_by: activity.performed_by_name,
            created_at: activity.created_at
          });
        });
      } else {
        console.log('📊 Client activity table not available - using empty data');
        setClientActivity([]);
      }
    } catch (error) {
      console.error('Failed to load client activity (non-critical):', error);
      setClientActivity([]);
    }
  };

  const loadAvailablePlans = async () => {
    try {
      console.log('📋 Loading available subscription plans');
      const plans = await subscriptionService.getSubscriptionPlans();
      setAvailablePlans(plans);
      console.log('✅ Available plans loaded:', plans.length, 'plans');
    } catch (error) {
      console.error('Failed to load available plans:', error);
      setAvailablePlans([]);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadClientData();
  };

  const formatCurrency = (amount: number) => `${amount.toFixed(0)} ALL`;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string, timeString?: string) => {
    const date = new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
    if (timeString) {
      const [hours, minutes] = timeString.split(':');
      const hour12 = parseInt(hours) > 12 ? parseInt(hours) - 12 : parseInt(hours);
      const ampm = parseInt(hours) >= 12 ? 'PM' : 'AM';
      return `${date} at ${hour12}:${minutes} ${ampm}`;
    }
    return date;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
      case 'completed':
      case 'active': return '#4caf50';
      case 'pending': return '#ff9800';
      case 'cancelled':
      case 'expired': return '#f44336';
      case 'no_show': return '#9e9e9e';
      default: return '#666';
    }
  };

  const getEquipmentIcon = (equipment: string) => {
    switch (equipment) {
      case 'reformer': return 'fitness-center';
      case 'mat': return 'self-improvement';
      case 'both': return 'fitness-center';
      default: return 'fitness-center';
    }
  };

  // Notes Management Functions
  const handleAddNote = () => {
    setNoteForm({
      title: '',
      content: '',
      noteType: 'general',
      priority: 'medium',
      isPrivate: false,
      reminderAt: '', // ISO string or empty
      reminderMessage: '',
    });
    setAddNoteDialogVisible(true);
  };

  const handleEditNote = (note: any) => {
    setSelectedNote(note);
    setNoteForm({
      title: note.title,
      content: note.content,
      noteType: note.note_type,
      priority: note.priority,
      isPrivate: note.is_private === 1,
      reminderAt: note.reminderAt || '', // ISO string or empty
      reminderMessage: note.reminderMessage || '',
    });
    setEditNoteDialogVisible(true);
  };

  const saveNote = async () => {
    try {
      if (selectedNote) {
        // Update existing note
        const response = await apiService.put(`/client_notes?id=eq.${selectedNote.id}`, {
          title: noteForm.title,
          content: noteForm.content,
          noteType: noteForm.noteType,
          priority: noteForm.priority,
          isPrivate: noteForm.isPrivate,
          reminderAt: noteForm.reminderAt || undefined,
          reminderMessage: noteForm.reminderMessage || undefined,
        });

        if (response.success) {
          console.log('✅ Note updated successfully');
          setEditNoteDialogVisible(false);
          setSelectedNote(null);
          await loadClientNotes();
        } else {
          Alert.alert('Error', response.error || 'Failed to update note');
        }
      } else {
        // Create new note
        const response = await apiService.post('/client_notes', {
          client_id: userId,
          title: noteForm.title,
          content: noteForm.content,
          noteType: noteForm.noteType,
          priority: noteForm.priority,
          isPrivate: noteForm.isPrivate,
          reminderAt: noteForm.reminderAt || undefined,
          reminderMessage: noteForm.reminderMessage || undefined,
        });

        if (response.success) {
          console.log('✅ Note created successfully');
          setAddNoteDialogVisible(false);
          await loadClientNotes();
        } else {
          Alert.alert('Error', response.error || 'Failed to create note');
        }
      }
    } catch (error) {
      console.error('Note save error:', error);
      Alert.alert('Error', 'Failed to save note');
    }
  };

  const deleteNote = async (noteId: number) => {
    try {
      Alert.alert(
        'Delete Note',
        'Are you sure you want to delete this note?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              const response = await apiService.delete(`/client_notes?id=eq.${noteId}`);
              if (response.success) {
                console.log('✅ Note deleted successfully');
                await loadClientNotes();
              } else {
                Alert.alert('Error', response.error || 'Failed to delete note');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Delete note error:', error);
      Alert.alert('Error', 'Failed to delete note');
    }
  };

  // Documents Management Functions
  const handleUploadDocument = () => {
    setDocumentForm({
      documentType: 'photo',
      description: '',
      isSensitive: false
    });
    setUploadDocumentDialogVisible(true);
  };

  const uploadDocument = async () => {
    try {
      // For now, show a placeholder message since file upload needs special handling
      Alert.alert(
        'Document Upload',
        `Document upload functionality will be available soon.\n\nSelected type: ${documentForm.documentType}\nDescription: ${documentForm.description || 'None'}\nSensitive: ${documentForm.isSensitive ? 'Yes' : 'No'}`,
        [
          {
            text: 'OK',
            onPress: () => {
              setUploadDocumentDialogVisible(false);
              // Refresh documents list
              loadClientDocuments();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Upload document error:', error);
      Alert.alert('Error', 'Failed to upload document');
    }
  };

  const deleteDocument = async (documentId: number) => {
    try {
      Alert.alert(
        'Delete Document',
        'Are you sure you want to delete this document?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              const response = await apiService.delete(`/client_documents?id=eq.${documentId}`);
              if (response.success) {
                console.log('✅ Document deleted successfully');
                await loadClientDocuments();
              } else {
                Alert.alert('Error', response.error || 'Failed to delete document');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Delete document error:', error);
      Alert.alert('Error', 'Failed to delete document');
    }
  };

  const downloadDocument = async (documentId: number, fileName: string) => {
    try {
      // Basic implementation: Alert success (replace with actual download later)
      Alert.alert('Download Started', `Downloading "${fileName}"...`);
      // In a real app, you would use a library like Expo FileSystem to download the file:
      // const fileUri = `${apiService.getBaseUrl()}/client-documents/download/${documentId}`;
      // await FileSystem.downloadAsync(fileUri, FileSystem.documentDirectory + fileName);
    } catch (error) {
      console.error('Download document error:', error);
      Alert.alert('Error', 'Failed to download document');
    }
  };

  const viewDocument = async (documentId: number, fileName: string) => {
    try {
      // Basic implementation: Alert opening (replace with actual viewer later)
      Alert.alert('Opening Document', `Viewing "${fileName}"...`);
      // In a real app, you would use a library like Expo WebBrowser to open the document:
      // const fileUri = `${apiService.getBaseUrl()}/client-documents/view/${documentId}`;
      // await WebBrowser.openBrowserAsync(fileUri);
    } catch (error) {
      console.error('View document error:', error);
      Alert.alert('Error', 'Failed to view document');
    }
  };

  // Lifecycle Management Functions
  const handleUpdateStage = () => {
    setLifecycleForm({
      newStage: clientLifecycle?.current_stage || 'prospect',
      notes: '',
      riskScore: clientLifecycle?.risk_score || 0
    });
    setUpdateStageDialogVisible(true);
  };

  const updateStage = async () => {
    try {
              const response = await apiService.put(`/client_lifecycle?client_id=eq.${userId}`, {
        newStage: lifecycleForm.newStage,
        notes: lifecycleForm.notes
      });

      if (response.success) {
        console.log('✅ Lifecycle stage updated successfully');
        setUpdateStageDialogVisible(false);
        await loadClientLifecycle();
        await loadClientActivity(); // Refresh activity to show stage change
      } else {
        Alert.alert('Error', response.error || 'Failed to update stage');
      }
    } catch (error) {
      console.error('Update stage error:', error);
      Alert.alert('Error', 'Failed to update stage');
    }
  };

  const handleCalculateRisk = () => {
    setLifecycleForm({
      ...lifecycleForm,
      riskScore: clientLifecycle?.risk_score || 0
    });
    setUpdateRiskDialogVisible(true);
  };

  const calculateRiskScore = async () => {
    try {
      // Risk calculation requires backend logic - show manual input for now
      Alert.alert(
        'Risk Calculation',
        'Automatic risk calculation requires backend processing. Please manually assess and update the risk score using the "Update Risk Score" option.',
        [{ text: 'OK' }]
      );
      setUpdateRiskDialogVisible(false);
    } catch (error) {
      console.error('Calculate risk score error:', error);
      Alert.alert('Error', 'Failed to calculate risk score');
    }
  };

  const updateRiskScore = async () => {
    try {
              const response = await apiService.put(`/client_lifecycle?client_id=eq.${userId}`, {
        riskScore: lifecycleForm.riskScore,
        notes: lifecycleForm.notes
      });

      if (response.success) {
        console.log('✅ Risk score updated successfully');
        setUpdateRiskDialogVisible(false);
        await loadClientLifecycle();
      } else {
        Alert.alert('Error', response.error || 'Failed to update risk score');
      }
    } catch (error) {
      console.error('Update risk score error:', error);
      Alert.alert('Error', 'Failed to update risk score');
    }
  };

  // Subscription Management Handlers
  const handleCancelSubscription = (subscriptionId: number) => {
    console.log('🔥 Cancel subscription clicked for ID:', subscriptionId);
    setSelectedSubscriptionId(subscriptionId);
    setCancelDialogVisible(true);
  };

  const performCancellation = async (reason: string) => {
    if (!selectedSubscriptionId) return;
    
    console.log('🔥 Performing cancellation for ID:', selectedSubscriptionId, 'Reason:', reason);
    
    try {
      const response = await subscriptionService.cancelSubscription(selectedSubscriptionId, reason);
      console.log('🔥 Cancel response:', response);
      
      setCancelDialogVisible(false);
      setSelectedSubscriptionId(null);
      
      if (response.success) {
        // Show success message if supported by platform
        if (Platform.OS !== 'web') {
          Alert.alert('Success', 'Subscription cancelled successfully');
        }
        await loadSubscriptionHistory(); // Refresh the data
        console.log('🔥 Subscription history reloaded after cancellation');
      } else {
        console.error('🔥 Cancel failed:', response.error);
        if (Platform.OS !== 'web') {
          Alert.alert('Error', response.error || 'Failed to cancel subscription');
        }
      }
    } catch (error) {
      console.error('🔥 Cancel error:', error);
      setCancelDialogVisible(false);
      setSelectedSubscriptionId(null);
      if (Platform.OS !== 'web') {
        Alert.alert('Error', 'Network error while cancelling subscription');
      }
    }
  };

  const handlePauseSubscription = (subscriptionId: number) => {
    console.log('⏸️ Pause subscription clicked for ID:', subscriptionId);
    setSelectedSubscriptionId(subscriptionId);
    setPauseDialogVisible(true);
  };

  const performPause = async () => {
    if (!selectedSubscriptionId) return;
    
    console.log('⏸️ Performing pause for ID:', selectedSubscriptionId, 'Days:', pauseDays);
    
    try {
      const response = await subscriptionService.pauseSubscription(
        selectedSubscriptionId,
        pauseDays, 
        `Paused for ${pauseDays} days by reception`
      );
      console.log('⏸️ Pause response:', response);
      
      setPauseDialogVisible(false);
      setSelectedSubscriptionId(null);
      
      if (response.success) {
        if (Platform.OS !== 'web') {
          Alert.alert('Success', `Subscription paused for ${pauseDays} days`);
        }
        await loadSubscriptionHistory();
        console.log('⏸️ Subscription history reloaded after pause');
      } else {
        console.error('⏸️ Pause failed:', response.error);
        if (Platform.OS !== 'web') {
          Alert.alert('Error', response.error || 'Failed to pause subscription');
        }
      }
    } catch (error) {
      console.error('⏸️ Pause error:', error);
      setPauseDialogVisible(false);
      setSelectedSubscriptionId(null);
      if (Platform.OS !== 'web') {
        Alert.alert('Error', 'Network error while pausing subscription');
      }
    }
  };

  const handleRemoveClasses = (subscriptionId: number) => {
    console.log('➖ Remove classes clicked for ID:', subscriptionId);
    setSelectedSubscriptionId(subscriptionId);
    setRemoveClassesDialogVisible(true);
  };

  const performRemoveClasses = async () => {
    if (!selectedSubscriptionId) return;
    
    console.log('➖ Performing remove classes for ID:', selectedSubscriptionId, 'Classes:', classesToRemove);
    
    try {
      const response = await subscriptionService.removeClassesFromSubscription(
        selectedSubscriptionId,
        classesToRemove,
        `Removed ${classesToRemove} classes by reception`
      );
      console.log('➖ Remove classes response:', response);
      
      setRemoveClassesDialogVisible(false);
      setSelectedSubscriptionId(null);
      
      if (response.success) {
        const data = response.data;
        const message = `Successfully removed ${data.classesRemoved} classes for $${data.amountRefunded.toFixed(2)} refund (${data.pricePerClass}/class from ${data.pricingPlan})`;
        
        if (Platform.OS !== 'web') {
          Alert.alert('Success', message);
        }
        await loadSubscriptionHistory();
        await loadClientStats(); // Refresh stats to show updated spending
        console.log('➖ Data reloaded after removing classes');
      } else {
        console.error('➖ Remove classes failed:', response.error);
        if (Platform.OS !== 'web') {
          Alert.alert('Error', response.error || 'Failed to remove classes');
        }
      }
    } catch (error) {
      console.error('➖ Remove classes error:', error);
      setRemoveClassesDialogVisible(false);
      setSelectedSubscriptionId(null);
      if (Platform.OS !== 'web') {
        Alert.alert('Error', 'Network error while removing classes');
      }
    }
  };

  const handleResumeSubscription = (subscriptionId: number) => {
    console.log('▶️ Resume subscription clicked for ID:', subscriptionId);
    setSelectedSubscriptionId(subscriptionId);
    setResumeDialogVisible(true);
  };

  const performResume = async () => {
    if (!selectedSubscriptionId) return;
    
    console.log('▶️ Performing resume for ID:', selectedSubscriptionId);
    
    try {
      const response = await subscriptionService.resumeSubscription(
        selectedSubscriptionId, 
        'Resumed by reception'
      );
      console.log('▶️ Resume response:', response);
      
      setResumeDialogVisible(false);
      setSelectedSubscriptionId(null);
      
      if (response.success) {
        if (Platform.OS !== 'web') {
          Alert.alert('Success', 'Subscription resumed successfully');
        }
        await loadSubscriptionHistory();
        console.log('▶️ Subscription history reloaded after resume');
      } else {
        console.error('▶️ Resume failed:', response.error);
        if (Platform.OS !== 'web') {
          Alert.alert('Error', response.error || 'Failed to resume subscription');
        }
      }
    } catch (error) {
      console.error('▶️ Resume error:', error);
      setResumeDialogVisible(false);
      setSelectedSubscriptionId(null);
      if (Platform.OS !== 'web') {
        Alert.alert('Error', 'Network error while resuming subscription');
      }
    }
  };

  const handleAddClasses = (subscriptionId: number) => {
    console.log('➕ Add classes clicked for ID:', subscriptionId);
    setSelectedSubscriptionId(subscriptionId);
    setClassesToAdd(8); // Default to 8 classes
    setSelectedPlanForClasses(null);
    setPaymentAmount(0);
    setAddClassesDialogVisible(true);
  };

  const performAddClasses = async () => {
    if (!selectedSubscriptionId) return;
    
    console.log('➕ Performing add classes for ID:', selectedSubscriptionId, 'Classes:', classesToAdd);
    
    try {
      // Use the first available plan for pricing if no plan is selected
      const planForPricing = availablePlans.length > 0 ? availablePlans[0] : null;
      
      if (!planForPricing) {
        if (Platform.OS !== 'web') {
          Alert.alert('Error', 'No pricing plans available');
        }
        return;
      }

      const response = await subscriptionService.addClassesToSubscription(
        selectedSubscriptionId,
        classesToAdd,
        planForPricing.id
      );
      console.log('➕ Add classes response:', response);
      
      setAddClassesDialogVisible(false);
      setSelectedSubscriptionId(null);
      
      if (response.success) {
        const data = response.data;
        const message = `Successfully added ${data.classesAdded} classes for $${data.amountCharged.toFixed(2)} (${data.pricePerClass}/class from ${data.pricingPlan})`;
        
        if (Platform.OS !== 'web') {
          Alert.alert('Success', message);
        }
        await loadSubscriptionHistory();
        await loadClientStats(); // Refresh stats to show updated spending
        console.log('➕ Data reloaded after adding classes');
      } else {
        console.error('➕ Add classes failed:', response.error);
        if (Platform.OS !== 'web') {
          Alert.alert('Error', response.error || 'Failed to add classes');
        }
      }
    } catch (error) {
      console.error('➕ Add classes error:', error);
      setAddClassesDialogVisible(false);
      setSelectedSubscriptionId(null);
      if (Platform.OS !== 'web') {
        Alert.alert('Error', 'Network error while adding classes');
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Title style={styles.loadingText}>Loading client profile...</Title>
      </View>
    );
  }

  if (!client) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error" size={64} color="#f44336" />
        <Title style={styles.errorTitle}>Client Not Found</Title>
        <Paragraph style={styles.errorText}>
          Unable to load client information.
        </Paragraph>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
      {/* Client Header */}
      <Surface style={styles.header}>
        <View style={styles.clientInfo}>
          <Avatar.Text 
            size={80} 
            label={client.name.charAt(0)} 
            style={styles.avatar}
          />
          <View style={styles.clientDetails}>
            <Title style={styles.clientName}>{client.name}</Title>
            <Paragraph style={styles.clientEmail}>{client.email}</Paragraph>
            <Paragraph style={styles.clientPhone}>{client.phone}</Paragraph>
            <Chip 
              style={[styles.statusChip, { backgroundColor: getStatusColor(client.status) }]}
              textStyle={styles.chipText}
            >
              {client.status.toUpperCase()}
            </Chip>
          </View>
        </View>
        
        <View style={styles.quickActions}>
          <IconButton
            icon="email"
            mode="outlined"
            onPress={() => Alert.alert('Feature', 'Send email to client')}
          />
          <IconButton
            icon="phone"
            mode="outlined"
            onPress={() => Alert.alert('Feature', 'Call client')}
          />
          <IconButton
            icon="pencil"
            mode="outlined"
            onPress={() => Alert.alert('Feature', 'Edit client details')}
          />
        </View>
      </Surface>

      {/* Enhanced Stats Overview */}
      {clientStats && (
        <Card style={styles.statsCard}>
          <Card.Content>
            <Title>Client Analytics</Title>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Title style={styles.statNumber}>{formatCurrency(clientStats.totalSpent)}</Title>
                <Paragraph style={styles.statLabel}>Total Revenue</Paragraph>
              </View>
              <View style={styles.statItem}>
                <Title style={styles.statNumber}>{clientStats.totalBookings}</Title>
                <Paragraph style={styles.statLabel}>Total Bookings</Paragraph>
              </View>
              <View style={styles.statItem}>
                <Title style={styles.statNumber}>{clientStats.attendanceRate}%</Title>
                <Paragraph style={styles.statLabel}>Attendance Rate</Paragraph>
              </View>
              <View style={styles.statItem}>
                <Title style={styles.statNumber}>{clientStats.totalClasses}</Title>
                <Paragraph style={styles.statLabel}>Classes Completed</Paragraph>
              </View>
            </View>
            
            {/* Additional insights */}
            <View style={styles.insightsContainer}>
              {clientStats.favoriteInstructor && (
                <View style={styles.insightItem}>
                  <MaterialIcons name="favorite" size={16} color="#e91e63" />
                  <Paragraph style={styles.insightText}>
                    Favorite instructor: {clientStats.favoriteInstructor}
                  </Paragraph>
                </View>
              )}
              {clientStats.currentPlan && (
                <View style={styles.insightItem}>
                  <MaterialIcons name="star" size={16} color="#2196f3" />
                  <Paragraph style={styles.insightText}>
                    Current plan: {clientStats.currentPlan}
                  </Paragraph>
                </View>
              )}
              {clientStats.lastActivity && (
                <View style={styles.insightItem}>
                  <MaterialIcons name="access-time" size={16} color="#ff9800" />
                  <Paragraph style={styles.insightText}>
                    Last activity: {clientStats.lastActivity}
                  </Paragraph>
                </View>
              )}
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {[
          { key: 'overview', label: 'Overview', icon: 'view-dashboard' },
          { key: 'bookings', label: 'Bookings', icon: 'calendar' },
          { key: 'payments', label: 'Payments', icon: 'credit-card' },
          { key: 'subscriptions', label: 'Plans', icon: 'card-account-details' },
          { key: 'notes', label: 'Notes', icon: 'note-text' },
          { key: 'documents', label: 'Documents', icon: 'file-document' },
          { key: 'lifecycle', label: 'Lifecycle', icon: 'account-supervisor' },
          { key: 'activity', label: 'Activity', icon: 'timeline' }
        ].map((tab) => (
          <Button
            key={tab.key}
            mode={activeTab === tab.key ? 'contained' : 'outlined'}
            onPress={() => handleTabChange(tab.key as typeof activeTab)}
            style={styles.tabButton}
            icon={tab.icon}
            compact
          >
            {tab.label}
          </Button>
        ))}
      </View>

      {/* Debug current tab */}
      <View style={{ padding: 10, backgroundColor: '#f0f0f0', margin: 10 }}>
        <Text>🔍 Current activeTab: {activeTab}</Text>
        <Text>🔍 activeTabRef.current: {activeTabRef.current}</Text>
      </View>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <View style={styles.tabContent}>
          {/* Account Information */}
          <Card style={styles.infoCard}>
            <Card.Content>
              <Title>Account Information</Title>
              <View style={styles.infoRow}>
                <Paragraph style={styles.infoLabel}>Join Date:</Paragraph>
                <Paragraph style={styles.infoValue}>
                  {formatDate(client.join_date ?? 'N/A')}
                </Paragraph>
              </View>
              <View style={styles.infoRow}>
                <Paragraph style={styles.infoLabel}>Status:</Paragraph>
                <Paragraph style={styles.infoValue}>{client.status}</Paragraph>
              </View>
              {client.emergency_contact && (
                <View style={styles.infoRow}>
                  <Paragraph style={styles.infoLabel}>Emergency Contact:</Paragraph>
                  <Paragraph style={styles.infoValue}>{client.emergency_contact}</Paragraph>
                </View>
              )}
              {client.medical_conditions && (
                <View style={styles.infoRow}>
                  <Paragraph style={styles.infoLabel}>Medical Conditions:</Paragraph>
                  <Paragraph style={styles.infoValue}>{client.medical_conditions}</Paragraph>
                </View>
              )}
            </Card.Content>
          </Card>

          {/* Current Subscription */}
          {client.currentSubscription && (
            <Card style={styles.infoCard}>
              <Card.Content>
                <Title>Current Subscription</Title>
                <View style={styles.subscriptionInfo}>
                  <View style={styles.subscriptionHeader}>
                    <Title style={styles.planName}>{client.currentSubscription.plan_name}</Title>
                    <Chip 
                      style={styles.activeChip}
                      textStyle={styles.chipText}
                    >
                      ACTIVE
                    </Chip>
                  </View>
                  <Paragraph style={styles.planPrice}>
                    {formatCurrency(client.currentSubscription.monthly_price)}/month
                  </Paragraph>
                  <Paragraph style={styles.planClasses}>
                    {client.currentSubscription.remaining_classes} classes remaining
                  </Paragraph>
                  <Paragraph style={styles.planEquipment}>
                    Equipment: {client.currentSubscription.equipment_access}
                  </Paragraph>
                </View>
              </Card.Content>
            </Card>
          )}
        </View>
      )}

      {activeTab === 'bookings' && (
        <View style={styles.tabContent}>
          <Title style={styles.sectionTitle}>Booking History</Title>
          {bookingHistory.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Card.Content>
                <MaterialIcons name="event-busy" size={48} color="#ccc" style={styles.emptyIcon} />
                <Title style={styles.emptyTitle}>No Booking History</Title>
                <Paragraph style={styles.emptyText}>
                  This client hasn&apos;t made any bookings yet.
                </Paragraph>
              </Card.Content>
            </Card>
          ) : (
            bookingHistory.map((booking) => (
              <Card key={`booking-${booking.id}`} style={styles.historyCard}>
                <Card.Content>
                  <View style={styles.bookingHeader}>
                    <View style={styles.bookingInfo}>
                      <Title style={styles.className}>{booking.class_name}</Title>
                      <Paragraph style={styles.instructorName}>{booking.instructor_name}</Paragraph>
                      <Paragraph style={styles.classDateTime}>
                        {formatDateTime(booking.class_date, booking.class_time)}
                      </Paragraph>
                    </View>
                    <View style={styles.bookingStatus}>
                      <Chip 
                        style={[styles.statusChip, { backgroundColor: getStatusColor(booking.status) }]}
                        textStyle={styles.chipText}
                      >
                        {booking.status.toUpperCase()}
                      </Chip>
                      {booking.equipment_type && (
                        <MaterialIcons 
                          name={getEquipmentIcon(booking.equipment_type)} 
                          size={20} 
                          color="#666" 
                          style={styles.equipmentIcon}
                        />
                      )}
                    </View>
                  </View>
                  <Paragraph style={styles.bookingDate}>
                    Booked: {formatDate(booking.booking_date)}
                  </Paragraph>
                </Card.Content>
              </Card>
            ))
          )}
        </View>
      )}

      {activeTab === 'payments' && (
        <View style={styles.tabContent}>
          <Title style={styles.sectionTitle}>Payment & Assignment History</Title>
          
          {/* Assignment History Section */}
          {assignmentHistory.length > 0 && (
            <>
              <Card style={styles.summaryCard}>
                <Card.Content>
                  <Title>Assignment Summary</Title>
                  <View style={styles.summaryStats}>
                    <View style={styles.summaryItem}>
                      <Title style={styles.summaryNumber}>
                        {assignmentHistory.length}
                      </Title>
                      <Paragraph style={styles.summaryLabel}>Total Assignments</Paragraph>
                    </View>
                    <View style={styles.summaryItem}>
                      <Title style={styles.summaryNumber}>
                        {assignmentHistory.reduce((sum, assignment) => sum + assignment.classes_added, 0)}
                      </Title>
                      <Paragraph style={styles.summaryLabel}>Classes Assigned</Paragraph>
                    </View>
                    <View style={styles.summaryItem}>
                      <Title style={styles.summaryNumber}>
                        {formatCurrency(assignmentHistory.reduce((sum, assignment) => sum + assignment.monthly_price, 0))}
                      </Title>
                      <Paragraph style={styles.summaryLabel}>Total Plan Value</Paragraph>
                    </View>
                  </View>
                </Card.Content>
              </Card>

              <Title style={styles.subsectionTitle}>📝 Subscription Assignments</Title>
              {assignmentHistory.map((assignment) => (
                <Card key={`assignment-${assignment.id}`} style={styles.historyCard}>
                  <Card.Content>
                    <View style={styles.assignmentCard}>
                      <View style={styles.assignmentInfo}>
                        <View style={styles.assignmentHeader}>
                          <MaterialIcons name="card-giftcard" size={20} color="#4caf50" />
                          <Title style={styles.assignmentPlanName}>{assignment.plan_name}</Title>
                        </View>
                        <Paragraph style={styles.assignmentDetails}>
                          {assignment.classes_added} classes • {formatCurrency(assignment.monthly_price)}/month
                        </Paragraph>
                        <Paragraph style={styles.assignmentDescription}>
                          {assignment.description}
                        </Paragraph>
                        <View style={styles.assignmentMeta}>
                          <Paragraph style={styles.assignmentBy}>
                            Assigned by {assignment.admin_name} ({assignment.admin_role})
                          </Paragraph>
                          <Paragraph style={styles.assignmentDate}>
                            {formatDate(assignment.created_at)}
                          </Paragraph>
                        </View>
                      </View>
                      <Chip 
                        style={[styles.statusChip, { backgroundColor: getStatusColor(assignment.subscription_status) }]}
                        textStyle={styles.chipText}
                      >
                        {assignment.subscription_status?.toUpperCase() || 'ASSIGNED'}
                      </Chip>
                    </View>
                  </Card.Content>
                </Card>
              ))}
            </>
          )}

          {/* Payment History Section */}
          {paymentHistory.length > 0 && (
            <>
              <Title style={styles.subsectionTitle}>💳 Payment History</Title>
              
              {/* Payment Summary */}
              <Card style={styles.summaryCard}>
                <Card.Content>
                  <Title>Payment Summary</Title>
                  <View style={styles.summaryStats}>
                    <View style={styles.summaryItem}>
                      <Title style={styles.summaryNumber}>
                        {formatCurrency(paymentHistory.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0))}
                      </Title>
                      <Paragraph style={styles.summaryLabel}>Total Paid</Paragraph>
                    </View>
                    <View style={styles.summaryItem}>
                      <Title style={styles.summaryNumber}>
                        {paymentHistory.filter(p => p.status === 'completed').length}
                      </Title>
                      <Paragraph style={styles.summaryLabel}>Successful Payments</Paragraph>
                    </View>
                    <View style={styles.summaryItem}>
                      <Title style={styles.summaryNumber}>
                        {formatCurrency(paymentHistory.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0) / Math.max(paymentHistory.filter(p => p.status === 'completed').length, 1))}
                      </Title>
                      <Paragraph style={styles.summaryLabel}>Average Payment</Paragraph>
                    </View>
                  </View>
                </Card.Content>
              </Card>

              {/* Payment List */}
              {paymentHistory.map((payment) => (
                <Card key={`payment-${payment.id}`} style={styles.historyCard}>
                  <Card.Content>
                    <View style={styles.paymentHeader}>
                      <View style={styles.paymentInfo}>
                        <Title style={styles.paymentAmount}>{formatCurrency(payment.amount)}</Title>
                        <Paragraph style={styles.paymentPlan}>
                          {payment.subscription_plan_name || 'Subscription Payment'}
                        </Paragraph>
                        <Paragraph style={styles.paymentDate}>
                          {formatDate(payment.payment_date)}
                        </Paragraph>
                        <Paragraph style={styles.paymentMethod}>
                          {payment.payment_method.charAt(0).toUpperCase() + payment.payment_method.slice(1)}
                        </Paragraph>
                      </View>
                      <Chip 
                        style={[styles.statusChip, { backgroundColor: getStatusColor(payment.status) }]}
                        textStyle={styles.chipText}
                      >
                        {payment.status.toUpperCase()}
                      </Chip>
                    </View>
                    {payment.transaction_id && (
                      <Paragraph style={styles.transactionId}>
                        Transaction ID: {payment.transaction_id}
                      </Paragraph>
                    )}
                  </Card.Content>
                </Card>
              ))}
            </>
          )}

          {/* Empty State */}
          {paymentHistory.length === 0 && assignmentHistory.length === 0 && (
            <Card style={styles.emptyCard}>
              <Card.Content>
                <MaterialIcons name="history" size={48} color="#ccc" style={styles.emptyIcon} />
                <Title style={styles.emptyTitle}>No Payment or Assignment History</Title>
                <Paragraph style={styles.emptyText}>
                  This client hasn&apos;t made any payments or received any subscription assignments yet.
                </Paragraph>
              </Card.Content>
            </Card>
          )}
        </View>
      )}

      {activeTab === 'subscriptions' && (
        <View style={styles.tabContent}>
          <Title style={styles.sectionTitle}>Subscription Management</Title>
          <Paragraph style={{color: '#4caf50', fontSize: 12, marginBottom: 8}}>
            ✅ Enhanced Status Validation Active - Past plans will show as EXPIRED
          </Paragraph>
          {subscriptionHistory.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Card.Content>
                <MaterialIcons name="card-membership" size={48} color="#ccc" style={styles.emptyIcon} />
                <Title style={styles.emptyTitle}>No Subscription History</Title>
                <Paragraph style={styles.emptyText}>
                  This client hasn&apos;t purchased any subscription plans yet.
                </Paragraph>
              </Card.Content>
            </Card>
          ) : (
            subscriptionHistory.map((subscription) => (
              <Card key={`subscription-${subscription.id}`} style={styles.historyCard}>
                <Card.Content>
                  <View style={styles.subscriptionHeader}>
                    <View style={styles.subscriptionInfo}>
                      <Title style={styles.planName}>{subscription.plan_name}</Title>
                      <Paragraph style={styles.planPrice}>
                        {formatCurrency(subscription.monthly_price)}/month
                      </Paragraph>
                      <Paragraph style={styles.planPeriod}>
                        {formatDate(subscription.start_date)} - {formatDate(subscription.end_date)}
                      </Paragraph>
                      <Paragraph style={styles.planEquipment}>
                        Equipment: {subscription.equipment_access}
                      </Paragraph>
                      
                      {/* Assignment Information */}
                      {subscription.assigned_by && (
                        <View style={styles.subscriptionAssignmentInfo}>
                          <View style={styles.assignmentHeader}>
                            <MaterialIcons name="person-add" size={16} color="#4caf50" />
                            <Paragraph style={styles.assignmentBy}>
                              Assigned by {subscription.assigned_by.name} ({subscription.assigned_by.role})
                            </Paragraph>
                          </View>
                          <Paragraph style={styles.assignmentDate}>
                            {formatDate(subscription.assigned_by.assignment_date)}
                          </Paragraph>
                          {subscription.assigned_by.assignment_notes && (
                            <Paragraph style={styles.assignmentDescription}>
                              {subscription.assigned_by.assignment_notes}
                            </Paragraph>
                          )}
                        </View>
                      )}
                    </View>
                    <View style={styles.subscriptionStatus}>
                      <Chip 
                        style={[styles.statusChip, { backgroundColor: getStatusColor(subscription.status) }]}
                        textStyle={styles.chipText}
                      >
                        {subscription.status.toUpperCase()}
                      </Chip>
                      {subscription.status === 'active' && (
                        <Paragraph style={styles.remainingClasses}>
                          {subscription.remaining_classes} classes left
                        </Paragraph>
                      )}
                    </View>
                  </View>

                  {/* Subscription Management Controls */}
                  {(subscription.status === 'active' || subscription.status === 'paused') && (
                    <View style={styles.subscriptionActions}>
                      <Title style={styles.actionsTitle}>Manage Subscription</Title>
                      <View style={styles.actionButtons}>
                        {subscription.status === 'active' && (
                          <>
                            <Button 
                              mode="outlined" 
                              icon="plus" 
                              onPress={() => handleAddClasses(subscription.id)}
                              style={[styles.actionButton, { borderColor: '#4caf50' }]}
                              labelStyle={styles.actionButtonText}
                            >
                              Add Classes
                            </Button>
                            <Button 
                              mode="outlined" 
                              icon="pause" 
                              onPress={() => handlePauseSubscription(subscription.id)}
                              style={[styles.actionButton, styles.pauseButton]}
                              labelStyle={styles.actionButtonText}
                            >
                              Pause
                            </Button>
                            <Button 
                              mode="outlined" 
                              icon="minus" 
                              onPress={() => handleRemoveClasses(subscription.id)}
                              style={[styles.actionButton, styles.removeButton]}
                              labelStyle={styles.actionButtonText}
                            >
                              Remove Classes
                            </Button>
                          </>
                        )}
                        
                        {subscription.status === 'paused' && (
                          <Button 
                            mode="outlined" 
                            icon="play" 
                            onPress={() => handleResumeSubscription(subscription.id)}
                            style={[styles.actionButton, styles.resumeButton]}
                            labelStyle={styles.actionButtonText}
                          >
                            Resume
                          </Button>
                        )}
                        
                        <Button 
                          mode="outlined" 
                          icon="cancel" 
                          onPress={() => handleCancelSubscription(subscription.id)}
                          style={[styles.actionButton, styles.cancelButton]}
                          labelStyle={styles.actionButtonText}
                        >
                          Cancel
                        </Button>
                      </View>
                    </View>
                  )}
                </Card.Content>
              </Card>
            ))
          )}
        </View>
      )}

      {activeTab === 'notes' && (
        <View style={styles.tabContent}>
          <View style={styles.sectionHeader}>
            <Title style={styles.sectionTitle}>Client Notes</Title>
            <Button 
              mode="contained" 
              icon="plus"
              onPress={handleAddNote}
              style={styles.addButton}
            >
              Add Note
            </Button>
          </View>
          
          {clientNotes.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Card.Content>
                <MaterialIcons name="note" size={48} color="#ccc" style={styles.emptyIcon} />
                <Title style={styles.emptyTitle}>No Notes Found</Title>
                <Paragraph style={styles.emptyText}>
                  No notes have been added for this client yet.
                </Paragraph>
              </Card.Content>
            </Card>
          ) : (
            clientNotes.map((note: any) => (
              <Card key={`note-${note.id}`} style={styles.historyCard}>
                <Card.Content>
                  <View style={styles.noteHeader}>
                    <View style={styles.noteInfo}>
                      <View style={styles.noteTitleRow}>
                        <Title style={styles.noteTitle}>{note.title}</Title>
                        {note.is_private === 1 && (
                          <MaterialIcons name="lock" size={16} color="#666" style={styles.privateIcon} />
                        )}
                      </View>
                      <Paragraph style={styles.noteType}>{note.note_type?.toUpperCase()}</Paragraph>
                    </View>
                    <View style={styles.noteMeta}>
                      <View style={styles.noteActions}>
                        <IconButton
                          icon="edit"
                          size={16}
                          onPress={() => handleEditNote(note)}
                        />
                        <IconButton
                          icon="delete"
                          size={16}
                          iconColor="#f44336"
                          onPress={() => deleteNote(note.id)}
                        />
                      </View>
                      <Chip 
                        style={[styles.priorityChip, { backgroundColor: note.priority === 'high' ? '#f44336' : note.priority === 'medium' ? '#ff9800' : note.priority === 'urgent' ? '#9c27b0' : '#4caf50' }]}
                        textStyle={styles.chipText}
                      >
                        {note.priority?.toUpperCase()}
                      </Chip>
                    </View>
                  </View>
                  <Paragraph style={styles.noteContent}>{note.content}</Paragraph>
                  
                  {/* Reminder Status */}
                  {note.reminder_at && (
                    <View style={styles.reminderContainer}>
                      <MaterialIcons name="notifications" size={16} color="#FF9800" />
                      <Text style={styles.reminderText}>
                        Reminder: {new Date(note.reminder_at).toLocaleString()}
                        {note.reminder_message && ` - ${note.reminder_message}`}
                      </Text>
                    </View>
                  )}
                  
                  <View style={styles.noteFooter}>
                    <Paragraph style={styles.noteAuthor}>By {note.admin_name}</Paragraph>
                    <Paragraph style={styles.noteDate}>{formatDate(note.created_at)}</Paragraph>
                  </View>
                </Card.Content>
              </Card>
            ))
          )}
        </View>
      )}

      {activeTab === 'documents' && (
        <View style={styles.tabContent}>
          <View style={styles.sectionHeader}>
            <Title style={styles.sectionTitle}>Client Documents</Title>
            <Button 
              mode="contained" 
              icon="upload"
              onPress={handleUploadDocument}
              style={styles.addButton}
            >
              Upload
            </Button>
          </View>
          
          {clientDocuments.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Card.Content>
                <MaterialIcons name="description" size={48} color="#ccc" style={styles.emptyIcon} />
                <Title style={styles.emptyTitle}>No Documents Found</Title>
                <Paragraph style={styles.emptyText}>
                  No documents have been uploaded for this client yet.
                </Paragraph>
              </Card.Content>
            </Card>
          ) : (
            clientDocuments.map((document: any) => (
              <Card key={`document-${document.id}`} style={styles.historyCard}>
                <Card.Content>
                  <View style={styles.documentHeader}>
                    <View style={styles.documentInfo}>
                      <MaterialIcons name="description" size={24} color="#2196f3" />
                      <View style={styles.documentDetails}>
                        <Title style={styles.documentName}>{document.original_name}</Title>
                        <Paragraph style={styles.documentType}>{document.document_type?.toUpperCase()}</Paragraph>
                        <Paragraph style={styles.documentSize}>
                          {(document.file_size / 1024).toFixed(1)} KB
                        </Paragraph>
                      </View>
                    </View>
                    <View style={styles.documentActions}>
                      <IconButton
                        icon="download"
                        onPress={() => downloadDocument(document.id, document.original_name)}
                      />
                      <IconButton
                        icon="visibility"
                        onPress={() => viewDocument(document.id, document.original_name)}
                      />
                      <IconButton
                        icon="delete"
                        iconColor="#f44336"
                        onPress={() => deleteDocument(document.id)}
                      />
                    </View>
                  </View>
                  {document.description && (
                    <Paragraph style={styles.documentDescription}>{document.description}</Paragraph>
                  )}
                  <View style={styles.documentFooter}>
                    <Paragraph style={styles.documentUploader}>Uploaded by {document.uploaded_by_name}</Paragraph>
                    <Paragraph style={styles.documentDate}>{formatDate(document.created_at)}</Paragraph>
                  </View>
                </Card.Content>
              </Card>
            ))
          )}
        </View>
      )}

      {activeTab === 'lifecycle' && (
        <View style={styles.tabContent}>
          <Title style={styles.sectionTitle}>Client Lifecycle Management</Title>
          
          {clientLifecycle ? (
            <Card style={styles.lifecycleCard}>
              <Card.Content>
                <View style={styles.lifecycleHeader}>
                  <Title>Current Stage</Title>
                  <Chip 
                    style={[styles.stageChip, { backgroundColor: '#2196f3' }]}
                    textStyle={styles.chipText}
                  >
                    {clientLifecycle.current_stage?.toUpperCase()}
                  </Chip>
                </View>
                
                {clientLifecycle.risk_score !== null && (
                  <View style={styles.riskScoreSection}>
                    <Paragraph style={styles.riskLabel}>Risk Score</Paragraph>
                    <View style={styles.riskScoreBar}>
                      <View 
                        style={[
                          styles.riskScoreFill, 
                          { 
                            width: `${clientLifecycle.risk_score}%`,
                            backgroundColor: clientLifecycle.risk_score >= 70 ? '#f44336' : clientLifecycle.risk_score >= 40 ? '#ff9800' : '#4caf50'
                          }
                        ]} 
                      />
                    </View>
                    <Paragraph style={styles.riskScore}>{clientLifecycle.risk_score}%</Paragraph>
                  </View>
                )}
                
                {clientLifecycle.notes && (
                  <View style={styles.lifecycleNotes}>
                    <Paragraph style={styles.notesLabel}>Notes</Paragraph>
                    <Paragraph style={styles.notesText}>{clientLifecycle.notes}</Paragraph>
                  </View>
                )}
                
                <View style={styles.lifecycleActions}>
                  <Button 
                    mode="outlined"
                    icon="update"
                    onPress={handleUpdateStage}
                  >
                    Update Stage
                  </Button>
                  <Button 
                    mode="outlined"
                    icon="calculate"
                    onPress={handleCalculateRisk}
                  >
                    Calculate Risk
                  </Button>
                </View>
              </Card.Content>
            </Card>
          ) : (
            <Card style={styles.emptyCard}>
              <Card.Content>
                <MaterialIcons name="group" size={48} color="#ccc" style={styles.emptyIcon} />
                <Title style={styles.emptyTitle}>No Lifecycle Data</Title>
                <Paragraph style={styles.emptyText}>
                  No lifecycle information has been recorded for this client yet.
                </Paragraph>
              </Card.Content>
            </Card>
          )}
        </View>
      )}

      {activeTab === 'activity' && (
        <View style={styles.tabContent}>
          <View style={styles.sectionHeader}>
            <Title style={styles.sectionTitle}>Activity Timeline</Title>
            <View style={styles.activityHeaderRight}>
              <Text style={styles.activityCount}>
                {clientActivity.length} activities loaded
              </Text>
              <Button 
                mode="outlined" 
                icon="refresh"
                onPress={() => {
                  console.log('🔄 Refreshing activity timeline...');
                  console.log('🔄 Current activity count:', clientActivity.length);
                  console.log('🔄 Current activity array:', clientActivity);
                  loadClientActivity();
                }}
                style={styles.refreshButton}
              >
                Refresh
              </Button>
            </View>
          </View>
          
          {(() => {
            console.log('🎨 Rendering activity tab with activity count:', clientActivity.length);
            console.log('🎨 Activity data:', clientActivity);
            console.log('🎨 Is array?', Array.isArray(clientActivity));
            console.log('🎨 Array length check:', clientActivity.length === 0);
            
            if (!clientActivity || clientActivity.length === 0) {
              console.log('🎨 Showing empty state');
              return (
                <Card style={styles.emptyCard}>
                  <Card.Content>
                    <MaterialIcons name="timeline" size={48} color="#ccc" style={styles.emptyIcon} />
                    <Title style={styles.emptyTitle}>No Activity Found</Title>
                    <Paragraph style={styles.emptyText}>
                      No activity has been recorded for this client yet. Activity will appear here when the client:
                    </Paragraph>
                    <View style={styles.activitySuggestions}>
                      <Paragraph style={styles.suggestionText}>• Makes bookings or cancellations</Paragraph>
                      <Paragraph style={styles.suggestionText}>• Receives subscription changes</Paragraph>
                      <Paragraph style={styles.suggestionText}>• Has notes or documents added</Paragraph>
                      <Paragraph style={styles.suggestionText}>• Updates their profile or payment info</Paragraph>
                    </View>
                  </Card.Content>
                </Card>
              );
            }
            
            console.log('🎨 Showing activity data');
            return (
              <>
                <Card style={styles.activitySummaryCard}>
                  <Card.Content>
                    <Title>Activity Summary</Title>
                    <View style={styles.summaryStats}>
                      <View style={styles.summaryItem}>
                        <Title style={styles.summaryNumber}>{clientActivity.length}</Title>
                        <Paragraph style={styles.summaryLabel}>Total Activities</Paragraph>
                      </View>
                      <View style={styles.summaryItem}>
                        <Title style={styles.summaryNumber}>
                          {clientActivity.filter(a => a.created_at >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()).length}
                        </Title>
                        <Paragraph style={styles.summaryLabel}>Last 30 Days</Paragraph>
                      </View>
                      <View style={styles.summaryItem}>
                        <Title style={styles.summaryNumber}>
                          {clientActivity.filter(a => a.performed_by_name).length}
                        </Title>
                        <Paragraph style={styles.summaryLabel}>Staff Actions</Paragraph>
                      </View>
                    </View>
                  </Card.Content>
                </Card>

                <Title style={styles.subsectionTitle}>📊 Recent Activity</Title>
                {clientActivity.map((activity: any) => (
                  <Card key={`activity-${activity.id}`} style={styles.activityCard}>
                    <Card.Content>
                      <View style={styles.activityHeader}>
                        <MaterialIcons 
                          name={
                            activity.activity_type === 'note_added' ? 'note' : 
                            activity.activity_type === 'document_uploaded' ? 'upload' :
                            activity.activity_type === 'status_change' ? 'update' :
                            activity.activity_type === 'subscription_purchase' ? 'payment' :
                            activity.activity_type === 'subscription_renewal' ? 'autorenew' :
                            activity.activity_type === 'subscription_cancellation' ? 'cancel' :
                            activity.activity_type === 'subscription_extended' ? 'add' :
                            activity.activity_type === 'subscription_paused' ? 'pause' :
                            activity.activity_type === 'subscription_resumed' ? 'play-arrow' :
                            activity.activity_type === 'class_booking' ? 'event' :
                            activity.activity_type === 'class_cancellation' ? 'event-busy' :
                            activity.activity_type === 'class_attendance' ? 'check-circle' :
                            activity.activity_type === 'class_no_show' ? 'highlight-off' :
                            activity.activity_type === 'payment_made' ? 'payment' :
                            activity.activity_type === 'payment_failed' ? 'error' :
                            activity.activity_type === 'profile_update' ? 'person' :
                            activity.activity_type === 'waitlist_joined' ? 'queue' :
                            activity.activity_type === 'waitlist_promoted' ? 'trending-up' :
                            activity.activity_type === 'registration' ? 'person-add' :
                            activity.activity_type === 'login' ? 'login' :
                            activity.activity_type === 'classes_added' ? 'add-circle' :
                            activity.activity_type === 'classes_removed' ? 'remove-circle' :
                            'event'
                          } 
                          size={24} 
                          color={
                            activity.activity_type?.includes('cancellation') || activity.activity_type?.includes('failed') || activity.activity_type?.includes('removed') ? '#f44336' :
                            activity.activity_type?.includes('purchase') || activity.activity_type?.includes('payment') || activity.activity_type?.includes('added') ? '#4caf50' :
                            activity.activity_type?.includes('booking') || activity.activity_type?.includes('attendance') ? '#2196f3' :
                            activity.activity_type?.includes('extended') || activity.activity_type?.includes('renewed') ? '#ff9800' :
                            '#666'
                          }
                          style={styles.activityIcon}
                        />
                        <View style={styles.activityInfo}>
                          <View style={styles.activityTypeContainer}>
                            <Paragraph style={styles.activityType}>
                              {activity.activity_type?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                            </Paragraph>
                            {activity.performed_by_name && (
                              <Chip 
                                style={styles.performedByChip}
                                textStyle={styles.performedByText}
                                mode="outlined"
                                compact
                              >
                                {activity.performed_by_name}
                              </Chip>
                            )}
                          </View>
                          <Paragraph style={styles.activityDescription}>{activity.description}</Paragraph>
                          {activity.metadata && (
                            <View style={styles.activityMetadata}>
                              <MaterialIcons name="info" size={14} color="#666" />
                              <Paragraph style={styles.metadataText}>
                                {typeof activity.metadata === 'string' ? activity.metadata : JSON.stringify(activity.metadata)}
                              </Paragraph>
                            </View>
                          )}
                        </View>
                        <View style={styles.activityDateContainer}>
                          <Paragraph style={styles.activityDate}>{formatDate(activity.created_at)}</Paragraph>
                          <Paragraph style={styles.activityTime}>
                            {new Date(activity.created_at).toLocaleTimeString('en-US', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </Paragraph>
                        </View>
                      </View>
                    </Card.Content>
                  </Card>
                ))}
              </>
            );
          })()}
        </View>
      )}
      </ScrollView>

      {/* Web-compatible Modal Dialogs */}
      <Portal>
      {/* Cancel Subscription Dialog */}
      <Dialog 
        visible={cancelDialogVisible} 
        onDismiss={() => {
          setCancelDialogVisible(false);
          setSelectedSubscriptionId(null);
        }}
      >
        <Dialog.Title>Cancel Subscription</Dialog.Title>
        <Dialog.Content>
          <Paragraph>Are you sure you want to cancel this subscription?</Paragraph>
          <Paragraph style={{ marginTop: 10, fontStyle: 'italic' }}>
            Please select a reason for cancellation:
          </Paragraph>
        </Dialog.Content>
        <Dialog.Actions>
          <Button 
            onPress={() => {
              setCancelDialogVisible(false);
              setSelectedSubscriptionId(null);
            }}
          >
            Back
          </Button>
          <Button 
            onPress={() => performCancellation('Cancelled by reception')}
          >
            Skip
          </Button>
          <Button 
            onPress={() => performCancellation('Customer request')}
          >
            Customer Request
          </Button>
          <Button 
            onPress={() => performCancellation('Administrative cancellation')}
          >
            Administrative
          </Button>
          <Button 
            onPress={() => performCancellation('Other reason - see notes')}
          >
            Other
          </Button>
        </Dialog.Actions>
      </Dialog>

      {/* Pause Subscription Dialog */}
      <Dialog 
        visible={pauseDialogVisible} 
        onDismiss={() => {
          setPauseDialogVisible(false);
          setSelectedSubscriptionId(null);
        }}
      >
        <Dialog.Title>Pause Subscription</Dialog.Title>
        <Dialog.Content>
          <Paragraph>How many days would you like to pause this subscription?</Paragraph>
          <TextInput
            label="Number of days to pause"
            value={pauseDays.toString()}
            onChangeText={(text) => setPauseDays(parseInt(text) || 30)}
            keyboardType="numeric"
            style={{ marginTop: 16 }}
          />
        </Dialog.Content>
        <Dialog.Actions>
          <Button 
            onPress={() => {
              setPauseDialogVisible(false);
              setSelectedSubscriptionId(null);
            }}
          >
            Cancel
          </Button>
          <Button onPress={() => performPause()}>Pause Subscription</Button>
        </Dialog.Actions>
      </Dialog>

      {/* Remove Classes Dialog */}
      <Dialog 
        visible={removeClassesDialogVisible} 
        onDismiss={() => {
          setRemoveClassesDialogVisible(false);
          setSelectedSubscriptionId(null);
        }}
      >
        <Dialog.Title>Remove Classes from Subscription</Dialog.Title>
        <Dialog.Content>
          <Paragraph>How many classes would you like to remove?</Paragraph>
          <TextInput
            label="Number of classes to remove"
            value={classesToRemove.toString()}
            onChangeText={(text) => setClassesToRemove(parseInt(text) || 1)}
            keyboardType="numeric"
            style={{ marginTop: 16 }}
          />
        </Dialog.Content>
        <Dialog.Actions>
          <Button 
            onPress={() => {
              setRemoveClassesDialogVisible(false);
              setSelectedSubscriptionId(null);
            }}
          >
            Cancel
          </Button>
          <Button onPress={() => performRemoveClasses()}>Remove Classes</Button>
        </Dialog.Actions>
      </Dialog>

      {/* Resume Subscription Dialog */}
      <Dialog 
        visible={resumeDialogVisible} 
        onDismiss={() => {
          setResumeDialogVisible(false);
          setSelectedSubscriptionId(null);
        }}
      >
        <Dialog.Title>Resume Subscription</Dialog.Title>
        <Dialog.Content>
          <Paragraph>Are you sure you want to resume this subscription?</Paragraph>
        </Dialog.Content>
        <Dialog.Actions>
          <Button 
            onPress={() => {
              setResumeDialogVisible(false);
              setSelectedSubscriptionId(null);
            }}
          >
            Cancel
          </Button>
          <Button onPress={performResume}>Resume</Button>
        </Dialog.Actions>
      </Dialog>

      {/* Add Classes Dialog */}
      <Dialog 
        visible={addClassesDialogVisible} 
        onDismiss={() => {
          setAddClassesDialogVisible(false);
          setSelectedSubscriptionId(null);
        }}
      >
        <Dialog.Title>Add Classes to Subscription</Dialog.Title>
        <Dialog.Content>
          <Paragraph>How many classes would you like to add?</Paragraph>
          <TextInput
            label="Number of classes to add"
            value={classesToAdd.toString()}
            onChangeText={(text) => {
              const num = parseInt(text) || 8;
              setClassesToAdd(num);
            }}
            keyboardType="numeric"
            style={{ marginTop: 16 }}
          />
        </Dialog.Content>
        <Dialog.Actions>
          <Button 
            onPress={() => {
              setAddClassesDialogVisible(false);
              setSelectedSubscriptionId(null);
            }}
          >
            Cancel
          </Button>
          <Button 
            onPress={performAddClasses}
            disabled={classesToAdd <= 0}
          >
            Add Classes
          </Button>
        </Dialog.Actions>
      </Dialog>

      {/* Add Note Dialog */}
      <Dialog 
        visible={addNoteDialogVisible} 
        onDismiss={() => {
          setAddNoteDialogVisible(false);
          setNoteForm({
            title: '',
            content: '',
            noteType: 'general',
            priority: 'medium',
            isPrivate: false,
            reminderAt: '', // ISO string or empty
            reminderMessage: '',
          });
        }}
      >
        <Dialog.Title>Add New Note</Dialog.Title>
        <Dialog.Content>
          <View style={{ gap: 16 }}>
            <View>
              <Paragraph style={{ marginBottom: 8, fontWeight: 'bold' }}>Title:</Paragraph>
              <TextInput
                value={noteForm.title}
                onChangeText={(text: string) => setNoteForm(prev => ({ ...prev, title: text }))}
                placeholder="Enter note title"
                mode="outlined"
              />
            </View>
            
            <View>
              <Paragraph style={{ marginBottom: 8, fontWeight: 'bold' }}>Type:</Paragraph>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {['general', 'medical', 'billing', 'behavior', 'retention', 'complaint', 'compliment'].map((type) => (
                  <Button
                    key={type}
                    mode={noteForm.noteType === type ? 'contained' : 'outlined'}
                    onPress={() => setNoteForm(prev => ({ ...prev, noteType: type }))}
                    style={{ flex: 1, minWidth: 80 }}
                    compact
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Button>
                ))}
              </View>
            </View>
            
            <View>
              <Paragraph style={{ marginBottom: 8, fontWeight: 'bold' }}>Priority:</Paragraph>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {['low', 'medium', 'high', 'urgent'].map((priority) => (
                  <Button
                    key={priority}
                    mode={noteForm.priority === priority ? 'contained' : 'outlined'}
                    onPress={() => setNoteForm(prev => ({ ...prev, priority }))}
                    style={{ flex: 1 }}
                    compact
                  >
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </Button>
                ))}
              </View>
            </View>
            
            <View>
              <Paragraph style={{ marginBottom: 8, fontWeight: 'bold' }}>Content:</Paragraph>
              <TextInput
                value={noteForm.content}
                onChangeText={(text: string) => setNoteForm(prev => ({ ...prev, content: text }))}
                placeholder="Enter note content"
                mode="outlined"
                multiline
                numberOfLines={4}
              />
            </View>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Checkbox
                status={noteForm.isPrivate ? 'checked' : 'unchecked'}
                onPress={() => setNoteForm(prev => ({ ...prev, isPrivate: !prev.isPrivate }))}
              />
              <Paragraph>Private note (only visible to admins)</Paragraph>
            </View>
            <View>
              <Paragraph style={{ marginBottom: 8, fontWeight: 'bold' }}>Reminder (optional):</Paragraph>
              <TextInput
                value={noteForm.reminderAt}
                onChangeText={(text: string) => setNoteForm(prev => ({ ...prev, reminderAt: text }))}
                placeholder="YYYY-MM-DD HH:mm"
                mode="outlined"
                right={
                  <TextInput.Icon 
                    icon="event" 
                    onPress={() => {
                      // Simple date/time picker - set to tomorrow at 9 AM
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      tomorrow.setHours(9, 0, 0, 0);
                      setNoteForm(prev => ({ 
                        ...prev, 
                        reminderAt: tomorrow.toISOString().slice(0, 16).replace('T', ' ')
                      }));
                    }} 
                  />
                }
              />
              <TextInput
                value={noteForm.reminderMessage}
                onChangeText={(text: string) => setNoteForm(prev => ({ ...prev, reminderMessage: text }))}
                placeholder="Reminder message (optional)"
                mode="outlined"
                style={{ marginTop: 8 }}
              />
            </View>
          </View>
        </Dialog.Content>
        <Dialog.Actions>
          <Button 
            onPress={() => {
              setAddNoteDialogVisible(false);
              setNoteForm({
                title: '',
                content: '',
                noteType: 'general',
                priority: 'medium',
                isPrivate: false,
                reminderAt: '', // ISO string or empty
                reminderMessage: '',
              });
            }}
          >
            Cancel
          </Button>
          <Button 
            onPress={saveNote}
            disabled={!noteForm.title.trim() || !noteForm.content.trim()}
          >
            Save Note
          </Button>
        </Dialog.Actions>
      </Dialog>

      {/* Edit Note Dialog */}
      <Dialog 
        visible={editNoteDialogVisible} 
        onDismiss={() => {
          setEditNoteDialogVisible(false);
          setSelectedNote(null);
        }}
      >
        <Dialog.Title>Edit Note</Dialog.Title>
        <Dialog.Content>
          <View style={{ gap: 16 }}>
            <View>
              <Paragraph style={{ marginBottom: 8, fontWeight: 'bold' }}>Title:</Paragraph>
              <TextInput
                value={noteForm.title}
                onChangeText={(text: string) => setNoteForm(prev => ({ ...prev, title: text }))}
                placeholder="Enter note title"
                mode="outlined"
              />
            </View>
            
            <View>
              <Paragraph style={{ marginBottom: 8, fontWeight: 'bold' }}>Type:</Paragraph>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {['general', 'medical', 'billing', 'behavior', 'retention', 'complaint', 'compliment'].map((type) => (
                  <Button
                    key={type}
                    mode={noteForm.noteType === type ? 'contained' : 'outlined'}
                    onPress={() => setNoteForm(prev => ({ ...prev, noteType: type }))}
                    style={{ flex: 1, minWidth: 80 }}
                    compact
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Button>
                ))}
              </View>
            </View>
            
            <View>
              <Paragraph style={{ marginBottom: 8, fontWeight: 'bold' }}>Priority:</Paragraph>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {['low', 'medium', 'high', 'urgent'].map((priority) => (
                  <Button
                    key={priority}
                    mode={noteForm.priority === priority ? 'contained' : 'outlined'}
                    onPress={() => setNoteForm(prev => ({ ...prev, priority }))}
                    style={{ flex: 1 }}
                    compact
                  >
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </Button>
                ))}
              </View>
            </View>
            
            <View>
              <Paragraph style={{ marginBottom: 8, fontWeight: 'bold' }}>Content:</Paragraph>
              <TextInput
                value={noteForm.content}
                onChangeText={(text: string) => setNoteForm(prev => ({ ...prev, content: text }))}
                placeholder="Enter note content"
                mode="outlined"
                multiline
                numberOfLines={4}
              />
            </View>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Checkbox
                status={noteForm.isPrivate ? 'checked' : 'unchecked'}
                onPress={() => setNoteForm(prev => ({ ...prev, isPrivate: !prev.isPrivate }))}
              />
              <Paragraph>Private note (only visible to admins)</Paragraph>
            </View>
            <View>
              <Paragraph style={{ marginBottom: 8, fontWeight: 'bold' }}>Reminder (optional):</Paragraph>
              <TextInput
                value={noteForm.reminderAt}
                onChangeText={(text: string) => setNoteForm(prev => ({ ...prev, reminderAt: text }))}
                placeholder="YYYY-MM-DD HH:mm"
                mode="outlined"
                right={
                  <TextInput.Icon 
                    icon="event" 
                    onPress={() => {
                      // Simple date/time picker - set to tomorrow at 9 AM
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      tomorrow.setHours(9, 0, 0, 0);
                      setNoteForm(prev => ({ 
                        ...prev, 
                        reminderAt: tomorrow.toISOString().slice(0, 16).replace('T', ' ')
                      }));
                    }} 
                  />
                }
              />
              <TextInput
                value={noteForm.reminderMessage}
                onChangeText={(text: string) => setNoteForm(prev => ({ ...prev, reminderMessage: text }))}
                placeholder="Reminder message (optional)"
                mode="outlined"
                style={{ marginTop: 8 }}
              />
            </View>
          </View>
        </Dialog.Content>
        <Dialog.Actions>
          <Button 
            onPress={() => {
              setEditNoteDialogVisible(false);
              setSelectedNote(null);
            }}
          >
            Cancel
          </Button>
          <Button 
            onPress={saveNote}
            disabled={!noteForm.title.trim() || !noteForm.content.trim()}
          >
            Update Note
          </Button>
        </Dialog.Actions>
      </Dialog>

      {/* Upload Document Dialog */}
      <Dialog 
        visible={uploadDocumentDialogVisible} 
        onDismiss={() => {
          setUploadDocumentDialogVisible(false);
          setDocumentForm({
            documentType: 'photo',
            description: '',
            isSensitive: false
          });
        }}
      >
        <Dialog.Title>Upload Document</Dialog.Title>
        <Dialog.Content>
          <View style={{ gap: 16 }}>
            <View>
              <Paragraph style={{ marginBottom: 8, fontWeight: 'bold' }}>Document Type:</Paragraph>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {['photo', 'contract', 'medical_form', 'id_copy', 'waiver', 'receipt', 'other'].map((type) => (
                  <Button
                    key={type}
                    mode={documentForm.documentType === type ? 'contained' : 'outlined'}
                    onPress={() => setDocumentForm(prev => ({ ...prev, documentType: type }))}
                    style={{ flex: 1, minWidth: 80 }}
                    compact
                  >
                    {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Button>
                ))}
              </View>
            </View>
            
            <View>
              <Paragraph style={{ marginBottom: 8, fontWeight: 'bold' }}>Description (Optional):</Paragraph>
              <TextInput
                value={documentForm.description}
                onChangeText={(text: string) => setDocumentForm(prev => ({ ...prev, description: text }))}
                placeholder="Enter document description"
                mode="outlined"
                multiline
                numberOfLines={3}
              />
            </View>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Checkbox
                status={documentForm.isSensitive ? 'checked' : 'unchecked'}
                onPress={() => setDocumentForm(prev => ({ ...prev, isSensitive: !prev.isSensitive }))}
              />
              <Paragraph>Sensitive document (restricted access)</Paragraph>
            </View>

            <View style={{ backgroundColor: '#f5f5f5', padding: 12, borderRadius: 8 }}>
              <Paragraph style={{ fontSize: 12, color: '#666', fontStyle: 'italic' }}>
                Note: File selection and upload functionality will be fully implemented in the next update. 
                This dialog currently demonstrates the document metadata collection interface.
              </Paragraph>
            </View>
          </View>
        </Dialog.Content>
        <Dialog.Actions>
          <Button 
            onPress={() => {
              setUploadDocumentDialogVisible(false);
              setDocumentForm({
                documentType: 'photo',
                description: '',
                isSensitive: false
              });
            }}
          >
            Cancel
          </Button>
          <Button 
            onPress={uploadDocument}
          >
            Upload
          </Button>
        </Dialog.Actions>
      </Dialog>

      {/* Update Stage Dialog */}
      <Dialog 
        visible={updateStageDialogVisible} 
        onDismiss={() => {
          setUpdateStageDialogVisible(false);
        }}
      >
        <Dialog.Title>Update Lifecycle Stage</Dialog.Title>
        <Dialog.Content>
          <View style={{ gap: 16 }}>
            <View>
              <Paragraph style={{ marginBottom: 8, fontWeight: 'bold' }}>
                Current Stage: {clientLifecycle?.current_stage?.toUpperCase() || 'NONE'}
              </Paragraph>
            </View>
            
            <View>
              <Paragraph style={{ marginBottom: 8, fontWeight: 'bold' }}>New Stage:</Paragraph>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {['prospect', 'trial', 'new_member', 'active', 'at_risk', 'inactive', 'churned', 'won_back'].map((stage) => (
                  <Button
                    key={stage}
                    mode={lifecycleForm.newStage === stage ? 'contained' : 'outlined'}
                    onPress={() => setLifecycleForm(prev => ({ ...prev, newStage: stage }))}
                    style={{ flex: 1, minWidth: 80 }}
                    compact
                  >
                    {stage.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Button>
                ))}
              </View>
            </View>
            
            <View>
              <Paragraph style={{ marginBottom: 8, fontWeight: 'bold' }}>Notes (Optional):</Paragraph>
              <TextInput
                value={lifecycleForm.notes}
                onChangeText={(text: string) => setLifecycleForm(prev => ({ ...prev, notes: text }))}
                placeholder="Enter notes about this stage change"
                mode="outlined"
                multiline
                numberOfLines={3}
              />
            </View>
          </View>
        </Dialog.Content>
        <Dialog.Actions>
          <Button 
            onPress={() => setUpdateStageDialogVisible(false)}
          >
            Cancel
          </Button>
          <Button 
            onPress={updateStage}
            disabled={lifecycleForm.newStage === clientLifecycle?.current_stage}
          >
            Update Stage
          </Button>
        </Dialog.Actions>
      </Dialog>

      {/* Calculate/Update Risk Dialog */}
      <Dialog 
        visible={updateRiskDialogVisible} 
        onDismiss={() => {
          setUpdateRiskDialogVisible(false);
        }}
      >
        <Dialog.Title>Risk Score Management</Dialog.Title>
        <Dialog.Content>
          <View style={{ gap: 16 }}>
            <View>
              <Paragraph style={{ marginBottom: 8, fontWeight: 'bold' }}>
                Current Risk Score: {clientLifecycle?.risk_score ?? 'Not calculated'}%
              </Paragraph>
            </View>
            
            <View style={styles.riskActionButtons}>
              <Button 
                mode="contained"
                icon="calculate"
                onPress={calculateRiskScore}
                style={{ flex: 1 }}
              >
                Auto Calculate
              </Button>
              <Paragraph style={{ textAlign: 'center', color: '#666', marginHorizontal: 16 }}>OR</Paragraph>
              <Button 
                mode="outlined"
                icon="edit"
                onPress={() => {
                  // Switch to manual mode (can be enhanced further)
                }}
                style={{ flex: 1 }}
              >
                Manual Update
              </Button>
            </View>
            
            <View>
              <Paragraph style={{ marginBottom: 8, fontWeight: 'bold' }}>Manual Risk Score (0-100):</Paragraph>
              <TextInput
                value={lifecycleForm.riskScore.toString()}
                onChangeText={(text: string) => {
                  const score = parseInt(text) || 0;
                  setLifecycleForm(prev => ({ ...prev, riskScore: Math.min(100, Math.max(0, score)) }));
                }}
                placeholder="Enter risk score (0-100)"
                mode="outlined"
                keyboardType="numeric"
              />
            </View>
            
            <View>
              <Paragraph style={{ marginBottom: 8, fontWeight: 'bold' }}>Notes (Optional):</Paragraph>
              <TextInput
                value={lifecycleForm.notes}
                onChangeText={(text: string) => setLifecycleForm(prev => ({ ...prev, notes: text }))}
                placeholder="Enter notes about this risk assessment"
                mode="outlined"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={{ backgroundColor: '#f0f8ff', padding: 12, borderRadius: 8 }}>
              <Paragraph style={{ fontSize: 12, color: '#666' }}>
                <MaterialIcons name="info" size={16} /> Auto Calculate uses booking patterns, subscription status, and activity levels to determine risk.
              </Paragraph>
            </View>
          </View>
        </Dialog.Content>
        <Dialog.Actions>
          <Button 
            onPress={() => setUpdateRiskDialogVisible(false)}
          >
            Cancel
          </Button>
          <Button 
            onPress={updateRiskScore}
          >
            Update Manual Score
          </Button>
        </Dialog.Actions>
      </Dialog>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorTitle: {
    marginTop: 16,
    marginBottom: 8,
    color: '#f44336',
  },
  errorText: {
    textAlign: 'center',
    color: '#666',
  },
  header: {
    padding: 20,
    margin: 16,
    elevation: 2,
    borderRadius: 8,
  },
  clientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    marginRight: 16,
  },
  clientDetails: {
    flex: 1,
  },
  clientName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  clientEmail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 2,
  },
  clientPhone: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statsCard: {
    margin: 16,
    marginTop: 0,
    elevation: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  statItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 16,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196f3',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 0,
    gap: 12,
  },
  tabButton: {
    flex: 1,
    minWidth: 80,
  },
  tabContent: {
    padding: 16,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  infoCard: {
    marginBottom: 16,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontWeight: 'bold',
    color: '#666',
  },
  infoValue: {
    flex: 1,
    textAlign: 'right',
    color: '#333',
  },
  subscriptionInfo: {
    marginTop: 8,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  planPrice: {
    fontSize: 16,
    color: '#2196f3',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  planClasses: {
    color: '#666',
    marginBottom: 2,
  },
  planEquipment: {
    color: '#666',
    textTransform: 'capitalize',
  },
  planPeriod: {
    color: '#666',
    marginBottom: 4,
  },
  historyCard: {
    marginBottom: 12,
    elevation: 1,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bookingInfo: {
    flex: 1,
  },
  bookingStatus: {
    alignItems: 'flex-end',
  },
  className: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  instructorName: {
    color: '#666',
    marginBottom: 2,
  },
  classDateTime: {
    color: '#666',
    fontSize: 14,
  },
  bookingDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  equipmentIcon: {
    marginTop: 4,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  paymentInfo: {
    flex: 1,
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4caf50',
    marginBottom: 4,
  },
  paymentPlan: {
    color: '#666',
    marginBottom: 2,
  },
  paymentDate: {
    color: '#666',
    fontSize: 14,
    marginBottom: 2,
  },
  paymentMethod: {
    color: '#999',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  transactionId: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    fontFamily: 'monospace',
  },
  summaryCard: {
    marginBottom: 16,
    elevation: 2,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4caf50',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  subscriptionStatus: {
    alignItems: 'flex-end',
  },
  remainingClasses: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  emptyCard: {
    elevation: 1,
    alignItems: 'center',
    padding: 20,
  },
  emptyIcon: {
    marginBottom: 16,
    alignSelf: 'center',
  },
  emptyTitle: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
  },
  statusChip: {
    elevation: 0,
  },
  activeChip: {
    backgroundColor: '#4caf50',
  },
  chipText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  insightsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  insightText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  assignmentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  assignmentInfo: {
    flex: 1,
  },
  assignmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  assignmentPlanName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4caf50',
  },
  assignmentDetails: {
    color: '#666',
    marginBottom: 2,
  },
  assignmentDescription: {
    color: '#999',
    marginBottom: 8,
    fontSize: 12,
    fontStyle: 'italic',
  },
  assignmentMeta: {
    flexDirection: 'column',
    gap: 2,
  },
  assignmentBy: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  assignmentDate: {
    fontSize: 12,
    color: '#999',
  },
  subsectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    marginTop: 8,
  },
  subscriptionAssignmentInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  // Subscription Management Styles
  subscriptionActions: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  actionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    minWidth: 80,
    marginBottom: 8,
  },
  pauseButton: {
    borderColor: '#ff9800',
  },
  resumeButton: {
    borderColor: '#4caf50',
  },
  removeButton: {
    borderColor: '#ff5722',
  },
  cancelButton: {
    borderColor: '#f44336',
  },
  actionButtonText: {
    fontSize: 12,
  },
  // Document Management Styles
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addButton: {
    minWidth: 100,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  noteInfo: {
    flex: 1,
  },
  noteMeta: {
    alignItems: 'flex-end',
  },
  noteActions: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  noteTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  privateIcon: {
    marginLeft: 4,
  },
  noteType: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
  },
  priorityChip: {
    elevation: 0,
  },
  noteContent: {
    color: '#333',
    marginBottom: 8,
  },
  noteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noteAuthor: {
    fontSize: 12,
    color: '#666',
  },
  noteDate: {
    fontSize: 12,
    color: '#999',
  },
  documentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  documentInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  documentDetails: {
    flex: 1,
  },
  documentActions: {
    flexDirection: 'row',
  },
  documentName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  documentType: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  documentSize: {
    fontSize: 12,
    color: '#999',
  },
  documentDescription: {
    color: '#333',
    marginBottom: 8,
  },
  documentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  documentUploader: {
    fontSize: 12,
    color: '#666',
  },
  documentDate: {
    fontSize: 12,
    color: '#999',
  },
  // Lifecycle Management Styles
  lifecycleCard: {
    elevation: 2,
  },
  lifecycleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  stageChip: {
    elevation: 0,
  },
  riskScoreSection: {
    marginBottom: 16,
  },
  riskLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  riskScoreBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 4,
  },
  riskScoreFill: {
    height: '100%',
    borderRadius: 4,
  },
  riskScore: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
  lifecycleNotes: {
    marginBottom: 16,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  notesText: {
    color: '#666',
  },
  lifecycleActions: {
    flexDirection: 'row',
    gap: 12,
  },
  riskActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  // Activity Timeline Styles
  refreshButton: {
    minWidth: 100,
  },
  activityHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activityCount: {
    fontSize: 12,
    color: '#666',
    fontWeight: 'bold',
  },
  activitySuggestions: {
    marginTop: 12,
    paddingLeft: 16,
  },
  suggestionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  activitySummaryCard: {
    marginBottom: 16,
    elevation: 2,
  },
  activityCard: {
    marginBottom: 8,
    elevation: 1,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  activityIcon: {
    marginTop: 2,
  },
  activityInfo: {
    flex: 1,
  },
  activityTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  activityType: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2196f3',
  },
  performedByChip: {
    backgroundColor: '#f0f0f0',
  },
  performedByText: {
    fontSize: 10,
    color: '#666',
  },
  activityDescription: {
    color: '#333',
    marginBottom: 4,
  },
  activityMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  metadataText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  activityDateContainer: {
    alignItems: 'flex-end',
  },
  activityDate: {
    fontSize: 12,
    color: '#999',
  },
  activityTime: {
    fontSize: 10,
    color: '#ccc',
  },
  reminderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  reminderText: {
    fontSize: 12,
    color: '#FF9800',
  },
});

export default ClientProfile; 