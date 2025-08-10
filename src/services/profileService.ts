import { supabase } from '../config/supabase.config';
import { bookingService } from './bookingService';
import { classService } from './classService';
import { notificationService } from './notificationService';
import { subscriptionService } from './subscriptionService';

export interface ClientProfileData {
  subscription: any;
  notificationSettings: any;
  recentBookings: any[];
  upcomingClasses: any[];
  bookingHistory: any[];
}

export interface InstructorProfileData {
  stats: InstructorStats;
  notificationPreferences: any;
  upcomingClasses: any[];
  recentClasses: any[];
  monthlyStats: any;
}

export interface InstructorStats {
  totalClasses: number;
  totalStudents: number;
  thisMonthClasses: number;
  avgAttendance: number;
  upcomingClasses: number;
}

class ProfileService {
  /**
   * Load all client profile data in parallel for optimal performance
   */
  async loadClientProfileData(userId: string): Promise<ClientProfileData> {
    console.log('🚀 ProfileService: Starting optimized parallel client profile loading...');
    const startTime = Date.now();

    try {
      // Execute all data fetches in parallel
      const [
        subscriptionResult,
        notificationSettingsResult,
        recentBookingsResult,
        upcomingClassesResult,
        bookingHistoryResult
      ] = await Promise.allSettled([
        this.loadSubscriptionData(userId),
        this.loadNotificationSettings(userId),
        this.loadRecentBookings(userId),
        this.loadUpcomingClasses(userId),
        this.loadBookingHistory(userId)
      ]);

      const endTime = Date.now();
      console.log(`⚡ ProfileService: Client profile loading completed in ${endTime - startTime}ms`);

      // Extract results with error handling
      const subscription = subscriptionResult.status === 'fulfilled' ? subscriptionResult.value : null;
      const notificationSettings = notificationSettingsResult.status === 'fulfilled' ? notificationSettingsResult.value : null;
      const recentBookings = recentBookingsResult.status === 'fulfilled' ? recentBookingsResult.value : [];
      const upcomingClasses = upcomingClassesResult.status === 'fulfilled' ? upcomingClassesResult.value : [];
      const bookingHistory = bookingHistoryResult.status === 'fulfilled' ? bookingHistoryResult.value : [];

      // Log any errors
      [subscriptionResult, notificationSettingsResult, recentBookingsResult, upcomingClassesResult, bookingHistoryResult]
        .forEach((result, index) => {
          if (result.status === 'rejected') {
            const operations = ['subscription', 'notification settings', 'recent bookings', 'upcoming classes', 'booking history'];
            console.error(`❌ ProfileService: Failed to load ${operations[index]}:`, result.reason);
          }
        });

      return {
        subscription,
        notificationSettings,
        recentBookings,
        upcomingClasses,
        bookingHistory
      };

    } catch (error) {
      console.error('❌ ProfileService: Critical error in loadClientProfileData:', error);
      throw error;
    }
  }

  /**
   * Load all instructor profile data in parallel for optimal performance
   */
  async loadInstructorProfileData(userId: string): Promise<InstructorProfileData> {
    console.log('🚀 ProfileService: Starting optimized parallel instructor profile loading...');
    const startTime = Date.now();

    try {
      // Execute all data fetches in parallel
      const [
        statsResult,
        notificationPreferencesResult,
        upcomingClassesResult,
        recentClassesResult,
        monthlyStatsResult
      ] = await Promise.allSettled([
        this.loadInstructorStats(userId),
        this.loadInstructorNotificationPreferences(userId),
        this.loadInstructorUpcomingClasses(userId),
        this.loadInstructorRecentClasses(userId),
        this.loadInstructorMonthlyStats(userId)
      ]);

      const endTime = Date.now();
      console.log(`⚡ ProfileService: Instructor profile loading completed in ${endTime - startTime}ms`);

      // Extract results with error handling
      const stats = statsResult.status === 'fulfilled' ? statsResult.value : this.getDefaultInstructorStats();
      const notificationPreferences = notificationPreferencesResult.status === 'fulfilled' ? notificationPreferencesResult.value : null;
      const upcomingClasses = upcomingClassesResult.status === 'fulfilled' ? upcomingClassesResult.value : [];
      const recentClasses = recentClassesResult.status === 'fulfilled' ? recentClassesResult.value : [];
      const monthlyStats = monthlyStatsResult.status === 'fulfilled' ? monthlyStatsResult.value : null;

      // Log any errors
      [statsResult, notificationPreferencesResult, upcomingClassesResult, recentClassesResult, monthlyStatsResult]
        .forEach((result, index) => {
          if (result.status === 'rejected') {
            const operations = ['stats', 'notification preferences', 'upcoming classes', 'recent classes', 'monthly stats'];
            console.error(`❌ ProfileService: Failed to load ${operations[index]}:`, result.reason);
          }
        });

      return {
        stats,
        notificationPreferences,
        upcomingClasses,
        recentClasses,
        monthlyStats
      };

    } catch (error) {
      console.error('❌ ProfileService: Critical error in loadInstructorProfileData:', error);
      throw error;
    }
  }

  // Private helper methods for individual data fetching

  private async loadSubscriptionData(userId: string): Promise<any> {
    try {
      const response = await subscriptionService.getCurrentSubscription();
      return response.success ? response.data : null;
    } catch (error) {
      console.error('❌ Failed to load subscription data:', error);
      return null;
    }
  }

  private async loadNotificationSettings(userId: string): Promise<any> {
    try {
      const response = await notificationService.getNotificationSettings();
      return response.success ? response.data : null;
    } catch (error) {
      console.error('❌ Failed to load notification settings:', error);
      return null;
    }
  }

  private async loadRecentBookings(userId: string): Promise<any[]> {
    try {
      const response = await bookingService.getBookings({
        userId: userId,
        limit: 5,
        status: 'confirmed'
      });
      return response.success ? response.data || [] : [];
    } catch (error) {
      console.error('❌ Failed to load recent bookings:', error);
      return [];
    }
  }

  private async loadUpcomingClasses(userId: string): Promise<any[]> {
    try {
      const response = await bookingService.getBookings({
        userId: userId,
        from: new Date().toISOString().split('T')[0],
        status: 'confirmed'
      });
      return response.success ? response.data || [] : [];
    } catch (error) {
      console.error('❌ Failed to load upcoming classes:', error);
      return [];
    }
  }

  private async loadBookingHistory(userId: string): Promise<any[]> {
    try {
      const response = await bookingService.getBookings({
        userId: userId,
        limit: 10
      });
      return response.success ? response.data || [] : [];
    } catch (error) {
      console.error('❌ Failed to load booking history:', error);
      return [];
    }
  }

  private async loadInstructorStats(userId: string): Promise<InstructorStats> {
    try {
      // Get instructor's classes
      const classResponse = await classService.getClasses({
        instructor: userId,
        status: 'active'
      });

      if (!classResponse.success || !classResponse.data) {
        return this.getDefaultInstructorStats();
      }

      const allClasses = classResponse.data;
      const currentDate = new Date();
      const today = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
      
      // Calculate this month's classes
      const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      const thisMonthClasses = allClasses.filter(class_ => {
        const classDate = new Date(class_.date);
        return classDate >= firstDayOfMonth && classDate <= lastDayOfMonth;
      });

      // Calculate upcoming classes
      const upcomingClasses = allClasses.filter(class_ => {
        const classDate = new Date(class_.date);
        return classDate >= today;
      });

      // Calculate attendance metrics
      const totalEnrolled = allClasses.reduce((sum, class_) => sum + (class_.enrolled || 0), 0);
      const totalCapacity = allClasses.reduce((sum, class_) => sum + class_.capacity, 0);
      const avgAttendance = totalCapacity > 0 ? (totalEnrolled / totalCapacity) * 100 : 0;

      // Get unique students count (simplified for performance)
      const totalStudents = await this.calculateUniqueStudents(allClasses);

      return {
        totalClasses: allClasses.length,
        totalStudents,
        thisMonthClasses: thisMonthClasses.length,
        avgAttendance: Math.round(avgAttendance),
        upcomingClasses: upcomingClasses.length
      };

    } catch (error) {
      console.error('❌ Failed to load instructor stats:', error);
      return this.getDefaultInstructorStats();
    }
  }

  private async loadInstructorNotificationPreferences(userId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!error && data) {
        return {
          classFullNotifications: data.class_full_notifications ?? true,
          newEnrollmentNotifications: data.new_enrollment_notifications ?? false,
          classCancellationNotifications: data.class_cancellation_notifications ?? true,
          generalReminders: data.general_reminders ?? true,
        };
      }
      return null;
    } catch (error) {
      console.error('❌ Failed to load instructor notification preferences:', error);
      return null;
    }
  }

  private async loadInstructorUpcomingClasses(userId: string): Promise<any[]> {
    try {
      const response = await classService.getClasses({
        instructor: userId,
        from: new Date().toISOString().split('T')[0],
        limit: 10
      });
      return response.success ? response.data || [] : [];
    } catch (error) {
      console.error('❌ Failed to load instructor upcoming classes:', error);
      return [];
    }
  }

  private async loadInstructorRecentClasses(userId: string): Promise<any[]> {
    try {
      const response = await classService.getClasses({
        instructor: userId,
        to: new Date().toISOString().split('T')[0],
        limit: 5
      });
      return response.success ? response.data || [] : [];
    } catch (error) {
      console.error('❌ Failed to load instructor recent classes:', error);
      return [];
    }
  }

  private async loadInstructorMonthlyStats(userId: string): Promise<any> {
    try {
      const currentDate = new Date();
      const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const response = await classService.getClasses({
        instructor: userId,
        from: firstDayOfMonth.toISOString().split('T')[0],
        to: lastDayOfMonth.toISOString().split('T')[0]
      });

      if (!response.success || !response.data) {
        return null;
      }

      const monthlyClasses = response.data;
      const totalEnrolled = monthlyClasses.reduce((sum, class_) => sum + (class_.enrolled || 0), 0);
      const totalCapacity = monthlyClasses.reduce((sum, class_) => sum + class_.capacity, 0);

      return {
        classesThisMonth: monthlyClasses.length,
        studentsThisMonth: totalEnrolled,
        capacityUtilization: totalCapacity > 0 ? Math.round((totalEnrolled / totalCapacity) * 100) : 0
      };
    } catch (error) {
      console.error('❌ Failed to load instructor monthly stats:', error);
      return null;
    }
  }

  private async calculateUniqueStudents(classes: any[]): Promise<number> {
    try {
      // Use a more efficient approach - get all bookings for these classes at once
      if (classes.length === 0) return 0;

      const classIds = classes.map(c => c.id);
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('user_id')
        .in('class_id', classIds)
        .eq('status', 'confirmed');

      if (error) {
        console.error('Error fetching bookings for unique students:', error);
        return 0;
      }

      const uniqueStudents = new Set(bookings?.map(b => b.user_id) || []);
      return uniqueStudents.size;
    } catch (error) {
      console.error('❌ Failed to calculate unique students:', error);
      return 0;
    }
  }

  private getDefaultInstructorStats(): InstructorStats {
    return {
      totalClasses: 0,
      totalStudents: 0,
      thisMonthClasses: 0,
      avgAttendance: 0,
      upcomingClasses: 0
    };
  }
}

export const profileService = new ProfileService();