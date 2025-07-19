import { NavigationContainer } from '@react-navigation/native';
import { useEffect } from 'react';
import { Provider as PaperProvider } from 'react-native-paper';
import { Provider, useSelector } from 'react-redux';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import AuthNavigator from './src/navigation/AuthNavigator';
import MainNavigator from './src/navigation/MainNavigator';
import { RootState, store } from './src/store';
import { setupGlobalErrorHandlers } from './src/utils/errorHandler';

console.log('🔥 App.tsx: File loaded!');

// Inner App component that has access to Redux state
function AppContent() {
  const { user, isLoggedIn } = useSelector((state: RootState) => state.auth);
  
  console.log('🎯 App.tsx: AppContent rendering, authenticated:', isLoggedIn, 'user:', user?.role);
  
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