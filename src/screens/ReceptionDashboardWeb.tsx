import React, { createContext, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Modal, Portal, TextInput } from 'react-native-paper';
import { useSelector } from 'react-redux';
import WebCompatibleIcon from '../components/WebCompatibleIcon';
import { NotificationSettings } from '../services/notificationService';
import { unifiedApiService } from '../services/unifiedApi';
import { RootState, useAppDispatch } from '../store';
import { logoutUser } from '../store/authSlice';
import ClientProfile from './admin/ClientProfile';
import PCClassManagement from './admin/PCClassManagement';
import PCSubscriptionPlans from './admin/PCSubscriptionPlans';
import PCUserManagement from './admin/PCUserManagement';
import ReceptionReports from './ReceptionReports';
// Import the enhanced client profile

// Types for client profile data
interface ClientStats {
  totalSpent: number;
  totalClasses: number;
  currentPlan?: string;
  joinDate: string;
  lastActivity: string;
  attendanceRate: number;
  favoriteInstructor?: string;
  totalBookings: number;
  cancelledBookings: number;
  noShowBookings: number;
}

interface BookingHistory {
  id: number;
  class_name: string;
  instructor_name: string;
  class_date: string;
  class_time: string;
  status: string;
  booking_date: string;
  equipment_type?: string;
}

interface PaymentHistory {
  id: number;
  amount: number;
  payment_date: string;
  payment_method: string;
  status: string;
  subscription_plan_name?: string;
  transaction_id?: string;
}

interface AssignmentHistory {
  id: number;
  client_name: string;
  admin_name: string;
  admin_role: string;
  plan_name: string;
  monthly_price: number;
  classes_added: number;
  subscription_status: string;
  description: string;
  created_at: string;
}

interface SubscriptionHistory {
  id: number;
  plan_name: string;
  start_date: string;
  end_date: string;
  status: string;
  monthly_price: number;
  remaining_classes: number;
  equipment_access: string;
  assigned_by?: {
    id: number;
    name: string;
    role: string;
    assignment_date: string;
    assignment_notes: string;
  } | null;
}

// Create context for route and navigation
const MockNavigationContext = createContext<any>(null);



// Mock Navigation Provider
const MockNavigationProvider = ({ children, mockRoute, mockNavigation }: any) => {
  return (
    <MockNavigationContext.Provider value={{ route: mockRoute, navigation: mockNavigation }}>
      {children}
    </MockNavigationContext.Provider>
  );
};

// Simplified navigation wrapper for ClientProfile
const NavigationWrappedClientProfile = () => {
  const context = useContext(MockNavigationContext);
  
  if (!context) {
    console.error('NavigationWrappedClientProfile must be used within MockNavigationProvider');
    return <Text>Navigation context not available</Text>;
  }
  
  console.log('🔧 NavigationWrappedClientProfile context:', context);
  
  // Pass parameters directly as props to ClientProfile
  return (
    <ClientProfile 
      userId={context.route?.params?.userId}
      userName={context.route?.params?.userName}
    />
  );
};



// PC-Optimized Reception Dashboard
function ReceptionDashboard({ onNavigate, onStatsUpdate, navigation }: any) {
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
  const [searching, setSearching] = useState(false);
  
  // Activity filtering and pagination states
  const [activitySearchQuery, setActivitySearchQuery] = useState('');
  const [activityTypeFilter, setActivityTypeFilter] = useState('all');
  const [activityTimeFilter, setActivityTimeFilter] = useState('recent');
  const [filteredActivity, setFilteredActivity] = useState<any[]>([]);
  const [refreshingActivities, setRefreshingActivities] = useState(false);
  
  // Pagination states for Recent Activity
  const [activityPage, setActivityPage] = useState(1);
  const [activityItemsPerPage] = useState(10);
  const [displayedActivities, setDisplayedActivities] = useState<any[]>([]);
  const [hasMoreActivities, setHasMoreActivities] = useState(false);
  const [loadingMoreActivities, setLoadingMoreActivities] = useState(false);

  useEffect(() => {
    loadDashboardData();
    
    // Set up auto-refresh every 2 minutes to keep activities current
    const interval = setInterval(() => {
      loadDashboardData();
    }, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);
  
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      console.log('📊 Loading dashboard data from REST API...');
      
      // Load real data from unified API in parallel
      const [usersResponse, classesResponse, bookingsResponse, subscriptionsResponse] = await Promise.allSettled([
        unifiedApiService.getUsers(),
        unifiedApiService.getClasses(),
        unifiedApiService.getBookings(),
        unifiedApiService.getSubscriptions()
      ]);

      // Process users stats with better error handling
      let totalClients = 0;
      if (usersResponse.status === 'fulfilled' && usersResponse.value.success && usersResponse.value.data && Array.isArray(usersResponse.value.data)) {
        const clients = usersResponse.value.data.filter((user: any) => user.role === 'client');
        totalClients = clients.length;
        console.log('✅ Loaded users data successfully');
      } else {
        console.log('⚠️ Failed to load users data:', usersResponse.status === 'rejected' ? usersResponse.reason : usersResponse.value?.error);
      }

      // Process classes with better error handling  
      let totalClasses = 0;
      let todayClasses = 0;
      if (classesResponse.status === 'fulfilled' && classesResponse.value.success && classesResponse.value.data && Array.isArray(classesResponse.value.data)) {
        totalClasses = classesResponse.value.data.length;
        const today = new Date().toISOString().split('T')[0];
        todayClasses = classesResponse.value.data.filter((class_: any) => class_.date === today).length;
        console.log('✅ Loaded classes data successfully');
      } else {
        console.log('⚠️ Failed to load classes data:', classesResponse.status === 'rejected' ? classesResponse.reason : classesResponse.value?.error);
      }

      // Process bookings with better error handling
      let totalBookings = 0;
      let todayBookings = 0;
      if (bookingsResponse.status === 'fulfilled' && bookingsResponse.value.success && bookingsResponse.value.data && Array.isArray(bookingsResponse.value.data)) {
        totalBookings = bookingsResponse.value.data.length;
        const today = new Date().toISOString().split('T')[0];
        todayBookings = bookingsResponse.value.data.filter((booking: any) => {
          return booking.class_date === today || booking.date === today;
        }).length;
        console.log('✅ Loaded bookings data successfully');
      } else {
        console.log('⚠️ Failed to load bookings data:', bookingsResponse.status === 'rejected' ? bookingsResponse.reason : bookingsResponse.value?.error);
      }

      // Process subscriptions with better error handling
      let activeSubscriptions = 0;
      if (subscriptionsResponse.status === 'fulfilled' && subscriptionsResponse.value.success && subscriptionsResponse.value.data && Array.isArray(subscriptionsResponse.value.data)) {
        activeSubscriptions = subscriptionsResponse.value.data.filter((sub: any) => sub.status === 'active').length;
        console.log('✅ Loaded subscriptions data successfully');
      } else {
        console.log('⚠️ Failed to load subscriptions data:', subscriptionsResponse.status === 'rejected' ? subscriptionsResponse.reason : subscriptionsResponse.value?.error);
      }

      const newStats = {
        totalClients,
        todayClasses,
        pendingBookings: todayBookings,
        activeSubscriptions
      };

      setStats(newStats);
      
      // Update parent component stats for sidebar badges
      if (onStatsUpdate) {
        onStatsUpdate(newStats);
      }

      // Create activity items from real data
      const activities: any[] = [];
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));

      // Helper function to check if date is within last 24 hours
      const isRecent = (dateString: string) => {
        const date = new Date(dateString);
        return date > oneDayAgo;
      };

      // Process recent user registrations
      if (usersResponse.status === 'fulfilled' && usersResponse.value.success && usersResponse.value.data && Array.isArray(usersResponse.value.data)) {
        const recentUsers = usersResponse.value.data.filter((user: any) => 
          user.role === 'client' && isRecent(user.created_at)
        );
        recentUsers.forEach((user: any) => {
          activities.push({
            id: `user-${user.id}`,
            text: `New client registration: ${user.name || user.email}`,
            time: getTimeAgo(new Date(user.created_at)),
            type: 'client',
            icon: 'person-add',
            color: '#4CAF50',
            read: false,
            created_at: user.created_at,
            userId: user.id,
            userName: user.name || user.email,
            clientId: user.id // Keep for backward compatibility
          });
        });
      }

      // Process recent bookings
      if (bookingsResponse.status === 'fulfilled' && bookingsResponse.value.success && bookingsResponse.value.data && Array.isArray(bookingsResponse.value.data)) {
        const recentBookings = bookingsResponse.value.data.filter((booking: any) => isRecent(booking.created_at));
        recentBookings.forEach((booking: any) => {
          activities.push({
            id: `booking-${booking.id}`,
            text: `Booking: ${booking.user_name || 'Client'} → ${booking.class_name || 'Class'}`,
            time: getTimeAgo(new Date(booking.created_at)),
            type: 'booking',
            icon: 'event',
            color: '#2196F3',
            read: false,
            created_at: booking.created_at,
            userId: booking.user_id,
            userName: booking.user_name || 'Client',
            classId: booking.class_id
          });
        });

        // Process class cancellations
        const cancelledBookings = bookingsResponse.value.data.filter((booking: any) => 
          booking.status === 'cancelled' && isRecent(booking.updated_at || booking.created_at)
        );
        cancelledBookings.forEach((booking: any) => {
          activities.push({
            id: `cancellation-${booking.id}`,
            text: `Class cancelled: ${booking.class_name || 'Class'} by ${booking.user_name || 'Client'}`,
            time: getTimeAgo(new Date(booking.updated_at || booking.created_at)),
            type: 'cancellation',
            icon: 'event-busy',
            color: '#F44336',
            read: false,
            created_at: booking.updated_at || booking.created_at,
            userId: booking.user_id,
            userName: booking.user_name || 'Client',
            classId: booking.class_id
          });
        });
      }

      // Process recent subscriptions
      if (subscriptionsResponse.status === 'fulfilled' && subscriptionsResponse.value.success && subscriptionsResponse.value.data && Array.isArray(subscriptionsResponse.value.data)) {
        const recentSubscriptions = subscriptionsResponse.value.data.filter((sub: any) => isRecent(sub.created_at));
        recentSubscriptions.forEach((sub: any) => {
          activities.push({
            id: `subscription-${sub.id}`,
            text: `New subscription: ${sub.user_name || 'Client'} - ${sub.plan_name || 'Plan'}`,
            time: getTimeAgo(new Date(sub.created_at)),
            type: 'subscription',
            icon: 'card-membership',
            color: '#9C27B0',
            read: false,
            created_at: sub.created_at,
            userId: sub.user_id,
            userName: sub.user_name || 'Client'
          });
        });
      }

      // Sort activities by creation date (newest first)
      activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      // Keep only last 100 activities to prevent memory issues
      const limitedActivities = activities.slice(0, 100);
      
      setAllActivities(limitedActivities);
      setFilteredActivity(limitedActivities);
      console.log('✅ Real dashboard data loaded successfully from REST API');

    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
      // Set default stats on error
      setStats({
        totalClients: 0,
        todayClasses: 0,
        pendingBookings: 0,
        activeSubscriptions: 0
      });
      setAllActivities([]);
      setFilteredActivity([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle activity pagination when filtered activities change
  useEffect(() => {
    const startIndex = 0;
    const endIndex = activityPage * activityItemsPerPage;
    const paginatedActivities = filteredActivity.slice(startIndex, endIndex);
    
    setDisplayedActivities(paginatedActivities);
    setHasMoreActivities(endIndex < filteredActivity.length);
  }, [filteredActivity, activityPage, activityItemsPerPage]);

  // Load more activities
  const handleLoadMoreActivities = () => {
    if (!hasMoreActivities || loadingMoreActivities) return;
    
    setLoadingMoreActivities(true);
    
    // Simulate loading delay for better UX
    setTimeout(() => {
      setActivityPage(prev => prev + 1);
      setLoadingMoreActivities(false);
    }, 500);
  };

  // Reset pagination when filtering changes
  const resetActivityPagination = () => {
    setActivityPage(1);
    setDisplayedActivities([]);
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
      return 'In the future';
    }

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    
    // For older items, show the actual date
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleSearchClients = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      
      // Get all users from REST API and filter clients
      const response = await unifiedApiService.getUsers();
      
      if (response.success && response.data && Array.isArray(response.data)) {
        const clients = response.data.filter((user: any) => 
          user.role === 'client' && 
          (user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           user.email?.toLowerCase().includes(searchQuery.toLowerCase()))
        );
        setSearchResults(clients);
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
      title: 'View All Clients',
      icon: 'people',
      action: () => onNavigate('Clients'),
      color: '#673AB7'
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
      title: 'View Reports',
      icon: 'assessment',
      action: () => onNavigate('Reports'),
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
    <>
      {/* Quick Client Search */}
      <View style={styles.searchSection}>
        <Text style={styles.sectionTitle}>Quick Client Search</Text>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search clients by name or email..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            mode="outlined"
            right={
              searchResults.length > 0 ? (
                <TextInput.Icon 
                  icon="close" 
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
            <WebCompatibleIcon 
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
                onPress={() => {
                  console.log('Search result clicked:', client.id, client.name);
                  if (client.id) {
                    const userName = client.name || client.email || 'Unknown Client';
                    
                    console.log('Navigating to ReceptionClientProfile for search result:', client.id);
                    
                    // Use React Navigation to navigate to ClientProfile (which renders ReceptionClientProfile)
                    if (navigation && navigation.navigate) {
                      try {
                        navigation.navigate('ClientProfile', { 
                          userId: client.id, 
                          userName: userName 
                        });
                        console.log('✅ Navigation to ReceptionClientProfile completed');
                        
                        // Clear search after successful navigation
                        setSearchQuery('');
                        setSearchResults([]);
                      } catch (error) {
                        console.error('❌ Navigation failed:', error);
                        alert('Navigation Error: Failed to open client profile');
                      }
                    } else {
                      console.error('❌ Navigation object not available');
                      alert('Navigation Error: Navigation not available');
                    }
                  } else {
                    alert('Unable to navigate: Client ID not found');
                  }
                }}
              >
                <View style={styles.searchResultAvatar}>
                  <WebCompatibleIcon name="person" size={24} color="#9B8A7D" />
                </View>
                <View style={styles.searchResultInfo}>
                  <Text style={styles.searchResultName}>{client.name}</Text>
                  <Text style={styles.searchResultEmail}>{client.email}</Text>
                  <Text style={styles.searchResultStatus}>
                    {client.status === 'active' ? '● Active' : '○ Inactive'}
                  </Text>
                </View>
                <WebCompatibleIcon name="arrow-forward" size={20} color="#9B8A7D" />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <WebCompatibleIcon name="people" size={32} color="#4CAF50" />
          <Text style={styles.statNumber}>{stats.totalClients}</Text>
          <Text style={styles.statLabel}>Total Clients</Text>
        </View>
        <View style={styles.statCard}>
          <WebCompatibleIcon name="fitness-center" size={32} color="#2196F3" />
          <Text style={styles.statNumber}>{stats.todayClasses}</Text>
          <Text style={styles.statLabel}>Today's Classes</Text>
        </View>
        <View style={styles.statCard}>
          <WebCompatibleIcon name="schedule" size={32} color="#FF9800" />
          <Text style={styles.statNumber}>{stats.pendingBookings}</Text>
          <Text style={styles.statLabel}>Pending Bookings</Text>
        </View>
        <View style={styles.statCard}>
          <WebCompatibleIcon name="card-membership" size={32} color="#9C27B0" />
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
              <WebCompatibleIcon name={action.icon as any} size={24} color={action.color} />
              <Text style={styles.quickActionText}>{action.title}</Text>
              <WebCompatibleIcon name="arrow-forward" size={16} color="#666" />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.recentActivitySection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.activityControls}>
            <TouchableOpacity 
              style={[styles.refreshButton, refreshingActivities && styles.refreshButtonDisabled]}
              onPress={handleManualRefresh}
              disabled={refreshingActivities}
            >
              <WebCompatibleIcon 
                name={refreshingActivities ? "hourglass-empty" : "refresh"} 
                size={20} 
                color={refreshingActivities ? "#9CA3AF" : "#9B8A7D"} 
              />
              <Text style={[styles.refreshText, refreshingActivities && styles.refreshTextDisabled]}>
                {refreshingActivities ? 'Refreshing...' : 'Refresh'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.activityCount}>
              {filteredActivity.length} activities
            </Text>
          </View>
        </View>

        <ScrollView style={styles.activityScrollContainer} showsVerticalScrollIndicator={true}>
          <View style={styles.activityList}>
            {displayedActivities.length > 0 ? (
              displayedActivities.map((activity, index) => (
                <TouchableOpacity 
                  key={activity.id || index} 
                  style={styles.activityItem}
                                  onPress={() => {
                  console.log('Activity clicked:', activity);
                  
                  // Navigate based on activity type - prioritize client profile navigation
                  if (activity.userId || activity.clientId) {
                    const userId = activity.userId || activity.clientId;
                    const userName = activity.userName || 'Unknown Client';
                    
                    console.log('Navigating to ReceptionClientProfile for userId:', userId);
                    
                    // Use React Navigation to navigate to ClientProfile (which renders ReceptionClientProfile)
                    if (navigation && navigation.navigate) {
                      try {
                        navigation.navigate('ClientProfile', { 
                          userId: userId, 
                          userName: userName 
                        });
                        console.log('✅ Navigation to ReceptionClientProfile completed');
                      } catch (error) {
                        console.error('❌ Navigation failed:', error);
                        alert('Navigation Error: Failed to open client profile');
                      }
                    } else {
                      console.error('❌ Navigation object not available');
                      alert('Navigation Error: Navigation not available');
                    }
                  } else if (activity.type === 'booking' && activity.classId) {
                    // Navigate to class management for booking activities without user info
                    console.log('Navigating to class management for classId:', activity.classId);
                    onNavigate('ClassManagement');
                  } else {
                    // Show activity details for activities without navigation data
                    console.log('Showing activity details for:', activity);
                    alert(`Activity Details:\n${activity.text}\n\nTime: ${activity.time}`);
                  }
                }}
                >
                  <View style={[styles.activityIcon, { backgroundColor: `${activity.color}20` }]}>
                    <WebCompatibleIcon name={activity.icon as any} size={20} color={activity.color} />
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityText}>{activity.text}</Text>
                    <View style={styles.activityMeta}>
                      <View style={[styles.activityType, { backgroundColor: `${activity.color}20` }]}>
                        <Text style={[styles.activityTypeText, { color: activity.color }]}>
                          {activity.type === 'subscription' ? '💳 Subscription' : 
                           activity.type === 'client' ? '👤 New Client' :
                           activity.type === 'booking' ? '📅 Booking' :
                           activity.type === 'cancellation' ? '❌ Cancellation' : 
                           activity.type === 'notification' ? '🔔 Notification' : activity.type}
                        </Text>
                      </View>
                      <Text style={styles.activityTime}>{activity.time}</Text>
                    </View>
                  </View>
                  <WebCompatibleIcon name="chevron-right" size={16} color="#9B8A7D" />
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyActivity}>
                <WebCompatibleIcon name="schedule" size={48} color="#9B8A7D" />
                <Text style={styles.emptyActivityText}>No recent activity</Text>
                <Text style={styles.emptyActivitySubtext}>
                  Activities will appear here as they happen
                </Text>
              </View>
            )}
            
            {/* Load More Button */}
            {hasMoreActivities && (
              <TouchableOpacity 
                style={styles.loadMoreButton}
                onPress={handleLoadMoreActivities}
                disabled={loadingMoreActivities}
              >
                <WebCompatibleIcon 
                  name={loadingMoreActivities ? "hourglass-empty" : "add"} 
                  size={20} 
                  color={loadingMoreActivities ? "#9CA3AF" : "#9B8A7D"} 
                />
                <Text style={[styles.loadMoreText, loadingMoreActivities && styles.loadMoreTextDisabled]}>
                  {loadingMoreActivities ? 'Loading...' : `Load More (${filteredActivity.length - displayedActivities.length} remaining)`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </View>

      {/* Bottom padding for scroll */}
      <View style={styles.bottomPadding} />
    </>
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

  // Add back button when viewing client profile
  const displayMenuItems = activeScreen === 'ClientProfile' 
    ? [{ key: 'BackToDashboard', icon: 'arrow-back', label: '← Back to Dashboard', badge: null }, ...menuItems]
    : menuItems;

  return (
    <View style={styles.sidebar}>
      {/* Sidebar Header */}
      <View style={styles.sidebarHeader}>
        <View style={styles.logoContainer}>
          <WebCompatibleIcon name="business" size={32} color="#9B8A7D" />
          <View>
            <Text style={styles.sidebarTitle}>Reception</Text>
            <Text style={styles.sidebarSubtitle}>Management Portal</Text>
          </View>
        </View>
      </View>

      {/* Navigation Menu */}
      <ScrollView style={styles.sidebarMenu}>
        {displayMenuItems.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[
              styles.sidebarItem,
              activeScreen === item.key && styles.sidebarItemActive
            ]}
            onPress={() => onNavigate(item.key === 'BackToDashboard' ? 'Dashboard' : item.key)}
          >
            <WebCompatibleIcon 
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
          <WebCompatibleIcon name="help-outline" size={20} color="#9B8A7D" />
          <Text style={styles.helpText}>Help & Support</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}



// Wrapper components to handle navigation properly
function ClientsScreen({ navigation, onViewProfile }: any) {
  // Add auth state debugging
  const authState = useSelector((state: RootState) => state.auth);
  
  const handleViewProfile = (userId: string, userName: string) => {
    console.log('🔍 ClientsScreen received profile view request:', { userId, userName });
    console.log('🔍 Auth state when clicking view profile:', {
      isLoggedIn: authState.isLoggedIn,
      userExists: !!authState.user,
      userRole: authState.user?.role,
      tokenExists: !!authState.token
    });
    
    // Prioritize React Navigation over custom callback for proper routing
    if (navigation && navigation.navigate) {
      console.log('🔍 Using React Navigation (preferred)');
      try {
        navigation.navigate('ClientProfile', { userId, userName });
        console.log('✅ Navigation call completed successfully');
      } catch (navError) {
        console.error('❌ Navigation error:', navError);
        // Fallback to custom callback if navigation fails
        if (onViewProfile) {
          console.log('🔍 Falling back to reception onViewProfile callback');
          onViewProfile(userId, userName);
        }
      }
    } else if (onViewProfile) {
      console.log('🔍 Using reception onViewProfile callback (fallback)');
      onViewProfile(userId, userName);
    } else {
      console.error('❌ No navigation method available');
    }
  };
  
  console.log('👥 ClientsScreen rendering with navigation:', !!navigation);
  return <PCUserManagement navigation={navigation} onViewProfile={handleViewProfile} />;
}

function ClassesScreen({ navigation }: any) {
  return <PCClassManagement />;
}

function PlansScreen({ navigation }: any) {
  return <PCSubscriptionPlans />;
}

// Main PC Layout Container
function ReceptionPCLayout({ navigation }: any) {
  const dispatch = useAppDispatch();
  const [activeScreen, setActiveScreen] = useState('Dashboard');
  const [navigationParams, setNavigationParams] = useState<any>(null);
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
    
    return () => subscription?.remove();
  }, []);

  const handleNavigate = (screenKey: string, params?: any) => {
    console.log('🏢 Reception navigating to:', screenKey, 'with params:', params);
    setActiveScreen(screenKey);
    if (params) {
      setNavigationParams(params);
    }
  };

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
      case 'ClientProfile':
        console.log('🔧 Rendering ClientProfile with navigationParams:', navigationParams);
        return (
          <MockNavigationProvider 
            mockRoute={{
              params: {
                userId: navigationParams?.userId || null,
                userName: navigationParams?.userName || 'Unknown Client'
              }
            }}
            mockNavigation={{
              navigate: (screen: string, params?: any) => {
                console.log('Mock navigation to:', screen, params);
                handleNavigate(screen, params);
              },
              goBack: () => {
                console.log('Mock navigation goBack');
                handleNavigate('Dashboard');
              }
            }}
          >
            <NavigationWrappedClientProfile />
          </MockNavigationProvider>
        );
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

  // Handle logout
  const handleLogout = async () => {
    console.log('🚪 Reception user logging out...');
    setLogoutModalVisible(false);
    await dispatch(logoutUser());
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
          <View style={styles.titleSection}>
            <Text style={styles.contentTitle}>
              {activeScreen === 'Clients' 
                ? 'User Management'
                : activeScreen}
            </Text>
          </View>
          <View style={styles.headerActions}>
            {/* Notification Button */}
            <TouchableOpacity 
              style={styles.notificationButton}
              onPress={() => setNotificationModalVisible(true)}
            >
              <WebCompatibleIcon name="notifications" size={24} color="#9B8A7D" />
              {notifications.length > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>{notifications.length}</Text>
                </View>
              )}
            </TouchableOpacity>
            
            {/* Logout Button */}
            <TouchableOpacity 
              style={styles.logoutButton}
              onPress={showLogoutConfirmation}
            >
              <WebCompatibleIcon name="logout" size={24} color="#d32f2f" />
            </TouchableOpacity>
          </View>
        </View>
        <ScrollView 
          style={styles.contentBody}
          showsVerticalScrollIndicator={true}
          contentContainerStyle={styles.scrollContent}
        >
          {renderMainContent()}
        </ScrollView>
      </View>

      {/* Logout Confirmation Modal */}
      <Portal>
        <Modal
          visible={logoutModalVisible}
          onDismiss={() => setLogoutModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.modalIcon}>
                  <WebCompatibleIcon name="logout" size={24} color="#d32f2f" />
                </View>
                <Text style={styles.modalTitle}>Logout</Text>
                <TouchableOpacity 
                  onPress={() => setLogoutModalVisible(false)}
                  style={styles.closeButton}
                >
                  <WebCompatibleIcon name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.logoutModalContent}>
                <Text style={styles.logoutModalMessage}>
                  Are you sure you want to logout from the reception portal?
                </Text>
              </View>
              
              <View style={styles.modalActions}>
                <TouchableOpacity 
                  onPress={() => setLogoutModalVisible(false)}
                  style={styles.modalCancelButton}
                >
                  <Text style={styles.modalCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={handleLogout}
                  style={styles.logoutConfirmButton}
                >
                  <Text style={styles.logoutConfirmButtonText}>Logout</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </Portal>

      {/* Notification Modal */}
      <Portal>
        <Modal
          visible={notificationModalVisible}
          onDismiss={() => setNotificationModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.modalIcon}>
                  <WebCompatibleIcon name="notifications" size={24} color="#9B8A7D" />
                </View>
                <Text style={styles.modalTitle}>Notifications</Text>
                <TouchableOpacity 
                  onPress={() => setNotificationModalVisible(false)}
                  style={styles.closeButton}
                >
                  <WebCompatibleIcon name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.notificationModalContent}>
                {notifications.length > 0 ? (
                  <ScrollView style={styles.notificationsList} showsVerticalScrollIndicator={true}>
                    {notifications.map((notification, index) => (
                      <View key={index} style={styles.notificationItem}>
                        <View style={styles.notificationIcon}>
                          <WebCompatibleIcon name="info" size={16} color="#2196F3" />
                        </View>
                        <View style={styles.notificationContent}>
                          <Text style={styles.notificationTitle}>System Notification</Text>
                          <Text style={styles.notificationText}>{notification.message || 'New activity in the system'}</Text>
                          <Text style={styles.notificationTime}>Just now</Text>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                ) : (
                  <View style={styles.emptyNotifications}>
                    <WebCompatibleIcon name="notifications" size={48} color="#9CA3AF" />
                    <Text style={styles.emptyNotificationsText}>No new notifications</Text>
                    <Text style={styles.emptyNotificationsSubtext}>
                      You'll see important updates here when they arrive
                    </Text>
                  </View>
                )}
              </View>
              
              <View style={styles.modalActions}>
                <TouchableOpacity 
                  onPress={() => setNotificationModalVisible(false)}
                  style={styles.modalCancelButton}
                >
                  <Text style={styles.modalCancelButtonText}>Close</Text>
                </TouchableOpacity>
                {notifications.length > 0 && (
                  <TouchableOpacity 
                    onPress={() => {
                      setNotifications([]);
                      setNotificationModalVisible(false);
                    }}
                    style={styles.clearNotificationsButton}
                  >
                    <Text style={styles.clearNotificationsButtonText}>Clear All</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

// Main Reception Dashboard for Web
function ReceptionDashboardWeb({ navigation }: any) {
  console.log('🏢 ReceptionDashboardWeb: Component rendering with navigation props');
  console.log('🏢 ReceptionDashboardWeb: Navigation exists:', !!navigation);
  console.log('🏢 ReceptionDashboardWeb: Navigation.navigate exists:', !!(navigation && navigation.navigate));
  
  return <ReceptionPCLayout navigation={navigation} />;
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
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  backButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
  },
  notificationBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    minHeight: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  logoutButton: {
    padding: 8,
  },
  contentBody: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    padding: 40,
    paddingBottom: 120,
  },

  // Dashboard Content
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  dashboardScrollView: {
    flex: 1,
  },
  dashboardScrollContent: {
    padding: 40,
    paddingBottom: 120,
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
  
  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    gap: 32,
    marginBottom: 40,
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
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
    padding: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    elevation: 3,
    minHeight: 80,
  },
  quickActionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginLeft: 12,
  },

  // Search Section
  searchSection: {
    marginBottom: 40,
    maxWidth: 800,
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
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginRight: 12,
  },
  searchButton: {
    padding: 12,
    backgroundColor: '#9B8A7D',
    borderRadius: 6,
  },
  searchButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  searchResults: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
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

  // Recent Activity
  recentActivitySection: {
    marginBottom: 32,
    marginTop: 16,
    minHeight: 400,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  activityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  activityCount: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  activityList: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    elevation: 2,
    minHeight: 300,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#ffffff',
    borderRadius: 12,
  },
  modalContent: {
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalIcon: {
    marginRight: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 20,
  },
  closeButton: {
    padding: 5,
  },
  logoutModalContent: {
    marginBottom: 20,
  },
  logoutModalMessage: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  modalCancelButtonText: {
    color: '#374151',
    fontWeight: '500',
  },
  logoutConfirmButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#EF4444',
  },
  logoutConfirmButtonText: {
    color: '#ffffff',
    fontWeight: '500',
  },

  bottomPadding: {
    height: 100,
  },

  // ScrollView and Load More styles
  activityScrollContainer: {
    maxHeight: 400,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    marginTop: 10,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  loadMoreText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#9B8A7D',
    fontWeight: '500',
  },
  loadMoreTextDisabled: {
    color: '#9CA3AF',
  },

  // Notification Modal Styles
  notificationModalContent: {
    marginBottom: 20,
  },
  notificationsList: {
    maxHeight: 300,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  notificationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  notificationText: {
    fontSize: 12,
    color: '#4B5563',
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  emptyNotifications: {
    alignItems: 'center',
    padding: 40,
  },
  emptyNotificationsText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
    fontWeight: '500',
  },
  emptyNotificationsSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
  clearNotificationsButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#EF4444',
  },
  clearNotificationsButtonText: {
    color: '#ffffff',
    fontWeight: '500',
  },
});

// Profile-specific styles
const profileStyles = StyleSheet.create({
  tabsContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 20,
  },
  tabsScrollView: {
    flexDirection: 'row',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  activeTab: {
    backgroundColor: '#6B8E7F',
  },
  tabText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#6B8E7F',
  },
  activeTabText: {
    color: '#ffffff',
  },
  contentContainer: {
    flex: 1,
  },
  tabContent: {
    padding: 20,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 2,
  },
  clientAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  clientEmail: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 8,
  },
  clientStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  detailsSection: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 14,
    color: '#1F2937',
    flex: 1,
    textAlign: 'right',
  },
  subscriptionCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  subscriptionName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  subscriptionDetails: {
    gap: 8,
  },
  subscriptionDetail: {
    fontSize: 14,
    color: '#6B7280',
  },
  bookingCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bookingClass: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  bookingInstructor: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  bookingDateTime: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  bookingEquipment: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  bookingDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  paymentCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10B981',
  },
  paymentDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  paymentMethod: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  paymentPlan: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  noteCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  noteDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  noteContent: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  noteAuthor: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  activityCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: '#1F2937',
    marginBottom: 4,
  },
  activityDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  lifecycleCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    elevation: 2,
  },
  lifecycleStage: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  lifecycleRisk: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  lifecycleNotes: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 40,
    fontStyle: 'italic',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#9B8A7D',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    marginBottom: 40,
  },
  backButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  documentCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
  },
  documentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  documentInfo: {
    marginLeft: 12,
    flex: 1,
  },
  documentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  documentType: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  documentDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  documentMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  documentDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  documentUploader: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  sensitiveTag: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sensitiveText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  subscriptionActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: '#F9FAFB',
    marginBottom: 4,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  addClassButton: {
    borderColor: '#10B981',
  },
  removeClassButton: {
    borderColor: '#F59E0B',
  },
  pauseButton: {
    borderColor: '#6B7280',
  },
  resumeButton: {
    borderColor: '#10B981',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6B8E7F',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  closeButton: {
    padding: 5,
  },
  modalScrollView: {
    maxHeight: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34495e',
    marginTop: 15,
    marginBottom: 5,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#f8f9fa',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  picker: {
    width: '100%',
    padding: 12,
    backgroundColor: 'transparent',
    fontSize: 14,
  } as any,
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 5,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#6B8E7F',
    borderRadius: 4,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#6B8E7F',
  },
  checkmark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#34495e',
    fontWeight: '500',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 25,
    gap: 15,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#e74c3c',
  },
  createButton: {
    backgroundColor: '#6B8E7F',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  textArea: {
    height: 100,
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  formColumn: {
    flex: 1,
  },
  reminderSection: {
    marginBottom: 16,
  },
  fileInput: {
    display: 'none',
  },
  fileInputButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    marginTop: 5,
  },
  fileInputText: {
    fontSize: 14,
    color: '#6B8E7F',
    marginLeft: 8,
    fontWeight: '500',
  },
  hiddenInput: {
    display: 'none',
  },
  fileName: {
    fontSize: 12,
    color: '#6B8E7F',
    marginTop: 8,
    fontStyle: 'italic',
  },
  uploadButton: {
    backgroundColor: '#6B8E7F',
    padding: 12,
    borderRadius: 6,
    marginTop: 15,
  },
  uploadButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff5f5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  deleteButtonText: {
    color: '#dc3545',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  activityScrollView: {
    maxHeight: 400,
  },
  activityScrollContent: {
    paddingBottom: 20,
  },
  clickHint: {
    fontSize: 11,
    color: '#9B8A7D',
    fontStyle: 'italic',
    marginLeft: 8,
  },
});

export default ReceptionDashboardWeb; 