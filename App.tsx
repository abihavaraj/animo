import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { registerRootComponent } from 'expo';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';

import { useSelector } from 'react-redux';
import ErrorBoundary from './src/components/ErrorBoundary';
import AuthNavigator from './src/navigation/AuthNavigator';
import MainNavigator from './src/navigation/MainNavigator';
import { pushNotificationService } from './src/services/pushNotificationService';
import { RootState, store } from './src/store';

const Stack = createStackNavigator();

function AppContent() {
  const { isLoggedIn, user } = useSelector((state: RootState) => state.auth);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const prevIsLoggedIn = useRef(isLoggedIn);

  // Handle logout transition to prevent infinite loops
  useEffect(() => {
    if (prevIsLoggedIn.current === true && isLoggedIn === false) {
      // User just logged out, set transitioning state
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setIsTransitioning(false);
      }, 100); // Short delay to allow state to settle
      
      return () => clearTimeout(timer);
    }
    prevIsLoggedIn.current = isLoggedIn;
  }, [isLoggedIn]);

  // Initialize push notifications when user logs in
  useEffect(() => {
    let isMounted = true;
    
    if (isLoggedIn && !isTransitioning && isMounted) {
      // Add a small delay to prevent immediate re-renders during auth transitions
      const initializeNotifications = async () => {
        try {
          await pushNotificationService.initialize();
          if (isMounted) {
            pushNotificationService.setupNotificationListeners();
          }
        } catch (error) {
          console.error('Failed to initialize push notifications:', error);
        }
      };
      
      // Delay initialization to prevent conflicts with logout transitions
      const timeoutId = setTimeout(initializeNotifications, 100);
      
      return () => {
        clearTimeout(timeoutId);
        isMounted = false;
      };
    }
    
    return () => {
      isMounted = false;
    };
  }, [isLoggedIn, isTransitioning]);

  // Debug logging for navigation state
  useEffect(() => {
    if (__DEV__) {
      console.log('🧭 Navigation state changed:', {
        isLoggedIn,
        isTransitioning,
        userRole: user?.role || 'none'
      });
    }
  }, [isLoggedIn, isTransitioning, user?.role]);

  // During transition, don't render anything to prevent loops
  if (isTransitioning) {
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isLoggedIn ? (
          <Stack.Screen name="Main" component={MainNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <SafeAreaProvider>
          <PaperProvider>
            <StatusBar style="auto" />
            <AppContent />
          </PaperProvider>
        </SafeAreaProvider>
      </Provider>
    </ErrorBoundary>
  );
}

// Register the main component
registerRootComponent(App);

export default App; 