import { MaterialIcons } from '@expo/vector-icons';
import { createStackNavigator } from '@react-navigation/stack';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { Divider, Modal, Button as PaperButton, Card as PaperCard, Portal, Switch, TextInput } from 'react-native-paper';
import { useDispatch } from 'react-redux';
import ClassLoadingMetrics from '../components/ClassLoadingMetrics';
import ClientProfile from '../screens/admin/ClientProfile';
import PCClassManagement from '../screens/admin/PCClassManagement';
import PCSubscriptionPlans from '../screens/admin/PCSubscriptionPlans';
import PCUserManagement from '../screens/admin/PCUserManagement';
import ReceptionReports from '../screens/ReceptionReports';
import { apiService } from '../services/api';
import { notificationService, NotificationSettings } from '../services/notificationService';
import { logout } from '../store/authSlice';

const Stack = createStackNavigator();

// PC-Optimized Reception Dashboard
function ReceptionDashboard({ navigation, onNavigate, onStatsUpdate }: any) {
  const [stats, setStats] = useState({
    totalClients: 0,
    todayClasses: 0,
    pendingBookings: 0,
    activeSubscriptions: 0
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [allActivities, setAllActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searching, setSearching] = useState(false);
  
  // Activity filtering states
  const [activitySearchQuery, setActivitySearchQuery] = useState('');
  const [activityTypeFilter, setActivityTypeFilter] = useState('all');
  const [activityTimeFilter, setActivityTimeFilter] = useState('recent');
  const [filteredActivity, setFilteredActivity] = useState<any[]>([]);
  const [showAllActivitiesModal, setShowAllActivitiesModal] = useState(false);
  const [refreshingActivities, setRefreshingActivities] = useState(false);

  // Class metrics state
  const [showClassMetrics, setShowClassMetrics] = useState(true);
  const [classMetricsExpanded, setClassMetricsExpanded] = useState(false);

  useEffect(() => {
    loadDashboardData();
    
    // Set up auto-refresh every 2 minutes to keep activities current
    const interval = setInterval(() => {
      loadDashboardData();
    }, 2 * 60 * 1000); // 2 minutes

    return () => clearInterval(interval);
  }, []);

  // Filter activities based on search query, type filter, and time filter
  useEffect(() => {
    let filtered = [...allActivities];

    // Apply time filter first
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
    const oneWeekAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (activityTimeFilter) {
      case 'recent':
        filtered = filtered.filter(activity => new Date(activity.created_at) > oneDayAgo);
        break;
      case 'today':
        filtered = filtered.filter(activity => new Date(activity.created_at) > todayStart);
        break;
      case 'week':
        filtered = filtered.filter(activity => new Date(activity.created_at) > oneWeekAgo);
        break;
      case 'all':
        // Show all activities
        break;
    }

    // Apply text search filter
    if (activitySearchQuery.trim()) {
      const query = activitySearchQuery.toLowerCase();
      filtered = filtered.filter(activity => 
        activity.text.toLowerCase().includes(query) ||
        activity.type.toLowerCase().includes(query)
      );
    }

    // Apply type filter
    if (activityTypeFilter !== 'all') {
      filtered = filtered.filter(activity => activity.type === activityTypeFilter);
    }

    // Sort by creation time (newest first) and update display
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setFilteredActivity(filtered);
    setRecentActivity(filtered.slice(0, 20)); // Keep recent activity as top 20 for main view
  }, [allActivities, activitySearchQuery, activityTypeFilter, activityTimeFilter]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load user statistics
      const userStatsResponse = await apiService.get('/users/stats');
      
      if (userStatsResponse.success && userStatsResponse.data) {
        const userStats = userStatsResponse.data;
        
        // Load today's classes
        const today = new Date().toISOString().split('T')[0];
        const classesResponse = await apiService.get(`/classes?date=${today}`);
        const todayClassesCount = classesResponse.success && classesResponse.data && Array.isArray(classesResponse.data) ? 
          classesResponse.data.length : 0;

        // Load recent bookings (pending ones)
        const bookingsResponse = await apiService.get('/bookings');
        const pendingBookings = bookingsResponse.success && bookingsResponse.data && Array.isArray(bookingsResponse.data) ?
          bookingsResponse.data.filter((booking: any) => booking.status === 'pending').length : 0;

        const newStats = {
          totalClients: (userStats as any)?.clients || 0,
          todayClasses: todayClassesCount,
          pendingBookings: pendingBookings,
          activeSubscriptions: (userStats as any)?.activeSubscriptions || 0
        };

        setStats(newStats);
        
        // Update parent component stats for sidebar badges
        if (onStatsUpdate) {
          onStatsUpdate(newStats);
        }
      }

      // Load recent activity from multiple sources efficiently
      interface ActivityItem {
        id: string;
        text: string;
        time: string;
        type: string;
        icon: string;
        color: string;
        read: boolean;
        created_at: string;
        clientId?: string;
        noteId?: string;
        message?: string;
      }
      const activity: ActivityItem[] = [];
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));

      // Helper function to check if date is within last 24 hours
      const isRecent = (dateString: string) => {
        const date = new Date(dateString);
        return date > oneDayAgo;
      };

      // Load all data in parallel for better performance
      const [recentUsersResponse, recentBookingsResponse, paymentsResponse, remindersResponse, recentActivityResponse] = await Promise.all([
        apiService.get('/users?role=client'),
        apiService.get('/bookings'),
        apiService.get('/payments'),
        apiService.get('/client-notes/reminders'),
        apiService.get('/client-activity/recent?limit=50&type=profile_update')
      ]);

      // Process recent user registrations
      if (recentUsersResponse.success && recentUsersResponse.data && Array.isArray(recentUsersResponse.data)) {
        const recentUsers = recentUsersResponse.data.filter((user: any) => isRecent(user.created_at));
        recentUsers.forEach((user: any) => {
          activity.push({
            id: `user-${user.id}`,
            text: `New client registration: ${user.name}`,
            time: getTimeAgo(new Date(user.created_at)),
            type: 'client',
            icon: 'person-add',
            color: '#4CAF50',
            read: false,
            created_at: user.created_at
          });
        });
      }

      // Process recent bookings
      if (recentBookingsResponse.success && recentBookingsResponse.data && Array.isArray(recentBookingsResponse.data)) {
        const recentBookings = recentBookingsResponse.data.filter((booking: any) => isRecent(booking.created_at));
        recentBookings.forEach((booking: any) => {
          activity.push({
            id: `booking-${booking.id}`,
            text: `Booking: ${booking.user_name} → ${booking.class_name}`,
            time: getTimeAgo(new Date(booking.created_at)),
            type: 'booking',
            icon: 'event',
            color: '#2196F3',
            read: false,
            created_at: booking.created_at
          });
        });

        // Process class cancellations from the same data
        const cancelledBookings = recentBookingsResponse.data.filter((booking: any) => 
          booking.status === 'cancelled' && isRecent(booking.updated_at)
        );
        cancelledBookings.forEach((booking: any) => {
          activity.push({
            id: `cancellation-${booking.id}`,
            text: `Class cancelled: ${booking.class_name} by ${booking.user_name}`,
            time: getTimeAgo(new Date(booking.updated_at)),
            type: 'cancellation',
            icon: 'event-busy',
            color: '#F44336',
            read: false,
            created_at: booking.updated_at
          });
        });
      }

      // Process recent payments
      if (paymentsResponse.success && paymentsResponse.data && Array.isArray(paymentsResponse.data)) {
        const recentPayments = paymentsResponse.data.filter((payment: any) => isRecent(payment.created_at));
        recentPayments.forEach((payment: any) => {
          activity.push({
            id: `payment-${payment.id}`,
            text: `Payment received: $${payment.amount} from ${payment.user_name}`,
            time: getTimeAgo(new Date(payment.created_at)),
            type: 'payment',
            icon: 'payment',
            color: '#FF9800',
            read: false,
            created_at: payment.created_at
          });
        });
      }

      // Process client note reminders
      if (remindersResponse.success && remindersResponse.data && Array.isArray(remindersResponse.data)) {
        const dueReminders = remindersResponse.data.filter((note: any) => 
          note.reminder_at && 
          new Date(note.reminder_at) <= now &&
          !note.reminder_sent
        );
        dueReminders.forEach((reminder: any) => {
          activity.push({
            id: `reminder-${reminder.id}`,
            text: `Reminder: ${reminder.title} - ${reminder.client_name}`,
            time: getTimeAgo(new Date(reminder.reminder_at)),
                      type: 'reminder',
            icon: 'notifications',
            color: '#FF9800',
            read: false,
            clientId: reminder.client_id,
            noteId: reminder.id,
            message: reminder.reminder_message,
            created_at: reminder.reminder_at
          });
        });
      }

      // Process recent profile updates
      if (recentActivityResponse.success && recentActivityResponse.data && Array.isArray(recentActivityResponse.data)) {
        const recentProfileUpdates = recentActivityResponse.data.filter((activity: any) => 
          activity.activity_type === 'profile_update' && isRecent(activity.created_at)
        );
        recentProfileUpdates.forEach((activity: any) => {
          activity.push({
            id: `profile-update-${activity.id}`,
            text: `Profile updated: ${activity.client_name} - ${activity.description}`,
            time: getTimeAgo(new Date(activity.created_at)),
            type: 'profile_update',
            icon: 'account-edit',
            color: '#9C27B0',
            read: false,
            clientId: activity.client_id,
            created_at: activity.created_at
          });
        });
      }

      // Merge new activities with existing ones, avoiding duplicates
      const existingIds = new Set(allActivities.map(a => a.id));
      const newActivities = activity.filter(a => !existingIds.has(a.id));
      
      // Combine existing and new activities
      const combinedActivities = [...allActivities, ...newActivities];
      
      // Sort all activities by creation date (most recent first)
      combinedActivities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      // Update times for all activities (in case some are old and need refreshed time display)
      const updatedActivities = combinedActivities.map(activity => ({
        ...activity,
        time: getTimeAgo(activity.created_at)
      }));

      // Keep only last 500 activities to prevent memory issues
      const limitedActivities = updatedActivities.slice(0, 500);
      
      setAllActivities(limitedActivities);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (dateInput: Date | string): string => {
    // Handle both Date objects and string inputs
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    const now = new Date();
    
    // Ensure we have valid dates
    if (isNaN(date.getTime())) {
      return 'Unknown time';
    }
    
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMs < 0) {
      // Future date - this shouldn't happen for activities
      return 'In the future';
    }

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    
    // For older items, show the actual date
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Helper function to convert time ago string to minutes for proper sorting
  const getMinutesFromTimeAgo = (timeAgo: string): number => {
    if (timeAgo === 'Just now') return 0;
    const match = timeAgo.match(/(\d+)\s+(minute|hour|day)/);
    if (!match) return 999;
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    if (unit === 'minute') return value;
    if (unit === 'hour') return value * 60;
    if (unit === 'day') return value * 60 * 24;
    return 999;
  };

  const handleSearchClients = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const response = await apiService.get(`/users?role=client&search=${encodeURIComponent(searchQuery.trim())}`);
      
      if (response.success && response.data && Array.isArray(response.data)) {
        setSearchResults(response.data);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching clients:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleClientSelect = (client: any) => {
    setSearchModalVisible(false);
    setSearchQuery('');
    setSearchResults([]);
    // Navigate to client profile
    navigation.navigate('ClientProfile', { userId: client.id, userName: client.name });
  };

  // Handle activity item click - different actions based on activity type
  const handleActivityClick = async (activity: any) => {
    console.log('🎯 Activity clicked:', activity.type, activity);
    
    try {
      switch (activity.type) {
        case 'client':
          // Navigate to client profile for new registrations
          const clientMatch = activity.text.match(/New client registration: (.+)/);
          if (clientMatch) {
            const clientName = clientMatch[1];
            // We need to get the client ID from the backend
            const searchResponse = await apiService.get(`/users?role=client&search=${encodeURIComponent(clientName)}`);
            if (searchResponse.success && searchResponse.data && Array.isArray(searchResponse.data) && searchResponse.data.length > 0) {
              const client = searchResponse.data.find((c: any) => c.name === clientName) || searchResponse.data[0];
              navigation.navigate('ClientProfile', { userId: client.id, userName: client.name });
            }
          }
          break;

        case 'booking':
          // Navigate to class management for bookings
          onNavigate('Classes');
          break;

        case 'payment':
          // For payments, could navigate to payment details or client profile
          const paymentMatch = activity.text.match(/Payment received: \$[\d.]+ from (.+)/);
          if (paymentMatch) {
            const clientName = paymentMatch[1];
            const searchResponse = await apiService.get(`/users?role=client&search=${encodeURIComponent(clientName)}`);
            if (searchResponse.success && searchResponse.data && Array.isArray(searchResponse.data) && searchResponse.data.length > 0) {
              const client = searchResponse.data.find((c: any) => c.name === clientName) || searchResponse.data[0];
              navigation.navigate('ClientProfile', { userId: client.id, userName: client.name });
            }
          }
          break;

        case 'reminder':
          // Handle reminders - mark as handled and navigate to client
          if (activity.clientId && activity.noteId) {
            try {
              await apiService.put(`/notifications/reminder/${activity.noteId}/handle`);
              console.log('✅ Reminder marked as handled');
            } catch (error) {
              console.error('❌ Error handling reminder:', error);
            }
            
            const clientName = activity.text.split(' - ')[1];
            navigation.navigate('ClientProfile', { 
              userId: activity.clientId, 
              userName: clientName 
            });
          }
          break;

        case 'profile_update':
          // Navigate to client profile for profile updates
          if (activity.clientId) {
            const clientName = activity.text.split(' - ')[1];
            navigation.navigate('ClientProfile', { 
              userId: activity.clientId, 
              userName: clientName 
            });
          }
          break;

        case 'cancellation':
          // Navigate to class management for cancellations
          onNavigate('Classes');
          break;

        default:
          console.log('No specific action for activity type:', activity.type);
      }
    } catch (error) {
      console.error('Error handling activity click:', error);
    }
  };

  // Manual refresh function with loading indicator
  const handleManualRefresh = async () => {
    setRefreshingActivities(true);
    try {
      await loadDashboardData();
    } catch (error) {
      console.error('Error refreshing activities:', error);
    } finally {
      setRefreshingActivities(false);
    }
  };

  const quickActions = [
    {
      title: 'Create New Client',
      icon: 'person-add',
      action: () => onNavigate('Clients'),
      color: '#4CAF50'
    },
    {
      title: 'Schedule Class',
      icon: 'event',
      action: () => onNavigate('Classes'),
      color: '#2196F3'
    },
    {
      title: 'Manage Plans',
      icon: 'card-membership',
      action: () => onNavigate('Plans'),
      color: '#FF9800'
    },
    {
      title: 'View Client Profiles',
      icon: 'person',
      action: () => onNavigate('Clients'),
      color: '#9C27B0'
    }
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9B8A7D" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.dashboardContainer}>
      {/* PC-Optimized Reception Dashboard - Designed for Desktop Use */}
      <ScrollView 
        style={styles.dashboardScrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={true}  // PC-style: always show scroll bar
        showsHorizontalScrollIndicator={false}
        bounces={false}  // PC-style: no bounce effect like mobile
        alwaysBounceVertical={false}  // PC-style: standard desktop scrolling
        keyboardShouldPersistTaps="handled"  // PC-style: better keyboard integration
        scrollEventThrottle={16}  // PC-style: responsive mouse wheel scrolling (optimized)
        nestedScrollEnabled={false}
        indicatorStyle="black"  // PC-style: visible scroll indicator
        scrollIndicatorInsets={{ right: 4 }}  // PC-style: enhanced space for scroll bar visibility
        automaticallyAdjustContentInsets={false}
        decelerationRate="normal"  // PC-style: less momentum, more control
        snapToAlignment="start"
        // Temporarily removed refresh control to test basic scrolling
        // refreshControl={
        //   <RefreshControl
        //     refreshing={refreshingActivities}
        //     onRefresh={handleManualRefresh}
        //     colors={['#9B8A7D']}
        //     tintColor="#9B8A7D"
        //     title="Pull to refresh activities"
        //     titleColor="#9B8A7D"
        //     progressBackgroundColor="#ffffff"
        //   />
        // }
      >
      <View style={styles.dashboardHeader}>
        <Text style={styles.welcomeText}>Welcome to Reception Portal</Text>
        <Text style={styles.dateText}>{new Date().toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}</Text>
      </View>

      {/* Enhanced Client Search Bar */}
      <View style={styles.searchSection}>
        <Text style={styles.searchTitle}>Quick Client Search</Text>
        <View style={styles.searchContainer}>
          <TextInput
            placeholder="Search clients by name or email..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            mode="outlined"
            left={<TextInput.Icon icon="magnify" color="#9B8A7D" />}
            right={
              searchQuery.length > 0 ? (
                <TextInput.Icon 
                  icon="close" 
                  color="#9B8A7D"
                  onPress={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                />
              ) : undefined
            }
            onSubmitEditing={handleSearchClients}
            theme={{
              colors: {
                primary: '#9B8A7D',
                placeholder: '#999'
              }
            }}
          />
          <TouchableOpacity 
            style={[styles.searchButton, searching && styles.searchButtonDisabled]}
            onPress={handleSearchClients}
            disabled={searching}
          >
            <MaterialIcons 
              name={searching ? "hourglass-empty" : "search"} 
              size={20} 
              color="#fff" 
            />
          </TouchableOpacity>
        </View>
        {searchResults.length > 0 && (
          <View style={styles.searchResults}>
            <View style={styles.searchResultsHeader}>
              <Text style={styles.searchResultsTitle}>
                Found {searchResults.length} client{searchResults.length !== 1 ? 's' : ''}
              </Text>
            </View>
            {searchResults.map((client, index) => (
              <TouchableOpacity
                key={client.id || index}
                style={styles.searchResultItem}
                onPress={() => handleClientSelect(client)}
              >
                <View style={styles.searchResultAvatar}>
                  <MaterialIcons name="person" size={24} color="#9B8A7D" />
                </View>
                <View style={styles.searchResultInfo}>
                  <Text style={styles.searchResultName}>{client.name}</Text>
                  <Text style={styles.searchResultEmail}>{client.email}</Text>
                  <Text style={styles.searchResultStatus}>
                    {client.status === 'active' ? '● Active' : '○ Inactive'}
                  </Text>
                </View>
                <MaterialIcons name="arrow-forward" size={20} color="#9B8A7D" />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <MaterialIcons name="people" size={32} color="#4CAF50" />
          <Text style={styles.statNumber}>{stats.totalClients}</Text>
          <Text style={styles.statLabel}>Total Clients</Text>
        </View>
        <View style={styles.statCard}>
          <MaterialIcons name="fitness-center" size={32} color="#2196F3" />
          <Text style={styles.statNumber}>{stats.todayClasses}</Text>
          <Text style={styles.statLabel}>Today&apos;s Classes</Text>
        </View>
        <View style={styles.statCard}>
          <MaterialIcons name="schedule" size={32} color="#FF9800" />
          <Text style={styles.statNumber}>{stats.pendingBookings}</Text>
          <Text style={styles.statLabel}>Pending Bookings</Text>
        </View>
        <View style={styles.statCard}>
          <MaterialIcons name="card-membership" size={32} color="#9C27B0" />
          <Text style={styles.statNumber}>{stats.activeSubscriptions}</Text>
          <Text style={styles.statLabel}>Active Plans</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActionsSection}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          {quickActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.quickActionCard, { borderLeftColor: action.color }]}
              onPress={action.action}
            >
              <MaterialIcons name={action.icon as any} size={24} color={action.color} />
              <Text style={styles.quickActionText}>{action.title}</Text>
              <MaterialIcons name="arrow-forward" size={16} color="#666" />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Class Loading Metrics - New Section */}
      {showClassMetrics && (
        <View style={styles.classMetricsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📊 Class Loading Status</Text>
            <View style={styles.metricsControls}>
              <TouchableOpacity
                style={styles.expandButton}
                onPress={() => setClassMetricsExpanded(!classMetricsExpanded)}
              >
                <MaterialIcons 
                  name={classMetricsExpanded ? "expand-less" : "expand-more"} 
                  size={20} 
                  color="#9B8A7D" 
                />
                <Text style={styles.expandButtonText}>
                  {classMetricsExpanded ? 'Collapse' : 'Expand'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.hideMetricsButton}
                onPress={() => setShowClassMetrics(false)}
              >
                <MaterialIcons name="visibility-off" size={16} color="#666" />
                <Text style={styles.hideMetricsText}>Hide</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={[
            styles.classMetricsContainer, 
            classMetricsExpanded ? styles.classMetricsExpanded : styles.classMetricsCollapsed
          ]}>
            <ClassLoadingMetrics 
              period="day"
              onClassSelect={(classId: number) => {
                // Navigate to class management when a class is selected
                console.log('Selected class:', classId);
                onNavigate('Classes');
              }}
            />
          </View>
          
          {!classMetricsExpanded && (
            <TouchableOpacity
              style={styles.viewAllClassesButton}
              onPress={() => setClassMetricsExpanded(true)}
            >
              <Text style={styles.viewAllClassesText}>
                View detailed class metrics →
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Show metrics button when hidden */}
      {!showClassMetrics && (
        <View style={styles.hiddenMetricsSection}>
          <TouchableOpacity
            style={styles.showMetricsButton}
            onPress={() => setShowClassMetrics(true)}
          >
            <MaterialIcons name="analytics" size={20} color="#9B8A7D" />
            <Text style={styles.showMetricsButtonText}>Show Class Loading Metrics</Text>
            <MaterialIcons name="visibility" size={16} color="#9B8A7D" />
          </TouchableOpacity>
        </View>
      )}

      {/* Enhanced Recent Activity */}
      <View style={styles.recentActivitySection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.activityControls}>
            <TouchableOpacity 
              style={[styles.refreshButton, refreshingActivities && styles.refreshButtonDisabled]}
              onPress={handleManualRefresh}
              disabled={refreshingActivities}
            >
              <MaterialIcons 
                name={refreshingActivities ? "hourglass-empty" : "refresh"} 
                size={20} 
                color={refreshingActivities ? "#9CA3AF" : "#9B8A7D"} 
              />
              <Text style={[styles.refreshText, refreshingActivities && styles.refreshTextDisabled]}>
                {refreshingActivities ? 'Refreshing...' : 'Refresh'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.activityCount}>
              {filteredActivity.length} of {allActivities.length} activities
            </Text>
          </View>
        </View>

        {/* Activity Search and Filter Controls */}
        <View style={styles.activityFilters}>
          <View style={styles.activitySearchContainer}>
            <TextInput
              placeholder="Search activity..."
              value={activitySearchQuery}
              onChangeText={setActivitySearchQuery}
              style={styles.activitySearchInput}
              mode="outlined"
              left={<TextInput.Icon icon="magnify" color="#9B8A7D" />}
              right={
                activitySearchQuery.length > 0 ? (
                  <TextInput.Icon 
                    icon="close" 
                    color="#9B8A7D"
                    onPress={() => setActivitySearchQuery('')}
                  />
                ) : undefined
              }
              theme={{
                colors: {
                  primary: '#9B8A7D',
                  placeholder: '#999'
                }
              }}
            />
          </View>
          <View style={styles.activityTypeFilter}>
            <Text style={styles.filterLabel}>Type:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterButtons}>
              {['all', 'client', 'booking', 'payment', 'reminder', 'cancellation'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.filterButton,
                    activityTypeFilter === type && styles.filterButtonActive
                  ]}
                  onPress={() => setActivityTypeFilter(type)}
                >
                  <Text style={[
                    styles.filterButtonText,
                    activityTypeFilter === type && styles.filterButtonTextActive
                  ]}>
                    {type === 'all' ? 'All' : 
                     type === 'client' ? '👤 Clients' :
                     type === 'booking' ? '📅 Bookings' :
                     type === 'payment' ? '💳 Payments' :
                     type === 'reminder' ? '🔔 Reminders' :
                     type === 'cancellation' ? '❌ Cancellations' : type}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          
          <View style={styles.activityTimeFilter}>
            <Text style={styles.filterLabel}>Time:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterButtons}>
              {['recent', 'today', 'week', 'all'].map((timeFilter) => (
                <TouchableOpacity
                  key={timeFilter}
                  style={[
                    styles.filterButton,
                    activityTimeFilter === timeFilter && styles.filterButtonActive
                  ]}
                  onPress={() => setActivityTimeFilter(timeFilter)}
                >
                  <Text style={[
                    styles.filterButtonText,
                    activityTimeFilter === timeFilter && styles.filterButtonTextActive
                  ]}>
                    {timeFilter === 'recent' ? '⏰ Recent (24h)' : 
                     timeFilter === 'today' ? '📅 Today' :
                     timeFilter === 'week' ? '📊 This Week' :
                     timeFilter === 'all' ? '🗂️ All Time' : timeFilter}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          
          <View style={styles.activityActions}>
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => setShowAllActivitiesModal(true)}
            >
              <MaterialIcons name="list" size={16} color="#9B8A7D" />
              <Text style={styles.viewAllButtonText}>View All Activities</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.activityList}>
          {filteredActivity.length > 0 ? (
            filteredActivity.map((activity, index) => (
              <TouchableOpacity 
                key={activity.id || index} 
                style={styles.activityItem}
                onPress={() => handleActivityClick(activity)}
              >
                <View style={[styles.activityIcon, { backgroundColor: `${activity.color}20` }]}>
                  <MaterialIcons name={activity.icon as any} size={20} color={activity.color} />
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityText}>{activity.text}</Text>
                  <View style={styles.activityMeta}>
                    <View style={[styles.activityType, { backgroundColor: `${activity.color}20` }]}>
                      <Text style={[styles.activityTypeText, { color: activity.color }]}>
                        {activity.type === 'reminder' ? '🔔 Reminder' : 
                         activity.type === 'payment' ? '💳 Payment' :
                         activity.type === 'client' ? '👤 New Client' :
                         activity.type === 'booking' ? '📅 Booking' :
                         activity.type === 'cancellation' ? '❌ Cancellation' : activity.type}
                      </Text>
                    </View>
                    <Text style={styles.activityTime}>{activity.time}</Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={16} color="#9B8A7D" />
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyActivity}>
              <MaterialIcons name="schedule" size={48} color="#9B8A7D" />
              <Text style={styles.emptyActivityText}>No recent activity</Text>
              <Text style={styles.emptyActivitySubtext}>
                Activities will appear here as they happen
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* All Activities Modal */}
      <Portal>
        <Modal
          visible={showAllActivitiesModal}
          onDismiss={() => setShowAllActivitiesModal(false)}
          contentContainerStyle={styles.allActivitiesModal}
        >
          <View style={styles.allActivitiesHeader}>
            <Text style={styles.allActivitiesTitle}>All Activities</Text>
            <TouchableOpacity
              onPress={() => setShowAllActivitiesModal(false)}
              style={styles.modalCloseButton}
            >
              <MaterialIcons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.allActivitiesFilters}>
            <Text style={styles.allActivitiesCount}>
              Showing {filteredActivity.length} of {allActivities.length} activities
            </Text>
          </View>

          <ScrollView style={styles.allActivitiesList}>
            {filteredActivity.map((activity, index) => (
              <TouchableOpacity 
                key={activity.id || index} 
                style={styles.allActivityItem}
                onPress={() => {
                  setShowAllActivitiesModal(false);
                  handleActivityClick(activity);
                }}
              >
                <View style={[styles.activityIcon, { backgroundColor: `${activity.color}20` }]}>
                  <MaterialIcons name={activity.icon as any} size={18} color={activity.color} />
                </View>
                <View style={styles.allActivityContent}>
                  <Text style={styles.allActivityText} numberOfLines={2}>{activity.text}</Text>
                  <View style={styles.allActivityMeta}>
                    <View style={[styles.activityType, { backgroundColor: `${activity.color}20` }]}>
                      <Text style={[styles.activityTypeText, { color: activity.color }]}>
                        {activity.type === 'reminder' ? '🔔' : 
                         activity.type === 'payment' ? '💳' :
                         activity.type === 'client' ? '👤' :
                         activity.type === 'booking' ? '📅' :
                         activity.type === 'cancellation' ? '❌' : '📝'}
                      </Text>
                    </View>
                    <Text style={styles.allActivityTime}>{activity.time}</Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={16} color="#9B8A7D" />
              </TouchableOpacity>
            ))}
            
            {filteredActivity.length === 0 && (
              <View style={styles.noActivitiesFound}>
                <MaterialIcons name="search-off" size={48} color="#9B8A7D" />
                <Text style={styles.noActivitiesText}>No activities found</Text>
                <Text style={styles.noActivitiesSubtext}>
                  Try adjusting your filters or check back later
                </Text>
              </View>
            )}
          </ScrollView>
        </Modal>
             </Portal>
       
       {/* Additional Content Sections to Ensure Scrolling */}
       <View style={styles.additionalSection}>
         <Text style={styles.sectionTitle}>Quick Actions</Text>
         <View style={styles.quickActionsContainer}>
           {quickActions.map((action, index) => (
             <TouchableOpacity
               key={index}
               style={[styles.quickActionCard, { borderLeftColor: action.color }]}
               onPress={action.action}
             >
               <MaterialIcons name={action.icon as any} size={24} color={action.color} />
               <Text style={styles.quickActionText}>{action.title}</Text>
               <MaterialIcons name="arrow-forward" size={16} color="#9B8A7D" />
             </TouchableOpacity>
           ))}
         </View>
       </View>

       <View style={styles.additionalSection}>
         <Text style={styles.sectionTitle}>System Status</Text>
         <View style={styles.statusCard}>
           <View style={styles.statusItem}>
             <MaterialIcons name="cloud" size={20} color="#4CAF50" />
             <Text style={styles.statusText}>System Online</Text>
             <View style={[styles.statusIndicator, { backgroundColor: '#4CAF50' }]} />
           </View>
           <View style={styles.statusItem}>
             <MaterialIcons name="sync" size={20} color="#2196F3" />
             <Text style={styles.statusText}>Last Sync: Just now</Text>
             <View style={[styles.statusIndicator, { backgroundColor: '#2196F3' }]} />
           </View>
           <View style={styles.statusItem}>
             <MaterialIcons name="backup" size={20} color="#FF9800" />
             <Text style={styles.statusText}>Backup Status: Current</Text>
             <View style={[styles.statusIndicator, { backgroundColor: '#FF9800' }]} />
           </View>
         </View>
       </View>

       {/* FORCE SCROLLING - Debug Content */}
       <View style={styles.additionalSection}>
         <Text style={styles.sectionTitle}>🔴 SCROLL TEST - This content should be scrollable</Text>
         {Array.from({ length: 20 }, (_, i) => (
           <View key={i} style={styles.statusCard}>
             <Text style={styles.statusText}>Debug Content Block #{i + 1}</Text>
             <Text style={styles.statusText}>If you can see this, scrolling should work!</Text>
             <Text style={styles.statusText}>Use mouse wheel or scroll bar on the right →</Text>
           </View>
         ))}
       </View>

       {/* Bottom padding for scroll */}
       <View style={styles.bottomPadding} />
      </ScrollView>
      
      {/* PC-Style Scroll Track - Always Visible */}
      <View style={styles.scrollTrackContainer}>
        <View style={styles.scrollTrack}>
          <View style={styles.scrollThumb} />
        </View>
        <View style={styles.scrollIndicatorContainer}>
          <View style={styles.scrollIndicatorTrack}>
            <Text style={styles.scrollIndicatorText}>↕ Scroll</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// PC Sidebar Navigation with real data badges
function ReceptionSidebar({ activeScreen, onNavigate, stats }: any) {
  const menuItems = [
    { key: 'Dashboard', icon: 'dashboard', label: 'Dashboard', badge: null },
    { key: 'Clients', icon: 'people', label: 'Client Management', badge: stats?.totalClients?.toString() || '0' },
    { key: 'Classes', icon: 'fitness-center', label: 'Class Management', badge: stats?.todayClasses?.toString() || '0' },
    { key: 'Plans', icon: 'card-membership', label: 'Subscription Plans', badge: null },
    { key: 'Reports', icon: 'assessment', label: 'Reports & Analytics', badge: null },
  ];

  return (
    <View style={styles.sidebar}>
      {/* Sidebar Header */}
      <View style={styles.sidebarHeader}>
        <View style={styles.logoContainer}>
          <MaterialIcons name="business" size={32} color="#9B8A7D" />
          <View>
            <Text style={styles.sidebarTitle}>Reception</Text>
            <Text style={styles.sidebarSubtitle}>Management Portal</Text>
          </View>
        </View>
      </View>

      {/* Navigation Menu */}
      <ScrollView style={styles.sidebarMenu}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[
              styles.sidebarItem,
              activeScreen === item.key && styles.sidebarItemActive
            ]}
            onPress={() => onNavigate(item.key)}
          >
            <MaterialIcons 
              name={item.icon as any} 
              size={24} 
              color={activeScreen === item.key ? '#fff' : '#9B8A7D'} 
            />
            <View style={styles.sidebarItemContent}>
              <Text style={[
                styles.sidebarItemText,
                activeScreen === item.key && styles.sidebarItemTextActive
              ]}>
                {item.label}
              </Text>
              {item.badge && (
                <View style={styles.sidebarBadge}>
                  <Text style={styles.sidebarBadgeText}>{item.badge}</Text>
                </View>
              )}
            </View>
            {activeScreen === item.key && (
              <View style={styles.activeIndicator} />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Sidebar Footer */}
      <View style={styles.sidebarFooter}>
        <TouchableOpacity style={styles.helpButton}>
          <MaterialIcons name="help-outline" size={20} color="#9B8A7D" />
          <Text style={styles.helpText}>Help & Support</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Wrapper components to handle navigation properly
function ClientsScreen({ navigation }: any) {
  return <PCUserManagement navigation={navigation} />;
}

function ClassesScreen({ navigation }: any) {
  return <PCClassManagement />;
}

function PlansScreen({ navigation }: any) {
  return <PCSubscriptionPlans />;
}

// Main PC Layout Container
function ReceptionPCLayout({ navigation }: any) {
  const dispatch = useDispatch();
  const [activeScreen, setActiveScreen] = useState('Dashboard');
  const [screenDimensions, setScreenDimensions] = useState(Dimensions.get('window'));
  const [stats, setStats] = useState({
    totalClients: 0,
    todayClasses: 0,
    pendingBookings: 0,
    activeSubscriptions: 0
  });
  
  // Modal states
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    enableNotifications: true,
    defaultReminderMinutes: 5,
    enablePushNotifications: true,
    enableEmailNotifications: true
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenDimensions(window);
    });
    
    // Load initial notifications
    loadInitialNotifications();
    
    return () => subscription?.remove();
  }, []);

  // Load notifications on mount
  const loadInitialNotifications = async () => {
    try {
      console.log('🔔 Loading initial notifications...');
      const userStatsResponse = await apiService.get('/notifications/recent');
      console.log('🔔 Notifications API response:', userStatsResponse);
      
      if (userStatsResponse.success && userStatsResponse.data) {
        console.log('🔔 Loaded real notifications:', userStatsResponse.data);
        // Ensure data is an array before setting
        const notificationsData = Array.isArray(userStatsResponse.data) ? userStatsResponse.data : [];
        console.log('🔔 Setting notifications:', notificationsData);
        setNotifications(notificationsData);
      } else {
        console.log('🔔 API call failed, setting empty notifications');
        console.log('🔔 Error:', userStatsResponse.error);
        setNotifications([]);
      }
    } catch (error) {
      console.error('🔔 Error loading initial notifications:', error);
      setNotifications([]);
    }
  };

  const handleNavigate = (screenKey: string) => {
    console.log('🏢 Reception navigating to:', screenKey);
    setActiveScreen(screenKey);
  };

  const loadStats = async () => {
    try {
      const userStatsResponse = await apiService.get('/users/stats');
      if (userStatsResponse.success && userStatsResponse.data) {
        const userStatsData = userStatsResponse.data as any;
        setStats({
          totalClients: userStatsData?.clients || 0,
          todayClasses: 0, // Will be loaded separately
          pendingBookings: 0, // Will be loaded separately
          activeSubscriptions: userStatsData?.activeSubscriptions || 0
        });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const renderMainContent = () => {
    switch (activeScreen) {
      case 'Clients':
        return <ClientsScreen navigation={navigation} />;
      case 'Classes':
        return <ClassesScreen navigation={navigation} />;
      case 'Plans':
        return <PlansScreen navigation={navigation} />;
      case 'Reports':
        return <ReceptionReports />;
      case 'Dashboard':
      default:
        return (
          <ReceptionDashboard 
            navigation={navigation} 
            onNavigate={handleNavigate}
            onStatsUpdate={(newStats: any) => setStats(newStats)}
          />
        );
    }
  };

  // Handle notification button press
  const handleNotificationPress = async () => {
    try {
      console.log('🔔 Notification button pressed, loading notifications...');
      
      // Get recent notifications for the reception user
      const userStatsResponse = await apiService.get('/notifications/recent');
      console.log('🔔 Notification button - API response:', userStatsResponse);
      
      if (userStatsResponse.success && userStatsResponse.data) {
        // Ensure data is an array before setting
        const notificationsData = Array.isArray(userStatsResponse.data) ? userStatsResponse.data : [];
        console.log('🔔 Notification button - Setting notifications:', notificationsData);
        setNotifications(notificationsData);
      } else {
        console.log('🔔 Notification button - API failed, keeping existing notifications');
        console.log('🔔 Notification button - Error:', userStatsResponse.error);
      }
    } catch (error) {
      console.error('🔔 Error in notification button handler:', error);
      // Keep existing notifications on error
    }
    
    console.log('🔔 Opening notification modal with notifications:', notifications.length);
    setNotificationModalVisible(true);
  };

  // Handle settings button press
  const handleSettingsPress = async (e?: any) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log('🔧 Settings button clicked!');
    
    try {
      const settingsResponse = await notificationService.getNotificationSettings();
      if (settingsResponse.success && settingsResponse.data) {
        setNotificationSettings(settingsResponse.data);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
    
    console.log('🔧 Opening settings modal...');
    setSettingsModalVisible(true);
  };

  // Save settings
  const handleSaveSettings = async () => {
    try {
      await notificationService.updateNotificationSettings(notificationSettings);
      setSettingsModalVisible(false);
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings. Please try again.');
    }
  };

  // Mark notification as read
  const markNotificationAsRead = async (notificationId: number) => {
    try {
      await apiService.put(`/notifications/${notificationId}/read`);
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Handle logout
  const handleLogout = () => {
    console.log('🚪 Reception user logging out...');
    setLogoutModalVisible(false);
    dispatch(logout());
  };

  const showLogoutConfirmation = () => {
    console.log('🚪 Showing logout confirmation...');
    setLogoutModalVisible(true);
  };

  // Use mobile layout if screen is too small
  if (screenDimensions.width < 1024) {
    return (
      <View style={styles.mobileContainer}>
        <Text style={styles.mobileWarning}>
          📱 Reception Portal is optimized for desktop use. 
          Please use a larger screen for the best experience.
        </Text>
        {renderMainContent()}
      </View>
    );
  }

  return (
    <View style={styles.pcContainer}>
      <ReceptionSidebar 
        activeScreen={activeScreen} 
        onNavigate={handleNavigate}
        stats={stats}
      />
      <View style={styles.mainContent}>
        <View style={styles.contentHeader}>
          <Text style={styles.contentTitle}>{activeScreen}</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.notificationButton}
              onPress={handleNotificationPress}
            >
              <MaterialIcons name="notifications" size={24} color="#666" />
              {notifications.filter(n => !n.read).length > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {notifications.filter(n => !n.read).length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.settingsButton}
              onPress={(e) => {
                console.log('🔧 Settings TouchableOpacity pressed!');
                handleSettingsPress(e);
              }}
            >
              <MaterialIcons name="settings" size={24} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.logoutButton}
              onPress={showLogoutConfirmation}
            >
              <MaterialIcons name="logout" size={24} color="#d32f2f" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.contentBody}>
          {renderMainContent()}
        </View>
      </View>

      {/* Notification Modal */}
      <Portal>
        <Modal
          visible={notificationModalVisible}
          onDismiss={() => setNotificationModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <PaperCard style={styles.modalCard}>
            <PaperCard.Content style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.modalIcon}>
                  <MaterialIcons name="notifications" size={24} color="#9B8A7D" />
                </View>
                <Text style={styles.modalTitle}>Notifications</Text>
                <TouchableOpacity 
                  onPress={() => setNotificationModalVisible(false)}
                  style={styles.closeButton}
                >
                  <MaterialIcons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.notificationList} showsVerticalScrollIndicator={false}>
                {notifications.length === 0 ? (
                  <View style={styles.emptyNotifications}>
                    <MaterialIcons name="notifications-none" size={48} color="#ccc" />
                    <Text style={styles.emptyNotificationsText}>No new notifications</Text>
                  </View>
                ) : (
                  notifications.map((notification) => (
                    <TouchableOpacity
                      key={notification.id}
                      style={[
                        styles.notificationItem,
                        !notification.read && styles.notificationItemUnread
                      ]}
                      onPress={async () => {
                        // Mark notification as read
                        await markNotificationAsRead(notification.id);
                        
                        // Handle reminder notifications
                        if (notification.type === 'reminder' && notification.noteId) {
                          try {
                            // Mark reminder as handled
                            await apiService.put(`/notifications/reminder/${notification.noteId}/handle`);
                            console.log('✅ Reminder marked as handled');
                          } catch (error) {
                            console.error('❌ Error handling reminder:', error);
                          }
                        }
                      }}
                    >
                      <View style={styles.notificationIcon}>
                        <MaterialIcons 
                          name={
                            notification.type === 'client' ? 'person' :
                            notification.type === 'booking' ? 'event' :
                            notification.type === 'payment' ? 'payment' :
                            notification.type === 'reminder' ? 'notifications' : 'info'
                          } 
                          size={20} 
                          color="#9B8A7D" 
                        />
                      </View>
                      <View style={styles.notificationContent}>
                        <Text style={styles.notificationMessage}>{notification.message}</Text>
                        <Text style={styles.notificationTime}>{notification.time}</Text>
                      </View>
                      {!notification.read && <View style={styles.unreadIndicator} />}
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
              
              <View style={styles.modalActions}>
                <PaperButton 
                  mode="contained" 
                  onPress={() => setNotificationModalVisible(false)}
                  style={styles.modalButton}
                >
                  Close
                </PaperButton>
              </View>
            </PaperCard.Content>
          </PaperCard>
        </Modal>
      </Portal>

      {/* Settings Modal */}
      <Portal>
        <Modal
          visible={settingsModalVisible}
          onDismiss={() => setSettingsModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <PaperCard style={styles.modalCard}>
            <PaperCard.Content style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.modalIcon}>
                  <MaterialIcons name="settings" size={24} color="#9B8A7D" />
                </View>
                <Text style={styles.modalTitle}>Reception Settings</Text>
                <TouchableOpacity 
                  onPress={() => setSettingsModalVisible(false)}
                  style={styles.closeButton}
                >
                  <MaterialIcons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.settingsContent} showsVerticalScrollIndicator={false}>
                <View style={styles.settingSection}>
                  <Text style={styles.settingSectionTitle}>Notification Settings</Text>
                  
                  <View style={styles.settingItem}>
                    <View style={styles.settingInfo}>
                      <Text style={styles.settingLabel}>Enable Notifications</Text>
                      <Text style={styles.settingDescription}>Receive notifications about bookings, payments, and client activity</Text>
                    </View>
                    <Switch
                      value={notificationSettings.enableNotifications}
                      onValueChange={(value) => 
                        setNotificationSettings(prev => ({ ...prev, enableNotifications: value }))
                      }
                      thumbColor="#9B8A7D"
                      trackColor={{ false: '#ccc', true: '#9B8A7D80' }}
                    />
                  </View>
                  
                  <Divider style={styles.settingDivider} />
                  
                  <View style={styles.settingItem}>
                    <View style={styles.settingInfo}>
                      <Text style={styles.settingLabel}>Push Notifications</Text>
                      <Text style={styles.settingDescription}>Receive push notifications on your device</Text>
                    </View>
                    <Switch
                      value={notificationSettings.enablePushNotifications}
                      onValueChange={(value) => 
                        setNotificationSettings(prev => ({ ...prev, enablePushNotifications: value }))
                      }
                      thumbColor="#9B8A7D"
                      trackColor={{ false: '#ccc', true: '#9B8A7D80' }}
                    />
                  </View>
                  
                  <Divider style={styles.settingDivider} />
                  
                  <View style={styles.settingItem}>
                    <View style={styles.settingInfo}>
                      <Text style={styles.settingLabel}>Email Notifications</Text>
                      <Text style={styles.settingDescription}>Receive email notifications for important updates</Text>
                    </View>
                    <Switch
                      value={notificationSettings.enableEmailNotifications}
                      onValueChange={(value) => 
                        setNotificationSettings(prev => ({ ...prev, enableEmailNotifications: value }))
                      }
                      thumbColor="#9B8A7D"
                      trackColor={{ false: '#ccc', true: '#9B8A7D80' }}
                    />
                  </View>
                  
                  <Divider style={styles.settingDivider} />
                  
                  <View style={styles.settingItem}>
                    <View style={styles.settingInfo}>
                      <Text style={styles.settingLabel}>Default Reminder Time</Text>
                      <Text style={styles.settingDescription}>Minutes before class to send reminders</Text>
                    </View>
                    <TextInput
                      value={notificationSettings?.defaultReminderMinutes?.toString() || '5'}
                      onChangeText={(text) => {
                        const minutes = parseInt(text) || 5;
                        setNotificationSettings(prev => ({ ...prev, defaultReminderMinutes: minutes }));
                      }}
                      style={styles.reminderInput}
                      keyboardType="numeric"
                      mode="outlined"
                      dense
                    />
                  </View>
                </View>
              </ScrollView>
              
              <View style={styles.modalActions}>
                <PaperButton 
                  mode="outlined" 
                  onPress={() => setSettingsModalVisible(false)}
                  style={styles.modalCancelButton}
                >
                  Cancel
                </PaperButton>
                <PaperButton 
                  mode="contained" 
                  onPress={handleSaveSettings}
                  style={styles.modalButton}
                >
                  Save Settings
                </PaperButton>
              </View>
            </PaperCard.Content>
          </PaperCard>
        </Modal>
      </Portal>

      {/* Logout Confirmation Modal */}
      <Portal>
        <Modal
          visible={logoutModalVisible}
          onDismiss={() => setLogoutModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <PaperCard style={styles.modalCard}>
            <PaperCard.Content style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.modalIcon}>
                  <MaterialIcons name="logout" size={24} color="#d32f2f" />
                </View>
                <Text style={styles.modalTitle}>Logout</Text>
                <TouchableOpacity 
                  onPress={() => setLogoutModalVisible(false)}
                  style={styles.closeButton}
                >
                  <MaterialIcons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.logoutModalContent}>
                <Text style={styles.logoutModalMessage}>
                  Are you sure you want to logout from the reception portal?
                </Text>
              </View>
              
              <View style={styles.modalActions}>
                <PaperButton 
                  mode="outlined" 
                  onPress={() => setLogoutModalVisible(false)}
                  style={styles.modalCancelButton}
                >
                  Cancel
                </PaperButton>
                <PaperButton 
                  mode="contained" 
                  onPress={handleLogout}
                  style={styles.logoutConfirmButton}
                >
                  Logout
                </PaperButton>
              </View>
            </PaperCard.Content>
          </PaperCard>
        </Modal>
      </Portal>
    </View>
  );
}

// Main Navigator
function ReceptionNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen 
        name="ReceptionMain" 
        component={ReceptionPCLayout}
        options={{ title: 'Reception Portal' }}
      />
      <Stack.Screen 
        name="ClientProfile" 
        component={ClientProfile}
        options={({ route }: any) => ({
          title: `${route.params?.userName || 'Client'} Profile`,
          headerShown: true,
          presentation: 'modal',
          headerStyle: { backgroundColor: '#9B8A7D' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        })}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  // PC Container
  pcContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    minHeight: '100%',
  },
  
  // Mobile Container
  mobileContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mobileWarning: {
    fontSize: 16,
    color: '#FF9800',
    textAlign: 'center',
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },

  // Sidebar Styles
  sidebar: {
    width: 280,
    backgroundColor: '#ffffff',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  sidebarHeader: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sidebarTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  sidebarSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  sidebarMenu: {
    flex: 1,
    padding: 16,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 4,
    borderRadius: 8,
    position: 'relative',
  },
  sidebarItemActive: {
    backgroundColor: '#9B8A7D',
  },
  sidebarItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginLeft: 12,
  },
  sidebarItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  sidebarItemTextActive: {
    color: '#ffffff',
  },
  sidebarBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  sidebarBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  activeIndicator: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: '#ffffff',
    borderRadius: 2,
  },
  sidebarFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  helpText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6B7280',
  },

  // Main Content
  mainContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  contentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  contentTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  settingsButton: {
    padding: 8,
  },
  logoutButton: {
    padding: 8,
  },
  contentBody: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },

  // Dashboard Content
  dashboardContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderLeftWidth: 1,
    borderLeftColor: '#E5E7EB',  // Subtle border to define scroll area
    position: 'relative',
  },
  dashboardScrollView: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingRight: 8, // Enhanced space for scroll indicator visibility
    marginRight: 4,  // Additional margin for scroll bar clarity
  },
  scrollViewContent: {
    padding: 40,  // PC-style: more generous padding
    paddingBottom: 120, // PC-style: extra space for mouse scroll
    flexGrow: 1,  // Allow content to grow
    minHeight: '200%', // Force scrolling by making content much taller than screen
  },
  dashboardHeader: {
    marginBottom: 32,
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 16,
    color: '#6B7280',
  },
  
  // Stats Grid - PC optimized
  statsGrid: {
    flexDirection: 'row',
    gap: 32,  // PC-style: larger gaps for better visual separation
    marginBottom: 40,  // PC-style: more generous spacing
    justifyContent: 'space-between',  // PC-style: better distribution
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },

  // Quick Actions
  quickActionsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 24,  // PC-style: more generous padding
    borderRadius: 12,  // PC-style: larger border radius
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',  // PC-style: more pronounced shadow
    elevation: 3,
    minHeight: 80,  // PC-style: ensure adequate click target size
  },
  quickActionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginLeft: 12,
  },

  // Recent Activity
  recentActivitySection: {
    marginBottom: 32,
    marginTop: 16,
    minHeight: 400, // Ensure minimum height for scrollable content
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  refreshText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#9B8A7D',
  },
  refreshButtonDisabled: {
    opacity: 0.6,
  },
  refreshTextDisabled: {
    color: '#9CA3AF',
  },
  activityList: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.05)',
    elevation: 2,
    minHeight: 300, // Increased to ensure scrollable content
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,  // PC-style: more generous padding for mouse clicks
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#ffffff',
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityContent: {
    flex: 1,
    marginLeft: 12,
  },
  activityText: {
    fontSize: 14,
    color: '#1F2937',
    marginBottom: 4,
  },
  activityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activityType: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  activityTypeText: {
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  activityTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  activityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activityCount: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  emptyActivity: {
    alignItems: 'center',
    padding: 40,
  },
  emptyActivityText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
    fontWeight: '500',
  },
  emptyActivitySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },

  // Coming Soon
  comingSoon: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  comingSoonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
  },
  comingSoonSubtext: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6B7280',
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  modalCard: {
    maxWidth: 500,
    width: '100%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  modalContent: {
    padding: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalIcon: {
    marginRight: 12,
  },
  modalTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  closeButton: {
    padding: 4,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  modalButton: {
    backgroundColor: '#9B8A7D',
  },
  modalCancelButton: {
    borderColor: '#9B8A7D',
  },
  
  // Notification Modal Styles
  notificationList: {
    maxHeight: 400,
    padding: 20,
  },
  emptyNotifications: {
    alignItems: 'center',
    padding: 40,
  },
  emptyNotificationsText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    marginBottom: 8,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#E5E7EB',
  },
  notificationItemUnread: {
    backgroundColor: '#EFF6FF',
    borderLeftColor: '#3B82F6',
  },
  notificationIcon: {
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#1F2937',
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 4,
    marginLeft: 8,
  },
  
  // Settings Modal Styles
  settingsContent: {
    maxHeight: 400,
    padding: 20,
  },
  settingSection: {
    marginBottom: 20,
  },
  settingSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  settingDivider: {
    backgroundColor: '#E5E7EB',
  },
  reminderInput: {
    width: 80,
    height: 40,
  },

  // Logout Modal Styles
  logoutModalContent: {
    padding: 20,
    paddingTop: 10,
  },
  logoutModalMessage: {
    fontSize: 16,
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 10,
  },
  logoutConfirmButton: {
    backgroundColor: '#d32f2f',
  },

  // Search Styles - PC optimized
  searchSection: {
    marginBottom: 40,  // PC-style: more generous spacing
    maxWidth: 800,  // PC-style: limit width for better readability
  },
  searchTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    paddingVertical: 0,
  },
  searchButton: {
    padding: 8,
    backgroundColor: '#9B8A7D',
    borderRadius: 6,
  },
  searchButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  searchResults: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.05)',
    elevation: 2,
    maxHeight: 200,
    overflow: 'hidden',
  },
  searchResultsHeader: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#F9FAFB',
  },
  searchResultsTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  searchResultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchResultInfo: {
    marginLeft: 12,
    flex: 1,
  },
  searchResultName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  searchResultEmail: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  searchResultStatus: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '500',
  },

  // Activity Filter Styles
  activityFilters: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activitySearchContainer: {
    marginBottom: 12,
  },
  activitySearchInput: {
    fontSize: 14,
    backgroundColor: '#ffffff',
  },
  activityTypeFilter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginRight: 12,
  },
  filterButtons: {
    flexDirection: 'row',
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterButtonActive: {
    backgroundColor: '#9B8A7D',
    borderColor: '#9B8A7D',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#ffffff',
  },
  activityTimeFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  activityActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  viewAllButtonText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
    fontWeight: '500',
  },

  // All Activities Modal Styles
  allActivitiesModal: {
    backgroundColor: '#ffffff',
    margin: 20,
    borderRadius: 12,
    maxHeight: '80%',
    width: '90%',
    alignSelf: 'center',
  },
  allActivitiesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  allActivitiesTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  modalCloseButton: {
    padding: 4,
  },
  allActivitiesFilters: {
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  allActivitiesCount: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  allActivitiesList: {
    flex: 1,
    padding: 8,
  },
  allActivityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#ffffff',
  },
  allActivityContent: {
    flex: 1,
    marginLeft: 12,
  },
  allActivityText: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
  },
  allActivityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  allActivityTime: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 8,
  },
  noActivitiesFound: {
    alignItems: 'center',
    padding: 40,
  },
  noActivitiesText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 12,
  },
  noActivitiesSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
  },

  // Bottom padding for scroll
  bottomPadding: {
    height: 100, // Increased to ensure scrollable content and scroll bar visibility
  },

  // PC-Style Scroll Track - Always Visible
  scrollTrackContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 20,
    zIndex: 1000,
    pointerEvents: 'none',
  },
  scrollTrack: {
    flex: 1,
    width: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    marginRight: 6,
    borderRadius: 4,
    marginVertical: 20,
  },
  scrollThumb: {
    width: '100%',
    height: 60,
    backgroundColor: 'rgba(155, 138, 125, 0.7)',
    borderRadius: 4,
    marginTop: 10,
  },
  scrollIndicatorContainer: {
    position: 'absolute',
    right: 12,
    bottom: 20,
    zIndex: 1001,
  },
  scrollIndicatorTrack: {
    backgroundColor: 'rgba(155, 138, 125, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  scrollIndicatorText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  // Additional Sections for Scroll Testing
  additionalSection: {
    marginBottom: 32,
  },
  quickActionsContainer: {
    gap: 16,
  },
  statusCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 20,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  statusText: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
    marginLeft: 12,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Class Metrics Styles
  classMetricsSection: {
    marginBottom: 32,
  },
  metricsControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  expandButtonText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#9B8A7D',
  },
  hideMetricsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  hideMetricsText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6B7280',
  },
  classMetricsContainer: {
    marginBottom: 24,
  },
  classMetricsExpanded: {
    maxHeight: 600,
    minHeight: 400,
  },
  classMetricsCollapsed: {
    maxHeight: 300,
    minHeight: 200,
  },
  viewAllClassesButton: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  viewAllClassesText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '500',
  },
  hiddenMetricsSection: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  showMetricsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  showMetricsButtonText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#9B8A7D',
  },
});

export default ReceptionNavigator; 