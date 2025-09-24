import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { Alert, Dimensions, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Button, Divider, Modal, Card as PaperCard, Portal } from 'react-native-paper';
import { useSelector } from 'react-redux';
import { spacing } from '../../../constants/Spacing';
import { useThemeColor } from '../../../hooks/useThemeColor';
import { activityService, ActivityStats, StaffActivity } from '../../services/activityService';
import { dashboardService, DashboardStats } from '../../services/dashboardService';
import { RootState } from '../../store';

const { width: screenWidth } = Dimensions.get('window');
const isLargeScreen = screenWidth > 1024;

function AdminDashboard({ onNavigate }: { onNavigate?: (screenKey: string) => void } = {}) {
  const { user: currentUser } = useSelector((state: RootState) => state.auth);
  
  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const surfaceColor = useThemeColor({}, 'surface');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const textMutedColor = useThemeColor({}, 'textMuted');
  const primaryColor = useThemeColor({}, 'primary');
  const successColor = useThemeColor({}, 'success');
  const warningColor = useThemeColor({}, 'warning');
  const errorColor = useThemeColor({}, 'error');

  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [recentActivities, setRecentActivities] = useState<StaffActivity[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<StaffActivity[]>([]);
  const [activityStats, setActivityStats] = useState<ActivityStats | null>(null);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState<StaffActivity | null>(null);
  const [showActivityDetails, setShowActivityDetails] = useState(false);
  
  // Activity filters and search
  const [activitySearchQuery, setActivitySearchQuery] = useState('');
  const [activityFilter, setActivityFilter] = useState('all'); // all, today, week, reception, instructor, admin
  const [activityTypeFilter, setActivityTypeFilter] = useState('all'); // all, subscription, class, user, other
  const [expandedTimeGroups, setExpandedTimeGroups] = useState<Set<string>>(new Set(['today']));

  useEffect(() => {
    loadDashboardData();
    loadActivityData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await dashboardService.getDashboardStats();
      if (response && response.data) {
        setDashboardStats(response.data);
      }
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadActivityData = async () => {
    try {
      setActivitiesLoading(true);
      const [activities, stats] = await Promise.all([
        activityService.getRecentActivities(50), // Load more activities for better filtering
        activityService.getActivityStats()
      ]);
      
      setRecentActivities(activities);
      setActivityStats(stats);
      // Initially show all activities
      setFilteredActivities(activities);
    } catch (error) {
      console.error('❌ Error loading activity data:', error);
    } finally {
      setActivitiesLoading(false);
    }
  };

  // Filter and search activities
  const filterActivities = () => {
    let filtered = [...recentActivities];

    // Apply search filter
    if (activitySearchQuery.trim()) {
      const searchLower = activitySearchQuery.toLowerCase();
      filtered = filtered.filter(activity => 
        activity.activity_description.toLowerCase().includes(searchLower) ||
        activity.staff_name.toLowerCase().includes(searchLower) ||
        activity.client_name?.toLowerCase().includes(searchLower)
      );
    }

    // Apply time filter
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    if (activityFilter === 'today') {
      filtered = filtered.filter(activity => 
        new Date(activity.created_at || '') >= today
      );
    } else if (activityFilter === 'week') {
      filtered = filtered.filter(activity => 
        new Date(activity.created_at || '') >= weekAgo
      );
    }

    // Apply staff role filter
    if (activityFilter === 'reception' || activityFilter === 'instructor' || activityFilter === 'admin') {
      filtered = filtered.filter(activity => activity.staff_role === activityFilter);
    }

    // Apply activity type filter
    if (activityTypeFilter !== 'all') {
      if (activityTypeFilter === 'subscription') {
        filtered = filtered.filter(activity => 
          activity.activity_type.includes('subscription') || 
          activity.activity_type.includes('classes_')
        );
      } else if (activityTypeFilter === 'class') {
        filtered = filtered.filter(activity => 
          activity.activity_type.includes('class') && 
          !activity.activity_type.includes('classes_')
        );
      } else if (activityTypeFilter === 'user') {
        filtered = filtered.filter(activity => 
          activity.activity_type.includes('client') || 
          activity.activity_type.includes('profile')
        );
      }
    }

    setFilteredActivities(filtered);
  };

  // Filter activities when search/filter changes
  useEffect(() => {
    filterActivities();
  }, [recentActivities, activitySearchQuery, activityFilter, activityTypeFilter]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadDashboardData(), loadActivityData()]);
    setRefreshing(false);
  };

  const handleNavigation = (screenKey: string, params?: any) => {
    if (isLargeScreen && onNavigate) {
      onNavigate(screenKey);
    } else {
      try {
        (navigation as any).navigate(screenKey, params);
      } catch (error) {
        console.error('Navigation error:', error);
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sq-AL', {
      style: 'currency',
      currency: 'ALL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getTodayFormatted = () => {
    return new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatActivityTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'subscription_added':
      case 'package_added':
        return 'add-circle';
      case 'subscription_cancelled':
      case 'subscription_terminated':
      case 'package_removed':
        return 'cancel';
      case 'classes_added':
        return 'add';
      case 'classes_removed':
        return 'remove';
      case 'note_added':
        return 'note-add';
      case 'profile_updated':
        return 'edit';
      case 'client_created':
        return 'person-add';
      case 'instructor_assigned':
      case 'instructor_unassigned':
        return 'assignment';
      case 'booking_created':
        return 'event';
      case 'booking_cancelled':
        return 'event-busy';
      case 'payment_processed':
      case 'credit_added':
        return 'payment';
      default:
        return 'info';
    }
  };

  const getActivityColor = (activityType: string) => {
    switch (activityType) {
      case 'subscription_added':
      case 'package_added':
      case 'classes_added':
      case 'client_created':
      case 'booking_created':
      case 'payment_processed':
      case 'credit_added':
        return successColor;
      case 'subscription_cancelled':
      case 'subscription_terminated':
      case 'package_removed':
      case 'classes_removed':
      case 'booking_cancelled':
        return errorColor;
      case 'note_added':
      case 'profile_updated':
      case 'instructor_assigned':
      case 'instructor_unassigned':
        return warningColor;
      default:
        return primaryColor;
    }
  };

  const handleActivityClick = (activity: StaffActivity) => {
    setSelectedActivity(activity);
    setShowActivityDetails(true);
  };

  // Group activities by time periods
  const groupActivitiesByTime = (activities: StaffActivity[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const groups: { [key: string]: StaffActivity[] } = {
      today: [],
      yesterday: [],
      thisWeek: [],
      older: []
    };

    activities.forEach(activity => {
      const activityDate = new Date(activity.created_at || '');
      
      if (activityDate >= today) {
        groups.today.push(activity);
      } else if (activityDate >= yesterday) {
        groups.yesterday.push(activity);
      } else if (activityDate >= weekAgo) {
        groups.thisWeek.push(activity);
      } else {
        groups.older.push(activity);
      }
    });

    return groups;
  };

  const toggleTimeGroup = (groupKey: string) => {
    const newExpanded = new Set(expandedTimeGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedTimeGroups(newExpanded);
  };

  const getActivityCategoryIcon = (activityType: string) => {
    if (activityType.includes('subscription')) return 'card-membership';
    if (activityType.includes('class')) return 'event';
    if (activityType.includes('client') || activityType.includes('profile')) return 'person';
    if (activityType.includes('payment')) return 'payment';
    return 'work';
  };

  const getActivityCategoryColor = (activityType: string) => {
    if (activityType.includes('subscription')) return '#2196F3';
    if (activityType.includes('class')) return '#4CAF50';
    if (activityType.includes('client') || activityType.includes('profile')) return '#FF9800';
    if (activityType.includes('payment')) return '#9C27B0';
    return '#607D8B';
  };

  const formatCurrencyALL = (amount: number) => {
    return new Intl.NumberFormat('sq-AL', {
      style: 'currency',
      currency: 'ALL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const renderActivityDetails = () => {
    if (!selectedActivity) return null;

    const metadata = selectedActivity.metadata || {};
    
    return (
      <Portal>
        <Modal
          visible={showActivityDetails}
          onDismiss={() => setShowActivityDetails(false)}
          contentContainerStyle={[styles.activityModal, { backgroundColor: surfaceColor }]}
        >
          <ScrollView>
            {/* Header */}
            <View style={styles.activityModalHeader}>
              <View style={[styles.activityIconContainer, { 
                backgroundColor: getActivityColor(selectedActivity.activity_type) + '20' 
              }]}>
                <MaterialIcons 
                  name={getActivityIcon(selectedActivity.activity_type) as any} 
                  size={24} 
                  color={getActivityColor(selectedActivity.activity_type)} 
                />
              </View>
              <View style={styles.activityModalHeaderText}>
                <Text style={[styles.activityModalTitle, { color: textColor }]}>
                  {selectedActivity.activity_description}
                </Text>
                <Text style={[styles.activityModalSubtitle, { color: textSecondaryColor }]}>
                  {formatActivityTime(selectedActivity.created_at || '')} • {selectedActivity.staff_name}
                </Text>
              </View>
            </View>

            <Divider style={{ marginVertical: spacing.md }} />

            {/* Staff Information */}
            <View style={styles.activityDetailSection}>
              <Text style={[styles.activityDetailTitle, { color: textColor }]}>👤 Staff Member</Text>
              <View style={styles.activityDetailItem}>
                <Text style={[styles.activityDetailLabel, { color: textSecondaryColor }]}>Name:</Text>
                <Text style={[styles.activityDetailValue, { color: textColor }]}>{selectedActivity.staff_name}</Text>
              </View>
              <View style={styles.activityDetailItem}>
                <Text style={[styles.activityDetailLabel, { color: textSecondaryColor }]}>Role:</Text>
                <Text style={[styles.activityDetailValue, { color: textColor }]}>{selectedActivity.staff_role}</Text>
              </View>
            </View>

            {/* Client Information */}
            {selectedActivity.client_name && (
              <>
                <Divider style={{ marginVertical: spacing.md }} />
                <View style={styles.activityDetailSection}>
                  <Text style={[styles.activityDetailTitle, { color: textColor }]}>🎯 Target Client</Text>
                  <View style={styles.activityDetailItem}>
                    <Text style={[styles.activityDetailLabel, { color: textSecondaryColor }]}>Client:</Text>
                    <Text style={[styles.activityDetailValue, { color: textColor }]}>{selectedActivity.client_name}</Text>
                  </View>
                </View>
              </>
            )}

            {/* Activity Details */}
            <Divider style={{ marginVertical: spacing.md }} />
            <View style={styles.activityDetailSection}>
              <Text style={[styles.activityDetailTitle, { color: textColor }]}>📋 Activity Details</Text>
              
              {/* Subscription Details */}
              {metadata.planName && (
                <>
                  <View style={styles.activityDetailItem}>
                    <Text style={[styles.activityDetailLabel, { color: textSecondaryColor }]}>Plan:</Text>
                    <Text style={[styles.activityDetailValue, { color: textColor }]}>{metadata.planName}</Text>
                  </View>
                  {metadata.monthlyPrice && metadata.monthlyPrice > 0 && (
                    <View style={styles.activityDetailItem}>
                      <Text style={[styles.activityDetailLabel, { color: textSecondaryColor }]}>Price:</Text>
                      <Text style={[styles.activityDetailValue, { color: textColor }]}>
                        {formatCurrencyALL(metadata.monthlyPrice)}/month
                      </Text>
                    </View>
                  )}
                  {metadata.monthlyClasses && metadata.monthlyClasses > 0 && (
                    <View style={styles.activityDetailItem}>
                      <Text style={[styles.activityDetailLabel, { color: textSecondaryColor }]}>Classes:</Text>
                      <Text style={[styles.activityDetailValue, { color: textColor }]}>
                        {metadata.monthlyClasses} classes/month
                      </Text>
                    </View>
                  )}
                </>
              )}

              {/* Operation Type for Conflict Resolution */}
              {metadata.operationType && (
                <View style={styles.activityDetailItem}>
                  <Text style={[styles.activityDetailLabel, { color: textSecondaryColor }]}>Operation:</Text>
                  <Text style={[styles.activityDetailValue, { color: textColor }]}>
                    {metadata.operationType.charAt(0).toUpperCase() + metadata.operationType.slice(1)}
                  </Text>
                </View>
              )}

              {/* Payment Information */}
              {metadata.paymentAmount && metadata.paymentAmount > 0 && (
                <View style={styles.activityDetailItem}>
                  <Text style={[styles.activityDetailLabel, { color: textSecondaryColor }]}>Payment:</Text>
                  <Text style={[styles.activityDetailValue, { color: successColor }]}>
                    {formatCurrencyALL(metadata.paymentAmount)}
                  </Text>
                </View>
              )}

              {/* Classes Added */}
              {metadata.classesAdded && (
                <View style={styles.activityDetailItem}>
                  <Text style={[styles.activityDetailLabel, { color: textSecondaryColor }]}>Classes Added:</Text>
                  <Text style={[styles.activityDetailValue, { color: textColor }]}>
                    +{metadata.classesAdded} classes
                  </Text>
                </View>
              )}

              {/* Instructor Information */}
              {metadata.instructorName && (
                <View style={styles.activityDetailItem}>
                  <Text style={[styles.activityDetailLabel, { color: textSecondaryColor }]}>Instructor:</Text>
                  <Text style={[styles.activityDetailValue, { color: textColor }]}>{metadata.instructorName}</Text>
                </View>
              )}

              {/* Notes */}
              {metadata.notes && (
                <View style={styles.activityDetailItem}>
                  <Text style={[styles.activityDetailLabel, { color: textSecondaryColor }]}>Notes:</Text>
                  <Text style={[styles.activityDetailValue, { color: textColor }]}>{metadata.notes}</Text>
                </View>
              )}

              {/* Conflict Resolution Details */}
              {metadata.conflictResolution && (
                <View style={styles.activityDetailItem}>
                  <Text style={[styles.activityDetailLabel, { color: textSecondaryColor }]}>Conflict Resolution:</Text>
                  <Text style={[styles.activityDetailValue, { color: textColor }]}>
                    {metadata.conflictResolution.charAt(0).toUpperCase() + metadata.conflictResolution.slice(1)}
                  </Text>
                </View>
              )}
            </View>

            {/* Impact Summary */}
            {(metadata.operationType || metadata.classesAdded || metadata.paymentAmount) && (
              <>
                <Divider style={{ marginVertical: spacing.md }} />
                <View style={styles.activityDetailSection}>
                  <Text style={[styles.activityDetailTitle, { color: textColor }]}>📊 Impact Summary</Text>
                  <View style={[styles.impactSummary, { backgroundColor: primaryColor + '10' }]}>
                    <Text style={[styles.impactText, { color: textColor }]}>
                      {selectedActivity.activity_type === 'subscription_added' && metadata.operationType === 'extended'
                        ? `Client's subscription was extended with ${metadata.classesAdded || 0} additional classes.`
                        : selectedActivity.activity_type === 'subscription_added' && metadata.operationType === 'replaced'
                        ? `Client's previous subscription was replaced with the new plan.`
                        : selectedActivity.activity_type === 'subscription_added' && metadata.operationType === 'queued'
                        ? `New subscription was queued to start after current subscription ends.`
                        : selectedActivity.activity_type === 'subscription_added'
                        ? `New subscription plan assigned to client.`
                        : selectedActivity.activity_type === 'instructor_assigned'
                        ? `Client is now assigned to instructor ${metadata.instructorName}.`
                        : selectedActivity.activity_type === 'instructor_unassigned'
                        ? `Client is no longer assigned to instructor ${metadata.instructorName}.`
                        : selectedActivity.activity_type === 'client_created'
                        ? `New ${metadata.role} account created in the system.`
                        : 'Activity completed successfully.'
                      }
                      {metadata.paymentAmount && metadata.paymentAmount > 0 && 
                        ` Payment of ${formatCurrencyALL(metadata.paymentAmount)} was processed.`
                      }
                    </Text>
                  </View>
                </View>
              </>
            )}
          </ScrollView>

          {/* Close Button */}
          <View style={styles.activityModalActions}>
            <Button 
              mode="contained" 
              onPress={() => setShowActivityDetails(false)}
              style={{ backgroundColor: primaryColor }}
            >
              Close
            </Button>
          </View>
        </Modal>
      </Portal>
    );
  };

  // Mobile layout warning - Admin portal is PC-optimized
  if (!isLargeScreen) {
    return (
      <View style={styles.mobileContainer}>
        <Text style={[styles.mobileWarning, { color: textColor }]}>
          📱 Admin Portal is optimized for PC use. 
          Please use a larger screen for the full experience.
        </Text>
      </View>
    );
  }

  // Main Desktop Dashboard
  return (
    <View style={[styles.container, { backgroundColor }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: surfaceColor }]}>
        <View style={styles.headerContent}>
          <View>
            <Text style={[styles.studioName, { color: textColor }]}>ANIMO Studio</Text>
            <Text style={[styles.todayText, { color: textSecondaryColor }]}>
              {getTodayFormatted()}
            </Text>
          </View>
          <TouchableOpacity 
            style={[styles.refreshButton, { backgroundColor: primaryColor }]}
            onPress={onRefresh}
          >
            <MaterialIcons name="refresh" size={20} color="white" />
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: textColor }]}>Loading dashboard...</Text>
          </View>
        ) : dashboardStats ? (
          <>
            {/* Today's Overview */}
            <PaperCard style={[styles.todayCard, { backgroundColor: surfaceColor }]}>
              <PaperCard.Content>
                <Text style={[styles.sectionTitle, { color: textColor }]}>📊 Today's Overview</Text>
                
                <View style={styles.todayGrid}>
                  <TouchableOpacity 
                    style={[styles.todayItem, { borderLeftColor: primaryColor }]}
                    onPress={() => handleNavigation('Classes')}
                  >
                    <MaterialIcons name="event" size={28} color={primaryColor} />
                    <View style={styles.todayItemContent}>
                    <Text style={[styles.todayNumber, { color: textColor }]}>
                      {dashboardStats.classes?.classesThisWeek || dashboardStats.overview?.classesThisWeek || 0}
                    </Text>
                      <Text style={[styles.todayLabel, { color: textSecondaryColor }]}>Classes Today</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.todayItem, { borderLeftColor: successColor }]}
                    onPress={() => handleNavigation('Reports')}
                  >
                    <MaterialIcons name="attach-money" size={28} color={successColor} />
                    <View style={styles.todayItemContent}>
                      <Text style={[styles.todayNumber, { color: textColor }]}>
                        {formatCurrency(dashboardStats.financial?.revenueToday || dashboardStats.financial?.revenueThisWeek || 0)}
                      </Text>
                      <Text style={[styles.todayLabel, { color: textSecondaryColor }]}>Today's Revenue</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.todayItem, { borderLeftColor: warningColor }]}
                    onPress={() => handleNavigation('Users')}
                  >
                    <MaterialIcons name="people" size={28} color={warningColor} />
                    <View style={styles.todayItemContent}>
                      <Text style={[styles.todayNumber, { color: textColor }]}>
                        {dashboardStats.clients?.newClientsThisWeek || dashboardStats.overview?.activeClients || 0}
                      </Text>
                      <Text style={[styles.todayLabel, { color: textSecondaryColor }]}>Clients Today</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.todayItem, { borderLeftColor: errorColor }]}
                    onPress={() => handleNavigation('Reports')}
                  >
                    <MaterialIcons name="warning" size={28} color={errorColor} />
                    <View style={styles.todayItemContent}>
                      <Text style={[styles.todayNumber, { color: textColor }]}>
                        {(dashboardStats.notifications?.expiringSubscriptions || 0) + (dashboardStats.notifications?.systemAlerts || 0)}
                      </Text>
                      <Text style={[styles.todayLabel, { color: textSecondaryColor }]}>Urgent Items</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </PaperCard.Content>
            </PaperCard>

            {/* Key Metrics */}
            <View style={styles.metricsRow}>
              <PaperCard style={[styles.metricCard, { backgroundColor: surfaceColor }]}>
                <PaperCard.Content>
                  <View style={styles.metricHeader}>
                    <MaterialIcons name="people" size={24} color={primaryColor} />
                    <Text style={[styles.metricTitle, { color: textColor }]}>Clients</Text>
                  </View>
                  <Text style={[styles.metricValue, { color: textColor }]}>
                    {dashboardStats.overview?.totalClients || 0}
                  </Text>
                  <Text style={[styles.metricSubtext, { color: textSecondaryColor }]}>
                    {dashboardStats.overview?.activeClients || 0} active • +{dashboardStats.clients?.newClientsThisMonth || 0} this month
                  </Text>
                  <TouchableOpacity 
                    style={styles.metricButton}
                    onPress={() => handleNavigation('Users')}
                  >
                    <Text style={[styles.metricButtonText, { color: primaryColor }]}>View All →</Text>
                  </TouchableOpacity>
                </PaperCard.Content>
              </PaperCard>

              <PaperCard style={[styles.metricCard, { backgroundColor: surfaceColor }]}>
                <PaperCard.Content>
                  <View style={styles.metricHeader}>
                    <MaterialIcons name="trending-up" size={24} color={successColor} />
                    <Text style={[styles.metricTitle, { color: textColor }]}>Revenue</Text>
                  </View>
                  <Text style={[styles.metricValue, { color: textColor }]}>
                    {formatCurrency(dashboardStats.financial?.revenueThisMonth || 0)}
                  </Text>
                  <Text style={[styles.metricSubtext, { color: textSecondaryColor }]}>
                    This month • {(dashboardStats.financial?.monthlyGrowth || 0) > 0 ? '+' : ''}{dashboardStats.financial?.monthlyGrowth || 0}% growth
                  </Text>
                  <TouchableOpacity 
                    style={styles.metricButton}
                    onPress={() => handleNavigation('Reports')}
                  >
                    <Text style={[styles.metricButtonText, { color: successColor }]}>View Reports →</Text>
                  </TouchableOpacity>
                </PaperCard.Content>
              </PaperCard>

              <PaperCard style={[styles.metricCard, { backgroundColor: surfaceColor }]}>
                <PaperCard.Content>
                  <View style={styles.metricHeader}>
                    <MaterialIcons name="event" size={24} color={warningColor} />
                    <Text style={[styles.metricTitle, { color: textColor }]}>Classes</Text>
                  </View>
                  <Text style={[styles.metricValue, { color: textColor }]}>
                    {dashboardStats.overview?.classesThisWeek || 0}
                  </Text>
                  <Text style={[styles.metricSubtext, { color: textSecondaryColor }]}>
                    This week • {dashboardStats.classes?.averageAttendance || 0}% avg attendance
                  </Text>
                  <TouchableOpacity 
                    style={styles.metricButton}
                    onPress={() => handleNavigation('Classes')}
                  >
                    <Text style={[styles.metricButtonText, { color: warningColor }]}>Manage →</Text>
                  </TouchableOpacity>
                </PaperCard.Content>
              </PaperCard>
            </View>

            {/* Quick Actions */}
            <PaperCard style={[styles.actionsCard, { backgroundColor: surfaceColor }]}>
              <PaperCard.Content>
                <Text style={[styles.sectionTitle, { color: textColor }]}>⚡ Quick Actions</Text>
                
                <View style={styles.actionsGrid}>
                  <TouchableOpacity 
                    style={[styles.actionItem, { backgroundColor: primaryColor + '10' }]}
                    onPress={() => handleNavigation('Users', { action: 'add' })}
                  >
                    <MaterialIcons name="person-add" size={32} color={primaryColor} />
                    <Text style={[styles.actionText, { color: primaryColor }]}>Add New Client</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.actionItem, { backgroundColor: successColor + '10' }]}
                    onPress={() => handleNavigation('Classes', { action: 'add' })}
                  >
                    <MaterialIcons name="add-circle" size={32} color={successColor} />
                    <Text style={[styles.actionText, { color: successColor }]}>Create Class</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.actionItem, { backgroundColor: warningColor + '10' }]}
                    onPress={() => handleNavigation('Reports')}
                  >
                    <MaterialIcons name="analytics" size={32} color={warningColor} />
                    <Text style={[styles.actionText, { color: warningColor }]}>View Analytics</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.actionItem, { backgroundColor: errorColor + '10' }]}
                    onPress={() => handleNavigation('Plans')}
                  >
                    <MaterialIcons name="card-membership" size={32} color={errorColor} />
                    <Text style={[styles.actionText, { color: errorColor }]}>Manage Plans</Text>
                  </TouchableOpacity>
                </View>
              </PaperCard.Content>
            </PaperCard>

            {/* Enhanced Recent Activity */}
            <PaperCard style={[styles.activityCard, { backgroundColor: surfaceColor }]}>
              <PaperCard.Content>
                <View style={styles.activityHeader}>
                  <Text style={[styles.sectionTitle, { color: textColor }]}>📊 Recent Activity</Text>
                  
                  {/* Enhanced Stats Row */}
                  {activityStats && (
                    <View style={styles.activityStatsRow}>
                      <View style={styles.activityStat}>
                        <Text style={[styles.activityStatNumber, { color: primaryColor }]}>
                          {activityStats.todayActivities}
                        </Text>
                        <Text style={[styles.activityStatLabel, { color: textSecondaryColor }]}>Today</Text>
                      </View>
                      <View style={styles.activityStat}>
                        <Text style={[styles.activityStatNumber, { color: successColor }]}>
                          {activityStats.weekActivities}
                        </Text>
                        <Text style={[styles.activityStatLabel, { color: textSecondaryColor }]}>This Week</Text>
                      </View>
                      <View style={styles.activityStat}>
                        <Text style={[styles.activityStatNumber, { color: warningColor }]}>
                          {activityStats.topStaffMember.name}
                        </Text>
                        <Text style={[styles.activityStatLabel, { color: textSecondaryColor }]}>Top Performer</Text>
                      </View>
                      <View style={styles.activityStat}>
                        <Text style={[styles.activityStatNumber, { color: '#2196F3' }]}>
                          {filteredActivities.length}
                        </Text>
                        <Text style={[styles.activityStatLabel, { color: textSecondaryColor }]}>Showing</Text>
                      </View>
                    </View>
                  )}

                  {/* Search and Filters */}
                  <View style={styles.activityControls}>
                    <View style={styles.activitySearchContainer}>
                      <MaterialIcons name="search" size={20} color={textMutedColor} />
                      <TextInput
                        style={[styles.activitySearchInput, { 
                          color: textColor,
                          backgroundColor: 'transparent',
                          borderWidth: 1,
                          borderColor: textMutedColor + '40',
                          borderRadius: 8,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          marginLeft: 8,
                          fontSize: 14,
                          flex: 1
                        }]}
                        placeholder="Search activities, staff, or clients..."
                        placeholderTextColor={textMutedColor}
                        value={activitySearchQuery}
                        onChangeText={setActivitySearchQuery}
                      />
                    </View>
                    
                    <View style={styles.activityFilters}>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>
                        {[
                          { key: 'all', label: 'All', icon: 'list' },
                          { key: 'today', label: 'Today', icon: 'today' },
                          { key: 'week', label: 'This Week', icon: 'date-range' },
                          { key: 'reception', label: 'Reception', icon: 'people' },
                          { key: 'instructor', label: 'Instructors', icon: 'school' },
                          { key: 'admin', label: 'Admin', icon: 'admin-panel-settings' }
                        ].map((filter) => (
                          <TouchableOpacity
                            key={filter.key}
                            style={[
                              styles.filterChip,
                              {
                                backgroundColor: activityFilter === filter.key ? primaryColor : 'transparent',
                                borderColor: activityFilter === filter.key ? primaryColor : textMutedColor + '40',
                                borderWidth: 1
                              }
                            ]}
                            onPress={() => setActivityFilter(filter.key)}
                          >
                            <MaterialIcons 
                              name={filter.icon as any} 
                              size={16} 
                              color={activityFilter === filter.key ? 'white' : textMutedColor} 
                            />
                            <Text style={[
                              styles.filterChipText,
                              { color: activityFilter === filter.key ? 'white' : textColor }
                            ]}>
                              {filter.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                      
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.filterScrollView, { marginTop: 8 }]}>
                        {[
                          { key: 'all', label: 'All Types', icon: 'category' },
                          { key: 'subscription', label: 'Subscriptions', icon: 'card-membership' },
                          { key: 'class', label: 'Classes', icon: 'event' },
                          { key: 'user', label: 'Users', icon: 'person' }
                        ].map((filter) => (
                          <TouchableOpacity
                            key={filter.key}
                            style={[
                              styles.filterChip,
                              {
                                backgroundColor: activityTypeFilter === filter.key ? successColor : 'transparent',
                                borderColor: activityTypeFilter === filter.key ? successColor : textMutedColor + '40',
                                borderWidth: 1
                              }
                            ]}
                            onPress={() => setActivityTypeFilter(filter.key)}
                          >
                            <MaterialIcons 
                              name={filter.icon as any} 
                              size={16} 
                              color={activityTypeFilter === filter.key ? 'white' : textMutedColor} 
                            />
                            <Text style={[
                              styles.filterChipText,
                              { color: activityTypeFilter === filter.key ? 'white' : textColor }
                            ]}>
                              {filter.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  </View>
                </View>
                
                {activitiesLoading ? (
                  <View style={styles.activityLoadingContainer}>
                    <Text style={[styles.activityLoadingText, { color: textSecondaryColor }]}>Loading activities...</Text>
                  </View>
                ) : filteredActivities.length > 0 ? (
                  <View style={styles.activitiesList}>
                    {(() => {
                      const groupedActivities = groupActivitiesByTime(filteredActivities);
                      const groups = [
                        { key: 'today', label: '📅 Today', activities: groupedActivities.today },
                        { key: 'yesterday', label: '📆 Yesterday', activities: groupedActivities.yesterday },
                        { key: 'thisWeek', label: '📊 This Week', activities: groupedActivities.thisWeek },
                        { key: 'older', label: '📋 Older', activities: groupedActivities.older }
                      ].filter(group => group.activities.length > 0);

                      return groups.map((group) => (
                        <View key={group.key} style={styles.activityTimeGroup}>
                          <TouchableOpacity 
                            style={styles.activityTimeGroupHeader}
                            onPress={() => toggleTimeGroup(group.key)}
                          >
                            <Text style={[styles.activityTimeGroupLabel, { color: textColor }]}>
                              {group.label} ({group.activities.length})
                            </Text>
                            <MaterialIcons 
                              name={expandedTimeGroups.has(group.key) ? 'expand-less' : 'expand-more'} 
                              size={24} 
                              color={textMutedColor} 
                            />
                          </TouchableOpacity>
                          
                          {expandedTimeGroups.has(group.key) && (
                            <View style={styles.activityTimeGroupContent}>
                              {group.activities.map((activity, index) => (
                                <TouchableOpacity 
                                  key={`${group.key}-activity-${index}`} 
                                  style={styles.activityItem}
                                  onPress={() => handleActivityClick(activity)}
                                  activeOpacity={0.7}
                                >
                                  <View style={[styles.activityIconContainer, { 
                                    backgroundColor: getActivityCategoryColor(activity.activity_type) + '20' 
                                  }]}>
                                    <MaterialIcons 
                                      name={getActivityCategoryIcon(activity.activity_type) as any} 
                                      size={18} 
                                      color={getActivityCategoryColor(activity.activity_type)} 
                                    />
                                  </View>
                                  <View style={styles.activityContent}>
                                    <View style={styles.activityMainInfo}>
                                      <Text style={[styles.activityDescription, { color: textColor }]}>
                                        {activity.activity_description}
                                      </Text>
                                      <Text style={[styles.activityTime, { color: textMutedColor }]}>
                                        {formatActivityTime(activity.created_at || '')}
                                      </Text>
                                    </View>
                                    <View style={styles.activityMetaInfo}>
                                      <View style={styles.activityStaffInfo}>
                                        <Text style={[styles.activityStaffName, { color: textSecondaryColor }]}>
                                          {activity.staff_name}
                                        </Text>
                                        <View style={[styles.activityRoleBadge, { 
                                          backgroundColor: activity.staff_role === 'reception' ? primaryColor + '20' : 
                                                         activity.staff_role === 'instructor' ? successColor + '20' : 
                                                         warningColor + '20' 
                                        }]}>
                                          <Text style={[styles.activityRoleText, { 
                                            color: activity.staff_role === 'reception' ? primaryColor : 
                                                   activity.staff_role === 'instructor' ? successColor : 
                                                   warningColor 
                                          }]}>
                                            {activity.staff_role}
                                          </Text>
                                        </View>
                                      </View>
                                      {activity.client_name && (
                                        <Text style={[styles.activityClientName, { color: textSecondaryColor }]}>
                                          Client: {activity.client_name}
                                        </Text>
                                      )}
                                    </View>
                                  </View>
                                  <View style={styles.activityClickIndicator}>
                                    <MaterialIcons name="chevron-right" size={20} color={textMutedColor} />
                                  </View>
                                </TouchableOpacity>
                              ))}
                            </View>
                          )}
                        </View>
                      ));
                    })()}
                  </View>
                ) : (
                  <View style={styles.noActivitiesContainer}>
                    <MaterialIcons name="history" size={48} color={textMutedColor} />
                    <Text style={[styles.noActivitiesText, { color: textMutedColor }]}>No recent activities</Text>
                    <Text style={[styles.noActivitiesSubtext, { color: textMutedColor }]}>
                      Staff actions will appear here as they perform tasks
                    </Text>
                  </View>
                )}
              </PaperCard.Content>
            </PaperCard>

          </>
        ) : (
          <View style={styles.errorContainer}>
            <Text style={[styles.errorText, { color: errorColor }]}>Failed to load dashboard data</Text>
          </View>
        )}
      </ScrollView>

      {/* Activity Details Modal */}
      {renderActivityDetails()}
    </View>
  );
}

const styles = StyleSheet.create({
  // Main Container
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },

  // Mobile Warning
  mobileContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  mobileWarning: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },

  // Header
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  studioName: {
    fontSize: 24,
    fontWeight: '700',
  },
  todayText: {
    fontSize: 14,
    marginTop: 4,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  refreshText: {
    color: 'white',
    marginLeft: spacing.xs,
    fontWeight: '600',
  },

  // Loading & Error
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    fontSize: 16,
  },

  // Section Title
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.md,
  },

  // Today's Overview
  todayCard: {
    marginBottom: spacing.lg,
    borderRadius: 12,
    elevation: 2,
  },
  todayGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  todayItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  todayItemContent: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  todayNumber: {
    fontSize: 20,
    fontWeight: '700',
  },
  todayLabel: {
    fontSize: 12,
    marginTop: 2,
  },

  // Metrics Row
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  metricCard: {
    flex: 1,
    borderRadius: 12,
    elevation: 2,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  metricTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  metricSubtext: {
    fontSize: 13,
    marginBottom: spacing.md,
  },
  metricButton: {
    alignSelf: 'flex-start',
  },
  metricButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Quick Actions
  actionsCard: {
    marginBottom: spacing.lg,
    borderRadius: 12,
    elevation: 2,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionItem: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: spacing.sm,
    textAlign: 'center',
  },

  // Recent Activity Styles
  activityCard: {
    marginBottom: spacing.lg,
    borderRadius: 12,
    elevation: 2,
  },
  activityHeader: {
    marginBottom: spacing.md,
  },
  activityStatsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  activityStat: {
    alignItems: 'center',
  },
  activityStatNumber: {
    fontSize: 18,
    fontWeight: '700',
  },
  activityStatLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  activityLoadingContainer: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  activityLoadingText: {
    fontSize: 14,
  },
  activitiesList: {
    gap: spacing.sm,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#e0e0e0',
  },
  activityIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  activityContent: {
    flex: 1,
  },
  activityMainInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  activityDescription: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    marginRight: spacing.sm,
  },
  activityTime: {
    fontSize: 12,
    fontWeight: '400',
  },
  activityMetaInfo: {
    gap: spacing.xs,
  },
  activityStaffInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  activityStaffName: {
    fontSize: 13,
    fontWeight: '500',
  },
  activityRoleBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activityRoleText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  activityClientName: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  noActivitiesContainer: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  noActivitiesText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  noActivitiesSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: spacing.xs,
  },

  // Activity Details Modal Styles
  activityModal: {
    margin: isLargeScreen ? spacing.xl * 2 : spacing.lg,
    maxHeight: isLargeScreen ? '85%' : '80%',
    maxWidth: isLargeScreen ? 800 : '100%',
    alignSelf: 'center',
    borderRadius: 12,
    padding: isLargeScreen ? spacing.xl : spacing.lg,
    elevation: isLargeScreen ? 8 : 4,
  },
  activityModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  activityModalHeaderText: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  activityModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  activityModalSubtitle: {
    fontSize: 14,
  },
  activityDetailSection: {
    marginBottom: spacing.md,
  },
  activityDetailTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  activityDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  activityDetailLabel: {
    fontSize: 14,
    flex: 1,
  },
  activityDetailValue: {
    fontSize: 14,
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  impactSummary: {
    padding: spacing.md,
    borderRadius: 8,
    marginTop: spacing.sm,
  },
  impactText: {
    fontSize: 14,
    lineHeight: 20,
  },
  activityModalActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  activityClickIndicator: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: spacing.sm,
  },

  // Enhanced Activity Styles
  activityControls: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  activitySearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  activitySearchInput: {
    flex: 1,
    height: 40,
  },
  activityFilters: {
    marginTop: spacing.sm,
  },
  filterScrollView: {
    paddingHorizontal: spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    minHeight: 32,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  activityTimeGroup: {
    marginBottom: spacing.md,
  },
  activityTimeGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    marginBottom: spacing.xs,
  },
  activityTimeGroupLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  activityTimeGroupContent: {
    paddingLeft: spacing.sm,
  },

});

export default AdminDashboard;