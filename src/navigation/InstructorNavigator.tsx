import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { Text, View } from 'react-native';
import ClassFeedback from '../screens/instructor/ClassFeedback';

import InstructorDashboard from '../screens/instructor/InstructorDashboard';
import InstructorProfile from '../screens/instructor/InstructorProfile';
import ScheduleOverview from '../screens/instructor/ScheduleOverview';

// ExpoGO-compatible icon component
const SafeIcon = ({ name, size, color }: { name: string; size: number; color: string }) => {
  // Always use emoji fallbacks for ExpoGO compatibility
  const iconText = {
    'dashboard': '📊',
    'fitness-center': '🏋️',
    'event': '📅',
    'person': '👤',
    'home': '🏠'
  }[name] || '❓';
  
  return (
    <View style={{ 
      width: size, 
      height: size, 
      alignItems: 'center', 
      justifyContent: 'center' 
    }}>
      <Text style={{ fontSize: size * 0.8, color }}>{iconText}</Text>
    </View>
  );
};


const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function InstructorTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }: any) => ({
        tabBarIcon: ({ focused, color, size }: any) => {
          let iconName: string;

          if (route.name === 'Dashboard') {
            iconName = 'dashboard';
          } else if (route.name === 'Schedule') {
            iconName = 'event';
          } else if (route.name === 'Profile') {
            iconName = 'person';
          } else {
            iconName = 'home';
          }

          return <SafeIcon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#9B8A7D',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={InstructorDashboard} />
      <Tab.Screen name="Schedule" component={ScheduleOverview} />
      <Tab.Screen name="Profile" component={InstructorProfile} />
    </Tab.Navigator>
  );
}

function InstructorNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="InstructorTabs" component={InstructorTabs} />

      <Stack.Screen 
        name="ClassFeedback" 
        component={ClassFeedback}
        options={{
          headerShown: true,
          title: 'Class Feedback',
          headerStyle: { backgroundColor: '#9B8A7D' },
          headerTintColor: 'white',
        }}
      />
    </Stack.Navigator>
  );
}

export default InstructorNavigator; 