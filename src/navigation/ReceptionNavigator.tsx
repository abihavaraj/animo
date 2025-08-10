import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import ReceptionDashboardWeb from '../screens/ReceptionDashboardWeb';
import ReceptionReports from '../screens/ReceptionReports';
import AdminClassManagement from '../screens/admin/AdminClassManagement';
import ReceptionClientProfile from '../screens/admin/ReceptionClientProfile';
import SubscriptionPlans from '../screens/admin/SubscriptionPlans';

const Stack = createStackNavigator();

function ReceptionNavigator() {
  console.log('🏢 ReceptionNavigator: Rendering reception navigation with modern ReceptionClientProfile');
  
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ReceptionDashboard" component={ReceptionDashboardWeb} />
      <Stack.Screen 
        name="ClientProfile" 
        component={ReceptionClientProfile}
        options={({ route }) => ({
          headerShown: true,
          title: `${(route.params as any)?.userName || 'Client'} Profile`,
          headerStyle: { backgroundColor: '#9B8A7D' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        })}
      />
      <Stack.Screen 
        name="Classes" 
        component={AdminClassManagement}
        options={{
          headerShown: true,
          title: 'Class Management',
          headerStyle: { backgroundColor: '#9B8A7D' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      <Stack.Screen 
        name="Plans" 
        component={SubscriptionPlans}
        options={{
          headerShown: true,
          title: 'Subscription Plans',
          headerStyle: { backgroundColor: '#9B8A7D' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      <Stack.Screen 
        name="Reports" 
        component={ReceptionReports}
        options={{
          headerShown: true,
          title: 'Reports & Analytics',
          headerStyle: { backgroundColor: '#9B8A7D' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
    </Stack.Navigator>
  );
}

export default ReceptionNavigator; 