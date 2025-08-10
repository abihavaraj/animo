import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { notificationService } from '../services/notificationService';
import { RootState } from '../store';

export const useUnreadNotifications = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useSelector((state: RootState) => state.auth);

  const loadUnreadCount = async () => {
    try {
      if (!user?.id) return;
      
      const response = await notificationService.getUserNotifications(user.id);
      if (response.success && response.data) {
        // Count notifications that are not marked as read
        const unread = response.data.filter((n: any) => !n.is_read).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error('Error loading unread notification count:', error);
    }
  };

  useEffect(() => {
    loadUnreadCount();
    
    // Refresh count every 30 seconds when user is active
    const interval = setInterval(loadUnreadCount, 30000);
    
    return () => clearInterval(interval);
  }, [user?.id]);

  const markAsRead = () => {
    setUnreadCount(0);
  };

  return { unreadCount, refreshUnreadCount: loadUnreadCount, markAsRead };
};
