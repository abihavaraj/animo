import { supabase } from '../config/supabase.config';
import { ApiResponse } from './api';

export interface DashboardNotification {
  id: string;
  type: 'reminder' | 'warning' | 'info' | 'success' | 'error';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  isRead: boolean;
  createdAt: string;
  data?: any;
}

interface FormattedNotification {
  title: string;
  message: string;
  color: string;
  icon: string;
  priority: string;
}

class DashboardNotificationService {
  async getPendingNotifications(): Promise<ApiResponse<DashboardNotification[]>> {
    try {
      // For now, return mock data. In production, this would query actual notifications
      const mockNotifications: DashboardNotification[] = [
        {
          id: '1',
          type: 'reminder',
          title: 'Low Credit Balance',
          message: 'Some clients have low credit balances and may need reminders',
          priority: 'medium',
          isRead: false,
          createdAt: new Date().toISOString()
        },
        {
          id: '2',
          type: 'warning',
          title: 'Subscription Expiring',
          message: '5 subscriptions are expiring this week',
          priority: 'high',
          isRead: false,
          createdAt: new Date().toISOString()
        }
      ];

      return {
        success: true,
        data: mockNotifications
      };
    } catch (error) {
      console.error('Failed to get pending notifications:', error);
      return {
        success: false,
        error: 'Failed to load notifications'
      };
    }
  }

  async getUnreadCount(): Promise<ApiResponse<number>> {
    try {
      const result = await this.getPendingNotifications();
      if (result.success && result.data) {
        const unreadCount = result.data.filter(n => !n.isRead).length;
        return {
          success: true,
          data: unreadCount
        };
      }
      return {
        success: false,
        error: 'Failed to get unread count'
      };
    } catch (error) {
      console.error('Failed to get unread count:', error);
      return {
        success: false,
        error: 'Failed to get unread count'
      };
    }
  }

  async markNotificationAsRead(notificationId: string): Promise<ApiResponse<void>> {
    try {
      // In production, this would update the notification in the database
      console.log(`Marking notification ${notificationId} as read`);
      return {
        success: true
      };
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      return {
        success: false,
        error: 'Failed to mark notification as read'
      };
    }
  }

  formatNotificationForDisplay(notification: DashboardNotification): FormattedNotification {
    const typeConfig = {
      reminder: { color: '#FF9500', icon: 'notifications' },
      warning: { color: '#FF3B30', icon: 'warning' },
      info: { color: '#007AFF', icon: 'info' },
      success: { color: '#34C759', icon: 'check_circle' },
      error: { color: '#FF3B30', icon: 'error' }
    };

    const config = typeConfig[notification.type] || typeConfig.info;

    return {
      title: notification.title,
      message: notification.message,
      color: config.color,
      icon: config.icon,
      priority: notification.priority
    };
  }
}

export const dashboardNotificationService = new DashboardNotificationService(); 