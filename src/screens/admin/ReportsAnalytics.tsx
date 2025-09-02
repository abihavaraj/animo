import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Dimensions, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import {
  ActivityIndicator,
  Chip,
  Card as PaperCard,
  SegmentedButtons
} from 'react-native-paper';
import { Body, Caption, H1, H2, H3 } from '../../../components/ui/Typography';
import { spacing } from '../../../constants/Spacing';
import { useThemeColor } from '../../../hooks/useThemeColor';
import { SimpleBarChart, SimpleLineChart, SimplePieChart } from '../../components/charts/SimpleChart';
import {
  AnalyticsDateRange,
  analyticsService,
  ClassAttendanceData,
  ClientEngagementData,
  DashboardSummary,
  EquipmentUtilization,
  InstructorPerformance,
  RevenueData,
  SubscriptionAnalytics
} from '../../services/analyticsService';

const { width: screenWidth } = Dimensions.get('window');
const chartWidth = Math.min(screenWidth - 40, 350);
const isWeb = Platform.OS === 'web';

interface DateFilter {
  label: string;
  value: string;
  startDate: string;
  endDate: string;
}

function ReportsAnalytics() {
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

  // State
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [attendanceData, setAttendanceData] = useState<ClassAttendanceData[]>([]);
  const [clientEngagement, setClientEngagement] = useState<ClientEngagementData | null>(null);
  const [instructorPerformance, setInstructorPerformance] = useState<InstructorPerformance[]>([]);
  const [equipmentUtilization, setEquipmentUtilization] = useState<EquipmentUtilization[]>([]);
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null);
  const [subscriptionAnalytics, setSubscriptionAnalytics] = useState<SubscriptionAnalytics | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Date filter options
  const getDateFilters = (): DateFilter[] => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const lastQuarter = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    const lastYear = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

    return [
      {
        label: 'Last 7 Days',
        value: 'week',
        startDate: lastWeek.toISOString().split('T')[0],
        endDate: today
      },
      {
        label: 'Last 30 Days',
        value: 'month',
        startDate: lastMonth.toISOString().split('T')[0],
        endDate: today
      },
      {
        label: 'Last Quarter',
        value: 'quarter',
        startDate: lastQuarter.toISOString().split('T')[0],
        endDate: today
      },
      {
        label: 'Last Year',
        value: 'year',
        startDate: lastYear.toISOString().split('T')[0],
        endDate: today
      }
    ];
  };

  const getCurrentDateRange = (): AnalyticsDateRange => {
    const filters = getDateFilters();
    const currentFilter = filters.find(f => f.value === selectedPeriod) || filters[1];
    return {
      startDate: currentFilter.startDate,
      endDate: currentFilter.endDate
    };
  };

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      const dateRange = getCurrentDateRange();
      console.log('📊 Loading analytics for date range:', dateRange);

      // Load all analytics data in parallel
      const [
        revenue,
        attendance,
        engagement,
        instructors,
        equipment,
        summary,
        subscriptions
      ] = await Promise.all([
        analyticsService.getRevenueAnalytics(dateRange),
        analyticsService.getClassAttendanceAnalytics(dateRange),
        analyticsService.getClientEngagementAnalytics(dateRange),
        analyticsService.getInstructorPerformanceAnalytics(dateRange),
        analyticsService.getEquipmentUtilizationAnalytics(dateRange),
        analyticsService.getDashboardSummary(dateRange),
        analyticsService.getSubscriptionAnalytics(dateRange)
      ]);

      setRevenueData(revenue);
      setAttendanceData(attendance);
      setClientEngagement(engagement);
      setInstructorPerformance(instructors);
      setEquipmentUtilization(equipment);
      setDashboardSummary(summary);
      setSubscriptionAnalytics(subscriptions);

      console.log('📊 Analytics data loaded successfully');
    } catch (error) {
      console.error('❌ Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalyticsData();
  }, [selectedPeriod]);

  // Chart colors
  const chartColors = {
    primary: '#9B8A7D',
    secondary: '#6B8E7F',
    accent: '#8E7B6B',
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444'
  };

  // Render Summary Cards
  const renderSummaryCards = () => {
    if (!dashboardSummary) return null;

    const summaryCards = [
      {
        title: 'Total Revenue',
        value: `$${dashboardSummary.totalRevenue.toLocaleString()}`,
        change: `+${dashboardSummary.revenueGrowth}%`,
        icon: 'attach-money',
        color: successColor
      },
      {
        title: 'Active Clients',
        value: dashboardSummary.totalClients.toString(),
        change: `+${dashboardSummary.clientGrowth}%`,
        icon: 'people',
        color: primaryColor
      },
      {
        title: 'Classes Held',
        value: dashboardSummary.totalClasses.toString(),
        change: `${dashboardSummary.averageAttendance} avg attendance`,
        icon: 'fitness-center',
        color: accentColor
      },
      {
        title: 'Top Instructor',
        value: dashboardSummary.topInstructor,
        change: dashboardSummary.mostPopularClass,
        icon: 'star',
        color: warningColor
      }
    ];

    return (
      <View style={styles.summaryContainer}>
        {summaryCards.map((card, index) => (
          <PaperCard key={index} style={[styles.summaryCard, { backgroundColor: surfaceColor }]}>
            <View style={styles.summaryCardContent}>
              <View style={styles.summaryCardHeader}>
                <MaterialIcons name={card.icon as any} size={24} color={card.color} />
                <Caption style={{ color: textMutedColor }}>{card.title}</Caption>
              </View>
              <H2 style={{ color: textColor, marginVertical: 4 }}>{card.value}</H2>
              <Caption style={{ color: card.color }}>{card.change}</Caption>
            </View>
          </PaperCard>
        ))}
      </View>
    );
  };

  // Render Revenue Chart
  const renderRevenueChart = () => {
    if (!revenueData.length) return null;

    const data = revenueData.slice(-7).map(d => d.amount);
    const labels = revenueData.slice(-7).map(d => {
      const date = new Date(d.date);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    });

    return (
      <PaperCard style={[styles.chartCard, { backgroundColor: surfaceColor }]}>
        <H3 style={StyleSheet.flatten([styles.chartTitle, { color: textColor }])}>Revenue Trend</H3>
        <SimpleLineChart
          data={data}
          labels={labels}
          color={chartColors.primary}
          fillColor={chartColors.primary}
          height={200}
        />
      </PaperCard>
    );
  };

  // Render Attendance Chart
  const renderAttendanceChart = () => {
    if (!attendanceData.length) return null;

    const data = attendanceData.slice(-5).map(d => d.utilization);
    const labels = attendanceData.slice(-5).map(d => d.className.substring(0, 8));

    return (
      <PaperCard style={[styles.chartCard, { backgroundColor: surfaceColor }]}>
        <H3 style={StyleSheet.flatten([styles.chartTitle, { color: textColor }])}>Class Utilization %</H3>
        <SimpleBarChart
          data={data}
          labels={labels}
          color={chartColors.secondary}
          height={200}
          maxValue={100}
        />
      </PaperCard>
    );
  };

  // Render Equipment Utilization Chart
  const renderEquipmentChart = () => {
    if (!equipmentUtilization.length) return null;

    const data = equipmentUtilization.map((item, index) => ({
      value: item.utilizationRate,
      label: item.equipmentType,
      color: [chartColors.primary, chartColors.secondary, chartColors.accent, chartColors.success][index % 4]
    }));

    return (
      <PaperCard style={[styles.chartCard, { backgroundColor: surfaceColor }]}>
        <H3 style={StyleSheet.flatten([styles.chartTitle, { color: textColor }])}>Equipment Utilization</H3>
        <SimplePieChart data={data} size={150} />
      </PaperCard>
    );
  };

  // Render Client Engagement
  const renderClientEngagement = () => {
    if (!clientEngagement) return null;

    return (
      <PaperCard style={[styles.statsCard, { backgroundColor: surfaceColor }]}>
        <H3 style={StyleSheet.flatten([styles.cardTitle, { color: textColor }])}>Client Engagement</H3>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <H2 style={{ color: successColor }}>{clientEngagement.newClients}</H2>
            <Caption style={{ color: textMutedColor }}>New Clients</Caption>
          </View>
          <View style={styles.statItem}>
            <H2 style={{ color: primaryColor }}>{clientEngagement.activeClients}</H2>
            <Caption style={{ color: textMutedColor }}>Active Clients</Caption>
          </View>
          <View style={styles.statItem}>
            <H2 style={{ color: accentColor }}>{clientEngagement.averageClassesPerClient}</H2>
            <Caption style={{ color: textMutedColor }}>Avg Classes/Client</Caption>
          </View>
          <View style={styles.statItem}>
            <H2 style={{ color: warningColor }}>{clientEngagement.clientRetentionRate}%</H2>
            <Caption style={{ color: textMutedColor }}>Retention Rate</Caption>
          </View>
        </View>
      </PaperCard>
    );
  };

  // Render Instructor Performance
  const renderInstructorPerformance = () => {
    if (!instructorPerformance.length) return null;

    return (
      <PaperCard style={[styles.statsCard, { backgroundColor: surfaceColor }]}>
        <H3 style={StyleSheet.flatten([styles.cardTitle, { color: textColor }])}>Instructor Performance</H3>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.instructorContainer}>
            {instructorPerformance.map((instructor, index) => (
              <View key={index} style={styles.instructorCard}>
                <Body style={StyleSheet.flatten([styles.instructorName, { color: textColor }])}>
                  {instructor.instructorName}
                </Body>
                <View style={styles.instructorStats}>
                  <View style={styles.instructorStat}>
                    <Caption style={{ color: textMutedColor }}>Classes</Caption>
                    <Body style={{ color: textColor }}>{instructor.totalClasses}</Body>
                  </View>
                  <View style={styles.instructorStat}>
                    <Caption style={{ color: textMutedColor }}>Students</Caption>
                    <Body style={{ color: textColor }}>{instructor.totalStudents}</Body>
                  </View>
                  <View style={styles.instructorStat}>
                    <Caption style={{ color: textMutedColor }}>Avg Attend</Caption>
                    <Body style={{ color: textColor }}>{instructor.averageAttendance}</Body>
                  </View>
                </View>
                <Chip
                  style={{ backgroundColor: primaryColor }}
                  textStyle={{ color: '#fff' }}
                >
                  {instructor.clientSatisfaction}/5 ⭐
                </Chip>
              </View>
            ))}
          </View>
        </ScrollView>
      </PaperCard>
    );
  };

  // Render Subscription Analytics
  const renderSubscriptionAnalytics = () => {
    if (!subscriptionAnalytics) return null;

    return (
      <PaperCard style={[styles.statsCard, { backgroundColor: surfaceColor }]}>
        <H3 style={StyleSheet.flatten([styles.cardTitle, { color: textColor }])}>Subscription Analytics</H3>
        <View style={styles.subscriptionStats}>
          <View style={styles.subscriptionSummary}>
            <View style={styles.statItem}>
              <H2 style={{ color: primaryColor }}>{subscriptionAnalytics.totalActiveSubscriptions}</H2>
              <Caption style={{ color: textMutedColor }}>Active Subscriptions</Caption>
            </View>
            <View style={styles.statItem}>
              <H2 style={{ color: successColor }}>{subscriptionAnalytics.retentionRate}%</H2>
              <Caption style={{ color: textMutedColor }}>Retention Rate</Caption>
            </View>
            <View style={styles.statItem}>
              <H2 style={{ color: warningColor }}>{subscriptionAnalytics.churnRate}%</H2>
              <Caption style={{ color: textMutedColor }}>Churn Rate</Caption>
            </View>
          </View>
          
          <View style={styles.planBreakdown}>
            <Caption style={StyleSheet.flatten([styles.sectionTitle, { color: textMutedColor }])}>Plans Breakdown</Caption>
            {subscriptionAnalytics.subscriptionsByPlan.map((plan, index) => (
              <View key={index} style={styles.planItem}>
                <View style={styles.planInfo}>
                  <Body style={{ color: textColor }}>{plan.planName}</Body>
                  <Caption style={{ color: textMutedColor }}>{plan.count} subscribers</Caption>
                </View>
                <Body style={{ color: successColor }}>${plan.revenue}</Body>
              </View>
            ))}
          </View>
        </View>
      </PaperCard>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor }]}>
        <ActivityIndicator size="large" color={primaryColor} />
        <Body style={{ color: textColor, marginTop: 16 }}>Loading analytics...</Body>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: surfaceColor }]}>
        <H1 style={{ color: textColor }}>Reports & Analytics</H1>
        
        {/* Date Filter */}
        {isWeb ? (
          <View style={styles.webDateFilterContainer}>
            <Body style={{ color: textSecondaryColor, marginRight: 12 }}>Time Period:</Body>
            <View style={styles.webDateFilter}>
              {getDateFilters().map((filter) => (
                <TouchableOpacity
                  key={filter.value}
                  style={[
                    styles.webDateTab,
                    { backgroundColor: surfaceColor, borderColor: textMutedColor },
                    selectedPeriod === filter.value && [
                      styles.webDateTabActive, 
                      { backgroundColor: accentColor, borderColor: accentColor }
                    ]
                  ]}
                  onPress={() => setSelectedPeriod(filter.value)}
                >
                  <Caption style={{
                    color: selectedPeriod === filter.value ? '#fff' : textColor,
                    fontWeight: selectedPeriod === filter.value ? '600' : '400'
                  }}>
                    {filter.label}
                  </Caption>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <SegmentedButtons
            value={selectedPeriod}
            onValueChange={setSelectedPeriod}
            buttons={getDateFilters().map(filter => ({
              value: filter.value,
              label: filter.label
            }))}
            style={styles.dateFilter}
          />
        )}
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Summary Cards */}
        {renderSummaryCards()}

        {/* Tab Navigation */}
        {isWeb ? (
          <View style={styles.webTabContainer}>
            {[
              { value: 'overview', label: 'Overview', icon: 'dashboard' },
              { value: 'revenue', label: 'Revenue', icon: 'attach-money' },
              { value: 'clients', label: 'Clients', icon: 'people' },
              { value: 'instructors', label: 'Instructors', icon: 'star' }
            ].map((tab) => (
              <TouchableOpacity
                key={tab.value}
                style={[
                  styles.webTab,
                  { backgroundColor: surfaceColor },
                  activeTab === tab.value && [styles.webTabActive, { backgroundColor: primaryColor }]
                ]}
                onPress={() => setActiveTab(tab.value)}
              >
                <MaterialIcons 
                  name={tab.icon as any} 
                  size={20} 
                  color={activeTab === tab.value ? '#fff' : textSecondaryColor} 
                />
                <Body style={{ 
                  color: activeTab === tab.value ? '#fff' : textColor,
                  fontWeight: activeTab === tab.value ? '600' : '400'
                }}>
                  {tab.label}
                </Body>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <SegmentedButtons
            value={activeTab}
            onValueChange={setActiveTab}
            buttons={[
              { value: 'overview', label: 'Overview' },
              { value: 'revenue', label: 'Revenue' },
              { value: 'clients', label: 'Clients' },
              { value: 'instructors', label: 'Instructors' }
            ]}
            style={styles.tabFilter}
          />
        )}

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <View style={styles.tabContent}>
            {renderRevenueChart()}
            {renderAttendanceChart()}
            {renderClientEngagement()}
          </View>
        )}

        {activeTab === 'revenue' && (
          <View style={styles.tabContent}>
            {renderRevenueChart()}
            {renderSubscriptionAnalytics()}
          </View>
        )}

        {activeTab === 'clients' && (
          <View style={styles.tabContent}>
            {renderClientEngagement()}
            {renderAttendanceChart()}
            {renderEquipmentChart()}
          </View>
        )}

        {activeTab === 'instructors' && (
          <View style={styles.tabContent}>
            {renderInstructorPerformance()}
            {renderAttendanceChart()}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  dateFilter: {
    marginTop: spacing.md,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  summaryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  summaryCard: {
    flex: 1,
    minWidth: 150,
    padding: spacing.md,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  summaryCardContent: {
    alignItems: 'flex-start',
  },
  summaryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  tabFilter: {
    marginBottom: spacing.lg,
  },
  tabContent: {
    gap: spacing.lg,
  },
  chartCard: {
    padding: spacing.lg,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  chartTitle: {
    marginBottom: spacing.md,
  },
  chart: {
    borderRadius: 8,
  },
  // Web-specific styles
  webDateFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  webDateFilter: {
    flexDirection: 'row',
    gap: 8,
  },
  webDateTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 90,
    alignItems: 'center',
  },
  webDateTabActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  webTabContainer: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
    gap: 12,
    flexWrap: 'wrap',
  },
  webTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    minWidth: 140,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  webTabActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    transform: [{ translateY: -2 }],
  },
  statsCard: {
    padding: spacing.lg,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: {
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statItem: {
    alignItems: 'center',
    minWidth: 80,
  },
  instructorContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  instructorCard: {
    minWidth: 150,
    padding: spacing.md,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
  },
  instructorName: {
    fontWeight: '600',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  instructorStats: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  instructorStat: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    minWidth: 80,
  },
  subscriptionStats: {
    gap: spacing.md,
  },
  subscriptionSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  planBreakdown: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  planItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  planInfo: {
    flex: 1,
  },
});

export default ReportsAnalytics;
