import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Text, View } from 'react-native';
import BookingHistory from '../screens/client/BookingHistory';
import ClassesView from '../screens/client/ClassesView';
import ClientDashboard from '../screens/client/ClientDashboard';
import ClientProfile from '../screens/client/ClientProfile';

const Tab = createBottomTabNavigator();

// Pilates-themed custom icon component
const PilatesIcon = ({ name, size, color }: { name: string; size: number; color: string }) => {
  const iconSize = size || 24;
  
  switch (name) {
    case 'dashboard':
      // Dashboard icon - Grid/chart style
      return (
        <View style={{ 
          width: iconSize, 
          height: iconSize, 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}>
          <View style={{ 
            width: iconSize - 4, 
            height: iconSize - 4, 
            borderWidth: 1.5, 
            borderColor: color,
            borderRadius: 3
          }}>
            <View style={{ 
              flex: 1, 
              flexDirection: 'row' 
            }}>
              <View style={{ 
                flex: 1, 
                borderRightWidth: 1, 
                borderRightColor: color,
                borderBottomWidth: 1,
                borderBottomColor: color,
                backgroundColor: color,
                opacity: 0.3
              }} />
              <View style={{ 
                flex: 1,
                borderBottomWidth: 1,
                borderBottomColor: color
              }} />
            </View>
            <View style={{ 
              flex: 1, 
              flexDirection: 'row' 
            }}>
              <View style={{ 
                flex: 1, 
                borderRightWidth: 1, 
                borderRightColor: color 
              }} />
              <View style={{ 
                flex: 1,
                backgroundColor: color,
                opacity: 0.3
              }} />
            </View>
          </View>
        </View>
      );
    
    case 'book':
      // Book/Calendar icon - Calendar with plus
      return (
        <View style={{ 
          width: iconSize, 
          height: iconSize, 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}>
          <View style={{ 
            width: iconSize - 2, 
            height: iconSize - 2, 
            borderWidth: 1.5, 
            borderColor: color,
            borderRadius: 3
          }}>
            {/* Calendar header */}
            <View style={{ 
              height: 6, 
              backgroundColor: color,
              borderTopLeftRadius: 2,
              borderTopRightRadius: 2
            }} />
            {/* Plus sign */}
            <View style={{ 
              flex: 1, 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <View style={{ 
                width: 8, 
                height: 1.5, 
                backgroundColor: color 
              }} />
              <View style={{ 
                width: 1.5, 
                height: 8, 
                backgroundColor: color,
                position: 'absolute'
              }} />
            </View>
          </View>
          {/* Calendar tabs */}
          <View style={{ 
            position: 'absolute', 
            top: 0, 
            left: 4, 
            width: 2, 
            height: 6, 
            backgroundColor: color 
          }} />
          <View style={{ 
            position: 'absolute', 
            top: 0, 
            right: 4, 
            width: 2, 
            height: 6, 
            backgroundColor: color 
          }} />
        </View>
      );

    case 'history':
      // History icon - Clock with arrow
      return (
        <View style={{ 
          width: iconSize, 
          height: iconSize, 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}>
          <View style={{ 
            width: iconSize - 2, 
            height: iconSize - 2, 
            borderWidth: 1.5, 
            borderColor: color,
            borderRadius: (iconSize - 2) / 2
          }}>
            {/* Clock hands */}
            <View style={{ 
              position: 'absolute', 
              top: '50%', 
              left: '50%', 
              width: 6, 
              height: 1.5, 
              backgroundColor: color,
              transform: [{ translateX: -3 }, { translateY: -0.75 }]
            }} />
            <View style={{ 
              position: 'absolute', 
              top: '50%', 
              left: '50%', 
              width: 1.5, 
              height: 4, 
              backgroundColor: color,
              transform: [{ translateX: -0.75 }, { translateY: -4 }]
            }} />
            {/* Center dot */}
            <View style={{ 
              position: 'absolute', 
              top: '50%', 
              left: '50%', 
              width: 2, 
              height: 2, 
              backgroundColor: color,
              borderRadius: 1,
              transform: [{ translateX: -1 }, { translateY: -1 }]
            }} />
          </View>
        </View>
      );

    case 'profile':
      // Profile icon - Person silhouette
      return (
        <View style={{ 
          width: iconSize, 
          height: iconSize, 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}>
          {/* Head */}
          <View style={{ 
            width: 8, 
            height: 8, 
            borderRadius: 4, 
            borderWidth: 1.5, 
            borderColor: color,
            marginBottom: 1
          }} />
          {/* Body */}
          <View style={{ 
            width: 14, 
            height: 10, 
            borderTopLeftRadius: 7, 
            borderTopRightRadius: 7,
            borderWidth: 1.5, 
            borderColor: color,
            borderBottomWidth: 0
          }} />
        </View>
      );

    default:
      return (
        <View style={{ 
          width: iconSize, 
          height: iconSize, 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}>
          <Text style={{ color, fontSize: 12 }}>?</Text>
        </View>
      );
  }
};

export default function ClientNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }: any) => ({
        tabBarIcon: ({ focused, color, size }: any) => {
          let iconName: string;

          if (route.name === 'Dashboard') {
            iconName = 'dashboard';
          } else if (route.name === 'Book') {
            iconName = 'book';
          } else if (route.name === 'History') {
            iconName = 'history';
          } else if (route.name === 'Profile') {
            iconName = 'profile';
          } else {
            iconName = 'dashboard';
          }

          console.log(`🎨 Rendering Pilates Icon: ${iconName} for ${route.name}, color: ${color}, size: ${size}`);

          return (
            <PilatesIcon 
              name={iconName} 
              size={size} 
              color={color} 
            />
          );
        },
        tabBarActiveTintColor: '#6B8E7F',
        tabBarInactiveTintColor: '#999999',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={ClientDashboard} />
      <Tab.Screen name="Book" component={ClassesView} />
      <Tab.Screen name="History" component={BookingHistory} />
      <Tab.Screen name="Profile" component={ClientProfile} />
    </Tab.Navigator>
  );
} 