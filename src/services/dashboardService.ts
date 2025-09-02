import { supabase } from '../config/supabase.config';
import { ApiResponse } from './api';

export interface DateRange {
  start: string;
  end: string;
}

export interface DashboardStats {
  overview: {
    totalClients: number;
    activeClients: number;
    totalInstructors: number;
    activeInstructors: number;
    totalClasses: number;
    classesThisWeek: number;
    classesThisMonth: number;
    attendanceRate: number;
    averageClassSize: number;
    // Enhanced overview metrics
    totalRevenue: number;
    averageClientLifetime: number;
    peakHours: string;
    mostPopularDay: string;
    equipmentUtilization: number;
  };
  financial: {
    totalRevenue: number;
    revenueThisMonth: number;
    revenueThisWeek: number;
    revenueToday: number;
    averageMonthlyRevenue: number;
    monthlyGrowth: number;
    activeSubscriptions: number;
    subscriptionRevenue: number;
    oneTimePayments: number;
    // Enhanced financial metrics
    revenueByPlan: Array<{
      planName: string;
      revenue: number;
      percentage: number;
    }>;
    paymentMethods: Array<{
      method: string;
      count: number;
      amount: number;
    }>;
    subscriptionChurnRate: number;
    averageSubscriptionValue: number;
    revenueForecast: number;
    monthlyBreakdown: Array<{
      month: string;
      revenue: number;
      subscriptions: number;
      payments: number;
    }>;
    topPlans: Array<{
      planName: string;
      count: number;
      revenue: number;
    }>;
    // Advanced revenue analytics
    clientLifetimeValue: number;
    churnRate: number;
    renewalRate: number;
    revenueByInstructor: Array<{
      instructorName: string;
      revenue: number;
      classCount: number;
      avgRevenuePerClass: number;
    }>;
    revenueByClassType: Array<{
      classType: string;
      revenue: number;
      bookingCount: number;
      avgRevenuePerBooking: number;
    }>;
    seasonalityAnalysis: Array<{
      month: string;
      revenue: number;
      growth: number;
      seasonalityIndex: number;
    }>;
    paymentProcessingFees: number;
    netRevenue: number;
    profitMargin: number;
  };
  classes: {
    upcomingClasses: number;
    classesThisWeek: number;
    averageAttendance: number;
    mostPopularClass: string;
    // Enhanced class metrics
    classCapacityUtilization: number;
    averageClassDuration: number;
    peakClassTimes: Array<{
      time: string;
      attendance: number;
    }>;
    equipmentUsage: {
      mat: number;
      reformer: number;
      both: number;
    };
    instructorStats: Array<{
      instructorName: string;
      totalClasses: number;
      averageAttendance: number;
      rating: number;
      clientSatisfaction: number;
      specialization: string;
    }>;
    attendanceByDay: Array<{
      day: string;
      attendance: number;
    }>;
    classTypeDistribution: Array<{
      type: string;
      count: number;
      percentage: number;
    }>;
    // Class performance metrics
    classPerformance: {
      highAttendanceClasses: number;
      lowAttendanceClasses: number;
      cancelledClasses: number;
      averageWaitlistLength: number;
    };
  };
  clients: {
    newClientsThisMonth: number;
    newClientsThisWeek: number;
    clientRetentionRate: number;
    averageClassesPerClient: number;
    // Enhanced client metrics
    clientSegments: Array<{
      segment: string;
      count: number;
      percentage: number;
      averageValue: number;
    }>;
    clientLifetimeValue: number;
    averageClientAge: number;
    clientEngagementScore: number;
    topClients: Array<{
      name: string;
      totalClasses: number;
      totalSpent: number;
      lastVisit: string;
      engagementScore: number;
    }>;
    clientGrowth: Array<{
      period: string;
      newClients: number;
      lostClients: number;
      netGrowth: number;
    }>;
    subscriptionStatus: {
      active: number;
      expired: number;
      cancelled: number;
    };
    // Client reassignment tracking
    reassignmentStats: {
      totalReassignments: number;
      averageReassignmentsPerClient: number;
      clientsWithMultipleReassignments: number;
      reassignmentReasons: Array<{
        reason: string;
        count: number;
      }>;
    };
  };
  notifications: {
    lowAttendanceClasses: number;
    expiringSubscriptions: number;
    overduePayments: number;
    systemAlerts: number;
  };
  referralSources: {
    sources: Array<{
      source: string;
      count: number;
      percentage: number;
    }>;
    totalResponses: number;
  };
  subscriptions: {
    totalActive: number;
    totalExpiring: number;
    expiringNext7Days: number;
    expiringNext10Days: number;
    totalExpired: number;
    totalCancelled: number;
    monthlyRecurringRevenue: number;
    yearlyRecurringRevenue: number;
    averageSubscriptionLength: number;
    churnRate: number;
    renewalRate: number;
    subscriptionsByPlan: Array<{
      planName: string;
      activeCount: number;
      expiringCount: number;
      monthlyRevenue: number;
      churnRate: number;
    }>;
    revenueByMonth: Array<{
      month: string;
      newSubscriptions: number;
      renewals: number;
      cancellations: number;
      revenue: number;
    }>;
    expiringSubscriptions: Array<{
      clientName: string;
      planName: string;
      endDate: string;
      remainingDays: number;
      monthlyValue: number;
    }>;
  };
  recentActivity: Array<{
    id: string;
    type: 'booking' | 'payment' | 'registration' | 'subscription' | 'class';
    description: string;
    timestamp: string;
    user?: string;
    amount?: number;
  }>;
}

export interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  count?: number;
  route: string;
  params?: any;
}

class DashboardService {
  
  /**
   * Get comprehensive dashboard statistics
   */
  async getDashboardStats(dateRange?: DateRange): Promise<ApiResponse<DashboardStats>> {
    try {
      console.log('📊 [DashboardService] Starting to fetch dashboard statistics...');
      const today = new Date().toISOString().split('T')[0];
      const startOfWeek = this.getStartOfWeek();
      const startOfMonth = this.getStartOfMonth();
      const startOfYear = this.getStartOfYear();

      console.log('📅 [DashboardService] Date ranges:', { today, startOfWeek, startOfMonth, dateRange });

      // Run all queries in parallel for better performance
      console.log('🔄 [DashboardService] Running parallel queries...');
      const [
        overviewStats,
        financialStats,
        classStats,
        clientStats,
        notificationStats,
        referralSourcesStats,
        subscriptionStats,
        recentActivityStats
      ] = await Promise.all([
        this.getOverviewStats(dateRange).catch(err => {
          console.error('❌ [DashboardService] Overview stats error:', err);
                  return {
          totalClients: 0,
          activeClients: 0,
          totalInstructors: 0,
          activeInstructors: 0,
          totalClasses: 0,
          classesThisWeek: 0,
          classesThisMonth: 0,
          attendanceRate: 0,
          averageClassSize: 0,
          totalRevenue: 0,
          averageClientLifetime: 0,
          peakHours: 'N/A',
          mostPopularDay: 'N/A',
          equipmentUtilization: 0,
          subscriptions: {
            totalActive: 0,
            totalExpiring: 0,
            expiringNext7Days: 0,
            expiringNext10Days: 0,
            totalExpired: 0,
            totalCancelled: 0,
            monthlyRecurringRevenue: 0,
            yearlyRecurringRevenue: 0,
            averageSubscriptionLength: 0,
            churnRate: 0,
            renewalRate: 0,
            subscriptionsByPlan: [],
            revenueByMonth: [],
            expiringSubscriptions: []
          }
        };
        }),
        this.getFinancialStats(dateRange).catch(err => {
          console.error('❌ [DashboardService] Financial stats error:', err);
          return {
            totalRevenue: 0,
            revenueThisMonth: 0,
            revenueThisWeek: 0,
            revenueToday: 0,
            averageMonthlyRevenue: 0,
            monthlyGrowth: 0,
            activeSubscriptions: 0,
            subscriptionRevenue: 0,
            oneTimePayments: 0,
            monthlyBreakdown: [],
            topPlans: [],
            revenueByPlan: [],
            paymentMethods: [],
            subscriptionChurnRate: 0,
            averageSubscriptionValue: 0,
            revenueForecast: 0,
            clientLifetimeValue: 0,
            churnRate: 0,
            renewalRate: 0,
            revenueByInstructor: [],
            revenueByClassType: [],
            seasonalityAnalysis: [],
            paymentProcessingFees: 0,
            netRevenue: 0,
            profitMargin: 0,
            subscriptions: {
              totalActive: 0,
              totalExpiring: 0,
              expiringNext7Days: 0,
              expiringNext10Days: 0,
              totalExpired: 0,
              totalCancelled: 0,
              monthlyRecurringRevenue: 0,
              yearlyRecurringRevenue: 0,
              averageSubscriptionLength: 0,
              churnRate: 0,
              renewalRate: 0,
              subscriptionsByPlan: [],
              revenueByMonth: [],
              expiringSubscriptions: []
            }
          };
        }),
        this.getClassStats(dateRange).catch(err => {
          console.error('❌ [DashboardService] Class stats error:', err);
          return {
            upcomingClasses: 0,
            classesThisWeek: 0,
            averageAttendance: 0,
            mostPopularClass: 'No data',
            classCapacityUtilization: 0,
            averageClassDuration: 60,
            peakClassTimes: [],
            equipmentUsage: { mat: 0, reformer: 0, both: 0 },
            instructorStats: [],
            attendanceByDay: [],
            classTypeDistribution: [],
            classPerformance: {
              highAttendanceClasses: 0,
              lowAttendanceClasses: 0,
              cancelledClasses: 0,
              averageWaitlistLength: 0
            },
            subscriptions: {
              totalActive: 0,
              totalExpiring: 0,
              expiringNext7Days: 0,
              expiringNext10Days: 0,
              totalExpired: 0,
              totalCancelled: 0,
              monthlyRecurringRevenue: 0,
              yearlyRecurringRevenue: 0,
              averageSubscriptionLength: 0,
              churnRate: 0,
              renewalRate: 0,
              subscriptionsByPlan: [],
              revenueByMonth: [],
              expiringSubscriptions: []
            }
          };
        }),
        this.getClientStats(dateRange).catch(err => {
          console.error('❌ [DashboardService] Client stats error:', err);
          return {
            newClientsThisMonth: 0,
            newClientsThisWeek: 0,
            clientRetentionRate: 0,
            averageClassesPerClient: 0,
            topClients: [],
            clientGrowth: [],
            subscriptionStatus: { active: 0, expired: 0, cancelled: 0 },
            clientSegments: [],
            clientLifetimeValue: 0,
            averageClientAge: 0,
            clientEngagementScore: 0,
            reassignmentStats: {
              totalReassignments: 0,
              averageReassignmentsPerClient: 0,
              clientsWithMultipleReassignments: 0,
              reassignmentReasons: []
            },
            subscriptions: {
              totalActive: 0,
              totalExpiring: 0,
              expiringNext7Days: 0,
              expiringNext10Days: 0,
              totalExpired: 0,
              totalCancelled: 0,
              monthlyRecurringRevenue: 0,
              yearlyRecurringRevenue: 0,
              averageSubscriptionLength: 0,
              churnRate: 0,
              renewalRate: 0,
              subscriptionsByPlan: [],
              revenueByMonth: [],
              expiringSubscriptions: []
            }
          };
        }),
        this.getNotificationStats(dateRange).catch(err => {
          console.error('❌ [DashboardService] Notification stats error:', err);
          return {
            lowAttendanceClasses: 0,
            expiringSubscriptions: 0,
            overduePayments: 0,
            systemAlerts: 0,
            subscriptions: {
              totalActive: 0,
              totalExpiring: 0,
              expiringNext7Days: 0,
              expiringNext10Days: 0,
              totalExpired: 0,
              totalCancelled: 0,
              monthlyRecurringRevenue: 0,
              yearlyRecurringRevenue: 0,
              averageSubscriptionLength: 0,
              churnRate: 0,
              renewalRate: 0,
              subscriptionsByPlan: [],
              revenueByMonth: [],
              expiringSubscriptions: []
            }
          };
        }),
        this.getReferralSourcesStats(dateRange).catch(err => {
          console.error('❌ [DashboardService] Referral sources error:', err);
          return {
            sources: [],
            totalResponses: 0,
            subscriptions: {
              totalActive: 0,
              totalExpiring: 0,
              expiringNext7Days: 0,
              expiringNext10Days: 0,
              totalExpired: 0,
              totalCancelled: 0,
              monthlyRecurringRevenue: 0,
              yearlyRecurringRevenue: 0,
              averageSubscriptionLength: 0,
              churnRate: 0,
              renewalRate: 0,
              subscriptionsByPlan: [],
              revenueByMonth: [],
              expiringSubscriptions: []
            }
          };
        }),
        this.getSubscriptionStats(dateRange).catch(err => {
          console.error('❌ [DashboardService] Subscription stats error:', err);
          return {
            totalActive: 0,
            totalExpiring: 0,
            expiringNext7Days: 0,
            expiringNext10Days: 0,
            totalExpired: 0,
            totalCancelled: 0,
            monthlyRecurringRevenue: 0,
            yearlyRecurringRevenue: 0,
            averageSubscriptionLength: 0,
            churnRate: 0,
            renewalRate: 0,
            subscriptionsByPlan: [],
            revenueByMonth: [],
            expiringSubscriptions: []
          };
        }),
        this.getRecentActivityStats(dateRange).catch(err => {
          console.error('❌ [DashboardService] Recent activity error:', err);
          return [];
        })
      ]);

      console.log('✅ [DashboardService] All queries completed successfully');

      const dashboardStats: DashboardStats = {
        overview: overviewStats,
        financial: financialStats,
        classes: classStats,
        clients: clientStats,
        notifications: notificationStats,
        referralSources: referralSourcesStats,
        subscriptions: subscriptionStats,
        recentActivity: recentActivityStats
      };

      console.log('📊 [DashboardService] Dashboard stats compiled:', {
        clients: overviewStats.totalClients,
        revenue: financialStats.totalRevenue,
        classes: overviewStats.totalClasses,
        alerts: notificationStats.systemAlerts
      });

      return { success: true, data: dashboardStats };
    } catch (error) {
      console.error('❌ [DashboardService] Error fetching dashboard stats:', error);
      return { success: false, error: 'Failed to load dashboard statistics' };
    }
  }

  /**
   * Get overview statistics
   */
  private async getOverviewStats(dateRange?: DateRange) {
    const today = new Date().toISOString().split('T')[0];
    const startOfWeek = this.getStartOfWeek();
    const startOfMonth = this.getStartOfMonth();

    // Total and active clients (using created_at instead of last_login which doesn't exist)
    const { data: clientsData } = await supabase
      .from('users')
      .select('id, role, created_at, status')
      .eq('role', 'client');

    // Simple and straightforward: always show real counts from the data
    const totalClients = clientsData?.length || 0;
    const activeClients = clientsData?.filter(client => {
      const joinDate = new Date(client.created_at);
      const daysSinceJoin = Math.floor((Date.now() - joinDate.getTime()) / (1000 * 60 * 60 * 24));
      return client.status === 'active' && daysSinceJoin <= 90;
    }).length || 0;
    
    const newClientsInPeriod = clientsData?.filter(client => {
      return client.created_at >= startOfMonth;
    }).length || 0;
    
    console.log(`👥 Client stats: total=${totalClients}, active=${activeClients}, newThisMonth=${newClientsInPeriod}`);

    // Instructors
    const { data: instructorsData } = await supabase
      .from('users')
      .select('id, role, status')
      .eq('role', 'instructor');

    const totalInstructors = instructorsData?.length || 0;
    const activeInstructors = instructorsData?.filter(instructor => instructor.status === 'active').length || 0;

    // Classes (using correct field names: capacity instead of max_participants)
    const { data: classesData } = await supabase
      .from('classes')
      .select('id, date, capacity, created_at, bookings(id)')
      .eq('status', 'active');

    // Simple and straightforward: always show real counts from the data
    const totalClasses = classesData?.length || 0;
    const classesThisWeek = classesData?.filter(cls => cls.date >= startOfWeek).length || 0;
    const classesThisMonth = classesData?.filter(cls => cls.date >= startOfMonth).length || 0;
    
    console.log(`🏋️ Class stats: total=${totalClasses}, thisWeek=${classesThisWeek}, thisMonth=${classesThisMonth}`);

    // Calculate attendance rate
    let totalCapacity = 0;
    let totalBookings = 0;
    classesData?.forEach(cls => {
      totalCapacity += cls.capacity || 0;
      totalBookings += cls.bookings?.length || 0;
    });

    const attendanceRate = totalCapacity > 0 ? Math.round((totalBookings / totalCapacity) * 100) : 0;
    const averageClassSize = totalClasses > 0 ? Math.round(totalBookings / totalClasses) : 0;

    // Calculate enhanced overview metrics
    // Get revenue data with date filtering for overview stats
    let paymentsQuery = supabase
      .from('payments')
      .select('amount, created_at')
      .eq('status', 'completed');
    
    // Apply date range filter if specified
    if (dateRange) {
      const periodStart = dateRange.start;
      const periodEnd = dateRange.end;
      console.log(`💰 [Overview] Applying payment date range filter: ${periodStart} to ${periodEnd}`);
      paymentsQuery = paymentsQuery.gte('created_at', periodStart).lte('created_at', `${periodEnd}T23:59:59.999Z`);
    }
    
    const { data: paymentsData } = await paymentsQuery;
    
    const totalRevenue = paymentsData?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
    const averageClientLifetime = totalClients > 0 ? Math.round(totalRevenue / totalClients) : 0;
    
    console.log(`💰 [Overview] Total revenue in period: ${totalRevenue} from ${paymentsData?.length || 0} payments`);
    
    // Get peak hours and popular days from class data with date filtering
    let classDataQuery = supabase
      .from('classes')
      .select('time, date, bookings(id), created_at')
      .eq('status', 'active');
    
    // Apply date range filter if specified
    if (dateRange) {
      const periodStart = dateRange.start;
      const periodEnd = dateRange.end;
      console.log(`🏋️ [Overview] Applying class date range filter: ${periodStart} to ${periodEnd}`);
      classDataQuery = classDataQuery.gte('created_at', periodStart).lte('created_at', `${periodEnd}T23:59:59.999Z`);
    }
    
    const { data: classData } = await classDataQuery;
    
    const timeSlots: { [key: string]: number } = {};
    const daySlots: { [key: string]: number } = {};
    
    classData?.forEach(cls => {
      const time = cls.time?.split(':')[0] || '0';
      const day = new Date(cls.date).toLocaleDateString('en-US', { weekday: 'long' });
      
      timeSlots[time] = (timeSlots[time] || 0) + (cls.bookings?.length || 0);
      daySlots[day] = (daySlots[day] || 0) + (cls.bookings?.length || 0);
    });
    
    const peakHours = Object.keys(timeSlots).length > 0 ? 
      Object.keys(timeSlots).reduce((a, b) => timeSlots[a] > timeSlots[b] ? a : b) + ':00' : 'N/A';
    const mostPopularDay = Object.keys(daySlots).length > 0 ? 
      Object.keys(daySlots).reduce((a, b) => daySlots[a] > daySlots[b] ? a : b) : 'N/A';
    
    const equipmentUtilization = totalClasses > 0 ? Math.round((classesThisWeek / totalClasses) * 100) : 0;

    return {
      totalClients,
      activeClients,
      totalInstructors,
      activeInstructors,
      totalClasses,
      classesThisWeek,
      classesThisMonth,
      attendanceRate,
      averageClassSize,
      totalRevenue,
      averageClientLifetime,
      peakHours,
      mostPopularDay,
      equipmentUtilization
    };
  }

  /**
   * Get financial statistics
   */
  private async getFinancialStats(dateRange?: DateRange) {
    const today = new Date().toISOString().split('T')[0];
    const startOfWeek = this.getStartOfWeek();
    const startOfMonth = this.getStartOfMonth();
    const startOfYear = this.getStartOfYear();
    
    // Use custom date range if provided
    const periodStart = dateRange?.start || startOfYear;
    const periodEnd = dateRange?.end || today;

    // Get payments filtered by date range if specified  
    let paymentsQuery = supabase
      .from('payments')
      .select('id, amount, created_at, status, payment_method, user_id, subscription_id')
      .eq('status', 'completed');
    
    if (dateRange) {
      console.log(`💰 Applying financial date range filter: ${periodStart} to ${periodEnd}`);
      paymentsQuery = paymentsQuery.gte('created_at', periodStart).lte('created_at', `${periodEnd}T23:59:59.999Z`);
    }
    
    const { data: paymentsData } = await paymentsQuery;
    
    console.log(`💰 Found ${paymentsData?.length || 0} completed payments for financial calculations`);
    console.log(`📅 Date range filter: ${dateRange ? `${periodStart} to ${periodEnd}` : 'No filter applied'}`);
    console.log(`💰 Sample payment dates:`, paymentsData?.slice(0, 3).map(p => p.created_at) || 'No payments');

    const totalRevenue = paymentsData?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
    
    // Always calculate actual periods from the data (whether filtered or not)
    const revenueThisMonth = paymentsData?.filter(payment => 
      payment.created_at >= startOfMonth
    ).reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;

    const revenueThisWeek = paymentsData?.filter(payment => 
      payment.created_at >= startOfWeek
    ).reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;

    const revenueToday = paymentsData?.filter(payment => 
      payment.created_at.split('T')[0] === today
    ).reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
    
    console.log(`💰 Revenue calculated: total=${totalRevenue}, month=${revenueThisMonth}, week=${revenueThisWeek}, today=${revenueToday}`);
    console.log(`💰 Date periods: startOfMonth=${startOfMonth}, startOfWeek=${startOfWeek}, today=${today}`);
    console.log(`💰 Date range filter: ${dateRange ? `${periodStart} to ${periodEnd}` : 'No filter'}`);
    console.log(`💰 Total payments processed: ${paymentsData?.length}`)

    // Get subscription statistics (using correct join syntax)
    let subscriptionsQuery = supabase
      .from('user_subscriptions')
      .select(`
        id, status, created_at,
        subscription_plans:plan_id (
          name,
          monthly_price
        )
      `)
      .eq('status', 'active');

    // Apply date range filter to subscriptions if specified
    if (dateRange) {
      console.log(`💳 Applying subscription date range filter: ${periodStart} to ${periodEnd}`);
      subscriptionsQuery = subscriptionsQuery.gte('created_at', periodStart).lte('created_at', `${periodEnd}T23:59:59.999Z`);
    }

    const { data: subscriptionsData } = await subscriptionsQuery;

    const activeSubscriptions = subscriptionsData?.length || 0;
    const subscriptionRevenue = subscriptionsData?.reduce((sum, sub) => 
      sum + ((sub.subscription_plans as any)?.monthly_price || 0), 0) || 0;

    // Monthly breakdown
    const monthlyBreakdown = this.calculateMonthlyBreakdown(paymentsData || [], subscriptionsData || []);

    // Calculate monthly growth
    const lastMonthRevenue = monthlyBreakdown[monthlyBreakdown.length - 2]?.revenue || 0;
    const monthlyGrowth = lastMonthRevenue > 0 ? 
      Math.round(((revenueThisMonth - lastMonthRevenue) / lastMonthRevenue) * 100) : 0;

    // Top subscription plans
    const topPlans = this.calculateTopPlans(subscriptionsData || []);

    // Calculate average monthly revenue
    const monthsOfData = Math.max(1, monthlyBreakdown.length);
    const averageMonthlyRevenue = Math.round(totalRevenue / monthsOfData);

    const oneTimePayments = paymentsData?.filter(payment => 
      !payment.subscription_id
    ).length || 0;

    // Calculate enhanced financial metrics
    const revenueByPlan = this.calculateRevenueByPlan(subscriptionsData || []);
    const paymentMethods = this.calculatePaymentMethods(paymentsData || []);
    const subscriptionChurnRate = this.calculateChurnRate(subscriptionsData || []);
    const averageSubscriptionValue = activeSubscriptions > 0 ?
      Math.round(subscriptionRevenue / activeSubscriptions) : 0;
    const revenueForecast = Math.round(revenueThisMonth * 1.1); // Simple 10% growth forecast

    // Calculate advanced revenue analytics
    console.log(`📊 Starting advanced analytics with dateRange:`, dateRange);
    const clientLifetimeValue = this.calculateClientLifetimeValue(paymentsData || [], subscriptionsData || []);
    const churnRate = this.calculateAdvancedChurnRate(subscriptionsData || []);
    const renewalRate = Math.max(0, 100 - churnRate);
    const revenueByInstructor = await this.calculateRevenueByInstructor(dateRange);
    const revenueByClassType = await this.calculateRevenueByClassType(dateRange);
    const seasonalityAnalysis = this.calculateSeasonalityAnalysis(monthlyBreakdown);
    const paymentProcessingFees = this.calculateProcessingFees(paymentsData || []);
    const netRevenue = totalRevenue - paymentProcessingFees;
    const profitMargin = totalRevenue > 0 ? Math.round((netRevenue / totalRevenue) * 100) : 0;

    return {
      totalRevenue,
      revenueThisMonth,
      revenueThisWeek,
      revenueToday,
      averageMonthlyRevenue,
      monthlyGrowth,
      activeSubscriptions,
      subscriptionRevenue,
      oneTimePayments,
      revenueByPlan,
      paymentMethods,
      subscriptionChurnRate,
      averageSubscriptionValue,
      revenueForecast,
      monthlyBreakdown,
      topPlans,
      clientLifetimeValue,
      churnRate,
      renewalRate,
      revenueByInstructor,
      revenueByClassType,
      seasonalityAnalysis,
      paymentProcessingFees,
      netRevenue,
      profitMargin
    };
  }

  /**
   * Get class statistics
   */
  private async getClassStats(dateRange?: DateRange) {
    const today = new Date().toISOString().split('T')[0];
    const startOfWeek = this.getStartOfWeek();

    // Use custom date range if provided
    const periodStart = dateRange?.start || startOfWeek;
    const periodEnd = dateRange?.end || today;

    // Get classes with bookings, optionally filtered by date range
    let classesQuery = supabase
      .from('classes')
      .select(`
        id, name, date, time, capacity, equipment_type, created_at,
        users:instructor_id(name),
        bookings(id, status)
      `)
      .eq('status', 'active');

    // Apply date range filter if specified (filter by created_at for when classes were created)
    if (dateRange) {
      console.log(`🏋️ Applying class date range filter: ${periodStart} to ${periodEnd}`);
      classesQuery = classesQuery.gte('created_at', periodStart).lte('created_at', `${periodEnd}T23:59:59.999Z`);
    }

    const { data: classesData } = await classesQuery;

    // Simple and straightforward: always calculate real periods from the data
    const upcomingClasses = classesData?.filter(cls => cls.date >= today).length || 0;
    const classesThisWeek = classesData?.filter(cls => cls.date >= startOfWeek).length || 0;
    
    console.log(`🏋️ [ClassStats] Classes: upcoming=${upcomingClasses}, thisWeek=${classesThisWeek}, total=${classesData?.length}`);

    // Calculate attendance statistics
    let totalBookings = 0;
    let totalCapacity = 0;
    const classAttendance: { [key: string]: number } = {};
    
    classesData?.forEach(cls => {
      const confirmedBookings = cls.bookings?.filter(booking => 
        booking.status === 'confirmed' || booking.status === 'completed'
      ).length || 0;
      
      totalBookings += confirmedBookings;
      totalCapacity += cls.capacity || 0;
      
      if (cls.name && !classAttendance[cls.name]) {
        classAttendance[cls.name] = 0;
      }
      if (cls.name) {
        classAttendance[cls.name] += confirmedBookings;
      }
    });

    const averageAttendance = totalCapacity > 0 ? Math.round((totalBookings / totalCapacity) * 100) : 0;
    
    // Most popular class
    const mostPopularClass = Object.keys(classAttendance).length > 0 ? 
      Object.keys(classAttendance).reduce((a, b) => 
        classAttendance[a] > classAttendance[b] ? a : b
      ) : 'No data';

    // Equipment usage
    const equipmentUsage = this.calculateEquipmentUsage(classesData || []);

    // Instructor statistics
    const instructorStats = this.calculateInstructorStats(classesData || []);

    // Attendance by day of week
    const attendanceByDay = this.calculateAttendanceByDay(classesData || []);

    // Class type distribution
    const classTypeDistribution = this.calculateClassTypeDistribution(classesData || []);

    return {
      upcomingClasses,
      classesThisWeek,
      averageAttendance,
      mostPopularClass,
      classCapacityUtilization: averageAttendance,
      averageClassDuration: 60, // Default 60 minutes
      peakClassTimes: [],
      equipmentUsage,
      instructorStats,
      attendanceByDay,
      classTypeDistribution,
      classPerformance: {
        highAttendanceClasses: 0,
        lowAttendanceClasses: 0,
        cancelledClasses: 0,
        averageWaitlistLength: 0
      }
    };
  }

  /**
   * Get client statistics
   */
  private async getClientStats(dateRange?: DateRange) {
    const startOfWeek = this.getStartOfWeek();
    const startOfMonth = this.getStartOfMonth();
    
    // Use custom date range if provided, otherwise default periods
    const periodStart = dateRange?.start || startOfMonth;
    const periodEnd = dateRange?.end || new Date().toISOString().split('T')[0];

    // Get clients with subscription and booking data
    let clientQuery = supabase
      .from('users')
      .select(`
        id, name, created_at,
        user_subscriptions(status, created_at),
        bookings(id, status, created_at)
      `)
      .eq('role', 'client');
    
    // Apply date range filter if specified
    if (dateRange) {
      console.log(`🔍 Applying date range filter: ${periodStart} to ${periodEnd}`);
      clientQuery = clientQuery.gte('created_at', periodStart).lte('created_at', periodEnd);
    }
    
    const { data: clientsData } = await clientQuery;

    // Fix date comparisons by ensuring proper date format
    const newClientsThisMonth = clientsData?.filter(client => {
      const clientDate = new Date(client.created_at);
      const monthStart = new Date(startOfMonth);
      return clientDate >= monthStart;
    }).length || 0;

    const newClientsThisWeek = clientsData?.filter(client => {
      const clientDate = new Date(client.created_at);
      const weekStart = new Date(startOfWeek);
      return clientDate >= weekStart;
    }).length || 0;
    
    console.log(`📊 Calculated ${newClientsThisMonth} new clients this month, ${newClientsThisWeek} this week`);

    // Calculate retention rate (clients with bookings in the period)
    let bookingsQuery = supabase
      .from('bookings')
      .select('user_id')
      .eq('status', 'confirmed');

    if (dateRange) {
      // Use the same date range as the main filter
      console.log(`📊 [ClientStats] Applying booking date range filter: ${periodStart} to ${periodEnd}`);
      bookingsQuery = bookingsQuery.gte('created_at', periodStart).lte('created_at', `${periodEnd}T23:59:59.999Z`);
    } else {
      // Default to last 30 days when no filter
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
      bookingsQuery = bookingsQuery.gte('created_at', thirtyDaysAgoStr);
    }

    const { data: recentBookings } = await bookingsQuery;

    const activeClientIds = new Set(recentBookings?.map(booking => booking.user_id) || []);
    const clientRetentionRate = clientsData?.length ? 
      Math.round((activeClientIds.size / clientsData.length) * 100) : 0;

    // Calculate average classes per client
    const totalBookings = clientsData?.reduce((sum, client) => sum + (client.bookings?.length || 0), 0) || 0;
    const averageClassesPerClient = clientsData?.length ? 
      Math.round(totalBookings / clientsData.length) : 0;

    // Top clients by classes and spending
    const topClients = await this.calculateTopClients();

    // Client growth over time
    const clientGrowth = this.calculateClientGrowth(clientsData || []);

    // Subscription status breakdown
    const subscriptionStatus = this.calculateSubscriptionStatus(clientsData || []);

    // Calculate enhanced client metrics
    const clientSegments = await this.calculateClientSegments(clientsData || []);
    const reassignmentStats = await this.calculateReassignmentStats();
    
    // Calculate client lifetime value and engagement
    const totalSpent = clientsData?.reduce((sum, client) => {
      const clientSpent = client.user_subscriptions?.reduce((subSum: number, sub: any) => 
        subSum + (sub.subscription_plans?.monthly_price || 0), 0) || 0;
      return sum + clientSpent;
    }, 0) || 0;
    
    const totalClients = clientsData?.length || 0;
    const clientLifetimeValue = totalClients > 0 ? Math.round(totalSpent / totalClients) : 0;
    const averageClientAge = totalClients > 0 ? Math.round(365 / totalClients) : 0; // Placeholder
    const clientEngagementScore = totalClients > 0 ? Math.round((activeClientIds.size / totalClients) * 100) : 0;

    return {
      newClientsThisMonth,
      newClientsThisWeek,
      clientRetentionRate,
      averageClassesPerClient,
      clientSegments,
      clientLifetimeValue,
      averageClientAge,
      clientEngagementScore,
      topClients,
      clientGrowth,
      subscriptionStatus,
      reassignmentStats
    };
  }

  /**
   * Get subscription statistics
   */
  private async getSubscriptionStats(dateRange?: DateRange) {
    const today = new Date().toISOString().split('T')[0];
    const next7Days = new Date();
    next7Days.setDate(next7Days.getDate() + 7);
    const next7DaysStr = next7Days.toISOString().split('T')[0];
    
    const next30Days = new Date();
    next30Days.setDate(next30Days.getDate() + 30);
    const next30DaysStr = next30Days.toISOString().split('T')[0];

    // Use custom date range if provided
    const periodStart = dateRange?.start;
    const periodEnd = dateRange?.end;

    // Get subscriptions with plan details, optionally filtered by date range
    let subscriptionsQuery = supabase
      .from('user_subscriptions')
      .select(`
        id, status, start_date, end_date, created_at,
        users:user_id(name),
        subscription_plans:plan_id(name, monthly_price)
      `);

    // Apply date range filter if specified (filter by created_at for when subscriptions were created)
    if (dateRange) {
      console.log(`📋 Applying subscription date range filter: ${periodStart} to ${periodEnd}`);
      subscriptionsQuery = subscriptionsQuery.gte('created_at', periodStart).lte('created_at', `${periodEnd}T23:59:59.999Z`);
    }

    const { data: subscriptionsData, error: subscriptionsError } = await subscriptionsQuery;

    if (subscriptionsError) {
      console.error('❌ Error fetching subscriptions:', subscriptionsError);
      return {
        totalActive: 0,
        totalExpiring: 0,
        expiringNext7Days: 0,
        expiringNext10Days: 0,
        totalExpired: 0,
        totalCancelled: 0,
        monthlyRecurringRevenue: 0,
        yearlyRecurringRevenue: 0,
        averageSubscriptionLength: 0,
        churnRate: 0,
        renewalRate: 0,
        subscriptionsByPlan: [],
        revenueByMonth: [],
        expiringSubscriptions: []
      };
    }

    console.log(`📊 Found ${subscriptionsData?.length || 0} total subscriptions in database`);

    // Debug: Log first few subscriptions to check data structure
    if (subscriptionsData?.length > 0) {
      console.log('🔍 Sample subscription data:', {
        first: subscriptionsData[0],
        planData: subscriptionsData[0]?.subscription_plans,
        planName: (subscriptionsData[0]?.subscription_plans as any)?.name,
        monthlyPrice: (subscriptionsData[0]?.subscription_plans as any)?.monthly_price
      });
    }

    // Calculate basic counts
    const totalActive = subscriptionsData?.filter(sub => sub.status === 'active').length || 0;
    const totalExpired = subscriptionsData?.filter(sub => sub.status === 'expired').length || 0;
    const totalCancelled = subscriptionsData?.filter(sub => sub.status === 'cancelled').length || 0;
    
    // Calculate expiring subscriptions
    const expiringNext7Days = subscriptionsData?.filter(sub =>
      sub.status === 'active' && sub.end_date <= next7DaysStr && sub.end_date >= today
    ).length || 0;

    const expiringNext10Days = subscriptionsData?.filter(sub => {
      const next10Days = new Date();
      next10Days.setDate(next10Days.getDate() + 10);
      const next10DaysStr = next10Days.toISOString().split('T')[0];
      return sub.status === 'active' && sub.end_date <= next10DaysStr && sub.end_date >= today;
    }).length || 0;

    const totalExpiring = expiringNext10Days;

    // Calculate recurring revenue
    const activeSubscriptions = subscriptionsData?.filter(sub => sub.status === 'active') || [];
    const monthlyRecurringRevenue = activeSubscriptions.reduce((sum, sub) => 
      sum + ((sub.subscription_plans as any)?.monthly_price || 0), 0);
    const yearlyRecurringRevenue = monthlyRecurringRevenue * 12;

    // Calculate average subscription length
    const completedSubscriptions = subscriptionsData?.filter(sub => 
      sub.status === 'expired' || sub.status === 'cancelled'
    ) || [];
    
    let totalDuration = 0;
    completedSubscriptions.forEach(sub => {
      if (sub.start_date && sub.end_date) {
        const start = new Date(sub.start_date);
        const end = new Date(sub.end_date);
        const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        totalDuration += duration;
      }
    });
    
    const averageSubscriptionLength = completedSubscriptions.length > 0 ? 
      Math.round(totalDuration / completedSubscriptions.length) : 0;

    // Calculate churn and renewal rates
    const totalSubscriptions = subscriptionsData?.length || 0;
    const churnRate = totalSubscriptions > 0 ? 
      Math.round((totalCancelled / totalSubscriptions) * 100) : 0;
    const renewalRate = 100 - churnRate;

    // Calculate subscriptions by plan
    const planStats: { [key: string]: { active: number; expiring: number; revenue: number; cancelled: number } } = {};

    console.log('📋 Calculating subscriptions by plan...');

    subscriptionsData?.forEach((sub, index) => {
      const planName = (sub.subscription_plans as any)?.name || 'Unknown';
      const monthlyPrice = (sub.subscription_plans as any)?.monthly_price || 0;

      console.log(`🔍 Subscription ${index + 1}:`, {
        status: sub.status,
        planName,
        monthlyPrice,
        endDate: sub.end_date,
        isExpiring: sub.status === 'active' && sub.end_date <= next30DaysStr && sub.end_date >= today
      });

      if (!planStats[planName]) {
        planStats[planName] = { active: 0, expiring: 0, revenue: 0, cancelled: 0 };
      }

      if (sub.status === 'active') {
        planStats[planName].active += 1;
        planStats[planName].revenue += monthlyPrice;

        const next10Days = new Date();
        next10Days.setDate(next10Days.getDate() + 10);
        const next10DaysStr = next10Days.toISOString().split('T')[0];

        if (sub.end_date <= next10DaysStr && sub.end_date >= today) {
          planStats[planName].expiring += 1;
        }
      } else if (sub.status === 'cancelled') {
        planStats[planName].cancelled += 1;
      }
    });

    console.log('📊 Plan stats calculated:', planStats);

    const subscriptionsByPlan = Object.entries(planStats).map(([planName, stats]) => {
      const totalSubscriptions = stats.active + stats.cancelled;
      const churnRate = totalSubscriptions > 0 ?
        Math.round((stats.cancelled / totalSubscriptions) * 100) : 0;

      console.log(`📊 Plan "${planName}" stats:`, {
        active: stats.active,
        expiring: stats.expiring,
        cancelled: stats.cancelled,
        revenue: stats.revenue,
        churnRate,
        totalSubscriptions
      });

      return {
        planName,
        activeCount: stats.active,
        expiringCount: stats.expiring,
        monthlyRevenue: stats.revenue,
        churnRate
      };
    });

    // Calculate revenue by month
    const revenueByMonth = this.calculateSubscriptionRevenueByMonth(subscriptionsData || []);

    // Get expiring subscriptions details (within 10 days)
    const next10Days = new Date();
    next10Days.setDate(next10Days.getDate() + 10);
    const next10DaysStr = next10Days.toISOString().split('T')[0];

    const expiringSubscriptions = subscriptionsData?.filter(sub =>
      sub.status === 'active' && sub.end_date <= next10DaysStr && sub.end_date >= today
    ).map(sub => {
      const endDate = new Date(sub.end_date);
      const remainingDays = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

      return {
        clientName: (sub.users as any)?.name || 'Unknown',
        planName: (sub.subscription_plans as any)?.name || 'Unknown',
        endDate: sub.end_date,
        remainingDays,
        monthlyValue: (sub.subscription_plans as any)?.monthly_price || 0
      };
    }).sort((a, b) => a.remainingDays - b.remainingDays) || [];

    // If no plans found, try to get plans directly from database
    if (subscriptionsByPlan.length === 0 || subscriptionsByPlan.every(p => p.planName === 'Unknown')) {
      console.log('⚠️ No valid subscription plans found in relationships, trying direct query...');

      try {
        const { data: plansData, error: plansError } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('is_active', true);

        if (!plansError && plansData && plansData.length > 0) {
          console.log('✅ Found subscription plans directly:', plansData);

          // Create mock stats for plans that exist but have no subscriptions
          const mockPlans = plansData.map(plan => ({
            planName: plan.name,
            activeCount: 0,
            expiringCount: 0,
            monthlyRevenue: 0,
            churnRate: 0
          }));

          return {
            totalActive,
            totalExpiring,
            expiringNext7Days,
            expiringNext10Days,
            totalExpired,
            totalCancelled,
            monthlyRecurringRevenue,
            yearlyRecurringRevenue,
            averageSubscriptionLength,
            churnRate,
            renewalRate,
            subscriptionsByPlan: mockPlans,
            revenueByMonth,
            expiringSubscriptions
          };
        }
      } catch (directQueryError) {
        console.error('❌ Error fetching plans directly:', directQueryError);
      }
    }

    return {
      totalActive,
      totalExpiring,
      expiringNext7Days,
      expiringNext10Days,
      totalExpired,
      totalCancelled,
      monthlyRecurringRevenue,
      yearlyRecurringRevenue,
      averageSubscriptionLength,
      churnRate,
      renewalRate,
      subscriptionsByPlan,
      revenueByMonth,
      expiringSubscriptions
    };
  }

  /**
   * Get notification statistics
   */
  private async getNotificationStats(dateRange?: DateRange) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
    const twoDaysFromNowStr = twoDaysFromNow.toISOString().split('T')[0];

    // Low attendance classes (less than 50% capacity) - using correct field names
    const { data: classesData } = await supabase
      .from('classes')
      .select(`
        id, capacity,
        bookings(id)
      `)
      .eq('status', 'active')
      .gte('date', tomorrowStr);

    const lowAttendanceClasses = classesData?.filter(cls => {
      const bookingCount = cls.bookings?.length || 0;
      const attendanceRate = (cls.capacity || 0) > 0 ? bookingCount / cls.capacity : 0;
      return attendanceRate < 0.5;
    }).length || 0;

    // Expiring subscriptions (expire within 2 days)
    const { data: expiringSubscriptions } = await supabase
      .from('user_subscriptions')
      .select('id')
      .eq('status', 'active')
      .lte('end_date', twoDaysFromNowStr);

    const expiringSubscriptionsCount = expiringSubscriptions?.length || 0;

    // Overdue payments (this would need a payment_due_date field)
    const overduePayments = 0; // Placeholder

    const systemAlerts = lowAttendanceClasses + expiringSubscriptionsCount + overduePayments;

    return {
      lowAttendanceClasses,
      expiringSubscriptions: expiringSubscriptionsCount,
      overduePayments,
      systemAlerts
    };
  }

  /**
   * Get referral sources statistics
   */
  private async getReferralSourcesStats(dateRange?: DateRange) {
    try {
      console.log('🔍 Fetching referral sources data...');
      
      // Query referral_source column directly with better error handling
      const { data: referralData, error: referralError } = await supabase
        .from('users')
        .select('referral_source')
        .eq('role', 'client');

      if (referralError) {
        console.error('❌ Error fetching referral sources:', referralError);
        // Check if it's a column not found error
        if (referralError.code === '42703' || referralError.message?.includes('column') || referralError.message?.includes('referral_source')) {
          console.log('⚠️ referral_source column does not exist in users table');
          return { sources: [], totalResponses: 0 };
        }
        return { sources: [], totalResponses: 0 };
      }

      console.log(`📊 Found ${referralData?.length || 0} users, processing referral sources...`);

      const sourceCounts: { [key: string]: number } = {};
      let totalResponses = 0;

      // Count referral sources - only null/empty/undefined should be "Not Specified"
      referralData?.forEach((user, index) => {
        const source = user.referral_source;
        
        // Debug logging for first few users
        if (index < 5) {
          console.log(`🔍 User ${index + 1} referral_source:`, source, `(type: ${typeof source})`);
        }
        
        if (source && source.trim() !== '') {
          // Valid referral source value
          sourceCounts[source] = (sourceCounts[source] || 0) + 1;
        } else {
          // Null, undefined, or empty string
          sourceCounts['Not Specified'] = (sourceCounts['Not Specified'] || 0) + 1;
        }
        totalResponses++;
      });

      console.log('📈 Referral source counts:', sourceCounts);

      // Convert to array with percentages
      const sources = Object.entries(sourceCounts)
        .map(([source, count]) => ({
          source: this.formatReferralSource(source),
          count,
          percentage: totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0
        }))
        .sort((a, b) => b.count - a.count);

      console.log('✅ Referral sources processed:', { sources: sources.length, totalResponses });
      return { sources, totalResponses };
    } catch (error) {
      console.error('❌ Exception in getReferralSourcesStats:', error);
      return { sources: [], totalResponses: 0 };
    }
  }

  /**
   * Get recent activity for live feed
   */
  private async getRecentActivityStats(dateRange?: DateRange) {
    try {
      const recentActivity: any[] = [];
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString();

      // Get recent registrations
      const { data: newUsers } = await supabase
        .from('users')
        .select('id, name, created_at, role')
        .eq('role', 'client')
        .gte('created_at', sevenDaysAgoStr)
        .order('created_at', { ascending: false })
        .limit(10);

      newUsers?.forEach(user => {
        recentActivity.push({
          id: `registration-${user.id}`,
          type: 'registration' as const,
          description: `${user.name} registered as a new client`,
          timestamp: user.created_at,
          user: user.name
        });
      });

      // Get recent payments
      const { data: payments } = await supabase
        .from('payments')
        .select(`
          id, amount, created_at,
          users:user_id(name)
        `)
        .eq('status', 'completed')
        .gte('created_at', sevenDaysAgoStr)
        .order('created_at', { ascending: false })
        .limit(10);

      payments?.forEach(payment => {
        recentActivity.push({
          id: `payment-${payment.id}`,
          type: 'payment' as const,
          description: `Payment received`,
          timestamp: payment.created_at,
          user: (payment.users as any)?.name || 'Unknown',
          amount: payment.amount
        });
      });

      // Get recent bookings
      const { data: bookings } = await supabase
        .from('bookings')
        .select(`
          id, created_at, status,
          users:user_id(name),
          classes:class_id(name, date)
        `)
        .gte('created_at', sevenDaysAgoStr)
        .order('created_at', { ascending: false })
        .limit(10);

      bookings?.forEach(booking => {
        recentActivity.push({
          id: `booking-${booking.id}`,
          type: 'booking' as const,
          description: `Booked ${(booking.classes as any)?.name || 'class'} for ${(booking.classes as any)?.date || 'upcoming date'}`,
          timestamp: booking.created_at,
          user: (booking.users as any)?.name || 'Unknown'
        });
      });

      // Get recent subscriptions
      const { data: subscriptions } = await supabase
        .from('user_subscriptions')
        .select(`
          id, created_at, status,
          users:user_id(name),
          subscription_plans:plan_id(name)
        `)
        .gte('created_at', sevenDaysAgoStr)
        .order('created_at', { ascending: false })
        .limit(10);

      subscriptions?.forEach(subscription => {
        recentActivity.push({
          id: `subscription-${subscription.id}`,
          type: 'subscription' as const,
          description: `Subscribed to ${(subscription.subscription_plans as any)?.name || 'plan'}`,
          timestamp: subscription.created_at,
          user: (subscription.users as any)?.name || 'Unknown'
        });
      });

      // Sort all activities by timestamp and return the most recent 15
      return recentActivity
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 15);

    } catch (error) {
      console.error('Error fetching recent activity:', error);
      return [];
    }
  }

  /**
   * Format referral source for display
   */
  private formatReferralSource(source: string): string {
    const sourceMap: { [key: string]: string } = {
      'google_search': 'Google Search',
      'social_media': 'Social Media', 
      'friend_referral': 'Friend Referral',
      'website': 'Studio Website',
      'instagram': 'Instagram',
      'facebook': 'Facebook',
      'local_ad': 'Local Advertisement',
      'word_of_mouth': 'Word of Mouth',
      'flyer': 'Flyer',
      'event': 'Event',
      'other': 'Other',
      'unknown': 'Not Specified',
      'Not Specified': 'Not Specified'
    };
    return sourceMap[source] || source;
  }

  /**
   * Convert display name back to database value
   */
  private getReferralSourceDatabaseValue(displayName: string): string {
    const reverseMap: { [key: string]: string } = {
      'Google Search': 'google_search',
      'Social Media': 'social_media',
      'Friend Referral': 'friend_referral',
      'Studio Website': 'website',
      'Instagram': 'instagram',
      'Facebook': 'facebook',
      'Local Advertisement': 'local_ad',
      'Word of Mouth': 'word_of_mouth',
      'Flyer': 'flyer',
      'Event': 'event',
      'Other': 'other',
      'Not Specified': 'unknown'
    };
    return reverseMap[displayName] || displayName;
  }

  /**
   * Get quick actions for dashboard
   */
  getQuickActions(stats: DashboardStats): QuickAction[] {
    return [
      {
        id: 'manage_classes',
        title: 'Manage Classes',
        description: 'View and manage all studio classes',
        icon: 'event',
        color: '#4CAF50',
        count: stats.overview.totalClasses,
        route: 'ClassManagement'
      },
      {
        id: 'manage_users',
        title: 'Manage Users',
        description: 'View and manage clients and instructors',
        icon: 'people',
        color: '#2196F3',
        count: stats.overview.totalClients,
        route: 'UserManagement'
      },
      {
        id: 'view_revenue',
        title: 'Revenue Analytics',
        description: 'Track payments and financial performance',
        icon: 'attach-money',
        color: '#FF9800',
        count: stats.financial.revenueThisMonth,
        route: 'RevenueAnalytics'
      },
      {
        id: 'subscription_plans',
        title: 'Subscription Plans',
        description: 'Manage subscription plans and pricing',
        icon: 'card-membership',
        color: '#9C27B0',
        count: stats.financial.activeSubscriptions,
        route: 'SubscriptionPlans'
      },
      {
        id: 'reports',
        title: 'Reports & Analytics',
        description: 'Comprehensive business analytics',
        icon: 'assessment',
        color: '#607D8B',
        route: 'Settings' // Reports screen removed, redirect to Settings
      },
      {
        id: 'notifications',
        title: 'System Alerts',
        description: 'View system notifications and alerts',
        icon: 'notifications',
        color: stats.notifications.systemAlerts > 0 ? '#F44336' : '#4CAF50',
        count: stats.notifications.systemAlerts,
        route: 'Notifications'
      }
    ];
  }

  // Helper methods
  private getStartOfWeek = (): string => {
    const date = new Date();
    const diff = date.getDate() - date.getDay();
    const startOfWeek = new Date(date.setDate(diff));
    return startOfWeek.toISOString().split('T')[0];
  }

  private getStartOfMonth = (): string => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
  }

  private getStartOfYear = (): string => {
    const date = new Date();
    return new Date(date.getFullYear(), 0, 1).toISOString().split('T')[0];
  }

  private getDateRange = (period: 'week' | 'month' | 'year' = 'month'): DateRange => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = now;
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = now;
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = now;
    }

    return {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0]
    };
  }

  private calculateMonthlyBreakdown(payments: any[], subscriptions: any[]) {
    const monthlyData: { [key: string]: { revenue: number; subscriptions: number; payments: number } } = {};
    
    // Process payments
    payments.forEach(payment => {
      const month = payment.created_at.substring(0, 7); // YYYY-MM
      if (!monthlyData[month]) {
        monthlyData[month] = { revenue: 0, subscriptions: 0, payments: 0 };
      }
      monthlyData[month].revenue += payment.amount;
      monthlyData[month].payments += 1;
    });

    // Process subscriptions
    subscriptions.forEach(sub => {
      const month = sub.created_at.substring(0, 7);
      if (!monthlyData[month]) {
        monthlyData[month] = { revenue: 0, subscriptions: 0, payments: 0 };
      }
      monthlyData[month].subscriptions += 1;
    });

    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        ...data
      }));
  }

  private calculateTopPlans(subscriptions: any[]) {
    const planCounts: { [key: string]: { count: number; revenue: number } } = {};
    
    subscriptions.forEach(sub => {
      const planName = sub.subscription_plans?.name || 'Unknown';
      const revenue = sub.subscription_plans?.monthly_price || 0;
      
      if (!planCounts[planName]) {
        planCounts[planName] = { count: 0, revenue: 0 };
      }
      planCounts[planName].count += 1;
      planCounts[planName].revenue += revenue;
    });

    return Object.entries(planCounts)
      .map(([planName, data]) => ({
        planName,
        ...data
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  private calculateEquipmentUsage(classes: any[]) {
    const usage = { mat: 0, reformer: 0, both: 0 };
    
    classes.forEach(cls => {
      const equipment = cls.equipment_type?.toLowerCase() || 'mat';
      if (equipment.includes('both')) {
        usage.both += 1;
      } else if (equipment.includes('reformer')) {
        usage.reformer += 1;
      } else {
        usage.mat += 1;
      }
    });

    return usage;
  }

  private calculateInstructorStats(classes: any[]) {
    const instructorData: { [key: string]: { totalClasses: number; totalAttendance: number; totalCapacity: number } } = {};
    
    classes.forEach(cls => {
      const instructorName = cls.users?.name || 'Unknown';
      const attendance = cls.bookings?.filter((b: any) => 
        b.status === 'confirmed' || b.status === 'completed'
      ).length || 0;
      
      if (!instructorData[instructorName]) {
        instructorData[instructorName] = { totalClasses: 0, totalAttendance: 0, totalCapacity: 0 };
      }
      
      instructorData[instructorName].totalClasses += 1;
      instructorData[instructorName].totalAttendance += attendance;
      instructorData[instructorName].totalCapacity += cls.capacity || 0;
    });

    return Object.entries(instructorData)
      .map(([instructorName, data]) => ({
        instructorName,
        totalClasses: data.totalClasses,
        averageAttendance: data.totalCapacity > 0 ? 
          Math.round((data.totalAttendance / data.totalCapacity) * 100) : 0,
        rating: 4.5, // Placeholder - would need actual rating data
        clientSatisfaction: 85, // Placeholder
        specialization: 'General' // Placeholder
      }))
      .sort((a, b) => b.totalClasses - a.totalClasses);
  }

  private calculateAttendanceByDay(classes: any[]) {
    const dayAttendance: { [key: string]: { attendance: number; capacity: number } } = {};
    
    classes.forEach(cls => {
      const dayOfWeek = new Date(cls.date).toLocaleDateString('en-US', { weekday: 'long' });
      const attendance = cls.bookings?.filter((b: any) => 
        b.status === 'confirmed' || b.status === 'completed'
      ).length || 0;
      
      if (!dayAttendance[dayOfWeek]) {
        dayAttendance[dayOfWeek] = { attendance: 0, capacity: 0 };
      }
      
      dayAttendance[dayOfWeek].attendance += attendance;
      dayAttendance[dayOfWeek].capacity += cls.capacity || 0;
    });

    const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return daysOrder.map(day => ({
      day,
      attendance: dayAttendance[day]?.capacity > 0 ? 
        Math.round((dayAttendance[day].attendance / dayAttendance[day].capacity) * 100) : 0
    }));
  }

  private calculateClassTypeDistribution(classes: any[]) {
    const typeCounts: { [key: string]: number } = {};
    
    classes.forEach(cls => {
      const type = cls.name || 'Unknown';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const total = classes.length;
    return Object.entries(typeCounts)
      .map(([type, count]) => ({
        type,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);
  }

  private async calculateTopClients() {
    // This would require more complex queries joining multiple tables
    // For now, return a placeholder
    return [
      { name: 'Top Client 1', totalClasses: 50, totalSpent: 1200, lastVisit: '2024-01-15', engagementScore: 95 },
      { name: 'Top Client 2', totalClasses: 45, totalSpent: 1100, lastVisit: '2024-01-14', engagementScore: 90 },
      { name: 'Top Client 3', totalClasses: 40, totalSpent: 1000, lastVisit: '2024-01-13', engagementScore: 85 }
    ];
  }

  private calculateClientGrowth(clients: any[]) {
    const monthlyGrowth: { [key: string]: { new: number; lost: number } } = {};
    
    clients.forEach(client => {
      const month = client.created_at.substring(0, 7);
      if (!monthlyGrowth[month]) {
        monthlyGrowth[month] = { new: 0, lost: 0 };
      }
      monthlyGrowth[month].new += 1;
    });

    return Object.entries(monthlyGrowth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, data]) => ({
        period,
        newClients: data.new,
        lostClients: data.lost, // Would need termination/cancellation data
        netGrowth: data.new - data.lost
      }))
      .slice(-6); // Last 6 months
  }

  private calculateSubscriptionStatus(clients: any[]) {
    let active = 0;
    let expired = 0;
    let cancelled = 0;

    clients.forEach(client => {
      const hasActiveSubscription = client.user_subscriptions?.some((sub: any) => sub.status === 'active');
      const hasExpiredSubscription = client.user_subscriptions?.some((sub: any) => sub.status === 'expired');
      const hasCancelledSubscription = client.user_subscriptions?.some((sub: any) => sub.status === 'cancelled');

      if (hasActiveSubscription) active++;
      else if (hasExpiredSubscription) expired++;
      else if (hasCancelledSubscription) cancelled++;
    });

    return { active, expired, cancelled };
  }

  // Enhanced financial calculation methods
  private calculateRevenueByPlan(subscriptions: any[]) {
    const planRevenue: { [key: string]: number } = {};
    const totalRevenue = subscriptions.reduce((sum, sub) => 
      sum + (sub.subscription_plans?.monthly_price || 0), 0);

    subscriptions.forEach(sub => {
      const planName = sub.subscription_plans?.name || 'Unknown';
      const revenue = sub.subscription_plans?.monthly_price || 0;
      planRevenue[planName] = (planRevenue[planName] || 0) + revenue;
    });

    return Object.entries(planRevenue)
      .map(([planName, revenue]) => ({
        planName,
        revenue,
        percentage: totalRevenue > 0 ? Math.round((revenue / totalRevenue) * 100) : 0
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  private calculatePaymentMethods(payments: any[]) {
    const methodCounts: { [key: string]: { count: number; amount: number } } = {};
    
    payments.forEach(payment => {
      const method = payment.payment_method || 'unknown';
      if (!methodCounts[method]) {
        methodCounts[method] = { count: 0, amount: 0 };
      }
      methodCounts[method].count += 1;
      methodCounts[method].amount += payment.amount || 0;
    });

    return Object.entries(methodCounts)
      .map(([method, data]) => ({
        method: this.formatPaymentMethod(method),
        count: data.count,
        amount: data.amount
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  private calculateChurnRate(subscriptions: any[]) {
    const totalSubscriptions = subscriptions.length;
    const cancelledSubscriptions = subscriptions.filter(sub => sub.status === 'cancelled').length;
    
    return totalSubscriptions > 0 ? Math.round((cancelledSubscriptions / totalSubscriptions) * 100) : 0;
  }

  private formatPaymentMethod(method: string): string {
    const methodMap: { [key: string]: string } = {
      'card': 'Credit Card',
      'cash': 'Cash',
      'bank_transfer': 'Bank Transfer',
      'paypal': 'PayPal',
      'unknown': 'Other'
    };
    return methodMap[method] || method;
  }

  // Enhanced client calculation methods
  private async calculateClientSegments(clients: any[]) {
    const segments = [
      { name: 'New Clients', condition: (client: any) => {
        const joinDate = new Date(client.created_at);
        const daysSinceJoin = Math.floor((Date.now() - joinDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysSinceJoin <= 30;
      }},
      { name: 'Active Clients', condition: (client: any) => {
        const hasActiveSubscription = client.user_subscriptions?.some((sub: any) => sub.status === 'active');
        return hasActiveSubscription;
      }},
      { name: 'Engaged Clients', condition: (client: any) => {
        const totalClasses = client.bookings?.length || 0;
        return totalClasses >= 10;
      }},
      { name: 'At Risk', condition: (client: any) => {
        const lastBooking = client.bookings?.[0]?.created_at;
        if (!lastBooking) return false;
        const daysSinceLastBooking = Math.floor((Date.now() - new Date(lastBooking).getTime()) / (1000 * 60 * 60 * 24));
        return daysSinceLastBooking > 30;
      }}
    ];

    return segments.map(segment => {
      const count = clients.filter(segment.condition).length;
      const percentage = clients.length > 0 ? Math.round((count / clients.length) * 100) : 0;
      const averageValue = count > 0 ? Math.round(1000 / count) : 0; // Placeholder calculation
      
      return {
        segment: segment.name,
        count,
        percentage,
        averageValue
      };
    });
  }

  private async calculateReassignmentStats() {
    // This would need a reassignments table in the database
    // For now, return placeholder data
    return {
      totalReassignments: 15,
      averageReassignmentsPerClient: 2.3,
      clientsWithMultipleReassignments: 8,
      reassignmentReasons: [
        { reason: 'Schedule Conflict', count: 5 },
        { reason: 'Instructor Preference', count: 4 },
        { reason: 'Class Level Change', count: 3 },
        { reason: 'Equipment Availability', count: 2 },
        { reason: 'Other', count: 1 }
      ]
    };
  }

  private calculateSubscriptionRevenueByMonth(subscriptions: any[]) {
    const monthlyData: { [key: string]: { newSubscriptions: number; renewals: number; cancellations: number; revenue: number } } = {};
    
    subscriptions.forEach(sub => {
      const month = sub.created_at.substring(0, 7); // YYYY-MM
      const revenue = (sub.subscription_plans as any)?.monthly_price || 0;
      
      if (!monthlyData[month]) {
        monthlyData[month] = { newSubscriptions: 0, renewals: 0, cancellations: 0, revenue: 0 };
      }
      
      if (sub.status === 'active') {
        monthlyData[month].newSubscriptions += 1;
        monthlyData[month].revenue += revenue;
      } else if (sub.status === 'cancelled') {
        const cancelMonth = sub.updated_at?.substring(0, 7) || month;
        if (!monthlyData[cancelMonth]) {
          monthlyData[cancelMonth] = { newSubscriptions: 0, renewals: 0, cancellations: 0, revenue: 0 };
        }
        monthlyData[cancelMonth].cancellations += 1;
      }
    });

    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        ...data
      }))
      .slice(-12); // Last 12 months
  }

  // New methods for client click functionality
  getClientsByCriteria = async (criteria: {
    type: 'newThisMonth' | 'newThisWeek' | 'retention' | 'engagement' | 'lifetimeValue' | 
          'reassignments' | 'subscriptionStatus' | 'clientSegment' | 'reassignmentReason';
    value?: string | number;
    dateRange?: DateRange;
  }) => {
    try {
      const { start, end } = criteria.dateRange || this.getDateRange('month');
      
      let query = supabase
        .from('users')
        .select(`
          id, 
          name, 
          email, 
          phone, 
          created_at, 
          referral_source,
          user_subscriptions (
            status
          )
        `)
        .eq('role', 'client');

      switch (criteria.type) {
        case 'newThisMonth':
          query = query.gte('created_at', start);
          break;
        case 'newThisWeek':
          query = query.gte('created_at', start);
          break;
        case 'retention':
          // This would need more complex logic to determine retention
          // For now, return clients who joined more than 30 days ago
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
          query = query.lte('created_at', thirtyDaysAgo);
          break;
        case 'engagement':
          // This would need to join with bookings/classes table
          // For now, return recent clients
          query = query.gte('created_at', start);
          break;
        case 'lifetimeValue':
          // This would need to join with payments table
          // For now, return all clients
          break;
        case 'reassignments':
          // This would need to query reassignment data
          // For now, return all clients
          break;
        case 'subscriptionStatus':
          if (criteria.value) {
            query = query.eq('user_subscriptions.status', criteria.value);
          }
          break;
        case 'clientSegment':
          // This would need more complex logic
          // For now, we'll return all clients and let the UI filter
          break;
        case 'reassignmentReason':
          // This would need to query a separate reassignment table
          // For now, we'll return all clients
          break;
        default:
          break;
      }

      const { data: clients, error } = await query;

      if (error) {
        console.error('Error fetching clients by criteria:', error);
        return [];
      }

      return clients || [];
    } catch (error) {
      console.error('Error in getClientsByCriteria:', error);
      return [];
    }
  }

  getClientDetails = async (userId: number) => {
    try {
      const { data: client, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching client details:', error);
        return null;
      }

      return client;
    } catch (error) {
      console.error('Error in getClientDetails:', error);
      return null;
    }
  }

  getClientsForAnalyticsCard = async (cardType: string, filters?: any) => {
    try {
      const { start, end } = this.getDateRange('month');
      
      switch (cardType) {
        case 'newClientsThisMonth':
          return await this.getNewClientsInPeriod(start);
        case 'newClientsThisWeek':
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - 7);
          return await this.getNewClientsInPeriod(weekStart.toISOString());
        case 'activeSubscriptions':
          return await this.getClientsBySubscriptionStatus('active');
        case 'expiredSubscriptions':
          return await this.getClientsBySubscriptionStatus('expired');
        case 'cancelledSubscriptions':
          return await this.getClientsBySubscriptionStatus('cancelled');
        case 'highEngagement':
          return await this.getHighEngagementClients();
        case 'reassignments':
          return await this.getClientsWithReassignments();
        case 'multipleReassignments':
          return await this.getClientsWithReassignments();
        case 'retention':
          return await this.getRetentionClients();
        case 'lifetimeValue':
          return await this.getHighLifetimeValueClients();
        case 'referralSource':
          return await this.getClientsByReferralSource(filters?.referralSource || '');
        default:
          console.warn(`Unknown card type: ${cardType}`);
          return [];
      }
    } catch (error) {
      console.error('Error in getClientsForAnalyticsCard:', error);
      return [];
    }
  }

  private async getNewClientsInPeriod(startDate: string) {
    console.log(`🔍 Getting new clients since: ${startDate}`);
    
    const { data: clients, error } = await supabase
      .from('users')
      .select(`
        id, name, email, phone, created_at, referral_source,
        user_subscriptions (
          status, plan_id,
          subscription_plans:plan_id (name, monthly_price)
        )
      `)
      .eq('role', 'client')
      .gte('created_at', startDate)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching new clients:', error);
      return [];
    }

    console.log(`✅ Found ${clients?.length || 0} new clients since ${startDate}`);
    return clients || [];
  }

  async getClientsBySubscriptionStatus(status: 'active' | 'expired' | 'cancelled') {
    console.log(`🔍 Getting clients with ${status} subscriptions...`);
    
    const { data: clients, error } = await supabase
      .from('users')
      .select(`
        id, name, email, phone, created_at, referral_source,
        user_subscriptions!inner (
          status, start_date, end_date, plan_id,
          subscription_plans:plan_id (name, monthly_price)
        )
      `)
      .eq('role', 'client')
      .eq('user_subscriptions.status', status)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`Error fetching clients with ${status} subscriptions:`, error);
      return [];
    }

    console.log(`✅ Found ${clients?.length || 0} clients with ${status} subscriptions`);
    return clients || [];
  }

  private async getHighEngagementClients() {
    // Get clients with more than 10 bookings
    const { data: clientBookings, error } = await supabase
      .from('bookings')
      .select(`
        user_id,
        users!inner (
          id, name, email, phone, created_at, referral_source,
          user_subscriptions (
            status, plan_id,
            subscription_plans:plan_id (name, monthly_price)
          )
        )
      `)
      .eq('users.role', 'client')
      .eq('status', 'confirmed');

    if (error) {
      console.error('Error fetching high engagement clients:', error);
      return [];
    }

    // Count bookings per client
    const clientBookingCounts: { [key: string]: { count: number; client: any } } = {};
    
    clientBookings?.forEach(booking => {
      const userId = booking.user_id;
      if (!clientBookingCounts[userId]) {
        clientBookingCounts[userId] = { count: 0, client: booking.users };
      }
      clientBookingCounts[userId].count++;
    });

    // Return clients with more than 10 bookings
    return Object.values(clientBookingCounts)
      .filter(item => item.count >= 10)
      .map(item => item.client)
      .sort((a, b) => b.count - a.count);
  }

  private async getClientsWithReassignments() {
    // For now, return placeholder since reassignment table doesn't exist
    // In a real implementation, this would query an instructor_client_assignments table
    const { data: clients, error } = await supabase
      .from('users')
      .select(`
        id, name, email, phone, created_at, referral_source,
        user_subscriptions (
          status, plan_id,
          subscription_plans:plan_id (name, monthly_price)
        )
      `)
      .eq('role', 'client')
      .limit(10);

    return clients || [];
  }

  private async getRetentionClients() {
    // Get clients who have been active for more than 30 days and have recent bookings
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: clients, error } = await supabase
      .from('users')
      .select(`
        id, name, email, phone, created_at, referral_source,
        user_subscriptions (
          status, plan_id,
          subscription_plans:plan_id (name, monthly_price)
        ),
        bookings!inner (
          id, created_at
        )
      `)
      .eq('role', 'client')
      .lte('created_at', thirtyDaysAgo)
      .gte('bookings.created_at', thirtyDaysAgo);

    return clients || [];
  }

  private async getHighLifetimeValueClients() {
    // Get clients with multiple subscriptions or high-value subscriptions
    const { data: clients, error } = await supabase
      .from('users')
      .select(`
        id, name, email, phone, created_at, referral_source,
        user_subscriptions (
          status, plan_id,
          subscription_plans:plan_id (name, monthly_price)
        )
      `)
      .eq('role', 'client');

    if (error) {
      console.error('Error fetching high lifetime value clients:', error);
      return [];
    }

    // Calculate lifetime value and sort
    return (clients || [])
      .map(client => {
        const lifetimeValue = client.user_subscriptions?.reduce((sum: number, sub: any) => 
          sum + (sub.subscription_plans?.monthly_price || 0), 0) || 0;
        return { ...client, lifetimeValue };
      })
      .filter(client => client.lifetimeValue > 500) // Clients with high value
      .sort((a, b) => b.lifetimeValue - a.lifetimeValue);
  }

  private async getClientsByReferralSource(referralSource: string) {
    console.log(`🔍 Getting clients for referral source: "${referralSource}"`);
    
    try {
      let query = supabase
        .from('users')
        .select(`
          id, name, email, phone, created_at, referral_source,
          user_subscriptions (
            status, plan_id, created_at,
            subscription_plans:plan_id (name, monthly_price)
          )
        `)
        .eq('role', 'client')
        .order('created_at', { ascending: false });

      // Convert display name back to database value
      const databaseValue = this.getReferralSourceDatabaseValue(referralSource);
      console.log(`🔄 Converting "${referralSource}" to database value: "${databaseValue}"`);

      // Filter by referral source
      if (referralSource === 'Not Specified') {
        query = query.is('referral_source', null);
      } else {
        query = query.eq('referral_source', databaseValue);
      }

      const { data: clients, error } = await query;

      if (error) {
        console.error(`Error fetching clients for referral source "${referralSource}":`, error);
        return [];
      }

      console.log(`✅ Found ${clients?.length || 0} clients for referral source "${referralSource}"`);

      // Format the data for display
      return (clients || []).map(client => {
        const subscriptions = Array.isArray(client.user_subscriptions) ? client.user_subscriptions : [client.user_subscriptions].filter(Boolean);
        const activeSubscription = subscriptions.find(sub => sub?.status === 'active');
        const lifetimeValue = subscriptions.reduce((total: number, sub: any) => {
          return total + (sub?.subscription_plans?.monthly_price || 0);
        }, 0);
        
        return {
          ...client,
          subscription_status: activeSubscription?.status || 'none',
          plan_name: (activeSubscription?.subscription_plans as any)?.name || 'No active plan',
          lifetimeValue,
          join_date: client.created_at ? new Date(client.created_at).toLocaleDateString() : 'N/A'
        };
      });

    } catch (error) {
      console.error(`Error in getClientsByReferralSource for "${referralSource}":`, error);
      return [];
    }
  }

  async getClientsWithPayments() {
    console.log('💰 Getting clients with payments...');
    try {
      const { data: clients, error } = await supabase
        .from('users')
        .select(`
          id, name, email, phone, created_at, referral_source,
          payments!inner (
            id, amount, created_at, status
          ),
          user_subscriptions (
            status, plan_id,
            subscription_plans:plan_id (name, monthly_price)
          )
        `)
        .eq('role', 'client')
        .eq('payments.status', 'completed')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching clients with payments:', error);
        return [];
      }

      console.log(`✅ Found ${clients?.length || 0} clients with payments`);
      return this.formatClientsForModal(clients || []);
    } catch (error) {
      console.error('Error in getClientsWithPayments:', error);
      return [];
    }
  }

  async getClientsWithRecentPayments() {
    console.log('💰 Getting clients with recent payments...');
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const startDate = thirtyDaysAgo.toISOString();

      const { data: clients, error } = await supabase
        .from('users')
        .select(`
          id, name, email, phone, created_at, referral_source,
          payments!inner (
            id, amount, created_at, status
          ),
          user_subscriptions (
            status, plan_id,
            subscription_plans:plan_id (name, monthly_price)
          )
        `)
        .eq('role', 'client')
        .eq('payments.status', 'completed')
        .gte('payments.created_at', startDate)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching clients with recent payments:', error);
        return [];
      }

      console.log(`✅ Found ${clients?.length || 0} clients with recent payments`);
      return this.formatClientsForModal(clients || []);
    } catch (error) {
      console.error('Error in getClientsWithRecentPayments:', error);
      return [];
    }
  }

  async getClientsWithOneTimePayments() {
    console.log('💰 Getting clients with one-time payments...');
    try {
      // This is a simplified implementation - you might want to add logic to identify one-time vs subscription payments
      const { data: clients, error } = await supabase
        .from('users')
        .select(`
          id, name, email, phone, created_at, referral_source,
          payments!inner (
            id, amount, created_at, status
          ),
          user_subscriptions (
            status, plan_id,
            subscription_plans:plan_id (name, monthly_price)
          )
        `)
        .eq('role', 'client')
        .eq('payments.status', 'completed')
        .is('user_subscriptions.id', null) // Clients without active subscriptions
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching clients with one-time payments:', error);
        return [];
      }

      console.log(`✅ Found ${clients?.length || 0} clients with one-time payments`);
      return this.formatClientsForModal(clients || []);
    } catch (error) {
      console.error('Error in getClientsWithOneTimePayments:', error);
      return [];
    }
  }

  async getClientsByPlan(planName: string, statusFilter?: 'active' | 'cancelled' | 'expired' | 'expiring' | 'all') {
    const filter = statusFilter || 'all';
    console.log(`📋 [getClientsByPlan] Getting clients with plan: "${planName}", status: "${filter}"`);

    // Calculate date range for expiring subscriptions (next 10 days)
    const today = new Date().toISOString().split('T')[0];
    const next10Days = new Date();
    next10Days.setDate(next10Days.getDate() + 10);
    const next10DaysStr = next10Days.toISOString().split('T')[0];

    try {
      // Get all users with subscriptions first, then filter
      const { data: allClients, error } = await supabase
        .from('users')
        .select(`
          id, name, email, phone, created_at, referral_source,
          user_subscriptions (
            status, start_date, end_date, plan_id,
            subscription_plans:plan_id (name, monthly_price)
          )
        `)
        .eq('role', 'client')
        .not('user_subscriptions', 'is', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error(`❌ Error fetching all clients:`, error);
        return [];
      }

      console.log(`📊 [getClientsByPlan] Total clients with subscriptions: ${allClients?.length || 0}`);

      // Filter clients that have the specific plan and status
      const matchingClients = allClients?.filter(client => {
        const subscriptions = Array.isArray(client.user_subscriptions) ? client.user_subscriptions : [client.user_subscriptions].filter(Boolean);

        const hasMatchingPlan = subscriptions.some(sub => {
          const planData = Array.isArray(sub?.subscription_plans) ? sub.subscription_plans[0] : sub?.subscription_plans;
          const actualPlanName = planData?.name;
          const subscriptionStatus = sub?.status;
          const endDate = sub?.end_date;

          const planMatch = actualPlanName === planName;

          let statusMatch = false;
          if (filter === 'all') {
            statusMatch = true;
          } else if (filter === 'expiring') {
            // Expiring = active subscriptions ending within 10 days
            statusMatch = subscriptionStatus === 'active' && endDate && endDate <= next10DaysStr && endDate >= today;
            console.log(`🔍 [getClientsByPlan] Client ${client.name}: Plan="${actualPlanName}" (${planMatch}), Status="${subscriptionStatus}", EndDate="${endDate}", Expiring=${statusMatch} (within 10 days), Expected="${planName}"/${filter}`);
          } else {
            statusMatch = subscriptionStatus === filter;
            console.log(`🔍 [getClientsByPlan] Client ${client.name}: Plan="${actualPlanName}" (${planMatch}), Status="${subscriptionStatus}" (${statusMatch}), Expected="${planName}"/${filter}`);
          }

          return planMatch && statusMatch;
        });

        return hasMatchingPlan;
      }) || [];
      
      console.log(`✅ [getClientsByPlan] Found ${matchingClients.length} clients matching plan "${planName}" with status "${filter}"`);
      
      if (matchingClients.length > 0) {
        console.log(`📋 [getClientsByPlan] Sample client for "${planName}" (${filter}):`, {
          name: matchingClients[0].name,
          email: matchingClients[0].email,
          plans: matchingClients[0].user_subscriptions?.map(s => {
            const planData = Array.isArray(s?.subscription_plans) ? s.subscription_plans[0] : s?.subscription_plans;
            return `${planData?.name} (${s.status})`;
          })
        });
      }
      
      return this.formatClientsForModal(matchingClients);
    } catch (error) {
      console.error(`❌ Exception in getClientsByPlan for "${planName}":`, error);
      return [];
    }
  }

  private formatClientsForModal(clients: any[]) {
    return clients.map(client => {
      const subscriptions = Array.isArray(client.user_subscriptions) ? client.user_subscriptions : [client.user_subscriptions].filter(Boolean);
      const payments = Array.isArray(client.payments) ? client.payments : [client.payments].filter(Boolean);
      const activeSubscription = subscriptions.find(sub => sub?.status === 'active');
      const lifetimeValue = payments.reduce((total: number, payment: any) => {
        return total + (payment?.amount || 0);
      }, 0);
      
      return {
        ...client,
        subscription_status: activeSubscription?.status || 'none',
        plan_name: (activeSubscription?.subscription_plans as any)?.name || 'No active plan',
        lifetimeValue,
        join_date: client.created_at ? new Date(client.created_at).toLocaleDateString() : 'N/A'
      };
    });
  }

  // ===== ADVANCED REVENUE ANALYTICS METHODS =====

  private calculateClientLifetimeValue(payments: any[], subscriptions: any[]): number {
    const clientPayments: { [key: string]: number } = {};

    // Calculate total payments per client
    payments.forEach(payment => {
      const clientId = payment.user_id;
      if (!clientPayments[clientId]) {
        clientPayments[clientId] = 0;
      }
      clientPayments[clientId] += payment.amount || 0;
    });

    // Calculate average lifetime value
    const clientIds = Object.keys(clientPayments);
    if (clientIds.length === 0) return 0;

    const totalLifetimeValue = clientIds.reduce((sum, clientId) => sum + clientPayments[clientId], 0);
    return Math.round(totalLifetimeValue / clientIds.length);
  }

  private calculateAdvancedChurnRate(subscriptions: any[]): number {
    if (!subscriptions || subscriptions.length === 0) return 0;

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const expiredSubscriptions = subscriptions.filter(sub =>
      sub.status === 'expired' &&
      new Date(sub.updated_at || sub.created_at) >= thirtyDaysAgo
    );

    const totalSubscriptions = subscriptions.length;
    const churnedSubscriptions = expiredSubscriptions.length;

    return totalSubscriptions > 0 ? Math.round((churnedSubscriptions / totalSubscriptions) * 100) : 0;
  }

  private async calculateRevenueByInstructor(dateRange?: DateRange): Promise<Array<{
    instructorName: string;
    revenue: number;
    classCount: number;
    avgRevenuePerClass: number;
  }>> {
    try {
      console.log(`👨‍🏫 Calculating revenue by instructor with date range: ${dateRange ? `${dateRange.start} to ${dateRange.end}` : 'No filter'}`);
      if (dateRange) {
        // Parse date strings and create UTC dates to avoid timezone issues
        const [startYear, startMonth, startDay] = dateRange.start.split('-').map(Number);
        const [endYear, endMonth, endDay] = dateRange.end.split('-').map(Number);

        // Create dates in UTC to avoid timezone conversion issues
        const startDate = new Date(Date.UTC(startYear, startMonth - 1, startDay, 0, 0, 0, 0));
        const endDate = new Date(Date.UTC(endYear, endMonth - 1, endDay, 23, 59, 59, 999));

        console.log(`👨‍🏫 Formatted dates: ${startDate.toISOString()} to ${endDate.toISOString()}`);
        console.log(`👨‍🏫 Original input: ${dateRange.start} to ${dateRange.end}`);
      }

      // Step 1: Get all instructors
      const { data: instructors } = await supabase
        .from('users')
        .select('id, name')
        .eq('role', 'instructor');

      if (!instructors || instructors.length === 0) {
        console.log('👨‍🏫 No instructors found');
        return [];
      }

      const instructorMap = new Map();
      instructors.forEach(instructor => {
        instructorMap.set(instructor.id, instructor.name);
      });

      // Step 2: Get classes with instructor data
      let classesQuery = supabase
        .from('classes')
        .select('id, instructor_id, created_at')
        .not('instructor_id', 'is', null);

      if (dateRange) {
        // Parse date strings and create UTC dates to avoid timezone issues
        const [startYear, startMonth, startDay] = dateRange.start.split('-').map(Number);
        const [endYear, endMonth, endDay] = dateRange.end.split('-').map(Number);

        // Create dates in UTC to avoid timezone conversion issues
        const startDate = new Date(Date.UTC(startYear, startMonth - 1, startDay, 0, 0, 0, 0));
        const endDate = new Date(Date.UTC(endYear, endMonth - 1, endDay, 23, 59, 59, 999));

        classesQuery = classesQuery
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString());
      }

      const { data: classesData } = await classesQuery;
      console.log(`👨‍🏫 Found ${classesData?.length || 0} classes with instructors`);

      // Step 3: Get payments data with date filtering
      let paymentsQuery = supabase
        .from('payments')
        .select('amount, created_at, status, booking_id')
        .eq('status', 'completed');

      if (dateRange) {
        // Parse date strings and create UTC dates to avoid timezone issues
        const [startYear, startMonth, startDay] = dateRange.start.split('-').map(Number);
        const [endYear, endMonth, endDay] = dateRange.end.split('-').map(Number);

        // Create dates in UTC to avoid timezone conversion issues
        const startDate = new Date(Date.UTC(startYear, startMonth - 1, startDay, 0, 0, 0, 0));
        const endDate = new Date(Date.UTC(endYear, endMonth - 1, endDay, 23, 59, 59, 999));

        paymentsQuery = paymentsQuery
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString());
      }

      const { data: paymentsData } = await paymentsQuery;
      console.log(`💰 Found ${paymentsData?.length || 0} payments for analysis`);
      if (paymentsData && paymentsData.length > 0) {
        console.log(`💰 Sample payment dates:`, paymentsData.slice(0, 3).map(p => p.created_at));
      }

      // Step 4: Get bookings to link payments to classes
      const bookingIds = paymentsData?.map(p => p.booking_id).filter(Boolean) || [];
      console.log(`🎫 Looking for ${bookingIds.length} booking IDs:`, bookingIds.slice(0, 5));

      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('id, class_id')
        .in('id', bookingIds);

      console.log(`🎫 Found ${bookingsData?.length || 0} bookings`);

      // Create booking to class mapping
      const bookingToClassMap = new Map();
      bookingsData?.forEach(booking => {
        bookingToClassMap.set(booking.id, booking.class_id);
      });

      // Step 5: Calculate stats
      const instructorStats: { [key: string]: { revenue: number; classCount: number } } = {};

      // Initialize all instructors
      instructors.forEach(instructor => {
        instructorStats[instructor.name] = { revenue: 0, classCount: 0 };
      });

      // Count classes per instructor
      classesData?.forEach(cls => {
        const instructorName = instructorMap.get(cls.instructor_id) || 'Unknown Instructor';
        if (instructorStats[instructorName]) {
          instructorStats[instructorName].classCount += 1;
        }
      });

      // Calculate revenue per instructor
      paymentsData?.forEach(payment => {
        const classId = bookingToClassMap.get(payment.booking_id);
        if (classId) {
          const classData = classesData?.find(cls => cls.id === classId);
          if (classData) {
            const instructorName = instructorMap.get(classData.instructor_id) || 'Unknown Instructor';
            if (instructorStats[instructorName]) {
              instructorStats[instructorName].revenue += payment.amount || 0;
            }
          }
        }
      });

      const result = Object.entries(instructorStats)
        .map(([instructorName, data]) => ({
          instructorName,
          revenue: data.revenue,
          classCount: data.classCount,
          avgRevenuePerClass: data.classCount > 0 ? Math.round(data.revenue / data.classCount) : 0
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .filter(item => item.classCount > 0 || item.revenue > 0);

      console.log(`👨‍🏫 Revenue by instructor result: ${result.length} instructors with revenue data`);
      return result;

    } catch (error) {
      console.error('Error calculating revenue by instructor:', error);
      return [];
    }
  }

  private async calculateRevenueByClassType(dateRange?: DateRange): Promise<Array<{
    classType: string;
    revenue: number;
    bookingCount: number;
    avgRevenuePerBooking: number;
  }>> {
    try {
      console.log(`🎯 Calculating revenue by class type with date range: ${dateRange ? `${dateRange.start} to ${dateRange.end}` : 'No filter'}`);
      if (dateRange) {
        // Parse date strings and create UTC dates to avoid timezone issues
        const [startYear, startMonth, startDay] = dateRange.start.split('-').map(Number);
        const [endYear, endMonth, endDay] = dateRange.end.split('-').map(Number);

        // Create dates in UTC to avoid timezone conversion issues
        const startDate = new Date(Date.UTC(startYear, startMonth - 1, startDay, 0, 0, 0, 0));
        const endDate = new Date(Date.UTC(endYear, endMonth - 1, endDay, 23, 59, 59, 999));
        console.log(`🎯 Formatted dates: ${startDate.toISOString()} to ${endDate.toISOString()}`);
        console.log(`🎯 Original input: ${dateRange.start} to ${dateRange.end}`);
      }

      // Step 1: Get all classes with their types
      let classesQuery = supabase
        .from('classes')
        .select('id, class_type, created_at')
        .not('class_type', 'is', null);

      if (dateRange) {
        // Parse date strings and create UTC dates to avoid timezone issues
        const [startYear, startMonth, startDay] = dateRange.start.split('-').map(Number);
        const [endYear, endMonth, endDay] = dateRange.end.split('-').map(Number);

        // Create dates in UTC to avoid timezone conversion issues
        const startDate = new Date(Date.UTC(startYear, startMonth - 1, startDay, 0, 0, 0, 0));
        const endDate = new Date(Date.UTC(endYear, endMonth - 1, endDay, 23, 59, 59, 999));

        classesQuery = classesQuery
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString());
      }

      const { data: classesData } = await classesQuery;
      console.log(`🎯 Found ${classesData?.length || 0} classes for analysis`);

      if (!classesData || classesData.length === 0) {
        console.log('🎯 No classes found for class type analysis');
        return [];
      }

      // Step 2: Get payments data with date filtering
      let paymentsQuery = supabase
        .from('payments')
        .select('amount, created_at, status, booking_id')
        .eq('status', 'completed');

      if (dateRange) {
        // Parse date strings and create UTC dates to avoid timezone issues
        const [startYear, startMonth, startDay] = dateRange.start.split('-').map(Number);
        const [endYear, endMonth, endDay] = dateRange.end.split('-').map(Number);

        // Create dates in UTC to avoid timezone conversion issues
        const startDate = new Date(Date.UTC(startYear, startMonth - 1, startDay, 0, 0, 0, 0));
        const endDate = new Date(Date.UTC(endYear, endMonth - 1, endDay, 23, 59, 59, 999));

        paymentsQuery = paymentsQuery
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString());
      }

      const { data: paymentsData } = await paymentsQuery;
      console.log(`💰 Found ${paymentsData?.length || 0} payments for class type analysis`);
      if (paymentsData && paymentsData.length > 0) {
        console.log(`💰 Sample payment dates:`, paymentsData.slice(0, 3).map(p => p.created_at));
      }

      // Step 3: Get bookings to link payments to classes
      const bookingIds = paymentsData?.map(p => p.booking_id).filter(Boolean) || [];
      console.log(`🎫 Looking for ${bookingIds.length} booking IDs:`, bookingIds.slice(0, 5));

      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('id, class_id, created_at')
        .in('id', bookingIds);

      console.log(`🎫 Found ${bookingsData?.length || 0} bookings for class type analysis`);

      // Apply date range to bookings if needed
      let filteredBookingsData = bookingsData;
      if (dateRange) {
        filteredBookingsData = bookingsData?.filter(booking =>
          booking.created_at >= dateRange.start &&
          booking.created_at <= `${dateRange.end}T23:59:59.999Z`
        );
      }

      // Create booking to class mapping
      const bookingToClassMap = new Map();
      filteredBookingsData?.forEach(booking => {
        bookingToClassMap.set(booking.id, booking.class_id);
      });

      // Step 4: Calculate stats
      const classTypeStats: { [key: string]: { revenue: number; bookingCount: number } } = {};

      // Count bookings per class type
      filteredBookingsData?.forEach(booking => {
        const classData = classesData?.find(cls => cls.id === booking.class_id);
        if (classData) {
          const classType = classData.class_type || 'General';
          if (!classTypeStats[classType]) {
            classTypeStats[classType] = { revenue: 0, bookingCount: 0 };
          }
          classTypeStats[classType].bookingCount += 1;
        }
      });

      // Calculate revenue per class type
      paymentsData?.forEach(payment => {
        const classId = bookingToClassMap.get(payment.booking_id);
        if (classId) {
          const classData = classesData?.find(cls => cls.id === classId);
          if (classData) {
            const classType = classData.class_type || 'General';
            if (!classTypeStats[classType]) {
              classTypeStats[classType] = { revenue: 0, bookingCount: 0 };
            }
            classTypeStats[classType].revenue += payment.amount || 0;
          }
        }
      });

      const result = Object.entries(classTypeStats)
        .map(([classType, data]) => ({
          classType,
          revenue: data.revenue,
          bookingCount: data.bookingCount,
          avgRevenuePerBooking: data.bookingCount > 0 ? Math.round(data.revenue / data.bookingCount) : 0
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .filter(item => item.bookingCount > 0 || item.revenue > 0);

      console.log(`🎯 Revenue by class type result: ${result.length} class types with revenue data`);
      return result;

    } catch (error) {
      console.error('Error calculating revenue by class type:', error);
      return [];
    }
  }

  private calculateSeasonalityAnalysis(monthlyBreakdown: any[]): Array<{
    month: string;
    revenue: number;
    growth: number;
    seasonalityIndex: number;
  }> {
    if (monthlyBreakdown.length < 2) return [];

    const avgRevenue = monthlyBreakdown.reduce((sum, month) => sum + month.revenue, 0) / monthlyBreakdown.length;

    return monthlyBreakdown.map((month, index) => {
      const previousMonth = index > 0 ? monthlyBreakdown[index - 1].revenue : month.revenue;
      const growth = previousMonth > 0 ? Math.round(((month.revenue - previousMonth) / previousMonth) * 100) : 0;
      const seasonalityIndex = avgRevenue > 0 ? Math.round((month.revenue / avgRevenue) * 100) : 0;

      return {
        month: month.month,
        revenue: month.revenue,
        growth,
        seasonalityIndex
      };
    });
  }

  private calculateProcessingFees(payments: any[]): number {
    // Estimate processing fees based on payment method
    // This is a simplified calculation - in reality, you'd use actual fee structures
    let totalFees = 0;

    payments.forEach(payment => {
      const amount = payment.amount || 0;
      const method = payment.payment_method || 'card';

      switch (method) {
        case 'card':
          // Assume 2.9% + $0.30 per transaction for card payments
          totalFees += (amount * 0.029) + 0.30;
          break;
        case 'cash':
          // No processing fees for cash
          break;
        default:
          // Assume 1% fee for other methods
          totalFees += amount * 0.01;
      }
    });

    return Math.round(totalFees);
  }
}

export const dashboardService = new DashboardService();