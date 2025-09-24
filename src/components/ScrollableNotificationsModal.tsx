import { MaterialIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Appearance, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { ActivityIndicator, Card } from 'react-native-paper';
import { useSelector } from 'react-redux';
import { useTheme } from '../contexts/ThemeContext';
import { notificationService } from '../services/notificationService';
import { RootState } from '../store';

interface Notification {
  id: number;
  type: string;
  message: string;
  created_at: string;
  is_read?: boolean;
}

interface ScrollableNotificationsModalProps {
  visible: boolean;
  onDismiss: () => void;
  onNotificationRead?: () => void;
}

export default function ScrollableNotificationsModal({ visible, onDismiss, onNotificationRead }: ScrollableNotificationsModalProps) {
  const { t } = useTranslation();
  const { user } = useSelector((state: RootState) => state.auth);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [systemColorScheme, setSystemColorScheme] = useState(Appearance.getColorScheme() ?? 'light');

  // Theme colors
  const { themeColors } = useTheme();
  
  // Force system-based colors to override theme system
  const textColor = systemColorScheme === 'dark' ? '#FFFFFF' : '#000000';
  const textSecondaryColor = systemColorScheme === 'dark' ? '#CCCCCC' : '#666666';
  const surfaceColor = systemColorScheme === 'dark' ? '#2C2C2C' : '#FFFFFF';
  const primaryColor = themeColors.primary;
  const errorColor = themeColors.error;


  const ITEMS_PER_PAGE = 3;

  // Listen for color scheme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemColorScheme(colorScheme ?? 'light');
    });

    return () => subscription?.remove();
  }, [systemColorScheme]);

  useEffect(() => {
    if (visible) {
      loadNotifications(true);
    }
  }, [visible, user?.id]);

  const loadNotifications = async (reset = false) => {
    if (!user?.id) return;

    // Prevent loading if already loading
    if (loading || loadingMore) return;

    try {
      if (reset) {
        setLoading(true);
        setPage(0);
        setNotifications([]);
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }

      const response = await notificationService.getUserNotifications(user.id);
      if (response.success && response.data) {
        const allNotifications = response.data as any[];
        const currentPage = reset ? 0 : page;
        const startIndex = currentPage * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const newNotifications = allNotifications.slice(startIndex, endIndex);

        if (reset) {
          setNotifications(newNotifications);
        } else {
          setNotifications(prev => {
            // Filter out duplicates based on notification ID
            const existingIds = new Set(prev.map(n => n.id));
            const uniqueNewNotifications = newNotifications.filter(n => !existingIds.has(n.id));
            return [...prev, ...uniqueNewNotifications];
          });
        }

        // Call the callback to refresh notification count
        if (onNotificationRead) {
          onNotificationRead();
        }

        setPage(currentPage + 1);
        setHasMore(endIndex < allNotifications.length);
        
        console.log(`🔔 [ScrollableNotificationsModal] Loaded page ${currentPage + 1}, ${newNotifications.length} notifications. Total: ${allNotifications.length}, HasMore: ${endIndex < allNotifications.length}`);
      } else {
        if (reset) {
          setNotifications([]);
        }
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      if (reset) {
        setNotifications([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadNotifications(true).finally(() => setRefreshing(false));
  }, [user?.id]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      loadNotifications(false);
    }
  }, [loadingMore, hasMore, user?.id]);

  const getNotificationIcon = (type: string): any => {
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

  const renderNotification = ({ item }: { item: Notification }) => (
    <Card 
      style={[
        styles.notificationCard, 
        { 
          backgroundColor: surfaceColor,
          borderLeftColor: getNotificationColor(item.type),
          opacity: item.is_read ? 0.7 : 1
        }
      ]}
    >
      <Card.Content style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <View style={[styles.iconContainer, { backgroundColor: getNotificationColor(item.type) + '20' }]}>
            <MaterialIcons 
              name={getNotificationIcon(item.type)} 
              size={20} 
              color={getNotificationColor(item.type)} 
            />
            {/* Fallback text if icon doesn't show */}
            <Text style={{ 
              position: 'absolute', 
              fontSize: 10, 
              color: getNotificationColor(item.type),
              fontWeight: 'bold'
            }}>
              {item.type.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.notificationText}>
            <Text style={[styles.notificationMessage, { color: textColor }]}>
              {item.message}
            </Text>
            <Text style={[styles.notificationTime, { color: textSecondaryColor }]}>
              {formatNotificationTime(item.created_at)}
            </Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={primaryColor} />
        <Text style={[styles.loadingText, { color: textSecondaryColor }]}>
          {t('common.loading')}...
        </Text>
      </View>
    );
  };

  const renderEmpty = () => (
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={primaryColor} />
        <Text style={[styles.loadingText, { color: textSecondaryColor }]}>
          {t('common.loading')}...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: surfaceColor }]}>
      <FlatList
        data={notifications}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        renderItem={renderNotification}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[primaryColor]}
            tintColor={primaryColor}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  listContainer: {
    padding: 8,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
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
    marginBottom: 6,
  },
  notificationContent: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
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
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 8,
  },
});