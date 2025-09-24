import { supabase } from '../config/supabase.config';
import { devError, devLog } from '../utils/devUtils';

export interface StaffActivity {
  id?: string;
  staff_id: string;
  staff_name: string;
  staff_role: 'reception' | 'instructor' | 'admin';
  activity_type: string;
  activity_description: string;
  client_id?: string;
  client_name?: string;
  metadata?: any;
  created_at?: string;
}

export interface ActivityStats {
  totalActivities: number;
  todayActivities: number;
  weekActivities: number;
  topStaffMember: {
    name: string;
    count: number;
  };
}

class ActivityService {
  /**
   * Log a staff activity
   */
  async logActivity(activity: Omit<StaffActivity, 'id' | 'created_at'>): Promise<boolean> {
    try {
      devLog('📊 Logging staff activity:', activity);

      const { data, error } = await supabase
        .from('staff_activities')
        .insert([{
          staff_id: activity.staff_id,
          staff_name: activity.staff_name,
          staff_role: activity.staff_role,
          activity_type: activity.activity_type,
          activity_description: activity.activity_description,
          client_id: activity.client_id || null,
          client_name: activity.client_name || null,
          metadata: activity.metadata || {},
          created_at: new Date().toISOString()
        }]);

      if (error) {
        devError('❌ Error logging activity:', error);
        return false;
      }

      devLog('✅ Activity logged successfully');
      return true;
    } catch (error) {
      devError('❌ Error in logActivity:', error);
      return false;
    }
  }

  /**
   * Get recent activities for admin dashboard
   */
  async getRecentActivities(limit: number = 20): Promise<StaffActivity[]> {
    try {
      devLog('📊 Fetching recent activities...');

      const { data, error } = await supabase
        .from('staff_activities')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        devError('❌ Error fetching activities:', error);
        return [];
      }

      devLog('✅ Fetched activities:', data?.length || 0);
      return data || [];
    } catch (error) {
      devError('❌ Error in getRecentActivities:', error);
      return [];
    }
  }

  /**
   * Get activities for a specific staff member
   */
  async getStaffActivities(staffId: string, limit: number = 50): Promise<StaffActivity[]> {
    try {
      devLog(`📊 Fetching activities for staff ${staffId}...`);

      const { data, error } = await supabase
        .from('staff_activities')
        .select('*')
        .eq('staff_id', staffId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        devError('❌ Error fetching staff activities:', error);
        return [];
      }

      devLog('✅ Fetched staff activities:', data?.length || 0);
      return data || [];
    } catch (error) {
      devError('❌ Error in getStaffActivities:', error);
      return [];
    }
  }

  /**
   * Get activity statistics for dashboard
   */
  async getActivityStats(): Promise<ActivityStats> {
    try {
      devLog('📊 Fetching activity statistics...');

      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      // Get total activities
      const { count: totalCount } = await supabase
        .from('staff_activities')
        .select('*', { count: 'exact', head: true });

      // Get today's activities
      const { count: todayCount } = await supabase
        .from('staff_activities')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', `${today}T00:00:00`);

      // Get this week's activities
      const { count: weekCount } = await supabase
        .from('staff_activities')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo.toISOString());

      // Get top staff member this week
      const { data: topStaffData } = await supabase
        .from('staff_activities')
        .select('staff_name')
        .gte('created_at', weekAgo.toISOString());

      let topStaffMember = { name: 'None', count: 0 };
      if (topStaffData && topStaffData.length > 0) {
        const staffCounts = topStaffData.reduce((acc: any, activity) => {
          acc[activity.staff_name] = (acc[activity.staff_name] || 0) + 1;
          return acc;
        }, {});

        const topStaff = Object.entries(staffCounts).reduce((max: any, current: any) =>
          current[1] > max[1] ? current : max
        );

        topStaffMember = { name: topStaff[0] as string, count: topStaff[1] as number };
      }

      const stats: ActivityStats = {
        totalActivities: totalCount || 0,
        todayActivities: todayCount || 0,
        weekActivities: weekCount || 0,
        topStaffMember
      };

      devLog('✅ Activity stats:', stats);
      return stats;
    } catch (error) {
      devError('❌ Error in getActivityStats:', error);
      return {
        totalActivities: 0,
        todayActivities: 0,
        weekActivities: 0,
        topStaffMember: { name: 'None', count: 0 }
      };
    }
  }

  /**
   * Helper method to format activity description based on type
   */
  formatActivityDescription(activityType: string, metadata: any = {}): string {
    switch (activityType) {
      case 'subscription_added':
        return `Added subscription: ${metadata.planName || 'Unknown Plan'}`;
      case 'subscription_cancelled':
        return `Cancelled subscription: ${metadata.planName || 'Unknown Plan'}`;
      case 'subscription_terminated':
        return `Terminated subscription: ${metadata.planName || 'Unknown Plan'}`;
      case 'classes_added':
        return `Added ${metadata.classesCount || 0} classes to subscription`;
      case 'classes_removed':
        return `Removed ${metadata.classesCount || 0} classes from subscription`;
      case 'package_added':
        return `Added package: ${metadata.packageName || 'Unknown Package'}`;
      case 'package_removed':
        return `Removed package: ${metadata.packageName || 'Unknown Package'}`;
      case 'note_added':
        return `Added client note: ${metadata.noteType || 'General'}`;
      case 'profile_updated':
        return `Updated client profile`;
      case 'client_created':
        return `Created new client account`;
      case 'instructor_assigned':
        return `Assigned instructor: ${metadata.instructorName || 'Unknown'}`;
      case 'instructor_unassigned':
        return `Unassigned instructor: ${metadata.instructorName || 'Unknown'}`;
      case 'booking_created':
        return `Created booking for: ${metadata.className || 'Unknown Class'}`;
      case 'booking_cancelled':
        return `Cancelled booking for: ${metadata.className || 'Unknown Class'}`;
      case 'payment_processed':
        return `Processed payment: ${metadata.amount || 0} ALL`;
      case 'credit_added':
        return `Added manual credit: ${metadata.amount || 0} ALL`;
      default:
        return metadata.description || 'Performed action';
    }
  }
}

export const activityService = new ActivityService();