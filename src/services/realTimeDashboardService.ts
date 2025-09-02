import { supabase } from '../config/supabase.config';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface LiveMetrics {
  activeUsers: number;
  classesToday: number;
  revenueToday: number;
  bookingsToday: number;
  currentClassCapacity: Array<{
    classId: string;
    className: string;
    currentCapacity: number;
    maxCapacity: number;
    instructorName: string;
    startTime: string;
  }>;
  recentBookings: Array<{
    id: string;
    clientName: string;
    className: string;
    bookingTime: string;
    status: string;
  }>;
  systemAlerts: Array<{
    id: string;
    type: 'warning' | 'error' | 'info';
    message: string;
    timestamp: string;
  }>;
  liveRevenue: {
    totalToday: number;
    hourlyBreakdown: Array<{
      hour: string;
      amount: number;
    }>;
    paymentMethods: Array<{
      method: string;
      count: number;
      amount: number;
    }>;
  };
}

class RealTimeDashboardService {
  private pollingInterval: NodeJS.Timeout | null = null;
  private isPolling = false;

  /**
   * Start real-time polling for live metrics
   */
  startPolling(callback: (metrics: LiveMetrics) => void, intervalMs: number = 30000): void {
    if (this.isPolling) {
      this.stopPolling();
    }

    this.isPolling = true;

    const poll = async () => {
      try {
        const metrics = await this.getLiveMetrics();
        callback(metrics);
      } catch (error) {
        console.error('Real-time dashboard polling error:', error);
      }
    };

    // Initial poll
    poll();

    // Set up interval polling
    this.pollingInterval = setInterval(poll, intervalMs);
  }

  /**
   * Stop real-time polling
   */
  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.isPolling = false;
  }

  /**
   * Get comprehensive live metrics
   */
  async getLiveMetrics(): Promise<LiveMetrics> {
    try {
      // Get today's date range
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

      // Parallel API calls for better performance
      const [
        activeUsers,
        classesToday,
        revenueToday,
        bookingsToday,
        currentClassCapacity,
        recentBookings,
        systemAlerts,
        liveRevenue
      ] = await Promise.all([
        this.getActiveUsers(),
        this.getClassesToday(),
        this.getRevenueToday(),
        this.getBookingsToday(),
        this.getCurrentClassCapacity(),
        this.getRecentBookings(),
        this.getSystemAlerts(),
        this.getLiveRevenueData()
      ]);

      return {
        activeUsers,
        classesToday,
        revenueToday,
        bookingsToday,
        currentClassCapacity,
        recentBookings,
        systemAlerts,
        liveRevenue
      };
    } catch (error) {
      console.error('Error fetching live metrics:', error);
      throw error;
    }
  }

  /**
   * Get count of currently active users
   */
  private async getActiveUsers(): Promise<number> {
    try {
      // Get users who have recent activity (bookings, logins, etc.)
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

      const { data: recentBookings } = await supabase
        .from('bookings')
        .select('user_id')
        .gte('created_at', thirtyMinutesAgo.toISOString())
        .eq('status', 'confirmed');

      // Get unique user count
      const uniqueUsers = new Set(recentBookings?.map(b => b.user_id) || []);
      return uniqueUsers.size;
    } catch (error) {
      console.error('Error getting active users:', error);
      return 0;
    }
  }

  /**
   * Get number of classes scheduled for today
   */
  private async getClassesToday(): Promise<number> {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

      const { data: classes } = await supabase
        .from('classes')
        .select('id')
        .gte('date', startOfDay.toISOString().split('T')[0])
        .lte('date', endOfDay.toISOString().split('T')[0])
        .eq('status', 'active');

      return classes?.length || 0;
    } catch (error) {
      console.error('Error getting classes today:', error);
      return 0;
    }
  }

  /**
   * Get today's revenue
   */
  private async getRevenueToday(): Promise<number> {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

      const { data: payments } = await supabase
        .from('payments')
        .select('amount')
        .eq('status', 'completed')
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString());

      return payments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
    } catch (error) {
      console.error('Error getting revenue today:', error);
      return 0;
    }
  }

  /**
   * Get today's booking count
   */
  private async getBookingsToday(): Promise<number> {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

      const { data: bookings } = await supabase
        .from('bookings')
        .select('id')
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString())
        .eq('status', 'confirmed');

      return bookings?.length || 0;
    } catch (error) {
      console.error('Error getting bookings today:', error);
      return 0;
    }
  }

  /**
   * Get current class capacity for ongoing classes
   */
  private async getCurrentClassCapacity(): Promise<Array<{
    classId: string;
    className: string;
    currentCapacity: number;
    maxCapacity: number;
    instructorName: string;
    startTime: string;
  }>> {
    try {
      const now = new Date();
      const currentTime = now.toTimeString().split(' ')[0]; // HH:MM:SS format
      const today = now.toISOString().split('T')[0];

      // Get classes happening now or in the next hour
      const { data: classes } = await supabase
        .from('classes')
        .select(`
          id,
          name,
          capacity,
          time,
          instructor_id,
          users!instructor_id(name)
        `)
        .eq('date', today)
        .eq('status', 'active')
        .gte('time', currentTime);

      if (!classes || classes.length === 0) {
        return [];
      }

      // Get current bookings for each class
      const classIds = classes.map(cls => cls.id);
      const { data: bookings } = await supabase
        .from('bookings')
        .select('class_id')
        .in('class_id', classIds)
        .eq('status', 'confirmed');

      // Count bookings per class
      const bookingCounts: { [key: string]: number } = {};
      bookings?.forEach(booking => {
        bookingCounts[booking.class_id] = (bookingCounts[booking.class_id] || 0) + 1;
      });

      return classes.slice(0, 5).map(cls => ({
        classId: cls.id,
        className: cls.name,
        currentCapacity: bookingCounts[cls.id] || 0,
        maxCapacity: cls.capacity,
        instructorName: cls.users?.name || 'Unknown',
        startTime: cls.time
      }));

    } catch (error) {
      console.error('Error getting current class capacity:', error);
      return [];
    }
  }

  /**
   * Get recent bookings (last 30 minutes)
   */
  private async getRecentBookings(): Promise<Array<{
    id: string;
    clientName: string;
    className: string;
    bookingTime: string;
    status: string;
  }>> {
    try {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

      const { data: bookings } = await supabase
        .from('bookings')
        .select(`
          id,
          status,
          created_at,
          classes!inner(name),
          users!inner(name)
        `)
        .gte('created_at', thirtyMinutesAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

      return bookings?.map(booking => ({
        id: booking.id,
        clientName: booking.users?.name || 'Unknown',
        className: booking.classes?.name || 'Unknown Class',
        bookingTime: new Date(booking.created_at).toLocaleTimeString(),
        status: booking.status
      })) || [];

    } catch (error) {
      console.error('Error getting recent bookings:', error);
      return [];
    }
  }

  /**
   * Get system alerts and notifications
   */
  private async getSystemAlerts(): Promise<Array<{
    id: string;
    type: 'warning' | 'error' | 'info';
    message: string;
    timestamp: string;
  }>> {
    try {
      // Check for classes that are overbooked
      const overbookedClasses = await this.getOverbookedClasses();

      // Check for classes starting soon with low attendance
      const lowAttendanceClasses = await this.getLowAttendanceClasses();

      const alerts: Array<{
        id: string;
        type: 'warning' | 'error' | 'info';
        message: string;
        timestamp: string;
      }> = [];

      // Add overbooked alerts
      overbookedClasses.forEach(cls => {
        alerts.push({
          id: `overbooked-${cls.id}`,
          type: 'error',
          message: `${cls.name} is overbooked (${cls.current}/${cls.capacity})`,
          timestamp: new Date().toISOString()
        });
      });

      // Add low attendance alerts
      lowAttendanceClasses.forEach(cls => {
        alerts.push({
          id: `low-attendance-${cls.id}`,
          type: 'warning',
          message: `${cls.name} has low attendance (${cls.current}/${cls.capacity})`,
          timestamp: new Date().toISOString()
        });
      });

      return alerts.slice(0, 5); // Limit to 5 most recent alerts

    } catch (error) {
      console.error('Error getting system alerts:', error);
      return [];
    }
  }

  /**
   * Get overbooked classes
   */
  private async getOverbookedClasses(): Promise<Array<{
    id: string;
    name: string;
    current: number;
    capacity: number;
  }>> {
    try {
      const now = new Date();
      const currentTime = now.toTimeString().split(' ')[0];
      const today = now.toISOString().split('T')[0];

      const { data: classes } = await supabase
        .from('classes')
        .select('id, name, capacity')
        .eq('date', today)
        .eq('status', 'active')
        .gte('time', currentTime);

      if (!classes) return [];

      const classIds = classes.map(cls => cls.id);
      const { data: bookings } = await supabase
        .from('bookings')
        .select('class_id')
        .in('class_id', classIds)
        .eq('status', 'confirmed');

      const bookingCounts: { [key: string]: number } = {};
      bookings?.forEach(booking => {
        bookingCounts[booking.class_id] = (bookingCounts[booking.class_id] || 0) + 1;
      });

      return classes
        .filter(cls => (bookingCounts[cls.id] || 0) > cls.capacity)
        .map(cls => ({
          id: cls.id,
          name: cls.name,
          current: bookingCounts[cls.id] || 0,
          capacity: cls.capacity
        }));

    } catch (error) {
      console.error('Error getting overbooked classes:', error);
      return [];
    }
  }

  /**
   * Get classes with low attendance (less than 30% capacity)
   */
  private async getLowAttendanceClasses(): Promise<Array<{
    id: string;
    name: string;
    current: number;
    capacity: number;
  }>> {
    try {
      const now = new Date();
      const currentTime = now.toTimeString().split(' ')[0];
      const today = now.toISOString().split('T')[0];

      const { data: classes } = await supabase
        .from('classes')
        .select('id, name, capacity')
        .eq('date', today)
        .eq('status', 'active')
        .gte('time', currentTime);

      if (!classes) return [];

      const classIds = classes.map(cls => cls.id);
      const { data: bookings } = await supabase
        .from('bookings')
        .select('class_id')
        .in('class_id', classIds)
        .eq('status', 'confirmed');

      const bookingCounts: { [key: string]: number } = {};
      bookings?.forEach(booking => {
        bookingCounts[booking.class_id] = (bookingCounts[booking.class_id] || 0) + 1;
      });

      return classes
        .filter(cls => {
          const current = bookingCounts[cls.id] || 0;
          const percentage = cls.capacity > 0 ? current / cls.capacity : 0;
          return percentage < 0.3 && current < cls.capacity; // Less than 30% and not full
        })
        .map(cls => ({
          id: cls.id,
          name: cls.name,
          current: bookingCounts[cls.id] || 0,
          capacity: cls.capacity
        }));

    } catch (error) {
      console.error('Error getting low attendance classes:', error);
      return [];
    }
  }

  /**
   * Get live revenue data with hourly breakdown
   */
  private async getLiveRevenueData(): Promise<{
    totalToday: number;
    hourlyBreakdown: Array<{
      hour: string;
      amount: number;
    }>;
    paymentMethods: Array<{
      method: string;
      count: number;
      amount: number;
    }>;
  }> {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      const { data: payments } = await supabase
        .from('payments')
        .select('amount, created_at, payment_method')
        .eq('status', 'completed')
        .gte('created_at', startOfDay.toISOString())
        .order('created_at', { ascending: false });

      if (!payments) {
        return {
          totalToday: 0,
          hourlyBreakdown: [],
          paymentMethods: []
        };
      }

      // Calculate total
      const totalToday = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);

      // Calculate hourly breakdown
      const hourlyBreakdown: { [key: string]: number } = {};
      payments.forEach(payment => {
        const hour = new Date(payment.created_at).getHours();
        const hourLabel = `${hour.toString().padStart(2, '0')}:00`;
        hourlyBreakdown[hourLabel] = (hourlyBreakdown[hourLabel] || 0) + (payment.amount || 0);
      });

      const hourlyBreakdownArray = Object.entries(hourlyBreakdown)
        .map(([hour, amount]) => ({ hour, amount }))
        .sort((a, b) => a.hour.localeCompare(b.hour));

      // Calculate payment methods
      const paymentMethodStats: { [key: string]: { count: number; amount: number } } = {};
      payments.forEach(payment => {
        const method = payment.payment_method || 'unknown';
        if (!paymentMethodStats[method]) {
          paymentMethodStats[method] = { count: 0, amount: 0 };
        }
        paymentMethodStats[method].count += 1;
        paymentMethodStats[method].amount += payment.amount || 0;
      });

      const paymentMethods = Object.entries(paymentMethodStats)
        .map(([method, stats]) => ({
          method: method.charAt(0).toUpperCase() + method.slice(1),
          count: stats.count,
          amount: stats.amount
        }))
        .sort((a, b) => b.amount - a.amount);

      return {
        totalToday,
        hourlyBreakdown: hourlyBreakdownArray,
        paymentMethods
      };

    } catch (error) {
      console.error('Error getting live revenue data:', error);
      return {
        totalToday: 0,
        hourlyBreakdown: [],
        paymentMethods: []
      };
    }
  }
}

export const realTimeDashboardService = new RealTimeDashboardService();
