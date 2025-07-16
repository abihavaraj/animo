import { MaterialIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import AdminClassManagement from '../screens/admin/AdminClassManagement';
import AdminDashboard from '../screens/admin/AdminDashboard';
import AssignmentHistory from '../screens/admin/AssignmentHistory';
import EnhancedClientProfile from '../screens/admin/EnhancedClientProfile';
import NotificationTestScreen from '../screens/admin/NotificationTestScreen';
import ReportsAnalytics from '../screens/admin/ReportsAnalytics';
import SubscriptionPlans from '../screens/admin/SubscriptionPlans';
import SystemSettings from '../screens/admin/SystemSettings';
import UserManagement from '../screens/admin/UserManagement';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

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

export default AdminNavigator; 