import { Alert, Platform } from 'react-native';
import { reportCrash } from './crashReporting';
import { devError, isDev } from './devUtils';

// Check if running on iOS beta version
export const checkiOSVersion = () => {
  if (Platform.OS === 'ios') {
    try {
      const version = Platform.Version;
      const versionStr = version.toString();
      
      // Check for beta indicators (versions >= 25 are likely beta)
      if (typeof version === 'number' && version >= 25) {
        console.warn('⚠️ Running on iOS Beta - some features may be unstable');
        
        if (isDev()) {
          Alert.alert(
            'iOS Beta Detected',
            `Running on iOS ${version}. Beta versions may cause crashes. Please test on stable iOS for production.`,
            [{ text: 'OK' }]
          );
        }
        return true;
      }
      
      // Check for beta string indicators
      if (versionStr.includes('beta') || versionStr.includes('Beta')) {
        console.warn('⚠️ Running on iOS Beta - some features may be unstable');
        return true;
      }
    } catch (error) {
      console.warn('Could not detect iOS version:', error);
    }
  }
  return false;
};

// Enhanced native exception handler
export const setupNativeExceptionHandling = () => {
  // Override React Native's default exception handler
  if (typeof global !== 'undefined') {
    const globalWithErrorUtils = global as any;
    
    // Store original handler
    const originalHandler = globalWithErrorUtils.ErrorUtils?.getGlobalHandler?.() || null;
    
    if (globalWithErrorUtils.ErrorUtils?.setGlobalHandler) {
      globalWithErrorUtils.ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
        console.error('🚨 Enhanced Native Exception Handler:', error);
        
        // Report crash to crash reporting service
        reportCrash(error, isFatal || false, 'NativeException');
        
        // Log detailed error information
        devError('Native Exception Details:', {
          message: error.message,
          stack: error.stack,
          isFatal,
          name: error.name,
          timestamp: new Date().toISOString(),
          platform: Platform.OS,
          version: Platform.Version,
        });

        // Try to handle gracefully instead of crashing
        try {
          if (isFatal) {
            // For fatal errors, show user-friendly message but try to prevent crash
            console.error('🚨 FATAL ERROR - Attempting graceful handling');
            
            Alert.alert(
              'App Error',
              'The app encountered a serious error. Some features may not work properly.',
              [
                {
                  text: 'Continue',
                  onPress: () => {
                    // Try to recover
                    console.log('🔄 Attempting to continue after fatal error');
                  }
                },
                {
                  text: 'Restart',
                  onPress: () => {
                    // In production, you might want to restart the app
                    if (isDev()) {
                      console.log('🔄 Restart requested - in dev mode');
                    }
                  }
                }
              ]
            );
          }
          
          // Call original handler if it exists (but wrapped in try-catch)
          if (originalHandler) {
            try {
              originalHandler(error, false); // Force non-fatal to prevent crash
            } catch (handlerError) {
              console.error('🚨 Original error handler failed:', handlerError);
              reportCrash(handlerError instanceof Error ? handlerError : new Error(String(handlerError)), false, 'ErrorHandler');
            }
          }
          
        } catch (recoveryError) {
          console.error('🚨 Error recovery failed:', recoveryError);
          reportCrash(recoveryError instanceof Error ? recoveryError : new Error(String(recoveryError)), false, 'ErrorRecovery');
          // If all else fails, log and continue
        }
      });
    }
  }
};

// Global error handler for unhandled promise rejections
export const setupGlobalErrorHandlers = () => {
  // Check iOS version first
  const isBeta = checkiOSVersion();
  if (isBeta) {
    console.warn('⚠️ iOS Beta detected - enabling enhanced error handling');
  }
  
  // Setup enhanced native exception handling
  setupNativeExceptionHandling();

  // Handle unhandled promise rejections
  if (typeof global !== 'undefined') {
    // Safely access React Native's ErrorUtils
    const globalWithErrorUtils = global as any;
    if (globalWithErrorUtils.ErrorUtils?.setGlobalHandler) {
      globalWithErrorUtils.ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
        console.error('🚨 Global Error Handler caught:', error);
        
        // Report to crash reporting service
        reportCrash(error, isFatal || false, 'GlobalError');
        
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

  // Handle unhandled promise rejections with enhanced logging
  const handleUnhandledRejection = (event: any) => {
    console.error('🚨 Unhandled Promise Rejection:', event.reason);
    
    // Report promise rejection
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
    reportCrash(error, false, 'PromiseRejection');
    
    devError('Promise Rejection Details:', {
      reason: event.reason,
      promise: event.promise,
      timestamp: new Date().toISOString(),
      platform: Platform.OS,
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
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
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

// Safe navigation wrapper to prevent navigation crashes
export const safeNavigate = (navigation: any, routeName: string, params?: any) => {
  try {
    if (navigation && typeof navigation.navigate === 'function') {
      navigation.navigate(routeName, params);
    } else {
      console.error('🚨 Navigation object is invalid:', navigation);
      devError('Navigation Error:', {
        routeName,
        params,
        navigationObj: navigation,
        hasNavigate: navigation && typeof navigation.navigate === 'function',
      });
    }
      } catch (error) {
      console.error('🚨 Navigation failed for route:', routeName, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      devError('Navigation Crash Prevention:', {
        routeName,
        params,
        error: errorMessage,
        stack: errorStack,
      });
    
    // Show user-friendly message
    if (!isDev()) {
      Alert.alert(
        'Navigation Error',
        'Unable to navigate to the requested screen. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }
};

// Safe navigation reset wrapper
export const safeNavigationReset = (navigation: any, state: any) => {
  try {
    if (navigation && typeof navigation.reset === 'function') {
      navigation.reset(state);
    } else {
      console.error('🚨 Navigation reset failed - invalid navigation object');
    }
  } catch (error) {
    console.error('🚨 Navigation reset crashed:', error);
    devError('Navigation Reset Error:', error);
  }
};

// Simple crash protection wrapper for components (without JSX)
export const createCrashProtectedComponent = (componentName: string) => {
  return {
    wrapFunction: (fn: Function) => {
      return (...args: any[]) => {
        try {
          return fn(...args);
        } catch (error) {
          console.error(`🚨 Component crashed: ${componentName}`, error);
          const errorMessage = error instanceof Error ? error.message : String(error);
          devError('Component Crash:', {
            component: componentName,
            error: errorMessage,
            args: args.length,
          });
          
          if (!isDev()) {
            Alert.alert(
              'Component Error',
              'A component encountered an error. Some features may not work properly.',
              [{ text: 'OK' }]
            );
          }
          
          return null;
        }
      };
    }
  };
}; 