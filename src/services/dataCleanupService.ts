import { supabase } from '../config/supabase.config';
import { devLog } from '../utils/devUtils';

interface CleanupResult {
  success: boolean;
  deletedCount: number;
  error?: string;
}

interface CleanupOptions {
  daysOld: number;
  userId?: string;
  status?: string;
}

class DataCleanupService {
  
  // ===== AUTOMATIC CLEANUP FUNCTIONS =====
  
  /**
   * Clean up classes older than specified days (default 30 days)
   */
  async cleanupOldClasses(options: CleanupOptions = { daysOld: 30 }): Promise<CleanupResult> {
    try {
      devLog(`🧹 Cleaning up classes older than ${options.daysOld} days...`);
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - options.daysOld);
      const cutoffISO = cutoffDate.toISOString().split('T')[0];
      
      let query = supabase
        .from('classes')
        .delete()
        .lt('date', cutoffISO);
      
      // Add user filter if specified
      if (options.userId) {
        query = query.eq('instructor_id', options.userId);
      }
      
      // Add status filter if specified
      if (options.status) {
        query = query.eq('status', options.status);
      }
      
      const { error, count } = await query;
      
      if (error) {
        devLog('❌ Error cleaning up classes:', error);
        return { success: false, deletedCount: 0, error: error.message };
      }
      
      devLog(`✅ Successfully deleted ${count || 0} old classes`);
      return { success: true, deletedCount: count || 0 };
      
    } catch (error) {
      devLog('❌ Exception in cleanupOldClasses:', error);
      return { success: false, deletedCount: 0, error: 'Failed to cleanup classes' };
    }
  }
  
  /**
   * Clean up notifications older than specified days (default 10 days)
   */
  async cleanupOldNotifications(options: CleanupOptions = { daysOld: 10 }): Promise<CleanupResult> {
    try {
      devLog(`🧹 Cleaning up notifications older than ${options.daysOld} days...`);
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - options.daysOld);
      const cutoffISO = cutoffDate.toISOString();
      
      let query = supabase
        .from('notifications')
        .delete()
        .lt('created_at', cutoffISO);
      
      // Add user filter if specified
      if (options.userId) {
        query = query.eq('user_id', options.userId);
      }
      
      const { error, count } = await query;
      
      if (error) {
        devLog('❌ Error cleaning up notifications:', error);
        return { success: false, deletedCount: 0, error: error.message };
      }
      
      devLog(`✅ Successfully deleted ${count || 0} old notifications`);
      return { success: true, deletedCount: count || 0 };
      
    } catch (error) {
      devLog('❌ Exception in cleanupOldNotifications:', error);
      return { success: false, deletedCount: 0, error: 'Failed to cleanup notifications' };
    }
  }
  
  /**
   * Clean up bookings older than specified days
   */
  async cleanupOldBookings(options: CleanupOptions): Promise<CleanupResult> {
    try {
      devLog(`🧹 Cleaning up bookings older than ${options.daysOld} days...`);
      
      // Check if bookings table exists by trying a simple query first
      const testQuery = await supabase.from('bookings').select('id', { count: 'exact', head: true }).limit(1);
      if (testQuery.error) {
        devLog(`⚠️ Bookings table not accessible: ${testQuery.error.message}`);
        return { success: true, deletedCount: 0 }; // Return success but 0 deleted
      }
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - options.daysOld);
      const dateColumn = this.getDateColumnForTable('bookings'); // booking_date
      
      // Use appropriate date format
      const cutoffValue = dateColumn === 'booking_date' 
        ? cutoffDate.toISOString().split('T')[0] 
        : cutoffDate.toISOString();
      
      let query = supabase
        .from('bookings')
        .delete()
        .lt(dateColumn, cutoffValue);
      
      // Add user filter if specified
      if (options.userId) {
        query = query.eq('user_id', options.userId);
      }
      
      // Add status filter if specified
      if (options.status) {
        query = query.eq('status', options.status);
      }
      
      const { error, count } = await query;
      
      if (error) {
        devLog('❌ Error cleaning up bookings:', error);
        return { success: false, deletedCount: 0, error: error.message };
      }
      
      devLog(`✅ Successfully deleted ${count || 0} old bookings`);
      return { success: true, deletedCount: count || 0 };
      
    } catch (error) {
      devLog('❌ Exception in cleanupOldBookings:', error);
      return { success: false, deletedCount: 0, error: 'Failed to cleanup bookings' };
    }
  }
  
  /**
   * Clean up payments older than specified days
   */
  async cleanupOldPayments(options: CleanupOptions): Promise<CleanupResult> {
    try {
      devLog(`🧹 Cleaning up payments older than ${options.daysOld} days...`);
      
      // Check if payments table exists
      const testQuery = await supabase.from('payments').select('id', { count: 'exact', head: true }).limit(1);
      if (testQuery.error) {
        devLog(`⚠️ Payments table not accessible: ${testQuery.error.message}`);
        return { success: true, deletedCount: 0 };
      }
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - options.daysOld);
      const dateColumn = this.getDateColumnForTable('payments'); // created_at
      const cutoffISO = cutoffDate.toISOString();
      
      let query = supabase
        .from('payments')
        .delete()
        .lt(dateColumn, cutoffISO);
      
      // Add user filter if specified
      if (options.userId) {
        query = query.eq('user_id', options.userId);
      }
      
      const { error, count } = await query;
      
      if (error) {
        devLog('❌ Error cleaning up payments:', error);
        return { success: false, deletedCount: 0, error: error.message };
      }
      
      devLog(`✅ Successfully deleted ${count || 0} old payments`);
      return { success: true, deletedCount: count || 0 };
      
    } catch (error) {
      devLog('❌ Exception in cleanupOldPayments:', error);
      return { success: false, deletedCount: 0, error: 'Failed to cleanup payments' };
    }
  }
  
  /**
   * Clean up user subscriptions older than specified days
   */
  async cleanupOldSubscriptions(options: CleanupOptions): Promise<CleanupResult> {
    try {
      devLog(`🧹 Cleaning up subscriptions older than ${options.daysOld} days...`);
      
      // Check if user_subscriptions table exists
      const testQuery = await supabase.from('user_subscriptions').select('id', { count: 'exact', head: true }).limit(1);
      if (testQuery.error) {
        devLog(`⚠️ User subscriptions table not accessible: ${testQuery.error.message}`);
        return { success: true, deletedCount: 0 };
      }
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - options.daysOld);
      const dateColumn = this.getDateColumnForTable('user_subscriptions'); // end_date
      const cutoffValue = cutoffDate.toISOString().split('T')[0]; // Use date format for end_date
      
      let query = supabase
        .from('user_subscriptions')
        .delete()
        .lt(dateColumn, cutoffValue)
        .eq('status', 'expired'); // Only delete expired subscriptions
      
      // Add user filter if specified
      if (options.userId) {
        query = query.eq('user_id', options.userId);
      }
      
      const { error, count } = await query;
      
      if (error) {
        devLog('❌ Error cleaning up subscriptions:', error);
        return { success: false, deletedCount: 0, error: error.message };
      }
      
      devLog(`✅ Successfully deleted ${count || 0} old subscriptions`);
      return { success: true, deletedCount: count || 0 };
      
    } catch (error) {
      devLog('❌ Exception in cleanupOldSubscriptions:', error);
      return { success: false, deletedCount: 0, error: 'Failed to cleanup subscriptions' };
    }
  }
  
  /**
   * Clean up waitlist entries older than specified days
   */
  async cleanupOldWaitlist(options: CleanupOptions): Promise<CleanupResult> {
    try {
      devLog(`🧹 Cleaning up waitlist entries older than ${options.daysOld} days...`);
      
      // Check if waitlist table exists
      const testQuery = await supabase.from('waitlist').select('id', { count: 'exact', head: true }).limit(1);
      if (testQuery.error) {
        devLog(`⚠️ Waitlist table not accessible: ${testQuery.error.message}`);
        return { success: true, deletedCount: 0 };
      }
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - options.daysOld);
      const dateColumn = this.getDateColumnForTable('waitlist'); // created_at
      const cutoffISO = cutoffDate.toISOString();
      
      let query = supabase
        .from('waitlist')
        .delete()
        .lt(dateColumn, cutoffISO);
      
      // Add user filter if specified
      if (options.userId) {
        query = query.eq('user_id', options.userId);
      }
      
      const { error, count } = await query;
      
      if (error) {
        devLog('❌ Error cleaning up waitlist:', error);
        return { success: false, deletedCount: 0, error: error.message };
      }
      
      devLog(`✅ Successfully deleted ${count || 0} old waitlist entries`);
      return { success: true, deletedCount: count || 0 };
      
    } catch (error) {
      devLog('❌ Exception in cleanupOldWaitlist:', error);
      return { success: false, deletedCount: 0, error: 'Failed to cleanup waitlist' };
    }
  }
  
  /**
   * Clean up users older than specified days (be very careful with this!)
   */
  async cleanupOldUsers(options: CleanupOptions): Promise<CleanupResult> {
    try {
      devLog(`🧹 Cleaning up inactive users older than ${options.daysOld} days...`);
      
      // Check if users table exists
      const testQuery = await supabase.from('users').select('id', { count: 'exact', head: true }).limit(1);
      if (testQuery.error) {
        devLog(`⚠️ Users table not accessible: ${testQuery.error.message}`);
        return { success: true, deletedCount: 0 };
      }
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - options.daysOld);
      const dateColumn = this.getDateColumnForTable('users'); // created_at
      const cutoffISO = cutoffDate.toISOString();
      
      // Only delete inactive users to prevent accidental deletion of active accounts
      let query = supabase
        .from('users')
        .delete()
        .lt(dateColumn, cutoffISO)
        .eq('status', 'inactive'); // Only delete inactive users
      
      // Add user filter if specified (for specific user cleanup)
      if (options.userId) {
        query = query.eq('id', options.userId);
      }
      
      const { error, count } = await query;
      
      if (error) {
        devLog('❌ Error cleaning up users:', error);
        return { success: false, deletedCount: 0, error: error.message };
      }
      
      devLog(`✅ Successfully deleted ${count || 0} old inactive users`);
      return { success: true, deletedCount: count || 0 };
      
    } catch (error) {
      devLog('❌ Exception in cleanupOldUsers:', error);
      return { success: false, deletedCount: 0, error: 'Failed to cleanup users' };
    }
  }

  /**
   * Clean up subscription plans older than specified days
   */
  async cleanupOldPlans(options: CleanupOptions): Promise<CleanupResult> {
    try {
      devLog(`🧹 Cleaning up old subscription plans older than ${options.daysOld} days...`);
      
      // Check if subscription_plans table exists
      const testQuery = await supabase.from('subscription_plans').select('id', { count: 'exact', head: true }).limit(1);
      if (testQuery.error) {
        devLog(`⚠️ Subscription plans table not accessible: ${testQuery.error.message}`);
        return { success: true, deletedCount: 0 };
      }
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - options.daysOld);
      const dateColumn = this.getDateColumnForTable('subscription_plans'); // created_at
      const cutoffISO = cutoffDate.toISOString();
      
      // Only delete inactive plans
      let query = supabase
        .from('subscription_plans')
        .delete()
        .lt(dateColumn, cutoffISO)
        .eq('is_active', false); // Only delete inactive plans
      
      const { error, count } = await query;
      
      if (error) {
        devLog('❌ Error cleaning up subscription plans:', error);
        return { success: false, deletedCount: 0, error: error.message };
      }
      
      devLog(`✅ Successfully deleted ${count || 0} old subscription plans`);
      return { success: true, deletedCount: count || 0 };
      
    } catch (error) {
      devLog('❌ Exception in cleanupOldPlans:', error);
      return { success: false, deletedCount: 0, error: 'Failed to cleanup subscription plans' };
    }
  }

  // ===== BULK CLEANUP FUNCTIONS =====
  
  /**
   * Run automatic cleanup for all data types
   */
  async runAutomaticCleanup(): Promise<{ 
    classes: CleanupResult; 
    notifications: CleanupResult; 
    totalDeleted: number;
  }> {
    devLog('🚀 Starting automatic data cleanup...');
    
    const classesResult = await this.cleanupOldClasses({ daysOld: 30 });
    const notificationsResult = await this.cleanupOldNotifications({ daysOld: 10 });
    
    const totalDeleted = classesResult.deletedCount + notificationsResult.deletedCount;
    
    devLog(`🎯 Automatic cleanup completed. Total deleted: ${totalDeleted} records`);
    
    return {
      classes: classesResult,
      notifications: notificationsResult,
      totalDeleted
    };
  }
  
  /**
   * Clean up all data for a specific user
   */
  async cleanupUserData(userId: string, daysOld: number): Promise<{
    classes: CleanupResult;
    bookings: CleanupResult;
    notifications: CleanupResult;
    payments: CleanupResult;
    subscriptions: CleanupResult;
    waitlist: CleanupResult;
    totalDeleted: number;
  }> {
    devLog(`🧹 Cleaning up all data for user ${userId} older than ${daysOld} days...`);
    
    const options = { daysOld, userId };
    
    const [
      classesResult,
      bookingsResult,
      notificationsResult,
      paymentsResult,
      subscriptionsResult,
      waitlistResult
    ] = await Promise.all([
      this.cleanupOldClasses(options),
      this.cleanupOldBookings(options),
      this.cleanupOldNotifications(options),
      this.cleanupOldPayments(options),
      this.cleanupOldSubscriptions(options),
      this.cleanupOldWaitlist(options)
    ]);
    
    const totalDeleted = 
      classesResult.deletedCount +
      bookingsResult.deletedCount +
      notificationsResult.deletedCount +
      paymentsResult.deletedCount +
      subscriptionsResult.deletedCount +
      waitlistResult.deletedCount;
    
    devLog(`🎯 User cleanup completed. Total deleted: ${totalDeleted} records`);
    
    return {
      classes: classesResult,
      bookings: bookingsResult,
      notifications: notificationsResult,
      payments: paymentsResult,
      subscriptions: subscriptionsResult,
      waitlist: waitlistResult,
      totalDeleted
    };
  }
  
  // ===== DATA STATISTICS =====
  
  /**
   * Get the correct date column name for a table
   */
  private getDateColumnForTable(tableName: string): string {
    const dateColumnMap: { [key: string]: string } = {
      'classes': 'date',
      'bookings': 'booking_date',
      'notifications': 'created_at',
      'payments': 'created_at',
      'user_subscriptions': 'end_date',
      'waitlist': 'created_at',
      'users': 'created_at',
      'subscription_plans': 'created_at'
    };
    
    return dateColumnMap[tableName] || 'created_at';
  }

  /**
   * Check if a table exists and return counts safely
   */
  private async getTableCounts(tableName: string, dateColumn: string, daysOld: number): Promise<{ total: number; old: number }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      // Get total count
      const totalQuery = supabase.from(tableName).select('id', { count: 'exact', head: true });
      const totalResult = await totalQuery;
      
      if (totalResult.error) {
        devLog(`⚠️ Table ${tableName} not accessible: ${totalResult.error.message}`);
        return { total: 0, old: 0 };
      }
      
      // Use the correct date column for this table
      const actualDateColumn = this.getDateColumnForTable(tableName);
      
      // Get old count with appropriate date format
      let cutoffValue;
      if (actualDateColumn === 'date' || actualDateColumn === 'booking_date' || actualDateColumn === 'end_date') {
        // For date columns, use YYYY-MM-DD format
        cutoffValue = cutoffDate.toISOString().split('T')[0];
      } else {
        // For datetime columns, use full ISO format
        cutoffValue = cutoffDate.toISOString();
      }
      
      const oldQuery = supabase.from(tableName).select('id', { count: 'exact', head: true }).lt(actualDateColumn, cutoffValue);
      
      // For subscriptions, add status filter
      if (tableName === 'user_subscriptions') {
        oldQuery.eq('status', 'expired');
      }
      
      const oldResult = await oldQuery;
      
      if (oldResult.error) {
        devLog(`⚠️ Could not get old records for ${tableName} using column ${actualDateColumn}: ${oldResult.error.message}`);
        return { total: totalResult.count || 0, old: 0 };
      }
      
      return {
        total: totalResult.count || 0,
        old: oldResult.count || 0
      };
      
    } catch (error) {
      devLog(`❌ Error accessing table ${tableName}:`, error);
      return { total: 0, old: 0 };
    }
  }

  /**
   * Get comprehensive data statistics for all database tables
   */
  async getDataStatistics(): Promise<{
    classes: { total: number; old: number };
    bookings: { total: number; old: number };
    notifications: { total: number; old: number };
    payments: { total: number; old: number };
    subscriptions: { total: number; old: number };
    waitlist: { total: number; old: number };
    users: { total: number; old: number };
    plans: { total: number; old: number };
    totalRecords: number;
    estimatedSizeMB: number;
  }> {
    try {
      devLog('📊 Fetching comprehensive data statistics...');
      
      // Get statistics for ALL database tables
      const [
        classes,
        bookings,
        notifications,
        payments,
        subscriptions,
        waitlist,
        users,
        plans
      ] = await Promise.all([
        this.getTableCounts('classes', '', 30),
        this.getTableCounts('bookings', '', 30),
        this.getTableCounts('notifications', '', 10),
        this.getTableCounts('payments', '', 30),
        this.getTableCounts('user_subscriptions', '', 30),
        this.getTableCounts('waitlist', '', 30),
        this.getTableCounts('users', '', 365), // Users older than 1 year
        this.getTableCounts('subscription_plans', '', 365) // Plans older than 1 year
      ]);
      
      // Calculate total records and estimated size
      const totalRecords = classes.total + bookings.total + notifications.total + 
                          payments.total + subscriptions.total + waitlist.total + 
                          users.total + plans.total;
      
      // Estimate database size (rough calculation based on average record sizes)
      const estimatedSizeMB = this.estimateDatabaseSize({
        classes: classes.total,
        bookings: bookings.total,
        notifications: notifications.total,
        payments: payments.total,
        subscriptions: subscriptions.total,
        waitlist: waitlist.total,
        users: users.total,
        plans: plans.total
      });
      
      return {
        classes,
        bookings,
        notifications,
        payments,
        subscriptions,
        waitlist,
        users,
        plans,
        totalRecords,
        estimatedSizeMB
      };
      
    } catch (error) {
      devLog('❌ Error fetching data statistics:', error);
      throw error;
    }
  }

  /**
   * Estimate database size in MB based on record counts
   */
  private estimateDatabaseSize(counts: { [table: string]: number }): number {
    // Average record sizes in KB (estimated)
    const avgRecordSizes = {
      classes: 1.5,        // Class info with description
      bookings: 0.8,       // Booking records
      notifications: 0.6,  // Notification messages
      payments: 1.2,       // Payment records
      subscriptions: 1.0,  // Subscription data
      waitlist: 0.5,       // Waitlist entries
      users: 2.0,          // User profiles with details
      plans: 1.0           // Subscription plans
    };
    
    let totalSizeKB = 0;
    
    Object.entries(counts).forEach(([table, count]) => {
      const avgSize = avgRecordSizes[table as keyof typeof avgRecordSizes] || 1.0;
      totalSizeKB += count * avgSize;
    });
    
    // Convert to MB and round to 2 decimal places
    return Math.round((totalSizeKB / 1024) * 100) / 100;
  }
  
  /**
   * Get user-specific data statistics safely
   */
  private async getUserTableCount(tableName: string, userIdColumn: string, userId: string): Promise<number> {
    try {
      const query = supabase.from(tableName).select('id', { count: 'exact', head: true }).eq(userIdColumn, userId);
      const result = await query;
      
      if (result.error) {
        devLog(`⚠️ Table ${tableName} not accessible for user stats: ${result.error.message}`);
        return 0;
      }
      
      return result.count || 0;
    } catch (error) {
      devLog(`❌ Error getting user count for ${tableName}:`, error);
      return 0;
    }
  }

  /**
   * Get user-specific data statistics with storage estimation
   */
  async getUserDataStatistics(userId: string): Promise<{
    classes: number;
    bookings: number;
    notifications: number;
    payments: number;
    subscriptions: number;
    waitlist: number;
    total: number;
    estimatedSizeMB: number;
  }> {
    try {
      devLog(`📊 Fetching data statistics for user ${userId}...`);
      
      const [
        classes,
        bookings,
        notifications,
        payments,
        subscriptions,
        waitlist
      ] = await Promise.all([
        this.getUserTableCount('classes', 'instructor_id', userId),
        this.getUserTableCount('bookings', 'user_id', userId),
        this.getUserTableCount('notifications', 'user_id', userId),
        this.getUserTableCount('payments', 'user_id', userId),
        this.getUserTableCount('user_subscriptions', 'user_id', userId),
        this.getUserTableCount('waitlist', 'user_id', userId)
      ]);
      
      const total = classes + bookings + notifications + payments + subscriptions + waitlist;
      
      // Calculate estimated storage size for this user
      const estimatedSizeMB = this.estimateUserStorageSize({
        classes,
        bookings,
        notifications,
        payments,
        subscriptions,
        waitlist
      });
      
      return {
        classes,
        bookings,
        notifications,
        payments,
        subscriptions,
        waitlist,
        total,
        estimatedSizeMB
      };
      
    } catch (error) {
      devLog('❌ Error fetching user data statistics:', error);
      throw error;
    }
  }

  /**
   * Estimate storage size for a specific user in MB
   */
  private estimateUserStorageSize(userCounts: { 
    classes: number; 
    bookings: number; 
    notifications: number; 
    payments: number; 
    subscriptions: number; 
    waitlist: number; 
  }): number {
    // Average record sizes in KB for user-specific data
    const avgUserRecordSizes = {
      classes: 1.5,        // Class records (if user is instructor)
      bookings: 0.8,       // User's bookings
      notifications: 0.6,  // User's notifications
      payments: 1.2,       // User's payment records
      subscriptions: 1.0,  // User's subscriptions
      waitlist: 0.5        // User's waitlist entries
    };
    
    let totalSizeKB = 2.0; // Base user profile size
    
    Object.entries(userCounts).forEach(([table, count]) => {
      const avgSize = avgUserRecordSizes[table as keyof typeof avgUserRecordSizes] || 1.0;
      totalSizeKB += count * avgSize;
    });
    
    // Convert to MB and round to 2 decimal places
    return Math.round((totalSizeKB / 1024) * 100) / 100;
  }
}

export const dataCleanupService = new DataCleanupService();
export type { CleanupOptions, CleanupResult };
