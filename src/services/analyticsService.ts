import { supabase } from '../config/supabase.config';

export interface AnalyticsDateRange {
  startDate: string;
  endDate: string;
}

export interface RevenueData {
  date: string;
  amount: number;
  subscriptions: number;
  manualCredits: number;
}

export interface ClassAttendanceData {
  className: string;
  date: string;
  enrolled: number;
  capacity: number;
  utilization: number;
  checkedIn: number;
  noShows: number;
}

export interface ClientEngagementData {
  newClients: number;
  activeClients: number;
  churnedClients: number;
  averageClassesPerClient: number;
  clientRetentionRate: number;
}

export interface InstructorPerformance {
  instructorId: string;
  instructorName: string;
  totalClasses: number;
  totalStudents: number;
  averageAttendance: number;
  clientSatisfaction: number;
  cancellationRate: number;
}

export interface EquipmentUtilization {
  equipmentType: string;
  totalBookings: number;
  utilizationRate: number;
  popularTimeSlots: string[];
}

export interface DashboardSummary {
  totalRevenue: number;
  revenueGrowth: number;
  totalClients: number;
  clientGrowth: number;
  totalClasses: number;
  averageAttendance: number;
  topInstructor: string;
  mostPopularClass: string;
}

export interface SubscriptionAnalytics {
  totalActiveSubscriptions: number;
  subscriptionsByPlan: Array<{
    planName: string;
    count: number;
    revenue: number;
  }>;
  averageSubscriptionDuration: number;
  churnRate: number;
  retentionRate: number;
}

class AnalyticsService {
  // Revenue Analytics
  async getRevenueAnalytics(dateRange: AnalyticsDateRange): Promise<RevenueData[]> {
    try {
      console.log('📊 Fetching revenue analytics for range:', dateRange);

      // Get payment data
      const { data: payments, error: paymentError } = await supabase
        .from('payments')
        .select(`
          amount,
          payment_date,
          subscription_id,
          user_subscriptions!inner(
            id,
            plan_id,
            subscription_plans!inner(name)
          )
        `)
        .gte('payment_date', dateRange.startDate)
        .lte('payment_date', dateRange.endDate)
        .order('payment_date');

      if (paymentError) {
        console.error('❌ Payment data error:', paymentError);
        throw paymentError;
      }

      // Get manual credits data
      const { data: credits, error: creditError } = await supabase
        .from('manual_credits')
        .select('amount, created_at')
        .gte('created_at', dateRange.startDate)
        .lte('created_at', dateRange.endDate)
        .order('created_at');

      if (creditError) {
        console.error('❌ Credits data error:', creditError);
        throw creditError;
      }

      // Process revenue data by date
      const revenueMap: { [key: string]: RevenueData } = {};

      // Process payments
      payments?.forEach(payment => {
        const date = payment.payment_date;
        if (!revenueMap[date]) {
          revenueMap[date] = {
            date,
            amount: 0,
            subscriptions: 0,
            manualCredits: 0
          };
        }
        revenueMap[date].amount += Number(payment.amount);
        revenueMap[date].subscriptions += 1;
      });

      // Process manual credits
      credits?.forEach(credit => {
        const date = credit.created_at.split('T')[0];
        if (!revenueMap[date]) {
          revenueMap[date] = {
            date,
            amount: 0,
            subscriptions: 0,
            manualCredits: 0
          };
        }
        revenueMap[date].manualCredits += Number(credit.amount);
        revenueMap[date].amount += Number(credit.amount);
      });

      return Object.values(revenueMap).sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      console.error('❌ Error fetching revenue analytics:', error);
      throw new Error('Failed to fetch revenue analytics');
    }
  }

  // Class Attendance Analytics
  async getClassAttendanceAnalytics(dateRange: AnalyticsDateRange): Promise<ClassAttendanceData[]> {
    try {
      console.log('📊 Fetching class attendance analytics for range:', dateRange);

      const { data: classes, error } = await supabase
        .from('classes')
        .select(`
          id,
          name,
          date,
          capacity,
          enrolled,
          bookings!inner(
            id,
            status,
            checked_in
          )
        `)
        .gte('date', dateRange.startDate)
        .lte('date', dateRange.endDate)
        .order('date');

      if (error) {
        console.error('❌ Class attendance error:', error);
        throw error;
      }

      return classes?.map(classData => {
        const confirmedBookings = classData.bookings.filter(b => b.status === 'confirmed');
        const checkedIn = confirmedBookings.filter(b => b.checked_in).length;
        const noShows = confirmedBookings.length - checkedIn;
        
        return {
          className: classData.name,
          date: classData.date,
          enrolled: classData.enrolled || 0,
          capacity: classData.capacity,
          utilization: Math.round((classData.enrolled / classData.capacity) * 100),
          checkedIn,
          noShows
        };
      }) || [];
    } catch (error) {
      console.error('❌ Error fetching class attendance analytics:', error);
      throw new Error('Failed to fetch class attendance analytics');
    }
  }

  // Client Engagement Analytics
  async getClientEngagementAnalytics(dateRange: AnalyticsDateRange): Promise<ClientEngagementData> {
    try {
      console.log('📊 Fetching client engagement analytics for range:', dateRange);

      // Get new clients in period
      const { data: newClients, error: newClientsError } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'client')
        .gte('join_date', dateRange.startDate)
        .lte('join_date', dateRange.endDate);

      if (newClientsError) throw newClientsError;

      // Get active clients (those with bookings in period)
      const { data: activeBookings, error: activeError } = await supabase
        .from('bookings')
        .select('user_id')
        .gte('booking_date', dateRange.startDate)
        .lte('booking_date', dateRange.endDate);

      if (activeError) throw activeError;

      const uniqueActiveClients = new Set(activeBookings?.map(b => b.user_id)).size;

      // Get client booking frequency
      const { data: clientBookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          user_id,
          booking_date,
          status
        `)
        .eq('status', 'confirmed')
        .gte('booking_date', dateRange.startDate)
        .lte('booking_date', dateRange.endDate);

      if (bookingsError) throw bookingsError;

      // Calculate average classes per client
      const clientBookingCounts: { [key: string]: number } = {};
      clientBookings?.forEach(booking => {
        if (!clientBookingCounts[booking.user_id]) {
          clientBookingCounts[booking.user_id] = 0;
        }
        clientBookingCounts[booking.user_id]++;
      });

      const averageClassesPerClient = uniqueActiveClients > 0 
        ? Object.values(clientBookingCounts).reduce((sum, count) => sum + count, 0) / uniqueActiveClients
        : 0;

      return {
        newClients: newClients?.length || 0,
        activeClients: uniqueActiveClients,
        churnedClients: 0, // This would require more complex calculation
        averageClassesPerClient: Math.round(averageClassesPerClient * 10) / 10,
        clientRetentionRate: 85 // Placeholder - would need historical data
      };
    } catch (error) {
      console.error('❌ Error fetching client engagement analytics:', error);
      throw new Error('Failed to fetch client engagement analytics');
    }
  }

  // Instructor Performance Analytics
  async getInstructorPerformanceAnalytics(dateRange: AnalyticsDateRange): Promise<InstructorPerformance[]> {
    try {
      console.log('📊 Fetching instructor performance analytics for range:', dateRange);

      const { data: instructorData, error } = await supabase
        .from('classes')
        .select(`
          instructor_id,
          users!inner(name),
          enrolled,
          capacity,
          status,
          bookings!inner(
            id,
            status,
            checked_in
          )
        `)
        .gte('date', dateRange.startDate)
        .lte('date', dateRange.endDate)
        .eq('status', 'active');

      if (error) throw error;

      // Group by instructor
      const instructorStats: { [key: string]: any } = {};

      instructorData?.forEach(classData => {
        const instructorId = classData.instructor_id;
        const instructorName = (classData.users as any).name;

        if (!instructorStats[instructorId]) {
          instructorStats[instructorId] = {
            instructorId,
            instructorName,
            totalClasses: 0,
            totalStudents: 0,
            totalCapacity: 0,
            totalCheckedIn: 0,
            cancellations: 0
          };
        }

        const stats = instructorStats[instructorId];
        stats.totalClasses++;
        stats.totalStudents += classData.enrolled || 0;
        stats.totalCapacity += classData.capacity;
        stats.totalCheckedIn += classData.bookings.filter((b: any) => b.checked_in).length;
      });

      return Object.values(instructorStats).map((stats: any) => ({
        instructorId: stats.instructorId,
        instructorName: stats.instructorName,
        totalClasses: stats.totalClasses,
        totalStudents: stats.totalStudents,
        averageAttendance: stats.totalClasses > 0 
          ? Math.round((stats.totalStudents / stats.totalClasses) * 10) / 10 
          : 0,
        clientSatisfaction: 4.2, // Placeholder - would need rating system
        cancellationRate: Math.round((stats.cancellations / stats.totalClasses) * 100) || 0
      }));
    } catch (error) {
      console.error('❌ Error fetching instructor performance analytics:', error);
      throw new Error('Failed to fetch instructor performance analytics');
    }
  }

  // Equipment Utilization Analytics
  async getEquipmentUtilizationAnalytics(dateRange: AnalyticsDateRange): Promise<EquipmentUtilization[]> {
    try {
      console.log('📊 Fetching equipment utilization analytics for range:', dateRange);

      const { data: classes, error } = await supabase
        .from('classes')
        .select(`
          equipment_type,
          time,
          enrolled,
          capacity
        `)
        .gte('date', dateRange.startDate)
        .lte('date', dateRange.endDate)
        .eq('status', 'active');

      if (error) throw error;

      // Group by equipment type
      const equipmentStats: { [key: string]: any } = {};

      classes?.forEach(classData => {
        const equipmentType = classData.equipment_type || 'mat';
        
        if (!equipmentStats[equipmentType]) {
          equipmentStats[equipmentType] = {
            equipmentType,
            totalBookings: 0,
            totalCapacity: 0,
            timeSlots: {}
          };
        }

        const stats = equipmentStats[equipmentType];
        stats.totalBookings += classData.enrolled || 0;
        stats.totalCapacity += classData.capacity;

        // Track time slots
        const timeSlot = classData.time?.substring(0, 2) + ':00'; // Round to hour
        if (!stats.timeSlots[timeSlot]) {
          stats.timeSlots[timeSlot] = 0;
        }
        stats.timeSlots[timeSlot] += classData.enrolled || 0;
      });

      return Object.values(equipmentStats).map((stats: any) => ({
        equipmentType: stats.equipmentType,
        totalBookings: stats.totalBookings,
        utilizationRate: Math.round((stats.totalBookings / stats.totalCapacity) * 100) || 0,
        popularTimeSlots: Object.entries(stats.timeSlots)
          .sort(([,a], [,b]) => (b as number) - (a as number))
          .slice(0, 3)
          .map(([timeSlot]) => timeSlot)
      }));
    } catch (error) {
      console.error('❌ Error fetching equipment utilization analytics:', error);
      throw new Error('Failed to fetch equipment utilization analytics');
    }
  }

  // Dashboard Summary
  async getDashboardSummary(dateRange: AnalyticsDateRange): Promise<DashboardSummary> {
    try {
      console.log('📊 Fetching dashboard summary for range:', dateRange);

      // Get revenue data
      const { data: payments, error: paymentError } = await supabase
        .from('payments')
        .select('amount')
        .gte('payment_date', dateRange.startDate)
        .lte('payment_date', dateRange.endDate);

      if (paymentError) throw paymentError;

      const totalRevenue = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      // Get client count
      const { data: clients, error: clientError } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'client')
        .eq('status', 'active');

      if (clientError) throw clientError;

      // Get class data
      const { data: classes, error: classError } = await supabase
        .from('classes')
        .select(`
          id,
          enrolled,
          capacity,
          instructor_id,
          users!inner(name)
        `)
        .gte('date', dateRange.startDate)
        .lte('date', dateRange.endDate)
        .eq('status', 'active');

      if (classError) throw classError;

      const totalClasses = classes?.length || 0;
      const averageAttendance = totalClasses > 0 
        ? Math.round((classes?.reduce((sum, c) => sum + (c.enrolled || 0), 0) || 0) / totalClasses) 
        : 0;

      // Find top instructor
      const instructorCounts: { [key: string]: { name: string; count: number } } = {};
      classes?.forEach(classData => {
        const instructorId = classData.instructor_id;
        const instructorName = (classData.users as any).name;
        
        if (!instructorCounts[instructorId]) {
          instructorCounts[instructorId] = { name: instructorName, count: 0 };
        }
        instructorCounts[instructorId].count++;
      });

      const topInstructor = Object.values(instructorCounts)
        .sort((a, b) => b.count - a.count)[0]?.name || 'None';

      return {
        totalRevenue,
        revenueGrowth: 12.5, // Placeholder - would need historical comparison
        totalClients: clients?.length || 0,
        clientGrowth: 8.3, // Placeholder
        totalClasses,
        averageAttendance,
        topInstructor,
        mostPopularClass: 'Pilates Fundamentals' // Placeholder
      };
    } catch (error) {
      console.error('❌ Error fetching dashboard summary:', error);
      throw new Error('Failed to fetch dashboard summary');
    }
  }

  // Subscription Analytics
  async getSubscriptionAnalytics(dateRange: AnalyticsDateRange): Promise<SubscriptionAnalytics> {
    try {
      console.log('📊 Fetching subscription analytics for range:', dateRange);

      const { data: subscriptions, error } = await supabase
        .from('user_subscriptions')
        .select(`
          id,
          status,
          start_date,
          end_date,
          subscription_plans!inner(
            name,
            monthly_price
          )
        `)
        .eq('status', 'active');

      if (error) throw error;

      const totalActiveSubscriptions = subscriptions?.length || 0;

      // Group by plan
      const planCounts: { [key: string]: { count: number; revenue: number } } = {};
      subscriptions?.forEach(sub => {
        const planName = (sub.subscription_plans as any).name;
        const price = Number((sub.subscription_plans as any).monthly_price);
        
        if (!planCounts[planName]) {
          planCounts[planName] = { count: 0, revenue: 0 };
        }
        planCounts[planName].count++;
        planCounts[planName].revenue += price;
      });

      const subscriptionsByPlan = Object.entries(planCounts).map(([planName, data]) => ({
        planName,
        count: data.count,
        revenue: data.revenue
      }));

      return {
        totalActiveSubscriptions,
        subscriptionsByPlan,
        averageSubscriptionDuration: 6.2, // Placeholder - months
        churnRate: 5.8, // Placeholder - percentage
        retentionRate: 94.2 // Placeholder - percentage
      };
    } catch (error) {
      console.error('❌ Error fetching subscription analytics:', error);
      throw new Error('Failed to fetch subscription analytics');
    }
  }
}

export const analyticsService = new AnalyticsService();
