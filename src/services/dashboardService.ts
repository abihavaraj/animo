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
        recentActivityStats
      ] = await Promise.all([
        this.getOverviewStats().catch(err => {
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
            equipmentUtilization: 0
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
            revenueForecast: 0
          };
        }),
        this.getClassStats(dateRange).catch(err => {
          console.error('❌ [DashboardService] Class stats error:', err);
          return { upcomingClasses: 0, classesThisWeek: 0, averageAttendance: 0, mostPopularClass: 'No data', equipmentUsage: { mat: 0, reformer: 0, both: 0 }, instructorStats: [], attendanceByDay: [], classTypeDistribution: [] };
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
            }
          };
        }),
        this.getNotificationStats().catch(err => {
          console.error('❌ [DashboardService] Notification stats error:', err);
          return { lowAttendanceClasses: 0, expiringSubscriptions: 0, overduePayments: 0, systemAlerts: 0 };
        }),
        this.getReferralSourcesStats().catch(err => {
          console.error('❌ [DashboardService] Referral sources error:', err);
          return { sources: [], totalResponses: 0 };
        }),
        this.getRecentActivityStats().catch(err => {
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
  private async getOverviewStats() {
    const today = new Date().toISOString().split('T')[0];
    const startOfWeek = this.getStartOfWeek();
    const startOfMonth = this.getStartOfMonth();

    // Total and active clients (using created_at instead of last_login which doesn't exist)
    const { data: clientsData } = await supabase
      .from('users')
      .select('id, role, created_at, status')
      .eq('role', 'client');

    const totalClients = clientsData?.length || 0;
    // Consider clients active if they have active status and joined within 90 days
    const activeClients = clientsData?.filter(client => {
      const joinDate = new Date(client.created_at);
      const daysSinceJoin = Math.floor((Date.now() - joinDate.getTime()) / (1000 * 60 * 60 * 24));
      return client.status === 'active' && daysSinceJoin <= 90;
    }).length || 0;

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
      .select('id, date, capacity, bookings(id)')
      .eq('status', 'active');

    const totalClasses = classesData?.length || 0;
    const classesThisWeek = classesData?.filter(cls => cls.date >= startOfWeek).length || 0;
    const classesThisMonth = classesData?.filter(cls => cls.date >= startOfMonth).length || 0;

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
    // Get revenue data independently for overview stats
    const { data: paymentsData } = await supabase
      .from('payments')
      .select('amount')
      .eq('status', 'completed');
    
    const totalRevenue = paymentsData?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
    const averageClientLifetime = totalClients > 0 ? Math.round(totalRevenue / totalClients) : 0;
    
    // Get peak hours and popular days from class data
    const { data: classData } = await supabase
      .from('classes')
      .select('time, date, bookings(id)')
      .eq('status', 'active');
    
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

    // Get all payments (using correct field names and structure)
    const { data: paymentsData } = await supabase
      .from('payments')
      .select('id, amount, created_at, status, payment_method, user_id, subscription_id')
      .eq('status', 'completed');

    const totalRevenue = paymentsData?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
    
    const revenueThisMonth = paymentsData?.filter(payment => 
      payment.created_at >= startOfMonth
    ).reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;

    const revenueThisWeek = paymentsData?.filter(payment => 
      payment.created_at >= startOfWeek
    ).reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;

    const revenueToday = paymentsData?.filter(payment => 
      payment.created_at.split('T')[0] === today
    ).reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;

    // Get subscription statistics (using correct join syntax)
    const { data: subscriptionsData } = await supabase
      .from('user_subscriptions')
      .select(`
        id, status, created_at,
        subscription_plans:plan_id (
          name,
          monthly_price
        )
      `)
      .eq('status', 'active');

    const activeSubscriptions = subscriptionsData?.length || 0;
    const subscriptionRevenue = subscriptionsData?.reduce((sum, sub) => 
      sum + (sub.subscription_plans?.monthly_price || 0), 0) || 0;

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
      topPlans
    };
  }

  /**
   * Get class statistics
   */
  private async getClassStats(dateRange?: DateRange) {
    const today = new Date().toISOString().split('T')[0];
    const startOfWeek = this.getStartOfWeek();

    // Get classes with bookings (using correct field names)
    const { data: classesData } = await supabase
      .from('classes')
      .select(`
        id, name, date, time, capacity, equipment_type,
        users:instructor_id(name),
        bookings(id, status)
      `)
      .eq('status', 'active');

    const upcomingClasses = classesData?.filter(cls => cls.date >= today).length || 0;
    const classesThisWeek = classesData?.filter(cls => cls.date >= startOfWeek).length || 0;

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
      equipmentUsage,
      instructorStats,
      attendanceByDay,
      classTypeDistribution
    };
  }

  /**
   * Get client statistics
   */
  private async getClientStats(dateRange?: DateRange) {
    const startOfWeek = this.getStartOfWeek();
    const startOfMonth = this.getStartOfMonth();

    // Get clients with subscription and booking data
    const { data: clientsData } = await supabase
      .from('users')
      .select(`
        id, name, created_at,
        user_subscriptions(status, created_at),
        bookings(id, status)
      `)
      .eq('role', 'client');

    const newClientsThisMonth = clientsData?.filter(client => 
      client.created_at >= startOfMonth
    ).length || 0;

    const newClientsThisWeek = clientsData?.filter(client => 
      client.created_at >= startOfWeek
    ).length || 0;

    // Calculate retention rate (clients with bookings in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    const { data: recentBookings } = await supabase
      .from('bookings')
      .select('user_id')
      .gte('created_at', thirtyDaysAgoStr)
      .eq('status', 'confirmed');

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
   * Get notification statistics
   */
  private async getNotificationStats() {
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
  private async getReferralSourcesStats() {
    try {
      // First, try to get all clients to check if referral_source column exists
      const { data: users, error } = await supabase
        .from('users')
        .select('id, role')
        .eq('role', 'client');

      if (error) {
        console.error('Error fetching users for referral sources:', error);
        return { sources: [], totalResponses: 0 };
      }

      // Try to query referral_source column specifically
      const { data: referralData, error: referralError } = await supabase
        .from('users')
        .select('referral_source')
        .eq('role', 'client')
        .not('referral_source', 'is', null);

      // If referral_source column doesn't exist, return empty data
      if (referralError && referralError.code === '42703') {
        console.log('⚠️ referral_source column does not exist in users table');
        return { sources: [], totalResponses: 0 };
      }

      if (referralError) {
        console.error('Error fetching referral sources:', referralError);
        return { sources: [], totalResponses: 0 };
      }

      const sourceCounts: { [key: string]: number } = {};
      const totalResponses = referralData?.length || 0;

      // Count referral sources
      referralData?.forEach(user => {
        const source = user.referral_source;
        if (source && source.trim() !== '') {
          sourceCounts[source] = (sourceCounts[source] || 0) + 1;
        }
      });

      // Convert to array with percentages
      const sources = Object.entries(sourceCounts)
        .map(([source, count]) => ({
          source: this.formatReferralSource(source),
          count,
          percentage: totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0
        }))
        .sort((a, b) => b.count - a.count);

      return { sources, totalResponses };
    } catch (error) {
      console.error('Error fetching referral sources:', error);
      return { sources: [], totalResponses: 0 };
    }
  }

  /**
   * Get recent activity for live feed
   */
  private async getRecentActivityStats() {
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
          user: payment.users?.name || 'Unknown',
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
          description: `Booked ${booking.classes?.name || 'class'} for ${booking.classes?.date || 'upcoming date'}`,
          timestamp: booking.created_at,
          user: booking.users?.name || 'Unknown'
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
          description: `Subscribed to ${subscription.subscription_plans?.name || 'plan'}`,
          timestamp: subscription.created_at,
          user: subscription.users?.name || 'Unknown'
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
      'unknown': 'Not Specified'
    };
    return sourceMap[source] || source;
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
        route: 'ReportsAnalytics'
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
        rating: 4.5 // Placeholder - would need actual rating data
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
      { name: 'Top Client 1', totalClasses: 50, totalSpent: 1200 },
      { name: 'Top Client 2', totalClasses: 45, totalSpent: 1100 },
      { name: 'Top Client 3', totalClasses: 40, totalSpent: 1000 }
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

      switch (cardType) {
        case 'newClientsThisMonth':
          query = query.gte('created_at', start);
          break;
        case 'newClientsThisWeek':
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - 7);
          query = query.gte('created_at', weekStart.toISOString());
          break;
        case 'activeSubscriptions':
          query = query.eq('user_subscriptions.status', 'active');
          break;
        case 'expiredSubscriptions':
          query = query.eq('user_subscriptions.status', 'expired');
          break;
        case 'cancelledSubscriptions':
          query = query.eq('user_subscriptions.status', 'cancelled');
          break;
        case 'highEngagement':
          // This would need to join with bookings/classes table
          // For now, return recent clients
          query = query.gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
          break;
        case 'reassignments':
          // This would need to query reassignment data
          // For now, return all clients
          break;
        default:
          break;
      }

      const { data: clients, error } = await query;

      if (error) {
        console.error('Error fetching clients for analytics card:', error);
        return [];
      }

      return clients || [];
    } catch (error) {
      console.error('Error in getClientsForAnalyticsCard:', error);
      return [];
    }
  }
}

export const dashboardService = new DashboardService();