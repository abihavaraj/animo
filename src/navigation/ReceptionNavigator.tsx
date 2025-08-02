import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import ReceptionDashboardWeb from '../screens/ReceptionDashboardWeb';
import ReceptionClientProfile from '../screens/admin/ReceptionClientProfile';

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
    </Stack.Navigator>
  );
}

export default ReceptionNavigator; 