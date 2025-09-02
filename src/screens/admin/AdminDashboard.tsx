import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { Alert, Dimensions, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Chip, Button as PaperButton, Card as PaperCard, ProgressBar, SegmentedButtons } from 'react-native-paper';
import { useDispatch } from 'react-redux';
import { Body, Caption, H1, H2, H3 } from '../../../components/ui/Typography';
import { spacing } from '../../../constants/Spacing';
import { useThemeColor } from '../../../hooks/useThemeColor';
import { dashboardService, DashboardStats, DateRange, QuickAction } from '../../services/dashboardService';
import { realTimeDashboardService } from '../../services/realTimeDashboardService';
import { AppDispatch } from '../../store';

const { width: screenWidth } = Dimensions.get('window');
const isLargeScreen = screenWidth > 1024;

function AdminDashboard({ onNavigate }: { onNavigate?: (screenKey: string) => void } = {}) {
  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const surfaceColor = useThemeColor({}, 'surface');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const textMutedColor = useThemeColor({}, 'textMuted');
  const primaryColor = useThemeColor({}, 'primary');
  const accentColor = useThemeColor({}, 'accent');
  const successColor = useThemeColor({}, 'success');
  const warningColor = useThemeColor({}, 'warning');
  const errorColor = useThemeColor({}, 'error');

  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [quickActions, setQuickActions] = useState<QuickAction[]>([]);
  const [dateFilter, setDateFilter] = useState<'week' | 'month' | 'year' | 'all'>('month');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  // Real-time dashboard state
  const [liveMetrics, setLiveMetrics] = useState<any>(null);
  const [lastLiveUpdate, setLastLiveUpdate] = useState<Date>(new Date());

  useEffect(() => {
    loadDashboardData();

    // Initialize real-time dashboard
    realTimeDashboardService.startPolling((metrics) => {
      setLiveMetrics(metrics);
      setLastLiveUpdate(new Date());
    }, 30000); // 30 second intervals

    // Cleanup on unmount
    return () => {
      realTimeDashboardService.stopPolling();
    };
  }, []);

  useEffect(() => {
    if (dateFilter !== 'all') {
      updateDateRange(dateFilter);
    } else {
      setDateRange(undefined);
      loadDashboardData();
    }
  }, [dateFilter]);

  const updateDateRange = (filter: 'week' | 'month' | 'year') => {
    // Get current date in local timezone to avoid UTC conversion issues
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const date = now.getDate();
    
    let startYear: number, startMonth: number, startDate: number;
    let endYear: number, endMonth: number, endDate: number;
    
    switch (filter) {
      case 'week':
        // Calculate 7 days ago
        const weekAgo = new Date(year, month, date - 7);
        startYear = weekAgo.getFullYear();
        startMonth = weekAgo.getMonth();
        startDate = weekAgo.getDate();
        endYear = year;
        endMonth = month;
        endDate = date;
        break;
      case 'month':
        // Start from the first day of the current month
        startYear = year;
        startMonth = month;
        startDate = 1;
        // End at the current date (today)
        endYear = year;
        endMonth = month;
        endDate = date;
        break;
      case 'year':
        // Start from January 1st of current year
        startYear = year;
        startMonth = 0; // January
        startDate = 1;
        // End at the current date (today)
        endYear = year;
        endMonth = month;
        endDate = date;
        break;
      default:
        return;
    }
    
    // Format dates directly as strings to avoid timezone conversion issues
    const newDateRange = {
      start: `${startYear}-${(startMonth + 1).toString().padStart(2, '0')}-${startDate.toString().padStart(2, '0')}`,
      end: `${endYear}-${(endMonth + 1).toString().padStart(2, '0')}-${endDate.toString().padStart(2, '0')}`
    };
    
    console.log('📅 AdminDashboard - Updated date range for filter:', filter, {
      ...newDateRange,
      debug: {
        today: `${year}-${(month + 1).toString().padStart(2, '0')}-${date.toString().padStart(2, '0')}`,
        filter,
        startComponents: `${startYear}-${(startMonth + 1).toString().padStart(2, '0')}-${startDate.toString().padStart(2, '0')}`,
        endComponents: `${endYear}-${(endMonth + 1).toString().padStart(2, '0')}-${endDate.toString().padStart(2, '0')}`
      }
    });
    setDateRange(newDateRange);
    loadDashboardData(newDateRange);
  };

  const loadDashboardData = async (customDateRange?: DateRange) => {
    try {
      setLoading(true);
      console.log('📊 Loading dashboard data...');
      
      const response = await dashboardService.getDashboardStats(customDateRange || dateRange);
      
      if (response.success && response.data) {
        setDashboardStats(response.data);
        const actions = dashboardService.getQuickActions(response.data);
        setQuickActions(actions);
        console.log('✅ Dashboard data loaded successfully');
      } else {
        console.error('Failed to load dashboard data:', response.error);
        Alert.alert('Error', 'Failed to load dashboard data. Please try again.');
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const handleQuickAction = (action: QuickAction) => {
    console.log('🔗 Navigating to:', action.route, action.params);
    
    try {
      // For PC layout, use callback navigation
      if (isLargeScreen && onNavigate) {
        switch (action.route) {
          case 'ClassManagement':
            onNavigate('Classes');
            break;
          case 'UserManagement':
            onNavigate('Users');
            break;
          case 'SubscriptionPlans':
            onNavigate('Plans');
            break;
          case 'RevenueAnalytics':
            onNavigate('Settings'); // Reports screen removed, redirect to Settings
            break;
          case 'Notifications':
            onNavigate('Notifications');
            break;
          default:
            console.log('Unknown route:', action.route);
        }
      } else {
        // For mobile layout, use tab navigation
        switch (action.route) {
          case 'ClassManagement':
            (navigation as any).navigate('Classes');
            break;
          case 'UserManagement':
            (navigation as any).navigate('Users');
            break;
          case 'SubscriptionPlans':
            (navigation as any).navigate('Plans');
            break;
          case 'RevenueAnalytics':
            (navigation as any).navigate('Settings'); // Reports screen removed, redirect to Settings
            break;
          case 'Notifications':
            (navigation as any).navigate('Notifications');
            break;
          default:
            console.log('Unknown route:', action.route);
        }
      }
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Error', 'Unable to navigate. Please try again.');
    }
  };

  const handleStatCardPress = (type: string, data?: any) => {
    console.log('📊 Stat card pressed:', type, data);
    
    if (isLargeScreen && onNavigate) {
      // PC layout navigation
      switch (type) {
        case 'clients':
        case 'instructors':
          onNavigate('Users');
          break;
        case 'classes':
          onNavigate('Classes');
          break;
        case 'revenue':
          onNavigate('Reports');
          break;
        case 'subscriptions':
          onNavigate('Plans');
          break;
        default:
          console.log('Unknown stat type:', type);
      }
    } else {
      // Mobile tab navigation
      switch (type) {
        case 'clients':
        case 'instructors':
          (navigation as any).navigate('Users', { filter: type });
          break;
        case 'classes':
          (navigation as any).navigate('Classes');
          break;
        case 'revenue':
          (navigation as any).navigate('Reports', { tab: 'revenue' });
          break;
        case 'subscriptions':
          (navigation as any).navigate('Plans');
          break;
        default:
          console.log('Unknown stat type:', type);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  // Mobile layout warning - Admin portal is PC-optimized
  if (!isLargeScreen) {
    return (
      <View style={styles.mobileContainer}>
        <Text style={styles.mobileWarning}>
          📱 Admin Portal is optimized for PC use. 
          Please use a larger screen (desktop/laptop) for the full experience.
        </Text>
        <ScrollView 
          style={styles.mobileContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={[styles.loadingText, { color: textColor }]}>Loading dashboard...</Text>
            </View>
          ) : dashboardStats ? (
            <>
              {/* Mobile Overview */}
              <PaperCard style={[styles.mobileCard, { backgroundColor: surfaceColor }]}>
                <PaperCard.Content>
                  <H2 style={{...styles.cardTitle, color: textColor}}>Studio Overview</H2>
                  <View style={styles.mobileMetricsGrid}>
                    <TouchableOpacity 
                      style={[styles.mobileMetricItem, { backgroundColor: surfaceColor }]}
                      onPress={() => handleStatCardPress('clients')}
                    >
                      <MaterialIcons name="people" size={20} color={accentColor} />
                      <Body style={{...styles.mobileMetricNumber, color: textColor}}>
                        {dashboardStats.overview.totalClients}
                      </Body>
                      <Caption style={{...styles.mobileMetricLabel, color: textSecondaryColor}}>
                        Total Clients
                      </Caption>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.mobileMetricItem, { backgroundColor: surfaceColor }]}
                      onPress={() => handleStatCardPress('classes')}
                    >
                      <MaterialIcons name="event" size={20} color={accentColor} />
                      <Body style={{...styles.mobileMetricNumber, color: textColor}}>
                        {dashboardStats.overview.classesThisWeek}
                      </Body>
                      <Caption style={{...styles.mobileMetricLabel, color: textSecondaryColor}}>
                        Classes This Week
                      </Caption>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.mobileMetricItem, { backgroundColor: surfaceColor }]}
                      onPress={() => handleStatCardPress('revenue')}
                    >
                      <MaterialIcons name="attach-money" size={20} color={accentColor} />
                      <Body style={{...styles.mobileMetricNumber, color: textColor}}>
                        {formatCurrency(dashboardStats.financial.revenueThisMonth)}
                      </Body>
                      <Caption style={{...styles.mobileMetricLabel, color: textSecondaryColor}}>
                        Monthly Revenue
                      </Caption>
                    </TouchableOpacity>
                  </View>
                </PaperCard.Content>
              </PaperCard>

              {/* Mobile Quick Actions */}
              <PaperCard style={[styles.mobileCard, { backgroundColor: surfaceColor }]}>
                <PaperCard.Content>
                  <H2 style={{...styles.cardTitle, color: textColor}}>Quick Actions</H2>
                  <View style={styles.mobileActionButtons}>
                    {quickActions.slice(0, 4).map(action => (
                      <PaperButton 
                        key={action.id}
                        mode={action.id === 'manage_classes' ? "contained" : "outlined"}
                        style={action.id === 'manage_classes' ? styles.mobilePrimaryAction : styles.mobileSecondaryAction}
                        labelStyle={styles.mobileActionLabel}
                        onPress={() => handleQuickAction(action)}
                      >
                        {action.title}
                      </PaperButton>
                    ))}
                  </View>
                </PaperCard.Content>
              </PaperCard>
            </>
          ) : (
            <View style={styles.errorContainer}>
              <Text style={[styles.errorText, { color: errorColor }]}>
                Failed to load dashboard data. Please refresh.
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // Desktop layout - Comprehensive Admin Dashboard
  return (
    <View style={[styles.container, { backgroundColor }]}>
      {/* Enhanced Header with Date Filters */}
      <View style={[styles.header, { backgroundColor: surfaceColor, borderBottomColor: textMutedColor }]}>
        <View style={styles.headerTop}>
          <View style={styles.headerInfo}>
            <H1 style={{...styles.headerTitle, color: textColor}}>ANIMO Studio</H1>
            <Caption style={{...styles.headerSubtitle, color: textSecondaryColor}}>
              Administrator Dashboard • {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
              })}
            </Caption>
          </View>
          
          {/* Date Filter Controls */}
          <View style={styles.dateFilters}>
            <SegmentedButtons
              value={dateFilter}
              onValueChange={(value) => setDateFilter(value as any)}
              buttons={[
                { value: 'week', label: 'Week' },
                { value: 'month', label: 'Month' },
                { value: 'year', label: 'Year' },
                { value: 'all', label: 'All Time' }
              ]}
              style={styles.segmentedButtons}
            />
          </View>
        </View>

        {/* System Alerts */}
        {dashboardStats?.notifications?.systemAlerts && dashboardStats.notifications.systemAlerts > 0 && (
          <View style={[styles.alertBanner, { backgroundColor: errorColor + '20' }]}>
            <MaterialIcons name="warning" size={16} color={errorColor} />
            <Caption style={{...styles.alertText, color: errorColor}}>
              {dashboardStats.notifications.systemAlerts} system alerts require attention
            </Caption>
            <TouchableOpacity onPress={() => handleQuickAction({ 
              id: 'notifications', title: 'View Alerts', description: '', icon: 'notifications', color: errorColor, route: 'Notifications' 
            })}>
              <Caption style={{...styles.alertAction, color: errorColor}}>View →</Caption>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: textColor }]}>Loading comprehensive dashboard...</Text>
          </View>
        ) : dashboardStats ? (
          <>
            {/* Key Performance Indicators Grid */}
            <View style={styles.kpiGrid}>
              <TouchableOpacity 
                style={[styles.kpiCard, { backgroundColor: surfaceColor }]}
                onPress={() => handleStatCardPress('clients')}
              >
                <View style={styles.kpiHeader}>
                  <MaterialIcons name="people" size={28} color={primaryColor} />
                  <View style={styles.kpiTrend}>
                    <MaterialIcons name="trending-up" size={16} color={successColor} />
                    <Caption style={{...styles.kpiTrendText, color: successColor}}>
                      +{dashboardStats.clients.newClientsThisMonth}
                    </Caption>
                  </View>
                </View>
                <H2 style={{...styles.kpiNumber, color: textColor}}>
                  {dashboardStats.overview.totalClients}
                </H2>
                <Caption style={{...styles.kpiLabel, color: textSecondaryColor}}>Total Clients</Caption>
                <Caption style={{...styles.kpiSubLabel, color: textMutedColor}}>
                  {dashboardStats.overview.activeClients} active this month
                </Caption>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.kpiCard, { backgroundColor: surfaceColor }]}
                onPress={() => handleStatCardPress('revenue')}
              >
                <View style={styles.kpiHeader}>
                  <MaterialIcons name="attach-money" size={28} color={successColor} />
                  <View style={styles.kpiTrend}>
                    <MaterialIcons 
                      name={dashboardStats.financial.monthlyGrowth >= 0 ? "trending-up" : "trending-down"} 
                      size={16} 
                      color={dashboardStats.financial.monthlyGrowth >= 0 ? successColor : errorColor} 
                    />
                    <Caption style={{
                      ...styles.kpiTrendText, 
                      color: dashboardStats.financial.monthlyGrowth >= 0 ? successColor : errorColor
                    }}>
                      {dashboardStats.financial.monthlyGrowth > 0 ? '+' : ''}{dashboardStats.financial.monthlyGrowth}%
                    </Caption>
                  </View>
                </View>
                <H2 style={{...styles.kpiNumber, color: textColor}}>
                  {formatCurrency(dashboardStats.financial.revenueThisMonth)}
                </H2>
                <Caption style={{...styles.kpiLabel, color: textSecondaryColor}}>Monthly Revenue</Caption>
                <Caption style={{...styles.kpiSubLabel, color: textMutedColor}}>
                  {formatCurrency(dashboardStats.financial.revenueThisWeek)} this week
                </Caption>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.kpiCard, { backgroundColor: surfaceColor }]}
                onPress={() => handleStatCardPress('classes')}
              >
                <View style={styles.kpiHeader}>
                  <MaterialIcons name="event" size={28} color={accentColor} />
                  <View style={styles.kpiTrend}>
                    <MaterialIcons name="schedule" size={16} color={warningColor} />
                    <Caption style={{...styles.kpiTrendText, color: warningColor}}>
                      {dashboardStats.classes.upcomingClasses} upcoming
                    </Caption>
                  </View>
                </View>
                <H2 style={{...styles.kpiNumber, color: textColor}}>
                  {dashboardStats.overview.classesThisWeek}
                </H2>
                <Caption style={{...styles.kpiLabel, color: textSecondaryColor}}>Classes This Week</Caption>
                <Caption style={{...styles.kpiSubLabel, color: textMutedColor}}>
                  {dashboardStats.classes.averageAttendance}% average attendance
                </Caption>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.kpiCard, { backgroundColor: surfaceColor }]}
                onPress={() => handleStatCardPress('subscriptions')}
              >
                <View style={styles.kpiHeader}>
                  <MaterialIcons name="card-membership" size={28} color={warningColor} />
                  <View style={styles.kpiTrend}>
                    <MaterialIcons name="notifications" size={16} color={errorColor} />
                    <Caption style={{...styles.kpiTrendText, color: errorColor}}>
                      {dashboardStats.notifications.expiringSubscriptions} expiring
                    </Caption>
                  </View>
                </View>
                <H2 style={{...styles.kpiNumber, color: textColor}}>
                  {dashboardStats.financial.activeSubscriptions}
                </H2>
                <Caption style={{...styles.kpiLabel, color: textSecondaryColor}}>Active Subscriptions</Caption>
                <Caption style={{...styles.kpiSubLabel, color: textMutedColor}}>
                  {formatCurrency(dashboardStats.financial.subscriptionRevenue)} monthly
                </Caption>
              </TouchableOpacity>
            </View>

            {/* Real-Time Activity Section */}
            {liveMetrics && (
              <PaperCard style={[styles.analyticsCard, { backgroundColor: surfaceColor }]}>
                <PaperCard.Content>
                  <View style={styles.cardHeader}>
                    <View style={styles.liveHeader}>
                      <H3 style={{...styles.cardTitle, color: textColor}}>Live Activity</H3>
                      <View style={styles.liveIndicator}>
                        <View style={[styles.liveDot, { backgroundColor: successColor }]} />
                        <Caption style={{...styles.liveText, color: textMutedColor}}>
                          Updated {lastLiveUpdate.toLocaleTimeString()}
                        </Caption>
                      </View>
                    </View>
                    <TouchableOpacity>
                      <Caption style={{...styles.viewMoreButton, color: primaryColor}}>View All →</Caption>
                    </TouchableOpacity>
                  </View>

                  {/* Live Metrics Row */}
                  <View style={styles.liveMetricsRow}>
                    <View style={styles.liveMetric}>
                      <MaterialIcons name="people" size={20} color={primaryColor} />
                      <View style={styles.liveMetricContent}>
                        <Body style={{...styles.liveMetricNumber, color: textColor}}>
                          {liveMetrics.activeUsers}
                        </Body>
                        <Caption style={{...styles.liveMetricLabel, color: textSecondaryColor}}>
                          Active Users
                        </Caption>
                      </View>
                    </View>

                    <View style={styles.liveMetric}>
                      <MaterialIcons name="attach-money" size={20} color={successColor} />
                      <View style={styles.liveMetricContent}>
                        <Body style={{...styles.liveMetricNumber, color: textColor}}>
                          {formatCurrency(liveMetrics.liveRevenue.totalToday)}
                        </Body>
                        <Caption style={{...styles.liveMetricLabel, color: textSecondaryColor}}>
                          Today's Revenue
                        </Caption>
                      </View>
                    </View>

                    <View style={styles.liveMetric}>
                      <MaterialIcons name="event" size={20} color={accentColor} />
                      <View style={styles.liveMetricContent}>
                        <Body style={{...styles.liveMetricNumber, color: textColor}}>
                          {liveMetrics.classesToday}
                        </Body>
                        <Caption style={{...styles.liveMetricLabel, color: textSecondaryColor}}>
                          Classes Today
                        </Caption>
                      </View>
                    </View>
                  </View>

                  {/* Class Capacity & Alerts */}
                  <View style={styles.liveDetailsRow}>
                    {/* Current Class Capacity */}
                    {liveMetrics.currentClassCapacity && liveMetrics.currentClassCapacity.length > 0 && (
                      <View style={styles.liveDetailSection}>
                        <Caption style={{...styles.liveSectionTitle, color: textSecondaryColor}}>
                          Class Capacity
                        </Caption>
                        {liveMetrics.currentClassCapacity.slice(0, 2).map((classInfo: any) => (
                          <View key={classInfo.classId} style={styles.classCapacityItem}>
                            <View style={styles.classInfo}>
                              <Text style={{...styles.className, color: textColor}}>
                                {classInfo.className}
                              </Text>
                              <Text style={{...styles.classDetails, color: textMutedColor}}>
                                {classInfo.instructorName} • {classInfo.startTime}
                              </Text>
                            </View>
                            <View style={styles.capacityDisplay}>
                              <Text style={{...styles.capacityText, color: textSecondaryColor}}>
                                {classInfo.currentCapacity}/{classInfo.maxCapacity}
                              </Text>
                              <ProgressBar
                                progress={
                                  classInfo.maxCapacity > 0
                                    ? classInfo.currentCapacity / classInfo.maxCapacity
                                    : 0
                                }
                                color={
                                  classInfo.currentCapacity >= classInfo.maxCapacity
                                    ? errorColor
                                    : classInfo.currentCapacity / classInfo.maxCapacity > 0.8
                                    ? warningColor
                                    : successColor
                                }
                                style={styles.capacityBar}
                              />
                            </View>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* System Alerts */}
                    {liveMetrics.systemAlerts && liveMetrics.systemAlerts.length > 0 && (
                      <View style={styles.liveDetailSection}>
                        <Caption style={{...styles.liveSectionTitle, color: textSecondaryColor}}>
                          Alerts
                        </Caption>
                        {liveMetrics.systemAlerts.slice(0, 2).map((alert: any) => (
                          <View key={alert.id} style={styles.alertItem}>
                            <MaterialIcons
                              name={alert.type === 'error' ? 'error' : alert.type === 'warning' ? 'warning' : 'info'}
                              size={16}
                              color={alert.type === 'error' ? errorColor : alert.type === 'warning' ? warningColor : primaryColor}
                            />
                            <Text style={{...styles.alertMessage, color: textColor}} numberOfLines={2}>
                              {alert.message}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </PaperCard.Content>
              </PaperCard>
            )}

            {/* Financial Analytics Section */}
            <PaperCard style={[styles.analyticsCard, { backgroundColor: surfaceColor }]}>
              <PaperCard.Content>
                <View style={styles.cardHeader}>
                  <H3 style={{...styles.cardTitle, color: textColor}}>Financial Analytics</H3>
                  <TouchableOpacity onPress={() => handleStatCardPress('revenue')}>
                    <Caption style={{...styles.viewMoreButton, color: primaryColor}}>View Details →</Caption>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.financialGrid}>
                  <View style={styles.financialMetric}>
                    <Body style={{...styles.financialAmount, color: textColor}}>
                      {formatCurrency(dashboardStats.financial.totalRevenue)}
                    </Body>
                    <Caption style={{...styles.financialLabel, color: textSecondaryColor}}>Total Revenue</Caption>
                  </View>
                  <View style={styles.financialMetric}>
                    <Body style={{...styles.financialAmount, color: textColor}}>
                      {formatCurrency(dashboardStats.financial.averageMonthlyRevenue)}
                    </Body>
                    <Caption style={{...styles.financialLabel, color: textSecondaryColor}}>Avg. Monthly</Caption>
                  </View>
                  <View style={styles.financialMetric}>
                    <Body style={{...styles.financialAmount, color: textColor}}>
                      {dashboardStats.financial.oneTimePayments}
                    </Body>
                    <Caption style={{...styles.financialLabel, color: textSecondaryColor}}>One-time Payments</Caption>
                  </View>
                </View>

                {/* Top Plans */}
                <View style={styles.topPlansSection}>
                  <Caption style={{...styles.sectionSubheading, color: textSecondaryColor}}>Top Subscription Plans</Caption>
                  {dashboardStats.financial.topPlans.slice(0, 3).map((plan, index) => (
                    <View key={index} style={styles.planItem}>
                      <View style={styles.planInfo}>
                        <Body style={{...styles.planName, color: textColor}}>{plan.planName}</Body>
                        <Caption style={{...styles.planStats, color: textMutedColor}}>
                          {plan.count} subscribers • {formatCurrency(plan.revenue)} revenue
                        </Caption>
                      </View>
                      <Chip 
                        style={[styles.planChip, { backgroundColor: primaryColor + '20' }]}
                        textStyle={{...styles.planChipText, color: primaryColor}}
                      >
                        #{index + 1}
                      </Chip>
                    </View>
                  ))}
                </View>
              </PaperCard.Content>
            </PaperCard>

            {/* Class Analytics Section */}
            <PaperCard style={[styles.analyticsCard, { backgroundColor: surfaceColor }]}>
              <PaperCard.Content>
                <View style={styles.cardHeader}>
                  <H3 style={{...styles.cardTitle, color: textColor}}>Class Analytics</H3>
                  <TouchableOpacity onPress={() => handleStatCardPress('classes')}>
                    <Caption style={{...styles.viewMoreButton, color: primaryColor}}>Manage Classes →</Caption>
                  </TouchableOpacity>
                </View>

                <View style={styles.classStatsGrid}>
                  <View style={styles.classStatItem}>
                    <MaterialIcons name="trending-up" size={20} color={successColor} />
                    <Body style={{...styles.classStatNumber, color: textColor}}>
                      {dashboardStats.classes.averageAttendance}%
                    </Body>
                    <Caption style={{...styles.classStatLabel, color: textSecondaryColor}}>Average Attendance</Caption>
                  </View>
                  <View style={styles.classStatItem}>
                    <MaterialIcons name="star" size={20} color={warningColor} />
                    <Body style={{...styles.classStatNumber, color: textColor}}>
                      {dashboardStats.classes.mostPopularClass}
                    </Body>
                    <Caption style={{...styles.classStatLabel, color: textSecondaryColor}}>Most Popular</Caption>
                  </View>
                  <View style={styles.classStatItem}>
                    <MaterialIcons name="fitness-center" size={20} color={accentColor} />
                    <Body style={{...styles.classStatNumber, color: textColor}}>
                      {dashboardStats.classes.equipmentUsage.reformer}
                    </Body>
                    <Caption style={{...styles.classStatLabel, color: textSecondaryColor}}>Reformer Classes</Caption>
                  </View>
                </View>

                {/* Instructor Performance */}
                <View style={styles.instructorSection}>
                  <Caption style={{...styles.sectionSubheading, color: textSecondaryColor}}>Instructor Performance</Caption>
                  {dashboardStats.classes.instructorStats.slice(0, 3).map((instructor, index) => (
                    <View key={index} style={styles.instructorItem}>
                      <View style={styles.instructorInfo}>
                        <Body style={{...styles.instructorName, color: textColor}}>{instructor.instructorName}</Body>
                        <Caption style={{...styles.instructorStats, color: textMutedColor}}>
                          {instructor.totalClasses} classes • {instructor.averageAttendance}% attendance
                        </Caption>
                      </View>
                      <View style={styles.instructorRating}>
                        <MaterialIcons name="star" size={16} color={warningColor} />
                        <Caption style={{...styles.ratingText, color: textColor}}>{instructor.rating}</Caption>
                      </View>
                    </View>
                  ))}
                </View>
              </PaperCard.Content>
            </PaperCard>

            {/* Client Analytics Section */}
            <PaperCard style={[styles.analyticsCard, { backgroundColor: surfaceColor }]}>
              <PaperCard.Content>
                <View style={styles.cardHeader}>
                  <H3 style={{...styles.cardTitle, color: textColor}}>Client Analytics</H3>
                  <TouchableOpacity onPress={() => handleStatCardPress('clients')}>
                    <Caption style={{...styles.viewMoreButton, color: primaryColor}}>Manage Clients →</Caption>
                  </TouchableOpacity>
                </View>

                <View style={styles.clientStatsGrid}>
                  <View style={styles.clientStatItem}>
                    <MaterialIcons name="person-add" size={20} color={successColor} />
                    <Body style={{...styles.clientStatNumber, color: textColor}}>
                      +{dashboardStats.clients.newClientsThisMonth}
                    </Body>
                    <Caption style={{...styles.clientStatLabel, color: textSecondaryColor}}>New This Month</Caption>
                  </View>
                  <View style={styles.clientStatItem}>
                    <MaterialIcons name="loyalty" size={20} color={primaryColor} />
                    <Body style={{...styles.clientStatNumber, color: textColor}}>
                      {dashboardStats.clients.clientRetentionRate}%
                    </Body>
                    <Caption style={{...styles.clientStatLabel, color: textSecondaryColor}}>Retention Rate</Caption>
                  </View>
                  <View style={styles.clientStatItem}>
                    <MaterialIcons name="fitness-center" size={20} color={accentColor} />
                    <Body style={{...styles.clientStatNumber, color: textColor}}>
                      {dashboardStats.clients.averageClassesPerClient}
                    </Body>
                    <Caption style={{...styles.clientStatLabel, color: textSecondaryColor}}>Avg. Classes/Client</Caption>
                  </View>
                </View>

                {/* Subscription Status Breakdown */}
                <View style={styles.subscriptionBreakdown}>
                  <Caption style={{...styles.sectionSubheading, color: textSecondaryColor}}>Subscription Status</Caption>
                  <View style={styles.subscriptionStats}>
                    <View style={styles.subscriptionStat}>
                      <View style={[styles.statusDot, { backgroundColor: successColor }]} />
                      <Caption style={{...styles.statusText, color: textColor}}>
                        Active: {dashboardStats.clients.subscriptionStatus.active}
                      </Caption>
                    </View>
                    <View style={styles.subscriptionStat}>
                      <View style={[styles.statusDot, { backgroundColor: warningColor }]} />
                      <Caption style={{...styles.statusText, color: textColor}}>
                        Expired: {dashboardStats.clients.subscriptionStatus.expired}
                      </Caption>
                    </View>
                    <View style={styles.subscriptionStat}>
                      <View style={[styles.statusDot, { backgroundColor: errorColor }]} />
                      <Caption style={{...styles.statusText, color: textColor}}>
                        Cancelled: {dashboardStats.clients.subscriptionStatus.cancelled}
                      </Caption>
                    </View>
                  </View>
                </View>
              </PaperCard.Content>
            </PaperCard>

            {/* Quick Actions Grid */}
            <View style={styles.quickActionsGrid}>
              {quickActions.map(action => (
                <TouchableOpacity 
                  key={action.id}
                  style={[styles.quickActionCard, { backgroundColor: surfaceColor }]}
                  onPress={() => handleQuickAction(action)}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: action.color + '20' }]}>
                    <MaterialIcons name={action.icon as any} size={24} color={action.color} />
                  </View>
                  <H3 style={{...styles.quickActionTitle, color: textColor}}>{action.title}</H3>
                  <Caption style={{...styles.quickActionDescription, color: textSecondaryColor}}>
                    {action.description}
                  </Caption>
                  {action.count !== undefined && (
                    <View style={styles.quickActionCount}>
                      <Chip 
                        style={[styles.countChip, { backgroundColor: action.color + '20' }]}
                        textStyle={{...styles.countChipText, color: action.color}}
                      >
                        {typeof action.count === 'number' && action.id === 'view_revenue' ? 
                          formatCurrency(action.count) : action.count}
                      </Chip>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={48} color={errorColor} />
            <Text style={[styles.errorText, { color: errorColor }]}>
              Failed to load dashboard data
            </Text>
            <PaperButton mode="outlined" onPress={() => loadDashboardData()}>
              Retry
            </PaperButton>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  // Header Styles
  header: {
    padding: spacing.lg,
    paddingTop: 60,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    marginBottom: spacing.sm,
  },
  dateFilters: {
    minWidth: 280,
  },
  segmentedButtons: {
    backgroundColor: 'transparent',
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: 8,
    marginTop: spacing.sm,
  },
  alertText: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  alertAction: {
    fontWeight: '600',
  },

  // Content Styles
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  
  // Loading and Error States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '500',
    marginVertical: spacing.md,
    textAlign: 'center',
  },

  // KPI Grid
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  kpiCard: {
    flex: 1,
    minWidth: 250,
    padding: spacing.lg,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  kpiTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  kpiTrendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  kpiNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  kpiLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  kpiSubLabel: {
    fontSize: 12,
  },

  // Analytics Cards
  analyticsCard: {
    marginBottom: spacing.lg,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  viewMoreButton: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Financial Analytics
  financialGrid: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  financialMetric: {
    flex: 1,
    alignItems: 'center',
  },
  financialAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  financialLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  
  // Top Plans
  topPlansSection: {
    marginTop: spacing.md,
  },
  sectionSubheading: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  planItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  planStats: {
    fontSize: 12,
  },
  planChip: {
    height: 24,
  },
  planChipText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Class Analytics
  classStatsGrid: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  classStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  classStatNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: spacing.xs,
  },
  classStatLabel: {
    fontSize: 12,
    textAlign: 'center',
  },

  // Instructor Section
  instructorSection: {
    marginTop: spacing.md,
  },
  instructorItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  instructorInfo: {
    flex: 1,
  },
  instructorName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  instructorStats: {
    fontSize: 12,
  },
  instructorRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Client Analytics
  clientStatsGrid: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  clientStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  clientStatNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: spacing.xs,
  },
  clientStatLabel: {
    fontSize: 12,
    textAlign: 'center',
  },

  // Subscription Breakdown
  subscriptionBreakdown: {
    marginTop: spacing.md,
  },
  subscriptionStats: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  subscriptionStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Quick Actions Grid
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  quickActionCard: {
    flex: 1,
    minWidth: 200,
    padding: spacing.lg,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  quickActionDescription: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  quickActionCount: {
    marginTop: spacing.xs,
  },
  countChip: {
    height: 24,
  },
  countChipText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Mobile Layout Styles
  mobileContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  mobileWarning: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    padding: spacing.lg,
    backgroundColor: '#fff3cd',
    color: '#856404',
    margin: spacing.md,
    borderRadius: 8,
  },
  mobileContent: {
    flex: 1,
    padding: spacing.md,
  },
  mobileCard: {
    marginBottom: spacing.md,
    borderRadius: 8,
    elevation: 2,
  },
  mobileMetricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  mobileMetricItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 8,
    elevation: 1,
  },
  mobileMetricNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: spacing.xs,
  },
  mobileMetricLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  mobileActionButtons: {
    gap: spacing.sm,
  },
  mobilePrimaryAction: {
    marginBottom: spacing.xs,
    borderRadius: 8,
  },
  mobileSecondaryAction: {
    marginBottom: spacing.xs,
    borderRadius: 8,
  },
  mobileActionLabel: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Live Dashboard Styles
  liveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  liveText: {
    fontSize: 11,
  },
  liveMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  liveMetric: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    marginHorizontal: spacing.xs,
  },
  liveMetricContent: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  liveMetricNumber: {
    fontSize: 18,
    fontWeight: '700',
  },
  liveMetricLabel: {
    fontSize: 12,
  },
  liveDetailsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  liveDetailSection: {
    flex: 1,
  },
  liveSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  classCapacityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  classInfo: {
    flex: 1,
  },
  className: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  classDetails: {
    fontSize: 11,
  },
  capacityDisplay: {
    alignItems: 'flex-end',
  },
  capacityText: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 4,
  },
  capacityBar: {
    width: 60,
    height: 4,
    borderRadius: 2,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.xs,
  },
  alertMessage: {
    fontSize: 12,
    lineHeight: 16,
    marginLeft: spacing.xs,
    flex: 1,
  },
});

export default AdminDashboard; 