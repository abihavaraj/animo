import { devLog } from '../utils/devUtils';
import { dataCleanupService } from './dataCleanupService';

class AutoCleanupService {
  private cleanupInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  /**
   * Start the automatic cleanup service
   * Runs cleanup every 24 hours
   */
  start() {
    if (this.isRunning) {
      devLog('⚠️ Auto cleanup service is already running');
      return;
    }

    devLog('🚀 Starting automatic cleanup service...');
    this.isRunning = true;

    // Run cleanup immediately on start
    this.runCleanup();

    // Schedule cleanup to run every 24 hours (86400000 ms)
    this.cleanupInterval = setInterval(() => {
      this.runCleanup();
    }, 24 * 60 * 60 * 1000);

    devLog('✅ Automatic cleanup service started - will run every 24 hours');
  }

  /**
   * Stop the automatic cleanup service
   */
  stop() {
    if (!this.isRunning) {
      devLog('⚠️ Auto cleanup service is not running');
      return;
    }

    devLog('🛑 Stopping automatic cleanup service...');
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.isRunning = false;
    devLog('✅ Automatic cleanup service stopped');
  }

  /**
   * Check if the service is running
   */
  isServiceRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Run the cleanup operations
   */
  private async runCleanup() {
    try {
      devLog('🧹 Running automatic data cleanup...');
      const startTime = Date.now();

      // Run automatic cleanup (30 days for classes, 10 days for notifications)
      const results = await dataCleanupService.runAutomaticCleanup();

      const duration = Date.now() - startTime;
      devLog(`✅ Automatic cleanup completed in ${duration}ms`);
      devLog(`📊 Cleanup results: ${results.totalDeleted} total records deleted`);
      devLog(`   • Classes: ${results.classes.deletedCount} deleted`);
      devLog(`   • Notifications: ${results.notifications.deletedCount} deleted`);

      // Store cleanup results for admin dashboard
      this.storeCleanupResults(results);

    } catch (error) {
      devLog('❌ Error during automatic cleanup:', error);
      console.error('Automatic cleanup failed:', error);
    }
  }

  /**
   * Store cleanup results for later retrieval
   */
  private storeCleanupResults(results: any) {
    try {
      const cleanupHistory = {
        timestamp: new Date().toISOString(),
        results,
        type: 'automatic'
      };

      // Store in localStorage for web or AsyncStorage equivalent
      if (typeof window !== 'undefined' && window.localStorage) {
        const existingHistory = localStorage.getItem('cleanup_history');
        const history = existingHistory ? JSON.parse(existingHistory) : [];
        
        // Keep only last 30 cleanup records
        history.push(cleanupHistory);
        if (history.length > 30) {
          history.splice(0, history.length - 30);
        }
        
        localStorage.setItem('cleanup_history', JSON.stringify(history));
        devLog('📝 Cleanup results stored to history');
      }
    } catch (error) {
      devLog('⚠️ Failed to store cleanup results:', error);
    }
  }

  /**
   * Get cleanup history
   */
  getCleanupHistory(): any[] {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const history = localStorage.getItem('cleanup_history');
        return history ? JSON.parse(history) : [];
      }
      return [];
    } catch (error) {
      devLog('⚠️ Failed to retrieve cleanup history:', error);
      return [];
    }
  }

  /**
   * Run manual cleanup (for testing or immediate needs)
   */
  async runManualCleanup(): Promise<any> {
    devLog('🔧 Running manual cleanup...');
    try {
      const results = await dataCleanupService.runAutomaticCleanup();
      this.storeCleanupResults(results);
      return results;
    } catch (error) {
      devLog('❌ Manual cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Get cleanup schedule info
   */
  getScheduleInfo(): {
    isRunning: boolean;
    nextRunTime: string | null;
    lastRunTime: string | null;
  } {
    const history = this.getCleanupHistory();
    const lastRun = history.length > 0 ? history[history.length - 1] : null;
    
    let nextRunTime = null;
    if (this.isRunning && lastRun) {
      const lastRunDate = new Date(lastRun.timestamp);
      const nextRun = new Date(lastRunDate.getTime() + (24 * 60 * 60 * 1000));
      nextRunTime = nextRun.toISOString();
    }

    return {
      isRunning: this.isRunning,
      nextRunTime,
      lastRunTime: lastRun ? lastRun.timestamp : null
    };
  }
}

// Create singleton instance
export const autoCleanupService = new AutoCleanupService();

// Auto-start the service in production
if (process.env.NODE_ENV === 'production') {
  autoCleanupService.start();
}