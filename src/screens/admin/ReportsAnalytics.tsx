import { Body, Caption, H1, H2, H3 } from '@/components/ui/Typography';
import { useThemeColor } from '@/hooks/useThemeColor';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { Alert, Dimensions, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Badge, Chip, Button as PaperButton, Card as PaperCard, ProgressBar, SegmentedButtons, Surface } from 'react-native-paper';
import { spacing } from '../../../constants/Spacing';
import { dashboardService, DashboardStats, DateRange } from '../../services/dashboardService';

const { width: screenWidth } = Dimensions.get('window');
const isLargeScreen = screenWidth > 1024;

interface ReportsAnalyticsProps {
  onNavigate?: (screenKey: string) => void;
}

function ReportsAnalytics({ onNavigate }: ReportsAnalyticsProps = {}) {
  const navigation = useNavigation();
  
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

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [dateFilter, setDateFilter] = useState<'week' | 'month' | 'year' | 'all'>('month');
  const [reportType, setReportType] = useState<'overview' | 'financial' | 'clients' | 'referrals' | 'activity'>('overview');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  useEffect(() => {
    loadReportsData();
  }, []);

  useEffect(() => {
    if (dateFilter !== 'all') {
      updateDateRange(dateFilter);
    } else {
      setDateRange(undefined);
      loadReportsData();
    }
  }, [dateFilter]);

  const updateDateRange = (filter: 'week' | 'month' | 'year') => {
    const today = new Date();
    let start: Date;
    
    switch (filter) {
      case 'week':
        start = new Date(today);
        start.setDate(today.getDate() - 7);
        break;
      case 'month':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'year':
        start = new Date(today.getFullYear(), 0, 1);
        break;
      default:
        return;
    }
    
    const newDateRange = {
      start: start.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0]
    };
    
    setDateRange(newDateRange);
    loadReportsData(newDateRange);
  };

  const loadReportsData = async (customDateRange?: DateRange) => {
    try {
      setLoading(true);
      console.log('📊 Loading reports data...');
      
      const response = await dashboardService.getDashboardStats(customDateRange || dateRange);
      
      if (response.success && response.data) {
        setDashboardStats(response.data);
        console.log('✅ Reports data loaded successfully');
      } else {
        console.error('Failed to load reports data:', response.error);
        Alert.alert('Error', 'Failed to load reports data. Please try again.');
      }
    } catch (error) {
      console.error('Failed to load reports data:', error);
      Alert.alert('Error', 'Failed to load reports data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadReportsData();
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
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'registration': return 'person-add';
      case 'payment': return 'attach-money';
      case 'booking': return 'event';
      case 'subscription': return 'card-membership';
      case 'class': return 'fitness-center';
      default: return 'circle';
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'registration': return successColor;
      case 'payment': return primaryColor;
      case 'booking': return accentColor;
      case 'subscription': return warningColor;
      case 'class': return '#9C27B0';
      default: return textMutedColor;
    }
  };

  // Client click handlers
  const handleClientCardClick = async (cardType: string, title: string) => {
    try {
      console.log(`📊 Loading clients for ${cardType}...`);
      
      const clients = await dashboardService.getClientsForAnalyticsCard(cardType);
      
      if (clients.length === 0) {
        Alert.alert('No Clients', `No clients found for ${title}`);
        return;
      }

      // Show client list modal or navigate to a client list screen
      showClientListModal(clients, title);
      
    } catch (error) {
      console.error('Error loading clients for card:', error);
      Alert.alert('Error', 'Failed to load client data. Please try again.');
    }
  };

  const showClientListModal = (clients: any[], title: string) => {
    const clientList = clients.map(client => ({
      id: client.id,
      name: client.name,
      email: client.email,
      phone: client.phone,
      status: client.user_subscriptions?.[0]?.status || 'No subscription',
      created: client.created_at
    }));

    // Create a formatted client list for display
    const clientInfo = clientList.map((client, index) => 
      `${index + 1}. ${client.name}\n   📧 ${client.email}\n   📊 ${client.status}${client.phone ? `\n   📞 ${client.phone}` : ''}`
    ).join('\n\n');
    
    const buttons = [
      { text: 'Close', style: 'cancel' as const }
    ];
    
    // Add "View First Client" button if there are clients
    if (clients.length > 0) {
      buttons.push({
        text: 'View First Client Profile',
        onPress: () => {
          console.log(`🔍 Navigating to client profile: ${clients[0].name} (${clients[0].id})`);
          navigation.navigate('ClientProfile' as never, {
            userId: clients[0].id,
            userName: clients[0].name
          } as never);
        }
      });
    }
    
    Alert.alert(
      `${title} - ${clients.length} Client${clients.length !== 1 ? 's' : ''}`,
      clientInfo,
      buttons
    );
  };

  // Mobile layout warning - Reports portal is PC-optimized
  if (!isLargeScreen) {
    return (
      <View style={styles.mobileContainer}>
        <Text style={styles.mobileWarning}>
          📊 Reports & Analytics is optimized for PC use. 
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
              <Text style={[styles.loadingText, { color: textColor }]}>Loading analytics...</Text>
            </View>
          ) : dashboardStats ? (
            <PaperCard style={[styles.mobileCard, { backgroundColor: surfaceColor }]}>
              <PaperCard.Content>
                <H2 style={{ color: textColor }}>Quick Overview</H2>
                <View style={styles.mobileMetricsGrid}>
                  <View style={styles.mobileMetricItem}>
                    <MaterialIcons name="people" size={20} color={primaryColor} />
                    <Body style={{ color: textColor }}>{dashboardStats.overview.totalClients}</Body>
                    <Caption style={{ color: textSecondaryColor }}>Total Clients</Caption>
                  </View>
                  <View style={styles.mobileMetricItem}>
                    <MaterialIcons name="attach-money" size={20} color={successColor} />
                    <Body style={{ color: textColor }}>{formatCurrency(dashboardStats.financial.revenueThisMonth)}</Body>
                    <Caption style={{ color: textSecondaryColor }}>Monthly Revenue</Caption>
                  </View>
                </View>
              </PaperCard.Content>
            </PaperCard>
          ) : (
            <View style={styles.errorContainer}>
              <Text style={[styles.errorText, { color: errorColor }]}>
                Failed to load analytics data. Please refresh.
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // Desktop layout - Modern 2025 Reports & Analytics
  return (
    <View style={[styles.container, { backgroundColor }]}>
      {/* Enhanced Header */}
      <View style={[styles.header, { backgroundColor: surfaceColor, borderBottomColor: textMutedColor }]}>
        <View style={styles.headerTop}>
          <View style={styles.headerInfo}>
            <H1 style={{ ...styles.headerTitle, color: textColor }}>Reports & Analytics</H1>
            <Caption style={{ ...styles.headerSubtitle, color: textSecondaryColor }}>
              Comprehensive Studio Analytics • Real-time Insights • {new Date().toLocaleDateString()}
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

        {/* Report Type Navigation */}
        <View style={styles.reportTypeNav}>
          <TouchableOpacity 
            style={[styles.reportTypeTab, reportType === 'overview' && styles.activeReportTypeTab]}
            onPress={() => setReportType('overview')}
          >
            <MaterialIcons name="dashboard" size={20} color={reportType === 'overview' ? primaryColor : textMutedColor} />
            <Caption style={{ color: reportType === 'overview' ? primaryColor : textMutedColor, marginLeft: 8 }}>
              Overview
            </Caption>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.reportTypeTab, reportType === 'financial' && styles.activeReportTypeTab]}
            onPress={() => setReportType('financial')}
          >
            <MaterialIcons name="attach-money" size={20} color={reportType === 'financial' ? primaryColor : textMutedColor} />
            <Caption style={{ color: reportType === 'financial' ? primaryColor : textMutedColor, marginLeft: 8 }}>
              Financial
            </Caption>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.reportTypeTab, reportType === 'clients' && styles.activeReportTypeTab]}
            onPress={() => setReportType('clients')}
          >
            <MaterialIcons name="people" size={20} color={reportType === 'clients' ? primaryColor : textMutedColor} />
            <Caption style={{ color: reportType === 'clients' ? primaryColor : textMutedColor, marginLeft: 8 }}>
              Clients
            </Caption>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.reportTypeTab, reportType === 'referrals' && styles.activeReportTypeTab]}
            onPress={() => setReportType('referrals')}
          >
            <MaterialIcons name="share" size={20} color={reportType === 'referrals' ? primaryColor : textMutedColor} />
            <Caption style={{ color: reportType === 'referrals' ? primaryColor : textMutedColor, marginLeft: 8 }}>
              Referral Sources
            </Caption>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.reportTypeTab, reportType === 'activity' && styles.activeReportTypeTab]}
            onPress={() => setReportType('activity')}
          >
            <MaterialIcons name="timeline" size={20} color={reportType === 'activity' ? primaryColor : textMutedColor} />
            <Caption style={{ color: reportType === 'activity' ? primaryColor : textMutedColor, marginLeft: 8 }}>
              Live Activity
            </Caption>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: textColor }]}>Loading comprehensive analytics...</Text>
          </View>
        ) : dashboardStats ? (
          <>
            {/* Overview Section */}
            {reportType === 'overview' && (
              <>
                {/* Key Metrics Grid */}
                <View style={styles.metricsGrid}>
                  <Surface style={[styles.metricCard, { backgroundColor: surfaceColor }]} elevation={2}>
                    <View style={styles.metricHeader}>
                      <MaterialIcons name="people" size={32} color={primaryColor} />
                      <Badge style={[styles.metricBadge, { backgroundColor: successColor + '20' }]}>
                        <Text style={{ color: successColor, fontSize: 10, fontWeight: 'bold' }}>
                          +{dashboardStats.clients.newClientsThisMonth}
                        </Text>
                      </Badge>
                    </View>
                    <H2 style={{ ...styles.metricNumber, color: textColor }}>
                      {dashboardStats.overview.totalClients}
                    </H2>
                    <Caption style={{ ...styles.metricLabel, color: textSecondaryColor }}>Total Clients</Caption>
                    <ProgressBar 
                      progress={dashboardStats.overview.activeClients / dashboardStats.overview.totalClients} 
                      color={primaryColor}
                      style={styles.metricProgress}
                    />
                    <Caption style={{ ...styles.metricSubLabel, color: textMutedColor }}>
                      {dashboardStats.overview.activeClients} active this month
                    </Caption>
                  </Surface>

                  <Surface style={[styles.metricCard, { backgroundColor: surfaceColor }]} elevation={2}>
                    <View style={styles.metricHeader}>
                      <MaterialIcons name="attach-money" size={32} color={successColor} />
                      <Badge style={[styles.metricBadge, { backgroundColor: dashboardStats.financial.monthlyGrowth >= 0 ? successColor + '20' : errorColor + '20' }]}>
                        <Text style={{ color: dashboardStats.financial.monthlyGrowth >= 0 ? successColor : errorColor, fontSize: 10, fontWeight: 'bold' }}>
                          {dashboardStats.financial.monthlyGrowth > 0 ? '+' : ''}{dashboardStats.financial.monthlyGrowth}%
                        </Text>
                      </Badge>
                    </View>
                    <H2 style={{ ...styles.metricNumber, color: textColor }}>
                      {formatCurrency(dashboardStats.financial.revenueThisMonth)}
                    </H2>
                    <Caption style={{ ...styles.metricLabel, color: textSecondaryColor }}>Monthly Revenue</Caption>
                    <ProgressBar 
                      progress={0.75} 
                      color={successColor}
                      style={styles.metricProgress}
                    />
                    <Caption style={{ ...styles.metricSubLabel, color: textMutedColor }}>
                      {formatCurrency(dashboardStats.financial.revenueThisWeek)} this week
                    </Caption>
                  </Surface>

                  <Surface style={[styles.metricCard, { backgroundColor: surfaceColor }]} elevation={2}>
                    <View style={styles.metricHeader}>
                      <MaterialIcons name="event" size={32} color={accentColor} />
                      <Badge style={[styles.metricBadge, { backgroundColor: warningColor + '20' }]}>
                        <Text style={{ color: warningColor, fontSize: 10, fontWeight: 'bold' }}>
                          {dashboardStats.classes.upcomingClasses}
                        </Text>
                      </Badge>
                    </View>
                    <H2 style={{ ...styles.metricNumber, color: textColor }}>
                      {dashboardStats.overview.classesThisWeek}
                    </H2>
                    <Caption style={{ ...styles.metricLabel, color: textSecondaryColor }}>Classes This Week</Caption>
                    <ProgressBar 
                      progress={dashboardStats.classes.averageAttendance / 100} 
                      color={accentColor}
                      style={styles.metricProgress}
                    />
                    <Caption style={{ ...styles.metricSubLabel, color: textMutedColor }}>
                      {dashboardStats.classes.averageAttendance}% average attendance
                    </Caption>
                  </Surface>

                  <Surface style={[styles.metricCard, { backgroundColor: surfaceColor }]} elevation={2}>
                    <View style={styles.metricHeader}>
                      <MaterialIcons name="card-membership" size={32} color={warningColor} />
                      <Badge style={[styles.metricBadge, { backgroundColor: dashboardStats.notifications.expiringSubscriptions > 0 ? errorColor + '20' : successColor + '20' }]}>
                        <Text style={{ color: dashboardStats.notifications.expiringSubscriptions > 0 ? errorColor : successColor, fontSize: 10, fontWeight: 'bold' }}>
                          {dashboardStats.notifications.expiringSubscriptions} expiring
                        </Text>
                      </Badge>
                    </View>
                    <H2 style={{ ...styles.metricNumber, color: textColor }}>
                      {dashboardStats.financial.activeSubscriptions}
                    </H2>
                    <Caption style={{ ...styles.metricLabel, color: textSecondaryColor }}>Active Subscriptions</Caption>
                    <ProgressBar 
                      progress={0.85} 
                      color={warningColor}
                      style={styles.metricProgress}
                    />
                    <Caption style={{ ...styles.metricSubLabel, color: textMutedColor }}>
                      {formatCurrency(dashboardStats.financial.subscriptionRevenue)} monthly
                    </Caption>
                  </Surface>
                </View>

                {/* Quick Stats Row */}
                <View style={styles.quickStatsRow}>
                  <Surface style={[styles.quickStatCard, { backgroundColor: surfaceColor }]} elevation={1}>
                    <MaterialIcons name="trending-up" size={24} color={successColor} />
                    <View style={styles.quickStatContent}>
                      <H3 style={{ color: textColor }}>{dashboardStats.clients.clientRetentionRate}%</H3>
                      <Caption style={{ color: textSecondaryColor }}>Client Retention</Caption>
                    </View>
                  </Surface>

                  <Surface style={[styles.quickStatCard, { backgroundColor: surfaceColor }]} elevation={1}>
                    <MaterialIcons name="star" size={24} color={warningColor} />
                    <View style={styles.quickStatContent}>
                      <H3 style={{ color: textColor }}>{dashboardStats.classes.mostPopularClass}</H3>
                      <Caption style={{ color: textSecondaryColor }}>Most Popular Class</Caption>
                    </View>
                  </Surface>

                  <Surface style={[styles.quickStatCard, { backgroundColor: surfaceColor }]} elevation={1}>
                    <MaterialIcons name="fitness-center" size={24} color={accentColor} />
                    <View style={styles.quickStatContent}>
                      <H3 style={{ color: textColor }}>{dashboardStats.clients.averageClassesPerClient}</H3>
                      <Caption style={{ color: textSecondaryColor }}>Avg Classes/Client</Caption>
                    </View>
                  </Surface>

                  <Surface style={[styles.quickStatCard, { backgroundColor: surfaceColor }]} elevation={1}>
                    <MaterialIcons name="notification-important" size={24} color={dashboardStats.notifications.systemAlerts > 0 ? errorColor : successColor} />
                    <View style={styles.quickStatContent}>
                      <H3 style={{ color: textColor }}>{dashboardStats.notifications.systemAlerts}</H3>
                      <Caption style={{ color: textSecondaryColor }}>System Alerts</Caption>
                    </View>
                  </Surface>
                </View>
              </>
            )}

            {/* Financial Report Section */}
            {reportType === 'financial' && (
              <PaperCard style={[styles.reportCard, { backgroundColor: surfaceColor }]}>
                <PaperCard.Content>
                  <View style={styles.cardHeader}>
                    <H2 style={{ ...styles.cardTitle, color: textColor }}>Financial Analytics</H2>
                    <View style={styles.cardActions}>
                      <PaperButton mode="outlined" icon="download">Export</PaperButton>
                    </View>
                  </View>
                  
                  {/* Enhanced Financial Metrics Grid */}
                  <View style={styles.financialMetricsGrid}>
                    <View style={styles.financialMetric}>
                      <H2 style={{ ...styles.financialAmount, color: textColor }}>
                        {formatCurrency(dashboardStats.financial.totalRevenue)}
                      </H2>
                      <Caption style={{ ...styles.financialLabel, color: textSecondaryColor }}>Total Revenue</Caption>
                    </View>
                    <View style={styles.financialMetric}>
                      <H2 style={{ ...styles.financialAmount, color: textColor }}>
                        {formatCurrency(dashboardStats.financial.averageMonthlyRevenue)}
                      </H2>
                      <Caption style={{ ...styles.financialLabel, color: textSecondaryColor }}>Avg. Monthly</Caption>
                    </View>
                    <View style={styles.financialMetric}>
                      <H2 style={{ ...styles.financialAmount, color: textColor }}>
                        {dashboardStats.financial.subscriptionChurnRate}%
                      </H2>
                      <Caption style={{ ...styles.financialLabel, color: textSecondaryColor }}>Churn Rate</Caption>
                    </View>
                    <View style={styles.financialMetric}>
                      <H2 style={{ ...styles.financialAmount, color: textColor }}>
                        {formatCurrency(dashboardStats.financial.averageSubscriptionValue)}
                      </H2>
                      <Caption style={{ ...styles.financialLabel, color: textSecondaryColor }}>Avg. Subscription</Caption>
                    </View>
                    <View style={styles.financialMetric}>
                      <H2 style={{ ...styles.financialAmount, color: textColor }}>
                        {formatCurrency(dashboardStats.financial.revenueForecast)}
                      </H2>
                      <Caption style={{ ...styles.financialLabel, color: textSecondaryColor }}>Next Month Forecast</Caption>
                    </View>
                    <View style={styles.financialMetric}>
                      <H2 style={{ ...styles.financialAmount, color: textColor }}>
                        {dashboardStats.financial.oneTimePayments}
                      </H2>
                      <Caption style={{ ...styles.financialLabel, color: textSecondaryColor }}>One-time Payments</Caption>
                    </View>
                  </View>

                  {/* Revenue by Plan */}
                  <View style={styles.revenueByPlanSection}>
                    <H3 style={{ ...styles.sectionHeading, color: textColor }}>Revenue by Plan</H3>
                                          {dashboardStats.financial.revenueByPlan?.slice(0, 5).map((plan, index) => (
                      <View key={index} style={styles.planItem}>
                        <View style={styles.planRank}>
                          <Chip 
                            style={[styles.rankChip, { backgroundColor: successColor + '20' }]}
                            textStyle={{ color: successColor, fontSize: 12, fontWeight: 'bold' }}
                          >
                            {plan.percentage}%
                          </Chip>
                        </View>
                        <View style={styles.planInfo}>
                          <Body style={{ ...styles.planName, color: textColor }}>{plan.planName}</Body>
                          <Caption style={{ ...styles.planStats, color: textMutedColor }}>
                            {formatCurrency(plan.revenue)} revenue
                          </Caption>
                        </View>
                        <View style={styles.planProgress}>
                          <ProgressBar 
                            progress={plan.percentage / 100} 
                            color={successColor}
                            style={{ width: 80 }}
                          />
                        </View>
                      </View>
                    ))}
                  </View>

                  {/* Payment Methods */}
                  <View style={styles.paymentMethodsSection}>
                    <H3 style={{ ...styles.sectionHeading, color: textColor }}>Payment Methods</H3>
                    <View style={styles.paymentMethodsGrid}>
                      {dashboardStats.financial.paymentMethods?.slice(0, 4).map((method, index) => (
                        <Surface key={index} style={[styles.paymentMethodCard, { backgroundColor: primaryColor + '10' }]} elevation={1}>
                          <MaterialIcons name="payment" size={24} color={primaryColor} />
                          <View style={styles.paymentMethodInfo}>
                            <Body style={{ color: textColor, fontWeight: 'bold' }}>{method.method}</Body>
                            <Caption style={{ color: textSecondaryColor }}>
                              {method.count} payments • {formatCurrency(method.amount)}
                            </Caption>
                          </View>
                        </Surface>
                      ))}
                    </View>
                  </View>

                  {/* Top Plans */}
                  <View style={styles.topPlansSection}>
                    <H3 style={{ ...styles.sectionHeading, color: textColor }}>Top Subscription Plans</H3>
                                          {dashboardStats.financial.topPlans?.slice(0, 5).map((plan, index) => (
                      <View key={index} style={styles.planItem}>
                        <View style={styles.planRank}>
                          <Chip 
                            style={[styles.rankChip, { backgroundColor: primaryColor + '20' }]}
                            textStyle={{ color: primaryColor, fontSize: 12, fontWeight: 'bold' }}
                          >
                            #{index + 1}
                          </Chip>
                        </View>
                        <View style={styles.planInfo}>
                          <Body style={{ ...styles.planName, color: textColor }}>{plan.planName}</Body>
                          <Caption style={{ ...styles.planStats, color: textMutedColor }}>
                            {plan.count} subscribers • {formatCurrency(plan.revenue)} revenue
                          </Caption>
                        </View>
                        <View style={styles.planProgress}>
                          <ProgressBar 
                            progress={plan.count / Math.max(...(dashboardStats.financial.topPlans?.map(p => p.count) || [1]))} 
                            color={primaryColor}
                            style={{ width: 80 }}
                          />
                        </View>
                      </View>
                    ))}
                  </View>
                </PaperCard.Content>
              </PaperCard>
            )}

            {/* Client Analytics Section */}
            {reportType === 'clients' && (
              <PaperCard style={[styles.reportCard, { backgroundColor: surfaceColor }]}>
                <PaperCard.Content>
                  <View style={styles.cardHeader}>
                    <H2 style={{ ...styles.cardTitle, color: textColor }}>Client Analytics</H2>
                    <View style={styles.cardActions}>
                      <PaperButton mode="outlined" icon="download">Export</PaperButton>
                    </View>
                  </View>

                  {/* Key Client Metrics - Redesigned Layout */}
                  <View style={styles.clientMetricsContainer}>
                    <View style={styles.clientMetricsRow}>
                      <TouchableOpacity 
                        onPress={() => handleClientCardClick('newClientsThisMonth', 'New Clients This Month')}
                        style={{ flex: 1, marginRight: spacing.sm }}
                      >
                        <Surface style={[styles.clientMetricCard, { backgroundColor: successColor + '15' }]} elevation={2}>
                          <View style={styles.clientMetricContent}>
                            <MaterialIcons name="person-add" size={32} color={successColor} />
                            <View style={styles.clientMetricText}>
                              <H2 style={{ color: textColor, fontSize: 24, fontWeight: 'bold' }}>
                                +{dashboardStats.clients.newClientsThisMonth}
                              </H2>
                              <Caption style={{ color: textSecondaryColor, fontWeight: '600' }}>New This Month</Caption>
                              <Caption style={{ color: textMutedColor, fontSize: 12 }}>
                                {dashboardStats.clients.newClientsThisWeek} this week
                              </Caption>
                            </View>
                          </View>
                        </Surface>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        onPress={() => handleClientCardClick('retention', 'Client Retention')}
                        style={{ flex: 1, marginLeft: spacing.sm }}
                      >
                        <Surface style={[styles.clientMetricCard, { backgroundColor: primaryColor + '15' }]} elevation={2}>
                          <View style={styles.clientMetricContent}>
                            <MaterialIcons name="loyalty" size={32} color={primaryColor} />
                            <View style={styles.clientMetricText}>
                              <H2 style={{ color: textColor, fontSize: 24, fontWeight: 'bold' }}>
                                {dashboardStats.clients.clientRetentionRate}%
                              </H2>
                              <Caption style={{ color: textSecondaryColor, fontWeight: '600' }}>Retention Rate</Caption>
                              <ProgressBar 
                                progress={dashboardStats.clients.clientRetentionRate / 100} 
                                color={primaryColor}
                                style={{ marginTop: 8, height: 4 }}
                              />
                            </View>
                          </View>
                        </Surface>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.clientMetricsRow}>
                      <TouchableOpacity 
                        onPress={() => handleClientCardClick('highEngagement', 'High Engagement Clients')}
                        style={{ flex: 1, marginRight: spacing.sm }}
                      >
                        <Surface style={[styles.clientMetricCard, { backgroundColor: accentColor + '15' }]} elevation={2}>
                          <View style={styles.clientMetricContent}>
                            <MaterialIcons name="fitness-center" size={32} color={accentColor} />
                            <View style={styles.clientMetricText}>
                              <H2 style={{ color: textColor, fontSize: 24, fontWeight: 'bold' }}>
                                {dashboardStats.clients.averageClassesPerClient}
                              </H2>
                              <Caption style={{ color: textSecondaryColor, fontWeight: '600' }}>Avg Classes/Client</Caption>
                              <Caption style={{ color: textMutedColor, fontSize: 12 }}>
                                Monthly engagement
                              </Caption>
                            </View>
                          </View>
                        </Surface>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        onPress={() => handleClientCardClick('lifetimeValue', 'High Lifetime Value Clients')}
                        style={{ flex: 1, marginLeft: spacing.sm }}
                      >
                        <Surface style={[styles.clientMetricCard, { backgroundColor: warningColor + '15' }]} elevation={2}>
                          <View style={styles.clientMetricContent}>
                            <MaterialIcons name="attach-money" size={32} color={warningColor} />
                            <View style={styles.clientMetricText}>
                              <H2 style={{ color: textColor, fontSize: 24, fontWeight: 'bold' }}>
                                {formatCurrency(dashboardStats.clients.clientLifetimeValue)}
                              </H2>
                              <Caption style={{ color: textSecondaryColor, fontWeight: '600' }}>Lifetime Value</Caption>
                              <Caption style={{ color: textMutedColor, fontSize: 12 }}>
                                Per client average
                              </Caption>
                            </View>
                          </View>
                        </Surface>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Client Performance Insights */}
                  <View style={styles.clientInsightsSection}>
                    <H3 style={{ ...styles.sectionHeading, color: textColor, marginBottom: spacing.lg }}>Client Performance Insights</H3>
                    
                    <View style={styles.insightsGrid}>
                      <Surface style={[styles.insightCard, { backgroundColor: surfaceColor }]} elevation={1}>
                        <MaterialIcons name="schedule" size={24} color={primaryColor} />
                        <View style={styles.insightContent}>
                          <Body style={{ color: textColor, fontWeight: '600' }}>Average Client Age</Body>
                          <Caption style={{ color: textSecondaryColor }}>{dashboardStats.clients.averageClientAge} days</Caption>
                        </View>
                      </Surface>
                      
                      <Surface style={[styles.insightCard, { backgroundColor: surfaceColor }]} elevation={1}>
                        <MaterialIcons name="star" size={24} color={successColor} />
                        <View style={styles.insightContent}>
                          <Body style={{ color: textColor, fontWeight: '600' }}>Engagement Score</Body>
                          <Caption style={{ color: textSecondaryColor }}>{dashboardStats.clients.clientEngagementScore}%</Caption>
                        </View>
                      </Surface>
                      
                      <Surface style={[styles.insightCard, { backgroundColor: surfaceColor }]} elevation={1}>
                        <MaterialIcons name="swap-horiz" size={24} color={accentColor} />
                        <View style={styles.insightContent}>
                          <Body style={{ color: textColor, fontWeight: '600' }}>Total Reassignments</Body>
                          <Caption style={{ color: textSecondaryColor }}>{dashboardStats.clients.reassignmentStats?.totalReassignments || 0}</Caption>
                        </View>
                      </Surface>
                      
                      <Surface style={[styles.insightCard, { backgroundColor: surfaceColor }]} elevation={1}>
                        <MaterialIcons name="repeat" size={24} color={warningColor} />
                        <View style={styles.insightContent}>
                          <Body style={{ color: textColor, fontWeight: '600' }}>Multiple Reassignments</Body>
                          <Caption style={{ color: textSecondaryColor }}>{dashboardStats.clients.reassignmentStats?.clientsWithMultipleReassignments || 0} clients</Caption>
                        </View>
                      </Surface>
                    </View>
                  </View>

                  {/* Subscription Status Distribution */}
                  <View style={styles.subscriptionStatusSection}>
                    <H3 style={{ ...styles.sectionHeading, color: textColor, marginBottom: spacing.lg }}>Subscription Status</H3>
                    <View style={styles.subscriptionStatusGrid}>
                      <TouchableOpacity 
                        onPress={() => handleClientCardClick('activeSubscriptions', 'Active Subscriptions')}
                        style={{ flex: 1, marginRight: spacing.sm }}
                      >
                        <View style={styles.subscriptionStatusCard}>
                          <View style={[styles.statusIndicator, { backgroundColor: successColor }]} />
                          <View style={styles.statusContent}>
                            <H3 style={{ color: textColor }}>{dashboardStats.clients.subscriptionStatus.active}</H3>
                            <Caption style={{ color: textSecondaryColor }}>Active</Caption>
                          </View>
                        </View>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        onPress={() => handleClientCardClick('expiredSubscriptions', 'Expired Subscriptions')}
                        style={{ flex: 1, marginHorizontal: spacing.xs }}
                      >
                        <View style={styles.subscriptionStatusCard}>
                          <View style={[styles.statusIndicator, { backgroundColor: warningColor }]} />
                          <View style={styles.statusContent}>
                            <H3 style={{ color: textColor }}>{dashboardStats.clients.subscriptionStatus.expired}</H3>
                            <Caption style={{ color: textSecondaryColor }}>Expired</Caption>
                          </View>
                        </View>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        onPress={() => handleClientCardClick('cancelledSubscriptions', 'Cancelled Subscriptions')}
                        style={{ flex: 1, marginLeft: spacing.sm }}
                      >
                        <View style={styles.subscriptionStatusCard}>
                          <View style={[styles.statusIndicator, { backgroundColor: errorColor }]} />
                          <View style={styles.statusContent}>
                            <H3 style={{ color: textColor }}>{dashboardStats.clients.subscriptionStatus.cancelled}</H3>
                            <Caption style={{ color: textSecondaryColor }}>Cancelled</Caption>
                          </View>
                        </View>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Client Segments */}
                  {dashboardStats.clients.clientSegments && dashboardStats.clients.clientSegments.length > 0 && (
                    <View style={styles.clientSegmentsSection}>
                      <H3 style={{ ...styles.sectionHeading, color: textColor, marginBottom: spacing.lg }}>Client Segments</H3>
                      <View style={styles.clientSegmentsGrid}>
                        {dashboardStats.clients.clientSegments.map((segment, index) => (
                          <Surface key={index} style={[styles.segmentCard, { backgroundColor: primaryColor + '10' }]} elevation={1}>
                            <View style={styles.segmentHeader}>
                              <H3 style={{ color: textColor }}>{segment.count}</H3>
                              <Chip 
                                style={[styles.segmentChip, { backgroundColor: primaryColor + '20' }]}
                                textStyle={{ color: primaryColor, fontSize: 10, fontWeight: 'bold' }}
                              >
                                {segment.percentage}%
                              </Chip>
                            </View>
                            <Caption style={{ color: textSecondaryColor, marginBottom: spacing.xs }}>
                              {segment.segment}
                            </Caption>
                            <Caption style={{ color: textMutedColor }}>
                              Avg. Value: {formatCurrency(segment.averageValue)}
                            </Caption>
                          </Surface>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Reassignment Analytics */}
                  {dashboardStats.clients.reassignmentStats && (
                    <View style={styles.reassignmentSection}>
                      <H3 style={{ ...styles.sectionHeading, color: textColor, marginBottom: spacing.lg }}>Reassignment Analytics</H3>
                      
                      <View style={styles.reassignmentStatsGrid}>
                        <TouchableOpacity 
                          onPress={() => handleClientCardClick('reassignments', 'Clients with Reassignments')}
                          style={{ flex: 1, marginRight: spacing.sm }}
                        >
                          <Surface style={[styles.reassignmentStatCard, { backgroundColor: surfaceColor }]} elevation={1}>
                            <MaterialIcons name="swap-horiz" size={24} color={accentColor} />
                            <View style={styles.reassignmentInfo}>
                              <H3 style={{ color: textColor }}>{dashboardStats.clients.reassignmentStats.totalReassignments || 0}</H3>
                              <Caption style={{ color: textSecondaryColor }}>Total Reassignments</Caption>
                            </View>
                          </Surface>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                          onPress={() => handleClientCardClick('multipleReassignments', 'Multiple Reassignments')}
                          style={{ flex: 1, marginLeft: spacing.sm }}
                        >
                          <Surface style={[styles.reassignmentStatCard, { backgroundColor: surfaceColor }]} elevation={1}>
                            <MaterialIcons name="trending-up" size={24} color={successColor} />
                            <View style={styles.reassignmentInfo}>
                              <H3 style={{ color: textColor }}>{dashboardStats.clients.reassignmentStats.averageReassignmentsPerClient || 0}</H3>
                              <Caption style={{ color: textSecondaryColor }}>Avg. Per Client</Caption>
                            </View>
                          </Surface>
                        </TouchableOpacity>
                      </View>

                      {/* Reassignment Reasons */}
                      {dashboardStats.clients.reassignmentStats.reassignmentReasons && dashboardStats.clients.reassignmentStats.reassignmentReasons.length > 0 && (
                        <View style={styles.reassignmentReasonsSection}>
                          <Caption style={{ ...styles.sectionSubtitle, color: textSecondaryColor, marginBottom: spacing.md }}>
                            Top Reassignment Reasons
                          </Caption>
                          {dashboardStats.clients.reassignmentStats.reassignmentReasons.map((reason, index) => (
                            <View key={index} style={styles.reasonItem}>
                              <View style={styles.reasonInfo}>
                                <Body style={{ color: textColor }}>{reason.reason}</Body>
                                <Caption style={{ color: textMutedColor }}>{reason.count} clients</Caption>
                              </View>
                              <ProgressBar 
                                progress={reason.count / Math.max(...(dashboardStats.clients.reassignmentStats?.reassignmentReasons?.map(r => r.count) || [1]))} 
                                color={accentColor}
                                style={{ width: 80 }}
                              />
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  )}
                </PaperCard.Content>
              </PaperCard>
            )}

            {/* Referral Sources Section */}
            {reportType === 'referrals' && (
              <PaperCard style={[styles.reportCard, { backgroundColor: surfaceColor }]}>
                <PaperCard.Content>
                  <View style={styles.cardHeader}>
                    <H2 style={{ ...styles.cardTitle, color: textColor }}>Referral Source Analytics</H2>
                    <View style={styles.cardActions}>
                      <Chip style={{ backgroundColor: primaryColor + '20' }} textStyle={{ color: primaryColor }}>
                        {dashboardStats.referralSources.totalResponses} responses
                      </Chip>
                      <PaperButton mode="outlined" icon="download">Export</PaperButton>
                    </View>
                  </View>

                  <Caption style={{ ...styles.sectionSubtitle, color: textSecondaryColor, marginBottom: spacing.lg }}>
                    Understanding how clients discover ANIMO helps optimize marketing efforts
                  </Caption>

                  <View style={styles.referralSourcesGrid}>
                    {dashboardStats.referralSources.sources && dashboardStats.referralSources.sources.length > 0 ? (
                      dashboardStats.referralSources.sources.map((source, index) => (
                        <View key={index} style={styles.referralSourceItem}>
                          <View style={styles.referralSourceHeader}>
                            <View style={styles.referralSourceInfo}>
                              <Body style={{ ...styles.referralSourceName, color: textColor }}>{source.source}</Body>
                              <View style={styles.referralSourceStats}>
                                <H3 style={{ color: textColor }}>{source.count}</H3>
                                <Caption style={{ color: textSecondaryColor }}>clients</Caption>
                              </View>
                            </View>
                            <Chip 
                              style={[styles.percentageChip, { backgroundColor: primaryColor + '20' }]}
                              textStyle={{ color: primaryColor, fontWeight: 'bold' }}
                            >
                              {source.percentage}%
                            </Chip>
                          </View>
                          <ProgressBar 
                            progress={source.percentage / 100} 
                            color={primaryColor}
                            style={styles.referralProgress}
                          />
                        </View>
                      ))
                    ) : (
                      <View style={styles.emptyState}>
                        <MaterialIcons name="analytics" size={48} color={textSecondaryColor} />
                        <H3 style={{ color: textSecondaryColor, textAlign: 'center', marginTop: spacing.md }}>
                          No Referral Data Available
                        </H3>
                        <Caption style={{ color: textSecondaryColor, textAlign: 'center', marginTop: spacing.sm }}>
                          Referral source tracking will be available once the database column is added.
                        </Caption>
                        <PaperButton 
                          mode="outlined" 
                          icon="database-plus"
                          style={{ marginTop: spacing.lg }}
                          onPress={() => {
                            // Show instructions for adding the column
                            Alert.alert(
                              'Add Referral Source Column',
                              'To enable referral source analytics, add the referral_source column to the users table in your Supabase database:\n\n' +
                              '1. Go to your Supabase dashboard\n' +
                              '2. Navigate to SQL Editor\n' +
                              '3. Run the migration SQL\n' +
                              '4. Refresh this page',
                              [{ text: 'OK' }]
                            );
                          }}
                        >
                          Setup Instructions
                        </PaperButton>
                      </View>
                    )}
                  </View>

                  {/* Marketing Insights */}
                  {dashboardStats.referralSources.sources && dashboardStats.referralSources.sources.length > 0 && (
                    <View style={styles.marketingInsights}>
                      <H3 style={{ ...styles.sectionHeading, color: textColor }}>Marketing Insights</H3>
                      <View style={styles.insightsGrid}>
                        <Surface style={[styles.insightCard, { backgroundColor: primaryColor + '10' }]} elevation={1}>
                          <MaterialIcons name="trending-up" size={24} color={primaryColor} />
                          <View style={styles.insightContent}>
                            <Body style={{ color: textColor, fontWeight: 'bold' }}>Top Channel</Body>
                            <Caption style={{ color: textSecondaryColor }}>
                              {dashboardStats.referralSources.sources?.[0]?.source || 'No data'} leads with {dashboardStats.referralSources.sources?.[0]?.percentage || 0}%
                            </Caption>
                          </View>
                        </Surface>

                        <Surface style={[styles.insightCard, { backgroundColor: successColor + '10' }]} elevation={1}>
                          <MaterialIcons name="share" size={24} color={successColor} />
                          <View style={styles.insightContent}>
                            <Body style={{ color: textColor, fontWeight: 'bold' }}>Word of Mouth</Body>
                            <Caption style={{ color: textSecondaryColor }}>
                              {dashboardStats.referralSources.sources?.find(s => s.source.includes('Referral') || s.source.includes('Word'))?.percentage || 0}% from referrals
                            </Caption>
                          </View>
                        </Surface>

                        <Surface style={[styles.insightCard, { backgroundColor: accentColor + '10' }]} elevation={1}>
                          <MaterialIcons name="public" size={24} color={accentColor} />
                          <View style={styles.insightContent}>
                            <Body style={{ color: textColor, fontWeight: 'bold' }}>Digital Channels</Body>
                            <Caption style={{ color: textSecondaryColor }}>
                              {dashboardStats.referralSources.sources?.filter(s => 
                                s.source.includes('Google') || s.source.includes('Social') || s.source.includes('Instagram') || s.source.includes('Facebook')
                              ).reduce((sum, s) => sum + s.percentage, 0)}% from online
                            </Caption>
                          </View>
                        </Surface>
                      </View>
                    </View>
                  )}
                </PaperCard.Content>
              </PaperCard>
            )}

            {/* Live Activity Section */}
            {reportType === 'activity' && (
              <PaperCard style={[styles.reportCard, { backgroundColor: surfaceColor }]}>
                <PaperCard.Content>
                  <View style={styles.cardHeader}>
                    <H2 style={{ ...styles.cardTitle, color: textColor }}>Live Activity Feed</H2>
                    <View style={styles.cardActions}>
                      <Chip style={{ backgroundColor: successColor + '20' }} textStyle={{ color: successColor }}>
                        Live
                      </Chip>
                      <PaperButton mode="text" icon="refresh" onPress={() => loadReportsData()}>
                        Refresh
                      </PaperButton>
                    </View>
      </View>

                  <Caption style={{ ...styles.sectionSubtitle, color: textSecondaryColor, marginBottom: spacing.lg }}>
                    Real-time studio activity from the last 7 days
                  </Caption>

                  <View style={styles.activityFeed}>
                                          {dashboardStats.recentActivity?.map((activity, index) => (
                      <View key={activity.id} style={styles.activityItem}>
                        <View style={[styles.activityIcon, { backgroundColor: getActivityColor(activity.type) + '20' }]}>
                          <MaterialIcons 
                            name={getActivityIcon(activity.type) as any} 
                            size={20} 
                            color={getActivityColor(activity.type)} 
                          />
                        </View>
                        
                        <View style={styles.activityContent}>
                          <View style={styles.activityHeader}>
                            <Body style={{ ...styles.activityDescription, color: textColor }}>
                              {activity.description}
                            </Body>
                            {activity.amount && (
                              <Chip 
                                style={[styles.amountChip, { backgroundColor: primaryColor + '20' }]}
                                textStyle={{ color: primaryColor, fontSize: 12, fontWeight: 'bold' }}
                              >
                                {formatCurrency(activity.amount)}
                              </Chip>
                            )}
                          </View>
                          
                          <View style={styles.activityMeta}>
                            <Caption style={{ color: textSecondaryColor }}>
                              {activity.user} • {formatDate(activity.timestamp)}
                            </Caption>
                            <Chip 
                              style={[styles.typeChip, { backgroundColor: getActivityColor(activity.type) + '10' }]}
                              textStyle={{ color: getActivityColor(activity.type), fontSize: 10 }}
                            >
                              {activity.type}
                            </Chip>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                </PaperCard.Content>
              </PaperCard>
            )}
          </>
        ) : (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={48} color={errorColor} />
            <Text style={[styles.errorText, { color: errorColor }]}>
              Failed to load analytics data
            </Text>
            <PaperButton mode="outlined" onPress={() => loadReportsData()}>
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
    marginBottom: spacing.lg,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    marginBottom: spacing.xs,
    fontSize: 32,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    marginBottom: spacing.sm,
    fontSize: 14,
  },
  dateFilters: {
    minWidth: 280,
  },
  segmentedButtons: {
    backgroundColor: 'transparent',
  },

  // Report Type Navigation
  reportTypeNav: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  reportTypeTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  activeReportTypeTab: {
    backgroundColor: '#f0f0f0',
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

  // Metrics Grid
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  metricCard: {
    flex: 1,
    minWidth: 280,
    padding: spacing.lg,
    borderRadius: 16,
    position: 'relative',
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  metricBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
  },
  metricNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  metricLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  metricProgress: {
    marginVertical: spacing.sm,
    height: 6,
    borderRadius: 3,
  },
  metricSubLabel: {
    fontSize: 12,
  },

  // Quick Stats Row
  quickStatsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  quickStatCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 12,
    gap: spacing.sm,
  },
  quickStatContent: {
    flex: 1,
  },

  // Report Cards
  reportCard: {
    marginBottom: spacing.lg,
    borderRadius: 16,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: spacing.md,
  },
  sectionSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },

  // Financial Analytics
  financialMetricsGrid: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginBottom: spacing.xl,
  },
  financialMetric: {
    flex: 1,
    alignItems: 'center',
  },
  financialAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  financialLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  
  // Top Plans
  topPlansSection: {
    marginTop: spacing.lg,
  },
  planItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: spacing.md,
  },
  planRank: {
    width: 50,
  },
  rankChip: {
    height: 28,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  planStats: {
    fontSize: 12,
  },
  planProgress: {
    width: 80,
  },

  // Revenue by Plan
  revenueByPlanSection: {
    marginTop: spacing.lg,
  },

  // Payment Methods
  paymentMethodsSection: {
    marginTop: spacing.lg,
  },
  paymentMethodsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  paymentMethodCard: {
    flex: 1,
    minWidth: 200,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 12,
    gap: spacing.sm,
  },
  paymentMethodInfo: {
    flex: 1,
  },

  // Client Analytics - Updated Layout
  clientMetricsContainer: {
    marginBottom: spacing.lg,
  },
  clientMetricsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  clientMetricCard: {
    flex: 1,
    minWidth: '48%',
    padding: spacing.md,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  clientMetricContent: {
    flex: 1,
  },
  clientMetricText: {
    marginTop: spacing.sm,
  },

  // Client Insights Section
  clientInsightsSection: {
    marginTop: spacing.lg,
  },
  insightsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  insightCard: {
    flex: 1,
    minWidth: '48%',
    padding: spacing.md,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  insightContent: {
    flex: 1,
  },

  // Subscription Status Section
  subscriptionStatusSection: {
    marginTop: spacing.lg,
  },
  subscriptionStatusGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  subscriptionStatusCard: {
    flex: 1,
    minWidth: '30%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
  },
  statusContent: {
    flex: 1,
  },

  // Client Segments
  clientSegmentsSection: {
    marginTop: spacing.lg,
  },
  clientSegmentsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  segmentCard: {
    flex: 1,
    minWidth: 200,
    padding: spacing.md,
    borderRadius: 12,
  },
  segmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  segmentChip: {
    height: 20,
  },

  // Reassignment Analytics
  reassignmentSection: {
    marginTop: spacing.lg,
  },
  reassignmentStatsGrid: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  reassignmentStatCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 12,
  },
  reassignmentInfo: {
    flex: 1,
  },
  reassignmentReasonsSection: {
    marginTop: spacing.md,
  },
  reasonItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  reasonInfo: {
    flex: 1,
  },

  // Status Indicator
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },

  // Referral Sources
  referralSourcesGrid: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  referralSourceItem: {
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
  },
  referralSourceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  referralSourceInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  referralSourceName: {
    fontSize: 16,
    fontWeight: '600',
  },
  referralSourceStats: {
    alignItems: 'center',
  },
  percentageChip: {
    height: 28,
  },
  referralProgress: {
    height: 6,
    borderRadius: 3,
  },

  // Marketing Insights
  marketingInsights: {
    marginTop: spacing.lg,
  },

  // Activity Feed
  activityFeed: {
    gap: spacing.md,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  activityDescription: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  amountChip: {
    height: 24,
    marginLeft: spacing.sm,
  },
  activityMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeChip: {
    height: 20,
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
    backgroundColor: '#f8f9fa',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    minHeight: 200,
  },
});

export default ReportsAnalytics; 