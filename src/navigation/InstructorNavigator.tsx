import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ClassDetails from '../screens/instructor/ClassDetails';
import ClassFeedback from '../screens/instructor/ClassFeedback';

import InstructorDashboard from '../screens/instructor/InstructorDashboard';
import InstructorProfile from '../screens/instructor/InstructorProfile';
import MyClients from '../screens/instructor/MyClients';
import ScheduleOverview from '../screens/instructor/ScheduleOverview';

// ExpoGO-compatible icon component
const SafeIcon = ({ name, size, color }: { name: string; size: number; color: string }) => {
  // Always use emoji fallbacks for ExpoGO compatibility
  const iconText = {
    'dashboard': '📊',
    'fitness-center': '🏋️',
    'event': '📅',
    'person': '👤',
    'home': '🏠',
    'group': '👥'
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

// Custom Tab Bar Component for Instructor
const InstructorCustomTabBar = ({ state, descriptors, navigation }: any) => {
  const insets = useSafeAreaInsets();
  
  const tabBarHeight = Platform.OS === 'android' ? 60 + insets.bottom : 60;
  const paddingBottom = Platform.OS === 'android' ? Math.max(8, insets.bottom) : 8;

  return (
    <View style={{
      flexDirection: 'row',
      backgroundColor: '#ffffff',
      borderTopWidth: 1,
      borderTopColor: '#e0e0e0',
      height: tabBarHeight,
      paddingBottom: paddingBottom,
      paddingTop: 8,
      position: 'relative',
      elevation: Platform.OS === 'android' ? 8 : 0,
      shadowColor: Platform.OS === 'ios' ? '#000' : 'transparent',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: Platform.OS === 'ios' ? 0.1 : 0,
      shadowRadius: Platform.OS === 'ios' ? 3 : 0,
    }}>
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel !== undefined ? options.tabBarLabel : 
                     options.title !== undefined ? options.title : route.name;

        const isFocused = state.index === index;
        
        let iconName: string;
        if (route.name === 'Dashboard') {
          iconName = 'dashboard';
        } else if (route.name === 'Schedule') {
          iconName = 'event';
        } else if (route.name === 'My Clients') {
          iconName = 'group';
        } else if (route.name === 'Profile') {
          iconName = 'person';
        } else {
          iconName = 'home';
        }

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 4,
            }}
          >
            <SafeIcon
              name={iconName}
              size={24}
              color={isFocused ? '#9B8A7D' : 'gray'}
            />
            <Text style={{
              color: isFocused ? '#9B8A7D' : 'gray',
              fontSize: 12,
              marginTop: 2,
              fontWeight: isFocused ? '600' : '400',
            }}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

function InstructorTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => <InstructorCustomTabBar {...props} />}
    >
      <Tab.Screen name="Dashboard" component={InstructorDashboard} />
      <Tab.Screen name="Schedule" component={ScheduleOverview} />
      <Tab.Screen name="My Clients" component={MyClients} />
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
        name="ClassDetails" 
        component={ClassDetails}
        options={{
          headerShown: true,
          title: 'Class Details',
          headerStyle: { backgroundColor: '#6B8E7F' }, // Same green as dashboard header
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