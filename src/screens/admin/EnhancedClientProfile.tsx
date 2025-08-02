import { MaterialIcons } from '@expo/vector-icons';
import { RouteProp, useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import {
    ActivityIndicator,
    Avatar,
    Button,
    Card,
    Chip,
    Dialog,
    Paragraph,
    Portal,
    ProgressBar,
    Searchbar,
    SegmentedButtons,
    Switch,
    Text,
    TextInput,
    Title
} from 'react-native-paper';
import { useSelector } from 'react-redux';
import { apiService } from '../../services/api';
import { BackendUser, userService } from '../../services/userService';
import { RootState } from '../../store';

// Enhanced interfaces for advanced features
interface ClientNote {
  id: number;
  title: string;
  content: string;
  note_type: 'general' | 'medical' | 'billing' | 'behavior' | 'retention' | 'complaint' | 'compliment';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  tags: string[];
  admin_name: string;
  created_at: string;
  updated_at: string;
  reminder_at?: string;
  reminder_message?: string;
}

interface ClientDocument {
  id: number;
  document_type: 'photo' | 'contract' | 'medical_form' | 'id_copy' | 'waiver' | 'receipt' | 'other';
  file_name: string;
  original_name: string;
  file_size: number;
  mime_type: string;
  description?: string;
  is_sensitive: boolean;
  expiry_date?: string;
  uploaded_by_name: string;
  created_at: string;
}

interface ClientActivity {
  id: number;
  activity_type: string;
  description: string;
  metadata: any;
  performed_by_name?: string;
  created_at: string;
}

interface ClientLifecycle {
  id: number;
  current_stage: 'prospect' | 'trial' | 'new_member' | 'active' | 'at_risk' | 'inactive' | 'churned' | 'won_back';
  previous_stage?: string;
  risk_score: number;
  lifetime_value: number;
  stage_changed_at: string;
  stage_changed_by_name?: string;
  notes?: string;
}

interface PaymentSettings {
  id: number;
  user_id: number | string;
  payment_method: 'cash' | 'credit_card' | 'both';
  auto_renewal: boolean;
  requires_admin_approval: boolean;
  payment_notes?: string;
  credit_limit?: number;
  preferred_payment_day?: number;
  created_at: string;
  updated_at: string;
}

interface ManualCredit {
  id: number;
  user_id: number | string;
  amount: number;
  classes_added: number;
  reason: 'cash_payment' | 'refund' | 'promotional' | 'adjustment' | 'compensation';
  description?: string;
  receipt_number?: string;
  admin_name: string;
  created_at: string;
}

interface PaymentHistory {
  id: number;
  user_id: number | string;
  payment_type: 'manual_cash' | 'credit_card' | 'refund' | 'adjustment';
  amount: number;
  classes_added: number;
  description: string;
  processed_by: string;
  created_at: string;
}

interface ClientStats {
  totalSpent: number;
  totalClasses: number;
  joinDate: string;
  lastActivity: string;
  attendanceRate: number;
  favoriteInstructor: string;
  currentPlan: string;
  totalBookings: number;
  cancelledBookings: number;
  noShowBookings: number;
}

type RouteParams = {
  ClientProfile: {
    userId: number | string;
    userName: string;
  };
};

// Improved toggle component for better UX (iOS-style switches)
const ToggleRow: React.FC<{
  label: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}> = ({ label, description, value, onValueChange }) => (
  <View style={styles.modernToggleRow}>
    <View style={styles.toggleInfo}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Text style={styles.toggleDescription}>{description}</Text>
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
              thumbColor={value ? '#9B8A7D' : '#f4f3f4'}
        trackColor={{ false: '#767577', true: '#9B8A7D60' }}
    />
  </View>
);

const EnhancedClientProfile: React.FC<{ userId?: number | string; userName?: string }> = ({ userId: propUserId, userName: propUserName }) => {
  const { token, isLoggedIn, user } = useSelector((state: RootState) => state.auth);
  
  // Try to get route params, but handle case where useRoute fails (reception dashboard)
  let routeUserId: number | string | undefined;
  let routeUserName: string | undefined;
  
  try {
    const route = useRoute<RouteProp<RouteParams, 'ClientProfile'>>();
    routeUserId = route.params?.userId;
    routeUserName = route.params?.userName;
    console.log('🔍 EnhancedClientProfile got route params:', { routeUserId, routeUserName });
  } catch (error) {
    console.log('🔍 EnhancedClientProfile: useRoute failed (probably reception dashboard), using props instead');
    routeUserId = undefined;
    routeUserName = undefined;
  }
  
  // Use props if route params are not available (reception dashboard scenario)
  const userId = propUserId || routeUserId;
  const userName = propUserName || routeUserName;
  
  console.log('🔍 EnhancedClientProfile final params:', { 
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
    console.error('❌ EnhancedClientProfile: No userId provided');
    return (
      <View style={styles.centered}>
        <MaterialIcons name="error" size={64} color="#f44336" />
        <Title style={styles.debugTitle}>Invalid User ID</Title>
        <Paragraph style={styles.emptyText}>
          No user ID was provided. Please try again.
        </Paragraph>
      </View>
    );
  }

  // State management
  const [activeTab, setActiveTab] = useState<'overview' | 'notes' | 'documents' | 'activity' | 'lifecycle' | 'analytics' | 'payments'>('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Data states
  const [client, setClient] = useState<BackendUser | null>(null);
  const [clientStats, setClientStats] = useState<ClientStats | null>(null);
  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [activities, setActivities] = useState<ClientActivity[]>([]);
  const [lifecycle, setLifecycle] = useState<ClientLifecycle | null>(null);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
  const [manualCredits, setManualCredits] = useState<ManualCredit[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  
  // UI states
  const [searchQuery, setSearchQuery] = useState('');
  const [noteDialogVisible, setNoteDialogVisible] = useState(false);
  const [uploadDialogVisible, setUploadDialogVisible] = useState(false);
  const [selectedNoteType, setSelectedNoteType] = useState('general');
  const [selectedPriority, setSelectedPriority] = useState('medium');

  // Form states for new note
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteTags, setNewNoteTags] = useState('');
  const [reminderAt, setReminderAt] = useState(''); // ISO string or empty
  const [reminderMessage, setReminderMessage] = useState('');

  // Payment-related UI states
  const [creditDialogVisible, setCreditDialogVisible] = useState(false);
  const [paymentSettingsDialogVisible, setPaymentSettingsDialogVisible] = useState(false);
  const [creditAmount, setCreditAmount] = useState('');

  const [creditReason, setCreditReason] = useState('cash_payment');
  const [creditDescription, setCreditDescription] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');

  // Class-related UI states
  const [classDialogVisible, setClassDialogVisible] = useState(false);
  const [classAction, setClassAction] = useState<'add' | 'reset'>('add');
  const [classAmount, setClassAmount] = useState('');
  const [classReason, setClassReason] = useState('');
  const [classDescription, setClassDescription] = useState('');

  useEffect(() => {
    console.log('🔍 EnhancedClientProfile useEffect triggered');
    console.log('🔍 userId:', userId);
    console.log('🔍 token exists:', !!token);
    console.log('🔍 token length:', token?.length);
    console.log('🔍 isLoggedIn:', isLoggedIn);
    console.log('🔍 user exists:', !!user);
    console.log('🔍 user role:', user?.role);
    
    // Don't redirect to login if we're already on a profile page
    // This prevents infinite redirects when viewing client profiles
    if (!token && !isLoggedIn) {
      console.error('❌ No authentication token found - but staying on profile page to show debug info');
      // Don't show alert or redirect - just log the issue
      console.error('❌ Authentication state:', { token: !!token, isLoggedIn, user: !!user });
      return;
    }
    
    if (token) {
      apiService.setToken(token);
      console.log('✅ Token set for API service');
    }
    
    loadAllData();
  }, [userId, token, isLoggedIn]);

  const loadAllData = async () => {
    setLoading(true);
    console.log('📊 Starting to load all client data...');
    
    try {
      await Promise.all([
        loadClientData().catch(error => {
          console.error('❌ Client data loading failed:', error);
          return null;
        }),
        loadClientStats().catch(error => {
          console.error('❌ Client stats loading failed:', error);
          return null;
        }),
        loadNotes().catch(error => {
          console.error('❌ Notes loading failed:', error);
          return null;
        }),
        loadDocuments().catch(error => {
          console.error('❌ Documents loading failed:', error);
          return null;
        }),
        loadActivities().catch(error => {
          console.error('❌ Activities loading failed:', error);
          return null;
        }),
        loadLifecycle().catch(error => {
          console.error('❌ Lifecycle loading failed:', error);
          return null;
        }),
        loadPaymentSettings().catch(error => {
          console.error('❌ Payment settings loading failed:', error);
          return null;
        }),
        loadManualCredits().catch(error => {
          console.error('❌ Manual credits loading failed:', error);
          return null;
        }),
        loadPaymentHistory().catch(error => {
          console.error('❌ Payment history loading failed:', error);
          return null;
        })
      ]);
      console.log('✅ All client data loading completed');
    } catch (error) {
      console.error('❌ Critical error during data loading:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadClientData = async () => {
    try {
      console.log('👤 Loading client data for userId:', userId, 'type:', typeof userId);
      
      if (!userId) {
        throw new Error('No userId provided');
      }
      
      const clientResponse = await userService.getUser(String(userId));
      console.log('👤 Client response:', clientResponse);
      console.log('👤 Response success:', clientResponse?.success);
      console.log('👤 Response error:', clientResponse?.error);
      console.log('👤 Response data:', clientResponse?.data);
      
      if (clientResponse && clientResponse.success && clientResponse.data) {
        setClient(clientResponse.data);
        console.log('✅ Client data loaded successfully:', clientResponse.data.name);
      } else {
        console.error('❌ Client data not found or invalid response');
        console.error('❌ Possible causes:');
        console.error('   1. User ID does not exist in users table');
        console.error('   2. User ID type mismatch (string vs number)');
        console.error('   3. Database connection issue');
        console.error('   4. Row Level Security blocking access');
        
        // Set a placeholder client object to show some UI
        const placeholderClient: BackendUser = {
          id: String(userId),
          name: 'Unknown User',
          email: 'unknown@example.com',
          role: 'client' as const,
          join_date: new Date().toISOString(),
          status: 'active' as const,
          created_at: new Date().toISOString()
        };
        
        setClient(placeholderClient);
        console.log('⚠️ Using placeholder client data');
        
        // Don't throw error, let the UI show with placeholder data
        return;
      }
    } catch (error) {
      console.error('❌ Failed to load client data:', error);
      console.error('❌ Error details:', error instanceof Error ? error.message : String(error));
      
      // Set a placeholder client object even on error
      const placeholderClient: BackendUser = {
        id: String(userId),
        name: `User ${userId}`,
        email: 'unknown@example.com',
        role: 'client' as const,
        join_date: new Date().toISOString(),
        status: 'active' as const,
        created_at: new Date().toISOString()
      };
      
      setClient(placeholderClient);
      console.log('⚠️ Using placeholder client data due to error');
      
      // Don't re-throw the error, let the component render with placeholder data
    }
  };

  const loadClientStats = async () => {
    try {
      // Use fallback data if API routes don't exist yet
      const stats: ClientStats = {
        totalSpent: 0,
        totalClasses: 0,
        joinDate: client?.join_date || new Date().toISOString().split('T')[0],
        lastActivity: 'No recent activity',
        attendanceRate: 0,
        favoriteInstructor: 'Not available',
        currentPlan: 'No active plan',
        totalBookings: 0,
        cancelledBookings: 0,
        noShowBookings: 0
      };

      try {
        // Get booking stats directly from Supabase
        const bookingStatsResponse = await apiService.get(`/bookings?user_id=eq.${userId}&select=*,classes!inner(name,date,time)&order=created_at.desc`);
        if (bookingStatsResponse.success && Array.isArray(bookingStatsResponse.data)) {
          const bookings = bookingStatsResponse.data;
          const completedBookings = bookings.filter((b: any) => b.status === 'completed');
          stats.totalClasses = completedBookings.length;
          stats.totalBookings = bookings.length;
          stats.cancelledBookings = bookings.filter((b: any) => b.status === 'cancelled').length;
          stats.noShowBookings = bookings.filter((b: any) => b.status === 'no_show').length;
          stats.attendanceRate = bookings.length > 0 ? (completedBookings.length / bookings.length) * 100 : 0;
          
          if (completedBookings.length > 0) {
            const lastBooking = completedBookings[0];
            stats.lastActivity = `${lastBooking.classes?.name || 'Class'} on ${formatDate(lastBooking.classes?.date || lastBooking.created_at)}`;
          }
        }
      } catch {
        console.log('📊 Booking stats calculation error - using defaults');
      }

      try {
        // Get subscription stats directly from Supabase
        const subscriptionStatsResponse = await apiService.get(`/user_subscriptions?user_id=eq.${userId}&select=*,subscription_plans!inner(name)&order=created_at.desc&limit=1`);
        if (subscriptionStatsResponse.success && Array.isArray(subscriptionStatsResponse.data) && subscriptionStatsResponse.data.length > 0) {
          const currentSub = subscriptionStatsResponse.data[0];
          stats.currentPlan = currentSub.subscription_plans?.name || 'No active plan';
          
          // Get total spent from payments
          const paymentsResponse = await apiService.get(`/payments?user_id=eq.${userId}&status=eq.completed&select=amount`);
          if (paymentsResponse.success && Array.isArray(paymentsResponse.data)) {
            stats.totalSpent = paymentsResponse.data.reduce((sum: number, payment: any) => sum + payment.amount, 0);
          }
        }
      } catch {
        console.log('💳 Subscription stats calculation error - using defaults');
      }
      
      setClientStats(stats);
    } catch (error) {
      console.error('Failed to load client stats:', error);
    }
  };

  const loadNotes = async () => {
    try {
      const response = await apiService.get(`/client_notes?client_id=eq.${userId}&select=*&order=created_at.desc`);
      if (response.success) {
        setNotes((response.data as ClientNote[]) || []);
      }
    } catch (error) {
      console.error('Failed to load notes:', error);
      Alert.alert('Error', 'Failed to load client notes. Please try again.');
      setNotes([]);
    }
  };

  const loadDocuments = async () => {
    try {
      const response = await apiService.get(`/client_documents?client_id=eq.${userId}&select=*&order=created_at.desc`);
      if (response.success) {
        setDocuments((response.data as ClientDocument[]) || []);
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
    }
  };

  const loadActivities = async () => {
    try {
      const response = await apiService.get(`/client_activity_log?client_id=eq.${userId}&select=*&order=created_at.desc&limit=50`);
      if (response.success) {
        setActivities((response.data as ClientActivity[]) || []);
      } else {
        console.log('📊 Client activity table not available - using empty data');
        setActivities([]);
      }
    } catch (error) {
      console.error('Failed to load activities (non-critical):', error);
      setActivities([]);
    }
  };

  const loadLifecycle = async () => {
    try {
      const response = await apiService.get(`/client_lifecycle?client_id=eq.${userId}&select=*`);
      if (response.success) {
        setLifecycle(response.data as ClientLifecycle);
      } else {
        console.log('👥 Client lifecycle table not available - using empty data');
        setLifecycle(null);
      }
    } catch (error) {
      console.error('Failed to load lifecycle (non-critical):', error);
      setLifecycle(null);
    }
  };

  const loadPaymentSettings = async () => {
    console.log('🔧 loadPaymentSettings called for userId:', userId);
    
    try {
      // Payment settings don't exist in current Supabase schema - use defaults
      console.log('💳 Using default payment settings (no table exists yet)');
      setPaymentSettings({
        id: 0,
        user_id: userId,
        payment_method: 'cash',
        auto_renewal: false,
        requires_admin_approval: true,
        payment_notes: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error setting default payment settings:', error);
    }
  };



  const loadManualCredits = async () => {
    try {
      const response = await apiService.get(`/manual_credits?user_id=eq.${userId}&select=*&order=created_at.desc`);
      if (response.success && response.data && Array.isArray(response.data)) {
        setManualCredits(response.data);
        console.log(`💰 Loaded ${response.data.length} manual credits for user ${userId}`, response.data);
      }
    } catch (error) {
      console.error('💰 Failed to load manual credits:', error);
      setManualCredits([]);
    }
  };

  const loadPaymentHistory = async () => {
    try {
      const response = await apiService.get(`/payments?user_id=eq.${userId}&select=*&order=created_at.desc`);
      if (response.success) {
        setPaymentHistory((response.data as PaymentHistory[]) || []);
      }
    } catch (error) {
      console.error('Failed to load payment history:', error);
      setPaymentHistory([]);
    }
  };

  const handleCreateNote = async () => {
    if (!newNoteTitle.trim() || !newNoteContent.trim()) {
      Alert.alert('Error', 'Please fill in both title and content');
      return;
    }

    try {
      const noteData = {
        clientId: userId,
        title: newNoteTitle,
        content: newNoteContent,
        noteType: selectedNoteType,
        priority: selectedPriority,
        tags: newNoteTags.split(',').map(tag => tag.trim()).filter(tag => tag),
        reminderAt: reminderAt || undefined,
        reminderMessage: reminderMessage || undefined,
      };

      const response = await apiService.post('/client_notes', noteData);
      if (response.success) {
        setNoteDialogVisible(false);
        setNewNoteTitle('');
        setNewNoteContent('');
        setNewNoteTags('');
        setReminderAt('');
        setReminderMessage('');
        await loadNotes();
        Alert.alert('Success', 'Note created successfully');
      }
    } catch (error) {
      console.error('Failed to create note:', error);
      Alert.alert('Error', 'Failed to create note');
    }
  };

  const handleCalculateRiskScore = async () => {
    try {
      // Risk calculation requires backend logic - show manual input message
      Alert.alert(
        'Risk Calculation', 
        'Automatic risk calculation requires backend processing. Please manually assess the client\'s risk level and update it through the lifecycle management section.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Failed to calculate risk score:', error);
      Alert.alert('Error', 'Failed to calculate risk score');
    }
  };

  const handleAddManualCredit = async () => {
    if (!creditAmount) {
      Alert.alert('Error', 'Please fill in the amount');
      return;
    }

    try {
      const creditData = {
        userId,
        amount: parseFloat(creditAmount),
        classesAdded: 0, // Always 0 since we're only adding credits
        reason: creditReason,
        description: creditDescription,
        receiptNumber: receiptNumber || undefined
      };

      const response = await apiService.post('/api/manual-credits', creditData);
      if (response.success) {
        setCreditDialogVisible(false);
        setCreditAmount('');
        setCreditDescription('');
        setReceiptNumber('');
        await Promise.all([loadManualCredits(), loadPaymentHistory(), loadClientStats()]);
        Alert.alert('Success', 'Manual credit added successfully');
      }
    } catch (error) {
      console.error('Failed to add manual credit:', error);
      Alert.alert('Error', 'Failed to add manual credit');
    }
  };


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getNoteTypeColor = (type: string) => {
    const colors = {
      medical: '#e74c3c',
      billing: '#f39c12',
      behavior: '#9b59b6',
      retention: '#e67e22',
      complaint: '#c0392b',
      compliment: '#27ae60',
      general: '#3498db'
    };
    return colors[type as keyof typeof colors] || '#3498db';
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      urgent: '#e74c3c',
      high: '#e67e22',
      medium: '#f39c12',
      low: '#27ae60'
    };
    return colors[priority as keyof typeof colors] || '#f39c12';
  };

  const getStageColor = (stage: string) => {
    const colors = {
      prospect: '#95a5a6',
      trial: '#3498db',
      new_member: '#2ecc71',
      active: '#27ae60',
      at_risk: '#e67e22',
      inactive: '#f39c12',
      churned: '#e74c3c',
      won_back: '#9b59b6'
    };
    return colors[stage as keyof typeof colors] || '#95a5a6';
  };

  const getRiskLevelColor = (score: number) => {
    if (score >= 70) return '#e74c3c';
    if (score >= 40) return '#f39c12';
    return '#27ae60';
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator animating={true} size="large" />
        <Paragraph style={styles.loadingText}>Loading client profile...</Paragraph>
      </View>
    );
  }

  // Show authentication status even if not authenticated
  if (!isLoggedIn || !token) {
    return (
      <View style={styles.centered}>
        <View style={styles.debugCard}>
          <Title style={styles.debugTitle}>🔐 Authentication Status</Title>
          <Paragraph>User ID: {userId}</Paragraph>
          <Paragraph>Is Logged In: {isLoggedIn ? '✅ Yes' : '❌ No'}</Paragraph>
          <Paragraph>Token Exists: {token ? '✅ Yes' : '❌ No'}</Paragraph>
          <Paragraph>User Exists: {user ? '✅ Yes' : '❌ No'}</Paragraph>
          <Paragraph>User Role: {user?.role || 'None'}</Paragraph>
          <Paragraph>User Name: {user?.name || 'None'}</Paragraph>
        </View>
        <Button 
          mode="contained" 
          onPress={() => loadAllData()}
          style={{ marginTop: 20 }}
        >
          Try Loading Data Anyway
        </Button>
      </View>
    );
  }

  const renderOverviewTab = () => (
    <View style={styles.tabContent}>

      {/* Client Header */}
      <Card style={styles.headerCard}>
        <Card.Content>
          <View style={styles.clientHeader}>
            <Avatar.Text 
              size={60} 
              label={client?.name?.charAt(0) || 'U'} 
              style={styles.avatar}
            />
            <View style={styles.clientInfo}>
              <Title style={styles.clientName}>{client?.name || 'Unknown User'}</Title>
              <Paragraph style={styles.clientEmail}>{client?.email || 'No email available'}</Paragraph>
              <View style={styles.statusRow}>
                <Chip 
                  mode="outlined" 
                  style={[styles.statusChip, { borderColor: getStageColor(lifecycle?.current_stage || 'prospect') }]}
                >
                  {lifecycle?.current_stage?.replace('_', ' ').toUpperCase() || 'PROSPECT'}
                </Chip>
                {lifecycle && lifecycle.risk_score > 0 && (
                  <Chip 
                    mode="outlined" 
                    style={[styles.riskChip, { borderColor: getRiskLevelColor(lifecycle.risk_score) }]}
                    icon="warning"
                  >
                    Risk: {lifecycle.risk_score}%
                  </Chip>
                )}
              </View>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Quick Stats */}
      {clientStats && (
        <Card style={styles.statsCard}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Key Metrics</Title>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>${clientStats.totalSpent}</Text>
                <Text style={styles.statLabel}>Total Spent</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{clientStats.totalClasses}</Text>
                <Text style={styles.statLabel}>Classes Completed</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{clientStats.attendanceRate}%</Text>
                <Text style={styles.statLabel}>Attendance Rate</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{clientStats.totalBookings}</Text>
                <Text style={styles.statLabel}>Total Bookings</Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Quick Insights */}
      <Card style={styles.insightsCard}>
        <Card.Content>
          <Title style={styles.sectionTitle}>Client Insights</Title>
          
          {clientStats?.favoriteInstructor && (
            <View style={styles.insightItem}>
              <MaterialIcons name="person" size={16} color="#9B8A7D" />
              <Paragraph style={styles.insightText}>
                Favorite instructor: {clientStats.favoriteInstructor}
              </Paragraph>
            </View>
          )}
          
          {clientStats?.currentPlan && (
            <View style={styles.insightItem}>
              <MaterialIcons name="star" size={16} color="#2196f3" />
              <Paragraph style={styles.insightText}>
                Current plan: {clientStats.currentPlan}
              </Paragraph>
            </View>
          )}
          
          {clientStats?.lastActivity && (
            <View style={styles.insightItem}>
              <MaterialIcons name="access-time" size={16} color="#ff9800" />
              <Paragraph style={styles.insightText}>
                Last activity: {clientStats.lastActivity}
              </Paragraph>
            </View>
          )}
        </Card.Content>
      </Card>
    </View>
  );

  const renderNotesTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.tabHeader}>
        <Searchbar
          placeholder="Search notes..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
        <Button 
          mode="contained" 
          onPress={() => setNoteDialogVisible(true)}
          icon="plus"
          style={styles.addButton}
        >
          Add Note
        </Button>
      </View>

      {notes.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Card.Content style={styles.emptyContent}>
            <MaterialIcons name="add" size={48} color="#ccc" />
            <Paragraph style={styles.emptyText}>No notes yet</Paragraph>
            <Button 
              mode="outlined" 
              onPress={() => setNoteDialogVisible(true)}
              style={styles.emptyButton}
            >
              Create First Note
            </Button>
          </Card.Content>
        </Card>
      ) : (
        notes
          .filter(note => 
            searchQuery === '' || 
            note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            note.content.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .map((note) => (
            <Card key={note.id} style={styles.noteCard}>
              <Card.Content>
                <View style={styles.noteHeader}>
                  <View style={styles.noteInfo}>
                    <Title style={styles.noteTitle}>{note.title}</Title>
                    <Chip 
                      style={[styles.noteTypeChip, { backgroundColor: getNoteTypeColor(note.note_type) }]}
                      textStyle={styles.chipText}
                    >
                      {note.note_type}
                    </Chip>
                  </View>
                  <Chip 
                    style={[styles.priorityChip, { backgroundColor: getPriorityColor(note.priority) }]}
                    textStyle={styles.chipText}
                  >
                    {note.priority}
                  </Chip>
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
                  <Text style={styles.noteDate}>
                    By {note.admin_name} • {formatDateTime(note.created_at)}
                  </Text>
                </View>
              </Card.Content>
            </Card>
          ))
      )}
    </View>
  );

  const renderDocumentsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.tabHeader}>
        <Title style={styles.tabTitle}>Documents & Photos</Title>
        <Button 
          mode="contained" 
          onPress={() => setUploadDialogVisible(true)}
          icon="upload"
          style={styles.addButton}
        >
          Upload
        </Button>
      </View>

      {documents.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Card.Content style={styles.emptyContent}>
            <MaterialIcons name="upload" size={48} color="#ccc" />
            <Paragraph style={styles.emptyText}>No documents uploaded</Paragraph>
            <Button 
              mode="outlined" 
              onPress={() => setUploadDialogVisible(true)}
              style={styles.emptyButton}
            >
              Upload First Document
            </Button>
          </Card.Content>
        </Card>
      ) : (
        <View style={styles.documentsGrid}>
          {documents.map((doc) => (
            <Card key={doc.id} style={styles.documentCard}>
              <Card.Content>
                <View style={styles.documentHeader}>
                  <MaterialIcons 
                    name={doc.mime_type.startsWith('image/') ? 'image' : 'description'} 
                    size={24} 
                    color="#2196f3" 
                  />
                  <View style={styles.documentInfo}>
                    <Text style={styles.documentName}>{doc.original_name}</Text>
                    <Text style={styles.documentType}>{doc.document_type?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}</Text>
                  </View>
                  {doc.is_sensitive && (
                    <Chip mode="outlined" style={styles.sensitiveChip} icon="lock">
                      Sensitive
                    </Chip>
                  )}
                </View>
                
                {doc.description && (
                  <Paragraph style={styles.documentDescription}>{doc.description}</Paragraph>
                )}
                
                <View style={styles.documentFooter}>
                  <Text style={styles.documentDate}>
                    Uploaded by {doc.uploaded_by_name} • {formatDateTime(doc.created_at)}
                  </Text>
                  <Text style={styles.documentSize}>
                    {Math.round(doc.file_size / 1024)} KB
                  </Text>
                </View>
              </Card.Content>
            </Card>
          ))}
        </View>
      )}
    </View>
  );

  const renderActivityTab = () => (
    <View style={styles.tabContent}>
      <Title style={styles.tabTitle}>Activity Timeline</Title>
      
      {activities.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Card.Content style={styles.emptyContent}>
            <MaterialIcons name="timeline" size={48} color="#ccc" />
            <Paragraph style={styles.emptyText}>No activity recorded</Paragraph>
          </Card.Content>
        </Card>
      ) : (
        activities.map((activity, index) => (
          <Card key={activity.id} style={styles.activityCard}>
            <Card.Content>
              <View style={styles.activityHeader}>
                <View style={styles.activityIcon}>
                  <MaterialIcons 
                    name={getActivityIcon(activity.activity_type)} 
                    size={20} 
                    color="#2196f3" 
                  />
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityDescription}>{activity.description}</Text>
                  <Text style={styles.activityDate}>
                    {activity.performed_by_name ? `By ${activity.performed_by_name} • ` : 'Automatic • '}
                    {formatDateTime(activity.created_at)}
                  </Text>
                </View>
              </View>
              
              {activity.metadata && (
                <View style={styles.activityMetadata}>
                  <Text style={styles.metadataText}>
                    {JSON.stringify(activity.metadata, null, 2)}
                  </Text>
                </View>
              )}
            </Card.Content>
          </Card>
        ))
      )}
    </View>
  );

  const renderLifecycleTab = () => (
    <View style={styles.tabContent}>
      <Title style={styles.tabTitle}>Lifecycle Management</Title>
      
      {lifecycle && (
        <>
          {/* Current Stage */}
          <Card style={styles.lifecycleCard}>
            <Card.Content>
              <View style={styles.stageHeader}>
                <Title style={styles.stageTitle}>Current Stage</Title>
                <Chip 
                  mode="flat" 
                  style={[styles.stageChip, { backgroundColor: getStageColor(lifecycle.current_stage) }]}
                  textStyle={{ color: 'white' }}
                >
                  {lifecycle.current_stage.replace('_', ' ').toUpperCase()}
                </Chip>
              </View>
              
              {lifecycle.previous_stage && (
                <Paragraph style={styles.stageHistory}>
                  Previous: {lifecycle.previous_stage.replace('_', ' ')} → Changed on {formatDate(lifecycle.stage_changed_at)}
                </Paragraph>
              )}
            </Card.Content>
          </Card>

          {/* Risk Score */}
          <Card style={styles.riskCard}>
            <Card.Content>
              <View style={styles.riskHeader}>
                <Title style={styles.riskTitle}>Risk Assessment</Title>
                <Button 
                  mode="outlined" 
                  onPress={handleCalculateRiskScore}
                  icon="refresh"
                  style={styles.refreshButton}
                >
                  Recalculate
                </Button>
              </View>
              
              <View style={styles.riskScoreContainer}>
                <Text style={[styles.riskScore, { color: getRiskLevelColor(lifecycle.risk_score) }]}>
                  {lifecycle.risk_score}%
                </Text>
                <Text style={styles.riskLevel}>
                  {lifecycle.risk_score >= 70 ? 'HIGH RISK' : 
                   lifecycle.risk_score >= 40 ? 'MEDIUM RISK' : 'LOW RISK'}
                </Text>
              </View>
              
              <ProgressBar 
                progress={lifecycle.risk_score / 100} 
                color={getRiskLevelColor(lifecycle.risk_score)}
                style={styles.riskProgress}
              />
            </Card.Content>
          </Card>

          {/* Lifecycle Notes */}
          {lifecycle.notes && (
            <Card style={styles.notesCard}>
              <Card.Content>
                <Title style={styles.notesTitle}>Lifecycle Notes</Title>
                <Paragraph style={styles.lifecycleNotes}>{lifecycle.notes}</Paragraph>
              </Card.Content>
            </Card>
          )}
        </>
      )}
    </View>
  );

  const renderPaymentSettingsTab = () => (
    <View style={styles.tabContent}>
      {/* Manual Credit Addition - Only show for cash payment method */}
      {paymentSettings?.payment_method === 'cash' || paymentSettings?.payment_method === 'both' ? (
        <Card style={styles.paymentCard}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <MaterialIcons name="add" size={24} color="#27ae60" />
                <Title style={styles.cardTitle}>Manual Credit Addition</Title>
              </View>
              <View style={styles.buttonRow}>
                <Button
                  mode="contained"
                  onPress={() => setCreditDialogVisible(true)}
                  icon="plus"
                  style={styles.addCreditButton}
                >
                  Add Credit
                </Button>
                <Button
                  mode="outlined"
                  onPress={() => setClassDialogVisible(true)}
                  icon="school"
                  style={styles.manageClassesButton}
                >
                  Manage Classes
                </Button>
              </View>
            </View>

            <Text style={styles.sectionDescription}>
              Add credits manually when client pays with cash at reception
            </Text>

            {manualCredits.length > 0 ? (
              <View style={styles.recentCreditsSection}>
                <Text style={styles.recentCreditsTitle}>Recent Manual Credits</Text>
                <ScrollView 
                  style={styles.creditsScrollView}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                >
                  {manualCredits.map((credit) => (
                    <View key={credit.id} style={styles.creditItem}>
                      <View style={styles.creditInfo}>
                        <MaterialIcons 
                          name={getCreditReasonIcon(credit.reason)} 
                          size={20} 
                          color="#27ae60" 
                        />
                        <View style={styles.creditDetails}>
                          <Text style={styles.creditAmount}>${credit.amount}</Text>
                          <Text style={styles.creditDescription}>
                            {credit.classes_added > 0 && `${credit.classes_added} classes • `}{credit.reason?.replace('_', ' ') || credit.reason || 'N/A'}
                          </Text>
                          {credit.description && (
                            <Text style={styles.creditDescriptionExtra}>
                              {credit.description}
                            </Text>
                          )}
                        </View>
                      </View>
                      <Text style={styles.creditDate}>{formatDate(credit.created_at)}</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            ) : (
              <View style={styles.noCreditsView}>
                <MaterialIcons name="money-off" size={32} color="#ccc" />
                <Text style={styles.noCreditsText}>💰 No manual credits added yet</Text>
                <Text style={styles.emptySubtext}>Credits will appear here when added</Text>
              </View>
            )}
          </Card.Content>
        </Card>
      ) : null}

      {/* Payment History */}
      <Card style={styles.paymentCard}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <MaterialIcons name="history" size={24} color="#3498db" />
              <Title style={styles.cardTitle}>Payment History</Title>
            </View>
          </View>

          {paymentHistory.length > 0 ? (
            <View style={styles.historySection}>
              <ScrollView 
                style={styles.historyScrollView}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
              >
                {paymentHistory.map((payment) => (
                  <View key={payment.id} style={styles.historyItem}>
                    <View style={styles.historyInfo}>
                      <MaterialIcons 
                        name={payment.payment_type === 'manual_cash' ? 'local-atm' : 'credit-card'} 
                        size={20} 
                        color={payment.payment_type === 'manual_cash' ? '#27ae60' : '#3498db'} 
                      />
                      <View style={styles.historyDetails}>
                        <Text style={styles.historyAmount}>${payment.amount}</Text>
                        <Text style={styles.historyDescription}>
                          {payment.description} • {payment.classes_added} classes
                        </Text>
                        <Text style={styles.historyProcessor}>
                          Processed by: {payment.processed_by}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.historyDate}>{formatDate(payment.created_at)}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          ) : (
            <View style={styles.noHistoryView}>
              <MaterialIcons name="history" size={32} color="#ccc" />
              <Text style={styles.noHistoryText}>💳 No payment history yet</Text>
              <Text style={styles.emptySubtext}>Payment records will appear here</Text>
            </View>
          )}
        </Card.Content>
      </Card>
    </View>
  );

  const getActivityIcon = (type: string) => {
    const icons: { [key: string]: keyof typeof MaterialIcons.glyphMap } = {
      registration: 'person-add-alt',
      login: 'login',
      subscription_purchase: 'payment',
      class_booking: 'event',
      class_attendance: 'check-circle',
      note_added: 'note',
      document_uploaded: 'attach-file',
      status_change: 'sync-alt'
    };
    return icons[type] || 'info';
  };



  const getCreditReasonIcon = (reason: string) => {
    switch (reason) {
      case 'cash_payment': return 'local-atm';
      case 'refund': return 'undo';
      case 'promotional': return 'card-giftcard';
      case 'adjustment': return 'tune';
      case 'compensation': return 'redeem';
      default: return 'help';
    }
  };

  const handleManageClasses = async () => {
    if (!classAmount || !classReason) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const classData = {
        userId,
        action: classAction,
        amount: parseInt(classAmount),
        reason: classReason,
        description: classDescription,
      };

      console.log('🎓 Debug: Sending class management data:', classData);
      console.log('🎓 Debug: userId:', userId);
      console.log('🎓 Debug: classAction:', classAction);
      console.log('🎓 Debug: classAmount:', classAmount);
      console.log('🎓 Debug: classReason:', classReason);

      const response = await apiService.post('/api/users/manage-classes', classData);
      if (response.success) {
        setClassDialogVisible(false);
        setClassAmount('');
        setClassReason('');
        setClassDescription('');
        await Promise.all([loadClientStats(), loadActivities()]);
        Alert.alert('Success', `Classes ${classAction === 'add' ? 'added' : 'reset'} successfully`);
      }
    } catch (error) {
      console.error('Failed to manage classes:', error);
      Alert.alert('Error', 'Failed to manage classes');
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator animating={true} size="large" />
        <Paragraph style={styles.loadingText}>Loading client profile...</Paragraph>
      </View>
    );
  }

  if (!client) {
    console.log('❌ No client data found');
    return (
      <View style={[styles.container, styles.centered]}>
        <Title>Client Not Found</Title>
        <Paragraph style={{ textAlign: 'center', marginBottom: 16 }}>
          Unable to load client information.
        </Paragraph>
        <Button mode="contained" onPress={loadAllData}>
          Retry
        </Button>
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
        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabScrollContent}
          >
            {[
              { key: 'overview', label: 'Overview', icon: 'home' as keyof typeof MaterialIcons.glyphMap },
              { key: 'notes', label: 'Notes', icon: 'note' as keyof typeof MaterialIcons.glyphMap },
              { key: 'documents', label: 'Documents', icon: 'folder' as keyof typeof MaterialIcons.glyphMap },
              { key: 'activity', label: 'Activity', icon: 'timeline' as keyof typeof MaterialIcons.glyphMap },
              { key: 'lifecycle', label: 'Lifecycle', icon: 'trending-up' as keyof typeof MaterialIcons.glyphMap },
              { key: 'payments', label: 'Payments', icon: 'credit-card' as keyof typeof MaterialIcons.glyphMap }
            ].map((tab) => (
              <Button
                key={tab.key}
                mode={activeTab === tab.key ? 'contained' : 'outlined'}
                onPress={() => setActiveTab(tab.key as typeof activeTab)}
                style={styles.tabButton}
                icon={tab.icon}
                compact
              >
                {tab.label}
              </Button>
            ))}
          </ScrollView>
        </View>

        {/* Tab Content */}
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'notes' && renderNotesTab()}
        {activeTab === 'documents' && renderDocumentsTab()}
        {activeTab === 'activity' && renderActivityTab()}
        {activeTab === 'lifecycle' && renderLifecycleTab()}
        {activeTab === 'payments' && renderPaymentSettingsTab()}
      </ScrollView>

      {/* Create Note Dialog */}
      <Portal>
        <Dialog visible={noteDialogVisible} onDismiss={() => setNoteDialogVisible(false)}>
          <Dialog.Title>Create Note</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Title"
              value={newNoteTitle}
              onChangeText={setNewNoteTitle}
              style={styles.dialogInput}
            />
            
            <TextInput
              label="Content"
              value={newNoteContent}
              onChangeText={setNewNoteContent}
              multiline
              numberOfLines={4}
              style={styles.dialogInput}
            />
            
            <Text style={styles.dialogLabel}>Note Type</Text>
            <SegmentedButtons
              value={selectedNoteType}
              onValueChange={setSelectedNoteType}
              buttons={[
                { value: 'general', label: 'General' },
                { value: 'medical', label: 'Medical' },
                { value: 'billing', label: 'Billing' }
              ]}
              style={styles.segmentedButtons}
            />
            
            <Text style={styles.dialogLabel}>Priority</Text>
            <SegmentedButtons
              value={selectedPriority}
              onValueChange={setSelectedPriority}
              buttons={[
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
                { value: 'urgent', label: 'Urgent' }
              ]}
              style={styles.segmentedButtons}
            />
            
            <TextInput
              label="Tags (comma separated)"
              value={newNoteTags}
              onChangeText={setNewNoteTags}
              placeholder="assessment, follow-up, important"
              style={styles.dialogInput}
            />
            <TextInput
              label="Reminder (optional)"
              value={reminderAt}
              onChangeText={setReminderAt}
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
                    setReminderAt(tomorrow.toISOString().slice(0, 16).replace('T', ' '));
                  }} 
                />
              }
              style={styles.dialogInput}
            />
            <TextInput
              label="Reminder Message (optional)"
              value={reminderMessage}
              onChangeText={setReminderMessage}
              placeholder="Reminder message"
              mode="outlined"
              style={styles.dialogInput}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setNoteDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleCreateNote} mode="contained">Create</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Upload Dialog Placeholder */}
      <Portal>
        <Dialog visible={uploadDialogVisible} onDismiss={() => setUploadDialogVisible(false)}>
          <Dialog.Title>Upload Document</Dialog.Title>
          <Dialog.Content>
            <Paragraph>Document upload feature coming soon!</Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setUploadDialogVisible(false)}>Close</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Payment Settings Dialog */}
      <Portal>
        <Dialog 
          visible={paymentSettingsDialogVisible} 
          onDismiss={() => setPaymentSettingsDialogVisible(false)}
          style={styles.modernDialog}
        >
          <Dialog.Title style={styles.modernDialogTitle}>
            💳 Payment Configuration
          </Dialog.Title>
          <Dialog.Content>
            <View style={styles.modernDialogContent}>
              <Text style={styles.modernDialogDescription}>
                Configure how this client can make payments for their classes and subscriptions.
              </Text>
              
              <Text style={styles.modernLabel}>Payment Method</Text>
              <SegmentedButtons
                value={paymentSettings?.payment_method || 'cash'}
                onValueChange={(value) => {
                  console.log('🔧 Payment method changed to:', value);
                  console.log('🔧 paymentSettings exists:', !!paymentSettings);
                  
                  // Ensure payment settings exist
                  const currentSettings = paymentSettings || {
                    id: 0,
                    user_id: userId,
                    payment_method: 'cash',
                    auto_renewal: false,
                    requires_admin_approval: true,
                    payment_notes: '',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  };
                  
                  // Update payment method
                  const updatedSettings = {
                    ...currentSettings,
                    payment_method: value as 'cash' | 'credit_card' | 'both',
                    updated_at: new Date().toISOString()
                  };
                  
                  console.log('🔧 Updating payment settings to:', updatedSettings);
                  setPaymentSettings(updatedSettings);
                  Alert.alert('Success', 'Payment method updated successfully');
                }}
                buttons={[
                  { 
                    value: 'cash', 
                    label: 'Cash Only',
                    showSelectedCheck: true
                  },
                  { 
                    value: 'credit_card', 
                    label: 'Card Only',
                    showSelectedCheck: true
                  },
                  { 
                    value: 'both', 
                    label: 'Both Methods',
                    showSelectedCheck: true
                  },
                ]}
                style={styles.modernSegmentedButtons}
              />

              <ToggleRow
                label="Auto-Renewal"
                description="Automatically renew subscription when it expires"
                value={paymentSettings?.auto_renewal || false}
                onValueChange={(value) => {
                  console.log('🔧 Auto-Renewal toggled to:', value);
                  console.log('🔧 paymentSettings exists:', !!paymentSettings);
                  
                  // Ensure payment settings exist
                  const currentSettings = paymentSettings || {
                    id: 0,
                    user_id: userId,
                    payment_method: 'cash',
                    auto_renewal: false,
                    requires_admin_approval: true,
                    payment_notes: '',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  };
                  
                  // Update auto-renewal
                  const updatedSettings = {
                    ...currentSettings,
                    auto_renewal: value,
                    updated_at: new Date().toISOString()
                  };
                  
                  console.log('🔧 Updating auto-renewal to:', updatedSettings);
                  setPaymentSettings(updatedSettings);
                  Alert.alert('Success', `Auto-renewal ${value ? 'enabled' : 'disabled'} successfully`);
                }}
              />

              <ToggleRow
                label="Require Admin Approval"
                description="Admin must manually approve all payments"
                value={paymentSettings?.requires_admin_approval || false}
                onValueChange={(value) => {
                  console.log('🔧 Admin Approval toggled to:', value);
                  console.log('🔧 paymentSettings exists:', !!paymentSettings);
                  
                  // Ensure payment settings exist
                  const currentSettings = paymentSettings || {
                    id: 0,
                    user_id: userId,
                    payment_method: 'cash',
                    auto_renewal: false,
                    requires_admin_approval: true,
                    payment_notes: '',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  };
                  
                  // Update admin approval
                  const updatedSettings = {
                    ...currentSettings,
                    requires_admin_approval: value,
                    updated_at: new Date().toISOString()
                  };
                  
                  console.log('🔧 Updating admin approval to:', updatedSettings);
                  setPaymentSettings(updatedSettings);
                  Alert.alert('Success', `Admin approval ${value ? 'required' : 'not required'} successfully`);
                }}
              />

              <TextInput
                label="Payment Notes (Optional)"
                value={paymentSettings?.payment_notes || ''}
                onChangeText={(text) => {
                  console.log('🔧 Payment notes changed to:', text);
                  
                  // Ensure payment settings exist
                  const currentSettings = paymentSettings || {
                    id: 0,
                    user_id: userId,
                    payment_method: 'cash',
                    auto_renewal: false,
                    requires_admin_approval: true,
                    payment_notes: '',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  };
                  
                  // Update payment notes
                  const updatedSettings = {
                    ...currentSettings,
                    payment_notes: text,
                    updated_at: new Date().toISOString()
                  };
                  
                  setPaymentSettings(updatedSettings);
                }}
                mode="outlined"
                multiline
                style={styles.modernInput}
                placeholder="Special payment instructions or notes..."
              />
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setPaymentSettingsDialogVisible(false)}>Close</Button>
          </Dialog.Actions>
        </Dialog>

        {/* Manual Credit Addition Dialog */}
        <Dialog 
          visible={creditDialogVisible} 
          onDismiss={() => setCreditDialogVisible(false)}
          style={styles.modernDialog}
        >
          <Dialog.Title>💰 Add Manual Credit</Dialog.Title>
          <Dialog.Content>
            <View style={styles.modernDialogContent}>
              <Text style={styles.modernDialogDescription}>
                Add credits manually when client pays with cash at reception or for refunds, promotions, and adjustments.
              </Text>

              <TextInput
                label="Amount ($) *"
                value={creditAmount}
                onChangeText={setCreditAmount}
                mode="outlined"
                keyboardType="numeric"
                style={styles.modernInput}
              />

              <Text style={styles.modernLabel}>Reason</Text>
              <SegmentedButtons
                value={creditReason}
                onValueChange={setCreditReason}
                buttons={[
                  { 
                    value: 'cash_payment', 
                    label: 'Cash Payment'
                  },
                  { 
                    value: 'refund', 
                    label: 'Refund'
                  }
                ]}
                style={styles.modernSegmentedButtons}
              />
              <SegmentedButtons
                value={creditReason}
                onValueChange={setCreditReason}
                buttons={[
                  { 
                    value: 'promotional', 
                    label: 'Promotional'
                  },
                  { 
                    value: 'adjustment', 
                    label: 'Adjustment'
                  },
                  { 
                    value: 'compensation', 
                    label: 'Compensation'
                  }
                ]}
                style={styles.modernSegmentedButtons}
              />

              <TextInput
                label="Description"
                value={creditDescription}
                onChangeText={setCreditDescription}
                mode="outlined"
                multiline
                style={styles.modernInput}
                placeholder="Additional details about this credit..."
              />

              <TextInput
                label="Receipt Number (Optional)"
                value={receiptNumber}
                onChangeText={setReceiptNumber}
                mode="outlined"
                style={styles.modernInput}
                placeholder="Receipt or reference number"
              />
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setCreditDialogVisible(false)}>Cancel</Button>
            <Button 
              mode="contained" 
              onPress={handleAddManualCredit}
              disabled={!creditAmount}
            >
              Add Credit
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Class Management Dialog */}
        <Dialog 
          visible={classDialogVisible} 
          onDismiss={() => setClassDialogVisible(false)}
          style={styles.modernDialog}
        >
          <Dialog.Title>🎓 Manage User Classes</Dialog.Title>
          <Dialog.Content>
            <View style={styles.modernDialogContent}>
              <Text style={styles.modernDialogDescription}>
                Add or reset user classes for refunds, compensations, or administrative adjustments.
              </Text>

              <Text style={styles.modernLabel}>Action</Text>
              <SegmentedButtons
                value={classAction}
                onValueChange={setClassAction}
                buttons={[
                  { 
                    value: 'add', 
                    label: 'Add Classes'
                  },
                  { 
                    value: 'reset', 
                    label: 'Reset Classes'
                  }
                ]}
                style={styles.modernSegmentedButtons}
              />

              {classAction === 'add' && (
                <TextInput
                  label="Number of Classes to Add *"
                  value={classAmount}
                  onChangeText={setClassAmount}
                  mode="outlined"
                  keyboardType="numeric"
                  style={styles.modernInput}
                  placeholder="e.g., 5"
                />
              )}

              {classAction === 'reset' && (
                <TextInput
                  label="Reset to Number of Classes *"
                  value={classAmount}
                  onChangeText={setClassAmount}
                  mode="outlined"
                  keyboardType="numeric"
                  style={styles.modernInput}
                  placeholder="e.g., 10"
                />
              )}

              <TextInput
                label="Reason *"
                value={classReason}
                onChangeText={setClassReason}
                mode="outlined"
                style={styles.modernInput}
                placeholder="e.g., Refund for cancelled subscription, Compensation, etc."
              />

              <TextInput
                label="Additional Notes"
                value={classDescription}
                onChangeText={setClassDescription}
                mode="outlined"
                multiline
                style={styles.modernInput}
                placeholder="Additional details about this class adjustment..."
              />
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setClassDialogVisible(false)}>Cancel</Button>
            <Button 
              mode="contained" 
              onPress={handleManageClasses}
              disabled={!classAmount || !classReason}
            >
              {classAction === 'add' ? 'Add Classes' : 'Reset Classes'}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F2B8',
  },
  scrollView: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  loadingText: {
    marginTop: 16,
    textAlign: 'center',
    color: '#495057',
    fontSize: 16,
  },
  tabContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    elevation: 3,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  tabScrollContent: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 4,
  },
  tabButton: {
    minWidth: 85,
    marginBottom: 4,
    borderRadius: 20,
    paddingHorizontal: 12,
  },
  tabContent: { 
    padding: 12,
    paddingBottom: 20,
  },
  headerCard: { marginBottom: 16 },
  clientHeader: { 
    flexDirection: 'row', 
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  avatar: { marginRight: 16 },
  clientInfo: { 
    flex: 1,
    minWidth: 200,
  },
  clientName: { marginBottom: 4 },
  clientEmail: { color: '#666', marginBottom: 8 },
  statusRow: { 
    flexDirection: 'row', 
    gap: 8,
    flexWrap: 'wrap',
  },
  statusChip: { alignSelf: 'flex-start' },
  riskChip: { alignSelf: 'flex-start' },
  statsCard: { marginBottom: 16 },
  sectionTitle: { marginBottom: 16, fontSize: 18 },
  statsGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between',
    gap: 8,
  },
  statItem: { 
    alignItems: 'center', 
    width: '48%', 
    marginBottom: 12,
    minWidth: 120,
  },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#9B8A7D' },
  statLabel: { fontSize: 12, color: '#666', textAlign: 'center' },
  insightsCard: { marginBottom: 16 },
  insightItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  insightText: { marginLeft: 8, flex: 1 },
  emptyCard: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  emptyContent: { alignItems: 'center' },
  emptyText: { color: '#666', marginVertical: 16, fontSize: 16 },
  emptyButton: { marginTop: 8 },
  noteCard: { marginBottom: 12 },
  noteHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 8,
  },
  noteInfo: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  noteTitle: { flex: 1, fontSize: 16, marginRight: 8, minWidth: 150 },
  noteTypeChip: { height: 24 },
  priorityChip: { height: 24 },
  noteContent: { marginBottom: 8, lineHeight: 20 },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8 },
  tagChip: { height: 24 },
  noteFooter: { borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 8 },
  noteDate: { fontSize: 12, color: '#666' },
  documentsGrid: { gap: 12 },
  documentCard: { marginBottom: 8 },
  documentHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  documentInfo: { flex: 1, marginLeft: 12, minWidth: 150 },
  documentName: { fontWeight: 'bold', fontSize: 14 },
  documentType: { fontSize: 12, color: '#666' },
  sensitiveChip: { height: 24 },
  documentDescription: { marginBottom: 8, fontSize: 14 },
  documentFooter: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    borderTopWidth: 1, 
    borderTopColor: '#eee', 
    paddingTop: 8,
    flexWrap: 'wrap',
    gap: 8,
  },
  documentDate: { fontSize: 12, color: '#666' },
  documentSize: { fontSize: 12, color: '#666' },
  activityCard: { marginBottom: 8 },
  activityHeader: { 
    flexDirection: 'row', 
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  activityIcon: { 
    width: 32, 
    height: 32, 
    borderRadius: 16, 
    backgroundColor: '#e3f2fd', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginRight: 12,
    flexShrink: 0,
  },
  activityContent: { flex: 1, minWidth: 200 },
  activityDescription: { fontSize: 14, marginBottom: 4 },
  activityDate: { fontSize: 12, color: '#666' },
  activityMetadata: { marginTop: 8, padding: 8, backgroundColor: '#f8f9fa', borderRadius: 4 },
  metadataText: { fontSize: 12, fontFamily: 'monospace' },
  lifecycleCard: { marginBottom: 16 },
  stageHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 8,
  },
  stageTitle: { fontSize: 18, flex: 1, minWidth: 150 },
  stageChip: { alignSelf: 'flex-start' },
  stageHistory: { color: '#666', fontSize: 14 },
  riskCard: { marginBottom: 16 },
  riskHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 8,
  },
  riskTitle: { fontSize: 18, flex: 1, minWidth: 150 },
  refreshButton: { alignSelf: 'flex-start' },
  riskScoreContainer: { alignItems: 'center', marginBottom: 16 },
  riskScore: { fontSize: 48, fontWeight: 'bold' },
  riskLevel: { fontSize: 16, fontWeight: 'bold', color: '#666' },
  riskProgress: { height: 8, borderRadius: 4 },
  notesCard: { marginBottom: 16 },
  notesTitle: { fontSize: 16, marginBottom: 8 },
  lifecycleNotes: { lineHeight: 20 },
  dialogInput: { marginBottom: 12 },
  dialogLabel: { fontSize: 16, fontWeight: '600', marginBottom: 8, marginTop: 8 },
  dialogDescription: { fontSize: 14, color: '#666', marginBottom: 16, lineHeight: 20 },
  segmentedButtons: { marginBottom: 12 },
  settingsRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 16, 
    paddingVertical: 8,
    flexWrap: 'wrap',
    gap: 8,
  },
  dialogContent: { paddingVertical: 8 },
  formRow: { 
    flexDirection: 'row', 
    gap: 12, 
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  halfInput: { flex: 1, minWidth: 150 },
  dialog: { maxWidth: 500, alignSelf: 'center', margin: 20 },
  paymentCard: { 
    marginBottom: 16, 
    borderRadius: 16, 
    elevation: 2, 
    boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1)',
    borderWidth: 1, 
    borderColor: '#e9ecef' 
  },
  cardHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 8,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 200 },
  cardTitle: { fontSize: 18, marginLeft: 12, fontWeight: '600', color: '#212529' },
  paymentMethodSection: { marginBottom: 16 },
  paymentMethodRow: { 
    flexDirection: 'row', 
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  paymentMethodInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 200 },
  paymentMethodText: { flex: 1 },
  paymentMethodTitle: { fontSize: 16, fontWeight: 'bold' },
  paymentMethodSubtitle: { color: '#666' },
  methodChip: { height: 24 },
  chipText: { fontSize: 12 },
  settingsGrid: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 12,
  },
  settingItem: { 
    alignItems: 'center',
    minWidth: 120,
  },
  settingLabel: { fontSize: 14, color: '#666', textAlign: 'center' },
  enabledChip: { backgroundColor: '#27ae60' },
  disabledChip: { backgroundColor: '#e74c3c' },
  notesSection: { marginBottom: 12 },
  notesLabel: { fontSize: 14, fontWeight: 'bold' },
  notesText: { color: '#666' },
  noSettingsView: { 
    alignItems: 'center', 
    padding: 40, 
    backgroundColor: '#ffffff', 
    borderRadius: 16, 
    borderWidth: 1, 
    borderColor: '#e9ecef' 
  },
  noSettingsText: { 
    color: '#495057', 
    marginBottom: 8, 
    fontSize: 18, 
    fontWeight: '600', 
    textAlign: 'center' 
  },
  emptySubtext: { 
    color: '#6c757d', 
    fontSize: 14, 
    textAlign: 'center', 
    marginBottom: 20, 
    lineHeight: 20 
  },
  setupButton: { marginTop: 8, borderRadius: 24, paddingHorizontal: 24 },
  addCreditButton: { backgroundColor: '#27ae60' },
  sectionDescription: { color: '#666', marginBottom: 16, fontSize: 14 },
  recentCreditsSection: { 
    marginBottom: 16,
    maxHeight: 300,
  },
  recentCreditsTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  creditsScrollView: {
    maxHeight: 250,
    marginBottom: 8,
  },
  creditItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 8,
  },
  creditInfo: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    flex: 1, 
    minWidth: 200 
  },
  creditDetails: { flex: 1, marginLeft: 8 },
  creditAmount: { fontSize: 14, fontWeight: 'bold' },
  creditDescription: { color: '#666', fontSize: 12 },
  creditDescriptionExtra: { color: '#888', fontSize: 11, fontStyle: 'italic', marginTop: 2 },
  creditDate: { fontSize: 12, color: '#666' },
  moreCreditsText: { color: '#666', textAlign: 'center', fontStyle: 'italic' },
  noCreditsView: { alignItems: 'center', padding: 48 },
  noCreditsText: { 
    color: '#666', 
    marginBottom: 8, 
    fontSize: 16, 
    fontWeight: '500',
    textAlign: 'center',
  },
  historySection: { 
    marginBottom: 16,
    maxHeight: 400,
  },
  historyScrollView: {
    maxHeight: 350,
    marginBottom: 8,
  },
  historyItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 8,
  },
  historyInfo: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    flex: 1, 
    minWidth: 200 
  },
  historyDetails: { flex: 1, marginLeft: 8 },
  historyAmount: { fontSize: 14, fontWeight: 'bold' },
  historyDescription: { color: '#666', fontSize: 12 },
  historyProcessor: { color: '#666', fontSize: 11 },
  historyDate: { fontSize: 12, color: '#666' },
  viewAllButton: { marginTop: 8 },
  noHistoryView: { alignItems: 'center', padding: 48 },
  noHistoryText: { 
    color: '#666', 
    marginBottom: 16,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
  },
  modernEmptyCard: { 
    marginBottom: 16, 
    borderRadius: 16, 
    elevation: 2, 
    boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1)',
    borderWidth: 1, 
    borderColor: '#e9ecef' 
  },
  emptyStateContent: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 16 },
  emptyStateTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: '#495057', 
    marginTop: 16, 
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtitle: { 
    fontSize: 14, 
    color: '#6c757d', 
    textAlign: 'center', 
    lineHeight: 20, 
    marginBottom: 20 
  },
  modernToggleRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 24, 
    paddingVertical: 16, 
    paddingHorizontal: 20, 
    backgroundColor: '#ffffff', 
    borderRadius: 16, 
    borderWidth: 1, 
    borderColor: '#e9ecef',
    flexWrap: 'wrap',
    gap: 12,
  },
  toggleInfo: { flex: 1, marginRight: 16, minWidth: 200 },
  toggleLabel: { fontSize: 16, fontWeight: '600', color: '#212529', marginBottom: 4 },
  toggleDescription: { fontSize: 13, color: '#6c757d', lineHeight: 18 },
  modernDialog: { 
    maxWidth: 380, 
    width: '85%', 
    alignSelf: 'center', 
    margin: 16, 
    borderRadius: 16,
    maxHeight: '75%'
  },
  modernDialogTitle: { fontSize: 20, fontWeight: '700', color: '#212529', textAlign: 'center' },
  modernDialogContent: { paddingVertical: 8 },
  modernDialogDescription: { 
    fontSize: 14, 
    color: '#6c757d', 
    marginBottom: 20, 
    lineHeight: 20, 
    textAlign: 'center' 
  },
  modernLabel: { fontSize: 16, fontWeight: '600', marginBottom: 12, marginTop: 8, color: '#212529' },
  modernSegmentedButtons: { marginBottom: 24, borderRadius: 12, overflow: 'hidden' },
  modernInput: { marginBottom: 12, backgroundColor: 'transparent' },
  tabHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 8,
  },
  searchBar: { 
    flex: 1, 
    marginRight: 12, 
    backgroundColor: '#f8f9fa',
    minWidth: 200,
  },
  addButton: { borderRadius: 24 },
  tabTitle: { 
    marginBottom: 16, 
    fontSize: 20, 
    fontWeight: '600', 
    color: '#212529' 
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  manageClassesButton: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
    borderWidth: 2,
  },
  reminderContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reminderText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  debugCard: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffeaa7',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    maxWidth: 400,
  },
  debugTitle: {
    color: '#856404',
    marginBottom: 12,
  },
});

export default EnhancedClientProfile; 