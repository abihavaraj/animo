import { NavigationContainer } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useState } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { DefaultTheme, Provider as PaperProvider, configureFonts } from 'react-native-paper';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider, useSelector } from 'react-redux';
import './src/i18n'; // Initialize i18n

import AdvancedNewYearWrapper from './src/components/AdvancedNewYearWrapper';
import AdvancedPinkOctoberWrapper from './src/components/AdvancedPinkOctoberWrapper';
import AnnouncementPopup from './src/components/AnnouncementPopup';
import EidMubarakThemeProvider from './src/components/EidMubarakThemeProvider';
import ErrorBoundary from './src/components/ErrorBoundary';
import NewYearThemeProvider from './src/components/NewYearThemeProvider';
import PinkOctoberThemeProvider from './src/components/PinkOctoberThemeProvider';
import WebCompatibleIcon from './src/components/WebCompatibleIcon';
import { supabase } from './src/config/supabase.config';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import MainNavigator from './src/navigation/MainNavigator';
import LoginScreen from './src/screens/LoginScreen';
import { notificationService } from './src/services/notificationService';
import { pushNotificationService } from './src/services/pushNotificationService';
import { RootState, store } from './src/store';
import { authReady, loadUserProfile, restoreSession } from './src/store/authSlice';
import './src/utils/logger'; // Disable console logs in production


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

// Configure React Native Paper theme - this will be made dynamic inside ThemeProvider
const basePaperTheme = {
  ...DefaultTheme,
  fonts: configureFonts({ config: {} }),
};

// Custom icon provider for React Native Paper
const webCompatibleIconProvider = (props: any) => {
  return <WebCompatibleIcon {...props} />;
};

// Dynamic Paper Provider that uses theme context
const DynamicPaperProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { paperTheme } = useTheme();
  
  
  return (
    <PaperProvider theme={paperTheme} settings={{ icon: webCompatibleIconProvider }}>
      {children}
    </PaperProvider>
  );
};

function AppContent() {
  const { isLoggedIn, isLoading, user } = useSelector((state: RootState) => state.auth);
  const isReception = user?.role === 'reception';
  

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

        // ANDROID FIX: Validate and fix invalid tokens on login
        // Wait a bit for pushNotificationService to initialize
        setTimeout(async () => {
          try {
            // Check current stored token
            const { data: userData } = await supabase
              .from('users')
              .select('push_token')
              .eq('id', user.id)
              .single();

            const storedToken = userData?.push_token;
            
            // Check if token is invalid (old FCM format or missing)
            const isInvalidToken = !storedToken || !storedToken.startsWith('ExponentPushToken[');
            
            if (isInvalidToken) {
              console.log('🔄 [App] User has invalid token format, forcing re-registration...');
              console.log('   📱 Old token:', storedToken ? storedToken.substring(0, 30) + '...' : 'NULL');
              console.log('   🤖 Platform:', Platform.OS);
              
              // Force token re-registration
              await pushNotificationService.forceTokenReregistration();
              
              console.log('✅ [App] Token re-registration completed');
            } else {
              console.log('✅ [App] Token format is valid:', storedToken.substring(0, 30) + '...');
            }
          } catch (error) {
            console.error('❌ [App] Token validation error (non-critical):', error);
          }
        }, 2000); // Wait 2 seconds for push service to initialize
      } else {

      }

      // Handle push notification registration
      const tokenListener = Notifications.addPushTokenListener(async token => {
        // Store token in Supabase when received
        if (user?.id && token.data) {
          try {
            console.log('📱 [App] Push token received:', token.data.substring(0, 30) + '...');
            
            // Validate token format before saving
            if (token.data.startsWith('ExponentPushToken[')) {
              // Store the token in the users table (original GitHub approach)
              const { error } = await supabase
                .from('users')
                .update({ push_token: token.data })
                .eq('id', user.id);
              
              if (error) {
                console.error('❌ [App] Failed to save push token:', error);
              } else {
                console.log('✅ [App] Push token saved successfully');
              }
            } else {
              console.warn('⚠️ [App] Invalid token format received, skipping save:', token.data.substring(0, 30));
            }
          } catch (error) {
            console.error('❌ [App] Token save error:', error);
          }
        }
      });

      return () => {
        tokenListener.remove();
      };
    }
  }, [isLoggedIn, user?.id]);

  // Add Supabase auth state listener for automatic session management
  useEffect(() => {
    // App auth Setting up Supabase auth state listener...');
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // App auth Auth state change:', event, 'Session exists:', !!session, 'User logged in:', isLoggedIn);
      
      // CRITICAL: Only handle auth changes if user is currently logged in
      // This prevents false logouts during app initialization
      if (!isLoggedIn) {
        // App auth User not logged in - ignoring auth state change');
        return;
      }
      
      // Handle explicit sign out events
      if (event === 'SIGNED_OUT') {
        // App auth Explicit sign out detected - logging user out');
        store.dispatch({ type: 'auth/clearAuth' });
      } 
      // Handle token refresh failures ONLY if it's a critical session invalidation
      // NOT for temporary network issues or normal token expiration
      else if (event === 'TOKEN_REFRESHED' && !session) {
        // App auth Token refresh failed - could be network issue, not forcing logout');
        // App auth User can continue using app, will retry refresh on next API call');
        // DON'T auto-logout here - let user continue using the app
        // Only logout if API calls start failing consistently
      } 
      // Handle successful token refresh
      else if (event === 'TOKEN_REFRESHED' && session) {
        // App auth Token refreshed successfully');
        // Token is automatically updated by Supabase client
      }
      // Handle sign in from another device (optional - could force logout)
      else if (event === 'SIGNED_IN' && session) {
        // App auth User signed in from another session - keeping current session');
        // NOTE: Not forcing logout here to avoid interrupting legitimate usage
        // Only logout if we detect session conflicts
      }
    });

    return () => {
      // App auth Cleaning up auth state listener');
      subscription?.unsubscribe();
    };
  }, [isLoggedIn]); // Include isLoggedIn in dependencies to get current state

  // Show splash screen while checking session
  if (isLoading) {
    return null;
  }
  
  // Reception users don't get theme provider to avoid theme database issues
  if (isReception) {
    return (
      <PaperProvider theme={basePaperTheme} settings={{ icon: webCompatibleIconProvider }}>
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

  // Client users get full theme experience
        return (
          <ThemeProvider>
            <EidMubarakThemeProvider>
              <NewYearThemeProvider>
                <PinkOctoberThemeProvider>
                  <AdvancedNewYearWrapper>
                    <AdvancedPinkOctoberWrapper>
                      <DynamicPaperProvider>
                        <ErrorBoundary>
                          {isLoggedIn ? (
                            <NavigationContainer>
                              <MainNavigator />
                            </NavigationContainer>
                          ) : (
                            <LoginScreen />
                          )}
                          <AnnouncementPopup />
                        </ErrorBoundary>
                      </DynamicPaperProvider>
                    </AdvancedPinkOctoberWrapper>
                  </AdvancedNewYearWrapper>
                </PinkOctoberThemeProvider>
              </NewYearThemeProvider>
            </EidMubarakThemeProvider>
          </ThemeProvider>
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