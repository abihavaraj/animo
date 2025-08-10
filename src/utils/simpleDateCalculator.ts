/**
 * SIMPLE Date Calculator for Subscription Plans (Frontend)
 * No stupid decimals - just duration + unit!
 */
export class SimpleDateCalculator {
  
  /**
   * Calculate subscription end date - SIMPLE!
   * @param startDate - Start date (defaults to today)
   * @param duration - Simple integer duration (1, 7, 12, etc)
   * @param unit - 'days', 'months', or 'years'
   * @returns End date in YYYY-MM-DD format
   */
  static calculateEndDate(startDate: Date | string | null = null, duration: number = 1, unit: string = 'months'): string {
    try {
      // Get start date
      const start = startDate ? new Date(startDate) : new Date();
      
      // Create end date
      const endDate = new Date(start);
      
      // Simple switch - no confusing math!
      switch(unit) {
        case 'days':
          // For days: add (duration - 1) so 1-day subscription = same day
          endDate.setDate(start.getDate() + duration - 1);
          break;
        case 'months':
          // For months: use proper calendar months with smart date handling
          const targetMonth = start.getMonth() + duration;
          const monthTargetYear = start.getFullYear() + Math.floor(targetMonth / 12);
          const finalMonth = targetMonth % 12;
          
          endDate.setFullYear(monthTargetYear);
          endDate.setMonth(finalMonth);
          
          // Handle month-end edge cases (e.g., Jan 31 + 1 month should be Feb 28, not Mar 3)
          if (endDate.getMonth() !== finalMonth) {
            // This happens when target month has fewer days (e.g., Feb 29/30/31 doesn't exist)
            // Set to last day of target month
            endDate.setDate(0); // Go to last day of previous month (which is our target month)
          }
          break;
        case 'years':
          // For years: use proper calendar years with leap year handling
          const yearTarget = start.getFullYear() + duration;
          
          // Handle Feb 29 leap year edge case BEFORE setting the year
          if (start.getMonth() === 1 && start.getDate() === 29) {
            // Check if target year is a leap year
            const isTargetLeapYear = (yearTarget % 4 === 0 && yearTarget % 100 !== 0) || (yearTarget % 400 === 0);
            if (!isTargetLeapYear) {
              // Target year is not a leap year, so Feb 29 becomes Feb 28
              endDate.setDate(28);
            }
          }
          
          endDate.setFullYear(yearTarget);
          break;
        default:
          throw new Error(`Invalid duration unit: ${unit}. Use 'days', 'months', or 'years'`);
      }
      
      // Return as YYYY-MM-DD string
      return this.toStorageFormat(endDate);
      
    } catch (error) {
      console.error('❌ SimpleDateCalculator.calculateEndDate error:', error);
      throw new Error(`Invalid date calculation: ${error.message}`);
    }
  }
  
  /**
   * Check if a subscription is expired
   * @param endDate - End date in YYYY-MM-DD format
   * @returns True if expired
   */
  static isExpired(endDate: string): boolean {
    try {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // End of day
      const now = new Date();
      return now > end;
    } catch (error) {
      console.error('❌ SimpleDateCalculator.isExpired error:', error);
      return false; // Fail safe
    }
  }
  
  /**
   * Get days until expiration
   * @param endDate - End date in YYYY-MM-DD format
   * @returns Days until expiration (negative if expired)
   */
  static daysUntilExpiration(endDate: string): number {
    try {
      const end = new Date(endDate);
      const now = new Date();
      
      // Set both to start of day for accurate day counting
      end.setHours(0, 0, 0, 0);
      now.setHours(0, 0, 0, 0);
      
      const diffTime = end.getTime() - now.getTime();
      const daysDiff = Math.round(diffTime / (1000 * 60 * 60 * 24));
      
      // Return actual days difference (0 = expires today, 1 = expires tomorrow)
      return daysDiff;
    } catch (error) {
      console.error('❌ SimpleDateCalculator.daysUntilExpiration error:', error);
      return 0;
    }
  }
  
  /**
   * Convert date to storage format
   * @param date - Input date
   * @returns Date in YYYY-MM-DD format
   */
  static toStorageFormat(date: Date | string): string {
    try {
      const d = new Date(date);
      return d.getFullYear() + '-' + 
             String(d.getMonth() + 1).padStart(2, '0') + '-' + 
             String(d.getDate()).padStart(2, '0');
    } catch (error) {
      console.error('❌ SimpleDateCalculator.toStorageFormat error:', error);
      throw new Error(`Invalid date format: ${error.message}`);
    }
  }
  
  /**
   * Get human readable duration
   * @param duration - Duration number
   * @param unit - Duration unit
   * @returns Human readable string
   */
  static getReadableDuration(duration: number, unit: string): string {
    if (duration === 1) {
      return `1 ${unit.slice(0, -1)}`; // Remove 's' for singular
    }
    return `${duration} ${unit}`;
  }
}