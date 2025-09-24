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

      // Get payment data (simplified - no joins needed for basic revenue)
      const { data: payments, error: paymentError } = await supabase
        .from('payments')
        .select('amount, payment_date')
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

      // Fill in missing dates with zero values for better chart visualization
      const result = Object.values(revenueMap).sort((a, b) => a.date.localeCompare(b.date));
      
      // If no data, return empty array
      if (result.length === 0) {
        return [];
      }

      // Fill gaps in date range for better visualization
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      const filledData: RevenueData[] = [];
      
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const existingData = result.find(r => r.date === dateStr);
        
        if (existingData) {
          filledData.push(existingData);
        } else {
          filledData.push({
            date: dateStr,
            amount: 0,
            subscriptions: 0,
            manualCredits: 0
          });
        }
      }

      return filledData;
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
          bookings(
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
        .select('id, join_date')
        .eq('role', 'client')
        .eq('status', 'active')
        .gte('join_date', dateRange.startDate)
        .lte('join_date', dateRange.endDate);

      if (newClientsError) throw newClientsError;

      // Get active clients (those with bookings in period)
      const { data: activeBookings, error: activeError } = await supabase
        .from('bookings')
        .select('user_id, booking_date, status')
        .gte('booking_date', dateRange.startDate)
        .lte('booking_date', dateRange.endDate)
        .eq('status', 'confirmed');

      if (activeError) throw activeError;

      const uniqueActiveClients = new Set(activeBookings?.map(b => b.user_id)).size;

      // Get total clients for retention calculation
      const { data: totalClients, error: totalClientsError } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'client')
        .eq('status', 'active');

      if (totalClientsError) throw totalClientsError;

      // Calculate average classes per client
      const clientBookingCounts: { [key: string]: number } = {};
      activeBookings?.forEach(booking => {
        if (!clientBookingCounts[booking.user_id]) {
          clientBookingCounts[booking.user_id] = 0;
        }
        clientBookingCounts[booking.user_id]++;
      });

      const averageClassesPerClient = uniqueActiveClients > 0 
        ? Object.values(clientBookingCounts).reduce((sum, count) => sum + count, 0) / uniqueActiveClients
        : 0;

      // Calculate retention rate (active clients / total clients)
      const retentionRate = totalClients && totalClients.length > 0 
        ? Math.round((uniqueActiveClients / totalClients.length) * 100)
        : 0;

      // Calculate churned clients (clients who haven't booked in the period but were active before)
      const { data: previousPeriodBookings, error: prevError } = await supabase
        .from('bookings')
        .select('user_id')
        .lt('booking_date', dateRange.startDate)
        .eq('status', 'confirmed');

      if (prevError) throw prevError;

      const previousActiveClients = new Set(previousPeriodBookings?.map(b => b.user_id));
      const currentActiveClients = new Set(activeBookings?.map(b => b.user_id));
      
      // Clients who were active before but not in current period
      const churnedClients = Array.from(previousActiveClients).filter(
        clientId => !currentActiveClients.has(clientId)
      ).length;

      return {
        newClients: newClients?.length || 0,
        activeClients: uniqueActiveClients,
        churnedClients,
        averageClassesPerClient: Math.round(averageClassesPerClient * 10) / 10,
        clientRetentionRate: retentionRate
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
          users(name),
          enrolled,
          capacity,
          status,
          bookings(
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
            cancellations: 0,
            totalBookings: 0
          };
        }

        const stats = instructorStats[instructorId];
        stats.totalClasses++;
        stats.totalStudents += classData.enrolled || 0;
        stats.totalCapacity += classData.capacity;
        stats.totalBookings += classData.bookings?.length || 0;
        stats.totalCheckedIn += classData.bookings?.filter((b: any) => b.checked_in).length || 0;
        
        // Count cancellations (bookings with status 'cancelled')
        const cancellations = classData.bookings?.filter((b: any) => b.status === 'cancelled').length || 0;
        stats.cancellations += cancellations;
      });

      return Object.values(instructorStats).map((stats: any) => {
        const averageAttendance = stats.totalClasses > 0 
          ? Math.round((stats.totalStudents / stats.totalClasses) * 10) / 10 
          : 0;
        
        const cancellationRate = stats.totalBookings > 0 
          ? Math.round((stats.cancellations / stats.totalBookings) * 100) 
          : 0;

        // Calculate utilization rate (checked in / capacity)
        const utilizationRate = stats.totalCapacity > 0 
          ? Math.round((stats.totalCheckedIn / stats.totalCapacity) * 100)
          : 0;

        // Calculate satisfaction based on utilization and cancellation rate
        let satisfaction = 4.0; // Base rating
        if (utilizationRate >= 80) satisfaction += 0.5;
        if (utilizationRate >= 90) satisfaction += 0.3;
        if (cancellationRate <= 5) satisfaction += 0.2;
        if (cancellationRate <= 2) satisfaction += 0.3;
        if (averageAttendance >= 8) satisfaction += 0.2;
        
        satisfaction = Math.min(5.0, Math.max(1.0, satisfaction));

        return {
          instructorId: stats.instructorId,
          instructorName: stats.instructorName,
          totalClasses: stats.totalClasses,
          totalStudents: stats.totalStudents,
          averageAttendance,
          clientSatisfaction: Math.round(satisfaction * 10) / 10,
          cancellationRate
        };
      });
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

      // Get revenue data including manual credits
      const [paymentsResult, creditsResult] = await Promise.all([
        supabase
          .from('payments')
          .select('amount')
          .gte('payment_date', dateRange.startDate)
          .lte('payment_date', dateRange.endDate),
        supabase
          .from('manual_credits')
          .select('amount')
          .gte('created_at', dateRange.startDate)
          .lte('created_at', dateRange.endDate)
      ]);

      if (paymentsResult.error) throw paymentsResult.error;
      if (creditsResult.error) throw creditsResult.error;

      const paymentsRevenue = paymentsResult.data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const creditsRevenue = creditsResult.data?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;
      const totalRevenue = paymentsRevenue + creditsRevenue;

      // Get previous period revenue for growth calculation
      const prevStartDate = new Date(dateRange.startDate);
      const prevEndDate = new Date(dateRange.endDate);
      const periodLength = prevEndDate.getTime() - prevStartDate.getTime();
      prevStartDate.setTime(prevStartDate.getTime() - periodLength);
      prevEndDate.setTime(prevEndDate.getTime() - periodLength);

      const [prevPaymentsResult, prevCreditsResult] = await Promise.all([
        supabase
          .from('payments')
          .select('amount')
          .gte('payment_date', prevStartDate.toISOString().split('T')[0])
          .lte('payment_date', prevEndDate.toISOString().split('T')[0]),
        supabase
          .from('manual_credits')
          .select('amount')
          .gte('created_at', prevStartDate.toISOString().split('T')[0])
          .lte('created_at', prevEndDate.toISOString().split('T')[0])
      ]);

      const prevPaymentsRevenue = prevPaymentsResult.data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const prevCreditsRevenue = prevCreditsResult.data?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;
      const prevTotalRevenue = prevPaymentsRevenue + prevCreditsRevenue;

      const revenueGrowth = prevTotalRevenue > 0 
        ? Math.round(((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100 * 10) / 10
        : 0;

      // Get client data
      const { data: clients, error: clientError } = await supabase
        .from('users')
        .select('id, join_date')
        .eq('role', 'client')
        .eq('status', 'active');

      if (clientError) throw clientError;

      // Get new clients in period
      const newClients = clients?.filter(c => 
        c.join_date >= dateRange.startDate && c.join_date <= dateRange.endDate
      ).length || 0;

      // Get previous period new clients for growth calculation
      const prevNewClients = clients?.filter(c => 
        c.join_date >= prevStartDate.toISOString().split('T')[0] && 
        c.join_date <= prevEndDate.toISOString().split('T')[0]
      ).length || 0;

      const clientGrowth = prevNewClients > 0 
        ? Math.round(((newClients - prevNewClients) / prevNewClients) * 100 * 10) / 10
        : 0;

      // Get class data
      const { data: classes, error: classError } = await supabase
        .from('classes')
        .select(`
          id,
          name,
          enrolled,
          capacity,
          instructor_id,
          users(name)
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

      // Find most popular class
      const classCounts: { [key: string]: number } = {};
      classes?.forEach(classData => {
        const className = classData.name;
        classCounts[className] = (classCounts[className] || 0) + 1;
      });

      const mostPopularClass = Object.entries(classCounts)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'No classes';

      return {
        totalRevenue,
        revenueGrowth,
        totalClients: clients?.length || 0,
        clientGrowth,
        totalClasses,
        averageAttendance,
        topInstructor,
        mostPopularClass
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
        .select('id, status, start_date, end_date, plan_id')
        .eq('status', 'active');

      if (error) throw error;

      const totalActiveSubscriptions = subscriptions?.length || 0;

      // Get subscription plans data separately
      const { data: plans, error: plansError } = await supabase
        .from('subscription_plans')
        .select('id, name, monthly_price');

      if (plansError) throw plansError;

      // Create a plan lookup map
      const planMap: { [key: string]: { name: string; price: number } } = {};
      plans?.forEach(plan => {
        planMap[plan.id] = { name: plan.name, price: Number(plan.monthly_price) };
      });

      // Group by plan
      const planCounts: { [key: string]: { count: number; revenue: number } } = {};
      subscriptions?.forEach(sub => {
        const planInfo = planMap[sub.plan_id];
        if (planInfo) {
          const planName = planInfo.name;
          const price = planInfo.price;
          
          if (!planCounts[planName]) {
            planCounts[planName] = { count: 0, revenue: 0 };
          }
          planCounts[planName].count++;
          planCounts[planName].revenue += price;
        }
      });

      const subscriptionsByPlan = Object.entries(planCounts).map(([planName, data]) => ({
        planName,
        count: data.count,
        revenue: data.revenue
      }));

      // Calculate average subscription duration
      const now = new Date();
      const durations = subscriptions?.map(sub => {
        const startDate = new Date(sub.start_date);
        const endDate = new Date(sub.end_date);
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
        const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
        return diffMonths;
      }) || [];

      const averageSubscriptionDuration = durations.length > 0 
        ? Math.round((durations.reduce((sum, d) => sum + d, 0) / durations.length) * 10) / 10
        : 0;

      // Get cancelled subscriptions in the period for churn rate
      const { data: cancelledSubs, error: cancelledError } = await supabase
        .from('user_subscriptions')
        .select('id, end_date')
        .eq('status', 'cancelled')
        .gte('end_date', dateRange.startDate)
        .lte('end_date', dateRange.endDate);

      if (cancelledError) throw cancelledError;

      const churnedCount = cancelledSubs?.length || 0;
      const churnRate = totalActiveSubscriptions > 0 
        ? Math.round((churnedCount / totalActiveSubscriptions) * 100 * 10) / 10
        : 0;

      const retentionRate = Math.max(0, 100 - churnRate);

      return {
        totalActiveSubscriptions,
        subscriptionsByPlan,
        averageSubscriptionDuration,
        churnRate,
        retentionRate
      };
    } catch (error) {
      console.error('❌ Error fetching subscription analytics:', error);
      throw new Error('Failed to fetch subscription analytics');
    }
  }
}

export const analyticsService = new AnalyticsService();
