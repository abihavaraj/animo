import { NavigationContainer } from '@react-navigation/native';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { Provider as PaperProvider } from 'react-native-paper';
import { Provider, useSelector } from 'react-redux';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import AuthNavigator from './src/navigation/AuthNavigator';
import MainNavigator from './src/navigation/MainNavigator';
import { RootState, store } from './src/store';
import { setupGlobalErrorHandlers } from './src/utils/errorHandler';

console.log('🔥 App.tsx: File loaded!');

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Inner App component that has access to Redux state
function AppContent() {
  const { user, isLoggedIn } = useSelector((state: RootState) => state.auth);
  const [appIsReady, setAppIsReady] = useState(false);
  
  console.log('🎯 App.tsx: AppContent rendering, authenticated:', isLoggedIn, 'user:', user?.role);

  useEffect(() => {
    async function prepare() {
      try {
        // Pre-load fonts for web compatibility
        await Font.loadAsync({
          // Expo vector icons are automatically loaded on native but need explicit loading on web
          'MaterialIcons': require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialIcons.ttf'),
          'MaterialCommunityIcons': require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf'),
        });
        
        console.log('✅ Fonts loaded successfully for web');
      } catch (e) {
        console.warn('⚠️ Font loading error (non-critical):', e);
        // Don't fail the app if fonts can't load
      } finally {
        // Tell the application to render
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  useEffect(() => {
    if (appIsReady) {
      // Hide the splash screen once everything is ready
      SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    // Keep splash screen visible while loading
    return null;
  }
  
  return (
    <PaperProvider>
      <NavigationContainer>
        <ErrorBoundary>
          {isLoggedIn ? (
            <MainNavigator />
          ) : (
            <AuthNavigator />
          )}
        </ErrorBoundary>
      </NavigationContainer>
    </PaperProvider>
  );
}

// Main App component with Redux Provider
export default function App() {
  console.log('🚀 App.tsx: Main App component rendering...');
  
  // Setup global error handlers to prevent crashes
  useEffect(() => {
    console.log('🛡️ Setting up global error handlers...');
    setupGlobalErrorHandlers();
    console.log('✅ Global error handlers initialized');
  }, []);
  
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}

console.log('✅ App.tsx: Exporting App component'); 