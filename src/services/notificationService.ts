import { supabase } from '../config/supabase.config';
import { ApiResponse } from './api';
import { BackendClass } from './classService';

export interface NotificationSettings {
  enableNotifications: boolean;
  defaultReminderMinutes: number;
  enablePushNotifications: boolean;
  enableEmailNotifications: boolean;
}

export interface ClassNotification {
  id: number;
  classId: number;
  userId: number;
  type: 'reminder' | 'cancellation' | 'update';
  scheduledTime: string;
  sent: boolean;
  sentAt?: string;
  message: string;
  createdAt: string;
}

export interface NotificationRequest {
  classId: number;
  type: 'reminder' | 'cancellation' | 'update';
  message: string;
  scheduledTime?: string;
  targetUsers?: number[]; // If empty, sends to all enrolled users
}

class NotificationService {
  // Schedule notifications for a class
  async scheduleClassNotifications(
    classData: BackendClass, 
    reminderMinutes: number = 5
  ): Promise<ApiResponse<any>> {
    try {
      // Calculate notification time
      const classDateTime = new Date(`${classData.date}T${classData.time}`);
      const notificationTime = new Date(classDateTime.getTime() - (reminderMinutes * 60 * 1000));
      
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          class_id: classData.id,
          type: 'reminder',
          message: `Your ${classData.name} class with ${classData.instructor_name} starts in ${reminderMinutes} minutes!`,
          scheduled_time: notificationTime.toISOString(),
          status: 'scheduled'
        })
        .select()
        .single();
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to schedule notifications'
      };
    }
  }

  // Send immediate notification
  async sendClassNotification(
    classId: number,
    type: 'cancellation' | 'update',
    message: string,
    targetUsers?: number[]
  ): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          class_id: classId,
          type,
          message,
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true, data };
    } catch (error) {
      return { success: false, error: 'Failed to send notification' };
    }
  }

  // Cancel scheduled notifications for a class
  async cancelClassNotifications(classId: number): Promise<ApiResponse<any>> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('class_id', classId)
        .eq('status', 'scheduled');
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to cancel notifications' };
    }
  }

  // Get notification settings
  async getNotificationSettings(): Promise<ApiResponse<NotificationSettings>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }
      
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true, data: data || {} };
    } catch (error) {
      return { success: false, error: 'Failed to fetch notification settings' };
    }
  }

  // Update notification settings
  async updateNotificationSettings(settings: Partial<NotificationSettings>): Promise<ApiResponse<NotificationSettings>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }
      
      const { data, error } = await supabase
        .from('notification_settings')
        .upsert({
          user_id: user.id,
          ...settings,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true, data };
    } catch (error) {
      return { success: false, error: 'Failed to update notification settings' };
    }
  }

  // Get user notifications
  async getUserNotifications(userId: number): Promise<ApiResponse<ClassNotification[]>> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          classes (name, date, time, instructor_name)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true, data: data || [] };
    } catch (error) {
      return { success: false, error: 'Failed to get user notifications' };
    }
  }

  // Mark notification as read
  async markNotificationAsRead(notificationId: number): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          read: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', notificationId);
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to mark notification as read' };
    }
  }

  // Get notification statistics
  async getNotificationStats(classId?: number): Promise<ApiResponse<any>> {
    try {
      let query = supabase
        .from('notifications')
        .select('*');
      
      if (classId) {
        query = query.eq('class_id', classId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      const stats = {
        total: data?.length || 0,
        sent: data?.filter(n => n.status === 'sent').length || 0,
        scheduled: data?.filter(n => n.status === 'scheduled').length || 0,
        cancelled: data?.filter(n => n.status === 'cancelled').length || 0
      };
      
      return { success: true, data: stats };
    } catch (error) {
      return { success: false, error: 'Failed to get notification stats' };
    }
  }

  // Send test notification
  async sendTestNotification(userId: number, message: string): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type: 'test',
          message,
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true, data };
    } catch (error) {
      return { success: false, error: 'Failed to send test notification' };
    }
  }

  // Helper method to format notification messages
  formatClassReminderMessage(classData: BackendClass, minutes: number): string {
    return `🧘‍♀️ Class Reminder: "${classData.name}" with ${classData.instructor_name} starts in ${minutes} minutes at ${this.formatTime(classData.time)}. See you there!`;
  }

  formatClassCancellationMessage(classData: BackendClass): string {
    return `❌ Class Cancelled: "${classData.name}" scheduled for ${new Date(classData.date).toLocaleDateString()} at ${this.formatTime(classData.time)} has been cancelled. We apologize for any inconvenience.`;
  }

  formatClassUpdateMessage(classData: BackendClass): string {
    return `📝 Class Updated: "${classData.name}" on ${new Date(classData.date).toLocaleDateString()} has been updated. Please check the latest details in the app.`;
  }

  private formatTime(time: string): string {
    try {
      return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return time;
    }
  }
}

export const notificationService = new NotificationService(); 