import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { useSelector } from 'react-redux';
import { useThemeColor } from '../hooks/useDynamicThemeColor';
import { notificationService } from '../services/notificationService';
import { RootState } from '../store';

interface Notification {
  id: number;
  type: string;
  message: string;
  created_at: string;
  is_read?: boolean;
}

export default function NotificationsPreview() {
  const { t } = useTranslation();
  const { user } = useSelector((state: RootState) => state.auth);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // Theme colors
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const surfaceColor = useThemeColor({}, 'surface');
  const primaryColor = useThemeColor({}, 'primary');

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const response = await notificationService.getUserNotifications(user?.id || '');
      if (response.success && response.data) {
        // Show only the 3 most recent notifications
        const recentNotifications = (response.data as any[]).slice(0, 3);
        console.log('🔔 [NotificationsPreview] Loaded notifications:', recentNotifications);
        setNotifications(recentNotifications);
      } else {
        console.log('🔔 [NotificationsPreview] No notifications found');
        setNotifications([]);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    let iconName = 'notifications';
    
    switch (type) {
      case 'subscription_expiring':
        iconName = 'warning';
        break;
      case 'subscription_changed':
        iconName = 'card-membership';
        break;
      case 'reminder':
        iconName = 'schedule';
        break;
      case 'cancellation':
        iconName = 'event-busy';
        break;
      case 'update':
        iconName = 'update';
        break;
      case 'waitlist_promotion':
        iconName = 'queue';
        break;
      case 'waitlist_joined':
        iconName = 'queue';
        break;
      case 'class_booked':
        iconName = 'event-available';
        break;
      case 'class_cancelled_by_studio':
        iconName = 'event-busy';
        break;
      case 'instructor_change':
        iconName = 'swap-horiz';
        break;
      case 'class_time_change':
        iconName = 'schedule';
        break;
      case 'subscription_expired':
        iconName = 'error';
        break;
      case 'class_full':
        iconName = 'people';
        break;
      case 'waitlist_moved_up':
        iconName = 'trending-up';
        break;
      case 'class_reminder':
        iconName = 'alarm';
        break;
      case 'welcome':
        iconName = 'waving-hand';
        break;
      default:
        iconName = 'notifications';
    }
    
    console.log(`🔔 [NotificationsPreview] Icon for type "${type}": ${iconName}`);
    return iconName;
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'subscription_expiring':
        return '#FF6B6B';
      case 'subscription_changed':
        return '#4ECDC4';
      case 'reminder':
        return '#45B7D1';
      case 'cancellation':
        return '#96CEB4';
      case 'update':
        return '#FFEAA7';
      case 'waitlist_promotion':
        return '#DDA0DD';
      default:
        return '#45B7D1';
    }
  };

  const formatNotificationTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return t('common.justNow');
    if (diffInMinutes < 60) return `${diffInMinutes}m ${t('common.ago')}`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ${t('common.ago')}`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: textSecondaryColor }}>{t('common.loading')}...</Text>
      </View>
    );
  }

  if (notifications.length === 0) {
    return (
      <View style={styles.emptyState}>
        <MaterialIcons name="notifications-none" size={48} color={textSecondaryColor} />
        <Text style={[styles.emptyTitle, { color: textColor }]}>
          {t('notifications.noNotifications')}
        </Text>
        <Text style={[styles.emptyMessage, { color: textSecondaryColor }]}>
          {t('notifications.youWillSeeNotifications')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {notifications.map((notification) => (
        <Card 
          key={notification.id} 
          style={[
            styles.notificationCard, 
            { 
              backgroundColor: surfaceColor,
              borderLeftColor: getNotificationColor(notification.type),
              opacity: notification.is_read ? 0.7 : 1
            }
          ]}
        >
          <Card.Content style={styles.notificationContent}>
            <View style={styles.notificationHeader}>
               <View style={[styles.iconContainer, { backgroundColor: getNotificationColor(notification.type) + '20' }]}>
                 <MaterialIcons 
                   name={getNotificationIcon(notification.type)} 
                   size={24} 
                   color={getNotificationColor(notification.type)} 
                 />
                 {/* Fallback text if icon doesn't show */}
                 <Text style={{ 
                   position: 'absolute', 
                   fontSize: 10, 
                   color: getNotificationColor(notification.type),
                   fontWeight: 'bold'
                 }}>
                   {notification.type.charAt(0).toUpperCase()}
                 </Text>
               </View>
              <View style={styles.notificationText}>
                <Text style={[styles.notificationMessage, { color: textColor }]}>
                  {notification.message}
                </Text>
                <Text style={[styles.notificationTime, { color: textSecondaryColor }]}>
                  {formatNotificationTime(notification.created_at)}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  notificationCard: {
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  notificationContent: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  notificationText: {
    flex: 1,
  },
  notificationMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
  },
});
