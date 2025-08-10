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
  console.log('📱 [Background] Notification response received:', response);
  
  // You can add navigation logic here if needed
  const data = response.notification.request.content.data;
  if (data?.type === 'class_cancellation') {
    console.log('📱 [Background] User tapped cancellation notification');
    // Navigate to relevant screen when app opens
  }
});

// Handle notifications received while app is in foreground
Notifications.addNotificationReceivedListener(notification => {
  console.log('📱 [Foreground] Notification received:', notification);
  
  // This will show the notification banner even when app is open
  const data = notification.request.content.data;
  console.log('📱 [Foreground] Notification data:', data);
});

// Handle push notification registration
Notifications.addPushTokenListener(token => {
  console.log('📱 [Push Token] New push token received:', token.data);
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
      console.log('📢 [App] User is logged in, initializing notification services...');
      notificationService.initialize().catch(error => {
        console.error('❌ [App] Failed to initialize notification service:', error);
      });

      // Only initialize push notifications on mobile platforms
      if (Platform.OS !== 'web') {

        pushNotificationService.initialize().catch(error => {
          console.error('❌ [App] Failed to initialize push notifications:', error);
        });

        // Schedule class reminders for user's upcoming bookings

        pushNotificationService.scheduleClassReminders(user.id).catch(error => {
          console.error('❌ [App] Failed to schedule class reminders:', error);
        });
      } else {

      }
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
        console.log('🚀 [App] Initializing app...');
        
        // Create a fallback timeout to prevent app from getting stuck
        const initTimeout = setTimeout(() => {
          console.warn('⚠️ [App] Initialization timeout - forcing app to show');
          store.dispatch(authReady());
          setAppIsReady(true);
          SplashScreen.hideAsync().catch(console.error);
        }, 20000); // 20 second max wait time
        
        try {
          // Attempt to restore session automatically (like Instagram/WhatsApp)
          console.log('🔄 [App] Checking for existing session...');
          
          // Add timeout protection for the session restoration
          const sessionPromise = store.dispatch(restoreSession());
          const sessionTimeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Session restore timeout')), 15000)
          );
          
          await Promise.race([sessionPromise, sessionTimeout]);
          console.log('✅ [App] Session restoration completed');
          
        } catch (sessionError) {
          console.warn('⚠️ [App] Session restoration failed/timeout:', sessionError);
          // Continue anyway - user will see login screen
        }
        
        // Clear the fallback timeout since we completed normally
        clearTimeout(initTimeout);
        console.log('✅ [App] App initialization complete');
        
      } catch (error) {
        console.error('❌ [App] Error during app initialization:', error);
        // Even if there's an error, we should still show the app
      } finally {
        // Always mark auth as ready and hide splash screen
        store.dispatch(authReady());
        setAppIsReady(true);
        
        try {
          await SplashScreen.hideAsync();
          console.log('🎯 [App] Splash screen hidden, app ready');
        } catch (splashError) {
          console.error('⚠️ [App] Error hiding splash screen:', splashError);
        }
      }
    }

    initializeApp();
  }, []);

  // Handle app state changes (foreground/background)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log('📱 [App] App state changed to:', nextAppState);
      
      // When app comes to foreground, validate session if user is logged in
      if (nextAppState === 'active') {
        const currentState = store.getState();
        if (currentState.auth.isLoggedIn) {
          console.log('🔄 [App] App became active - Supabase handles session refresh automatically');
          
          // Optionally refresh user profile (non-blocking)
          console.log('🔄 [App] Refreshing user profile on app activation');
          store.dispatch(loadUserProfile()).catch((error: any) => {
            console.warn('⚠️ [App] Profile refresh failed (non-critical):', error);
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