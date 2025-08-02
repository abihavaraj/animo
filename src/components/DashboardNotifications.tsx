import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Badge, Button, Card, Chip, Dialog, IconButton, Portal } from 'react-native-paper';
import { Body, Caption, H3 } from '../../components/ui/Typography';
import { DashboardNotification, dashboardNotificationService } from '../services/dashboardNotificationService';
import WebCompatibleIcon from './WebCompatibleIcon';

interface DashboardNotificationsProps {
  refreshInterval?: number; // milliseconds
  showBadgeOnly?: boolean;
}

const DashboardNotifications: React.FC<DashboardNotificationsProps> = ({
  refreshInterval = 60000, // 1 minute default
  showBadgeOnly = false
}) => {
  const [notifications, setNotifications] = useState<DashboardNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);

  // Load pending notifications
  const loadNotifications = async () => {
    try {
      setLoading(true);
      console.log('🔔 Loading dashboard notifications...');
      
      const result = await dashboardNotificationService.getPendingNotifications();
      if (result.success && result.data) {
        setNotifications(result.data);
        console.log(`🔔 Found ${result.data.length} pending notifications`);
      }

      // Get unread count
      const countResult = await dashboardNotificationService.getUnreadCount();
      if (countResult.success) {
        setUnreadCount(countResult.data || 0);
      }
    } catch (error) {
      console.error('❌ Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      await dashboardNotificationService.markNotificationAsRead(notificationId);
      await loadNotifications(); // Refresh
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
    }
  };

  // Auto-refresh notifications
  useEffect(() => {
    loadNotifications();
    
    const interval = setInterval(() => {
      loadNotifications();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  // Show badge only mode
  if (showBadgeOnly) {
    return (
      <View style={styles.badgeContainer}>
        <IconButton
          icon="notifications"
          size={24}
          onPress={() => setDialogVisible(true)}
          style={styles.notificationButton}
        />
        {unreadCount > 0 && (
          <Badge style={styles.badge} size={20}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
        
        {/* Notification Dialog */}
        <Portal>
          <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
            <Dialog.Title>🔔 Dashboard Notifications</Dialog.Title>
            <Dialog.Content>
              {notifications.length === 0 ? (
                <View style={styles.emptyState}>
                  <WebCompatibleIcon name="notifications-none" size={48} color="#ccc" />
                  <Body style={styles.emptyText}>No pending notifications</Body>
                </View>
              ) : (
                notifications.map((notification) => {
                  const formatted = dashboardNotificationService.formatNotificationForDisplay(notification);
                  return (
                    <Card key={notification.id} style={[styles.notificationCard, { borderLeftColor: formatted.color }]}>
                      <Card.Content style={styles.cardContent}>
                        <View style={styles.notificationHeader}>
                          <WebCompatibleIcon name={formatted.icon} size={20} color={formatted.color} />
                          <H3 style={{...styles.notificationTitle, color: formatted.color}}>
                            {formatted.title}
                          </H3>
                          <Chip
                            mode="outlined"
                            style={[styles.priorityChip, { borderColor: formatted.color }]}
                            textStyle={{ color: formatted.color }}
                          >
                            {formatted.priority}
                          </Chip>
                        </View>
                        <Body style={styles.notificationMessage}>{formatted.message}</Body>
                        <View style={styles.notificationFooter}>
                          <Caption style={styles.notificationTime}>
                            Created: {new Date(notification.createdAt).toLocaleString()}
                          </Caption>
                          <Button
                            mode="outlined"
                            onPress={() => markAsRead(notification.id)}
                            style={styles.markReadButton}
                          >
                            Mark Read
                          </Button>
                        </View>
                      </Card.Content>
                    </Card>
                  );
                })
              )}
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setDialogVisible(false)}>Close</Button>
              <Button onPress={loadNotifications} loading={loading}>Refresh</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </View>
    );
  }

  // Full notification list mode
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <H3 style={styles.headerTitle}>📅 Upcoming Reminders</H3>
        <Button mode="outlined" onPress={loadNotifications} loading={loading} icon="refresh">
          Refresh
        </Button>
      </View>

      {notifications.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Card.Content style={styles.emptyState}>
            <WebCompatibleIcon name="notifications-none" size={64} color="#ccc" />
            <H3 style={styles.emptyTitle}>No Pending Notifications</H3>
            <Body style={styles.emptyText}>
              All reminders are up to date. New reminders will appear here when their scheduled time approaches.
            </Body>
          </Card.Content>
        </Card>
      ) : (
        notifications.map((notification) => {
          const formatted = dashboardNotificationService.formatNotificationForDisplay(notification);
          return (
            <Card key={notification.id} style={[styles.notificationCard, { borderLeftColor: formatted.color }]}>
              <Card.Content style={styles.cardContent}>
                <View style={styles.notificationHeader}>
                  <WebCompatibleIcon name={formatted.icon} size={24} color={formatted.color} />
                  <View style={styles.notificationInfo}>
                    <H3 style={styles.notificationTitle}>{formatted.title}</H3>
                    <Body style={styles.notificationMessage}>{formatted.message}</Body>
                  </View>
                  <Chip
                    mode="outlined"
                    style={[styles.priorityChip, { borderColor: formatted.color }]}
                    textStyle={{ color: formatted.color }}
                  >
                    {formatted.priority.toUpperCase()}
                  </Chip>
                </View>
                <View style={styles.notificationFooter}>
                  <Caption style={styles.notificationTime}>
                    ⏰ Created: {new Date(notification.createdAt).toLocaleString()}
                  </Caption>
                  <Button
                    mode="contained"
                    onPress={() => markAsRead(notification.id)}
                    style={[styles.markReadButton, { backgroundColor: formatted.color }]}
                  >
                    Mark as Complete
                  </Button>
                </View>
              </Card.Content>
            </Card>
          );
        })
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  badgeContainer: {
    position: 'relative',
  },
  notificationButton: {
    margin: 0,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#f44336',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  notificationCard: {
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  cardContent: {
    padding: 16,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  notificationInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  priorityChip: {
    borderRadius: 12,
  },
  notificationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  notificationTime: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  markReadButton: {
    borderRadius: 20,
  },
  emptyCard: {
    marginVertical: 20,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
  },
});

export default DashboardNotifications; 