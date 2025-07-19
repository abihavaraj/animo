import { Alert } from 'react-native';
import { devError, isDev } from './devUtils';

// Global error handler for unhandled promise rejections
export const setupGlobalErrorHandlers = () => {
  // Handle unhandled promise rejections
  if (typeof global !== 'undefined') {
    // Safely access React Native's ErrorUtils
    const globalWithErrorUtils = global as any;
    if (globalWithErrorUtils.ErrorUtils?.setGlobalHandler) {
      globalWithErrorUtils.ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
        console.error('🚨 Global Error Handler caught:', error);
        
        // Log full error details for debugging
        devError('Global Error Details:', {
          message: error.message,
          stack: error.stack,
          isFatal,
          name: error.name,
        });

        if (isFatal) {
          // For fatal errors, show user-friendly message
          Alert.alert(
            'Unexpected Error',
            'The app encountered an unexpected error. Please restart the app.',
            [
              {
                text: 'OK',
                onPress: () => {
                  // In production, you might want to restart the app
                  // or navigate to a safe screen
                }
              }
            ]
          );
        }
        
        // In development, show detailed error
        if (isDev()) {
          Alert.alert(
            'Development Error',
            `${error.name}: ${error.message}`,
            [{ text: 'OK' }]
          );
        }
      });
    }
  }

  // Handle unhandled promise rejections
  const handleUnhandledRejection = (event: any) => {
    console.error('🚨 Unhandled Promise Rejection:', event.reason);
    
    devError('Promise Rejection Details:', {
      reason: event.reason,
      promise: event.promise,
    });

    // Prevent the default behavior (which would cause a crash)
    event.preventDefault?.();
    
    if (isDev()) {
      Alert.alert(
        'Unhandled Promise Rejection',
        `${event.reason}`,
        [{ text: 'OK' }]
      );
    }
  };

  // For React Native
  if (typeof global !== 'undefined' && global.process?.versions?.node) {
    process.on('unhandledRejection', handleUnhandledRejection);
  }

  // For web environments
  if (typeof window !== 'undefined') {
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    // Also handle regular errors
    window.addEventListener('error', (event) => {
      console.error('🚨 Global Window Error:', event.error);
      devError('Window Error Details:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
      });
    });
  }
};

// Safe async wrapper that catches and logs errors
export const safeAsync = <T extends any[], R>(
  fn: (...args: T) => Promise<R>
) => {
  return async (...args: T): Promise<R | undefined> => {
    try {
      return await fn(...args);
    } catch (error) {
      console.error('🚨 SafeAsync caught error:', error);
      devError('SafeAsync Error:', error);
      return undefined;
    }
  };
};

// Safe function wrapper that catches synchronous errors
export const safe = <T extends any[], R>(
  fn: (...args: T) => R
) => {
  return (...args: T): R | undefined => {
    try {
      return fn(...args);
    } catch (error) {
      console.error('🚨 Safe function caught error:', error);
      devError('Safe Function Error:', error);
      return undefined;
    }
  };
};

// Enhanced error boundary handler
export const handleErrorBoundaryError = (error: Error, errorInfo: any) => {
  console.error('🚨 ErrorBoundary caught error:', error);
  console.error('🚨 ErrorBoundary error info:', errorInfo);
  
  devError('ErrorBoundary Error Details:', {
    message: error.message,
    stack: error.stack,
    componentStack: errorInfo.componentStack,
    errorBoundary: errorInfo.errorBoundary,
  });

  // You could send this to crash analytics service here
  // Example: Crashlytics.recordError(error);
};

// Network error handler
export const handleNetworkError = (error: any, endpoint?: string) => {
  console.error('🌐 Network Error:', error);
  
  devError('Network Error Details:', {
    message: error.message,
    endpoint,
    stack: error.stack,
  });

  // Show user-friendly network error
  if (!isDev()) {
    Alert.alert(
      'Connection Error',
      'Please check your internet connection and try again.',
      [{ text: 'OK' }]
    );
  }
};

// Redux error handler
export const handleReduxError = (error: any, action?: any) => {
  console.error('🏪 Redux Error:', error);
  
  devError('Redux Error Details:', {
    message: error.message,
    action: action?.type,
    payload: action?.payload,
    stack: error.stack,
  });
}; 