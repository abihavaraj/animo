import { NavigationContainer } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useState } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { DefaultTheme, Provider as PaperProvider, configureFonts } from 'react-native-paper';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider, useSelector } from 'react-redux';

import ErrorBoundary from './src/components/ErrorBoundary';
import WebCompatibleIcon from './src/components/WebCompatibleIcon';
import { supabase } from './src/config/supabase.config';
import MainNavigator from './src/navigation/MainNavigator';
import LoginScreen from './src/screens/LoginScreen';
import { notificationService } from './src/services/notificationService';
import { pushNotificationService } from './src/services/pushNotificationService';
import { RootState, store } from './src/store';
import { authReady, loadUserProfile, restoreSession } from './src/store/authSlice';


// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Set up notification handler for when app is in background/closed
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Handle background notification responses (when user taps notification while app is closed)
Notifications.addNotificationResponseReceivedListener(response => {
  // You can add navigation logic here if needed
  const data = response.notification.request.content.data;
  if (data?.type === 'class_cancellation') {
    // Navigate to relevant screen when app opens
  }
});

// Handle notifications received while app is in foreground
Notifications.addNotificationReceivedListener(notification => {
  // This will show the notification banner even when app is open
  const data = notification.request.content.data;
  
  // Clear badge immediately when notification is received while app is open
  // This prevents the red dot from persisting when users see the notification
  try {
    Notifications.setBadgeCountAsync(0);
  } catch (error) {
    console.error('Failed to clear badge count:', error);
  }
});

// Configure React Native Paper theme
const paperTheme = {
  ...DefaultTheme,
  fonts: configureFonts({ config: {} }),
};

// Custom icon provider for React Native Paper
const webCompatibleIconProvider = (props: any) => {
  return <WebCompatibleIcon {...props} />;
};

function AppContent() {
  const { isLoggedIn, isLoading, user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (isLoggedIn && user?.id) {
      // Initialize notification service for all platforms (handles web vs native internally)
      notificationService.initialize().catch(error => {
        // Silent error handling for production
      });

      // Only initialize push notifications on mobile platforms
      if (Platform.OS !== 'web') {

        pushNotificationService.initialize().catch(error => {
          // Silent error handling for production
        });

        // Schedule class reminders for user's upcoming bookings
        // NOTE: Disabled to prevent duplicate scheduling - reminders are now scheduled per booking in bookingService
        // pushNotificationService.scheduleClassReminders(user.id).catch(error => {
        //   console.error('❌ [App] Failed to schedule class reminders:', error);
        // });
      } else {

      }

      // Handle push notification registration
      const tokenListener = Notifications.addPushTokenListener(async token => {
        // Store token in Supabase when received
        if (user?.id && token.data) {
          try {
            // First, clean up any existing tokens for this device to prevent cross-user notifications
            await supabase
              .from('push_tokens')
              .delete()
              .eq('token', token.data);
            
            // Then store the new token for the current user
            const { error } = await supabase
              .from('push_tokens')
              .insert({
                user_id: user.id,
                token: token.data,
                device_type: Platform.OS,
                created_at: new Date().toISOString()
              });
            
            if (error) {
              // Silent error handling for production
            }
          } catch (error) {
            // Silent error handling for production
          }
        }
      });

      return () => {
        tokenListener.remove();
      };
    }
  }, [isLoggedIn, user?.id]);

  // Show splash screen while checking session
  if (isLoading) {
    return null;
  }
  
  return (
    <PaperProvider theme={paperTheme} settings={{ icon: webCompatibleIconProvider }}>
      <ErrorBoundary>
        {isLoggedIn ? (
          <NavigationContainer>
            <MainNavigator />
          </NavigationContainer>
        ) : (
          <LoginScreen />
        )}
      </ErrorBoundary>
    </PaperProvider>
  );
}

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function initializeApp() {
      try {
        // Create a fallback timeout to prevent app from getting stuck
        const initTimeout = setTimeout(() => {
          store.dispatch(authReady());
          setAppIsReady(true);
          SplashScreen.hideAsync().catch(() => {});
        }, 20000); // 20 second max wait time
        
        try {
          // Attempt to restore session automatically (like Instagram/WhatsApp)
          
          // Add timeout protection for the session restoration
          const sessionPromise = store.dispatch(restoreSession());
          const sessionTimeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Session restore timeout')), 15000)
          );
          
          await Promise.race([sessionPromise, sessionTimeout]);
          
        } catch (sessionError) {
          // Continue anyway - user will see login screen
        }
        
        // Clear the fallback timeout since we completed normally
        clearTimeout(initTimeout);
        
      } catch (error) {
        // Even if there's an error, we should still show the app
      } finally {
        // Always mark auth as ready and hide splash screen
        store.dispatch(authReady());
        setAppIsReady(true);
        
        try {
          await SplashScreen.hideAsync();
        } catch (splashError) {
          // Silent error handling for production
        }
      }
    }

    initializeApp();
  }, []);

  // Handle app state changes (foreground/background)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      // When app comes to foreground, validate session if user is logged in
      if (nextAppState === 'active') {
        const currentState = store.getState();
        if (currentState.auth.isLoggedIn) {
          // Optionally refresh user profile (non-blocking)
          store.dispatch(loadUserProfile()).catch(() => {
            // Silent error handling for production
          });

          // Clear app icon badge when app is opened
          try {
            Notifications.setBadgeCountAsync(0);
          } catch {}
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  // Don't render anything until app is ready
  if (!appIsReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <Provider store={store}>
        <AppContent />
      </Provider>
    </SafeAreaProvider>
  );
}