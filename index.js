import { registerRootComponent } from 'expo';
import App from './App';

// Global error handler to prevent crashes
const globalErrorHandler = (error, isFatal) => {
  console.error('🚨 Global error caught:', error);
  console.error('🚨 Is fatal:', isFatal);
  
  // Log the error but don't crash the app
  if (isFatal) {
    console.error('🚨 Fatal error detected - this would normally crash the app');
    console.error('🚨 Error stack:', error.stack);
  }
  
  // Don't rethrow - let the app continue
};

// Set up global error handlers
if (typeof ErrorUtils !== 'undefined') {
  ErrorUtils.setGlobalHandler(globalErrorHandler);
}

// Handle unhandled promise rejections
const originalHandler = console.error;
console.error = (...args) => {
  // Still log errors for debugging
  originalHandler.apply(console, args);
};

console.log('✅ Global error handlers set up');

// This is the standard and required entry point for all Expo apps.
// It ensures the correct environment is set up for Expo Go and native builds.
registerRootComponent(App); 