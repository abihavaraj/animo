import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { useSelector } from 'react-redux';
import { notificationService } from '../../services/notificationService';
import { RootState } from '../../store';
import { formatDetailedTime, formatLocalTime, formatUTCToLocal, isUTCFormat } from '../../utils/timeUtils';

interface Notification {
  id: number;
  type: 'reminder' | 'cancellation' | 'update' | 'waitlist_promotion' | 'subscription_expiring' | 'subscription_changed';
  message: string;
  scheduled_time: string;
  sent: boolean;
  sent_at?: string;
  created_at: string;
  class_name?: string;
  class_date?: string;
  class_time?: string;
}

export default function NotificationsView() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const response = await notificationService.getUserNotifications(parseInt(user?.id || '0'));
      if (response.success && response.data) {
        setNotifications(response.data as any[]);
      } else {
        setNotifications([]);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      Alert.alert('Error', 'Failed to load notifications');
      setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'subscription_expiring':
        return 'schedule';
      case 'subscription_changed':
        return 'card-membership';
      case 'reminder':
        return 'notifications';
      case 'cancellation':
        return 'cancel';
      case 'update':
        return 'update';
      case 'waitlist_promotion':
        return 'trending-up';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'subscription_expiring':
        return '#FF6B6B'; // Red for urgent
      case 'subscription_changed':
        return '#4ECDC4'; // Teal for subscription updates
      case 'reminder':
        return '#45B7D1'; // Blue for reminders
      case 'cancellation':
        return '#96CEB4'; // Light green for cancellations
      case 'update':
        return '#FFEAA7'; // Yellow for updates
      case 'waitlist_promotion':
        return '#DDA0DD'; // Purple for promotions
      default:
        return '#45B7D1';
    }
  };

  const formatNotificationTime = (timestamp: string) => {
    // Check if timestamp is in UTC format and convert accordingly
    if (isUTCFormat(timestamp)) {
      return formatUTCToLocal(timestamp);
    } else {
      return formatLocalTime(timestamp);
    }
  };

  const getNotificationTitle = (type: string) => {
    switch (type) {
      case 'subscription_expiring':
        return 'Subscription Expiring';
      case 'subscription_changed':
        return 'Subscription Updated';
      case 'reminder':
        return 'Class Reminder';
      case 'cancellation':
        return 'Class Cancelled';
      case 'update':
        return 'Class Update';
      case 'waitlist_promotion':
        return 'Waitlist Update';
      default:
        return 'Notification';
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <View style={[styles.notificationCard, { borderLeftColor: getNotificationColor(item.type) }]}>
      <View style={styles.notificationHeader}>
        <View style={styles.iconContainer}>
          <MaterialIcons 
            name={getNotificationIcon(item.type)} 
            size={24} 
            color={getNotificationColor(item.type)} 
          />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.notificationTitle}>
            {getNotificationTitle(item.type)}
          </Text>
          <Text style={styles.notificationTime}>
            {formatNotificationTime(item.created_at)}
          </Text>
          {/* Show scheduled time if it exists and is different from created_at */}
          {item.scheduled_time && item.scheduled_time !== item.created_at && (
            <Text style={styles.scheduledTime}>
              Scheduled: {formatDetailedTime(item.scheduled_time, isUTCFormat(item.scheduled_time))}
            </Text>
          )}
        </View>
        {!item.sent && (
          <View style={styles.unreadDot} />
        )}
      </View>
      
      <Text style={styles.notificationMessage}>
        {item.message}
      </Text>
      
      {item.class_name && (
        <View style={styles.classInfo}>
          <MaterialIcons name="fitness-center" size={16} color="#666" />
          <Text style={styles.className}>
            {`${item.class_name} - ${item.class_date} at ${item.class_time}`}
          </Text>
        </View>
      )}
    </View>
  );

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="notifications-none" size={80} color="#ccc" />
      <Text style={styles.emptyTitle}>No Notifications</Text>
      <Text style={styles.emptyMessage}>
        You&apos;ll see notifications about your classes and subscription here
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading notifications...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Notifications</Text>
        <Text style={styles.subtitle}>
          Stay updated with your classes and subscription
        </Text>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderNotification}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : styles.listContainer}
        ListEmptyComponent={EmptyState}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  notificationTime: {
    fontSize: 12,
    color: '#666',
  },
  scheduledTime: {
    fontSize: 11,
    color: '#888',
    fontStyle: 'italic',
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B6B',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 8,
  },
  classInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 6,
  },
  className: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
}); 