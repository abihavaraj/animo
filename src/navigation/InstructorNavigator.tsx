import { MaterialIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import ClassFeedback from '../screens/instructor/ClassFeedback';
import ClassManagement from '../screens/instructor/ClassManagement';
import InstructorDashboard from '../screens/instructor/InstructorDashboard';
import InstructorProfile from '../screens/instructor/InstructorProfile';
import ScheduleOverview from '../screens/instructor/ScheduleOverview';
import StudentProgress from '../screens/instructor/StudentProgress';
import StudentRoster from '../screens/instructor/StudentRoster';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function InstructorTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }: any) => ({
        tabBarIcon: ({ focused, color, size }: any) => {
          let iconName: keyof typeof MaterialIcons.glyphMap;

          if (route.name === 'Dashboard') {
            iconName = 'dashboard';
          } else if (route.name === 'Classes') {
            iconName = 'fitness-center';
          } else if (route.name === 'Schedule') {
            iconName = 'event';
          } else if (route.name === 'Students') {
            iconName = 'group';
          } else if (route.name === 'Profile') {
            iconName = 'person';
          } else {
            iconName = 'home';
          }

          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#9B8A7D',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={InstructorDashboard} />
      <Tab.Screen name="Classes" component={ClassManagement} />
      <Tab.Screen name="Schedule" component={ScheduleOverview} />
      <Tab.Screen name="Students" component={StudentRoster} />
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
        name="StudentProgress" 
        component={StudentProgress}
        options={{
          headerShown: true,
          title: 'Student Progress',
          headerStyle: { backgroundColor: '#9B8A7D' },
          headerTintColor: 'white',
        }}
      />
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