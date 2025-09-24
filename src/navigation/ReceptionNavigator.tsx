import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import EidMubarakThemeProvider from '../components/EidMubarakThemeProvider';
import { ThemeProvider } from '../contexts/ThemeContext';
import ReceptionDashboardWeb from '../screens/ReceptionDashboardWeb';
import ReceptionReports from '../screens/ReceptionReports';
import PCClassManagement from '../screens/admin/PCClassManagement';
import ReceptionClientProfile from '../screens/admin/ReceptionClientProfile';
import ReceptionInstructorProfile from '../screens/admin/ReceptionInstructorProfile';
import SubscriptionPlans from '../screens/admin/SubscriptionPlans';

const Stack = createStackNavigator();

function ReceptionNavigator() {
  return (
    <ThemeProvider>
      <EidMubarakThemeProvider>
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
            name="InstructorProfile" 
            component={ReceptionInstructorProfile}
            options={({ route }) => ({
              headerShown: true,
              title: `${(route.params as any)?.userName || 'Instructor'} Profile`,
              headerStyle: { backgroundColor: '#9B8A7D' },
              headerTintColor: '#fff',
              headerTitleStyle: { fontWeight: 'bold' },
            })}
          />
          <Stack.Screen 
            name="Classes" 
            component={PCClassManagement}
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
      </EidMubarakThemeProvider>
    </ThemeProvider>
  );
}

export default ReceptionNavigator; 