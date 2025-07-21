import { MaterialIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useEffect, useState } from 'react';
import { Dimensions, Text, TouchableOpacity, View } from 'react-native';
import { useDispatch } from 'react-redux';
import AdminClassManagement from '../screens/admin/AdminClassManagement';
import AdminDashboard from '../screens/admin/AdminDashboard';
import AssignmentHistory from '../screens/admin/AssignmentHistory';
import EnhancedClientProfile from '../screens/admin/EnhancedClientProfile';
import NotificationTestScreen from '../screens/admin/NotificationTestScreen';
import PCClassManagement from '../screens/admin/PCClassManagement';
import PCSubscriptionPlans from '../screens/admin/PCSubscriptionPlans';
import PCUserManagement from '../screens/admin/PCUserManagement';
import ReportsAnalytics from '../screens/admin/ReportsAnalytics';
import SubscriptionPlans from '../screens/admin/SubscriptionPlans';
import SystemSettings from '../screens/admin/SystemSettings';
import UserManagement from '../screens/admin/UserManagement';
import { apiService } from '../services/api';
import { logout } from '../store/authSlice';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const { width: screenWidth } = Dimensions.get('window');
const isLargeScreen = screenWidth > 1024;

// PC Sidebar Component
function AdminSidebar({ activeScreen, onNavigate, stats }: any) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const dispatch = useDispatch();

  useEffect(() => {
    loadInitialNotifications();
  }, []);

  const loadInitialNotifications = async () => {
    try {
      console.log('🔔 Loading initial notifications...');
      const userStatsResponse = await apiService.get('/api/notifications/recent');
      console.log('🔔 Notifications API response:', userStatsResponse);
      
      if (userStatsResponse.success && userStatsResponse.data) {
        console.log('🔔 Loaded real notifications:', userStatsResponse.data);
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

  const handleNotificationPress = async () => {
    try {
      console.log('🔔 Notification button pressed, loading notifications...');
      
      const userStatsResponse = await apiService.get('/api/notifications/recent');
      console.log('🔔 Notification button - API response:', userStatsResponse);
      
      if (userStatsResponse.success && userStatsResponse.data) {
        const notificationsData = Array.isArray(userStatsResponse.data) ? userStatsResponse.data : [];
        console.log('🔔 Notification button - Setting notifications:', notificationsData);
        setNotifications(notificationsData);
      } else {
        console.log('🔔 Notification button - API failed, keeping existing notifications');
      }
      
      setNotificationModalVisible(true);
    } catch (error) {
      console.error('🔔 Error handling notification press:', error);
      setNotificationModalVisible(true);
    }
  };

  const handleSettingsPress = () => {
    console.log('🔧 Settings button pressed!');
    setSettingsModalVisible(true);
  };

  const handleLogout = () => {
    console.log('🚪 Admin user logging out...');
    setLogoutModalVisible(false);
    dispatch(logout());
  };

  const showLogoutConfirmation = () => {
    console.log('🚪 Showing logout confirmation...');
    setLogoutModalVisible(true);
  };

  const menuItems = [
    { key: 'Dashboard', label: 'Dashboard', icon: 'dashboard' },
    { key: 'Users', label: 'User Management', icon: 'people' },
    { key: 'Classes', label: 'Class Management', icon: 'calendar-today' },
    { key: 'Plans', label: 'Subscription Plans', icon: 'card-membership' },
    { key: 'Reports', label: 'Reports & Analytics', icon: 'assessment' },
    { key: 'Notifications', label: 'Notifications', icon: 'notifications' },
    { key: 'Settings', label: 'System Settings', icon: 'build' },
  ];

  return (
    <View style={styles.sidebar}>
      {/* Sidebar Header */}
      <View style={styles.sidebarHeader}>
        <View style={styles.logoContainer}>
          <MaterialIcons name="fitness-center" size={32} color="#9B8A7D" />
          <View>
            <Text style={styles.sidebarTitle}>ANIMO Studio</Text>
            <Text style={styles.sidebarSubtitle}>Administrator Portal</Text>
          </View>
        </View>
      </View>

      {/* Sidebar Menu */}
      <View style={styles.sidebarMenu}>
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
              size={20} 
              color={activeScreen === item.key ? '#ffffff' : '#6B7280'} 
            />
            <View style={styles.sidebarItemContent}>
              <Text style={[
                styles.sidebarItemText,
                activeScreen === item.key && styles.sidebarItemTextActive
              ]}>
                {item.label}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Sidebar Footer */}
      <View style={styles.sidebarFooter}>
        <TouchableOpacity 
          style={styles.notificationButton}
          onPress={handleNotificationPress}
        >
          <MaterialIcons name="notifications" size={24} color="#666" />
          {notifications.filter((n: any) => !n.read).length > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>
                {notifications.filter((n: any) => !n.read).length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={handleSettingsPress}
        >
          <MaterialIcons name="settings" size={24} color="#666" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={showLogoutConfirmation}
        >
          <MaterialIcons name="logout" size={24} color="#666" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// PC Layout Container
function AdminPCLayout({ navigation }: any) {
  const [activeScreen, setActiveScreen] = useState('Dashboard');
  const [screenDimensions, setScreenDimensions] = useState(Dimensions.get('window'));
  const [stats, setStats] = useState({
    totalClients: 0,
    todayClasses: 0,
    pendingBookings: 0,
    activeSubscriptions: 0
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenDimensions(window);
    });
    
    return () => subscription?.remove();
  }, []);

  const handleNavigate = (screenKey: string) => {
    console.log('🏢 Admin navigating to:', screenKey);
    setActiveScreen(screenKey);
  };

  const renderMainContent = () => {
    switch (activeScreen) {
      case 'Users':
        return <PCUserManagement navigation={navigation} />;
      case 'Classes':
        return <PCClassManagement />;
      case 'Plans':
        return <PCSubscriptionPlans />;
      case 'Reports':
        return <ReportsAnalytics />;
      case 'Notifications':
        return <NotificationTestScreen />;
      case 'Settings':
        return <SystemSettings />;
      case 'Dashboard':
      default:
        return (
          <AdminDashboard 
            navigation={navigation} 
            onNavigate={handleNavigate}
            onStatsUpdate={(newStats: any) => setStats(newStats)}
          />
        );
    }
  };

  // Use mobile layout if screen is too small
  if (screenDimensions.width < 1024) {
    return (
      <View style={styles.mobileContainer}>
        <Text style={styles.mobileWarning}>
          📱 Admin Portal is optimized for desktop use. 
          Please use a larger screen for the best experience.
        </Text>
        {renderMainContent()}
      </View>
    );
  }

  return (
    <View style={styles.pcContainer}>
      <AdminSidebar 
        activeScreen={activeScreen} 
        onNavigate={handleNavigate}
        stats={stats}
      />
      <View style={styles.mainContent}>
        <View style={styles.contentHeader}>
          <Text style={styles.contentTitle}>{activeScreen}</Text>
        </View>
        <View style={styles.contentBody}>
          {renderMainContent()}
        </View>
      </View>
    </View>
  );
}

function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof MaterialIcons.glyphMap;
          const routeName = route.name;

          switch (routeName) {
            case 'Dashboard':
              iconName = 'dashboard';
              break;
            case 'Users':
              iconName = 'people';
              break;
            case 'Classes':
              iconName = 'calendar-today';
              break;
            case 'Plans':
              iconName = 'card-membership';
              break;
            case 'Reports':
              iconName = 'assessment';
              break;
            case 'Settings':
              iconName = 'build';
              break;
            case 'Notifications':
              iconName = 'notifications';
              break;
            default:
              iconName = 'circle';
          }

          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#9B8A7D',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={AdminDashboard} />
      <Tab.Screen name="Users" component={UserManagement} />
      <Tab.Screen name="Classes" component={AdminClassManagement} />
      <Tab.Screen name="Plans" component={SubscriptionPlans} />
      <Tab.Screen name="Reports" component={ReportsAnalytics} />
      <Tab.Screen name="Notifications" component={NotificationTestScreen} />
      <Tab.Screen name="Settings" component={SystemSettings} />
    </Tab.Navigator>
  );
}

function AdminNavigator() {
  // Use PC layout for large screens, mobile tabs for small screens
  if (isLargeScreen) {
    return (
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#9B8A7D',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen 
          name="AdminMain" 
          component={AdminPCLayout} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="ClientProfile" 
          component={EnhancedClientProfile}
          options={({ route }) => ({
            title: `${(route.params as any)?.userName || 'Client'} Profile`,
            presentation: 'modal',
          })}
        />
        <Stack.Screen 
          name="AssignmentHistory" 
          component={AssignmentHistory}
          options={{
            title: 'Assignment History',
            presentation: 'modal',
          }}
        />
      </Stack.Navigator>
    );
  }

  // Mobile layout with tabs
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#9B8A7D',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="AdminMain" 
        component={AdminTabs} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="ClientProfile" 
        component={EnhancedClientProfile}
        options={({ route }) => ({
          title: `${(route.params as any)?.userName || 'Client'} Profile`,
          presentation: 'modal',
        })}
      />
      <Stack.Screen 
        name="AssignmentHistory" 
        component={AssignmentHistory}
        options={{
          title: 'Assignment History',
          presentation: 'modal',
        }}
      />
    </Stack.Navigator>
  );
}

const styles = {
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
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  sidebarBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  sidebarFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  settingsButton: {
    padding: 8,
  },
  logoutButton: {
    padding: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },

  // Main Content
  mainContent: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  contentHeader: {
    padding: 24,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  contentTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  contentBody: {
    flex: 1,
    padding: 24,
  },
} as const;

export default AdminNavigator; 