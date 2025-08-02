import { Platform } from 'react-native';
import { isDev } from './devUtils';

interface CrashReport {
  timestamp: string;
  platform: string;
  platformVersion: string | number;
  error: string;
  stack?: string;
  component?: string;
  userId?: string;
  appVersion?: string;
  isFatal: boolean;
}

class CrashReportingService {
  private crashes: CrashReport[] = [];
  private maxStoredCrashes = 50;

  // Log a crash for later reporting
  logCrash(error: Error | string, isFatal: boolean = false, component?: string) {
    const crashReport: CrashReport = {
      timestamp: new Date().toISOString(),
      platform: Platform.OS,
      platformVersion: Platform.Version,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      component,
      isFatal,
      appVersion: '1.0.1', // Updated to match new crash prevention version
    };

    // Store crash locally
    this.crashes.push(crashReport);

    // Keep only the last N crashes to prevent memory issues
    if (this.crashes.length > this.maxStoredCrashes) {
      this.crashes = this.crashes.slice(-this.maxStoredCrashes);
    }

    // Log to console in development
    if (isDev()) {
      console.error('📊 Crash Report:', crashReport);
    }

    // In production, you would send this to your crash reporting service
    // Example: Sentry.captureException(error);
    // Example: Crashlytics.recordError(error);
    
    this.reportCrashIfPossible(crashReport);
  }

  // Get stored crashes for debugging
  getCrashes(): CrashReport[] {
    return [...this.crashes];
  }

  // Clear stored crashes
  clearCrashes() {
    this.crashes = [];
  }

  // Report crash to external service (placeholder)
  private async reportCrashIfPossible(crashReport: CrashReport) {
    if (isDev()) {
      // In development, just log
      console.log('🐛 Would report crash to service:', {
        error: crashReport.error,
        component: crashReport.component,
        isFatal: crashReport.isFatal,
      });
      return;
    }

    try {
      // TODO: Integrate with actual crash reporting service
      // Examples:
      
      // Sentry integration:
      // Sentry.captureException(new Error(crashReport.error), {
      //   tags: {
      //     component: crashReport.component,
      //     platform: crashReport.platform,
      //   },
      //   extra: crashReport,
      // });

      // Custom API endpoint:
      // await fetch('https://your-api.com/crash-reports', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(crashReport),
      // });

      console.log('📊 Crash reported successfully');
    } catch (reportingError) {
      console.warn('⚠️ Failed to report crash:', reportingError);
    }
  }

  // Get crash statistics
  getCrashStats() {
    const totalCrashes = this.crashes.length;
    const fatalCrashes = this.crashes.filter(c => c.isFatal).length;
    const componentCrashes = this.crashes.reduce((acc, crash) => {
      if (crash.component) {
        acc[crash.component] = (acc[crash.component] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return {
      totalCrashes,
      fatalCrashes,
      nonFatalCrashes: totalCrashes - fatalCrashes,
      componentCrashes,
      lastCrash: this.crashes[this.crashes.length - 1],
    };
  }
}

// Export singleton instance
export const crashReporting = new CrashReportingService();

// Helper function to report crashes from error handlers
export const reportCrash = (
  error: Error | string, 
  isFatal: boolean = false, 
  component?: string
) => {
  crashReporting.logCrash(error, isFatal, component);
};

export default crashReporting; 