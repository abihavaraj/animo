import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Platform, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ChristmasTabBarDecoration from '../components/animations/ChristmasTabBarDecoration';
import { useTheme } from '../contexts/ThemeContext';
import { useThemeColor } from '../hooks/useDynamicThemeColor';
import BookingHistory from '../screens/client/BookingHistory';
import ClassesView from '../screens/client/ClassesView';
import ClientDashboard from '../screens/client/ClientDashboard';
import ClientProfile from '../screens/client/ClientProfile';
import EditProfile from '../screens/client/EditProfile';
import NotificationsView from '../screens/client/NotificationsView';


const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Animated Heart Component
const AnimatedHeart = () => {
  const { currentTheme } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    const pulseAnimation = () => {
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.6,
            duration: 1200,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        // Loop the animation
        setTimeout(pulseAnimation, 500);
      });
    };

    pulseAnimation();
  }, [scaleAnim, opacityAnim]);

  const heartColor = currentTheme?.name === 'womens_day' ? '#D4719A' : '#FF6B9D';
  const isVisible = currentTheme?.name === 'womens_day';

  return (
    <View style={{
      alignItems: 'center',
      justifyContent: 'center',
      width: 40,
      height: 40,
      opacity: isVisible ? 1 : 0,
      pointerEvents: isVisible ? 'auto' : 'none',
    }}>
      {/* Background circle for better visibility */}
      <Animated.View
        style={{
          position: 'absolute',
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: currentTheme?.name === 'womens_day' ? 'rgba(212, 113, 154, 0.1)' : 'rgba(255, 107, 157, 0.1)',
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        }}
      />
      
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{
          fontSize: 28,
          color: heartColor,
          textShadowColor: 'rgba(255, 107, 157, 0.4)',
          textShadowOffset: { width: 0, height: 2 },
          textShadowRadius: 6,
        }}>
          💖
        </Text>
      </Animated.View>
      
      {/* Enhanced glow effect for Women's Day theme */}
      {currentTheme?.name === 'womens_day' && (
        <Animated.View
          style={{
            position: 'absolute',
            width: 32,
            height: 32,
            backgroundColor: '#D4719A',
            borderRadius: 16,
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }],
            zIndex: -2,
          }}
        />
      )}
    </View>
  );
};

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

// Custom Tab Bar Component
const CustomTabBar = ({ state, descriptors, navigation }: any) => {
  try {
    const insets = useSafeAreaInsets();
    const { currentTheme } = useTheme();
    
    // Use dynamic theme colors
    const backgroundColor = useThemeColor({}, 'surface');
  const borderColor = useThemeColor({}, 'border');
  const activeColor = useThemeColor({}, 'tabIconSelected'); // Use tabIconSelected for better visibility
  const inactiveColor = useThemeColor({}, 'textSecondary'); // Use textSecondary instead of textMuted for better contrast
  
  
  const tabBarHeight = Platform.OS === 'android' ? 70 + insets.bottom : 70;
  const paddingBottom = Platform.OS === 'android' ? Math.max(12, insets.bottom) : 12;
  
  // Check if Christmas theme is active
  const isChristmasTheme = currentTheme && (
    currentTheme.name.includes('christmas') ||
    currentTheme.name.includes('Christmas') ||
    currentTheme.display_name?.includes('🎄') ||
    currentTheme.display_name?.includes('Christmas') ||
    currentTheme.display_name?.includes('christmas')
  );

  return (
    <View style={{
      flexDirection: 'row',
      backgroundColor: backgroundColor,
      borderTopWidth: 1,
      borderTopColor: borderColor,
      height: tabBarHeight,
      paddingBottom: paddingBottom,
      paddingTop: 8,
      position: 'relative',
      // Ensure tab bar appears above Android navigation
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
        } else if (route.name === 'Book') {
          iconName = 'book';
        } else if (route.name === 'History') {
          iconName = 'history';
        } else if (route.name === 'Profile') {
          iconName = 'profile';
        } else {
          iconName = 'dashboard';
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
            <PilatesIcon
              name={iconName}
              size={24}
              color={isFocused ? activeColor : inactiveColor}
            />
            <Text style={{
              color: isFocused ? activeColor : inactiveColor,
              fontSize: 12,
              marginTop: 2,
              fontWeight: isFocused ? '600' : '400',
            }}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
      
      {/* Christmas Decorations */}
      <ChristmasTabBarDecoration isVisible={isChristmasTheme} />
      
      {/* Animated Heart positioned between Book and History */}
      <View style={{
        position: 'absolute',
        left: '50%',
        marginLeft: -20,
        top: -12,
        width: 40,
        height: 40,
        zIndex: 10,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <AnimatedHeart />
      </View>
    </View>
    );
  } catch (error) {
    console.error('❌ CRASH in CustomTabBar:', error);
    return (
      <View style={{ height: 70, backgroundColor: 'orange', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'white', fontSize: 16 }}>TabBar Error: {String(error)}</Text>
      </View>
    );
  }
};

// Tab Navigator Component
const ClientTabNavigator = () => {
  try {
    const { t } = useTranslation();
    
    return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={ClientDashboard}
        options={{ tabBarLabel: t('navigation.home') }}
      />
      <Tab.Screen 
        name="Book" 
        component={ClassesView}
        options={{ tabBarLabel: t('navigation.classes') }}
      />
      <Tab.Screen 
        name="History" 
        component={BookingHistory}
        options={{ tabBarLabel: t('navigation.bookings') }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ClientProfile}
        options={{ tabBarLabel: t('navigation.profile') }}
      />
    </Tab.Navigator>
    );
  } catch (error) {
    console.error('❌ CRASH in ClientTabNavigator:', error);
    return (
      <View style={{ flex: 1, backgroundColor: 'red', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'white', fontSize: 20, textAlign: 'center' }}>
          ERROR in ClientTabNavigator:{'\n'}{String(error)}
        </Text>
      </View>
    );
  }
};

export default function ClientNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ClientMain" component={ClientTabNavigator} />
      <Stack.Screen 
        name="EditProfile" 
        component={EditProfile}
        options={{
          headerShown: true,
          title: 'Edit Profile',
          headerStyle: {
            backgroundColor: '#6B8E7F',
          },
          headerTintColor: '#ffffff',
        }}
      />
      <Stack.Screen 
        name="ApiTest" 
        component={ClientDashboard}
        options={{
          headerShown: true,
          title: '🔧 API Configuration Test',
          headerStyle: {
            backgroundColor: '#6B8E7F',
          },
          headerTintColor: '#ffffff',
        }}
      />
      <Stack.Screen 
        name="Notifications" 
        component={NotificationsView}
        options={{
          headerShown: true,
          title: '🔔 Notifications',
          headerStyle: {
            backgroundColor: '#6B8E7F',
          },
          headerTintColor: '#ffffff',
        }}
      />

    </Stack.Navigator>
  );
} 