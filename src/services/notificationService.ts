import { ApiResponse, apiService } from './api';
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
      
      const notificationRequest: NotificationRequest = {
        classId: classData.id,
        type: 'reminder',
        message: `Your ${classData.name} class with ${classData.instructor_name} starts in ${reminderMinutes} minutes!`,
        scheduledTime: notificationTime.toISOString()
      };

      return await apiService.post<any>('/notifications/schedule', notificationRequest);
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
    const notificationRequest: NotificationRequest = {
      classId,
      type,
      message,
      targetUsers
    };

    return await apiService.post<any>('/notifications/send', notificationRequest);
  }

  // Cancel scheduled notifications for a class
  async cancelClassNotifications(classId: number): Promise<ApiResponse<any>> {
    return await apiService.delete<void>(`/notifications/class/${classId}`);
  }

  // Get notification settings
  async getNotificationSettings(): Promise<ApiResponse<NotificationSettings>> {
    const response = await apiService.get<any>('/notifications/settings');
    
    if (response.success && response.data) {
      return {
        success: true,
        data: response.data
      };
    }
    
    return {
      success: false,
      error: response.error || 'Failed to fetch notification settings'
    };
  }

  // Update notification settings
  async updateNotificationSettings(settings: Partial<NotificationSettings>): Promise<ApiResponse<NotificationSettings>> {
    return await apiService.put<NotificationSettings>('/notifications/settings', settings);
  }

  // Get notifications for a user
  async getUserNotifications(userId: number): Promise<ApiResponse<ClassNotification[]>> {
    const response = await apiService.get<any>(`/notifications/user/${userId}`);
    
    if (response.success && response.data) {
      return {
        success: true,
        data: response.data
      };
    }
    
    return {
      success: false,
      error: response.error || 'Failed to fetch notifications'
    };
  }

  // Mark notification as read
  async markNotificationAsRead(notificationId: number): Promise<ApiResponse<void>> {
    return await apiService.put<void>(`/notifications/${notificationId}/read`);
  }

  // Get class notification statistics
  async getNotificationStats(classId?: number): Promise<ApiResponse<any>> {
    const endpoint = classId ? `/notifications/stats?classId=${classId}` : '/notifications/stats';
    return await apiService.get<any>(endpoint);
  }

  // Test notification (for admin testing)
  async sendTestNotification(userId: number, message: string): Promise<ApiResponse<any>> {
    return await apiService.post<any>('/notifications/test', {
      userId,
      message
    });
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